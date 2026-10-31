# GuardHai — Full System Audit (Redesign Phase R1)

**Date:** 2026-10-31 · **Scope:** the whole app as it exists on disk
**Author:** design + engineering lead pass, working directly on the project files.

This is the "before" picture. It is deliberately blunt: the point is to fix what
is weak, not to describe what is nice.

---

## 0. What exists today (measured, not estimated)

| Measure | Value |
|---|---|
| Entry | `index.html` — 2 049 lines, one module entry `src/main.js` |
| Modules | 116 JS files, 371 relative imports, 0 broken |
| CSS | 17 sheets loaded in filename order, ~230 KB |
| Element ids | 350, no duplicates |
| Inline `onclick` handlers | 134 (all bridged to `window`) |
| Inline `style="…"` attributes | 462 in `index.html` |
| i18n | 128 keys, sw/en parity |
| Test suites | 11 + `verify_app.py` (12 static checks) |
| Feature screens | Home (1 feed + 1 profile + composer), Shield (3 pillars / 10 device sub-tabs), Health (6 partitions / 37 screens), Chat (5 partitions / 22 screens), Map (1), Auth (4) |
| Persistence | IndexedDB `guardhai` v3, 26 collections, memory fallback |

Every one of those numbers was read from the workspace, not assumed.

---

## 1. Module inventory — keep / improve / reorganise / new

Legend: **K** keep as-is · **I** improve in place · **R** reorganise (move, no
logic change) · **N** new build.

### 1.1 Core, data, domain — **K**
`src/core/*` (7), `src/data/*` (10), `src/domain/*` (6), `src/i18n`, `src/ui/*`
(sheet, toast, sidebar, icons). Clean layering: domain ← data ← services ←
features. No feature imports another feature's store. `verify_app.py` enforces
this ("domain/data/services never import mocks").

### 1.2 Services — **K + 1 N**
`chat`, `alerts`, `guardian`, `support`, `community`, `safety`, `discover`,
`transport`, `posts`, `profile`, `media`, `engagement`, `drafts`, `session`.
**New:** `personal-safety.service.js` — journeys, check-ins, plans, preferences.
All local-first, all returning `{ok, message}` instead of throwing.

### 1.3 Home — **I**
Hero slideshow, SOS card, 6 quick actions, Uwanja feed (topics, 6 engagement
actions), composer, profile, search. Working and tested (62 checks).
Weaknesses: the greeting block ("Karibu GuardHai / Usalama wako, afya yako…")
takes three lines before any content; quick actions use six different hues with
no system; the SOS card is red-on-pink *and* sits directly under a hero that is
also a dark block — two heavy elements compete in the first screen.

### 1.4 Shield — **R + N (this phase)**
- **K** Device Protection: `protect-engine`, `protect-analyzers`, `protect-signals`,
  `protect-diagnostics`, `protect-state-machine`, `protect-triggers`,
  `protect-response`, `protect-wizard`, `protect-dashboard`, `communication-module`,
  `travel-protection`, `usb-cable`, `audio-engine`, `remote-shield`,
  `recovery-roc`, `protection-modals` — 16 modules, complete, tested indirectly.
- **I** The *container* around it: the page opens on a 10-tab horizontal strip
  inside "Protect", preceded by a three-pillar switcher whose "Find" pillar has
  one card, and whose "Recover" pillar is a screen of dark panels.
- **N** A real Shield Center: dashboard + Personal Safety + Digital Security +
  Asset Protection + Security History + Security Settings.

### 1.5 Health — **K** (already rebuilt in P2)
6 partitions, 37 screens, 54 checks, own type scale, honest empty states.
**Do not rebuild.** Only the page head is restyled to the new language (R).

### 1.6 Chat / Support ecosystem — **K** (built in the previous phase)
5 partitions, 22 screens, 65 checks. Its tab strip, honesty strip and row
patterns are already the pattern the rest of the app should copy.

