/**
 * GuardHai · features/health/health-screens-network.js
 * The clinical-network screens: case discussions, meetings, communities,
 * referrals/handover and the professional profile.
 *
 * Invitations, deliveries and verification are states on this device, never
 * network events — every screen says so where a person would otherwise assume
 * something had been sent.
 */

import {
  L, T, esc, chip, btn, block, rows, row, dl, empty, callout, legend, form, field, select, textarea, check,
  fileField, view, fmtDate, fmtDateTime, fmtDay, todayISO, verificationNote, stat
} from './health-ui.js';
import {
  Store, SPECIALTIES, DOCTORS, COMMUNITIES, CASE_STATUS, REFERRAL_STATUS
} from './health-store.js';

const docOf = (id) => DOCTORS.find((d) => d.id === id) || null;
const specOptions = () => SPECIALTIES.map((s, i) => [String(i), T(s)]);
const URGENCY = {
  routine: { sw: 'Kawaida', en: 'Routine' },
  soon: { sw: 'Hivi karibuni', en: 'Soon' },
  urgent: { sw: 'Haraka', en: 'Urgent' }
};
const urgencyLabel = (id) => T(URGENCY[id] || { sw: id, en: id });
const statusOf = (map, key) => {
  const s = map[key];
  return s ? chip(T(s), s.tone) : chip(String(key));
};

/* --------------------------------------------------------------- case rooms */

export function screenCases() {
  const list = Store.cases();
  const html = list.length
    ? rows(list.map((c) => row({
      icon: 'i-message',
      title: c.title,
      sub: `${T(SPECIALTIES[c.specialty] || {})} · ${L('Majibu', 'Replies')}: ${c.replies.length}`,
      chips: [statusOf(CASE_STATUS, c.status), c.synthetic ? chip(L('Sampuli', 'Sample'), 'warn') : chip(L('Kifaa pekee', 'Device only'), 'neutral')],
      action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'case-view', 'data-id': c.id }, cls: 'is-small' })
    })))
    : empty({
      icon: 'i-message',
      title: L('Hakuna majadiliano bado', 'No discussions yet'),
      body: L('Anzisha mjadala wa kesi kwa wataalamu wenzako. Majadiliano haya ni maoni ya wenzao, si ushauri wa kimatibabu kwa mgonjwa.',
        'Start a case discussion with peers. These are peer opinions, not medical advice for a patient.'),
      action: btn(L('Anzisha mjadala', 'Start a discussion'), 'open', { extra: { 'data-screen': 'case-new' }, tone: 'primary', icon: 'i-plus' })
    });

  return `<div class="gh-health-section-head">
      <div>
        <h3 class="gh-health-section-title">${L('Majadiliano ya kesi', 'Case discussions')}</h3>
        <p class="gh-health-section-sub">${L('Maoni ya wataalamu wenzako, si uamuzi wa kimatibabu', 'Peer opinions, not a clinical decision')}</p>
      </div>
      ${btn(L('Mjadala mpya', 'New discussion'), 'open', { extra: { 'data-screen': 'case-new' }, tone: 'primary', icon: 'i-plus', cls: 'is-small' })}
    </div>
    ${html}
    ${callout(L('Weka tu taarifa zinazohitajika kwa mjadala. Usiweke namba za kitambulisho, namba za simu au majina kamili ya wagonjwa.',
      'Share only what the discussion needs. Never include ID numbers, phone numbers or full patient names.'), 'warn')}`;
}

