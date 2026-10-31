/**
 * GuardHai · services/guardian.service.js
 * The Guardian Network.
 *
 * The consent rule is the whole point of this file:
 *
 *   1. the OWNER invites (status `sent`) — nothing is granted yet;
 *   2. the INVITED PERSON accepts (`received` → `active`) — only they can do this;
 *   3. either side can revoke at any time, which clears every permission.
 *
 * `guardianCan()` in domain/network.js returns false unless status is `active`,
 * so no screen can accidentally treat an invitation as authority.
 */
import { createRepo, sortBy } from '../data/network.repo.js';
import { uid, nowIso } from '../core/id.js';
import { bus, EVENTS } from '../core/bus.js';
import { currentUser } from './session.service.js';
import {
  GUARDIAN_ROLES, GUARDIAN_STATUS, GUARDIAN_PERMISSION_KEYS, GUARDIAN_ROLE_DEFAULTS,
  guardianshipPermissions, rateLimit
} from '../domain/network.js';
import { send as transportSend, transportStatus } from './transport.service.js';
import { notify, audit } from './alerts.service.js';

const repo = createRepo('guardianships');
const blockRepo = createRepo('blocks');
const selfId = () => currentUser().id;

/* ------------------------------------------------------------------- read */
export async function listAsOwner() {
  const rows = (await repo.where('ownerId', selfId()));
  return rows.sort(sortBy('createdAt'));
}

export async function listAsGuardian() {
  const rows = (await repo.where('guardianId', selfId()));
  return rows.sort(sortBy('createdAt'));
}

export async function listAll() {
  const me = selfId();
  return (await repo.all())
    .filter((r) => r.ownerId === me || r.guardianId === me)
    .sort(sortBy('createdAt'));
}

export async function get(id) {
  return repo.get(id);
}

export async function incomingInvitations() {
  return (await listAsGuardian()).filter((r) => r.status === 'received');
}

export async function outgoingInvitations() {
  return (await listAsOwner()).filter((r) => r.status === 'sent');
}

export async function activeGuardians() {
  return (await listAsOwner()).filter((r) => r.status === 'active');
}

/** the relationship that grants `profileId` guardian authority over me, if any */
export async function guardianFor(profileId) {
  const rows = await listAsOwner();
  return rows.find((r) => r.guardianId === profileId && r.status === 'active') || null;
}

export async function isGuardianOf(profileId) {
  return !!(await guardianFor(profileId));
}

/* ------------------------------------------------------------------ invite */
/**
 * The owner invites someone. The row starts as `sent`; it becomes authority only
 * after the invited person accepts on their own account.
 */
export async function inviteGuardian({ profileId, role = 'backup', permissions = {}, note = '' }) {
  const me = selfId();
  if (!profileId) return { ok: false, message: 'Chagua mtu wa kumwalika.' };
  if (profileId === me) return { ok: false, message: 'Hauwezi kujialika wewe mwenyewe.' };
  if (!GUARDIAN_ROLES[role]) return { ok: false, message: 'Chagua jukumu la mlezi.' };

  const limit = rateLimit('request', `guardian:${me}`);
  if (!limit.ok) return { ok: false, message: limit.message };

  if (await blockRepo.get(`blk:${me}:${profileId}`)) {
    return { ok: false, message: 'Umemzuia mtu huyu. Ondoa zuio kwanza.' };
  }

  const existing = (await listAsOwner()).find(
    (r) => r.guardianId === profileId && ['sent', 'active'].includes(r.status)
  );
  if (existing) {
    return { ok: false, message: existing.status === 'active' ? 'Tayari ni mlezi wako.' : 'Mwaliko ungojea jibu.' };
  }

  const now = nowIso();
  const row = {
    id: uid('grd'),
    ownerId: me,
    guardianId: profileId,
    role,
    permissions: guardianshipPermissions(role, permissions),
    status: 'sent',
    note: String(note || '').slice(0, 200),
    createdAt: now,
    updatedAt: now,
    requestedAt: now,
    respondedAt: null,
    consent: { requestedBy: me, respondedBy: null, respondedAt: null },
    invitationDelivered: false,
    history: [{ at: now, actorId: me, action: 'invited', role }]
  };
  await repo.put(row);

  const delivery = await transportSend({ kind: 'guardian-invitation', guardianshipId: row.id });
  if (delivery.ok) {
    row.invitationDelivered = true;
    await repo.put(row);
  }

  await audit({ actorId: me, action: 'guardian.invited', subjectType: 'guardianship', subjectId: row.id, detail: role });
  bus.emit(EVENTS.GUARDIAN_CHANGED, row);
  return {
    ok: true,
    guardianship: row,
    delivered: delivery.ok,
    reason: delivery.ok ? null : delivery.reason,
    message: delivery.ok
      ? 'Mwaliko umetumwa.'
      : 'Mwaliko umehifadhiwa kwenye kifaa. Hakuna seva iliyounganishwa, kwa hiyo haujafika kwa mtu huyo.'
  };
}

