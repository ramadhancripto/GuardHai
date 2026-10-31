/**
 * GuardHai · features/network/network-view.js
 * The Communication & Support Network shell: five partitions, one stage, one
 * delegated event layer, one public bridge.
 *
 *   Chats · Guardians · Support · Communities · Discover
 *
 * Four of the five partitions are screens of their own; `safety` is reachable
 * from every one of them (block, report, moderation, appeals) and from Discover.
 *
 * The shell owns: the tab strip, the back button, the flash banner, the paint
 * pipeline and the honesty strip ("kwenye kifaa hiki pekee"). Screens only
 * return `{ title, subtitle, body, actions }`.
 */
import { qs } from '../../core/dom.js';
import { toast } from '../../ui/toast.js';
import { bus, EVENTS } from '../../core/bus.js';
import { createLogger } from '../../core/logger.js';
import { currentUser } from '../../services/session.service.js';
import { listProfiles } from '../../services/profile.service.js';
import { watchConnectivity, transportStatus, queuedCount } from '../../services/transport.service.js';
import { unreadAlerts } from '../../services/alerts.service.js';
import { CHAT_SCREENS } from './screens-chats.js';
import { GUARDIAN_SCREENS } from './screens-guardians.js';
import { SUPPORT_SCREENS } from './screens-support.js';
import { COMMUNITY_SCREENS } from './screens-communities.js';
import { DISCOVER_SCREENS } from './screens-discover.js';
import { SAFETY_SCREENS } from './screens-safety.js';
import { dispatch } from './network-actions.js';
import { L, icon, esc, empty, btn, banner } from './network-ui.js';
import { seedDemo, clearDemo, isSeeded } from './network-seed.js';

const log = createLogger('network');

export const PARTITIONS = ['chats', 'guardians', 'support', 'communities', 'discover'];

export const SCREENS = {
  ...CHAT_SCREENS,
  ...GUARDIAN_SCREENS,
  ...SUPPORT_SCREENS,
  ...COMMUNITY_SCREENS,
  ...DISCOVER_SCREENS,
  ...SAFETY_SCREENS
};

const PARTITION_HOME = new Set(['chats.home', 'guardians.home', 'support.home', 'communities.home', 'discover.home']);

const HOME_SCREEN = {
  chats: 'chats.home',
  guardians: 'guardians.home',
  support: 'support.home',
  communities: 'communities.home',
  discover: 'discover.home'
};

export const state = {
  partition: 'chats',
  screen: 'chats.home',
  params: {},
  filter: {},
  notice: null,
  error: null,
  busy: false,
  ready: false
};

let profilesCache = {};
let wired = false;
let paintToken = 0;          // last-write-wins guard: stale paints are dropped

/* ------------------------------------------------------------------ helpers */
const titleOf = () => {
  const meta = SCREENS[state.screen];
  return meta?.partition || state.partition;
};

export function flash(kind, message) {
  state.notice = { kind, message, at: Date.now() };
  paint();
}

export function fail(message) {
  state.error = { message, at: Date.now() };
  paint();
}

export async function loadProfiles() {
  profilesCache = {};
  try {
    for (const p of await listProfiles()) profilesCache[p.id] = p;
  } catch (err) {
    log.warn('could not load profiles', err);
  }
  return profilesCache;
}

export const profiles = () => profilesCache;

/* ---------------------------------------------------------------- routing */
export async function open(screen, params = {}) {
  if (!SCREENS[screen]) {
    state.error = { message: `Skrini "${screen}" haipo.`, at: Date.now() };
    screen = HOME_SCREEN[state.partition] || 'chats.home';
  }
  state.screen = screen;
  state.params = params;
  state.error = null;
  state.notice = null;
  const meta = SCREENS[screen];
  if (meta?.partition) state.partition = meta.partition;
  await paint();
  focusStage();
}

export async function select(partition) {
  if (!PARTITIONS.includes(partition)) return;
  state.partition = partition;
  state.screen = HOME_SCREEN[partition];
  state.params = {};
  state.error = null;
  state.notice = null;
  await paint();
  focusStage();
}

export async function back() {
  const meta = SCREENS[state.screen];
  if (meta?.back) return open(meta.back, meta.backParams || {});
  return select(state.partition);
}

