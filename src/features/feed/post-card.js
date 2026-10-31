/**
 * GuardHai · features/feed/post-card.js
 * Pure rendering of one post. No state, no side effects beyond reading the
 * media URL cache — everything it needs arrives in `ctx`.
 *
 * ctx = { flags, commentCount, expanded, mediaUrl(id), preview, role, author,
 *         hideFollow }
 *
 * Layout follows the product showcase: a coloured type badge on top, the author
 * row with a real photo when the profile has one, a title line, the body, the
 * media (optionally with a warning band) and the five icon actions.
 */
import { escapeHtml } from '../../core/dom.js';
import { typeLabel, audienceLabel, normalizeTopic, topicLabel } from '../../domain/post.js';
import { postBlocks } from './post-blocks.js';
import { fmtSize, truncate } from '../../core/format.js';
import { getCachedUrl } from '../../services/media.service.js';

const COLLAPSE_AT = 240;

/* --------------------------------------------------------------- badges */
/**
 * The badge is derived from the post itself, never invented: an institution
 * announcement is `Taasisi`, a disaster topic is `Majanga`, and so on. The word
 * is always shown next to the coloured chip, so colour is never the only cue.
 */
/**
 * The badge describes the TOPIC of the post, never its type: the type is shown
 * as its own chip (`typeLabel`), so the two axes can never be confused.
 */
export function typeBadge(post) {
  const topic = normalizeTopic(post.topic);
  if (topic === 'majanga') return { cls: 'gh-type-disaster', label: 'Majanga', icon: 'i-alert-triangle' };
  if (topic === 'afya') return { cls: 'gh-type-health', label: 'Afya', icon: 'i-heart-pulse' };
  if (topic === 'taasisi') return { cls: 'gh-type-org', label: 'Taasisi', icon: 'i-building' };
  if (topic === 'kusaidiana') return { cls: 'gh-type-aid', label: 'Kusaidiana', icon: 'i-users' };
  return { cls: 'gh-type-safety', label: 'Usalama', icon: 'i-shield-check' };
}

/* ---------------------------------------------------------------- media */
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
    const count = images.length > 1
      ? `<span class="gh-media-count"><svg class="ic" aria-hidden="true"><use href="#i-image-plus"/></svg>${images.length}</span>`
      : '';
    html += `<div class="gh-media-frame">${count}<div class="${cls}">` + images.map((m, idx) => {
      if (m.placeholder) {
        return '<div class="gh-media-ph"><svg class="ic"><use href="#i-image-plus"/></svg><span>Picha (sampuli)</span></div>';
      }
      const src = m.url || getCachedUrl(m.id);
      return `<button type="button" class="gh-gal-item" data-media="${escapeHtml(m.id)}"
                 data-post="${escapeHtml(post.id)}" data-index="${idx}"
                 aria-label="Fungua picha ${idx + 1}">
                <img src="${escapeHtml(src)}" alt="${escapeHtml(m.name || `Picha ${idx + 1}`)}" loading="lazy">
              </button>`;
    }).join('') + '</div></div>';
  }

  if (video) {
    if (video.placeholder) {
      // one label, not three: the pill already says "Video · sampuli", so the
      // frame carries only the play mark and one honest line under it
      html += `<div class="gh-media-frame is-video"><span class="gh-media-kind">Video · sampuli</span>
        <div class="gh-media-ph gh-media-ph-wide is-video">
          <span class="gh-media-play" aria-hidden="true"><svg class="ic"><use href="#i-play"/></svg></span>
          <span class="gh-media-cap">Hakuna video halisi</span>
        </div></div>`;
    } else {
      const src = video.url || getCachedUrl(video.id);
      const poster = video.poster ? ` poster="${escapeHtml(video.poster)}"` : '';
      html += `<div class="gh-media-frame is-video"><span class="gh-media-kind">Video</span>
        <div class="gh-video-wrap"><video class="gh-video" controls preload="metadata" playsinline${poster} src="${escapeHtml(src)}"></video></div></div>`;
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
    html += links.map((l) => {
      let host = '';
      try { host = new URL(l.url).hostname.replace(/^www\./, ''); } catch (_) { host = ''; }
      return `
      <a class="gh-linkcard" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer nofollow">
        <span class="gh-linkcard-ico" aria-hidden="true"><svg class="ic"><use href="#i-link"/></svg></span>
        <span class="gh-linkcard-body">
          <span class="gh-linkcard-t">${escapeHtml(l.title || l.url)}</span>
          ${host ? `<span class="gh-linkcard-d">${escapeHtml(host)}</span>` : ''}
        </span>
        <svg class="ic gh-linkcard-go" aria-hidden="true"><use href="#i-arrow-right"/></svg>
      </a>`;
    }).join('');
  }
  return html;
}

