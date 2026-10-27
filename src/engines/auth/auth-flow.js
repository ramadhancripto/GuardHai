/* ==========================================================================
   GuardHai · engines/auth/auth-flow.js
   Screen-to-screen flow for onboarding: splash → welcome → method → done.
   ========================================================================== */

const AuthFlow = {
   currentScreen: 'splash',
   goTo(screenId) {
   document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
   const target = document.getElementById('screen-' + screenId);
        if (target) {
            target.classList.add('active');
            this.currentScreen = screenId;
        }
    }
};

window.AuthFlow = AuthFlow;
export { AuthFlow };
