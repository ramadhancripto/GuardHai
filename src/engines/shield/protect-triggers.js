/* ==========================================================================
   GuardHai · engines/shield/protect-triggers.js
   Trigger definitions: tap pattern, phone-drop, shake, route deviation and the
   manual SOS button. Merged into ProtectEngine.
   ========================================================================== */
export const ProtectTriggers = {
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
};
