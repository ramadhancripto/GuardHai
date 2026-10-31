/**
 * GuardHai · services/safety.service.js
 * Block, report, moderate, appeal — the shared safety layer for chat, communities
 * and support.
 *
 * Reports go into the SAME `reports` store the Uwanja feed already uses (with a
 * `subjectType` so the new subjects are distinguishable). That keeps one queue
 * instead of two parallel ones.
 *
 * Moderation is role-gated: a community moderator can decide on reports filed
 * inside their community. Reports about things outside any community have no
 * platform administrator connected, so they stay `pending` and say so.
 */
import { createRepo, sortBy } from '../data/network.repo.js';
import { uid, nowIso } from '../core/id.js';
import { bus, EVENTS } from '../core/bus.js';
import { currentUser } from './session.service.js';
import {
  REPORT_REASONS, REPORT_SUBJECTS, MODERATION_ACTIONS, APPEAL_STATUS,
  validateReport, validateAppeal, rateLimit
} from '../domain/network.js';
import { audit, notify } from './alerts.service.js';
import { canDo, listCommunities } from './community.service.js';
import { blockUser, unblockUser, listBlocked } from './chat.service.js';

const reportRepo = createRepo('reports');
const appealRepo = createRepo('appeals');
const selfId = () => currentUser().id;

/* ------------------------------------------------------------------ report */
export async function fileReport({ subjectType, subjectId, reason, detail = '', communityId = null }) {
  const me = selfId();
  if (!REPORT_SUBJECTS[subjectType]) return { ok: false, message: 'Aina ya ripoti haijulikani.' };
  if (!subjectId) return { ok: false, message: 'Hakuna kitu cha kuripotiwa.' };

  const check = validateReport({ reason, detail });
  if (!check.ok) return { ok: false, message: check.message, field: check.field };

  const limit = rateLimit('report', me);
  if (!limit.ok) return { ok: false, message: limit.message };

  const now = nowIso();
  const row = {
    id: uid('rep'),
    postId: subjectType === 'post' ? subjectId : null,
    subjectType,
    subjectId,
    reason: check.value.reason,
    detail: check.value.detail,
    communityId,
    reporterId: me,
    status: 'pending',
    decision: null,
    decidedBy: null,
    decidedAt: null,
    createdAt: now,
    sample: false
  };
  await reportRepo.put(row);
  await audit({ actorId: me, action: 'report.filed', subjectType, subjectId, communityId, detail: row.reason });
  bus.emit(EVENTS.REPORT_FILED, row);

  const needsModerator = !!communityId;
  return {
    ok: true,
    report: row,
    message: needsModerator
      ? 'Ripoti imehifadhiwa. Msimamizi wa jamii anaweza kuiona.'
      : 'Ripoti imehifadhiwa kwenye kifaa. Hakuna msimamizi wa jukwaa aliyeunganishwa.'
  };
}

export async function listReports({ mine = false, communityId = null } = {}) {
  const me = selfId();
  const rows = (await reportRepo.all()).sort(sortBy('createdAt'));
  return rows
    .filter((r) => (mine ? r.reporterId === me : true))
    .filter((r) => (communityId ? r.communityId === communityId : true));
}

export async function pendingReportsFor(communityId) {
  return (await listReports({ communityId })).filter((r) => r.status === 'pending');
}

/**
 * A decision needs authority over the place the report came from. No community
 * means no moderator exists here — that is reported, not faked.
 */
export async function resolveReport(id, action, note = '') {
  const me = selfId();
  const row = await reportRepo.get(id);
  if (!row) return { ok: false, message: 'Ripoti haipo.' };
  if (!MODERATION_ACTIONS[action]) return { ok: false, message: 'Hatua haijulikani.' };
  if (row.status !== 'pending') return { ok: false, message: 'Ripoti hii tayari imeamuliwa.' };

  if (row.communityId) {
    const allowed = await canDo(row.communityId, 'moderate_posts');
    if (!allowed) return { ok: false, code: 'forbidden', message: 'Huna jukumu la kusimamia jamii hii.' };
  } else if (action !== 'dismissed') {
    return {
      ok: false,
      code: 'no-moderator',
      message: 'Hakuna msimamizi wa jukwaa aliyeunganishwa. Ripoti hii inaweza kukataliwa tu hapa.'
    };
  }

  const now = nowIso();
  const next = { ...row, status: 'decided', decision: action, decidedBy: me, decidedAt: now, note: String(note).slice(0, 300) };
  await reportRepo.put(next);
  await audit({ actorId: me, action: `moderation.${action}`, subjectType: row.subjectType,
    subjectId: row.subjectId, communityId: row.communityId, detail: note });
  bus.emit(EVENTS.SAFETY_CHANGED, next);
  return { ok: true, report: next };
}

