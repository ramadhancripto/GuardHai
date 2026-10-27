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
    initials: 'NM', type: 'elimu', topic: 'afya',
    timeLabel: 'Saa 2 zilizopita', location: 'Dar es Salaam',
    source: { label: 'Hospitali ya Rufaa Temeke (sampuli)' },
    eventAt: '10 Mei 2025',
    safetySteps: [
      'Chanjo ni salama na yenye ufanisi.',
      'Inapatikana katika vituo vya afya.',
      'Husaidia kuokoa maisha.'
    ],
    media: [{ id: 'seed-1', kind: 'image', name: 'Kliniki ya jamii',
             url: 'assets/img/post-clinic.jpg' }],
    text: 'Kunywa maji ya kutosha na pumzika unapohisi uchovu wa ghafla. ' +
          'Dalili kama kizunguzungu kinachoendelea dakika 10+ zinahitaji msaada wa kliniki, ' +
          'si kupuuza. Hii ni sampuli ya chapisho la elimu.'
  },
  {
    id: 'sample-crime', sample: true, authorId: 'author-safety',
    authorName: 'Ofc. Baraka Mwakyusa', accountType: 'Usalama · sampuli',
    initials: 'BM', type: 'uzoefu', topic: 'usalama',
    timeLabel: 'Saa 5 zilizopita', location: 'Arusha', media: [],
    eventAt: 'Saa 5 zilizopita',
    safetySteps: [
      'Usibebe simu wazi.',
      'Tumia mifuko yenye zipu.',
      'Kaa macho kwenye usafiri wa masoko.'
    ],
    text: 'Kumbukumbu ya vifaa: andika namba ya serial ya simu na laptop mahali salama. ' +
          'Ikisaidia polisi kuthibitisha umiliki haraka. Sampuli ya chapisho.'
  },
  {
    id: 'sample-digital', sample: true, authorId: 'author-member',
    authorName: 'Asha Juma', accountType: 'Mwanajamii · sampuli',
    initials: 'AJ', type: 'elimu', topic: 'usalama',
    timeLabel: 'Saa 9 zilizopita', location: 'Kijichi',
    safetySteps: [
      'Tumia nenosiri imara.',
      'Usibonyeze viungo vya ajabu.',
      'Weka uthibitisho wa hatua mbili.'
    ],
    media: [{ id: 'seed-2', kind: 'link', url: 'https://guardhai.example/chanzo', title: 'guardhai.example' }],
    text: 'Usitume PIN au OTP kwa mtu yeyote — hata anayedai kuwa afisa wa benki au kampuni. ' +
          'Hakuna taasisi halali inayoomba OTP kwa simu. Sampuli ya chapisho la elimu.'
  },
  {
    id: 'sample-disaster', sample: true, authorId: 'author-volunteer',
    authorName: 'Jumuiya ya Wajitolea Kijichi', accountType: 'Kujitolea · sampuli',
    initials: 'JW', type: 'uzoefu', topic: 'majanga',
    timeLabel: 'Jana', location: 'Dar es Salaam',
    eventAt: 'Jana, 18:40',
    source: { label: 'Jumuiya ya Wajitolea Kijichi (sampuli)' },
    safetySteps: [
      'Epuka maeneo ya mafuriko.',
      'Tumia njia salama.',
      'Wasiliana na mamlaka pale inapowezekana.'
    ],
    alertText: 'Tahadhari (sampuli): epuka maeneo ya mafuriko',
    media: [{ id: 'seed-flood', kind: 'image', name: 'Mtaa uliofurika',
             url: 'assets/img/post-flood.jpg' }],
    text: 'Mkutano wa mazoezi ya kukimbia moto: jifunze njia mbili za kutoka nyumbani kwako ' +
          'na mahali pa kukutana nje. Sampuli ya chapisho.'
  },
  {
    id: 'sample-people', sample: true, authorId: 'author-org',
    authorName: 'Kituo cha Afya Mwanzo', accountType: 'Taasisi · sampuli',
    initials: 'KM', type: 'taarifa', topic: 'taasisi',
    timeLabel: 'Siku 2 zilizopita', location: 'Mwanza',
    contacts: [
      { kind: 'website', label: 'Tovuti', value: 'https://guardhai.example/kituo' },
      { kind: 'phone', label: 'Simu', value: '+255 22 212 0000' }
    ],
    media: [{ id: 'seed-3', kind: 'video', placeholder: true }],
    text: 'Safari za usiku: mjulishe mtu unayemwamini njia na muda wa kuwasili, ' +
          'na tumia njia zenye watu. Sampuli ya chapisho.'
  },
  {
    id: 'sample-health-2', sample: true, authorId: 'author-health',
    authorName: 'Dkt. Neema Mushi', accountType: 'Afya · sampuli',
    initials: 'NM', type: 'swali', topic: 'afya',
    timeLabel: 'Siku 3 zilizopita', media: [],
    text: 'Swali la jamii: ni dalili gani zinakufanya uende hospitali mara moja badala ya ' +
          'kupumzika nyumbani? Jibu linasaidia wengine kujua hatari. Sampuli ya chapisho.'
  },
  {
    id: 'sample-volunteer-2', sample: true, authorId: 'author-volunteer',
    authorName: 'Jumuiya ya Wajitolea Kijichi', accountType: 'Kujitolea · sampuli',
    initials: 'JW', type: 'fursa', topic: 'kusaidiana',
    timeLabel: 'Siku 4 zilizopita', location: 'Kijichi',
    requirements: ['Wajitolea 2 kwa kila mtaa', 'Dakika 60 kwa wiki', 'Simu yenye WhatsApp'],
    contacts: [{ kind: 'phone', label: 'Simu ya uratibu', value: '+255 700 000 000' }],
    media: [{ id: 'seed-vol', kind: 'image', name: 'Wajitolea wakusanya taka',
             url: 'assets/img/post-volunteers.jpg' }],
    text: 'Fursa: tunatafuta wajitolea wawili kwa kila mtaa kwa mpango wa simu za majirani. ' +
          'Sampuli ya chapisho.'
  },
  {
    id: 'sample-safety-2', sample: true, authorId: 'author-safety',
    authorName: 'Ofc. Baraka Mwakyusa', accountType: 'Usalama · sampuli',
    initials: 'BM', type: 'elimu', topic: 'usalama',
    timeLabel: 'Siku 5 zilizopita', media: [],
    safetySteps: [
      'Panga safari kabla ya kuanza.',
      'Mjulishe mtu unayemwamini.',
      'Kaa kwenye maeneo yenye watu.'
    ],
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

/* topic order lives in domain/post.js (single taxonomy) */
export { TOPIC_ORDER } from '../domain/post.js';
