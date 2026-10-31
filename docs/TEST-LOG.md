# GuardHai — Test Log

> **Kumbuka (2026-10-27):** sehemu za *Awamu 1* hapa chini zinataja
> `guardhai-prototype/` na scripts za classic. Folda hiyo haipo tena —
> mfumo umegawanywa kwenye `src/` (ona sehemu ya *Awamu 2* mwishoni na
> `docs/REFACTOR-NOTES.md`). Matokeo ya awamu 1 yamehifadhiwa kama historia.


**Tarehe:** 2026-10-27
**Environment:** Chromium (headless) 1134 · Playwright 1.47.2 · Node v20.20.2 · Python 3.13.16
**Server:** `python3 -m http.server 8123 --bind 0.0.0.0` kwenye `guardhai-prototype/`
**Viewport:** 390×844 (mobile), pia 320/360/430/768 kwa responsiveness

---

## F. Marekebisho ya bugs 7 — kabla vs baada (2026-10-27)

Suite: `tests/bugfix.spec.js` (inaweza kuendeshwa tena; inaandika `docs/last-test-results.json`).

```
KABLA   : 15/22 passed   (B1..B7 zote FAIL, R1..R7 zote PASS)
BAADA   : 23/23 passed   (B3c imeongezwa kama test ya njia halisi ya mtumiaji)
```

| ID | Check | Kabla | Baada |
|---|---|---|---|
| B1 | DEMO banner present & visible | FAIL — element missing | PASS — h=42px |
| B2 | Viewport allows user zoom | FAIL — `maximum-scale=1.0, user-scalable=no` | PASS |
| B3 | Language switch changes UI text | FAIL — wired=0 | PASS — wired=12 |
| B3b | Swahili nav labels not degraded | PASS | PASS |
| B3c | Language dropdown, real user path + persist | (test mpya) | PASS |
| B4 | SOS honest about demo | FAIL — "Triggered!" | PASS |
| B5 | No dead getElementById | FAIL — 2 dead refs | PASS — 0 |
| B6 | `#i-play` renders | FAIL — symbol missing | PASS — 14×18px |
| B7 | GHIcon defined once | FAIL — defs=2 | PASS — defs=1 |
| R1 | No page errors | PASS | PASS |
| R2 | Tab switching × 4 | PASS | PASS |
| R3 | Leaflet map init | PASS | PASS |
| R4 | Map tiles render | PASS | PASS |
| R5 | Shield → Health | PASS | PASS |
| R6 | Security check | PASS | PASS |
| R7 | No overflow 320/360/390/430/768 | PASS | PASS |

### Structural verifier (bila browser)

```
python3 tools/verify_prototype.py   ->  23/23 checks passed
  T1 asset references resolve
  T2 no inline code left in index.html
  T3 css unchanged except demo-banner (+9 lines, -0)
  T4 firebase-service.js byte-identical to original
  T5 app.js changed only by the documented lines (removed 11 / added 10, 0 unexpected)
  T6 all 7 fixes present at source level
  T7 backup sha256 unchanged
  T8 syntax: app parses, module parses, CSS braces balanced
```

### Diff kamili dhidi ya backup

```
python3 tools/diff_against_backup.py
  markup index.html          : +25 / -19
  css    css/guardhai.css    : +10 / -0
  module js/firebase-service.js : +0 / -0   (no changes)
  app    js/guardhai-app.js  : +10 / -11
  TOTAL: +45 / -30
```

### Test moja inayoshindikana kwenye suite ya awali (haijarekebishwa kwa makusudi)

`functional.js` (suite ya ukaguzi) bado inaonyesha `FAIL  Language switch persists`
kwenye **25/26**. Sababu: test hiyo ilichagua `.lang-toggle` ya kwanza kwenye DOM
(iko kwenye screen iliyofichwa) na `.catch(()=>{})` ilifunika kosa — kwa hiyo
`localStorage` haikubadilika **ndani ya test**, si ndani ya app. Njia halisi
imethibitishwa kwenye **B3c** (dropdown inayoonekana → maandishi yanabadilika →
`localStorage='en'` → inabaki baada ya reload).

---

## A. Structural / integrity tests

### A1 — Mafaili yote yaliyorejelewa yapo

```
PASS  css/guardhai.css
PASS  js/firebase-service.js
PASS  js/guardhai-app.js
```

### A2–A5 — Content preservation (verify_split.py)

```
TEST 1 — re-indent generated files, expect byte-identical to original slice
  PASS  css/guardhai.css          identical apart from indentation (27,385 chars)
  PASS  js/firebase-service.js    identical apart from indentation  (2,020 chars)
  PASS  js/guardhai-app.js        identical apart from indentation (127,474 chars)

TEST 2 — full-file content fingerprint (whitespace-insensitive)
  original (CF removed): 239,554 chars   rebuilt: 239,554 chars
  PASS  identical after whitespace normalisation

TEST 3 — asset/link references in new index.html resolve on disk
  PASS  css/guardhai.css   PASS  js/firebase-service.js   PASS  js/guardhai-app.js

TEST 4 — no inline <style>/<script> code left in index.html
  PASS  inline script blocks with code: 0
  PASS  inline <style> blocks: 0
```

### A6 — Syntax

```
PASS  js/guardhai-app.js parses as classic script   (node --check)
PASS  js/firebase-service.js parses as ES module    (node --check)
PASS  css/guardhai.css braces balanced              (249 open / 249 close)
```

### A7 — DOM integrity

```
PASS  elements with id: 223; duplicate ids: none
PASS  inline handlers checked: 120; distinct symbols: 17; unresolved: 0
```

### A8 — Icon sprite

```
defined: 58   referenced: 55
MISSING symbols: #i-play  (used in "Start Travel" button at index.html:899)
unused symbols : i-building, i-clock, i-globe, i-satellite, i-star, i-volume
```

### A9 — getElementById audit

```
targets: 110;  not present in static HTML: 15
→ 13 created dynamically by JS (insertAdjacentHTML / template strings)  OK
→  2 dead references, both null-guarded (no crash):
     lbl-ble-api-support   (js/guardhai-app.js:125)
     lbl-current-zone      (js/guardhai-app.js:675)
```

---

## B. Browser functional tests (25/26 PASS)

| # | Test | Result | Note |
|---|---|---|---|
| 1 | App boots without page errors | **PASS** | 0 page errors, 0 console errors |
| 2 | Splash auto-advances | **PASS** | |
| 3 | Welcome → Landing | **PASS** | |
| 4 | Landing → Register | **PASS** | |
| 5 | Register (demo) → Home | **PASS** | `AuthActions.handleRegister` |
| 6 | Top nav visible | **PASS** | |
| 7 | Bottom nav visible | **PASS** | |
| 8 | Tab "comm" switches view | **PASS** | |
| 9 | Tab "shield" switches view | **PASS** | |
| 10 | Tab "map" switches view | **PASS** | |
| 11 | Tab "home" switches view | **PASS** | |
| 12 | Leaflet map container initialised | **PASS** | `.leaflet-container` present |
| 13 | Leaflet tile/marker panes present | **PASS** | satellite tiles rendered |
| 14 | Shield → Health sub-tab | **PASS** | `#protect-view-health` visible |
| 15 | Shield pillar "find" switches | **PASS** | |
| 16 | Shield pillar "recover" switches | **PASS** | |
| 17 | Security check modal opens | **PASS** | `ProtectEngine.runReal7StepSecurityCheck()` |
| 18 | Security check renders results | **PASS** | 417 chars in `#security-check-results-body` |
| 19 | Security check: no new console errors | **PASS** | |
| 20 | SOS button responds | **PASS** | dialog: `SOS Emergency Alert Triggered!` (demo only) |
| 21 | **Language switch changes UI text** | **FAIL** | preference persists (`guardhai_lang=en`) but nav label stays "Nyumbani" |
| 22 | No horizontal overflow @ 320px | **PASS** | 320 vs 320 |
| 23 | No horizontal overflow @ 360px | **PASS** | 360 vs 360 |
| 24 | No horizontal overflow @ 390px | **PASS** | 390 vs 390 |
| 25 | No horizontal overflow @ 430px | **PASS** | 430 vs 430 |
| 26 | No horizontal overflow @ 768px | **PASS** | 768 vs 768 |

### B21 — Uchunguzi wa FAIL (root cause)

```
stored before: sw
I18N.setLanguage('en') -> { stored: "en", navLabel: "Nyumbani", opt: "en" }
```

