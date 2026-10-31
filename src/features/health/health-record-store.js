/**
 * GuardHai · features/health/health-record-store.js
 * Medical ID, emergency contacts, QR access tokens, records, medication and
 * appointments — all device-local. Statuses only ever move forward through what
 * the person actually did here: an appointment is `requested`, never
 * `confirmed`, because nothing can confirm it.
 */

import { BLOOD_GROUPS, CONSULT_TYPES, DOCTORS, QR_SCOPES, RECORD_CATEGORIES } from './health-catalog.js';
import { audit, clone, commit, getState, now, sameDay, todayKey, uid } from './health-state.js';

const blankMedical = () => ({
  fullName: '', dob: '', sex: '', blood: '', weight: '', height: '',
  allergies: '', conditions: '', notes: '', updatedAt: null, synthetic: false
});

export function medicalId(profileId = getState().activeProfile) {
  return getState().medical[profileId] || blankMedical();
}

export function medicalCompletion(profileId = getState().activeProfile) {
  const m = medicalId(profileId);
  const contacts = contactsFor(profileId);
  const checks = [
    ['fullName', !!m.fullName], ['dob', !!m.dob], ['sex', !!m.sex], ['blood', !!m.blood],
    ['allergies', !!m.allergies], ['conditions', !!m.conditions], ['contacts', contacts.length > 0]
  ];
  const done = checks.filter((c) => c[1]).length;
  return { done, total: checks.length, pct: Math.round((done / checks.length) * 100), missing: checks.filter((c) => !c[1]).map((c) => c[0]) };
}

/** Validates and saves. Returns { ok, errors } so the view can render inline. */
export function saveMedicalId(patch, profileId = getState().activeProfile) {
  const errors = {};
  const clean = {
    fullName: String(patch.fullName || '').trim(),
    dob: String(patch.dob || '').trim(),
    sex: String(patch.sex || '').trim(),
    blood: String(patch.blood || '').trim(),
    weight: String(patch.weight || '').trim(),
    height: String(patch.height || '').trim(),
    allergies: String(patch.allergies || '').trim(),
    conditions: String(patch.conditions || '').trim(),
    notes: String(patch.notes || '').trim()
  };
  if (!clean.fullName) errors.fullName = 'required';
  else if (clean.fullName.length < 3) errors.fullName = 'too-short';
  else if (clean.fullName.length > 80) errors.fullName = 'too-long';
  if (!clean.dob) errors.dob = 'required';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(clean.dob)) errors.dob = 'invalid-date';
  else if (new Date(clean.dob) > new Date()) errors.dob = 'future-date';
  if (clean.blood && !BLOOD_GROUPS.includes(clean.blood)) errors.blood = 'invalid';
  if (clean.weight && !/^\d{1,3}([.,]\d{1,2})?$/.test(clean.weight)) errors.weight = 'invalid-number';
  if (Object.keys(errors).length) return { ok: false, errors };

  commit((s) => {
    s.medical[profileId] = Object.assign(blankMedical(), s.medical[profileId], clean, { updatedAt: now(), synthetic: false });
    s.audit.unshift({ id: uid('au'), at: now(), event: 'medical-id.saved', detail: '' });
    s.audit = s.audit.slice(0, 60);
  });
  return { ok: true };
}

/* --------------------------------------------------------- emergency contacts */

export function contactsFor(profileId = getState().activeProfile) {
  return getState().contacts.filter((c) => c.profileId === profileId);
}

export function addContact({ name, relation = '', phone }) {
  const n = String(name || '').trim();
  const p = String(phone || '').replace(/[^\d+]/g, '');
  if (!n) return { ok: false, errors: { name: 'required' } };
  if (p.replace(/\D/g, '').length < 7) return { ok: false, errors: { phone: 'invalid-phone' } };
  const c = { id: uid('ec'), profileId: getState().activeProfile, name: n, relation: String(relation).trim(), phone: p, synthetic: false };
  commit((s) => { s.contacts.push(c); });
  return { ok: true, contact: c };
}

