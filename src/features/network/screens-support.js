/**
 * GuardHai · features/network/screens-support.js
 * Support Network screens: seven categories, provider discovery, request
 * lifecycle and the honest routing state.
 *
 * Emergency content is deliberately absent: every screen sends people to the
 * dedicated SOS system instead of creating an "urgent request" that nobody reads.
 */
import {
  L, esc, icon, card, chip, empty, btn, note, banner, field, form, avatar, person,
  timeAgo, fmtDate, statusChip, statGrid, section, tabs
} from './network-ui.js';
import {
  listProviders, listRequests, getRequest, getProvider, providerVerification,
  statusOf as requestStatus, urgencyOf
} from '../../services/support.service.js';
import {
  SUPPORT_CATEGORIES, SUPPORT_CATEGORY_ORDER, SUPPORT_URGENCY, REQUEST_STATUS, PROVIDER_KINDS
} from '../../domain/network.js';

const cat = (id) => SUPPORT_CATEGORIES[id] || SUPPORT_CATEGORIES.community;

/* ------------------------------------------------------------------- home */
async function home({ state, profiles }) {
  const requests = await listRequests();
  const providers = await listProviders();
  const open = requests.filter((r) => ['submitted', 'routed', 'acknowledged', 'in_progress'].includes(r.status));
  const activeCat = state.filter.cat || null;

  const catCard = (id) => {
    const c = cat(id);
    const count = requests.filter((r) => r.category === id).length;
    return `<button type="button" class="gh-net-catcard${activeCat === id ? ' is-active' : ''}"
      data-nx="act" data-act="support.new" data-key="${esc(id)}">
      <span class="gh-net-caticon is-${esc(c.tone)}">${icon(c.icon)}</span>
      <b>${esc(c.label)}</b>
      <small>${esc(c.en)}</small>
      ${count ? `<em>${count}</em>` : ''}
    </button>`;
  };

  const requestRow = (r) => {
    const st = requestStatus(r.status);
    return `<button type="button" class="gh-net-row" data-nx="act" data-act="support.open" data-id="${esc(r.id)}">
      <span class="gh-net-rowcopy">
        <b>${esc(r.subject)}</b>
        <small>${esc(cat(r.category).label)} · ${timeAgo(r.createdAt)} · ${esc(urgencyOf(r.urgency).label)}</small>
      </span>
      <span class="gh-net-rowright">${statusChip(st)}${icon('i-chevron-right')}</span>
    </button>`;
  };

  const body = `
    ${banner(L('Dharura si ombi la msaada. Ukihitaji msaada wa haraka wa dharura tumia SOS — ombi la kawaida halifikii mtu yeyote papo hapo.', 'An emergency is not a support request. If you need emergency help use SOS — an ordinary request does not reach anyone instantly.'), 'danger', { iconId: 'i-siren' })}
    <div class="gh-net-btnrow">
      ${btn(L('Fungua SOS', 'Open SOS'), { act: 'sos', tone: 'danger', iconId: 'i-siren' })}
      ${btn(L('Wataalamu na watoa huduma', 'Providers'), { act: 'support.providers', tone: 'outline', iconId: 'i-users' })}
    </div>

    ${statGrid([
      { value: open.length, label: L('Maombi yaliyo hai', 'Open requests'), tone: open.length ? 'info' : 'muted' },
      { value: requests.length, label: L('Jumla', 'Total'), tone: 'muted' },
      { value: providers.length, label: L('Watoa huduma', 'Providers'), tone: 'muted' },
      { value: requests.filter((r) => r.status === 'resolved').length, label: L('Yaliyotatuliwa', 'Resolved'), tone: 'ok' }
    ])}

    ${section(L('Aina za msaada', 'Kinds of support'), `<div class="gh-net-catgrid">${SUPPORT_CATEGORY_ORDER.map(catCard).join('')}</div>`,
      { note: L('Chagua kundi kuandika ombi. Unaweza kuongeza maelezo, kufuatilia na kufunga ombi lako mwenyewe.', 'Choose a category to write a request. You can add detail, track it and close your own request.') })}

    ${section(L('Maombi yako', 'Your requests'),
      requests.length ? card(requests.map(requestRow).join(''), { padded: false, cls: 'is-list' })
        : empty({
            iconId: 'i-inbox',
            title: L('Hakuna maombi bado', 'No requests yet'),
            body: L('Ombi ni rekodi yako mwenyewe. Hakuna kinachotumwa popote hadi uunganishe huduma.', 'A request is your own record. Nothing is sent anywhere until a service is connected.')
          }))}

    ${note(L('Watoa huduma wote kwenye kifaa hiki ni wa mfano. Hakuna leseni iliyothibitishwa na hakuna taasisi halisi iliyounganishwa.', 'Every provider on this device is a sample. No licence is verified and no real institution is connected.'), 'warn')}
  `;

  return {
    title: L('Msaada', 'Support'),
    subtitle: L(`${open.length} maombi hai`, `${open.length} open requests`),
    body
  };
}