`I18N.setLanguage()` inafanya mambo 3: (1) inahifadhi lugha, (2) inasawazisha
`.lang-toggle` selects, (3) inapitia `[data-i18n]`.

Markup ina **0** elements yenye `data-i18n`:

```
$ grep -o 'data-i18n' guardhai-prototype/index.html | wc -l
0
```

**Hitimisho:** bug ya awali. Mgawanyo wa faili haukuigusa. Suluhisho ni kuongeza
`data-i18n` kwenye markup (hatua 2 ya mapendekezo) — **hakuna** kilichofanywa bado.

---

## C. Screenshots (zilizopigwa kutoka prototype inayoendesha)

| Faili | Screen |
|---|---|
| `docs/screenshot-home.png` | Home: guardian active, KPI 3, SOS, bottom nav |
| `docs/screenshot-shield.png` | Shield Center: pillars 3, sub-tabs, Health |
| `docs/screenshot-map.png` | Map: Leaflet + satellite tiles ya Dar es Salaam |

---

## D. **Sikupima** — na hivyo sidai kitu

- Android / Capacitor kwenye kifaa halisi
- BLE, Wi-Fi Direct, hotspot, USB discovery
- Push notifications (FCM)
- Firebase Auth na credentials halisi (Google popup)
- Firestore reads/writes na rules za project halisi
- GPS ya kifaa halisi
- SOS dispatch (hakuna kinachotumwa)
- Backend ya yoyote (haipo)

## E. Kurudia tests

```bash
# 1. integrity
python3 tools/verify_split.py

# 2. static checks
node --check guardhai-prototype/js/guardhai-app.js
cp guardhai-prototype/js/firebase-service.js /tmp/fb.mjs && node --check /tmp/fb.mjs

# 3. browser (inahitaji playwright + chromium)
cd guardhai-prototype && python3 -m http.server 8123 &
#   kisha endesha scripts: smoke.js / functional.js (zilikuwa /tmp/pw/, hazijahifadhiwa)
```

> Kumbuka: `functional.js` na `smoke.js` ziliendeshwa kutoka `/tmp/pw/` (nje ya
> workspace) kwa sababu `node_modules` haihifadhiwi. Zinaweza kuandikwa upya kwa
> `npx playwright test` baadaye kama tests rasmi.

---

# Awamu 2 — modular refactor (2026-10-27, v0.5.0)

## A. Muundo

| Kipimo | Kabla | Baada |
|---|---|---|
| Faili za JS zinazounda app | 3 (pamoja na firebase) | 68 modules |
| Mistari ya JS | 5,133 | 7,079 |
| Faili kubwa zaidi | 3,712 | 498 (`engines/shield/protect-engine.js`) |
| CSS | faili 1 ya mistari 1,150 | sehemu 8, mistari 1,214 |
| Entry | scripts 3 za classic | `<script type="module" src="./src/main.js">` |

## B. Integrity — `python3 tools/verify_app.py`

```
1. layout        8 CSS parts kwa mpangilio · module entry moja · hakuna <style>
2. syntax        68/68 modules zinapita `node --check` (ES module)
3. imports       164 relative imports zote zinafika
4. bridges       65 inline handlers zina window bridge
5. i18n          sw == en (85 keys) · 68 data-i18n zote zimetafsiriwa
6. ids           284 ids, hakuna duplicate
7. wording       hakuna "prototype/demo" nje ya src/mocks
8. size          hakuna module iliyozidi mistari 600
9. mocks         domain/data/services hazitumii mocks
--------------------------------------------------------------------
12/12 checks passed
```

## C. Browser tests — `bash tools/run_tests.sh`

| Suite | Matokeo | Muda |
|---|---|---|
| `home.spec.js` | **60/60** | ~35 s |
| `composer.spec.js` | **71/71** | ~35 s |
| `bugfix.spec.js` | **23/23** | ~15 s |
| **Jumla** | **154/154** | ~85 s |

Page errors: 0 · Console errors: 0 kwenye suite zote tatu.

## D. Mabadiliko ya tests yaliyokusudiwa

| Check | Sababu |
|---|---|
| `home F10c` | rasimu sasa ziko IndexedDB (`drafts`), si `localStorage` |
| `composer F6`, `G12` | zinasoma `drafts`/`reports` stores |
| `home C1–C3`, `bugfix B4` | SOS haitumii `alert()` tena; inaonyesha sheet ya ukweli + namba 112/114/110 |
| `bugfix B1` | banner ni "Hali ya mfumo" (`#statusBanner`), si "PROTOTYPE / DEMO" |

## E. Sikupima / haipo

- Backend, Android, BLE, push, dispatch — bado hazipo; `src/mocks/` inasema hivyo.
- Firebase auth halisi (inaweza kuwa imezimwa nje ya mtandao; import ni dynamic
  na kushindwa kwake hakuangushi app).

## F. Kurudia

```bash
python3 -m http.server 8123 --bind 0.0.0.0 &
python3 tools/verify_app.py
bash tools/run_tests.sh
```

## G. Uthibitisho wa kifurushi (ZIP)

Kifurushi `GuardHai-Complete-Project.zip` kilijaribiwa **kabla ya kuwasilishwa**:
kimefunguliwa kwenye folda safi, kikatumika kwa `http.server`, kisha suites
zote tatu zikaendeshwa dhidi ya nakala hiyo (si workspace):

| Hatua | Matokeo |
|---|---|
| `unzip -t` | hakuna hitilafu |
| `sha256sum -c` | OK |
| `python3 tools/verify_app.py` (ndani ya ZIP) | 12/12 |
| home · composer · bugfix dhidi ya ZIP | 60/60 · 71/71 · 23/23 |
| page/console errors | 0 |
| `AIza…` kwenye ZIP | 0 (firebase config = placeholders) |

Faili: **102** · sha256 ya ZIP: imeandikwa kwenye `GuardHai-Complete-Project.zip.sha256`.

---

## H. Awamu ya wasifu, majukumu na engagement (2026-10-27)

Sehemu hii inachukua nafasi ya namba za awali: suite zimeongezeka kutoka tatu
hadi **nne**, na kifurushi kimeundwa upya.

### H1 — Static integrity

```bash
python3 tools/verify_app.py        # 12/12
```

| Kipimo | Thamani |
|---|---|
| relative imports zinazotatuliwa | 200 |
| inline handlers zenye bridge | 65 |
| i18n keys (sw = en) | 85 — hakuna tofauti |
| element zilizo na `data-i18n` | 68 — zote zimetafsiriwa |
| element ids | 284 — hakuna marudio |
| modules | 77, kubwa zaidi mistari 498 |
| mock isolation | `domain/`, `data/`, `services/` hazitumii `mocks/` |

### H2 — Browser suites

```bash
bash tools/run_tests.sh 8123
```

| Suite | Checks | Matokeo |
|---|---|---|
| `home.spec.js` | 60 | 60/60 |
| `composer.spec.js` | 72 | 72/72 |
| `bugfix.spec.js` | 23 | 23/23 |
| `profile.spec.js` (mpya) | 20 | 20/20 |
| **Jumla** | **175** | **175/175** |
| page/console errors | — | 0 |

`profile.spec.js` inathibitisha: personas tano tofauti, rangi/ikoni tofauti kwa
kila jukumu, beji ya `Sampuli` pekee kwa data ya mfano, leseni ≠ taasisi, jukumu
pekee hakitoi beji, follow inabaki baada ya reload, ujumbe unasema
`haijaunganishwa`, uhariri wa wasifu unahifadhiwa, majibu (replies) yanajipanga,
na vitendo vitano vya engagement viko palepale.

### H3 — Mabadiliko ya makusudi kwenye tests

| Check | Kabla | Sasa |
|---|---|---|
| `home F6` | menyu ina vite 3 pekee | inahitaji Follow, Copy, Report **na** kiungo cha wasifu (vite 5) |
| `composer G9` | kama juu | `>= 3` lakini vile vitatu bado vinahitajika |
| `composer J2` | ikoni zote `fill: none` | zisizo-chaguliwa tu; `J2b` mpya inathibitisha hali iliyochaguliwa inaonekana |
| `composer J2b`, `profile P7` | — | regex za `leseni`/`taasisi` bila kujali herufi kubwa |

### H4 — Uthibitisho wa kifurushi (ZIP)

| Hatua | Matokeo |
|---|---|
| `unzip -t` | hakuna hitilafu |
| `sha256sum -c` | OK |
| `python3 tools/verify_app.py` ndani ya ZIP | 12/12 |
| suites nne dhidi ya nakala iliyofunguliwa | 60/60 · 72/72 · 23/23 · 20/20 |
| `AIza…` kwenye ZIP | 0 (Firebase = placeholders) |

