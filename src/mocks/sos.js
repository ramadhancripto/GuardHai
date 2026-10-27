/**
 * GuardHai · mocks/sos.js
 * Stand-in for emergency dispatch. No SMS gateway, no call API and no operator
 * console exist, so this module cannot deliver anything — it only tells the
 * truth in a predictable shape.
 *
 * Real implementation would POST to a dispatch service with the incident
 * payload, return a case id, and be idempotent per incident.
 */
export const sosStatus = Object.freeze({
  connected: false,
  channel: null,
  reason: 'not-connected',
  detail: 'Hakuna huduma ya dharura iliyounganishwa (polisi, ambulance, walezi).'
});

const history = [];

export async function dispatchSOS(payload = {}) {
  const attempt = {
    id: `sos_${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    kind: payload.kind || 'manual',
    location: payload.location || null,
    simulated: true,
    ok: false,
    reason: 'not-connected'
  };
  history.push(attempt);
  if (history.length > 20) history.shift();
  return attempt;
}

export const attempts = () => history.slice();
export const lastAttempt = () => history[history.length - 1] || null;
