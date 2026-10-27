/**
 * GuardHai · domain/post.js
 * The Post entity and its business rules. Pure: it never touches storage,
 * the network or the DOM, which makes it directly unit-testable.
 */

export const POST_TYPES = Object.freeze({
  elimu:    { id: 'elimu',    label: 'Elimu' },
  swali:    { id: 'swali',    label: 'Swali' },
  uzoefu:   { id: 'uzoefu',   label: 'Uzoefu wa Jamii' },
  taarifa:  { id: 'taarifa',  label: 'Taarifa ya Taasisi' },
  fursa:    { id: 'fursa',    label: 'Fursa ya Kusaidia' }
});

export const AUDIENCES = Object.freeze({
  public:    { id: 'public',    label: 'Umma' },
  community: { id: 'community', label: 'Jamii fulani' },
  guardians: { id: 'guardians', label: 'Walezi pekee' }
});

export const LIMITS = Object.freeze({ title: 120, text: 600, attachment: 6 });

export const typeLabel = (type) => (POST_TYPES[type] || POST_TYPES.elimu).label;
export const audienceLabel = (aud) => (AUDIENCES[aud] || AUDIENCES.public).label;

/**
 * Validation shared by the composer (as you type) and the service (at publish).
 * @returns {string[]} list of human-readable errors, empty when valid
 */
export function validateDraft(draft = {}) {
  const errors = [];
  const title = String(draft.title || '').trim();
  const text = String(draft.text || '').trim();

  if (!title && !text) errors.push('Andika kichwa au maelezo kabla ya kuchapisha.');
  if (title.length > LIMITS.title) errors.push(`Kichwa kimezidi herufi ${LIMITS.title}.`);
  if (text.length > LIMITS.text) errors.push(`Maelezo yamezidi herufi ${LIMITS.text}.`);
  if (draft.type && !POST_TYPES[draft.type]) errors.push('Aina ya chapisho haijulikani.');
  if (draft.audience && !AUDIENCES[draft.audience]) errors.push('Watazamaji hawajulikani.');
  if ((draft.media || []).length > LIMITS.attachment) {
    errors.push(`Kiwango cha juu cha viambatisho ni ${LIMITS.attachment}.`);
  }
  if ((draft.media || []).some((m) => m.status === 'preparing')) {
    errors.push('Subiri viambatisho vikamilike.');
  }
  return errors;
}

/** Build the persisted entity from the composer form. */
export function buildPost(form, author, opts = {}) {
  const now = opts.now || new Date().toISOString();
  return {
    id: opts.id || `post_${Date.now().toString(36)}`,
    authorId: author.id,
    authorName: author.name,
    initials: author.initials,
    accountType: `${typeLabel(form.type)} · ${author.isSelf ? 'wewe' : author.role || 'mwanajamii'}`,
    type: form.type || 'elimu',
    topic: form.topic || 'people',
    topicLabel: form.topicLabel || 'Usalama wa Watu',
    title: String(form.title || '').trim(),
    text: String(form.text || '').trim(),
    audience: form.audience || 'public',
    media: (form.media || []).filter((m) => m.status !== 'error').map((m) => ({
      id: m.id, kind: m.kind, name: m.name, size: m.size, type: m.type,
      title: m.title || undefined, url: m.kind === 'link' ? m.url : undefined,
      blobKey: m.kind === 'link' ? undefined : m.id,
      width: m.width, height: m.height
    })),
    createdAt: now,
    updatedAt: now,
    status: 'published',
    sample: false,
    verified: false,
    schemaVersion: 1
  };
}

/** Defensive normalisation for data read back from storage. */
export function normalizePost(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: String(raw.id),
    authorId: raw.authorId || 'unknown',
    authorName: raw.authorName || 'Mtumiaji',
    initials: raw.initials || 'GH',
    accountType: raw.accountType || 'Mwanajamii',
    type: raw.type || 'elimu',
    topic: raw.topic || 'people',
    topicLabel: raw.topicLabel || 'Usalama wa Watu',
    title: raw.title || '',
    text: raw.text || '',
    audience: raw.audience || 'public',
    media: Array.isArray(raw.media) ? raw.media : [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    status: raw.status === 'draft' ? 'draft' : 'published',
    sample: !!raw.sample,
    verified: raw.verified === true,
    schemaVersion: raw.schemaVersion || 1
  };
}
