/**
 * GuardHai · features/profile/profile-edit.js
 * Edit the device owner's profile, and request verification.
 *
 * Verification requests are recorded as *requests*: they set `requested: true`
 * and store the reference the user typed, but they never set `checkedBy`, so no
 * badge appears. A verifier with a backend would fill that in.
 */
import { myProfile, saveMyProfile, requestVerification, presentationOf } from '../../services/profile.service.js';
import { ROLES, ROLE_ORDER, MAX_ROLES, BIO_MAX, TOPICS_MAX } from '../../domain/profile.js';
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { escapeHtml } from '../../core/dom.js';

const el = (id) => document.getElementById(id);

const SUGGESTED_TOPICS = [
  'Afya', 'Lishe', 'Afya ya akili', 'Msaada wa kwanza',
  'Uhalifu na Mali', 'Usalama wa Watu', 'Kidijitali',
  'Ajali na Majanga', 'Misaada', 'Elimu'
];

/** selection order matters: the first selected role becomes the profile accent */
let selectedRoles = [];

function readForm() {
  const topics = [...document.querySelectorAll('[data-pe-topic].is-active')].map((b) => b.dataset.peTopic);
  const extra = (el('ghPeTopicInput')?.value || '').split(',').map((t) => t.trim()).filter(Boolean);
  return {
    name: el('ghPeName')?.value || '',
    bio: el('ghPeBio')?.value || '',
    location: el('ghPeLocation')?.value || '',
    roles: selectedRoles.slice(),
    topics: [...new Set([...topics, ...extra])].slice(0, TOPICS_MAX)
  };
}

function chip(label, value, active, attr) {
  return `<button type="button" class="gh-pe-chip ${active ? 'is-active' : ''}" ${attr}="${escapeHtml(value)}"
    aria-pressed="${active}">${escapeHtml(label)}</button>`;
}

export async function openProfileEditor() {
  const profile = await myProfile();
  const presentation = presentationOf(profile);

  selectedRoles = profile.roles.slice(0, MAX_ROLES);

  openSheet('Hariri wasifu', `
    <label class="ghc-label" for="ghPeName">Jina</label>
    <input id="ghPeName" class="ghc-input" maxlength="40" value="${escapeHtml(profile.name)}">

    <label class="ghc-label" for="ghPeBio">Wasifu mfupi</label>
    <textarea id="ghPeBio" class="ghc-textarea" rows="3" maxlength="${BIO_MAX}"
      placeholder="Eleza unachoshiriki…">${escapeHtml(profile.bio)}</textarea>
    <div class="ghc-count"><span id="ghPeBioCount">${profile.bio.length}</span>/${BIO_MAX}</div>

    <label class="ghc-label" for="ghPeLocation">Mahali (hiari)</label>
    <input id="ghPeLocation" class="ghc-input" maxlength="40" value="${escapeHtml(profile.location || '')}">

    <span class="ghc-label">Majukumu (hadi ${MAX_ROLES}) — wa kwanza ndiye rangi ya wasifu</span>
    <div class="gh-pe-chips" id="ghPeRoles">
      ${ROLE_ORDER.map((id) => {
        const role = ROLES[id];
        const isActive = profile.roles.includes(id);
        const isPrimary = profile.roles[0] === id;
        return `<button type="button" class="gh-pe-chip gh-pe-role ${isActive ? 'is-active' : ''} ${isPrimary ? 'is-primary' : ''}"
          data-pe-role="${id}" aria-pressed="${isActive}"
          style="--role-accent:${role.accent};--role-soft:${role.soft};--role-ink:${role.ink}">
          <svg class="ic"><use href="#${role.icon}"/></svg>${escapeHtml(role.label)}</button>`;
      }).join('')}
    </div>
    <p class="gh-pe-hint" id="ghPeRoleHint">Jukumu ni taarifa ya kujitambulisha — si uthibitisho.</p>

    <span class="ghc-label">Mada (hadi ${TOPICS_MAX})</span>
    <div class="gh-pe-chips" id="ghPeTopics">
      ${SUGGESTED_TOPICS.map((t) => chip(t, t, profile.topics.includes(t), 'data-pe-topic')).join('')}
    </div>
    <input id="ghPeTopicInput" class="ghc-input" placeholder="Mada nyingine, tenganisha kwa koma">

    <div class="gh-sheet-actions">
      <button type="button" class="gh-btn gh-btn-primary" data-pe-action="save">Hifadhi wasifu</button>
      <button type="button" class="gh-btn gh-btn-outline" data-pe-action="verify-licence">Omba uthibitisho wa leseni</button>
      <button type="button" class="gh-btn gh-btn-outline" data-pe-action="verify-institution">Omba uthibitisho wa taasisi</button>
      <button type="button" class="gh-btn gh-btn-outline" data-sheet-action="close-sheet">Ghairi</button>
    </div>

    <div class="gh-pe-verify" id="ghPeVerifyHost" hidden></div>

    <div class="gh-pe-current">
      <b>Hali ya sasa ya uthibitisho</b>
      <span>Leseni: ${escapeHtml(presentation.verification.licence.status)}</span>
      <span>Taasisi: ${escapeHtml(presentation.verification.institution.status)}</span>
    </div>
  `);

  const bio = el('ghPeBio');
  if (bio) bio.addEventListener('input', () => {
    const count = el('ghPeBioCount');
    if (count) count.textContent = String(bio.value.length);
  });
}