/* ----------------------------------------------------------------- appeals */
export async function fileAppeal({ subjectType, subjectId, reason }) {
  const me = selfId();
  const check = validateAppeal({ reason });
  if (!check.ok) return { ok: false, message: check.message, field: check.field };
  const now = nowIso();
  const row = {
    id: uid('apl'),
    subjectType,
    subjectId,
    reason: check.value.reason,
    filedBy: me,
    status: 'open',
    decision: null,
    decidedBy: null,
    createdAt: now,
    decidedAt: null
  };
  await appealRepo.put(row);
  await audit({ actorId: me, action: 'appeal.filed', subjectType, subjectId });
  bus.emit(EVENTS.SAFETY_CHANGED, row);
  return { ok: true, appeal: row };
}

export async function listAppeals() {
  return (await appealRepo.all()).sort(sortBy('createdAt'));
}

export async function resolveAppeal(id, decision, communityId = null) {
  const me = selfId();
  const row = await appealRepo.get(id);
  if (!row) return { ok: false, message: 'Rufaa haipo.' };
  if (row.status !== 'open') return { ok: false, message: 'Rufaa hii tayari imeamuliwa.' };
  if (communityId && !(await canDo(communityId, 'handle_appeals'))) {
    return { ok: false, code: 'forbidden', message: 'Huna jukumu la kushughulikia rufaa.' };
  }
  if (!communityId) {
    return { ok: false, code: 'no-moderator', message: 'Hakuna msimamizi wa jukwaa aliyeunganishwa.' };
  }
  const status = decision === 'upheld' ? 'upheld' : 'rejected';
  const next = { ...row, status, decidedBy: me, decidedAt: nowIso() };
  await appealRepo.put(next);
  await audit({ actorId: me, action: `appeal.${status}`, subjectType: row.subjectType, subjectId: row.subjectId, communityId });
  bus.emit(EVENTS.SAFETY_CHANGED, next);
  return { ok: true, appeal: next };
}

/* ---------------------------------------------------------------- helpers */
export async function moderationQueue() {
  const moderated = [];
  for (const c of await listCommunities()) {
    if (await canDo(c.id, 'moderate_posts')) moderated.push(c);
  }
  const queue = [];
  for (const c of moderated) {
    queue.push(...(await pendingReportsFor(c.id)).map((r) => ({ ...r, communityName: c.name })));
  }
  return queue;
}

export async function safetySummary() {
  const me = selfId();
  const reports = await reportRepo.all();
  const appeals = await appealRepo.all();
  return {
    blocked: (await listBlocked()).length,
    myReports: reports.filter((r) => r.reporterId === me).length,
    pending: reports.filter((r) => r.status === 'pending').length,
    decided: reports.filter((r) => r.status === 'decided').length,
    appeals: appeals.filter((a) => a.status === 'open').length,
    myAppeals: appeals.filter((a) => a.filedBy === me).length
  };
}

export const reasons = REPORT_REASONS;
export const subjects = REPORT_SUBJECTS;
export const actions = MODERATION_ACTIONS;
export const appealStatusOf = (id) => APPEAL_STATUS[id] || APPEAL_STATUS.open;

/** re-exported so screens import blocks from one place */
export { blockUser, unblockUser, listBlocked };

export async function resetSafety() {
  for (const row of await reportRepo.all()) await reportRepo.remove(row.id);
  for (const row of await appealRepo.all()) await appealRepo.remove(row.id);
  bus.emit(EVENTS.SAFETY_CHANGED, { reset: true });
}
