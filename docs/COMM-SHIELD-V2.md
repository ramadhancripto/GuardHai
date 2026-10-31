# Mazungumzo (Chat) + Ulinzi (Shield) — pass ya muonekano v2

> Sehemu mbili zilizobaki zilizoonekana "kama sehemu tofauti zilizobandikwa":
> **Mazungumzo** (Chat) na **Ulinzi** (Shield Center). Pass hii inatumia lugha
> ile ile ya Home v2 (`docs/HOME-V2.md`): uso mmoja, mstari mmoja wa ukweli kwa
> kila skrini, na strip ya sehemu ambayo haikati neno lolote.
> Nambari zote zilipimwa: `bash tools/run_tests.sh 8123` → **13 suites / 510
> checks**, `python3 tools/verify_app.py` → **12/12**.

---

## 1. Kilichokuwa kibaya

**Mazungumzo**

* Kichwa kilikuwa **kadi kubwa** yenye jina, chips mbili na vitufe viwili —
  kadi ile ile ilirudi ndani ya kila mazungumzo.
* Strip ya sehemu ilikuwa **pills zinazoscroll**: ya nne ilikatwa nusu
  ("Usalama bir…"), na ndani ya mazungumzo bado ilionekana.
* Onyo la seva lilikuwa **banner ya mistari 3** kwenye kila skrini.
* Zana nne zilikaa kwenye **safu mbili** ("Mazungumzo mapya / Kikundi" kisha
  "Tafuta / Zilizohifadhiwa").
* Majina yalikatwa ("Dkt. Neema …") kwa sababu chip ya `Sampuli` ilichukua
  nafasi kwenye mstari wa jina; **muda haukuonekana kabisa** (`lastMessage.at`
  haipo — ni `createdAt`).
* Ndani ya mazungumzo: jina lilirudiwa (kichwa cha ukurasa + kichwa cha
  convo), jina la mwandishi lilirudiwa kwa kila ujumbe, na composer ilikuwa
  kadi tupu yenye kitufe kikubwa chini.

**Ulinzi**

* Kichwa kilikuwa band kubwa (`Shield Center` + subtitle) kisha strip ya tabs
  7 iliyoscroll — sehemu 4 zilikatwa.
* Kadi nyekundu ya SOS ilichukua 200 px kwenye skrini ya kwanza, ikirudia
  kitufe cha SOS kilicho kwenye menyu ya chini.
* Kila row ilikuwa na maelezo ya mistari 3 ("Kivinjari hakina Web Bluetooth").

## 2. Faili

| Faili | Kazi |
|---|---|
| `assets/css/20-comm-shield-v2.css` | Karatasi mpya (sehemu 9) inayoshughulikia Chat + Shield. Inapakiwa baada ya `17-system.css`. |
| `src/features/network/screens-chats.js` | Inbox na thread zimeandikwa upya (rows, grouping, composer). |
| `src/features/network/network-view.js` | Kichwa kimoja cha ukweli, `is-sub` (mazungumzo hayana strip wala chrome ya nje), `enter()` inarudi kwenye sehemu. |
| `src/features/network/network-ui.js` | `avatar()` sasa inaonyesha **picha** ya mtu ikiwepo, si herufi pekee. |
| `src/features/network/screens-guardians.js`, `screens-communities.js` | Banners zimefupishwa kuwa mstari mmoja. |
| `src/features/shield/shield-center.js` | Strip ya dharura imefupishwa; kichwa cha sehemu kimoja. |
| `src/i18n/i18n.js`, `index.html` | Lebo ya tab ya kwanza: `Mazungumzo` → **`Chat`** (ndiyo neno linalotumika kwenye menyu ya chini), ili isikatwe kwenye safu ya 5. |

## 3. Mazungumzo — muundo mpya

