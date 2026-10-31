/**
 * GuardHai · features/storage/storage-state.js
 * The Storage Center's view state. Nothing here is data: records live in the
 * repository, this only remembers where you are and what you are filtering by.
 */
import { emptyFilters } from '../../domain/storage.js';

const VIEW_KEY = 'guardhai_storage_view';

export const state = {
  screen: 'storage.home',
  params: {},
  filters: emptyFilters(),
  selectedId: null,
  unlocked: new Set(),      // records revealed in this session only
  ready: false,
  error: null,
  busy: false,
  notice: null,
  pending: null             // { name, size, type, blobKey } chosen in a form
};

export function resetFilters() {
  const view = state.filters.view;
  state.filters = { ...emptyFilters(), view };
}

export function setFilter(key, value) {
  state.filters[key] = value;
  if (key === 'category') state.filters.subcategory = 'all';
}

export function readStoredView() {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'grid' || saved === 'list') state.filters.view = saved;
  } catch { /* private mode: keep the default */ }
}

export function persistView() {
  try { localStorage.setItem(VIEW_KEY, state.filters.view); } catch { /* ignore */ }
}

export const isUnlocked = (id) => state.unlocked.has(id);
export const unlock = (id) => state.unlocked.add(id);
export const lockAll = () => state.unlocked.clear();
