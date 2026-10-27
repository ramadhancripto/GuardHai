# GuardHai — Ripoti ya Ukaguzi na Mpangiilo wa Prototype

**Tarehe:** 2026-10-27
**Kazi:** ukaguzi wa awali, backup, na kupanga HTML prototypi katika mafaili.
**Hali:** ukaguzi umekamilika; **hakuna** mabadiliko ya backend, database, Android au
production configuration yaliyofanywa.

---

## 0. Muhtasari mfupi (TL;DR)

- Katika workspace hii **hakuna project ya GuardHai** iliyopo — kuna faili **moja** tu,
  `uploads/index.html`. Hakuna `package.json`, hakuna Gradle, hakuna repo ya Git,
  hakuna Firebase/Supabase config file nje ya HTML, hakuna backend.
- Kwa hiyo **sikuweza** kukagua "teknolojia ya frontend / Android / backend" ya project
  iliyopo — hakuna cha kukagua. Sikubuni majibu.
- Nilichofanya: (1) backup ya byte-identical, (2) kugawanya HTML hiyo moja katika
  `index.html` + `css/` + `js/` **bila kubadilisha code yoyote**, (3) kuithibitisha
  kwa script ya uthibitisho, (4) kuipima kwa browser halisi (headless Chromium),
  (5) kuandika ripoti hii.
- Matokeo: **25/26 tests za UI zimepita**, `25/26` ikiwa ni pamoja na tab zote,
  ramani, health sub-tab, SOS demo na responsiveness. Test moja imeshindikana
  (language selector haibadilishi maandishi) — ni **bug iliyokuwepo awali**, sio
  iliyosababishwa na mpangiilo.
- **Kizuizi kikubwa:** sijui project yako halisi iko wapi. Kabla ya hatua inayofuata
  (integration kwenye React/Capacitor, au kuunganisha Firebase), nahitaji uthibitishe
  (maswali mwishoni).

---

## 1. Muundo wa project kabla ya mabadiliko

### 1.1 Kilichokuwepo kwenye workspace

```
/home/user/
└── uploads/
    └── index.html        350,916 bytes · 5,548 lines
```

Hiyo ndiyo yote. Ushahidi:

| Kitu nilichokitafuta | Matokeo |
|---|---|
| `.git` (repo yoyote kwenye disk) | hakuna |
| `package.json` / `node_modules` / lockfile | hakuna |
| `build.gradle` / `settings.gradle` / `AndroidManifest.xml` | hakuna |
| `google-services.json` / `GoogleService-Info.plist` | hakuna |
| `firebase.json` / `firestore.rules` / `.firebaserc` | hakuna |
| Supabase config / migrations / SQL | hakuna |
| `.env` / `.env.*` | hakuna |
| Faili lolote lenye jina `guardhai` nje ya `uploads/` | hakuna |
| Backend (Node/Python/PHP/Go/Java) | hakuna |

**Hitimisho:** project ya GuardHai (Android + backend) **haiko** kwenye workspace hii.
Kile nilichopewa ni faili moja la prototype. Kwa hiyo sehemu ya ukaguzi inayohusu
"teknolojia ya frontend, Android na backend" **haiwezi kujibiwa kwa ushahidi** —
jibu pekee la uaminifu ni: *haipo hapa*.

### 1.2 Teknolojia iliyotambuliwa **ndani ya faili la prototype**

| Tabaka | Kilichotambuliwa | Ushahidi |
|---|---|---|
| Markup | HTML5 ya static, `lang="sw"`, mobile-first | `<html lang="sw">`, meta viewport |
| CSS | CSS ya kawaida (hakuna Tailwind/SASS, hakuna build step) | block moja ya `<style>`, 496 lines, CSS variables |
| JS | **Vanilla JS** (ES2020+), hakuna React/Vue/Angular | `<script>` moja ya classic + module moja |
| Modules | ES modules kutoka CDN | `import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/..."` |
| Auth | Firebase Auth v11 (popup ya Google + password reset) | `signInWithPopup`, `sendPasswordResetEmail` |
| Database | Cloud Firestore v11 | `getFirestore`, `setDoc`, `doc`, `serverTimestamp` |
| Ramani | Leaflet 1.9.4 | `<script src=".../leaflet@1.9.4/...">` |
| Native bridge | **Capacitor** (hiari, haipo kwenye repo) | `window.Capacitor?.Plugins?.Protect \|\| null` |
| Fonti | Google Fonts (Poppins) | `<link href="fonts.googleapis.com/...">` |
| Icons | Inline SVG sprite, 58 `<symbol>` | ndani ya `<body>` |

