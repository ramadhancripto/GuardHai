/* GuardHai · engines/boot.js
   Engine initialisation. Runs on DOMContentLoaded so the markup the engines
   bind to (shields screens, nav, sidebar) is already parsed. */
import { CommunicationModule } from './shield/communication-module.js';
import { I18N } from '../i18n/i18n.js';
import { ProtectEngine } from './shield/protect-engine.js';

document.addEventListener('DOMContentLoaded', () => {
    I18N.init();
    ProtectEngine.init();
    CommunicationModule.init();
});
