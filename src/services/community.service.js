/**
 * GuardHai · services/community.service.js
 * Communities: four types, five roles, real approval and moderation workflows.
 *
 * Everything privileged goes through `canDo()`, which reads the caller's own
 * membership row. A role is stored on the membership, never on the profile —
 * so being a "professional contributor" here never edits anyone's verification.
 */
import { createRepo, sortBy } from '../data/network.repo.js';
import { uid, nowIso } from '../core/id.js';
import { bus, EVENTS } from '../core/bus.js';
import { currentUser } from './session.service.js';
import {
  COMMUNITY_TYPES, COMMUNITY_TYPE_ORDER, COMMUNITY_ROLES, COMMUNITY_ROLE_ORDER,
  COMMUNITY_PERMISSIONS, communityCan, MEMBERSHIP_STATUS, POST_KINDS,
  validateCommunity, validatePost, validateText, LIMITS, rateLimit
} from '../domain/network.js';
import { notify, audit } from './alerts.service.js';
import { send as transportSend } from './transport.service.js';

const communityRepo = createRepo('communities');
const memberRepo = createRepo('memberships');
const postRepo = createRepo('communityPosts');
const commentRepo = createRepo('communityComments');
const eventRepo = createRepo('communityEvents');
const selfId = () => currentUser().id;
const membershipKey = (communityId, profileId) => `${communityId}::${profileId}`;

/* ------------------------------------------------------------------- read */
export async function listCommunities({ type = null, query = '' } = {}) {
  const me = selfId();
  const rows = await communityRepo.all();
  const needle = String(query || '').trim().toLowerCase();
  const mine = new Map();
  for (const m of await memberRepo.where('profileId', me)) mine.set(m.communityId, m);

  const visible = [];
  for (const c of rows) {
    const membership = mine.get(c.id) || null;
    const joined = membership && ['active', 'pending', 'invited'].includes(membership.status);
    const isMember = membership && membership.status === 'active';
    // private + local content is only listed to members; public is always listed
    if (c.type !== 'public' && !joined && !c.listed) continue;
    if (needle && !`${c.name} ${c.about} ${(c.tags || []).join(' ')}`.toLowerCase().includes(needle)) continue;
    visible.push({ ...c, membership, role: membership?.role || null, isMember, memberCount: c.memberCount || 0 });
  }
  return visible.sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .filter((c) => (type ? c.type === type : true));
}

export async function getCommunity(id) {
  return communityRepo.get(id);
}

export async function myMembership(communityId) {
  return memberRepo.get(membershipKey(communityId, selfId()));
}

export async function myRoleIn(communityId) {
  const m = await myMembership(communityId);
  return m && m.status === 'active' ? m.role : null;
}

export async function canDo(communityId, permission) {
  const role = await myRoleIn(communityId);
  return role ? communityCan(role, permission) : false;
}

export async function listMembers(communityId) {
  const rows = await memberRepo.where('communityId', communityId);
  return rows.sort((a, b) =>
    (COMMUNITY_ROLES[b.role]?.rank ?? -1) - (COMMUNITY_ROLES[a.role]?.rank ?? -1)
    || String(a.joinedAt || '').localeCompare(String(b.joinedAt || '')));
}

/* ----------------------------------------------------------------- create */
export async function createCommunity(draft) {
  const me = selfId();
  const check = validateCommunity(draft);
  if (!check.ok) return { ok: false, message: check.message, field: check.field };

  const limit = rateLimit('community', me);
  if (!limit.ok) return { ok: false, message: limit.message };

  const now = nowIso();
  const community = {
    id: uid('com'),
    name: check.value.name,
    about: check.value.about,
    type: check.value.type,
    rules: String(draft.rules || '').slice(0, LIMITS.communityRulesMax),
    tags: (draft.tags || []).slice(0, 5),
    location: draft.type === 'local' ? String(draft.location || '').slice(0, 80) : '',
    listed: draft.type === 'public',
    memberCount: 1,
    postCount: 0,
    verifiedProfessional: false,
    createdBy: me,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    sample: false
  };
  await communityRepo.put(community);

  const membership = {
    id: membershipKey(community.id, me),
    communityId: community.id,
    profileId: me,
    role: 'founder',
    status: 'active',
    joinedAt: now,
    invitedBy: null,
    history: [{ at: now, actorId: me, action: 'founded' }]
  };
  await memberRepo.put(membership);
  await audit({ actorId: me, action: 'community.created', subjectType: 'community', subjectId: community.id,
    communityId: community.id, detail: community.name });
  bus.emit(EVENTS.COMMUNITY_CHANGED, community);
  return { ok: true, community, membership };
}

