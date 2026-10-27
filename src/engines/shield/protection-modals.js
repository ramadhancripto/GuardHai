/* ==========================================================================
   GuardHai · engines/shield/protection-modals.js
   Small shared modal helpers used by the shield screens.
   ========================================================================== */
import { ProtectWizard } from './protect-wizard.js';

function openProtectionTypeChooser() { document.getElementById('modalProtectionChooser').style.display = 'flex'; }
function closeProtectionModals() { ['modalProtectionChooser','modalRemoteShield','modalRemoteSettings'].forEach(id => { const el=document.getElementById(id); if(el) el.style.display='none'; }); }
function startNearbyShield() { closeProtectionModals(); ProtectWizard.startWizard(false); }

window.openProtectionTypeChooser = openProtectionTypeChooser;
window.closeProtectionModals = closeProtectionModals;
window.startNearbyShield = startNearbyShield;
export { openProtectionTypeChooser, closeProtectionModals, startNearbyShield };
