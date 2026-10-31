/**
 * GuardHai · features/emergency/sos-page.js
 * The SOS page: the one screen that must work when nothing else does.
 *
 * Speed rules applied here:
 *   · the three working phone numbers are the first block, above the fold, on a
 *     360 px phone — no scrolling to reach help
 *   · every number is a 64 px tap-to-call row (tel:), never a fake "send"
 *   · the page holds no form that must be completed before a call
 *
 * Two modes, because they are two different promises:
 *   · Dharura yangu   — one person in danger, now
 *   · Tahadhari ya maafa — a community-level warning (flood, quake, storm)
 *
 * Neither mode sends anything. That is stated once, plainly, and repeated in the
 * history row of every attempt.
 */
import { L, esc, icon, chip, btn, card, rows, row, sect, alert, empty, stat, head, ledger, timeline } from '../shield/shield-ui.js';
import { NUMBERS, triggerSOS } from './sos.js';
import { PersonalSafety } from '../../services/personal-safety.service.js';
import { toast } from '../../ui/toast.js';
import { createLogger } from '../../core/logger.js';

const log = createLogger('sos-page');

export const PERSONAL_KINDS = [
  { id: 'medical', sw: 'Dharura ya afya', en: 'Medical emergency', iconId: 'i-heart-pulse' },
  { id: 'accident', sw: 'Ajali', en: 'Accident', iconId: 'i-alert-triangle' },
  { id: 'crime', sw: 'Uhalifu / vitisho', en: 'Crime or threats', iconId: 'i-shield-alert' },
  { id: 'fire', sw: 'Moto', en: 'Fire', iconId: 'i-flame' }
];

export const DISASTER_KINDS = [
  { id: 'flood', sw: 'Mafuriko', en: 'Flood', iconId: 'i-droplet' },
  { id: 'quake', sw: 'Tetemeko la ardhi', en: 'Earthquake', iconId: 'i-wave' },
  { id: 'storm', sw: 'Dhoruba / upepo', en: 'Storm', iconId: 'i-wind' },
  { id: 'fire', sw: 'Moto mkubwa', en: 'Large fire', iconId: 'i-flame' },
  { id: 'other', sw: 'Nyingine', en: 'Other', iconId: 'i-info' }
];

export const state = {
  mode: 'personal',
  kind: 'medical',
  notice: null,
  busy: false
};

const kindList = () => (state.mode === 'disaster' ? DISASTER_KINDS : PERSONAL_KINDS);

/* ------------------------------------------------------------------ paint */

function numbersBlock() {
  return `<div class="gds-stack is-tight">
    ${NUMBERS.map((n) => `<a class="gds-call" href="tel:${esc(n.number)}" data-sos-call="${esc(n.number)}">
      <span class="gds-tile is-red" aria-hidden="true">${icon('i-phone')}</span>
      <span class="gds-call-name">${esc(n.label)}</span>
      <span class="gds-call-num">${esc(n.number)}</span>
    </a>`).join('')}
  </div>`;
}

function modeChooser() {
  const mk = (id, title, note, tone) => `<button type="button" class="gds-mode ${state.mode === id ? 'is-active' : ''} ${tone}"
      data-sos-mode="${id}" aria-pressed="${state.mode === id ? 'true' : 'false'}">
      <span class="gds-tile ${id === 'disaster' ? 'is-amber' : 'is-red'}" aria-hidden="true">${icon(id === 'disaster' ? 'i-cloud-lightning' : 'i-siren')}</span>
      <span class="gds-mode-title">${esc(title)}</span>
      <span class="gds-mode-note">${esc(note)}</span>
    </button>`;
  return `<div class="gds-grid is-2 is-mobile-2">
    ${mk('personal', L('Dharura yangu', 'My emergency'), L('Mimi au mtu aliye karibu nami', 'Me or someone next to me'), '')}
    ${mk('disaster', L('Tahadhari ya maafa', 'Disaster alert'), L('Mafuriko, tetemeko, dhoruba', 'Flood, quake, storm'), 'is-calm')}
  </div>`;
}

function kindChips() {
  return `<div class="gds-btnrow" role="group" aria-label="${L('Aina ya dharura', 'Emergency kind')}">
    ${kindList().map((k) => `<button type="button"
      class="gds-btn is-sm ${state.kind === k.id ? 'is-primary' : ''}"
      data-sos-kind="${k.id}" aria-pressed="${state.kind === k.id ? 'true' : 'false'}">${icon(k.iconId)}${esc(L(k.sw, k.en))}</button>`).join('')}
  </div>`;
}

