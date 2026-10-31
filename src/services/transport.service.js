/**
 * GuardHai · services/transport.service.js
 * The integration boundary for anything that must leave the device: messages,
 * guardian invitations, support requests, community invitations.
 *
 * Today no adapter is registered, so every send is honestly reported as
 * `{ ok: false, reason: 'no-transport' }` and the caller says so in the UI.
 * When a server exists it registers itself here and the workflows above start
 * moving real data without any screen being rewritten:
 *
 *   registerTransport('server', {
 *     name: 'server',
 *     async send(envelope) { … }      // must resolve { ok, id, error }
 *   })
 *
 * Two things live here that are real without a server:
 *   • the outbox — messages composed while offline are queued, persisted, and
 *     flushed in order when the browser reports `online`;
 *   • the connectivity state, so every screen can say what is queued.
 */
import { createRepo, sortBy } from '../data/network.repo.js';
import { bus, EVENTS } from '../core/bus.js';
import { uid, nowIso } from '../core/id.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('transport');

const adapters = new Map();
const outboxRepo = createRepo('outbox');
let flushing = false;

/* --------------------------------------------------------------- registry */
export function registerTransport(name, adapter) {
  if (!name || !adapter || typeof adapter.send !== 'function') {
    throw new TypeError('transport adapter needs a name and a send() method');
  }
  adapters.set(name, adapter);
  bus.emit(EVENTS.TRANSPORT_CHANGED, { name, available: true });
  flushOutbox();
  return adapter;
}

export function unregisterTransport(name) {
  adapters.delete(name);
  bus.emit(EVENTS.TRANSPORT_CHANGED, { name, available: false });
}

/** the first registered adapter wins; null means "nothing is connected" */
export function activeTransport() {
  for (const [name, adapter] of adapters) return { name, adapter };
  return null;
}

export const transportStatus = () => {
  const active = activeTransport();
  return {
    connected: !!active,
    name: active?.name || null,
    online: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
    registered: [...adapters.keys()]
  };
};

/* ------------------------------------------------------------------ send */
/**
 * Attempts a real send. Never throws, never pretends: the caller gets
 * `{ ok:false, reason }` and must render that state.
 */
export async function send(envelope) {
  const active = activeTransport();
  if (!active) return { ok: false, reason: 'no-transport' };
  try {
    const result = await active.adapter.send(envelope);
    return result?.ok ? { ok: true, transport: active.name, id: result.id } : { ok: false, reason: result?.error || 'rejected' };
  } catch (err) {
    log.warn('transport send failed', err);
    return { ok: false, reason: 'transport-error' };
  }
}

/* ----------------------------------------------------------------- outbox */
export async function enqueue(envelope) {
  const row = {
    id: uid('out'),
    kind: envelope.kind || 'message',
    payload: envelope,
    createdAt: nowIso(),
    attempts: 0,
    lastError: null
  };
  await outboxRepo.put(row);
  bus.emit(EVENTS.OUTBOX_CHANGED, { queued: await queuedCount() });
  return row;
}

export async function queuedCount() {
  return outboxRepo.count();
}

export async function queuedItems() {
  return (await outboxRepo.all()).sort(sortBy('createdAt', 'asc'));
}

/** Try every queued envelope in order. Stops on the first hard failure. */
export async function flushOutbox() {
  if (flushing) return { flushed: 0, remaining: await queuedCount() };
  if (!activeTransport()) return { flushed: 0, remaining: await queuedCount(), reason: 'no-transport' };
  flushing = true;
  let flushed = 0;
  try {
    for (const row of await queuedItems()) {
      const result = await send(row.payload);
      if (result.ok) {
        await outboxRepo.remove(row.id);
        flushed++;
      } else {
        await outboxRepo.put({ ...row, attempts: (row.attempts || 0) + 1, lastError: result.reason });
        break;
      }
    }
  } finally {
    flushing = false;
  }
  bus.emit(EVENTS.OUTBOX_CHANGED, { queued: await queuedCount() });
  bus.emit(EVENTS.OUTBOX_FLUSHED, { flushed });
  return { flushed, remaining: await queuedCount() };
}

export async function clearOutbox() {
  await outboxRepo.clear();
  bus.emit(EVENTS.OUTBOX_CHANGED, { queued: 0 });
}

/* ------------------------------------------------------------- connectivity */
const online = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

export function watchConnectivity(onChange) {
  if (typeof window === 'undefined') return () => {};
  const handler = async () => {
    const state = { online: online(), queued: await queuedCount() };
    if (state.online) await flushOutbox();
    bus.emit(EVENTS.CONNECTIVITY, state);
    onChange?.(state);
  };
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}

/** a dev/test helper: force the boundary to look offline for a flow */
export function setOfflineForTest(value) {
  Object.defineProperty(navigator, 'onLine', { value: !value, configurable: true });
  return offlineSnapshot();
}

export const offlineSnapshot = () => ({ online: online(), queued: null });
