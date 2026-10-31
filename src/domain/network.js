/**
 * GuardHai · domain/network.js
 * Rules for the Communication & Support Network. No DOM, no storage — this file
 * only answers three questions: what is allowed, what is valid, what does it mean.
 *
 * Two separations run through the whole module and must not be blurred:
 *
 *   ROLE         what someone is allowed to do here (community member, moderator…)
 *   VERIFICATION whether an authority actually checked a licence/institution
 *
 * And a third, for guardians:
 *
 *   FRIEND       someone you talk to
 *   GUARDIAN     someone you explicitly authorised, who explicitly accepted
 */

/* ------------------------------------------------------------------ limits */
export const LIMITS = Object.freeze({
  messageMax: 2000,
  messageMin: 1,
  groupTitleMin: 3,
  groupTitleMax: 60,
  groupMaxMembers: 50,
  communityName: { min: 3, max: 60 },
  communityAbout: { min: 20, max: 600 },
  communityRulesMax: 1000,
  postTitle: { min: 3, max: 120 },
  postBody: { min: 2, max: 4000 },
  comment: { min: 1, max: 1200 },
  requestSubject: { min: 6, max: 120 },
  requestBody: { min: 20, max: 2000 },
  reportDetail: { min: 0, max: 600 },
  appealReason: { min: 20, max: 800 },
  attachmentMaxBytes: 8 * 1024 * 1024,
  rate: Object.freeze({
    message: { max: 30, windowMs: 60 * 1000 },
    report: { max: 10, windowMs: 60 * 60 * 1000 },
    request: { max: 5, windowMs: 60 * 60 * 1000 },
    community: { max: 3, windowMs: 24 * 60 * 60 * 1000 }
  })
});

/* -------------------------------------------------------------- guardians */
export const GUARDIAN_ROLES = Object.freeze({
  primary: {
    id: 'primary', label: 'Mlezi mkuu', en: 'Primary guardian', icon: 'i-shield-check',
    blurb: 'Mtu wa kwanza kupigiwa simu na kupokea taarifa za dharura.'
  },
  backup: {
    id: 'backup', label: 'Mlezi msaidizi', en: 'Backup guardian', icon: 'i-users',
    blurb: 'Anachukua nafasi ya mlezi mkuu asipopatikana.'
  },
  family: {
    id: 'family', label: 'Ndugu / familia', en: 'Family guardian', icon: 'i-heart',
    blurb: 'Ndugu anayefahamu hali yako na anayeweza kusaidia.'
  },
  professional: {
    id: 'professional', label: 'Mtaalamu', en: 'Professional guardian', icon: 'i-bag',
    blurb: 'Mtaalamu aliyekubali kuwa mlezi — si uthibitisho wa leseni.'
  }
});

export const GUARDIAN_ROLE_ORDER = Object.freeze(['primary', 'backup', 'family', 'professional']);

export const GUARDIAN_PERMISSIONS = Object.freeze({
  sos_alerts: { id: 'sos_alerts', label: 'Taarifa za SOS', en: 'SOS alerts', risk: 'high',
    blurb: 'Anapokea taarifa ukituma SOS. Uwasilishaji unahitaji seva.' },
  live_location: { id: 'live_location', label: 'Mahali wakati wa dharura', en: 'Location during emergencies', risk: 'high',
    blurb: 'Anaweza kuona eneo uliloshiriki kwenye ombi la dharura.' },
  health_summary: { id: 'health_summary', label: 'Muhtasari wa afya', en: 'Health summary', risk: 'high',
    blurb: 'Anaona muhtasari uliochagua (kundi la damu, mzio).' },
  checkins: { id: 'checkins', label: 'Ukaguzi wa hali', en: 'Check-ins', risk: 'low',
    blurb: 'Anakuwekea ukaguzi wa “uko salama?”.' },
  device_status: { id: 'device_status', label: 'Hali ya kifaa', en: 'Device status', risk: 'medium',
    blurb: 'Anaona kama kifaa kiko salama au kimefungwa.' },
  emergency_contact: { id: 'emergency_contact', label: 'Namba ya dharura', en: 'Emergency contact', risk: 'medium',
    blurb: 'Anatumika kama mtu wa kuwasiliana naye wakati wa dharura.' }
});

