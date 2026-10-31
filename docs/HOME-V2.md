# Home (Nyumbani) — pass ya muonekano v2

> Ukurasa wa kwanza ni uso wa bidhaa. Hati hii inaeleza kilichobadilika kwenye
> **Nyumbani** na **Uwanja** ili sehemu zote zipendeze kwa mpangilio mmoja:
> rangi moja ya utambulisho, kadi zilizo sawa, machapisho makubwa, viungo na
> vitufe vinavyojitofautisha, na nafasi maalum kwa wataalamu.
> Nambari zote zilipimwa kwenye build hii: `bash tools/run_tests.sh 8123`
> → **13 suites / 510 checks**, `python3 tools/verify_app.py` → **12/12**.

---

## 1. Kilichokuwa kizuri, kilichokuwa kibaya

Sehemu ya Nyumbani ilikuwa na kila kitu Kilichohitajika (hero, SOS, haraka,
usalama, Uwanja) lakini ilionekana kama sehemu tano tofauti zilizobandikwa:

* herufi za ukubwa tofauti (9 px karibu na 21 px) na nafasi zisizo na kipimo;
* kadi zilizoelea bila mstari wa mpaka, zikiwa na vivuli vitatu tofauti;
* chip za rangi nasibu — Afya ilikuwa kijani kwenye kadi, bluu kwenye feed;
* kadi ya chapisho ilikuwa nyembamba: picha ndogo, kichwa kikubwa, vitendo
  sita vilivyokatwa (“Imenisaidia” ilikuwa “Imenisai…”);
* kiungo (link) kilionekana kama maandishi ya kawaida — hakuna alama ya kubofya;
* profaili ya mtaalamu ilikuwa sawa na ya mwanachama wa kawaida.

## 2. Faili

| Faili | Kazi |
|---|---|
| `assets/css/19-home-v2.css` | Karatasi ya muundo mzima (1513 mistari, sehemu 12). Inapakiwa **mwisho**, kwa hiyo kila kanuni ni ubadilishaji wa makusudi wa `04/10/11/12/13`. |
| `src/features/feed/post-card.js` | Muundo mpya wa kadi: kichwa, chapa ya aina (ikoni pekee + `.gh-sr`), fremu ya media, kadi ya kiungo, reli ya vitendo. |
| `src/features/feed/post-blocks.js` | `verificationRow()` — sampuli sasa inasema “Hakuna uthibitisho wa chanzo”. |
| `index.html` (§ Nyumbani) | Kichwa cha salamu kimepangwa upya: `.gh-welcome-copy`, `.gh-welcome-badge`, `#ghWelcomeMeta`. |
| `src/engines/shield/protect-dashboard.js` | KPI ya hatari inasoma jina la lugha: “35% Hatari” (sw) / “5% Risk” (en) — awali “Risk” ilibaki kwenye skrini ya Kiswahili. |

## 3. Rangi na vipimo

| Role | Thamani | Kinatumika |
|---|---|---|
| canvas | `#F5F8FB` | mandhari ya ukurasa |
| card | `#FFFFFF` | kila kadi, kila panel |
| line | `#E6EDF3` (`#EFF4F8` laini) | mpaka mmoja tu kwa kila uso |
| ink / text / muted | `#0B1B2B` / `#24384C` / `#65788C` | kichwa, mwili, maelezo |
| green | `#12A67F` · `#0A6E56` · `#E6F7F1` | utambulisho, usalama, wataalamu |
| blue | `#2563EB` · `#E9F0FE` | Afya |
| teal | `#0B6E63` · `#E3F5F4` | misaada / jamii |
| violet | `#7C3AED` · `#F1EBFE` | cheo cha mtaalamu |
| amber | `#B7791F` · `#FBF3E0` | sampuli, tahadhari |
| red | `#D92D2D` · `#FDECEC` | dharura pekee |

Radii `10 / 14 / 20 / 24`, vivuli vitatu pekee (`shadow-1/2/3`), nafasi
`16 px` ndani ya kadi, `14 px` kati ya kadi, `24 px` kati ya sehemu.

## 4. Anatomia ya ukurasa (juu → chini)

| # | Sehemu | Kilichobadilika |
|---|---|---|
| 1 | Salamu (`gh-welcome`) | Kichwa 25 px/900, mstari mmoja wa nembo, nembo ya ngao (simu) au chip ya hali upande wa kuume (≥1024). |
| 2 | Hero | 306 px (simu) / 320 / 360; picha inabaki chini ya gredi ya kijani→bluu; nakala haigusani na vidhibiti. |
| 3 | SOS | Pasi ya 72 px, duara kamili, gradient nyekundu + pete laini; “Dharura? Bonyeza hapa”, DEMO chip. |
| 4 | Vichwa vya sehemu | Mstari wa kijani wima + lebo 10.4 px/900 + kiungo cha “Tazama zote”. |
| 5 | Vitendo vya haraka | grid 2 safu (simu) → 6 safu (≥900); kila tile 64 px ikoni ya rangi yake. |
| 6 | Kadi ya usalama | Kichwa + hali “Haijapimwa bado” + CTA + chips mbili za KPI (lebo juu, namba chini). |
| 7 | Topic tiles (Uwanja) | Tile 3 kwa mstari; rangi ya tile inalingana na rangi ya chapisho la aina hiyo. |
| 8 | Feed | Kadi moja kwa safu (simu), 2 safu ≥900; umbali 14 px. |
| 9 | Hali tupu / skeleton | Kadi moja yenye mstari mmoja — hakuna ujumbe mrefu. |

