/**
 * GuardHai · features/storage/screens-home.js
 * The browsing half of the Storage Center: the dashboard, a category, a
 * subcategory, global search and the advanced filter screen.
 *
 * Every list on every one of these screens runs through the same pipeline in
 * storage.service.js (`applyFilters`), so a filter chip cannot mean one thing
 * here and something else two screens away.
 */
import {
  L, esc, icon, chip, tile, stat, meter, btn, iconBtn, pill, crumbs, sect, card,
  toolbar, categoryTile, evidenceTile, itemRow, itemCard, stateBox, form, select,
  previewPanel, footNote, bytes, shortDate
} from './storage-ui.js';
import {
  CATEGORIES, EVIDENCE_TYPES, PRIVACY, VERIFICATION, FILE_TYPES, SOURCES, SIZE_BANDS,
  DATE_RANGES, categoryOf, subOf, subcategoriesOf, labelOf, HONESTY, HONESTY_SHORT
} from '../../domain/storage.js';
import { applyFilters, stats, listCases, allItems } from '../../services/storage.service.js';
import { state } from './storage-state.js';

/* --------------------------------------------------------------- helpers */
export const countBy = (items, key, value) => items.filter((i) => i[key] === value).length;

export function subRail(category, items, activeSub) {
  return `<div class="stx-subrail" role="tablist" aria-label="${esc(L('Vijamii', 'Subcategories'))}">
    <button type="button" role="tab" aria-selected="${activeSub === 'all'}"
      class="stx-subchip${activeSub === 'all' ? ' is-active' : ''}"
      data-stx="filter.sub" data-key="all">
      <span>${L('Zote', 'All')}</span><em>${items.length}</em>
    </button>
    ${subcategoriesOf(category.id).map((sub) => {
      const n = items.filter((i) => i.subcategory === sub.id).length;
      return `<button type="button" role="tab" aria-selected="${activeSub === sub.id}"
        class="stx-subchip${activeSub === sub.id ? ' is-active' : ''}"
        data-stx="filter.sub" data-key="${esc(sub.id)}">
        <span>${esc(L(sub.sw, sub.en))}</span>${n ? `<em>${n}</em>` : ''}
      </button>`;
    }).join('')}
  </div>`;
}

export function filterSummary() {
  const f = state.filters;
  const chips = [];
  if (f.q) chips.push({ key: 'q', label: `“${f.q}”` });
  if (f.category !== 'all') {
    const c = categoryOf(f.category);
    if (c) chips.push({ key: 'category', label: L(c.sw, c.en) });
  }
  if (f.evidenceType !== 'all') {
    const t = EVIDENCE_TYPES.find((x) => x.id === f.evidenceType);
    if (t) chips.push({ key: 'evidenceType', label: L(t.swShort, t.enShort) });
  }
  if (f.fileType !== 'all') {
    const t = labelOf(FILE_TYPES, f.fileType);
    if (t) chips.push({ key: 'fileType', label: L(t.sw, t.en) });
  }
  if (f.source !== 'all') {
    const t = labelOf(SOURCES, f.source);
    if (t) chips.push({ key: 'source', label: L(t.sw, t.en) });
  }
  if (f.privacy !== 'all') {
    const t = labelOf(PRIVACY, f.privacy);
    if (t) chips.push({ key: 'privacy', label: L(t.sw, t.en) });
  }
  if (f.verification !== 'all') {
    const t = labelOf(VERIFICATION, f.verification);
    if (t) chips.push({ key: 'verification', label: L(t.sw, t.en) });
  }
  if (f.size !== 'all') {
    const t = labelOf(SIZE_BANDS, f.size);
    if (t) chips.push({ key: 'size', label: L(t.sw, t.en) });
  }
  if (f.range !== 'any') {
    const t = labelOf(DATE_RANGES, f.range);
    if (t) chips.push({ key: 'range', label: L(t.sw, t.en) });
  }
  if (f.location !== 'all') chips.push({ key: 'location', label: f.location === 'yes' ? L('Yenye eneo', 'Has location') : f.location === 'no' ? L('Bila eneo', 'No location') : L('Eneo lililoruhusiwa', 'Authorized location') });
  if (f.case !== 'all') chips.push({ key: 'case', label: L('Kesi', 'Case') });
  if (f.event !== 'all') chips.push({ key: 'event', label: L('Tukio', 'Event') });
  if (!chips.length) return '';
  return `<div class="stx-fchips">
    ${chips.map((c) => `<button type="button" class="stx-fchip" data-stx="filter.clear" data-key="${esc(c.key)}">
      ${esc(c.label)}${icon('i-x')}</button>`).join('')}
    <button type="button" class="stx-fchip is-reset" data-stx="filter.reset">${L('Ondoa zote', 'Clear all')}</button>
  </div>`;
}

