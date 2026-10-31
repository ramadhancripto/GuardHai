# GuardHai Health — Phase 2 delivery

**Status: built, tested, screens captured. Not deployed — waiting for Phase 8 approval.**

This document is the audit summary, screen map, honesty record and test report for
the Health section as it now stands inside the existing GuardHai app.

---

## 1. What changed, in one page

| Before (P1) | Now (P2) |
|---|---|
| Six partitions with descriptive "module cards" and phase labels | 37 working screens across 6 partitions, all interactive |
| Data layer existed but no screen used it | Every screen reads/writes the device-local store |
| Actions handled by 600-line panel file | One dispatcher (`health-actions.js`) + five domain screen modules |
| Store was a single 997-line file | Split into state / records / network / services / catalog / seed (all ≤ 300 lines) |
| `verify_app.py` failed checks 7 and 8 | **12/12 checks pass** (wording + file size both clean) |
| No sub-screen navigation | Persistent partition tabs + back button + focus/scroll management |

Nothing was removed from the product: the five-item bottom navigation, the SOS slot,
the Health header, the demo/label banner and the six tabs are all unchanged. Ten
other suites (home, composer, bugfix, profile, showcase, refine, posttypes, hero,
identity) still pass.

---

## 2. Audit summary (what the brief asked for first)

**Existing pieces reused**
- `index.html` Health block: header, profile pill, sample banner, hero, 6-tab
  tablist, panel hosts — kept and driven by script instead of hard-coded markup.
- `assets/css/00-tokens.css` tokens (`--gh-*`), one icon sprite (96 symbols),
  existing sheet (`src/ui/sheet.js`), existing SOS numbers (`src/features/emergency/sos.js`).
- i18n dictionary (`src/i18n/i18n.js`) for the shell strings; new screen copy is
  written bilingually in code (`L(sw, en)`), so it re-renders on `guardhai:lang`.

**Gaps found and closed**
1. No interactive screens — panels described modules instead of running them.
2. No internal routing, so "open a record" or "reply to a case" had nowhere to go.
3. Validation existed in the store but no UI to surface it inline.
4. No empty/loading/error/offline/permission states on any Health screen.
5. `health-view.js` had grown past 600 lines and mixed routing, rendering and events.

**Deliberate non-goals**
- No new dependencies, no new collections in Firebase, no schema change, no network
  call. QR rendering is a labelled preview because shipping a QR encoder would be a
  new dependency with no connected verifier to use it.

---

## 3. Design system applied

| Token role | Value / rule |
|---|---|
| Canvas | `--gh-canvas` off-white, white cards, hairline `--gh-line` borders |
| Primary | `--gh-green-ink` #0B7A5F for text/filled buttons (5.3:1 on white); `--gh-green` #18A982 for marks, meters, icons only |
| Information / professional | `--gh-blue` + `--gh-blue-soft` (callouts, professional network) |
| Emergency | `--gh-red` + `--gh-red-soft`, only on the emergency paths and destructive confirms |
| Radius ladder | 8 / 12 / 18 / 24 px, pill for chips and buttons |
| Type | one scale (22 → 18 → 15.5 → 14 → 13 → 11.6 → 9.6), weights 500–800 |
| Icons | one stroke family (sprite `#i-*`), no emoji anywhere |
| Spacing | 4 → 48 px 8pt rhythm; 44 px minimum touch target |

**Internal navigation.** The six partitions stay as a scrollable tab strip on every
screen (active tab scrolls itself into view); sub-screens add a back button in a
consistent header block, and the hero only appears on *Muhtasari* so detail screens
open at content. Back always returns to the owning partition, never to Home.

**Components added** (section 22 of `15-health.css`): search row, flash banner,
callout, chip row, sub-head, text button, inline errors, choice cards, switches,
article list, QR panel, emergency band, profile options, icon button, a11y and
narrow-phone layouts.

---

