# GuardHai — Chat rebuild, Phase R2

**Delivered on the real project, tested in the browser, nothing deployed.**
Date: 2026-10-31 · Scope: the Chat partition only — inbox, thread, composer, and
the wiring that connects them to the chat store and the bottom navigation.

Companion documents:
- `docs/DESIGN-SYSTEM.md` — GDS v1 tokens and rules (unchanged by this phase).
- `docs/REDESIGN-R1.md` — the phase that rebuilt Shield / SOS / Personal Safety.
- `docs/screens/r2-01…08*.png` — the screenshots of what shipped.

---

## 1. What was wrong, measured at 390 px

| Finding | Evidence (before) |
|---|---|
| Every row's preview was clipped by the right slot | `Nitakuja na orodha ya namba za dharura· · 4 watu` — the time/group suffix ran into the text and the row had no width left |
| Two stacked banners above the list | "Hakuna seva…" panel + "Ujumbe 2 unasubiri…" panel, then a toolbar of 3 buttons and a bare underlined link |
| No quick filters | All / unread / guardian / groups were only reachable by scrolling one long list |
| Thread repeated the app head | `#ghNetTitle` said the person's name (truncated to "Dkt. Neema …"), then `gh-net-convohead` said it again, then a 5-chip tag row pushed the messages down |
| Composer was a form, not a composer | labelled 2-row textarea, Attach + Voice below it, a paragraph about local files, submit button at the bottom of the page — 200 px of dead space above the fold |
| Attachment, voice and delete were not wired | the file input had no `change` handler, voice stored a name without the audio, and `deleteMessage()` in the service had no caller |

## 2. The inbox now

```
status strip (one line)         ← no server · what that means · queued count
[ search… ]  (+)  (groups)
[ Zote 3 ][ Mpya 3 ][ Walezi 2 ][ Vikundi 1 ][ Zilizohifadhiwa ]
┌ Pinned ─────────────────────────────────────────────────┐
│ (DN) Dkt. Neema Mushi  🛡 Sampuli              22:57   │
│      Vizuri. Kama kichwa kinauma, pumzika…        2    │
└─────────────────────────────────────────────────────────┘
```

* One row = **initials avatar · name + flags · one-line preview · time over the
  unread badge**. The right column has a fixed 42 px floor, so it can never eat
  the preview; the preview is a real ellipsis (`text-overflow`), not a cut.
* `Sampuli` is a **word on the name line**, never a colour-only hint, and it no
  longer pushes the name out of shape.
* Filters are a scrollable segmented row with **live counts** and they change the
  list through `chats.filter` → `state.filter.tab` (`all`, `unread`, `guardian`,
  `groups`, `archived`). Each empty state is written for its own filter.
* The status strip states the transport truth **once**: "Hakuna seva
  iliyounganishwa · ujumbe unabaki kwenye kifaa hiki; hakuna anayepokea."
  A queued counter rides the same line instead of opening a second banner.
* Search is a pill that opens `chats.search`; new chat and new group are two
  round buttons next to it — the toolbar and the underlined archive link are gone.

## 3. The thread now — the conversation takes the screen

The section header card (title, subtitle, transport chips, bell, safety) used to
sit above the conversation, so a thread opened under ~350 px of app chrome. In
focus mode that card stands down: the chat owns the screen from the tab strip to
the bottom bar, and the conversation bar carries its own back arrow.

```
┌ (←) (DN) Dkt. Neema Mushi                            (⚙) ┐  ← the whole header
│          Faragha · Sampuli                               │
└──────────────────────────────────────────────────────────┘
  ⚠ Hakuna seva — ujumbe unabaki kwenye kifaa hiki.
  ── Leo ──  (day separator)
  Habari! Umpima shinikizo leo?
  22:50
                        Ndio, 128/82. Nimeandika kwenye rekodi.
                                          22:54  🗑
┌───────────────────────────────────────────────┐
│ (image) (mic)  Andika ujumbe…           (➤)  │   ← sticky, above the SOS button
└───────────────────────────────────────────────┘
  ⓘ Ujumbe na faili huhifadhiwa kwenye kifaa hiki pekee.
```

