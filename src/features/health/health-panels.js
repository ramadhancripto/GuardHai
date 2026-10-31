/**
 * GuardHai · features/health/health-panels.js
 * The six partitions of the Health section: overview, medical, records, meds,
 * experts and more. Each panel is a pure function that reads the device-local
 * store and returns HTML; every action it renders is handled by health-actions.
 */

import {
  L, T, esc, icon, chip, btn, iconBtn, section, block, rows, row, facts, dl, stat,
  empty, callout, legend, meter, progressRow, flashBox, view, fmtDate, fmtDateTime, fmtDay,
  SAMPLE_CHIP, verificationNote, A, todayISO
} from './health-ui.js';
import {
  Store, RECORD_CATEGORIES, APPT_STATUS, CASE_STATUS, REFERRAL_STATUS, SPECIALTIES, DOCTORS, COMMUNITIES
} from './health-store.js';

const catLabel = (id) => {
  const c = RECORD_CATEGORIES.find((x) => x.id === id);
  return c ? T(c) : id;
};
const catIcon = (id) => (RECORD_CATEGORIES.find((x) => x.id === id) || {}).icon || 'i-file-medical';
const doctor = (id) => DOCTORS.find((d) => d.id === id) || { name: '—', initials: '—', facility: '' };
const statusChip = (map, key) => {
  const s = map[key];
  return s ? chip(T(s), s.tone) : chip(String(key));
};

/* --------------------------------------------------------------- overview */

