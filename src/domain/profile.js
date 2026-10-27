/**
 * GuardHai · domain/profile.js
 * Identity rules for the community: roles, accents, badges and verification.
 *
 * Two ideas are deliberately kept apart:
 *
 *   role         — what the person says they do. Self-selected, costs nothing.
 *   verification — evidence that someone checked a licence or an institution.
 *
 * A role never produces a badge. Only `verification.licence.checkedBy` /
 * `verification.institution.checkedBy` (recorded by a verifier, not by the
 * profile itself) do. Sample personas can never be verified at all.
 */

/* ------------------------------------------------------------------ roles */
export const ROLES = Object.freeze({
  member: Object.freeze({
    id: 'member', label: 'Mwanajamii', short: 'Jamii', icon: 'i-user',
    accent: '#18A982', soft: '#E7F6F1', ink: '#0B7A5F',
    blurb: 'Mwanajamii anayeshiriki elimu na uzoefu wa kila siku.'
  }),
  health: Object.freeze({
    id: 'health', label: 'Mtaalamu wa Afya', short: 'Afya', icon: 'i-heart-pulse',
    accent: '#2563EB', soft: '#EAF1FE', ink: '#1D4ED8',
    blurb: 'Afya, lishe, afya ya akili na msaada wa kwanza.'
  }),
  safety: Object.freeze({
    id: 'safety', label: 'Mtaalamu wa Usalama', short: 'Usalama', icon: 'i-shield-check',
    accent: '#7C3AED', soft: '#F1EBFE', ink: '#6D28D9',
    blurb: 'Usalama wa mtu, uhalifu, dharura na kuzuia hatari.'
  }),
  org: Object.freeze({
    id: 'org', label: 'Taasisi', short: 'Taasisi', icon: 'i-building',
    accent: '#B8860B', soft: '#FBF3E0', ink: '#8A6508',
    blurb: 'Taasisi, shule, kliniki au shirika linalotoa taarifa rasmi.'
  }),
  volunteer: Object.freeze({
    id: 'volunteer', label: 'Kujitolea', short: 'Kujitolea', icon: 'i-users',
    accent: '#0D9488', soft: '#E6F7F5', ink: '#0F766E',
    blurb: 'Wajitolea na misaada ya jamii.'
  })
});

export const ROLE_ORDER = Object.freeze(['member', 'health', 'safety', 'org', 'volunteer']);
export const MAX_ROLES = 3;

export const roleOf = (roleId) => ROLES[roleId] || ROLES.member;

/** every valid role the profile holds, primary first, at least one */
export function rolesOf(profile) {
  const list = Array.isArray(profile?.roles) ? profile.roles.filter((r) => ROLES[r]) : [];
  const primary = ROLES[profile?.primaryRole] ? profile.primaryRole : null;
  const unique = [...new Set([primary, ...list].filter(Boolean))];
  return unique.length ? unique : ['member'];
}

export function primaryRoleOf(profile) {
  return roleOf(rolesOf(profile)[0]);
}

/* ----------------------------------------------------------- verification */
export const VERIFICATION_KINDS = Object.freeze({
  licence: Object.freeze({
    id: 'licence',
    label: 'Leseni ya taaluma',
    short: 'Leseni',
    icon: 'i-shield-check',
    needs: 'Namba ya leseni, bodi inayotoa, na jina la mthibitishaji.'
  }),
  institution: Object.freeze({
    id: 'institution',
    label: 'Uthibitisho wa taasisi',
    short: 'Taasisi',
    icon: 'i-building',
    needs: 'Jina la taasisi lililosajiliwa, namba ya usajili, na mthibitishaji.'
  })
});

const evidenceComplete = (entry) =>
  !!(entry && entry.checkedBy && entry.reference && (entry.checkedAt || entry.checkedBy));

/**
 * @returns {{ licence: object, institution: object }} each with
 *   { status: 'none' | 'requested' | 'verified' | 'sample', label, icon }
 */
export function verificationOf(profile) {
  const out = {};
  for (const kind of Object.keys(VERIFICATION_KINDS)) {
    const entry = profile?.verification?.[kind] || {};
    let status = 'none';
    if (profile?.sample) status = 'sample';
    else if (evidenceComplete(entry)) status = 'verified';
    else if (entry.requested) status = 'requested';
    out[kind] = {
      ...VERIFICATION_KINDS[kind],
      status,
      authority: entry.authority || null,
      reference: entry.reference || null,
      checkedAt: entry.checkedAt || null,
      checkedBy: entry.checkedBy || null
    };
  }
  return out;
}

