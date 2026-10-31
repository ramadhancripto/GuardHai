# GuardHai — Complete System Redesign, Phase R1

**Delivered on the real project, tested, nothing deployed.**
Date: 2026-10-31 · Scope: architecture, navigation, Shield Center, SOS, Personal
Safety, the GDS design system, and the audit of everything else.

Companion documents:
- `docs/REDESIGN-AUDIT.md` — the "before" picture, measured (findings F1–F10).
- `docs/DESIGN-SYSTEM.md` — GDS v1 reference (tokens, components, rules, contrast).
- `docs/screens/r1-01…20*.png` — 20 screenshots of what shipped.

---

## 1. What changed, in one page

| Before | Now |
|---|---|
| Tapping **Ulinzi** dropped you into a 10-tab device console | **Shield Center** opens on a dashboard: what is on, what needs attention, where to go next |
| Personal Safety did not exist as a surface | **7 working screens** on a new on-device store (journeys, check-ins, plans, incidents, preferences) |
| **SOS** was a modal sheet only | **SOS is a page**: two modes, three tap-to-call numbers above the fold, honest "what is sent" table, attempt log |
| Screens claimed *"PROTECTION ENGINE RUNNING"*, *"Confidence Index 100 %"*, *"● Device Guardian Engine Active"* in the sidebar | every indicator read from a real store at paint time; **zero decorative green** |
| Four card families, four button families, 462 inline styles | **one namespaced system** (`gds-*`), 750 lines, 204 lines of primitives |
| Body text at 9–10.5 px on Shield | type floor **11.6 px**, body 14 px on every redesigned surface |
| Sidebar drawer repeated Home / Shield / Map / Logout | drawer holds only what the bottom nav does **not** (map, profile, settings, language, sign-out) |
| Asset protection implied by the brief, absent in the product | **declared pending** in-product, with what it will need |

Preserved, untouched and still green: the **Device Protection engine** (16 modules,
10 sub-views, 3 pillars), **Health** (6 partitions / 37 screens), **Chat** (5
partitions / 22 screens), the **5-item bottom navigation** with its raised SOS,
Feed, Composer, Profile, and all 26 IndexedDB collections.

---

## 2. The new information architecture

```
Home    hero · SOS card · 6 quick actions · Uwanja feed

Afya    Overview · Medical ID · Records · Medication · Professionals · More      (unchanged)

SOS     Dharura yangu | Tahadhari ya maafa
        → numbers (112 / 114 / 110) → kind → record → what is sent → guardians → log

Shield  ┌ Muhtasari     dashboard: status rows, attention list, six module tiles
        ├ Kifaa         Device Protection: Protect (10 views) · Find · Recover   (preserved)
        ├ Usalama binafsi  Guardians · Journey · Check-in · Plans · Incidents · Preferences
        ├ Kidijitali   storage · capability · export · erase
        ├ Mali         declared pending (no invented register)
        ├ Historia     one merged timeline of every real record
        └ Mipangilio   persisted switches + app sheets

Chat    Chats · Guardians · Support · Communities · Discover                     (unchanged)
```

Top bar keeps its fixed order: **Storage · Notifications · Account · More**.
"More" keeps Map / profile / language / sign-out; the drawer duplicates nothing.

**Why a tab strip instead of a hub of cards:** at 360–390 px a strip of seven
chips shows three and scrolls; a hub of six large cards costs a full screen before
any content. The strip is the same control Health and Chat already use, so the
product now has **one navigation pattern inside sections** instead of three.

---

## 3. Shield Center, screen by screen

### 3.1 Muhtasari (dashboard)
Answers three questions in order:
1. **Emergency?** — a red panel with one action (`Fungua SOS`).
2. **What is on?** — four status rows, each with a written state: registered
   devices, Bluetooth (Web BT present or not), server (none), active guardians.
3. **What needs attention?** — a list built from real data: overdue journey, no
   accepted guardian, no check-in today, unreviewed incident reports.
4. **Where next?** — six module tiles (Device, Personal, Digital, Assets, History,
   Settings), each with a one-line truth (`Haipo kwenye toleo hili` for Assets).
Closing honesty ledger: *on this device · no server*.

### 3.2 Kifaa — Device Protection (preserved)
The existing console, unchanged: 3 pillars, 10 sub-views, the engine's own
dashboard, sensitivity/radius controls, live diagnostics. It now sits behind the
`Kifaa` tab instead of being the first thing you see. The engine keeps its own
`switchShieldPillar()` / `ProtectEngine.switchSubTab()` API — verified by SC7–SC9.

### 3.3 Usalama binafsi — Personal Safety
| Screen | What actually works |
|---|---|
| Home | live summary (guardians, journey, check-in, plans) + attention list + six tools |
| Guardians | reads the real guardianship store; split into active / pending / received; invitation and permissions delegate to **Chat → Guardians** (one source of truth) |
| Journey | start with a return window (30 min–4 h), live "45 min left" / overdue, close safely or cancel, history |
| Check-in | one-tap feeling + note, streak counter, history |
| Plans | three templates (night travel, health emergency, lost device), free steps, detail view, delete |
| Incidents | kind + narrative (min. 10 words), stored in the shared report queue as `subjectType: incident`, marked unreviewed |
| Preferences | four switches, one of them **refuses to turn on without a server** and says why |

