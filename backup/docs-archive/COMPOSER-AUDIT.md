# GuardHai — Composer / Media / Engagement: Audit & Mpango (Phase 1)

**Tarehe:** 2026-10-27 · **Wigo:** Home composer, media attachments, engagement UI, feed cards.

---

## 1. Nilikagua nini

| Kipengele | Mahali | Hali iliyopatikana |
|---|---|---|
| Composer markup | `index.html` → `#ghComposer` | Form moja ya hatua moja; sehemu zote zipo |
| Composer logic | `js/guardhai-home.js` → `wireComposer / openComposer / mockMedia / mockLink / publish / saveDraft` | Media ni **mock-up** (`mockMedia` inaongeza `{kind, note:'mock-up'}` — hakuna faili) |
| Feed cards | `js/guardhai-home.js` → `_postCard()` | Media ni placeholder ya kubuni (`p.media: 'photo'`) |
| Engagement | `toggleHelpful / toggleSave / toggleFollow / comments / share / report` | Toggles zinafanya kazi;**count `(1)` ni ya kubuni**; comments/share/report ni sheets tupu |
| CSS | `css/guardhai.css` (sehemu ya Home redesign) | `.gh-post*`, `.gh-act`, `.ghc-*` |
| Media/storage service | `js/firebase-service.js` | **HAKUNA** — hakuna `firebase-storage`, hakuna `uploadBytes`, hakuna `fetch()` ya API |
| Icons | SVG sprite ya ndani | 71 symbols, mtindo mmoja (stroke, 24×24 viewBox) |

## 2. Uwezo wa backend / storage (uamuzi muhimu)

```
firebase-service.js imports: firebase-app, firebase-auth, firebase-firestore
                              (hakuna firebase-storage)
fetch()/XHR kwenye app      : 1 tu — HEAD check ya connectivity
API endpoints               : hakuna
```

**Hitimisho: hakuna upload infrastructure.** Kwa hiyo:

- **Sitajenga** upload ya kweli wala kudai media imepakiwa.
- Nitafanya **front-end prototype inayofanya kazi kwa kweli ndani ya browser**:
  - uteuzi wa faili halisi (`<input type="file">`),
  - **validation halisi** (aina, ukubwa, idadi),
  - **preview halisi** (thumbnail, `<video controls>`, `<audio controls>`) kwa `URL.createObjectURL`,
  - kuondoa / kubadilisha attachment,
  - **recording ya sauti** kwa `MediaRecorder` — ipo kwenye kifaa hiki (imethibitishwa),
    lakini itatumika tu kama kipengele cha hiari chenye feature-detect.
- **Kila mahali** itasemwa wazi: media inabaki kwenye kifaa; hakuna kinachopakiwa.
- Blob URLs zinapotea ukipakia upya → posts za mtumiaji ni **za kikao hiki** (session).

## 3. Uwezo wa platform (imepimwa kwenye browser halisi)

| API | Ipo? | Matumizi |
|---|---|---|
| `MediaRecorder` + `getUserMedia` | ✅ | kurekodi sauti (hiari) |
| `navigator.share` | ❌ (haipo kwenye Chromium hii/desktop) | **fallback ya copy-link itatumika** |
| `navigator.clipboard.writeText` | ✅ | copy link |
| `FileReader` / `URL.createObjectURL` | ✅ | previews |
| `<video>` / `<audio>` playback | ✅ | playback |
| `indexedDB` | ✅ | **haitatumika** (media haihifadhiwi kwenye rasimu) |

## 4. Faili nitakazobadilisha

| Faili | Badiliko | Aina |
|---|---|---|
| `guardhai-prototype/index.html` | composer markup mpya (hatua 2 + preview), file inputs, sprite symbols 4 | replace ya block la composer pekee |
| `guardhai-prototype/css/guardhai.css` | nyongeza: composer v2, media grid, engagement, post menu | **append pekee** |
| `guardhai-prototype/js/guardhai-home.js` | composer v2, media engine, engagement, comments thread, report flow, feed card | refactor wa ndani ya faili hili |
| `guardhai-prototype/js/guardhai-app.js` | keys mpya za i18n (sw+en) | **nyongeza pekee** |
| `tests/composer.spec.js` | **mpya** — suite ya composer/media/engagement | mpya |
| `tests/home.spec.js` | update selectors zilizobadilika | ndogo |
| `tools/home_scope_check.py` | kuongeza symbols/regions mpya kwenye allow-list | ndogo |
| `docs/COMPOSER-UPGRADE.md` | ripoti | mpya |

**HAITAGUSWA:** SOS dispatch, auth, Firebase config, Firestore, Shield, Recovery, Health,
top navigation, bottom navigation (items 5 zilezile), `mapPage`, `commPage`.
Nav ya juu/chini itaguzwa **tu** kama integration inahitaji (haitegemewi).

## 5. Maamuzi ya uwazi (yamepangwa mapema)

| Kipengele | Uamuzi |
|---|---|
| Counts za like/comment | **Hazitaonyeshwa** — hakuna data halisi. Kitufe kinaonyesha hali pekee |
| Verified badge | **Haitatumika** kwa sampuli; inaonyeshwa tu kama `post.verified === true` (hakuna post yenye hiyo) |
| Comment thread | **Ipo**, per-post, inahifadhi **kwenye kifaa hiki**; imeandikwa "haionekani kwa wengine" |
| Report | **Flow halisi** (sababu + maelezo + submit) inayorekodi **kwenye kifaa**, si kutuma |
| Share | `navigator.share` ikipatikana; vinginevyo copy-link (halisi) |
| Audience "Community" | Inaonyeshwa kama **sampuli** — hakuna communities halisi |
| Draft | Text + title + type + topic + audience + links. **Media haihifadhiwi** (itasemwa) |
| Publish | Inaingia kwenye feed ya kikao; beji "Yako · haijachapishwa mtandaoni" |
