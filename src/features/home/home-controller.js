/**
 * GuardHai · features/home/home-controller.js
 * Home screen controller: navigation between the app screens, the "more" menu,
 * language sync, backdrop/Escape handling, and delegation of every feed and
 * composer gesture to the feature modules.
 *
 * It owns no rendering of its own — that is feed-view / composer-view's job.
 */
import { renderFeed, filterTopic, toggleExpand, lightbox, feedState } from '../feed/feed-view.js';
import { toggleHelpful, toggleSave, toggleFollow, postMenu, closePostMenus, share, copyLink, report, submitReport, sendToPerson, openAuthor } from '../engagement/engagement-actions.js';
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

const log = createLogger('home');

/* ---------------------------------------------------------------- navigation */
export function setActiveTab(id) {
  document.querySelectorAll('.nav-tab-btn').forEach((b) => b.classList.remove('active'));
  const el = id && document.getElementById(id);
  if (el) el.classList.add('active');
}

export function go(target) {
  closeMore();
  const switchTo = window.switchTab || (() => {});
  switch (target) {
    case 'home':
      switchTo('home');
      setActiveTab('tab-home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'health':
      // Afya is an existing Shield sub-tab — reused, never duplicated.
      switchTo('shield');
      if (window.ProtectEngine) window.ProtectEngine.switchSubTab('health');
      setActiveTab('tab-health');
      break;
    case 'shield':
      switchTo('shield');
      if (window.ProtectEngine) window.ProtectEngine.switchSubTab('dashboard');
      setActiveTab('tab-shield');
      break;
    case 'chat':
      switchTo('comm');
      setActiveTab('tab-chat');
      break;
    case 'map':
      switchTo('map');
      setActiveTab(null);       // Map has no bottom-nav slot by design
      break;
    default:
      switchTo('home');
      setActiveTab('tab-home');
  }
}

export function goFind() {
  (window.switchTab || (() => {}))('shield');
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
      return;
    }

    const expand = e.target.closest('[data-expand]');
    if (expand) { toggleExpand(expand.dataset.expand, expand); return; }

    const media = e.target.closest('[data-media]');
    if (media) { lightbox(media.dataset.post, Number(media.dataset.index)); return; }

    const act = e.target.closest('[data-act]');
    if (!act) return;
    const postId = act.dataset.post;
    switch (act.dataset.act) {
      case 'helpful': await toggleHelpful(postId); break;
      case 'save': await toggleSave(postId); break;
      case 'comment': await openThread(postId); break;
      case 'share': await share(postId); break;
      case 'more': postMenu(postId); break;
      default: break;
    }
  });
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
    'open-menu': () => { closeSheet(); if (window.toggleSidebar) window.toggleSidebar(true); },
    'open-profile': () => { closeSheet(); openMyProfile(); },
    'sign-out': () => { closeSheet(); if (window.handleSignOut) window.handleSignOut(); },
    'add-comment': () => submitComment(),
    'submit-report': () => submitReport()
  });

  const draftRow = document.getElementById('ghcDraftRow');
  if (draftRow) {
    draftRow.addEventListener('click', (e) => {
      if (e.target.closest('[data-draft-load]')) loadLatestDraft();
    });
  }
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
    initProfileView();
    initProfileEditor();
    initCommentThread();
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

window.HomeUI = HomeUI;
window.GHSos = GHSos;   // index.html still calls GHSos.trigger() inline
