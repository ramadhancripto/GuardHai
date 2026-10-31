/**
 * GuardHai · features/storage/storage-ui.js
 * Markup primitives for the Storage Center. Pure functions: strings in, strings
 * out. Everything is namespaced `stx-*` (storage experience) and everything
 * interactive is wired through `data-stx`, so the delegated dispatcher in
 * storage-view.js stays the only event layer.
 *
 * The generic atoms (chips, tiles, alerts, stats) come from the GDS primitives
 * so the Storage Center cannot drift from the design language it was approved in.
 */
import { L, esc, icon, chip, tile, alert, stat, empty, meter } from '../shield/shield-ui.js';

export { L, esc, icon, chip, tile, alert, stat, empty, meter };

/* ------------------------------------------------------------------ tones */
/* Every record, category and evidence kind carries a colour identity. The CSS
   in 18-storage.css reads it from `data-tone`, so a screen never hard-codes a
   hex value and the palette stays in one place. */
export const CATEGORY_TONE = {
  personal: 'green', health: 'red', evidence: 'green', reports: 'amber',
  identity: 'blue', device: 'slate', property: 'teal', guardian: 'purple',
  communication: 'blue', location: 'teal', archives: 'slate', shared: 'purple'
};

export const EVIDENCE_TONE = {
  photo: 'green', video: 'blue', audio: 'purple', document: 'amber',
  communication: 'blue', location: 'teal', witness: 'purple', device: 'slate',
  digital: 'blue', cctv: 'amber', other: 'slate'
};

export const itemTone = (item) => {
  if (!item) return 'green';
  if (item.category === 'evidence') return EVIDENCE_TONE[item.evidenceType] || 'green';
  return CATEGORY_TONE[item.category] || 'green';
};

/* ------------------------------------------------------------------ atoms */
export const btn = (label, { act = '', key = '', tone = 'outline', iconId = '', small = false, block = false, extra = '', disabled = false } = {}) =>
  `<button type="button" class="gds-btn is-${esc(tone)}${small ? ' is-sm' : ''}${block ? ' is-block' : ''}"
    data-stx="${esc(act)}"${key !== '' ? ` data-key="${esc(key)}"` : ''}${extra ? ` ${extra}` : ''}${disabled ? ' disabled' : ''}>
    ${iconId ? icon(iconId) : ''}${esc(label)}</button>`;

export const iconBtn = (label, { act = '', key = '', iconId = 'i-more-vertical', extra = '' } = {}) =>
  `<button type="button" class="stx-iconbtn" data-stx="${esc(act)}"${key !== '' ? ` data-key="${esc(key)}"` : ''}
    aria-label="${esc(label)}" title="${esc(label)}"${extra ? ` ${extra}` : ''}>${icon(iconId)}</button>`;

export const pill = (text, tone = 'muted', iconId = '') =>
  `<span class="stx-pill is-${esc(tone)}">${iconId ? icon(iconId) : ''}${esc(text)}</span>`;

export const badge = (text, tone = 'muted') => `<span class="stx-badge is-${esc(tone)}">${esc(text)}</span>`;

/* ----------------------------------------------------------------- layout */
export const crumbs = (trail = []) => `<nav class="stx-crumbs" aria-label="${esc(L('Njia', 'Breadcrumb'))}">
  ${trail.map((step, i) => {
    const last = i === trail.length - 1;
    const label = last
      ? `<span class="stx-crumb is-current" aria-current="page">${esc(step.label)}</span>`
      : `<button type="button" class="stx-crumb" data-stx="go" data-key="${esc(step.screen)}" data-param="${esc(step.param || '')}">${esc(step.label)}</button>`;
    return `${i ? `<span class="stx-crumb-sep" aria-hidden="true">${icon('i-chevron-right')}</span>` : ''}${label}`;
  }).join('')}
</nav>`;

export const sect = (title, { sub = '', action = '' } = {}) => `<div class="gds-sect">
  <div class="gds-sect-copy"><h2 class="gds-sect-title">${esc(title)}</h2>${sub ? `<p class="gds-sect-sub">${esc(sub)}</p>` : ''}</div>
  ${action}
</div>`;

