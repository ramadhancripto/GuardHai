/**
 * GuardHai · features/network/network-seed.js
 * Labelled sample content, nothing more.
 *
 * Every row written here carries `sample: true`, every name is a "Mfano" persona
 * that already exists in the Uwanja sample set, and `clearDemo()` removes only
 * those rows. A real account never sees a guardian it did not invite: the seed
 * exists so the workflows can be walked through on an empty device.
 */
import { createRepo } from '../../data/network.repo.js';
import { uid, nowIso } from '../../core/id.js';
import { currentUser } from '../../services/session.service.js';
import { guardianshipPermissions } from '../../domain/network.js';

const conv = createRepo('conversations');
const msgs = createRepo('messages');
const guard = createRepo('guardianships');
const communities = createRepo('communities');
const members = createRepo('memberships');
const posts = createRepo('communityPosts');
const events = createRepo('communityEvents');
const providers = createRepo('supportProviders');
const requests = createRepo('supportRequests');
const alerts = createRepo('alerts');

export const SEED_MARK = true;   // rows written by this file carry sample: true

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();
const ahead = (days) => new Date(Date.now() + days * 86400000).toISOString();

export async function isSeeded() {
  return (await conv.all()).some((c) => c.sample);
}

export async function seedDemo() {
  const me = currentUser().id;
  const stamp = nowIso();

  /* ------------------------------------------------------------- chats */
  const dmHealth = {
    id: uid('conv'), type: 'dm', directKey: [me, 'author-health'].sort().join('|'),
    participantIds: [me, 'author-health'], title: '', createdAt: ago(240), updatedAt: ago(18),
    createdBy: me, pinned: true, archived: false, muted: false, guardian: true,
    privacy: 'guardian', sample: true
  };
  const dmMember = {
    id: uid('conv'), type: 'dm', directKey: [me, 'author-member'].sort().join('|'),
    participantIds: [me, 'author-member'], title: '', createdAt: ago(180), updatedAt: ago(95),
    createdBy: 'author-member', pinned: false, archived: false, muted: false, guardian: false,
    privacy: 'standard', sample: true
  };
  const group = {
    id: uid('conv'), type: 'group', participantIds: [me, 'author-volunteer', 'author-member', 'author-safety'],
    title: 'Wajitolea Kijichi', createdAt: ago(400), updatedAt: ago(52), createdBy: 'author-volunteer',
    pinned: false, archived: false, muted: false, guardian: true, privacy: 'standard', sample: true
  };
  for (const c of [dmHealth, dmMember, group]) await conv.put(c);

  const thread = [
    [dmHealth, 'author-health', 'Habari! Umepima shinikizo leo?', 40],
    [dmHealth, me, 'Ndio, 128/82. Nimeandika kwenye rekodi.', 36],
    [dmHealth, 'author-health', 'Vizuri. Kama kichwa kinauma, pumzika na kunywa maji.', 18],
    [dmMember, me, 'Asante kwa msaada wa jana.', 120],
    [dmMember, 'author-member', 'Karibu. Nitakujulisha nikipata taarifa za mkutano.', 95],
    [group, 'author-volunteer', 'Kikao cha Jumamosi saa 3 asubuhi, kituo cha Kijichi.', 60],
    [group, 'author-safety', 'Nitakuja na orodha ya namba za dharura.', 52]
  ];
  for (const [c, authorId, text, mins] of thread) {
    await msgs.put({
      id: uid('msg'), conversationId: c.id, authorId, kind: 'text', text,
      state: 'saved', deliveredTo: c.participantIds.filter((p) => p !== authorId), readBy: [authorId],
      createdAt: ago(mins), sample: true
    });
  }

  /* --------------------------------------------------------- guardians */
  const relationships = [
    {
      id: uid('grd'), ownerId: me, guardianId: 'author-member', role: 'primary',
      permissions: guardianshipPermissions('primary'), status: 'active',
      createdAt: ago(600), updatedAt: ago(600), requestedAt: ago(600), respondedAt: ago(580),
      consent: { requestedBy: me, respondedBy: 'author-member', respondedAt: ago(580) },
      invitationDelivered: false, sample: true,
      history: [{ at: ago(600), actorId: me, action: 'invited' }, { at: ago(580), actorId: 'author-member', action: 'accepted' }]
    },
    {
      id: uid('grd'), ownerId: 'author-safety', guardianId: me, role: 'backup',
      permissions: guardianshipPermissions('backup'), status: 'received',
      createdAt: ago(90), updatedAt: ago(90), requestedAt: ago(90), respondedAt: null,
      consent: { requestedBy: 'author-safety', respondedBy: null, respondedAt: null },
      invitationDelivered: false, sample: true, note: 'Kwa dharura za usiku.',
      history: [{ at: ago(90), actorId: 'author-safety', action: 'invited' }]
    },
    {
      id: uid('grd'), ownerId: me, guardianId: 'author-org', role: 'professional',
      permissions: guardianshipPermissions('professional'), status: 'sent',
      createdAt: ago(30), updatedAt: ago(30), requestedAt: ago(30), respondedAt: null,
      consent: { requestedBy: me, respondedBy: null, respondedAt: null },
      invitationDelivered: false, sample: true,
      history: [{ at: ago(30), actorId: me, action: 'invited' }]
    }
  ];
  for (const r of relationships) await guard.put(r);

  /* ------------------------------------------------------- communities */
  const list = [
    {
      id: 'cm-public', name: 'Usalama wa Kijichi', about: 'Jamii ya wazi kwa wakazi wa Kijichi: taarifa za usalama, maji na umeme.',
      type: 'public', rules: 'Kuheshimu kila mwanachama. Hakuna matangazo ya biashara.', tags: ['usalama', 'mtaa'],
      listed: true, memberCount: 3, postCount: 2, createdBy: 'author-volunteer', createdAt: ago(3000),
      updatedAt: stamp, status: 'active', location: 'Kijichi', sample: true
    },
    {
      id: 'cm-private', name: 'Wazazi wa Shule Mwanga', about: 'Kikundi cha faragha cha wazazi: ratiba, usafiri na masuala ya shule.',
      type: 'private', rules: 'Uanachama kwa idhini ya msimamizi.', tags: ['shule', 'familia'],
      listed: false, memberCount: 2, postCount: 1, createdBy: 'author-member', createdAt: ago(2400),
      updatedAt: stamp, status: 'active', sample: true
    },
    {
      id: 'cm-local', name: 'Mbagala Water Watch', about: 'Jamii ya eneo inayofuatilia upatikanaji wa maji na ratiba za mabomba.',
      type: 'local', rules: 'Taarifa ziwe za eneo la Mbagala pekee.', tags: ['maji', 'mbagala'],
      listed: false, memberCount: 2, postCount: 1, createdBy: 'author-volunteer', createdAt: ago(1800),
      updatedAt: stamp, status: 'active', location: 'Mbagala', sample: true
    },
    {
      id: 'cm-pro', name: 'Wataalamu wa Afya ya Jamii', about: 'Mijadala ya wataalamu kuhusu afya ya jamii. Uthibitisho huonyeshwa tofauti na uanachama.',
      type: 'professional', rules: 'Toa vyanzo. Hakuna ushauri wa kibinafsi bila maelezo.', tags: ['afya', 'wataalamu'],
      listed: false, memberCount: 2, postCount: 1, createdBy: me, createdAt: ago(1200),
      updatedAt: stamp, status: 'active', sample: true
    }
  ];
  for (const c of list) await communities.put(c);

  const membershipRows = [
    { communityId: 'cm-public', profileId: me, role: 'member', status: 'active', joinedAt: ago(2000) },
    { communityId: 'cm-public', profileId: 'author-volunteer', role: 'admin', status: 'active', joinedAt: ago(3000) },
    { communityId: 'cm-public', profileId: 'author-member', role: 'member', status: 'active', joinedAt: ago(1500) },
    { communityId: 'cm-private', profileId: me, role: 'member', status: 'pending', joinedAt: null, requestedAt: ago(120) },
    { communityId: 'cm-private', profileId: 'author-member', role: 'founder', status: 'active', joinedAt: ago(2400) },
    { communityId: 'cm-local', profileId: 'author-volunteer', role: 'founder', status: 'active', joinedAt: ago(1800) },
    { communityId: 'cm-pro', profileId: me, role: 'founder', status: 'active', joinedAt: ago(1200) },
    { communityId: 'cm-pro', profileId: 'author-health', role: 'contributor', status: 'active', joinedAt: ago(900) },
    { communityId: 'cm-pro', profileId: 'author-org', role: 'member', status: 'pending', joinedAt: null, requestedAt: ago(40) }
  ];
  for (const m of membershipRows) {
    await members.put({
      id: `${m.communityId}::${m.profileId}`, history: [{ at: m.joinedAt || m.requestedAt || stamp, actorId: m.profileId, action: 'seeded' }],
      sample: true, ...m
    });
  }

  const postRows = [
    { communityId: 'cm-public', kind: 'discussion', title: 'Taa za barabara zimezimwa siku mbili', body: 'Barabara ya Kijichi-Kigamboni haina taa tangu Jumatatu. Tuelimishane kuhusu njia salama za usiku.', authorId: 'author-member', createdAt: ago(300), reactions: { helpful: ['author-volunteer'] }, commentCount: 1 },
    { communityId: 'cm-public', kind: 'help', title: 'Msaada wa usafiri kwa mzee', body: 'Mzee wetu anahitaji kufika kliniki Ijumaa asubuhi. Nani anaweza kusaidia usafiri?', authorId: 'author-volunteer', createdAt: ago(150), reactions: {}, commentCount: 0 },
    { communityId: 'cm-private', kind: 'announcement', title: 'Mkutano wa wazazi Jumamosi', body: 'Mkutano saa 4 asubuhi kwenye ukumbi wa shule. Mada: usafiri wa wanafunzi.', authorId: 'author-member', createdAt: ago(240), reactions: {}, commentCount: 0 },
    { communityId: 'cm-local', kind: 'resource', title: 'Ratiba ya mabomba ya wiki hii', body: 'Mabomba yatafungwa Jumatano saa 9 jioni hadi Alhamisi saa 6 asubuhi. Hifadhi maji kabla.', authorId: 'author-volunteer', createdAt: ago(600), reactions: { helpful: ['author-member'] }, commentCount: 0 },
    { communityId: 'cm-pro', kind: 'discussion', title: 'Jinsi ya kuzungumza na familia kuhusu chanjo', body: 'Tunashiriki mbinu za mazungumzo yenye heshima. Tafadhali toa vyanzo vya taarifa.', authorId: 'author-health', createdAt: ago(700), reactions: { helpful: [me] }, commentCount: 0 }
  ];
  for (const p of postRows) {
    await posts.put({ id: uid('cpost'), updatedAt: p.createdAt, hidden: false, pinned: false, sample: true, ...p });
  }

  await events.put({
    id: uid('evt'), communityId: 'cm-public', title: 'Mkutano wa usalama wa mtaa',
    about: 'Mkutano wa wazi kuhusu taa za barabara na doria za usiku.',
    startsAt: ahead(3), place: 'Kituo cha Kijichi', createdBy: 'author-volunteer',
    createdAt: ago(200), attendees: ['author-volunteer', me], remote: false, sample: true
  });

  /* ----------------------------------------------------------- support */
  const providerRows = [
    { id: 'prov-safety', name: 'Kikosi cha Usalama wa Jamii (mfano)', kind: 'institution', categories: ['personal_safety'], about: 'Ushauri wa usalama wa mtaa. Taasisi ya mfano.', profileId: 'author-safety' },
    { id: 'prov-health', name: 'Dkt. Neema Mushi (mfano)', kind: 'professional', categories: ['health', 'psychological'], about: 'Daktari wa familia. Leseni haijathibitishwa hapa.', profileId: 'author-health' },
    { id: 'prov-volunteer', name: 'Jumuiya ya Wajitolea Kijichi (mfano)', kind: 'community', categories: ['community', 'family_social'], about: 'Wajitolea wa msaada wa jamii.', profileId: 'author-volunteer' },
    { id: 'prov-legal', name: 'Kituo cha Msaada wa Kisheria (mfano)', kind: 'institution', categories: ['legal'], about: 'Msaada wa kisheria wa awali. Hakuna wakili aliyethibitishwa hapa.' },
    { id: 'prov-tech', name: 'GuardHai Technical Desk (mfano)', kind: 'individual', categories: ['technical'], about: 'Msaada wa matumizi ya app.' }
  ];
  for (const p of providerRows) {
    await providers.put({
      ...p, availability: 'haijulikani', contactPolicy: 'in-app',
      verification: { licence: {}, institution: {} }, sample: true, createdAt: ago(5000)
    });
  }

  await requests.put({
    id: uid('req'), requesterId: me, category: 'personal_safety',
    subject: 'Taa za barabara na usalama wa usiku',
    body: 'Tunahitaji ushauri kuhusu njia salama za kutembea usiku baada ya taa kuzimwa.',
    urgency: 'soon', providerId: 'prov-safety', status: 'submitted',
    routing: { attempted: 1, delivered: false, lastAttemptAt: ago(20), transport: null, reason: 'no-transport' },
    responses: [], timeline: [{ at: ago(25), actorId: me, action: 'created' }, { at: ago(20), actorId: me, action: 'route-failed', reason: 'no-transport' }],
    createdAt: ago(25), updatedAt: ago(20), closedAt: null, sample: true, emergency: false
  });

  for (const a of [
    { title: 'Mwaliko wa mlezi', body: 'Ofc. Baraka Mwakyusa anakualika kuwa mlezi wake (mfano).', kind: 'guardian', read: false },
    { title: 'Ombi la kujiunga', body: 'Kituo cha Afya Mwanzo linaomba kujiunga na jamii yako (mfano).', kind: 'community', read: false }
  ]) {
    await alerts.put({ id: uid('alert'), createdAt: ago(30), link: null, actorId: null, sample: true, ...a });
  }
}

/** removes only rows this file wrote */
export async function clearDemo() {
  const sweep = async (repo, predicate) => {
    for (const row of await repo.all()) if (predicate(row)) await repo.remove(row.id || row.key);
  };
  // a row belongs to the demo if it is marked, or if it is one of the fixed
  // reference rows (communities/providers) written by seedDemo()
  const isSample = (row) => row.sample === SEED_MARK
    || String(row.id || '').startsWith('cm-')
    || String(row.id || '').startsWith('prov-');
  await sweep(conv, isSample);
  await sweep(msgs, isSample);
  await sweep(guard, isSample);
  await sweep(communities, isSample);
  await sweep(members, isSample);
  await sweep(posts, isSample);
  await sweep(events, isSample);
  await sweep(providers, isSample);
  await sweep(requests, isSample);
  await sweep(alerts, isSample);
}