Faili: **138**. Idadi kamili ya bytes na sha256 ziko kwenye
`GuardHai-Complete-Project.contents.txt` na `GuardHai-Complete-Project.zip.sha256`
(hesabu ya ndani ya ZIP haiwezi kujijumuisha).

### H5 — Screenshots

`docs/screens/06-feed-rail-390.png` (rail ya ikoni + rangi za majukumu),
`07-profile-health-390.png`, `08-profile-verification-390.png`,
`09-profile-safety-390.png`.


---

## I. Awamu ya mwonekano (showcase) — 2026-10-27

Mabadiliko haya yalifuata picha ya muundo iliyotolewa na mtumiaji (panel sita).
Kila kitu kiliongezwa; hakuna kipengele kilichoondolewa.

### I1 — Static integrity

```bash
python3 tools/verify_app.py      # 12/12
```

Mabadiliko ya gate: neno `DEMO` sasa linaruhusiwa **tu** kwenye mstari unaosema
wazi kuwa kitendo hakifanyiki (`haitumwi`, `not transmitted`, `demo-chip`…).
Maneno mengine ya "demo/prototype" bado yanasababisha kushindwa.

### I2 — Browser suites

| Suite | Checks | Matokeo |
|---|---|---|
| `home.spec.js` | 60 | 60/60 |
| `composer.spec.js` | 72 | 72/72 |
| `bugfix.spec.js` | 23 | 23/23 |
| `profile.spec.js` | 20 | 20/20 |
| `showcase.spec.js` (mpya) | 20 | 20/20 |
| **Jumla** | **195** | **195/195** |

`showcase.spec.js` inathibitisha: hero yenye picha halisi ya ndani, SOS
mviringo wa 72px wenye `DEMO` na ujumbe "haitumwi", vitendo sita vya haraka
vyenye maeneo yote ya awali, beji ya aina ya chapisho kwa kila kadi, ukanda wa
tahadhari kwenye chapisho kimoja tu (na unasema ni sampuli), wasifu wenye cover
na avatar halisi + tabs nne, tabs zisibuni data mpya, picker ya picha
inayohifadhi kwenye kifaa (inabaki baada ya reload), utafutaji wa ndani bila
mtandao, na hakuna overflow wala kitufe kilichokatwa kuanzia 320px hadi 1024px.

### I3 — Mabadiliko ya makusudi kwenye tests

| Check | Kabla | Sasa |
|---|---|---|
| `home A1` | menyu ya juu = Storage, Notifications, Account, More | mpangilio huo unadaiwa, na "Tafuta kwenye Uwanja" inaruhusiwa mbele |
| `home D1` | Afya, Shield, Tafuta Kifaa, Ramani, Walezi, Elimu | Afya, Usalama, Tafuta Kifaa, Walezi, Elimu, Ramani (`data-qa` ndiyo kipimo) |
| `home F2c` | labels ndefu za aina | `data-type` tano + labels fupi za showcase |
| `home H1` | "GuardHai Community" | "Uwanja – Learn and Help Each Other" |
| `composer K4` | kama `home A1` | kama `home A1` |
| `profile P5/P15` | badges zilikuwa `.gh-profile-badges` | sasa `.gh-profile-verifyline` |
| `verify_app.py` §7 | `DEMO` yoyote = kosa | `DEMO` yenye maelezo ya ukweli = sawa |

### I4 — Picha

`docs/screens/10-showcase-home-390.png`, `11-showcase-feed-390.png`,
`12-showcase-profile-390.png`, `13-showcase-composer-390.png`,
`14-showcase-alert-390.png`, `15-showcase-home-320.png`,
`16-showcase-home-1024.png`.

### I5 — Uthibitisho wa kifurushi (ZIP)

| Hatua | Matokeo |
|---|---|
| `unzip -t` | hakuna hitilafu |
| `sha256sum -c` | OK |
| `python3 tools/verify_app.py` ndani ya ZIP | 12/12 |
| suites tano dhidi ya nakala iliyofunguliwa | 60/60 · 72/72 · 23/23 · 20/20 · 20/20 |
| picha zinazopakiwa kwenye kifurushi | `assets/img/*` zote zinarudiwa 200/304 — hazitegemezwi mtandaoni |

Faili: **159**. Idadi ya bytes na sha256 ziko kwenye
`GuardHai-Complete-Project.contents.txt` na `GuardHai-Complete-Project.zip.sha256`.


---

## J. Marekebisho ya UI (reference ya picha ya 2) — 2026-10-27

```bash
python3 tools/verify_app.py      # 12/12
bash tools/run_tests.sh 8123     # 224 browser checks
```

| Suite | Checks | Matokeo |
|---|---|---|
| `home.spec.js` | 60 | 60/60 |
| `composer.spec.js` | 72 | 72/72 |
| `bugfix.spec.js` | 23 | 23/23 |
| `profile.spec.js` | 20 | 20/20 |
| `showcase.spec.js` | 20 | 20/20 |
| `refine.spec.js` (mpya) | 29 | 29/29 |
| **Jumla** | **224** | **224/224** |

Suite mpya inashughulikia: tiles 6 za mada (ikoni + lebo + grid), kichujio bado
kinafanya kazi, kichwa cha kadi (mwandishi kushoto, Fuata + ⋮ kulia), rail ya
vitendo 5 haijaguzwa, chips za aina/Sampuli/mada, menyu yenye vitu 6, sheet ya
vitendo 9, kitendo kinachotekelezwa kweli, info-cards za majukumu 5, noti ya
"sampuli", uhariri wa sehemu 5 na mmiliki, chips za Mada/Watazamaji
zinazoandika `<select>` ile ile, kikomo 2,000, tiles za viambatisho + "Ongeza
zaidi", nakala ya rasimu, na hakuna overflow 320–1024.

### J1 — Mabadiliko ya tests yaliyoandikwa

| Check | Kabla | Sasa | Sababu |
|---|---|---|---|
| `composer C1/E5` | `#ghcAttachments .ghc-att:last-child` | haikuguzwa — tile ya "Ongeza zaidi" iko **kwanza** kwenye DOM na mwisho kwa `order` | DOM inabaki na maana ile ile |
| `verify_app §1` | "8 CSS parts" | `f"{len(css_parts)} CSS parts"` | sasa ziko 11 |

Hakuna check iliyofanywa nyepesi; `refine` ni nyongeza, si mbadala.

### J2 — Ripoti ya uaminifu

- `R16/R17` zinatakikisha wasifu wa sampuli **hau**-dai uthibitisho na kwamba
  info-cards zinaandikwa kuwa za sampuli.
- `R27` inaruhusu tu vitegemezi 4 vilivyoandikwa kwenye `index.html`
  (Poppins, Leaflet css+js, Firebase SDK); `ui-avatars.com` ilikuwa ombi la
  nje lisiloandikwa na iliondolewa.
- `R11/R25` zinathibitisha kwamba vitendo vina athari halisi (flag, rasimu).

### J3 — Picha

`docs/screens/20-refine-home-390.png` … `29-refine-home-1024.png` (10 picha:
home, tiles za mada, feed, action sheet, wasifu wa afya, wasifu wa mtoa msaada,
composer, kihariri, 320px, 1024px).

---

## K — Awamu ya P1…P6 (design system, post blocks, profiles, composer, engagement)

Tarehe: 2026-10-27. Amri: `bash tools/run_tests.sh 8123` (server:
`python3 -m http.server 8123 --bind 0.0.0.0`).

### K1 — Matokeo halisi

| Hatua | Kipimo | Matokeo |
|---|---|---|
| `python3 tools/verify_app.py` | 12 ukaguzi | **12/12 PASS** |
| `home.spec.js` | 60 | **60/60** |
| `composer.spec.js` | 72 | **72/72** |
| `bugfix.spec.js` | 23 | **23/23** |
| `profile.spec.js` | 20 | **20/20** |
| `showcase.spec.js` | 20 | **20/20** |
| `refine.spec.js` | 29 | **29/29** |
| `posttypes.spec.js` (mpya) | 33 | **33/33** |
| **Jumla** | **257** | **257/257** |

Hakuna jaribio lililobadilishwa kuwa jepesi. `posttypes` ni suite ya nane
imeongezwa kwenye `tools/run_tests.sh`.

### K2 — Mabadiliko ya tests yaliyokusudiwa

