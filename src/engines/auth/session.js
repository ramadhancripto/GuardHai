/* ==========================================================================
   GuardHai · engines/auth/session.js
   Session lifecycle: entering the app shell after onboarding and signing out
   (which clears the device-only session keys).
   ========================================================================== */
import { AuthFlow } from './auth-flow.js';
import { switchTab } from '../navigation/tabs.js';

function enterGuardHaiHome() {
   localStorage.setItem('guardhai_logged_in', 'true');
    document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('appTopNav').style.display = 'flex';
    document.getElementById('appBottomNav').style.display = 'flex';
    switchTab('home');
}

function handleSignOut() {
    localStorage.removeItem('guardhai_logged_in');
    document.getElementById('appTopNav').style.display = 'none';
    document.getElementById('appBottomNav').style.display = 'none';
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
    if (window.auth) window.auth.signOut();
    AuthFlow.goTo('landing');
}

window.enterGuardHaiHome = enterGuardHaiHome;
window.handleSignOut = handleSignOut;
export { enterGuardHaiHome, handleSignOut };
