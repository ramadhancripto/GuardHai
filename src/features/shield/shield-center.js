/**
 * GuardHai · features/shield/shield-center.js
 * The Shield Center shell + the four screens that are not Personal Safety:
 *
 *   home      a security dashboard that answers: what is on, what needs
 *             attention, where do I go next — every indicator read from a real
 *             store, never a decorative number
 *   device    the existing Device Protection console (Protect / Find / Recover),
 *             untouched, one level down
 *   digital   what this device holds, what the browser allows, export & erase
 *   assets    declared pending — no invented register
 *   history   one merged timeline of every real security record
 *   settings  the switches that actually exist, plus links to the app sheets
 *
 * One delegated listener per page (click, submit, change), so the markup can be
 * re-painted without re-binding anything.
 */
import { L, esc, icon, chip, btn, card, rows, row, sect, ledger, alert, stat, empty, timeline, head, toggleRow, timeAgo } from './shield-ui.js';
import { renderPersonal } from './shield-personal.js';
import {
  PersonalSafety, PLAN_TEMPLATES
} from '../../services/personal-safety.service.js';
import { listReports } from '../../services/safety.service.js';
import { listAudit } from '../../services/alerts.service.js';
import { guardianStats } from '../../services/guardian.service.js';
import { transportStatus } from '../../services/transport.service.js';
import { toast } from '../../ui/toast.js';
import { createLogger } from '../../core/logger.js';

const log = createLogger('shield-center');

export const VIEWS = ['home', 'device', 'personal', 'digital', 'assets', 'history', 'settings'];

export const state = {
  view: 'home',
  personal: 'home',
  params: {},
  notice: null,
  error: null,
  busy: false,
  busyAction: null,
  confirm: null,
  planTemplate: null
};

const TABS = [
  { id: 'home', sw: 'Muhtasari', en: 'Overview', iconId: 'i-chart' },
  { id: 'device', sw: 'Kifaa', en: 'Device', iconId: 'i-smartphone' },
  { id: 'personal', sw: 'Usalama binafsi', en: 'Personal Safety', iconId: 'i-user-shield' },
  { id: 'digital', sw: 'Kidijitali', en: 'Digital', iconId: 'i-lock' },
  { id: 'assets', sw: 'Mali', en: 'Assets', iconId: 'i-box' },
  { id: 'history', sw: 'Historia', en: 'History', iconId: 'i-list' },
  { id: 'settings', sw: 'Mipangilio', en: 'Settings', iconId: 'i-settings' }
];

/* --------------------------------------------------------------- helpers */

const devices = () => {
  try { return JSON.parse(localStorage.getItem('guardhai_protected_devices') || '[]'); } catch { return []; }
};

const toneChip = (label, tone) => chip(label, tone);

/* -------------------------------------------------------------- dashboard */

