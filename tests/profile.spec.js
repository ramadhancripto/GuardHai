/**
 * GuardHai — profile & role presentation suite.
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/profile.spec.js [url]
 *
 * Covers: the five role personas, distinct accents/icons, the profile sheet,
 * evidence-based verification (licence ≠ institution), the rule that a role
 * never grants a badge, follow persistence, the honest "message" state, editing
 * the owner's profile, and comment replies.
 *
 * Never throws on a failed check; exits 1 if any check fails.
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const R = [];
const rec = (id, name, ok, detail = '') => R.push({ id, name, ok, detail });

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  const boot = async () => {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
    await page.waitForTimeout(800);
  };

  const openFirstAuthor = async () => {
    await page.evaluate(() => document.querySelector('#ghFeed .gh-post-author')?.click());
    await page.waitForSelector('#ghProfile.open', { timeout: 5000 });
    await page.waitForTimeout(350);
  };

  const closeProfile = async () => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  };

  await boot();

  /* ============================================================ A. personas */
  const roster = await page.evaluate(async () => {
    const { listProfiles, presentationOf } = await import('./src/services/profile.service.js');
    const people = await listProfiles();
    return people.map((p) => {
      const pres = presentationOf(p);
      return {
        id: p.id, name: p.name, sample: p.sample,
        role: pres.role.id, icon: pres.role.icon, accent: pres.role.accent,
        roles: p.roles, badges: pres.badges.map((b) => b.id)
      };
    });
  });
  const samples = roster.filter((p) => p.sample);
  rec('P1', 'Five sample personas with distinct primary roles',
      samples.length >= 5 && new Set(samples.map((p) => p.role)).size === 5,
      samples.map((p) => `${p.name}:${p.role}`).join(' | ').slice(0, 90));

  const roleAccents = new Set(samples.map((p) => p.accent));
  const roleIcons = new Set(samples.map((p) => p.icon));
  rec('P2', 'Each role has its own accent colour and icon',
      roleAccents.size === 5 && roleIcons.size === 5,
      `${roleAccents.size} accents · ${roleIcons.size} icons`);

  rec('P3', 'Sample personas carry the Sampuli badge and nothing stronger',
      samples.every((p) => p.badges.length === 1 && p.badges[0] === 'sample'),
      samples.map((p) => p.badges.join(',')).join(' | '));

  /* ============================================================ B. profile */
  await openFirstAuthor();
  const card = await page.evaluate(() => ({
    open: document.getElementById('ghProfile')?.classList.contains('open'),
    name: document.querySelector('.gh-profile-name')?.innerText.trim(),
    roleLine: document.querySelector('.gh-profile-roleline')?.innerText.trim(),
    badges: [...document.querySelectorAll('.gh-profile-badges .gh-badge')].map((b) => b.innerText.trim()),
    avatarBg: getComputedStyle(document.querySelector('.gh-profile-avatar')).backgroundColor,
    stats: [...document.querySelectorAll('.gh-profile-stats b')].map((b) => b.innerText.trim()),
    actions: [...document.querySelectorAll('.gh-profile-actions .gh-btn')].map((b) => b.innerText.trim())
  }));
  rec('P4', 'Avatar in the feed opens the author profile',
      card.open && !!card.name, `${card.name} · ${card.roleLine}`);
  rec('P5', 'Profile shows role, badges and real counts',
      /Mtaalamu wa Afya|Mtaalamu wa Usalama|Mwanajamii|Taasisi|Kujitolea/.test(card.roleLine || '')
        && card.badges.length >= 1 && card.stats.length === 3,
      `${card.roleLine} · ${card.badges.join(',')} · ${card.stats.join('/')}`);
  rec('P6', 'Profile exposes Follow and Message actions',
      card.actions.some((a) => /Fuata/.test(a)) && card.actions.some((a) => /ujumbe/i.test(a)),
      card.actions.join(' | '));

  /* --------------------------------------------------- C. verification tab */
  await page.click('[data-profile-tab="about"]');
  await page.waitForTimeout(300);
  const about = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('.gh-verify-row')].map((r) => ({
      label: r.querySelector('b')?.innerText.trim(),
      state: r.querySelector('.gh-verify-state')?.className
    })),
    text: document.querySelector('.gh-profile-about')?.innerText || '',
    roleChips: document.querySelectorAll('.gh-role-chip').length
  }));
  rec('P7', 'Licence and institution verification are separate rows',
      about.rows.length === 2
        && /leseni/i.test(about.rows[0].label) && /taasisi/i.test(about.rows[1].label),
      about.rows.map((r) => r.label).join(' | '));
  rec('P8', 'Sample profile shows no verified state on either kind',
      about.rows.every((r) => !/is-ok/.test(r.state)),
      about.rows.map((r) => r.state.replace('gh-verify-state ', '')).join(' | '));
  rec('P9', 'Multiple roles render as chips; the copy states role ≠ verification',
      about.roleChips >= 1 && /si uthibitisho|Hakuna beji/i.test(about.text),
      `${about.roleChips} chips`);

  /* ------------------------------------------------------- D. follow state */
  await page.click('[data-profile-tab="posts"]');
  await page.waitForTimeout(250);
  const followed = await page.evaluate(async () => {
    const btn = document.querySelector('[data-profile-action="follow"]');
    btn.click();
    await new Promise((r) => setTimeout(r, 350));
    const again = document.querySelector('[data-profile-action="follow"]');
    return { pressed: again?.getAttribute('aria-pressed'), text: again?.innerText.trim() };
  });
  rec('P10', 'Follow from the profile persists on the button',
      followed.pressed === 'true' && /Unafuata/.test(followed.text || ''),
      `${followed.text}`);

  await closeProfile();
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1900);
  const followAfterReload = await page.evaluate(async () => {
    const { isFollowing } = await import('./src/services/profile.service.js');
    return isFollowing('author-health');
  });
  rec('P11', 'Follow survives a reload (stored on this device)', followAfterReload === true,
      String(followAfterReload));

  /* --------------------------------------------------------- E. messaging */
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(600);
  await openFirstAuthor();
  const msg = await page.evaluate(async () => {
    const before = document.querySelectorAll('.gh-profile').length;
    document.querySelector('[data-profile-action="message"]').click();
    await new Promise((r) => setTimeout(r, 400));
    return {
      toast: document.getElementById('ghToast')?.innerText || '',
      overlays: document.querySelectorAll('.gh-profile').length - before,
      note: document.getElementById('ghMsgNote')?.innerText || ''
    };
  });
  rec('P12', 'Message states it is not connected (no fake chat)',
      /hakuna seva|haijaunganishwa/i.test(msg.toast + msg.note) && msg.overlays === 0,
      (msg.toast || msg.note).slice(0, 70));
  await closeProfile();

  /* ------------------------------------------------------- F. own profile */
  await page.evaluate(() => HomeUI.openMyProfile());
  await page.waitForSelector('#ghProfile.open');
  await page.waitForTimeout(300);
  const own = await page.evaluate(() => ({
    isSelf: !!document.querySelector('[data-profile-action="edit"]'),
    name: document.querySelector('.gh-profile-name')?.innerText.trim()
  }));
  rec('P13', 'The device owner gets an editable profile', own.isSelf, own.name);

  await page.click('[data-profile-action="edit"]');
  await page.waitForTimeout(400);
  await page.fill('#ghPeName', 'Neema A. Mushi');
  await page.fill('#ghPeBio', 'Nashiriki elimu ya usalama na afya ya jamii.');
  await page.click('[data-pe-role="health"]');
  await page.click('[data-pe-topic="Afya"]');
  await page.click('[data-pe-action="save"]');
  await page.waitForTimeout(700);

  const saved = await page.evaluate(() => ({
    name: document.querySelector('.gh-profile-name')?.innerText.trim(),
    role: document.querySelector('.gh-profile-roleline')?.innerText.trim(),
    badges: [...document.querySelectorAll('.gh-profile-badges .gh-badge')].map((b) => b.innerText.trim())
  }));
  rec('P14', 'Editing name/role/topics updates the profile immediately',
      saved.name === 'Neema A. Mushi' && /Afya/.test(saved.role),
      `${saved.name} · ${saved.role}`);

  rec('P15', 'Choosing a professional role grants no verification badge',
      !saved.badges.some((b) => /Leseni|Taasisi/i.test(b)),
      saved.badges.join(',') || 'no badges');

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1900);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(600);
  await page.evaluate(() => HomeUI.openMyProfile());
  await page.waitForSelector('#ghProfile.open');
  await page.waitForTimeout(300);
  const persisted = await page.$eval('.gh-profile-name', (e) => e.innerText.trim());
  rec('P16', 'Profile edits persist after a reload', persisted === 'Neema A. Mushi', persisted);

  /* ---------------------------------------------------------- G. replies */
  await closeProfile();
  await page.click('#ghFeed .gh-post [data-act="comment"]');
  await page.waitForSelector('#ghCommentInput');
  await page.fill('#ghCommentInput', 'Swali: ni muda gani wa kusubiri?');
  await page.click('[data-sheet-action="add-comment"]');
  await page.waitForTimeout(500);
  await page.click('[data-reply]');
  await page.waitForTimeout(250);
  const replyBanner = await page.evaluate(() => ({
    visible: !document.getElementById('ghReplyBanner')?.hidden,
    text: document.getElementById('ghReplyWho')?.innerText || ''
  }));
  await page.fill('#ghCommentInput', 'Asante, nimeelewa.');
  await page.click('[data-sheet-action="add-comment"]');
  await page.waitForTimeout(600);
  const thread = await page.evaluate(() => ({
    roots: document.querySelectorAll('#ghCommentList > .gh-comment').length,
    replies: document.querySelectorAll('.gh-comment-replies .gh-comment').length
  }));
  rec('G1', 'Replying marks the target and nests the reply',
      replyBanner.visible && /Unajibu/.test(replyBanner.text) && thread.replies === 1,
      `${thread.roots} comments · ${thread.replies} reply`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  /* ------------------------------------------------------- H. regressions */
  const stillWorks = await page.evaluate(async () => {
    const btn = document.querySelector('.gh-post [data-act="helpful"]');
    btn.click();
    await new Promise((r) => setTimeout(r, 300));
    return {
      pressed: document.querySelector('.gh-post [data-act="helpful"]')?.getAttribute('aria-pressed'),
      acts: document.querySelectorAll('.gh-post:first-child .gh-act').length
    };
  });
  rec('H1', 'All five engagement actions still present after the redesign',
      stillWorks.acts === 5 && stillWorks.pressed === 'true',
      `${stillWorks.acts} actions · helpful=${stillWorks.pressed}`);

  rec('H2', 'No page errors during the profile suite', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  rec('H3', 'No console errors during the profile suite', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

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
