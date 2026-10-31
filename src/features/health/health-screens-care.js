/**
 * GuardHai · features/health/health-screens-care.js
 * Finding a professional and requesting an appointment.
 *
 * The directory is sample data. An appointment is a *request* stored on this
 * device; nothing is sent, so nothing can honestly be called "confirmed".
 */

import {
  L, T, esc, chip, btn, block, rows, row, dl, empty, callout, legend, form, field, select, textarea,
  view, fmtDate, fmtDateTime, fmtDay, todayISO, stat, verificationNote
} from './health-ui.js';
import { Store, DOCTORS, SPECIALTIES, CONSULT_TYPES, APPT_STATUS } from './health-store.js';

const doctorOf = (id) => DOCTORS.find((d) => d.id === id) || null;
const typeLabel = (id) => {
  const t = CONSULT_TYPES.find((x) => x.id === id);
  return t ? T(t) : id;
};
const statusChip = (key) => {
  const s = APPT_STATUS[key];
  return s ? chip(T(s), s.tone) : chip(String(key));
};
const initialsOf = (name) => String(name || 'GH').replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();

function verificationLine(d) {
  if (d.verification === 'pending-review') {
    return callout(L('Wasifu huu umewasilishwa kwa mhakiki, lakini hakuna mhakiki aliyeunganishwa. Hii si alama ya uthibitisho.',
      'This profile was submitted to a reviewer, but no reviewer is connected. This is not a verification badge.'), 'warn', 'i-clock');
  }
  return callout(L('Wasifu huu haujathibitishwa. App hii haitoi alama za uthibitisho kwa mtu yeyote.',
    'This profile is unverified. This app grants no verification badge to anyone.'), 'info');
}

/* ----------------------------------------------------------------- doctors */

export function screenDoctors() {
  const f = view.filter;
  const spec = f.specialty === 'all' || f.specialty === '' ? null : Number(f.specialty);
  const q = f.q.trim().toLowerCase();
  const list = DOCTORS.filter((d) => {
    if (spec !== null && d.specialty !== spec) return false;
    if (!q) return true;
    return [d.name, d.facility, T(SPECIALTIES[d.specialty] || {}), ...(d.services || [])]
      .join(' ').toLowerCase().includes(q);
  });

  const specSeg = [`<button type="button" class="${f.specialty === 'all' ? 'is-active' : ''}" ${`data-hx="filter" data-filter="specialty" data-value="all"`}>${L('Zote', 'All')}</button>`]
    .concat(SPECIALTIES.map((s, i) => `<button type="button" class="${String(f.specialty) === String(i) ? 'is-active' : ''}" data-hx="filter" data-filter="specialty" data-value="${i}">${esc(T(s))}</button>`))
    .join('');

  const listHtml = list.length
    ? rows(list.map((d) => row({
      icon: 'i-stethoscope',
      title: d.name,
      sub: `${T(SPECIALTIES[d.specialty])} · ${d.facility}`,
      chips: [d.verification === 'pending-review' ? chip(L('Inasubiri mhakiki', 'Awaiting reviewer'), 'warn') : chip(L('Hajathibitishwa', 'Unverified'), 'neutral')],
      action: btn(L('Wasifu', 'Profile'), 'open', { extra: { 'data-screen': 'doctor-view', 'data-id': d.id }, cls: 'is-small' })
    })))
    : empty({
      icon: 'i-search',
      title: L('Hakuna mtaalamu anayelingana', 'No professional matches'),
      body: L('Badilisha neno la utafutaji au chagua fani nyingine.', 'Change the search term or choose another specialty.')
    });

  return `<div class="gh-health-searchrow">
      <label class="gh-health-search" for="hxDoctorSearch">
        <svg class="ic" aria-hidden="true"><use href="#i-search"/></svg>
        <input id="hxDoctorSearch" type="search" placeholder="${esc(L('Tafuta jina, kituo au huduma', 'Search a name, facility or service'))}"
          value="${esc(f.q)}" data-hx-input="filter" data-filter="q">
      </label>
    </div>
    <div class="gh-health-seg" role="group" aria-label="${esc(L('Chuja kwa fani', 'Filter by specialty'))}">${specSeg}</div>
    <p class="gh-health-hint">${L(`${list.length} ya ${DOCTORS.length} wasifu wa mfano`, `${list.length} of ${DOCTORS.length} sample profiles`)}</p>
    ${listHtml}
    ${callout(L('Majina, vituo na leseni zote ni za mfano. Hakuna mtaalamu halisi anayewakilishwa na hakuna uthibitisho unaotolewa.',
      'Every name, facility and licence here is invented. No real professional is represented and no verification is granted.'), 'info')}`;
}

