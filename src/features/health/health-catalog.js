/**
 * GuardHai · features/health/health-catalog.js
 * Static reference data and the status vocabulary for the Health section.
 *
 * Everything here is an invented placeholder ("Dkt. Mfano A", "Kituo cha Mfano
 * B"): no real clinician, facility, blood bank or publication is represented,
 * nothing is fetched, and no verification status is granted by this file.
 */


export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const P = (sw, en) => ({ sw, en });

export const SPECIALTIES = [
  P('Dawa za ndani', 'Internal medicine'),
  P('Afya ya mama na mtoto', 'Maternal & child health'),
  P('Dharura na huduma mahututi', 'Emergency & critical care'),
  P('Upasuaji', 'Surgery'),
  P('Maabara na uchunguzi', 'Laboratory & diagnostics'),
  P('Afya ya jamii', 'Public health'),
  P('Ubora wa huduma', 'Clinical quality improvement')
];

export const CONSULT_TYPES = [
  { id: 'in-person', sw: 'Ana kwa ana', en: 'In person' },
  { id: 'phone', sw: 'Kwa simu', en: 'By phone' },
  { id: 'follow-up', sw: 'Ufuatiliaji', en: 'Follow-up' }
];

export const RECORD_CATEGORIES = [
  { id: 'lab', icon: 'i-flask', sw: 'Matokeo ya maabara', en: 'Lab results' },
  { id: 'prescription', icon: 'i-pill', sw: 'Dawa zilizoandikwa', en: 'Prescriptions' },
  { id: 'consultation', icon: 'i-stethoscope', sw: 'Muhtasari wa ushauri', en: 'Consultation summaries' },
  { id: 'report', icon: 'i-file-medical', sw: 'Ripoti', en: 'Reports' },
  { id: 'document', icon: 'i-folder', sw: 'Nyaraka nyingine', en: 'Supporting documents' }
];

export const COMMUNITIES = [
  { id: 'c-internal', icon: 'i-heart-pulse', name: 'Internal Medicine', group: 0 },
  { id: 'c-mch', icon: 'i-baby', name: 'Maternal & Child Health', group: 1 },
  { id: 'c-emergency', icon: 'i-siren', name: 'Emergency & Critical Care', group: 2 },
  { id: 'c-surgery', icon: 'i-scissors', name: 'Surgery', group: 3 },
  { id: 'c-lab', icon: 'i-flask', name: 'Laboratory & Diagnostics', group: 4 },
  { id: 'c-public', icon: 'i-globe', name: 'Public Health', group: 5 },
  { id: 'c-quality', icon: 'i-badge-check', name: 'Clinical Quality Improvement', group: 6 }
];

export const DOCTORS = [
  { id: 'd1', name: 'Dkt. Mfano A.', initials: 'MA', specialty: 0, facility: 'Kituo cha Mfano A · Dar es Salaam',
    qualification: 'MD, MMed (Internal Medicine)', licence: 'Toleo la mfano · #0000-A',
    verification: 'pending-review', services: ['Ushauri wa ndani', 'Ufuatiliaji wa magonjwa sugu'], fee: null, types: ['in-person', 'phone'] },
  { id: 'd2', name: 'Dkt. Mfano B.', initials: 'MB', specialty: 1, facility: 'Kituo cha Mfano B · Mwanza',
    qualification: 'MD, MMed (Paediatrics)', licence: 'Toleo la mfano · #0000-B',
    verification: 'unsubmitted', services: ['Afya ya mtoto', 'Chanjo'], fee: null, types: ['in-person'] },
  { id: 'd3', name: 'Dkt. Mfano C.', initials: 'MC', specialty: 2, facility: 'Kituo cha Mfano C · Dar es Salaam',
    qualification: 'MD, MMed (Emergency Medicine)', licence: 'Toleo la mfano · #0000-C',
    verification: 'pending-review', services: ['Dharura', 'Majeraha'], fee: null, types: ['in-person', 'phone'] },
  { id: 'd4', name: 'Dkt. Mfano D.', initials: 'MD', specialty: 3, facility: 'Kituo cha Mfano D · Dodoma',
    qualification: 'MD, MMed (Surgery)', licence: 'Toleo la mfano · #0000-D',
    verification: 'unsubmitted', services: ['Upasuaji wa jumla'], fee: null, types: ['in-person'] },
  { id: 'd5', name: 'Dkt. Mfano E.', initials: 'ME', specialty: 4, facility: 'Maabara ya Mfano E · Arusha',
    qualification: 'BSc Medical Laboratory Sciences', licence: 'Toleo la mfano · #0000-E',
    verification: 'pending-review', services: ['Uchunguzi wa maabara'], fee: null, types: ['in-person'] },
  { id: 'd6', name: 'Dkt. Mfano F.', initials: 'MF', specialty: 5, facility: 'Kituo cha Mfano F · Iringa',
    qualification: 'MD, MPH', licence: 'Toleo la mfano · #0000-F',
    verification: 'unsubmitted', services: ['Afya ya jamii', 'Elimu ya afya'], fee: null, types: ['phone'] }
];

