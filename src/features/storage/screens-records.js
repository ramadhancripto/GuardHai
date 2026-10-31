/**
 * GuardHai · features/storage/screens-records.js
 * Record-level screens: one record with its full metadata sheet, chain of
 * custody and actions; the add-record form; the new-case form; the share form;
 * and the device-usage screen that the old Storage sheet used to show.
 *
 * The metadata sheet is the honest core of the feature: it only prints values
 * the record actually carries, and every "not available" is written as such.
 */
import {
  L, esc, icon, chip, tile, alert, stat, meter, btn, badge, sect, card, stateBox,
  form, field, select, previewPanel, renderMedia, footNote, itemTone, bytes, dateTime
} from './storage-ui.js';
import {
  CATEGORIES, EVIDENCE_TYPES, PRIVACY, VERIFICATION, VERSIONS, SOURCES, FILE_TYPES,
  CASE_KINDS, SHARE_LEVELS, categoryOf, subcategoriesOf, labelOf, HONESTY_SHORT, LIMITS
} from '../../domain/storage.js';
import {
  getItem, custodyOf, listCases, itemsForCase, listShares, stats, itemsForRecord
} from '../../services/storage.service.js';
import { state } from './storage-state.js';
import { storageUsage } from '../../services/media.service.js';
import { countPosts } from '../../services/posts.service.js';
import { countDrafts } from '../../services/drafts.service.js';

const toneOf = (list, id) => (list.find((x) => x.id === id) || {}).tone || 'muted';