### 1.7 Map — **I**
`#mapPage` is a bare heading plus a Leaflet div. It is reachable from three places
(top menu, Shield → Find, Home quick action). Keep the map, give it a real page
head, move Leaflet loading behind a "load map" gesture (it is 400 KB of JS fetched
from a CDN at boot on every device, including people who never open the map).

### 1.8 Auth — **K**
Landing / login / register / reset. Functional. Out of scope this phase.

---

## 2. Findings that must be fixed (ordered by severity)

### F1 — False status claims (critical, honesty)
1. `#sidebarDrawer` header prints **"● Device Guardian Engine Active"** in green
   at all times, including when no engine and no transport is connected.
2. Shield dashboard shows **"PROTECTION ENGINE RUNNING"** and a
   **"Protection Confidence Index 100 %"** that is computed from defaults, not
   from a live BLE link — in a browser with no BLE at all.
3. Home hero SOS card is labelled **"DEMO"** while the system banner above says
   no SOS channel exists; two different vocabularies for the same fact.

Neither the engine nor the transport is fake — the *labels* are. A user would
reasonably conclude protection is active. This is the single most important
thing to fix in the redesign.

### F2 — Shield has no front door (critical, navigation)
Tapping **Ulinzi** drops the user into "Protect → Dashboard", i.e. straight into
the 10-tab device-protection console. There is no answer to the three questions a
security dashboard must answer in one screen: *what is on, what needs attention,
where do I go next*. Personal Safety — a named product pillar — does not exist as
a surface at all.

### F3 — SOS does not separate individual emergency from disaster alert
One sheet, one heading "SOS", three numbers. The product promises two different
things (a person in danger vs a community warning) and renders one.
SOS is also unreachable as a *page*: it is a modal, so nothing else can live there
(nearby help, my contacts, what was sent).

### F4 — 462 inline styles in the markup
Visual decisions are trapped in `style="font-size:10px;color:#94A3B8"`. Nothing
can be restyled coherently; dark panels, 9–10 px text and one-off radii appear
inside otherwise light screens.

### F5 — Type sizes below the readability floor
Shield and parts of Home use 9 px–10.5 px body text (`font-size:10px` ×41,
`9px` ×12, `9.5px` ×6). 10 px is below any mobile legibility floor (12 px is the
practical minimum, 14 px the comfortable default).

### F6 — Three navigation systems for one app
Bottom nav (5), a top "More" menu (map, profile, full menu, language, sign out),
and a sidebar drawer that repeats Home/Shield/Map/Logout in different words. The
drawer adds nothing the other two do not.

### F7 — Duplicate and orphan surfaces
- "Walezi" exists as a Home quick-action sheet, as `Chat → Walezi` (real service),
  and is required again in Shield → Personal Safety. Three entry points, two
  implementations, one source of truth (`guardian.service`).
- `Shield → Find` is a single card that opens `#mapPage`, which is also in the
  top menu and a Home quick action.
- `Shield → Protect → Zone Map` and `Find` overlap.
- The recovery console (`RecoveryROC`) has its own chat, its own team list and its
  own timeline, separate from Chat → Support.

### F8 — Empty promises in state, not in copy
Every screen is honest in its *sentences* but several *indicators* are not: a
green engine pill, a 100 % index, a green "active" sidebar line. Honesty has to
reach the colour and the number, not only the paragraph.

### F9 — No shared component vocabulary
Four families of card exist (`.glass-card`, `.item-row-card`, `.gh-card`,
`.ghc-*`), four button families (`btn-gradient`, `btn-outline`, `mini-btn`,
`.gh-btn`), and the newest sections invented `gh-health-*`, `gh-net-*` on top.
Each phase re-solved the same problems.

### F10 — Desktop is a stretched phone
At ≥ 1024 px every page is a single 640–720 px column with the mobile bottom nav.
Health and Chat at least centre themselves; Shield and Map do not.

---

## 3. Decisions taken (design leadership, not consensus)