### 3.4 Kidijitali — Digital Security
Real storage estimate, HTTPS/BLE/notification capability, JSON export built on the
device, and an erase flow with a second explicit confirmation.

### 3.5 Mali — Asset Protection
Not built, and it says so: *"we will not show an asset register that cannot be
verified"*, plus what it would need. Alternative path offered (Device → Recover).

### 3.6 Historia — Security History
One timeline merging SOS attempts, incidents, journeys, check-ins, plans and
guardian changes, plus the audit log. Every row is a stored record.

### 3.7 Mipangilio — Security Settings
The switches that exist, the app sheets (storage / notifications / account /
language), and an explicit note that Shield settings do not change device
protection.

---

## 4. SOS

Two modes because they are two different promises:
**Dharura yangu** (one person in danger now) and **Tahadhari ya maafa** (flood,
quake, storm, fire — a community warning).

- The three published numbers (112 police, 114 ambulance, 110 police TTCL) are
  the **first block**, each a 64 px `tel:` row; measured above the fold at 390 px
  (SC31) and without horizontal overflow at 360 px (SC41).
- A "what GuardHai sends" table: police/hospital message — none; guardians — none;
  attempt record — this device. Then the sentence that matters: *the phone is the
  only channel that works*.
- Recording an attempt writes a real row (`delivered: false`,
  `reason: not-connected`) and lists it under *Majaribio ya hivi karibuni*.
- The old quick sheet is still one tap away for in-flow SOS (hero, chat), with the
  same honest copy — one handler (`sos.js`), no drift.
- The bottom-nav slot now opens the **page** (`GHSosPage.open()`), so SOS is
  reachable, linkable and printable instead of a transient modal.

---

## 5. Design system

`17-system.css` — 750 lines, everything namespaced `gds-`. Full reference in
`docs/DESIGN-SYSTEM.md`. Highlights:

- **Tokens** for ground, meaning, geometry, type, rhythm, motion, tap size.
- **22 components**: page, stack, grid, section, head, back, tabs, card (+4 tones),
  rows, tile-card, tile, chip (+5 tones), stats, meter, table, timeline, avatar,
  btn (+6 tones), fields, switch, empty, alert (+4 tones), skeleton, emergency,
  call row, mode chooser, ledger.
- **Contrast documented** for every shipped pair; white-on-green is restricted to
  filled buttons ≥ 15 px bold.
- **Reduced motion** honoured globally.
- `shield-ui.js` (204 lines) is the only place that builds markup, so no screen can
  invent a class or an inline colour.

---

## 6. Files

**Added**
```
assets/css/17-system.css                     750  GDS v1 (tokens + components)
src/features/shield/shield-ui.js             204  markup primitives (GDS only)
src/features/shield/shield-center.js         563  shell, dashboard, digital, assets, history, settings, dispatcher
src/features/shield/shield-personal.js       359  Personal Safety · 7 screens
src/features/emergency/sos-page.js           254  SOS page (two modes, numbers, log)
src/services/personal-safety.service.js      400  journeys, check-ins, plans, incidents, prefs, SOS records, history, capabilities
tests/shield.spec.js                         505  45 checks (SC1–SC45)
docs/REDESIGN-AUDIT.md                             audit: inventory + findings F1–F10 + decisions D1–D10
docs/DESIGN-SYSTEM.md                              GDS v1 reference
docs/REDESIGN-R1.md                                this document
docs/screens/r1-01…20*.png                         20 screenshots (16 at 390×844 @2x,
                                                    2 at 1280×900, 2 at 768×1024)
```

**Modified**
```
index.html          Shield page shell (head, 7 tabs, 7 views, #shieldStage),
                    new #sosPage, SOS nav slot → GHSosPage.open(),
                    sidebar drawer no longer duplicates navigation,
                    +12 sprite icons, 17-system.css link, +25 ids (375 total)
src/data/db.js      DB_VERSION 3 → 4, +5 stores (safetyJourneys, safetyCheckins,
                    safetyPlans, safetyPrefs, sosAttempts)
src/domain/network.js  +1 report subject: incident
src/features/home/home-controller.js  shield → ShieldCenter.paint(), new 'sos' route,
                    goFind() → ShieldCenter.go('device') + Find pillar
src/main.js         boots initShield() and initSosPage()
src/i18n/i18n.js    +2 keys (gh_shield_title, gh_shield_sub) → 130, sw/en parity
assets/css/14-identity.css  comment only (band kept, I11 still compares like with like)
tools/run_tests.sh  gate gains the shield suite (12 suites)
tests/home.spec.js     C2 now asserts the SOS page (SOS became a page)
tests/bugfix.spec.js   B4 reads the SOS page or the sheet
```

**Not touched** (by decision): `src/engines/shield/*`, `src/features/health/*`,
`src/features/network/*`, feed, composer, profile, services for chat/guardian/
support/community/safety/discover/transport.