## 4. Screen map

### Partition 1 — Muhtasari / Overview
| Screen | Purpose |
|---|---|
| `overview` panel | Completeness, today's doses, next appointment, records; Medical ID card; four quick services; network entry points; device-only activity log |

### Partition 2 — Kadi ya afya / Medical ID
| Screen | Purpose |
|---|---|
| `medical-profile` | Stored details, emergency contacts, QR state, honesty legend |
| `medical-edit` | Full form with validation (name, DOB, sex, blood group, weight, height, allergies, conditions, notes) |
| `medical-contacts` | Add/remove emergency contacts, phone validation, "never dialled" note |
| `medical-qr` | Scope selection, access window, token preview, revoke, previous links, explicit "no health data inside" |

### Partition 3 — Rekodi / Records
| Screen | Purpose |
|---|---|
| `records` panel | Search + category filter, rows with source chips, add CTA |
| `record-new` | Title, category, date, facility (optional), summary, local file attach |
| `record-view` | Category, date, facility (or "none stated"), source, added timestamp, delete with confirm |

### Partition 4 — Dawa / Medication
| Screen | Purpose |
|---|---|
| `meds` panel | Today's schedule with take/skip/change, adherence meter, medicine list |
| `med-new` | Name, dose, times (HH:MM list), start/end, instructions, label photo |
| `med-view` | Details, today's doses, dose history, inline edit, delete |
| `med-history` | Full self-reported dose log |

### Partition 5 — Wataalamu / Professionals
| Screen | Purpose |
|---|---|
| `experts` panel | Doctor search entry, appointments, five network entry points, verification state |
| `doctors` | Free-text + specialty filter over 6 sample profiles |
| `doctor-view` | Profile, sample licence, "not verified" state, request appointment, referral |
| `appointments` | All requests with status chips |
| `appt-new` | Doctor, date, time, consultation type, reason |
| `appt-view` | Status timeline, "Confirmed by: nobody", reschedule/cancel |
| `appt-reschedule` | New date/time → status `reschedule` |
| `cases` / `case-new` / `case-view` | Peer case discussions, replies with stance, escalate/close, closing summary |
| `meetings` / `meeting-new` / `meeting-view` | Schedule, agenda, notes, outcomes, follow-ups, "no invitation sent" |
| `communities` / `community-view` | 7 communities, join/leave, posts, report |
| `referrals` / `referral-new` / `referral-view` | Draft → ready → accepted/declined, always `delivered: false` |
| `pro` | Professional profile, documents (marked not uploaded), submit for review → `pending-review` |

### Partition 6 — Zaidi / More
| Screen | Purpose |
|---|---|
| `more` panel | Blood, emergency, education, notifications, settings, limits, data controls |
| `blood` | Group + place search, sample rows with source/time, user report form |
| `emergency` | Real numbers as `tel:` links, prepared-summary list, "no dispatch" statement |
| `emergency-new` | Type chooser, note, share toggles (medical ID, location) |
| `emergency-review` | Exactly what would be shared, location capture (with permission), save |
| `emergency-view` | `transmitted: false`, `dispatched: false`, contacts marked "not called", history, cancel |
| `education` / `article-view` | 6 sample articles, category filter, unverified source/reviewer disclosed |
| `notifications` | Device-created notices, mark all read |
| `settings` | Language, larger text, reduced motion, four disabled+labelled notification switches, privacy, data controls |
| `about` | "What works" vs "what is not connected" table, data locality, emergency numbers |

---

## 5. The twelve flows (all exercised by `tests/health.spec.js`)