function whatIsSent() {
  return card(`
    <table class="gds-table">
      <thead><tr><th>${L('Kitu', 'Item')}</th><th class="is-num">${L('Hali', 'State')}</th></tr></thead>
      <tbody>
        <tr><td>${L('Ujumbe kwa polisi / hospitali', 'Message to police / hospital')}</td><td class="is-num"><span class="gds-chip is-danger">${L('Hakuna', 'None')}</span></td></tr>
        <tr><td>${L('Taarifa kwa walezi', 'Notice to guardians')}</td><td class="is-num"><span class="gds-chip is-danger">${L('Hakuna', 'None')}</span></td></tr>
        <tr><td>${L('Kumbukumbu ya jaribio', 'Attempt record')}</td><td class="is-num"><span class="gds-chip is-muted">${L('Kifaa hiki', 'This device')}</span></td></tr>
      </tbody>
    </table>
    <div class="gds-card-foot" style="padding:12px 16px">
      <span style="font-size:var(--gds-fs-sm);color:var(--gds-muted)">
        ${L('Simu ndiyo njia pekee inayofanya kazi kwa sasa. GuardHai haijaunganishwa na polisi, hospitali au walezi.', 'The phone is the only channel that works right now. GuardHai is not connected to police, hospitals or guardians.')}
      </span>
    </div>`);
}

async function paintStage() {
  const host = document.getElementById('sosStage');
  if (!host) return;
  const prefs = await PersonalSafety.getPrefs().catch(() => ({ showNumbersOnSosOpen: true }));
  const attempts = await PersonalSafety.listSosAttempts(6).catch(() => []);
  const kind = kindList().find((k) => k.id === state.kind) || kindList()[0];

  const numbersFirst = prefs.showNumbersOnSosOpen !== false;

  const body = `
    ${state.notice ? `<div style="margin-bottom:12px">${alert(esc(state.notice.text), state.notice.kind || 'ok', state.notice.kind === 'danger' ? 'i-alert-triangle' : 'i-check-circle')}</div>` : ''}

    ${numbersFirst ? `
      ${sect(L('Piga simu sasa', 'Call now'), { eyebrow: L('Namba zinazofanya kazi', 'Numbers that work'), sub: L('Bonyeza namba kupiga simu moja kwa moja.', 'Tap a number to call it directly.') })}
      ${numbersBlock()}
      ${sect(L('Aina ya dharura', 'Emergency kind'))}
      ${modeChooser()}
    ` : `
      ${sect(L('Aina ya dharura', 'Emergency kind'))}
      ${modeChooser()}
      ${sect(L('Piga simu sasa', 'Call now'))}
      ${numbersBlock()}
    `}

    <div style="margin-top:16px">
      ${card(`
        <div class="gds-card-body">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <span class="gds-tile ${state.mode === 'disaster' ? 'is-amber' : 'is-red'}" aria-hidden="true">${icon(kind.iconId)}</span>
            <div style="flex:1;min-width:150px">
              <b style="display:block;font-size:var(--gds-fs-h3);color:var(--gds-ink)">${esc(L(kind.sw, kind.en))}</b>
              <span style="font-size:var(--gds-fs-sm);color:var(--gds-muted)">
                ${state.mode === 'disaster' ? L('Tahadhari inabaki kwenye kifaa hiki', 'The alert stays on this device') : L('Dharura ya mtu mmoja', 'One person in danger')}
              </span>
            </div>
          </div>
          <div style="margin-top:12px">${kindChips()}</div>
          <div class="gds-btnrow" style="margin-top:14px">
            ${btn(L('Rekodi jaribio la SOS', 'Record this SOS attempt'), { act: 'sos.record', tone: state.mode === 'disaster' ? 'danger-soft' : 'danger', iconId: 'i-siren', ns: 'sos' })}
            ${btn(L('Fungua dirisha la haraka', 'Open the quick sheet'), { act: 'sos.sheet', iconId: 'i-external-link', ns: 'sos' })}
          </div>
          <p style="margin:12px 0 0;font-size:var(--gds-fs-sm);color:var(--gds-muted)">
            ${L('Kumbukumbu inabaki kwenye kifaa hiki. Hakuna mtu anayearifiwa.', 'The record stays on this device. Nobody is notified.')}
          </p>
        </div>`)}
    </div>

    ${sect(L('Kinatumwa na GuardHai', 'What GuardHai sends'))}
    ${whatIsSent()}

    ${sect(L('Walezi', 'Guardians'))}
    ${card(rows([
      row({ iconId: 'i-users', title: L('Walezi waliounganishwa', 'Connected guardians'), note: L('SOS haiwafikii hadi seva itakapounganishwa.', 'SOS does not reach them until a server is connected.'), right: chip(L('Hakuna seva', 'No server'), 'warn'), act: 'sos.guardians', ns: 'sos' })
    ]), { plain: true })}

    ${sect(L('Majaribio ya hivi karibuni', 'Recent attempts'))}
    ${attempts.length
      ? card(timeline(attempts.map((a) => ({
        tone: a.mode === 'disaster' ? 'warn' : 'danger',
        title: a.mode === 'disaster' ? L('Tahadhari ya maafa', 'Disaster alert') : L('Jaribio la SOS', 'SOS attempt'),
        meta: `${kindLabel(a.kind)} · ${L('haitumwa', 'not sent')}`,
        when: new Date(a.at).toLocaleString()
      }))), { plain: true })
      : empty(L('Hakuna jaribio bado', 'No attempts yet'), L('Kila bonyeza la SOS litaonekana hapa kwenye kifaa chako.', 'Every SOS press appears here, on your device.'))}

    <div style="margin-top:16px">${ledger([
      { label: L('Kwenye kifaa hiki', 'On this device'), tone: 'muted', iconId: 'i-smartphone' },
      { label: L('Hakuna seva', 'No server'), tone: 'warn', iconId: 'i-cloud' }
    ])}</div>
  `;

  host.innerHTML = body;
}

