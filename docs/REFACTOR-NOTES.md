# Refactor notes — from three big files to a module system

Date: 2026-10-27 · version 0.5.0

## Why

Before this pass the whole product was three files:

| file | lines |
|---|---|
| `js/guardhai-app.js` | 3,712 |
| `js/guardhai-home.js` | 1,355 |
| `css/guardhai.css` | 1,150 |

Every screen shared a single global scope, so any new feature risked the whole
app, and a change could only be reviewed by scrolling thousands of lines.

## What it looks like now

**68 modules, 7,079 lines, largest file 498 lines.**

| Layer | Files | Lines |
|---|---|---|
| `src/core/` | 7 | 229 |
| `src/domain/` | 4 | 223 |
| `src/data/` | 6 | 450 |
| `src/services/` | 6 | 339 |
| `src/ui/` | 4 | 72 |
| `src/i18n/` | 1 | 249 |
| `src/engines/` | 23 | 3,658 |
| `src/features/` | 10 | 1,635 |
| `src/mocks/` | 6 | 141 |
| `assets/css/` | 8 | 1,214 |

### CSS

The single stylesheet was cut at its own banner comments into eight ordered
parts (`01-core` … `08-composer`). Concatenating them in filename order
reproduced the original file byte-for-byte, which is how the split was verified
before anything else changed.

### Shield engine

`protect-engine.js` (1,559 lines) became a core plus seven mixes:

| module | lines | contents |
|---|---|---|
| `protect-engine.js` | 498 | profiles, thresholds, orchestration |
| `protect-dashboard.js` | 255 | confidence UI, KPIs, device cards, events |
| `protect-triggers.js` | 267 | triggers |
| `protect-analyzers.js` | 186 | grace timer, RSSI, session, confidence math |
| `protect-response.js` | 157 | reconnection + response chain |
| `protect-state-machine.js` | 110 | state transitions |
| `protect-signals.js` | 110 | browser signals |

The mixes are merged with `Object.assign`, so `this` inside every method is
still `ProtectEngine` — no call site changed.

### Home / feed / composer

`guardhai-home.js` (1,355 lines) is now:

```
features/home/home-controller.js    navigation, menus, delegated gestures
features/home/home-sheets.js        safety, storage, notifications, account, guardians
features/feed/feed-view.js          loading, filtering, render orchestration
features/feed/post-card.js          pure card markup
features/composer/composer-view.js  form state, steps, publish, drafts
features/composer/composer-media.js attachments, validation UI, recording
features/engagement/engagement-actions.js  like/save/follow/share/report
features/engagement/comment-thread.js      comment sheet
features/emergency/sos.js           the single SOS handler
```

## New capability introduced by the split

The old build kept everything in `localStorage` and rendered sample data mixed
with user data. The new layers made these possible and they are now real:

* **IndexedDB storage** (`src/data/db.js`) with a versioned schema and an
  in-memory fallback, so posts, comments, flags, reports and drafts survive a
  reload and do not share one 5 MB quota with unrelated keys.
* **Attachments that survive a reload** — the file is validated, stored as a
  Blob, and re-materialised as an object URL on demand.
* **Domain validation** shared by the composer and the service, so the same
  rules run at typing time and at publish time.
* **A repository interface** with a REST implementation already written
  (`HttpPostRepository`), so a backend is a config switch, not a rewrite.
* **An honest mock layer** (`src/mocks/`) for the integrations that cannot
  exist client-side.
* **A real SOS screen**: the old `alert()` has been replaced by a sheet that
  states no dispatch happens and lists working emergency numbers.

## Behaviour that was preserved

| Contract | Verified by |
|---|---|
| same screens, ids and CSS classes | `tests/home.spec.js`, `tests/composer.spec.js` |
| 65 inline `onclick` handlers still resolve | `tools/verify_app.py` check 4 |
| sw/en dictionary still symmetric (85 keys) | `verify_app.py` check 5 |
| i18n applies to all 68 wired elements | `verify_app.py` check 5 |
| no duplicate element ids (284) | `verify_app.py` check 6 |
| navigation, map, health tab, shield check | `tests/bugfix.spec.js` |
| no page/console errors | all three suites |

## Test deltas (intentional)

Three checks changed because the *behaviour* changed on purpose, not to make a
test pass:

