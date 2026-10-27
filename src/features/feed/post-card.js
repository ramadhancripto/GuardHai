/**
 * GuardHai · features/feed/post-card.js
 * Pure rendering of one post. No state, no side effects beyond reading the
 * media URL cache — everything it needs arrives in `ctx`.
 *
 * ctx = { flags, commentCount, expanded, mediaUrl(id), preview }
 */
import { escapeHtml } from '../../core/dom.js';
import { typeLabel, audienceLabel } from '../../domain/post.js';
import { fmtSize, truncate } from '../../core/format.js';
import { getCachedUrl } from '../../services/media.service.js';

const COLLAPSE_AT = 240;

export function mediaHtml(post) {
  const items = post.media || [];
  if (!items.length) return '';

  const images = items.filter((m) => m.kind === 'image');
  const video = items.find((m) => m.kind === 'video');
  const audio = items.find((m) => m.kind === 'audio');
  const links = items.filter((m) => m.kind === 'link');
  let html = '';

  if (images.length) {
    const cls = `gh-gal gh-gal-${Math.min(images.length, 4)}`;
    html += `<div class="${cls}">` + images.map((m, idx) => {
      if (m.placeholder) {
        return '<div class="gh-media-ph"><svg class="ic"><use href="#i-image-plus"/></svg><span>Picha (sampuli)</span></div>';
      }
      const src = m.url || getCachedUrl(m.id);
      return `<button type="button" class="gh-gal-item" data-media="${escapeHtml(m.id)}"
                 data-post="${escapeHtml(post.id)}" data-index="${idx}"
                 aria-label="Fungua picha ${idx + 1}">
                <img src="${escapeHtml(src)}" alt="${escapeHtml(m.name || `Picha ${idx + 1}`)}" loading="lazy">
              </button>`;
    }).join('') + '</div>';
  }

  if (video) {
    if (video.placeholder) {
      html += '<div class="gh-media-ph gh-media-ph-wide"><svg class="ic"><use href="#i-video"/></svg><span>Video (sampuli)</span></div>';
    } else {
      const src = video.url || getCachedUrl(video.id);
      html += `<div class="gh-video-wrap"><video class="gh-video" controls preload="metadata" playsinline src="${escapeHtml(src)}"></video></div>`;
    }
  }

  if (audio) {
    if (audio.placeholder) {
      html += '<div class="gh-media-ph"><svg class="ic"><use href="#i-mic"/></svg><span>Sauti (sampuli)</span></div>';
    } else {
      const src = audio.url || getCachedUrl(audio.id);
      html += `<div class="gh-audio-wrap"><svg class="ic" aria-hidden="true"><use href="#i-volume"/></svg>
                 <div class="gh-audio-meta"><b>${escapeHtml(audio.name || 'Sauti')}</b>
                 <audio controls preload="metadata" src="${escapeHtml(src)}"></audio></div></div>`;
    }
  }

  if (links.length) {
    html += links.map((l) => `
      <a class="gh-linkcard" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer nofollow">
        <svg class="ic" aria-hidden="true"><use href="#i-link"/></svg>
        <span class="gh-linkcard-t">${escapeHtml(l.title || l.url)}</span>
        <svg class="ic gh-linkcard-go" aria-hidden="true"><use href="#i-arrow-right"/></svg>
      </a>`).join('');
  }
  return html;
}

