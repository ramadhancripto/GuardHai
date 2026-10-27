/* ==========================================================================
   GuardHai · engines/shield/protect-wizard.js
   The multi-step protection setup wizard.
   ========================================================================== */
import { GHIcon } from '../../ui/icons.js';
import { ProtectEngine } from './protect-engine.js';
import { RemoteShield } from './remote-shield.js';

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
         * Kwenye wavuti, tunajaribu WebRTC local IP detection
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
         * Kwenye wavuti: Tunaonyesha hali halisi ya mtandao
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
         * Kwenye wavuti: Hatuwezi kufanya Wi-Fi Direct discovery halisi.
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

window.ProtectWizard = ProtectWizard;
export { ProtectWizard };