export function panelOverview() {
  const o = Store.overview();
  const m = Store.medicalId();
  const hasMedical = Boolean(m.fullName);
  const doses = o.today;
  const doseText = doses.total ? `${doses.taken}/${doses.total}` : L('Hakuna', 'None');
  const next = o.nextAppointment;
  const medFacts = hasMedical
    ? facts([
      [L('Kundi la damu', 'Blood group'), m.blood],
      [L('Mzio', 'Allergies'), m.allergies ? L('Imerekodiwa', 'Recorded') : L('Haijawekwa', 'Not set')],
      [L('Magonjwa', 'Conditions'), m.conditions ? L('Imerekodiwa', 'Recorded') : L('Haijawekwa', 'Not set')],
      [L('Masaa', 'Updated'), m.updatedAt ? fmtDate(m.updatedAt) : L('Bado', 'Not yet')]
    ])
    : '';

  const medicalCard = `<div class="gh-health-mid">
    <div class="gh-health-mid-top">
      <span class="gh-health-mid-badge">${icon('i-id-card')}</span>
      <div class="gh-health-mid-titles">
        <h3 class="gh-health-mid-title">${L('Medical ID', 'Medical ID')} ${o.completion.pct === 100 ? chip(L('Kamili', 'Complete'), 'ok', 'i-check') : ''}</h3>
        <p class="gh-health-mid-sub">${hasMedical
    ? esc(L(`${m.fullName} · imehifadhiwa kwenye kifaa hiki pekee`, `${m.fullName} · stored on this device only`))
    : L('Bado haijaanzishwa', 'Not started yet')}</p>
      </div>
    </div>
    <div class="gh-health-mid-body">
      ${hasMedical ? medFacts : `<p class="gh-health-hint">${L('Weka taarifa muhimu ambazo mtu wa karibu au mtoa huduma anaweza kuhitaji — bila kuunganisha seva yoyote.', 'Store the essentials someone close to you or a clinician may need — without connecting any server.')}</p>`}
      ${meter(o.completion.pct, L('Wasifu umekamilika', 'Profile completeness'))}
      <p class="gh-health-hint">${L('Umekamilika', 'Complete')}: ${o.completion.done}/${o.completion.total}</p>
    </div>
    <div class="gh-health-mid-actions">
      ${btn(hasMedical ? L('Fungua Medical ID', 'Open Medical ID') : L('Tengeneza Medical ID', 'Create Medical ID'), 'open', { extra: { 'data-screen': 'medical-profile' }, tone: hasMedical ? 'primary' : 'primary', icon: 'i-id-card' })}
      ${btn(L('Hariri', 'Edit'), 'open', { extra: { 'data-screen': 'medical-edit' }, icon: 'i-edit' })}
      ${btn(L('Nambari ya QR', 'QR access'), 'open', { extra: { 'data-screen': 'medical-qr' }, icon: 'i-qr' })}
    </div>
  </div>`;

  const quick = `<div class="gh-health-grid">
    ${[
      ['doctors', 'i-stethoscope', 'green', L('Tafuta mtaalamu', 'Find a doctor'), L(`${DOCTORS.length} wasifu wa mfano`, `${DOCTORS.length} sample profiles`)],
      ['appointments', 'i-calendar', 'blue', L('Miadi', 'Appointments'), o.appointments ? L(`${o.appointments} inayofuata`, `${o.appointments} upcoming`) : L('Hakuna', 'None yet')],
      ['blood', 'i-droplet', 'violet', L('Upatikanaji wa damu', 'Blood availability'), L('Orodha ya mfano', 'Sample listing')],
      ['emergency', 'i-siren', 'red', L('Dharura ya kimatibabu', 'Medical emergency'), L('Haijatumwa kamwe', 'Never transmitted')]
    ].map(([screen, ico, tone, title, sub]) => `<button type="button" class="gh-health-card" data-tone="${tone}" ${A('open', { 'data-screen': screen })}>
      <span class="gh-health-card-ico">${icon(ico)}</span>
      <span class="gh-health-card-title">${esc(title)}</span>
      <span class="gh-health-card-sub">${esc(sub)}</span>
    </button>`).join('')}
  </div>`;

  const network = rows([
    row({ tone: 'teal', icon: 'i-message', title: L('Majadiliano ya kesi', 'Case discussions'), sub: L('Mikutano ya wataalamu, si ushauri wa kibinafsi', 'Peer forums, not personal advice'), meta: String(o.openCases), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'cases' }, cls: 'is-small' }) }),
    row({ tone: 'blue', icon: 'i-video', title: L('Mikutano ya kitaalamu', 'Professional meetings'), sub: L('Ratiba na kumbukumbu za kifaa', 'Schedule and notes stay local'), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'meetings' }, cls: 'is-small' }) }),
    row({ tone: 'violet', icon: 'i-users', title: L('Jamii za kitaalamu', 'Professional communities'), sub: L(`${COMMUNITIES.length} jamii`, `${COMMUNITIES.length} communities`), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'communities' }, cls: 'is-small' }) }),
    row({ tone: 'amber', icon: 'i-send', title: L('Rufaa na makabidhiano', 'Referrals & handover'), sub: L('Hakuna rufaa inayowasilishwa na app hii', 'Nothing is delivered by this app'), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'referrals' }, cls: 'is-small' }) }),
    row({ tone: 'green', icon: 'i-badge-check', title: L('Wasifu wa kitaalamu', 'Professional profile'), sub: L('Uthibitisho haujatolewa na app', 'Verification is never granted here'), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'pro' }, cls: 'is-small' }) })
  ]);

  const activity = Store.getState().audit.slice(0, 4);
  const activityHtml = activity.length
    ? `<ul class="gh-health-timeline">${activity.map((a) => `<li><b>${esc(a.event)}</b><span>${esc(fmtDateTime(a.at))}</span>${a.detail ? `<p>${esc(a.detail)}</p>` : ''}</li>`).join('')}</ul>`
    : empty({
      icon: 'i-activity',
      title: L('Hakuna shughuli bado', 'No activity yet'),
      body: L('Kila kitu unachohifadhi au kubadilisha kitaonekana hapa — kumbukumbu hii inabaki kwenye kifaa hiki.', 'Anything you save or change appears here — this log never leaves the device.')
    });

  return `${flashBox()}
    <div class="gh-health-stats">
      ${stat({ tone: 'teal', label: L('Wasifu', 'Profile'), value: `${o.completion.pct}%`, sub: L('umekamilika', 'complete'), action: 'open', extra: { 'data-screen': 'medical-profile' } })}
      ${stat({ tone: 'amber', label: L('Dozi leo', 'Doses today'), value: doseText, sub: doses.total ? L('zimewekwa', 'logged') : L('hakuna dawa', 'no medication'), action: 'tab', extra: { 'data-tab': 'meds' } })}
      ${stat({ tone: 'blue', label: L('Miadi', 'Appointments'), value: String(o.appointments), sub: next ? fmtDay(next.date) : L('hakuna', 'none'), action: 'open', extra: { 'data-screen': 'appointments' } })}
      ${stat({ tone: 'violet', label: L('Rekodi', 'Records'), value: String(o.records), sub: L('kwenye kifaa', 'on device'), action: 'tab', extra: { 'data-tab': 'records' } })}
    </div>
    ${medicalCard}
    ${section(L('Huduma za haraka', 'Quick services'), L('Njia za mkato — si menyu mpya', 'Shortcuts — not another menu'), quick)}
    ${section(L('Mtandao wa kitaalamu', 'Clinical network'), L('Majadiliano, mikutano, rufaa', 'Discussions, meetings, referrals'), network)}
    ${section(L('Shughuli za hivi karibuni', 'Recent activity'), L('Kumbukumbu ya kifaa pekee', 'Device-only log'), activityHtml)}`;
}

