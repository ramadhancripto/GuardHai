/**
 * GuardHai · features/network/screens-communities.js
 * Communities: four types, five roles, membership approval, discussions, learning
 * centre, events, help requests, members, moderation and activity.
 *
 * Every privileged control is rendered only when `canDo()` says yes, and the
 * service checks again — the UI is not the boundary.
 */
import {
  L, esc, icon, card, chip, empty, btn, linkBtn, note, banner, field, form, person,
  timeAgo, fmtDate, fmtTime, statusChip, section, tabs, avatar, meter
} from './network-ui.js';
import {
  listCommunities, getCommunity, myMembership, myRoleIn, canDo, listMembers, listPosts,
  createPost, getPost, listComments, listEvents, pendingMembers, communityStats
} from '../../services/community.service.js';
import {
  COMMUNITY_TYPES, COMMUNITY_TYPE_ORDER, COMMUNITY_ROLES, COMMUNITY_ROLE_ORDER,
  COMMUNITY_PERMISSIONS, POST_KINDS, MEMBERSHIP_STATUS, communityCan
} from '../../domain/network.js';
import { pendingReportsFor, listAppeals } from '../../services/safety.service.js';

const typeOf = (id) => COMMUNITY_TYPES[id] || COMMUNITY_TYPES.public;
const roleOf = (id) => COMMUNITY_ROLES[id] || COMMUNITY_ROLES.member;
const TABS = [
  { key: 'home', label: L('Ukurasa', 'Home'), iconId: 'i-home' },
  { key: 'discussions', label: L('Mijadala', 'Discussions'), iconId: 'i-message' },
  { key: 'learning', label: L('Elimu', 'Learning'), iconId: 'i-book' },
  { key: 'events', label: L('Matukio', 'Events'), iconId: 'i-calendar' },
  { key: 'help', label: L('Msaada', 'Help'), iconId: 'i-info' },
  { key: 'members', label: L('Wanachama', 'Members'), iconId: 'i-users' },
  { key: 'about', label: L('Kuhusu', 'About'), iconId: 'i-info' }
];

/* ------------------------------------------------------------------- home */
async function home({ state }) {
  const list = await listCommunities();
  const stats = await communityStats();
  const pending = (await Promise.all(list.map(async (c) => ((await canDo(c.id, 'approve_members')) ? (await pendingMembers(c.id)).length : 0))))
    .reduce((a, b) => a + b, 0);

  const rowFor = (c) => {
    const t = typeOf(c.type);
    const role = c.role ? roleOf(c.role) : null;
    return `<button type="button" class="gh-net-row" data-nx="act" data-act="community.open" data-id="${esc(c.id)}">
      <span class="gh-net-avatar is-community" aria-hidden="true">${icon(t.icon)}</span>
      <span class="gh-net-rowcopy">
        <b>${esc(c.name)}</b>
        <small>${esc(t.label)} · ${c.memberCount || 0} ${L('wanachama', 'members')}${c.location ? ` · ${esc(c.location)}` : ''}</small>
      </span>
      <span class="gh-net-rowright">${role ? chip(role.label, 'info') : ''}${icon('i-chevron-right')}</span>
    </button>`;
  };

  const mine = list.filter((c) => c.membership && ['active', 'pending', 'invited'].includes(c.membership.status));
  const others = list.filter((c) => !mine.includes(c));

  const body = `
    ${banner(L('Jamii za kifaa hiki; za faragha zinahitaji idhini.', 'Device-only communities; private ones need approval.'), 'info', { iconId: 'i-users' })}

    ${pending ? banner(L(`Maombi ${pending} yanasubiri idhini yako.`, `${pending} membership request(s) await your approval.`), 'warn') : ''}

    <div class="gh-net-btnrow">
      ${btn(L('Unda jamii', 'Create community'), { act: 'community.new', tone: 'primary', iconId: 'i-plus' })}
      ${btn(L('Tafuta jamii', 'Find communities'), { act: 'discover.go', tone: 'outline', iconId: 'i-search' })}
    </div>

    ${section(L('Jamii zako', 'Your communities'), mine.length
      ? card(mine.map(rowFor).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-globe', title: L('Hujajiunga na jamii yoyote', 'You have not joined a community'), body: L('Jamii ya wazi unaweza kujiunga mara moja; nyingine zinahitaji idhini.', 'Public communities let you join immediately; the others need approval.') }),
      { note: L(`${stats.moderating} unazosimamia`, `${stats.moderating} you moderate`) })}

    ${others.length ? section(L('Nyingine kwenye kifaa hiki', 'Also on this device'),
      card(others.map(rowFor).join(''), { padded: false, cls: 'is-list' })) : ''}

    ${note(L('Uanachama na uthibitisho ni vitu viwili tofauti. Mwanachama wa “jamii ya wataalamu” si mtaalamu aliyethibitishwa.', 'Membership and verification are separate. A member of a “professional community” is not a verified professional.'))}
  `;

  return {
    title: L('Jamii', 'Communities'),
    subtitle: L(`${mine.length} zako · ${list.length} zinaonekana`, `${mine.length} yours · ${list.length} visible`),
    body
  };
}

