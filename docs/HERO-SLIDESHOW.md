# GuardHai — Home hero slideshow

The Home hero already existed (`index.html` → `section.gh-hero`). It was upgraded
in place: one photo became five, driven by
`src/features/hero/hero-slideshow.js` and `assets/css/13-hero.css`. No second hero
was created and nothing else on Home moved.

## How it works

```
index.html  .gh-hero[data-hero-slideshow]
  ├── .gh-hero-media        (aria-hidden — five .gh-hero-slide children)
  │     ├── .gh-hero-slide.is-active > img (eager, the only <img> in the markup)
  │     └── 4 × .gh-hero-slide[data-src]   (image created on demand)
  ├── .gh-hero-inner        (title / subtitle / description / meta / chip)
  └── .gh-hero-controls     (pause toggle + one dot per slide)
```

* **The markup owns the slide list.** The module reads `[data-hero-slide]` and
  builds the dots from it, so there is no second copy of the photo list to drift.
* **Only classes change between photos.** `goTo()` toggles `.is-active` on the
  slides and `aria-current` on the dots. The headline, subtitle, description,
  SOS button and layout are never re-rendered — verified by rect comparison in
  `tests/hero.spec.js` (H8).
* **Rotation** runs on a 6 s interval (`HERO_INTERVAL`) and wraps
  (`goTo(index + 1)`, modulo the slide count), so slide 5 → slide 1.
* **Crossfade** is a 0.9 s CSS opacity transition on `.gh-hero-slide`; no slide
  is ever removed from the DOM, so no layout shift and no flash.
* **Pause** — pressing the control, picking a dot, or turning the tab hidden stops
  the timer; the pause button flips `aria-pressed` and swaps the play/pause icon.

## Photos

| # | Theme | File | Source |
| --- | --- | --- | --- |
| 1 | Community health workers | `assets/img/hero-community.jpg` | existing asset |
| 2 | Emergency services & rescue | `assets/img/hero-rescue.jpg` | new (local, 1600×900, ~185 KB) |
| 3 | Health, prevention, clinical care | `assets/img/post-clinic.jpg` | existing asset (also used by a demo post) |
| 4 | Community mutual aid | `assets/img/post-volunteers.jpg` | existing asset |
| 5 | Safety and emergency preparedness | `assets/img/hero-preparedness.jpg` | new (local, 1600×900, ~244 KB) |

All five are **local files** — no CDN, no hotlink, nothing that can disappear. They
show people being helped, trained or treated; no injuries, no gore, no one used as
decoration. The two new files were generated for this project and are committed as
ordinary JPEGs under `assets/img/`.

## Performance

* The first photo is the only `<img>` in the HTML (`loading="eager"`,
  `fetchpriority="high"`) so the hero paints immediately.
* Photos 2–5 live in `data-src` and are created by JS: the **next** slide is
  prefetched in `requestIdleCallback`, and the target plus one ahead are ensured
  on every `goTo()`. Five photos are never requested at once (test H4).
* A slide whose image fails gets `.is-failed`, the `<img>` is removed and that
  slide's own gradient shows — never a broken-image icon (test H16).

## Accessibility

* `.gh-hero-media` is `aria-hidden="true"`; the images carry `alt=""` because the
  copy above them carries the meaning.
* Dots are real buttons with `aria-label="Picha N kati ya 5: …"` and
  `aria-current="true"`; the pause control is a toggle with a Swahili label.
* Nothing is announced every 6 seconds (no live region), so screen readers are
  not interrupted.
* `prefers-reduced-motion: reduce` → the rotation never starts, transitions are
  removed, and the reader can still pick a photo with the dots (tests H20–H21).
* `visibilitychange` pauses while the tab is hidden and resumes on return
  (tests H14–H15).
* Contrast: a two-layer scrim (left-weighted + bottom floor) sits above the photos
  and below the copy, so white text stays legible on all five images.

## Copy

| Line | Swahili | English (`i18n`) |
| --- | --- | --- |
| Title | Tayari kwa dharura? | Ready for an emergency? |
| Subtitle | Tuungane kulinda maisha. | Together we protect lives. |
| Description | Msaada unapohitajika, kila sekunde ina maana. Jiandae leo kwa usalama wa kesho. | When help is needed, every second counts. Prepare today for the safety of tomorrow. |

The meta strip (`Taarifa sahihi • Hatua za haraka • Jamii imara`) and the brand chip
are hidden below 620 px so the three required lines get the full width on a phone.

## Responsive heights

| Viewport | Hero height | Notes |
| --- | --- | --- |
| ≤ 359 px | 244 px | description hidden, single-line labels |
| 360–619 px | 232 px | mark + meta hidden, copy full width, controls top-right |
| ≥ 620 px | 288 px | controls bottom-right, copy centred vertically |
| ≥ 1024 px | 332 px | larger type, copy capped at 44ch |

## Tests

`tests/hero.spec.js` — 23 checks (`K` section in `docs/TEST-LOG.md`): structure,
deferred loading, exact copy, real 6-second advance, looping, copy stability,
crossfade, dots, pause, hidden-tab, reduced motion, missing-photo fallback, SOS and
navigation intact, and 320/390/768/1280 layout.

## Limits / honest notes

* Rotation timing is wall-clock (6 s). It pauses when hidden, so it is not a
  guarantee of "a new photo every 6 seconds while you watch something else".
* No photo is described to assistive tech (decorative), by design.
* The slideshow adds no network calls, no libraries and no storage writes.
