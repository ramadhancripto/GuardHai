/**
 * GuardHai · features/storage/screens-evidence.js
 * The Evidence Center: its own dashboard, one browser per evidence kind, the
 * case list and the Incident Evidence Collection view (a case's materials laid
 * out as a timeline *and* grouped by kind).
 */
import {
  L, esc, icon, tile, stat, btn, pill, sect, card, toolbar, footNote,
  evidenceTile, itemRow, itemCard, stateBox, previewPanel, bytes, shortDate, dateTime
} from './storage-ui.js';
import { EVIDENCE_TYPES, evidenceTypeOf, CASE_STATUS, HONESTY_SHORT } from '../../domain/storage.js';
import { applyFilters, caseSummary, listCases, custodyOf } from '../../services/storage.service.js';
import { state } from './storage-state.js';
import { itemCollection, filterSummary, viewToggle, searchBar, countBy } from './screens-home.js';

/* --------------------------------------------------------- evidence home */
export async function evidenceHome({ items, summary }) {
  const evidence = items.filter((i) => i.kind === 'evidence' && !i.archived);
  const withCase = evidence.filter((i) => (i.caseIds || []).length).length;
  const cases = await listCases();

  const body = `
    ${card(`
      <div class="stx-hero">
        <div class="stx-hero-main">
          <h2 class="stx-hero-title">${L('Ushahidi kwa aina', 'Evidence by kind')}</h2>
          <p class="stx-hero-note">${L('Kila kipande kina ID, chanzo na historia yake.',
            'Every item has an ID, a source and its own history.')}</p>
          <div class="stx-hero-actions">
            ${btn(L('Ongeza ushahidi', 'Add evidence'), { act: 'nav.add', tone: 'primary', iconId: 'i-plus', extra: 'data-kind="evidence"' })}
            <button type="button" class="stx-hero-ico" data-stx="nav.cases" aria-label="${esc(L('Kesi', 'Cases'))}" title="${esc(L('Kesi', 'Cases'))}">${icon('i-folder')}</button>
            <button type="button" class="stx-hero-ico" data-stx="nav.filters" aria-label="${esc(L('Vichujio', 'Filters'))}" title="${esc(L('Vichujio', 'Filters'))}">${icon('i-filter')}</button>
          </div>
        </div>
      </div>
      <div class="gds-stats stx-stats">
        ${stat(String(evidence.length), L('Vipande', 'Items'))}
        ${stat(String(withCase), L('Kwa kesi', 'In cases'))}
        ${stat(String(evidence.filter((i) => i.integrity?.hash).length), L('Zenye alama', 'Digest'))}
        ${stat(String(evidence.filter((i) => i.verification === 'unreviewed').length), L('Hazijakaguliwa', 'Unreviewed'), '', 'amber')}
      </div>
    `, { cls: 'is-hero' })}

    ${sect(L('Aina', 'Kinds'))}
    <div class="stx-evgrid">
      ${EVIDENCE_TYPES.map((t) => evidenceTile(t, countBy(evidence, 'evidenceType', t.id))).join('')}
    </div>

    ${sect(L('Kesi', 'Cases'), {
      action: btn(L('Kesi mpya', 'New case'), { act: 'nav.case.new', tone: 'outline', small: true, iconId: 'i-plus' })
    })}
    ${cases.length ? card(`<div class="stx-list">${cases.map(caseRow).join('')}</div>`, { cls: 'is-flush' })
      : stateBox({
          iconId: 'i-folder', title: L('Hakuna kesi bado', 'No cases yet'),
          note: L('Kesi huunganisha ushahidi, ripoti na maelezo ya mashahidi.', 'A case groups evidence, reports and statements.'),
          action: btn(L('Unda kesi', 'Create a case'), { act: 'nav.case.new', tone: 'primary', iconId: 'i-plus' })
        })}

    ${footNote(L(HONESTY_SHORT.originals.sw, HONESTY_SHORT.originals.en))}
  `;

  return {
    title: L('Kituo cha ushahidi', 'Evidence Center'),
    subtitle: L(`${evidence.length} vipande · aina ${EVIDENCE_TYPES.length}`, `${evidence.length} items · ${EVIDENCE_TYPES.length} kinds`),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L('Ushahidi', 'Evidence'), screen: 'storage.evidence' }
    ],
    body
  };
}

