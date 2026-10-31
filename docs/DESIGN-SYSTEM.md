# GDS v1 — GuardHai Design System

**"Calm Signal."** Light by default; colour carries meaning; every status is a
sentence; nothing decorative is allowed to look like proof.

Implemented in `assets/css/17-system.css` (750 lines, namespaced `gds-`) and
`src/features/shield/shield-ui.js` (204 lines of primitives that emit only GDS
classes). It is loaded after every legacy sheet so it can override, and it never
requires a legacy class.

---

## 1. Principles

| # | Principle | What it means in code |
|---|---|---|
| 1 | **Honest by construction** | A green chip is only rendered when a real check returned true. No "engine running", no confidence score, no fake ticks. |
| 2 | **One colour = one meaning** | green = passed / on · blue = reference & health · amber = not connected / sample · red = emergency only. Never decorative. |
| 3 | **Legible before pretty** | Body 14 px, secondary 12.6 px, floor 11.6 px. Nothing below that. Tabular figures for numbers. |
| 4 | **One tap, one target** | 44 px minimum (36 px for in-card compact). Icon-only buttons always carry `aria-label`. |
| 5 | **Light, calm surfaces** | White cards on `#F7FAF9`, hairline borders, one soft shadow. Dark panels are only allowed where the legacy engine owns the screen (Device Protection). |
| 6 | **Motion is a courtesy** | 180 ms `--gds-ease`, entry only, all of it disabled under `prefers-reduced-motion`. |
| 7 | **Mobile first, desktop intentional** | 1 column ≤ 720 px, 2 columns ≥ 720 px, dashboard split ≥ 900 px, max 1240 px. |

---

## 2. Tokens

```css
/* ground */
--gds-canvas #F7FAF9   --gds-surface #FFFFFF   --gds-surface-2 #F2F7F5
--gds-line #E3EDE9     --gds-line-soft #EEF5F2
--gds-ink #0A1F2A      --gds-text #22323D      --gds-muted #64757F   --gds-faint #8B9AA3

/* meaning */
--gds-green #0F8A6A   --gds-green-ink #07604A   --gds-green-soft #E8F5EF
--gds-blue  #1B54C8   --gds-blue-ink  #173F94   --gds-blue-soft  #EAF1FD
--gds-red   #C42020   --gds-red-ink   #8E1414   --gds-red-soft   #FDEDEC
--gds-amber #8A5B00   --gds-amber-soft #FBF3E0

/* geometry */
--gds-r-sm 12  --gds-r-md 18  --gds-r-lg 24  --gds-r-pill 999
--gds-shadow:      0 1px 2px rgba(9,30,46,.04), 0 14px 28px -24px rgba(9,30,46,.45)
--gds-shadow-lift: 0 2px 4px rgba(9,30,46,.05), 0 18px 34px -22px rgba(9,30,46,.40)

/* type */
--gds-fs-display 30  --gds-fs-h1 22  --gds-fs-h2 17  --gds-fs-h3 15
--gds-fs-body 14     --gds-fs-sm 12.6  --gds-fs-xs 11.6   --gds-lh 1.5

/* rhythm (4 pt) */
--gds-1 4  --gds-2 8  --gds-3 12  --gds-4 16  --gds-5 20  --gds-6 24  --gds-7 32  --gds-8 40

/* motion */
--gds-ease cubic-bezier(.22,.61,.36,1)   --gds-dur 180ms
--gds-tap 44px
```

**Contrast (measured on the shipped pairs)**

| pair | ratio | use |
|---|---|---|
| `--gds-ink` on white | 15.9 : 1 | headings |
| `--gds-text` on white | 11.4 : 1 | body |
| `--gds-muted` on white | 4.9 : 1 | secondary (≥ 12.6 px, never for the only copy of a fact) |
| `--gds-green-ink` on green-soft | 5.6 : 1 | "passed" chip |
| `--gds-red-ink` on red-soft | 6.4 : 1 | emergency copy |
| white on `--gds-green` | 3.4 : 1 | **filled buttons only** (≥ 15 px bold), never body text |
| white on `--gds-red` | 5.1 : 1 | SOS |

---

## 3. Components

Every component below exists in `17-system.css` and has a builder in
`shield-ui.js` when it is used by a screen.

### Layout
| Class | Purpose |
|---|---|
| `.gds-page` | the only page container: max width, rhythm, bottom safe area for the nav |
| `.gds-stack` `is-tight` `is-loose` | vertical rhythm |
| `.gds-grid` `is-2` `is-mobile-2` | 1 column, 2 columns ≥ 720 px, dash split ≥ 900 px |
| `.gds-sect` + `.gds-eyebrow` `.gds-sect-title` `.gds-sect-sub` | section header with an optional kicker |

