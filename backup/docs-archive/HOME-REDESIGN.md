# GuardHai — Home Redesign: Ripoti (2026-10-27)

**Wigo:** Home screen + components zinazohitajika moja kwa moja. **Hakuna** screen nyingine iliyoguzwa.
**Checkpoint:** `backup/pre-home-redesign-20261027T094333Z/` (files 6, SHA-256 ✅)
**Commit/push:** hakuna — kama ulivyoomba.

---

## 1. Faili zilizobadilishwa

| Faili | Aina | Badiliko |
|---|---|---|
| `guardhai-prototype/index.html` | imebadilishwa | +275 / −55 lines: top nav, `#homePage`, bottom nav, modals 3, symbols 15, `<script>` 1 |
| `guardhai-prototype/css/guardhai.css` | **nyongeza pekee** | 507 → 969 lines; CSS ya awali ni **prefix kamili** (hakuna kanuni iliyohaririwa) |
| `guardhai-prototype/js/guardhai-home.js` | **mpya** | 29.7 KB — `HomeUI`, `GHSos`, feed, composer, drafts |
| `guardhai-prototype/js/guardhai-app.js` | nyongeza | keys 115 za i18n (sw+en) + sahihisho 1 la `nav_shield` |
| `guardhai-prototype/js/firebase-service.js` | **haijaguswa** | byte-identical ✅ |
| `tests/home.spec.js` | mpya | 59 checks |
| `tests/bugfix.spec.js` | imebadilishwa | nav contract mpya (selectors tu) |
| `tools/home_scope_check.py` | mpya | 22 scope checks |
| `tools/home_redesign_html.py` | mpya | script ya migration (inatumika mara moja) |

**HAIJAGUSWA:** `shieldPage` (60,620 chars — imethibitishwa sawa), `commPage`, `mapPage` (16,020 chars — sawa),
modals zote za awali, engines zote, Firebase config, auth, Firestore, Android, `uploads/`.

## 2. Vipengele vilivyotekelezwa

### A. Top navigation
Logo (shield-check kwenye kijani #18A982) + jina **GuardHai** kushoto.
Kulia, kwa **mpangilio kamili**: **Storage → Notifications → Account → More (⋮)**.
Vitufe 36×36px (≥32px target), `aria-label` kwa kila kimoja. Menyu ya ⋮ ina: Ramani (route ya awali),
Menyu kamili (sidebar), Lugha SW/EN, Ondoka.

### B. Welcome + safety status
- **"Karibu GuardHai"** / **"Usalama wako, afya yako, maisha yako."**
- Kadi nyeupe yenye mstari wa kijani: **"Hali ya usalama — Haijapimwa bado"**.
- **Haidai** kuwa umelindwa. Neno "All Systems Safe" / "GUARDIAN ACTIVE" limeondolewa.
- Vipimo 2 vidogo: **Zilizolindwa 0** (inaendeshwa na `ProtectEngine`, id iliyohifadhiwa) na
  **Kipimo cha hatari** — pamoja na maelezo: *"kinatokana na ishara za kifaa (mtandao, betri,
  ruhusa) — si tathmini ya usalama wako."*
- Button **Kagua / Sanidi taarifa za usalama** → sheet inayosema huduma za dharura **hazijaunganishwa**,
  na inatoa njia ya kuendesha ukaguzi wa kifaa kilichopo (`runReal7StepSecurityCheck`).

### C. SOS
Button kubwa nyekundu yenye ikoni ya siren + **"SOS / Dharura"**, na maelezo chini:
*"Demo — hakuna msaada unaotumwa kwa mtu yeyote."*
Handler mmoja (`GHSos.trigger()`) unatumiwa na Home **na** bottom nav → haviwezi kutofautiana.
Ujumbe: *"No emergency service was contacted and no alert was sent."*

### D. Quick actions (6)
Afya · Shield · Tafuta Kifaa · Ramani · Walezi · Elimu ya Usalama — grid 3×2 (2×3 kwenye ≤359px, 6×1 kwenye ≥560px).
Vitendo vinatumia handlers zilizopo: `ProtectEngine.switchSubTab('health')`, `switchShieldPillar('find')`,
`switchTab('map')`. **Walezi** inafungua sheet inayosema walezi **hawajaunganishwa** (hakuna orodha ya kubuni).

### E. Uwanja wa GuardHai
Heading + subtitle kama yalivyoombwa, topics 5 + "Zote", feed yenye posts 5 za **sampuli**.
Kila post ina: jina la mwandishi, aina ya akaunti, mada, muda, maandishi, media preview (sampuli),
na vitendo 5: **Imenisaidia · Maoni · Shiriki · Hifadhi · Ripoti** + **Fuata** kwa mwandishi.
- **Kila post ya sampuli ina beji "SAMPULI"** — 5/5.
- **Hakuna beji ya uthibitisho** (`verified = 0`) kwa sababu hakuna uthibitisho halisi.
- Topic filter inafanya kazi.

### F. Composer (+ Shiriki Elimu)
Bottom sheet tofauti na layout ya Home. Ina: aina 5 za chapisho, mada 5, watazamaji 3,
text (600 chars + counter), viambatisho 4 (**Picha/Video/Sauti/Kiungo** — zote zinaeleza ni **mock-up**),
**Chapisha** na **Hifadhi Rasimu** + **kupakia rasimu** iliyohifadhiwa.
Note ya juu: *"chapisho lako linabaki kwenye kifaa hiki. Hakuna kinachotumwa."*

