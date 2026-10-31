/**
 * GuardHai · features/shield/shield-personal.js
 * Shield Center → Personal Safety: six working screens on top of
 * personal-safety.service.js and the existing guardian/safety services.
 *
 *   home · guardians · journey · checkin · plans · incidents · preferences
 *
 * Nothing here claims to reach a person. Where a guardian would normally be
 * notified, the screen says that no transport is connected.
 */
import {
  L, esc, icon, chip, btn, card, rows, row, sect, ledger, alert, stat, empty, timeline,
  head, field, textarea, select, toggleRow, timeAgo, clock, leftUntil, dayLabel
} from './shield-ui.js';

/** the title block every Personal Safety sub-screen opens with */
const screenHead = (title, sub, mark, back = 'personal.home') =>
  head(title, sub, { mark, back });
import {
  PersonalSafety, JOURNEY_WINDOWS, JOURNEY_STATE, CHECKIN_FEELINGS, INCIDENT_KINDS, PLAN_TEMPLATES
} from '../../services/personal-safety.service.js';
import { listAll as listGuardians } from '../../services/guardian.service.js';
import { GUARDIAN_ROLES } from '../../domain/network.js';

const roleLabel = (id) => GUARDIAN_ROLES[id]?.label || id;

const STATUS_TONE = { active: 'ok', received: 'info', sent: 'warn', revoked: 'muted', declined: 'muted', cancelled: 'muted' };

/* ------------------------------------------------------------------- home */

async function home() {
  const s = await PersonalSafety.safetySummary();
  const caps = PersonalSafety.capabilities();
  const active = s.journey;

  const attention = [];
  if (active && s.journeyState?.id === 'overdue') {
    attention.push({ tone: 'warn', title: 'Safari imepita muda', meta: `${active.label} · umefika?`, act: 'personal.open', key: 'journey' });
  }
  if (!s.todayCheckin) {
    attention.push({ tone: 'ok', title: 'Hujafanya check-in leo', meta: 'Sekunde moja inatosha kujua uko salama', act: 'personal.open', key: 'checkin' });
  }
  if (!s.guardians.active) {
    attention.push({ tone: 'warn', title: 'Hakuna mlezi aliyekubali', meta: 'Walezi walioalikwa tu hawana mamlaka', act: 'personal.open', key: 'guardians' });
  }
  if (!caps.transport) {
    attention.push({ tone: 'muted', title: 'Hakuna seva iliyounganishwa', meta: 'Taarifa zote zinabaki kwenye kifaa hiki', act: 'personal.open', key: 'prefs' });
  }

  const body = `
    ${sect(L('Hali yako sasa', 'Your current state'), { eyebrow: L('Usalama binafsi', 'Personal safety') })}
    <div class="gds-stats">
      ${stat(String(s.guardians.active || 0), L('Walezi hai', 'Active guardians'), L('waliokubali', 'accepted'))}
      ${stat(active ? '1' : '0', L('Safari hai', 'Active journey'), active ? active.label : L('hakuna', 'none'))}
      ${stat(s.todayCheckin ? '✓' : '—', L('Check-in leo', 'Check-in today'), s.todayCheckin ? clock(s.todayCheckin.at) : L('bado', 'not yet'))}
      ${stat(String(s.plans), L('Mipango', 'Plans'), L('ya usalama', 'safety plans'))}
    </div>

    ${attention.length ? `
      ${sect(L('Kinachohitaji uangalizi', 'Needs attention'))}
      ${card(rows(attention.map((a) => row({
        iconId: a.tone === 'warn' ? 'i-alert-triangle' : a.tone === 'ok' ? 'i-check-circle' : 'i-cloud',
        tone: a.tone === 'warn' ? 'amber' : a.tone === 'ok' ? 'green' : 'muted',
        title: a.title, note: a.meta, act: a.act, key: a.key
      }))), { plain: true })}` : ''}

    ${sect(L('Zana za usalama', 'Safety tools'), { sub: L('Kila kitu kinahifadhiwa kwenye kifaa hiki.', 'Everything is stored on this device.') })}
    ${card(rows([
      row({ iconId: 'i-users', title: L('Walezi wangu', 'My guardians'), note: `${s.guardians.active || 0} ${L('hai', 'active')} · ${s.guardians.incoming || 0} ${L('mialiko mipya', 'new invites')}`, act: 'personal.open', key: 'guardians' }),
      row({ iconId: 'i-route', tone: 'blue', title: L('Safari ya usalama', 'Safety journey'), note: active ? `${active.label} · ${leftUntil(active.expectedAt)}` : L('Anzisha safari na muda wa kurudi', 'Start a journey with a return time'), act: 'personal.open', key: 'journey' }),
      row({ iconId: 'i-check-circle', title: L('Check-in ya kibinafsi', 'Personal check-in'), note: s.todayCheckin ? L('Umefanya leo', 'Done today') : L('Hujafanya leo', 'Not done today'), act: 'personal.open', key: 'checkin' }),
      row({ iconId: 'i-file-medical', tone: 'blue', title: L('Mipango ya hatari', 'Risk & safety plans'), note: `${s.plans} ${L('mipango', 'plans')}`, act: 'personal.open', key: 'plans' }),
      row({ iconId: 'i-siren', tone: 'red', title: L('Ripoti za matukio', 'Incident reports'), note: `${s.incidents} ${L('zilizohifadhiwa', 'stored')}`, act: 'personal.open', key: 'incidents' }),
      row({ iconId: 'i-settings', tone: 'muted', title: L('Mapendeleo ya usalama', 'Safety preferences'), note: L('nini kinawashwa', 'what is switched on'), act: 'personal.open', key: 'prefs' })
    ]), { plain: true })}

    <div style="margin-top:16px">${alert(
      L('Hakuna seva iliyounganishwa: safari na check-in zinabaki kwenye kifaa chako. Mlezi hapati taarifa.',
        'No server is connected: journeys and check-ins stay on your device. No guardian is notified.'),
      'warn', 'i-cloud')}</div>
  `;

  return { title: L('Usalama binafsi', 'Personal Safety'), sub: L('Walezi · safari · check-in · mipango', 'Guardians · journey · check-in · plans'), body, mark: 'i-user-shield' };
}

