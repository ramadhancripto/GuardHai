# Backup, Kurudisha, na Versioning

## 1. Backup iliyopo

| Faili | Ukubwa | SHA-256 |
|---|---|---|
| `backup/prototype-original-2026-10-27.html` | 350,916 bytes | `5028a352…c2c990e8` |
| `backup/SHA256SUMS.txt` | — | checksums mbili |

Nakala ya awali ya upload (`uploads/index.html`) **haijaguswa** — kwa hiyo kwa sasa
kuna nakala **tatu** za faili moja (uploads, backup, na vyanzo vilivyogawanywa).

## 2. Kuthibitisha backup

```bash
cd backup
sha256sum -c SHA256SUMS.txt
# prototype-original-2026-10-27.html: OK
```

(Line ya pili inarejelea `uploads/index.html` kwa path ya jamaa — ikigoma, ni kwa sababu
ya path; tumia `sha256sum ../uploads/index.html` na kulinganisha.)

## 3. Kurudisha prototype kwenye faili moja

Kama unahitaji faili moja tena (mfano ku-upload kwenye host ya static):

```bash
python3 - <<'EOF'
import pathlib
d = pathlib.Path("guardhai-prototype")
html = (d/"index.html").read_text()
html = html.replace('<link rel="stylesheet" href="css/guardhai.css">',
                    "<style>\n" + (d/"css/guardhai.css").read_text() + "\n</style>")
html = html.replace('<script type="module" src="js/firebase-service.js"></script>',
                    '<script type="module">\n' + (d/"js/firebase-service.js").read_text() + "\n</script>")
html = html.replace('<script src="js/guardhai-app.js"></script>',
                    "<script>\n" + (d/"js/guardhai-app.js").read_text() + "\n</script>")
pathlib.Path("guardhai-single-file.html").write_text(html)
EOF
```

Au tumia backup moja kwa moja — ni byte-identical na ile ya awali.

## 4. Kujenga upya mgawanyo

```bash
python3 tools/split_prototype.py     # inasoma kutoka backup/, inaandika guardhai-prototype/
python3 tools/verify_split.py        # inathibitisha hakuna kilichopotea
```

Script ni **idempotent**: inaweza ku-run tena na kutoa matokeo yale yale.

## 5. Git — hali na pendekezo

**Hali:** hakuna Git repo kwenye workspace hii (imekaguliwa: `find / -name .git` → hakuna).
Kwa hiyo hakuna "uncommitted changes" za kuripoti, na hakuna history ya ku-protect.

**Pendekezo (inasubiri idhini yako):**

```bash
cd <project-root>
git init
cat > .gitignore <<'GI'
node_modules/
.env
.env.*
*.keystore
*.jks
google-services.json
GoogleService-Info.plist
.DS_Store
GI
git add -A
git commit -m "baseline: existing GuardHai state before prototype integration"
```

Kisha kwa kazi hii:

```bash
git add guardhai-prototype backup tools docs
git commit -m "chore: split prototype into html/css/js, add audit + backup"
```

**Kwa nini sikuifanya:** `git init` ni badiliko la muundo wa project. Maagizo yanasema
nisifanye mabadiliko makubwa bila idhini.

## 6. Faili za siri — tahadhari

Prototype ina `firebaseConfig` (apiKey, messagingSenderId, appId) kwa project
`guardhai`. Kwenye ripoti hii **thamani hazijachapishwa**.

Kwa web app, Firebase API key inaonekana kwa umma — hilo ni la kawaida. Lakini
**lazima**:

1. API key restrictions → HTTP referrers (domain zako pekee)
2. Firebase App Check
3. Firestore security rules (za `remoteShieldDevices/{uid}` → owner only)
4. Usiweke service account keys / private keys kwenye repo **kamwe**

Firestore rules hazipo kwenye workspace — **hazijathibitishwa**.