export function viewToggle() {
  const view = state.filters.view;
  return `<div class="stx-viewtoggle" role="group" aria-label="${esc(L('Muonekano', 'View'))}">
    <button type="button" class="stx-vt${view === 'list' ? ' is-active' : ''}" data-stx="view.set" data-key="list"
      aria-pressed="${view === 'list'}" aria-label="${esc(L('Orodha', 'List view'))}">${icon('i-list')}</button>
    <button type="button" class="stx-vt${view === 'grid' ? ' is-active' : ''}" data-stx="view.set" data-key="grid"
      aria-pressed="${view === 'grid'}" aria-label="${esc(L('Gridi', 'Grid view'))}">${icon('i-box')}</button>
  </div>`;
}

export const searchBar = (value = '', placeholder = '') => `
  <form class="stx-search" data-stx-form="filters.search" role="search">
    ${icon('i-search')}
    <input type="search" name="q" value="${esc(value)}" aria-label="${esc(L('Tafuta', 'Search'))}"
      placeholder="${esc(placeholder || L('Tafuta kumbukumbu zote…', 'Search all records…'))}">
    ${value ? `<button type="button" class="stx-search-clear" data-stx="filters.search.clear" aria-label="${esc(L('Futa', 'Clear'))}">${icon('i-x')}</button>` : ''}
    <button type="submit" class="stx-search-go">${L('Tafuta', 'Search')}</button>
  </form>`;

export function itemCollection(items, { emptyTitle, emptyNote, emptyAction = '' } = {}) {
  if (!items.length) {
    return stateBox({
      iconId: 'i-inbox', title: emptyTitle || L('Hakuna rekodi', 'No records'),
      note: emptyNote || L('Kumbukumbu zitaonekana hapa zikiongezwa.', 'Records will appear here once added.'),
      action: emptyAction
    });
  }
  if (state.filters.view === 'grid') {
    return `<div class="stx-grid">${items.map((i) => itemCard(i, { selected: i.id === state.selectedId })).join('')}</div>`;
  }
  return `<div class="stx-list">${items.map((i) => itemRow(i, { selected: i.id === state.selectedId })).join('')}</div>`;
}