export function screenCaseNew() {
  const body = [
    field({ label: L('Kichwa cha mjadala', 'Discussion title'), name: 'title', required: true, placeholder: L('Mfano: Uchunguzi wa homa inayoendelea', 'For example: Work-up for persistent fever') }),
    select({ label: L('Fani', 'Specialty'), name: 'specialty', options: specOptions() }),
    select({
      label: L('Kipaumbele', 'Urgency'), name: 'urgency', value: 'routine',
      options: [['routine', L('Kawaida', 'Routine')], ['soon', L('Hivi karibuni', 'Soon')], ['urgent', L('Haraka', 'Urgent')]]
    }),
    textarea({
      label: L('Muhtasari wa kesi', 'Case summary'), name: 'summary', required: true, rows: 6,
      help: L('Angalau herufi 20. Usiweke taarifa zinazomtambulisha mgonjwa.', 'At least 20 characters. Do not include identifying details.')
    })
  ].join('');
  return form('case', body, { submitLabel: L('Anzisha mjadala', 'Start discussion'), tone: 'primary' })
    + callout(L('Mjadala unahifadhiwa kwenye kifaa hiki. Hakuna mtaalamu anayealikwa na hakuna arifa inayotumwa.',
      'The discussion is stored on this device. No specialist is invited and no notification is sent.'), 'warn');
}

export function screenCaseView(id) {
  const c = Store.caseRoom(id);
  if (!c) {
    return empty({ icon: 'i-message', title: L('Mjadala haupo', 'Discussion not found'), body: L('Huenda kiungo si sahihi.', 'The link may be wrong.') });
  }

  const replies = c.replies.length
    ? c.replies.map((r) => `<div class="gh-health-post">
        <div class="gh-health-post-head">
          <span class="gh-health-post-ava">${esc((r.author || 'GH').slice(0, 2).toUpperCase())}</span>
          <div><b>${esc(r.author || L('Mwanachama', 'Member'))}</b><small>${esc(fmtDateTime(r.at))}</small></div>
        </div>
        <div class="gh-health-post-body"><p>${esc(r.body)}</p></div>
        <div class="gh-health-post-foot">${chip(L('Maoni ya mwenzako', 'Peer opinion'), 'info')}</div>
      </div>`).join('')
    : '<p class="gh-health-hint">' + L('Hakuna majibu bado.', 'No replies yet.') + '</p>';

  const replyForm = form('case-reply', [
    `<input type="hidden" name="id" value="${esc(c.id)}">`,
    textarea({ label: L('Jibu lako', 'Your reply'), name: 'body', required: true, rows: 4 }),
    select({
      label: L('Aina ya mchango', 'Type of input'), name: 'stance', value: 'peer-opinion',
      options: [['peer-opinion', L('Maoni ya mwenzako', 'Peer opinion')], ['question', L('Swali', 'Question')], ['experience', L('Uzoefu wangu', 'My experience')]]
    })
  ].join(''), { submitLabel: L('Tuma jibu', 'Post reply'), tone: 'primary', submitIcon: 'i-send' });

  const summaryForm = form('case-summary', [
    `<input type="hidden" name="id" value="${esc(c.id)}">`,
    textarea({ label: L('Muhtasari wa mwisho', 'Closing summary'), name: 'summary', value: c.summaryNote, rows: 3, help: L('Hifadhi kile kilichojadiliwa, bila kudai uamuzi wa kimatibabu.', 'Capture what was discussed without claiming a clinical decision.') })
  ].join(''), { submitLabel: L('Hifadhi muhtasari', 'Save summary'), tone: 'primary' });

  return block(c.title, dl([
    [L('Fani', 'Specialty'), T(SPECIALTIES[c.specialty] || {})],
    [L('Hali', 'Status'), { html: statusOf(CASE_STATUS, c.status) }],
    [L('Kipaumbele', 'Urgency'), urgencyLabel(c.urgency)],
    [L('Ilianzishwa', 'Started'), fmtDateTime(c.createdAt)],
    [L('Mwandishi', 'Author'), c.author || L('Wewe', 'You')],
    [L('Rejea', 'References'), L('Hakuna chanzo kilichothibitishwa', 'No verified source attached')]
  ]) + `<h4 class="gh-health-subhead">${L('Muhtasari', 'Summary')}</h4><p class="gh-health-body-text">${esc(c.summary)}</p>`, {
    action: c.synthetic ? chip(L('Sampuli', 'Sample'), 'warn') : ''
  })
    + block(`${L('Majadiliano', 'Discussions')} (${c.replies.length})`, replies + replyForm)
    + block(L('Hatua za mjadala', 'Discussion actions'), `<div class="gh-health-actions">
        ${btn(L('Pandisha kwa mtaalamu mkuu', 'Escalate to a senior'), 'case-status', { extra: { 'data-id': c.id, 'data-status': 'escalated' }, icon: 'i-flag' })}
        ${btn(L('Funga mjadala', 'Close discussion'), 'case-status', { extra: { 'data-id': c.id, 'data-status': 'closed' }, icon: 'i-check' })}
      </div>`, { note: L('Kupandisha ni lebo kwenye kifaa hiki. Hakuna mtu anayepewa taarifa.', 'Escalating is a label on this device. Nobody is notified.') })
    + block(L('Muhtasari wa mwisho', 'Closing summary'), summaryForm);
}

