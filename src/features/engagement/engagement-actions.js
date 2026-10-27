/**
 * GuardHai · features/engagement/engagement-actions.js
 * Like / save / follow / share / three-dot menu / report.
 *
 * Every toggle is persisted through engagement.service → IndexedDB, so the
 * state survives a reload. Nothing is sent anywhere: there is no engagement
 * server yet, and the UI says so whenever a remote effect could be assumed.
 */
import { toggleFlag, fileReport } from '../../services/engagement.service.js';
import { getPost, repost, findMyRepost, undoRepost } from '../../services/posts.service.js';
import { feedState, updateCardCounters, renderFeed } from '../feed/feed-view.js';
import { toast } from '../../ui/toast.js';
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { escapeHtml } from '../../core/dom.js';
import { openProfile } from '../profile/profile-view.js';

/** Buttons that represent one engagement action for one post. */
function actionButtons(postId, act) {
  return [...document.querySelectorAll(`[data-act="${act}"][data-post="${postId}"]`)];
}

/**
 * Persist one engagement flag. The storage call is unchanged — this only adds a
 * pending state (so a double tap cannot queue two writes) and a real error path
 * when the device store refuses the write.
 */
async function persistToggle(postId, act, key) {
  const buttons = actionButtons(postId, act);
  if (buttons.some((b) => b.dataset.pending === 'true')) return null;   // in flight
  buttons.forEach((b) => { b.dataset.pending = 'true'; b.classList.add('is-pending'); });
  try {
    const flags = await toggleFlag(postId, key);
    updateCardCounters(postId, { flags });
    return flags;
  } catch (err) {
    console.warn('[engagement] write failed', err);
    toast('Imeshindikana kuhifadhi kwenye kifaa hiki. Jaribu tena.');
    return null;
  } finally {
    buttons.forEach((b) => { delete b.dataset.pending; b.classList.remove('is-pending'); });
  }
}

export async function toggleHelpful(postId) {
  const flags = await persistToggle(postId, 'helpful', 'helpful');
  if (!flags) return null;
  toast(flags.helpful
    ? 'Imenisaidia — imehifadhiwa kwenye kifaa hiki.'
    : 'Umeondoa alama.');
  return flags;
}

export async function toggleSave(postId) {
  const flags = await persistToggle(postId, 'save', 'saved');
  if (!flags) return null;
  toast(flags.saved
    ? 'Imehifadhiwa kwenye kifaa hiki.'
    : 'Umeondoa kwenye hifadhi.');
  return flags;
}

export async function toggleFollow(postId) {
  const followBtns = [...document.querySelectorAll(`[data-follow-btn][data-post="${postId}"]`)];
  if (followBtns.some((b) => b.dataset.pending === 'true')) return null;
  followBtns.forEach((b) => { b.dataset.pending = 'true'; b.classList.add('is-pending'); });
  let flags;
  try {
    flags = await toggleFlag(postId, 'following');
  } catch (err) {
    console.warn('[engagement] follow write failed', err);
    toast('Imeshindikana kuhifadhi kwenye kifaa hiki. Jaribu tena.');
    return null;
  } finally {
    followBtns.forEach((b) => { delete b.dataset.pending; b.classList.remove('is-pending'); });
  }
  updateCardCounters(postId, { flags });
  closePostMenus();
  toast(flags.following
    ? 'Unafuata mwandishi (kwenye kifaa hiki).'
    : 'Umeacha kufuata.');
  return flags;
}

/**
 * Repost is a real second feed row that points back at the original (see
 * services/posts.service.js). Clicking again removes that row. Device-only.
 */
export async function toggleRepost(postId) {
  // demo posts live in the feed only (they are not rows in the store)
  const post = await getPost(postId) || feedState.posts.find((p) => p.id === postId);
  if (!post) return null;

  const existing = await findMyRepost(postId);
  if (existing) {
    const result = await undoRepost(postId);
    if (!result.ok) { toast('Haikuweza kuondoa rudio. Jaribu tena.'); return null; }
    await renderFeed({ keepScroll: true });
    toast('Rudio limeondolewa kwenye kifaa hiki.');
    return { reposted: false };
  }

  const result = await repost(post);
  if (!result.ok) { toast(result.errors?.[0] || 'Haikuweza kurudia chapisho.'); return null; }
  await renderFeed({ keepScroll: true });
  toast('Umerudia chapisho — kwenye kifaa hiki pekee.');
  return { reposted: true };
}

/* ------------------------------------------------------------ three-dot menu */
export function postMenu(postId) {
  const menu = document.getElementById(`ghmenu-${postId}`);
  if (!menu) return;
  const willOpen = !menu.classList.contains('open');
  closePostMenus(menu);
  menu.classList.toggle('open', willOpen);
  const btn = menu.parentElement.querySelector('[data-act="more"]');
  if (btn) btn.setAttribute('aria-expanded', String(willOpen));
}

