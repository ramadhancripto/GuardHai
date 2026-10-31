/**
 * GuardHai · features/health/health-view.js
 * The Health shell: one render pipeline for the six partitions and every
 * sub-screen, one delegated event layer, and the public API.
 *
 * Layout of the feature (each file stays under the 600-line growth limit):
 *   health-ui.js              copy, escaping, HTML primitives, the `view` object
 *   health-panels.js          the six partitions
 *   health-screens-*.js       sub-screens grouped by domain
 *   health-routes.js          the screen registry
 *   health-actions.js         the single action/form dispatcher
 *   health-store*.js          the device-local repository (no network at all)
 *
 * What this file never does: call a server, claim a delivery, verify a person,
 * or hide the fact that the data lives only in this browser.
 */

import { L, esc, view, resetFilters, flashBox, screenHead, btn, empty, icon } from './health-ui.js';
import { panelFor, SCREENS, PARTITIONS, tabOf } from './health-routes.js';
import { runAction, runInput, runChange, submitForm, bindRepaint, ACTION_NAMES } from './health-actions.js';
import { Store } from './health-store.js';

const TAB_KEY = 'guardhai_health_tab';
let wired = false;

/* ------------------------------------------------------------------ helpers */

const $ = (id) => document.getElementById(id);

const panelHost = () => $('ghHealthPanels');

function errorCard(err) {
  return `<div class="gh-health-empty is-error" role="alert">
    <span class="gh-health-empty-ico">${icon('i-alert-circle')}</span>
    <b>${L('Sehemu hii haikuweza kuonyeshwa', 'This part could not be displayed')}</b>
    <p>${L('Hitilafu imetokea kwenye kifaa hiki. Data yako haijabadilishwa. Jaribu tena au rudi nyumbani.', 'Something failed on this device. Your data is unchanged. Try again or go back home.')}</p>
    ${msgOf(err)}
    <div class="gh-health-actions">
      <button type="button" class="gh-health-btn is-primary" data-hx="open" data-screen="medical-profile">${L('Jaribu tena', 'Try again')}</button>
      <button type="button" class="gh-health-btn" data-hx="tab" data-tab="overview">${L('Nyumbani', 'Home')}</button>
    </div>
  </div>`;
}

const msgOf = (err) => (err && err.message
  ? `<p class="gh-health-hint gh-health-mono">${esc(String(err.message).slice(0, 160))}</p>` : '');

/* ------------------------------------------------------------------- paint */

export function paint(opts = {}) {
  const page = $('healthPage');
  const host = panelHost();
  if (!page || !host) return;

  const partition = view.screen ? tabOf(view.screen) : view.partition;
  const intro = page.querySelector('.gh-health-intro');
  if (intro) intro.hidden = Boolean(view.screen) || view.partition !== 'overview';

  let html = '';
  try {
    if (view.screen) {
      const meta = SCREENS[view.screen];
      if (!meta) throw new Error(`Unknown screen: ${view.screen}`);
      html = screenHead(meta.title(), meta.sub())
        + `<div class="gh-health-screen" data-health-screen="${esc(view.screen)}">${meta.render(view.param)}</div>`;
    } else {
      html = panelFor(view.partition)();
    }
  } catch (err) {
    html = errorCard(err);
    if (window.console && console.error) console.error('[health] render failed', err);
  }

  host.dataset.healthScreen = view.screen || '';
  host.dataset.healthPartition = view.screen ? partition : view.partition;
  host.innerHTML = html;
  host.setAttribute('aria-busy', 'false');
  host.setAttribute('aria-live', 'polite');

  /* Tabs: one active tab, sensible roving tabindex, parent stays highlighted. */
  page.querySelectorAll('[data-health-tab]').forEach((tab) => {
    const isActive = tab.dataset.healthTab === partition;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.tabIndex = isActive ? 0 : -1;
    if (isActive && opts.revealTab !== false && typeof tab.scrollIntoView === 'function') {
      tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  });

  page.querySelectorAll('[data-health-panel]').forEach((section) => {
    const isTarget = section.dataset.healthPanel === partition;
    section.hidden = !isTarget;
  });

  syncChrome(page);

  if (opts.focus) {
    const el = $(opts.focus);
    if (el) {
      el.focus();
      if (opts.caret === 'end' && typeof el.setSelectionRange === 'function') {
        try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) { /* not a text input */ }
      }
    }
  }

  if (opts.scroll) {
    const target = page.querySelector('.gh-health-screen-title') || page;
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'start', behavior: Store.prefs().reduceMotion ? 'auto' : 'smooth' });
    }
  }
}

