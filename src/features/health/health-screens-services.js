/**
 * GuardHai · features/health/health-screens-services.js
 * Blood availability, medical emergency, health education, notifications,
 * settings and the limits page.
 *
 * The emergency flow is the most safety-sensitive screen in the app: it prepares
 * a summary on the device, shows exactly what it contains, and never claims that
 * a call, message or dispatch happened.
 */

import {
  L, T, esc, chip, btn, block, rows, row, dl, empty, callout, legend, form, field, select, textarea, check,
  view, fmtDate, fmtDateTime, todayISO, chip as chipOf
} from './health-ui.js';
import {
  Store, BLOOD_GROUPS, EMERGENCY_TYPES, EDU_CATEGORIES, ARTICLES, QR_SCOPES
} from './health-store.js';
import { NUMBERS } from '../emergency/sos.js';

const typeLabel = (id) => T(EMERGENCY_TYPES.find((t) => t.id === id) || { sw: id, en: id });
const emergencyType = (id) => EMERGENCY_TYPES.find((t) => t.id === id) || null;

/* ------------------------------------------------------------------ blood */

export function screenBlood() {
  const f = view.filter;
  const rowsFound = Store.searchBlood(f.group, f.place);
  const seg = [`<button type="button" class="${f.group === 'all' ? 'is-active' : ''}" data-hx="filter" data-filter="group" data-value="all">${L('Zote', 'All')}</button>`]
    .concat(BLOOD_GROUPS.map((g) => `<button type="button" class="${f.group === g ? 'is-active' : ''}" data-hx="filter" data-filter="group" data-value="${esc(g)}">${esc(g)}</button>`))
    .join('');

  const list = rowsFound.length
    ? rows(rowsFound.map((r) => row({
      icon: 'i-droplet',
      title: `${r.group} · ${r.facility}`,
      sub: `${r.place} · ${L('Vitengo', 'Units')}: ${r.units} · ${r.checkedAt ? fmtDateTime(r.checkedAt) : L('Muda haujathibitishwa', 'Time not verified')}`,
      chips: [r.source === 'synthetic' ? chip(L('Orodha ya mfano', 'Sample listing'), 'warn') : chip(L('Ripoti ya mtumiaji', 'User report'), 'info')]
    })))
    : empty({
      icon: 'i-droplet',
      title: L('Hakuna matokeo', 'No results'),
      body: L('Hakuna kituo kinacholingana na kundi hili la damu. Hii si uthibitisho kwamba damu haipatikani.',
        'No facility matches this blood group. That is not proof the blood is unavailable.')
    });

  const reportForm = form('blood-report', [
    field({ label: L('Kundi la damu', 'Blood group'), name: 'group', required: true,placeholder: 'O+', help: L('Mfano: A+, O-', 'For example: A+, O-') }),
    field({ label: L('Kituo', 'Facility'), name: 'facility', required: true }),
    field({ label: L('Mahali', 'Place'), name: 'place' }),
    field({ label: L('Vitengo ulivyoona', 'Units you saw'), name: 'units', inputmode: 'numeric' })
  ].join(''), { submitLabel: L('Ripoti', 'Report'), tone: 'blue', submitIcon: 'i-plus' });

  return `<div class="gh-health-searchrow">
      <label class="gh-health-search" for="hxBloodPlace">
        <svg class="ic" aria-hidden="true"><use href="#i-search"/></svg>
        <input id="hxBloodPlace" type="search" placeholder="${esc(L('Tafuta mji au kituo', 'Search a city or facility'))}"
          value="${esc(f.place)}" data-hx-input="filter" data-filter="place">
      </label>
    </div>
    <div class="gh-health-seg" role="group" aria-label="${esc(L('Kundi la damu', 'Blood group'))}">${seg}</div>
    ${list}
    ${callout(L('Orodha hii ni ya mfano na haijathibitishwa na benki yoyote ya damu. Ukihitaji damu haraka, wasiliana na kituo cha afya au benki ya damu moja kwa moja.',
      'This listing is sample data and is not confirmed by any blood bank. If you need blood urgently, contact a facility or blood bank directly.'), 'warn')}
    <div class="gh-health-actions">
      ${btn(L('Hatua za dharura', 'Emergency steps'), 'open', { extra: { 'data-screen': 'emergency' }, tone: 'danger', icon: 'i-siren' })}
    </div>
    ${block(L('Ripoti upatikanaji uliouona', 'Report availability you saw'), reportForm, {
      note: L('Ripoti yako inabaki kwenye kifaa hiki na inaonekana kama “Ripoti ya mtumiaji”. Haisasishwi kwa mtu mwingine.',
        'Your report stays on this device and is labelled “User report”. It is not shared with anyone.')
    }, { tone: 'violet', icon: 'i-droplet' })}`;
}