/* Cards carry the body in a padded wrapper. Blocks that bring their own
   full-bleed layout (a list of rows, a grid, a hero band) opt out of that
   padding in CSS with a negative margin, so their own edges stay flush. */
export const card = (body, { cls = '', head = '', foot = '', bare = false, attrs = '' } = {}) =>
  `<section class="gds-card stx-card ${cls}"${attrs ? ` ${attrs}` : ''}>${head}${bare ? body : `<div class="stx-card-body">${body}</div>`}${foot}</section>`;

export const toolbar = (inner, { cls = '' } = {}) => `<div class="stx-toolbar ${cls}">${inner}</div>`;

/** One quiet line at the end of a screen: a truth, plus at most two actions. */
export const footNote = (text, actions = '') => `
  <div class="stx-foot">
    <span>${icon('i-info')}${esc(text)}</span>
    ${actions ? `<div class="stx-foot-actions">${actions}</div>` : ''}
  </div>`;

/* ------------------------------------------------------------------ tiles */
/* A category tile says three things and no more: icon, count, name. */
export const categoryTile = (category, count) => `
  <button type="button" class="stx-cat" data-tone="${esc(CATEGORY_TONE[category.id] || 'green')}"
    data-stx="go" data-key="storage.category" data-param="${esc(category.id)}">
    <span class="stx-cat-top">
      <span class="stx-cat-ico">${icon(category.icon)}</span>
      <span class="stx-cat-count">${count}</span>
    </span>
    <span class="stx-cat-name">${esc(L(category.sw, category.en))}</span>
  </button>`;

export const evidenceTile = (type, count) => `
  <button type="button" class="stx-evtile" data-tone="${esc(EVIDENCE_TONE[type.id] || 'green')}"
    data-stx="go" data-key="storage.evidence.type" data-param="${esc(type.id)}">
    <span class="stx-evtile-ico">${icon(type.icon)}</span>
    <span class="stx-evtile-copy">
      <span class="stx-evtile-name">${esc(L(type.swShort, type.enShort))}</span>
    </span>
    <span class="stx-evtile-count">${count}</span>
  </button>`;

/* ------------------------------------------------------------------ items */
const versionPill = (item) => {
  if (item.version === 'edited') return pill(L('Iliyohaririwa', 'Edited'), 'warn', 'i-edit');
  if (item.version === 'exported') return pill(L('Nakala', 'Export'), 'info', 'i-download');
  return '';
};

const privacyPill = (item) => {
  const map = {
    private: [L('Binafsi', 'Private'), 'green', 'i-lock'],
    guardians: [L('Walezi', 'Guardians'), 'blue', 'i-user-shield'],
    shared: [L('Iliyoshirikiwa', 'Shared'), 'purple', 'i-users'],
    restricted: [L('Imezuiwa', 'Restricted'), 'amber', 'i-key']
  };
  const [label, tone, iconId] = map[item.privacy] || map.private;
  return pill(label, tone, iconId);
};

export const itemBadges = (item) => [
  item.sample ? pill(L('Sampuli', 'Sample'), 'neutral') : '',
  item.readOnly ? pill(L('Kutoka Afya', 'From Health'), 'blue', 'i-heart-pulse') : '',
  versionPill(item),
  item.integrity?.hash ? pill('SHA-256', 'ok', 'i-shield-check') : '',
  item.verification === 'reviewed' ? pill(L('Imekaguliwa', 'Reviewed'), 'ok', 'i-check') : ''
].filter(Boolean).join('');

export const itemIcon = (item) => {
  if (item.category === 'evidence' && item.evidenceType) {
    const map = {
      photo: 'i-camera', video: 'i-video', audio: 'i-mic', document: 'i-file-medical',
      communication: 'i-message', location: 'i-map-pin', witness: 'i-user-shield',
      device: 'i-smartphone', digital: 'i-activity', cctv: 'i-eye', other: 'i-box'
    };
    return map[item.evidenceType] || 'i-folder';
  }
  const map = {
    personal: 'i-user', health: 'i-heart-pulse', reports: 'i-book', identity: 'i-id-card',
    device: 'i-smartphone', property: 'i-home', guardian: 'i-user-shield',
    communication: 'i-message', location: 'i-map-pin', archives: 'i-box', shared: 'i-users'
  };
  return map[item.category] || 'i-folder';
};