/* ---------------------------------------------------------------- new req */
async function newRequest({ state }) {
  const category = state.params.category || state.filter.cat || 'community';
  const providers = (await listProviders({ category }));
  const c = cat(category);
  const body = `
    ${card(`
      <div class="gh-net-inlinehead"><span class="gh-net-caticon is-${esc(c.tone)}">${icon(c.icon)}</span>
        <div><b>${esc(c.label)}</b><small>${esc(c.en)}</small></div>
      </div>
      ${note(L('Andika kwa uwazi. Ombi hili linahifadhiwa kwenye kifaa hiki na halitumwi popote bila muunganisho.', 'Write clearly. This request is stored on this device and is not sent anywhere without a connection.'), 'info')}
    `)}

    ${form('support.create', `
      <input type="hidden" name="category" value="${esc(category)}">
      ${field({ label: L('Kichwa', 'Subject'), name: 'subject', required: true, placeholder: L('mf. Msaada wa usafiri kwa mzee', 'e.g. Transport help for an elderly person') })}
      ${field({ label: L('Maelezo', 'Details'), name: 'body', type: 'textarea', rows: 5, required: true,
        hint: L('Herufi 20–2000. Usiweke namba za simu au taarifa nyeti.', '20–2000 characters. Do not add phone numbers or sensitive details.') })}
      ${field({ label: L('Haraka', 'Urgency'), name: 'urgency', choices: Object.values(SUPPORT_URGENCY).map((u) => ({ value: u.id, label: u.label })) })}
      ${field({ label: L('Mtoa huduma (si lazima)', 'Provider (optional)'), name: 'providerId',
        choices: [{ value: '', label: L('Bila mtoa huduma maalum', 'No specific provider') }]
          .concat(providers.map((p) => ({ value: p.id, label: `${p.name} — ${PROVIDER_KINDS[p.kind]?.label || p.kind}` }))) })}
    `, { submit: L('Hifadhi ombi', 'Save request'), submitIcon: 'i-check', cancel: { label: L('Ghairi', 'Cancel'), act: 'support.home' } })}
  `;
  return { title: L('Ombi jipya', 'New request'), subtitle: c.label, body };
}

