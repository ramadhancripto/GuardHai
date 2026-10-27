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
import { primeUrls } from '../../services/media.service.js';
import { commentCount } from '../../services/engagement.service.js';
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { escapeHtml } from '../../core/dom.js';
import { relativeTime, initials as initialsOf } from '../../core/format.js';
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

      <h3 class="gh-profile-h3">Majukumu</h3>
      <div class="gh-profile-roles">
        ${presentation.roles.map((r) => `
          <span class="gh-role-chip" style="--role-accent:${r.accent};--role-soft:${r.soft};--role-ink:${r.ink}">
            <svg class="ic"><use href="#${r.icon}"/></svg>${escapeHtml(r.label)}
          </span>`).join('')}
      </div>

      ${profile.topics.length ? `
        <h3 class="gh-profile-h3">Mada</h3>
        <div class="gh-profile-topics">
          ${profile.topics.map((t) => `<span class="gh-topic-chip">${escapeHtml(t)}</span>`).join('')}
        </div>` : ''}

      <h3 class="gh-profile-h3">Kuhusu</h3>
      <p class="gh-profile-bio">${escapeHtml(profile.bio || 'Hakuna maelezo bado.')}</p>
      ${profile.location ? `<p class="gh-profile-meta"><svg class="ic"><use href="#i-map-pin"/></svg>${escapeHtml(profile.location)}</p>` : ''}
      ${profile.joinedAt ? `<p class="gh-profile-meta"><svg class="ic"><use href="#i-clock"/></svg>Alijiunga ${escapeHtml(relativeTime(profile.joinedAt))}</p>` : ''}
    </section>`;
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

  body.innerHTML = `
    <header class="gh-profile-cover">
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
        <span class="gh-profile-avatar" aria-hidden="true">${escapeHtml(profile.initials || initialsOf(profile.name))}</span>
        <span class="gh-profile-rolebadge" title="${escapeHtml(role.label)}">
          <svg class="ic"><use href="#${role.icon}"/></svg>
        </span>
      </div>
    </header>

    <section class="gh-profile-identity">
      <h1 class="gh-profile-name" id="ghProfileName">${escapeHtml(profile.name)}</h1>
      <p class="gh-profile-roleline">${escapeHtml(role.label)}${profile.roles.length > 1 ? ` · +${profile.roles.length - 1}` : ''}</p>
      <div class="gh-profile-badges">${badgeHtml(presentation.badges)}</div>
      <p class="gh-profile-bio">${escapeHtml(profile.bio || 'Hakuna maelezo bado.')}</p>

      <div class="gh-profile-stats">
        <div><b>${posts.length}</b><span>Machapisho</span></div>
        <div><b>${profile.topics.length}</b><span>Mada</span></div>
        <div><b>${profile.roles.length}</b><span>Majukumu</span></div>
      </div>

      <div class="gh-profile-actions">
        ${isSelf
          ? `<button type="button" class="gh-btn gh-btn-primary" data-profile-action="edit">
               <svg class="ic"><use href="#i-edit"/></svg> Hariri wasifu</button>`
          : `<button type="button" class="gh-btn ${following ? 'gh-btn-outline is-on' : 'gh-btn-primary'}"
               data-profile-action="follow" aria-pressed="${following}">
               <svg class="ic"><use href="#${following ? 'i-check' : 'i-user-plus'}"/></svg>
               <span>${following ? 'Unafuata' : 'Fuata'}</span></button>`}
        <button type="button" class="gh-btn gh-btn-outline" data-profile-action="message" aria-describedby="ghMsgNote">
          <svg class="ic"><use href="#i-message"/></svg> Tuma ujumbe
        </button>
      </div>
        <p class="gh-profile-note" id="ghMsgNote">
          Ujumbe haujaunganishwa: hakuna seva ya mawasiliano, kwa hiyo hakuna kinachotumwa.
        </p>

      <div class="gh-profile-tabs" role="tablist">
        <button type="button" role="tab" class="gh-profile-tab ${currentTab === 'posts' ? 'is-active' : ''}"
                data-profile-tab="posts" aria-selected="${currentTab === 'posts'}">Machapisho</button>
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
