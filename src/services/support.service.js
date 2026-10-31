/**
 * GuardHai · services/support.service.js
 * Support requests: seven categories, four provider kinds, one honest rule.
 *
 *   A request is written on this device. Routing it to a provider needs a
 *   transport; until one exists the request stays `submitted`, the UI says
 *   "haijatumwa", and `routing.delivered` stays false. No reply is ever invented.
 *
 * Provider verification is read through the existing profile verification model
 * (domain/profile.js). A provider without `verification.*.checkedBy` is
 * "Hakuna uthibitisho" — never "verified professional".
 */
import { createRepo, sortBy } from '../data/network.repo.js';
import { uid, nowIso } from '../core/id.js';
import { bus, EVENTS } from '../core/bus.js';
import { currentUser } from './session.service.js';
import {
  SUPPORT_CATEGORIES, SUPPORT_URGENCY, REQUEST_STATUS, PROVIDER_KINDS,
  validateSupportRequest, rateLimit, LIMITS
} from '../domain/network.js';
import { send as transportSend, transportStatus } from './transport.service.js';
import { notify, audit } from './alerts.service.js';
import { getProfile } from './profile.service.js';
import { verificationOf } from '../domain/profile.js';

const providerRepo = createRepo('supportProviders');
const requestRepo = createRepo('supportRequests');
const selfId = () => currentUser().id;

/* --------------------------------------------------------------- providers */
export async function listProviders({ category = null, kind = null, query = '' } = {}) {
  const all = await providerRepo.all();
  const needle = String(query || '').trim().toLowerCase();
  return all
    .filter((p) => (category ? (p.categories || []).includes(category) : true))
    .filter((p) => (kind ? p.kind === kind : true))
    .filter((p) => (needle
      ? `${p.name} ${p.about} ${(p.categories || []).join(' ')}`.toLowerCase().includes(needle)
      : true))
    .sort((a, b) => Number(!!b.sample) - Number(!!a.sample) || String(a.name).localeCompare(String(b.name)));
}

export async function getProvider(id) {
  return providerRepo.get(id);
}

export async function addProvider(provider) {
  const row = {
    id: provider.id || uid('prov'),
    name: String(provider.name || '').trim(),
    kind: PROVIDER_KINDS[provider.kind] ? provider.kind : 'individual',
    categories: (provider.categories || []).filter((c) => SUPPORT_CATEGORIES[c]),
    about: String(provider.about || '').slice(0, 400),
    availability: provider.availability || 'haijulikani',
    contactPolicy: 'in-app',
    verification: provider.verification || { licence: {}, institution: {} },
    sample: !!provider.sample,
    createdAt: nowIso()
  };
  await providerRepo.put(row);
  bus.emit(EVENTS.SUPPORT_CHANGED, row);
  return row;
}

/**
 * Verification is derived, never stored as a claim. `checkedBy` is the only field
 * that can produce "imethibitishwa", and nothing in this app can set it.
 */
export async function providerVerification(provider) {
  if (!provider) return { status: 'none', label: 'Hakuna taarifa' };
  const profile = provider.profileId ? await getProfile(provider.profileId) : null;
  const source = profile || provider;
  const v = verificationOf(source);
  const licence = v.licence?.status;
  const institution = v.institution?.status;
  if (licence === 'verified' || institution === 'verified') {
    const which = licence === 'verified' ? v.licence : v.institution;
    return {
      status: 'verified',
      label: 'Imethibitishwa',
      detail: `${which.authority || 'Mthibitishaji'} · ${which.reference || 'kumbukumbu'}`
    };
  }
  if (provider.sample || profile?.sample) {
    return { status: 'sample', label: 'Sampuli', detail: 'Mtoa huduma wa mfano — si mtu halisi.' };
  }
  if (licence === 'requested' || institution === 'requested') {
    return { status: 'requested', label: 'Uthibitisho umeombwa', detail: 'Hakuna mthibitishaji aliyejibu.' };
  }
  return { status: 'none', label: 'Hakuna uthibitisho', detail: 'Hakuna leseni au taasisi iliyothibitishwa.' };
}