async function paintHome() {
  const [summary, reports, stats] = await Promise.all([
    PersonalSafety.safetySummary(),
    listReports({ mine: true }).catch(() => []),
    guardianStats().catch(() => ({ active: 0, incoming: 0 }))
  ]);
  const caps = PersonalSafety.capabilities();
  const status = transportStatus();
  const reg = devices();
  const pending = reports.filter((r) => r.status === 'pending' && r.subjectType === 'incident');

  const attention = [];
  if (summary.journeyState?.id === 'overdue') {
    attention.push({ iconId: 'i-route', tone: 'amber', title: L('Safari imepita muda', 'A journey is overdue'), note: summary.journey?.label || '', act: 'personal.open', key: 'journey' });
  }
  if (!stats.active) {
    attention.push({ iconId: 'i-users', tone: 'amber', title: L('Hakuna mlezi aliyekubali', 'No guardian has accepted'), note: L('Walezi walioalikwa tu hawana mamlaka.', 'Invited guardians have no authority.'), act: 'personal.open', key: 'guardians' });
  }
  if (!summary.todayCheckin) {
    attention.push({ iconId: 'i-check-circle', tone: 'green', title: L('Check-in ya leo haijafanyika', 'Today\'s check-in is not done'), note: L('Sekunde moja inatosha.', 'One second is enough.'), act: 'personal.open', key: 'checkin' });
  }
  if (pending.length) {
    attention.push({
      iconId: 'i-siren', tone: 'red',
      title: pending.length === 1
        ? L('Ripoti 1 haijapitiwa', '1 report not reviewed')
        : L(`Ripoti ${pending.length} hazijapitiwa`, `${pending.length} reports not reviewed`),
      note: L('Hakuna msimamizi aliyounganishwa.', 'No moderator is connected.'),
      act: 'personal.open', key: 'incidents'
    });
  }

  return `
    <div class="gds-emergency">
      <span class="gds-tile is-red" aria-hidden="true">${icon('i-siren')}</span>
      <div class="gds-emergency-copy">
        <h2 class="gds-emergency-title">${L('Dharura sasa hivi?', 'Emergency right now?')}</h2>
      </div>
      ${btn(L('Fungua SOS', 'Open SOS'), { act: 'sos.open', tone: 'danger', iconId: 'i-phone' })}
    </div>

    ${sect(L('Hali ya ulinzi', 'Protection status'), { eyebrow: L('Kifaa hiki', 'This device'), sub: L('Inasomwa sasa hivi — hakuna alama za mapambo.', 'Read right now — no decorative indicators.') })}
    ${card(rows([
      row({ iconId: 'i-smartphone', tone: reg.length ? 'green' : 'muted', title: L('Vifaa vilivyosajiliwa', 'Registered devices'), note: reg.length ? L(`${reg.length} kwenye kifaa hiki`, `${reg.length} on this device`) : L('Hakuna kifaa kilichosajiliwa', 'No device registered yet'), right: toneChip(String(reg.length), reg.length ? 'ok' : 'muted'), act: 'view.go', key: 'device' }),
      row({ iconId: 'i-bluetooth', tone: caps.bluetooth ? 'green' : 'muted', title: L('Bluetooth (BLE)', 'Bluetooth (BLE)'), note: caps.bluetooth ? L('Kivinjari kina Web Bluetooth', 'This browser exposes Web Bluetooth') : L('Kivinjari hakina Web Bluetooth', 'No Web Bluetooth in this browser'), right: toneChip(caps.bluetooth ? L('Inapatikana', 'Available') : L('Haipo', 'Missing'), caps.bluetooth ? 'ok' : 'muted'), act: 'view.go', key: 'device' }),
      row({ iconId: status.connected ? 'i-wifi' : 'i-cloud', tone: status.connected ? 'green' : 'muted', title: L('Seva', 'Server'), note: status.connected ? L('Imeunganishwa', 'Connected') : L('Hakuna — data inabaki kwenye kifaa', 'None — data stays on this device'), right: toneChip(status.connected ? L('Hai', 'On') : L('Hakuna', 'None'), status.connected ? 'ok' : 'muted'), staticRow: true }),
      row({ iconId: 'i-users', tone: stats.active ? 'green' : 'amber', title: L('Walezi hai', 'Active guardians'), note: `${stats.active || 0} ${L('waliokubali', 'accepted')} · ${stats.incoming || 0} ${L('mialiko mipya', 'new invites')}`, right: toneChip(String(stats.active || 0), stats.active ? 'ok' : 'warn'), act: 'personal.open', key: 'guardians' })
    ]), { plain: true })}

    ${attention.length ? `${sect(L('Kinachohitaji uangalizi', 'Needs attention'))}
      ${card(rows(attention.map((a) => row({ iconId: a.iconId, tone: a.tone, title: a.title, note: a.note, act: a.act, key: a.key }))), { plain: true })}` : ''}

    ${sect(L('Sehemu za Shield', 'Shield sections'))}
    <div class="gds-grid">
      ${[
        { id: 'device', iconId: 'i-smartphone', title: L('Ulinzi wa kifaa', 'Device Protection'), note: L('Protect · Find · Recover', 'Protect · Find · Recover'), tone: 'green' },
        { id: 'personal', iconId: 'i-user-shield', title: L('Usalama binafsi', 'Personal Safety'), note: `${summary.guardians.active || 0} ${L('walezi', 'guardians')} · ${summary.journeys} ${L('safari', 'journeys')}`, tone: 'green' },
        { id: 'digital', iconId: 'i-lock', title: L('Usalama wa kidijitali', 'Digital Security'), note: L('Data, ruhusa, kufuta', 'Data, permissions, erase'), tone: 'blue' },
        { id: 'assets', iconId: 'i-box', title: L('Ulinzi wa mali', 'Asset Protection'), note: L('Haipo kwenye toleo hili', 'Not in this version'), tone: 'muted' },
        { id: 'history', iconId: 'i-list', title: L('Historia ya usalama', 'Security History'), note: L('Matukio halisi pekee', 'Real events only'), tone: 'green' },
        { id: 'settings', iconId: 'i-settings', title: L('Mipangilio ya usalama', 'Security Settings'), note: L('Mapendeleo yanayohifadhiwa', 'Preferences that persist'), tone: 'muted' }
      ].map((m) => `<button type="button" class="gds-tilecard" data-shield-act="view.go" data-key="${m.id}">
        ${iconTile(m.iconId, m.tone)}
        <span class="gds-row-copy"><span class="gds-row-title">${m.title}</span><span class="gds-row-note">${m.note}</span></span>
        ${icon('i-chevron-right')}
      </button>`).join('')}
    </div>

    <div style="margin-top:16px">${ledger([
      { label: L('Kwenye kifaa hiki', 'On this device'), tone: 'muted', iconId: 'i-smartphone' },
      { label: status.connected ? L('Seva imeunganishwa', 'Server connected') : L('Hakuna seva', 'No server'), tone: status.connected ? 'ok' : 'warn', iconId: status.connected ? 'i-wifi' : 'i-cloud' }
    ])}</div>
  `;
}