/**
 * The full action sheet shown by "Vitendo vyote". It is additive: the compact
 * three-dot menu and the five-button rail keep working exactly as before, this
 * is a roomier surface for the same ten actions on small screens.
 */
export function openActionSheet(postId) {
  const post = feedState.posts.find((p) => p.id === postId);
  if (!post) return;
  const canSend = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const flags = feedState.flags?.[postId] || {};
  const rows = [
    { act: 'helpful', icon: 'i-heart', label: flags.helpful ? 'Imenisaidia' : 'Imenisaidia', hint: 'Hifadhi kwenye kifaa' },
    { act: 'comment', icon: 'i-message', label: 'Maoni', hint: 'Andika maoni kwenye kifaa' },
    { act: 'share', icon: 'i-share', label: 'Shiriki', hint: 'Menyu ya kifaa au nakili kiungo' },
    { act: 'save', icon: 'i-bookmark', label: flags.saved ? 'Imehifadhiwa' : 'Hifadhi', hint: 'Hifadhi kwenye kifaa' },
    { act: 'repost', icon: 'i-repost', label: post.repostOf ? 'Ondoa rudio' : 'Rudia', hint: post.repostOf ? 'Ondoa nakala kwenye Uwanja wako' : 'Weka nakala kwenye Uwanja wako' },
    { act: 'follow', icon: 'i-user-plus', label: flags.following ? 'Acha kufuata' : 'Fuata', hint: 'Fuata mwandishi' },
    { act: 'send', icon: 'i-send', label: canSend ? 'Tuma kwa mtu' : 'Tuma kwa mtu (haipatikani)', hint: canSend ? 'Menyu ya kushiriki' : 'Kifaa hiki hakitumii menyu ya kushiriki' },
    { act: 'profile', icon: 'i-user', label: 'Fungua wasifu', hint: 'Wasifu wa mwandishi' },
    { act: 'copy', icon: 'i-link', label: 'Nakili kiungo', hint: 'Kiungo cha kifaa' },
    { act: 'report', icon: 'i-flag', label: 'Ripoti', hint: 'Taarifa inabaki kwenye kifaa' }
  ];

  openSheet('Vitendo vya chapisho', `
    <p class="gh-sheet-p">${escapeHtml(post.title || post.topicLabel || 'Chapisho')}</p>
    <div class="gh-actionsheet" role="group" aria-label="Vitendo vya chapisho">
      ${rows.map((r) => `<button type="button" class="gh-actionsheet-item" data-sheet-do="${r.act}"
        data-post="${escapeHtml(postId)}" ${r.act === 'send' && !canSend ? 'disabled aria-disabled="true"' : ''}>
        <span class="gh-actionsheet-ico"><svg class="ic" aria-hidden="true"><use href="#${r.icon}"/></svg></span>
        <span class="gh-actionsheet-txt"><b>${r.label}</b><span>${escapeHtml(r.hint)}</span></span>
      </button>`).join('')}
    </div>
    <p class="gh-sheet-p gh-sheet-fine">Vitendo vyote vinahifadhiwa kwenye kifaa hiki. Hakuna kinachotumwa kwa seva.</p>
  `);

  const body = document.getElementById('ghSheetBody');
  if (!body) return;
  body.querySelectorAll('[data-sheet-do]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const id = btn.dataset.post;
      const act = btn.dataset.sheetDo;
      closeSheet();
      if (act === 'helpful') await toggleHelpful(id);
      else if (act === 'save') await toggleSave(id);
      else if (act === 'repost') await toggleRepost(post.repostOf ? post.repostOf.postId : id);
      else if (act === 'follow') await toggleFollow(id);
      else if (act === 'comment') {
        // the thread opens from the rail; the sheet only routes the intent
        const rail = document.querySelector(`.gh-post[data-post="${id}"] [data-act="comment"]`);
        if (rail) rail.click();
      } else if (act === 'share') await share(id);
      else if (act === 'send') await sendToPerson(id);
      else if (act === 'profile') await openAuthor(id);
      else if (act === 'copy') await copyLink(id);
      else if (act === 'report') report(id);
    });
  });
}

