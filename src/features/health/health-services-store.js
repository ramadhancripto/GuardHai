/**
 * GuardHai · features/health/health-services-store.js
 * Blood availability, emergency drafts, settings/notifications and the derived
 * overview that the home panel reads.
 */

import { ARTICLES, BLOOD_GROUPS, BLOOD_SEED, EDU_CATEGORIES, EMERGENCY_TYPES } from './health-catalog.js';
import { activeToken, contactsFor, doseSummary, medicalCompletion } from './health-record-store.js';
import { activeProfile, audit, commit, getState, now, todayKey, uid } from './health-state.js';

/* ============================================================ blood (12) */


export function bloodCatalog() {
  const reports = getState().blood;
  return BLOOD_SEED.map((row) => {
    const newest = reports.filter((r) => r.group === row.group && r.facility === row.facility)
      .sort((a, b) => b.at.localeCompare(a.at))[0];
    return Object.assign({}, row, {
      userReport: newest || null,
      checkedAt: newest ? newest.at : row.checkedAt,
      source: newest ? 'user-report' : 'synthetic'
    });
  });
}

export function searchBlood(group = '', place = '') {
  return bloodCatalog().filter((r) => {
    if (group && group !== 'all' && r.group !== group) return false;
    if (place && !r.place.toLowerCase().includes(place.toLowerCase()) && !r.facility.toLowerCase().includes(place.toLowerCase())) return false;
    return true;
  });
}

export function reportBlood({ group, facility, place, units }) {
  if (!BLOOD_GROUPS.includes(group)) return { ok: false, errors: { group: 'required' } };
  if (!String(facility || '').trim()) return { ok: false, errors: { facility: 'required' } };
  const r = { id: uid('bl'), group, facility: String(facility).trim(), place: String(place || '').trim(), units: Number(units) || 0, at: now(), source: 'user-report', synthetic: false };
  commit((s) => { s.blood.unshift(r); });
  return { ok: true, report: r };
}

/* ======================================================== emergency (13) */

export function emergencies() { return [...getState().emergency].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function emergency(id) { return getState().emergency.find((e) => e.id === id) || null; }

/**
 * Records an emergency request locally. `transmitted` is hard-coded false:
 * no dispatch, SMS, call or alert leaves this device.
 */
export function createEmergency({ type, note = '', shareLocation = false, shareMedicalId = true, location = null }) {
  if (!EMERGENCY_TYPES.some((t) => t.id === type)) return { ok: false, errors: { type: 'required' } };
  const e = {
    id: uid('em'), type, note: String(note).trim().slice(0, 300),
    shareLocation: !!shareLocation, shareMedicalId: !!shareMedicalId,
    location: shareLocation && location ? { lat: Number(location.lat), lng: Number(location.lng), accuracy: Number(location.accuracy) || null } : null,
    status: 'draft', transmitted: false, dispatched: false, confirmedBy: null,
    createdAt: now(), cancelledAt: null,
    history: [{ at: now(), status: 'draft', note: 'Imeandaliwa kwenye kifaa hiki.' }]
  };
  commit((s) => { s.emergency.unshift(e); });
  return { ok: true, emergency: e };
}

export function markEmergencyReviewed(id) {
  commit((s) => {
    const e = s.emergency.find((x) => x.id === id);
    if (!e) return;
    e.status = 'awaiting-human';
    e.history.push({ at: now(), status: 'awaiting-human', note: 'Haijatumwa. Piga simu ya dharura au mpeleke mtu kituo cha afya.' });
  });
  return { ok: true };
}

export function cancelEmergency(id, reason = '') {
  commit((s) => {
    const e = s.emergency.find((x) => x.id === id);
    if (!e) return;
    e.status = 'cancelled';
    e.cancelledAt = now();
    e.history.push({ at: now(), status: 'cancelled', note: String(reason).trim() });
  });
  return { ok: true };
}

/* ======================================================= notifications/settings */

export function prefs() { return getState().prefs; }

export function setPref(key, value) {
  commit((s) => { s.prefs[key] = value; });
  audit('settings.changed', `${key}=${value}`);
  return prefs();
}

export function notifications() { return getState().notifications; }

export function pushNotification({ title, body, tone = 'info', icon = 'i-bell' }) {
  commit((s) => {
    s.notifications.unshift({ id: uid('nt'), title, body, tone, icon, at: now(), read: false, delivered: false });
    s.notifications = s.notifications.slice(0, 40);
  });
}

export function markNotificationsRead() {
  commit((s) => { s.notifications.forEach((n) => { n.read = true; }); });
}

/* ================================================================ derived UI */

export function overview() {
  const s = getState();
  const prof = activeProfile();
  const comp = medicalCompletion(prof.id);
  const today = doseSummary();
  const upcoming = s.appointments
    .filter((a) => ['requested', 'confirmed', 'reschedule'].includes(a.status))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const openCases = s.cases.filter((c) => c.status !== 'closed').length;
  return {
    profile: prof, completion: comp, today,
    nextAppointment: upcoming[0] || null,
    appointments: upcoming.length,
    openCases,
    records: s.records.length,
    meds: s.meds.length,
    contacts: contactsFor(prof.id).length,
    token: activeToken(),
    unread: s.notifications.filter((n) => !n.read).length
  };
}


