/**
 * GuardHai · features/health/health-screens-personal.js
 * Medical ID, emergency contacts, QR access, records and medication — the
 * screens that hold the most sensitive data, so each one states plainly where
 * the data lives and what is *not* connected.
 *
 * Every function builds an array of HTML strings and joins it, which keeps the
 * static copy readable and avoids deeply nested template literals.
 */

import {
  L, T, esc, chip, btn, iconBtn, block, rows, row, facts, dl, empty, callout, legend,
  form, field, textarea, select, check, fileField, meter, flashBox, view,
  fmtDate, fmtDateTime, todayISO, qrPreview, SAMPLE_CHIP
} from './health-ui.js';
import { Store, RECORD_CATEGORIES, BLOOD_GROUPS, QR_SCOPES } from './health-store.js';

const catLabel = (id) => T(RECORD_CATEGORIES.find((c) => c.id === id) || { sw: id, en: id });
const optionPairs = (list) => list.map((v) => [v, v]);

/* --------------------------------------------------------- medical profile */

export function screenMedicalProfile() {
  const m = Store.medicalId();
  const comp = Store.medicalCompletion();
  const contacts = Store.contactsFor();
  const token = Store.activeToken();

  if (!m.fullName) {
    return flashBox() + empty({
      icon: 'i-id-card',
      title: L('Hakuna Medical ID bado', 'No Medical ID yet'),
      body: L('Taarifa hizi zinabaki kwenye kifaa hiki. Hazitumwi kwa mtoa huduma, hazijasawazishwa, na hazithibitishi utambulisho.',
        'This information stays on this device. It is not sent to a provider, not synced, and it does not verify identity.'),
      action: btn(L('Anza kuandika', 'Start filling it in'), 'open', { extra: { 'data-screen': 'medical-edit' }, tone: 'primary', icon: 'i-edit' })
    });
  }

  const details = meter(comp.pct, L('Wasifu umekamilika', 'Profile completeness'))
    + facts([
      [L('Jina', 'Name'), m.fullName],
      [L('Kuzaliwa', 'Date of birth'), m.dob],
      [L('Jinsia', 'Sex'), m.sex],
      [L('Kundi la damu', 'Blood group'), m.blood]
    ])
    + dl([
      [L('Mzio', 'Allergies'), m.allergies || L('Hakuna iliyorekodiwa', 'None recorded')],
      [L('Magonjwa sugu', 'Chronic conditions'), m.conditions || L('Hakuna iliyorekodiwa', 'None recorded')],
      [L('Maelezo ya dharura', 'Emergency notes'), m.notes || '—'],
      [L('Uzito / Urefu', 'Weight / Height'), [m.weight, m.height].filter(Boolean).join(' · ') || '—'],
      [L('Ilisasishwa', 'Last updated'), m.updatedAt ? fmtDateTime(m.updatedAt) : '—'],
      [L('Chanzo', 'Source'), L('Nimeweka mwenyewe', 'Entered by me')]
    ]);

  const contactRows = contacts.length
    ? rows(contacts.map((c) => row({ icon: 'i-phone', title: c.name, sub: [c.relation, c.phone].filter(Boolean).join(' · ') })))
    : '<p class="gh-health-hint">' + L('Hakuna mtu aliyeongezwa.', 'No contacts added.') + '</p>';

  let qrInner = '<p class="gh-health-hint">'
    + L('Hakuna kiungo hai. Msimbo wa QR haulindi data yoyote ya afya — ni kiungo kinachoweza kufutwa.',
      'No active link. The QR code carries no health data — it is a revocable link.')
    + '</p>'
    + btn(L('Tengeneza kiungo', 'Create a link'), 'open', { extra: { 'data-screen': 'medical-qr' }, tone: 'primary', icon: 'i-qr' });
  if (token) {
    qrInner = rows([row({
      icon: 'i-qr',
      title: L('Kiungo hai', 'Active link'),
      sub: `${L('Hadi', 'Until')} ${fmtDate(token.expiresAt)}`,
      chips: token.scopes.map((sc) => chip(sc, 'neutral'))
    })]) + btn(L('Dhibiti viungo', 'Manage links'), 'open', { extra: { 'data-screen': 'medical-qr' }, icon: 'i-qr' });
  }

  return flashBox()
    + block(L('Taarifa zilizohifadhiwa', 'Stored details'), details, {
      action: btn(L('Hariri', 'Edit'), 'open', { extra: { 'data-screen': 'medical-edit' }, icon: 'i-edit', cls: 'is-small' })
    }, { tone: 'teal', icon: 'i-id-card' })
    + block(L('Watu wa dharura', 'Emergency contacts'), contactRows, {
      action: btn(L('Dhibiti', 'Manage'), 'open', { extra: { 'data-screen': 'medical-contacts' }, icon: 'i-users', cls: 'is-small' })
    }, { tone: 'red', icon: 'i-users' })
    + block(L('Ufikiaji kwa QR', 'QR access'), qrInner)
    + legend(L('Hakuna seva iliyounganishwa. Taarifa hizi hazithibitishi utambulisho wa mtu yeyote.',
      'No server is connected. This information does not verify anyone’s identity.'), 'i-info');
}

