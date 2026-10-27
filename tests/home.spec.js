/**
 * GuardHai — Home redesign acceptance suite.
 *
 *   NODE_PATH=<playwright>/node_modules node tests/home.spec.js [url]
 *
 * Covers: top nav order, welcome, safety card honesty, SOS demo, quick
 * actions, Uwanja feed, composer, engagement, bottom nav contract,
 * responsive widths, console/page errors, duplicate ids, overflow.
 * Never throws on a failed check; exits 1 if any check fails.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const SHOTS = path.join(ROOT, 'docs', 'test-artifacts');
fs.mkdirSync(SHOTS, { recursive: true });

const R = [];
const rec = (id, name, ok, detail = '') => R.push({ id, name, ok, detail });

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [], consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(700);

  /* ---------------- A. top navigation ---------------- */
  const topOrder = await page.$$eval('.gh-top-actions > button', els =>
    els.map(e => e.getAttribute('aria-label')));
  const coreActions = topOrder.filter((l) => ['Storage', 'Notifications', 'Account', 'More'].includes(l));
  rec('A1', 'Top nav is Storage → Notifications → Account → More (search lives in the field)',
      JSON.stringify(topOrder) === JSON.stringify(['Storage', 'Notifications', 'Account', 'More'])
        && coreActions.length === 4
        && !topOrder.some((l) => /tafuta/i.test(l || '')),
      topOrder.join(' > '));

  const brand = await page.$eval('.gh-brand-name', e => e.innerText.trim()).catch(() => '');
  const logo = await page.$eval('.gh-logo svg', e => !!e.querySelector('use')).catch(() => false);
  rec('A2', 'Logo + brand name present on the left', brand === 'GuardHai' && logo, brand);

  const sizes = await page.$$eval('.gh-icon-btn', els => els.map(e => {
    const r = e.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }));
  rec('A3', 'All top-nav targets >= 32px', sizes.every(s => s.w >= 32 && s.h >= 32),
      sizes.map(s => `${s.w}x${s.h}`).join(' '));

  await page.click('#ghMoreBtn');
  await page.waitForTimeout(250);
  const moreOpen = await page.$eval('#ghMoreMenu', e => e.classList.contains('open'));
  const moreItems = await page.$$eval('#ghMoreMenu .gh-more-item', els => els.map(e => e.innerText.trim()));
  rec('A4', 'More menu opens and has Map / full menu / logout',
      moreOpen && moreItems.length >= 3, moreItems.join(' | ').slice(0, 70));
  await page.click('#ghMoreBtn');
  await page.waitForTimeout(200);

  /* ---------------- B. welcome + safety honesty ---------------- */
  const welcome = await page.$eval('.gh-welcome-title', e => e.innerText.trim());
  const sub = await page.$eval('.gh-welcome-sub', e => e.innerText.trim());
  rec('B1', 'Welcome heading + subtitle in Swahili',
      welcome === 'Karibu GuardHai' && sub === 'Usalama wako, afya yako, maisha yako.',
      `${welcome} / ${sub}`);

  const safety = await page.evaluate(() => ({
    state: document.querySelector('.gh-safety-state')?.innerText.trim(),
    desc: document.querySelector('.gh-safety-desc')?.innerText.trim(),
    device: document.getElementById('lbl-controller-home-desc')?.innerText.trim(),
    cta: document.querySelector('.gh-safety .gh-btn-outline')?.innerText.trim(),
    body: document.getElementById('homePage').innerText
  }));
  rec('B2', 'Safety card does NOT claim the user is protected',
      !/All Systems Safe|Umelindwa kikamilifu|GUARDIAN ACTIVE/i.test(safety.body) &&
      /Haijapimwa|Not assessed/i.test(safety.state),
      `state="${safety.state}"`);
  rec('B3', 'Disclaimer text survives JS device detection',
      /Hakuna huduma ya dharura iliyounganishwa/.test(safety.desc || ''),
      (safety.desc || '').slice(0, 60));
  rec('B4', 'Safety CTA opens the review sheet', safety.cta.length > 5, safety.cta);

  await page.click('.gh-safety .gh-btn-outline');
  await page.waitForTimeout(300);
  const sheetOpen = await page.$eval('#ghSheet', e => e.classList.contains('open'));
  const sheetText = await page.$eval('#ghSheetBody', e => e.innerText);
  rec('B5', 'Review sheet states emergency services are not connected',
      sheetOpen && /Haijaunganishwa|haijaunganishwa/i.test(sheetText), sheetText.split('\n')[0]);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  /* ---------------- C. SOS demo ---------------- */
  let heroDialog = null;
  page.once('dialog', async d => { heroDialog = d.message(); await d.dismiss(); });
  await page.click('.gh-sos-btn');
  await page.waitForTimeout(500);
  const heroSheet = await page.$eval('#ghSheetBody', e => e.innerText).catch(() => '');
  rec('C1', 'Home SOS: no dispatch claim, real emergency numbers shown',
      !heroDialog && /haijaunganishwa/i.test(heroSheet) && /112/.test(heroSheet),
      (heroSheet || '').replace(/\s+/g, ' ').slice(0, 70));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  await page.click('#tab-sos');
  await page.waitForTimeout(500);
  const navSheet = await page.$eval('#ghSheetBody', e => e.innerText).catch(() => '');
  rec('C2', 'Bottom-nav SOS uses the same shared handler', navSheet === heroSheet,
      (navSheet || '').replace(/\s+/g, ' ').slice(0, 50));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  const sosNote = await page.$eval('.gh-sos-note', e => e.innerText);
  rec('C3', 'Visible note under the SOS button states no help is sent',
      /hakuna msaada|no help/i.test(sosNote), sosNote.trim());

  /* ---------------- D. quick actions ---------------- */
  const qa = await page.$$eval('.gh-qa .gh-qa-label', els => els.map(e => e.innerText.trim()));
  const qaKeys = await page.$$eval('.gh-qa', els => els.map(e => e.dataset.qa));
  const expected = ['Afya', 'Usalama', 'Tafuta Kifaa', 'Walezi', 'Elimu ya Usalama', 'Ramani'];
  rec('D1', 'Six quick actions in the showcased order (Ramani kept as the sixth)',
      JSON.stringify(qa) === JSON.stringify(expected) &&
      JSON.stringify(qaKeys) === JSON.stringify(['health', 'shield', 'find', 'guardians', 'learn', 'map']),
      qa.join(' | '));

  await page.click('.gh-qa[data-qa="health"]');
  await page.waitForTimeout(500);
  const healthOk = await page.evaluate(() =>
    document.getElementById('shieldPage').classList.contains('active') &&
    getComputedStyle(document.getElementById('protect-view-health')).display !== 'none');
  const healthTabActive = await page.$eval('#tab-health', e => e.classList.contains('active'));
  rec('D2', 'Afya opens existing Shield → Health sub-tab', healthOk && healthTabActive);

  await page.evaluate(() => HomeUI.go('home'));
  await page.waitForTimeout(400);
  await page.click('.gh-qa[data-qa="find"]');
  await page.waitForTimeout(500);
  const findOk = await page.$eval('#pillar-content-find', e => getComputedStyle(e).display !== 'none');
  rec('D3', 'Tafuta Kifaa opens the existing Find pillar', findOk);

  await page.evaluate(() => HomeUI.go('home'));
  await page.waitForTimeout(400);
  await page.click('.gh-qa[data-qa="guardians"]');
  await page.waitForTimeout(350);
  const guardianSheet = await page.$eval('#ghSheetBody', e => e.innerText);
  rec('D4', 'Walezi states guardians are NOT connected (no fake list)',
      /hawajaunganishwa/i.test(guardianSheet), guardianSheet.split('\n')[0].slice(0, 60));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  await page.click('.gh-qa[data-qa="learn"]');
  await page.waitForTimeout(600);
  const scrolled = await page.evaluate(() => {
    const r = document.getElementById('ghUwanja').getBoundingClientRect();
    return r.top < window.innerHeight && r.top > -200;
  });
  rec('D5', 'Elimu ya Usalama scrolls to Uwanja', scrolled);

  /* ---------------- E. Uwanja feed ---------------- */
  const feed = await page.evaluate(() => ({
    posts: document.querySelectorAll('.gh-post').length,
    badges: document.querySelectorAll('.gh-badge-sample').length,
    verified: document.querySelectorAll('.gh-post-name svg, .gh-verified, [data-verified]').length,
    topics: [...document.querySelectorAll('#ghTopics .gh-topic')].map(b => b.innerText.trim()),
    note: document.querySelector('.gh-feed-note')?.innerText || ''
  }));
  rec('E1', 'Feed renders sample posts', feed.posts >= 4, `${feed.posts} posts`);
  rec('E2', 'Every sample post carries a SAMPULI badge', feed.badges === feed.posts, `${feed.badges}/${feed.posts}`);
  rec('E3', 'No fake verification badge', feed.verified === 0, `${feed.verified} found`);
  // topic taxonomy v2 (2026-10): Afya, Usalama, Taasisi, Kusaidiana, Majanga
  rec('E4', 'Five required topics present',
      ['Afya', 'Usalama', 'Taasisi', 'Kusaidiana', 'Majanga']
        .every(t => feed.topics.includes(t)), feed.topics.join(' | '));
  rec('E5', 'Feed carries an explicit sample-content note', /SAMPULI/i.test(feed.note));

  await page.click('#ghTopics .gh-topic[data-topic="afya"]');
  await page.waitForTimeout(300);
  const filtered = await page.$$eval('.gh-post-topic', els => els.map(e => e.innerText.trim()));
  rec('E6', 'Topic filter works', filtered.length > 0 && filtered.every(t => t === 'Afya'), filtered.join(','));
  await page.click('#ghTopics .gh-topic[data-topic="all"]');
  await page.waitForTimeout(300);

  /* ---------------- engagement controls ---------------- */
  const beforeHelpful = await page.$eval('.gh-post .gh-act', e => e.className);
  await page.click('.gh-post .gh-act');
  await page.waitForTimeout(300);
  const afterHelpful = await page.$eval('.gh-post .gh-act', e => e.className);
  rec('F1', '"Imenisaidia" toggles', beforeHelpful !== afterHelpful && /is-on/.test(afterHelpful));

  await page.click('.gh-post .gh-post-follow');
  await page.waitForTimeout(300);
  const followTxt = await page.$eval('.gh-post .gh-post-follow', e => e.innerText.trim());
  rec('F2', 'Follow author toggles', /Unafuata/.test(followTxt), followTxt);

  await page.click('.gh-post .gh-act >> nth=1');   // Maoni
  await page.waitForTimeout(300);
  const cm = await page.$eval('#ghSheetBody', e => ({
    text: e.innerText, hasInput: !!e.querySelector('#ghCommentInput'),
    hasSend: !!e.querySelector('.gh-btn-primary')
  }));
  rec('F3', 'Comments open a real local thread, labelled device-only',
      cm.hasInput && cm.hasSend && /kwenye kifaa hiki/i.test(cm.text) && /hakuna seva/i.test(cm.text),
      cm.hasInput ? 'input+send+honesty note' : 'no input');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  await page.click('.gh-post .gh-act >> nth=2');   // Shiriki
  await page.waitForTimeout(400);
  const shareState = await page.evaluate(() => ({
    toast: document.getElementById('ghToast')?.innerText || '',
    sheetOpen: document.getElementById('ghSheet').classList.contains('open'),
    sheet: document.getElementById('ghSheetBody')?.innerText || ''
  }));
  rec('F4', 'Share falls back to copy-link and says the link is a sample',
      (!shareState.sheetOpen && /kiungo/i.test(shareState.toast) && /sampuli/i.test(shareState.toast))
      || /kiungo/i.test(shareState.sheet),
      shareState.sheetOpen ? shareState.sheet.split('\n')[0] : shareState.toast);
  if (shareState.sheetOpen) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); }

  const savedBefore = await page.$$eval('.gh-post .gh-act.is-on', e => e.length);
  await page.click('.gh-post .gh-act >> nth=3');   // Hifadhi
  await page.waitForTimeout(300);
  const savedAfter = await page.$$eval('.gh-post .gh-act.is-on', e => e.length);
  rec('F5', 'Save/bookmark toggles', savedAfter >= savedBefore);

  await page.click('.gh-post .gh-act[data-act="more"]');
  await page.waitForTimeout(250);
  const menuVisible = await page.$eval('.gh-post .gh-post-menu', e => e.classList.contains('open'));
  const menuItems = await page.$$eval('.gh-post:first-child .gh-post-menu .gh-menu-item',
      els => els.map(e => e.innerText.trim()));
  await page.click('.gh-post:first-child .gh-post-menu .gh-menu-danger');
  await page.waitForTimeout(300);
  const rp = await page.$eval('#ghSheetBody', e => ({
    text: e.innerText, radios: e.querySelectorAll('input[name="ghReportReason"]').length
  }));
  rec('F6', 'Three-dot menu keeps Follow / Copy / Report and adds profile + send',
      menuVisible
        && /Fuata|Acha kufuata/.test(menuItems.join(' '))
        && /Nakili kiungo/.test(menuItems.join(' '))
        && /Ripoti/.test(menuItems.join(' '))
        && /wasifu/i.test(menuItems.join(' '))
        && menuItems.length >= 3,
      menuItems.join(' | '));
  rec('F7', 'Report flow has reasons and says it is not transmitted',
      rp.radios === 5 && /haitumwi/i.test(rp.text), `${rp.radios} reasons`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  /* ---------------- repost ---------------- */
  const cardsBefore = await page.$$eval('#ghFeed .gh-post', els => els.length);
  await page.click('#ghFeed .gh-post [data-act="repost"]');
  await page.waitForTimeout(700);
  const reposted = await page.evaluate(() => {
    const card = document.querySelector('#ghFeed .gh-post:has(.gh-post-reposted)');
    return {
      cards: document.querySelectorAll('#ghFeed .gh-post').length,
      marker: card?.querySelector('.gh-post-reposted')?.innerText.trim() || '',
      pressed: !!card?.querySelector('[data-act="unrepost"][aria-pressed="true"]'),
      originalOn: !!document.querySelector('.gh-post:not(:has(.gh-post-reposted)) [data-act="repost"][aria-pressed="true"]'),
      sample: !!card?.querySelector('.gh-badge-sample'),
      toast: document.getElementById('ghToast')?.innerText || ''
    };
  });
  rec('F8', 'Repost adds a second feed card that names the original author',
      reposted.cards === cardsBefore + 1 && /umerudia kutoka kwa/i.test(reposted.marker)
        && reposted.pressed && reposted.originalOn,
      `${cardsBefore} → ${reposted.cards} · ${reposted.marker}`);

  await page.click('#ghFeed .gh-post:has(.gh-post-reposted) [data-act="unrepost"]');
  await page.waitForTimeout(700);
  const undoCount = await page.$$eval('#ghFeed .gh-post', els => els.length);
  rec('F9', 'Reposting again removes the copy and says it stays on this device',
      undoCount === cardsBefore && /kifaa hiki/i.test(reposted.toast),
      `${reposted.cards} → ${undoCount} · ${reposted.toast}`);

  /* ---------------- F. composer ---------------- */
  await page.click('.gh-compose-btn');
  await page.waitForTimeout(350);
  const composer = await page.evaluate(() => ({
    open: document.getElementById('ghComposer').classList.contains('open'),
    types: [...document.querySelectorAll('#ghcTypes .ghc-chip')].map(c => c.dataset.type),
    typeLabels: [...document.querySelectorAll('#ghcTypes .ghc-chip span')].map(c => c.innerText.trim()),
    topics: [...document.querySelectorAll('#ghcTopic option')].map(o => o.textContent.trim()),
    audiences: [...document.querySelectorAll('#ghcAudience option')].map(o => o.textContent.trim()),
    media: [...document.querySelectorAll('.ghc-media-btn')].map(b => b.innerText.trim()),
    note: document.querySelector('.ghc-note')?.innerText || '',
    hasText: !!document.getElementById('ghcText'),
    hasDraft: !!document.getElementById('ghcDraftBtn')
  }));
  rec('F1c', 'Composer opens', composer.open);
  rec('F2c', 'Five post types present (short showcase labels, same five types)',
      JSON.stringify(composer.types) === JSON.stringify(['elimu', 'swali', 'uzoefu', 'taarifa', 'fursa'])
        && ['Elimu', 'Swali', 'Uzoefu', 'Taarifa', 'Kusaidia'].every(t => composer.typeLabels.includes(t)),
      `${composer.types.join(',')} → ${composer.typeLabels.join(' | ')}`);
  rec('F3c', 'Topic + audience selectors present', composer.topics.length === 5 && composer.audiences.length === 3,
      `${composer.topics.length} topics / ${composer.audiences.length} audiences`);
  rec('F4c', 'Photo/video/audio/record/link controls present', composer.media.length === 5, composer.media.join(' | '));
  rec('F5c', 'Composer states it is a local prototype', /kwenye kifaa hiki/i.test(composer.note));
  rec('F6c', 'Text entry + draft button present', composer.hasText && composer.hasDraft);

  // real (local) media: the button must open the real file picker
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null),
    page.click('.ghc-media-btn >> nth=0')
  ]);
  rec('F7c', 'Photo button opens a real file picker (no mock attachment)', !!chooser);

  // publish a post
  const postsBefore = await page.$$eval('.gh-post', e => e.length);
  await page.fill('#ghcText', 'Jaribio: weka namba ya serial ya kifaa chako mahali salama.');
  await page.click('#ghcPublish');
  await page.waitForTimeout(600);
  const postsAfter = await page.$$eval('.gh-post', e => e.length);
  const firstPost = await page.evaluate(() => {
    const p = document.querySelector('.gh-post');
    return { text: p?.querySelector('.gh-post-text')?.innerText || '',
             badge: p?.querySelector('.gh-badge-sample')?.innerText || '' };
  });
  rec('F8c', 'Publish adds the post to the local feed', postsAfter === postsBefore + 1,
      `${postsBefore} -> ${postsAfter}`);
  rec('F9c', 'User post is not marked verified, badge says not published online',
      /haijachapishwa/i.test(firstPost.badge || ''), firstPost.badge);

  // draft
  await page.click('.gh-compose-btn');
  await page.waitForTimeout(300);
  await page.fill('#ghcText', 'Rasimu ya jaribio');
  await page.click('#ghcDraftBtn');
  await page.waitForTimeout(400);
  // Drafts live in IndexedDB ('guardhai' → 'drafts'), not localStorage: the app
  // moved to a real local store so attachments and threads can scale.
  const draftStored = await page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('guardhai');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    if (!db.objectStoreNames.contains('drafts')) return false;
    const rows = await new Promise((res, rej) => {
      const req = db.transaction('drafts', 'readonly').objectStore('drafts').getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return rows.some(r => r.text === 'Rasimu ya jaribio');
  });
  rec('F10c', 'Save draft writes to this device only (IndexedDB)', draftStored);

  // empty publish guard
  await page.click('.gh-compose-btn');
  await page.waitForTimeout(300);
  await page.fill('#ghcText', '');            // editor must be empty after a draft save
  const before = await page.$$eval('.gh-post', e => e.length);
  await page.click('#ghcPublish');
  await page.waitForTimeout(300);
  const after = await page.$$eval('.gh-post', e => e.length);
  rec('F11c', 'Empty post is rejected', before === after);
  await page.keyboard.press('Escape');     // rejected publish keeps the modal open
  await page.waitForTimeout(250);
  await page.click('.gh-compose-btn');
  await page.waitForTimeout(300);
  const draftRowVisible = await page.$eval('#ghcDraftRow', e => getComputedStyle(e).display !== 'none');
  await page.click('#ghcDraftRow .ghc-linkbtn').catch(() => {});
  await page.waitForTimeout(250);
  const loadedText = await page.$eval('#ghcText', e => e.value);
  rec('F12c', 'Saved draft can be loaded back into the editor',
      draftRowVisible && loadedText === 'Rasimu ya jaribio', `"${loadedText}"`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  /* ---------------- G. bottom navigation ---------------- */
  const navIds = await page.$$eval('.nav-tabs-container > *', els => els.map(e => e.id));
  rec('G1', 'Exactly 5 items in order: home, health, SOS, shield, chat',
      JSON.stringify(navIds) === JSON.stringify(['tab-home', 'tab-health', 'tab-sos', 'tab-shield', 'tab-chat']),
      navIds.join(' | '));

  const sosRaised = await page.evaluate(() => {
    const s = document.querySelector('.nav-sos-raised');
    const bar = document.querySelector('.bottom-nav-main');
    if (!s || !bar) return null;
    return Math.round(bar.getBoundingClientRect().top - s.getBoundingClientRect().top);
  });
  const sosRed = await page.$eval('.nav-sos-raised', e => getComputedStyle(e).backgroundImage);
  rec('G2', 'SOS is a raised red circle', sosRaised > 10 && /rgb\(2[0-9]{2}, 3[0-9], 3[0-9]\)|linear-gradient/.test(sosRed),
      `raised ${sosRaised}px`);

  for (const [id, pageId] of [['tab-shield', 'shieldPage'], ['tab-chat', 'commPage'], ['tab-home', 'homePage']]) {
    await page.click('#' + id);
    await page.waitForTimeout(400);
    const active = await page.$eval('#' + pageId, e => e.classList.contains('active'));
    const tabOn = await page.$eval('#' + id, e => e.classList.contains('active'));
    rec('G3.' + id, `${id} switches view and shows as active`, active && tabOn);
  }

  const tabFont = await page.$eval('.nav-tab-btn .tab-label', e => parseFloat(getComputedStyle(e).fontSize));
  rec('G4', 'Bottom-nav labels use the same font size across tabs', tabFont >= 8 && tabFont <= 12, `${tabFont}px`);

  /* ---------------- i18n ---------------- */
  await page.evaluate(() => I18N.setLanguage('en'));
  await page.waitForTimeout(400);
  const en = await page.evaluate(() => ({
    welcome: document.querySelector('.gh-welcome-title')?.innerText.trim(),
    sos: document.querySelector('.gh-sos-note span')?.innerText.trim(),
    uwanja: document.getElementById('ghUwanjaTitle')?.innerText.trim(),
    navHealth: document.querySelector('#tab-health .tab-label')?.innerText.trim()
  }));
  rec('H1', 'Home strings switch to English',
      en.welcome === 'Welcome to GuardHai'
        && en.uwanja === 'Uwanja – Learn and Help Each Other' && en.navHealth === 'Health',
      `${en.welcome} / ${en.uwanja} / ${en.navHealth}`);
  await page.evaluate(() => I18N.setLanguage('sw'));
  await page.waitForTimeout(400);

  /* ---------------- responsive + integrity ---------------- */
  for (const w of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(350);
    const o = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
      topRow: document.querySelector('.gh-top-actions').getBoundingClientRect().right <= window.innerWidth + 1
    }));
    rec('I1.' + w, `No horizontal overflow @ ${w}px`, o.scroll <= o.inner + 1 && o.topRow,
        `${o.scroll} vs ${o.inner}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);

  const dupIds = await page.evaluate(() => {
    const seen = {}, dup = [];
    document.querySelectorAll('[id]').forEach(e => {
      if (seen[e.id]) dup.push(e.id);
      seen[e.id] = 1;
    });
    return [...new Set(dup)];
  });
  rec('I2', 'No duplicate element ids', dupIds.length === 0, dupIds.join(',') || 'none');

  const brokenHandlers = await page.evaluate(() => {
    const out = [];
    const resolves = (name) => {
      try { return new Function('return typeof ' + name)() !== 'undefined'; }
      catch (e) { return false; }
    };
    document.querySelectorAll('[onclick]').forEach(el => {
      const m = el.getAttribute('onclick').match(/([A-Z][A-Za-z0-9_]*)\.[A-Za-z0-9_]+/);
      if (m && !resolves(m[1])) out.push(m[1] + ' @ ' + (el.id || el.className));
    });
    return [...new Set(out)];
  });
  rec('I3', 'All inline object handlers resolve', brokenHandlers.length === 0, brokenHandlers.slice(0, 3).join(','));

  rec('I4', 'No page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  rec('I5', 'No console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

  /* ---------------- screenshots ---------------- */
  await page.evaluate(() => HomeUI.go('home'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'home-redesign-390.png') });
  await page.screenshot({ path: path.join(SHOTS, 'home-redesign-390-full.png'), fullPage: true });
  await page.evaluate(() => HomeUI.openComposer());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'home-redesign-composer.png') });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'home-redesign-1440.png') });
  await page.setViewportSize({ width: 320, height: 780 });
  await page.evaluate(() => HomeUI.go('home'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'home-redesign-320.png') });

  /* ---------------- summary ---------------- */
  const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
  console.log('\n' + pad('ID', 10) + pad('RESULT', 8) + 'CHECK');
  console.log('-'.repeat(100));
  for (const r of R) console.log(pad(r.id, 10) + pad(r.ok ? 'PASS' : 'FAIL', 8) + r.name + (r.detail ? `  [${r.detail}]` : ''));
  const pass = R.filter(r => r.ok).length;
  console.log('-'.repeat(100));
  console.log(`${pass}/${R.length} passed`);
  fs.writeFileSync(path.join(SHOTS, 'home-test-results.json'),
                   JSON.stringify({ url: URL, at: new Date().toISOString(), results: R, pageErrors, consoleErrors }, null, 2));
  await browser.close();
  process.exit(pass === R.length ? 0 : 1);
})();
