# GuardHai — Post Composer, Media Support & Engagement UI

**Phase:** upgrade of the existing Home / *Uwanja* feed — no rebuild, no unrelated module touched.
**Date:** 2026-10-27 · **Status:** implemented, tested, **not committed / not pushed**.
**Backup before edits:** `backup/pre-composer-upgrade-20261027T100020Z/` (6 files + `SHA256SUMS.txt`, all verified OK).

---

## 1. What the audit found (and why it shapes this design)

Full findings: [`docs/COMPOSER-AUDIT.md`](COMPOSER-AUDIT.md).

| Question | Answer |
|---|---|
| Is there a storage backend? | **No.** `js/firebase-service.js` imports only `firebase-app`, `firebase-auth`, `firebase-firestore`. a `storageBucket` is *configured* (value masked here), but the Storage SDK is never loaded. |
| Any upload helper / API endpoint? | **No.** No `uploadBytes`, no `getDownloadURL`, no `/api/` routes. The only `fetch()` in the app is a connectivity HEAD probe. |
| What did the old composer do? | Pushed `{ kind, note: 'mock-up' }` placeholders. **No `<input type="file">` existed anywhere.** |
| What can the browser do? | `MediaRecorder` ✅ · `getUserMedia` ✅ · `FileReader` ✅ · `URL.createObjectURL` ✅ · `<video>/<audio>` ✅ · `navigator.clipboard.writeText` ✅ · **`navigator.share` ❌** (absent in this environment). |

**Consequence:** media is a **clearly labelled front-end prototype**. Files are read locally, previewed from `blob:` object URLs and never leave the device. Every surface that could be mistaken for a real upload states that plainly (composer banner, per-attachment tag, size note, publish toast, post badge). The backend work still required is listed in §8 — nothing is faked instead.

---

## 2. Files changed

| File | Δ | What changed |
|---|---|---|
| `guardhai-prototype/index.html` | 128,782 → **132,873 B** | `#ghComposer` block replaced with the two-step composer; 3 hidden file inputs; 4 new sprite symbols (`i-image-plus`, `i-refresh`, `i-alert-circle`, `i-corner-up-left`) — 72 → 76, none removed. Nothing outside the composer/sprite regions. |
| `guardhai-prototype/js/guardhai-home.js` | 29,673 → **61,022 B** | Media engine, validation, preview step, cancel/draft lifecycle, feed card rewrite, engagement refactor, comment thread, report flow, share. |
| `guardhai-prototype/css/guardhai.css` | 54,774 → **68,360 B** | **Append-only** (original 507 lines still an exact prefix) — composer, tray, gallery, engagement row, menus, sheets, responsive rules. |
| `guardhai-prototype/js/guardhai-app.js` | 181,361 → **182,283 B** | 5 new i18n keys + 4 corrected strings, inside the `sw`/`en` dictionaries only. |
| `tests/composer.spec.js` | **new, 39,676 B** | 71-check acceptance suite (self-generating fixtures). |
| `tests/home.spec.js` | 21,082 → 22,450 B | 8 selectors updated to the new engagement/composer contract; 60/60 still green. |
| `tools/home_scope_check.py` | 8,666 → 9,452 B | Added a semantic "every added i18n line is a translation entry" rule; region anchors unchanged. |
| `docs/COMPOSER-UPGRADE.md` | **new** | this report |
| `docs/composer-*.png`, `docs/composer-test-results.json` | **new** | screenshots + machine-readable results |

**Untouched and verified:** `js/firebase-service.js` (byte-identical), SOS dispatch, auth flow, health records, Shield, device recovery, map, top nav, bottom nav, all other pages.

---

## 3. The composer

Two steps — **edit → preview → publish** — so nothing is published unseen.

**Fields:** optional title (120 ch) · post type · description (600 ch, live counter) · topic · audience · attachments · source links.

| Control | Behaviour |
|---|---|
| **Post types** | Elimu · Swali · Uzoefu wa Jamii · Taarifa ya Taasisi · Fursa ya Kusaidia (single-select chips, keyboard reachable). |
| **Topic** | the 5 existing feed topics (same taxonomy as the filter bar, so a published post lands in the right filter). |
| **Audience** | Umma / Jamii fulani / Walezi pekee — **all marked “(sampuli)”** because audience targeting has no backend. |
| **Publish / Cancel / Draft / Preview** | always visible in the footer. On ≤420 px the primary action is full-width at the bottom (one-hand reach) with the secondary row above it. |

### Media rules (client-side, enforced before anything is previewed)

