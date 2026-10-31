/**
 * GuardHai · services/storage-health.service.js
 * The Health module owns its records. The Storage Center keeps a pointer at the
 * real record (`healthRef`) and nothing else: no file is copied, no note is
 * duplicated, and deleting the health record removes the pointer on the next
 * sync. Read-only by construction — every row this writes has `readOnly: true`.
 */
import { storageRepo } from '../data/storage.repo.js';
import { uid } from '../core/id.js';
import { currentUser } from './session.service.js';

const nowIso = () => new Date().toISOString();
const meId = () => currentUser()?.id || 'me';
const meName = () => currentUser()?.name || 'Wewe';

export async function syncHealthPointers(descriptors = []) {
  const repo = await storageRepo();
  const existing = (await repo.allItems()).filter((i) => i.healthRef);
  const byRecord = new Map(existing.map((i) => [i.healthRef.recordId, i]));
  let added = 0;
  let removed = 0;
  for (const d of descriptors) {
    const current = byRecord.get(d.recordId);
    if (current) {
      await repo.putItem({ ...current, title: d.title, createdAt: d.date || current.createdAt, subcategory: d.subcategory });
      continue;
    }
    const at = nowIso();
    const item = {
      id: uid('st'),
      kind: 'document',
      category: 'health',
      subcategory: d.subcategory,
      evidenceType: null,
      evidenceId: null,
      title: d.title,
      description: d.summary || '',
      fileType: d.fileType || 'pdf',
      mime: '',
      sizeBytes: Number(d.size || 0),
      version: 'original',
      originId: null,
      source: 'health',
      sourceLabel: d.facility || '',
      ownerId: meId(),
      ownerName: meName(),
      uploadedById: meId(),
      uploadedByName: meName(),
      createdAt: d.date ? `${d.date}T00:00:00.000Z` : at,
      uploadedAt: at,
      location: null,
      privacy: 'restricted',
      verification: 'unreviewed',
      integrity: null,
      tags: [],
      caseIds: [],
      eventRef: null,
      relatedIds: [],
      healthRef: { module: 'health', recordId: d.recordId, screenId: 'records' },
      blobKey: null,
      notes: [],
      archived: false,
      readOnly: true,
      sample: !!d.sample
    };
    await repo.putItem(item);
    added++;
  }
  const wanted = new Set(descriptors.map((d) => d.recordId));
  for (const [recordId, item] of byRecord) {
    if (!wanted.has(recordId)) { await repo.removeItem(item.id); removed++; }
  }
  return { added, removed, total: descriptors.length };
}