/* -------------------------------------------------------------- record */
export async function item({ params }) {
  const record = await getItem(params.id);
  if (!record) {
    return {
      title: L('Rekodi', 'Record'), subtitle: '',
      crumbs: [{ label: L('Hifadhi', 'Storage'), screen: 'storage.home' }],
      body: stateBox({
        iconId: 'i-alert-circle', title: L('Rekodi haipo', 'Record not found'),
        note: L('Huenda ilifutwa kwenye kifaa hiki.', 'It may have been deleted on this device.'),
        action: btn(L('Rudi', 'Back'), { act: 'back', iconId: 'i-arrow-left' })
      })
    };
  }

  const revealed = state.unlocked.has(record.id);
  const locked = record.privacy === 'restricted' && !revealed;
  const history = await custodyOf(record.id);
  const cases = await listCases();
  const linkedCases = cases.filter((c) => (record.caseIds || []).includes(c.id));
  const shares = (await listShares()).filter((s) => s.itemId === record.id);
  const related = await itemsForRecord(record);
  const version = labelOf(VERSIONS, record.version) || VERSIONS[0];
  const privacy = labelOf(PRIVACY, record.privacy) || PRIVACY[0];
  const source = labelOf(SOURCES, record.source) || SOURCES[1];
  const verification = labelOf(VERIFICATION, record.verification) || VERIFICATION[0];

  if (locked) {
    return {
      title: record.title,
      subtitle: L('Rekodi imezuiwa', 'Record restricted'),
      crumbs: [
        { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
        { label: L(privacy.sw, privacy.en), screen: 'storage.item', param: record.id }
      ],
      body: card(`
        <div class="stx-locked-page">
          <span class="stx-locked-ico">${icon('i-lock')}</span>
          <h2>${L('Rekodi imezuiwa', 'This record is restricted')}</h2>
          <p>${L('Kufungua ni hatua yako, na itaandikwa kwenye historia yake.',
            'Unlocking is your own step, and it is written to the record’s history.')}</p>
          <div class="stx-hero-actions">
            ${btn(L('Fungua rekodi', 'Unlock this record'), { act: 'record.unlock', key: record.id, tone: 'primary', iconId: 'i-key' })}
            ${btn(L('Rudi', 'Back'), { act: 'back', iconId: 'i-arrow-left' })}
          </div>
        </div>`)
    };
  }

  const rows = [
    [L('Kitambulisho cha ushahidi', 'Evidence ID'), record.evidenceId || '—', record.evidenceId ? 'mono' : 'muted'],
    [L('Aina ya ushahidi', 'Evidence type'), record.evidenceType ? L(EVIDENCE_TYPES.find((t) => t.id === record.evidenceType)?.sw, EVIDENCE_TYPES.find((t) => t.id === record.evidenceType)?.en) : L('Si ushahidi', 'Not evidence')],
    [L('Jamii', 'Category'), L(categoryOf(record.category)?.sw, categoryOf(record.category)?.en)],
    [L('Kijamii', 'Subcategory'), record.subLabel ? L(record.subLabel.sw, record.subLabel.en) : '—'],
    [L('Aina ya faili', 'File type'), record.fileType ? labelOf(FILE_TYPES, record.fileType)?.sw : '—'],
    [L('Ukubwa', 'Size'), record.sizeBytes ? bytes(record.sizeBytes) : L('Hakuna faili', 'No file')],
    [L('Chanzo halisi', 'Original source'), L(source.sw, source.en) + (record.sourceLabel ? ` · ${record.sourceLabel}` : '')],
    [L('Mmiliki', 'Owner'), record.ownerName || '—'],
    [L('Aliyepakia', 'Uploader'), record.uploadedByName || '—'],
    [L('Tarehe ya tukio', 'Created'), record.createdAt ? dateTime(record.createdAt) : '—'],
    [L('Tarehe ya kupakia', 'Uploaded'), record.uploadedAt ? dateTime(record.uploadedAt) : '—'],
    [L('Eneo', 'Location'), record.location
      ? `${record.location.label}${record.location.authorized ? ` · ${L('imeruhusiwa', 'authorized')}` : ` · ${L('haijaruhusiwa (haitumiki)', 'not authorized (not used)')}`}`
      : L('Hakuna eneo lililorekodiwa', 'No location recorded')],
    [L('Ufikiaji', 'Access'), record.readOnly ? L('Inadhibitiwa na Afya', 'Controlled by Health') : L('Wewe', 'You')]
  ];

  const integrity = record.integrity?.hash
    ? `<div class="stx-integrity">
        <span class="stx-integrity-head">${icon('i-shield-check')}<b>${L('Alama ya faili', 'File digest')}</b>${badge('SHA-256', 'ok')}</span>
        <code class="stx-hash">${esc(record.integrity.hash)}</code>
        <span class="stx-integrity-note">${L('Imehesabiwa kwenye kifaa hiki', 'Computed on this device')} · ${esc(dateTime(record.integrity.computedAt))} · ${esc(bytes(record.integrity.size))}</span>
      </div>`
    : `<div class="stx-integrity is-muted">
        <span class="stx-integrity-head">${icon('i-info')}<b>${L('Hakuna alama ya faili', 'No file digest')}</b></span>
        <span class="stx-integrity-note">${L('Alama inahesabiwa tu kwa faili iliyopo kwenye kifaa hiki. Bonyeza “Hesabu alama” ukiwa na faili halisi.',
          'A digest is only computed for a file that exists on this device. Use “Compute digest” when the real file is here.')}</span>
        ${record.blobKey ? btn(L('Hesabu alama (SHA-256)', 'Compute digest (SHA-256)'), { act: 'record.integrity', key: record.id, small: true, iconId: 'i-shield-check' }) : ''}
      </div>`;

  const origin = record.originId ? related.origin : null;

  const body = `
    ${card(`
      <div class="stx-rechead">
        <span class="stx-recico">${icon(record.kind === 'evidence' ? 'i-shield-check' : 'i-folder')}</span>
        <div class="stx-rechead-copy">
          <span class="gds-eyebrow">${esc(record.evidenceId || L('Kumbukumbu', 'Record'))}${record.sample ? ` · ${L('sampuli', 'sample')}` : ''}</span>
          <h2 class="stx-hero-title">${esc(record.title)}</h2>
          <div class="stx-row-badges">
            ${badge(L(version.sw, version.en), version.tone)}
            ${badge(L(privacy.sw, privacy.en), privacy.tone)}
            ${badge(L(verification.sw, verification.en), verification.tone)}
            ${record.integrity?.hash ? badge('SHA-256', 'ok') : ''}
            ${record.readOnly ? badge(L('Kutoka Afya', 'From Health'), 'info') : ''}
          </div>
        </div>
      </div>
      <div class="stx-recactions">
        ${!record.readOnly ? btn(L('Kagua', 'Review'), { act: 'record.review', key: record.id, tone: 'primary', small: true, iconId: 'i-check' }) : ''}
        ${!record.readOnly ? btn(L('Shiriki', 'Share'), { act: 'nav.share', key: record.id, small: true, iconId: 'i-share' }) : ''}
        ${btn(L('Nakala', 'Copy'), { act: 'record.copy', key: record.id, small: true, iconId: 'i-edit', disabled: record.version !== 'original' || record.readOnly })}
        ${btn(L('Hamisha', 'Export'), { act: 'record.export', key: record.id, small: true, iconId: 'i-download', disabled: record.version !== 'original' })}
        ${!record.readOnly ? btn(L('Hifadhi', 'Archive'), { act: 'record.archive', key: record.id, small: true, iconId: 'i-box' }) : ''}
        ${!record.readOnly ? btn(L('Futa', 'Delete'), { act: 'record.delete', key: record.id, small: true, tone: 'danger-soft', iconId: 'i-trash' }) : ''}
      </div>`,
      { cls: 'is-record', attrs: `data-tone="${esc(itemTone(record))}"` })}

    <div class="stx-recgrid">
      <div class="stx-recgrid-main">
        ${record.blobKey
          ? card(`<div class="stx-preview-media is-inline">${renderMedia(record, record._url || '')}</div>`, { cls: 'is-flush' })
          : ''}

        ${record.description ? card(`<p class="stx-desc">${esc(record.description)}</p>`) : ''}

        ${sect(L('Maelezo ya rekodi', 'Record details'))}
        ${card(`<div class="stx-metatable">
          ${rows.map(([key, value, cls]) => `<div class="stx-metarow">
            <span class="stx-metakey">${esc(key)}</span>
            <span class="stx-metaval${cls === 'mono' ? ' stx-mono' : ''}">${esc(value)}</span>
          </div>`).join('')}
        </div>`)}

        ${integrity}

        ${record.tags?.length ? card(`<div class="stx-tags">${record.tags.map((t) => `<span class="stx-tag">#${esc(t)}</span>`).join('')}</div>`) : ''}
      </div>

      <div class="stx-recgrid-side">
        ${sect(L('Mahusiano', 'Relations'))}
        ${card(`
          ${linkedCases.length
            ? `<div class="stx-list">${linkedCases.map((c) => `<button type="button" class="stx-minirow" data-stx="open.case" data-key="${esc(c.id)}">
                <span><b>${esc(c.code)}</b> · ${esc(c.title)}</span>${icon('i-chevron-right')}</button>`).join('')}</div>`
            : `<p class="stx-count">${L('Haijaunganishwa na kesi.', 'Not linked to a case.')}</p>`}
          <div class="stx-selectrow">
            <select class="gds-select" data-stx-select="record.case" aria-label="${esc(L('Chagua kesi', 'Choose a case'))}">
              <option value="">${L('Unganisha na kesi…', 'Attach to a case…')}</option>
              ${cases.filter((c) => !(record.caseIds || []).includes(c.id)).map((c) => `<option value="${esc(c.id)}">${esc(c.code)} — ${esc(c.title)}</option>`).join('')}
            </select>
            <input type="hidden" name="itemId" value="${esc(record.id)}">
          </div>
          ${related.list.length ? `<div class="stx-list stx-list-gap">${related.list.map((r) => `<button type="button" class="stx-minirow" data-stx="open.item" data-key="${esc(r.id)}">
              <span>${esc(r.title)}</span>${badge(L(VERSIONS.find((v) => v.id === r.version)?.sw || r.version, VERSIONS.find((v) => v.id === r.version)?.en || r.version), VERSIONS.find((v) => v.id === r.version)?.tone || 'muted')}</button>`).join('')}</div>` : ''}
          ${origin ? `<p class="stx-count">${L('Halisi:', 'Original:')} <button type="button" class="stx-link" data-stx="open.item" data-key="${esc(origin.id)}">${esc(origin.title)}</button></p>` : ''}
        `)}

        ${sect(L('Ufikiaji', 'Access'))}
        ${card(`${shares.length
          ? `<div class="stx-list">${shares.map((s) => `<div class="stx-minirow is-static">
              <span>${esc(s.targetName)} · ${esc(labelOf(SHARE_LEVELS, s.level)?.sw || s.level)}</span>
              ${badge(s.status === 'active' ? L('Hai', 'Active') : s.status === 'pending' ? L('Inasubiri', 'Pending') : L('Imeondolewa', 'Revoked'),
                s.status === 'active' ? 'ok' : s.status === 'pending' ? 'warn' : 'muted')}
            </div>`).join('')}</div>`
          : `<p class="stx-count">${L('Hakuna mtu aliyeshirikiwa.', 'Nobody has been granted access.')}</p>`}
          <p class="stx-count">${esc(L(HONESTY_SHORT.sharing.sw, HONESTY_SHORT.sharing.en))}</p>`)}

        ${sect(L('Historia', 'History'))}
        ${card(`
          ${history.length
            ? `<ol class="stx-custody">${history.map((event) => `<li class="stx-custody-item">
                <span class="stx-custody-dot"></span>
                <span class="stx-custody-copy">
                  <b>${esc(custodyLabel(event.action))}</b>
                  <small>${esc(dateTime(event.at))}${event.note ? ` · ${esc(event.note)}` : ''}</small>
                </span>
              </li>`).join('')}</ol>`
            : `<p class="stx-count">${L('Hakuna historia bado.', 'No history yet.')}</p>`}
          ${(record.notes || []).length ? `<div class="stx-notes">${record.notes.map((n) => `<div class="stx-note">
            <span>${esc(n.text)}</span><small>${esc(n.by)} · ${esc(dateTime(n.at))}</small></div>`).join('')}</div>` : ''}
          ${!record.readOnly ? `<form class="stx-noteform" data-stx-form="record.note">
            <input class="gds-input" name="text" aria-label="${esc(L('Kumbuka', 'Note'))}"
              placeholder="${esc(L('Ongeza kumbuka…', 'Add a note…'))}">
            <input type="hidden" name="id" value="${esc(record.id)}">
            <button type="submit" class="stx-iconbtn" aria-label="${esc(L('Hifadhi kumbuka', 'Save note'))}">${icon('i-check')}</button>
          </form>` : ''}
        `)}
      </div>
    </div>
  `;

  return {
    title: record.title,
    subtitle: `${record.evidenceId || L('Rekodi', 'Record')} · ${L(version.sw, version.en)}`,
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L(categoryOf(record.category)?.sw, categoryOf(record.category)?.en), screen: 'storage.category', param: record.category },
      { label: record.title, screen: 'storage.item', param: record.id }
    ],
    body
  };
}

