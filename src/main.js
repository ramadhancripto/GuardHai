/**
 * GuardHai · src/main.js
 * Application entry point. This is the only file index.html loads.
 *
 *   index.html  →  src/main.js  →  engines/ (shield, auth, nav, i18n, chrome)
 *                              →  features/home (feed, composer, engagement)
 *                              →  services → data → domain
 *
 * Load order matters: the engine singletons must exist before the Home
 * controller binds to them (HomeUI.go delegates to switchTab / ProtectEngine).
 */
import { appConfig } from './config.js';
import './engines/index.js';

import { initHome } from './features/home/home-controller.js';
import { initShield } from './features/shield/shield-center.js';
import { initSosPage } from './features/emergency/sos-page.js';
import { initStorage } from './features/storage/storage-view.js';
import { integrationStatus } from './mocks/index.js';
import { createLogger } from './core/logger.js';

const log = createLogger('main');

async function start() {
  log.info(`GuardHai ${appConfig.version} · driver=${appConfig.dataDriver} · locale=${appConfig.locale}`);

  // Firebase is optional and loaded from a CDN: a dynamic import keeps a network
  // failure from taking down the module graph (it used to be a separate <script>).
  import('./services/firebase.service.js')
    .then(() => log.info('firebase auth bridge available'))
    .catch((err) => log.warn('firebase bridge unavailable (offline build)', err.message));

  try {
    await initHome();
    initShield();
    initSosPage();
    initStorage();          // Universal Secure Storage Center (#storagePage)
  } catch (err) {
    log.error('home init failed', err);
  } finally {
    document.dispatchEvent(new CustomEvent('guardhai:ready'));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

/** Small, read-only debug surface. Handy in DevTools and in the smoke tests. */
window.GuardHai = Object.freeze({
  version: appConfig.version,
  config: appConfig,
  integrations: integrationStatus,
  ready: () => document.documentElement.dataset.ghReady === 'true'
});

document.addEventListener('guardhai:ready', () => {
  document.documentElement.dataset.ghReady = 'true';
});

window.addEventListener('error', (event) => {
  log.error('uncaught', event.message, event.filename, event.lineno);
});
window.addEventListener('unhandledrejection', (event) => {
  log.error('unhandled rejection', event.reason);
});