/* ---------------------------------------------------------------- medical */

export function panelMedical() {
  const m = Store.medicalId();
  const comp = Store.medicalCompletion();
  const contacts = Store.contactsFor();
  const token = Store.activeToken();
  const has = Boolean(m.fullName);
  const missingLabel = {
    fullName: L('jina', 'name'), dob: L('tarehe ya kuzaliwa', 'date of birth'), sex: L('jinsia', 'sex'),
    blood: L('kundi la damu', 'blood group'), allergies: L('mzio', 'allergies'),
    conditions: L('magonjwa sugu', 'conditions'), contacts: L('mtu wa dharura', 'emergency contact')
  };

  const body = `${facts([
      [L('Jina', 'Name'), m.fullName],
      [L('Kuzaliwa', 'Date of birth'), m.dob],
      [L('Jinsia', 'Sex'), m.sex],
      [L('Kundi la damu', 'Blood group'), m.blood],
      [L('Uzito', 'Weight'), m.weight],
      [L('Urefu', 'Height'), m.height]
    ])}
    ${dl([
      [L('Mzio', 'Allergies'), m.allergies || L('Hakuna iliyorekodiwa', 'None recorded')],
      [L('Magonjwa sugu', 'Chronic conditions'), m.conditions || L('Hakuna iliyorekodiwa', 'None recorded')],
      [L('Maelezo', 'Notes'), m.notes || '—'],
      [L('Ilisasishwa', 'Updated'), m.updatedAt ? fmtDateTime(m.updatedAt) : '—']
    ])}`;

  const qrInner = token
    ? `<p class="gh-health-hint">${L('Kuna kiungo kinachotumika. Unaweza kukifuta wakati wowote.', 'One access link is active. You can revoke it at any time.')}</p>`
      + rows([row({ icon: 'i-qr', title: L('Kiungo cha ufikiaji', 'Access link'), sub: `…${esc(token.handle.slice(-6))} · ${L('hadi', 'until')} ${fmtDate(token.expiresAt)}`, chips: token.scopes.map((s) => chip(s, 'neutral')) })])
      + btn(L('Dhibiti kiungo', 'Manage link'), 'open', { extra: { 'data-screen': 'medical-qr' }, icon: 'i-qr' })
    : empty({ hue: 'violet', icon: 'i-qr', title: L('Hakuna kiungo cha QR', 'No QR link yet'), body: L('Kiungo hukupa mtu uliyemchagua taarifa zilizochaguliwa kwa muda — na unaweza kukifuta.', 'A link gives someone you choose the details you choose, for a limited time — and you can revoke it.') })
      + btn(L('Tengeneza kiungo', 'Create a link'), 'open', { extra: { 'data-screen': 'medical-qr' }, tone: 'primary', icon: 'i-qr' });
  const qrBlock = block(L('Ufikiaji kwa QR', 'QR access'), qrInner, { tone: 'violet', icon: 'i-qr' });

  const progress = progressRow({
    label: has ? L('Wasifu umekamilika', 'Profile complete') : L('Bado kuanza', 'Not started'),
    value: `${comp.pct}%`,
    pct: comp.pct,
    tone: 'teal'
  });

  return `${flashBox()}
    ${block(L('Taarifa za msingi', 'Core details'), `${progress}
      ${has
    ? body
    : empty({
      inline: true, hue: 'teal', icon: 'i-id-card',
      title: L('Medical ID bado haijaanzishwa', 'Medical ID is not started'),
      body: `${L('Bado:', 'Still missing:')} ${comp.missing.map((k) => missingLabel[k]).join(', ')}`,
      action: btn(L('Anza kuandika', 'Start filling it in'), 'open', { extra: { 'data-screen': 'medical-edit' }, tone: 'primary', icon: 'i-edit' })
    })}`,
    { tone: 'teal', icon: 'i-id-card', action: btn(L('Hariri', 'Edit'), 'open', { extra: { 'data-screen': 'medical-edit' }, icon: 'i-edit', cls: 'is-small' }) })}

    ${block(L('Watu wa dharura', 'Emergency contacts'), contacts.length
    ? rows(contacts.map((c) => row({
      icon: 'i-phone', title: c.name, sub: [c.relation, c.phone].filter(Boolean).join(' · '),
      chips: [chip(L('Kifaa pekee', 'Device only'), 'neutral')],
      action: iconBtn('i-trash', L('Ondoa', 'Remove'), 'contact-del', { 'data-id': c.id })
    })))
    : empty({
      hue: 'red', inline: true,
      icon: 'i-users', title: L('Hakuna mtu wa dharura', 'No emergency contacts'),
      body: L('Ongeza angalau mtu mmoja ambaye mtu mwingine anaweza kumpigia simu.', 'Add at least one person someone else could call.')
    }), { tone: 'red', icon: 'i-users', note: L('Nambari hizi hazipigwi wala kutumwa na app. Zinaonekana tu kwenye kifaa hiki.', 'These numbers are never dialled or sent by the app. They only appear on this device.') })}

    ${qrBlock}

    ${legend(L('Hakuna seva iliyounganishwa: hakuna uthibitisho wa utambulisho, hakuna kusawazisha kati ya vifaa.', 'No server is connected: no identity verification, no sync between devices.'), 'i-info')}`;
}