/* ------------------------------------------------------------------ create */
async function create() {
  const body = `
    ${form('community.create', `
      ${field({ label: L('Jina', 'Name'), name: 'name', required: true, hint: L('Herufi 3–60', '3–60 characters') })}
      ${field({ label: L('Aina', 'Type'), name: 'type', choices: COMMUNITY_TYPE_ORDER.map((t) => ({ value: t, label: `${COMMUNITY_TYPES[t].label} — ${COMMUNITY_TYPES[t].blurb}` })) })}
      ${field({ label: L('Maelezo', 'About'), name: 'about', type: 'textarea', rows: 3, required: true, hint: L('Herufi 20–600', '20–600 characters') })}
      ${field({ label: L('Kanuni', 'Rules'), name: 'rules', type: 'textarea', rows: 3, hint: L('Kanuni zinazoonekana kwa wanachama wote.', 'Rules every member can read.') })}
      ${field({ label: L('Eneo (kwa jamii ya eneo)', 'Location (local communities)'), name: 'location' })}
      ${field({ label: L('Lebo', 'Tags'), name: 'tags', hint: L('Tenganisha kwa koma. Kiwango 5.', 'Comma separated. Maximum 5.') })}
      ${note(L('Utakuwa mwanzilishi: unaweza kuidhinisha wanachama, kutoa majukumu na kufuta jamii.', 'You become the founder: you can approve members, assign roles and delete the community.'), 'info')}
    `, { submit: L('Unda jamii', 'Create community'), submitIcon: 'i-plus', cancel: { label: L('Ghairi', 'Cancel'), act: 'community.home' } })}
  `;
  return { title: L('Jamii mpya', 'New community'), subtitle: L('Aina nne za jamii', 'Four kinds of community'), body, back: 'communities.home' };
}

/* -------------------------------------------------------------- community */
async function view({ state, profiles }) {
  const id = state.params.id;
  const community = await getCommunity(id);
  if (!community) return { title: L('Jamii', 'Communities'), body: empty({ iconId: 'i-alert-circle', title: L('Jamii haipo', 'Community not found') }) };
  const tab = state.params.tab || 'home';
  const membership = await myMembership(id);
  const role = membership?.status === 'active' ? membership.role : null;
  const t = typeOf(community.type);

  const header = `
    ${card(`
      <div class="gh-net-communityhead">
        <span class="gh-net-avatar is-community is-lg" aria-hidden="true">${icon(t.icon)}</span>
        <div class="gh-net-communitycopy">
          <h2 class="gh-net-h2" data-autofocus>${esc(community.name)}</h2>
          <p class="gh-net-meta">${esc(t.label)} · ${community.memberCount || 0} ${L('wanachama', 'members')}${community.location ? ` · ${esc(community.location)}` : ''}</p>
        </div>
        <div class="gh-net-rowtags">
          ${role ? chip(roleOf(role).label, 'info') : membership ? statusChip(MEMBERSHIP_STATUS[membership.status]) : ''}
          ${community.sample ? chip(L('Sampuli', 'Sample'), 'neutral') : ''}
        </div>
      </div>
      <p class="gh-net-p">${esc(community.about)}</p>
      ${!membership || ['left', 'removed', 'rejected'].includes(membership.status)
        ? `<div class="gh-net-btnrow">${btn(t.join === 'open' ? L('Jiunge', 'Join') : L('Omba kujiunga', 'Request to join'), { act: 'community.join', id, tone: 'primary', iconId: 'i-plus' })}</div>`
        : membership.status === 'pending'
          ? note(L('Ombi lako la kujiunga linasubiri idhini ya msimamizi.', 'Your join request is waiting for an admin to approve it.'), 'warn')
          : membership.status === 'invited'
            ? `<div class="gh-net-btnrow">${btn(L('Kubali mwaliko', 'Accept invitation'), { act: 'community.accept', id, tone: 'primary' })}</div>`
            : `<div class="gh-net-btnrow">
                ${role !== 'founder' ? btn(L('Ondoka', 'Leave'), { act: 'community.leave', id, tone: 'outline' }) : ''}
                ${communityCan(role, 'invite') ? btn(L('Alika', 'Invite'), { act: 'community.invitePrompt', id, tone: 'outline', iconId: 'i-user-plus' }) : ''}
              </div>`}
    `)}
    ${tabs(TABS.filter((x) => x.key !== 'moderation'), tab, 'community.tab')}
  `;

  let body = '';
  if (tab === 'home') body = await homeTab(id, community, role, profiles);
  else if (tab === 'discussions') body = await postList(id, role, 'discussion');
  else if (tab === 'learning') body = await postList(id, role, 'resource');
  else if (tab === 'help') body = await postList(id, role, 'help');
  else if (tab === 'events') body = await eventsTab(id, role);
  else if (tab === 'members') body = await membersTab(id, role, profiles);
  else body = aboutTab(community, t);

  return { title: esc(community.name), subtitle: t.label, body: header + body, back: 'communities.home' };
}