function custodyLabel(action) {
  const map = {
    created: L('Rekodi iliundwa', 'Record created'),
    reviewed: L('Umekagua', 'Reviewed by you'),
    rejected: L('Imekataliwa', 'Rejected'),
    note: L('Kumbuka limeongezwa', 'Note added'),
    linked: L('Imeunganishwa na kesi', 'Linked to a case'),
    unlinked: L('Imcongolewa kwenye kesi', 'Unlinked from a case'),
    shared: L('Ruhusa ya kushiriki', 'Share granted'),
    'share-revoked': L('Ruhusa imeondolewa', 'Share revoked'),
    integrity: L('Alama ya faili imehesabiwa', 'File digest computed'),
    updated: L('Maelezo yamehaririwa', 'Details updated'),
    archived: L('Imehifadhiwa kwenye archives', 'Archived'),
    restored: L('Imerudishwa', 'Restored'),
    deleted: L('Ilifutwa', 'Deleted'),
    unlocked: L('Umefungua rekodi', 'Record unlocked'),
    exported: L('Nakala ilihamishwa', 'Export copy created'),
    'copied-for-edit': L('Nakala ya kuhariri', 'Edit copy created'),
    derived: L('Nakala mpya imetokana na hii', 'A derived copy was created')
  };
  return map[action] || action;
}