/* ------------------------------------------------------------------ home */
export async function home({ items, summary }) {
  const recent = [...items].sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt))).slice(0, 6);
  const usagePct = summary.quota ? Math.min(100, (summary.usage / summary.quota) * 100) : 0;

  /* An empty store gets one clean page, not a dashboard of zeros. */
  if (!summary.total) {
    return {
      title: L('Hifadhi', 'Storage'),
      subtitle: L('Hakuna rekodi bado', 'No records yet'),
      crumbs: [{ label: L('Hifadhi', 'Storage'), screen: 'storage.home' }],
      body: `
        ${stateBox({
          iconId: 'i-folder',
          title: L('Anza na rekodi moja', 'Start with one record'),
          note: L('Nyaraka, ushahidi au kesi — zote zinabaki kwenye kifaa hiki.',
            'A document, a piece of evidence or a case — all stay on this device.'),
          action: `${btn(L('Ongeza rekodi', 'Add a record'), { act: 'nav.add', tone: 'primary', iconId: 'i-plus' })}
            ${btn(L('Sampuli', 'Samples'), { act: 'samples.seed', iconId: 'i-plus' })}`
        })}
        ${footNote(L(HONESTY_SHORT.storage.sw, HONESTY_SHORT.storage.en))}
      `
    };
  }

  const body = `
    ${card(`
      <div class="stx-hero">
        <div class="stx-hero-main">
          <h2 class="stx-hero-title">${L('Kumbukumbu zako, pamoja', 'Your records, together')}</h2>
          <p class="stx-hero-note">${L('Nyaraka, ushahidi na rekodi — kwenye kifaa hiki.',
            'Documents, evidence and records — on this device.')}</p>
          <div class="stx-hero-actions">
            ${btn(L('Ongeza', 'Add'), { act: 'nav.add', tone: 'primary', iconId: 'i-plus' })}
            ${btn(L('Tafuta', 'Search'), { act: 'nav.search', iconId: 'i-search', extra: 'data-hero="soft"' })}
          </div>
        </div>
        <div class="stx-hero-space">
          ${stat(bytes(summary.bytes), L('Kwenye rekodi', 'In records'))}
          ${summary.quota ? meter(usagePct) : ''}
          <span class="stx-hero-space-note">${summary.quota
            ? `${bytes(summary.usage)} / ${bytes(summary.quota)}`
            : L('Hakuna kikomo kilichotajwa', 'No quota reported')}</span>
        </div>
      </div>
      <div class="gds-stats stx-stats">
        ${stat(String(summary.live), L('Rekodi', 'Records'))}
        ${stat(String(summary.evidence), L('Ushahidi', 'Evidence'))}
        ${stat(String(summary.openCases), L('Kesi', 'Cases'))}
        ${stat(String(summary.unreviewed), L('Hazijakaguliwa', 'Unreviewed'), '', summary.unreviewed ? 'amber' : '')}
      </div>
    `, { cls: 'is-hero' })}

    ${sect(L('Ushahidi', 'Evidence'), {
      action: btn(L('Fungua', 'Open'), { act: 'nav.evidence', iconId: 'i-shield-check', small: true })
    })}
    ${card(`<div class="stx-evgrid">
      ${EVIDENCE_TYPES.map((type) => evidenceTile(type, summary.byEvidenceType[type.id] || 0)).join('')}
    </div>`, { cls: 'is-flush' })}

    ${sect(L('Jamii', 'Categories'))}
    <div class="stx-catgrid">
      ${CATEGORIES.map((c) => categoryTile(c, summary.byCategory[c.id] || 0)).join('')}
    </div>

    ${summary.cases ? `${sect(L('Kesi', 'Cases'), {
      action: btn(L('Zote', 'All'), { act: 'nav.cases', small: true })
    })}
    ${card(await caseRows(), { cls: 'is-flush' })}` : ''}

    ${recent.length ? `${sect(L('Za hivi karibuni', 'Recent'), {
      action: btn(L('Zote', 'All'), { act: 'nav.all', small: true })
    })}
    ${card(itemCollection(recent, {}), { cls: 'is-flush' })}` : ''}

    ${footNote(L(HONESTY_SHORT.storage.sw, HONESTY_SHORT.storage.en), `
      ${summary.samples
        ? btn(L('Ondoa sampuli', 'Clear samples'), { act: 'samples.clear', tone: 'ghost', iconId: 'i-trash', small: true })
        : btn(L('Sampuli', 'Samples'), { act: 'samples.seed', tone: 'ghost', iconId: 'i-plus', small: true })}
      ${btn(L('Nafasi', 'Space'), { act: 'nav.usage', tone: 'ghost', iconId: 'i-hdd', small: true })}
    `)}
  `;

  return {
    title: L('Hifadhi', 'Storage'),
    subtitle: L(`${summary.live} rekodi · ${bytes(summary.bytes)}`, `${summary.live} records · ${bytes(summary.bytes)}`),
    crumbs: [{ label: L('Hifadhi', 'Storage'), screen: 'storage.home' }],
    body
  };
}

async function caseRows() {
  const rows = await listCases();
  return `<div class="stx-list">${rows.slice(0, 4).map((row) => `
    <button type="button" class="stx-row" data-stx="open.case" data-key="${esc(row.id)}">
      <span class="stx-row-ico">${icon('i-folder')}</span>
      <span class="stx-row-copy">
        <span class="stx-row-title">${esc(row.title)}</span>
        <span class="stx-row-meta"><b>${esc(row.code)}</b> · ${esc(shortDate(row.openedAt))}</span>
        <span class="stx-row-badges">${pill(row.status === 'open' ? L('Wazi', 'Open') : row.status === 'review' ? L('Inakaguliwa', 'Under review') : L('Imefungwa', 'Closed'),
          row.status === 'open' ? 'warn' : row.status === 'review' ? 'info' : 'muted')}${row.sample ? pill(L('Sampuli', 'Sample'), 'neutral') : ''}</span>
      </span>
      <span class="stx-row-right">${icon('i-chevron-right')}</span>
    </button>`).join('')}</div>`;
}

