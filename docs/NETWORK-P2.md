# GuardHai Communication & Support Network — Phase 2 delivery

**Status: built, tested, gate green. Not deployed — waiting for Phase 8 approval.**

This is the audit summary, screen map, honesty record and test report for the
Communication & Support Network as it now stands inside the existing GuardHai app.

---

## 1. What changed, in one page

| Before | Now |
|---|---|
| `#tab-chat` opened a placeholder panel with descriptive cards | `#commPage` is a real shell: header, back button, bell, honesty strip, 5-tab strip, one stage |
| No data layer for chat, guardians, support, communities, safety | 16 new IndexedDB collections (schema v3) behind one generic repository |
| No routing inside the section | 22 screens across 5 partitions + a shared safety flow |
| Actions scattered / none | one dispatcher (`network-actions.js`, 513 lines) — the only place that calls a service |
| Every row was a "coming soon" label | every screen reads and writes the device-local store; workflows validate and persist |
| Not covered by any suite | `tests/network.spec.js`, **65/65 checks**, part of the regression gate |
| — | one real product bug found and fixed (`SEED_MARK`, §9) |

Nothing was removed from the product: the five-item bottom navigation, the SOS
slot, the Home feed, Health and Shield are unchanged and still pass their suites.

---

## 2. Audit summary

**Existing pieces reused**
- Bottom nav and `#tab-chat` slot; the network only takes over the panel it is given.
- `src/ui/sheet.js` (forms, sheets), `src/ui/toast.js` (transient messages),
  `src/core/bus.js` (events), `src/core/logger.js`, `src/i18n/i18n.js`.
- `assets/css/00-tokens.css` (`--gh-*`) and the single icon sprite — no new icons,
  no emoji, no new dependency.
- `src/features/home/home-sheets.js` notification/guardian sheets now read the real
  stores instead of a hard-coded list.

**Gaps found and closed**
1. Nothing existed for conversations, guardianships, support requests, communities
   or safety; the tab described them instead of running them.
2. No sub-screen navigation, so "open a request", "open a guardian" or "open a
   community" had nowhere to go.
3. No permission model: guardians and community roles were words on a card.
4. No delivery honesty: there was no way to say "this message did not leave the
   device" because there was no message.
5. No place to report, block, moderate or appeal.

**Deliberate non-goals**
- No server, no Firebase, no socket, no new dependency. Messages are written to
  IndexedDB and *say* they are on this device only.
- No QR/directory lookups: `lookupGuardHaiId()` reports the directory as not
  connected rather than faking a hit.
- No fabricated verification badges for support providers — none of the sample
  providers is presented as verified.

---

## 3. Design system applied

| Token role | Value / rule |
|---|---|
| Canvas | `--gh-canvas`, white cards, hairline `--gh-line` borders |
| Primary | `--gh-green-ink` for text/filled buttons; `--gh-green` for marks only |
| Warning / honest gaps | amber (`is-warn`) for "sample", "no server", "not delivered" |
| Emergency | `--gh-red` + soft red, only on SOS and destructive confirms |
| Radius ladder | 8 / 12 / 18 / 24 px, pill for chips and buttons |
| Type | one scale (22 → 18 → 15.5 → 14 → 13 → 11.6), weights 500–800 |
| Icons | sprite `#i-*` only, stroke family, 44 px minimum touch target |

**Shell.** `.gh-net-inner` holds `#ghNetBack #ghNetTitle #ghNetSub #ghNetActions`,
then `#ghNetBell #ghNetBellDot`, the honesty strip `#ghNetStrip`, the five-tab
strip `#ghNetTabs` and the stage `#ghNetStage`. The tab strip is a scrollable
`tablist`; the active tab scrolls itself into view, arrow/Home/End keys move the
selection. The back button is suppressed on the five partition homes.

**Compact actions.** Row actions are icon-only buttons with `aria-label` and a
text alternative in the row, so a name never wraps to make room for a button.

**Conversation rows.** The honesty tag ("Sampuli") stays a word; guardian
priority is a compact shield with `role="img"` and an accessible name. That keeps
"*Dkt. Neema Mushi*" — or any longer name — on one line at 390 px instead of
truncating behind two chips, and every row ends up the same height.

**CSS.** `assets/css/16-network.css` (862 lines) is one section per concern:
shell, tabs, stage, cards, rows, avatars, chips, buttons, statements, empty,
forms, chat view, guardians, support, communities, stats, responsive,
notification-sheet rows.

