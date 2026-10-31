/**
 * GuardHai · features/network/screens-safety.js
 * The shared safety centre: reports, moderation outcomes, appeals, blocks and
 * the plain statement of what is (and is not) protected.
 *
 * The encryption line is deliberate. No end-to-end encryption is implemented, so
 * the app says exactly that instead of implying privacy it cannot provide.
 */
import {
  L, esc, icon, card, chip, empty, btn, note, banner, field, form, person,
  timeAgo, statusChip, section, statGrid
} from './network-ui.js';
import { listReports, listAppeals, safetySummary, appealStatusOf } from '../../services/safety.service.js';
import { listBlocked as listBlocks } from '../../services/chat.service.js';
import { REPORT_REASONS, REPORT_SUBJECTS, MODERATION_ACTIONS } from '../../domain/network.js';

/* ------------------------------------------------------------------- home */
async function home({ profiles }) {
  const [reports, appeals, blocks, summary] = await Promise.all([
    listReports({ mine: true }), listAppeals(), listBlocks(), safetySummary()
  ]);

  const body = `
    ${statGrid([
      { value: summary.pending, label: L('Ripoti zinazosubiri', 'Pending reports'), tone: summary.pending ? 'warn' : 'muted' },
      { value: summary.decided, label: L('Zilizoamuliwa', 'Decided'), tone: 'muted' },
      { value: summary.appeals, label: L('Rufaa wazi', 'Open appeals'), tone: summary.appeals ? 'warn' : 'muted' },
      { value: summary.blocked, label: L('Waliozuiwa', 'Blocked'), tone: summary.blocked ? 'danger' : 'muted' }
    ])}

    ${section(L('Ripoti zangu', 'My reports'), reports.length
      ? card(reports.map((r) => `<div class="gh-net-row">
          <span class="gh-net-avatar" aria-hidden="true">${icon('i-flag')}</span>
          <span class="gh-net-rowcopy"><b>${esc(REPORT_REASONS[r.reason]?.label || r.reason)}</b>
            <small>${esc(REPORT_SUBJECTS[r.subjectType] || r.subjectType)} · ${timeAgo(r.createdAt)}${r.decision ? ` · ${esc(MODERATION_ACTIONS[r.decision]?.label || r.decision)}` : ''}</small></span>
          <span class="gh-net-rowright">${r.status === 'pending' ? chip(L('Inasubiri', 'Pending'), 'warn') : chip(L('Imeamuliwa', 'Decided'), 'muted')}</span>
        </div>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-flag', title: L('Hakuna ripoti', 'No reports'), body: L('Ripoti zinazohusu jamii huamuliwa na wasimamizi wa jamii. Nje ya jamii hakuna msimamizi aliyeunganishwa.', 'Reports inside a community are decided by its moderators. Outside one, no moderator is connected.') }))}

    ${section(L('Rufaa', 'Appeals'), appeals.length
      ? card(appeals.map((a) => `<div class="gh-net-row">
          <span class="gh-net-avatar" aria-hidden="true">${icon('i-undo')}</span>
          <span class="gh-net-rowcopy"><b>${esc(a.subjectType)}</b><small>${esc(a.reason.slice(0, 80))} · ${timeAgo(a.createdAt)}</small></span>
          <span class="gh-net-rowright">${statusChip(appealStatusOf(a.status))}</span>
        </div>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-undo', title: L('Hakuna rufaa', 'No appeals'), body: L('Unaweza kuwasilisha rufaa dhidi ya uamuzi wa usimamizi.', 'You can file an appeal against a moderation decision.') }))}

    ${section(L('Waliozuiwa', 'Blocked people'), blocks.length
      ? card(blocks.map((b) => `<div class="gh-net-row">
          <span class="gh-net-avatar" aria-hidden="true">${icon('i-user')}</span>
          <span class="gh-net-rowcopy"><b>${esc(person(profiles, b.targetId).name)}</b><small>${L('Umezuiwa', 'Blocked')} · ${timeAgo(b.createdAt)}</small></span>
          <span class="gh-net-rowright">${btn(L('Ondoa zuio', 'Unblock'), { act: 'safety.unblock', id: b.targetId, tone: 'outline' })}</span>
        </div>`).join(''), { padded: false, cls: 'is-list' })
      : empty({ iconId: 'i-user', title: L('Hakuna mtu aliyezuiwa', 'Nobody blocked'), body: '' }))}

    ${section(L('Usimbaji fiche na usalama', 'Encryption and safety'), card(`
      <ul class="gh-net-honest">
        <li>${icon('i-x', 'is-muted')}<span><b>${L('Hakuna usimbaji fiche wa mwisho-hadi-mwisho.', 'There is no end-to-end encryption.')}</b> ${L('Ujumbe huhifadhiwa kama maandishi kwenye hifadhidata ya kifaa hiki. Hatudai ulinzi ambao haujajengwa.', 'Messages are stored as plain records in this device’s database. We do not claim protection that was not built.')}</span></li>
        <li>${icon('i-check-circle', 'is-ok')}<span>${L('Kuzuia na kuripoti hufanya kazi kwenye kifaa hiki mara moja.', 'Blocking and reporting work on this device immediately.')}</span></li>
        <li>${icon('i-x', 'is-muted')}<span>${L('Hakuna msimamizi wa jukwaa aliyeunganishwa; ripoti za nje ya jamii hazifikii mtu.', 'No platform moderator is connected; reports outside a community reach nobody.')}</span></li>
        <li>${icon('i-x', 'is-muted')}<span>${L('Hakuna seva, kwa hiyo hakuna uhakika wa uwasilishaji kwa mtu mwingine.', 'No server, so no guarantee of delivery to anyone else.')}</span></li>
      </ul>
      <div class="gh-net-btnrow">
        ${btn(L('Ripoti kitu', 'Report something'), { act: 'safety.reportPrompt', id: 'general', tone: 'outline', iconId: 'i-flag', extra: 'data-subject="user" data-target="general"' })}
        ${btn(L('Wasilisha rufaa', 'File an appeal'), { act: 'safety.appealPrompt', id: 'moderation', tone: 'ghost', iconId: 'i-undo' })}
      </div>
    `))}
  `;

  return { title: L('Usalama', 'Safety'), subtitle: L('Kuzuia · ripoti · rufaa', 'Block · report · appeal'), body };
}

/* ----------------------------------------------------------------- report */
async function report({ state }) {
  const subject = state.params.subject || 'user';
  const target = state.params.target || '';
  const body = `
    ${banner(L('Ripoti inahifadhiwa kwenye kifaa hiki. Kama ni ndani ya jamii, msimamizi wake anaweza kuiona.', 'The report is stored on this device. Inside a community its moderators can see it.'), 'info', { iconId: 'i-flag' })}

    ${form('safety.submitReport', `
      <input type="hidden" name="subjectType" value="${esc(subject)}">
      <input type="hidden" name="subjectId" value="${esc(target)}">
      ${field({ label: L('Sababu', 'Reason'), name: 'reason', choices: Object.values(REPORT_REASONS).map((r) => ({ value: r.id, label: r.label })) })}
      ${field({ label: L('Maelezo', 'Details'), name: 'detail', type: 'textarea', rows: 4,
        hint: L('Si lazima. Usiweke taarifa nyeti.', 'Optional. Do not include sensitive details.') })}
      ${state.params.communityId ? `<input type="hidden" name="communityId" value="${esc(state.params.communityId)}">` : ''}
    `, { submit: L('Tuma ripoti', 'Send report'), submitIcon: 'i-flag', cancel: { label: L('Ghairi', 'Cancel'), act: 'back' } })}

    ${note(L('Kuripoti hakumzuii mtu. Tumia “Zuia” pia kama hutaki kuendelea kuwasiliana.', 'Reporting does not block anyone. Use “Block” too if you do not want further contact.'), 'warn')}
  `;
  return { title: L('Ripoti', 'Report'), subtitle: esc(REPORT_SUBJECTS[subject] || subject), body, back: 'chats.home' };
}

/* ----------------------------------------------------------------- appeal */
async function appeal() {
  const body = `
    ${form('safety.submitAppeal', `
      ${field({ label: L('Aina ya uamuzi', 'What decision'), name: 'subjectType', choices: [
        { value: 'moderation', label: L('Uamuzi wa usimamizi', 'A moderation decision') },
        { value: 'removal', label: L('Kuondolewa kwenye jamii', 'Removal from a community') },
        { value: 'block', label: L('Zuio', 'A block') }
      ] })}
      ${field({ label: L('Sababu ya rufaa', 'Reason for appeal'), name: 'reason', type: 'textarea', rows: 5, required: true,
        hint: L('Herufi 20–800. Eleza kwa nini uamuzi ulikuwa si sahihi.', '20–800 characters. Explain why the decision was wrong.') })}
    `, { submit: L('Wasilisha rufaa', 'Submit appeal'), submitIcon: 'i-undo', cancel: { label: L('Ghairi', 'Cancel'), act: 'safety.home' } })}
    ${note(L('Rufaa huamuliwa na msimamizi wa jamii husika. Nje ya jamii hakuna msimamizi aliyeunganishwa, kwa hiyo rufaa itabaki wazi.', 'Appeals are decided by the relevant community moderator. Outside a community no moderator is connected, so the appeal stays open.'), 'warn')}
  `;
  return { title: L('Rufaa', 'Appeal'), subtitle: L('Dhidi ya uamuzi wa usimamizi', 'Against a moderation decision'), body, back: 'safety.home' };
}

[home, report, appeal].forEach((fn) => { fn.partition = 'chats'; });
report.back = 'chats.home';

export const SAFETY_SCREENS = {
  'safety.home': home,
  'safety.report': report,
  'safety.appeal': appeal
};
