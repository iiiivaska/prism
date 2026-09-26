# Reference-distance review — the gallery

- Ticket: roadmap **P5-2**
- Rule: [ADR-0015](../adr/0015-references-inspiration-only.md) decision 3 — *"no Prism gallery screen or direction-board screen may be recognizably the same composition as a reference shot"*
- Reviewed: **2026-09-22**, against `docs/research/references.json` and the analyses in `docs/research/refs-*.md`
- Revised: **2026-09-22**, after a re-check against the Apple baselines. What changed: §2's method claim, the Surface geometry and copy in §§3.2, 3.3 and 3.5, the forced-state tally in §3.11 and §7, RD-2's part count and its genre item, and RD-3, which now covers the 76 Apple Surface images that carry no copy at all. No verdict in §4 moved.
- Revised again: **2026-09-22**, after the Button and Card baselines were decoded pixel by pixel rather than read. What changed: §3.1's *Affordance* bullet and §4 row 1, which had the `danger` pill as unfilled and "its own invention" when it paints the references' own critical wash and the distance is one of role (**RD-4**); §3.1's *Geometry* bullet, which attributed the control heights to modality when they come from density; §3.3, which now answers the Apple-materials question a reader asks first; and §3.7 and RD-2 item 3, which quoted `glass-vehicle`'s caption prop instead of the truncated string the card actually draws. No verdict in §4 moved.
- Subject: `gallery/index.html`, `gallery/index.json` and the **488 committed PNGs** they pair, at `showcase-and-license` (PR #11)
- Companion: the same review for the three direction-board screens is [README.md § Reference-distance review](README.md#reference-distance-review), reviewed 2026-09-16
- **Re-reviewed: 2026-09-23**, in [§9](#9-re-review-of-the-wave-1-examples--2026-09-23). The showcase review's finding SD-8 asked for a rule 3 review of `IconButton/with-badge`, which composes three components. That review found a wider gap: no review had read any of the 688 images that Divider, Icon, Badge and IconButton added after this document (RD-5). §9 lists which of the gallery's 67 examples compose more than one component. It reviews all 39 wave-1 examples, `with-badge` in full, and the 104 Button and Card images re-recorded since. It adds four findings and replaces §8's condition 3. Sections 1–8 stand as written on 2026-09-22, apart from pointers to §9.
- **Reviewed again: 2026-09-26**, in [§10](#10-review-of-avatars-examples--2026-09-26). P4-7's baselines (`5522846`) put Avatar's twelve examples in the gallery, outside this clearance by §9.9 condition 3 until a dated section read them. §10 reads all 204 images, and none is a copy. It adds two findings. RD-9: on Apple every example staged on the synthetic map sits where the route turns, and Avatar's two map examples put a bare round mark there, which makes them among the gallery's nearest images to a reference's map. RD-10: `Sidebar.yaml`'s `rail` example specifies the rail whose avatar is `Avatar/ringed`'s nearest reference. §10.8 adds a seventh expiry condition, and §10.9 says how the next component's section follows. Sections 1–9 stand as written, apart from pointers to §10.
- **Reviewed again: 2026-09-26**, in [§11](#11-review-of-chips-examples--2026-09-26). P4-8's baselines (`5b1663c`) put Chip's thirteen examples in the gallery, and `md-with-avatar` fills a slot with an Avatar. §11 reads all 224 images, and none is a copy. It adds two findings. RD-11: `md-with-avatar` has the traffic console's plate chip's anatomy, with a person in it. RD-12: `identifier-copy`'s "B-4417" puts the gallery's fleet unit number in a vehicle-style identifier; a cheap relabel is recommended, and not taken. §11.9 names `md-with-avatar` beside `with-badge` in condition 4, extends condition 7 and adds condition 8.
- **Reviewed again: 2026-09-26**, in [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26). P4-D9's baselines (`29b5490`) added 144 web Reduce Transparency images: new variants of 18 named examples, which §9.9 condition 3 covers with a sentence added to each group. §12 reads all 144 beside their Apple twins. None is a copy, and none moves an earlier verdict: the fallback removes the glass the references' map screens are built from. §12.5 reads the one image that asks a second look, `Avatar/initials-over-map` in light, whose disc becomes near-white.
- **Reviewed again: 2026-09-26**, in [§13](#13-re-review-of-the-identifier-chip-after-rd-12s-relabel--2026-09-26). RD-12 was taken: `e56272f` relabelled `Chip/identifier-copy` "INV-209316", which fired showcase §13.8 condition 8, and CI re-recorded its 16 images, which fired §9.9 condition 6. §13 reads the 16 beside the images they replace. Only the label and the pill's width changed, none is a copy, and RD-12 is closed.
- **Reviewed again: 2026-09-26**, in [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26). P4-D14's baselines added 183 web Increase Contrast images, one per example and scheme on `web-desktop` at regular density: new variants of all 92 named examples, which §9.9 condition 3 covers with a sentence added to each group. §14 reads all 183 beside their Apple twins. None is a copy, and none moves an earlier verdict: on both stacks Increase Contrast deepens strokes and secondary text, raises thin weights to 400 and falls glass back as Reduce Transparency does.
- **Reviewed again: 2026-09-26**, in [§15](#15-re-review-of-iconbuttons-circle-on-glass-after-p4-10--2026-09-26). P4-10 made the solid on the scheme's glass the inverse solid (ADR-0040). At `8987b2d` that turned the circle of `IconButton/on-glass-over-map` from white to ink in light, which fired showcase §13.8 condition 8, and CI re-recorded its 6 light images, which fired §9.9 condition 6. §15 reads the 6 beside the images they replace. Only the circle's box changed, to the circle the example's fallback twins already drew. None is a copy, and no earlier verdict moves. RD-13 records that `Toolbar.yaml`'s `over-map` example specifies the traffic console's zoom cluster, the stack this control is not in.

This is the gallery half of the precondition that [`docs/legal-checkpoint.md`](../legal-checkpoint.md) §5.2, outstanding item 1 (finding **F-7**) names as the one thing still blocking the `LEGAL_CHECKPOINT` repository variable, and therefore the first release. Critic finding **C-16** flagged the ordering: P5-2 sits after P3-6 in the roadmap, so a release run before this review would breach rule 3.

It follows the format the owner already signed off on for the board: per screen, **what it is**, the **nearest reference**, the **families mixed**, and **what differs**. It is not a rubber stamp — §6 records what it found — and it is written entirely from the analyses this repository already holds plus knowledge of the products. **No reference image was fetched, screenshotted or stored.** ADR-0015 rule 1 forbids reference imagery in this tree and `pnpm lint:reference-copy` enforces the copy half of it; the guard scans `docs/direction-board`, so this file names each reference by the shot id of `references.json` and a neutral nickname, never by the client's brand name (ADR-0015 rule 2), exactly as the board's own review does.

---

## 1. What is public in the gallery, exactly

`pnpm gallery:build` writes two committed files and one gitignored folder. What a reader downloads or opens is:

| Path | Committed | What a reader sees |
|---|---|---|
| `gallery/index.html` | yes | the page: 57 component sections, one row per scheme × density × forced state, one figure per platform key |
| `gallery/index.json` | yes | the same pairing as data |
| `gallery/snapshots/` | **no** (gitignored) | the collected copies; the page reads the baselines in place |

The images are not renders of their own: they are the baselines each harness already compares against, so a gallery figure and a failing snapshot test are the same picture.

| Source root | Platform keys | Framing | Count |
|---|---|---|---|
| `swift/Tests/DSSnapshotTests/__Snapshots__/` | `ios` | tight to the component (402 pt proposed width, scale 1, iPhone 17 / iOS 26.5) | 268 |
| `web/apps/vrt/baselines/linux/` | `web-desktop`, `web-touch` | the story's stage, so the ground is in frame (1280×800 and 390×844, deviceScaleFactor 1) | 220 |

**488 images, 268 cells, 0 missing**, across **four components** — Button, Surface, Text, Card — and **28 spec examples**. The other 53 component sections and the three pattern names (`AdaptiveShell`, `DashboardGrid`, `DetailScreen`) are anchors with no image; §7 lists them.

### What a "screen" is in this gallery

This matters more than anything else below, so it is stated before the review rather than discovered inside it.

**The gallery contains no composed screen.** Every one of the 488 images is one component — or a 2×2 of one component — on its harness's stage: on the web, `.ds-gallery-stage`, a `bg.page` ground with 64 px of padding holding a `size.card.min` (200 px) frame; on Apple, a tight crop of the same component with about 24 pt of ground around it (§1's source table). The largest composition in the whole gallery is **four tiles in a 2×2 with a 12 px gap on an empty page** — 200 px tiles on the web, 104 or 200 pt on Apple depending on the component (§3.5). There is no navigation, no rail, no hero column, no chart, no table, no bottom sheet, no toolbar, no map with a route on it — none of the inventory that makes a reference shot a *composition* rather than a part.

That is not an excuse; it is the fact that decides most of §5. Rule 3 is about compositions, and a component on a plain ground cannot be the same composition as a reference screen. Where the risk actually lives is in the **anatomy** of a single card and in the **grammar** of a group of tiles, and those are reviewed here on their own terms.

### The two synthetic backdrops

Three Surface examples, two Card examples and one Text example sit on a backdrop. Both backdrops are built in `web/apps/gallery/src/harness/harness.css` (and their Apple twins in `DSExampleStage`) out of **`color.map.*` tokens and nothing else**, as ADR-0022 §3.3 asks:

The two stacks draw them differently, and this review states them separately, because an earlier draft asserted the web's inventory of both and got the Apple twin wrong:

- **`map`, web** (`harness.css`): four CSS layers — two `map.building` rectangles over a `map.block` field, one `map.park` rounded rectangle, one rotated `map.water` lozenge, and two crossed road bands (`map.road` over `map.road-casing`). **No route.**
- **`map`, Apple** (`DSExampleMap`, a `Canvas`): a `map.land` fill; an 11-block grid (a 4 × 4 lattice with five cells dropped, each block carrying a `map.building` inset); an elliptical `map.park`; a curved `map.water` river; the same two crossed roads over their casing; **and a route** — a two-segment polyline in `color.map.route` over a `map.route-casing` casing, at 2 × and 3.5 × `chart.line-width`.
- **`image`**: the same grounds on each stack, blurred to ellipses at `ref.blur.glass`.

Neither is a map or a photograph. On both stacks there is no imagery, no street network, no label, no marker, no pin, no puck, no vehicle, no person, no building render and no satellite tile. **The route is the one element of the nearest reference's map layer that Prism's Apple backdrop does draw**, and §3.4 judges it rather than passing over it. This is reviewed as its own group in §3.4 because "glass over a map" is the single move most associated with the dark-ops references.

---

## 2. Method, and what it cannot settle

**How it was done.** Images from every one of the 28 example groups were opened and looked at, on **both** stacks, rather than reviewed from a file name — but not all 488 one by one, and the first draft of this section claimed otherwise. A re-check on 2026-09-22 caught what that overclaim cost: the Apple half of the Surface group had been described from its web twin, and the Apple Surface baselines carry no copy at all. §§3.2, 3.3 and 3.5 and finding **RD-3** are written from the Apple baselines as a result. Read the claims below accordingly: every count, pixel size and platform split comes from `gallery/index.json`, every geometry number is read back from the tokens (`sys.radius.*`, `sys.space.*`, `sys.size.*`, `sys.gradient.vivid.*`) rather than eyeballed, and where a group's two stacks differ the difference is now stated per stack instead of as one number. The groups below are the units a reader perceives (a component's example set, and the composed examples inside it), not 488 separate judgements.

**A second re-check, the same day, and what it cost.** Looking at a group is still not measuring it. A pass over the Button and Card baselines with a pixel decoder — reading fill, border and page colours out of the PNGs and measuring the drawn boxes — found that §3.1 had described the `danger` pill as having **no fill** when it has a visible critical wash on both stacks and in both schemes, and had built a "furthest from any reference" argument on the absence (**RD-4**); that §3.1's control heights were attributed to modality when they come from density; and that §3.7 quoted `Card/glass-vehicle`'s caption **prop** where the card draws a truncated string. All three were checkable in under a minute against a committed file. Every colour, box and string quoted below is now either a decoded pixel value, a token value, or a spec line, and is labelled as which.

**Corroborating gate, re-run today:** `pnpm lint:reference-copy` → **exit 0, no reference UI copy in 585 files against 143 denylist entries**. That is the count with this file and its showcase companion (`reference-distance-showcase.md`) in the tree, which is the state a release would ship. The guard covers `gallery/`, `spec/`, `swift/Sources`, `swift/Tests`, `web/apps/*` and — since finding **SD-5** of the companion was closed on 2026-09-22 — `swift/Showcase`, i.e. every place a gallery string comes from and every place a showcase string comes from. 585 is the tracked tree exactly: closing SD-5 also taught the walker to skip generated output that sits inside a target (`PrismShowcase.xcodeproj/`, `web/apps/vrt/.fixture/`), so the number no longer depends on what the machine running it had built, and CI prints the same one. (The count read 564 before that target was added; anything quoting 564 predates it, and anything quoting 588 predates the skip.) So no gallery image carries copy quoted from a shot. That is a fact about strings; it says nothing about composition, which is what the rest of this document is for.

**Three limits, stated rather than hidden.**

1. **"Recognizably the same composition" is Prism's own standard, not a legal one.** `docs/legal-checkpoint.md` §4.2 leaves the EU unregistered-design question open on purpose, and §4.5 finds it sharper now that Prism is proprietary and sellable. Nothing here answers it.
2. **The nearest reference for the vivid 2×2, as a 2×2, is a shot that is not in the repository.** `references.json` records `owner_pasted_screenshots.family_a` as a *"light investor CRM on iPad (shot not located; described in refs synthesis)"*, and visual-dna §4.4 credits Family A for the 2×2 grid itself. It has no `refs-*.md` analysis, so the distance to it cannot be re-checked from this tree — only the distance to the three shots that *are* analysed.
3. **This clearance is dated.** It covers what the gallery holds on 2026-09-22. §8 says exactly when it goes stale.

---

## 3. The groups

Each group gives the four things the board's review gives, plus a fifth where it applies: a deliberate Prism choice **against** the nearest reference, with the ADR that decided it.

### 3.1 Button — the control set

- **What it is.** Seven examples × 2 schemes × 2 densities, plus the iOS `increased-contrast` twin: a solid pill ("Continue"), a **raised** secondary pill with a hairline ring and a trailing ↗ ("Details"), a small ghost pill — a ring with the page showing through — with a leading icon ("Filter"), a **tinted** danger pill ("Delete route"), a loading pill (a spinner replacing the label, on the same solid fill), a disabled pill (a flat grey solid), and a ghost pill with a white ring and a white label on a vivid card ("Open"). 112 images. Each is one control centred on an otherwise empty ground. Every fill named here is a decoded pixel, not a reading of the token file.
- **Nearest reference.** The **finance monitor 27597487**'s desktop nav pill — a solid near-black pill, 36 px tall, white 13 px label, with every other control a hairline ring — and the same grammar in the **finance dashboard 27678963**'s primary CTA pill (solid ink on the canvas, solid white on glass). Between them they are the closest thing to Prism's `primary` in light and in dark.
- **Families mixed.** Pill-and-circle control grammar from the **traffic console 27220417** (its §9.8: every control is a pill or a circle at 44–48 px, cards at radius 24 — "two shapes, total consistency"); "one solid among hairlines" polarity inversion on dark from the **incident console 27619812** and the finance monitor's mobile frames 27696584; the small ghost with a leading 1.5 px stroke glyph from the **shipping console 27658472**.
- **What differs.**
  - *Geometry.* A pill is `radius.control` = `ref.radius.pill` (999) at `size.control.md` **40 at regular density and 32 at compact** (`sm` 32 / 28, `lg` 44 / 40). Measured on the baselines, every `md` pill is 40 px tall at regular and 32 at compact, and the `web-desktop`, `web-touch` and `ios` columns agree to the pixel — modality moves the **hit target** (`sys.size.hit` → `ref.size.hit.pointer` 28 or `.touch` 44), not the drawn control. The references' pills are 34–36 px (desktop nav) or 44–52 pt (touch); Prism's density axis moves the same control between those two worlds from one token, which none of the references does — they are single-density shots.
  - *Type.* Labels are `label.md` 13/500 in **Onest**. No reference uses Onest: 27220417 is a two-font system (a Swiss grotesk for numerals, an Outfit-like rounded geometric for words), 27658472 is one Poppins, 27678963 and 27706847 read as a neo-grotesque. A pill's identity is mostly its letterforms, and these are not those letterforms.
  - *Colour.* The primary solid is `bg.fill.inverse` — `neutral.950`, `oklch(0.164 0.0065 271)`, a near-black with the ramp's cool cast, in light; `neutral.0` in dark — and it flips to `bg.fill.inverse-media` (`neutral.0`, 19.30:1) on vivid and glass (ADR-0030 §3.1). That flip is a **token** fact this group does not picture: the only on-media Button example is `on-vivid`, which is a *ghost* — a white ring with a white label over the gradient — so no gallery image shows a solid Button on media. The accent never fills a button; solar orange is reserved for attention, exactly one object at a time, and it appears in none of these 112 images.
  - *Affordance.* `danger` is an outlined pill **with a fill**. `comp.button.danger.bg.rest` → `sys.color.bg.tint.critical`, the status dot step washed over what is under it at **12 % in light and 10 % in dark**, inside a 1 px `text.critical` hairline with a `text.critical` label. On the page that is a pink pill in light and a maroon one in dark: on Apple the interior measures `(241, 222, 224)` against a `(241, 242, 245)` page in light and `(37, 20, 22)` against `(13, 14, 17)` in dark, and the web twin is within a unit of both. `Button.yaml` says it in one line — *"ghost is outlined with no fill at rest, danger is a tinted pill with critical text"* — and the pill with genuinely no fill is `ghost`, below. **The distance here is one of role, not of material, and the first draft of this bullet got it backwards.** visual-dna §4.11 records red in the references as a translucent material and never as a block: a 10 % wash behind alert rows, *an outlined status pill at a 50 % critical border with a 12 % fill and `text.critical`*, a recoloured stroke, a red glass disc. That is the recipe Prism paints. What no reference does is make red a **control** — in all eleven it marks a state and never offers an action. Prism promotes the same wash to an affordance, and pays for it where a mark never has to: `tokens/contrast-pairs.json` carries `text.critical` on `bg.tint.critical` as a functional pair with `bg.page`, `bg.surface` and `bg.surface.raised` as underlays, and ADR-0030 §6.2 makes a tinted element that carries text paint `color.bg.page` under its tint over media. Same material as the references' status layer; a role they never give it; a contrast rule they have no need of.
  - *Motion.* `loading` swaps the label for a spinner. Holding the pill's width while it does so is a **spec** behaviour (`Button.yaml`: *"replaces the label while loading; width is preserved"*), and the gallery does not picture it: `loading` is its own example with its own label ("Saving"), so its pill is 74 px wide against `primary-md`'s 88 px ("Continue"), and no pair in the gallery shows one button before and after. Either way the references are stills and record no loading state.
- **Deliberate choice against the nearest reference.** The **ghost** rests with an outline and **no fill** (`comp.button.ghost.bg.rest` deleted, `bg.pressed` added — ADR-0029 §3.3, finding F29). visual-dna §3.6 had recorded "ghost fill" from the references; the owner chose the outline instead on 2026-09-15. The gallery shows the choice: `ghost-sm` is a hairline ring on the page in both schemes.

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 14 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 63): the secondary and ghost rings deepen, and the other five are byte-identical to their standard images. The verdict stands.*

### 3.2 Surface — the flat materials

- **What it is.** Four examples: `solid-card`, `vivid-default`, `inverse-pill`, `accent-tile`. 64 images — 32 web, 32 Apple. Each is one slab (or one pill) alone on the page. **The two stacks differ in what is written on the slab, and the difference is total.** The web harness supplies sample copy from `web/apps/gallery/src/harness/content.ts` — "Solid / The content surface", "Vivid / The default gradient", "Accent / The lit tile", and the single word "Selected" on the pill — so the 32 web images carry one or two lines. The Apple examples set no content at all: `swift/Sources/DSComponents/Examples/DSSurfaceExamples.swift` says so in its own doc comment (*"A Surface example sets no content, so each renders the empty content slot"*) and `DSExampleSlot` draws `Color.clear`, so the 32 Apple images in this group are **blank slabs with no title and no caption**. See RD-3.
- **Nearest reference.** For `accent-tile`, the **shipping console 27658472**'s lit KPI tile: in its sidebar a 2×2 of tiles sits at 4–6 px gaps so the group reads as one slab, and exactly one tile is filled with the interface accent (a periwinkle blue) while its siblings stay indigo-grey (its §5, §9.5, §2.2). For `solid-card` and `inverse-pill` there is no single nearest shot — a luminance-step card and a solid pill are common to all six families.
- **Families mixed.** The luminance-only surface ladder of 27220417 (canvas → +6 % → +9 % → +12 % white, no borders, no shadows — its §9.2); the "materials chosen by role" logic of the **health tracker 27706847** (solid tint for what must be read, translucent white for controls that float, dark opaque for the one primary action); the mesh-gradient vivid card of the finance dashboard 27678963.
- **What differs.**
  - *Geometry.* The lit tile is a square at `radius.tile` 16, alone on the page — **200 × 200 px on the web** (a `size.card.min` frame inside a 328 px stage) and **104 × 104 pt on Apple** (`space.13`, inside a 152 px tight crop). 27658472's lit tile is one cell of a four-cell slab inside a 340-wide sidebar at 4–6 px gaps; the thing that makes it read as "lit" there is the slab around it, and the gallery has no slab. So the gallery's accent tile is *less* like its nearest reference than the spec's own description is, not more.
  - *Colour.* The accent is Prism's solar orange (`bg.fill.accent`, `accent.500` in dark and `accent.300` in light) with ink `text.on-accent` and a second tone `text.on-accent-secondary` at 70 % (ADR-0030 §3.4, finding F23). 27658472's lit tile is periwinkle blue with white text. Same move, opposite temperature, and a second ink tone the reference does not have — which the web half puts on screen and the Apple half, carrying no text, does not.
  - *Type.* On the web, a `headline` 18/400 title over a `caption` 12/400 secondary line, in Onest; never bold, at most two lines. **On Apple there is no type in this group at all** — the empty content slot means those 32 images show material, radius and size and nothing else, which puts them further from any reference than their web twins, not nearer.
  - *Affordance.* `inverse-pill` carries no glyph and no icon — the "one solid" of §4.7 shown as a material rather than as a control. It is labelled "Selected" on the web and unlabelled on Apple.
- **Deliberate choice against the nearest reference.** Light `bg.surface.raised` is `neutral.50` with a `color.edge.raised` top edge and `elevation.1`, not a white-alpha overlay (ADR-0030 §5.2, finding F10): the reference ladder's white-over-white step was measured at 1.03:1 in light and rejected.

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 8 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 64): no fill moves; on the web `solid-card`'s caption deepens, and the other three are byte-identical. The verdict stands.*

### 3.3 Surface — glass over the synthetic backdrops

- **What it is.** Three examples — `glass-over-map`, `glass-light-over-image`, `glass-selected` — each in both schemes, both densities, with iOS `increased-contrast` and `reduce-transparency` twins. 60 images — 24 web, 36 Apple, and the two stacks frame and letter them differently. On the **web** a 200 px glass slab sits inside a 296 px backdrop plate, which sits on a 424 px stage, and the slab carries the harness's copy ("Glass / Over the map", "Light glass / Over an image", "Glass / Selected"). On **Apple** the image is a 248 pt tight crop in which the backdrop fills the frame edge to edge with the 200 pt slab inset in it — there is no page around the plate — and the slab is **empty**, because the Apple Surface examples set no content (§3.2). All 36 Apple images in this group are an unlettered pane of glass over the ground. See RD-3.
- **Nearest reference.** The **traffic console 27289370** (mobile) and **27220417** (desktop): a glass readout floating over a map, with a top-left specular edge, a vertical luminance falloff and a soft shadow — 27220417's §9.6 is explicit that glass appears *"only where it refracts something"*, never on flat canvas. That is the move, and Prism's `backdrop` prop is the rule that enforces it.
- **Families mixed.** The dark-glass chart card of the **bottle tracker 27699907** (feathered edge, two radial blooms, ~10 % grain); the smoked-glass drawer of the finance dashboard 27678963 (S4: black ≈35 % over a vivid backdrop, blur 40, 1 px inside highlight at 22 % strongest top-left, grain 4 %); the light-glass pill over a photograph of the same shot (S7).
- **Nearest well-known product, asked because a reader will ask it.** The eleven shots are not the only thing a 2026 reader holds a pane of glass up against; **Apple's system materials** are, and the showcase review's second axis (`reference-distance-showcase.md` §2) applies here even though that document only ran it on page layouts. Answered plainly: a blurred, saturated, specular-edged translucent pane over a moving ground **is** Apple's signature move, and Prism's `glass` is unmistakably in that family. What it is not is Apple's expression of it, and the difference is that Prism's recipe is **published as numbers** where Apple ships names. The scheme's glass is seven typed tokens (ADR-0022 §2.1), and they resolve to: in light, white at **30 %**, blur **24 px**, saturate **1.10**, a white inner edge from **55 % at the top-leading corner to 0 % at the bottom-trailing**, grain 0, bloom 0; in dark, `ref.color.smoke.dark` #111316 at **60 %**, blur **32 px**, saturate **1.20**, edge **15 % → 0 %**, grain 0, bloom 0. `glassLight`, which is what `glass-selected` draws in dark, is white **26 %**, blur **40 px**, saturate 1.0, edge 15 % → 0, bloom **35 %**. Every blur is an alias of a five-value `ref.blur.*` scale. Apple publishes none of those numbers: thin-to-thick material names and the vibrancy levels the HIG documents are the whole public surface. Three further differences are structural rather than numeric: Prism publishes **six** `text.on-glass-fill*` tones, read from the same tokens on both stacks; the fallback is **one** declared material — opaque `raised`, with `inverse` substituted when the Surface is selected — fired by four stated triggers (watchOS, Reduce Transparency, Increase Contrast, an unsupported backdrop), where Apple's materials degrade inside the OS; and Prism's glass follows Prism's own `colorScheme` axis rather than the system appearance, which is what lets a dark photograph in a light app be a dark *scope* instead of a per-backdrop material (§3.7, *Deliberate choice*; the *Colour* bullet below states the rule). So: a generic translucent-material recipe, of the same genre as Apple's, with its own published numbers, its own tone scale and its own fallback contract — not a reproduction of any named Apple material. Note the weakness ADR-0015 rule 1 imposes and §5 restates: this comparison rests on knowledge of Apple's materials and on nothing in this tree, because nothing about them may be stored here.
- **What differs.**
  - *Geometry.* One slab, centred, with nothing anchored to it. In every reference the glass readout is **tied to an object** — it sits beside a vehicle puck, over a driver photo, over a light beam — and that anchoring is what the composition is made of. The gallery's glass is anchored to nothing, because there is nothing under it to anchor to (§3.4).
  - *Colour.* Card glass follows the **scheme**, not the backdrop: `material.glass.fill` resolves to light glass with ink tones in light and neutral smoked glass (hue 265, C 0.007) with white 100 / 78 / 64 % in dark (ADR-0029 §1.1–1.5, findings F1, F3, F7). The references have exactly one glass: dark smoked glass everywhere, which in light composited to a khaki slab when Prism first tried it.
  - *Type.* A token fact rather than something these images show, and worth separating. Prism publishes **six** `text.on-glass-fill*` tones (`fill`, `-secondary`, `-tertiary`, `-dimmed`, `-media-secondary`, `-media-tertiary`) where the references have a single 100 % white, and over the map in light the ink tones are the ones that apply. On screen in this group that scale is barely exercised: two lines in two tones on the web, and nothing at all on Apple.
  - *Affordance.* `glass-selected` shows selection as a brighter light-glass fill with the bloom clipped off the header, plus Card's outline cue; under `increased-contrast` the whole slab resolves to an **opaque inverse rectangle** (a flat white square in dark), and under `reduce-transparency` to opaque raised. Both fallbacks are visible in the gallery, and both move the picture further from any reference, which has no accessibility state at all.
  - *Motion.* None in a still, by construction.
- **Deliberate choice against the nearest reference.** **No scrim over maps.** The references darken the world under their glass; Prism's scrim is 0.45 in both schemes and is for photographs only — D1 removed it from maps entirely (ADR-0029 §1.7, finding F2). The gallery's glass-over-map images show the backdrop at full strength through the glass, which is visibly not the reference treatment.

*Pointer added 2026-09-26: since `29b5490` the web also records these three examples under Reduce Transparency, 24 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them (rows 44–46): the slab falls back to opaque `raised`, and `glass-selected` to `inverse`, as Apple's twins here do. The verdict stands.*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 6 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 65): the glass falls back as under Reduce Transparency, and on the web the raised slabs' captions deepen. The verdict stands.*

### 3.4 The synthetic map and image backdrops themselves

This group exists because it is where a reviewer would expect to find a copy, and because the answer is unusually clean.

- **What it is.** The ground under §3.3 and under `Card/glass-vehicle`, `Card/glass-selected` and `Text/on-glass-over-map`. On the **web**, four absolutely-positioned layers of flat token colour: `map.block` with two `map.building` rectangles, a `map.park` rounded rectangle, a rotated `map.water` lozenge, and two crossed bands of `map.road` over `map.road-casing`. On **Apple**, a `Canvas` that draws more: a `map.land` fill, 11 blocks each with a building inset, an elliptical park, a curved river, the same two crossed roads — and a **route**, two segments from 10 % width to centre and up to 12 % height, stroked in `color.map.route` over `map.route-casing`. The `image` variant is the same shapes blurred into ellipses on each stack.
- **Nearest reference.** 27220417's map layer (its §7, map overlays): a desaturated satellite map, desaturated except vegetation, carrying a 3 px solid white route, a 3 px dashed planned route, an orange highlighted segment with an 8 px glow, a dashed radar ring around a white 44 px vehicle puck, and 24 px category-coloured pins with house / bus / plane / shop glyphs.
- **Families mixed.** None, in any meaningful sense. The grounds are Prism's own `sys.color.map.*` palette, which ADR-0030 §1 added precisely because *no* token styled the map and every candidate board had mixed its own (finding F30).
- **What differs.** Everything except the word "map" and, on Apple, the route. There is no imagery of any kind — no tile, no photograph, no render, no traced geometry — and no marker, no pin, no puck, no label, no halo, no radar ring, no highlighted segment. The road "network" is two straight bands crossing at 38 % and 46 %. **On the route, the one element held in common, the distance is in what it is made of:** the reference draws a 3 px solid white route *and* a dashed planned route *and* an orange highlighted segment with an 8 px glow, all over a satellite tile, with a puck at one end and pins along it. Prism draws one undashed two-segment polyline, no glow, no second route, no endpoint of any kind, on a four-colour ground — and it is not even accent-coloured: `color.map.route` resolves to `chart.series.1`, which is `neutral-950` in light and `neutral-0` in dark. It exists for one measurable reason: it is the only element that puts a **high-contrast line under the glass**, which is what ADR-0022 §3.3's limits have to hold against. `contrast:check` holds each ground to the glass limits per scheme (`map/backdrop-limit`: L ≤ 0.35 in dark, L ≥ 0.45 in light), and every translucent ground is painted over `map.land` alone and never stacked, which is a contrast rule rather than a cartographic one (ADR-0030 §1.1, §1.5).
- **Verdict on this group, stated early because it carries the others.** A reader who knows 27220417 well would not recognise this as its map, because it is not a map. It is a four-colour test ground whose only job is to prove that glass composites legibly over a backdrop inside the declared limits.

*Pointer added 2026-09-26: this describes the ground, not what the gallery stages on it. On Apple every example staged on the map covers the point where the route turns, and Avatar's two map examples put a bare round mark there ([§10.4.3](#1043-over-the-map--ringed-over-map-initials-over-map-2-examples-40-images), RD-9).*

### 3.5 The vivid 2×2 grids

- **What it is.** `Surface/vivid-pair` and `Card/vivid-pair`: four tiles in a 2×2 at a 12 px gap (`space.card-gap` at regular, 8 at compact), on an empty page. 32 images — 16 web, 16 Apple — and the size is not one number. On the **web** both grids are four 200 px tiles (`.ds-gallery-grid`: `repeat(2, size.card.min)`), 540 × 540 with the stage. On **Apple** each image is a tight crop: `Surface/vivid-pair` is 268 × 268 (264 compact) around 104 pt tiles, `Card/vivid-pair` is 460 × 460 around 200 pt tiles. In light the tiles alternate `sky` and `orchid` on the diagonals; in dark, `plum-dusk` and `navy-cyan`. The Card version carries its spec title ("Average yield") on **both** stacks and, under touch and on Apple, the ↗ affordance in every tile's top-trailing corner; the Surface version carries the harness's "Vivid / One slot pair" on the web and **nothing at all on Apple** (§3.2), so eight of these images are four wordless gradient squares.
- **Nearest reference.** The **bottle tracker 27699907**'s vivid stat tiles (its §3, §4, §7): three-stop vertical gradients at a ~165° skew, grain ≈10 %, an inner dotted seam inset 5 pt, a feathered edge, and a ≈25 % colour-bleed halo on the page behind each tile. By *form* the nearest is the **shipping console 27658472**'s 2×2 KPI slab; by *material* it is the finance dashboard 27678963's mesh-gradient vivid cards.
- **Families mixed.** 27699907 (gradient tiles with grain and a bleed glow); 27658472 (the 2×2 arrangement); 27678963 (desaturated earthy mesh gradients that keep white text readable); the finance monitor 27597487's rule that vivid is at most one card in six; and **Family A**, the owner's own screenshot, which is where the 2×2 *of vivid tiles* comes from and which this tree cannot re-check (§2, limit 2).
- **What differs.**
  - *Geometry.* **Squares** at `radius.card` 24 (`card-compact` 20) with a 12 px gap — 200 px in both web grids and in Apple's Card grid, 104 pt in Apple's Surface grid. 27699907's tiles are 168 × 102 **capsules** at radius ≈48 % of height; 27678963's vivid cards are 250 × 240 at radius 32; 27658472's tiles sit at a **4–6 px** gap so the four read as one slab. Prism's gap is two to three times that, so its four tiles read as four cards, not as a slab — the opposite of the shipping console's whole point.
  - *Colour.* This is the clearest departure. A Prism 2×2 is **one temperature through two gradients**, alternating one slot pair on its diagonals (ADR-0029 §2.5, finding F11; `gradient/slot-temperature` enforces it for every brand). No reference does this: 27699907's three tiles are three deliberately different characters ("Polaroid" warm, cool indigo, warm coral), and 27678963 pairs an olive card with a rose one. The alternating-diagonal pair is Prism's own rule and is visible in every one of these 32 images.
  - *Texture.* Grain is full-range value noise from a 32-bit integer hash, one value per CSS px, 128 × 128, checksum `3aea6890`, identical on both stacks (ADR-0030 §4.4) — a pinned algorithm rather than the references' photographic film grain. The bloom is the brightest stop at 30 % light / 45 % dark with a 75 px blur (finding F14), rendered *behind* the tile, not as the references' halo of the tile's **top** colour. It is present on both stacks — the page in the 12 px gap of the light Apple Card grid measures `(218, 221, 235)` against `(237, 240, 244)` at the frame corner — but only the web frame has 64 px of page around the grid for it to spread into; the Apple crop leaves about 24 pt, so there it reads as a tinted gap and edge rather than as a halo.
  - *Type.* Title only, `headline` 18/400 in Onest, top-leading, inside the ADR-0022 V2 header block. 27699907's tile label is **centred** at the top over a dot-matrix numeral with a delta pill bottom-right; none of that exists here.
  - *Affordance.* The ↗ in the same corner of every tile — see §3.6, where it is dealt with honestly.
- **Deliberate choice against the nearest reference.** Three, all from the 2026-09-15 sign-off: ember-night was moved **out** of the slots because its end stop was ΔE(OK) 0.078 from `accent.500` and read as a second accent (ADR-0029 §2.3); the light set spent its V1 headroom on chroma instead of staying dusky (§2.1, finding F13); and navy-cyan's stops moved to 30 %/85 % to kill a hard horizon the reference-style three-stop ramp had produced (§2.2, finding F12).

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 4 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 66): both grids are byte-identical to their standard images. The verdict stands.*

### 3.6 The metric cards

**This is the group that needed the hardest look, and the one §5 flags.**

- **What it is.** `Card/solid-metric` ("Line output" / "Last 24 hours" / hero `86` + dimmed `.4` + hung `%`), `Card/vivid-default-kpi` ("Average yield" / "Dollars per batch" / `$2,450`) and `Card/compact` ("Queued" / `37`). 48 images. One 200 px card on the page; on Apple and under web touch, a ↗ glyph sits in the top-trailing padding corner.
- **Nearest reference.** The **traffic console 27220417**'s glass KPI card floating over its map (its §6 and §9.3): title 15 px, a grey 13 px subtitle at 55 %, **↗ top-right**, and a 46 px hero with a dimmed remainder and a 12 px hung unit. Its §9.10 names the affordance explicitly as a signature: *"the same ↗ 16 px affordance in the same corner of every card"*. Second-nearest is the finance dashboard 27678963's white stat card (250 × 240, radius 32, header row, 18 px title, 44 px hero with a dimmed denominator).
- **Families mixed.** 27220417 (the corner-pinned anatomy and the instrument numeral); 27678963 (the stat card's proportions and the dimmed remainder); the **shipping console 27658472** (heroes at 30–32 px / weight 300 with a small dimmed unit, and generous padding inside a tight grid); the **health tracker 27706847** (light-mood hero numerals with tiny grey units hung on the baseline, hierarchy from size and ink level rather than colour). Prism's own `Card.yaml` supplies the header geometry — one `action.size` box for either affordance, `header.gap` to the heading, the V2 block reserved on vivid whatever the action (behavior 14) — which no reference has because no reference has two stacks to keep in step.
- **What differs.**
  - *Geometry.* 200 × 200 **square** at `radius.card` 24, `space.card-padding` 24 (16 compact). The reference KPI card is a **glass** card floating over a map, anchored by a leader to the object it describes; 27678963's stat card is 250 × 240 at radius 32 with a header *row* (icon circle + trailing control). Prism's is a solid page-coloured card on an empty page, anchored to nothing, with a header *column*.
  - *Content.* The reference KPI card carries a chart under its hero, a "target" label and an axis; 27678963's stat card carries pager dots, an alert badge and a dot-matrix strip. **The Prism card carries none of that** — and that is the uncomfortable half of the finding, not the comfortable one: what is left is precisely the four parts the reference card also has, and nothing that it does not. See §6, finding **RD-2**.
  - *Type.* `headline` 18/400 title, `caption` 12/400 secondary, hero `metric.lg` 32/300 with the trailing group in `text.dimmed` at the same size and `metric.unit` 12/400 at a 6 px gap — all in **Onest**, a Cyrillic-capable geometric humanist the references do not use. The reference hero is 44–46 px Helvetica Neue UltraLight (27220417) or a 44 px neo-grotesque (27678963).
  - *Colour.* Solid card on `bg.page`, one grey for the caption, no accent anywhere in the example. The reference KPI card is glass over a coloured world; its accent appears the moment a value goes off-target.
  - *Affordance.* The ↗ is `nav.open` at `size.icon.sm`, and Prism attaches a rule the references have no equivalent of: it is **the cue that the card opens, not decoration** (Card.yaml behavior 4), so an `open` card with no handler draws no glyph at all; and under **pointer** it appears only on hover, press or keyboard focus, while under **touch** it is always drawn. That is why the `web-desktop` column of these images shows a card with no glyph and the `ios` and `web-touch` columns show one. A reader comparing the two columns is seeing a modality rule, not drift.
- **Deliberate choice against the nearest reference.** On vivid, **the unit leaves the hero and joins the caption** (`vivid-default-kpi` shows it): ADR-0030 §8 made V3 a rule because text below 24 px must stay inside the V2 header block, so the hung unit the reference sets beside its 46 px hero cannot exist on a Prism vivid card. And `metric.md` became proportional by default (ADR-0030 §7.1, finding F24) rather than tabular, so static readouts stop looking letter-spaced beside proportional heroes — a departure from the references' uniformly tabular ops readouts.

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 6 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 67): the thin hero becomes regular and the dimmed remainder secondary, two of the parts row 6 shares with the reference card. RD-2 stands. The verdict stands.*

### 3.7 The glass vehicle cards

- **What it is.** `Card/glass-vehicle` (title "Unit 4417", caption "21.11.2026, 14:05:22" **as a prop** — see *Content* for what is actually drawn) and `Card/glass-selected` ("Unit 4417", selected), each over the synthetic `image` backdrop, in both schemes and densities, with `increased-contrast` and `reduce-transparency` twins. 40 images.
- **Nearest reference.** The **traffic console 27220417**'s vehicle card (its §6): title 18 px + ↗, a 12 px timestamp at 50 %, a 1 px wireframe bus illustration with an overlapping plate chip, a status row with an outlined pill and GPS / LTE indicators, a 12 px-radius mini route map, and a timeline scrubber with a round thumb.
- **Families mixed.** 27678963's dark smoked-glass recipe (overlay `rgba(10,12,8,0.35)`, blur 40, inside stroke white 22 % fading to 8 %, grain 4 %) for the material; the **bottle tracker 27699907**'s light-glass label pill refracting the surface beneath it for the light-scheme treatment; the **incident console 27571204** for the selected-card polarity.
- **What differs.**
  - *Content.* Of the eight parts the reference vehicle card has — a wireframe vehicle illustration, a plate chip, a status pill, signal indicators, a mini-map, a timeline scrubber, a unit title and a timestamp, as 27220417's own analysis lists them — Prism's example draws **two**: the title and the timestamp caption. The other six are absent: no illustration, no plate chip, no status pill, no signal indicator, no mini-map, no scrubber. What is on screen is a glass rectangle with two lines of text in its top-leading corner — and at **regular** density the second of those two lines is not even a whole timestamp. In a 200 px card the caption truncates: the web baselines render **"21.11.2026,…"** and the Apple ones **"21.11.2026, 14:0…"**, on both platform keys and in both schemes. Only at **compact**, where `space.card-padding` drops from 24 to 16, does the full "21.11.2026, 14:05:22" fit, on both stacks. The prop value and the drawn string are different things and this bullet now gives both, because the genre argument below is about what a reader sees.
  - *Geometry.* A 200 px square at `radius.card` 24 over the backdrop — on the web a 296 px plate inside a 424 px stage, on Apple a 248 pt tight crop in which the backdrop fills the frame edge to edge. The reference's desktop entity card is ≈230–240 × 300 and sits in a rail beside a map that fills the screen.
  - *Colour.* The backdrop is four blurred token ellipses, not a photograph of a vehicle or a driver; in light the card is light glass with ink, which the reference never shows.
  - *Affordance.* Selection turns the card to the brighter light-glass fill with the bloom clipped off the header and adds Card's floating shadow and selection outline; under Increase Contrast it becomes an opaque inverse slab (ADR-0022 §1.6). The reference's selected card is glass over a photo header and has no accessibility variant.
  - *Strings.* "Unit 4417" and the timestamp are **invented** and recorded as such (visual-dna §4.3 example, `Card.yaml` note, B26 resolved 2026-09-15); on screen at regular density the timestamp is the truncated "21.11.2026,…" (web) or "21.11.2026, 14:0…" (Apple) of the *Content* bullet, and the full string appears nowhere in the gallery except the compact rows. The reference's own identifier strings — its plate chip and route ids — are on the `lint:reference-copy` denylist and appear nowhere.
  - *Genre — the test RD-2 item 3 applies to `solid-metric`, applied here, because this is where it bites hardest.* The strings are invented; the **subject matter is not**. A dark smoked-glass card over a ground, titled with a fleet-unit identifier and a GPS-style timestamp ("Unit 4417" over "21.11.2026,…" on web-desktop and "21.11.2026, 14:0…" on iOS, the full "21.11.2026, 14:05:22" only in the compact rows) with a ↗ in the top-trailing corner, is the header block of 27220417's vehicle card, in 27220417's own genre, in an example `Card.yaml` names `glass-vehicle`. The truncation is a small counterweight rather than a defence — a clipped timestamp still reads as a timestamp — but it is what is on screen, and this section says so rather than quoting the prop. Copy distance and genre distance are different measurements: this example is clean on the first and the nearest in the gallery on the second. What holds it apart is the *Content* bullet above and not the subject — six of the reference card's eight parts are absent, so what a reader sees is a genre label on an almost empty card. That is a thinner margin than the rest of this section rests on, and **RD-2** item 3 now carries it.
- **Deliberate choice against the nearest reference.** Glass follows the **scheme** rather than the backdrop (D1, ADR-0029 §1.2, §1.5): a dark photograph in light is handled as a dark *scope*, not by switching to smoked glass per backdrop as the references implicitly do.

*Pointer added 2026-09-26: since `29b5490` the web also records both examples under Reduce Transparency, 16 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them (rows 47–48): the card falls back to opaque `raised`, and `glass-selected` to `inverse`. The verdict and RD-2 item 3 stand, and re-subjecting `glass-vehicle` now moves 28 baselines (§12.5).*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 4 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 68): the fallback of rows 47–48, with a deeper timestamp. RD-2 item 3 stands. The verdict stands.*

### 3.8 The tinted focus card

- **What it is.** `Card/tinted-focus` ("Sensor" / "Active", with an `object.gps` icon in a hairline ring above the title), **light scheme only**, both densities, with the `increased-contrast` twin. 8 images.
- **Nearest reference.** The **health tracker 27706847**'s tinted sheet card: a pale-yellow surface, the brand accent diluted to ~10 %, lit by an off-centre radial (ellipse 70 % × 55 % at 45 % / 38 %), carrying hero metrics and three dotted-leader spec rows, with a 28 pt top radius that bleeds off the bottom of the screen.
- **Families mixed.** The finance monitor 27597487's "one light source" logic (a single warm bloom behind a hero, never behind hairlines or grey captions); the 44 px hairline icon ring above the title from visual-dna §4.9, which the finance dashboard 27678963 draws as an open-arc ring on its vivid cards.
- **What differs.**
  - *Geometry.* A 200 × 200 closed square at `radius.card` 24, floating on the page. The reference is a **sheet**: `radius.sheet` 28 on the top corners only, inset ~8 pt, starting at ~55 % of the screen height and running off the bottom edge. Nothing about the gallery card reads as a sheet.
  - *Colour.* `bg.tint.accent` is solar orange at 12 % (a peach), not a highlighter yellow at hue ≈60°. The tint is **flat**: Prism does not draw the reference's radial light on a tinted card at all.
  - *Content.* No hero, no dotted leaders, no spec rows, no dot-grid page behind it, no line drawing. Two words and an icon.
  - *Type.* `headline` 18/400 over `caption` 12/400, Onest. The reference's card sets hero numerals at ~40 pt with tiny grey units.
- **Deliberate choice against the nearest reference.** The tinted Card is **light-only**. In dark, `bg.tint.accent` at 14 % composited to a brown mud (`#2D2118`), so ADR-0030 §3.3 (finding F18) kept the tint for chart windows and made the dark attention surface the lit tile instead. The gallery shows this as an absence: `tinted-focus` has no dark row, and the cell says so rather than pretending.

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 1 image. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 69): the icon's ring and the caption deepen on the unchanged tint. The verdict stands.*

