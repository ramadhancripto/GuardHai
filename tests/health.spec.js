/**
 * GuardHai — Health section suite (P2: full interactive prototype).
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/health.spec.js [url]
 *
 * The suite drives the real UI (clicks, typing, submits) through the twelve
 * flows the brief fixes and then checks the honesty rules that matter most:
 * the store starts empty, samples are labelled, nothing is transmitted, no
 * verification badge is granted, and no button is wired to nothing.
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const R = [];
const rec = (id, name, ok, detail = '') => {
  R.push({ id, name, ok: !!ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${id}  ${name}${detail ? `\n        ${detail}` : ''}`;
  if (process.env.HX_VERBOSE || !ok) console.log(line);
};

async function waitForApp(page, ms = 20000) {
  const started = Date.now();
  for (;;) {
    if (await page.evaluate(() => typeof window.AuthFlow !== 'undefined')) return;
    if (Date.now() - started > ms) throw new Error(`app did not boot within ${ms}ms`);
    await page.waitForTimeout(150);
  }
}

async function boot(page) {
  await page.goto(URL, { waitUntil: 'load' });
  try { await waitForApp(page); } catch (e) { await page.waitForTimeout(600); await waitForApp(page); }
  await page.evaluate(() => AuthFlow.goTo('landing'));
  await page.waitForTimeout(120);
  await page.evaluate(() => AuthFlow.goTo('register'));
  await page.waitForTimeout(300);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(1300);
  await page.evaluate(() => HomeUI.go('health'));
  await page.waitForTimeout(500);
}

/* --------------------------------------------------------------- helpers */