/** Only the invited account can accept. This is the consent gate. */
export async function acceptInvitation(id) {
  const me = selfId();
  const row = await repo.get(id);
  if (!row) return { ok: false, message: 'Mwaliko haupo.' };
  if (row.guardianId !== me) return { ok: false, message: 'Mwaliko huu si wako — hauwezi kuukubali.' };
  if (row.status !== 'received') return { ok: false, message: 'Mwaliko huu hausubiri jibu.' };

  const now = nowIso();
  const next = {
    ...row,
    status: 'active',
    respondedAt: now,
    updatedAt: now,
    consent: { ...row.consent, respondedBy: me, respondedAt: now },
    history: [...(row.history || []), { at: now, actorId: me, action: 'accepted' }]
  };
  await repo.put(next);
  await audit({ actorId: me, action: 'guardian.accepted', subjectType: 'guardianship', subjectId: id });
  await notify({ title: 'Umekubali kuwa mlezi', body: 'Ruhusa zilizoonyeshwa tu ndizo unazotoa.', kind: 'guardian' });
  bus.emit(EVENTS.GUARDIAN_CHANGED, next);
  return { ok: true, guardianship: next };
}

export async function declineInvitation(id) {
  const me = selfId();
  const row = await repo.get(id);
  if (!row) return { ok: false, message: 'Mwaliko haupo.' };
  if (row.guardianId !== me) return { ok: false, message: 'Mwaliko huu si wako.' };
  if (row.status !== 'received') return { ok: false, message: 'Mwaliko huu hausubiri jibu.' };
  const now = nowIso();
  const next = {
    ...row,
    status: 'declined',
    permissions: {},
    respondedAt: now,
    updatedAt: now,
    consent: { ...row.consent, respondedBy: me, respondedAt: now },
    history: [...(row.history || []), { at: now, actorId: me, action: 'declined' }]
  };
  await repo.put(next);
  await audit({ actorId: me, action: 'guardian.declined', subjectType: 'guardianship', subjectId: id });
  bus.emit(EVENTS.GUARDIAN_CHANGED, next);
  return { ok: true, guardianship: next };
}

/** Grants raised to `active` only by the owner cancelling their own invitation. */
export async function cancelInvitation(id) {
  const me = selfId();
  const row = await repo.get(id);
  if (!row) return { ok: false, message: 'Mwaliko haupo.' };
  if (row.ownerId !== me) return { ok: false, message: 'Mwaliko huu si wako.' };
  if (row.status !== 'sent') return { ok: false, message: 'Hauwezi kughairi mwaliko uliojibiwa.' };
  const next = { ...row, status: 'revoked', permissions: {}, updatedAt: nowIso(),
    history: [...(row.history || []), { at: nowIso(), actorId: me, action: 'cancelled' }] };
  await repo.put(next);
  await audit({ actorId: me, action: 'guardian.cancelled', subjectType: 'guardianship', subjectId: id });
  bus.emit(EVENTS.GUARDIAN_CHANGED, next);
  return { ok: true, guardianship: next };
}