/* -------------------------------------------------------------- guardians */

async function guardians() {
  const list = await listGuardians().catch(() => []);
  const active = list.filter((g) => g.status === 'active');
  const waiting = list.filter((g) => g.status === 'sent');
  const received = list.filter((g) => g.status === 'received');

  const line = (g) => row({
    iconId: 'i-user',
    tone: g.status === 'active' ? 'green' : g.status === 'received' ? 'blue' : 'muted',
    title: `${roleLabel(g.role)}`,
    note: g.status === 'active'
      ? L('Amekubali. Anaweza kuona safari na SOS zako pale seva itakapounganishwa.', 'Accepted. Can see your journeys and SOS once a server is connected.')
      : g.status === 'sent' ? L('Mwaliko umetumwa — si mlezi hadi akubali.', 'Invite sent — not a guardian until accepted.')
        : g.status === 'received' ? L('Anakualika kuwa mlezi wake.', 'They invited you to be their guardian.')
          : L(`Hali: ${g.status}`, `Status: ${g.status}`),
    right: `${chip(g.status === 'active' ? L('Hai', 'Active') : g.status === 'sent' ? L('Inasubiri', 'Pending') : g.status, STATUS_TONE[g.status] || 'muted')}`,
    act: 'go.guardians'
  });

  const body = `
    ${screenHead(L('Walezi wangu', 'My guardians'), `${active.length} ${L('hai', 'active')} · ${waiting.length} ${L('inasubiri', 'pending')}`, 'i-users')}
    ${sect(L('Walezi wako', 'Your guardians'), { sub: L('Mlezi ni mtu unayemchagua wewe na anayekubali. Mwaliko pekee hautoshi.', 'A guardian is someone you choose who accepts. An invitation alone is not enough.') })}
    ${active.length || waiting.length
      ? card(rows([...active, ...waiting, ...received].map(line)), { plain: true })
      : empty(L('Hakuna mlezi bado', 'No guardian yet'), L('Mwaliko unafanywa kwenye Chat → Walezi. Utaonekana hapa mara tu akikubali.', 'Invitations happen in Chat → Guardians. They appear here as soon as they accept.'),
        btn(L('Nenda Chat → Walezi', 'Open Chat → Guardians'), { act: 'go.guardians', tone: 'primary', iconId: 'i-users' }))}

    <div class="gds-btnrow" style="margin-top:12px">
      ${btn(L('Alika mlezi', 'Invite a guardian'), { act: 'go.guardians', tone: 'primary', iconId: 'i-user-plus' })}
      ${btn(L('Ruhusa za mlezi', 'Guardian permissions'), { act: 'go.guardians', iconId: 'i-key' })}
    </div>

    <div style="margin-top:16px">${alert(
      L('Walezi wanasimamiwa kwenye Chat → Walezi ili kuwe na chanzo kimoja cha ukweli, si nakala ya pili hapa.',
        'Guardians are managed in Chat → Guardians so there is one source of truth, not a second copy here.'),
      'info', 'i-info')}</div>
  `;
  return { title: L('Walezi wangu', 'My guardians'), sub: `${active.length} ${L('hai', 'active')} · ${waiting.length} ${L('inasubiri', 'pending')}`, body, mark: 'i-users' };
}