/* -------------------------------------------------------------- emergency */

export function screenEmergency() {
  const drafts = Store.emergencies();
  const numberLinks = NUMBERS.map((n) => `<a class="gh-health-btn is-danger" href="tel:${esc(n.number)}">
      <svg class="ic" aria-hidden="true"><use href="#i-phone"/></svg>
      <span>${esc(n.label)} · ${esc(n.number)}</span>
    </a>`).join('');

  const list = drafts.length
    ? rows(drafts.slice(0, 4).map((e) => row({
      icon: 'i-siren',
      title: typeLabel(e.type),
      sub: fmtDateTime(e.createdAt),
      chips: [e.status === 'cancelled' ? chip(L('Imeghairiwa', 'Cancelled'), 'neutral') : chip(L('Haijatumwa', 'Not sent'), 'warn')],
      action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'emergency-view', 'data-id': e.id }, cls: 'is-small' })
    })))
    : '<p class="gh-health-hint">' + L('Hakuna taarifa ya dharura iliyoandaliwa.', 'No emergency summary prepared.') + '</p>';

  return `<div class="gh-health-emg-panel">
      <div class="gh-health-emg-head">
        <svg class="ic" aria-hidden="true"><use href="#i-siren"/></svg>
        <div>
          <b>${L('Dharura ya kimatibabu', 'Medical emergency')}</b>
          <span>${L('App hii haipigi simu na haitumi msaada.', 'This app does not call or send help.')}</span>
        </div>
      </div>
      <p>${L('Andaa muhtasari wa taarifa muhimu ili uwe tayari kuusoma kwa simu au kumwonyesha mtu. Kisha piga nambari ya dharura mwenyewe.',
        'Prepare a summary of the essentials so you can read it out or show it to someone. Then call an emergency number yourself.')}</p>
      <div class="gh-health-actions">${numberLinks}</div>
      <p class="gh-health-hint">${L('Nambari hizi ni za Tanzania na zinaweza kutofautiana na eneo lako. Thibitisha nambari sahihi kabla ya dharura.',
        'These are Tanzania numbers and may differ for your area. Confirm the right number before an emergency.')}</p>
    </div>

    ${btn(L('Andaa taarifa ya dharura', 'Prepare emergency details'), 'open', { extra: { 'data-screen': 'emergency-new' }, tone: 'primary', icon: 'i-clipboard', cls: 'is-full' })}

    ${block(L('Taarifa zilizoandaliwa', 'Prepared summaries'), list, {
      note: L('Kila rekodi inaonyesha “Haijatumwa”. Hakuna mtu aliyepokea taarifa hizi.', 'Every record says “Not sent”. Nobody received these summaries.')
    }, { tone: 'red', icon: 'i-file-medical' })}
    ${callout(L('Hakuna ambulance, polisi au kituo kilichounganishwa. Hakuna msaada unaotumwa unapobonyeza kitufe hapa.',
      'No ambulance, police or facility is connected. Pressing a button here sends no help.'), 'danger', 'i-alert-circle')}`;
}