/* ---------------------------------------------------------------- request */
async function request({ state, profiles }) {
  const r = await getRequest(state.params.id);
  if (!r) return { title: L('Msaada', 'Support'), body: empty({ iconId: 'i-alert-circle', title: L('Ombi halipo', 'Request not found') }) };
  const st = requestStatus(r.status);
  const provider = r.providerId ? await getProvider(r.providerId) : null;
  const requester = person(profiles, r.requesterId);
  const closed = ['closed', 'cancelled', 'resolved'].includes(r.status);

  const body = `
    ${card(`
      <div class="gh-net-requesthead">
        <div>
          <h2 class="gh-net-h2" data-autofocus>${esc(r.subject)}</h2>
          <p class="gh-net-meta">${esc(cat(r.category).label)} · ${esc(urgencyOf(r.urgency).label)} · ${fmtDate(r.createdAt)}</p>
        </div>
        ${statusChip(st)}
      </div>
      <p class="gh-net-p">${esc(r.body)}</p>
      ${r.sample ? chip(L('Sampuli', 'Sample'), 'neutral') : ''}
    `)}

    ${section(L('Hali ya uwasilishaji', 'Routing state'), card(`
      <ul class="gh-net-honest">
        <li>${icon(r.routing?.delivered ? 'i-check-circle' : 'i-x', r.routing?.delivered ? 'is-ok' : 'is-muted')}
          <span>${r.routing?.delivered ? L('Ombi limepelekwa kwa mtoa huduma.', 'The request was delivered to a provider.')
            : L('Ombi halijatumwa: hakuna muunganisho. Limehifadhiwa kwenye kifaa hiki.', 'The request was not sent: there is no connection. It is stored on this device.')}</span></li>
        <li>${icon('i-info', 'is-muted')}<span>${L('Majaribio ya kutuma', 'Delivery attempts')}: ${r.routing?.attempted || 0} · ${esc(r.routing?.reason || '—')}</span></li>
        ${provider ? `<li>${icon('i-user', 'is-muted')}<span>${L('Mtoa huduma', 'Provider')}: ${esc(provider.name)}</span></li>` : ''}
      </ul>
      ${r.status === 'submitted' ? `<div class="gh-net-btnrow">${btn(L('Jaribu kutuma', 'Try to send'), { act: 'support.route', id: r.id, tone: 'outline', iconId: 'i-send' })}</div>` : ''}
    `), { note: L('Tunathibitisha kila jaribio. Hatutengenezi “imefika” isipofika kweli.', 'Every attempt is recorded. We never fabricate “delivered” when nothing was delivered.') })}

    ${section(L('Majibu', 'Responses'), card(r.responses.length
      ? `<ul class="gh-net-thread is-flat">${r.responses.map((m) => `<li class="gh-net-msg${m.role === 'requester' ? ' is-mine' : ''}">
          <span class="gh-net-msgwho">${esc(person(profiles, m.actorId).name)} · ${m.role === 'provider' ? L('mtoa huduma', 'provider') : L('mwombaji', 'requester')}</span>
          <div class="gh-net-bubble"><p>${esc(m.body)}</p></div>
          <span class="gh-net-msgmeta">${timeAgo(m.at)}</span></li>`).join('')}</ul>`
      : empty({ iconId: 'i-message', title: L('Hakuna jibu bado', 'No replies yet'),
          body: L('Majibu hutoka kwa mtoa huduma aliyechaguliwa. Hakuna aliyeunganishwa, kwa hiyo hakuna jibu la kubuni.', 'Replies come from the chosen provider. None is connected, so no reply is invented.') })) )}

    ${!closed ? form('support.note', `
      <input type="hidden" name="id" value="${esc(r.id)}">
      ${field({ label: L('Ongeza maelezo', 'Add a note'), name: 'body', type: 'textarea', rows: 3, required: true })}
    `, { submit: L('Ongeza', 'Add note'), submitIcon: 'i-plus' }) : ''}

    ${section(L('Historia', 'History'), card(`<ul class="gh-net-timeline">
      ${(r.timeline || []).map((t) => `<li><b>${esc(t.action)}</b><span>${timeAgo(t.at)}${t.reason ? ` · ${esc(t.reason)}` : ''}</span></li>`).join('')}
    </ul>`))}

    <div class="gh-net-btnrow">
      ${!closed ? btn(L('Funga ombi', 'Close request'), { act: 'support.close', id: r.id, tone: 'outline', iconId: 'i-check' }) : ''}
      ${!closed ? btn(L('Ghairi', 'Cancel'), { act: 'support.cancel', id: r.id, tone: 'ghost' }) : ''}
      ${closed ? `<span class="gh-net-muted">${esc(statusOfClosed(r))}</span>` : ''}
    </div>

    ${note(L('Hii si huduma ya dharura. Kwa dharura tumia SOS au piga 112.', 'This is not an emergency service. For emergencies use SOS or call 112.'), 'warn')}
    <p class="gh-net-footnote">${L('Mwombaji', 'Requester')}: ${esc(requester.name)}</p>
  `;

  return { title: L('Ombi', 'Request'), subtitle: cat(r.category).label, body, back: 'support.home' };
}

const statusOfClosed = (r) => REQUEST_STATUS[r.status]?.label || r.status;

