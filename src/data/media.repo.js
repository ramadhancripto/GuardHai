/**
 * GuardHai · data/media.repo.js
 * Binary attachment storage. Blobs live in IndexedDB; the view layer turns them
 * into short-lived object URLs. Nothing is uploaded anywhere.
 */
import { openDatabase } from './db.js';

export class LocalMediaRepository {
  constructor(db) { this.db = db; }

  async save(mediaId, blob, meta = {}) {
    await this.db.put('media', {
      id: mediaId,
      blob,
      name: meta.name || '',
      type: meta.type || blob?.type || '',
      size: meta.size ?? blob?.size ?? 0,
      createdAt: new Date().toISOString()
    });
    return mediaId;
  }

  async get(mediaId) { return this.db.get('media', mediaId); }

  async remove(mediaId) { return this.db.delete('media', mediaId); }

  async totalBytes() {
    const rows = await this.db.all('media');
    return rows.reduce((sum, r) => sum + (r.size || 0), 0);
  }

  async clear() { await this.db.clear('media'); }
}

export async function createMediaRepository() {
  return new LocalMediaRepository(await openDatabase());
}