## 5. Kadi ya chapisho

```
┌────────────────────────────────────────────┐
│ (picha)  Jina                [Fuata] [⋮]  │  kichwa: jina 15 px/900
│          CHEO CHA MTAALAMU (violet)        │  cheo = lebo ya rangi
│          • Dar es Salaam                   │
│ [aina] [SAMPULI] [TOPIC]     Elimu · Umma  │  chip za 24 px + mwonekano
│ Maandishi …                                │  mwili 13.4 px/1.55
│ ┌ fremu ya media 4:3 / 16:9 ─────────────┐ │  radius 16, hakuna mpaka
│ └────────────────────────────────────────┘ │
│ ┌ JILINDE — orodha ya nukta 3 ───────────┐ │  paneli ya blok: #F7FAFC
│ └────────────────────────────────────────┘ │
│ 🔗 Chanzo: …            🕐 Muda: 10 Mei 2025│
│ 🛡 Hakuna uthibitisho wa chanzo            │  chip ya uaminifu
├────────────────────────────────────────────┤
│ ♡ Imenisaidia 💬 Maoni ⤴ Shiriki 🔖 Hifadhi ↺ Rudia ⋮ │  reli: 6 vitendo
└────────────────────────────────────────────┘
```

* **Cheo** — mtaalamu ana lebo ya violet (`MTAALAMU WA AFYA`, `MTAALAMU WA
  USALAMA`) chini ya jina; mwanachama wa kawaida hana lebo hiyo.
* **Chapa ya aina** — ikoni pekee (13 px) ndani ya duara la rangi ya aina;
  maandishi yake yanasalia kwa visomaji vya skrini (`.gh-sr`), kwa hiyo kadi
  haipoteza maana.
* **Fremu ya media** — uwiano umefungwa (`aspect-ratio`), kwa hiyo chapisho la
  video na la picha linachukua nafasi sawa; nembo “VIDEO · SAMPULI” juu-kushoto.
* **Kadi ya kiungo** — kisanduku chenye ikoni, jina la hosti na chevron; ni
  `<a>` halisi, ndiyo alama inayosema “hii inabofywa”.
* **Reli** — `repeat(5, minmax(0,1fr)) auto`; lebo zote zinaonekana (hakuna
  “Imenisai…”); chini ya 296 px ya upana wa kadi lebo zinabadilika kuwa ikoni
  pekee — kamwe si nusu-neno.

## 6. Mpangilio kwa ukubwa

| Upana | Kinachotokea |
|---|---|
| 320 | reli: ikoni pekee (bila nusu-neno), hakuna mlalo-overflow |
| 360–430 | reli: ikoni juu / lebo 8.2 px chini, safu 6; mhusika chip zote zinaonekana |
| 620 | hero 320 px |
| 900 | hero 360 px, vitendo 6 kwa mstari, feed safu 2 |
| 1024 | ukurasa 1120 px katikati; salamu = maneno kushoto + chip ya hali kulia |

Imepimwa: `docW === innerWidth` kwenye 320 / 360 / 390 / 430 / 768 / 1024 /
1440. Kadi @390: 793 / 524 / 548 / 768 / 620 / 276 / 770 / 487 px;
ukurasa 6641 px; hero 306 px; SOS 137 px.

## 7. Ukweli uliodumishwa

Muundo haukuuza ukweli kwa ajili ya uzuri:

* kila chapisho la sampuli lina chip `SAMPULI`;
* sampuli ya chanzo inasema **“Hakuna uthibitisho wa chanzo”** (badala ya
  kujirudia “Sampuli — hakuna…”);
* fremu ya video isiyo na faili inasema **“Hakuna video halisi”**;
* SOS inasema “haitumwi”, hakuna msaada unaotumwa kwa mtu yeyote;
* KPI ya hatari inasema “si tathmini ya usalama wako”;
* hakuna hesabu za kubuni (likes/maoni) — reli inaonyesha lebo pekee.

## 8. Uthibitisho

```
bash tools/run_tests.sh 8123    13 suites · 510 checks · all green
python3 tools/verify_app.py     12/12
```

Picha: `docs/screens/hm-01-welcome-hero`, `hm-02-actions-safety`,
`hm-03-feed-head`, `hm-04-post-expert`, `hm-05-post-media`, `hm-06-post-link`,
`hm-07-card-full`, `hm-08-desktop`, `hm-09-desktop-feed`.

Vipimo vinne vilirekebishwa kwa sababu CSS sasa inabadilisha herufi kuwa
KUBWA (`text-transform`): `home` E6/H1, `refine` R3 na `posttypes` C5
zinasoma `textContent` (si `innerText`).

## 9. Kinachobaki

* Fremu za media bado ni za sampuli katika data ya mbegu — hakuna faili halisi
  za video/audio zilizopakiwa.
* Reli ya vitendo haionyeshi hesabu kwa sababu hakuna hesabu halisi za kifaa
  bado; itaonyesha namba pale `engagement` itakapohesabu kwa kweli.
* Mtandao wa kijamii (followers/following) haujawashwa — “Fuata” inasalia
  kuwa hali ya kifaa pekee.