* The shell title stays **"Mazungumzo"**; the conversation name lives in the
  identity bar, so the name is never truncated into "Dkt. Neema …" twice.
* `#commPage.is-focus` hides `.gh-net-head` for `chats.thread` only. The
  partition tabs stay (they are communication navigation, and every screen still
  needs a way to reach Walezi / Msaada / Jamii without going back first).
* `#ghNetStrip` (the two transport chips) is hidden on the chats partition: the
  inbox strip and the thread banner already state it, in full sentences.
* A locked conversation writes **"Faragha: imefungwa"** in that bar (the privacy
  tag that used to be one of five chips).
* Messages: day separators, consecutive-bubble tightening, sender name only in
  groups, an image rendered from its own blob, a **playable `<audio>`** for a
  voice note, and a delete control on your own messages.
* Composer: auto-growing single-line textarea (`field-sizing`), attach, mic and a
  round send button. It is **sticky above the raised SOS circle**, so it is
  reachable with the thumb at any scroll position.
* When there is room (tablet/desktop, or a tall phone), the transcript is sized
  to the space left under the app chrome and scrolls **inside** the panel — a
  real messenger layout, with a short conversation resting on the composer.
  When there is not, the page scrolls and the composer stays pinned. Both are
  the same markup; the fit is measured in `afterPaint`.
* Wide screens keep the shell's column, so the tab strip and the conversation
  line up; a bubble stops growing at 640 px so a line is never a paragraph.

## 4. Wiring closed in this phase

| Gap | Fix |
|---|---|
| Chat unread never reached the bottom nav | `paintChatBadge()` writes `#tab-chat` → `.nav-chat-badge`, repainted on `MESSAGE_SENT` / `CONVERSATION_CHANGED` |
| Store events repainted in bursts and dropped frames | `schedulePaint()` coalesces a burst into one paint (60 ms), replacing the bare `paint()` subscriptions |
| Opening a thread from any path did not mark it read | `open('chats.thread')` calls `markRead()` — the list, the badge and the shell agree |
| File input had no handler (`chats.attach` never fired) | the change listener now passes `el`, and `chats.attach` validates type/size through `prepareAttachment`, stores the blob and shows a pending card with a thumbnail |
| Attachment was metadata only | `media.blobKey` is stored with the message, so `resolveUrl()` can find the bytes after a reload |
| Voice note lost its audio | the recorder saves the blob to the media repository and the bubble renders `<audio controls>` |
| `deleteMessage()` had no caller | `chats.delete` behind the trash control on your own bubbles |
| Two banners per send | the send action no longer adds a notice: the standing banner + the state chip already say it |

## 5. Honesty rules kept (unchanged)

* A message is `saved` on this device, `queued` for a connection you do not have,
  or `delivered` when a transport really accepted it. No fake double ticks.
* The thread still carries `.gh-net-banner` with "Hakuna seva — ujumbe unabaki
  kwenye kifaa hiki" whenever no transport is connected.
* Chat is not SOS: the inbox says so in one line, above the list.

## 6. Verification

```
python3 tools/verify_app.py                       12/12
bash tools/run_tests.sh 8123                     12 suites · 471 checks · all green
  network.spec.js 65/65 · home 62 · composer 72 · bugfix 23 · profile 20
  showcase 20 · refine 29 · posttypes 33 · hero 23 · identity 25 · health 54 · shield 45
```

Measured at 360 / 390 / 430 / 768 / 1280: `document.scrollWidth - innerWidth = 0`
on every screen (no horizontal overflow), the conversation bar shows the full
name and the full meta line (no ellipsis at 360–430 px), and no page errors or
console errors in any run.

Test contract that had to survive the rebuild: `NC3` (empty text), `NC5` (no
server), `NC6` (`Sampuli`), `NC7` (`.gh-net-row.is-chat` ≥ 3), `NC8`–`NC12`
(`.gh-net-msg`, `.gh-net-bubble p`, `.gh-net-banner`, send + refuse), `NC13`
(reload persistence), `NC14`–`NC16` (settings, pin, privacy tag), `NC58` (every
`data-act` is a known action), `NC59` (every input is labelled).