/* ------------------------------------------------------------------ meetings */

export function screenMeetings() {
  const list = Store.meetings();
  const html = list.length
    ? rows(list.map((m) => row({
      icon: 'i-video',
      title: m.title,
      sub: `${fmtDay(m.date)} · ${m.time} · ${m.duration} ${L('dakika', 'min')}`,
      chips: [m.synthetic ? chip(L('Sampuli', 'Sample'), 'warn') : chip(L('Kifaa pekee', 'Device only'), 'neutral')],
      action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'meeting-view', 'data-id': m.id }, cls: 'is-small' })
    })))
    : empty({
      icon: 'i-video',
      title: L('Hakuna mikutano', 'No meetings'),
      body: L('Panga mkutano wa kitaalamu kwa ratiba na ajenda. Hakuna mwaliko unaotumwa.', 'Plan a professional meeting with a schedule and agenda. No invitation is sent.'),
      action: btn(L('Panga mkutano', 'Schedule a meeting'), 'open', { extra: { 'data-screen': 'meeting-new' }, tone: 'primary', icon: 'i-plus' })
    });

  return `<div class="gh-health-section-head">
      <div>
        <h3 class="gh-health-section-title">${L('Mikutano ya kitaalamu', 'Professional meetings')}</h3>
        <p class="gh-health-section-sub">${L('Ratiba, ajenda na kumbukumbu', 'Schedule, agenda and notes')}</p>
      </div>
      ${btn(L('Panga', 'Schedule'), 'open', { extra: { 'data-screen': 'meeting-new' }, tone: 'primary', icon: 'i-plus', cls: 'is-small' })}
    </div>${html}`;
}

export function screenMeetingNew() {
  const body = [
    field({ label: L('Kichwa', 'Title'), name: 'title', required: true }),
    field({ label: L('Tarehe', 'Date'), name: 'date', type: 'date', required: true, min: todayISO() }),
    field({ label: L('Saa', 'Time'), name: 'time', type: 'time', required: true }),
    field({ label: L('Muda (dakika)', 'Duration (minutes)'), name: 'duration', value: '45', inputmode: 'numeric' }),
    field({ label: L('Mwenyeji', 'Host'), name: 'host', placeholder: L('Jina la mwenyeji', 'Host name') }),
    textarea({ label: L('Ajenda', 'Agenda'), name: 'agenda', rows: 4 })
  ].join('');
  return form('meeting', body, { submitLabel: L('Hifadhi mkutano', 'Save meeting'), tone: 'primary' })
    + callout(L('Hakuna mwaliko, SMS au barua pepe inayotumwa. Mkutano unabaki kwenye kifaa hiki.', 'No invitation, SMS or email is sent. The meeting stays on this device.'), 'warn');
}

