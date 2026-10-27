# GuardHai — Ripoti ya Marekebisho ya Bugs 7

**Tarehe:** 2026-10-27
**Wigo:** bugs 7 zilizobainika kwenye `docs/AUDIT-REPORT.md` (sehemu 6).
**Hali:** zote zimerekebishwa na **kuthibitishwa kwa majaribio**.
**Haijafanywa:** commit, push, mabadiliko ya backend/auth/Firebase/Android.

---

## 0. Muhtasari

| # | Bug | Aina ya marekebisho | Faili | Imethibitishwa? |
|---|---|---|---|---|
| F1 | `GHIcon()` ilitangazwa mara mbili | kuondoa ule wa pili | `js/guardhai-app.js` | ✅ B7 |
| F2 | `#i-play` haipo kwenye SVG sprite | kuongeza `<symbol>` mmoja | `index.html` | ✅ B6 |
| F3 | `data-i18n` haikuwepo → lugha haibadilishi maandishi | kuunganisha elements 12 kwenye kamusi **iliyopo** | `index.html` (+`js`) | ✅ B3, B3b, B3c |
| F4 | ID 2 zilizokufa (`lbl-ble-api-support`, `lbl-current-zone`) | kuondoa references | `js/guardhai-app.js` | ✅ B5 |
| F5 | SOS ilisema "Emergency Alert Triggered!" | ujumbe wa demo usio dai kitu kimetumwa | `index.html` | ✅ B4 |
| F6 | Hakuna indicator ya demo | banner ya PROTOTYPE/DEMO | `index.html` + `css` | ✅ B1 |
| F7 | `user-scalable=no`, `maximum-scale=1.0` | kuondoa vizuizi vya zoom | `index.html` | ✅ B2 |

**Jumla ya mabadiliko:** +45 / −30 lines kwenye code (mstari kwa mstari, `tools/diff_against_backup.py`).
**Backup:** haijaguswa — SHA-256 bado `5028a352…c2c990e8`.

---

## F1 — `GHIcon()` duplicate

**Tatizo:** `function GHIcon(key)` ilitangazwa mara mbili mfululizo (mistari 2682 na 2691).
Ya pili ilishinda, na haikuwa na keys za emoji (`'💻'`, `'⌚'`, `'📱'`, `'🎒'`), kwa hiyo emoji
zilizo na device cards zingeanguka kwenye fallback ya `i-smartphone`.

**Marekebisho:** kuondoa ule wa pili. Ule wa kwanza (superset) ndio umebaki.

```diff
-/* Icon renderer for protected devices */
-function GHIcon(key) {
-    const map = { laptop: 'i-laptop', watch: 'i-watch', phone: 'i-smartphone', tracker: 'i-bag' };
-    return '<svg class="ic" style="width:18px;height:18px"><use href="#' + (map[key] || 'i-smartphone') + '"/></svg>';
-}
+/* NOTE: the second (duplicate) GHIcon definition that used to live here was
+   removed. The definition above is the superset (names + emoji keys) and was
+   already the one being called for named icons. */
```

**Uthibitisho:** `GHIcon` inaonekana mara 1; `GHIcon('💻')` → `i-laptop`; `GHIcon('laptop')` → `i-laptop`;
`GHIcon('zzz')` → `i-smartphone` (fallback). Test **B7 PASS**.

**Kumbuka kwa uwazi:** hapo awali *hakuna* call iliyokuwa ikipitisha emoji — `selectedIcon`
ni `'laptop'` n.k. Kwa hiyo marekebisho haya hayabadilishi mwonekano wa sasa; yanafanya
function kuwa moja na kamili. Sikuongeza call mpya yoyote.

---

## F2 — `#i-play` haipo kwenye sprite

**Tatizo:** button "Start Travel" inatumia `<use href="#i-play"/>`, lakini sprite ilikuwa na
symbols 58 — `i-play` haikuwemo. Icon ilikuwa tupu.

**Marekebisho:** kuongeza symbol mmoja kwa mtindo ule ule wa sprite iliyopo:

```html
<symbol id="i-play" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></symbol>
```

**Uthibitisho:** `#i-play` inapatikana na ina-render (`14x18px` ndani ya host svg).
Sprite sasa ina symbols 59. Test **B6 PASS**.

---

## F3 — `data-i18n` haikuwepo

**Tatizo:** `I18N.setLanguage()` ilikuwa tayari inafanya kazi tatu: (1) kuhifadhi lugha,
(2) kusawazisha dropdowns zote, (3) kupitia `[data-i18n]`. Lakini markup ilikuwa na
**0** elements zenye `data-i18n` — kwa hiyo maandishi hayakubadilika kamwe.

**Marekebisho:** kuunganisha elements 12 kwenye **kamusi iliyopo** — sikuongeza key mpya
yoyote, sikuandika tafsiri mpya yoyote:

