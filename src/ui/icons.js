/* ==========================================================================
   GuardHai · ui/icons.js
   SVG sprite helper (GHIcon) — returns <use href="#i-…"> markup.
   ========================================================================== */

function GHIcon(key) {
   const map = { laptop: 'i-laptop', watch: 'i-watch', phone: 'i-smartphone', tracker: 'i-bag', '💻': 'i-laptop', '⌚': 'i-watch', '📱': 'i-smartphone', '🎒': 'i-bag' };
   return '<svg class="ic" style="width:18px;height:18px"><use href="#' + (map[key] || 'i-smartphone') + '"/></svg>';
}

/* ============================================================
   REAL DISCOVERY WIZARD FOR ALL 6 TRANSPORTS (NO FAKE DATA)
   ============================================================ */
/* NOTE: the second (duplicate) GHIcon definition that used to live here was
   removed. The definition above is the superset (names + emoji keys) and was
   already the one being called for named icons. */

window.GHIcon = GHIcon;
export { GHIcon };