/* ---------------------------------------------------------------- add */
export async function add({ params, items }) {
  const kind = params.kind === 'evidence' ? 'evidence' : 'document';
  const categoryId = params.category || (kind === 'evidence' ? 'evidence' : state.filters.category !== 'all' ? state.filters.category : 'personal');
  const cat = categoryOf(categoryId) || CATEGORIES[0];
  const subId = state.filters.subcategory !== 'all' ? state.filters.subcategory : (cat.subs[0]?.id || '');
  const cases = await listCases();
  const pending = state.pending;

  const body = `
    ${card(`
      <div class="stx-addhead">
        ${tile(cat.icon, cat.tone || 'green')}
        <div><b>${esc(L('Rekodi mpya', 'New record'))}</b><span>${esc(L(cat.sw, cat.en))}</span></div>
      </div>
      ${form('form.add', `
        ${field({ label: L('Jina la rekodi', 'Record title'), name: 'title', required: true, placeholder: L('mf. Ripoti ya polisi — Kijichi', 'e.g. Police report — Kijichi') })}
        ${field({ label: L('Maelezo', 'Description'), name: 'description', rows: 3, placeholder: L('Nini kilichotokea, nani aliandika…', 'What happened, who wrote it…') })}
        <div class="stx-formgrid">
          ${select({ label: L('Jamii', 'Category'), name: 'category', value: cat.id,
            attrs: 'data-stx-select="form.category"',
            options: CATEGORIES.map((c) => ({ value: c.id, label: L(c.sw, c.en) })) })}
          ${select({ label: L('Kijamii', 'Subcategory'), name: 'subcategory', value: subId,
            attrs: 'data-sub-for="category"',
            options: subcategoriesOf(cat.id).map((s) => ({ value: s.id, label: L(s.sw, s.en) })) })}
          ${kind === 'evidence' ? select({ label: L('Aina ya ushahidi', 'Evidence type'), name: 'evidenceType', value: params.type || 'photo',
            options: EVIDENCE_TYPES.map((t) => ({ value: t.id, label: L(t.sw, t.en) })) }) : ''}
          ${select({ label: L('Faragha', 'Privacy'), name: 'privacy', value: cat.sensitive ? 'restricted' : 'private',
            options: PRIVACY.map((p) => ({ value: p.id, label: L(p.sw, p.en) })) })}
          ${select({ label: L('Chanzo', 'Source'), name: 'source', value: 'upload',
            options: SOURCES.map((s) => ({ value: s.id, label: L(s.sw, s.en) })) })}
          ${select({ label: L('Kesi husika', 'Related case'), name: 'caseId', value: params.case || 'all',
            options: [{ value: 'all', label: L('Hakuna', 'None') }, ...cases.map((c) => ({ value: c.id, label: `${c.code} — ${c.title}` }))] })}
        </div>
        ${field({ label: L('Lebo (tenganisha kwa koma)', 'Tags (comma separated)'), name: 'tags', placeholder: 'polisi, kijichi' })}
        ${field({ label: L('Tarehe ya tukio', 'Record date'), name: 'createdAt', type: 'date' })}
        <div class="stx-filefield">
          <label class="gds-label" for="stx-file">${L('Faili (hiari)', 'File (optional)')}</label>
          <input class="gds-input" id="stx-file" name="file" type="file" data-stx-change="form.file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv">
          <span class="gds-hint">${L('Faili huhifadhiwa kwenye kifaa hiki pekee; hakuna upload inayotokea.', 'The file stays on this device only; nothing is uploaded.')}</span>
          ${pending ? `<div class="stx-pending">
            <span class="stx-pending-ico">${icon('i-file-medical')}</span>
            <span><b>${esc(pending.name)}</b><small>${esc(bytes(pending.size))} · ${L('imechaguliwa', 'selected')}</small></span>
            <button type="button" class="stx-iconbtn" data-stx="form.file.clear" aria-label="${esc(L('Ondoa', 'Remove'))}">${icon('i-x')}</button>
          </div>` : ''}
        </div>
        <input type="hidden" name="kind" value="${esc(kind)}">
        ${footNote(L('Imeandikwa kwenye kifaa hiki — haithibitishwi, haisimbiwi wingu.',
          'Saved on this device — not certified, not backed up.'))}
      `, { submit: L('Hifadhi rekodi', 'Save record') })}
    `)}
    ${items.length ? '' : ''}
  `;

  return {
    title: L('Rekodi mpya', 'New record'),
    subtitle: L(cat.sw, cat.en),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L('Ongeza', 'Add'), screen: 'storage.add' }
    ],
    body
  };
}

