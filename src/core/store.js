/**
 * GuardHai · core/store.js
 * Tiny observable state container. Features read via get(), write via patch(),
 * and subscribe for re-renders. State is shallow-merged; nested objects must be
 * replaced (that is deliberate — it keeps change detection predictable).
 */

export function createStore(initial = {}) {
  let state = { ...initial };
  const subs = new Set();

  const notify = (changed) => {
    for (const fn of [...subs]) {
      try { fn(state, changed); } catch (err) { console.error('[store] subscriber failed', err); }
    }
  };

  return {
    get() { return state; },
    pick(key) { return state[key]; },

    patch(partial) {
      const changed = Object.keys(partial).filter((k) => state[k] !== partial[k]);
      if (!changed.length) return state;
      state = { ...state, ...partial };
      notify(changed);
      return state;
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },

    reset(next = {}) {
      state = { ...next };
      notify(Object.keys(state));
      return state;
    }
  };
}
