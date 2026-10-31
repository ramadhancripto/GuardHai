/**
 * GuardHai · features/health/health-ui.js
 * Shared UI primitives for the Health section: bilingual copy, escaping, the
 * small HTML builders every screen reuses, and the one mutable `view` object
 * that routing, filters and form state live in.
 *
 * Rules this file keeps:
 *   • every string is written in both Kiswahili and English (L(sw, en));
 *   • all interpolated values are escaped — nothing renders raw user input;
 *   • no component fetches anything, so every renderer is synchronous.
 */

/* --------------------------------------------------------------- copy/lang */

export const lang = () =>
  (typeof window !== 'undefined' && window.I18N && window.I18N.lang) ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('guardhai_lang')) ||
  'sw';

export const L = (sw, en) => (lang() === 'en' ? en : sw);

/** Resolve a catalog label pair ({ sw, en }) for the active language. */
export const T = (pair) => (pair && typeof pair === 'object' ? (pair[lang()] || pair.sw || pair.en || '') : pair);

/* ------------------------------------------------------------- view state */

export const view = {
  partition: 'overview',
  screen: null,          // null = a partition panel, otherwise a screen id
  param: null,
  history: [],
  flash: null,           // { text, tone: 'ok' | 'info' | 'warn' | 'danger' }
  errors: {},            // field name → error key for the open form
  draft: null,           // emergency review draft (never leaves the device)
  location: null,        // { lat, lng, accuracy } only after explicit consent
  locationError: null,   // 'denied' | 'unavailable' | 'timeout' | null
  filter: { q: '', cat: 'all', group: 'all', place: '', specialty: 'all', type: 'all' }
};

export const resetFilters = () => {
  view.filter = { q: '', cat: 'all', group: 'all', place: '', specialty: 'all', type: 'all' };
};

/* ------------------------------------------------------------------ escape */

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ENTITIES[c]);

const attrs = (obj = {}) => Object.entries(obj)
  .filter(([, v]) => v !== false && v !== null && v !== undefined && v !== '')
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
  .join('');

/* -------------------------------------------------------------------- icons */

