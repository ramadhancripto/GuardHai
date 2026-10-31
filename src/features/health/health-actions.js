/**
 * GuardHai · features/health/health-actions.js
 * The single dispatcher behind every `data-hx` control in the Health section.
 *
 * Two rules matter:
 *   1. Validation never throws typed input away — errors are painted into the
 *      open form, focus moves to the first bad field, and nothing re-renders.
 *   2. Every success message says where the change was stored ("on this
 *      device") and, when relevant, what was *not* sent.
 */

import { L, view, resetFilters } from './health-ui.js';
import { Store } from './health-store.js';

export const ACTION_NAMES = ['back', 'open', 'tab', 'filter', 'seed', 'clear', 'confirm-yes', 'confirm-no', 'contact-del', 'dose', 'dose-undo', 'record-del', 'med-del', 'qr-revoke', 'appt-cancel', 'case-status', 'community-join', 'post-report', 'referral-ready', 'referral-respond', 'pro-submit', 'emergency-save', 'emergency-cancel', 'locate', 'notif-read'];

export const ERROR_TEXT = {
  required: L('Sehemu hii inahitajika.', 'This field is required.'),
  'too-short': L('Andika angalau herufi 3.', 'Enter at least 3 characters.'),
  'too-long': L('Maandishi ni marefu mno.', 'This text is too long.'),
  'invalid-date': L('Tumia tarehe halali (MM/DD/SSSS).', 'Use a valid date.'),
  'past-date': L('Tarehe haiwezi kuwa zamani.', 'The date cannot be in the past.'),
  'future-date': L('Tarehe haiwezi kuwa mbeleni.', 'The date cannot be in the future.'),
  'invalid-time': L('Tumia saa halali, mfano 08:30.', 'Use a valid time, for example 08:30.'),
  'invalid-phone': L('Nambari ya simu haitoshi.', 'That phone number is too short.'),
  'invalid-number': L('Tumia namba halali.', 'Use a valid number.'),
  'invalid-time-range': L('Muda wa mwisho lazima uwe baada ya kuanza.', 'The end time must be after the start.'),
  invalid: L('Thamani hii hairuhusiwi.', 'That value is not allowed.')
};

const value = (key) => ERROR_TEXT[key] || key;

/* ------------------------------------------------------------- form errors */

export function showFieldErrors(form, errors) {
  form.querySelectorAll('.gh-health-error[data-hx-inline]').forEach((n) => n.remove());
  form.querySelectorAll('[aria-invalid="true"]').forEach((n) => n.removeAttribute('aria-invalid'));
  const stale = form.querySelector('[data-hx-formalert]');
  if (stale) stale.remove();

  let first = null;
  Object.entries(errors || {}).forEach(([name, key]) => {
    if (!key) return;
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) return;
    const host = input.closest('.gh-health-field') || input.closest('fieldset') || form;
    const span = document.createElement('span');
    span.className = 'gh-health-error';
    span.setAttribute('data-hx-inline', '');
    span.textContent = value(key);
    host.appendChild(span);
    input.setAttribute('aria-invalid', 'true');
    if (!first) first = input;
  });

  if (first) {
    first.focus({ preventScroll: false });
    if (typeof first.scrollIntoView === 'function') first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } else {
    const alert = document.createElement('p');
    alert.className = 'gh-health-error';
    alert.setAttribute('role', 'alert');
    alert.setAttribute('data-hx-formalert', '');
    alert.textContent = L('Kagua sehemu zilizoainishwa.', 'Check the highlighted fields.');
    form.prepend(alert);
  }
}

/* -------------------------------------------------------- confirm dialog */

let pendingConfirm = null;

async function confirmThen({ title, body, label, tone = 'danger', onYes }) {
  const { openSheet, closeSheet } = await import('../../ui/sheet.js');
  pendingConfirm = async () => {
    closeSheet();
    pendingConfirm = null;
    await onYes();
  };
  openSheet(title, `
    <p class="gh-health-body-text">${body}</p>
    <div class="gh-health-actions">
      <button type="button" class="gh-health-btn${tone === 'danger' ? ' is-danger' : ' is-primary'}" data-hx="confirm-yes">${label}</button>
      <button type="button" class="gh-health-btn" data-hx="confirm-no">${L('Ghairi', 'Cancel')}</button>
    </div>`);
}