### 3.9 Text — the type specimens

- **What it is.** `hero-metric` (`86` + dimmed `.4` + `%`), `title-two-tone` (a two-line headline, second line at `text.secondary`), `caption` ("Updated two minutes ago"), `data-tabular` (a monospaced-figure timer). 80 images, each with `increased-contrast` and `bold-text` twins on Apple.
- **Nearest reference.** For `hero-metric`, the **traffic console 27220417**'s instrument numerals (its §9.3): a 44–64 px UltraLight numeral with the least-significant digits dimmed to ~35 % and a 12 px unit beside them — *"it reads like a gauge, not a spreadsheet"*. For `title-two-tone`, the **finance dashboard 27678963**'s greeting headline: 32 px Regular with the second line at 40 % ink.
- **Families mixed.** 27658472's thin-hero-with-dimmed-unit practice; the **health tracker 27706847**'s light-mood hero numerals with tiny grey units hung on the baseline; the **incident console 27619812** for the backdrop title set as large thin type with no header bar; 27220417's table cells at 13 px tabular for `data`.
- **What differs.**
  - *Type.* The face is **Onest** at 48/300 (200 in dark at 34 px or more), where the references are Helvetica Neue UltraLight, Poppins ExtraLight, SF Pro or a neo-grotesque. Prism also refuses the heavy-hero branch of the references outright: the finance monitor 27597487's 700-weight hero numerals are **not** adopted, and nothing is heavier than 500 outside Bold Text (ADR-0021).
  - *Content.* One number, or one headline, or one caption, on an empty page. These are specimens; there is no card around them and no screen around the card.
  - *Colour.* Tones only — `text.primary`, `secondary`, `dimmed`. No accent appears in any Text example.
  - *Affordance.* None; the figures are `inert` specimens by construction.
  - *Motion.* None. (`Text`'s count-up lives in a preview, not in a gallery baseline.)
  - *Copy.* The two stacks deliberately carry **different invented strings** for the same example — the web `title-two-tone` reads "Weekly summary / Three rides ahead of plan", the Apple one "Weekly summary / Twelve sessions logged" — because Surface and Text examples carry no strings in the spec and each harness supplies its own. The pair compares type, not words, and both sets are invented.
- **Deliberate choice against the nearest reference.** `type.axis` 12/1.2/400 with tabular figures was added because §8.2 wanted 12 px axes while `type.data` is 13 px and `caption` is proportional (ADR-0030 §2.6, finding F20) — Prism split a role the references run together. And under Bold Text or Increase Contrast every weight below 400 resolves to 400, so the `increased-contrast` and `bold-text` twins in this group show heroes the references' UltraLight grammar could not survive.

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 8 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 70): the thin numeral becomes regular and its ".4" secondary, the second line and the caption deepen, and the timer is byte-identical. The verdict stands.*

### 3.10 Text — type on media

- **What it is.** `Text/on-vivid` (web "Evening loop", Apple "Average yield") on a vivid card, and `Text/on-glass-over-map` (web "Two stops ahead", Apple "Next stop in four minutes") on a glass card over the synthetic map — the two stacks' strings differ by harness, RD-3. 44 images, including `reduce-transparency` twins for the glass one.
- **Nearest reference.** 27220417's glass readout captions over the map, and the **bottle tracker 27699907**'s screen title + subtitle block set in white directly on a full-bleed gradient.
- **Families mixed.** 27678963's white / white-64 % / accent content scale on dark glass; 27220417's discipline of one grey for everything secondary.
- **What differs.**
  - *Geometry.* The text sits at the **top-leading corner** of the surface, inside the ADR-0022 V2 header block, because that is where the gradient is measured to hold 4.5:1. The reference sets its title block centred or at the optical centre of a full-bleed field, where it happens to look right.
  - *Colour.* On vivid, white tones only, and the plot and reference lines that would sit beside them take `color.chart.on-media.*` (white 100 / 64 / 24 %) rather than ink (ADR-0030 §2.2, finding F5). On the scheme's glass in light, the caption is ink at `text.on-glass-fill-secondary`, not white.
  - *Contrast.* Every one of these pairs is a checked pair with a measured margin; the references' own analyses record 55 % white captions on hot gradients at an estimated 2.0–2.8:1, i.e. the exact treatment Prism's V1/V2 gates exist to refuse.
- **Deliberate choice against the nearest reference.** The one-tone-on-vivid limit: over imagery and vivid, light glass carries **ink only**, because its quieter tones hold only over Prism's own map (ADR-0029 §1.4).

*Pointer added 2026-09-26: since `29b5490` the web also records `Text/on-glass-over-map` under Reduce Transparency, 8 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them (row 49): the tile falls back to opaque `raised`. The verdict stands.*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 4 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 71): the header block is byte-identical, and the line on the tile falls back as in row 49 and deepens. The verdict stands.*

### 3.11 The forced-state variants

- **What it is.** **158** of the 488 images are forced accessibility states, recorded on Apple only: `increased-contrast` on every example (110 — 28 examples × 4, less the two dark rows `tinted-focus` does not have), `reduce-transparency` on every glass example (24 = 6 × 4), `bold-text` on every Text example (24 = 6 × 4). The web records none, and the gallery labels those cells "not in this matrix" rather than counting **316** invented gaps — the 158 forced cells times the two web platform keys.
- **Nearest reference.** **None.** No reference shot records an accessibility state; all eleven are single-state marketing stills.
- **Families mixed.** None.
- **What differs.** These images show pictures that cannot exist in any reference: glass resolving to an opaque inverse slab, thin heroes snapping to weight 400, hairline edges thickening. They are the part of the gallery furthest from any reference, and they are a third of it.

*Pointer added 2026-09-26: since `29b5490` the web records `reduce-transparency` too, for the 18 examples that render glass. Those 144 images are read in [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26). Increase Contrast and Bold Text are still recorded on Apple only, and the page labels their 868 web figures "not in this matrix".*

*Pointer added 2026-09-26: since P4-D14 the web records `increased-contrast` too, on `web-desktop` at regular density, one image per example and scheme. Those 183 images are read in [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26). Bold Text, and Increase Contrast at compact density and on `web-touch`, stay Apple's alone, and the page labels those 685 web figures "not in this matrix".*

---

## 4. Is any single screen close enough to one product that a reasonable person would call it a copy?

Answered per screen, as asked, not in general. "Screen" here means the group a reader perceives as one picture.

| # | Screen | Copy? | Why |
|---|---|---|---|
| 1 | Button — the control set (§3.1) | **No** | A labelled pill is a method, not an expression. Seven pills on an empty page share no composition with any shot. The `danger` pill is the one control here whose *material* is the references' own — a 12 % (light) / 10 % (dark) critical wash inside a critical hairline, which is their outlined status pill's recipe — so what separates it is the **role**: no reference makes red a control at all. See §3.1, *Affordance*. |
| 2 | Surface — flat materials (§3.2) | **No** | One slab and one pill, each carrying two lines. The lit tile's nearest reference needs a four-tile slab to read as "lit"; the gallery has no slab. |
| 3 | Surface — glass over the backdrops (§3.3) | **No** | The move (glass over a world) is unprotectable and named as such in ADR-0015's Context. The composition is absent: nothing is anchored, nothing is under the glass but four rectangles. |
| 4 | The synthetic map / image backdrops (§3.4) | **No** | It is not a map: no imagery, no marker, no label, no accent. Flat token colours — four layers on the web; on Apple also a neutral two-segment route, the one reference element held in common, undashed, unglowing and unaccented (§3.4). |
| 5 | The vivid 2×2 grids (§3.5) | **No** | Squares at a 12 px gap in one temperature alternating on the diagonals, against capsules with delta pills, or a 4–6 px slab of four different-hued tiles. The diagonal one-pair rule is Prism's own and is visible in every image. *Caveat:* the nearest reference for the 2×2 *as a 2×2* is Family A, which this tree cannot re-check (§2). |
| 6 | **Card — the metric cards (§3.6)** | **Borderline on anatomy; no on composition** | Every part of the card — title, grey caption, ↗ top-trailing, thin hero with a dimmed remainder and a small hung unit — has a counterpart in 27220417's glass KPI card, in the same place, at similar proportions. What saves it is that it is one card on an empty page rather than a screen, that it is solid rather than glass over a map, that the face is Onest rather than a Swiss grotesk, that the unit moves into the caption on vivid by rule (ADR-0030 §8), and that the ↗ is a behaviour-gated cue rather than decoration. It is nevertheless the closest image in the gallery, and it is close because the example shows **only** the parts the reference also has. See finding **RD-2** for what would increase the distance, cheaply. |
| 7 | Card — the glass vehicle cards (§3.7) | **No, on the parts — but it is the gallery's nearest *genre*** | Two of the reference card's eight parts are present and six are missing, over a backdrop that is not a photograph; the identifier strings are invented and the reference's own are on the denylist. What the verdict does **not** rest on is the subject: a smoked-glass card over a ground titled with a unit id and a GPS-style timestamp is 27220417's own subject matter, in an example the spec names `glass-vehicle` (§3.7, *Genre*). The six absent parts carry this one, not the choice of subject. See RD-2 item 3. |
| 8 | Card — the tinted focus card (§3.8) | **No** | A closed square with a flat peach tint, against a bottom-bleeding sheet with an off-centre radial light and dotted leaders. Different shape, different hue, different lighting, different content. |
| 9 | Text — the type specimens (§3.9) | **No** | A number, a headline, a caption and a timer, each alone. The instrument numeral is a typographic method; the face is not any reference's face; the digits are invented. |
| 10 | Text — type on media (§3.10) | **No** | Four words in a header block sized by a contrast gate. |
| 11 | The forced-state variants (§3.11) | **No** | No reference has an accessibility state to be close to. |
| 12 | `gallery/index.html` itself (§7) | **No** | Documentation chrome: system fonts, its own neutral palette, no Prism token, no Prism composition. It is a contact sheet, not a product screen. |

**Summary.** No gallery screen is close enough to one product that a reasonable person would call it a copy. **Two** are close enough on one axis each to be worth saying out loud, and §6 says what would move both: the metric card on **anatomy**, and the glass vehicle card on **genre**. They are the same finding (RD-2) and, not by accident, the same file to edit. A third closeness is worth naming although it moves no verdict and needs no edit: the `danger` Button's **material** is the references' own critical wash inside a critical hairline, and the distance is that no reference makes red a control (§3.1, *Affordance*). It is recorded as RD-4 because the first draft of this review claimed the opposite, not because the pill needs changing.