| Key | Element |
|---|---|
| `greeting` | `#appTopNav .user-greeting` |
| `nav_home`, `nav_comm`, `nav_shield`, `nav_map` | `.tab-label` × 4 |
| `hero_title` | `#homePage` H3 "All Systems Safe" |
| `kpi_risk`, `kpi_safe_zone`, `kpi_protected` | `.kpi-label` × 3 (home pekee) |
| `tab_dashboard` | sub-tab "Dashboard" |
| `btn_register`, `btn_login` | landing cards |

Nilitafuta kwa utaratibu: kwa kila key iliyobaki kwenye kamusi, je thamani yake ya `sw`
inaonekana **kama text node kamili** kwenye markup? Keys 15 hazikulingana (mfano
`tab_health` = "Afya ya Mfumo" lakini markup ina "Protection Health") → **sikuziunganisha**,
kwa sababu kuziunganisha kungebadilisha maandishi ya default ya Kiswahili.

**Marekebisho ya lazima kwenye kamusi (1 mstari):**

```diff
 'nav_comm': 'Soga',
-'nav_shield': 'Network',      ← Kiswahili kilikuwa na neno la Kiingereza
+'nav_shield': 'Ulinzi',
 'nav_map': 'Ramani',
```

Bila hii, kuunganisha `data-i18n="nav_shield"` kungebadilisha "Ulinzi" → "Network" kwenye
lugha ya Kiswahili — udhalilishaji. Markup ilikuwa na "Ulinzi" tayari.

**Uthibitisho (B3, B3b, B3c):**
- Programmatic: `setLanguage('en')` → `Home`, `All Systems Safe`; `setLanguage('sw')` → `Nyumbani`, `Mfumo Uko Salama`. Inarudi sawa (symmetric).
- Njia halisi ya mtumiaji: kuchagua EN kwenye dropdown inayoonekana → greeting, hero na labels zote 4 za nav zinabadilika; lugha inahifadhiwa (`localStorage`) na inabaki baada ya reload.
- Swahili haikudhoofika: `nav_shield` = "Ulinzi".

**Ukaguzi wa wazi (coverage):** elements **12** zimeunganishwa kati ya text nodes ~260
kwenye markup. Kwa hiyo mabadiliko ya lugha yanafanya kazi kikamilifu **kwenye sehemu
zilizounganishwa** (Home, bottom nav, landing cards, top-bar greeting), lakini screen
nyingine (Shield, Health, modals, auth forms) zinaandishi ya Kiingereza yaliyoandikwa
moja kwa moja. Kupanua coverage kunahitaji **kuandika tafsiri mpya za ~250 strings** —
hilo ni kazi ya content, sio bug fix, na linahitaji idhini yako. **Sikuibuni.**

---

## F4 — ID mbili zilizokufa

**Tatizo:** `getElementById('lbl-ble-api-support')` na `getElementById('lbl-current-zone')`
zilitafutwa lakini elements hazipo kwenye markup. Zote zilikuwa na `if (el)` guard, kwa hiyo
hazikuwa crash — zilikuwa no-op.

**Marekebisho:** kuondoa references (na kuacha comment inayoeleza). Sikubuni UI mpya ya
kuwaweka, kwa sababu hilo lingekuwa ni kuongeza kipengele, sio kurekebisha bug.

```diff
-        const bleEl = document.getElementById('lbl-ble-api-support');
         const healthDesc = document.getElementById('lbl-health-ble-desc');
         if ('bluetooth' in navigator) {
-            if (bleEl) bleEl.innerText = "Supported (Web BLE Distance Sensor Active)";
             if (healthDesc) bleDesc...
```

```diff
-        const zoneEl = document.getElementById('lbl-current-zone');
-        if (zoneEl) zoneEl.innerText = mode + ' Zone';
```

**Uthibitisho:** hakuna `getElementById` inayorejelea ID hizo; `checkBluetoothHardwareSupport()`
inaendelea ku-update `#lbl-health-ble-desc` (row inayoonekana kwenye Shield → Health);
`setProfile()` haitupi error na bado inaandika kwenye security log. Test **B5 PASS**.

**Kumbuka:** `setProfile()` haikuwa na caller kwenye markup (nilikagua) — kwa hiyo hakuna
tabia iliyopotea.

---

## F5 — SOS ilidai dharura imetumwa

**Tatizo:**

```js
onclick="alert('SOS Emergency Alert Triggered!')"
```

Hakuna kitu kinachotumwa. Ujumbe ulisema "Triggered" — unaweza kumfanya mtumiaji
aamini msaada unakuja.

**Marekebisho:**

```js
onclick="alert('GuardHai DEMO: SOS button pressed.\n\nNo emergency service was contacted
and no alert was sent. SOS dispatch is not connected yet.')"
```

**Uthibitisho:** dialog inasema wazi "DEMO", "No emergency service was contacted",
"no alert was sent". Test **B4 PASS** (inakataa ujumbe wowote unaodai kimetumwa).
Button yenyewe haikuondolewa — inabaki kama demo.

