/**
 * GuardHai · features/network/screens-chats.js
 * Chats partition: conversation list, thread, new chat, new group, search and
 * per-conversation privacy.
 *
 * Delivery truth: a message is `saved` on this device or `queued` waiting for a
 * connection you do not have. The thread says so on every screen — there is no
 * fake "delivered to phone" tick, and read state is only shown when a real
 * participant read the message here.
 */
import {
  L, esc, icon, card, row, chip, empty, btn, linkBtn, note, banner, field, checkbox,
  form, avatar, person, timeAgo, fmtTime, toolbar, person as _p
} from './network-ui.js';
import { listConversations, messagesOf, getConversation, searchMessages } from '../../services/chat.service.js';
import { listBlocked as listBlocks } from '../../services/chat.service.js';
import { listProviders } from '../../services/support.service.js';
import { transportStatus, queuedCount } from '../../services/transport.service.js';

const STATE_COPY = {
  queued: L('Inasubiri muunganisho', 'Waiting for a connection'),
  saved: L('Kwenye kifaa hiki', 'Stored on this device'),
  delivered: L('Imefikishwa', 'Delivered'),
  failed: L('Haikutumwa', 'Not sent')
};

export const pendingAttachment = { value: null };

const convTitle = (conv, profiles, me) => {
  if (conv.type === 'group') return conv.title || L('Kikundi', 'Group');
  const other = (conv.participantIds || []).find((id) => id !== me.id) || 'unknown';
  return person(profiles, other).name;
};

const convPeer = (conv, me) => (conv.participantIds || []).find((id) => id !== me.id) || 'unknown';

/** Today → the clock ("13:49"); anything older → "12/5". Compact, unambiguous. */
const clockOf = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  return d.toDateString() === now.toDateString() ? fmtTime(iso) : `${d.getDate()}/${d.getMonth() + 1}`;
};

function stateChip(message, me) {
  if (message.authorId !== me.id) {
    return (message.readBy || []).includes(me.id) ? '' : chip(L('Mpya', 'New'), 'info');
  }
  if (message.state === 'queued') return chip(STATE_COPY.queued, 'warn');
  if (message.state === 'delivered') return chip(STATE_COPY.delivered, 'ok');
  return chip(STATE_COPY.saved, 'muted');
}

