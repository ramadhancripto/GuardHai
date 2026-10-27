/**
 * GuardHai · services/posts.service.js
 * Use-cases for the feed. UI never talks to a repository directly: it calls a
 * service, the service validates with the domain layer, persists, and emits an
 * event. Swapping LocalPostRepository for HttpPostRepository is a config change.
 */
import { buildPost, validateDraft, normalizePost } from '../domain/post.js';
import { createPostRepository } from '../data/posts.repo.js';
import { currentUser } from './session.service.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import { appConfig } from '../config.js';

const log = createLogger('posts');

let repoPromise = null;
const repo = () => (repoPromise ||= createPostRepository({
  driver: appConfig.dataDriver,
  baseUrl: appConfig.apiBaseUrl
}));

export async function listPosts({ topic = 'all' } = {}) {
  const rows = await (await repo()).list({ topic });
  return rows.map(normalizePost).filter(Boolean);
}

export async function getPost(id) {
  return (await repo()).get(id);
}

/**
 * Publish. Throws a ValidationError-shaped object the composer can render.
 * @returns {Promise<{ok: true, post: object} | {ok: false, errors: string[]}>}
 */
export async function publishPost(form, { user = currentUser() } = {}) {
  const errors = validateDraft(form);
  if (errors.length) return { ok: false, errors };

  const post = buildPost(form, {
    id: user.id, name: user.name, initials: user.initials, isSelf: true
  });

  try {
    const stored = await (await repo()).create(post);
    bus.emit(EVENTS.POST_CREATED, stored);
    log.info('post created', stored.id);
    return { ok: true, post: stored };
  } catch (err) {
    log.error('publish failed', err);
    return { ok: false, errors: ['Haikuweza kuhifadhi chapisho. Jaribu tena.'] };
  }
}

/**
 * Repost = a real second row in the feed that points back at the original.
 * No new schema version: `repostOf` is an optional field, and old rows simply
 * do not have it. Nothing leaves the device.
 */
export async function findMyRepost(postId, { user = currentUser() } = {}) {
  const rows = (await listPosts({})).filter((p) => p.authorId === user.id && p.repostOf?.postId === postId);
  return rows[0] || null;
}

export async function repost(original, { user = currentUser() } = {}) {
  // a repost points at the original post, never at another repost
  if (original.repostOf) return { ok: false, errors: ['Rudia chapisho asili, si rudio lingine.'] };

  const existing = await findMyRepost(original.id, { user });
  if (existing) return { ok: true, post: existing, already: true };

  const copy = buildPost({
    title: '',
    text: original.text,
    type: original.type,
    topic: original.topic,
    audience: original.audience,
    media: original.media
  }, { id: user.id, name: user.name, initials: user.initials, isSelf: true },
  { repostOf: { postId: original.id, authorName: original.authorName } });

  // reposting demo content must stay labelled as demo content
  if (original.sample) copy.sample = true;

  try {
    const stored = await (await repo()).create(copy);
    bus.emit(EVENTS.POST_CREATED, stored);
    log.info('repost created', stored.id, '←', original.id);
    return { ok: true, post: stored };
  } catch (err) {
    log.error('repost failed', err);
    return { ok: false, errors: ['Haikuweza kuhifadhi rudio. Jaribu tena.'] };
  }
}

export async function undoRepost(postId, { user = currentUser() } = {}) {
  const mine = await findMyRepost(postId, { user });
  if (!mine) return { ok: true, removed: false };
  const ok = await deletePost(mine.id);
  return { ok, removed: ok };
}

export async function deletePost(id) {
  const ok = await (await repo()).remove(id);
  if (ok) bus.emit(EVENTS.POST_REMOVED, { id });
  return ok;
}

export async function countPosts() {
  return (await repo()).count();
}
