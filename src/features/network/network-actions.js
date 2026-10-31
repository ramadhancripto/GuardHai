/**
 * GuardHai · features/network/network-actions.js
 * One dispatcher for every gesture in the network. Screens emit `data-act`
 * names; this file is the only place that talks to the services, so a workflow
 * cannot drift between two screens.
 *
 * Every handler returns `{ message, kind }`, `{ screen, params }` or nothing.
 * Nothing here invents a success: if the transport is missing, the message says so.
 */
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { L, esc, field, form, note } from './network-ui.js';
import { pendingAttachment } from './screens-chats.js';
import {
  openDirect, createGroup, sendMessage, updateConversation, markRead, blockUser, unblockUser,
  getConversation, searchMessages
} from '../../services/chat.service.js';
import { inviteGuardian, acceptInvitation, declineInvitation, cancelInvitation, revoke, setPermissions, get as getGuardianship } from '../../services/guardian.service.js';
import { createRequest, routeRequest, addNote, closeRequest, cancelRequest } from '../../services/support.service.js';
import {
  createCommunity, updateCommunity, joinCommunity, leaveCommunity, approveMember, rejectMember,
  setMemberRole, removeMember, createPost, commentOnPost, reactToPost, hidePost, createEvent,
  toggleAttendance, inviteToCommunity, listMembers, getCommunity
} from '../../services/community.service.js';
import { fileReport, fileAppeal, resolveReport, resolveAppeal, blockUser as _block } from '../../services/safety.service.js';
import { searchAll, setSettings, discoverPeople, lookupGuardHaiId } from '../../services/discover.service.js';
import { listProviders } from '../../services/support.service.js';
import { REPORT_REASONS, GUARDIAN_ROLES, GUARDIAN_ROLE_ORDER, GUARDIAN_PERMISSIONS, GUARDIAN_PERMISSION_KEYS, GUARDIAN_ROLE_DEFAULTS, COMMUNITY_ROLE_ORDER, COMMUNITY_ROLES, POST_KINDS } from '../../domain/network.js';

/* --------------------------------------------------------------- helpers */
const wrap = (fn) => async (payload, ctx) => {
  const result = await fn(payload, ctx);
  return result || {};
};

const ok = (message, kind = 'ok') => ({ message, kind });
const bad = (message) => ({ message, kind: 'danger' });

/** a sheet form: fields in, submit handler out, closes on success */
function sheetForm({ title, body, submit, onSubmit }) {
  openSheet(title, `<form id="ghNetSheetForm" class="gh-net-form" novalidate>
    ${body}
    <div class="gh-net-form-actions">
      <button type="button" class="gh-net-btn is-ghost" data-sheet-cancel>${L('Ghairi', 'Cancel')}</button>
      <button type="submit" class="gh-net-btn is-primary">${esc(submit)}</button>
    </div>
  </form>`);
  const node = document.getElementById('ghNetSheetForm');
  if (!node) return;
  node.querySelector('[data-sheet-cancel]')?.addEventListener('click', closeSheet);
  node.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = {};
    new FormData(node).forEach((v, k) => { data[k] = v; });
    node.querySelectorAll('input[type="checkbox"][name]').forEach((cb) => {
      if (!(cb.name in data)) data[cb.name] = false;
    });
    const result = await onSubmit(data);
    if (result?.message) {
      if (result.kind === 'danger' || result.ok === false) toast(result.message);
      else { closeSheet(); }
    } else {
      closeSheet();
    }
  });
}

/* ------------------------------------------------------------- recording */
let recorder = null;
let recChunks = [];

async function toggleVoiceNote(conversationId, ctx) {
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
    return null;
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
    return bad(L('Kifaa hiki hakiwezi kurekodi sauti.', 'This device cannot record audio.'));
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recChunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(recChunks, { type: recorder.mimeType || 'audio/webm' });
      recorder = null;
      const sizeKb = Math.round(blob.size / 1024);
      const result = await sendMessage(conversationId, {
        kind: 'voice',
        media: { id: `voice_${Date.now()}`, kind: 'voice', name: `urekodi-${sizeKb}kb.webm`, size: blob.size, type: blob.type }
      });
      ctx.state.notice = result.ok
        ? { kind: 'ok', message: L('Kumbukumbu ya sauti imehifadhiwa kwenye kifaa hiki.', 'The voice note is stored on this device.'), at: Date.now() }
        : { kind: 'danger', message: result.message, at: Date.now() };
      await ctx.paint();
    };
    recorder.start();
    return ok(L('Inarekodi… bonyeza tena kusimamisha.', 'Recording… press again to stop.'));
  } catch (err) {
    return bad(err?.name === 'NotAllowedError'
      ? L('Ruhusa ya maikrofoni imekataliwa.', 'Microphone permission was denied.')
      : L('Rekodi haikuanza.', 'Recording did not start.'));
  }
}

