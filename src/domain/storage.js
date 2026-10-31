/**
 * GuardHai · domain/storage.js
 * The vocabulary of the Universal Secure Storage Center: the twelve categories
 * and their subcategories, the eleven evidence kinds, the filter dimensions and
 * the validators. Pure data and pure functions — no DOM, no services.
 *
 * Nothing in this file claims a property the app does not have. Where a real
 * capability exists (SHA-256 on this device, the originals policy, the local
 * permission model) the copy says what is real; where it does not (encryption,
 * cloud backup, external verification, immutable storage) the copy says that
 * too, and the UI renders it.
 */

/* ------------------------------------------------------------------ limits */
export const LIMITS = Object.freeze({
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 2000,
  noteMax: 500,
  caseTitleMin: 3,
  caseTitleMax: 120,
  caseSummaryMax: 2000,
  tagMax: 24,
  tagsPerItem: 8,
  maxFileBytes: 25 * 1024 * 1024
});

/* -------------------------------------------------------------- file kinds */
export const FILE_TYPES = Object.freeze([
  { id: 'image', sw: 'Picha', en: 'Image', icon: 'i-camera', accept: ['image/*'] },
  { id: 'video', sw: 'Video', en: 'Video', icon: 'i-video', accept: ['video/*'] },
  { id: 'audio', sw: 'Sauti', en: 'Audio', icon: 'i-mic', accept: ['audio/*'] },
  { id: 'pdf', sw: 'PDF', en: 'PDF', icon: 'i-file-medical', accept: ['.pdf'] },
  { id: 'document', sw: 'Hati', en: 'Document', icon: 'i-folder', accept: ['.doc', '.docx', '.txt', '.csv'] },
  { id: 'other', sw: 'Nyingine', en: 'Other', icon: 'i-box', accept: [] }
]);

export const fileTypeOf = (item) => {
  if (item?.fileType && FILE_TYPES.some((f) => f.id === item.fileType)) return item.fileType;
  const mime = String(item?.mime || '');
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  return 'other';
};

/* ---------------------------------------------------------- evidence kinds */
export const EVIDENCE_TYPES = Object.freeze([
  { id: 'photo', icon: 'i-camera', tone: 'green', sw: 'Ushahidi wa picha', en: 'Photo evidence', swShort: 'Picha', enShort: 'Photo' },
  { id: 'video', icon: 'i-video', tone: 'blue', sw: 'Ushahidi wa video', en: 'Video evidence', swShort: 'Video', enShort: 'Video' },
  { id: 'audio', icon: 'i-mic', tone: 'purple', sw: 'Ushahidi wa sauti', en: 'Audio evidence', swShort: 'Sauti', enShort: 'Audio' },
  { id: 'document', icon: 'i-file-medical', tone: 'amber', sw: 'Ushahidi wa hati', en: 'Document evidence', swShort: 'Hati', enShort: 'Document' },
  { id: 'communication', icon: 'i-message', tone: 'blue', sw: 'Ushahidi wa mawasiliano', en: 'Communication evidence', swShort: 'Mawasiliano', enShort: 'Messages' },
  { id: 'location', icon: 'i-map-pin', tone: 'green', sw: 'Ushahidi wa eneo', en: 'Location evidence', swShort: 'Eneo', enShort: 'Location' },
  { id: 'witness', icon: 'i-user-shield', tone: 'purple', sw: 'Maelezo ya mashahidi', en: 'Witness statements', swShort: 'Mashahidi', enShort: 'Witness' },
  { id: 'device', icon: 'i-smartphone', tone: 'muted', sw: 'Ushahidi wa kifaa', en: 'Device evidence', swShort: 'Kifaa', enShort: 'Device' },
  { id: 'digital', icon: 'i-activity', tone: 'blue', sw: 'Kumbukumbu za matumizi ya kidijitali', en: 'Digital activity records', swShort: 'Kidijitali', enShort: 'Digital' },
  { id: 'cctv', icon: 'i-eye', tone: 'amber', sw: 'CCTV na ufuatiliaji', en: 'CCTV and surveillance', swShort: 'CCTV', enShort: 'CCTV' },
  { id: 'other', icon: 'i-box', tone: 'muted', sw: 'Ushahidi mwingine', en: 'Other evidence', swShort: 'Nyingine', enShort: 'Other' }
]);