/* -------------------------------------------------------------- permissions */
export async function setPermissions(id, permissions = {}) {
  const me = selfId();
  const row = await repo.get(id);
  if (!row) return { ok: false, message: 'Mahusiano hayapo.' };
  if (row.ownerId !== me) return { ok: false, message: 'Ni mmiliki pekee anayeweza kubadili ruhusa.' };
  if (row.status !== 'active') return { ok: false, message: 'Ruhusa zinaanza baada ya mlezi kukubali.' };

  const clean = {};
  for (const key of GUARDIAN_PERMISSION_KEYS) clean[key] = !!permissions[key];
  const next = {
    ...row,
    permissions: clean,
    updatedAt: nowIso(),
    history: [...(row.history || []), { at: nowIso(), actorId: me, action: 'permissions-updated', permissions: clean }]
  };
  await repo.put(next);
  await audit({ actorId: me, action: 'guardian.permissions', subjectType: 'guardianship', subjectId: id,
    detail: Object.entries(clean).filter(([, v]) => v).map(([k]) => k).join(',') || 'none' });
  bus.emit(EVENTS.GUARDIAN_CHANGED, next);
  return { ok: true, guardianship: next };
}

export async function setRole(id, role) {
  const me = selfId();
  const row = await repo.get(id);
  if (!row) return { ok: false, message: 'Mahusiano hayapo.' };
  if (row.ownerId !== me) return { ok: false, message: 'Ni mmiliki pekee anayeweza kubadili jukumu.' };
  if (!GUARDIAN_ROLES[role]) return { ok: false, message: 'Jukumu hilo halipo.' };
  if (row.status === 'active') {
    const next = { ...row, role, updatedAt: nowIso(),
      history: [...(row.history || []), { at: nowIso(), actorId: me, action: 'role-changed', role }] };
    await repo.put(next);
    await audit({ actorId: me, action: 'guardian.role', subjectType: 'guardianship', subjectId: id, detail: role });
    bus.emit(EVENTS.GUARDIAN_CHANGED, next);
    return { ok: true, guardianship: next };
  }
  const next = { ...row, role, permissions: guardianshipPermissions(role, {}), updatedAt: nowIso() };
  await repo.put(next);
  bus.emit(EVENTS.GUARDIAN_CHANGED, next);
  return { ok: true, guardianship: next };
}

/** Either party can revoke; the permissions are cleared, never just hidden. */
export async function revoke(id, reason = '') {
  const me = selfId();
  const row = await repo.get(id);
  if (!row) return { ok: false, message: 'Mahusiano hayapo.' };
  if (row.ownerId !== me && row.guardianId !== me) return { ok: false, message: 'Huna ruhusa.' };
  if (!['active', 'sent', 'received'].includes(row.status)) return { ok: false, message: 'Mahusiano haya hayafanyi kazi.' };

  const now = nowIso();
  const next = {
    ...row,
    status: 'revoked',
    permissions: {},
    revokedAt: now,
    revokedBy: me,
    updatedAt: now,
    history: [...(row.history || []), { at: now, actorId: me, action: 'revoked', reason: String(reason).slice(0, 200) }]
  };
  await repo.put(next);
  await audit({ actorId: me, action: 'guardian.revoked', subjectType: 'guardianship', subjectId: id, detail: reason });
  await notify({ title: 'Ruhusa ya mlezi imeondolewa', body: 'Ruhusa zote zimefungwa.', kind: 'guardian' });
  bus.emit(EVENTS.GUARDIAN_CHANGED, next);
  return { ok: true, guardianship: next };
}

/* ------------------------------------------------------------------ stats */
export async function guardianStats() {
  const all = await listAll();
  return {
    active: all.filter((r) => r.status === 'active' && r.ownerId === selfId()).length,
    incoming: all.filter((r) => r.status === 'received' && r.guardianId === selfId()).length,
    outgoing: all.filter((r) => r.status === 'sent' && r.ownerId === selfId()).length,
    revoked: all.filter((r) => r.status === 'revoked').length,
    asGuardian: all.filter((r) => r.status === 'active' && r.guardianId === selfId()).length,
    permissionsGranted: all
      .filter((r) => r.status === 'active' && r.ownerId === selfId())
      .reduce((n, r) => n + Object.values(r.permissions || {}).filter(Boolean).length, 0)
  };
}

export const roleDefaults = (role) => ({ ...GUARDIAN_ROLE_DEFAULTS[role] });
export const statusOf = (id) => GUARDIAN_STATUS[id] || GUARDIAN_STATUS.sent;
export const transportConnected = () => transportStatus().connected;

export async function resetGuardianships() {
  for (const row of await repo.all()) await repo.remove(row.id);
  bus.emit(EVENTS.GUARDIAN_CHANGED, { reset: true });
}