/* ---------------------------------------------------------------- records */

export function panelRecords() {
  const f = view.filter;
  const list = Store.records(f.q, f.cat);
  const total = Store.records().length;
  const seg = [`<button type="button" class="${f.cat === 'all' ? 'is-active' : ''}" ${A('filter', { 'data-filter': 'cat', 'data-value': 'all' })}>${L('Zote', 'All')}</button>`]
    .concat(RECORD_CATEGORIES.map((c) => `<button type="button" class="${f.cat === c.id ? 'is-active' : ''}" ${A('filter', { 'data-filter': 'cat', 'data-value': c.id })}>${esc(T(c))}</button>`))
    .join('');

  const listHtml = !total
    ? empty({
      icon: 'i-file-medical',
      title: L('Hakuna rekodi bado', 'No records yet'),
      body: L('Rekodi unazoongeza wewe mwenyewe hukaa kwenye kifaa hiki. Hakuna kituo, maabara au daktari aliyeunganishwa.', 'Records you add yourself stay on this device. No facility, laboratory or doctor is connected.'),
      hue: 'violet',
      action: btn(L('Ongeza rekodi', 'Add a record'), 'open', { extra: { 'data-screen': 'record-new' }, tone: 'primary', icon: 'i-plus' })
    })
    : list.length
      ? rows(list.map((r) => row({
        tone: 'violet',
        icon: catIcon(r.category),
        title: r.title,
        sub: `${catLabel(r.category)} · ${fmtDate(r.date)}${r.facility ? ' · ' + r.facility : ''}`,
        chips: [r.synthetic ? SAMPLE_CHIP() : chip(L('Nimeweka mwenyewe', 'Self-entered'), 'info')],
        action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'record-view', 'data-id': r.id }, cls: 'is-small' })
      })))
      : empty({
        inline: true, icon: 'i-search', hue: 'slate',
        title: L('Hakuna rekodi inayolingana', 'No records match'),
        body: L('Badilisha neno la utafutaji au chagua aina nyingine.', 'Change the search term or pick another category.')
      });

  return `${flashBox()}
    <div class="gh-health-section-head">
      <div>
        <h3 class="gh-health-section-title">${L('Rekodi zangu', 'My records')}</h3>
        <p class="gh-health-section-sub">${total ? L(`${total} rekodi kwenye kifaa hiki`, `${total} records on this device`) : L('Hakuna rekodi', 'No records')}</p>
      </div>
      ${btn(L('Ongeza', 'Add'), 'open', { extra: { 'data-screen': 'record-new' }, tone: 'primary', icon: 'i-plus', cls: 'is-small' })}
    </div>
    <div class="gh-health-searchrow">
      <label class="gh-health-search" for="hxRecordSearch">
        ${icon('i-search')}
        <input id="hxRecordSearch" type="search" placeholder="${esc(L('Tafuta jina la rekodi au kituo', 'Search a record or facility'))}"
          value="${esc(f.q)}" data-hx-input="filter" data-filter="q">
      </label>
      <div class="gh-health-seg" role="group" aria-label="${esc(L('Aina ya rekodi', 'Record category'))}">${seg}</div>
    </div>
    ${listHtml}
    ${legend(L('Rekodi hizi ni za kujaza mwenyewe. Hazithibitishi matokeo ya maabara wala uamuzi wa daktari.', 'These records are entered by you. They do not confirm a lab result or a clinical decision.'), 'i-info')}`;
}

