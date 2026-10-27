/**
 * GuardHai · data/seed-posts.js
 * Placeholder content for an empty feed. These rows are NEVER written to
 * storage and always render with a visible "Sampuli" badge — they exist so a
 * first-time user sees what the feed is for. Real posts live in IndexedDB
 * (see posts.repo).
 *
 * `authorId` points at the sample personas in ./profiles.js, so tapping an
 * author opens a profile with a role accent instead of a dead end.
 */
import { normalizePost } from '../domain/post.js';

const RAW = [
  {
    id: 'sample-health', sample: true, authorId: 'author-health',
    authorName: 'Dkt. Neema Mushi', accountType: 'Afya · sampuli',
    initials: 'NM', type: 'elimu', topic: 'health', topicLabel: 'Afya',
    timeLabel: 'Saa 2 zilizopita',
    media: [{ id: 'seed-1', kind: 'image', placeholder: true }],
    text: 'Kunywa maji ya kutosha na pumzika unapohisi uchovu wa ghafla. ' +
          'Dalili kama kizunguzungu kinachoendelea dakika 10+ zinahitaji msaada wa kliniki, ' +
          'si kupuuza. Hii ni sampuli ya chapisho la elimu.'
  },
  {
    id: 'sample-crime', sample: true, authorId: 'author-safety',
    authorName: 'Ofc. Baraka Mwakyusa', accountType: 'Usalama · sampuli',
    initials: 'BM', type: 'uzoefu', topic: 'crime', topicLabel: 'Uhalifu na Mali',
    timeLabel: 'Saa 5 zilizopita', media: [],
    text: 'Kumbukumbu ya vifaa: andika namba ya serial ya simu na laptop mahali salama. ' +
          'Ikisaidia polisi kuthibitisha umiliki haraka. Sampuli ya chapisho.'
  },
  {
    id: 'sample-digital', sample: true, authorId: 'author-member',
    authorName: 'Asha Juma', accountType: 'Mwanajamii · sampuli',
    initials: 'AJ', type: 'elimu', topic: 'digital', topicLabel: 'Usalama wa Kidijitali',
    timeLabel: 'Saa 9 zilizopita',
    media: [{ id: 'seed-2', kind: 'link', placeholder: true, url: 'https://guardhai.example/chanzo', title: 'guardhai.example' }],
    text: 'Usitume PIN au OTP kwa mtu yeyote — hata anayedai kuwa afisa wa benki au kampuni. ' +
          'Hakuna taasisi halali inayoomba OTP kwa simu. Sampuli ya chapisho la elimu.'
  },
  {
    id: 'sample-disaster', sample: true, authorId: 'author-volunteer',
    authorName: 'Jumuiya ya Wajitolea Kijichi', accountType: 'Kujitolea · sampuli',
    initials: 'JW', type: 'uzoefu', topic: 'disaster', topicLabel: 'Ajali na Majanga',
    timeLabel: 'Jana', media: [],
    text: 'Mkutano wa mazoezi ya kukimbia moto: jifunze njia mbili za kutoka nyumbani kwako ' +
          'na mahali pa kukutana nje. Sampuli ya chapisho.'
  },
  {
    id: 'sample-people', sample: true, authorId: 'author-org',
    authorName: 'Kituo cha Afya Mwanzo', accountType: 'Taasisi · sampuli',
    initials: 'KM', type: 'taarifa', topic: 'people', topicLabel: 'Usalama wa Watu',
    timeLabel: 'Siku 2 zilizopita',
    media: [{ id: 'seed-3', kind: 'video', placeholder: true }],
    text: 'Safari za usiku: mjulishe mtu unayemwamini njia na muda wa kuwasili, ' +
          'na tumia njia zenye watu. Sampuli ya chapisho.'
  },
  {
    id: 'sample-health-2', sample: true, authorId: 'author-health',
    authorName: 'Dkt. Neema Mushi', accountType: 'Afya · sampuli',
    initials: 'NM', type: 'swali', topic: 'health', topicLabel: 'Afya',
    timeLabel: 'Siku 3 zilizopita', media: [],
    text: 'Swali la jamii: ni dalili gani zinakufanya uende hospitali mara moja badala ya ' +
          'kupumzika nyumbani? Jibu linasaidia wengine kujua hatari. Sampuli ya chapisho.'
  },
  {
    id: 'sample-volunteer-2', sample: true, authorId: 'author-volunteer',
    authorName: 'Jumuiya ya Wajitolea Kijichi', accountType: 'Kujitolea · sampuli',
    initials: 'JW', type: 'fursa', topic: 'disaster', topicLabel: 'Ajali na Majanga',
    timeLabel: 'Siku 4 zilizopita', media: [],
    text: 'Fursa: tunatafuta wajitolea wawili kwa kila mtaa kwa mpango wa simu za majirani. ' +
          'Sampuli ya chapisho.'
  },
  {
    id: 'sample-safety-2', sample: true, authorId: 'author-safety',
    authorName: 'Ofc. Baraka Mwakyusa', accountType: 'Usalama · sampuli',
    initials: 'BM', type: 'elimu', topic: 'people', topicLabel: 'Usalama wa Watu',
    timeLabel: 'Siku 5 zilizopita', media: [],
    text: 'Njia salama za usiku: panga safari kabla ya kuanza, mjulishe mtu unayemwamini, ' +
          'na kaa kwenye maeneo yenye watu. Sampuli ya chapisho.'
  }
];

const FIXED_DATE = '2026-10-27T07:00:00.000Z';

export const SAMPLE_POSTS = RAW.map((p) => normalizePost({
  ...p,
  createdAt: FIXED_DATE,
  status: 'published',
  verified: false
}));

export const isSample = (id) => SAMPLE_POSTS.some((p) => p.id === id);

/* topics keep their fixed order in the feed header */
export const TOPIC_ORDER = ['people', 'health', 'crime', 'disaster', 'digital'];
