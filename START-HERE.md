# GuardHai — Anza Hapa

Mfumo wa GuardHai ni **codebase ya moduli**: kila sehemu iko mahali pake,
inajulikana kwa jina, na inaweza kukua bila kuvunja nyingine.

## 1. Endesha

```bash
cd GuardHai
python3 -m http.server 8123 --bind 0.0.0.0
```

Fungua `http://127.0.0.1:8123/index.html`.

> Lazima itumike kupitia HTTP. `file://` itavunja ES modules.
> Hakuna `npm install`, hakuna build step.

## 2. Muundo

```
index.html                  markup + sprite + <script type="module" src="./src/main.js">
assets/css/                 00-tokens … 17-system (hupakiwa kwa mpangilio wa jina)
src/core/                   bus, dom, format, id, logger
src/domain/                 sheria pekee: post, media, engagement, profile, network
src/data/                   IndexedDB v4 + repositories (26 collections)
src/services/               session, posts, profile, chat, guardian, support,
                            community, safety, discover, transport, personal-safety
src/ui/                     toast, sheet, icons, sidebar
src/i18n/                   sw/en (130 keys, usawa kamili)
src/engines/                shield (16 modules), auth, navigation, boot
src/features/               home, feed, composer, engagement, profile, emergency,
                            map, hero, health (16), network (10), shield (3)
src/mocks/                  SOS, push, BLE, walezi — sehemu pekee ya kuiga
tests/                      suites 12 (Playwright)
tools/                      verify_app.py · run_tests.sh · serve.py · preview.sh · pkg_redact.py
docs/                       usanifu, design system, ripoti za kila awamu, picha
```

## 3. Hali ya mfumo — kilicho halisi na kilichokosekana

**Halisi (kwenye kifaa hiki):**

* **Shield Center** — dashibodi (hali halisi, orodha ya uangalizi, tiles 6) na
  sehemu 7: Muhtasari · Kifaa · Usalama binafsi · Kidijitali · Mali · Historia ·
  Mipangilio.
* **Ulinzi wa kifaa** — injini iliyokamilika (pillars 3, sub-views 10), haijafutwa.
* **Usalama binafsi** — walezi, safari, check-in, mipango, matukio, mapendeleo;
  yote yanahifadhiwa na yanadumu baada ya reload.
* **SOS** — ukurasa kamili: dharura yangu / tahadhari ya maafa, namba 112 · 114 ·
  110 juu ya fold, jedwali la “kinatumwa”, kumbukumbu ya majaribio.
* **Afya** — partitions 6, skrini 37. **Chat** — partitions 5, skrini 22.
* Uwanja, kihariri, viambatisho, engagement, wasifu, rasimu, i18n, ramani.

**Haijaunganishwa:** usambazaji wa SOS, push (FCM), Bluetooth, taarifa kwa
walezi, upload ya media, akaunti ya mtandao, uthibitisho wa mali. Kila moja
inasema ukweli mahali inapotumika — na `Mipangilio → Shiriki na walezi`
**inakataa kuwashwa** ikiwa hakuna seva, kwa maelezo.

## 4. Thibitisha

```bash
python3 tools/verify_app.py         # 12/12
bash tools/run_tests.sh 8123        # suites 12, checks 471 → RESULT: all checks passed
```

Ukikagua suite moja:

```bash
NODE_PATH=/tmp/pw/node_modules node tests/shield.spec.js http://127.0.0.1:8123/index.html
```

## 5. Usomaji wa lazima

| Faili | Kwa nini |
|---|---|
| `README.md` | muhtasari wa haraka na orodha ya suites |
| `docs/DESIGN-SYSTEM.md` | GDS v1: tokeni, components 22, kontrasti |
| `docs/REDESIGN-R1.md` | kilichojengwa awamu hii + kinachobaki |
| `docs/REDESIGN-R2.md` | Chat: inbox, thread, composer na uunganishaji wake |
| `docs/ARCHITECTURE.md` | ramani ya layers, data na events |
| `docs/TEST-LOG.md` | matokeo ya kila awamu |

## 6. Kanuni za ukuaji

1. Sheria za biashara → `src/domain/`, si kwenye view.
2. Hifadhi → repository mmoja kwa entity; interface isibadilike.
3. Kila kitu kinachohitaji server → `src/mocks/` hadi server itakapokuwepo,
   na UI iseme wazi.
4. Hakuna faili inayozidi mistari ~600 — gawanya (`verify_app.py` inakagua).
5. Mabadiliko ya hali yatangazwe kwenye `core/bus.js`.
6. Sura mpya zitumie darasa la `gds-` (GDS v1); usichanganye familia mbili za
   CSS kwenye skrini moja — hamisha skrini nzima pamoja na suite yake.
7. Kila kitufe lazima kiwe na `aria-label` au maandishi, na kila hali ionekane
   kwa maneno, si kwa rangi pekee.
