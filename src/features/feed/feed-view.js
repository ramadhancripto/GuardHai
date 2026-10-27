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

export const feedState = {
  topic: 'all',
  posts: [],
  flags: {},
  counts: {},
  expanded: {},
  loading: false
};

/** load + decorate everything the cards need, then paint */
export async function renderFeed({ keepScroll = false } = {}) {
  const host = document.getElementById('ghFeed');
  if (!host) return;

  const scrollY = window.scrollY;
  host.setAttribute('aria-busy', 'true');

  const user = currentUser();
  const topic = feedState.topic;

  const mine = await listPosts({ topic });
  const samples = SAMPLE_POSTS.filter((p) => topic === 'all' || p.topic === topic);
  const posts = [...mine, ...samples];

  await primeUrls(posts);

  const flags = {};
  const counts = {};
  const roles = {};
  await Promise.all(posts.map(async (p) => {
    flags[p.id] = await flagsFor(p.id, user);
    counts[p.id] = await commentCount(p.id);
    const profile = await getProfile(p.authorId);
    roles[p.authorId] = profile ? primaryRoleOf(profile) : null;
  }));

  feedState.posts = posts;
  feedState.flags = flags;
  feedState.counts = counts;

  if (!posts.length) {
    host.innerHTML = '<div class="gh-feed-empty">Hakuna chapisho kwenye mada hii bado.</div>';
    host.removeAttribute('aria-busy');
    return;
  }

  host.innerHTML = posts.map((p) => postCard(p, {
    flags: flags[p.id],
    commentCount: counts[p.id] || 0,
    expanded: feedState.expanded[p.id],
    role: roles[p.authorId] || null
  })).join('');

  host.removeAttribute('aria-busy');
  if (keepScroll) window.scrollTo({ top: scrollY });
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
