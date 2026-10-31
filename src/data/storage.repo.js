/**
 * GuardHai · data/storage.repo.js
 * Local persistence for the Storage Center. Four stores, all on this device:
 *
 *   storageItems    every record (documents and evidence) — the catalogue
 *   storageCustody  append-only chain of custody / audit trail per record
 *   storageCases    incidents and cases that records can be attached to
 *   storageShares   access grants (recorded locally; nothing is transmitted)
 *
 * Files themselves are blobs in the `media` store, referenced by `blobKey`, so
 * the existing media repository stays the single place that holds bytes.
 */
import { openDatabase } from './db.js';

export class StorageRepository {
  constructor(db) {
    this.db = db;
  }

  /* ------------------------------------------------------------- items */
  async allItems() { return this.db.all('storageItems'); }

  async getItem(id) { return this.db.get('storageItems', id); }

  async putItem(row) { return this.db.put('storageItems', row); }

  async removeItem(id) { return this.db.delete('storageItems', id); }

  async itemsByCategory(category) { return this.db.where('storageItems', 'category', category); }

  /* ----------------------------------------------------------- custody */
  async custodyOf(itemId) { return this.db.where('storageCustody', 'itemId', itemId); }

  async putCustody(row) { return this.db.put('storageCustody', row); }

  async allCustody() { return this.db.all('storageCustody'); }

  /* ------------------------------------------------------------- cases */
  async allCases() { return this.db.all('storageCases'); }

  async getCase(id) { return this.db.get('storageCases', id); }

  async putCase(row) { return this.db.put('storageCases', row); }

  async removeCase(id) { return this.db.delete('storageCases', id); }

  /* ------------------------------------------------------------ shares */
  async allShares() { return this.db.all('storageShares'); }

  async putShare(row) { return this.db.put('storageShares', row); }

  async sharesOf(itemId) { return this.db.where('storageShares', 'itemId', itemId); }

  async removeShare(id) { return this.db.delete('storageShares', id); }

  /* ------------------------------------------------------------- reset */
  async clear({ keepUserData = false } = {}) {
    const items = await this.allItems();
    for (const item of items) {
      if (keepUserData && !item.sample) continue;
      await this.removeItem(item.id);
      for (const event of await this.custodyOf(item.id)) await this.db.delete('storageCustody', event.id);
    }
    const cases = await this.allCases();
    for (const row of cases) {
      if (keepUserData && !row.sample) continue;
      await this.removeCase(row.id);
    }
    const shares = await this.allShares();
    for (const row of shares) {
      if (keepUserData && !row.sample) continue;
      await this.removeShare(row.id);
    }
  }
}

let repoPromise = null;

export async function storageRepo() {
  if (!repoPromise) repoPromise = openDatabase().then((db) => new StorageRepository(db));
  return repoPromise;
}

/** test helper: forget the cached repository so the next call re-opens the db */
export function resetStorageRepo() { repoPromise = null; }
