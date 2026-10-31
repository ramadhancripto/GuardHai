/**
 * GuardHai · features/profile/profile-view.js
 * The profile page: a full-height overlay (not a sheet) because it holds a
 * cover, a post list and an evidence panel.
 *
 * Visual identity comes from the primary role (see domain/profile.js): accent
 * colour, cover gradient and icon. Verification is rendered from evidence only —
 * the two kinds (licence, institution) are always shown separately.
 */
import { getProfile, postsByAuthor, isFollowing, toggleFollow, message, presentationOf, saveMyProfile } from '../../services/profile.service.js';
import { postCard } from '../feed/post-card.js';
import { primeUrls, getCachedUrl } from '../../services/media.service.js';
import { commentCount } from '../../services/engagement.service.js';
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { escapeHtml } from '../../core/dom.js';
import { relativeTime, initials as initialsOf } from '../../core/format.js';
import { POST_TYPES, TOPICS, normalizeTopic, topicLabel } from '../../domain/post.js';
import { openProfileEditor } from './profile-edit.js';

const el = (id) => document.getElementById(id);

let currentId = null;
let currentTab = 'posts';

/* ------------------------------------------------------------------ shell */
function mount() {
  let host = el('ghProfile');
  if (host) return host;

  host = document.createElement('div');
  host.id = 'ghProfile';
  host.className = 'gh-profile';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  host.setAttribute('aria-labelledby', 'ghProfileName');
  host.innerHTML = `
    <div class="gh-profile-sheet">
      <div class="gh-profile-body" id="ghProfileBody"></div>
    </div>`;
  document.body.appendChild(host);
  host.addEventListener('click', (e) => { if (e.target === host) closeProfile(); });
  return host;
}

export function closeProfile() {
  const host = el('ghProfile');
  if (host) host.classList.remove('open');
  document.documentElement.classList.remove('gh-no-scroll');
  currentId = null;
}

/* ----------------------------------------------------------------- render */
function badgeHtml(badges) {
  if (!badges.length) return '';
  return badges.map((b) => `
    <span class="gh-badge gh-badge-${b.tone}" title="${escapeHtml(b.title || b.label)}">
      <svg class="ic" aria-hidden="true"><use href="#${b.icon}"/></svg>${escapeHtml(b.label)}
    </span>`).join('');
}

function verificationRow(v) {
  const state = {
    verified: { label: 'Imethibitishwa', tone: 'ok' },
    requested: { label: 'Inasubiri uthibitisho', tone: 'wait' },
    sample: { label: 'Sampuli — hakuna uthibitisho', tone: 'neutral' },
    none: { label: 'Hakuna uthibitisho', tone: 'neutral' }
  }[v.status] || { label: 'Hakuna', tone: 'neutral' };

  return `
    <div class="gh-verify-row">
      <span class="gh-verify-ico"><svg class="ic"><use href="#${v.icon}"/></svg></span>
      <div class="gh-verify-text">
        <b>${escapeHtml(v.label)}</b>
        <span>${escapeHtml(state.label)}${v.authority ? ` · ${escapeHtml(v.authority)}` : ''}</span>
        <small>${escapeHtml(v.needs)}</small>
      </div>
      <span class="gh-verify-state is-${state.tone}">${state.tone === 'ok' ? '✓' : state.tone === 'wait' ? '…' : '—'}</span>
    </div>`;
}

function verifyPill(presentation, profile) {
  const lic = presentation.verification.licence;
  const inst = presentation.verification.institution;
  if (lic.status === 'verified') {
    return `<span class="gh-verify-pill is-ok"><svg class="ic"><use href="#i-shield-check"/></svg>
      Uthibitisho wa taaluma</span>`;
  }
  if (lic.status === 'requested') {
    return `<span class="gh-verify-pill is-wait"><svg class="ic"><use href="#i-clock"/></svg>
      Uthibitisho wa taaluma: inasubiri</span>`;
  }
  if (inst.status === 'verified') {
    return `<span class="gh-verify-pill is-ok"><svg class="ic"><use href="#i-building"/></svg>
      Uthibitisho wa taasisi</span>`;
  }
  return `<span class="gh-verify-pill is-none"><svg class="ic"><use href="#i-shield"/></svg>
    ${profile.sample ? 'Sampuli — hakuna uthibitisho' : 'Hajathibitishwa'}</span>`;
}