export function screenEmergencyNew() {
  const typeCards = EMERGENCY_TYPES.map((t) => `<label class="gh-health-choice">
      <input type="radio" name="type" value="${esc(t.id)}" required>
      <span class="gh-health-choice-ico"><svg class="ic" aria-hidden="true"><use href="#${t.icon}"/></svg></span>
      <span class="gh-health-choice-text">${esc(T(t))}</span>
    </label>`).join('');

  const body = `<fieldset class="gh-health-fieldset">
      <legend class="gh-health-legend-strong">${L('Aina ya dharura', 'Type of emergency')}</legend>
      <div class="gh-health-choicegrid">${typeCards}</div>
    </fieldset>
    ${textarea({ label: L('Maelezo mafupi (si lazima)', 'Short note (optional)'), name: 'note', rows: 3, help: L('Mfano: amepoteza fahamu, anapumua kwa shida.', 'For example: unconscious, difficulty breathing.') })}
    ${check({ label: L('Nijumuishe Medical ID kwenye muhtasari', 'Include my Medical ID in the summary'), name: 'shareMedicalId', checked: true, help: L('Inaonekana kwenye kifaa hiki pekee.', 'Shown on this device only.') })}
    ${check({ label: L('Nijumuishe eneo langu nikichagua', 'Include my location if I choose it'), name: 'shareLocation', help: L('Utaulizwa ruhusa kwenye hatua inayofuata.', 'You will be asked for permission in the next step.') })}`;

  return form('emergency', body, { submitLabel: L('Endelea kukagua', 'Continue to review'), tone: 'danger', submitIcon: 'i-arrow-right' })
    + callout(L('Hatua inayofuata inakuonyesha kila kitu kabla ya kuhifadhi. Hakuna kinachotumwa wakati wowote.',
      'The next step shows you everything before anything is saved. Nothing is ever sent.'), 'warn');
}

export function screenEmergencyReview() {
  const d = view.draft;
  if (!d) {
    return empty({
      icon: 'i-siren', title: L('Hakuna rasimu', 'No draft'),
      body: L('Anza tena ili kuandaa taarifa.', 'Start again to prepare the summary.'),
      action: btn(L('Anza', 'Start'), 'open', { extra: { 'data-screen': 'emergency-new' }, tone: 'primary' })
    });
  }

  const m = Store.medicalId();
  const contacts = Store.contactsFor();
  const locationBlock = view.location
    ? `<div class="gh-health-row"><svg class="ic" aria-hidden="true"><use href="#i-map-pin"/></svg>
        <div class="gh-health-rowcopy"><b>${L('Eneo limewekwa kwenye kifaa', 'Location captured on this device')}</b>
        <span>${esc(view.location.lat.toFixed(4))}, ${esc(view.location.lng.toFixed(4))}${view.location.accuracy ? ` · ±${Math.round(view.location.accuracy)} m` : ''}</span></div></div>`
    : view.locationError
      ? callout(view.locationError === 'denied'
        ? L('Ruhusa ya eneo ilikataliwa. Hakuna kuratibu zilizochukuliwa.', 'Location permission was denied. No coordinates were captured.')
        : L('Eneo halikuweza kubainika. Hakuna kuratibu zilizochukuliwa.', 'Location could not be determined. No coordinates were captured.'), 'warn')
      : `<p class="gh-health-hint">${L('Hakuna eneo lililochukuliwa. Unaweza kuomba eneo ukiwa tayari.', 'No location captured. You can request it when you are ready.')}</p>`;

  const medicalBlock = d.shareMedicalId
    ? `<div class="gh-health-row"><svg class="ic" aria-hidden="true"><use href="#i-id-card"/></svg>
        <div class="gh-health-rowcopy"><b>${esc(m.fullName || L('Hakuna Medical ID', 'No Medical ID'))}</b>
        <span>${esc([m.blood, m.allergies].filter(Boolean).join(' · ') || L('Hakuna taarifa zaidi', 'No further details'))}</span></div></div>`
    : '<p class="gh-health-hint">' + L('Medical ID haijajumuishwa.', 'Medical ID is not included.') + '</p>';

  const contactList = contacts.length
    ? rows(contacts.map((c) => row({ icon: 'i-phone', title: c.name, sub: c.phone, chips: [chip(L('Hakupigiwa', 'Not called'), 'neutral')] })))
    : '<p class="gh-health-hint">' + L('Hakuna watu wa dharura kwenye kifaa hiki.', 'No emergency contacts on this device.') + '</p>';

  return `${block(L('Kagua kabla ya kuhifadhi', 'Review before saving'), dl([
    [L('Aina', 'Type'), typeLabel(d.type)],
    [L('Maelezo', 'Note'), d.note || '—'],
    [L('Medical ID', 'Medical ID'), d.shareMedicalId ? L('Imejumuishwa', 'Included') : L('Haijajumuishwa', 'Not included')],
    [L('Eneo', 'Location'), d.shareLocation ? (view.location ? L('Limewekwa', 'Captured') : L('Halijachukuliwa', 'Not captured')) : L('Hakuhitajika', 'Not requested')],
    [L('Itatumwa kwa', 'Will be sent to'), L('Hakuna mtu — hakuna njia ya kuwasilisha', 'Nobody — no delivery channel exists')]
  ]) + locationBlock + `<h4 class="gh-health-subhead">${L('Medical ID itakayoonyeshwa', 'Medical ID that would be shown')}</h4>` + medicalBlock + contactList,
  { action: chip(L('Dharura', 'Emergency'), 'danger', 'i-siren') }, { tone: 'red', icon: 'i-check-circle' })}
    <div class="gh-health-actions">
      ${d.shareLocation ? btn(L('Tafuta eneo langu', 'Capture my location'), 'locate', { icon: 'i-map-pin' }) : ''}
      ${btn(L('Hifadhi taarifa', 'Save summary'), 'emergency-save', { tone: 'danger', icon: 'i-check' })}
      ${btn(L('Rudi', 'Back'), 'open', { extra: { 'data-screen': 'emergency-new' } })}
    </div>
    ${callout(L('Kuhifadhi hakupeleki taarifa kwa mtu yeyote. Piga nambari ya dharura mwenyewe au mpeleke mtu kituo cha afya.',
      'Saving sends nothing to anyone. Call an emergency number yourself or get the person to a facility.'), 'danger', 'i-alert-circle')}`;
}

