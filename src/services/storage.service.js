/**
 * GuardHai · services/storage.service.js
 * The Storage Center's only door to data. Everything is local: records, custody
 * events, cases and share grants live in IndexedDB, files live in the media
 * store, and nothing is transmitted anywhere.
 *
 * Honesty rules enforced here, not only in the UI:
 *   • an edit or an export NEVER overwrites the original — it creates a copy
 *     with `originId` pointing back, so the original file stays untouched;
 *   • an integrity digest is only written when a real blob was hashed with
 *     WebCrypto on this device; otherwise `integrity` stays null;
 *   • "reviewed" is a local review step by the account holder, never an
 *     external verification;
 *   • deleting removes the row on this device and writes a custody event first.
 */
import { storageRepo } from '../data/storage.repo.js';
import { buildSamples } from '../data/storage.seed.js';
import { createMediaRepository } from '../data/media.repo.js';
import { uid } from '../core/id.js';
import { blobUrlFor } from './storage-files.js';
import { currentUser } from './session.service.js';
import {
  categoryOf, subOf, fileTypeOf, EVIDENCE_TYPES, PRIVACY, DATE_RANGES, SIZE_BANDS,
  validateItem, validateCase, validateShare, LIMITS, CATEGORIES
} from '../domain/storage.js';

const nowIso = () => new Date().toISOString();
const meId = () => currentUser()?.id || 'me';
const meName = () => currentUser()?.name || 'Wewe';

/* ------------------------------------------------------------- listeners */
const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(kind = 'changed') {
  for (const fn of [...listeners]) {
    try { fn(kind); } catch (err) { console.warn('[storage] listener failed', err); }
  }
}

/* ----------------------------------------------------------------- utils */
/* The account holder owns every record on this device, so lists show the
   restricted ones too; the *detail* screen is what asks for a deliberate
   unlock (and writes it to the custody trail). Nothing here is cryptography. */
export const canSee = (item) => !!item;

export const isSample = (item) => !!item?.sample;

function decorate(item) {
  if (!item) return null;
  return {
    ...item,
    fileType: fileTypeOf(item),
    subLabel: subOf(item.category, item.subcategory),
    categoryLabel: categoryOf(item.category)
  };
}

const sortNewest = (a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || ''));

/* ------------------------------------------------------------ reads */
export async function allItems() {
  const repo = await storageRepo();
  return (await repo.allItems()).map(decorate).sort(sortNewest);
}

export async function getItem(id) {
  const repo = await storageRepo();
  const item = decorate(await repo.getItem(id));
  if (item?.blobKey) {
    const url = await blobUrlFor(item.blobKey);
    if (url) item._url = url;
  }
  return item;
}


export async function custodyOf(itemId) {
  const repo = await storageRepo();
  return (await repo.custodyOf(itemId)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export async function listCases() {
  const repo = await storageRepo();
  return (await repo.allCases()).sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt)));
}

export async function getCase(id) {
  const repo = await storageRepo();
  return repo.getCase(id);
}

export async function itemsForCase(caseId) {
  const items = await allItems();
  return items.filter((i) => (i.caseIds || []).includes(caseId));
}

/**
 * Files tied to a record: the original a copy came from, the copies made from
 * it, and anything else attached to the same case.
 */
export async function itemsForRecord(record) {
  const items = await allItems();
  const caseIds = new Set(record.caseIds || []);
  const origin = record.originId ? items.find((i) => i.id === record.originId) || null : null;
  const list = items.filter((i) => i.id !== record.id && (
    i.originId === record.id ||
    (record.originId && i.id === record.originId) ||
    (i.caseIds || []).some((id) => caseIds.has(id))
  ));
  return { origin, list: list.slice(0, 8) };
}

