/**
 * GuardHai · services/personal-safety.service.js
 * Personal Safety, on-device: safety journeys, personal check-ins, risk and
 * safety plans, SOS attempt records and the preferences that drive them.
 *
 * What is real: every row here is written to IndexedDB and survives a reload.
 * What is not: nothing in this file sends anything anywhere. There is no
 * transport, so a guardian is NOT notified when a journey goes overdue and a
 * check-in is NOT received by anybody. The copy in the screens says so, and
 * `capabilities()` is the single place that answers "can this reach someone?".
 *
 * Every function returns a result object (`{ ok, ... }`) — the screens never
 * have to guess whether something worked.
 */
import { createRepo, sortBy } from '../data/network.repo.js';
import { uid, nowIso } from '../core/id.js';
import { currentUser } from './session.service.js';
import { transportStatus } from './transport.service.js';
import { listReports, fileReport } from './safety.service.js';
import { listAll as listGuardiansAll, guardianStats } from './guardian.service.js';

const journeys = createRepo('safetyJourneys');
const checkins = createRepo('safetyCheckins');
const plans = createRepo('safetyPlans');
const prefRepo = createRepo('safetyPrefs');
const sosRepo = createRepo('sosAttempts');

const selfId = () => currentUser().id;
const MIN = 60000;

/* ------------------------------------------------------------------ kinds */

export const JOURNEY_WINDOWS = Object.freeze([
  { id: '30', minutes: 30, label: 'Dakika 30', en: '30 minutes' },
  { id: '60', minutes: 60, label: 'Saa 1', en: '1 hour' },
  { id: '120', minutes: 120, label: 'Saa 2', en: '2 hours' },
  { id: '240', minutes: 240, label: 'Saa 4', en: '4 hours' }
]);

export const JOURNEY_STATE = Object.freeze({
  active:   { id: 'active',   label: 'Safari inaendelea', en: 'Journey running',  tone: 'ok' },
  overdue:  { id: 'overdue',  label: 'Muda umepita',      en: 'Overdue',          tone: 'warn' },
  safe:     { id: 'safe',     label: 'Umefika salama',    en: 'Arrived safely',   tone: 'ok' },
  cancelled:{ id: 'cancelled',label: 'Safari ilighairiwa',en: 'Journey cancelled',tone: 'muted' }
});

export const CHECKIN_FEELINGS = Object.freeze([
  { id: 'safe',    label: 'Niko salama',        en: 'I am safe' },
  { id: 'uneasy',  label: 'Nina wasiwasi',      en: 'I feel uneasy' },
  { id: 'unsafe',  label: 'Sijihisi salama',    en: 'I do not feel safe' }
]);

export const INCIDENT_KINDS = Object.freeze([
  { id: 'other',   label: 'Tukio lingine',            en: 'Other incident' },
  { id: 'unsafe',  label: 'Hali hatarishi',           en: 'Unsafe situation' },
  { id: 'harassment', label: 'Unyanyasaji au vitisho', en: 'Harassment or threats' },
  { id: 'scam',    label: 'Utapeli',                  en: 'Scam' }
]);

export const PLAN_TEMPLATES = Object.freeze([
  {
    id: 'night-travel',
    title: 'Safari ya usiku',
    en: 'Night travel',
    whenToUse: 'Unaposafiri usiku au kupitia eneo usilolijua.',
    steps: ['Mjulishe mtu unayemwamini mahali unapoenda', 'Weka safari hapa kwenye GuardHai', 'Tuma ujumbe wa mwisho ukifika']
  },
  {
    id: 'health-emergency',
    title: 'Dharura ya afya',
    en: 'Health emergency',
    whenToUse: 'Unapohisi dalili mbaya na uko peke yako.',
    steps: ['Piga 114 mara moja', 'Fungua Kadi ya afya kwenye Afya', 'Mjulishe mlezi wako']
  },
  {
    id: 'lost-device',
    title: 'Kifaa kimepotea',
    en: 'Device lost',
    whenToUse: 'Kifaa kinapopotea au kuibiwa.',
    steps: ['Fungua Ulinzi → Kifaa → Recover', 'Badilisha namba za kuingia kwenye akaunti', 'Ripoti kwenye kituo cha polisi']
  }
]);