const iconTile = (iconId, tone) => `<span class="gds-tile is-${tone === 'green' ? '' : tone}" aria-hidden="true">${icon(iconId)}</span>`;

/* ---------------------------------------------------------------- digital */

async function paintDigital() {
  const caps = PersonalSafety.capabilities();
  let usage = { bytes: 0, quota: 0 };
  try { usage = await navigator.storage.estimate(); } catch { usage = { bytes: 0, quota: 0 }; }
  const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
  const [incidents, checkins, journeys] = await Promise.all([
    PersonalSafety.listIncidents(), PersonalSafety.listCheckins(200), PersonalSafety.listJourneys()
  ]);

  const confirming = state.confirm === 'erase';

  return `
    ${sect(L('Kinachohifadhiwa kwenye kifaa', 'What this device holds'), { eyebrow: L('Kidijitali', 'Digital') })}
    ${card(`
      <div class="gds-card-body">
        <div class="gds-stats">
          ${stat(mb(usage.bytes || 0), L('Hifadhi iliyotumika', 'Storage used'), usage.quota ? L(`kati ya ${mb(usage.quota)}`, `of ${mb(usage.quota)}`) : '')}
          ${stat(String(journeys.length), L('Safari', 'Journeys'))}
          ${stat(String(checkins.length), L('Check-in', 'Check-ins'))}
          ${stat(String(incidents.length), L('Ripoti', 'Reports'))}
        </div>
        <div style="margin-top:14px">${alert(
          L('Data hii iko kwenye browser hii pekee. Kufuta data ya browser kunaifuta yote.', 'This data lives in this browser only. Clearing browser data deletes all of it.'),
          'info', 'i-info')}</div>
      </div>`)}

    ${sect(L('Ruhusa na uwezo', 'Permissions and capability'))}
    ${card(rows([
      row({ iconId: 'i-lock', tone: 'green', title: L('Muunganisho salama (HTTPS)', 'Secure connection (HTTPS)'), note: typeof window.isSecureContext === 'boolean' && window.isSecureContext ? L('Imethibitishwa na browser', 'Confirmed by the browser') : L('Haipo — baadhi ya vipengele hazitafanya kazi', 'Not present — some features will not work'), right: toneChip(window.isSecureContext ? 'HTTPS' : 'HTTP', window.isSecureContext ? 'ok' : 'warn'), staticRow: true }),
      row({ iconId: 'i-bluetooth', tone: caps.bluetooth ? 'green' : 'muted', title: L('Bluetooth', 'Bluetooth'), note: caps.bluetooth ? L('Inapatikana', 'Available') : L('Haipo kwenye kivinjari hiki', 'Missing in this browser'), right: toneChip(caps.bluetooth ? L('Ndiyo', 'Yes') : L('Hapana', 'No'), caps.bluetooth ? 'ok' : 'muted'), staticRow: true }),
      row({ iconId: 'i-bell', tone: 'muted', title: L('Arifa za mfumo', 'System notifications'), note: `Hali: ${caps.notifications}`, right: toneChip(caps.notifications, 'muted'), staticRow: true }),
      row({ iconId: 'i-cloud', tone: caps.transport ? 'green' : 'muted', title: L('Seva', 'Server'), note: caps.transport ? L('Imeunganishwa', 'Connected') : L('Haijaunganishwa — hakuna data inayotoka', 'Not connected — no data leaves this device'), right: toneChip(caps.transport ? L('Hai', 'On') : L('Hakuna', 'None'), caps.transport ? 'ok' : 'muted'), staticRow: true })
    ]), { plain: true })}

    ${sect(L('Data yako', 'Your data'))}
    ${card(`
      <div class="gds-card-body">
        <div class="gds-btnrow">
          ${btn(L('Pakua nakala (JSON)', 'Export a copy (JSON)'), { act: 'digital.export', tone: 'outline', iconId: 'i-download' })}
          ${btn(L('Futa data ya usalama', 'Erase safety data'), { act: 'digital.erase', tone: 'danger-soft', iconId: 'i-trash' })}
        </div>
        ${confirming ? `<div style="margin-top:12px">${alert(
          `<b>${L('Futa kabisa?', 'Erase for good?')}</b><br>${L('Safari, check-in, mipango na kumbukumbu za SOS zitafutwa kwenye kifaa hiki. Hakuna kurudi nyuma.', 'Journeys, check-ins, plans and SOS records on this device will be deleted. This cannot be undone.')}
           <div class="gds-btnrow" style="margin-top:10px">
             ${btn(L('Ndiyo, futa', 'Yes, erase'), { act: 'digital.erase.confirm', tone: 'danger', iconId: 'i-trash' })}
             ${btn(L('Acha', 'Keep it'), { act: 'digital.erase.cancel' })}
           </div>`, 'danger', 'i-alert-triangle')}</div>` : ''}
        <p style="margin:12px 0 0;font-size:var(--gds-fs-sm);color:var(--gds-muted)">
          ${L('Nakala inaundwa kwenye kifaa chako; haitumwi kwa seva yoyote.', 'The copy is built on your device; it is not uploaded anywhere.')}
        </p>
      </div>`)}

    ${sect(L('Programu zilizounganishwa', 'Connected apps'))}
    ${empty(L('Hakuna programu iliyounganishwa', 'No connected apps'), L('GuardHai haitumii programu nyingine yoyote kwa sasa.', 'GuardHai uses no other app at the moment.'))}
  `;
}