export async function listShares() {
  const repo = await storageRepo();
  return (await repo.allShares()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/* ----------------------------------------------------------- filtering */
function matchesQuery(item, term) {
  if (!term) return true;
  const hay = [
    item.title, item.description, item.evidenceId, item.sourceLabel,
    (item.tags || []).join(' '), item.caseCode, item.ownerName, item.uploadedByName,
    item.subLabel ? `${item.subLabel.sw} ${item.subLabel.en}` : '',
    item.categoryLabel ? `${item.categoryLabel.sw} ${item.categoryLabel.en}` : ''
  ].join(' ').toLowerCase();
  return hay.includes(term);
}

function withinRange(item, rangeId) {
  const range = DATE_RANGES.find((r) => r.id === rangeId);
  if (!range || !range.days) return true;
  const stamp = new Date(item.createdAt || item.uploadedAt || 0).getTime();
  if (Number.isNaN(stamp)) return false;
  return Date.now() - stamp <= range.days * 86400000;
}

function withinSize(item, bandId) {
  const band = SIZE_BANDS.find((b) => b.id === bandId);
  if (!band || bandId === 'all') return true;
  return band.test(Number(item.sizeBytes || 0));
}

/**
 * The one filter pipeline used by every list in the feature, so a filter can
 * never mean two different things on two screens.
 */
export function applyFilters(items, filters = {}) {
  const term = String(filters.q || '').trim().toLowerCase();
  return items.filter((item) => {
    if (!canSee(item)) return false;
    if (filters.category && filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.subcategory && filters.subcategory !== 'all' && item.subcategory !== filters.subcategory) return false;
    if (filters.evidenceType && filters.evidenceType !== 'all' && item.evidenceType !== filters.evidenceType) return false;
    if (filters.fileType && filters.fileType !== 'all' && fileTypeOf(item) !== filters.fileType) return false;
    if (filters.source && filters.source !== 'all' && item.source !== filters.source) return false;
    if (filters.owner && filters.owner !== 'all' && item.ownerId !== filters.owner) return false;
    if (filters.privacy && filters.privacy !== 'all' && item.privacy !== filters.privacy) return false;
    if (filters.verification && filters.verification !== 'all' && item.verification !== filters.verification) return false;
    if (filters.case && filters.case !== 'all' && !(item.caseIds || []).includes(filters.case)) return false;
    if (filters.event && filters.event !== 'all' && item.eventRef !== filters.event) return false;
    if (filters.location === 'yes' && !item.location) return false;
    if (filters.location === 'no' && item.location) return false;
    if (filters.location === 'authorized' && !item.location?.authorized) return false;
    if (!withinRange(item, filters.range)) return false;
    if (!withinSize(item, filters.size)) return false;
    if (item.archived && filters.includeArchived !== true) return false;
    return matchesQuery(item, term);
  });
}

export async function search(term, filters = {}) {
  const items = await allItems();
  return applyFilters(items, { ...filters, q: term });
}

/* --------------------------------------------------------------- writes */
async function pushCustody(itemId, action, note = '', extra = {}) {
  const repo = await storageRepo();
  const row = {
    id: uid('cust'),
    itemId,
    at: nowIso(),
    action,
    actorId: meId(),
    actorName: meName(),
    note: String(note || '').slice(0, LIMITS.noteMax),
    ...extra
  };
  await repo.putCustody(row);
  return row;
}

export async function addItem(draft = {}) {
  const check = validateItem(draft);
  if (!check.ok) return { ok: false, errors: check.errors };
  const repo = await storageRepo();
  const at = nowIso();
  const isEvidence = draft.category === 'evidence';
  const seq = (await repo.allItems()).filter((i) => i.kind === 'evidence').length + 1;
  const item = {
    id: uid('st'),
    kind: isEvidence ? 'evidence' : 'document',
    category: draft.category,
    subcategory: draft.subcategory,
    evidenceType: isEvidence ? draft.evidenceType : null,
    evidenceId: isEvidence ? draft.evidenceId || `EVD-${String(seq).padStart(4, '0')}` : null,
    title: check.title,
    description: String(draft.description || '').slice(0, LIMITS.descriptionMax),
    fileType: draft.fileType || fileTypeOf({ mime: draft.mime }),
    mime: draft.mime || '',
    sizeBytes: Number(draft.sizeBytes || 0),
    version: 'original',
    originId: null,
    source: draft.source || 'upload',
    sourceLabel: draft.sourceLabel || '',
    ownerId: meId(),
    ownerName: meName(),
    uploadedById: meId(),
    uploadedByName: meName(),
    createdAt: draft.createdAt || at,
    uploadedAt: at,
    location: draft.location || null,
    privacy: draft.privacy || (categoryOf(draft.category)?.sensitive ? 'restricted' : 'private'),
    verification: 'unreviewed',
    integrity: null,
    tags: draft.tags || [],
    caseIds: draft.caseIds || [],
    eventRef: draft.eventRef || null,
    relatedIds: [],
    healthRef: null,
    blobKey: draft.blobKey || null,
    notes: [],
    archived: false,
    readOnly: false,
    sample: !!draft.sample
  };
  await repo.putItem(item);
  await pushCustody(item.id, 'created', draft.note || '');
  emit('added');
  return { ok: true, item: decorate(item) };
}

export async function updateItem(id, patch = {}) {
  const repo = await storageRepo();
  const item = await repo.getItem(id);
  if (!item) return { ok: false, message: 'Rekodi haipo.' };
  if (item.readOnly) return { ok: false, message: 'Rekodi hii inamilikiwa na moduli ya Afya; hariri pale.' };
  const allowed = ['title', 'description', 'privacy', 'tags', 'caseIds', 'eventRef', 'location', 'archived'];
  const clean = {};
  for (const key of allowed) if (key in patch) clean[key] = patch[key];
  const next = { ...item, ...clean };
  await repo.putItem(next);
  await pushCustody(id, 'updated', Object.keys(clean).join(', '));
  emit('updated');
  return { ok: true, item: decorate(next) };
}

export async function archiveItem(id, archived = true) {
  const result = await updateItem(id, { archived });
  if (!result.ok) return result;
  await pushCustody(id, archived ? 'archived' : 'restored', '');
  emit('archived');
  return { ok: true };
}

export async function deleteItem(id) {
  const repo = await storageRepo();
  const item = await repo.getItem(id);
  if (!item) return { ok: false, message: 'Rekodi haipo.' };
  if (item.readOnly) return { ok: false, message: 'Rekodi hii inamilikiwa na moduli ya Afya.' };
  if (item.sample === false && item.ownerId !== meId()) {
    return { ok: false, message: 'Huna ruhusa ya kufuta rekodi hii.' };
  }
  // the row goes; the custody trail stays (an audit log that deletes itself is
  // not an audit log). It is scoped to the item id and never shown as "live".
  await pushCustody(id, 'deleted', '');
  await repo.removeItem(id);
  if (item.blobKey) {
    try { await (await createMediaRepository()).remove(item.blobKey); } catch { /* already gone */ }
  }
  emit('deleted');
  return { ok: true, custodyKept: true };
}

/** a review is a local step: it never claims an external authority */
export async function markReviewed(id, verdict = 'reviewed', note = '') {
  const repo = await storageRepo();
  const item = await repo.getItem(id);
  if (!item) return { ok: false, message: 'Rekodi haipo.' };
  const next = { ...item, verification: verdict, reviewedAt: nowIso(), reviewedBy: meName() };
  await repo.putItem(next);
  await pushCustody(id, verdict === 'rejected' ? 'rejected' : 'reviewed', note);
  emit('reviewed');
  return { ok: true, item: decorate(next) };
}

/**
 * Opening a restricted record is a deliberate step, so it is written down: the
 * record's own history shows when it was unlocked and by whom. The unlock
 * itself stays session-only in the view — nothing about it is permanent access.
 */
export async function markUnlocked(id) {
  const repo = await storageRepo();
  const item = await repo.getItem(id);
  if (!item) return { ok: false, message: 'Rekodi haipo.' };
  await pushCustody(id, 'unlocked', item.privacy === 'restricted' ? 'imezuiwa' : '');
  emit('unlocked');
  return { ok: true };
}

export async function addNote(id, text) {
  const value = String(text || '').trim();
  if (!value) return { ok: false, message: 'Andika kumbuka kwanza.' };
  const repo = await storageRepo();
  const item = await repo.getItem(id);
  if (!item) return { ok: false, message: 'Rekodi haipo.' };
  const notes = [...(item.notes || []), { id: uid('note'), at: nowIso(), by: meName(), text: value.slice(0, LIMITS.noteMax) }];
  await repo.putItem({ ...item, notes });
  await pushCustody(id, 'note', value);
  emit('noted');
  return { ok: true };
}

/**
 * Editing or exporting opens a NEW record that points at the original. The
 * original row (and its file) is not touched — that is the app's originals
 * policy, and it is the reason a derived copy is always labelled.
 */
export async function createDerivedCopy(id, version = 'edited') {
  const repo = await storageRepo();
  const origin = await repo.getItem(id);
  if (!origin) return { ok: false, message: 'Rekodi haipo.' };
  if (origin.version !== 'original') return { ok: false, message: 'Nakala hii tayari imetokana na rekodi nyingine.' };
  const copy = {
    ...origin,
    id: uid('st'),
    version,
    originId: origin.id,
    title: `${origin.title} (${version === 'edited' ? 'iliyohaririwa' : 'nakala'})`,
    createdAt: nowIso(),
    uploadedAt: nowIso(),
    verification: 'unreviewed',
    integrity: null,
    blobKey: null,
    sample: false,
    notes: []
  };
  await repo.putItem(copy);
  await pushCustody(copy.id, version === 'edited' ? 'copied-for-edit' : 'exported', `kutoka ${origin.id}`, { originId: origin.id });
  await pushCustody(origin.id, 'derived', `${version} → ${copy.id}`, { targetId: copy.id });
  emit('copied');
  return { ok: true, item: decorate(copy) };
}

/** SHA-256 on this device, only when the bytes are actually here */
export async function computeIntegrity(id) {
  const repo = await storageRepo();
  const item = await repo.getItem(id);
  if (!item) return { ok: false, message: 'Rekodi haipo.' };
  if (!item.blobKey) return { ok: false, message: 'Hakuna faili halisi kwenye kifaa hiki cha kuhesabu alama.' };
  let blob = null;
  try { blob = (await (await createMediaRepository()).get(item.blobKey))?.blob || null; } catch { blob = null; }
  if (!blob) return { ok: false, message: 'Faili haipo kwenye kifaa hiki tena.' };
  if (!globalThis.crypto?.subtle) return { ok: false, message: 'Browser hii haina WebCrypto; alama haikuhesabiwa.' };
  try {
    const buffer = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const integrity = { algorithm: 'SHA-256', hash, size: blob.size, computedAt: nowIso(), scope: 'file' };
    await repo.putItem({ ...item, integrity });
    await pushCustody(id, 'integrity', `SHA-256 ${hash.slice(0, 16)}…`);
    emit('integrity');
    return { ok: true, integrity };
  } catch (err) {
    return { ok: false, message: String(err?.message || err) };
  }
}

/* ---------------------------------------------------------------- cases */
export async function createCase(draft = {}) {
  const check = validateCase(draft);
  if (!check.ok) return { ok: false, errors: check.errors };
  const repo = await storageRepo();
  const at = nowIso();
  const seq = (await repo.allCases()).length + 1;
  const row = {
    id: uid('case'),
    code: draft.code || `CASE-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`,
    title: check.title,
    kind: draft.kind,
    summary: String(draft.summary || '').slice(0, LIMITS.caseSummaryMax),
    status: 'open',
    openedAt: at,
    openedBy: meName(),
    ownerId: meId(),
    incidentRef: draft.incidentRef || null,
    sample: !!draft.sample
  };
  await repo.putCase(row);
  emit('case-created');
  return { ok: true, case: row };
}

export async function linkToCase(itemId, caseId) {
  const repo = await storageRepo();
  const [item, row] = await Promise.all([repo.getItem(itemId), repo.getCase(caseId)]);
  if (!item || !row) return { ok: false, message: 'Rekodi au kesi haipo.' };
  const caseIds = [...new Set([...(item.caseIds || []), caseId])];
  await repo.putItem({ ...item, caseIds, caseCode: row.code });
  await pushCustody(itemId, 'linked', `kesi ${row.code}`, { caseId });
  emit('linked');
  return { ok: true };
}

export async function unlinkFromCase(itemId, caseId) {
  const repo = await storageRepo();
  const item = await repo.getItem(itemId);
  if (!item) return { ok: false, message: 'Rekodi haipo.' };
  const caseIds = (item.caseIds || []).filter((id) => id !== caseId);
  await repo.putItem({ ...item, caseIds });
  await pushCustody(itemId, 'unlinked', `kesi ${caseId}`, { caseId });
  emit('unlinked');
  return { ok: true };
}

export async function caseSummary(caseId) {
  const row = await getCase(caseId);
  if (!row) return null;
  const items = await itemsForCase(caseId);
  const byType = {};
  for (const item of items) {
    const key = item.kind === 'evidence' ? item.evidenceType : item.category;
    byType[key] = (byType[key] || 0) + 1;
  }
  const custodyCount = (await Promise.all(items.map((i) => custodyOf(i.id)))).reduce((n, list) => n + list.length, 0);
  return { ...row, items, byType, custodyCount };
}

/* --------------------------------------------------------------- shares */
export async function grantShare(itemId, draft = {}) {
  const check = validateShare(draft);
  if (!check.ok) return { ok: false, errors: check.errors };
  const repo = await storageRepo();
  const row = {
    id: uid('shr'),
    itemId,
    targetId: String(draft.targetId).trim(),
    targetName: String(draft.targetName || draft.targetId).trim(),
    level: draft.level,
    status: 'pending',
    createdAt: nowIso(),
    createdBy: meName(),
    note: String(draft.note || '').slice(0, LIMITS.noteMax),
    sample: !!draft.sample
  };
  await repo.putShare(row);
  await pushCustody(itemId, 'shared', `${row.targetName} · ${row.level}`, { shareId: row.id });
  emit('shared');
  return { ok: true, share: row };
}

export async function revokeShare(shareId) {
  const repo = await storageRepo();
  const rows = await repo.allShares();
  const row = rows.find((s) => s.id === shareId);
  if (!row) return { ok: false, message: 'Ruhusa haipo.' };
  await repo.putShare({ ...row, status: 'revoked', revokedAt: nowIso() });
  await pushCustody(row.itemId, 'share-revoked', row.targetName, { shareId });
  emit('share-revoked');
  return { ok: true };
}

/* ------------------------------------------------------ health pointers */
/**
 * Health records stay in the Health module. Storage keeps a read-only pointer
 * (id, title, date, category) so the file can be reached from here without a
 * second copy of the medical data. Re-running this reconciles both ways.
 */

/* ----------------------------------------------------------------- stats */
export async function stats() {
  const items = await allItems();
  const cases = await listCases();
  const shares = await listShares();
  const live = items.filter((i) => !i.archived);
  const evidence = live.filter((i) => i.kind === 'evidence');
  const bytes = live.reduce((n, i) => n + Number(i.sizeBytes || 0), 0);
  const byCategory = {};
  for (const category of CATEGORIES) {
    byCategory[category.id] = live.filter((i) => i.category === category.id).length;
  }
  const byEvidenceType = {};
  for (const type of EVIDENCE_TYPES) {
    byEvidenceType[type.id] = evidence.filter((i) => i.evidenceType === type.id).length;
  }
  let quota = 0;
  let usage = 0;
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (estimate) { quota = estimate.quota || 0; usage = estimate.usage || 0; }
  } catch { /* the browser declined to answer */ }
  return {
    total: items.length,
    live: live.length,
    archived: items.length - live.length,
    evidence: evidence.length,
    documents: live.length - evidence.length,
    cases: cases.length,
    openCases: cases.filter((c) => c.status !== 'closed').length,
    shares: shares.filter((s) => s.status === 'active').length,
    pendingShares: shares.filter((s) => s.status === 'pending').length,
    unreviewed: live.filter((i) => i.verification === 'unreviewed').length,
    reviewed: live.filter((i) => i.verification === 'reviewed').length,
    withIntegrity: live.filter((i) => i.integrity?.hash).length,
    withFiles: live.filter((i) => i.blobKey).length,
    samples: items.filter((i) => i.sample).length,
    bytes,
    usage,
    quota,
    byCategory,
    byEvidenceType
  };
}

/* ----------------------------------------------------------------- seeds */
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

export async function seedSamples() {
  const repo = await storageRepo();
  if ((await repo.allItems()).some((i) => i.sample)) return { ok: true, skipped: true };
  const { items, cases, custody, shares } = buildSamples({ meId, meName, daysAgo, uid });
  for (const row of cases) await repo.putCase(row);
  for (const item of items) await repo.putItem(item);
  for (const row of custody) await repo.putCustody(row);
  for (const row of shares) await repo.putShare(row);
  emit('seeded');
  return { ok: true, items: items.length, cases: cases.length };
}

export async function clearSamples() {
  const repo = await storageRepo();
  await repo.clear({ keepUserData: true });
  emit('cleared');
  return { ok: true };
}

export async function resetAll() {
  const repo = await storageRepo();
  await repo.clear();
  emit('reset');
  return { ok: true };
}

export { attachFile, dropFile, blobUrlFor } from './storage-files.js';
export { syncHealthPointers } from './storage-health.service.js';

export const PRIVACY_LIST = PRIVACY;