export function screenDoctorView(id) {
  const d = doctorOf(id);
  if (!d) {
    return empty({ icon: 'i-stethoscope', title: L('Wasifu haupo', 'Profile not found'), body: L('Huenda kiungo si sahihi.', 'The link may be wrong.') });
  }

  return `<div class="gh-health-block">
      <div class="gh-health-pro">
        <span class="gh-health-pro-avatar">${esc(d.initials || initialsOf(d.name))}</span>
        <div class="gh-health-pro-copy">
          <b>${esc(d.name)}</b>
          <span>${esc(T(SPECIALTIES[d.specialty]))}</span>
          <span>${esc(d.facility)}</span>
          <span class="gh-health-chiprow">${verificationNote(d.verification)}</span>
        </div>
      </div>
      ${dl([
        [L('Sifa', 'Qualification'), d.qualification],
        [L('Leseni', 'Licence'), d.licence],
        [L('Huduma', 'Services'), (d.services || []).join(' · ')],
        [L('Aina ya ushauri', 'Consultation'), (d.types || []).map(typeLabel).join(' · ')],
        [L('Ada', 'Fee'), L('Haijatajwa', 'Not stated')]
      ])}
      ${verificationLine(d)}
      <div class="gh-health-actions">
        ${btn(L('Omba miadi', 'Request an appointment'), 'open', { extra: { 'data-screen': 'appt-new', 'data-id': d.id }, tone: 'primary', icon: 'i-calendar' })}
        ${btn(L('Tuma rufaa', 'Create a referral'), 'open', { extra: { 'data-screen': 'referral-new', 'data-id': d.id }, icon: 'i-send' })}
      </div>
    </div>
    ${legend(L('Ombi la miadi linabaki kwenye kifaa hiki. Hakuna kituo kinachopokea, kwa hivyo hakuna kinachoweza kuthibitisha miadi.',
      'An appointment request stays on this device. No facility receives it, so nothing can confirm the booking.'), 'i-info')}
    ${btn(L('Rudi kwenye orodha', 'Back to the directory'), 'open', { extra: { 'data-screen': 'doctors' } })}`;
}

/* ------------------------------------------------------------ appointments */

export function screenAppointments() {
  const all = Store.appointments();
  const live = all.filter((a) => ['requested', 'confirmed', 'reschedule'].includes(a.status));
  const listHtml = all.length
    ? rows(all.map((a) => {
      const d = doctorOf(a.doctorId);
      return row({
        icon: 'i-calendar',
        title: d ? d.name : L('Mtaalamu hajulikani', 'Unknown professional'),
        sub: `${fmtDay(a.date)} · ${a.time} · ${typeLabel(a.type)}`,
        chips: [statusChip(a.status)],
        action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'appt-view', 'data-id': a.id }, cls: 'is-small' })
      });
    }))
    : empty({
      icon: 'i-calendar',
      title: L('Hakuna miadi bado', 'No appointments yet'),
      body: L('Ombi la miadi huhifadhiwa kwenye kifaa hiki pekee. Hakuna kituo kinachopokea ombi hili.',
        'An appointment request is stored on this device only. No facility receives it.'),
      action: btn(L('Omba miadi', 'Request an appointment'), 'open', { extra: { 'data-screen': 'appt-new' }, tone: 'primary', icon: 'i-plus' })
    });

  return `<div class="gh-health-stats">
      ${stat({ tone: 'blue', label: L('Zinazoendelea', 'Upcoming'), value: String(live.length) })}
      ${stat({ tone: 'slate', label: L('Zote', 'All'), value: String(all.length) })}
    </div>
    <div class="gh-health-section-head">
      <div>
        <h3 class="gh-health-section-title">${L('Miadi yangu', 'My appointments')}</h3>
        <p class="gh-health-section-sub">${L('Maombi ya kifaa hiki', 'Requests held on this device')}</p>
      </div>
      ${btn(L('Omba', 'Request'), 'open', { extra: { 'data-screen': 'appt-new' }, tone: 'primary', icon: 'i-plus', cls: 'is-small' })}
    </div>
    ${listHtml}
    ${legend(L('“Imethibitishwa” haionekani kwenye orodha hii kwa sababu hakuna mfumo wa kituo uliounganishwa unaoweza kuthibitisha.',
      '“Confirmed” never appears in this list because no facility system is connected to confirm anything.'), 'i-info')}`;
}