export function screenMeetingView(id) {
  const m = Store.meeting(id);
  if (!m) {
    return empty({ icon: 'i-video', title: L('Mkutano haupo', 'Meeting not found'), body: L('Huenda kiungo si sahihi.', 'The link may be wrong.') });
  }

  const followUps = m.followUps.length
    ? rows(m.followUps.map((f) => row({ icon: 'i-check', title: f.text, sub: fmtDateTime(f.at) })))
    : '<p class="gh-health-hint">' + L('Hakuna hatua zinazofuata.', 'No follow-ups recorded.') + '</p>';

  const notesForm = form('meeting-notes', [
    `<input type="hidden" name="id" value="${esc(m.id)}">`,
    textarea({ label: L('Kumbukumbu', 'Notes'), name: 'notes', value: m.notes, rows: 4 }),
    textarea({ label: L('Maamuzi', 'Outcomes'), name: 'outcomes', value: m.outcomes, rows: 3 })
  ].join(''), { submitLabel: L('Hifadhi kumbukumbu', 'Save notes'), tone: 'primary' });

  const followForm = form('meeting-followup', [
    `<input type="hidden" name="id" value="${esc(m.id)}">`,
    field({ label: L('Hatua inayofuata', 'Follow-up action'), name: 'followUp', required: true })
  ].join(''), { submitLabel: L('Ongeza', 'Add'), tone: 'blue', submitIcon: 'i-plus' });

  return block(m.title, dl([
    [L('Tarehe', 'Date'), fmtDay(m.date)],
    [L('Saa', 'Time'), m.time],
    [L('Muda', 'Duration'), `${m.duration} ${L('dakika', 'minutes')}`],
    [L('Mwenyeji', 'Host'), m.host || '—'],
    [L('Ajenda', 'Agenda'), m.agenda || '—'],
    [L('Ushiriki', 'Attendance'), L('Haujarekodiwa', 'Not recorded')],
    [L('Ualikwaji', 'Invitations'), L('Hakuna aliyebarikiwa — haijatumwa', 'Nobody invited — not sent')],
    [L('Kurekodi', 'Recording'), L('Hakuna', 'None')]
  ]), { action: m.synthetic ? chip(L('Sampuli', 'Sample'), 'warn') : '' })
    + block(L('Kumbukumbu za mkutano', 'Meeting notes'), notesForm)
    + block(L('Hatua zinazofuata', 'Follow-ups'), followUps + followForm)
    + legend(L('Hakuna mwaliko uliotumwa, hakuna kurekodi, na hakuna muhtasari unaoshirikiwa na mtu yeyote.', 'Nothing was invited, nothing was recorded, and nothing is shared with anyone.'), 'i-info');
}

/* -------------------------------------------------------------- communities */

export function screenCommunities() {
  const memberships = Store.memberships();
  const grid = COMMUNITIES.map((c) => {
    const joined = memberships.includes(c.id);
    const posts = Store.communityPosts(c.id).length;
    return `<div class="gh-health-card">
      <span class="gh-health-card-ico"><svg class="ic" aria-hidden="true"><use href="#${c.icon}"/></svg></span>
      <span class="gh-health-card-title">${esc(c.name)}</span>
      <span class="gh-health-card-sub">${posts} ${L('machapisho', 'posts')} · ${joined ? L('umejiunga', 'joined') : L('hujajiunga', 'not joined')}</span>
      <div class="gh-health-actions">
        ${btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'community-view', 'data-id': c.id }, cls: 'is-small' })}
        ${btn(joined ? L('Ondoka', 'Leave') : L('Jiunge', 'Join'), 'community-join', { extra: { 'data-id': c.id }, cls: 'is-small', tone: joined ? '' : 'primary' })}
      </div>
    </div>`;
  }).join('');

  return `<p class="gh-health-hint">${L(`${COMMUNITIES.length} jamii za kitaalamu. Kujiunga ni lebo kwenye kifaa hiki — hakuna mtu anayepewa taarifa.`, `${COMMUNITIES.length} professional communities. Joining is a label on this device — nobody is notified.`)}</p>
    <div class="gh-health-grid">${grid}</div>
    ${callout(L('Majadiliano haya ni ya wataalamu kwa mfano. Hayatoi ushauri wa kimatibabu kwa mgonjwa halisi.', 'These discussions are sample professional content. They do not give medical advice for a real patient.'), 'info')}`;
}

