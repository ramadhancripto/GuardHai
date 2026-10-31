/**
 * GuardHai · features/storage/storage-view.js
 * The Storage Center shell: one render pipeline, one delegated event layer, one
 * public bridge. Screens only return `{ title, subtitle, crumbs, body }`.
 *
 * Layout of the feature (each file stays under the growth limit):
 *   storage-ui.js            markup primitives (GDS namespaced `stx-*`)
 *   screens-home.js          dashboard, category, subcategory, search, filters
 *   screens-evidence.js      Evidence Center, evidence kinds, cases, collection
 *   screens-records.js       record sheet, add/case/share forms, device usage
 *   storage-actions.js       the single action dispatcher
 *   storage-state.js         where you are and what you are filtering by
 *   ../../services/storage.service.js   the only door to data
 */
import { qs } from '../../core/dom.js';
import { toast } from '../../ui/toast.js';
import { createLogger } from '../../core/logger.js';
import { L, esc, icon, stateBox, crumbs as crumbsHtml, skeleton, btn } from './storage-ui.js';
import * as home from './screens-home.js';
import * as evidence from './screens-evidence.js';
import * as records from './screens-records.js';
import { dispatch } from './storage-actions.js';
import { state, readStoredView, resetFilters } from './storage-state.js';
import {
  allItems, stats, subscribe, seedSamples, clearSamples, syncHealthPointers
} from '../../services/storage.service.js';
import { records as healthRecords } from '../health/health-record-store.js';
import { healthSubFor, fileTypeOf, subcategoriesOf } from '../../domain/storage.js';

const log = createLogger('storage');

export const SCREENS = {
  'storage.home': home.home,
  'storage.all': home.all,
  'storage.category': home.category,
  'storage.sub': home.sub,
  'storage.search': home.search,
  'storage.filters': home.filters,
  'storage.evidence': evidence.evidenceHome,
  'storage.evidence.type': evidence.evidenceType,
  'storage.cases': evidence.cases,
  'storage.case': evidence.caseDetail,
  'storage.item': records.item,
  'storage.add': records.add,
  'storage.case.new': records.caseNew,
  'storage.share': records.share,
  'storage.usage': records.usage
};

let wired = false;
let paintToken = 0;

/* ------------------------------------------------------------------ routing */
export async function open(screen, params = {}) {
  if (!SCREENS[screen]) {
    log.warn('unknown screen', screen);
    screen = 'storage.home';
  }
  state.screen = screen;
  state.params = params || {};
  state.selectedId = params.id || params.caseId || null;
  await paint();
  focusStage();
}

export async function back() {
  if (state.screen === 'storage.home') {
    window.HomeUI?.go?.('home');
    return;
  }
  if (state.screen === 'storage.category') return open('storage.home');
  if (state.screen === 'storage.item') {
    const item = await allItems().then((list) => list.find((i) => i.id === state.params.id));
    if (item) return open('storage.category', { category: item.category });
    return open('storage.home');
  }
  if (state.screen === 'storage.evidence.type') return open('storage.evidence');
  if (state.screen === 'storage.case') return open('storage.cases');
  if (['storage.add', 'storage.case.new', 'storage.share', 'storage.sub', 'storage.all',
    'storage.search', 'storage.filters', 'storage.usage', 'storage.cases', 'storage.evidence'].includes(state.screen)) {
    return open('storage.home');
  }
  return open('storage.home');
}