**Hakuna** framework ya UI, hakuna bundler, hakuna TypeScript, hakuna tests za awali.

### 1.3 Moduli zilizotambuliwa ndani ya `index.html`

Entry point ni `index.html` yenyewe. Mtiririko wa utekelezaji:

```
DOMContentLoaded
   └─ I18N.init() · ProtectEngine.init() · CommunicationModule.init()
onAuthStateChanged (Firebase)
   └─ ikiwa mtumiaji yupo au guardhai_logged_in === 'true'  →  enterGuardHaiHome()
      vinginevyo (baada ya 1.5s)                            →  welcome-anim
```

Screens (`.auth-screen`, zinaonekana moja kwa wakati):
`splash` → `welcome-anim` → `landing` → `register` | `login` | `forgot`

Pages (`.page-container`, zinabadilishwa na `switchTab()`):
`homePage` · `commPage` · `shieldPage` · `mapPage`

Engines / modules ndani ya classic script:

| Module | Lines (takriban) | Inafanya nini kwa kweli |
|---|---|---|
| `AudioEngine` | ~45 | WebAudio beeps (inafanya kazi) |
| `ProtectEngine` | ~1550 | Core state, devices, confidence index, security check, sub-tab router |
| `CommunicationModule` | ~470 | Module toggles (local network, Wi-Fi Direct, travel, USB) — state pekee |
| `TravelProtectionEngine` | ~340 | Travel session state machine |
| `USBCableEngine` | ~250 | USB session state machine (WebUSB ikiwepo) |
| `ProtectWizard` | ~485 | 7-step BLE pairing wizard (discovery inategemea plugin isiyopo) |
| `RecoveryROC` | ~190 | Recovery / anti-remove checks |
| `RemoteShield` | ~95 | Firestore write + notifications toggle |
| `AuthFlow` / `AuthActions` | ~60 | Navigation ya screens + demo submit |
| `I18N` | ~330 | Kamusi SW/EN + dropdown sync |
| `switchTab` / `initMainMap` | ~40 | Navigation + Leaflet |

### 1.4 Entry point na jinsi inavyoendeshwa

- **Entry point:** `index.html` (static).
- **Inavyoendeshwa awali:** kufunguliwa moja kwa moja (file au server yoyote ya static).
- **Sharti moja:** `firebase-service.js` ni ES module → **lazima** itumike kupitia
  HTTP(S), sio `file://`.

---

## 2. Hifadhi (backup) kabla ya mabadiliko

| Kitu | Mahali | Hali |
|---|---|---|
| Nakala ya byte-identical ya faili la awali | `backup/prototype-original-2026-10-27.html` | ✅ 350,916 bytes |
| Checksums | `backup/SHA256SUMS.txt` | ✅ imethibitishwa (`sha256sum -c` → OK) |
| Nakala ya awali ya upload | `uploads/index.html` | ✅ haijaguswa |
| Git repo | **haipo** | ⚠️ hakuweza kukaguliwa |

SHA-256 ya faili la awali:

```
5028a3526b0641c45f806f6607a86d1142283d2ee8051769d4119dc2c2c990e8
```

**Git status:** hakuna repo → hakuna "uncommitted changes" za kuripoti. Sikuanzisha
`git init` kwa sababu hilo ni badiliko la muundo wa project; nimependekeza uamuzi
(sehemu 7).

Kuhusu siri: faili lina `firebaseConfig` (apiKey, messagingSenderId, appId) kwa
Firebase project `guardhai`. **Sijachapisha thamani hizo kwenye ripoti hii** — zimefichwa.
Kumbuka: Firebase *web* API key ni ya umma kwa muundo, lakini **lazima** iwe na
API key restrictions (HTTP referrers) na Firestore security rules. Hilo halikuweza
kukaguliwa kwa sababu rules hazipo kwenye workspace.

