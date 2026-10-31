/**
 * GuardHai · features/health/health-network-store.js
 * The clinical-network data: case rooms, meetings, communities, referrals and
 * the professional profile. Invitations, deliveries and verification badges are
 * stored as *states*, and every one of them stays local and unverified.
 */

import { CASE_STATUS, DOCTORS } from './health-catalog.js';
import { activeProfile, audit, commit, getState, now, todayKey, uid } from './health-state.js';

export function cases() { return [...getState().cases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function caseRoom(id) { return getState().cases.find((c) => c.id === id) || null; }

export function createCase({ title, specialty, summary, urgency = 'routine' }) {
  const errors = {};
  const t = String(title || '').trim();
  if (!t) errors.title = 'required';
  if (t.length > 120) errors.title = 'too-long';
  const sum = String(summary || '').trim();
  if (sum.length < 20) errors.summary = 'too-short';
  if (Object.keys(errors).length) return { ok: false, errors };
  const c = {
    id: uid('cs'), title: t, specialty: Number(specialty) || 0, summary: sum, urgency,
    status: 'open', synthetic: false, createdAt: now(), author: activeProfile().label || 'Wewe',
    replies: [], summaryNote: '', references: []
  };
  commit((s) => { s.cases.unshift(c); });
  return { ok: true, case: c };
}

export function replyToCase(id, body, stance = 'peer-opinion') {
  const text = String(body || '').trim();
  if (text.length < 3) return { ok: false, errors: { body: 'too-short' } };
  commit((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (!c) return;
    c.replies.push({ id: uid('rp'), at: now(), body: text, stance, author: activeProfile().label || 'Wewe', synthetic: false });
    if (c.status === 'open') c.status = 'discussion';
  });
  return { ok: true };
}

export function setCaseStatus(id, status, note = '') {
  if (!CASE_STATUS[status]) return { ok: false };
  commit((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (!c) return;
    c.status = status;
    c.statusHistory = (c.statusHistory || []).concat({ at: now(), status, note: String(note).trim() });
  });
  return { ok: true };
}

export function saveCaseSummary(id, text) {
  commit((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (c) { c.summaryNote = String(text).trim(); c.summaryAt = now(); }
  });
}

/* ========================================================== meetings (B) */

export function meetings() { return [...getState().meetings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)); }
export function meeting(id) { return getState().meetings.find((m) => m.id === id) || null; }

export function scheduleMeeting({ title, date, time, host, agenda = '', duration = 45 }) {
  const errors = {};
  const t = String(title || '').trim();
  if (!t) errors.title = 'required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) errors.date = 'invalid-date';
  else if (date < todayKey()) errors.date = 'past-date';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''))) errors.time = 'invalid-time';
  if (Object.keys(errors).length) return { ok: false, errors };
  const m = {
    id: uid('mt'), title: t, date, time, duration: Number(duration) || 45,
    host: String(host || '').trim(), agenda: String(agenda).trim(),
    synthetic: false, createdAt: now(), invited: [], responded: [], notes: '', outcomes: '',
    followUps: [], invitationsSent: false, recording: false
  };
  commit((s) => { s.meetings.push(m); });
  return { ok: true, meeting: m };
}

export function updateMeeting(id, patch) {
  commit((s) => {
    const m = s.meetings.find((x) => x.id === id);
    if (m) Object.assign(m, patch);
  });
  return { ok: true };
}

/* ======================================================= communities (C) */

export function memberships() { return getState().memberships; }
export function isMember(id) { return getState().memberships.includes(id); }

export function toggleMembership(id) {
  commit((s) => {
    s.memberships = s.memberships.includes(id) ? s.memberships.filter((x) => x !== id) : s.memberships.concat(id);
  });
  return isMember(id);
}

export function communityPosts(id) {
  return getState().communityPosts.filter((p) => p.communityId === id);
}