async function homeTab(id, community, role, profiles) {
  const posts = (await listPosts(id)).slice(-3).reverse();
  const events = (await listEvents(id)).slice(0, 2);
  const canModerate = role ? communityCan(role, 'moderate_posts') : false;
  const reports = canModerate ? (await pendingReportsFor(id)).length : 0;

  return `
    ${role ? `<div class="gh-net-btnrow">
      ${btn(L('Chapisha', 'Post'), { act: 'community.postPrompt', id, tone: 'primary', iconId: 'i-plus' })}
      ${canModerate ? btn(L(`Usimamizi${reports ? ` (${reports})` : ''}`, `Moderation${reports ? ` (${reports})` : ''}`), { act: 'community.moderation', id, tone: 'outline', iconId: 'i-flag' }) : ''}
    </div>` : ''}

    ${section(L('Machapisho ya hivi karibuni', 'Recent posts'), posts.length
      ? card(posts.map((p) => postRow(p, profiles)).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-message', title: L('Hakuna machapisho', 'No posts yet'), body: role ? L('Anza mjadala.', 'Start a discussion.') : L('Jiunge kuona na kuchangia.', 'Join to read and contribute.') }))}

    ${events.length ? section(L('Matukio yajayo', 'Upcoming events'), card(events.map((e) => `
      <div class="gh-net-row"><span class="gh-net-avatar" aria-hidden="true">${icon('i-calendar')}</span>
        <span class="gh-net-rowcopy"><b>${esc(e.title)}</b><small>${fmtDate(e.startsAt)} · ${esc(e.place || '')}</small></span></div>`).join(''), { padded: false, cls: 'is-list' })) : ''}
  `;
}

function postRow(post, profiles) {
  const kind = POST_KINDS[post.kind] || POST_KINDS.discussion;
  const author = person(profiles, post.authorId);
  return `<button type="button" class="gh-net-row is-tall" data-nx="act" data-act="community.postView" data-id="${esc(post.id)}">
    <span class="gh-net-avatar" aria-hidden="true">${icon(kind.icon)}</span>
    <span class="gh-net-rowcopy">
      <b>${esc(post.title)}</b>
      <small>${esc(kind.label)} · ${esc(author.name)} · ${timeAgo(post.createdAt)}${post.commentCount ? ` · ${post.commentCount} ${L('majibu', 'replies')}` : ''}</small>
    </span>
    <span class="gh-net-rowright">${icon('i-chevron-right')}</span>
  </button>`;
}