export const evidenceTypeOf = (id) => EVIDENCE_TYPES.find((t) => t.id === id) || EVIDENCE_TYPES[EVIDENCE_TYPES.length - 1];

/* ------------------------------------------------------------- categories */
/* `link` marks a category whose records live in another module and are shown
   here as authorized pointers — never copies. */
export const CATEGORIES = Object.freeze([
  {
    id: 'personal', icon: 'i-user', tone: 'green',
    sw: 'Kumbukumbu binafsi', en: 'Personal Records',
    noteSw: 'Nyaraka zako za kibinafsi, idhini na maelezo', noteEn: 'Your personal documents, consents and notes',
    subs: [
      { id: 'profile-docs', sw: 'Nyaraka za wasifu', en: 'Profile documents' },
      { id: 'consents', sw: 'Fomu za idhini', en: 'Consent forms' },
      { id: 'contacts-sheets', sw: 'Karatasi za watu wa dharura', en: 'Emergency contact sheets' },
      { id: 'notes', sw: 'Maelezo binafsi', en: 'Personal notes' },
      { id: 'correspondence', sw: 'Mawasiliano', en: 'Correspondence' },
      { id: 'other', sw: 'Nyingine', en: 'Other' }
    ]
  },
  {
    id: 'health', icon: 'i-heart-pulse', tone: 'red', link: 'health',
    sw: 'Kumbukumbu za afya', en: 'Health Records',
    noteSw: 'Viungo vya rekodi halisi za moduli ya Afya — nakala hazihifadhiwi hapa',
    noteEn: 'Authorized pointers to the real Health module records — no copies are stored here',
    subs: [
      { id: 'lab', sw: 'Matokeo ya maabara', en: 'Laboratory results' },
      { id: 'exam', sw: 'Ripoti za uchunguzi wa matibabu', en: 'Medical examination reports' },
      { id: 'imaging', sw: 'Picha na radiolojia', en: 'Imaging and radiology' },
      { id: 'prescription', sw: 'Dawa zilizoandikwa', en: 'Prescriptions' },
      { id: 'treatment', sw: 'Kumbukumbu za matibabu', en: 'Treatment records' },
      { id: 'referral', sw: 'Barua za rufaa', en: 'Referral letters' },
      { id: 'discharge', sw: 'Muhtasari wa kuruhusiwa', en: 'Discharge summaries' },
      { id: 'certificate', sw: 'Vyeti vya matibabu', en: 'Medical certificates' },
      { id: 'doctor-notes', sw: 'Maelezo ya daktari', en: 'Doctor notes' },
      { id: 'other', sw: 'Hati nyingine za afya', en: 'Other health documents' }
    ]
  },
  {
    id: 'evidence', icon: 'i-shield-check', tone: 'green', evidence: true,
    sw: 'Ushahidi wa usalama', en: 'Security Evidence',
    noteSw: 'Kituo cha ushahidi — aina 11, kila moja na upekuzi wake',
    noteEn: 'The Evidence Center — eleven kinds, each with its own browsing',
    subs: EVIDENCE_TYPES.map((t) => ({ id: `ev-${t.id}`, evidenceType: t.id, sw: t.sw, en: t.en }))
  },
  {
    id: 'reports', icon: 'i-book', tone: 'amber',
    sw: 'Ripoti na nyaraka', en: 'Reports and Documents',
    noteSw: 'Ripoti za matukio, barua na nyaraka rasmi', noteEn: 'Incident reports, letters and formal documents',
    subs: [
      { id: 'incident', sw: 'Ripoti za matukio', en: 'Incident reports' },
      { id: 'police', sw: 'Ripoti za polisi na usalama', en: 'Police and security reports' },
      { id: 'support', sw: 'Maombi ya msaada', en: 'Support requests' },
      { id: 'letters', sw: 'Barua rasmi', en: 'Formal letters' },
      { id: 'receipts', sw: 'Risiti na ankara', en: 'Receipts and invoices' },
      { id: 'other', sw: 'Nyingine', en: 'Other' }
    ]
  },
  {
    id: 'identity', icon: 'i-id-card', tone: 'blue', sensitive: true,
    sw: 'Kumbukumbu za utambulisho', en: 'Identity Records',
    noteSw: 'Nyaraka za utambulisho — ufikiaji umewekwa chini ya udhibiti',
    noteEn: 'Identity documents — access is restricted by default',
    subs: [
      { id: 'national-id', sw: 'Kitambulisho cha taifa', en: 'National ID' },
      { id: 'passport', sw: 'Pasipoti', en: 'Passport' },
      { id: 'licence', sw: 'Leseni ya udereva', en: 'Driving licence' },
      { id: 'voter', sw: 'Kadi ya mpiga kura', en: 'Voter card' },
      { id: 'birth', sw: 'Cheti cha kuzaliwa', en: 'Birth certificate' },
      { id: 'insurance', sw: 'Kadi ya bima', en: 'Insurance card' },
      { id: 'other', sw: 'Nyingine', en: 'Other' }
    ]
  },
  {
    id: 'device', icon: 'i-smartphone', tone: 'muted',
    sw: 'Kumbukumbu za kifaa', en: 'Device Records',
    noteSw: 'Vifaa, matengenezo, uhakiki na ripoti za upotevu', noteEn: 'Devices, repairs, checks and loss reports',
    subs: [
      { id: 'specs', sw: 'Vipimo vya kifaa', en: 'Device specs' },
      { id: 'repairs', sw: 'Matengenezo na ukaguzi', en: 'Repairs and inspections' },
      { id: 'warranty', sw: 'Dhamana', en: 'Warranty' },
      { id: 'lost', sw: 'Ripoti za upotevu/wizi', en: 'Loss and theft reports' },
      { id: 'sim', sw: 'SIM na IMEI', en: 'SIM and IMEI' },
      { id: 'other', sw: 'Nyingine', en: 'Other' }
    ]
  },
  {
    id: 'property', icon: 'i-home', tone: 'green',
    sw: 'Mali na rasilimali', en: 'Property and Asset Records',
    noteSw: 'Ardhi, magari, vifaa na bima', noteEn: 'Land, vehicles, equipment and insurance',
    subs: [
      { id: 'land', sw: 'Ardhi na nyumba', en: 'Land and housing' },
      { id: 'vehicle', sw: 'Magari', en: 'Vehicles' },
      { id: 'electronics', sw: 'Vifaa vya kielektroniki', en: 'Electronics' },
      { id: 'insurance', sw: 'Sera za bima', en: 'Insurance policies' },
      { id: 'receipts', sw: 'Risiti za ununuzi', en: 'Purchase receipts' },
      { id: 'other', sw: 'Nyingine', en: 'Other' }
    ]
  },
  {
    id: 'guardian', icon: 'i-user-shield', tone: 'purple', sensitive: true,
    sw: 'Kumbukumbu za walezi', en: 'Guardian Records',
    noteSw: 'Makubaliano, historia ya ruhusa na mipango ya dharura', noteEn: 'Agreements, permission history and emergency plans',
    subs: [
      { id: 'agreements', sw: 'Makubaliano ya ulezi', en: 'Guardianship agreements' },
      { id: 'permissions', sw: 'Historia ya ruhusa', en: 'Permission history' },
      { id: 'contacts', sw: 'Karatasi za mawasiliano', en: 'Contact sheets' },
      { id: 'plans', sw: 'Mipango ya dharura', en: 'Emergency plans' },
      { id: 'other', sw: 'Nyingine', en: 'Other' }
    ]
  },
  {
    id: 'communication', icon: 'i-message', tone: 'blue',
    sw: 'Kumbukumbu za mawasiliano', en: 'Communication Records',
    noteSw: 'Nakala za ujumbe, kumbukumbu za simu na mazungumzo', noteEn: 'Message exports, call logs and transcripts',
    subs: [
      { id: 'messages', sw: 'Nakala za ujumbe', en: 'Message exports' },
      { id: 'calls', sw: 'Kumbukumbu za simu', en: 'Call logs' },
      { id: 'support', sw: 'Mazungumzo ya msaada', en: 'Support transcripts' },
      { id: 'notices', sw: 'Taarifa za jamii', en: 'Community notices' },
      { id: 'other', sw: 'Nyingine', en: 'Other' }
    ]
  },
  {
    id: 'location', icon: 'i-map-pin', tone: 'green',
    sw: 'Kumbukumbu za eneo', en: 'Location Records',
    noteSw: 'Safari, check-in na maeneo salama', noteEn: 'Journeys, check-ins and safe places',
    subs: [
      { id: 'journeys', sw: 'Kumbukumbu za safari', en: 'Journey logs' },
      { id: 'checkins', sw: 'Historia ya check-in', en: 'Check-in history' },
      { id: 'places', sw: 'Maeneo salama', en: 'Safe places' },
      { id: 'map-exports', sw: 'Nakala za ramani', en: 'Map exports' },
      { id: 'other', sw: 'Nyingine', en: 'Other' }
    ]
  },
  {
    id: 'archives', icon: 'i-box', tone: 'muted',
    sw: 'Kumbukumbu zilizohifadhiwa', en: 'Archives',
    noteSw: 'Kesi zilizofungwa, nyaraka zilizopitwa na nakala', noteEn: 'Closed cases, superseded documents and exports',
    subs: [
      { id: 'closed-cases', sw: 'Kesi zilizofungwa', en: 'Closed cases' },
      { id: 'superseded', sw: 'Nyaraka zilizopitwa', en: 'Superseded documents' },
      { id: 'exports', sw: 'Nakala zilizotolewa', en: 'Exports' },
      { id: 'other', sw: 'Nyingine', en: 'Other' }
    ]
  },
  {
    id: 'shared', icon: 'i-users', tone: 'purple',
    sw: 'Hifadhi iliyoshirikiwa', en: 'Shared Storage',
    noteSw: 'Ufikiaji uliotolewa na uliopokelewa — kwenye kifaa hiki', noteEn: 'Grants given and received — on this device',
    subs: [
      { id: 'with-me', sw: 'Iliyoshirikiwa nami', en: 'Shared with me' },
      { id: 'by-me', sw: 'Nilizoshiriki', en: 'Shared by me' },
      { id: 'pending', sw: 'Zinasubiri', en: 'Pending' },
      { id: 'revoked', sw: 'Zilizoondolewa', en: 'Revoked' }
    ]
  }
]);

