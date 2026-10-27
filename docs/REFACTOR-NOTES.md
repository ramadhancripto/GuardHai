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


---

# Third pass — the showcase visual language

Date: 2026-10-27 · version 0.5.0

## Why

The user supplied a product mockup (six panels) and asked for the whole system
to follow it: photo hero, circular quick actions, an SOS card with a DEMO
marker, coloured post-type badges, post media with a warning band, photo
profiles with four tabs, and a composer sheet with a close button and a publish
button in the header.

## What was built

| Area | Change |
|---|---|
| CSS | new tenth part `assets/css/10-showcase.css` (additive; the earlier nine are untouched) |
| header | brand block, in-device search sheet, red unread counter on the bell |
| home | photo hero (`assets/img/hero-community.jpg`), SOS card with DEMO chip, circular quick actions, greener safety strip |
| feed | type badge (Afya/Usalama/Majanga/Taasisi/Elimu), persona photos, location line, media with an alert band |
| profiles | photo cover + photo avatar, verification pill, stats separators, message/follow/⋯ row, tabs Machapisho · Taarifa · Picha · Kuhusu |
| editor | profile photo picker (downscaled to 512px in the browser, stored locally, removable) |
| composer | sheet header with ✕ and Chapisha, five icon type chips |
| search | `HomeUI.openSearch()` — a real local filter over the posts on the device |

## Honesty decisions that shaped the design

The mockup shows verified institutions, 248 posts, 1.2K followers, likes (456),
comments (89) and a live "Tahadhari: Epuka maeneo ya mafuriko" band. None of
those can be reproduced truthfully in a build with no server, so:

| Mockup element | What ships instead |
|---|---|
| green “Thibitishwa” badge | a grey **“Sampuli — hakuna uthibitisho”** pill; the green pill appears only from evidence (`checkedBy` + `reference`) |
| 248 Machapisho / 1.2K Wafuasi / 312 Anayefuata | real counts from the device: posts, topics, roles |
| 456 likes · 89 comments · 73 shares · 12 saves | no invented numbers; a count appears only when a stored row exists |
| red alert band over the flood photo | the same band, worded **“Tahadhari (sampuli)…”** with a second line saying it is not a live emergency notice |
| "Tuma tahadhari" | **“(haitumwi)”** next to it and the existing note that only a phone call works |

Real data that *was* added: eight photographs generated for this build
(hero, five covers/portraits, three post images) stored under `assets/img/`.
They are shipped files, not remote hotlinks, so they work offline.

## Test deltas (intentional)

| check | change |
|---|---|
| `home A1` | core order Storage → Notifications → Account → More is asserted, search is allowed in front of it |
| `home D1` | quick actions in the showcased order: Afya, Usalama, Tafuta Kifaa, Walezi, Elimu ya Usalama, Ramani |
| `home F2c` | five post types still asserted, by `data-type` plus the short showcase labels |
| `home H1` | English Uwanja title updated with the dictionary |
| `composer K4` | same as `home A1` |
| `profile P5`, `P15` | badges are read from the new `.gh-profile-verifyline` wrapper |
| `tools/verify_app.py` | `DEMO` is allowed **only** on a line that also says it is not real (haitumwi / not transmitted); any other demo framing still fails |

Five suites, 195 checks: `home` 60 · `composer` 72 · `bugfix` 23 · `profile` 20 ·
`showcase` 20.


---

# Awamu ya nne — "UI design reference implementation" (2026-10-27)

Picha ya pili (`uploads/GuardHai Mobile App UI Showcase.png`) ilionyesha mfumo
mzima, si skrini moja: tiles za mada, kichwa cha kadi, info-cards za wasifu wa
kila jukumu, composer wa tiles na sheet ya vitendo. Awamu hii inafuata mpango wa
`docs/REFINE-PLAN.md` (backup: `backup/pre-refine-ui-20261027T154405Z/`).

## Kilichojengwa

| Eneo | Kabla | Sasa |
|---|---|---|
| Mada (Uwanja) | pills za maandishi zinazosogeza kwa mlalo | tiles 6 zenye ikoni, grid 3×2 (6 kwa upana ≥720px) |
| Kadi ya chapisho | beji juu, Fuata juu-kulia, maelezo chini | mwandishi kushoto (picha, jina, jukumu, muda/mahali), **Fuata + ⋮ kulia**, chips za aina/Sampuli/mada/watazamaji chini |
| Menyu ya ⋮ | vitu 5 | vitu 6 — ile 5 + **"Vitendo vyote"** |
| Sheet ya vitendo | hapakuwa | tiles 9: Imenisaidia, Maoni, Shiriki, Hifadhi, Fuata, Tuma kwa mtu, Fungua wasifu, Nakili kiungo, Ripoti |
| Wasifu | beji + mstari wa mahali | mstari "Jukumu \| Taasisi" + **info-cards 2 kwa kila jukumu** + noti ya sampuli |
| Kihariri cha wasifu | jina, wasifu, picha, mahali, majukumu, mada | + sehemu 5 za hiari (taasisi, upatikanaji, maeneo ya kujitolea, aina ya taasisi, eneo) |
| Composer | `<select>` 2 + tray ya orodha | chips za Mada, segmented za Watazamaji (selects zile zile nyuma), tiles za viambatisho zenye ✕ na "Ongeza zaidi", checkbox ya nakala ya rasimu |
| Kikomo cha maandishi | 600 | 2,000 |
| Avatar ya kichwa | `<img>` ya `ui-avatars.com` yenye "DR KAPAMA" | monogram ya ndani au ikoni ya mtu |

## Uaminifu (hakuna kilichobadilika)

- Info-cards za personas zinaandikwa kuwa **za sampuli** chini ya kila kikundi.
- Beji ya uthibitisho bado inahitaji `checkedBy` + `reference`.
- Sheet ya vitendo inasema "Vitendo vyote vinahifadhiwa kwenye kifaa hiki.
  Hakuna kinachotumwa kwa seva."
- "Tuma kwa mtu" inabaki `disabled` pale `navigator.share` haipo, na lebo
  inasema hivyo.
- Hakuna namba za kubuni: stats ni machapisho/mada/majukumu halisi.

## Ushahidi

- `python3 tools/verify_app.py` → 12/12 (11 CSS parts, funguo 104 kwa lugha).
- `bash tools/run_tests.sh 8123` → 224/224 (home 60, composer 72, bugfix 23,
  profile 20, showcase 20, refine 29).
- Picha: `docs/screens/20…29-refine-*.png`.

## Kilichogunduliwa njiani

1. `ui-avatars.com` ilikuwa ombi la nje lisiloandikwa **na** jina la kubuni
   lililopachikwa kwenye kichwa — imeondolewa.
2. `DR KAPAMA` ilikuwa placeholder ya kujiandikisha na jina la drawer.
3. Mstari wa kifaa kwenye strip ya usalama ulionekana kama mabaki ya mashine;
   sasa upo kwenye sheet ya usalama pekee.
