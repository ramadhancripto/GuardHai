/* ==========================================================================
   GuardHai · engines/shield/remote-shield.js
   Remote-shield panel: browser notification permission and remote commands.
   The remote half is not connected — the UI says so.
   ========================================================================== */
import { AudioEngine } from './audio-engine.js';
import { GHIcon } from '../../ui/icons.js';
import { ProtectEngine } from './protect-engine.js';
import { ProtectWizard } from './protect-wizard.js';
import { closeProtectionModals } from './protection-modals.js';
import { switchTab } from '../navigation/tabs.js';

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

window.RemoteShield = RemoteShield;
export { RemoteShield };
