# Chaguo za Kuunganisha Prototype kwenye Project Halisi

> Hati hii ni ya **majadiliano**. Hakuna kilichotekelezwa. Chagua kimoja, kisha
> nitaandika mpango wa hatua kwa hatua kabla ya kuandika code.

Lengo: prototype (`guardhai-prototype/`) iingie kwenye project **iliyopo** bila
kuunda muundo wa pili unaojirudia, na bila kuunda moduli ambazo tayari zipo.

---

## Chaguo A — Static, kama ilivyo (haraka, hatari ndogo)

**Inafaa kama:** huna framework, unataka demo/onyesho, au unatumia web shell.

```
<project-root>/
├── web/  (au public/ au www/)
│   ├── index.html
│   ├── css/guardhai.css
│   └── js/*
```

**Kazi:** kuhamisha folda + kuweka route. **Saa:** <1.
**Athari:** hakuna mabadiliko ya code. Auth inabaki demo; SOS inabaki alert.
**Hatari:** ndogo. Lakini prototype itabaki pembeni ya app halisi (duplication ya UI
itakuja ukiwa na screens zilizojengwa upya).

---

## Chaguo B — Capacitor `www/` (inashauriwa kama lengo ni Android)

**Inafaa kama:** unataka app ya Android na prototype iwe shell halisi.

Prototype **inaonyesha** dalili za Capacitor:

```js
const Protect = window.Capacitor?.Plugins?.Protect || null;   // guardhai-app.js:3
```

lakini **hakuna** `capacitor.config.*`, `android/`, wala plugin `Protect` kwenye workspace.

**Kazi:**

1. `npm init` + `npm i @capacitor/core @capacitor/cli @capacitor/android`
2. `npx cap init GuardHai com.guardhai.app --web-dir=www`
3. Hamisha `guardhai-prototype/*` → `www/`
4. `npx cap add android` → `android/` inaundwa (Manifest, permissions, Gradle)
5. Andika plugin `Protect` (Kotlin) inayotoa: `testProtection()`, BLE scan, FGS,
   notification — **ndio kazi kubwa** (sio UI)

**Saa:** 1–2 kwa setup; plugin ni kazi tofauti kubwa.
**Athari:** mabadiliko ya muundo (Android inaundwa) — **inahitaji idhini**.
**Hatari:** plugin `Protect` ikiwa haijaandikwa, wizard ya pairing haitafanya kazi
kwenye simu (itatoa error — tabia iliyokusudiwa).

---

## Chaguo C — React / Vite components (kazi kubwa)

**Inafaa kama:** una React app tayari na unataka UI hii iwe sehemu yake.

**Kazi inayohitajika:**

| Hatua | Kazi | Ugumu |
|---|---|---|
| 1 | Gawanya `index.html` (1,390 lines) kuwa components: `HomeScreen`, `ShieldCenter`, `MapScreen`, `CommScreen`, `SosButton`, `BottomNav`, `HealthPanel`, modals (~20) | kubwa |
| 2 | Hamisha engines (`ProtectEngine`, `ProtectWizard`, `RemoteShield`, `Travel…`, `USBCable…`, `RecoveryROC`, `I18N`) kuwa services + hooks | kubwa |
| 3 | Badilisha **handlers 120 za inline** kuwa `onClick={}` | kubwa |
| 4 | Hamisha **styles 712 za inline** kuwa CSS modules / Tailwind | kubwa |
| 5 | Hamisha state ya `localStorage` kuwa store (Zustand/Context) | wastani |
| 6 | Firebase module → `src/lib/firebase.ts` | ndogo |

**Saa:** siku kadhaa. **Athari:** refactor kubwa — **inahitaji idhini na repo**.
**Hatari:** regression nyingi; tests za Playwright ziwe msingi.

**Ushauri:** usianze na C. Anza na A au B kuonyesha demo, kisha C ikiwa na mpango
wa awamu (screens kwanza, engines baadaye).

---

## Chaguo D — WebView ndani ya Android iliyopo (legacy)

**Inafaa kama:** una Android app ya Kotlin/Java tayari yenye `WebView`.

Weka HTML/CSS/JS kwenye `app/src/main/assets/` na `webView.loadUrl("file:///android_asset/index.html")`.
Ongeza `@JavascriptInterface` kwa `Protect` bridge.

**Athari:** inahitaji mabadiliko ya Android — **inahitaji idhini**.
**Hatari:** ES modules kwenye `file://` **hazifanyi kazi** → lazima `WebViewAssetLoader`
au serve kupitia `http://` ya ndani.

---

## Vitu visivyobadilika kwenye chaguo zote

- ❌ Firebase → Supabase (au kinyume)
- ❌ Schema ya database
- ❌ Auth provider (bila idhini tofauti)
- ❌ Android permissions (bila idhini tofauti)
- ❌ Production configuration

## Maswali ya kuamua kabla ya kuchagua

1. Project halisi iko wapi? (path/zip/repo)
2. Kuna framework? (React? Vue? hakuna?)
3. Kuna Android app? (Kotlin? Java? Capacitor?)
4. Backend ni Firebase pekee au kuna API server?
5. Lengo la muda mfupi: demo ya kuonyesha, au app ya kujaribu kwenye simu?