/* ------------------------------------------------------------------- home */
async function home({ state, profiles, me }) {
  const archived = state.filter.archived === true;
  const all = await listConversations({ includeArchived: true });
  const visible = all.filter((c) => (archived ? c.archived : !c.archived));
  const pinned = visible.filter((c) => c.pinned);
  const rest = visible.filter((c) => !c.pinned);
  const unread = all.reduce((n, c) => n + c.unread, 0);
  const status = transportStatus();
  const queued = await queuedCount();
  const archivedCount = all.filter((c) => c.archived).length;

  // One row = avatar · name (+honesty tags) · one-line preview · time · unread.
  // The preview never borrows the right slot, so it is never cut mid-word.
  const rowFor = (conv) => {
    const peer = convPeer(conv, me);
    const who = conv.type === 'group'
      ? { name: conv.title || L('Kikundi', 'Group'), initials: 'GH', photo: '' }
      : person(profiles, peer);
    // Honesty tags sit on the preview line, so the name keeps its full width.
    const tags = [
      conv.guardian ? `<span class="gh-net-rowflag" role="img" aria-label="${esc(L('Kipaumbele cha mlezi', 'Guardian priority'))}" title="${esc(L('Kipaumbele cha mlezi', 'Guardian priority'))}">${icon('i-shield')}</span>` : '',
      conv.sample ? chip(L('Sampuli', 'Sample'), 'neutral') : ''
    ].join('');
    const last = conv.lastMessage;
    const preview = last
      ? esc(String(last.text || '').slice(0, 80))
      : L('Hakuna ujumbe bado', 'No messages yet');
    // A chat list shows the clock for today and a date for older messages —
    // "dakika 18 zilizopita" steals the width the name needs.
    const when = last ? clockOf(last.createdAt || last.at) : '';
    return `<button type="button" class="gh-net-row is-chat" data-nx="act" data-act="chats.open" data-id="${esc(conv.id)}">
      ${avatar(who, { size: conv.type === 'group' ? 'is-group' : '' })}
      <span class="gh-net-rowcopy">
        <span class="gh-net-rowname"><b>${esc(convTitle(conv, profiles, me))}</b>${when ? `<time class="gh-net-rowtime">${esc(when)}</time>` : ''}</span>
        <span class="gh-net-rowmeta"><small>${preview}</small>${tags}</span>
      </span>
      <span class="gh-net-rowright">
        ${conv.unread ? `<em class="gh-net-unread">${conv.unread}</em>` : (conv.pinned ? icon('i-bookmark', 'is-muted') : '')}
      </span>
    </button>`;
  };

  const body = `
    <p class="gh-net-line is-${status.connected ? 'ok' : 'muted'}">
      ${icon(status.connected ? 'i-wifi' : 'i-cloud')}
      <span>${status.connected
        ? L('Seva imeunganishwa — ujumbe unaweza kufika kwa mtu mwingine.', 'A server is connected — messages can reach someone else.')
        : L('Hakuna seva — ujumbe unabaki kwenye kifaa.', 'No server — messages stay on this device.')}</span>
    </p>
    ${queued ? note(L(`Ujumbe ${queued} unasubiri muunganisho.`, `${queued} message(s) waiting for a connection.`), 'warn') : ''}

    <div class="gh-net-actions">
      ${btn(L('Mazungumzo mapya', 'New chat'), { act: 'chats.new', tone: 'primary', iconId: 'i-plus' })}
      ${btn(L('Kikundi', 'Group'), { act: 'chats.group', iconId: 'i-users', compact: true })}
      ${btn(L('Tafuta', 'Search'), { act: 'chats.search', iconId: 'i-search', compact: true })}
      <button type="button" class="gh-net-btn is-compact${archived ? ' is-on' : ''}" data-nx="act" data-act="chats.archived" data-key="${archived ? '0' : '1'}"
              aria-label="${esc(archived ? L('Rudi kwenye mazungumzo', 'Back to chats') : L(`Zilizohifadhiwa (${archivedCount})`, `Archived (${archivedCount})`))}"
              title="${esc(L(`Zilizohifadhiwa (${archivedCount})`, `Archived (${archivedCount})`))}">
        ${icon('i-bookmark')}${archivedCount ? `<span class="gh-net-btncount">${archivedCount}</span>` : ''}
      </button>
    </div>

    ${visible.length === 0
      ? empty({
          iconId: 'i-message',
          title: archived ? L('Hakuna mazungumzo yaliyohifadhiwa', 'No archived chats') : L('Hakuna mazungumzo bado', 'No conversations yet'),
          body: L('Anza mazungumzo na mtu unayemfahamu, au unda kikundi.', 'Start a conversation with someone you know, or create a group.'),
          action: btn(L('Anza mazungumzo', 'Start a chat'), { act: 'chats.new', tone: 'primary', iconId: 'i-plus' })
        })
      : card([
          pinned.length ? `<p class="gh-net-listlabel">${icon('i-bookmark')}${L('Zilizobandikwa', 'Pinned')}</p>${pinned.map(rowFor).join('')}` : '',
          rest.length ? `${pinned.length ? `<p class="gh-net-listlabel">${L('Zote', 'All')}</p>` : ''}${rest.map(rowFor).join('')}` : ''
        ].join(''), { padded: false, cls: 'is-list is-chatlist' })}

    ${note(L('Chat si SOS — ujumbe hauanzishi dharura.', 'Chat is not SOS — a message never triggers an emergency.'))}
  `;

  return {
    title: L('Mazungumzo', 'Chats'),
    subtitle: unread ? L(`${unread} ujumbe mpya`, `${unread} new messages`) : L('Watu na vikundi', 'People and groups'),
    body
  };
}

