# GuardHai — Home Redesign: Audit ya Awali (Phase 1)

**Tarehe:** 2026-10-27 · **Wigo:** Home screen pekee (+ components zinazohitajika moja kwa moja)
**Backup:** `backup/pre-home-redesign-20261027T094333Z/` (files 6, SHA-256 zimehakikiwa ✅)
**Git:** hakuna repo kwenye workspace → backup ya timestamped imetumika badala yake.

---

## 1. Muundo uliopo

```
guardhai-prototype/
├── index.html              1,396 lines — markup yote (screens, sprite, modals)
├── css/guardhai.css          506 lines — design system ya awali (dark navy + emerald)
├── js/guardhai-app.js      3,588 lines — engines, I18N, navigation, modals
└── js/firebase-service.js     66 lines — Firebase Auth + Firestore (ES module)
```

Servera: port **8123** (`guardhai-prototype`), port **8125** (`uploads`, asili).
Tools: `tools/verify_prototype.py`, `tools/diff_against_backup.py`, `tests/bugfix.spec.js` (23 checks).

## 2. Home ya sasa (chanzo: `index.html` lines 367–392)

```html
<div id="homePage" class="page-container">
  .status-hero-card      ← kadi kubwa ya navy, inasema "GUARDIAN ACTIVE" / "All Systems Safe"
  .safety-overview-grid  ← KPI 3: System Risk 0% · Safe Zone Trusted · Protected 0
</div>
```

**Matatizo:**
- Inadai "All Systems Safe" / "GUARDIAN ACTIVE" — **haijapimwa**, ni dai la uongo.
- KPI "Safe Zone: Trusted" ni static (haijaandikwa na JS yoyote).
- Hakuna SOS kwenye Home (iko kwenye nav pekee).
- Hakuna quick actions, hakuna Uwanja, hakuna composer.

## 3. Vipengele vinavyorejelewa na JS (HAVITARUHUSIWI KUVUNJWA)

| ID | Inatumiwa na | Hatua |
|---|---|---|
| `#lbl-controller-home-desc` | `ProtectEngine.detectRealPrimaryControllerDevice()` (line 150) | **kuwekwa** kwenye kadi mpya |
| `#lbl-system-risk-kpi` | `ProtectEngine.calculateProtectionConfidence()` (line 206) | **kuwekwa** (KPI ndogo ya "Risk") |
| `#kpi-real-device-count` | `ProtectEngine.renderDevices()` (line 340) | **kuwekwa** |
| `#topNavBrandName`, `#topNavUserPic`, `#sidebarUserName` | top nav / sidebar | **kuwekwa** |

Kama ID hizi zingeondolewa, engines zingekoma ku-update bila error (zote zina `if` guards) —
lakini ni kupoteza kazi halisi. Kwa hiyo **zitabaki**.

## 4. Hali halisi ya actions (kabla ya mabadiliko)

| Action | Handler | Hali |
|---|---|---|
| Tab Home / Chat / Shield / Map | `switchTab()` | ✅ inafanya kazi (Map ina Leaflet halisi) |
| SOS | inline `alert('GuardHai DEMO…')` | ⚠️ **demo** — hakuna dispatch |
| Google sign-in / reset password | `FirebaseService` | ⚠️ inahitaji Firebase project hai |
| Register / Login | `AuthActions` | ⚠️ **demo** (`preventDefault` → home) |
| Health sub-tab | `ProtectEngine.switchSubTab('health')` | ✅ |
| Find device | `switchShieldPillar('find')` | ✅ (UI; hardware haipo) |
| Recovery team | `RecoveryROC.requestAction('team')` | ⚠️ inahitaji mission hai |
| Device notifications | `RemoteShield.requestNotifications()` | ✅ ruhusa ya browser halisi |
| Sign out | `handleSignOut()` | ✅ |
| Sidebar | `toggleSidebar()` | ✅ |
| **Storage / Notifications / Account / More (top nav)** | — | ❌ **haipo kabisa** — itaundwa, na itaelezwa wazi kama demo/sehemu isiyotekelezwa |
| **Uwanja / composer** | — | ❌ **haipo** — itaundwa kama prototype ya mbele (front-end) |

## 5. Tofauti kati ya ombi na app iliyopo (na jinsi nitakavyoshughulikia)

| Ombi | Uliopo | Uamuzi |
|---|---|---|
| Bottom nav 5: Home, Afya, SOS, Shield, Chat | 4 tab (Home, Soga, Ulinzi, Ramani) + SOS floating | **Nabadilisha** nav; Ramani inabaki kupatikana kupitia quick action + sidebar (haiondolewa) |
| Top nav: logo + Storage/Bell/Account/More | menu, avatar, jina, lugha SW/EN | **Nabadilisha**; lugha + logout + ramani zinahamia kwenye menyu ya ⋮ (haziondolewa) |
| Rangi: white + #18A982 | navy + emerald | **Naboresha Home + nav**; screens nyingine **haziguzwi** |
| Afya kama tab | Health ni sub-tab ndani ya Shield | Tab ya Afya inafungua Shield → Protection Health (reuse, hakuna moduli mpya) |

## 6. Faili nitakazobadilisha (na hakuna nyingine)

| Faili | Badiliko | Ukubwa unaotarajiwa |
|---|---|---|
| `guardhai-prototype/index.html` | top nav, `#homePage`, bottom nav, modals 3 mpya, symbols ~10, script tag 1 | ~+330 lines |
| `guardhai-prototype/css/guardhai.css` | block mpya `.gh-*` + override za nav (zote **nyongeza**; hakuna kanuni ya awali inayoondolewa) | ~+330 lines |
| `guardhai-prototype/js/guardhai-home.js` | **faili mpya** — HomeUI, GHSos, composer, feed, drafts | ~330 lines |
| `guardhai-prototype/js/guardhai-app.js` | keys za i18n (sw+en) tu — nyongeza | ~+45 lines |
| `tests/home.spec.js` | **mpya** — suite ya Home | ~200 lines |
| `tests/bugfix.spec.js` | update ya nav contract (`#tab-map`→ hakuna; `#tab-comm`→`#tab-chat`) | ndogo |
| `tools/verify_prototype.py` | kinga: "hakuna mabadiliko yasiyohusiana" kulingana na orodha | wastani |
| `docs/HOME-REDESIGN.md` | ripoti | mpya |

**HAITAGUSWA:** `js/firebase-service.js`, Firebase config, auth, Firestore, `shieldPage`,
`commPage`, `mapPage`, engines, Android, `uploads/index.html`, `backup/prototype-original-*`.

## 7. Mambo ya uwazi yatakayoonekana kwenye UI mpya

1. Kadi ya usalama **haitadai** kuwa mtumiaji analindwa. Itasema: "Hali haijapimwa" + button ya kukagua.
2. SOS itabaki **DEMO** na itasema wazi hakuna msaada uliotumwa.
3. Posts zote za Uwanja zitakuwa na lebo **"SAMPULI"**; hakuna verified badge ya uongo.
4. Storage itaonyesha **data halisi** ya `localStorage` ya kifaa (inapimwa, si ya kubuni).
5. Notifications itatumia `RemoteShield.requestNotifications()` halisi (ruhusa ya browser).
6. Composer itasema wazi: post inabaki kwenye kifaa hiki, haijatumwa.
