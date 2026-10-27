/* ==========================================================================
   GuardHai · engines/shield/protect-state-machine.js
   The protection state machine: idle → armed → alert → responding.
   Merged into ProtectEngine.
   ========================================================================== */
export const ProtectStateMachine = {
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
};