/* ----------------------------------------------------------- new case */
export async function caseNew() {
  const body = card(`
    ${form('form.case', `
      ${field({ label: L('Jina la kesi', 'Case title'), name: 'title', required: true, placeholder: L('mf. Ufuatiliaji wa usiku wa 12 Oktoba', 'e.g. Followed home on the night of 12 October') })}
      ${select({ label: L('Aina', 'Kind'), name: 'kind', value: 'incident',
        options: CASE_KINDS.map((k) => ({ value: k.id, label: L(k.sw, k.en) })) })}
      ${field({ label: L('Muhtasari', 'Summary'), name: 'summary', rows: 4, placeholder: L('Maelezo mafupi ya tukio…', 'A short account of what happened…') })}
      ${field({ label: L('Namba ya kesi (hiari)', 'Case code (optional)'), name: 'code', placeholder: 'CASE-2026-003' })}
      ${footNote(L('Kumbukumbu ya kifaa hiki — hakuna taarifa inayotumwa.',
        'A record on this device — nothing is sent.'))}
    `, { submit: L('Unda kesi', 'Create case') })}
  `);
  return {
    title: L('Kesi mpya', 'New case'),
    subtitle: L('Kumbukumbu ya kifaa', 'On-device record'),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L('Kesi', 'Cases'), screen: 'storage.cases' },
      { label: L('Mpya', 'New'), screen: 'storage.case.new' }
    ],
    body
  };
}