---

## 7. Testing

`bash tools/run_tests.sh 8123` → **RESULT: all checks passed**

| Suite | Result |
|---|---|
| `tools/verify_app.py` | **12/12** · 375 ids · 130 i18n keys · 69 inline handlers bridged · no module > 600 lines |
| home | 62/62 |
| composer | 72/72 |
| bugfix | 23/23 |
| profile | 20/20 |
| showcase | 20/20 |
| refine | 29/29 |
| posttypes | 33/33 |
| hero | 23/23 |
| identity | 25/25 |
| health | 54/54 |
| network | 65/65 |
| **shield (new)** | **45/45** |

**What `shield.spec.js` proves (SC1–SC45)** — structure: Shield opens on the
dashboard, 7 sections in order, one selected, dashboard carries no invented score;
Device Protection preserved (3 pillars / 10 sub-views / engine still switches its
own tabs); Find and Recover open. Personal Safety: six tools listed, a short
journey name is refused, a valid journey stores with a return time, check-in
stores once, a plan template prefills ≥ 3 steps and persists, an incident under 10
words is refused and a valid one is stored unreviewed. Preferences: a toggle writes
through, sharing with guardians **cannot** be enabled without a server, the
disabled switch is visibly disabled, and preferences, journeys, check-ins, plans
and incidents all survive a **reload** (IndexedDB v4). Digital: real storage and
capability, export produces `guardhai-safety-YYYY-MM-DD.json`, erase demands a
second confirmation and cancelling keeps the data. Assets: declared pending, no
invented register. History: merges the events created during the run. SOS: page
opens, three `tel:` rows ≥ 44 px all above the fold at 390 px, two modes, no claim
of having sent anything, disaster mode swaps the kinds, a recorded attempt is
stored as **not delivered**, the quick sheet still works. Cross-cutting: bottom nav
unchanged (5 slots + raised SOS), every visible control has an accessible name and
is ≥ 32 px, no horizontal overflow at 360 / 390 / 768 / 1024 / 1280, language
switch repaints the tabs, Health and Chat still mount, no page or console errors.

---

## 8. Limitations

**Design decisions that are deliberate, not gaps**
1. **Asset Protection is not built.** A register of assets without a verification
   path is a false promise; the section says so and offers the device path instead.
2. **Migration is section by section.** Chat, Health, Home and the Feed still use
   their previous class families. One shared token file (`00-tokens.css`) keeps
   them visually compatible, but a screenshot of Chat and a screenshot of Shield
   will not look *identical* until their sheets move to GDS.
3. **The legacy Device Protection panels keep their dark blocks and 10 px labels.**
   The brief says do not redesign completed work; they now sit behind a calm frame
   instead. Their contrast still deserves a dedicated pass. Inside Shield this is
   the **only** surface still on the old language — opening `Kifaa` visibly changes
   typography and contrast compared with the other six sections.
4. **The bottom nav stays a bottom bar on desktop.** It is the product's identity;
   the desktop change is content width and column count, not a nav rail.

**Technical limitations**
5. No real transport: nothing leaves the device. Journeys, check-ins, SOS and
   guardian notices cannot reach anybody — every surface says so.
6. BLE is only real inside a Capacitor/Chrome shell with Web Bluetooth; in a plain
   browser the capability row says *missing* and the engine falls back.
7. Check-in reminders are in-app only; there is no service worker, so no OS-level
   reminder while the app is closed.
8. Export is JSON (complete, portable). PDF/medical-summary export is not built.
9. No real-device pass (iOS Safari / low-end Android) and no screen-reader pass —
   accessibility was verified programmatically (names, targets, contrast maths),
   not by ear.
10. The seven-tab strip is one chip too wide for 360 px; it scrolls with the active
    tab auto-centred, which is correct but not as instantly scannable as five.

---

## 9. Recommended next phase (R2)

1. **Migrate Chat to GDS** (it is the second-largest surface and the one users
   live in): tab strip → `.gds-tabs`, rows → `.gds-row`, chips → `.gds-chip`,
   sheets → `.gds-card`. Keep `network.spec.js` at 65/65 throughout.
2. **Guardian authority, for real**: register a transport (WebSocket or Firebase),
   wire journey-overdue and SOS record to `transport.send`, then flip
   `shareWithGuardians` from "refuses" to "available" — one switch, already
   modelled.
3. **Home on GDS**: the greeting + hero + SOS + quick actions are the last
   "three heavy blocks before content" screen. One hero, one SOS band, one action
   row, then the feed.
4. **Device Protection contrast pass**: keep every behaviour, lift the 9–10 px
   labels and the dark panels to the GDS contrast table.
5. **Accessibility on a real device**: VoiceOver/TalkBack pass over Shield, SOS
   and Chat; add a skip link and a "reduce data" mode (the map already loads
   lazily-behind-a-gesture candidate).
6. **Asset Protection**, only when there is a verification partner (insurer,
   police report number, or serial-number registry) — design the flow around that
   partner rather than around the UI.
