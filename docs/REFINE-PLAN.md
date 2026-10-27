# GuardHai — plan ya marekebisho ya UI (reference ya picha ya 2)

Tarehe: 2026-10-27
Backup: `backup/pre-refine-ui-20261027T154405Z/` (faili 140 + `SHA256SUMS.txt`)
Hali: **IMETEKELEZWA** — angalia §6 kwa matokeo na ripoti ya faili.

Picha ya rejea: `uploads/GuardHai Mobile App UI Showcase.png`.

---

## 1. Ukaguzi wa hali ya sasa (kabla ya kubadilisha)

### 1.1 Kinachofanya kazi sasa

| Sehemu | Hali | Faili |
|---|---|---|
| Home (hero, SOS, vitendo 6, Uwanja, feed) | inafanya kazi | `index.html`, `04-home.css`, `10-showcase.css` |
| Wasifu (cover, avatar, tabs 4, sifa, uhariri) | inafanya kazi | `features/profile/*` |
| Kadi za chapisho + engagement rail 5 | inafanya kazi | `features/feed/post-card.js` |
| Composer (maandishi, aina, mada, watazamaji, media 5, preview, rasimu) | inafanya kazi | `features/composer/*` |
| Utafutaji wa ndani | inafanya kazi | `feed-view.js`, `home-controller.js` |
| Nav: Home · Afya · SOS · Shield · Chat | haijabadilishwa | `index.html` |
| Suites 5 (195 checks) | 195/195 | `tests/*` |

### 1.2 Engagement actions zote zilizopo (hazitolewi)

| # | Action | Kitufe | Handler | Faili:line |
|---|---|---|---|---|
| 1 | Imenisaidia (like) | `data-act="helpful"` | `toggleHelpful()` → `toggleFlag('helpful')` | `post-card.js:118`, `engagement-actions.js:16` |
| 2 | Maoni + majibu | `data-act="comment"` | `openThread()` → `addComment(parentId)` | `engagement-actions.js`, `comment-thread.js` |
| 3 | Shiriki | `data-act="share"` | `share()` (navigator.share → clipboard) | `engagement-actions.js:69` |
| 4 | Hifadhi | `data-act="save"` | `toggleSave()` | `engagement-actions.js:25` |
| 5 | Vitendo zaidi | `data-act="more"` | `postMenu()` | `engagement-actions.js:45` |
| 6 | Fuata / Acha | `data-follow-btn` | `toggleFollow()` (IndexedDB `follows`) | `engagement-actions.js:34` |
| 7 | Tuma kwa mtu | menu `send` (haitumiki bila `navigator.share`) | `sendToPerson()` | `engagement-actions.js:115` |
| 8 | Fungua wasifu | `data-profile` | `openAuthor()` → `openProfile()` | `engagement-actions.js:137` |
| 9 | Nakili kiungo | menu `copy` | `copyLink()` | `engagement-actions.js:105` |
| 10 | Ripoti (post + comment) | menu `report` | `report()` → `submitReport()` → `fileReport()` | `engagement-actions.js:156` |

**Ahadi:** kila kitufe na handler hapo juu kinabaki. Hakuna `data-act`, `data-menu`, `data-follow-btn` wala `data-profile` litakaloondolewa. Delegate moja (`home-controller.js:186-230`) haitabadilika kwa jina la action.

---

## 2. Faili zitakazobadilika (na kwa nini)

### 2.1 Mpya

| Faili | Kazi |
|---|---|
| `assets/css/11-refine.css` | marekebisho ya picha ya 2: tiles za quick actions (mviringo-mraba), topic tiles, kadi za chapisho, wasifu wenye info-cards, composer wa media-tiles |
| `tests/refine.spec.js` | suite mpya: tiles, mpangilio wa quick actions, info-cards za kila jukumu, media tiles za composer, engagement 7 zote, responsive |

> CSS: `01–10` haziguzwi. `11-refine.css` inaingizwa mwisho ili iweze kuboresha bila kufuta.

### 2.2 Zitakazobadilishwa (na mabadiliko madogo, yenye mipaka)

