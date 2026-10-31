/**
 * GuardHai · services/chat.service.js
 * Conversations and messages, stored in IndexedDB on this device.
 *
 * Honesty rules this file enforces:
 *   • A message is only ever `saved` (on this device) or `queued` (waiting for a
 *     connection you do not have). There is no fake "delivered" tick.
 *   • `send()` asks the transport boundary first. With no adapter registered the
 *     message stays local and the caller is told `delivered: false`.
 *   • Read state is real only for messages a person actually opened here.
 *   • Blocking is checked on every send, both directions.
 */
import { createRepo, sortBy } from '../data/network.repo.js';
import { uid, nowIso } from '../core/id.js';
import { bus, EVENTS } from '../core/bus.js';
import { currentUser } from './session.service.js';
import { validateMessage, rateLimit, LIMITS } from '../domain/network.js';
import { send as transportSend, enqueue, transportStatus } from './transport.service.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('chat');

const convRepo = createRepo('conversations');
const msgRepo = createRepo('messages');
const blockRepo = createRepo('blocks');

export const selfId = () => currentUser().id;

/* ---------------------------------------------------------- conversations */
export async function listConversations({ includeArchived = false } = {}) {
  const me = selfId();
  const rows = (await convRepo.all()).filter((c) => (c.participantIds || []).includes(me));
  const out = [];
  for (const conv of rows) {
    if (conv.archived && !includeArchived) continue;
    const messages = await messagesOf(conv.id);
    const last = messages[messages.length - 1] || null;
    const unread = messages.filter((m) => m.authorId !== me && !(m.readBy || []).includes(me)).length;
    out.push({ ...conv, lastMessage: last, unread, messageCount: messages.length });
  }
  return out.sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    if (!!b.guardian !== !!a.guardian) return b.guardian ? 1 : -1;
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
}

export async function getConversation(id) {
  return convRepo.get(id);
}

/** a direct conversation is unique per pair — opening it twice must not clone it */
export async function openDirect(peerId) {
  const me = selfId();
  if (peerId === me) return { ok: false, reason: 'self' };
  const key = [me, peerId].sort().join('|');
  const existing = (await convRepo.all()).find((c) => c.directKey === key);
  if (existing) return { ok: true, conversation: existing, created: false };
  const now = nowIso();
  const conv = {
    id: uid('conv'),
    type: 'dm',
    directKey: key,
    participantIds: [me, peerId],
    title: '',
    createdAt: now,
    updatedAt: now,
    createdBy: me,
    pinned: false,
    archived: false,
    muted: false,
    guardian: false,
    privacy: 'standard',
    sample: false
  };
  await convRepo.put(conv);
  bus.emit(EVENTS.CONVERSATION_CHANGED, conv);
  return { ok: true, conversation: conv, created: true };
}

export async function createGroup({ title, memberIds = [], guardian = false }) {
  const me = selfId();
  const ids = [...new Set([me, ...memberIds])];
  if (ids.length < 3) return { ok: false, message: 'Kikundi kinahitaji watu wawili zaidi yako.' };
  if (ids.length > LIMITS.groupMaxMembers) return { ok: false, message: `Kikundi kinaruhusiwa watu ${LIMITS.groupMaxMembers}.` };
  const limit = rateLimit('message', `group:${me}`);
  if (!limit.ok) return { ok: false, message: limit.message };
  const now = nowIso();
  const conv = {
    id: uid('conv'),
    type: 'group',
    participantIds: ids,
    title: String(title || '').trim() || 'Kikundi kipya',
    createdAt: now,
    updatedAt: now,
    createdBy: me,
    pinned: false,
    archived: false,
    muted: false,
    guardian: !!guardian,
    privacy: 'standard',
    sample: false
  };
  await convRepo.put(conv);
  bus.emit(EVENTS.CONVERSATION_CHANGED, conv);
  return { ok: true, conversation: conv };
}

export async function updateConversation(id, patch) {
  const conv = await convRepo.get(id);
  if (!conv) return { ok: false, message: 'Mazungumzo hayapo.' };
  const allowed = ['pinned', 'archived', 'muted', 'privacy', 'title', 'guardian'];
  const clean = {};
  for (const key of allowed) if (key in patch) clean[key] = patch[key];
  const next = { ...conv, ...clean, updatedAt: nowIso() };
  await convRepo.put(next);
  bus.emit(EVENTS.CONVERSATION_CHANGED, next);
  return { ok: true, conversation: next };
}

export async function markRead(conversationId) {
  const me = selfId();
  const messages = await messagesOf(conversationId);
  let changed = 0;
  for (const m of messages) {
    if (m.authorId === me) continue;
    if ((m.readBy || []).includes(me)) continue;
    await msgRepo.put({ ...m, readBy: [...(m.readBy || []), me], readAt: nowIso() });
    changed++;
  }
  if (changed) bus.emit(EVENTS.CONVERSATION_CHANGED, { id: conversationId, read: changed });
  return changed;
}

/* --------------------------------------------------------------- messages */
export async function messagesOf(conversationId) {
  const rows = await msgRepo.where('conversationId', conversationId);
  return rows.sort(sortBy('createdAt', 'asc'));
}

