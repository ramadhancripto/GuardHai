# Universal Secure Storage Center (S1)

> Kituo kimoja cha kumbukumbu zote za kifaa: nyaraka, ushahidi, kesi, ripoti na
> viungo vya rekodi za Afya — vyote **kwenye kifaa hiki**, chini ya udhibiti wa
> mmiliki. Hakuna seva, hakuna wingu, hakuna uthibitisho wa nje.

Hati hii inaeleza kile kilichojengwa, kwa nini kilijengwa hivyo, na kile
kinachobaki. Nambari zote zilizotajwa hapa zilipimwa kwenye build hii
(`bash tools/run_tests.sh 8123` → 13 suites / 509 checks).

---

## 1. Kile kilichobadilika

Awali "Storage" ilikuwa **sheet** (`openStorage()` kwenye `home-sheets.js`)
iliyopima bytes pekee: jumla ya kifaa, kikomo cha browser, posts, drafts,
blobs za IndexedDB, na funguo za `guardhai*` kwenye `localStorage`. Ilikuwa
ukweli, lakini haikuwa mahali pa kufanya kitu — ilikuwa kipimo, si hifadhi.

Sasa Storage ni **ukurasa kamili** (`#storagePage`) wenye skrini 15. Vipimo
vilevile havijapotea: skrini `storage.usage` inaonyesha kila kipimo kilekile
(row kwa row), pamoja na vipimo vipya vya Storage yenyewe.

| Kitufe cha kuingia | Kinachofunguka |
|---|---|
| Home → Storage sheet (`HomeUI.openStorage()`) | `storage.usage` — namba zilezile za awali |
| Shield → Mipangilio → Programu → Hifadhi (`app.storage`) | `storage.home` |
| `HomeUI.go('storage', { screen })` | ukurasa, screen yoyote |

`go()` ndiyo inayoficha `#ghSearchBar` ya Uwanja na kuweka `#storagePage.active`,
kwa hiyo hakuna chrome isiyohusiana inayobaki juu ya ukurasa.

---

## 2. Faili

| Faili | Kazi |
|---|---|
| `src/domain/storage.js` | Jamii 12, aina 11 za ushahidi, aina za faili, faragha, uhakiki, matoleo, vipimo vya vichujio, `validateItem/Case/Share`, `HEALTH_CATEGORY_MAP`, `healthSubFor()`, `HONESTY` |
| `src/data/db.js` | `DB_VERSION = 5` + stores 4 mpya (nyongeza pekee) |
| `src/data/storage.repo.js` | `StorageRepository` — items, custody, cases, shares |
| `src/data/storage.seed.js` | Sampuli 18 + kesi 2 + ruhusa 2 (data pekee; haiandiki) |
| `src/services/storage.service.js` | Mlango mmoja wa data: kuorodhesha, `applyFilters`, kuongeza/kuhariri/kufuta, custody, kesi, ruhusa, `stats()`, seeds |
| `src/services/storage-files.js` | Bytes: `attachFile()` (hadi 25 MB), `blobUrlFor()`, `dropFile()` |
| `src/services/storage-health.service.js` | `syncHealthPointers()` — viungo vya Afya, `readOnly: true`, hakuna nakala |
| `src/features/storage/storage-view.js` | Shell: router, `paint()`, kichwa, crumbs, listeners, `window.GHStorage` |
| `src/features/storage/storage-actions.js` | Dispatcher mmoja wa vitendo vyote (`data-stx`) |
| `src/features/storage/screens-home.js` | home, category, sub, search, filters, all |
| `src/features/storage/screens-evidence.js` | Evidence Center, aina ya ushahidi, kesi, kesi moja |
| `src/features/storage/screens-records.js` | rekodi, ongeza, kesi mpya, shiriki, nafasi ya kifaa |
| `src/features/storage/storage-state.js` | Wapi ulipo, vichujio, `unlocked` (session pekee) |
| `src/features/storage/storage-ui.js` | Atomi za `stx-*` juu ya GDS (`gds-btn`, `gds-card`, `gds-alert`…) |
| `assets/css/18-storage.css` | Muonekano wote wa `stx-*` (hakuna class ya zamani inayoguswa) |
| `tests/storage.spec.js` | ST1–ST38 |

---

## 3. Data model (IndexedDB v5)