function affiliationLine(profile, presentation) {
  const inst = presentation.verification.institution;
  const role = presentation.role?.label || '';
  // A verified institution wins over the free-text affiliation: evidence first.
  if (inst.status === 'verified' && inst.authority) {
    return `<p class="gh-profile-affil"><svg class="ic"><use href="#i-building"/></svg>${escapeHtml(inst.authority)}</p>`;
  }
  if (profile.affiliation) {
    return `<p class="gh-profile-affil">${escapeHtml(role)} | ${escapeHtml(profile.affiliation)}</p>`;
  }
  if (profile.location) {
    return `<p class="gh-profile-affil"><svg class="ic"><use href="#i-map-pin"/></svg>${escapeHtml(profile.location)}</p>`;
  }
  return '';
}

/**
 * Two small information cards shaped by the primary role, following the
 * showcase: a clinician shows the facility + consulting hours, an officer shows
 * the unit + the area covered, an institution shows its kind + coverage, a
 * volunteer shows where they serve + when, a neighbour shows place + topics.
 *
 * Cards only render when the owner (or the sample persona) actually filled the
 * value in — nothing is interpolated to make the layout look fuller.
 */
export function infoCards(profile, presentation) {
  const roleId = presentation.role?.id || 'member';
  const maps = {
    health: [
      { icon: 'i-building', label: 'Kituo', value: profile.affiliation },
      { icon: 'i-clock', label: 'Saa za Upatikanaji', value: profile.availability }
    ],
    safety: [
      { icon: 'i-shield', label: 'Kitengo', value: profile.affiliation },
      { icon: 'i-map-pin', label: 'Eneo la Huduma', value: profile.coverage }
    ],
    org: [
      { icon: 'i-building', label: 'Aina ya Taasisi', value: profile.orgKind },
      { icon: 'i-map-pin', label: 'Eneo', value: profile.coverage || profile.location }
    ],
    volunteer: [
      { icon: 'i-users', label: 'Maeneo ya Kujitolea', value: profile.serviceAreas },
      { icon: 'i-clock', label: 'Upatikanaji', value: profile.availability }
    ],
    member: [
      { icon: 'i-map-pin', label: 'Mahali', value: profile.location },
      { icon: 'i-star', label: 'Mada', value: (profile.topics || []).join(', ') }
    ]
  };
  const cards = (maps[roleId] || maps.member).filter((c) => String(c.value || '').trim());
  if (!cards.length) return '';
  return `
    <div class="gh-profile-infocards" data-info-role="${escapeHtml(roleId)}">
      ${cards.map((c) => `
        <div class="gh-profile-infocard">
          <span class="gh-profile-infocard-ico"><svg class="ic" aria-hidden="true"><use href="#${c.icon}"/></svg></span>
          <span class="gh-profile-infocard-txt">
            <b>${escapeHtml(c.label)}</b>
            <span>${escapeHtml(c.value)}</span>
          </span>
        </div>`).join('')}
    </div>
    ${profile.sample ? '<p class="gh-profile-infocard-note">Taarifa hizi ni za sampuli — hazijathibitishwa na taasisi yoyote.</p>' : ''}`;
}

const TYPE_ICON = {
  elimu: 'i-book-open', swali: 'i-message', uzoefu: 'i-users', taarifa: 'i-bell', fursa: 'i-heart'
};

/**
 * A row of real counts by post type. It renders only the types this account has
 * actually published, so an empty profile shows nothing instead of zeros.
 */
function contributionStrip(posts) {
  const counts = {};
  posts.forEach((p) => { const t = POST_TYPES[p.type] ? p.type : 'elimu'; counts[t] = (counts[t] || 0) + 1; });
  const rows = Object.keys(counts).filter((t) => counts[t] > 0);
  if (!rows.length) return '';
  return `
    <div class="gh-profile-contrib" aria-label="Aina za machapisho">
      ${rows.map((t) => `
        <span class="gh-contrib-pill">
          <svg class="ic" aria-hidden="true"><use href="#${TYPE_ICON[t] || 'i-list'}"/></svg>
          <b>${counts[t]}</b> ${escapeHtml(POST_TYPES[t].label)}
        </span>`).join('')}
    </div>`;
}