export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || null;
export const categoriesOf = () => CATEGORIES;

export function subcategoriesOf(categoryId) {
  const category = categoryOf(categoryId);
  return category ? category.subs : [];
}

export function subOf(categoryId, subId) {
  return subcategoriesOf(categoryId).find((s) => s.id === subId) || null;
}

/** health subcategory → the Health module's own record category */
export const HEALTH_CATEGORY_MAP = Object.freeze({
  lab: 'lab',
  prescription: 'prescription',
  exam: 'report',
  imaging: 'report',
  treatment: 'consultation',
  referral: 'document',
  discharge: 'report',
  certificate: 'report',
  'doctor-notes': 'consultation',
  other: 'document'
});

/**
 * Health record category → the health subcategory used by the Storage Center.
 * A health record that already names a storage sub (`lab`, `prescription` …) is
 * kept as is; the rest fall back through HEALTH_CATEGORY_MAP, whose first key
 * for a value is the canonical one.
 */
export function healthSubFor(category) {
  if (subOf('health', category)) return category;
  return Object.keys(HEALTH_CATEGORY_MAP).find((k) => HEALTH_CATEGORY_MAP[k] === category) || 'other';
}

/* ------------------------------------------------------------ vocabularies */
export const SOURCES = Object.freeze([
  { id: 'camera', sw: 'Kamera ya kifaa', en: 'Device camera', icon: 'i-camera' },
  { id: 'upload', sw: 'Kupakia faili', en: 'File upload', icon: 'i-download' },
  { id: 'scan', sw: 'Kuchanganua (scan)', en: 'Scan', icon: 'i-image-plus' },
  { id: 'import', sw: 'Kuleta kutoka programu', en: 'Import', icon: 'i-corner-up-left' },
  { id: 'health', sw: 'Moduli ya Afya', en: 'Health module', icon: 'i-heart-pulse' },
  { id: 'communication', sw: 'Mawasiliano', en: 'Communication', icon: 'i-message' },
  { id: 'device', sw: 'Kifaa', en: 'Device', icon: 'i-smartphone' },
  { id: 'location', sw: 'Eneo', en: 'Location', icon: 'i-map-pin' },
  { id: 'external', sw: 'Chanzo cha nje', en: 'External source', icon: 'i-globe' }
]);

