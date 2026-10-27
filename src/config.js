/**
 * GuardHai · config.js
 * Single place for runtime switches. Values are read from <meta> tags in
 * index.html when present, so a deployment can change them without a rebuild.
 *
 *   dataDriver: 'local'  → IndexedDB (default, works offline, no server)
 *               'http'   → REST API at apiBaseUrl (not deployed yet)
 */
const meta = (name, fallback) => {
  const el = document.querySelector(`meta[name="guardhai:${name}"]`);
  return (el && el.content) || fallback;
};

export const appConfig = Object.freeze({
  appName: 'GuardHai',
  version: meta('version', '0.5.0'),
  dataDriver: meta('data-driver', 'local'),        // 'local' | 'http'
  apiBaseUrl: meta('api-base-url', '/api'),
  locale: meta('locale', 'sw'),
  maxAttachmentBytes: 50 * 1024 * 1024
});
