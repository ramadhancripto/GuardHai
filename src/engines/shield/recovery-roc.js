/* ==========================================================================
   GuardHai · engines/shield/recovery-roc.js
   Recovery rate-of-change indicator shown after an incident.
   ========================================================================== */
import { AudioEngine } from './audio-engine.js';
import { ProtectEngine } from './protect-engine.js';

const RecoveryROC = {
   selectedId: null,
   events: JSON.parse(localStorage.getItem('guardhai_recovery_events') || '[]'),
    active: JSON.parse(localStorage.getItem('guardhai_recovery_sessions') || '{}'),
    init() {
        const select=document.getElementById('roc-device-select'); if(!select) return;
        const devices=ProtectEngine.protectedDevices || [];
        select.innerHTML=devices.length ? devices.map(d=>`<option value="${d.id}">${d.name} (${d.type||'Device'})</option>`).join('') : '<option value="">No protected device available</option>';
        this.selectedId=devices[0]?.id || null; this.render();
    },
    selectDevice(id) { this.selectedId=id; this.render(); },
    device() { return (ProtectEngine.protectedDevices || []).find(d=>d.id===this.selectedId); },
    hasVerifiedFindEvidence(d) { return Boolean(d?.findLocation?.verified === true && Number.isFinite(d.findLocation.lat) && Number.isFinite(d.findLocation.lng)); },
    addEvent(type, note) { const d=this.device(); if(!d)return; this.events.unshift({id:Date.now(),deviceId:d.id,type,note,time:new Date().toISOString()}); this.events=this.events.slice(0,100); localStorage.setItem('guardhai_recovery_events',JSON.stringify(this.events)); },
    startRecovery() {
        const d=this.device(); if(!d)return alert('Select a protected device first.');
        if(!this.hasVerifiedFindEvidence(d)) return alert('Recovery Operations cannot start yet. Find My Device must first provide a verified usable location for this device.');
        const confirmed=confirm(`Start Recovery Operations for ${d.name}?\n\nA verified Find location is available. Start the recovery mission?`); if(!confirmed)return;
        this.active[d.id]={state:'ACTIVE',startedAt:new Date().toISOString()}; localStorage.setItem('guardhai_recovery_sessions',JSON.stringify(this.active)); this.addEvent('RECOVERY_STARTED','Owner started Recovery Operations Center'); this.render();
    },
    requestAction(action) {
        const d=this.device(); if(!d)return;
        if(this.active[d.id]?.state !== 'ACTIVE') return alert('Start an active Recovery Mission after Find My Device provides verified location evidence.');
        const needsAgent=['alarm','message'].includes(action);
        const labels={alarm:'Play Alarm',message:'Display Recovery Message',share:'Share Recovery Session',guardian:'Notify Guardian',map:'Open Recovery Map',safePoint:'Find Nearest Safe Point',team:'Manage Recovery Team',report:'Generate Recovery Report'};
        this.addEvent('ACTION_REQUESTED',labels[action] || action);
        if(needsAgent) alert(`${labels[action]} was recorded as a recovery request. It can be delivered only when ${d.name} has an authenticated online GuardHai Agent with this capability.`);
        else alert(`${labels[action]} was added to the Recovery Session timeline. This action requires cloud/guardian services when they are configured.`);
        this.render();
    },
    completeRecovery() {
        const d=this.device(); if(!d)return;
        if(this.active[d.id]?.state !== 'ACTIVE' && this.active[d.id]?.state !== 'PAUSED') return alert('There is no active Recovery Mission to complete.');
        if(!confirm(`Confirm ${d.name} has been recovered? This closes Recovery Operations. Lost Mode must be closed by the Find service when connected.`))return;
        this.active[d.id]={state:'COMPLETED',completedAt:new Date().toISOString()}; localStorage.setItem('guardhai_recovery_sessions',JSON.stringify(this.active)); this.addEvent('RECOVERY_COMPLETED','Owner confirmed device recovered'); AudioEngine.stopEmergencyAlarm(); this.render();
    },
    pauseRecovery() { const d=this.device(); if(!d)return; this.active[d.id]={...(this.active[d.id]||{}),state:'PAUSED'};localStorage.setItem('guardhai_recovery_sessions',JSON.stringify(this.active));this.addEvent('MISSION_PAUSED','Owner paused Recovery Mission');this.render(); },
    resumeRecovery() { const d=this.device(); if(!d)return; this.active[d.id]={...(this.active[d.id]||{}),state:'ACTIVE'};localStorage.setItem('guardhai_recovery_sessions',JSON.stringify(this.active));this.addEvent('MISSION_RESUMED','Owner continued Recovery Mission');this.render(); },
    sendChat() { const input=document.getElementById('roc-chat-message');const text=input?.value.trim();if(!text)return;this.addEvent('TEAM_NOTE',text);input.value='';this.render(); },
    render() {
        const d=this.device(), summary=document.getElementById('roc-device-summary'); if(!d){if(summary)summary.innerText='No protected device is available.';return;}
        const session=this.active[d.id]; const status=document.getElementById('roc-status'),risk=document.getElementById('roc-risk'),confidence=document.getElementById('roc-confidence'),assistant=document.getElementById('roc-assistant');
        const mission=document.getElementById('roc-command-mission'),cmdDevice=document.getElementById('roc-command-device'),guardian=document.getElementById('roc-command-guardian'),community=document.getElementById('roc-command-community');
        if(mission)mission.innerText=session?.state==='ACTIVE'?'Active':session?.state==='PAUSED'?'Paused':session?.state==='COMPLETED'?'Successful':'Waiting';
        if(cmdDevice)cmdDevice.innerText=d.status==='lost'?'Lost / evidence pending':d.remoteStatus==='remote_tracking'?'Tracking state':'No verified Find evidence';
        if(guardian)guardian.innerText='Not assigned'; if(community)community.innerText='Waiting for Find detection';
        if(summary)summary.innerHTML=`<b>${d.name}</b><br>Connection: ${d.btState||d.status||'Unknown'}<br>Last seen: ${d.lastHeartbeat||'No verified update'}<br>Find evidence: ${d.remoteStatus==='remote_tracking'?'Remote tracking state':'No verified Find location'}`;
        if(status)status.innerText=session?.state==='ACTIVE'?'Active':session?.state==='COMPLETED'?'Completed':'Waiting';
        const high=d.status==='lost'||d.remoteStatus==='possible_lost'; if(risk){risk.innerText=high?'High':'Unknown';risk.style.color=high?'var(--emergency-red)':'var(--amber)';}
        if(confidence)confidence.innerText='No location';
        if(assistant)assistant.innerText=high?'Possible loss state detected. Do not approach alone; use a trusted contact/Guardian after a verified location is available.':'No verified location evidence yet. Use Find My Device before planning recovery.';
        const zone=document.getElementById('roc-zone'),badge=document.getElementById('roc-zone-badge'); if(zone)zone.innerText='Location not verified — no zone can be classified.'; if(badge){badge.className='device-status-badge disconnected';badge.innerText='UNKNOWN';}
        const relevant=this.events.filter(e=>e.deviceId===d.id);
        const chat=document.getElementById('roc-chat'); if(chat)chat.innerHTML=relevant.filter(e=>e.type==='TEAM_NOTE').map(e=>`<div style="padding:5px;background:#F8FAFC;border-radius:7px;margin-bottom:4px;"><b>Owner</b>: ${e.note}</div>`).join('') || '<span>No Recovery Team messages yet.</span>';
        const analytics=document.getElementById('roc-analytics'); const completed=this.events.filter(e=>e.type==='RECOVERY_COMPLETED').length; if(analytics)analytics.innerText=completed?`${completed} completed mission(s) recorded on this device.`:'No completed recovery missions yet.';
        const tl=document.getElementById('roc-timeline'); if(tl)tl.innerHTML=relevant.length?relevant.map(e=>`<div class="timeline-item"><div class="timeline-icon"><svg class="ic"><use href="#i-list"/></svg></div><div><b style="font-size:10px;color:var(--deep-navy);">${e.type.replaceAll('_',' ')}</b><p style="font-size:9px;color:var(--text-muted);">${e.note}<br>${new Date(e.time).toLocaleString()}</p></div></div>`).join(''):'<p style="font-size:10px;color:var(--text-muted);">No authorized recovery events recorded.</p>';
        const checklist=document.getElementById('roc-checklist'); if(checklist)checklist.innerHTML=['Verified Find location','Guardian/trusted contact notified','Navigation reviewed','Device recovered','End session'].map((x,i)=>`<label class="remember-row" style="margin:7px 0;"><input type="checkbox" ${session?.state==='COMPLETED'&&i===3?'checked':''} onchange="RecoveryROC.addEvent('CHECKLIST_UPDATED','${x.replaceAll("'","&#39;")}')"> ${x}</label>`).join('');
    }
};

window.RecoveryROC = RecoveryROC;
export { RecoveryROC };