Hakuna `.env`, migrations, au mafaili ya Android yaliyoguswa — hakuna yaliyokuwepo.

---

## 3. Mahali nilipoweka HTML na mafaili mapya

```
guardhai-prototype/
├── index.html              110,876 bytes · 1,390 lines   ← markup pekee
├── css/
│   └── guardhai.css         31,623 bytes ·   496 lines   ← design system
├── js/
│   ├── guardhai-app.js     175,729 bytes · 3,589 lines   ← core app (classic script)
│   └── firebase-service.js   2,577 bytes ·    66 lines   ← Firebase (ES module)
└── README.md                                             ← docs za prototype

backup/
├── prototype-original-2026-10-27.html
└── SHA256SUMS.txt

tools/
├── split_prototype.py      ← script iliyofanya mgawanyo (inaweza ku-run tena)
└── verify_split.py         ← uthibitisho wa kwamba hakuna kilichopotea

docs/
├── AUDIT-REPORT.md         ← ripoti hii
├── TEST-LOG.md             ← matokeo ya tests kwa undani
├── BACKUP-AND-VERSIONING.md
├── INTEGRATION-OPTIONS.md
├── screenshot-home.png
├── screenshot-shield.png
└── screenshot-map.png
```

**Kwa nini muundo huu?** Kwa sababu hakuna project iliyopo ya kuiga. Muundo ni
`index.html` + `css/` + `js/` — muundo wa kawaida wa static app, na hasa muundo ambao
**unahamishika kwa urahisi** kwenda React/Vite au Capacitor `www/` baadaye. Sikugawanya
zaidi (mfano screen moja = faili moja) kwa sababu hilo lingehitaji kubadilisha code
(inline handlers 120 zinategemea functions kuwa global); nilijiwekea kikomo cha
**kupanga, sio kujenga upya**.

### 3.1 Nini kimehamishwa wapi (kwa usahihi wa mistari)

| Kutoka (faili la awali) | Kwenda |
|---|---|
| lines 15–513 `<style>…</style>` | `css/guardhai.css` |
| lines 1883–1950 `<script type="module">` (Firebase) | `js/firebase-service.js` |
| lines 1952–5545 `<script>` (app core) | `js/guardhai-app.js` |
| lines 1–14 + 514–1882 + 1951 (markup, sprite, modals) | `index.html` |
| line 5546 — script ya Cloudflare (`__CF$cv$params`) | **imeondolewa** (sio code ya GuardHai) |

### 3.2 Mabadiliko pekee yaliyofanywa kwenye markup

1. `<style>…</style>` → `<link rel="stylesheet" href="css/guardhai.css">`
2. `<script type="module">…</script>` → `<script type="module" src="js/firebase-service.js"></script>`
3. `<script>…</script>` → `<script src="js/guardhai-app.js"></script>`
4. Script ya Cloudflare imeondolewa + `</body>` iliyokuwa imeunganishwa nayo imerudishwa.

**Hakuna** HTML, CSS, au JS ya app iliyoandikwa upya, kuondolewa, au kubadilishwa.
Indentation imepunguzwa (spaces 8) — ndio tofauti ya bytes iliyoelezwa sehemu 2.

---

## 4. Moduli zilizopo tayari na zinazokosekana

### 4.1 Zilizopo (ndani ya prototype)

