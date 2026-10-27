/**
 * GuardHai · ui/sheet.js — the bottom sheet (#ghSheet) used by every secondary
 * flow (comments, report, storage, account…). Content is HTML, callers escape.
 */
export function openSheet(title, html) {
  const t = document.getElementById('ghSheetTitle');
  const b = document.getElementById('ghSheetBody');
  const m = document.getElementById('ghSheet');
  if (!t || !b || !m) return;
  t.innerHTML = title;
  b.innerHTML = html;
  m.classList.add('open');
}

export function closeSheet() {
  const m = document.getElementById('ghSheet');
  if (m) m.classList.remove('open');
}

export function isSheetOpen() {
  const m = document.getElementById('ghSheet');
  return !!m && m.classList.contains('open');
}
