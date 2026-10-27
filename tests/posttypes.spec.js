/**
 * GuardHai — post types & topics suite (P6).
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/posttypes.spec.js [url]
 *
 * Covers the final taxonomy ruling:
 *   • five post types (Elimu, Swali, Uzoefu, Taarifa, Kusaidia)
 *   • five topics (Afya, Usalama, Taasisi, Kusaidiana, Majanga)
 *   • stored as two independent fields — never derived from one another
 *   • six shortcut chips touch exactly one field each
 *   • validation, persistence, and backward compatibility with schema v1 rows
 *   • a Majanga/Usalama post is NOT the SOS workflow
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
  await page.waitForTimeout(1500);
}

const openComposer = async (page) => {
  await page.evaluate(() => HomeUI.openComposer());
  await page.waitForSelector('#ghComposer.open, .gh-compose-card', { timeout: 8000 });
  await page.waitForTimeout(350);
};

const state = (page) => page.evaluate(() => ({
  type: document.querySelector('#ghcTypes .ghc-chip.is-active')?.dataset.type || null,
  topic: document.getElementById('ghcTopic')?.value || null,
  topicPressed: [...document.querySelectorAll('#ghcTopicChips [data-topic-chip]')]
    .filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.topicChip),
  shortcutPressed: [...document.querySelectorAll('#ghcShortcuts [data-shortcut]')]
    .filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.shortcut)
}));

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await boot(page);

  /* ================================================== A. taxonomy (pure) */
  const domain = await page.evaluate(async () => {
    const m = await import('./src/domain/post.js');
    return {
      types: Object.keys(m.POST_TYPES),
      typeLabels: Object.values(m.POST_TYPES).map((t) => t.label),
      topics: [...m.TOPIC_ORDER],
      topicLabels: Object.values(m.TOPICS).map((t) => t.label),
      legacy: { ...m.LEGACY_TOPICS },
      normalize: ['health', 'people', 'crime', 'digital', 'disaster', 'AFYA', 'taasisi', '']
        .map((v) => m.normalizeTopic(v)),
      labels: ['health', 'disaster', 'afya', 'majanga', 'nonsense'].map((v) => m.topicLabel(v)),
      defaultTopic: m.DEFAULT_TOPIC
    };
  });
  rec('T1', 'Exactly five post types with the final labels',
      domain.types.length === 5
        && ['Elimu', 'Swali', 'Uzoefu', 'Taarifa', 'Kusaidia'].every((l) => domain.typeLabels.includes(l)),
      domain.typeLabels.join(' · '));
  rec('T2', 'Exactly five topics with the final labels',
      JSON.stringify(domain.topics) === JSON.stringify(['afya', 'usalama', 'taasisi', 'kusaidiana', 'majanga'])
        && ['Afya', 'Usalama', 'Taasisi', 'Kusaidiana', 'Majanga'].every((l) => domain.topicLabels.includes(l)),
      domain.topicLabels.join(' · '));
  rec('T3', 'Schema v1 topic ids migrate to their v2 equivalents',
      domain.normalize[0] === 'afya' && domain.normalize[1] === 'usalama'
        && domain.normalize[2] === 'usalama' && domain.normalize[3] === 'usalama'
        && domain.normalize[4] === 'majanga',
      ['health', 'people', 'crime', 'digital', 'disaster'].map((k, i) => `${k}→${domain.normalize[i]}`).join(' '));
  rec('T4', 'Unknown or empty topics fall back to the default, never throw',
      domain.normalize[7] === domain.defaultTopic && domain.normalize[5] === 'afya'
        && domain.labels[4] === 'Afya',
      `fallback ${domain.defaultTopic} · label(nonsense)=${domain.labels[4]}`);
  rec('T5', 'topicLabel always returns a Swahili label for a legacy id',
      domain.labels[0] === 'Afya' && domain.labels[3] === 'Majanga',
      `${domain.labels.join(' · ')}`);

  /* ============================================ B. composer markup & chips */
  await openComposer(page);

  const composer = await page.evaluate(() => ({
    types: [...document.querySelectorAll('#ghcTypes .ghc-chip')].map((c) => c.dataset.type),
    typeLabel: Object.fromEntries([...document.querySelectorAll('#ghcTypes .ghc-chip')]
      .map((c) => [c.dataset.type, c.innerText.trim()])),
    topicOptions: [...document.querySelectorAll('#ghcTopic option')].map((o) => o.value),
    topicChips: [...document.querySelectorAll('#ghcTopicChips [data-topic-chip]')].map((b) => b.dataset.topicChip),
    shortcuts: [...document.querySelectorAll('#ghcShortcuts [data-shortcut]')].map((b) => b.dataset.shortcut),
    audienceOptions: [...document.querySelectorAll('#ghcAudience option')].map((o) => o.value),
    maxLength: document.getElementById('ghcText')?.getAttribute('maxlength'),
    counter: document.getElementById('ghcCount')?.parentElement?.innerText.trim()
  }));
  rec('B1', 'Composer offers the five post types as separate chips',
      JSON.stringify(composer.types) === JSON.stringify(['elimu', 'swali', 'uzoefu', 'taarifa', 'fursa'])
        && composer.typeLabel.fursa === 'Kusaidia',
      composer.types.join(','));
  rec('B2', 'Composer offers the five topics in the select and the chip row',
      composer.topicOptions.join(',') === 'afya,usalama,taasisi,kusaidiana,majanga'
        && composer.topicChips.join(',') === composer.topicOptions.join(','),
      `${composer.topicOptions.join(',')}`);
  rec('B3', 'Six shortcut chips exist (one type shortcut + five topic shortcuts)',
      composer.shortcuts.join(',') === 'elimu,afya,usalama,taasisi,kusaidiana,majanga',
      composer.shortcuts.join(','));
  rec('B4', 'Audience options are unchanged at three',
      composer.audienceOptions.length === 3, composer.audienceOptions.join(','));
  rec('B5', 'Text limit is 2,000 with a live counter that says so',
      composer.maxLength === '2000' && /\/\s*2000/.test(composer.counter), composer.counter);

  /* type chip changes only the type axis */
  await page.click('#ghcTypes [data-type="swali"]');
  await page.waitForTimeout(150);
  const afterType = await state(page);
  rec('B6', 'Choosing a type leaves the topic untouched',
      afterType.type === 'swali' && afterType.topic === 'afya',
      `type=${afterType.type} topic=${afterType.topic}`);

  /* topic chip changes only the topic axis */
  await page.click('#ghcTopicChips [data-topic-chip="majanga"]');
  await page.waitForTimeout(150);
  const afterTopic = await state(page);
  rec('B7', 'Choosing a topic leaves the type untouched',
      afterTopic.topic === 'majanga' && afterTopic.type === 'swali',
      `type=${afterTopic.type} topic=${afterTopic.topic}`);
  rec('B8', 'The selected topic chip is pressed and the others are not',
      afterTopic.topicPressed.length === 1 && afterTopic.topicPressed[0] === 'majanga',
      afterTopic.topicPressed.join(','));

  /* the Elimu shortcut sets the type only */
  await page.click('#ghcShortcuts [data-shortcut="elimu"]');
  await page.waitForTimeout(150);
  const afterElimu = await state(page);
  rec('B9', 'The Elimu shortcut sets the type and never the topic',
      afterElimu.type === 'elimu' && afterElimu.topic === 'majanga',
      `type=${afterElimu.type} topic=${afterElimu.topic}`);

  /* a topic shortcut sets the topic only */
  await page.click('#ghcTypes [data-type="uzoefu"]');
  await page.waitForTimeout(120);
  await page.click('#ghcShortcuts [data-shortcut="taasisi"]');
  await page.waitForTimeout(150);
  const afterShortcut = await state(page);
  rec('B10', 'A topic shortcut sets the topic and never the type',
      afterShortcut.topic === 'taasisi' && afterShortcut.type === 'uzoefu',
      `type=${afterShortcut.type} topic=${afterShortcut.topic}`);
  rec('B11', 'Shortcut chips reflect the current type/topic independently',
      afterShortcut.shortcutPressed.join(',') === 'taasisi',
      afterShortcut.shortcutPressed.join(',') || 'none');

  /* ============================================= C. validation & publish */
  await page.evaluate(() => HomeUI.openComposer && document.getElementById('ghcText').focus());
  const empty = await page.evaluate(async () => {
    const { validateDraft } = await import('./src/domain/post.js');
    return validateDraft({ title: '', text: '', type: 'elimu', topic: 'afya', audience: 'public', media: [] });
  });
  rec('C1', 'An empty draft is rejected with a real message',
      empty.length >= 1 && /maandishi|andika/i.test(empty.join(' ')), empty.join(' | '));

  const unknownTopic = await page.evaluate(async () => {
    const { validateDraft } = await import('./src/domain/post.js');
    return validateDraft({ title: 'Jaribio', text: 'Maandishi ya kutosha kwa jaribio.', type: 'elimu', topic: 'kaskazini', audience: 'public', media: [] });
  });
  rec('C2', 'An unknown topic id is rejected', unknownTopic.includes('Mada haijulikani.'),
      unknownTopic.join(' | ') || 'accepted (bad)');

  /* publish with type=uzoefu, topic=taasisi (the state left in the form) */
  await page.fill('#ghcText', 'Taarifa ya majaribio: huduma ya afya imefunguliwa mtaa wa Kariakoo.');
  await page.waitForTimeout(200);
  const before = await state(page);
  const published = await page.evaluate(async () => {
    const res = await HomeUI.publish();
    return { ok: res && res.ok !== false, errors: (res && res.errors) || [] };
  });
  await page.waitForTimeout(900);
  const stored = await page.evaluate(async () => {
    const { listPosts } = await import('./src/services/posts.service.js');
    const rows = await listPosts({});
    return rows.map((p) => ({
      id: p.id, type: p.type, topic: p.topic, label: p.topicLabel,
      schemaVersion: p.schemaVersion, sample: p.sample
    }));
  });
  const mine = stored.find((p) => !p.sample) || {};
  rec('C3', 'Publishing stores type and topic as two separate fields',
      published.ok && mine.type === before.type && mine.topic === before.topic,
      `published ${mine.type}/${mine.topic} · form ${before.type}/${before.topic}`);
  rec('C4', 'The stored row keeps the label and the v2 schema marker',
      mine.label === 'Taasisi' && mine.schemaVersion === 2,
      `${mine.label} · v${mine.schemaVersion}`);

  /* the card that renders from that row must show both axes */
  const card = await page.evaluate(async () => {
    const { listPosts } = await import('./src/services/posts.service.js');
    const mine = (await listPosts({})).find((p) => !p.sample);
    const first = document.querySelector(`#ghFeed .gh-post[data-post-id="${mine?.id}"]`)
      || document.querySelector('#ghFeed .gh-post');
    return {
      id: first?.dataset.postId || '',
      badge: first?.querySelector('.gh-type-badge')?.textContent.trim() || '',
      badgeClass: first?.querySelector('.gh-type-badge')?.className || '',
      account: first?.querySelector('.gh-post-audience')?.innerText.trim() || '',
      topicChip: first?.querySelector('.gh-post-topic')?.innerText.trim() || ''
    };
  });
  rec('C5', 'A card shows the topic badge derived from the topic field',
      /Taasisi/.test(card.badge) && /gh-type-org/.test(card.badgeClass) && card.topicChip === 'Taasisi',
      `badge="${card.badge}" · ${card.badgeClass} · chip=${card.topicChip}`);

  /* ============================================ D. backward compatibility */
  const legacy = await page.evaluate(async () => {
    const { normalizePost } = await import('./src/domain/post.js');
    const { SAMPLE_POSTS } = await import('./src/data/seed-posts.js');
    const old = normalizePost({
      id: 'legacy-1', authorName: 'Mzee Juma', type: 'taarifa', topic: 'health',
      text: 'Chapisho la zamani lenye topic ya schema v1.', createdAt: Date.now()
    });
    const orphan = normalizePost({
      id: 'legacy-2', authorName: 'Asha', type: 'swali',
      text: 'Chapisho lisilo na topic kabisa.', createdAt: Date.now()
    });
    return {
      oldTopic: old.topic, oldLabel: old.topicLabel,
      orphanTopic: orphan.topic, orphanLabel: orphan.topicLabel,
      sampleTopics: [...new Set(SAMPLE_POSTS.map((p) => p.topic))].sort(),
      sampleBad: SAMPLE_POSTS.filter((p) => !p.topic || !p.type).length,
      sampleLegacy: SAMPLE_POSTS.filter((p) => ['health', 'people', 'crime', 'digital', 'disaster'].includes(p.topic)).length
    };
  });
  rec('D1', 'A v1 row with topic "health" renders as Afya',
      legacy.oldTopic === 'afya' && legacy.oldLabel === 'Afya',
      `${legacy.oldTopic}/${legacy.oldLabel}`);
  rec('D2', 'A row with no topic at all falls back instead of breaking',
      legacy.orphanTopic === 'afya' && legacy.orphanLabel === 'Afya',
      `${legacy.orphanTopic}/${legacy.orphanLabel}`);
  rec('D3', 'Every demo post carries a v2 topic and no legacy ids survive',
      legacy.sampleBad === 0 && legacy.sampleLegacy === 0,
      `${legacy.sampleTopics.join(',')} · ${legacy.sampleBad} bad · ${legacy.sampleLegacy} legacy`);

  /* every sample renders without errors and shows a topic badge */
  const sampleCards = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#ghFeed .gh-post')];
    return {
      count: cards.length,
      badges: cards.map((c) => c.querySelector('.gh-type-badge')?.className || ''),
      mixed: cards.filter((c) => {
        const b = c.querySelector('.gh-type-badge')?.innerText.trim() || '';
        return ['Elimu', 'Swali', 'Uzoefu', 'Taarifa', 'Kusaidia'].includes(b);
      }).length
    };
  });
  rec('D4', 'No card shows a post type where a topic badge belongs',
      sampleCards.count > 0 && sampleCards.mixed === 0 && sampleCards.badges.every((c) => /gh-type-/.test(c)),
      `${sampleCards.count} cards · ${sampleCards.mixed} mixed`);

  /* ================================================ E. SOS stays separate */
  const separation = await page.evaluate(() => {
    const compose = document.querySelector('#ghComposer')?.innerHTML || '';
    return {
      hasSosTrigger: /GHSos|triggerSOS|sos-sheet|sosSheet/i.test(compose),
      sosCount: document.querySelectorAll('[data-shortcut="sos"], [data-type="sos"], [data-topic="sos"]').length,
      emergencyKeys: Object.keys(localStorage).filter((k) => /sos/i.test(k)).length
    };
  });
  rec('E1', 'The composer has no SOS path and no emergency vocabulary',
      !separation.hasSosTrigger && separation.sosCount === 0,
      `sosRefs=${separation.hasSosTrigger} chips=${separation.sosCount}`);

  await page.evaluate(() => HomeUI.openComposer());
  await page.waitForTimeout(500);
  await page.click('#ghcTypes [data-type="taarifa"]');
  await page.click('#ghcTopicChips [data-topic-chip="majanga"]');
  await page.fill('#ghcText', 'Mafuriko: maji yameingia nyumbani mtaa mzima. Taarifa kwa jamii.');
  await page.waitForTimeout(150);
  const sos = await page.evaluate(async () => {
    const res = await HomeUI.publish();
    await new Promise((r) => setTimeout(r, 400));
    return { ok: res && res.ok !== false, errors: (res && res.errors) || [] };
  });
  const alertState = await page.evaluate(() => ({
    sosSheet: document.querySelectorAll('#ghSosSheet.open, .gh-sos-sheet.open').length,
    sosLog: Object.keys(localStorage).filter((k) => /sos|alert/i.test(k)).length
  }));
  rec('E2', 'A Majanga post publishes as a normal post and raises no alert',
      sos.ok && sos.errors.length === 0 && alertState.sosSheet === 0 && alertState.sosLog === 0,
      `${sos.errors.join(' | ') || 'published'} · sosSheets=${alertState.sosSheet}`);

  /* ============================================ F. persistence & reload */
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1900);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(800);
  const after = await page.evaluate(async () => {
    const { listPosts } = await import('./src/services/posts.service.js');
    const rows = await listPosts({});
    return rows.filter((p) => !p.sample).map((p) => ({ type: p.type, topic: p.topic }));
  });
  rec('F1', 'Both published posts survive a reload with their two fields intact',
      after.length >= 2 && after.some((p) => p.type === 'uzoefu' && p.topic === 'taasisi')
        && after.some((p) => p.type === 'taarifa' && p.topic === 'majanga'),
      after.map((p) => `${p.type}/${p.topic}`).join(' · ') || 'none');

  const draft = await page.evaluate(async () => {
    const m = await import('./src/services/drafts.service.js');
    await m.saveDraft({ title: 'Rasimu', text: 'Rasimu ya jaribio la aina na mada.', type: 'swali', topic: 'kusaidiana', audience: 'public', media: [] });
    const d = await m.latestDraft();
    return { type: d?.type, topic: d?.topic };
  });
  rec('F2', 'A draft keeps the type and the topic separately',
      draft.type === 'swali' && draft.topic === 'kusaidiana',
      `${draft.type}/${draft.topic}`);

  const migratedDraft = await page.evaluate(async () => {
    const m = await import('./src/services/drafts.service.js');
    const { normalizeTopic } = await import('./src/domain/post.js');
    await m.saveDraft({ title: 'Rasimu ya zamani', text: 'Rasimu iliyohifadhiwa na schema ya kwanza.', type: 'elimu', topic: 'people', audience: 'public', media: [] });
    await HomeUI.openComposer();
    await new Promise((r) => setTimeout(r, 400));
    document.querySelector('[data-draft-load]')?.click();
    await new Promise((r) => setTimeout(r, 700));
    return { topic: document.getElementById('ghcTopic')?.value, expect: normalizeTopic('people') };
  });
  const draftTopic = migratedDraft.topic;
  rec('F3', 'Loading a v1 draft migrates its topic instead of losing it',
      draftTopic === migratedDraft.expect, `${draftTopic} (expected ${migratedDraft.expect})`);

  /* ================================================== G. feed filters v2 */
  const filters = await page.evaluate(async () => {
    await HomeUI.openComposer().catch(() => {});
    document.querySelector('#ghComposer .ghc-close, #ghComposer [data-close]')?.click();
    await new Promise((r) => setTimeout(r, 300));
    const chips = [...document.querySelectorAll('#ghTopics .gh-topic')].map((b) => b.dataset.topic);
    return chips;
  });
  rec('G1', 'Feed topic filters use the five topics plus "all"',
      filters.join(',') === 'all,afya,usalama,taasisi,kusaidiana,majanga', filters.join(','));

  rec('G2', 'No page errors during the post-types suite', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  rec('G3', 'No console errors during the post-types suite', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

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
