/**
 * GuardHai · features/home/home-controller.js
 * Home screen controller: navigation between the app screens, the "more" menu,
 * language sync, backdrop/Escape handling, and delegation of every feed and
 * composer gesture to the feature modules.
 *
 * It owns no rendering of its own — that is feed-view / composer-view's job.
 */
import { renderFeed, filterTopic, toggleExpand, lightbox, feedState, setQuery, showAllTopics } from '../feed/feed-view.js';
import { toggleRepost, toggleHelpful, toggleSave, toggleFollow, postMenu, closePostMenus, share, copyLink, report, submitReport, sendToPerson, openAuthor, openActionSheet } from '../engagement/engagement-actions.js';
import { openProfile, openMyProfile, initProfileView } from '../profile/profile-view.js';
import { initProfileEditor } from '../profile/profile-edit.js';
import { openThread, submitComment, initCommentThread } from '../engagement/comment-thread.js';
import {
  openComposer, closeComposer, cancelComposer, composerBack, pickMedia, focusLink, addLink,
  recordAudio, showPreview, publish, saveCurrentDraft, loadLatestDraft, setStep, wireComposer,
  readForm, composerState
} from '../composer/composer-view.js';
import { renderTray } from '../composer/composer-media.js';
import { GHSos, triggerSOS } from '../emergency/sos.js';
import { reviewSafety, openStorage, openNotifications, openAccount, openGuardians, wireSheetActions } from './home-sheets.js';
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { countDrafts } from '../../services/drafts.service.js';
import { createLogger } from '../../core/logger.js';
import { init as initHero } from '../hero/hero-slideshow.js';
import { initSearchBar, syncSearchBar } from './search-bar.js';
import { initHealth } from '../health/health-view.js';
import { initNetwork, enter as enterNetwork } from '../network/network-view.js';
import { bus, EVENTS } from '../../core/bus.js';
import { searchAll } from '../../services/discover.service.js';
import { markAlertsRead } from '../../services/alerts.service.js';

const log = createLogger('home');

/* ---------------------------------------------------------------- navigation */
export function setActiveTab(id) {
  document.querySelectorAll('.nav-tab-btn').forEach((b) => b.classList.remove('active'));
  const el = id && document.getElementById(id);
  if (el) el.classList.add('active');
}

/**
 * Search the Uwanja feed. This is a real, local filter over the posts that are
 * on this device — no request leaves the page, and an empty result says so.
 */
export function openSearch() {
  closeMore();
  openSheet('Tafuta', `
    <div class="gh-search">
      <label class="ghc-label" for="ghSearchInput">Chapisho, mtu au jina la mwandishi</label>
      <input id="ghSearchInput" class="ghc-input" type="search" autocomplete="off"
             placeholder="mf. mafuriko, lishe, Afya" aria-describedby="ghSearchHelp">
      <p id="ghSearchHelp" class="ghc-note-sm">
        Utafutaji unafanyika kwenye kifaa hiki pekee — hakuna kinachotumwa mtandaoni.
      </p>
      <div id="ghSearchResults" class="gh-search-results" aria-live="polite"></div>
      <div id="ghSearchNetwork" class="gh-search-results" aria-live="polite"></div>
    </div>`);

  const input = document.getElementById('ghSearchInput');
  const out = document.getElementById('ghSearchResults');
  if (!input || !out) return;
  const netOut = document.getElementById('ghSearchNetwork');
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const term = input.value.trim();
      const n = await setQuery(term);
      syncSearchBar(term);
      out.textContent = term
        ? `${n} chapisho ${n === 1 ? 'limepatikana' : 'yamepatikana'} kwenye kifaa hiki.`
        : '';
      // the same term is offered to the network (people, communities, providers)
      if (netOut) {
        if (!term) { netOut.innerHTML = ''; return; }
        try {
          const r = await searchAll(term);
          const lines = [
            r.people.length ? `${r.people.length} mtu/watu` : '',
            r.communities.length ? `${r.communities.length} jamii` : '',
            r.providers.length ? `${r.providers.length} watoa huduma` : ''
          ].filter(Boolean);
          if (!lines.length) { netOut.innerHTML = ''; return; }
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'gh-btn gh-btn-outline';
          button.dataset.networkSearch = term;
          button.textContent = `Mawasiliano: ${lines.join(' · ')} — fungua Gundua`;
          netOut.replaceChildren(button);
        } catch (err) { netOut.innerHTML = ''; }
      }
    }, 180);
  });
  input.focus();
  return true;
}