/* ------------------------------------------------------------ medical edit */

export function screenMedicalEdit() {
  const m = Store.medicalId();
  const body = [
    field({ label: L('Jina kamili', 'Full name'), name: 'fullName', value: m.fullName, required: true, autocomplete: 'name' }),
    field({ label: L('Tarehe ya kuzaliwa', 'Date of birth'), name: 'dob', type: 'date', value: m.dob, required: true, max: todayISO() }),
    select({
      label: L('Jinsia', 'Sex'), name: 'sex', value: m.sex,
      options: [['', L('Chagua', 'Select')], ['female', L('Mwanamke', 'Female')], ['male', L('Mwanaume', 'Male')], ['other', L('Nyingine', 'Other')], ['undisclosed', L('Sitaki kusema', 'Prefer not to say')]]
    }),
    select({ label: L('Kundi la damu', 'Blood group'), name: 'blood', value: m.blood, options: [['', L('Chagua', 'Select')]].concat(optionPairs(BLOOD_GROUPS)) }),
    field({ label: L('Uzito (kg)', 'Weight (kg)'), name: 'weight', value: m.weight, inputmode: 'decimal' }),
    field({ label: L('Urefu (cm)', 'Height (cm)'), name: 'height', value: m.height, inputmode: 'numeric' }),
    textarea({ label: L('Mzio', 'Allergies'), name: 'allergies', value: m.allergies, rows: 3, help: L('Andika kila kimoja kwa mstari wake.', 'Put each one on its own line.') }),
    textarea({ label: L('Magonjwa sugu', 'Chronic conditions'), name: 'conditions', value: m.conditions, rows: 3 }),
    textarea({ label: L('Maelezo ya dharura', 'Emergency notes'), name: 'notes', value: m.notes, rows: 3, help: L('Mfano: dawa unazotumia mara kwa mara, vifaa maalum.', 'For example: regular medicines, special equipment.') })
  ].join('');

  return flashBox()
    + form('medical', body, { submitLabel: L('Hifadhi Medical ID', 'Save Medical ID'), tone: 'primary' })
    + callout(L('Taarifa hizi zinahifadhiwa kwenye kifaa hiki pekee. Hakuna seva, bima au kituo cha afya kinachozipokea.',
      'This information is stored on this device only. No server, insurer or facility receives it.'), 'info')
    + btn(L('Rudi bila kuhifadhi', 'Back without saving'), 'back');
}

/* -------------------------------------------------------- medical contacts */