export const GUARDIAN_PERMISSION_KEYS = Object.freeze(Object.keys(GUARDIAN_PERMISSIONS));

/** What each role starts with. Every key can be overridden per relationship. */
export const GUARDIAN_ROLE_DEFAULTS = Object.freeze({
  primary: { sos_alerts: true, live_location: true, health_summary: true, checkins: true, device_status: true, emergency_contact: true },
  backup: { sos_alerts: true, live_location: false, health_summary: true, checkins: true, device_status: false, emergency_contact: true },
  family: { sos_alerts: true, live_location: false, health_summary: false, checkins: true, device_status: false, emergency_contact: true },
  professional: { sos_alerts: false, live_location: false, health_summary: false, checkins: false, device_status: false, emergency_contact: false }
});

export const GUARDIAN_STATUS = Object.freeze({
  sent: { id: 'sent', label: 'Mwaliko umetumwa', tone: 'info',
    blurb: 'Umemwalika. Hakuwa mlezi hadi akubali.' },
  received: { id: 'received', label: 'Mwaliko wako', tone: 'warn',
    blurb: 'Mtu mwingine anakualika kuwa mlezi wake. Unachagua.' },
  active: { id: 'active', label: 'Mlezi aliyekubaliwa', tone: 'ok',
    blurb: 'Ulikubali na yeye alikubali — mahusiano yanaendelea.' },
  declined: { id: 'declined', label: 'Umekataliwa', tone: 'muted',
    blurb: 'Mwaliko haukukubaliwa. Hakuna ruhusa iliyotolewa.' },
  revoked: { id: 'revoked', label: 'Ruhusa imeondolewa', tone: 'muted',
    blurb: 'Mahusiano yamefungwa; ruhusa zote zimeondolewa.' }
});

export const guardianshipPermissions = (role, overrides = {}) => ({
  ...(GUARDIAN_ROLE_DEFAULTS[role] || GUARDIAN_ROLE_DEFAULTS.backup),
  ...overrides
});

/** an active relationship is the ONLY thing that grants any guardian permission */
export const guardianCan = (relationship, permission) => {
  if (!relationship || relationship.status !== 'active') return false;
  return !!(relationship.permissions || {})[permission];
};

/* ------------------------------------------------------------- communities */
export const COMMUNITY_TYPES = Object.freeze({
  public: {
    id: 'public', label: 'Jamii ya wazi', en: 'Public community', icon: 'i-globe', tone: 'ok',
    join: 'open',
    blurb: 'Mtu yeyote anaweza kujiunga; machapisho yanaonekana kwa wanachama.'
  },
  private: {
    id: 'private', label: 'Jamii ya faragha', en: 'Private community', icon: 'i-lock', tone: 'info',
    join: 'approval',
    blurb: 'Kujiunga kunahitaji idhini; yaliyomo hayanaonekana nje.'
  },
  local: {
    id: 'local', label: 'Jamii ya eneo', en: 'Local community', icon: 'i-map-pin', tone: 'warn',
    join: 'approval',
    blurb: 'Jamii ya mtaa au wilaya; uanachama unahitaji idhini.'
  },
  professional: {
    id: 'professional', label: 'Jamii ya wataalamu', en: 'Professional community', icon: 'i-bag', tone: 'info',
    join: 'approval',
    blurb: 'Wataalamu na taasisi. Uthibitisho huonyeshwa tofauti na uanachama.'
  }
});

export const COMMUNITY_TYPE_ORDER = Object.freeze(['public', 'private', 'local', 'professional']);

export const COMMUNITY_ROLES = Object.freeze({
  founder: { id: 'founder', label: 'Mwanzilishi', rank: 4, icon: 'i-star' },
  admin: { id: 'admin', label: 'Msimamizi', rank: 3, icon: 'i-shield-check' },
  moderator: { id: 'moderator', label: 'Msimamizi wa mijadala', rank: 2, icon: 'i-flag' },
  contributor: { id: 'contributor', label: 'Mchangiaji kitaalamu', rank: 1, icon: 'i-bag' },
  member: { id: 'member', label: 'Mwanachama', rank: 0, icon: 'i-user' }
});

export const COMMUNITY_ROLE_ORDER = Object.freeze(['founder', 'admin', 'moderator', 'contributor', 'member']);