function focusStage() {
  const stage = qs('#ghStorageStage');
  if (!stage) return;
  document.getElementById('ghStoragePage')?.scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0, behavior: 'auto' });
  const heading = stage.querySelector('h2, h1, [data-autofocus]');
  if (heading && typeof heading.focus === 'function') {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

/* -------------------------------------------------------------------- paint */
export async function paint() {
  const stage = qs('#ghStorageStage');
  if (!stage) return;
  const token = ++paintToken;
  state.busy = true;
  stage.setAttribute('aria-busy', 'true');

  try {
    const [items, summary] = await Promise.all([allItems(), stats()]);
    const screen = SCREENS[state.screen] || SCREENS['storage.home'];
    const result = await screen({ params: state.params, items, summary, state });
    if (token !== paintToken) return;

    stage.innerHTML = `<div class="stx-screen">${result?.body || ''}</div>`;
    paintHead(result);
    state.ready = true;
    state.error = null;
  } catch (err) {
    if (token !== paintToken) return;
    log.error('paint failed', state.screen, err);
    state.error = err;
    stage.innerHTML = stateBox({
      kind: 'error',
      iconId: 'i-alert-triangle',
      title: L('Sehemu hii haikupakia', 'This screen did not load'),
      note: String(err?.message || err).slice(0, 180),
      action: `${btn(L('Jaribu tena', 'Try again'), { act: 'nav.home', tone: 'primary' })}`
    });
  } finally {
    if (token === paintToken) {
      state.busy = false;
      stage.removeAttribute('aria-busy');
    }
  }
}

function paintHead(result) {
  const title = qs('#ghStorageTitle');
  const sub = qs('#ghStorageSub');
  const crumbHost = qs('#ghStorageCrumbs');
  const backBtn = qs('#ghStorageBack');
  if (title) title.textContent = result?.title || L('Hifadhi', 'Storage');
  if (sub) sub.textContent = result?.subtitle || '';
  if (crumbHost) crumbHost.innerHTML = result?.crumbs?.length > 1 ? crumbsHtml(result.crumbs) : '';
  if (backBtn) backBtn.hidden = state.screen === 'storage.home';
}

/* --------------------------------------------------------------------- init */
export function initStorage() {
  if (wired) return window.GHStorage;
  const page = qs('#storagePage');
  if (!page) return null;

  readStoredView();

  page.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-stx]');
    if (!trigger || trigger.disabled) return;
    const act = trigger.dataset.stx;
    if (!act) return;
    event.preventDefault();
    await runAction(act, { ...trigger.dataset, el: trigger });
  });

  page.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-stx-form]');
    if (!form) return;
    event.preventDefault();
    await runAction(form.dataset.stxForm, { form, data: readForm(form) });
  });

  page.addEventListener('change', async (event) => {
    // Category → subcategory is a live dependency inside the add form. Rebuild
    // the second list in place so a title already typed is never thrown away.
    const catSelect = event.target.closest('[data-stx-select="form.category"]');
    if (catSelect) {
      const sub = catSelect.closest('form')?.querySelector('[data-sub-for="category"]');
      if (sub) {
        const subs = subcategoriesOf(catSelect.value);
        sub.innerHTML = subs.map((x) => `<option value="${esc(x.id)}">${esc(L(x.sw, x.en))}</option>`).join('');
      }
      return;
    }
    const select = event.target.closest('[data-stx-select]');
    if (select) {
      await runAction(select.dataset.stxSelect, {
        el: select,
        value: select.value,
        data: { itemId: select.parentElement?.querySelector('[name="itemId"]')?.value || state.params.id }
      });
      return;
    }
    const input = event.target.closest('[data-stx-change]');
    if (!input) return;
    await runAction(input.dataset.stxChange, { ...input.dataset, el: input, value: input.value });
  });

  subscribe(() => { if (isVisible() && !state.busy) paint(); });
  syncHealth().catch((err) => log.warn('health pointer sync failed', err?.message));
  document.addEventListener('guardhai:lang', () => { if (isVisible()) paint(); });

  wired = true;
  window.GHStorage = buildBridge();
  log.info('storage ready', Object.keys(SCREENS).length, 'screens');
  return window.GHStorage;
}

/**
 * Called by whoever switches to #storagePage. Pass a screen to land on it (the
 * Storage sheet lands on `storage.usage`); pass nothing to resume where the
 * reader left off.
 */
/**
 * The Health module owns its records. The Storage Center only keeps authorised
 * pointers (`healthRef`) at them, rebuilt from the Health store on every entry
 * and removed when the source record is gone — never a second copy of a file.
 */
export async function syncHealth() {
  const rows = healthRecords().map((r) => ({
    recordId: r.id,
    title: r.title,
    date: r.date,
    facility: r.facility,
    summary: r.summary,
    subcategory: healthSubFor(r.category),
    fileType: r.file?.name?.toLowerCase().endsWith('.pdf') ? 'pdf' : (r.file ? fileTypeOf({ mime: r.file.type }) : 'document'),
    size: r.file?.size || 0
  }));
  return syncHealthPointers(rows);
}

export async function enter(screen = null) {
  initStorage();
  await syncHealth().catch(() => {});
  if (screen) {
    if (!state.ready || screen !== state.screen) return open(screen, {});
    return paint();
  }
  if (!state.ready) return open(state.screen, state.params);
  return paint();
}

function isVisible() {
  const page = qs('#storagePage');
  return !!page && page.classList.contains('active');
}

/* ------------------------------------------------------------------ events */
function readForm(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value === 'string' || typeof value === 'number') data[key] = value;
  });
  return data;
}

async function runAction(act, payload) {
  const result = await dispatch(act, payload);
  if (result?.back) {
    await back();
  } else if (result?.screen) {
    await open(result.screen, result.params || {});
  } else {
    await paint();
  }
  if (result?.toast) toast(result.toast);
}

/* ------------------------------------------------------------------ bridge */
function buildBridge() {
  return {
    screens: Object.keys(SCREENS),
    state,
    init: initStorage,
    enter,
    open,
    back,
    paint,
    resetFilters,
    syncHealth,
    seed: async () => { await seedSamples(); await paint(); return 'seeded'; },
    clear: async () => { await clearSamples(); await paint(); return 'cleared'; },
    item: (id) => allItems().then((list) => list.find((i) => i.id === id) || null)
  };
}

export const StorageUI = { init: initStorage, enter, open, back, paint, state };
export const _internal = { esc, icon, skeleton };