/* ---------------------------------------------------------------- journey */

async function journey(state) {
  const active = await PersonalSafety.activeJourney();
  const history = (await PersonalSafety.listJourneys()).filter((j) => j.status !== 'active').slice(0, 6);
  const st = PersonalSafety.journeyStateOf(active);

  const activeCard = active
    ? card(`
        <div class="gds-card-body">
          <div style="display:flex;align-items:center;gap:12px">
            <span class="gds-tile ${st?.id === 'overdue' ? 'is-amber' : ''}" aria-hidden="true">${icon('i-route')}</span>
            <div style="min-width:0;flex:1">
              <b style="display:block;font-size:var(--gds-fs-h3);color:var(--gds-ink)">${esc(active.label)}</b>
              <span style="font-size:var(--gds-fs-sm);color:var(--gds-muted)">${esc(active.place || L('hakuna mahali', 'no place set'))}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px">
            ${chip(st?.id === 'overdue' ? L('Muda umepita', 'Overdue') : L('Inaendelea', 'Running'), st?.tone || 'ok', 'i-clock')}
            <span style="font-size:var(--gds-fs-sm);color:var(--gds-muted)">${esc(leftUntil(active.expectedAt))}</span>
          </div>
          <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">
            ${btn(L('Nimefika salama', 'I arrived safely'), { act: 'journey.end', key: active.id, tone: 'primary', iconId: 'i-check-circle' })}
            ${btn(L('Ghairi safari', 'Cancel journey'), { act: 'journey.cancel', key: active.id, iconId: 'i-x' })}
          </div>
          <p style="margin:12px 0 0;font-size:var(--gds-fs-sm);color:var(--gds-muted)">
            ${L('Hakuna mlezi anayepewa taarifa — hakuna seva iliyounganishwa.', 'No guardian is being notified — no server is connected.')}
          </p>
        </div>`, { tone: '' })
    : '';

  const form = active ? '' : `<form class="gds-stack is-tight" data-shield-form="journey.start">
      ${field({ label: L('Unakwenda wapi?', 'Where are you going?'), name: 'label', placeholder: L('mf. Nyumbani → Kituo cha afya', 'e.g. Home → Health centre'), required: true, hint: L('Jina fupi la safari, litaonekana kwenye historia.', 'A short journey name, it appears in history.') })}
      ${field({ label: L('Mahali / maelezo', 'Place / note'), name: 'place', placeholder: L('mf. Magomeni, Dar es Salaam', 'e.g. Magomeni, Dar es Salaam') })}
      ${select({ label: L('Nitarudi baada ya', 'I expect to be back in'), name: 'minutes', value: '60', options: JOURNEY_WINDOWS.map((w) => ({ value: w.id, label: L(w.label, w.en) })) })}
      <div class="gds-btnrow" style="margin-top:4px">
        ${btn(L('Anzisha safari', 'Start journey'), { act: 'journey.submit', tone: 'primary', iconId: 'i-play' })}
      </div>
      <p style="margin:6px 0 0;font-size:var(--gds-fs-sm);color:var(--gds-muted)">
        ${L('Safari inahifadhiwa kwenye kifaa hiki. Hakuna taarifa inayotumwa kwa mtu yeyote.', 'The journey is stored on this device. Nothing is sent to anybody.')}
      </p>
    </form>`;

  const body = `
    ${screenHead(L('Safari ya usalama', 'Safety journey'), L('Anza, fuatilia, funga', 'Start, track, close'), 'i-route')}
    ${active ? sect(L('Safari inayoendelea', 'Journey in progress')) : sect(L('Anzisha safari', 'Start a journey'), { sub: L('Weka muda unaotarajia kurudi. Ukipita muda, GuardHai itakuonyesha wazi.', 'Set when you expect to be back. If it passes, GuardHai shows it plainly.') })}
    ${activeCard}
    ${form}

    ${sect(L('Historia ya safari', 'Journey history'))}
    ${history.length ? card(rows(history.map((j) => row({
      iconId: j.status === 'safe' ? 'i-check-circle' : 'i-x',
      tone: j.status === 'safe' ? 'green' : 'muted',
      title: j.label,
      note: `${dayLabel(j.startedAt)} ${clock(j.startedAt)} · ${j.status === 'safe' ? L('ilifungwa salama', 'closed safely') : L('ilighairiwa', 'cancelled')}`,
      right: chip(j.status === 'safe' ? L('Salama', 'Safe') : L('Ghairi', 'Cancelled'), j.status === 'safe' ? 'ok' : 'muted')
    }))), { plain: true }) : empty(L('Hakuna safari iliyopita', 'No past journeys'), L('Safari utakazoanzisha zitaonekana hapa.', 'Journeys you start appear here.'))}
  `;
  return { title: L('Safari ya usalama', 'Safety journey'), sub: L('Anza, fuatilia, funga', 'Start, track, close'), body, mark: 'i-route' };
}

