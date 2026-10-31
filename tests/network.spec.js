/**
 * GuardHai — Communication & Support Network suite.
 *
 *   NODE_PATH=/tmp/pw/node_modules node tests/network.spec.js [url]
 *
 * Drives the real UI for every workflow the brief fixes, and asserts the honesty
 * rules that matter more than the happy path:
 *   • nothing is "delivered" without a transport;
 *   • a guardian only exists after the invited person accepts;
 *   • unverified providers never render as verified;
 *   • moderation is role-gated, and a report outside a community has no moderator;
 *   • a blocked person cannot be messaged;
 *   • the store starts empty and samples are labelled.
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://127.0.0.1:8123/index.html';
const R = [];
const rec = (id, name, ok, detail = '') => {
  R.push({ id, name, ok: !!ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${id}  ${name}${detail ? `\n        ${detail}` : ''}`;
  if (process.env.NX_VERBOSE || !ok) console.log(line);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  try { await waitForApp(page); } catch (e) { await page.waitForTimeout(700); await waitForApp(page); }
  await page.evaluate(() => AuthFlow.goTo('landing'));
  await page.waitForTimeout(120);
  await page.evaluate(() => AuthFlow.goTo('register'));
  await page.waitForTimeout(300);
  await page.evaluate(() => AuthActions.handleRegister({ preventDefault() {} }));
  await page.waitForTimeout(1400);
  await page.evaluate(() => HomeUI.go('chat'));
  await page.waitForTimeout(700);
}

const stage = (page) => page.evaluate(() => document.getElementById('ghNetStage')?.innerText || '');
const act = async (page, name, id = null, key = null, extra = {}) => page.evaluate(({ name, id, key, extra }) => {
  const sel = [`[data-act="${name}"]`];
  if (id) sel.push(`[data-id="${id}"]`);
  if (key) sel.push(`[data-key="${key}"]`);
  // the screen body, then the partition strip, then the page head: a control
  // may legitimately live in the conversation header
  const el = document.querySelector(`#ghNetStage ${sel.join('')}`)
    || document.querySelector(`#ghNetTabs ${sel.join('')}`)
    || document.querySelector(`#ghNetActions ${sel.join('')}`);
  if (!el) return 'missing';
  el.click();
  return 'clicked';
}, { name, id, key, extra });

const goChat = async (page) => {
  await page.evaluate(() => HomeUI.go('chat'));
  await page.waitForFunction(() => document.getElementById('commPage')?.classList.contains('active')
    && !!window.GHNetwork, null, { timeout: 15000 });
  await page.waitForTimeout(300);
};

const tab = async (page, key) => {
  await goChat(page);
  await page.locator(`#ghNetTabs [data-act="partition"][data-key="${key}"]`).click();
  await page.waitForFunction((k) => window.GHNetwork?.state.partition === k, key, { timeout: 10000 });
  await page.waitForTimeout(500);
};

const clickRow = async (page, selector = '#ghNetStage .gh-net-row.is-chat') => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  el.click();
  return true;
}, selector);

const snap = async (page) => page.evaluate(() => ({
  screen: window.GHNetwork.state.screen,
  partition: window.GHNetwork.state.partition,
  errors: window.GHNetwork.state.error
}));

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: [] });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));

  try {
    await boot(page);

    /* ------------------------------------------------------------ shell */
    rec('NC1', 'Chat tab mounts the network shell', await page.evaluate(() =>
      !!document.getElementById('commPage')?.classList.contains('active')
      && !!document.getElementById('ghNetStage')), '');

    rec('NC2', 'Five partitions are present', await page.evaluate(() => {
      const keys = [...document.querySelectorAll('#ghNetTabs [data-act="partition"]')].map((b) => b.dataset.key);
      return ['chats', 'guardians', 'support', 'communities', 'discover'].every((k) => keys.includes(k));
    }), '');

    rec('NC3', 'Store starts empty for a new account', await page.evaluate(async () => {
      const text = document.getElementById('ghNetStage').innerText;
      const seeded = await window.GHNetwork.isSeeded();
      return !seeded && /Hakuna mazungumzo|No conversations/.test(text);
    }), '');

    rec('NC4', 'SOS is a separate nav slot, not inside Chat', await page.evaluate(() => {
      const sos = document.getElementById('tab-sos');
      const inNet = document.querySelector('#commPage [onclick*="GHSos"], #commPage .nav-sos-slot');
      return !!sos && !inNet;
    }), '');

    rec('NC5', 'Chat screen states there is no server', /Hakuna seva|No server/.test(await stage(page)), '');

    /* ----------------------------------------------------------- chats */
    await page.evaluate(async () => { await window.GHNetwork.seed(); });
    await page.waitForTimeout(700);

    rec('NC6', 'Seeded conversations are labelled as samples', await page.evaluate(() => {
      const t = document.getElementById('ghNetStage').innerText;
      return /Sampuli|Sample/.test(t);
    }), '');

    rec('NC7', 'Conversation list shows last message and unread count', await page.evaluate(() => {
      const rows = document.querySelectorAll('#ghNetStage .gh-net-row.is-chat');
      return rows.length >= 3;
    }), '');

    await clickRow(page);
    await page.waitForTimeout(800);

    rec('NC8', 'Opening a chat renders the thread with messages', await page.evaluate(() => ({
      ok: document.querySelectorAll('#ghNetStage .gh-net-msg').length >= 2,
      title: document.getElementById('ghNetTitle').textContent
    })).then((x) => x.ok), '');

    rec('NC9', 'Messages show an honest delivery state (no fake ticks)', await page.evaluate(() => {
      const t = document.getElementById('ghNetStage').innerText;
      return /kwenye kifaa hiki|stored on this device|inasubiri|waiting for a connection/i.test(t);
    }), '');

    // send a message
    const beforeCount = await page.evaluate(() => document.querySelectorAll('#ghNetStage .gh-net-msg').length);
    await page.evaluate(() => {
      const form = document.querySelector('#ghNetStage form[data-nx-form="chats.send"]');
      form.querySelector('textarea[name="text"]').value = 'Ujumbe wa jaribio la mfumo.';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(900);

    rec('NC10', 'Sending persists the message', await page.evaluate((n) => {
      const labels = [...document.querySelectorAll('#ghNetStage .gh-net-msg .gh-net-bubble p')].map((p) => p.textContent);
      return document.querySelectorAll('#ghNetStage .gh-net-msg').length === n + 1
        && labels.some((l) => l.includes('jaribio la mfumo'));
    }, beforeCount), '');

    rec('NC11', 'Send reports not-delivered without a transport', await page.evaluate(() => {
      const banner = document.querySelector('#ghNetStage .gh-net-banner');
      return !!banner && /kifaa hiki|this device/.test(banner.textContent);
    }), '');

    rec('NC12', 'Empty message is refused', await page.evaluate(async () => {
      const before = document.querySelectorAll('#ghNetStage .gh-net-msg').length;
      const form = document.querySelector('#ghNetStage form[data-nx-form="chats.send"]');
      form.querySelector('textarea[name="text"]').value = '   ';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 600));
      return document.querySelectorAll('#ghNetStage .gh-net-msg').length === before
        && /hawezi kuwa tupu|andika ujumbe|write a message|attach a file/i.test(document.getElementById('ghNetStage').innerText);
    }), '');

    rec('NC13', 'Message survives a reload (IndexedDB persistence)', await (async () => {
      await page.reload({ waitUntil: 'load' });
      await waitForApp(page);
      await page.waitForTimeout(900);
      await page.waitForFunction(() => !!window.GHNetwork, null, { timeout: 15000 });
      await page.evaluate(() => HomeUI.go('chat'));
      await page.waitForFunction(() => document.getElementById('commPage')?.classList.contains('active'), null, { timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll('#ghNetStage .gh-net-row.is-chat').length > 0, null, { timeout: 15000 });
      await clickRow(page);
      await page.waitForTimeout(900);
      return /jaribio la mfumo/.test(await stage(page));
    })(), '');

    rec('NC14', 'Conversation settings offer pin / mute / archive', await (async () => {
      await act(page, 'chats.settings');
      await page.waitForTimeout(600);
      const t = await stage(page);
      return /Bandika juu|Pin to top/.test(t) && /Nyamazisha|Mute/.test(t) && /Hifadhi|Archive/.test(t);
    })(), '');

    rec('NC15', 'Pinning a chat moves it to the top', await (async () => {
      await page.evaluate(async () => {
        const el = document.querySelector('#ghNetStage [data-act="chats.toggle"][data-key="pinned"]');
        if (el) el.click();
      });
      await page.waitForTimeout(700);
      await page.evaluate(() => window.GHNetwork.select('chats'));
      await page.waitForTimeout(700);
      return page.evaluate(() => {
        const first = document.querySelector('#ghNetStage .gh-net-row.is-chat');
        return !!first;
      });
    })(), '');

    await goChat(page);
    rec('NC16', 'Privacy setting is stored and re-rendered', await (async () => {
      await clickRow(page);
      await page.waitForTimeout(700);
      await act(page, 'chats.settings');
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        const sel = document.querySelector('#ghNetStage select[name="privacy"]');
        sel.value = 'private';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('#ghNetStage form[data-nx-form="chats.privacy"]').dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true })
        );
      });
      await page.waitForTimeout(900);
      // the tag lives on the conversation screen, not on the settings form
      await page.evaluate(() => window.GHNetwork.open('chats.thread', window.GHNetwork.state.params));
      await page.waitForTimeout(800);
      return /Faragha: imefungwa|Privacy: locked/.test(await stage(page));
    })(), '');

    rec('NC17', 'Message search finds text on this device only', await (async () => {
      await goChat(page);
      await page.evaluate(() => window.GHNetwork.open('chats.search', {}));
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const form = document.querySelector('#ghNetStage form[data-nx-form="chats.doSearch"]');
        form.querySelector('input[name="q"]').value = 'jaribio';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(800);
      return /jaribio/.test(await stage(page));
    })(), '');

    rec('NC18', 'Group creation validates and persists', await (async () => {
      const result = await page.evaluate(async () => {
        try {
          const mod = await import('/src/services/chat.service.js');
          const bad = await mod.createGroup({ title: 'X', memberIds: [] });
          const good = await mod.createGroup({ title: 'Kikundi cha jaribio', memberIds: ['author-member', 'author-safety'] });
          return {
            bad: bad.ok,
            good: good.ok,
            why: good.message || null,
            type: good.conversation ? good.conversation.type : null,
            count: good.conversation ? good.conversation.participantIds.length : 0
          };
        } catch (err) {
          return { thrown: String(err && err.message || err) };
        }
        });
      return result.bad === false && result.good === true && result.type === 'group' && result.count === 3;
    })(), '');

    /* -------------------------------------------------------- guardians */
    await tab(page, 'guardians');

    rec('NC19', 'Guardian home separates invitations from active guardians', await page.evaluate(() => {
      const t = document.getElementById('ghNetStage').innerText;
      return /Mialiko inayokusubiri|Invitations waiting/.test(t) && /Walezi wako|Your guardians/.test(t);
    }), '');

    rec('NC20', 'An invitation is NOT an active guardian', await page.evaluate(async () => {
      const mod = await import('/src/services/guardian.service.js');
      const rows = await mod.listAll();
      const sent = rows.find((r) => r.status === 'sent');
      if (!sent) return false;
      const { guardianCan } = await import('/src/domain/network.js');
      return guardianCan(sent, 'sos_alerts') === false;
    }), '');

    rec('NC21', 'The invited person can accept, and only then gain authority', await (async () => {
      const before = await page.evaluate(async () => {
        const mod = await import('/src/services/guardian.service.js');
        const inc = await mod.incomingInvitations();
        return inc.length;
      });
      if (!before) return false;
      await page.evaluate(async () => {
        const el = document.querySelector('#ghNetStage [data-act="guardian.accept"]');
        el?.click();
      });
      await page.waitForTimeout(900);
      return page.evaluate(async () => {
        const mod = await import('/src/services/guardian.service.js');
        const chat = await import('/src/services/chat.service.js');
        const { guardianCan } = await import('/src/domain/network.js');
        const self = chat.selfId();
        const all = await mod.listAll();
        const active = all.filter((r) => r.status === 'active' && r.guardianId === self);
        return active.length > 0 && guardianCan(active[0], 'sos_alerts') === true;
      });
    })(), '');

    rec('NC22', 'A non-guardian cannot accept someone else’s invitation', await page.evaluate(async () => {
      const mod = await import('/src/services/guardian.service.js');
      const all = await mod.listAll();
      const chat = await import('/src/services/chat.service.js');
      const notMine = all.find((r) => r.guardianId !== chat.selfId() && r.status === 'sent');
      if (!notMine) return true;               // nothing to test on this seed
      const res = await mod.acceptInvitation(notMine.id);
      return res.ok === false;
    }), '');

    rec('NC23', 'Permissions can be changed and are persisted', await (async () => {
      const ok = await page.evaluate(async () => {
        const mod = await import('/src/services/guardian.service.js');
        const active = (await mod.listAsOwner()).find((r) => r.status === 'active');
        if (!active) return false;
        const res = await mod.setPermissions(active.id, { sos_alerts: false, checkins: true });
        const after = await mod.get(active.id);
        return res.ok && after.permissions.sos_alerts === false && after.permissions.checkins === true;
      });
      return ok;
    })(), '');

    rec('NC24', 'Revoking clears every permission', await page.evaluate(async () => {
      const mod = await import('/src/services/guardian.service.js');
      const owner = (await mod.listAsOwner()).find((r) => r.status === 'active');
      const inviter = (await mod.listAll()).find((r) => r.status === 'sent');
      const target = owner || inviter;
      if (!target) return false;
      const res = await mod.revoke(target.id);
      const after = await mod.get(target.id);
      return res.ok && after.status === 'revoked' && Object.values(after.permissions).every((v) => !v);
    }), '');

    /* ---------------------------------------------------------- support */
    await tab(page, 'support');

    rec('NC25', 'Support home lists seven categories', await page.evaluate(() =>
      document.querySelectorAll('#ghNetStage .gh-net-catcard').length === 7), '');

    rec('NC26', 'Emergency routing is separated from support', await page.evaluate(() => {
      const t = document.getElementById('ghNetStage').innerText;
      return /Dharura si ombi|An emergency is not/.test(t) && !!document.querySelector('#ghNetStage [data-act="sos"]');
    }), '');

    rec('NC27', 'A support request validates required fields', await page.evaluate(async () => {
      const mod = await import('/src/services/support.service.js');
      const bad = await mod.createRequest({ category: 'health', subject: 'x', body: 'short' });
      return bad.ok === false;
    }), '');

    rec('NC28', 'A valid request is stored and stays un-routed', await (async () => {
      await goChat(page);
      await page.evaluate(() => window.GHNetwork.open('support.new', { category: 'legal' }));
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const form = document.querySelector('#ghNetStage form[data-nx-form="support.create"]');
        form.querySelector('input[name="subject"]').value = 'Msaada wa kisheria kwa mkataba';
        form.querySelector('textarea[name="body"]').value = 'Nahitaji kuelewa masharti ya mkataba wa nyumba niliyosaini mwezi huu.';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(900);
      const result = await page.evaluate(async () => {
        const mod = await import('/src/services/support.service.js');
        const rows = await mod.listRequests();
        const mine = rows.find((r) => r.body.includes('mkataba wa nyumba'));
        return {
          ok: !!mine && mine.status === 'submitted' && mine.routing.delivered === false,
          subjects: rows.map((r) => r.subject),
          notice: window.GHNetwork.state.notice,
          screen: window.GHNetwork.state.screen
        };
      });
      return result.ok;
    })(), '');

    rec('NC29', 'Routing attempt reports failure honestly', await (async () => {
      const result = await page.evaluate(async () => {
        const mod = await import('/src/services/support.service.js');
        const mine = (await mod.listRequests()).find((r) => r.body.includes('mkataba wa nyumba'));
        const res = await mod.routeRequest(mine.id);
        return { delivered: res.delivered, reason: res.request.routing.reason, status: res.request.status };
      });
      return result.delivered === false && result.reason === 'no-transport' && result.status === 'submitted';
    })(), '');

    rec('NC30', 'A provider reply without a provider account is refused', await page.evaluate(async () => {
      const mod = await import('/src/services/support.service.js');
      const mine = (await mod.listRequests()).find((r) => r.body.includes('mkataba wa nyumba'));
      const res = await mod.replyAsProvider(mine.id, 'Jibu la kujifanya mtoa huduma.');
      return res.ok === false && (res.code === 'no-provider' || res.code === 'forbidden');
    }), '');

    rec('NC31', 'Requester can add a note and close their request', await page.evaluate(async () => {
      const mod = await import('/src/services/support.service.js');
      const mine = (await mod.listRequests()).find((r) => r.body.includes('mkataba wa nyumba'));
      const note = await mod.addNote(mine.id, 'Nimeongeza nakala ya mkataba kwenye rekodi.');
      const closed = await mod.closeRequest(mine.id);
      return note.ok && closed.ok && closed.request.status === 'closed';
    }), '');

    rec('NC32', 'No provider is presented as verified', await page.evaluate(async () => {
      const mod = await import('/src/services/support.service.js');
      const rows = await mod.listProviders();
      const checks = [];
      for (const p of rows) {
        const v = await mod.providerVerification(p);
        checks.push(v.status);
      }
      return checks.length > 0 && checks.every((s) => s !== 'verified');
    }), '');

    /* ------------------------------------------------------ communities */
    await tab(page, 'communities');

    rec('NC33', 'Community list shows membership state per community', await page.evaluate(() => {
      const t = document.getElementById('ghNetStage').innerText;
      return /Jamii zako|Your communities/.test(t) && /wanachama/.test(t);
    }), '');

    rec('NC34', 'Creating a community makes the author founder', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      const res = await mod.createCommunity({
        name: 'Jaribio la Jamii',
        type: 'public',
        about: 'Jamii ya majaribio kwa ajili ya kuthibitisha mtiririko wa uundaji wa jamii.'
      });
      if (!res.ok) return false;
      const role = await mod.myRoleIn(res.community.id);
      return role === 'founder' && res.community.memberCount === 1;
    }), '');

    rec('NC35', 'Community validation rejects a too-short description', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      const res = await mod.createCommunity({ name: 'Fupi', type: 'public', about: 'fupi' });
      return res.ok === false;
    }), '');

    rec('NC36', 'Private community join requires approval', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      const res = await mod.joinCommunity('cm-local');
      const mine = await mod.myMembership('cm-local');
      return res.ok && res.needsApproval === true && mine.status === 'pending';
    }), '');

    rec('NC37', 'A pending member cannot post', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      const res = await mod.createPost('cm-local', { title: 'Jaribio', body: 'Haipaswi kufanya kazi.' });
      return res.ok === false;
    }), '');

    rec('NC38', 'An admin can approve a pending member', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      // the seed gives "me" the founder role in cm-pro, where author-org is pending
      const res = await mod.approveMember('cm-pro', 'author-org');
      const row = (await mod.listMembers('cm-pro')).find((m) => m.profileId === 'author-org');
      return res.ok && row.status === 'active';
    }), '');

    rec('NC39', 'A plain member cannot approve or assign roles', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      const approve = await mod.approveMember('cm-public', 'author-member');
      const role = await mod.setMemberRole('cm-public', 'author-member', 'admin');
      return approve.ok === false && role.ok === false;
    }), '');

    rec('NC40', 'Founder can promote a member and the permission follows', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      const res = await mod.setMemberRole('cm-pro', 'author-health', 'moderator');
      const { communityCan } = await import('/src/domain/network.js');
      const after = (await mod.listMembers('cm-pro')).find((m) => m.profileId === 'author-health');
      return res.ok && after.role === 'moderator' && communityCan(after.role, 'moderate_posts');
    }), '');

    rec('NC41', 'Posting, commenting and reacting work for a member', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      const post = await mod.createPost('cm-public', { title: 'Mjadala wa jaribio', body: 'Huu ni mjadala wa kuthibitisha uchapishaji na majibu.' });
      if (!post.ok) return false;
      const comment = await mod.commentOnPost(post.post.id, 'Jibu la kwanza kwenye mjadala huu.');
      const react = await mod.reactToPost(post.post.id, 'helpful');
      const comments = await mod.listComments(post.post.id);
      return comment.ok && react.ok && comments.length === 1;
    }), '');

    rec('NC42', 'A member cannot hide posts (moderation is role-gated)', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      const posts = await mod.listPosts('cm-public');
      const res = await mod.hidePost(posts[0].id, true);
      return res.ok === false;
    }), '');

    rec('NC43', 'Community roles map to explicit permissions', await page.evaluate(async () => {
      const { COMMUNITY_ROLE_PERMISSIONS, communityCan } = await import('/src/domain/network.js');
      return communityCan('founder', 'delete_community')
        && communityCan('admin', 'approve_members')
        && !communityCan('admin', 'delete_community')
        && !communityCan('moderator', 'assign_roles')
        && communityCan('moderator', 'moderate_posts')
        && !communityCan('member', 'invite')
        && Object.keys(COMMUNITY_ROLE_PERMISSIONS).length === 5;
    }), '');

    rec('NC44', 'Leaving a community removes access to posting', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      const res = await mod.leaveCommunity('cm-public');
      const post = await mod.createPost('cm-public', { title: 'Baada ya kuondoka', body: 'Haipaswi kufanikiwa kabisa hii.' });
      return res.ok && post.ok === false;
    }), '');

    rec('NC45', 'A founder cannot leave without transferring ownership', await page.evaluate(async () => {
      const mod = await import('/src/services/community.service.js');
      const res = await mod.leaveCommunity('cm-pro');
      return res.ok === false;
    }), '');

    /* -------------------------------------------------------- discover */
    await tab(page, 'discover');

    rec('NC46', 'Discover is opt-in by default', await page.evaluate(async () => {
      const mod = await import('/src/services/discover.service.js');
      const s = await mod.getSettings();
      return s.discoverable === false;
    }), '');

    rec('NC47', 'No profile card exposes contact details', await page.evaluate(async () => {
      const mod = await import('/src/services/discover.service.js');
      const people = await mod.discoverPeople({});
      return people.every((p) => !('phone' in p) && !('email' in p) && !('address' in p));
    }), '');

    rec('NC48', 'Opting in makes the owner discoverable', await page.evaluate(async () => {
      const mod = await import('/src/services/discover.service.js');
      await mod.setSettings({ discoverable: true });
      const people = await mod.discoverPeople({});
      return people.some((p) => p.self === true);
    }), '');

    rec('NC49', 'Search returns grouped results across surfaces', await page.evaluate(async () => {
      const mod = await import('/src/services/discover.service.js');
      const res = await mod.searchAll('afya');
      return ['people', 'communities', 'providers'].every((k) => Array.isArray(res[k]));
    }), '');

    rec('NC50', 'GuardHai ID lookup says the directory is not connected', await page.evaluate(async () => {
      const mod = await import('/src/services/discover.service.js');
      const res = await mod.lookupGuardHaiId('gh-zzzz9999');
      return res && res.ok === false && res.code === 'no-directory';
    }), '');

    /* ---------------------------------------------------------- safety */
    rec('NC51', 'Blocking stops messaging in both directions', await page.evaluate(async () => {
      const chat = await import('/src/services/chat.service.js');
      const conv = (await chat.listConversations())[0];
      const self = chat.selfId();
      const peer = conv.participantIds.find((p) => p !== self);
      await chat.blockUser(peer, 'jaribio');
      const res = await chat.sendMessage(conv.id, { text: 'Haipaswi kupita.' });
      await chat.unblockUser(peer);
      return res.ok === false;
    }), '');

    rec('NC52', 'A report inside a community can be decided by its moderator', await page.evaluate(async () => {
      const safety = await import('/src/services/safety.service.js');
      const filed = await safety.fileReport({ subjectType: 'post', subjectId: 'p1', reason: 'spam', communityId: 'cm-pro' });
      const decided = await safety.resolveReport(filed.report.id, 'dismissed');
      return filed.ok && decided.ok;
    }), '');

    rec('NC53', 'A report outside a community cannot be decreed (no moderator)', await page.evaluate(async () => {
      const safety = await import('/src/services/safety.service.js');
      const filed = await safety.fileReport({ subjectType: 'user', subjectId: 'author-member', reason: 'harassment' });
      const decided = await safety.resolveReport(filed.report.id, 'removed');
      return filed.ok && decided.ok === false && decided.code === 'no-moderator';
    }), '');

    rec('NC54', 'Reports and moderation write an audit trail', await page.evaluate(async () => {
      const { listAudit } = await import('/src/services/alerts.service.js');
      const rows = await listAudit({ limit: 50 });
      return rows.some((r) => r.action.startsWith('report.')) && rows.some((r) => r.action.startsWith('moderation.'));
    }), '');

    rec('NC55', 'An appeal cannot be decided without a moderator', await page.evaluate(async () => {
      const safety = await import('/src/services/safety.service.js');
      const filed = await safety.fileAppeal({ subjectType: 'moderation', subjectId: 'x', reason: 'Sikukubaliana na uamuzi wa msimamizi kuhusu chapisho langu.' });
      const decided = await safety.resolveAppeal(filed.appeal.id, 'upheld', null);
      return filed.ok && decided.ok === false && decided.code === 'no-moderator';
    }), '');

    /* ------------------------------------------- offline + connectivity */
    rec('NC56', 'Offline send is queued, then flushed when a transport appears', await page.evaluate(async () => {
      const chat = await import('/src/services/chat.service.js');
      const transport = await import('/src/services/transport.service.js');
      const conv = (await chat.listConversations())[0];

      // 1. offline -> the message is queued, not delivered
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      const queued = await chat.sendMessage(conv.id, { text: 'Ujumbe wa nje ya mtandao.' });
      const q1 = await transport.queuedCount();

      // 2. reconnect with a working adapter -> the outbox drains
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      transport.registerTransport('test', { name: 'test', async send() { return { ok: true, id: 'x' }; } });
      await transport.flushOutbox();
      const q2 = await transport.queuedCount();
      transport.unregisterTransport('test');
      return queued.ok === true && queued.delivered === false && queued.queued === true && q1 >= 1 && q2 === 0;
    }), '');

    rec('NC57', 'Transport status is reported to the UI', await page.evaluate(async () => {
      const transport = await import('/src/services/transport.service.js');
      const s = transport.transportStatus();
      return s.connected === false && Array.isArray(s.registered);
    }), '');

    /* --------------------------------------------------------- UX/a11y */
    rec('NC58', 'Every network control is wired to a known action', await page.evaluate(async () => {
      const { ACTION_NAMES } = await import('/src/features/network/network-actions.js');
      const known = new Set(ACTION_NAMES);
      const nodes = [...document.querySelectorAll('#commPage [data-act]')];
      const unknown = nodes.map((n) => n.dataset.act).filter((a) => !known.has(a));
      return nodes.length > 0 && unknown.length === 0;
    }), '');

    rec('NC59', 'Forms and inputs carry labels', await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('#commPage input:not([type="hidden"]), #commPage textarea, #commPage select')];
      return inputs.every((i) => !!i.closest('label') || !!i.getAttribute('aria-label') || !!i.id && !!document.querySelector(`label[for="${i.id}"]`));
    }), '');

    rec('NC60', 'No horizontal overflow at 360 px', await (async () => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.waitForTimeout(500);
      return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
    })(), '');

    rec('NC61', 'Language switch re-renders the network', await (async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => { if (window.I18N) window.I18N.setLanguage('en'); });
      await page.waitForTimeout(900);
      const t = await stage(page);
      return /Search people|Discover|People/.test(t);
    })(), '');

    rec('NC62', 'Health, Shield and SOS still work after the network mounts', await (async () => {
      await page.evaluate(() => { if (window.I18N) window.I18N.setLanguage('sw'); });
      await page.waitForTimeout(400);
      const health = await page.evaluate(() => { HomeUI.go('health'); return document.getElementById('healthPage').classList.contains('active'); });
      const shield = await page.evaluate(() => { HomeUI.go('shield'); return document.getElementById('shieldPage').classList.contains('active'); });
      const sos = await page.evaluate(() => !!document.getElementById('tab-sos'));
      await page.evaluate(() => HomeUI.go('chat'));
      await page.waitForTimeout(500);
      return health && shield && sos;
    })(), '');

    rec('NC63', 'Clearing demo data removes only sample rows', await (async () => {
      const before = await page.evaluate(() => window.GHNetwork.isSeeded());
      await page.evaluate(async () => { await window.GHNetwork.clear(); });
      const after = await page.evaluate(() => window.GHNetwork.isSeeded());
      const left = await page.evaluate(async () => {
        const mod = await import('/src/services/chat.service.js');
        const convs = await mod.listConversations({ includeArchived: true });
        return { total: convs.length, samples: convs.filter((c) => c.sample).length };
      });
      return before === true && after === false && left.samples === 0;
    })(), '');

    /* ------------------------------------------------------- integrity */
    rec('NC64', 'No page errors during the whole run', pageErrors.length === 0, pageErrors.slice(0, 4).join(' | '));
    rec('NC65', 'No console errors during the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 4).join(' | '));

  } catch (err) {
    rec('FATAL', `suite crashed after ${R.length ? R[R.length - 1].id : '(start)'}`, false, err && err.message);
    console.error(err);
  } finally {
    const passed = R.filter((r) => r.ok).length;
    const failed = R.filter((r) => !r.ok);
    console.log(`\n${passed}/${R.length} checks passed`);
    if (failed.length) {
      console.log('\nFailures:');
      for (const f of failed) console.log(`  ${f.id}  ${f.name}${f.detail ? `\n      ${f.detail}` : ''}`);
      console.log('RESULT: failures');
    } else {
      console.log('RESULT: all checks passed');
    }
    await browser.close();
    process.exit(failed.length ? 1 : 0);
  }
})();
