/**
 * GuardHai · mocks/guardians.js
 * Stand-in for the guardian roster and approval flow. Returns an empty roster
 * on purpose: showing invented guardians would imply that someone is watching.
 */
export async function listGuardians() {
  return { ok: false, simulated: true, reason: 'not-connected', items: [] };
}

export async function inviteGuardian(_email) {
  return { ok: false, simulated: true, reason: 'not-connected' };
}

export async function requestApproval(_incidentId) {
  return { ok: false, simulated: true, reason: 'not-connected', approvals: [] };
}