/* --------------------------------------------------------------- journeys */

export const journeyStateOf = (row) => {
  if (!row) return null;
  if (row.status === 'safe') return JOURNEY_STATE.safe;
  if (row.status === 'cancelled') return JOURNEY_STATE.cancelled;
  if (row.expectedAt && new Date(row.expectedAt).getTime() < Date.now()) return JOURNEY_STATE.overdue;
  return JOURNEY_STATE.active;
};

export async function startJourney({ label, place = '', minutes = 60 }) {
  const name = String(label || '').trim();
  if (name.length < 3) return { ok: false, message: 'Weka jina la safari (angalau herufi 3).', field: 'label' };
  const active = await activeJourney();
  if (active) return { ok: false, message: 'Kuna safari inayoendelea. Maliza kwanza kabla ya kuanza nyingine.' };

  const mins = Math.max(5, Math.min(24 * 60, Number(minutes) || 60));
  const row = {
    id: uid('jrn'),
    ownerId: selfId(),
    label: name,
    place: String(place || '').trim(),
    startedAt: nowIso(),
    expectedAt: new Date(Date.now() + mins * MIN).toISOString(),
    endedAt: null,
    status: 'active',
    sample: false
  };
  await journeys.put(row);
  return { ok: true, journey: row, message: 'Safari imeanza. Inahifadhiwa kwenye kifaa hiki.' };
}

export async function listJourneys() {
  const rows = await journeys.all();
  return rows.filter((r) => r.ownerId === selfId()).sort(sortBy('startedAt', 'desc'));
}

export async function activeJourney() {
  const rows = await listJourneys();
  return rows.find((r) => r.status === 'active') || null;
}

export async function endJourney(id, outcome = 'safe') {
  const row = await journeys.get(id);
  if (!row) return { ok: false, message: 'Safari haipo.' };
  if (row.status !== 'active') return { ok: false, message: 'Safari hii tayari imemalizika.' };
  const next = { ...row, status: outcome === 'cancelled' ? 'cancelled' : 'safe', endedAt: nowIso() };
  await journeys.put(next);
  return {
    ok: true,
    journey: next,
    message: outcome === 'cancelled'
      ? 'Safari imeghairiwa. Kumbukumbu inabaki kwenye kifaa hiki.'
      : 'Umeifunga safari salama. Hakuna mtu aliyetumwa ujumbe — hakuna seva iliyounganishwa.'
  };
}

export async function removeJourney(id) {
  await journeys.remove(id);
  return { ok: true, message: 'Kumbukumbu ya safari imeondolewa.' };
}

/* --------------------------------------------------------------- check-ins */

export async function checkIn({ feeling = 'safe', note = '' } = {}) {
  const row = {
    id: uid('chk'),
    ownerId: selfId(),
    feeling: CHECKIN_FEELINGS.some((f) => f.id === feeling) ? feeling : 'safe',
    note: String(note || '').trim().slice(0, 280),
    at: nowIso(),
    sample: false
  };
  await checkins.put(row);
  return {
    ok: true,
    checkin: row,
    message: 'Check-in imehifadhiwa kwenye kifaa hiki. Hakuna mtu aliyearifiwa — hakuna seva iliyounganishwa.'
  };
}

export async function listCheckins(limit = 20) {
  const rows = (await checkins.all()).filter((r) => r.ownerId === selfId());
  return rows.sort(sortBy('at', 'desc')).slice(0, limit);
}

export async function todayCheckin() {
  const today = new Date().toISOString().slice(0, 10);
  return (await listCheckins(50)).find((r) => String(r.at).slice(0, 10) === today) || null;
}

