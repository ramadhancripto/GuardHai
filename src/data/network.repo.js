/**
 * GuardHai · data/network.repo.js
 * One generic repository over the IndexedDB wrapper in db.js. The Communication
 * & Support Network has many small collections; rather than a file per table,
 * each service asks for the repo it needs and gets the same six methods:
 *
 *   repo.put(row)          repo.get(id)        repo.all()
 *   repo.remove(id)        repo.where(index, value)   repo.count()
 *
 * Everything is scoped to the local device: no request leaves the page.
 */
import { openDatabase } from './db.js';

export function createRepo(store) {
  let handle = null;
  const db = async () => (handle ||= await openDatabase());

  return {
    store,

    async put(row) {
      return (await db()).put(store, row);
    },

    async get(id) {
      return (await db()).get(store, id);
    },

    async all() {
      return (await db()).all(store);
    },

    async where(index, value) {
      return (await db()).where(store, index, value);
    },

    async remove(id) {
      return (await db()).delete(store, id);
    },

    async count() {
      return (await (await db()).all(store)).length;
    },

    async clear() {
      return (await db()).clear(store);
    }
  };
}

/** helpers shared by the services */
export const byNewest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
export const byOldest = (a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''));

/** newest-first sort by any timestamp field */
export const sortBy = (field, dir = 'desc') => (a, b) => {
  const av = a[field] || '', bv = b[field] || '';
  return dir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
};