export function screenEmergencyView(id) {
  const e = Store.emergency(id);
  if (!e) {
    return empty({ icon: 'i-siren', title: L('Taarifa haipo', 'Summary not found'), body: L('Huenda kiungo si sahihi.', 'The link may be wrong.') });
  }
  const m = Store.medicalId();
  const contacts = Store.contactsFor();

  const history = `<ul class="gh-health-timeline">${e.history.map((h) => `
    <li><b>${esc(h.status === 'draft' ? L('Imeandaliwa', 'Prepared') : h.status === 'cancelled' ? L('Imeghairiwa', 'Cancelled') : h.status)}</b>
    <span>${esc(fmtDateTime(h.at))}</span>${h.note ? `<p>${esc(h.note)}</p>` : ''}</li>`).join('')}</ul>`;

  const callList = NUMBERS.map((n) => `<a class="gh-health-btn is-danger" href="tel:${esc(n.number)}">
      <svg class="ic" aria-hidden="true"><use href="#i-phone"/></svg><span>${esc(n.number)}</span></a>`).join('');

  return `${block(L('Hali ya taarifa', 'Status of this summary'), dl([
    [L('Aina', 'Type'), typeLabel(e.type)],
    [L('Hali', 'Status'), e.status === 'cancelled' ? L('Imeghairiwa', 'Cancelled') : L('Imeandaliwa kwenye kifaa', 'Prepared on this device')],
    [L('Imetumwa', 'Transmitted'), L('Hapana', 'No')],
    [L('Imetumwa kwa dharura', 'Dispatched'), L('Hapana', 'No')],
    [L('Ilithibitishwa na', 'Confirmed by'), L('Hakuna mtu', 'Nobody')],
    [L('Maelezo', 'Note'), e.note || '—'],
    [L('Eneo', 'Location'), e.location ? `${e.location.lat.toFixed(4)}, ${e.location.lng.toFixed(4)} ${L('(kifaa pekee)', '(device only)')}` : L('Hakuna', 'None')]
  ]), { action: chip(L('Haijatumwa', 'Not sent'), 'warn', 'i-info') }, { tone: 'red', icon: 'i-info' })}

    ${block(L('Taarifa zilizoandaliwa', 'What the summary contains'), (e.shareMedicalId
    ? dl([
      [L('Jina', 'Name'), m.fullName || L('Hakuna', 'None')],
      [L('Kundi la damu', 'Blood group'), m.blood || L('Hakuna', 'None')],
      [L('Mzio', 'Allergies'), m.allergies || L('Hakuna', 'None')],
      [L('Magonjwa sugu', 'Conditions'), m.conditions || L('Hakuna', 'None')]
    ])
    : '<p class="gh-health-hint">' + L('Medical ID haikujumuishwa.', 'Medical ID was not included.') + '</p>')
    + `<h4 class="gh-health-subhead">${L('Watu wa dharura', 'Emergency contacts')}</h4>`
    + (contacts.length
      ? rows(contacts.map((c) => row({ icon: 'i-phone', title: c.name, sub: c.phone, chips: [chip(L('Hakupigiwa', 'Not called'), 'neutral')] })))
      : '<p class="gh-health-hint">' + L('Hakuna.', 'None.') + '</p>'), { tone: 'red', icon: 'i-file-medical' })}

    ${block(L('Piga simu mwenyewe', 'Call yourself'), `<div class="gh-health-actions">${callList}</div>`, {
      note: L('Vitufe hivi hufungua simu yako. Hazipigi simu wala kutuma ujumbe.', 'These buttons open your phone app. They do not place a call or send a message.')
    }, { tone: 'red', icon: 'i-phone' })}
    ${block(L('Historia', 'History'), history, { tone: 'slate', icon: 'i-clock' })}
    ${e.status === 'cancelled'
    ? ''
    : block(L('Ghairi taarifa', 'Cancel this summary'), btn(L('Ghairi', 'Cancel'), 'emergency-cancel', { extra: { 'data-id': e.id }, tone: 'danger', icon: 'i-x' }), {
      note: L('Kughairi hubadilisha hali kwenye kifaa hiki pekee.', 'Cancelling changes the state on this device only.')
    }, { tone: 'red', icon: 'i-alert-triangle' })}`;
}