/** consecutive days that end today (or yesterday) and carry at least one check-in */
export async function checkinStreak() {
  const rows = await listCheckins(120);
  const days = new Set(rows.map((r) => String(r.at).slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  // allow the streak to still be "alive" if today has not been done yet
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 120; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* ------------------------------------------------------------------ plans */

export async function createPlan({ title, whenToUse = '', steps = [], templateId = null }) {
  const clean = String(title || '').trim();
  if (clean.length < 3) return { ok: false, message: 'Weka jina la mpango.', field: 'title' };
  const list = (Array.isArray(steps) ? steps : String(steps || '').split('\n'))
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!list.length) return { ok: false, message: 'Ongeza hatua moja angalau.', field: 'steps' };

  const row = {
    id: uid('pln'),
    ownerId: selfId(),
    title: clean.slice(0, 80),
    whenToUse: String(whenToUse || '').trim().slice(0, 200),
    steps: list,
    templateId,
    createdAt: nowIso(),
    sample: false
  };
  await plans.put(row);
  return { ok: true, plan: row, message: 'Mpango umehifadhiwa kwenye kifaa hiki.' };
}

export async function listPlans() {
  const rows = (await plans.all()).filter((r) => r.ownerId === selfId());
  return rows.sort(sortBy('createdAt', 'desc'));
}

export async function removePlan(id) {
  await plans.remove(id);
  return { ok: true, message: 'Mpango umeondolewa kwenye kifaa hiki.' };
}

/* -------------------------------------------------------------- incidents */

/** A personal incident is a safety report ABOUT THE OWNER'S SITUATION, stored in
 *  the same `reports` queue as everything else (subjectType `incident`). */
export async function fileIncident({ kind = 'other', detail = '' }) {
  const text = String(detail || '').trim();
  if (text.length < 10) return { ok: false, message: 'Eleza tukio kwa maneno angalau 10.', field: 'detail' };
  const reason = INCIDENT_KINDS.some((k) => k.id === kind) ? kind : 'other';
  const res = await fileReport({
    subjectType: 'incident',
    subjectId: uid('inc'),
    reason,
    detail: text
  });
  if (!res.ok) return res;
  return {
    ok: true,
    report: res.report,
    message: 'Tukio limehifadhiwa kwenye kifaa hiki. Hakuna msimamizi aliyounganishwa, kwa hiyo hakuna anayelipokea.'
  };
}

export async function listIncidents() {
  const rows = await listReports({ mine: true });
  return rows.filter((r) => r.subjectType === 'incident').sort(sortBy('createdAt', 'desc'));
}

/* ------------------------------------------------------------------ prefs */

export const PREF_DEFAULTS = Object.freeze({
  dailyCheckinReminder: true,
  journeyReminder: true,
  showNumbersOnSosOpen: true,
  shareWithGuardians: false      // cannot take effect without a transport
});

export async function getPrefs() {
  const row = await prefRepo.get('prefs');
  return { ...PREF_DEFAULTS, ...(row?.values || {}) };
}

export async function setPref(key, value) {
  if (!(key in PREF_DEFAULTS)) return { ok: false, message: 'Mpangilio huu haupo.' };
  if (key === 'shareWithGuardians' && value === true && !capabilities().transport) {
    return {
      ok: false,
      message: 'Haiwezi kuwashwa: hakuna seva iliyounganishwa, kwa hiyo mlezi hawezi kupokea taarifa.'
    };
  }
  const current = await getPrefs();
  const next = { ...current, [key]: value };
  await prefRepo.put({ id: 'prefs', values: next, updatedAt: nowIso() });
  return { ok: true, prefs: next, message: 'Mpangilio umehifadhiwa.' };
}

/* ------------------------------------------------------------- SOS records */

export async function recordSosAttempt({ mode = 'personal', kind = 'manual', note = '' } = {}) {
  const row = {
    id: uid('sosr'),
    ownerId: selfId(),
    mode: mode === 'disaster' ? 'disaster' : 'personal',
    kind,
    note: String(note || '').slice(0, 200),
    at: nowIso(),
    delivered: false,
    reason: 'not-connected'
  };
  await sosRepo.put(row);
  return row;
}

export async function listSosAttempts(limit = 10) {
  const rows = (await sosRepo.all()).filter((r) => r.ownerId === selfId());
  return rows.sort(sortBy('at', 'desc')).slice(0, limit);
}

/* ---------------------------------------------------------- capabilities */

/** The one place that answers "can this reach a human?" — read at paint time. */
export function capabilities() {
  const status = transportStatus();
  return {
    transport: !!status.connected,
    channel: status.channel || null,
    bluetooth: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    notifications: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true
  };
}

/* ---------------------------------------------------------------- summary */

export async function safetySummary() {
  const [active, journeyRows, checkinRows, planRows, incidentRows, stats] = await Promise.all([
    activeJourney(),
    listJourneys(),
    listCheckins(60),
    listPlans(),
    listIncidents(),
    guardianStats().catch(() => ({ active: 0, incoming: 0, outgoing: 0, asGuardian: 0 }))
  ]);
  const today = await todayCheckin();
  return {
    guardians: stats,
    journey: active,
    journeyState: journeyStateOf(active),
    journeys: journeyRows.length,
    checkins: checkinRows.length,
    todayCheckin: today,
    streak: await checkinStreak(),
    plans: planRows.length,
    incidents: incidentRows.length
  };
}

/** One merged feed for Shield → Security History. Every row is a real record. */
export async function historyFeed(limit = 40) {
  const [journeyRows, checkinRows, planRows, incidentRows, sosRows, guardianRows] = await Promise.all([
    listJourneys(),
    listCheckins(40),
    listPlans(),
    listIncidents(),
    listSosAttempts(20),
    listGuardiansAll().catch(() => [])
  ]);

  const items = [
    ...sosRows.map((r) => ({
      at: r.at, tone: 'danger', title: r.mode === 'disaster' ? 'Tahadhari ya maafa (haitumwa)' : 'Kitufe cha SOS (hakitumwi)',
      meta: 'Kifaa hiki · hakuna huduma iliyounganishwa'
    })),
    ...incidentRows.map((r) => ({
      at: r.createdAt, tone: 'warn', title: 'Tukio la usalama limeripotiwa', meta: String(r.detail || '').slice(0, 70)
    })),
    ...journeyRows.map((r) => ({
      at: r.startedAt, tone: r.status === 'active' ? 'ok' : 'muted',
      title: `Safari: ${r.label}`,
      meta: `${r.status === 'active' ? 'Inaendelea' : r.status === 'safe' ? 'Ilifungwa salama' : 'Ilighairiwa'} · kifaa hiki`
    })),
    ...checkinRows.map((r) => ({
      at: r.at, tone: r.feeling === 'safe' ? 'ok' : r.feeling === 'uneasy' ? 'warn' : 'danger',
      title: 'Check-in ya kibinafsi', meta: (CHECKIN_FEELINGS.find((f) => f.id === r.feeling)?.label || r.feeling)
    })),
    ...planRows.map((r) => ({ at: r.createdAt, tone: 'muted', title: `Mpango: ${r.title}`, meta: `${r.steps.length} hatua · kifaa hiki` })),
    ...guardianRows.map((g) => ({
      at: g.createdAt || g.invitedAt || nowIso(),
      tone: g.status === 'active' ? 'ok' : 'muted',
      title: `Mlezi: ${g.status === 'active' ? 'amekubali' : g.status === 'invited' ? 'mwaliko umetumwa' : g.status}`,
      meta: 'Walezi · Chat'
    }))
  ];

  return items
    .filter((i) => i.at)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit);
}

/** Reset (used by the "erase local safety data" action in Shield → Settings). */
export async function eraseLocalSafetyData() {
  await Promise.all([journeys.clear(), checkins.clear(), plans.clear(), sosRepo.clear(), prefRepo.clear()]);
  return { ok: true, message: 'Data ya usalama binafsi imeondolewa kwenye kifaa hiki.' };
}

export const PersonalSafety = {
  startJourney, listJourneys, activeJourney, endJourney, removeJourney, journeyStateOf,
  checkIn, listCheckins, todayCheckin, checkinStreak,
  createPlan, listPlans, removePlan,
  fileIncident, listIncidents,
  getPrefs, setPref,
  recordSosAttempt, listSosAttempts,
  capabilities, safetySummary, historyFeed, eraseLocalSafetyData
};
