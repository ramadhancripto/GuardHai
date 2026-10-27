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
