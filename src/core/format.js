/**
 * GuardHai · core/format.js
 * Pure formatting helpers (unit-tested in tests/unit/format.test.js).
 */

export function fmtBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

/** file size formatter used by the composer (kept separate from storage sizes) */
export const fmtSize = fmtBytes;

export function initials(name = '') {
  return String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || 'GH';
}

const SW_MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];

/** "Sasa hivi" / "Dakika 5 zilizopita" / "Saa 3 zilizopita" / "12 Okt" */
export function relativeTime(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'Sasa hivi';
  if (diffMin < 60) return `Dakika ${diffMin} zilizopita`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `Saa ${hours} zilizopita`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Jana';
  if (days < 7) return `Siku ${days} zilizopita`;
  const d = new Date(then);
  return `${d.getDate()} ${SW_MONTHS[d.getMonth()]}`;
}

export function hostnameOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return String(url).slice(0, 40); }
}

export function truncate(text, max, ellipsis = '…') {
  const s = String(text ?? '');
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, '') + ellipsis;
}