/* ----------------------------------------------------------------- card */
export function postCard(post, ctx = {}) {
  const flags = ctx.flags || {};
  const preview = !!ctx.preview;
  const expanded = !!ctx.expanded;

  const badge = post.sample
    ? '<span class="gh-badge-sample">Sampuli</span>'
    : '<span class="gh-badge-sample gh-badge-mine">Haijachapishwa mtandaoni</span>';

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
    ${post.repostOf ? `<p class="gh-post-reposted">
      <svg class="ic" aria-hidden="true"><use href="#i-repost"/></svg>
      Umerudia kutoka kwa ${escapeHtml(post.repostOf.authorName || 'mtumiaji mwingine')}
    </p>` : ''}
    <div class="gh-post-actions" role="group" aria-label="Vitendo vya chapisho">
      <button type="button" class="gh-act ${flags.helpful ? 'is-on' : ''}" data-act="helpful"
              data-post="${escapeHtml(post.id)}" aria-pressed="${!!flags.helpful}"
              aria-label="Imenisaidia" title="Imenisaidia">
        <svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg><span>Imenisaidia</span>
      </button>
      <button type="button" class="gh-act gh-act-comment ${commentCount ? 'has-count is-on' : ''}" data-act="comment"
              data-post="${escapeHtml(post.id)}" aria-label="${commentLabel}" title="${commentLabel}">
        <svg class="ic" aria-hidden="true"><use href="#i-message"/></svg><span>${commentLabel}</span>
      </button>
      <button type="button" class="gh-act" data-act="share" data-post="${escapeHtml(post.id)}"
              aria-label="Shiriki" title="Shiriki">
        <svg class="ic" aria-hidden="true"><use href="#i-share"/></svg><span>Shiriki</span>
      </button>
      <button type="button" class="gh-act gh-act-save ${flags.saved ? 'is-on' : ''}" data-act="save"
              data-post="${escapeHtml(post.id)}" aria-pressed="${!!flags.saved}"
              aria-label="Hifadhi" title="Hifadhi">
        <svg class="ic" aria-hidden="true"><use href="#i-bookmark"/></svg><span>${flags.saved ? 'Imehifadhiwa' : 'Hifadhi'}</span>
      </button>
      ${post.repostOf ? `
      <button type="button" class="gh-act gh-act-repost is-on" data-act="unrepost"
              data-post="${escapeHtml(post.repostOf.postId)}" aria-pressed="true"
              aria-label="Ondoa rudio" title="Ondoa rudio">
        <svg class="ic" aria-hidden="true"><use href="#i-repost"/></svg><span>Ondoa rudio</span>
      </button>` : `
      <button type="button" class="gh-act gh-act-repost ${ctx.reposted ? 'is-on' : ''}" data-act="repost"
              data-post="${escapeHtml(post.id)}" aria-pressed="${!!ctx.reposted}"
              aria-label="${ctx.reposted ? 'Ondoa rudio' : 'Rudia chapisho'}"
              title="${ctx.reposted ? 'Ondoa rudio' : 'Rudia'}">
        <svg class="ic" aria-hidden="true"><use href="#i-repost"/></svg><span>${ctx.reposted ? 'Imerudiwa' : 'Rudia'}</span>
      </button>`}
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
        <button type="button" role="menuitem" class="gh-menu-item" data-menu="all" data-post="${escapeHtml(post.id)}">
          <svg class="ic"><use href="#i-list"/></svg> <span>Vitendo vyote</span>
        </button>
      </div>
    </div>`;

  const role = ctx.role || null;
  const author = ctx.author || {};
  const roleStyle = role ? `--gh-role:${role.accent};--gh-role-soft:${role.soft};--gh-role-ink:${role.ink}` : '';
  const roleChip = role && role.id !== 'member'
    ? `<span class="gh-post-avatar-role" title="${escapeHtml(role.label)}">
         <svg class="ic" aria-hidden="true"><use href="#${role.icon}"/></svg></span>`
    : '';
  const roleLine = role && role.id !== 'member'
    ? `<span class="gh-post-role">${escapeHtml(role.label)}</span>`
    : '';

  const photo = author.avatarUrl || null;
  const avatar = photo
    ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy">`
    : escapeHtml(post.initials || 'GH');

  const type = typeBadge(post);
  const place = post.location || author.location || '';
  const timeLine = [post.timeLabel || '', place].filter(Boolean).join(' · ');
  const media = mediaHtml(post);
  const blocksHtml = postBlocks(post);
  const mediaBlock = media
    ? `<div class="gh-post-media-wrap">${media}${post.alertText
        ? `<div class="gh-media-alert" role="note">
             <svg class="ic" aria-hidden="true"><use href="#i-alert-triangle"/></svg>
             <span>${escapeHtml(post.alertText)}<small>Sampuli — si arifa ya dharura ya moja kwa moja.</small></span>
           </div>` : ''}</div>`
    : '';

  return `
    <article class="gh-post" data-post="${escapeHtml(post.id)}" style="${roleStyle}">
      <div class="gh-post-head">
        <button type="button" class="gh-post-author" data-profile="${escapeHtml(post.authorId || '')}"
                aria-label="Fungua wasifu wa ${escapeHtml(post.authorName)}">
          <span class="gh-post-avatar" aria-hidden="true">${avatar}${roleChip}</span>
          <span class="gh-post-who">
            <span class="gh-post-name">${escapeHtml(post.authorName)}${verified}</span>
            ${roleLine}
            <span class="gh-post-time">${escapeHtml(timeLine)}</span>
          </span>
        </button>
        <div class="gh-post-headend">
          ${(preview || ctx.hideFollow) ? '' : `<button type="button" class="gh-post-follow ${flags.following ? 'is-on' : ''}"
              data-follow-btn data-post="${escapeHtml(post.id)}"
              aria-pressed="${!!flags.following}">${flags.following ? 'Unafuata' : 'Fuata'}</button>`}
          ${(preview || ctx.hideFollow) ? '' : `<button type="button" class="gh-post-more" data-act="more"
              data-post="${escapeHtml(post.id)}" aria-haspopup="menu" aria-expanded="false"
              aria-label="Vitendo zaidi" title="Vitendo zaidi">
              <svg class="ic" aria-hidden="true"><use href="#i-more-vertical"/></svg>
            </button>`}
        </div>
      </div>

      <div class="gh-post-topline">
        <span class="gh-type-badge ${type.cls}" title="${escapeHtml(type.label)}">
          <svg class="ic" aria-hidden="true"><use href="#${type.icon}"/></svg><span class="gh-sr">${escapeHtml(type.label)}</span>
        </span>
        ${badge}
        <span class="gh-post-topic">${escapeHtml(post.topicLabel || topicLabel(post.topic))}</span>
        <span class="gh-post-audience">${escapeHtml(typeLabel(post.type))} · ${escapeHtml(audienceLabel(post.audience))}</span>
      </div>
      ${title}
      <p class="gh-post-text">${escapeHtml(shown)}</p>
      ${expandBtn}
      ${mediaBlock}
      ${post.sample ? '' : ''}${blocksHtml}
      ${actionRow}
    </article>`;
}

export { COLLAPSE_AT };
export const formatAttachmentSize = fmtSize;