---

## 4. Screen map (22 screens)

### Partition 1 — Mazungumzo / Chats
| Screen | Purpose |
|---|---|
| `chats.home` | Conversation list, unread counts, pinned first, archived filter, sample tag |
| `chats.thread` | Messages with an honest delivery state per row, composer, attach, voice placeholder, privacy tag |
| `chats.new` | Start a direct conversation with a person from the local profile set |
| `chats.group` | Create a group with a title and members (min. 3 people total) |
| `chats.search` | Free-text search across messages **on this device** |
| `chats.settings` | Pin / mute / archive / block, guardian priority, privacy |

### Partition 2 — Walezi / Guardians
| Screen | Purpose |
|---|---|
| `guardians.home` | Invitations in, invitations out, active guardians — three separate blocks |
| `guardians.invite` | Invite by profile, choose role; keeps `status: invited` until accepted |
| `guardians.detail` | Role, per-permission switches, accept / decline / cancel / revoke, audit lines |

### Partition 3 — Msaada / Support
| Screen | Purpose |
|---|---|
| `support.home` | Seven categories, my requests with status chips, "no provider connected" note |
| `support.new` | Category, subject, body, urgency; validates before writing |
| `support.request` | Timeline, notes, route attempt, provider reply gate, close/cancel |
| `support.providers` | Directory of sample providers, category filter, verification state |
| `support.provider` | Provider profile, what they can and cannot do, honest "not verified" |

### Partition 4 — Jamii / Communities
| Screen | Purpose |
|---|---|
| `communities.home` | List with membership state per community, type chips, sample tag |
| `communities.new` | Name, description (minimum length), type; author becomes founder |
| `communities.view` | Posts, comments, reactions, members, events — tabbed |
| `communities.moderation` | Pending members, pending reports, role assignment (role-gated) |

### Partition 5 — Gundua / Discover
| Screen | Purpose |
|---|---|
| `discover.home` | Opt-in switch (off by default), grouped search, GuardHai ID lookup |
| `discover.people` | People matching the search, filters by role; no contact details |

### Shared — Usalama / Safety (reachable from every partition)
| Screen | Purpose |
|---|---|
| `safety.home` | Blocked people, my reports, my appeals, moderation queue |
| `safety.report` | Reason + detail, subject-aware, writes an audit row |
| `safety.appeal` | Appeal a moderation decision, "cannot be decided without a moderator" |

---

## 5. Data & service layer

**Repository.** `src/data/network.repo.js` — one generic repo over `db.js` with
`put / get / all / where / remove / count / clear`. Schema is **v3**; the network
adds 16 collections:

```
conversations, messages, outbox, guardianships, supportProviders, supportRequests,
communities, memberships, communityPosts, communityComments, communityEvents,
blocks, appeals, auditLog, alerts
```

**Domain.** `src/domain/network.js` (370 lines) is the single vocabulary:
guardian roles (`primary / backup / family / professional`) and permissions,
community roles (`founder / admin / moderator / contributor / member`) and their
permission matrix, membership status, post kinds, seven support categories,
provider kinds, request status, report reasons/subjects, moderation actions,
appeal status, limits and a rate limiter. Services ask this file, never a screen.

**Services.** Each is a plain async module over the repo; no service imports a
screen or a global.

| Service | Responsibility |
|---|---|
| `transport.service.js` | `registerTransport / flushOutbox / queuedCount / transportStatus / watchConnectivity` — the only path a message could leave the device |
| `chat.service.js` | direct/group conversations, send, mark read, pin/mute/archive, blocks, search, `selfId()` |
| `alerts.service.js` | local alerts + unread count + audit trail (feeds the bell and the Home sheet) |
| `guardian.service.js` | invitations, accept/decline/cancel, permissions, revoke, stats |
| `support.service.js` | requests, routing attempt, provider reply gate, notes, close/cancel, provider directory |
| `community.service.js` | community CRUD, join/approve/roles, posts, comments, reactions, events, hide |
| `safety.service.js` | reports, moderation decisions, appeals, blocks, summary |
| `discover.service.js` | opt-in settings, grouped search, people, GuardHai ID lookup |

**Every service returns a result object, never a bare throw** — `{ok, message,
reason}` — so a screen can print the truth without inventing a success.

