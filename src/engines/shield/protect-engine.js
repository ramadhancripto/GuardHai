/* ==========================================================================
   GuardHai · engines/shield/protect-engine.js
   The protection engine singleton: profiles, thresholds, diagnostics and
   orchestration. Behaviour lives in the focused modules below and is merged in
   with Object.assign, so every method keeps the same `this`.
   ========================================================================== */
import { AudioEngine } from './audio-engine.js';
import { CommunicationModule } from './communication-module.js';
import { GHIcon } from '../../ui/icons.js';
import { switchTab } from '../navigation/tabs.js';
import { ProtectTriggers } from './protect-triggers.js';
import { ProtectStateMachine } from './protect-state-machine.js';
import { ProtectSignals } from './protect-signals.js';
import { ProtectResponse } from './protect-response.js';
import { ProtectAnalyzers } from './protect-analyzers.js';
import { ProtectDashboard } from './protect-dashboard.js';

const ProtectEngine = {
    /* Function ya Toggle Offline Methods */
    offlineMethods: {
        ble: true,
        localWifi: true,
        wifiDirect: false,
        hotspot: true,
        usb: false,
        autoSwitch: true
    },

    toggleOfflineMethod(methodKey, isEnabled) {
        this.offlineMethods[methodKey] = isEnabled;
        this.addSecurityLog('Primary Controller', 'Offline Method Updated: ' + methodKey.toUpperCase() + ' (' + (isEnabled ? 'ON' : 'OFF') + ')');
    },
    activeSubTab: 'dashboard',
    currentMode: 'Normal',
    currentStrategy: 'smart',
    activeDeviceIdForDetail: null,
    protectMapInstance: null,
    heartbeatTimer: null,
    escalationCountdownTimer: null,

    protectedDevices: JSON.parse(localStorage.getItem('guardhai_protected_devices') || '[]'),
    securityEvents: JSON.parse(localStorage.getItem('guardhai_security_events') || '[]'),

    init() {
        this.detectRealPrimaryControllerDevice();
        this.checkBluetoothHardwareSupport();
        this.calculateProtectionConfidence();
        this.renderDashboardKPIs();
        this.renderDevices();
        this.renderEvents();
        this.startHeartbeatEngine();
        this.initRealDeviceListeners();
    },

    switchSubTab(tabKey) {
        this.activeSubTab = tabKey;
        document.querySelectorAll('.protect-sub-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.protect-view-block').forEach(v => v.style.display = 'none');

        const btn = document.getElementById('psub-' + tabKey);
        const view = document.getElementById('protect-view-' + tabKey);

        if (btn) btn.classList.add('active');
        if (view) view.style.display = 'block';

        if (tabKey === 'statusmap') {
            setTimeout(() => this.initProtectionAwarenessMap(), 200);
        }
    },

    checkBluetoothHardwareSupport() {
        // NOTE: this used to also look up '#lbl-ble-api-support', which does not
        // exist anywhere in index.html (dead reference, silently a no-op).
        // The health row description is the element that actually exists.
        const healthDesc = document.getElementById('lbl-health-ble-desc');

        if ('bluetooth' in navigator) {
            if (healthDesc) healthDesc.innerText = "Web BLE Distance Sensor Active & Monitoring";
        } else {
            if (healthDesc) healthDesc.innerText = "Fallback to Local Network & Cloud Distance Engine";
        }
    },

    detectRealPrimaryControllerDevice() {
        const ua = navigator.userAgent;
        let devName = "Unknown Master Node";
        if (ua.includes("Android")) devName = "Android Master Phone";
        else if (ua.includes("iPhone")) devName = "Apple iPhone Master";
        else if (ua.includes("iPad")) devName = "Apple iPad Node";
        else if (ua.includes("Macintosh")) devName = "Apple Mac Workstation";
        else if (ua.includes("Windows")) devName = "Windows PC Workstation";
        else if (ua.includes("Linux")) devName = "Linux Workstation";

        const nameEl = document.getElementById('real-controller-device-name');
        if (nameEl) nameEl.innerText = devName;

        const homeDesc = document.getElementById('lbl-controller-home-desc');
        if (homeDesc) homeDesc.innerText = devName + ' (Controller Active)';

        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                const batteryPct = Math.round(battery.level * 100) + '%';
                const batEl = document.getElementById('real-controller-battery');
                if (batEl) batEl.innerText = `Battery: ${batteryPct} (${battery.charging ? 'Plugged In' : 'Discharging'})`;
            }).catch(() => {});
        }
    },

    /* PROTECTION CONFIDENCE CALCULATOR (ENHANCED) */

    openDeviceDetail(devId) {
        const dev = this.protectedDevices.find(d => d.id === devId);
        if (!dev) return;

        this.activeDeviceIdForDetail = devId;
        document.getElementById('detail-dev-name').innerText = dev.name;
        document.getElementById('detail-dev-id').innerText = `Protection Session: ${dev.sessionId || 'Active Link'}`;
        document.getElementById('detail-dev-trust').innerText = `${dev.trustLevel || 'Mmiliki Aliyethibitishwa'}`;
        document.getElementById('detail-dev-risk-index').innerHTML = `${dev.statusText || dev.status}`;
        document.getElementById('detail-dev-distance').innerHTML = `${dev.proximity || 'Very Near'} (${dev.signalStrength || '-62 dBm'})`;
        document.getElementById('detail-dev-method').innerText = dev.method || 'Web Bluetooth BLE Layer';

        // Update Bluetooth Protection State Machine Display
        this.updateDeviceDetailStateDisplay(dev);

        // Update Communication Module Health Display
        const commHealthContainer = document.getElementById('detail-comm-health');
        if (commHealthContainer && window.CommunicationModule) {
            commHealthContainer.innerHTML = CommunicationModule.getDeviceHealthDisplay(dev);
        }

        // Show sleep state if applicable
        const sleepIndicator = document.getElementById('detail-sleep-indicator');
        if (sleepIndicator) {
            if (dev.sleepState === 'SLEEPING') {
                sleepIndicator.style.display = 'block';
                sleepIndicator.innerHTML = '<span class="sleep-indicator">Device Sleeping - Waiting for wake-up</span>';
            } else {
                sleepIndicator.style.display = 'none';
            }
        }

        document.getElementById('modalDeviceDetail').style.display = 'flex';
    },

    simulateDistanceMovement(distanceState) {
        if (!this.activeDeviceIdForDetail) return;
        const dev = this.protectedDevices.find(d => d.id === this.activeDeviceIdForDetail);
        if (!dev) return;

        if (distanceState === 'near') {
            AudioEngine.stopEmergencyAlarm();
            dev.status = 'protected';
            dev.statusText = 'Protected';
            dev.proximity = 'Very Near (1-3m)';
            dev.signalStrength = '-58 dBm';
            this.addSecurityLog(dev.name, 'UMBALI: Kifaa kiko Karibu Sana (1-3m)');
        } else if (distanceState === 'away') {
            dev.status = 'warning';
            dev.statusText = 'MOVING AWAY';
            dev.proximity = 'Moving Away (8-12m)';
            dev.signalStrength = '-84 dBm';
            this.addSecurityLog(dev.name, 'UMBALI: Kifaa kinaanza kusogea mbali (8-12m)');
        } else if (distanceState === 'out') {
            this.closeModals();
            this.handleOut0fRangeDisconnection(dev.id);
            return;
        }

        localStorage.setItem('guardhai_protected_devices', JSON.stringify(this.protectedDevices));
        this.calculateProtectionConfidence();
        this.renderDevices();
        this.openDeviceDetail(dev.id);
    },

    triggerSelectedDeviceDisconnectTest() {
        if (this.activeDeviceIdForDetail) {
            this.closeModals();
            this.handleOut0fRangeDisconnection(this.activeDeviceIdForDetail);
        } else if (this.protectedDevices.length > 0) {
            this.handleOut0fRangeDisconnection(this.protectedDevices[0].id);
        } else {
alert("Sajili angalau kifaa kimoja kwanza.");
        }
    },

    promptAreYouSafeModal(dev) {
        let countdownSeconds = 30;
        const alertHtml = `
            <div id="modalAreYouSafePrompt" class="overlay-modal" style="display: flex; z-index: 30000;">
                <div style="background: white; border-radius: var(--radius-lg); padding: 25px; width: 95%; max-width: 400px; text-align: center;">
                    <div class="modal-big-icon blue" style="margin-bottom: 10px;"><svg class="ic"><use href="#i-shield"/></svg></div>
                    <b style="font-size: 18px; color: var(--deep-navy); display: block;">Je, Uko Salama?</b>
                    <span style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 4px;">Kifaa cha <b>${dev.name}</b> kimetoka kwenye umbali wa mawimbi (Out of Range).</span>
                    
                    <div style="margin: 15px 0; font-size: 22px; font-weight: 900; color: var(--emergency-red);" id="safe-countdown-timer">
                        00:${countdownSeconds < 10 ? '0' : ''}${countdownSeconds}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn-gradient green" style="height: 44px; font-size: 12px;" onclick="ProtectEngine.confirmUserSafe('${dev.id}')">
                            <svg class="ic"><use href="#i-check"/></svg> I'm Safe (Rudisha Ulinzi & Zima Siren)
                        </button>
                        <button class="btn-gradient red" style="height: 44px; font-size: 12px;" onclick="ProtectEngine.escalateToLostMode('${dev.id}')">
                            <svg class="ic"><use href="#i-siren"/></svg> Trigger Full Lost Alert
                        </button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('modalAreYouSafePrompt');
        if (existingModal) existingModal.remove();
        document.body.insertAdjacentHTML('beforeend', alertHtml);

        if (this.escalationCountdownTimer) clearInterval(this.escalationCountdownTimer);
        this.escalationCountdownTimer = setInterval(() => {
            countdownSeconds--;
            const timerEl = document.getElementById('safe-countdown-timer');
            if (timerEl) timerEl.innerText = `00:${countdownSeconds < 10 ? '0' : ''}${countdownSeconds}`;

            if (countdownSeconds <= 0) {
                clearInterval(this.escalationCountdownTimer);
                ProtectEngine.escalateToLostMode(dev.id);
            }
        }, 1000);
    },

    confirmUserSafe(devId) {
        if (this.escalationCountdownTimer) clearInterval(this.escalationCountdownTimer);
        AudioEngine.stopEmergencyAlarm();

        const dev = this.protectedDevices.find(d => d.id === devId);
        if (dev) {
            dev.status = 'protected';
            dev.statusText = 'Protected <span class="status-dot"></span>';
            dev.proximity = 'Very Near <span class="status-dot"></span>';
            dev.signalStrength = '-60 dBm';
            localStorage.setItem('guardhai_protected_devices', JSON.stringify(this.protectedDevices));
            this.addSecurityLog(dev.name, 'Mmiliki Amethibitisha Yuko Salama - Ulinzi Umerudi');
            this.calculateProtectionConfidence();
            this.renderDevices();
        }
        const modal = document.getElementById('modalAreYouSafePrompt');
        if (modal) modal.remove();
    },

    escalateToLostMode(devId) {
        if (this.escalationCountdownTimer) clearInterval(this.escalationCountdownTimer);
        const modal = document.getElementById('modalAreYouSafePrompt');
        if (modal) modal.remove();

        const dev = this.protectedDevices.find(d => d.id === devId);
        if (!dev) return;

        dev.status = 'lost';
        dev.statusText = 'PROTECTION LOST <span class="status-dot red"></span>';
        dev.proximity = 'Lost <span class="status-dot red"></span> (>20m)';
        dev.signalStrength = 'No Signal (0 dBm)';
        localStorage.setItem('guardhai_protected_devices', JSON.stringify(this.protectedDevices));
        
        AudioEngine.startEmergencyAlarm();
        this.calculateProtectionConfidence();
        this.renderDevices();

        this.addSecurityLog(dev.name, 'TAHADHARI KUU: Kifaa Kimepotea au Kiko Mbali Sana');

        let gpsCoords = "Inasoma GPS...";
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                gpsCoords = `Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`;
                this.showRealSeparationModal(dev, gpsCoords);
            }, () => {
                this.showRealSeparationModal(dev, "Location Unavailable");
            });
        } else {
            this.showRealSeparationModal(dev, "Location Unavailable");
        }
    },

    showRealSeparationModal(dev, gpsCoords) {
        const alertHtml = `
            <div id="modalSeparationAlert" class="overlay-modal" style="display: flex; z-index: 30000;">
                <div style="background: white; border-radius: var(--radius-lg); padding: 25px; width: 95%; max-width: 400px; text-align: center; border: 3px solid var(--emergency-red);">
                    <div class="modal-big-icon red" style="margin-bottom: 10px;"><svg class="ic"><use href="#i-siren"/></svg></div>
                    <b style="font-size: 18px; color: var(--emergency-red); display: block;">PROTECTION LOST!</b>
                    <span style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 4px;">Link ya mawimbi na <b>${dev.name}</b> imekatika kwa sababu ya umbali.</span>
                    
                    <div style="background: #F8FAFC; border: 1px solid var(--card-border); border-radius: var(--radius-md); padding: 10px; margin: 12px 0; text-align: left; font-size: 11px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>Location ya Mwisho:</span>
                            <b style="color: var(--royal-blue);">${gpsCoords}</b>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn-gradient green" style="height: 44px; font-size: 12px;" onclick="ProtectEngine.closeSeparationModal(); switchTab('map');">
                            <svg class="ic"><use href="#i-map-pin"/></svg> Tazama Kwenye Ramani
                        </button>
                        <button class="btn-outline" style="height: 40px; font-size: 11px;" onclick="ProtectEngine.closeSeparationModal()">
                            Acknowledge & Zima King'ora
                        </button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('modalSeparationAlert');
        if (existingModal) existingModal.remove();
        document.body.insertAdjacentHTML('beforeend', alertHtml);
    },

    closeSeparationModal() {
        AudioEngine.stopEmergencyAlarm();
        const modal = document.getElementById('modalSeparationAlert');
        if (modal) modal.remove();
    },

    disconnectDeviceOnly() {
        if (!this.activeDeviceIdForDetail) return;
        const dev = this.protectedDevices.find(d => d.id === this.activeDeviceIdForDetail);
        if (!dev) return;

        if (confirm(`PAUSE LINK WARNING:\nUkisitisha ${dev.name}, ulinzi wa umbali utasimama.\n\nEndelea?`)) {
            AudioEngine.stopEmergencyAlarm();
            dev.status = 'disconnected';
            dev.statusText = 'DISCONNECTED';
            dev.proximity = 'Paused';
            localStorage.setItem('guardhai_protected_devices', JSON.stringify(this.protectedDevices));
            this.addSecurityLog(dev.name, 'Protection Link Paused');
            this.calculateProtectionConfidence();
            this.renderDevices();
            this.closeModals();
        }
    },

    unpairWithAntiRemoveCheck() {
        if (!this.activeDeviceIdForDetail) return;
        const dev = this.protectedDevices.find(d => d.id === this.activeDeviceIdForDetail);
        if (!dev) return;
        const pwdCheck = prompt(`VERIFY OWNER PASSCODE:\nEnter Passcode to unregister ${dev.name}:`);
        if (pwdCheck !== null && pwdCheck.length > 0) {
            AudioEngine.stopEmergencyAlarm();

            // Step 1: Stop monitoring
            this.transitionState(dev.id, 'NOT_PROTECTED');
            
            // Step 2: Terminate Protection Session
            this.terminateProtectionSession(dev.id);
            
            // Step 3: Delete Protection Relationship
            this.protectedDevices = this.protectedDevices.filter(d => d.id !== this.activeDeviceIdForDetail);
            
            // Step 4: Delete encryption keys (clear from storage)
            localStorage.setItem('guardhai_protected_devices', JSON.stringify(this.protectedDevices));
            
            // Step 5: Stop heartbeat for this device
            // (heartbeat engine already skips removed devices)
            
            // Step 6: Log removal
            this.addSecurityLog(dev.name, 'Device Unregistered - Protection Relationship Deleted - Session Terminated - Keys Removed');
            
            this.calculateProtectionConfidence();
            this.renderDevices();
            this.closeModals();
            alert(`Kifaa cha ${dev.name} kimeondolewa kikamilifu.\n\n• Monitoring: Stopped\n• Session: Terminated\n• Keys: Deleted\n• Heartbeat: Stopped`);
        } else {
            alert("Passcode inahitajika kuondoa kifaa.");
        }
    },

    closeModals() {
        document.querySelectorAll('.overlay-modal').forEach(m => m.style.display = 'none');
    },

    /* PROTECTION PROFILES & MODES */
    setProfile(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.protection-modes-bar .mode-pill').forEach(p => p.classList.remove('active'));

        const pillMap = {
            'Quiet': 'prof-quiet',
            'Standard': 'prof-standard',
            'High Security': 'prof-highsecurity',
            'Travel': 'prof-travel'
        };
        const pill = document.getElementById(pillMap[mode] || '');
        if (pill) pill.classList.add('active');

        const logMap = {
            'Quiet': 'Profile: Quiet Mode Active (Silent Alarms)',
            'Standard': 'Profile: Standard Guard Active (Balanced Protection)',
            'High Security': 'Profile: High Security Guard Active (Max High Alert)',
            'Travel': 'Profile: Travel Guard Active (High Sensitivity)'
        };
        this.addSecurityLog('Primary Controller', logMap[mode] || ('Profile: ' + mode + ' Active'));

        // NOTE: this used to also write to '#lbl-current-zone', which does not
        // exist anywhere in index.html (dead reference, silently a no-op).
        // The profile change is still recorded by addSecurityLog() above.

        this.calculateProtectionConfidence();
    },

    /* Backward-compatible alias */
    setProtectionMode(mode) {
        this.setProfile(mode);
    },

    initProtectionAwarenessMap() {
        if (this.protectMapInstance) {
            this.protectMapInstance.invalidateSize();
            return;
        }

        this.protectMapInstance = L.map('protectStatusMap', { zoomControl: false }).setView([-6.8184, 39.2790], 16);

        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: '© Google Satellite'
        }).addTo(this.protectMapInstance);

        L.circle([-6.8184, 39.2790], {
            color: '#18C37E', fillColor: '#18C37E', fillOpacity: 0.2, radius: 150
        }).addTo(this.protectMapInstance).bindPopup("<b>Trusted Home Safe Zone</b>");

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                this.protectMapInstance.setView([pos.coords.latitude, pos.coords.longitude], 17);
                L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(this.protectMapInstance).bindPopup("<b>Master Controller Node</b>").openPopup();
            });
        }
    },

    addSecurityLog(deviceName, eventMessage) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
        this.securityEvents.unshift({
            id: 'EV-' + Math.floor(1000 + Math.random() * 9000),
            device: deviceName,
            event: eventMessage,
            time: timeStr
        });
        localStorage.setItem('guardhai_security_events', JSON.stringify(this.securityEvents));
        this.renderEvents();
    },

    saveRealDevice(newDev) {
        // Initialize Bluetooth Protection State Machine
        newDev.btState = 'PROTECTION_ACTIVE';
        newDev.btStateHistory = [];
        newDev.signalRssi = -62;
        newDev.triggerLevel = 0;
        newDev.trend = 'Stable';
        newDev.lastHeartbeatTimestamp = Date.now();
        newDev.sleepState = 'AWAKE';

        this.protectedDevices.unshift(newDev);
        localStorage.setItem('guardhai_protected_devices', JSON.stringify(this.protectedDevices));
        
        // Create Protection Session
        this.createProtectionSession(newDev);
        
        this.addSecurityLog(newDev.name, `Protection Link Created (${newDev.method}) - State: PROTECTION_ACTIVE`);
        this.calculateProtectionConfidence();
        this.renderDevices();
    },
    
    
    initRealDeviceListeners() {
        window.addEventListener('offline', () => {
            const banner = document.getElementById('offlineBanner');
            if (banner) banner.style.display = 'flex';
            ProtectEngine.addSecurityLog('Primary Controller', 'Network Layer switched to Offline BLE Mode');
            ProtectEngine.calculateProtectionConfidence();
        });

        window.addEventListener('online', () => {
            const banner = document.getElementById('offlineBanner');
            if (banner) banner.style.display = 'none';
            ProtectEngine.addSecurityLog('Primary Controller', 'Cloud Sync Layer Reconnected');
            ProtectEngine.calculateProtectionConfidence();
        });
    },
};

Object.assign(ProtectEngine, ProtectTriggers, ProtectStateMachine, ProtectSignals, ProtectResponse,
                  ProtectAnalyzers, ProtectDashboard);
// Expose the engine for inline UI handlers and integrated modules.
window.ProtectEngine = ProtectEngine;

/* ============================================================
   COMMUNICATION MODULE ENGINE
   Manages: BLE, Local Network, Wi-Fi Direct, Travel Protection
   Each module acts as a communication sensor for protection
   ============================================================ */

window.ProtectEngine = ProtectEngine;
export { ProtectEngine };