export async function updateCommunity(id, patch) {
  const me = selfId();
  const community = await communityRepo.get(id);
  if (!community) return { ok: false, message: 'Jamii haipo.' };
  if (!(await canDo(id, 'edit_community'))) return { ok: false, message: 'Huna ruhusa ya kuhariri jamii hii.' };

  const allowed = ['name', 'about', 'rules', 'tags', 'location', 'listed'];
  const clean = {};
  for (const key of allowed) if (key in patch) clean[key] = patch[key];
  if (clean.name) {
    const v = validateText(clean.name, { min: LIMITS.communityName.min, max: LIMITS.communityName.max, field: 'Jina' });
    if (!v.ok) return { ok: false, message: v.message };
    clean.name = v.value;
  }
  const next = { ...community, ...clean, updatedAt: nowIso() };
  await communityRepo.put(next);
  await audit({ actorId: me, action: 'community.updated', subjectType: 'community', subjectId: id,
    communityId: id, detail: Object.keys(clean).join(',') });
  bus.emit(EVENTS.COMMUNITY_CHANGED, next);
  return { ok: true, community: next };
}

export async function deleteCommunity(id) {
  const me = selfId();
  if (!(await canDo(id, 'delete_community'))) return { ok: false, message: 'Mwanzilishi pekee anaweza kufuta jamii.' };
  const community = await communityRepo.get(id);
  if (!community) return { ok: false, message: 'Jamii haipo.' };
  await communityRepo.put({ ...community, status: 'archived', archivedAt: nowIso() });
  await audit({ actorId: me, action: 'community.archived', subjectType: 'community', subjectId: id, communityId: id });
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id, archived: true });
  return { ok: true };
}

/* ------------------------------------------------------------- membership */
export async function joinCommunity(id) {
  const me = selfId();
  const community = await communityRepo.get(id);
  if (!community) return { ok: false, message: 'Jamii haipo.' };
  if (community.status !== 'active') return { ok: false, message: 'Jamii hii imefungwa.' };

  const existing = await myMembership(id);
  if (existing && ['active', 'pending'].includes(existing.status)) {
    return { ok: false, message: existing.status === 'active' ? 'Tayari u mwanachama.' : 'Ombi lako linasubiri idhini.' };
  }

  const now = nowIso();
  const needsApproval = COMMUNITY_TYPES[community.type]?.join === 'approval';
  const membership = {
    id: membershipKey(id, me),
    communityId: id,
    profileId: me,
    role: 'member',
    status: needsApproval ? 'pending' : 'active',
    joinedAt: needsApproval ? null : now,
    requestedAt: now,
    invitedBy: null,
    history: [{ at: now, actorId: me, action: needsApproval ? 'requested' : 'joined' }]
  };
  await memberRepo.put(membership);

  if (!needsApproval) {
    await bumpCount(id, +1);
    await audit({ actorId: me, action: 'community.joined', subjectType: 'community', subjectId: id, communityId: id });
  } else {
    await audit({ actorId: me, action: 'community.requested', subjectType: 'community', subjectId: id, communityId: id });
  }
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id, membership });
  return {
    ok: true,
    membership,
    needsApproval,
    message: needsApproval
      ? 'Ombi lako limehifadhiwa. Msimamizi wa jamii hii pekee anaweza kulidhinisha.'
      : 'Umejiunga na jamii.'
  };
}

export async function leaveCommunity(id) {
  const me = selfId();
  const membership = await myMembership(id);
  if (!membership || !['active', 'pending', 'invited'].includes(membership.status)) {
    return { ok: false, message: 'Hauko kwenye jamii hii.' };
  }
  if (membership.role === 'founder') {
    return { ok: false, message: 'Mwanzilishi hawezi kuondoka — hamisha umiliki au futa jamii.' };
  }
  const now = nowIso();
  await memberRepo.put({ ...membership, status: 'left', leftAt: now,
    history: [...(membership.history || []), { at: now, actorId: me, action: 'left' }] });
  if (membership.status === 'active') await bumpCount(id, -1);
  await audit({ actorId: me, action: 'community.left', subjectType: 'community', subjectId: id, communityId: id });
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id, left: true });
  return { ok: true };
}

