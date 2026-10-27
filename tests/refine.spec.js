/**
 * GuardHai — refine suite (third design pass).
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/refine.spec.js [url]
 *
 * Covers what the second reference board changed on top of the showcase pass:
 * topic tiles, the new post-card head (author left, Fuata + ⋮ right), the
 * role-shaped profile info cards, the composer choice chips + attachment tiles,
 * the enlarged text limit, the keep-a-draft copy and the full action sheet.
 *
 * Every check is written so that a candidate who removes a control cannot pass
 * it: the five rail actions, the menu items and the handlers must all survive.
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const R = [];
const rec = (id, name, ok, detail = '') => R.push({ id, name, ok, detail });

async function boot(page) {
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
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

  await boot(page);

  /* ======================================================== A. topic tiles */
  const tiles = await page.evaluate(() => {
    const el = document.querySelector('#ghTopics');
    const items = [...el.querySelectorAll('.gh-topic')].map((b) => ({
      topic: b.dataset.topic,
      label: b.querySelector('.gh-topic-label')?.innerText.trim() || '',
      icon: b.querySelector('.gh-topic-ico use')?.getAttribute('href') || '',
      h: b.getBoundingClientRect().height
    }));
    const cs = getComputedStyle(el);
    return { items, cols: cs.gridTemplateColumns.split(' ').length, display: cs.display };
  });
  rec('R1', 'Six topic tiles, each with an icon and a readable label',
      tiles.items.length === 6 && tiles.items.every((t) => t.icon.startsWith('#i-') && t.label.length > 2),
      tiles.items.map((t) => t.label).join(' | '));
  rec('R2', 'Topic tiles are a touch-sized grid (>=3 columns, >=64px tall)',
      tiles.display === 'grid' && tiles.cols >= 3 && tiles.items.every((t) => t.h >= 64),
      `${tiles.cols} cols · min ${Math.min(...tiles.items.map((t) => Math.round(t.h)))}px`);

  await page.click('#ghTopics .gh-topic[data-topic="afya"]');
  await page.waitForTimeout(350);
  const filtered = await page.$$eval('#ghFeed .gh-post-topic', (els) => els.map((e) => e.innerText.trim()));
  rec('R3', 'Clicking a tile still filters the feed by that topic',
      filtered.length > 0 && filtered.every((t) => t === 'Afya'), filtered.join(','));
  await page.click('#ghTopics .gh-topic[data-topic="all"]');
  await page.waitForTimeout(350);

  /* ====================================================== B. post card head */
  const head = await page.evaluate(() => {
    const card = document.querySelector('#ghFeed .gh-post');
    const headEl = card.querySelector('.gh-post-head');
    const author = headEl.querySelector('.gh-post-author').getBoundingClientRect();
    const end = headEl.querySelector('.gh-post-headend').getBoundingClientRect();
    return {
      authorLeft: author.left,
      endRight: end.right,
      endInside: end.right <= author.right + end.width + 1,
      follow: !!headEl.querySelector('[data-follow-btn]'),
      dots: !!headEl.querySelector('.gh-post-more[data-act="more"]'),
      dotsIsNotAct: !headEl.querySelector('.gh-post-headend .gh-act'),
      railActs: [...card.querySelectorAll('.gh-post-actions .gh-act')].map((b) => b.dataset.act),
      chips: [...card.querySelectorAll('.gh-post-topline > *')].map((c) => c.className),
      avatar: card.querySelector('.gh-post-avatar img')?.naturalWidth || 0,
      time: card.querySelector('.gh-post-time')?.innerText.trim() || ''
    };
  });
  rec('R4', 'Author sits left, Fuata + ⋮ sit right (header keeps its own ⋮)',
      head.follow && head.dots && head.dotsIsNotAct
        && head.authorLeft < head.endRight,
      `author@${Math.round(head.authorLeft)} · end@${Math.round(head.endRight)}`);
  rec('R5', 'The six-button rail keeps its order under the new header control',
      JSON.stringify(head.railActs) === JSON.stringify(['helpful', 'comment', 'share', 'save', 'repost', 'more']),
      head.railActs.join(' > '));
  rec('R6', 'Chips row carries the type badge, the Sampuli badge and the topic',
      head.chips.length >= 3
        && head.chips.some((c) => c.includes('gh-type-badge'))
        && head.chips.some((c) => c.includes('gh-badge-sample'))
        && head.chips.some((c) => c.includes('gh-post-topic')),
      head.chips.join(' + '));
  rec('R7', 'Author photo and a time/place line render under the name',
      head.avatar > 0 && head.time.length > 0, `${head.avatar}px · ${head.time}`);

  /* ==================================================== C. action sheet */
  await page.click('#ghFeed .gh-post .gh-post-more');
  await page.waitForTimeout(250);
  const menu = await page.evaluate(() => ({
    open: !!document.querySelector('#ghFeed .gh-post-menu.open'),
    items: [...document.querySelectorAll('#ghFeed .gh-post:first-child .gh-post-menu [data-menu]')]
      .map((b) => b.dataset.menu)
  }));
  rec('R8', 'Header ⋮ opens the same menu and every original item is still there',
      menu.open && ['follow', 'profile', 'send', 'copy', 'report'].every((m) => menu.items.includes(m)),
      menu.items.join(' > '));

  await page.click('#ghFeed .gh-post:first-child .gh-post-menu [data-menu="all"]');
  await page.waitForTimeout(500);
  const sheet = await page.evaluate(() => {
    const el = document.getElementById('ghSheet');
    const items = [...el.querySelectorAll('.gh-actionsheet-item')].map((b) => ({
      act: b.dataset.sheetDo,
      label: b.querySelector('b')?.innerText.trim(),
      h: b.getBoundingClientRect().height
    }));
    return {
      open: el.classList.contains('open'),
      title: document.getElementById('ghSheetTitle')?.innerText.trim(),
      items,
      note: /kwenye kifaa hiki/i.test(document.getElementById('ghSheetBody')?.innerText || '')
    };
  });
  const wanted = ['helpful', 'comment', 'share', 'save', 'follow', 'send', 'profile', 'copy', 'report'];
  rec('R9', 'Vitendo vyote opens a sheet with all nine engagement actions',
      sheet.open && sheet.title === 'Vitendo vya chapisho'
        && wanted.every((w) => sheet.items.some((i) => i.act === w)),
      `${sheet.items.length} tiles · ${sheet.items.map((i) => i.label).join(', ')}`);
  rec('R10', 'Every action tile is a full-height touch target and the sheet is honest',
      sheet.items.every((i) => i.h >= 52) && sheet.note,
      `min ${Math.min(...sheet.items.map((i) => Math.round(i.h)))}px`);

  // toggle "Imenisaidia" from the sheet and confirm it persists to the rail state
  const firstId = await page.evaluate(() => document.querySelector('#ghFeed .gh-post').dataset.post);
  await page.click('.gh-actionsheet-item[data-sheet-do="helpful"]');
  await page.waitForTimeout(600);
  const helpful = await page.evaluate((id) => {
    const card = document.querySelector(`.gh-post[data-post="${id}"]`);
    return {
      sheetClosed: !document.getElementById('ghSheet').classList.contains('open'),
      on: card?.querySelector('[data-act="helpful"]')?.classList.contains('is-on')
    };
  }, firstId);
  rec('R11', 'Choosing an action in the sheet really runs that action',
      helpful.sheetClosed && helpful.on, `flag=${helpful.on}`);

  // put it back so later checks start from the same state
  await page.click(`.gh-post[data-post="${firstId}"] [data-act="helpful"]`);
  await page.waitForTimeout(400);

  /* ================================================== D. profile info cards */
  const readCards = async (id) => {
    await page.evaluate((pid) => HomeUI.openProfile(pid), id);
    await page.waitForSelector('#ghProfile.open');
    await page.waitForTimeout(550);
    const data = await page.evaluate(() => ({
      role: document.querySelector('.gh-profile-infocards')?.dataset.infoRole || '',
      cards: [...document.querySelectorAll('.gh-profile-infocard')].map((c) => ({
        label: c.querySelector('b')?.innerText.trim(),
        value: c.querySelector('span span:last-child')?.innerText.trim(),
        icon: c.querySelector('.gh-profile-infocard-ico use')?.getAttribute('href') || ''
      })),
      note: document.querySelector('.gh-profile-infocard-note')?.innerText.trim() || '',
      pill: document.querySelector('.gh-profile-verifyline .gh-verify-pill')?.innerText.trim() || ''
    }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    return data;
  };

  const health = await readCards('author-health');
  rec('R12', 'Health profile shows the facility + consulting hours',
      health.role === 'health' && health.cards.length === 2
        && health.cards[0].label === 'Kituo' && health.cards[0].value.length > 3
        && health.cards[1].label === 'Saa za Upatikanaji' && /:/.test(health.cards[1].value),
      health.cards.map((c) => `${c.label}=${c.value}`).join(' · '));

  const safety = await readCards('author-safety');
  rec('R13', 'Safety profile shows the unit + the area covered',
      safety.role === 'safety' && safety.cards.length === 2
        && safety.cards[0].label === 'Kitengo' && safety.cards[1].label === 'Eneo la Huduma',
      safety.cards.map((c) => `${c.label}=${c.value}`).join(' · '));

  const org = await readCards('author-org');
  rec('R14', 'Institution profile shows its kind + coverage',
      org.role === 'org' && org.cards.length === 2
        && org.cards[0].label === 'Aina ya Taasisi' && org.cards[1].label === 'Eneo',
      org.cards.map((c) => `${c.label}=${c.value}`).join(' · '));

  const vol = await readCards('author-volunteer');
  rec('R15', 'Volunteer profile shows where they serve + when',
      vol.role === 'volunteer' && vol.cards.length === 2
        && vol.cards[0].label === 'Maeneo ya Kujitolea' && vol.cards[1].label === 'Upatikanaji',
      vol.cards.map((c) => `${c.label}=${c.value}`).join(' · '));

  const member = await readCards('author-member');
  rec('R16', 'Citizen profile shows place + topics and never claims verification',
      member.role === 'member' && member.cards.length === 2
        && /Sampuli/i.test(member.pill) && !/Imethibitishwa/i.test(member.pill),
      `${member.cards.map((c) => c.label).join(' + ')} · pill="${member.pill}"`);

  rec('R17', 'Every sample persona warns that the info cards are fiction',
      [health, safety, org, vol, member].every((p) => /sampuli/i.test(p.note)),
      health.note.slice(0, 46));

  /* ================================================= E. editing the fields */
  await page.evaluate(() => HomeUI.openMyProfile());
  await page.waitForSelector('#ghProfile.open');
  await page.waitForTimeout(400);
  await page.click('[data-profile-action="edit"]');
  await page.waitForTimeout(600);
  const editFields = await page.evaluate(() => ['ghPeAffiliation', 'ghPeAvailability', 'ghPeServiceAreas', 'ghPeOrgKind', 'ghPeCoverage']
    .map((id) => !!document.getElementById(id)));
  // pick the health role first: the info cards are shaped by the primary role
  await page.click('[data-pe-role="health"]');
  await page.waitForTimeout(200);
  await page.fill('#ghPeAffiliation', 'Kituo cha Afya Mwenge');
  await page.fill('#ghPeAvailability', '8:00 - 16:00');
  await page.click('[data-pe-action="save"]');
  await page.waitForTimeout(900);
  const savedCards = await page.evaluate(() => ({
    values: [...document.querySelectorAll('.gh-profile-infocard span span:last-child')].map((e) => e.innerText.trim()),
    role: document.querySelector('.gh-profile-infocards')?.dataset.infoRole || ''
  }));
  rec('R18', 'Owner can fill the optional fields and they render on the profile',
      editFields.every(Boolean)
        && savedCards.values.includes('Kituo cha Afya Mwenge')
        && savedCards.values.includes('8:00 - 16:00'),
      `${editFields.filter(Boolean).length}/5 fields · ${savedCards.values.join(' / ')}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  /* ========================================================== F. composer */
  await page.evaluate(() => HomeUI.openComposer());
  await page.waitForSelector('#ghComposer.open');
  await page.waitForTimeout(500);

  const chips = await page.evaluate(() => ({
    topics: [...document.querySelectorAll('#ghcTopicChips [data-topic-chip]')].map((b) => b.dataset.topicChip),
    topicLabel: document.querySelector('#ghcTopicChips [data-topic-chip="majanga"] span')?.innerText.trim(),
    audiences: [...document.querySelectorAll('#ghcAudienceChips [data-aud-chip]')].map((b) => b.dataset.audChip),
    active: document.querySelector('#ghcTopicChips .is-active')?.dataset.topicChip || '',
    selectHidden: (() => {
      const box = document.querySelector('.ghc-native');
      return box ? box.getBoundingClientRect().width <= 2 : false;
    })(),
    selectValue: document.getElementById('ghcTopic').value
  }));
  rec('R19', 'Mada and Watazamaji are chips backed by the original select',
      chips.topics.length === 5 && chips.audiences.length === 3
        && chips.selectHidden && chips.active === chips.selectValue && chips.topicLabel === 'Majanga',
      `${chips.topics.join(',')} · ${chips.audiences.join(',')} · select=${chips.selectValue}`);

  await page.click('#ghcTopicChips [data-topic-chip="majanga"]');
  await page.waitForTimeout(200);
  await page.click('#ghcAudienceChips [data-aud-chip="guardians"]');
  await page.waitForTimeout(200);
  const sync = await page.evaluate(() => ({
    topic: document.getElementById('ghcTopic').value,
    audience: document.getElementById('ghcAudience').value,
    activeTopic: document.querySelector('#ghcTopicChips .is-active')?.dataset.topicChip,
    pressed: document.querySelector('#ghcAudienceChips .is-active')?.getAttribute('aria-pressed')
  }));
  rec('R20', 'Clicking a chip writes the real select value (drafts/validation see it)',
      sync.topic === 'majanga' && sync.audience === 'guardians'
        && sync.activeTopic === 'majanga' && sync.pressed === 'true',
      `${sync.topic} / ${sync.audience}`);

  const limit = await page.evaluate(() => ({
    max: document.getElementById('ghcText').getAttribute('maxlength'),
    label: document.querySelector('#ghcCount')?.parentElement?.innerText.trim()
  }));
  rec('R21', 'Text limit is 2,000 characters and the counter says so',
      limit.max === '2000' && /\/\s*2000/.test(limit.label), `${limit.max} · ${limit.label}`);

  const longText = 'Mafuriko ya msimu huu yanahitaji maandalizi. '.repeat(40).slice(0, 1750);
  await page.fill('#ghcText', longText);
  await page.waitForTimeout(300);
  const counter = await page.evaluate(() => ({
    shown: Number(document.getElementById('ghcCount').innerText),
    real: document.getElementById('ghcText').value.length
  }));
  rec('R22', 'A 1,750-character post is accepted by the counter',
      counter.shown === counter.real && counter.real > 1700, `${counter.real} chars`);

  // attachment tiles: preview + ✕ + add-more
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJUlEQVR4nGP8z8Dwn4EIwESMolGFlCgcVUiUwlGFlCgcVUiUQgAyDwQBAAAAAElFTkSuQmCC',
    'base64');
  await page.setInputFiles('#ghcFileImage', { name: 'flood.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(500);
  const tray = await page.evaluate(() => {
    const host = document.getElementById('ghcAttachments');
    const att = host.querySelector('.ghc-att');
    const del = att?.querySelector('.ghc-att-del')?.getBoundingClientRect();
    return {
      items: host.querySelectorAll('.ghc-att').length,
      thumb: !!att?.querySelector('img.ghc-thumb'),
      delPos: del ? { x: del.right, y: del.top } : null,
      addTile: !!host.querySelector('.ghc-tile-add'),
      addLabel: host.querySelector('.ghc-tile-add span')?.innerText.trim() || '',
      firstChildIsAdd: host.firstElementChild?.classList.contains('ghc-tile-add-wrap'),
      lastChildIsAtt: host.lastElementChild?.classList.contains('ghc-att')
    };
  });
  rec('R23', 'Attachments render as tiles with a visible ✕ and an "Ongeza zaidi" tile',
      tray.items === 1 && tray.thumb && tray.addTile && /Ongeza zaidi/i.test(tray.addLabel)
        && tray.firstChildIsAdd && tray.lastChildIsAtt,
      `${tray.items} tile · ${tray.addLabel}`);

  await page.click('#ghcAttachments .ghc-att-del');
  await page.waitForTimeout(300);
  rec('R24', 'The tile ✕ still removes the attachment',
      (await page.locator('#ghcAttachments .ghc-att').count()) === 0,
      `${await page.locator('#ghcAttachments .ghc-att').count()} left`);

  /* ==================================================== G. keep-a-draft */
  await page.fill('#ghcTitleInput', 'Rasimu ya majaribio');
  await page.fill('#ghcText', 'Maandishi ya rasimu yanayopaswa kubaki baada ya kuchapisha.');
  await page.check('#ghcKeepDraft');
  const draftsBefore = await page.evaluate(() => (async () => {
    const m = await import('./src/services/drafts.service.js');
    return m.countDrafts();
  })());
  await page.click('#ghcPublish');
  await page.waitForTimeout(1200);
  const draftsAfter = await page.evaluate(() => (async () => {
    const m = await import('./src/services/drafts.service.js');
    return m.countDrafts();
  })());
  const published = await page.evaluate(() => ({
    posts: document.querySelectorAll('#ghFeed .gh-post').length,
    toast: document.getElementById('ghToast')?.innerText.trim() || ''
  }));
  rec('R25', 'Keep-a-draft writes a real draft row in addition to publishing',
      draftsAfter === draftsBefore + 1 && published.posts > 0 && /kifaa/i.test(published.toast),
      `drafts ${draftsBefore} -> ${draftsAfter} · posts ${published.posts}`);

  /* ======================================================= H. responsive */
  const widths = [320, 360, 390, 430, 768, 1024];
  const broken = [];
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(320);
    const state = await page.evaluate(() => {
      const doc = document.documentElement;
      const tiles = [...document.querySelectorAll('#ghTopics .gh-topic')];
      const last = tiles[tiles.length - 1]?.getBoundingClientRect();
      const cards = [...document.querySelectorAll('#ghFeed .gh-post')];
      const cardOverflow = cards.some((c) => c.scrollWidth > c.clientWidth + 1);
      return {
        page: doc.scrollWidth > window.innerWidth + 1,
        tilesClipped: !!last && last.right > window.innerWidth + 1,
        cardOverflow
      };
    });
    if (state.page || state.tilesClipped || state.cardOverflow) broken.push(w);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  rec('R26', 'No overflow in the tiles or the cards from 320px to 1024px',
      broken.length === 0, broken.length ? `broken at ${broken.join(', ')}` : `${widths.length} widths clean`);

  /* -------------------------------------------------------------- I. honesty */
  // index.html documents exactly four remote dependencies (Poppins, Leaflet
  // css+js, the Firebase SDK). Anything else leaving the device is a leak.
  const DOCUMENTED = [
    'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/',
    'https://unpkg.com/leaflet', 'https://www.gstatic.com/firebasejs/'
  ];
  const offline = requests.filter((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(u)
    && !u.startsWith('data:') && !u.startsWith('blob:')
    && !DOCUMENTED.some((d) => u.startsWith(d)));
  const leaked = await page.evaluate(() => {
    const html = document.body.innerHTML;
    return {
      verifiedNoEvidence: [...document.querySelectorAll('.gh-post-name .gh-verified-check')].length,
      claimsLive: /imesambazwa|dispatched to|police notified/i.test(html)
    };
  });
  rec('R27', 'No undocumented external request and no live dispatch is claimed',
      offline.length === 0 && leaked.verifiedNoEvidence === 0 && !leaked.claimsLive,
      `${offline.length} undocumented requests${offline.length ? `: ${offline.slice(0, 2).join(', ')}` : ''}`);

  rec('R28', 'No page errors during the refine suite', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  rec('R29', 'No console errors during the refine suite', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

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
