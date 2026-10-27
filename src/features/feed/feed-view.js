/**
 * GuardHai · features/feed/feed-view.js
 * The Uwanja feed: loads posts (real ones from IndexedDB + labelled seed posts),
 * resolves engagement state, renders cards and owns the feed-level interactions
 * (topic filter, expand/collapse, photo lightbox).
 */
import { postCard } from './post-card.js';
import { SAMPLE_POSTS } from '../../data/seed-posts.js';
import { listPosts, getPost } from '../../services/posts.service.js';
import { flagsFor, commentCount } from '../../services/engagement.service.js';
import { primeUrls } from '../../services/media.service.js';
import { currentUser } from '../../services/session.service.js';
import { getProfile } from '../../services/profile.service.js';
import { primaryRoleOf } from '../../domain/profile.js';
import { bus, EVENTS } from '../../core/bus.js';
import { escapeHtml } from '../../core/dom.js';
import { fmtSize } from '../../core/format.js';
import { openSheet } from '../../ui/sheet.js';
import { createLogger } from '../../core/logger.js';

const log = createLogger('feed');

export const feedState = {
  topic: 'all',
  query: '',
  posts: [],
  flags: {},
  counts: {},
  expanded: {},
  loading: false
};

/* --------------------------------------------------------------- states */
/** Skeleton placeholders: the shape of a card, no invented content. */
function skeletonHtml() {
  return `<div class="gh-feed-skel" aria-hidden="true">
    ${[0, 1].map(() => `
      <div class="gh-skel-card">
        <div class="gh-skel-row"><span class="gh-skel-dot"></span><span class="gh-skel-bar w40"></span></div>
        <span class="gh-skel-bar w90"></span><span class="gh-skel-bar w70"></span>
        <div class="gh-skel-row"><span class="gh-skel-bar w20"></span><span class="gh-skel-bar w20"></span></div>
      </div>`).join('')}
  </div>`;
}

/**
 * Empty, no-results and error states. Each says what actually happened and
 * offers the one action that can change it; nothing pretends to have loaded.
 */
function stateHtml(kind) {
  if (kind === 'error') {
    return `<div class="gh-feed-state is-error" role="alert">
      <svg class="ic" aria-hidden="true"><use href="#i-alert-circle"/></svg>
      <b>Chapisho hazikupatikana</b>
      <span>Hifadhi ya kifaa hiki haikusomeka. Hakuna kilichopotea — jaribu tena.</span>
      <button type="button" class="gh-btn gh-btn-outline" data-feed-retry>
        <svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg> Jaribu tena
      </button>
    </div>`;
  }
  if (kind === 'search') {
    return `<div class="gh-feed-state">
      <svg class="ic" aria-hidden="true"><use href="#i-search"/></svg>
      <b>Hakuna chapisho linalolingana</b>
      <span>Hakuna matokeo kwa utafutaji huu kwenye mada iliyochaguliwa.</span>
      <button type="button" class="gh-btn gh-btn-outline" data-feed-clear>
        <svg class="ic" aria-hidden="true"><use href="#i-x"/></svg> Ondoa kichujio
      </button>
    </div>`;
  }
  return `<div class="gh-feed-state">
    <svg class="ic" aria-hidden="true"><use href="#i-list"/></svg>
    <b>Hakuna chapisho kwenye mada hii bado</b>
    <span>Kuwa wa kwanza kushiriki elimu, swali au taarifa kwenye mada hii.</span>
    <button type="button" class="gh-btn gh-btn-outline" data-feed-clear>
      <svg class="ic" aria-hidden="true"><use href="#i-arrow-left"/></svg> Onyesha mada zote
    </button>
  </div>`;
}

/** load + decorate everything the cards need, then paint */
export async function renderFeed({ keepScroll = false } = {}) {
  const host = document.getElementById('ghFeed');
  if (!host) return;

  const scrollY = window.scrollY;
  host.setAttribute('aria-busy', 'true');
  if (!feedState.posts.length && !keepScroll) host.innerHTML = skeletonHtml();

  const user = currentUser();
  const topic = feedState.topic;

  let mine;
  try {
    mine = await listPosts({ topic });
  } catch (err) {
    log.error('feed load failed', err);
    host.innerHTML = stateHtml('error');
    host.removeAttribute('aria-busy');
    return;
  }
  const samples = SAMPLE_POSTS.filter((p) => topic === 'all' || p.topic === topic);
  const q = feedState.query.trim().toLowerCase();
  const posts = [...mine, ...samples].filter((p) => !q || [
    p.text, p.title, p.authorName, p.topicLabel, p.alertText, p.location
  ].filter(Boolean).join(' ').toLowerCase().includes(q));

  await primeUrls(posts);

  const flags = {};
  const counts = {};
  const roles = {};
  const people = {};
  await Promise.all(posts.map(async (p) => {
    flags[p.id] = await flagsFor(p.id, user);
    counts[p.id] = await commentCount(p.id);
    const profile = await getProfile(p.authorId);
    roles[p.authorId] = profile ? primaryRoleOf(profile) : null;
    people[p.authorId] = profile || null;
  }));

  feedState.posts = posts;
  feedState.flags = flags;
  feedState.counts = counts;

  if (!posts.length) {
    host.innerHTML = stateHtml(feedState.query.trim() ? 'search' : 'empty');
    host.removeAttribute('aria-busy');
    return;
  }

  // which of these posts the current user has already reposted
  const myReposts = new Set(posts
    .filter((p) => p.authorId === user.id && p.repostOf?.postId)
    .map((p) => p.repostOf.postId));

  host.innerHTML = posts.map((p) => postCard(p, {
    flags: flags[p.id],
    commentCount: counts[p.id] || 0,
    expanded: feedState.expanded[p.id],
    role: roles[p.authorId] || null,
    author: people[p.authorId] || null,
    reposted: myReposts.has(p.id)
  })).join('');

  host.removeAttribute('aria-busy');
  if (keepScroll) window.scrollTo({ top: scrollY });
}

