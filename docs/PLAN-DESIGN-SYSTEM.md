# GuardHai — mpango wa "full-system design pass" (rejea: Design System board)

> **Status (2026-10-27): P1–P6 implemented.** This file is the plan as written
> before the work started. The implemented result, the changed-file list, the real
> test numbers and the open items live in [`PHASE-P1-P6.md`](PHASE-P1-P6.md);
> the token and schema references are in [`DESIGN-TOKENS.md`](DESIGN-TOKENS.md)
> and [`POST-SCHEMA.md`](POST-SCHEMA.md).

Tarehe: 2026-10-27
Backup: `backup/pre-posttypes-20261027T162508Z/` (faili 153 + `SHA256SUMS.txt`)
Hali: **MPANGO — nasubiri idhini yako kabla ya kubadilisha faili yoyote.**

Rejea: `uploads/GuardHai Mobile Safety App Design System.png` (panel 1–9).

---

## 1. Ukaguzi wa mfumo uliopo (inventory)

### 1.1 Ukubwa

| Kipimo | Idadi |
|---|---|
| Moduli za JS | 77 (mistari 8,946) |
| Sehemu za CSS | 11 (`01-core` … `11-refine`) |
| Kurasa | 4 — `homePage`, `shieldPage`, `mapPage`, `commPage` |
| Vitendo vya engagement | **10** (tazama §1.3) |
| Handlers za `onclick` kwenye HTML | 133 |
| Madaraja ya `window.*` | 16 (`HomeUI`, `GHSos`, `ProtectEngine`, `AuthFlow` …) |
| Funguo za i18n | 105 kwa lugha (sw + en) |
| Modules za `src/services` | 7 · `src/data` 9 · `src/features` 7 |
| Vipimo | 224 checks (6 suites) + 12 static |

### 1.2 Sehemu zinazoonekana

| Eneo | Faili kuu | Hali |
|---|---|---|
| Home (hero, SOS, quick actions 6, safety strip, Uwanja) | `index.html`, `04-home.css`, `10-showcase.css`, `11-refine.css` | inafanya kazi |
| Kadi ya chapisho (aina, media, ukanda wa tahadhari, rail 5) | `features/feed/post-card.js` | inafanya kazi |
| Wasifu (cover, avatar, info-cards, tabs 4, uhariri) | `features/profile/*`, `09-profile.css` | inafanya kazi |
| Composer (aina 5, mada, watazamaji, media 5, preview, rasimu, 2,000) | `features/composer/*`, `08-composer.css` | inafanya kazi |
| Menyu ya ⋮ + sheet ya vitendo 9 + ripoti + maoni | `features/engagement/*` | inafanya kazi |
| Shield / Ramani / Chat | `engines/*`, `features/map` | zipo, haziguzwi |

### 1.3 Engagement zilizopo (hazitolewi)

| # | Action | Handler |
|---|---|---|
| 1 | Imenisaidia (`data-act="helpful"`) | `toggleHelpful()` → `toggleFlag` → IndexedDB |
| 2 | Maoni + majibu (`data-act="comment"`) | `openThread()`, `addComment(parentId)` |
| 3 | Shiriki (`data-act="share"`) | `share()` (`navigator.share` → clipboard) |
| 4 | Hifadhi (`data-act="save"`) | `toggleSave()` |
| 5 | Vitendo zaidi (`data-act="more"`) | `postMenu()` / `openActionSheet()` |
| 6 | Fuata / Acha | `toggleFollow()` |
| 7 | Tuma kwa mtu | `sendToPerson()` (haipo kwenye kifaa bila `navigator.share`) |
| 8 | Fungua wasifu | `openAuthor()` → `openProfile()` |
| 9 | Nakili kiungo | `copyLink()` |
| 10 | Ripoti (post + comment) | `report()` → `submitReport()` |

### 1.4 Model ya data ya sasa

| Kipande | Sehemu zilizopo |
|---|---|
| `domain/post.js` | `type` (5: elimu, swali, uzoefu, taarifa, fursa), `audience` (3), `topic` (5), `text`, `title`, `media[]`, `location`, `alertText`, `sample`, `verified`, `timeLabel` |
| `domain/profile.js` | `roles[]` (5), `topics[]`, `location`, `affiliation`, `availability`, `serviceAreas`, `orgKind`, `coverage`, `avatarUrl`, `coverUrl`, `verification{licence,institution}` |
| `services/*` | posts, engagement, media (IndexedDB), drafts, profile, session |
| `mocks/*` | sos, push, ble, guardians, transport — zote hurejesha `{ok:false}` |

---

## 2. Gap: kile picha inaonyesha na hakipo bado

