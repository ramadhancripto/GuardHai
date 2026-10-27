/**
 * GuardHai · ui/i18n.js
 * Thin wrapper so view modules can translate without reaching for `window`.
 * Falls back to the Swahili source string when a key is missing, which is why
 * the new profile copy can ship before its translations do.
 */
export const t = (key, fallback) => {
  const i18n = window.I18N;
  return (i18n && typeof i18n.t === 'function') ? i18n.t(key, fallback) : (fallback || key);
};