/* ----------------------------------------------------------------- thread */
async function thread({ state, profiles, me }) {
  const conv = await getConversation(state.params.id);
  if (!conv) {
    return {
      title: L('Mazungumzo', 'Chats'),
      body: empty({ iconId: 'i-alert-circle', title: L('Mazungumzo hayapo', 'Conversation not found'),
        action: btn(L('Rudi', 'Back'), { act: 'back', tone: 'primary' }) })
    };
  }
  const messages = await messagesOf(conv.id);
  const peers = (conv.participantIds || []).filter((id) => id !== me.id);
  const title = convTitle(conv, profiles, me);
  const status = transportStatus();
  const peerNames = peers.map((id) => person(profiles, id).name).join(' · ');
  const isGroup = conv.type === 'group';

  const lastId = messages.length ? messages[messages.length - 1].id : null;

  // Messages from one author inside a short window read as one block: the name
  // and the avatar appear once, not on every bubble.
  const blocks = [];
  for (const m of messages) {
    const at = Date.parse(m.createdAt) || 0;
    const prev = blocks[blocks.length - 1];
    const sameAuthor = prev && prev.authorId === m.authorId && Math.abs(at - prev.lastAt) < 10 * 60 * 1000;
    if (sameAuthor) { prev.items.push(m); prev.lastAt = at; }
    else blocks.push({ authorId: m.authorId, items: [m], lastAt: at });
  }

  const bubble = (m) => {
    const mine = m.authorId === me.id;
    const media = m.media
      ? `<span class="gh-net-attach">${icon(m.media.kind === 'image' ? 'i-image-plus' : m.media.kind === 'voice' ? 'i-mic' : 'i-folder')}
          <b>${esc(m.media.name || L('Kiambatisho', 'Attachment'))}</b>
          <small>${esc(m.media.kind)}${m.media.size ? ` · ${Math.round(m.media.size / 1024)} KB` : ''}</small></span>`
      : '';
    return `<div class="gh-net-msg${mine ? ' is-mine' : ''}">
      <div class="gh-net-bubble">${media}${m.text ? `<p>${esc(m.text)}</p>` : ''}</div>
      <span class="gh-net-msgmeta">${fmtTime(m.createdAt)} ${m.id === lastId ? stateChip(m, me) : ''}</span>
    </div>`;
  };

  const blockHtml = blocks.map((b) => {
    const mine = b.authorId === me.id;
    const who = person(profiles, b.authorId);
    return `<div class="gh-net-msgblock${mine ? ' is-mine' : ''}">
      ${mine ? '' : avatar(who, { size: 'is-sm' })}
      <div class="gh-net-msgstack">
        ${(!mine && isGroup) || (!mine && blocks.length > 1 && b !== blocks[0]) ? `<span class="gh-net-msgwho">${esc(who.name)}</span>` : ''}
        ${b.items.map(bubble).join('')}
      </div>
    </div>`;
  }).join('');

  const body = `
    ${status.connected ? '' : `<p class="gh-net-line is-muted">${icon('i-cloud')}<span>${L('Hakuna seva — ujumbe unabaki kwenye kifaa.', 'No server — messages stay on this device.')}</span></p>`}

    <div class="gh-net-tagrow is-compact">
      ${conv.guardian ? chip(L('Mlezi', 'Guardian'), 'ok') : ''}
      ${conv.pinned ? chip(L('Imebandikwa', 'Pinned'), 'info') : ''}
      ${conv.muted ? chip(L('Imenyamazishwa', 'Muted'), 'muted') : ''}
      ${chip(conv.privacy === 'private' ? L('Faragha: imefungwa', 'Privacy: locked') : L('Faragha: kawaida', 'Privacy: standard'), 'neutral')}
      ${conv.sample ? chip(L('Sampuli', 'Sample'), 'neutral') : ''}
    </div>

    <div class="gh-net-thread is-chat" role="log" aria-label="${L('Ujumbe', 'Messages')}">
      ${messages.length ? blockHtml : empty({ iconId: 'i-message', title: L('Hakuna ujumbe bado', 'No messages yet'), body: L('Andika ujumbe wa kwanza hapa chini.', 'Write the first message below.') })}
    </div>

    <div class="gh-net-composer">
      ${form('chats.send', `
        ${field({ label: L('Ujumbe', 'Message'), name: 'text', type: 'textarea', rows: 1, placeholder: L('Andika ujumbe…', 'Write a message…') })}
        <div class="gh-net-composerrow">
          <label class="gh-net-filebtn">
            ${icon('i-folder')}<span class="gh-sr">${L('Kiambatisho', 'Attach')}</span>
            <input type="file" name="attachment" accept="image/*,video/*,audio/*,.pdf,.txt,.csv,.doc,.docx" hidden>
          </label>
          ${btn(L('Sauti', 'Voice'), { act: 'chats.record', id: conv.id, iconId: 'i-mic', compact: true })}
          ${pendingAttachment.value ? `<span class="gh-net-pending">${icon('i-check')}${esc(pendingAttachment.value.name)}</span>` : ''}
        </div>
        ${note(L('Faili hubaki kwenye kifaa hiki; hakuna upload.', 'Files stay on this device; nothing is uploaded.'), 'info')}
      `, { submit: L('Tuma', 'Send'), submitIcon: 'i-send' })}
    </div>

    ${isGroup ? `<p class="gh-net-footnote">${L('Washiriki', 'Participants')}: ${esc(peerNames)}</p>` : ''}
  `;

  return {
    title,
    subtitle: isGroup ? L(`Kikundi · ${peers.length + 1} watu`, `Group · ${peers.length + 1} people`) : L('Mazungumzo ya faragha', 'Direct chat'),
    actions: linkBtn(L('Mipangilio', 'Settings'), { act: 'chats.settings', id: conv.id, iconId: 'i-settings' }),
    body
  };
}

