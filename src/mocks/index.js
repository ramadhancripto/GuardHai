/**
 * GuardHai · mocks/index.js
 * One import surface for the simulated integrations, plus a status report the
 * settings screen can display verbatim. Every entry is honest about being
 * unconnected; nothing here pretends to work.
 */
import { sosStatus } from './sos.js';
import { pushStatus } from './push.js';
import { bleStatus } from './ble.js';

export * from './sos.js';
export * from './push.js';
export * from './ble.js';
export * from './guardians.js';
export { mockFetch } from './transport.js';

export function integrationStatus() {
  return [
    { id: 'dispatch', label: 'Usambazaji wa SOS', ...sosStatus },
    { id: 'push', label: 'Arifa za mbali (push)', ...pushStatus },
    { id: 'ble', label: 'Kifaa cha Bluetooth', ...bleStatus },
    { id: 'guardians', label: 'Walezi', connected: false, reason: 'not-connected' },
    { id: 'media', label: 'Upakiaji wa media', connected: false, reason: 'local-only' },
    { id: 'auth', label: 'Akaunti ya mtandao', connected: false, reason: 'local-only' }
  ];
}
