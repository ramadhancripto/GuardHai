# GuardHai — Architecture

Version 0.5.0 · last updated 2026-10-27

This document describes the system as it is built today, and the rules that keep
it maintainable as it grows. It is the reference for adding a feature without
touching five files by accident.

---

## 1. Layers

```
            ┌──────────────────────────────────────────────┐
  UI        │ index.html  +  features/*  (views/controllers)│
            │ ui/*  (toast, sheet, icons, sidebar)          │
            └───────────────┬──────────────────────────────┘
                            │ calls
            ┌───────────────▼──────────────────────────────┐
  Use-cases │ services/*  (posts, engagement, drafts, media, │
            │             session)                          │
            └───────────────┬──────────────────────────────┘
                            │ validates with
            ┌───────────────▼──────────────────────────────┐
  Domain    │ domain/*  (post, media rules, engagement,     │
            │           comment) — pure, no DOM, no I/O     │
            └───────────────┬──────────────────────────────┘
                            │ persists through
            ┌───────────────▼──────────────────────────────┐
  Data      │ data/*  (db.js + one repository per entity)   │
            └───────────────┬──────────────────────────────┘
                            │ built on
            ┌───────────────▼──────────────────────────────┐
  Core      │ core/*  (bus, store, dom, format, id, logger) │
            └──────────────────────────────────────────────┘
```

`engines/` holds the device-protection subsystems (shield, auth, navigation).
They depend on `core/` only, and publish themselves on `window` for the inline
handlers in `index.html`.

**Dependency rule:** a module may only import from a layer above it in this
diagram. `domain/` must never import `data/`; `services/` must never import
`features/`.

---

## 2. Module map

### Entry & configuration

| File | Responsibility |
|---|---|
| `index.html` | markup, SVG sprite, single module entry |
| `src/main.js` | imports engines, starts Home, emits `guardhai:ready`, global error hooks |
| `src/config.js` | `appConfig` read from `<meta name="guardhai:…">` |

### `src/core/`

| File | Exports | Notes |
|---|---|---|
| `bus.js` | `bus`, `EVENTS` | on/once/off/emit/clear/events |
| `store.js` | `createStore` | get/pick/patch/subscribe/reset, replace-don't-mutate |
| `dom.js` | `qs`, `qsa`, `el`, `escapeHtml`, `delegate`, `setText`, `show`, `hide` | every DOM helper the views need |
| `format.js` | `fmtBytes`, `fmtSize`, `initials`, `relativeTime`, `hostnameOf`, `truncate` | |
| `id.js` | `uid`, `nowIso` | |
| `logger.js` | `createLogger`, `logBuffer` | 50-entry ring for field diagnostics |
| `capacitor-plugin.js` | `Protect` | native bridge shim (no-ops on the web) |

### `src/domain/` — pure rules

| File | Exports |
|---|---|
| `post.js` | `POST_TYPES`, `AUDIENCES`, `LIMITS`, `validateDraft`, `buildPost`, `normalizePost`, `typeLabel`, `audienceLabel` |
| `media.js` | `MEDIA_RULES`, `MAX_ATTACHMENTS`, `validateFile`, `validateLink`, `baseType`, `isMediaKind` |
| `engagement.js` | `FLAGS`, `emptyEngagement`, `toggle`, `visibleCount` |
| `comment.js` | `COMMENT_MAX`, `validateComment`, `buildComment` (accepts `parentId` for one-level replies) |
| `profile.js` | `ROLES`, `ROLE_ORDER`, `MAX_ROLES`, `rolesOf`, `primaryRoleOf`, `VERIFICATION_KINDS`, `verificationOf`, `isVerified`, `badgesFor`, `normalizeProfile`, `validateProfile` |

`profile.js` also owns the rule that matters most for trust: a badge is derived
from **evidence** (`checkedBy` + `reference`), never from the role a person
selected. Licence verification and institution verification are separate kinds
with separate evidence, and a `sample` profile can never be verified.

Every rule that a server would also enforce lives here, so the same function
can be reused server-side later. Comments in the files state plainly that
client-side validation is a UX guard, not a security boundary.

### `src/data/` — storage

