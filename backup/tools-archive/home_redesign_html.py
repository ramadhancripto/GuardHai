#!/usr/bin/env python3
"""
Home redesign — markup migration for guardhai-prototype/index.html.

One-shot, anchored replacement of exactly four regions plus additive sprite
symbols and one <script> tag. Aborts if the new markup is already present.

Run: python3 tools/home_redesign_html.py
"""
import pathlib, sys, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = ROOT / "guardhai-prototype/index.html"
src = HTML.read_text(encoding="utf-8")

if 'id="homePage" class="page-container gh-home"' in src:
    sys.exit("already migrated — refusing to run twice")

# ---------------------------------------------------------------- 1. sprite
SPRITE_ANCHOR = '        <symbol id="i-play" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></symbol>'
NEW_SYMBOLS = SPRITE_ANCHOR + """
        <symbol id="i-hdd" viewBox="0 0 24 24"><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/></symbol>
        <symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></symbol>
        <symbol id="i-more-vertical" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></symbol>
        <symbol id="i-bookmark" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></symbol>
        <symbol id="i-share" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></symbol>
        <symbol id="i-flag" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></symbol>
        <symbol id="i-camera" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></symbol>
        <symbol id="i-video" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></symbol>
        <symbol id="i-mic" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></symbol>
        <symbol id="i-users" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></symbol>
        <symbol id="i-book-open" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></symbol>
        <symbol id="i-heart" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></symbol>
        <symbol id="i-edit" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></symbol>"""
assert src.count(SPRITE_ANCHOR) == 1
src = src.replace(SPRITE_ANCHOR, NEW_SYMBOLS)

# ---------------------------------------------------------------- 2. top nav
TOP_START = '    <div class="top-nav" id="appTopNav" style="display: none;">'
TOP_END = '    <!-- SIDEBAR DRAWER -->'
i, j = src.index(TOP_START), src.index(TOP_END)
NEW_TOP = '''    <header class="top-nav gh-topnav" id="appTopNav" style="display: none;">
        <div class="gh-brand" onclick="HomeUI.go('home')" role="button" tabindex="0"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();HomeUI.go('home');}"
             aria-label="GuardHai — nyumbani">
            <span class="gh-logo" aria-hidden="true"><svg class="ic"><use href="#i-shield-fill"/></svg></span>
            <span class="gh-brand-name">GuardHai</span>
        </div>

        <!-- Order is fixed: Storage, Notifications, Account, More -->
        <div class="gh-top-actions">
            <button type="button" class="gh-icon-btn" onclick="HomeUI.openStorage()" aria-label="Storage" title="Storage">
                <svg class="ic"><use href="#i-hdd"/></svg>
            </button>
            <button type="button" class="gh-icon-btn" onclick="HomeUI.openNotifications()" aria-label="Notifications" title="Notifications">
                <svg class="ic"><use href="#i-bell"/></svg>
                <span class="gh-dot" id="ghNotifDot" aria-hidden="true"></span>
            </button>
            <button type="button" class="gh-icon-btn gh-icon-btn-avatar" onclick="HomeUI.openAccount()" aria-label="Account" title="Account">
                <img id="topNavUserPic" class="gh-avatar" alt="" src="https://ui-avatars.com/api/?name=DR+KAPAMA&background=1565FF&color=fff">
            </button>
            <button type="button" class="gh-icon-btn" id="ghMoreBtn" onclick="HomeUI.toggleMore(event)"
                    aria-label="More" aria-haspopup="true" aria-expanded="false" title="More">
                <svg class="ic"><use href="#i-more-vertical"/></svg>
            </button>
        </div>

        <div class="gh-more-menu" id="ghMoreMenu" role="menu" aria-labelledby="ghMoreBtn">
            <button type="button" class="gh-more-item" role="menuitem" onclick="HomeUI.go('map')">
                <svg class="ic"><use href="#i-map"/></svg> <span data-i18n="nav_map">Ramani</span></button>
            <button type="button" class="gh-more-item" role="menuitem" onclick="HomeUI.closeMore(); toggleSidebar(true);">
                <svg class="ic"><use href="#i-menu"/></svg> <span data-i18n="gh_more_full">Menyu kamili</span></button>
            <div class="gh-more-sep"></div>
            <div class="gh-more-lang">
                <span data-i18n="gh_lang">Lugha</span>
                <div class="gh-lang-seg" id="ghLangSeg">
                    <button type="button" data-lang="sw" onclick="I18N.setLanguage('sw'); HomeUI.syncLang();">SW</button>
                    <button type="button" data-lang="en" onclick="I18N.setLanguage('en'); HomeUI.syncLang();">EN</button>
                </div>
            </div>
            <div class="gh-more-sep"></div>
            <button type="button" class="gh-more-item gh-more-danger" role="menuitem"
                    onclick="HomeUI.closeMore(); handleSignOut();">
                <svg class="ic"><use href="#i-logout"/></svg> <span data-i18n="nav_logout">Ondoka</span></button>
        </div>
    </header>

'''
src = src[:i] + NEW_TOP + src[j:]