```
storageItems    { id, kind, category, subcategory, evidenceType, evidenceId,
                  title, description, fileType, mime, sizeBytes, version,
                  originId, source, sourceLabel, ownerId/Name, uploadedBy…,
                  createdAt, uploadedAt, location, privacy, verification,
                  integrity, tags[], caseIds[], eventRef, relatedIds[],
                  healthRef, blobKey, notes[], archived, readOnly, sample }
storageCustody  { id, itemId, at, action, actorId, actorName, note, caseId? }
storageCases    { id, code, title, kind, summary, status, openedAt, openedBy, ownerId, incidentRef }
storageShares   { id, itemId, targetId, targetName, level, status, createdAt, createdBy, note }
```

Records:

* `version: 'original' | 'edited' | 'exported'` — `originId` ndiyo kiungo cha
  kurudi nyuma. **Hakuna mahali panapobadilisha faili halisi.**
* `custody` ni historia inayodumu **hata rekodi ikifutwa** (hatua `deleted`
  huandikwa kabla ya kufuta). Hakuna njia ya kuifuta kwa bahati mbaya.
* `healthRef: { module:'health', recordId, screenId }` — kiungo pekee, bila
  `blobKey`; `readOnly: true` daima.

`storageCustody` ina index `itemId` + `at`, hivyo `custodyOf()` ni `getAll` moja
inayopangwa kwa muda, si kuchuja jedwali zima.

---

## 4. Skrini 15

| Screen | Inaonyesha |
|---|---|
| `storage.home` | Hero (nafasi iliyotumika, rekodi hai), stats 4, Evidence Center, jamii 12, kesi za hivi karibuni, zilizoongezwa karibuni, kidokezo cha uaminifu |
| `storage.all` | Zote + split list/preview kwenye skrini pana |
| `storage.category` | Jamii moja na subrail + vichujio vinavyotumika |
| `storage.sub` | Kijamii kimoja |
| `storage.search` | Utafutaji wa kifaa (jina, maelezo, evidence ID, tag) |
| `storage.filters` | Vipimo 12, kila select inatumika papo hapo, idadi ya vinavyolingana chini |
| `storage.evidence` | Kituo cha ushahidi: aina 11, kila moja na hesabu yake |
| `storage.evidence.type` | Aina moja ya ushahidi |
| `storage.cases` | Kesi zote + kesi mpya |
| `storage.case` | Kesi moja: timeline ya matukio, vipande kwa aina, uhusiano |
| `storage.item` | Rekodi: badges, vitendo, maelezo kamili, alama ya faili, kesi, faili zinazohusiana, ruhusa, custody, kumbuka, kidokezo |
| `storage.add` | Fomu ya rekodi mpya (+ faili ya hiari hadi 25 MB) |
| `storage.case.new` | Fomu ya kesi |
| `storage.share` | Ruhusa ya kushiriki (imeandikwa kwenye kifaa; hakuna anayepokea) |
| `storage.usage` | Vipimo vya kifaa: jumla, kikomo, posts, drafts, IndexedDB, localStorage — **pamoja na** mgawanyo kwa jamii |

Kila skrini inarudisha `{ title, subtitle, crumbs, body }`; shell ndiyo
inayochora kichwa, crumbs na `stage`. Kwa hiyo hakuna skrini inayoweza kujenga
chrome yake.

---

## 5. Mtiririko mmoja wa vitendo

Screens hazina listeners. Kila kitu kinatoka kwenye markup:

```html
<button data-stx="record.review" data-key="st_demo_ev2">…</button>
<form data-stx-form="form.add">…</form>
<select data-stx-select="record.case">…</select>
<input type="file" data-stx-change="form.file">
```

`storage-view.js` ina listeners **watatu** tu kwenye `#storagePage`
(`click`, `submit`, `change`) na kila mmoja anaita `dispatch(act, payload)`.
Dispatcher hurudisha sehemu moja ya:

* `{ screen, params }` — nenda huko,
* `{ back: true }` — rudi ngazi moja,
* `{ toast }` — ujumbe mmoja wa app (`#ghToast`),
* `{}` — chora upya hapa hapa.

Faida: hakuna njia ya "kuhariri" kuwa na tabia mbili tofauti kwenye skrini
mbili, na `actions` haijui HTML.

### Vitendo vilivyopo

`back` · `go` · `nav.home/all/search/filters/evidence/cases/case.new/usage/add/share` ·
`open.item` · `open.case` · `filter.set/apply/reset/clear` · `filters.search(.clear)` ·
`view.set` · `record.unlock/review/copy/export/integrity/archive/delete/note/case` ·
`form.add/case/share/file(.clear)` · `samples.seed/clear` · `storage.reset` · `go.health`

---

