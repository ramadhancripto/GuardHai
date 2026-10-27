/* ============================================================
   GUARDHAI — HOME SCREEN (2026-10-27)
   Scope: Home screen + its own components only.
   - Reuses existing navigation (switchTab), SOS demo handler,
     RemoteShield.requestNotifications() and handleSignOut().
   - Does NOT touch Firebase, auth, Firestore or other screens.
   - All feed content is clearly marked SAMPULI (sample) in the UI.
   ============================================================ */

/* ---------------------------------------------------------------
   C. SOS — single shared handler (was an inline alert in the markup;
   moved here so the Home button and the bottom-nav button cannot drift).
   Demo only: nothing is dispatched.
   --------------------------------------------------------------- */
const GHSos = {
    trigger() {
        alert(
            'GuardHai DEMO: SOS button pressed.\n\n' +
            'No emergency service was contacted and no alert was sent. ' +
            'SOS dispatch is not connected yet.'
        );
    }
};

/* ---------------------------------------------------------------
   Sample feed data. Everything here is UI sample content.
   `sample: true` renders a visible "SAMPULI" badge and no verified tick.
   --------------------------------------------------------------- */
/* ---------------------------------------------------------------
   Media rules — enforced client-side before anything is previewed.
   NOTE: a backend MUST re-validate these; client checks are advisory only.
   --------------------------------------------------------------- */
const GH_MEDIA_RULES = {
    image: {
        accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        maxBytes: 5 * 1024 * 1024,
        maxCount: 4,
        label: 'Picha'
    },
    video: {
        accept: ['video/mp4', 'video/webm', 'video/ogg'],
        maxBytes: 50 * 1024 * 1024,
        maxCount: 1,
        label: 'Video'
    },
    audio: {
        accept: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a'],
        maxBytes: 15 * 1024 * 1024,
        maxCount: 1,
        label: 'Sauti'
    },
    link: { maxCount: 3, label: 'Kiungo' }
};
const GH_MAX_ATTACHMENTS = 6;

/* ---------------------------------------------------------------
   Sample feed data. Everything here is UI sample content.
   `sample: true` renders a visible SAMPULI badge and no verified tick.
   Media entries are placeholders — they never pretend to be a real file.
   --------------------------------------------------------------- */
const GH_SAMPLE_POSTS = [
    {
        id: 'p1', sample: true,
        author: 'Mtaalamu wa Afya', accountType: 'Mtaalamu · sampuli',
        initials: 'MA', topic: 'health', topicLabel: 'Afya',
        time: 'Saa 2 zilizopita', mediaItems: [{ kind: 'image', placeholder: true }],
        text: 'Kunywa maji ya kutosha na pumzika unapohisi uchovu wa ghafla. ' +
              'Dalili kama kizunguzungu kinachoendelea dakika 10+ zinahitaji msaada wa kliniki, ' +
              'si kupuuza. Hii ni sampuli ya chapisho la elimu.'
    },
    {
        id: 'p2', sample: true,
        author: 'Mkazi wa Kijamii', accountType: 'Mwanajamii · sampuli',
        initials: 'MK', topic: 'crime', topicLabel: 'Uhalifu na Mali',
        time: 'Saa 5 zilizopita', mediaItems: [],
        text: 'Kumbukumbu ya vifaa: andika namba ya serial ya simu na laptop mahali salama. ' +
              'Ikisaidia polisi kuthibitisha umiliki haraka. Sampuli ya chapisho.'
    },
    {
        id: 'p3', sample: true,
        author: 'Mwalimu wa Usalama', accountType: 'Mwanajamii · sampuli',
        initials: 'MU', topic: 'digital', topicLabel: 'Usalama wa Kidijitali',
        time: 'Saa 9 zilizopita', mediaItems: [{ kind: 'link', placeholder: true, url: 'https://guardhai.example/chanzo' }],
        text: 'Usitume PIN au OTP kwa mtu yeyote — hata anayedai kuwa afisa wa benki au kampuni. ' +
              'Hakuna taasisi halali inayoomba OTP kwa simu. Sampuli ya chapisho la elimu.'
    },
    {
        id: 'p4', sample: true,
        author: 'Kikundi cha Majirani', accountType: 'Jamii · sampuli',
        initials: 'KM', topic: 'disaster', topicLabel: 'Ajali na Majanga',
        time: 'Jana', mediaItems: [],
        text: 'Mkutano wa mazoezi ya kukimbia moto: jifunze njia mbili za kutoka nyumbani kwako ' +
              'na mahali pa kukutana nje. Sampuli ya chapisho.'
    },
    {
        id: 'p5', sample: true,
        author: 'Afisa wa Jamii', accountType: 'Taasisi · sampuli',
        initials: 'AJ', topic: 'people', topicLabel: 'Usalama wa Watu',
        time: 'Siku 2 zilizopita', mediaItems: [{ kind: 'video', placeholder: true }],
        text: 'Safari za usiku: mjulishe mtu unayemwamini njia na muda wa kuwasili, ' +
              'na tumia njia zenye watu. Sampuli ya chapisho.'
    }
];

/* ---------------------------------------------------------------
   HOME UI
   --------------------------------------------------------------- */