export const itemRow = (item, { selected = false } = {}) => `
  <button type="button" class="stx-row${selected ? ' is-selected' : ''}" data-stx="open.item" data-key="${esc(item.id)}">
    <span class="stx-row-ico" data-tone="${esc(itemTone(item))}">${icon(itemIcon(item))}</span>
    <span class="stx-row-copy">
      <span class="stx-row-title">${esc(item.title)}</span>
      <span class="stx-row-meta">
        ${item.evidenceId ? `<b>${esc(item.evidenceId)}</b>` : ''}
        ${esc(item.subLabel ? L(item.subLabel.sw, item.subLabel.en) : '')}
        ${item.createdAt ? ` · ${esc(shortDate(item.createdAt))}` : ''}
        ${item.sizeBytes ? ` · ${esc(bytes(item.sizeBytes))}` : ''}
      </span>
      <span class="stx-row-badges">${itemBadges(item)}</span>
    </span>
    <span class="stx-row-right">${privacyPill(item)}${icon('i-chevron-right')}</span>
  </button>`;

export const itemCard = (item, { selected = false } = {}) => `
  <button type="button" class="stx-tilecard${selected ? ' is-selected' : ''}" data-tone="${esc(itemTone(item))}"
    data-stx="open.item" data-key="${esc(item.id)}">
    <span class="stx-tilecard-top">
      <span class="stx-row-ico" data-tone="${esc(itemTone(item))}">${icon(itemIcon(item))}</span>
      ${privacyPill(item)}
    </span>
    <span class="stx-tilecard-title">${esc(item.title)}</span>
    <span class="stx-tilecard-meta">
      ${item.evidenceId ? `${esc(item.evidenceId)} · ` : ''}${esc(shortDate(item.createdAt || item.uploadedAt))}
      ${item.sizeBytes ? ` · ${esc(bytes(item.sizeBytes))}` : ''}
    </span>
    <span class="stx-row-badges">${itemBadges(item)}</span>
  </button>`;

/* ------------------------------------------------------------- utilities */
export function bytes(n) {
  const value = Number(n || 0);
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1048576) return `${(value / 1024).toFixed(0)} KB`;
  if (value < 1073741824) return `${(value / 1048576).toFixed(1)} MB`;
  return `${(value / 1073741824).toFixed(2)} GB`;
}

