/**
 * GuardHai · features/engagement/engagement-actions.js
 * Like / save / follow / share / three-dot menu / report.
 *
 * Every toggle is persisted through engagement.service → IndexedDB, so the
 * state survives a reload. Nothing is sent anywhere: there is no engagement
 * server yet, and the UI says so whenever a remote effect could be assumed.
 */
import { toggleFlag, fileReport } from '../../services/engagement.service.js';
import { feedState, updateCardCounters } from '../feed/feed-view.js';
import { toast } from '../../ui/toast.js';
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { escapeHtml } from '../../core/dom.js';
import { openProfile } from '../profile/profile-view.js';

export async function toggleHelpful(postId) {
  const flags = await toggleFlag(postId, 'helpful');
  updateCardCounters(postId, { flags });
  toast(flags.helpful
    ? 'Imenisaidia — imehifadhiwa kwenye kifaa hiki.'
    : 'Umeondoa alama.');
  return flags;
}

export async function toggleSave(postId) {
  const flags = await toggleFlag(postId, 'saved');
  updateCardCounters(postId, { flags });
  toast(flags.saved
    ? 'Imehifadhiwa kwenye kifaa hiki.'
    : 'Umeondoa kwenye hifadhi.');
  return flags;
}

export async function toggleFollow(postId) {
  const flags = await toggleFlag(postId, 'following');
  updateCardCounters(postId, { flags });
  closePostMenus();
  toast(flags.following
    ? 'Unafuata mwandishi (kwenye kifaa hiki).'
    : 'Umeacha kufuata.');
  return flags;
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