export function screenMedicalContacts() {
  const contacts = Store.contactsFor();
  const listHtml = contacts.length
    ? rows(contacts.map((c) => row({
      icon: 'i-phone',
      title: c.name,
      sub: [c.relation, c.phone].filter(Boolean).join(' · '),
      chips: [chip(L('Kifaa pekee', 'Device only'), 'neutral')],
      action: iconBtn('i-trash', L('Ondoa', 'Remove'), 'contact-del', { 'data-id': c.id })
    })))
    : empty({
      icon: 'i-users',
      title: L('Hakuna mtu wa dharura', 'No emergency contacts'),
      body: L('Ongeza mtu ambaye anaweza kuitwa katika dharura. Nambari hii haipigwi na app.',
        'Add someone who could be called in an emergency. The app never dials the number.')
    });

  const addForm = form('contact', [
    field({ label: L('Jina', 'Name'), name: 'name', required: true, autocomplete: 'name' }),
    field({ label: L('Uhusiano', 'Relationship'), name: 'relation', placeholder: L('Mfano: mke, kaka, jirani', 'For example: spouse, brother, neighbour') }),
    field({
      label: L('Nambari ya simu', 'Phone number'), name: 'phone', type: 'tel', required: true, inputmode: 'tel',
      autocomplete: 'tel', help: L('Hifadhiwa kama ulivyoandika, bila kupigwa.', 'Stored as typed, never dialled.')
    })
  ].join(''), { submitLabel: L('Ongeza mtu', 'Add contact'), tone: 'primary', submitIcon: 'i-plus' });

  return flashBox() + listHtml
    + block(L('Ongeza mtu wa dharura', 'Add an emergency contact'), addForm, {
      note: L('Hakuna SMS, simu au taarifa inayotumwa kwa mtu huyu na app hii.',
        'This app sends no SMS, call or notification to this person.')
    });
}

/* -------------------------------------------------------------------- QR */