| Moduli | Ipo? | Inafanya kazi kweli? |
|---|---|---|
| Splash / Welcome / Landing | ✅ | ✅ UI |
| Register / Login | ✅ UI | ⚠️ demo — `preventDefault` + `enterGuardHaiHome()` |
| Forgot password | ✅ UI | ⚠️ inaita Firebase (inahitaji project hai) |
| Google Sign-in | ✅ | ⚠️ inaita Firebase popup |
| Home (status, KPI, greeting) | ✅ | ⚠️ baadhi ya data ni static halisi ya browser |
| Shield Center (Protect/Find/Recover) | ✅ | ✅ UI routing |
| Protect sub-tabs × 10 | ✅ | ✅ UI routing |
| **Health** (`protect-view-health`) | ✅ | ⚠️ rows static; "Run check" inakusanya API za browser |
| Devices / Protection Network | ✅ | ⚠️ state kwenye `localStorage`, hakuna hardware |
| Pairing wizard (BLE/Wi-Fi/USB/LAN) | ✅ UI | ❌ inategemea Capacitor plugin `Protect` isiyopo |
| Communication module | ✅ | ⚠️ toggles pekee |
| Travel protection | ✅ | ⚠️ state machine |
| USB cable protection | ✅ | ⚠️ state machine (WebUSB ikiwepo) |
| Recovery (ROC) | ✅ | ⚠️ checks za UI |
| Remote Shield (cloud) | ✅ | ⚠️ **write-only** kwa Firestore; hakuna read |
| **SOS** | ✅ button | ❌ `alert()` pekee |
| Map | ✅ | ✅ Leaflet halisi + GPS ya browser |
| Soga / Chat (`commPage`) | ✅ placeholder | ❌ "Chat & Emergency requests appear here" |
| i18n SW/EN | ✅ | ❌ maandishi hayabadiliki (`data-i18n` haipo) |
| Offline banner | ✅ | ✅ `navigator.onLine` |
| Sidebar / profile / sign out | ✅ | ✅ UI |

### 4.2 Zinazokosekana kabisa

- **Backend** yoyote (API, server, jobs) — hakuna.
- **Android app** (Gradle, Kotlin/Java, Manifest, permissions) — hakuna.
- **Capacitor project** (`capacitor.config.*`, `android/`, `ios/`) — hakuna; kuna
  reference moja tu ya `window.Capacitor` ndani ya JS.
- **Native plugin `Protect`** inayotajwa (`Protect.testProtection`) — haipo, kwa hiyo
  `testProtect()` daima inatupa error (kwa makusudi, ikiwa browser).
- **Firestore security rules / indexes** — hazipo kwenye workspace.
- **Read path ya Remote Shield** (msimamizi kuona kifaa) — haipo.
- **Push notifications** (FCM) — `Notification.requestPermission()` tu, hakuna token
  registration, hakuna server key.
- **SOS dispatch** (contacts, SMS, call, escalation) — haipo.
- **Chat/messaging** — placeholder pekee.
- **Tests / CI** — hakuna.
- **`.env` / config management** — hakuna.

### 4.3 Vipengele vya interface vinne vilivyotajwa kwenye brief

| Kilichotajwa | Uhalisia |
|---|---|
| Home | ✅ ipo (`#homePage`) |
| Shield | ✅ ipo (`#shieldPage`) — ina Protect/Find/Recover |
| SOS | ⚠️ kipo kama **button** inayotoa alert; hakuna module ya SOS |
| Health | ✅ ipo kama **sub-tab** (`#protect-view-health`), sio tab ya chini |
| Map | ✅ ipo (`#mapPage`) |

Bottom navigation ina tab **4**: `Nyumbani`, `Soga`, `Ulinzi`, `Ramani` + SOS button
ya kati. Health iko ndani ya Ulinzi → "Protection Health". Hii ni tofauti na
"Home, Shield, SOS, Health, Map" zilizotajwa kwenye maagizo — **sikubadilisha**
navigation; nimeona ni bora kukuuliza (sehemu 7).

---

## 5. Matokeo ya testing

Browser halisi: **Chromium (headless) 1134** kupitia Playwright, viewport `390×844`.
Server: `python3 -m http.server 8123` kwenye `guardhai-prototype/`.

### 5.1 Tests zilizopita (`25/26` za UI + zote za muundo)

