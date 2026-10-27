/**
 * GuardHai · features/engagement/comment-thread.js
 * Comments are real rows in IndexedDB, scoped to a post id and threadable one
 * level deep (`parentId`). They live on this device only — there is no comment
 * server, and the thread says so.
 */
import { listComments, addComment as addCommentRow, commentCount } from '../../services/engagement.service.js';
import { feedState, updateCardCounters } from '../feed/feed-view.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { escapeHtml } from '../../core/dom.js';
import { initials, relativeTime } from '../../core/format.js';
import { openProfile } from '../profile/profile-view.js';
import { report } from './engagement-actions.js';

let openPostId = null;
let replyTo = null;          // { id, name } when replying

function commentRow(c, isReply = false) {
  return `
    <li class="gh-comment" data-comment="${escapeHtml(c.id)}">
      <button type="button" class="gh-comment-av" data-profile="${escapeHtml(c.authorId || '')}"
              aria-label="Wasifu wa ${escapeHtml(c.authorName)}">${escapeHtml(initials(c.authorName))}</button>
      <div class="gh-comment-body">
        <b>${escapeHtml(c.authorName)}</b>
        <span class="gh-comment-time">${escapeHtml(relativeTime(c.createdAt))}</span>
        <p>${escapeHtml(c.text)}</p>
        <div class="gh-comment-actions">
          <button type="button" class="gh-comment-btn" data-reply="${escapeHtml(c.id)}"
                  data-reply-name="${escapeHtml(c.authorName)}">
            <svg class="ic" aria-hidden="true"><use href="#i-corner-up-left"/></svg> Jibu
          </button>
          ${isReply ? '' : `<button type="button" class="gh-comment-btn" data-report-comment="${escapeHtml(c.id)}">
            <svg class="ic" aria-hidden="true"><use href="#i-flag"/></svg> Ripoti
          </button>`}
        </div>
      </div>
    </li>`;
}

function threadHtml(comments) {
  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (id) => comments.filter((c) => c.parentId === id);

  if (!comments.length) return '<li class="gh-feed-empty">Hakuna maoni bado. Maoni yako yataonekana hapa.</li>';

  return roots.map((c) => {
    const replies = repliesOf(c.id);
    return commentRow(c) + (replies.length
      ? `<li class="gh-comment-replies"><ul>${replies.map((r) => commentRow(r, true)).join('')}</ul></li>`
      : '');
  }).join('');
}

export async function openThread(postId) {
  openPostId = postId;
  replyTo = null;
  const post = feedState.posts.find((p) => p.id === postId);
  const comments = await listComments(postId);

  openSheet('Maoni', `
    <div class="gh-thread-post">
      <b>${escapeHtml(post?.authorName || 'Chapisho')}</b>
      <p>${escapeHtml(String(post?.text || '').slice(0, 120))}${(post?.text || '').length > 120 ? '…' : ''}</p>
    </div>
    <ul class="gh-comments" id="ghCommentList">${threadHtml(comments)}</ul>
    <div class="gh-sheet-note">
      <svg class="ic"><use href="#i-alert-triangle"/></svg>
      <span>Maoni yanahifadhiwa <b>kwenye kifaa hiki</b> (IndexedDB) na haonekani kwa mtu mwingine.
      Hakuna seva ya maoni iliyounganishwa.</span>
    </div>
    <div class="gh-reply-banner" id="ghReplyBanner" hidden>
      <span id="ghReplyWho"></span>
      <button type="button" class="gh-comment-btn" data-reply-cancel>Ghairi</button>
    </div>
    <label class="ghc-label" for="ghCommentInput">Andika maoni</label>
    <textarea id="ghCommentInput" class="ghc-textarea" rows="2" maxlength="300" placeholder="Maoni yako…"></textarea>
    <div class="gh-sheet-actions">
      <button type="button" class="gh-btn gh-btn-primary" data-sheet-action="add-comment">
        <svg class="ic"><use href="#i-send"/></svg> Tuma (kifaa hiki)
      </button>
    </div>
  `);
}

export async function submitComment() {
  const input = document.getElementById('ghCommentInput');
  if (!openPostId) return { ok: false };
  const result = await addCommentRow(openPostId, input ? input.value : '', undefined,
    { parentId: replyTo?.id || null });
  if (!result.ok) { toast(result.message); if (input) input.focus(); return result; }

  const count = await commentCount(openPostId);
  feedState.counts[openPostId] = count || 0;
  updateCardCounters(openPostId, { count: count || 0 });
  await openThread(openPostId);            // re-render the same thread
  toast('Maoni yamehifadhiwa kwenye kifaa hiki.');
  return result;
}

export function startReply(commentId, authorName) {
  replyTo = { id: commentId, name: authorName || 'maoni' };
  const banner = document.getElementById('ghReplyBanner');
  const who = document.getElementById('ghReplyWho');
  if (banner) banner.hidden = false;
  if (who) who.textContent = `Unajibu ${replyTo.name}`;
  document.getElementById('ghCommentInput')?.focus();
}

export function cancelReply() {
  replyTo = null;
  const banner = document.getElementById('ghReplyBanner');
  if (banner) banner.hidden = true;
}

export const currentThread = () => openPostId;

/* delegated: reply / cancel / author profile inside the sheet */
let wired = false;
export function initCommentThread() {
  if (wired) return;
  wired = true;

  document.addEventListener('click', async (event) => {
    const replyBtn = event.target.closest('[data-reply]');
    if (replyBtn) { startReply(replyBtn.dataset.reply, replyBtn.dataset.replyName); return; }

    if (event.target.closest('[data-reply-cancel]')) { cancelReply(); return; }

    const reportBtn = event.target.closest('[data-report-comment]');
    if (reportBtn && openPostId) { report(openPostId, { commentId: reportBtn.dataset.reportComment }); return; }

    const authorBtn = event.target.closest('#ghCommentList [data-profile]');
    if (authorBtn && authorBtn.dataset.profile) { await openProfile(authorBtn.dataset.profile); }
  });
}
