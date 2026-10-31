/**
 * GuardHai — Universal Secure Storage Center suite.
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/storage.spec.js [url]
 *
 * Drives the real page (clicks, typing, submits, selects) through the flows the
 * brief fixes and then checks the honesty rules that matter more than the happy
 * path:
 *   • an edit or an export never touches the original file;
 *   • a digest exists only when a real blob was hashed on this device;
 *   • "reviewed" is the user's own step, never an external verification;
 *   • health records stay in Health — storage keeps a read-only pointer;
 *   • share grants are recorded locally and reach nobody;
 *   • samples are labelled and removable without touching user data;
 *   • every entry point (Home sheet, Shield app row) opens the same page.
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const R = [];
const rec = (id, name, ok, detail = '') => {
  R.push({ id, name, ok: !!ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${id}  ${name}${detail ? `\n        ${detail}` : ''}`;
  if (process.env.SX_VERBOSE || !ok) console.log(line);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForApp(page, ms = 25000) {
  const started = Date.now();
  for (;;) {
    if (await page.evaluate(() => typeof window.AuthFlow !== 'undefined')) return;
    if (Date.now() - started > ms) throw new Error(`app did not boot within ${ms}ms`);
    await page.waitForTimeout(150);
  }
}

/** The app opens on its auth splash; register the local account like the other suites. */
async function boot(page) {
  await page.goto(URL, { waitUntil: 'load' });
  try { await waitForApp(page); } catch (e) { await page.waitForTimeout(700); await waitForApp(page); }
  await page.evaluate(() => AuthFlow.goTo('landing'));
  await page.waitForTimeout(120);
  await page.evaluate(() => AuthFlow.goTo('register'));
  await page.waitForTimeout(300);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(1400);
}