/** Topic chips: canonical post topics get their accent; free interests stay neutral. */
function topicChips(topics) {
  return topics.map((t) => {
    const id = normalizeTopic(t, '');
    const known = id && TOPICS[id];
    return `<span class="gh-topic-chip${known ? ` is-topic-${id}` : ''}">
      <svg class="ic"><use href="#i-star"/></svg>${escapeHtml(known ? topicLabel(id) : t)}</span>`;
  }).join('');
}

const topicBlock = (topics, heading) => (topics.length ? `
  <h3 class="gh-profile-h3">${heading}</h3>
  <div class="gh-profile-topicrow">${topicChips(topics)}</div>
  <p class="gh-profile-note">Mada binafsi anazofuatilia — si lebo za chapisho.</p>` : '');

function aboutPanel(profile, presentation) {
  return `
    <section class="gh-profile-about">
      <h3 class="gh-profile-h3">Uthibitisho</h3>
      <p class="gh-profile-note">
        Uthibitisho wa taaluma na wa taasisi ni vitu viwili tofauti. Hakuna beji
        inayotolewa kwa kuchagua jukumu pekee — inahitaji ushahidi uliothibitishwa.
      </p>
      ${verificationRow(presentation.verification.licence)}
      ${verificationRow(presentation.verification.institution)}

      <h3 class="gh-profile-h3">Jukumu na ushahidi</h3>
      <div class="gh-profile-ledger">
        ${presentation.roles.map((r) => `
          <div class="gh-ledger-row">
            <svg class="ic"><use href="#${r.icon}"/></svg>
            <div><b>${escapeHtml(r.label)}</b><span>Jukumu alilojichagua — si uthibitisho</span></div>
          </div>`).join('')}
      </div>

      <h3 class="gh-profile-h3">Majukumu</h3>
      <div class="gh-profile-roles">
        ${presentation.roles.map((r) => `
          <span class="gh-role-chip" style="--role-accent:${r.accent};--role-soft:${r.soft};--role-ink:${r.ink}">
            <svg class="ic"><use href="#${r.icon}"/></svg>${escapeHtml(r.label)}
          </span>`).join('')}
      </div>

      ${topicBlock(profile.topics, 'Mada anazofuatilia')}

      <h3 class="gh-profile-h3">Kuhusu</h3>
      <p class="gh-profile-bio">${escapeHtml(profile.bio || 'Hakuna maelezo bado.')}</p>
      ${profile.location ? `<p class="gh-profile-meta"><svg class="ic"><use href="#i-map-pin"/></svg>${escapeHtml(profile.location)}</p>` : ''}
      ${profile.joinedAt ? `<p class="gh-profile-meta"><svg class="ic"><use href="#i-clock"/></svg>Alijiunga ${escapeHtml(relativeTime(profile.joinedAt))}</p>` : ''}
    </section>`;
}

function photosPanel(posts) {
  const shots = [];
  posts.forEach((post) => (post.media || []).forEach((m) => {
    if (m.kind === 'image' && !m.placeholder && (m.url || getCachedUrl(m.id))) shots.push(m);
  }));
  if (!shots.length) return '<p class="gh-feed-empty">Hakuna picha bado.</p>';
  return `<div class="gh-photo-grid">${shots.map((m, i) => `
    <button type="button" class="gh-gal-item" data-media="${escapeHtml(m.id)}"
            data-post="${escapeHtml(m.postId || '')}" data-index="${i}" aria-label="Fungua picha ${i + 1}">
      <img src="${escapeHtml(m.url || getCachedUrl(m.id))}" alt="${escapeHtml(m.name || `Picha ${i + 1}`)}" loading="lazy">
    </button>`).join('')}</div>`;
}

