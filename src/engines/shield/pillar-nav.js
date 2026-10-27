/* ==========================================================================
   GuardHai · engines/shield/pillar-nav.js
   Switches between the Shield pillars (dashboard, find, health, …).
   ========================================================================== */
import { I18N } from '../../i18n/i18n.js';
import { RecoveryROC } from './recovery-roc.js';

function switchShieldPillar(pillarName) {
   document.getElementById('pillar-content-protect').style.display = 'none';
   document.getElementById('pillar-content-find').style.display = 'none';
    document.getElementById('pillar-content-recover').style.display = 'none';

    document.getElementById('btn-pillar-protect').classList.remove('active');
    document.getElementById('btn-pillar-find').classList.remove('active');
    document.getElementById('btn-pillar-recover').classList.remove('active');

    document.getElementById('pillar-content-' + pillarName).style.display = 'block';
    document.getElementById('btn-pillar-' + pillarName).classList.add('active');
    if (pillarName === 'recover') RecoveryROC.init();
}

/* ============================================================
   DYNAMIC MULTI-LANGUAGE TRANSLATION ENGINE (I18N)
   ============================================================ */

window.switchShieldPillar = switchShieldPillar;
export { switchShieldPillar };