/* -------------------------------------------------------------- category */
export async function category({ items, params }) {
  const cat = categoryOf(params.category) || CATEGORIES[0];
  const scoped = items.filter((i) => i.category === cat.id);
  const visible = applyFilters(scoped, { ...state.filters, category: cat.id, includeArchived: cat.id === 'archives' });
  const activeSub = state.filters.subcategory || 'all';
  const selected = visible.find((i) => i.id === state.selectedId) || visible[0] || null;

  const emptyFor = () => {
    if (cat.id === 'health') {
      return stateBox({
        iconId: 'i-heart-pulse', title: L('Hakuna rekodi za afya zilizounganishwa', 'No health records linked'),
        note: L('Rekodi za afya zinahifadhiwa kwenye moduli ya Afya; hapa zinaonekana kama kiungo cha kuzifikia — hakuna nakala ya pili.',
          'Health records live in the Health module; here they appear as authorized pointers — never a second copy.'),
        action: btn(L('Fungua Afya', 'Open Health'), { act: 'go.health', tone: 'primary', iconId: 'i-heart-pulse' })
      });
    }
    if (cat.id === 'shared') {
      return stateBox({
        iconId: 'i-users', title: L('Hakuna ufikiaji ulioshirikiwa', 'No shared access'),
        note: L(HONESTY.sharing.sw, HONESTY.sharing.en),
        action: btn(L('Rekodi zangu', 'My records'), { act: 'nav.home', iconId: 'i-inbox' })
      });
    }
    return stateBox({
      iconId: cat.icon, title: L(`Hakuna kumbukumbu kwenye ${cat.sw}`, `No records in ${cat.en}`),
      note: L('Ongeza rekodi au chagua kijamii kingine.', 'Add a record or pick another subcategory.'),
      action: btn(L('Ongeza rekodi', 'Add a record'), { act: 'nav.add', tone: 'primary', iconId: 'i-plus' })
    });
  };

  const body = `
    ${card(`
      <div class="stx-cathead">
        <span class="stx-cathead-ico" data-tone="${esc(cat.id === 'health' ? 'red' : 'green')}">${icon(cat.icon)}</span>
        <div class="stx-cathead-copy">
          <b>${esc(L(cat.sw, cat.en))}</b>
          <span>${esc(L(cat.noteSw, cat.noteEn))}</span>
        </div>
        <button type="button" class="stx-catadd" data-stx="nav.add"
          aria-label="${esc(L('Ongeza rekodi', 'Add a record'))}" title="${esc(L('Ongeza rekodi', 'Add a record'))}">
          ${icon('i-plus')}
        </button>
      </div>
    `, { cls: 'is-flush' })}

    ${subRail(cat, scoped, activeSub)}
    ${filterSummary()}

    ${toolbar(`${searchBar(state.filters.q, L(`Tafuta kwenye ${cat.sw}…`, `Search in ${cat.en}…`))}
      <div class="stx-toolbar-right">${viewToggle()}</div>`)}

    <div class="stx-split">
      <div class="stx-split-list">
        ${itemCollection(visible, { emptyTitle: '', emptyNote: '' }).includes('stx-state')
          ? emptyFor()
          : `${card(itemCollection(visible, {}), { cls: 'is-flush' })}
             <p class="stx-count">${L(`${visible.length} rekodi`, `${visible.length} records`)}</p>`}
      </div>
      <div class="stx-split-preview" id="stxPreview">
        ${previewPanel(selected)}
      </div>
    </div>
  `;

  return {
    title: L(cat.sw, cat.en),
    subtitle: L(`${scoped.length} rekodi · ${cat.subs.length} vijamii`, `${scoped.length} records · ${cat.subs.length} subcategories`),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L(cat.sw, cat.en), screen: 'storage.category', param: cat.id }
    ],
    body
  };
}