export function screenMedicalQr() {
  const tokens = Store.tokens();
  const active = Store.activeToken();
  const parts = [flashBox()];

  if (!Store.medicalId().fullName) {
    parts.push(callout(L('Bado hakuna jina kwenye Medical ID, kwa hivyo kiungo hakiwezi kuonyesha taarifa yoyote.',
      'There is no name on the Medical ID yet, so a link cannot show anything.'), 'warn'));
  }

  if (active) {
    const scopes = active.scopes.map((id) => T(QR_SCOPES.find((s) => s.id === id) || { sw: id, en: id })).join(' · ');
    parts.push(block(L('Kiungo hai', 'Active link'), `
      <div class="gh-health-qr">
        <div class="gh-health-qr-code">${qrPreview(active.handle)}</div>
        <div class="gh-health-qr-copy">
          <p class="gh-health-qr-note">${L('Kielelezo cha msimbo — hakuna maktaba ya QR iliyounganishwa, kwa hivyo msimbo huu hautumiki kuskaniwa.',
            'Code preview — no QR library is connected, so this code cannot be scanned.')}</p>
          ${dl([
            [L('Kiungo', 'Handle'), active.handle],
            [L('Hadi', 'Expires'), fmtDateTime(active.expiresAt)],
            [L('Taarifa', 'Scopes'), scopes]
          ])}
          <p class="gh-health-hint">${L('Hakuna mtu aliyefikia kiungo hiki. Hakuna seva inayohesabu ufikiaji.',
            'Nobody has opened this link. There is no server to log access.')}</p>
          ${btn(L('Futa kiungo', 'Revoke link'), 'qr-revoke', { extra: { 'data-id': active.id }, tone: 'danger', icon: 'i-trash' })}
        </div>
      </div>`, {
      note: L('Msimbo haulindi wala kuthibitisha utambulisho. Mtu aliye na kiungo anaweza kuona taarifa zilizochaguliwa.',
        'The code does not protect or verify identity. Anyone holding the link sees the scopes you picked.')
    }));
  } else {
    parts.push(block(L('Hakuna kiungo hai', 'No active link'),
      '<p class="gh-health-hint">' + L('Tengeneza kiungo kisha umpe mtu unayemchagua. Unaweza kukifuta mara moja.',
        'Create a link and give it to someone you choose. You can revoke it immediately.') + '</p>'));
  }

  const scopeRows = QR_SCOPES.map((s) => check({
    label: T(s),
    name: 'scope',
    value: s.id,
    checked: Boolean(active && active.scopes.includes(s.id)),
    help: s.id === 'identity' ? L('Jina na umri — hakuna nambari ya kitambulisho.', 'Name and age — no ID number.') : ''
  })).join('');

  const createForm = form('qr', `
    <fieldset class="gh-health-fieldset">
      <legend class="gh-health-legend-strong">${L('Nini kitaonekana kwa mtu aliyechaguliwa?', 'What will the person you choose see?')}</legend>
      ${scopeRows}
    </fieldset>
    ${select({
      label: L('Muda wa ufikiaji', 'Access window'), name: 'hours', value: '24',
      options: [['1', L('Saa 1', '1 hour')], ['6', L('Saa 6', '6 hours')], ['24', L('Siku 1', '1 day')], ['72', L('Siku 3', '3 days')]]
    })}
    ${callout(L('Msimbo wa QR hauna data ya afya — una kiungo cha kufikia taarifa zilizochaguliwa. Unaweza kukifuta wakati wowote.',
      'The QR code carries no health data — it is a link to the details you selected. You can revoke it at any time.'), 'info')}`,
  { submitLabel: L('Tengeneza kiungo', 'Create link'), tone: 'primary', submitIcon: 'i-qr' });

  const history = tokens.length
    ? rows(tokens.slice(0, 5).map((t) => {
      const live = !t.revoked && new Date(t.expiresAt) > new Date();
      return row({
        icon: 'i-qr',
        title: `${L('Kiungo', 'Link')} …${t.handle.slice(-6)}`,
        sub: `${fmtDateTime(t.createdAt)} · ${L('hadi', 'until')} ${fmtDate(t.expiresAt)}`,
        chips: [t.revoked ? chip(L('Imefutwa', 'Revoked'), 'neutral') : live ? chip(L('Hai', 'Active'), 'ok') : chip(L('Imeisha muda', 'Expired'), 'warn')]
      });
    }))
    : '<p class="gh-health-hint">' + L('Hakuna viungo vilivyowahi kutengenezwa.', 'No links have ever been created.') + '</p>';

  parts.push(block(L('Tengeneza kiungo kipya', 'Create a new link'), createForm));
  parts.push(block(L('Viungo vilivyopita', 'Previous links'), history));
  parts.push(legend(L('Hakuna uthibitisho wa utambulisho unaotolewa na app hii, na hakuna data ya afya iliyoandikwa ndani ya msimbo.',
    'This app grants no identity verification, and no health data is written inside the code.'), 'i-info'));
  return parts.join('');
}

/* ----------------------------------------------------------------- records */

export function screenRecordNew() {
  const body = [
    field({ label: L('Jina la rekodi', 'Record title'), name: 'title', required: true, placeholder: L('Mfano: Kipimo cha sukari', 'For example: Blood sugar test') }),
    select({ label: L('Aina', 'Category'), name: 'category', value: 'lab', required: true, options: RECORD_CATEGORIES.map((c) => [c.id, T(c)]) }),
    field({ label: L('Tarehe', 'Date'), name: 'date', type: 'date', value: todayISO(), required: true, max: todayISO() }),
    field({ label: L('Kituo (si lazima)', 'Facility (optional)'), name: 'facility', placeholder: L('Andika jina la kituo kama unalijua', 'Type the facility name if you know it') }),
    textarea({ label: L('Muhtasari', 'Summary'), name: 'summary', rows: 4, help: L('Andika yale unayoyaelewa. Usibadilishe namba za matokeo.', 'Write what you understand. Do not alter result numbers.') }),
    fileField({ label: L('Ambatisha faili (si lazima)', 'Attach a file (optional)'), name: 'file', help: L('Faili linabaki kwenye kifaa hiki; halipakiwi mahali popote.', 'The file stays on this device; it is not uploaded anywhere.') })
  ].join('');

  return flashBox()
    + form('record', body, { submitLabel: L('Hifadhi rekodi', 'Save record'), tone: 'primary' })
    + callout(L('Rekodi hii ni ya kujaza mwenyewe. Haina uthibitisho wa kituo, maabara au daktari.',
      'This record is self-entered. It carries no facility, laboratory or clinician confirmation.'), 'info');
}