function focusStage() {
  const stage = qs('#ghNetStage');
  if (!stage) return;
  stage.scrollTop = 0;
  const heading = stage.querySelector('[data-autofocus], h2, h3');
  if (heading && typeof heading.focus === 'function') {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

/* ------------------------------------------------------------------ paint */
export async function paint() {
  const stage = qs('#ghNetStage');
  if (!stage) return;
  const token = ++paintToken;      // a newer paint invalidates this one
  stage.setAttribute('aria-busy', 'true');
  state.busy = true;
  const target = state.screen;
  const screen = SCREENS[target] || SCREENS['chats.home'];
  try {
    await loadProfiles();
    const result = await screen({
      state,
      params: state.params,
      profiles: profilesCache,
      me: currentUser()
    });
    if (token !== paintToken) return;      // something newer started: drop this frame
    stage.innerHTML = renderScreen(result);
    paintChrome(result);
    state.ready = true;
  } catch (err) {
    if (token !== paintToken) return;
    log.error('paint failed', target, err);
    stage.innerHTML = empty({
      iconId: 'i-alert-triangle',
      title: L('Sehemu hii haikupakia', 'This screen did not load'),
      body: String(err?.message || err),
      action: btn(L('Jaribu tena', 'Try again'), { act: 'retry', tone: 'primary' })
    });
  } finally {
    if (token === paintToken) {
      state.busy = false;
      stage.removeAttribute('aria-busy');
    }
  }
}

function renderScreen(result) {
  if (!result) return '';
  if (typeof result === 'string') return result;
  const notice = state.notice && Date.now() - state.notice.at < 12000
    ? banner(state.notice.message, state.notice.kind || 'info')
    : '';
  const error = state.error ? banner(state.error.message, 'danger') : '';
  return `<div class="gh-net-screen">
    ${notice}${error}
    ${result.header ? result.header : ''}
    ${result.body || ''}
  </div>`;
}

function paintChrome(result) {
  const title = qs('#ghNetTitle');
  const sub = qs('#ghNetSub');
  const backBtn = qs('#ghNetBack');

  // A conversation (or any sub-screen) is a different place: the partition
  // strip belongs to the inbox, not to the place you opened from it.
  const page = qs('#commPage');
  const isHome = PARTITION_HOME.has(state.screen);
  if (page) page.classList.toggle('is-sub', !isHome);
  if (title) title.textContent = result?.title || L('Mawasiliano', 'Communication');
  if (sub) sub.textContent = result?.subtitle || '';
  // the partitions are top-level: only sub-screens show a back arrow
  if (backBtn) {
    const showBack = !!SCREENS[state.screen]?.back && !PARTITION_HOME.has(state.screen);
    backBtn.hidden = !showBack;
    backBtn.setAttribute('aria-hidden', showBack ? 'false' : 'true');
  }
  const actions = qs('#ghNetActions');
  if (actions) actions.innerHTML = result?.actions || '';

  paintBell();

  const strip = qs('#ghNetStrip');
  if (strip) {
    const status = transportStatus();
    // One fact only: where this data lives. The server truth is stated by each
    // screen in its own line, so the head never repeats it.
    strip.innerHTML = `<span class="gh-net-strip-fact">${icon('i-smartphone')}${esc(L('Kwenye kifaa hiki pekee', 'On this device only'))}</span>`;
  }

  const tabStrip = qs('#ghNetTabs');
  document.querySelectorAll('#ghNetTabs [data-act="partition"]').forEach((tab) => {
    const on = tab.dataset.key === state.partition;
    tab.classList.toggle('is-active', on);
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
    if (on && tabStrip) {
      // centre the active tab inside the strip only — never scroll the page
      const target = tab.offsetLeft - (tabStrip.clientWidth - tab.offsetWidth) / 2;
      tabStrip.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  });
}

async function paintBell() {
  const dot = qs('#ghNetBellDot');
  if (!dot) return;
  try {
    const unread = await unreadAlerts();
    dot.hidden = !unread.length;
    dot.textContent = String(unread.length);
    dot.setAttribute('aria-label', `${unread.length} taarifa`);
  } catch (err) {
    dot.hidden = true;
  }
}

/* ------------------------------------------------------------------- init */
export function initNetwork() {
  if (wired) return window.GHNetwork;
  const root = qs('#commPage');
  if (!root) return null;

  root.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-nx="act"]');
    if (!trigger || trigger.disabled) return;
    const act = trigger.dataset.act;
    if (!act) return;
    if (trigger.tagName === 'BUTTON' && trigger.type === 'submit') return;
    event.preventDefault();
    await runAction(act, { ...trigger.dataset, el: trigger });
  });

  root.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-nx-form]');
    if (!form) return;
    event.preventDefault();
    await runAction(form.dataset.nxForm, { form, data: readForm(form) });
  });

  root.addEventListener('change', async (event) => {
    const input = event.target.closest('[data-nx-change]');
    if (!input) return;
    await runAction(input.dataset.nxChange, { ...input.dataset, value: input.value, checked: input.checked });
  });

  watchConnectivity(() => paint());
  ['CONVERSATION_CHANGED', 'GUARDIAN_CHANGED', 'SUPPORT_CHANGED', 'COMMUNITY_CHANGED', 'SAFETY_CHANGED'].forEach((key) => {
    const event = EVENTS[key];
    if (event) bus.on(event, () => { if (isVisible()) paint(); });
  });
  bus.on(EVENTS.ALERT_CREATED, () => { paintBell(); if (isVisible()) paint(); });
  document.addEventListener('guardhai:lang', () => { if (isVisible()) paint(); });

  wired = true;
  window.GHNetwork = buildBridge();
  log.info('network ready', Object.keys(SCREENS).length, 'screens');
  return window.GHNetwork;
}

