# GuardHai — P1…P6 implementation record

Scope: the design-system pass (tokens, post blocks, profiles, composer, engagement,
tests + docs). Everything below was implemented inside the existing prototype —
no module was deleted, no backend was added, and no test result here is estimated.

Gate at the end of this pass: **`tools/verify_app.py` 12/12 · 257/257 Playwright
checks across seven suites.**

---

## P1 — Design tokens

* New `assets/css/00-tokens.css`, loaded **first** in `index.html`, define-only:
  colour, spacing `--gh-s1…s8`, radii, type scale, shadows, `--gh-tap` /
  `--gh-tap-sm`, `--gh-icon-stroke`, plus three safe globals (font stack, focus
  ring, `.ic` stroke).
* New `assets/css/12-posttypes.css`, loaded **last**, holds every new rule and is
  written entirely in tokens (post blocks, type badges, composer shortcuts, feed
  states, topic accents).
* No existing sheet values were mass-rewritten: the tokens define the vocabulary
  and are consumed by all new work. Old hard-coded hexes that already equal a
  token still render identically (see "Issues needing action").
* Catalogue: `docs/DESIGN-TOKENS.md`.

## P2 — Post blocks (type ≠ topic)

* `src/domain/post.js`: five types (`elimu, swali, uzoefu, taarifa, fursa→"Kusaidia"`)
  and five topics (`afya, usalama, taasisi, kusaidiana, majanga`) as **separate
  fields**; `LEGACY_TOPICS` maps the five schema-v1 ids; `normalizeTopic()`,
  `topicLabel()`, `DEFAULT_TOPIC`; `schemaVersion: 2`.
* New optional post fields with strict cleaning: `source`, `eventAt`,
  `safetySteps[]`, `requirements[]`, `contacts[]` (tel/mailto/https only, ≤ 4).
* New `src/features/feed/post-blocks.js`: guidance bullets, requirements, contacts,
  source + time row, honest verification row, device-only report CTA.
* `post-card.js`: the coloured badge is derived from **topic only**; the post type
  is printed as text (`Uzoefu · Umma`). Blocks render before the action rail.
* `src/data/seed-posts.js`: all 8 samples migrated to v2 topics and given sample
  structured data (still `sample: true`, labelled as such on screen).
* Schema reference: `docs/POST-SCHEMA.md`.

## P3 — Profiles

* New contribution strip: real counts per post type, only for types the account
  actually published (a new account shows nothing rather than zeros).
* Topic chips are canonicalised through `normalizeTopic()`; interests matching a
  post topic get that topic's accent, free interests stay neutral, and the block
  now says *"Mada binafsi anazofuatilia — si lebo za chapisho"* so the interest
  list is never mistaken for the post taxonomy.
* Verification is untouched and still evidence-only: role gives an accent, never a
  badge; the two verification kinds stay separate; sample personas stay labelled
  `Sampuli`.
* Auth, permissions and the sensitive info-cards gate (`infoCards` renders only
  values the owner filled) are unchanged.

## P4 — Composer (types, topics, shortcuts)

* Five type chips + five topic chips remain two independent controls; the six
  shortcut chips are shortcuts only: **Elimu → type**, the other five → topic.
  Neither axis ever writes the other.
* `setType()` is the single writer for the type axis (used by chips and by the
  Elimu shortcut); `syncChoiceChips()` repaints topic/audience/shortcut pressed
  state from the real field values, so `aria-pressed` can't drift from the form.
* `readForm()` now returns canonical ids/labels (`normalizeTopic`, `topicLabel`),
  with no legacy `'people'` / `'Usalama wa Watu'` fallbacks left in code.
* Draft restore normalises a v1 topic before it is shown.
* Media, text, audience, draft, preview and publish handlers are all preserved;
  the emergency/SOS workflow is not reachable from the composer (asserted by tests).

## P5 — Engagement & feed states

* Feed now has real **loading** (skeleton, no fake content), **empty**,
  **no-results** and **error** states. Empty/no-results offer one action
  (show all topics / clear filter); error offers a retry that re-runs the loader.
* `renderFeed()` catches a storage failure instead of leaving a blank `aria-busy`
  list, and `[data-feed-retry]` / `[data-feed-clear]` are delegated in
  `home-controller.js`.