export async function blockedBetween(a, b) {
  const mine = await blockRepo.where('byId', a);
  if (mine.some((r) => r.targetId === b)) return true;
  const theirs = await blockRepo.where('byId', b);
  return theirs.some((r) => r.targetId === a);
}

/**
 * Persist a message. Returns the honest delivery answer alongside the row.
 * @param {string} conversationId
 * @param {{text?: string, kind?: string, media?: object}} payload
 */
export async function sendMessage(conversationId, payload = {}) {
  const me = selfId();
  const conv = await convRepo.get(conversationId);
  if (!conv) return { ok: false, message: 'Mazungumzo hayapo.' };
  if (!(conv.participantIds || []).includes(me)) return { ok: false, message: 'Huna ruhusa ya kuandika hapa.' };

  const kind = payload.kind || 'text';
  const check = validateMessage(payload.text, kind);
  if (!check.ok) return { ok: false, message: check.message, field: check.field };

  const limit = rateLimit('message', me);
  if (!limit.ok) return { ok: false, message: limit.message };

  const peers = conv.participantIds.filter((id) => id !== me);
  for (const peer of peers) {
    if (await blockedBetween(me, peer)) {
      return { ok: false, message: 'Mawasiliano yamezuiwa na mmoja wa washiriki.' };
    }
  }

  const status = transportStatus();
  const now = nowIso();
  const message = {
    id: uid('msg'),
    conversationId,
    authorId: me,
    kind,
    text: check.value,
    media: payload.media || null,
    state: status.online ? 'saved' : 'queued',
    deliveredTo: [],
    readBy: [me],
    createdAt: now,
    sample: false,
    blocked: false
  };

  await msgRepo.put(message);
  await convRepo.put({ ...conv, updatedAt: now, lastMessage: { text: message.text, at: now, authorId: me, kind } });
  bus.emit(EVENTS.MESSAGE_SENT, message);

  // boundary: no adapter means nothing leaves this device, and we say so
  const delivery = await transportSend({ kind: 'message', conversationId, message });

  if (!delivery.ok) {
    if (!status.online) {
      await enqueue({ kind: 'message', conversationId, message });
      message.state = 'queued';
      await msgRepo.put(message);
    }
    return { ok: true, message, delivered: false, reason: delivery.reason, queued: message.state === 'queued' };
  }

  message.deliveredTo = peers;
  message.state = 'delivered';
  await msgRepo.put(message);
  return { ok: true, message, delivered: true };
}

export async function deleteMessage(id) {
  const me = selfId();
  const msg = await msgRepo.get(id);
  if (!msg) return { ok: false, message: 'Ujumbe haupo.' };
  if (msg.authorId !== me) return { ok: false, message: 'Unaweza kufuta ujumbe wako pekee.' };
  await msgRepo.remove(id);
  bus.emit(EVENTS.CONVERSATION_CHANGED, { id: msg.conversationId });
  return { ok: true };
}

/* ----------------------------------------------------------------- search */
export async function searchMessages(term) {
  const me = selfId();
  const needle = String(term || '').trim().toLowerCase();
  if (!needle) return [];
  const convs = (await convRepo.all()).filter((c) => (c.participantIds || []).includes(me));
  const ids = new Set(convs.map((c) => c.id));
  const all = await msgRepo.all();
  return all
    .filter((m) => ids.has(m.conversationId) && String(m.text || '').toLowerCase().includes(needle))
    .sort(sortBy('createdAt'))
    .slice(0, 40);
}

/* ---------------------------------------------------------------- blocking */
export async function blockUser(targetId, reason = '') {
  const me = selfId();
  if (targetId === me) return { ok: false, message: 'Hauwezi kujizuia wewe mwenyewe.' };
  const id = `blk:${me}:${targetId}`;
  await blockRepo.put({ id, byId: me, targetId, reason, createdAt: nowIso() });
  bus.emit(EVENTS.SAFETY_CHANGED, { blocked: targetId });
  return { ok: true };
}

export async function unblockUser(targetId) {
  const me = selfId();
  const id = `blk:${me}:${targetId}`;
  const row = await blockRepo.get(id);
  if (!row) return { ok: false, message: 'Hakuna zuio.' };
  await blockRepo.remove(id);
  bus.emit(EVENTS.SAFETY_CHANGED, { unblocked: targetId });
  return { ok: true };
}

export async function isBlocked(targetId) {
  const me = selfId();
  return !!(await blockRepo.get(`blk:${me}:${targetId}`));
}

export async function listBlocked() {
  return blockRepo.where('byId', selfId());
}

/* -------------------------------------------------------------- utilities */
export async function conversationStats() {
  const convs = await listConversations({ includeArchived: true });
  const unread = convs.reduce((n, c) => n + c.unread, 0);
  return {
    conversations: convs.length,
    unread,
    pinned: convs.filter((c) => c.pinned).length,
    archived: convs.filter((c) => c.archived).length,
    groups: convs.filter((c) => c.type === 'group').length,
    guardianFirst: convs.filter((c) => c.guardian).length
  };
}

export async function resetConversations() {
  for (const row of await msgRepo.all()) await msgRepo.remove(row.id);
  for (const row of await convRepo.all()) await convRepo.remove(row.id);
  for (const row of await blockRepo.all()) await blockRepo.remove(row.id);
  log.info('chat store cleared');
  bus.emit(EVENTS.CONVERSATION_CHANGED, { reset: true });
}