# ---------------------------------------------------------------- 3. home page
HOME_START = '    <!-- PAGE 1: HOME COMMAND CENTER -->'
HOME_END = '    <!-- PAGE 2: CHATS -->'
i, j = src.index(HOME_START), src.index(HOME_END)
NEW_HOME = '''    <!-- PAGE 1: HOME -->
    <div id="homePage" class="page-container gh-home">

        <!-- B. Welcome -->
        <section class="gh-welcome">
            <h1 class="gh-welcome-title" data-i18n="gh_welcome">Karibu GuardHai</h1>
            <p class="gh-welcome-sub" data-i18n="gh_welcome_sub">Usalama wako, afya yako, maisha yako.</p>
        </section>

        <!-- B. Safety status — states "not assessed", never claims protection -->
        <section class="gh-card gh-safety" aria-labelledby="ghSafetyTitle">
            <div class="gh-safety-row">
                <span class="gh-safety-ico" aria-hidden="true"><svg class="ic"><use href="#i-shield-check"/></svg></span>
                <div class="gh-safety-text">
                    <div class="gh-safety-label" id="ghSafetyTitle" data-i18n="gh_safety_title">Hali ya usalama</div>
                    <div class="gh-safety-state" data-i18n="gh_safety_unknown">Haijapimwa bado</div>
                    <p class="gh-safety-desc" id="lbl-controller-home-desc" data-i18n="gh_safety_desc">
                        Hakuna huduma ya dharura iliyounganishwa. Kagua mazingira ya kifaa chako.
                    </p>
                </div>
            </div>
            <div class="gh-safety-meta">
                <span class="gh-chip">
                    <span class="gh-chip-k" data-i18n="kpi_protected">Zilizolindwa</span>
                    <b id="kpi-real-device-count">0</b>
                </span>
                <span class="gh-chip" title="Kipimo cha kifaa cha browser, si dhamana ya usalama">
                    <span class="gh-chip-k" data-i18n="gh_risk_index">Kipimo cha hatari</span>
                    <b id="lbl-system-risk-kpi">—</b>
                </span>
            </div>
            <button type="button" class="gh-btn gh-btn-outline gh-btn-block" onclick="HomeUI.reviewSafety()">
                <svg class="ic"><use href="#i-search"/></svg>
                <span data-i18n="gh_safety_cta">Kagua / Sanidi taarifa za usalama</span>
            </button>
        </section>

        <!-- C. SOS — reuses the existing demo handler, labelled as demo -->
        <section class="gh-sos" aria-labelledby="ghSosTitle">
            <button type="button" class="gh-sos-btn" onclick="GHSos.trigger()">
                <span class="gh-sos-ico" aria-hidden="true"><svg class="ic"><use href="#i-siren"/></svg></span>
                <span class="gh-sos-txt">
                    <b id="ghSosTitle">SOS</b>
                    <span data-i18n="gh_sos_text">Dharura</span>
                </span>
            </button>
            <p class="gh-sos-note">
                <svg class="ic" aria-hidden="true"><use href="#i-alert-triangle"/></svg>
                <span data-i18n="gh_sos_demo">Demo — hakuna msaada unaotumwa kwa mtu yeyote.</span>
            </p>
        </section>

        <!-- D. Quick actions -->
        <section class="gh-section">
            <h2 class="gh-section-title" data-i18n="gh_quick">Vitendo vya haraka</h2>
            <div class="gh-qa-grid">
                <button type="button" class="gh-qa" onclick="HomeUI.go('health')">
                    <span class="gh-qa-ico gh-qa-green" aria-hidden="true"><svg class="ic"><use href="#i-heart-pulse"/></svg></span>
                    <span class="gh-qa-label" data-i18n="gh_qa_health">Afya</span>
                </button>
                <button type="button" class="gh-qa" onclick="HomeUI.go('shield')">
                    <span class="gh-qa-ico gh-qa-blue" aria-hidden="true"><svg class="ic"><use href="#i-shield"/></svg></span>
                    <span class="gh-qa-label" data-i18n="gh_qa_shield">Shield</span>
                </button>
                <button type="button" class="gh-qa" onclick="HomeUI.goFind()">
                    <span class="gh-qa-ico gh-qa-blue" aria-hidden="true"><svg class="ic"><use href="#i-search"/></svg></span>
                    <span class="gh-qa-label" data-i18n="gh_qa_find">Tafuta Kifaa</span>
                </button>
                <button type="button" class="gh-qa" onclick="HomeUI.go('map')">
                    <span class="gh-qa-ico gh-qa-gold" aria-hidden="true"><svg class="ic"><use href="#i-map"/></svg></span>
                    <span class="gh-qa-label" data-i18n="gh_qa_map">Ramani</span>
                </button>
                <button type="button" class="gh-qa" onclick="HomeUI.openGuardians()">
                    <span class="gh-qa-ico gh-qa-green" aria-hidden="true"><svg class="ic"><use href="#i-users"/></svg></span>
                    <span class="gh-qa-label" data-i18n="gh_qa_guardians">Walezi</span>
                </button>
                <button type="button" class="gh-qa" onclick="HomeUI.scrollToUwanja()">
                    <span class="gh-qa-ico gh-qa-gold" aria-hidden="true"><svg class="ic"><use href="#i-book-open"/></svg></span>
                    <span class="gh-qa-label" data-i18n="gh_qa_learn">Elimu ya Usalama</span>
                </button>
            </div>
        </section>

        <!-- E + F. Uwanja wa GuardHai -->
        <section class="gh-section" id="ghUwanja" aria-labelledby="ghUwanjaTitle">
            <div class="gh-section-head">
                <div>
                    <h2 class="gh-section-title" id="ghUwanjaTitle" data-i18n="gh_uwanja">Uwanja wa GuardHai</h2>
                    <p class="gh-section-sub" data-i18n="gh_uwanja_sub">Jifunze, shiriki maarifa, saidiana.</p>
                </div>
                <button type="button" class="gh-btn gh-btn-primary gh-compose-btn" onclick="HomeUI.openComposer()">
                    <svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>
                    <span data-i18n="gh_compose">Shiriki Elimu</span>
                </button>
            </div>

            <div class="gh-topics" id="ghTopics" role="group" aria-label="Mada">
                <button type="button" class="gh-topic is-active" data-topic="all" onclick="HomeUI.filterTopic('all', this)" data-i18n="gh_topic_all">Zote</button>
                <button type="button" class="gh-topic" data-topic="people" onclick="HomeUI.filterTopic('people', this)" data-i18n="gh_topic_people">Usalama wa Watu</button>
                <button type="button" class="gh-topic" data-topic="health" onclick="HomeUI.filterTopic('health', this)" data-i18n="gh_topic_health">Afya</button>
                <button type="button" class="gh-topic" data-topic="crime" onclick="HomeUI.filterTopic('crime', this)" data-i18n="gh_topic_crime">Uhalifu na Mali</button>
                <button type="button" class="gh-topic" data-topic="disaster" onclick="HomeUI.filterTopic('disaster', this)" data-i18n="gh_topic_disaster">Ajali na Majanga</button>
                <button type="button" class="gh-topic" data-topic="digital" onclick="HomeUI.filterTopic('digital', this)" data-i18n="gh_topic_digital">Usalama wa Kidijitali</button>
            </div>

            <div class="gh-feed" id="ghFeed"></div>

            <p class="gh-feed-note">
                <svg class="ic" aria-hidden="true"><use href="#i-alert-triangle"/></svg>
                <span data-i18n="gh_feed_note">Machapisho yaliyowekwa "SAMPULI" ni mfano wa UI — hayatoki kwa watumiaji halisi.</span>
            </p>
        </section>
    </div>

'''
src = src[:i] + NEW_HOME + src[j:]