---

## 6. Honesty record (the point of this phase)

| Situation | What the UI says |
|---|---|
| No transport registered | Message row: **"Hakuna seva: ujumbe unabaki kwenye kifaa hiki."**; `send()` → `{ok:false, reason:'no-transport'}` |
| Message queued | **"Inasubiri muunganisho"** — never "Delivered" |
| Seeded rows | **"Sampuli"** tag on the conversation, community and provider rows |
| Support request routed | Stays `submitted`; the route attempt reports that no provider is connected |
| Provider reply without a provider account | Refused by `support.service`, message explains why |
| Provider verification | **Not verified** on every sample provider, with the reason |
| GuardHai ID lookup | "Directory not connected" — never a fake hit |
| Discover with no opt-in | Empty, default off, and the screen says so |
| Report outside a community | Cannot be decided — there is no moderator |
| Appeal | Cannot be decided without a moderator |
| Strip | "Kwenye kifaa hiki" + "Hakuna seva iliyounganishwa" on every screen |

The strip is painted from live `transportStatus()`, so it flips to
"Seva imeunganishwa" the moment a transport is registered — no hard-coded claim.

---

## 7. Integration with the rest of the app

- `#tab-chat` → `HomeUI.go('chat')` → `GHNetwork.enter()`. `#tab-sos` remains a
  separate slot: the SOS path is never inside the chat shell.
- `src/features/home/home-sheets.js` — the Home notification sheet and guardian
  sheet now read `alerts.service` / `guardian.service` instead of a static list.
- `src/features/home/home-controller.js` — `mark-alerts` and `open-guardians`
  quick actions, `[data-network-search]` delegation, `#ghSearchNetwork` bridge.
- `src/services/profile.service.js` — **"Message" on a profile** opens a real
  direct conversation (`chat.service.openDirect`) instead of a dead button;
  `profile-view.js` navigates straight into the thread.
- `src/i18n/i18n.js` — five `gh_net_tab_*` keys in sw and en (128 keys total,
  full parity). Screen copy is bilingual in code via `L(sw, en)` and re-renders on
  `guardhai:lang`, so the tab labels and every screen switch together.
  Known gap, pre-existing and app-wide: role and category **names** come from
  `src/domain/profile.js` / `domain/network.js` and are Swahili-only, so English
  mode shows "Mwanajamii · Sample". The network's own copy is fully translated;
  the vocabulary labels would need a domain-wide rename pass.
- Health (16 modules) and Shield (17 modules) are untouched and still pass.

---

## 8. Test report

`tests/network.spec.js` — **65/65 checks, `RESULT: all checks passed`.**
Playwright/Chromium, 390×844, one boot, 693 lines, groups:

| Group | Checks |
|---|---|
| Shell & partitions | NC1–NC5 |
| Chats | NC6–NC18 |
| Guardians | NC19–NC24 |
| Support | NC25–NC32 |
| Communities | NC33–NC45 |
| Discover | NC46–NC50 |
| Safety | NC51–NC55 |
| Transport | NC56–NC57 |
| Wiring, a11y, layout, i18n, regressions | NC58–NC65 |

What it proves, in short: the tab mounts the shell; five partitions exist; a new
account starts empty; a seeded row is labelled; send persists and survives a
reload; an unregistered transport is reported as **not delivered**; an empty
message and an empty group are refused; pinning reorders; privacy persists;
search is device-local; invitations are not guardians and only the invitee can
accept; permissions persist and revoking clears them; seven support categories
and the emergency path is separate; a routed request stays un-routed; no provider
is verified; private join needs approval and a pending member cannot post; role
gates hold for approve/promote/hide; a founder cannot leave without transferring;
discover is opt-in and exposes no contact details; blocking stops messaging both
ways; a report inside a community can be decided, outside it cannot; appeals need
a moderator; offline send queues then flushes when a transport appears; every
control maps to a known action; forms are labelled; no overflow at 360 px; the
language switch re-renders; Health/Shield/SOS still work; `clearDemo()` removes
only sample rows; no page or console errors.

**Full regression gate** — `bash tools/run_tests.sh 8123`:

| Suite | Result |
|---|---|
| verify_app (`tools/verify_app.py`) | 12/12 · 350 ids · 128 i18n keys |
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
| **network** | **65/65** |
| **Gate** | **`RESULT: all checks passed`** (11 suites) |