async function render() {
  const host = mount();
  const body = el('ghProfileBody');
  const profile = await getProfile(currentId);
  if (!profile) { toast('Wasifu haupatikani.'); return; }

  const presentation = presentationOf(profile);
  const role = presentation.role;
  const following = await isFollowing(profile.id);
  const isSelf = profile.isSelf || profile.id === 'me';
  const posts = await postsByAuthor(profile.id);
  await primeUrls(posts);
  const counts = {};
  await Promise.all(posts.map(async (p) => { counts[p.id] = (await commentCount(p.id)) || 0; }));

  body.style.setProperty('--gh-role', role.accent);
  body.style.setProperty('--gh-role-soft', role.soft);
  body.style.setProperty('--gh-role-ink', role.ink);

  const verified = presentation.badges.some((b) => b.tone === 'verified');
  const cover = profile.coverUrl
    ? `<img class="gh-profile-cover-img" src="${escapeHtml(profile.coverUrl)}" alt="" loading="lazy">`
    : '';
  const avatar = profile.avatarUrl
    ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="">`
    : escapeHtml(profile.initials || initialsOf(profile.name));
  const notices = posts.filter((post) => post.type === 'taarifa');
  const shots = posts.reduce((n, post) => n + (post.media || [])
    .filter((m) => m.kind === 'image' && !m.placeholder).length, 0);

  body.innerHTML = `
    <header class="gh-profile-cover">
      ${cover}
      <div class="gh-profile-cover-grad"></div>
      <div class="gh-profile-topbar">
        <button type="button" class="gh-profile-iconbtn" data-profile-action="back" aria-label="Rudi">
          <svg class="ic"><use href="#i-arrow-left"/></svg>
        </button>
        <div class="gh-profile-topactions">
          <button type="button" class="gh-profile-iconbtn" data-profile-action="share" aria-label="Shiriki wasifu">
            <svg class="ic"><use href="#i-share"/></svg>
          </button>
          ${isSelf ? `<button type="button" class="gh-profile-iconbtn" data-profile-action="edit" aria-label="Hariri wasifu">
            <svg class="ic"><use href="#i-edit"/></svg></button>` : ''}
        </div>
      </div>

      <div class="gh-profile-avatar-wrap">
        <span class="gh-profile-avatar" aria-hidden="true">${avatar}</span>
        <span class="gh-profile-rolebadge" title="${escapeHtml(role.label)}">
          <svg class="ic"><use href="#${role.icon}"/></svg>
        </span>
      </div>
    </header>

    <section class="gh-profile-identity">
      <h1 class="gh-profile-name" id="ghProfileName">${escapeHtml(profile.name)}${verified
        ? '<svg class="ic gh-verified-check" aria-label="Imethibitishwa"><use href="#i-check-circle"/></svg>' : ''}</h1>
      <p class="gh-profile-roleline">${escapeHtml(role.label)}${profile.roles.length > 1 ? ` · +${profile.roles.length - 1}` : ''}</p>

      <div class="gh-profile-verifyline">
        ${verifyPill(presentation, profile)}
        ${badgeHtml(presentation.badges)}
      </div>
      ${affiliationLine(profile, presentation)}
      ${infoCards(profile, presentation)}

      <div class="gh-profile-stats">
        <div><b>${posts.length}</b><span>Machapisho</span></div>
        <div><b>${profile.topics.length}</b><span>Mada</span></div>
        <div><b>${profile.roles.length}</b><span>Majukumu</span></div>
      </div>
      ${contributionStrip(posts)}

      <div class="gh-profile-actions">
        ${isSelf
          ? `<button type="button" class="gh-btn gh-btn-primary" data-profile-action="edit">
               <svg class="ic"><use href="#i-edit"/></svg> Hariri wasifu</button>`
          : `<button type="button" class="gh-btn gh-btn-message" data-profile-action="message" aria-describedby="ghMsgNote">
               <svg class="ic"><use href="#i-message"/></svg> Tuma Ujumbe</button>
             <button type="button" class="gh-btn ${following ? 'gh-btn-outline is-on' : 'gh-btn-primary'}"
               data-profile-action="follow" aria-pressed="${following}">
               <svg class="ic"><use href="#${following ? 'i-check' : 'i-user-plus'}"/></svg>
               <span>${following ? 'Unafuata' : 'Fuata'}</span></button>`}
        <button type="button" class="gh-btn gh-btn-square" data-profile-action="share" aria-label="Shiriki wasifu">
          <svg class="ic"><use href="#i-more-vertical"/></svg>
        </button>
      </div>
      <p class="gh-profile-note" id="ghMsgNote">
        Ujumbe haujaunganishwa: hakuna seva ya mawasiliano, kwa hiyo hakuna kinachotumwa.
      </p>

      <h3 class="gh-profile-h3">Kuhusu Mimi</h3>
      <p class="gh-profile-bio">${escapeHtml(profile.bio || 'Hakuna maelezo bado.')}</p>

      ${topicBlock(profile.topics, 'Mada anazofuatilia')}

      <div class="gh-profile-tabs" role="tablist">
        <button type="button" role="tab" class="gh-profile-tab ${currentTab === 'posts' ? 'is-active' : ''}"
                data-profile-tab="posts" aria-selected="${currentTab === 'posts'}">Machapisho</button>
        <button type="button" role="tab" class="gh-profile-tab ${currentTab === 'notices' ? 'is-active' : ''}"
                data-profile-tab="notices" aria-selected="${currentTab === 'notices'}">Taarifa${notices.length ? ` (${notices.length})` : ''}</button>
        <button type="button" role="tab" class="gh-profile-tab ${currentTab === 'photos' ? 'is-active' : ''}"
                data-profile-tab="photos" aria-selected="${currentTab === 'photos'}">Picha${shots ? ` (${shots})` : ''}</button>
        <button type="button" role="tab" class="gh-profile-tab ${currentTab === 'about' ? 'is-active' : ''}"
                data-profile-tab="about" aria-selected="${currentTab === 'about'}">Kuhusu</button>
      </div>
    </section>

    <section class="gh-profile-tabpanel" id="ghProfilePanel">
      ${currentTab === 'posts'
        ? (posts.length
            ? posts.map((p) => postCard(p, {
                flags: {}, commentCount: counts[p.id] || 0, hideFollow: true, role: presentation.role
              })).join('')
            : '<p class="gh-feed-empty">Hakuna chapisho bado.</p>')
        : currentTab === 'notices'
          ? (notices.length
              ? notices.map((p) => postCard(p, {
                  flags: {}, commentCount: counts[p.id] || 0, hideFollow: true, role: presentation.role
                })).join('')
              : '<p class="gh-feed-empty">Hakuna taarifa rasmi bado.</p>')
          : currentTab === 'photos'
            ? photosPanel(posts)
            : aboutPanel(profile, presentation)}
    </section>
  `;

  host.classList.add('open');
  document.documentElement.classList.add('gh-no-scroll');
  host.querySelector('.gh-profile-body').scrollTop = 0;
}

/* ------------------------------------------------------------------ open */
export async function openProfile(id, { tab = 'posts' } = {}) {
  currentId = id;
  currentTab = tab;
  closeSheet();
  await render();
}

export async function openMyProfile() {
  return openProfile('me');
}

/* --------------------------------------------------------------- actions */
async function shareProfile() {
  const profile = await getProfile(currentId);
  const url = `${location.origin}${location.pathname}#/wasifu/${encodeURIComponent(profile.id)}`;
  const payload = { title: `${profile.name} · GuardHai`, text: profile.bio || profile.name, url };

  if (typeof navigator.share === 'function') {
    try { await navigator.share(payload); return { via: 'native' }; }
    catch (err) { if (err?.name === 'AbortError') return { via: 'cancelled' }; }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Kiungo cha wasifu kimenakiliwa.');
    return { via: 'clipboard' };
  } catch {
    openSheet('Shiriki wasifu', `<input class="ghc-input" readonly value="${escapeHtml(url)}" onclick="this.select()">`);
    return { via: 'sheet' };
  }
}

