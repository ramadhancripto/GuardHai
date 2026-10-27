/**
 * GuardHai · data/profiles.js
 * Sample personas that show what each role looks like in the feed.
 *
 * They are fiction and are marked `sample: true`, which forces every badge to
 * render as "Sampuli" — no invented licence, no invented institution. Evidence
 * fields are left empty on purpose so the verification path can be seen to be
 * evidence-driven (see `domain/profile.js`).
 *
 * The professional fields (affiliation, availability, serviceAreas, orgKind,
 * coverage) are fiction for these personas and are shown under the "Sampuli"
 * badge. They are never evidence and never produce a verification badge.
 */
import { normalizeProfile } from '../domain/profile.js';

const PEOPLE = [
  {
    id: 'author-health',
    avatarUrl: 'assets/img/persona-health.jpg',
    coverUrl: 'assets/img/cover-health.jpg',
    name: 'Dkt. Neema Mushi',
    bio: 'Daktari wa familia, Dar es Salaam. Naeleza dalili za hatari na lini kwenda hospitali.',
    roles: ['health', 'member'],
    topics: ['Afya', 'Lishe', 'Afya ya akili'],
    location: 'Dar es Salaam',
    affiliation: 'Hospitali ya Rufaa Temeke',
    availability: '7:00 - 19:00 (Jumatatu - Ijumaa)',
    joinedAt: '2025-11-04T08:00:00.000Z'
  },
  {
    id: 'author-safety',
    avatarUrl: 'assets/img/persona-safety.jpg',
    coverUrl: 'assets/img/cover-safety.jpg',
    name: 'Ofc. Baraka Mwakyusa',
    bio: 'Afisa usalama wa jamii. Ulinzi wa mali, usalama wa njia na kuzuia udanganyifu.',
    roles: ['safety'],
    topics: ['Uhalifu na Mali', 'Usalama wa Watu', 'Kidijitali'],
    location: 'Arusha',
    affiliation: 'Kikosi cha Usalama wa Jamii',
    coverage: 'Kanda ya Kati — Arusha mjini',
    joinedAt: '2025-09-19T08:00:00.000Z'
  },
  {
    id: 'author-org',
    avatarUrl: null,
    coverUrl: 'assets/img/cover-org.jpg',
    name: 'Kituo cha Afya Mwanzo',
    bio: 'Kliniki ya jamii. Tunatoa taarifa rasmi za afya na ratiba za kliniki.',
    roles: ['org', 'health'],
    topics: ['Afya', 'Taarifa rasmi'],
    location: 'Mwanza',
    orgKind: 'Kliniki ya jamii',
    coverage: 'Mwanza — wilaya 4',
    joinedAt: '2025-07-02T08:00:00.000Z'
  },
  {
    id: 'author-volunteer',
    avatarUrl: null,
    coverUrl: 'assets/img/cover-community.jpg',
    name: 'Jumuiya ya Wajitolea Kijichi',
    bio: 'Wajitolea wa misaada ya jamii: maji, moto, na msaada wa haraka.',
    roles: ['volunteer', 'member'],
    topics: ['Ajali na Majanga', 'Misaada'],
    location: 'Kijichi',
    serviceAreas: 'Kijichi, Mbagala, Kigamboni',
    availability: 'Jumamosi na Jumapili, asubuhi',
    joinedAt: '2025-12-11T08:00:00.000Z'
  },
  {
    id: 'author-member',
    avatarUrl: null,
    coverUrl: 'assets/img/cover-community.jpg',
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
