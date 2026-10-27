# `src/mocks/` — the only simulated seam in GuardHai

Everything else in `src/` is real code. This folder exists for the integrations
that **do not exist yet** and cannot be written from the client alone:

| mock file        | stands in for                                   | status        |
|------------------|-------------------------------------------------|---------------|
| `sos.js`         | SOS dispatch to police / ambulance / guardians   | not connected |
| `push.js`        | push notification service (FCM / APNs)           | not connected |
| `ble.js`         | Bluetooth companion pairing                      | not connected |
| `guardians.js`   | guardian roster + approvals API                  | not connected |
| `transport.js`   | REST transport for `dataDriver: 'mock'`          | simulated     |

## Rules this folder follows

1. **A mock never reports success.** Every call resolves with
   `{ ok: false, simulated: true, reason: 'not-connected' }` (or an empty list).
   The UI can then render the honest "not connected" state instead of a fake one.
2. **Mocks are never imported by domain, data or service code.** Only the
   feature/engine layer may call them, and only to produce a truthful status.
3. **Nothing here is persisted.** No fake guardians, no fake devices, no fake
   deliveries are written to storage, so a user can never find invented data.
4. When a real backend arrives, delete the matching file and point the caller at
   `services/` instead. The interfaces are intentionally tiny for that reason.
