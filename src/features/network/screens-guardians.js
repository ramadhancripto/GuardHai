/**
 * GuardHai · features/network/screens-guardians.js
 * Guardian Network screens. The consent model is visible in the UI, not just in
 * the service: an invitation is never shown as a guardian, and the accept button
 * only appears on an invitation addressed to you.
 */
import {
  L, esc, icon, card, chip, empty, btn, note, banner, field, checkbox, form, avatar, person,
  timeAgo, statusChip, statGrid, section
} from './network-ui.js';
import {
  listAsOwner, listAsGuardian, incomingInvitations, activeGuardians, get,
  roleDefaults, guardianStats
} from '../../services/guardian.service.js';
import {
  GUARDIAN_ROLES, GUARDIAN_ROLE_ORDER, GUARDIAN_PERMISSIONS, GUARDIAN_PERMISSION_KEYS,
  GUARDIAN_STATUS, guardianCan
} from '../../domain/network.js';

const roleLabel = (id) => GUARDIAN_ROLES[id]?.label || id;
const statusMeta = (id) => GUARDIAN_STATUS[id] || GUARDIAN_STATUS.sent;

const permList = (relationship) => GUARDIAN_PERMISSION_KEYS
  .filter((k) => guardianCan(relationship, k))
  .map((k) => GUARDIAN_PERMISSIONS[k].label);

/* ------------------------------------------------------------------- home */
async function home({ profiles }) {
  const [mine, asGuardian, incoming, stats] = await Promise.all([
    listAsOwner(), listAsGuardian(), incomingInvitations(), guardianStats()
  ]);
  const active = mine.filter((r) => r.status === 'active');
  const sent = mine.filter((r) => r.status === 'sent');
  const closed = mine.filter((r) => ['revoked', 'declined'].includes(r.status));

  const rowFor = (r, { showPermissions = true } = {}) => {
    const p = person(profiles, r.guardianId);
    const perms = permList(r);
    return `<div class="gh-net-guardrow">
      <div class="gh-net-guardmain">
        ${avatar(p)}
        <div class="gh-net-guardcopy">
          <b>${esc(p.name)}</b>
          <span>${esc(roleLabel(r.role))} · ${statusChip(statusMeta(r.status))}</span>
          ${showPermissions && perms.length ? `<span class="gh-net-perms">${perms.map((x) => chip(x, 'neutral')).join('')}</span>` : ''}
        </div>
      </div>
      <div class="gh-net-guardactions">
        ${r.status === 'active' ? btn(L('Ruhusa', 'Permissions'), { act: 'guardian.open', id: r.id, tone: 'outline' }) : ''}
        ${r.status === 'sent' ? btn(L('Ghairi', 'Cancel'), { act: 'guardian.cancel', id: r.id, tone: 'ghost' }) : ''}
        ${['revoked', 'declined'].includes(r.status) ? `<span class="gh-net-muted">${timeAgo(r.updatedAt)}</span>` : ''}
      </div>
    </div>`;
  };

  const body = `
    ${banner(L('Mwaliko si ruhusa — hadi akubali, hakuna kinachotumwa.', 'An invite is not authority — until accepted, nothing is sent.'), 'info', { iconId: 'i-shield-check' })}

    ${statGrid([
      { value: stats.active, label: L('Walezi hai', 'Active guardians'), tone: stats.active ? 'ok' : 'muted' },
      { value: stats.incoming, label: L('Mialiko yako', 'Invites to you'), tone: stats.incoming ? 'warn' : 'muted' },
      { value: stats.outgoing, label: L('Inasubiri jibu', 'Awaiting reply'), tone: stats.outgoing ? 'warn' : 'muted' },
      { value: stats.asGuardian, label: L('Wewe ni mlezi wa', 'You guard'), tone: 'info' }
    ])}

    ${incoming.length ? section(L('Mialiko inayokusubiri', 'Invitations waiting for you'),
      incoming.map((r) => {
        const p = person(profiles, r.ownerId);
        return card(`
          <div class="gh-net-invite">
            ${avatar(p)}
            <div class="gh-net-invite-copy">
              <b>${esc(p.name)}</b>
              <span>${L('Anakualika kuwa', 'Invites you as')} <b>${esc(roleLabel(r.role))}</b></span>
              <span class="gh-net-perms">${permList(r).map((x) => chip(x, 'neutral')).join('')}</span>
            </div>
          </div>
          <div class="gh-net-btnrow">
            ${btn(L('Kubali', 'Accept'), { act: 'guardian.accept', id: r.id, tone: 'primary', iconId: 'i-check' })}
            ${btn(L('Kataa', 'Decline'), { act: 'guardian.decline', id: r.id, tone: 'ghost' })}
            ${btn(L('Angalia', 'Review'), { act: 'guardian.open', id: r.id, tone: 'outline' })}
          </div>
        `);
      }).join(''), { note: L('Hakuna anakuwa mlezi wako bila wewe kubonyeza kubali.', 'Nobody becomes your guardian without you pressing accept.') })
      : ''}

    ${section(L('Walezi wako', 'Your guardians'),
      active.length
        ? card(active.map((r) => rowFor(r)).join(''), { padded: false, cls: 'is-list' })
        : empty({
            iconId: 'i-users',
            title: L('Hakuna mlezi bado', 'No guardian yet'),
            body: L('Mlezi ni mtu unayemchagua wewe, anayekubali, na unayeweza kumwondoa wakati wowote.', 'A guardian is someone you choose, who accepts, and whom you can remove at any time.'),
            action: btn(L('Alika mlezi', 'Invite a guardian'), { act: 'guardian.invite', tone: 'primary', iconId: 'i-user-plus' })
          }),
      { note: active.length ? '' : '' })}

    ${sent.length ? section(L('Mialiko uliyotuma', 'Invitations you sent'),
      card(sent.map((r) => rowFor(r, { showPermissions: false })).join(''), { padded: false, cls: 'is-list' }),
      { note: L('Mtu huyu si mlezi wako bado. Ujumbe wake unasema ukweli huo.', 'This person is not your guardian yet. Their row says so.') }) : ''}

    ${asGuardian.filter((r) => r.status === 'active').length ? section(L('Wewe ni mlezi wa', 'You are a guardian for'),
      card(asGuardian.filter((r) => r.status === 'active').map((r) => {
        const p = person(profiles, r.ownerId);
        return `<div class="gh-net-guardrow"><div class="gh-net-guardmain">${avatar(p)}
          <div class="gh-net-guardcopy"><b>${esc(p.name)}</b><span>${esc(roleLabel(r.role))} · ${statusChip(statusMeta(r.status))}</span></div></div>
          <div class="gh-net-guardactions">${btn(L('Ondoa', 'Step down'), { act: 'guardian.revoke', id: r.id, tone: 'ghost' })}</div></div>`;
      }).join(''), { padded: false, cls: 'is-list' })) : ''}

    ${closed.length ? section(L('Zilizofungwa', 'Closed'), card(closed.map((r) => rowFor(r, { showPermissions: false })).join(''), { padded: false, cls: 'is-list' })) : ''}

    <div class="gh-net-btnrow is-end">
      ${btn(L('Alika mlezi', 'Invite a guardian'), { act: 'guardian.invite', tone: 'primary', iconId: 'i-user-plus' })}
      ${btn(L('Tafuta watu', 'Find people'), { act: 'discover.go', tone: 'outline', iconId: 'i-search' })}
    </div>

    ${note(L('Ruhusa za mlezi hazitumiki kama ujumbe wa kawaida: taarifa za SOS zinahitaji seva, kwa hiyo kwa sasa hazifikii mtu yeyote. Tazama kila ruhusa kwenye ukurasa wake.', 'Guardian permissions are not the same as chat. SOS alerts need a server, so today they reach nobody. Each permission says so on its own page.'))}
  `;

  return {
    title: L('Walezi', 'Guardians'),
    subtitle: L(`${stats.active} hai · ${stats.incoming} mialiko`, `${stats.active} active · ${stats.incoming} invitations`),
    body
  };
}