export const PRIVACY = Object.freeze([
  { id: 'private', sw: 'Binafsi', en: 'Private', tone: 'green', noteSw: 'Wewe pekee kwenye kifaa hiki', noteEn: 'Only you on this device' },
  { id: 'guardians', sw: 'Walezi', en: 'Guardians', tone: 'blue', noteSw: 'Walezi waliothibitishwa kwenye kifaa hiki', noteEn: 'Active guardians on this device' },
  { id: 'shared', sw: 'Iliyoshirikiwa', en: 'Shared', tone: 'purple', noteSw: 'Watu maalum walioorodheshwa', noteEn: 'Named people you granted access' },
  { id: 'restricted', sw: 'Imezuiwa', en: 'Restricted', tone: 'amber', noteSw: 'Imefungwa hadi utoe ruhusa', noteEn: 'Locked until you grant access' }
]);

export const VERIFICATION = Object.freeze([
  { id: 'unreviewed', sw: 'Haijakaguliwa', en: 'Unreviewed', tone: 'muted' },
  { id: 'reviewed', sw: 'Umekagua wewe', en: 'Reviewed by you', tone: 'ok' },
  { id: 'external', sw: 'Uthibitisho wa nje (haupo)', en: 'External verification (not available)', tone: 'warn' },
  { id: 'rejected', sw: 'Imekataliwa', en: 'Rejected', tone: 'danger' }
]);