## 6. Sheria za uaminifu (zinaheshimiwa kwenye service, si kwenye UI)

1. **Halisi haibadilishwi.** `createDerivedCopy()` huunda rekodi mpya yenye
   `originId`; halt ya awali haiguswi. UI inaonyesha `Iliyohaririwa` / `Nakala`.
2. **Alama ya SHA-256 ni halisi au haipo.** `computeIntegrity()` huhesabu kwa
   `crypto.subtle` **tu** ikiwa kuna blob kwenye kifaa; vinginevyo
   `integrity = null` na kitendo kinakataa kwa sababu iliyoandikwa.
3. **"Umekagua wewe" si uthibitisho.** `verification` ni `unreviewed | reviewed |
   external (haipatikani) | rejected`; `external` haiwezi kuchaguliwa.
4. **Afya inabaki Afya.** Storage ina `healthRef` pekee, `readOnly: true`, bila
   `blobKey`. `syncHealth()` huunda/kusafisha viungo kutoka kwenye store halisi
   kila kuingia; rekodi ikifutwa huko, kiungo kinaondolewa.
5. **Kushiriki ni kumbukumbu, si ufikiaji.** `grantShare()` huandika ruhusa
   (`pending` kwa chaguo-msingi). Hakuna transport, hivyo hakuna anayepokea —
   na ukurasa unasema hivyo wazi.
6. **Kufuta hakuifuti historia.** `deleteItem()` huandika custody `deleted`
   kabla ya kuondoa row; trail inabaki.

Maandishi ya sheria hizi yako kwenye `HONESTY` (`storage`, `integrity`,
`verification`, `originals`, `sharing`) na yanaonekana kwenye home, rekodi,
kesi na usage — si kwenye footer iliyosahaulika.

---

## 7. Faili (bytes)

* `attachFile(file, kind)` huthibitisha ukubwa (`LIMITS.maxFileBytes = 25 MB`),
  huandika blob kwenye `media` store, hurudisha `{ blobKey, name, size, type }`.
* `blobUrlFor(blobKey)` hutoa object URL na **kuireuse** kwenye repaints
  (`blobUrls` Map) — repaint 20 haitoi URL 20.
* Hakuna upload. Hakuna encryption ya app: ulinzi ni wa kifaa (OS/browser), na
  hilo linaandikwa kwenye kila skrini ya rekodi.

---

## 8. Sampuli, kusafisha na `resetAll()`

* `seedSamples()` — rekodi 18 (ikiwemo nakala ya kuhariri `st_demo_ev1_copy`),
  kesi 2, ruhusa 2; kila row ina `sample: true`. Mara ya pili → `{ skipped: true }`.
* `clearSamples()` — huondoa **sampuli tu**; rekodi zilizoandikwa na mtumiaji
  zinabaki (ST31).
* `resetAll()` — hufuta hifadhi yote ya kifaa (UI: `samples.clear` na
  `storage.reset` kwenye skrini ya usage).

---

## 9. Upimaji

```
python3 tools/verify_app.py          12/12   (import graph, ids, i18n, size guard…)
bash tools/run_tests.sh 8123         13 suites · 509 checks · all green
```

`tests/storage.spec.js` (ST1–ST38) inaendesha UI halisi: kuingia kutoka Home na
Shield, kuongeza rekodi (na kukataa fomu tupu), kufungua rekodi iliyozuiwa,
kukagua, kunakili/kuhariri, alama ya faili, kesi na kuunganisha, kushiriki,
viungo vya Afya (kuunda na kufuta), archives/delete, sampuli, empty state,
Back, aria, na ukosefu wa overflow kwa 390 na 1280.

### Vipimo vya layout (build hii)

| Kipimo | 390 px | 1280 px |
|---|---|---|
| `#ghStorageStage` upana | 338 | 1140 |
| `.stx-cat` | 2 safu × 165 | 4 safu |
| `.stx-catgrid` | `165px 165px` | `repeat(4, 1fr)` |
| Overflow ya usawa | 0 | 0 |
| Skrini zote 16 | hakuna error | hakuna error |

---

## 10. Mtego wa DB v5

Kuongeza stores 4 kulibadilisha `DB_VERSION` 4 → 5. Build ya **zamani**
ikifungua DB hii baadaye itapata `VersionError`; `db.js` inashuka kwenye
in-memory db na data inaonekana tupu. Hii ni sawa kwa mwelekeo wa mbele
(build mpya inasoma v4→v5), lakini **ikihitajika kurudi nyuma**, fuata hatua:
futa IndexedDB ya app (`guardhai*`) kwenye browser, au tumia build ya v5.

