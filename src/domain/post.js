/**
 * GuardHai · domain/post.js
 * The Post entity and its business rules. Pure: it never touches storage,
 * the network or the DOM, which makes it directly unit-testable.
 */

export const POST_TYPES = Object.freeze({
  elimu:    { id: 'elimu',    label: 'Elimu' },
  swali:    { id: 'swali',    label: 'Swali' },
  uzoefu:   { id: 'uzoefu',   label: 'Uzoefu' },
  taarifa:  { id: 'taarifa',  label: 'Taarifa' },
  fursa:    { id: 'fursa',    label: 'Kusaidia' }
});

/**
 * Topics are a separate axis from the post type: `type` says what kind of post
 * it is (a question, a lesson…), `topic` says what it is about. The composer
 * keeps them in two independent fields and never derives one from the other.
 */
export const TOPICS = Object.freeze({
  afya:       { id: 'afya',       label: 'Afya' },
  usalama:    { id: 'usalama',    label: 'Usalama' },
  taasisi:    { id: 'taasisi',    label: 'Taasisi' },
  kusaidiana: { id: 'kusaidiana', label: 'Kusaidiana' },
  majanga:    { id: 'majanga',    label: 'Majanga' }
});

export const TOPIC_ORDER = Object.freeze(['afya', 'usalama', 'taasisi', 'kusaidiana', 'majanga']);

/** Old topic ids (schema v1) → current ids. Used when reading stored rows. */
export const LEGACY_TOPICS = Object.freeze({
  health: 'afya',
  people: 'usalama',
  crime: 'usalama',
  digital: 'usalama',
  disaster: 'majanga'
});

export const DEFAULT_TOPIC = 'afya';

/** Accepts a current id, a legacy id or a label; always returns a valid id. */
export function normalizeTopic(value, fallback = DEFAULT_TOPIC) {
  const raw = String(value || '').trim();
  if (TOPICS[raw]) return raw;
  if (LEGACY_TOPICS[raw]) return LEGACY_TOPICS[raw];
  const byLabel = Object.values(TOPICS).find((t) => t.label.toLowerCase() === raw.toLowerCase());
  return byLabel ? byLabel.id : fallback;
}

export const topicLabel = (topic) => (TOPICS[normalizeTopic(topic)] || TOPICS[DEFAULT_TOPIC]).label;

export const AUDIENCES = Object.freeze({
  public:    { id: 'public',    label: 'Umma' },
  community: { id: 'community', label: 'Jamii fulani' },
  guardians: { id: 'guardians', label: 'Walezi pekee' }
});

export const LIMITS = Object.freeze({ title: 120, text: 2000, attachment: 6 });

export const typeLabel = (type) => (POST_TYPES[type] || POST_TYPES.elimu).label;

/* ------------------------------------------------- optional field helpers */
/** A source is a label plus an optional http(s) link. Never invented. */
export function cleanSource(source) {
  if (!source) return null;
  const label = String(source.label || source.name || '').trim().slice(0, 60);
  const url = String(source.url || '').trim();
  if (!label) return null;
  return { label, url: /^https?:\/\//i.test(url) ? url.slice(0, 300) : '' };
}

/** A repost points back at the original post; only these two fields are kept. */
export function cleanRepost(ref) {
  if (!ref || !ref.postId) return null;
  return {
    postId: String(ref.postId).slice(0, 80),
    authorName: String(ref.authorName || '').trim().slice(0, 60)
  };
}

export function cleanList(list, max = 5, maxLen = 90) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => String(item || '').trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, max);
}

/** Only tel:, https: and mailto: — anything else is dropped, not rendered. */
export function cleanContacts(contacts) {
  if (!Array.isArray(contacts)) return [];
  const safe = contacts
    .map((c) => ({
      kind: ['phone', 'website', 'email'].includes(c?.kind) ? c.kind : 'website',
      label: String(c?.label || '').trim().slice(0, 50),
      value: String(c?.value || '').trim().slice(0, 120)
    }))
    .filter((c) => c.label && c.value);
  return safe.filter((c) => {
    if (c.kind === 'phone') return /^\+?[0-9 ()-]{6,20}$/.test(c.value);
    if (c.kind === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.value);
    return /^https?:\/\//i.test(c.value);
  }).slice(0, 4);
}
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
  if (draft.topic && !TOPICS[draft.topic] && !LEGACY_TOPICS[draft.topic]) errors.push('Mada haijulikani.');
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
    topic: form.topic ? normalizeTopic(form.topic) : DEFAULT_TOPIC,
    topicLabel: topicLabel(form.topic),
    title: String(form.title || '').trim(),
    text: String(form.text || '').trim(),
    audience: form.audience || 'public',
    location: String(form.location || '').trim().slice(0, 60),
    /* optional, post-type specific — empty arrays mean "not provided" */
    source: cleanSource(form.source),
    eventAt: String(form.eventAt || '').trim().slice(0, 40),
    safetySteps: cleanList(form.safetySteps, 5, 90),
    requirements: cleanList(form.requirements, 5, 90),
    contacts: cleanContacts(form.contacts),
    repostOf: cleanRepost(opts.repostOf),
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
    schemaVersion: 2
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
    topic: normalizeTopic(raw.topic),
    topicLabel: topicLabel(raw.topic),
    title: raw.title || '',
    text: raw.text || '',
    audience: raw.audience || 'public',
    location: raw.location || '',
    alertText: raw.alertText || '',
    source: cleanSource(raw.source),
    eventAt: String(raw.eventAt || '').slice(0, 40),
    safetySteps: cleanList(raw.safetySteps, 5, 90),
    requirements: cleanList(raw.requirements, 5, 90),
    contacts: cleanContacts(raw.contacts),
    repostOf: cleanRepost(raw.repostOf),
    media: Array.isArray(raw.media) ? raw.media : [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    // 'deleted' is a tombstone written by the repository's soft delete; keeping
    // it distinct is what makes remove() actually remove the post from lists
    status: ['draft', 'deleted'].includes(raw.status) ? raw.status : 'published',
    sample: !!raw.sample,
    verified: raw.verified === true,
    schemaVersion: 2
  };
}