/* -------------------------------------------------------------- providers */
async function providers({ state }) {
  const category = state.filter.cat || null;
  const rows = await listProviders({ category });
  const withVerification = [];
  for (const p of rows) withVerification.push({ provider: p, verification: await providerVerification(p) });

  const body = `
    ${tabs([{ key: 'all', label: L('Zote', 'All'), count: rows.length }]
      .concat(SUPPORT_CATEGORY_ORDER.map((id) => ({ key: id, label: cat(id).label }))), category || 'all', 'support.filter')}

    ${section(L('Watoa huduma', 'Providers'), withVerification.length ? card(withVerification.map(({ provider, verification }) => `
      <button type="button" class="gh-net-row" data-nx="act" data-act="support.provider" data-id="${esc(provider.id)}">
        <span class="gh-net-avatar" aria-hidden="true">${icon(PROVIDER_KINDS[provider.kind]?.id === 'institution' ? 'i-building' : 'i-user')}</span>
        <span class="gh-net-rowcopy">
          <b>${esc(provider.name)}</b>
          <small>${esc((provider.categories || []).map((c) => cat(c).label).join(' · '))}</small>
        </span>
        <span class="gh-net-rowright">${chip(verification.label, verification.status === 'verified' ? 'ok' : verification.status === 'sample' ? 'neutral' : 'muted')}${icon('i-chevron-right')}</span>
      </button>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-users', title: L('Hakuna watoa huduma', 'No providers'), body: L('Hakuna mtoa huduma kwenye kundi hili.', 'Nobody offers this kind of support here.') }))}

    ${note(L('“Imethibitishwa” inaonekana tu pale mthibitishaji na kumbukumbu zimeandikwa. Kwenye kifaa hiki hakuna mthibitishaji aliyeunganishwa — kila mtoa huduma anaonekana kama sampuli au bila uthibitisho.', '“Verified” appears only when an authority and a reference are recorded. No authority is connected here, so every provider shows as sample or unverified.'), 'warn')}
  `;
  return { title: L('Watoa huduma', 'Providers'), subtitle: `${rows.length} ${L('wanaonekana', 'listed')}`, body, back: 'support.home' };
}

/* --------------------------------------------------------------- provider */
async function provider({ state }) {
  const p = await getProvider(state.params.id);
  if (!p) return { title: L('Msaada', 'Support'), body: empty({ iconId: 'i-alert-circle', title: L('Mtoa huduma hayupo', 'Provider not found') }) };
  const verification = await providerVerification(p);

  const body = `
    ${card(`
      <div class="gh-net-requesthead">
        <div><h2 class="gh-net-h2" data-autofocus>${esc(p.name)}</h2>
          <p class="gh-net-meta">${esc(PROVIDER_KINDS[p.kind]?.label || p.kind)} · ${esc((p.categories || []).map((c) => cat(c).label).join(' · '))}</p></div>
        ${chip(verification.label, verification.status === 'verified' ? 'ok' : verification.status === 'sample' ? 'neutral' : 'muted')}
      </div>
      <p class="gh-net-p">${esc(p.about)}</p>
      <ul class="gh-net-honest">
        <li>${icon('i-info', 'is-muted')}<span>${esc(verification.detail || '')}</span></li>
        <li>${icon('i-lock', 'is-muted')}<span>${L('Mawasiliano ni ndani ya app; hakuna namba ya simu inayoonyeshwa.', 'Contact happens inside the app; no phone number is shown.')}</span></li>
        <li>${icon('i-clock', 'is-muted')}<span>${L('Upatikanaji', 'Availability')}: ${esc(p.availability || L('haijulikani', 'unknown'))}</span></li>
      </ul>
    `)}

    <div class="gh-net-btnrow">
      ${btn(L('Omba msaada', 'Request support'), { act: 'support.newFor', id: p.id, tone: 'primary', iconId: 'i-send' })}
      ${btn(L('Ripoti wasifu', 'Report profile'), { act: 'safety.reportPrompt', id: p.id, tone: 'ghost', iconId: 'i-flag', extra: `data-subject="provider" data-target="${esc(p.id)}"` })}
    </div>

    ${note(L('Hakuna uthibitisho wa leseni unawezekana bila mthibitishaji. Hii inamaanisha: huyu si “daktari aliyethibitishwa” kwa GuardHai.', 'A licence cannot be verified without an authority. That means: this is not a “GuardHai-verified doctor”.'), 'warn')}
  `;
  return { title: L('Mtoa huduma', 'Provider'), subtitle: esc(p.name), body, back: 'support.providers' };
}

[home, newRequest, request, providers, provider].forEach((fn) => { fn.partition = 'support'; });
request.back = 'support.home';
providers.back = 'support.home';
provider.back = 'support.providers';

export const SUPPORT_SCREENS = {
  'support.home': home,
  'support.new': newRequest,
  'support.request': request,
  'support.providers': providers,
  'support.provider': provider
};

export { cat as categoryOf };
