/**
 * GuardHai · services/session.service.js
 * Who is using the app on this device. There is no server session yet, so the
 * identity is read from the existing signed-in UI (sidebar / top bar) exactly
 * as the phase-1 code did, with a safe fallback. One place to change when real
 * authentication lands.
 */
import { initials as toInitials } from '../core/format.js';

const FALLBACK_NAME = 'Wewe';

export function currentUser() {
  const el = document.getElementById('sidebarUserName') || document.getElementById('topNavBrandName');
  const domName = el && el.innerText ? el.innerText.trim() : '';
  const name = domName || localStorage.getItem('guardhai_profile_name') || FALLBACK_NAME;

  return {
    id: localStorage.getItem('guardhai_user_id') || 'local-user',
    name,
    initials: toInitials(name),
    isSelf: true,
    role: 'wewe',
    authenticated: localStorage.getItem('guardhai_logged_in') === 'true'
  };
}

export function isSignedIn() {
  return localStorage.getItem('guardhai_logged_in') === 'true';
}