export const icon = (id, cls = '') => `<svg class="ic ${cls}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;

/* ------------------------------------------------------------------ actions */

/** `data-hx` is the single delegated click contract. */
export const A = (action, extra = {}) => `data-hx="${action}"${attrs(extra)}`;

const kind = (tone) => (tone && tone !== 'default' ? ` is-${tone}` : '');

/* ----------------------------------------------------------------- buttons */

export function btn(label, action, opts = {}) {
  const { tone = '', icon: iconId = '', extra = {}, type = 'button', aria = '', title = '', disabled = false, cls = '' } = opts;
  return `<button type="${type}" class="gh-health-btn${kind(tone)}${cls ? ' ' + cls : ''}" ${A(action, extra)}`
    + `${aria ? ` aria-label="${esc(aria)}"` : ''}${title ? ` title="${esc(title)}"` : ''}`
    + `${disabled ? ' disabled aria-disabled="true"' : ''}>`
    + `${iconId ? icon(iconId) : ''}<span>${esc(label)}</span></button>`;
}

export function iconBtn(iconId, label, action, extra = {}) {
  return `<button type="button" class="gh-health-iconbtn" ${A(action, extra)} aria-label="${esc(label)}" title="${esc(label)}">${icon(iconId)}</button>`;
}

/* -------------------------------------------------------------------- text */

export function chip(text, tone = 'neutral', iconId = '') {
  return `<span class="gh-health-chip is-${tone}">${iconId ? icon(iconId) : ''}${esc(text)}</span>`;
}

export const SAMPLE_CHIP = () => chip(L('Sampuli', 'Sample'), 'warn', 'i-flask');

/** The one badge that is allowed to sit next to a person's name. */
export function verificationNote(state) {
  const map = {
    unsubmitted: ['info', L('Haijawasilishwa', 'Not submitted')],
    'pending-review': ['warn', L('Inasubiri mhakiki', 'Awaiting reviewer')],
    rejected: ['danger', L('Imekataliwa', 'Rejected')]
  };
  const [tone, text] = map[state] || map.unsubmitted;
  return chip(text, tone, state === 'pending-review' ? 'i-clock' : 'i-info');
}

/* ------------------------------------------------------------------ layout */

export function section(title, sub, body, action = '') {
  return `<section class="gh-health-section">
    <div class="gh-health-section-head">
      <div>
        <h3 class="gh-health-section-title">${esc(title)}</h3>
        ${sub ? `<p class="gh-health-section-sub">${esc(sub)}</p>` : ''}
      </div>
      ${action}
    </div>
    ${body}
  </section>`;
}

export function block(title, body, { note = '', action = '', id = '', tone = '', icon: iconId = '' } = {}) {
  const toneAttr = tone ? ` data-tone="${esc(tone)}"` : '';
  return `<div class="gh-health-block"${id ? ` id="${esc(id)}"` : ''}${toneAttr}>
    ${title ? `<div class="gh-health-block-head">${iconId ? `<span class="gh-health-block-ico">${icon(iconId)}</span>` : ''}<h3 class="gh-health-block-title">${esc(title)}</h3>${action}</div>` : ''}
    ${body}
    ${note ? `<p class="gh-health-block-note">${esc(note)}</p>` : ''}
  </div>`;
}

export function card({ title, sub = '', body = '', action = '', icon: iconId = '', extra = {} }) {
  return `<div class="gh-health-card" ${attrs(extra)}>
    ${iconId ? `<span class="gh-health-card-ico">${icon(iconId)}</span>` : ''}
    <span class="gh-health-card-title">${esc(title)}</span>
    ${sub ? `<span class="gh-health-card-sub">${esc(sub)}</span>` : ''}
    ${body}
    ${action}
  </div>`;
}

export function rows(items) {
  return `<div class="gh-health-rows">${items.join('')}</div>`;
}

export function row({ icon: iconId = '', title, sub = '', meta = '', chips = [], action = '', extra = {}, tone = '' }) {
  return `<div class="gh-health-row"${tone ? ` data-tone="${esc(tone)}"` : ''} ${attrs(extra)}>
    ${iconId ? icon(iconId) : ''}
    <div class="gh-health-rowcopy">
      <b>${esc(title)}</b>
      ${sub ? `<small>${esc(sub)}</small>` : ''}
      ${chips.length ? `<span class="gh-health-chiprow">${chips.join('')}</span>` : ''}
    </div>
    ${meta ? `<span class="gh-health-rowmeta">${esc(meta)}</span>` : ''}
    ${action}
  </div>`;
}

export function facts(items) {
  return `<dl class="gh-health-facts">${items.map(([label, value]) => `
    <div class="gh-health-fact"><dt>${esc(label)}</dt><dd${value ? '' : ' class="is-empty"'}>${esc(value || L('Haijawekwa', 'Not set'))}</dd></div>`).join('')}</dl>`;
}

const cell = (v) => {
  if (v && typeof v === 'object' && v.html) return v.html;   // pre-built markup (chips)
  return esc(v);
};

export function dl(items) {
  return `<dl class="gh-health-dl">${items.map(([k, v]) => `
    <div class="gh-health-dl-row"><dt>${esc(k)}</dt><dd>${cell(v)}</dd></div>`).join('')}</dl>`;
}

export function stat({ label, value, sub = '', action = null, extra = {}, tone = '' }) {
  const tag = action ? 'button' : 'div';
  const toneAttr = tone ? ` data-tone="${esc(tone)}"` : '';
  const open = `<${tag} class="gh-health-stat"${toneAttr}${action ? ` type="button" ${A(action, extra)}` : attrs(extra)}>`;
  return `${open}
    <span class="gh-health-stat-value">${esc(value)}</span>
    <span class="gh-health-stat-label">${esc(label)}</span>
    ${sub ? `<span class="gh-health-stat-sub">${esc(sub)}</span>` : ''}
  </${tag}>`;
}

export function empty({ icon: iconId = 'i-inbox', title, body, action = '', tone = '', inline = false, hue = '' }) {
  return `<div class="gh-health-empty${tone ? ' is-' + tone : ''}${inline ? ' is-inline' : ''}"${hue ? ` data-tone="${esc(hue)}"` : ''}>
    <span class="gh-health-empty-ico">${icon(iconId)}</span>
    <b>${esc(title)}</b>
    ${body ? `<p>${esc(body)}</p>` : ''}
    ${action}
  </div>`;
}

export function callout(text, tone = 'info', iconId = 'i-info') {
  return `<div class="gh-health-callout is-${tone}">${icon(iconId)}<p>${esc(text)}</p></div>`;
}

export function legend(text, iconId = 'i-info') {
  return `<p class="gh-health-legend">${icon(iconId)}<span>${esc(text)}</span></p>`;
}

export function timeline(items) {
  return `<ul class="gh-health-timeline">${items.map((it) => `
    <li><b>${esc(it.title)}</b>${it.meta ? `<span>${esc(it.meta)}</span>` : ''}${it.body ? `<p>${esc(it.body)}</p>` : ''}</li>`).join('')}</ul>`;
}

export function progressRow({ label, value, pct, tone = '' }) {
  return `<div class="gh-health-progress"${tone ? ` data-tone="${esc(tone)}"` : ''}>
    <span class="gh-health-progress-label">${esc(label)}</span>
    <span class="gh-health-progress-value">${esc(value)}</span>
    ${meter(pct, label)}
  </div>`;
}

export function meter(pct, label) {
  return `<div class="gh-health-meter" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(label)}">
    <span style="width:${pct}%"></span></div>`;
}

export function flashBox() {
  if (!view.flash) return '';
  const { text, tone = 'ok' } = view.flash;
  return `<div class="gh-health-flash is-${tone}" role="status">${icon(tone === 'danger' ? 'i-alert-circle' : tone === 'warn' ? 'i-alert-triangle' : 'i-check-circle')}<p>${esc(text)}</p></div>`;
}

export function errorBox(text) {
  return `<div class="gh-health-callout is-danger" role="alert">${icon('i-alert-circle')}<p>${esc(text)}</p></div>`;
}

/* ------------------------------------------------------------------- forms */

const fieldError = (name) => (view.errors && view.errors[name]
  ? `<span class="gh-health-error" data-hx-inline>${esc(view.errors[name])}</span>` : '');

export function field({ label, name, type = 'text', value = '', placeholder = '', required = false, help = '', autocomplete = 'off', inputmode = '', min = '', max = '', step = '' }) {
  const id = `hxf-${name}`;
  return `<div class="gh-health-field">
    <label class="gh-health-label" for="${id}">${esc(label)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>
    <input class="gh-health-input${view.errors[name] ? ' is-invalid' : ''}" id="${id}" name="${esc(name)}" type="${type}"
      value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="${esc(autocomplete)}"
      ${inputmode ? `inputmode="${esc(inputmode)}"` : ''}${min ? ` min="${esc(min)}"` : ''}${max ? ` max="${esc(max)}"` : ''}${step ? ` step="${esc(step)}"` : ''}
      ${required ? 'required aria-required="true"' : ''}${view.errors[name] ? ' aria-invalid="true"' : ''}>
    ${help ? `<span class="gh-health-hint">${esc(help)}</span>` : ''}
    ${fieldError(name)}
  </div>`;
}

export function textarea({ label, name, value = '', placeholder = '', required = false, help = '', rows: n = 4 }) {
  const id = `hxf-${name}`;
  return `<div class="gh-health-field">
    <label class="gh-health-label" for="${id}">${esc(label)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>
    <textarea class="gh-health-textarea${view.errors[name] ? ' is-invalid' : ''}" id="${id}" name="${esc(name)}" rows="${n}"
      placeholder="${esc(placeholder)}" ${required ? 'required aria-required="true"' : ''}${view.errors[name] ? ' aria-invalid="true"' : ''}>${esc(value)}</textarea>
    ${help ? `<span class="gh-health-hint">${esc(help)}</span>` : ''}
    ${fieldError(name)}
  </div>`;
}

export function select({ label, name, value = '', options = [], required = false, help = '' }) {
  const id = `hxf-${name}`;
  const opts = options.map((o) => {
    const val = Array.isArray(o) ? o[0] : o.value;
    const text = Array.isArray(o) ? o[1] : o.label;
    return `<option value="${esc(val)}"${String(val) === String(value) ? ' selected' : ''}>${esc(text)}</option>`;
  }).join('');
  return `<div class="gh-health-field">
    <label class="gh-health-label" for="${id}">${esc(label)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>
    <select class="gh-health-select${view.errors[name] ? ' is-invalid' : ''}" id="${id}" name="${esc(name)}"
      ${required ? 'required aria-required="true"' : ''}${view.errors[name] ? ' aria-invalid="true"' : ''}>${opts}</select>
    ${help ? `<span class="gh-health-hint">${esc(help)}</span>` : ''}
    ${fieldError(name)}
  </div>`;
}

export function check({ label, name, value = '1', checked = false, help = '' }) {
  const id = `hxf-${name}`;
  return `<label class="gh-health-check" for="${id}">
    <input type="checkbox" id="${id}" name="${esc(name)}" value="${esc(value)}"${checked ? ' checked' : ''}>
    <span>${esc(label)}${help ? `<em>${esc(help)}</em>` : ''}</span>
  </label>`;
}

export function fileField({ label, name, help = '' }) {
  const id = `hxf-${name}`;
  return `<div class="gh-health-field">
    <label class="gh-health-label" for="${id}">${esc(label)}</label>
    <input class="gh-health-input" id="${id}" name="${esc(name)}" type="file">
    ${help ? `<span class="gh-health-hint">${esc(help)}</span>` : ''}
  </div>`;
}

export function form(name, body, { submit = '', submitLabel = L('Hifadhi', 'Save'), tone = 'primary', note = '', submitIcon = 'i-check' } = {}) {
  return `<form class="gh-health-form" data-hx-form="${esc(name)}" novalidate>
    ${body}
    <div class="gh-health-form-actions">
      ${submitLabel ? btn(submitLabel, submit || 'submit', { tone, type: 'submit', icon: submitIcon }) : ''}
      ${note ? `<p class="gh-health-hint">${esc(note)}</p>` : ''}
    </div>
  </form>`;
}

/* ------------------------------------------------------------------ screens */

export function screenHead(title, sub, { back = 'back', action = '' } = {}) {
  return `<div class="gh-health-screen-head">
    <button type="button" class="gh-health-back" ${A(back)} aria-label="${esc(L('Rudi', 'Back'))}">${icon('i-arrow-left')}</button>
    <div class="gh-health-screen-titles">
      <h2 class="gh-health-screen-title" tabindex="-1">${esc(title)}</h2>
      ${sub ? `<p class="gh-health-screen-sub">${esc(sub)}</p>` : ''}
    </div>
    ${action}
  </div>`;
}

/** Wraps a screen's body so routing metadata is visible to tests and styles. */
export const screenBody = (id, html) => `<div class="gh-health-screen" data-health-screen="${esc(id)}">${html}</div>`;

/* -------------------------------------------------------------- formatting */

const LOCALES = () => (lang() === 'en' ? 'en-GB' : 'sw-TZ');

export function fmtDate(iso) {
  if (!iso) return L('Haijawekwa', 'Not set');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(LOCALES(), { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(LOCALES(), { hour: '2-digit', minute: '2-digit' });
}

export const fmtDateTime = (iso) => (iso ? `${fmtDate(iso)} · ${fmtTime(iso)}` : L('Haijawekwa', 'Not set'));

export function fmtDay(key) {
  if (!key) return '';
  const d = new Date(key + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(LOCALES(), { weekday: 'short', day: '2-digit', month: 'short' });
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const money = (v) => (v == null ? L('Haijatajwa', 'Not stated') : `${Number(v).toLocaleString('en-US')} TZS`);

/** Deterministic pseudo-QR bitmap: a preview only, never a working scan code. */
export function qrPreview(seed, size = 21) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const cells = [];
  const isFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (isFinder(r, c)) continue;
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0;
      if ((h & 3) === 0) cells.push([r, c]);
    }
  }
  const rects = cells.map(([r, c]) => `<rect x="${c}" y="${r}" width="1" height="1"/>`).join('');
  const finder = (x, y) => `<path d="M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z" fill-rule="evenodd"/>`;
  return `<svg class="gh-health-qr-grid" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(L('Kielelezo cha msimbo wa QR', 'QR code preview'))}">
    <g fill="currentColor">${rects}${finder(0, 0)}${finder(size - 7, 0)}${finder(0, size - 7)}</g>
  </svg>`;
}