/* --------------------------------------------------------------- new chat */
async function newChat({ profiles }) {
  const people = Object.values(profiles).filter((p) => p.id !== 'me' && !p.isSelf);
  const blocked = await listBlocks();
  const blockedIds = new Set(blocked.map((b) => b.targetId));

  const body = `
    ${note(L('Hakuna orodha ya watu iliyounganishwa. Hapa unaona wasifu ulio kwenye kifaa hiki pekee (sampuli na akaunti za kifaa).', 'No people directory is connected. You only see profiles stored on this device (samples and device accounts).'))}
    ${people.length === 0
      ? empty({ iconId: 'i-user', title: L('Hakuna watu', 'Nobody available'), body: L('Weka sampuli kwanza, au wasifu wa mtu utaonekana hapa ukiwepo.', 'Load samples first, or profiles will appear here when present.') })
      : card(people.map((p) => row({
          title: p.name,
          meta: `${p.primaryRole || 'member'}${p.sample ? ' · ' + L('Sampuli', 'Sample') : ''}${blockedIds.has(p.id) ? ' · ' + L('Umezuiwa', 'Blocked') : ''}`,
          avatarHtml: avatar(person(profiles, p.id)),
          act: blockedIds.has(p.id) ? '' : 'chats.start',
          id: p.id,
          right: blockedIds.has(p.id) ? chip(L('Umezuiwa', 'Blocked'), 'danger') : icon('i-chevron-right')
        })).join(''), { padded: false, cls: 'is-list' })}
    ${form('chats.startById', `
      ${field({ label: L('Au kwa Kitambulisho cha GuardHai', 'Or by GuardHai ID'), name: 'guardhaiId', placeholder: 'gh-…',
        hint: L('Utafutaji wa Kitambulisho unahitaji seva; utapata ujumbe wa wazi kama haipo.', 'ID lookup needs a server; you will get a clear message if it is unavailable.') })}
    `, { submit: L('Tafuta', 'Look up'), submitIcon: 'i-search' })}
  `;
  return { title: L('Mazungumzo mapya', 'New chat'), subtitle: L('Chagua mtu', 'Choose someone'), body };
}

/* -------------------------------------------------------------- new group */
async function newGroup({ profiles }) {
  const people = Object.values(profiles).filter((p) => p.id !== 'me' && !p.isSelf);
  const body = `
    ${form('chats.createGroup', `
      ${field({ label: L('Jina la kikundi', 'Group name'), name: 'title', required: true, placeholder: L('mf. Wajitolea Kijichi', 'e.g. Kijichi volunteers') })}
      ${field({ label: L('Maelezo (si lazima)', 'Purpose (optional)'), name: 'about', type: 'textarea', rows: 2 })}
      <fieldset class="gh-net-checkset">
        <legend>${L('Washiriki', 'Participants')}</legend>
        ${people.length ? people.map((p) => checkbox({ label: p.name, name: `member:${p.id}`, hint: p.sample ? L('Sampuli', 'Sample') : '' })).join('')
          : `<p class="gh-net-note is-warn">${L('Hakuna wasifu mwingine kwenye kifaa hiki.', 'No other profile exists on this device.')}</p>`}
      </fieldset>
      ${note(L('Kikundi hiki kitakuwa kwenye kifaa hiki pekee. Watu wengine hawataona ujumbe hadi seva iunganishwe.', 'This group exists on this device only. Other people will not see its messages until a server is connected.'), 'warn')}
    `, { submit: L('Unda kikundi', 'Create group'), submitIcon: 'i-users', cancel: { label: L('Ghairi', 'Cancel'), act: 'back' } })}
  `;
  return { title: L('Kikundi kipya', 'New group'), subtitle: L('Kikundi cha mazungumzo', 'Group conversation'), body };
}

/* ----------------------------------------------------------------- search */
async function search({ state }) {
  const term = state.filter.q || '';
  const results = term ? await searchMessages(term) : [];
  const body = `
    ${form('chats.doSearch', `
      ${field({ label: L('Tafuta ujumbe', 'Search messages'), name: 'q', type: 'search', value: term,
        hint: L('Utafutaji unafanyika kwenye mazungumzo ya kifaa hiki pekee.', 'Only this device’s conversations are searched.') })}
    `, { submit: L('Tafuta', 'Search'), submitIcon: 'i-search' })}
    ${term
      ? (results.length
        ? card(results.map((m) => row({
            title: String(m.text).slice(0, 70),
            meta: `${fmtTime(m.createdAt)} · ${m.authorId === 'me' ? L('Wewe', 'You') : esc(m.authorId)}`,
            act: 'chats.open', id: m.conversationId, right: icon('i-chevron-right')
          })).join(''), { padded: false, cls: 'is-list' })
        : empty({ iconId: 'i-search', title: L('Hakuna matokeo', 'No results'), body: L(`Hakuna ujumbe wenye "${term}".`, `No message contains "${term}".`) }))
      : ''}
  `;
  return { title: L('Tafuta mazungumzo', 'Search chats'), subtitle: term ? `${results.length} ${L('matokeo', 'results')}` : '', body };
}