---

## 5. What the answer rests on, and where it is weakest

Worth stating plainly, because a review that only says "no" is not worth much:

- **The strongest reason is also the least flattering one.** Most of these screens are far from any reference because they are not screens. The gallery proves components, not compositions, and the compositions are the part that has not been built yet (§8).
- **The weakest point is the Card anatomy.** visual-dna §4.9 is a faithful, numbered reconstruction of a card the references all share, and `Card.yaml` implements it closely on both stacks. That is by design — ADR-0015 rule 2 admits *"principles with numbers"* — but the closer a single card is drawn to that anatomy with nothing else around it, the more the example, rather than the system, does the recognising. RD-2 is about the example, not about the anatomy.
- **Genre is a second axis, and this review reached it late.** RD-2 item 3 recognises that a card's *subject* carries distance independently of its words and of its parts — and then §3.7 first applied only the copy test to `Card/glass-vehicle`, which is the example where the subject is most obviously the reference's own. The verdict survives on the five absent parts; it never rested on the subject, and §3.7 now says so rather than leaving it to be noticed.
- **A stated method is part of the evidence, and it has now failed twice.** §2's first claim was stronger than what was done, and the Surface group paid for it: three sections described the Apple images from their web twins, where there is no copy at all (RD-3). The second failure is worse, because the method claim was already corrected when it happened: §3.1 asserted that `danger` had no fill and that Prism's danger button therefore had *"no reference behind it"*, on a screen where the pill is visibly pink (RD-4). Neither error needed a re-render, a build or a judgement call — both were a decoded pixel away. All three are corrected. A reader should weigh the verdicts knowing that every correction so far was found by re-checking this document against the files, not by reading it, and that the fix in both cases made a *distance claim smaller*, never a verdict.
- **The ↗ is knowingly taken.** The board's own review already named it: *"the ↗ affordance in the same corner of every card"* is recognisable in shot 27220417 (its §9.10 calls it a signature), and the board recorded that it is taken as grammar rather than inventory, with the owner's confirmation at sign-off item 4. The gallery inherits that decision; it does not re-open it. What the gallery adds is a rule the reference does not have — the glyph is drawn only on a card that actually opens, and under pointer only on hover, press or focus.

---

## 6. Findings

Four, in the order they matter. None blocks the review; **RD-1** shapes what the clearance means, and **RD-4** is about this document rather than about the gallery.

### RD-1 — This clearance covers components, not compositions, and will go stale on a known event

**What.** All 488 gallery images are single components or a 2×2 of one component. The three pattern specs that *are* compositions — `AdaptiveShell`, `DashboardGrid`, `DetailScreen` — appear in the gallery as names with no example screens; roadmap Phase 4 adds *"spec files plus gallery example screens"* for them. A pattern example screen is exactly the artefact ADR-0015 rule 3 is written about, and this review cannot pre-clear one that does not exist.

**Why it matters.** `docs/legal-checkpoint.md` §5.2's outstanding item 1 asks that the review *"cover every screen that will be public at the release"*. It is satisfied for the gallery **as it stands today**, and it stops being satisfied the moment Phase 4 lands a pattern example screen, or P5-1 rebuilds the two direction-board screens from real components into the gallery.

**Action.** §8 states the re-run condition; the P5-2 row of `docs/roadmap.md` now carries it, so a later agent reading the roadmap sees the expiry beside the clearance rather than having to find it here.

### RD-2 — The metric-card examples show only the parts the nearest reference also has, and `glass-vehicle` keeps its genre

**What.** `Card.yaml`'s anatomy has nine parts: root, header, title, caption, iconRing, action, **body**, **hero**, **aside**. Across all seven Card examples, `body` is never filled and `aside` is never filled; `iconRing` appears once (`tinted-focus`). So what `solid-metric` and `vivid-default-kpi` put on screen is title + caption + ↗ + hero — and that is, part for part and corner for corner, the set 27220417's glass KPI card has. The parts of Prism's anatomy that the reference card has **no counterpart for** — the bottom-trailing aside baseline-locked to the hero, and the body slot — are the ones the gallery never shows.

**Why it matters.** Twice over, and the second reason is the better one. First, distance: an example that draws only the shared parts makes the shared parts the whole picture. Second, coverage: the gallery is the living visual canon, and it currently has **no image of `aside` or `body` at all**, so two documented parts of the most-used composite are unproven on both stacks and unreviewable by eye.

**What would have to change** — cheap, and it is a spec-example change, not a design change:

1. Give one metric example an **`aside`** — meta text or a Sparkline, baseline-locked to the hero, as §4.9 specifies. This is the single highest-value edit: it proves an unproven part *and* puts a part on screen that the nearest reference card does not have.
2. Consider an example that fills **`body`**, for the same two reasons.
3. Optionally, move `solid-metric`'s sample data out of the ops-KPI genre (a percentage over a rolling time window is the reference's own genre; the strings are already invented, so only the genre would change). **And apply that same test to `Card/glass-vehicle`, which fails it harder than `solid-metric` does** (§3.7): a smoked-glass card over a ground, titled with a fleet-unit identifier and a GPS-style timestamp — drawn, at regular density, as the truncated "21.11.2026,…" on the web and "21.11.2026, 14:0…" on Apple, and in full only in the compact rows — is 27220417's vehicle card's own subject matter, and the spec names the example after it. Copy distance is not genre distance. Two answers are defensible and this review does not choose between them — **keep it**, because the genre is what `backdrop` exists to demonstrate and six of the reference card's eight parts are absent, so a reader sees an almost empty glass card; or **re-subject it** to something the references never draw (a parcel, a batch, a room), which costs one `Card.yaml` example edit and the same rebuild as item 1 and removes the last place in the gallery where Prism draws the reference's own thing. The choice belongs with whoever takes the `Card.yaml` edit.

None of these is required for this review to pass. They are what a reader asking "could this be closer than it needs to be?" should be handed. The owner of that change is a `Card.yaml` example edit plus `pnpm gallery:build`; it is **not** taken here, because this ticket owns this document and the P5-2 roadmap row, and editing a spec's examples would change 48 baselines on two stacks.

### RD-3 — The two stacks do not carry the same copy: Text differs word for word, and every Apple Surface image carries none at all

**What.** Surface and Text examples carry no strings in the spec, so each harness supplies its own — and the two harnesses answer that differently.

1. **Text: different invented strings.** `web/apps/gallery/src/harness/content.ts` writes "Three rides ahead of plan", "Evening loop" and "04:12:58" where `DSTextExamples.swift` writes "Twelve sessions logged", "Average yield" and "12:04:36"; `Text/on-glass-over-map` reads "Two stops ahead" on the web and "Next stop in four minutes" on Apple.
2. **Surface: no strings at all on Apple.** This is not different copy, it is the absence of copy, and it is the larger of the two. `swift/Sources/DSComponents/Examples/DSSurfaceExamples.swift` states it in its own doc comment — *"A Surface example sets no content, so each renders the empty content slot"* — and every example passes `DSExampleSlot`, which draws `Color.clear` at the example's size. So **76 of the 488 images** — every Apple Surface image: the five non-glass examples × 8 and the three glass examples × 12 — are a slab, a pill or a grid of tiles with **no title and no caption**, while their web twins carry "Accent / The lit tile", "Glass / Over the map", "Selected" and the rest. `Card` is unaffected: its examples carry their strings in the spec's own `props`, so "Unit 4417" and "Average yield" appear on both stacks.

**Why it matters — and what it is not.** It is not a reference-distance problem in either half: every string on both sides is invented, `lint:reference-copy` passes, and a wordless slab is *further* from a reference card than a lettered one, so none of §4's verdicts moves. It matters for two other reasons. First, as a reading instruction: a reviewer comparing the two columns should not read either difference as drift. Second, as a limit on this document's own evidence — any sentence about what a Surface example *says*, or about the type on it, is a sentence about the web half only, which is exactly the mistake the first draft of §§3.2, 3.3 and 3.5 made and §2 now records. If the pairs are ever meant to compare *copy* as well as type, the strings belong in the spec example rather than in two harnesses; that is the same edit RD-2 asks for on `Card.yaml`, applied to Surface and Text.

### RD-4 — The review's own worst claim was about a pixel, and the pixel was the other way round

**What.** Until the second re-check of 2026-09-22, §3.1 said that `danger` is *"an **outlined** pill with `text.critical` and **no fill**"*, and §4 row 1 concluded that *"the danger variant has no reference behind it at all"*. Both are wrong, and wrong in the direction that flatters Prism. The pill has a critical wash on both stacks and in both schemes (`comp.button.danger.bg.rest` → `sys.color.bg.tint.critical`, 12 % in light and 10 % in dark), `Button.yaml` line 8 says *"danger is a tinted pill with critical text"*, and the variant with no fill is `ghost` — which the same section's *Deliberate choice* bullet had right all along, so the two halves of §3.1 contradicted each other. Once the fill is on the page, the danger button is the references' own outlined status pill — a ~12 % critical fill inside a critical border with critical text (visual-dna §4.11) — applied to a control, so the paragraph claiming the greatest distance in the group was describing a **similarity**.

**Why it matters.** Three reasons, and the third is the one that should change behaviour.

1. **It is the class of claim this review exists to make checkable.** A reader who opens `Button/danger-md.web-desktop.light.regular.png` sees a pink pill in a second. A document that `docs/legal-checkpoint.md` cites to close the release gate cannot ask to be trusted on the things it got wrong about a committed file.
2. **It undercuts §2's stated method a second time.** §2 claims images from every example group were *"opened and looked at, on both stacks"*. A filled pill is not something a reader of the image misses, and §2 had already been corrected once for exactly this (RD-3, §5).
3. **The corrected statement is still a "no", and it is a better one.** The distance is one of **role** — the references never make red a control — rather than one of material, and Prism pays for the promotion with a contrast pair (`text.critical` on `bg.tint.critical`, with three underlays) and an over-media rule (ADR-0030 §6.2) that a status mark never needs. A distance argument that survives being stated accurately is worth more than one that needed the screen to be different from what it is.

**Action.** Taken in this document: §3.1, §4 row 1, §2 and §5 are corrected, and §3.1's *Geometry* bullet (which had the control heights coming from modality rather than density) and §3.7's caption quotes (prop rather than drawn string) were corrected in the same pass. Nothing in the gallery, the tokens or the spec changes — the screens were always right; the description of them was not. What a later reviewer should carry forward is the method, not this instance: **for any claim of the form "the screen has no X", decode the pixel before writing it.**

---

## 7. Coverage

Every screen the gallery shows, reviewed or explicitly out of scope with the reason. The 488 images reconcile exactly.

### Reviewed

| Screen (group) | Component / examples | Images | Section | Verdict |
|---|---|---|---|---|
| The control set | Button: `primary-md`, `secondary-md`, `ghost-sm`, `danger-md`, `loading`, `disabled`, `on-vivid` | 112 | §3.1 | not a copy |
| The flat materials | Surface: `solid-card`, `vivid-default`, `inverse-pill`, `accent-tile` | 64 | §3.2 | not a copy |
| Glass over the backdrops | Surface: `glass-over-map`, `glass-light-over-image`, `glass-selected` | 60 | §3.3 | not a copy |
| The synthetic map / image grounds | the backdrop under §3.3, §3.7 and `Text/on-glass-over-map` | (shared) | §3.4 | not a copy |
| The vivid 2×2 grids | Surface `vivid-pair` (16) + Card `vivid-pair` (16) | 32 | §3.5 | not a copy |
| The metric cards | Card: `solid-metric`, `vivid-default-kpi`, `compact` | 48 | §3.6 | **borderline on anatomy**, not a copy; see RD-2 |
| The glass vehicle cards | Card: `glass-vehicle`, `glass-selected` | 40 | §3.7 | not a copy; **nearest on genre**, see RD-2 item 3 |
| The tinted focus card | Card: `tinted-focus` (light only) | 8 | §3.8 | not a copy |
| The type specimens | Text: `hero-metric`, `title-two-tone`, `caption`, `data-tabular` | 80 | §3.9 | not a copy |
| Type on media | Text: `on-vivid`, `on-glass-over-map` | 44 | §3.10 | not a copy |
| **Total** | 28 examples, 4 components | **488** | | |

The forced-state variants (§3.11) are not a row of their own: **158** of the 488 above are `increased-contrast` (110), `reduce-transparency` (24) or `bold-text` (24) twins, all on `ios`, reviewed inside each group.

### Out of scope, with the reason