export function postCard(post, ctx = {}) {
  const flags = ctx.flags || {};
  const preview = !!ctx.preview;
  const expanded = !!ctx.expanded;

  const badge = post.sample
    ? '<span class="gh-badge-sample">Sampuli</span>'
    : '<span class="gh-badge-sample gh-badge-mine">Haijachapishwa mtandaoni</span>';

  const authorId = post.authorId || '';
  const verified = post.verified === true
    ? '<svg class="ic gh-verified" aria-label="Imethibitishwa"><use href="#i-check-circle"/></svg>'
    : '';

  const rawText = String(post.text || '');
  const isLong = rawText.length > COLLAPSE_AT;
  const shown = (isLong && !expanded && !preview) ? truncate(rawText, COLLAPSE_AT) : rawText;

  const expandBtn = (isLong && !preview)
    ? `<button type="button" class="gh-moretext" data-expand="${escapeHtml(post.id)}"
         aria-expanded="${expanded}">${expanded ? 'Punguza' : 'Zaidi'}</button>`
    : '';

  const title = post.title ? `<h3 class="gh-post-title">${escapeHtml(post.title)}</h3>` : '';
  const commentCount = ctx.commentCount || 0;
  const commentLabel = commentCount ? `Maoni (${commentCount})` : 'Maoni';

  const canSend = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const actionRow = preview ? '' : `
    <div class="gh-post-actions" role="group" aria-label="Vitendo vya chapisho">
      <button type="button" class="gh-act ${flags.helpful ? 'is-on' : ''}" data-act="helpful"
              data-post="${escapeHtml(post.id)}" aria-pressed="${!!flags.helpful}"
              aria-label="Imenisaidia" title="Imenisaidia">
        <svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg><span>Imenisaidia</span>
      </button>
      <button type="button" class="gh-act ${commentCount ? 'has-count' : ''}" data-act="comment"
              data-post="${escapeHtml(post.id)}" aria-label="${commentLabel}" title="${commentLabel}">
        <svg class="ic" aria-hidden="true"><use href="#i-message"/></svg><span>${commentLabel}</span>
      </button>
      <button type="button" class="gh-act" data-act="share" data-post="${escapeHtml(post.id)}"
              aria-label="Shiriki" title="Shiriki">
        <svg class="ic" aria-hidden="true"><use href="#i-share"/></svg><span>Shiriki</span>
      </button>
      <button type="button" class="gh-act ${flags.saved ? 'is-on' : ''}" data-act="save"
              data-post="${escapeHtml(post.id)}" aria-pressed="${!!flags.saved}"
              aria-label="Hifadhi" title="Hifadhi">
        <svg class="ic" aria-hidden="true"><use href="#i-bookmark"/></svg><span>${flags.saved ? 'Imehifadhiwa' : 'Hifadhi'}</span>
      </button>
      <button type="button" class="gh-act gh-act-more" data-act="more" data-post="${escapeHtml(post.id)}"
              aria-haspopup="menu" aria-expanded="false" aria-label="Vitendo zaidi" title="Vitendo zaidi">
        <svg class="ic"><use href="#i-more-vertical"/></svg>
      </button>
      <div class="gh-post-menu" id="ghmenu-${escapeHtml(post.id)}" role="menu">
        <button type="button" role="menuitem" class="gh-menu-item" data-menu="follow" data-post="${escapeHtml(post.id)}">
          <svg class="ic"><use href="#i-user-plus"/></svg>
          <span data-follow-label>${flags.following ? 'Acha kufuata' : 'Fuata mwandishi'}</span>
        </button>
        <button type="button" role="menuitem" class="gh-menu-item" data-menu="profile" data-post="${escapeHtml(post.id)}">
          <svg class="ic"><use href="#i-user"/></svg> <span>Fungua wasifu</span>
        </button>
        <button type="button" role="menuitem" class="gh-menu-item" data-menu="send" data-post="${escapeHtml(post.id)}"
                ${canSend ? '' : 'disabled aria-disabled="true" title="Kifaa hiki hakitumii menyu ya kushiriki"'}>
          <svg class="ic"><use href="#i-send"/></svg>
          <span>Tuma kwa mtu${canSend ? '' : ' (haipatikani)'}</span>
        </button>
        <button type="button" role="menuitem" class="gh-menu-item" data-menu="copy" data-post="${escapeHtml(post.id)}">
          <svg class="ic"><use href="#i-link"/></svg> <span>Nakili kiungo</span>
        </button>
        <button type="button" role="menuitem" class="gh-menu-item gh-menu-danger" data-menu="report" data-post="${escapeHtml(post.id)}">
          <svg class="ic"><use href="#i-flag"/></svg> <span>Ripoti</span>
        </button>
      </div>
    </div>`;

  const role = ctx.role || null;
  const roleStyle = role ? `--gh-role:${role.accent};--gh-role-soft:${role.soft};--gh-role-ink:${role.ink}` : '';
  const roleChip = role && role.id !== 'member'
    ? `<span class="gh-post-avatar-role" title="${escapeHtml(role.label)}">
         <svg class="ic" aria-hidden="true"><use href="#${role.icon}"/></svg></span>`
    : '';
  const roleLine = role && role.id !== 'member'
    ? `<div class="gh-post-role">${escapeHtml(role.label)}</div>`
    : '';

  return `
    <article class="gh-post" data-post="${escapeHtml(post.id)}" style="${roleStyle}">
      <div class="gh-post-head">
        <button type="button" class="gh-post-author" data-profile="${escapeHtml(post.authorId || '')}"
                aria-label="Fungua wasifu wa ${escapeHtml(post.authorName)}">
          <span class="gh-post-avatar" aria-hidden="true">${escapeHtml(post.initials || 'GH')}${roleChip}</span>
          <span class="gh-post-who">
            <span class="gh-post-name">${escapeHtml(post.authorName)}${verified}</span>
            ${roleLine}
            <span class="gh-post-type">${escapeHtml(typeLabel(post.type))} · ${escapeHtml(audienceLabel(post.audience))}</span>
          </span>
        </button>
        ${(preview || ctx.hideFollow) ? '' : `<button type="button" class="gh-post-follow ${flags.following ? 'is-on' : ''}"
            data-follow-btn data-post="${escapeHtml(post.id)}"
            aria-pressed="${!!flags.following}">${flags.following ? 'Unafuata' : 'Fuata'}</button>`}
      </div>
      <div class="gh-post-meta">
        ${badge}
        <span class="gh-post-topic">${escapeHtml(post.topicLabel)}</span>
        <span class="gh-post-time">${escapeHtml(post.timeLabel || '')}</span>
      </div>
      ${title}
      <p class="gh-post-text">${escapeHtml(shown)}</p>
      ${expandBtn}
      ${mediaHtml(post)}
      ${actionRow}
    </article>`;
}

export { COLLAPSE_AT };
export const formatAttachmentSize = fmtSize;