export function searchFeed(term) {
  return setQuery(term);
}

export function go(target, options = {}) {
  closeMore();
  const switchTo = window.switchTab || (() => {});
  switch (target) {
    case 'home':
      switchTo('home');
      setActiveTab('tab-home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'health':
      // Afya now has its own screen (#healthPage). The Shield screen keeps its
      // own "Protection Health" sub-tab — that is system health, not this section.
      switchTo('health');
      setActiveTab('tab-health');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'shield':
      switchTo('shield');
      // Shield opens on its own Center (dashboard → device → personal …).
      if (window.ShieldCenter) window.ShieldCenter.paint();
      setActiveTab('tab-shield');
      break;
    case 'sos':
      // SOS is a page, not a modal: it must be reachable, linkable and printable.
      switchTo('sos');
      setActiveTab(null);
      if (window.GHSosPage) window.GHSosPage.paint();
      window.scrollTo({ top: 0, behavior: 'auto' });
      break;
    case 'chat':
      switchTo('comm');
      setActiveTab('tab-chat');
      // the Communication & Support Network paints itself on first entry
      if (window.GHNetwork) window.GHNetwork.enter();
      break;
    case 'map':
      switchTo('map');
      setActiveTab(null);       // Map has no bottom-nav slot by design
      break;
    case 'storage':
      // The Universal Secure Storage Center has a page of its own. It sits
      // behind the More menu and the Shield app row, so it has no nav slot.
      // `options.screen` lands on a specific screen (the old Storage sheet’s
      // numbers live on `storage.usage`).
      switchTo('storage');
      setActiveTab(null);
      if (window.GHStorage) window.GHStorage.enter(options.screen || null);
      window.scrollTo({ top: 0, behavior: 'auto' });
      break;
    default:
      switchTo('home');
      setActiveTab('tab-home');
  }

  // The quick search bar belongs to the Uwanja; on other pages it would be a
  // control that filters a feed the reader cannot see.
  const onFeed = target === 'home' || !['shield', 'health', 'chat', 'map', 'sos', 'storage'].includes(target);
  const bar = document.getElementById('ghSearchBar');
  if (bar) (onFeed ? bar.removeAttribute('hidden') : bar.setAttribute('hidden', ''));
}

export function goFind() {
  (window.switchTab || (() => {}))('shield');
  if (window.ShieldCenter) window.ShieldCenter.go('device');
  if (typeof window.switchShieldPillar === 'function') window.switchShieldPillar('find');
  setActiveTab('tab-shield');
}

export function scrollToUwanja() {
  const el = document.getElementById('ghUwanja');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------------------------------------------------------------- more menu */
export function toggleMore(ev) {
  if (ev) ev.stopPropagation();
  const menu = document.getElementById('ghMoreMenu');
  const btn = document.getElementById('ghMoreBtn');
  if (!menu) return;
  const open = !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  if (btn) btn.setAttribute('aria-expanded', String(open));
}

export function closeMore() {
  const menu = document.getElementById('ghMoreMenu');
  const btn = document.getElementById('ghMoreBtn');
  if (menu) menu.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/* --------------------------------------------------------------- language */
export function syncLang() {
  const lang = (window.I18N && window.I18N.lang) || 'sw';
  document.querySelectorAll('#ghLangSeg button').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.lang === lang);
  });
}

/* ------------------------------------------------------------------- init */
async function restoreDraftHint() {
  const total = await countDrafts();
  if (!total) return;
  const note = document.querySelector('.gh-feed-note span');
  if (note && note.textContent.indexOf('Rasimu') === -1) {
    note.textContent += ` (Rasimu ${total} zimehifadhiwa kwenye kifaa.)`;
  }
}

function wireBackdrops() {
  ['ghSheet', 'ghComposer'].forEach((id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target !== modal) return;
      if (id === 'ghComposer') cancelComposer();
      else modal.classList.remove('open');
    });
  });

  // tapping anywhere outside a post action row closes the three-dot menu
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.gh-post-actions') && !e.target.closest('.gh-post-menu')) closePostMenus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeSheet();
    const composer = document.getElementById('ghComposer');
    if (composer && composer.classList.contains('open')) cancelComposer();
    closeMore();
  });
}

/**
 * Delegated gestures on the feed. Every button in a card carries data-act, so
 * adding a new action never needs another inline onclick.
 */
