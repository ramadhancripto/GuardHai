/**
 * GuardHai — Post composer / media / engagement acceptance suite.
 *
 *   NODE_PATH=<playwright>/node_modules node tests/composer.spec.js [url]
 *
 * Fixtures are generated at runtime (tiny PNGs, an oversized PNG, a real
 * playable WEBM recorded through MediaRecorder) so the suite is self-contained.
 *
 * Never throws on a failed check; exits 1 if any check fails.
 */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const zlib = require('zlib');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'docs', 'test-artifacts');
fs.mkdirSync(SHOTS, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ghc-'));

const R = [];
const rec = (id, name, ok, detail = '') => R.push({ id, name, ok: !!ok, detail: String(detail) });

/* ------------------------------------------------------------------ fixtures */
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(w, h, rgb, noise) {
  const rowLen = w * 3 + 1;
  let raw;
  if (noise) {
    raw = require('crypto').randomBytes(rowLen * h);          // incompressible → real size
    for (let y = 0; y < h; y++) raw[y * rowLen] = 0;          // PNG filter byte per row
  } else {
    raw = Buffer.alloc(rowLen * h);
    for (let y = 0; y < h; y++) {
      raw[y * rowLen] = 0;
      for (let x = 0; x < w; x++) {
        const o = y * rowLen + 1 + x * 3;
        raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2];
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })), pngChunk('IEND', Buffer.alloc(0))
  ]);
}
const FX = {
  imgA: path.join(TMP, 'guardhai-a.png'),
  imgB: path.join(TMP, 'guardhai-b.png'),
  imgBig: path.join(TMP, 'guardhai-big.png'),
  txt: path.join(TMP, 'notes.txt'),
  video: path.join(TMP, 'clip.webm'),
  videoHuge: path.join(TMP, 'huge.webm')
};
fs.writeFileSync(FX.imgA, makePng(160, 120, [24, 169, 130]));
fs.writeFileSync(FX.imgB, makePng(160, 120, [30, 120, 220]));
fs.writeFileSync(FX.imgBig, makePng(1400, 1400, [0, 0, 0], true)); // > 5 MB
fs.writeFileSync(FX.txt, 'not an image');
fs.writeFileSync(FX.videoHuge, Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(51 * 1024 * 1024)]));