| Faili | Check | Kabla | Sasa | Sababu |
|---|---|---|---|---|
| `home.spec.js` | E4 | `Usalama wa Watu, Afya, Uhalifu na Mali, Ajali na Majanga, Usalama wa Kidijitali` | `Afya, Usalama, Taasisi, Kusaidiana, Majanga` | lebo mpya za mada (schema v2) |
| `home.spec.js` | E6 | `[data-topic="health"]` | `[data-topic="afya"]` | id mpya; chip ya `all` haikuguzwa |
| `refine.spec.js` | R* | `data-topic-chip="disaster"` | `data-topic-chip="majanga"` | id mpya |
| `verify_app.py` | § layout | orodha ya CSS 12 | orodha ya CSS 13 (`00-tokens…12-posttypes`) | sheets mbili mpya |

### K3 — Kilichothibitishwa na `posttypes.spec.js`

* **T1–T5** aina 5 na mada 5 kwa majina ya mwisho; `LEGACY_TOPICS` inabadilisha
  `health/people/crime/digital/disaster`; mada isiyojulikana inarudi `afya`.
* **B1–B11** chips 5 za aina, `<select>` + chips 5 za mada, chips 6 za mkato
  (Elimu→aina, nyingine→mada); kubadilisha upande mmoja **haku**guzi mwingine;
  `aria-pressed` inasoma hali halisi; kikomo 2,000; watazamaji 3.
* **C1–C5** `validateDraft` inakataa rasimu tupu na mada isiyojulikana; kuchapisha
  kunahifadhi `type` na `topic` kama sehemu mbili (`uzoefu`/`taasisi`), label na
  `schemaVersion: 2`; kadi inaonyesha beji ya mada (`Taasisi`) na chip `Taasisi`.
* **D1–D4** chapisho la schema v1 (`topic: 'health'`) linaonyeshwa kama `Afya`;
  chapisho lisilo na mada linapata fallback; sampuli 8 zote zina mada halali;
  hakuna kadi inayoonyesha *aina* mahali pa beji ya *mada*.
* **E1–E2** composer haina njia ya SOS wala msamiati wa dharura; chapisho la
  Majanga linachapishwa kama chapisho la kawaida — hakuna sheet ya SOS, hakuna
  rekodi ya tahadhari.
* **F1–F3** machapisho mawili yanabaki baada ya kupakia upya na sehemu zake mbili
  salama; rasimu ina `type`/`topic` tofauti; rasimu ya v1 (`people`) inapakiwa
  ikiwa `usalama`.
* **G1–G3** vichujio = `all` + mada 5; hakuna page error, hakuna console error.

### K4 — Picha

`docs/screens/30-p2-post-afya.png` … `41-p5-feed-empty.png` (12 picha): kadi za
mada 5 zenye blocks, composer (chips za mkato + mada), wasifu (contribution strip,
tabs), na hali ya "hakuna matokeo" ya feed.

### K5 — Uaminifu

* Sampuli zote zinaendelea kuonyesha `Sampuli — hakuna uthibitisho wa chanzo`;
  `verified: true` haijawekwa na normalization wala na mtumiaji.
* Hakuna chapisho linalodai kutumwa polisi; CTA ya ripoti inasema imeandikwa
  kwenye kifaa pekee.
* Hakuna ombi jipya la nje lililoongezwa (R27 bado inashika).

---

## L — Home hero slideshow (dynamic photo carousel)

Tarehe: 2026-10-27. Amri: `bash tools/run_tests.sh 8123`.

### L1 — Matokeo halisi

| Kipimo | Matokeo |
|---|---|
| `python3 tools/verify_app.py` | **12/12 PASS** (CSS sasa 14 parts) |
| `home.spec.js` | **60/60** |
| `composer.spec.js` | **72/72** |
| `bugfix.spec.js` | **23/23** |
| `profile.spec.js` | **20/20** |
| `showcase.spec.js` | **20/20** |
| `refine.spec.js` | **29/29** |
| `posttypes.spec.js` | **33/33** |
| `hero.spec.js` (mpya) | **23/23** |
| **Jumla** | **280/280** |

### L2 — Mabadiliko ya test yaliyokusudiwa

| Faili | Check | Kabla | Sasa | Sababu |
|---|---|---|---|---|
| `showcase.spec.js` | S2 | `title === 'Tayari kwa dharura'` | `title === 'Tayari kwa dharura?'` | copy iliyoombwa kwenye brief (alama ya kuuliza) |

Hakuna check iliyofanywa jepesi; `hero.spec.js` ni suite ya tisa.

### L3 — Kilichothibitishwa na `hero.spec.js`

* **H1–H4** hero moja tu; slides 5; markup ina `<img>` **moja** tu (eager) na
  `data-src` nne; picha inayofuata inapakiwa kwa background, zote tano hazipakiwi.
* **H5–H6** mistari mitatu iliyoombwa ipo mara moja; chip ya GuardHai + dot 5.
* **H7–H9** picha inabadilika yenyewe kwa **5.8s** (6s interval); kichwa, subtitle,
  maelezo na kitufe cha SOS **havisogei** (rects zinalingana kabla/baada); mpito ni
  `opacity 0.9s`.
* **H10** slide ya 5 → slide ya 1 (mzunguko).
* **H11–H13** dot inaruka kwenye picha, inasimamisha mzunguko, `aria-current` moja;
  kitufe cha pause kina `aria-pressed="true"`; iliyosimamishwa haibadiliki baada ya 3s.
* **H14–H15** tab iliyofichwa inasimamisha; kurudi inaendeleza.
* **H16** picha haipo → `.is-failed`, `<img>` inaondolewa, gradient ya slide
  inaonekana; maandishi yanabaki.
* **H17–H18** SOS inafungua sheet yake; tabo 5 za navigation (pamoja na SOS) na
  vitendo 6 vya haraka havijaguzwa.
* **H19** 320/390/768/1280: hakuna overflow, kichwa hakikatwi, controls
  hazigongani na maandishi.
* **H20–H21** `prefers-reduced-motion: reduce` → hakuna mzunguko wa kiotomatiki,
  `transition-duration: 0s`, dot bado inafanya kazi.
* **H22–H23** hakuna page error, hakuna console error.

### L4 — Picha

`docs/screens/50-hero-slide-1.png` … `56-hero-slide-5.png` (slides 1–5 + mid-states)
na `53-hero-320.png`, `54-hero-768.png`, `55-hero-1280.png`.

---

## M — Background colours, iconic identity, quick search, repost

Brief: “GuardHai Background Colors & Iconic Identity” (green = identity, blue =
information, white = content, soft green→blue gradient for identity blocks only),
plus the two functional asks (**search bar slightly below the top nav row**,
**repost buttons on posts**). No deployment.

### M1 — Matokeo halisi (`bash tools/run_tests.sh 8123`)

| Hatua | Matokeo |
|---|---|
| `tools/verify_app.py` | **12/12** |
| `home.spec.js` | **62/62** (60 + F8 repost + F9 undo) |
| `composer.spec.js` | **72/72** |
| `bugfix.spec.js` | **23/23** |
| `profile.spec.js` | **20/20** |
| `showcase.spec.js` | **20/20** |
| `refine.spec.js` | **29/29** |
| `posttypes.spec.js` | **33/33** |
| `hero.spec.js` | **23/23** |
| `identity.spec.js` (mpya) | **25/25** |
| **Jumla** | **307/307** — `RESULT: all checks passed` |

### M2 — Mabadiliko ya test yaliyokusudiwa

| Faili | Check | Kabla | Baada | Sababu |
|---|---|---|---|---|
| `showcase.spec.js` | S9 | `acts.length === 5` | `6` + `Rudia chapisho` | kitufe cha repost kimeongezwa |
| `profile.spec.js` | H1 | `acts === 5` | `6` | idem |
| `refine.spec.js` | R5 | rail ya `helpful…more` | `helpful, comment, share, save, repost, more` | idem |
| `home.spec.js` | F8/F9 | — | repost + undo mpya | tabia mpya |

Hakuna check iliyofanywa jepesi; `identity.spec.js` ni suite ya kumi.

### M3 — Kilichothibitishwa na `identity.spec.js`

* **I1–I2** sehemu ya utafutaji iko **chini ya row ya juu** (0px pengo), upana
  kamili 390px, `input` **moja** tu yenye placeholder “Tafuta kwenye Uwanja…”.
* **I3–I4** kuandika kunachuja feed halisi (8 → 2 kwa “maji”), hint inahesabu
  (“2 matokeo kwenye kifaa hiki”), kitufe cha kufuta kinarudisha 8.
