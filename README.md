# GuardHai

Mfumo wa ulinzi wa kifaa na jamii ya usalama: dashibodi ya Shield, uwanja wa
elimu (feed), wasifu wenye majukumu (afya, usalama, taasisi, kujitolea,
mwanajamii), kihariri cha machapisho, mawasiliano na ramani — kwa Kiswahili na
Kiingereza.

The app is a **local-first web system**: every module is real code, and state is
stored on the device (IndexedDB + localStorage). There is no backend yet, so the
few features that need one say so plainly instead of pretending to work.

---

## Quick start

```bash
cd /home/user
python3 -m http.server 8123 --bind 0.0.0.0
# open http://127.0.0.1:8123/index.html
```

It must be served over HTTP (`file://` breaks ES modules). No build step, no
`package.json`, no dependencies to install — the browser loads `src/main.js`.

---

## What works today (real)

| Area | Behaviour |
|---|---|
| Feed (Uwanja) | posts from IndexedDB + clearly-labelled sample posts, type badges, topic filter, in-device search, expand/collapse, photo lightbox |
| Composer | title/text/type/topic/audience, image·video·audio·link attachments, microphone recording, live validation, preview step, publish |
| Media | validated by `domain/media.js`, stored as Blobs in IndexedDB, previewed through object URLs — nothing is uploaded |
| Engagement | five labelled icon actions per post (helpful, comments, share, save, more), follow toggles, one-level comment replies, per-post and per-comment report — all stored on the device |
| Profiles | five role identities with their own accent, icon, photo cover and photo avatar; two role-shaped info cards (facility + hours, unit + area, kind + coverage, service areas + availability, place + topics); four tabs (posts, notices, photos, about); a photo can be picked from the device and is downscaled locally |
| Verification | a request is recorded, but nothing is ever shown as verified without a reviewer's evidence; licence and institution are separate kinds |
| Drafts | saved to IndexedDB, reloadable, media intentionally dropped (the UI says so) |
| Shield | dashboard, confidence score, device list, protection profiles, wizard, travel protection, communication screen |
| i18n | sw/en dictionaries applied to every `data-i18n` element |
| Map | Leaflet map with the safety layers |

## What is not connected (and is labelled as such)

SOS dispatch, push notifications (FCM/APNs), Bluetooth companion pairing,
guardian roster, media upload, and network accounts. Each one has a small,
honest stand-in under `src/mocks/` that returns `{ ok: false, simulated: true }`
so the UI can show the real status — never a fake success.

Firebase **auth** is the one external integration that exists
(`src/services/firebase.service.js`, loaded dynamically and optional).

---

## Structure

```
index.html                  markup + SVG sprite + one <script type="module">
assets/css/                 fifteen ordered stylesheets (00-tokens … 14-identity)
src/
  main.js                   entry: engines → home → ready event
  config.js                 runtime switches (<meta name="guardhai:…">)
  core/                     bus, store, dom, format, id, logger, capacitor bridge
  domain/                   Post, media rules, engagement, comments, profiles/roles (pure logic)
  data/                     IndexedDB wrapper, repositories per entity, sample personas + posts
  services/                 use-cases: posts, engagement, drafts, media, profiles, session
  ui/                       toast, sheet, icons, sidebar
  i18n/                     sw/en dictionary + applier
  engines/                  shield engine (7 mixes), auth, navigation, boot
  features/                 home, feed, composer, engagement, profile, emergency, map
assets/img/                 the photographs shipped with the build (local, no hotlinks)
  mocks/                    the only simulated seam (SOS, push, BLE, guardians)
tests/                      Playwright suites: home, composer, bugfix, profile, showcase, refine, posttypes, hero, identity
tools/                      verify_app.py, pkg_redact.py, run_tests.sh
docs/                       architecture, audits, reports (tokens, post schema, hero slideshow…)
backup/                     archived single-file version + pre-change checkpoints
```

Dependency direction — never reversed:

```
features → services → data → domain → core
engines  → core
```

## Commands

```bash
python3 tools/verify_app.py                       # 12 integrity checks
bash tools/run_tests.sh                           # 307 Playwright checks
python3 tools/pkg_redact.py <package-root>        # strip credentials before shipping
```

Current status: `verify_app.py` **12/12** · home **60/60** · composer **72/72** ·
bugfix **23/23** · profile **20/20** · showcase **20/20** · refine **29/29** ·
posttypes **33/33** · hero **23/23** · identity **25/25** (307 total).

## Rules for growing this codebase

1. A feature gets its own folder under `src/features/`; a screen is a view module
   plus a controller.
2. Business rules go in `src/domain/`, never in a view.
3. Storage changes go through a repository in `src/data/`; the interface stays
   stable so `local` can become `http` without touching the UI.
4. Anything that needs a server goes in `src/mocks/` until the server exists,
   and it must report `simulated: true`.
5. No file above ~600 lines — split instead (`tools/verify_app.py` enforces it).
6. State changes announce themselves on `core/bus.js`; views subscribe.
7. A badge is earned by evidence (`checkedBy` + `reference`), never by a role the
   person selected — `domain/profile.js` is the only place that decides this.

See `docs/ARCHITECTURE.md` for the full map.