| check | before | after |
|---|---|---|
| `home F10c` | draft written to `localStorage['guardhai_home_drafts']` | draft written to IndexedDB `drafts` store |
| `composer F6` / `G12` | read `localStorage` arrays | read the `drafts` / `reports` stores |
| `home C1–C3`, `bugfix B4`, `bugfix B1` | `alert()` text and a banner saying "PROTOTYPE / DEMO" | SOS sheet states no dispatch + shows 112/114/110; the banner is now a system-status bar |

Everything else passes unchanged.

## What deliberately did not change

* No build step, no bundler, no `package.json` — the browser loads ES modules.
* No framework: views stay HTML strings with `escapeHtml`.
* No new external dependency.
* Hooks, visual design and Swahili copy are the same.

---

# Second pass — roles, profiles and role-aware engagement

Date: 2026-10-27 · version 0.5.0

## Why

The feed, the engagement row and the profile were one visual language for every
person who used them: a family doctor, a security officer, a clinic, a
volunteer group and an ordinary member all looked identical, and the only
"identity" a reader got was an initials circle. Engagement was text-only in
places and the three-dot menu had grown by accretion.

## Size after the second pass

**77 modules, 8,262 lines, largest file 498 lines. 9 CSS parts, 1,747 lines.**

| Layer | Files | Lines |
|---|---|---|
| `src/core/` | 7 | 231 |
| `src/domain/` | 5 | 405 |
| `src/data/` | 9 | 612 |
| `src/services/` | 7 | 510 |
| `src/ui/` | 5 | 82 |
| `src/i18n/` | 1 | 256 |
| `src/engines/` | 23 | 3,658 |
| `src/features/` | 12 | 2,284 |
| `src/mocks/` | 6 | 141 |

## What was added (nothing was removed)

| Area | New behaviour |
|---|---|
| roles | `domain/profile.js` — 5 roles, each with accent/soft/ink/icon; max 3 per person; the first role decides the accent |
| profiles | full-height overlay: cover, ring avatar, role badge, role chips, stats, tabs (Machapisho / Kuhusu), evidence panel |
| personas | 5 labelled `sample: true` profiles wired to the sample posts (`author-health|safety|org|volunteer|member`) |
| editing | edit sheet: name, bio (160), location, roles (ordered, primary = accent), topics (max 5) |
| verification | request-only flow in an inline form; licence and institution are separate kinds; a role never grants a badge; sample profiles can never be verified |
| following | `follows` store, `follow`/`unfollow` from the card, the menu and the profile page |
| engagement | the action rail is now labelled icon buttons ×5 (Imenisaidia, Maoni, Shiriki, Hifadhi, Vitendo zaidi); the menu is Follow → Profile → Send → Copy → Report |
| comments | one-level replies (`parentId`), author links, per-comment report |
| messaging | "Tuma ujumbe" is present and honest: `not-connected`, nothing is sent |

## CSS

`assets/css/09-profile.css` is the ninth part. It owns the profile overlay, the
role accents (`--gh-role`, `--gh-role-soft`, `--gh-role-ink`), the avatar role
chip, the engagement rail, comment threads and the welcome brand line. The
overlay sits at `z-index: 11000` — above the sticky status bar (10001) and the
bottom nav (5000), below the modal sheets (12000) so the editor opens over it.

## Test deltas (intentional)

| check | before | after |
|---|---|---|
| `home F6` | menu holds exactly 3 items (Follow / Copy / Report) | 5 items; the check now requires Follow, Copy, Report **and** the profile entry |
| `composer G9` | same 3-item assertion | same, relaxed to `>= 3` with the required three still asserted |
| `composer J2` | every icon inside `.gh-post-actions` has `fill: none` | checked on **unselected** icons only; a new `J2b` asserts the selected state is visually distinct (filled/tinted) |

Everything else passes unchanged: 175 checks across four suites.

## Still not real (and says so)

SOS dispatch, push notifications, device pairing, guardians and person-to-person
messaging have no backend. They live in `src/mocks/`, return
`{ ok: false, simulated: true, reason: 'not-connected' }`, and the UI prints the
unconnected state instead of a success toast. Verification is a *request*; there
is no reviewer, so nothing in the shipped build can become "verified".
