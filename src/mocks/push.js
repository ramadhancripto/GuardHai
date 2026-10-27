/**
 * GuardHai · mocks/push.js
 * Stand-in for remote push (FCM/APNs). Browser Notification permission is real
 * and lives in engines/shield/remote-shield.js; delivery to another device is
 * not, so nothing is sent here.
 */
export const pushStatus = Object.freeze({
  connected: false,
  provider: null,
  reason: 'not-connected'
});

export async function registerDevice() {
  return { ok: false, simulated: true, reason: 'not-connected', token: null };
}

export async function sendPush(_payload) {
  return { ok: false, simulated: true, reason: 'not-connected', delivered: 0 };
}