/* -------------------------------------------------------------- education */

export function screenEducation() {
  const cat = EDU_CATEGORIES.some((c) => c.id === view.filter.cat) ? view.filter.cat : 'all';
  const seg = EDU_CATEGORIES.map((c) => `<button type="button" class="${cat === c.id ? 'is-active' : ''}" data-hx="filter" data-filter="cat" data-value="${esc(c.id)}">${esc(T(c))}</button>`).join('');
  const list = ARTICLES.filter((a) => cat === 'all' || a.cat === cat);

  const cards = list.map((a) => `<button type="button" class="gh-health-article" data-hx="open" data-screen="article-view" data-id="${esc(a.id)}">
      <span class="gh-health-article-thumb"><svg class="ic" aria-hidden="true"><use href="#i-book"/></svg></span>
      <span class="gh-health-article-copy">
        <b>${esc(T(a.title))}</b>
        <span>${esc(T(a.summary))}</span>
        <span class="gh-health-article-meta">${a.minutes} ${L('dakika', 'min')} · ${esc(T(EDU_CATEGORIES.find((c) => c.id === a.cat) || { sw: a.cat, en: a.cat }))}</span>
      </span>
    </button>`).join('');

  return `<div class="gh-health-seg" role="group" aria-label="${esc(L('Kundi la makala', 'Article category'))}">${seg}</div>
    <div class="gh-health-articlelist">${cards}</div>
    ${callout(L('Makala hizi ni maudhui ya mfano ya elimu ya jumla. Chanzo na mhakiki havijathibitishwa — usizitumie kama ushauri wa kimatibabu.',
      'These are sample general-education articles. Source and reviewer are unverified — do not treat them as medical advice.'), 'warn')}`;
}