/* ---------------------------------------------------------------- check-in */

async function checkin() {
  const today = await PersonalSafety.todayCheckin();
  const streak = await PersonalSafety.checkinStreak();
  const recent = await PersonalSafety.listCheckins(10);

  const body = `
    ${screenHead(L('Check-in ya kibinafsi', 'Personal check-in'), L('Kujua uko salama kila siku', 'Know you are safe, daily'), 'i-check-circle')}
    ${sect(L('Check-in ya leo', 'Today\'s check-in'), { sub: L('Sekunde moja. Inahifadhiwa kwenye kifaa hiki.', 'One second. Stored on this device.') })}
    ${today
      ? card(`<div class="gds-card-body">
          <div style="display:flex;align-items:center;gap:12px">
            ${(() => { const f = CHECKIN_FEELINGS.find((x) => x.id === today.feeling) || CHECKIN_FEELINGS[0]; return `<span class="gds-tile" aria-hidden="true">${icon('i-check-circle')}</span><div style="flex:1;min-width:0"><b style="display:block;font-size:var(--gds-fs-h3);color:var(--gds-ink)">${esc(L(f.label, f.en))}</b><span style="font-size:var(--gds-fs-sm);color:var(--gds-muted)">${esc(clock(today.at))} · ${esc(dayLabel(today.at))}</span></div><span class="gds-chip is-ok">${L('Imefanyika', 'Done')}</span>`; })()}
          </div>
          ${today.note ? `<p style="margin:10px 0 0;font-size:var(--gds-fs-sm);color:var(--gds-text)">${esc(today.note)}</p>` : ''}
        </div>`)
      : `<form class="gds-stack is-tight" data-shield-form="checkin.go">
          ${select({ label: L('Unajisikiaje?', 'How do you feel?'), name: 'feeling', value: 'safe', options: CHECKIN_FEELINGS.map((f) => ({ value: f.id, label: L(f.label, f.en) })) })}
          ${textarea({ label: L('Maelezo (si lazima)', 'Note (optional)'), name: 'note', rows: 3, placeholder: L('mf. Nipo nyumbani, kila kitu kiko sawa.', 'e.g. At home, everything is fine.') })}
          <div class="gds-btnrow">${btn(L('Tuma check-in', 'Save check-in'), { act: 'checkin.submit', tone: 'primary', iconId: 'i-check' })}</div>
        </form>`}

    <div class="gds-stats" style="margin-top:12px">
      ${stat(String(streak), L('Siku mfululizo', 'Day streak'), L('check-in', 'check-ins'))}
      ${stat(String(recent.length), L('Kwenye kumbukumbu', 'Recorded'), L('za mwisho', 'most recent'))}
    </div>

    ${sect(L('Historia', 'History'))}
    ${recent.length ? card(timeline(recent.map((r) => {
      const f = CHECKIN_FEELINGS.find((x) => x.id === r.feeling) || CHECKIN_FEELINGS[0];
      return { tone: r.feeling === 'safe' ? 'ok' : r.feeling === 'uneasy' ? 'warn' : 'danger', title: L(f.label, f.en), meta: r.note || '', when: `${dayLabel(r.at)} ${clock(r.at)}` };
    })), { plain: true }) : empty(L('Hakuna check-in bado', 'No check-ins yet'), L('Check-in ya kwanza itaonekana hapa.', 'Your first check-in appears here.'))}

    <div style="margin-top:16px">${alert(
      L('Check-in haitumwi kwa mtu. Ni kumbukumbu yako mwenyewe hadi seva itakapounganishwa.',
        'A check-in is not sent to anybody. It is your own record until a server is connected.'),
      'warn', 'i-cloud')}</div>
  `;
  return { title: L('Check-in ya kibinafsi', 'Personal check-in'), sub: L('Kujua uko salama kila siku', 'Know you are safe, daily'), body, mark: 'i-check-circle' };
}

