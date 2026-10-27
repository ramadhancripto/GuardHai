/** GuardHai · services/drafts.service.js */
import { createDraftRepository } from '../data/drafts.repo.js';
import { bus, EVENTS } from '../core/bus.js';
import { uid, nowIso } from '../core/id.js';

let repoPromise = null;
const repo = () => (repoPromise ||= createDraftRepository());

export async function saveDraft(form) {
  const media = form.media || [];
  const draft = {
    id: uid('draft'),
    title: String(form.title || '').trim(),
    text: String(form.text || '').trim(),
    type: form.type,
    topic: form.topic,
    audience: form.audience,
    links: media.filter((m) => m.kind === 'link').map((m) => m.url),
    mediaDropped: media.filter((m) => m.kind !== 'link').length,
    createdAt: nowIso()
  };
  await (await repo()).save(draft);
  const count = await (await repo()).count();
  bus.emit(EVENTS.DRAFT_SAVED, { draft, count });
  return { draft, count };
}

export const listDrafts = async () => (await repo()).list();
export const latestDraft = async () => (await repo()).latest();
export const deleteDraft = async (id) => (await repo()).remove(id);
export const countDrafts = async () => (await repo()).count();