/* ----------------------------------------------------------------- invite */
async function invite({ profiles }) {
  const people = Object.values(profiles).filter((p) => p.id !== 'me' && !p.isSelf);
  const roleChoices = GUARDIAN_ROLE_ORDER.map((r) => ({ value: r, label: `${GUARDIAN_ROLES[r].label} — ${GUARDIAN_ROLES[r].blurb}` }));

  const body = `
    ${banner(L('Mwaliko hautoi ruhusa. Mtu anakuwa mlezi baada ya yeye mwenyewe kukubali kwenye akaunti yake.', 'An invitation grants nothing. Someone becomes a guardian only after they accept on their own account.'), 'info', { iconId: 'i-info' })}

    ${form('guardian.send', `
      ${field({ label: L('Mtu', 'Person'), name: 'profileId', required: true, choices: [{ value: '', label: L('Chagua mtu…', 'Choose someone…') }]
        .concat(people.map((p) => ({ value: p.id, label: `${p.name}${p.sample ? ' (' + L('sampuli', 'sample') + ')' : ''}` }))) })}
      ${field({ label: L('Jukumu', 'Role'), name: 'role', choices: roleChoices })}
      ${field({ label: L('Ujumbe (si lazima)', 'Note (optional)'), name: 'note', type: 'textarea', rows: 2,
        placeholder: L('mf. Kwa dharura za usiku.', 'e.g. For night-time emergencies') })}
      <fieldset class="gh-net-checkset">
        <legend>${L('Ruhusa za kuanzia', 'Starting permissions')}</legend>
        <p class="gh-net-hint">${L('Ruhusa hizi zinaanza kutumika tu baada ya mwaliko kukubaliwa. Unaweza kuzibadilisha baadaye.', 'These apply only after the invitation is accepted. You can change them later.')}</p>
        ${GUARDIAN_PERMISSION_KEYS.map((k) => checkbox({
          label: GUARDIAN_PERMISSIONS[k].label,
          name: `perm:${k}`,
          hint: GUARDIAN_PERMISSIONS[k].blurb,
          checked: roleDefaults('backup')[k]
        })).join('')}
      </fieldset>
    `, { submit: L('Tuma mwaliko', 'Send invitation'), submitIcon: 'i-send', cancel: { label: L('Ghairi', 'Cancel'), act: 'guardian.home' } })}

    ${note(L('Hakuna seva iliyounganishwa: mwaliko umehifadhiwa kwenye kifaa hiki na haujafika kwa mtu huyo. Hali itaonyesha hilo.', 'No server is connected: the invitation is stored on this device and has not reached the person. The status will say so.'), 'warn')}
  `;
  return { title: L('Alika mlezi', 'Invite a guardian'), subtitle: L('Mwaliko unasubiri idhini', 'Invitation needs consent'), body, back: 'guardians.home' };
}

