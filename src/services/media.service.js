/**
 * GuardHai · services/media.service.js
 * Turns a File into an Attachment the composer can show and the post can keep:
 * validate → object URL (instant preview) → blob persisted in IndexedDB.
 * Object URLs are tracked and revoked, so nothing leaks during a long session.
 */
import { validateFile, isMediaKind } from '../domain/media.js';
import { createMediaRepository } from '../data/media.repo.js';
import { uid } from '../core/id.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('media');
const urls = new Map();          // attachmentId -> object URL

let repoPromise = null;
const repo = () => (repoPromise ||= createMediaRepository());

export async function prepareAttachment(file, kind, existing = []) {
  const check = validateFile(file, kind, existing);
  if (!check.ok) return { ok: false, code: check.code, message: check.message };

  const id = uid('att');
  const attachment = {
    id, kind, name: file.name, size: file.size, type: file.type,
    status: 'ready', file, url: null
  };

  if (isMediaKind(kind)) {
    attachment.url = URL.createObjectURL(file);
    urls.set(id, attachment.url);
    try {
      await (await repo()).save(id, file, { name: file.name, type: file.type, size: file.size });
    } catch (err) {
      log.error('could not persist blob', err);
      attachment.persisted = false;
    }
  }
  return { ok: true, attachment };
}

/** resolve an attachment to a usable URL (object URL now, blob from storage later) */
export async function resolveUrl(media) {
  if (!media) return '';
  if (media.kind === 'link') return media.url || '';
  if (urls.has(media.id)) return urls.get(media.id);
  if (!media.blobKey) return media.url || '';
  const row = await (await repo()).get(media.blobKey);
  if (!row?.blob) return media.url || '';
  const url = URL.createObjectURL(row.blob);
  urls.set(media.id, url);
  return url;
}

/** warm the cache for a list of posts so cards render without flicker */
export async function primeUrls(posts) {
  for (const post of posts) {
    for (const media of post.media || []) {
      if (media.kind !== 'link') await resolveUrl(media);
    }
  }
}

export async function releaseAttachment(id, { dropBlob = false } = {}) {
  const url = urls.get(id);
  if (url) { URL.revokeObjectURL(url); urls.delete(id); }
  if (dropBlob) {
    try { await (await repo()).remove(id); } catch { /* already gone */ }
  }
}

export function releaseAll() {
  for (const [id, url] of urls) { URL.revokeObjectURL(url); urls.delete(id); }
}

export async function storageUsage() {
  const r = await repo();
  return r.totalBytes();
}

/** synchronous cache lookup — views call this after priming a feed */
export const getCachedUrl = (id) => urls.get(id) || '';
