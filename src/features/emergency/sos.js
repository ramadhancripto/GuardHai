/**
 * GuardHai · features/emergency/sos.js
 * The single SOS handler used by the red bottom-nav button and the shield
 * screen — they must never drift apart.
 *
 * What it does: records the attempt on this device and shows exactly how to
 * reach emergency services yourself. What it does NOT do: send anything to
 * anyone. Dispatch needs a backend that does not exist yet (see mocks/sos.js).
 */
import { openSheet } from '../../ui/sheet.js';
import { dispatchSOS, sosStatus } from '../../mocks/sos.js';
import { createLogger } from '../../core/logger.js';

const log = createLogger('sos');

/** Emergency numbers published for Tanzania; shown, never auto-dialled.
 *  Exported so the Health section reuses this one list instead of copying it. */
export const NUMBERS = [
  { label: 'Polisi', number: '112' },
  { label: 'Ambulance / Moto', number: '114' },
  { label: 'Polisi (TTCL)', number: '110' }
];

let lastShown = 0;

export async function triggerSOS(kind = 'manual') {
  // 1) record the attempt locally so the user can see it happened
  const attempt = await dispatchSOS({ kind });
  log.warn('SOS pressed — no dispatch channel connected', attempt.id);

  // 2) show the honest state + a real way to reach help
  const numbers = NUMBERS.map((n) => `
    <a class="gh-sos-line" href="tel:${n.number}">
      <svg class="ic" aria-hidden="true"><use href="#i-phone"/></svg>
      <span>${n.label}</span><b>${n.number}</b>
    </a>`).join('');

  openSheet('SOS', `
    <div class="gh-sos-head">
      <svg class="ic" aria-hidden="true"><use href="#i-alert-triangle"/></svg>
      <div>
        <b>Hakuna msaada unaotumwa kwa njia ya app.</b>
        <p>GuardHai haijaunganishwa na polisi, hospitali au walezi. Piga simu mwenyewe kwa
        namba zilizo hapa chini — simu ndiyo njia pekee inayofanya kazi kwa sasa.</p>
      </div>
    </div>
    ${numbers}
    <div class="gh-sheet-row"><span>Hali ya usambazaji wa SOS</span>
      <b>${sosStatus.connected ? 'Imeunganishwa' : 'Haijaunganishwa'}</b></div>
    <div class="gh-sheet-row"><span>Jaribio la mwisho</span>
      <b>${attempt.at.slice(11, 16)} · kifaa hiki pekee</b></div>
    <div class="gh-sheet-note">
      <svg class="ic"><use href="#i-alert-triangle"/></svg>
      <span>Tumia kitufe hiki kuonyesha taarifa za dharura, si kama kifaa cha kuomba msaada.
      Jaribio limehifadhiwa kwenye kumbukumbu ya kifaa pekee.</span>
    </div>
    <div class="gh-sheet-actions">
      <button type="button" class="gh-btn gh-btn-outline" data-sheet-action="close-sheet">Funga</button>
    </div>
  `);

  lastShown = Date.now();
  return attempt;
}

export const GHSos = { trigger: (kind) => triggerSOS(kind), numbers: NUMBERS, lastShown: () => lastShown };