export function screenCommunityView(id) {
  const c = COMMUNITIES.find((x) => x.id === id);
  if (!c) {
    return empty({ icon: 'i-users', title: L('Jamii haipo', 'Community not found'), body: L('Huenda kiungo si sahihi.', 'The link may be wrong.') });
  }
  const joined = Store.isMember(c.id);
  const posts = Store.communityPosts(c.id);

  const postList = posts.length
    ? posts.map((p) => `<div class="gh-health-post">
        <div class="gh-health-post-head">
          <span class="gh-health-post-ava">${esc((p.author || 'GH').slice(0, 2).toUpperCase())}</span>
          <div><b>${esc(p.author || L('Mwanachama', 'Member'))}</b><small>${esc(fmtDateTime(p.at))}</small></div>
        </div>
        <div class="gh-health-post-body"><p>${esc(p.body)}</p></div>
        <div class="gh-health-post-foot">
          <button type="button" class="gh-health-textbtn" data-hx="post-report" data-id="${p.id}">${L('Ripoti', 'Report')}</button>
        </div>
      </div>`).join('')
    : '<p class="gh-health-hint">' + L('Hakuna machapisho bado.', 'No posts yet.') + '</p>';

  const postForm = joined
    ? form('community-post', [
      `<input type="hidden" name="id" value="${esc(c.id)}">`,
      textarea({ label: L('Chapisha kwa jamii', 'Post to the community'), name: 'body', required: true, rows: 4, help: L('Usiweke taarifa zinazomtambulisha mgonjwa.', 'Do not include details that identify a patient.') })
    ].join(''), { submitLabel: L('Chapisha', 'Post'), tone: 'primary', submitIcon: 'i-send' })
    : callout(L('Jiunge kwanza ili kuchapisha. Kujiunga ni lebo ya kifaa hiki.', 'Join first to post. Joining is a device-only label.'), 'info');

  return block(c.name, `<p class="gh-health-body-text">${L('Jamii ya wataalamu kwa fani hii. Machapisho yote yanabaki kwenye kifaa hiki.', 'A professional community for this specialty. Every post stays on this device.')}</p>`, {
    action: btn(joined ? L('Ondoka', 'Leave') : L('Jiunge', 'Join'), 'community-join', { extra: { 'data-id': c.id }, cls: 'is-small', tone: joined ? '' : 'primary' })
  })
    + block(L('Machapisho', 'Posts'), postList)
    + block(L('Chapisha', 'Post'), postForm, { note: L('Hakuna msimamizi aliyeunganishwa; taarifa za kuripoti zinabaki kwenye kifaa hiki.', 'No moderator is connected; reports stay on this device.') });
}

/* ---------------------------------------------------------------- referrals */