function wireFeedGestures() {
  // delegated on the document so the same actions work in the feed and in the
  // post list inside a profile page
  document.addEventListener('click', async (e) => {
    if (!e.target.closest('#ghFeed, #ghProfile')) return;
    const authorBtn = e.target.closest('[data-profile]');
    if (authorBtn && authorBtn.dataset.profile) { await openProfile(authorBtn.dataset.profile); return; }

    const followBtn = e.target.closest('[data-follow-btn]');
    if (followBtn) { await toggleFollow(followBtn.dataset.post); return; }

    const menuItem = e.target.closest('[data-menu]');
    if (menuItem) {
      const id = menuItem.dataset.post;
      if (menuItem.dataset.menu === 'follow') await toggleFollow(id);
      else if (menuItem.dataset.menu === 'copy') await copyLink(id);
      else if (menuItem.dataset.menu === 'report') report(id);
      else if (menuItem.dataset.menu === 'profile') await openAuthor(id);
      else if (menuItem.dataset.menu === 'send') await sendToPerson(id);
      else if (menuItem.dataset.menu === 'all') await openActionSheet(id);
      return;
    }

    const cta = e.target.closest('[data-post-cta]');
    if (cta) {
      // post-level call to action reuses the existing report flow (device only)
      if (cta.dataset.postCta === 'report') report(cta.dataset.post);
      return;
    }

    const expand = e.target.closest('[data-expand]');
    if (expand) { toggleExpand(expand.dataset.expand, expand); return; }

    const media = e.target.closest('[data-media]');
    if (media) { lightbox(media.dataset.post, Number(media.dataset.index)); return; }

    const retry = e.target.closest('[data-feed-retry]');
    if (retry) { retry.disabled = true; await renderFeed({ keepScroll: true }); return; }

    const clear = e.target.closest('[data-feed-clear]');
    if (clear) {
      const all = document.querySelector('#ghTopics .gh-topic[data-topic="all"]');
      if (all) filterTopic('all', all);
      return;
    }

    const act = e.target.closest('[data-act]');
    if (!act) return;
    const postId = act.dataset.post;
    switch (act.dataset.act) {
      case 'helpful': await toggleHelpful(postId); break;
      case 'save': await toggleSave(postId); break;
      case 'comment': await openThread(postId); break;
      case 'share': await share(postId); break;
      case 'more': postMenu(postId); break;
      case 'repost': await toggleRepost(postId); break;
      case 'unrepost': await toggleRepost(postId); break;
      default: break;
    }
  });
}

/** Mount the hero slideshow once; it is a no-op on every later call. */
function initHeroSlideshow() {
  const api = initHero();
  if (api) window.GHHero = api;      // same bridge style as HomeUI / GHSos
}

function wireTopics() {
  document.querySelectorAll('#ghTopics .gh-topic').forEach((btn) => {
    btn.addEventListener('click', () => filterTopic(btn.dataset.topic, btn));
  });
}

function wireSheetActionHandlers() {
  wireSheetActions({
    'close-sheet': () => closeSheet(),
    'go-shield': () => { closeSheet(); go('shield'); },
    'run-device-check': () => {
      closeSheet();
      if (window.ProtectEngine?.runReal7StepSecurityCheck) window.ProtectEngine.runReal7StepSecurityCheck();
      else toast('Ukaguzi wa kifaa haupatikani kwenye kifaa hiki.');
    },
    'ask-notifications': () => {
      if (window.RemoteShield?.requestNotifications) window.RemoteShield.requestNotifications();
    },
    'open-guardians': () => {
      closeSheet();
      go('chat');
      window.GHNetwork?.select('guardians');
    },
    'mark-alerts': async () => {
      const n = await markAlertsRead();
      closeSheet();
      toast(n ? `Arifa ${n} zimewekwa kama zimesomwa.` : 'Hakuna arifa mpya.');
    },
    'open-menu': () => { closeSheet(); if (window.toggleSidebar) window.toggleSidebar(true); },
    'open-profile': () => { closeSheet(); openMyProfile(); },
    'sign-out': () => { closeSheet(); if (window.handleSignOut) window.handleSignOut(); },
    'add-comment': () => submitComment(),
    'submit-report': () => submitReport()
  });

  // "Mawasiliano" result in the search sheet opens Discover with the same term
  document.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-network-search]');
    if (!hit) return;
    const term = hit.dataset.networkSearch;
    closeSheet();
    go('chat');
    const net = window.GHNetwork;
    if (!net) return;
    net.state.filter.q = term;
    net.select('discover').then(() => { net.state.filter.q = term; net.paint(); });
  });

  const draftRow = document.getElementById('ghcDraftRow');
  if (draftRow) {
    draftRow.addEventListener('click', (e) => {
      if (e.target.closest('[data-draft-load]')) loadLatestDraft();
    });
  }
}

