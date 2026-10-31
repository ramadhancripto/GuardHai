/**
 * GuardHai · data/storage.seed.js
 * The sample set the Storage Center offers on first run: eighteen records across
 * every category (including one edited copy so the original-vs-copy rule is
 * visible), two cases and two share grants. Every row carries `sample: true`, so
 * `clearSamples()` can remove exactly these and nothing the user typed.
 *
 * This module is data only. It writes nothing; the service decides when to load
 * it, so seeding can never happen as a side effect of importing a file.
 */
export function buildSamples({ meId, meName, daysAgo, uid }) {
  const cases = [
    { id: 'case_demo_1', code: 'CASE-2026-001', title: 'Ufuatiliaji wa usiku wa 12 Oktoba', kind: 'harassment', summary: 'Sampuli: mtu aliyefuata njia ya nyumbani.', status: 'open', openedAt: daysAgo(9), openedBy: meName(), ownerId: meId(), incidentRef: null, sample: true },
    { id: 'case_demo_2', code: 'CASE-2026-002', title: 'Figo la wizi wa kifaa Kijichi', kind: 'theft', summary: 'Sampuli: kifaa kilipotea kwenye soko.', status: 'review', openedAt: daysAgo(21), openedBy: meName(), ownerId: meId(), incidentRef: null, sample: true }
  ];
  const base = (over) => ({
    id: uid('st'),
    kind: 'document',
    evidenceType: null,
    evidenceId: null,
    mime: '',
    version: 'original',
    originId: null,
    ownerId: meId(),
    ownerName: meName(),
    uploadedById: meId(),
    uploadedByName: meName(),
    location: null,
    verification: 'unreviewed',
    integrity: null,
    tags: [],
    caseIds: [],
    eventRef: null,
    relatedIds: [],
    healthRef: null,
    blobKey: null,
    notes: [],
    archived: false,
    readOnly: false,
    sample: true,
    ...over
  });

  const items = [
    /* --- evidence ------------------------------------------------------- */
    base({
      id: 'st_demo_ev1', kind: 'evidence', category: 'evidence', subcategory: 'ev-photo', evidenceType: 'photo',
      evidenceId: 'EVD-0001', title: 'Picha ya mlango uliovunjwa', description: 'Sampuli: picha mbili za mlango wa nyumbani asubuhi ya tukio.',
      fileType: 'image', sizeBytes: 2411724, source: 'camera', sourceLabel: 'Kamera ya simu',
      createdAt: daysAgo(9), uploadedAt: daysAgo(9), privacy: 'private',
      location: { label: 'Kijichi, Dar es Salaam', precision: 'area', authorized: true },
      caseIds: ['case_demo_1'], caseCode: 'CASE-2026-001', verification: 'reviewed', reviewedAt: daysAgo(8), reviewedBy: 'Wewe',
      tags: ['mlango', 'tukio']
    }),
    base({
      id: 'st_demo_ev2', kind: 'evidence', category: 'evidence', subcategory: 'ev-video', evidenceType: 'video',
      evidenceId: 'EVD-0002', title: 'Video ya mtu akifuata njia', description: 'Sampuli: sekunde 42 kutoka kamera ya jirani.',
      fileType: 'video', sizeBytes: 18874368, source: 'external', sourceLabel: 'Kamera ya jirani',
      createdAt: daysAgo(9), uploadedAt: daysAgo(8), privacy: 'private',
      location: { label: 'Mtaa wa Kijichi', precision: 'exact', authorized: false },
      caseIds: ['case_demo_1'], caseCode: 'CASE-2026-001', tags: ['video']
    }),
    base({
      id: 'st_demo_ev3', kind: 'evidence', category: 'evidence', subcategory: 'ev-audio', evidenceType: 'audio',
      evidenceId: 'EVD-0003', title: 'Rekodi ya sauti ya vitisho', description: 'Sampuli: dakika 1 na sekunde 12, kifaa cha mwenyewe.',
      fileType: 'audio', sizeBytes: 1146880, source: 'camera', sourceLabel: 'Rekodi ya simu',
      createdAt: daysAgo(10), uploadedAt: daysAgo(10), privacy: 'guardians',
      caseIds: ['case_demo_1'], caseCode: 'CASE-2026-001', tags: ['sauti'],
      verification: 'reviewed', reviewedAt: daysAgo(9), reviewedBy: 'Wewe'
    }),
    base({
      id: 'st_demo_ev4', kind: 'evidence', category: 'evidence', subcategory: 'ev-witness', evidenceType: 'witness',
      evidenceId: 'EVD-0004', title: 'Maelezo ya shahidi — Asha J.', description: 'Sampuli: maelezo yaliyoandikwa kwa niaba ya shahidi.',
      fileType: 'document', sizeBytes: 42000, source: 'scan', sourceLabel: 'Kuchanganua',
      createdAt: daysAgo(8), uploadedAt: daysAgo(8), privacy: 'restricted',
      caseIds: ['case_demo_1'], caseCode: 'CASE-2026-001', tags: ['shahidi']
    }),
    base({
      id: 'st_demo_ev5', kind: 'evidence', category: 'evidence', subcategory: 'ev-messages', evidenceType: 'communication',
      evidenceId: 'EVD-0005', title: 'Nakala ya ujumbe wa vitisho', description: 'Sampuli: nakala ya mazungumzo yaliyotolewa na mtumiaji.',
      fileType: 'document', sizeBytes: 96000, source: 'communication', sourceLabel: 'Mawasiliano',
      createdAt: daysAgo(6), uploadedAt: daysAgo(6), privacy: 'private', tags: ['ujumbe']
    }),
    base({
      id: 'st_demo_ev6', kind: 'evidence', category: 'evidence', subcategory: 'ev-cctv', evidenceType: 'cctv',
      evidenceId: 'EVD-0006', title: 'CCTV ya duka la jirani', description: 'Sampuli: ombi la nakala liliwasilishwa; faili bado halipo.',
      fileType: 'video', sizeBytes: 0, source: 'external', sourceLabel: 'Mmiliki wa duka',
      createdAt: daysAgo(5), uploadedAt: daysAgo(5), privacy: 'restricted', tags: ['cctv']
    }),
    base({
      id: 'st_demo_ev7', kind: 'evidence', category: 'evidence', subcategory: 'ev-device', evidenceType: 'device',
      evidenceId: 'EVD-0007', title: 'Kumbukumbu ya kifaa kilichoibiwa', description: 'Sampuli: IMEI na hali ya kifaa wakati wa upotevu.',
      fileType: 'document', sizeBytes: 18000, source: 'device', sourceLabel: 'Kifaa',
      createdAt: daysAgo(21), uploadedAt: daysAgo(21), privacy: 'private',
      caseIds: ['case_demo_2'], caseCode: 'CASE-2026-002', tags: ['imei']
    }),
    /* --- reports / documents ------------------------------------------- */
    base({
      id: 'st_demo_rep1', category: 'reports', subcategory: 'police', title: 'Ripoti ya polisi — Kijichi',
      description: 'Sampuli: nakala ya ripoti ya kituo cha Kijichi.', fileType: 'pdf', sizeBytes: 512000,
      source: 'scan', sourceLabel: 'Kituo cha polisi', createdAt: daysAgo(7), uploadedAt: daysAgo(7),
      privacy: 'private', caseIds: ['case_demo_1'], caseCode: 'CASE-2026-001', tags: ['polisi']
    }),
    base({
      id: 'st_demo_rep2', category: 'reports', subcategory: 'support', title: 'Ombi la msaada wa kisaikolojia',
      description: 'Sampuli: ombi lililotumwa kwenye moduli ya Msaada.', fileType: 'pdf', sizeBytes: 128000,
      source: 'import', sourceLabel: 'Msaada', createdAt: daysAgo(12), uploadedAt: daysAgo(12), privacy: 'guardians'
    }),
    /* --- identity / property / device / guardian / communication ------- */
    base({
      id: 'st_demo_id1', category: 'identity', subcategory: 'national-id', title: 'Nakala ya kitambulisho cha taifa',
      description: 'Sampuli: picha ya mbele na nyuma.', fileType: 'image', sizeBytes: 734003,
      source: 'camera', sourceLabel: 'Kamera ya simu', createdAt: daysAgo(120), uploadedAt: daysAgo(120),
      privacy: 'restricted', tags: ['utambulisho']
    }),
    base({
      id: 'st_demo_pr1', category: 'property', subcategory: 'vehicle', title: 'Kadi ya gari — Toyota IST',
      description: 'Sampuli: nakala ya kadi ya usajili.', fileType: 'pdf', sizeBytes: 190000,
      source: 'scan', sourceLabel: 'Kuchanganua', createdAt: daysAgo(240), uploadedAt: daysAgo(240), privacy: 'private'
    }),
    base({
      id: 'st_demo_dev1', category: 'device', subcategory: 'specs', title: 'Vipimo vya simu ya mkononi',
      description: 'Sampuli: IMEI, mfumo na tarehe ya ununuzi.', fileType: 'document', sizeBytes: 12000,
      source: 'device', sourceLabel: 'Kifaa', createdAt: daysAgo(300), uploadedAt: daysAgo(300), privacy: 'private'
    }),
    base({
      id: 'st_demo_gu1', category: 'guardian', subcategory: 'agreements', title: 'Makubaliano ya ulezi — Neema M.',
      description: 'Sampuli: hati ya idhini ya mlezi wa dharura.', fileType: 'pdf', sizeBytes: 88000,
      source: 'scan', sourceLabel: 'Kuchanganua', createdAt: daysAgo(60), uploadedAt: daysAgo(60), privacy: 'restricted'
    }),
    base({
      id: 'st_demo_cm1', category: 'communication', subcategory: 'messages', title: 'Nakala ya mazungumzo na msaada',
      description: 'Sampuli: nakala ya ujumbe uliotumwa kwenye kikundi cha wajitolea.', fileType: 'document', sizeBytes: 64000,
      source: 'communication', sourceLabel: 'Mawasiliano', createdAt: daysAgo(15), uploadedAt: daysAgo(15), privacy: 'shared'
    }),
    /* --- location ------------------------------------------------------ */
    base({
      id: 'st_demo_loc1', category: 'location', subcategory: 'journeys', title: 'Kumbukumbu ya safari — nyumbani → kazini',
      description: 'Sampuli: safari iliyorekodiwa na moduli ya Usalama binafsi.', fileType: 'document', sizeBytes: 9000,
      source: 'location', sourceLabel: 'Usalama binafsi', createdAt: daysAgo(4), uploadedAt: daysAgo(4), privacy: 'private',
      location: { label: 'Kijichi → Kariakoo', precision: 'area', authorized: true }
    }),
    /* --- personal / archives ------------------------------------------ */
    base({
      id: 'st_demo_pe1', category: 'personal', subcategory: 'consents', title: 'Fomu ya idhini ya huduma',
      description: 'Sampuli: idhini ya kushiriki huduma ya jamii.', fileType: 'pdf', sizeBytes: 74000,
      source: 'scan', sourceLabel: 'Kuchanganua', createdAt: daysAgo(45), uploadedAt: daysAgo(45), privacy: 'private'
    }),
    base({
      id: 'st_demo_ar1', category: 'archives', subcategory: 'closed-cases', title: 'Kesi iliyofungwa — figo la gari',
      description: 'Sampuli: nyaraka za kesi iliyofungwa mwaka jana.', fileType: 'pdf', sizeBytes: 320000,
      source: 'import', sourceLabel: 'Nakala', createdAt: daysAgo(400), uploadedAt: daysAgo(400),
      privacy: 'private', archived: true
    }),
    /* --- a derived copy, so the UI can show original vs edited --------- */
    base({
      id: 'st_demo_ev1_copy', kind: 'evidence', category: 'evidence', subcategory: 'ev-photo', evidenceType: 'photo',
      evidenceId: 'EVD-0008', title: 'Picha ya mlango uliovunjwa (iliyohaririwa)',
      description: 'Sampuli: nakala iliyong’arishwa kwa mwanga; halisi haijabadilishwa.',
      fileType: 'image', sizeBytes: 2200000, source: 'camera', sourceLabel: 'Kamera ya simu',
      version: 'edited', originId: 'st_demo_ev1', createdAt: daysAgo(8), uploadedAt: daysAgo(8),
      privacy: 'private', tags: ['iliyohaririwa']
    })
  ];

  const custody = [];
  for (const item of items) {
    custody.push({ id: uid('cust'), itemId: item.id, at: item.uploadedAt, action: 'created', actorId: meId(), actorName: meName(), note: 'sampuli' });
  }
  const ev1 = items.find((i) => i.id === 'st_demo_ev1');
  if (ev1) {
    custody.push({ id: uid('cust'), itemId: ev1.id, at: daysAgo(8), action: 'reviewed', actorId: meId(), actorName: meName(), note: 'umekagua wewe' });
    custody.push({ id: uid('cust'), itemId: ev1.id, at: daysAgo(7), action: 'linked', actorId: meId(), actorName: meName(), note: 'kesi CASE-2026-001', caseId: 'case_demo_1' });
  }
  const shares = [
    { id: 'shr_demo_1', itemId: 'st_demo_ev1', targetId: 'guardian_demo', targetName: 'Neema Mushi (mlezi)', level: 'view', status: 'pending', createdAt: daysAgo(8), createdBy: meName(), note: 'sampuli', sample: true },
    { id: 'shr_demo_2', itemId: 'st_demo_cm1', targetId: 'community_demo', targetName: 'Wajitolea Kijichi', level: 'view', status: 'active', createdAt: daysAgo(14), createdBy: meName(), note: 'sampuli', sample: true }
  ];
  return { items, cases, custody, shares };
}
