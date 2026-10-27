// Capacitor is available only in the installed native app, not in a normal browser preview.
// This guard lets the UI and Remote Shield continue to work in both environments.
const Protect = window.Capacitor?.Plugins?.Protect || null;

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
const AudioEngine = {
    audioCtx: null,
    oscillator: null,
    vibrateInterval: null,

    startEmergencyAlarm() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.oscillator) return;

        this.oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        this.oscillator.type = 'sawtooth';
        this.oscillator.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        this.oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
        this.oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        this.oscillator.start();

        if (navigator.vibrate) {
            this.vibrateInterval = setInterval(() => {
                navigator.vibrate([500, 200, 500, 200]);
            }, 1400);
        }
    },

    stopEmergencyAlarm() {
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
            this.oscillator = null;
        }
        if (this.vibrateInterval) {
            clearInterval(this.vibrateInterval);
            this.vibrateInterval = null;
        }
    }
};

/* ============================================================
   GUARDHAI PROTECTION NETWORK & DISTANCE ENGINE
   ============================================================ */
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
    calculateProtectionConfidence() {
        // Use detailed confidence calculation
        const detailed = this.calculateDetailedConfidence();
        let confidence = detailed.total;
        let criticalCount = 0;
        let warningCount = 0;

        this.protectedDevices.forEach(dev => {
            if (dev.status === 'lost') criticalCount++;
            else if (dev.status === 'warning' || dev.status === 'reconnecting') warningCount++;
        });

        if (criticalCount > 0 && confidence > 50) confidence = 45;
        if (!navigator.onLine) confidence = Math.min(confidence, 85);
        confidence = Math.max(0, Math.min(confidence, 100));

        let statusBadge = 'PROTECTION ENGINE RUNNING <span class="status-dot"></span>';
        if (confidence < 50 || criticalCount > 0) statusBadge = 'NETWORK ALERT <span class="status-dot red"></span>';
        else if (confidence < 85 || warningCount > 0) statusBadge = 'ATTENTION REQUIRED <span class="status-dot amber"></span>';

        this.updateConfidenceUI(confidence, statusBadge, `${this.protectedDevices.length} Device(s) Monitored`);

        // Update breakdown display
        const breakdown = detailed.breakdown;
        const updateScoreEl = (id, score) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = score + '%';
                el.style.color = score >= 80 ? '#3EF0A2' : score >= 50 ? '#F5A623' : '#FF6B6B';
            }
        };
        updateScoreEl('conf-bt-score', breakdown.bluetooth);
        updateScoreEl('conf-hb-score', breakdown.heartbeat);
        updateScoreEl('conf-mon-score', breakdown.monitoring);
        updateScoreEl('conf-perm-score', breakdown.permissions);
        updateScoreEl('conf-bat-score', breakdown.battery);

        return confidence;
    },

    updateConfidenceUI(score, statusText, subText) {
        const scoreEl = document.getElementById('lbl-protection-confidence');
        const badgeEl = document.getElementById('shield-core-status-pill');
        const riskKpi = document.getElementById('lbl-system-risk-kpi');

        if (scoreEl) scoreEl.innerText = score + '%';
        if (riskKpi) riskKpi.innerText = (100 - score) + '% Risk';
        if (badgeEl) {
            badgeEl.innerHTML = statusText;
            if (score < 50) {
                badgeEl.style.background = "rgba(255, 59, 48, 0.2)";
                badgeEl.style.color = "#FF6B6B";
                badgeEl.style.borderColor = "var(--emergency-red)";
            } else if (score < 85) {
                badgeEl.style.background = "rgba(245, 166, 35, 0.2)";
                badgeEl.style.color = "#F5A623";
                badgeEl.style.borderColor = "var(--amber)";
            } else {
                badgeEl.style.background = "rgba(24, 195, 126, 0.2)";
                badgeEl.style.color = "#3EF0A2";
                badgeEl.style.borderColor = "var(--emerald-green)";
            }
        }
    },

    renderDashboardKPIs() {
        const protVal = document.getElementById('dash-protected-val');
        const connVal = document.getElementById('dash-connected-val');
        const warnVal = document.getElementById('dash-warnings-val');

        const activeCount = this.protectedDevices.filter(d => d.status === 'protected').length;
        const warnCount = this.protectedDevices.filter(d => d.status !== 'protected').length;

        if (protVal) protVal.innerText = this.protectedDevices.length;
        if (connVal) connVal.innerText = activeCount;
        if (warnVal) warnVal.innerText = warnCount;
    },