| Not reviewed | Why |
|---|---|
| `gallery/index.html`'s own chrome — header, toolbar, section nav, source tables, captions, footer | Documentation chrome, not a Prism screen. It is styled with system fonts (`-apple-system`, `ui-monospace`) and its own five-value neutral palette, uses **no** Prism token, and composes nothing: it is a contact sheet whose content is the images reviewed above. Nothing in it could be the composition of a reference shot. |
| `gallery/index.json` | The same pairing as data. No pixels. |
| `gallery/snapshots/` | Gitignored; never public. The page reads the baselines in place. |
| The 53 component sections with no image — Avatar, Badge, Checkbox, Chip, Divider, Icon, IconButton, ProgressBar, ProgressRing, Radio, SegmentedControl, Select, Skeleton, Slider, Spinner, TextArea, TextField, Toggle, Tooltip, Alert, Banner, CommandPalette, ContextMenu, Dialog, EmptyState, FormField, ListRow, Menu, Pagination, PillTabs, Popover, SearchField, Sheet, Sidebar, StatCard, StatusPill, Stepper, TabBar, Table, Timeline, Toast, Toolbar, TopBar, AreaChart, ChartContainer, DeltaBadge, HeroNumber, LineChart, RangeBand, ReferenceLine, RingGauge, Sparkline, StatTile | Anchors only: a heading, a spec link, a support row and the example ids, so a link from the parity report always lands. **No image exists**, so there is nothing to compare to a shot. They are Phase 4 (roadmap), and each becomes reviewable when its first snapshot lands (§8). |
| The three pattern sections — `AdaptiveShell`, `DashboardGrid`, `DetailScreen` | Named with no example screens; Phase 4 adds *"spec files plus gallery example screens"*. **These are the compositions**, and they are the reason this clearance expires (RD-1, §8). |
| The three direction-board screens | Reviewed 2026-09-16 in [README.md § Reference-distance review](README.md#reference-distance-review) and signed off with gate P3-0. Not this ticket. |
| The showcase apps (`docs/showcase.md`, P3-7) | Not gallery screens and not P5-2's subject, but they **are** public, so `docs/legal-checkpoint.md` §5.2 item 1 needed them too. Recorded here so the gap was not lost between two tickets; it was closed the same day by **P5-3**, [`reference-distance-showcase.md`](reference-distance-showcase.md). |
| `docs/direction-board/renders/` (7 tracked PNGs) | Renders of the three board screens, covered by the board's own review. |
| `docs/research/fonts/` (6 specimen PNGs) | Type specimens of candidate OFL families. No UI composition; `docs/legal-checkpoint.md` §3.3 already records their licence position. |

*Pointer added 2026-09-23: four of the 53 components in that list now have images: Divider, Icon, Badge and IconButton, 688 images from wave 1. [§9](#9-re-review-of-the-wave-1-examples--2026-09-23) reviews them. The row's pointer to §8 named no condition that fired when they landed (RD-5).*

*Pointer added 2026-09-26: Avatar's images landed at `5522846`, and [§10](#10-review-of-avatars-examples--2026-09-26) reviews them. The list now stands for 48 components.*

---

## 8. What this clearance does and does not cover

**It covers:** the gallery as built at `showcase-and-license` on 2026-09-22 — 488 images, 28 examples, four components — and it finds no screen there that a reasonable person would call a copy of any of the eleven reference shots.

**It expires on any of these:**

1. **A pattern example screen lands in the gallery** (`DashboardGrid`, `DetailScreen` or `AdaptiveShell`, Phase 4). A pattern screen is a composition; re-run this review for it before any release.
2. **P5-1 rebuilds the two direction-board screens from real components into the gallery.** Those are compositions the board already reviewed once, but rebuilt from components they are new artefacts and the review must be re-stated against the rebuilt renders.
3. **A new example is added to a reviewed component that composes more than one part** — for instance a Card example that fills `body` and `aside` (RD-2), or the first chart example from the data-viz wave. A new variant of an existing single-component example does not expire it. — *2026-09-23: did not fire by its letter. `IconButton/with-badge` composes three components, but IconButton was not a reviewed component. Replaced by §9.9, whose condition 3 also covers what this one missed: components whose first baselines land after a review (RD-5).*

**It does not cover** the showcase apps (P3-7), which are public and are reviewed separately: `docs/legal-checkpoint.md` §5.2's outstanding item 1 is satisfied for the gallery half here, and for the showcase half by **P5-3**, [`reference-distance-showcase.md`](reference-distance-showcase.md), written the same day and expiring on its own conditions.

**It is not a legal opinion.** `docs/legal-checkpoint.md` §4.2 leaves the EU unregistered-design question open, notes that *"recognizably the same composition" is the agents' own standard, not a legal one*, and §4.5 records that the question sharpened when Prism went proprietary. Nothing here changes that. This document says what the screens are and how far they sit from what the research recorded; it does not say what the owner is permitted to ship.

---

## 9. Re-review of the wave 1 examples — 2026-09-23

- **Subject.** `gallery/index.html`, `gallery/index.json` and the **1176 committed PNGs** they pair, on `main` at `deb6632`. That is 67 examples of 8 components, in 644 cells with 0 missing (`gallery/index.json`, `counts`).
- **Why.** The showcase review's finding **SD-8** ([`reference-distance-showcase.md` §11.6](reference-distance-showcase.md#116-findings-of-this-re-review)) flagged `IconButton/with-badge`. P4-4 landed that example, it composes three components, and nobody had reviewed it. Checking the conditions it might have fired turned up a wider gap: no review had read any image of Divider, Icon, Badge or IconButton (**RD-5**).
- **Format.** The same as §§3–4: per group, what it is, the nearest reference by `references.json` shot id, the families mixed, what differs, and the release question. §9.3 first settles which examples compose more than one component.
- **Rule 1.** No reference image was fetched, screenshotted or stored. The contact sheets, crops and screenshots made for this section stayed in the session scratchpad, and none is committed.

### 9.1 What changed since 2026-09-22

| Change | Commits | Images | Reviewed before today? |
|---|---|---|---|
| Divider landed, with its baselines | `32bbfa1`, `fb3ae87` | 100 | no |
| Icon landed, with its baselines | `62a30cf`, `12d89d8` | 228 | no |
| Badge landed, with its baselines | `e32588c`, `cace2ff` | 164 | no |
| IconButton landed, with its baselines, `with-badge` among them | `6aebd6c`, `f05a75f` | 196 | no |
| Button re-recorded on purpose. Its glyphs are now drawn by Icon, and its ghost and danger rings by `border.hairline` (ADR-0033). | `12d89d8`, `f05a75f` | 40 of 112 | yes, in their earlier form |
| Card re-recorded on purpose. Its glyphs are now drawn by Icon. | `12d89d8` | 64 of 112 | yes, in their earlier form |

The gallery now holds 488 + 688 = 1176 images. Surface and Text did not move. ADR-0035's rebinding (`d084a0e`) moved only Icon and IconButton images, which are among the 688.

**The 104 re-recorded images.** Each was compared at the same scale with its 2026-09-22 version (`git show 38199f2:<path>`). Every one draws the same elements in the same places. Only two things moved:
- the glyphs are now drawn by Icon, and on Card the ↗ is a little smaller in its box;
- the web's ghost and danger rings used to draw wider and are now hairlines, which is how §3.1 describes them and how the Apple images always drew them.

No claim in §3 rests on what moved, and no verdict in §4 changes.

**§8's conditions.** Conditions 1 and 2 did not fire: no pattern has an implementation, and P5-1 has not started. §9.3 answers condition 3.

### 9.2 Method

- **`with-badge`.** All 16 baselines were opened at full resolution and at 3–4× nearest-neighbour: 8 Apple images (light and dark, regular and compact, each with its `increased-contrast` twin) and 8 web images (both platform keys, both schemes, both densities). Their fills and boxes were decoded from the PNGs. The gallery page itself was opened in Chromium at 1440 px, in light and dark. `gallery/snapshots/` is gitignored (a local copy existed, but the page was served from the scratchpad with `snapshots/<Component>/<file>` mapped to the committed baselines). That mapping is what `pnpm gallery:build` collects, so the page showed exactly the committed images, and nothing was written into the repository. Both showcase apps were built and run as well ([`reference-distance-showcase.md` §12](reference-distance-showcase.md#12-re-review-of-the-component-pages--2026-09-23)).
- **The other 38 wave-1 examples.** The Apple light and dark regular images of every example were opened on contact sheets. So were the web twins of every example that sits on a material. The compact and `increased-contrast` rows were spot-checked. Each component's page in the web showcase was opened at 1440 and 375 px.
- **Numbers.** Every colour below is a decoded pixel. Every size is either a DOM measurement from the web showcase, a token value, or a box decoded from a PNG, and each says which.
- **Gates, run with this section in the tree.** `pnpm lint:reference-copy`: exit 0, no reference UI copy, 143 denylist entries, 648 files. That is the 645 files tracked at `deb6632` plus three new VRT fixture files that another ticket had in the working tree, because the guard walks the disk. `pnpm icons:validate`: exit 0, registry valid, 30 generated files current. The second gate matters because this section names glyphs. It names none of Apple's symbol names, which ADR-0013 rule 5 keeps out of documents.

### 9.3 Which examples compose more than one component

§8's condition 3 and the showcase review's §10 condition 4 both turn on an example that "composes more than one". Read at the level of the specs and the code, nearly every example does. Card is a Surface and draws its hero with Text (Card.yaml, `root` and `hero`), IconButton draws its glyph with Icon (IconButton.yaml, `icon`), Button's loading state draws a Spinner (Button.yaml, `spinner`), and in code Badge sets its digits with Text. On that reading all seven Card examples were already compositions on 2026-09-22, and neither review read it that way. The reading used here is what a reader sees: **an example composes more than one component when its own props put a second component on screen as a separate element.** Each of the 67 examples is of one of these kinds, and six are of two:

| Kind | Examples | Did it fire a condition? | Why |
|---|---|---|---|
| **A second component, in a slot the example fills** | `IconButton/with-badge`: a Badge in the `badge` slot, which ADR-0034 types as a Badge. No other example of the 67 fills a slot. The eight specs have three other slots, Surface's `content` and Card's `body` and `aside`, and no example's props fill any of them. | **Yes.** It fired the showcase review's §10 condition 4. By its letter it did not fire this document's condition 3, because IconButton was not a reviewed component. No review covered it at all (RD-5). | Reviewed in §9.4. |
| A second component that the host draws as a part of its own anatomy | **Icon**, from a registry id: all 12 IconButton examples, `with-badge` among them (`glyph`, drawn in the `icon` part); `Button/secondary-md` (`trailingIcon`) and `Button/ghost-sm` (`leadingIcon`); `Card/tinted-focus` (`icon`, in the icon ring); and the ↗ in the `action` part of all seven Card examples, four of them in `Card/vivid-pair`. Every Card example keeps `action: open`, and both galleries pass a handler for every `action` prop (spec/SCHEMA.md, "Every example gets its handlers"), so each draws its pressable form. **Spinner**, from a boolean: `Button/loading`, where `isLoading` replaces the label with a Spinner in the `spinner` part (Button.yaml). **Text**, from a value: the `hero` of `Card/solid-metric`, `vivid-default-kpi` and `compact`, which Card.yaml renders with Text at metric-lg. | No | The example passes a registry id, a boolean or a value, not a component. The host draws the result in a part of its own anatomy: IconButton's `icon`, Button's leading or trailing icon and its `spinner`, Card's `iconRing`, `action` and `hero`. A reader sees one control or one card. Every one of these parts that is on Button or Card was in the same place on 2026-09-22: §3.1 reviewed the loading pill as a spinner replacing the label, and §§3.5–3.8 reviewed the ↗, the heroes and the icon ring. The glyphs were drawn then by the internal glyph path that Icon replaced (§9.1). |
| Staged inside a Surface, because the example declares a material | `Button/on-vivid`, `Text/on-vivid` and `Text/on-glass-over-map`, all reviewed on 2026-09-22. `Divider/horizontal-inset`, `vertical`, `on-vivid` and `on-glass-over-map`. `Icon/on-vivid`, `on-glass-over-map` and `on-glass-light-over-image`. `Badge/on-vivid` and `on-glass-over-map`. `IconButton/on-vivid` and `on-glass-over-map`. | No | The harness wraps the component in a Surface of the material that the example's `surface` field names, over the synthetic backdrop when that material is glass (`web/apps/gallery/src/harness/examples.tsx`; `DSExampleStage` on Apple). That Surface is the ground the example stands on. It carries nothing but the component: no title, no copy and no second element. §3.3 and §3.4 cleared those grounds, and §3.1 and §3.10 reviewed the first three examples as single components on them. Whether a ground plus a component makes a recognisable picture is still a distance question, and §9.5 asks it where it applies. |
| One component over a synthetic backdrop, because the example's `surface` is `map` or `image` | `Surface/glass-over-map`, `glass-light-over-image` and `glass-selected`; `Card/glass-vehicle` and `glass-selected`. All five were reviewed on 2026-09-22. | No | The component is itself the surface, so the harness wraps it in nothing. It stands on the synthetic map or image, which the harness paints from token colours (`harness.css`; `DSExampleStage` on Apple) and which is not a component. §3.4 cleared both backdrops, and §3.3 and §3.7 reviewed these five on them. |
| Four of one component in a grid | `Surface/vivid-pair`, `Card/vivid-pair` | No | One component, repeated. §3.5 reviewed it as the 2×2, and it has not changed. |
| One component on the page ground, and nothing else | `Button/primary-md`, `danger-md` and `disabled`. `Surface/solid-card`, `vivid-default`, `inverse-pill` and `accent-tile`. `Text/hero-metric`, `title-two-tone`, `caption` and `data-tabular`. `Divider/horizontal` and `semantic`. `Icon/control-md`, `corner-sm`, `display-lg`, `status-filled`, `accent-mark`, `inherit-in-row`, `decorative` and `named-standalone`. `Badge/count-neutral`, `count-critical`, `count-accent`, `count-overflow`, `outline-neutral`, `outline-critical`, `dot-critical` and `dot-accent`. | No | `Icon/inherit-in-row` stands in the harness's row foreground, which sets the colour ListRow's title would take and draws nothing (`RowForeground` on the web, `DSRowForeground` on Apple). |

The six of two kinds are `with-badge` (a slot and its glyph), `IconButton/on-vivid` and `on-glass-over-map` (a glyph and a staging Surface), `Card/glass-vehicle` and `glass-selected` (the ↗ and a backdrop), and `Card/vivid-pair` (the ↗ and the grid). The rows count 29 examples on the page ground alone, 22 with a part drawn by a second component, 14 inside a staging Surface, 5 over a backdrop, 2 grids and 1 filled slot, which is 73 placements for 67 examples.

*Corrected on 2026-09-23, before this section was committed, after its verification read every row against the specs.* The first version of this table gave "one component on the page ground" as "every other example", which filed `Button/loading` and the three Surface examples over a synthetic backdrop there. It described the second row as glyphs only, so Button's Spinner and Card's Text hero were in no row by name, and it had no row for a backdrop, which Card's two glass examples also stand on. The reclassification changes no verdict and fires no condition. Every one of these examples was in the gallery on 2026-09-22 and was reviewed then as it is drawn (§3.1 for the loading pill, §§3.3–3.7 for the rest), and none of them fills a slot, which is the only kind that fires §9.9 condition 4 and the showcase review's §12.7 condition 4.

One edge case, for completeness. On the web the harness fills Surface's content slot with sample copy set in Text (RD-3), and it sets `Text/title-two-tone`'s second line as a nested Text. Those are the harness's copy and a role pair of one component. The 2026-09-22 review read them that way (§§3.2, 3.3 and 3.9), and no example's props put them there.

### 9.4 `IconButton/with-badge`

- **What it is.** The props are `variant: secondary`, `size: md`, `glyph: object.notification`, `label: "Open notifications"` and `badge: { variant: count, tone: neutral, count: 3, label: "unread" }`. On screen, the three components make one mark:
  - **IconButton.** A raised puck inside a 1 px hairline ring. In light the puck decodes to `(247, 248, 250)` on a `(241, 242, 245)` page, with the ring at `(224, 225, 227)`. In dark the puck is `(35, 36, 38)` on `(13, 14, 17)`, with the ring at `(53, 53, 55)`. Under `increased-contrast` the light ring darkens to `(177, 178, 180)`. The circle is `comp.icon-button.size.md`: the decoded boxes show 40 at regular density and 32 at compact, on both stacks.
  - **Icon.** The registry's `object.notification`, an outline bell centred in the `size.icon.md` (20) box. On the web it is Phosphor's drawing. On Apple it is the system symbol that the registry binds (ADR-0013).
  - **Badge.** A 20 × 20 disc (`size.icon.md`) in the neutral filled emphasis, which is the inverse solid. In light it is `(13, 14, 17)` with a white digit, and in dark it is white with a near-black digit. The digit is "3" in `type.micro`: Onest 11/500 with tabular figures, read from the web showcase's computed style.
  - **Placement.** The badge's box extends 4 px (`space.1`, IconButton.yaml's `badge.offset`) beyond the circle's top edge and beyond its trailing edge. The whole mark therefore measures 36 × 36 at compact and 44 × 44 at regular. This was measured in both stacks' baselines and in the web showcase's DOM.
  - **Nothing else.** The name "Open notifications" and the value "3 unread" are spoken, not drawn. In the web showcase the button's accessible name is "Open notifications, 3 unread", and the badge is `aria-hidden`. The showcase apps print the props, these words among them, beside the example (showcase §12.2).
  - **Its frame.** The mark sits alone: on the web on a 160 or 168 px stage with page around it, and on Apple in an 80 or 88 pt tight crop. The gallery shows it in eight rows (two schemes, two densities, standard and increased contrast). In the increased-contrast rows the web cells read "not in this matrix".
- **Nearest reference.** The bell button of the two consoles:
  - **Incident console 27571204 (mobile).** In its top row sits a 44 pt round **glass** button carrying a bell, over the map. On it is a **red** 18 pt disc with a white 11 pt Medium "2", 4 pt outside the button's top-right corner. Its analysis records this under *Layout & Spacing*, mobile, and under *Components*, as the round icon button and the notification badge.
  - **Traffic console 27220417 (desktop) and 27289370 (mobile).** Its numbered badge, a red 18 px disc with a white 11 px numeral, sits on its bell (its analysis §6). On the desktop the bell is one of four 44 px round buttons between a search pill and an avatar, at the right of the top row (§5). On the phone it is a glass puck in the header, opposite the back button. Its round buttons are glass over the map or solid on the canvas. The incident console's desktop shot, 27619812, re-uses the desktop frames.
  - **The component inventory** lists this move as the first of Badge's shapes, a *"numbered danger disc offset outside an icon button's corner"*. Badge appears in 7 of the 11 shots.
- **Families mixed.**
  - The placement and the 4 px overhang come from the two consoles above.
  - The badge's material and size come from the **finance dashboard 27678963**. Its count badge is a 20 px circle with an 11 px Medium numeral, ink for the active item and outlined for the rest. Prism's neutral filled badge is that badge's ink form, and `outline` is its resting form (Badge.yaml, `notes.design`). The dashboard puts its counts on section tabs, not on a button.
  - The puck and the ring come from the round-button grammar all the dark-ops shots share (the traffic console's analysis §9.8: every control is a pill or a circle), and from the hairline rings of the finance dashboard's 44 px icon circles.
  - The **shipping console 27658472** also puts a bell in a 44 px circle, marked with a red radial glow and a 6 px dot instead of a number. Nothing of it is used here.
- **What differs.**
  - *Colour.* Wherever a reference puts a count on a button, the disc is **red**: pure red at `#FF0004` in the incident console, `#FE3232` in the traffic console. It is the one chromatic mark on a monochrome screen, and it means an incident. `with-badge` has no hue at all. Its neutral count is ink in light and white in dark, because Badge.yaml says *"a neutral count stays achromatic"* and keeps red for a real status. Prism has a critical count (`Badge/count-critical`), and this example does not use it.
  - *Material and ground.* The reference's button is transmissive glass over a map, at about 14–20 % white. Prism's is an opaque raised puck with a hairline ring, on an empty page. Prism's IconButton on glass over the map (`on-glass-over-map`) carries no badge. The traffic console's desktop also draws round buttons solid on the canvas. That is the plainest form of a round button, which every shot has, not a choice particular to that product.
  - *Geometry.* A circle of 32 or 40 with a 20 px badge, against 44 with an 18 px badge. The overhang is the same 4 px. That is `space.1`, the first step of Prism's 4 px scale, and it is also the reference's number. It is stated here so that a later reader does not have to discover it. The badge is larger for its circle: 0.63 or 0.50 of the circle's width, against 0.41. At compact it covers a corner of the glyph, and the reference's badge does not cover its glyph (RD-8, not a distance matter).
  - *Arrangement.* This is the difference the verdict rests on. The reference's bell is **one of a row**. On the phone it sits beside a logo and a vehicle chip, over a map, above a strip of seven round tools. On the desktop it sits at the top-trailing corner in a cluster with a search pill, other round buttons and an avatar. `with-badge` has no neighbour: no bar, no second button, no field, no avatar and no map.
  - *Type and count.* Prism's is "3" in Onest with tabular figures. The reference's is "2" in its geometric sans. Prism's digit pair is `color.text.on-inverse` on `color.bg.fill.inverse`, a functional pair in `tokens/contrast-pairs.json`. The reference's white on pure red is about 4.0:1, which its own analysis flags as failing AA at 11 px.
  - *Accessibility.* The badge is hidden, and its count is read into the button's value (ADR-0034). No reference records an accessibility state.
- **Is the commonness a defence? Yes, up to a clear limit.** A bell for notifications with the unread count pinned to its top-trailing corner is not any one product's design. It is the standard form of the function. The glyph says what the control opens. The number says how many items wait. The corner is where a mark sits without hiding the glyph or changing the control's size. Operating systems draw it on app icons, mail and chat clients draw it on their inboxes, and design-system documentation shows it on its badge page. ADR-0015's Context records why that matters. A layout idea is an unprotectable method (17 U.S.C. §102(b), Copyright Office Circular 33, *Apple v. Microsoft*; in the EU, *BSA* and *Cofemel*), while the exact composition is protectable, and EU design law now gives GUIs an unregistered right against copying. So the genre is free to use, and what has to differ is the composition. That is the ADR's reading, recorded here, not a legal opinion, and `docs/legal-checkpoint.md` §4.2 leaves the EU design question open. A reasonable person who sees `with-badge` recognises the genre (a notification button with an unread count), not a product. Nothing in the image says which product, and the product it is nearest to is identified by choices the image does not make.
- **Where the defence would stop.** The genre supplies three elements and how they relate. A product adds its own choices on top. The reference's choices are: a red disc, which is the only colour on a monochrome console; the digit 2; an 18 px badge 4 px outside a 44 px glass puck; a satellite or rendered map under it; and neighbours — a logo and a vehicle chip on the phone, a search pill, round buttons and an avatar on the desktop. `with-badge` shares one of those choices, the 4 px overhang, and none of the others. The defence stops working in two ways:
  - **When those choices accumulate.** Prism already holds most of them, spread across separate examples. `Badge/on-glass-over-map` is a critical red "2" on glass over the map (RD-6). `IconButton/on-glass-over-map` is a round control on glass over the map. `with-badge` is the bell with the corner count. Each of these on its own is genre. An example or a screen that composed them — a badged `object.notification` IconButton on glass or over a map, or with a critical count, or with a count of 2 — would reproduce 27571204's bell part for part, apart from the face of the digit.
  - **When the bell gets the reference's neighbours.** A badged bell among other round buttons at a screen's top-trailing corner, beside a search field and an avatar, is the tools cluster that the board's D4 rework removed as 27220417's inventory ([README.md](README.md), § Ride report: *"the tools cluster is gone"*). `TopBar.yaml`'s `desktop-navigation` example already specifies that cluster (RD-7). It is unimplemented, so no screen draws it yet.
- **Verdict.** **Not a copy.** It is the genre's composition drawn alone, achromatic, opaque, on an empty page, and it shares with the nearest product's bell a single number. Nothing has to change before a release. §9.9 condition 5 records the changes that would bring it nearer.

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 2 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 75): the circle's ring deepens, and the bell, the badge and its count do not change. The verdict stands.*

### 9.5 The other 38 wave-1 examples

Each of these is one component. None fired a condition (§9.3), but before this section no review covered any of them (RD-5), so each group gets the same four questions.

#### 9.5.1 Divider — 6 examples, 100 images

- **What it is.** One hairline in a rule frame, 200 px long, horizontal or vertical, full or inset. It sits on the page, in a solid card, on a vivid tile, or on glass over the map. It carries no text. `semantic` draws what `horizontal` draws; only what it exposes to assistive technology differs.
- **Nearest reference.** None as a composition. The move is the 1 px rule of visual-dna principle 1: the hairline rail under the finance dashboard 27678963's section tabs, and the hairline rows of the incident console's route-offset table (27619812).
- **Families mixed.** The hairline ladder all the shots share.
- **What differs.** One line with nothing on either side of it: no row, no table and no tab above it.
- **Verdict.** **Not a copy.** A rule is nobody's expression.

*Pointer added 2026-09-26: since `29b5490` the web also records `on-glass-over-map` under Reduce Transparency, 8 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them beside their Apple twins (row 50): the tile falls back to opaque `raised`. The verdict stands.*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 12 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 72): a deeper hairline; `on-vivid` is byte-identical, and `on-glass-over-map`'s tile falls back. The verdict stands.*

#### 9.5.2 Icon — 11 examples, 228 images

- **What it is.** One registry glyph per example, alone on the stage:
  - `control-md` (settings), `corner-sm` (↗), `display-lg` (a map), `status-filled` (the warning mark, filled, in the warning tone), `accent-mark` (`object.gps` in the accent), `inherit-in-row` (`status.online` in a row's foreground), `decorative` (a chart) and `named-standalone` (a lock);
  - on a material: ↗ on vivid, a map pin on glass over the map, and play on light glass over the image;
  - the `increased-contrast`, `bold-text` and `reduce-transparency` twins.
- **Nearest reference.** The references' stroke icon sets: 1.5 px outlines at 20–24 px with round caps, in white at 80–100 %, as the iconography notes of the traffic console 27220417, incident console 27571204 and shipping console 27658472 analyses record them. The drawings themselves are not the references'. They are Phosphor's on the web and Apple's system symbols on Apple. That is a licence question, answered in `docs/legal-checkpoint.md` §2.3 and ADR-0013, not a composition question. Two examples echo how a reference *uses* a glyph:
  - `accent-mark` is an orange GPS glyph, which is how the incident console marks a degraded connection on its vehicle sheet;
  - `on-glass-over-map` puts a map-pin glyph over a map, where the traffic console places category pins.
- **Families mixed.** The stroke-icon convention, and the rule of one attention accent.
- **What differs.**
  - Each image is one glyph on an empty stage: no row, no label, no sheet and no vehicle.
  - The pin sits monochrome in a glass tile and marks no place. The reference's pins are coloured discs anchored to the map.
  - The orange of `accent-mark` is Prism's accent. Its step 500 is `#F39444`, the default accent the traffic console's analysis proposed (§11, principle 5), which the board signed off as Prism's. Here it names no state and sits on no sheet.
- **Verdict.** **Not a copy.** These are single glyphs, drawn by their vendors, one per image.

*Pointer added 2026-09-26: on Apple the glass tile of `on-glass-over-map` sits where the synthetic route turns, and both of the route's legs run into it, so the pin stands on the route's bend (RD-9). The verdict stands.*

*Pointer added 2026-09-26: since `29b5490` the web also records `on-glass-over-map` and `on-glass-light-over-image` under Reduce Transparency, 16 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them beside their Apple twins (rows 51–52): the tile falls back to opaque `raised`. The verdict stands.*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 22 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 73): nine are byte-identical, and the two on glass equal their Reduce Transparency twins. The verdict stands.*

#### 9.5.3 Badge — 10 examples, 164 images

- **What it is.** One mark per example, standing alone. Counts: neutral (3), critical (12) and accent (7). An overflow, "99+", in critical. Outlined counts: neutral (4) and critical (2). Two 8 px dots (`space.3`), critical and accent. A neutral 3 on vivid, and a critical 2 on glass over the map. Every filled count is a 20 px disc (`size.icon.md`). The critical disc decodes to `(229, 37, 42)`, which is `#E5252A`, `ref.color.status.danger.badge`.
- **Nearest reference.** The red numbered disc of the incident console 27571204 (18 px, "2", on its bell) and of the traffic console 27220417 (on its bell and at the start of its alert rows). Also the finance dashboard 27678963's 20 px count badges, in ink, white-outline and lime, on its section tabs.
- **Families mixed.** The dark-ops red disc. The dashboard's pair of an ink count and an outlined count, as Badge.yaml records. The shipping console 27658472's 6 px red unread dot.
- **What differs.**
  - Every Badge example stands alone. None sits on a button, a tab or a row. The only host in the gallery is `with-badge` (§9.4).
  - The critical red is the reference's red made legible. `#E5252A` is the value the traffic console's analysis proposed in place of its `#FF0000` so that a white 11 px digit passes AA (§10, item 4, and §11, principle 5). That is a principle with a number, which ADR-0015 rule 2 admits.
  - The accent count is Prism's orange, not the dashboard's lime.
  - The "99+" overflow and the tabular digits have no reference counterpart.
  - An outlined badge is never placed over media.
- **Closest image.** `Badge/on-glass-over-map`: see **RD-6**.
- **Verdict.** **Not a copy.** A count disc alone on a stage is the notification badge of every platform.

*Pointer added 2026-09-26: since `29b5490` the web also records `on-glass-over-map` under Reduce Transparency, 8 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them beside their Apple twins (row 53): the red "2" keeps its colour on an opaque `raised` tile. The verdict and RD-6 stand, and RD-6's change of count now moves 28 baselines (§12.5).*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 20 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 74): `outline-neutral`'s ring deepens, the red "2" on the map equals its Reduce Transparency twin, and the other eight are byte-identical. RD-6 stands. The verdict stands.*

#### 9.5.4 IconButton, the other 11 examples — 180 images

- **What it is.** One circle per example:
  - `secondary-md` (settings, the raised puck), `primary-md` (add, the inverse solid) and `ghost-md` (filter, a hairline ring with no fill);
  - `plain-sm` (a bare ↗ at 16 px), `danger-md` (delete, the critical tint in a critical ring) and `lg-touch` (play, primary, large);
  - `selected-in-group` (a map glyph in the inverse solid; the siblings its description mentions are not drawn), `disabled` (refresh, at `opacity.disabled`) and `label-ru` (refresh; the Russian name is spoken, and the circle is unchanged);
  - on a material: `on-vivid` (a ghost ↗ in the on-media ring) and `on-glass-over-map` (locate, in the white media solid).
- **Nearest reference.** The round buttons of all eleven shots (the component inventory counts IconButton in 11 of 11):
  - the traffic console 27220417's 44 px pucks, glass over the map or solid on the canvas, and its vertical stack of round map controls;
  - the finance dashboard 27678963's 44 px hairline icon circles and its solid ink ↗ disc on vivid cards;
  - the incident console 27571204's strip of seven round tools.
- **Families mixed.** The pill-and-circle grammar, and one solid among hairlines (visual-dna principle 9). The ghost with no fill is the owner's choice against the references' ghost fill (ADR-0029 §3.3).
- **What differs.**
  - One circle per image, never a row, strip, stack or cluster.
  - The size comes from density (32 or 40 for `md`), where the references use a fixed 44.
  - The glyphs are the vendors' drawings.
  - `danger-md` repeats RD-4: the references mark state in red and never make red a control.
- **Closest image.** `on-glass-over-map`: a white solid circle with a locate crosshair, on a glass tile over the synthetic map. It is one of the traffic console's map controls, alone and not in its stack. Its name, "Center on the vehicle", is spoken, not drawn in the gallery, though the showcase apps print it in the example's props. It belongs to the fleet genre that RD-2 item 3 already names. It is one of RD-6's three parts.
- **Verdict.** **Not a copy.** Single circles, each a control grammar that all eleven shots share and no one shot owns.

*Pointer added 2026-09-26: on Apple the glass tile of `on-glass-over-map` sits where the synthetic route turns, and both of the route's legs run into it. In dark, that puts a white disc with a dark glyph where a white route turns, which is nearer the traffic console's puck in material than "one of the traffic console's map controls" says (RD-9). The verdict stands.*

*Pointer added 2026-09-26: since `29b5490` the web also records `on-glass-over-map` under Reduce Transparency, 8 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them beside their Apple twins (row 54): the tile falls back to opaque `raised`, and in light the circle turns from white to ink. The verdict stands.*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 22 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 76): four rings deepen, the circle on the map equals its Reduce Transparency twin, and the other six are byte-identical. The verdict stands.*

*Pointer added 2026-09-26: P4-10 made the solid on the scheme's glass the inverse solid (ADR-0040 §1), and CI re-recorded the 6 light images of `on-glass-over-map`. [§15](#15-re-review-of-iconbuttons-circle-on-glass-after-p4-10--2026-09-26) reads them (row 86). In light the circle is now the ink solid with a white glyph, the circle its Reduce Transparency and Increase Contrast twins already drew, so the *Closest image* bullet's white circle is the dark image's alone. `Toolbar.yaml` specifies the stack that bullet says it is not in (RD-13). The verdict stands.*

### 9.6 Is any of these close enough to one product that a reasonable person would call it a copy?

Rows 13–18 continue §4's numbering.

| # | Screen | Copy? | Why |
|---|---|---|---|
| 13 | **`IconButton/with-badge` (§9.4)** | **No** | The genre's notification button with an unread count, drawn alone, achromatic and opaque on an empty page. The only thing it shares with 27571204's bell, beyond the genre, is the 4 px overhang. What makes that bell a product's (red, the 2, glass, the map, and its neighbours) is absent. |
| 14 | Divider (§9.5.1) | **No** | A hairline. |
| 15 | Icon (§9.5.2) | **No** | One vendor glyph per image. The orange GPS mark and the pin in a glass tile echo how a reference uses a glyph, one glyph at a time, with nothing around it. |
| 16 | Badge (§9.5.3) | **No, and `on-glass-over-map` is the nearest of the new images to a reference** | A mark alone on a stage. That one example has the reference badge's colour, number and ground. See RD-6. |
| 17 | IconButton, the other 11 (§9.5.4) | **No** | One circle per image, never a row or a stack. |
| 18 | The 104 re-recorded Button and Card images (§9.1) | **No**: rows 1, 6, 7 and 8 stand | The same elements in the same places. |

**Summary.** No gallery image at `deb6632` is close enough to one product that a reasonable person would call it a copy. The closest new images are `with-badge`, which is genre, and `Badge/on-glass-over-map`, which has the reference badge's particular choices but none of its composition. They matter together more than apart, which is what RD-6 and §9.9 condition 5 record.

### 9.7 Findings of this re-review

#### RD-5 — From `fb3ae87` on, the gallery held images that no review covered, and no document said so

**What.** §7 listed Divider, Icon, Badge and IconButton among the 53 components with no image, and said that each *"becomes reviewable when its first snapshot lands (§8)"*. §8 named no such event. Its condition 3 fires on a new example added to a **reviewed** component, and it says that a new variant of a single-component example does not expire the clearance. So when Divider's baselines landed (`fb3ae87`, 2026-09-23), followed by Icon's, Badge's and IconButton's, nothing in this document expired, and nothing covered the new images either. The showcase review had the same gap (its **SD-9**). All the while, `docs/legal-checkpoint.md` §5.2 said that nothing stood between the repository and a release except the owner's own act.

**Why it matters.** For about sixteen hours on 2026-09-23, 688 public images, and the showcase pages that stage the same examples, sat outside ADR-0015 rule 3 while every document said the rule was satisfied. No release was made (`docs/legal-checkpoint.md` §3.2), so nothing shipped unreviewed. The failure is in how the conditions were written. They listed what *expires* a clearance and assumed that anything they did not list was covered.

**Action.** Taken here: §9.4 and §9.5 review the 39 examples. §9.9 condition 3 now says the clearance covers named examples only.

#### RD-6 — `Badge/on-glass-over-map` has the reference badge's colour, number and ground, and three examples between them hold the reference's bell

**What.** The example is a critical disc reading "2", on a glass tile over the synthetic map. The incident console 27571204's bell badge is a red disc reading "2" on a glass button over a map, and the traffic console's is a red 18 px "2". The example has no bell and no button. It is one mark on a tile, so it is not a copy (§9.5.3). But the gallery now holds the parts of that bell in three separate examples:
- `IconButton/with-badge`: the bell with a count at the corner;
- `IconButton/on-glass-over-map`: a round control on glass over the map;
- `Badge/on-glass-over-map`: a red "2" on glass over the map.

None of them composes the others.

**Why it matters.** An example that composed them would be 27571204's bell, part for part, apart from the face of the digit. The "2" does not seem to have been chosen for the resemblance. Still, its example label is "open incidents", and incidents are that shot's subject too. The gallery never draws the label: it is spoken. But both showcase apps print each example's props, and on the iPhone the line under the red "2" reads *"label: open incidents"* ([`reference-distance-showcase.md` §12.3](reference-distance-showcase.md#123-the-other-pages-wave-1-changed)).

**What would help. Cheap, and not required.** Change the example's count to something other than 2. That is one `Badge.yaml` example edit, and it moves 20 baselines (12 Apple and 8 web) through the sanctioned re-record route. Give the example a label outside the incident genre in the same edit. The label moves no baseline, because it is never drawn. Independently of the count, §9.9 condition 5 makes composing any of the three parts an expiry condition.

#### RD-7 — TopBar's `desktop-navigation` example specifies the tools cluster that the board's D4 rework removed

**What.** `TopBar.yaml`'s `desktop-navigation` example has a brand, a PillTabs row, a SearchField, the notification and settings actions, and, in its own description, *"the trailing cluster with an Avatar"*. The board review's account of the first ride report listed *"a tools cluster across the top: logo, pill tabs, a search pill with a keyboard shortcut, bell, settings and avatar"* as 27220417's inventory, and D4 removed it ([README.md](README.md), § Ride report). The spec example is that inventory without the keyboard shortcut. The shipping console 27658472's top-right cluster is also a search field, settings and a bell.

**Why it matters.** TopBar is unimplemented, so no screen draws it, and nothing is uncovered today. But this example is where `with-badge`'s genre defence (§9.4) would stop: put a badge on that bell, and the example is the reference's header. It is recorded so that whoever implements TopBar reads it before recording the first baseline.

**Action.** None now. That example must be reviewed before any release that ships it. Recomposing the example, for instance without the avatar or without the search field, is the cheap way to make that review easy. §9.9 conditions 3 and 5 cover it.

#### RD-8 — Not a distance matter: at compact density the badge covers a quarter of the glyph's box

**What.** At compact the circle is 32 px, with the 20 px glyph box centred 6 px in from its edges. The 20 px badge's box extends 4 px beyond the circle's top-trailing corner, so badge and glyph box overlap by 10 × 10 px, the box's top-trailing quarter. On the bell, that is the trailing half of the crown and the trailing shoulder. At regular density the overlap is 6 × 6 px. Compact is the default on the Mac and in the web showcase at desktop widths, so this is the picture a reader of either app sees first. IconButton.yaml says the badge *"never moves the glyph"*. It does not say the badge never covers it.

**Why it is recorded.** The reference's 18 px badge on a 44 px circle clears its glyph, so covering more of it moves the example away from the reference, not towards it. It is a legibility question for IconButton's owner, not a distance question.

**Action.** None here. A different offset, or a smaller badge at compact, would be an IconButton.yaml decision with baselines to move.

### 9.8 Coverage

| Component | Examples | Images | Reviewed in | Verdict |
|---|---|---|---|---|
| Button | 7 | 112 | §3.1. The 40 re-recorded images: §9.1 | not a copy |
| Surface | 8 | 140 | §3.2, §3.3, §3.5 | not a copy |
| Text | 6 | 124 | §3.9, §3.10 | not a copy |
| Card | 7 | 112 | §3.5–§3.8. The 64 re-recorded images: §9.1 | not a copy; RD-2 stands |
| Divider | 6 | 100 | §9.5.1 | not a copy |
| Icon | 11 | 228 | §9.5.2 | not a copy |
| Badge | 10 | 164 | §9.5.3 | not a copy; RD-6 |
| IconButton | 12 | 196 | §9.4 (`with-badge`, 16 images) and §9.5.4 (the other 180) | not a copy |
| **Total** | **67** | **1176** | | |

§7's list of out-of-scope sections still stands for the 49 components with no image, the three patterns and the documentation chrome, for the reasons §7 gives.

**The 67 examples, by id.** This list is what §9.9 condition 3 means by an example this document names. Each is read in the section the table above gives for its component.

- Button: `primary-md`, `secondary-md`, `ghost-sm`, `danger-md`, `loading`, `disabled`, `on-vivid`.
- Surface: `solid-card`, `vivid-default`, `vivid-pair`, `glass-over-map`, `glass-light-over-image`, `glass-selected`, `inverse-pill`, `accent-tile`.
- Text: `hero-metric`, `title-two-tone`, `caption`, `on-vivid`, `on-glass-over-map`, `data-tabular`.
- Card: `solid-metric`, `vivid-default-kpi`, `vivid-pair`, `glass-vehicle`, `glass-selected`, `tinted-focus`, `compact`.
- Divider: `horizontal`, `horizontal-inset`, `vertical`, `semantic`, `on-vivid`, `on-glass-over-map`.
- Icon: `control-md`, `corner-sm`, `display-lg`, `status-filled`, `accent-mark`, `inherit-in-row`, `decorative`, `named-standalone`, `on-vivid`, `on-glass-over-map`, `on-glass-light-over-image`.
- Badge: `count-neutral`, `count-critical`, `count-accent`, `count-overflow`, `outline-neutral`, `outline-critical`, `dot-critical`, `dot-accent`, `on-vivid`, `on-glass-over-map`.
- IconButton: `secondary-md`, `primary-md`, `ghost-md`, `plain-sm`, `danger-md`, `selected-in-group`, `lg-touch`, `disabled`, `on-vivid`, `on-glass-over-map`, `label-ru`, `with-badge`.

### 9.9 What this clearance covers, and when it expires

**It covers** the gallery on `main` at `deb6632`: all 1176 images, 67 examples and 8 components, including the 104 images re-recorded since 2026-09-22. It finds none of them a copy of any of the eleven reference shots.

**It expires, or stops covering part of the gallery, on any of these.** Items 3–6 replace §8's condition 3. §8's first two conditions stand.

1. **A pattern example screen lands**, as in §8 condition 1.
2. **P5-1 rebuilds the board screens into the gallery**, as in §8 condition 2.
3. **Any example this document does not name.** §9.8 names by id the 67 examples the gallery holds at `deb6632`, and no other example is covered. A new example of any component, and every example of a component whose first baselines land, is outside this clearance until a dated section here names it and reads it. A new variant of a reviewed example can be covered by a sentence added to its group. A new component needs a group of its own. (RD-5: §8 never said this.) — *2026-09-26: §10.7 names Avatar's twelve examples by id and §11.8 Chip's thirteen, so the examples this document names are §9.8's 67, §10.7's 12 and §11.8's 13. §12 covers the web's Reduce Transparency variant of 18 of them, and §14 the web's Increase Contrast variant of all 92, on `web-desktop` at regular density. Each later dated section adds its own list ([§10.9](#109-how-the-next-components-section-follows-this-one)).*
4. **An example other than `IconButton/with-badge` composes more than one component in §9.3's sense**: a second component in a slot the example fills. Examples: Card's `body` or `aside` filled (RD-2), a chart in a ChartContainer, a Badge in any host other than `with-badge`, a TabBar or Sidebar item with a count. `with-badge` itself is reviewed in §9.4; a change to what it fills is condition 5's or condition 6's.
5. **The notification composition moves towards the reference's bell** (RD-6, RD-7). That means any of these:
   - `with-badge`, or any IconButton with a badge, put on glass or over a map;
   - such a button given a critical-tone count or a count of 2;
   - such a button set in one composition with other round buttons: a Toolbar, a stack of map controls, a TopBar's trailing cluster. Specimens on separate stages of one page, as the gallery and both showcase apps show IconButton's twelve examples today, are not one composition;
   - `Badge/on-glass-over-map` joined to a button.
6. **A re-record after `deb6632` changes what an example draws**: an element added or removed, or a tone, a material or a glyph binding changed. The re-records before it, the 104 images of §9.1 and ADR-0035's rebinding (`d084a0e`) among them, are in what this section reviewed. A re-record that changes only how the same elements are drawn (a glyph path, a stroke width, antialiasing) does not expire it. That kind should still be compared as §9.1 compared the 104.

**It is not a legal opinion**, for the reasons §8 gives.

---

## 10. Review of Avatar's examples — 2026-09-26

- **Subject.** Avatar's **204 committed PNGs**, 108 Apple and 96 web, and the 108 cells that pair them in `gallery/index.html` and `gallery/index.json`. CI run 36201679261 recorded them, and `5522846` committed them (P4-7 3/3); CI run 36203923486 on that commit is green. With them the gallery holds 1380 images in 752 cells, 0 missing: 79 examples of 9 components (`gallery/index.json`, `counts`). This section reads the tree at `3fb52c9`, which changes none of those images (§10.1).
- **Why.** §9.9 condition 3. None of Avatar's twelve examples is among the 67 that §9.8 names, so from `5522846` on, the gallery held twelve examples outside this clearance. This time the gap was stated the day it opened: the P4-7 row and the baselines commit both say so, which is what condition 3 was rewritten for (RD-5).
- **Format.** As §9: what changed since the last dated section (§10.1), how the images were read (§10.2), which examples compose more than one component (§10.3), then per group what it is, the nearest reference by `references.json` shot id, the families mixed, what differs, and a verdict (§10.4). §10.5 gives one verdict per example. §10.9 says how the next component's section follows this one.
- **Rule 1.** No reference image was fetched, screenshotted or stored. The contact sheets, crops and page screenshots made for this section stayed in the session scratchpad, and none is committed.

### 10.1 What changed since 2026-09-23

| Change | Commits | Images | Reviewed before today? |
|---|---|---|---|
| Avatar landed: its spec settled, then both stacks, then its baselines | `f2f3982`, `1652695`, `d38e670`, `5522846` | 204 | no |
| Chip's spec settled and its code landed on both stacks, with no baseline yet. Its gallery section is still anchors. | `e2f9f5b`, `3fb52c9` | 0 | nothing to read in the gallery yet (§10.9) |
| Icon went to specVersion 3 (SD-7) and Button to 5 (G-24), and neither drew anything new | `37e445d`, `2f82fd1` | 0 | — |

Between `deb6632` and `3fb52c9`, a diff over both baseline roots adds the 204 Avatar images and modifies or removes none. Every image §9 read is unchanged, and Avatar's are the only new pixels in the gallery.

**§9.9's conditions, read against that diff.**
- Conditions 1 and 2 did not fire. No pattern has an implementation, and P5-1 has not started.
- Condition 3 fired for Avatar's twelve examples, and this section answers it. Chip's thirteen examples have no image yet; they fire it when P4-8's baselines land.
- Condition 4 did not fire. Avatar declares no slot, so no Avatar example can put a second component in one. Chip's `md-with-avatar` fills Chip's `avatar` slot with an Avatar, the first example of an implemented component since `IconButton/with-badge` to fill a slot. It fires condition 4 with its first image (§10.9).
- Condition 5 did not fire. Nothing in the diff touches a badge, a bell or the neighbours of a round button.
- Condition 6 did not fire. No baseline was re-recorded.

### 10.2 Method

- **Every image, on both stacks.** All 204 were opened. Each example got one contact sheet with its four scheme × density rows. Each row holds the `ios` image, its `increased-contrast` twin, its `reduce-transparency` twin where there is one, and both web platform keys, all at 2× nearest-neighbour. The circles and the map grounds were then opened again at 3–5×.
- **Decoded, not read by eye.** A PNG decoder read the page colour, each circle's box, its fills and the ring's pixels, the box and ink of the initials, and, on the Apple map grounds, the route's pixels along both of its legs. Every colour below is a decoded pixel. Every size is a decoded box or a token value, and each says which.
- **Byte comparisons.** Every `web-touch` image is byte-identical to its `web-desktop` twin (48 of 48), and `decorative` to `image-md` on both stacks (16 of 16). For `image-md`, `ringed`, `size-lg`, `decorative` and `fallback-icon`, the `increased-contrast` twin is byte-identical to the standard image in all four rows. For `ringed-over-map`, the `reduce-transparency` twin is byte-identical to the `increased-contrast` one.
- **The page.** The gallery page was opened in Chromium at 1440 px, in light and dark, from a scratchpad copy with `snapshots/<Component>/<file>` mapped to the committed baselines, as §9.2 did. All 204 images decode there.
- **The references.** The four shots the component inventory counts for Avatar (4 of 11: 27597487, 27678963, 27220417 and 27619812), from their written analyses. For the two map examples, the map layers of the traffic and incident consoles. The board's own review is used as a calibration point (§10.4.3). Two analyses also describe list rows with 40 px avatars in a video poster of a different product. The inventory does not count those, and neither does this section.
- **Gates, run with this section in the tree.** `pnpm lint:reference-copy`: exit 0, no reference UI copy, 143 denylist entries, 682 files. `pnpm icons:validate`: exit 0, registry valid, 30 generated files current. This section names two registry ids and none of Apple's symbol names, which ADR-0013 keeps out of documents.

### 10.3 Which Avatar examples compose more than one component

In §9.3's sense, none does: Avatar declares no slot. Each example is of one or two of §9.3's other kinds.

| Kind (§9.3) | Avatar examples | Why |
|---|---|---|
| A second component that the host draws as a part of its own anatomy | **Icon**, from the absence of a name: `fallback-icon`, whose `fallbackIcon` part draws `object.user`. **Text**, from `name`: the six examples that show letters, `initials-md`, `initials-one-word`, `size-sm`, `initials-over-map`, `on-glass-over-image` and `russian-initials`. Both stacks set the initials with Text in code (`Avatar.tsx`, `DSAvatar.swift`). | The example passes a string, not a component. The host draws the result in its own `initials` and `fallbackIcon` parts, and a reader sees one circle. |
| Staged inside a Surface, because the example declares a material | `on-glass-over-image`, whose `surface` is `glass` and whose `backdrop` is `image` | The harness wraps the avatar in a glass Surface of `radius.card` over the synthetic image. The Surface carries nothing but the avatar. |
| One component over a synthetic backdrop | `ringed-over-map` and `initials-over-map`, whose `surface` is `map` | The harness puts the avatar straight on the synthetic map, which the stage declares through `Backdrop` (`dsBackdrop` on Apple, ADR-0036 §8). The circle renders the glass chip itself. This is §9.3's fourth row, with one difference: there the component was itself a Surface, and here it is the Surface module's other shape, the chip (ADR-0036). |
| One component on the page ground, and nothing else | `image-md`, `initials-md`, `initials-one-word`, `fallback-icon`, `ringed`, `size-sm`, `size-lg`, `decorative` and `russian-initials` | — |

The portrait is not a component. It is SCHEMA's `portrait` fixture, a picture each gallery draws from tokens and hands to the `image` prop (`spec/SCHEMA.md`, "Slot content in examples"). So `image-md`, `ringed`, `size-lg`, `decorative` and `ringed-over-map` each draw one component.

The rows count 9 examples on the page ground, 7 with a part drawn by a second component, 1 inside a staging Surface and 2 straight on the map, which is 19 placements for 12 examples.

### 10.4 The groups

#### 10.4.1 The portrait circles — `image-md`, `ringed`, `size-lg`, `decorative`: 4 examples, 64 images

- **What it is.** One circle on the page ground, holding the `portrait` fixture:
  - **The portrait.** Back to front, decoded, the same on both stacks: a square in `color.chart.series.4`, teal at `(31, 143, 128)` in light and `(91, 200, 181)` in dark; the shoulders, an ellipse in `series.3`, at `(78, 108, 205)` and `(107, 132, 224)`; and the head, a circle in `series.2`, at `(184, 86, 26)` and `(243, 148, 68)`. Series slot 2 is the accent (`accent.700` in light, `accent.500` in dark), so the head is the brand's orange.
  - **Size.** The decoded boxes agree on both stacks. `image-md`, `ringed` and `decorative` are 40 at regular and 32 at compact (`size.control.md`), and `size-lg` is 44 and 40 (`size.control.lg`). Each circle is centred in its frame to the pixel.
  - **The ring.** `ringed` adds a ring flush inside the circle's edge, `border.strong` (1.5) in `comp.avatar.ring`, the inverse solid. Its outer pixel decodes `(13, 14, 17)` in light and `(255, 255, 255)` in dark on Apple, and the next pixel blends into the portrait. The circle's box does not grow (behavior 6).
  - **`decorative`** draws what `image-md` draws, byte for byte on both stacks. Only what it exposes to assistive technology differs. The name its description says is written beside it is not drawn.
  - **The frames.** On Apple, a tight crop with 24 pt of page around the circle (88 × 88 for md at regular). On the web, the story's stage (168 px).
  - **Increase Contrast** changes nothing in any of the four. Their twins are byte-identical.
- **Nearest reference.** The round photographs that the component inventory counts in four desktop shots:
  - the **traffic console 27220417**: a 44 px circle photo with no ring at the right end of its top bar, after a search pill and four 44 px round buttons (its analysis §5 and §6). The **incident console 27619812** re-posts those frames;
  - the **finance monitor 27597487**: a 36 px round photo in its header, trailing the utility icons, with a name at 13/400 and a grey role at 11/400 beside it;
  - the **finance dashboard 27678963**: a 44 px avatar with a 2 px ink ring at the foot of its left rail. Above it are six 44 px outline circles, a chevron expander and a support button (its analysis §1 and §6). This is `ringed`'s nearest reference. Avatar.yaml describes `ringed` as "the one active avatar in a rail", and its `notes.design` maps that 2 px ring to `border.strong`.
- **Families mixed.** The round photo at control height of the four desktop shots (the incident console's analysis: "44 px everywhere"), and the finance dashboard's ink-ringed rail avatar.
- **What differs.**
  - *No photograph, and no one in it.* Every reference avatar is a photograph of a person. The fixture is three flat token shapes, a head over shoulders, which is every platform's placeholder silhouette. SCHEMA forbids a file name or a URL in its place, so no photograph can reach the gallery through this prop.
  - *Colour.* Three flat chart-series colours: a teal ground, a periwinkle body and an orange head. The references' avatars carry whatever colours their photographs hold.
  - *Alone.* Each circle stands alone on the page. None has the bar, the rail, the neighbouring round buttons or the name-and-role lock-up that place every reference avatar.
  - *Geometry.* The size comes from density: 40 or 32 for md, 44 or 40 for lg, where the references use a fixed 36 or 44. `size-lg` at regular is exactly the references' 44, because 44 is also Prism's large control height (visual-dna §1 principle 13).
  - *The ring.* A 1.5 stroke inside the circle, and white in dark, where the reference's is a 2 px ink ring on a light page. It is a principle with a number (ADR-0015 rule 2), and it is the nearest part in the group.
- **Where the defence would stop.** `ringed` is not a copy because it stands alone.
  - A ringed avatar at the foot of a strip of outline circles, under an expander and beside a support control, would be the finance dashboard's rail. `Sidebar.yaml` specifies that strip in its `rail` example: RD-10.
  - An avatar at the trailing end of a row of round buttons after a search field would be the traffic console's top bar. RD-7 already names that cluster in `TopBar.yaml`. With Avatar implemented, TopBar, PillTabs and SearchField are its only parts still unbuilt.

  Both would fill a slot with an Avatar in a new example, so conditions 3 and 4 fire before either reaches a release.
- **Verdict.** **Not a copy**, each of the four. A token pictogram in a circle, alone on the page.

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 8 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 77): all four are byte-identical to their standard images. The verdict stands.*

#### 10.4.2 The lettered and glyph circles — `initials-md`, `initials-one-word`, `size-sm`, `russian-initials`, `fallback-icon`: 5 examples, 80 images

- **What it is.** One circle on the page ground in `comp.avatar.bg`, the raised step. It decodes `(247, 248, 250)` on a `(241, 242, 245)` page in light and `(35, 36, 38)` on `(13, 14, 17)` in dark, the same fill as IconButton's secondary puck (§9.4) without its ring. Inside it:
  - **Letters.** `initials-md` "AP" and `russian-initials` "АП", from the invented "Anna Petrova" and "Анна Петрова"; `initials-one-word` "N", from "Northgate", a site; and `size-sm`, "AP" at `sm`. They are upper case in `type.label.*` and `color.text.secondary`, which decodes `(92, 96, 104)` in light and `(176, 176, 177)` in dark on Apple, within four units on the web. Under Increase Contrast it goes to `(64, 68, 76)` and `(211, 211, 212)`. On both stacks the letters' box sits within a pixel of the circle's centre: "AP" is 17 × 9 on Apple and 17 × 10 on the web.
  - **A glyph.** `fallback-icon` draws the registry's `object.user`, an outline figure. On the web it is Phosphor's drawing, and on Apple it is the system symbol that the registry binds (ADR-0013). They decode at 16 × 16 and 15 × 17.
  - **Sizes.** 40 and 32 for md, 32 and 28 for `size-sm`, decoded on both stacks.
- **Nearest reference.** None as a composition. All four reference avatars are photographs, and no shot sets initials or a placeholder glyph in a circle. The move is the monogram that every contacts list and account menu draws when it has no photo.
- **Families mixed.** The round control height of the desktop shots, and the one upper-case exception to visual-dna §2.5, which Avatar.yaml records.
- **What differs.** Letters or a glyph on a neutral circle, with nothing around them. No shot carries Cyrillic.
- **Verdict.** **Not a copy**, each of the five. A monogram alone on a stage is nobody's expression.

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 10 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 78): the initials deepen, and `fallback-icon` is byte-identical. The verdict stands.*

