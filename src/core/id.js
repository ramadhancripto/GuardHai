/** GuardHai · core/id.js — collision-safe ids without dependencies. */

let counter = 0;

export function uid(prefix = 'id') {
  counter = (counter + 1) % 100000;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

export const nowIso = () => new Date().toISOString();