/** Header state: profile name, unread count, sample banner, accessibility. */
function syncChrome(page) {
  const profile = Store.activeProfile();
  const nameEl = $('ghHealthProfileName');
  if (nameEl) nameEl.textContent = profile.label || L('Wasifu wangu', 'My profile');

  const unread = Store.notifications().filter((n) => !n.read).length;
  const dot = $('ghHealthNotifDot');
  if (dot) {
    dot.hidden = unread === 0;
    dot.textContent = unread > 9 ? '9+' : String(unread);
  }
  const notifBtn = $('ghHealthNotifBtn');
  if (notifBtn) {
    notifBtn.setAttribute('aria-label',
      unread ? L(`Taarifa, ${unread} hazijasomwa`, `Notifications, ${unread} unread`) : L('Taarifa', 'Notifications'));
  }

  const banner = $('ghHealthDemoBanner');
  if (banner) banner.hidden = !Store.isDemo();

  const prefs = Store.prefs();
  page.classList.toggle('is-large-text', Boolean(prefs.largeText));
  page.classList.toggle('gh-health-no-motion', Boolean(prefs.reduceMotion));
}

/* -------------------------------------------------------------- navigation */

export function selectPartition(partition) {
  if (!PARTITIONS.includes(partition)) return;
  view.screen = null;
  view.param = null;
  view.errors = {};
  view.partition = partition;
  resetFilters();
  try { localStorage.setItem(TAB_KEY, partition); } catch (_) { /* private mode */ }
  paint({ scroll: true });
}

export const openScreen = (id, param = null) => {
  view.screen = id;
  view.param = param;
  view.errors = {};
  paint({ scroll: true });
};

/* ---------------------------------------------------------------- wiring */

function onTabKeydown(event) {
  const tab = event.target.closest('[data-health-tab]');
  if (!tab) return;
  const tabs = Array.from(document.querySelectorAll('[data-health-tab]'));
  const index = tabs.indexOf(tab);
  let next = null;
  if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
  if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
  if (event.key === 'Home') next = tabs[0];
  if (event.key === 'End') next = tabs[tabs.length - 1];
  if (!next) return;
  event.preventDefault();
  next.focus();
  selectPartition(next.dataset.healthTab);
}

function onClick(event) {
  const profileBtn = event.target.closest('[data-profile]');
  if (profileBtn && profileBtn.closest('#ghSheet')) {
    event.preventDefault();
    Store.selectProfile(profileBtn.dataset.profile);
    closeSheetSafe();
    paint();
    return;
  }

  const tab = event.target.closest('[data-health-tab]');
  if (tab && tab.closest('#healthPage')) {
    event.preventDefault();
    selectPartition(tab.dataset.healthTab);
    return;
  }

  const el = event.target.closest('[data-hx]');
  if (!el) return;
  if (!el.closest('#healthPage') && !el.closest('#ghSheet')) return;
  if (el.tagName === 'BUTTON' && el.type === 'submit') return;
  event.preventDefault();
  runAction(el.dataset.hx, el);
}

function onSubmit(event) {
  const form = event.target.closest('[data-hx-form]');
  if (!form) return;
  event.preventDefault();
  submitForm(form);
}

function onInput(event) {
  const el = event.target.closest('[data-hx-input]');
  if (!el) return;
  runInput(el);
}

function onChange(event) {
  const el = event.target;
  if (el.dataset && (el.dataset.hxChange || el.dataset.hxPref)) runChange(el);
}

async function closeSheetSafe() {
  try {
    const { closeSheet } = await import('../../ui/sheet.js');
    closeSheet();
  } catch (_) { /* sheet not present */ }
}