#### 10.4.3 Over the map — `ringed-over-map`, `initials-over-map`: 2 examples, 40 images

- **What it is.** An md avatar straight on the synthetic map (§10.3). `ringed-over-map` is the portrait with the ring. `initials-over-map` is "AP" with no portrait, so that the chip itself is photographed. The two stacks stage it differently, and the difference is this section's main finding.
  - **The circle.** Over the map the circle is the Surface module's glass chip, blurred and with its edge (ADR-0036). `initials-over-map` shows it. In light it is a pale chip, `(222, 223, 228)` on Apple, with ink initials. In dark it is a smoked one, `(41, 43, 47)`, with white initials. The web's chip decodes differently because a different part of the map lies under it, as the P4-7 review recorded. In `ringed-over-map` the ring is `color.border.on-glass-fill`, which is translucent: its outer pixel decodes `(23, 85, 78)` in light and `(156, 222, 211)` in dark, where the page's `ringed` decodes `(13, 14, 17)` and `(255, 255, 255)`. Under Increase Contrast and Reduce Transparency the chip falls back to raised, and the ring to `comp.avatar.ring`, the inverse solid.
  - **The web.** A 136 px plate of the web map (128 at compact): a block field with two building rectangles, a park, a water lozenge and two crossed roads, with no route. The avatar sits at the plate's centre, next to the crossing of the two roads.
  - **Apple.** The tight crop draws the whole Apple map into 88 × 88 pt (80 at compact), and the avatar covers its centre. That is where both roads cross and where the route turns. `DSExampleMap` draws the route from 10 % of the width along the horizontal road to the centre, then up the vertical road to 12 % of the height (`swift/Sources/DSComponents/Examples/DSExampleStage.swift`). So in all 24 Apple images a 4 pt route, `color.map.route` on its casing, runs into the circle: `(13, 14, 17)` in light and `(255, 255, 255)` in dark, for 15 px from the leading side and 13 px from the top (16 and 14 at compact), decoded along each leg. Under the two forced states the ring of `ringed-over-map` takes the route's own colour and the two meet, which adds a pixel of route colour to each leg.
- **Nearest reference.** The consoles' maps:
  - the **traffic console 27220417**'s live map, which the **incident console 27619812** re-posts (the traffic analysis, §6 and §7). A 44 px vehicle puck, white at 85 %, with a dark navigation-arrow glyph and a soft shadow, sits inside a dashed radar ring about 60 px in radius. It rides a solid white 3 px route, beside a dashed planned route and an orange highlighted segment that glows. Category-coloured 24 px pins mark places, the ground is a desaturated satellite map, and a glass KPI card anchored beside the puck reads it out;
  - the **mini route map** in the same shot's vehicle card: a dark tile with a fine street grid, a white 2 px polyline with 90° bends, and a small white pin at its origin;
  - the **incident console 27571204**'s incident marker: a 32 pt red glass disc inside an 80 pt dashed red halo, on a road segment recoloured red.
- **Families mixed.** The consoles' round glass buttons over the map, whose fill is a white tint the map shows through (the incident analysis, mobile), and the traffic console's rule that glass appears only where it refracts something (its §9.6). Nothing of the consoles' markers is used: no heading arrow, no ring of dashes, no pin.
- **What differs.**
  - *What the mark is.* A person, not a vehicle: a portrait pictogram or two initials, where the reference's puck carries a heading. A person's position on a route is the genre of every location-sharing or delivery screen; a vehicle's is the reference's.
  - *What is around it.* No dashed ring or halo. `ringed-over-map`'s ring is a solid 1.5 stroke flush with the circle. No readout card stands beside the mark, and there are no pins, no planned route, no highlighted segment and no glow.
  - *The ground.* Four flat token colours (blocks with a building each, an elliptical park, a curved river, two roads) against a satellite photograph. On the web there is no route at all.
  - *The route.* One undashed polyline with one bend, the element §3.4 found in common, unchanged.
  - *Its size in the frame.* At 88 pt the circle is almost half the frame's width. The reference's mini map puts a small pin on a 110 px tile, and its live puck is a 44 px mark on a full-screen map.
- **Calibration.** The board's ride report, which the owner signed off on 2026-09-16, keeps more of 27220417's map than these images, and says so. Its list of what it keeps names "a dashed ring around a map object", "a vertical stack of round glass buttons on the map" and "an accent route segment with a glowing dot" ([README.md](README.md), "What it keeps of 27220417"), and its route has a start ring of the board's own. These images draw a route and one round mark on it, and nothing else from that list.
- **Verdict.** **Not a copy**, either example, on either stack. On Apple they are, with `IconButton/on-glass-over-map`, the nearest images in the gallery to 27220417's map. They are nearer than the ground §3.4 reviewed on its own, because a mark now stands on the route where §3.4 found "no endpoint of any kind". See **RD-9**.

*Pointer added 2026-09-26: since `29b5490` the web also records both examples under Reduce Transparency, 16 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them (rows 55–56): the circle falls back to opaque `raised` and the ring to the inverse solid, as this section says of Apple's. In light `initials-over-map` becomes a near-white disc, and §12.5 reads it against the puck. The verdict stands.*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 4 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 79): the fallback §12.5 read, with deeper initials on `initials-over-map`. The verdict stands.*

#### 10.4.4 On glass over the image — `on-glass-over-image`: 1 example, 20 images

- **What it is.** "AP" with the ring, on a glass Surface tile of `radius.card` over the synthetic image. On Apple the tile is 88 pt (64 at compact), in a 136 pt crop that the image fills edge to edge. On the web it is 88 px, on a 184 px image plate in a 312 px stage. Inside the glass the chip is flat, with its fill and edge and no blur, so no chip blurs glass a second time (ADR-0036 §5). It decodes `(237, 241, 244)` in light and `(18, 21, 25)` in dark on Apple. The ring is `color.border.on-glass-fill`, a grey whose outer pixel decodes `(140, 142, 144)` in light and `(137, 138, 140)` in dark. The initials are `color.text.on-glass-fill`, ink in light and white in dark. Under the forced states the tile falls back to raised, and the ring to the inverse solid: `(14, 15, 18)` in light and `(255, 255, 255)` in dark.
- **Nearest reference.** The consoles' round glass buttons over their maps, and the finance dashboard 27678963's outline circle on glass, a white ring at 28 % with a white glyph (its analysis §6). A portrait under glass appears in the traffic console's selected vehicle card, whose header is a driver's photograph behind blur. This example is the opposite arrangement: letters on glass, not a photograph under it.
- **Families mixed.** Glass where it refracts something, and a ring in the on-media stroke.
- **What differs.** One lettered circle on a tile, anchored to nothing and with nothing beside it. No reference sets initials, and none puts an avatar on glass.
- **Verdict.** **Not a copy.**

*Pointer added 2026-09-26: since `29b5490` the web also records this example under Reduce Transparency, 8 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them (row 57): the tile falls back to opaque `raised`, and the ring to the inverse solid. The verdict stands.*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 2 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 80): the fallback tile, with deeper initials. The verdict stands.*

### 10.5 Is any of these close enough to one product that a reasonable person would call it a copy?

Rows 19–30 continue §9.6's numbering, one row per example.

| # | Example | Copy? | Why |
|---|---|---|---|
| 19 | `image-md` (§10.4.1) | **No** | A token pictogram in a circle, alone. Every reference avatar is a photograph in a bar or a rail. |
| 20 | `initials-md` (§10.4.2) | **No** | A monogram on a raised circle. No reference sets initials. |
| 21 | `initials-one-word` (§10.4.2) | **No** | One letter, the same move. |
| 22 | `fallback-icon` (§10.4.2) | **No** | A vendor glyph on a raised circle. No reference draws a placeholder. |
| 23 | `ringed` (§10.4.1) | **No** | The nearest image on the page ground: the finance dashboard's ink-ringed rail avatar, without the rail. RD-10 names where that rail is specified. |
| 24 | `size-sm` (§10.4.2) | **No** | As row 20, at 32 and 28. |
| 25 | `size-lg` (§10.4.1) | **No** | As row 19. At regular it is 44, Prism's large control height and also the references' avatar size. |
| 26 | `decorative` (§10.4.1) | **No** | Byte-identical to `image-md` on both stacks. |
| 27 | **`ringed-over-map`** (§10.4.3) | **No, and on Apple one of the gallery's nearest images to a reference's map** | A portrait mark where the Apple route turns. What makes 27220417's puck a product's is absent: the heading arrow, the dashed ring, the readout card beside it, the satellite ground and the pins. RD-9. |
| 28 | **`initials-over-map`** (§10.4.3) | **No**, as row 27 | A glass chip with initials at the same bend. RD-9. |
| 29 | `on-glass-over-image` (§10.4.4) | **No** | A ringed monogram on a glass tile, anchored to nothing. |
| 30 | `russian-initials` (§10.4.2) | **No** | Cyrillic initials. No shot carries Cyrillic. |

**Summary.** No Avatar image at `5522846` is close enough to one product that a reasonable person would call it a copy. The nearest are the two map examples on Apple, which put a round mark where the synthetic route turns, and `ringed`, whose nearest reference is a rail avatar with an ink ring. In each, the part is present and the composition that makes the reference's part a product's is not. RD-9 and RD-10 say where that stops.

### 10.6 Findings of this review

#### RD-9 — On Apple, every example staged on the map sits where the synthetic route turns, and Avatar's two put a bare mark there

**What.** `DSExampleMap` turns its route at the centre of the ground: from (0.1 w, 0.5 h) along the horizontal road to the centre, then up the vertical road to (0.5 w, 0.12 h). The Apple stage centres every example, and its tight crop draws the whole map into the frame. So on Apple every example staged over the map covers the route's bend, 104 images in all. The pixels show three cases:
- **Avatar's two.** Nothing stands between the route and the mark: a 40 pt disc at the bend, with a 4 pt leg of 15 px from the leading side and one of 13 px from the top, decoded in all 24 images.
- **`Text`, `Divider`, `Icon`, `Badge` and `IconButton`'s `on-glass-over-map`.** One leg or both run into the glass tile that holds the component.
- **`Surface/glass-over-map`.** Its 200 pt slab covers the route whole.

The web map draws no route, so no web image shows any of this.

**Why it matters.**
1. §3.4 cleared the Apple ground partly on what it lacks: "no marker, no pin, no puck" and "no endpoint of any kind". That is still true of the ground, but it was never true of what the gallery stages on it. Since wave 1, `Icon/on-glass-over-map` has put a map-pin glyph where the route turns, and `IconButton/on-glass-over-map` a white disc with a dark locate glyph, each in a glass tile, and §9.5 reviewed both without saying where they sit. Neither verdict moves, because each is a tile rather than a mark on the route. But in dark, IconButton's is a white disc with a dark glyph where a white route turns, which is nearer the traffic console's puck in material than §9.5.4 said.
2. Avatar's two are the first bare marks on the route, and a round mark on a route is a position on a map. That is the genre of every location-sharing screen, while the reference's mark is a vehicle's. The distance rests on what is absent (§10.4.3). The gallery already holds most of the other parts, each in a different example: the route; a mark at its bend; a locate control and a pin on glass at the same point; a readout on glass over the map (`Surface/glass-over-map`, `Text/on-glass-over-map`); and a fleet-unit glass card over the image (`Card/glass-vehicle`, RD-2 item 3). A composition that put them together would be 27220417's live map part for part, apart from the satellite ground, the heading arrow and the dashed ring.

**What would help, and what it costs.** The one cheap change is in the harness: turn the Apple route somewhere other than the centre. It would move all 104 Apple map images through the sanctioned re-record route, and those re-records would fall under condition 6. It would buy little: a mark on a straight route still reads as a position on a map, and the route exists to put a high-contrast line under the glass (§3.4). This review does not recommend it on distance grounds, and it is not taken here, because this ticket changes no component and no harness. The finding is recorded so that §3.4's sentence is not read as a description of what the gallery shows on it. §10.8 condition 7 makes a composition that moves the mark towards the reference's an expiry condition.

*Pointer added 2026-09-26: since P4-10's re-record, `IconButton/on-glass-over-map` is a white disc with a dark glyph in dark only. In light it is the ink solid with a white glyph, the colour of Apple's light route, whose legs end at the tile's edge, 24 px of glass from the circle. [§15.5](#155-does-anything-here-move-an-earlier-verdict-or-finding) reads it. The finding stands.*

#### RD-10 — Sidebar's `rail` example specifies the finance dashboard's rail, and Avatar is its last missing part

**What.** Avatar.yaml describes `ringed` as "the one active avatar in a rail". Its nearest reference is the avatar with a 2 px ink ring at the foot of the finance dashboard 27678963's left rail: six 44 px outline circles and a chevron expander, then a support button and the avatar. `Sidebar.yaml` specifies that rail. Its `rail` variant is "the narrow strip of round buttons", its footer is "the bottom cluster - a support control, an Avatar", and its collapse control is an IconButton. Its own `notes.design` quotes the inventory's "icon rail of outline circles with an expander, a support button and an avatar". Its `rail` example sets `footer: true`.

**Why it matters.** Sidebar is unimplemented (P4-45), so no screen draws it and nothing is uncovered today. But it is where `ringed`'s defence stops, as TopBar's `desktop-navigation` is where `with-badge`'s does (RD-7). A ringed avatar at the foot of a strip of outline circles, under an expander and beside a support control, is that shot's rail. What `footer: true` draws is not settled yet: SCHEMA renders a slot given `true` as the one component its anatomy names, and this footer names two, so P4-25 decides it.

**Action.** None now. The `rail` example must be read in a dated section before any release that ships it, and condition 4 fires on it as soon as its footer holds an Avatar. Recomposing it is cheap while Sidebar is unimplemented: for instance a footer without the support control, a footer avatar without a ring, or a rail without the expander. The P4-45 row carries this.

### 10.7 Coverage

| Component | Examples | Images | Reviewed in | Verdict |
|---|---|---|---|---|
| Avatar | 12 | 204: 108 Apple, 96 web | §10.4.1 (`image-md`, `ringed`, `size-lg`, `decorative`: 64 images), §10.4.2 (`initials-md`, `initials-one-word`, `size-sm`, `russian-initials`, `fallback-icon`: 80), §10.4.3 (`ringed-over-map`, `initials-over-map`: 40) and §10.4.4 (`on-glass-over-image`: 20) | not a copy; RD-9, RD-10 |
| The eight components of §9.8 | 67 | 1176 | §9.8 | unchanged since `deb6632` (§10.1) |
| **Total** | **79** | **1380** | | |

§7's list of sections with no image now stands for 48 components, Chip among them until its baselines land, and for the three patterns and the documentation chrome, for the reasons §7 gives.

**The 12 examples, by id.** Together with §9.8's 67, this list is what §9.9 condition 3 means by an example this document names.

- Avatar: `image-md`, `initials-md`, `initials-one-word`, `fallback-icon`, `ringed`, `size-sm`, `size-lg`, `decorative`, `ringed-over-map`, `initials-over-map`, `on-glass-over-image`, `russian-initials`.

### 10.8 What this clearance covers, and when it expires

**It covers** the gallery at `5522846`, unchanged at `3fb52c9`: all 1380 images, 79 examples and 9 components. That is the 67 examples §9 read and the 12 this section reads. It finds none of them a copy of any of the eleven reference shots.

**It expires, or stops covering part of the gallery, on any of these.** §9.9's six conditions stand, condition 3 is read as below, and condition 7 is new.

- **Condition 3, read with this section: any example no dated section names.** §9.8 names 67 examples by id, and §10.7 names 12. A later section that reviews a component adds its own list (§10.9), and an example on none of the lists is outside this clearance. The rest of §9.9 condition 3 stands as written.
- **Condition 7, new: a mark on the map moves towards 27220417's** (RD-9). That means any of these:
  - a mark staged on the map ground given a heading arrow, a vehicle glyph (`object.bus`) or a vehicle identifier;
  - a dashed ring or a halo drawn around anything on the map ground;
  - a glass readout card or tile set beside a mark on the map, in one composition. A pattern screen or P5-1's rebuilt ride report already expires this clearance by condition 1 or 2, and this names what their review has to read;
  - the synthetic map gaining a second route, the dashed route ahead (`color.map.route-ahead`), an accent segment, a glow or pins;
  - the `portrait` fixture gaining a photograph or a face.

RD-10's rail is covered by conditions 3 and 4, as RD-7's cluster is by conditions 3 and 5.

