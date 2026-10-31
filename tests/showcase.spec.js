/**
 * GuardHai — showcase design suite.
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/showcase.spec.js [url]
 *
 * Covers the second design pass: the photo hero, the SOS card with its DEMO
 * marker, circular quick actions, post type badges, the media warning band, the
 * photo profile with four tabs, the local photo picker, in-device search and the
 * composer sheet header. Every check also asserts that the honesty rules from
 * the earlier passes still hold.
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const R = [];
const rec = (id, name, ok, detail = '') => R.push({ id, name, ok, detail });

async function boot(page) {
  await page.goto(URL, { waitUntil: 'load' });
  // wait for the globals this suite drives instead of a fixed guess: on a busy
  // machine the modules can still be evaluating after 1.2s
  await page.waitForFunction(() => typeof AuthActions !== 'undefined' && typeof AuthFlow !== 'undefined',
    { timeout: 25000 });
  await page.waitForTimeout(300);
  await page.evaluate(() => AuthFlow.goTo('landing'));
  await page.waitForTimeout(250);
  await page.evaluate(() => AuthFlow.goTo('register'));
  await page.waitForTimeout(350);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(1400);
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const consoleErrors = [];
  const requests = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('request', (r) => requests.push(r.url()));
  // Search must not talk to a server. Re-decoded local images/assets are not data traffic.
  const ASSET = /\.(png|jpe?g|webp|gif|svg|css|js|mjs|woff2?|ttf|ico)(\?|$)/i;
  const dataRequests = () => requests.filter((u) => !ASSET.test(u) && !u.startsWith('data:'));

  await boot(page);

  /* ------------------------------------------------------------- A. header */
  const head = await page.evaluate(() => {
    const nav = document.getElementById('appTopNav');
    const btns = [...nav.querySelectorAll('.gh-top-actions > button')].map((b) => b.getAttribute('aria-label'));
    return {
      brand: nav.querySelector('.gh-brand-name')?.innerText.trim(),
      btns,
      overflow: nav.scrollWidth > window.innerWidth + 1,
      logo: nav.querySelector('.gh-logo .ic use')?.getAttribute('href')
    };
  });
  rec('S1', 'Header: brand + the four original actions, no overflow',
      head.brand === 'GuardHai'
        && JSON.stringify(head.btns) === JSON.stringify(['Storage', 'Notifications', 'Account', 'More'])
        && !head.overflow,
      `${head.brand} · ${head.btns.join(' > ')}`);

  /* --------------------------------------------------------------- B. hero */
  const hero = await page.evaluate(() => {
    const el = document.querySelector('.gh-hero');
    const img = el?.querySelector('img');
    return {
      present: !!el,
      src: img?.getAttribute('src') || '',
      natural: img ? img.naturalWidth : 0,
      title: el?.querySelector('.gh-hero-title')?.innerText.trim(),
      sub: el?.querySelector('.gh-hero-sub')?.innerText.trim(),
      meta: el?.querySelector('.gh-hero-meta')?.innerText.trim()
    };
  });
  rec('S2', 'Photo hero renders a real local image with the two-line promise',
      hero.present && hero.src.startsWith('assets/img/') && hero.natural > 0
        // the hero grew a slideshow: the promise is now a question and the sub
        // line ends with a full stop (copy fixed in the slideshow brief)
        && hero.title === 'Tayari kwa dharura?' && /kulinda maisha/i.test(hero.sub),
      `${hero.src} (${hero.natural}px) · ${hero.title}`);

  /* ---------------------------------------------------------------- C. SOS */
  const sos = await page.evaluate(() => {
    const card = document.querySelector('.gh-sos-card');
    const btn = card?.querySelector('.gh-sos-btn');
    const box = btn?.getBoundingClientRect();
    return {
      present: !!card,
      round: box ? Math.round(box.width) === Math.round(box.height) : false,
      size: box ? Math.round(box.width) : 0,
      title: card?.querySelector('.gh-sos-copy b')?.innerText.trim(),
      text: card?.innerText || '',
      demo: !!card?.querySelector('.gh-demo-chip'),
      note: document.querySelector('.gh-sos-note')?.innerText.trim() || ''
    };
  });
  rec('S3', 'SOS is a red circular target with a visible DEMO marker',
      sos.present && sos.round && sos.size >= 64 && sos.demo
        && /Dharura/i.test(sos.title) && /haitumwi/i.test(sos.text),
      `${sos.size}px · ${sos.title}`);
  rec('S4', 'SOS still states that no help is sent', /hakuna msaada/i.test(sos.note), sos.note.slice(0, 54));

  await page.click('.gh-sos-btn');
  await page.waitForTimeout(500);
  const sosSheet = await page.$eval('#ghSheetBody', (e) => e.innerText);
  rec('S5', 'SOS sheet gives real numbers and repeats that nothing is dispatched',
      /112/.test(sosSheet) && /haijaunganishwa/i.test(sosSheet), sosSheet.split('\n')[0].slice(0, 48));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  /* ------------------------------------------------------- D. quick actions */
  const qa = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.gh-qa')];
    return items.map((b) => {
      const ico = b.querySelector('.gh-qa-ico');
      const r = ico.getBoundingClientRect();
      return {
        key: b.dataset.qa,
        label: b.querySelector('.gh-qa-label').innerText.trim(),
        round: Math.abs(r.width - r.height) < 2 && r.width >= 44,
        icon: !!b.querySelector('.gh-qa-ico use')
      };
    });
  });
  rec('S6', 'Six circular quick actions, every original destination kept',
      qa.length === 6 && qa.every((q) => q.round && q.icon)
        && ['health', 'shield', 'find', 'guardians', 'learn', 'map'].every((k) => qa.some((q) => q.key === k)),
      qa.map((q) => q.label).join(' | '));

  /* --------------------------------------------------------- E. feed cards */
  const feed = await page.evaluate(() => [...document.querySelectorAll('#ghFeed .gh-post')].map((p) => ({
    id: p.dataset.post,
    badge: p.querySelector('.gh-type-badge')?.innerText.trim(),
    badgeColor: getComputedStyle(p.querySelector('.gh-type-badge')).backgroundColor,
    alert: p.querySelector('.gh-media-alert')?.innerText.trim() || '',
    acts: [...p.querySelectorAll('.gh-act')].map((b) => b.getAttribute('aria-label')),
    tap: Math.min(...[...p.querySelectorAll('.gh-act')].map((b) => b.getBoundingClientRect().height)),
    photo: !!p.querySelector('.gh-post-avatar img')
  })));

  const byId = (id) => feed.find((f) => f.id === id) || {};
  const badgeOf = (id) => (byId(id).badge || '').toLowerCase();
  rec('S7', 'Every card carries a text type badge (colour is never the only cue)',
      feed.every((f) => (f.badge || '').length > 2 && f.badge !== '')
        && badgeOf('sample-disaster') === 'majanga' && badgeOf('sample-health') === 'afya'
        && badgeOf('sample-people') === 'taasisi' && badgeOf('sample-crime') === 'usalama',
      feed.slice(0, 5).map((f) => f.badge).join(' | '));

  rec('S8', 'Only the post with a warning shows the alert band, and it says sample',
      byId('sample-disaster').alert.includes('sampuli')
        && feed.filter((f) => f.alert).length === 1,
      byId('sample-disaster').alert.replace(/\s+/g, ' ').slice(0, 54));

  rec('S9', 'Six engagement actions per card, all labelled, all tappable',
      feed.every((f) => f.acts.length === 6 && f.tap >= 36)
        && ['Imenisaidia', 'Shiriki', 'Hifadhi', 'Rudia chapisho'].every((l) => feed[0].acts.includes(l)),
      `${feed[0].acts.join(' · ')} @${feed[0].tap}px`);

  rec('S10', 'Persona photos render in the feed when the profile has one',
      feed.some((f) => f.photo), `${feed.filter((f) => f.photo).length} of ${feed.length} cards`);

  /* ------------------------------------------------------------- F. search */
  const before = dataRequests().length;
  await page.click('#ghSearchBarOpen');
  await page.waitForTimeout(400);
  await page.fill('#ghSearchInput', 'mafuriko');
  await page.waitForTimeout(700);
  const search = await page.evaluate(() => ({
    hits: document.querySelectorAll('#ghFeed .gh-post').length,
    note: document.getElementById('ghSearchResults')?.innerText.trim() || '',
    sheet: document.getElementById('ghSheetBody')?.innerText || ''
  }));
  rec('S11', 'Search filters the feed in-device and reports an honest count',
      search.hits >= 1 && /imepatikana/i.test(search.note)
        && /kwenye kifaa hiki pekee/i.test(search.sheet)
        && dataRequests().length === before,
      `${search.hits} hit · ${search.note} · ${dataRequests().length - before} server calls`);
  await page.keyboard.press('Escape');
  await page.evaluate(() => HomeUI.searchFeed(''));
  await page.waitForTimeout(400);

  /* ------------------------------------------------------------ G. profile */
  await page.evaluate(() => {
    [...document.querySelectorAll('#ghFeed .gh-post-author')]
      .find((b) => b.dataset.profile === 'author-health')?.click();
  });
  await page.waitForSelector('#ghProfile.open');
  await page.waitForTimeout(700);

  const prof = await page.evaluate(() => ({
    cover: !!document.querySelector('.gh-profile-cover img.gh-profile-cover-img'),
    avatar: !!document.querySelector('.gh-profile-avatar img'),
    tabs: [...document.querySelectorAll('.gh-profile-tab')].map((t) => t.innerText.trim()),
    actions: [...document.querySelectorAll('.gh-profile-actions .gh-btn')].map((b) => b.className),
    pill: document.querySelector('.gh-verify-pill')?.innerText.trim() || '',
    stats: [...document.querySelectorAll('.gh-profile-stats b')].map((b) => b.innerText.trim())
  }));
  rec('S12', 'Profile has a photo cover, a photo avatar and four tabs',
      prof.cover && prof.avatar && prof.tabs.length === 4
        && prof.tabs.some((t) => /^Taarifa/.test(t)) && prof.tabs.some((t) => /^Picha/.test(t)),
      prof.tabs.join(' | '));
  rec('S13', 'Sample profile shows only the Sampuli state (no green verification pill)',
      /Sampuli/i.test(prof.pill) && !/^Uthibitisho wa taaluma$/m.test(prof.pill), prof.pill);

  await page.click('[data-profile-tab="photos"]');
  await page.waitForTimeout(400);
  const photos = await page.evaluate(() => ({
    tiles: document.querySelectorAll('.gh-photo-grid .gh-gal-item img').length,
    loaded: [...document.querySelectorAll('.gh-photo-grid img')].filter((i) => i.naturalWidth > 0).length
  }));
  rec('S14', 'Photos tab shows the real images that belong to the posts',
      photos.tiles >= 1 && photos.loaded === photos.tiles,
      `${photos.loaded}/${photos.tiles} loaded`);

  // the organisation persona publishes one institution notice
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.evaluate(() => HomeUI.openProfile('author-org'));
  await page.waitForSelector('#ghProfile.open');
  await page.waitForTimeout(600);
  await page.click('[data-profile-tab="notices"]');
  await page.waitForTimeout(400);
  const notices = await page.evaluate(() => ({
    posts: document.querySelectorAll('#ghProfilePanel .gh-post').length,
    badges: [...document.querySelectorAll('#ghProfilePanel .gh-type-badge')].map((b) => b.innerText.trim()),
    empty: /Hakuna taarifa/.test(document.getElementById('ghProfilePanel').innerText)
  }));
  rec('S15', 'Notices tab shows only the official notices of that profile',
      notices.posts === 1 && notices.badges.join('').toLowerCase() === 'taasisi' && !notices.empty,
      `${notices.posts} notice · ${notices.badges.join(',')}`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  /* ------------------------------------------------------ H. own profile */
  await page.evaluate(() => HomeUI.openMyProfile());
  await page.waitForSelector('#ghProfile.open');
  await page.waitForTimeout(400);
  await page.click('[data-profile-action="edit"]');
  await page.waitForTimeout(600);

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJUlEQVR4nGP8z8Dwn4EIwESMolGFlCgcVUiUwlGFlCgcVUiUQgAyDwQBAAAAAElFTkSuQmCC',
    'base64');
  await page.setInputFiles('#ghPeAvatarFile', { name: 'me.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(500);
  const preview = await page.evaluate(() => !!document.querySelector('#ghPeAvatarPreview img'));

  await page.fill('#ghPeName', 'Neema Mushi');
  await page.click('[data-pe-action="save"]');
  await page.waitForTimeout(900);
  const savedAvatar = await page.evaluate(() => {
    const img = document.querySelector('.gh-profile-avatar img');
    return { has: !!img, src: img?.getAttribute('src')?.slice(0, 22) || '' };
  });

  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => typeof AuthActions !== 'undefined',
    { timeout: 25000 });
  await page.waitForTimeout(400);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(1200);
  // the sheet renders async off storage; retry briefly instead of a single
  // fixed sleep (a reload on a busy machine can take a moment to settle)
  await page.waitForFunction(() => typeof HomeUI !== 'undefined', { timeout: 25000 });
  let opened = false;
  for (let i = 0; i < 20 && !opened; i++) {
    await page.evaluate(() => HomeUI.openMyProfile());
    await page.waitForTimeout(300);
    opened = await page.evaluate(() => !!document.querySelector('#ghProfile.open'));
  }
  rec('S-OPEN', 'Own profile reopens after a reload', opened, opened ? 'open' : 'did not open');
  const afterReload = await page.evaluate(() => ({
    has: !!document.querySelector('.gh-profile-avatar img'),
    name: document.querySelector('.gh-profile-name')?.innerText.trim()
  }));
  rec('S16', 'Photo picked from the device previews, saves and survives a reload',
      preview && savedAvatar.has && savedAvatar.src.startsWith('data:image')
        && afterReload.has && afterReload.name === 'Neema Mushi',
      `preview=${preview} · ${savedAvatar.src}… · reload=${afterReload.has}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  /* ----------------------------------------------------------- I. composer */
  await page.evaluate(() => HomeUI.openComposer());
  await page.waitForSelector('#ghComposer.open');
  await page.waitForTimeout(500);
  const comp = await page.evaluate(() => ({
    title: document.getElementById('ghcTitle')?.innerText.trim(),
    close: !!document.querySelector('.gh-compose-close'),
    publish: !!document.getElementById('ghcPublishTop'),
    types: [...document.querySelectorAll('#ghcTypes .ghc-chip')].map((c) => ({
      icon: !!c.querySelector('use'),
      label: c.querySelector('span')?.innerText.trim()
    })),
    notes: /kwenye kifaa hiki/i.test(document.querySelector('.ghc-note')?.innerText || '')
  }));
  rec('S17', 'Composer sheet: close + title + publish in the header, five icon type chips',
      comp.title === 'Tuma Chapisho' && comp.close && comp.publish
        && comp.types.length === 5 && comp.types.every((t) => t.icon && t.label) && comp.notes,
      `${comp.title} · ${comp.types.map((t) => t.label).join('/')}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  /* --------------------------------------------------------- J. responsive */
  const widths = [320, 360, 390, 430, 768, 1024];
  const overflow = [];
  const clipped = [];
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(320);
    const state = await page.evaluate(() => {
      const nav = document.getElementById('appTopNav');
      const actions = [...nav.querySelectorAll('.gh-top-actions > button')];
      const brand = nav.querySelector('.gh-brand-name');
      const brandVisible = brand && brand.getBoundingClientRect().width > 0;
      const last = actions[actions.length - 1].getBoundingClientRect();
      return {
        page: document.documentElement.scrollWidth > window.innerWidth + 1,
        nav: nav.scrollWidth > window.innerWidth + 1,
        // the wordmark may fold away below 360px, but the actions never may
        actionsClipped: last.right > window.innerWidth + 1 || last.left < 0,
        brandVisible: !!brandVisible
      };
    });
    if (state.page || state.nav || state.actionsClipped) clipped.push(w);
    if (w < 360 && !state.page && !state.nav && !state.actionsClipped) {
      // below 360px the logo alone carries the brand — that is the intended fold
    }
  }
  rec('S18', 'No horizontal overflow and no clipped header action from 320px to 1024px',
      clipped.length === 0,
      clipped.length ? `broken at ${clipped.join(', ')}` : `${widths.length} widths clean`);
  await page.setViewportSize({ width: 390, height: 844 });

  rec('S19', 'No page errors during the showcase suite', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  rec('S20', 'No console errors during the showcase suite', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

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
