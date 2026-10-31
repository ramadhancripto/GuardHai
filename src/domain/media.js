/**
 * GuardHai · domain/media.js
 * Media rules and validation — pure functions, no DOM, no network.
 * The same rules MUST be enforced server-side once an upload backend exists;
 * client validation is a UX guard, never a security boundary.
 */

export const MEDIA_RULES = Object.freeze({
  image: Object.freeze({
    accept: Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    maxBytes: 5 * 1024 * 1024,
    maxCount: 4,
    label: 'Picha'
  }),
  video: Object.freeze({
    accept: Object.freeze(['video/mp4', 'video/webm', 'video/ogg']),
    maxBytes: 50 * 1024 * 1024,
    maxCount: 1,
    label: 'Video'
  }),
  audio: Object.freeze({
    accept: Object.freeze(['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a']),
    maxBytes: 15 * 1024 * 1024,
    maxCount: 1,
    label: 'Sauti'
  }),
  link: Object.freeze({ accept: Object.freeze(['http:', 'https:']), maxCount: 3, label: 'Kiungo' }),
  /* documents were added for the Communication & Support Network (v3) */
  document: Object.freeze({
    accept: Object.freeze([
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]),
    maxBytes: 10 * 1024 * 1024,
    maxCount: 3,
    label: 'Hati'
  })
});

export const MAX_ATTACHMENTS = 6;

/** browsers append codecs (audio/webm;codecs=opus) — always compare the base type */
export const baseType = (type) => String(type || '').split(';')[0].trim().toLowerCase();

/**
 * @returns {{ok: true} | {ok: false, code: string, message: string}}
 */
export function validateFile(file, kind, existing = []) {
  const rule = MEDIA_RULES[kind];
  if (!rule) return { ok: false, code: 'kind', message: `Aina "${kind}" haijulikani.` };
  if (!file) return { ok: false, code: 'empty', message: 'Hakuna faili.' };

  const sameKind = existing.filter((a) => a.kind === kind && a.status !== 'error').length;
  if (sameKind >= rule.maxCount) {
    return { ok: false, code: 'count', message: `${rule.label}: kiwango cha juu ni ${rule.maxCount} kwa chapisho.` };
  }
  if (existing.length >= MAX_ATTACHMENTS) {
    return { ok: false, code: 'total', message: `Kiwango cha juu cha viambatisho ni ${MAX_ATTACHMENTS}.` };
  }
  const type = baseType(file.type);
  if (!rule.accept.includes(type)) {
    return {
      ok: false, code: 'type',
      message: `${file.name}: aina "${file.type || 'isiyojulikana'}" hairuhusiwi. Inaruhusiwa: ${rule.accept.join(', ')}.`
    };
  }
  if (!file.size) return { ok: false, code: 'empty-file', message: `${file.name}: faili tupu.` };
  if (file.size > rule.maxBytes) {
    const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
    return { ok: false, code: 'size', message: `${file.name}: ${mb(file.size)} inazidi kikomo cha ${mb(rule.maxBytes)}.` };
  }
  return { ok: true };
}

/** http(s) only — blocks javascript:, data:, file: and other schemes */
export function validateLink(raw) {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, code: 'empty', message: 'Weka kiungo kwanza.' };
  let url;
  try { url = new URL(text); }
  catch { return { ok: false, code: 'format', message: 'Kiungo si sahihi. Tumia muundo https://…' }; }
  if (!MEDIA_RULES.link.accept.includes(url.protocol)) {
    return { ok: false, code: 'scheme', message: 'Kiungo lazima kianze na http:// au https://' };
  }
  return { ok: true, url: url.href };
}

export const isMediaKind = (kind) => kind === 'image' || kind === 'video' || kind === 'audio';