export const COMMUNITY_PERMISSIONS = Object.freeze({
  post: 'Kuchapisha mijadala',
  comment: 'Kujibu na kuchangia',
  react: 'Kupenda na kushiriki',
  invite: 'Kualika wanachama',
  approve_members: 'Kuidhinisha wanachama',
  assign_roles: 'Kubadili majukumu',
  remove_member: 'Kuondoa wanachama',
  edit_community: 'Kuhariri jamii',
  delete_community: 'Kufuta jamii',
  moderate_posts: 'Kusimamia machapisho',
  manage_events: 'Kusimamia matukio',
  manage_resources: 'Kusimamia maktaba',
  manage_requests: 'Kujibu maombi ya msaada',
  view_audit: 'Kuona kumbukumbu',
  handle_appeals: 'Kushughulikia rufaa',
  transfer_ownership: 'Kuhamisha umiliki'
});

const ALL_COMMUNITY_PERMISSIONS = Object.keys(COMMUNITY_PERMISSIONS);

export const COMMUNITY_ROLE_PERMISSIONS = Object.freeze({
  founder: ALL_COMMUNITY_PERMISSIONS,
  admin: ALL_COMMUNITY_PERMISSIONS.filter((p) => p !== 'delete_community' && p !== 'transfer_ownership'),
  moderator: ['post', 'comment', 'react', 'approve_members', 'moderate_posts', 'manage_requests', 'manage_events', 'view_audit'],
  contributor: ['post', 'comment', 'react', 'manage_resources', 'manage_events'],
  member: ['post', 'comment', 'react']
});

export const communityCan = (role, permission) =>
  (COMMUNITY_ROLE_PERMISSIONS[role] || COMMUNITY_ROLE_PERMISSIONS.member).includes(permission);

export const communityRoleAtLeast = (role, minRole) =>
  (COMMUNITY_ROLES[role]?.rank ?? -1) >= (COMMUNITY_ROLES[minRole]?.rank ?? 99);

export const MEMBERSHIP_STATUS = Object.freeze({
  pending: { id: 'pending', label: 'Inasubiri idhini', tone: 'warn' },
  active: { id: 'active', label: 'Mwanachama', tone: 'ok' },
  invited: { id: 'invited', label: 'Umealikwa', tone: 'info' },
  rejected: { id: 'rejected', label: 'Imekataliwa', tone: 'muted' },
  left: { id: 'left', label: 'Umeondoka', tone: 'muted' },
  removed: { id: 'removed', label: 'Umeondolewa', tone: 'muted' },
  banned: { id: 'banned', label: 'Umezuiwa', tone: 'danger' }
});

export const POST_KINDS = Object.freeze({
  discussion: { id: 'discussion', label: 'Mjadala', icon: 'i-message', needsApproval: false },
  resource: { id: 'resource', label: 'Elimu', icon: 'i-book', needsApproval: false },
  event: { id: 'event', label: 'Tukio', icon: 'i-calendar', needsApproval: false },
  help: { id: 'help', label: 'Ombi la msaada', icon: 'i-info', needsApproval: false },
  announcement: { id: 'announcement', label: 'Tangazo', icon: 'i-bell', needsApproval: true }
});

/* ----------------------------------------------------------------- support */
export const SUPPORT_CATEGORIES = Object.freeze({
  personal_safety: { id: 'personal_safety', label: 'Usalama wa mtu', en: 'Personal safety', icon: 'i-shield', tone: 'safety' },
  health: { id: 'health', label: 'Afya', en: 'Health', icon: 'i-heart-pulse', tone: 'health' },
  psychological: { id: 'psychological', label: 'Msaada wa kisaikolojia', en: 'Psychological', icon: 'i-lightbulb', tone: 'calm' },
  family_social: { id: 'family_social', label: 'Familia na jamii', en: 'Family & social', icon: 'i-users', tone: 'family' },
  legal: { id: 'legal', label: 'Msaada wa kisheria', en: 'Legal', icon: 'i-book-open', tone: 'legal' },
  community: { id: 'community', label: 'Msaada wa kijamii', en: 'Community', icon: 'i-globe', tone: 'community' },
  technical: { id: 'technical', label: 'Msaada wa kiufundi', en: 'Technical', icon: 'i-settings', tone: 'tech' }
});

