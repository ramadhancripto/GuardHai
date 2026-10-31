/**
 * GuardHai · services/alerts.service.js
 * The single in-app alert queue and the single audit trail.
 *
 * Alerts are what the header bell shows. The Health section keeps its own
 * health-scoped notices (it shipped first and its records are separate); this
 * queue is the app-wide one for the network, and `home-sheets.openNotifications`
 * reads it instead of inventing a second sheet.
 *
 * The audit log is append-only by contract: nothing in the app calls update on
 * it, and every privileged action (role change, moderation decision, appeal)
 * writes one row with who did it, to what, and when.
 */
import { createRepo, sortBy } from '../data/network.repo.js';
import { bus, EVENTS } from '../core/bus.js';
import { uid, nowIso } from '../core/id.js';

const alertRepo = createRepo('alerts');
const auditRepo = createRepo('auditLog');
const AUDIT_MAX = 500;

export async function notify({ title, body = '', kind = 'info', link = null, actorId = null }) {
  const row = {
    id: uid('alert'),
    title,
    body,
    kind,
    link,
    actorId,
    read: false,
    createdAt: nowIso()
  };
  await alertRepo.put(row);
  bus.emit(EVENTS.ALERT_CREATED, row);
  return row;
}

export async function listAlerts() {
  return (await alertRepo.all()).sort(sortBy('createdAt'));
}

export async function unreadAlerts() {
  return (await listAlerts()).filter((a) => !a.read);
}

export async function markAlertsRead() {
  const rows = await alertRepo.all();
  for (const row of rows) {
    if (!row.read) await alertRepo.put({ ...row, read: true, readAt: nowIso() });
  }
  bus.emit(EVENTS.ALERT_CREATED, { read: true, count: rows.length });
  return rows.length;
}

export async function clearAlerts() {
  await alertRepo.clear();
  bus.emit(EVENTS.ALERT_CREATED, { cleared: true });
}

/* ------------------------------------------------------------------ audit */
export async function audit({ actorId, action, subjectType = 'system', subjectId = null, detail = '', communityId = null }) {
  const row = {
    id: uid('aud'),
    at: nowIso(),
    actorId: actorId || 'system',
    action,
    subjectType,
    subjectId,
    communityId,
    detail: String(detail).slice(0, 280)
  };
  await auditRepo.put(row);
  const all = await auditRepo.all();
  if (all.length > AUDIT_MAX) {
    const drop = all.sort(sortBy('at', 'asc')).slice(0, all.length - AUDIT_MAX);
    for (const old of drop) await auditRepo.remove(old.id);
  }
  bus.emit(EVENTS.SAFETY_CHANGED, { audit: row });
  return row;
}

export async function listAudit({ communityId = null, limit = 100 } = {}) {
  const rows = (await auditRepo.all()).sort(sortBy('at'));
  const filtered = communityId ? rows.filter((r) => r.communityId === communityId) : rows;
  return filtered.slice(0, limit);
}

export async function clearAudit() {
  await auditRepo.clear();
}