export const isVerified = (profile, kind) => verificationOf(profile)[kind]?.status === 'verified';

/**
 * Badges are derived, never stored. Order matters: sample first, then the
 * evidence-backed ones, then pending requests.
 */
export function badgesFor(profile) {
  const badges = [];
  if (profile?.sample) {
    badges.push({ id: 'sample', label: 'Sampuli', icon: 'i-list', tone: 'neutral',
      title: 'Wasifu wa mfano — si mtu halisi.' });
    return badges;
  }
  const v = verificationOf(profile);
  for (const kind of Object.keys(v)) {
    if (v[kind].status === 'verified') {
      badges.push({
        id: kind, label: v[kind].short, icon: v[kind].icon, tone: 'verified',
        title: `${v[kind].label}: imethibitishwa${v[kind].authority ? ` na ${v[kind].authority}` : ''}`
      });
    } else if (v[kind].status === 'requested') {
      badges.push({ id: `${kind}-pending`, label: `${v[kind].short} · inasubiri`, icon: 'i-clock',
        tone: 'pending', title: 'Ombi limewasilishwa; hakuna uthibitisho bado.' });
    }
  }
  return badges;
}

/* --------------------------------------------------------------- profile */
export const BIO_MAX = 160;
export const TOPICS_MAX = 5;

/**
 * Optional, role-shaped fields. They are free text the owner (or a sample
 * persona) fills in; none of them is evidence and none of them produces a
 * badge. Empty string means "not provided" and the UI renders nothing.
 */
export const PROFILE_FIELDS = Object.freeze({
  affiliation: 80,     // hospital, unit, institution the person works with
  availability: 60,    // "7:00 - 19:00", "Jumatatu - Ijumaa"
  serviceAreas: 80,    // where a volunteer works
  orgKind: 40,         // clinic / NGO / company
  coverage: 60         // area an institution or officer covers
});

const clean = (value, max) => String(value || '').trim().slice(0, max);

export function profileInitials(name, fallback = 'GH') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const roles = rolesOf(raw);
  return {
    id: String(raw.id || 'unknown'),
    name: String(raw.name || 'Mtumiaji'),
    initials: raw.initials || profileInitials(raw.name),
    bio: String(raw.bio || '').slice(0, BIO_MAX),
    roles,
    primaryRole: roles[0],
    topics: Array.isArray(raw.topics) ? raw.topics.slice(0, TOPICS_MAX).map(String) : [],
    location: raw.location || '',
    affiliation: clean(raw.affiliation, PROFILE_FIELDS.affiliation),
    availability: clean(raw.availability, PROFILE_FIELDS.availability),
    serviceAreas: clean(raw.serviceAreas, PROFILE_FIELDS.serviceAreas),
    orgKind: clean(raw.orgKind, PROFILE_FIELDS.orgKind),
    coverage: clean(raw.coverage, PROFILE_FIELDS.coverage),
    joinedAt: raw.joinedAt || null,
    avatarUrl: raw.avatarUrl || null,
    coverUrl: raw.coverUrl || null,
    sample: raw.sample === true,
    isSelf: raw.isSelf === true,
    verification: {
      licence: { ...(raw.verification?.licence || {}) },
      institution: { ...(raw.verification?.institution || {}) }
    }
  };
}

/** @returns {string[]} human-readable problems, empty when valid */
export function validateProfile(draft) {
  const errors = [];
  const name = String(draft?.name || '').trim();
  if (name.length < 2) errors.push('Jina linahitaji angalau herufi 2.');
  if (name.length > 40) errors.push('Jina linaweza kuwa na herufi 40 tu.');
  if (String(draft?.bio || '').length > BIO_MAX) errors.push(`Wasifu umezidi herufi ${BIO_MAX}.`);
  const roles = Array.isArray(draft?.roles) ? draft.roles.filter((r) => ROLES[r]) : [];
  if (!roles.length) errors.push('Chagua angalau jukumu moja.');
  if (roles.length > MAX_ROLES) errors.push(`Unaweza kuchagua majukumu ${MAX_ROLES} tu.`);
  if ((draft?.topics || []).length > TOPICS_MAX) errors.push(`Mada ${TOPICS_MAX} tu.`);
  if (draft?.sample) errors.push('Wasifu wa sampuli hauwezi kuhaririwa.');
  return errors;
}
