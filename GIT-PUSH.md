# Kuweka GuardHai kwenye Git (git push)

Kifurushi hiki ni mti kamili wa mradi — hakuna hatua ya build, hakuna
`node_modules`, hakuna siri. Unaweza kuufungua na kuusukuma moja kwa moja.

## Hatua 6

```bash
unzip GuardHai-Source-2026-10-31.zip
cd GuardHai

git init
git add .
git commit -m "GuardHai: Home v2, Chat + Shield v2 (13 suites / 510 checks)"

# chagua moja:
git remote add origin https://github.com/<akaunti>/<repo>.git
git branch -M main
git push -u origin main
```

Kama tayari una repo: `git remote add origin …` kisha `git pull --rebase origin main`
kabla ya `git push`.

## Kinachomo ndani

| Kitu | Maelezo |
|---|---|
| `index.html` + `src/` | app yote (134 modules, ES modules, hakuna bundler) |
| `assets/` | CSS 21 sehemu (`00-tokens` … `20-comm-shield-v2`), picha, sprite |
| `tests/` | suites 13 za Playwright (510 checks) |
| `tools/` | `serve.py`, `preview.sh`, `run_tests.sh`, `setup_tests.sh`, `verify_app.py`, `pkg_redact.py` |
| `docs/` | hati zote (bila picha za `docs/screens/` kwenye toleo la *Source*) |
| `uploads/` | picha za rejea za muundo (zilizotajwa kwenye `docs/`) |

Haipo kwa makusudi: `backup/` (snapshots za ndani), `docs/screens/` na
`docs/test-artifacts/` kwenye toleo la *Source*, `.cache/`, na vifurushi vya
zamani.

## Siri

`tools/pkg_redact.py` imekwisha endeshwa kwenye kifurushi hiki: thamani 12 za
Firebase (`src/services/firebase.service.js`, `uploads/index.html`) zimebadilishwa
na `YOUR_FIREBASE_API_KEY` na wenzake. Firebase ni ya hiari — app inafanya kazi
offline bila hiyo.

**Kabla ya kusukuma repo ya umma**, kama ulikuwa umeweka funguo halisi kwenye
historia ya git ya awali, zimebadilishwa kwenye Firebase Console (Regenerate key).

## Kukagua kifurushi

```bash
bash tools/serve.py 8123 &          # au: bash tools/preview.sh
bash tools/setup_tests.sh           # driver + chromium (mara ya kwanza pekee)
bash tools/run_tests.sh 8123        # 13 suites · 510 checks
python3 tools/verify_app.py         # 12/12
```

## Faili zinazopaswa kubaki nje ya git

`.gitignore` iko tayari: `node_modules/`, `.env*`, `.cache/`, `.pki/`,
`docs/test-artifacts/`, `dist/`, `GuardHai*.zip`, `*.log`.