/* ------------------------------------------------------------------- meds */

export function panelMeds() {
  const schedule = Store.scheduleFor();
  const sum = Store.doseSummary();
  const meds = Store.meds();
  const pct = sum.total ? Math.round((sum.taken / sum.total) * 100) : 0;
  const doseRow = (d) => `<div class="gh-health-dose is-${d.status}">
    <span class="gh-health-dose-time">${esc(d.time)}</span>
    <div class="gh-health-dose-copy">
      <b>${esc(d.name)}</b>
      <span>${esc(d.dose || L('Kipimo hakijatajwa', 'Dose not stated'))} · ${d.status === 'taken' ? L('imewekwa kama imetumika', 'logged as taken') : d.status === 'skipped' ? L('imewekwa kama imerukwa', 'logged as skipped') : d.status === 'missed' ? L('haikurekodiwa', 'not logged') : L('inasubiri', 'due')}</span>
    </div>
    <div class="gh-health-dose-actions">
      ${d.status === 'due' || d.status === 'missed'
    ? `${btn(L('Nimeitumia', 'Taken'), 'dose', { extra: { 'data-id': d.medId, 'data-time': d.time, 'data-status': 'taken' }, cls: 'is-small', tone: 'primary' })}
         ${btn(L('Nimeruka', 'Skipped'), 'dose', { extra: { 'data-id': d.medId, 'data-time': d.time, 'data-status': 'skipped' }, cls: 'is-small' })}`
    : `<button type="button" class="gh-health-textbtn" ${A('dose-undo', { 'data-id': d.medId, 'data-time': d.time })}>${L('Badilisha', 'Change')}</button>`}
    </div>
  </div>`;

  return `${flashBox()}
    ${block(L('Ratiba ya leo', 'Today’s schedule'), `${progressRow({
      label: L('Zimewekwa', 'Logged'),
      value: `${sum.taken}/${sum.total}${sum.missed ? ` · ${sum.missed} ${L('zimekosa', 'missed')}` : ''}`,
      pct,
      tone: 'amber'
    })}
      ${schedule.length ? schedule.map(doseRow).join('') : empty({ inline: true, hue: 'amber', icon: 'i-pill', title: L('Hakuna dozi leo', 'Nothing scheduled today'), body: L('Ongeza dawa na muda wake ili ratiba ionekane hapa.', 'Add a medicine and its times to see a schedule here.') })}`,
    { tone: 'amber', icon: 'i-clock', note: L('Kumbukumbu za dozi ni za kujirekodi. Hakuna kikumbusho kinachotumwa — hakuna huduma ya arifa iliyounganishwa.', 'Dose entries are self-reported. No reminder is sent — no notification service is connected.') })}

    ${block(L('Dawa zangu', 'My medicines'), meds.length
    ? rows(meds.map((m) => row({
      tone: 'amber',
      icon: 'i-pill',
      title: m.name,
      sub: [m.dose, m.times.join(' · ')].filter(Boolean).join(' — '),
      chips: [m.synthetic ? SAMPLE_CHIP() : chip(L('Kifaa pekee', 'Device only'), 'neutral')],
      action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'med-view', 'data-id': m.id }, cls: 'is-small' })
    })))
    : empty({
      hue: 'amber', icon: 'i-pill', title: L('Hakuna dawa zilizowekwa', 'No medicines added'),
      body: L('Weka orodha ya dawa zako kwa ajili yako mwenyewe. Hii si agizo la daktari.', 'Keep your own list of medicines. This is not a prescription.'),
      action: btn(L('Ongeza dawa', 'Add medicine'), 'open', { extra: { 'data-screen': 'med-new' }, tone: 'primary', icon: 'i-plus' })
    }), {
    tone: 'amber', icon: 'i-pill',
    action: btn(L('Ongeza', 'Add'), 'open', { extra: { 'data-screen': 'med-new' }, icon: 'i-plus', cls: 'is-small' })
  })}

    ${btn(L('Historia ya dozi', 'Dose history'), 'open', { extra: { 'data-screen': 'med-history' }, icon: 'i-clock' })}`;
}

