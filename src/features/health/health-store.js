/**
 * GuardHai · features/health/health-store.js
 * Public entry point for the Health data layer.
 *
 * The store itself is split across small modules (state, records, network,
 * services); this file stitches them into one API so screens keep importing
 * from a single place:
 *
 *   import { Store, RECORD_CATEGORIES } from './health-store.js';
 *
 * Nothing here talks to a network. Read-only reference data (doctors, articles,
 * blood catalogues) lives in health-catalog.js and is deliberately synthetic.
 */

import * as catalog from './health-catalog.js';
import * as core from './health-state.js';
import * as records from './health-record-store.js';
import * as network from './health-network-store.js';
import * as services from './health-services-store.js';

export * from './health-catalog.js';
export * from './health-state.js';
export * from './health-record-store.js';
export * from './health-network-store.js';
export * from './health-services-store.js';

/** Internal plumbing that screens must not reach for. */
const PRIVATE = new Set([
  'commit', 'now', 'uid', 'sameDay', 'clone', 'load', 'persist', 'blankState',
  'resetState', 'listeners', 'hasStorage', 'pendingSeed'
]);

const pick = (ns) => Object.fromEntries(Object.entries(ns).filter(([k]) => !PRIVATE.has(k)));

export const Store = {
  ...pick(catalog),
  ...pick(core),
  ...pick(records),
  ...pick(network),
  ...pick(services),
  Store: null
};

export default Store;