export function removeContact(id) {
  commit((s) => { s.contacts = s.contacts.filter((c) => c.id !== id); });
}

/* ============================================================ QR access token */
/* A token is an opaque handle. The QR carries ONLY the handle — never a name,
   blood group, allergy or history. Permissions are a list the person chooses. */

export function tokens() { return getState().tokens; }

export function createToken(scopes, hours = 24) {
  const chosen = (scopes || []).filter((s) => QR_SCOPES.some((q) => q.id === s));
  const t = {
    id: uid('tk'),
    handle: `gh-${Math.random().toString(36).slice(2, 10)}`,
    scopes: chosen,
    createdAt: now(),
    expiresAt: new Date(Date.now() + Math.max(1, Math.min(72, Number(hours) || 24)) * 3600e3).toISOString(),
    revoked: false,
    synthetic: false,
    accessLog: []
  };
  commit((s) => { s.tokens.unshift(t); });
  audit('qr.token-created', chosen.join(','));
  return t;
}

export function revokeToken(id) {
  commit((s) => {
    const t = s.tokens.find((x) => x.id === id);
    if (t) { t.revoked = true; t.revokedAt = now(); }
  });
  audit('qr.token-revoked', String(id));
}

export function activeToken() {
  return tokens().find((t) => !t.revoked && new Date(t.expiresAt) > new Date()) || null;
}

/* ================================================================== records */