export async function approveMember(communityId, profileId) {
  const me = selfId();
  if (!(await canDo(communityId, 'approve_members'))) return { ok: false, message: 'Huna ruhusa ya kuidhinisha wanachama.' };
  const key = membershipKey(communityId, profileId);
  const membership = await memberRepo.get(key);
  if (!membership) return { ok: false, message: 'Ombi halipo.' };
  if (!['pending', 'invited'].includes(membership.status)) return { ok: false, message: 'Hakuna ombi linalosubiri.' };

  const now = nowIso();
  const next = { ...membership, status: 'active', joinedAt: now, approvedBy: me,
    history: [...(membership.history || []), { at: now, actorId: me, action: 'approved' }] };
  await memberRepo.put(next);
  await bumpCount(communityId, +1);
  await audit({ actorId: me, action: 'community.approved', subjectType: 'membership', subjectId: key, communityId });
  await notify({ title: 'Mwanachama ameidhinishwa', body: 'Ombi la kujiunga limekubaliwa.', kind: 'community' });
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id: communityId, approved: profileId });
  return { ok: true, membership: next };
}

export async function rejectMember(communityId, profileId) {
  const me = selfId();
  if (!(await canDo(communityId, 'approve_members'))) return { ok: false, message: 'Huna ruhusa.' };
  const key = membershipKey(communityId, profileId);
  const membership = await memberRepo.get(key);
  if (!membership) return { ok: false, message: 'Ombi halipo.' };
  const now = nowIso();
  await memberRepo.put({ ...membership, status: 'rejected', decidedBy: me, decidedAt: now });
  await audit({ actorId: me, action: 'community.rejected', subjectType: 'membership', subjectId: key, communityId });
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id: communityId, rejected: profileId });
  return { ok: true };
}

export async function inviteToCommunity(communityId, profileId) {
  const me = selfId();
  if (!(await canDo(communityId, 'invite'))) return { ok: false, message: 'Huna ruhusa ya kualika.' };
  if (!profileId) return { ok: false, message: 'Chagua mtu.' };
  const key = membershipKey(communityId, profileId);
  const existing = await memberRepo.get(key);
  if (existing && ['active', 'pending', 'invited'].includes(existing.status)) {
    return { ok: false, message: 'Mtu huyu tayari yuko au amealikwa.' };
  }
  const now = nowIso();
  const membership = {
    id: key, communityId, profileId, role: 'member', status: 'invited',
    invitedBy: me, invitedAt: now, history: [{ at: now, actorId: me, action: 'invited' }]
  };
  await memberRepo.put(membership);
  const delivery = await transportSend({ kind: 'community-invitation', communityId, profileId });
  await audit({ actorId: me, action: 'community.invited', subjectType: 'membership', subjectId: key, communityId });
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id: communityId, invited: profileId });
  return {
    ok: true,
    delivered: delivery.ok,
    message: delivery.ok ? 'Mwaliko umetumwa.' : 'Mwaliko umehifadhiwa kwenye kifaa; hakuna seva ya kumfikishia mtu huyo.'
  };
}

export async function acceptInvitation(communityId) {
  const me = selfId();
  const membership = await myMembership(communityId);
  if (!membership || membership.status !== 'invited') return { ok: false, message: 'Hakuna mwaliko.' };
  const now = nowIso();
  await memberRepo.put({ ...membership, status: 'active', joinedAt: now,
    history: [...(membership.history || []), { at: now, actorId: me, action: 'accepted-invite' }] });
  await bumpCount(communityId, +1);
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id: communityId, joined: true });
  return { ok: true };
}

export async function setMemberRole(communityId, profileId, role) {
  const me = selfId();
  if (!(await canDo(communityId, 'assign_roles'))) return { ok: false, message: 'Huna ruhusa ya kubadili majukumu.' };
  if (!COMMUNITY_ROLES[role]) return { ok: false, message: 'Jukumu hilo halipo.' };
  if (role === 'founder') return { ok: false, message: 'Umiliki hubadilishwa kwa uhamisho maalum.' };

  const myRole = await myRoleIn(communityId);
  const key = membershipKey(communityId, profileId);
  const target = await memberRepo.get(key);
  if (!target) return { ok: false, message: 'Mwanachama hayupo.' };
  if (COMMUNITY_ROLES[target.role]?.rank >= COMMUNITY_ROLES[myRole]?.rank && target.profileId !== me) {
    return { ok: false, message: 'Hauwezi kubadili jukumu la mtu aliye juu yako.' };
  }
  if (COMMUNITY_ROLES[role].rank >= COMMUNITY_ROLES[myRole]?.rank) {
    return { ok: false, message: 'Hauwezi kutoa jukumu linalolingana na lako au kubwa zaidi.' };
  }
  const now = nowIso();
  await memberRepo.put({ ...target, role, updatedAt: now,
    history: [...(target.history || []), { at: now, actorId: me, action: 'role-changed', role }] });
  await audit({ actorId: me, action: 'community.role', subjectType: 'membership', subjectId: key, communityId, detail: role });
  await notify({ title: 'Jukumu limebadilishwa', body: `Sasa: ${COMMUNITY_ROLES[role].label}.`, kind: 'community' });
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id: communityId, role: { profileId, role } });
  return { ok: true };
}