export function screenRecordView(id) {
  const r = Store.record(id);
  if (!r) {
    return empty({
      icon: 'i-folder', title: L('Rekodi haipo', 'Record not found'),
      body: L('Huenda ilifutwa kwenye kifaa hiki.', 'It may have been deleted on this device.')
    });
  }

  const sourceChip = r.synthetic ? SAMPLE_CHIP() : chip(L('Kujaza mwenyewe', 'Self-entered'), 'info');
  const fileText = r.file
    ? `${r.file.name} · ${Math.round(r.file.size / 1024)} KB ${L('(kifaa pekee)', '(device only)')}`
    : L('Hakuna faili', 'No file');
  const summary = r.summary
    ? '<h4 class="gh-health-subhead">' + L('Muhtasari', 'Summary') + '</h4><p class="gh-health-body-text">' + esc(r.summary) + '</p>'
    : '';

  return flashBox()
    + block(r.title, dl([
      [L('Aina', 'Category'), catLabel(r.category)],
      [L('Tarehe ya rekodi', 'Record date'), fmtDate(r.date)],
      [L('Kituo', 'Facility'), r.facility || L('Hakuna kituo kilichotajwa', 'No facility stated')],
      [L('Chanzo', 'Source'), r.synthetic ? L('Sampuli ya majaribio', 'Synthetic sample') : L('Nimeweka mwenyewe', 'Entered by me')],
      [L('Iliongezwa', 'Added'), fmtDateTime(r.addedAt)],
      [L('Faili', 'File'), fileText]
    ]) + summary, { action: sourceChip })
    + block(L('Vitendo', 'Actions'), `<div class="gh-health-actions">
        ${btn(L('Futa rekodi', 'Delete record'), 'record-del', { extra: { 'data-id': r.id }, tone: 'danger', icon: 'i-trash' })}
        ${btn(L('Rudi kwenye rekodi', 'Back to records'), 'tab', { extra: { 'data-tab': 'records' } })}
      </div>`, {
      note: L('Kufuta hakuwezi kurudishwa. Hakuna nakala ya rekodi hii mahali pengine.',
        'Deleting cannot be undone. No copy of this record exists anywhere else.')
    });
}

/* -------------------------------------------------------------- medication */

export function screenMedNew() {
  const body = [
    field({ label: L('Jina la dawa', 'Medicine name'), name: 'name', required: true }),
    field({ label: L('Kipimo', 'Dose'), name: 'dose', placeholder: L('Mfano: 500 mg', 'For example: 500 mg') }),
    field({
      label: L('Masaa (tenganisha kwa koma)', 'Times (comma separated)'), name: 'times', required: true,
      placeholder: '08:00, 20:00', help: L('Tumia muundo wa saa 24: 08:00, 20:00.', 'Use 24-hour format: 08:00, 20:00.')
    }),
    field({ label: L('Tarehe ya kuanza', 'Start date'), name: 'start', type: 'date', value: todayISO(), max: todayISO() }),
    field({ label: L('Tarehe ya mwisho (si lazima)', 'End date (optional)'), name: 'end', type: 'date' }),
    textarea({ label: L('Maelekezo', 'Instructions'), name: 'instructions', rows: 3, help: L('Nakili kutoka kwenye lebo ya dawa.', 'Copy from the medicine label.') }),
    fileField({ label: L('Picha ya lebo (si lazima)', 'Photo of the label (optional)'), name: 'file', help: L('Inabaki kwenye kifaa hiki.', 'Stays on this device.') })
  ].join('');

  return flashBox()
    + form('med', body, { submitLabel: L('Hifadhi dawa', 'Save medicine'), tone: 'primary' })
    + callout(L('Orodha hii ni msaidizi wa kumbukumbu. Si agizo la daktari na haithibitishi kipimo sahihi.',
      'This list is a memory aid. It is not a prescription and does not confirm the right dose.'), 'info');
}