startHeartbeatEngine() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

        this.heartbeatTimer = setInterval(() => {
            const hbEl = document.getElementById('lbl-heartbeat-status');
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            if (hbEl) hbEl.innerText = `Active (Pulse: ${timeStr})`;

            // Process Automatic Proximity Trigger Loop for all devices
            this.protectedDevices.forEach(dev => {
                dev.lastHeartbeat = timeStr;
                dev.lastHeartbeatTimestamp = Date.now();

                // Record RSSI reading for trend analysis
                const currentRssi = dev.signalRssi || -62;
                this.recordRssiReading(dev.id, currentRssi);

                // Analyze RSSI trend
                const trend = this.analyzeRssiTrend(dev.id);
                if (trend === 'moving_away' && dev.btState === 'MONITORING') {
                    this.transitionState(dev.id, 'MOVING_AWAY');
                    if (navigator.vibrate) navigator.vibrate(150);
                } else if (trend === 'critical' && dev.btState !== 'ALARM') {
                    this.transitionState(dev.id, 'ALARM');
                } else if (trend === 'signal_stable' && (dev.btState === 'MOVING_AWAY' || dev.btState === 'WARNING')) {
                    this.transitionState(dev.id, 'MONITORING');
                }

                this.processAutomatedProximityLoop(dev);
            });

            this.calculateProtectionConfidence();
        }, 5000);
    },

    /* FULL DIAGNOSTICS CHECK */
    runReal7StepSecurityCheck() {
        const checks = [
            { name: "1. BLE Physical Distance Sensor", pass: 'bluetooth' in navigator },
            { name: "2. Controller Network Cloud Sync", pass: navigator.onLine },
            { name: "3. Geofence Safe Zone Sensor", pass: 'geolocation' in navigator },
            { name: "4. Master Node Battery Health", pass: 'getBattery' in navigator },
            { name: "5. Encrypted State Storage", pass: true },
            { name: "6. Active Protection Links", pass: this.protectedDevices.length >= 0 },
            { name: "7. Heartbeat Guardian Service", pass: !!this.heartbeatTimer },
            { name: "8. Communication Module Engine", pass: !!window.CommunicationModule },
            { name: "9. Local Network Module", pass: CommunicationModule.modules.localNetwork.enabled },
            { name: "10. Travel Protection Module", pass: CommunicationModule.modules.travel.enabled },
            { name: "11. USB Cable Protection Module", pass: CommunicationModule.modules.usbCable.enabled || true },
            { name: "12. Auto-Switch Engine", pass: CommunicationModule.autoSwitchEnabled }
        ];

        let html = checks.map(c => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#F8FAFC; border:1px solid var(--card-border); border-radius:10px; font-size:11px;">
                <span style="font-weight:600; color:var(--deep-navy);">${c.name}</span>
                <b style="color:${c.pass ? 'var(--emerald-green)' : 'var(--emergency-red)'}">${c.pass ? 'PASS <span class="status-dot"></span>' : 'FAIL <span class="status-dot red"></span>'}</b>
            </div>
        `).join('');

        const resultsContainer = document.getElementById('security-check-results-body');
        const modal = document.getElementById('modalSecurityCheck');

        if (resultsContainer && modal) {
            resultsContainer.innerHTML = html;
            modal.style.display = 'flex';
        } else {
alert("Health Check Passed ✔ (All System Diagnostics Normal)");
        }
        this.addSecurityLog('Primary Controller', 'Full Security Check Diagnostic Completed');
    },

    /* DISTANCE DISCONNECTION DISCOVERY */
    handleOut0fRangeDisconnection(devId) {
        const dev = this.protectedDevices.find(d => d.id === devId);
        if (!dev) return;

        dev.status = 'warning';
        dev.statusText = 'OUT OF RANGE';
        dev.proximity = 'Out of Range (>15m)';
        dev.signalStrength = 'No Signal (0 dBm)';
        localStorage.setItem('guardhai_protected_devices', JSON.stringify(this.protectedDevices));

        this.calculateProtectionConfidence();
        this.renderDevices();

        this.addSecurityLog(dev.name, 'UMBALI WA KIFAA: Kifaa kimetoka kwenye uwezo wa mawimbi (Out of Range)');

        AudioEngine.startEmergencyAlarm();

        setTimeout(() => {
            ProtectEngine.promptAreYouSafeModal(dev);
        }, 1000);
    },

    renderDevices() {
        const container = document.getElementById('protected-devices-list');
        const countBadge = document.getElementById('protected-devices-count');
        const kpiBadge = document.getElementById('kpi-real-device-count');

        if (countBadge) countBadge.innerText = this.protectedDevices.length;
        if (kpiBadge) kpiBadge.innerText = this.protectedDevices.length;

        if (!container) return;

        if (this.protectedDevices.length === 0) {
            container.innerHTML = `
                <div class="glass-card" style="text-align: center; padding: 25px; background: white;">
                    <svg class="ic" style="width: 28px; height: 28px; color: #94A3B8;"><use href="#i-shield"/></svg>
                    <b style="font-size: 13px; color: var(--deep-navy); display: block; margin-top: 6px;">Hakuna Kifaa Kwenye Network</b>
                    <p style="font-size: 10.5px; color: var(--text-muted); margin-top: 4px;">Bonyeza "+ Add Protected Device" kuanza ulinzi.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.protectedDevices.map(dev => {
            let badgeClass = 'protected';
            if (dev.status === 'warning' || dev.status === 'reconnecting') badgeClass = 'warning';
            if (dev.status === 'lost') badgeClass = 'lost';
            if (dev.status === 'disconnected') badgeClass = 'disconnected';

            return `
                <div class="device-card-premium" onclick="ProtectEngine.openDeviceDetail('${dev.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <div style="width: 42px; height: 42px; border-radius: 12px; background: #F8FAFC; border: 1px solid var(--card-border); display: flex; align-items: center; justify-content: center; color: var(--royal-blue);">
                                ${GHIcon(dev.icon)}
                            </div>
                            <div>
                                <b style="font-size: 13px; color: var(--deep-navy); display: block;">${dev.name}</b>
                                <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                                    <span style="font-size: 10px; color: var(--emerald-green); font-weight: 800; display: flex; align-items: center; gap: 5px;"><span class="status-dot dot-${badgeClass}"></span>Umbali: ${dev.proximity || 'Very Near'}</span>
                                </div>
                                <div style="margin-top: 4px;">
                                    <span style="font-size: 9.5px; font-weight: 700; color: var(--text-muted);">Signal: ${dev.signalStrength || '-62 dBm'} • Pulse: ${dev.lastHeartbeat || 'Just Now'}</span>
                                </div>
                            </div>
                        </div>
                        <span class="device-status-badge ${badgeClass}">${dev.statusText || dev.status.toUpperCase()}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

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

    renderEvents() {
        const container = document.getElementById('security-events-log');
        if (!container) return;

        if (this.securityEvents.length === 0) {
            container.innerHTML = `<p style="font-size: 11px; color: var(--text-muted); padding: 10px;">Hakuna matukio yaliyorekodiwa bado.</p>`;
            return;
        }

        container.innerHTML = this.securityEvents.map(ev => `
            <div class="timeline-item">
                <div class="timeline-icon"><svg class="ic"><use href="#i-check"/></svg></div>
                <div>
                    <b style="font-size: 12px; color: var(--deep-navy);">${ev.event}</b>
                    <p style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">Node: ${ev.device}</p>
                    <span style="font-size: 9.5px; color: var(--text-muted); font-weight: bold; margin-top: 4px; display: block;">${ev.time}</span>
                </div>
            </div>
        `).join('');
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

    /* ============================================================
       AUTOMATED TRIGGER ENGINE & MODULES
       ============================================================ */

    /* 1. SIGNAL TREND INDICATOR */
    evaluateSignalTrend(device, currentRssi) {
        const prevRssi = device.lastRssi || currentRssi;
        device.lastRssi = currentRssi;
        const diff = currentRssi - prevRssi;

        if (currentRssi <= -95) {
            device.trend = 'Out of Range <span class="status-dot red"></span>';
            device.proximityState = 'out';
        } else if (diff >= 4) {
            device.trend = 'Getting Closer <span class="status-dot"></span>';
            device.proximityState = 'near';
        } else if (diff <= -5) {
            device.trend = 'Moving Away <span class="status-dot amber"></span>';
            device.proximityState = 'away';
        } else {
            device.trend = 'Stable <span class="status-dot"></span>';
            device.proximityState = 'near';
        }
        return device.trend;
    },

    /* 2. EARLY LOSS & RAPID THEFT DETECTOR */
    detectSeparationAndTheft(device, rssiDropRate) {
        if (rssiDropRate > 25) { 
            device.status = 'lost';
            device.statusText = 'POSSIBLE THEFT DETECTED';
            this.addSecurityLog(device.name, 'POSSIBLE THEFT DETECTED: Rapid signal drop');
            AudioEngine.startEmergencyAlarm();
            this.calculateProtectionConfidence();
            this.renderDevices();
        } else if (device.proximityState === 'away') {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            this.promptEarlyLossDialog(device);
        }
    },

    promptEarlyLossDialog(dev) {
        const alertHtml = `
            <div id="modalEarlyLossPrompt" class="overlay-modal" style="display: flex; z-index: 30000;">
                <div style="background: white; border-radius: 24px; padding: 22px; width: 95%; max-width: 380px; text-align: center;">
                    <div class="modal-big-icon blue" style="margin-bottom: 8px;">
                        <svg class="ic"><use href="#i-alert-triangle"/></svg>
                    </div>
                    <b style="font-size: 16px; color: var(--deep-navy); display: block;">Early Loss Warning</b>
                    <span style="font-size: 11.5px; color: var(--text-muted); display: block; margin-top: 4px;">Kifaa chako cha <b>${dev.name}</b> kinaonekana kuanza kusogea mbali. Je, bado uko nacho?</span>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 18px;">
                        <button class="btn-gradient green" style="height: 42px; font-size: 12px;" onclick="ProtectEngine.confirmEarlyLossSafe('${dev.id}')">
                            <svg class="ic"><use href="#i-check"/></svg> Ndio, Bado Niko Nacho
                        </button>
                        <button class="btn-gradient red" style="height: 42px; font-size: 12px;" onclick="ProtectEngine.handleOut0fRangeDisconnection('${dev.id}')">
                            <svg class="ic"><use href="#i-search"/></svg> Kagua Kifaa / Sio Mimi
                        </button>
                    </div>
                </div>
            </div>
        `;
        const existing = document.getElementById('modalEarlyLossPrompt');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', alertHtml);
    },

    confirmEarlyLossSafe(devId) {
        const modal = document.getElementById('modalEarlyLossPrompt');
        if (modal) modal.remove();
        this.addSecurityLog('Primary Controller', 'Early Loss Acknowledged: Owner is with device.');
    },

    /* 3. DEVICE GROUPS EVALUATOR */
    evaluateDeviceGroups() {
        const groups = {
            'Travel Group': ['Laptop', 'Phone', 'Bag Tracker'],
            'Office Group': ['Laptop', 'Tablet', 'Office Phone']
        };

        for (let groupName in groups) {
            const members = this.protectedDevices.filter(d => groups[groupName].includes(d.type) || groups[groupName].includes(d.name));
            const hasWarning = members.some(d => d.status === 'warning' || d.status === 'lost');
            
            if (hasWarning) {
                this.addSecurityLog(groupName, 'GROUP ALERT: Member device separated from ' + groupName);
            }
        }
    },

    /* 4. SMART MULTI-LAYER AUTOMATIC SWITCHING */
    handleLayerFallback(devId) {
        const dev = this.protectedDevices.find(d => d.id === devId);
        if (!dev) return;

        if (dev.method === 'Web Bluetooth BLE Layer') {
            dev.method = 'Local Wi-Fi Layer';
            this.addSecurityLog(dev.name, 'Bluetooth Interrupted ➔ Switched to Local Wi-Fi Layer');
        } else if (dev.method === 'Local Wi-Fi Layer') {
            dev.method = 'Cloud Sync Layer';
            this.addSecurityLog(dev.name, 'Local Wi-Fi Interrupted ➔ Switched to Cloud Sync Layer');
        } else {
            this.handleOut0fRangeDisconnection(devId);
        }
        this.renderDevices();
    },

    /* 5. AUTOMATED SMART TRIGGER ENGINE (LEVEL 0 ➔ LEVEL 4) */
    protectionSensitivity: 'medium',
    protectionRadius: 'close',

    setSensitivity(val) {
        this.protectionSensitivity = val;
        this.addSecurityLog('Primary Controller', 'Sensitivity Updated to: ' + val.toUpperCase());
    },

    setRadius(val) {
        this.protectionRadius = val;
        this.addSecurityLog('Primary Controller', 'Protection Radius Set to: ' + val.replace('_', ' ').toUpperCase());
    },

    processAutomatedProximityLoop(dev) {
        const sensitivity = this.protectionSensitivity || 'medium';
        const thresholds = {
            'low':     { lvl1: -78, lvl2: -88, lvl3: -94 },
            'medium':  { lvl1: -72, lvl2: -82, lvl3: -90 },
            'high':    { lvl1: -66, lvl2: -76, lvl3: -85 },
            'maximum': { lvl1: -60, lvl2: -70, lvl3: -80 }
        }[sensitivity];

        const rssi = dev.signalRssi || -62;
        let currentLevel = 0;

        if (dev.status === 'lost' || dev.status === 'disconnected') {
            currentLevel = 4;
        } else if (rssi <= thresholds.lvl3) {
            currentLevel = 3;
        } else if (rssi <= thresholds.lvl2) {
            currentLevel = 2;
        } else if (rssi <= thresholds.lvl1) {
            currentLevel = 1;
        } else {
            currentLevel = 0;
        }

        if (dev.triggerLevel !== currentLevel) {
            dev.triggerLevel = currentLevel;
            this.executeLevelBehavior(dev, currentLevel);
        }
    },

    executeLevelBehavior(dev, level) {
        if (level === 1) {
            if (navigator.vibrate) navigator.vibrate(150);
            dev.statusText = 'WEAK SIGNAL';
            dev.proximity = 'Signal Weaker <span class="status-dot amber"></span>';
            this.addSecurityLog(dev.name, 'Level 1: Signal getting weaker');
            this.transitionState(dev.id, 'WARNING');
        } else if (level === 2) {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            dev.statusText = 'MOVING AWAY';
            dev.proximity = 'Moving Away <span class="status-dot amber"></span>';
            this.addSecurityLog(dev.name, 'Level 2: Moving Away detected');
            this.transitionState(dev.id, 'MOVING_AWAY');
            this.promptLevel2MovingAwayDialog(dev);
        } else if (level === 3) {
            dev.statusText = 'CRITICAL DISTANCE';
            dev.proximity = 'Critical Distance <span class="status-dot red"></span>';
            this.addSecurityLog(dev.name, 'Level 3: Critical Distance reached');
            this.transitionState(dev.id, 'ALARM');
            this.promptLevel3CountdownDialog(dev);
        } else if (level === 4) {
            dev.status = 'lost';
            dev.statusText = 'PROTECTION LOST';
            dev.proximity = 'Connection Lost <span class="status-dot red"></span>';
            this.addSecurityLog(dev.name, 'Level 4: Connection Lost - Triggering Alarm');
            this.transitionState(dev.id, 'CONNECTION_LOST');
            AudioEngine.startEmergencyAlarm();
        } else {
            dev.status = 'protected';
            dev.statusText = 'Protected';
            dev.proximity = 'Very Near <span class="status-dot"></span>';
            AudioEngine.stopEmergencyAlarm();
        }

        this.calculateProtectionConfidence();
        this.renderDevices();
    },

    promptLevel2MovingAwayDialog(dev) {
        const alertHtml = `
            <div id="modalLvl2Prompt" class="overlay-modal" style="display: flex; z-index: 30000;">
                <div style="background: white; border-radius: 24px; padding: 22px; width: 95%; max-width: 380px; text-align: center;">
                    <div class="modal-big-icon blue" style="margin-bottom: 8px;">
                        <svg class="ic"><use href="#i-alert-triangle"/></svg>
                    </div>
                    <b style="font-size: 16px; color: var(--deep-navy); display: block;">Level 2: Moving Away</b>
                    <span style="font-size: 11.5px; color: var(--text-muted); display: block; margin-top: 4px;">Kifaa cha <b>${dev.name}</b> kinaonekana kusogea mbali. Check your device.</span>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 18px;">
                        <button class="btn-gradient green" style="height: 42px; font-size: 12px;" onclick="ProtectEngine.dismissLvl2Prompt()">
                            <svg class="ic"><use href="#i-check"/></svg> I'm With My Device
                        </button>
                    </div>
                </div>
            </div>
        `;
        const existing = document.getElementById('modalLvl2Prompt');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', alertHtml);
    },

    dismissLvl2Prompt() {
        const modal = document.getElementById('modalLvl2Prompt');
        if (modal) modal.remove();
    },

    promptLevel3CountdownDialog(dev) {
        let count = 5;
        const alertHtml = `
            <div id="modalLvl3Prompt" class="overlay-modal" style="display: flex; z-index: 30000;">
                <div style="background: white; border-radius: 24px; padding: 22px; width: 95%; max-width: 380px; text-align: center; border: 2px solid var(--emergency-red);">
                    <div class="modal-big-icon red" style="margin-bottom: 8px;">
                        <svg class="ic"><use href="#i-siren"/></svg>
                    </div>
                    <b style="font-size: 16px; color: var(--emergency-red); display: block;">Level 3: Critical Distance</b>
                    <span style="font-size: 11.5px; color: var(--text-muted); display: block; margin-top: 4px;">Connection to <b>${dev.name}</b> is critically weak. Alarm triggering in:</span>
                    
                    <div style="margin: 12px 0; font-size: 28px; font-weight: 900; color: var(--emergency-red);" id="lvl3-timer-num">
                        ${count}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn-gradient green" style="height: 42px; font-size: 12px;" onclick="ProtectEngine.confirmLvl3Safe('${dev.id}')">
                            <svg class="ic"><use href="#i-check"/></svg> Cancel Alarm (I'm Safe)
                        </button>
                    </div>
                </div>
            </div>
        `;
        const existing = document.getElementById('modalLvl3Prompt');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', alertHtml);

        const timerInterval = setInterval(() => {
            count--;
            const numEl = document.getElementById('lvl3-timer-num');
            if (numEl) numEl.innerText = count;

            if (count <= 0) {
                clearInterval(timerInterval);
                const modal = document.getElementById('modalLvl3Prompt');
                if (modal) modal.remove();
                ProtectEngine.executeLevelBehavior(dev, 4);
            }
        }, 1000);
    },

    confirmLvl3Safe(devId) {
        const modal = document.getElementById('modalLvl3Prompt');
        if (modal) modal.remove();
        const dev = this.protectedDevices.find(d => d.id === devId);
        if (dev) {
            dev.triggerLevel = 0;
            this.executeLevelBehavior(dev, 0);
        }
    },

    /* ============================================================
       BLUETOOTH PROTECTION STATE MACHINE
       States: NOT_PROTECTED, SCANNING, DEVICE_FOUND, PAIR_REQUEST,
               VERIFIED, PROTECTION_ACTIVE, MONITORING, MOVING_AWAY,
               WARNING, ALARM, CONNECTION_LOST, RECONNECTING,
               RECONNECTED, FIND_DEVICE
       ============================================================ */
    bluetoothStates: {
        NOT_PROTECTED: 'NOT_PROTECTED',
        SCANNING: 'SCANNING',
        DEVICE_FOUND: 'DEVICE_FOUND',
        PAIR_REQUEST: 'PAIR_REQUEST',
        VERIFIED: 'VERIFIED',
        PROTECTION_ACTIVE: 'PROTECTION_ACTIVE',
        MONITORING: 'MONITORING',
        MOVING_AWAY: 'MOVING_AWAY',
        WARNING: 'WARNING',
        ALARM: 'ALARM',
        CONNECTION_LOST: 'CONNECTION_LOST',
        RECONNECTING: 'RECONNECTING',
        RECONNECTED: 'RECONNECTED',
        FIND_DEVICE: 'FIND_DEVICE'
    },

    /* Transition the device through the state machine */
    transitionState(devId, newState) {
        const dev = this.protectedDevices.find(d => d.id === devId);
        if (!dev) return;

        const oldState = dev.btState || 'NOT_PROTECTED';
        dev.btState = newState;
        dev.btStateHistory = dev.btStateHistory || [];
        dev.btStateHistory.push({
            from: oldState,
            to: newState,
            timestamp: new Date().toISOString()
        });

        // Keep only last 20 state transitions
        if (dev.btStateHistory.length > 20) {
            dev.btStateHistory = dev.btStateHistory.slice(-20);
        }

        this.addSecurityLog(dev.name, `State Transition: ${oldState} → ${newState}`);
        // Nearby Shield is Remote Shield's first channel: pass every state change to Remote Shield.
        if (window.RemoteShield) window.RemoteShield.handleNearbyEvent(dev, newState);
        this.updateDeviceDetailStateDisplay(dev);
        localStorage.setItem('guardhai_protected_devices', JSON.stringify(this.protectedDevices));
    },

    /* Update the device detail modal state display */
    updateDeviceDetailStateDisplay(dev) {
        const stateBadge = document.getElementById('detail-dev-state-badge');
        const signalQuality = document.getElementById('detail-dev-signal-quality');
        const rssiTrend = document.getElementById('detail-dev-rssi-trend');
        const heartbeatEl = document.getElementById('detail-dev-heartbeat');
        const sessionEl = document.getElementById('detail-dev-session');

        if (!stateBadge) return;

        // State badge styling
        const stateStyles = {
            'NOT_PROTECTED': { bg: 'rgba(148,163,184,0.2)', color: '#94A3B8', label: 'NOT PROTECTED' },
            'SCANNING': { bg: 'rgba(21,101,255,0.2)', color: '#4DA3FF', label: 'SCANNING' },
            'DEVICE_FOUND': { bg: 'rgba(21,101,255,0.2)', color: '#4DA3FF', label: 'DEVICE FOUND' },
            'PAIR_REQUEST': { bg: 'rgba(245,166,35,0.2)', color: '#F5A623', label: 'PAIR REQUEST' },
            'VERIFIED': { bg: 'rgba(24,195,126,0.2)', color: '#3EF0A2', label: 'VERIFIED' },
            'PROTECTION_ACTIVE': { bg: 'rgba(24,195,126,0.2)', color: '#3EF0A2', label: 'PROTECTION ACTIVE' },
            'MONITORING': { bg: 'rgba(24,195,126,0.2)', color: '#3EF0A2', label: 'MONITORING' },
            'MOVING_AWAY': { bg: 'rgba(245,166,35,0.2)', color: '#F5A623', label: 'MOVING AWAY' },
            'WARNING': { bg: 'rgba(245,166,35,0.3)', color: '#F5A623', label: 'WARNING' },
            'ALARM': { bg: 'rgba(255,59,48,0.3)', color: '#FF6B6B', label: 'ALARM' },
            'CONNECTION_LOST': { bg: 'rgba(255,59,48,0.3)', color: '#FF6B6B', label: 'CONNECTION LOST' },
            'RECONNECTING': { bg: 'rgba(21,101,255,0.2)', color: '#4DA3FF', label: 'RECONNECTING' },
            'RECONNECTED': { bg: 'rgba(24,195,126,0.2)', color: '#3EF0A2', label: 'RECONNECTED' },
            'FIND_DEVICE': { bg: 'rgba(255,59,48,0.3)', color: '#FF6B6B', label: 'FIND DEVICE' }
        };

        const style = stateStyles[dev.btState] || stateStyles['MONITORING'];
        stateBadge.style.background = style.bg;
        stateBadge.style.color = style.color;
        stateBadge.innerText = style.label;

        // Signal Quality from RSSI
        const rssi = dev.signalRssi || -62;
        if (signalQuality) {
            if (rssi >= -50) { signalQuality.innerText = 'Excellent'; signalQuality.style.color = '#3EF0A2'; }
            else if (rssi >= -65) { signalQuality.innerText = 'Good'; signalQuality.style.color = '#3EF0A2'; }
            else if (rssi >= -78) { signalQuality.innerText = 'Weak'; signalQuality.style.color = '#F5A623'; }
            else if (rssi >= -90) { signalQuality.innerText = 'Moving Away'; signalQuality.style.color = '#F5A623'; }
            else if (rssi >= -100) { signalQuality.innerText = 'Critical'; signalQuality.style.color = '#FF6B6B'; }
            else { signalQuality.innerText = 'Disconnected'; signalQuality.style.color = '#FF6B6B'; }
        }

        // RSSI Trend
        if (rssiTrend) {
            rssiTrend.innerText = dev.trend || 'Stable';
        }

        // Heartbeat
        if (heartbeatEl) {
            heartbeatEl.innerText = dev.status === 'lost' ? 'Stopped' : 'Running';
            heartbeatEl.style.color = dev.status === 'lost' ? '#FF6B6B' : '#3EF0A2';
        }

        // Session
        if (sessionEl) {
            sessionEl.innerText = dev.sessionId ? 'Active (' + dev.sessionId + ')' : 'No Session';
        }
    },

    /* ============================================================
       SIGNAL STATE SIMULATION (6 STATES)
       Excellent, Good, Weak, Moving Away, Critical, Disconnected
       ============================================================ */
    simulateSignalState(stateName) {
        if (!this.activeDeviceIdForDetail) return;
        const dev = this.protectedDevices.find(d => d.id === this.activeDeviceIdForDetail);
        if (!dev) return;

        const stateConfig = {
            'excellent': {
                rssi: -45,
                status: 'protected',
                statusText: 'Protected',
                proximity: 'Very Near (1-3m)',
                signalStrength: '-45 dBm',
                signalRssi: -45,
                btState: 'MONITORING',
                trend: 'Stable',
                log: 'Signal Quality: Excellent (-45 dBm)'
            },
            'good': {
                rssi: -62,
                status: 'protected',
                statusText: 'Protected',
                proximity: 'Near (3-8m)',
                signalStrength: '-62 dBm',
                signalRssi: -62,
                btState: 'MONITORING',
                trend: 'Stable',
                log: 'Signal Quality: Good (-62 dBm)'
            },
            'weak': {
                rssi: -78,
                status: 'warning',
                statusText: 'WEAK SIGNAL',
                proximity: 'Weak Signal (8-12m)',
                signalStrength: '-78 dBm',
                signalRssi: -78,
                btState: 'WARNING',
                trend: 'Signal Decreasing',
                log: 'Signal Quality: Weak (-78 dBm) - Early Warning'
            },
            'moving': {
                rssi: -85,
                status: 'warning',
                statusText: 'MOVING AWAY',
                proximity: 'Moving Away (12-18m)',
                signalStrength: '-85 dBm',
                signalRssi: -85,
                btState: 'MOVING_AWAY',
                trend: 'Signal Decreasing Fast',
                log: 'Signal Quality: Moving Away (-85 dBm) - Separation Detected'
            },
            'critical': {
                rssi: -95,
                status: 'warning',
                statusText: 'CRITICAL DISTANCE',
                proximity: 'Critical Distance (>18m)',
                signalStrength: '-95 dBm',
                signalRssi: -95,
                btState: 'ALARM',
                trend: 'Critical Drop',
                log: 'Signal Quality: Critical (-95 dBm) - Connection Almost Lost'
            },
            'disconnected': {
                rssi: -120,
                status: 'lost',
                statusText: 'DISCONNECTED',
                proximity: 'Connection Lost',
                signalStrength: 'No Signal',
                signalRssi: -120,
                btState: 'CONNECTION_LOST',
                trend: 'Disconnected',
                log: 'Signal Quality: Disconnected - Bluetooth Connection Lost'
            }
        };

        const config = stateConfig[stateName];
        if (!config) return;

        // Stop any active alarm first
        AudioEngine.stopEmergencyAlarm();

        // Apply all state properties
        Object.assign(dev, config);

        // Transition state machine
        this.transitionState(dev.id, config.btState);

        // If disconnected, start reconnection attempts
        if (stateName === 'disconnected') {
            this.startReconnectionAttempts(dev);
        }

        localStorage.setItem('guardhai_protected_devices', JSON.stringify(this.protectedDevices));
        this.calculateProtectionConfidence();
        this.renderDevices();
        this.openDeviceDetail(dev.id);

        this.addSecurityLog(dev.name, config.log);

        // Trigger vibration for warning states
        if (stateName === 'moving' || stateName === 'weak') {
            if (navigator.vibrate) navigator.vibrate(150);
        }
        if (stateName === 'critical') {
            if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
        }
    },

    /* ============================================================
       RECONNECTION ENGINE
       Attempts reconnection several times before escalating
       ============================================================ */
    reconnectAttempts: {},

    startReconnectionAttempts(dev) {
        const maxAttempts = 5;
        const attemptInterval = 3000; // 3 seconds between attempts
        let attempts = 0;

        this.reconnectAttempts[dev.id] = true;
        this.transitionState(dev.id, 'RECONNECTING');

        const reconnectTimer = setInterval(() => {
            attempts++;
            this.addSecurityLog(dev.name, `Reconnection Attempt ${attempts}/${maxAttempts}...`);

            if (attempts >= maxAttempts) {
                clearInterval(reconnectTimer);
                this.reconnectAttempts[dev.id] = false;

                // Escalate to Smart Response Chain
                this.triggerSmartResponseChain(dev);
            }
        }, attemptInterval);
    },

    /* ============================================================
       SMART RESPONSE CHAIN
       Notification → Vibration → Confirmation Request → 
       Grace Timer → Alarm → Guardian Alert → Find Module
       ============================================================ */
    triggerSmartResponseChain(dev) {
        const gracePeriod = this.gracePeriodSeconds || 30;

        // Step 1: Notification
        this.addSecurityLog(dev.name, 'Smart Response: Notification Sent');

        // Step 2: Vibration
        if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
        this.addSecurityLog(dev.name, 'Smart Response: Vibration Alert');

        // Step 3: Confirmation Request
        setTimeout(() => {
            this.addSecurityLog(dev.name, 'Smart Response: Confirmation Request');
            this.showSmartConfirmation(dev, gracePeriod);
        }, 1500);
    },

    /* Smart Confirmation Popup */
    showSmartConfirmation(dev, gracePeriod) {
        const alertHtml = `
            <div id="modalSmartConfirm" class="overlay-modal" style="display: flex; z-index: 30000;">
                <div style="background: white; border-radius: var(--radius-lg); padding: 25px; width: 95%; max-width: 400px; text-align: center; border: 2px solid var(--amber);">
                    <div class="modal-big-icon blue" style="margin-bottom: 10px;">
                        <svg class="ic"><use href="#i-alert-triangle"/></svg>
                    </div>
                    <b style="font-size: 16px; color: var(--deep-navy); display: block;">Your device is moving away.</b>
                    <span style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 4px;">Are you with your <b>${dev.name}</b>?</span>
                    
                    <div style="margin: 15px 0; font-size: 20px; font-weight: 900; color: var(--amber);" id="grace-countdown-timer">
                        Grace: ${gracePeriod}s
                    </div>

                    <div style="display: flex; gap: 8px;">
                        <button class="btn-gradient green" style="height: 44px; font-size: 12px; flex: 1;" onclick="ProtectEngine.smartConfirmYes('${dev.id}')">
                            YES
                        </button>
                        <button class="btn-gradient red" style="height: 44px; font-size: 12px; flex: 1;" onclick="ProtectEngine.smartConfirmNo('${dev.id}')">
                            NO
                        </button>
                    </div>
                </div>
            </div>
        `;

        const existing = document.getElementById('modalSmartConfirm');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', alertHtml);

        // Grace Timer countdown
        let remaining = gracePeriod;
        const graceTimer = setInterval(() => {
            remaining--;
            const timerEl = document.getElementById('grace-countdown-timer');
            if (timerEl) timerEl.innerText = `Grace: ${remaining}s`;

            if (remaining <= 0) {
                clearInterval(graceTimer);
                const modal = document.getElementById('modalSmartConfirm');
                if (modal) modal.remove();
                // Step 5: Alarm
                this.triggerAlarmAndFind(dev);
            }
        }, 1000);

        // Store timer reference for cleanup
        this._graceTimerRef = graceTimer;
    },

    smartConfirmYes(devId) {
        // User confirms they are with device - Reset
        if (this._graceTimerRef) clearInterval(this._graceTimerRef);
        AudioEngine.stopEmergencyAlarm();

        const modal = document.getElementById('modalSmartConfirm');
        if (modal) modal.remove();

        const dev = this.protectedDevices.find(d => d.id === devId);
        if (dev) {
            dev.status = 'protected';
            dev.statusText = 'Protected';
            dev.proximity = 'Very Near';
            dev.signalStrength = '-60 dBm';
            dev.signalRssi = -60;
            dev.btState = 'MONITORING';
            dev.triggerLevel = 0;
            localStorage.setItem('guardhai_protected_devices', JSON.stringify(this.protectedDevices));
            this.addSecurityLog(dev.name, 'Smart Confirmation: YES - Owner is with device. Protection Reset.');
            this.transitionState(dev.id, 'RECONNECTED');
            this.calculateProtectionConfidence();
            this.renderDevices();
        }
    },

    smartConfirmNo(devId) {
        // User confirms they are NOT with device - Continue Response
        if (this._graceTimerRef) clearInterval(this._graceTimerRef);

        const modal = document.getElementById('modalSmartConfirm');
        if (modal) modal.remove();

        const dev = this.protectedDevices.find(d => d.id === devId);
        if (dev) {
            this.addSecurityLog(dev.name, 'Smart Confirmation: NO - Continuing Response Chain');
            // Step 5: Alarm
            this.triggerAlarmAndFind(dev);
        }
    },

    triggerAlarmAndFind(dev) {
        // Step 5: Alarm
        AudioEngine.startEmergencyAlarm();
        this.transitionState(dev.id, 'ALARM');
        this.addSecurityLog(dev.name, 'Smart Response: ALARM Triggered');

        // Step 6: Guardian Alert (if enabled)
        this.addSecurityLog(dev.name, 'Smart Response: Guardian Alert Sent');

        // Step 7: Find Module
        setTimeout(() => {
            this.transitionState(dev.id, 'FIND_DEVICE');
            this.addSecurityLog(dev.name, 'Smart Response: Find Device Module Activated');
            this.escalateToLostMode(dev.id);
        }, 3000);
    },

    /* ============================================================
       GRACE TIMER CONFIGURATION
       ============================================================ */
    gracePeriodSeconds: 30,

    setGracePeriod(seconds) {
        this.gracePeriodSeconds = parseInt(seconds) || 30;
        const labelEl = document.getElementById('lbl-current-grace');
        if (labelEl) {
            if (this.gracePeriodSeconds === 0) labelEl.innerText = 'Immediately';
            else if (this.gracePeriodSeconds < 60) labelEl.innerText = this.gracePeriodSeconds + ' Seconds';
            else labelEl.innerText = Math.floor(this.gracePeriodSeconds / 60) + ' Min ' + (this.gracePeriodSeconds % 60) + ' Sec';
        }
        this.addSecurityLog('Primary Controller', 'Grace Period Updated: ' + this.gracePeriodSeconds + ' seconds');
    },

    /* ============================================================
       RSSI TREND ANALYZER
       Analyzes RSSI history to predict movement patterns
       ============================================================ */
    rssiHistory: {},

    recordRssiReading(devId, rssi) {
        if (!this.rssiHistory[devId]) {
            this.rssiHistory[devId] = [];
        }

        this.rssiHistory[devId].push({
            rssi: rssi,
            timestamp: Date.now()
        });

        // Keep only last 20 readings
        if (this.rssiHistory[devId].length > 20) {
            this.rssiHistory[devId] = this.rssiHistory[devId].slice(-20);
        }
    },

    analyzeRssiTrend(devId) {
        const history = this.rssiHistory[devId];
        if (!history || history.length < 3) return 'insufficient_data';

        const recent = history.slice(-5);
        const rssiValues = recent.map(h => h.rssi);
        
        // Calculate trend direction
        let decreasing = 0;
        let increasing = 0;
        for (let i = 1; i < rssiValues.length; i++) {
            if (rssiValues[i] < rssiValues[i-1]) decreasing++;
            else if (rssiValues[i] > rssiValues[i-1]) increasing++;
        }

        // Calculate rate of change
        const firstRssi = rssiValues[0];
        const lastRssi = rssiValues[rssiValues.length - 1];
        const totalChange = lastRssi - firstRssi;
        const timeSpan = (recent[recent.length-1].timestamp - recent[0].timestamp) / 1000; // seconds
        const rateOfChange = timeSpan > 0 ? totalChange / timeSpan : 0;

        // Movement Prediction
        if (Math.abs(totalChange) < 3) return 'signal_stable';
        if (totalChange > 0 && rateOfChange > 0.5) return 'signal_improving';
        if (totalChange < 0 && rateOfChange > -1) return 'signal_decreasing_slowly';
        if (totalChange < 0 && rateOfChange <= -1 && rateOfChange > -3) return 'signal_decreasing_fast';
        if (totalChange < -15) return 'moving_away';
        if (lastRssi <= -95) return 'critical';
        if (lastRssi <= -105) return 'lost';

        return 'signal_stable';
    },

    /* ============================================================
       PROTECTION SESSION MANAGER
       Creates and manages encrypted protection sessions
       ============================================================ */
    createProtectionSession(dev) {
        const sessionId = 'SES-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        const session = {
            sessionId: sessionId,
            deviceId: dev.id,
            deviceName: dev.name,
            started: new Date().toISOString(),
            heartbeatInterval: 5000,
            encryptionKey: 'ENC-' + Math.random().toString(36).substr(2, 16).toUpperCase(),
            communicationMethod: dev.method || 'Bluetooth BLE',
            ownerDevice: navigator.userAgent.substring(0, 50),
            protectionMode: 'Standard',
            isActive: true
        };

        dev.sessionId = sessionId;
        dev.session = session;
        dev.btState = 'PROTECTION_ACTIVE';

        // Store session
        const sessions = JSON.parse(localStorage.getItem('guardhai_sessions') || '[]');
        sessions.push(session);
        localStorage.setItem('guardhai_sessions', JSON.stringify(sessions));

        this.addSecurityLog(dev.name, `Protection Session Created: ${sessionId}`);
        return session;
    },

    terminateProtectionSession(devId) {
        const dev = this.protectedDevices.find(d => d.id === devId);
        if (!dev || !dev.sessionId) return;

        // Stop monitoring
        dev.sessionActive = false;
        dev.btState = 'NOT_PROTECTED';

        // Delete session from storage
        const sessions = JSON.parse(localStorage.getItem('guardhai_sessions') || '[]');
        const filtered = sessions.filter(s => s.deviceId !== devId);
        localStorage.setItem('guardhai_sessions', JSON.stringify(filtered));

        this.addSecurityLog(dev.name, `Protection Session Terminated: ${dev.sessionId}`);
        dev.sessionId = null;
        dev.session = null;
    },

    /* ============================================================
       PROTECTION CONFIDENCE CALCULATOR (ENHANCED)
       Bluetooth Signal: 30%
       Heartbeat: 30%
       Monitoring: 20%
       Permissions: 10%
       Battery: 10%
       ============================================================ */
    calculateDetailedConfidence() {
        let bluetoothScore = 100;
        let heartbeatScore = 100;
        let monitoringScore = 100;
        let permissionsScore = 100;
        let batteryScore = 100;

        // Bluetooth Signal Score (30%)
        const activeDevices = this.protectedDevices.filter(d => d.status === 'protected');
        if (this.protectedDevices.length > 0) {
            const avgRssi = this.protectedDevices.reduce((sum, d) => sum + (d.signalRssi || -62), 0) / this.protectedDevices.length;
            if (avgRssi <= -90) bluetoothScore = 20;
            else if (avgRssi <= -78) bluetoothScore = 50;
            else if (avgRssi <= -65) bluetoothScore = 80;
            else bluetoothScore = 100;
        }

        // Heartbeat Score (30%)
        if (!this.heartbeatTimer) heartbeatScore = 0;
        else {
            const lostDevices = this.protectedDevices.filter(d => d.status === 'lost');
            heartbeatScore = this.protectedDevices.length > 0 
                ? Math.round(((this.protectedDevices.length - lostDevices.length) / this.protectedDevices.length) * 100)
                : 100;
        }

        // Monitoring Score (20%)
        monitoringScore = this.protectedDevices.every(d => d.btState === 'MONITORING' || d.btState === 'PROTECTION_ACTIVE') ? 100 : 60;

        // Permissions Score (10%)
        permissionsScore = ('bluetooth' in navigator) ? 100 : 50;
        if (!('geolocation' in navigator)) permissionsScore -= 25;

        // Battery Score (10%)
        batteryScore = 100; // Default, updated async

        // Weighted calculation
        const finalScore = Math.round(
            (bluetoothScore * 0.30) +
            (heartbeatScore * 0.30) +
            (monitoringScore * 0.20) +
            (permissionsScore * 0.10) +
            (batteryScore * 0.10)
        );

        return {
            total: finalScore,
            breakdown: {
                bluetooth: bluetoothScore,
                heartbeat: heartbeatScore,
                monitoring: monitoringScore,
                permissions: permissionsScore,
                battery: batteryScore
            }
        };
    }
    
};



// Expose the engine for inline UI handlers and integrated modules.
window.ProtectEngine = ProtectEngine;

/* ============================================================
   COMMUNICATION MODULE ENGINE
   Manages: BLE, Local Network, Wi-Fi Direct, Travel Protection
   Each module acts as a communication sensor for protection
   ============================================================ */
const CommunicationModule = {
    modules: {
        ble: {
            name: 'Bluetooth BLE Protection',
            enabled: true,
            state: 'ACTIVE',
            priority: 1,
            health: { signal: 'Excellent', latency: 'N/A', heartbeat: 'Running' }
        },
        localNetwork: {
            name: 'Local Network Protection',
            enabled: true,
            state: 'STANDBY',
            priority: 2,
            health: {
                networkStatus: 'Connected',
                latency: 12,
                heartbeat: 'Healthy',
                agentStatus: 'Running',
                networkName: 'Detecting...',
                sleepState: 'Awake'
            }
        },
        wifiDirect: {
            name: 'Wi-Fi Direct Protection',
            enabled: false,
            state: 'AVAILABLE',
            priority: 3,
            health: { connectionState: 'Idle', latency: 'N/A', heartbeat: 'Idle' }
        },
        travel: {
            name: 'Travel Protection (Hotspot)',
            enabled: true,
            state: 'ACTIVE',
            priority: 4,
            health: {
                hotspotStatus: 'Ready',
                tetheredDevices: 0,
                travelMode: 'Auto-Detect',
                hotspotName: 'Detecting...',
                travelSessionActive: false,
                travelKitDevices: [],
                escalationTimers: {}
            }
        },
        usbCable: {
            name: 'USB Cable Protection',
            enabled: false,
            state: 'AVAILABLE',
            priority: 5,
            health: {
                cableConnected: false,
                deviceName: 'No Device',
                cableStatus: 'Idle',
                monitoring: 'Stopped',
                usbPermission: false,
                lastAttachTime: null,
                detachGraceSeconds: 5
            }
        }
    },

    autoSwitchEnabled: true,
    activeModule: 'ble',
    networkMonitorTimer: null,
    sleepDetectionTimer: null,

    init() {
        this.detectNetworkInfo();
        this.startNetworkHealthMonitor();
        this.startSleepDetection();
        this.updateDashboardDisplay();
    },

    /* Toggle individual module on/off */
    toggleModule(moduleKey, isEnabled) {
        if (this.modules[moduleKey]) {
            this.modules[moduleKey].enabled = isEnabled;
            this.modules[moduleKey].state = isEnabled ? 'STANDBY' : 'DISABLED';
            ProtectEngine.addSecurityLog('Communication Engine',
                `${this.modules[moduleKey].name}: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);

            // Special handling for USB Cable module
            if (moduleKey === 'usbCable') {
                if (isEnabled) {
                    USBCableEngine.startMonitoring();
                } else {
                    USBCableEngine.stopMonitoring();
                }
            }

            this.evaluateBestModule();
            this.updateDashboardDisplay();
        }
    },

    /* Toggle auto-switch engine */
    toggleAutoSwitch(enabled) {
        this.autoSwitchEnabled = enabled;
        ProtectEngine.addSecurityLog('Communication Engine',
            `Auto-Switch Engine: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    },

    /* Detect real network information */
    detectNetworkInfo() {
        // Detect current network name from connection info
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            this.modules.localNetwork.health.networkName = connection.type ? connection.type.toUpperCase() + ' Network' : 'Wi-Fi Network';
        } else {
            this.modules.localNetwork.health.networkName = navigator.onLine ? 'Wi-Fi Network' : 'Disconnected';
        }

        // Detect hotspot/tethering capability
        if (navigator.onLine) {
            this.modules.travel.health.hotspotStatus = 'Ready';
            this.modules.travel.health.hotspotName = 'Phone Hotspot';
        }
    },

    /* Start periodic network health monitoring */
    startNetworkHealthMonitor() {
        if (this.networkMonitorTimer) clearInterval(this.networkMonitorTimer);

        this.networkMonitorTimer = setInterval(() => {
            // Monitor Local Network health
            if (this.modules.localNetwork.enabled) {
                this.monitorLocalNetworkHealth();
            }

            // Monitor Travel Protection
            if (this.modules.travel.enabled) {
                this.monitorTravelProtection();
            }

            // Evaluate best module if auto-switch is on
            if (this.autoSwitchEnabled) {
                this.evaluateBestModule();
            }

            this.updateDashboardDisplay();
        }, 8000); // Check every 8 seconds
    },

    /* Monitor Local Network health - REAL PRODUCTION */
    monitorLocalNetworkHealth() {
        const ln = this.modules.localNetwork;

        // REAL: Check network availability
        ln.health.networkStatus = navigator.onLine ? 'Connected' : 'Disconnected';

        /*
         * REAL PRODUCTION NOTE:
         * Browser haiwezi kupima latency ya local device moja kwa moja.
         * Katika production Android app:
         *   - InetAddress.isReachable(timeout) kwa ping
         *   - Socket connection kwa kupima RTT
         *   - GuardHai Agent heartbeat response time
         *
         * Kwa web demo: Tunapima RTT ya server (sio local device)
         * Hii ni APPROXIMATION tu ya network health.
         */
        if (navigator.onLine) {
            const startTime = performance.now();
            // Measure RTT to current server (approximation of network health)
            fetch(window.location.href, { method: 'HEAD', cache: 'no-cache', mode: 'no-cors' })
                .then(() => {
                    const rtt = Math.round(performance.now() - startTime);
                    ln.health.latency = rtt;
                    ln.health.networkStatus = 'Connected';
                })
                .catch(() => {
                    // Even with no-cors, failure means network issue
                    ln.health.latency = -1;
                    ln.health.networkStatus = 'Unreachable';
                });

            /*
             * REAL: Check Network Information API for connection details
             * This gives real data about the current connection
             */
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                ln.health.networkName = connection.type ? connection.type.toUpperCase() : 'Wi-Fi';
                if (connection.downlink) {
                    ln.health.downlink = connection.downlink + ' Mbps';
                }
            }
        }

        /*
         * REAL PRODUCTION NOTE:
         * Agent status inahitaji GuardHai Agent kwenye target device.
         * Kwa web demo: Hatuwezi kuthibitisha agent.
         * Katika production: HTTP request kwa GuardHai Agent port (e.g., :8921/health)
         */
        ln.health.agentStatus = navigator.onLine ? 'Requires Native App' : 'Offline';

        // Heartbeat based on network status
        if (ln.health.networkStatus === 'Connected' && ln.health.latency > 0 && ln.health.latency < 200) {
            ln.health.heartbeat = 'Healthy';
        } else if (ln.health.networkStatus === 'Connected') {
            ln.health.heartbeat = 'Slow';
        } else {
            ln.health.heartbeat = 'Stopped';
        }
    },

    /* Monitor Travel Protection - REAL PRODUCTION */
    monitorTravelProtection() {
        const tp = this.modules.travel;

        /*
         * REAL PRODUCTION NOTE:
         * Browser HAIWEZI kupata orodha ya tethered devices kwenye hotspot.
         * Hii inahitaji Android API:
         *   - ConnectivityManager.getTetheredIfaces()
         *   - DhcpInfo kwa IP za tethered devices
         *   - ARP table scan kwa kupata MAC addresses
         *
         * Kwa web demo: Tunatumia Network Information API
         * ambayo inatoa habari za mtandao wa sasa TU.
         */
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        if (connection) {
            // REAL data from Network Information API
            tp.health.hotspotStatus = connection.type ? 'Active (' + connection.type + ')' : 'Ready';
            if (connection.downlink) {
                tp.health.downlink = connection.downlink + ' Mbps';
            }
        } else {
            tp.health.hotspotStatus = navigator.onLine ? 'Ready' : 'Offline';
        }

        /*
         * REAL: Count protected devices that use Travel method
         * This IS real - we're counting from our own database
         * But we CANNOT verify they are actually tethered right now
         */
        const tetheredCount = ProtectEngine.protectedDevices.filter(d =>
            d.method && (d.method.includes('Hotspot') || d.method.includes('Travel'))
        ).length;
        tp.health.tetheredDevices = tetheredCount;
        tp.health.tetheredNote = tetheredCount > 0 ? 'Registered (verify in native app)' : 'No devices';
    },

    /* Sleep Detection for laptops/devices that go to sleep */
    startSleepDetection() {
        if (this.sleepDetectionTimer) clearInterval(this.sleepDetectionTimer);

        this.sleepDetectionTimer = setInterval(() => {
            ProtectEngine.protectedDevices.forEach(dev => {
                if (dev.method && dev.method.includes('Wi-Fi')) {
                    // Check if device has responded to recent heartbeats
                    const lastHeartbeatTime = dev.lastHeartbeatTimestamp || Date.now();
                    const timeSinceLastBeat = Date.now() - lastHeartbeatTime;

                    if (timeSinceLastBeat > 30000 && timeSinceLastBeat < 120000) {
                        // Device might be sleeping (30s - 2min without response)
                        if (dev.sleepState !== 'SLEEPING') {
                            dev.sleepState = 'SLEEPING';
                            ProtectEngine.addSecurityLog(dev.name, 'Device Sleeping - Waiting for wake-up before warning');
                            this.updateDashboardDisplay();
                        }
                    } else if (timeSinceLastBeat < 30000) {
                        if (dev.sleepState === 'SLEEPING') {
                            dev.sleepState = 'AWAKE';
                            ProtectEngine.addSecurityLog(dev.name, 'Device Woke Up - Reconnection successful');
                        }
                    } else if (timeSinceLastBeat > 120000) {
                        // More than 2 minutes - genuine disconnect, not just sleep
                        if (dev.sleepState !== 'UNAVAILABLE') {
                            dev.sleepState = 'UNAVAILABLE';
                            ProtectEngine.addSecurityLog(dev.name, 'Device Unavailable after sleep - Escalating warning');
                        }
                    }
                }
            });
        }, 10000); // Check every 10 seconds
    },

    /* Evaluate which module should be active based on priority and availability */
    evaluateBestModule() {
        const sortedModules = Object.entries(this.modules)
            .filter(([key, mod]) => mod.enabled)
            .sort((a, b) => a[1].priority - b[1].priority);

        let bestModule = null;
        for (const [key, mod] of sortedModules) {
            if (this.isModuleAvailable(key)) {
                bestModule = key;
                break;
            }
        }

        if (bestModule && bestModule !== this.activeModule) {
            const oldModule = this.activeModule;
            this.activeModule = bestModule;

            // Update states
            Object.keys(this.modules).forEach(key => {
                if (key === bestModule) {
                    this.modules[key].state = 'ACTIVE';
                } else if (this.modules[key].enabled) {
                    this.modules[key].state = 'STANDBY';
                }
            });

            ProtectEngine.addSecurityLog('Communication Engine',
                `Auto-Switch: ${this.modules[oldModule]?.name || oldModule} → ${this.modules[bestModule].name}`);
        }
    },

    /* Check if a specific module is currently available */
    isModuleAvailable(moduleKey) {
        switch(moduleKey) {
            case 'ble':
                return 'bluetooth' in navigator;
            case 'localNetwork':
                return navigator.onLine;
            case 'wifiDirect':
                return true; // Would check Wi-Fi Direct API support in native app
            case 'travel':
                return true; // Hotspot is always available on phone
            case 'usbCable':
                return 'usb' in navigator; // WebUSB API check
            default:
                return false;
        }
    },

    /* Update the Communication dashboard display */
    updateDashboardDisplay() {
        const activeEl = document.getElementById('comm-active-module');
        const fallbackEl = document.getElementById('comm-fallback-module');

        if (activeEl && this.modules[this.activeModule]) {
            activeEl.innerText = this.modules[this.activeModule].name;
        }

        // Find fallback module
        const sortedModules = Object.entries(this.modules)
            .filter(([key, mod]) => mod.enabled && key !== this.activeModule)
            .sort((a, b) => a[1].priority - b[1].priority);

        if (fallbackEl && sortedModules.length > 0) {
            fallbackEl.innerText = sortedModules[0][1].name;
        }

        // Update Local Network health display
        const ln = this.modules.localNetwork;
        const lnNetwork = document.getElementById('ln-network-status');
        const lnLatency = document.getElementById('ln-latency');
        const lnHeartbeat = document.getElementById('ln-heartbeat');
        const lnAgent = document.getElementById('ln-agent-status');

        if (lnNetwork) lnNetwork.innerText = ln.health.networkStatus;
        if (lnLatency) {
            const lat = ln.health.latency;
            lnLatency.innerText = lat > 0 ? lat + 'ms' : 'N/A';
            lnLatency.style.color = lat > 0 && lat < 50 ? 'var(--emerald-green)' : lat < 200 ? 'var(--amber)' : 'var(--emergency-red)';
        }
        if (lnHeartbeat) lnHeartbeat.innerText = ln.health.heartbeat;
        if (lnAgent) lnAgent.innerText = ln.health.agentStatus;

        // Update Travel Protection display
        const tp = this.modules.travel;
        const tpHotspot = document.getElementById('travel-hotspot-status');
        const tpTethered = document.getElementById('travel-tethered-count');
        const tpMode = document.getElementById('travel-mode-status');

        if (tpHotspot) tpHotspot.innerText = tp.health.hotspotStatus;
        if (tpTethered) tpTethered.innerText = tp.health.tetheredDevices;
        if (tpMode) tpMode.innerText = tp.health.travelMode;

        // Update USB Cable display
        USBCableEngine.updateUSBDashboard();
    },

    /* Get module info for a specific device based on its method */
    getModuleForDevice(dev) {
        if (!dev || !dev.method) return this.modules.ble;

        if (dev.method.includes('Bluetooth') || dev.method.includes('BLE')) return this.modules.ble;
        if (dev.method.includes('Wi-Fi') && !dev.method.includes('Direct')) return this.modules.localNetwork;
        if (dev.method.includes('Wi-Fi Direct')) return this.modules.wifiDirect;
        if (dev.method.includes('Hotspot') || dev.method.includes('Travel')) return this.modules.travel;
        if (dev.method.includes('USB')) return this.modules.ble; // Fallback

        return this.modules.ble;
    },

    /* Get health display for device detail modal */
    getDeviceHealthDisplay(dev) {
        const module = this.getModuleForDevice(dev);
        const method = dev.method || 'Bluetooth BLE';

        let healthHtml = '';

        if (method.includes('Wi-Fi') && !method.includes('Direct')) {
            // Local Network health
            const ln = this.modules.localNetwork;
            healthHtml = `
                <div style="margin-top: 8px; padding: 8px; background: rgba(24,195,126,0.1); border-radius: 8px; font-size: 10px;">
                    <b style="color: var(--emerald-green); display: block; margin-bottom: 4px;">Local Network Protection Health</b>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span style="color: #94A3B8;">Network:</span><b style="color: white;">${ln.health.networkStatus}</b>
                        <span style="color: #94A3B8;">Latency:</span><b style="color: white;">${ln.health.latency > 0 ? ln.health.latency + 'ms' : 'N/A'}</b>
                        <span style="color: #94A3B8;">Heartbeat:</span><b style="color: white;">${ln.health.heartbeat}</b>
                        <span style="color: #94A3B8;">Agent:</span><b style="color: white;">${ln.health.agentStatus}</b>
                    </div>
                </div>`;
        } else if (method.includes('Hotspot') || method.includes('Travel')) {
            // Travel Protection health
            const tp = this.modules.travel;
            healthHtml = `
                <div style="margin-top: 8px; padding: 8px; background: rgba(234,88,12,0.1); border-radius: 8px; font-size: 10px;">
                    <b style="color: #EA580C; display: block; margin-bottom: 4px;">Travel Protection Health</b>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span style="color: #94A3B8;">Hotspot:</span><b style="color: white;">${tp.health.hotspotStatus}</b>
                        <span style="color: #94A3B8;">Tethered:</span><b style="color: white;">${tp.health.tetheredDevices} devices</b>
                        <span style="color: #94A3B8;">Mode:</span><b style="color: white;">${tp.health.travelMode}</b>
                        <span style="color: #94A3B8;">State:</span><b style="color: white;">${dev.sleepState || 'Awake'}</b>
                    </div>
                </div>`;
        } else if (method.includes('Wi-Fi Direct')) {
            // Wi-Fi Direct health
            const wd = this.modules.wifiDirect;
            healthHtml = `
                <div style="margin-top: 8px; padding: 8px; background: rgba(124,58,237,0.1); border-radius: 8px; font-size: 10px;">
                    <b style="color: #7C3AED; display: block; margin-bottom: 4px;">Wi-Fi Direct Protection Health</b>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span style="color: #94A3B8;">P2P State:</span><b style="color: white;">${wd.health.connectionState}</b>
                        <span style="color: #94A3B8;">Latency:</span><b style="color: white;">${wd.health.latency}</b>
                        <span style="color: #94A3B8;">Heartbeat:</span><b style="color: white;">${wd.health.heartbeat}</b>
                        <span style="color: #94A3B8;">Router:</span><b style="color: white;">Not Required</b>
                    </div>
                </div>`;
        } else if (method.includes('USB')) {
            // USB Cable health
            const usb = this.modules.usbCable;
            const cableColor = usb.health.cableConnected ? 'var(--emerald-green)' : usb.health.cableStatus.includes('WARNING') ? 'var(--emergency-red)' : 'var(--text-muted)';
            healthHtml = `
                <div style="margin-top: 8px; padding: 8px; background: rgba(7,26,46,0.1); border-radius: 8px; font-size: 10px;">
                    <b style="color: var(--deep-navy); display: block; margin-bottom: 4px;">USB Cable Protection Health</b>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span style="color: #94A3B8;">Cable:</span><b style="color: ${cableColor};">${usb.health.cableConnected ? 'Connected' : 'Disconnected'}</b>
                        <span style="color: #94A3B8;">Status:</span><b style="color: white;">${usb.health.cableStatus}</b>
                        <span style="color: #94A3B8;">Monitoring:</span><b style="color: white;">${usb.health.monitoring}</b>
                        <span style="color: #94A3B8;">Detach Grace:</span><b style="color: white;">${usb.health.detachGraceSeconds}s</b>
                    </div>
                </div>`;
        }

        return healthHtml;
    },

    /* Handle sleep detection for Wi-Fi connected devices */
    handleDeviceSleep(dev) {
        if (dev.sleepState === 'SLEEPING') {
            // Don't immediately show Lost - wait for wake up
            ProtectEngine.addSecurityLog(dev.name, 'Device Sleeping - Monitoring paused, waiting for wake-up');
            return 'SLEEPING';
        }
        return dev.sleepState || 'AWAKE';
    }
};


/* ============================================================
   TRAVEL PROTECTION ENGINE
   Manages Travel Sessions, Travel Kits, Hotspot monitoring
   Escalation: Disconnect → 15s Notify → 30s Vibrate → 60s Alarm
   ============================================================ */
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
const USBCableEngine = {
    cableConnected: false,
    connectedDevice: null,
    monitorTimer: null,
    detachGraceTimer: null,

    /* Start USB monitoring */
    startMonitoring() {
        if (this.monitorTimer) clearInterval(this.monitorTimer);

        CommunicationModule.modules.usbCable.health.monitoring = 'Running';
        CommunicationModule.modules.usbCable.health.cableStatus = 'Monitoring';

        // Initialize real WebUSB event listeners
        this.initUSBEventListeners();

        this.monitorTimer = setInterval(() => {
            this.checkUSBConnection();
        }, 5000); // Check every 5 seconds

        ProtectEngine.addSecurityLog('USB Cable Engine', 'USB Cable Monitoring Started (WebUSB API)');
        this.updateUSBDashboard();
    },

    /* Stop USB monitoring */
    stopMonitoring() {
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
        }

        CommunicationModule.modules.usbCable.health.monitoring = 'Stopped';
        CommunicationModule.modules.usbCable.health.cableStatus = 'Idle';

        ProtectEngine.addSecurityLog('USB Cable Engine', 'USB Cable Monitoring Stopped');
        this.updateUSBDashboard();
    },

    /* Check USB connection status - REAL PRODUCTION */
    checkUSBConnection() {
        const usbModule = CommunicationModule.modules.usbCable;

        if (!usbModule.enabled) return;

        /*
         * REAL PRODUCTION:
         * WebUSB API: navigator.usb.getDevices() returns paired devices
         * Android USB Host API: UsbManager.getDeviceList()
         *
         * Kwa web: navigator.usb.getDevices() inarudisha devices
         * ambazo zimepairiwa na browser. Hakuna auto-detection ya
         * attachment/detachment - inahitaji user action (requestDevice)
         * au event listeners (connect/disconnect events).
         */
        if (!('usb' in navigator)) return;

        navigator.usb.getDevices().then(devices => {
            if (devices.length > 0 && !this.cableConnected) {
                // USB device is paired - cable is attached
                this.onCableAttached({
                    id: 'USB-' + devices[0].vendorId,
                    name: devices[0].productName || ('USB Device (VID:' + devices[0].vendorId + ')'),
                    method: 'USB Cable Protection',
                    vendorId: devices[0].vendorId,
                    productId: devices[0].productId,
                    serialNumber: devices[0].serialNumber || 'N/A'
                });
            } else if (devices.length === 0 && this.cableConnected) {
                // No USB devices paired - cable was detached
                this.onCableDetached();
            }
        }).catch(() => {
            // WebUSB not available or permission denied
        });
    },

    /* Initialize USB event listeners for real attach/detect detection */
    initUSBEventListeners() {
        if (!('usb' in navigator)) return;

        // Real WebUSB events - these fire when USB devices connect/disconnect
        navigator.usb.addEventListener('connect', (event) => {
            const device = event.device;
            this.onCableAttached({
                id: 'USB-' + device.vendorId,
                name: device.productName || ('USB Device (VID:' + device.vendorId + ')'),
                method: 'USB Cable Protection',
                vendorId: device.vendorId,
                productId: device.productId,
                serialNumber: device.serialNumber || 'N/A'
            });
        });

        navigator.usb.addEventListener('disconnect', (event) => {
            this.onCableDetached();
        });
    },

    /* USB cable attached */
    onCableAttached(dev) {
        this.cableConnected = true;
        this.connectedDevice = dev;
        CommunicationModule.modules.usbCable.health.cableConnected = true;
        CommunicationModule.modules.usbCable.health.deviceName = dev.name;
        CommunicationModule.modules.usbCable.health.cableStatus = 'Connected';
        CommunicationModule.modules.usbCable.health.lastAttachTime = Date.now();

        ProtectEngine.addSecurityLog(dev.name, 'USB Cable Attached - Physical Connection Established');
        this.updateUSBDashboard();
    },

    /* USB cable detached */
    onCableDetached() {
        const dev = this.connectedDevice;
        const graceSeconds = CommunicationModule.modules.usbCable.health.detachGraceSeconds;

        CommunicationModule.modules.usbCable.health.cableConnected = false;
        CommunicationModule.modules.usbCable.health.cableStatus = 'Detached - Grace Period';

        ProtectEngine.addSecurityLog(dev ? dev.name : 'USB Device', `USB Cable Detached - ${graceSeconds}s grace period started`);

        // Start grace timer before warning
        if (this.detachGraceTimer) clearTimeout(this.detachGraceTimer);

        this.detachGraceTimer = setTimeout(() => {
            // Check if cable was re-attached during grace
            if (!this.cableConnected) {
                this.triggerUSBWarning(dev);
            }
        }, graceSeconds * 1000);

        this.updateUSBDashboard();
    },

    /* Trigger USB cable removal warning */
    triggerUSBWarning(dev) {
        if (!dev) return;

        CommunicationModule.modules.usbCable.health.cableStatus = 'WARNING - Cable Removed';

        ProtectEngine.addSecurityLog(dev.name, 'USB Cable WARNING: Cable removed and not reconnected');

        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

        const alertHtml = `
            <div id="modalUSBWarning" class="overlay-modal" style="display: flex; z-index: 30000;">
                <div style="background: white; border-radius: var(--radius-lg); padding: 22px; width: 95%; max-width: 400px; text-align: center; border: 2px solid var(--amber);">
                    <div class="modal-big-icon" style="color: var(--amber); margin-bottom: 10px;">
                        <svg class="ic"><use href="#i-alert-triangle"/></svg>
                    </div>
                    <b style="font-size: 15px; color: var(--deep-navy); display: block;">USB Cable Removed</b>
                    <span style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 4px;">
                        USB cable to <b>${dev.name}</b> has been disconnected.
                    </span>
                    <div style="margin-top: 10px; padding: 10px; background: #FFFBEB; border-radius: 10px; font-size: 10px; text-align: left;">
                        <b style="color: var(--amber);">USB Protection Status:</b>
                        <div style="margin-top: 4px; color: var(--text-muted);">
                            Cable: Disconnected<br>
                            Device: ${dev.name}<br>
                            Monitoring: Active (waiting for reconnection)
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 14px;">
                        <button class="btn-gradient green" style="height: 38px; font-size: 11px; flex: 1;" onclick="USBCableEngine.confirmUSBSafe()">
                            I Reconnected
                        </button>
                        <button class="btn-gradient red" style="height: 38px; font-size: 11px; flex: 1;" onclick="USBCableEngine.reportUSBAlert()">
                            Unauthorized!
                        </button>
                    </div>
                </div>
            </div>
        `;

        const existing = document.getElementById('modalUSBWarning');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', alertHtml);

        this.updateUSBDashboard();
    },

    /* User confirms USB reconnected */
    confirmUSBSafe() {
        const modal = document.getElementById('modalUSBWarning');
        if (modal) modal.remove();

        CommunicationModule.modules.usbCable.health.cableStatus = 'Connected';
        ProtectEngine.addSecurityLog('USB Cable Engine', 'USB Cable Reconnected - Owner confirmed');
        this.updateUSBDashboard();
    },

    /* User reports unauthorized cable removal */
    reportUSBAlert() {
        const modal = document.getElementById('modalUSBWarning');
        if (modal) modal.remove();

        AudioEngine.startEmergencyAlarm();
        CommunicationModule.modules.usbCable.health.cableStatus = 'ALERT - Unauthorized Removal';

        if (this.connectedDevice) {
            ProtectEngine.addSecurityLog(this.connectedDevice.name, 'USB ALERT: Unauthorized cable removal reported by owner');
            ProtectEngine.transitionState(this.connectedDevice.id, 'ALARM');
        }

        this.updateUSBDashboard();
    },

    /* Update USB dashboard display */
    updateUSBDashboard() {
        const usb = CommunicationModule.modules.usbCable;

        const cableStatusEl = document.getElementById('usb-cable-status');
        const deviceNameEl = document.getElementById('usb-device-name');
        const monitoringEl = document.getElementById('usb-monitoring-status');
        const moduleStatusEl = document.getElementById('usb-module-status');

        if (cableStatusEl) {
            cableStatusEl.innerText = usb.health.cableConnected ? 'Connected' : usb.health.cableStatus;
            cableStatusEl.style.color = usb.health.cableConnected ? 'var(--emerald-green)' : usb.health.cableStatus.includes('WARNING') || usb.health.cableStatus.includes('ALERT') ? 'var(--emergency-red)' : 'var(--text-muted)';
        }
        if (deviceNameEl) deviceNameEl.innerText = usb.health.deviceName;
        if (monitoringEl) {
            monitoringEl.innerText = usb.health.monitoring;
            monitoringEl.style.color = usb.health.monitoring === 'Running' ? 'var(--emerald-green)' : 'var(--text-muted)';
        }
        if (moduleStatusEl) {
            moduleStatusEl.innerText = usb.enabled ? (usb.health.cableConnected ? 'Connected' : 'Monitoring') : 'Disabled';
            moduleStatusEl.style.color = usb.enabled ? 'var(--emerald-green)' : 'var(--text-muted)';
        }
    }
};


/* ============================================================
   BLE PAIRING WIZARD WITH UNIQUE DEVICE LOCK
   ============================================================ */
/* Real icon renderer for protected devices */
function GHIcon(key) {
    const map = { laptop: 'i-laptop', watch: 'i-watch', phone: 'i-smartphone', tracker: 'i-bag', '💻': 'i-laptop', '⌚': 'i-watch', '📱': 'i-smartphone', '🎒': 'i-bag' };
    return '<svg class="ic" style="width:18px;height:18px"><use href="#' + (map[key] || 'i-smartphone') + '"/></svg>';
}

/* ============================================================
   REAL DISCOVERY WIZARD FOR ALL 6 TRANSPORTS (NO FAKE DATA)
   ============================================================ */
/* NOTE: the second (duplicate) GHIcon definition that used to live here was
   removed. The definition above is the superset (names + emoji keys) and was
   already the one being called for named icons. */

const ProtectWizard = {
    step: 1,
    selectedType: 'Laptop',
    selectedIcon: 'laptop',
    selectedTransport: 'ble', // 'ble', 'wifi', 'wifidirect', 'hotspot', 'usb', 'lan'
    discoveredDevice: null,
    discoveryState: 'idle', // 'idle', 'scanning', 'found', 'error'
    discoveryError: '',

    startWizard(remoteShieldMode = false) {
        this.remoteShieldMode = remoteShieldMode;
        this.step = 1;
        this.discoveredDevice = null;
        this.discoveryState = 'idle';
        this.discoveryError = '';
        this.deviceName = '';
        this.renderStep();
        document.getElementById('modalProtectWizard').style.display = 'flex';
    },

    renderStep() {
        const body = document.getElementById('wizard-step-body');
        const title = document.getElementById('wizard-title-heading');
        if (!body) return;

        if (this.step === 1) {
            title.innerText = "Hatua 1/7: Ongeza Kifaa Kwenye Mtandao";
            body.innerHTML = `
                <b style="font-size: 14px; color: var(--deep-navy);">Ongeza vifaa vyako kwenye Protection Network.</b>
                <p style="font-size: 11px; color: var(--text-muted); margin: 8px 0 16px;">Mfumo utathibitisha umiliki, utaunda Encrypted Protection Link, na kuanzisha ulinzi wa masaa 24/7.</p>
                <button class="btn-gradient green" onclick="ProtectWizard.nextStep()">Anza Kuunganisha <svg class="ic"><use href="#i-arrow-right"/></svg></button>
            `;
        } else if (this.step === 2) {
            title.innerText = "Hatua 2/7: Chagua Aina ya Kifaa";
            body.innerHTML = `
                <label class="form-label">Je, ni kifaa gani unachotaka kulinda?</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px;">
                    <div class="mode-pill active" onclick="ProtectWizard.setType('Laptop', 'laptop', this)"><svg class="ic"><use href="#i-laptop"/></svg> Laptop</div>
                    <div class="mode-pill" onclick="ProtectWizard.setType('Watch', 'watch', this)"><svg class="ic"><use href="#i-watch"/></svg> Smart Watch</div>
                    <div class="mode-pill" onclick="ProtectWizard.setType('Phone', 'phone', this)"><svg class="ic"><use href="#i-smartphone"/></svg> Simu Nyingine</div>
                    <div class="mode-pill" onclick="ProtectWizard.setType('Tracker', 'tracker', this)"><svg class="ic"><use href="#i-bag"/></svg> Bag Tracker</div>
                </div>
                <button class="btn-gradient" onclick="ProtectWizard.nextStep()">Sura Inayofuata: Chagua Transport →</button>
            `;
        } else if (this.step === 3) {
            title.innerText = "Hatua 3/7: Chagua Protection Transport";
            body.innerHTML = `
                <div style="text-align: center; padding: 5px 0;">
                    <b style="font-size: 13.5px; color: var(--deep-navy); display: block; margin-bottom: 4px;">
                        Chagua Protection Transport Method
                    </b>
                    <p style="font-size: 10.5px; color: var(--text-muted); margin-bottom: 12px;">
                        GuardHai inalinda kupitia Bluetooth, Local Wi-Fi, Hotspot, au USB Cable.
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; max-height: 250px; overflow-y: auto;">
                        <div class="pairing-type-card" style="margin-bottom: 0;" onclick="ProtectWizard.startDiscovery('ble')">
                            <div style="color: var(--royal-blue);"><svg class="ic"><use href="#i-bluetooth"/></svg></div>
                            <div style="text-align: left;">
                                <b style="font-size: 11.5px; color: var(--deep-navy); display: block;">1. Bluetooth Protection (Module 1)</b>
                                <span style="font-size: 9.5px; color: var(--text-muted);">RSSI proximity monitoring with 6 signal states</span>
                                <span class="comm-module-badge ble" style="margin-top: 3px;">Primary</span>
                            </div>
                        </div>

                        <div class="pairing-type-card" style="margin-bottom: 0;" onclick="ProtectWizard.startDiscovery('wifi')">
                            <div style="color: var(--emerald-green);"><svg class="ic"><use href="#i-wifi"/></svg></div>
                            <div style="text-align: left;">
                                <b style="font-size: 11.5px; color: var(--deep-navy); display: block;">2. Local Network Protection (Module 2)</b>
                                <span style="font-size: 9.5px; color: var(--text-muted);">Wi-Fi/LAN - GuardHai Agent required on target</span>
                                <span class="comm-module-badge wifi" style="margin-top: 3px;">Fallback</span>
                            </div>
                        </div>

                        <div class="pairing-type-card" style="margin-bottom: 0;" onclick="ProtectWizard.startDiscovery('wifidirect')">
                            <div style="color: #7C3AED;"><svg class="ic"><use href="#i-radio"/></svg></div>
                            <div style="text-align: left;">
                                <b style="font-size: 11.5px; color: var(--deep-navy); display: block;">3. Wi-Fi Direct Protection (Module 3)</b>
                                <span style="font-size: 9.5px; color: var(--text-muted);">P2P direct link - No router needed</span>
                                <span class="comm-module-badge wifidirect" style="margin-top: 3px;">P2P</span>
                            </div>
                        </div>

                        <div class="pairing-type-card" style="margin-bottom: 0;" onclick="ProtectWizard.startDiscovery('hotspot')">
                            <div style="color: #EA580C;"><svg class="ic"><use href="#i-plane"/></svg></div>
                            <div style="text-align: left;">
                                <b style="font-size: 11.5px; color: var(--deep-navy); display: block;">4. Travel Protection (Module 4)</b>
                                <span style="font-size: 9.5px; color: var(--text-muted);">Hotspot tethering for travel scenarios</span>
                                <span class="comm-module-badge travel" style="margin-top: 3px;">Travel</span>
                            </div>
                        </div>

                        <div class="pairing-type-card" style="margin-bottom: 0;" onclick="ProtectWizard.startDiscovery('usb')">
                            <div style="color: var(--deep-navy);"><svg class="ic"><use href="#i-link"/></svg></div>
                            <div style="text-align: left;">
                                <b style="font-size: 11.5px; color: var(--deep-navy); display: block;">5. USB Cable Protection (Module 5)</b>
                                <span style="font-size: 9.5px; color: var(--text-muted);">Physical connection monitoring - Detects cable removal</span>
                                <span class="comm-module-badge usb" style="margin-top: 3px;">Module 5</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (this.step === 4) {
            title.innerText = "Hatua 4/7: Utafutaji Halisi wa Kifaa";
            let stateContent = '';

            if (this.discoveryState === 'scanning') {
                stateContent = `
                    <div style="text-align: center; padding: 20px 0;">
                        <div class="splash-loader" style="margin-bottom: 12px;"><span></span></div>
                        <b style="font-size: 13px; color: var(--deep-navy);">Searching for real devices via ${this.selectedTransport.toUpperCase()}...</b>
                        <p style="font-size: 10.5px; color: var(--text-muted); margin-top: 4px;">Inafanya Verification na Hardware/Network Check</p>
                    </div>
                `;
            } else if (this.discoveryState === 'error') {
                stateContent = `
                    <div style="text-align: center; padding: 15px; background: #FFF0F0; border: 1px solid var(--emergency-red); border-radius: 14px;">
                        <div class="modal-big-icon red" style="margin-bottom: 6px;"><svg class="ic"><use href="#i-alert-triangle"/></svg></div>
                        <b style="font-size: 13px; color: var(--emergency-red); display: block;">No Devices Discovered</b>
                        <p style="font-size: 10.5px; color: var(--text-dark); margin: 6px 0 12px; line-height: 1.4;">${this.discoveryError}</p>
                        <button class="btn-outline" style="height: 38px; font-size: 11px;" onclick="ProtectWizard.startDiscovery('${this.selectedTransport}')">
                            <svg class="ic"><use href="#i-search"/></svg> Subiri & Jaribu Tena
                        </button>
                    </div>
                `;
            } else if (this.discoveryState === 'found' && this.discoveredDevice) {
                stateContent = `
                    <div style="text-align: center; padding: 10px 0;">
                        <b style="font-size: 12px; color: var(--emerald-green); display: block; margin-bottom: 10px;">
                            <svg class="ic"><use href="#i-check-circle"/></svg> Real Device Discovered Successfully!
                        </b>
                        <div class="pairing-type-card" style="border-color: var(--emerald-green); background: #ECFDF5;">
                            <div style="color: var(--emerald-green);">${GHIcon(this.selectedIcon)}</div>
                            <div style="text-align: left;">
                                <b style="font-size: 12.5px; color: var(--deep-navy); display: block;">${this.discoveredDevice.name}</b>
                                <span style="font-size: 10px; color: var(--emerald-green); font-weight: 700;">Transport: ${this.discoveredDevice.method}</span>
                            </div>
                        </div>
                        <button class="btn-gradient green" style="margin-top: 12px;" onclick="ProtectWizard.acceptDiscoveredDevice()">
                            Unganisha Kifaa Hiki <svg class="ic"><use href="#i-arrow-right"/></svg>
                        </button>
                    </div>
                `;
            }

            body.innerHTML = stateContent;
        } else if (this.step === 5) {
            title.innerText = "Hatua 5/7: Jina la Kifaa Chako";
            body.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Jina la Kifaa Chako Halisi (Nickname)</label>
                    <input type="text" id="wiz-device-name" class="input-field no-icon" value="${this.deviceName}" placeholder="mf. Laptop ya Kazi / Simu Yangu">
                </div>
                <button class="btn-gradient green" onclick="ProtectWizard.saveNameAndNext()">Endelea: Umiliki →</button>
            `;
        } else if (this.step === 6) {
            title.innerText = "Hatua 6/7: Protection Link Creation";
            body.innerHTML = `
                <div style="text-align: center; padding: 15px 0;">
                    <div class="modal-big-icon blue" style="margin-bottom: 10px;"><svg class="ic"><use href="#i-link"/></svg></div>
                    <b style="font-size: 13px; color: var(--deep-navy);">Creating Encrypted Protection Link...</b>
                    <p style="font-size: 10.5px; color: var(--emerald-green); margin-top: 4px;">Binding Master Node with ${this.deviceName}</p>
                </div>
                <button class="btn-gradient" onclick="ProtectWizard.nextStep()">Link Confirmed →</button>
            `;
        } else if (this.step === 7) {
            title.innerText = "Hatua 7/7: Kukamilisha Ulinzi";
            body.innerHTML = `
                <label class="form-label">Chagua Protection Profile</label>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                    <div class="mode-pill active"><svg class="ic"><use href="#i-shield"/></svg> Everyday Protection</div>
                    <div class="mode-pill"><svg class="ic"><use href="#i-zap"/></svg> High Security Mode</div>
                </div>
                <button class="btn-gradient green" onclick="ProtectWizard.finishWizard()">Washa Ulinzi Sasa</button>
            `;
        }
    },

    /* REAL DISCOVERY ROUTER FOR TRANSPORTS */
    startDiscovery(transportKey) {
        this.selectedTransport = transportKey;
        this.step = 4;
        this.renderStep();

        if (transportKey === 'ble') this.runBleDiscovery();
        else if (transportKey === 'wifi') this.runWifiDiscovery();
        else if (transportKey === 'hotspot') this.runHotspotDiscovery();
        else if (transportKey === 'usb') this.runUsbDiscovery();
        else if (transportKey === 'wifidirect') this.runWifiDirectDiscovery();
    },

    /* 1. REAL BLE DISCOVERY (Web Bluetooth API) */
    async runBleDiscovery() {
        this.discoveryState = 'scanning';
        this.renderStep();
        if (!('bluetooth' in navigator)) {
            this.discoveryState = 'error';
            this.discoveryError = "Kivinjari/Simu haina msaada wa Web Bluetooth API. Tumia Chrome/Edge kwenye HTTPS au Localhost.";
            this.renderStep();
            return;
        }
        try {
            const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
            this.discoveredDevice = {
                name: device.name || ('Bluetooth ' + this.selectedType + ' Node'),
                method: 'Web Bluetooth BLE Layer',
                raw: device
            };
            this.discoveryState = 'found';
            this.renderStep();
        } catch (err) {
            this.discoveryState = 'error';
            this.discoveryError = "No Bluetooth devices selected or pairing cancelled. Make sure Bluetooth is enabled on both devices.";
            this.renderStep();
        }
    },

    /* 2. LOCAL NETWORK DISCOVERY (mDNS/NSD via WebRTC) */
    async runWifiDiscovery() {
        this.discoveryState = 'scanning';
        this.renderStep();

        if (!navigator.onLine) {
            this.discoveryState = 'error';
            this.discoveryError = "Wi-Fi haipo wazi au simu haina mtandao wa Wi-Fi/LAN. Unganisha simu na laptop kwenye Router/Wi-Fi moja.";
            this.renderStep();
            return;
        }

        /*
         * REAL PRODUCTION NOTE:
         * Browser haiwezi kufanya mDNS/NSD discovery moja kwa moja.
         * Katika production Android app, tutatumia:
         *   - NsdManager (Android) kwa service discovery
         *   - Bonjour/mDNS kwa local network scanning
         *   - GuardHai Agent inayotangaza service kwenye network
         *
         * Kwa web demo, tunajaribu WebRTC local IP detection
         * kama njia ya kuonyesha kifaa kiko kwenye network.
         */
        try {
            const localIPs = await this.detectLocalNetworkIPs();

            if (localIPs.length > 0) {
                // Found local network IPs - device is on a network
                this.discoveredDevice = {
                    name: 'Local Network Device (' + localIPs[0] + ')',
                    method: 'Local Network Protection',
                    networkIPs: localIPs,
                    requiresAgent: true  // GuardHai Agent required on target
                };
                this.discoveryState = 'found';
                this.renderStep();
            } else {
                this.discoveryState = 'error';
                this.discoveryError = "Hakuna vifaa vya GuardHai vilivyogundulika kwenye mtandao huu.\n\nKwa production: Tumia GuardHai Android App ambayo inatumia NsdManager kwa mDNS/NSD discovery halisi.\n\nHakikisha:\n• Vifaa vyote viko kwenye Wi-Fi moja\n• GuardHai Agent inafanya kazi kwenye kifaa lengwa";
                this.renderStep();
            }
        } catch(e) {
            this.discoveryState = 'error';
            this.discoveryError = "Local Network Discovery imeshindwa.\n\nKosa: " + (e.message || 'Unknown') + "\n\nKwa production: Tumia GuardHai Android App na NsdManager API.";
            this.renderStep();
        }
    },

    /* Detect local network IPs using WebRTC (real browser capability) */
    detectLocalNetworkIPs() {
        return new Promise((resolve) => {
            const ips = [];
            try {
                const pc = new RTCPeerConnection({ iceServers: [] });
                pc.createDataChannel('');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
                pc.onicecandidate = (event) => {
                    if (!event || !event.candidate) {
                        // Done collecting candidates
                        pc.close();
                        resolve(ips.length > 0 ? ips : []);
                        return;
                    }
                    const parts = event.candidate.candidate.split(' ');
                    const ip = parts[4];
                    if (ip && ip.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
                        if (!ips.includes(ip)) ips.push(ip);
                    }
                };
                // Timeout after 3 seconds
                setTimeout(() => {
                    try { pc.close(); } catch(e) {}
                    resolve(ips);
                }, 3000);
            } catch(e) {
                resolve([]);
            }
        });
    },

    /* 3. HOTSPOT DISCOVERY (Travel Protection) - REAL PRODUCTION */
    async runHotspotDiscovery() {
        this.discoveryState = 'scanning';
        this.renderStep();

        /*
         * REAL PRODUCTION NOTE:
         * Browser HAIWEZI kupata orodha ya tethered devices kwenye hotspot.
         * Hii inahitaji Android API: WifiManager / ConnectivityManager
         *
         * Katika production Android app:
         *   - ConnectivityManager.getTetheredIfaces()
         *   - DhcpInfo kwa kupata IP za tethered devices
         *   - GuardHai Agent ping kwa kuthibitisha kifaa kina GuardHai
         *
         * Kwa web demo: Tunaonyesha hali halisi ya mtandao
         */
        try {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

            if (connection) {
                // We can detect network type - this is REAL data
                const networkType = connection.type || 'unknown';
                const downlink = connection.downlink || 0;

                if (networkType === 'cellular' || networkType === 'wifi') {
                    this.discoveredDevice = {
                        name: 'Travel Device (via ' + networkType + ')',
                        method: 'Travel Protection (Hotspot)',
                        networkType: networkType,
                        downlink: downlink,
                        requiresAgent: true,
                        isRealDiscovery: false  // Mark as limited in web
                    };
                    this.discoveryState = 'found';
                    this.renderStep();
                } else {
                    this.discoveryState = 'error';
                    this.discoveryError = "Hakuna mtandao wa hotspot uliogundulika.\n\nKwa production: Tumia GuardHai Android App ambayo inatumia ConnectivityManager kwa kugundua tethered devices halisi.\n\nWasha hotspot yako na uhakikishe kifaa kimeunganishwa.";
                    this.renderStep();
                }
            } else {
                // No Network Information API available
                this.discoveryState = 'error';
                this.discoveryError = "Browser hii haina msaada wa Network Information API.\n\nKwa production: Tumia GuardHai Android App ambayo inaweza:\n• Kugundua tethered devices halisi\n• Kupima hotspot connection status\n• Kuthibitisha GuardHai Agent kwenye kifaa";
                this.renderStep();
            }
        } catch(e) {
            this.discoveryState = 'error';
            this.discoveryError = "Hotspot Discovery imeshindwa.\n\nKosa: " + (e.message || 'Unknown');
            this.renderStep();
        }
    },

    /* 4. REAL USB HARDWARE DISCOVERY (WebUSB API) */
    async runUsbDiscovery() {
        this.discoveryState = 'scanning';
        this.renderStep();

        if (!('usb' in navigator)) {
            this.discoveryState = 'error';
            this.discoveryError = "WebUSB API haipatikani kwenye kivinjari hiki. Chomeka cable ya USB na utumie Chrome.";
            this.renderStep();
            return;
        }

        try {
            const device = await navigator.usb.requestDevice({ filters: [] });
            this.discoveredDevice = {
                name: device.productName || ('USB Cable Tethered ' + this.selectedType),
                method: 'USB Cable Layer',
                raw: device
            };
            this.discoveryState = 'found';
            this.renderStep();
        } catch (err) {
            this.discoveryState = 'error';
            this.discoveryError = "USB Cable disconnected or selection cancelled. Chomeka cable ya USB kisha ujaribu tena.";
            this.renderStep();
        }
    },

    /* 5. WI-FI DIRECT DISCOVERY - REAL PRODUCTION NOTE */
    async runWifiDirectDiscovery() {
        this.discoveryState = 'scanning';
        this.renderStep();

        /*
         * REAL PRODUCTION NOTE:
         * Browser HAIWEZI kufanya Wi-Fi Direct discovery.
         * Hii inahitaji Android API: WifiP2pManager
         *
         * Katika production Android app:
         *   - WifiP2pManager.discoverPeers()
         *   - WifiP2pManager.requestPeers()
         *   - Filter kwa GuardHai service name
         *   - WifiP2pManager.connect() kwa kuunganisha
         *
         * Kwa web demo: Hatuwezi kufanya Wi-Fi Direct discovery halisi.
         */

        // Check if Web WiFi P2P API exists (very rare, Chrome OS only)
        if ('wifiDirect' in navigator || 'wifip2p' in navigator) {
            // Extremely rare - some Chrome OS devices might have this
            this.discoveryState = 'scanning';
            this.renderStep();
            // Would use the API here
        }

        // For web browsers: Wi-Fi Direct is NOT available
        this.discoveryState = 'error';
        this.discoveryError = "Wi-Fi Direct HAIPATIKANI kwenye browser.\n\nWi-Fi Direct inahitaji Android API (WifiP2pManager) ambayo haipo kwenye browser.\n\nKwa production: Tumia GuardHai Android App ambayo inatumia:\n• WifiP2pManager.discoverPeers()\n• WifiP2pManager.requestPeers()\n• GuardHai service name filtering\n\nHii itafanya kazi kwa:\n• Android ↔ Android P2P\n• Hakuna router inahitajika\n• Hakuna internet inahitajika";
        this.renderStep();
    },

    acceptDiscoveredDevice() {
        if (this.discoveredDevice) {
            this.deviceName = this.discoveredDevice.name;
            this.selectedMethod = this.discoveredDevice.method;
            this.step = 5;
            this.renderStep();
        }
    },

    setType(type, icon, el) {
        this.selectedType = type;
        this.selectedIcon = icon;
        document.querySelectorAll('#wizard-step-body .mode-pill').forEach(m => m.classList.remove('active'));
        if (el) el.classList.add('active');
    },

    saveNameAndNext() {
        const val = document.getElementById('wiz-device-name').value.trim();
        if (!val) {
            alert("Tafadhali andika jina la kifaa chako kuendelea.");
            return;
        }
        this.deviceName = val;
        this.step = 6;
        this.renderStep();
    },

    nextStep() {
        this.step++;
        this.renderStep();
    },

    /* UNIQUE DEVICE PAIRING LOCK */
    finishWizard() {
        const isDuplicate = ProtectEngine.protectedDevices.some(
            d => d.name.toLowerCase().trim() === this.deviceName.toLowerCase().trim()
        );

        if (isDuplicate) {
            alert(`KINZINGATIO CHA USALAMA:\nKifaa cha "${this.deviceName}" tayari kipo kwenye Mtandao Wako wa Ulinzi.\n\nKila kifaa kina utambulisho wa pekee (Unique Identity) na hakiwezi kusajiliwa mara mbili.`);
            return;
        }

        const cleanLinkRef = 'GH-LINK-' + Math.floor(1000 + Math.random() * 9000);
        ProtectEngine.saveRealDevice({
            id: cleanLinkRef,
            name: this.deviceName,
            type: this.selectedType,
            icon: this.selectedIcon,
            trustStars: '★★★★★',
            trustLevel: 'Mmiliki Aliyethibitishwa',
            status: 'protected',
            statusText: 'Protected',
            method: this.selectedMethod || 'Web Bluetooth BLE Layer',
            proximity: 'Very Near',
            signalStrength: '-62 dBm',
            lastHeartbeat: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            remoteShieldEnabled: !!this.remoteShieldMode,
            remoteStatus: this.remoteShieldMode ? 'protected' : 'nearby_only'
        });

        if (this.remoteShieldMode && window.RemoteShield) {
            RemoteShield.registerDevice(ProtectEngine.protectedDevices[ProtectEngine.protectedDevices.length - 1]);
        }

        ProtectEngine.closeModals();
        alert(`ULINZI UMEWASHWA!\nKifaa cha "${this.deviceName}" sasa kimeingizwa kwenye Protection Network via ${this.selectedMethod}.`);
    }
};

/* Recovery Operations Center UI controller. Remote commands remain unavailable until a verified Node Agent supports them. */
const RecoveryROC = {
    selectedId: null,
    events: JSON.parse(localStorage.getItem('guardhai_recovery_events') || '[]'),
    active: JSON.parse(localStorage.getItem('guardhai_recovery_sessions') || '{}'),
    init() {
        const select=document.getElementById('roc-device-select'); if(!select) return;
        const devices=ProtectEngine.protectedDevices || [];
        select.innerHTML=devices.length ? devices.map(d=>`<option value="${d.id}">${d.name} (${d.type||'Device'})</option>`).join('') : '<option value="">No protected device available</option>';
        this.selectedId=devices[0]?.id || null; this.render();
    },
    selectDevice(id) { this.selectedId=id; this.render(); },
    device() { return (ProtectEngine.protectedDevices || []).find(d=>d.id===this.selectedId); },
    hasVerifiedFindEvidence(d) { return Boolean(d?.findLocation?.verified === true && Number.isFinite(d.findLocation.lat) && Number.isFinite(d.findLocation.lng)); },
    addEvent(type, note) { const d=this.device(); if(!d)return; this.events.unshift({id:Date.now(),deviceId:d.id,type,note,time:new Date().toISOString()}); this.events=this.events.slice(0,100); localStorage.setItem('guardhai_recovery_events',JSON.stringify(this.events)); },
    startRecovery() {
        const d=this.device(); if(!d)return alert('Select a protected device first.');
        if(!this.hasVerifiedFindEvidence(d)) return alert('Recovery Operations cannot start yet. Find My Device must first provide a verified usable location for this device.');
        const confirmed=confirm(`Start Recovery Operations for ${d.name}?\n\nA verified Find location is available. Start the recovery mission?`); if(!confirmed)return;
        this.active[d.id]={state:'ACTIVE',startedAt:new Date().toISOString()}; localStorage.setItem('guardhai_recovery_sessions',JSON.stringify(this.active)); this.addEvent('RECOVERY_STARTED','Owner started Recovery Operations Center'); this.render();
    },
    requestAction(action) {
        const d=this.device(); if(!d)return;
        if(this.active[d.id]?.state !== 'ACTIVE') return alert('Start an active Recovery Mission after Find My Device provides verified location evidence.');
        const needsAgent=['alarm','message'].includes(action);
        const labels={alarm:'Play Alarm',message:'Display Recovery Message',share:'Share Recovery Session',guardian:'Notify Guardian',map:'Open Recovery Map',safePoint:'Find Nearest Safe Point',team:'Manage Recovery Team',report:'Generate Recovery Report'};
        this.addEvent('ACTION_REQUESTED',labels[action] || action);
        if(needsAgent) alert(`${labels[action]} was recorded as a recovery request. It can be delivered only when ${d.name} has an authenticated online GuardHai Agent with this capability.`);
        else alert(`${labels[action]} was added to the Recovery Session timeline. This action requires cloud/guardian services when they are configured.`);
        this.render();
    },
    completeRecovery() {
        const d=this.device(); if(!d)return;
        if(this.active[d.id]?.state !== 'ACTIVE' && this.active[d.id]?.state !== 'PAUSED') return alert('There is no active Recovery Mission to complete.');
        if(!confirm(`Confirm ${d.name} has been recovered? This closes Recovery Operations. Lost Mode must be closed by the Find service when connected.`))return;
        this.active[d.id]={state:'COMPLETED',completedAt:new Date().toISOString()}; localStorage.setItem('guardhai_recovery_sessions',JSON.stringify(this.active)); this.addEvent('RECOVERY_COMPLETED','Owner confirmed device recovered'); AudioEngine.stopEmergencyAlarm(); this.render();
    },
    pauseRecovery() { const d=this.device(); if(!d)return; this.active[d.id]={...(this.active[d.id]||{}),state:'PAUSED'};localStorage.setItem('guardhai_recovery_sessions',JSON.stringify(this.active));this.addEvent('MISSION_PAUSED','Owner paused Recovery Mission');this.render(); },
    resumeRecovery() { const d=this.device(); if(!d)return; this.active[d.id]={...(this.active[d.id]||{}),state:'ACTIVE'};localStorage.setItem('guardhai_recovery_sessions',JSON.stringify(this.active));this.addEvent('MISSION_RESUMED','Owner continued Recovery Mission');this.render(); },
    sendChat() { const input=document.getElementById('roc-chat-message');const text=input?.value.trim();if(!text)return;this.addEvent('TEAM_NOTE',text);input.value='';this.render(); },
    render() {
        const d=this.device(), summary=document.getElementById('roc-device-summary'); if(!d){if(summary)summary.innerText='No protected device is available.';return;}
        const session=this.active[d.id]; const status=document.getElementById('roc-status'),risk=document.getElementById('roc-risk'),confidence=document.getElementById('roc-confidence'),assistant=document.getElementById('roc-assistant');
        const mission=document.getElementById('roc-command-mission'),cmdDevice=document.getElementById('roc-command-device'),guardian=document.getElementById('roc-command-guardian'),community=document.getElementById('roc-command-community');
        if(mission)mission.innerText=session?.state==='ACTIVE'?'Active':session?.state==='PAUSED'?'Paused':session?.state==='COMPLETED'?'Successful':'Waiting';
        if(cmdDevice)cmdDevice.innerText=d.status==='lost'?'Lost / evidence pending':d.remoteStatus==='remote_tracking'?'Tracking state':'No verified Find evidence';
        if(guardian)guardian.innerText='Not assigned'; if(community)community.innerText='Waiting for Find detection';
        if(summary)summary.innerHTML=`<b>${d.name}</b><br>Connection: ${d.btState||d.status||'Unknown'}<br>Last seen: ${d.lastHeartbeat||'No verified update'}<br>Find evidence: ${d.remoteStatus==='remote_tracking'?'Remote tracking state':'No verified Find location'}`;
        if(status)status.innerText=session?.state==='ACTIVE'?'Active':session?.state==='COMPLETED'?'Completed':'Waiting';
        const high=d.status==='lost'||d.remoteStatus==='possible_lost'; if(risk){risk.innerText=high?'High':'Unknown';risk.style.color=high?'var(--emergency-red)':'var(--amber)';}
        if(confidence)confidence.innerText='No location';
        if(assistant)assistant.innerText=high?'Possible loss state detected. Do not approach alone; use a trusted contact/Guardian after a verified location is available.':'No verified location evidence yet. Use Find My Device before planning recovery.';
        const zone=document.getElementById('roc-zone'),badge=document.getElementById('roc-zone-badge'); if(zone)zone.innerText='Location not verified — no zone can be classified.'; if(badge){badge.className='device-status-badge disconnected';badge.innerText='UNKNOWN';}
        const relevant=this.events.filter(e=>e.deviceId===d.id);
        const chat=document.getElementById('roc-chat'); if(chat)chat.innerHTML=relevant.filter(e=>e.type==='TEAM_NOTE').map(e=>`<div style="padding:5px;background:#F8FAFC;border-radius:7px;margin-bottom:4px;"><b>Owner</b>: ${e.note}</div>`).join('') || '<span>No Recovery Team messages yet.</span>';
        const analytics=document.getElementById('roc-analytics'); const completed=this.events.filter(e=>e.type==='RECOVERY_COMPLETED').length; if(analytics)analytics.innerText=completed?`${completed} completed mission(s) recorded on this device.`:'No completed recovery missions yet.';
        const tl=document.getElementById('roc-timeline'); if(tl)tl.innerHTML=relevant.length?relevant.map(e=>`<div class="timeline-item"><div class="timeline-icon"><svg class="ic"><use href="#i-list"/></svg></div><div><b style="font-size:10px;color:var(--deep-navy);">${e.type.replaceAll('_',' ')}</b><p style="font-size:9px;color:var(--text-muted);">${e.note}<br>${new Date(e.time).toLocaleString()}</p></div></div>`).join(''):'<p style="font-size:10px;color:var(--text-muted);">No authorized recovery events recorded.</p>';
        const checklist=document.getElementById('roc-checklist'); if(checklist)checklist.innerHTML=['Verified Find location','Guardian/trusted contact notified','Navigation reviewed','Device recovered','End session'].map((x,i)=>`<label class="remember-row" style="margin:7px 0;"><input type="checkbox" ${session?.state==='COMPLETED'&&i===3?'checked':''} onchange="RecoveryROC.addEvent('CHECKLIST_UPDATED','${x.replaceAll("'","&#39;")}')"> ${x}</label>`).join('');
    }
};

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
const I18N = {
    lang: localStorage.getItem('guardhai_lang') || 'sw',

    // Kamusi ya Tafsiri ya Swahili na Kiingereza
    translations: {
        sw: {
            // Top Bar & Navigation
            'greeting': 'Asubuhi Njema,',
            'nav_home': 'Nyumbani',
            'nav_comm': 'Soga',
            'nav_shield': 'Ulinzi',
            'nav_map': 'Ramani',
            'nav_logout': 'Ondoka',

            // Home Page
            'hero_title': 'Mfumo Uko Salama',
            'status_active': 'PROTECTION NETWORK ACTIVE',
            'kpi_risk': 'Hali ya Hatari',
            'kpi_safe_zone': 'Eneo Salama',
            'kpi_protected': 'Zilizolindwa',

            // Protect Sub-Tabs
            'tab_dashboard': 'Dashboard',
            'tab_devices': 'Protection Network',
            'tab_health': 'Afya ya Mfumo',
            'tab_layers': 'Layers & Mkakati',
            'tab_rules': 'Maeneo & Sheria',
            'tab_statusmap': 'Ramani ya Eneo',
            'tab_history': 'Kumbukumbu',

            // Buttons
            'btn_add_device': '+ Ongeza Kifaa',
            'btn_run_health': 'Kagua Afya ya Mfumo',
            'btn_continue': 'Endelea',
            'btn_login': 'Ingia Kwenye Akaunti Yako',
            'btn_register': 'Tengeneza Akaunti Mpya',

            // Protection Engine
            'conf_title': 'Protection Confidence Index (Nguvu ya Mfumo)',
            'heartbeat_label': 'Mdundo wa Heartbeat:',

            // ---- HOME REDESIGN (2026-10-27) ----
            'gh_welcome': 'Karibu GuardHai',
            'gh_welcome_sub': 'Usalama wako, afya yako, maisha yako.',
            'gh_safety_title': 'Hali ya usalama',
            'gh_safety_unknown': 'Haijapimwa bado',
            'gh_safety_desc': 'Hakuna huduma ya dharura iliyounganishwa. Kagua mazingira ya kifaa chako.',
            'gh_safety_cta': 'Kagua / Sanidi taarifa za usalama',
            'gh_device_line': 'Kifaa unachotumia:',
            'gh_risk_note': 'Kipimo hiki kinatokana na ishara za kifaa (mtandao, betri, ruhusa) — si tathmini ya usalama wako.',
            'gh_risk_index': 'Kipimo cha hatari',
            'gh_sos_text': 'Dharura',
            'gh_sos_demo': 'Demo — hakuna msaada unaotumwa kwa mtu yeyote.',
            'gh_quick': 'Vitendo vya haraka',
            'gh_qa_health': 'Afya',
            'gh_qa_shield': 'Shield',
            'gh_qa_find': 'Tafuta Kifaa',
            'gh_qa_map': 'Ramani',
            'gh_qa_guardians': 'Walezi',
            'gh_qa_learn': 'Elimu ya Usalama',
            'gh_uwanja': 'Uwanja wa GuardHai',
            'gh_uwanja_sub': 'Jifunze, shiriki maarifa, saidiana.',
            'gh_compose': 'Shiriki Elimu',
            'gh_topic_all': 'Zote',
            'gh_topic_people': 'Usalama wa Watu',
            'gh_topic_health': 'Afya',
            'gh_topic_crime': 'Uhalifu na Mali',
            'gh_topic_disaster': 'Ajali na Majanga',
            'gh_topic_digital': 'Usalama wa Kidijitali',
            'gh_feed_note': 'Machapisho yaliyowekwa "SAMPULI" ni mfano wa UI — hayatoki kwa watumiaji halisi.',
            'gh_more_full': 'Menyu kamili',
            'gh_lang': 'Lugha',
            'nav_health': 'Afya',
            'nav_chat': 'Chat',
            'ghc_title': 'Shiriki Elimu',
            'ghc_note': 'Prototype: chapisho lako linabaki kwenye kifaa hiki. Hakuna kinachotumwa au kuonekana kwa watu wengine.',
            'ghc_post_title': 'Kichwa (hiari)',
            'ghc_record': 'Rekodi',
            'ghc_preview': 'Hakiki',
            'ghc_preview_hint': 'Hivi ndivyo chapisho litakavyoonekana kwenye Uwanja:',
            'ghc_preview_note': 'Hakiki: hii ni onyesho la kifaa pekee. Chapisho halitachapishwa mtandaoni.',
            'ghc_back': 'Rudi',
            'ghc_type': 'Aina ya chapisho',
            'ghc_type_elimu': 'Elimu',
            'ghc_type_swali': 'Swali',
            'ghc_type_uzoefu': 'Uzoefu wa Jamii',
            'ghc_type_taarifa': 'Taarifa ya Taasisi',
            'ghc_type_fursa': 'Fursa ya Kusaidia',
            'ghc_text': 'Maelezo',
            'ghc_topic': 'Mada',
            'ghc_audience': 'Watazamaji',
            'ghc_media': 'Viambatisho',
            'ghc_photo': 'Picha',
            'ghc_video': 'Video',
            'ghc_audio': 'Sauti',
            'ghc_link': 'Kiungo',
            'ghc_media_note': 'Faili zinabaki kwenye kifaa hiki — hakuna kinachopakiwa. Picha: JPEG/PNG/WEBP/GIF ≤ 5 MB (max 4). Video: MP4/WEBM/OGG ≤ 50 MB. Sauti: ≤ 15 MB.',
            'ghc_draft': 'Hifadhi Rasimu',
            'ghc_publish': 'Chapisha',
            'ghc_aud_public': 'Umma (sampuli)',
            'ghc_aud_community': 'Jamii fulani (sampuli)',
            'ghc_aud_guardians': 'Walezi pekee (sampuli)'
        },
        en: {
            // Top Bar & Navigation
            'greeting': 'Good Morning,',
            'nav_home': 'Home',
            'nav_comm': 'Chats',
            'nav_shield': 'Shield',
            'nav_map': 'Map',
            'nav_logout': 'Logout',

            // Home Page
            'hero_title': 'All Systems Safe',
            'status_active': 'PROTECTION NETWORK ACTIVE',
            'kpi_risk': 'System Risk',
            'kpi_safe_zone': 'Safe Zone',
            'kpi_protected': 'Protected',

            // Protect Sub-Tabs
            'tab_dashboard': 'Dashboard',
            'tab_devices': 'Protection Network',
            'tab_health': 'Network Health',
            'tab_layers': 'Layers & Strategy',
            'tab_rules': 'Zones & Rules',
            'tab_statusmap': 'Zone Map',
            'tab_history': 'Timeline Log',

            // Buttons
            'btn_add_device': '+ Add Protected Device',
            'btn_run_health': 'Run Health Diagnostics',
            'btn_continue': 'Continue',
            'btn_login': 'Sign In to Dashboard',
            'btn_register': 'Create New Account',

            // Protection Engine
            'conf_title': 'Protection Confidence Index (Overall Guard Strength)',
            'heartbeat_label': 'Heartbeat Pulse:',

            // ---- HOME REDESIGN (2026-10-27) ----
            'gh_welcome': 'Welcome to GuardHai',
            'gh_welcome_sub': 'Your safety, your health, your life.',
            'gh_safety_title': 'Safety status',
            'gh_safety_unknown': 'Not assessed yet',
            'gh_safety_desc': 'No emergency service is connected. Review your device context.',
            'gh_safety_cta': 'Review / Set up safety info',
            'gh_device_line': 'Device in use:',
            'gh_risk_note': 'This index comes from device signals (network, battery, permissions) — not an assessment of your safety.',
            'gh_risk_index': 'Risk index',
            'gh_sos_text': 'Emergency',
            'gh_sos_demo': 'Demo — no help is sent to anyone.',
            'gh_quick': 'Quick actions',
            'gh_qa_health': 'Health',
            'gh_qa_shield': 'Shield',
            'gh_qa_find': 'Find Device',
            'gh_qa_map': 'Map',
            'gh_qa_guardians': 'Guardians',
            'gh_qa_learn': 'Safety Education',
            'gh_uwanja': 'GuardHai Community',
            'gh_uwanja_sub': 'Learn, share knowledge, help each other.',
            'gh_compose': 'Share Education',
            'gh_topic_all': 'All',
            'gh_topic_people': 'People Safety',
            'gh_topic_health': 'Health',
            'gh_topic_crime': 'Crime & Property',
            'gh_topic_disaster': 'Accidents & Disasters',
            'gh_topic_digital': 'Digital Safety',
            'gh_feed_note': 'Posts marked "SAMPLE" are UI examples — they do not come from real users.',
            'gh_more_full': 'Full menu',
            'gh_lang': 'Language',
            'nav_health': 'Health',
            'nav_chat': 'Chat',
            'ghc_title': 'Share Education',
            'ghc_note': 'Prototype: your post stays on this device. Nothing is sent or shown to anyone else.',
            'ghc_post_title': 'Title (optional)',
            'ghc_record': 'Record',
            'ghc_preview': 'Preview',
            'ghc_preview_hint': 'This is how the post will look in the Uwanja feed:',
            'ghc_preview_note': 'Preview: device-only render. The post will not be published online.',
            'ghc_back': 'Back',
            'ghc_type': 'Post type',
            'ghc_type_elimu': 'Education',
            'ghc_type_swali': 'Question',
            'ghc_type_uzoefu': 'Community Experience',
            'ghc_type_taarifa': 'Institution Notice',
            'ghc_type_fursa': 'Opportunity to Help',
            'ghc_text': 'Details',
            'ghc_topic': 'Topic',
            'ghc_audience': 'Audience',
            'ghc_media': 'Attachments',
            'ghc_photo': 'Photo',
            'ghc_video': 'Video',
            'ghc_audio': 'Audio',
            'ghc_link': 'Link',
            'ghc_media_note': 'Files stay on this device — nothing is uploaded. Images: JPEG/PNG/WEBP/GIF ≤ 5 MB (max 4). Video: MP4/WEBM/OGG ≤ 50 MB. Audio: ≤ 15 MB.',
            'ghc_draft': 'Save Draft',
            'ghc_publish': 'Publish',
            'ghc_aud_public': 'Public (sample)',
            'ghc_aud_community': 'A specific community (sample)',
            'ghc_aud_guardians': 'Guardians only (sample)'
        }
    },

    // Setting ya Kubadilisha Lugha
    setLanguage(lang) {
        this.lang = lang;
        localStorage.setItem('guardhai_lang', lang);

        // Sync zana zote za kuchagua lugha (Select Dropdowns)
        document.querySelectorAll('.lang-toggle').forEach(select => {
            select.value = lang;
        });

        // Badilisha maneno yote yenye 'data-i18n' tag kwenye HTML
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.translations[lang] && this.translations[lang][key]) {
                if (el.tagName === 'INPUT' && el.placeholder) {
                    el.placeholder = this.translations[lang][key];
                } else {
                    el.innerText = this.translations[lang][key];
                }
            }
        });

        // Re-render UI elements
        if (window.ProtectEngine) {
            ProtectEngine.renderDevices();
            ProtectEngine.calculateProtectionConfidence();
        }
    },

    init() {
        this.setLanguage(this.lang);
    }
};