export function screenArticle(id) {
  const a = ARTICLES.find((x) => x.id === id);
  if (!a) {
    return empty({ icon: 'i-book', title: L('Makala haipo', 'Article not found'), body: L('Huenda kiungo si sahihi.', 'The link may be wrong.') });
  }

  const meta = dl([
    [L('Kundi', 'Category'), T(EDU_CATEGORIES.find((c) => c.id === a.cat) || {})],
    [L('Muda wa kusoma', 'Reading time'), `${a.minutes} ${L('dakika', 'minutes')}`],
    [L('Mwandishi', 'Author'), T(a.author)],
    [L('Chanzo', 'Source'), L('Hakuna chanzo kilichothibitishwa', 'No verified source')],
    [L('Mhakiki', 'Reviewed by'), a.reviewed || L('Hakuna', 'None')]
  ]);

  const related = (a.related || []).map((rid) => ARTICLES.find((x) => x.id === rid)).filter(Boolean);
  const relatedBlock = related.length
    ? block(L('Soma pia', 'Read next'), rows(related.map((r) => row({
      icon: 'i-book',
      title: T(r.title),
      sub: `${r.minutes} ${L('dakika', 'min')}`,
      action: btn(L('Fungua', 'Open'), 'open', { extra: { 'data-screen': 'article-view', 'data-id': r.id }, cls: 'is-small' })
    }))))
    : '';

  return block(T(a.title), `<p class="gh-health-body-text">${esc(T(a.body))}</p>${meta}`, {
    action: chip(L('Maudhui ya mfano', 'Sample content'), 'warn', 'i-flask')
  })
    + callout(L('Hii ni elimu ya jumla, si ushauri wa kimatibabu kwa mtu mahususi. Kwa dalili mbaya, tafuta mtaalamu au piga nambari ya dharura.',
      'This is general education, not medical advice for a specific person. For serious symptoms, see a professional or call an emergency number.'), 'info')
    + relatedBlock;
}

/* ---------------------------------------------------------- notifications */

export function screenNotifications() {
  const list = Store.notifications();
  const html = list.length
    ? rows(list.map((n) => row({
      icon: n.icon || 'i-bell',
      title: n.title,
      sub: `${n.body} · ${fmtDateTime(n.at)}`,
      chips: [n.read ? chip(L('Imesomwa', 'Read'), 'neutral') : chip(L('Mpya', 'New'), 'info'), chip(L('Kifaa pekee', 'Device only'), 'neutral')]
    })))
    : empty({
      icon: 'i-bell',
      title: L('Hakuna taarifa', 'No notifications'),
      body: L('Taarifa zinazotengenezwa na vitendo vyako zitaonekana hapa. Hakuna arifa inayotumwa kwa simu au barua pepe.',
        'Notifications created by your own actions appear here. Nothing is pushed to your phone or email.')
    });

  return html
    + (list.length ? btn(L('Weka zote kama zimesomwa', 'Mark all as read'), 'notif-read', { icon: 'i-check' }) : '')
    + legend(L('Sehemu hii haitumi arifa za nje. Vibadilishaji vya arifa vimewekwa wazi kwenye mipangilio.',
      'This section sends no external notifications. Notification switches are labelled honestly in settings.'), 'i-info');
}

/* --------------------------------------------------------------- settings */