| Faili | Mabadiliko |
|---|---|
| `index.html` | (a) mpangilio wa quick actions → Afya, Shield, Tafuta Kifaa, **Ramani**, Walezi, Elimu (kama picha na kama ilivyokuwa awali); (b) safety card: kitufe kijani "Weka sasa →"; (c) hero: quote + chip "GuardHai"; (d) topics: markup ya tiles zenye ikoni; (e) "Shiriki Elimu" kurudi kuwa pill yenye maandishi |
| `assets/css/10-showcase.css` | vigezo vidogo tu (radius, pastel) vinavyohitajika na `11`; au hakuna — kuamuliwa wakati wa utekelezaji |
| `src/features/feed/post-card.js` | mpangilio: mstari wa mwandishi (avatar, jina, jukumu · muda), Fuata + ⋯ juu-kulia, kisha chips (aina ya post + Sampuli + mahali), kisha kichwa/maandishi/media, kisha rail |
| `src/features/feed/feed-view.js` | kusoma tiles za topic (badala ya pills) — logic ile ile ya `filterTopic` |
| `src/features/profile/profile-view.js` | (a) mstari wa ushirika "Jukumu \| Taasisi"; (b) **info-cards 2 za kila jukumu**; (c) chips za mada kwa mtindo wa picha; (d) tabs zile zile 4 |
| `src/domain/profile.js` | sehemu mpya **za hiari**: `affiliation`, `availability`, `serviceAreas`, `orgKind`, `coverage` — zote `''` kwa default, hazionyeshwi kama hazipo |
| `src/data/profiles.js` | thamani za **sampuli** kwa personas 5 (zinaonekana chini ya beji `Sampuli`) |
| `src/features/profile/profile-edit.js` | sehemu za hiari hizo kwa mmiliki (blank by default → hazionyeshwi) |
| `src/features/engagement/engagement-actions.js` | kuongeza `openActionSheet(postId)` — **haiondoi** chochote; inaonyesha action zote 7 kama tiles kubwa |
| `src/features/home/home-controller.js` | kuunganisha `openActionSheet` kwenye `data-act="more"` (badala ya menyu ndogo tu: menyu inabaki) |
| `src/i18n/i18n.js` | funguo mpya za sw/en (idempotent, 1:1) |
| `tests/home.spec.js`, `tests/showcase.spec.js` | kurekebisha `D1`, `S6` (mpangilio mpya wa quick actions) — sababu itaandikwa |
| `docs/ARCHITECTURE.md`, `REFACTOR-NOTES.md`, `TEST-LOG.md`, `README.md`, `START-HERE.md` | kumbukumbu ya awamu hii |

### 2.3 Hazitaguzwa

`src/engines/**` (Shield, auth, nav), `src/data/db.js`, `src/services/*` (isipokuwa hakuna), `src/mocks/**`, `src/core/**`, `assets/css/01–09`, `index.html` nav ya chini, `tools/verify_app.py` (isipokuwa check ya 10 CSS → 11), backend/auth/data architecture.

---

## 3. Kila sehemu: picha → mpango

### 3.1 Home

| Kipengele cha picha | Mpango | Ukweli |
|---|---|---|
| Hero yenye quote + chip "GuardHai" | badilisha maandishi ya hero kuwa quote, ongeza chip | hakuna data ya kubuni |
| "Hali ya usalama" + "Weka sasa →" | kitufe kijani kikubwa | button ipo; inafungua sheet ile ile |
| SOS: "Dharura?" + "(Muundo wa majaribio – Demo)" | weka "Dharura?" + maelezo **"(haitumwi · DEMO)"** | hakutumwa chochote — imeelezwa |
| Quick actions 6 za mviringo-mraba | radius 22, pastel, mpangilio wa picha | handlers zile zile |
| Topic tiles zenye ikoni | grid 3×2 (au 6 kwenye upana) | filter zile zile |
| Feed cards | mstari wa mwandishi + follow/⋯ juu | hakuna action inayoondolewa |

### 3.2 Wasifu — miundo 5

| Jukumu | Info-cards (mbili) | Chanzo |
|---|---|---|
| Mtaalamu wa Afya | *Kituo* + *Saa za upatikanaji* | `affiliation` + `availability` |
| Mtaalamu wa Usalama | *Taasisi/kitengo* + *Eneo la huduma* | `affiliation` + `coverage` |
| Taasisi | *Aina ya taasisi* + *Eneo* | `orgKind` + `coverage` |
| Mtoa msaada | *Maeneo ya kujitolea* + *Shughuli* | `serviceAreas` + `availability` |
| Mwananchi | *Mahali* + *Mada* | `location` + `topics` |

