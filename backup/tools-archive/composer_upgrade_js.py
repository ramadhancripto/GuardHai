#!/usr/bin/env python3
"""
Composer upgrade — JS migration for guardhai-prototype/js/guardhai-home.js.

Replaces exactly two regions (feed-card + engagement, and the composer) and
rewrites the sample-post media fields. Everything else — navigation, storage
sheet, account sheet, guardians, more-menu, i18n sync, toast, backdrop wiring,
helpers — is left byte-identical.

Run: python3 tools/composer_upgrade_js.py
"""
import pathlib, sys, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
JS = ROOT / "guardhai-prototype/js/guardhai-home.js"
src = JS.read_text(encoding="utf-8")

if "const GH_MEDIA_RULES" in src:
    sys.exit("already migrated — refusing to run twice")

# =====================================================================  1. samples
OLD_SAMPLES_START = "const GH_SAMPLE_POSTS = ["
OLD_SAMPLES_END = "];\n"
i = src.index(OLD_SAMPLES_START)
j = src.index(OLD_SAMPLES_END, i) + len(OLD_SAMPLES_END)

NEW_SAMPLES = '''/* ---------------------------------------------------------------
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
const GH_SAMPLE_POSTS = ['''

# re-emit the sample array with mediaItems instead of media strings
samples_src = src[i:j]
samples_src = samples_src.replace("const GH_SAMPLE_POSTS = [", "")
samples_src = samples_src.rstrip().rstrip(";").rstrip()
if samples_src.endswith("]"):
    samples_src = samples_src[:-1]
# media: 'photo' -> mediaItems: [{kind:'image', placeholder:true}]
samples_src = re.sub(
    r"media: '(photo|video|link|)'",
    lambda m: ("mediaItems: [{ kind: 'image', placeholder: true }]" if m.group(1) == 'photo' else
               "mediaItems: [{ kind: 'video', placeholder: true }]" if m.group(1) == 'video' else
               "mediaItems: [{ kind: 'link', placeholder: true, url: 'https://guardhai.example/chanzo' }]" if m.group(1) == 'link' else
               "mediaItems: []"),
    samples_src
)
NEW_SAMPLES += samples_src.rstrip() + "\n];\n"

src = src[:i] + NEW_SAMPLES + src[j:]

# =====================================================================  2. feed + engagement
A = src.index("    _postCard(p) {")
B = src.index("    /* ---------- F. composer ---------- */")

NEW_FEED = r'''    /* ---------- E/F. post card ---------- */
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

    _videoKind() {
        return 'video';
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
            : '<span class="gh-badge-sample gh-badge-mine">Yako · haijachapishwa mtandaoni</span>';

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
                <button type="button" class="gh-act" data-act="comment"
                        onclick="HomeUI.comments('${p.id}')" aria-label="Maoni" title="Maoni">
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
                    <div class="gh-post-name">${this._esc(p.author)}${verified}${badge}</div>
                    <div class="gh-post-type">${this._esc(p.accountType)}</div>
                </div>
                ${preview ? '' : `<button type="button" class="gh-post-follow ${following ? 'is-on' : ''}"
                        data-follow-btn
                        onclick="HomeUI.toggleFollow('${p.id}', this)"
                        aria-pressed="${following}">${following ? 'Unafuata' : 'Fuata'}</button>`}
            </div>
            <div class="gh-post-meta">
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

'''

src = src[:A] + NEW_FEED + src[B:]

# =====================================================================  3. composer
C = src.index("    /* ---------- F. composer ---------- */")
D = src.index("    /* ---------- sheet / toast ---------- */")

NEW_COMPOSER = r'''    /* ---------- F. composer (front-end prototype) ---------- */
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
        if (!rule.accept.includes(file.type)) {
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
                const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
                if (blob.size) {
                    const file = new File([blob], 'rekodi-' + Date.now() + '.webm', { type: blob.type });
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
    saveDraft() {
        const form = this._readForm();
        if (!form.text && !form.title) { this.toast('Hakuna cha kuhifadhi bado.'); return; }

        let drafts = [];
        try { drafts = JSON.parse(localStorage.getItem('guardhai_home_drafts') || '[]'); } catch (e) { drafts = []; }
        drafts.unshift({
            id: 'd' + Date.now(),
            title: form.title,
            text: form.text,
            type: form.type,
            topic: form.topic,
            audience: form.audience,
            links: form.mediaItems.filter(m => m.kind === 'link').map(m => m.url),
            // media blobs are intentionally NOT persisted (size/privacy)
            mediaDropped: form.mediaItems.filter(m => m.kind !== 'link').length,
            createdAt: new Date().toISOString()
        });
        try {
            localStorage.setItem('guardhai_home_drafts', JSON.stringify(drafts.slice(0, 20)));
        } catch (e) {
            this.toast('Haikuweza kuhifadhi rasimu kwenye kifaa (storage imejaa).');
            return;
        }

        const dropped = drafts[0].mediaDropped;
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

'''

src = src[:C] + NEW_COMPOSER + src[D:]

# =====================================================================  4. state additions
src = src.replace(
"""    state: {
        helpful: {},
        saved: {},
        following: {},
        topic: 'all',
        myPosts: [],
        composer: { type: 'elimu', attachments: [] }
    },""",
"""    state: {
        helpful: {},
        saved: {},
        following: {},
        expanded: {},
        comments: {},
        topic: 'all',
        myPosts: [],
        composer: { type: 'elimu', attachments: [], errors: [], step: 'edit' }
    },""")

# renderFeed must tolerate the new structures
src = src.replace("const mine = this.state.myPosts;", "const mine = this.state.myPosts;")

JS.write_text(src, encoding="utf-8")
print("guardhai-home.js migrated")
print(f"  {len(src)} chars, {src.count(chr(10)) + 1} lines")
for m in ['GH_MEDIA_RULES', '_mediaHtml', 'postMenu', 'addComment', 'submitReport',
          '_onFiles', 'toggleRecording', 'showPreview', 'composerStep']:
    print(f"  {m:18s} {'ok' if m in src else 'MISSING'}")