**It is not a legal opinion**, for the reasons §8 gives.

### 10.9 How the next component's section follows this one

Chip (P4-8) lands its baselines next. Its section, and each one after it, does what this one did:

1. **Subject and why.** The component's images, the commit that recorded them, and the condition that fired.
2. **What changed since the last dated section.** A diff over both baseline roots from the last section's commit: every image added, modified or removed, and each condition of §9.9 and §10.8 read against it.
3. **Method.** Every image opened on both stacks, every colour and box it quotes decoded, the gallery page opened, and the two gates run with the section in the tree.
4. **Composition.** Each example filed under §9.3's kinds.
5. **Groups, verdicts, findings and coverage.** A group for each set of examples a reader perceives as one, and one verdict per example continuing §10.5's numbering from row 31. Findings are numbered from RD-11. The examples are listed by id, which is the list condition 3 reads.
6. **Tracking.** The list of dated sections at the top of this document, the P5-2 row, the component's own row, `docs/legal-checkpoint.md` §5.2, and the conditions in force in the board's [README.md](README.md).

For Chip in particular, four things are already known, three of them from its spec. None of them is a verdict.
- `md-with-avatar` fills Chip's `avatar` slot with an Avatar, so it fires condition 4. The Avatar in it is read here only as a component on its own (§10.4.2), not as it sits in a chip.
- `on-map` and `selected-on-map` stand straight on the map ground, so on Apple they will sit where the route turns (RD-9, condition 7).
- `identifier-copy` labels a chip "B-4417", with the invented unit number of `Card/glass-vehicle`, which RD-2 item 3 places in 27220417's genre.
- Both showcase apps have staged Chip's thirteen examples since `3fb52c9`. What that fires is read by the showcase review's §12.7, not by this document.