export function screenMedView(id) {
  const m = Store.med(id);
  if (!m) {
    return empty({
      icon: 'i-pill', title: L('Dawa haipo', 'Medicine not found'),
      body: L('Huenda ilifutwa kwenye kifaa hiki.', 'It may have been deleted on this device.')
    });
  }

  const todays = Store.scheduleFor().filter((d) => d.medId === m.id);
  const history = Store.doseHistory(m.id, 8);

  const todayRows = todays.length
    ? '<h4 class="gh-health-subhead">' + L('Leo', 'Today') + '</h4>' + rows(todays.map((d) => {
      const label = d.status === 'taken' ? L('Imetumika', 'Taken') : d.status === 'skipped' ? L('Imerukwa', 'Skipped') : L('Inasubiri', 'Due');
      const tone = d.status === 'taken' ? 'ok' : d.status === 'skipped' ? 'warn' : 'neutral';
      return row({ icon: 'i-clock', title: d.time, sub: label, chips: [chip(label, tone)] });
    }))
    : '';

  const historyRows = history.length
    ? rows(history.map((d) => row({
      icon: 'i-activity',
      title: `${fmtDate(d.date)} · ${d.time}`,
      sub: d.status === 'taken' ? L('Imetumika (kujirekodi)', 'Taken (self-reported)') : d.status === 'skipped' ? L('Imerukwa', 'Skipped') : L('Ilikosekana', 'Missed')
    })))
    : '<p class="gh-health-hint">' + L('Hakuna dozi iliyorekodiwa bado.', 'No doses logged yet.') + '</p>';

  const editForm = form('med-edit', [
    field({ label: L('Jina', 'Name'), name: 'name', value: m.name, required: true }),
    field({ label: L('Kipimo', 'Dose'), name: 'dose', value: m.dose }),
    field({ label: L('Masaa', 'Times'), name: 'times', value: m.times.join(', '), required: true }),
    textarea({ label: L('Maelekezo', 'Instructions'), name: 'instructions', value: m.instructions, rows: 3 })
  ].join(''), { submitLabel: L('Hifadhi mabadiliko', 'Save changes'), tone: 'primary' });

  return flashBox()
    + block(m.name, dl([
      [L('Kipimo', 'Dose'), m.dose || '—'],
      [L('Masaa', 'Times'), m.times.join(' · ')],
      [L('Kuanza', 'Start'), fmtDate(m.start)],
      [L('Mwisho', 'End'), m.end ? fmtDate(m.end) : L('Hakuna', 'None')],
      [L('Maelekezo', 'Instructions'), m.instructions || '—'],
      [L('Faili', 'File'), m.file ? m.file.name : L('Hakuna', 'None')]
    ]) + todayRows, { action: m.synthetic ? SAMPLE_CHIP() : chip(L('Kifaa pekee', 'Device only'), 'neutral') })
    + block(L('Historia ya dozi', 'Dose history'), historyRows, { tone: 'amber', icon: 'i-clock' })
    + block(L('Hariri dawa', 'Edit medicine'), editForm)
    + block(L('Futa', 'Delete'), btn(L('Futa dawa hii', 'Delete this medicine'), 'med-del', { extra: { 'data-id': m.id }, tone: 'danger', icon: 'i-trash' }), {
      note: L('Historia ya dozi pia itaondolewa kwenye kifaa hiki.', 'Dose history is removed from this device too.')
    });
}