/* ---------------------------------------------------------------- experts */

export function panelExperts() {
  const o = Store.overview();
  const next = o.nextAppointment;
  const appts = Store.appointments().filter((a) => a.status !== 'cancelled').slice(0, 3);
  const specOpts = [`<option value="all">${L('Fani zote', 'All specialties')}</option>`]
    .concat(SPECIALTIES.map((s, i) => `<option value="${i}">${esc(T(s))}</option>`)).join('');

  return `${flashBox()}
    ${block(L('Tafuta mtaalamu', 'Find a professional'), `<div class="gh-health-searchrow">
        <label class="gh-health-search" for="hxDocSearch">
          ${icon('i-search')}
          <input id="hxDocSearch" type="search" placeholder="${esc(L('Tafuta jina, kituo au fani', 'Search a name, facility or specialty'))}"
            value="${esc(view.filter.q)}" data-hx-input="filter" data-filter="q">
        </label>
        <select class="gh-health-select is-inline" data-hx-change="filter" data-filter="specialty" aria-label="${esc(L('Chuja kwa fani', 'Filter by specialty'))}">${specOpts}</select>
      </div>
      <p class="gh-health-hint">${L('Orodha hii ni ya mfano: hakuna mtaalamu halisi aliyeorodheshwa na hakuna uthibitisho unaotolewa.', 'This directory is sample data: no real professional is listed and no verification is granted.')}</p>
      ${btn(L('Fungua orodha', 'Open the directory'), 'open', { extra: { 'data-screen': 'doctors' }, tone: 'primary', icon: 'i-stethoscope' })}`,
    { tone: 'green', icon: 'i-stethoscope' })}

    ${block(L('Miadi', 'Appointments'), appts.length
    ? rows(appts.map((a) => row({
      tone: 'blue',
      icon: 'i-calendar',
      title: `${doctor(a.doctorId).name}`,
      sub: `${fmtDate(a.date)} · ${a.time} · ${T({ sw: (a.type === 'phone' ? 'Kwa simu' : a.type === 'follow-up' ? 'Ufuatiliaji' : 'Ana kwa ana'), en: (a.type === 'phone' ? 'By phone' : a.type === 'follow-up' ? 'Follow-up' : 'In person') })}`,
      chips: [statusChip(APPT_STATUS, a.status)],
      action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'appt-view', 'data-id': a.id }, cls: 'is-small' })
    })))
    : empty({
      hue: 'blue', inline: true, icon: 'i-calendar', title: L('Hakuna miadi', 'No appointments'),
      body: next ? '' : L('Ombi la miadi lihifadhiwe kwenye kifaa hiki; halitumwi kwa kituo chochote.', 'An appointment request is stored on this device; it is not sent to any facility.')
    }), {
    tone: 'blue', icon: 'i-calendar',
    action: btn(L('Omba miadi', 'Request'), 'open', { extra: { 'data-screen': 'appt-new' }, icon: 'i-plus', cls: 'is-small' })
  })}

    ${block(L('Mtandao wa kitaalamu', 'Clinical network'), rows([
    row({ tone: 'teal', icon: 'i-message', title: L('Majadiliano ya kesi', 'Case discussions'), sub: L('Majadiliano ya wataalamu kwa mfano', 'Sample peer discussion'), meta: String(o.openCases), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'cases' }, cls: 'is-small' }) }),
    row({ tone: 'blue', icon: 'i-video', title: L('Mikutano', 'Meetings'), sub: L('Ratiba, ajenda na kumbukumbu', 'Schedule, agenda and notes'), meta: String(Store.meetings().length), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'meetings' }, cls: 'is-small' }) }),
    row({ tone: 'violet', icon: 'i-users', title: L('Jamii', 'Communities'), sub: L('Majadiliano kwa fani', 'Specialty communities'), meta: String(COMMUNITIES.length), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'communities' }, cls: 'is-small' }) }),
    row({ tone: 'amber', icon: 'i-send', title: L('Rufaa', 'Referrals'), sub: L('Hakuna rufaa inayowasilishwa', 'Nothing is delivered'), meta: String(Store.referrals().length), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'referrals' }, cls: 'is-small' }) }),
    row({ tone: 'green', icon: 'i-badge-check', title: L('Wasifu wa kitaalamu', 'Professional profile'), sub: L('Wasilisha kwa mhakiki (hajatiwa)', 'Submit to a reviewer (none attached)'), chips: [verificationNote(Store.proProfile().verification)], action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'pro' }, cls: 'is-small' }) })
  ]), { tone: 'teal', icon: 'i-users' })}`;
}