*Pointer added 2026-09-26: Chip's section is [§11](#11-review-of-chips-examples--2026-09-26), written from this checklist. The showcase review's [§13](reference-distance-showcase.md#13-re-review-of-the-avatar-and-chip-pages--2026-09-26) reads what the apps' Avatar and Chip pages fire.*

---

## 11. Review of Chip's examples — 2026-09-26

- **Subject.** Chip's **224 committed PNGs**, 120 Apple and 104 web, and the 120 cells that pair them in `gallery/index.html` and `gallery/index.json`. CI run 36207346174 on `3fb52c9` recorded them, and `5b1663c` committed them (P4-8 3/3). With them the gallery holds 1604 images in 872 cells, 0 missing: 92 examples of 10 components (`gallery/index.json`, `counts`).
- **Why.** §9.9 condition 3, read with §10.8, for all thirteen examples, and condition 4 for `md-with-avatar`, which fills Chip's `avatar` slot with an Avatar. §10.9 and the baselines commit both said so before this section.
- **Format.** §10.9's checklist, item by item. §11.4 reads the slot example in full, as §9.4 read `IconButton/with-badge`, and §11.6 gives one verdict per example.
- **Rule 1.** No reference image was fetched, screenshotted or stored. The contact sheets, crops and page screenshots made for this section stayed in the session scratchpad, and none is committed. No reference string is quoted: the analyses quote several of the chips' labels, and those are on the `lint:reference-copy` denylist.

### 11.1 What changed since §10's tree

| Change | Commits | Images | Reviewed before today? |
|---|---|---|---|
| Chip's baselines | `5b1663c` | 224 | no |
| On Apple a removable chip's remove control is read after the chip. It is an accessibility change that draws nothing. | `8205c8f` | 0 | — |

Between `3fb52c9` and `5b1663c`, a diff over both baseline roots adds Chip's 224 images and modifies or removes none. Every image §9 and §10 read is unchanged.

**The conditions, read against that diff.**
- Conditions 1 and 2 did not fire. No pattern has an implementation, and P5-1 has not started.
- Condition 3 fired for Chip's thirteen examples, and this section answers it.
- Condition 4 fired for `md-with-avatar`, and §11.4 answers it.
- Condition 5 did not fire. No example touches a badge, a bell or a round button's neighbours.
- Condition 6 did not fire. No baseline was re-recorded, and `8205c8f` draws nothing. CI run 36210049257 on `5b1663c` compared every committed image on both stacks and is green, so each draws exactly what its baseline holds.
- Condition 7 did not fire by its letter. `on-map` and `selected-on-map` carry a map pin and a place word, not a heading arrow, a vehicle glyph or a vehicle identifier, and nothing draws a ring or a card beside them. On Apple they sit where the route turns, and §11.5.3 reads them in RD-9's terms.

### 11.2 Method

- **Every image, on both stacks.** All 224 were opened, one contact sheet per example, laid out as §10.2's were. The pills, the Avatar inside `md-with-avatar` and the two map grounds were then opened again at 3–5×.
- **Decoded, not read by eye.** Each pill's box, its stroke, its fill and its label's ink; the Avatar's circle inside `md-with-avatar`; and on Apple, the route's pixels under the two map examples. Every colour below is a decoded pixel. Every size is a decoded box or a token value.
- **Byte comparisons.** `web-touch` is byte-identical to `web-desktop` in 49 of 52 pairs. The other three are `on-map`, `selected-on-map` and `on-vivid`, each in dark at regular density. They differ by one code value in 0.75–0.80 % of their pixels, all inside the pill's box. No `increased-contrast` twin equals its standard image, because the fallback changes every stroke and ink.
- **The page.** The gallery page was opened in Chromium at 1440 px, in light and dark, as §10.2 did. All 224 images decode there.
- **The references.** The component inventory's Chip row: 8 of 11 shots, and a list of sightings that `Chip.yaml`'s own design note draws on. The analyses behind each sighting were read: the traffic console's plate chip and its filter pills over the map, the shipping console's number chip, the incident console's copy-id affordance, the finance monitor's period chips, and the bottle tracker's label pills.
- **Gates, run with this section in the tree.** `pnpm lint:reference-copy`: exit 0, no reference UI copy, 143 denylist entries, 682 files. `pnpm icons:validate`: exit 0, registry valid, 30 generated files current. This section names five registry ids and none of Apple's symbol names.

### 11.3 Which Chip examples compose more than one component

| Kind (§9.3) | Chip examples | Why |
|---|---|---|
| **A second component, in a slot the example fills** | `md-with-avatar`: an Avatar, named "Anna Petrova", in the `avatar` slot, which `Chip.yaml` types as an Avatar (ADR-0034's form). | **Yes.** It fires condition 4, and §11.4 reads it. |
| A second component that the host draws as a part of its own anatomy | **Text**, from `label`, in all thirteen. **Icon**, from a registry id: `with-leading-icon` (`action.filter`), `md-size` and `on-map` (`object.map-pin`), `identifier-copy` (`action.copy`), `removable` (`nav.close`, the remove control), and `selected-on-map` (`status.check`, which a chip selected over media draws). | The example passes a string or an id. The host draws it in its own `label`, `leadingIcon`, `trailingIcon` or remove part, and a reader sees one pill. |
| Staged inside a Surface, because the example declares a material | `on-vivid` (vivid) and `on-glass-over-image` (glass over the image) | The Surface carries nothing but the chip. |
| One component over a synthetic backdrop | `on-map` and `selected-on-map` | As §10.3's third row: the pill renders the glass chip itself. |
| One component on the page ground, and nothing else | `default-sm`, `selected`, `with-leading-icon`, `removable`, `identifier-copy`, `md-size`, `disabled`, `md-with-avatar` and `russian-label` | — |

### 11.4 `Chip/md-with-avatar`

- **What it is.** The props are `label: "Anna Petrova"`, `size: md` and `avatar: { name: "Anna Petrova" }`. On screen:
  - **The pill.** An md chip in `comp.chip.bg.rest`, the raised step: `(247, 248, 250)` in light and `(35, 36, 38)` in dark, inside a hairline. It is 141 × 40 at regular density and 135 × 32 at compact, decoded on both stacks. The label is `color.text.secondary`.
  - **The Avatar.** Chip draws it at size sm and decorative, concentric with the pill's leading end: a 32 circle 4 in from the pill's edge at regular density, and a 28 circle 2 in at compact, decoded. It shows the initials "AP". In light the circle is the Avatar's raised step on the chip's own, so only the letters show. In dark it shows as a lighter disc, `(55, 56, 58)` on the chip's `(35, 36, 38)`.
  - **Nothing else.** The Avatar is hidden from assistive technology, and the chip's name is its label: on the web the stage holds one button, named "Anna Petrova" (showcase §13.1).
  - **Its frame.** Alone. At regular density it is a 189 × 88 pt tight crop on Apple and a 269 × 168 px stage on the web.
- **Nearest reference.**
  - The **traffic console 27220417**'s plate chip, which the **incident console 27619812** re-posts. It is a pill holding a route letter in a darker circle at its leading end, and the vehicle's number after it: 26 px tall, white at about 15 % on the vehicle card, with a 22–26 px circle and 13 px digits (the traffic analysis §6, the incident analysis's component table). The inventory lists it as "identifier with a letter disc". It sits over the vehicle card's wireframe drawing, and it heads the rows of the route-offset table.
  - The **finance monitor 27597487**'s identity lock-up: a 36 px round photo with a name and a role beside it (§10.4.1).
- **Families mixed.** The plate chip's anatomy, a disc concentric with a pill's leading end; the round avatar of the desktop shots; and Chip's control-height pill.
- **What differs.**
  - *Subject.* A person: two initials and a full name, where the plate chip holds a route letter and a vehicle number. `Chip.yaml`'s description calls the example "an identifier chip", which is the plate chip's role, but what this one identifies is a person.
  - *Size and material.* 40 or 32 tall with a 32 or 28 circle, against 26 with a 22–26 circle. It is a raised pill with a hairline on the page, where the plate chip is a translucent pill on a card. In light its disc does not show at all.
  - *Placement.* Alone on the page. The plate chip sits on a line drawing of a bus beside a status pill and signal indicators, or heads a table row.
- **Is the commonness a defence? Yes.** A pill with a round avatar at its leading end and a person's name after it is the recipient token of every mail client and the avatar input chip of every design system. A reasonable person recognises that genre, not the plate chip.
- **Where the defence would stop.** When the disc holds one letter and the label is a vehicle's number or a plate, which is the plate chip's content in its own form. Avatar gives one letter for a one-word name (§10.4.2), so a one-word avatar name beside a number would get there. It also stops when the chip is placed as the plate chip is: over a vehicle drawing, in a card that identifies a vehicle, or as a table's row header. RD-11, and §11.9 condition 8.
- **Verdict.** **Not a copy.** It is the genre's person chip, drawn alone, with the reference's anatomy and none of its content or placement.

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 2 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 81): the pill's stroke, the label and the initials deepen, and the anatomy does not change. RD-11 stands. The verdict stands.*

### 11.5 The other twelve examples

#### 11.5.1 The page chips — `default-sm`, `selected`, `with-leading-icon`, `removable`, `md-size`, `disabled`, `russian-label`: 7 examples, 112 images

- **What it is.** One pill on the page ground, in the raised step inside a hairline: the hairline decodes `(224, 225, 227)` in light and `(53, 54, 55)` in dark, and the label is `color.text.secondary`. The pills are sm, 32 at regular density and 28 at compact; `md-size` is md, 40 and 32. The examples vary one thing each:
  - `selected` and `russian-label` are filter chips that are on. Their ring is `border.strong`, its outer pixel `(142, 143, 145)` in light and `(112, 113, 114)` in dark, and the label is `color.text.primary`. The pill does not fill.
  - `with-leading-icon` leads with `action.filter`, and `md-size` with `object.map-pin`.
  - `removable` ends in `nav.close`, which is its own control, named "Remove North yard" on the web.
  - `disabled` dims the whole chip.
  - The labels are "Last 24 hours" (on `default-sm`, `selected` and `disabled`), "Routes", "North yard", "Depots" and "Последние 24 часа", which widens its pill rather than truncating.
- **Nearest reference.**
  - The **finance monitor 27597487**'s period chips, flush right in the header of its dark chart band. They are transparent pills with a 1 px stroke: the selected one at full-strength stroke and label, the rest at 28 % and 70 % white (its analysis, components). The phone shot 27696584 has a row of the same chips under its floating toolbar. The inventory's words are "period filter chips (selected = full-strength stroke and label)", and `Chip.yaml`'s design note takes `selected`'s grammar from them.
  - The traffic console's filter pills with a leading icon (§11.5.3), for `with-leading-icon` and `md-size`.
- **Families mixed.** The period chip's ladder of stroke and label, which is a principle with a number (ADR-0015 rule 2), and the pill grammar of all eleven shots (visual-dna §1 principle 2).
- **What differs.** Each chip stands alone on the page, never in a row of periods beside a chart's title. The pill is raised, not transparent. None of the words is the reference's, and one is Cyrillic.
- **Where the defence would stop.** A row of period chips flush with a chart's title in a dark band over a step chart would be the finance monitor's chart header. No spec composes that today.
- **Verdict.** **Not a copy**, each of the seven. A filter pill alone on a stage is every date-range picker's.

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 14 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 82): strokes and labels deepen, on pills that keep their fills. The verdict stands.*

#### 11.5.2 `identifier-copy`: 1 example, 16 images

- **What it is.** "B-4417" and a trailing `action.copy`, in a raised sm pill of 86 × 32 (86 × 28 at compact), alone on the page. Its description says a press copies the identifier, and its name is the identifier: on the web, one button named "B-4417".
- **Nearest reference.**
  - The **shipping console 27658472**'s number chip: a 64 × 22 stadium, white at 15 % inside a 1 px white 20 % stroke, holding a truncated number and a copy glyph, in each cell of its container grid (its analysis, components). The inventory lists it as "identifier with a copy glyph".
  - The **incident console 27571204**'s copy-id affordance: a truncated hash at 55 % with a two-square copy icon, in the title of its bottom sheet.
  - The traffic console's plate chip (§11.4), a letter and a vehicle number in a pill.
- **Families mixed.** The two consoles' pairing of an identifier with a copy glyph, and the plate chip's letter-and-digits identifier.
- **What differs.** Alone, and not truncated. There is no letter disc. The pill is raised on the page, not in a cell or a sheet.
- **Genre: the test RD-2 item 3 applies.** The number is 4417, the invented unit number of `Card/glass-vehicle` ("Unit 4417"), which RD-2 item 3 places in shot 27220417's own subject matter. With a one-letter prefix it reads as a fleet identifier, and the reference's vehicles are identified by a word or a letter followed by four or five digits. The copy distance is clean: the string is invented, the reference's identifiers are on the denylist, and `lint:reference-copy` passes. The genre distance is the thinnest in the Chip set. RD-12.
- **Verdict.** **Not a copy**, and the nearest of the thirteen in genre.

*Pointer added 2026-09-26: this group describes "B-4417". RD-12 was taken at `e56272f`, and the example now reads "INV-209316", an invoice number. [§13](#13-re-review-of-the-identifier-chip-after-rd-12s-relabel--2026-09-26) reads its 16 re-recorded images. The genre bullet above no longer applies to it, and row 35's verdict becomes a plain "No".*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 2 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 83): "INV-209316" with a deeper stroke and label. The verdict stands.*

#### 11.5.3 Over the map — `on-map`, `selected-on-map`: 2 examples, 40 images

- **What it is.** The pill straight on the synthetic map, where it renders the glass chip: "Depots" after a map pin in `on-map`, and "Depots" selected in `selected-on-map`, where the check a chip selected over media draws takes the leading slot. Every tone on the pill collapses to the glass foreground. On Apple the light pill decodes `(217, 219, 223)` with an ink label and stroke, and the dark one `(42, 44, 49)` with a white label. Under Increase Contrast and Reduce Transparency the pill falls back to the raised step inside a hairline, and the selected chip drops its check.
  - **The web.** A 183 × 128 px plate of the web map (124 high at compact), with no route, and the pill at its centre.
  - **Apple.** The tight crop draws the whole map into 136 × 80 pt (76 at compact), and the pill covers its centre, where the route turns. In all 24 Apple images the route runs into the pill: 10–14 px of it from the leading side and 14 px from the top, decoded along each leg.
- **Nearest reference.** The **traffic console 27220417**'s filter pills over its map: glass, 44–48 px, a 20 px leading icon and a trailing chevron, holding a vehicle identifier or the name of a map (its analysis §6). Two of them sit in the map's region, which its analysis describes as "nothing but the map, the title, two filter pills, one floating glass card and three zoom buttons" (§5). The **incident console 27571204** puts a glass chip with a leading icon and a chevron at the top of its phone map. The inventory's words are "filter chip with a leading icon over a map", which `Chip.yaml`'s design note names.
- **Families mixed.** The consoles' glass controls over a map, and the map pin as a category mark.
- **What differs.** A place category and a map pin, never a vehicle's identifier, and no chevron. Each pill stands alone. On Apple it sits where the route turns; the reference's pills sit at the top of the map, away from any route.
- **RD-9, continued.** These are the third kind of mark on the Apple route's bend, after wave 1's tiles and Avatar's two discs: a labelled pill. With them the gallery holds most of 27220417's map region, one part per example: the filter pill (Chip), a marker (Avatar), a pin (Icon), a locate control (IconButton), a glass card over the map (Surface) and the route. RD-9's count of Apple map images is now 128. §11.9 extends condition 7 to the region.
- **Verdict.** **Not a copy**, either example, on either stack.

*Pointer added 2026-09-26: since `29b5490` the web also records both examples under Reduce Transparency, 16 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them (rows 58–59): the pill falls back to opaque `raised`, and the selected one drops its check. The verdict stands.*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 4 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 84): the fallback pill, with a deeper stroke; selected, it has no check. The verdict stands.*

#### 11.5.4 On media — `on-vivid`, `on-glass-over-image`: 2 examples, 40 images

- **What it is.**
  - `on-vivid`: "Yield" on a vivid Surface. The pill is the glass chip over the gradient, `(122, 143, 195)` over the light slot and `(48, 32, 56)` over the dark one, inside the on-media stroke.
  - `on-glass-over-image`: "In service" as a flat chip on a glass Surface tile over the synthetic image. It decodes `(238, 242, 244)` in light and `(18, 21, 25)` in dark, inside a grey stroke.
  - Under the forced states both fall back to the raised step.
- **Nearest reference.** The **bottle tracker 27619760**'s label pills on its renders: 22 pt capsules of light glass, white at 40 % inside a white ring, which refract the image beneath them (its analysis, components). For "In service", the outlined status pill in the status row of the traffic console's glass vehicle card: "In service" is the status word that visual-dna §4.3 invented for Prism's version of that card.
- **Families mixed.** Glass where it refracts something; the ring in the on-media stroke.
- **What differs.** One pill on one tile, anchored to nothing. It carries no status colour, and no card, title or timestamp surrounds it. "In service" belongs to RD-2 item 3's genre only as a word.
- **Verdict.** **Not a copy**, either example.

*Pointer added 2026-09-26: since `29b5490` the web also records both examples under Reduce Transparency, 16 images. [§12](#12-review-of-the-webs-reduce-transparency-images--2026-09-26) reads them (rows 60–61): the pill falls back to opaque `raised`, and on vivid the bloom goes. The verdict stands.*

*Pointer added 2026-09-26: the web now records this group's Increase Contrast twins too, on `web-desktop` at regular density, 4 images. [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them (row 85): the fallback pill, with a deeper stroke; `on-vivid` keeps vivid's bloom. The verdict stands.*

### 11.6 Is any of these close enough to one product that a reasonable person would call it a copy?

Rows 31–43 continue §10.5's numbering, one row per example.

| # | Example | Copy? | Why |
|---|---|---|---|
| 31 | `default-sm` (§11.5.1) | **No** | A period filter at rest, alone. |
| 32 | `selected` (§11.5.1) | **No** | The finance monitor's selected-period grammar, a principle with a number, on one chip with no row and no chart. |
| 33 | `with-leading-icon` (§11.5.1) | **No** | A filter pill with a glyph, on the page. |
| 34 | `removable` (§11.5.1) | **No** | An input chip with its own remove control; no shot draws one. |
| 35 | **`identifier-copy`** (§11.5.2) | **No, and the nearest of the thirteen in genre** | An identifier with a copy glyph is a two-console grammar, and the string is invented. But it is the gallery's fleet unit number in a vehicle-style identifier. RD-12. |
| 36 | `md-size` (§11.5.1) | **No** | As row 33, at md. |
| 37 | `disabled` (§11.5.1) | **No** | A dimmed chip. |
| 38 | **`md-with-avatar`** (§11.4) | **No** | The genre's person chip. It has the plate chip's anatomy, a disc at the leading end, and none of its content or placement. RD-11. |
| 39 | `on-map` (§11.5.3) | **No** | A glass filter pill, alone. On Apple it sits where the route turns (RD-9). |
| 40 | `selected-on-map` (§11.5.3) | **No**, as row 39 | |
| 41 | `on-vivid` (§11.5.4) | **No** | A glass label pill on a vivid tile. |
| 42 | `on-glass-over-image` (§11.5.4) | **No** | A flat pill on a glass tile, anchored to nothing. |
| 43 | `russian-label` (§11.5.1) | **No** | As row 32, in Cyrillic. |

**Summary.** No Chip image at `5b1663c` is close enough to one product that a reasonable person would call it a copy. The set does map closely onto the references' chips: four of the inventory's sightings each have an example (period filters, a filter over a map, an identifier with a copy glyph and an identifier with a disc), and `Chip.yaml`'s design note says where most of them come from. Each example is one pill on its own, so the distance is in the arrangement and the content, as it was for the metric cards (RD-2). The two nearest are `identifier-copy` on genre (RD-12) and `md-with-avatar` on anatomy (RD-11).

### 11.7 Findings of this review

#### RD-11 — `Chip/md-with-avatar` is the plate chip's anatomy with a person in it

**What.** The traffic console's plate chip is a pill with a letter disc concentric with its leading end and an identifier after it. `md-with-avatar` has that anatomy, and `Chip.yaml` calls it "an identifier chip". What fills it is a person's initials and name, which makes it the recipient-token genre of every mail client rather than a vehicle's plate (§11.4).

**Why it matters.** The defence rests on the content and the placement, and both are one prop away. An Avatar shows one letter for a one-word name (§10.4.2). A chip whose disc holds one letter beside a vehicle's number, or a chip placed over a vehicle drawing, in a card that identifies a vehicle, or as a table's row header, would be the plate chip.

**Action.** None now. §11.9 condition 8 makes any of those an expiry condition.

#### RD-12 — `Chip/identifier-copy` puts the gallery's fleet unit number in a vehicle-style identifier with a copy glyph

**What.** "B-4417" pairs a one-letter prefix with 4417, the invented unit number of `Card/glass-vehicle`, and a trailing copy glyph. The reference identifies its vehicles by a word or a letter with four or five digits (§11.5.2). Two consoles pair an identifier with a copy glyph, one of them in a chip.

**Why it matters.** It is the same genre question RD-2 item 3 asks of `Card/glass-vehicle`, now in a second component. The two examples share the number, so the gallery's fleet genre is no longer one example's subject but a recurring identifier. Copy distance is clean. Genre distance is not a copy either, but it is thinner than anywhere else in the Chip set.

**What would help. Cheap, and not required.** Relabel the example with an identifier outside the fleet genre, one that no other example uses, such as an order, invoice or batch number. That is one `Chip.yaml` example edit. It moves 16 baselines (8 Apple, 8 web) through the sanctioned re-record route, and condition 6 then asks for them to be compared as §9.1 compared the 104. Doing it with RD-2 item 3's re-subjecting of `glass-vehicle` would remove the gallery's only shared fleet identifier. It is not taken here: this ticket changes no spec and no component.

*Pointer added 2026-09-26: RD-12 is taken. The commit that adds this pointer relabels `identifier-copy` "INV-209316", an invoice number that no other example uses. Its shape keeps it out of §11.5.2's genre as well as its word: a document prefix and six digits, where the reference names a vehicle by a word or a letter with four or five digits, and neither the shipping console's numbered chip nor the incident console's hash. TextField's and ListRow's "B-4417", which no stack implements, becomes the batch number "318204", so no example puts the fleet unit number in a vehicle-style identifier any more. `Card/glass-vehicle`'s "Unit 4417" and the other 4417s stand, and remain RD-2 item 3's to decide. Both showcase apps show the new label from this commit, which fires showcase §13.8 condition 8. The 16 images, 8 Apple and 8 web, keep "B-4417" until CI re-records them. §9.9 condition 6 then asks for a dated section that reads the new images beside the old ones, as §9.1 read the 104, and that section answers both conditions. It is [§13](#13-re-review-of-the-identifier-chip-after-rd-12s-relabel--2026-09-26): none of the 16 is a copy, and RD-12 is closed.*

### 11.8 Coverage

| Component | Examples | Images | Reviewed in | Verdict |
|---|---|---|---|---|
| Chip | 13 | 224: 120 Apple, 104 web | §11.4 (`md-with-avatar`: 16 images), §11.5.1 (112), §11.5.2 (`identifier-copy`: 16), §11.5.3 (40) and §11.5.4 (40) | not a copy; RD-9, RD-11, RD-12 |
| The nine components of §9.8 and §10.7 | 79 | 1380 | §9.8, §10.7 | unchanged since `3fb52c9` (§11.1) |
| **Total** | **92** | **1604** | | |

§7's list of sections with no image now stands for 47 components, the three patterns and the documentation chrome.

**The 13 examples, by id.** Together with §9.8's 67 and §10.7's 12, this list is what §9.9 condition 3 means by an example this document names.

- Chip: `default-sm`, `selected`, `with-leading-icon`, `removable`, `identifier-copy`, `md-size`, `disabled`, `md-with-avatar`, `on-map`, `selected-on-map`, `on-vivid`, `on-glass-over-image`, `russian-label`.

### 11.9 What this clearance covers, and when it expires

**It covers** the gallery at `5b1663c`: all 1604 images, 92 examples and 10 components. That is the 67 examples §9 read, the 12 §10 read and the 13 this section reads. It finds none of them a copy of any of the eleven reference shots.

**It expires, or stops covering part of the gallery, on any of these.** §9.9's six conditions stand, condition 3 is read with §10.8 and §11.8's lists, condition 4 now names `md-with-avatar` beside `with-badge`, condition 7 is extended, and condition 8 is new.

- **Condition 4, read with this section: an example other than `IconButton/with-badge` and `Chip/md-with-avatar` composes more than one component in §9.3's sense.** `md-with-avatar` itself is reviewed in §11.4. A change to what it fills is condition 6's or condition 8's.
- **Condition 7, extended: a mark on the map moves towards 27220417's, or the map's region is composed** (RD-9). It holds §10.8's five items, plus one: a Chip filter pill set over the map in one composition with round map controls, a glass card or a mark. That is the traffic console's map region: two filter pills, one glass card and three zoom buttons over the map.
- **Condition 8, new: an identifier chip moves towards the reference's plate chip** (RD-11, RD-12). That means any of these:
  - an Avatar in a chip that shows one letter beside a vehicle's number or a plate;
  - an identifier chip set over a vehicle drawing, in a card that identifies a vehicle, or as a table's row header;
  - an identifier truncated with an ellipsis beside its copy glyph.

**It is not a legal opinion**, for the reasons §8 gives.

The next component's section follows §10.9. Its verdict rows start at 44 and its findings at RD-13. *Pointer added 2026-09-26: §12, a section on new variants, used rows 44–61, so the next section's rows start at 62.*

---

## 12. Review of the web's Reduce Transparency images — 2026-09-26

- **Subject.** The **144 web images** that P4-D9 added: one `reduce-transparency` twin per web platform key, scheme and density of each of the 18 examples that render glass, at `web/apps/vrt/baselines/linux/<Component>/<id>.<platform>.<scheme>.<density>.reduce-transparency.png`. CI run 36212117968 on `3d5c4b2` recorded them, and `29b5490` committed them (P4-D9 2/2). They fill the web half of the 72 Reduce Transparency cells, which until then held Apple's image alone. The gallery now holds 1748 images in 872 cells, 0 missing, and still 92 examples of 10 components (`gallery/index.json`, `counts`).
- **Why.** §9.9 condition 3: *"A new variant of a reviewed example can be covered by a sentence added to its group."* Each of the 144 is a new variant of an example that §9.8, §10.7 or §11.8 names. §12.4 gives the sentence for each example, and each group's section carries a pointer to it. The P4-D9 row and `29b5490` both said so the day the images landed.
- **Format.** §10.9's checklist, adapted to a variant: what changed (§12.1), how the images were read (§12.2), what the fallback draws (§12.3), one verdict per example (§12.4), and whether anything moves an earlier verdict or finding (§12.5).
- **Rule 1.** No reference image was fetched, screenshotted or stored. The contact sheets, crops and page screenshots made for this section stayed in the session scratchpad, and none is committed.

### 12.1 What changed since §11's tree

| Change | Commits | Images | Reviewed before today? |
|---|---|---|---|
| The web photographs every glass example once more under Reduce Transparency. The stories carry a `glass` tag read from the spec, and the suite checks the fallback before it records an image. | `3d5c4b2` (P4-D9 1/2) | 0 | — |
| The images that variant recorded | `29b5490` (P4-D9 2/2) | 144 | no, though their 72 Apple twins were (§12.2) |

Between `5b1663c` and `29b5490`, a diff over both baseline roots adds the 144 web images and modifies or removes none. The run that recorded them compared all 872 Apple and 732 web baselines equal, and CI run 36213988632 on `29b5490` compares all 1748, the 144 among them, and is green. Every image §§9–11 read is unchanged. By component the 144 are: Surface 24, Card 16, Text 8, Divider 8, Icon 16, Badge 8, IconButton 8, Avatar 24 and Chip 32.

**The conditions, read against that diff.**
- Conditions 1 and 2 did not fire. No pattern has an implementation, and P5-1 has not started.
- Condition 3 fired by its variant clause, and this section answers it. No example is new, so the 92 that §9.8, §10.7 and §11.8 name are still the whole list.
- Condition 4 did not fire. None of the 18 fills a slot. `with-badge` and `md-with-avatar` render no glass, so they have no Reduce Transparency twin.
- Condition 5 did not fire. `Badge/on-glass-over-map` keeps its red "2" on its own tile, and no button joins it.
- Condition 6 did not fire. Nothing was re-recorded: the 144 are new images, not new versions of committed ones.
- Condition 7 did not fire. No mark on the map gains a heading arrow, a vehicle glyph or identifier, a ring, a halo or a card beside it; the map gains nothing; and no filter pill is composed with map controls. §12.5 reads the one image that asks a second look.
- Condition 8 did not fire. None of the 18 is an identifier chip or holds an Avatar in a chip, and no chip stands in a card.

### 12.2 Method

- **Every image, on both stacks.** All 144 were opened on 18 contact sheets, one per example, each with four rows (two schemes × two densities). Each row holds the `web-desktop` standard image, its two web Reduce Transparency twins, Apple's standard image and Apple's Reduce Transparency twin: 360 images, the 72 Apple twins among them. §9.2 opened the wave-1 examples' regular rows and spot-checked the compact and `increased-contrast` rows, and it does not say it opened their Reduce Transparency twins. This section opened all 72 Apple twins beside the web ones, so each of the gallery's 216 Reduce Transparency images has now been opened by a dated section.
- **Decoded, not read by eye.** For each of the 72 cells, on both stacks: the box in which the Reduce Transparency image differs from its standard twin, and the commonest colour inside it. Then named points: IconButton's circle, Avatar's disc and ring, and Badge's disc. Every colour below is a decoded pixel.
- **Byte comparisons.** `web-touch` is byte-identical to `web-desktop` in 62 of 72 pairs. Card's 8 differ where touch draws the ↗ at rest, as their standard twins do. In 2 of Avatar's `ringed-over-map` pairs, 3 and 7 pixels of the portrait differ by at most 4 code values: the fixture's antialiasing.
- **The page.** The gallery page was opened in Chromium at 1440 px, in light and dark, as §10.2 did. All 1748 images decode, 144 of them web Reduce Transparency images, and each of the 72 Reduce Transparency cells shows Apple's image beside both web images. The 868 web figures of the Increase Contrast and Bold Text cells still read "not in this matrix".
- **The references.** Those the 18 examples' groups already name (§3.3, §3.4, §3.7, §3.10, §9.5, §10.4.3, §10.4.4, §11.5.3 and §11.5.4). The analyses' surface tables were also read for any opaque surface over a map.
- **Gates, run with this section in the tree.** `pnpm lint:reference-copy`: exit 0, no reference UI copy, 143 denylist entries, 682 files. `pnpm icons:validate`: exit 0, registry valid, 30 generated files current.

### 12.3 What the fallback draws, on both stacks

Under Reduce Transparency every glass surface and every glass chip falls back to one declared material (ADR-0022 §1.1, and §1.6 for a selected Surface), and what sits on it takes its default cell. The decoded values agree on the two stacks in every cell:
- **Glass becomes `raised`.** A glass Surface, a Card, a staging tile, and the glass chip of an Avatar or a Chip become opaque `raised`: (247, 248, 250) in light and (35, 36, 38) in dark. Nothing of the map or the image shows through.
- **Selected glass becomes `inverse`.** `Surface/glass-selected` and `Card/glass-selected` become the inverse solid: (13, 14, 17) in light and (255, 255, 255) in dark. Card's selection outline goes with the glass, and the inverse slab carries the selection instead.
- **What sits on them takes its default cell.** Labels, initials and glyphs leave the on-glass tones for the solid family's. IconButton's primary circle turns from white, (255, 255, 255), to ink, (13, 14, 17), in light, and stays white in dark. The Avatar ring becomes the inverse solid, and the chip's stroke the solid family's hairline. The critical "2" keeps its red, (229, 37, 42).
- **A selected chip drops `status.check`.** So `selected-on-map` is 22 px narrower on both stacks: 289 against 311 on the web, and 114 against 136 on Apple.
- **Vivid's bloom goes** (ADR-0022 §1.7). `Chip/on-vivid` is the one example whose page changes: the halo around the gradient tile is gone.
- **Apart from that bloom, everything else is the standard image's pixels.** On the web the change is confined to the component, its staging surface and that surface's shadow. The box is the tile, the circle or the pill exactly, or a slab and the band its shadow covers. The map, the image and the page around them are the standard twin's, pixel for pixel, and the web map still draws no route.

What differs between the stacks is what already differs in their standard images: the framing (the story's stage against a tight crop), the part of the synthetic map under the example, the route that only Apple's map draws (RD-9), the copy each harness gives Surface and Text (RD-3), and Card's ↗, drawn at rest under touch and on Apple.

*Pointer added 2026-09-26: since P4-10's re-record ([§15](#15-re-review-of-iconbuttons-circle-on-glass-after-p4-10--2026-09-26)), IconButton's primary circle on the scheme's glass is the ink solid in the standard images too. So in light the fallback no longer changes the circle, only the tile under it.*

### 12.4 Is any of these close enough to one product that a reasonable person would call it a copy?

Rows 44–61 continue §11.6's numbering, one row per example. Each row is the sentence §9.9 condition 3 asks for, and each group's section points to it.

| # | Example (group) | Copy? | Why |
|---|---|---|---|
| 44 | `Surface/glass-over-map` (§3.3) | **No** | An opaque raised slab over the synthetic map. The glass the move depends on is gone. |
| 45 | `Surface/glass-light-over-image` (§3.3) | **No** | An opaque raised slab over the blurred image. |
| 46 | `Surface/glass-selected` (§3.3) | **No** | An inverse slab, ink in light and white in dark, as §3.3 read Apple's twins. |
| 47 | `Card/glass-vehicle` (§3.7) | **No; RD-2 item 3 stands** | "Unit 4417" and its timestamp on an opaque raised card over the image. The genre stays. The smoked glass, which is the material of the reference's vehicle card, goes. |
| 48 | `Card/glass-selected` (§3.7) | **No** | "Unit 4417" on an inverse card. |
| 49 | `Text/on-glass-over-map` (§3.10) | **No** | A line of type on an opaque tile over the map. |
| 50 | `Divider/on-glass-over-map` (§9.5.1) | **No** | A hairline on an opaque tile. |
| 51 | `Icon/on-glass-over-map` (§9.5.2) | **No** | The pin, monochrome, on an opaque tile. |
| 52 | `Icon/on-glass-light-over-image` (§9.5.2) | **No** | Play, on an opaque tile. |
| 53 | `Badge/on-glass-over-map` (§9.5.3) | **No; RD-6 stands** | The red "2" on an opaque tile over the map. The glass it shared with the reference's bell button goes. |
| 54 | `IconButton/on-glass-over-map` (§9.5.4) | **No** | An ink circle in light and a white one in dark, on an opaque tile. |
| 55 | `Avatar/ringed-over-map` (§10.4.3) | **No** | The portrait in an inverse ring, straight on the map. On the web, on no route. |
| 56 | `Avatar/initials-over-map` (§10.4.3) | **No** | An opaque disc with "AP" on the map. §12.5 reads it against the reference's puck. |
| 57 | `Avatar/on-glass-over-image` (§10.4.4) | **No** | A ringed monogram on an opaque tile. |
| 58 | `Chip/on-map` (§11.5.3) | **No** | An opaque pill with the pin and "Depots", on the map. The reference's filter pills over its map are glass. |
| 59 | `Chip/selected-on-map` (§11.5.3) | **No**, as row 58 | Selected, without the check. |
| 60 | `Chip/on-vivid` (§11.5.4) | **No** | An opaque pill on the gradient, with no bloom. |
| 61 | `Chip/on-glass-over-image` (§11.5.4) | **No** | An opaque pill on an opaque tile. |

**Summary.** None of the 144 is close enough to one product that a reasonable person would call it a copy. Each draws what its Apple twin draws, and that twin was read in the group's own section. The fallback removes the one material the references' map screens are built from, so each image is further from its nearest reference than its standard twin is.

### 12.5 Does anything here move an earlier verdict or finding?

No verdict moves, and no finding changes its conclusion.
- **The fallback surfaces.** The references draw glass over their maps and images; the traffic console's analysis puts glass only where it refracts something (27220417, §9.6). The one opaque surface over a map that the analyses record is the traffic console phone's bottom sheet (27289370): full width, with 28 pt top corners, across the lower half of the screen, fading into the map at its top edge. A 200 px square with four rounded corners, anchored to nothing in the middle of a plate, is not that sheet, and neither is a 68 or 88 px tile. The fallback moves every image away from the references' material and towards nothing of theirs.
- **The map.** It is unchanged on both stacks. The web map draws no route in any of the 144. On Apple the route runs into the fallback surfaces as it does into the glass ones; those twins were read in their groups' sections, and RD-9 already counts them.
- **RD-9 and condition 7.** One image asks a second look: `Avatar/initials-over-map` in light. Its circle falls back from the pale glass chip, (222, 223, 228) on Apple and (236, 236, 238) on the web, to opaque `raised`, (247, 248, 250). That makes it a near-white disc on the map, nearer in fill to 27220417's puck, a white disc at 85 %, than the glass chip was. What makes the puck a product's is still absent: the dark heading arrow, the dashed ring, the readout card beside it and the white route under it. The disc holds "AP". On the web it stands on no route, and on Apple's light map the route under it is ink. In dark the fallback disc is (35, 36, 38), not white. `IconButton/on-glass-over-map`, the other round mark on the map, turns ink in light and stays white in dark, as RD-9 recorded. Condition 7 has not fired, and it still names what would fire it.
- **RD-11 and condition 8.** Untouched. `md-with-avatar` and `identifier-copy` render no glass and have no Reduce Transparency twin. None of the 144 shows an identifier chip or an Avatar in a chip, and no chip stands in a card.
- **RD-2 item 3 and RD-6.** Both stand, and their rows (7 and 16) do not move. Their costs grow by the web twins: re-subjecting `Card/glass-vehicle`, or changing `Badge/on-glass-over-map`'s count, now moves 28 baselines each, 12 Apple and 16 web. Each example had 20 before `29b5490`, which is the count RD-6 gives. RD-12's relabel still moves 16, because `identifier-copy` renders no glass.
- **RD-3.** On the web the Surface slabs keep the harness's copy under the fallback, so an opaque raised slab reads "Glass / Over the map". That is the harness's string on the fallback material, and no claim rests on it.
- **§3.11.** It says the web records no forced state. Since `29b5490` the web records Reduce Transparency for the 18 glass examples, and Increase Contrast and Bold Text stay Apple's alone. §3.11 carries a pointer.

### 12.6 Coverage

| Component | Examples with a web Reduce Transparency twin | New images | Group |
|---|---|---|---|
| Surface | `glass-over-map`, `glass-light-over-image`, `glass-selected` | 24 | §3.3 |
| Card | `glass-vehicle`, `glass-selected` | 16 | §3.7 |
| Text | `on-glass-over-map` | 8 | §3.10 |
| Divider | `on-glass-over-map` | 8 | §9.5.1 |
| Icon | `on-glass-over-map`, `on-glass-light-over-image` | 16 | §9.5.2 |
| Badge | `on-glass-over-map` | 8 | §9.5.3 |
| IconButton | `on-glass-over-map` | 8 | §9.5.4 |
| Avatar | `ringed-over-map`, `initials-over-map`, `on-glass-over-image` | 24 | §10.4.3, §10.4.4 |
| Chip | `on-map`, `selected-on-map`, `on-vivid`, `on-glass-over-image` | 32 | §11.5.3, §11.5.4 |
| **Total** | **18** | **144** | |

With them the gallery review covers all 1748 images: the 1604 that §§3 and 9–11 read, and these 144.

### 12.7 What this clearance covers, and when it expires

**It covers** the gallery at `29b5490`: all 1748 images, 92 examples and 10 components. It finds none of them a copy of any of the eleven reference shots.

**It expires on §9.9's conditions, as §10.8 and §11.9 read them.** Two of them now reach the web's forced states:
- **Condition 3's variant clause** covers any further forced state the web records. If the web ever photographs Increase Contrast or Bold Text, the 868 figures now "not in this matrix" become new variants of named examples, and a dated section reads them, as this one does.
- **Condition 6** covers these 144 as it covers every committed baseline: a re-record that changes what one of them draws expires this clearance.

*Pointer added 2026-09-26: P4-D14 photographs Increase Contrast on `web-desktop` at regular density, and [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads its 183 images. 685 figures remain "not in this matrix".*

**It is not a legal opinion**, for the reasons §8 gives.

The next section's verdict rows start at 62, and its findings at RD-13.

---

## 13. Re-review of the identifier chip after RD-12's relabel — 2026-09-26

- **Subject.** The **16 re-recorded images** of `Chip/identifier-copy`:
  - 8 Apple: `ios`, light and dark, regular and compact, each with its `increased-contrast` twin;
  - 8 web: `web-desktop` and `web-touch`, in the same four cells.

  `e56272f` relabelled the example "INV-209316", taking RD-12. CI run 36247333811 on `e56272f` re-recorded the 16, and the commit that adds this section commits them. The gallery still holds 1748 images in 872 cells, 0 missing, and 92 examples of 10 components (`gallery/index.json`, `counts`).
- **Why.** Two conditions fired, and this section answers both.
  - §9.9 condition 6: the re-record changes what the example draws, its label.
  - Showcase §13.8 condition 8, from `e56272f` on: both apps show the new label from that commit. The condition *"is answered when a dated section of the gallery review reads the change"*, and this change fills no slot.
- **Format.** §12's, adapted to a re-record: what changed (§13.1), how the images were read (§13.2), what they draw (§13.3), the verdict (§13.4), and whether anything moves an earlier verdict or finding (§13.5).
- **Rule 1.** No reference image was fetched, screenshotted or stored. The contact sheets, crops and page captures made for this section stayed in the session scratchpad, and none is committed.

### 13.1 What changed since §12's tree

| Change | Commits | Images | Reviewed before today? |
|---|---|---|---|
| `identifier-copy` relabelled "INV-209316", and "B-4417" retired from TextField's and ListRow's examples, which no stack implements (RD-12) | `e56272f` | 0 | — |
| The 16 images that relabel re-recorded | run 36247333811, and this section's commit | 16 | yes, as "B-4417" (§11.5.2) |

A diff over both baseline roots, from `7593770` (the commit that added §12) to this section's commit, modifies these 16 images and adds or removes none. The run compared 864 of Apple's other PNGs, and its provenance file, byte-identical with the tree. On the web it rewrote every baseline, as `--update-snapshots=all` does. Five `Avatar/ringed-over-map` Reduce Transparency images came back different from the committed ones, by 3 to 7 pixels each. No channel moved by more than 4 code values, and every difference sits in a spot of at most 5 × 6 px just outside the ring. That is antialiasing below the comparison's threshold, of the kind §12.2 found between that example's two web platforms. Those five were not committed, so the images §12 read are the ones in the tree.

The other commits since §12 add no image:
- `62cdf5b` and `25821ba` edit specs that no stack implements, and Chip's prose;
- `364a8e8` teaches the web VRT to photograph Increase Contrast on `web-desktop` at regular density. Its images are new variants of named examples, `identifier-copy`'s two among them, drawn with the new label, and condition 3 covers them when they land;
- `0abafaf` changes Button's and IconButton's pressed fill, which no example photographs;
- `ac0d910` to `5694283` change CI and the Apple showcase app.

**The conditions, read against that diff.**
- Conditions 1 and 2 did not fire. No pattern has an implementation, and P5-1 has not started.
- Condition 3 did not fire. No example is new, and no new variant has an image yet, so the 92 that §9.8, §10.7 and §11.8 name are still the whole list.
- Conditions 4 and 5 did not fire. `identifier-copy` fills no slot, and no badge or button moved.
- Condition 6 fired for the 16, and this section answers it.
- Condition 7 did not fire. `identifier-copy` stands on the page, not on the map.
- Condition 8 did not fire. The relabel moves the identifier chip away from the plate chip: it has no letter disc, no vehicle's number and no truncation, and no vehicle drawing, card or table surrounds it.

### 13.2 Method

- **Every image, old beside new.** All 16 were opened on two contact sheets, one per stack, each new image beside the committed one it replaces, one row per scheme, density and variant. Apple's sheet was at 2× nearest-neighbour and the web's at 1×. A third sheet set Apple's standard image beside `web-desktop`'s, at 2×, for each scheme and density. The light regular pills were opened at 4×, on Apple beside their `increased-contrast` twins, for the old images and the new alike.
- **Decoded, not read by eye.** For each image: its size and the pill's box, meaning every pixel more than 2 code values from the stage's corner. Along the pill's middle band: the spans where the label and the glyph put ink. Then the pill's fill, its stroke and the label's strongest ink, old against new. Every size and colour below is decoded.
- **Byte comparisons.** `web-touch` is byte-identical to `web-desktop` in all four pairs, as the images they replace were.
- **The page.** The gallery page was opened in Chromium at 1440 px, in light and dark, from the working tree after `pnpm gallery:build`, as §10.2 did. All 1748 images decode. `identifier-copy`'s article pairs the 16 under "label: INV-209316, trailingIcon: action.copy". Apple's images are 162 × 80 and 162 × 76 px, and the web's 240 × 160 and 240 × 156. Its web Increase Contrast figures still read "not in this matrix".
- **The references.** Those §11.5.2 names: the shipping console 27658472's number chip, the incident console 27571204's copy-id affordance and the traffic console's plate chip. The denylist's identifiers were read too.
- **Gates, run with this section in the tree.** `pnpm lint:reference-copy`: exit 0, no reference UI copy, 143 denylist entries, 684 files. `pnpm icons:validate`: exit 0, registry valid, 30 generated files current.

### 13.3 What the new images draw

- **The pill.** "INV-209316" and the trailing `action.copy` glyph in the raised sm pill, alone on the page, as "B-4417" was. The pill is 114 × 32 on Apple (114 × 28 at compact) and 112 × 32 on the web (112 × 28), where both drew 86 × 32 (86 × 28). The stages keep their margins, 24 px on Apple and 64 px on the web. So Apple's image grows from 134 to 162 px wide and the web's from 214 to 240, and no height changes.
- **The tones do not move.** Each was decoded at the same point in the old image and the new:
  - on Apple in light, the fill is (247, 248, 250), the stroke (224, 225, 227) and the label's ink (92, 96, 104);
  - under Increase Contrast in light, the stroke deepens to (177, 178, 180) and the label to (64, 68, 76);
  - in dark the fill is (35, 36, 38), with the stroke at (53, 54, 55) and the label at (176, 176, 177), or (90, 91, 92) and (211, 211, 212) under Increase Contrast;
  - the web decodes the same fill and label in light, and (35, 35, 38) with a (172, 172, 173) label in dark.

  The one difference is a single code value in the web's dark stroke. It is sampled at the middle of a wider pill, so it lands on another antialiased pixel.
- **The two stacks.** Both draw the label with 66 px of ink. The whole 2-point difference between the pills is in where that ink sits:
  - Apple's label ink starts 13 pt inside the pill and ends 9 pt before the glyph;
  - the web's starts 12 px in and ends 8 px before the glyph.

  The insets were the same before. The old label's ink was 38 wide on Apple and 40 on the web, and with those insets both came to 86-point pills. The glyph is each stack's registry binding, as in §11.5.2: the SF symbol on Apple, and Phosphor's two squares on the web.

### 13.4 Is any of these close enough to one product that a reasonable person would call it a copy?

Row 62 continues §12.4's numbering.

| # | Example (group) | Copy? | Why |
|---|---|---|---|
| 62 | `Chip/identifier-copy` (§11.5.2), its 16 re-recorded images | **No, and RD-12 is closed** | An invoice number with a copy glyph, alone on the page. The pairing of an identifier with a copy glyph is still a grammar two consoles share. Its content is now a document's number, not the gallery's fleet unit in a vehicle-style identifier. |

**Summary.** None of the 16 is close enough to one product that a reasonable person would call it a copy. Each draws what the image it replaces drew, with another label.

### 13.5 Does anything here move an earlier verdict or finding?

- **Row 35 and §11.5.2.** §11.5.2's genre bullet was about "B-4417". The reference names its vehicles by a word or a letter with four or five digits (§11.5.2). "INV-209316" is a document prefix with six. Of the two copy-glyph identifiers, the shipping console's is a container's number and the incident console's a hash; neither is an invoice. Row 35's verdict becomes a plain **No**, and `identifier-copy` is no longer the nearest of the thirteen in genre. §11.5.2 carries a pointer.
- **RD-12.** Closed. No example puts the fleet unit number in an identifier chip. In the gallery's images, "4417" is now only `Card/glass-vehicle`'s and `Card/glass-selected`'s "Unit 4417".
- **RD-2 item 3.** Stands. RD-12 noted that the relabel, together with re-subjecting `glass-vehicle`, would remove the gallery's only shared fleet identifier. Card's unit number is no longer shared, and whether `glass-vehicle` keeps its genre is still that item's call.
- **RD-11 and condition 8.** Untouched: `md-with-avatar` did not change, and the identifier chip moved away from the plate chip.
- **RD-9 and condition 7.** Untouched: `identifier-copy` is not on the map.

### 13.6 Coverage

| Component | Example | Re-recorded images | Group |
|---|---|---|---|
| Chip | `identifier-copy` | 16: 8 Apple, 8 web | §11.5.2 |

With them the gallery review covers all 1748 images: the 1732 that §§3 and 9–12 read, as they still are, and these 16.

### 13.7 What this clearance covers, and when it expires

**It covers** the gallery at the commit that adds this section: all 1748 images, 92 examples and 10 components. It finds none of them a copy of any of the eleven reference shots.

**It expires on §9.9's conditions, as §10.8, §11.9 and §12.7 read them.** The web Increase Contrast images that `364a8e8` begins to record are condition 3's new variants when they land, `identifier-copy`'s two among them.

*Pointer added 2026-09-26: they landed with P4-D14's baselines, and [§14](#14-review-of-the-webs-increase-contrast-images--2026-09-26) reads them, `identifier-copy`'s two among them (row 83).*

**It is not a legal opinion**, for the reasons §8 gives.

The next section's verdict rows start at 63, and its findings at RD-13.

---

## 14. Review of the web's Increase Contrast images — 2026-09-26

- **Subject.** The **183 web images** that P4-D14 added: one `increased-contrast` twin per example and scheme, on `web-desktop` at regular density only, at `web/apps/vrt/baselines/linux/<Component>/<id>.web-desktop.<scheme>.regular.increased-contrast.png`. CI run 36249203600 on `d771c40` recorded them, and the commit that adds this section commits them (P4-D14 2/2). They fill the web half of the 183 regular Increase Contrast cells, which until then held Apple's image alone. The gallery now holds 1931 images in 872 cells, 0 missing, and still 92 examples of 10 components (`gallery/index.json`, `counts`).
- **Why.** §9.9 condition 3: *"A new variant of a reviewed example can be covered by a sentence added to its group."* Each of the 183 is a new variant of one of the 92 examples that §9.8, §10.7 and §11.8 name, and §12.7 and §13.7 said a web Increase Contrast variant would be read this way. §14.4 gives the sentence for each group, and each group's section carries a pointer to it.
- **Format.** §12's, for a second variant: what changed (§14.1), how the images were read (§14.2), what Increase Contrast draws on both stacks (§14.3), the verdicts (§14.4), and whether anything moves an earlier verdict or finding (§14.5). §12 gave each of its 18 examples a row. Here each of the 23 groups gets one and names its examples by id: condition 3 asks for a sentence per group, and inside each group the examples change in the same way.
- **Rule 1.** No reference image was fetched, screenshotted or stored. The contact sheets, decodes and page captures made for this section stayed in the session scratchpad, and none is committed.

### 14.1 What changed since §13's tree

| Change | Commits | Images | Reviewed before today? |
|---|---|---|---|
| The web photographs every example once more under Increase Contrast, on `web-desktop` at regular density. Before it records an image, the suite checks the root's contrast attribute and that the stage computes the scheme's Increase Contrast token layer. The gallery declares the cells the web leaves out. | `364a8e8` (P4-D14 1/2) | 0 | — |
| The images that variant recorded | run 36249203600, and this section's commit (P4-D14 2/2) | 183 | no, though their 183 Apple twins were, in their groups' own sections (§14.2) |

A diff over both baseline roots, from `d771c40` (the commit that added §13) to this section's commit, adds the 183 web images and modifies or removes none. The run that recorded them compared all 872 Apple and all 876 web baselines equal, `identifier-copy`'s 16 re-recorded images among them, and skipped the variant on `web-touch`. Every image §§9–13 read is unchanged. By component the 183 are: Surface 16, Text 12, Button 14, Card 13, Divider 12, Icon 22, Badge 20, IconButton 24, Avatar 24 and Chip 26. None of their paths was ever tracked or deleted: the web folder's only deletions are P3-5's 220 renames.

**The conditions, read against that diff.**
- Conditions 1 and 2 did not fire. No pattern has an implementation, and P5-1 has not started.
- Condition 3 fired by its variant clause, and this section answers it. No example is new, so the 92 that §9.8, §10.7 and §11.8 name are still the whole list.
- Condition 4 did not fire. `with-badge` and `md-with-avatar` gain a twin in each scheme, and each twin fills the same slot with the same component as its standard image.
- Condition 5 did not fire. `with-badge`'s twins keep their count and their ground; only the circle's ring deepens. `Badge/on-glass-over-map` falls back as it does under Reduce Transparency, and joins no button.
- Condition 6 did not fire. Nothing was re-recorded: the 183 are new images, not new versions of committed ones.
- Condition 7 did not fire. The map examples fall back as §12 read them. Nothing on the map gains a heading arrow, a ring, a halo or a card, and the web map still draws no route.
- Condition 8 did not fire. `identifier-copy` and `md-with-avatar` keep their labels and their anatomy; their strokes and labels deepen.

### 14.2 Method

- **Every image, on both stacks.** All 183 were opened on ten contact sheets, one per component, one row per example and scheme at regular density. Each row holds Apple's standard image, its Increase Contrast twin, the `web-desktop` standard image and the new web image. The 18 glass examples' rows add both stacks' Reduce Transparency twins. That is 804 images, Apple's 183 regular Increase Contrast twins among them. §9.2 had spot-checked wave 1's `increased-contrast` rows, and §10 and §11 had opened Avatar's and Chip's. With this section, every one of Apple's regular Increase Contrast images has been opened by a dated section.
- **Decoded, not read by eye.** For each of the 183 cells, on both stacks: the image's size, the box in which the Increase Contrast image differs from its standard twin, the number of pixels that differ, and the commonest colour changes inside the box. For the 18 glass examples, the Increase Contrast image against its Reduce Transparency twin as well. Every colour below is a decoded pixel.
- **Byte comparisons.** The web image equals its standard twin in 82 cells, and Apple's in 84, and the two stacks agree cell by cell on whether anything changed in 181 of 183. The other two are `Surface/solid-card` (§14.3). Against the local renders `364a8e8` was checked with, 179 of the 183 are byte-identical. `identifier-copy`'s two were rendered locally before RD-12's relabel. `Avatar/ringed-over-map`'s two differ in 7 and 8 pixels of the portrait, by at most 5 code values: the fixture's antialiasing that §12.2 and §13.1 found.
- **The page.** The gallery page was opened in Chromium at 1440 px, in light and dark, from the working tree after `pnpm gallery:build`, as §10.2 did. All 1931 images decode. Each of the 183 regular Increase Contrast cells shows Apple's image beside `web-desktop`'s, and `web-touch`'s figure reads "not in this matrix". Each of the 183 compact ones shows Apple's image, and both web figures read "not in this matrix". 685 web figures read so in all, Bold Text's 136 among them, and no cell misses a pair.
- **The references.** Those each group's section already names. §3.11's answer holds for a forced state on either stack: no reference shot records one.
- **Gates, run with this section in the tree.** `pnpm lint:reference-copy`: exit 0, no reference UI copy, 143 denylist entries, 684 files. `pnpm icons:validate`: exit 0, registry valid, 30 generated files current.

### 14.3 What Increase Contrast draws, on both stacks

Increase Contrast is a token layer (ADR-0011). It deepens the secondary, tertiary and dimmed text tones and the hairline and strong strokes, and it raises every weight below 400 to 400 (ADR-0021 §3). It is also a trigger of the glass fallback (ADR-0022 §1.2). It changes no fill. The decoded values agree on the two stacks in every cell, to within the antialiasing their standard images already differ by:
- **Strokes deepen.** A chip's hairline, (224, 225, 227) in light, becomes (177, 178, 180) on Apple; on the web (222, 223, 226) becomes (176, 177, 179). In dark, Apple's (53, 54, 55) and the web's (52, 53, 55) both become (90, 91, 92). A secondary button's ring moves the same way. Divider's line on the page goes from (218, 219, 222) to (173, 174, 177) on Apple and from (217, 218, 222) to (172, 173, 176) on the web, over the same 200 pixels. Button's ghost ring goes from (138, 139, 142) to (104, 105, 108) on both stacks.
- **Secondary text deepens.** In light, (92, 96, 104) becomes (64, 68, 76) on both stacks: the second line of `Text/title-two-tone`, the chips' labels and the Avatar's initials. In dark the label goes from (176, 176, 177) to (211, 211, 212) on Apple and from (172, 172, 173) to (206, 207, 207) on the web. Their standard images are the same few code values apart (§13.3).
- **Dimmed digits become secondary, and thin weights regular.** `Card/solid-metric`'s ".4", (126, 131, 143) in light, becomes (92, 96, 104) on both stacks, and so does `Text/hero-metric`'s on the web. The heroes' thin weight becomes 400. So `hero-metric`, whose dark weight is thinner still, grows 2 px wider in dark on both stacks: 243 to 245 on the web, 163 to 165 on Apple. In light it grows 1 px on Apple, and not at all on the web.
- **Glass falls back exactly as under Reduce Transparency.** Glass becomes `raised` over the page, (247, 248, 250) and (35, 36, 38), and a selected glass Surface or Card becomes `inverse`, (13, 14, 17) and (255, 255, 255). These are §12.3's values, on both stacks. `selected-on-map` drops its check and is 22 px narrower on both. In light, IconButton's primary circle on the map is ink.
  - Of the 36 glass cells, the Increase Contrast image equals its Reduce Transparency twin in 14 on the web and 18 on Apple.
  - Elsewhere the two differ only where the layer recolours a label, a stroke or the initials on the fallback: at most 614 pixels, on the same parts on both stacks.
  - The exception is `Chip/on-vivid`, whose Reduce Transparency twin also drops vivid's bloom.
- **Vivid keeps its bloom.** Only Reduce Transparency drops it (ADR-0022 §1.7). Under Increase Contrast, `Chip/on-vivid` changes nothing outside its pill on the web. On Apple the bloom stays too, and about 3,400 pixels inside the gradient tile move by at most 3 code values: rendering noise, not a change of material.
- **What does not change.** No fill: the page, vivid, accent and inverse, the solid pills and circles, Badge's discs, Icon's tones and the portraits. 82 of the web's 183 images, and 84 of Apple's twins, are byte-identical to their standard images:
  - Surface's `vivid-default`, `vivid-pair`, `inverse-pill` and `accent-tile`, and Card's `vivid-pair`;
  - Text's `data-tabular` and `on-vivid`, and Divider's `on-vivid`;
  - Icon's nine examples off glass, and Badge's eight other than `outline-neutral` and `on-glass-over-map`;
  - Button's `primary-md`, `danger-md`, `loading`, `disabled` and `on-vivid`;
  - IconButton's `primary-md`, `plain-sm`, `danger-md`, `selected-in-group`, `lg-touch` and `on-vivid`;
  - Avatar's `image-md`, `ringed`, `size-lg`, `decorative` and `fallback-icon`.

What differs between the stacks is what already differs in their standard images: the framing, the part of the synthetic map under the example, Apple's route (RD-9), and the copy each harness gives Surface and Text (RD-3). RD-3 is also why the stacks disagree about `Surface/solid-card`. The web's slab carries "The content surface" in the secondary tone, which deepens. Apple's carries nothing, so its twin is byte-identical. For the same reason the web's glass Surfaces differ from their Reduce Transparency twins in their captions, and Apple's do not.

### 14.4 Is any of these close enough to one product that a reasonable person would call it a copy?

Rows 63–85 continue §13.4's numbering, one row per group. Each row is the sentence §9.9 condition 3 asks for, and each group's section points to it.

| # | Group (section) | Examples | Copy? | Why |
|---|---|---|---|---|
| 63 | Button — the control set (§3.1) | `primary-md`, `secondary-md`, `ghost-sm`, `danger-md`, `loading`, `disabled`, `on-vivid` | **No**; row 1 and RD-4 stand | The secondary and ghost rings deepen. The other five are byte-identical to their standard images, `danger-md`'s critical wash among them. |
| 64 | Surface — the flat materials (§3.2) | `solid-card`, `vivid-default`, `inverse-pill`, `accent-tile` | **No**; row 2 stands | No fill moves. The web's `solid-card` caption deepens (RD-3), and the other three are byte-identical. |
| 65 | Surface — glass over the backdrops (§3.3) | `glass-over-map`, `glass-light-over-image`, `glass-selected` | **No**, as rows 44–46 | The fallback: an opaque raised slab, or the inverse slab when selected. On the web the raised slabs' captions deepen. |
| 66 | The vivid 2×2 grids (§3.5) | Surface `vivid-pair`, Card `vivid-pair` | **No**; row 5 stands | Byte-identical to their standard images on both stacks. |
| 67 | Card — the metric cards (§3.6) | `solid-metric`, `vivid-default-kpi`, `compact` | **Borderline on anatomy, no on composition, as row 6; RD-2 stands** | The same parts in the same places. The thin hero becomes regular and the dimmed remainder secondary, so two of the parts row 6 shares with the reference card are drawn less like it. |
| 68 | Card — the glass vehicle cards (§3.7) | `glass-vehicle`, `glass-selected` | **No**, as rows 47–48; RD-2 item 3 stands | "Unit 4417" on an opaque raised card, with a deeper timestamp, or on the inverse card when selected. |
| 69 | Card — the tinted focus card (§3.8) | `tinted-focus` (light only) | **No**; row 8 stands | The icon's ring and the caption deepen on the unchanged peach tint. |
| 70 | Text — the type specimens (§3.9) | `hero-metric`, `title-two-tone`, `caption`, `data-tabular` | **No**; row 9 stands | The thin numeral becomes regular and its ".4" secondary, and the second line and the caption deepen. The timer is byte-identical. |
| 71 | Text — type on media (§3.10) | `on-vivid`, `on-glass-over-map` | **No**; rows 10 and 49 stand | The header block is byte-identical. The line on the tile falls back as in row 49, and deepens. |
| 72 | Divider (§9.5.1) | `horizontal`, `horizontal-inset`, `vertical`, `semantic`, `on-vivid`, `on-glass-over-map` | **No**; rows 14 and 50 stand | A deeper hairline. `on-vivid` is byte-identical, and `on-glass-over-map`'s tile falls back. |
| 73 | Icon (§9.5.2) | `control-md`, `corner-sm`, `display-lg`, `status-filled`, `accent-mark`, `inherit-in-row`, `decorative`, `named-standalone`, `on-vivid`, `on-glass-over-map`, `on-glass-light-over-image` | **No**; rows 15, 51 and 52 stand | The layer holds no glyph tone. Nine are byte-identical, and the two on glass equal their Reduce Transparency twins. |
| 74 | Badge (§9.5.3) | `count-neutral`, `count-critical`, `count-accent`, `count-overflow`, `outline-neutral`, `outline-critical`, `dot-critical`, `dot-accent`, `on-vivid`, `on-glass-over-map` | **No; RD-6 stands** | `outline-neutral`'s ring deepens. The red "2" on the map equals its Reduce Transparency twin (row 53), and the other eight are byte-identical. |
| 75 | `IconButton/with-badge` (§9.4) | `with-badge` | **No**; row 13 stands | The circle's ring deepens. The bell, the badge and its count do not change. |
| 76 | IconButton, the other 11 (§9.5.4) | `secondary-md`, `primary-md`, `ghost-md`, `plain-sm`, `danger-md`, `selected-in-group`, `lg-touch`, `disabled`, `on-vivid`, `on-glass-over-map`, `label-ru` | **No**; rows 17 and 54 stand | The rings of `secondary-md`, `label-ru`, `ghost-md` and `disabled` deepen. The circle on the map equals its Reduce Transparency twin, ink in light, and the other six are byte-identical. |
| 77 | Avatar — the portrait circles (§10.4.1) | `image-md`, `ringed`, `size-lg`, `decorative` | **No**; rows 19, 23, 25 and 26 stand | Byte-identical to their standard images on both stacks. |
| 78 | Avatar — the lettered and glyph circles (§10.4.2) | `initials-md`, `initials-one-word`, `size-sm`, `russian-initials`, `fallback-icon` | **No**; rows 20–22, 24 and 30 stand | The initials deepen. `fallback-icon` is byte-identical. |
| 79 | Avatar — over the map (§10.4.3) | `ringed-over-map`, `initials-over-map` | **No**, as rows 55–56; RD-9 as §12.5 read it | The fallback on the map. `ringed-over-map` equals its Reduce Transparency twin, and `initials-over-map`'s near-white disc carries deeper initials. |
| 80 | Avatar — on glass over the image (§10.4.4) | `on-glass-over-image` | **No**, as row 57 | The fallback tile, with deeper initials. |
| 81 | `Chip/md-with-avatar` (§11.4) | `md-with-avatar` | **No**; row 38 and RD-11 stand | The pill's stroke, the label and the initials deepen. The anatomy and the person in it do not change. |
| 82 | Chip — the page chips (§11.5.1) | `default-sm`, `selected`, `with-leading-icon`, `removable`, `md-size`, `disabled`, `russian-label` | **No**; rows 31–34, 36, 37 and 43 stand | Strokes and labels deepen, on pills that keep their fills. |
| 83 | `Chip/identifier-copy` (§11.5.2) | `identifier-copy` | **No**; row 62 stands, and RD-12 stays closed | "INV-209316", with the deeper stroke and label that §13.3 decoded on Apple, now on the web as well. |
| 84 | Chip — over the map (§11.5.3) | `on-map`, `selected-on-map` | **No**, as rows 58–59 | The fallback pill on the map, with a deeper stroke. Selected, it has no check. |
| 85 | Chip — on media (§11.5.4) | `on-vivid`, `on-glass-over-image` | **No**, as rows 60–61 | The fallback pill, with a deeper stroke. `on-vivid` keeps vivid's bloom. |

**Summary.** None of the 183 is close enough to one product that a reasonable person would call it a copy. Each draws what its Apple twin draws, and that twin was read in the group's own section. Increase Contrast deepens strokes and secondary text, raises thin weights, and falls glass back. So each image is at least as far from its nearest reference as its standard twin, and the metric cards and the glass are further.

### 14.5 Does anything here move an earlier verdict or finding?

No verdict moves, and no finding changes its conclusion.
- **§3.11 and row 11.** "No reference has an accessibility state to be close to" holds for the web's 183 as for Apple's. §3.11 carries a pointer.
- **RD-2.** The metric cards stay borderline on anatomy. Under Increase Contrast their thin hero turns regular and their dimmed remainder secondary, two of the parts row 6 lists, so the twins are drawn less like the reference card, not more. Item 3 stands: `glass-vehicle`'s twin keeps "Unit 4417" on an opaque card. Its cost grows by the two web twins: re-subjecting it now moves 30 baselines, 12 Apple and 18 web.
- **RD-3.** It explains the only cells where the stacks disagree about what Increase Contrast changes. The web's Surface examples carry copy in the secondary tone, and Apple's carry none (§14.3). No claim rests on it.
- **RD-4.** `danger-md`'s twin is byte-identical to its standard image on both stacks: the critical wash does not move.
- **RD-6 and condition 5.** `Badge/on-glass-over-map`'s twin equals its Reduce Transparency twin, and `with-badge`'s keeps its count and its ground. Changing the count now moves 30 baselines, 12 Apple and 18 web.
- **RD-9 and condition 7.** The map examples' twins are the fallback §12.5 read, with deeper strokes and initials. The web map draws no route in any of them. In light `Avatar/initials-over-map` is the near-white disc §12.5 read, with a darker "AP". Condition 7 has not fired.
- **RD-11 and condition 8.** `md-with-avatar`'s twin keeps the person's initials and name, and only its stroke, label and initials deepen. `identifier-copy`'s keeps "INV-209316". Condition 8 has not fired.
- **RD-12.** Stays closed. The new images draw "INV-209316": CI recorded them after the relabel.

### 14.6 Coverage

| Component | Examples with a web Increase Contrast twin | New images | Groups |
|---|---|---|---|
| Button | 7 | 14 | §3.1 |
| Surface | 8 | 16 | §3.2, §3.3, §3.5 |
| Card | 7 | 13 | §3.5–§3.8 |
| Text | 6 | 12 | §3.9, §3.10 |
| Divider | 6 | 12 | §9.5.1 |
| Icon | 11 | 22 | §9.5.2 |
| Badge | 10 | 20 | §9.5.3 |
| IconButton | 12 | 24 | §9.4, §9.5.4 |
| Avatar | 12 | 24 | §10.4.1–§10.4.4 |
| Chip | 13 | 26 | §11.4, §11.5.1–§11.5.4 |
| **Total** | **92** | **183** | |

With them the gallery review covers all 1931 images: the 1748 that §§3 and 9–13 read, as they still are, and these 183.

### 14.7 What this clearance covers, and when it expires

**It covers** the gallery at the commit that adds this section: all 1931 images, 92 examples and 10 components. It finds none of them a copy of any of the eleven reference shots.

**It expires on §9.9's conditions, as §10.8, §11.9 and §12.7 read them.** Two of them now reach the web's Increase Contrast images:
- **Condition 3's variant clause.** Each new example brings two web Increase Contrast twins, and its section reads them with the rest of its images. If the web ever photographs Increase Contrast at compact density or on `web-touch`, or Bold Text, the 685 figures now "not in this matrix" become new variants of named examples, and a dated section reads them, as this one does.
- **Condition 6** covers these 183 as it covers every committed baseline: a re-record that changes what one of them draws expires this clearance for it. P4-10, which changes IconButton's colours on glass, is the next one known.

*Pointer added 2026-09-26: P4-10 landed at `8987b2d`, and [§15](#15-re-review-of-iconbuttons-circle-on-glass-after-p4-10--2026-09-26) reads the 6 images it re-recorded, all of them `IconButton/on-glass-over-map` in light. None of these 183 moved.*

**It is not a legal opinion**, for the reasons §8 gives.

The next section's verdict rows start at 86, and its findings at RD-13.

---

## 15. Re-review of IconButton's circle on glass after P4-10 — 2026-09-26

- **Subject.** The **6 re-recorded images** of `IconButton/on-glass-over-map`, its standard images in the light scheme:
  - 2 Apple: `ios`, regular and compact;
  - 4 web: `web-desktop` and `web-touch`, regular and compact.

  P4-10 made the one solid on the scheme's glass the inverse solid (ADR-0040 §1), and `8987b2d` moved IconButton's primary and selected circles to it on both stacks (IconButton specVersion 3, ADR-0040 §7). CI run 36255663851 on `8987b2d` re-recorded the 6, and the commit that adds this section commits them. The gallery still holds 1931 images in 872 cells, 0 missing, and 92 examples of 10 components (`gallery/index.json`, `counts`).
- **Why.** Two conditions fired, and this section answers both.
  - §9.9 condition 6: the re-record changes a tone the example draws, its circle's fill.
  - Showcase §13.8 condition 8, from `8987b2d` on: both apps show the ink circle from that commit. The condition *"is answered when a dated section of the gallery review reads the change"*, and this change fills no slot.
- **Format.** §13's, for a re-record: what changed (§15.1), how the images were read (§15.2), what they draw (§15.3), the verdict (§15.4), whether anything moves an earlier verdict or finding (§15.5), and one finding (§15.6).
- **Rule 1.** No reference image was fetched, screenshotted or stored. The contact sheets, crops, decodes and page captures made for this section stayed in the session scratchpad, and none is committed.

### 15.1 What changed since §14's tree

| Change | Commits | Images | Reviewed before today? |
|---|---|---|---|
| The wave-2 specs key `inverse`, `accent` and light glass, or state what they draw there, and their solid on the scheme's glass becomes the inverse solid (ADR-0040). No wave-2 spec is implemented. | `baf5f92` (P4-10 1/2) | 0 | — |
| Button and IconButton key the three materials on both stacks, and IconButton's primary and selected circles leave the white media solid on glass for the inverse solid (Button 7, IconButton 3) | `8987b2d` (P4-10 2/2) | 0 | — |
| The 6 images that change, re-recorded | run 36255663851, and this section's commit | 6 | yes, as the white circle (§9.5.4) |

A diff over both baseline roots, from `2fa7daa` (the commit that added §14) to this section's commit, modifies these 6 images and adds or removes none. No other example renders a changed cell (ADR-0040, Consequences), and the run bears that out:
- **Apple.** 871 of the 873 files it wrote, `provenance.json` among them, are byte-identical with the tree. The other 2 are this example's.
- **The web.** It rewrote every baseline, as `--update-snapshots=all` does, and 1051 of the 1059 came back byte-identical. 4 of the other 8 are this example's.
- **Four web files are left out.** The remaining 4 are `Avatar/ringed-over-map` Reduce Transparency images: `web-desktop` in dark at both densities and in light at compact, and `web-touch` in light at compact. Each differs from the committed image in 3 to 7 pixels, by at most 4 code values, in one spot of at most 5 × 6 px just outside the ring. That is the antialiasing below the comparison's threshold that §13.1 found, and each is byte-identical to the copy run 36247333811 made of the same file. No change of P4-10 touches Avatar, so they were not committed, and the images §10 and §12 read are the ones in the tree.
- **The example's other 24 images** are byte-identical with the tree: its dark images, and all its Increase Contrast and Reduce Transparency twins, 10 on Apple and 14 on the web.

**The conditions, read against that diff.**
- Conditions 1 and 2 did not fire. No pattern has an implementation, and P5-1 has not started. `DashboardGrid.yaml` reads the new `accent` cells for its control swap, in its spec alone.
- Condition 3 did not fire. No example is new, and no variant was added, so the 92 that §9.8, §10.7 and §11.8 name are still the whole list.
- Condition 4 did not fire. `on-glass-over-map` fills no slot.
- Condition 5 did not fire. The circle carries no badge, and no button joins `Badge/on-glass-over-map`.
- Condition 6 fired for the 6, and this section answers it.
- Condition 7 did not fire. The circle is still a control on a glass tile. Nothing on the map gains a heading arrow, a ring, a halo or a card, and the map is unchanged. §15.5 reads the circle against RD-9.
- Condition 8 did not fire. No chip changed.

### 15.2 Method

- **Every image, old beside new.** All 6 were opened on two contact sheets, one per stack. Each row set the committed image beside the new one, then the new image's Reduce Transparency twin, its Increase Contrast twin where the stack records one, and the dark image of the same density: Apple's sheet at 2× nearest-neighbour, the web's at 1×. A third sheet set Apple's images beside `web-desktop`'s at 2×, in light at both densities and in dark. A fourth set the tile and its circle at 4× on each stack: old, new, fallback and dark.
- **Decoded, not read by eye.** For each image: its size; the box in which it differs from the image it replaces, the number of pixels that differ and by how much; and the colour inside the box and just outside it, before and after. Inside the circle, the glyph: its pixels, its box and its extreme colour. Then the new circle against the example's Reduce Transparency and Increase Contrast twins, pixel by pixel inside the box, and, on Apple, the route's two legs up to the circle. Every colour below is a decoded pixel.
- **Byte comparisons.** `web-touch` is byte-identical to `web-desktop` in both pairs, as the images they replace were. The 6 committed files are byte-identical to the run's artifacts.
- **The page.** The gallery page was opened in Chromium at 1440 px, in light and dark, from the working tree after `pnpm gallery:build`, as §10.2 did. All 1931 images decode, and none is missing. The example's article, under "variant: primary, size: md, glyph: action.locate, label: Center on the vehicle", shows the 6 new images in its two light standard cells, beside its unchanged images in the other ten. The copies of the 6 that the page reads are byte-identical to the baselines.
- **The references.** Those §9.5.4 and RD-9 name: the traffic console 27220417's map controls and its puck, the finance dashboard 27678963's solid ink circles, and the incident console 27571204's round tools over its map. The analyses' colour and component tables were read for every solid round control and every control over a map.
- **Gates, run with this section in the tree.** `pnpm lint:reference-copy`: exit 0, no reference UI copy, 143 denylist entries, 686 files: §14's 684, and the two colour sets `8987b2d` added under `swift/Sources`. `pnpm icons:validate`: exit 0, registry valid, 30 generated files current.

### 15.3 What the new images draw

- **The circle.** In light the primary circle is the inverse solid, (13, 14, 17), with a white glyph, (255, 255, 255). It was the white media solid, (255, 255, 255), with an ink glyph, (13, 14, 17). The difference is the circle's box exactly, on both stacks, and every image keeps its size:
  - Apple, 136 × 136: a 40 × 40 box from (48, 48), 1324 pixels; at compact, 112 × 112, a 32 × 32 box from (40, 40), 856 pixels;
  - the web, 312 × 312: a 40 × 40 box from (136, 136), 1318 pixels; at compact, 288 × 288, a 32 × 32 box from (128, 128), 852 pixels.

  No pixel moves by more than 242 code values, the distance from white to ink.
- **The glyph** is the same drawing in the same place, inverted: 140 pixels in a 19 × 19 box on Apple and 150 in an 18 × 18 box on the web, at both densities. It is each stack's registry binding of `action.locate`: the SF symbol on Apple, and Phosphor's crosshair on the web.
- **The tile and the map do not move.** The glass just outside the circle decodes as it did: (231, 232, 235) on Apple and (237, 238, 240) on the web, at regular. On Apple the route's two legs, ink in light, (13, 14, 17), end at the tile's edge: 12 px of the leg from the leading side and 9 px of the one from the top show at regular, 14 and 12 at compact. The glass shows nothing of them, and 24 px of it lie between their ends and the circle (16 at compact). The web map draws no route.
- **It is the fallback's circle.** Every ink and every white pixel in the new circle's box equals the same pixel in the example's Reduce Transparency twin, and in its Increase Contrast twin where the stack records one: 1036 of 1036 on Apple at regular and 592 of 592 at compact, 1022 of 1022 and 578 of 578 on the web. In those twins the tile falls back to `raised`, so they have drawn the inverse solid since they were recorded (§12.3, §14.3). The light images now differ from them only around the circle: glass over the map, where the twins have the opaque raised step.
- **Dark does not move.** `color.bg.fill.inverse` is white in dark, so the circle is the white disc with an ink glyph it was, on smoked glass. The 6 dark images are byte-identical to those §9.5.4 read.

That is the rule ADR-0030 §3.1 and ADR-0040 §1 state: on the scheme's glass the solid is `color.bg.fill.inverse`, ink on light glass and white on smoke. It is the solid of the signed-off board's glass (`.cardglass` in `index.html`), and `IconButton/primary-md`'s ink circle set on glass. The two stacks agree on the fill, the glyph's colour and the box. Their pixel counts differ by 6 at regular and 4 at compact, the antialiasing and the glyph drawings in which their standard images already differ.

### 15.4 Is any of these close enough to one product that a reasonable person would call it a copy?

Row 86 continues §14.4's numbering.

| # | Example (group) | Copy? | Why |
|---|---|---|---|
| 86 | `IconButton/on-glass-over-map` (§9.5.4), its 6 re-recorded images | **No**; rows 17, 54 and 76 stand | A solid ink circle with a white locate glyph, alone on a light glass tile over the synthetic map. The white disc with a dark glyph, the material of the traffic console's puck, is gone from the light scheme. The finance dashboard's solid ink circle takes its place, and no reference sets that circle on a map. |

**Summary.** None of the 6 is close enough to one product that a reasonable person would call it a copy. Each draws what the image it replaces drew, with the solid's two colours exchanged inside the circle.

### 15.5 Does anything here move an earlier verdict or finding?

No verdict moves, and no finding changes its conclusion.
- **§9.5.4 and row 17.** The group's *Closest image* bullet reads "a white solid circle with a locate crosshair". That is now the dark image alone. In light the circle is the ink solid, which moves the image away from the traffic console's round map controls, white-tinted glass at about 25 % over its dark map, and from its puck, a white disc at 85 % with a dark glyph (the traffic analysis, §2.2 and §6). It moves towards the finance dashboard's solid ink circle with a white glyph, which §9.5.4 already names, and which that dashboard sets on glass too: the × on its smoked drawer, and the ↗ on a light glass pill (its analysis, §1, §6 and §8). None of those circles stands on a map, and the dashboard has none. The example is still one control, alone and not in its stack; RD-13 says where that stack is specified. §9.5.4 carries a pointer.
- **Rows 54 and 76.** Their images did not change. §12.3, §12.5 and row 54's pointer say that in light the fallback turns the circle from white to ink. Since this re-record the standard image is ink as well, so in light the fallback changes only the tile. §12.3 carries a pointer.
- **RD-9 and condition 7.** In dark nothing moves: a white disc with a dark glyph on a smoked tile where Apple's white route turns, which RD-9 read. In light the circle now takes the colour of Apple's light route, ink. So on Apple, in both schemes, the circle is the colour of the route that runs into its tile, as 27220417's puck is the colour of its route. But the tile stands between them: the legs end at its edge, 24 px of glass from the circle, and the glass shows nothing of them. The puck stands on its route, with a heading arrow, inside a dashed ring, read out by a card beside it, and none of that is here. The light image is also that dark map's palette inverted. RD-9's conclusion holds, and condition 7 has not fired. RD-9 carries a pointer.
- **RD-6 and condition 5.** `on-glass-over-map` is still one of the three parts of 27571204's bell that RD-6 lists: a round control on glass over the map. That bell is a round button of chip glass with a white glyph (the incident analysis, Surfaces & Depth). In light the circle is now an opaque ink one, further from it, and in dark it is unchanged. Nothing is composed, and condition 5 has not fired.
- **RD-2 item 3 and RD-12.** Untouched: `Card/glass-vehicle` and `Chip/identifier-copy` did not change.

### 15.6 Findings of this re-review

#### RD-13 — `Toolbar.yaml`'s `over-map` example specifies the traffic console's zoom cluster, the stack §9.5.4 says this control is not in

**What.** §9.5.4 calls `on-glass-over-map` "one of the traffic console's map controls, alone and not in its stack". That stack is 27220417's zoom cluster, which the incident console 27619812 re-posts: three 44 px round glass buttons, + / target / −, 8 px apart at the bottom-left of the map (the traffic analysis, §6). `Toolbar.yaml`'s `over-map` example specifies it: "Map tools", three IconButtons, zoom in, zoom out and locate ("Centre on me"), on one track that renders the glass chip over the map. Its `zoom-cluster` example is the two zoom buttons, stacked, on the page.

**Why it matters.** Toolbar is unimplemented (P4-42), so no screen draws it, and nothing is uncovered today. But it is where this example's defence stops, as TopBar's `desktop-navigation` is where `with-badge`'s does (RD-7) and Sidebar's `rail` is where `ringed`'s does (RD-10). Zoom and locate are every map's controls, so the set is the genre's. The three in one group over a map are that shot's cluster, with one glass track behind them where the reference has three glass rounds, and the locate button moved to the end.

**Action.** None now. The example fills Toolbar's `items` slot with IconButtons, so conditions 3 and 4 already hold it outside this clearance until a dated section reads it, and that section reads it against 27220417's cluster. Recomposing it is cheap while Toolbar is unimplemented: for instance zoom alone, as `zoom-cluster` has it, or controls the cluster does not have. It is recorded so that whoever implements Toolbar reads it before recording the first baseline.

### 15.7 Coverage

| Component | Example | Re-recorded images | Group |
|---|---|---|---|
| IconButton | `on-glass-over-map` | 6: 2 Apple, 4 web | §9.5.4 |

With them the gallery review covers all 1931 images: the 1925 that §§3 and 9–14 read, as they still are, and these 6.

### 15.8 What this clearance covers, and when it expires

**It covers** the gallery at the commit that adds this section: all 1931 images, 92 examples and 10 components. It finds none of them a copy of any of the eleven reference shots.

**It expires on §9.9's conditions, as §10.8, §11.9, §12.7 and §14.7 read them.** Condition 6 covers these 6 as it covers every committed baseline, and conditions 3 and 4 hold RD-13's example until Toolbar's section reads it.

**It is not a legal opinion**, for the reasons §8 gives.

The next section's verdict rows start at 87, and its findings at RD-14.