/* -------------------------------------------------------------------- sub */
export async function sub({ items, params }) {
  const cat = categoryOf(params.category) || CATEGORIES[0];
  const subRow = subOf(cat.id, params.sub);
  const scoped = items.filter((i) => i.category === cat.id && i.subcategory === params.sub);
  const visible = applyFilters(scoped, { ...state.filters, includeArchived: cat.id === 'archives' });
  const selected = visible.find((i) => i.id === state.selectedId) || visible[0] || null;

  const body = `
    <div class="stx-cathead">
      ${tile(cat.icon, cat.tone || 'green')}
      <div class="stx-cathead-copy">
        <b>${esc(subRow ? L(subRow.sw, subRow.en) : L('Kijamii', 'Subcategory'))}</b>
        <span>${esc(L(cat.sw, cat.en))}</span>
      </div>
      <div class="stx-cathead-actions">
        ${btn(L('Ongeza', 'Add'), { act: 'nav.add', tone: 'primary', iconId: 'i-plus', small: true })}
      </div>
    </div>
    ${filterSummary()}
    ${toolbar(`${searchBar(state.filters.q)}
      <div class="stx-toolbar-right">
        ${btn(L('Jamii', 'Category'), { act: 'go', extra: `data-key="storage.category" data-param="${esc(cat.id)}"`, small: true, iconId: 'i-arrow-left' })}
        ${viewToggle()}
      </div>`)}
    <div class="stx-split">
      <div class="stx-split-list">${card(itemCollection(visible, {
        iconId: cat.icon,
        title: L('Hakuna rekodi hapa', 'No records here'),
        note: L('Ongeza rekodi kwenye kijamii hiki.', 'Add a record to this subcategory.')
      }), { cls: 'is-flush' })}</div>
      <div class="stx-split-preview">${previewPanel(selected)}</div>
    </div>
  `;

  return {
    title: subRow ? L(subRow.sw, subRow.en) : cat.sw,
    subtitle: L(`${visible.length} rekodi`, `${visible.length} records`),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L(cat.sw, cat.en), screen: 'storage.category', param: cat.id },
      { label: subRow ? L(subRow.sw, subRow.en) : '', screen: 'storage.sub', param: '' }
    ],
    body
  };
}

/* ----------------------------------------------------------------- search */
export async function search({ items }) {
  const term = state.filters.q || '';
  const results = applyFilters(items, state.filters);
  const body = `
    ${card(`${searchBar(term, L('Jina, maelezo, kitambulisho cha ushahidi, lebo…', 'Title, description, evidence ID, tag…'))}
      <div class="stx-search-meta">
        <span>${term
          ? L(`${results.length} matokeo kwa “${term}”`, `${results.length} results for “${term}”`)
          : L('Andika neno la kutafuta kwenye kumbukumbu zote zilizoruhusiwa.', 'Type a word to search every authorized record.')}</span>
        ${btn(L('Vichujio vya kina', 'Advanced filters'), { act: 'nav.filters', small: true, iconId: 'i-filter' })}
      </div>`)}
    ${filterSummary()}
    ${results.length || term
      ? card(itemCollection(results, {
          iconId: 'i-search', title: L('Hakuna matokeo', 'No results'),
          note: L('Jaribu neno lingine au ondoa vichujio.', 'Try another word or clear the filters.'),
          action: btn(L('Ondoa vichujio', 'Clear filters'), { act: 'filter.reset' })
        }), { cls: 'is-flush' })
      : stateBox({
          iconId: 'i-search', title: L('Tafuta kwenye hifadhi', 'Search your storage'),
          note: L('Utafutaji unafanyika kwenye kifaa hiki pekee, kwenye rekodi unazoruhusiwa kuona.', 'Search runs on this device only, across records you are allowed to see.')
        })}
  `;
  return {
    title: L('Tafuta kwenye hifadhi', 'Search storage'),
    subtitle: term ? L(`${results.length} matokeo`, `${results.length} results`) : L('Utafutaji wa kifaa', 'On-device search'),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L('Tafuta', 'Search'), screen: 'storage.search' }
    ],
    body
  };
}

