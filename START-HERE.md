# GuardHai — Anza Hapa

Mfumo wa GuardHai sasa ni **codebase ya moduli**, si faili moja. Kila kitu
kiko kwenye sehemu zake, kinajulikana kwa jina, na kinaweza kukua.

## 1. Endesha

```bash
cd GuardHai
python3 -m http.server 8123 --bind 0.0.0.0
```

Fungua `http://127.0.0.1:8123/index.html`.

> Lazima itumike kupitia HTTP. `file://` itavunja ES modules.

## 2. Muundo

```
index.html                  markup + sprite + <script type="module" src="./src/main.js">
assets/css/                 01-core … 11-refine (hupakiwa kwa mpangilio)
src/core/                   bus, store, dom, format, id, logger
src/domain/                 Post, media, engagement, comment, profile/roles — sheria pekee
src/data/                   IndexedDB + repositories + personas/posts za sampuli
src/services/               posts, engagement, drafts, media, profiles, session
src/ui/                     toast, sheet, icons, sidebar
src/i18n/                   sw/en
src/engines/                shield (mixes 7), auth, navigation, boot
src/features/               home, feed, composer, engagement, profile, emergency, map
src/mocks/                  SOS, push, BLE, guardians — sehemu pekee ya kuiga
tests/                      home · composer · bugfix · profile · showcase · refine (Playwright)
tools/                      verify_app.py · run_tests.sh · pkg_redact.py
docs/                       ARCHITECTURE.md na ripoti zote
backup/                     toleo la faili moja (kumbukumbu) + checkpoints
```

## 3. Hali ya mfumo — kilicho halisi na kilichokosekana

**Halisi (kwenye kifaa hiki):** uwanja, wasifu wenye majukumu na rangi zake,
kihariri, viambatisho (IndexedDB), engagement (Imenisaidia/Maoni/Shiriki/Hifadhi),
majibu ya maoni, report, rasimu, Shield, i18n, ramani.

**Picha:** kumi zilizotengenezwa kwa ajili ya build hii ziko `assets/img/` —
ni faili za ndani, si viungo vya mtandaoni.

**Ni ombi tu:** uthibitisho wa leseni/taasisi. Mtu anaweza kuomba; hakuna
mthibitishaji, kwa hiyo hakuna beji inayotokea kwa kuchagua jukumu.

**Haijaunganishwa:** usambazaji wa SOS, push (FCM), Bluetooth, walezi, upload
ya media, akaunti ya mtandao. Kila moja ina faili yake `src/mocks/` inayosema
ukweli (`{ ok: false, simulated: true }`) — hakuna ufanisi wa kughushi.

## 4. Thibitisha

```bash
python3 tools/verify_app.py        # 12/12
bash tools/run_tests.sh            # 307/307 (home 62, composer 72, bugfix 23, profile 20, showcase 20, refine 29, posttypes 33, hero 23, identity 25)
```

## 5. Usomaji wa lazima

| Faili | Kwa nini |
|---|---|
| `README.md` | muhtasari wa haraka |
| `docs/ARCHITECTURE.md` | ramani kamili ya layers, data, events na mock seam |
| `docs/REFACTOR-NOTES.md` | kilichogawanywa, kutoka wapi, na uthibitisho |
| `docs/TEST-LOG.md` | matokeo ya kila awamu |

## 6. Kanuni za ukuaji

1. Sheria za biashara → `src/domain/`, si kwenye view.
2. Hifadhi → repository mmoja kwa entity; interface isibadilike.
3. Kila kitu kinachohitaji server → `src/mocks/` hadi server itakapokuwepo.
4. Hakuna faili iliyozidi mistari ~600 — gawanya (verify_app.py inakagua).
5. Mabadiliko ya hali yatangazwe kwenye `core/bus.js`.