export const BLOOD_SEED = [
  { group: 'O-', facility: 'Benki ya Damu ya Mfano A', place: 'Dar es Salaam', units: 3, source: 'synthetic', checkedAt: null },
  { group: 'O+', facility: 'Benki ya Damu ya Mfano A', place: 'Dar es Salaam', units: 9, source: 'synthetic', checkedAt: null },
  { group: 'A+', facility: 'Benki ya Damu ya Mfano B', place: 'Mwanza', units: 5, source: 'synthetic', checkedAt: null },
  { group: 'B+', facility: 'Benki ya Damu ya Mfano C', place: 'Dodoma', units: 2, source: 'synthetic', checkedAt: null },
  { group: 'AB+', facility: 'Benki ya Damu ya Mfano A', place: 'Dar es Salaam', units: 1, source: 'synthetic', checkedAt: null },
  { group: 'A-', facility: 'Benki ya Damu ya Mfano D', place: 'Arusha', units: 0, source: 'synthetic', checkedAt: null }
];

export const ARTICLES = [
  { id: 'a1', cat: 'emergency', minutes: 3, title: P('Kujua dalili za dharura', 'Recognising emergency signs'),
    summary: P('Dalili zipi zinahitaji msaada wa haraka — na nini cha kufanya kabla ya kufika kituo.',
      'Which signs need urgent help — and what to do before reaching a facility.'),
    body: P('Maandishi haya ni kiolekezo cha jumla cha mfano. Kama mtu ana ugumu wa kupumua, maumivu ya kifua, kutokwa na damu nyingi au kupoteza fahamu, piga nambari ya dharura ya eneo lako au mpeleke kituo cha afya haraka iwezekanavyo. Usisubiri dalili kuwa mbaya.',
      'This is general sample guidance. If someone has difficulty breathing, chest pain, heavy bleeding or loss of consciousness, call your local emergency number or get them to a facility as fast as possible. Do not wait for symptoms to worsen.'),
    related: ['a2', 'a5'], author: P('Timu ya maudhui ya mfano', 'Sample content team'), reviewed: null },
  { id: 'a2', cat: 'medication', minutes: 4, title: P('Kutumia dawa kwa usalama', 'Using medicines safely'),
    summary: P('Rekodi kila dozi, na usibadilishe kipimo bila mtaalamu.', 'Log every dose, and never change a dose without a professional.'),
    body: P('Weka kumbukumbu ya dozi ulizotumia. Ikiwa umesahau dozi, usiongeze mara mbili — wasiliana na mtoa huduma anayekuhudumia. Orodha ya dawa kwenye kifaa hiki ni msaidizi wa kumbukumbu, si ushauri wa matibabu.',
      'Keep a log of doses taken. If you miss a dose, do not double up — contact the professional who prescribed it. The list on this device is a memory aid, not medical advice.'),
    related: ['a3'], author: P('Timu ya maudhui ya mfano', 'Sample content team'), reviewed: null },
  { id: 'a3', cat: 'maternal', minutes: 5, title: P('Ziara za kliniki wakati wa ujauzito', 'Antenatal clinic visits'),
    summary: P('Kwa nini ufuatiliaji wa mara kwa mara unasaidia.', 'Why regular follow-up helps.'),
    body: P('Ufuatiliaji wa ujauzito husaidia kubaini changamoto mapema. Hifadhi kadi yako ya kliniki na ulete pamoja na dawa zilizoandikwa. Hii ni elimu ya jumla; fuata maelekezo ya mtoa huduma wako.',
      'Antenatal follow-up helps identify problems early. Keep your clinic card and bring prescriptions with you. This is general education; follow your own provider\'s instructions.'),
    related: ['a1'], author: P('Timu ya maudhui ya mfano', 'Sample content team'), reviewed: null },
  { id: 'a4', cat: 'chronic', minutes: 6, title: P('Kuishi na ugonjwa sugu', 'Living with a chronic condition'),
    summary: P('Ratiba, rekodi na mawasiliano na timu yako ya afya.', 'Routine, records and staying in touch with your care team.'),
    body: P('Andika vipimo na dalili unazoziona, na ziwasilishe kwa mtoa huduma wako kwenye miadi. Rekodi za kifaa hiki ni msaidizi wa mazungumzo, si uamuzi wa matibabu.',
      'Note measurements and symptoms you notice, and bring them to your appointment. Records on this device support the conversation; they do not replace a clinical decision.'),
    related: ['a2'], author: P('Timu ya maudhui ya mfano', 'Sample content team'), reviewed: null },
  { id: 'a5', cat: 'firstaid', minutes: 4, title: P('Msaada wa kwanza: kanuni za msingi', 'First aid: the basics'),
    summary: P('Usalama wako kwanza, kisha piga simu, kisha saidia.', 'Your safety first, then call, then help.'),
    body: P('Hakikisha eneo ni salama kabla ya kusaidia. Piga nambari ya dharura. Usimpe mtu aliyepoteza fahamu kitu chochote kinywani. Nambari za dharura za Tanzania zilizoorodheshwa kwenye app hii ni 112, 114 na 110 — thibitisha nambari sahihi ya eneo lako.',
      'Make sure the scene is safe before helping. Call the emergency number. Never put anything in the mouth of someone who is unconscious. This app lists Tanzania emergency numbers 112, 114 and 110 — confirm the right number for your area.'),
    related: ['a1'], author: P('Timu ya maudhui ya mfano', 'Sample content team'), reviewed: null },
  { id: 'a6', cat: 'prevention', minutes: 3, title: P('Kuzuia maambukizi ya kawaida', 'Preventing common infections'),
    summary: P('Mikono safi, maji salama, chanjo kwa wakati.', 'Clean hands, safe water, timely vaccination.'),
    body: P('Kunawa mikono kwa maji na sabuni, kunywa maji salama na kufuata ratiba ya chanjo hupunguza maambukizi mengi. Hii ni elimu ya jumla, si ushauri wa kibinafsi.',
      'Handwashing with soap, safe drinking water and keeping to the vaccination schedule reduce many infections. This is general education, not personal advice.'),
    related: ['a3'], author: P('Timu ya maudhui ya mfano', 'Sample content team'), reviewed: null }
];