export function screenApptNew(doctorId) {
  const preset = doctorOf(doctorId);
  const doctorField = preset
    ? `<input type="hidden" name="doctorId" value="${esc(preset.id)}">
       <div class="gh-health-row"><svg class="ic" aria-hidden="true"><use href="#i-stethoscope"/></svg>
         <div class="gh-health-rowcopy"><b>${esc(preset.name)}</b><span>${esc(T(SPECIALTIES[preset.specialty]))} · ${esc(preset.facility)}</span></div>
       </div>`
    : select({
      label: L('Mtaalamu', 'Professional'), name: 'doctorId', required: true, value: '',
      options: [['', L('Chagua mtaalamu', 'Select a professional')]].concat(DOCTORS.map((d) => [d.id, `${d.name} — ${T(SPECIALTIES[d.specialty])}`]))
    });

  const body = [
    doctorField,
    field({ label: L('Tarehe', 'Date'), name: 'date', type: 'date', required: true, min: todayISO(), value: '' }),
    field({ label: L('Saa', 'Time'), name: 'time', type: 'time', required: true }),
    select({ label: L('Aina ya ushauri', 'Consultation type'), name: 'type', required: true, options: CONSULT_TYPES.map((t) => [t.id, T(t)]) }),
    textarea({ label: L('Sababu (si lazima)', 'Reason (optional)'), name: 'reason', rows: 3, help: L('Andika kwa ufupi. Usiweke namba za kitambulisho.', 'Keep it brief. Do not include ID numbers.') })
  ].join('');

  return form('appt', body, { submitLabel: L('Tuma ombi', 'Send request'), tone: 'primary', submitIcon: 'i-send' })
    + callout(L('Ombi hili linahifadhiwa kwenye kifaa hiki kama “Imeombwa”. Hakuna kituo kinachopokea na hakuna uthibitisho unaotolewa.',
      'This request is stored on this device as “Requested”. No facility receives it and no confirmation is issued.'), 'warn')
    + legend(L('Ukihitaji huduma ya haraka, piga nambari ya dharura au nenda kituo cha afya kilicho karibu.', 'If you need urgent care, call an emergency number or go to the nearest facility.'), 'i-siren');
}

