/**
 * GuardHai · features/network/network-ui.js
 * Shared markup primitives for every network screen. No state, no services —
 * functions in, strings out, so a screen file stays readable.
 *
 * Everything is bilingual: `L(sw, en)` picks the active app language, matching
 * the Health section's approach (copy lives next to the screen, re-rendered on
 * `guardhai:lang`).
 */
import { escapeHtml } from '../../core/dom.js';

export const lang = () => (window.I18N && window.I18N.lang) || 'sw';
export const L = (sw, en) => (lang() === 'en' ? en : sw);
export const esc = (value) => escapeHtml(value ?? '');

export const icon = (id, cls = '') =>
  `<svg class="ic ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;

export const initialsOf = (name) => String(name || '?')
  .trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';

/** a person, resolved through the preloaded profile map */
export function person(profiles, id) {
  const p = profiles?.[id];
  return {
    id,
    name: p?.name || (id === 'me' ? L('Wewe', 'You') : L('Mtumiaji', 'User')),
    initials: p?.initials || initialsOf(p?.name || id),
    role: p?.primaryRole || 'member',
    sample: !!p?.sample,
    bio: p?.bio || '',
    photo: p?.avatarUrl || p?.photoUrl || ''
  };
}

export function avatar(p, { size = '', ring = false } = {}) {
  const photo = p?.photo;
  return `<span class="gh-net-avatar ${size}${ring ? ' is-ring' : ''}" aria-hidden="true">${
    photo ? `<img src="${esc(photo)}" alt="">` : esc(initialsOf(p?.name || '?'))
  }</span>`;
}

export function chip(label, tone = 'neutral') {
  return `<span class="gh-net-chip is-${esc(tone)}">${esc(label)}</span>`;
}

export function dot(label, tone = 'ok') {
  return `<span class="gh-net-dot is-${esc(tone)}"><i aria-hidden="true"></i>${esc(label)}</span>`;
}

export const TONES = ['ok', 'info', 'warn', 'danger', 'muted', 'neutral'];

export function statusChip(meta) {
  if (!meta) return '';
  return chip(meta.label, meta.tone || 'neutral');
}

/** a button wired to the delegated dispatcher: data-nx + data-act */
export function btn(label, { act = '', id = '', tone = 'default', iconId = '', type = 'button', disabled = false, title = '', extra = '', compact = false } = {}) {
  const cls = `gh-net-btn${tone !== 'default' ? ` is-${tone}` : ''}${compact ? ' is-compact' : ''}`;
  const a11y = compact ? ` aria-label="${esc(label)}" title="${esc(title || label)}"` : `${title ? ` title="${esc(title)}"` : ''}`;
  return `<button type="${type}" class="${cls}" data-nx="act"${act ? ` data-act="${esc(act)}"` : ''}${id ? ` data-id="${esc(id)}"` : ''}${disabled ? ' disabled aria-disabled="true"' : ''}${a11y}${extra ? ` ${extra}` : ''}>${iconId ? icon(iconId) : ''}<span>${esc(label)}</span></button>`;
}

export function linkBtn(label, { act, id = '', iconId = '' } = {}) {
  return `<button type="button" class="gh-net-linkbtn" data-nx="act" data-act="${esc(act)}"${id ? ` data-id="${esc(id)}"` : ''}>${iconId ? icon(iconId) : ''}<span>${esc(label)}</span></button>`;
}

export function card(inner, { cls = '', padded = true } = {}) {
  return `<div class="gh-net-card${padded ? ' is-padded' : ''} ${cls}">${inner}</div>`;
}

export function section(title, inner, { note = '', cls = '' } = {}) {
  return `<section class="gh-net-section ${cls}">
    ${title ? `<div class="gh-net-section-head"><h3>${esc(title)}</h3>${note ? `<p>${esc(note)}</p>` : ''}</div>` : ''}
    ${inner}
  </section>`;
}

/** a tappable row: title, meta line, right slot */
export function row({ title, meta = '', right = '', act = '', id = '', avatarHtml = '', extra = '' }) {
  const tag = act ? 'button' : 'div';
  const attrs = act ? ` type="button" data-nx="act" data-act="${esc(act)}"${id ? ` data-id="${esc(id)}"` : ''}` : '';
  return `<${tag} class="gh-net-row"${attrs}${extra}>
    ${avatarHtml}
    <span class="gh-net-rowcopy"><b>${esc(title)}</b>${meta ? `<small>${meta}</small>` : ''}</span>
    ${right ? `<span class="gh-net-rowright">${right}</span>` : ''}
  </${tag}>`;
}

export function empty({ iconId = 'i-inbox', title, body = '', action = '' }) {
  return `<div class="gh-net-empty">
    <span class="gh-net-empty-icon">${icon(iconId)}</span>
    <b>${esc(title)}</b>
    ${body ? `<p>${esc(body)}</p>` : ''}
    ${action ? `<div class="gh-net-empty-actions">${action}</div>` : ''}
  </div>`;
}

export function note(text, tone = 'info') {
  return `<p class="gh-net-note is-${esc(tone)}">${icon(tone === 'warn' ? 'i-alert-triangle' : tone === 'danger' ? 'i-alert-circle' : 'i-info')}<span>${esc(text)}</span></p>`;
}

export function banner(text, tone = 'info', { iconId = '' } = {}) {
  return `<div class="gh-net-banner is-${esc(tone)}">${iconId ? icon(iconId) : ''}<span>${esc(text)}</span></div>`;
}

export function field({ label, name, type = 'text', value = '', placeholder = '', required = false, hint = '', error = '', rows = 4, min, max, accept = '', choices = null, id = '' }) {
  const fid = id || `nx-f-${name}`;
  const err = error ? `<span class="gh-net-field-error" role="alert">${esc(error)}</span>` : '';
  const hintHtml = hint ? `<span class="gh-net-field-hint">${esc(hint)}</span>` : '';
  let control;
  if (choices) {
    control = `<select id="${fid}" name="${esc(name)}" class="gh-net-input"${required ? ' required' : ''}>
      ${choices.map((c) => `<option value="${esc(c.value)}"${String(c.value) === String(value) ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}
    </select>`;
  } else if (type === 'textarea') {
    control = `<textarea id="${fid}" name="${esc(name)}" class="gh-net-input" rows="${rows}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${required ? ' required' : ''}>${esc(value)}</textarea>`;
  } else {
    control = `<input id="${fid}" name="${esc(name)}" class="gh-net-input" type="${esc(type)}" value="${esc(value)}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${required ? ' required' : ''}${min !== undefined ? ` min="${esc(min)}"` : ''}${max !== undefined ? ` max="${esc(max)}"` : ''}${accept ? ` accept="${esc(accept)}"` : ''}>`;
  }
  return `<label class="gh-net-field" for="${fid}">
    <span class="gh-net-label">${esc(label)}${required ? ' <em aria-hidden="true">*</em>' : ''}</span>
    ${control}${hintHtml}${err}
  </label>`;
}