| File | Responsibility |
|---|---|
| `db.js` | IndexedDB open/upgrade, promise wrapper, in-memory fallback |
| `posts.repo.js` | `LocalPostRepository`, `HttpPostRepository`, `createPostRepository` |
| `media.repo.js` | Blob store for attachments |
| `engagement.repo.js` | flags, comments, reports |
| `drafts.repo.js` | drafts (cap 20, newest first) |
| `profiles.repo.js` | profile rows (device owner + sample personas) |
| `follows.repo.js` | follow edges, key `${profileId}::${userId}` |
| `profiles.js` | the five labelled sample personas (`sample: true`) |
| `seed-posts.js` | 8 labelled sample posts (never written to storage) |

Store schema (database `guardhai`, version 2):

| Store | key | indexes |
|---|---|---|
| `posts` | `id` | `createdAt`, `status`, `topic` |
| `media` | `id` | — |
| `engagement` | `key` = `postId::userId` | `postId` |
| `comments` | `id` | `postId`, `createdAt` |
| `drafts` | `id` | `createdAt` |
| `reports` | `id` | `postId`, `createdAt` |
| `profiles` | `id` | `primaryRole` |
| `follows` | `key` = `profileId::userId` | `profileId` |
| `meta` | `key` | — |

The repository contract is four methods — `list`, `get`, `create`, `update`,
`remove`, `count` — and both implementations satisfy it. Switching to a real API
is `appConfig.dataDriver = 'http'`, not a refactor.

### `src/services/` — use-cases

| File | Public API |
|---|---|
| `posts.service.js` | `listPosts`, `getPost`, `publishPost`, `deletePost`, `countPosts` |
| `engagement.service.js` | `flagsFor`, `toggleFlag`, `listComments`, `addComment`, `commentCount`, `fileReport`, `listReports` |
| `drafts.service.js` | `saveDraft`, `listDrafts`, `latestDraft`, `deleteDraft`, `countDrafts` |
| `media.service.js` | `prepareAttachment`, `resolveUrl`, `primeUrls`, `getCachedUrl`, `releaseAttachment`, `releaseAll`, `storageUsage` |
| `profile.service.js` | `myProfile`, `getProfile`, `listProfiles`, `saveMyProfile`, `requestVerification` (request only), `isFollowing`, `toggleFollow`, `postsByAuthor`, `presentationOf`, `message` (returns `not-connected`) |
| `session.service.js` | `currentUser`, `isSignedIn` |
| `firebase.service.js` | optional Firebase auth bridge (dynamic import, may be absent) |

Each write emits an event; nothing else needs to know who else is listening.

### `src/features/`

| Folder | Files | Owns |
|---|---|---|
| `home/` | `home-controller.js`, `home-sheets.js` | navigation, menus, backdrops, sheet actions, `HomeUI` façade |
| `feed/` | `feed-view.js`, `post-card.js` | feed loading/rendering, topic filter, expand, lightbox |
| `composer/` | `composer-view.js`, `composer-media.js` | form state, steps, attachments, recording, publish, drafts |
| `engagement/` | `engagement-actions.js`, `comment-thread.js` | like/save/follow/share/report, comments |
| `profile/` | `profile-view.js`, `profile-edit.js` | the profile overlay (cover, role accent, tabs, posts, evidence panel) and the edit/verification sheet |
| `emergency/` | `sos.js` | the single shared SOS handler (no dispatch claim, real numbers) |
| `map/` | `map-view.js` | Leaflet initialisation and safety layers |

### `src/engines/shield/`

`protect-engine.js` is assembled from seven focused mixes with
`Object.assign`, so every method keeps `this === ProtectEngine`:

| Mix | Contents |
|---|---|
| `protect-triggers.js` | tap pattern, phone-drop, shake, deviation, manual SOS |
| `protect-state-machine.js` | idle → armed → alert → responding |
| `protect-signals.js` | browser signals (network, battery, permissions, motion) |
| `protect-response.js` | reconnection, alarm, flash, on-device notification |
| `protect-analyzers.js` | grace timer, RSSI trend, session manager, confidence |
| `protect-dashboard.js` | confidence UI, KPI row, device cards, event log |
| core | profiles, thresholds, orchestration, `init()` |

---

## 3. Events

`core/bus.js` defines the catalogue:

| Event | Emitted by | Payload |
|---|---|---|
| `POST_CREATED` | posts.service | the stored post |
| `POST_REMOVED` | posts.service | `{ id }` |
| `ENGAGEMENT_CHANGED` | engagement.service | `{ postId, flag, value }` |
| `COMMENT_ADDED` | engagement.service | the comment row |
| `DRAFT_SAVED` | drafts.service | `{ draft, count }` |
| `REPORT_FILED` | engagement.service | the report row |
| `PROFILE_UPDATED` | profile.service | the saved profile |
| `PROFILE_FOLLOW_CHANGED` | profile.service | `{ profileId, following }` |
| `TOAST` | any | `{ message }` |

Rule: a view never mutates another view. It calls a service and re-renders from
the event or from the returned value.

---

## 4. The mock seam

`src/mocks/` is the **only** simulated code in the project. Each file documents
the real integration it stands in for and returns an honest failure:

```js
{ ok: false, simulated: true, reason: 'not-connected' }
```

Guarantees enforced by `tools/verify_app.py`:

* `domain/`, `data/` and `services/` never import `mocks/`;
* mocks never persist anything, so invented rows cannot appear in storage;
* the UI renders the unconnected state rather than a success state.

---

## 5. Rendering & bridges

* Views return HTML strings and use `core/dom.escapeHtml` for all user data.
* `index.html` still uses inline `onclick="HomeUI.…()"` in 65 places. Each
  module publishes its symbol with `window.X = X` at the end of the file; the
  integrity checker fails if a handler has no bridge. New code should add a
  `data-*` action and a delegated listener instead (see `home-controller.js`).
* Escape closes sheets and the composer; backdrop clicks do the same.

---

## 6. Boot sequence

```
index.html
 └─ src/main.js
     ├─ import engines/index.js
     │    ├─ capacitor bridge, shield mixes, icons, i18n, auth, nav, map
     │    └─ boot.js → on DOMContentLoaded: I18N.init(); ProtectEngine.init(); CommunicationModule.init()
     ├─ import features/home/home-controller.js (defines window.HomeUI)
     ├─ DOMContentLoaded → initHome() → renderFeed(), wireComposer(), wireFeedGestures()…
     ├─ dynamic import('./services/firebase.service.js')  ← optional, failure is caught
     └─ dispatch 'guardhai:ready'
```

`document.documentElement.dataset.ghReady` flips to `"true"` once Home is live —
the smoke tests wait on it.

---

## 7. Testing

```bash
python3 tools/verify_app.py                  # static integrity, 12 checks
bash tools/run_tests.sh                      # 175 browser checks
NODE_PATH=/tmp/pw/node_modules node tests/home.spec.js http://127.0.0.1:8123/index.html
```

| Suite | Covers |
|---|---|
| `tests/home.spec.js` (60) | hero, safety sheet, SOS, quick actions, feed, composer basics, drafts, nav, English switch, responsive widths, duplicate ids, page errors |
| `tests/composer.spec.js` (72) | attachment contract, validation (size/type/count), preview, publish, drafts, engagement, report, long text, gallery, recording UI, a11y |
| `tests/profile.spec.js` (20) | five role personas, distinct accents/icons, profile sheet, licence ≠ institution, role never grants a badge, follow persistence, honest messaging, profile edit + reload, replies, five engagement actions intact |
| `tests/bugfix.spec.js` (23) | status bar, zoom, language symmetry, SOS honesty, dead references, sprite symbols, GHIcon, navigation, map, health tab, overflow |

Tests read the shipped code (all of `src/`) rather than a single bundle, so a
module that disappears is caught.

---

## 8. Adding a feature — checklist

1. Model the rules in `src/domain/` (pure functions + a `validate*`).
2. Add a repository method in `src/data/` if it needs a new store.
3. Write the use-case in `src/services/`, emit an event on success.
4. Build `src/features/<name>/` — a view (HTML string) and a controller (events).
5. Wire it in `home-controller.js` (or the owning controller) — no inline `onclick`
   for new work; use `data-*` + delegation.
6. Add i18n keys to **both** dictionaries.
7. Add a check to `tools/verify_app.py` or a test, then run all four suites.

### Trust rules that new work must keep

* **No badge from a self-selected role.** Anything that looks like authority
  (licence, institution) is rendered from `presentationOf(profile).verification`,
  which only reads evidence.
* **No fake success.** Dispatch, messaging, push and device pairing return
  `{ ok: false, reason: 'not-connected' }` from `src/mocks/`; the UI says so.
* **Sample data is labelled.** `sample: true` rows and personas always carry the
  `Sampuli` badge and are never written into storage.
8. Keep every file under ~600 lines; if it grows, split by responsibility.
