/* ==========================================================================
   GuardHai · engines/shield/usb-cable.js
   USB / cable security guidance screen.
   ========================================================================== */
import { AudioEngine } from './audio-engine.js';
import { CommunicationModule } from './communication-module.js';
import { ProtectEngine } from './protect-engine.js';

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

window.USBCableEngine = USBCableEngine;
export { USBCableEngine };