Kila block inaonekana **tu** kama thamani ipo. Persona za sampuli zinaandika data ya sampuli chini ya beji `Sampuli` — hakuna beji ya uthibitisho inayotengenezwa.

### 3.3 Post cards + categories

- Badges: `MAJANGA`, `AFYA`, `USALAMA`, `TAASISI`, `ELIMU` (+ `KUSAIDIANA` kwa `type: fursa`) — maandishi + rangi, si rangi pekee.
- Aina ya mchapishaji (`Mtaalamu wa Afya`, `Taasisi`…) na aina ya post (`Elimu`, `Taarifa`…) zinatenganishwa: role chip = mchapishaji, type badge = post.
- Hali ya uthibitisho kwa taarifa za majanga: inaonekana kama `Imethibitishwa` **tu** kwa data yenye ushahidi; sampuli inaonyesha `Sampuli`.

### 3.4 Composer

| Picha | Mpango |
|---|---|
| Media thumbnails zenye ✕ + "Ongeza zaidi" | tiles kutoka `composerState.attachments`; ✕ = `removeAttachment()` iliyopo |
| Mada kama chips | badilisha `<select>` → chips zenye thamani zile zile |
| Watazamaji kama buttons 3 | badilisha `<select>` → segmented (Umma / Jamii fulani / Walezi) |
| "Hifadhi rasimu" checkbox | checkbox inayoweka flag; button ya "Hifadhi Rasimu" inabaki |
| 0/2000 | **suali #3** — limit ya sasa ni 600 (`domain/post.js:21`) |

### 3.5 Engagement

- Rail ya kadi: 5 (helpful, comment, share, save, more) — kama ilivyo.
- `more` inafungua **sheet ya vitendo vyote 7** kwa tiles kubwa: Imenisaidia, Maoni, Shiriki, Hifadhi, Fuata, Tuma kwa mtu, Ripoti (+ Fungua wasifu, Nakili kiungo, Sampuli? hapana).
- Profail: Fuata + Tuma Ujumbe + ⋯.
- Counts: **pale tu** kuna mstari halisi (hakuna 124/18 za kubuni).

---

## 4. Mpango wa majaribio

1. `python3 tools/verify_app.py` → 12/12 (check ya CSS: 10 → 11 parts).
2. Suites zote: home 60 · composer 72 · bugfix 23 · profile 20 · showcase 20 · **refine ~24**.
3. Mabadiliko ya tests yatakayoandikwa: `home D1`, `showcase S6` (mpangilio wa quick actions), na lolote linalotokana na markup mpya.
4. Screenshots: 320 / 390 / 1024 kwa Home, Wasifu (afya, usalama, taasisi, mtoa msaada, mwananchi), Composer, feed.
5. Uthibitisho wa kifurushi (ZIP) baada ya suites kupita.

---

## 5. Maswali matatu kabla ya kutekeleza

1. **Mpangilio wa quick actions**: picha inaonyesha *Afya, Shield, Tafuta Kifaa, Ramani, Walezi, Elimu ya Usalama*. Sasa ni *Afya, Usalama, Tafuta Kifaa, Walezi, Elimu, Ramani*. Nibadilishe kurudi kwenye mpangilio wa picha?
2. **Data ya info-cards za wasifu**: personas za sampuli ziwe na kituo/saa/eneo (zinaonekana chini ya `Sampuli`), na mmiliki awe na sehemu hizo tupu?
3. **Kikomo cha maandishi ya composer**: nibaki 600 (kilichopo) au nipandishe hadi 2,000 kama picha?

Jibu la haya yataamua utekelezaji; hakuna file lililoguzwa bado.


---

## 6. Matokeo ya utekelezaji (2026-10-27)

### 6.1 Maamuzi ya mtumiaji