/* ----------------------------------------------------------------- assets */

function paintAssets() {
  return `
    ${sect(L('Ulinzi wa mali', 'Asset Protection'), { eyebrow: L('Haipo kwenye toleo hili', 'Not in this version') })}
    ${card(`
      <div class="gds-card-body">
        <div style="display:flex;gap:12px;align-items:flex-start">
          ${iconTile('i-box', 'muted')}
          <div>
            <b style="display:block;font-size:var(--gds-fs-h3);color:var(--gds-ink)">${L('Hakuna rejista ya mali bado', 'There is no asset register yet')}</b>
            <p style="margin:4px 0 0;font-size:var(--gds-fs-sm);color:var(--gds-muted)">
              ${L('Tunakataa kuonyesha rejista ya mali isiyoweza kuthibitishwa. Sehemu hii itafunguliwa tu pamoja na njia halisi ya kuthibitisha mali na mmiliki.', 'We will not show an asset register that cannot be verified. This section opens only with a real way to verify both the asset and its owner.')}
            </p>
          </div>
        </div>
        <ul style="margin:14px 0 0;padding-left:18px;font-size:var(--gds-fs-sm);color:var(--gds-text);line-height:1.8">
          <li>${L('Kifaa na mali? Kwa sasa tumia Ulinzi wa kifaa → Recover.', 'Device-level assets? Use Device Protection → Recover for now.')}</li>
          <li>${L('Nyaraka, mifugo, mali za nyumbani: zinahitaji rejista na uthibitisho wa pili.', 'Documents, livestock, household property: they need a register and a second-party verification.')}</li>
          <li>${L('Hakuna data ya mali inayokusanywa sasa hivi.', 'No asset data is collected right now.')}</li>
        </ul>
        <div class="gds-btnrow" style="margin-top:14px">
          ${btn(L('Fungua ulinzi wa kifaa', 'Open Device Protection'), { act: 'view.go', key: 'device', tone: 'primary', iconId: 'i-smartphone' })}
        </div>
      </div>`)}
  `;
}