async function openProfileSheet() {
  const { openSheet } = await import('../../ui/sheet.js');
  const profiles = Store.profiles();
  const body = profiles.map((p) => `
    <button type="button" class="gh-health-row gh-health-profile-opt" data-profile="${esc(p.id)}">
      ${icon('i-user')}
      <span class="gh-health-rowcopy">
        <b>${esc(p.label || L('Wasifu wangu', 'My profile'))}</b>
        <span>${esc(p.relation === 'self' ? L('Wewe', 'You') : L('Mtu unayemsimamia', 'Someone you look after'))}${p.demo ? ' · ' + L('Sampuli', 'Sample') : ''}</span>
      </span>
      ${p.id === Store.activeProfile().id ? '<span class="gh-health-chip is-ok">' + L('Anatumika', 'Active') + '</span>' : ''}
    </button>`).join('');

  openSheet(L('Wasifu wa afya', 'Health profiles'), `
    <p class="gh-health-hint">${L('Kila wasifu unabaki kwenye kifaa hiki. Hakuna akaunti, hakuna kusawazisha.', 'Every profile stays on this device. No account, no sync.')}</p>
    <div class="gh-health-rows">${body}</div>
    <form class="gh-health-form" data-hx-form="profile-add">
      <div class="gh-health-field">
        <label class="gh-health-label" for="ghProfileNewName">${L('Ongeza mtu unayemsimamia', 'Add someone you look after')}</label>
        <input class="gh-health-input" id="ghProfileNewName" name="label" placeholder="${esc(L('Mfano: Amina', 'For example: Amina'))}" autocomplete="off">
        <span class="gh-health-hint">${L('Hakuna mwaliko au uthibitisho unaohitajika.', 'No invitation or verification is needed.')}</span>
      </div>
      <div class="gh-health-form-actions">
        <button type="button" class="gh-health-btn is-primary" data-hx="profile-add">${L('Ongeza', 'Add')}</button>
      </div>
    </form>`);
}

function onSheetAction(event) {
  const el = event.target.closest('[data-hx="profile-add"]');
  if (!el) return;
  event.preventDefault();
  const input = $('ghProfileNewName');
  const label = input ? input.value.trim() : '';
  if (!label) { if (input) input.focus(); return; }
  Store.addProfile({ label });
  closeSheetSafe();
  paint();
  view.flash = { text: L('Wasifu umeongezwa kwenye kifaa hiki.', 'Profile added on this device.'), tone: 'ok' };
  paint();
}

/* -------------------------------------------------------------------- init */

export function initHealth() {
  const page = $('healthPage');
  if (!page) return;

  if (!wired) {
    wired = true;
    bindRepaint(paint);
    document.addEventListener('click', onClick);
    document.addEventListener('click', onSheetAction);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    page.addEventListener('keydown', onTabKeydown);

    const profileBtn = $('ghHealthProfileBtn');
    if (profileBtn) profileBtn.addEventListener('click', openProfileSheet);
    const avatar = $('ghHealthAvatar');
    if (avatar) avatar.addEventListener('click', openProfileSheet);
    const notifBtn = $('ghHealthNotifBtn');
    if (notifBtn) notifBtn.addEventListener('click', () => openScreen('notifications'));

    document.addEventListener('guardhai:lang', () => paint());
    Store.subscribe(() => { /* store changes always repaint from the caller */ });

    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (saved && PARTITIONS.includes(saved)) view.partition = saved;
    } catch (_) { /* private mode */ }
  }

  paint();
}

/** Safe fallback used when a partition fails to render at all. */
export function renderError(err) {
  const host = panelHost();
  if (host) host.innerHTML = errorCard(err);
}

/* ------------------------------------------------------------- public API */

function expose() {
  window.HealthUI = {
    init: initHealth,
    paint,
    open: openScreen,
    select: selectPartition,
    selectPartition,
    store: Store,
    selectProfile: (id) => { Store.selectProfile(id); paint(); },
    seed: () => { Store.seedDemo(); paint(); },
    clear: () => { Store.clearAll(); paint(); },
    screens: Object.keys(SCREENS),
    actions: ACTION_NAMES,
    partitions: PARTITIONS.slice(),
    route: () => ({ screen: view.screen, param: view.param, partition: view.partition })
  };
}

expose();

export default { initHealth, paint, openScreen, selectPartition, renderError };
