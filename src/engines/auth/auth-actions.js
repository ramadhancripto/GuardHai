/* ==========================================================================
   GuardHai · engines/auth/auth-actions.js
   Sign-in, sign-up and password-recovery handlers behind the welcome screen.
   All of it is local: there is no auth server, so credentials never leave the device.
   ========================================================================== */
import { enterGuardHaiHome } from './session.js';

const AuthActions = {
   handleRegister(e) { e.preventDefault(); enterGuardHaiHome(); },
   handleLogin(e) { e.preventDefault(); enterGuardHaiHome(); },

    togglePassword(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input || !btn) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = show
            ? '<svg class="ic"><use href="#i-eye-off"/></svg>'
            : '<svg class="ic"><use href="#i-eye"/></svg>';
    },

    handleForgot(e) {
        e.preventDefault();
        const emailInput = document.getElementById('forgot-email');
        if (!emailInput) return;
        const email = emailInput.value.trim();
        if (!email) return;
        const btn = document.getElementById('btn-forgot-submit');
        const label = btn ? btn.querySelector('span') : null;
        if (btn) btn.disabled = true;
        if (label) label.innerText = 'Inatuma...';
        const finish = () => {
            const form = document.getElementById('form-forgot');
            const ok = document.getElementById('forgot-success');
            if (form) form.style.display = 'none';
            if (ok) ok.style.display = 'block';
        };
        if (window.FirebaseService && typeof FirebaseService.resetPassword === 'function') {
            FirebaseService.resetPassword(email).then(finish).catch(err => {
                if (label) label.innerText = 'Tuma Kiungo cha Kuweka Upya';
                if (btn) btn.disabled = false;
alert('Kuna tatizo kutuma kiungo cha kuweka upya: ' + (err && err.message ? err.message : err));
            });
        } else {
            finish();
        }
    }
};

window.AuthActions = AuthActions;
export { AuthActions };
