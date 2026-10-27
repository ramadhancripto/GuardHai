/**
 * GuardHai · data/posts.repo.js
 * Repository interface + the two real implementations:
 *   • LocalPostRepository  — IndexedDB (default; the local-first backend)
 *   • HttpPostRepository   — REST client for the future server API
 * Both satisfy the same contract, so services never know which one runs:
 *
 *   list({ topic })   get(id)   create(post)   update(post)   remove(id)   count()
 *
 * The HTTP one is not enabled yet (there is no server); it is included so the
 * seam exists and so integration is a config change, not a refactor.
 */
import { openDatabase } from './db.js';
import { normalizePost } from '../domain/post.js';

export class LocalPostRepository {
  constructor(db) { this.db = db; }
  get kind() { return 'local'; }

  async list({ topic = 'all' } = {}) {
    const rows = await this.db.all('posts');
    return rows
      .map(normalizePost)
      .filter(Boolean)
      .filter((p) => p.status === 'published')
      .filter((p) => topic === 'all' || p.topic === topic)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async get(id) {
    return normalizePost(await this.db.get('posts', id));
  }

  async create(post) {
    const row = normalizePost(post);
    await this.db.put('posts', row);
    return row;
  }

  async update(post) {
    const row = normalizePost({ ...post, updatedAt: new Date().toISOString() });
    await this.db.put('posts', row);
    return row;
  }

  async remove(id) {
    const post = await this.get(id);
    if (!post) return false;
    await this.db.put('posts', { ...post, status: 'deleted', updatedAt: new Date().toISOString() });
    return true;
  }

  async count() {
    return (await this.db.all('posts')).filter((p) => p.status === 'published').length;
  }
}

/**
 * REST implementation. Endpoints assumed (documented in docs/ARCHITECTURE.md):
 *   GET    /api/posts?topic=…
 *   GET    /api/posts/:id
 *   POST   /api/posts
 *   PATCH  /api/posts/:id
 *   DELETE /api/posts/:id
 */
export class HttpPostRepository {
  constructor({ baseUrl = '/api', fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    this.baseUrl = baseUrl;
    this.fetch = fetchImpl;
  }
  get kind() { return 'http'; }

  async _json(res) {
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.status === 204 ? null : res.json();
  }

  async list({ topic = 'all' } = {}) {
    const url = `${this.baseUrl}/posts?topic=${encodeURIComponent(topic)}`;
    return (await this._json(await this.fetch(url))).map(normalizePost);
  }

  async get(id) {
    return normalizePost(await this._json(await this.fetch(`${this.baseUrl}/posts/${id}`)));
  }

  async create(post) {
    return normalizePost(await this._json(await this.fetch(`${this.baseUrl}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    })));
  }

  async update(post) {
    return normalizePost(await this._json(await this.fetch(`${this.baseUrl}/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    })));
  }

  async remove(id) {
    await this.fetch(`${this.baseUrl}/posts/${id}`, { method: 'DELETE' });
    return true;
  }

  async count() {
    return (await this.list({})).length;
  }
}

export async function createPostRepository({ driver = 'local', baseUrl } = {}) {
  if (driver === 'http') return new HttpPostRepository({ baseUrl });
  return new LocalPostRepository(await openDatabase());
}
