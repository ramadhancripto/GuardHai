/**
 * GuardHai · data/profiles.js
 * Sample personas that show what each role looks like in the feed.
 *
 * They are fiction and are marked `sample: true`, which forces every badge to
 * render as "Sampuli" — no invented licence, no invented institution. Evidence
 * fields are left empty on purpose so the verification path can be seen to be
 * evidence-driven (see `domain/profile.js`).
 */
import { normalizeProfile } from '../domain/profile.js';

const PEOPLE = [
  {
    id: 'author-health',
    name: 'Dkt. Neema Mushi',
    bio: 'Daktari wa familia, Dar es Salaam. Naeleza dalili za hatari na lini kwenda hospitali.',
    roles: ['health', 'member'],
    topics: ['Afya', 'Lishe', 'Afya ya akili'],
    location: 'Dar es Salaam',
    joinedAt: '2025-11-04T08:00:00.000Z'
  },
  {
    id: 'author-safety',
    name: 'Ofc. Baraka Mwakyusa',
    bio: 'Afisa usalama wa jamii. Ulinzi wa mali, usalama wa njia na kuzuia udanganyifu.',
    roles: ['safety'],
    topics: ['Uhalifu na Mali', 'Usalama wa Watu', 'Kidijitali'],
    location: 'Arusha',
    joinedAt: '2025-09-19T08:00:00.000Z'
  },
  {
    id: 'author-org',
    name: 'Kituo cha Afya Mwanzo',
    bio: 'Kliniki ya jamii. Tunatoa taarifa rasmi za afya na ratiba za kliniki.',
    roles: ['org', 'health'],
    topics: ['Afya', 'Taarifa rasmi'],
    location: 'Mwanza',
    joinedAt: '2025-07-02T08:00:00.000Z'
  },
  {
    id: 'author-volunteer',
    name: 'Jumuiya ya Wajitolea Kijichi',
    bio: 'Wajitolea wa misaada ya jamii: maji, moto, na msaada wa haraka.',
    roles: ['volunteer', 'member'],
    topics: ['Ajali na Majanga', 'Misaada'],
    location: 'Kijichi',
    joinedAt: '2025-12-11T08:00:00.000Z'
  },
  {
    id: 'author-member',
    name: 'Asha Juma',
    bio: 'Mkazi wa Kijamii. Naandika uzoefu wa kila siku na vidokezo vya usalama.',
    roles: ['member'],
    topics: ['Usalama wa Watu', 'Uzoefu'],
    location: 'Kijichi',
    joinedAt: '2026-01-08T08:00:00.000Z'
  }
];

export const SAMPLE_PROFILES = PEOPLE.map((p) => normalizeProfile({
  ...p,
  sample: true,
  verification: { licence: {}, institution: {} }
}));

export const sampleProfileFor = (authorId) =>
  SAMPLE_PROFILES.find((p) => p.id === authorId) || null;
