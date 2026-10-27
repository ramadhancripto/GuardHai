/* ==========================================================================
   GuardHai · engines/shield/communication-module.js
   The communication screen: message threads, SOS entry points and the
   USB/LED signalling helpers.
   ========================================================================== */
import { ProtectEngine } from './protect-engine.js';
import { USBCableEngine } from './usb-cable.js';

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
         * Kwenye wavuti: Tunapima RTT ya server (sio local device)
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
         * Kwenye wavuti: Hatuwezi kuthibitisha agent.
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
         * Kwenye wavuti: Tunatumia Network Information API
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

window.CommunicationModule = CommunicationModule;
export { CommunicationModule };
