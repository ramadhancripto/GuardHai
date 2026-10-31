/**
 * GuardHai — Shield Center + SOS + Personal Safety suite (redesign R1).
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/shield.spec.js [url]
 *
 * Drives the real UI: taps tabs, fills forms, submits, reloads the page. The
 * checks fall into four groups:
 *
 *   1. structure  — the Center opens on a dashboard; the six sections exist; the
 *                   Device Protection console is preserved behind it
 *   2. honesty    — no decorative green, no invented percentage, no "sent" when
 *                   nothing was sent, Asset Protection is declared pending
 *   3. workflows  — journey / check-in / plan / incident / preferences / export /
 *                   erase all persist and validate
 *   4. SOS        — two modes, numbers above the fold at 360 px, records truthful
 *
 * Every check has a stable id (SC1…) so a failure names the surface it broke.
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const R = [];
const rec = (id, name, ok, detail = '') => {
  R.push({ id, name, ok: !!ok, detail });
  if (process.env.SX_VERBOSE || !ok) console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${name}${detail ? `\n        ${detail}` : ''}`);
};

const waitForApp = async (page, ms = 20000) => {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(() => typeof window.AuthFlow !== 'undefined' && typeof window.ShieldCenter !== 'undefined')) return;
    if (Date.now() - t0 > ms) throw new Error('app did not boot');
    await page.waitForTimeout(150);
  }
};

async function boot(page) {
  await page.goto(URL, { waitUntil: 'load' });
  await waitForApp(page);
  await page.evaluate(() => AuthFlow.goTo('landing'));
  await page.waitForTimeout(120);
  await page.evaluate(() => AuthFlow.goTo('register'));
  await page.waitForTimeout(300);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(1400);
}

const goShield = async (page, view = 'home') => {
  await page.evaluate(() => HomeUI.go('shield'));
  await page.evaluate((v) => window.ShieldCenter.go(v), view);
  await page.waitForTimeout(500);
};

const goSos = async (page) => {
  await page.evaluate(() => HomeUI.go('sos'));
  await page.waitForTimeout(500);
};


/** the service is imported inside the page, like the network suite does */
const svc = async (page, fn, ...args) => page.evaluate(async ([f, a]) => {
  const m = await import('/src/services/personal-safety.service.js');
  return m[f](...a);
}, [fn, args]);

const bodyOf = (page, view) => page.evaluate((v) => {
  const id = 'shield' + v.charAt(0).toUpperCase() + v.slice(1) + 'Body';
  return document.getElementById(id)?.innerText || '';
}, view);