export async function removeMember(communityId, profileId) {
  const me = selfId();
  if (!(await canDo(communityId, 'remove_member'))) return { ok: false, message: 'Huna ruhusa ya kuondoa wanachama.' };
  const key = membershipKey(communityId, profileId);
  const target = await memberRepo.get(key);
  if (!target) return { ok: false, message: 'Mwanachama hayupo.' };
  if (target.role === 'founder') return { ok: false, message: 'Mwanzilishi haondolewi.' };
  const myRole = await myRoleIn(communityId);
  if (COMMUNITY_ROLES[target.role]?.rank >= COMMUNITY_ROLES[myRole]?.rank) {
    return { ok: false, message: 'Hauwezi kuondoa mtu aliye na jukumu linalolingana na lako.' };
  }
  const now = nowIso();
  await memberRepo.put({ ...target, status: 'removed', removedBy: me, removedAt: now });
  if (target.status === 'active') await bumpCount(communityId, -1);
  await audit({ actorId: me, action: 'community.removed', subjectType: 'membership', subjectId: key, communityId });
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id: communityId, removed: profileId });
  return { ok: true };
}

/* -------------------------------------------------------------- content */
export async function listPosts(communityId, { kind = null } = {}) {
  const rows = await postRepo.where('communityId', communityId);
  return rows
    .filter((p) => (kind ? p.kind === kind : true))
    .filter((p) => !p.hidden)
    .sort(sortBy('createdAt'));
}

export async function getPost(id) {
  return postRepo.get(id);
}

export async function createPost(communityId, draft) {
  const me = selfId();
  if (!(await canDo(communityId, 'post'))) return { ok: false, message: 'Uanachama unaohitaji idhini unahitajika kuchapisha.' };
  const check = validatePost(draft);
  if (!check.ok) return { ok: false, message: check.message, field: check.field };

  const kind = POST_KINDS[draft.kind] ? draft.kind : 'discussion';
  if (kind === 'announcement' && !(await canDo(communityId, 'moderate_posts'))) {
    return { ok: false, message: 'Matangazo yanahitaji jukumu la msimamizi.' };
  }
  if (kind === 'resource' && !(await canDo(communityId, 'manage_resources'))) {
    return { ok: false, message: 'Maktaba inahitaji mchangiaji au juu yake.' };
  }

  const now = nowIso();
  const post = {
    id: uid('cpost'),
    communityId,
    kind,
    title: check.value.title,
    body: check.value.body,
    authorId: me,
    createdAt: now,
    updatedAt: now,
    reactions: {},
    commentCount: 0,
    hidden: false,
    pinned: false,
    sample: false
  };
  await postRepo.put(post);
  const community = await communityRepo.get(communityId);
  if (community) await communityRepo.put({ ...community, postCount: (community.postCount || 0) + 1 });
  await audit({ actorId: me, action: 'community.posted', subjectType: 'post', subjectId: post.id, communityId, detail: kind });
  bus.emit(EVENTS.COMMUNITY_CHANGED, post);
  return { ok: true, post };
}

export async function commentOnPost(postId, text) {
  const me = selfId();
  const post = await postRepo.get(postId);
  if (!post) return { ok: false, message: 'Chapisho halipo.' };
  if (!(await canDo(post.communityId, 'comment'))) return { ok: false, message: 'Hauna ruhusa ya kuchangia hapa.' };
  const check = validateText(text, { min: LIMITS.comment.min, max: LIMITS.comment.max, field: 'Maoni' });
  if (!check.ok) return { ok: false, message: check.message, field: check.field };
  const now = nowIso();
  const comment = { id: uid('ccom'), postId, communityId: post.communityId, authorId: me,
    body: check.value, createdAt: now, hidden: false };
  await commentRepo.put(comment);
  await postRepo.put({ ...post, commentCount: (post.commentCount || 0) + 1 });
  bus.emit(EVENTS.COMMUNITY_CHANGED, comment);
  return { ok: true, comment };
}

export async function listComments(postId) {
  return (await commentRepo.where('postId', postId)).filter((c) => !c.hidden).sort(sortBy('createdAt', 'asc'));
}