export function screenSettings() {
  const p = Store.prefs();
  const toggle = (key, label, help, enabled) => `<label class="gh-health-toggle">
      <input type="checkbox" data-hx-pref="${esc(key)}" ${p[key] ? 'checked' : ''} ${enabled ? '' : 'disabled'}>
      <span class="gh-health-toggle-copy"><b>${esc(label)}</b><em>${esc(help)}</em></span>
      <span class="gh-health-toggle-state${p[key] ? ' is-on' : ' is-off'}">${p[key] ? L('Imewaka', 'On') : L('Imezimwa', 'Off')}${enabled ? '' : ` — ${L('haitumiki bado', 'not implemented')}`}</span>
    </label>`;

  return `${block(L('Lugha', 'Language'), select({
    label: L('Lugha ya sehemu ya afya', 'Health section language'), name: 'language', value: p.language,
    options: [['sw', 'Kiswahili'], ['en', 'English']]
  }).replace('<select', '<select data-hx-change="language"'), {
    note: L('Lugha hubadilisha maandishi ya sehemu hii yote papo hapo.', 'The language switches the copy of this whole section immediately.')
  }, { tone: 'slate', icon: 'i-globe' })}
    ${block(L('Ufikivu', 'Accessibility'), [
    toggle('largeText', L('Maandishi makubwa', 'Larger text'), L('Huongeza ukubwa wa maandishi kwenye sehemu ya afya.', 'Increases text size inside the Health section.'), true),
    toggle('reduceMotion', L('Punguza mwendo', 'Reduce motion'), L('Huondoa miondoko ya uhuishaji.', 'Removes transition animations.'), true)
  ].join(''), { tone: 'slate', icon: 'i-eye' })}
    ${block(L('Arifa', 'Notifications'), [
    toggle('medReminders', L('Vikumbusho vya dawa', 'Medicine reminders'), L('Hakuna huduma ya arifa iliyounganishwa — hakuna kikumbusho kinachotumwa.', 'No notification service is connected — no reminder is sent.'), false),
    toggle('apptUpdates', L('Taarifa za miadi', 'Appointment updates'), L('Hakuna mfumo wa kituo unaoweza kutuma sasisho.', 'No facility system exists to send updates.'), false),
    toggle('proInvites', L('Mialiko ya kitaalamu', 'Professional invitations'), L('Hakuna njia ya kutuma mialiko.', 'There is no channel to send invitations.'), false),
    toggle('digest', L('Muhtasari wa wiki', 'Weekly digest'), L('Hakuna seva inayounda muhtasari.', 'No server builds a digest.'), false)
  ].join(''), { tone: 'amber', icon: 'i-bell' })}
    ${block(L('Faragha', 'Privacy'), [
    toggle('shareOnLockScreen', L('Onyesha taarifa kwenye skrini ya kufungia', 'Show details on the lock screen'), L('Haijatekelezwa kwenye kifaa hiki.', 'Not implemented on this device.'), false),
    toggle('allowQr', L('Ruhusu viungo vya QR', 'Allow QR access links'), L('Inadhibiti uundaji wa viungo kwenye kifaa hiki.', 'Controls link creation on this device.'), true)
  ].join(''), { tone: 'slate', icon: 'i-lock' })}
    ${block(L('Data yako', 'Your data'), `<div class="gh-health-actions">
      ${btn(Store.isDemo() ? L('Ondoa sampuli', 'Remove samples') : L('Weka sampuli', 'Load samples'), 'seed', { icon: 'i-flask' })}
      ${btn(L('Futa data yote', 'Erase all data'), 'clear', { tone: 'danger', icon: 'i-trash' })}
      ${btn(L('Mipaka ya sehemu', 'What this section cannot do'), 'open', { extra: { 'data-screen': 'about' }, icon: 'i-info' })}
    </div>`, { note: L('Kila kitu kinahifadhiwa kwenye kifaa hiki pekee. Kufuta hakuwezi kurudishwa.', 'Everything is stored on this device only. Erasing cannot be undone.') })}`;
}

/* ------------------------------------------------------------------ about */