/* ------------------------------------------------------------------ plans */

async function plans(state) {
  const list = await PersonalSafety.listPlans();
  const tpl = state?.planTemplate ? PLAN_TEMPLATES.find((t) => t.id === state.planTemplate) : null;

  const form = `<form class="gds-stack is-tight" data-shield-form="plan.create">
    ${field({ label: L('Jina la mpango', 'Plan name'), name: 'title', value: tpl ? tpl.title : '', placeholder: L('mf. Safari ya usiku', 'e.g. Night travel'), required: true })}
    ${field({ label: L('Lini kutumia', 'When to use it'), name: 'whenToUse', value: tpl ? tpl.whenToUse : '', placeholder: L('mf. Nikisafiri baada ya saa 9 usiku', 'e.g. When travelling after 9 pm') })}
    ${textarea({ label: L('Hatua (kila moja kwenye mstari)', 'Steps (one per line)'), name: 'steps', rows: 4, value: tpl ? tpl.steps.join('\n') : '', placeholder: L('1. Mjulishe mtu unayemwamini\n2. Weka safari hapa\n3. Tuma ujumbe ukifika', '1. Tell someone you trust\n2. Start a journey here\n3. Message when you arrive'), required: true })}
    <div class="gds-btnrow">${btn(L('Hifadhi mpango', 'Save plan'), { act: 'plan.submit', tone: 'primary', iconId: 'i-save' })}</div>
  </form>`;

  const body = `
    ${screenHead(L('Mipango ya hatari', 'Risk & safety plans'), `${list.length} ${L('mipango', 'plans')}`, 'i-file-medical')}
    ${sect(L('Mipango yako', 'Your plans'), { sub: L('Mpango ni hatua zilizoandikwa kabla ya wakati — si ahadi ya msaada.', 'A plan is steps written in advance — not a promise of help.') })}
    ${list.length ? card(rows(list.map((p) => row({
      iconId: 'i-file-medical', title: p.title,
      note: p.whenToUse || `${p.steps.length} ${L('hatua', 'steps')}`,
      right: chip(`${p.steps.length}`, 'muted'),
      act: 'plan.open', key: p.id
    }))), { plain: true }) : empty(L('Hakuna mpango bado', 'No plans yet'), L('Anza na kiolezo hapa chini.', 'Start from a template below.'))}

    ${sect(L('Violezo', 'Templates'))}
    ${card(rows(PLAN_TEMPLATES.map((t) => row({
      iconId: 'i-copy', tone: 'blue', title: L(t.title, t.en), note: t.whenToUse, act: 'plan.template', key: t.id
    }))), { plain: true })}

    ${sect(tpl ? L(`Hariri: ${tpl.title}`, `Edit: ${tpl.en}`) : L('Mpango mpya', 'New plan'))}
    ${card(`<div class="gds-card-body">${form}</div>`)}
  `;
  return { title: L('Mipango ya hatari', 'Risk & safety plans'), sub: `${list.length} ${L('mipango', 'plans')}`, body, mark: 'i-file-medical' };
}