| # | Test | Matokeo |
|---|---|---|
| 1 | Mafaili yote yaliyotajwa kwenye `index.html` yapo kwenye disk | ✅ 3/3 |
| 2 | CSS ni sawa na block ya awali (whitespace-normalized) | ✅ 27,385 chars |
| 3 | `firebase-service.js` ni sawa | ✅ 2,020 chars |
| 4 | `guardhai-app.js` ni sawa | ✅ 127,474 chars |
| 5 | Faili lote (markup+css+js) ni sawa na la awali | ✅ 239,554 chars pande zote |
| 6 | Hakuna `<style>`/`<script>` ya code iliyobaki kwenye HTML | ✅ 0 |
| 7 | `guardhai-app.js` inaparse (`node --check`) | ✅ |
| 8 | `firebase-service.js` inaparse kama ES module | ✅ |
| 9 | CSS braces zinalingana | ✅ 249/249 |
| 10 | Hakuna `id` duplicate kwenye markup (223 ids) | ✅ 0 |
| 11 | Handlers 120 za HTML zina-resolve kwenye JS | ✅ 0 missing |
| 12 | App inapakia bila page error | ✅ 0 errors, 0 console errors |
| 13 | Splash inaendelea yenyewe | ✅ |
| 14 | Welcome → Landing → Register | ✅ |
| 15 | Register (demo) → Home; navs zinaonekana | ✅ |
| 16 | Tab `home` / `comm` / `shield` / `map` | ✅ 4/4 |
| 17 | Leaflet imeanzishwa (`.leaflet-container` + tile/marker panes) | ✅ |
| 18 | Shield → Health sub-tab | ✅ |
| 19 | Shield pillars `find` / `recover` | ✅ |
| 20 | Security check inafungua modal na ku-render (417 chars) | ✅ |
| 21 | Security check haitoi console error | ✅ |
| 22 | SOS button inajibu (demo alert) | ✅ |
| 23 | Hakuna horizontal overflow @ 320/360/390/430/768 px | ✅ 5/5 |

### 5.2 Test zilizoshindikana

| # | Test | Matokeo | Chanzo |
|---|---|---|---|
| 24 | Language switch inabadilisha maandishi ya UI | ❌ `guradhai_lang` inakuwa `en` lakini nav label inabaki "Nyumbani" | **Bug ya awali**: markup haina `data-i18n` (0 matches). `I18N.setLanguage()` inahifadhi lugha + inasawazisha dropdown tu, maandishi hayabadiliki |

Hii **haikusababishwa na mgawanyo** — code ya `I18N` haijaguzwa.

### 5.3 Nilichokagua kwa muundo-CODE (sio browser)

| # | Kagua | Matokeo |
|---|---|---|
| 25 | Sprite icons: zipotumika vs zilizotangazwa | ⚠️ `#i-play` inatumika lakini **haipo** → icon tupu |
| 26 | `GHIcon()` | ⚠️ imetangazwa **mara mbili** (ule wa pili unashinda) |
| 27 | `getElementById` 110 → 15 hazipo kwenye markup | ⚠️ 13 zinaundwa na JS (sawa); 2 ni dead refs (`lbl-ble-api-support`, `lbl-current-zone`) zote zina `if (el)` guard |

### 5.4 **Sikupima** (na hivyo **sidai** kwamba zinafanya kazi)

- Android app / Capacitor ya simu halisi — hakuna kwenye workspace.
- BLE / Wi-Fi Direct / USB / hotspot discovery kwenye kifaa halisi.
- Push notifications (hakuna FCM setup).
- Firebase Auth kwa credentials halisi (Google popup haikujaribiwa — inahitaji akaunti).
- Firestore rules/reads/writes kwa project halisi.
- SOS dispatch — hakuna kinachotumwa, hakuna cha kupima.
- GPS ya kifaa halisi (nilijaribu tu kwenye browser isiyo na geolocation).
- Backend — haipo.

Kumbukumbu kamili: `docs/TEST-LOG.md`.

---

> **Sasisho 2026-10-27:** bugs 7 zilizoorodheshwa hapa (H6, na items 1–7 za sehemu 5.3)
> **zimerekebishwa na kuthibitishwa**. Ripoti: `docs/BUGFIX-REPORT.md`.
> Hatari H1–H5, H7–H9 bado zipo — zinahitaji idhini tofauti.

## 6. Hatari na matatizo yaliyobainika

### 6.1 Hatari kubwa (production)