export function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(L('sw', 'en') === 'sw' ? 'sw-TZ' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString(L('sw', 'en') === 'sw' ? 'sw-TZ' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return L(`${date} · saa ${time}`, `${date} · ${time}`);
}

/* --------------------------------------------------------------- states */
export const stateBox = ({ kind = 'empty', iconId = 'i-inbox', title, note = '', action = '' }) => `
  <div class="stx-state is-${esc(kind)}"${kind === 'error' ? ' role="alert"' : ''}>
    <span class="stx-state-ico">${icon(iconId)}</span>
    <b class="stx-state-title">${esc(title)}</b>
    ${note ? `<p class="stx-state-note">${esc(note)}</p>` : ''}
    ${action ? `<div class="stx-state-actions">${action}</div>` : ''}
  </div>`;

export const skeleton = (rows = 3) => `<div class="stx-skeleton" aria-hidden="true">
  ${Array.from({ length: rows }).map(() => `<span class="stx-skeleton-row"></span>`).join('')}
</div>`;

/* ----------------------------------------------------------------- forms */
export const field = ({ label, name, value = '', type = 'text', placeholder = '', hint = '', required = false, rows = null, accept = '' }) => `
  <label class="gds-field" for="stx-${esc(name)}">
    <span class="gds-label">${esc(label)}${required ? ' *' : ''}</span>
    ${rows
      ? `<textarea class="gds-textarea" id="stx-${esc(name)}" name="${esc(name)}" rows="${rows}" placeholder="${esc(placeholder)}"${required ? ' required' : ''}>${esc(value)}</textarea>`
      : `<input class="gds-input" id="stx-${esc(name)}" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" placeholder="${esc(placeholder)}"${required ? ' required' : ''}${accept ? ` accept="${esc(accept)}"` : ''}>`}
    ${hint ? `<span class="gds-hint">${esc(hint)}</span>` : ''}
  </label>`;

export const select = ({ label, name, options = [], value = '', attrs = '' }) => `
  <label class="gds-field" for="stx-${esc(name)}">
    <span class="gds-label">${esc(label)}</span>
    <select class="gds-select" id="stx-${esc(name)}" name="${esc(name)}"${attrs ? ` ${attrs}` : ''}>
      ${options.map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}
    </select>
  </label>`;

export const form = (act, inner, { submit = '', cls = '' } = {}) => `
  <form class="stx-form ${cls}" data-stx-form="${esc(act)}" novalidate>
    ${inner}
    ${submit ? `<div class="stx-form-actions">
      <button type="submit" class="gds-btn is-primary">${icon('i-check')}${esc(submit)}</button>
    </div>` : ''}
  </form>`;

/* --------------------------------------------------------------- preview */
export const previewPanel = (item, { url = '', onClose = true } = {}) => {
  if (!item) return `<aside class="stx-preview is-empty">${stateBox({
    iconId: 'i-eye', title: L('Chaguo rekodi', 'Pick a record'),
    note: L('Bonyeza rekodi kuona maelezo na hakikisho hapa.', 'Select a record to preview it here.')
  })}</aside>`;
  const locked = item.privacy === 'restricted' && !item._revealed;
  return `<aside class="stx-preview" aria-label="${esc(L('Hakikisho', 'Preview'))}">
    <div class="stx-preview-media">
      ${locked
        ? `<div class="stx-locked">${icon('i-lock')}<b>${L('Rekodi imezuiwa', 'Record is restricted')}</b>
            <span>${L('Fungua kuona maelezo na faili.', 'Unlock to see details and the file.')}</span></div>`
        : renderMedia(item, url)}
    </div>
    <div class="stx-preview-copy">
      <b class="stx-preview-title">${esc(item.title)}</b>
      <span class="stx-preview-meta">${esc(item.subLabel ? L(item.subLabel.sw, item.subLabel.en) : '')}${item.evidenceId ? ` · ${esc(item.evidenceId)}` : ''}</span>
      <div class="stx-row-badges">${itemBadges(item)}</div>
      ${onClose ? `<button type="button" class="gds-btn is-ghost is-sm" data-stx="open.item" data-key="${esc(item.id)}">${L('Fungua rekodi', 'Open record')}${icon('i-arrow-right')}</button>` : ''}
    </div>
  </aside>`;
};

export function renderMedia(item, url) {
  if (!url) {
    return `<div class="stx-media-placeholder">
      ${icon(itemIcon(item))}
      <span>${item.blobKey
        ? L('Faili ipo kwenye kifaa hiki', 'The file is on this device')
        : L('Hakuna faili iliyohifadhiwa kwenye kifaa hiki', 'No file is stored on this device')}</span>
    </div>`;
  }
  const type = item.fileType;
  if (type === 'image') return `<img class="stx-media-img" src="${esc(url)}" alt="${esc(item.title)}" loading="lazy">`;
  if (type === 'audio') return `<audio class="stx-media-audio" controls preload="metadata" src="${esc(url)}"></audio>`;
  if (type === 'video') return `<video class="stx-media-video" controls preload="metadata" src="${esc(url)}"></video>`;
  return `<div class="stx-media-placeholder">${icon(itemIcon(item))}<span>${esc(L('Hakikisho la hati', 'Document preview'))}</span>
    <a class="gds-btn is-outline is-sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${L('Fungua faili', 'Open file')}</a></div>`;
}
