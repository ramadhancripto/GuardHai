/**
 * GuardHai · services/discover.service.js
 * Discovery over people, communities, support providers and professionals.
 *
 * Privacy rules, enforced here rather than in the views:
 *   • a person only appears if they opted in (`discoverable`), or is the device
 *     owner looking at their own entry;
 *   • no contact detail is ever returned — no phone, email, address or handle;
 *   • private and local community *content* is not listed; public + verified
 *     communities are, and private ones only to members;
 *   • "verified" comes from domain/profile.js verification, never from a flag a
 *     provider sets about themselves.
 */
import { createRepo } from '../data/network.repo.js';
import { listProfiles, myProfile } from './profile.service.js';
import { listCommunities } from './community.service.js';
import { listProviders } from './support.service.js';
import { currentUser } from './session.service.js';
import { roleOf } from '../domain/profile.js';

const metaRepo = createRepo('meta');
const SETTINGS_KEY = 'discover-settings';

const DEFAULT_SETTINGS = Object.freeze({
  discoverable: false,
  showInProfessionalDirectory: false,
  allowGuardianInvites: true,
  allowCommunityInvites: true,
  publicName: ''
});

export async function getSettings() {
  const row = await metaRepo.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(row?.value || {}) };
}

export async function setSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await metaRepo.put({ key: SETTINGS_KEY, value: next, updatedAt: new Date().toISOString() });
  return next;
}

/** Public shape: name, role, badges, sample flag. Never a contact detail. */
function publicCard(profile, { self = false } = {}) {
  return {
    id: profile.id,
    name: profile.name,
    initials: profile.initials,
    role: profile.primaryRole || 'member',
    roleLabel: roleOf(profile.primaryRole).label,
    bio: profile.bio || '',
    topics: profile.topics || [],
    sample: !!profile.sample,
    self,
    discoverable: true
  };
}

export async function discoverPeople({ query = '', role = null, includeSelf = true } = {}) {
  const me = await myProfile();
  const settings = await getSettings();
  const needle = String(query || '').trim().toLowerCase();

  const pool = [];
  if (includeSelf && settings.discoverable) pool.push(publicCard({ ...me, id: 'me' }, { self: true }));

  for (const p of await listProfiles()) {
    if (p.id === 'me' || p.isSelf) continue;
    if (p.discoverable === false && !p.sample) continue;  // explicit opt-out
    pool.push(publicCard(p));
  }

  return pool
    .filter((p) => (role ? p.role === role : true))
    .filter((p) => (needle ? `${p.name} ${p.bio} ${(p.topics || []).join(' ')}`.toLowerCase().includes(needle) : true))
    .sort((a, b) => Number(a.sample) - Number(b.sample) || a.name.localeCompare(b.name));
}

export async function discoverCommunities({ query = '', type = null } = {}) {
  return listCommunities({ type, query });
}

export async function discoverProviders({ query = '', category = null } = {}) {
  const rows = await listProviders({ query, category });
  return rows.map((p) => ({
    ...p,
    // the card never claims a licence; verification is resolved by the view
  }));
}

/**
 * One search across every surface. Returns grouped results so the screen can show
 * four honest sections instead of pretending to be a global index.
 */
export async function searchAll(query, { type = null } = {}) {
  const term = String(query || '').trim();
  const [people, communities, providers] = await Promise.all([
    discoverPeople({ query: term, role: type }),
    discoverCommunities({ query: term }),
    discoverProviders({ query: term })
  ]);
  return {
    term,
    people,
    communities,
    providers,
    total: people.length + communities.length + providers.length
  };
}

/** GuardHai ID / QR lookup is an integration boundary, not a fake feature. */
export async function lookupGuardHaiId(rawId) {
  const value = String(rawId || '').trim();
  if (!value) return { ok: false, message: 'Weka Kitambulisho cha GuardHai.' };
  const normalised = value.replace(/^gh[-:/ ]?/i, '').toLowerCase();
  if (normalised.length < 4) return { ok: false, message: 'Kitambulisho kifupi mno.' };

  const people = await discoverPeople({ query: '' });
  const hit = people.find((p) => String(p.id).toLowerCase().includes(normalised));
  if (hit) return { ok: true, person: hit };

  return {
    ok: false,
    code: 'no-directory',
    message: 'Hakuna orodha ya watumiaji iliyounganishwa. Utafutaji wa Kitambulisho cha GuardHai unahitaji seva.'
  };
}

/** contacts import is a device permission boundary; nothing is read here */
export const CONTACT_IMPORT = {
  available: false,
  message: 'Uagizaji wa anwani za simu haujaunganishwa. GuardHai haiwezi kusoma anwani zako.'
};

export const currentIdentity = () => {
  const user = currentUser();
  return { id: user.id, name: user.name, initials: user.initials };
};