export function screenMedHistory() {
  const meds = Store.meds();
  const all = Store.doseHistory(null, 60);
  const nameOf = (id) => (meds.find((m) => m.id === id) || {}).name || L('Dawa iliyofutwa', 'Deleted medicine');

  const body = all.length
    ? rows(all.map((d) => row({
      icon: 'i-activity',
      title: nameOf(d.medId),
      sub: `${fmtDate(d.date)} · ${d.time}`,
      chips: [chip(
        d.status === 'taken' ? L('Imetumika', 'Taken') : d.status === 'skipped' ? L('Imerukwa', 'Skipped') : L('Ilikosekana', 'Missed'),
        d.status === 'taken' ? 'ok' : d.status === 'skipped' ? 'warn' : 'neutral'
      )]
    })))
    : empty({ icon: 'i-clock', title: L('Hakuna historia', 'No history'), body: L('Dozi unazorekodi zitaonekana hapa.', 'Doses you log will appear here.') });

  return flashBox() + body
    + legend(L('Kila dozi ni taarifa ya kujirekodi. Hakuna kifaa cha kiotomatiki kinachothibitisha kuwa dawa ilinywewa.',
      'Every dose is self-reported. No automatic device confirms that a medicine was taken.'), 'i-info');
}

export const personalScreens = {
  'medical-profile': {
    parent: 'medical',
    title: () => L('Medical ID', 'Medical ID'),
    sub: () => L('Taarifa za dharura zilizo kwenye kifaa hiki', 'Emergency details held on this device'),
    render: screenMedicalProfile
  },
  'medical-edit': {
    parent: 'medical',
    title: () => L('Hariri Medical ID', 'Edit Medical ID'),
    sub: () => L('Hakuna kitu kinachotumwa', 'Nothing is transmitted'),
    render: screenMedicalEdit
  },
  'medical-contacts': {
    parent: 'medical',
    title: () => L('Watu wa dharura', 'Emergency contacts'),
    sub: () => L('Nambari zinazoonekana kwenye kifaa hiki', 'Numbers that stay on this device'),
    render: screenMedicalContacts
  },
  'medical-qr': {
    parent: 'medical',
    title: () => L('Ufikiaji kwa QR', 'QR access'),
    sub: () => L('Viungo vinavyoweza kufutwa, bila data ya afya ndani', 'Revocable links, no health data inside'),
    render: screenMedicalQr
  },
  'record-new': {
    parent: 'records',
    title: () => L('Rekodi mpya', 'New record'),
    sub: () => L('Inabaki kwenye kifaa hiki', 'Stays on this device'),
    render: screenRecordNew
  },
  'record-view': {
    parent: 'records',
    title: () => L('Rekodi', 'Record'),
    sub: () => L('Taarifa zilizoandikwa na wewe', 'Details you entered'),
    render: screenRecordView
  },
  'med-new': {
    parent: 'meds',
    title: () => L('Dawa mpya', 'New medicine'),
    sub: () => L('Msaidizi wa kumbukumbu', 'A memory aid'),
    render: screenMedNew
  },
  'med-view': {
    parent: 'meds',
    title: () => L('Dawa', 'Medicine'),
    sub: () => L('Ratiba na historia ya kifaa', 'Schedule and history on this device'),
    render: screenMedView
  },
  'med-history': {
    parent: 'meds',
    title: () => L('Historia ya dozi', 'Dose history'),
    sub: () => L('Taarifa za kujirekodi', 'Self-reported entries'),
    render: screenMedHistory
  }
};