| Kind | Accepted | Max size | Max per post |
|---|---|---|---|
| Image | JPEG, PNG, WEBP, GIF | 5 MB | 4 |
| Video | MP4, WEBM, OGG | 50 MB | 1 |
| Audio file | MP3, WAV, OGG, WEBM, MP4/M4A | 15 MB | 1 |
| Link | `http(s)://` only | — | 3 |

Total attachments ≤ 6. MIME is compared on the **base type** (`audio/webm;codecs=opus` is accepted — this was a real bug found by testing the recorder).

### States that exist

- **preparing → ready** per attachment (real `URL.createObjectURL` decode, ~60 ms)
- **remove** (revokes the object URL) and **replace** (re-opens the picker for the same kind)
- **inline errors**, one line per rejected file, with the reason and the limit (wrong MIME, too big, empty file, too many, bad/unsafe link)
- **success**: publish button shows “Inaandaa…”, then the composer closes, the feed scrolls to the new post and a toast states it is device-only
- **failure**: pressing Publish with no text keeps the composer open, shows the error, and returns to step 1
- **cancel**: closes, clears the editor, revokes object URLs — and if there was text, it is **kept as a device draft** instead of being silently lost
- **draft**: localStorage, text + title + type + topic + audience + links (max 20). **Media is never persisted** (size/privacy) and the toast says how many attachments were dropped.

### Audio

Both an **audio-file** attachment and **in-browser recording** exist, because the probe showed `MediaRecorder` + `getUserMedia` present. Recording shows a pulsing state and a “Simamisha” label, produces a real `audio/webm` attachment with an inline player, and fails gracefully with a readable message if the microphone is denied. **Verified end-to-end** with Chromium's fake capture device (checks D4–D6).

---

## 4. Engagement row

One sprite family (76 symbols, 24×24, stroke 2, `fill:none`), consistent 17 px sizing, `aria-pressed` on toggles, `title` + `aria-label` everywhere.

| Control | Real behaviour | Honesty |
|---|---|---|
| 🤍 **Imenisaidia** | toggles on/off, state per post, `aria-pressed` | **no count is shown** — there is no server, so no number exists to show |
| 💬 **Maoni** | opens the **correct thread**, lists comments, lets you add one | count appears only after a comment exists; the sheet says comments live on this device only and no comment server is connected |
| ↗ **Shiriki** | `navigator.share` when available, else clipboard copy, else a sheet with a selectable link | toast says the link is a **sample** |
| 🔖 **Hifadhi** | toggles, relabels to “Imehifadhiwa” | device-only toast |
| ⋮ **More** | menu with *Fuata / Nakili kiungo / Ripoti*; closes on outside click | — |
| **Fuata** | header button + menu item stay in sync, `aria-pressed` | toast notes there is no server |
| 🚩 **Ripoti** | 5 reasons + note → stored in `localStorage` (`guardhai_home_reports`) | sheet and toast both state it is **not sent** to any moderator |

No dead controls: every icon above has a handler that does something real on this device, and says what it does. Nothing claims a remote effect it does not have.

---

## 5. Feed layout

- Author identity: 40 px initials avatar, name, account type, optional verified tick **only when `p.verified === true`** (no post currently qualifies — nothing fabricated).
- `SAMPULI` badge moved to the meta row (name row stays single-line on 390 px); user posts read **“Haijachapishwa mtandaoni”**.
- Topic chip + relative time on one meta row.
- Long descriptions collapse at 240 characters with **Zaidi / Punguza** (`aria-expanded`).
- Media: responsive 1/2/3/4-up gallery (`gh-gal-1…4`), object-fit cover, lightbox; video with native controls and a capped height; audio card; link cards with `rel="noopener noreferrer nofollow"` and the domain as the title.
- Sample posts render a labelled striped placeholder (“Picha (sampuli)”) rather than pretending to be a real file.
- Action row: 5 controls max, labels on ≥421 px, icons-only on phones **except** the primary “Imenisaidia” and any real count.
- Brand kept: white cards, `#18A982` primary, blue secondary actions, red reserved for SOS only.

---

## 6. Test results

| Suite | Result | Command |
|---|---|---|
| `tests/composer.spec.js` | **71 / 71 PASS** | `NODE_PATH=/tmp/pw/node_modules node tests/composer.spec.js` |
| `tests/home.spec.js` | **60 / 60 PASS** | `NODE_PATH=/tmp/pw/node_modules node tests/home.spec.js` |
| `tests/bugfix.spec.js` | **23 / 23 PASS** (0 page, 0 console errors) | `NODE_PATH=/tmp/pw/node_modules node tests/bugfix.spec.js` |
| `tools/home_scope_check.py` | **23 / 23 PASS** | `python3 tools/home_scope_check.py` |

