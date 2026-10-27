/**
 * GuardHai · features/hero/hero-slideshow.js
 * Home hero photo slideshow.
 *
 * The markup owns the slides (one <div class="gh-hero-slide"> per photo) and
 * this module only drives behaviour, so there is no second copy of the list:
 *
 *   • crossfades every 6 s and loops back to the first slide
 *   • the copy above the photos is never re-rendered — only slide classes change
 *   • the first photo is in the markup (eager); the rest are fetched one ahead
 *     of the slide that needs them, so the hero never blocks on five photos
 *   • stops while the tab is hidden and honours prefers-reduced-motion
 *   • a photo that fails to load falls back to that slide's gradient, never a
 *     broken-image icon
 */

export const HERO_INTERVAL = 6000;
export const HERO_FADE = 900;

const state = {
  root: null,
  slides: [],
  dots: [],
  toggle: null,
  index: 0,
  timer: 0,
  interval: HERO_INTERVAL,
  paused: false,
  reduced: false,
  loaded: new Set()
};

const isHidden = () => document.hidden === true || document.visibilityState === 'hidden';

const reducedMotion = () =>
  !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Create the <img> for a slide the first time it is needed. */
function ensureImage(i) {
  const slide = state.slides[i];
  if (!slide || state.loaded.has(i)) return null;
  const src = slide.dataset.src;
  if (!src) { state.loaded.add(i); return slide.querySelector('img'); }
  state.loaded.add(i);

  const img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
  img.loading = 'eager';
  img.addEventListener('error', () => {
    // keep the gradient, never show a broken-image glyph
    slide.classList.add('is-failed');
    img.remove();
  }, { once: true });
  img.addEventListener('load', () => slide.classList.remove('is-pending'), { once: true });
  slide.classList.add('is-pending');
  img.src = src;
  slide.appendChild(img);
  return img;
}

function paint() {
  state.slides.forEach((slide, i) => {
    const on = i === state.index;
    slide.classList.toggle('is-active', on);
    slide.setAttribute('aria-hidden', String(!on));
  });
  state.dots.forEach((dot, i) => {
    const on = i === state.index;
    dot.classList.toggle('is-active', on);
    if (on) dot.setAttribute('aria-current', 'true');
    else dot.removeAttribute('aria-current');
  });
}

function stopTimer() {
  if (state.timer) { window.clearInterval(state.timer); state.timer = 0; }
}

function startTimer() {
  stopTimer();
  if (state.paused || state.reduced || isHidden()) return;
  state.timer = window.setInterval(() => next(), state.interval);
}

/** Move to `i` (wraps). Everything except the photo stays untouched. */
export function goTo(i, { stop = false } = {}) {
  if (!state.slides.length) return state.index;
  const total = state.slides.length;
  const target = ((i % total) + total) % total;
  // load the target and one ahead before the fade, so the swap is never blank
  ensureImage(target);
  ensureImage((target + 1) % total);
  state.index = target;
  paint();
  if (stop) { state.paused = true; paintToggle(); stopTimer(); }
  else if (state.timer) startTimer();
  return state.index;
}

export function next() {
  return goTo(state.index + 1);
}

export function pause() {
  state.paused = true;
  paintToggle();
  stopTimer();
}

export function resume() {
  state.paused = false;
  paintToggle();
  startTimer();
}

export const isPaused = () => state.paused;
export const currentIndex = () => state.index;
export const slideCount = () => state.slides.length;

function paintToggle() {
  const btn = state.toggle;
  if (!btn) return;
  const paused = state.paused || state.reduced;
  btn.setAttribute('aria-pressed', String(paused));
  btn.querySelector('use')?.setAttribute('href', paused ? '#i-play' : '#i-pause');
  btn.setAttribute('aria-label', paused ? 'Endeleza picha zinazobadilika' : 'Simamisha picha zinazobadilika');
}

/** Build dots from the slides that already exist in the markup. */
function buildDots() {
  const host = state.root.querySelector('.gh-hero-dots');
  if (!host) return;
  const total = state.slides.length;
  host.innerHTML = state.slides.map((slide, i) => `
    <button type="button" class="gh-hero-dot" data-hero-dot="${i}"
            aria-label="Picha ${i + 1} kati ya ${total}: ${slide.dataset.label || ''}"></button>`).join('');
  state.dots = [...host.querySelectorAll('[data-hero-dot]')];
  state.dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i, { stop: true })));
}

/**
 * Mount once. Returns the public API (also exposed as window.GHHero so tests and
 * the rest of the app can drive it without reaching into internals).
 */
export function init({ interval = HERO_INTERVAL } = {}) {
  const root = document.getElementById('ghHero');
  if (!root) return null;
  if (state.root === root && state.slides.length) return api;   // already mounted

  state.root = root;
  state.interval = interval;
  state.slides = [...root.querySelectorAll('[data-hero-slide]')];
  state.toggle = root.querySelector('[data-hero-toggle]');
  state.reduced = reducedMotion();
  state.index = 0;
  state.paused = state.reduced;      // reduced motion starts calm, manual dots still work

  ensureImage(0);
  buildDots();
  paint();
  paintToggle();
  startTimer();

  state.toggle?.addEventListener('click', () => (state.paused ? resume() : pause()));

  // prefetch the second photo once the page is idle — never five at once
  const prefetch = () => ensureImage(1);
  if (window.requestIdleCallback) window.requestIdleCallback(prefetch, { timeout: 2000 });
  else window.setTimeout(prefetch, 1200);

  document.addEventListener('visibilitychange', () => {
    if (isHidden()) stopTimer();
    else if (!state.paused && !state.reduced) startTimer();
  });

  // follow a user who turns reduced motion on mid-session
  window.matchMedia?.('(prefers-reduced-motion: reduce)')
    .addEventListener?.('change', (e) => {
      state.reduced = e.matches;
      if (state.reduced) { state.paused = true; stopTimer(); }
      paintToggle();
    });

  return api;
}

const api = { init, next, goTo, pause, resume, isPaused, currentIndex, slideCount, HERO_INTERVAL };