/* ----------------------------------------------------------------- requests */
export async function createRequest({ category, subject, body, urgency = 'normal', providerId = null }) {
  const me = selfId();
  const check = validateSupportRequest({ category, subject, body });
  if (!check.ok) return { ok: false, message: check.message, field: check.field };

  const limit = rateLimit('request', me);
  if (!limit.ok) return { ok: false, message: limit.message };

  const now = nowIso();
  const row = {
    id: uid('req'),
    requesterId: me,
    category,
    subject: check.value.subject,
    body: check.value.body,
    urgency: SUPPORT_URGENCY[urgency] ? urgency : 'normal',
    providerId: providerId || null,
    status: 'submitted',
    routing: { attempted: 0, delivered: false, lastAttemptAt: null, transport: null, reason: 'not-attempted' },
    responses: [],
    timeline: [{ at: now, actorId: me, action: 'created' }],
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    sample: false,
    emergency: false
  };
  await requestRepo.put(row);
  await audit({ actorId: me, action: 'support.requested', subjectType: 'supportRequest', subjectId: row.id, detail: category });
  bus.emit(EVENTS.SUPPORT_CHANGED, row);
  return { ok: true, request: row };
}

export async function listRequests() {
  return (await requestRepo.where('status', 'submitted'))
    .concat((await requestRepo.all()).filter((r) => r.status !== 'submitted'))
    .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
    .sort(sortBy('createdAt'));
}

export async function getRequest(id) {
  return requestRepo.get(id);
}

/** Attempt routing through the transport boundary. Failure is a visible state. */
export async function routeRequest(id) {
  const me = selfId();
  const row = await requestRepo.get(id);
  if (!row) return { ok: false, message: 'Ombi halipo.' };
  if (row.requesterId !== me) return { ok: false, message: 'Ombi hili si lako.' };
  if (!['submitted', 'routed'].includes(row.status)) return { ok: false, message: 'Ombi hili halisubiri kutumwa.' };

  const now = nowIso();
  const result = await transportSend({ kind: 'support-request', requestId: id, category: row.category });
  const status = transportStatus();

  const routing = {
    attempted: (row.routing?.attempted || 0) + 1,
    delivered: !!result.ok,
    lastAttemptAt: now,
    transport: status.name,
    reason: result.ok ? 'delivered' : result.reason
  };

  const next = {
    ...row,
    status: result.ok ? 'routed' : 'submitted',
    routing,
    updatedAt: now,
    timeline: [...row.timeline, { at: now, actorId: me, action: result.ok ? 'routed' : 'route-failed', reason: routing.reason }]
  };
  await requestRepo.put(next);
  bus.emit(EVENTS.SUPPORT_CHANGED, next);
  return {
    ok: true,
    request: next,
    delivered: result.ok,
    message: result.ok
      ? 'Ombi limepelekwa kwa mtoa huduma.'
      : 'Ombi limehifadhiwa kwenye kifaa. Hakuna muunganisho wa kutuma — halijafika kwa mtoa huduma yeyote.'
  };
}

/**
 * Provider replies are role-gated. Without a provider account on this device the
 * call is refused — the UI never simulates an answer, and the test asserts the
 * refusal, so "no fake replies" is enforced, not just claimed.
 */
export async function replyAsProvider(id, text) {
  const me = selfId();
  const row = await requestRepo.get(id);
  if (!row) return { ok: false, code: 'not-found', message: 'Ombi halipo.' };
  if (!row.providerId) return { ok: false, code: 'no-provider', message: 'Hakuna mtoa huduma aliyechaguliwa.' };
  if (row.providerId !== me) return { ok: false, code: 'forbidden', message: 'Wewe si mtoa huduma wa ombi hili.' };

  const body = String(text || '').trim();
  if (body.length < 2 || body.length > LIMITS.requestBody.max) {
    return { ok: false, code: 'invalid', message: 'Jibu linahitaji herufi 2–2000.' };
  }
  const now = nowIso();
  const next = {
    ...row,
    status: 'in_progress',
    responses: [...row.responses, { id: uid('resp'), at: now, actorId: me, role: 'provider', body }],
    updatedAt: now,
    timeline: [...row.timeline, { at: now, actorId: me, action: 'provider-replied' }]
  };
  await requestRepo.put(next);
  bus.emit(EVENTS.SUPPORT_CHANGED, next);
  return { ok: true, request: next };
}