function caseRow(row) {
  const status = CASE_STATUS.find((s) => s.id === row.status) || CASE_STATUS[0];
  return `<button type="button" class="stx-row" data-stx="open.case" data-key="${esc(row.id)}">
    <span class="stx-row-ico">${icon('i-folder')}</span>
    <span class="stx-row-copy">
      <span class="stx-row-title">${esc(row.title)}</span>
      <span class="stx-row-meta"><b>${esc(row.code)}</b> · ${esc(shortDate(row.openedAt))}</span>
      <span class="stx-row-badges">
        ${pill(L(status.sw, status.en), status.tone)}
        ${row.sample ? pill(L('Sampuli', 'Sample'), 'neutral') : ''}
      </span>
    </span>
    <span class="stx-row-right">${icon('i-chevron-right')}</span>
  </button>`;
}

/* ------------------------------------------------------- one evidence kind */
export async function evidenceType({ items, params }) {
  const type = evidenceTypeOf(params.type);
  const scoped = items.filter((i) => i.kind === 'evidence' && i.evidenceType === type.id);
  const visible = applyFilters(scoped, state.filters);
  const selected = visible.find((i) => i.id === state.selectedId) || visible[0] || null;

  const body = `
    <div class="stx-cathead">
      ${tile(type.icon, type.tone)}
      <div class="stx-cathead-copy">
        <b>${esc(L(type.sw, type.en))}</b>
        <span>${L('Ushahidi', 'Evidence')} · ${L(`${scoped.length} vipande`, `${scoped.length} items`)}</span>
      </div>
      <div class="stx-cathead-actions">
        ${btn(L('Ongeza', 'Add'), { act: 'nav.add', tone: 'primary', iconId: 'i-plus', small: true, extra: `data-kind="evidence" data-type="${esc(type.id)}"` })}
      </div>
    </div>
    ${filterSummary()}
    ${toolbar(`${searchBar(state.filters.q, L(`Tafuta ${type.swShort.toLowerCase()}…`, `Search ${type.enShort.toLowerCase()}…`))}
      <div class="stx-toolbar-right">${viewToggle()}</div>`)}
    <div class="stx-split">
      <div class="stx-split-list">${card(itemCollection(visible, {
        iconId: type.icon,
        title: L(`Hakuna ${type.swShort.toLowerCase()} bado`, `No ${type.enShort.toLowerCase()} yet`),
        note: L('Ongeza kipande cha ushahidi kwenye aina hii.', 'Add a piece of evidence to this kind.'),
        action: btn(L('Ongeza ushahidi', 'Add evidence'), { act: 'nav.add', tone: 'primary', iconId: 'i-plus', extra: `data-kind="evidence" data-type="${esc(type.id)}"` })
      }), { cls: 'is-flush' })}</div>
      <div class="stx-split-preview">${previewPanel(selected)}</div>
    </div>
  `;

  return {
    title: L(type.swShort, type.enShort),
    subtitle: L(`${visible.length} vipande`, `${visible.length} items`),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L('Ushahidi', 'Evidence'), screen: 'storage.evidence' },
      { label: L(type.swShort, type.enShort), screen: 'storage.evidence.type', param: type.id }
    ],
    body
  };
}