async function planDetail(id) {
  const list = await PersonalSafety.listPlans();
  const plan = list.find((p) => p.id === id);
  if (!plan) return plans({});
  const body = `
    ${screenHead(plan.title, L('Mpango wa usalama', 'Safety plan'), 'i-file-medical')}
    ${card(`
      <div class="gds-card-body">
        <h2 style="margin:0 0 4px;font-size:var(--gds-fs-h2);color:var(--gds-ink)">${esc(plan.title)}</h2>
        ${plan.whenToUse ? `<p style="margin:0 0 12px;font-size:var(--gds-fs-sm);color:var(--gds-muted)">${esc(plan.whenToUse)}</p>` : ''}
        <ol style="margin:0;padding-left:20px;font-size:var(--gds-fs-body);line-height:1.7">
          ${plan.steps.map((s) => `<li>${esc(s)}</li>`).join('')}
        </ol>
        <div class="gds-btnrow" style="margin-top:16px">
          ${btn(L('Ondoa mpango', 'Remove plan'), { act: 'plan.remove', key: plan.id, tone: 'danger-soft', iconId: 'i-trash' })}
        </div>
      </div>`)}
  `;
  return { title: plan.title, sub: L('Mpango wa usalama', 'Safety plan'), body, mark: 'i-file-medical', back: 'personal.open' };
}

/* -------------------------------------------------------------- incidents */

async function incidents() {
  const list = await PersonalSafety.listIncidents();
  const form = `<form class="gds-stack is-tight" data-shield-form="incident.create">
    ${select({ label: L('Aina ya tukio', 'Incident kind'), name: 'kind', value: 'other', options: INCIDENT_KINDS.map((k) => ({ value: k.id, label: L(k.label, k.en) })) })}
    ${textarea({ label: L('Kilichotokea', 'What happened'), name: 'detail', rows: 4, required: true, hint: L('Angalau maneno 10. Usiweke namba za siri.', 'At least 10 words. Do not include passwords.') })}
    <div class="gds-btnrow">${btn(L('Hifadhi ripoti', 'Save report'), { act: 'incident.submit', tone: 'primary', iconId: 'i-siren' })}</div>
  </form>`;

  const body = `
    ${screenHead(L('Ripoti za matukio', 'Incident reports'), `${list.length} ${L('kwenye kifaa', 'on device')}`, 'i-siren')}
    ${sect(L('Ripoti zako', 'Your reports'), { sub: L('Ripoti inabaki kwenye kifaa hiki. Hakuna msimamizi aliyounganishwa.', 'A report stays on this device. No moderator is connected.') })}
    ${list.length ? card(rows(list.map((r) => row({
      iconId: 'i-siren', tone: 'red',
      title: L(INCIDENT_KINDS.find((k) => k.id === r.reason)?.label || 'Tukio', INCIDENT_KINDS.find((k) => k.id === r.reason)?.en || 'Incident'),
      note: String(r.detail || '').slice(0, 90),
      right: chip(r.status === 'pending' ? L('Inasubiri', 'Pending') : r.status, 'warn'),
      staticRow: false, act: '', key: ''
    }))), { plain: true }) : empty(L('Hakuna ripoti', 'No reports'), L('Tukio lolote unaloripoti litaonekana hapa.', 'Any incident you report appears here.'))}

    ${sect(L('Ripoti tukio jipya', 'Report a new incident'))}
    ${card(`<div class="gds-card-body">${form}</div>`)}

    <div style="margin-top:16px">${alert(
      L('Kwa dharura ya sasa hivi, tumia kitufe cha SOS — si fomu hii.', 'For an emergency right now, use the SOS button — not this form.'),
      'danger', 'i-siren')}</div>
  `;
  return { title: L('Ripoti za matukio', 'Incident reports'), sub: `${list.length} ${L('kwenye kifaa', 'on device')}`, body, mark: 'i-siren' };
}

/* ------------------------------------------------------------ preferences */

