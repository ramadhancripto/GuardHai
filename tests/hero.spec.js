/**
 * GuardHai — hero slideshow suite.
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/hero.spec.js [url]
 *
 * Verifies the Home hero only: the five photos, the real 6-second crossfade,
 * looping, the copy that must not move, pause/reduced-motion/visibility
 * behaviour, the missing-photo fallback, responsive layout, and that SOS and the
 * fixed navigation still work with the slideshow mounted.
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
    if (Date.now() - started > ms) {
      const d = await page.evaluate(() => ({
        ready: document.readyState, url: location.href,
        scripts: [...document.querySelectorAll('script')].map((x) => x.src || 'inline').slice(0, 4),
        err: window.__lastError || null
      }));
      throw new Error(`app did not boot within ${ms}ms ${JSON.stringify(d)}`);
    }
    await page.waitForTimeout(150);
  }
}

async function boot(page) {
  // the app is a ~60-module graph; in a 2 GB sandbox a single dropped fetch
  // leaves the façade undefined, so one clean reload is allowed per boot
  for (let attempt = 1; ; attempt += 1) {
    await page.goto(URL, { waitUntil: 'load' });
    try {
      await waitForApp(page);
      break;
    } catch (err) {
      if (attempt >= 2) throw err;
      await page.waitForTimeout(600);
    }
  }
  await page.waitForTimeout(400);
  await page.evaluate(() => AuthFlow.goTo('landing'));
  await page.waitForTimeout(200);
  await page.evaluate(() => AuthFlow.goTo('register'));
  await page.waitForTimeout(320);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector('.gh-hero')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(200);
}

const slidesInfo = (page) => page.evaluate(() => {
  const slides = [...document.querySelectorAll('[data-hero-slide]')];
  return {
    count: slides.length,
    images: slides.map((s) => ({
      src: s.querySelector('img')?.getAttribute('src') || '',
      dataSrc: s.dataset.src || '',
      active: s.classList.contains('is-active')
    })),
    activeIndex: slides.findIndex((s) => s.classList.contains('is-active')),
    dots: document.querySelectorAll('[data-hero-dot]').length,
    heroCount: document.querySelectorAll('.gh-hero').length
  };
});

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await boot(page);

  /* ============================================================ A. structure */
  const first = await slidesInfo(page);
  rec('H1', 'There is exactly one hero section (the existing one was upgraded)',
      first.heroCount === 1, `${first.heroCount} .gh-hero`);
  rec('H2', 'Five slides, each backed by a local file under assets/img',
      first.count === 5 && first.images.every((s) => /assets\/img\/.+\.(jpg|png|webp)$/.test(s.src || s.dataSrc)),
      first.images.map((s) => (s.src || s.dataSrc).split('/').pop()).join(', '));
  const markup = await page.evaluate(async () => {
    const html = await (await fetch('index.html')).text();
    const media = html.slice(html.indexOf('gh-hero-media'), html.indexOf('gh-hero-inner'));
    return {
      imgs: (media.match(/<img /g) || []).length,
      eager: (media.match(/loading="eager"/g) || []).length,
      deferred: (media.match(/data-src=/g) || []).length,
      firstSrc: (media.match(/src="([^"]+)"/) || [])[1] || ''
    };
  });
  rec('H3', 'Only the first photo is in the shipped markup; the other four are deferred',
      markup.imgs === 1 && markup.eager === 1 && markup.deferred === 4
        && /hero-community\.jpg$/.test(markup.firstSrc),
      `${markup.imgs} img · ${markup.eager} eager · ${markup.deferred} data-src`);

  await page.waitForTimeout(2600);
  const prefetch = await slidesInfo(page);
  rec('H4', 'The next photo is prefetched in the background, not all five',
      prefetch.images[0].src && prefetch.images[1].src && !prefetch.images[4].src,
      `loaded: ${prefetch.images.map((s) => (s.src ? '1' : '0')).join('')}`);

  /* ================================================================ B. copy */
  const copy = await page.evaluate(() => ({
    title: document.querySelector('.gh-hero-title')?.textContent.trim(),
    sub: document.querySelector('.gh-hero-sub')?.textContent.trim(),
    desc: document.querySelector('.gh-hero-desc')?.textContent.trim(),
    titles: document.querySelectorAll('.gh-hero-title').length,
    chip: document.querySelector('.gh-hero-chip')?.textContent.trim(),
    dots: document.querySelectorAll('.gh-hero-dot').length
  }));
  rec('H5', 'The three required lines are present, once each',
      copy.title === 'Tayari kwa dharura?' && copy.sub === 'Tuungane kulinda maisha.'
        && copy.desc === 'Msaada unapohitajika, kila sekunde ina maana. Jiandae leo kwa usalama wa kesho.'
        && copy.titles === 1,
      `${copy.title} / ${copy.sub}`);
  rec('H6', 'The brand chip and one dot per slide are rendered',
      copy.chip === 'GuardHai' && copy.dots === first.count,
      `${copy.chip} · ${copy.dots} dots`);

  /* ====================================================== C. auto-advance */
  const snap = () => page.evaluate(() => {
    const t = document.querySelector('.gh-hero-title');
    const s = document.querySelector('.gh-hero-sub');
    const d = document.querySelector('.gh-hero-desc');
    const btn = document.querySelector('.gh-sos-btn');
    const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(','); };
    return {
      index: window.GHHero.currentIndex(),
      rects: [box(t), box(s), box(d), box(btn)],
      nodes: [t, s, d].map((el) => el.isSameNode(document.querySelector(`.gh-hero-${el.classList.contains('gh-hero-title') ? 'title' : el.classList.contains('gh-hero-sub') ? 'sub' : 'desc'}`) || el))
    };
  });

  await page.evaluate(() => { window.GHHero.goTo(0); window.GHHero.resume(); });
  await page.waitForTimeout(250);
  const before = await snap();
  const t0 = Date.now();
  await page.waitForFunction((i) => window.GHHero.currentIndex() !== i, before.index, { timeout: 9000 });
  const elapsed = Date.now() - t0;
  const after = await snap();
  rec('H7', 'The photo changes on its own after roughly six seconds',
      elapsed >= 5200 && elapsed <= 8600 && after.index !== before.index,
      `${(elapsed / 1000).toFixed(1)}s · slide ${before.index} → ${after.index}`);
  rec('H8', 'The headline, subtitle, description and SOS button do not move',
      JSON.stringify(before.rects) === JSON.stringify(after.rects) && after.nodes.every(Boolean),
      before.rects[0] === after.rects[0] ? `title stays at ${after.rects[0]}` : `${before.rects[0]} → ${after.rects[0]}`);

  const crossfade = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('[data-hero-slide]'));
    return { transition: cs.transitionProperty, duration: cs.transitionDuration, opacity: cs.opacity };
  });
  rec('H9', 'Slides crossfade with an opacity transition (no jump cut)',
      /opacity/.test(crossfade.transition) && parseFloat(crossfade.duration) >= 0.4,
      `${crossfade.transition} ${crossfade.duration}`);

  /* ============================================================ D. looping */
  await page.evaluate(() => window.GHHero.goTo(4));
  const lastIndex = await page.evaluate(() => window.GHHero.currentIndex());
  await page.waitForTimeout(6600);
  const looped = await page.evaluate(() => window.GHHero.currentIndex());
  rec('H10', 'After the last photo it loops back to the first',
      lastIndex === 4 && looped === 0, `slide 4 → ${looped}`);

  /* ========================================================== E. controls */
  await page.click('[data-hero-dot="2"]');
  await page.waitForTimeout(300);
  const afterDot = await page.evaluate(() => ({
    index: window.GHHero.currentIndex(),
    paused: window.GHHero.isPaused(),
    current: document.querySelectorAll('[data-hero-dot][aria-current="true"]').length,
    activeDots: document.querySelectorAll('.gh-hero-dot.is-active').length
  }));
  rec('H11', 'A dot jumps to that photo, pauses the rotation and stays in sync',
      afterDot.index === 2 && afterDot.paused === true && afterDot.current === 1 && afterDot.activeDots === 1,
      `index ${afterDot.index} · paused ${afterDot.paused}`);

  const pauseBtn = await page.evaluate(() => {
    const btn = document.querySelector('[data-hero-toggle]');
    return { pressed: btn.getAttribute('aria-pressed'), label: btn.getAttribute('aria-label') };
  });
  rec('H12', 'The pause control reports its state to assistive tech',
      pauseBtn.pressed === 'true' && /Endeleza|Simamisha/.test(pauseBtn.label),
      `${pauseBtn.pressed} · ${pauseBtn.label}`);

  /* paused rotation really stops */
  await page.waitForTimeout(3000);
  const stillThere = await page.evaluate(() => window.GHHero.currentIndex());
  rec('H13', 'A paused hero stays on the same photo', stillThere === 2, `index ${stillThere} after 3s`);

  /* ========================================================= F. visibility */
  const hiddenRun = await page.evaluate(async () => {
    window.GHHero.resume();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    return window.GHHero.currentIndex();
  });
  await page.waitForTimeout(6600);
  const afterHidden = await page.evaluate(() => window.GHHero.currentIndex());
  rec('H14', 'The rotation stops while the tab is hidden',
      afterHidden === hiddenRun, `slide ${hiddenRun} → ${afterHidden}`);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(6600);
  const afterVisible = await page.evaluate(() => window.GHHero.currentIndex());
  rec('H15', 'It resumes when the tab is visible again', afterVisible !== afterHidden,
      `slide ${afterHidden} → ${afterVisible}`);

  /* ================================================= G. missing photo path */
  // a fresh reload of the same page: the broken slide must not exist yet, and
  // keeping one page alive avoids the sandbox request budget (see waitForApp)
  await boot(page);
  const broken = await page.evaluate(async () => {
    const slide = document.querySelectorAll('[data-hero-slide]')[4];
    slide.dataset.src = 'assets/img/does-not-exist.jpg';
    const mod = await import('./src/features/hero/hero-slideshow.js');
    mod.goTo(4);
    await new Promise((r) => setTimeout(r, 1200));
    const active = document.querySelector('.gh-hero-slide.is-active');
    return {
      index: mod.currentIndex(),
      failed: active.classList.contains('is-failed'),
      hasImg: !!active.querySelector('img'),
      background: getComputedStyle(active).backgroundImage,
      titleColor: getComputedStyle(document.querySelector('.gh-hero-title')).color
    };
  });
  rec('H16', 'A missing photo falls back to the slide gradient, text stays readable',
      broken.index === 4 && broken.failed && !broken.hasImg
        && /gradient/.test(broken.background) && /rgb/.test(broken.titleColor),
      `slide ${broken.index} · failed=${broken.failed} · img=${broken.hasImg}`);

  // H16 deliberately requests a missing file, so its own 404 is expected; the
  // error arrays are reset here so H22/H23 only judge everything after it.
  pageErrors.length = 0;
  consoleErrors.length = 0;

  /* ============================================ H. existing functions intact */
  await page.evaluate(() => window.GHHero.goTo(0));
  await page.click('.gh-sos-btn');
  await page.waitForTimeout(700);
  const sos = await page.evaluate(() => ({
    sheet: !!document.querySelector('#ghSheetBody')?.innerText.trim(),
    text: (document.querySelector('#ghSheetBody')?.innerText || '').slice(0, 80)
  }));
  rec('H17', 'SOS still opens its emergency sheet from the hero page',
      sos.sheet && /112|dharura|msaada/i.test(sos.text), sos.text.replace(/\n/g, ' ').slice(0, 60));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  const nav = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll('#appBottomNav .nav-tab-btn, #appBottomNav .nav-sos-slot')]
      .map((b) => b.innerText.trim() || b.getAttribute('aria-label') || ''),
    quick: document.querySelectorAll('.gh-qa').length,
    heroVisible: document.querySelector('.gh-hero').getBoundingClientRect().height > 200
  }));
  rec('H18', 'Fixed navigation and the six quick actions are untouched',
      nav.tabs.length === 5 && nav.tabs.some((t) => /SOS/.test(t))
        && nav.quick === 6 && nav.heroVisible,
      `${nav.tabs.length} tabs · ${nav.quick} quick actions`);

  /* ======================================================== I. responsive */
  const sizes = [[320, 720], [390, 844], [768, 900], [1280, 900]];
  const layout = [];
  for (const [w, h] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await boot(page);
    layout.push(await page.evaluate((vp) => {
      const hero = document.querySelector('.gh-hero').getBoundingClientRect();
      const copy = document.querySelector('.gh-hero-copy').getBoundingClientRect();
      const ctl = document.querySelector('.gh-hero-controls').getBoundingClientRect();
      const overlap = !(copy.right < ctl.left || ctl.right < copy.left || copy.bottom < ctl.top || ctl.bottom < copy.top);
      return {
        vp,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        heroH: Math.round(hero.height),
        overlap,
        titleFits: document.querySelector('.gh-hero-title').getBoundingClientRect().bottom <= hero.bottom + 1
      };
    }, w));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  rec('H19', 'Hero fits 320 / 390 / 768 / 1280 with no overflow and no clipped title',
      layout.every((l) => !l.overflow && l.titleFits && !l.overlap && l.heroH >= 200),
      layout.map((l) => `${l.vp}:${l.heroH}px${l.overlap ? ' overlap' : ''}`).join(' · '));

  /* ================================================== J. reduced motion */
  // emulate on the live page: a separate browser page load exhausted the
  // sandbox's request budget (ERR_INSUFFICIENT_RESOURCES on the module graph)
  const rm = page;
  await rm.emulateMedia({ reducedMotion: 'reduce' });
  await boot(rm);
  const rmStart = await rm.evaluate(() => ({
    index: window.GHHero.currentIndex(),
    paused: window.GHHero.isPaused(),
    transition: getComputedStyle(document.querySelector('[data-hero-slide]')).transitionDuration
  }));
  await rm.waitForTimeout(6600);
  const rmAfter = await rm.evaluate(() => window.GHHero.currentIndex());
  rec('H20', 'prefers-reduced-motion: a calm static hero, no automatic rotation',
      rmStart.paused === true && rmAfter === rmStart.index
        && (parseFloat(rmStart.transition) === 0 || rmStart.transition === '0s'),
      `paused ${rmStart.paused} · slide ${rmStart.index} → ${rmAfter} · transition ${rmStart.transition}`);

  const rmDot = await rm.evaluate(async () => {
    document.querySelector('[data-hero-dot="3"]').click();
    await new Promise((r) => setTimeout(r, 300));
    return window.GHHero.currentIndex();
  });
  rec('H21', 'Reduced motion still lets the reader pick a photo manually', rmDot === 3, `slide ${rmDot}`);
  await rm.emulateMedia({ reducedMotion: 'no-preference' });

  rec('H22', 'No page errors during the hero suite', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  // the sandbox has 2 GB RAM; Chromium can refuse a module fetch with
  // net::ERR_INSUFFICIENT_RESOURCES even though the retry succeeds. That is a
  // browser resource limit, not an app error — real 404s and JS errors still fail.
  const appConsoleErrors = consoleErrors.filter((t) => !/ERR_INSUFFICIENT_RESOURCES/.test(t));
  rec('H23', 'No console errors during the hero suite',
      appConsoleErrors.length === 0, appConsoleErrors.slice(0, 2).join(' | '));

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