export function checkbox({ label, name, checked = false, hint = '', value = '1', disabled = false }) {
  return `<label class="gh-net-check${disabled ? ' is-disabled' : ''}">
    <input type="checkbox" name="${esc(name)}" value="${esc(value)}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}>
    <span><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span>
  </label>`;
}

export function form(act, inner, { id = '', cls = '', submit = '', submitTone = 'primary', cancel = '', submitIcon = '' } = {}) {
  return `<form class="gh-net-form ${cls}" data-nx-form="${esc(act)}"${id ? ` id="${id}"` : ''} novalidate>
    ${inner}
    ${submit || cancel ? `<div class="gh-net-form-actions">
      ${cancel ? btn(cancel.label, { act: cancel.act, tone: 'ghost' }) : ''}
      ${submit ? btn(submit, { type: 'submit', tone: submitTone, iconId: submitIcon }) : ''}
    </div>` : ''}
  </form>`;
}

export function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return L(`sekunde ${secs} zilizopita`, `${secs}s ago`);
  const mins = Math.round(secs / 60);
  if (mins < 60) return L(`dakika ${mins} zilizopita`, `${mins}m ago`);
  const hours = Math.round(mins / 60);
  if (hours < 24) return L(`saa ${hours} zilizopita`, `${hours}h ago`);
  const days = Math.round(hours / 24);
  if (days < 30) return L(`siku ${days} zilizopita`, `${days}d ago`);
  return fmtDate(iso);
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang() === 'en' ? 'en-GB' : 'sw-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(lang() === 'en' ? 'en-GB' : 'sw-TZ', { hour: '2-digit', minute: '2-digit' });
}

export function meter(value, total, label = '') {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return `<div class="gh-net-meter" role="img" aria-label="${esc(label)} ${pct}%">
    <span style="width:${pct}%"></span>
  </div>`;
}

export function statGrid(items) {
  return `<div class="gh-net-stats">${items.map((s) => `
    <div class="gh-net-stat${s.tone ? ` is-${esc(s.tone)}` : ''}">
      <b>${esc(String(s.value))}</b>
      <small>${esc(s.label)}</small>
    </div>`).join('')}</div>`;
}

export function tabs(items, activeKey, act = 'partition') {
  return `<div class="gh-net-subtabs" role="tablist">
    ${items.map((t) => `<button type="button" role="tab" class="gh-net-subtab${t.key === activeKey ? ' is-active' : ''}"
      aria-selected="${t.key === activeKey}" data-nx="act" data-act="${esc(act)}" data-key="${esc(t.key)}">
      ${t.iconId ? icon(t.iconId) : ''}<span>${esc(t.label)}</span>
      ${t.count ? `<em>${esc(String(t.count))}</em>` : ''}
    </button>`).join('')}
  </div>`;
}

export function toolbar(inner) {
  return `<div class="gh-net-toolbar">${inner}</div>`;
}

export function honestList(items) {
  return `<ul class="gh-net-honest">${items.map((i) => `<li>${i.ok ? icon('i-check-circle', 'is-ok') : icon('i-x', 'is-muted')}<span>${esc(i.text)}</span></li>`).join('')}</ul>`;
}