/** client-side search over the posts already loaded (no network, no fake hits) */
export async function setQuery(term) {
  feedState.query = String(term || '');
  await renderFeed({ keepScroll: true });
  return feedState.posts.length;
}

export async function clearQuery() {
  feedState.query = '';
  await renderFeed();
}

export async function showAllTopics() {
  feedState.query = '';
  feedState.topic = 'all';
  document.querySelectorAll('#ghTopics .gh-topic')
    .forEach((b) => b.classList.toggle('is-active', b.dataset.topic === 'all'));
  await renderFeed();
}

export function filterTopic(topic, btn) {
  feedState.topic = topic;
  document.querySelectorAll('#ghTopics .gh-topic').forEach((b) => b.classList.remove('is-active'));
  if (btn) btn.classList.add('is-active');
  else document.querySelectorAll('#ghTopics .gh-topic')
    .forEach((b) => b.classList.toggle('is-active', b.dataset.topic === topic));
  renderFeed();
}

export function toggleExpand(id, btn) {
  feedState.expanded[id] = !feedState.expanded[id];
  const post = feedState.posts.find((p) => p.id === id);
  const article = btn.closest('.gh-post');
  if (!post || !article) return;
  const node = article.querySelector('.gh-post-text');
  const full = String(post.text || '');
  node.textContent = feedState.expanded[id] ? full : full.slice(0, 240).replace(/\s+\S*$/, '') + '…';
  btn.setAttribute('aria-expanded', String(!!feedState.expanded[id]));
  btn.textContent = feedState.expanded[id] ? 'Punguza' : 'Zaidi';
}

export async function lightbox(postId, index) {
  const post = feedState.posts.find((p) => p.id === postId) || await getPost(postId);
  const images = (post?.media || []).filter((m) => m.kind === 'image' && !m.placeholder);
  if (!images.length) return;
  const img = images[index] || images[0];
  const { getCachedUrl } = await import('../../services/media.service.js');
  const src = img.url || getCachedUrl(img.id);
  openSheet('Picha', `
    <img src="${escapeHtml(src)}" alt="${escapeHtml(img.name || 'Picha')}"
         style="width:100%;border-radius:12px;display:block;">
    <p class="gh-sheet-p" style="margin-top:10px;">${escapeHtml(img.name || '')} ·
       ${fmtSize(img.size)} · <b>kwenye kifaa hiki pekee</b></p>
  `);
}

/** refresh a single card after an engagement change (cheap, no full re-render) */
export function updateCardCounters(postId, { count, flags }) {
  const article = document.querySelector(`.gh-post[data-post="${CSS.escape(postId)}"]`);
  if (!article) return;
  if (typeof count === 'number') {
    const btn = article.querySelector('[data-act="comment"]');
    if (btn) {
      const label = count ? `Maoni (${count})` : 'Maoni';
      const span = btn.querySelector('span');
      if (span) span.textContent = label;
      btn.classList.toggle('has-count', count > 0);
      btn.setAttribute('aria-label', label);
    }
  }
  if (flags) {
    const like = article.querySelector('[data-act="helpful"]');
    if (like) { like.classList.toggle('is-on', !!flags.helpful); like.setAttribute('aria-pressed', String(!!flags.helpful)); }
    const save = article.querySelector('[data-act="save"]');
    if (save) {
      save.classList.toggle('is-on', !!flags.saved);
      save.setAttribute('aria-pressed', String(!!flags.saved));
      const span = save.querySelector('span');
      if (span) span.textContent = flags.saved ? 'Imehifadhiwa' : 'Hifadhi';
    }
    const follow = article.querySelector('[data-follow-btn]');
    if (follow) {
      follow.classList.toggle('is-on', !!flags.following);
      follow.setAttribute('aria-pressed', String(!!flags.following));
      follow.textContent = flags.following ? 'Unafuata' : 'Fuata';
    }
    const menuLabel = article.querySelector('[data-follow-label]');
    if (menuLabel) menuLabel.textContent = flags.following ? 'Acha kufuata' : 'Fuata mwandishi';
  }
}

// keep the feed in sync with the services
bus.on(EVENTS.POST_CREATED, () => renderFeed({ keepScroll: true }));
bus.on(EVENTS.POST_REMOVED, () => renderFeed({ keepScroll: true }));