1. **Medical ID** — edit → validate → save → detail reflects values (HG7–HG10).
2. **Emergency contacts** — bad phone rejected, valid saved, removable (HG11–HG12).
3. **QR access** — scope required → token created → revoke (HG13–HG15).
4. **Records** — validation, self-entered source, detail metadata, filters, delete (HG16–HG19).
5. **Medication** — time validation, schedule, dose log as self-reported, undo, edit, delete (HG20–HG25).
6. **Find a doctor → request appointment** — filters, sample profile, `requested` only, reschedule, cancel (HG26–HG31).
7. **Case discussion** — summary length rule, reply moves to discussion, close (HG32–HG34).
8. **Meetings** — schedule, no invitations, notes and follow-ups persist (HG35–HG36).
9. **Communities** — join, post, report, all local (HG37).
10. **Referrals** — reason required, draft, ready ≠ delivered, respond locally (HG38–HG39).
11. **Professional verification** — submit → `pending-review`, never "verified" (HG40).
12. **Blood + emergency + education + settings** — sample listings, honest permission denial, honest non-transmission, source disclosure, labelled switches (HG41–HG48).

Cross-cutting: no dead buttons, no overflow at 360 px, labels and accessible names,
sw/en re-render, persistence across reload, zero console errors (HG49–HG54).

---

## 6. Honesty record

| Risk | What the app does |
|---|---|
| Fake patient data | Default store is **empty**; samples appear only after "Weka sampuli" and each row is tagged **Sampuli**; `clearSamples()` removes only synthetic rows |
| Fake facilities/professionals | Every name is "Dkt. Mfano A", "Kituo cha Mfano A"; directory states "no real professional is represented" |
| Fake lab results | Records are labelled *Nimeweka mwenyewe* (self-entered); detail lists "facility: none stated" and the added timestamp |
| Fake blood stock | Rows are "Orodha ya mfano" with "time not verified"; user reports become "Ripoti ya mtumiaji" |
| QR encoding health data | Token is `gh-xxxxxxxx` (random handle) + scopes + expiry. **No name, no blood group, no records** inside. Payload asserted in HG14 |
| QR as identity proof | Every QR screen says the code does not verify identity; no "verified" state exists |
| Transmission / dispatch | `createEmergency` sets `transmitted: false`, `dispatched: false`, `confirmedBy: null`; the view repeats it and the call buttons are plain `tel:` links |
| Appointment confirmation | `updateAppointment(id, 'confirm')` returns `{ ok: false, error: 'requires-professional' }`; UI never prints "Imethibitishwa" for a user action |
| Reminders / invites / delivery | `invitationsSent: false`, `delivered: false`, `reminded` never set; the four notification switches are **disabled** and labelled "haitumiki bado" |
| Verification badges | Store caps at `pending-review`; `verificationNote()` can only render not-submitted / awaiting-reviewer / rejected |
| Secure server storage | No network code in the section; header and every detail screen state "kwenye kifaa hiki pekee" / "hakuna seva iliyounganishwa" |

---

## 7. Unconnected integrations (complete list)

Ambulance/dispatch · emergency call placement · SMS/email/push · appointment booking
and confirmation · facility directory · laboratory/records exchange · blood-bank
inventory · reminders · professional licence verification · document upload ·
moderation/reporting backend · cross-device sync · accounts for dependants beyond
this device · QR verification endpoint (the payload is a handle, nothing resolves it).

---

## 8. Data model and privacy review

- One versioned key: `localStorage['guardhai_health_store_v1']`, plus
  `guardhai_health_tab` (last partition only — no health content).
- Nothing is read from or written to the network; no analytics, no third-party calls
  added. Existing CDN font/Leaflet usage is untouched.
- Files (record attachments, medicine labels, certificates) are **metadata only**:
  name, size and type are stored; bytes never leave the file input.
- Location is requested only when the person taps "Tafuta eneo langu", is stored
  with the draft, and denial is reported without capturing coordinates (HG45).
- Audit log (60 entries, device-local) records saves, deletions, QR issue/revoke and
  sample seeding — it is not transmitted.
- Erase-all clears the key and returns the section to its empty state.

---

## 9. Accessibility and responsive behaviour