export function addCommunityPost(communityId, body) {
  const text = String(body || '').trim();
  if (text.length < 3) return { ok: false, errors: { body: 'too-short' } };
  const p = { id: uid('cp'), communityId, body: text, at: now(), author: activeProfile().label || 'Wewe', synthetic: false, reports: 0 };
  commit((s) => { s.communityPosts.unshift(p); });
  return { ok: true, post: p };
}

export function reportCommunityPost(id, reason = '') {
  commit((s) => {
    const p = s.communityPosts.find((x) => x.id === id);
    if (p) { p.reports += 1; p.reportReason = String(reason).trim(); p.reportedAt = now(); }
  });
  audit('community.post-reported', String(id));
}

/* ========================================================== referrals (D) */

export function referrals() { return [...getState().referrals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function referral(id) { return getState().referrals.find((r) => r.id === id) || null; }

export function createReferral({ doctorId, reason, urgency = 'routine', summary = '', recordIds = [] }) {
  const errors = {};
  if (!DOCTORS.some((d) => d.id === doctorId)) errors.doctorId = 'required';
  if (String(reason || '').trim().length < 8) errors.reason = 'too-short';
  if (Object.keys(errors).length) return { ok: false, errors };
  const r = {
    id: uid('rf'), doctorId, reason: String(reason).trim(), urgency,
    summary: String(summary).trim(), recordIds, status: 'draft',
    createdAt: now(), delivered: false, deliveredAt: null,
    history: [{ at: now(), status: 'draft', note: '' }]
  };
  commit((s) => { s.referrals.unshift(r); });
  return { ok: true, referral: r };
}

export function markReferralReady(id) {
  commit((s) => {
    const r = s.referrals.find((x) => x.id === id);
    if (!r) return;
    r.status = 'ready';
    r.history.push({ at: now(), status: 'ready', note: 'Imewekwa tayari kwenye kifaa — haijatumwa.' });
  });
  return { ok: true };
}

export function respondReferral(id, action, note = '') {
  if (!['accept', 'decline'].includes(action)) return { ok: false };
  commit((s) => {
    const r = s.referrals.find((x) => x.id === id);
    if (!r) return;
    r.status = action === 'accept' ? 'accepted' : 'declined';
    r.history.push({ at: now(), status: r.status, note: String(note).trim() || 'Kumbukumbu ya kifaa pekee.' });
  });
  return { ok: true };
}

/* ==================================================== professional profile (E) */

export function proProfile() { return getState().pro; }

export function saveProProfile(patch) {
  const errors = {};
  const name = String(patch.name ?? proProfile().name).trim();
  if (!name) errors.name = 'required';
  commit((s) => {
    s.pro = Object.assign({}, s.pro, {
      name,
      specialty: Number(patch.specialty ?? s.pro.specialty) || 0,
      facility: String(patch.facility ?? s.pro.facility).trim(),
      qualification: String(patch.qualification ?? s.pro.qualification).trim(),
      licence: String(patch.licence ?? s.pro.licence).trim()
    });
  });
  return { ok: true, errors };
}

/** Files are held in memory/labels only — nothing is uploaded or reviewed. */
export function attachProDocument(file) {
  if (!file) return { ok: false };
  const doc = { id: uid('dc'), name: String(file.name).slice(0, 80), size: file.size, type: file.type, addedAt: now(), uploaded: false, local: true };
  commit((s) => { s.pro.documents.push(doc); });
  return { ok: true, doc };
}

export function submitVerification() {
  const p = proProfile();
  if (!p.name || !p.qualification) return { ok: false, errors: { name: !p.name ? 'required' : '', qualification: !p.qualification ? 'required' : '' } };
  commit((s) => {
    s.pro.verification = 'pending-review';
    s.pro.submittedAt = now();
    s.pro.note = 'Hakuna mhakiki aliyeunganishwa. Wasilisho hili limehifadhiwa kwenye kifaa hiki pekee.';
  });
  return { ok: true, status: 'pending-review' };
}