# ---------------------------------------------------------------- 4. bottom nav
BN_START = '    <div class="bottom-nav-wrapper" id="appBottomNav" style="display: none;">'
BN_END = '    <!-- MODAL: SECURITY CHECK DIAGNOSTICS COCKPIT -->'
i, j = src.index(BN_START), src.index(BN_END)
NEW_BN = '''    <!-- G. Bottom navigation: exactly Home, Afya, SOS (raised), Shield, Chat -->
    <nav class="bottom-nav-wrapper" id="appBottomNav" style="display: none;" aria-label="Urambazaji mkuu">
        <div class="bottom-nav-main">
            <div class="nav-tabs-container">
                <button type="button" class="nav-tab-btn active" id="tab-home" onclick="HomeUI.go('home')">
                    <svg class="ic"><use href="#i-home"/></svg>
                    <span class="tab-label" data-i18n="nav_home">Nyumbani</span>
                </button>
                <button type="button" class="nav-tab-btn" id="tab-health" onclick="HomeUI.go('health')">
                    <svg class="ic"><use href="#i-heart-pulse"/></svg>
                    <span class="tab-label" data-i18n="nav_health">Afya</span>
                </button>
                <button type="button" class="nav-sos-slot" id="tab-sos" onclick="GHSos.trigger()"
                        aria-label="SOS — dharura (demo)">
                    <span class="nav-sos-raised">SOS</span>
                </button>
                <button type="button" class="nav-tab-btn" id="tab-shield" onclick="HomeUI.go('shield')">
                    <svg class="ic"><use href="#i-shield"/></svg>
                    <span class="tab-label" data-i18n="nav_shield">Ulinzi</span>
                </button>
                <button type="button" class="nav-tab-btn" id="tab-chat" onclick="HomeUI.go('chat')">
                    <svg class="ic"><use href="#i-message"/></svg>
                    <span class="tab-label" data-i18n="nav_chat">Chat</span>
                </button>
            </div>
        </div>
    </nav>

'''
src = src[:i] + NEW_BN + src[j:]

