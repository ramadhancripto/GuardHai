/* ==========================================================================
   GuardHai · engines/index.js
   Loads every engine module once, in dependency order. Importing this file
   wires the classic singletons (ProtectEngine, CommunicationModule, I18N, …)
   onto window as well, because index.html still uses inline onclick="…"
   handlers. New code should import the symbol directly instead.
   ========================================================================== */

import '../core/capacitor-plugin.js';
import './shield/protect-diagnostics.js';
import './shield/audio-engine.js';
import './shield/protect-engine.js';
import './shield/communication-module.js';
import './shield/travel-protection.js';
import './shield/usb-cable.js';
import '../ui/icons.js';
import './shield/protect-wizard.js';
import './shield/recovery-roc.js';
import './shield/pillar-nav.js';
import '../i18n/i18n.js';
import './shield/remote-shield.js';
import './shield/protection-modals.js';
import './auth/auth-flow.js';
import './auth/auth-actions.js';
import './auth/session.js';
import '../ui/sidebar.js';
import './navigation/tabs.js';
import '../features/map/map-view.js';
import './boot.js';