---

## F6 — Banner ya DEMO

**Tatizo:** hakuna indicator yoyote inayoonyesha kuwa hii ni prototype.

**Marekebisho:** banner moja juu ya ukurasa, `position: sticky; top: 0; z-index: 10001`
(juu ya kila kitu, ikiwemo auth screens zilizo `z-index: 10000`):

```html
<div id="demoBanner" class="demo-banner" role="status">
  <svg …>⚠</svg>
  <span>PROTOTYPE / DEMO — SOS, notifications and device pairing are not connected to real services.</span>
</div>
```

+ CSS mpya 9 lines (`.demo-banner`), rangi ya amber iliyokolea (#7C2D12 → #B45309) ili
isichanganyike na banner ya offline (amber nyepesi).

**Uthibitisho:** banner inaonekana (`h=42px`), ina maneno "PROTOTYPE" na "DEMO".
`role="status"` kwa screen readers. Haizuii clicks (hakuna overlay). Test **B1 PASS**.
Haijasababisha overflow kwenye 320–768px (R7 zote PASS).

---

## F7 — Zoom / accessibility

**Tatizo:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

`maximum-scale=1.0` + `user-scalable=no` zinazuia mtumiaji kukuza (WCAG 1.4.4 — fail).

**Marekebisho:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Layout haikuguzwa; hakuna CSS iliyobadilishwa kwa ajili ya hii.

**Uthibitisho:** hakuna `user-scalable=no` wala `maximum-scale=1.0`; hakuna horizontal
overflow kwenye 320/360/390/430/768px baada ya mabadiliko. Test **B2 PASS**.

---

## Jedwali la tests: kabla vs baada

Suite ile ile (`tests/bugfix.spec.js`), Chromium headless, 390×844.

| ID | Check | Kabla | Baada |
|---|---|---|---|
| B1 | DEMO banner present & visible | ❌ element missing | ✅ h=42px |
| B2 | Viewport allows user zoom | ❌ `maximum-scale=1.0, user-scalable=no` | ✅ `width=device-width, initial-scale=1.0` |
| B3 | Language switch changes UI text | ❌ wired=0 | ✅ wired=12, sw↔en symmetric |
| B3b | Swahili nav not degraded | ✅ | ✅ |
| B3c | Language dropdown (real user path) | — (imeongezwa) | ✅ EN/SW + persist |
| B4 | SOS honest about demo | ❌ "SOS Emergency Alert Triggered!" | ✅ "no alert was sent" |
| B5 | No dead getElementById | ❌ refs(ble)=1 refs(zone)=1 | ✅ 0/0 |
| B6 | `#i-play` renders | ❌ symbol missing | ✅ 14×18px |
| B7 | GHIcon defined once | ❌ defs=2, emoji broken | ✅ defs=1, emoji ok |
| R1–R7 | Regressions (23 checks) | ✅ | ✅ |

**Kabla: 15/22 · Baada: 23/23.**

Suite ya awali ya ukaguzi (`functional.js`, 26 checks): **25/26 → 25/26**.
Check moja inayoshindikana (`Language switch persists`) ni **kasoro ya test yenyewe**:
ilichagua `.lang-toggle` ya kwanza kwenye DOM (iko kwenye screen iliyofichwa) na
`.catch(()=>{})` ilifunika kosa. Njia halisi ya mtumiaji imethibitishwa kwenye **B3c**:
kuchagua dropdown inayoonekana → `localStorage` = `en`, maandishi yanabadilika, yanabaki
baada ya reload.

---

## Mabadiliko ambayo HAYAKUFANYWA (kwa kuzingatia masharti)

- ❌ Hakuna mabadiliko ya `js/firebase-service.js` (imethibitishwa: content-identical).
- ❌ Hakuna mabadiliko ya Firebase config, auth flow, Firestore writes.
- ❌ Hakuna mabadiliko ya Android / Capacitor / permissions.
- ❌ Hakuna moduli iliyoondolewa au kuundwa upya.
- ❌ Hakuna key mpya ya tafsiri, hakuna tafsiri iliyobuniwa.
- ❌ Hakuna kipengele kilichoondolewa (SOS button, screens, engines zote zipo).
- ❌ Hakuna commit / push.
- ✅ Backup haijaguswa.

## Jinsi ya kuthibitisha mwenyewe

```bash
python3 tools/verify_prototype.py     # 23/23 checks, bila browser
python3 tools/diff_against_backup.py  # diff kamili vs backup, mstari kwa mstari

cd guardhai-prototype && python3 -m http.server 8123 &
NODE_PATH=<playwright>/node_modules node tests/bugfix.spec.js
```

Screenshots: `docs/after-home.png` (SW), `docs/after-home-en.png` (EN), `docs/after-shield.png`.