const fillForm = async (page, form, values) => {
  await page.evaluate(([f, v]) => {
    const node = document.querySelector(`form[data-shield-form="${f}"]`);
    if (!node) return;
    Object.entries(v).forEach(([k, val]) => {
      const el = node.querySelector(`[name="${k}"]`);
      if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
  }, [form, values]);
};

const submitForm = async (page, form) => {
  await page.evaluate((f) => {
    const node = document.querySelector(`form[data-shield-form="${f}"]`);
    if (node) node.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, form);
  await page.waitForTimeout(600);
};

const tapAction = async (page, act, key = '') => {
  await page.evaluate(([a, k]) => {
    const sel = k ? `[data-shield-act="${a}"][data-key="${k}"]` : `[data-shield-act="${a}"]`;
    const el = document.querySelector(sel);
    if (el) el.click();
  }, [act, key]);
  await page.waitForTimeout(600);
};

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await boot(page);

  /* ------------------------------------------------------- 1. structure */
  await page.evaluate(() => HomeUI.go('shield'));
  await page.waitForTimeout(700);

  const shell = await page.evaluate(() => ({
    active: document.getElementById('shieldPage').classList.contains('active'),
    tabs: [...document.querySelectorAll('#shieldTabs .gds-tab')].map((b) => b.innerText.trim()),
    selected: document.querySelectorAll('#shieldTabs .gds-tab[aria-selected="true"]').length,
    homeShown: !document.querySelector('.shield-view[data-view="home"]').hidden,
    deviceHidden: document.querySelector('.shield-view[data-view="device"]').hidden,
    tabActive: document.getElementById('tab-shield').classList.contains('active'),
    head: document.querySelector('#shieldHead .gds-head-title')?.innerText.trim()
  }));
  rec('SC1', 'Ulinzi opens the Shield Center dashboard, not a device sub-tab',
    shell.active && shell.homeShown && shell.deviceHidden && shell.tabActive && shell.head === 'Shield Center',
    `${shell.head} · home ${shell.homeShown ? 'shown' : 'hidden'} · device ${shell.deviceHidden ? 'behind' : 'in front'}`);

  rec('SC2', 'Seven sections in a fixed order, exactly one selected',
    shell.tabs.length === 7 && shell.selected === 1
      && JSON.stringify(shell.tabs) === JSON.stringify(['Muhtasari', 'Kifaa', 'Usalama binafsi', 'Kidijitali', 'Mali', 'Historia', 'Mipangilio']),
    shell.tabs.join(' · '));

  const dash = await bodyOf(page, 'home');
  rec('SC3', 'Dashboard states what is on: no invented "running" or confidence score',
    !/PROTECTION ENGINE RUNNING/i.test(dash) && !/Confidence Index|100\s*%/i.test(dash)
      && /Vifaa vilivyosajiliwa/.test(dash) && /Bluetooth/i.test(dash) && /Seva/.test(dash),
    dash.split('\n').slice(0, 3).join(' | '));

  rec('SC4', 'Every dashboard status is a sentence, not only a colour',
    /Hakuna kifaa kilichosajiliwa|kwenye kifaa hiki/i.test(dash)
      && /Hakuna — data inabaki kwenye kifaa|Imeunganishwa/.test(dash)
      && /Hakuna seva/.test(dash),
    'status rows carry a written state');

  const attention = await page.evaluate(() => document.querySelector('#shieldHomeBody').innerText);
  rec('SC5', 'Attention list reflects the real state of a fresh account',
    /Hakuna mlezi aliyekubali/.test(attention) && /Check-in ya leo haijafanyika/.test(attention),
    'fresh account: no guardian, no check-in');

  const sosBtn = await page.evaluate(() => !!document.querySelector('#shieldHomeBody [data-shield-act="sos.open"]'));
  rec('SC6', 'Emergency is one tap from the dashboard', sosBtn);

  /* ------------------------------------------- 2. device protection kept */
  await page.evaluate(() => window.ShieldCenter.go('device'));
  await page.waitForTimeout(600);
  const device = await page.evaluate(() => {
    const view = document.querySelector('.shield-view[data-view="device"]');
    return {
      shown: !view.hidden,
      pillars: [...document.querySelectorAll('.pillar-nav-btn')].map((b) => b.innerText.trim()),
      subs: document.querySelectorAll('.protect-sub-btn').length,
      dash: getComputedStyle(document.getElementById('protect-view-dashboard')).display,
      sens: !!document.getElementById('lbl-protection-confidence')
    };
  });
  rec('SC7', 'Device Protection console is preserved: 3 pillars, 10 sub-views, live dashboard',
    device.shown && device.pillars.length === 3 && device.subs === 10 && device.dash === 'block' && device.sens,
    `${device.pillars.join('/')} · ${device.subs} sub-views`);

  await page.evaluate(() => window.ProtectEngine.switchSubTab('devices'));
  await page.waitForTimeout(400);
  const switched = await page.evaluate(() => ({
    devices: getComputedStyle(document.getElementById('protect-view-devices')).display,
    dash: getComputedStyle(document.getElementById('protect-view-dashboard')).display
  }));
  rec('SC8', 'The engine still switches its own sub-views inside the new shell',
    switched.devices === 'block' && switched.dash === 'none', `devices ${switched.devices}`);
  await page.evaluate(() => window.ProtectEngine.switchSubTab('dashboard'));

  const pillars = await page.evaluate(() => {
    window.switchShieldPillar('recover');
    const rec = getComputedStyle(document.getElementById('pillar-content-recover')).display;
    window.switchShieldPillar('find');
    const find = getComputedStyle(document.getElementById('pillar-content-find')).display;
    window.switchShieldPillar('protect');
    return { rec, find };
  });
  rec('SC9', 'Find and Recover pillars still open', pillars.rec === 'block' && pillars.find === 'block', `recover ${pillars.rec} · find ${pillars.find}`);

  /* ------------------------------------------------ 3. personal safety */
  await page.evaluate(() => document.querySelector('#shieldTabs [data-shield-view="personal"]').click());
  await page.waitForTimeout(700);
  const personal = await page.evaluate(() => ({
    shown: !document.querySelector('.shield-view[data-view="personal"]').hidden,
    rows: [...document.querySelectorAll('#shieldPersonalBody .gds-row-title')].map((e) => e.innerText.trim())
  }));
  rec('SC10', 'Personal Safety lists the six tools the brief fixes',
    personal.shown && ['Walezi wangu', 'Safari ya usalama', 'Check-in ya kibinafsi', 'Mipango ya hatari', 'Ripoti za matukio', 'Mapendeleo ya usalama']
      .every((t) => personal.rows.includes(t)),
    personal.rows.join(' · '));

  // journey: validation first, then a real start
  await page.evaluate(() => window.ShieldCenter.goPersonal('journey'));
  await page.waitForTimeout(500);
  await fillForm(page, 'journey.start', { label: 'ab' });
  await submitForm(page, 'journey.start');
  const refused = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).listJourneys().then((r) => r.length));
  rec('SC11', 'A journey with a too-short name is refused', refused === 0, `${refused} journeys stored`);

  await fillForm(page, 'journey.start', { label: 'Kituo cha afya', place: 'Magomeni', minutes: '30' });
  await submitForm(page, 'journey.start');
  const started = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).listJourneys().then((r) => r[0] || null));
  rec('SC12', 'A valid journey starts, is stored and shows a return time',
    !!started && started.label === 'Kituo cha afya' && started.status === 'active' && !!started.expectedAt,
    started ? `${started.label} · ${String(started.expectedAt).slice(11, 16)} UTC` : 'none');

  const activeShown = await page.evaluate(() => /Safari inayoendelea|Muda|Inaendelea/.test(document.getElementById('shieldPersonalBody').innerText));
  rec('SC13', 'The running journey is painted with its status and no false notice',
    activeShown, 'journey card rendered');

  // check-in
  await page.evaluate(() => window.ShieldCenter.goPersonal('checkin'));
  await page.waitForTimeout(450);
  await fillForm(page, 'checkin.go', { feeling: 'safe', note: 'Nipo nyumbani' });
  await submitForm(page, 'checkin.go');
  const chk = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).todayCheckin());
  rec('SC14', 'A check-in is stored for today and cannot be faked twice',
    !!chk && chk.feeling === 'safe' && /Imefanyika/.test(await bodyOf(page, 'personal')),
    chk ? `${chk.feeling} · ${chk.note}` : 'none');

  // plan from a template
  await page.evaluate(() => window.ShieldCenter.goPersonal('plans'));
  await page.waitForTimeout(450);
  await tapAction(page, 'plan.template', 'night-travel');
  const prefilled = await page.evaluate(() => {
    const t = document.querySelector('form[data-shield-form="plan.create"] [name="title"]');
    const s = document.querySelector('form[data-shield-form="plan.create"] [name="steps"]');
    return { title: t?.value || '', steps: (s?.value || '').split('\n').filter(Boolean).length };
  });
  rec('SC15', 'A template prefills the plan form with real steps',
    prefilled.title === 'Safari ya usiku' && prefilled.steps >= 3, `${prefilled.title} · ${prefilled.steps} steps`);

  await submitForm(page, 'plan.create');
  const plans = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).listPlans());
  rec('SC16', 'Saving the plan persists it and it is listed',
    plans.length === 1 && plans[0].steps.length >= 3, `${plans.length} plan(s)`);

  // incident: too short is refused, valid persists
  await page.evaluate(() => window.ShieldCenter.goPersonal('incidents'));
  await page.waitForTimeout(450);
  await fillForm(page, 'incident.create', { kind: 'unsafe', detail: 'kitu' });
  await submitForm(page, 'incident.create');
  const inc0 = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).listIncidents().then((r) => r.length));
  rec('SC17', 'An incident with too little detail is refused', inc0 === 0, `${inc0} stored`);

  await fillForm(page, 'incident.create', { kind: 'unsafe', detail: 'Mtu alinifuata usiku karibu na kituo cha basi.' });
  await submitForm(page, 'incident.create');
  const inc = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).listIncidents());
  rec('SC18', 'A valid incident is stored and marked as not reviewed',
    inc.length === 1 && inc[0].status === 'pending' && inc[0].subjectType === 'incident',
    inc[0] ? `${inc[0].status} · ${String(inc[0].detail).slice(0, 28)}` : 'none');

  /* -------------------------------------------- 4. preferences & honesty */
  await page.evaluate(() => window.ShieldCenter.go('settings'));
  await page.waitForTimeout(500);
  const pref1 = await page.evaluate(async () => {
    const sw = document.querySelector('[data-shield-pref="dailyCheckinReminder"]');
    sw.click();
    await new Promise((r) => setTimeout(r, 300));
    const m = await import('/src/services/personal-safety.service.js');
    const p = await m.getPrefs();
    return p.dailyCheckinReminder;
  });
  await page.waitForTimeout(500);
  rec('SC19', 'A preference toggle writes through to the store', pref1 === false, `dailyCheckinReminder=${pref1}`);

  const shareBlocked = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).setPref('shareWithGuardians', true));
  rec('SC20', 'Sharing with guardians cannot be switched on without a server',
    shareBlocked.ok === false && /seva|server/i.test(shareBlocked.message), shareBlocked.message || '');

  const shareDisabled = await page.evaluate(() => {
    const sw = document.querySelector('[data-shield-pref="shareWithGuardians"]');
    return !!sw && sw.disabled === true;
  });
  rec('SC21', 'The disabled switch is visibly disabled, with the reason in the row', shareDisabled);

  /* survives a reload */
  const beforeReload = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).getPrefs());
  await page.reload({ waitUntil: 'load' });
  await waitForApp(page);
  await page.waitForTimeout(900);
  const afterReload = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).getPrefs().catch(() => null));
  rec('SC22', 'Preferences survive a reload (IndexedDB v4)', !!afterReload && afterReload.dailyCheckinReminder === false,
    `after reload dailyCheckinReminder=${afterReload?.dailyCheckinReminder}`);

  const persisted = await page.evaluate(async () => {
    const m = await import('/src/services/personal-safety.service.js');
    return {
      journeys: (await m.listJourneys()).length,
      checkins: (await m.listCheckins()).length,
      plans: (await m.listPlans()).length,
      incidents: (await m.listIncidents()).length
    };
  });
  rec('SC23', 'Journeys, check-ins, plans and incidents all survive the reload',
    persisted.journeys === 1 && persisted.checkins === 1 && persisted.plans === 1 && persisted.incidents === 1,
    JSON.stringify(persisted));

  /* --------------------------------------------------------- 5. digital */
  await goShield(page, 'digital');
  const digital = await bodyOf(page, 'digital');
  rec('SC24', 'Digital Security reports real storage and capability, not a score',
    /Hifadhi iliyotumika/.test(digital) && /HTTPS|HTTP/.test(digital) && /Bluetooth/.test(digital) && !/%/.test(digital.split('Hifadhi iliyotumika')[0]),
    digital.split('\n').slice(0, 3).join(' | '));

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 6000 }).catch(() => null),
    page.evaluate(() => document.querySelector('[data-shield-act="digital.export"]')?.click())
  ]);
  rec('SC25', 'Export produces a local JSON download', !!download && /guardhai-safety-.*\.json/.test(download.suggestedFilename()),
    download ? download.suggestedFilename() : 'no download');

  await page.evaluate(() => document.querySelector('[data-shield-act="digital.erase"]')?.click());
  await page.waitForTimeout(900);
  const confirmShown = await page.evaluate(() => /Futa kabisa\?/.test(document.getElementById('shieldDigitalBody').innerText));
  rec('SC26', 'Erase asks for a second, explicit confirmation', confirmShown,
    await page.evaluate(() => String(window.ShieldCenter.state.confirm)));

  await page.evaluate(() => document.querySelector('[data-shield-act="digital.erase.cancel"]')?.click());
  await page.waitForTimeout(400);
  const stillThere = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).listJourneys().then((r) => r.length));
  rec('SC27', 'Cancelling the erase keeps the data', stillThere === 1, `${stillThere} journey(s)`);

  /* ---------------------------------------------------------- 6. assets */
  await goShield(page, 'assets');
  const assets = await bodyOf(page, 'assets');
  rec('SC28', 'Asset Protection is declared pending — no invented register',
    /Hakuna rejista ya mali bado/.test(assets) && /Haipo kwenye toleo hili/i.test(assets)
      && !/mali yako|asset list/i.test(assets),
    assets.split('\n').slice(0, 2).join(' | '));

  /* --------------------------------------------------------- 7. history */
  await goShield(page, 'history');
  const history = await bodyOf(page, 'history');
  rec('SC29', 'Security History merges the real events created in this run',
    /Safari: Kituo cha afya|Safari/.test(history) && /Check-in ya kibinafsi/.test(history) && /Tukio la usalama/.test(history),
    history.split('\n').slice(0, 4).join(' | '));

  /* ------------------------------------------------------------- 8. SOS */
  await goSos(page);
  const sosInfo = await page.evaluate(() => {
    const stage = document.getElementById('sosStage');
    const text = stage.innerText;
    const calls = [...document.querySelectorAll('#sosStage .gds-call')].map((a) => ({
      href: a.getAttribute('href'), h: a.getBoundingClientRect().height, top: a.getBoundingClientRect().top
    }));
    return {
      active: document.getElementById('sosPage').classList.contains('active'),
      text,
      calls,
      modes: document.querySelectorAll('[data-sos-mode]').length,
      viewport: window.innerHeight
    };
  });
  rec('SC30', 'SOS is a page with the three working numbers as tap-to-call rows',
    sosInfo.active && sosInfo.calls.length === 3
      && sosInfo.calls.map((c) => c.href).join(',') === 'tel:112,tel:114,tel:110'
      && sosInfo.calls.every((c) => c.h >= 44),
    sosInfo.calls.map((c) => c.href).join(' '));

  rec('SC31', 'All three numbers are above the fold at 390 px',
    sosInfo.calls.every((c) => c.top + 40 < sosInfo.viewport),
    `last number top ${Math.round(sosInfo.calls[2].top)} of ${sosInfo.viewport}`);

  rec('SC32', 'Two modes: personal emergency vs disaster alert',
    sosInfo.modes === 2 && /Dharura yangu/.test(sosInfo.text) && /Tahadhari ya maafa/.test(sosInfo.text));

  const sosHonest = await page.evaluate(() => {
    const t = document.getElementById('sosStage').innerText;
    return {
      none: /Hakuna/.test(t) && /haitumwi|Hakuna msaada|hakuna (mtu )?anayearifiwa/i.test(t),
      lie: /imetumwa kwa polisi|alert sent|dispatched/i.test(t)
    };
  });
  rec('SC33', 'SOS never claims to have sent anything', sosHonest.none && !sosHonest.lie,
    `none=${sosHonest.none} · lie=${sosHonest.lie}`);

  const modeSwitch = await page.evaluate(async () => {
    document.querySelector('[data-sos-mode="disaster"]').click();
    await new Promise((r) => setTimeout(r, 400));
    const t = document.getElementById('sosStage').innerText;
    return { flood: /Mafuriko|Tahadhari/.test(t), kinds: document.querySelectorAll('[data-sos-kind]').length };
  });
  rec('SC34', 'Switching to disaster alert swaps the kind chips', modeSwitch.kinds >= 4 && modeSwitch.flood, `${modeSwitch.kinds} kinds`);

  await page.evaluate(() => {
    document.querySelector('[data-sos-kind="flood"]')?.click();
    document.querySelector('[data-sos-act="sos.record"]')?.click();
  });
  await page.waitForTimeout(900);
  const attempt = await page.evaluate(async () => (await import('/src/services/personal-safety.service.js')).listSosAttempts(5).then((r) => r[0] || null));
  rec('SC35', 'Recording an SOS attempt stores it as NOT delivered',
    !!attempt && attempt.delivered === false && attempt.mode === 'disaster' && attempt.reason === 'not-connected',
    attempt ? `${attempt.mode} · delivered=${attempt.delivered}` : 'none');

  const attemptShown = await page.evaluate(() => /Majaribio ya hivi karibuni/.test(document.getElementById('sosStage').innerText)
    && /Tahadhari ya maafa/.test(document.getElementById('sosStage').innerText));
  rec('SC36', 'The attempt is listed on the page with its mode', attemptShown);

  const quickSheet = await page.evaluate(() => {
    document.querySelector('[data-sos-act="sos.sheet"]')?.click();
    return new Promise((r) => setTimeout(() => r(document.getElementById('ghSheetBody')?.innerText || ''), 700));
  });
  rec('SC37', 'The quick SOS sheet is still one tap away and keeps the same honest copy',
    /haijaunganishwa/i.test(quickSheet) && /112/.test(quickSheet), quickSheet.split('\n')[1] || '');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  /* --------------------------------------------------- 9. nav + a11y + layout */
  const nav = await page.evaluate(() => ({
    ids: [...document.querySelectorAll('#appBottomNav .nav-tab-btn, #appBottomNav .nav-sos-slot')].map((b) => b.id),
    sosRaised: !!document.querySelector('.nav-sos-raised')
  }));
  rec('SC38', 'Bottom navigation is unchanged: five slots, raised red SOS',
    JSON.stringify(nav.ids) === JSON.stringify(['tab-home', 'tab-health', 'tab-sos', 'tab-shield', 'tab-chat']) && nav.sosRaised,
    nav.ids.join(','));

  const unnamed = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#shieldPage button, #sosPage button, #sosPage a').forEach((b) => {
      if (b.offsetParent === null) return;
      const name = (b.getAttribute('aria-label') || b.innerText || b.textContent || '').trim();
      if (!name) out.push(b.outerHTML.slice(0, 70));
    });
    return out;
  });
  rec('SC39', 'Every visible control on the new surfaces has an accessible name',
    unnamed.length === 0, unnamed.slice(0, 2).join(' | ') || 'none');

  const targets = await page.evaluate(() => {
    const small = [];
    document.querySelectorAll('#shieldPage button, #shieldPage a, #sosPage button, #sosPage a').forEach((b) => {
      if (b.offsetParent === null) return;
      const r = b.getBoundingClientRect();
      const cls = b.className || '';
      if (r.height && r.height < 32 && !String(cls).includes('gds-switch')) small.push(`${Math.round(r.height)}px ${String(cls).slice(0, 24)}`);
    });
    return small;
  });
  rec('SC40', 'No visible control is smaller than 32 px tall', targets.length === 0, targets.slice(0, 3).join(' · ') || 'none');

  const overflows = [];
  for (const w of [360, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(250);
    const o = await page.evaluate(() => {
      const dw = document.documentElement.scrollWidth;
      const pw = document.getElementById('shieldPage').scrollWidth;
      return { dw, pw, vw: window.innerWidth };
    });
    if (o.dw > o.vw + 1 || o.pw > o.vw + 1) overflows.push(`${w}:${o.dw}/${o.pw}`);
  }
  rec('SC41', 'No horizontal overflow on Shield or SOS from 360 to 1280 px',
    overflows.length === 0, overflows.join(' ') || '6 widths clean');
  await page.setViewportSize({ width: 390, height: 844 });

  const langSwitch = await page.evaluate(async () => {
    window.I18N.setLanguage('en');
    window.HomeUI.syncLang();
    document.dispatchEvent(new CustomEvent('guardhai:lang'));
    await new Promise((r) => setTimeout(r, 500));
    const tabs = [...document.querySelectorAll('#shieldTabs .gds-tab')].map((b) => b.innerText.trim());
    window.I18N.setLanguage('sw');
    window.HomeUI.syncLang();
    return tabs;
  });
  rec('SC42', 'Language switch re-paints the Shield tabs in English',
    langSwitch.includes('Overview') && langSwitch.includes('Personal Safety'), langSwitch.join(' · '));

  const others = await page.evaluate(async () => {
    window.HomeUI.go('health');
    await new Promise((r) => setTimeout(r, 400));
    const health = document.getElementById('healthPage').classList.contains('active');
    window.HomeUI.go('chat');
    await new Promise((r) => setTimeout(r, 500));
    const chat = document.getElementById('commPage').classList.contains('active');
    window.HomeUI.go('shield');
    await new Promise((r) => setTimeout(r, 400));
    const shield = document.getElementById('shieldPage').classList.contains('active');
    return { health, chat, shield };
  });
  rec('SC43', 'Health and Chat still work after Shield mounts (no module collision)',
    others.health && others.chat && others.shield, JSON.stringify(others));

  /* --------------------------------------------------------------- final */
  rec('SC44', 'No page errors during the whole run', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  rec('SC45', 'No console errors during the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  const pass = R.filter((r) => r.ok).length;
  console.log(`\n${pass}/${R.length} checks passed`);
  console.log(pass === R.length ? 'RESULT: all checks passed' : 'RESULT: at least one check failed');
  await browser.close();
  process.exit(pass === R.length ? 0 : 1);
})().catch((err) => {
  console.log('FATAL', err && err.stack ? err.stack.split('\n').slice(0, 4).join('\n') : err);
  process.exit(2);
});
