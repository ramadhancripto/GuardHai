/**
 * GuardHai · services/profile.service.js
 * Profiles: the people who write in Uwanja.
 *
 * Sources, in order of precedence:
 *   1. the device itself   (IndexedDB `profiles`)  — the owner's own profile
 *   2. sample personas     (data/profiles.js)      — always `sample: true`
 *   3. a stub built from whatever the post carried — never verified
 *
 * Messaging is provided by the Communication & Support Network (chat.service).
 * `message()` opens or returns a real local conversation; whether it can reach
 * the person is reported separately and honestly by the chat layer.
 */
import { ROLES, normalizeProfile, validateProfile, badgesFor, verificationOf, primaryRoleOf, roleOf } from '../domain/profile.js';
import { createProfileRepository } from '../data/profiles.repo.js';
import { createFollowRepository } from '../data/follows.repo.js';
import { SAMPLE_PROFILES, sampleProfileFor } from '../data/profiles.js';
import { SAMPLE_POSTS } from '../data/seed-posts.js';
import { currentUser } from './session.service.js';
import { listPosts } from './posts.service.js';
import { openDirect } from './chat.service.js';
import { bus, EVENTS } from '../core/bus.js';
import { nowIso } from '../core/id.js';

let repoPromise = null;
const repo = () => (repoPromise ||= createProfileRepository());
let followRepoPromise = null;
const followRepo = () => (followRepoPromise ||= createFollowRepository());

const SELF_ID = 'me';

/** the device owner: stored profile if edited, otherwise derived from the session */
export async function myProfile() {
  const stored = await (await repo()).get(SELF_ID);
  if (stored) return { ...stored, isSelf: true };

  const user = currentUser();
  return normalizeProfile({
    id: SELF_ID,
    name: user.name,
    initials: user.initials,
    bio: '',
    roles: ['member'],
    topics: [],
    joinedAt: nowIso(),
    sample: false,
    isSelf: true,
    verification: { licence: {}, institution: {} }
  });
}

export async function getProfile(id) {
  if (!id) return null;
  if (id === SELF_ID || id === currentUser().id) return myProfile();

  const stored = await (await repo()).get(id);
  if (stored) return stored;

  const sample = sampleProfileFor(id);
  if (sample) return sample;

  return normalizeProfile({
    id,
    name: 'Mtumiaji wa GuardHai',
    roles: ['member'],
    sample: false,
    verification: { licence: {}, institution: {} }
  });
}

/** everyone the app can show, de-duplicated, samples last */
export async function listProfiles() {
  const own = await myProfile();
  const stored = (await (await repo()).all()).filter((p) => p.id !== SELF_ID);
  const seen = new Set([own.id, ...stored.map((p) => p.id)]);
  return [own, ...stored, ...SAMPLE_PROFILES.filter((p) => !seen.has(p.id))];
}

export async function saveMyProfile(draft) {
  const errors = validateProfile({ ...draft, sample: false });
  if (errors.length) return { ok: false, errors };

  const previous = await myProfile();
  const roles = draft.roles.filter((r) => ROLES[r]);
  const profile = normalizeProfile({
    ...previous,
    name: String(draft.name).trim(),
    bio: String(draft.bio || '').trim(),
    roles,
    primaryRole: roles[0] || 'member',
    topics: (draft.topics || []).slice(0, 5),
    location: String(draft.location || '').trim(),
    // role-shaped optional fields: saved only when the editor provides them,
    // otherwise the stored value is kept as-is (normalizeProfile trims + caps).
    affiliation: draft.affiliation ?? previous.affiliation,
    availability: draft.availability ?? previous.availability,
    serviceAreas: draft.serviceAreas ?? previous.serviceAreas,
    orgKind: draft.orgKind ?? previous.orgKind,
    coverage: draft.coverage ?? previous.coverage,
    avatarUrl: draft.avatarUrl ?? previous.avatarUrl,
    isSelf: true,
    sample: false
  });

  await (await repo()).save({ ...profile, id: SELF_ID });
  bus.emit(EVENTS.PROFILE_UPDATED, profile);
  return { ok: true, profile };
}

/**
 * Ask for a verification. This records the request only: nothing is granted
 * until a verifier records evidence (which needs a backend that does not exist).
 */
export async function requestVerification(kind, { authority = '', reference = '' } = {}) {
  if (!verificationOf({ verification: {} })[kind]) return { ok: false, error: 'kind' };
  const profile = await myProfile();
  if (profile.sample) return { ok: false, error: 'sample' };
  if (!reference.trim()) return { ok: false, error: 'reference' };

  const updated = {
    ...profile,
    verification: {
      ...profile.verification,
      [kind]: { requested: true, authority: authority.trim(), reference: reference.trim(), checkedBy: null, checkedAt: null }
    }
  };
  await (await repo()).save({ ...updated, id: SELF_ID });
  bus.emit(EVENTS.PROFILE_UPDATED, updated);
  return { ok: true, profile: updated };
}

export async function isFollowing(profileId, user = currentUser()) {
  return (await followRepo()).isFollowing(profileId, user.id);
}

export async function toggleFollow(profileId, user = currentUser()) {
  const repo_ = await followRepo();
  const next = !(await repo_.isFollowing(profileId, user.id));
  await repo_.setFollowing(profileId, user.id, next);
  bus.emit(EVENTS.PROFILE_FOLLOW_CHANGED, { profileId, following: next });
  return next;
}

/**
 * Post rows for a profile page: the device's own posts plus the labelled sample
 * ones that belong to a sample persona (those keep their Sampuli badge).
 */
export async function postsByAuthor(authorId) {
  const own = await listPosts({ topic: 'all' });
  const samples = SAMPLE_POSTS.filter((p) => p.authorId === authorId);
  return [...own.filter((p) => p.authorId === authorId), ...samples];
}

export function presentationOf(profile) {
  const role = primaryRoleOf(profile);
  return {
    role,
    roles: (profile.roles || []).map(roleOf),
    badges: badgesFor(profile),
    verification: verificationOf(profile)
  };
}

/**
 * Messaging is not connected. Returning the reason lets the UI say so instead
 * of opening a composer that would silently drop the message.
 */
export async function message(profileId) {
  if (!profileId) return { ok: false, reason: 'no-profile', detail: 'Wasifu haujulikani.' };
  const result = await openDirect(profileId);
  if (!result.ok) {
    return { ok: false, reason: result.reason, profileId, detail: 'Mazungumzo hayakufunguka.' };
  }
  return {
    ok: true,
    profileId,
    conversationId: result.conversation.id,
    created: result.created,
    detail: 'Mazungumzo yamefunguliwa kwenye Chat. Hakuna seva ya kuwasilisha ujumbe.'
  };
}

export { SELF_ID };
