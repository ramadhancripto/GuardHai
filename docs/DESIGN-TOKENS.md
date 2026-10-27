# GuardHai — Design tokens (P1)

`assets/css/00-tokens.css` is the single source of truth for the visual language.
It is loaded **first**, before every other sheet, and it only defines variables
plus three global defaults (font stack, focus ring, icon stroke). No layout
changes unless a rule opts in by using a token, which is why adding it did not
move anything that already worked.

## Why tokens

Before P1 the same green appeared as `#18a982`, `#18A982` and `#17a37c` in
different sheets, radii ranged from 6px to 22px with no rule, and spacing was
hand-picked per component. That made a "small" change to one card visibly
desynchronise the rest of the product. The token file fixes the vocabulary; the
new sheets (`12-posttypes.css`, the P3/P5 additions) are written only in tokens,
and older sheets are migrated where a rule was already being touched.

## Colour

| Token | Value | Meaning (do not repurpose) |
| --- | --- | --- |
| `--gh-green` | `#18A982` | primary: actions, trust, success |
| `--gh-green-ink` | `#0B7A5F` | text on soft green |
| `--gh-green-deep` | `#0E8F6E` | gradient end |
| `--gh-green-soft` | `#EAF6EF` | tinted surface |
| `--gh-blue` | `#2563EB` | secondary: information, health topic |
| `--gh-blue-soft` | `#E9F0FE` | |
| `--gh-amber` | `#B8860B` | institutions, warnings |
| `--gh-amber-soft` | `#FBF3E0` | |
| `--gh-red` | `#DC2626` | **emergency only**: SOS, Majanga, danger |
| `--gh-red-soft` | `#FDEBEA` | |
| `--gh-purple` | `#7C3AED` | education |
| `--gh-purple-soft` | `#F1EBFE` | |
| `--gh-teal` | `#0D9488` | volunteers / Kusaidiana |

Neutrals: `--gh-ink` `#0B1F2A` (headings), `--gh-text` `#16202A` (body),
`--gh-muted` `#6B7C88`, `--gh-faint` `#8A97A1`, `--gh-line` `#E4EFEA`,
`--gh-line-strong` `#CFE0D9`, `--gh-surface` `#FFFFFF`, `--gh-canvas` `#F6FAF8`.

Red is reserved: it never marks a normal post type, and a Majanga post is **not**
an SOS alert. The only red surfaces in the product are the SOS control, the
Majanga badge/tile accent and destructive text.

### Identity surfaces (added by the colour & icon pass)

| Token | Value | Where it may be used |
| --- | --- | --- |
| `--gh-grad-identity` | `linear-gradient(135deg, #0E8F6E 0%, #0F7D8C 48%, #1D5FD1 100%)` | hero overlay family, profile cover, **identity blocks only** |
| `--gh-grad-band` | soft green→blue `linear-gradient(135deg, rgba(234,246,239,.96), rgba(233,240,254,.96))` | page heads (Shield, Map), light identity bands |
| `--gh-grad-band-line` | `#D9EAE4` | hairline around a band |
| `--gh-surface-alt` | `#F3F8F6` | neutral fill behind inputs / chips |

The rule of the system, now enforced by `tests/identity.spec.js`:

* **green** = primary identity, protection, health, life;
* **blue** = secondary, information, digital services;
* **white / `--gh-surface`** = body content, cards, readable text;
* **green→blue gradient** = identity blocks (hero, profile header, page heads);
  never behind paragraph text, never on SOS;
* **red** = emergency only (SOS, Majanga).

Chip colours carry meaning, not decoration:

| Chip | Fill | Ink |
| --- | --- | --- |
| post type | `--gh-type-soft-*` (`health` `#EAF1FE`, `safety` `#E7F6F0`, `disaster` `#FDECEC`, `org` `#FBF1DA`, `learn` `#F0EAFE`, `aid` `#E6F7F5`) | `--gh-type-ink-*` (5.9:1 or better on its fill) |
| topic | `--gh-green-soft` | `--gh-green-ink` (4.8:1) |
| audience / metadata | `--gh-surface-alt` | `--gh-muted` |
| repost attribution | `--gh-blue-soft` | `#1D4ED8` |
| demo / sample | `--gh-red-soft` | `#A11818` |

## Icon system

One family (24×24 sprite symbols in `index.html`, `stroke=currentColor`,
round caps/joins) with a **fixed 5-step size scale** and one stroke weight:

| Token | Size | Used by |
| --- | --- | --- |
| `--gh-icon-xs` | 13px | chips, meta rows |
| `--gh-icon-sm` | 16px | post action rail, menus |
| `--gh-icon-md` | 20px | top-nav actions, search field |
| `--gh-icon-lg` | 22px | bottom navigation |
| `--gh-icon-xl` | 24px | quick actions, topic tiles |
| `--gh-icon-stroke` | 1.9 | every icon ≥14px |
| `--gh-icon-stroke-tiny` | 2.1 | documented optical correction under 14px |

`14-identity.css` re-asserts the stroke over the older per-sheet overrides
(`1.8`, `2`, `2.1`) and sets the four sizes per context, so no new pixel values
are introduced. `tests/identity.spec.js` I6–I9 fail if a sprite reference is
missing, an icon is not square, a size leaves the scale, or the stroke drifts.

## Spacing, radii, type

* `--gh-s1 … --gh-s8` = 4, 6, 8, 10, 12, 16, 20, 24 px.
* `--gh-r-sm 10px`, `--gh-r-md 14px`, `--gh-r-lg 18px`, `--gh-r-xl 22px`,
  `--gh-r-pill 999px`.
* `--gh-fs-micro 9.6`, `caption 10.6`, `small 11.6`, `body 13`, `lead 14`,
  `title 16`, `display 20` px; weights 500 / 600 / 700 / 800.
* `--gh-font` is the single Poppins stack, applied to `body, button, input,
  select, textarea` so form controls cannot drift to the system font.

## Elevation and controls

* `--gh-shadow-1/2/3` for resting, raised and overlay surfaces; `--gh-ring` for
  the focus ring (`box-shadow: var(--gh-ring)` on `:focus-visible`).
* `--gh-tap: 44px` (minimum touch target), `--gh-tap-sm: 36px` (compact controls
  inside cards), `--gh-icon-stroke: 1.9` applied to `.ic` so the one icon family
  keeps one weight everywhere.

## Rules for new work

1. Never introduce a raw colour, radius or font in a new rule — add a token or
   reuse one. The three exceptions are one-off shadows and topic accents that
   already derive from a token (documented in `12-posttypes.css`).
2. Red stays emergency-only.
3. Any control under 44px tall must justify itself; `--gh-tap-sm` is the floor
   for controls that live inside a card.
4. `--gh-icon-*` sizing is per-component but must come from the five-step scale;
   the stroke is global (`--gh-icon-stroke`) with one documented tiny exception.

## Where the tokens are consumed

| Sheet | Scope |
| --- | --- |
| `12-posttypes.css` | post blocks, type badges, composer shortcuts, feed states, topic accents (100% tokens) |
| `14-identity.css` | quick search bar, identity bands, icon scale, chip language, radii pass (100% tokens) |
| `09-profile.css` | contribution strip + topic-chip accents added in P3 |
| all older sheets | unchanged values unless the rule was being edited; `00-tokens.css` is define-only so nothing moved |

Open item: the older sheets still contain hard-coded colours that are numerically
equal to the tokens (`#18A982`, `#94a3b8`…). They render identically; migrating
them is a mechanical follow-up (see `docs/PHASE-P1-P6.md` §"Issues needing
action"), not something to do in a rush before a release.