/**
 * The header avatar used to be an external ui-avatars.com hotlink with a
 * hard-coded name. It is now painted locally: the initials of the signed-in
 * profile when there is one, a neutral person icon otherwise. Nothing is
 * fetched and no name is invented.
 */
export function syncHeaderAvatar() {
  const host = document.getElementById('topNavUserPic');
  if (!host) return;
  const name = (localStorage.getItem('guardhai_profile_name') || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.length
    ? (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
    : '';
  if (initials) host.textContent = initials;
  else host.innerHTML = '<svg class="ic"><use href="#i-user"/></svg>';
}

export async function initHome() {
  try {
    await renderFeed();
    syncLang();
    wireComposer();
    wireBackdrops();
    wireFeedGestures();
    wireTopics();
    wireSheetActionHandlers();
    initHeroSlideshow();
    initSearchBar();
    initHealth();
    initNetwork();
    initProfileView();
    initProfileEditor();
    initCommentThread();
    syncSafetyDevice();
    syncHeaderAvatar();
    bus.on(EVENTS.PROFILE_UPDATED, syncHeaderAvatar);
    // the Shield engine fills in the detected device after boot; mirror it once
    setTimeout(syncSafetyDevice, 1200);
    await restoreDraftHint();
    log.info('home ready');
  } catch (err) {
    log.error('home init failed', err);
    toast('Baadhi ya sehemu hazijapakia. Fungua upya ukurasa.');
  }
}

/* --------------------------------------------------------------------- SOS */
export function sos(kind) {
  return triggerSOS(kind);
}

/* ------------------------------------------------------------------ bridge */
/**
 * index.html still uses inline onclick="HomeUI.x()" in 23 places. Rather than
 * rewriting the markup, HomeUI is exposed as a thin façade over the modules
 * above. New UI code should import the functions instead of using this object.
 */
export const HomeUI = {
  init: initHome,
  go, goFind, setActiveTab, scrollToUwanja,

  renderFeed: () => renderFeed(),
  filterTopic: (topic, btn) => filterTopic(topic, btn),

  reviewSafety,
  openStorage: () => openStorage(),
  openNotifications,
  openAccount,
  openGuardians,

  toggleMore,
  closeMore: (ev) => { if (ev) ev.stopPropagation(); closeMore(); },
  syncLang,

  openComposer,
  cancelComposer,
  composerBack,
  closeComposer,
  pickMedia,
  focusLink,
  addLink,
  toggleRecording: () => recordAudio(),
  showPreview,
  publish,
  saveDraft: () => saveCurrentDraft(),

  openSheet: (title, html) => openSheet(title, html),
  closeSheet,
  postMenu: (id) => postMenu(id),
  closePostMenus: () => closePostMenus(),

  sos,

  /* search + feed shortcuts */
  openSearch: () => openSearch(),
  showSearchBar: () => document.getElementById('ghSearchBar')?.removeAttribute('hidden'),
  hideSearchBar: () => document.getElementById('ghSearchBar')?.setAttribute('hidden', ''),
  searchFeed: (term) => searchFeed(term),
  showAllTopics: () => showAllTopics(),

  /* profiles */
  openProfile: (id) => openProfile(id),
  openMyProfile: () => openMyProfile(),

  // --- compatibility with the pre-refactor HomeUI API (used by the test suite
  //     and by old inline markup); new code should import the modules instead.
  _renderTray: () => renderTray(composerState.attachments, composerState.errors),
  composerStep: (step) => setStep(step),
  get state() {
    return {
      ...feedState,
      composer: composerState,
      helpful: feedState.flags,
      saved: feedState.flags,
      following: feedState.flags,
      comments: feedState.counts,
      myPosts: [],
      topic: feedState.topic
    };
  },
  get form() { return readForm(); },
  get drafts() { return countDrafts(); }
};

/** keeps the safety card honest: the detected device line only shows when there is one */
export function syncSafetyDevice() {
  const value = document.getElementById('lbl-controller-home-desc');
  const row = value?.closest('.gh-safety-device');
  if (!row || !value) return;
  const text = (value.textContent || '').trim();
  const real = text && text !== '—' && text !== '-' && text !== '\u2014';
  row.classList.toggle('is-live', !!real);
}

window.HomeUI = HomeUI;
window.GHSos = GHSos;   // index.html still calls GHSos.trigger() inline
