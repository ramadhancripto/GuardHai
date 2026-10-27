/* ==========================================================================
   GuardHai · engines/shield/protect-signals.js
   Reads the browser signals the shield can actually observe (network, battery,
   permissions, motion). Merged into ProtectEngine.
   ========================================================================== */
export const ProtectSignals = {
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
};