/* ------------------------------------------------------------------- more */

export function panelMore() {
  const unread = Store.notifications().filter((n) => !n.read).length;
  const pro = Store.proProfile();
  return `${flashBox()}
    ${block(L('Huduma nyingine', 'More services'), rows([
    row({ tone: 'violet', icon: 'i-droplet', title: L('Upatikanaji wa damu', 'Blood availability'), sub: L('Orodha ya mfano yenye chanzo na muda', 'Sample rows with a source and a time'), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'blood' }, cls: 'is-small' }) }),
    row({ tone: 'red', icon: 'i-siren', title: L('Dharura ya kimatibabu', 'Medical emergency'), sub: L('Andaa taarifa — hakuna dispatch', 'Prepare details — no dispatch'), chips: [chip(L('Haijatumwa', 'Not sent'), 'warn')], action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'emergency' }, cls: 'is-small' }) }),
    row({ tone: 'green', icon: 'i-book', title: L('Elimu ya afya', 'Health education'), sub: L('Makala ya mfano, chanzo hakijathibitishwa', 'Sample articles, sources unverified'), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'education' }, cls: 'is-small' }) }),
    row({ tone: 'amber', icon: 'i-bell', title: L('Taarifa', 'Notifications'), sub: L('Zinabaki kwenye kifaa hiki', 'They stay on this device'), meta: unread ? String(unread) : '', action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'notifications' }, cls: 'is-small' }) }),
    row({ tone: 'slate', icon: 'i-settings', title: L('Mipangilio ya faragha', 'Privacy settings'), sub: L('Vibadilishaji visivyounganishwa vimewekwa wazi', 'Unconnected switches are labelled'), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'settings' }, cls: 'is-small' }) }),
    row({ tone: 'slate', icon: 'i-info', title: L('Mipaka ya sehemu hii', 'What this section cannot do'), sub: L('Orodha kamili ya huduma zisizounganishwa', 'The full list of unconnected services'), action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'about' }, cls: 'is-small' }) })
  ]), { tone: 'slate', icon: 'i-list' })}

    ${block(L('Wasifu wa kitaalamu', 'Professional profile'), `<div class="gh-health-pro">
      <span class="gh-health-pro-avatar">${esc((pro.name || 'GH').slice(0, 2).toUpperCase())}</span>
      <div class="gh-health-pro-copy">
        <b>${esc(pro.name || L('Bado haujajisajili', 'Not set up yet'))}</b>
        <span>${esc(pro.facility || L('Hakuna kituo kilichowekwa', 'No facility set'))}</span>
        <span class="gh-health-chiprow">${verificationNote(pro.verification)}</span>
      </div>
      ${btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'pro' }, cls: 'is-small' })}
    </div>`, { tone: 'green', icon: 'i-badge-check' })}

    ${block(L('Data ya majaribio', 'Sample data'), `<p class="gh-health-hint">${L('Sehemu hii huanza tupu. Sampuli huwaka tu ukitaka, na kila kipengele huala "Sampuli".', 'This section starts empty. Samples appear only when you ask, and each one is tagged “Sample”.')}</p>
      <div class="gh-health-actions">
        ${btn(Store.isDemo() ? L('Ondoa sampuli', 'Remove samples') : L('Weka sampuli', 'Load samples'), 'seed', { icon: 'i-flask', tone: Store.isDemo() ? '' : 'blue' })}
        ${btn(L('Futa data yote', 'Erase all data'), 'clear', { icon: 'i-trash', tone: 'danger' })}
      </div>`, { tone: 'slate', icon: 'i-flask', note: L('Kufuta hakuna kurudi nyuma: data yote ya sehemu ya afya kwenye kifaa hiki itaondolewa.', 'Erasing cannot be undone: all Health data on this device is removed.') })}`;
}

export const PANELS = {
  overview: panelOverview,
  medical: panelMedical,
  records: panelRecords,
  meds: panelMeds,
  experts: panelExperts,
  more: panelMore
};