**Not run / not covered**
- No real-device pass (iOS Safari / low-end Android), Chromium only.
- No screen-reader pass — labels and ARIA were checked programmatically.
- No two-browser test: with no transport, "delivery" is a local state machine.
- No volume test beyond a few hundred rows in one IndexedDB object store.

---

## 9. Product bug found by the suite

`src/features/network/network-seed.js` exported `SEED_MARK = 'sample'` while every
row it wrote carried `sample: true`. `clearDemo()` compares `row.sample ===
SEED_MARK`, so **clearing the demo data silently did nothing** — NC63 caught it
(`before:true, after:true`, four conversations still present).

Fixed to a boolean `SEED_MARK = true` (documented inline). `clearDemo()` now
removes the seeded conversations/messages/communities/providers and leaves rows
the user created. This was a real defect in shipped behaviour, not a test bug.

Two test bugs were fixed at the same time and are worth recording so they are not
"re-fixed" in the product: the privacy tag renders on `chats.thread` (not
`chats.settings`), and support request text lives in `body` (not `subject`).

---

## 10. Files

**Added — feature**
```
src/features/network/network-ui.js            200  copy, esc, primitives, buttons
src/features/network/network-view.js          361  shell, paint pipeline, events, bridge
src/features/network/network-actions.js       513  single action/form dispatcher
src/features/network/network-seed.js          223  labelled sample content
src/features/network/screens-chats.js         325  6 screens
src/features/network/screens-guardians.js     219  3 screens
src/features/network/screens-support.js       251  5 screens
src/features/network/screens-communities.js   375  4 screens
src/features/network/screens-discover.js      127  2 screens
src/features/network/screens-safety.js        118  3 screens
assets/css/16-network.css                     862  shell + screen kit
```

**Added — data & services**
```
src/domain/network.js                370  roles, permissions, statuses, limits
src/data/network.repo.js              59  generic repo over IndexedDB
src/services/transport.service.js    159  outbox, status, connectivity
src/services/chat.service.js         285  conversations, messages, blocks
src/services/alerts.service.js        90  alerts + audit
src/services/guardian.service.js     287  invitations, permissions, revoke
src/services/support.service.js      274  requests, routing, provider gate
src/services/community.service.js    499  communities, members, posts, events
src/services/safety.service.js       202  reports, moderation, appeals
src/services/discover.service.js     138  opt-in, search, directory lookup
```

**Added — tests, docs & screens**
```
tests/network.spec.js                      693  65 checks
docs/NETWORK-P2.md                          this document
docs/screens/network-p2-01-chats-empty.png  … 15 screens (390×844 @2x, one 1280×900)
```

Screens: chats empty, chats seeded, thread, thread after sending, chat settings,
guardians, guardian permissions, support home, support request, communities,
community home, community members, discover, discover in English, chats on
desktop. Captured from a fresh registration with `GHNetwork.seed()`; no page or
console errors during capture.

**Touched outside the section**
```
index.html                          #commPage shell, 16-network.css link (+ids, 350 total)
src/data/db.js                      DB_VERSION 3, +16 collections
src/i18n/i18n.js                    +5 gh_net_tab_* keys (128 total, sw/en parity)
src/features/home/home-sheets.js    notification + guardian sheets read real stores
src/features/home/home-controller.js mark-alerts, open-guardians, search bridge
src/services/profile.service.js     message() delegates to chat.service.openDirect
src/features/profile/profile-view.js navigates into the thread
tools/run_tests.sh                  network added to the 11-suite gate
```

(Also in this turn: three dynamic `import()` calls in `home-controller.js`,
`home-sheets.js` and `profile.service.js` were made static, so opening a sheet or
tapping "Message" no longer issues a module request at gesture time. That is what
the showcase S11 "no server call during search" check measures.)

---

## 11. Open items for Phase 8 approval

1. Deploy (or not) — nothing has been pushed; there is no build step.
2. Decide whether a real transport (WebSocket/Firebase) justifies the dependency;
   today the outbox, the status strip and every delivery label are honest about
   there being none.
3. Decide whether the sample provider directory should be replaced by a real feed
   — that needs a data source plus consent and verification review.
4. Real-device and screen-reader passes.
5. Group chat, voice notes and attachments are UI-honest placeholders (attach
   stores a local file reference; a voice note records nothing).
