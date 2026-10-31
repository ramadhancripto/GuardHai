/**
 * GuardHai · services/storage-files.js
 * The bytes behind a storage record. Files are validated, written to the media
 * store (IndexedDB) and handed to the view as object URLs that are reused
 * between repaints — a shared helper because the record sheet, the add form and
 * the integrity check all need exactly this.
 */
import { createMediaRepository } from '../data/media.repo.js';
import { uid } from '../core/id.js';
import { LIMITS } from '../domain/storage.js';

/* Object URLs handed to the view. Kept in one map so a repaint reuses the same
   URL instead of leaking a new one on every render. */
const blobUrls = new Map();
export async function blobUrlFor(blobKey) {
  if (!blobKey) return '';
  if (blobUrls.has(blobKey)) return blobUrls.get(blobKey);
  try {
    const row = await (await createMediaRepository()).get(blobKey);
    if (!row?.blob) return '';
    const url = URL.createObjectURL(row.blob);
    blobUrls.set(blobKey, url);
    return url;
  } catch {
    return '';
  }
}

/**
 * Validate a chosen File and keep its bytes on this device. Everything the
 * Storage Center can show is stored here — documents included, not only the
 * media kinds the chat composer keeps.
 */
export async function attachFile(file, kind = 'document') {
  if (!file) return { ok: false, message: 'Hakuna faili iliyochaguliwa.' };
  if (file.size > LIMITS.maxFileBytes) {
    return { ok: false, message: `Faili ni kubwa mno (kikomo ${Math.round(LIMITS.maxFileBytes / 1048576)} MB).` };
  }
  const blobKey = uid('blob');
  try {
    await (await createMediaRepository()).save(blobKey, file, { name: file.name, type: file.type, size: file.size });
  } catch (err) {
    return { ok: false, message: `Faili haikuweza kuhifadhiwa: ${String(err?.message || err)}` };
  }
  return {
    ok: true,
    attachment: { blobKey, name: file.name, size: file.size, type: file.type || '', kind }
  };
}

export async function dropFile(blobKey) {
  if (!blobKey) return { ok: true };
  try {
    blobUrls.delete(blobKey);
    await (await createMediaRepository()).remove(blobKey);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