export function screenReferrals() {
  const list = Store.referrals();
  const html = list.length
    ? rows(list.map((r) => row({
      icon: 'i-send',
      title: docOf(r.doctorId) ? docOf(r.doctorId).name : L('Mtaalamu', 'Professional'),
      sub: `${fmtDate(r.createdAt)} · ${r.reason.slice(0, 48)}`,
      chips: [statusOf(REFERRAL_STATUS, r.status), chip(L('Haijawasilishwa', 'Not delivered'), 'warn')],
      action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'referral-view', 'data-id': r.id }, cls: 'is-small' })
    })))
    : empty({
      icon: 'i-send',
      title: L('Hakuna rufaa', 'No referrals'),
      body: L('Andaa rufaa na uikague kabla ya kuamua nini cha kufanya. Hakuna rufaa inayowasilishwa na app hii.',
        'Prepare a referral and review it before deciding what to do. This app delivers nothing.'),
      action: btn(L('Andaa rufaa', 'Prepare a referral'), 'open', { extra: { 'data-screen': 'referral-new' }, tone: 'primary', icon: 'i-plus' })
    });

  return `<div class="gh-health-section-head">
      <div>
        <h3 class="gh-health-section-title">${L('Rufaa na makabidhiano', 'Referrals & handover')}</h3>
        <p class="gh-health-section-sub">${L('Kila rufaa inaonyesha wazi kuwa haijawasilishwa', 'Every referral says plainly that it is not delivered')}</p>
      </div>
      ${btn(L('Andaa', 'Prepare'), 'open', { extra: { 'data-screen': 'referral-new' }, tone: 'primary', icon: 'i-plus', cls: 'is-small' })}
    </div>${html}`;
}

export function screenReferralNew(doctorId) {
  const records = Store.records();
  const recordChecks = records.length
    ? records.map((r) => check({ label: `${r.title} · ${fmtDate(r.date)}`, name: `record-${r.id}` })).join('')
    : '<p class="gh-health-hint">' + L('Hakuna rekodi za kuambatanisha.', 'No records to attach.') + '</p>';

  const body = [
    select({
      label: L('Mtaalamu unayempeleka', 'Professional you are referring to'), name: 'doctorId', required: true,
      value: doctorId || '',
      options: [['', L('Chagua mtaalamu', 'Select a professional')]].concat(DOCTORS.map((d) => [d.id, `${d.name} — ${T(SPECIALTIES[d.specialty])}`]))
    }),
    select({ label: L('Kipaumbele', 'Urgency'), name: 'urgency', options: [['routine', L('Kawaida', 'Routine')], ['soon', L('Hivi karibuni', 'Soon')], ['urgent', L('Haraka', 'Urgent')]] }),
    textarea({ label: L('Sababu ya rufaa', 'Reason for referral'), name: 'reason', required: true, rows: 3, help: L('Angalau herufi 8.', 'At least 8 characters.') }),
    textarea({ label: L('Muhtasari (si lazima)', 'Summary (optional)'), name: 'summary', rows: 3 }),
    `<fieldset class="gh-health-fieldset"><legend class="gh-health-legend-strong">${L('Rekodi za kuambatanisha', 'Records to attach')}</legend>${recordChecks}</fieldset>`
  ].join('');

  return form('referral', body, { submitLabel: L('Hifadhi rasimu', 'Save draft'), tone: 'primary' })
    + callout(L('Rasimu inabaki kwenye kifaa hiki. Hata baada ya kuiweka “tayari”, hakuna kinachotumwa kwa mtu yeyote.',
      'The draft stays on this device. Even after marking it “ready”, nothing is sent to anyone.'), 'warn');
}

