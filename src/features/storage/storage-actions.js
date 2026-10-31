/**
 * GuardHai · features/storage/storage-actions.js
 * One dispatcher for every gesture in the Storage Center. Screens emit
 * `data-stx` names; only this file talks to the service layer, so a workflow can
 * never drift between two screens.
 *
 * Returns: `{ screen, params }` to navigate, `{ toast }` for a transient
 * message, or `{}` to repaint where we are.
 */
import { toast } from '../../ui/toast.js';
import { L } from './storage-ui.js';
import { emptyFilters } from '../../domain/storage.js';
import { state, persistView, unlock, lockAll } from './storage-state.js';
import {
  getItem, addItem, attachFile, markReviewed, markUnlocked, addNote, createDerivedCopy, computeIntegrity,
  deleteItem, archiveItem, createCase, linkToCase, grantShare, seedSamples,
  clearSamples, resetAll
} from '../../services/storage.service.js';

const ok = (message) => (message ? { toast: message } : {});
const bad = (message) => ({ toast: message, kind: 'danger' });

/* a `data-param` value may be a plain id or a JSON object */
const parseParam = (value) => {
  if (!value) return {};
  try { return JSON.parse(value); } catch { return { id: value, category: value, type: value, caseId: value }; }
};

export const ACTIONS = {
  /* ------------------------------------------------------------- routing */
  go: (p) => ({ screen: p.key || 'storage.home', params: parseParam(p.param) }),
  back: () => ({ back: true }),
  'nav.home': () => ({ screen: 'storage.home', params: {} }),
  'nav.all': () => ({ screen: 'storage.all', params: {} }),
  'nav.search': () => ({ screen: 'storage.search', params: {} }),
  'nav.filters': () => ({ screen: 'storage.filters', params: {} }),
  'nav.evidence': () => ({ screen: 'storage.evidence', params: {} }),
  'nav.cases': () => ({ screen: 'storage.cases', params: {} }),
  'nav.case.new': () => ({ screen: 'storage.case.new', params: {} }),
  'nav.usage': () => ({ screen: 'storage.usage', params: {} }),
  'nav.add': (p) => ({ screen: 'storage.add', params: { kind: p.kind || 'document', type: p.type || '', case: p.case || '' } }),
  'nav.share': (p) => ({ screen: 'storage.share', params: { id: p.key } }),
  'go.health': () => {
    window.HomeUI?.go?.('health');
    return {};
  },

  'open.item': (p) => ({ screen: 'storage.item', params: { id: p.key } }),
  'open.case': (p) => ({ screen: 'storage.case', params: { caseId: p.key } }),

  /* ------------------------------------------------------------- filters */
  'filter.sub': (p) => {
    state.filters.subcategory = p.key;
    return { screen: state.screen, params: state.params };
  },
  'filter.clear': (p) => {
    if (p.key === 'q') state.filters.q = '';
    else state.filters[p.key] = p.key === 'range' ? 'any' : 'all';
    if (p.key === 'category') state.filters.subcategory = 'all';
    return { screen: state.screen, params: state.params };
  },
  'filter.reset': () => {
    state.filters = { ...emptyFilters(), view: state.filters.view };
    return { screen: state.screen, params: state.params };
  },
  'filter.set': (p) => {
    const name = p.el?.name;
    if (!name) return {};
    state.filters[name] = p.value;
    if (name === 'category') state.filters.subcategory = 'all';
    return { screen: state.screen, params: state.params };
  },
  'filter.apply': () => ({ screen: 'storage.all', params: {} }),

  'view.set': (p) => {
    state.filters.view = p.key === 'grid' ? 'grid' : 'list';
    persistView();
    return { screen: state.screen, params: state.params };
  },

  'filters.search': (p) => {
    state.filters.q = String(p.data?.q || '').trim();
    return { screen: 'storage.search', params: {} };
  },
  'filters.search.clear': () => {
    state.filters.q = '';
    return { screen: state.screen, params: state.params };
  },

  /* ------------------------------------------------------------ records */
  'record.unlock': async (p) => {
    unlock(p.key);
    await markUnlocked(p.key);
    return ok(L('Rekodi imefunguliwa kwa kipindi hiki cha matumizi — hatua imeandikwa kwenye historia.',
      'The record is unlocked for this session — the step is written to its history.'));
  },
  'record.review': async (p) => {
    const item = await getItem(p.key);
    const next = item?.verification === 'reviewed' ? 'unreviewed' : 'reviewed';
    const res = await markReviewed(p.key, next);
    return res.ok
      ? ok(next === 'reviewed'
        ? L('Umekagua rekodi hii. Hii ni hatua yako — si uthibitisho wa nje.', 'You reviewed this record. This is your own step — not external verification.')
        : L('Uhakiki umeondolewa.', 'Review removed.'))
      : bad(res.message);
  },
  'record.copy': async (p) => {
    const res = await createDerivedCopy(p.key, 'edited');
    if (!res.ok) return bad(res.message);
    return {
      screen: 'storage.item',
      params: { id: res.item.id },
      toast: L('Nakala ya kuhariri imeundwa; halisi haijabadilishwa.', 'An edit copy was created; the original is untouched.')
    };
  },
  'record.export': async (p) => {
    const res = await createDerivedCopy(p.key, 'exported');
    if (!res.ok) return bad(res.message);
    return {
      screen: 'storage.item',
      params: { id: res.item.id },
      toast: L('Nakala iliyotolewa imeundwa kwenye kifaa hiki.', 'An export copy was created on this device.')
    };
  },
  'record.integrity': async (p) => {
    const res = await computeIntegrity(p.key);
    return res.ok
      ? ok(L('Alama ya SHA-256 imehesabiwa kwenye kifaa hiki.', 'An SHA-256 digest was computed on this device.'))
      : bad(res.message);
  },
  'record.archive': async (p) => {
    const res = await archiveItem(p.key, true);
    return res.ok
      ? { screen: 'storage.home', toast: L('Rekodi imehifadhiwa kwenye archives.', 'The record was archived.') }
      : bad(res.message);
  },
  'record.delete': async (p) => {
    const res = await deleteItem(p.key);
    return res.ok
      ? { screen: 'storage.home', toast: L('Rekodi imefutwa; historia yake ya matumizi imehifadhiwa.', 'The record was deleted; its custody history is kept.') }
      : bad(res.message);
  },
  'record.note': async (p) => {
    const res = await addNote(p.data.id, p.data.text);
    return res.ok ? ok(L('Kumbuka limehifadhiwa.', 'Note saved.')) : bad(res.message);
  },

  /* -------------------------------------------------------------- cases */
  'record.case': async (p) => {
    const caseId = p.value;
    if (!caseId) return {};
    const res = await linkToCase(p.data.itemId, caseId);
    return res.ok ? ok(L('Rekodi imeunganishwa na kesi.', 'The record is attached to the case.')) : bad(res.message);
  },

  /* -------------------------------------------------------------- forms */
  'form.file': async (p) => {
    const file = p.el?.files?.[0] || null;
    if (!file) {
      state.pending = null;
      return { screen: state.screen, params: state.params };
    }
    const type = String(file.type || '');
    const kind = type.startsWith('image/') ? 'image'
      : type.startsWith('video/') ? 'video'
      : type.startsWith('audio/') ? 'audio'
      : file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'document';
    const res = await attachFile(file, kind);
    if (!res.ok) return bad(res.message);
    state.pending = res.attachment;
    return {
      screen: state.screen,
      params: state.params,
      toast: L(`Faili imehifadhiwa kwenye kifaa hiki (${res.attachment.name}).`,
        `The file is saved on this device (${res.attachment.name}).`)
    };
  },
  'form.file.clear': () => {
    state.pending = null;
    return { screen: state.screen, params: state.params };
  },

  'form.add': async (p) => {
    const d = p.data || {};
    const res = await addItem({
      title: d.title,
      description: d.description,
      category: d.category,
      subcategory: d.subcategory,
      evidenceType: d.evidenceType || (d.category === 'evidence' ? 'other' : undefined),
      privacy: d.privacy,
      source: d.source,
      tags: String(d.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: d.createdAt ? `${d.createdAt}T12:00:00.000Z` : undefined,
      sizeBytes: state.pending?.size || 0,
      mime: state.pending?.type || '',
      blobKey: state.pending?.blobKey || null,
      kind: d.kind,
      caseIds: d.caseId && d.caseId !== 'all' ? [d.caseId] : []
    });
    if (!res.ok) {
      return bad(res.errors?.title
        ? L('Jina la rekodi linahitajika (angalau herufi 3).', 'A record title is required (at least 3 characters).')
        : L('Angalia sehemu zilizokosekana.', 'Check the missing fields.'));
    }
    state.pending = null;
    return {
      screen: 'storage.item',
      params: { id: res.item.id },
      toast: L('Rekodi imehifadhiwa kwenye kifaa hiki.', 'The record was saved on this device.')
    };
  },

  'form.case': async (p) => {
    const res = await createCase(p.data || {});
    if (!res.ok) {
      return bad(L('Jina la kesi linahitajika (angalau herufi 3).', 'A case title is required (at least 3 characters).'));
    }
    return { screen: 'storage.case', params: { caseId: res.case.id }, toast: L('Kesi imeundwa.', 'The case was created.') };
  },

  'form.share': async (p) => {
    const res = await grantShare(p.data.itemId, {
      targetId: p.data.targetId,
      targetName: p.data.targetName,
      level: p.data.level
    });
    if (!res.ok) return bad(L('Chagua mtu na kiwango cha ufikiaji.', 'Choose a person and an access level.'));
    return {
      screen: 'storage.item',
      params: { id: p.data.itemId },
      toast: L('Ruhusa imeandikwa kwenye kifaa hiki — hakuna anayepokea bado.',
        'The grant is recorded on this device — nobody receives it yet.')
    };
  },

  /* ------------------------------------------------------------- samples */
  'samples.seed': async () => {
    const res = await seedSamples();
    return ok(res.skipped
      ? L('Sampuli zipo tayari.', 'Samples are already loaded.')
      : L('Sampuli zimewekwa. Kila moja ina lebo “Sampuli”.', 'Samples loaded. Each one is labelled “Sample”.'));
  },
  'samples.clear': async () => {
    await clearSamples();
    lockAll();
    return ok(L('Sampuli zimeondolewa; rekodi zako zimebaki.', 'Samples removed; your own records stayed.'));
  },
  'storage.reset': async () => {
    await resetAll();
    lockAll();
    return ok(L('Hifadhi yote ya kifaa hiki imefutwa.', 'All storage on this device was cleared.'));
  }
};

export async function dispatch(act, payload = {}) {
  const handler = ACTIONS[act];
  if (!handler) {
    console.warn('[storage] unknown action', act);
    return { toast: L(`Kitendo “${act}” hakijulikani.`, `Unknown action “${act}”.`), kind: 'danger' };
  }
  try {
    return (await handler(payload)) || {};
  } catch (err) {
    console.error('[storage] action failed', act, err);
    return { toast: L('Kitendo hakikifanikiwa. Jaribu tena.', 'That action did not work. Try again.'), kind: 'danger' };
  }
}

export const ACTION_NAMES = Object.keys(ACTIONS);
export const notify = (message) => { if (message) toast(message); };