const kindLabel = (id) => {
  const k = [...PERSONAL_KINDS, ...DISASTER_KINDS].find((x) => x.id === id);
  return k ? L(k.sw, k.en) : String(id || '—');
};

/* --------------------------------------------------------------- actions */

async function record() {
  if (state.busy) return;
  state.busy = true;
  try {
    await PersonalSafety.recordSosAttempt({ mode: state.mode, kind: state.kind });
    await triggerSOS(state.mode === 'disaster' ? 'disaster' : 'manual').catch(() => null);
    state.notice = {
      text: state.mode === 'disaster'
        ? L('Tahadhari imehifadhiwa kwenye kifaa hiki. Haitumwi kwa mtu yeyote.', 'The alert was stored on this device. It is not sent to anybody.')
        : L('Jaribio la SOS limehifadhiwa kwenye kifaa hiki. Hakuna msaada uliotumwa — piga simu.', 'The SOS attempt was stored on this device. No help was sent — call the numbers.'),
      kind: 'ok'
    };
    await paintStage();
  } catch (err) {
    log.error('sos record failed', err);
    toast(L('Imeshindikana kuhifadhi. Piga simu moja kwa moja.', 'Could not save. Call the numbers directly.'));
  } finally {
    state.busy = false;
  }
}

export function open() {
  state.notice = null;
  if (window.HomeUI?.go) window.HomeUI.go('sos');
  else (window.switchTab || (() => {}))('sos');
  paintStage();
  const head1 = document.querySelector('#sosPage .gds-head-title');
  if (head1) head1.setAttribute('tabindex', '-1');
}

let bound = false;

function onClick(event) {
  const modeBtn = event.target.closest('[data-sos-mode]');
  if (modeBtn) {
    event.preventDefault();
    state.mode = modeBtn.getAttribute('data-sos-mode') === 'disaster' ? 'disaster' : 'personal';
    state.kind = kindList()[0].id;
    paintStage();
    return;
  }
  const kindBtn = event.target.closest('[data-sos-kind]');
  if (kindBtn) {
    event.preventDefault();
    state.kind = kindBtn.getAttribute('data-sos-kind');
    paintStage();
    return;
  }
  const actEl = event.target.closest('[data-sos-act]');
  if (!actEl) return;
  const act = actEl.getAttribute('data-sos-act');
  event.preventDefault();
  if (act === 'sos.record') record();
  else if (act === 'sos.sheet') triggerSOS(state.mode === 'disaster' ? 'disaster' : 'manual');
  else if (act === 'sos.guardians') {
    window.HomeUI?.go?.('chat');
    setTimeout(() => window.GHNetwork?.open?.('guardians.home'), 220);
  }
}

export function initSosPage() {
  if (bound) return;
  const page = document.getElementById('sosPage');
  if (!page) return;
  page.addEventListener('click', onClick);
  bound = true;
  document.addEventListener('guardhai:lang', () => { if (!page.hidden) paintStage(); });
  paintStage();
}

export const SOSPage = { init: initSosPage, open, paint: paintStage, state };

// The bottom-nav slot calls GHSosPage.open() from an inline handler.
window.GHSosPage = SOSPage;
