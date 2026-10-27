#!/usr/bin/env python3
"""
Composer upgrade — markup migration (guardhai-prototype/index.html).

Replaces the #ghComposer block with the two-step composer (edit → preview),
adds the hidden file inputs and four sprite symbols. Idempotent guard included.

Run: python3 tools/composer_upgrade_html.py
"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = ROOT / "guardhai-prototype/index.html"
src = HTML.read_text(encoding="utf-8")

if 'id="ghcStepEdit"' in src:
    sys.exit("already migrated — refusing to run twice")

# ---------------------------------------------------------------- sprite
SPRITE_ANCHOR = '        <symbol id="i-edit" viewBox="0 0 24 24">'
i = src.index(SPRITE_ANCHOR)
j = src.index("</symbol>", i) + len("</symbol>")
NEW_SYMBOLS = """
        <symbol id="i-image-plus" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></symbol>
        <symbol id="i-refresh" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></symbol>
        <symbol id="i-alert-circle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></symbol>
        <symbol id="i-eye-off" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></symbol>
        <symbol id="i-corner-up-left" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></symbol>"""
src = src[:j] + NEW_SYMBOLS + src[j:]

# ---------------------------------------------------------------- composer
START = '    <!-- HOME REDESIGN: composer (front-end prototype only) -->'
END = '    <!-- HOME REDESIGN: toast -->'
i, j = src.index(START), src.index(END)

NEW_COMPOSER = '''    <!-- HOME REDESIGN: composer v2 (front-end prototype — media stays on this device) -->
    <div id="ghComposer" class="gh-modal" role="dialog" aria-modal="true" aria-labelledby="ghcTitle">
        <div class="gh-modal-card gh-compose-card">

            <div class="gh-modal-head">
                <b id="ghcTitle" data-i18n="ghc_title">Shiriki Elimu</b>
                <div class="ghc-head-tools">
                    <span class="ghc-step" id="ghcStepLabel">1/2</span>
                    <button type="button" class="gh-modal-x" onclick="HomeUI.closeComposer()" aria-label="Funga">&#10005;</button>
                </div>
            </div>

            <!-- STEP 1: EDIT -->
            <div class="gh-modal-body" id="ghcStepEdit">
                <div class="ghc-note">
                    <svg class="ic" aria-hidden="true"><use href="#i-alert-triangle"/></svg>
                    <span data-i18n="ghc_note">Prototype: chapisho lako linabaki kwenye kifaa hiki. Hakuna kinachotumwa au kuonekana kwa watu wengine.</span>
                </div>

                <div class="ghc-draftrow" id="ghcDraftRow" style="display:none;"></div>

                <label class="ghc-label" for="ghcTitleInput" data-i18n="ghc_post_title">Kichwa (hiari)</label>
                <input id="ghcTitleInput" class="ghc-input" type="text" maxlength="120"
                       placeholder="Kichwa kifupi cha chapisho lako">
                <div class="ghc-count"><span id="ghcTitleCount">0</span>/120</div>

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
                            <option value="community" data-i18n="ghc_aud_community">Jamii fulani (sampuli)</option>
                            <option value="guardians" data-i18n="ghc_aud_guardians">Walezi pekee (sampuli)</option>
                        </select>
                    </div>
                </div>

                <label class="ghc-label" data-i18n="ghc_media">Viambatisho</label>
                <div class="ghc-media" role="group" aria-label="Viambatisho">
                    <button type="button" class="ghc-media-btn" onclick="HomeUI.pickMedia('image')">
                        <svg class="ic"><use href="#i-image-plus"/></svg> <span data-i18n="ghc_photo">Picha</span>
                    </button>
                    <button type="button" class="ghc-media-btn" onclick="HomeUI.pickMedia('video')">
                        <svg class="ic"><use href="#i-video"/></svg> <span data-i18n="ghc_video">Video</span>
                    </button>
                    <button type="button" class="ghc-media-btn" onclick="HomeUI.pickMedia('audio')">
                        <svg class="ic"><use href="#i-mic"/></svg> <span data-i18n="ghc_audio">Sauti</span>
                    </button>
                    <button type="button" class="ghc-media-btn" id="ghcRecBtn" onclick="HomeUI.toggleRecording()">
                        <svg class="ic"><use href="#i-radio"/></svg> <span data-i18n="ghc_record">Rekodi</span>
                    </button>
                    <button type="button" class="ghc-media-btn" onclick="HomeUI.focusLink()">
                        <svg class="ic"><use href="#i-link"/></svg> <span data-i18n="ghc_link">Kiungo</span>
                    </button>
                </div>

                <!-- real file inputs (never displayed) -->
                <input type="file" id="ghcFileImage" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>
                <input type="file" id="ghcFileVideo" accept="video/mp4,video/webm,video/ogg" hidden>
                <input type="file" id="ghcFileAudio" accept="audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4" hidden>

                <div class="ghc-linkrow" id="ghcLinkRow">
                    <input type="url" id="ghcLinkInput" class="ghc-input" inputmode="url"
                           placeholder="https://chanzo.example/elimu" aria-label="Kiungo cha chanzo">
                    <button type="button" class="gh-btn gh-btn-outline ghc-linkadd" onclick="HomeUI.addLink()">
                        <svg class="ic"><use href="#i-plus"/></svg>
                    </button>
                </div>

                <p class="ghc-note-sm" data-i18n="ghc_media_note">Faili zinabaki kwenye kifaa hiki — hakuna kinachopakiwa. Picha: JPEG/PNG/WEBP/GIF ≤ 5 MB (max 4). Video: MP4/WEBM/OGG ≤ 50 MB. Sauti: ≤ 15 MB.</p>

                <ul class="ghc-tray" id="ghcAttachments" aria-live="polite"></ul>
                <div class="ghc-errors" id="ghcErrors" role="alert" aria-live="assertive"></div>
            </div>

            <!-- STEP 2: PREVIEW -->
            <div class="gh-modal-body" id="ghcStepPreview" style="display:none;">
                <p class="ghc-preview-hint" data-i18n="ghc_preview_hint">Hivi ndivyo chapisho litakavyoonekana kwenye Uwanja:</p>
                <div id="ghcPreviewHost"></div>
                <div class="ghc-note" style="margin-top:12px;">
                    <svg class="ic" aria-hidden="true"><use href="#i-alert-triangle"/></svg>
                    <span data-i18n="ghc_preview_note">Hakiki: hii ni onyesho la kifaa pekee. Chapisho halitachapishwa mtandaoni.</span>
                </div>
            </div>

            <div class="gh-modal-foot" id="ghcFoot">
                <button type="button" class="gh-btn gh-btn-outline" id="ghcBackBtn" onclick="HomeUI.composerBack()" style="display:none;">
                    <svg class="ic"><use href="#i-corner-up-left"/></svg> <span data-i18n="ghc_back">Rudi</span>
                </button>
                <button type="button" class="gh-btn gh-btn-outline" id="ghcDraftBtn" onclick="HomeUI.saveDraft()">
                    <svg class="ic"><use href="#i-bookmark"/></svg> <span data-i18n="ghc_draft">Hifadhi Rasimu</span>
                </button>
                <button type="button" class="gh-btn gh-btn-outline" id="ghcPreviewBtn" onclick="HomeUI.showPreview()">
                    <svg class="ic"><use href="#i-eye"/></svg> <span data-i18n="ghc_preview">Hakiki</span>
                </button>
                <button type="button" class="gh-btn gh-btn-primary" id="ghcPublish" onclick="HomeUI.publish()">
                    <span data-i18n="ghc_publish">Chapisha</span>
                </button>
            </div>
        </div>
    </div>

'''
src = src[:i] + NEW_COMPOSER + src[j:]
HTML.write_text(src, encoding="utf-8")
print("composer migrated")
print(f"  index.html: {len(src)} chars, {src.count(chr(10)) + 1} lines")
for m in ['ghcStepEdit', 'ghcStepPreview', 'ghcFileImage', 'ghcFileVideo', 'ghcFileAudio',
          'ghcRecBtn', 'i-image-plus', 'i-refresh', 'i-corner-up-left', 'ghcTray' ]:
    print(f"  {m:18s} {'ok' if m in src else 'MISSING'}")