/* ---------------------------------------------------------------- history */

async function paintHistory() {
  const [feed, audit] = await Promise.all([
    PersonalSafety.historyFeed(30).catch(() => []),
    listAudit({ limit: 30 }).catch(() => [])
  ]);

  const merged = [
    ...feed.map((f) => ({ at: f.at, tone: f.tone, title: f.title, meta: f.meta })),
    ...audit.map((a) => ({ at: a.at || a.createdAt, tone: 'muted', title: a.action || a.subjectType || 'Audit', meta: a.detail || '' }))
  ].filter((i) => i.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 40);

  return `
    ${sect(L('Historia ya usalama', 'Security history'), { eyebrow: L('Matukio halisi', 'Real events'), sub: L('Kumbukumbu za kifaa hiki: SOS, safari, check-in, ripoti, walezi.', 'Records from this device: SOS, journeys, check-ins, reports, guardians.') })}
    ${merged.length ? card(timeline(merged.map((m) => ({ tone: m.tone, title: m.title, meta: m.meta, when: timeAgo(m.at) }))), { plain: true })
      : empty(L('Hakuna historia bado', 'Nothing recorded yet'), L('Tukio la kwanza la usalama litaonekana hapa.', 'Your first safety event appears here.'))}
    <div style="margin-top:16px">${alert(
      L('Historia hii inabaki kwenye kifaa hiki. Hakuna anayeiweza kuona isipokuwa wewe.', 'This history stays on this device. Nobody but you can see it.'),
      'info', 'i-lock')}</div>
  `;
}

/* --------------------------------------------------------------- settings */