export function records(q = '', category = 'all') {
  const term = q.trim().toLowerCase();
  return getState().records.filter((r) => {
    if (category !== 'all' && r.category !== category) return false;
    if (!term) return true;
    return [r.title, r.facility, r.summary, r.category].join(' ').toLowerCase().includes(term);
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function record(id) { return getState().records.find((r) => r.id === id) || null; }

export function addRecord({ title, category, date, facility = '', summary = '', file = null }) {
  const errors = {};
  const t = String(title || '').trim();
  if (!t) errors.title = 'required';
  if (!RECORD_CATEGORIES.some((c) => c.id === category)) errors.category = 'required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) errors.date = 'invalid-date';
  if (Object.keys(errors).length) return { ok: false, errors };
  const r = {
    id: uid('rc'), title: t, category, date, facility: String(facility).trim(),
    summary: String(summary).trim(), file: file ? { name: file.name, size: file.size, type: file.type, local: true } : null,
    source: 'self-entered', synthetic: false, addedAt: now()
  };
  commit((s) => { s.records.unshift(r); });
  return { ok: true, record: r };
}

export function removeRecord(id) {
  commit((s) => { s.records = s.records.filter((r) => r.id !== id); });
}

/* ============================================================== medication */

export function meds() { return getState().meds; }
export function med(id) { return getState().meds.find((m) => m.id === id) || null; }

export function addMed({ name, dose = '', times = [], instructions = '', start = todayKey(), end = '', file = null }) {
  const errors = {};
  const n = String(name || '').trim();
  if (!n) errors.name = 'required';
  const cleanTimes = (Array.isArray(times) ? times : String(times || '').split(',')).map((t) => String(t).trim()).filter(Boolean);
  if (!cleanTimes.length) errors.times = 'required';
  else if (cleanTimes.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) errors.times = 'invalid-time';
  if (Object.keys(errors).length) return { ok: false, errors };
  const m = {
    id: uid('md'), name: n, dose: String(dose).trim(), times: cleanTimes.sort(),
    instructions: String(instructions).trim(), start, end,
    file: file ? { name: file.name, size: file.size, type: file.type, local: true } : null,
    synthetic: false, createdAt: now()
  };
  commit((s) => { s.meds.push(m); });
  return { ok: true, med: m };
}

export function updateMed(id, patch) {
  commit((s) => {
    const m = s.meds.find((x) => x.id === id);
    if (!m) return;
    Object.assign(m, {
      name: String(patch.name || m.name).trim(),
      dose: String(patch.dose ?? m.dose).trim(),
      instructions: String(patch.instructions ?? m.instructions).trim()
    });
  });
  return { ok: true };
}

export function deleteMed(id) {
  commit((s) => {
    s.meds = s.meds.filter((m) => m.id !== id);
    s.doses = s.doses.filter((d) => d.medId !== id);
  });
}

/** Today's slots for one med, joined with the dose log. */
export function scheduleFor(date = todayKey()) {
  const s = getState();
  const out = [];
  s.meds.forEach((m) => {
    m.times.forEach((time) => {
      const logged = s.doses.find((d) => d.medId === m.id && d.date === date && d.time === time);
      let status = 'due';
      if (logged) status = logged.status;
      else if (date < todayKey()) status = 'missed';
      else if (date === todayKey() && time < new Date().toTimeString().slice(0, 5)) status = 'due';
      out.push({ medId: m.id, name: m.name, dose: m.dose, time, status, loggedAt: logged ? logged.at : null, note: logged ? logged.note : '' });
    });
  });
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export function recordDose(medId, time, status, note = '', date = todayKey()) {
  if (!['taken', 'skipped', 'missed'].includes(status)) return { ok: false };
  commit((s) => {
    s.doses = s.doses.filter((d) => !(d.medId === medId && d.date === date && d.time === time));
    s.doses.unshift({ id: uid('ds'), medId, date, time, status, note: String(note).trim(), at: now(), source: 'self-reported' });
  });
  return { ok: true };
}

/** Removes a self-reported dose entry (undo), leaving the medicine alone. */
export function clearDose(medId, time, date = todayKey()) {
  commit((s) => {
    s.doses = s.doses.filter((d) => !(d.medId === medId && d.date === date && d.time === time));
  });
  audit('dose.cleared', `${medId} ${time}`);
  return { ok: true };
}

export function doseHistory(medId = null, limit = 30) {
  return getState().doses
    .filter((d) => (medId ? d.medId === medId : true))
    .slice(0, limit);
}

export function doseSummary(date = todayKey()) {
  const rows = scheduleFor(date);
  return {
    total: rows.length,
    taken: rows.filter((r) => r.status === 'taken').length,
    missed: rows.filter((r) => r.status === 'missed').length,
    skipped: rows.filter((r) => r.status === 'skipped').length,
    due: rows.filter((r) => r.status === 'due').length
  };
}

/* ============================================================ appointments */

export function appointments() {
  return [...getState().appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
export function appointment(id) { return getState().appointments.find((a) => a.id === id) || null; }

export function requestAppointment({ doctorId, date, time, type, reason = '' }) {
  const errors = {};
  if (!DOCTORS.some((d) => d.id === doctorId)) errors.doctorId = 'required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) errors.date = 'invalid-date';
  else if (date < todayKey()) errors.date = 'past-date';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''))) errors.time = 'invalid-time';
  if (!CONSULT_TYPES.some((t) => t.id === type)) errors.type = 'required';
  if (Object.keys(errors).length) return { ok: false, errors };
  const a = {
    id: uid('ap'), doctorId, date, time, type, reason: String(reason).trim(),
    status: 'requested', synthetic: false, createdAt: now(),
    history: [{ at: now(), status: 'requested', note: '' }],
    summary: null, confirmedBy: null
  };
  commit((s) => { s.appointments.push(a); });
  return { ok: true, appointment: a };
}

/** Only a professional's confirmation could move status to `confirmed`;
    here the store refuses it and the UI says so. */
export function updateAppointment(id, action, note = '') {
  const a = appointment(id);
  if (!a) return { ok: false };
  if (action === 'confirm') return { ok: false, error: 'requires-professional' };
  const map = { reschedule: 'reschedule', cancel: 'cancelled', complete: 'completed' };
  if (!map[action]) return { ok: false };
  commit((s) => {
    const x = s.appointments.find((y) => y.id === id);
    x.status = map[action];
    x.history.push({ at: now(), status: map[action], note: String(note).trim() });
  });
  return { ok: true };
}
