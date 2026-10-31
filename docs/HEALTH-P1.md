# GuardHai Health — P1 foundation

Status: **P1 complete and verified** (2026-10-27). P2–P6 are not built yet.
No deployment, no backend, no health data stored anywhere.

## 1. What was there before

| Area | Before P1 |
| --- | --- |
| Afya tab | `HomeUI.go('health')` opened the **Shield screen** and switched to its `Protection Health` sub-tab (`#protect-view-health`) — a *system* health panel (Bluetooth, heartbeat engine, battery), not a personal health section |
| Health page | did not exist; there was no `#healthPage` |
| Bottom navigation | 5 items (`tab-home`, `tab-health`, `tab-sos`, `tab-shield`, `tab-chat`), `switchTab()` toggles `.page-container.active` |
| Design tokens | `00-tokens.css` (colours, spacing, radii, type, icon scale, identity gradient) + `14-identity.css` |
| Storage | IndexedDB for posts/drafts/profiles/media/comments — **no health store** |
| Auth | local demo register/login; Firebase bridge optional and CDN-only |

The Shield screen keeps its `Protection Health` sub-tab unchanged; it answers a
different question (is the protection engine running?) and is not duplicated in
the new section.

## 2. What P1 added

* **`#healthPage`** — a real screen in `index.html`, so `switchTab('health')`
  resolves to `healthPage` without touching `tabs.js`.
* **Header** — `GuardHai Health` + health mark (identity band) + the existing
  notifications sheet (reused, not rebuilt).
* **Introduction panel** — the agreed copy *“Afya yako, sehemu moja.”* /
  *“Taarifa za afya, huduma na maandalizi ya dharura.”* with three honesty chips
  (device-only · you decide who sees · no server connected).
* **Six top partitions** — Muhtasari, Kadi ya afya, Rekodi, Dawa, Wataalamu,
  Zaidi. ARIA tablist with `aria-selected` / `aria-controls`, roving `tabindex`,
  ← → Home End keys, and a chips strip that scrolls sideways on phones.
* **Panel content** — every panel is rendered from the registry, shows the real
  empty state, and labels each unbuilt module with its phase and connection
  status. Nothing invents clinical values.
* **Reusable components** — `gh-health-block`, `gh-health-row`,
  `gh-health-card`, `gh-health-chip`, `gh-health-empty` (also used for the error
  state), `gh-health-skeleton` (loading), `gh-health-btn`, `gh-health-list`.
* **Medical SOS sheet** — intentionally separate from the general SOS, reuses the
  one emergency-number list (`NUMBERS` exported from `features/emergency/sos.js`),
  and states “Nothing is being sent / request state: not sent”.

## 3. Files

| File | Change |
| --- | --- |
| `index.html` | new `#healthPage` shell; `<link>` for `15-health.css`; 7 sprite symbols (`i-id-card`, `i-file-medical`, `i-pill`, `i-calendar`, `i-droplet`, `i-first-aid`, `i-phone` — `i-phone` was referenced but missing) |
| `assets/css/15-health.css` | new: Health page, header, intro panel, partitions, panels, states, responsive rules (tokens only) |
| `src/features/health/health-modules.js` | new: partitions, modules, statuses and the P2–P5 **data contracts** (all `store: null`) |
| `src/features/health/health-view.js` | new: rendering, tab logic, keyboard, empty/error/retry, Medical SOS, `window.HealthUI` |
| `src/features/home/home-controller.js` | `case 'health'` now switches to `#healthPage`; `initHealth()` at boot |
| `src/features/emergency/sos.js` | `NUMBERS` exported (single source for emergency numbers) |
| `src/i18n/i18n.js` | 12 `gh_health_*` keys in **both** dictionaries; `setLanguage()` now dispatches `guardhai:lang` so JS-rendered sections re-render |
| `tests/health.spec.js` | new suite, 28 checks (HG1–HG28) |
| `tests/home.spec.js` (D2), `tests/bugfix.spec.js` (R5) | updated for “Afya opens its own screen” |
| `tools/run_tests.sh` | health suite added |

## 4. Data contracts (P2–P5) — planned, not built

`HEALTH_CONTRACTS` in `health-modules.js` records, per module, the fields that
will be needed and the rule that must hold before any real data is stored:

| Contract | Key rule |
| --- | --- |
| `medicalId` | blood group is `self-declared` or `verified` — never “verified” without a source; QR carries a short-lived token, never the record; sharing enforced server-side |
| `records` | every record has date + type + source + verification state; attachments stay on the device until an encrypted upload path is reviewed |
| `medications` | a photo is user-attached evidence, **never** proof a dose was swallowed; no dose changes, no prescriptions |
| `experts` | no “verified” badge without a licence check against the issuing body |
| `blood` | availability always shows source + timestamp; unverified data says so |
| `medicalSos` | delivery state is “sent/received” only when a real channel confirms it |

All six have `store: null`; a test (HG25) fails if a module ever claims a store
before the contract is reviewed.

## 5. What is real vs. what is a prototype

**Real (works today):** navigation, partitions, keyboard access, language
switching, empty/error/retry states, notifications sheet, general SOS, phone
`tel:` links, `sessionStorage` remembering only the chosen partition id.

**Prototype / not connected:** every health module (Medical ID, records,
medication, appointments, experts, blood services, Medical SOS delivery). They
render what the registry says — phase + “not connected” — and no data is stored,
sent or shared. There is no health table, no encryption story and no permission
layer yet.

## 6. Legal / privacy gate before P5

Tanzania’s Personal Data Protection Act (2022) and its health-data rules apply
once real patient data or real providers are involved. Before any real service
goes live: data-protection impact assessment, lawful basis, retention policy,
audit trail, encryption at rest/in transit, a processor agreement with every
provider, and a review of the eHealth/health-records guidance in force at that
time. **None of this is implemented — the section must stay device-only until it
is.** This is a note for the project owner, not legal advice.

## 7. Next step before P2

1. Agree the storage decision for Medical ID (device-only vs. server) and write
   the field/locale list; P2 must not start before that is signed off.
2. Add the permission + audit model for sharing (QR access tokens, expiry,
   revocation) — it gates both P2 and P5.
3. Only then build the Medical ID form, validation and confirmation UI.