export const VERSIONS = Object.freeze([
  { id: 'original', sw: 'Halisi', en: 'Original', tone: 'ok', icon: 'i-shield-check' },
  { id: 'edited', sw: 'Iliyohaririwa', en: 'Edited copy', tone: 'warn', icon: 'i-edit' },
  { id: 'exported', sw: 'Nakala iliyotolewa', en: 'Exported version', tone: 'info', icon: 'i-download' }
]);

export const SIZE_BANDS = Object.freeze([
  { id: 'tiny', sw: 'Chini ya 1 MB', en: 'Under 1 MB', test: (n) => n < 1048576 },
  { id: 'small', sw: '1 – 10 MB', en: '1 – 10 MB', test: (n) => n >= 1048576 && n < 10485760 },
  { id: 'large', sw: 'Zaidi ya 10 MB', en: 'Over 10 MB', test: (n) => n >= 10485760 },
  { id: 'none', sw: 'Hakuna faili', en: 'No file attached', test: (n) => !n }
]);

export const DATE_RANGES = Object.freeze([
  { id: 'any', sw: 'Kipindi chochote', en: 'Any time' },
  { id: '7d', sw: 'Siku 7', en: 'Last 7 days', days: 7 },
  { id: '30d', sw: 'Siku 30', en: 'Last 30 days', days: 30 },
  { id: '90d', sw: 'Siku 90', en: 'Last 90 days', days: 90 },
  { id: 'year', sw: 'Mwaka huu', en: 'This year', days: 365 }
]);