/** paints once when the tab is first opened; keeps state afterwards */
export async function enter(screen = null) {
  initNetwork();
  // Tapping Chat in the bottom bar lands on the inbox of the partition you
  // were in — not inside the last conversation you happened to read.
  if (screen) { await open(screen, state.params); return; }
  const atHome = PARTITION_HOME.has(state.screen);
  if (!state.ready || !atHome) await open(HOME_SCREEN[state.partition] || 'chats.home', {});
  else await paint();
}

function isVisible() {
  const page = qs('#commPage');
  return !!page && page.classList.contains('active');
}

function readForm(form) {
  const data = {};
  const fd = new FormData(form);
  for (const [key, value] of fd.entries()) {
    if (key.endsWith('[]')) {
      const k = key.slice(0, -2);
      (data[k] ||= []).push(value);
    } else if (key in data) {
      data[key] = [].concat(data[key], value);
    } else {
      data[key] = value;
    }
  }
  form.querySelectorAll('input[type="checkbox"][name]').forEach((cb) => {
    if (!(cb.name in data)) data[cb.name] = false;
  });
  return data;
}

async function runAction(act, payload) {
  try {
    const result = await dispatch(act, payload, { state, open, select, back, paint, flash });
    if (result?.screen) {
      await open(result.screen, result.params || {});
      if (result.message) state.notice = { kind: result.kind || 'info', message: result.message, at: Date.now() };
      return;
    }
    if (result?.partition) return select(result.partition);
    if (result?.repaint !== false) await paint();
    if (result?.message) state.notice = { kind: result.kind || 'info', message: result.message, at: Date.now() };
    if (result?.toast) toast(result.toast);
    if (result?.message) await paint();
  } catch (err) {
    log.error('action failed', act, err);
    state.error = { message: L('Kitendo hakikufanikiwa. Jaribu tena.', 'That action did not work. Try again.'), at: Date.now() };
    await paint();
  }
}

/* ----------------------------------------------------------------- bridge */
function buildBridge() {
  return {
    partitions: PARTITIONS,
    screens: Object.keys(SCREENS),
    state,
    init: initNetwork,
    enter,
    open,
    select,
    back,
    paint,
    seed: async () => { await seedDemo(); await paint(); return 'seeded'; },
    clear: async () => { await clearDemo(); await paint(); return 'cleared'; },
    isSeeded,
    queuedCount,
    profiles: () => profilesCache
  };
}

export const NetworkUI = { init: initNetwork, enter, open, select, back, paint, state, PARTITIONS };