- Every input has a `<label for>`; icon-only buttons carry `aria-label` (HG51).
- Tabs implement roving tabindex + ←/→/Home/End; focus moves to the first invalid
  field on submit; `aria-invalid` set; errors are inline and text-based.
- Live regions: panel host is `aria-live="polite"`, `aria-busy` cleared after paint.
- Contrast: primary CTA 5.3:1; danger text uses #8E1D13 on `--gh-red-soft`.
- Layouts checked at 360 / 390 / 834 / 1200 px — no horizontal overflow, desktop
  grid widens to 4 columns instead of stretching rows (HG50).
- Larger-text and reduced-motion settings actually change the section.

---

## 10. Test results (run, not inferred)

| Gate | Command | Result |
|---|---|---|
| Static integrity | `python3 tools/verify_app.py` | **12/12** (wording and file-size checks now pass) |
| Health suite | `node tests/health.spec.js` | **54/54** |
| Home | `tests/home.spec.js` | 62/62 |
| Composer | `tests/composer.spec.js` | 72/72 |
| Bug-fix | `tests/bugfix.spec.js` | 23/23 |
| Profile | `tests/profile.spec.js` | 20/20 |
| Showcase | `tests/showcase.spec.js` | 20/20 |
| Refine | `tests/refine.spec.js` | 29/29 |
| Post types | `tests/posttypes.spec.js` | 33/33 |
| Hero | `tests/hero.spec.js` | 23/23 |
| Identity | `tests/identity.spec.js` | 25/25 |

Full gate: `bash tools/run_tests.sh 8123` → verify **12/12**, all ten suites green.

**Not run / not covered**
- No real-device pass (iOS Safari / low-end Android), only Chromium at 4 widths.
- No screen-reader pass (VoiceOver/TalkBack) — labels and ARIA were checked
  programmatically, not by ear.
- No offline test beyond "no network code exists"; there is no service worker.
- No load test: the store is a single localStorage object, fine for prototype volume.
- Geolocation success path not automated (denial path is).

---

## 11. Files

**Added**
```
src/features/health/health-ui.js                 shared copy, escape, primitives, view state
src/features/health/health-panels.js             the six partitions
src/features/health/health-screens-personal.js   Medical ID, contacts, QR, records, medication
src/features/health/health-screens-care.js       professionals, appointments
src/features/health/health-screens-network.js    cases, meetings, communities, referrals, profile
src/features/health/health-screens-services.js   blood, emergency, education, settings, about
src/features/health/health-routes.js             screen registry
src/features/health/health-state.js              persistence, profiles, audit, sample reset
src/features/health/health-record-store.js       medical, QR, records, meds, appointments
src/features/health/health-network-store.js      clinical network data
src/features/health/health-services-store.js     blood, emergency, prefs, overview
src/features/health/health-catalog.js            synthetic reference data + status vocabulary
src/features/health/health-seed.js               labelled sample content
docs/HEALTH-P2.md                                this document
docs/screens/health-p2-01…34*.png                34 screenshots
```

**Rewritten**
```
src/features/health/health-view.js    shell, paint pipeline, events, public API
src/features/health/health-actions.js single action/form dispatcher
src/features/health/health-store.js   barrel (exports + Store aggregate)
tests/health.spec.js                  new 54-check suite
```

**Removed (superseded, no product behaviour lost)**
```
health-runtime.js, health-kit.js, health-modules.js,
health-screens-clinical.js, health-screens-rooms.js
```

**Touched outside the section**
```
index.html            hero CTAs and eyebrow wired to i18n; duplicate health avatar removed
src/i18n/i18n.js      +2 keys (gh_health_cta_medical, gh_health_cta_doctors), 123 keys, sw/en parity
assets/css/15-health.css  section 22 (screen kit) + narrow-phone fixes
docs/TEST-LOG.md      N6 entry for this run
```

---

## 12. How Health integrates with the rest of the app