export const CASE_STATUS = Object.freeze([
  { id: 'open', sw: 'Wazi', en: 'Open', tone: 'warn' },
  { id: 'review', sw: 'Inakaguliwa', en: 'Under review', tone: 'info' },
  { id: 'closed', sw: 'Imefungwa', en: 'Closed', tone: 'muted' }
]);

export const CASE_KINDS = Object.freeze([
  { id: 'incident', sw: 'Tukio la usalama', en: 'Security incident' },
  { id: 'harassment', sw: 'Unyanyasaji', en: 'Harassment' },
  { id: 'theft', sw: 'Wizi', en: 'Theft' },
  { id: 'dispute', sw: 'Migogoro', en: 'Dispute' },
  { id: 'medical', sw: 'Kesi ya matibabu', en: 'Medical case' },
  { id: 'other', sw: 'Nyingine', en: 'Other' }
]);

export const SHARE_LEVELS = Object.freeze([
  { id: 'view', sw: 'Kuona tu', en: 'View only' },
  { id: 'comment', sw: 'Kuona na maoni', en: 'View and comment' },
  { id: 'manage', sw: 'Kusimamia', en: 'Manage' }
]);

export const SHARE_STATUS = Object.freeze([
  { id: 'active', sw: 'Hai', en: 'Active', tone: 'ok' },
  { id: 'pending', sw: 'Inasubiri', en: 'Pending', tone: 'warn' },
  { id: 'revoked', sw: 'Imeondolewa', en: 'Revoked', tone: 'muted' }
]);

export const labelOf = (list, id) => list.find((x) => x.id === id) || null;

/* --------------------------------------------------------- honesty rules */
export const HONESTY = Object.freeze({
  storage: {
    sw: 'Faili hizi ziko kwenye IndexedDB ya browser hii pekee. GuardHai haizisimbei wingu, haizifanyi nakala rudufu, na haizisimba kwa usimbaji fiche wake — ulinzi ni wa kifaa (OS/browser).',
    en: 'These files live in this browser’s IndexedDB only. GuardHai does not back them up to a cloud, keep a second copy, or encrypt them itself — protection is the device’s (OS/browser) responsibility.'
  },
  integrity: {
    sw: 'Alama ya SHA-256 inahesabiwa kwenye kifaa hiki kwa faili zilizopo kweli hapa. Faili isiyo na blob (kiungo au sampuli) haina alama halisi.',
    en: 'A SHA-256 digest is computed on this device for files actually stored here. A record with no blob (a pointer or a sample) has no real digest.'
  },
  verification: {
    sw: '“Umekagua wewe” ni hatua yako mwenyewe kwenye kifaa hiki. Hakuna mthibitishaji wa nje, hakuna muhuri wa mamlaka, na GuardHai haithibitishi ushahidi.',
    en: '“Reviewed by you” is your own step on this device. There is no external verifier, no authority seal, and GuardHai does not certify evidence.'
  },
  originals: {
    sw: 'Faili halisi haibadilishwi wala kufutwa na kuhariri. Kuhariri au kuhamisha hufungua nakala mpya inayohusishwa na halisi — na historia ya matumizi inaandikwa.',
    en: 'The original file is never overwritten by an edit. Editing or exporting creates a new copy linked to the original — and every step is written to the audit trail.'
  },
  sharing: {
    sw: 'Ruhusa za kushiriki zinaandikwa kwenye kifaa hiki. Hakuna seva iliyounganishwa, hivyo hakuna anayepokea ufikiaji hadi muunganisho utakapowekwa.',
    en: 'Share grants are recorded on this device. No server is connected, so nobody receives access until a transport exists.'
  }
});