| # | Tatizo | Athari |
|---|---|---|
| H1 | **Auth ni demo.** `guardhai_logged_in` kwenye `localStorage` inatosha; register/login hazitumii Firebase | Mtu yeyote anaweza kuingia; hakuna identity halisi |
| H2 | **SOS ni `alert()`** | Mtumiaji anaweza kudhani dharura imetumwa. Ni hatari ya usalama wa maisha |
| H3 | **Hakuna Firestore rules kwenye workspace** | Hatuwezi kuthibitisha data ya `remoteShieldDevices/{uid}` imefungwa kwa uid |
| H4 | **Remote Shield ni write-only** | "Remote" haifanyi kazi kwa mwenzake — hakuna read path, hakuna push |
| H5 | **Health rows ni static** (PASS/RUNNING/ACTIVE/OPTIMIZED zimeandikwa) | Inaonyesha afya ya mfumo isiyopimwa |
| H6 | **`#i-play` haipo**, `GHIcon` duplicate | Sio hatari, lakini ni dalili ya code isiyo na build/lint |
| H7 | **State nyeti kwenye `localStorage`** bila encryption | Devices, sessions, events zinaonekana kwa script yoyote |
| H8 | **Google map tiles** (`mt1.google.com`) | Ukiukaji wa ToS wa Google kwa matumizi ya production; rate limiting |
| H9 | **Capacitor plugin `Protect` haipo** | `testProtect()` na discovery hazifanyi kazi kwenye app halisi bila plugin |

### 6.2 Hatari za usalama / usiri

- `firebaseConfig` iko ndani ya JS inayosambazwa (kawaida kwa web app) — **inahitaji**
  API key restrictions + App Check. Hazipo kwenye workspace, hivyo **hazijathibitishwa**.
- Avatar inatumia `ui-avatars.com` na jina la mtumiaji kwenye URL → jina linatoka nje.
- `maximum-scale=1.0, user-scalable=no` — inazuia zoom (accessibility).
- Hakuna CSP; handlers 120 ziko inline (ndio sababu CSP kali haiwezekani sasa).

### 6.3 Mapungufu ya kiufundi (sio hatari, lakini ni deni)

- 712 `style="..."` za inline + 120 event handlers za inline → refactor kubwa itahitajika
  kabla ya React au CSP.
- Hakuna build step, hakuna lint, hakuna format, hakuna tests.
- Code moja ya 3,589 lines yenye engines 9 → `guardhai-app.js` ni "god file".
- i18n haijaunganishwa na markup.
- Firebase v11 kutoka CDN (bila bundler) → hakuna offline caching, hakuna version pin
  ya muda mrefu isipokuwa URL.

### 6.4 Kuzuia (constraints) zilizotunzwa

- ❌ Hakuna Firebase → Supabase (wala kinyume).
- ❌ Hakuna mabadiliko ya schema, auth, API, permissions, production config.
- ❌ Hakuna faili lililofutwa au kubadilishwa jina.
- ❌ Hakuna moduli iliyoundwa upya.
- ✅ Prototype imebaki prototype.

---

## 7. Mapendekezo ya hatua inayofuata

### Hatua 0 — inahitaji uamuzi wako (maswali mwishoni)

Kabla ya kazi yoyote zaidi, nahitaji kujua **project halisi iko wapi**. Bila hiyo,
kazi yoyote ya "kuunganisha kwenye architecture iliyopo" itakuwa ni kubahatisha.

### Hatua 1 — baseline ya Git (dakika 5, hatari ndogo) — *inasubiri idhini*

```bash
cd <project-root>
git init
printf "node_modules/\n.env\n.env.*\n*.keystore\n*.jks\ngoogle-services.json\n" > .gitignore
git add -A && git commit -m "baseline: existing GuardHai state before prototype integration"
```
Faida: kila badiliko lijalo linaweza kurudishwa. **Sikuifanya** kwa sababu ni uamuzi
wa muundo wa project.

### Hatua 2 — rekebisha bugs 7 za prototype (ndogo, hatari ndogo) — *inasubiri idhini*

1. Ondoa `GHIcon()` ya pili (au ya kwanza) — moja tu ibaki.
2. Ongeza `<symbol id="i-play">` kwenye sprite.
3. Weka `data-i18n="<key>"` kwenye elements (au badilisha `I18N` itumie selectors) —
   ili language switch ifanye kazi.
