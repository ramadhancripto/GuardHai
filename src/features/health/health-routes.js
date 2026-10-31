/**
 * GuardHai · features/health/health-routes.js
 * One registry for everything inside the Health section: the six partitions and
 * every sub-screen, plus the metadata the shell needs to draw a header.
 *
 * Screens are grouped by domain module so each file stays reviewable:
 *   health-screens-personal.js  Medical ID, contacts, QR, records, medication
 *   health-screens-care.js      professionals and appointments
 *   health-screens-network.js   cases, meetings, communities, referrals, profile
 *   health-screens-services.js  blood, emergency, education, settings, notices
 */

import { PANELS } from './health-panels.js';
import { personalScreens } from './health-screens-personal.js';
import { careScreens } from './health-screens-care.js';
import { networkScreens } from './health-screens-network.js';
import { serviceScreens } from './health-screens-services.js';

export const PARTITIONS = ['overview', 'medical', 'records', 'meds', 'experts', 'more'];

export const SCREENS = Object.assign(
  {},
  personalScreens,
  careScreens,
  networkScreens,
  serviceScreens
);

export const panelFor = (partition) => PANELS[partition] || PANELS.overview;

export const screenMeta = (id) => SCREENS[id] || null;

/** Which partition a screen belongs to — used for the tab state and for back. */
export const tabOf = (id) => {
  const meta = SCREENS[id];
  return meta && PARTITIONS.includes(meta.parent) ? meta.parent : 'overview';
};

export const screenIds = () => Object.keys(SCREENS);