* **I4b** upau unafichwa kwenye kurasa zisizo za Uwanja (Ramani).
* **I5** ikoni ya 🔍 kwenye top nav bado inafungua sheet ya kina.
* **I6–I9** sprite: 78 symbol, **0 missing**; ikoni zote za mraba; saizi kutoka
  ngazi 5 (13/16/20/22/24); stroke mmoja 1.9 (2.1 tu kwa <14px); hakuna `svg`
  nje ya `.ic`.
* **I10–I11** `--gh-grad-identity` imetangazwa **mara moja**; Shield na Map
  zina-band moja ya green→blue.
* **I12–I13** hero `::after` ina green (rgba 6,40,32) + blue (rgba 8,46,62) na
  alpha < 1; kichwa ni `rgb(255,255,255)`.
* **I14** kadi ni `rgb(255,255,255)` — maudhui hayakai kwenye gradient.
* **I15/I15b** profile cover ina identity gradient; panel inafungwa kwa Escape.
* **I16** chips: pill 999px, border ≤1.5px, contrast **5.91:1** (type) na
  **4.76:1** (topic).
* **I17** SOS ni red tupu (255,91,91 → 179,18,31), hakuna rangi ya identity.
* **I18–I20** repost ni action ya 6 yenye label, `aria-pressed`; rudio huunda
  kadi yenye “Umerudia kutoka kwa …”; kuondoa kunarudisha hesabu (8 → 9 → 8).
* **I21–I22** hakuna page/console error.

### M4 — Hitilafu zilizogundulika na kurekebishwa

1. **Rudio la rudio.** Kitufe kwenye kadi ya rudio liliunda rudio la rudio
   (8 → 9 → 10). Sasa kadi ya rudio inaonyesha “Ondoa rudio” (`data-act="unrepost"`)
   na `repost()` inakataa `original.repostOf`.
2. **Soft delete haikufanya kazi.** `normalizePost` iligeuza `status: 'deleted'`
   kuwa `'published'`, hivyo `deletePost` haikuondoa kitu chochote. Sasa
   tombstone inahifadhiwa; ndiyo iliyofanya undo ifanye kazi.
3. **Band ya SOS iligongana na red.** `.gh-sos` ya gradient ilifanya kadi ya SOS
   ionekane kama sandwich (teal nje, red ndani); band iliondolewa — red inabaki
   rangi ya dharura pekee.

### M5 — Picha

Kabla: `docs/screens/before-{home,shield,health,map,sos,profile}.png`.
Baada: `docs/screens/after-{home,feed,repost,shield,health,map,sos,profile}.png`
(390×844 @2x, hakuna page error wakati wa kupiga).

### M6 — Marekebisho ya miundombinu ya majaribio (hero suite)

Wakati wa kukagua kifurushi, `hero.spec.js` ilianza kushindwa mara kwa mara kwa
`ERR_INSUFFICIENT_RESOURCES` (sandbox ina RAM 2 GB; kilaukurasa wa ziada
ulizalisha maombi ~60 ya moduli kwa wakati mmoja). Mabadiliko **ya majaribio tu**
— hakuna mabadiliko ya app:

* `waitForApp()` mpya inasubiri `window.AuthFlow` kwa `page.evaluate` (Polling ya
  `requestAnimationFrame` husimamishwa kwenye kurasa zisizo ngazi mbele).
* Dirisha moja linatumika tena kwa upana 320/390/768/1280 na kwa
  `prefers-reduced-motion` (`emulateMedia`) badala ya kurasa mpya 6.
* Kila `boot()` inaruhusiwa kujaribu upya mara moja ikiwa fetch moja imeanguka.
* H23 inachuja *tu* `ERR_INSUFFICIENT_RESOURCES` ya sandbox; 404 halisi na
  makosa ya JS bado yanashindisha jaribio.

Idadi ya checks haijapungua: **H1–H23 = 23/23** bado.

### M7 — Kifurushi

Baada ya marekebisho ya M8: files **216**, zip **36,729,164 B**
(38,447,964 B kabla ya kubanwa), sha256
`29539964faf6af8638297615987473a8672c1cae444487467549f3e06f182045`;
`unzip -t` OK, `sha256sum -c` OK. (Kabla ya M8: 215 files, sha
`cfb6c439…fea`; kutoka zip ile `verify_app.py` 12/12, identity 24/24,
hero 23/23, home 62/62 zilipita.)

### M8 — Marekebisho: ikoni ya utafutaji moja tu (ombi la mtumiaji)

Ombi: “icon ya search ibaki moja ile iliyo juu… iondolewe, ibaki ile chini ndani ya
search bar” → kitufe cha 🔍 kwenye top nav kimeondolewa kabisa; **ikoni moja tu**
ya utafutaji iko ndani ya sehemu ya utafutaji (`#ghSearchBarOpen`).

* Header sasa ni `Storage · Notifications · Account · More` (vitufe 4 — sawa na
  kabla ya kazi ya utafutaji).
* Ikoni hiyo ndani ya field **inafanya kazi**: inafungua sheet ya utafutaji wa
  kina (`HomeUI.openSearch()`), kwa hiyo hakuna uwezo uliopotea.
* Kuandika kwenye field bado kunachuja feed papo hapo (engine ile ile).

Mabadiliko ya test: `home.spec.js` A1 (order kamili = vitufe 4, hakuna “Tafuta”),
`showcase.spec.js` S1 (vitufe 4) na S11 (`#ghSearchBarOpen` badala ya
`#ghSearchBtn`), `composer.spec.js` K4 (order kamili), `identity.spec.js` I4c mpya
(ikoni moja tu, iko ndani ya bar) na I5 (ikoni hiyo inafungua sheet).
Jumla mpya: **307/307**. Picha: `docs/screens/after-search-field.png`.

---

## N — GuardHai Health P1 (header, introduction panel, top partitions, bottom nav)

Awamu P1 pekee. Hakuna hifadhi ya data ya afya, hakuna backend, hakuna deployment.
Maelezo kamili: `docs/HEALTH-P1.md`.

### N1 — Matokeo halisi (`bash tools/run_tests.sh 8123`)

| Hatua | Matokeo |
|---|---|
| `tools/verify_app.py` | **12/12** |
| home | 62/62 · composer 72/72 · bugfix 23/23 · profile 20/20 · showcase 20/20 |
| refine 29/29 · posttypes 33/33 · hero 23/23 · identity 25/25 |
| **health.spec.js (mpya)** | **28/28** |
| **Jumla** | **335/335** — `RESULT: all checks passed` |

### N2 — Mabadiliko ya test yaliyokusudiwa

| Faili | Check | Kabla | Baada | Sababu |
|---|---|---|---|---|
| `home.spec.js` | D2 | Afya → Shield sub-tab | Afya → `#healthPage` | Health ina ukurasa wake |
| `bugfix.spec.js` | R5 | `#protect-view-health` | `#healthPage` + tab active | idem |

`Protection Health` (hali ya mfumo) haijaguzwa — inabaki kwenye Shield.

### N3 — Kilichothibitishwa na `health.spec.js`

* **HG1–HG2** `#healthPage` inafanya kazi; bottom nav ni ile ile (vitu 5), hakuna
  navigation ya pili ndani ya Health.
* **HG3–HG5** header: `GuardHai Health`, ikoni moja ya afya (`#i-heart-pulse`),
  kengele inafungua sheet ya notifications iliyopo.
* **HG6–HG7** panel ya utangulizi ina maneno yaliyokubaliwa; gradient ya
  identity inatumika hapa pekee; contrast **15.66:1**.
* **HG8–HG9** partitions 6 kwa mpangilio; `role="tablist"`, moja `aria-selected`,
  iliyochaguliwa ni kijani `rgb(24,169,130)`, nyingine `tabindex="-1"`.
* **HG10** kila partition inabadilisha maudhui bila kupakia ukurasa (moja tu
  inaonekana; `navigation` entry = 1).
* **HG11** keyboard: →, End, Home zinafanya kazi na focus inafuata.
* **HG12** `sessionStorage` ina **id ya partition pekee**; hakuna key ya afya.
* **HG13–HG15** Muhtasari una viungo 7 vilivyokubaliwa; empty state ya mtumiaji
  mpya ipo; kadi inaruka moja kwa moja kwenye partition yake.
* **HG16–HG17** hakuna kundi la damu, dozi wala “imethibitishwa” za kubuni;
  moduli zisizojengwa zina lebo ya awamu (P2–P5) na “haijaunganishwa”.