/* --------------------------------------------------------------- settings */
async function settings({ state, profiles, me }) {
  const conv = await getConversation(state.params.id);
  if (!conv) return { title: L('Mazungumzo', 'Chats'), body: empty({ iconId: 'i-alert-circle', title: L('Hayapo', 'Not found') }) };
  const peer = convPeer(conv, me);
  const peerName = person(profiles, peer).name;

  const body = `
    ${card(`
      <div class="gh-net-convohead">
        <div class="gh-net-convohead-copy"><b>${esc(convTitle(conv, profiles, me))}</b><span>${L('Mazungumzo', 'Conversation')}</span></div>
      </div>
      <div class="gh-net-settingrow">${L('Bandika juu', 'Pin to top')}${switchBtn(conv.pinned, 'chats.toggle', conv.id, 'pinned')}</div>
      <div class="gh-net-settingrow">${L('Nyamazisha', 'Mute')}${switchBtn(conv.muted, 'chats.toggle', conv.id, 'muted')}</div>
      <div class="gh-net-settingrow">${L('Hifadhi (archive)', 'Archive')}${switchBtn(conv.archived, 'chats.toggle', conv.id, 'archived')}</div>
    `)}

    ${card(`
      <h3 class="gh-net-h3">${L('Faragha', 'Privacy')}</h3>
      <p class="gh-net-p">${L('Faragha inadhibiti nani anaweza kuona mazungumzo haya kwenye kifaa hiki. Hakuna usimbaji fiche wa mwisho-hadi-mwisho uliojengwa — hatudai hivyo.', 'Privacy controls who can see this chat on this device. End-to-end encryption is not implemented, and we do not claim it.')}</p>
      ${form('chats.privacy', `
        ${field({ label: L('Kiwango', 'Level'), name: 'privacy', choices: [
          { value: 'standard', label: L('Kawaida', 'Standard') },
          { value: 'guardian', label: L('Kipaumbele cha mlezi', 'Guardian priority') },
          { value: 'private', label: L('Imefungwa (faragha)', 'Locked (private)') }
        ], value: conv.privacy })}
        <input type="hidden" name="id" value="${esc(conv.id)}">
      `, { submit: L('Hifadhi faragha', 'Save privacy') })}
    `)}

    ${card(`
      <h3 class="gh-net-h3">${L('Usalama', 'Safety')}</h3>
      <div class="gh-net-btnrow">
        ${btn(L(`Zuia ${peerName}`, `Block ${peerName}`), { act: 'safety.blockPrompt', id: peer, tone: 'outline', iconId: 'i-x' })}
        ${btn(L('Ripoti mazungumzo', 'Report this chat'), { act: 'safety.reportPrompt', id: conv.id, tone: 'outline', iconId: 'i-flag', extra: `data-subject="user" data-target="${esc(peer)}"` })}
      </div>
      ${note(L('Kuzuia kunazuia ujumbe wote kati yenu kwenye kifaa hiki mara moja.', 'Blocking stops every message between you on this device immediately.'), 'warn')}
    `)}
  `;
  return { title: L('Mipangilio ya mazungumzo', 'Chat settings'), subtitle: esc(peerName), body, back: 'chats.home' };
}

function switchBtn(on, act, id, key) {
  return `<button type="button" class="gh-net-switch${on ? ' is-on' : ''}" role="switch" aria-checked="${on ? 'true' : 'false'}"
    data-nx="act" data-act="${esc(act)}" data-id="${esc(id)}" data-key="${esc(key)}" data-value="${on ? '0' : '1'}" aria-label="${esc(key)}">
    <span></span></button>`;
}

[home, thread, newChat, newGroup, search, settings].forEach((fn) => { fn.partition = 'chats'; });
thread.back = 'chats.home';
newChat.back = 'chats.home';
newGroup.back = 'chats.home';
search.back = 'chats.home';

export const CHAT_SCREENS = {
  'chats.home': home,
  'chats.thread': thread,
  'chats.new': newChat,
  'chats.group': newGroup,
  'chats.search': search,
  'chats.settings': settings
};

export { convTitle, STATE_COPY, stateChip };