Machine-readable: `docs/composer-test-results.json`. Screenshots: `docs/composer-feed-390.png`, `composer-tray-390.png`, `composer-preview-390.png`, `composer-comments-390.png`, `composer-report-390.png`, `composer-feed-1440.png`, `composer-form-1440.png`.

**Coverage of the required list**

- text-only post (B1–B3) · multiple images, removal, replacement, 4-image cap (C1–C5)
- preview gallery + preview-before-publish (C6–C7, D1b) · video preview & playback in feed (`readyState 4`, `currentTime` advances) (D1–D3)
- audio recording → attachment → playback in feed (D4–D6)
- invalid type, >5 MB image, >50 MB video, `javascript:` link (E1–E5) · empty publish blocked (E6) · errors don't leak between sessions (E7)
- cancel + draft + reload (F1–F6) · like/comment/share/save/follow/report (G1–G12) · long text expand (H1–H2)
- keyboard focus, tab order, Escape (I1–I3) · no overflow 320→1440 and composer inside viewport (I4–I5)
- icon family/stroke/size consistency (J1–J3) · counts only when real (J4)
- **no write requests and no external network calls during a full publish cycle** (J5–J6)
- duplicate ids, inline handlers resolve, nav contracts intact, zero page/console errors (K1–K6)

Two real bugs were found *by* these tests and fixed: the codec-suffixed MIME rejection (`audio/webm;codecs=opus`) and the mobile action-label rule that hid a real count.

---

## 7. Preserved boundaries

- **Bottom nav:** exactly `Home · Afya · SOS · Shield · Chat`, same order — asserted in composer (K3), home (G1) and bugfix suites.
- **Top nav:** `Storage · Notifications · Account · More` — asserted in composer (K4) and home (A1).
- **SOS / auth / health records / Shield / device recovery / map:** not modified; scope checker re-verifies `#shieldPage`, `#mapPage`, `#commPage` byte-for-byte and `firebase-service.js` byte-identical.
- No new dependency, framework, backend call, schema, permission or config change. No demo data replaced real data — sample posts keep `sample: true` and a visible badge; user posts are visibly “not published online”.
- No secret, credential or private URL appears in the code or this report.

---

## 8. What is still required on the backend

To turn this from a labelled prototype into a real composer, the following must be built (none of it was invented here):

1. **Object storage** — load `firebase-storage` (a `storageBucket` is already configured in the web config) or an equivalent service; add upload/download helpers to `js/firebase-service.js`.
2. **Security rules** — authenticated, owner-scoped writes; per-content-type size limits; **server-side re-validation of MIME and size** (client checks are advisory only and trivially bypassed).
3. **Post API** — `posts` collection/endpoint: create, list by topic, soft-delete by owner; server-assigned ids and timestamps.
4. **Media pipeline** — server-side transcode/thumbnail for video, EXIF stripping for images, virus scan, signed/expiring URLs (never public buckets).
5. **Engagement API** — likes, saves, follows, comments (threaded), and **real counts** returned by the server. Only then may counts be rendered.
6. **Moderation** — a report endpoint + reviewer queue; today reports stop at `localStorage`.
7. **Audience targeting** — community membership model before “Jamii fulani” can stop saying *(sampuli)*.
8. **Drafts** — server-side drafts (or IndexedDB with quota handling) if drafts must survive device changes; media blobs need real storage.
9. **i18n** — JS-generated strings in the feed/composer are currently Swahili only; extract them to the `I18N` dictionaries if English parity is required.

Also note (pre-existing, out of scope): the fixed “PROTOTYPE/DEMO” banner overlaps the top nav on wide screens, and the topic chip row scrolls horizontally on phones.

---

## 9. Rollback

```bash
B=backup/pre-composer-upgrade-20261027T100020Z
cp $B/index.html            guardhai-prototype/index.html
cp $B/guardhai.css          guardhai-prototype/css/guardhai.css
cp $B/guardhai-app.js       guardhai-prototype/js/guardhai-app.js
cp $B/guardhai-home.js      guardhai-prototype/js/guardhai-home.js
cp $B/home.spec.js          tests/home.spec.js
cp $B/home_scope_check.py   tools/home_scope_check.py
rm -f tests/composer.spec.js          # the new suite did not exist before
```
(Verified with `cd $B && sha256sum -c SHA256SUMS.txt` → all OK.)

The CSS is append-only, so reverting the four files restores the exact pre-upgrade state.
