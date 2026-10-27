/**
 * GuardHai · features/home/search-bar.js
 * The quick search field that sits under the top row.
 *
 * It is a second entry point to the *same* engine the 🔍 sheet uses
 * (`HomeUI.searchFeed` → `feed-view.setQuery`), not a second search:
 * typing filters the Uwanja feed on this device, the hint reports the real
 * number of hits, and nothing is sent anywhere.
 */
import { setQuery } from '../feed/feed-view.js';

const el = (id) => document.getElementById(id);

let timer = null;
let wired = false;

export function showSearchBar() {
  const bar = el('ghSearchBar');
  if (bar) bar.hidden = false;
}

export function hideSearchBar() {
  const bar = el('ghSearchBar');
  if (bar) bar.hidden = true;
}

/** Reflect a term typed elsewhere (the sheet) into the visible field. */
export function syncSearchBar(term = '') {
  const input = el('ghSearchBarInput');
  const clear = el('ghSearchBarClear');
  const hint = el('ghSearchBarHint');
  if (!input) return;
  if (input.value !== term) input.value = term;
  if (clear) clear.hidden = !term;
  if (hint) hint.textContent = term ? '' : '';
}

export function initSearchBar() {
  const input = el('ghSearchBarInput');
  const clear = el('ghSearchBarClear');
  const hint = el('ghSearchBarHint');
  if (!input || wired) return;
  wired = true;

  const run = async () => {
    const term = input.value.trim();
    if (clear) clear.hidden = !term;
    const hits = await setQuery(term);
    if (!hint) return;
    if (!term) { hint.textContent = ''; hint.classList.remove('is-empty'); return; }
    // honest, device-only count — exactly what the feed is showing
    hint.textContent = hits
      ? `${hits} matokeo kwenye kifaa hiki`
      : 'Hakuna matokeo kwenye kifaa hiki';
    hint.classList.toggle('is-empty', hits === 0);
  };

  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 220);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      window.clearTimeout(timer);
      run();
      el('ghUwanja')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (e.key === 'Escape') {
      input.value = '';
      run();
      input.blur();
    }
  });

  clear?.addEventListener('click', () => {
    input.value = '';
    run();
    input.focus();
  });
}
