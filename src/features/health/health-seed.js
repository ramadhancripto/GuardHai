/**
 * GuardHai · features/health/health-seed.js
 * Synthetic sample content, applied only when the person taps "Weka sampuli".
 * Every row carries `synthetic: true` and the UI tags each one "Sampuli".
 */

import { uid } from './health-state.js';

export function applyDemoSeed(s, at) {
    s.mode = 'demo';
    if (!s.profiles.some((p) => p.id === 'p_demo')) {
      s.profiles.push({ id: 'p_demo', relation: 'dependent', label: 'Amina (sampuli)', initials: 'AM', demo: true });
    }
    s.activeProfile = 'p_self';
    const demoName = s.profiles.find((p) => p.id === 'p_self').label || 'Juma Nassoro';
    s.profiles.find((p) => p.id === 'p_self').label = demoName === '' ? 'Juma Nassoro' : demoName;
    s.profiles.find((p) => p.id === 'p_self').initials = 'JN';
    s.profiles.find((p) => p.id === 'p_self').demo = true;

    s.medical.p_self = {
      fullName: 'Juma Nassoro', dob: '1988-04-12', sex: 'm', blood: 'O-',
      weight: '72', height: '174', allergies: 'Penicillin (mfano)',
      conditions: 'Shinikizo la damu (mfano)', notes: 'Sampuli ya majaribio — si mgonjwa halisi.',
      updatedAt: at, synthetic: true
    };
    if (!s.contacts.some((c) => c.profileId === 'p_self')) {
      s.contacts.push(
        { id: uid('ec'), profileId: 'p_self', name: 'Neema Nassoro (sampuli)', relation: 'Mke', phone: '+255700000001', synthetic: true },
        { id: uid('ec'), profileId: 'p_self', name: 'Baraka Nassoro (sampuli)', relation: 'Kaka', phone: '+255700000002', synthetic: true }
      );
    }
    s.records = [
      { id: uid('rc'), title: 'Nyongeza ya damu — sampuli', category: 'lab', date: '2026-09-18', facility: 'Maabara ya Mfano A', summary: 'Matokeo ya mfano kwa ajili ya UI. Si matokeo halisi.', file: { name: 'lab-sampuli.pdf', size: 184320, type: 'application/pdf', local: true }, source: 'synthetic-demo', synthetic: true, addedAt: at },
      { id: uid('rc'), title: 'Ushauri wa kliniki — sampuli', category: 'consultation', date: '2026-08-30', facility: 'Kliniki ya Mfano B', summary: 'Muhtasari wa mfano: ufuatiliaji wa shinikizo la damu.', file: null, source: 'synthetic-demo', synthetic: true, addedAt: at },
      { id: uid('rc'), title: 'Dawa zilizoandikwa — sampuli', category: 'prescription', date: '2026-08-30', facility: 'Kliniki ya Mfano B', summary: 'Orodha ya dawa za mfano. Si maagizo halisi.', file: null, source: 'synthetic-demo', synthetic: true, addedAt: at }
    ];
    s.meds = [
      { id: uid('md'), name: 'Dawa ya mfano A', dose: '5 mg', times: ['08:00', '20:00'], instructions: 'Baada ya chakula (mfano)', start: new Date().toISOString().slice(0, 10), end: '', file: null, synthetic: true, createdAt: at },
      { id: uid('md'), name: 'Dawa ya mfano B', dose: '1 kibonge', times: ['13:00'], instructions: 'Mfano pekee', start: new Date().toISOString().slice(0, 10), end: '', file: null, synthetic: true, createdAt: at }
    ];
    s.doses = [{ id: uid('ds'), medId: s.meds[0].id, date: new Date().toISOString().slice(0, 10), time: '08:00', status: 'taken', note: '', at, source: 'self-reported', synthetic: true }];
    s.appointments = [{
      id: uid('ap'), doctorId: 'd1', date: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10), time: '10:30',
      type: 'in-person', reason: 'Ufuatiliaji wa mfano', status: 'requested', synthetic: true, createdAt: at,
      history: [{ at, status: 'requested', note: 'Sampuli' }], summary: null, confirmedBy: null
    }];
    s.cases = [{
      id: uid('cs'), title: 'Mgonjwa mzima mwenye homa kali — sampuli', specialty: 0,
      summary: 'Maelezo ya mfano yasiyo na taarifa za mgonjwa halisi. Lengo: kuonyesha mjadala wa wataalamu.',
      urgency: 'routine', status: 'discussion', synthetic: true, createdAt: at, author: 'Dkt. Mfano A.',
      replies: [
        { id: uid('rp'), at, body: 'Maoni ya mfano: fikiria uchunguzi wa maabara kabla ya tiba.', stance: 'peer-opinion', author: 'Dkt. Mfano C.', synthetic: true },
        { id: uid('rp'), at, body: 'Uamuzi wa mwisho unafanywa na daktari anayemhudumia mgonjwa, si jukwaa hili.', stance: 'context', author: 'Msimamizi (sampuli)', synthetic: true }
      ], summaryNote: '', references: []
    }];
    s.memberships = ['c-internal', 'c-emergency'];
    s.meetings = [{
      id: uid('mt'), title: 'Kikao cha kesi za wiki — sampuli', date: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
      time: '15:00', duration: 45, host: 'Dkt. Mfano B.', agenda: 'Mjadala wa mfano. Hakuna kiungo cha video.', synthetic: true,
      createdAt: at, invited: [], responded: [], notes: '', outcomes: '', followUps: [], invitationsSent: false, recording: false
    }];
    s.referrals = [{
      id: uid('rf'), doctorId: 'd3', reason: 'Tathmini ya mfano ya dharura', urgency: 'urgent',
      summary: 'Rufaa ya mfano — haijawasilishwa kwa mtu yeyote.', recordIds: [], status: 'ready',
      createdAt: at, delivered: false, deliveredAt: null,
      history: [{ at, status: 'ready', note: 'Imewekwa tayari kwenye kifaa — haijatumwa.' }], synthetic: true
    }];
    s.blood = [{ id: uid('bl'), group: 'O-', facility: 'Benki ya Damu ya Mfano A', place: 'Dar es Salaam', units: 2, at, source: 'user-report', synthetic: true }];
    s.notifications = [{
      id: uid('nt'), title: 'Taarifa ya mfano', body: 'Hii ni taarifa ya ndani ya kifaa — haikutumwa kwa mtu yeyote.',
      tone: 'info', icon: 'i-bell', at, read: false, delivered: false
    }];
    s.audit.unshift({ id: uid('au'), at, event: 'demo.seeded', detail: 'Sampuli za majaribio zimewekwa kwenye kifaa hiki.' });
}