async function postList(id, role, kind) {
  const posts = (await listPosts(id, { kind })).reverse();
  const canPost = role && (kind === 'resource' ? communityCan(role, 'manage_resources') : communityCan(role, 'post'));
  return `
    ${canPost ? `<div class="gh-net-btnrow">${btn(L('Chapisha', 'Post'), { act: 'community.postPrompt', id, tone: 'primary', iconId: 'i-plus', extra: `data-kind="${kind}"` })}</div>` : ''}
    ${posts.length
      ? card(posts.map((p) => postRow(p, {})).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: kind === 'resource' ? 'i-book' : kind === 'help' ? 'i-info' : 'i-message',
          title: kind === 'resource' ? L('Maktaba haina kitu bado', 'Nothing in the library yet')
            : kind === 'help' ? L('Hakuna maombi ya msaada', 'No help requests') : L('Hakuna mijadala', 'No discussions yet'),
          body: L('Sehemu hii inaonekana kwa wanachama wa jamii hii.', 'This section is visible to members of this community.') })}
  `;
}

async function eventsTab(id, role) {
  const events = await listEvents(id);
  const canCreate = role && communityCan(role, 'manage_events');
  return `
    ${canCreate ? `<div class="gh-net-btnrow">${btn(L('Tukio jipya', 'New event'), { act: 'community.eventPrompt', id, tone: 'primary', iconId: 'i-calendar' })}</div>` : ''}
    ${events.length ? card(events.map((e) => `
      <div class="gh-net-eventrow">
        <div class="gh-net-eventwhen"><b>${esc(formatDay(e.startsAt))}</b><small>${esc(fmtTime(e.startsAt))}</small></div>
        <div class="gh-net-rowcopy"><b>${esc(e.title)}</b><small>${esc(e.place || L('Mahali hakijatajwa', 'No place given'))} · ${(e.attendees || []).length} ${L('wamejiunga', 'attending')}</small></div>
        <div class="gh-net-rowright">${btn(L('Hudhuria', 'Attend'), { act: 'community.attend', id: e.id, tone: 'outline' })}</div>
      </div>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-calendar', title: L('Hakuna matukio', 'No events'), body: L('Matukio huonekana hapa yakipangwa.', 'Events appear here once scheduled.') })}
    ${note(L('Matukio ni rekodi za kifaa hiki. Hakuna mwaliko unaotumwa na hakuna ukumbi wa mtandaoni.', 'Events are device records. No invitation is sent and no online room exists.'))}
  `;
}

const formatDay = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

async function membersTab(id, role, profiles) {
  const members = await listMembers(id);
  const pending = members.filter((m) => m.status === 'pending');
  const active = members.filter((m) => m.status === 'active');
  const canApprove = role && communityCan(role, 'approve_members');
  const canAssign = role && communityCan(role, 'assign_roles');
  const canRemove = role && communityCan(role, 'remove_member');

  const memberRow = (m) => {
    const p = person(profiles, m.profileId);
    const r = roleOf(m.role);
    return `<div class="gh-net-memberrow">
      ${avatar(p)}
      <div class="gh-net-rowcopy"><b>${esc(p.name)}</b><small>${esc(r.label)} · ${L('amejiunga', 'joined')} ${timeAgo(m.joinedAt || m.requestedAt)}</small></div>
      <div class="gh-net-rowright">
        ${canAssign && m.profileId !== 'me' ? `<button type="button" class="gh-net-linkbtn" data-nx="act" data-act="community.rolePrompt" data-id="${esc(id)}" data-key="${esc(m.profileId)}">${icon('i-edit')}<span>${L('Jukumu', 'Role')}</span></button>` : ''}
        ${canRemove && m.profileId !== 'me' && m.role !== 'founder' ? `<button type="button" class="gh-net-iconbtn" data-nx="act" data-act="community.remove" data-id="${esc(id)}" data-key="${esc(m.profileId)}" aria-label="${L('Ondoa', 'Remove')}">${icon('i-x')}</button>` : ''}
      </div>
    </div>`;
  };

  return `
    ${pending.length && canApprove ? section(L('Wanasubiri idhini', 'Waiting for approval'),
      card(pending.map((m) => `<div class="gh-net-memberrow">
        ${avatar(person(profiles, m.profileId))}
        <div class="gh-net-rowcopy"><b>${esc(person(profiles, m.profileId).name)}</b><small>${L('Ameomba kujiunga', 'Asked to join')} · ${timeAgo(m.requestedAt)}</small></div>
        <div class="gh-net-rowright">
          ${btn(L('Idhinisha', 'Approve'), { act: 'community.approve', id, key: m.profileId, tone: 'primary' })}
          ${btn(L('Kataa', 'Reject'), { act: 'community.reject', id, key: m.profileId, tone: 'ghost' })}
        </div></div>`).join(''), { padded: false, cls: 'is-list' })) : ''}

    ${section(L(`Wanachama (${active.length})`, `Members (${active.length})`), card(active.map(memberRow).join(''), { padded: false, cls: 'is-list' }),
      { note: L('Majukumu: Mwanzilishi → Msimamizi → Msimamizi wa mijadala → Mchangiaji → Mwanachama.', 'Roles: Founder → Admin → Moderator → Contributor → Member.') })}
  `;
}

function aboutTab(community, t) {
  return `
    ${section(L('Kuhusu', 'About'), card(`<p class="gh-net-p">${esc(community.about)}</p>
      <ul class="gh-net-honest">
        <li>${icon('i-users', 'is-muted')}<span>${L('Aina', 'Type')}: ${esc(t.label)} — ${esc(t.blurb)}</span></li>
        <li>${icon('i-lock', 'is-muted')}<span>${L('Kujiunga', 'Joining')}: ${t.join === 'open' ? L('waharusi', 'open') : L('kwa idhini', 'approval required')}</span></li>
        <li>${icon('i-shield-check', 'is-muted')}<span>${L('Uthibitisho wa kitaalamu', 'Professional verification')}: ${community.verifiedProfessional ? L('imeandikwa', 'recorded') : L('hakuna', 'none')} — ${L('hii ni tofauti na uanachama', 'separate from membership')}</span></li>
      </ul>`))}

    ${community.rules ? section(L('Kanuni', 'Rules'), card(`<p class="gh-net-p is-pre">${esc(community.rules)}</p>`)) : ''}

    ${(community.tags || []).length ? `<div class="gh-net-tagrow">${community.tags.map((x) => chip(x, 'neutral')).join('')}</div>` : ''}
  `;
}

/* --------------------------------------------------------------- post view */
async function postView({ state, profiles }) {
  const post = await getPost(state.params.id);
  if (!post) return { title: L('Jamii', 'Communities'), body: empty({ iconId: 'i-alert-circle', title: L('Chapisho halipo', 'Post not found') }) };
  const community = await getCommunity(post.communityId);
  const role = await myRoleIn(post.communityId);
  const comments = await listComments(post.id);
  const kind = POST_KINDS[post.kind] || POST_KINDS.discussion;
  const author = person(profiles, post.authorId);
  const helpful = (post.reactions?.helpful || []);
  const reacted = helpful.includes('me');

  const body = `
    ${card(`
      <div class="gh-net-requesthead">
        <div>
          <h2 class="gh-net-h2" data-autofocus>${esc(post.title)}</h2>
          <p class="gh-net-meta">${esc(kind.label)} · ${esc(community?.name || '')} · ${esc(author.name)} · ${timeAgo(post.createdAt)}</p>
        </div>
        ${chip(kind.label, 'neutral')}
      </div>
      <p class="gh-net-p is-pre">${esc(post.body)}</p>
      <div class="gh-net-btnrow">
        ${btn(`${L('Msaada', 'Helpful')} (${helpful.length})`, { act: 'community.react', id: post.id, tone: reacted ? 'primary' : 'outline', iconId: 'i-heart' })}
        ${btn(L('Ripoti', 'Report'), { act: 'safety.reportPrompt', id: post.id, tone: 'ghost', iconId: 'i-flag', extra: `data-subject="post" data-target="${esc(post.id)}"` })}
        ${role && communityCan(role, 'moderate_posts') ? btn(post.hidden ? L('Onyesha', 'Restore') : L('Ficha', 'Hide'), { act: 'community.hide', id: post.id, tone: 'ghost', iconId: 'i-eye-off' }) : ''}
      </div>
    `)}

    ${section(L(`Majibu (${comments.length})`, `Replies (${comments.length})`),
      comments.length ? card(comments.map((c) => `<div class="gh-net-comment">
        ${avatar(person(profiles, c.authorId))}
        <div><b>${esc(person(profiles, c.authorId).name)}</b><small>${timeAgo(c.createdAt)}</small><p>${esc(c.body)}</p></div>
      </div>`).join(''), { padded: false, cls: 'is-list' })
        : empty({ iconId: 'i-message', title: L('Hakuna majibu', 'No replies yet'), body: L('Kuwa wa kwanza kuchangia.', 'Be the first to reply.') }))}

    ${role ? form('community.comment', `
      <input type="hidden" name="postId" value="${esc(post.id)}">
      ${field({ label: L('Jibu', 'Reply'), name: 'body', type: 'textarea', rows: 3, required: true })}
    `, { submit: L('Tuma jibu', 'Post reply'), submitIcon: 'i-send' }) : note(L('Jiunge na jamii ili kuchangia.', 'Join the community to reply.'), 'warn')}
  `;
  return { title: esc(post.title), subtitle: esc(community?.name || ''), body, back: 'communities.view', backParams: { id: post.communityId, tab: 'discussions' } };
}

/* ------------------------------------------------------------- moderation */
async function moderation({ state, profiles }) {
  const id = state.params.id;
  const community = await getCommunity(id);
  const role = await myRoleIn(id);
  if (!community || !role || !communityCan(role, 'moderate_posts')) {
    return { title: L('Usimamizi', 'Moderation'), body: empty({ iconId: 'i-lock', title: L('Huna ruhusa', 'Not allowed'), body: L('Ukurasa huu ni kwa wasimamizi wa jamii hii.', 'This page is for this community’s moderators.') }) };
  }
  const reports = await pendingReportsFor(id);
  const appeals = (await listAppeals()).filter((a) => a.status === 'open');
  const { listAudit } = await import('../../services/alerts.service.js');
  const activity = await listAudit({ communityId: id, limit: 15 });

  const body = `
    ${section(L('Ripoti zinazosubiri', 'Pending reports'), reports.length ? card(reports.map((r) => `
      <div class="gh-net-reportrow">
        <div class="gh-net-rowcopy">
          <b>${esc(r.reason)} · ${esc(r.subjectType)}</b>
          <small>${esc(r.detail || L('Hakuna maelezo', 'No detail'))} · ${timeAgo(r.createdAt)}</small>
        </div>
        <div class="gh-net-rowright">
          ${btn(L('Ficha maudhui', 'Hide content'), { act: 'safety.decide', id: r.id, key: 'hidden', tone: 'outline' })}
          ${btn(L('Kataa', 'Dismiss'), { act: 'safety.decide', id: r.id, key: 'dismissed', tone: 'ghost' })}
        </div>
      </div>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-check-circle', title: L('Hakuna ripoti', 'No reports'), body: L('Hakuna ripoti inayosubiri kwenye jamii hii.', 'Nothing is waiting for a decision here.') }))}

    ${section(L('Rufaa', 'Appeals'), appeals.length ? card(appeals.map((a) => `
      <div class="gh-net-reportrow">
        <div class="gh-net-rowcopy"><b>${esc(a.subjectType)}</b><small>${esc(a.reason.slice(0, 90))} · ${timeAgo(a.createdAt)}</small></div>
        <div class="gh-net-rowright">
          ${btn(L('Kubali rufaa', 'Uphold'), { act: 'safety.appealDecide', id: a.id, key: 'upheld', tone: 'outline' })}
          ${btn(L('Kataa rufaa', 'Reject'), { act: 'safety.appealDecide', id: a.id, key: 'rejected', tone: 'ghost' })}
        </div>
      </div>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-inbox', title: L('Hakuna rufaa', 'No appeals'), body: '' }))}

    ${section(L('Kumbukumbu', 'Activity log'), card(`<ul class="gh-net-timeline">
      ${activity.length ? activity.map((a) => `<li><b>${esc(a.action)}</b><span>${timeAgo(a.at)} · ${esc(a.actorId)}${a.detail ? ` · ${esc(a.detail)}` : ''}</span></li>`).join('')
        : `<li><span>${L('Hakuna kumbukumbu bado.', 'No entries yet.')}</span></li>`}
    </ul>`), { note: L('Kumbukumbu haibadilishwi; kila uamuzi unaandikwa na nani na lini.', 'The log is append-only: every decision records who and when.') })}
  `;
  return { title: L('Usimamizi', 'Moderation'), subtitle: esc(community.name), body, back: 'communities.view', backParams: { id, tab: 'home' } };
}

[home, create, view, postView, moderation].forEach((fn) => { fn.partition = 'communities'; });
view.back = 'communities.home';
postView.back = 'communities.view';
moderation.back = 'communities.view';

export const COMMUNITY_SCREENS = {
  'communities.home': home,
  'communities.new': create,
  'communities.view': view,
  'communities.postView': postView,
  'communities.moderation': moderation
};

export { typeOf, roleOf, TABS as COMMUNITY_TABS, formatDay, postRow, homeTab, postList, eventsTab, membersTab, aboutTab };
