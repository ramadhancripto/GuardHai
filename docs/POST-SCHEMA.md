# GuardHai — Post schema v2 (type · topic · blocks)

The post model is in `src/domain/post.js` and is pure: it never touches storage,
the network or the DOM, so every rule below is directly testable
(`tests/posttypes.spec.js`).

## The two axes

A post has a **type** (what kind of post it is) and a **topic** (what it is
about). They are stored in two separate fields and neither is ever derived from
the other. The composer keeps them independent; the six shortcut chips are
convenience only.

| `type` id | Label (sw) | Meaning |
| --- | --- | --- |
| `elimu` | Elimu | teaching / guidance |
| `swali` | Swali | a question to the community |
| `uzoefu` | Uzoefu | first-hand experience |
| `taarifa` | Taarifa | notice / announcement |
| `fursa` | **Kusaidia** | an offer of help (the id stays `fursa` for compatibility) |

| `topic` id | Label | Accent |
| --- | --- | --- |
| `afya` | Afya | blue (`--gh-blue`) |
| `usalama` | Usalama | green (`--gh-green`) |
| `taasisi` | Taasisi | amber (`--gh-amber`) |
| `kusaidiana` | Kusaidiana | teal (`--gh-teal`) |
| `majanga` | Majanga | red (`--gh-red`) — **not** an emergency alert |

```js
{ type: 'swali', topic: 'afya' }   // a question about health
{ type: 'taarifa', topic: 'majanga' } // a notice about a disaster — still just a post
```

`DEFAULT_TOPIC = 'afya'`. A Majanga/Usalama post is a normal post: publishing one
raises no SOS, writes no alert row and opens no emergency sheet.

## Backward compatibility (schema v1 → v2)

v1 stored five old topic ids. `normalizeTopic()` maps them on read; nothing is
rewritten in place, so an old row keeps its stored value and still renders.

| v1 id | v2 id |
| --- | --- |
| `health` | `afya` |
| `people` | `usalama` |
| `crime` | `usalama` |
| `digital` | `usalama` |
| `disaster` | `majanga` |

* `normalizeTopic(value, fallback = 'afya')` accepts a v2 id, a v1 id or a label
  (case-insensitive) and always returns a valid v2 id.
* `topicLabel(value)` always returns a Swahili label, including for v1 ids.
* `normalizePost(raw)` migrates topic/`topicLabel`, guarantees `type`, cleans the
  structured fields and stamps `schemaVersion: 2`.
* A row with **no** topic falls back to `afya` instead of throwing.
* Drafts saved by v1 load through the same path (`composer-view.js` normalises the
  topic when a draft is restored).

`normalizePost` never invents content: unknown topics become the default, unsafe
contact values are dropped, and `verified` is never set by normalisation.

## Fields

Required-ish: `id, type, topic, text, audience, createdAt, authorId, authorName`.

Optional structured fields, all cleaned on write **and** on read:

| Field | Shape | Cleaning |
| --- | --- | --- |
| `source` | `{ label, url }` | label ≤ 60 chars; `url` kept only if `http(s)` |
| `eventAt` | string (≤ 40) | trimmed |
| `safetySteps` | string[] | ≤ 5 items, 90 chars each |
| `requirements` | string[] | ≤ 5 items, 90 chars each |
| `contacts` | `{ kind, label, value }[]` | ≤ 4; `kind ∈ phone/website/email`; phone must match a phone pattern, email an email pattern, website `http(s)://` |

Anything failing those rules is dropped rather than rendered, so a post can never
turn into an arbitrary link or `javascript:` target.

## Limits

```
LIMITS = { title: 120, text: 2000, attachment: 6 }
```

`validateDraft()` returns Swahili messages: empty draft, over-long title/text,
unknown type (`Aina ya chapisho haijulikani.`), unknown topic
(`Mada haijulikani.`), unknown audience, too many attachments.

## Rendering

`src/features/feed/post-card.js` renders the card; `post-blocks.js` renders the
structured blocks:

* `bulletBlock(title, items)` → guidance / requirements lists
* `contactBlock(contacts)` → tap-to-call / mail / site rows
* `sourceRow(post)` + time row
* `verificationRow(post)` → three honest states:
  * sample → `Sampuli — hakuna uthibitisho wa chanzo`
  * `verified: true` → `Imethibitishwa na chanzo kilichoorodheshwa`
  * otherwise → `Haijathibitishwa`
* `postBlocks(post)` composes them with `GUIDANCE_TITLE[topic]`:
  `majanga → Maelekezo ya usalama`, `afya → Muhimu kujua`, `usalama → Jilinde`,
  `taasisi → Mambo muhimu`, `kusaidiana → Mambo ya kuzingatia`.

The card's coloured badge is chosen from **topic only** (`typeBadge()`), while the
post type appears as text (`Uzoefu · Umma`) so the two axes can never be confused
on screen.

## Storage

`posts.service.js` → IndexedDB. Publishing writes to the device only; the UI says
so (`Imehifadhiwa kwenye kifaa hiki — haijatumwa mtandaoni.`). There is no posts
server in this build.