### G. Bottom navigation
**5 items kwa mpangilio kamili:** Home · Afya · **SOS (duara jekundu iliyoinuka 25px)** · Shield · Chat.
Hakuna Map, Uwanja, Storage au item ya sita. `#tab-sos` ni kitufe cha SOS (sio tab).

## 3. Vipengele vinavyotumia demo data / hazijaunganishwa

| Kipengele | Hali halisi |
|---|---|
| SOS | ❌ Demo — hakuna dispatch, hakuna arifa |
| Feed ya Uwanja | ⚠️ **Sampuli** — posts 5 zilizoandikwa kwa mkono, zote zina beji SAMPULI |
| Posts za mtumiaji | ⚠️ Kwenye memory ya ukurasa pekee (zinapotea ukipakia upya) |
| Rasimu | ✅ `localStorage` ya kifaa (**kifaa hiki pekee**) |
| Likes / Save / Follow | ⚠️ State ya UI pekee |
| Maoni / Shiriki / Ripoti | ❌ Sheets zinazosema hazijaunganishwa |
| Viambatisho | ❌ Mock-up — hakuna faili linalopakiwa |
| Storage | ✅ **Data halisi** ya `localStorage` ya kifaa (inapimwa, si ya kubuni) |
| Notifications | ⚠️ Ruhusa halisi ya browser inawezekana; **FCM haijaunganishwa** |
| Walezi | ❌ Hawajaunganishwa — inasemwa wazi |
| Account | ⚠️ Demo — jina kutoka sidebar; "Demo (haijathibitishwa)" |

## 4. Matokeo ya majaribio

| Suite | Matokeo |
|---|---|
| `tests/home.spec.js` (mpya) | **59/59 PASS** |
| `tests/bugfix.spec.js` (iliyopo, ime-update) | **23/23 PASS** |
| `tools/home_scope_check.py` (mpya) | **22/22 PASS** |
| Syntax: `node --check` × 3 files | PASS |
| CSS braces | 449/449 balanced |
| Duplicate IDs (262 ids) | 0 |
| i18n: wired 62 / missing sw 0 / missing en 0 | PASS |

**Zilizoshindikana wakati wa kazi (na zilivyorekebishwa):**
1. `F11c Empty post is rejected` — **bug halisi**: baada ya kuhifadhi rasimu, maandishi yalibaki kwenye
   kihariri, kwa hiyo kufungua tena na kubonyeza "Chapisha" kungalichapisha maandishi ya zamani.
   **Fix:** kihariri kinasafishwa baada ya kuhifadhi + kiongezwa cha "Pakia rasimu".
2. `I3 inline handlers resolve` — **test ilikuwa kosa**: `const` ya top-level inatumika kwenye
   inline handlers lakini **si** property ya `window`. Test imebadilishwa kutumia `typeof`.
3. `B3c language switch` kwenye suite ya zamani — sababu: `nav_shield` ya EN ilikuwa `'Network'`
   wakati kitufe kinaitwa Shield. **Fix ya kamusi** (mstari 1).

**Responsive:** hakuna overflow kwenye 320 / 360 / 390 / 430 / 768 / 1024 / 1440 px.
**Console errors:** 0. **Page errors:** 0.

## 5. Screenshots

| Faili | Maudhui |
|---|---|
| `docs/home-redesign-390.png` | Home @ 390px (mobile) |
| `docs/home-redesign-390-full.png` | Home kamili (full page) |
| `docs/home-redesign-composer.png` | Composer + rasimu |
| `docs/home-redesign-320.png` | 320px (smallest) |
| `docs/home-redesign-1440.png` | Desktop 1440px |
| `docs/home-test-results.json` | Matokeo ya suite (JSON) |

**Preview:** server ipo kwenye **http://localhost:8123/** (`guardhai-prototype`, ina-home mpya).
Port **8125** = `uploads/` ya awali (haijabadilishwa).

## 6. Mambo yaliyobaki na mapendekezo

**Yaliyobaki (kwa kusudi, nje ya wigo):**
1. Screens nyingine (Shield, Chat, Map) bado zina muonekano wa awali (dark navy) — **hazijaguzwa** kama ulivyoomba.
   Home sasa ni nyeupe; hii inaunda tofauti ya mwonekano kati ya Home na screens nyingine.
2. Feed haihifadhiwi kwenye kifaa (posts zinapotea ukipakua upya) — rasimu pekee zinahifadhiwa.
3. Hakuna backend ya posts, maoni, likes au walezi.
4. Map haiko kwenye bottom nav (kama ulivyoomba) — inapatikana kupitia ⋮ → Ramani, quick action, na sidebar.

**Mapendekezo:**
- **Awamu inayofuata:** kuhamisha muonekano huu kwenye Shield / Afya / Chat (idhini tofauti).
- Kuunganisha feed na Firestore (`posts` collection) ikiwa unataka posts halisi — hii ni kazi ya backend.
- Kuongeza `?` accessibility audit (kontrasti imepimwa kwa mkono; axe-core haikuwekwa).
- Kuhamisha inline handlers zilizobaki kuwa `addEventListener` kabla ya CSP kali.

## 7. Jinsi ya kuthibitisha mwenyewe

```bash
cd /home/user
python3 tools/home_scope_check.py            # 22/22 — mabadiliko yako ndani ya wigo
NODE_PATH=/tmp/pw/node_modules node tests/home.spec.js     # 59/59
NODE_PATH=/tmp/pw/node_modules node tests/bugfix.spec.js   # 23/23
# kurudisha: cp backup/pre-home-redesign-20261027T094333Z/* guardhai-prototype/...
```
