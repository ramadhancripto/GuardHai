/**
 * GuardHai · data/db.js
 * A small promise wrapper around IndexedDB with a memory fallback (private
 * mode / unsupported browsers), so every repository can assume one async API:
 *
 *   await db.put('posts', row)      await db.get('posts', id)
 *   await db.all('posts')           await db.delete('posts', id)
 *   await db.where('comments', 'postId', value)
 *
 * Blobs (images, video, audio) are stored in the `media` store, so a post's
 * attachments survive a reload — this is the local-first "backend".
 */

export const DB_NAME = 'guardhai';
export const DB_VERSION = 2;

export const STORES = {
  posts:      { keyPath: 'id', indexes: [['createdAt'], ['status'], ['topic']] },
  media:      { keyPath: 'id', indexes: [] },
  engagement: { keyPath: 'key', indexes: [['postId']] },
  comments:   { keyPath: 'id', indexes: [['postId'], ['createdAt']] },
  drafts:     { keyPath: 'id', indexes: [['createdAt']] },
  reports:    { keyPath: 'id', indexes: [['postId'], ['createdAt']] },
  meta:       { keyPath: 'key', indexes: [] },
  profiles:   { keyPath: 'id', indexes: [['primaryRole']] },
  follows:    { keyPath: 'key', indexes: [['profileId']] }
};

/* ------------------------------------------------------------------ memory */
function createMemoryDb() {
  const tables = new Map();
  const table = (name) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name);
  };
  return {
    kind: 'memory',
    async put(store, row) { table(store).set(row[STORES[store]?.keyPath || 'id'], row); return row; },
    async get(store, key) { return table(store).get(key) || null; },
    async all(store) { return [...table(store).values()]; },
    async delete(store, key) { return table(store).delete(key); },
    async where(store, index, value) {
      return [...table(store).values()].filter((row) => row[index] === value);
    },
    async clear(store) { table(store).clear(); },
    async usage() { return { bytes: 0, entries: [...tables.values()].reduce((n, t) => n + t.size, 0) }; }
  };
}

/* ----------------------------------------------------------------- idb */
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function createIdbDb(idb) {
  const tx = (store, mode) => idb.transaction(store, mode).objectStore(store);

  return {
    kind: 'indexeddb',

    async put(store, row) {
      await promisify(tx(store, 'readwrite').put(row));
      return row;
    },

    async get(store, key) {
      const row = await promisify(tx(store, 'readonly').get(key));
      return row || null;
    },

    async all(store) {
      return (await promisify(tx(store, 'readonly').getAll())) || [];
    },

    async delete(store, key) {
      await promisify(tx(store, 'readwrite').delete(key));
      return true;
    },

    async where(store, index, value) {
      const store_ = STORES[store];
      if (!store_ || !store_.indexes.some(([name]) => name === index)) {
        // index not declared: scan instead of throwing
        const rows = await this.all(store);
        return rows.filter((r) => r[index] === value);
      }
      const idx = tx(store, 'readonly').index(index);
      return (await promisify(idx.getAll(IDBKeyRange.only(value)))) || [];
    },

    async clear(store) {
      await promisify(tx(store, 'readwrite').clear());
    },

    async usage() {
      if (!navigator.storage?.estimate) return { bytes: 0, entries: null };
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { bytes: usage, quota, entries: null };
    }
  };
}

/* ----------------------------------------------------------------- open */
let instance = null;

export async function openDatabase() {
  if (instance) return instance;

  if (typeof indexedDB === 'undefined') {
    console.warn('[db] IndexedDB unavailable — using the in-memory fallback');
    instance = createMemoryDb();
    return instance;
  }

  instance = await new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const idb = event.target.result;
      for (const [name, def] of Object.entries(STORES)) {
        const store = idb.objectStoreNames.contains(name)
          ? event.target.transaction.objectStore(name)
          : idb.createObjectStore(name, { keyPath: def.keyPath });
        for (const [index] of def.indexes) {
          if (!store.indexNames.contains(index)) store.createIndex(index, index, { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(createIdbDb(request.result));
    request.onerror = () => {
      console.warn('[db] IndexedDB open failed — using the in-memory fallback', request.error);
      resolve(createMemoryDb());
    };
    request.onblocked = () => resolve(createMemoryDb());
  });

  return instance;
}

/** test helper: drop the cached connection so a fresh one is opened */
export function resetDatabaseHandle() { instance = null; }
