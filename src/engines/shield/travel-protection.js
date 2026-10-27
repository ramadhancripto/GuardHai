/* ==========================================================================
   GuardHai · engines/shield/travel-protection.js
   Travel protection: route watch, check-ins and deviation alerts.
   ========================================================================== */
import { AudioEngine } from './audio-engine.js';
import { CommunicationModule } from './communication-module.js';
import { ProtectEngine } from './protect-engine.js';

const TravelProtectionEngine = {
   travelSessionActive: false,
    travelSessionId: null,
    travelKit: [],
    escalationTimers: {},
    monitorTimer: null,

    /* Start a Travel Protection Session */
    startTravelSession() {
        if (this.travelSessionActive) {
            ProtectEngine.addSecurityLog('Travel Engine', 'Travel Session already active');
            return;
        }

        this.travelSessionId = 'TRV-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        this.travelSessionActive = true;

        // Collect all travel-protected devices into the Travel Kit
        this.travelKit = ProtectEngine.protectedDevices.filter(d =>
            d.method && (d.method.includes('Hotspot') || d.method.includes('Travel'))
        );

        // Update Communication Module state
        CommunicationModule.modules.travel.health.travelSessionActive = true;
        CommunicationModule.modules.travel.health.travelKitDevices = this.travelKit.map(d => d.name);

        // Start monitoring
        this.startTravelMonitoring();

        // Update UI
        this.updateTravelSessionUI();

        ProtectEngine.addSecurityLog('Travel Engine', `Travel Session Started: ${this.travelSessionId} (${this.travelKit.length} devices in kit)`);
    },

    /* Stop a Travel Protection Session */
    stopTravelSession() {
        if (!this.travelSessionActive) {
            ProtectEngine.addSecurityLog('Travel Engine', 'No active Travel Session to stop');
            return;
        }

        // Clear all escalation timers
        Object.keys(this.escalationTimers).forEach(devId => {
            clearTimeout(this.escalationTimers[devId].notify);
            clearTimeout(this.escalationTimers[devId].vibrate);
            clearTimeout(this.escalationTimers[devId].alarm);
        });
        this.escalationTimers = {};

        // Stop monitoring
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
        }

        this.travelSessionActive = false;
        CommunicationModule.modules.travel.health.travelSessionActive = false;
        CommunicationModule.modules.travel.health.travelKitDevices = [];

        this.updateTravelSessionUI();

        ProtectEngine.addSecurityLog('Travel Engine', `Travel Session Ended: ${this.travelSessionId}`);
        this.travelSessionId = null;
        this.travelKit = [];
    },

    /* Start monitoring travel devices */
    startTravelMonitoring() {
        if (this.monitorTimer) clearInterval(this.monitorTimer);

        this.monitorTimer = setInterval(() => {
            if (!this.travelSessionActive) return;

            this.travelKit.forEach(dev => {
                const currentDev = ProtectEngine.protectedDevices.find(d => d.id === dev.id);
                if (!currentDev) return;

                // Check if device is still connected
                if (currentDev.status === 'lost' || currentDev.status === 'disconnected') {
                    // Device disconnected - start escalation if not already started
                    if (!this.escalationTimers[dev.id]) {
                        this.startEscalation(currentDev);
                    }
                } else if (currentDev.status === 'protected') {
                    // Device reconnected - cancel escalation
                    if (this.escalationTimers[dev.id]) {
                        this.cancelEscalation(currentDev);
                    }
                }
            });
        }, 3000); // Check every 3 seconds
    },

    /* Start escalation for a disconnected travel device */
    startEscalation(dev) {
        const disconnectTime = Date.now();

        this.escalationTimers[dev.id] = {
            disconnectTime: disconnectTime,
            notify: null,
            vibrate: null,
            alarm: null
        };

        ProtectEngine.addSecurityLog(dev.name, `Travel Disconnect Detected at ${new Date(disconnectTime).toLocaleTimeString()} - Reconnect in progress...`);

        // 15 seconds → Notification
        this.escalationTimers[dev.id].notify = setTimeout(() => {
            if (this.isStillDisconnected(dev.id)) {
                this.showTravelDisconnectWarning(dev, 15);
                ProtectEngine.addSecurityLog(dev.name, 'Travel Escalation: 15s - Notification sent');
            }
        }, 15000);

        // 30 seconds → Vibration
        this.escalationTimers[dev.id].vibrate = setTimeout(() => {
            if (this.isStillDisconnected(dev.id)) {
                if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
                ProtectEngine.addSecurityLog(dev.name, 'Travel Escalation: 30s - Vibration alert');
            }
        }, 30000);

        // 60 seconds → Alarm + Guardian Alert
        this.escalationTimers[dev.id].alarm = setTimeout(() => {
            if (this.isStillDisconnected(dev.id)) {
                this.triggerTravelAlarm(dev);
                ProtectEngine.addSecurityLog(dev.name, 'Travel Escalation: 60s - ALARM triggered');
            }
        }, 60000);
    },

    /* Cancel escalation when device reconnects */
    cancelEscalation(dev) {
        if (this.escalationTimers[dev.id]) {
            clearTimeout(this.escalationTimers[dev.id].notify);
            clearTimeout(this.escalationTimers[dev.id].vibrate);
            clearTimeout(this.escalationTimers[dev.id].alarm);
            delete this.escalationTimers[dev.id];

            ProtectEngine.addSecurityLog(dev.name, 'Travel Device Reconnected - Escalation cancelled');
        }
    },

    /* Check if a device is still disconnected */
    isStillDisconnected(devId) {
        const dev = ProtectEngine.protectedDevices.find(d => d.id === devId);
        return dev && (dev.status === 'lost' || dev.status === 'disconnected');
    },

    /* Show travel disconnect warning modal */
    showTravelDisconnectWarning(dev, secondsAgo) {
        const alertHtml = `
            <div id="modalTravelDisconnect" class="overlay-modal" style="display: flex; z-index: 30000;">
                <div style="background: white; border-radius: var(--radius-lg); padding: 22px; width: 95%; max-width: 400px; text-align: center; border: 2px solid var(--amber);">
                    <div class="modal-big-icon" style="color: var(--amber); margin-bottom: 10px;">
                        <svg class="ic"><use href="#i-alert-triangle"/></svg>
                    </div>
                    <b style="font-size: 15px; color: var(--deep-navy); display: block;">Travel Protection</b>
                    <div style="margin-top: 8px; padding: 10px; background: #FFFBEB; border-radius: 10px; border: 1px solid rgba(245,166,35,0.3);">
                        <b style="font-size: 13px; color: var(--amber); display: block;">${dev.name}</b>
                        <span style="font-size: 11px; color: var(--text-muted);">Disconnected</span>
                    </div>
                    <div style="margin-top: 10px; font-size: 10px; color: var(--text-muted);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span>Time:</span>
                            <b>${secondsAgo} seconds ago</b>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span>Status:</span>
                            <b style="color: var(--amber);">Reconnect in progress...</b>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Next Escalation:</span>
                            <b style="color: var(--emergency-red);">Vibration at 30s</b>
                        </div>
                    </div>
                    <button class="btn-outline" style="height: 38px; font-size: 11px; margin-top: 12px;" onclick="document.getElementById('modalTravelDisconnect').remove()">
                        Acknowledge
                    </button>
                </div>
            </div>
        `;

        const existing = document.getElementById('modalTravelDisconnect');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', alertHtml);
    },

    /* Trigger full alarm for travel device */
    triggerTravelAlarm(dev) {
        AudioEngine.startEmergencyAlarm();
        ProtectEngine.transitionState(dev.id, 'ALARM');

        const alertHtml = `
            <div id="modalTravelAlarm" class="overlay-modal" style="display: flex; z-index: 30000;">
                <div style="background: white; border-radius: var(--radius-lg); padding: 25px; width: 95%; max-width: 400px; text-align: center; border: 3px solid var(--emergency-red);">
                    <div class="modal-big-icon red" style="margin-bottom: 10px;">
                        <svg class="ic"><use href="#i-siren"/></svg>
                    </div>
                    <b style="font-size: 18px; color: var(--emergency-red); display: block;">TRAVEL ALERT!</b>
                    <span style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 4px;">
                        <b>${dev.name}</b> has been disconnected for over 60 seconds.
                    </span>
                    <div style="margin-top: 12px; padding: 10px; background: #FFF0F0; border-radius: 10px; font-size: 11px; text-align: left;">
                        <b style="color: var(--emergency-red);">Escalation Complete:</b>
                        <div style="margin-top: 4px; color: var(--text-muted);">
                            ✓ Notification (15s)<br>
                            ✓ Vibration (30s)<br>
                            ✓ Alarm (60s)<br>
                            → Guardian Alert Sent<br>
                            → Find Module Activated
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 14px;">
                        <button class="btn-gradient green" style="height: 40px; font-size: 11px; flex: 1;" onclick="TravelProtectionEngine.confirmTravelDeviceSafe('${dev.id}')">
                            I'm Safe
                        </button>
                        <button class="btn-gradient red" style="height: 40px; font-size: 11px; flex: 1;" onclick="TravelProtectionEngine.reportTravelDeviceLost('${dev.id}')">
                            Device Lost
                        </button>
                    </div>
                </div>
            </div>
        `;

        const existing = document.getElementById('modalTravelAlarm');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', alertHtml);
    },

    /* User confirms travel device is safe */
    confirmTravelDeviceSafe(devId) {
        AudioEngine.stopEmergencyAlarm();
        const modal = document.getElementById('modalTravelAlarm');
        if (modal) modal.remove();

        const dev = ProtectEngine.protectedDevices.find(d => d.id === devId);
        if (dev) {
            dev.status = 'protected';
            dev.statusText = 'Protected';
            dev.proximity = 'Connected';
            dev.signalStrength = 'Connected';
            ProtectEngine.transitionState(dev.id, 'RECONNECTED');
            localStorage.setItem('guardhai_protected_devices', JSON.stringify(ProtectEngine.protectedDevices));
            ProtectEngine.addSecurityLog(dev.name, 'Travel Device Confirmed Safe by Owner');
            ProtectEngine.calculateProtectionConfidence();
            ProtectEngine.renderDevices();
        }

        if (this.escalationTimers[devId]) {
            delete this.escalationTimers[devId];
        }
    },

    /* User reports travel device as lost */
    reportTravelDeviceLost(devId) {
        AudioEngine.stopEmergencyAlarm();
        const modal = document.getElementById('modalTravelAlarm');
        if (modal) modal.remove();

        ProtectEngine.escalateToLostMode(devId);

        if (this.escalationTimers[devId]) {
            delete this.escalationTimers[devId];
        }
    },

    /* Update Travel Session UI */
    updateTravelSessionUI() {
        const sessionEl = document.getElementById('travel-session-status');
        if (sessionEl) {
            if (this.travelSessionActive) {
                sessionEl.innerText = 'Active (' + this.travelSessionId + ')';
                sessionEl.style.color = '#EA580C';
            } else {
                sessionEl.innerText = 'Inactive';
                sessionEl.style.color = 'var(--text-muted)';
            }
        }

        // Update Travel Kit devices display
        const kitContainer = document.getElementById('travel-kit-devices');
        if (kitContainer) {
            let kitHtml = `
                <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: white; border-radius: 8px; border: 1px solid var(--card-border); font-size: 10px;">
                    <svg class="ic" style="color: var(--royal-blue);"><use href="#i-smartphone"/></svg>
                    <b style="color: var(--deep-navy);">Phone (Host)</b>
                    <span style="margin-left: auto; color: var(--emerald-green); font-weight: 800;">Connected</span>
                </div>
            `;

            this.travelKit.forEach(dev => {
                const statusColor = dev.status === 'protected' ? 'var(--emerald-green)' : dev.status === 'warning' ? 'var(--amber)' : 'var(--emergency-red)';
                const statusText = dev.status === 'protected' ? 'Connected' : dev.status === 'warning' ? 'Warning' : 'Disconnected';
                const icon = dev.icon === 'laptop' ? 'i-laptop' : dev.icon === 'watch' ? 'i-watch' : dev.icon === 'tracker' ? 'i-bag' : 'i-smartphone';

                kitHtml += `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: white; border-radius: 8px; border: 1px solid var(--card-border); font-size: 10px;">
                        <svg class="ic" style="color: var(--royal-blue);"><use href="#${icon}"/></svg>
                        <b style="color: var(--deep-navy);">${dev.name}</b>
                        <span style="margin-left: auto; color: ${statusColor}; font-weight: 800;">${statusText}</span>
                    </div>
                `;
            });

            if (this.travelKit.length === 0) {
                kitHtml += `
                    <div style="padding: 8px; text-align: center; font-size: 10px; color: var(--text-muted);">
                        No travel devices in kit. Add devices via Hotspot Protection.
                    </div>
                `;
            }

            kitContainer.innerHTML = kitHtml;
        }
    },

    /* Get travel kit summary for dashboard */
    getTravelKitSummary() {
        if (!this.travelSessionActive) return null;

        const total = this.travelKit.length + 1; // +1 for phone host
        const connected = this.travelKit.filter(d => d.status === 'protected').length + 1;
        const disconnected = total - connected;

        return {
            total: total,
            connected: connected,
            disconnected: disconnected,
            sessionId: this.travelSessionId,
            attentionNeeded: disconnected > 0
        };
    }
};

/* ============================================================
   USB CABLE PROTECTION ENGINE
   Module 5: Physical connection monitoring
   Detects USB attachment/detachment
   ============================================================ */

window.TravelProtectionEngine = TravelProtectionEngine;
export { TravelProtectionEngine };
