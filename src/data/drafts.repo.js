/**
 * GuardHai · data/drafts.repo.js
 * Drafts keep text + links only. Media blobs are intentionally NOT persisted
 * with a draft (size + privacy), and the UI tells the user how many were dropped.
 */
import { openDatabase } from './db.js';

const MAX_DRAFTS = 20;

export class LocalDraftRepository {
  constructor(db) { this.db = db; }

  async list() {
    const rows = await this.db.all('drafts');
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, MAX_DRAFTS);
  }

  async save(draft) {
    const row = { ...draft, createdAt: draft.createdAt || new Date().toISOString() };
    await this.db.put('drafts', row);
    const all = await this.list();
    // trim the oldest beyond the cap
    for (const old of all.slice(MAX_DRAFTS)) await this.db.delete('drafts', old.id);
    return row;
  }

  async latest() { return (await this.list())[0] || null; }

  async remove(id) { return this.db.delete('drafts', id); }

  async count() { return (await this.list()).length; }
}

export async function createDraftRepository() {
  return new LocalDraftRepository(await openDatabase());
}