/* --------------------------------------------------------------- share */
export async function share({ params }) {
  const record = await getItem(params.id);
  if (!record) {
    return {
      title: L('Shiriki', 'Share'), subtitle: '',
      crumbs: [{ label: L('Hifadhi', 'Storage'), screen: 'storage.home' }],
      body: stateBox({ iconId: 'i-alert-circle', title: L('Rekodi haipo', 'Record not found') })
    };
  }
  const body = card(`
    ${form('form.share', `
      <input type="hidden" name="itemId" value="${esc(record.id)}">
      ${field({ label: L('Rekodi', 'Record'), name: 'recordLabel', value: record.title, hint: L('Haiwezi kubadilishwa hapa.', 'Not editable here.') })}
      ${field({ label: L('Mtu au kikundi (kitambulisho)', 'Person or group (ID)'), name: 'targetId', required: true, placeholder: 'gh-… au jina la mlezi' })}
      ${field({ label: L('Jina la kuonyesha', 'Display name'), name: 'targetName', placeholder: L('mf. Neema Mushi (mlezi)', 'e.g. Neema Mushi (guardian)') })}
      ${select({ label: L('Kiwango cha ufikiaji', 'Access level'), name: 'level', value: 'view',
        options: SHARE_LEVELS.map((l) => ({ value: l.id, label: L(l.sw, l.en) })) })}
      ${footNote(L('Imeandikwa hapa — hakuna anayepokea ufikiaji bado.',
        'Recorded here — nobody receives access yet.'))}
    `, { submit: L('Rekodi ruhusa', 'Record the grant') })}
  `);
  return {
    title: L('Shiriki rekodi', 'Share a record'),
    subtitle: record.title,
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: record.title, screen: 'storage.item', param: record.id },
      { label: L('Shiriki', 'Share'), screen: 'storage.share', param: record.id }
    ],
    body
  };
}