---

## 11. Kupunguza maneno (pass ya usafi)

Ukurasa ulikuwa na maandishi mengi. Pass hii iliondoa kurudia-rudia, si ukweli:

| Kabla | Sasa |
|---|---|
| Hero yenye kichwa kirefu + aya 2 + stats + meter + aya ndogo | Kichwa kimoja, mstari mmoja, vitendo 3, ukubwa + meter |
| Kadi 12 za jamii zenye maelezo na “N vijamii” | Kadi 3 vitu: ikoni, hesabu, jina |
| Tile 11 za ushahidi zenye jina + maelezo | Jina pekee |
| Kadi ya uaminifu yenye aya 3 chini ya home | Mstari mmoja (`footNote`) + vitendo 2 |
| Alert ndefu kwenye fomu ya ongeza, kesi mpya, shiriki | Mstari mmoja kila mahali |
| Rows 16 za metadata (baadhi zikirudia badges) | Rows 13 — privacy, uhakiki na toleo ziko kwenye badges pekee |
| “Kesi na matukio”, “Faili zinazohusiana”, “Ufikiaji na ruhusa”, “Historia ya matumizi”, “Kumbuka” = sehemu 5 | “Mahusiano”, “Ufikiaji”, “Historia” = sehemu 3 + fomu ya kumbuka ya mstari mmoja |
| Mgawanyo wa jamii 12 (hata sifuri) | Jamii zenye rekodi tu |
| Hifadhi tupu = dashboard ya sifuri | Ukurasa mmoja: “Anza na rekodi moja” |

Ukweli wote unabaki: `HONESTY` (ndefu) inatumika kwenye rekodi na shiriki
ambapo ubaya wa maneno ndio hoja; `HONESTY_SHORT` (mstari mmoja) inatumika
kwenye footing za skrini.

## 12. Muonekano v2 — rangi, kina na mpangilio (S1b)

Ukurasa ulipewa utambulisho wa rangi na mpangilio mpya bila kubadilisha data wala
mtiririko:

| Kipengele | Kilivyofanywa |
|---|---|
| **Rangi kwa aina** | Kila rekodi, jamii na aina ya ushahidi ina `data-tone` (green/teal/blue/purple/amber/red/slate). CSS inaitafsiri kuwa `--tone`, `--tone-soft`, `--tone-ink` — hakuna hex kwenye markup. |
| **Hero** | Band ya kijani yenye gradient + rings za CSS, namba za kioo (glass tiles), primary nyeupe na secondary ya kioo. Kwenye 390 px haivuji. |
| **Kadi za jamii** | 2 safu (390), 3 (≥620), 4 (≥900). Ikoni yenye border ya rangi, hesabu ya rangi, gradient hafifu kutoka `--tone-soft`. |
| **Tile za ushahidi** | Grid 2/3/4, ikoni ya rangi, hesabu; sifuri haionyeshwi. |
| **Record sheet** | Kichwa chenye tint ya rangi ya rekodi (`is-record`), ikoni ya rangi, vitendo kwenye grid 2×3 (390) → 3×2 (≥560) → mstari mmoja (≥980). Hakuna kitu kinachokatwa. |
| **Category header** | Kadi moja: ikoni ya rangi, jina + maelezo (mistari 2 max), kitufe cha `+` cha mviringo. |
| **Crumbs** | Mstari mmoja unaosogeza kwa usawa, hauweki chrome ya pili. |
| **Head** | Kirefu kidogo kwenye simu (32 px mark, 15.5 px title) ili stage ipate nafasi. |
| **Orodha** | Kila list (category, sub, search, all, evidence kind) iko ndani ya kadi moja — hakuna rows zinazoelea. |
| **A11y** | `i-filter` ilikuwa haipo kwenye sprite — iliongezwa. Kila kitufe kipya kina `aria-label`. |

Majaribio: `13 suites · 509 checks` zote zilipita; `verify_app.py` 12/12; hakuna
`pageerror`, hakuna overflow kwa 390 na 1280.

## 13. Kinachobaki

* Transport halisi kwa kushiriki (sasa: kumbukumbu ya kifaa pekee).
* Uthibitisho wa nje (hash kwenye ledger, muhuri wa mamlaka) — kwa sasa
  `external` haipo kwa kusudi.
* Kuunganisha `eventRef` na matukio ya Usalama binafsi (schema iko tayari).
* Uhamisho wa hifadhi kwenye kifaa kingine (export ya JSON ya rekodi).