/* --------------------------------------------------------------- navigation */

let navigate = () => {};
let repaint = () => {};
export const bindNavigation = (fn) => { navigate = fn; };
export const bindRepaint = (fn) => { repaint = fn; };

const PARTITION_NAMES = ['overview', 'medical', 'records', 'meds', 'experts', 'more'];

const open = (screen, id = null) => {
  view.errors = {};
  if (PARTITION_NAMES.includes(screen)) {
    view.screen = null;
    view.param = null;
    view.partition = screen;
    resetFilters();
    repaint({ scroll: true });
    return;
  }
  if (view.screen !== screen) resetFilters();
  view.screen = screen;
  view.param = id;
  view.flash = null;
  repaint({ scroll: true });
};

/* -------------------------------------------------------------- actions */

export function runAction(action, el) {
  const id = el ? el.dataset.id : '';
  const val = el ? el.dataset.value : '';

  switch (action) {
    case 'back':
      view.screen = null; view.param = null; view.errors = {}; view.flash = null; repaint();
      return true;

    case 'open':
      open(el.dataset.screen, el.dataset.id || null);
      return true;

    case 'tab':
      view.screen = null; view.param = null; view.errors = {};
      resetFilters();
      view.partition = el.dataset.tab || 'overview';
      repaint();
      return true;

    case 'filter':
      if (el.dataset.filter === 'q' || el.dataset.filter === 'place') return true; // typed, handled on input
      view.filter[el.dataset.filter] = val;
      repaint();
      return true;

    case 'seed':
      if (Store.isDemo()) {
        confirmThen({
          title: L('Ondoa sampuli', 'Remove samples'),
          body: L('Sampuli zote za majaribio zitaondolewa. Data uliyoingiza mwenyewe haitaguswa.', 'All synthetic samples will be removed. Data you entered yourself is untouched.'),
          label: L('Ondoa sampuli', 'Remove samples'),
          onYes: () => { Store.clearSamples(); view.flash = { text: L('Sampuli zimeondolewa.', 'Samples removed.'), tone: 'ok' }; repaint(); }
        });
        return true;
      }
      Store.seedDemo();
      // the permanent demo banner in the header already says this — a flash
      // would be the same sentence twice on one screen.
      view.flash = null;
      repaint();
      return true;

    case 'clear':
      confirmThen({
        title: L('Futa data yote', 'Erase all data'),
        body: L('Data yote ya sehemu ya afya kwenye kifaa hiki itaondolewa. Hakuna kurudi nyuma.', 'All Health data on this device will be removed. This cannot be undone.'),
        label: L('Futa yote', 'Erase everything'),
        onYes: () => { Store.clearAll(); resetFilters(); view.screen = null; view.partition = 'overview'; view.flash = { text: L('Data yote imeondolewa kwenye kifaa hiki.', 'All data was erased from this device.'), tone: 'ok' }; repaint(); }
      });
      return true;

    case 'confirm-yes':
      if (pendingConfirm) pendingConfirm();
      return true;

    case 'confirm-no':
      pendingConfirm = null;
      import('../../ui/sheet.js').then(({ closeSheet }) => closeSheet());
      return true;

    case 'contact-del':
      Store.removeContact(id);
      view.flash = { text: L('Mtu wa dharura ameondolewa kwenye kifaa hiki.', 'The emergency contact was removed from this device.'), tone: 'ok' };
      repaint();
      return true;

    case 'dose':
      Store.recordDose(id, el.dataset.time, el.dataset.status);
      view.flash = {
        text: el.dataset.status === 'taken'
          ? L('Dozi imerekodiwa kama imetumika — ni taarifa yako mwenyewe.', 'Dose logged as taken — this is your own report.')
          : L('Dozi imerekodiwa kama imerukwa.', 'Dose logged as skipped.'),
        tone: 'ok'
      };
      repaint();
      return true;

    case 'dose-undo':
      Store.clearDose(id, el.dataset.time);
      view.flash = { text: L('Rekodi ya dozi imeondolewa.', 'The dose entry was removed.'), tone: 'ok' };
      repaint();
      return true;

    case 'record-del':
      confirmThen({
        title: L('Futa rekodi', 'Delete record'),
        body: L('Rekodi hii itaondolewa kwenye kifaa hiki. Hakuna nakala nyingine.', 'This record will be removed from this device. No other copy exists.'),
        label: L('Futa rekodi', 'Delete record'),
        onYes: () => { Store.removeRecord(id); view.screen = null; view.partition = 'records'; view.flash = { text: L('Rekodi imefutwa.', 'Record deleted.'), tone: 'ok' }; repaint(); }
      });
      return true;

    case 'med-del':
      confirmThen({
        title: L('Futa dawa', 'Delete medicine'),
        body: L('Dawa na historia yake ya dozi zitaondolewa kwenye kifaa hiki.', 'The medicine and its dose history will be removed from this device.'),
        label: L('Futa dawa', 'Delete medicine'),
        onYes: () => { Store.deleteMed(id); view.screen = null; view.partition = 'meds'; view.flash = { text: L('Dawa imefutwa.', 'Medicine deleted.'), tone: 'ok' }; repaint(); }
      });
      return true;

    case 'qr-revoke':
      Store.revokeToken(id);
      view.flash = { text: L('Kiungo kimefutwa. Hakuna mtu anayeweza kukitumia tena.', 'The link was revoked. Nobody can use it any more.'), tone: 'ok' };
      repaint();
      return true;

    case 'appt-cancel':
      confirmThen({
        title: L('Ghairi ombi la miadi', 'Cancel the appointment request'),
        body: L('Ombi litawekwa kama “Imeghairiwa” kwenye kifaa hiki. Kituo hakijawahi kupokea ombi hili.', 'The request will be marked “Cancelled” on this device. No facility ever received it.'),
        label: L('Ghairi ombi', 'Cancel request'),
        onYes: () => { Store.updateAppointment(id, 'cancel', 'Imeghairiwa na mtumiaji'); view.flash = { text: L('Ombi limeghairiwa.', 'Request cancelled.'), tone: 'ok' }; repaint(); }
      });
      return true;

    case 'case-status':
      Store.setCaseStatus(id, el.dataset.status, L('Imehaririwa kwenye kifaa hiki.', 'Changed on this device.'));
      view.flash = { text: L('Hali ya mjadala imebadilika kwenye kifaa hiki.', 'The discussion status changed on this device.'), tone: 'ok' };
      repaint();
      return true;

    case 'community-join':
      Store.toggleMembership(id);
      view.flash = { text: L('Uanachama umebadilika kwenye kifaa hiki — hakuna mtu aliyejulishwa.', 'Membership changed on this device — nobody was notified.'), tone: 'ok' };
      repaint();
      return true;

    case 'post-report':
      Store.reportCommunityPost(id, L('Imeripotiwa kwenye kifaa hiki.', 'Reported on this device.'));
      view.flash = { text: L('Chapisho limeripotiwa kwenye kifaa hiki. Hakuna msimamizi aliyeunganishwa.', 'The post was flagged on this device. No moderator is connected.'), tone: 'warn' };
      repaint();
      return true;

    case 'referral-ready':
      Store.markReferralReady(id);
      view.flash = { text: L('Rufaa imewekwa “tayari” kwenye kifaa hiki — haijatumwa kwa mtu yeyote.', 'The referral is marked “ready” on this device — nothing was sent.'), tone: 'warn' };
      repaint();
      return true;

    case 'referral-respond':
      Store.respondReferral(id, el.dataset.action === 'accepted' ? 'accept' : 'decline', L('Imeandikwa kwenye kifaa hiki.', 'Recorded on this device.'));
      view.flash = { text: L('Hali ya rufaa imebadilika kwenye kifaa hiki pekee.', 'The referral state changed on this device only.'), tone: 'ok' };
      repaint();
      return true;

    case 'pro-submit':
      Store.submitVerification();
      view.flash = { text: L('Wasilisho limehifadhiwa kwenye kifaa hiki. Hakuna mhakiki aliyeunganishwa.', 'Your submission is stored on this device. No reviewer is connected.'), tone: 'warn' };
      repaint();
      return true;

    case 'emergency-save': {
      const d = view.draft;
      if (!d) { view.flash = { text: L('Hakuna rasimu ya kuhifadhi.', 'There is no draft to save.'), tone: 'danger' }; repaint(); return true; }
      const r = Store.createEmergency({
        type: d.type,
        note: d.note,
        shareLocation: Boolean(d.shareLocation && view.location),
        shareMedicalId: Boolean(d.shareMedicalId),
        location: view.location
      });
      if (!r.ok) {
        view.flash = { text: L('Chagua aina ya dharura kwanza.', 'Choose the type of emergency first.'), tone: 'danger' };
        open('emergency-new');
        return true;
      }
      view.draft = null;
      view.location = null;
      view.locationError = null;
      view.flash = { text: L('Taarifa imehifadhiwa kwenye kifaa hiki. Haijatumwa kwa mtu yeyote — piga simu mwenyewe.', 'The summary is saved on this device. It was not sent to anyone — make the call yourself.'), tone: 'danger' };
      open('emergency-view', r.emergency.id);
      return true;
    }

    case 'emergency-cancel':
      confirmThen({
        title: L('Ghairi taarifa ya dharura', 'Cancel the emergency summary'),
        body: L('Taarifa itawekwa “Imeghairiwa” kwenye kifaa hiki. Hakuna mtu aliyejulishwa kwa sababu hakuna aliyepokea.', 'The summary will be marked “Cancelled” on this device. Nobody is notified because nobody received it.'),
        label: L('Ghairi', 'Cancel it'),
        onYes: () => { Store.cancelEmergency(id, L('Imeghairiwa kwenye kifaa.', 'Cancelled on the device.')); view.flash = { text: L('Taarifa imeghairiwa.', 'Summary cancelled.'), tone: 'ok' }; repaint(); }
      });
      return true;

    case 'locate': {
      view.locationError = null;
      if (!navigator.geolocation) {
        view.locationError = 'unavailable';
        view.flash = { text: L('Kifaa hiki hakitoi eneo. Hakuna kuratibu zilizochukuliwa.', 'This device has no location service. No coordinates were captured.'), tone: 'warn' };
        repaint();
        return true;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          view.location = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          view.locationError = null;
          view.flash = { text: L('Eneo limewekwa kwenye kifaa hiki pekee. Hakuna kinachotumwa.', 'Location captured on this device only. Nothing is sent.'), tone: 'info' };
          repaint();
        },
        (err) => {
          view.locationError = err && err.code === 1 ? 'denied' : (err && err.code === 3 ? 'timeout' : 'unavailable');
          view.location = null;
          view.flash = {
            text: view.locationError === 'denied'
              ? L('Ruhusa ya eneo ilikataliwa. Hakuna kuratibu zilizochukuliwa.', 'Location permission was denied. No coordinates were captured.')
              : L('Eneo halikuweza kubainika. Hakuna kuratibu zilizochukuliwa.', 'Location could not be determined. No coordinates were captured.'),
            tone: 'warn'
          };
          repaint();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
      return true;
    }

    case 'notif-read':
      Store.markNotificationsRead();
      view.flash = { text: L('Taarifa zote zimewekwa kama zimesomwa.', 'All notifications are marked read.'), tone: 'ok' };
      repaint();
      return true;

    default:
      return false;
  }
}

/* ---------------------------------------------------------- input/change */

export function runInput(el) {
  const key = el.dataset.filter;
  if (!key) return false;
  view.filter[key] = el.value;
  repaint({ focus: el.id, caret: 'end' });
  return true;
}

export function runChange(el) {
  if (el.dataset.hxChange === 'filter') {
    view.filter[el.dataset.filter] = el.value;
    repaint();
    return true;
  }
  if (el.dataset.hxChange === 'language') {
    if (window.I18N && typeof window.I18N.setLanguage === 'function') {
      window.I18N.setLanguage(el.value);
    }
    return true;
  }
  if (el.dataset.hxPref) {
    const key = el.dataset.hxPref;
    Store.setPref(key, el.checked);
    view.flash = { text: L('Mipangilio imehifadhiwa kwenye kifaa hiki.', 'The setting was saved on this device.'), tone: 'ok' };
    repaint();
    return true;
  }
  return false;
}

/* ---------------------------------------------------------------- submits */

export function submitForm(form) {
  const kind = form.dataset.hxForm;
  const data = Object.fromEntries(new FormData(form).entries());
  const fileInput = form.querySelector('input[type="file"]');
  const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
  const fail = (errors) => showFieldErrors(form, errors);
  const done = (text, tone, screen, param = null) => {
    view.flash = { text, tone };
    if (screen) open(screen, param); else repaint();
  };

  switch (kind) {
    case 'medical': {
      const r = Store.saveMedicalId(data);
      if (!r.ok) return fail(r.errors);
      return done(L('Medical ID imehifadhiwa kwenye kifaa hiki.', 'Medical ID saved on this device.'), 'ok', 'medical-profile');
    }
    case 'contact': {
      const r = Store.addContact(data);
      if (!r.ok) return fail(r.errors);
      view.flash = { text: L('Mtu wa dharura ameongezwa kwenye kifaa hiki. Hakuna SMS inayotumwa.', 'Emergency contact added on this device. No SMS is sent.'), tone: 'ok' };
      return open('medical-contacts');
    }
    case 'qr': {
      const scopes = Array.from(form.querySelectorAll('input[name="scope"]:checked')).map((i) => i.value);
      if (!scopes.length) return fail({ scope: 'required' });
      Store.createToken(scopes, data.hours);
      return done(L('Kiungo kimetengenezwa kwenye kifaa hiki. Futa ukipata wasiwasi.', 'Access link created on this device. Revoke it whenever you like.'), 'ok', 'medical-qr');
    }
    case 'record': {
      const r = Store.addRecord({ ...data, file });
      if (!r.ok) return fail(r.errors);
      return done(L('Rekodi imehifadhiwa kwenye kifaa hiki. Hakuna kituo kilichopokea.', 'Record saved on this device. No facility received it.'), 'ok', 'records');
    }
    case 'med': {
      const r = Store.addMed({ ...data, file });
      if (!r.ok) return fail(r.errors);
      return done(L('Dawa imehifadhiwa kwenye kifaa hiki.', 'Medicine saved on this device.'), 'ok', 'med-view', r.med.id);
    }
    case 'med-edit': {
      const r = Store.updateMed(view.param, {
        name: data.name, dose: data.dose, instructions: data.instructions,
        times: String(data.times || '').split(',').map((t) => t.trim()).filter(Boolean)
      });
      if (r && r.ok === false) return fail(r.errors || { name: 'required' });
      return done(L('Mabadiliko yamehifadhiwa kwenye kifaa hiki.', 'Changes saved on this device.'), 'ok', 'med-view', view.param);
    }
    case 'appt': {
      const r = Store.requestAppointment(data);
      if (!r.ok) return fail(r.errors);
      return done(L('Ombi limehifadhiwa kama “Imeombwa”. Hakuna kituo kilichopokea na hakuna uthibitisho.', 'Request saved as “Requested”. No facility received it and nothing is confirmed.'), 'info', 'appt-view', r.appointment.id);
    }
    case 'appt-reschedule': {
      const r = Store.updateAppointment(data.id, 'reschedule', `Muda mpya: ${data.date} ${data.time}. ${data.note || ''}`.trim());
      if (r && r.ok === false) return fail({ date: 'invalid-date' });
      return done(L('Ombi la muda mpya limehifadhiwa kwenye kifaa hiki. Hakuna kituo kilichopokea.', 'The reschedule request is saved on this device. No facility received it.'), 'warn', 'appt-view', data.id);
    }
    case 'case': {
      const r = Store.createCase(data);
      if (!r.ok) return fail(r.errors);
      return done(L('Mjadala umeanzishwa kwenye kifaa hiki. Hakuna mtaalamu aliyealikwa.', 'Discussion started on this device. No specialist was invited.'), 'ok', 'case-view', r.case.id);
    }
    case 'case-reply': {
      const r = Store.replyToCase(data.id, data.body, data.stance);
      if (!r.ok) return fail(r.errors);
      return open('case-view', data.id);
    }
    case 'case-summary': {
      Store.saveCaseSummary(data.id, data.summary);
      return open('case-view', data.id);
    }
    case 'meeting': {
      const r = Store.scheduleMeeting(data);
      if (!r.ok) return fail(r.errors);
      return done(L('Mkutano umepangwa kwenye kifaa hiki. Hakuna mwaliko uliotumwa.', 'Meeting saved on this device. No invitation was sent.'), 'ok', 'meeting-view', r.meeting.id);
    }
    case 'meeting-notes': {
      Store.updateMeeting(data.id, { notes: data.notes, outcomes: data.outcomes });
      return open('meeting-view', data.id);
    }
    case 'meeting-followup': {
      const m = Store.meeting(data.id);
      if (!m) return;
      Store.updateMeeting(data.id, { followUps: m.followUps.concat({ text: String(data.followUp || '').trim(), at: new Date().toISOString() }) });
      view.flash = { text: L('Hatua imeongezwa kwenye kifaa hiki.', 'Follow-up added on this device.'), tone: 'ok' };
      return open('meeting-view', data.id);
    }
    case 'community-post': {
      const r = Store.addCommunityPost(data.id, data.body);
      if (!r.ok) return fail(r.errors);
      view.flash = { text: L('Chapisho limewekwa kwenye kifaa hiki. Hakuna mtu mwingine anayeona.', 'Post saved on this device. Nobody else can see it.'), tone: 'ok' };
      return open('community-view', data.id);
    }
    case 'referral': {
      const recordIds = Object.keys(data).filter((k) => k.startsWith('record-') && data[k]).map((k) => k.slice(7));
      const r = Store.createReferral({
        doctorId: data.doctorId, reason: data.reason, urgency: data.urgency, summary: data.summary, recordIds
      });
      if (!r.ok) return fail(r.errors);
      return done(L('Rasimu ya rufaa imehifadhiwa. Haijawasilishwa kwa mtu yeyote.', 'Referral draft saved. It was not delivered to anyone.'), 'warn', 'referral-view', r.referral.id);
    }
    case 'pro': {
      const r = Store.saveProProfile({ ...data, specialty: Number(data.specialty) });
      if (!r.ok || (r.errors && Object.keys(r.errors).length)) return fail(r.errors || { name: 'required' });
      return done(L('Wasifu umehifadhiwa kwenye kifaa hiki. Haujathibitishwa.', 'Profile saved on this device. It is not verified.'), 'ok', 'pro');
    }
    case 'pro-doc': {
      Store.attachProDocument(file);
      view.flash = { text: L('Faili limeambatishwa kwenye kifaa hiki — halijapakiwa mahali popote.', 'The file is attached on this device — it was not uploaded anywhere.'), tone: 'warn' };
      return open('pro');
    }
    case 'blood-report': {
      const r = Store.reportBlood(data);
      if (!r.ok) return fail(r.errors);
      return done(L('Ripoti yako imehifadhiwa kama “Ripoti ya mtumiaji” kwenye kifaa hiki.', 'Your report is saved as a “User report” on this device.'), 'warn', 'blood');
    }
    case 'emergency': {
      const type = form.querySelector('input[name="type"]:checked');
      if (!type) return fail({ type: 'required' });
      view.draft = {
        type: type.value,
        note: String(data.note || '').trim(),
        shareMedicalId: Boolean(data.shareMedicalId),
        shareLocation: Boolean(data.shareLocation)
      };
      view.location = null;
      view.locationError = null;
      return open('emergency-review');
    }
    default:
      return false;
  }
}