/* --------------------------------------------------------------- usage */
export async function usage() {
  const summary = await stats();

  /* The figures the old Storage sheet showed are kept here, row for row: the
     device total, the browser quota, posts, drafts, IndexedDB blobs and the
     GuardHai localStorage keys, largest first. Same measurements, one home. */
  const localKeys = [];
  let localBytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key.indexOf('guardhai') !== 0) continue;
      const size = (localStorage.getItem(key) || '').length * 2;
      localKeys.push({ key, bytes: size });
      localBytes += size;
    }
  } catch { /* private mode: nothing readable */ }
  localKeys.sort((a, b) => b.bytes - a.bytes);
  const blobs = await storageUsage().catch(() => 0);
  const [posts, drafts] = await Promise.all([countPosts(), countDrafts()]);
  const measured = {
    total: summary.usage || localBytes + blobs,
    quota: summary.quota || 0,
    posts,
    drafts,
    blobs,
    localBytes
  };

  const pct = summary.quota ? Math.min(100, (summary.usage / summary.quota) * 100) : 0;
  const fallbackNote = L('Vipimo halisi vya kifaa hiki.', 'Measured on this device.');
  const body = `
    ${card(`
      <div class="stx-usagehead">
        ${stat(bytes(summary.usage || summary.bytes), L('Inatumika', 'Used'), summary.quota ? L(`kati ya ${bytes(summary.quota)}`, `of ${bytes(summary.quota)}`) : '')}
        ${stat(bytes(summary.bytes), L('Rekodi', 'Records'), L(`${summary.live} rekodi`, `${summary.live} records`))}
        ${stat(String(summary.withFiles), L('Faili halisi', 'Real files'), L(`${summary.withIntegrity} zenye alama`, `${summary.withIntegrity} digested`))}
      </div>
      ${summary.quota ? meter(pct) : ''}
      <p class="stx-count">${esc(fallbackNote)}</p>
    `, { cls: 'is-hero' })}
    ${sect(L('Kwa jamii', 'By category'))}
    ${card(`<div class="stx-catcounts">
      ${CATEGORIES.filter((c) => (summary.byCategory[c.id] || 0) > 0).map((c) => `<div class="stx-catcount">
        ${icon(c.icon)}
        <span>${esc(L(c.sw, c.en))}</span>
        <b>${summary.byCategory[c.id]}</b>
      </div>`).join('') || `<p class="stx-count">${L('Hakuna rekodi bado.', 'No records yet.')}</p>`}
    </div>`)}
    ${sect(L('Kipimo cha kifaa', 'Device breakdown'))}
    ${card(`<div class="stx-metatable">
      ${[
        [L('Jumla (kifaa hiki)', 'Total (this device)'), bytes(measured.total)],
        [measured.quota ? L('Kikomo cha browser', 'Browser quota') : '', measured.quota ? bytes(measured.quota) : ''],
        [L('Chapisho zilizohifadhiwa', 'Saved posts'), String(measured.posts)],
        [L('Rasimu', 'Drafts'), String(measured.drafts)],
        [L('Viambatisho (IndexedDB)', 'Attachments (IndexedDB)'), bytes(measured.blobs)],
        [L('Data ya shield (localStorage)', 'Shield data (localStorage)'), bytes(measured.localBytes)],
        ...localKeys.slice(0, 6).map((k) => [k.key, bytes(k.bytes)])
      ].filter(([key]) => key).map(([key, value]) => `<div class="stx-metarow">
        <span class="stx-metakey">${esc(key)}</span>
        <span class="stx-metaval">${esc(value)}</span>
      </div>`).join('')}
    </div>`)}
    ${footNote(L(HONESTY_SHORT.storage.sw, HONESTY_SHORT.storage.en))}
  `;
  return {
    title: L('Nafasi ya kifaa', 'Device space'),
    subtitle: L('Kipimo halisi', 'Measured on this device'),
    crumbs: [
      { label: L('Hifadhi', 'Storage'), screen: 'storage.home' },
      { label: L('Nafasi', 'Space'), screen: 'storage.usage' }
    ],
    body
  };
}

export const _unused = { chip, previewPanel, itemsForCase, LIMITS };