/* ------------------------------------------------------------- case list */
export async function cases({ items }) {
  const rows = await listCases();
  const body = `
    ${sect(L('Kesi', 'Cases'), {
      action: btn(L('Kesi mpya', 'New case'), { act: 'nav.case.new', tone: 'primary', small: true, iconId: 'i-plus' })
    })}
    ${rows.length ? `<div class="stx-list">${rows.map((row) => {
      const n = items.filter((i) => (i.caseIds || []).includes(row.id)).length;
      const status = CASE_STATUS.find((s) => s.id === row.status) || CASE_STATUS[0];
      return `<button type="button" class="stx-row" data-stx="open.case" data-key="${esc(row.id)}">
        <span class="stx-row-ico">${icon('i-folder')}</span>
        <span class="stx-row-copy">
          <span class="stx-row-title">${esc(row.title)}</span>
          <span class="stx-row-meta"><b>${esc(row.code)}</b> · ${esc(shortDate(row.openedAt))} · ${L(`${n} vipande`, `${n} items`)}</span>
          <span class="stx-row-badges">${pill(L(status.sw, status.en), status.tone)}${row.sample ? pill(L('Sampuli', 'Sample'), 'neutral') : ''}</span>
        </span>
        <span class="stx-row-right">${icon('i-chevron-right')}</span>
      </button>`;
    }).join('')}</div>`
      : stateBox({
          iconId: 'i-folder', title: L('Hakuna kesi bado', 'No cases yet'),
          note: L('Unda kesi kisha uunganishe ushahidi na ripoti.', 'Create a case, then attach evidence and reports.'),
          action: btn(L('Unda kesi', 'Create a case'), { act: 'nav.case.new', tone: 'primary', iconId: 'i-plus' })
        })}
  `;
  return {
    title: L('Kesi', 'Cases'),
    subtitle: L(`${rows.length} kesi`, `${rows.length} cases`),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L('Ushahidi', 'Evidence'), screen: 'storage.evidence' },
      { label: L('Kesi', 'Cases'), screen: 'storage.cases' }
    ],
    body
  };
}