# ---------------------------------------------------------------- 5. modals + script
SCRIPT_ANCHOR = '    <script src="js/guardhai-app.js"></script>'
MODALS = '''    <!-- HOME REDESIGN: info sheet (storage / notifications / account / guardians / safety) -->
    <div id="ghSheet" class="gh-modal" role="dialog" aria-modal="true" aria-labelledby="ghSheetTitle">
        <div class="gh-modal-card gh-sheet-card">
            <div class="gh-modal-head">
                <b id="ghSheetTitle">GuardHai</b>
                <button type="button" class="gh-modal-x" onclick="HomeUI.closeSheet()" aria-label="Funga">&#10005;</button>
            </div>
            <div class="gh-modal-body" id="ghSheetBody"></div>
        </div>
    </div>

    <!-- HOME REDESIGN: composer (front-end prototype only) -->
    <div id="ghComposer" class="gh-modal" role="dialog" aria-modal="true" aria-labelledby="ghcTitle">
        <div class="gh-modal-card gh-compose-card">
            <div class="gh-modal-head">
                <b id="ghcTitle" data-i18n="ghc_title">Shiriki Elimu</b>
                <button type="button" class="gh-modal-x" onclick="HomeUI.closeComposer()" aria-label="Funga">&#10005;</button>
            </div>
            <div class="gh-modal-body">
                <div class="ghc-note">
                    <svg class="ic" aria-hidden="true"><use href="#i-alert-triangle"/></svg>
                    <span data-i18n="ghc_note">Prototype: chapisho lako linabaki kwenye kifaa hiki. Hakuna kinachotumwa au kuonekana kwa watu wengine.</span>
                </div>

                <label class="ghc-label" data-i18n="ghc_type">Aina ya chapisho</label>
                <div class="ghc-chips" id="ghcTypes" role="group" aria-label="Aina ya chapisho">
                    <button type="button" class="ghc-chip is-active" data-type="elimu" data-i18n="ghc_type_elimu">Elimu</button>
                    <button type="button" class="ghc-chip" data-type="swali" data-i18n="ghc_type_swali">Swali</button>
                    <button type="button" class="ghc-chip" data-type="uzoefu" data-i18n="ghc_type_uzoefu">Uzoefu wa Jamii</button>
                    <button type="button" class="ghc-chip" data-type="taarifa" data-i18n="ghc_type_taarifa">Taarifa ya Taasisi</button>
                    <button type="button" class="ghc-chip" data-type="fursa" data-i18n="ghc_type_fursa">Fursa ya Kusaidia</button>
                </div>

                <label class="ghc-label" for="ghcText" data-i18n="ghc_text">Maelezo</label>
                <textarea id="ghcText" class="ghc-textarea" rows="4" maxlength="600"
                          placeholder="Andika elimu, swali au uzoefu wako…"></textarea>
                <div class="ghc-count"><span id="ghcCount">0</span>/600</div>

                <div class="ghc-two">
                    <div>
                        <label class="ghc-label" for="ghcTopic" data-i18n="ghc_topic">Mada</label>
                        <select id="ghcTopic" class="ghc-select">
                            <option value="people" data-i18n="gh_topic_people">Usalama wa Watu</option>
                            <option value="health" data-i18n="gh_topic_health">Afya</option>
                            <option value="crime" data-i18n="gh_topic_crime">Uhalifu na Mali</option>
                            <option value="disaster" data-i18n="gh_topic_disaster">Ajali na Majanga</option>
                            <option value="digital" data-i18n="gh_topic_digital">Usalama wa Kidijitali</option>
                        </select>
                    </div>
                    <div>
                        <label class="ghc-label" for="ghcAudience" data-i18n="ghc_audience">Watazamaji</label>
                        <select id="ghcAudience" class="ghc-select">
                            <option value="public" data-i18n="ghc_aud_public">Umma (sampuli)</option>
                            <option value="community" data-i18n="ghc_aud_community">Jamii yangu</option>
                            <option value="guardians" data-i18n="ghc_aud_guardians">Walezi pekee</option>
                        </select>
                    </div>
                </div>

                <label class="ghc-label" data-i18n="ghc_media">Viambatisho</label>
                <div class="ghc-media" role="group" aria-label="Viambatisho">
                    <button type="button" class="ghc-media-btn" onclick="HomeUI.mockMedia('photo')"><svg class="ic"><use href="#i-camera"/></svg> <span data-i18n="ghc_photo">Picha</span></button>
                    <button type="button" class="ghc-media-btn" onclick="HomeUI.mockMedia('video')"><svg class="ic"><use href="#i-video"/></svg> <span data-i18n="ghc_video">Video</span></button>
                    <button type="button" class="ghc-media-btn" onclick="HomeUI.mockMedia('audio')"><svg class="ic"><use href="#i-mic"/></svg> <span data-i18n="ghc_audio">Sauti</span></button>
                    <button type="button" class="ghc-media-btn" onclick="HomeUI.mockLink()"><svg class="ic"><use href="#i-link"/></svg> <span data-i18n="ghc_link">Kiungo</span></button>
                </div>
                <p class="ghc-note-sm" data-i18n="ghc_media_note">Upakiaji ni mock-up: hakuna faili linalopakiwa au kuhifadhiwa.</p>
                <ul class="ghc-attachments" id="ghcAttachments"></ul>
            </div>
            <div class="gh-modal-foot">
                <button type="button" class="gh-btn gh-btn-outline" onclick="HomeUI.saveDraft()">
                    <svg class="ic"><use href="#i-bookmark"/></svg> <span data-i18n="ghc_draft">Hifadhi Rasimu</span>
                </button>
                <button type="button" class="gh-btn gh-btn-primary" id="ghcPublish" onclick="HomeUI.publish()">
                    <span data-i18n="ghc_publish">Chapisha</span>
                </button>
            </div>
        </div>
    </div>

    <!-- HOME REDESIGN: toast -->
    <div id="ghToast" class="gh-toast" role="status" aria-live="polite"></div>

'''
src = src.replace(SCRIPT_ANCHOR,
                  MODALS + SCRIPT_ANCHOR + '\n    <script src="js/guardhai-home.js"></script>', 1)

HTML.write_text(src, encoding="utf-8")
print("index.html migrated")
print(f"  size: {len(src)} chars, {src.count(chr(10)) + 1} lines")
for marker in ['gh-home', 'gh-topnav', 'tab-sos', 'ghComposer', 'guardhai-home.js', 'i-more-vertical']:
    print(f"  {marker:22s} {'ok' if marker in src else 'MISSING'}")