| # | Decision | Why |
|---|---|---|
| D1 | **One navigation model**: bottom nav (5) + page-level tab strip inside each section + one top bar (storage, notifications, account, more). The sidebar drawer stops duplicating navigation; it becomes a *settings* sheet. | Three navs is F6. Sections already agree on tab strips (Health, Chat) — formalise it. |
| D2 | **Shield gets a dashboard** that answers *on / needs attention / next* in one screen, with six named sections. Device Protection keeps its engine and its 10 sub-views, but moves one level down. | F2. Nothing is deleted; the console is preserved. |
| D3 | **Honesty becomes a component**: `gds-ledger` (a status strip) and `gds-chip` tones `ok / warn / danger / muted`. Every status must be readable as a sentence. Green is only allowed when a real check passed. | F1, F8. |
| D4 | **Type floor 12 px, body 14 px, titles 18/22 px** on all redesigned surfaces. Numbers use tabular figures. | F5, accessibility. |
| D5 | **One card, one button family** in the new kit (`gds-*`), migrated section by section. Legacy classes stay until their surface is touched — no big-bang rewrite. | F9, and it keeps all 11 suites green during migration. |
| D6 | **SOS becomes a page** with two distinct modes (individual emergency / disaster alert), three tap-to-call numbers, my contacts and an exact "what is sent" statement. The quick sheet remains for in-flow SOS (hero, chat), unchanged. | F3 + speed: never force navigation in an emergency. |
| D7 | **Personal Safety is real or absent.** Journeys, check-ins, plans, incident reports and preferences are implemented on-device with the existing stores. No section is drawn as a placeholder if a working version fits in this phase. | The brief asks for understandable workflows, not mockups. |
| D8 | **Asset Protection is declared pending**, not mocked. Its card says "not in this version" and lists what it will cover. Inventing a register of assets with no verification path would be a false promise. | F8. |
| D9 | **Leaflet loads on demand**, not at boot. | Performance on low-end phones (brief §3). |
| D10 | **Mobile first, desktop intentional**: max 1 120 px content, 2-column dashboards at ≥ 900 px, 3-column at ≥ 1 280 px; the bottom nav becomes a rail at ≥ 900 px only if it does not break the 5-item model — otherwise the bottom nav stays (it is the product's identity). | F10. |

---

## 4. Information architecture (target)

```
GuardHai
├─ Home            feed · hero · quick actions · SOS card
├─ Afya            Overview · Medical ID · Records · Medication · Professionals · More   (6 / 37, unchanged)
├─ SOS             individual emergency · disaster alert · numbers · contacts · log      (new page)
├─ Shield          Overview · Device · Personal Safety · Digital · Assets · History · Settings
│   ├─ Device      Protect (10 views) · Find · Recover            (preserved engine)
│   ├─ Personal    Guardians · Journey · Check-in · Plans · Incidents · Preferences
│   ├─ Digital     data on device · permissions · lock & erase · exports
│   ├─ Assets      declared pending
│   ├─ History     one merged timeline (SOS, safety, shield, guardians)
│   └─ Settings    real persisted switches
└─ Chat            Chats · Guardians · Support · Communities · Discover                  (5 / 22, unchanged)
```

Top bar (unchanged order): **Storage · Notifications · Account · More**.
"More" keeps: Map, My profile, Language, Sign out — and no longer duplicates
section navigation.

---

## 5. What the redesign must not touch

- Device Protection engine and its 10 sub-views (brief §4: "do not redesign
  unnecessarily"). Only its *entry point* and its dark panels' contrast change.
- Health, Chat, Composer, Feed, Profile logic and data.
- All 26 IndexedDB collections and every service signature.
- The five-item bottom navigation and the raised SOS slot.

---

## 6. Success criteria for this phase

1. `SHIELD` opens on a dashboard whose every indicator is backed by a real value.
2. `SOS` opens a page that separates the two emergency modes and always shows the
   three working phone numbers within one screen, no scrolling.
3. Personal Safety's six items all lead to a working, persisted workflow.
4. No 9–10 px body text on any redesigned surface; no dark panel without a
   contrast-checked reason.
5. All 11 existing suites still pass, plus a new suite for the new surfaces.
6. `verify_app.py` still 12/12; every new module ≤ 600 lines.
