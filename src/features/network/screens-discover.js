/**
 * GuardHai · features/network/screens-discover.js
 * Discover: people who opted in, communities, support providers and verified
 * professionals — plus the privacy controls that decide what others can see.
 *
 * Nothing here shows a phone number, an email or a home address. A person card
 * carries a name, a role and a badge, and nothing else.
 */
import {
  L, esc, icon, card, chip, empty, btn, note, banner, field, form, person, avatar,
  section, tabs, statusChip
} from './network-ui.js';
import { searchAll, getSettings, discoverPeople } from '../../services/discover.service.js';
import { listProviders, providerVerification } from '../../services/support.service.js';
import { COMMUNITY_TYPES } from '../../domain/network.js';
import { ROLE_ORDER, roleOf } from '../../domain/profile.js';

/* ------------------------------------------------------------------- home */
async function home({ state }) {
  const settings = await getSettings();
  const term = state.filter.q || '';
  const results = await searchAll(term);
  const providers = await listProviders();
  const verified = [];
  for (const p of providers) {
    const v = await providerVerification(p);
    if (v.status === 'verified') verified.push({ p, v });
  }
  const people = await discoverPeople({});
  const catCounts = {};
  for (const c of results.communities) catCounts[c.type] = (catCounts[c.type] || 0) + 1;

  const body = `
    ${form('discover.search', `
      ${field({ label: L('Tafuta watu, jamii, watoa huduma', 'Search people, communities, providers'), name: 'q', type: 'search', value: term,
        hint: L('Utafutaji unafanyika kwenye kifaa hiki. Hakuna orodha ya mtandao iliyounganishwa.', 'Search runs on this device. No network directory is connected.') })}
    `, { submit: L('Tafuta', 'Search'), submitIcon: 'i-search' })}

    ${term ? `<p class="gh-net-results-line">${esc(results.total)} ${L('matokeo kwa', 'results for')} “${esc(term)}”</p>` : ''}

    ${section(L('Watu', 'People'), people.length
      ? card(people.slice(0, 8).map((p) => `<div class="gh-net-row">
          <span class="gh-net-avatar" aria-hidden="true">${icon('i-user')}</span>
          <span class="gh-net-rowcopy"><b>${esc(p.name)}</b><small>${esc(p.roleLabel)}${p.sample ? ' · ' + L('Sampuli', 'Sample') : ''}${p.self ? ' · ' + L('Wewe', 'You') : ''}</small></span>
          <span class="gh-net-rowright">
            ${p.self ? '' : btn(L('Ujumbe', 'Message'), { act: 'chats.start', id: p.id, tone: 'outline', iconId: 'i-message', compact: true })}
            ${p.self ? '' : btn(L('Mlezi', 'Guardian'), { act: 'guardian.inviteFor', id: p.id, tone: 'ghost', iconId: 'i-shield-check', compact: true })}
          </span>
        </div>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-users', title: L('Hakuna mtu anayeonekana', 'Nobody is discoverable'), body: L('Watu huonekana hapa wakichagua kuonekana. Wewe unaweza kuwasha hiyo kwenye faragha hapa chini.', 'People appear here when they opt in. You can switch yours on under privacy below.') }),
      { note: L('Hakuna namba ya simu au barua pepe inayoonyeshwa. Mawasiliano huanza ndani ya app.', 'No phone number or email is shown. Contact starts inside the app.') })}

    ${section(L('Jamii', 'Communities'), results.communities.length
      ? card(results.communities.slice(0, 6).map((c) => `<button type="button" class="gh-net-row" data-nx="act" data-act="community.open" data-id="${esc(c.id)}">
          <span class="gh-net-avatar is-community" aria-hidden="true">${icon(COMMUNITY_TYPES[c.type]?.icon || 'i-globe')}</span>
          <span class="gh-net-rowcopy"><b>${esc(c.name)}</b><small>${esc(COMMUNITY_TYPES[c.type]?.label || c.type)} · ${c.memberCount || 0} ${L('wanachama', 'members')}</small></span>
          <span class="gh-net-rowright">${icon('i-chevron-right')}</span></button>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-globe', title: L('Hakuna jamii', 'No communities'), body: L('Jamii za faragha hazionekani hadi ujiunge.', 'Private communities stay hidden until you join.') }))}

    ${section(L('Watoa huduma', 'Support providers'), results.providers.length
      ? card(results.providers.slice(0, 6).map((p) => `<button type="button" class="gh-net-row" data-nx="act" data-act="support.provider" data-id="${esc(p.id)}">
          <span class="gh-net-avatar" aria-hidden="true">${icon('i-bag')}</span>
          <span class="gh-net-rowcopy"><b>${esc(p.name)}</b><small>${esc((p.categories || []).join(' · '))}</small></span>
          <span class="gh-net-rowright">${icon('i-chevron-right')}</span></button>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-bag', title: L('Hakuna watoa huduma', 'No providers') }))}

    ${section(L('Wataalamu waliothibitishwa', 'Verified professionals'), verified.length
      ? card(verified.map(({ p, v }) => `<div class="gh-net-row"><span class="gh-net-avatar" aria-hidden="true">${icon('i-badge-check')}</span>
          <span class="gh-net-rowcopy"><b>${esc(p.name)}</b><small>${esc(v.detail || '')}</small></span></div>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-badge-check', title: L('Hakuna uthibitisho ulioandikwa', 'No verification on record'),
          body: L('Uthibitisho unahitaji mthibitishaji aliyeunganishwa. Hakuna aliyeunganishwa, kwa hiyo hakuna alama ya “imethibitishwa”.', 'Verification needs a connected authority. None is connected, so no “verified” badge exists yet.') }))}

    ${section(L('Faragha yako', 'Your privacy'), card(form('discover.settings', `
      <label class="gh-net-check"><input type="checkbox" name="discoverable" value="1"${settings.discoverable ? ' checked' : ''}>
        <span><b>${L('Nionekane kwenye Discover', 'Let people find me in Discover')}</b>
        <small>${L('Watu wanaweza kuona jina na jukumu lako — si namba wala anwani.', 'People see your name and role — never a number or an address.')}</small></span></label>
      <label class="gh-net-check"><input type="checkbox" name="showInProfessionalDirectory" value="1"${settings.showInProfessionalDirectory ? ' checked' : ''}>
        <span><b>${L('Nionekane kwenye orodha ya wataalamu', 'List me in the professional directory')}</b>
        <small>${L('Kuonekana hakuleti uthibitisho wa leseni.', 'Being listed does not verify a licence.')}</small></span></label>
      <label class="gh-net-check"><input type="checkbox" name="allowGuardianInvites" value="1"${settings.allowGuardianInvites ? ' checked' : ''}>
        <span><b>${L('Ruhusu mialiko ya mlezi', 'Allow guardian invitations')}</b></span></label>
      <label class="gh-net-check"><input type="checkbox" name="allowCommunityInvites" value="1"${settings.allowCommunityInvites ? ' checked' : ''}>
        <span><b>${L('Ruhusu mialiko ya jamii', 'Allow community invitations')}</b></span></label>
      ${field({ label: L('Jina la umma (si lazima)', 'Public name (optional)'), name: 'publicName', value: settings.publicName || '',
        hint: L('Ukiacha wazi, jina lako la wasifu linatumika.', 'Leave empty to use your profile name.') })}
    `, { submit: L('Hifadhi faragha', 'Save privacy') }), {
      note: L('Faragha hii inadhibiti kile kinachoonekana. Haibadilishi kile kilichohifadhiwa.', 'This controls what is shown. It does not change what is stored.')
    }))}
  `;

  return {
    title: L('Gundua', 'Discover'),
    subtitle: term ? `${results.total} ${L('matokeo', 'results')}` : L('Watu · jamii · wataalamu', 'People · communities · professionals'),
    body
  };
}

/* ---------------------------------------------------------- people results */
async function people({ state }) {
  const term = state.filter.q || '';
  const roleFilter = state.filter.role || null;
  const rows = await discoverPeople({ query: term, role: roleFilter });
  return {
    title: L('Watu', 'People'),
    subtitle: `${rows.length}`,
    body: `
      ${tabs([{ key: 'all', label: L('Zote', 'All') }].concat(ROLE_ORDER.map((r) => ({ key: r, label: roleOf(r).label }))), roleFilter || 'all', 'discover.role')}
      ${rows.length ? card(rows.map((p) => `<div class="gh-net-row">
        <span class="gh-net-avatar" aria-hidden="true">${icon('i-user')}</span>
        <span class="gh-net-rowcopy"><b>${esc(p.name)}</b><small>${esc(p.roleLabel)}${p.sample ? ' · ' + L('Sampuli', 'Sample') : ''}</small></span>
        <span class="gh-net-rowright">${btn(L('Ujumbe', 'Message'), { act: 'chats.start', id: p.id, tone: 'outline', iconId: 'i-message', compact: true })}</span>
      </div>`).join(''), { padded: false, cls: 'is-list' })
        : empty({ iconId: 'i-user', title: L('Hakuna mtu', 'Nobody found') })}
      ${note(L('Hakuna taarifa za mawasiliano zinazoonyeshwa. Ujumbe huanza ndani ya app.', 'No contact details are shown. Conversation starts inside the app.'))}
    `,
    back: 'discover.home'
  };
}

home.partition = 'discover';
people.partition = 'discover';
people.back = 'discover.home';

export const DISCOVER_SCREENS = {
  'discover.home': home,
  'discover.people': people
};