export const EDU_CATEGORIES = [
  { id: 'all', sw: 'Zote', en: 'All' },
  { id: 'emergency', sw: 'Dharura', en: 'Emergency' },
  { id: 'medication', sw: 'Dawa', en: 'Medication' },
  { id: 'maternal', sw: 'Mama na mtoto', en: 'Maternal' },
  { id: 'chronic', sw: 'Magonjwa sugu', en: 'Chronic' },
  { id: 'firstaid', sw: 'Msaada wa kwanza', en: 'First aid' },
  { id: 'prevention', sw: 'Kinga', en: 'Prevention' }
];

export const QR_SCOPES = [
  { id: 'identity', sw: 'Jina na umri', en: 'Name and age' },
  { id: 'blood', sw: 'Kundi la damu', en: 'Blood group' },
  { id: 'allergies', sw: 'Mzio', en: 'Allergies' },
  { id: 'conditions', sw: 'Magonjwa sugu', en: 'Chronic conditions' },
  { id: 'meds', sw: 'Dawa za sasa', en: 'Current medication' },
  { id: 'contacts', sw: 'Watu wa dharura', en: 'Emergency contacts' }
];

export const APPT_STATUS = {
  requested: { sw: 'Imeombwa', en: 'Requested', tone: 'info' },
  confirmed: { sw: 'Imethibitishwa', en: 'Confirmed', tone: 'ok' },
  reschedule: { sw: 'Ombi la kubadilisha', en: 'Reschedule requested', tone: 'warn' },
  cancelled: { sw: 'Imeghairiwa', en: 'Cancelled', tone: 'neutral' },
  completed: { sw: 'Imekamilika', en: 'Completed', tone: 'ok' }
};

export const CASE_STATUS = {
  open: { sw: 'Wazi', en: 'Open', tone: 'info' },
  discussion: { sw: 'Inajadiliwa', en: 'In discussion', tone: 'ok' },
  escalated: { sw: 'Imepandishwa', en: 'Escalated', tone: 'warn' },
  closed: { sw: 'Imefungwa', en: 'Closed', tone: 'neutral' }
};

export const REFERRAL_STATUS = {
  draft: { sw: 'Rasimu', en: 'Draft', tone: 'neutral' },
  ready: { sw: 'Tayari — haijawasilishwa', en: 'Ready — not delivered', tone: 'warn' },
  accepted: { sw: 'Imekubaliwa (kifaa hiki)', en: 'Accepted (this device)', tone: 'ok' },
  declined: { sw: 'Imekataliwa (kifaa hiki)', en: 'Declined (this device)', tone: 'danger' },
  closed: { sw: 'Imefungwa', en: 'Closed', tone: 'neutral' }
};

export const EMERGENCY_TYPES = [
  { id: 'accident', icon: 'i-car', sw: 'Ajali', en: 'Accident' },
  { id: 'breathing', icon: 'i-activity', sw: 'Ugumu wa kupumua', en: 'Breathing difficulty' },
  { id: 'bleeding', icon: 'i-droplet', sw: 'Kutokwa na damu', en: 'Bleeding' },
  { id: 'unconscious', icon: 'i-moon', sw: 'Kupoteza fahamu', en: 'Unconscious' },
  { id: 'pregnancy', icon: 'i-baby', sw: 'Dharura ya ujauzito', en: 'Pregnancy emergency' },
  { id: 'other', icon: 'i-alert-triangle', sw: 'Nyingine', en: 'Other' }
];
