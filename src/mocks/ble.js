/**
 * GuardHai · mocks/ble.js
 * Stand-in for pairing a Bluetooth companion (band, key fob, vehicle unit).
 * Web Bluetooth exists in browsers, but there is no companion protocol to talk
 * to, so discovery returns an empty list instead of invented devices.
 */
export const bleStatus = Object.freeze({
  supported: typeof navigator !== 'undefined' && !!navigator.bluetooth,
  connected: false,
  reason: 'not-connected'
});

export async function scan() {
  return { ok: false, simulated: true, reason: 'not-connected', devices: [] };
}

export async function connect(_deviceId) {
  return { ok: false, simulated: true, reason: 'not-connected' };
}