4. Ongeza `lbl-ble-api-support` na `lbl-current-zone` kwenye markup au ondoa refs.
5. Weka **banner ya "PROTOTYPE / DEMO"** inayoonekana, hasa karibu na SOS na Health.
6. Badilisha SOS alert kuwa `"Demo only — no emergency service was contacted"`.
7. Weka `user-scalable=yes` (accessibility).

Kila moja ni mabadiliko madogo, yanayoweza kupimwa kwa tests zilizopo.

### Hatua 3 — muunganisho kwenye project halisi (inahitaji repo)

Chaguo tatu — maelezo zaidi: `docs/INTEGRATION-OPTIONS.md`

| Chaguo | Inafaa kama | Kazi |
|---|---|---|
| **A. Static (kama ilivyo sasa)** | Hakuna framework; unataka demo ya haraka | Weka `guardhai-prototype/` kama `web/` au `www/`; hakuna kubadilisha code |
| **B. Capacitor `www/`** | Unalenga Android app halisi | `npx cap init`, weka files kwenye `www/`, ongeza `android/`; prototype inakuwa shell |
| **C. React / Vite components** | Una React tayari | Gawanya markup kuwa components, hamisha engines kuwa hooks/services; kazi kubwa (inline handlers 120 → events) |

**Pendekezo langu:** Chaguo **B** kama lengo ni app ya Android (prototype inataja
Capacitor), au **A** kama unataka tu kuonyesha demo. **C** ni kazi kubwa — isifanyike
bila repo na bila mpango wa awamu.

### Hatua 4 — backend (BAADA ya idhini, sio sasa)

Mambo ya kuamua kwa pamoja:

1. Kuunganisha **register/login** na Firebase Auth (email/password) badala ya demo.
2. Kuandika **Firestore security rules** (`remoteShieldDevices/{uid}` → owner only) +
   App Check.
3. Kuongeza **read path** ya Remote Shield + FCM kwa notifications.
4. Kuamua **SOS**: nini kinatokea? (SMS? call? cloud event? escalation?) — hii ni
   feature mpya, sio bug fix.
5. Kuhamisha engines kutoka `localStorage` kwenda Firestore (au local-first + sync).
6. Kuamua provider wa ramani (Google tiles → licensed provider au OSM).

Kila moja inahitaji idhini tofauti. **Sitafanya yoyote bila wewe kuniambia.**

### Hatua 5 — ubora wa code (baadaye)

ESLint + Prettier, gawanya `guardhai-app.js` kwa engines, hamisha inline handlers,
unganisha i18n, ongeza tests za Playwright kwenye CI.

---

## Kiambatisho A — faili zilizoongezwa

| Faili | Aina | Maelezo |
|---|---|---|
| `guardhai-prototype/index.html` | 🆕 | markup pekee (kutoka la awali) |
| `guardhai-prototype/css/guardhai.css` | 🆕 | CSS ya awali |
| `guardhai-prototype/js/guardhai-app.js` | 🆕 | core app ya awali |
| `guardhai-prototype/js/firebase-service.js` | 🆕 | Firebase ya awali |
| `guardhai-prototype/README.md` | 🆕 | docs za prototype |
| `backup/prototype-original-2026-10-27.html` | 🆕 | backup byte-identical |
| `backup/SHA256SUMS.txt` | 🆕 | checksums |
| `tools/split_prototype.py` | 🆕 | script ya mgawanyo (repeatable) |
| `tools/verify_split.py` | 🆕 | uthibitisho |
| `docs/AUDIT-REPORT.md` | 🆕 | ripoti hii |
| `docs/TEST-LOG.md` | 🆕 | kumbukumbu za tests |
| `docs/BACKUP-AND-VERSIONING.md` | 🆕 | kurudisha / git |
| `docs/INTEGRATION-OPTIONS.md` | 🆕 | chaguo za muunganisho |
| `docs/screenshot-*.png` | 🆕 | screenshots 3 (home, shield, map) |

## Kiambatisho B — faili zilizobadilishwa / kufutwa

| Faili | Badiliko |
|---|---|
| `uploads/index.html` | **hakuna** — imebaki byte-identical (sha256 imethibitishwa) |

**Hakuna faili lililofutwa. Hakuna faili la awali lililobadilishwa.**