async function paintSettings() {
  const p = await PersonalSafety.getPrefs();
  const caps = PersonalSafety.capabilities();
  return `
    ${sect(L('Mapendeleo ya usalama', 'Safety preferences'), { sub: L('Yanahifadhiwa mara moja kwenye kifaa hiki.', 'Saved immediately on this device.') })}
    ${card(rows([
      toggleRow({ title: L('Kumbusho la check-in', 'Check-in reminder'), note: L('Kumbusho la ndani ya app.', 'An in-app reminder.'), pref: 'dailyCheckinReminder', checked: p.dailyCheckinReminder }),
      toggleRow({ title: L('Kumbusho la safari', 'Journey reminder'), note: L('Safari inapopita muda kuonyeshwa wazi.', 'Show plainly when a journey is overdue.'), pref: 'journeyReminder', checked: p.journeyReminder }),
      toggleRow({ title: L('Namba mbele kwenye SOS', 'Numbers first on SOS'), note: L('SOS inafungua na namba tayari.', 'SOS opens with the numbers already visible.'), pref: 'showNumbersOnSosOpen', checked: p.showNumbersOnSosOpen }),
      toggleRow({ title: L('Shiriki na walezi', 'Share with guardians'), note: caps.transport ? L('Seva imeunganishwa.', 'A server is connected.') : L('Haiwezi kuwashwa: hakuna seva.', 'Cannot be enabled: no server.'), pref: 'shareWithGuardians', checked: p.shareWithGuardians, disabled: !caps.transport })
    ]), { plain: true })}

    ${sect(L('Programu', 'Application'))}
    ${card(rows([
      row({ iconId: 'i-hdd', title: L('Hifadhi', 'Storage'), note: L('Nafasi na data iliyohifadhiwa', 'Space and stored data'), act: 'app.storage' }),
      row({ iconId: 'i-bell', title: L('Arifa', 'Notifications'), note: L('Kumbukumbu za kifaa', 'Device-local notices'), act: 'app.notifications' }),
      row({ iconId: 'i-user', title: L('Akaunti', 'Account'), note: L('Wasifu na kuingia', 'Profile and sign-in'), act: 'app.account' }),
      row({ iconId: 'i-globe', title: L('Lugha', 'Language'), note: L('Kiswahili / English', 'Swahili / English'), act: 'app.language' })
    ]), { plain: true })}

    <div style="margin-top:16px">${alert(
      L('Mipangilio ya Shield haibadilishi ulinzi wa kifaa. Injini ya ulinzi ina vidhibiti vyake ndani ya sehemu ya Kifaa.', 'Shield settings do not change device protection. The protection engine has its own controls inside Device.'),
      'info', 'i-info')}</div>
  `;
}

/* ------------------------------------------------------------------ paint */

function setBusy(on) {
  const stage = document.getElementById('shieldStage');
  if (stage) stage.setAttribute('aria-busy', on ? 'true' : 'false');
}

export function paintTabs() {
  const host = document.getElementById('shieldTabs');
  if (!host) return;
  host.innerHTML = TABS.map((t) => `<button type="button" class="gds-tab" role="tab"
      aria-selected="${state.view === t.id ? 'true' : 'false'}"
      data-shield-view="${t.id}">${icon(t.iconId)}<span>${esc(L(t.sw, t.en))}</span></button>`).join('');
  host.setAttribute('role', 'tablist');
  // the active tab must be visible in the horizontal strip, not clipped off-screen
  const active = host.querySelector('[aria-selected="true"]');
  if (active && host.scrollWidth > host.clientWidth) {
    host.scrollLeft = Math.max(0, active.offsetLeft - host.clientWidth / 3);
  }
}

async function paintBody(token) {
  const view = state.view;
  if (view === 'device') return;              // static, painted by the engine
  const host = document.getElementById(`shield${view.charAt(0).toUpperCase()}${view.slice(1)}Body`);
  if (!host) return;

  let html = '';
  if (view === 'home') html = await paintHome();
  else if (view === 'digital') html = await paintDigital();
  else if (view === 'assets') html = paintAssets();
  else if (view === 'history') html = await paintHistory();
  else if (view === 'settings') html = await paintSettings();
  else if (view === 'personal') {
    const screen = state.personal || 'home';
    const out = await renderPersonal(screen, state);
    // each sub-screen draws its own GDS head; nothing else is prepended
    html = out.body;
  }

  if (token !== paintBody.token) return;       // a newer paint already started
  host.innerHTML = html;
  const live = document.getElementById('shieldLive');
  if (live && state.notice) {
    live.innerHTML = alert(esc(state.notice.text), state.notice.kind || 'ok', state.notice.kind === 'danger' ? 'i-alert-triangle' : 'i-check-circle');
    state.notice = null;
  } else if (live) {
    live.innerHTML = '';
  }
}

function paintPersonalHead(out) {
  const titleEl = document.querySelector('#shieldView-personal .gds-viewhead');
  if (!titleEl) return;
  titleEl.innerHTML = `<div>
      <span class="gds-eyebrow">${L('Usalama binafsi', 'Personal safety')}</span>
      <h2 class="gds-sect-title">${esc(out.title || '')}</h2>
      ${out.sub ? `<p class="gds-sect-sub">${esc(out.sub)}</p>` : ''}
    </div>`;
}