/* ---------------------------------------------------------------- actions */
const ACTIONS = {
  /* routing */
  partition: wrap(async (p) => ({ partition: p.key })),
  back: wrap(async (p, ctx) => { await ctx.back(); return { repaint: false }; }),
  retry: wrap(async () => ({ repaint: true })),
  'discover.go': wrap(async () => ({ partition: 'discover' })),

  /* chats */
  'chats.open': wrap(async (p, ctx) => {
    await markRead(p.id);
    return { screen: 'chats.thread', params: { id: p.id } };
  }),
  'chats.new': wrap(async () => ({ screen: 'chats.new', params: {} })),
  'chats.group': wrap(async () => ({ screen: 'chats.group', params: {} })),
  'chats.search': wrap(async () => ({ screen: 'chats.search', params: {} })),
  'chats.settings': wrap(async (p) => ({ screen: 'chats.settings', params: { id: p.id } })),
  'chats.archived': wrap(async (p, ctx) => { ctx.state.filter.archived = p.key === '1'; return {}; }),

  'chats.start': wrap(async (p) => {
    const result = await openDirect(p.id);
    if (!result.ok) return bad(result.reason === 'self' ? L('Huwezi kuanzisha mazungumzo na wewe mwenyewe.', 'You cannot message yourself.') : L('Mazungumzo hayakuanza.', 'The conversation did not start.'));
    return { screen: 'chats.thread', params: { id: result.conversation.id } };
  }),

  'chats.startById': wrap(async (p) => {
    const lookup = await lookupGuardHaiId(p.data?.guardhaiId);
    if (!lookup.ok) return bad(lookup.message);
    const result = await openDirect(lookup.person.id);
    return result.ok ? { screen: 'chats.thread', params: { id: result.conversation.id } } : bad(L('Mazungumzo hayakuanza.', 'The conversation did not start.'));
  }),

  'chats.createGroup': wrap(async (p) => {
    const memberIds = Object.keys(p.data || {}).filter((k) => k.startsWith('member:') && p.data[k]).map((k) => k.slice(7));
    const result = await createGroup({ title: p.data?.title, memberIds });
    if (!result.ok) return bad(result.message || L('Kikundi hakikuundwa.', 'The group was not created.'));
    return { screen: 'chats.thread', params: { id: result.conversation.id }, message: L('Kikundi kimeundwa.', 'Group created.'), kind: 'ok' };
  }),

  'chats.doSearch': wrap(async (p, ctx) => { ctx.state.filter.q = p.data?.q || ''; return {}; }),

  'chats.attach': wrap(async (p, ctx) => {
    const file = p.el?.files?.[0] || null;
    if (!file) return {};
    const limit = 8 * 1024 * 1024;
    if (file.size > limit) return bad(L('Faili ni kubwa mno (kiwango 8 MB).', 'File is too large (8 MB limit).'));
    pendingAttachment.value = { name: file.name, size: file.size, type: file.type, kind: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'voice' : 'document', id: `att_${Date.now()}` };
    return { message: L(`Kiambatisho ${file.name} kimechaguliwa.`, `Attachment ${file.name} selected.`), kind: 'info' };
  }),

  'chats.record': wrap(async (p, ctx) => toggleVoiceNote(p.id, ctx)),

  'chats.send': wrap(async (p, ctx) => {
    const text = p.data?.text || '';
    const media = pendingAttachment.value;
    if (!text.trim() && !media) return bad(L('Andika ujumbe au ambatisha faili.', 'Write a message or attach a file.'));
    const result = await sendMessage(ctx.state.params.id, { text, kind: media ? media.kind : 'text', media });
    if (!result.ok) return bad(result.message);
    pendingAttachment.value = null;
    return ok(result.delivered
      ? L('Ujumbe umetumwa.', 'Message sent.')
      : L('Ujumbe umehifadhiwa kwenye kifaa hiki. Hakuna seva iliyounganishwa — haujafika kwa mtu mwingine.', 'Message stored on this device. No server is connected — it did not reach anyone else.'),
      result.delivered ? 'ok' : 'warn');
  }),

  'chats.toggle': wrap(async (p) => {
    const key = p.key;
    const value = p.value === '1';
    const result = await updateConversation(p.id, { [key]: value });
    return result.ok ? { message: L('Imehifadhiwa.', 'Saved.'), kind: 'ok' } : bad(result.message);
  }),

  'chats.privacy': wrap(async (p) => {
    const result = await updateConversation(p.data.id, { privacy: p.data.privacy });
    return result.ok ? ok(L('Faragha imehifadhiwa.', 'Privacy saved.')) : bad(result.message);
  }),

  /* guardians */
  'guardian.home': wrap(async () => ({ screen: 'guardians.home', params: {} })),
  'guardian.invite': wrap(async () => ({ screen: 'guardians.invite', params: {} })),
  'guardian.inviteFor': wrap(async (p) => ({ screen: 'guardians.invite', params: { profileId: p.id } })),
  'guardian.open': wrap(async (p) => ({ screen: 'guardians.detail', params: { id: p.id } })),

  'guardian.send': wrap(async (p) => {
    const permissions = {};
    for (const key of GUARDIAN_PERMISSION_KEYS) permissions[key] = !!p.data?.[`perm:${key}`];
    const result = await inviteGuardian({ profileId: p.data?.profileId, role: p.data?.role, permissions, note: p.data?.note });
    if (!result.ok) return bad(result.message);
    return { screen: 'guardians.home', params: {}, message: result.message, kind: result.delivered ? 'ok' : 'warn' };
  }),

  'guardian.accept': wrap(async (p) => {
    const result = await acceptInvitation(p.id);
    return result.ok ? ok(L('Umekubali. Ruhusa zilizoonyeshwa tu ndizo umezitoa.', 'Accepted. Only the permissions shown were granted.')) : bad(result.message);
  }),

  'guardian.decline': wrap(async (p) => {
    const result = await declineInvitation(p.id);
    return result.ok ? ok(L('Umekataa mwaliko.', 'Invitation declined.')) : bad(result.message);
  }),

  'guardian.cancel': wrap(async (p) => {
    const result = await cancelInvitation(p.id);
    return result.ok ? ok(L('Mwaliko umeghairiwa.', 'Invitation cancelled.')) : bad(result.message);
  }),

  'guardian.revoke': wrap(async (p) => {
    const result = await revoke(p.id);
    return result.ok ? ok(L('Ruhusa zote zimeondolewa.', 'All permissions revoked.')) : bad(result.message);
  }),

  'guardian.permissions': wrap(async (p) => {
    const permissions = {};
    for (const key of GUARDIAN_PERMISSION_KEYS) permissions[key] = !!p.data?.[`perm:${key}`];
    const result = await setPermissions(p.data.id, permissions);
    return result.ok ? ok(L('Ruhusa zimehifadhiwa.', 'Permissions saved.')) : bad(result.message);
  }),

  /* support */
  'support.home': wrap(async () => ({ screen: 'support.home', params: {} })),
  'support.new': wrap(async (p, ctx) => {
    ctx.state.filter.cat = p.key || 'community';
    return { screen: 'support.new', params: { category: p.key || 'community' } };
  }),
  'support.newFor': wrap(async (p) => ({ screen: 'support.new', params: { category: 'community', providerId: p.id } })),
  'support.providers': wrap(async (p, ctx) => { ctx.state.filter.cat = p.key === 'all' ? null : (p.key || null); return { screen: 'support.providers', params: {} }; }),
  'support.filter': wrap(async (p, ctx) => { ctx.state.filter.cat = p.key === 'all' ? null : p.key; return {}; }),
  'support.open': wrap(async (p) => ({ screen: 'support.request', params: { id: p.id } })),
  'support.provider': wrap(async (p) => ({ screen: 'support.provider', params: { id: p.id } })),

  'support.create': wrap(async (p) => {
    const result = await createRequest({
      category: p.data?.category, subject: p.data?.subject, body: p.data?.body,
      urgency: p.data?.urgency, providerId: p.data?.providerId || null
    });
    if (!result.ok) return bad(result.message);
    return { screen: 'support.request', params: { id: result.request.id }, message: L('Ombi limehifadhiwa kwenye kifaa hiki.', 'Request stored on this device.'), kind: 'ok' };
  }),

  'support.route': wrap(async (p) => {
    const result = await routeRequest(p.id);
    if (!result.ok) return bad(result.message);
    return { message: result.message, kind: result.delivered ? 'ok' : 'warn' };
  }),

  'support.note': wrap(async (p) => {
    const result = await addNote(p.data?.id, p.data?.body);
    return result.ok ? ok(L('Maelezo yameongezwa.', 'Note added.')) : bad(result.message);
  }),

  'support.close': wrap(async (p) => {
    const result = await closeRequest(p.id);
    return result.ok ? ok(L('Ombi limefungwa.', 'Request closed.')) : bad(result.message);
  }),

  'support.cancel': wrap(async (p) => {
    const result = await cancelRequest(p.id);
    return result.ok ? ok(L('Ombi limeghairiwa.', 'Request cancelled.')) : bad(result.message);
  }),

  sos: wrap(async () => {
    closeSheet();
    if (window.GHSos?.trigger) window.GHSos.trigger();
    return { repaint: false };
  }),

  /* communities */
  'community.home': wrap(async () => ({ screen: 'communities.home', params: {} })),
  'community.new': wrap(async () => ({ screen: 'communities.new', params: {} })),
  'community.open': wrap(async (p) => ({ screen: 'communities.view', params: { id: p.id, tab: 'home' } })),
  'community.tab': wrap(async (p, ctx) => ({ screen: 'communities.view', params: { id: ctx.state.params.id, tab: p.key } })),
  'community.postView': wrap(async (p) => ({ screen: 'communities.postView', params: { id: p.id } })),

  'community.create': wrap(async (p) => {
    const tags = String(p.data?.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5);
    const result = await createCommunity({
      name: p.data?.name, type: p.data?.type, about: p.data?.about,
      rules: p.data?.rules, location: p.data?.location, tags
    });
    if (!result.ok) return bad(result.message);
    return { screen: 'communities.view', params: { id: result.community.id, tab: 'home' }, message: L('Jamii imeundwa. Wewe ni mwanzilishi.', 'Community created. You are the founder.'), kind: 'ok' };
  }),

  'community.join': wrap(async (p) => {
    const result = await joinCommunity(p.id);
    return result.ok ? { message: result.message, kind: result.needsApproval ? 'warn' : 'ok' } : bad(result.message);
  }),

  'community.accept': wrap(async (p) => {
    const result = await (await import('../../services/community.service.js')).acceptInvitation(p.id);
    return result.ok ? ok(L('Umejiunga na jamii.', 'You joined the community.')) : bad(result.message);
  }),

  'community.leave': wrap(async (p) => {
    const result = await leaveCommunity(p.id);
    return result.ok ? ok(L('Umeondoka kwenye jamii.', 'You left the community.')) : bad(result.message);
  }),

  'community.approve': wrap(async (p) => {
    const result = await approveMember(p.id, p.key);
    return result.ok ? ok(L('Mwanachama ameidhinishwa.', 'Member approved.')) : bad(result.message);
  }),

  'community.reject': wrap(async (p) => {
    const result = await rejectMember(p.id, p.key);
    return result.ok ? ok(L('Ombi limekataliwa.', 'Request rejected.')) : bad(result.message);
  }),

  'community.remove': wrap(async (p) => {
    const result = await removeMember(p.id, p.key);
    return result.ok ? ok(L('Mwanachama ameondolewa.', 'Member removed.')) : bad(result.message);
  }),

  'community.attend': wrap(async (p) => {
    const result = await toggleAttendance(p.id);
    return result.ok ? ok(L('Hudhurio limehifadhiwa.', 'Attendance saved.')) : bad(result.message);
  }),

  'community.react': wrap(async (p) => {
    const result = await reactToPost(p.id);
    return result.ok ? { repaint: true } : bad(result.message);
  }),

  'community.hide': wrap(async (p) => {
    const result = await hidePost(p.id);
    return result.ok ? ok(L('Umeamua kuhusu chapisho.', 'The post was moderated.')) : bad(result.message);
  }),

  'community.comment': wrap(async (p) => {
    const result = await commentOnPost(p.data?.postId, p.data?.body);
    return result.ok ? ok(L('Jibu limewekwa.', 'Reply posted.')) : bad(result.message);
  }),

  'community.moderation': wrap(async (p) => ({ screen: 'communities.moderation', params: { id: p.id } })),

  /* sheets for community workflows */
  'community.postPrompt': wrap(async (p, ctx) => {
    const id = p.id;
    const kind = p.kind || 'discussion';
    sheetForm({
      title: L('Chapisha', 'New post'),
      submit: L('Chapisha', 'Publish'),
      body: `
        ${field({ label: L('Aina', 'Kind'), name: 'kind', choices: Object.values(POST_KINDS).map((k) => ({ value: k.id, label: k.label })), value: kind })}
        ${field({ label: L('Kichwa', 'Title'), name: 'title', required: true })}
        ${field({ label: L('Maudhui', 'Body'), name: 'body', type: 'textarea', rows: 5, required: true })}
        ${note(L('Machapisho yanaonekana kwa wanachama wa jamii hii kwenye kifaa hiki.', 'Posts are visible to this community’s members on this device.'), 'info')}`,
      onSubmit: async (data) => {
        const result = await createPost(id, data);
        if (!result.ok) return { ok: false, kind: 'danger', message: result.message };
        await ctx.paint();
        return { ok: true };
      }
    });
    return { repaint: false };
  }),

  'community.eventPrompt': wrap(async (p, ctx) => {
    sheetForm({
      title: L('Tukio jipya', 'New event'),
      submit: L('Hifadhi tukio', 'Save event'),
      body: `
        ${field({ label: L('Jina', 'Title'), name: 'title', required: true })}
        ${field({ label: L('Tarehe na saa', 'Date and time'), name: 'startsAt', type: 'datetime-local', required: true })}
        ${field({ label: L('Mahali', 'Place'), name: 'place' })}
        ${field({ label: L('Maelezo', 'About'), name: 'about', type: 'textarea', rows: 3 })}`,
      onSubmit: async (data) => {
        const result = await createEvent(p.id, { ...data, startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : '' });
        if (!result.ok) return { ok: false, kind: 'danger', message: result.message };
        await ctx.paint();
        return { ok: true };
      }
    });
    return { repaint: false };
  }),

  'community.rolePrompt': wrap(async (p, ctx) => {
    const members = await listMembers(p.id);
    const target = members.find((m) => m.profileId === p.key);
    sheetForm({
      title: L('Badili jukumu', 'Change role'),
      submit: L('Hifadhi', 'Save'),
      body: `
        ${field({ label: L('Jukumu jipya', 'New role'), name: 'role', value: target?.role || 'member',
          choices: COMMUNITY_ROLE_ORDER.filter((r) => r !== 'founder').map((r) => ({ value: r, label: COMMUNITY_ROLES[r].label })) })}
        ${note(L('Jukumu huamua ruhusa. Uanachama na uthibitisho wa kitaalamu ni tofauti.', 'The role decides permissions. Membership and professional verification are separate.'), 'info')}`,
      onSubmit: async (data) => {
        const result = await setMemberRole(p.id, p.key, data.role);
        if (!result.ok) return { ok: false, kind: 'danger', message: result.message };
        await ctx.paint();
        return { ok: true };
      }
    });
    return { repaint: false };
  }),

  'community.invitePrompt': wrap(async (p, ctx) => {
    const people = await discoverPeople({});
    sheetForm({
      title: L('Alika kwenye jamii', 'Invite to community'),
      submit: L('Alika', 'Invite'),
      body: `
        ${field({ label: L('Mtu', 'Person'), name: 'profileId', required: true,
          choices: [{ value: '', label: L('Chagua…', 'Choose…') }].concat(people.map((x) => ({ value: x.id, label: x.name }))) })}
        ${note(L('Mwaliko unahifadhiwa kwenye kifaa hiki; hakuna seva ya kumfikishia mtu.', 'The invitation is stored on this device; there is no server to deliver it.'), 'warn')}`,
      onSubmit: async (data) => {
        const result = await inviteToCommunity(p.id, data.profileId);
        if (!result.ok) return { ok: false, kind: 'danger', message: result.message };
        await ctx.paint();
        toast(result.message);
        return { ok: true };
      }
    });
    return { repaint: false };
  }),

  /* discover */
  'discover.search': wrap(async (p, ctx) => { ctx.state.filter.q = p.data?.q || ''; return { screen: 'discover.home', params: {} }; }),
  'discover.role': wrap(async (p, ctx) => { ctx.state.filter.role = p.key === 'all' ? null : p.key; return {}; }),

  'discover.settings': wrap(async (p) => {
    const settings = {
      discoverable: !!p.data?.discoverable,
      showInProfessionalDirectory: !!p.data?.showInProfessionalDirectory,
      allowGuardianInvites: !!p.data?.allowGuardianInvites,
      allowCommunityInvites: !!p.data?.allowCommunityInvites,
      publicName: String(p.data?.publicName || '').slice(0, 60)
    };
    await setSettings(settings);
    return ok(settings.discoverable
      ? L('Faragha imehifadhiwa: unaonekana kwenye Discover.', 'Privacy saved: you are discoverable.')
      : L('Faragha imehifadhiwa: hauonekani kwenye Discover.', 'Privacy saved: you are not discoverable.'));
  }),

  /* safety */
  'safety.home': wrap(async () => ({ screen: 'safety.home', params: {} })),

  'safety.reportPrompt': wrap(async (p) => ({
    screen: 'safety.report',
    params: { subject: p.subject || 'user', target: p.target || p.id, communityId: p.communityId || null }
  })),

  'safety.appealPrompt': wrap(async () => ({ screen: 'safety.appeal', params: {} })),

  'safety.submitReport': wrap(async (p) => {
    const result = await fileReport({
      subjectType: p.data?.subjectType, subjectId: p.data?.subjectId, reason: p.data?.reason,
      detail: p.data?.detail, communityId: p.data?.communityId || null
    });
    if (!result.ok) return bad(result.message);
    return { screen: 'safety.home', params: {}, message: result.message, kind: 'ok' };
  }),

  'safety.submitAppeal': wrap(async (p) => {
    const result = await fileAppeal({ subjectType: p.data?.subjectType, subjectId: p.data?.subjectId || 'moderation', reason: p.data?.reason });
    if (!result.ok) return bad(result.message);
    return { screen: 'safety.home', params: {}, message: L('Rufaa imewasilishwa.', 'Appeal filed.'), kind: 'ok' };
  }),

  'safety.blockPrompt': wrap(async (p, ctx) => {
    sheetForm({
      title: L('Zuia mtu', 'Block someone'),
      submit: L('Zuia', 'Block'),
      body: `${note(L('Mawasiliano yote kati yenu yatasimama kwenye kifaa hiki mara moja.', 'All contact between you stops on this device immediately.'), 'warn')}
        ${field({ label: L('Sababu (si lazima)', 'Reason (optional)'), name: 'reason' })}`,
      onSubmit: async (data) => {
        const result = await blockUser(p.id, data.reason);
        if (!result.ok) return { ok: false, kind: 'danger', message: result.message };
        await ctx.paint();
        toast(L('Umemzuia.', 'Blocked.'));
        return { ok: true };
      }
    });
    return { repaint: false };
  }),

  'safety.unblock': wrap(async (p) => {
    const result = await unblockUser(p.id);
    return result.ok ? ok(L('Zuio limeondolewa.', 'Unblocked.')) : bad(result.message);
  }),

  'safety.decide': wrap(async (p) => {
    const result = await resolveReport(p.id, p.key);
    return result.ok ? ok(L('Uamuzi umehifadhiwa.', 'Decision saved.')) : bad(result.message);
  }),

  'safety.appealDecide': wrap(async (p) => {
    const result = await resolveAppeal(p.id, p.key, p.communityId || null);
    return result.ok ? ok(L('Uamuzi wa rufaa umehifadhiwa.', 'Appeal decision saved.')) : bad(result.message);
  })
};

/* --------------------------------------------------------------- dispatch */
export async function dispatch(act, payload = {}, ctx) {
  const handler = ACTIONS[act];
  if (!handler) return { message: L(`Kitendo “${act}” hakijulikani.`, `Unknown action “${act}”.`), kind: 'danger' };
  try {
    return await handler(payload, ctx);
  } catch (err) {
    console.error('[network] action failed', act, err);
    return { message: L('Kitendo hakikufanikiwa. Jaribu tena.', 'That action did not work. Try again.'), kind: 'danger' };
  }
}

export const ACTION_NAMES = Object.keys(ACTIONS);
export { ACTIONS, sheetForm };
