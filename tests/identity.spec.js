/**
 * GuardHai — background colour & iconic identity suite.
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/identity.spec.js [url]
 *
 * Covers the design brief “Background Colors & Iconic Identity”:
 *   • the quick search field that sits under the top navigation row
 *   • one icon family (stroke, size scale, sprite references)
 *   • one colour system (identity gradient, light surfaces, meaningful chips)
 *   • the repost action that the same brief asked for
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const R = [];
const rec = (id, name, ok, detail = '') => R.push({ id, name, ok, detail });

/** Wait for the app façade with plain evaluate polling: requestAnimationFrame
 *  polling (Playwright's default) is suspended in background pages, and both
 *  suites open extra pages for fallback / reduced-motion / responsive checks. */
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
  // the app is a module graph: wait for the façade instead of guessing a delay
  await waitForApp(page);
  await page.waitForTimeout(400);
  await page.evaluate(() => AuthFlow.goTo('landing'));
  await page.waitForTimeout(200);
  await page.evaluate(() => AuthFlow.goTo('register'));
  await page.waitForTimeout(320);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(1600);
}

/** WCAG contrast ratio between two rgb() strings */
function contrast(a, b) {
  const parse = (s) => (s.match(/\d+/g) || []).slice(0, 3).map(Number);
  const lum = (rgb) => {
    const [r, g, bl] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const l1 = lum(parse(a));
  const l2 = lum(parse(b));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await boot(page);

  /* ==================================================== A. quick search bar */
  const bar = await page.evaluate(() => {
    const el = document.getElementById('ghSearchBar');
    const head = document.getElementById('appTopNav');
    const input = document.getElementById('ghSearchBarInput');
    const r = el.getBoundingClientRect();
    const h = head.getBoundingClientRect();
    return {
      exists: !!el, hidden: el.hidden, top: Math.round(r.top), bottom: Math.round(r.bottom),
      headBottom: Math.round(h.bottom), width: Math.round(r.width),
      fieldTop: el.querySelector('.gh-searchbar-field')?.getBoundingClientRect().top || 0,
      placeholder: input?.getAttribute('placeholder') || '',
      inputs: document.querySelectorAll('#ghSearchBar input').length,
      sameInputId: document.querySelectorAll('#ghSearchBarInput').length
    };
  });
  rec('I1', 'Search field sits under the top nav row, not inside it',
      bar.exists && !bar.hidden && bar.top >= bar.headBottom - 1 && bar.top - bar.headBottom <= 14,
      `nav ends ${bar.headBottom} · field row ${bar.top} (${bar.top - bar.headBottom}px gap)`);
  rec('I2', 'One search field, on its own row, full width',
      bar.inputs === 1 && bar.sameInputId === 1 && bar.width >= 360,
      `${bar.inputs} input · ${bar.width}px wide · “${bar.placeholder}”`);

  const started = await page.$$eval('#ghFeed .gh-post', (els) => els.length);
  await page.fill('#ghSearchBarInput', 'maji');
  await page.waitForTimeout(500);
  const typed = await page.evaluate(() => ({
    count: document.querySelectorAll('#ghFeed .gh-post').length,
    hint: document.getElementById('ghSearchBarHint')?.innerText.trim() || '',
    clear: !document.getElementById('ghSearchBarClear')?.hidden
  }));
  rec('I3', 'Typing filters the Uwanja feed locally and reports the count',
      typed.count > 0 && typed.count < started && /matokeo/i.test(typed.hint) && typed.clear,
      `${started} → ${typed.count} · “${typed.hint}”`);

  await page.click('#ghSearchBarClear');
  await page.waitForTimeout(500);
  const cleared = await page.evaluate(() => ({
    count: document.querySelectorAll('#ghFeed .gh-post').length,
    value: document.getElementById('ghSearchBarInput')?.value || ''
  }));
  rec('I4', 'The clear control restores the full feed', cleared.count === started && cleared.value === '',
      `${cleared.count} cards · value “${cleared.value}”`);

  await page.evaluate(() => HomeUI.go('map'));
  await page.waitForTimeout(500);
  const onMap = await page.evaluate(() => document.getElementById('ghSearchBar').hidden);
  await page.evaluate(() => HomeUI.go('home'));
  await page.waitForTimeout(400);
  rec('I4b', 'The quick search is scoped to the Uwanja (hidden on other pages)', onMap === true);

  const searchControls = await page.evaluate(() => ({
    header: [...document.querySelectorAll('.gh-top-actions > button')]
      .map((b) => b.getAttribute('aria-label')).filter((l) => /tafuta/i.test(l || '')),
    inBar: [...document.querySelectorAll('#ghSearchBar [aria-label*="Tafuta" i], #ghSearchBar [aria-label*="tafuta" i]')].length,
    icons: document.querySelectorAll('#ghSearchBar .gh-searchbar-open .ic').length,
    oldBtn: !!document.getElementById('ghSearchBtn')
  }));
  rec('I4c', 'Exactly one search icon, and it is the one inside the search field',
      searchControls.header.length === 0 && searchControls.oldBtn === false
        && searchControls.icons === 1 && searchControls.inBar >= 1,
      `header ${searchControls.header.length} · field ${searchControls.icons}`);

  await page.click('#ghSearchBarOpen');
  await page.waitForTimeout(400);
  const sheet = await page.evaluate(() => ({
    open: document.getElementById('ghSheet')?.classList.contains('open') || false,
    input: !!document.getElementById('ghSearchInput')
  }));
  rec('I5', 'That icon opens the advanced (full-results) sheet', sheet.open && sheet.input);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  /* ========================================================= B. one icon family */
  const icons = await page.evaluate(() => {
    const symbols = new Set([...document.querySelectorAll('symbol[id^="i-"]')].map((s) => s.id));
    const uses = [...document.querySelectorAll('svg use')].map((u) => (u.getAttribute('href') || '').replace('#', ''));
    const sizeOf = (sel) => [...document.querySelectorAll(sel)].map((e) => {
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), sw: parseFloat(getComputedStyle(e).strokeWidth) };
    });
    return {
      missing: [...new Set(uses.filter((id) => id && !symbols.has(id)))],
      symbolCount: symbols.size,
      header: sizeOf('.top-nav.gh-topnav .gh-icon-btn .ic'),
      nav: sizeOf('#appBottomNav .nav-tab-btn .ic'),
      rail: sizeOf('.gh-post:first-child .gh-act .ic'),
      qa: sizeOf('.gh-qa .ic'),
      badges: sizeOf('.gh-post .gh-type-badge .ic'),
      naked: document.querySelectorAll('.top-nav svg:not(.ic), #appBottomNav svg:not(.ic), .gh-post-actions svg:not(.ic)').length
    };
  });
  rec('I6', 'Every icon reference resolves to a real sprite symbol', icons.missing.length === 0,
      `${icons.symbolCount} symbols · missing: ${icons.missing.join(',') || 'none'}`);
  rec('I7', 'Icons are square and come from one 5-step size scale',
      [icons.header, icons.nav, icons.rail, icons.qa, icons.badges].every((group) => group.length > 0
        && group.every((i) => i.w === i.h && [13, 16, 20, 22, 24].includes(i.w))),
      `header ${icons.header[0]?.w} · nav ${icons.nav[0]?.w} · rail ${icons.rail[0]?.w} · quick ${icons.qa[0]?.w} · chip ${icons.badges[0]?.w}`);
  rec('I8', 'One stroke weight, with a documented optical exception under 14px',
      icons.header.every((i) => i.sw === 1.9) && icons.rail.every((i) => i.sw === 1.9)
        && icons.badges.every((i) => i.sw === 2.1),
      `header/rail ${icons.header[0]?.sw} · chip ${icons.badges[0]?.sw}`);
  rec('I9', 'No stray inline icon outside the family class', icons.naked === 0, `${icons.naked} unclassified svg`);

  /* ==================================================== C. one colour system */
  const rules = await page.evaluate(() => [...document.styleSheets].flatMap((sh) => {
    try { return [...sh.cssRules].map((r) => r.cssText || ''); } catch { return []; }
  }));
  const defs = rules.filter((t) => /--gh-grad-identity\s*:/.test(t));
  const rawGradients = rules.filter((t) => /linear-gradient\(135deg,\s*#0E8F6E/i.test(t));
  rec('I10', 'The identity gradient is declared exactly once and reused through its token',
      defs.length === 1 && rawGradients.length <= 1,
      `${defs.length} declaration · ${rawGradients.length} raw copy`);

  const bands = await page.evaluate(() => {
    const bg = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).backgroundImage : 'missing';
    };
    return {
      shield: bg('#shieldPage > div'),
      map: bg('#mapPage > h3'),
      hero: getComputedStyle(document.querySelector('.gh-hero'), '::after').backgroundImage,
      heroTitle: getComputedStyle(document.querySelector('.gh-h1, .gh-hero-title, .gh-hero h1')).color,
      post: getComputedStyle(document.querySelector('.gh-post')).backgroundColor,
      page: getComputedStyle(document.body).backgroundColor
    };
  });
  rec('I11', 'Shield and Map heads use the same soft green→blue band',
      bands.shield.includes('linear-gradient') && bands.map.includes('linear-gradient')
        && bands.shield === bands.map,
      bands.shield.slice(0, 58));
  rec('I12', 'Hero overlay mixes green and blue with transparency (photo stays visible)',
      /rgba\(6, 40, 32, 0\.9/.test(bands.hero) && /rgba\(8, 46, 62, 0\.7/.test(bands.hero)
        && /rgba\(16, 58, 96, 0\.3/.test(bands.hero),
      bands.hero.slice(0, 64));
  rec('I13', 'Hero message is white on that overlay', bands.heroTitle === 'rgb(255, 255, 255)', bands.heroTitle);
  rec('I14', 'Body content stays on white / light surfaces', bands.post === 'rgb(255, 255, 255)',
      `card ${bands.post} · page ${bands.page}`);

  await page.evaluate(() => HomeUI.openMyProfile());
  await page.waitForTimeout(700);
  const cover = await page.evaluate(() => {
    const el = document.querySelector('.gh-profile-cover-grad');
    return el ? getComputedStyle(el).backgroundImage : 'missing';
  });
  rec('I15', 'Profile header carries the identity gradient (special block)', /linear-gradient/.test(cover), cover.slice(0, 60));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const profileClosed = await page.evaluate(() => !document.getElementById('ghProfile')?.classList.contains('open'));
  rec('I15b', 'Profile panel closes back to Home with Escape', profileClosed);

  /* ======================================================= D. chips & SOS */
  const chips = await page.evaluate(() => {
    const read = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, color: s.color, radius: s.borderRadius, border: s.borderTopWidth };
    };
    return {
      type: read('.gh-post .gh-type-badge'),
      topic: read('.gh-post .gh-post-topic'),
      sos: getComputedStyle(document.querySelector('.gh-sos-btn')).backgroundImage,
      sosColor: getComputedStyle(document.querySelector('.gh-sos-btn')).color
    };
  });
  const typeContrast = chips.type ? contrast(chips.type.color, chips.type.bg) : 0;
  const topicContrast = chips.topic ? contrast(chips.topic.color, chips.topic.bg) : 0;
  rec('I16', 'Chips read as metadata: soft fill, hairline border, pill radius',
      !!chips.type && chips.type.radius === '999px' && parseFloat(chips.type.border) <= 1.5
        && typeContrast >= 4.5 && topicContrast >= 4.5,
      `type ${typeContrast}:1 · topic ${topicContrast}:1`);

  // emergency red only: parse the gradient stops and require a red-dominant hue
  const redStops = chips.sos.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/g) || [];
  const redOK = redStops.length > 0 && redStops.every((stop) => {
    const [r, g, bl] = (stop.match(/\d+/g) || []).map(Number);
    return r > 170 && g < 100 && bl < 100;
  });
  rec('I17', 'SOS keeps the emergency colour and does not use the identity gradient',
      redOK && /^rgb\(255, 255, 255\)$/.test(chips.sosColor) && !/14, 143|15, 125|29, 95/.test(chips.sos),
      `${redStops.join(' → ')} · text ${chips.sosColor}`);

  /* ============================================================ E. repost */
  const rail = await page.evaluate(() => ({
    acts: [...document.querySelectorAll('#ghFeed .gh-post:first-child .gh-post-actions .gh-act')].map((b) => b.dataset.act),
    label: document.querySelector('#ghFeed .gh-post [data-act="repost"]')?.getAttribute('aria-label') || '',
    pressed: document.querySelector('#ghFeed .gh-post [data-act="repost"]')?.getAttribute('aria-pressed')
  }));
  rec('I18', 'Repost is a first-class rail action (one icon, one label)',
      rail.acts.includes('repost') && rail.acts.length === 6 && /rudia/i.test(rail.label) && rail.pressed === 'false',
      rail.acts.join(' > '));

  const before = await page.$$eval('#ghFeed .gh-post', (els) => els.length);
  await page.click('#ghFeed .gh-post [data-act="repost"]');
  await page.waitForTimeout(800);
  const afterRepost = await page.evaluate(() => ({
    count: document.querySelectorAll('#ghFeed .gh-post').length,
    marker: document.querySelector('.gh-post-reposted')?.innerText.trim() || '',
    pressedCopy: !!document.querySelector('.gh-post:has(.gh-post-reposted) [data-act="unrepost"]'),
    pressedOriginal: !!document.querySelector('.gh-post:not(:has(.gh-post-reposted)) [data-act="repost"][aria-pressed="true"]')
  }));
  rec('I19', 'Repost creates a labelled copy and marks the original as reposted',
      afterRepost.count === before + 1 && /umerudia kutoka kwa/i.test(afterRepost.marker)
        && afterRepost.pressedOriginal && afterRepost.pressedCopy,
      `${before} → ${afterRepost.count} · “${afterRepost.marker}”`);

  await page.click('#ghFeed .gh-post:has(.gh-post-reposted) [data-act="unrepost"]');
  await page.waitForTimeout(800);
  const undone = await page.evaluate(() => ({
    count: document.querySelectorAll('#ghFeed .gh-post').length,
    marker: !!document.querySelector('.gh-post-reposted'),
    toast: document.getElementById('ghToast')?.innerText.trim() || ''
  }));
  rec('I20', 'Removing the repost hides the copy again (device-only)',
      undone.count === before && !undone.marker && /kifaa hiki/i.test(undone.toast),
      `${afterRepost.count} → ${undone.count}`);

  rec('I21', 'No page errors during the identity suite', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  rec('I22', 'No console errors during the identity suite', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

  /* ------------------------------------------------------------ summary */
  console.log('');
  let pass = 0;
  for (const r of R) {
    console.log(`${r.id.padEnd(6)}${r.ok ? 'PASS' : 'FAIL'}    ${r.name}${r.detail ? `  [${r.detail}]` : ''}`);
    if (r.ok) pass += 1;
  }
  console.log('-'.repeat(100));
  console.log(`${pass}/${R.length} passed`);
  await browser.close();
  process.exit(pass === R.length ? 0 : 1);
})().catch((err) => { console.error('SUITE CRASHED:', err.message); process.exit(1); });
