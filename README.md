# GuardHai

Mfumo wa usalama na afya wa jamii: Shield Center, SOS, Afya (kadi ya afya,
rekodi, dawa, wataalamu), Uwanja wa elimu, wasifu wenye majukumu, kihariri cha
machapisho, mtandao wa mawasiliano (Chat · Walezi · Msaada · Jamii · Gundua) na
ramani — kwa Kiswahili na Kiingereza.

The app is a **local-first web system**: every module is real code, and state is
stored on the device (IndexedDB v4 + localStorage). There is no backend yet, so
the few features that need one say so plainly instead of pretending to work.

---

## Quick start

```bash
cd GuardHai
python3 -m http.server 8123 --bind 0.0.0.0
# open http://127.0.0.1:8123/index.html
```

It must be served over HTTP (`file://` breaks ES modules). No build step, no
`package.json`, no dependencies to install — the browser loads `src/main.js`.

---

## What works today (real)

| Area | Behaviour |
|---|---|
| **Shield Center** | dashboard answering *emergency? · what is on? · what needs attention? · where next?*, then 7 sections: Overview, Device, Personal Safety, Digital, Assets (declared pending), History, Settings |
| **Device Protection** | preserved engine: 3 pillars (Protect · Find · Recover), 10 sub-views, wizard, travel protection, communication modules, recovery console |
| **Personal Safety** | guardians, safety journey (with overdue state), daily check-in + streak, risk & safety plans (3 templates), incident reports, preferences — all persisted |
| **SOS** | a full page: personal emergency vs disaster alert, the three working numbers as tap-to-call rows above the fold, "what GuardHai sends" table, attempt log |
| **Afya** | 6 partitions / 37 screens: Medical ID + QR, records, medication + adherence, appointments, cases, meetings, communities, referrals, blood, emergency, education |
| **Chat & support** | 5 partitions / 22 screens: chats, guardians + permissions, support requests + providers, communities + moderation + events, discover |
| Feed (Uwanja) | posts from IndexedDB + clearly-labelled samples, type badges, topic filter, in-device search, photo lightbox |
| Composer | title/text/type/topic/audience, image·video·audio·link attachments, microphone recording, validation, preview, publish |
| Media | validated by `domain/media.js`, stored as Blobs in IndexedDB, previewed through object URLs — nothing is uploaded |
| Engagement | labelled actions per post (helpful, comments, share, save, more), follows, one-level replies, per-item report |
| Profiles | five role identities with their own accent and cards, four tabs, local photo pick with downscale |
| Drafts | saved to IndexedDB, reloadable, media intentionally dropped (the UI says so) |
| i18n | sw/en dictionaries, 130 keys, applied to every `data-i18n` element; sections re-render on `guardhai:lang` |
| Map | Leaflet map with safety layers (loaded on demand) |

## What is not connected (and is labelled as such)

SOS dispatch, push notifications (FCM/APNs), Bluetooth companion pairing,
guardian notices, media upload, network accounts and asset verification. Each one
names itself in the UI (`Hakuna seva iliyounganishwa`, `haiwezi kuwashwa`) and in
`src/mocks/` (`{ ok: false, simulated: true }`) — there is no invented success.

Shield settings make this explicit: **"Share with guardians" cannot be switched
on** while no transport is registered, and it says why.

---

## Design language

**GDS v1 "Calm Signal"** — `assets/css/17-system.css` (tokens + 22 components,
namespaced `gds-`). Light by default, one colour = one meaning (green = a real
check passed, blue = reference/health, amber = not connected/sample, red =
emergency only), body 14 px with a 11.6 px floor, 44 px touch targets, motion
disabled under `prefers-reduced-motion`.

Full reference: `docs/DESIGN-SYSTEM.md`.

---

## Verify it

```bash
python3 tools/verify_app.py          # 12/12 static checks (375 ids, 130 i18n keys, no file > 600 lines)
bash tools/run_tests.sh 8123         # 12 Playwright suites, 471 checks, RESULT: all checks passed
```

| Suite | Checks | Covers |
|---|---|---|
| home | 62 | hero, SOS card, 6 quick actions, feed, search |
| composer | 72 | all post types, media, drafts, validation |
| bugfix | 23 | regressions from earlier phases |
| profile | 20 | role profiles, tabs, photo |
| showcase | 20 | visual guarantees, no server calls on search |
| refine | 29 | spacing, type, contrast fixes |
| posttypes | 33 | the five post types and their badges |
| hero | 23 | slideshow, controls, honesty |
| identity | 25 | colour system, bands, gradients |
| health | 54 | 37 screens, empty states, no fake verification |
| network | 65 | 22 screens, permissions, deliverables, clearDemo |
| **shield** | **45** | Shield Center, Personal Safety persistence, SOS page, a11y, responsive |

`tools/serve.py` and `tools/preview.sh` are convenience wrappers if you prefer
them over `python3 -m http.server`.

---

## Documentation

| File | What it holds |
|---|---|
| `START-HERE.md` | the 5-minute tour and the rules for growing the code |
| `docs/ARCHITECTURE.md` | layers, data, events, module map |
| `docs/DESIGN-SYSTEM.md` | GDS v1: tokens, components, contrast table, rules |
| `docs/REDESIGN-AUDIT.md` | the measured audit and the decisions taken |
| `docs/REDESIGN-R1.md` | what the redesign delivered, tested, and what it did not |
| `docs/REDESIGN-R2.md` | the chat rebuild: inbox, thread, composer, and the wiring behind them |
| `docs/HEALTH-P2.md`, `docs/NETWORK-P2.md` | the two earlier section builds |
| `docs/STORAGE-CENTER.md` | the storage center: data model, 15 screens, honesty rules |
| `docs/TEST-LOG.md` | results of every phase |
| `docs/screens/` | screenshots (Health, Network, R1/R2 redesign, Storage `s1-*`) |

---

## Layout

```
index.html                  markup, icon sprite, one module entry (src/main.js)
assets/css/                 00-tokens … 17-system (loaded in filename order)
src/core/                   bus, dom, format, id, logger, capacitor bridge
src/domain/                 posts, media, engagement, comment, profile, network rules
src/data/                   IndexedDB v4 wrapper + repositories
src/services/               session, posts, profile, chat, guardian, support,
                            community, safety, discover, transport, personal-safety …
src/ui/                     toast, sheet, icons, sidebar
src/i18n/                   sw/en dictionary
src/engines/                shield (16 modules), auth, navigation, boot
src/features/               home, feed, composer, engagement, profile, emergency,
                            map, hero, health (16), network (10), shield (3)
src/mocks/                  SOS, push, BLE, guardians — the only simulated seam
tests/                      the 12 suites above
tools/                      verify_app.py · run_tests.sh · serve.py · preview.sh · pkg_redact.py
docs/                       architecture, design system, phase reports, screenshots
```

## Note about this package

Firebase web-config values in `src/services/firebase.service.js` (and the
standalone `uploads/index.html` mock-up) are replaced with `YOUR_…`
placeholders. Firebase is optional and loaded with a dynamic import, so an
unconfigured build runs fully offline; replace the six values from your own
Firebase project before deploying.