/** The requester can always add context, close or cancel their own request. */
export async function addNote(id, text) {
  const me = selfId();
  const row = await requestRepo.get(id);
  if (!row) return { ok: false, message: 'Ombi halipo.' };
  if (row.requesterId !== me) return { ok: false, message: 'Ombi hili si lako.' };
  const body = String(text || '').trim();
  if (body.length < 2) return { ok: false, message: 'Andika maelezo ya kutosha.' };
  const now = nowIso();
  const next = {
    ...row,
    responses: [...row.responses, { id: uid('resp'), at: now, actorId: me, role: 'requester', body }],
    updatedAt: now,
    timeline: [...row.timeline, { at: now, actorId: me, action: 'note-added' }]
  };
  await requestRepo.put(next);
  bus.emit(EVENTS.SUPPORT_CHANGED, next);
  return { ok: true, request: next };
}

export async function closeRequest(id) {
  const me = selfId();
  const row = await requestRepo.get(id);
  if (!row) return { ok: false, message: 'Ombi halipo.' };
  if (row.requesterId !== me) return { ok: false, message: 'Ombi hili si lako.' };
  if (['closed', 'cancelled'].includes(row.status)) return { ok: false, message: 'Ombi limefungwa.' };
  const now = nowIso();
  const next = { ...row, status: 'closed', closedAt: now, updatedAt: now,
    timeline: [...row.timeline, { at: now, actorId: me, action: 'closed' }] };
  await requestRepo.put(next);
  await audit({ actorId: me, action: 'support.closed', subjectType: 'supportRequest', subjectId: id });
  bus.emit(EVENTS.SUPPORT_CHANGED, next);
  return { ok: true, request: next };
}

export async function cancelRequest(id) {
  const me = selfId();
  const row = await requestRepo.get(id);
  if (!row) return { ok: false, message: 'Ombi halipo.' };
  if (row.requesterId !== me) return { ok: false, message: 'Ombi hili si lako.' };
  const now = nowIso();
  const next = { ...row, status: 'cancelled', updatedAt: now,
    timeline: [...row.timeline, { at: now, actorId: me, action: 'cancelled' }] };
  await requestRepo.put(next);
  bus.emit(EVENTS.SUPPORT_CHANGED, next);
  return { ok: true, request: next };
}

export async function supportStats() {
  const rows = await requestRepo.all();
  const mine = rows.filter((r) => r.requesterId === selfId());
  return {
    total: mine.length,
    open: mine.filter((r) => ['submitted', 'routed', 'acknowledged', 'in_progress'].includes(r.status)).length,
    resolved: mine.filter((r) => r.status === 'resolved').length,
    byCategory: mine.reduce((acc, r) => ({ ...acc, [r.category]: (acc[r.category] || 0) + 1 }), {}),
    providers: await providerRepo.count()
  };
}

export const statusOf = (id) => REQUEST_STATUS[id] || REQUEST_STATUS.submitted;
export const categoryOf = (id) => SUPPORT_CATEGORIES[id] || null;
export const urgencyOf = (id) => SUPPORT_URGENCY[id] || SUPPORT_URGENCY.normal;

export async function resetSupport() {
  for (const row of await requestRepo.all()) await requestRepo.remove(row.id);
  for (const row of await providerRepo.all()) await providerRepo.remove(row.id);
  bus.emit(EVENTS.SUPPORT_CHANGED, { reset: true });
}
