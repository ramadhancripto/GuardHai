/**
 * GuardHai · features/home/home-sheets.js
 * The informational sheets reachable from the Home header: safety status,
 * storage, notifications, account and guardians.
 *
 * Honesty rule for this file: every row states what is actually true on this
 * device. Anything that needs a backend is marked "not connected" instead of
 * being simulated, so the user can never mistake a placeholder for protection.
 */
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { escapeHtml } from '../../core/dom.js';
import { fmtBytes } from '../../core/format.js';
import { currentUser } from '../../services/session.service.js';
import { storageUsage } from '../../services/media.service.js';
import { countPosts } from '../../services/posts.service.js';
import { countDrafts } from '../../services/drafts.service.js';

const row = (label, value) =>
  `<div class="gh-sheet-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(String(value))}</b></div>`;

const note = (text) => `
  <div class="gh-sheet-note">
    <svg class="ic"><use href="#i-alert-triangle"/></svg>
    <span>${text}</span>
  </div>`;

const actions = (html) => `<div class="gh-sheet-actions">${html}</div>`;

/** how many devices the shield has on record (localStorage, written by the shield) */
function protectedDeviceCount() {
  try {
    const list = JSON.parse(localStorage.getItem('guardhai_protected_devices') || '[]');
    return Array.isArray(list) ? list.length : 0;
  } catch { return 0; }
}

/* ------------------------------------------------------------ safety status */
export function reviewSafety() {
  const hasCheck = !!(window.ProtectEngine && typeof window.ProtectEngine.runReal7StepSecurityCheck === 'function');
  openSheet('Hali ya usalama', `
    <p class="gh-sheet-p">
      GuardHai <b>haijaunganishwa</b> na huduma yoyote ya dharura, polisi, hospitali au
      walezi. Hakuna hali ya usalama inayopimwa kwa sasa — kwa hiyo app haidai kuwa umelindwa.
    </p>
    ${row('Vifaa vilivyolindwa', protectedDeviceCount())}
    ${row('Huduma ya dharura', 'Haijaunganishwa')}
    ${row('Arifa za mbali', 'Hazijawashwa')}
    ${note('Ukaguzi wa kifaa unachunguza ishara za browser pekee (mtandao, betri, ruhusa). Hauhakiki usalama wa mwili wako.')}
    ${actions(`
      ${hasCheck ? `<button type="button" class="gh-btn gh-btn-outline" data-sheet-action="run-device-check">
        Endesha ukaguzi wa kifaa</button>` : ''}
      <button type="button" class="gh-btn gh-btn-primary" data-sheet-action="go-shield">Fungua Shield</button>
    `)}
  `);
}

/* ----------------------------------------------------------------- storage */
export async function openStorage() {
  openSheet('Storage', '<p class="gh-sheet-p">Inapima…</p>');

  const localKeys = [];
  let localBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || key.indexOf('guardhai') !== 0) continue;
    const bytes = (localStorage.getItem(key) || '').length * 2;   // UTF-16
    localKeys.push({ key, bytes });
    localBytes += bytes;
  }
  localKeys.sort((a, b) => b.bytes - a.bytes);

  let estimate = { bytes: 0, quota: 0 };
  try { if (navigator.storage?.estimate) estimate = await navigator.storage.estimate(); } catch { /* ignore */ }

  const blobs = await storageUsage();
  const [posts, drafts] = await Promise.all([countPosts(), countDrafts()]);

  openSheet('Storage', `
    <p class="gh-sheet-p">Nafasi inayotumiwa na data ya GuardHai <b>kwenye kifaa hiki</b>.
    Hakuna faili linalopakiwa kwenye wingu.</p>
    ${row('Jumla (kifaa hiki)', fmtBytes(estimate.bytes || localBytes + blobs))}
    ${estimate.quota ? row('Kikomo cha browser', fmtBytes(estimate.quota)) : ''}
    ${row('Chapisho zilizohifadhiwa', posts)}
    ${row('Rasimu', drafts)}
    ${row('Viambatisho (IndexedDB)', fmtBytes(blobs))}
    ${row('Data ya shield (localStorage)', fmtBytes(localBytes))}
    ${localKeys.slice(0, 6).map((k) => row(k.key, fmtBytes(k.bytes))).join('')
      || row('Hakuna data ya GuardHai', '0 B')}
    ${note('Takwimu hizi zinapimwa kutoka kifaa chako — si makadirio ya kubuni.')}
    ${actions('<button type="button" class="gh-btn gh-btn-outline" data-sheet-action="close-sheet">Funga</button>')}
  `);
}

/* ------------------------------------------------------------ notifications */
export function openNotifications() {
  const perm = (typeof Notification !== 'undefined' && Notification.permission)
    ? Notification.permission : 'hapana msaada';
  const canAsk = !!(window.RemoteShield && typeof window.RemoteShield.requestNotifications === 'function');
  openSheet('Notifications', `
    <p class="gh-sheet-p">Arifa halisi za dharura (push/FCM) <b>hazijaunganishwa</b>.
    Unachoweza kufanya ni kuomba ruhusa ya arifa ya browser.</p>
    ${row('Ruhusa ya browser', perm)}
    ${row('Arifa za mbali (FCM)', 'Haijaunganishwa')}
    ${note('Hata ukiruhusu, hakuna arifa ya dharura itakayotumwa — hakuna seva iliyounganishwa.')}
    ${actions(canAsk ? `<button type="button" class="gh-btn gh-btn-outline" data-sheet-action="ask-notifications">
      Omba ruhusa ya browser</button>` : '')}
  `);
}

/* ----------------------------------------------------------------- account */
export function openAccount() {
  const user = currentUser();
  openSheet('Account', `
    ${row('Jina', user.name)}
    ${row('Aina ya akaunti', 'Ya ndani (haijathibitishwa)')}
    ${row('Uthibitisho', 'Hakuna')}
    ${row('Kitambulisho', user.id)}
    ${note('Hakuna akaunti halisi: hali inahifadhiwa kwenye kifaa hiki pekee.')}
    ${actions(`
      <button type="button" class="gh-btn gh-btn-primary" data-sheet-action="open-profile">Fungua wasifu wangu</button>
      <button type="button" class="gh-btn gh-btn-outline" data-sheet-action="open-menu">Fungua menyu</button>
      <button type="button" class="gh-btn gh-btn-danger" data-sheet-action="sign-out">Ondoka</button>
    `)}
  `);
}

/* --------------------------------------------------------------- guardians */
export function openGuardians() {
  openSheet('Walezi / Guardians', `
    <p class="gh-sheet-p">Walezi <b>hawajaunganishwa</b>. Hakuna orodha ya walezi,
    hakuna uidhinishaji na hakuna arifa inayotumwa kwao.</p>
    ${row('Walezi waliosajiliwa', 0)}
    ${row('Arifa kwa walezi', 'Haijaunganishwa')}
    ${note('Kipengele hiki hakijawashwa. Kinaonekana kwa uwazi ili usidhani walezi wanapokea taarifa.')}
    ${actions('<button type="button" class="gh-btn gh-btn-outline" data-sheet-action="go-shield">Fungua Shield</button>')}
  `);
}

/* ------------------------------------------------------- sheet action bus */
/**
 * One delegated listener for every `data-sheet-action` rendered above, so no
 * inline handler and no global leak is needed.
 */
export function wireSheetActions(handlers) {
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-sheet-action]');
    if (!btn) return;
    const action = btn.dataset.sheetAction;
    const run = handlers[action];
    if (!run) return;
    event.preventDefault();
    run(btn, event);
  });
}

export { closeSheet };