### Navigation
| Class | Purpose |
|---|---|
| `.gds-head` `.gds-head-mark` `.gds-head-title` `.gds-head-sub` `.gds-head-actions` | the page head band (identity gradient) |
| `.gds-back` | 38 px back target, always paired with the head |
| `.gds-tabs` `.gds-tab[aria-selected]` | horizontal section strip inside a section; scrolls the active tab into view, arrow keys supported |
| bottom nav | unchanged (5 slots + raised SOS) — it *is* the product's identity |

### Cards & rows
`.gds-card` (`is-emergency` `is-info` `is-quiet` `is-flush`) · `.gds-card-head`
· `.gds-card-title` · `.gds-card-sub` · `.gds-card-body` · `.gds-card-foot`
`.gds-rows` · `.gds-row` (`is-static` `is-tall`) · `.gds-row-title` · `.gds-row-note`
· `.gds-row-right` · `.gds-tilecard` (dashboard module tile) · `.gds-tile`
(`is-blue` `is-red` `is-amber` `is-muted` `is-sm`).

### Data
`.gds-chip` (`is-ok` `is-info` `is-warn` `is-danger` `is-muted`) ·
`.gds-stats` `.gds-stat-value` `.gds-stat-label` `.gds-stat-note` ·
`.gds-meter` `.gds-meter-fill` · `.gds-table` · `.gds-timeline` `.gds-tl` ·
`.gds-avatar`.

### Controls
`.gds-btn` (`is-primary` `is-blue` `is-danger` `is-danger-soft` `is-ghost`
`is-sm` `is-block`) · `.gds-btnrow` · `.gds-field` `.gds-label` `.gds-input`
`.gds-select` `.gds-textarea` `.gds-hint` `.gds-error` · `.gds-switch[role=switch]`.

### States
`.gds-empty` (icon tile + title + one honest sentence + optional action) ·
`.gds-alert` (`is-info` `is-warn` `is-danger` `is-ok`) ·
`.gds-skeleton` (shimmer, disabled under reduced motion) · `#shieldStage[aria-busy]`.

### Emergency
`.gds-emergency` · `.gds-call` (64 px tap-to-call row, number in tabular 22 px) ·
`.gds-mode` (two-mode chooser, `is-active` ring).

### Honesty
`.gds-ledger` — the dashed strip that states where the data lives and what is
not connected. Used at the bottom of Shield, SOS and Chat. It is not decoration:
each chip is read from `transportStatus()` / `navigator` at paint time.

---

## 4. Composition rules

1. **One primary action per screen.** Everything else is `is-outline` or `is-ghost`.
2. **A section may not begin with a card.** Section header first, then the card.
3. **Never nest two bands** (`.gds-head`) inside one screen; a sub-screen gets one
   head, not a head plus a section band.
4. **Numbers are left-aligned in stats, right-aligned in tables.** Both tabular.
5. **Any list longer than 6 rows moves behind a section, not into a card grid.**
6. **Red appears at most once per screen** outside a real emergency state.
7. **Copy is Swahili-first**, English through `L(sw, en)`; the screen re-renders
   on `guardhai:lang`.
8. **A status chip never travels alone**: it sits next to the sentence that
   explains it (`row.title` + `row.note` + chip).

---

## 5. Accessibility contract

- Focus: one ring (`box-shadow: var(--gh-ring)`), visible on keyboard only.
- Keyboard: tab strips respond to ← → Home End; every action is a `<button>`.
- Labels: every input has a `<label for>`; every icon-only control has `aria-label`.
- Live regions: `#shieldLive` (`role="status" aria-live="polite"`) announces the
  result of an action; `#shieldStage[aria-busy]` marks a repaint.
- Switches: `role="switch"` + `aria-checked`, disabled ones carry a visible reason
  in the row note (never just a grey switch).
- Motion: `prefers-reduced-motion` removes every transition and the shimmer.
- Touch: 44 px target, 32 px floor for in-card controls (checked by SC40).

---

## 6. Migration status

| Surface | Language | Note |
|---|---|---|
| Shield Center (7 sections) | **GDS** | new in R1 |
| SOS page | **GDS** | new in R1 |
| Personal Safety (7 screens) | **GDS** | new in R1 |
| Device Protection console | legacy + GDS frame | preserved by decision (brief §4) |
| Chat / Network | `gh-net-*` | previous phase, honest & consistent; migrates next |
| Health | `gh-health-*` | previous phase; migrates next |
| Home / Feed / Profile / Composer | mixed `gh-*` | migrates last (largest, most tested) |

A surface migrates whole: markup, CSS and its suite together. Legacy classes are
never reused by new code, so the old sheets can be deleted one at a time when
their last consumer moves.