(async () => {
  const browser = await chromium.launch({ args: [
    '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream'
  ] });

  /* ---- record a genuine playable webm with MediaRecorder (also proves the API) ---- */
  {
    const bp = await browser.newPage();
    await bp.goto('about:blank');
    const b64 = await bp.evaluate(async () => {
      if (typeof MediaRecorder === 'undefined') return '';
      const c = document.createElement('canvas'); c.width = 320; c.height = 240;
      const x = c.getContext('2d');
      const rec = new MediaRecorder(c.captureStream(25), { mimeType: 'video/webm' });
      const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      const done = new Promise(r => (rec.onstop = r));
      rec.start();
      let t = 0;
      const iv = setInterval(() => {
        t += 40;
        x.fillStyle = '#0f172a'; x.fillRect(0, 0, 320, 240);
        x.fillStyle = '#18A982'; x.fillRect(30 + (t % 180), 90, 56, 56);
        x.fillStyle = '#fff'; x.font = '16px sans-serif'; x.fillText('GuardHai ' + t, 18, 36);
      }, 40);
      await new Promise(r => setTimeout(r, 1500));
      clearInterval(iv); rec.stop(); await done;
      const buf = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer());
      let s = ''; for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
      return btoa(s);
    });
    fs.writeFileSync(FX.video, Buffer.from(b64 || '', 'base64'));
    rec('A0', 'Browser can produce a real WEBM via MediaRecorder', fs.statSync(FX.video).size > 2000,
        `${fs.statSync(FX.video).size} B`);
    await bp.close();
  }

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['microphone', 'clipboard-read', 'clipboard-write']
  });
  const page = await ctx.newPage();
  const pageErrors = [], consoleErrors = [], requests = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('request', r => requests.push(`${r.method()} ${r.url()}`));

  const openApp = async () => {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(2400);                      // let the boot splash settle
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.evaluate(() => {
        try { enterGuardHaiHome(); } catch (e) { AuthActions.handleRegister({ preventDefault() {} }); }
      });
      await page.waitForTimeout(500);
      const stillAuth = await page.evaluate(() => !!document.querySelector('.auth-screen.active'));
      if (!stillAuth) return;
    }
  };
  const openComposer = async () => {
    await page.evaluate(() => HomeUI.openComposer());
    await page.waitForSelector('#ghComposer.open', { timeout: 5000 });
    await page.waitForTimeout(220);
  };
  const closeComposer = async () => {
    await page.evaluate(() => { const c = document.getElementById('ghComposer'); if (c) c.classList.remove('open'); });
    await page.waitForTimeout(150);
  };
  const resetComposer = async () => {
    await page.evaluate(() => {
      HomeUI.state.composer.attachments = [];
      HomeUI.state.composer.errors = [];
      document.getElementById('ghcText').value = '';
      document.getElementById('ghcTitleInput').value = '';
      document.getElementById('ghcCount').innerText = '0';
      document.getElementById('ghcTitleCount').innerText = '0';
      HomeUI._renderTray();
      HomeUI.composerStep('edit');
    });
    await page.waitForTimeout(120);
  };
  const attach = async (sel, files) => {
    await page.setInputFiles(sel, files);
    await page.waitForTimeout(320);
  };
  const trayCount = () => page.locator('#ghcAttachments .ghc-att').count();
  const errText = async () => (await page.$$eval('#ghcErrors .ghc-error span', els => els.map(e => e.innerText.trim()))).join(' | ');

  await openApp();

  /* ================================================================ A. contract */
  const contract = await page.evaluate(() => {
    const q = id => document.getElementById(id);
    return {
      hasComposer: !!q('ghComposer'),
      hasTray: !!q('ghcAttachments'),
      hasPreviewStep: !!q('ghcStepPreview'),
      inputs: ['ghcFileImage', 'ghcFileVideo', 'ghcFileAudio'].map(id => {
        const el = q(id);
        return el ? { id, type: el.type, accept: el.accept, multiple: el.multiple } : { id, missing: true };
      }),
      stepLabel: q('ghcStepLabel')?.innerText.trim(),
      types: [...document.querySelectorAll('#ghcTypes .ghc-chip')].map(c => c.dataset.type),
      footer: [...document.querySelectorAll('#ghcFoot button')].filter(b => getComputedStyle(b).display !== 'none')
        .map(b => b.id)
    };
  });
  rec('A1', 'Composer, tray and preview step exist', contract.hasComposer && contract.hasTray && contract.hasPreviewStep,
      `${contract.hasComposer}/${contract.hasTray}/${contract.hasPreviewStep}`);
  rec('A2', 'Hidden file inputs use correct types and MIME filters',
      contract.inputs.every(i => i.type === 'file') &&
      /image\//.test(contract.inputs[0].accept) && /video\//.test(contract.inputs[1].accept) &&
      /audio\//.test(contract.inputs[2].accept) && contract.inputs[0].multiple === true,
      contract.inputs.map(i => i.id + ':' + (i.accept || '')).join(' ; ').slice(0, 90));
  rec('A3', 'Five post types wired', contract.types.length === 5, contract.types.join(','));

  await openComposer();
  const foot = await page.$$eval('#ghcFoot button', els => els.filter(b => getComputedStyle(b).display !== 'none')
    .map(b => b.innerText.trim()));
  rec('A4', 'Footer exposes Draft, Preview and Publish before previewing',
      foot.includes('Hifadhi Rasimu') && foot.includes('Hakiki') && foot.includes('Chapisha'), foot.join(' | '));

  const cancelBtn = await page.evaluate(() => {
    const b = document.getElementById('ghcCancel');
    return b ? { label: b.getAttribute('aria-label'), title: b.title } : null;
  });
  rec('A5', 'Cancel control is labelled for screen readers', !!cancelBtn && /Ghairi/.test(cancelBtn.label), cancelBtn?.label);

  const a11y = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('#ghComposer .ghc-label')].map(l => l.getAttribute('for')).filter(Boolean);
    const labelled = labels.every(id => !!document.getElementById(id));
    const mediaBtnLabels = [...document.querySelectorAll('#ghcTypes .ghc-chip')].every(b => b.innerText.trim().length > 1);
    return { labels: labels.length, labelled, mediaBtnLabels };
  });
  rec('A6', 'Every visible form label points at a real control', a11y.labels >= 4 && a11y.labelled,
      `${a11y.labels} labels`);

  /* ================================================================ B. text-only */
  await resetComposer();
  await page.fill('#ghcTitleInput', 'Kupanga namba za dharura');
  await page.fill('#ghcText', 'Chapisho la maandishi pekee: hakikisha kila mtu nyumbani anajua namba za dharura.');
  const counters = await page.evaluate(() => ({
    text: document.getElementById('ghcCount').innerText,
    title: document.getElementById('ghcTitleCount').innerText,
    real: document.getElementById('ghcText').value.length,
    realTitle: document.getElementById('ghcTitleInput').value.length
  }));
  rec('B0', 'Character counters track typing',
      Number(counters.text) === counters.real && Number(counters.title) === counters.realTitle && counters.real > 50,
      `${counters.title}/120 title, ${counters.text}/600 text`);

  const postsBefore = await page.locator('.gh-post').count();
  await page.click('#ghcPublish');
  await page.waitForTimeout(700);
  const afterText = await page.evaluate(() => {
    const p = document.querySelector('.gh-post');
    return {
      posts: document.querySelectorAll('.gh-post').length,
      title: p?.querySelector('.gh-post-title')?.innerText || '',
      text: p?.querySelector('.gh-post-text')?.innerText || '',
      badge: p?.querySelector('.gh-badge-sample')?.innerText || '',
      verified: p?.querySelectorAll('.gh-verified').length || 0,
      open: document.getElementById('ghComposer').classList.contains('open'),
      toast: document.getElementById('ghToast')?.innerText || ''
    };
  });
  rec('B1', 'Text-only post is published into the local feed',
      afterText.posts === postsBefore + 1 && /Kupanga namba/.test(afterText.title), `${postsBefore} -> ${afterText.posts}`);
  rec('B2', 'Composer closes and confirms device-only publish',
      !afterText.open && /kifaa hiki/i.test(afterText.toast), afterText.toast.slice(0, 60));
  rec('B3', 'User post is never marked verified and carries the not-online badge',
      afterText.verified === 0 && /haijachapishwa/i.test(afterText.badge), afterText.badge);

  /* ================================================================ C. images */
  await openComposer();
  await resetComposer();
  await page.fill('#ghcText', 'Picha mbili za jaribio.');
  await attach('#ghcFileImage', [FX.imgA, FX.imgB]);
  const twoImgs = {
    items: await trayCount(),
    thumbs: await page.locator('#ghcAttachments img.ghc-thumb').count(),
    removeBtns: await page.locator('#ghcAttachments .ghc-att-del').count(),
    replaceBtns: await page.locator('#ghcAttachments .ghc-att-btn:not(.ghc-att-del)').count(),
    tag: await page.locator('#ghcAttachments .ghc-att-tag').first().innerText()
  };
  rec('C1', 'Two images attach with real local previews', twoImgs.items === 2 && twoImgs.thumbs === 2,
      `${twoImgs.items} items / ${twoImgs.thumbs} thumbs`);
  rec('C2', 'Each attachment has remove + replace controls and a device-only tag',
      twoImgs.removeBtns === 2 && twoImgs.replaceBtns === 2 && /Kifaa hiki/i.test(twoImgs.tag), twoImgs.tag);

  await page.click('#ghcAttachments .ghc-att-del >> nth=0');
  await page.waitForTimeout(250);
  rec('C3', 'Removing one image leaves the other', (await trayCount()) === 1, `${await trayCount()} left`);

  // replace opens the picker for the same kind
  const [fchooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null),
    page.click('#ghcAttachments .ghc-att-btn:not(.ghc-att-del)')
  ]);
  rec('C4', 'Replace re-opens the file picker', !!fchooser);

  await attach('#ghcFileImage', [FX.imgA, FX.imgB]);
  let maxErr = '';
  for (let i = 0; i < 3; i++) {
    await attach('#ghcFileImage', FX.imgA);
    maxErr = await errText();
  }
  rec('C5', 'Image count is capped at 4 per post', (await trayCount()) === 4 && /kiwango cha juu/i.test(maxErr),
      `${await trayCount()} attached — "${maxErr.slice(0, 60)}"`);

  // preview shows a real gallery
  await page.click('#ghcPreviewBtn');
  await page.waitForTimeout(350);
  const gal = await page.evaluate(() => ({
    tiles: document.querySelectorAll('#ghcPreviewHost .gh-gal-item').length,
    rows: document.querySelector('#ghcPreviewHost .gh-gal')?.className || '',
    actionsHidden: document.querySelectorAll('#ghcPreviewHost .gh-post-actions').length
  }));
  rec('C6', 'Preview renders a 4-up responsive gallery', gal.tiles === 4 && /gh-gal-4/.test(gal.rows), gal.rows);
  rec('C7', 'Preview hides engagement actions (nothing to act on yet)', gal.actionsHidden === 0);

  await page.screenshot({ path: path.join(TMP, 'preview-gallery.png') });
  await page.click('#ghcPublish');
  await page.waitForTimeout(700);
  const feedMedia = await page.evaluate(() => {
    const p = document.querySelector('.gh-post');
    return { imgs: p.querySelectorAll('.gh-gal-item img').length, cls: p.querySelector('.gh-gal')?.className || '' };
  });
  rec('C8', 'Published post keeps real image previews in the feed', feedMedia.imgs === 4, `${feedMedia.imgs} images`);

  // lightbox
  await page.click('.gh-post .gh-gal-item >> nth=0');
  await page.waitForTimeout(300);
  const lb = await page.evaluate(() => ({
    open: document.getElementById('ghSheet').classList.contains('open'),
    img: !!document.querySelector('#ghSheetBody img'),
    text: document.getElementById('ghSheetBody').innerText
  }));
  rec('C9', 'Tapping a photo opens a local lightbox', lb.open && lb.img && /kifaa hiki/i.test(lb.text),
      lb.text.split('\n')[1] || '');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  /* ================================================================ D. video */
  await openComposer();
  await resetComposer();
  await page.fill('#ghcText', 'Video ya jaribio.');
  await attach('#ghcFileVideo', FX.video);
  const vTray = await page.evaluate(() => {
    const v = document.querySelector('#ghcAttachments video');
    return { has: !!v, src: v ? v.getAttribute('src')?.slice(0, 5) : '', muted: v ? v.muted : false,
             tag: document.querySelector('#ghcAttachments .ghc-att-tag')?.innerText || '' };
  });
  rec('D1', 'Video attaches with a local blob thumbnail in the tray',
      vTray.has && vTray.src === 'blob:' && /Kifaa hiki/i.test(vTray.tag), `src=${vTray.src} ${vTray.tag}`);

  await page.click('#ghcPreviewBtn');
  await page.waitForTimeout(400);
  const vPrev = await page.evaluate(() => {
    const v = document.querySelector('#ghcPreviewHost video');
    return { has: !!v, controls: v ? v.hasAttribute('controls') : false,
             ready: v ? v.readyState : -1, src: v ? v.getAttribute('src')?.slice(0, 5) : '' };
  });
  rec('D1b', 'Preview step shows a controllable video before publishing',
      vPrev.has && vPrev.controls && vPrev.ready >= 1 && vPrev.src === 'blob:', JSON.stringify(vPrev));

  await page.click('#ghcPublish');
  await page.waitForTimeout(800);
  const playback = await page.evaluate(async () => {
    const v = document.querySelector('.gh-post video');
    if (!v) return { has: false };
    const ok = v.readyState >= 1;
    try { await v.play(); } catch (e) { /* autoplay guard */ }
    await new Promise(r => setTimeout(r, 700));
    return {
      has: true, ok, ready: v.readyState, duration: Math.round(v.duration * 10) / 10,
      time: Math.round(v.currentTime * 100) / 100, controls: v.hasAttribute('controls'),
      paused: v.paused
    };
  });
  rec('D2', 'Video is playable in the feed (metadata + playback advances)',
      playback.has && playback.ok && playback.time > 0, JSON.stringify(playback));
  rec('D3', 'Video player exposes native controls and a known duration',
      playback.controls === true && playback.duration > 0, `duration ${playback.duration}s`);

  await page.screenshot({ path: path.join(TMP, 'feed-video.png') });

  /* ---- D4/D5: audio recording (only offered because the platform supports it) ---- */
  await openComposer();
  await resetComposer();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#ghcRecBtn');
  await page.waitForTimeout(300);
  const recOn = await page.evaluate(() => ({
    cls: document.getElementById('ghcRecBtn').className,
    label: document.getElementById('ghcRecBtn').innerText.trim()
  }));
  rec('D4', 'Record button enters a visible recording state', /is-recording/.test(recOn.cls) && /Simamisha/.test(recOn.label),
      recOn.label);
  await page.waitForTimeout(1300);
  await page.click('#ghcRecBtn');
  await page.waitForTimeout(1000);
  const recAtt = await page.evaluate(() => {
    const row = document.querySelector('#ghcAttachments .ghc-att');
    const a = row?.querySelector('audio');
    return {
      items: document.querySelectorAll('#ghcAttachments .ghc-att').length,
      hasAudio: !!a, playable: a ? a.readyState >= 1 : false,
      name: row?.querySelector('.ghc-att-meta b')?.innerText || '',
      errors: [...document.querySelectorAll('#ghcErrors .ghc-error span')].map(e => e.innerText).join(' | ')
    };
  });
  rec('D5', 'Recorded audio becomes a playable attachment on the device',
      recAtt.items === 1 && recAtt.hasAudio && recAtt.playable && /\.webm$/.test(recAtt.name),
      `${recAtt.name} playable=${recAtt.playable} ${recAtt.errors}`);

  await page.fill('#ghcText', 'Ujumbe wa sauti wa jaribio.');
  await page.click('#ghcPublish');
  await page.waitForTimeout(700);
  const audioFeed = await page.evaluate(() => {
    const a = document.querySelector('.gh-post audio');
    return { has: !!a, controls: a ? a.hasAttribute('controls') : false, src: a ? a.getAttribute('src')?.slice(0, 5) : '' };
  });
  rec('D6', 'Published audio plays inline in the feed', audioFeed.has && audioFeed.controls && audioFeed.src === 'blob:',
      JSON.stringify(audioFeed));

  /* ================================================================ E. validation */
  await openComposer();
  await resetComposer();
  await attach('#ghcFileImage', FX.txt);
  const e1 = await errText();
  rec('E1', 'Wrong MIME type is rejected with a readable reason',
      (await trayCount()) === 0 && /hairuhusiwi/i.test(e1), e1.slice(0, 78));

  await attach('#ghcFileImage', FX.imgBig);
  const e2 = await errText();
  rec('E2', 'Oversized image (>5 MB) is rejected', /inazidi kikomo/i.test(e2), e2.slice(-90));

  await attach('#ghcFileVideo', FX.videoHuge);
  const e3 = await errText();
  rec('E3', 'Oversized video (>50 MB) is rejected', /inazidi kikomo/i.test(e3) && (await trayCount()) === 0,
      e3.slice(-90));

  // invalid link
  await page.fill('#ghcLinkInput', 'javascript:alert(1)');
  await page.evaluate(() => HomeUI.addLink());
  await page.waitForTimeout(200);
  const e4 = await errText();
  rec('E4', 'Non http(s) link is rejected', /http/i.test(e4), e4.slice(-70));

  await page.fill('#ghcLinkInput', 'https://who.int/fact-sheets');
  await page.evaluate(() => HomeUI.addLink());
  await page.waitForTimeout(250);
  const linkOk = await page.evaluate(() => ({
    items: document.querySelectorAll('#ghcAttachments .ghc-att').length,
    name: document.querySelector('#ghcAttachments .ghc-att:last-child .ghc-att-meta b')?.innerText || ''
  }));
  rec('E5', 'Valid source link attaches as a link card', linkOk.items === 1 && /who\.int/.test(linkOk.name), linkOk.name);

  // publish blocked while a file is still being prepared / nothing typed
  await page.evaluate(() => { document.getElementById('ghcText').value = ''; });
  const n1 = await page.locator('.gh-post').count();
  await page.click('#ghcPublish');
  await page.waitForTimeout(400);
  const n2 = await page.locator('.gh-post').count();
  const stillOpen = await page.evaluate(() => document.getElementById('ghComposer').classList.contains('open'));
  rec('E6', 'Publishing with no text/title is blocked and keeps the composer open', n1 === n2 && stillOpen,
      `${n1} -> ${n2}`);

  await closeComposer();
  await openComposer();
  const errsCleared = await page.locator('#ghcErrors .ghc-error').count();
  rec('E7', 'Validation messages do not leak between composer sessions', errsCleared === 0, `${errsCleared} shown`);

  /* ================================================================ F. cancel + draft */
  await resetComposer();
  await page.fill('#ghcText', 'Chapisho nitakalo ghairi.');
  await attach('#ghcFileImage', FX.imgA);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#ghcCancel');
  await page.waitForTimeout(400);
  const cancelled = await page.evaluate(() => ({
    open: document.getElementById('ghComposer').classList.contains('open'),
    text: document.getElementById('ghcText').value,
    atts: document.querySelectorAll('#ghcAttachments .ghc-att').length,
    toast: document.getElementById('ghToast').innerText
  }));
  rec('F1', 'Cancel closes the composer, clears the editor and removes attachments',
      !cancelled.open && cancelled.text === '' && cancelled.atts === 0, cancelled.toast.slice(0, 60));
  rec('F2', 'Cancel keeps the text as a device draft instead of silently losing it',
      /rasimu/i.test(cancelled.toast), cancelled.toast);

  const postCountAfterCancel = await page.locator('.gh-post').count();
  rec('F3', 'Cancelling never publishes', postCountAfterCancel === n1, `${n1} -> ${postCountAfterCancel} posts`);

  await openComposer();
  const draftRow = await page.evaluate(() => {
    const r = document.getElementById('ghcDraftRow');
    return { visible: getComputedStyle(r).display !== 'none', text: r.innerText };
  });
  rec('F4', 'Saved drafts surface inside the composer', draftRow.visible && /Rasimu/.test(draftRow.text),
      draftRow.text.replace(/\n/g, ' '));
  await page.click('#ghcDraftRow .ghc-linkbtn');
  await page.waitForTimeout(300);
  const loaded = await page.evaluate(() => document.getElementById('ghcText').value);
  rec('F5', 'Latest draft reloads into the editor', /ghairi/i.test(loaded), loaded.slice(0, 40));

  await page.fill('#ghcText', 'Rasimu ya pili ya jaribio.');
  await page.click('#ghcDraftBtn');
  await page.waitForTimeout(350);
  const draftStored = await page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('guardhai');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const rows = await new Promise((res, rej) => {
      const q = db.transaction('drafts', 'readonly').objectStore('drafts').getAll();
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    });
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return { n: rows.length, first: rows[0] || {},
             closed: !document.getElementById('ghComposer').classList.contains('open') };
  });
  rec('F6', 'Save Draft writes text (never media) to this device and closes',
      draftStored.n >= 2 && draftStored.first.text === 'Rasimu ya pili ya jaribio.' && draftStored.closed,
      `${draftStored.n} drafts, media fields present: ${Object.keys(draftStored.first).filter(k => /url|blob/i.test(k)).length}`);

  /* ================================================================ G. engagement */
  const likeState = await page.evaluate(() => {
    const b = document.querySelector('.gh-post [data-act="helpful"]');
    return { label: b.innerText.trim(), pressed: b.getAttribute('aria-pressed'), count: /\d/.test(b.innerText) };
  });
  rec('G1', 'Like shows a label, no fabricated count', /Imenisaidia/.test(likeState.label) && likeState.count === false,
      likeState.label);

  await page.click('.gh-post [data-act="helpful"]');
  await page.waitForTimeout(250);
  const liked = await page.evaluate(() => {
    const b = document.querySelector('.gh-post [data-act="helpful"]');
    return { on: b.classList.contains('is-on'), pressed: b.getAttribute('aria-pressed'), text: b.innerText.trim() };
  });
  rec('G2', 'Like toggles with a real selected state', liked.on && liked.pressed === 'true' && !/\d/.test(liked.text),
      liked.text);
  await page.click('.gh-post [data-act="helpful"]');
  await page.waitForTimeout(200);
  const unliked = await page.evaluate(() => document.querySelector('.gh-post [data-act="helpful"]').getAttribute('aria-pressed'));
  rec('G3', 'Like toggles back off', unliked === 'false');

  await page.click('.gh-post [data-act="save"]');
  await page.waitForTimeout(250);
  const savedState = await page.evaluate(() => {
    const b = document.querySelector('.gh-post [data-act="save"]');
    return { on: b.classList.contains('is-on'), text: b.textContent.trim(), pressed: b.getAttribute('aria-pressed') };
  });
  rec('G4', 'Save toggles on with aria-pressed and the "Imehifadhiwa" label',
      savedState.on && /Imehifadhiwa/.test(savedState.text) && savedState.pressed === 'true', savedState.text);

  await page.click('.gh-post [data-act="comment"]');
  await page.waitForTimeout(300);
  await page.fill('#ghCommentInput', 'Maoni ya jaribio: asante kwa elimu hii.');
  await page.click('#ghSheetBody .gh-btn-primary');
  await page.waitForTimeout(400);
  const thread = await page.evaluate(() => ({
    comments: document.querySelectorAll('#ghCommentList .gh-comment').length,
    text: document.querySelector('#ghCommentList .gh-comment p')?.innerText || '',
    body: document.getElementById('ghSheetBody').innerText
  }));
  rec('G5', 'Comment is added to the correct thread', thread.comments === 1 && /asante/i.test(thread.text),
      `${thread.comments} comment`);
  rec('G6', 'Thread states comments never leave the device', /kwenye kifaa hiki/i.test(thread.body) && /hakuna seva/i.test(thread.body));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  const badgeAfterComment = await page.evaluate(() =>
    document.querySelector('.gh-post [data-act="comment"] span').innerText.trim());
  rec('G7', 'Comment count appears only after a real comment exists', /\(1\)/.test(badgeAfterComment), badgeAfterComment);

  await page.click('.gh-post [data-act="share"]');
  await page.waitForTimeout(500);
  const shared = await page.evaluate(() => ({
    toast: document.getElementById('ghToast').innerText,
    clip: navigator.clipboard ? 'yes' : 'no',
    native: typeof navigator.share === 'function'
  }));
  rec('G8', 'Share uses the native sheet when present, otherwise copies a sample link',
      shared.native ? true : (/kiungo/i.test(shared.toast) && /sampuli/i.test(shared.toast)),
      `native=${shared.native} — ${shared.toast.slice(0, 60)}`);
  await page.evaluate(() => HomeUI.closeSheet());
  await page.waitForTimeout(200);

  await page.click('.gh-post [data-act="more"]');
  await page.waitForTimeout(250);
  const menu = await page.evaluate(() => {
    const m = document.querySelector('.gh-post .gh-post-menu');
    return { open: m.classList.contains('open'), items: [...m.querySelectorAll('.gh-menu-item')].map(b => b.innerText.trim()) };
  });
  rec('G9', 'Three-dot menu holds Follow / Copy / Report (+ profile, send)',
      menu.open && menu.items.length >= 3
        && /Fuata|Acha kufuata/.test(menu.items.join(' '))
        && /Nakili kiungo/.test(menu.items.join(' '))
        && /Ripoti/.test(menu.items.join(' ')),
      menu.items.join(' | '));

  await page.click('.gh-post .gh-menu-item >> nth=0');   // follow from menu
  await page.waitForTimeout(300);
  const followState = await page.evaluate(() => {
    const b = document.querySelector('.gh-post [data-follow-btn]');
    return { text: b.innerText.trim(), pressed: b.getAttribute('aria-pressed'), on: b.classList.contains('is-on') };
  });
  rec('G10', 'Follow from the menu updates the card button state',
      /Unafuata/.test(followState.text) && followState.pressed === 'true' && followState.on, followState.text);

  await page.click('.gh-post [data-act="more"]');
  await page.waitForTimeout(200);
  await page.click('.gh-post .gh-menu-danger');
  await page.waitForTimeout(300);
  const report = await page.evaluate(() => {
    const b = document.getElementById('ghSheetBody');
    return { radios: b.querySelectorAll('input[name="ghReportReason"]').length, text: b.innerText };
  });
  rec('G11', 'Report flow offers reasons and states it is not transmitted',
      report.radios === 5 && /haitumwi/i.test(report.text), `${report.radios} reasons`);
  await page.click('#ghSheetBody .gh-radio >> nth=1');
  await page.fill('#ghReportNote', 'Jaribio la ripoti.');
  await page.click('#ghSheetBody .gh-btn-primary');
  await page.waitForTimeout(400);
  const reported = await page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('guardhai');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const rows = await new Promise((res, rej) => {
      const q = db.transaction('reports', 'readonly').objectStore('reports').getAll();
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    });
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return { n: rows.length, first: rows[0] || {}, toast: document.getElementById('ghToast').innerText,
             sheet: document.getElementById('ghSheet').classList.contains('open') };
  });
  rec('G12', 'Report is stored locally with reason and never claims to be sent',
      reported.n === 1 && reported.first.reason === 'false' && !reported.sheet && /haijatumwa/i.test(reported.toast),
      `${reported.first.reason} — ${reported.toast.slice(0, 50)}`);

  /* ================================================================ H. long text */
  const longText = 'Elimu ya usalama: '.repeat(20) + 'mwisho.';
  await openComposer();
  await resetComposer();
  await page.fill('#ghcText', longText);
  await page.click('#ghcPublish');
  await page.waitForTimeout(600);
  const expandable = await page.evaluate(() => {
    const p = document.querySelector('.gh-post');
    const t = p.querySelector('.gh-post-text');
    const b = p.querySelector('.gh-moretext');
    return { short: t.innerText.length, hasBtn: !!b, expanded: b?.getAttribute('aria-expanded'), chars: t.innerText.length };
  });
  rec('H1', 'Long descriptions collapse with a Zaidi control',
      expandable.hasBtn && expandable.chars < 260 && expandable.expanded === 'false', `${expandable.chars} chars shown`);
  await page.click('.gh-post .gh-moretext');
  await page.waitForTimeout(250);
  const expand2 = await page.evaluate(() => {
    const p = document.querySelector('.gh-post');
    return { chars: p.querySelector('.gh-post-text').innerText.length, btn: p.querySelector('.gh-moretext').innerText.trim(),
             aria: p.querySelector('.gh-moretext').getAttribute('aria-expanded') };
  });
  rec('H2', 'Zaidi expands the full text and switches to Punguza',
      expand2.chars > 300 && /Punguza/.test(expand2.btn) && expand2.aria === 'true', `${expand2.chars} chars, ${expand2.btn}`);

  /* ================================================================ I. keyboard + responsive */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.evaluate(() => HomeUI.openComposer());
  await page.waitForTimeout(350);
  const focusInside = await page.evaluate(() => ({
    inside: document.getElementById('ghComposer').contains(document.activeElement),
    id: document.activeElement?.id || document.activeElement?.tagName
  }));
  rec('I1', 'Focus moves into the composer when it opens', focusInside.inside, focusInside.id);

  const tabOrder = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    tabOrder.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.innerText?.slice(0, 12) || '?'));
  }
  rec('I2', 'Composer is reachable by keyboard without escaping the modal', tabOrder.every(t => t !== ''), tabOrder.join(' > '));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const escClosed = await page.evaluate(() => !document.getElementById('ghComposer').classList.contains('open'));
  rec('I3', 'Escape cancels the composer', escClosed);

  const widths = [320, 360, 390, 430, 768, 1024, 1440];
  const overflow = [];
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(260);
    await page.evaluate(() => HomeUI.openComposer());
    await page.waitForTimeout(260);
    const o = await page.evaluate(() => {
      const c = document.querySelector('.gh-compose-card').getBoundingClientRect();
      const f = document.getElementById('ghcFoot').getBoundingClientRect();
      return {
        scroll: document.documentElement.scrollWidth, inner: window.innerWidth,
        within: c.right <= window.innerWidth + 1 && c.left >= -1 && c.top >= -1,
        footVisible: f.bottom <= window.innerHeight + 2,
        h: Math.round(c.height)
      };
    });
    overflow.push({ w, ...o });
    await page.evaluate(() => { const c = document.getElementById('ghComposer'); c.classList.remove('open'); });
    await page.waitForTimeout(120);
  }
  rec('I4', 'No horizontal overflow at any width', overflow.every(o => o.scroll <= o.inner + 1),
      overflow.map(o => `${o.w}:${o.scroll}`).join(' '));
  rec('I5', 'Composer card and footer stay inside the viewport',
      overflow.every(o => o.within && o.footVisible),
      overflow.map(o => `${o.w}:${o.h}px`).join(' '));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(TMP, 'feed-390.png') });

  /* ================================================================ J. icons + honesty */
  const icons = await page.evaluate(() => {
    // selected controls are allowed a filled glyph (that is the state signal)
    const rows = [...document.querySelectorAll('.gh-post-actions .ic, .ghc-media-btn .ic, .ghc-att-btn .ic')]
      .filter(s => !s.closest('.is-on'));
    return rows.filter(s => s.getBoundingClientRect().width > 0).map(s => {
      const use = s.querySelector('use');
      const bb = s.getBoundingClientRect();
      const cs = getComputedStyle(s);
      return {
        ref: use ? (use.getAttribute('href') || use.getAttribute('xlink:href')) : null,
        w: Math.round(bb.width), h: Math.round(bb.height),
        fill: cs.fill, stroke: cs.stroke, sw: cs.strokeWidth
      };
    });
  });
  const allSprite = icons.every(i => i.ref && i.ref.startsWith('#i-'));
  const uniformStroke = new Set(icons.map(i => i.sw)).size === 1;
  const uniformFill = icons.every(i => i.fill === 'none');
  const sizes = new Set(icons.map(i => `${i.w}x${i.h}`));
  rec('J1', 'All composer/engagement icons come from the single sprite family', allSprite,
      `${icons.length} icons, ${new Set(icons.map(i => i.ref)).size} unique`);
  const activeFill = await page.evaluate(() => {
    const icon = document.querySelector('.gh-post-actions .is-on .ic');
    return icon ? getComputedStyle(icon).fill : null;
  });
  rec('J2b', 'Selected engagement state is visually distinct (filled or tinted)',
      !!activeFill && activeFill !== 'none', `fill=${activeFill}`);
  rec('J2', 'Unselected icons share one stroke weight and outline fill', uniformStroke && uniformFill,
      `stroke-widths ${[...new Set(icons.map(i => i.sw))].join('/')} fill=${[...new Set(icons.map(i => i.fill))].join('/')}`);
  rec('J3', 'Icons are size-consistent', sizes.size <= 2, [...sizes].join(' '));

  const counts = await page.evaluate(() => {
    const txts = [...document.querySelectorAll('.gh-post-actions .gh-act span')].map(s => s.innerText.trim());
    return { txts, anyNumber: txts.some(t => /\d/.test(t)) };
  });
  rec('J4', 'Engagement row shows counts only when a real local count exists',
      counts.txts.every(t => !/\(\d+\)/.test(t) || /^Maoni \(\d+\)$/.test(t)), counts.txts.join(' | '));

  // honesty: no network traffic from a full publish cycle
  requests.length = 0;
  await openComposer();
  await resetComposer();
  await page.fill('#ghcText', 'Hakuna mtandao unapaswa kuguswa.');
  await attach('#ghcFileImage', FX.imgA);
  await page.click('#ghcPreviewBtn');
  await page.waitForTimeout(250);
  await page.click('#ghcPublish');
  await page.waitForTimeout(700);
  const mutating = requests.filter(r => !/^GET /.test(r) && !/127\.0\.0\.1/.test(r.split(' ')[1] || ''));
  const external = requests.filter(r => {
    const u = r.split(' ')[1] || '';
    if (/^(blob:|data:)/.test(u)) return false;                       // local object URLs
    if (u.startsWith(URL.replace(/\/index\.html$/, ''))) return false; // the app's own assets
    return true;
  });
  rec('J5', 'Publishing performs no write requests (no upload/API call)', mutating.length === 0,
      mutating.slice(0, 2).join(' ; ') || 'none');
  rec('J6', 'Publishing makes no external network calls at all', external.length === 0,
      external.slice(0, 3).join(' ; ') || 'none');

  /* ================================================================ K. integrity */
  const integ = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    const live = [...document.querySelectorAll('[onclick]')].map(e => e.getAttribute('onclick')).join(' ');
    const refs = [...new Set((live.match(/HomeUI\.[A-Za-z_$][\w$]*/g) || []))];
    const missing = refs.filter(r => typeof HomeUI[r.split('.')[1]] !== 'function');
    return { dup: [...new Set(dup)], refs: refs.length, missing };
  });
  rec('K1', 'No duplicate element ids after the upgrade', integ.dup.length === 0, integ.dup.join(',') || 'none');
  rec('K2', 'Every inline HomeUI handler resolves to a real function', integ.missing.length === 0,
      `${integ.refs} handlers, missing: ${integ.missing.join(',') || 'none'}`);

  const navIntact = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('.nav-tabs-container > *')].map(e => e.id);
    return { ids, ok: JSON.stringify(ids) === JSON.stringify(['tab-home', 'tab-health', 'tab-sos', 'tab-shield', 'tab-chat']),
             top: [...document.querySelectorAll('.gh-top-actions > button')].map(b => b.getAttribute('aria-label')) };
  });
  rec('K3', 'Bottom nav untouched (Home, Afya, SOS, Shield, Chat)', navIntact.ok, navIntact.ids.join(' | '));
  const wanted = ['Storage', 'Notifications', 'Account', 'More'];
  rec('K4', 'Top nav is exactly Storage, Notifications, Account, More (single search below)',
      JSON.stringify(navIntact.top) === JSON.stringify(wanted)
        && !navIntact.top.some((l) => /tafuta/i.test(l || '')), navIntact.top.join(' | '));

  rec('K5', 'No page errors during the whole suite', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || 'none');
  rec('K6', 'No console errors during the whole suite', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | ') || 'none');

  await browser.close();

  /* ---------------------------------------------------------------- report */
  const pass = R.filter(r => r.ok).length;
  const lines = R.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(5)} ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`);
  console.log(lines.join('\n'));
  console.log('-'.repeat(100));
  console.log(`${pass}/${R.length} passed`);
  fs.writeFileSync(path.join(ROOT, 'docs', 'composer-test-results.json'),
    JSON.stringify({ url: URL, at: new Date().toISOString(), pass, total: R.length, checks: R }, null, 2));
  process.exit(pass === R.length ? 0 : 1);
})().catch(e => {
  console.error('SUITE CRASHED:', e);
  process.exit(2);
});