| Eneo | Kabla | Sasa |
|---|---|---|
| Kichwa | kadi yenye chips | **mstari wa maandishi**: jina 21 px, subtitle 11.4 px, vitufe 2 vya ikoni 36 px |
| Ukweli | banner ya mistari 3 | **mstari mmoja**: `Hakuna seva — ujumbe unabaki kwenye kifaa.` |
| Strip | pills 5 zinazoscroll | **grid ya safu 5 sawa**, ikoni juu / lebo 7.8 px chini — hakuna kukata |
| Zana | safu 2 za pills | **kitufe kimoja kikubwa** + vitufe 3 vya ikoni (kikundi, tafuta, zilizohifadhiwa) |
| Rows | ikoni ya jumla, jina lilikatwa | **picha ya mtu**, jina kamili, saa/`12/5`, `Sampuli` kwenye mstari wa pili, namba ya mpya |
| Footnote | mistari 3 | `Chat si SOS — ujumbe hauanzishi dharura.` |

**Ndani ya mazungumzo** (`#commPage.is-sub`):

* strip ya sehemu **inafichwa**; kengele na ngao za nje pia — ni sehemu
  nyingine, si ukurasa wa mazungumzo;
* kichwa cha ukurasa **ni** kichwa cha mazungumzo (jina kamili, subtitle
  `Mazungumzo ya faragha · Sampuli`), na kitufe kimoja cha mipangilio;
* ujumbe wa mtu mmoja ndani ya dakika 10 ni **block moja** (jina + picha
  mara moja);
* bubbles: yangu ni gradient ya kijani, ya mwenzangu ni nyeupe yenye mstari;
* composer ni **mstari mmoja** (uwanja · kiambatisho · sauti · tuma) na mstari
  mdogo wa ukweli chini yake.

## 4. Ulinzi — muundo mpya

| Eneo | Kabla | Sasa |
|---|---|---|
| Kichwa | band kubwa | band **10 px padding**, jina 21 px + subtitle 11.4 px + gia |
| Tabs | 7 pills zinazoscroll | **grid 4 + 3** (simu) / 7 (≥600), ikoni juu, lebo kamili |
| Dharura | kadi nyekundu 200 px | **strip 54 px**: ikoni · `Dharura sasa hivi?` · `Fungua SOS` |
| Vichwa vya sehemu | eyebrow + kichwa + maelezo marefu | kichwa 15 px + **mstari mmoja** |
| Stats | kadi za safu 2 × 2 zenye nafasi tupu | cells za mstari mmoja: namba + lebo |

Band ya utambulisho (kijani→bluu) **haijaondolewa** — ni ileile inayounganisha
Shield na Map na Health (`identity` I11), imefanywa nyembamba tu.

## 5. Kinachobaki kama kilivyo

* Ukweli wa usafirishaji haujabadilika: hakuna seva, hakuna kutuma, hakuna
  "delivered" ya kubuni. Kila skrini inasema hivyo kwa mstari mmoja.
* `Sampuli` inabaki kwenye kila mazungumzo ya mbegu, kwenye mstari wa pili.
* Hakuna orodha ya watu iliyounganishwa: `Mazungumzo mapya` inaonyesha wasifu
  wa kifaa hiki pekee.

## 6. Uthibitisho

```
bash tools/run_tests.sh 8123    13 suites · 510 checks · all green
python3 tools/verify_app.py     12/12
```

* `network` 65/65 — ikiwemo NC3 (inbox tupu kwa akaunti mpya), NC5 (hakuna
  seva), NC6 (Sampuli), NC7 (rows ≥ 3), NC8 (thread), NC9 (hali ya ujumbe).
* `shield` 45/45 — SC1 (kichwa = `Shield Center`), SC42 (tabs za EN), n.k.
* `identity` 25/25 — I11 (band ya Shield = band ya Map).
* Mabadiliko ya test: `network.spec.js` `act()` sasa inapekua pia
  `#ghNetActions`, kwa sababu kitufe cha mipangilio kiko kwenye kichwa cha
  ukurasa (ni sehemu ya muundo, si kuondoa kipengele).

Picha: `docs/screens/cm-01…cm-06`.