export const SUPPORT_CATEGORY_ORDER = Object.freeze([
  'personal_safety', 'health', 'psychological', 'family_social', 'legal', 'community', 'technical'
]);

export const PROVIDER_KINDS = Object.freeze({
  individual: { id: 'individual', label: 'Mtu binafsi' },
  community: { id: 'community', label: 'Jamii' },
  professional: { id: 'professional', label: 'Mtaalamu' },
  institution: { id: 'institution', label: 'Taasisi' }
});

export const REQUEST_STATUS = Object.freeze({
  submitted: { id: 'submitted', label: 'Imeandikwa', tone: 'warn',
    blurb: 'Imehifadhiwa kwenye kifaa. Hakuna mtoa huduma aliyeifizisha.' },
  routed: { id: 'routed', label: 'Imepelekwa', tone: 'info',
    blurb: 'Imeondolewa kwenye kifaa kuelekea mtoa huduma.' },
  acknowledged: { id: 'acknowledged', label: 'Imetambuliwa', tone: 'info', blurb: 'Mtoa huduma ameona ombi.' },
  in_progress: { id: 'in_progress', label: 'Inashughulikiwa', tone: 'info', blurb: 'Mtoa huduma anajibu.' },
  resolved: { id: 'resolved', label: 'Imetatuliwa', tone: 'ok', blurb: 'Mtoa huduma amefunga ombi.' },
  closed: { id: 'closed', label: 'Imefungwa', tone: 'muted', blurb: 'Ombi limefungwa.' },
  cancelled: { id: 'cancelled', label: 'Imeghairiwa', tone: 'muted', blurb: 'Umeghairi ombi.' }
});

export const SUPPORT_URGENCY = Object.freeze({
  normal: { id: 'normal', label: 'Kawaida', tone: 'muted' },
  soon: { id: 'soon', label: 'Hivi karibuni', tone: 'warn' },
  urgent: { id: 'urgent', label: 'Haraka', tone: 'danger' }
});

/* ------------------------------------------------------------------ safety */
export const REPORT_REASONS = Object.freeze({
  harassment: { id: 'harassment', label: 'Unyanyasaji au vitisho' },
  spam: { id: 'spam', label: 'Uchakachuaji / spam' },
  scam: { id: 'scam', label: 'Utapeli au fedha' },
  impersonation: { id: 'impersonation', label: 'Kujifanya mtu mwingine' },
  unsafe: { id: 'unsafe', label: 'Maudhui hatarishi' },
  other: { id: 'other', label: 'Nyingine' }
});

export const REPORT_SUBJECTS = Object.freeze({
  user: 'Mtumiaji',
  message: 'Ujumbe',
  post: 'Chapisho',
  community: 'Jamii',
  provider: 'Mtoa huduma',
  incident: 'Tukio la usalama binafsi'
});

export const MODERATION_ACTIONS = Object.freeze({
  none: { id: 'none', label: 'Hakuna hatua', tone: 'muted' },
  hidden: { id: 'hidden', label: 'Maudhui yamefichwa', tone: 'warn' },
  removed: { id: 'removed', label: 'Maudhui yameondolewa', tone: 'danger' },
  warned: { id: 'warned', label: 'Onyo limetolewa', tone: 'warn' },
  muted: { id: 'muted', label: 'Mwanachama amezuiwa kuandika', tone: 'danger' },
  dismissed: { id: 'dismissed', label: 'Ripoti imekataliwa', tone: 'muted' }
});

export const APPEAL_STATUS = Object.freeze({
  open: { id: 'open', label: 'Rufaa imefunguliwa', tone: 'warn' },
  upheld: { id: 'upheld', label: 'Rufaa imekubaliwa', tone: 'ok' },
  rejected: { id: 'rejected', label: 'Rufaa imekataliwa', tone: 'muted' }
});

/* ------------------------------------------------------------- validation */
const str = (v) => String(v ?? '').trim();

export function validateText(value, { min = 1, max = 500, field = 'Maudhui' } = {}) {
  const text = str(value);
  if (text.length < min) return { ok: false, field, message: `${field}: andika angalau herufi ${min}.` };
  if (text.length > max) return { ok: false, field, message: `${field}: usizidi herufi ${max}.` };
  return { ok: true, value: text };
}