function toggleRole(btn) {
  const id = btn.dataset.peRole;
  const index = selectedRoles.indexOf(id);

  if (index === -1) {
    // adding a role makes it the accent: it is the one the person identifies with now
    if (selectedRoles.length >= MAX_ROLES) {
      toast(`Unaweza kuchagua majukumu ${MAX_ROLES} tu.`);
      return;
    }
    selectedRoles.unshift(id);
  } else if (index > 0) {
    // already selected but not primary: promote it
    selectedRoles.splice(index, 1);
    selectedRoles.unshift(id);
  } else if (selectedRoles.length === 1) {
    toast('Wasifu unahitaji jukumu moja angalau.');
    return;
  } else {
    // primary clicked again: drop it and promote the next one
    selectedRoles.shift();
  }

  // reflect state + order (first = accent colour)
  document.querySelectorAll('[data-pe-role]').forEach((b) => {
    const active = selectedRoles.includes(b.dataset.peRole);
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', String(active));
    b.classList.toggle('is-primary', active && selectedRoles[0] === b.dataset.peRole);
  });

  const hint = el('ghPeRoleHint');
  if (hint) {
    hint.textContent = `Rangi ya wasifu: ${ROLES[selectedRoles[0]].label}. `
      + 'Bofya jukumu lingine kuwa msingi. Jukumu ni kujitambulisha — si uthibitisho.';
  }
}

let pendingKind = 'licence';

/** inline reference form — no prompt(), so it works in a modal and in tests */
function showVerifyForm(kind) {
  const host = el('ghPeVerifyHost');
  if (!host) return;
  const label = kind === 'licence' ? 'Namba ya leseni + bodi inayotoa' : 'Namba ya usajili wa taasisi';
  const placeholder = kind === 'licence' ? 'mf. MCT 12345 — Baraza la Madaktari' : 'mf. BRELA 998877';
  host.innerHTML = `
    <label class="ghc-label" for="ghPeVerifyRef">${label}</label>
    <input id="ghPeVerifyRef" class="ghc-input" placeholder="${placeholder}" maxlength="80">
    <div class="gh-sheet-actions">
      <button type="button" class="gh-btn gh-btn-primary" data-pe-action="submit-verify">Wasilisha ombi</button>
      <button type="button" class="gh-btn gh-btn-outline" data-pe-action="cancel-verify">Ghairi</button>
    </div>
    <p class="gh-pe-hint">Ombi linahifadhiwa kwenye kifaa hiki. Beji haitatokea hadi mthibitishaji
    arekodi ushahidi — hakuna huduma ya uthibitisho iliyounganishwa.</p>`;
  host.hidden = false;
  host.scrollIntoView({ block: 'nearest' });
  el('ghPeVerifyRef')?.focus();
}

let wiredEdit = false;
export function initProfileEditor() {
  if (wiredEdit) return;
  wiredEdit = true;

  document.addEventListener('click', async (event) => {
    const roleBtn = event.target.closest('[data-pe-role]');
    if (roleBtn) { toggleRole(roleBtn); return; }

    const topicBtn = event.target.closest('[data-pe-topic]');
    if (topicBtn) {
      topicBtn.classList.toggle('is-active');
      topicBtn.setAttribute('aria-pressed', String(topicBtn.classList.contains('is-active')));
      return;
    }

    const action = event.target.closest('[data-pe-action]')?.dataset.peAction;
    if (action === 'cancel-verify') { const h = el('ghPeVerifyHost'); if (h) { h.hidden = true; h.innerHTML = ''; } return; }
    if (!action) return;

    if (action === 'save') {
      const form = readForm();
      const result = await saveMyProfile(form);
      if (!result.ok) { toast(result.errors[0]); return; }
      closeSheet();
      toast('Wasifu umehifadhiwa kwenye kifaa hiki.');
      const { openProfile } = await import('./profile-view.js');
      await openProfile('me');
      return;
    }

    if (action === 'verify-licence' || action === 'verify-institution') {
      pendingKind = action === 'verify-licence' ? 'licence' : 'institution';
      showVerifyForm(pendingKind);
      return;
    }

    if (action === 'submit-verify') {
      const reference = el('ghPeVerifyRef')?.value || '';
      const result = await requestVerification(pendingKind, { reference });
      if (!result.ok) {
        toast(result.error === 'reference'
          ? 'Weka namba ya kumbukumbu kwanza.'
          : 'Ombi hili haliwezi kufanyika.');
        return;
      }
      toast('Ombi limehifadhiwa. Hakuna uthibitisho bado — linahitaji mthibitishaji.');
      await openProfileEditor();
    }
  });
}
