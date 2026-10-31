/**
 * GuardHai · features/shield/shield-ui.js
 * Markup primitives for the Shield Center and SOS. Pure functions, no state and
 * no service calls: strings in, strings out. Every helper emits GDS classes
 * (`gds-*`) so the redesigned screens cannot drift from the design language.
 */
import { escapeHtml } from '../../core/dom.js';

export const lang = () => (window.I18N && window.I18N.lang) || 'sw';
export const L = (sw, en) => (lang() === 'en' ? en : sw);
export const esc = (v) => escapeHtml(v ?? '');

export const icon = (id, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;

/* ------------------------------------------------------------------ atoms */

export function chip(label, tone = 'muted', iconId = null) {
  return `<span class="gds-chip is-${tone}">${iconId ? icon(iconId) : ''}${esc(label)}</span>`;
}

export function tile(iconId, tone = 'green', cls = '') {
  return `<span class="gds-tile is-${tone} ${cls}" aria-hidden="true">${icon(iconId)}</span>`;
}

const actAttr = (ns) => (ns === 'sos' ? 'data-sos-act' : 'data-shield-act');

export function btn(label, { act, key = '', tone = 'outline', iconId = null, block = false, small = false, ns = 'shield' } = {}) {
  const cls = ['gds-btn', `is-${tone}`, block ? 'is-block' : '', small ? 'is-sm' : ''].join(' ').trim();
  return `<button type="button" class="${cls}" ${actAttr(ns)}="${esc(act || '')}"${key ? ` data-key="${esc(key)}"` : ''}>${iconId ? icon(iconId) : ''}${esc(label)}</button>`;
}

export function head(title, sub = '', { mark = 'i-shield', back = null, actions = '' } = {}) {
  return `<div class="gds-head">
    ${back ? `<button type="button" class="gds-back" data-shield-act="${esc(back)}" aria-label="${esc(L('Rudi', 'Back'))}">${icon('i-arrow-left')}</button>` : ''}
    <span class="gds-head-mark" aria-hidden="true">${icon(mark)}</span>
    <div class="gds-head-copy">
      <h1 class="gds-head-title">${esc(title)}</h1>
      ${sub ? `<p class="gds-head-sub">${esc(sub)}</p>` : ''}
    </div>
    ${actions ? `<div class="gds-head-actions">${actions}</div>` : ''}
  </div>`;
}

export function sect(title, { eyebrow = '', sub = '', action = '' } = {}) {
  return `<div class="gds-sect">
    <div class="gds-sect-copy">
      ${eyebrow ? `<span class="gds-eyebrow">${esc(eyebrow)}</span>` : ''}
      <h2 class="gds-sect-title">${esc(title)}</h2>
      ${sub ? `<p class="gds-sect-sub">${esc(sub)}</p>` : ''}
    </div>
    ${action || ''}
  </div>`;
}

export function card(body, { title = '', sub = '', tone = '', headExtra = '', foot = '', plain = false } = {}) {
  const head = title
    ? `<div class="gds-card-head${plain ? ' is-plain' : ''}">
         <div style="min-width:0;flex:1"><h3 class="gds-card-title">${esc(title)}</h3>${sub ? `<span class="gds-card-sub">${esc(sub)}</span>` : ''}</div>
         ${headExtra}
       </div>`
    : '';
  return `<section class="gds-card ${tone ? `is-${tone}` : ''}">${head}${body}${foot}</section>`;
}

export function rows(items) {
  return `<div class="gds-rows">${items.filter(Boolean).join('')}</div>`;
}

export function row({ iconId, tone = 'green', title, note = '', right = '', act = '', key = '', staticRow = false, disabled = false, ns = 'shield' }) {
  const tag = act && !disabled ? 'button' : 'div';
  const attrs = act && !disabled
    ? `type="button" ${actAttr(ns)}="${esc(act)}"${key ? ` data-key="${esc(key)}"` : ''}`
    : `class="${staticRow ? 'is-static' : ''}"`;
  return `<${tag} class="gds-row${staticRow ? ' is-static' : ''}" ${attrs}>
    ${tile(iconId, tone, 'is-sm')}
    <span class="gds-row-copy">
      <span class="gds-row-title">${esc(title)}</span>
      ${note ? `<span class="gds-row-note">${esc(note)}</span>` : ''}
    </span>
    <span class="gds-row-right">${right}${act && !disabled ? icon('i-chevron-right') : ''}</span>
  </${tag}>`;
}

export function ledger(items) {
  return `<div class="gds-ledger" role="status">${items.map((i) => chip(i.label, i.tone || 'muted', i.iconId)).join('')}</div>`;
}

export function alert(text, tone = 'info', iconId = 'i-info') {
  return `<div class="gds-alert is-${tone}">${icon(iconId)}<div>${text}</div></div>`;
}

export function stat(value, label, note = '', tone = '') {
  return `<div class="gds-stat">
    <span class="gds-stat-value"${tone ? ` style="color:var(--gds-${tone})"` : ''}>${esc(value)}</span>
    <span class="gds-stat-label">${esc(label)}</span>
    ${note ? `<span class="gds-stat-note">${esc(note)}</span>` : ''}
  </div>`;
}

export function empty(title, note = '', actionHtml = '') {
  return `<div class="gds-empty">
    ${tile('i-inbox', 'muted')}
    <h3 class="gds-empty-title">${esc(title)}</h3>
    ${note ? `<p class="gds-empty-note">${esc(note)}</p>` : ''}
    ${actionHtml}
  </div>`;
}

export function meter(pct, tone = '') {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="gds-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}">
    <span class="gds-meter-fill ${tone ? `is-${tone}` : ''}" style="width:${v}%"></span>
  </div>`;
}

export function timeline(items) {
  return `<ul class="gds-timeline">${items.map((i) => `
    <li class="gds-tl is-${i.tone || 'muted'}">
      <span class="gds-tl-title">${esc(i.title)}</span>
      <span class="gds-tl-meta">${esc(i.meta || '')}${i.when ? ` · ${esc(i.when)}` : ''}</span>
    </li>`).join('')}</ul>`;
}

/* ------------------------------------------------------------------- time */

const M = 60000;
export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < M) return L('sasa hivi', 'just now');
  if (diff < 60 * M) return L(`dakika ${Math.round(diff / M)} zilizopita`, `${Math.round(diff / M)} min ago`);
  if (diff < 24 * 60 * M) return L(`saa ${Math.round(diff / (60 * M))} zilizopita`, `${Math.round(diff / (60 * M))} h ago`);
  const d = Math.round(diff / (24 * 60 * M));
  return L(`siku ${d} zilizopita`, `${d} d ago`);
}

export function clock(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function dayLabel(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  const same = d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
  if (same) return L('Leo', 'Today');
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** minutes left, as a short human string */
export function leftUntil(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return '—';
  const abs = Math.abs(ms);
  const mins = Math.round(abs / M);
  const text = mins >= 60 ? L(`saa ${Math.floor(mins / 60)} na dakika ${mins % 60}`, `${Math.floor(mins / 60)}h ${mins % 60}m`)
                          : L(`dakika ${mins}`, `${mins} min`);
  return ms >= 0 ? L(`${text} zimebaki`, `${text} left`) : L(`imepita ${text}`, `${text} overdue`);
}

/* ------------------------------------------------------------------ forms */

export function field({ label, name, type = 'text', value = '', placeholder = '', hint = '', required = false, min = null, max = null }) {
  return `<div class="gds-field">
    <label class="gds-label" for="gsh-${esc(name)}">${esc(label)}${required ? ' *' : ''}</label>
    <input class="gds-input" id="gsh-${esc(name)}" name="${esc(name)}" type="${esc(type)}"
      value="${esc(value)}" placeholder="${esc(placeholder)}"${required ? ' required' : ''}
      ${min !== null ? `min="${esc(min)}"` : ''}${max !== null ? `max="${esc(max)}"` : ''}
      ${hint ? `aria-describedby="gsh-${esc(name)}-hint"` : ''}>
    ${hint ? `<span class="gds-hint" id="gsh-${esc(name)}-hint">${esc(hint)}</span>` : ''}
  </div>`;
}

export function textarea({ label, name, value = '', placeholder = '', hint = '', rows = 4, required = false }) {
  return `<div class="gds-field">
    <label class="gds-label" for="gsh-${esc(name)}">${esc(label)}${required ? ' *' : ''}</label>
    <textarea class="gds-textarea" id="gsh-${esc(name)}" name="${esc(name)}" rows="${rows}"
      placeholder="${esc(placeholder)}"${required ? ' required' : ''}${hint ? ` aria-describedby="gsh-${esc(name)}-hint"` : ''}>${esc(value)}</textarea>
    ${hint ? `<span class="gds-hint" id="gsh-${esc(name)}-hint">${esc(hint)}</span>` : ''}
  </div>`;
}

export function select({ label, name, options, value = '', hint = '' }) {
  return `<div class="gds-field">
    <label class="gds-label" for="gsh-${esc(name)}">${esc(label)}</label>
    <select class="gds-select" id="gsh-${esc(name)}" name="${esc(name)}">
      ${options.map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}
    </select>
    ${hint ? `<span class="gds-hint">${esc(hint)}</span>` : ''}
  </div>`;
}

export function toggleRow({ title, note = '', pref, checked, disabled = false }) {
  return `<div class="gds-row is-static" data-pref-row="${esc(pref)}">
    <span class="gds-row-copy">
      <span class="gds-row-title">${esc(title)}</span>
      ${note ? `<span class="gds-row-note">${esc(note)}</span>` : ''}
    </span>
    <button type="button" class="gds-switch" role="switch" aria-checked="${checked ? 'true' : 'false'}"
      aria-label="${esc(title)}" data-shield-pref="${esc(pref)}"${disabled ? ' disabled aria-disabled="true"' : ''}></button>
  </div>`;
}
