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
import { listAlerts } from '../../services/alerts.service.js';
import { guardianStats } from '../../services/guardian.service.js';

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
/**
 * Storage used to be a sheet that only counted bytes. It is now a page: the
 * Universal Secure Storage Center. The measured device figures the sheet showed
 * did not disappear with it — they are the first thing the page's Space screen
 * prints (device total, browser quota, posts, drafts, IndexedDB blobs and the
 * guardhai* localStorage keys). Same numbers, one place to act on them.
 */
export async function openStorage() {
  if (window.GHStorage) {
    // go() is what hides the Home quick-search bar and sets the page; the screen
    // argument keeps the measured device figures the sheet always showed.
    window.HomeUI?.go?.('storage', { screen: 'storage.usage' });
    return;
  }
  // The page module did not load (very old cached bundle): keep a working sheet
  // rather than a dead button.
  openSheet('Storage', '<p class="gh-sheet-p">Inapima…</p>');
  let estimate = { bytes: 0, quota: 0 };
  try { if (navigator.storage?.estimate) estimate = await navigator.storage.estimate(); } catch { /* ignore */ }
  const blobs = await storageUsage();
  const [posts, drafts] = await Promise.all([countPosts(), countDrafts()]);
  openSheet('Storage', `
    <p class="gh-sheet-p">Nafasi inayotumiwa na data ya GuardHai <b>kwenye kifaa hiki</b>.
    Hakuna faili linalopakiwa kwenye wingu.</p>
    ${row('Jumla (kifaa hiki)', fmtBytes(estimate.bytes || blobs))}
    ${estimate.quota ? row('Kikomo cha browser', fmtBytes(estimate.quota)) : ''}
    ${row('Chapisho zilizohifadhiwa', posts)}
    ${row('Rasimu', drafts)}
    ${row('Viambatisho (IndexedDB)', fmtBytes(blobs))}
    ${note('Takwimu hizi zinapimwa kutoka kifaa chako — si makadirio ya kubuni.')}
    ${actions('<button type="button" class="gh-btn gh-btn-outline" data-sheet-action="close-sheet">Funga</button>')}
  `);
}

/* ------------------------------------------------------------ notifications */
export async function openNotifications() {
  const perm = (typeof Notification !== 'undefined' && Notification.permission)
    ? Notification.permission : 'hapana msaada';
  const canAsk = !!(window.RemoteShield && typeof window.RemoteShield.requestNotifications === 'function');

  let alerts = [];
  try { alerts = await listAlerts(); } catch (err) { alerts = []; }
  const unread = alerts.filter((a) => !a.read).length;

  const rows = alerts.length
    ? alerts.slice(0, 12).map((a) => `
        <div class="gh-notif-row${a.read ? '' : ' is-unread'}">
          <b>${escapeHtml(a.title)}</b>
          ${a.body ? `<span>${escapeHtml(a.body)}</span>` : ''}
          <small>${new Date(a.createdAt).toLocaleString('sw-TZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
        </div>`).join('')
    : `<p class="gh-sheet-p">Hakuna arifa bado. Arifa za kifaa hiki zitaonekana hapa.</p>`;

  openSheet('Notifications', `
    <p class="gh-sheet-p">Arifa halisi za dharura (push/FCM) <b>hazijaunganishwa</b>.
    Unachoweza kufanya ni kuona arifa zilizoundwa kwenye kifaa hiki na kuomba ruhusa ya arifa ya browser.</p>
    ${alerts.length ? `<div class="gh-notif-list">${rows}</div>` : rows}
    ${row('Ruhusa ya browser', perm)}
    ${row('Arifa za mbali (FCM)', 'Haijaunganishwa')}
    ${row('Arifa za kifaa', `${unread} hazijasomwa / ${alerts.length}`)}
    ${note('Hata ukiruhusu, hakuna arifa ya dharura itakayotumwa — hakuna seva iliyounganishwa.')}
    ${actions(`
      ${alerts.length ? '<button type="button" class="gh-btn gh-btn-outline" data-sheet-action="mark-alerts">Weka zote kama zimesomwa</button>' : ''}
      ${canAsk ? `<button type="button" class="gh-btn gh-btn-outline" data-sheet-action="ask-notifications">
      Omba ruhusa ya browser</button>` : ''}`)}
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
export async function openGuardians() {
  let stats = { active: 0, incoming: 0, outgoing: 0, asGuardian: 0 };
  try { stats = await guardianStats(); } catch (err) { stats.unavailable = true; }

  openSheet('Walezi / Guardians', `
    <p class="gh-sheet-p">Walezi ni watu <b>unaowachagua wewe</b> na wanaokubali. Mwaliko si ruhusa:
    hadi mtu akubali, hakuna ruhusa inayotumika.</p>
    ${row('Walezi hai', stats.active)}
    ${row('Mialiko inayokusubiri', stats.incoming)}
    ${row('Mialiko uliyotuma', stats.outgoing)}
    ${row('Wewe ni mlezi wa', stats.asGuardian)}
    ${row('Uwasilishaji wa taarifa', 'Haijaunganishwa')}
    ${note('Ruhusa za mlezi zinahifadhiwa kwenye kifaa hiki. Hakuna taarifa ya dharura inayotumwa kwa mlezi yeyote — hakuna seva iliyounganishwa.')}
    ${actions('<button type="button" class="gh-btn gh-btn-primary" data-sheet-action="open-guardians">Fungua Walezi</button>')}
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
