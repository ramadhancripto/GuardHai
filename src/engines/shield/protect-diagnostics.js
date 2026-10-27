/* ==========================================================================
   GuardHai · engines/shield/protect-diagnostics.js
   Diagnostics entry point used by the field-test screen (window.testProtect).
   ========================================================================== */
import { Protect } from '../../core/capacitor-plugin.js';
import { openProtectionTypeChooser } from './protection-modals.js';

async function testProtect() {
   try {
   if (!Protect || typeof Protect.testProtection !== 'function') {
            throw new Error('Protect plugin is unavailable. Run this action in the installed Capacitor app.');
        }
        const result = await Protect.testProtection();
        console.log(result);
    } catch (e) {
        console.error('Protect Plugin Error:', e);
        // Do not stop the Shield UI when the native plugin is unavailable in a browser preview.
    } finally {
        openProtectionTypeChooser();
    }
}


/* ============================================================
   EMERGENCY AUDIO & VIBRATION SYNTHESIZER
   ============================================================ */

window.testProtect = testProtect;
export { testProtect };