export function validateMessage(text, kind = 'text') {
  const value = str(text);
  if (kind !== 'text') return { ok: true, value };
  if (!value.length) return { ok: false, field: 'Ujumbe', message: 'Ujumbe hauwezi kuwa tupu.' };
  if (value.length > LIMITS.messageMax) {
    return { ok: false, field: 'Ujumbe', message: `Ujumbe ni mrefu mno (kiwango ${LIMITS.messageMax}).` };
  }
  return { ok: true, value };
}

export function validateGroupTitle(title) {
  return validateText(title, { min: LIMITS.groupTitleMin, max: LIMITS.groupTitleMax, field: 'Jina la kikundi' });
}

export function validateCommunity(draft) {
  const name = validateText(draft.name, { min: LIMITS.communityName.min, max: LIMITS.communityName.max, field: 'Jina la jamii' });
  if (!name.ok) return name;
  const about = validateText(draft.about, { min: LIMITS.communityAbout.min, max: LIMITS.communityAbout.max, field: 'Maelezo' });
  if (!about.ok) return about;
  if (!COMMUNITY_TYPES[draft.type]) {
    return { ok: false, field: 'Aina', message: 'Chagua aina ya jamii.' };
  }
  return { ok: true, value: { name: name.value, about: about.value, type: draft.type } };
}

export function validatePost(draft) {
  const title = validateText(draft.title, { min: LIMITS.postTitle.min, max: LIMITS.postTitle.max, field: 'Kichwa' });
  if (!title.ok) return title;
  const body = validateText(draft.body, { min: LIMITS.postBody.min, max: LIMITS.postBody.max, field: 'Maudhui' });
  if (!body.ok) return body;
  return { ok: true, value: { title: title.value, body: body.value } };
}

export function validateSupportRequest(draft) {
  if (!SUPPORT_CATEGORIES[draft.category]) {
    return { ok: false, field: 'Kundi', message: 'Chagua kundi la msaada.' };
  }
  const subject = validateText(draft.subject, { min: LIMITS.requestSubject.min, max: LIMITS.requestSubject.max, field: 'Kichwa' });
  if (!subject.ok) return subject;
  const body = validateText(draft.body, { min: LIMITS.requestBody.min, max: LIMITS.requestBody.max, field: 'Maelezo' });
  if (!body.ok) return body;
  return { ok: true, value: { subject: subject.value, body: body.value, category: draft.category } };
}

export function validateReport(draft) {
  if (!REPORT_REASONS[draft.reason]) return { ok: false, field: 'Sababu', message: 'Chagua sababu ya ripoti.' };
  const detail = validateText(draft.detail || '', { min: LIMITS.reportDetail.min, max: LIMITS.reportDetail.max, field: 'Maelezo' });
  if (!detail.ok) return detail;
  return { ok: true, value: { reason: draft.reason, detail: detail.value } };
}

export function validateAppeal(draft) {
  const reason = validateText(draft.reason, { min: LIMITS.appealReason.min, max: LIMITS.appealReason.max, field: 'Sababu ya rufaa' });
  if (!reason.ok) return reason;
  return { ok: true, value: { reason: reason.value } };
}

/* ------------------------------------------------------------------ limits */
/**
 * A real, local rate limiter. It is not a security boundary against a hostile
 * client (there is no server yet), but it prevents accidental floods from this
 * device and makes the limit visible instead of silent.
 */
const hits = new Map();

export function rateLimit(kind, key = 'self') {
  const rule = LIMITS.rate[kind];
  if (!rule) return { ok: true };
  const bucket = `${kind}:${key}`;
  const now = Date.now();
  const list = (hits.get(bucket) || []).filter((t) => now - t < rule.windowMs);
  if (list.length >= rule.max) {
    const waitMs = rule.windowMs - (now - list[0]);
    return {
      ok: false,
      retryInMs: waitMs,
      message: `Kiwango kimefikiwa: ${rule.max} kwa dakika ${Math.round(rule.windowMs / 60000) || 1}. Subiri sekunde ${Math.ceil(waitMs / 1000)}.`
    };
  }
  list.push(now);
  hits.set(bucket, list);
  return { ok: true, remaining: rule.max - list.length };
}

export const resetRateLimits = () => hits.clear();
