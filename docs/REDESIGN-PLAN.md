# GuardHai — Premium life-safety UI & profile redesign
## Change plan (written before any code was edited)

Date: 2026-10-27 · backup: `backup/pre-profile-redesign-20261027T112238Z/` (85 files: `src/`, `assets/`, `index.html`, `tests/`, `tools/`)

---

## A. Audit — every engagement action that exists today

| # | Action | Where | Handler | Stored? |
|---|---|---|---|---|
| 1 | **Imenisaidia** (like) | post card | `data-act="helpful"` → `toggleHelpful()` | yes — IndexedDB `engagement.helpful` |
| 2 | **Maoni** (comment + count) | post card | `data-act="comment"` → `openThread()` / `submitComment()` | yes — `comments` store |
| 3 | **Shiriki** (share) | post card | `data-act="share"` → `share()` (navigator.share → clipboard → sheet) | link built locally |
| 4 | **Hifadhi** (save) | post card | `data-act="save"` → `toggleSave()` | yes — `engagement.saved` |
| 5 | **Vitendo zaidi** (more) | post card | `data-act="more"` → `postMenu()` | — |
| 5a | Fuata / Acha kufuata | more menu **and** header button | `data-menu="follow"`, `data-follow-btn` | yes — `engagement.following` |
| 5b | Nakili kiungo | more menu | `data-menu="copy"` → `copyLink()` | — |
| 5c | Ripoti | more menu → sheet → 5 reasons | `data-menu="report"` → `report()` | yes — `reports` store |
| 6 | Reveal long text (Zaidi/Punguza) | post card | `data-expand` | UI state |
| 7 | Photo lightbox | post card | `data-media` | — |
| 8 | Draft / Preview / Publish | composer | `#ghcDraftBtn`, `#ghcPreviewBtn`, `#ghcPublish` | yes — `drafts` / `posts` |
| 9 | Attachment remove / replace | composer tray | `data-att-remove`, `data-att-replace` | blobs in `media` |
| 10 | Follow from profile | *did not exist* | — | — |

**Conclusion:** nothing has been deleted. All five card actions and the three menu
actions are present in `src/features/feed/post-card.js`. In the last build the
comment / share / save buttons render **icon-only** (their text spans are empty
until there is a count), which reads as if they had disappeared. That is the
visual bug this pass fixes: icons stay, and every action gets a visible,
consistent shape with an accessible label and a tooltip.

## B. Files to change

| File | Change |
|---|---|
| `src/domain/profile.js` | **new** — roles catalogue, multi-role rules, split licence/institution verification, badge calculation |
| `src/data/profiles.js` | **new** — five sample personas (member, health, safety, organisation, volunteer), all `sample: true` |
| `src/data/profiles.repo.js` | **new** — local profile persistence |
| `src/data/db.js` | add `profiles` store, bump schema to v2 |
| `src/data/engagement.repo.js` | replies (`parentId`), follow-by-author helpers |
| `src/domain/comment.js` | `parentId` + reply validation |
| `src/services/profile.service.js` | **new** — get/list/update profile, posts by author, follow, message (honest: not connected) |
| `src/features/profile/profile-view.js` | **new** — profile sheet: cover accent per role, avatar ring, badges, bio, topics, tabs, actions |
| `src/features/profile/profile-edit.js` | **new** — edit own profile (name, bio, topics, multi-role), verification request (pending, no fake grant) |
| `src/features/feed/post-card.js` | role accent on avatar, author → profile, icon system for actions, *Tuma kwa mtu* item, reply affordance |
| `src/features/feed/feed-view.js` | pass role/profile data into cards, open profile from feed |
| `src/features/engagement/engagement-actions.js` | send-to-person, open profile |
| `src/features/engagement/comment-thread.js` | threaded replies (one level), author profiles |
| `src/features/home/home-controller.js` | profile gestures, `HomeUI.profile()` bridge, sidebar entry |
| `src/features/home/home-sheets.js` | account sheet → “Fungua wasifu wangu” |
| `src/i18n/i18n.js` | new sw/en keys (roles, verification, profile actions) |
| `index.html` | brand line, profile mounts, any missing sprite symbols |
| `assets/css/09-profile.css` | **new** — profile + engagement visuals (loaded last) |
| `assets/css/04-home.css` | small token additions (role accents), no old rule removed |
| `tests/profile.spec.js` | **new** — role presentation, verification honesty, profile actions |
| `tests/home.spec.js`, `tests/composer.spec.js` | update selectors that gain labels/icons |
| `tools/verify_app.py` | CSS parts 8 → 9, plus new checks (roles, verification, icons) |
| `docs/*` | this plan, architecture, test log |

## C. What is preserved (non-negotiable)

* Every action in the audit table above — same handler names, same storage.
* Bottom navigation: Home, Afya, SOS, **Shield**, Chat — five items, SOS central and red.
* Shield, communication, map, health sub-tabs and their engines — untouched.
* Composer capabilities: text, title, 5 post types, topic, audience, up to 4 images,
  1 video, 1 audio + microphone recording, up to 3 links, preview step, drafts,
  validation messages, loading/success/error states.
* All 65 inline `onclick` handlers (bridged), 85 i18n keys, 284 element ids.
* Sample posts keep the **Sampuli** badge; no verification tick without evidence.

## D. What is new

1. **Role-aware identity** — five personas with their own accent, icon and cover:
   * Mwanajamii (`i-user`, emerald)
   * Mtaalamu wa Afya (`i-heart-pulse`, blue)
   * Mtaalamu wa Usalama (`i-shield-check`, indigo/violet)
   * Taasisi (`i-building`, gold)
   * Kujitolea (`i-users`, teal)
2. **Profile sheet** — cover, avatar with role ring, badges, bio, topic chips,
   post list, Follow, Message (honest “not connected”), Share, Report.
3. **Verification split** — `licence` (professional body) and `institution`
   (organisation) are separate objects with separate evidence. A role selection
   alone never produces a badge; the UI shows *Inasubiri uthibitisho* until
   evidence is recorded by a verifier.
4. **Multi-role** — a profile can hold several roles; the primary one drives the
   accent, the rest render as chips.
5. **Engagement polish** — icon + label buttons with 44px targets, consistent
   20px glyphs, active states, tooltips, and a *Tuma kwa mtu* entry that only
   appears when `navigator.share` exists.
6. **Comment replies** — one level of threading, stored with `parentId`.

## E. Honesty rules this pass must keep

* No verification badge from a self-selected role — ever.
* Sample personas are labelled `Sampuli`; they are not real practitioners.
* “Message” is shown as unavailable with the reason (no messaging backend), not
  as a fake chat.
* SOS still states that nothing is dispatched.
* Counts render only from stored rows (`visibleCount`).

## F. Test plan

| Suite | Added checks |
|---|---|
| `tests/profile.spec.js` (new) | 6 personas present, distinct accents/icons, licence ≠ institution, no badge without evidence, follow persists, profile opens from feed, message states not connected |
| `tests/home.spec.js` | feed still 5 sample posts + labels, action row still has 5 actions |
| `tests/composer.spec.js` | unchanged contract, `Tuma` item gated on `navigator.share` |
| `tests/bugfix.spec.js` | nav order, SOS honesty, ids, overflow |
| `tools/verify_app.py` | 9 CSS parts, role catalogue completeness, verification helper present, no badge-from-role regex, icons exist in sprite |
