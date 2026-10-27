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

export async function deletePost(id) {
  const ok = await (await repo()).remove(id);
  if (ok) bus.emit(EVENTS.POST_REMOVED, { id });
  return ok;
}

export async function countPosts() {
  return (await repo()).count();
}
