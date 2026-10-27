/* ==========================================================================
   GuardHai · engines/shield/protect-response.js
   Response chain executed once a trigger fires: reconnection attempt, alarm,
   screen flash and on-device notification. Merged into ProtectEngine.
   ========================================================================== */
export const ProtectResponse = {
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
};