/**
 * The same truths as HONESTY, in one line each. Screens use these where a
 * paragraph would be noise; the long form stays on the screen that needs to be
 * unambiguous (a record, the share form).
 */
export const HONESTY_SHORT = Object.freeze({
  storage: {
    sw: 'Kwenye kifaa hiki pekee — hakuna wingu.',
    en: 'On this device only — no cloud.'
  },
  integrity: {
    sw: 'Alama ipo tu kwa faili iliyopo hapa.',
    en: 'A digest exists only for a file that is here.'
  },
  verification: {
    sw: 'Uhakiki ni wako — hakuna mthibitishaji wa nje.',
    en: 'Review is yours — there is no external verifier.'
  },
  originals: {
    sw: 'Halisi haibadilishwi — kuhariri huunda nakala.',
    en: 'The original is never overwritten — editing makes a copy.'
  },
  sharing: {
    sw: 'Imeandikwa hapa — hakuna anayepokea ufikiaji bado.',
    en: 'Recorded here — nobody receives access yet.'
  }
});

/* ------------------------------------------------------------- validators */
const clean = (value) => String(value ?? '').trim();

export function validateItem(draft = {}) {
  const errors = {};
  const title = clean(draft.title);
  if (title.length < LIMITS.titleMin) errors.title = 'short';
  if (title.length > LIMITS.titleMax) errors.title = 'long';
  if (!categoryOf(draft.category)) errors.category = 'required';
  if (!subOf(draft.category, draft.subcategory)) errors.subcategory = 'required';
  if (clean(draft.description).length > LIMITS.descriptionMax) errors.description = 'long';
  if (!PRIVACY.some((p) => p.id === draft.privacy)) errors.privacy = 'required';
  const tags = (draft.tags || []).map(clean).filter(Boolean);
  if (tags.length > LIMITS.tagsPerItem) errors.tags = 'count';
  if (tags.some((t) => t.length > LIMITS.tagMax)) errors.tags = 'long';
  if (Number(draft.sizeBytes || 0) > LIMITS.maxFileBytes) errors.sizeBytes = 'big';
  if (draft.category === 'evidence' && !EVIDENCE_TYPES.some((t) => t.id === draft.evidenceType)) {
    errors.evidenceType = 'required';
  }
  return { ok: Object.keys(errors).length === 0, errors, title, tags };
}

export function validateCase(draft = {}) {
  const errors = {};
  const title = clean(draft.title);
  if (title.length < LIMITS.caseTitleMin) errors.title = 'short';
  if (title.length > LIMITS.caseTitleMax) errors.title = 'long';
  if (clean(draft.summary).length > LIMITS.caseSummaryMax) errors.summary = 'long';
  if (!CASE_KINDS.some((k) => k.id === draft.kind)) errors.kind = 'required';
  return { ok: Object.keys(errors).length === 0, errors, title };
}

export function validateShare(draft = {}) {
  const errors = {};
  if (!clean(draft.targetId)) errors.targetId = 'required';
  if (!SHARE_LEVELS.some((l) => l.id === draft.level)) errors.level = 'required';
  return { ok: Object.keys(errors).length === 0, errors };
}

/* ------------------------------------------------------------ filter model */
export const FILTER_FIELDS = Object.freeze([
  'category', 'subcategory', 'fileType', 'range', 'source',
  'owner', 'event', 'case', 'privacy', 'verification', 'size', 'location'
]);

export const emptyFilters = () => ({
  q: '',
  category: 'all',
  subcategory: 'all',
  evidenceType: 'all',
  fileType: 'all',
  range: 'any',
  source: 'all',
  owner: 'all',
  event: 'all',
  case: 'all',
  privacy: 'all',
  verification: 'all',
  size: 'all',
  location: 'all',
  view: 'list'
});

export const activeFilterCount = (filters = {}) => FILTER_FIELDS
  .filter((key) => filters[key] && filters[key] !== 'all')
  .length + (filters.q ? 1 : 0);