* Engagement writes (helpful, save, follow) gained a pending guard so a double tap
  cannot queue two writes, plus a real error path that reports the failure and
  leaves the prior state intact. Persistence is still `toggleFlag()` → IndexedDB;
  all ten existing actions and the compact menu are untouched.

## P6 — Tests, docs, package

* New `tests/posttypes.spec.js` — **33 checks**: taxonomy (T1–T5), composer
  markup and chip independence (B1–B11), validation/publish (C1–C5), backward
  compatibility (D1–D4), SOS separation (E1–E2), persistence and draft migration
  (F1–F3), feed filters and console/page-error guards (G1–G3).
* Added to `tools/run_tests.sh`; `tests/home.spec.js` (E4 topic labels, E6 filter
  id) and `tests/refine.spec.js` (topic chip ids/labels) were deliberately updated
  for the new taxonomy.
* Docs: `docs/DESIGN-TOKENS.md`, `docs/POST-SCHEMA.md`, this file, plus
  `docs/TEST-LOG.md` §J and README/START-HERE counts.
* Package rebuilt and verified: see `GuardHai-Complete-Project.zip` +
  `.sha256` + `.contents.txt` (open-tested by extracting and running the suites
  against the extracted copy).

> **Follow-up:** the Home hero was upgraded to a five-photo slideshow after this
> pass — see [`HERO-SLIDESHOW.md`](HERO-SLIDESHOW.md). It adds
> `src/features/hero/hero-slideshow.js`, `assets/css/13-hero.css`,
> `tests/hero.spec.js` and two local photos; the gate is now 12/12 + 280/280.

---

## Real test results (2026-10-27)

```
python3 tools/verify_app.py  → 12/12 checks passed
home      60/60
composer  72/72
bugfix    23/23
profile   20/20
showcase  20/20
refine    29/29
posttypes 33/33
TOTAL     257/257
```

Unresolved failures: **none** in the gate. Two cosmetic leftovers are listed below.

## Changed files

New:

* `assets/css/00-tokens.css`, `assets/css/12-posttypes.css`
* `src/features/feed/post-blocks.js`
* `tests/posttypes.spec.js`
* `docs/DESIGN-TOKENS.md`, `docs/POST-SCHEMA.md`, `docs/PHASE-P1-P6.md`
* `docs/screens/30-p2-post-afya.png … 41-p5-feed-empty.png` (12 screenshots)

Modified:

* `index.html` (token + posttypes links, feed topic tiles, composer shortcuts /
  topic chips / topic options)
* `src/domain/post.js`, `src/data/seed-posts.js`
* `src/features/feed/post-card.js`, `src/features/feed/feed-view.js`
* `src/features/home/home-controller.js`
* `src/features/composer/composer-view.js`
* `src/features/profile/profile-view.js`
* `src/features/engagement/engagement-actions.js`
* `src/i18n/i18n.js`
* `assets/css/09-profile.css` (P3 additions only)
* `tests/home.spec.js`, `tests/refine.spec.js`, `tools/run_tests.sh`
* `docs/TEST-LOG.md`, `README.md`, `START-HERE.md`

## Issues needing further action

1. **Legacy hexes in old sheets.** `01-core` … `11-refine` still contain literal
   colours that numerically equal tokens (`#18A982`, `#94a3b8`, …). Rendering is
   unchanged; migrating them is mechanical but touches every sheet, so it is a
   separate, reviewable commit.
2. **`tests/composer.spec.js:232`** prints the old `/600` in its detail string
   (assertion is correct; the label is cosmetic).
3. **Seed profile interests** (`Uhalifu na Mali`, `Usalama wa Watu`, `Kidijitali`)
   are personal interests, not post labels, so they were deliberately left as the
   user typed them; they render neutral now and the block is labelled as interests.
4. **Contacts/source blocks are not authorable in the composer UI yet** — the
   domain, cleaning and rendering exist and demo data exercises them; adding form
   fields is a UI task for the next pass, not a backend dependency.
5. **Composer media is still local-only** (IndexedDB blobs). Multiple images,
   video and audio preview/removal already work; nothing is uploaded, and the UI
   says so.