* **HG18–HG19** Medical SOS ni tofauti na SOS ya jumla; inasema wazi “hakuna ombi
  linalotumwa”, ina namba 112/114/110; SOS ya jumla ipo kama ilivyo.
* **HG20–HG21** error state inajieleza na retry inarudisha maudhui; `aria-busy`
  inasafishwa baada ya kuchora.
* **HG22** sw ↔ en bila reload.
* **HG23–HG24** 320/390/768/1280 hakuna overflow; nav haigongani (padding 132px);
  kwenye simu chips zinasogea, kwenye desktop zote zinaingia.
* **HG25** contracts 6, modules 7 — zote `store: null`.
* **HG26–HG28** hakuna request ya nje, hakuna page/console error.

### N4 — Picha

`docs/screens/health-p1-mobile.png`, `health-p1-desktop.png` na panels tano
(`health-p1-medical|records|meds|experts|more.png`), 390×844 @2x pamoja na
1280×900.

### N5 — Kifurushi

`GuardHai-Complete-Project.zip` — files **228**, zip **38,280,432 B**
(40,091,403 B kabla ya kubanwa), sha256
`25d0da96f990753b90f357c4cc7cf1be6ef2e981679623212cb09752cee8d398`;
`unzip -t` OK, `sha256sum -c` OK. Kutoka zip iliyotolewa (port 8133):
`verify_app.py` **12/12**, health **28/28**, home **62/62**, bugfix **23/23**,
identity **25/25**.

## O — Mtandao wa mawasiliano na msaada (Chats, Walezi, Msaada, Jamii, Gundua) — 2026-10-30

Awamu ya P2 ya mtandao. Hakuna seva, hakuna backend, hakuna deployment.
Maelezo kamili: `docs/NETWORK-P2.md`.

### O1 — Matokeo halisi (`bash tools/run_tests.sh 8123`)

| Hatua | Matokeo |
|---|---|
| `tools/verify_app.py` | **12/12** · ids 350 · i18n 128 (sw/en sawa) |
| home 62/62 · composer 72/72 · bugfix 23/23 · profile 20/20 · showcase 20/20 | sawa |
| refine 29/29 · posttypes 33/33 · hero 23/23 · identity 25/25 · health 54/54 | sawa |
| **network.spec.js (mpya)** | **65/65** |
| **Jumla** | **makundi 11, zote zimepita** — `RESULT: all checks passed` |

### O2 — Hitilafu halisi ya bidhaa iliyopatikana na test

`network-seed.js` ilikuwa na `SEED_MARK = 'sample'` wakati safu zilizoandikwa
zina `sample: true`. `clearDemo()` ililinganisha `row.sample === SEED_MARK`,
kwa hiyo **kufuta data ya sampuli hakukufanya kitu** (NC63: `before:true,
after:true`, mazungumzo 4 yalibaki). Sasa `SEED_MARK = true`; kufuta kunafuta
safu za sampuli tu na kuacha zile zilizoundwa na mtumiaji.

### O3 — Mabadiliko ya test yaliyokusudiwa (si ya bidhaa)

* NC16 — lebo ya faragha iko kwenye `chats.thread`, si `chats.settings`.
* NC28/NC30 — maandishi ya ombi la msaada yako kwenye `body`, si `subject`.
* NC21/22/24/51 — kitambulisho cha mtumiaji si `'me'`; kinatoka `chat.selfId()`.
* NC63 — `page.evaluate` iliyopangwa ndani ya nyingine ilitupa `page is not defined`;
  sasa ni moja.
* showcase S11 — "hakuna request" sasa inahesabu maombi ya data pekee; picha za
  ndani (`.jpg`) zilizopakiwa upya ni rasilimali za ukurasa, si mawasiliano na seva.
* home D4 — maneno mapya ya Walezi (`hakuna seva · kukubali · ruhusa`), si
  `hawajaunganishwa` ya awali.
* `import()` tatu zilibadilishwa kuwa `import` za kawaida (`home-controller.js`,
  `home-sheets.js`, `profile.service.js`) — kufungua sheet au "Message" hakutoi
  tena ombi la moduli wakati wa kugusa.

### O4 — Picha

`docs/screens/network-p2-01-chats-empty.png` … `network-p2-15-chats-desktop.png`
— 15 picha (390×844 @2x; ya mwisho 1280×900): mazungumzo matupu, yaliyowekwa
sampuli, thread, thread baada ya kutuma, mipangilio, walezi, ruhusa za mlezi,
msaada, ombi la msaada, jamii, jamii ndani, wanachama, gundua, gundua kwa
Kiingereza, na desktop. Hakuna page/console error wakati wa kunasa.

### O5 — Kinachobaki

Real-device na screen-reader pass; uthibitisho wa transport halisi (WebSocket /
Firebase) ni uamuzi wa Phase 8, si wa awamu hii.

## P — Redesign R1: Shield Center, SOS na Mfumo wa Design (GDS v1) — 2026-10-31

Maelezo kamili: `docs/REDESIGN-R1.md`, `docs/DESIGN-SYSTEM.md`, `docs/REDESIGN-AUDIT.md`.

### P1 — Matokeo halisi (`bash tools/run_tests.sh 8123`)

| Hatua | Matokeo |
|---|---|
| `tools/verify_app.py` | **12/12** · ids 375 · i18n 130 · handlers 69 |
| home 62/62 · composer 72/72 · bugfix 23/23 · profile 20/20 · showcase 20/20 | sawa |
| refine 29/29 · posttypes 33/33 · hero 23/23 · identity 25/25 | sawa |
| health 54/54 · network 65/65 | sawa |
| **shield.spec.js (mpya)** | **45/45** |
| **Jumla** | **makundi 12, zote zimepita** — `RESULT: all checks passed` |

### P2 — Kilichojengwa

* **Shield Center**: dashibodi (hali halisi, orodha ya uangalizi, tiles 6) +
  sehemu 7. Kifaa = injini ile ile iliyokamilika (pillars 3, sub-views 10).
* **Usalama binafsi**: skrini 7 zinazofanya kazi — walezi, safari, check-in,
  mipango, matukio, mapendeleo (+ historia ya pamoja).
* **SOS**: ukurasa kamili, aina 2, namba 3 za `tel:` juu ya fold, jedwali la
  "kinatumwa", kumbukumbu ya majaribio iliyo wazi `delivered: false`.
* **GDS v1**: `17-system.css` (mistari 750) + `shield-ui.js` (204) — tokeni,
  components 22, kontrasti iliyopimwa, reduced-motion.
* DB v4 (+stores 5), domain +`incident`, i18n +2 keys, gate +suite 1.

### P3 — Mabadiliko ya test yaliyokusudiwa (si ya bidhaa)

* home C2 — SOS ya bottom-nav sasa ni **ukurasa**, si sheet; hivyo inahakiki
  ukurasa huo (namba, uaminifu, modi 2). Sheet bado inafanya kazi (SC37).
* bugfix B4 — inasoma ukurasa wa SOS au sheet, ipi itakayoonekana.
* **Hitilafu halisi iliyopatikana na test**: `runAction()` ilikuwa na kinga ya
  `busy` kwa vitendo vyote; kugusa kitendo kingine wakati mmoja kilitupwa kimya
  (kitufe kikafa). Sasa kinga ni kwa kitendo kile kile tu (`busyAction`).

### P4 — Kinachobaki (R2)

Chat → GDS; transport halisi ili `shareWithGuardians` ifanye kazi; Home → GDS;
kontrasti ya paneli za Device Protection; real-device + screen-reader;
Asset Protection ikiwa tu kuna mshirika wa uthibitisho.

---

# Awamu R2 — Kujenga upya Chat (2026-10-31)

**Lengo:** inbox ya Chat ilikuwa imejaa (bango 2, toolbar 3 + link, preview
zilizokatwa) na upande wa mazungumzo haukuwa umeunganishwa vizuri (kiambatisho,
sauti, kufuta, hesabu ya ujumbe kwenye menyu).

## A. Kilichobadilika