export function screenAbout() {
  const works = [
    [L('Medical ID, rekodi na dawa', 'Medical ID, records and medicines'), L('Zinahifadhiwa kwenye kifaa hiki', 'Stored on this device')],
    [L('Viungo vya QR', 'QR access links'), L('Vinatengenezwa na kufutwa kwenye kifaa', 'Created and revoked on the device')],
    [L('Miadi, rufaa, mijadala', 'Appointments, referrals, discussions'), L('Rasimu za kifaa, hazitumwi', 'Device drafts, never sent')],
    [L('Ratiba ya dawa', 'Medicine schedule'), L('Kumbukumbu za kujirekodi', 'Self-reported log')]
  ];
  const doesNot = [
    [L('Kupiga simu au kutuma SMS', 'Calling or sending SMS'), L('Hakuna', 'None')],
    [L('Ambulance au dispatch', 'Ambulance or dispatch'), L('Hakuna', 'None')],
    [L('Kuthibitisha miadi', 'Confirming appointments'), L('Hakuna mfumo wa kituo', 'No facility system')],
    [L('Vikumbusho vya dawa', 'Medicine reminders'), L('Hakuna huduma ya arifa', 'No notification service')],
    [L('Uthibitisho wa wataalamu', 'Professional verification'), L('Hakuna mhakiki', 'No reviewer')],
    [L('Upatikanaji wa damu', 'Live blood availability'), L('Orodha ya mfano', 'Sample listing')],
    [L('Kupakia nyaraka', 'Uploading documents'), L('Faili zinabaki kwenye kifaa', 'Files stay on device')],
    [L('Kusawazisha kati ya vifaa', 'Syncing across devices'), L('Hakuna seva', 'No server')]
  ];

  return `${block(L('Kinachofanya kazi', 'What works'), rows(works.map(([a, b]) => row({ icon: 'i-check-circle', title: a, sub: b, chips: [chip(L('Kifaa pekee', 'Device only'), 'ok')] }))))}
    ${block(L('Kinachoshindikana', 'What is not connected'), rows(doesNot.map(([a, b]) => row({ icon: 'i-x', title: a, sub: b, chips: [chip(L('Haipo', 'Absent'), 'danger')] }))))}
    ${block(L('Data na faragha', 'Data and privacy'), dl([
    [L('Mahali pa data', 'Where data lives'), L('localStorage ya kifaa hiki', 'localStorage on this device')],
    [L('Usambazaji', 'Transmission'), L('Hakuna', 'None')],
    [L('Uthibitisho wa utambulisho', 'Identity verification'), L('Hakuna', 'None')],
    [L('Nambari za dharura', 'Emergency numbers'), L('112 · 114 · 110 (Tanzania)', '112 · 114 · 110 (Tanzania)')]
  ]))}
    ${callout(L('Ukihitaji msaada wa haraka, usitegemee app hii. Piga nambari ya dharura au nenda kituo cha afya kilicho karibu.',
      'If you need urgent help, do not rely on this app. Call an emergency number or go to the nearest facility.'), 'danger', 'i-siren')}`;
}

export const serviceScreens = {
  blood: { parent: 'more', title: () => L('Upatikanaji wa damu', 'Blood availability'), sub: () => L('Orodha ya mfano yenye vyanzo', 'Sample listing with sources'), render: screenBlood },
  emergency: { parent: 'more', title: () => L('Dharura ya kimatibabu', 'Medical emergency'), sub: () => L('App haipigi simu wala kutuma msaada', 'The app neither calls nor sends help'), render: screenEmergency },
  'emergency-new': { parent: 'more', title: () => L('Andaa taarifa', 'Prepare details'), sub: () => L('Hakuna kinachotumwa', 'Nothing is transmitted'), render: screenEmergencyNew },
  'emergency-review': { parent: 'more', title: () => L('Kagua taarifa', 'Review the summary'), sub: () => L('Kila kitu kabla ya kuhifadhi', 'Everything before saving'), render: screenEmergencyReview },
  'emergency-view': { parent: 'more', title: () => L('Taarifa ya dharura', 'Emergency summary'), sub: () => L('Haijatumwa kwa mtu yeyote', 'Not sent to anyone'), render: screenEmergencyView },
  education: { parent: 'more', title: () => L('Elimu ya afya', 'Health education'), sub: () => L('Maudhui ya mfano, chanzo hakijathibitishwa', 'Sample content, unverified sources'), render: screenEducation },
  'article-view': { parent: 'more', title: () => L('Makala', 'Article'), sub: () => L('Elimu ya jumla, si ushauri', 'General education, not advice'), render: screenArticle },
  notifications: { parent: 'more', title: () => L('Taarifa', 'Notifications'), sub: () => L('Zinabaki kwenye kifaa hiki', 'They stay on this device'), render: screenNotifications },
  settings: { parent: 'more', title: () => L('Mipangilio', 'Settings'), sub: () => L('Faragha, ufikivu na data', 'Privacy, accessibility and data'), render: screenSettings },
  about: { parent: 'more', title: () => L('Mipaka ya sehemu hii', 'Limits of this section'), sub: () => L('Kinachofanya kazi na kinachokosekana', 'What works and what is absent'), render: screenAbout }
};