export function screenReferralView(id) {
  const r = Store.referral(id);
  if (!r) {
    return empty({ icon: 'i-send', title: L('Rufaa haipo', 'Referral not found'), body: L('Huenda kiungo si sahihi.', 'The link may be wrong.') });
  }
  const d = docOf(r.doctorId);
  const records = r.recordIds.map((rid) => Store.record(rid)).filter(Boolean);

  const history = `<ul class="gh-health-timeline">${r.history.map((h) => {
    const s = REFERRAL_STATUS[h.status];
    return `<li><b>${esc(s ? T(s) : h.status)}</b><span>${esc(fmtDateTime(h.at))}</span>${h.note ? `<p>${esc(h.note)}</p>` : ''}</li>`;
  }).join('')}</ul>`;

  const actions = [];
  if (r.status === 'draft') actions.push(btn(L('Weka tayari (kifaa)', 'Mark ready (device)'), 'referral-ready', { extra: { 'data-id': r.id }, tone: 'primary', icon: 'i-check' }));
  if (r.status === 'ready') {
    actions.push(btn(L('Nimeikabidhi kwa mkono', 'I handed it over in person'), 'referral-respond', { extra: { 'data-id': r.id, 'data-action': 'accepted' }, icon: 'i-check' }));
    actions.push(btn(L('Imekataliwa', 'It was declined'), 'referral-respond', { extra: { 'data-id': r.id, 'data-action': 'declined' }, tone: 'danger', icon: 'i-x' }));
  }

  return block(d ? d.name : L('Mtaalamu', 'Professional'), dl([
    [L('Hali', 'Status'), { html: statusOf(REFERRAL_STATUS, r.status) }],
    [L('Kipaumbele', 'Urgency'), urgencyLabel(r.urgency)],
    [L('Sababu', 'Reason'), r.reason],
    [L('Muhtasari', 'Summary'), r.summary || '—'],
    [L('Rekodi zilizoambatishwa', 'Attached records'), records.length ? records.map((x) => x.title).join(' · ') : L('Hakuna', 'None')],
    [L('Iliundwa', 'Created'), fmtDateTime(r.createdAt)],
    [L('Imewasilishwa', 'Delivered'), r.delivered ? L('Ndiyo', 'Yes') : L('Hapana — hakuna njia ya kuwasilisha iliyounganishwa', 'No — no delivery channel is connected')]
  ]) + history, { action: chip(L('Haijawasilishwa', 'Not delivered'), 'warn') })
    + (actions.length ? block(L('Vitendo vya kifaa', 'Device actions'), `<div class="gh-health-actions">${actions.join('')}</div>`, {
      note: L('Vitendo hivi hubadilisha hali kwenye kifaa hiki pekee; hakuna mtu anayepewa taarifa.', 'These actions change the state on this device only; nobody is notified.')
    }) : '')
    + callout(L('Kama mgonjwa anahitaji huduma ya haraka, piga nambari ya dharura au mpeleke kituo cha afya.', 'If the patient needs urgent care, call an emergency number or take them to a facility.'), 'warn', 'i-siren');
}

/* ------------------------------------------------------- professional (E) */

export function screenPro() {
  const p = Store.proProfile();
  const body = [
    field({ label: L('Jina kamili', 'Full name'), name: 'name', value: p.name, required: true }),
    select({ label: L('Fani', 'Specialty'), name: 'specialty', value: String(p.specialty), options: specOptions() }),
    field({ label: L('Kituo', 'Facility'), name: 'facility', value: p.facility }),
    field({ label: L('Sifa', 'Qualification'), name: 'qualification', value: p.qualification, required: true, help: L('Mfano: MD, MMed', 'For example: MD, MMed') }),
    field({ label: L('Nambari ya leseni', 'Licence number'), name: 'licence', value: p.licence })
  ].join('');

  const docs = p.documents.length
    ? rows(p.documents.map((d) => row({
      icon: 'i-folder', title: d.name, sub: `${Math.round(d.size / 1024)} KB · ${fmtDate(d.addedAt)}`,
      chips: [chip(L('Haijapakiwa', 'Not uploaded'), 'warn')]
    })))
    : '<p class="gh-health-hint">' + L('Hakuna nyaraka.', 'No documents.') + '</p>';

  const submit = p.verification === 'pending-review'
    ? callout(L('Wasilisho lako limehifadhiwa kwenye kifaa hiki. Hakuna mhakiki aliyeunganishwa, kwa hivyo halitapimwa.',
      'Your submission is stored on this device. No reviewer is connected, so it will not be assessed.'), 'warn', 'i-clock')
    : `<div class="gh-health-actions">${btn(L('Wasilisha kwa mhakiki', 'Submit for review'), 'pro-submit', { tone: 'primary', icon: 'i-send' })}</div>`;

  return block(L('Wasifu wa kitaalamu', 'Professional profile'), verificationNote(p.verification) + form('pro', body, {
    submitLabel: L('Hifadhi wasifu', 'Save profile'), tone: 'primary'
  }), { note: L('Taarifa hizi zinabaki kwenye kifaa hiki. Hazithibitishi taaluma yako.', 'These details stay on this device. They do not verify your credentials.') }, { tone: 'green', icon: 'i-badge-check' })
    + block(L('Nyaraka', 'Documents'), docs + form('pro-doc', fileField({ label: L('Ambatisha cheti au leseni', 'Attach a certificate or licence'), name: 'document', help: L('Faili linabaki kwenye kifaa hiki; halipakiwi.', 'The file stays on this device; it is not uploaded.') }), {
      submitLabel: L('Ambatisha', 'Attach'), tone: 'blue', submitIcon: 'i-plus'
    }), { note: L('Hakuna nyaraka inayopakiwa. “Haijapakiwa” ni hali halisi ya faili hili.', 'Nothing is uploaded. “Not uploaded” is the real state of this file.') })
    + block(L('Uthibitisho', 'Verification'), submit, {
      note: L('Uthibitisho unaweza kutolewa tu na mhakiki aliyeidhinishwa kwenye mfumo halisi. App hii haitoi alama ya uthibitisho.',
        'Verification can only be granted by an authorised reviewer in a real system. This app never issues a verified badge.')
    });
}