| Faili | Badiliko |
|---|---|
| `src/features/network/screens-chats.js` | `home()` imejengwa upya (strip 1, vichujio 5 na hesabu, avatar ya herufi, preview mstari 1, saa juu ya badge); `thread()` imejengwa upya (bar ya utambulisho, separator za siku, bubble za media, composer sticky) |
| `src/features/network/network-actions.js` | +`chats.filter`, +`chats.delete`, +`chats.unattach`; `chats.attach` sasa inathibitisha na kuhifadhi blob; sauti inahifadhi blob; hakuna bango la ziada kwa kila ujumbe |
| `src/features/network/network-view.js` | `markRead()` kwenye `open('chats.thread')`, `schedulePaint()` ya kuunganisha matukio, `paintChatBadge()` kwa `#tab-chat`, `afterPaint` hook |
| `src/services/*` | hakuna mabadiliko ya API; `media.repo` + `media.service` zimetumika kama zilivyo |
| `assets/css/16-network.css` | sehemu mpya ya chat (mistari ~300): rows, strip, filters, chatbar, composer, media, badge |
| `docs/REDESIGN-R2.md` | hati ya awamu hii |
| `docs/screens/r2-01…08*.png` | screenshots 8 (390, 1280, kiambatisho, sauti, tupu, Kiingereza) |

## B. Matokeo halisi

```
python3 tools/verify_app.py            12/12  (module > 600? hapana · ids 375 · i18n 130)
bash tools/run_tests.sh 8123           12 suites · 471 checks · RESULT: all checks passed
```

| Suite | Matokeo |
|---|---|
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
| **network** | **65/65** (NC1–NC65) |
| shield | 45/45 |

## C. Vipimo vya layout

| Viewport | overflowX | panel | transcript |
|---|---|---|---|
| 390×844 | 0 | fitted, 428 px | inascroll ndani |
| 768×1024 | 0 | fitted, 468 px | haihitaji scroll |
| 1280×900 | 0 | fitted, 468 px (column 780 px) | haihitaji scroll |

Hakuna `pageerror` wala `console.error` kwenye run zote za R2.

## D. Mtego wa test uliokutwa

* `NC6` ilishindwa kwa sababu `text-transform: uppercase` ilibadilisha
  `innerText` kuwa `SAMPULI`, na test inatafuta `/Sampuli/` (bila `i`).
  Suluhisho: tag `Sampuli` haipinduliwi kwa CSS — neno linaandikwa kama
  lilivyo (na hivyo linabaki haki kwa screen reader pia).
* `NC16` inahitaji `Faragha: imefungwa` kwenye **thread**, si kwenye fomu ya
  mipangilio: hiyo sasa ni sehemu ya mstari wa utambulisho wa mazungumzo.

## E. Kinachobaki (R3)

Transport halisi (ujumbe kufika kwa mtu mwingine), majaribio ya skrini ndogo
320 px na screen reader halisi, na `deleteMessage()` kufuta blob ya media pamoja
na ujumbe.

## F. Marekebisho ya R2b — "mazungumzo yachukue skrini" (2026-10-31)

Baada ya inbox/thread kujengwa, tatizo lililobaki lilikuwa la **muktadha**:
thread ilifunguka chini ya kadi ya sehemu (~350 px ya chrome) hivyo ilichanganyika
na sehemu zisizohusiana.

| Badiliko | Mahali |
|---|---|
| `#commPage.is-focus` — kichwa cha sehemu (`.gh-net-head`) kinafichwa kwenye `chats.thread` tu | `network-view.js` · `16-network.css` |
| Kitufe cha nyuma ndani ya bar ya mazungumzo (`data-act="back"`) | `screens-chats.js` |
| Chips za usafirishaji (`#ghNetStrip`) zinafichwa kwenye sehemu ya chats (zilirudia maneno ya strip ya inbox) | `network-view.js` |
| Panel inachukua urefu uliobaki (`height`, si `maxHeight`) + ujumbe hukaa juu ya composer | `screens-chats.js` · `16-network.css` |
| Jina kamili kwenye bar: `Sampuli` imehamia mstari wa meta ("Faragha · Sampuli") | `screens-chats.js` |
| Bubble haiwezi kuzidi 640 px kwenye skrini pana | `16-network.css` |

Vipimo: 360/390/430 — bar haikati jina wala meta (`scrollWidth == clientWidth`);
768 panel 762 px; 1280 panel 638 px; `overflowX = 0` kote.

```
python3 tools/verify_app.py     12/12
bash tools/run_tests.sh 8123    12 suites · 471 checks · all green
```

## G. Universal Secure Storage Center — S1 (2026-10-31)

Ukurasa mpya `#storagePage` (skrini 15) ulichukua nafasi ya sheet ya Storage ya
awali. Vipimo vyake havijapotea: `storage.usage` inaonyesha jumla ya kifaa,
kikomo cha browser, posts, drafts, blobs za IndexedDB na funguo za
`guardhai*` za localStorage — row kwa row, kama zamani.

| Ombi | Kinachothibitisha |
|---|---|
| Kituo kimoja cha kila kumbukumbu | home: jamii 12 + aina 11 za ushahidi + kesi (ST5, ST7) |
| Utafutaji na vichujio | ST9–ST13 (vipimo 12, pipeline moja) |
| Kuongeza rekodi halisi | ST15–ST17 (pamoja na kukataa fomu tupu) |
| Rekodi za faragha | ST18–ST19 (locked page → unlock inaandikwa kwenye custody) |
| Halisi haibadilishwi | ST21–ST22 (`originId`, `version`) |
| Alama halisi ya faili | ST23 (hakuna blob → hakuna SHA-256, na inasemwa) |
| Kesi na ushahidi | ST24–ST25 |
| Kushiriki ni kumbukumbu | ST26 (pending; hakuna anayepokea) |
| Afya inabaki Afya | ST27–ST28 (pointer `readOnly`, bila blob, huondolewa ikifutwa) |
| Sampuli | ST4, ST31 (seed mara moja; clear haigusi data ya mtumiaji) |
| Muonekano | ST35 (hakuna overflow 390/1280), aria ST34 |

```
python3 tools/verify_app.py     12/12
bash tools/run_tests.sh 8123    13 suites · 509 checks · all green
  home 62 · composer 72 · bugfix 23 · profile 20 · showcase 20 · refine 29
  posttypes 33 · hero 23 · identity 25 · health 54 · network 65 · shield 45 · storage 38
```

Mtego mmoja uliogunduliwa wakati wa kujenga: `btn(..., { extra: 'type="submit"' })`
iliunda `<button type="button" … type="submit">` — attribute ya pili ilipuuzwa,
hivyo fomu hazikuwasilishwa kamwe. Sasa `form()` inachora submit button yenyewe
(`storage-ui.js`), na ST15 inathibitisha fomu inafanya kazi.

Kumbuka: `DB_VERSION` 4 → 5. Build ya zamani ikifungua DB hii baadaye itapata
`VersionError` na `db.js` itashuka kwenye in-memory (data inaonekana tupu).
Maelezo: `docs/STORAGE-CENTER.md` §10.

## H. Storage — pass ya maneno (2026-10-31)

Ombi: "mfumo uwe safi, usiwe na maneno mengi." Ukurasa ulipunguzwa maneno bila
kupunguza ukweli: hero ya mstari mmoja, tiles bila maelezo, `footNote` ya
mstari mmoja badala ya kadi za uaminifu, metadata bila kurudia badges, sehemu
3 badala ya 5 kwenye rekodi, na empty state moja badala ya dashboard ya sifuri.
`HONESTY` (ndefu) inabaki pale inapohitajika: rekodi na fomu ya kushiriki.

```
python3 tools/verify_app.py     12/12
bash tools/run_tests.sh 8123    13 suites · 509 checks · all green
```

## I. Storage — muonekano v2 (2026-10-31)

Rangi kwa aina ya rekodi (`data-tone` → `--tone`), hero yenye kina, kadi za jamii
za rangi, record sheet yenye kichwa cha tint na vitendo kwenye grid (hakuna
kukatwa), list zote ndani ya kadi, na `i-filter` iliyoongezwa kwenye sprite
(ilikuwa haipo — kitufe cha vichujio kilikuwa tupu).

```
python3 tools/verify_app.py     12/12
bash tools/run_tests.sh 8123    13 suites · 509 checks · all green
```

## J. Health — mfumo wa kimatibabu v3 (2026-10-31)

Ukurasa wa Afya ulipangwa upya kama mfumo mmoja: rangi ina maana ya kimatibabu,
kila kitu kiko ndani ya kadi moja, na hakuna kitufe kinachovunjwa au
kinachosongana.

**Rangi (tone map)** — inatumika kupitia `data-tone` → `--hx-tone/--hx-soft/--hx-ink2`:

| Rangi | Maana | Inatumika |
|---|---|---|
| green | utambulisho, usalama, wataalamu | wasifu wa kitaalamu, mtaalamu, elimu, jamii ya huduma |
| teal | kadi ya afya, majadiliano | Medical ID, kesi, mikutano |
| blue | miadi | miadi, ratiba |
| violet | rekodi na nyaraka | rekodi, QR, damu, jamii |
| amber | dawa na tahadhari | ratiba ya dozi, rufaa, arifa |
| red | dharura pekee | dharura, watu wa dharura |
| slate | kifaa / huduma zisizounganishwa | mipangilio, mipaka |

**Mpangilio**
* Tabs: grid 3×2 (390 px) → mstari mmoja (≥720). Hakuna scoroll ya mlalo —
  awali 4 za mwisho zilikatwa nusu.
* Stat tiles: nukta ya rangi + lebo + namba + mstari mmoja wa maelezo, 2 → 4 safu.
* Block: kichwa chenye ikoni ya rangi, mstari mmoja chini, nukuu ikiwa chini.
* Rows: grid `ikoni · copy · hesabu · kitendo`; vitendo `white-space: nowrap`
  (awali "Nimeitumia"/"Funga" zilikatwa kwa nusu).
* `progressRow()` mpya: lebo + asilimia juu, meter chini (Medical ID na dozi).
* Medical ID: kichwa cha gradient, facts 2→4 safu, vitendo 1 → 2 → 3 safu.
* Empty states: `.is-inline` (kadi moja yenye mstari mmoja) ndani ya block.
* Screen tone: kila sub-screen ina rangi yake kupitia `[data-health-screen]`,
  pamoja na mstari wa juu kwenye kadi ya kwanza.

**Uthibitisho**
```
bash tools/run_tests.sh 8123    13 suites · 509 checks · all green
python3 tools/verify_app.py     12/12
```
`HG17` ilibadilishwa kuwa case-insensitive (`/Iliongezwa/i`) kwa sababu lebo za
`dl` sasa zinaonyeshwa kwa HERUFI KUBWA kwa muundo. Picha: `docs/screens/h1-01…h1-07`.

## K. Home — pass ya muonekano v2 (2026-10-31)

Muundo: `docs/HOME-V2.md`. Hii ni kumbukumbu ya vipimo vilivyogusa muundo huo.

```
bash tools/run_tests.sh 8123    13 suites · 510 checks · all green
python3 tools/verify_app.py     12/12
```

| Suite | Kipimo | Kabla | Sasa | Sababu |
|---|---|---|---|---|
| home | E6 (topic pill) | FAIL | PASS | CSS inaweka `text-transform: uppercase`; spec inasoma `textContent` + `/i` |
| home | H1 (kichwa cha Uwanja) | FAIL | PASS | hiyo hiyo |
| refine | R3 (chuja kwa topic) | FAIL | PASS | `innerText` ilitoa `AFYA`; sasa `textContent.toLowerCase()` |
| posttypes | C5 (chapa ya topic) | FAIL | PASS | hiyo hiyo (`Taasisi` vs `TAASISI`) |
| showcase | S3 (SOS) | PASS* | PASS | *pasi ya SOS imerudishwa kuwa 72 px duara (v2 ilijaribu 56 px) |
| showcase | S9 (vitendo 6) | PASS* | PASS | reli ina safu 6 kila upana; ⋮ ya reli haifichwi |
| hero | H19 (hero haina mgongano) | PASS* | PASS | nakala haigusani na vidhibiti; hero 306/320/360 |
| identity | I7 (ukubwa wa ikoni) | PASS* | PASS | ikoni ya reli ni 20 px (ngazi 16/20/22/24) |
| identity | I12 (overlay ya hero) | — | PASS | gredi ya kijani→bluu imerudishwa kwa uwazi sawa |

### Mtego wa mazingira (si bug ya app)

Baada ya run nyingi, suites zilianza kushindwa kwa
`net::ERR_INSUFFICIENT_RESOURCES` na `Target crashed`. Chanzo: `/tmp` ni
tmpfs ya 992 MB na Playwright huacha profaili `ghc-*` (~58 MB kila moja)
baada ya browser kuanguka; 14 zilijaa 797 MB. Suluhisho:

```
rm -rf /tmp/ghc-*        # 826 MB hurudi
```

Baada ya kusafisha, gate yote ilipita mara moja. Pia `showcase.spec.js` sasa
inasubiri `AuthActions`/`AuthFlow`/`HomeUI` ipatikane badala ya `waitForTimeout`
zisizobadilika — hiyo ilikuwa ikitoa `ReferenceError` kwenye mashine
iliyobana.

### Vipimo vya layout

| Kipimo | Thamani |
|---|---|
| kadi @390 | 793 / 524 / 548 / 768 / 620 / 276 / 770 / 487 px |
| ukurasa @390 | 6641 px (awali 6080) |
| hero | 306 px simu · 320 ≥620 · 360 ≥900 |
| ukurasa ≥1024 | 1120 px, feed safu 2 × 536 px |
| overflow | `docW === innerWidth` @320/360/390/430/768/1024/1440 |

Picha: `docs/screens/hm-01…hm-09`.

## L. Mazungumzo + Ulinzi — muonekano v2 (2026-10-31)

Muundo: `docs/COMM-SHIELD-V2.md`. Karatasi mpya: `assets/css/20-comm-shield-v2.css`.

```
bash tools/run_tests.sh 8123    13 suites · 510 checks · all green
python3 tools/verify_app.py     12/12
```

| Kipimo | Kabla | Sasa | Sababu |
|---|---|---|---|
| network NC14 / NC16 | PASS | PASS | kitufe cha `chats.settings` kimehamia `#ghNetActions`; `act()` inapekua pia kichwa |
| network NC15–NC24 | PASS | PASS | `enter()` sasa inarudi kwenye sehemu — nav Chat haifungui thread ya mwisho |
| network NC3 / NC5 / NC6 | PASS | PASS | inbox tupu, "hakuna seva" na `Sampuli` zimebaki (ukweli haujabadilika) |
| identity I11 | PASS | PASS | band ya Shield imebaki (nyembamba), si kuondolewa |
| shield SC1 / SC42 | PASS | PASS | kichwa kimebaki `Shield Center`; tabs zinaonyesha `Overview` / `Personal Safety` |

### Kilichogundulika wakati wa pass hii

1. **`#shieldPage > div:first-child` (14-identity)** ilikuwa na nguvu zaidi ya
   `#shieldPage .gds-head`; band ilibaki ikichorwa. Suluhisho: kichaguzi cha
   `#shieldPage > .gds-head#shieldHead`.
2. **`.gds-emergency` ilikuwa na margin 16 px ndani ya `.shield-view` yenye
   padding 16 px** — gutter mara mbili, kwa hiyo maandishi yalikatwa. Margin
   imeondolewa.
3. **Muda wa row haukuonekana** kwa sababu `lastMessage` ni **message**, si
   `{ at }`: sasa inasoma `createdAt` (saa ya leo, `d/m` kwa siku zilizopita).
4. **`avatar()` ilikuwa na herufi pekee**; personas zenye `avatarUrl` sasa
   zinaonyesha picha kwenye orodha na kwenye thread.

## M. Kuanzisha upya preview (2026-10-31)

Faida: sandbox huhifadhi `/home/user` pekee. /tmp (driver ya Playwright) na
maktaba za mfumo (libnss3, libnspr4) huondolewa kati ya vipindi, kwa hiyo
suites zote zilishindwa kwa `ReferenceError: AuthFlow is not defined` — ishara
ya kwamba ukurasa haukupakia, si hitilafu ya app.

| Zana | Kazi |
|---|---|
| `bash tools/setup_tests.sh` | inaweka/kurekebisha driver + chromium + maktaba; ni no-op ya ~50 ms ikiwa kila kitu kipo |
| `bash tools/setup_tests.sh --check` | inajibu "tayari / haitayari" bila kubadilisha chochote |
| `bash tools/preview.sh [port]` | inafuta listener wa zamani, inaanzisha `serve.py`, inasubiri 200 |
| `bash tools/run_tests.sh [port]` | preflight: kama hakuna 200 → inaanzisha preview; kisha harness; kisha suites |

Uthibitisho baada ya kurekebisha: `verify_app.py` 12/12, suites 13/510 zote
zimepita, `index.html` 200, hakuna hitilafu ya console kwenye Home, Chat,
Shield na Health. 404 moja kwenye log (`assets/img/does-not-exist.jpg`) ni ya
`tests/hero.spec.js` — ni jaribio la fallback ya picha, si kiungo kilichovunjika.