const stage = (page) => page.evaluate(() => document.getElementById('ghStorageStage')?.innerText || '');
const headTitle = (page) => page.evaluate(() => document.getElementById('ghStorageTitle')?.textContent || '');
const go = async (page, screen, params = {}) => {
  await page.evaluate(([s, p]) => window.switchTab('storage') || window.GHStorage.open(s, p), [screen, params]);
  await page.evaluate(([s, p]) => window.GHStorage.open(s, p), [screen, params]);
  await page.waitForTimeout(420);
};
const clickAct = (page, act, key = null) => page.evaluate(({ act, key }) => {
  const sel = key ? `[data-stx="${act}"][data-key="${key}"]` : `[data-stx="${act}"]`;
  const el = document.querySelector(`#storagePage ${sel}`);
  if (!el) return 'missing';
  el.click();
  return 'clicked';
}, { act, key });
const svc = (page) => page.evaluate(() => import('/src/services/storage.service.js'));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 160)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|leaflet|unpkg|Failed to load resource/i.test(m.text())) {
      consoleErrors.push(m.text().slice(0, 160));
    }
  });

  await boot(page);

  /* ------------------------------------------------------- ST1 · the page */
  const shape = await page.evaluate(() => ({
    bridge: typeof window.GHStorage === 'object',
    screens: window.GHStorage?.screens?.length || 0,
    page: !!document.getElementById('storagePage'),
    stage: !!document.getElementById('ghStorageStage'),
    css: [...document.styleSheets].some((s) => (s.href || '').includes('18-storage.css')),
    loader: [...document.scripts].some((s) => (s.src || '').includes('main.js')) || !!window.GuardHai
  }));
  rec('ST1', 'The page mounts with its bridge, stage, stylesheet and every screen registered',
    shape.bridge && shape.screens >= 15 && shape.page && shape.stage && shape.css,
    `screens=${shape.screens}`);

  /* --------------------------------------------------- ST2 · entry points */
  const viaSheet = await page.evaluate(async () => {
    window.HomeUI.go('home');
    await new Promise((r) => setTimeout(r, 250));
    await window.HomeUI.openStorage();
    await new Promise((r) => setTimeout(r, 700));
    return {
      active: document.getElementById('storagePage').classList.contains('active'),
      screen: window.GHStorage.state.screen,
      title: document.getElementById('ghStorageTitle')?.textContent,
      quickSearchHidden: document.getElementById('ghSearchBar')?.hasAttribute('hidden') ?? null
    };
  });
  rec('ST2', 'The Home Storage action opens the page on the device figures (same measurements as before)',
    viaSheet.active && viaSheet.screen === 'storage.usage', JSON.stringify(viaSheet));

  const viaShield = await page.evaluate(async () => {
    window.HomeUI.go('shield');
    await new Promise((r) => setTimeout(r, 300));
    window.ShieldCenter.go('settings');
    await new Promise((r) => setTimeout(r, 400));
    const el = document.querySelector('#shieldPage [data-shield-act="app.storage"]');
    if (!el) return { clicked: false };
    el.click();
    await new Promise((r) => setTimeout(r, 700));
    return {
      clicked: true,
      active: document.getElementById('storagePage').classList.contains('active'),
      screen: window.GHStorage.state.screen
    };
  });
  rec('ST3', 'The Shield app row opens the same page (one storage, two doors)',
    viaShield.clicked && viaShield.active, JSON.stringify(viaShield));

  /* ------------------------------------------------------- ST4 · samples */
  const seeded = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const first = await m.seedSamples();
    const second = await m.seedSamples();
    const items = await m.allItems();
    return {
      firstOk: first.ok === true,
      skipped: second.skipped === true,
      count: items.length,
      samples: items.filter((i) => i.sample).length,
      allLabelled: items.filter((i) => i.sample).every((i) => i.sample === true)
    };
  });
  rec('ST4', 'Sample data loads once (18 records) and every sample is flagged',
    seeded.firstOk && seeded.skipped && seeded.count === 18 && seeded.samples === 18,
    `count=${seeded.count} samples=${seeded.samples}`);

  /* ---------------------------------------------------------- ST5 · home */
  await go(page, 'storage.home');
  const home = await page.evaluate(() => ({
    title: document.getElementById('ghStorageTitle')?.textContent,
    cats: document.querySelectorAll('.stx-cat').length,
    evidenceTiles: document.querySelectorAll('.stx-evtile').length,
    rows: document.querySelectorAll('.stx-row').length,
    pills: [...document.querySelectorAll('.stx-pill')].map((p) => p.textContent.trim()),
    honesty: /kifaa hiki pekee|this device only/i.test(document.getElementById('ghStorageStage').innerText)
  }));
  rec('ST5', 'The dashboard shows all 12 categories, all 11 evidence kinds and one plainly-worded truth about storage',
    home.cats === 12 && home.evidenceTiles === 11 && home.honesty && home.title === 'Hifadhi',
    `cats=${home.cats} evidence=${home.evidenceTiles} rows=${home.rows}`);

  rec('ST6', 'Sample records carry a visible “Sampuli” label on the dashboard',
    home.pills.some((p) => p === 'Sampuli'), home.pills.slice(0, 6).join(' · '));

  /* ------------------------------------------------------ ST7 · category */
  await go(page, 'storage.category', { category: 'evidence' });
  const cat = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.stx-row, .stx-tilecard')];
    return {
      title: document.getElementById('ghStorageTitle')?.textContent,
      rows: rows.length,
      chips: document.querySelectorAll('.stx-subchip').length,
      hasRail: !!document.querySelector('.stx-subrail')
    };
  });
  rec('ST7', 'A category opens with its own subcategory rail and only its own records',
    cat.hasRail && cat.chips >= 5 && cat.rows > 0, JSON.stringify(cat));

  const beforeSub = cat.rows;
  const afterSub = await page.evaluate(async () => {
    const chip = [...document.querySelectorAll('.stx-subchip')].find((c) => c.dataset.key === 'ev-photo');
    if (!chip) return { clicked: false };
    chip.click();
    await new Promise((r) => setTimeout(r, 450));
    return { clicked: true, rows: document.querySelectorAll('.stx-row, .stx-tilecard').length, sub: window.GHStorage.state.filters.subcategory };
  });
  rec('ST8', 'A subcategory narrows the collection in place',
    afterSub.clicked && afterSub.sub === 'ev-photo' && afterSub.rows <= beforeSub,
    `${beforeSub} → ${afterSub.rows}`);

  /* -------------------------------------------------------- ST9 · search */
  await page.evaluate(() => { window.GHStorage.state.filters.subcategory = 'all'; window.GHStorage.state.filters.category = 'all'; });
  await go(page, 'storage.search');
  await page.fill('.stx-search input[name="q"]', 'mlango');
  await page.press('.stx-search input[name="q"]', 'Enter');
  await page.waitForTimeout(500);
  const search = await page.evaluate(() => ({
    q: window.GHStorage.state.filters.q,
    rows: document.querySelectorAll('.stx-row, .stx-tilecard').length,
    text: document.getElementById('ghStorageStage').innerText
  }));
  rec('ST9', 'Search matches titles and tags on this device only',
    search.q === 'mlango' && search.rows >= 1 && /matokeo/i.test(search.text),
    `hits=${search.rows}`);

  await clickAct(page, 'filters.search.clear');
  await page.waitForTimeout(400);
  const cleared = await page.evaluate(() => window.GHStorage.state.filters.q);
  rec('ST10', 'Clearing the search restores the full collection', cleared === '', `q="${cleared}"`);

  /* ------------------------------------------------------- ST11 · filters */
  await go(page, 'storage.filters');
  const filterGrid = await page.evaluate(() => ({
    selects: document.querySelectorAll('[data-stx-select="filter.set"]').length,
    preview: /zinazolingana|match/i.test(document.getElementById('ghStorageStage').innerText)
  }));
  rec('ST11', 'Advanced filters expose all twelve dimensions with a live match count',
    filterGrid.selects === 12 && filterGrid.preview, `selects=${filterGrid.selects}`);

  await page.selectOption('#stx-fileType', 'image');
  await page.waitForTimeout(350);
  await clickAct(page, 'filter.apply');
  await page.waitForTimeout(500);
  const applied = await page.evaluate(async () => {
    const s = await import('/src/services/storage.service.js');
    const all = await s.allItems();
    const expected = s.applyFilters(all, window.GHStorage.state.filters).length;
    return {
      screen: window.GHStorage.state.screen,
      filter: window.GHStorage.state.filters.fileType,
      shown: document.querySelectorAll('.stx-row, .stx-tilecard').length,
      expected
    };
  });
  rec('ST12', 'Applying a filter shows exactly the records the pipeline returns (one source of truth)',
    applied.screen === 'storage.all' && applied.filter === 'image' && applied.shown === applied.expected,
    JSON.stringify(applied));

  await clickAct(page, 'filter.reset');
  await page.waitForTimeout(400);
  const resetOk = await page.evaluate((async () => {
    const f = window.GHStorage.state.filters;
    return f.fileType === 'all' && f.category === 'all' && f.q === '';
  }));
  rec('ST13', 'Reset clears every dimension at once', resetOk);

  /* ---------------------------------------------------------- ST14 · view */
  const viewPersist = await page.evaluate(async () => {
    document.querySelector('[data-stx="view.set"][data-key="grid"]').click();
    await new Promise((r) => setTimeout(r, 350));
    return {
      stored: localStorage.getItem('guardhai_storage_view'),
      cards: document.querySelectorAll('.stx-tilecard').length,
      view: window.GHStorage.state.filters.view
    };
  });
  rec('ST14', 'Grid view renders cards and remembers the choice for the next visit',
    viewPersist.view === 'grid' && viewPersist.stored === 'grid' && viewPersist.cards > 0,
    JSON.stringify(viewPersist));
  await page.evaluate(() => document.querySelector('[data-stx="view.set"][data-key="list"]').click());
  await page.waitForTimeout(250);

  /* ---------------------------------------------------- ST15 · add record */
  await go(page, 'storage.add');
  await page.fill('#stx-title', 'Ripoti ya polisi — Kijichi');
  await page.fill('#stx-description', 'Iliandikwa kituo cha Kijichi, 12 Oktoba.');
  await page.selectOption('#stx-category', 'reports');
  await page.waitForTimeout(300);
  const subsAfterCat = await page.evaluate(() => [...document.querySelectorAll('#stx-subcategory option')].map((o) => o.value));
  await page.selectOption('#stx-subcategory', subsAfterCat[1] || subsAfterCat[0]);
  await page.fill('#stx-tags', 'polisi, kijichi');
  await page.click('.stx-form button[type="submit"]');
  await page.waitForTimeout(900);
  const added = await page.evaluate(() => ({
    screen: window.GHStorage.state.screen,
    title: document.getElementById('ghStorageTitle')?.textContent,
    meta: document.getElementById('ghStorageStage').innerText
  }));
  rec('ST15', 'Adding a record saves it on the device and opens its sheet',
    added.screen === 'storage.item' && added.title === 'Ripoti ya polisi — Kijichi', added.title);
  rec('ST16', 'Changing the category rebuilds the subcategory list instead of keeping a stale one',
    !subsAfterCat.includes('consents') && subsAfterCat.length >= 2, subsAfterCat.join(','));

  /* -------------------------------------------------- ST17 · validation */
  await go(page, 'storage.add');
  await page.click('.stx-form button[type="submit"]');
  await page.waitForTimeout(700);
  const rejected = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const items = await m.allItems();
    return {
      screen: window.GHStorage.state.screen,
      toast: document.getElementById('ghToast')?.textContent || '',
      untitled: items.filter((i) => !i.title).length,
      count: items.length
    };
  });
  rec('ST17', 'An empty form is refused with a spoken reason, and nothing is written',
    rejected.screen === 'storage.add' && rejected.untitled === 0 && /jina|title/i.test(rejected.toast),
    `${rejected.toast} count=${rejected.count}`);

  /* ------------------------------------------- ST18 · restricted record */
  await go(page, 'storage.item', { id: 'st_demo_gu1' });
  const locked = await page.evaluate(() => ({
    locked: !!document.querySelector('.stx-locked-page'),
    title: document.getElementById('ghStorageTitle')?.textContent,
    reason: /hatua yako|your own step/i.test(document.getElementById('ghStorageStage').innerText)
  }));
  rec('ST18', 'A restricted record stays shut until it is deliberately unlocked',
    locked.locked && locked.reason, locked.title);

  await clickAct(page, 'record.unlock');
  await page.waitForTimeout(700);
  const unlocked = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const trail = await m.custodyOf('st_demo_gu1');
    return {
      page: !document.querySelector('.stx-locked-page'),
      custody: trail.some((e) => e.action === 'unlocked'),
      meta: !!document.querySelector('.stx-metatable')
    };
  });
  rec('ST19', 'Unlocking reveals the sheet and writes the step to the custody trail',
    unlocked.page && unlocked.custody && unlocked.meta, JSON.stringify(unlocked));

  /* ---------------------------------------------- ST20 · review is local */
  await go(page, 'storage.item', { id: 'st_demo_ev2' });
  const review = await page.evaluate(async () => {
    const before = await import('/src/services/storage.service.js');
    const start = (await before.getItem('st_demo_ev2')).verification;
    document.querySelector('[data-stx="record.review"]').click();
    await new Promise((r) => setTimeout(r, 700));
    const m = await import('/src/services/storage.service.js');
    const after = await m.getItem('st_demo_ev2');
    const trail = await m.custodyOf('st_demo_ev2');
    return {
      start, now: after.verification,
      custody: trail.some((e) => e.action === 'reviewed'),
      toast: document.getElementById('ghToast')?.textContent || '',
      claimsExternal: /imethibitishwa na|verified by|authority/i.test(document.getElementById('ghStorageStage').innerText)
    };
  });
  rec('ST20', 'Reviewing toggles a local “reviewed” state and says plainly it is not external verification',
    review.now !== review.start && review.custody && !review.claimsExternal && /si uthibitisho|not external/i.test(review.toast),
    `${review.start} → ${review.now} · ${review.toast}`);

  /* --------------------------------------- ST21 · copies never overwrite */
  const copy = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const before = await m.allItems();
    const original = before.find((i) => i.id === 'st_demo_ev1');
    document.querySelector('#storagePage [data-stx="record.copy"]').click();
    await new Promise((r) => setTimeout(r, 800));
    const after = await m.allItems();
    const stillThere = after.find((i) => i.id === 'st_demo_ev1');
    const derived = after.filter((i) => i.originId === 'st_demo_ev1');
    return {
      originalSame: stillThere && stillThere.title === original.title && stillThere.version === 'original',
      derived: derived.length,
      newOne: (after.find((i) => i.originId === 'st_demo_ev1' && i.version === 'edited') || {}).id || null,
      screen: window.GHStorage.state.screen
    };
  });
  rec('ST21', 'An edited copy is a new record that points back — the original is untouched',
    copy.originalSame && copy.derived >= 1 && copy.screen === 'storage.item', JSON.stringify(copy));

  const exportCopy = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const res = await m.createDerivedCopy('st_demo_ev1', 'exported');
    const items = await m.allItems();
    const original = items.find((i) => i.id === 'st_demo_ev1');
    return { ok: res.ok, version: res.ok ? res.item.version : null, originalVersion: original.version };
  });
  rec('ST22', 'An export copy is also a separate record, and the original keeps its version',
    exportCopy.ok && exportCopy.version === 'exported' && exportCopy.originalVersion === 'original',
    JSON.stringify(exportCopy));

  /* -------------------------------------------- ST23 · integrity honesty */
  const integrity = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const noBlob = await m.computeIntegrity('st_demo_ev1');   // a sample: no bytes on this device
    const item = await m.getItem('st_demo_ev1');
    return {
      refused: noBlob.ok === false,
      message: noBlob.message || '',
      digest: item.integrity,
      pageSaysSo: /hakuna alama ya faili|no file digest/i.test(document.getElementById('ghStorageStage').innerText.toLowerCase()) ||
        /alama/i.test(document.getElementById('ghStorageStage').innerText)
    };
  });
  rec('ST23', 'No digest is invented for a record with no file — the action refuses and says why',
    integrity.refused && /faili|file/i.test(integrity.message), integrity.message);

  /* ------------------------------------------------- ST24 · case creation */
  await go(page, 'storage.cases');
  const casesBefore = await page.evaluate(async () => (await (await import('/src/services/storage.service.js')).listCases()).length);
  await clickAct(page, 'nav.case.new');
  await page.waitForTimeout(450);
  await page.fill('#stx-title', 'Mazungumzo ya usiku wa 14 Oktoba');
  await page.selectOption('#stx-kind', 'harassment');
  await page.fill('#stx-summary', 'Ujumbe wa vitisho kwa simu.');
  await page.click('.stx-form button[type="submit"]');
  await page.waitForTimeout(800);
  const createdCase = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const cases = await m.listCases();
    return {
      screen: window.GHStorage.state.screen,
      count: cases.length,
      screenCase: window.GHStorage.state.params.caseId,
      timeline: document.querySelectorAll('.stx-tl-item').length
    };
  });
  rec('ST24', 'A new case is created and opens on its own collection',
    createdCase.screen === 'storage.case' && createdCase.count === casesBefore + 1,
    `${casesBefore} → ${createdCase.count}`);

  /* --------------------------------------------------- ST25 · case linking */
  const linked = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const items = await m.allItems();
    const target = items.find((i) => !i.readOnly && !(i.caseIds || []).length && i.id.startsWith('st_demo'));
    const res = await m.linkToCase(target.id, window.GHStorage.state.params.caseId);
    const after = await m.getItem(target.id);
    const onCase = await m.itemsForCase(window.GHStorage.state.params.caseId);
    return {
      ok: res.ok,
      linked: (after.caseIds || []).includes(window.GHStorage.state.params.caseId),
      inCase: onCase.some((i) => i.id === target.id)
    };
  });
  rec('ST25', 'Attaching a record to a case is recorded on both sides',
    linked.ok && linked.linked && linked.inCase, JSON.stringify(linked));

  /* ------------------------------------------------------ ST26 · sharing */
  await go(page, 'storage.share', { id: 'st_demo_ev1' });
  const shareForm = await page.evaluate(() => ({
    honesty: /hakuna anayepokea|nobody receives/i.test(document.getElementById('ghStorageStage').innerText),
    target: !!document.querySelector('#stx-targetId')
  }));
  await page.fill('#stx-targetId', 'guardian-test');
  await page.fill('#stx-targetName', 'Neema Mushi (mlezi)');
  await page.selectOption('#stx-level', 'view');
  await page.click('.stx-form button[type="submit"]');
  await page.waitForTimeout(800);
  const shared = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const rows = (await m.listShares()).filter((s) => s.itemId === 'st_demo_ev1');
    return {
      screen: window.GHStorage.state.screen,
      rows: rows.length,
      newest: rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null,
      toast: document.getElementById('ghToast')?.textContent || ''
    };
  });
  rec('ST26', 'A share grant is written locally, is pending by default, and the page says nobody has access yet',
    shareForm.honesty && shared.rows >= 2 && shared.newest && shared.newest.status !== 'active' &&
    /kifaa hiki|this device/i.test(shared.toast),
    `${shared.rows} grants · ${shared.newest?.status} · ${shared.toast}`);

  /* ------------------------------------------------- ST27 · health pointers */
  const health = await page.evaluate(async () => {
    const healthStore = await import('/src/features/health/health-record-store.js');
    const before = await healthStore.records();
    if (!before.length) {
      healthStore.addRecord({ title: 'Matokeo ya maabara — CBC', category: 'lab', date: '2026-10-02', facility: 'Muhimbili' });
    }
    const rows = healthStore.records();
    const res = await window.GHStorage.syncHealth();
    const m = await import('/src/services/storage.service.js');
    const items = await m.allItems();
    const pointers = items.filter((i) => i.healthRef);
    return {
      healthRecords: rows.length,
      added: res.added,
      pointers: pointers.length,
      allReadOnly: pointers.every((p) => p.readOnly === true),
      noBlob: pointers.every((p) => !p.blobKey),
      pointsAtRealRecord: pointers.every((p) => rows.some((r) => r.id === p.healthRef.recordId)),
      noCopies: pointers.every((p) => p.source === 'health')
    };
  });
  rec('ST27', 'Health records appear as read-only pointers at the real records — never a copy of the file',
    health.pointers >= 1 && health.allReadOnly && health.noBlob && health.pointsAtRealRecord && health.noCopies,
    JSON.stringify(health));

  const healthGone = await page.evaluate(async () => {
    const store = await import('/src/features/health/health-record-store.js');
    const rows = store.records();
    const first = rows[0];
    store.removeRecord(first.id);
    const res = await window.GHStorage.syncHealth();
    const m = await import('/src/services/storage.service.js');
    const pointers = (await m.allItems()).filter((i) => i.healthRef);
    return {
      removed: res.removed,
      stillPointsAtDeleted: pointers.some((p) => p.healthRef.recordId === first.id),
      remaining: pointers.length
    };
  });
  rec('ST28', 'Deleting the health record removes the pointer on the next sync',
    healthGone.removed >= 1 && !healthGone.stillPointsAtDeleted,
    JSON.stringify(healthGone));

  /* -------------------------------------------------------- ST29 · usage */
  await go(page, 'storage.usage');
  const usage = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.stx-metarow')].map((r) => r.innerText.replace(/\n/g, ' · '));
    return {
      rows,
      hasTotal: rows.some((r) => /Jumla \(kifaa hiki\)/i.test(r)),
      hasPosts: rows.some((r) => /Chapisho/i.test(r)),
      hasDrafts: rows.some((r) => /Rasimu/i.test(r)),
      hasBlobs: rows.some((r) => /IndexedDB/i.test(r)),
      hasLocal: rows.some((r) => /localStorage/i.test(r))
    };
  });
  rec('ST29', 'The Space screen keeps every figure the old Storage sheet measured',
    usage.hasTotal && usage.hasPosts && usage.hasDrafts && usage.hasBlobs && usage.hasLocal,
    usage.rows.slice(0, 4).join(' | '));

  /* --------------------------------------------------- ST30 · archive/delete */
  const lifecycle = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const items = await m.allItems();
    const victim = items.find((i) => i.title === 'Ripoti ya polisi — Kijichi');
    const archived = await m.archiveItem(victim.id, true);
    const afterArchive = await m.getItem(victim.id);
    const live = (await m.allItems()).filter((i) => !i.archived && i.id === victim.id).length;
    const deleted = await m.deleteItem(victim.id);
    const gone = await m.getItem(victim.id);
    const trail = await m.custodyOf(victim.id);
    return {
      archived: archived.ok && afterArchive.archived === true && live === 0,
      deleted: deleted.ok && gone === null,
      trailKept: trail.length >= 2,
      lastEvent: trail[trail.length - 1]?.action || null
    };
  });
  rec('ST30', 'Archiving hides a record from the live list; deleting removes the row but keeps its custody trail',
    lifecycle.archived && lifecycle.deleted && lifecycle.trailKept,
    JSON.stringify(lifecycle));

  /* ------------------------------------------------ ST31 · samples removal */
  const cleared2 = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    const mine = await m.addItem({ title: 'Rekodi yangu binafsi', category: 'personal', subcategory: 'consents', privacy: 'private' });
    await m.clearSamples();
    const items = await m.allItems();
    return {
      ok: mine.ok,
      samples: items.filter((i) => i.sample).length,
      mineKept: items.some((i) => i.title === 'Rekodi yangu binafsi')
    };
  });
  rec('ST31', 'Clearing samples removes only samples — a record the user wrote survives',
    cleared2.ok && cleared2.samples === 0 && cleared2.mineKept, JSON.stringify(cleared2));

  /* --------------------------------------------------------- ST32 · empty */
  const empty = await page.evaluate(async () => {
    const m = await import('/src/services/storage.service.js');
    await m.resetAll();
    window.GHStorage.open('storage.home', {});
    await new Promise((r) => setTimeout(r, 600));
    const text = document.getElementById('ghStorageStage').innerText;
    return { hasState: !!document.querySelector('.stx-state'), text: text.slice(0, 120) };
  });
  rec('ST32', 'An empty store shows an honest empty state instead of a fake dashboard',
    empty.hasState, empty.text.replace(/\n/g, ' · '));

  /* --------------------------------------------- ST33 · Back and routing */
  await page.evaluate(() => window.GHStorage.seed());
  await page.waitForTimeout(500);
  await go(page, 'storage.item', { id: 'st_demo_ev1' });
  const backWalk = await page.evaluate(async () => {
    const onItem = !document.getElementById('ghStorageBack').hidden;
    document.querySelector('#storagePage [data-stx="back"]').click();
    await new Promise((r) => setTimeout(r, 600));
    const first = { screen: window.GHStorage.state.screen, hidden: document.getElementById('ghStorageBack').hidden };
    document.querySelector('#storagePage [data-stx="back"]').click();
    await new Promise((r) => setTimeout(r, 600));
    const second = { screen: window.GHStorage.state.screen, hidden: document.getElementById('ghStorageBack').hidden };
    return { onItem, first, second };
  });
  rec('ST33', 'Back walks up one level at a time and disappears on the dashboard',
    backWalk.onItem && backWalk.first.screen === 'storage.category' && !backWalk.first.hidden &&
    backWalk.second.screen === 'storage.home' && backWalk.second.hidden,
    JSON.stringify(backWalk));

  /* ------------------------------------------------ ST34 · keyboard & aria */
  const a11y = await page.evaluate(() => ({
    labelled: !!document.querySelector('#ghStorageStage[role="region"]'),
    live: document.getElementById('ghStorageStage')?.getAttribute('aria-live'),
    buttons: [...document.querySelectorAll('#storagePage button')].every((b) => (b.textContent || '').trim() || b.getAttribute('aria-label')),
    heads: [...document.querySelectorAll('#storagePage h1, #storagePage h2')].every((h) => (h.textContent || '').trim().length > 2)
  }));
  rec('ST34', 'The stage is a labelled live region and every control has a name',
    a11y.labelled && a11y.live === 'polite' && a11y.buttons && a11y.heads, JSON.stringify(a11y));

  /* ------------------------------------------------------ ST35 · responsive */
  const overflow = { wide: null, narrow: null };
  for (const [name, width] of [['narrow', 390], ['wide', 1280]]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [screen, params] of [['storage.home', {}], ['storage.all', {}], ['storage.item', { id: 'st_demo_ev1' }], ['storage.case', { caseId: 'case_demo_1' }]]) {
      await go(page, screen, params);
      const hit = await page.evaluate(() => {
        const scroller = (el) => {
          for (let n = el.parentElement; n && n.id !== 'storagePage'; n = n.parentElement) {
            const ox = getComputedStyle(n).overflowX;
            if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
          }
          return false;
        };
        const bad = [...document.querySelectorAll('#storagePage *')]
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 2 && !scroller(el));
        return bad.length ? `${bad[0].tagName}.${bad[0].className}` : null;
      });
      if (hit && !overflow[name]) overflow[name] = `${screen}: ${hit}`;
    }
  }
  rec('ST35', 'No screen pushes content past the viewport at 390 px or 1280 px',
    !overflow.narrow && !overflow.wide, JSON.stringify(overflow));

  await page.setViewportSize({ width: 390, height: 844 });

  /* ------------------------------------------------------------ ST36 · tab */
  const tabs = await page.evaluate(async () => {
    window.HomeUI.go('home');
    await new Promise((r) => setTimeout(r, 300));
    const home = document.getElementById('homePage').classList.contains('active') &&
      !document.getElementById('storagePage').classList.contains('active');
    window.HomeUI.go('storage');
    await new Promise((r) => setTimeout(r, 500));
    const storage = document.getElementById('storagePage').classList.contains('active') &&
      !document.getElementById('homePage').classList.contains('active');
    window.HomeUI.go('chat');
    await new Promise((r) => setTimeout(r, 500));
    const chat = document.getElementById('commPage').classList.contains('active') &&
      !document.getElementById('storagePage').classList.contains('active');
    return { home, storage, chat };
  });
  rec('ST36', 'The page switches cleanly with the rest of the app (no two pages at once)',
    tabs.home && tabs.storage && tabs.chat, JSON.stringify(tabs));

  /* ------------------------------------------------------------- final */
  rec('ST37', 'No page errors during the whole run', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  rec('ST38', 'No console errors during the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  const pass = R.filter((r) => r.ok).length;
  console.log(`\n${pass}/${R.length} checks passed`);
  console.log(pass === R.length ? 'RESULT: all checks passed' : 'RESULT: at least one check failed');
  await browser.close();
  process.exit(pass === R.length ? 0 : 1);
})().catch((err) => {
  console.log('FATAL', err && err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : err);
  process.exit(2);
});