export async function reactToPost(postId, reaction = 'helpful') {
  const me = selfId();
  const post = await postRepo.get(postId);
  if (!post) return { ok: false, message: 'Chapisho halipo.' };
  if (!(await canDo(post.communityId, 'react'))) return { ok: false, message: 'Uanachama unahitajika.' };
  const bucket = new Set((post.reactions || {})[reaction] || []);
  if (bucket.has(me)) bucket.delete(me); else bucket.add(me);
  const reactions = { ...(post.reactions || {}), [reaction]: [...bucket] };
  await postRepo.put({ ...post, reactions });
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id: postId, reactions });
  return { ok: true, reactions };
}

export async function hidePost(postId, hidden = true) {
  const me = selfId();
  const post = await postRepo.get(postId);
  if (!post) return { ok: false, message: 'Chapisho halipo.' };
  if (!(await canDo(post.communityId, 'moderate_posts'))) return { ok: false, message: 'Huna ruhusa ya kusimamia.' };
  await postRepo.put({ ...post, hidden, moderatedBy: me, moderatedAt: nowIso() });
  await audit({ actorId: me, action: hidden ? 'post.hidden' : 'post.restored', subjectType: 'post',
    subjectId: postId, communityId: post.communityId });
  bus.emit(EVENTS.COMMUNITY_CHANGED, { id: postId, hidden });
  return { ok: true };
}

/* --------------------------------------------------------------- events */
export async function createEvent(communityId, draft) {
  const me = selfId();
  if (!(await canDo(communityId, 'manage_events'))) return { ok: false, message: 'Huna ruhusa ya kuunda tukio.' };
  const title = validateText(draft.title, { min: 3, max: 120, field: 'Jina la tukio' });
  if (!title.ok) return { ok: false, message: title.message };
  if (!draft.startsAt) return { ok: false, message: 'Chagua tarehe na saa.' };
  const event = { id: uid('evt'), communityId, title: title.value, about: String(draft.about || '').slice(0, 600),
    startsAt: draft.startsAt, place: String(draft.place || '').slice(0, 120), createdBy: me,
    createdAt: nowIso(), attendees: [me], remote: false };
  await eventRepo.put(event);
  await audit({ actorId: me, action: 'community.event', subjectType: 'event', subjectId: event.id, communityId });
  bus.emit(EVENTS.COMMUNITY_CHANGED, event);
  return { ok: true, event };
}

export async function listEvents(communityId) {
  return (await eventRepo.where('communityId', communityId)).sort(sortBy('startsAt', 'asc'));
}

export async function toggleAttendance(eventId) {
  const me = selfId();
  const event = await eventRepo.get(eventId);
  if (!event) return { ok: false, message: 'Tukio halipo.' };
  const attendees = new Set(event.attendees || []);
  if (attendees.has(me)) attendees.delete(me); else attendees.add(me);
  const next = { ...event, attendees: [...attendees] };
  await eventRepo.put(next);
  bus.emit(EVENTS.COMMUNITY_CHANGED, next);
  return { ok: true, event: next };
}

/* -------------------------------------------------------------- utilities */
async function bumpCount(communityId, delta) {
  const community = await communityRepo.get(communityId);
  if (!community) return;
  await communityRepo.put({ ...community, memberCount: Math.max(0, (community.memberCount || 0) + delta) });
}

export async function communityStats() {
  const me = selfId();
  const memberships = (await memberRepo.where('profileId', me)).filter((m) => m.status === 'active');
  const all = await communityRepo.all();
  return {
    total: all.length,
    mine: memberships.length,
    founded: memberships.filter((m) => m.role === 'founder').length,
    moderating: memberships.filter((m) => ['founder', 'admin', 'moderator'].includes(m.role)).length,
    pendingApprovals: (await memberRepo.all()).filter((m) => m.status === 'pending').length
  };
}

export async function pendingMembers(communityId) {
  const rows = await memberRepo.where('communityId', communityId);
  return rows.filter((m) => m.status === 'pending');
}

export const typeOf = (id) => COMMUNITY_TYPES[id] || COMMUNITY_TYPES.public;
export const roleOf = (id) => COMMUNITY_ROLES[id] || COMMUNITY_ROLES.member;
export const membershipStatusOf = (id) => MEMBERSHIP_STATUS[id] || MEMBERSHIP_STATUS.pending;
export const kindOf = (id) => POST_KINDS[id] || POST_KINDS.discussion;

export async function communityActivity(communityId, limit = 20) {
  const { listAudit } = await import('./alerts.service.js');
  return listAudit({ communityId, limit });
}

export async function resetCommunities() {
  for (const [repo] of [[communityRepo], [memberRepo], [postRepo], [commentRepo], [eventRepo]]) {
    for (const row of await repo.all()) await repo.remove(row.id);
  }
  bus.emit(EVENTS.COMMUNITY_CHANGED, { reset: true });
}