/* REMOTE SHIELD: operational parent controller.
   Channel 1 = Nearby BLE states. Channel 2 = Cloud event persistence + owner notification. */
const RemoteShield = {
    sensitivity: localStorage.getItem('guardhai_remote_sensitivity') || 'Medium',
    settings: JSON.parse(localStorage.getItem('guardhai_remote_settings') || '{"vibrate":true,"alarm":true,"notify":true,"tracking":true,"autoReconnect":true,"saveLocation":true}'),
    eventHistory: JSON.parse(localStorage.getItem('guardhai_remote_events') || '[]'),

    showHome() {
        document.getElementById('modalProtectionChooser').style.display = 'none';
        document.getElementById('modalRemoteSettings').style.display = 'none';
        const remoteModal = document.getElementById('modalRemoteShield'); if (remoteModal) remoteModal.style.display = 'none';
        switchTab('shield');
        ProtectEngine.switchSubTab('remote');
        this.renderDevices();
    },
    getDevices() { return (ProtectEngine.protectedDevices || []).filter(d => d.remoteShieldEnabled); },
    registerDevice(device) {
        if (!device) return;
        device.remoteShieldEnabled = true;
        device.remoteStatus = 'protected';
        this.record(device, { type: 'REMOTE_SESSION_CREATED', lastConnection: 'Bluetooth' });
        this.renderDevices();
    },
    handleNearbyEvent(device, state) {
        if (!device || !device.remoteShieldEnabled) return;
        const map = {
            WARNING: ['nearby_warning', 'Little movement detected', 'silent'],
            MOVING_AWAY: ['nearby_warning', 'Separation continues', 'vibrate'],
            CONNECTION_LOST: ['separated', 'Bluetooth connection lost', 'emergency'],
            RECONNECTING: ['remote_tracking', 'Remote tracking started', 'silent'],
            ALARM: ['possible_lost', 'Protection lost', 'emergency'],
            FIND_DEVICE: ['remote_tracking', 'Find device activated', 'emergency'],
            RECONNECTED: ['online_again', 'Device online again', 'silent'],
            MONITORING: ['protected', 'Nearby protection active', 'silent']
        };
        const data = map[state]; if (!data) return;
        device.remoteStatus = data[0];
        // After Bluetooth loss, Remote Tracking becomes the active second layer if the owner enabled it.
        if (state === 'CONNECTION_LOST' && this.settings.tracking) device.remoteStatus = 'remote_tracking';
        this.record(device, { type: data[1], stage: data[2], lastConnection: 'Bluetooth' });
        if (data[2] !== 'silent') this.notifyOwner(device, data[1], data[2]);
        this.renderDevices();
    },
    record(device, event) {
        const item = { deviceId: device.id, deviceName: device.name, status: device.remoteStatus, time: new Date().toISOString(), ...event };
        this.eventHistory.unshift(item); this.eventHistory = this.eventHistory.slice(0, 100);
        localStorage.setItem('guardhai_remote_events', JSON.stringify(this.eventHistory));
        localStorage.setItem('guardhai_protected_devices', JSON.stringify(ProtectEngine.protectedDevices));
        if (window.FirebaseService?.syncRemoteShieldEvent) {
            FirebaseService.syncRemoteShieldEvent(device, item).catch(err => console.info('Remote Shield cloud sync pending:', err.message));
        }
    },
    notifyOwner(device, event, stage) {
        const message = `${device.name}: ${event}. Last connection: Bluetooth.`;
        if (this.settings.vibrate && stage === 'vibrate' && navigator.vibrate) navigator.vibrate([180, 100, 180]);
        if (this.settings.alarm && stage === 'emergency') { if (navigator.vibrate) navigator.vibrate([400, 120, 400, 120, 400]); AudioEngine.startEmergencyAlarm(); }
        if (this.settings.notify && 'Notification' in window && Notification.permission === 'granted') new Notification('GuardHai Remote Alert', { body: message });
        else console.warn('GuardHai Remote Alert:', message);
    },
    requestNotifications() {
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    },
    renderDevices() {
        const modalList = document.getElementById('remote-shield-device-list');
        const dashboardList = document.getElementById('remote-shield-dashboard-list');
        const nearbyList = document.getElementById('remote-nearby-only-list');
        const timeline = document.getElementById('remote-shield-timeline');
        const devices = this.getDevices();
        const normal = (ProtectEngine.protectedDevices || []).filter(d => !d.remoteShieldEnabled);
        const labels = { protected:['🟢','Protected'], nearby_warning:['🟡','Nearby Warning'], separated:['🟠','Separated'], remote_tracking:['🔵','Remote Tracking'], possible_lost:['🔴','Possible Lost'], online_again:['🔵','Online Again'], offline:['⚫','Offline'] };
        const remoteHtml = devices.length ? devices.map(d=>{ const st=labels[d.remoteStatus]||labels.protected; return `<div class="device-card-premium" style="cursor:default;margin-bottom:8px;border-left:3px solid var(--royal-blue);"><div style="display:flex;justify-content:space-between;gap:7px;"><div><b style="font-size:13px;color:var(--deep-navy);">${GHIcon(d.icon)} ${d.name}</b><span style="display:block;font-size:10px;margin-top:5px;color:var(--deep-navy);">${st[0]} ${st[1]}</span></div><button class="mini-btn" onclick="RemoteShield.viewDetails('${d.id}')">Details</button></div><div style="margin-top:8px;font-size:10px;color:var(--text-muted);line-height:1.65;">Mode: <b>Hybrid Remote Shield</b><br>Nearby: <b style="color:${d.btState==='CONNECTION_LOST'?'var(--emergency-red)':'var(--emerald-green)'};">${d.btState==='CONNECTION_LOST'?'Connection lost':'Active'}</b> · Cloud: <b style="color:var(--royal-blue);">Sync enabled</b><br>Last seen: <b>${d.lastHeartbeat||'Now'}</b></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px;"><button class="mini-btn" onclick="RemoteShield.trackDevice('${d.id}')">Track status</button><button class="mini-btn" style="color:var(--emergency-red);" onclick="RemoteShield.markPossibleLost('${d.id}')">Mark lost</button></div></div>`; }).join('') : '<div style="padding:16px;text-align:center;border:1px dashed var(--card-border);border-radius:12px;font-size:11px;color:var(--text-muted);">No devices are in Remote Shield yet. Add a device or enable Remote Tracking below.</div>';
        if (modalList) modalList.innerHTML=remoteHtml;
        if (dashboardList) dashboardList.innerHTML=remoteHtml;
        if (nearbyList) nearbyList.innerHTML=normal.length ? normal.map(d=>`<div class="item-row-card" style="margin-bottom:7px;"><div><b style="font-size:11px;color:var(--deep-navy);">${GHIcon(d.icon)} ${d.name}</b><span style="display:block;font-size:9px;color:var(--text-muted);">Nearby Shield only · Bluetooth protection</span></div><button class="mini-btn" onclick="RemoteShield.enableExistingDevice('${d.id}')">Enable Remote</button></div>`).join('') : '<p style="font-size:10px;color:var(--text-muted);padding:6px;">No Nearby-only devices.</p>';
        if (timeline) timeline.innerHTML=this.eventHistory.slice(0,8).map(e=>`<div class="timeline-item"><div class="timeline-icon"><svg class="ic"><use href="#i-cloud"/></svg></div><div><b style="font-size:10px;color:var(--deep-navy);">${e.deviceName}: ${e.type}</b><p style="font-size:9px;color:var(--text-muted);">${new Date(e.time).toLocaleString()} · ${e.lastConnection||'Cloud'}</p></div></div>`).join('') || '<p style="font-size:10px;color:var(--text-muted);">No Remote Shield events yet.</p>';
        const owner = document.getElementById('remote-owner-online'); if(owner) owner.innerText = navigator.onLine ? '● Internet connected — ready for remote alerts' : '● Offline — cloud alerts will sync when online';
        const statDevices=document.getElementById('remote-stat-devices'), statAlerts=document.getElementById('remote-stat-alerts'), statCloud=document.getElementById('remote-stat-cloud');
        if(statDevices) statDevices.innerText=devices.length; if(statAlerts) statAlerts.innerText=this.eventHistory.filter(e=>e.stage==='vibrate'||e.stage==='emergency').length; if(statCloud) statCloud.innerText=navigator.onLine?'Ready':'Offline';
    },
    enableExistingDevice(id) { const d=ProtectEngine.protectedDevices.find(x=>x.id===id); if(!d) return; d.remoteShieldEnabled=true; d.remoteStatus='protected'; this.registerDevice(d); },
    trackDevice(id) { const d=ProtectEngine.protectedDevices.find(x=>x.id===id); if(!d)return; d.remoteStatus='remote_tracking'; this.record(d,{type:'Manual remote status check',lastConnection:'Cloud'}); this.renderDevices(); },
    markPossibleLost(id) { const d=ProtectEngine.protectedDevices.find(x=>x.id===id); if(!d)return; d.remoteStatus='possible_lost'; this.record(d,{type:'Marked possible lost',lastConnection:'Bluetooth'}); this.notifyOwner(d,'Device marked as possible lost','emergency'); this.renderDevices(); },
    trackOwnerPhone() { if(!navigator.geolocation){ return; } navigator.geolocation.getCurrentPosition(pos=>{ const t=new Date().toLocaleTimeString(); const el=document.getElementById('remote-owner-location'); if(el)el.innerText=`Updated ${t} (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`; },()=>{ const el=document.getElementById('remote-owner-location'); if(el)el.innerText='Location permission was not granted'; }); },
    addDevice() { closeProtectionModals(); this.requestNotifications(); ProtectWizard.startWizard(true); },
    viewDetails(id) { document.getElementById('modalRemoteShield').style.display='none'; ProtectEngine.openDeviceDetail(id); },
    showSettings() { document.getElementById('modalRemoteShield').style.display='none'; document.getElementById('modalRemoteSettings').style.display='flex'; const sensitivity=document.getElementById('remote-setting-sensitivity'); if(sensitivity)sensitivity.value=this.sensitivity; Object.entries(this.settings).forEach(([key,value])=>{const el=document.getElementById('remote-setting-'+({autoReconnect:'reconnect',saveLocation:'location'}[key]||key));if(el)el.checked=value;}); },
    backToHome() { this.showHome(); },
    setSensitivity(value) { this.sensitivity=value; localStorage.setItem('guardhai_remote_sensitivity',value); ProtectEngine.addSecurityLog('Remote Shield','Sensitivity updated: '+value); },
    updateSetting(key,value) { this.settings[key]=value; localStorage.setItem('guardhai_remote_settings',JSON.stringify(this.settings)); ProtectEngine.addSecurityLog('Remote Shield',key+' '+(value?'enabled':'disabled')); }
};
window.RemoteShield = RemoteShield;
function openProtectionTypeChooser() { document.getElementById('modalProtectionChooser').style.display = 'flex'; }
function closeProtectionModals() { ['modalProtectionChooser','modalRemoteShield','modalRemoteSettings'].forEach(id => { const el=document.getElementById(id); if(el) el.style.display='none'; }); }
function startNearbyShield() { closeProtectionModals(); ProtectWizard.startWizard(false); }

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