function wire() {
  document.addEventListener('click', async (event) => {
    const host = el('ghProfile');
    if (!host || !host.classList.contains('open')) return;

    const tabBtn = event.target.closest('[data-profile-tab]');
    if (tabBtn) { currentTab = tabBtn.dataset.profileTab; await render(); return; }

    const actionBtn = event.target.closest('[data-profile-action]');
    if (!actionBtn) return;
    const action = actionBtn.dataset.profileAction;

    if (action === 'back') { closeProfile(); return; }
    if (action === 'share') { await shareProfile(); return; }
    if (action === 'edit') { await openProfileEditor(); return; }
    if (action === 'follow') {
      const following = await toggleFollow(currentId);
      toast(following ? 'Unafuata wasifu huu (kwenye kifaa hiki).' : 'Umeacha kufuata.');
      await render();
      return;
    }
    if (action === 'message') {
      const result = await message(currentId);
      toast(result.detail);
      if (result.ok) {
        // reuse the network shell instead of a second chat surface
        closeProfile();
        if (window.HomeUI?.go) window.HomeUI.go('chat');
        window.GHNetwork?.open('chats.thread', { id: result.conversationId });
      }
      return;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el('ghProfile')?.classList.contains('open')) closeProfile();
  });
}

let wired = false;
export function initProfileView() {
  if (wired) return;
  wired = true;
  wire();
}

export { saveMyProfile };