| # | Kipengele cha picha | Kilichopo | Kinachohitajika |
|---|---|---|---|
| 1 | Kila aina ya post ina **block yake** (Majanga: eneo/muda/chanzo/hali/mwongozo; Afya: "Muhimu kujua"; Usalama: "Jilinde" + `Ripoti tukio`; Taasisi: mawasiliano/website/simu; Elimu: orodha ya hatua; Kusaidi: mahitaji) | block moja ya maandishi + media | sehemu za hiari kwenye model + renderer kwa aina |
| 2 | **Chanzo** (WHO, Jeshi la Polisi …) na **tarehe ya tukio** | hakuna | `source{label,url?}`, `eventAt` (hiari, sampuli) |
| 3 | **Hali ya uthibitisho ya post** (`Imethibitishwa`) | `verified` boolean (bila ushahidi) | onyesho tu ikiwa `verified && !sample`, vinginevyo `Sampuli` |
| 4 | **Mawasiliano** ya taasisi (website, simu) | hakuna | `contacts[]` hiari; simu/website kama `tel:`/`https:` halali |
| 5 | **Michoro ya role** kwenye cover (`Mtaalamu wa Afya` pill) | role line chini ya jina | pill juu ya cover yenye rangi ya jukumu |
| 6 | **Chips za mada** karibu na jina | zipo chini ya "Mada Anazozipenda" | kuhamisha juu (bila kuondoa sehemu ya chini) |
| 7 | **Composer**: `Hifadhi Draft` kwenye header, safu ya mwandishi, `Aina ya Post` chips 6, `Mada` + `Watazamaji` selects, `Chapisha` upana kamili | footer ina Hifadhi Rasimu; hakuna safu ya mwandishi; chips 5 | header action + safu ya mwandishi + chip set ya 6 (imepangwa) |
| 8 | **Engagement**: safu ya kwanza Like·Maoni·Shiriki·Hifadhi, vitendo vingine kwenye menyu | zipo zote, mchanganyiko wa ukubwa | kupanga upya ukubwa/hali, **bila kubadilisha handler** |
| 9 | **Home**: strip ya usalama yenye CTA, topics pills, kadi ya "Wizaro ya Afya" | zipo (tiles za mada) | kuoanisha typography/spacing; **si lazima** kuiga kadi maalum |

---

## 3. Huduma ambazo hazipo (kizuizi cha kweli)

| Huduma | Inahitajika kwa | Hali ya sasa |
|---|---|---|
| **Uthibitisho (licence/institution)** | beji za taaluma/taasisi | hakuna; `requestVerification()` inaandika ombi tu |
| **Rejista ya vyanzo** (WHO, Jeshi la Polisi) | `source` yenye uthibitisho wa chanzo | hakuna; sampuli zitaandikwa `Sampuli` |
| **Uploads/storage** | picha/video za mtumiaji mtandaoni | media zote ni za kifaa (IndexedDB) — **haitumwi** |
| **Usambazaji wa SOS / push** | "tahadhari imetumwa" | `mocks/sos.js`, `mocks/push.js` → `{ok:false}` |
| **Ujumbe (DM)** | "Tuma Ujumbe" | `message()` → `{ok:false, simulated:true}` |
| **Grafu ya wafuasi** | "Wafuasi / Anayefuata" | `follows.repo` ni ya kifaa; hakuna jumla ya jamii |
| **Utafutaji wa seva** | matokeo ya jamii | utafutaji ni wa kifaa pekee |

**Ahadi:** hakuna kipengele kitakachoonyeshwa kama "kimefanya kazi" bila huduma hizi.

---

## 4. Faili zitakazobadilika (na kwa nini)

### 4.1 Mpya

| Faili | Kazi |
|---|---|
| `assets/css/12-posttypes.css` | block za aina ya post, chips za role, safu ya mwandishi, typography ya vyanzo/mawasiliano |
| `src/features/feed/post-blocks.js` | renderer mmoja kwa kila block: `majanga`, `afya`, `usalama`, `taasisi`, `elimu`, `kusaidia` + `metaRows()` |
| `tests/posttypes.spec.js` | suite ~26 checks: block kwa kila aina, hakuna block isiyo na data, uthibitisho wa post, mawasiliano halali, engagement 10 bado zipo, responsive |

### 4.2 Zitakazobadilishwa