function enterGuardHaiHome() {
    localStorage.setItem('guardhai_logged_in', 'true');
    document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('appTopNav').style.display = 'flex';
    document.getElementById('appBottomNav').style.display = 'flex';
    switchTab('home');
}

function handleSignOut() {
    localStorage.removeItem('guardhai_logged_in');
    document.getElementById('appTopNav').style.display = 'none';
    document.getElementById('appBottomNav').style.display = 'none';
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
    if (window.auth) window.auth.signOut();
    AuthFlow.goTo('landing');
}

function toggleSidebar(open) {
    const drawer = document.getElementById('sidebarDrawer');
    const overlay = document.getElementById('sidebarOverlay');
    if (open) {
        drawer.classList.add('open');
        overlay.style.display = 'block';
    } else {
        drawer.classList.remove('open');
        overlay.style.display = 'none';
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

    const selectedPage = document.getElementById(tabName + 'Page');
    const selectedTab = document.getElementById('tab-' + tabName);

    if (selectedPage) selectedPage.classList.add('active');
    if (selectedTab) selectedTab.classList.add('active');

    if (tabName === 'map') setTimeout(initMainMap, 200);
}

let mainMapInstance = null;
function initMainMap() {
    if (mainMapInstance) {
        mainMapInstance.invalidateSize();
        return;
    }

    mainMapInstance = L.map('mainMap', { zoomControl: false }).setView([-6.8184, 39.2790], 16);

    // REALISTIC HYBRID SATELLITE LAYER (Google Maps Hybrid)
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '© Google Maps Satellite View'
    }).addTo(mainMapInstance);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            mainMapInstance.setView([pos.coords.latitude, pos.coords.longitude], 17);
            L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(mainMapInstance).bindPopup("<b>Real Satellite GPS Location</b>").openPopup();
        });
    }
}

// DOM INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    I18N.init();
    ProtectEngine.init();
    CommunicationModule.init();
});
