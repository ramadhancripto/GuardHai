/**
 * GuardHai — bug-fix verification suite (runs against a local http server).
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/bugfix.spec.js [url]
 *
 * Default url: http://127.0.0.1:8123/index.html
 * Prints PASS/FAIL per check and a summary. Never throws on a failed check.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');

/** the app is one module tree now: read every source file as a single string */
function readAppSource() {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') ? [fs.readFileSync(full, 'utf8')] : [];
  });
  return walk(path.join(ROOT, 'src')).join('\n');
}
const APP_JS = readAppSource();

const R = [];
const rec = (id, name, ok, detail = '') => R.push({ id, name, ok, detail });

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [], consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2200);

  /* ---------------- B1: system status bar ---------------- */
  const banner = await page.evaluate(() => {
    const el = document.getElementById('statusBanner');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { text: el.innerText.trim(), visible: cs.display !== 'none' && r.height > 0, h: Math.round(r.height) };
  });
  rec('B1', 'Status bar present & visible, names the unconnected services',
      !!banner && banner.visible && /(ha|hazi)jaunganishwa/i.test(banner.text) && /SOS/i.test(banner.text),
      banner ? `h=${banner.h}px "${(banner.text || '').slice(0, 70)}"` : 'element missing');

  /* ---------------- B2: zoom / accessibility ---------------- */
  const vp = await page.evaluate(() => document.querySelector('meta[name=viewport]')?.content || '');
  rec('B2', 'Viewport allows user zoom',
      !!vp && !/maximum-scale\s*=\s*1(\.0)?(\s|,|$)/i.test(vp) && !/user-scalable\s*=\s*no/i.test(vp),
      vp);

  /* ---------------- B3: i18n actually switches text ---------------- */
  await page.click('#screen-welcome-anim button.btn-gradient');
  await page.waitForTimeout(300);
  await page.click('.auth-option-card >> nth=0');
  await page.waitForTimeout(250);
  await page.fill('#reg-name', 'Test User');
  await page.fill('#reg-email', 'test@example.com');
  await page.fill('#reg-pass', 'secret123');
  await page.click('#form-register button[type=submit]');
  await page.waitForTimeout(700);

  const i18n = await page.evaluate(async () => {
    const snap = () => ({
      navHome: document.querySelector('#tab-home .tab-label')?.innerText.trim(),
      navShield: document.querySelector('#tab-shield .tab-label')?.innerText.trim(),
      hero: document.querySelector('#homePage .gh-welcome-title')?.innerText.trim(),
      kpiRisk: document.querySelector('#homePage .gh-chip-k')?.innerText.trim(),
      greeting: document.querySelector('#appTopNav .gh-brand-name')?.innerText.trim()
    });
    const sw = snap();
    I18N.setLanguage('en');
    await new Promise(r => setTimeout(r, 150));
    const en = snap();
    I18N.setLanguage('sw');
    await new Promise(r => setTimeout(r, 150));
    const sw2 = snap();
    return { sw, en, sw2, wired: document.querySelectorAll('[data-i18n]').length };
  });
  const changed = JSON.stringify(i18n.sw.navHome) !== JSON.stringify(i18n.en.navHome)
               && JSON.stringify(i18n.sw.hero) !== JSON.stringify(i18n.en.hero);
  const restores = JSON.stringify(i18n.sw.navHome) === JSON.stringify(i18n.sw2.navHome)
                && JSON.stringify(i18n.sw.hero) === JSON.stringify(i18n.sw2.hero);
  rec('B3', 'Language switch changes UI text (sw <-> en, symmetric)',
      changed && restores && i18n.wired > 0,
      `wired=${i18n.wired} | sw: home="${i18n.sw.navHome}" hero="${i18n.sw.hero}" | en: home="${i18n.en.navHome}" hero="${i18n.en.hero}"`);
  rec('B3b', 'Swahili nav labels not degraded by dictionary',
      ['Nyumbani', 'Soga', 'Ulinzi', 'Ramani'].includes(i18n.sw2.navHome) && i18n.sw2.navShield === 'Ulinzi',
      `sw home="${i18n.sw2.navHome}" shield="${i18n.sw2.navShield}"`);

  /* ------- B3c: real user path — tap the visible language dropdown ------- */
  await page.click('#ghMoreBtn');
  await page.waitForTimeout(250);
  await page.click('#ghLangSeg button[data-lang="en"]');
  await page.waitForTimeout(350);
  const uiEn = await page.evaluate(() => ({
    stored: localStorage.getItem('guardhai_lang'),
    hero: document.querySelector('#homePage .gh-welcome-title').innerText.trim(),
    nav: [...document.querySelectorAll('.tab-label')].map(e => e.innerText.trim()).join('/')
  }));
  await page.click('#ghMoreBtn');
  await page.waitForTimeout(250);
  await page.click('#ghLangSeg button[data-lang="sw"]');
  await page.waitForTimeout(350);
  const uiSw = await page.evaluate(() => ({
    stored: localStorage.getItem('guardhai_lang'),
    hero: document.querySelector('#homePage .gh-welcome-title').innerText.trim(),
    nav: [...document.querySelectorAll('.tab-label')].map(e => e.innerText.trim()).join('/')
  }));
  rec('B3c', 'Language switch changes UI and persists (real user path)',
      uiEn.stored === 'en' && uiEn.hero === 'Welcome to GuardHai' && uiEn.nav === 'Home/Health/Shield/Chat'
      && uiSw.stored === 'sw' && uiSw.hero === 'Karibu GuardHai' && uiSw.nav === 'Nyumbani/Afya/Ulinzi/Chat',
      `EN "${uiEn.hero} | ${uiEn.nav}"  SW "${uiSw.hero} | ${uiSw.nav}"`);

  /* ---------------- B4: SOS is honest about being demo ---------------- */
  let dlg = null;
  page.once('dialog', async d => { dlg = d.message(); await d.dismiss(); });
  await page.click('#tab-sos');
  await page.waitForTimeout(600);
  // The SOS handler must never claim to have dispatched anything, and it must
  // offer a channel that really works (the phone).
  const sosText = await page.$eval('#ghSheetBody', e => e.innerText).catch(() => '');
  const sosOk = !dlg
    && /haijaunganishwa/i.test(sosText)
    && /112/.test(sosText)
    && !/imetumwa|alert triggered|sent to/i.test(sosText);
  rec('B4', 'SOS states no dispatch + shows real emergency numbers (no false "sent")',
      sosOk, sosText.replace(/\s+/g, ' ').slice(0, 90) || 'no sheet');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  /* ---------------- B5: dead ID references removed ---------------- */
  const dead = await page.evaluate(() => {
    const out = { bleEl: !!document.getElementById('lbl-ble-api-support'),
                  zoneEl: !!document.getElementById('lbl-current-zone'), threw: null };
    try {
      ProtectEngine.checkBluetoothHardwareSupport();
      ProtectEngine.setProfile('Quiet');
      out.bleDesc = document.getElementById('lbl-health-ble-desc')?.innerText;
      out.mode = ProtectEngine.currentMode;
    } catch (e) { out.threw = e.message; }
    return out;
  });
  const jsSrc = APP_JS;
  const callRe = id => new RegExp("getElementById\\(\\s*['\"]" + id + "['\"]").test(jsSrc);
  const refsBle = callRe('lbl-ble-api-support') ? 1 : 0;
  const refsZone = callRe('lbl-current-zone') ? 1 : 0;
  rec('B5', 'No dead getElementById targets (BLE + zone)',
      !dead.threw && refsBle === 0 && refsZone === 0 && !!dead.bleDesc,
      `refs(ble)=${refsBle} refs(zone)=${refsZone} threw=${dead.threw} bleDesc="${dead.bleDesc}"`);

  /* ---------------- B6: #i-play symbol renders ---------------- */
  const play = await page.evaluate(() => {
    const sym = document.getElementById('i-play');
    if (!sym) return { symbol: false };
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.setAttribute('width', '24'); host.setAttribute('height', '24');
    host.style.position = 'fixed'; host.style.left = '-999px';
    host.innerHTML = '<use href="#i-play"/>';
    document.body.appendChild(host);
    const b = host.getBoundingClientRect();
    const inner = host.querySelector('use').getBoundingClientRect();
    host.remove();
    return { symbol: true, w: Math.round(inner.width), h: Math.round(inner.height) };
  });
  rec('B6', '#i-play symbol exists and renders', play.symbol && play.w > 0 && play.h > 0,
      play.symbol ? `rendered ${play.w}x${play.h}px` : 'symbol missing');

  /* ---------------- B7: single GHIcon definition, superset mapping ---------------- */
  const ghDefs = (jsSrc.match(/function GHIcon\s*\(/g) || []).length;
  const gh = await page.evaluate(() => ({
    emoji: typeof GHIcon === 'function' ? GHIcon('\u{1F4BB}') : null,
    name: typeof GHIcon === 'function' ? GHIcon('laptop') : null,
    unknown: typeof GHIcon === 'function' ? GHIcon('zzz') : null
  }));
  rec('B7', 'GHIcon defined once, still maps emoji + names',
      ghDefs === 1 && /i-laptop/.test(gh.emoji || '') && /i-laptop/.test(gh.name || '') && /i-smartphone/.test(gh.unknown || ''),
      `defs=${ghDefs} emoji_ok=${/i-laptop/.test(gh.emoji || '')} fallback_ok=${/i-smartphone/.test(gh.unknown || '')}`);

  /* ---------------- R: regressions ---------------- */
  rec('R1', 'No page errors during run', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  for (const [tab, pageId] of [['chat', 'commPage'], ['shield', 'shieldPage'], ['home', 'homePage']]) {
    await page.click(`#tab-${tab}`);
    await page.waitForTimeout(250);
    const ok = await page.$eval(`#${pageId}`, e => e.classList.contains('active'));
    rec('R2.' + tab, `Tab "${tab}" still switches`, ok);
  }
  // Map is reached from the More menu (no bottom-nav slot by design)
  await page.click('#ghMoreBtn');
  await page.waitForTimeout(250);
  await page.click('#ghMoreMenu .gh-more-item >> nth=0');
  await page.waitForTimeout(1000);
  rec('R2.map', 'Map still switches (via More menu)', await page.$eval('#mapPage', e => e.classList.contains('active')));
  rec('R3', 'Leaflet map still initialises', await page.$eval('#mainMap', e => e.classList.contains('leaflet-container')));
  rec('R4', 'Map tiles still render', await page.$eval('#mainMap', e => e.querySelectorAll('.leaflet-tile-pane .leaflet-tile').length > 0));

  await page.click('#tab-health');
  await page.waitForTimeout(400);
  rec('R5', 'Afya tab -> Health sub-tab still works', await page.$eval('#protect-view-health', e => getComputedStyle(e).display !== 'none'));

  const beforeErr = pageErrors.length;
  await page.evaluate(() => ProtectEngine.runReal7StepSecurityCheck());
  await page.waitForTimeout(1200);
  const resultsLen = await page.$eval('#security-check-results-body', e => e.innerText.trim().length).catch(() => 0);
  rec('R6', 'Security check still runs cleanly', resultsLen > 20 && pageErrors.length === beforeErr, `${resultsLen} chars`);
  await page.evaluate(() => { const m = document.getElementById('modalSecurityCheck'); if (m) m.style.display = 'none'; });

  await page.click('#tab-home');
  await page.waitForTimeout(300);
  for (const w of [320, 360, 390, 430, 768]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(300);
    const o = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, i: window.innerWidth }));
    rec('R7.' + w, `No horizontal overflow @ ${w}px`, o.s <= o.i + 1, `${o.s} vs ${o.i}`);
  }

  /* ---------------- screenshots ---------------- */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const shotDir = path.join(ROOT, 'docs');
  await page.screenshot({ path: path.join(shotDir, 'after-home.png') });
  await page.click('#tab-shield');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(shotDir, 'after-shield.png') });
  await page.evaluate(() => I18N.setLanguage('en'));
  await page.click('#tab-home');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shotDir, 'after-home-en.png') });

  /* ---------------- summary ---------------- */
  const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
  console.log('\n' + pad('ID', 8) + pad('RESULT', 8) + 'CHECK');
  console.log('-'.repeat(96));
  for (const r of R) console.log(pad(r.id, 8) + pad(r.ok ? 'PASS' : 'FAIL', 8) + r.name + (r.detail ? `  [${r.detail}]` : ''));
  const pass = R.filter(r => r.ok).length;
  console.log('-'.repeat(96));
  console.log(`${pass}/${R.length} passed`);
  console.log(`page errors: ${pageErrors.length} | console errors: ${consoleErrors.length}`);
  fs.writeFileSync(path.join(shotDir, 'last-test-results.json'),
                   JSON.stringify({ url: URL, at: new Date().toISOString(), results: R, pageErrors, consoleErrors }, null, 2));
  await browser.close();
  process.exit(pass === R.length ? 0 : 1);
})();