const HomeUI = {
    state: {
        helpful: {},
        saved: {},
        following: {},
        expanded: {},
        comments: {},
        topic: 'all',
        myPosts: [],
        composer: { type: 'elimu', attachments: [], errors: [], step: 'edit' }
    },

    /* ---------- init ---------- */
    init() {
        this.renderFeed();
        this.syncLang();
        this.wireComposer();
        this.wireBackdrops();
        this._restoreDraftHint();
    },

    /* ---------- navigation (reuses switchTab) ---------- */
    setActiveTab(id) {
        document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
        const el = id && document.getElementById(id);
        if (el) el.classList.add('active');
    },

    go(target) {
        this.closeMore();
        switch (target) {
            case 'home':
                switchTab('home');
                this.setActiveTab('tab-home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
            case 'health':
                // Afya is an existing Shield sub-tab — reused, not duplicated.
                switchTab('shield');
                if (window.ProtectEngine) ProtectEngine.switchSubTab('health');
                this.setActiveTab('tab-health');
                break;
            case 'shield':
                switchTab('shield');
                if (window.ProtectEngine) ProtectEngine.switchSubTab('dashboard');
                this.setActiveTab('tab-shield');
                break;
            case 'chat':
                switchTab('comm');
                this.setActiveTab('tab-chat');
                break;
            case 'map':
                switchTab('map');
                this.setActiveTab(null);   // Map has no bottom-nav slot by design
                break;
            default:
                switchTab('home');
                this.setActiveTab('tab-home');
        }
    },

    goFind() {
        switchTab('shield');
        if (typeof switchShieldPillar === 'function') switchShieldPillar('find');
        this.setActiveTab('tab-shield');
    },

    scrollToUwanja() {
        const el = document.getElementById('ghUwanja');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /* ---------- B. safety review ---------- */
    reviewSafety() {
        const hasCheck = !!(window.ProtectEngine && typeof ProtectEngine.runReal7StepSecurityCheck === 'function');
        this.openSheet('Hali ya usalama', `
            <p class="gh-sheet-p">
                GuardHai <b>haijaunganishwa</b> na huduma yoyote ya dharura, polisi, hospitali au
                walezi. Hakuna hali ya usalama inayopimwa kwa sasa — kwa hiyo app haidai kuwa umelindwa.
            </p>
            <div class="gh-sheet-row"><span>Vifaa vilivyolindwa</span><b>${this._deviceCount()}</b></div>
            <div class="gh-sheet-row"><span>Huduma ya dharura</span><b>Haijaunganishwa</b></div>
            <div class="gh-sheet-row"><span>Arifa za mbali</span><b>Hazijawashwa</b></div>
            <div class="gh-sheet-note">
                <svg class="ic"><use href="#i-alert-triangle"/></svg>
                <span>Ukaguzi wa kifaa unachunguza ishara za browser pekee (mtandao, betri, ruhusa).
                Hauhakiki usalama wa mwili wako.</span>
            </div>
            <div class="gh-sheet-actions">
                ${hasCheck ? '<button type="button" class="gh-btn gh-btn-outline" onclick="HomeUI.closeSheet(); ProtectEngine.runReal7StepSecurityCheck();">Endesha ukaguzi wa kifaa</button>' : ''}
                <button type="button" class="gh-btn gh-btn-primary" onclick="HomeUI.closeSheet(); HomeUI.go('shield');">Fungua Shield</button>
            </div>
        `);
    },

    /* ---------- A. top nav actions ---------- */
    openStorage() {
        const bytes = this._localUsage();
        const rows = this._localKeys().map(k => `
            <div class="gh-sheet-row"><span>${k.key}</span><b>${this._fmtBytes(k.bytes)}</b></div>`
        ).join('') || '<div class="gh-sheet-row"><span>Hakuna data ya GuardHai</span><b>0 B</b></div>';

        this.openSheet('Storage', `
            <p class="gh-sheet-p">Nafasi inayotumiwa na data ya GuardHai <b>kwenye kifaa hiki</b> (localStorage).
            Hakuna faili linalopakiwa kwenye wingu.</p>
            <div class="gh-sheet-row"><span>Jumla</span><b>${this._fmtBytes(bytes)}</b></div>
            ${rows}
            <div class="gh-sheet-note">
                <svg class="ic"><use href="#i-alert-triangle"/></svg>
                <span>Takwimu hizi zinapimwa kutoka kifaa chako — si makadirio ya kubuni.</span>
            </div>
        `);
    },

    openNotifications() {
        const perm = (typeof Notification !== 'undefined' && Notification.permission) ? Notification.permission : 'hapana msaada';
        const canAsk = !!(window.RemoteShield && typeof RemoteShield.requestNotifications === 'function');
        this.openSheet('Notifications', `
            <p class="gh-sheet-p">Arifa halisi za dharura (push/FCM) <b>hazijaunganishwa</b>.
            Unachoweza kufanya ni kuomba ruhusa ya arifa ya browser.</p>
            <div class="gh-sheet-row"><span>Ruhusa ya browser</span><b>${perm}</b></div>
            <div class="gh-sheet-row"><span>Arifa za mbali (FCM)</span><b>Haijaunganishwa</b></div>
            <div class="gh-sheet-note">
                <svg class="ic"><use href="#i-alert-triangle"/></svg>
                <span>Hata ukiruhusu, hakuna arifa ya dharura itakayotumwa — hakuna seva iliyounganishwa.</span>
            </div>
            <div class="gh-sheet-actions">
                ${canAsk ? '<button type="button" class="gh-btn gh-btn-outline" onclick="RemoteShield.requestNotifications();">Omba ruhusa ya browser</button>' : ''}
            </div>
        `);
    },

    openAccount() {
        const name = this._userName();
        this.openSheet('Account', `
            <div class="gh-sheet-row"><span>Jina</span><b id="topNavBrandName">${name}</b></div>
            <div class="gh-sheet-row"><span>Aina ya akaunti</span><b>Demo (haijathibitishwa)</b></div>
            <div class="gh-sheet-row"><span>Uthibitisho</span><b>Hakuna</b></div>
            <div class="gh-sheet-note">
                <svg class="ic"><use href="#i-alert-triangle"/></svg>
                <span>Kuingia ni demo: hali inahifadhiwa kwenye kifaa hiki pekee. Hakuna akaunti halisi.</span>
            </div>
            <div class="gh-sheet-actions">
                <button type="button" class="gh-btn gh-btn-outline" onclick="HomeUI.closeSheet(); toggleSidebar(true);">Fungua menyu</button>
                <button type="button" class="gh-btn gh-btn-danger" onclick="HomeUI.closeSheet(); handleSignOut();">Ondoka</button>
            </div>
        `);
    },

    openGuardians() {
        this.openSheet('Walezi / Guardians', `
            <p class="gh-sheet-p">Walezi <b>hawajaunganishwa</b>. Hakuna orodha ya walezi,
            hakuna uidhinishaji na hakuna arifa inayotumwa kwao.</p>
            <div class="gh-sheet-row"><span>Walezi waliosajiliwa</span><b>0</b></div>
            <div class="gh-sheet-row"><span>Arifa kwa walezi</span><b>Haijaunganishwa</b></div>
            <div class="gh-sheet-note">
                <svg class="ic"><use href="#i-alert-triangle"/></svg>
                <span>Kipengele hiki ni cha prototype. Kinaonekana kwa uwazi ili usidhani
                walezi wanapokea taarifa.</span>
            </div>
            <div class="gh-sheet-actions">
                <button type="button" class="gh-btn gh-btn-outline" onclick="HomeUI.closeSheet(); HomeUI.go('shield');">Fungua Shield</button>
            </div>
        `);
    },

    /* ---------- more menu ---------- */
    toggleMore(ev) {
        if (ev) ev.stopPropagation();
        const menu = document.getElementById('ghMoreMenu');
        const btn = document.getElementById('ghMoreBtn');
        if (!menu) return;
        const open = menu.classList.toggle('open');
        if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
            this.syncLang();
            setTimeout(() => document.addEventListener('click', this._outside = (e) => {
                const m = document.getElementById('ghMoreMenu');
                const b = document.getElementById('ghMoreBtn');
                if (m && !m.contains(e.target) && b && !b.contains(e.target)) this.closeMore();
            }), 0);
        }
    },

    closeMore() {
        const menu = document.getElementById('ghMoreMenu');
        const btn = document.getElementById('ghMoreBtn');
        if (menu) menu.classList.remove('open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        if (this._outside) { document.removeEventListener('click', this._outside); this._outside = null; }
    },

    syncLang() {
        const lang = (window.I18N && I18N.lang) || 'sw';
        document.querySelectorAll('#ghLangSeg button').forEach(b => {
            b.classList.toggle('is-active', b.dataset.lang === lang);
        });
    },

    /* ---------- E. feed ---------- */
    filterTopic(topic, btn) {
        this.state.topic = topic;
        document.querySelectorAll('#ghTopics .gh-topic').forEach(b => b.classList.remove('is-active'));
        if (btn) btn.classList.add('is-active');
        this.renderFeed();
    },

    renderFeed() {
        const host = document.getElementById('ghFeed');
        if (!host) return;

        const mine = this.state.myPosts;
        const all = mine.concat(GH_SAMPLE_POSTS);
        const list = this.state.topic === 'all' ? all : all.filter(p => p.topic === this.state.topic);

        if (!list.length) {
            host.innerHTML = '<div class="gh-feed-empty">Hakuna chapisho kwenye mada hii bado.</div>';
            return;
        }
        host.innerHTML = list.map(p => this._postCard(p)).join('');
    },

    /* ---------- E/F. post card ---------- */
    _esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    _fmtSize(n) {
        if (!n) return '0 B';
        if (n < 1024) return n + ' B';
        if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
        return (n / 1048576).toFixed(1) + ' MB';
    },

    /* media row: real previews for user media, labelled placeholders for samples */
    _mediaHtml(p) {
        const items = p.mediaItems || [];
        if (!items.length) return '';

        const images = items.filter(m => m.kind === 'image');
        const video = items.find(m => m.kind === 'video');
        const audio = items.find(m => m.kind === 'audio');
        const links = items.filter(m => m.kind === 'link');
        let html = '';

        if (images.length) {
            const cls = 'gh-gal gh-gal-' + Math.min(images.length, 4);
            html += '<div class="' + cls + '">' + images.map((m, idx) => {
                if (m.placeholder) {
                    return '<div class="gh-media-ph"><svg class="ic"><use href="#i-image-plus"/></svg>' +
                           '<span>Picha (sampuli)</span></div>';
                }
                return '<button type="button" class="gh-gal-item" onclick="HomeUI.lightbox(\'' + p.id + '\',' + idx + ')" ' +
                       'aria-label="Fungua picha ' + (idx + 1) + '">' +
                       '<img src="' + m.url + '" alt="' + this._esc(m.name || ('Picha ' + (idx + 1))) + '" loading="lazy">' +
                       '</button>';
            }).join('') + '</div>';
        }

        if (video) {
            html += video.placeholder
                ? '<div class="gh-media-ph gh-media-ph-wide"><svg class="ic"><use href="#i-video"/></svg><span>Video (sampuli)</span></div>'
                : '<div class="gh-video-wrap"><video class="gh-video" controls preload="metadata" playsinline src="' +
                  video.url + '"></video></div>';
        }

        if (audio) {
            html += audio.placeholder
                ? '<div class="gh-media-ph"><svg class="ic"><use href="#i-mic"/></svg><span>Sauti (sampuli)</span></div>'
                : '<div class="gh-audio-wrap"><svg class="ic" aria-hidden="true"><use href="#i-volume"/></svg>' +
                  '<div class="gh-audio-meta"><b>' + this._esc(audio.name || 'Sauti') + '</b>' +
                  '<audio controls preload="metadata" src="' + audio.url + '"></audio></div></div>';
        }

        if (links.length) {
            html += links.map(l => '<a class="gh-linkcard" href="' + this._esc(l.url) + '" target="_blank" rel="noopener noreferrer nofollow">' +
                   '<svg class="ic" aria-hidden="true"><use href="#i-link"/></svg>' +
                   '<span class="gh-linkcard-t">' + this._esc(l.title || l.url) + '</span>' +
                   '<svg class="ic gh-linkcard-go" aria-hidden="true"><use href="#i-arrow-right"/></svg></a>').join('');
        }
        return html;
    },

    _postCard(p, opts) {
        opts = opts || {};
        const st = this.state;
        const preview = !!opts.preview;
        const helpful = !!st.helpful[p.id];
        const saved = !!st.saved[p.id];
        const following = !!st.following[p.id];
        const expanded = !!st.expanded[p.id];

        const badge = p.sample
            ? '<span class="gh-badge-sample">Sampuli</span>'
            : '<span class="gh-badge-sample gh-badge-mine">Haijachapishwa mtandaoni</span>';

        const verified = p.verified === true
            ? '<svg class="ic gh-verified" aria-label="Imethibitishwa"><use href="#i-check-circle"/></svg>'
            : '';

        const rawText = String(p.text || '');
        const isLong = rawText.length > 240;
        const shownText = (isLong && !expanded && !preview) ? rawText.slice(0, 240).replace(/\s+\S*$/, '') + '…' : rawText;
        const expandBtn = (isLong && !preview)
            ? '<button type="button" class="gh-moretext" onclick="HomeUI.toggleExpand(\'' + p.id + '\', this)" aria-expanded="' + expanded + '">' +
              (expanded ? 'Punguza' : 'Zaidi') + '</button>'
            : '';

        const titleHtml = p.title ? '<h3 class="gh-post-title">' + this._esc(p.title) + '</h3>' : '';
        const commentCount = (st.comments[p.id] || []).length;
        const commentLabel = commentCount ? 'Maoni (' + commentCount + ')' : 'Maoni';

        const actionRow = preview ? '' : `
            <div class="gh-post-actions">
                <button type="button" class="gh-act ${helpful ? 'is-on' : ''}" data-act="helpful"
                        onclick="HomeUI.toggleHelpful('${p.id}', this)" aria-pressed="${helpful}"
                        aria-label="Imenisaidia" title="Imenisaidia">
                    <svg class="ic"><use href="#i-heart"/></svg><span>Imenisaidia</span>
                </button>
                <button type="button" class="gh-act ${commentCount ? 'has-count' : ''}" data-act="comment"
                        onclick="HomeUI.comments('${p.id}')" aria-label="${commentLabel}" title="${commentLabel}">
                    <svg class="ic"><use href="#i-message"/></svg><span>${commentLabel}</span>
                </button>
                <button type="button" class="gh-act" data-act="share"
                        onclick="HomeUI.share('${p.id}')" aria-label="Shiriki" title="Shiriki">
                    <svg class="ic"><use href="#i-share"/></svg><span>Shiriki</span>
                </button>
                <button type="button" class="gh-act ${saved ? 'is-on' : ''}" data-act="save"
                        onclick="HomeUI.toggleSave('${p.id}', this)" aria-pressed="${saved}"
                        aria-label="Hifadhi" title="Hifadhi">
                    <svg class="ic"><use href="#i-bookmark"/></svg><span>${saved ? 'Imehifadhiwa' : 'Hifadhi'}</span>
                </button>
                <button type="button" class="gh-act gh-act-more" data-act="more"
                        onclick="HomeUI.postMenu('${p.id}', this)" aria-haspopup="menu"
                        aria-expanded="false" aria-label="Vitendo zaidi" title="Vitendo zaidi">
                    <svg class="ic"><use href="#i-more-vertical"/></svg>
                </button>
                <div class="gh-post-menu" id="ghmenu-${p.id}" role="menu">
                    <button type="button" role="menuitem" class="gh-menu-item" onclick="HomeUI.toggleFollow('${p.id}', this)">
                        <svg class="ic"><use href="#i-user"/></svg>
                        <span data-follow-label>${following ? 'Acha kufuata' : 'Fuata mwandishi'}</span>
                    </button>
                    <button type="button" role="menuitem" class="gh-menu-item" onclick="HomeUI.copyLink('${p.id}')">
                        <svg class="ic"><use href="#i-link"/></svg> <span>Nakili kiungo</span>
                    </button>
                    <button type="button" role="menuitem" class="gh-menu-item gh-menu-danger" onclick="HomeUI.report('${p.id}')">
                        <svg class="ic"><use href="#i-flag"/></svg> <span>Ripoti</span>
                    </button>
                </div>
            </div>`;

        return `
        <article class="gh-post" data-post="${p.id}">
            <div class="gh-post-head">
                <span class="gh-post-avatar" aria-hidden="true">${this._esc(p.initials || 'GH')}</span>
                <div class="gh-post-who">
                    <div class="gh-post-name">${this._esc(p.author)}${verified}</div>
                    <div class="gh-post-type">${this._esc(p.accountType)}</div>
                </div>
                ${preview ? '' : `<button type="button" class="gh-post-follow ${following ? 'is-on' : ''}"
                        data-follow-btn
                        onclick="HomeUI.toggleFollow('${p.id}', this)"
                        aria-pressed="${following}">${following ? 'Unafuata' : 'Fuata'}</button>`}
            </div>
            <div class="gh-post-meta">
                ${badge}
                <span class="gh-post-topic">${this._esc(p.topicLabel)}</span>
                <span class="gh-post-time">${this._esc(p.time)}</span>
            </div>
            ${titleHtml}
            <p class="gh-post-text">${this._esc(shownText)}</p>
            ${expandBtn}
            ${this._mediaHtml(p)}
            ${actionRow}
        </article>`;
    },

    toggleExpand(id, btn) {
        this.state.expanded[id] = !this.state.expanded[id];
        const post = this._allPosts().find(p => p.id === id);
        const art = btn.closest('.gh-post');
        if (!post || !art) return;
        const p = art.querySelector('.gh-post-text');
        const raw = String(post.text || '');
        p.textContent = this.state.expanded[id] ? raw : raw.slice(0, 240).replace(/\s+\S*$/, '') + '…';
        btn.setAttribute('aria-expanded', this.state.expanded[id] ? 'true' : 'false');
        btn.textContent = this.state.expanded[id] ? 'Punguza' : 'Zaidi';
    },

    lightbox(id, index) {
        const post = this._allPosts().find(p => p.id === id);
        const images = (post?.mediaItems || []).filter(m => m.kind === 'image' && !m.placeholder);
        if (!images.length) return;
        const img = images[index] || images[0];
        this.openSheet('Picha', `
            <img src="${img.url}" alt="${this._esc(img.name || 'Picha')}"
                 style="width:100%;border-radius:12px;display:block;">
            <p class="gh-sheet-p" style="margin-top:10px;">${this._esc(img.name || '')} ·
               ${this._fmtSize(img.size)} · <b>kwenye kifaa hiki pekee</b></p>
        `);
    },

    _allPosts() {
        return this.state.myPosts.concat(GH_SAMPLE_POSTS);
    },

    _findPost(id) {
        return this._allPosts().find(p => p.id === id);
    },

    /* ---------- engagement ---------- */
    toggleHelpful(id, btn) {
        const on = this.state.helpful[id] = !this.state.helpful[id];
        if (btn) {
            btn.classList.toggle('is-on', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
        this.toast(on ? 'Imenisaidia — imehifadhiwa kwenye kifaa hiki (demo).'
                      : 'Umeondoa alama (demo).');
    },

    toggleSave(id, btn) {
        const on = this.state.saved[id] = !this.state.saved[id];
        if (btn) {
            btn.classList.toggle('is-on', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            const label = btn.querySelector('span');
            if (label) label.textContent = on ? 'Imehifadhiwa' : 'Hifadhi';
        }
        this.toast(on ? 'Imehifadhiwa kwenye kifaa hiki (demo).' : 'Umeondoa kwenye hifadhi (demo).');
    },

    toggleFollow(id, btn) {
        const on = this.state.following[id] = !this.state.following[id];
        const art = btn ? btn.closest('.gh-post') : null;
        if (art) {
            const topBtn = art.querySelector('[data-follow-btn]');
            if (topBtn) {
                topBtn.classList.toggle('is-on', on);
                topBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
                topBtn.textContent = on ? 'Unafuata' : 'Fuata';
            }
            const menuLabel = art.querySelector('[data-follow-label]');
            if (menuLabel) menuLabel.textContent = on ? 'Acha kufuata' : 'Fuata mwandishi';
        }
        this.closePostMenus();
        this.toast(on ? 'Unafuata mwandishi (demo — hakuna seva).' : 'Umeacha kufuata (demo).');
    },

    postMenu(id, btn) {
        const menu = document.getElementById('ghmenu-' + id);
        this.closePostMenus(menu);
        if (!menu) return;
        const open = menu.classList.toggle('open');
        if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    },

    closePostMenus(except) {
        document.querySelectorAll('.gh-post-menu.open').forEach(m => {
            if (m !== except) {
                m.classList.remove('open');
                const b = m.parentElement.querySelector('[data-act="more"]');
                if (b) b.setAttribute('aria-expanded', 'false');
            }
        });
    },

    /* ---------- comments thread (local only) ---------- */
    comments(id) {
        const post = this._findPost(id);
        if (!post) return;
        const thread = this.state.comments[id] || [];
        this._openCommentId = id;

        const rows = thread.length ? thread.map(c => `
            <li class="gh-comment">
                <span class="gh-comment-av" aria-hidden="true">${this._initials(c.author)}</span>
                <div><b>${this._esc(c.author)}</b><span class="gh-comment-time">${this._esc(c.time)}</span>
                <p>${this._esc(c.text)}</p></div>
            </li>`).join('') : '<li class="gh-feed-empty">Hakuna maoni bado. Maoni yako yataonekana hapa.</li>';

        this.openSheet('Maoni', `
            <div class="gh-thread-post">
                <b>${this._esc(post.author)}</b>
                <p>${this._esc(String(post.text || '').slice(0, 120))}${String(post.text || '').length > 120 ? '…' : ''}</p>
            </div>
            <ul class="gh-comments" id="ghCommentList">${rows}</ul>
            <div class="gh-sheet-note">
                <svg class="ic"><use href="#i-alert-triangle"/></svg>
                <span>Maoni yanahifadhiwa <b>kwenye kifaa hiki pekee</b> na haonekani kwa mtu mwingine.
                Hakuna seva ya maoni iliyounganishwa.</span>
            </div>
            <label class="ghc-label" for="ghCommentInput">Andika maoni</label>
            <textarea id="ghCommentInput" class="ghc-textarea" rows="2" maxlength="300"
                      placeholder="Maoni yako…"></textarea>
            <div class="gh-sheet-actions">
                <button type="button" class="gh-btn gh-btn-primary" onclick="HomeUI.addComment()">
                    <svg class="ic"><use href="#i-send"/></svg> Tuma (kifaa hiki)
                </button>
            </div>
        `);
    },

    addComment() {
        const id = this._openCommentId;
        const ta = document.getElementById('ghCommentInput');
        const text = (ta && ta.value || '').trim();
        if (!id || !text) { this.toast('Andika maoni kwanza.'); if (ta) ta.focus(); return; }
        this.state.comments[id] = this.state.comments[id] || [];
        this.state.comments[id].push({ author: this._userName(), text, time: 'Sasa hivi' });
        this.comments(id);                      // re-render the same thread
        const btn = document.querySelector(`.gh-post[data-post="${id}"] [data-act="comment"] span`);
        if (btn) btn.textContent = 'Maoni (' + this.state.comments[id].length + ')';
        this.toast('Maoni yamehifadhiwa kwenye kifaa hiki pekee.');
    },

    /* ---------- share ---------- */
    async share(id) {
        const post = this._findPost(id);
        if (!post) return;
        const url = 'https://guardhai.app/sampuli/' + id;
        const data = {
            title: post.title || 'GuardHai — Uwanja',
            text: String(post.text || '').slice(0, 120),
            url
        };
        if (navigator.share) {
            try {
                await navigator.share(data);
                this.toast('Imeshirkwa kupitia menyu ya kifaa.');
                return;
            } catch (err) {
                if (err && err.name === 'AbortError') return;
                // fall through to copy
            }
        }
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                this.toast('Kiungo kimenakiliwa. Hakuna seva — kiungo ni cha sampuli.');
                return;
            }
            throw new Error('clipboard unavailable');
        } catch (e) {
            this.openSheet('Shiriki', `
                <p class="gh-sheet-p">Kunakili moja kwa moja hakupatikana. Nakili kiungo hiki:</p>
                <input class="ghc-input" readonly value="${url}" onclick="this.select()">
            `);
        }
    },

    copyLink(id) {
        this.closePostMenus();
        this.share(id);
    },

    /* ---------- report ---------- */
    report(id) {
        this.closePostMenus();
        this._reportId = id;
        const reasons = [
            ['harmful', 'Maudhui yasiyofaa au ya hatari'],
            ['false', 'Taarifa isiyo sahihi'],
            ['harass', 'Ubaguzi au unyanyasaji'],
            ['spam', 'Spam au matangazo'],
            ['other', 'Sababu nyingine']
        ];
        this.openSheet('Ripoti maudhui', `
            <p class="gh-sheet-p">Chagua sababu. Ripoti itahifadhiwa <b>kwenye kifaa hiki pekee</b> —
            haitumwi kwa msimamizi kwa sababu hakuna seva ya uidhinishaji.</p>
            <div class="gh-report" role="radiogroup" aria-label="Sababu ya ripoti">
                ${reasons.map(([v, l], i) => `
                    <label class="gh-radio">
                        <input type="radio" name="ghReportReason" value="${v}" ${i === 0 ? 'checked' : ''}>
                        <span>${l}</span>
                    </label>`).join('')}
            </div>
            <label class="ghc-label" for="ghReportNote">Maelezo (hiari)</label>
            <textarea id="ghReportNote" class="ghc-textarea" rows="2" maxlength="300"
                      placeholder="Eleza tatizo…"></textarea>
            <div class="gh-sheet-actions">
                <button type="button" class="gh-btn gh-btn-primary" onclick="HomeUI.submitReport()">Tuma ripoti</button>
                <button type="button" class="gh-btn gh-btn-outline" onclick="HomeUI.closeSheet()">Ghairi</button>
            </div>
        `);
    },

    submitReport() {
        const id = this._reportId;
        const picked = document.querySelector('input[name="ghReportReason"]:checked');
        const note = (document.getElementById('ghReportNote') || {}).value || '';
        if (!picked) { this.toast('Chagua sababu.'); return; }
        let all = [];
        try { all = JSON.parse(localStorage.getItem('guardhai_home_reports') || '[]'); } catch (e) { all = []; }
        all.unshift({ postId: id, reason: picked.value, note: note.trim(), at: new Date().toISOString() });
        try { localStorage.setItem('guardhai_home_reports', JSON.stringify(all.slice(0, 50))); } catch (e) {}
        this.closeSheet();
        this.toast('Ripoti imehifadhiwa kwenye kifaa hiki — haijatumwa kwa msimamizi.');
    },

    /* ---------- F. composer (front-end prototype) ---------- */
    wireComposer() {
        const bindCount = (inputId, countId, max) => {
            const el = document.getElementById(inputId);
            const c = document.getElementById(countId);
            if (!el) return;
            el.addEventListener('input', () => { if (c) c.innerText = el.value.length; });
        };
        bindCount('ghcText', 'ghcCount');
        bindCount('ghcTitleInput', 'ghcTitleCount');

        document.querySelectorAll('#ghcTypes .ghc-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('#ghcTypes .ghc-chip').forEach(c => c.classList.remove('is-active'));
                chip.classList.add('is-active');
                this.state.composer.type = chip.dataset.type;
            });
        });

        const img = document.getElementById('ghcFileImage');
        if (img) img.addEventListener('change', e => this._onFiles(e, 'image'));
        const vid = document.getElementById('ghcFileVideo');
        if (vid) vid.addEventListener('change', e => this._onFiles(e, 'video'));
        const aud = document.getElementById('ghcFileAudio');
        if (aud) aud.addEventListener('change', e => this._onFiles(e, 'audio'));
    },

    openComposer() {
        this.state.composer.attachments = [];
        this.state.composer.errors = [];
        this._renderTray();
        this._renderDraftRow();
        this.composerStep('edit');
        const m = document.getElementById('ghComposer');
        if (m) m.classList.add('open');
        setTimeout(() => { const t = document.getElementById('ghcText'); if (t) t.focus(); }, 160);
    },

    closeComposer() {
        this._stopRecording(true);
        const m = document.getElementById('ghComposer');
        if (m) m.classList.remove('open');
        this.composerStep('edit');
    },

    /* explicit Cancel: never publishes; keeps the text as a device draft so nothing is lost */
    cancelComposer() {
        const at = document.getElementById('ghcAttachments');
        const form = this._readForm();
        const hadContent = !!(form.text || form.title);
        const hadMedia = form.mediaItems.length;
        this._stopRecording(true);

        let saved = false;
        if (hadContent) saved = this._persistDraft(form).ok;

        const ta = document.getElementById('ghcText');
        const ti = document.getElementById('ghcTitleInput');
        if (ta) ta.value = '';
        if (ti) ti.value = '';
        const c1 = document.getElementById('ghcCount'); if (c1) c1.innerText = '0';
        const c2 = document.getElementById('ghcTitleCount'); if (c2) c2.innerText = '0';
        this.state.composer.attachments.forEach(a => {
            if (a.url && a.url.indexOf('blob:') === 0) { try { URL.revokeObjectURL(a.url); } catch (e) {} }
        });
        this.state.composer.attachments = [];
        this.state.composer.errors = [];
        this._renderTray();
        this.closeComposer();

        if (hadContent && saved) this.toast('Umeghairi. Maandishi yamehifadhiwa kama rasimu kwenye kifaa hiki.');
        else if (hadMedia) this.toast('Umeghairi. Viambatisho vimeondolewa — hakuna storage ya media.');
        else this.toast('Umeghairi chapisho.');
    },

    composerStep(step) {
        this.state.composer.step = step;
        const edit = document.getElementById('ghcStepEdit');
        const prev = document.getElementById('ghcStepPreview');
        const back = document.getElementById('ghcBackBtn');
        const draftBtn = document.getElementById('ghcDraftBtn');
        const prevBtn = document.getElementById('ghcPreviewBtn');
        const pubBtn = document.getElementById('ghcPublish');
        const stepLbl = document.getElementById('ghcStepLabel');
        const t = document.getElementById('ghcTitle');

        const isPreview = step === 'preview';
        if (edit) edit.style.display = isPreview ? 'none' : 'block';
        if (prev) prev.style.display = isPreview ? 'block' : 'none';
        if (back) back.style.display = isPreview ? 'inline-flex' : 'none';
        if (draftBtn) draftBtn.style.display = isPreview ? 'none' : 'inline-flex';
        if (prevBtn) prevBtn.style.display = isPreview ? 'none' : 'inline-flex';
        if (stepLbl) stepLbl.textContent = isPreview ? '2/2' : '1/2';
        if (t) t.textContent = isPreview ? 'Hakiki chapisho' : 'Shiriki Elimu';
        if (pubBtn) {
            const label = pubBtn.querySelector('span');
            if (label) label.textContent = isPreview ? 'Chapisha sasa' : 'Chapisha';
        }
        const m = document.getElementById('ghComposer');
        if (m) m.scrollTop = 0;
    },

    composerBack() { this.composerStep('edit'); },

    /* ----- media pick + validation ----- */
    pickMedia(kind) {
        const map = { image: 'ghcFileImage', video: 'ghcFileVideo', audio: 'ghcFileAudio' };
        const el = document.getElementById(map[kind]);
        if (el) { el.value = ''; el.click(); }
    },

    focusLink() {
        const row = document.getElementById('ghcLinkRow');
        const inp = document.getElementById('ghcLinkInput');
        if (row) row.classList.add('is-focus');
        if (inp) { inp.focus(); inp.select(); }
    },

    _onFiles(ev, kind) {
        const files = Array.from(ev.target.files || []);
        if (!files.length) return;
        files.forEach(f => this._addFile(f, kind));
        ev.target.value = '';
        this._renderTray();
    },

    _addFile(file, kind) {
        const rule = GH_MEDIA_RULES[kind];
        const errs = this.state.composer.errors;
        const atts = this.state.composer.attachments;
        const fail = (msg) => { errs.push(msg); this._renderTray(); this._flashErrors(); };

        const sameKind = atts.filter(a => a.kind === kind && a.status !== 'error').length;
        if (sameKind >= rule.maxCount) {
            return fail(`${rule.label}: kiwango cha juu ni ${rule.maxCount} kwa chapisho.`);
        }
        if (atts.length >= GH_MAX_ATTACHMENTS) {
            return fail(`Kiwango cha juu cha viambatisho ni ${GH_MAX_ATTACHMENTS}.`);
        }
        // browsers append codecs to the MIME type (audio/webm;codecs=opus) — compare the base type
        const baseType = String(file.type || '').split(';')[0].trim().toLowerCase();
        if (!rule.accept.includes(baseType)) {
            return fail(`${file.name}: aina "${file.type || 'isiyojulikana'}" hairuhusiwi. Inaruhusiwa: ${rule.accept.join(', ')}.`);
        }
        if (file.size > rule.maxBytes) {
            return fail(`${file.name}: ${this._fmtSize(file.size)} inazidi kikomo cha ${this._fmtSize(rule.maxBytes)}.`);
        }
        if (file.size === 0) {
            return fail(`${file.name}: faili tupu.`);
        }

        const att = {
            id: 'att' + Date.now() + Math.random().toString(36).slice(2, 6),
            kind, name: file.name, size: file.size, type: file.type,
            file, status: 'preparing'
        };
        atts.push(att);
        this._renderTray();

        // real (local) decode step — no network involved
        const url = URL.createObjectURL(file);
        setTimeout(() => {
            att.url = url;
            att.status = 'ready';
            this._renderTray();
        }, 60);
    },

    _removeAttachment(id) {
        const list = this.state.composer.attachments;
        const idx = list.findIndex(a => a.id === id);
        if (idx < 0) return;
        const [att] = list.splice(idx, 1);
        if (att.url) { try { URL.revokeObjectURL(att.url); } catch (e) {} }
        this._renderTray();
    },

    _replaceAttachment(id) {
        const att = this.state.composer.attachments.find(a => a.id === id);
        if (!att) return;
        this._removeAttachment(id);
        this.pickMedia(att.kind);
    },

    addLink() {
        const inp = document.getElementById('ghcLinkInput');
        const errs = this.state.composer.errors;
        const raw = (inp && inp.value || '').trim();
        if (!raw) { errs.push('Weka kiungo kwanza.'); this._renderTray(); this._flashErrors(); return; }

        let url;
        try { url = new URL(raw); } catch (e) {
            errs.push('Kiungo si sahihi. Tumia muundo https://…');
            this._renderTray(); this._flashErrors(); return;
        }
        if (!/^https?:$/.test(url.protocol)) {
            errs.push('Kiungo lazima kianze na http:// au https://');
            this._renderTray(); this._flashErrors(); return;
        }
        const links = this.state.composer.attachments.filter(a => a.kind === 'link');
        if (links.length >= GH_MEDIA_RULES.link.maxCount) {
            errs.push(`Kiungo: kiwango cha juu ni ${GH_MEDIA_RULES.link.maxCount}.`);
            this._renderTray(); this._flashErrors(); return;
        }
        if (this.state.composer.attachments.length >= GH_MAX_ATTACHMENTS) {
            errs.push(`Kiwango cha juu cha viambatisho ni ${GH_MAX_ATTACHMENTS}.`);
            this._renderTray(); this._flashErrors(); return;
        }
        this.state.composer.attachments.push({
            id: 'lnk' + Date.now(), kind: 'link', status: 'ready',
            url: url.href, name: url.hostname + (url.pathname !== '/' ? url.pathname : ''),
            title: url.hostname
        });
        if (inp) inp.value = '';
        this._renderTray();
    },

    clearErrors() {
        this.state.composer.errors = [];
        this._renderTray();
    },

    _flashErrors() {
        const box = document.getElementById('ghcErrors');
        if (!box) return;
        box.classList.remove('flash');
        void box.offsetWidth;
        box.classList.add('flash');
    },

    /* ----- audio recording (only when the browser supports it) ----- */
    toggleRecording() {
        if (this._rec && this._rec.state === 'recording') { this._stopRecording(false); return; }

        if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.state.composer.errors.push('Kurekodi sauti hakupatikani kwenye kifaa hiki. Tumia "Sauti" kuambatisha faili.');
            this._renderTray(); this._flashErrors();
            return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            const chunks = [];
            const rec = new MediaRecorder(stream);
            this._rec = rec;
            this._recStream = stream;
            rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
            rec.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                this._rec = null; this._recStream = null;
                const mime = String(rec.mimeType || 'audio/webm').split(';')[0];
                const blob = new Blob(chunks, { type: mime });
                if (blob.size) {
                    const file = new File([blob], 'rekodi-' + Date.now() + '.webm', { type: mime });
                    this._addFile(file, 'audio');
                }
                this._setRecUI(false);
            };
            rec.start();
            this._setRecUI(true);
        }).catch(() => {
            this.state.composer.errors.push('Ruhusa ya maikrofoni ilikataliwa. Ruhusu kwenye browser au ambatisha faili la sauti.');
            this._renderTray(); this._flashErrors();
        });
    },

    _stopRecording(silent) {
        if (this._rec && this._rec.state === 'recording') this._rec.stop();
        if (this._recStream) this._recStream.getTracks().forEach(t => t.stop());
        this._rec = null; this._recStream = null;
        this._setRecUI(false);
    },

    _setRecUI(on) {
        const btn = document.getElementById('ghcRecBtn');
        if (btn) btn.classList.toggle('is-recording', !!on);
        const lbl = btn && btn.querySelector('span');
        if (lbl) lbl.textContent = on ? 'Simamisha' : 'Rekodi';
    },

    /* ----- attachment tray ----- */
    _renderTray() {
        const host = document.getElementById('ghcAttachments');
        const errBox = document.getElementById('ghcErrors');
        const c = this.state.composer;
        if (errBox) {
            errBox.innerHTML = (c.errors || []).map(e => `
                <div class="ghc-error">
                    <svg class="ic" aria-hidden="true"><use href="#i-alert-circle"/></svg>
                    <span>${this._esc(e)}</span>
                </div>`).join('');
        }
        if (!host) return;

        if (!c.attachments.length) {
            host.innerHTML = '<li class="ghc-tray-empty">Hakuna kiambatisho bado.</li>';
            return;
        }
        host.innerHTML = c.attachments.map(a => {
            const busy = a.status === 'preparing';
            const preview = a.kind === 'image' && a.url
                ? `<img src="${a.url}" alt="${this._esc(a.name)}" class="ghc-thumb">`
                : a.kind === 'video' && a.url
                    ? `<video src="${a.url}" class="ghc-thumb" muted playsinline preload="metadata"></video>`
                    : a.kind === 'audio' && a.url
                        ? `<audio src="${a.url}" controls class="ghc-thumb-audio"></audio>`
                        : `<span class="ghc-thumb-ico"><svg class="ic"><use href="#${a.kind === 'link' ? 'i-link' : a.kind === 'video' ? 'i-video' : a.kind === 'audio' ? 'i-mic' : 'i-image-plus'}"/></svg></span>`;

            const meta = a.kind === 'link'
                ? `<b>${this._esc(a.name)}</b><span>kiungo cha chanzo</span>`
                : `<b>${this._esc(a.name)}</b><span>${this._fmtSize(a.size)} · ${this._esc(a.type || '')}</span>`;

            return `<li class="ghc-att ${busy ? 'is-busy' : ''}">
                ${preview}
                <div class="ghc-att-meta">
                    ${meta}
                    <span class="ghc-att-tag">${busy ? 'Inatayarisha…' : 'Kifaa hiki pekee'}</span>
                </div>
                <div class="ghc-att-actions">
                    ${a.kind === 'link' ? '' : `<button type="button" class="ghc-att-btn" title="Badilisha"
                        aria-label="Badilisha ${this._esc(a.name)}" onclick="HomeUI._replaceAttachment('${a.id}')">
                        <svg class="ic"><use href="#i-refresh"/></svg></button>`}
                    <button type="button" class="ghc-att-btn ghc-att-del" title="Ondoa"
                        aria-label="Ondoa ${this._esc(a.name)}" onclick="HomeUI._removeAttachment('${a.id}')">
                        <svg class="ic"><use href="#i-x"/></svg></button>
                </div>
            </li>`;
        }).join('');
    },

    /* ----- payload ----- */
    _readForm() {
        const get = (id) => document.getElementById(id);
        const topicSel = get('ghcTopic');
        const audSel = get('ghcAudience');
        const typeLabels = {
            elimu: 'Elimu', swali: 'Swali', uzoefu: 'Uzoefu wa Jamii',
            taarifa: 'Taarifa ya Taasisi', fursa: 'Fursa ya Kusaidia'
        };
        const c = this.state.composer;
        return {
            title: (get('ghcTitleInput')?.value || '').trim(),
            text: (get('ghcText')?.value || '').trim(),
            type: c.type,
            topic: topicSel ? topicSel.value : 'people',
            topicLabel: topicSel ? topicSel.options[topicSel.selectedIndex].textContent.trim() : 'Usalama wa Watu',
            audience: audSel ? audSel.value : 'public',
            audienceLabel: audSel ? audSel.options[audSel.selectedIndex].textContent.trim() : 'Umma (sampuli)',
            mediaItems: c.attachments.filter(a => a.status === 'ready').map(a => ({
                kind: a.kind, url: a.url || '', name: a.name, size: a.size, type: a.type,
                title: a.title || a.url
            }))
        };
    },

    _validate(form) {
        const errs = [];
        if (!form.text && !form.title) errs.push('Andika kichwa au maelezo kabla ya kuchapisha.');
        if (form.text.length > 600) errs.push('Maelezo yamezidi herufi 600.');
        if (form.title.length > 120) errs.push('Kichwa kimezidi herufi 120.');
        const busy = this.state.composer.attachments.some(a => a.status === 'preparing');
        if (busy) errs.push('Subiri viambatisho vikamilike.');
        return errs;
    },

    /* ----- preview ----- */
    showPreview() {
        const form = this._readForm();
        const errs = this._validate(form);
        this.state.composer.errors = errs;
        this._renderTray();
        if (errs.length) { this._flashErrors(); this.toast(errs[0]); return; }

        const draftPost = this._buildPost(form);
        const host = document.getElementById('ghcPreviewHost');
        if (host) host.innerHTML = this._postCard(draftPost, { preview: true });
        this.composerStep('preview');
    },

    _buildPost(form) {
        const typeLabels = {
            elimu: 'Elimu', swali: 'Swali', uzoefu: 'Uzoefu wa Jamii',
            taarifa: 'Taarifa ya Taasisi', fursa: 'Fursa ya Kusaidia'
        };
        return {
            id: 'mine-' + Date.now(),
            sample: false,
            author: this._userName(),
            accountType: (typeLabels[form.type] || 'Elimu') + ' · wewe',
            initials: this._initials(this._userName()),
            topic: form.topic,
            topicLabel: form.topicLabel,
            time: 'Sasa hivi',
            title: form.title,
            text: form.text,
            audience: form.audience,
            mediaItems: form.mediaItems
        };
    },

    /* ----- publish ----- */
    publish() {
        const form = this._readForm();
        const errs = this._validate(form);
        this.state.composer.errors = errs;
        this._renderTray();
        if (errs.length) {
            this._flashErrors();
            this.composerStep('edit');
            this.toast(errs[0]);
            return;
        }

        const btn = document.getElementById('ghcPublish');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('is-loading');
            const lbl = btn.querySelector('span');
            if (lbl) lbl.textContent = 'Inaandaa…';
        }

        const post = this._buildPost(form);

        // no network call exists — this is a local commit to the session feed
        setTimeout(() => {
            this.state.myPosts.unshift(post);
            this.state.comments[post.id] = this.state.comments[post.id] || [];

            const ta = document.getElementById('ghcText');
            const ti = document.getElementById('ghcTitleInput');
            if (ta) ta.value = '';
            if (ti) ti.value = '';
            const c1 = document.getElementById('ghcCount'); if (c1) c1.innerText = '0';
            const c2 = document.getElementById('ghcTitleCount'); if (c2) c2.innerText = '0';
            this.state.composer.attachments = [];
            this.state.composer.errors = [];
            this._renderTray();

            if (btn) {
                btn.disabled = false;
                btn.classList.remove('is-loading');
                const lbl = btn.querySelector('span');
                if (lbl) lbl.textContent = 'Chapisha';
            }
            this.closeComposer();

            this.state.topic = 'all';
            document.querySelectorAll('#ghTopics .gh-topic')
                .forEach(b => b.classList.toggle('is-active', b.dataset.topic === 'all'));
            this.renderFeed();
            this.scrollToUwanja();
            this.toast('Imechapishwa kwenye kifaa hiki pekee — haijatumwa mtandaoni (sampuli ya mbele).');
        }, 220);
    },

    /* ----- drafts ----- */
    /* stores text + links only; media blobs are deliberately never persisted */
    _persistDraft(form) {
        let drafts = [];
        try { drafts = JSON.parse(localStorage.getItem('guardhai_home_drafts') || '[]'); } catch (e) { drafts = []; }
        const entry = {
            id: 'd' + Date.now(),
            title: form.title,
            text: form.text,
            type: form.type,
            topic: form.topic,
            audience: form.audience,
            links: form.mediaItems.filter(m => m.kind === 'link').map(m => m.url),
            mediaDropped: form.mediaItems.filter(m => m.kind !== 'link').length,
            createdAt: new Date().toISOString()
        };
        drafts.unshift(entry);
        try {
            localStorage.setItem('guardhai_home_drafts', JSON.stringify(drafts.slice(0, 20)));
        } catch (e) {
            return { ok: false, dropped: 0 };
        }
        this._renderDraftRow();
        return { ok: true, dropped: entry.mediaDropped };
    },

    saveDraft() {
        const form = this._readForm();
        if (!form.text && !form.title) { this.toast('Hakuna cha kuhifadhi bado.'); return; }

        const stored = this._persistDraft(form);
        if (!stored.ok) {
            this.toast('Haikuweza kuhifadhi rasimu kwenye kifaa (storage imejaa).');
            return;
        }
        const dropped = stored.dropped;
        const ta = document.getElementById('ghcText');
        const ti = document.getElementById('ghcTitleInput');
        if (ta) ta.value = '';
        if (ti) ti.value = '';
        const c1 = document.getElementById('ghcCount'); if (c1) c1.innerText = '0';
        const c2 = document.getElementById('ghcTitleCount'); if (c2) c2.innerText = '0';
        this.state.composer.attachments = [];
        this.state.composer.errors = [];
        this._renderTray();
        this.composerStep('edit');
        this.closeComposer();
        this.toast(dropped
            ? `Rasimu imehifadhiwa (maandishi + viungo). Viambatisho ${dropped} havijahifadhiwa — hakuna storage ya media.`
            : 'Rasimu imehifadhiwa kwenye kifaa hiki pekee (localStorage).');
    },

    _drafts() {
        try { return JSON.parse(localStorage.getItem('guardhai_home_drafts') || '[]'); }
        catch (e) { return []; }
    },

    _renderDraftRow() {
        const row = document.getElementById('ghcDraftRow');
        if (!row) return;
        const drafts = this._drafts();
        if (!drafts.length) { row.style.display = 'none'; row.innerHTML = ''; return; }
        row.style.display = 'flex';
        row.innerHTML = `<span>Rasimu zilizohifadhiwa: <b>${drafts.length}</b></span>
            <button type="button" class="ghc-linkbtn" onclick="HomeUI.loadLatestDraft()">Pakia ya mwisho</button>`;
    },

    loadLatestDraft() {
        const drafts = this._drafts();
        if (!drafts.length) { this.toast('Hakuna rasimu iliyohifadhiwa.'); return; }
        const d = drafts[0];
        const ta = document.getElementById('ghcText');
        const ti = document.getElementById('ghcTitleInput');
        if (ta) { ta.value = d.text || ''; ta.dispatchEvent(new Event('input')); }
        if (ti) { ti.value = d.title || ''; ti.dispatchEvent(new Event('input')); }
        const topic = document.getElementById('ghcTopic'); if (topic && d.topic) topic.value = d.topic;
        const aud = document.getElementById('ghcAudience'); if (aud && d.audience) aud.value = d.audience;
        document.querySelectorAll('#ghcTypes .ghc-chip').forEach(c => {
            c.classList.toggle('is-active', c.dataset.type === d.type);
        });
        if (d.type) this.state.composer.type = d.type;
        (d.links || []).forEach(url => {
            this.state.composer.attachments.push({
                id: 'lnk' + Date.now() + Math.random().toString(36).slice(2, 5),
                kind: 'link', status: 'ready', url, name: url.replace(/^https?:\/\//, ''), title: url
            });
        });
        this._renderTray();
        this.toast(d.mediaDropped
            ? `Rasimu imepakiwa. Viambatisho ${d.mediaDropped} havikuwa vimehifadhiwa.`
            : 'Rasimu imepakiwa kwenye kihariri.');
    },

    _restoreDraftHint() {
        let drafts = [];
        try { drafts = JSON.parse(localStorage.getItem('guardhai_home_drafts') || '[]'); } catch (e) { return; }
        if (drafts.length) {
            const note = document.querySelector('.gh-feed-note span');
            if (note && note.textContent.indexOf('Rasimu') === -1) {
                note.textContent = note.textContent + ` (Rasimu ${drafts.length} zimehifadhiwa kwenye kifaa.)`;
            }
        }
    },

    /* ---------- sheet / toast ---------- */
    openSheet(title, html) {
        const t = document.getElementById('ghSheetTitle');
        const b = document.getElementById('ghSheetBody');
        const m = document.getElementById('ghSheet');
        if (!t || !b || !m) return;
        t.innerHTML = title;
        b.innerHTML = html;
        m.classList.add('open');
    },

    closeSheet() {
        const m = document.getElementById('ghSheet');
        if (m) m.classList.remove('open');
    },

    toast(msg) {
        const el = document.getElementById('ghToast');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(this._toastT);
        this._toastT = setTimeout(() => el.classList.remove('show'), 2600);
    },

    wireBackdrops() {
        ['ghSheet', 'ghComposer'].forEach(id => {
            const m = document.getElementById(id);
            if (!m) return;
            m.addEventListener('click', (e) => {
                if (e.target !== m) return;
                if (id === 'ghComposer') this.cancelComposer();
                else m.classList.remove('open');
            });
        });
        // tapping anywhere outside a post action row closes the three-dot menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.gh-post-actions') && !e.target.closest('.gh-post-menu')) this.closePostMenus();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            this.closeSheet();
            const c = document.getElementById('ghComposer');
            if (c && c.classList.contains('open')) this.cancelComposer();
            this.closeMore();
        });
    },

    /* ---------- helpers ---------- */
    _userName() {
        const el = document.getElementById('sidebarUserName') || document.getElementById('topNavBrandName');
        const v = el && el.innerText ? el.innerText.trim() : '';
        return v || 'Wewe';
    },
    _initials(name) {
        return (name || 'GH').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
    },
    _deviceCount() {
        try {
            const d = JSON.parse(localStorage.getItem('guardhai_protected_devices') || '[]');
            return Array.isArray(d) ? d.length : 0;
        } catch (e) { return 0; }
    },
    _localKeys() {
        const out = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k || k.indexOf('guardhai') !== 0) continue;
                out.push({ key: k, bytes: (localStorage.getItem(k) || '').length });
            }
        } catch (e) { /* storage blocked */ }
        return out.sort((a, b) => b.bytes - a.bytes);
    },
    _localUsage() {
        return this._localKeys().reduce((n, r) => n + r.bytes, 0);
    },
    _fmtBytes(n) {
        if (!n) return '0 B';
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / (1024 * 1024)).toFixed(2) + ' MB';
    }
};

window.GHSos = GHSos;
window.HomeUI = HomeUI;

document.addEventListener('DOMContentLoaded', () => HomeUI.init());