export const networkScreens = {
  cases: { parent: 'experts', title: () => L('Majadiliano ya kesi', 'Case discussions'), sub: () => L('Maoni ya wenzako kwa mfano', 'Sample peer input'), render: screenCases },
  'case-new': { parent: 'experts', title: () => L('Mjadala mpya', 'New discussion'), sub: () => L('Hauna mwaliko unaotumwa', 'No invitation is sent'), render: screenCaseNew },
  'case-view': { parent: 'experts', title: () => L('Mjadala wa kesi', 'Case discussion'), sub: () => L('Majadiliano ya kifaa hiki', 'Discussion on this device'), render: screenCaseView },
  meetings: { parent: 'experts', title: () => L('Mikutano', 'Meetings'), sub: () => L('Ratiba ya kifaa hiki', 'Schedule on this device'), render: screenMeetings },
  'meeting-new': { parent: 'experts', title: () => L('Panga mkutano', 'Schedule a meeting'), sub: () => L('Hakuna mwaliko unaotumwa', 'No invitation is sent'), render: screenMeetingNew },
  'meeting-view': { parent: 'experts', title: () => L('Mkutano', 'Meeting'), sub: () => L('Kumbukumbu za kifaa', 'Notes on this device'), render: screenMeetingView },
  communities: { parent: 'experts', title: () => L('Jamii za kitaalamu', 'Professional communities'), sub: () => L('Majadiliano ya mfano', 'Sample discussions'), render: screenCommunities },
  'community-view': { parent: 'experts', title: () => L('Jamii', 'Community'), sub: () => L('Machapisho ya kifaa hiki', 'Posts on this device'), render: screenCommunityView },
  referrals: { parent: 'experts', title: () => L('Rufaa', 'Referrals'), sub: () => L('Hakuna inayowasilishwa', 'Nothing is delivered'), render: screenReferrals },
  'referral-new': { parent: 'experts', title: () => L('Andaa rufaa', 'Prepare a referral'), sub: () => L('Rasimu ya kifaa hiki', 'A draft on this device'), render: screenReferralNew },
  'referral-view': { parent: 'experts', title: () => L('Rufaa', 'Referral'), sub: () => L('Haijawasilishwa kwa mtu yeyote', 'Not delivered to anyone'), render: screenReferralView },
  pro: { parent: 'experts', title: () => L('Wasifu wa kitaalamu', 'Professional profile'), sub: () => L('Uthibitisho haujatolewa', 'Verification is never granted'), render: screenPro }
};
