/* ==========================================================================
   GuardHai · i18n/i18n.js
   Translation dictionary (sw/en) and the applier for [data-i18n] elements.
   ========================================================================== */
import { Protect } from '../core/capacitor-plugin.js';
import { ProtectEngine } from '../engines/shield/protect-engine.js';

const I18N = {
   lang: localStorage.getItem('guardhai_lang') || 'sw',

    // Kamusi ya Tafsiri ya Swahili na Kiingereza
    translations: {
        sw: {
            // Top Bar & Navigation
            'greeting': 'Asubuhi Njema,',
            'nav_home': 'Nyumbani',
            'nav_comm': 'Soga',
            'nav_shield': 'Ulinzi',
            'nav_map': 'Ramani',
            'nav_logout': 'Ondoka',

            // Home Page
            'hero_title': 'Mfumo Uko Salama',
            'status_active': 'PROTECTION NETWORK ACTIVE',
            'kpi_risk': 'Hali ya Hatari',
            'kpi_safe_zone': 'Eneo Salama',
            'kpi_protected': 'Zilizolindwa',

            // Protect Sub-Tabs
            'tab_dashboard': 'Dashboard',
            'tab_devices': 'Protection Network',
            'tab_health': 'Afya ya Mfumo',
            'tab_layers': 'Layers & Mkakati',
            'tab_rules': 'Maeneo & Sheria',
            'tab_statusmap': 'Ramani ya Eneo',
            'tab_history': 'Kumbukumbu',

            // Buttons
            'btn_add_device': '+ Ongeza Kifaa',
            'btn_run_health': 'Kagua Afya ya Mfumo',
            'btn_continue': 'Endelea',
            'btn_login': 'Ingia Kwenye Akaunti Yako',
            'btn_register': 'Tengeneza Akaunti Mpya',

            // Protection Engine
            'conf_title': 'Protection Confidence Index (Nguvu ya Mfumo)',
            'heartbeat_label': 'Mdundo wa Heartbeat:',

            // ---- HOME REDESIGN (2026-10-27) ----
            'gh_welcome': 'Karibu GuardHai',
            'gh_welcome_sub': 'Usalama wako, afya yako, maisha yako.',
            'gh_safety_title': 'Hali ya usalama',
            'gh_safety_unknown': 'Haijapimwa bado',
            'gh_safety_desc': 'Hakuna huduma ya dharura iliyounganishwa. Kagua mazingira ya kifaa chako.',
            'gh_safety_cta': 'Kagua / Sanidi taarifa za usalama',
            'gh_device_line': 'Kifaa unachotumia:',
            'gh_risk_note': 'Kipimo hiki kinatokana na ishara za kifaa (mtandao, betri, ruhusa) — si tathmini ya usalama wako.',
            'gh_risk_index': 'Kipimo cha hatari',
            'gh_sos_text': 'Dharura',
            'gh_sos_local': 'Hakuna msaada unaotumwa kwa mtu yeyote — simu ndiyo njia pekee.',
            'gh_quick': 'Vitendo vya haraka',
            'gh_qa_health': 'Afya',
            'gh_qa_shield': 'Shield',
            'gh_qa_find': 'Tafuta Kifaa',
            'gh_qa_map': 'Ramani',
            'gh_qa_guardians': 'Walezi',
            'gh_qa_learn': 'Elimu ya Usalama',
            'gh_uwanja': 'Uwanja wa GuardHai',
            'gh_uwanja_sub': 'Jifunze, shiriki maarifa, saidiana.',
            'gh_compose': 'Shiriki Elimu',
            'gh_topic_all': 'Zote',
            'gh_topic_people': 'Usalama wa Watu',
            'gh_topic_health': 'Afya',
            'gh_topic_crime': 'Uhalifu na Mali',
            'gh_topic_disaster': 'Ajali na Majanga',
            'gh_topic_digital': 'Usalama wa Kidijitali',
            'gh_feed_note': 'Machapisho yaliyowekwa "SAMPULI" ni mfano wa UI — hayatoki kwa watumiaji halisi.',
            'gh_more_full': 'Menyu kamili',
            'gh_lang': 'Lugha',
            'nav_health': 'Afya',
            'nav_chat': 'Chat',
            'ghc_title': 'Shiriki Elimu',
            'ghc_note': 'Chapisho lako linabaki kwenye kifaa hiki. Hakuna kinachotumwa; watazamaji ni lebo hadi seva ya jamii itakapounganishwa.',
            'ghc_post_title': 'Kichwa (hiari)',
            'ghc_record': 'Rekodi',
            'ghc_preview': 'Hakiki',
            'ghc_preview_hint': 'Hivi ndivyo chapisho litakavyoonekana kwenye Uwanja:',
            'ghc_preview_note': 'Hakiki: hii ni onyesho la kifaa pekee. Chapisho halitachapishwa mtandaoni.',
            'ghc_back': 'Rudi',
            'ghc_type': 'Aina ya chapisho',
            'ghc_type_elimu': 'Elimu',
            'ghc_type_swali': 'Swali',
            'ghc_type_uzoefu': 'Uzoefu wa Jamii',
            'ghc_type_taarifa': 'Taarifa ya Taasisi',
            'ghc_type_fursa': 'Fursa ya Kusaidia',
            'ghc_text': 'Maelezo',
            'ghc_topic': 'Mada',
            'ghc_audience': 'Watazamaji',
            'ghc_media': 'Viambatisho',
            'ghc_photo': 'Picha',
            'ghc_video': 'Video',
            'ghc_audio': 'Sauti',
            'ghc_link': 'Kiungo',
            'ghc_media_note': 'Faili zinabaki kwenye kifaa hiki — hakuna kinachopakiwa. Picha: JPEG/PNG/WEBP/GIF ≤ 5 MB (max 4). Video: MP4/WEBM/OGG ≤ 50 MB. Sauti: ≤ 15 MB.',
            'ghc_draft': 'Hifadhi Rasimu',
            'ghc_publish': 'Chapisha',
            'ghc_aud_public': 'Umma',
            'ghc_aud_community': 'Jamii fulani',
            'ghc_aud_guardians': 'Walezi pekee'
        },
        en: {
            // Top Bar & Navigation
            'greeting': 'Good Morning,',
            'nav_home': 'Home',
            'nav_comm': 'Chats',
            'nav_shield': 'Shield',
            'nav_map': 'Map',
            'nav_logout': 'Logout',

            // Home Page
            'hero_title': 'All Systems Safe',
            'status_active': 'PROTECTION NETWORK ACTIVE',
            'kpi_risk': 'System Risk',
            'kpi_safe_zone': 'Safe Zone',
            'kpi_protected': 'Protected',

            // Protect Sub-Tabs
            'tab_dashboard': 'Dashboard',
            'tab_devices': 'Protection Network',
            'tab_health': 'Network Health',
            'tab_layers': 'Layers & Strategy',
            'tab_rules': 'Zones & Rules',
            'tab_statusmap': 'Zone Map',
            'tab_history': 'Timeline Log',

            // Buttons
            'btn_add_device': '+ Add Protected Device',
            'btn_run_health': 'Run Health Diagnostics',
            'btn_continue': 'Continue',
            'btn_login': 'Sign In to Dashboard',
            'btn_register': 'Create New Account',

            // Protection Engine
            'conf_title': 'Protection Confidence Index (Overall Guard Strength)',
            'heartbeat_label': 'Heartbeat Pulse:',

            // ---- HOME REDESIGN (2026-10-27) ----
            'gh_welcome': 'Welcome to GuardHai',
            'gh_welcome_sub': 'Your safety, your health, your life.',
            'gh_safety_title': 'Safety status',
            'gh_safety_unknown': 'Not assessed yet',
            'gh_safety_desc': 'No emergency service is connected. Review your device context.',
            'gh_safety_cta': 'Review / Set up safety info',
            'gh_device_line': 'Device in use:',
            'gh_risk_note': 'This index comes from device signals (network, battery, permissions) — not an assessment of your safety.',
            'gh_risk_index': 'Risk index',
            'gh_sos_text': 'Emergency',
            'gh_sos_local': 'No help is sent to anyone — calling is the only working channel.',
            'gh_quick': 'Quick actions',
            'gh_qa_health': 'Health',
            'gh_qa_shield': 'Shield',
            'gh_qa_find': 'Find Device',
            'gh_qa_map': 'Map',
            'gh_qa_guardians': 'Guardians',
            'gh_qa_learn': 'Safety Education',
            'gh_uwanja': 'GuardHai Community',
            'gh_uwanja_sub': 'Learn, share knowledge, help each other.',
            'gh_compose': 'Share Education',
            'gh_topic_all': 'All',
            'gh_topic_people': 'People Safety',
            'gh_topic_health': 'Health',
            'gh_topic_crime': 'Crime & Property',
            'gh_topic_disaster': 'Accidents & Disasters',
            'gh_topic_digital': 'Digital Safety',
            'gh_feed_note': 'Posts marked "SAMPLE" are UI examples — they do not come from real users.',
            'gh_more_full': 'Full menu',
            'gh_lang': 'Language',
            'nav_health': 'Health',
            'nav_chat': 'Chat',
            'ghc_title': 'Share Education',
            'ghc_note': 'Your post stays on this device. Nothing is sent; the audience is a label until the community server is connected.',
            'ghc_post_title': 'Title (optional)',
            'ghc_record': 'Record',
            'ghc_preview': 'Preview',
            'ghc_preview_hint': 'This is how the post will look in the Uwanja feed:',
            'ghc_preview_note': 'Preview: device-only render. The post will not be published online.',
            'ghc_back': 'Back',
            'ghc_type': 'Post type',
            'ghc_type_elimu': 'Education',
            'ghc_type_swali': 'Question',
            'ghc_type_uzoefu': 'Community Experience',
            'ghc_type_taarifa': 'Institution Notice',
            'ghc_type_fursa': 'Opportunity to Help',
            'ghc_text': 'Details',
            'ghc_topic': 'Topic',
            'ghc_audience': 'Audience',
            'ghc_media': 'Attachments',
            'ghc_photo': 'Photo',
            'ghc_video': 'Video',
            'ghc_audio': 'Audio',
            'ghc_link': 'Link',
            'ghc_media_note': 'Files stay on this device — nothing is uploaded. Images: JPEG/PNG/WEBP/GIF ≤ 5 MB (max 4). Video: MP4/WEBM/OGG ≤ 50 MB. Audio: ≤ 15 MB.',
            'ghc_draft': 'Save Draft',
            'ghc_publish': 'Publish',
            'ghc_aud_public': 'Public',
            'ghc_aud_community': 'A specific community',
            'ghc_aud_guardians': 'Guardians only'
        }
    },

    /** translate a key for code that builds HTML strings: t('ghc_publish', 'Chapisha') */
    t(key, fallback) {
        const dict = (this.translations && this.translations[this.lang]) || {};
        const sw = (this.translations && this.translations.sw) || {};
        return dict[key] || sw[key] || fallback || key;
    },

    // Setting ya Kubadilisha Lugha
    setLanguage(lang) {
        this.lang = lang;
        localStorage.setItem('guardhai_lang', lang);

        // Sync zana zote za kuchagua lugha (Select Dropdowns)
        document.querySelectorAll('.lang-toggle').forEach(select => {
            select.value = lang;
        });

        // Badilisha maneno yote yenye 'data-i18n' tag kwenye HTML
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.translations[lang] && this.translations[lang][key]) {
                if (el.tagName === 'INPUT' && el.placeholder) {
                    el.placeholder = this.translations[lang][key];
                } else {
                    el.innerText = this.translations[lang][key];
                }
            }
        });

        // Re-render UI elements
        if (window.ProtectEngine) {
            ProtectEngine.renderDevices();
            ProtectEngine.calculateProtectionConfidence();
        }
    },

    init() {
        this.setLanguage(this.lang);
    }
};

/* REMOTE SHIELD: operational parent controller.
   Channel 1 = Nearby BLE states. Channel 2 = Cloud event persistence + owner notification. */

window.I18N = I18N;
export { I18N };
