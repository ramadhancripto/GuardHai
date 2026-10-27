/**
 * GuardHai · services/engagement.service.js
 * Likes/saves/follows, comments and reports. Each toggle writes through to the
 * repository, so state survives a reload — and counts are always derived from
 * stored rows, never invented.
 */
import { toggle, visibleCount } from '../domain/engagement.js';
import { validateComment, buildComment } from '../domain/comment.js';
import { createEngagementRepository } from '../data/engagement.repo.js';
import { currentUser } from './session.service.js';
import { bus, EVENTS } from '../core/bus.js';
import { uid, nowIso } from '../core/id.js';

let repoPromise = null;
const repo = () => (repoPromise ||= createEngagementRepository());

export async function flagsFor(postId, user = currentUser()) {
  return (await repo()).getFlags(postId, user.id);
}

export async function toggleFlag(postId, flag, user = currentUser()) {
  const r = await repo();
  const current = await r.getFlags(postId, user.id);
  const next = toggle(current, flag);
  await r.saveFlags(next);
  bus.emit(EVENTS.ENGAGEMENT_CHANGED, { postId, flag, value: next[flag] });
  return next;
}

export async function commentCount(postId) {
  return visibleCount(await (await repo()).commentCount(postId));
}

export async function listComments(postId) {
  return (await repo()).comments(postId);
}

export async function addComment(postId, text, user = currentUser(), { parentId = null } = {}) {
  const check = validateComment(text);
  if (!check.ok) return { ok: false, message: check.message };
  const comment = buildComment({
    postId,
    author: { id: user.id, name: user.name },
    text: check.value,
    id: uid('c'),
    now: nowIso(),
    parentId
  });
  await (await repo()).addComment(comment);
  bus.emit(EVENTS.COMMENT_ADDED, comment);
  return { ok: true, comment };
}

export async function fileReport({ postId, commentId = null, reason, note = '', user = currentUser() }) {
  const report = {
    id: uid('rep'),
    postId,
    commentId,
    reason,
    note: String(note).trim().slice(0, 300),
    reportedBy: user.id,
    createdAt: nowIso(),
    status: 'local-only'      // no moderation backend exists yet
  };
  await (await repo()).addReport(report);
  bus.emit(EVENTS.REPORT_FILED, report);
  return report;
}

export async function listReports() {
  return (await repo()).reports();
}
