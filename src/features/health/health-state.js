/**
 * GuardHai · features/health/health-state.js
 * The versioned device-local store: persistence, subscriptions, profiles, audit.
 *
 * Everything lives in one localStorage key (`guardhai_health_store_v1`). Nothing
 * is sent anywhere; `sent`, `delivered`, `verified`, `reminded` and `invited`
 * are never set to true by any module in this folder.
 */

import { applyDemoSeed } from './health-seed.js';

export const STORE_KEY = 'guardhai_health_store_v1';
export const STORE_VERSION = 1;

/* ============================================================== utilities */

export const now = () => new Date().toISOString();
export const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
export const clone = (v) => JSON.parse(JSON.stringify(v));
export const sameDay = (iso, day) => iso && new Date(iso).toISOString().slice(0, 10) === day;
export const todayKey = () => new Date().toISOString().slice(0, 10);

/** Localised label pair helper — the view resolves the right language. */

/* ================================================================== state */

const blankState = () => ({
  version: STORE_VERSION,
  createdAt: now(),
  mode: 'empty',            // 'empty' | 'demo'
  activeProfile: 'p_self',
  profiles: [{ id: 'p_self', relation: 'self', label: '', initials: '', demo: false }],
  medical: {},              // profileId -> Medical ID object
  contacts: [],             // emergency contacts (per profile)
  records: [],
  meds: [],
  doses: [],
  appointments: [],
  cases: [],
  meetings: [],
  memberships: [],
  communityPosts: [],
  referrals: [],
  blood: [],                // user reports only; catalog rows are separate
  emergency: [],            // local emergency drafts / status records
  tokens: [],               // QR access tokens (revocable, no health data inside)
  audit: [],
  notifications: [],
  prefs: {
    medReminders: false, apptUpdates: true, proInvites: true, digest: false,
    shareOnLockScreen: false, allowQr: true, language: 'sw', reduceMotion: false, largeText: false
  },
  pro: { name: '', specialty: 0, facility: '', qualification: '', licence: '',
         documents: [], verification: 'unsubmitted', submittedAt: null, note: '' }
});

let state = blankState();
let loaded = false;
const listeners = new Set();

const hasStorage = () => {
  try { return typeof localStorage !== 'undefined'; } catch (_) { return false; }
};

function load() {
  if (loaded) return state;
  loaded = true;
  if (!hasStorage()) return state;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return state;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORE_VERSION) return state;
    state = Object.assign(blankState(), parsed);
  } catch (_) {
    state = blankState();
  }
  return state;
}

function persist() {
  if (!hasStorage()) return;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* quota / private mode: stay in memory */ }
}

export function commit(mutator) {
  load();
  mutator(state);
  persist();
  listeners.forEach((fn) => { try { fn(state); } catch (_) { /* listener errors must not break the store */ } });
  return state;
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getState() { return load(); }
export function isDemo() { return getState().mode === 'demo'; }
export function isEmpty() { return getState().mode === 'empty'; }

export function audit(event, detail = '') {
  commit((s) => {
    s.audit.unshift({ id: uid('au'), at: now(), event, detail });
    s.audit = s.audit.slice(0, 60);
  });
}

/* ================================================================ profiles */

export function profiles() { return getState().profiles; }
export function activeProfile() {
  const s = getState();
  return s.profiles.find((p) => p.id === s.activeProfile)
    || s.profiles[0]
    || { id: 'p_self', relation: 'self', label: '', initials: '', demo: false };
}
export function selectProfile(id) {
  if (!profiles().some((p) => p.id === id)) return false;
  commit((s) => { s.activeProfile = id; });
  return true;
}
export function addProfile({ label, relation = 'dependent' }) {
  const clean = String(label || '').trim();
  if (!clean) return { ok: false, error: 'name-required' };
  const p = { id: uid('p'), relation, label: clean, initials: clean.slice(0, 2).toUpperCase(), demo: false };
  commit((s) => { s.profiles.push(p); s.activeProfile = p.id; });
  return { ok: true, profile: p };
}
export function renameProfile(id, label) {
  const clean = String(label || '').trim();
  if (!clean) return { ok: false, error: 'name-required' };
  commit((s) => {
    const p = s.profiles.find((x) => x.id === id);
    if (p) { p.label = clean; p.initials = clean.slice(0, 2).toUpperCase(); }
  });
  return { ok: true };
}

/* ================================================================ seed / reset */

/** Explicitly-loaded synthetic sample so every screen can be walked through. */

export function seedDemo() {
  commit((s) => {
    applyDemoSeed(s, now());
    s.audit.unshift({ id: uid('au'), at: now(), event: 'demo.seeded', detail: 'Sampuli za majaribio zimewekwa kwenye kifaa hiki.' });
    s.audit = s.audit.slice(0, 60);
  });
  return getState();
}

/** Removes only rows that were seeded as samples; the person's own data stays. */
export function clearSamples() {
  commit((st) => {
    const strip = (arr) => (Array.isArray(arr) ? arr.filter((x) => !x.synthetic) : arr);
    st.profiles = st.profiles.filter((x) => !x.demo);
    if (!st.profiles.some((x) => x.id === 'p_self')) {
      st.profiles.unshift({ id: 'p_self', relation: 'self', label: '', initials: '', demo: false });
    }
    if (!st.profiles.some((x) => x.id === st.activeProfile)) st.activeProfile = 'p_self';
    st.medical = Object.fromEntries(Object.entries(st.medical).filter(([, m]) => !m.synthetic));
    st.records = strip(st.records);
    st.meds = strip(st.meds);
    const keep = new Set(st.meds.map((m) => m.id));
    st.doses = st.doses.filter((d) => keep.has(d.medId));
    st.contacts = strip(st.contacts);
    st.appointments = strip(st.appointments);
    st.cases = strip(st.cases);
    st.meetings = strip(st.meetings);
    st.communityPosts = strip(st.communityPosts);
    st.referrals = strip(st.referrals);
    st.blood = strip(st.blood);
    st.emergency = strip(st.emergency);
    st.tokens = strip(st.tokens);
    st.notifications = st.notifications.filter((n) => !n.synthetic);
    st.mode = 'empty';
    st.audit.unshift({ id: uid('au'), at: now(), event: 'demo.cleared', detail: 'Sampuli zimeondolewa kwenye kifaa hiki.' });
    st.audit = st.audit.slice(0, 60);
  });
  return getState();
}

export function clearAll() {
  state = blankState();
  loaded = true;
  persist();
  listeners.forEach((fn) => { try { fn(state); } catch (_) { } });
  return state;
}