/* --------------------------------------------- incident evidence collection */
export async function caseDetail({ params }) {
  const summary = await caseSummary(params.caseId);
  if (!summary) {
    return {
      title: L('Kesi', 'Case'), subtitle: '',
      crumbs: [{ label: L('Hifadhi', 'Storage'), screen: 'storage.home' }, { label: L('Kesi', 'Cases'), screen: 'storage.cases' }],
      body: stateBox({
        iconId: 'i-alert-circle', title: L('Kesi haipo', 'Case not found'),
        action: btn(L('Rudi', 'Back'), { act: 'nav.cases', iconId: 'i-arrow-left' })
      })
    };
  }

  const status = CASE_STATUS.find((s) => s.id === summary.status) || CASE_STATUS[0];
  const items = [...summary.items].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const groups = [];
  for (const item of items) {
    const key = item.kind === 'evidence' ? item.evidenceType : item.category;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const type = EVIDENCE_TYPES.find((t) => t.id === key);
      group = {
        key,
        label: type ? L(type.sw, type.en) : L(item.categoryLabel?.sw || key, item.categoryLabel?.en || key),
        iconId: type ? type.icon : 'i-folder',
        items: []
      };
      groups.push(group);
    }
    group.items.push(item);
  }

  const custodyCount = summary.custodyCount;

  const body = `
    ${card(`
      <div class="stx-casehead">
        <div>
          <span class="gds-eyebrow">${esc(summary.code)}</span>
          <h2 class="stx-hero-title">${esc(summary.title)}</h2>
          <p class="stx-hero-note is-clamp">${esc(summary.summary || L('Hakuna maelezo.', 'No summary.'))}</p>
          <div class="stx-row-badges">
            ${pill(L(status.sw, status.en), status.tone)}
            ${summary.sample ? pill(L('Sampuli', 'Sample'), 'neutral') : ''}
            ${custodyCount ? pill(L(`${custodyCount} matukio`, `${custodyCount} events`), 'muted', 'i-clock') : ''}
          </div>
        </div>
        <div class="stx-casehead-actions">
          ${btn(L('Ongeza ushahidi', 'Add evidence'), { act: 'nav.add', tone: 'primary', iconId: 'i-plus', extra: `data-kind="evidence" data-case="${esc(summary.id)}"` })}
        </div>
      </div>
      <div class="gds-stats stx-stats">
        ${stat(String(summary.items.filter((i) => i.kind === 'evidence').length), L('Ushahidi', 'Evidence'))}
        ${stat(String(summary.items.filter((i) => i.kind !== 'evidence').length), L('Nyaraka', 'Documents'))}
        ${stat(String(summary.items.filter((i) => i.version !== 'original').length), L('Nakala', 'Derived copies'))}
        ${stat(String(summary.items.filter((i) => i.integrity?.hash).length), L('Zenye alama', 'Digest recorded'))}
      </div>`,
      { cls: 'is-hero' })}

    ${sect(L('Mfululizo wa matukio', 'Timeline'), { sub: L('Kila kipande kwa tarehe yake', 'Every item in date order') })}
    ${items.length ? card(`<ol class="stx-tl">
      ${items.map((item) => `<li class="stx-tl-item">
        <span class="stx-tl-dot">${icon(itemIconSafe(item))}</span>
        <button type="button" class="stx-tl-body" data-stx="open.item" data-key="${esc(item.id)}">
          <span class="stx-tl-when">${esc(dateTime(item.createdAt || item.uploadedAt))}</span>
          <span class="stx-tl-title">${esc(item.title)}</span>
          <span class="stx-tl-meta">
            ${item.evidenceId ? `<b>${esc(item.evidenceId)}</b> · ` : ''}
            ${esc(item.subLabel ? L(item.subLabel.sw, item.subLabel.en) : '')}
            ${item.sizeBytes ? ` · ${esc(bytes(item.sizeBytes))}` : ''}
          </span>
        </button>
      </li>`).join('')}
    </ol>`, { cls: 'is-flush' })
      : stateBox({ iconId: 'i-inbox', title: L('Hakuna nyenzo bado', 'No material yet'), note: L('Ongeza ushahidi kwenye kesi hii.', 'Add evidence to this case.') })}

    ${sect(L('Kwa aina', 'By kind'), { sub: L('Vikundi vya nyenzo zilizounganishwa', 'Grouped materials') })}
    <div class="stx-casegroups">
      ${groups.map((group) => `<div class="stx-casegroup">
        <div class="stx-casegroup-head">
          <span class="stx-casegroup-ico">${icon(group.iconId)}</span>
          <b>${esc(group.label)}</b><em>${group.items.length}</em>
        </div>
        ${group.items.map((item) => `
          <button type="button" class="stx-minirow" data-stx="open.item" data-key="${esc(item.id)}">
            <span>${esc(item.title)}</span>
            ${pill(item.verification === 'reviewed' ? L('Imekaguliwa', 'Reviewed') : L('Haijakaguliwa', 'Unreviewed'),
              item.verification === 'reviewed' ? 'ok' : 'muted')}
          </button>`).join('')}
      </div>`).join('')}
      ${!groups.length ? '<p class="stx-count">—</p>' : ''}
    </div>

    ${footNote(L('Kumbukumbu ya kifaa hiki — hakuna mamlaka inayoipokea.', 'A record on this device — no authority receives it.'))}
  `;

  return {
    title: summary.title,
    subtitle: summary.code,
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L('Kesi', 'Cases'), screen: 'storage.cases' },
      { label: summary.code, screen: 'storage.case', param: summary.id }
    ],
    body
  };
}

const itemIconSafe = (item) => {
  if (item.kind === 'evidence') {
    const t = EVIDENCE_TYPES.find((x) => x.id === item.evidenceType);
    return t ? t.icon : 'i-shield-check';
  }
  return 'i-folder';
};

export const _unusedCustody = custodyOf;
export const _unusedRow = itemRow;
export const _unusedCard = itemCard;
export const _unusedPreview = previewPanel;