- Entry points unchanged: `#tab-health` in the bottom nav and the Home quick action.
- `src/features/home/home-controller.js` still calls `initHealth()` exactly once; the
  module wires delegated listeners on `document` guarded to `#healthPage` / `#ghSheet`.
- Emergency paths share the real numbers from `src/features/emergency/sos.js` but are
  visually and functionally separate from the global SOS button (unchanged).
- No Firebase, no collections, no schema, no new dependency.

---

## 13. Open items for Phase 8 approval

1. Deploy (or not) — nothing has been pushed; no build step exists.
2. Decide whether a QR encoder and a real verification endpoint justify new
   dependencies; today the code is honest about both being absent.
3. Decide whether the sample directory should be replaced by a real facility feed
   (needs a data source + consent/privacy review).
4. Real-device and screen-reader passes.

---

## 10. Muonekano v3 — mpangilio wa kimatibabu (2026-10-31)

Safu ya mwisho ya `assets/css/15-health.css` (§9) ni mfumo mmoja wa kuona.
Haibadilishi data, hakuna huduma mpya — muonekano na mpangilio pekee.

### 10.1 Rangi ina maana

| Rangi | Maana ya kimatibabu | Inaonekana wapi |
|---|---|---|
| **green** `#0E9B78` | utambulisho, usalama | wasifu wa kitaalamu, mtaalamu, elimu, jamii |
| **teal** `#0D8D9E` | kadi ya afya, majadiliano | Medical ID, kesi, mikutano |
| **blue** `#2563EB` | miadi | miadi, ratiba, ombi |
| **violet** `#7C53E0` | rekodi, nyaraka | rekodi, QR, damu, jamii |
| **amber** `#B7791F` | dawa, tahadhari | ratiba ya dozi, rufaa, arifa |
| **red** `#DC2626` | dharura **pekee** | dharura, watu wa dharura |
| **slate** `#5B7180` | kifaa / huduma zisizounganishwa | mipangilio, mipaka |

Hakuna hex kwenye markup: kila kitu kinatumia `data-tone` → `--hx-tone`,
`--hx-soft`, `--hx-ink2`. Sub-screen inarithi rangi yake kupitia
`[data-health-screen="…"]`, kwa hiyo skrini ya rekodi ni violet kabla ya
kusoma neno lolote.

### 10.2 Mpangilio

* **Tabs** grid 3×2 kwenye simu → mstari mmoja ≥720 px. Awali mstari wa
  mlalo ulikatwa nusu (Rekodi/Dawa/Wataalamu/Zaidi zilionekana nusu).
* **Stat tiles** nukta ya rangi, lebo, namba (tabular), mstari mmoja; 2 → 4.
* **Block** kichwa chenye ikoni ya rangi; nukuu (`note`) chini yenye mstari
  mtupu — haisongani na maudhui.
* **Rows** grid `ikoni · copy · hesabu · kitendo`; kitendo hakiishwi
  (`white-space: nowrap`) — awali "Nimeitumia", "Funga", "Nimeruka"
  zilikatwa kwa nusu.
* **progressRow()** mpya: lebo + asilimia juu, meter chini.
* **Medical ID** kichwa cha gradient, `facts` 2 → 4 safu, vitendo 1 → 2 → 3.
* **Empty states** `.is-inline`: mstari mmoja ndani ya kadi, si monument.
* **dl** lebo juu / thamani chini, mstari mwembamba — kama chati ya matibabu.
* **Settings** hali ya switch iko chini ya lebo yake, haipangwi kando.
* **Legend** ikoni imefungwa kwenye mstari wa kwanza (awali ilikuwa peke yake).

### 10.3 Uthibitisho

```
bash tools/run_tests.sh 8123    13 suites · 509 checks · all green
python3 tools/verify_app.py     12/12
```
Picha mpya: `docs/screens/h1-01-overview-390 … h1-07-overview-1280`.