/* ---------------------------------------------------------------- filters */
export async function filters({ items }) {
  const f = state.filters;
  const catOptions = [{ value: 'all', label: L('Zote', 'All') }, ...CATEGORIES.map((c) => ({ value: c.id, label: L(c.sw, c.en) }))];
  const subOptions = [{ value: 'all', label: L('Zote', 'All') },
    ...(f.category !== 'all' ? subcategoriesOf(f.category) : CATEGORIES.flatMap((c) => c.subs))
      .map((s) => ({ value: s.id, label: L(s.sw, s.en) }))];
  const preview = applyFilters(items, f);

  const body = `
    ${card(`
      <div class="stx-filtergrid">
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Jamii', 'Category'), name: 'category', value: f.category, options: catOptions })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Kijamii', 'Subcategory'), name: 'subcategory', value: f.subcategory, options: subOptions })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Aina ya faili', 'File type'), name: 'fileType', value: f.fileType,
          options: [{ value: 'all', label: L('Zote', 'All') }, ...FILE_TYPES.map((x) => ({ value: x.id, label: L(x.sw, x.en) }))] })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Kipindi', 'Date range'), name: 'range', value: f.range,
          options: DATE_RANGES.map((x) => ({ value: x.id, label: L(x.sw, x.en) })) })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Chanzo', 'Source'), name: 'source', value: f.source,
          options: [{ value: 'all', label: L('Zote', 'All') }, ...SOURCES.map((x) => ({ value: x.id, label: L(x.sw, x.en) }))] })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Mmiliki', 'Owner'), name: 'owner', value: f.owner,
          options: [{ value: 'all', label: L('Wote', 'Anyone') }, { value: 'me', label: L('Mimi', 'Me') }] })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Tukio husika', 'Related event'), name: 'event', value: f.event,
          options: [{ value: 'all', label: L('Zote', 'All') }] })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Kesi husika', 'Related case'), name: 'case', value: f.case,
          options: [{ value: 'all', label: L('Zote', 'All') }, ...(await listCases()).map((c) => ({ value: c.id, label: `${c.code} — ${c.title}` }))] })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Faragha na ufikiaji', 'Privacy and access'), name: 'privacy', value: f.privacy,
          options: [{ value: 'all', label: L('Zote', 'All') }, ...PRIVACY.map((x) => ({ value: x.id, label: L(x.sw, x.en) }))] })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Hali ya uhakiki', 'Verification status'), name: 'verification', value: f.verification,
          options: [{ value: 'all', label: L('Zote', 'All') }, ...VERIFICATION.map((x) => ({ value: x.id, label: L(x.sw, x.en) }))] })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Ukubwa wa faili', 'File size'), name: 'size', value: f.size,
          options: [{ value: 'all', label: L('Zote', 'All') }, ...SIZE_BANDS.map((x) => ({ value: x.id, label: L(x.sw, x.en) }))] })}
        ${select({ attrs: 'data-stx-select="filter.set"', label: L('Eneo', 'Location'), name: 'location', value: f.location,
          options: [
            { value: 'all', label: L('Zote', 'All') },
            { value: 'yes', label: L('Yenye eneo', 'Has location') },
            { value: 'no', label: L('Bila eneo', 'No location') },
            { value: 'authorized', label: L('Eneo lililoruhusiwa', 'Authorized location') }
          ] })}
      </div>
      <div class="stx-filterfoot">
        <span>${L(`${preview.length} zinazolingana`, `${preview.length} match`)}</span>
        <div class="stx-hero-actions">
          ${btn(L('Ondoa zote', 'Clear all'), { act: 'filter.reset', tone: 'ghost' })}
          ${btn(L('Tumia', 'Apply'), { act: 'filter.apply', tone: 'primary', iconId: 'i-check' })}
        </div>
      </div>`,
      { cls: '' })}
    <form class="stx-filternote" data-stx-form="filters.apply" hidden></form>
    ${footNote(L('Vichujio vinatumika kwenye orodha zote — hakuna kinachotumwa.',
      'The filters apply to every list — nothing is sent.'))}
  `;

  return {
    title: L('Vichujio vya kina', 'Advanced filters'),
    subtitle: L('Vipimo 12', 'Twelve dimensions'),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L('Vichujio', 'Filters'), screen: 'storage.filters' }
    ],
    body
  };
}

/* ------------------------------------------------------------------- all */
export async function all({ items }) {
  const visible = applyFilters(items, state.filters);
  const selected = visible.find((i) => i.id === state.selectedId) || visible[0] || null;
  const body = `
    ${filterSummary()}
    ${toolbar(`${searchBar(state.filters.q)}<div class="stx-toolbar-right">${viewToggle()}</div>`)}
    <div class="stx-split">
      <div class="stx-split-list">${card(itemCollection(visible, {
        iconId: 'i-inbox', title: L('Hakuna rekodi', 'No records'),
        note: L('Ongeza rekodi ya kwanza kwenye hifadhi.', 'Add the first record to your storage.'),
        action: btn(L('Ongeza rekodi', 'Add a record'), { act: 'nav.add', tone: 'primary', iconId: 'i-plus' })
      }), { cls: 'is-flush' })}</div>
      <div class="stx-split-preview">${previewPanel(selected)}</div>
    </div>
  `;
  return {
    title: L('Rekodi zote', 'All records'),
    subtitle: L(`${visible.length} zinazoonekana`, `${visible.length} visible`),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L('Rekodi zote', 'All records'), screen: 'storage.all' }
    ],
    body
  };
}

export const plainStats = stats;
export const plainAll = allItems;
export const plainChip = chip;