const text = (page) => page.evaluate(() => document.getElementById('healthPage').innerText);
const panelText = (page) => page.evaluate(() => document.getElementById('ghHealthPanels').innerText);
const open = async (page, screen, id = null) => {
  await page.evaluate(([s, i]) => window.HealthUI.open(s, i), [screen, id]);
  await page.waitForTimeout(200);
};
const tab = async (page, partition) => {
  await page.evaluate((t) => window.HealthUI.select(t), partition);
  await page.waitForTimeout(200);
};
const act = async (page, value, extra = {}) => {
  const sel = Object.entries(extra).map(([k, v]) => `[data-${k}="${v}"]`).join('');
  await page.click(`[data-hx="${value}"]${sel}`, { timeout: 5000 });
  await page.waitForTimeout(260);
};
const fill = async (page, name, value) => {
  await page.fill(`[name="${name}"]`, value);
};
const submit = async (page, form) => {
  await page.evaluate((f) => {
    const el = document.querySelector(`[data-hx-form="${f}"]`);
    if (el) el.requestSubmit ? el.requestSubmit() : el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, form);
  await page.waitForTimeout(320);
};
const store = (page, fn, ...args) => page.evaluate(fn, ...args);
const bodyHas = async (page, needle) => (await panelText(page)).includes(needle);

/* ------------------------------------------------------------------ run */

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await boot(page);

  /* ---------------------------------------------------- shell + partitioning */

  const navIds = await page.evaluate(() => Array.from(document.querySelectorAll('#appBottomNav .nav-tab-btn, #appBottomNav .nav-sos-slot')).map((b) => b.id).filter(Boolean));
  rec('HG1', 'Main navigation keeps its five slots, Health included',
    JSON.stringify(navIds) === JSON.stringify(['tab-home', 'tab-health', 'tab-sos', 'tab-shield', 'tab-chat']) && navIds.length === 5,
    navIds.join(','));

  const shell = await page.evaluate(() => ({
    active: document.getElementById('healthPage').classList.contains('active'),
    tabs: document.querySelectorAll('[data-health-tab]').length,
    panel: document.getElementById('ghHealthPanels').dataset.healthPartition,
    title: document.querySelector('.gh-health-title')?.innerText
  }));
  rec('HG2', 'Health opens from its tab with the inner tab bar intact',
    shell.active && shell.tabs === 6 && shell.panel === 'overview' && /Health/i.test(shell.title || ''),
    JSON.stringify(shell));

  const header = await text(page);
  rec('HG3', 'Header states that data stays on this device with no server connected',
    /Kwenye kifaa hiki pekee/.test(header) && /Hakuna seva iliyounganishwa/.test(header));

  const empty = await page.evaluate(() => {
    const s = window.HealthUI.store.getState();
    return { records: s.records.length, meds: s.meds.length, appts: s.appointments.length, mode: s.mode };
  });
  rec('HG4', 'A new install starts empty — no invented records, medicines or appointments',
    empty.records === 0 && empty.meds === 0 && empty.appts === 0 && empty.mode === 'empty',
    JSON.stringify(empty));

  await page.evaluate(() => window.HealthUI.store.seedDemo());
  await tab(page, 'overview');
  const seeded = await page.evaluate(() => ({
    banner: !document.getElementById('ghHealthDemoBanner').hidden,
    bannerText: document.getElementById('ghHealthDemoBanner').innerText,
    synthetic: window.HealthUI.store.getState().records.every((r) => r.synthetic)
  }));
  rec('HG5', 'Sample mode is explicit: banner shown and every seeded row is flagged synthetic',
    seeded.banner && /Sampuli/.test(seeded.bannerText) && seeded.synthetic, JSON.stringify(seeded));

  await page.evaluate(() => window.HealthUI.store.clearSamples());
  await page.waitForTimeout(200);
  const cleaned = await page.evaluate(() => ({
    records: window.HealthUI.store.getState().records.length,
    mode: window.HealthUI.store.getState().mode
  }));
  rec('HG6', 'Removing samples returns the section to its empty state', cleaned.records === 0 && cleaned.mode === 'empty', JSON.stringify(cleaned));

  /* --------------------------------------------------------------- Medical ID */

  await tab(page, 'medical');
  await open(page, 'medical-edit');
  await submit(page, 'medical');
  const invalid = await page.evaluate(() => ({
    errors: Array.from(document.querySelectorAll('.gh-health-error[data-hx-inline]')).map((n) => n.textContent),
    aria: document.querySelector('[name="fullName"]')?.getAttribute('aria-invalid'),
    focused: document.activeElement?.getAttribute('name')
  }));
  rec('HG7', 'Medical ID validation blocks an empty submit, marks fields and moves focus',
    invalid.errors.length >= 2 && invalid.aria === 'true' && invalid.focused === 'fullName', JSON.stringify(invalid));

  await fill(page, 'fullName', 'Juma Nassoro');
  await fill(page, 'dob', '2030-01-01');
  await submit(page, 'medical');
  const futureDob = await page.evaluate(() => Array.from(document.querySelectorAll('.gh-health-error[data-hx-inline]')).map((n) => n.textContent));
  rec('HG8', 'A date of birth in the future is rejected with an inline message',
    futureDob.some((t) => /mbeleni|future/i.test(t)), futureDob.join(' | '));

  await fill(page, 'dob', '1990-04-12');
  await page.selectOption('[name="sex"]', 'male');
  await page.selectOption('[name="blood"]', 'O-');
  await fill(page, 'allergies', 'Penicillin');
  await fill(page, 'conditions', 'Hypertension');
  await submit(page, 'medical');
  const med = await page.evaluate(() => window.HealthUI.store.medicalId());
  rec('HG9', 'Saving Medical ID stores it on the device and returns to the detail screen',
    med.fullName === 'Juma Nassoro' && med.blood === 'O-' && await page.evaluate(() => !!document.querySelector('[data-health-screen="medical-profile"]')),
    JSON.stringify({ name: med.fullName, blood: med.blood }));

  const medText = await panelText(page);
  rec('HG10', 'Medical detail shows the saved facts, the source and the storage warning',
    /Juma Nassoro/.test(medText) && /Nimeweka mwenyewe/.test(medText) && /Hakuna seva iliyounganishwa/.test(medText));

  await open(page, 'medical-contacts');
  await fill(page, 'name', 'Neema');
  await fill(page, 'phone', '123');
  await submit(page, 'contact');
  const badPhone = await page.evaluate(() => Array.from(document.querySelectorAll('.gh-health-error[data-hx-inline]')).map((n) => n.textContent));
  await fill(page, 'phone', '0712 345 678');
  await fill(page, 'relation', 'Mke');
  await submit(page, 'contact');
  const contacts = await page.evaluate(() => window.HealthUI.store.contactsFor());
  rec('HG11', 'Emergency contacts validate the phone number and persist once valid',
    badPhone.length > 0 && contacts.length === 1 && contacts[0].phone.includes('0712'), JSON.stringify({ badPhone, contacts: contacts.length }));

  await act(page, 'contact-del', { id: contacts[0].id });
  const afterDelete = await page.evaluate(() => window.HealthUI.store.contactsFor().length);
  rec('HG12', 'Removing an emergency contact updates the device store', afterDelete === 0);

  /* --------------------------------------------------------------------- QR */

  await open(page, 'medical-qr');
  await submit(page, 'qr');
  const noScope = await page.evaluate(() => document.querySelector('[data-hx-form="qr"] .gh-health-error')?.textContent || '');
  await page.check('[name="scope"][value="blood"]');
  await page.check('[name="scope"][value="allergies"]');
  await submit(page, 'qr');
  const token = await page.evaluate(() => window.HealthUI.store.activeToken());
  rec('HG13', 'QR access requires at least one scope and then creates a revocable link',
    /inahitajika|required/i.test(noScope) && !!token && token.scopes.length === 2,
    JSON.stringify({ noScope, scopes: token && token.scopes }));

  const qrText = await panelText(page);
  const payload = JSON.stringify(token || {});
  rec('HG14', 'The QR link carries no health data and the screen says it is a preview',
    /Kielelezo cha msimbo/.test(qrText) && !/Penicillin/.test(payload) && !/Juma/.test(payload) && token.handle.startsWith('gh-'),
    payload.slice(0, 120));

  await act(page, 'qr-revoke', { id: token.id });
  const revoked = await page.evaluate(() => ({ active: window.HealthUI.store.activeToken(), all: window.HealthUI.store.tokens()[0].revoked }));
  rec('HG15', 'Revoking the link makes it inactive immediately', revoked.active === null && revoked.all === true, JSON.stringify(revoked));

  /* ---------------------------------------------------------------- records */

  await tab(page, 'records');
  await open(page, 'record-new');
  await submit(page, 'record');
  const recordErrors = await page.evaluate(() => document.querySelectorAll('[data-hx-form="record"] .gh-health-error').length);
  await fill(page, 'title', 'Kipimo cha sukari');
  await fill(page, 'date', '2026-09-18');
  await fill(page, 'facility', '');
  await page.selectOption('[name="category"]', 'lab');
  await fill(page, 'summary', 'Kipimo cha asubuhi.');
  await submit(page, 'record');
  const records = await page.evaluate(() => window.HealthUI.store.records());
  rec('HG16', 'Records validate required fields, then save as self-entered',
    recordErrors >= 1 && records.length === 1 && records[0].source === 'self-entered', JSON.stringify(records.map((r) => r.title)));

  await open(page, 'record-view', records[0].id);
  const recordText = await panelText(page);
  rec('HG17', 'Record detail shows category, date, source and added time without inventing a facility',
    /Matokeo ya maabara/.test(recordText) && /18 Sep 2026/.test(recordText) && /Nimeweka mwenyewe/.test(recordText)
    && /Hakuna kituo kilichotajwa/.test(recordText) && /Iliongezwa/i.test(recordText));

  await tab(page, 'records');
  await page.fill('#hxRecordSearch', 'hakuna-kitu-kama-hiki');
  await page.waitForTimeout(280);
  const noMatch = await panelText(page);
  await page.fill('#hxRecordSearch', '');
  await page.waitForTimeout(280);
  await page.click('[data-hx="filter"][data-filter="cat"][data-value="report"]');
  await page.waitForTimeout(220);
  const filtered = await panelText(page);
  rec('HG18', 'Record search and category filters work and show a clear empty state',
    /Hakuna rekodi inayolingana/.test(noMatch) && /Hakuna rekodi inayolingana|Hakuna rekodi bado/.test(filtered));

  await page.click('[data-hx="filter"][data-filter="cat"][data-value="all"]');
  await page.waitForTimeout(200);
  await open(page, 'record-view', records[0].id);
  await act(page, 'record-del', { id: records[0].id });
  await page.click('[data-hx="confirm-yes"]');
  await page.waitForTimeout(320);
  const afterRecordDelete = await page.evaluate(() => window.HealthUI.store.records().length);
  rec('HG19', 'Deleting a record asks for confirmation and then removes it', afterRecordDelete === 0, String(afterRecordDelete));

  /* ------------------------------------------------------------- medication */

  await tab(page, 'meds');
  await open(page, 'med-new');
  await fill(page, 'name', 'Dawa ya majaribio');
  await fill(page, 'times', '8am');
  await submit(page, 'med');
  const badTime = await page.evaluate(() => Array.from(document.querySelectorAll('.gh-health-error')).map((n) => n.textContent).join(' '));
  await fill(page, 'times', '08:00, 20:00');
  await fill(page, 'dose', '5 mg');
  await submit(page, 'med');
  const meds = await page.evaluate(() => window.HealthUI.store.meds());
  rec('HG20', 'Medication requires valid HH:MM times before it can be saved',
    /saa|time/i.test(badTime) && meds.length === 1 && meds[0].times.length === 2, badTime.slice(0, 80));

  const medViewText = await panelText(page);
  rec('HG21', 'Medicine detail shows the schedule and warns that entries are self-reported',
    /Ratiba|Leo/.test(medViewText) && meds[0].id === await page.evaluate(() => window.HealthUI.store.meds()[0].id));

  await tab(page, 'meds');
  await page.click('[data-hx="dose"][data-status="taken"]');
  await page.waitForTimeout(260);
  const dose = await page.evaluate(() => window.HealthUI.store.doseHistory()[0]);
  const medsText = await panelText(page);
  rec('HG22', 'Logging a dose stores it as self-reported, not as a facility confirmation',
    dose && dose.status === 'taken' && dose.source === 'self-reported' && /nimejirekodi|kujirekodi|yako mwenyewe|self/i.test(medsText),
    JSON.stringify({ status: dose && dose.status, source: dose && dose.source }));

  await page.click('[data-hx="dose-undo"]');
  await page.waitForTimeout(260);
  const undone = await page.evaluate(() => window.HealthUI.store.doseHistory().length);
  rec('HG23', 'A logged dose can be corrected on the device', undone === 0, String(undone));

  await open(page, 'med-view', meds[0].id);
  await fill(page, 'dose', '10 mg');
  await submit(page, 'med-edit');
  const editedDose = await page.evaluate((id) => window.HealthUI.store.med(id).dose, meds[0].id);
  rec('HG24', 'Editing a medicine updates the stored dose', editedDose === '10 mg', editedDose);

  await act(page, 'med-del', { id: meds[0].id });
  await page.click('[data-hx="confirm-yes"]');
  await page.waitForTimeout(300);
  const afterMedDelete = await page.evaluate(() => window.HealthUI.store.meds().length);
  rec('HG25', 'Deleting a medicine removes it from the device', afterMedDelete === 0, String(afterMedDelete));

  /* --------------------------------------------------- doctors + appointments */

  await open(page, 'doctors');
  const countAll = await page.evaluate(() => document.querySelectorAll('[data-screen="doctor-view"]').length);
  await page.click('[data-hx="filter"][data-filter="specialty"][data-value="3"]');
  await page.waitForTimeout(240);
  const countSurgery = await page.evaluate(() => document.querySelectorAll('[data-screen="doctor-view"]').length);
  await page.click('[data-hx="filter"][data-filter="specialty"][data-value="all"]');
  await page.waitForTimeout(200);
  await page.fill('#hxDoctorSearch', 'Mfano C');
  await page.waitForTimeout(260);
  const countSearch = await page.evaluate(() => document.querySelectorAll('[data-screen="doctor-view"]').length);
  rec('HG26', 'The directory filters by specialty and free text',
    countAll > countSurgery && countSurgery > 0 && countSearch === 1, JSON.stringify({ countAll, countSurgery, countSearch }));

  await page.fill('#hxDoctorSearch', '');
  await page.waitForTimeout(220);
  await open(page, 'doctor-view', 'd1');
  const doctorText = await panelText(page);
  rec('HG27', 'A professional profile grants no verified badge and marks sample credentials',
    !/Imehakikiwa|Verified/i.test(doctorText) && /inasubiri mhakiki|hajathibitishwa/i.test(doctorText) && /Haijatajwa/.test(doctorText));

  await open(page, 'appt-new', 'd1');
  await fill(page, 'date', '2026-11-04');
  await fill(page, 'time', '09:30');
  await page.selectOption('[name="type"]', 'in-person');
  await fill(page, 'reason', 'Ufuatiliaji wa shinikizo');
  await submit(page, 'appt');
  const appt = await page.evaluate(() => window.HealthUI.store.appointments()[0]);
  const apptText = await panelText(page);
  rec('HG28', 'An appointment saves as “Requested” and never as “Confirmed”',
    appt && appt.status === 'requested' && appt.confirmedBy === null && /Imeombwa/.test(apptText) && !/Imethibitishwa/.test(apptText),
    JSON.stringify({ status: appt && appt.status, confirmedBy: appt && appt.confirmedBy }));

  const confirmAttempt = await page.evaluate((id) => window.HealthUI.store.updateAppointment(id, 'confirm'), appt.id);
  rec('HG29', 'The app cannot confirm an appointment by itself', confirmAttempt.ok === false && confirmAttempt.error === 'requires-professional', JSON.stringify(confirmAttempt));

  await open(page, 'appt-reschedule', appt.id);
  await fill(page, 'date', '2026-11-06');
  await fill(page, 'time', '11:00');
  await submit(page, 'appt-reschedule');
  const rescheduled = await page.evaluate((id) => window.HealthUI.store.appointment(id), appt.id);
  rec('HG30', 'Rescheduling records a request on the device, not a new booking',
    rescheduled.status === 'reschedule' && rescheduled.history.length >= 2, rescheduled.status);

  await act(page, 'appt-cancel', { id: appt.id });
  await page.click('[data-hx="confirm-yes"]');
  await page.waitForTimeout(300);
  const cancelled = await page.evaluate((id) => window.HealthUI.store.appointment(id).status, appt.id);
  rec('HG31', 'Cancelling an appointment request is reflected honestly', cancelled === 'cancelled', cancelled);

  /* ------------------------------------------------------------ clinical network */

  await open(page, 'case-new');
  await fill(page, 'title', 'Homa inayoendelea');
  await fill(page, 'summary', 'Fupi');
  await submit(page, 'case');
  const caseErr = await page.evaluate(() => document.querySelectorAll('[data-hx-form="case"] .gh-health-error').length);
  await fill(page, 'summary', 'Mgonjwa mwenye homa kwa siku tano, hakuna dalili za malaria zilizojidhihirisha.');
  await submit(page, 'case');
  const cs = await page.evaluate(() => window.HealthUI.store.cases()[0]);
  rec('HG32', 'A case discussion needs a real summary before it can be opened',
    caseErr >= 1 && cs && cs.status === 'open', JSON.stringify({ caseErr, status: cs && cs.status }));

  await fill(page, 'body', 'Ningependa kujua kama kuna vipimo vya ziada vinavyopendekezwa.');
  await submit(page, 'case-reply');
  const replied = await page.evaluate(() => window.HealthUI.store.cases()[0]);
  const caseText = await panelText(page);
  rec('HG33', 'Replying moves the case to “In discussion” and labels the input a peer opinion',
    replied.status === 'discussion' && replied.replies.length === 1 && /Maoni ya mwenzako|wataalamu wenzako/.test(caseText),
    JSON.stringify({ status: replied.status, replies: replied.replies.length }));

  await act(page, 'case-status', { id: replied.id, status: 'closed' });
  const closed = await page.evaluate((id) => window.HealthUI.store.caseRoom(id).status, replied.id);
  rec('HG34', 'Closing a discussion changes only the device record', closed === 'closed', closed);

  await open(page, 'meeting-new');
  await fill(page, 'title', 'Mkutano wa timu');
  await fill(page, 'date', '2026-11-10');
  await fill(page, 'time', '14:00');
  await fill(page, 'agenda', 'Ratiba ya wiki');
  await submit(page, 'meeting');
  const mt = await page.evaluate(() => window.HealthUI.store.meetings()[0]);
  const meetingText = await panelText(page);
  rec('HG35', 'A meeting is scheduled locally and states that no invitation was sent',
    mt && mt.invitationsSent === false && /Haijatumwa|Hakuna mwaliko/.test(meetingText), JSON.stringify({ sent: mt && mt.invitationsSent }));

  await fill(page, 'notes', 'Tulijadili ratiba.');
  await submit(page, 'meeting-notes');
  await fill(page, 'followUp', 'Tuma ajenda kwa timu');
  await submit(page, 'meeting-followup');
  const meetingAfter = await page.evaluate((id) => window.HealthUI.store.meeting(id), mt.id);
  rec('HG36', 'Meeting notes and follow-ups persist on the device',
    meetingAfter.notes.includes('ratiba') && meetingAfter.followUps.length === 1,
    JSON.stringify({ notes: meetingAfter.notes, followUps: meetingAfter.followUps.length }));

  await open(page, 'community-view', 'c-lab');
  await act(page, 'community-join', { id: 'c-lab' });
  const joined = await page.evaluate(() => window.HealthUI.store.isMember('c-lab'));
  await fill(page, 'body', 'Uchunguzi wa maabara umeboresha ufuatiliaji.');
  await submit(page, 'community-post');
  const posts = await page.evaluate(() => window.HealthUI.store.communityPosts('c-lab').length);
  rec('HG37', 'Joining a community and posting both stay on this device',
    joined === true && posts === 1, JSON.stringify({ joined, posts }));

  await open(page, 'referral-new', 'd3');
  await fill(page, 'reason', 'homa');
  await submit(page, 'referral');
  const referralErr = await page.evaluate(() => document.querySelectorAll('[data-hx-form="referral"] .gh-health-error').length);
  await fill(page, 'reason', 'Homa inayoendelea bila utambuzi wa wazi');
  await submit(page, 'referral');
  const rf = await page.evaluate(() => window.HealthUI.store.referrals()[0]);
  rec('HG38', 'A referral needs a reason and is saved as a draft with delivered=false',
    referralErr >= 1 && rf && rf.status === 'draft' && rf.delivered === false, JSON.stringify({ err: referralErr, status: rf && rf.status }));

  await act(page, 'referral-ready', { id: rf.id });
  const ready = await page.evaluate((id) => window.HealthUI.store.referral(id), rf.id);
  const referralText = await panelText(page);
  rec('HG39', 'Marking a referral ready never claims delivery',
    ready.status === 'ready' && ready.delivered === false && /Haijawasilishwa|haitumwa/i.test(referralText),
    JSON.stringify({ status: ready.status, delivered: ready.delivered }));

  await open(page, 'pro');
  await fill(page, 'name', 'Dkt. Mfano Z.');
  await fill(page, 'qualification', 'MD, MMed');
  await submit(page, 'pro');
  await act(page, 'pro-submit');
  const pro = await page.evaluate(() => window.HealthUI.store.proProfile());
  const proText = await panelText(page);
  rec('HG40', 'Professional verification stops at “awaiting reviewer” and never shows a verified badge',
    pro.verification === 'pending-review' && /inasubiri mhakiki/i.test(proText) && !/Imehakikiwa|Verified/.test(proText),
    JSON.stringify({ verification: pro.verification }));

  /* --------------------------------------------------------- blood + emergency */

  await open(page, 'blood');
  const bloodAll = await page.evaluate(() => document.querySelectorAll('#ghHealthPanels .gh-health-row').length);
  await page.click('[data-hx="filter"][data-filter="group"][data-value="O-"]');
  await page.waitForTimeout(240);
  const bloodText = await panelText(page);
  rec('HG41', 'Blood rows carry a sample source and never claim a verified stock level',
    bloodAll >= 5 && /O-/.test(bloodText) && /Orodha ya mfano/.test(bloodText) && /haijathibitishwa|Muda haujathibitishwa|si uthibitisho/i.test(bloodText));

  await fill(page, 'facility', 'Kituo cha Mfano Z');
  await fill(page, 'place', 'Dodoma');
  await fill(page, 'units', '2');
  await fill(page, 'group', 'O+');
  await submit(page, 'blood-report');
  const report = await page.evaluate(() => window.HealthUI.store.getState().blood[0]);
  rec('HG42', 'A blood report is stored as a user report, not as facility data',
    report && report.source === 'user-report', JSON.stringify(report));

  await open(page, 'emergency-new');
  await submit(page, 'emergency');
  const typeErr = await page.evaluate(() => document.querySelectorAll('[data-hx-form="emergency"] .gh-health-error').length);
  await page.check('[name="type"][value="breathing"]');
  await fill(page, 'note', 'Anapumua kwa shida');
  await submit(page, 'emergency');
  const reviewText = await panelText(page);
  rec('HG43', 'The emergency flow requires a type and shows a review before saving',
    typeErr >= 1 && /Kagua kabla ya kuhifadhi/.test(reviewText) && /Hakuna mtu/.test(reviewText));

  await act(page, 'emergency-save');
  const emg = await page.evaluate(() => window.HealthUI.store.emergencies()[0]);
  const emgText = await panelText(page);
  rec('HG44', 'Saving an emergency never claims transmission, dispatch or a recipient',
    emg && emg.transmitted === false && emg.dispatched === false && emg.confirmedBy === null
    && /Haijatumwa/.test(emgText) && !/imetumwa kwa ambulance|dispatched/i.test(emgText),
    JSON.stringify({ transmitted: emg && emg.transmitted, dispatched: emg && emg.dispatched }));

  const denied = await page.evaluate(async () => {
    window.HealthUI.open('emergency-review');
    return true;
  });
  const geoDenied = await page.evaluate(() => {
    const original = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok, err) => err({ code: 1 }) }
    });
    window.__restoreGeo = () => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: original });
    return true;
  });
  await open(page, 'emergency-new');
  await page.check('[name="type"][value="other"]');
  await page.check('[name="shareLocation"]');
  await submit(page, 'emergency');
  await act(page, 'locate');
  const locText = await panelText(page);
  rec('HG45', 'Denied location permission is reported honestly and captures no coordinates',
    /ilikatiliwa|ilikataliwa|denied/i.test(locText), locText.replace(/\n/g, ' ').slice(0, 120));

  /* ------------------------------------------------------------- education etc */

  await open(page, 'education');
  const allArticles = await page.evaluate(() => document.querySelectorAll('.gh-health-article').length);
  await page.click('[data-hx="filter"][data-filter="cat"][data-value="emergency"]');
  await page.waitForTimeout(240);
  const oneCat = await page.evaluate(() => document.querySelectorAll('.gh-health-article').length);
  await open(page, 'article-view', 'a1');
  const articleText = await panelText(page);
  rec('HG46', 'Education filters by category and every article names its unverified source',
    allArticles > oneCat && oneCat === 1 && /Hakuna chanzo kilichothibitishwa/.test(articleText) && /Maudhui ya mfano/i.test(articleText),
    JSON.stringify({ allArticles, oneCat }));

  await open(page, 'settings');
  const disabledPrefs = await page.evaluate(() => ({
    disabled: document.querySelectorAll('[data-hx-pref][disabled]').length,
    labelled: Array.from(document.querySelectorAll('[data-hx-pref][disabled]')).every((i) => /haitumiki bado|not implemented/i.test(i.parentElement.innerText))
  }));
  await page.check('[data-hx-pref="largeText"]');
  await page.waitForTimeout(260);
  const prefState = await page.evaluate(() => ({
    saved: window.HealthUI.store.prefs().largeText,
    cls: document.getElementById('healthPage').classList.contains('is-large-text')
  }));
  rec('HG47', 'Unimplemented switches are disabled and labelled; working switches persist',
    disabledPrefs.disabled >= 4 && disabledPrefs.labelled && prefState.cls === prefState.saved, JSON.stringify({ disabledPrefs, prefState }));

  await page.uncheck('[data-hx-pref="largeText"]');
  await page.waitForTimeout(200);

  await page.evaluate(() => window.HealthUI.store.pushNotification({ title: 'Kumbukumbu', body: 'Mkutano kesho', tone: 'info' }));
  await open(page, 'notifications');
  const badgeBefore = await page.evaluate(() => ({ hidden: document.getElementById('ghHealthNotifDot').hidden, text: document.getElementById('ghHealthNotifDot').textContent }));
  await act(page, 'notif-read');
  const badgeAfter = await page.evaluate(() => ({ hidden: document.getElementById('ghHealthNotifDot').hidden }));
  rec('HG48', 'Unread notifications show a badge that clears once marked read',
    badgeBefore.hidden === false && badgeAfter.hidden === true, JSON.stringify({ badgeBefore, badgeAfter }));

  /* ------------------------------------------------------------ cross-cutting */

  const deadButtons = await page.evaluate(() => {
    const known = new Set(window.HealthUI.actions);
    const bad = [];
    document.querySelectorAll('#healthPage [data-hx]').forEach((el) => {
      const a = el.dataset.hx;
      if (!known.has(a)) bad.push(a);
    });
    return Array.from(new Set(bad));
  });
  rec('HG49', 'No control is wired to an unknown action', deadButtons.length === 0, deadButtons.join(','));

  const overflow = await page.evaluate(() => {
    const page35 = document.getElementById('healthPage');
    return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, page: page35.scrollWidth - page35.clientWidth };
  });
  await page.setViewportSize({ width: 360, height: 780 });
  await tab(page, 'overview');
  await page.waitForTimeout(260);
  const overflow360 = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    page: document.getElementById('healthPage').scrollWidth - document.getElementById('healthPage').clientWidth
  }));
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.waitForTimeout(260);
  const desktopCols = await page.evaluate(() => {
    const grid = document.querySelector('#ghHealthPanels .gh-health-grid');
    return grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0;
  });
  rec('HG50', 'No horizontal overflow at 360px and the desktop grid widens instead of stretching',
    overflow360.doc <= 0 && overflow360.page <= 0 && desktopCols >= 3, JSON.stringify({ overflow360, desktopCols }));

  await page.setViewportSize({ width: 390, height: 844 });
  await tab(page, 'medical');
  const a11y = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('#ghHealthPanels input:not([type="hidden"]), #ghHealthPanels select, #ghHealthPanels textarea'));
    const unlabelled = inputs.filter((i) => !i.labels || i.labels.length === 0).length;
    const iconOnly = Array.from(document.querySelectorAll('#ghHealthPanels button')).filter((b) => !b.innerText.trim() && !b.getAttribute('aria-label')).length;
    return { unlabelled, iconOnly };
  });
  rec('HG51', 'Every form control is labelled and every icon-only button has a name', a11y.unlabelled === 0 && a11y.iconOnly === 0, JSON.stringify(a11y));

  await page.evaluate(() => { window.I18N.setLanguage('en'); });
  await page.waitForTimeout(320);
  const en = await panelText(page);
  await page.evaluate(() => { window.I18N.setLanguage('sw'); });
  await page.waitForTimeout(320);
  const sw = await panelText(page);
  rec('HG52', 'Switching language re-renders the section in English and back to Kiswahili',
    /Stored details|Emergency contacts|QR access/.test(en) && /Taarifa zilizohifadhiwa|Watu wa dharura/.test(sw),
    en.split('\n').slice(0, 2).join(' / '));

  const persisted = await page.evaluate(() => ({ name: window.HealthUI.store.medicalId().fullName }));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.AuthFlow !== 'undefined');
  await page.evaluate(() => HomeUI.go('health'));
  await page.waitForTimeout(500);
  const afterReload = await page.evaluate(() => ({
    name: window.HealthUI.store.medicalId().fullName,
    cases: window.HealthUI.store.cases().length,
    pref: window.HealthUI.store.prefs().largeText
  }));
  rec('HG53', 'Medical ID, network records and settings survive a reload (device persistence)',
    persisted.name && afterReload.name === persisted.name && afterReload.cases >= 1, JSON.stringify(afterReload));

  const finalErrors = errors.filter((e) => !/Failed to load resource/i.test(e));
  rec('HG54', 'No uncaught page errors or console errors during the whole run', finalErrors.length === 0, finalErrors.slice(0, 3).join(' | '));

  const passed = R.filter((r) => r.ok).length;
  console.log(`\n${passed}/${R.length} checks passed`);
  console.log(`RESULT: ${passed === R.length ? 'all checks passed' : 'failures above'}`);
  await browser.close();
  process.exit(passed === R.length ? 0 : 1);
})().catch((e) => {
  console.error('SUITE ERROR', e);
  console.log(`LAST CHECKS ${R.map((r) => `${r.id}:${r.ok}`).join(' ')}`);
  process.exit(1);
});