async function prefs() {
  const p = await PersonalSafety.getPrefs();
  const caps = PersonalSafety.capabilities();
  const body = `
    ${screenHead(L('Mapendeleo ya usalama', 'Safety preferences'), L('Kinachowashwa kwenye kifaa', 'What is on, on this device'), 'i-settings')}
    ${sect(L('Mapendeleo', 'Preferences'), { sub: L('Yanahifadhiwa kwenye kifaa hiki mara moja.', 'Saved on this device immediately.') })}
    ${card(rows([
      toggleRow({ title: L('Kumbusho la check-in kila siku', 'Daily check-in reminder'), note: L('Kumbusho la ndani ya app, si arifa ya seva.', 'An in-app reminder, not a server notification.'), pref: 'dailyCheckinReminder', checked: p.dailyCheckinReminder }),
      toggleRow({ title: L('Kumbusho la safari', 'Journey reminder'), note: L('Kuonyesha wazi safari inapopita muda.', 'Shows plainly when a journey is overdue.'), pref: 'journeyReminder', checked: p.journeyReminder }),
      toggleRow({ title: L('Namba za dharura mbele', 'Emergency numbers first'), note: L('SOS inafungua na namba tayari.', 'SOS opens with the numbers already visible.'), pref: 'showNumbersOnSosOpen', checked: p.showNumbersOnSosOpen }),
      toggleRow({ title: L('Shiriki na walezi', 'Share with guardians'), note: caps.transport ? L('Seva imeunganishwa.', 'A server is connected.') : L('Haiwezi kuwashwa: hakuna seva iliyounganishwa.', 'Cannot be enabled: no server is connected.'), pref: 'shareWithGuardians', checked: p.shareWithGuardians, disabled: !caps.transport })
    ]), { plain: true })}

    ${sect(L('Uwezo wa kifaa', 'Device capability'))}
    ${card(rows([
      row({ iconId: caps.transport ? 'i-wifi' : 'i-cloud', tone: caps.transport ? 'green' : 'muted', title: L('Seva', 'Server'), note: caps.transport ? L('Imeunganishwa', 'Connected') : L('Haijaunganishwa', 'Not connected'), right: chip(caps.transport ? L('Hai', 'On') : L('Hakuna', 'None'), caps.transport ? 'ok' : 'muted'), staticRow: true }),
      row({ iconId: 'i-bluetooth', tone: caps.bluetooth ? 'green' : 'muted', title: L('Bluetooth (BLE)', 'Bluetooth (BLE)'), note: caps.bluetooth ? L('Kivinjari hiki kina Web Bluetooth.', 'This browser exposes Web Bluetooth.') : L('Kivinjari hiki hakina Web Bluetooth.', 'This browser has no Web Bluetooth.'), right: chip(caps.bluetooth ? L('Inapatikana', 'Available') : L('Haipo', 'Missing'), caps.bluetooth ? 'ok' : 'muted'), staticRow: true }),
      row({ iconId: 'i-bell', tone: 'muted', title: L('Arifa za mfumo', 'System notifications'), note: `Hali: ${caps.notifications}`, right: chip(caps.notifications, 'muted'), staticRow: true })
    ]), { plain: true })}

    <div style="margin-top:16px">${alert(
      L('Hakuna mapendeleo hapa yanayotuma data kwa mtu yeyote. Yote ni ya kifaa hiki.', 'No preference here sends data to anybody. All of them are device-local.'),
      'info', 'i-lock')}</div>
  `;
  return { title: L('Mapendeleo ya usalama', 'Safety preferences'), sub: L('Kinachowashwa kwenye kifaa', 'What is on, on this device'), body, mark: 'i-settings' };
}

/* ------------------------------------------------------------- dispatcher */

const TITLES = {
  home, guardians, journey, checkin, plans, incidents, prefs
};

export async function renderPersonal(screen = 'home', state = {}) {
  if (screen === 'plan' && state?.params?.id) return planDetail(state.params.id);
  const fn = TITLES[screen] || home;
  const out = await fn(state);
  return { back: screen === 'home' ? null : 'personal.home', ...out };
}

export const PERSONAL_SCREENS = ['home', 'guardians', 'journey', 'checkin', 'plans', 'incidents', 'prefs'];