| Swali | Jibu | Kilichofanywa |
|---|---|---|
| Mpangilio wa quick actions | **Baki na wa sasa** | Afya, Usalama, Tafuta Kifaa, Walezi, Elimu, Ramani — `home D1` haikubadilishwa |
| Info-cards za wasifu | **Sampuli + mmiliki** | personas 5 zina thamani; mmiliki ana sehemu 5 tupu kuzijaza |
| Kikomo cha maandishi | **Pandisha hadi 2,000** | `LIMITS.text` + `maxlength` + counter + test mpya (R21/R22) |

### 6.2 Faili zilizobadilika

| Faili | Mabadiliko |
|---|---|
| `assets/css/11-refine.css` | **mpya** — tiles za mada, kichwa cha kadi, info-cards, chips/tiles za composer, action sheet, vifaa vya 320/1024 |
| `index.html` | CSS ya 11; tiles za mada zenye ikoni; chips za Mada/Watazamaji; checkbox ya rasimu; `maxlength=2000`; chip ya hero; avatar ya kichwa cha ndani |
| `src/domain/post.js` | `LIMITS.text` 600 → 2000 |
| `src/domain/profile.js` | `PROFILE_FIELDS` + sehemu 5 za hiari kwenye `normalizeProfile` |
| `src/data/profiles.js` | thamani za sampuli kwa personas 5 |
| `src/services/profile.service.js` | `saveMyProfile` inahifadhi sehemu 5 |
| `src/features/profile/profile-view.js` | `infoCards()` kwa kila jukumu + mstari wa ushirika |
| `src/features/profile/profile-edit.js` | sehemu 5 za kuhariri |
| `src/features/feed/post-card.js` | kichwa kipya (mwandishi kushoto, Fuata + ⋮ kulia), chips chini, kipengele cha menyu "Vitendo vyote" |
| `src/features/composer/composer-view.js` | `syncChoiceChips()`, wiring ya chips, nakala ya rasimu kabla ya kuchapisha |
| `src/features/composer/composer-media.js` | tile ya "Ongeza zaidi" |
| `src/features/engagement/engagement-actions.js` | `openActionSheet()` — vitendo 9 kama tiles |
| `src/features/home/home-controller.js` | `openActionSheet` kwenye menyu; `syncHeaderAvatar()` |
| `src/i18n/i18n.js` | funguo 12 mpya sw+en |
| `tools/run_tests.sh` | suite ya `refine` |
| `tools/verify_app.py` | kichwa cha check ya CSS kinategemea idadi halisi |
| `tests/refine.spec.js` | **mpya** — checks 29 (R1–R29) |
| `docs/*` | kumbukumbu |

### 6.3 Mapengo yaliyogunduliwa na kurekebishwa njiani

- Avatar ya kichwa ilikuwa `<img src="https://ui-avatars.com/...&name=DR+KAPAMA">` — jina la kubuni + ombi la mtandao. Sasa ni monogram ya ndani (`#topNavUserPic` + `syncHeaderAvatar()`).
- `DR KAPAMA` pia ulikuwa placeholder ya fomu ya kujiandikisha na jina la drawer → "Jina lako kamili" / "Mtumiaji".
- Mstari wa kifaa kwenye strip ya usalama (`Linux Workstation …`) uliondolewa kwenye strip; taarifa ipo kwenye sheet ya usalama.

### 6.4 Engagement — hakuna kilichotolewa

Rail ya vitendo 5 ipo kama ilivyo; menyu ya ⋮ ina vitu 6 (ile 5 + "Vitendo vyote"); sheet ina vitendo 9. Handlers zote zile 10 za §1.2 zinatumika, na R11 inathibitisha kwamba kuchagua "Imenisaidia" kwenye sheet kunabadilisha hali ya kadi.

### 6.5 Ripoti: kinachofanya kazi vs kinachohitaji backend

| Kinafanya kazi kwenye kifaa | Kinahitaji backend |
|---|---|
| Machapisho, media za ndani, rasimu, engagement, ripoti, fuata | Usambazaji wa SOS, arifa za push |
| Wasifu, picha, sehemu za hiari, uthibitisho *ombi* | Uthibitisho wa leseni/taasisi |
| Utafutaji, vichujio, tabs, composer, preview | Ujumbe (soma §"Tuma Ujumbe") |
| Ramani (Leaflet + tiles) | Ushirikiano wa moja kwa moja wa polisi/zahanati |
