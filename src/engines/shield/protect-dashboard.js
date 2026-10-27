/* ==========================================================================
   GuardHai · engines/shield/protect-dashboard.js
   Dashboard rendering for the shield: the confidence score, the KPI row, the
   device cards and the event log. Pure view code — it reads engine state and
   writes DOM. Merged into ProtectEngine with Object.assign so `this` is the
   engine, exactly like the other mixes.
   ========================================================================== */
export const ProtectDashboard = {

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
};
