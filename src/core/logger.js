/**
 * GuardHai · core/logger.js
 * Namespaced console wrapper + an in-memory ring buffer so the Storage sheet
 * can show the last errors without a backend.
 */

const RING = [];
const MAX = 50;

function push(level, scope, args) {
  RING.push({ level, scope, at: new Date().toISOString(), message: args.map(String).join(' ') });
  if (RING.length > MAX) RING.shift();
}

export function createLogger(scope) {
  return {
    debug: (...a) => { push('debug', scope, a); if (console.debug) console.debug(`[${scope}]`, ...a); },
    info:  (...a) => { push('info', scope, a); console.info(`[${scope}]`, ...a); },
    warn:  (...a) => { push('warn', scope, a); console.warn(`[${scope}]`, ...a); },
    error: (...a) => { push('error', scope, a); console.error(`[${scope}]`, ...a); }
  };
}

export const logBuffer = {
  all: () => [...RING],
  errors: () => RING.filter((e) => e.level === 'error'),
  clear: () => { RING.length = 0; }
};