| Faili | Mabadiliko (madogo, yenye mipaka) |
|---|---|
| `src/domain/post.js` | sehemu **za hiari**: `source{label,url}`, `eventAt`, `safetySteps[]`, `contacts[]`, `requirements[]`, `cta` — zote zikiwa tupu kwa default |
| `src/data/seed-posts.js` | thamani za sampuli kwa posts 5 (zinabaki `sample: true`) |
| `src/features/feed/post-card.js` | kichwa cha taasisi (logo), chips za role/hali, kuitisha `post-blocks.js`, chips za mada |
| `src/features/profile/profile-view.js` | role pill juu ya cover, role line yenye ikoni, chips za mada karibu na jina, mpangilio wa tabs |
| `index.html` | composer: safu ya mwandishi, `Hifadhi Draft` kwenye header, chip set ya 6, `Chapisha` upana kamili |
| `src/features/composer/composer-view.js` | `syncTypeChips()` kwa chip set mpya (inabidi iandike `type` + `topic` zile zile) |
| `src/features/engagement/engagement-actions.js` | mpangilio wa sheet (primary 4 + secondary) — **hakuna handler inayobadilika** |
| `src/i18n/i18n.js` | funguo mpya sw+en (idadi itaongezeka kwa usawa) |
| `assets/css/11-refine.css` | marekebisho madogo ya spacing/border yanayohitajika |
| `tools/run_tests.sh`, `docs/*` | suite mpya + kumbukumbu |

### 4.3 Hazitaguzwa

`src/engines/**` (Shield, auth, nav), `src/data/db.js`, `src/services/*` (isipokuwa hakuna), `src/mocks/**`, `src/core/**`, CSS `01–09`, nav ya chini (Home · Afya · SOS · Shield · Chat), `backup/**`.

---

## 5. Mpangilio wa awamu (utekelezaji baada ya idhini)

| Awamu | Kazi | Faili | Vipimo |
|---|---|---|---|
| **P1** | Tokens + typography/spacing + ikoni moja | `12-posttypes.css`, `index.html` | 0 mabadiliko ya tabia |
| **P2** | Model ya post + block kwa aina | `domain/post.js`, `data/seed-posts.js`, `post-blocks.js`, `post-card.js` | `posttypes.spec` |
| **P3** | Wasifu kwa jukumu | `profile-view.js`, `12-posttypes.css` | `profile.spec` + `refine.spec` |
| **P4** | Composer | `index.html`, `composer-view.js` | `composer.spec` |
| **P5** | Engagement (mpangilio tu) | `engagement-actions.js`, `12-posttypes.css` | `refine.spec` R5/R8/R9/R11 |
| **P6** | Tests + docs + kifurushi | `tests/*`, `docs/*`, ZIP | 12/12 + suites zote |

---

## 6. Mpango wa majaribio

1. Baada ya kila awamu: `node --check` kwa kila moduli iliyoguzwa + `python3 tools/verify_app.py` (12/12).
2. Suites zote sita zinaendelea kupita: home 60, composer 72, bugfix 23, profile 20, showcase 20, refine 29.
3. Suite mpya `posttypes` (~26): kila block inaonyesha sehemu zake tu; post isiyo na `source` haionyeshi "Chanzo"; `verified` haionekani kwa `sample`; `Ripoti tukio` inafungua ripoti ile ile; mawasiliano ni `tel:`/`https:` tu; engagement 10 zote zipo; hakuna overflow 320→1024.
4. Screenshots mpya: aina 6 za post, wasifu 5, composer, engagement sheet.

---

## 7. Mipaka ya uwazi (zitaandikwa kwenye UI)

- Post za sampuli: beji `Sampuli` + mstari "Taarifa hizi ni za sampuli".
- `Chanzo` linaonekana tu pale mtumiaji/sampuli imeweka chanzo halisi; hakuna chanzo cha kubuni.
- `Imethibitishwa` la post linahitaji `verified === true && !sample` — sampuli haziwezi kuwa verified.
- `Ripoti tukio` inaandika kwenye kifaa; **haitumwi** polisi.
- `Tuma Ujumbe` inabaki ikisema hakuna seva.

---

## 8. Maswali 4 kabla ya utekelezaji

1. **Idhini ya mpango** (awamu P1–P6) — nianze?
2. **Chip set ya "Aina ya Post"**: nibaki na aina 5 + mada 5 tofauti, au nifuate picha (chips 6 zinazochanganya aina na mada)?
3. **Sehemu mpya za post** (chanzo, muda wa tukio, hatua za usalama, mawasiliano, mahitaji): ziongezwe kama hiari zenye thamani za sampuli, au niandike blocks zinazotumia data iliyopo tu?
4. **Stats za wasifu**: nibaki na hesabu halisi (Machapisho/Mada/Majukumu) au nionyeshe `Wafuasi / Anayefuata` kama `—` yenye maelezo "hakuna huduma"?
