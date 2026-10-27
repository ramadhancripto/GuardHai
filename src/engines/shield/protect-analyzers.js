/* ==========================================================================
   GuardHai · engines/shield/protect-analyzers.js
   Protection signal analysis: grace timer, RSSI trend, session manager and the
   confidence score. Merged into ProtectEngine with Object.assign.
   ========================================================================== */
export const ProtectAnalyzers = {
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
