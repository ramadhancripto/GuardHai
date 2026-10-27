/* ==========================================================================
   GuardHai · core/capacitor-plugin.js
   Split out of the phase-1 monolith js/guardhai-app.js — logic is
   unchanged; only module boundaries, imports and the window bridge
   are new.  Exports: Protect
   ========================================================================== */

const Protect = window.Capacitor?.Plugins?.Protect || null;

window.Protect = Protect;
export { Protect };