/* ----------------------------------------------------------------- detail */
async function detail({ state, profiles }) {
  const r = await get(state.params.id);
  if (!r) return { title: L('Walezi', 'Guardians'), body: empty({ iconId: 'i-alert-circle', title: L('Mahusiano hayapo', 'Relationship not found') }) };

  const p = person(profiles, r.guardianId);
  const owner = person(profiles, r.ownerId);
  const meta = statusMeta(r.status);

  const permsForm = r.status === 'active'
    ? form('guardian.permissions', `
        <input type="hidden" name="id" value="${esc(r.id)}">
        ${GUARDIAN_PERMISSION_KEYS.map((k) => checkbox({
          label: GUARDIAN_PERMISSIONS[k].label,
          name: `perm:${k}`,
          hint: GUARDIAN_PERMISSIONS[k].blurb,
          checked: !!(r.permissions || {})[k]
        })).join('')}
      `, { submit: L('Hifadhi ruhusa', 'Save permissions') })
    : `<p class="gh-net-p">${esc(meta.blurb)}</p>`;

  const body = `
    ${card(`
      <div class="gh-net-invite">${avatar(p)}
        <div class="gh-net-invite-copy">
          <b>${esc(p.name)}</b>
          <span>${esc(roleLabel(r.role))} · ${statusChip(meta)}</span>
          <span class="gh-net-hint">${L('Mmiliki', 'Owner')}: ${esc(owner.name)}</span>
        </div>
      </div>
      <p class="gh-net-p">${esc(meta.blurb)}</p>
    `)}

    ${section(L('Ruhusa', 'Permissions'), card(permsForm), {
      note: L('Kila ruhusa inaonyesha athari yake. Hakuna ruhusa inayotumika bila mahusiano kuwa “active”.', 'Each permission states its impact. No permission applies unless the relationship is active.')
    })}

    ${section(L('Historia', 'History'), card(`<ul class="gh-net-timeline">
      ${(r.history || []).map((h) => `<li><b>${esc(h.action)}</b><span>${timeAgo(h.at)} · ${esc(person(profiles, h.actorId).name)}${h.role ? ` · ${esc(roleLabel(h.role))}` : ''}</span></li>`).join('')}
    </ul>`))}

    <div class="gh-net-btnrow">
      ${r.status === 'active' ? btn(L('Ondoa ruhusa zote', 'Revoke all permissions'), { act: 'guardian.revoke', id: r.id, tone: 'danger', iconId: 'i-x' }) : ''}
      ${r.status === 'received' ? btn(L('Kubali', 'Accept'), { act: 'guardian.accept', id: r.id, tone: 'primary' }) : ''}
      ${r.status === 'received' ? btn(L('Kataa', 'Decline'), { act: 'guardian.decline', id: r.id, tone: 'ghost' }) : ''}
      ${r.status === 'sent' ? btn(L('Ghairi mwaliko', 'Cancel invitation'), { act: 'guardian.cancel', id: r.id, tone: 'ghost' }) : ''}
    </div>

    ${note(L('Ruhusa za mlezi zinahitaji seva kufikia mtu. Kwa sasa zinaonyeshwa kama hali ya kifaa, si ujumbe uliofika.', 'Guardian permissions need a server to reach anyone. Today they are device state, not messages that arrived.'), 'warn')}
  `;
  return { title: L('Mlezi', 'Guardian'), subtitle: esc(p.name), body, back: 'guardians.home' };
}

[home, invite, detail].forEach((fn) => { fn.partition = 'guardians'; });

export const GUARDIAN_SCREENS = {
  'guardians.home': home,
  'guardians.invite': invite,
  'guardians.detail': detail
};

export { roleLabel, statusMeta, permList };