export function screenApptView(id) {
  const a = Store.appointment(id);
  if (!a) {
    return empty({ icon: 'i-calendar', title: L('Miadi haipo', 'Appointment not found'), body: L('Huenda kiungo si sahihi.', 'The link may be wrong.') });
  }
  const d = doctorOf(a.doctorId);

  const history = `<ul class="gh-health-timeline">${a.history.map((h) => {
    const s = APPT_STATUS[h.status];
    return `<li><b>${esc(s ? T(s) : h.status)}</b><span>${esc(fmtDateTime(h.at))}</span>${h.note ? `<p>${esc(h.note)}</p>` : ''}</li>`;
  }).join('')}</ul>`;

  const active = ['requested', 'reschedule'].includes(a.status);
  const actions = active
    ? `<div class="gh-health-actions">
        ${btn(L('Badilisha muda', 'Request a new time'), 'open', { extra: { 'data-screen': 'appt-reschedule', 'data-id': a.id }, icon: 'i-clock' })}
        ${btn(L('Ghairi ombi', 'Cancel request'), 'appt-cancel', { extra: { 'data-id': a.id }, tone: 'danger', icon: 'i-x' })}
      </div>`
    : '';

  return block(d ? d.name : L('Mtaalamu', 'Professional'), dl([
    [L('Hali', 'Status'), { html: statusChip(a.status) }],
    [L('Tarehe', 'Date'), fmtDay(a.date)],
    [L('Saa', 'Time'), a.time],
    [L('Aina', 'Type'), typeLabel(a.type)],
    [L('Sababu', 'Reason'), a.reason || '—'],
    [L('Kituo', 'Facility'), d ? d.facility : '—'],
    [L('Imeombwa', 'Requested'), fmtDateTime(a.createdAt)],
    [L('Iliyothibitisha', 'Confirmed by'), a.confirmedBy || L('Hakuna mtu — hakuna mfumo uliounganishwa', 'Nobody — no system is connected')]
  ]) + history + actions)
    + callout(L('Hii ni kumbukumbu ya ombi lako, si uthibitisho wa kituo. Wasiliana na kituo moja kwa moja kuthibitisha.',
      'This is a record of your request, not a facility confirmation. Contact the facility directly to confirm.'), 'info')
    + btn(L('Rudi kwenye miadi', 'Back to appointments'), 'open', { extra: { 'data-screen': 'appointments' } });
}

export function screenApptReschedule(id) {
  const a = Store.appointment(id);
  if (!a) {
    return empty({ icon: 'i-calendar', title: L('Miadi haipo', 'Appointment not found'), body: L('Huenda kiungo si sahihi.', 'The link may be wrong.') });
  }
  const body = [
    `<input type="hidden" name="id" value="${esc(a.id)}">`,
    field({ label: L('Tarehe mpya', 'New date'), name: 'date', type: 'date', required: true, min: todayISO(), value: a.date }),
    field({ label: L('Saa mpya', 'New time'), name: 'time', type: 'time', required: true, value: a.time }),
    textarea({ label: L('Sababu (si lazima)', 'Reason (optional)'), name: 'note', rows: 2 })
  ].join('');
  return form('appt-reschedule', body, { submitLabel: L('Hifadhi ombi la muda mpya', 'Save reschedule request'), tone: 'primary' })
    + callout(L('Ombi la muda mpya linabaki kwenye kifaa hiki. Hakuna kituo kinachopokea.', 'The reschedule request stays on this device. No facility receives it.'), 'info');
}

export const careScreens = {
  doctors: {
    parent: 'experts',
    title: () => L('Tafuta mtaalamu', 'Find a professional'),
    sub: () => L('Orodha ya mfano, bila uthibitisho', 'Sample directory, no verification'),
    render: screenDoctors
  },
  'doctor-view': {
    parent: 'experts',
    title: () => L('Wasifu wa mtaalamu', 'Professional profile'),
    sub: () => L('Taarifa za mfano za onyesho', 'Sample display data'),
    render: screenDoctorView
  },
  appointments: {
    parent: 'experts',
    title: () => L('Miadi', 'Appointments'),
    sub: () => L('Maombi yanayobaki kwenye kifaa hiki', 'Requests that stay on this device'),
    render: screenAppointments
  },
  'appt-new': {
    parent: 'experts',
    title: () => L('Omba miadi', 'Request an appointment'),
    sub: () => L('Hakuna kituo kinachopokea ombi hili', 'No facility receives this request'),
    render: screenApptNew
  },
  'appt-view': {
    parent: 'experts',
    title: () => L('Miadi', 'Appointment'),
    sub: () => L('Kumbukumbu ya ombi la kifaa', 'A device record of your request'),
    render: screenApptView
  },
  'appt-reschedule': {
    parent: 'experts',
    title: () => L('Badilisha muda', 'Request a new time'),
    sub: () => L('Linabaki kwenye kifaa hiki', 'Stays on this device'),
    render: screenApptReschedule
  }
};