export async function paint() {
  paintBody.token = Symbol('paint');
  const token = paintBody.token;
  const view = VIEWS.includes(state.view) ? state.view : 'home';
  state.view = view;

  paintTabs();
  document.querySelectorAll('#shieldPage .shield-view').forEach((section) => {
    section.hidden = section.getAttribute('data-view') !== view;
  });

  setBusy(true);
  try {
    await paintBody(token);
  } catch (err) {
    log.error('shield paint failed', err);
    const host = document.getElementById('shieldLive');
    if (host) host.innerHTML = alert(L('Imeshindikana kuonyesha sehemu hii. Jaribu tena.', 'Could not draw this section. Try again.'), 'danger', 'i-alert-triangle');
  } finally {
    setBusy(false);
  }

  // The Device Protection console only renders when it is visible.
  if (view === 'device' && window.ProtectEngine?.renderDashboardKPIs) {
    try { window.ProtectEngine.renderDashboardKPIs(); } catch (err) { log.warn('engine repaint skipped', err?.message); }
  }
}

/* ------------------------------------------------------------------- go */

export function go(view, params = {}) {
  if (!VIEWS.includes(view)) view = 'home';
  state.view = view;
  state.params = params;
  state.confirm = null;
  if (view !== 'personal') state.personal = 'home';
  paint();
  const stage = document.getElementById('shieldStage');
  if (stage && view !== 'home') stage.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

export function goPersonal(screen, params = {}) {
  state.view = 'personal';
  state.personal = screen || 'home';
  state.params = params;
  paint();
}

/* -------------------------------------------------------------- dispatch */

const ACTIONS = {
  'view.go': async (p) => { go(p.key || 'home'); return {}; },
  'personal.open': async (p) => { goPersonal(p.key || 'home'); return {}; },
  'personal.home': async () => { goPersonal('home'); return {}; },

  'sos.open': async () => {
    if (window.GHSosPage?.open) window.GHSosPage.open();
    else if (window.GHSos) window.GHSos.trigger();
    return {};
  },

  'go.guardians': async () => {
    window.HomeUI?.go?.('chat');
    setTimeout(() => window.GHNetwork?.open?.('guardians.home'), 220);
    return {};
  },

  'journey.start': async (p) => PersonalSafety.startJourney({
    label: p.data?.label, place: p.data?.place, minutes: Number(p.data?.minutes) || 60
  }),
  'journey.end': async (p) => PersonalSafety.endJourney(p.key, 'safe'),
  'journey.cancel': async (p) => PersonalSafety.endJourney(p.key, 'cancelled'),

  'checkin.go': async (p) => PersonalSafety.checkIn({ feeling: p.data?.feeling, note: p.data?.note }),

  'plan.template': async (p) => { state.planTemplate = p.key; goPersonal('plans'); return {}; },
  'plan.open': async (p) => { goPersonal('plan', { id: p.key }); return {}; },
  'plan.create': async (p) => {
    const res = await PersonalSafety.createPlan({
      title: p.data?.title, whenToUse: p.data?.whenToUse, steps: p.data?.steps
    });
    if (res.ok) state.planTemplate = null;
    return res;
  },
  'plan.remove': async (p) => { const r = await PersonalSafety.removePlan(p.key); if (r.ok) goPersonal('plans'); return r; },

  'incident.create': async (p) => PersonalSafety.fileIncident({ kind: p.data?.kind, detail: p.data?.detail }),

  'digital.export': async () => {
    await exportSafety();
    return { message: L('Nakala imepakuliwa kwenye kifaa chako.', 'The copy was downloaded to your device.'), kind: 'ok' };
  },
  'digital.erase': async () => { state.confirm = 'erase'; paint(); return {}; },
  'digital.erase.cancel': async () => { state.confirm = null; paint(); return {}; },
  'digital.erase.confirm': async () => {
    const res = await PersonalSafety.eraseLocalSafetyData();
    state.confirm = null;
    paint();
    return res;
  },

  'app.storage': async () => {
    // Storage is a first-class page now; the Shield app row is one of its doors.
    if (window.GHStorage) { window.HomeUI?.go?.('storage'); return {}; }
    window.HomeUI?.openStorage?.();
    return {};
  },
  'app.notifications': async () => { window.HomeUI?.openNotifications?.(); return {}; },
  'app.account': async () => { window.HomeUI?.openAccount?.(); return {}; },
  'app.language': async () => { window.HomeUI?.toggleMore?.({ currentTarget: document.getElementById('ghMoreBtn') }); return {}; }
};

async function exportSafety() {
  const data = {
    exportedAt: new Date().toISOString(),
    note: 'GuardHai local export — built on this device, not uploaded',
    journeys: await PersonalSafety.listJourneys(),
    checkins: await PersonalSafety.listCheckins(200),
    plans: await PersonalSafety.listPlans(),
    incidents: await PersonalSafety.listIncidents(),
    sos: await PersonalSafety.listSosAttempts(50),
    prefs: await PersonalSafety.getPrefs()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `guardhai-safety-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function runAction(act, payload) {
  const fn = ACTIONS[act];
  if (!fn) return { ok: false, message: L('Kitendo hiki hakipo.', 'That action does not exist.') };
  // Guard against a double-tap of the SAME action (double submit), never against
  // a different tap: dropping an unrelated tap would feel like a dead button.
  if (state.busy && state.busyAction === act) return {};
  state.busy = true;
  state.busyAction = act;
  setBusy(true);
  try {
    const res = await fn(payload);
    if (res?.message) {
      if (res.ok === false || res.kind === 'danger') toast(res.message);
      else state.notice = { text: res.message, kind: res.kind || 'ok' };
    }
    if (res?.ok !== false && !['view.go', 'personal.open', 'personal.home', 'plan.template', 'digital.erase', 'digital.erase.cancel'].includes(act)) {
      await paint();
    }
    return res || {};
  } catch (err) {
    log.error('shield action failed', act, err);
    toast(L('Hitilafu imetokea. Jaribu tena.', 'Something went wrong. Try again.'));
    return { ok: false };
  } finally {
    state.busy = false;
    state.busyAction = null;
    setBusy(false);
  }
}

/* ------------------------------------------------------------------ init */

let bound = false;

function onClick(event) {
  const prefBtn = event.target.closest('[data-shield-pref]');
  if (prefBtn) {
    event.preventDefault();
    const key = prefBtn.getAttribute('data-shield-pref');
    const next = prefBtn.getAttribute('aria-checked') !== 'true';
    PersonalSafety.setPref(key, next).then((res) => {
      if (res.ok) { prefBtn.setAttribute('aria-checked', next ? 'true' : 'false'); }
      else toast(res.message);
    });
    return;
  }

  const viewBtn = event.target.closest('[data-shield-view]');
  if (viewBtn && viewBtn.classList.contains('gds-tab')) {
    event.preventDefault();
    go(viewBtn.getAttribute('data-shield-view'));
    return;
  }

  const actEl = event.target.closest('[data-shield-act]');
  if (!actEl) return;
  const act = actEl.getAttribute('data-shield-act');
  if (!act) return;
  event.preventDefault();
  runAction(act, { key: actEl.getAttribute('data-key') || '', data: null });
}

function onSubmit(event) {
  const form = event.target.closest('form[data-shield-form]');
  if (!form) return;
  event.preventDefault();
  const act = form.getAttribute('data-shield-form');
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  runAction(act, { key: '', data });
}

export function initShield() {
  if (bound) return;
  const page = document.getElementById('shieldPage');
  if (!page) return;
  page.addEventListener('click', onClick);
  page.addEventListener('submit', onSubmit);
  bound = true;

  document.addEventListener('guardhai:lang', () => { if (state.view) paint(); });
  paintTabs();
  paint();
}

export const ShieldCenter = { init: initShield, go, goPersonal, paint, state, VIEWS, PLAN_TEMPLATES };

// index.html calls ShieldCenter from inline handlers (tab entry), like the other
// engine singletons; the module graph imports the symbol directly.
window.ShieldCenter = ShieldCenter;