export function closePostMenus(except = null) {
  document.querySelectorAll('.gh-post-menu.open').forEach((menu) => {
    if (menu === except) return;
    menu.classList.remove('open');
    const btn = menu.parentElement.querySelector('[data-act="more"]');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}

/* ------------------------------------------------------------------- share */
export function shareLink(postId) {
  return `https://guardhai.app/post/${encodeURIComponent(postId)}`;
}

export async function share(postId) {
  const post = feedState.posts.find((p) => p.id === postId);
  const url = shareLink(postId);
  const payload = {
    title: post?.title || 'GuardHai — Uwanja',
    text: String(post?.text || '').slice(0, 120),
    url
  };

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(payload);
      toast('Imeshirkwa kupitia menyu ya kifaa.');
      return { via: 'native' };
    } catch (err) {
      if (err && err.name === 'AbortError') return { via: 'cancelled' };
      /* fall through to clipboard */
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast('Kiungo kimenakiliwa. Hakuna seva — kiungo ni cha sampuli.');
      return { via: 'clipboard' };
    }
    throw new Error('clipboard unavailable');
  } catch {
    openSheet('Shiriki', `
      <p class="gh-sheet-p">Kunakili moja kwa moja hakupatikana. Nakili kiungo hiki:</p>
      <input class="ghc-input" readonly value="${escapeHtml(url)}" onclick="this.select()">
    `);
    return { via: 'sheet' };
  }
}

export function copyLink(postId) {
  closePostMenus();
  return share(postId);
}

/* ------------------------------------------------------- send to a person */
/**
 * Only offered when the device exposes the native share sheet; otherwise the
 * menu item is rendered disabled with the reason, so nobody taps a dead action.
 */
export async function sendToPerson(postId) {
  closePostMenus();
  if (typeof navigator.share !== 'function') {
    toast('Kifaa hiki hakitumii menyu ya kushiriki.');
    return { ok: false, reason: 'unsupported' };
  }
  const post = feedState.posts.find((p) => p.id === postId);
  try {
    await navigator.share({
      title: post?.title || 'GuardHai — Uwanja',
      text: String(post?.text || '').slice(0, 140),
      url: shareLink(postId)
    });
    return { ok: true };
  } catch (err) {
    if (err?.name === 'AbortError') return { ok: false, reason: 'cancelled' };
    toast('Haikuweza kushiriki. Jaribu tena.');
    return { ok: false, reason: 'error' };
  }
}

/* ------------------------------------------------------------ open author */
export async function openAuthor(postId) {
  closePostMenus();
  const post = feedState.posts.find((p) => p.id === postId);
  if (!post?.authorId) return null;
  await openProfile(post.authorId);
  return post.authorId;
}

/* ------------------------------------------------------------------ report */
const REPORT_REASONS = [
  ['harmful', 'Maudhui yasiyofaa au ya hatari'],
  ['false', 'Taarifa isiyo sahihi'],
  ['harass', 'Ubaguzi au unyanyasaji'],
  ['spam', 'Spam au matangazo'],
  ['other', 'Sababu nyingine']
];

let reportTarget = { postId: null, commentId: null };

export function report(postId, { commentId = null } = {}) {
  closePostMenus();
  reportTarget = { postId, commentId };
  openSheet('Ripoti maudhui', `
    <p class="gh-sheet-p">Chagua sababu. Ripoti itahifadhiwa <b>kwenye kifaa hiki pekee</b> —
    haitumwi kwa msimamizi kwa sababu hakuna seva ya uidhinishaji.</p>
    <div class="gh-report" role="radiogroup" aria-label="Sababu ya ripoti">
      ${REPORT_REASONS.map(([value, label], i) => `
        <label class="gh-radio">
          <input type="radio" name="ghReportReason" value="${value}" ${i === 0 ? 'checked' : ''}>
          <span>${label}</span>
        </label>`).join('')}
    </div>
    <label class="ghc-label" for="ghReportNote">Maelezo (hiari)</label>
    <textarea id="ghReportNote" class="ghc-textarea" rows="2" maxlength="300" placeholder="Eleza tatizo…"></textarea>
    <div class="gh-sheet-actions">
      <button type="button" class="gh-btn gh-btn-primary" data-sheet-action="submit-report">Tuma ripoti</button>
      <button type="button" class="gh-btn gh-btn-outline" data-sheet-action="close-sheet">Ghairi</button>
    </div>
  `);
}

export async function submitReport() {
  const picked = document.querySelector('input[name="ghReportReason"]:checked');
  const note = document.getElementById('ghReportNote')?.value || '';
  if (!picked || !reportTarget.postId) { toast('Chagua sababu.'); return null; }
  await fileReport({ postId: reportTarget.postId, commentId: reportTarget.commentId,
                     reason: picked.value, note });
  closeSheet();
  toast('Ripoti imehifadhiwa kwenye kifaa hiki — haijatumwa kwa msimamizi.');
  return { postId: reportTarget.postId, commentId: reportTarget.commentId, reason: picked.value };
}
