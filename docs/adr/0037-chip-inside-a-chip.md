# ADR-0037: A chip inside another chip samples nothing, and inside a component's own cell it has no media

- Status: accepted
- Date: 2026-09-24
- Decision record entry: docs/decisions.md #37
- Amends: ADR-0036 (§3 steps 1, 5 and 8; the scope of §5; the flag's names in §7 and in the public API table; "clears the flag" in §8.2 and §8.3; rules 3 and 6)

## Context

ADR-0036 §3 step 8 hands a chip's content one fact: "a glass chip encloses you". A chip sets it when it renders the recipe, or when a glass chip encloses it. A glass chip that reads it draws no backdrop filter (step 5, §5). A chip that renders its own cell, its fallback or nothing does not set it. So a glass chip inside one of those still blurs.

The verification of commit 2ce261f found that this case draws differently on the two stacks: a glass chip inside a chip that renders its own cell. This ADR reproduces the case, finds where Prism's specs could produce it, and decides it before Chip, the first component that nests a chip, is built (roadmap P4-8).

### Why the two stacks differ

- **Web.** A `backdrop-filter` reads everything painted under the element, up to its backdrop root. The host's root is `.ds-surface-chip`, with `position: relative` and `isolation: isolate` and no filter or opacity (`Surface.css:407-428`). That is not a backdrop root (ADR-0036 F3). So a nested chip blurs the map with the host's own cell painted over it.
- **Apple.** A nested chip's mirror redraws `dsBackdropSource` (`DSSurfaceChip.swift:128`). Only `dsBackdrop(kind)` and an opaque Surface write that value (`DSSurfaceBackdropPublisher`, `DSSurfaceView.swift:151`). A chip never hands its pixels down (ADR-0036 §2.3). So the mirror redraws the raw map under the nested chip, and the chip becomes a window through the host's cell.

### Facts verified for this ADR

The probes ran outside the repository, in the session scratch directory.

- **Web**: Chromium 153.0.8010.12 in Playwright 1.63. The real `useSurfaceChip`, `SurfaceChipScope` and `Backdrop` were server-rendered and drawn with the built `styles.css` and the `prism` brand's `tokens.css`.
- **Apple**: the iPhone 17 simulator on iOS 26.5, `ImageRenderer` at 1×. The real `dsSurfaceChip` came from a copy of the package at `2c806ed`.

Both stacks drew the same fixture:
- a 140 × 40 pill host with 4 px of padding;
- inside it, a 32 × 32 circle whose background follows Avatar's `root.background` table;
- under both, 2 px red and blue stripes, declared as a map (`<Backdrop kind="map">`, `.dsBackdrop(.map) { … }`).

Values are the mean sRGB of the 8 × 8 block at the circle's centre. The Apple values are the same whether the stripes reach the chip through `dsBackdrop(.map)` or are handed down by hand.

| # | The host renders | Light, web | Light, Apple | Dark, web | Dark, Apple |
|---|------------------|------------|--------------|-----------|-------------|
| H1 | no host (the circle alone on the map) | 160, 64, 160 | 158, 64, 160 | 89, 7, 91 | 88, 7, 92 |
| H2 | its own cell, `color.bg.surface.raised` | **248, 247, 250** | **159, 64, 160** | **96, 22, 98** | **89, 7, 91** |
| H3 | its own cell, `color.bg.surface.nested` | **155, 65, 155** | **159, 64, 160** | **99, 27, 101** | **89, 7, 92** |
| H4 | the recipe (the circle is flat, ADR-0036 §5) | 182, 112, 185 | 183, 112, 184 | 63, 11, 68 | 64, 11, 67 |
| H5 | nothing | 160, 64, 160 | 158, 64, 160 | 89, 7, 91 | 88, 7, 92 |

In H2 and H3 the circle resolves glass and blurs. The web root carries `data-ds-surface-chip="glass"` without the flat attribute, and computes `backdrop-filter: blur(20px) saturate(1)`.

- **Light, `raised`.** `color.bg.surface.raised` is opaque #F7F8FA, so the web blurs one flat colour. The circle almost disappears into the host. Apple draws the blurred stripes, a purple disc. The difference is 89, 183 and 90 code values.
- **Translucent own cells.** Dark `raised` is white at α 0.09, and `nested` is ink at α 0.06 in light and white at α 0.12 in dark. The web blurs the tint together with the map, and Apple leaves the tint out. The channel that moves most differs by 5 to 20 code values.
- **Controls.** H1, H4 and H5 agree within 2 code values.

Three more cases follow from the same cause, and were not measured. In each, the web samples paint that Apple's mirror cannot see:
- **A host that renders nothing but paints layers.** A `hover` overlay or a `pressed` fill under the nested chip is sampled by the web and not by Apple.
- **A `chrome`-gated chip inside a fallback.** It renders glass on `(raised, none)` and blurs. The web reads the host's fallback paint, and Apple reads the raw pixels.
- **A disabled host.** Its opacity cuts a nested blur in Chromium only (ADR-0036 F4).

### Where Prism's specs nest a chip

- **One nesting in the 57 component specs and 3 patterns.** An sm Avatar may stand in the md Chip's leading slot (`Chip.yaml` anatomy and behavior, `Avatar.yaml` behavior). The other hosts nest no chip:
  - TopBar holds an Avatar and a SearchField, but its chip part is the scroll-edge strip, which holds neither. The bar publishes `raised` while the edge shows.
  - Toolbar's items are IconButtons and at most one Button, and TabBar's are IconButtons. None of them draws a chip.
- **At rest, Chip and Avatar never produce the case.**
  - Both bind `material.glass.chip` on the same five cells: `page.map`, `page.image`, `page.vivid`, `vivid` and `glass`.
  - Everywhere else they bind their own cell, `comp.chip.bg.rest` and `comp.avatar.bg`, both `color.bg.surface.raised`.
  - So an Avatar asks for glass exactly where its Chip renders glass. There the Avatar is flat, and both stacks agree (H4).
  - Under the Chip's fallback the Avatar reads `(raised, none)` and takes its own cell.
- **The pressed state could produce it.** `Chip.yaml` binds `pressed.background: comp.chip.bg.pressed` with no material axis.
  - If a build hands that cell to the chip shape, a pressed Chip over a map renders its own cell. Its Avatar then blurs, which is H3.
  - The same build switches the Chip's own blur off for every press.
  - The P4-8 row plans the pressed fill as a layer instead.
- **Own cells on media exist elsewhere, with nothing nested in them.** No chip sits inside either of these today:
  - SegmentedControl's selected segment: `selected.background` is `comp.segmented-control.active.bg` on the page over media, `color.bg.fill.inverse-media` on vivid and `color.bg.fill.inverse` on glass;
  - TextField's read-only box: `readonly.background` is `color.bg.fill.neutral.subtle`, with no material axis.

  Whatever this ADR decides, the next host inherits.

## Decision

### 1. A chip hands its content an enclosure (replaces ADR-0036 §3 step 8)

A chip hands its content one of three enclosures, in place of the flag:

| Enclosure | Meaning |
|---|---|
| `none` | No chip encloses this point. This is the default, and `Backdrop` and `dsBackdrop(kind)` set it for their content. |
| `translucent` | Chips enclose this point, up to the nearest `Backdrop`, and none of them renders its own cell or its fallback. |
| `opaque` | At least one chip that encloses this point, up to the nearest `Backdrop`, renders its own cell or its fallback. |

- A chip hands its content `opaque` when it renders `own` or `fallback`, or when it reads `opaque` itself. Otherwise it hands `translucent`.
- Surface neither reads nor writes the enclosure.
- On the web, a `Backdrop` with an ignored kind passes the parent's enclosure through, as it passes the flag through today. On Apple, `dsBackdrop(.none)` sets `none` like every other kind, because it still hands its pixels down.

`opaque` describes the model, not the cell's alpha. A component's own cell is paint, not media: ADR-0022 §1.2 trigger 4 renders glass only over an image, a map or vivid. And over media, a tint that carries text or a glyph paints the page under it (ADR-0030 rule 6).

### 2. The enclosure changes three steps of ADR-0036 §3

1. **Media (step 1).** Under `opaque`, the media under the chip is `none`, whatever the ground.
   - Under the `content` gate, glass asked for there is an invalid backdrop (step 2). The chip logs it and falls back (step 3), paints the page (step 6) and publishes `(raised, none)` (step 7). So its parts take their default cells.
   - Under the `chrome` gate, it renders the recipe.
2. **Blur (step 5).** The recipe blurs its backdrop only when the enclosure is `none` and the ground is not `glass` or `glassLight`.
   - Under `translucent` or `opaque`, a chip that renders the recipe draws only its fill and its edge.
   - Apple draws no mirror, and the web writes `data-ds-surface-chip-flat`.

   So ADR-0036 §5's "inside another glass chip" now reads "inside any other chip". The reason is §5's own: the pixels a nested filter would read include paint that only one of the two stacks can see.
3. **The resolution carries the enclosure (step 8).** The resolver computes `encloses`, the enclosure the chip hands its content. The drawing passes it on. So both stacks compute it in one pure function, and the resolution tables check it.

The outcomes for a nested chip that asks for glass on a media ground:

| The host renders | Under `content` | Under `chrome` |
|---|---|---|
| the recipe | the recipe, flat (as ADR-0036 §5) | the recipe, flat |
| nothing | the recipe, flat (**was**: blurred) | the recipe, flat (**was**: blurred) |
| its own cell | the fallback (**was**: the recipe, blurred) | the recipe, flat (**was**: blurred) |
| its fallback | the fallback (unchanged: it reads `raised`) | the recipe, flat (**was**: blurred) |

A chip that no chip encloses resolves exactly as ADR-0036 says.

### 3. Measured with the rule

The rule was tried on scratch copies of both stacks, with the fixture above. Every case agrees within 2 code values.

- **H2 and H3** draw the fallback on both stacks: 247, 248, 250 in light and 35, 36, 38 in dark.
- **H5** draws flat on both stacks. The centre pixel is the same sharp stripe under the fill: 255, 64, 64 in light and 172, 7, 8 in dark.
- **H1 and H4** do not change.

### 4. Names (amends ADR-0036 §7)

All of these stay internal on the web and `package` or internal on Apple, so no public API changes.

- **Web**
  - `resolve.ts` gains `surfaceChipEnclosures` and `SurfaceChipEnclosure` (`"none" | "translucent" | "opaque"`).
  - The option `enclosure` replaces `insideGlassChip`, and `SurfaceChipResolution` gains `encloses`.
  - In `context.ts`, `InsideGlassChipContext` becomes `SurfaceChipEnclosureContext`, created with `createContext<SurfaceChipEnclosure>("none")`.
  - `SurfaceChipScope` provides `resolution.encloses`. `Backdrop` provides `"none"`.
- **Apple**
  - DSCore gains `package enum DSSurfaceChipEnclosure { case none, translucent, opaque }`.
  - `DSSurface.resolveChip(_:on:enclosure:gate:publishes:context:tokens:isWatch:)` replaces `insideGlassChip:`, in both overloads. `DSSurfaceChipResolution` gains `encloses`.
  - In DSComponents, `EnvironmentValues.dsInsideGlassChip` becomes `dsSurfaceChipEnclosure`. `dsSurfaceChip` sets it to `resolution.encloses`, and `DSBackdropModifier` sets `.none`.

`Surface.css` does not change: ADR-0036's selector for flat glass, `.ds-surface-chip[data-ds-surface-chip="glass"][data-ds-surface-chip-flat]`, already covers every chip this ADR makes flat.

### 5. An input state never changes what a host hands the chip shape

A host hands the chip shape `glass`, `own` or `none`. That choice follows the ground and the spec's persistent states, such as `selected` and `readonly`. It never follows an input state:
- the fills of `hover` and `pressed` are layers the host paints over the chip's rendering;
- an input state may still change the colour of an own cell, as long as it stays an own cell.

The reason: a host that switched its part from the recipe to its own cell on press would switch its own blur off for every press. Under §1 and §2 it would also turn a nested chip from flat glass into its fallback for as long as the press lasts.

## Alternatives considered

- **Leave step 8 as it is.** The two stacks then draw H2 as two pictures, up to 183 code values apart.
- **Apple samples what Chromium samples.** A chip that renders its own cell or its fallback would hand its paint down as pixels, as an opaque Surface does. It lost for four reasons:
  - It rests on Chromium's backdrop-root behaviour (ADR-0036 F3), which is unverified in WebKit and Firefox (F5). ADR-0036 §5 chose not to depend on it.
  - It misses the host's own layers, such as the hover and pressed fills and strokes. The web samples them, and a chip cannot hand them down.
  - It adds one more redraw of the backdrop for each nested chip (P4-D11).
  - It keeps glass tones over a component's cell (see "Flat only").
- **The web skips the host's paint.** CSS cannot express this. A backdrop filter reads everything painted under it inside its backdrop root. Making the host a root, with an opacity or a filter, confines the nested chip to the host's own paint (ADR-0036 F3, F4), which is still not the map.
- **Flat only: widen §5 to every enclosing chip, and stop there.** This is the smallest change, parity holds, and it is what this ADR does for hosts that render the recipe or nothing, and under `chrome`. As the whole answer it fails for own cells:
  - Inside a component's own cell, the nested chip would keep the recipe's fill and edge and publish the media ground, so its parts would take glass tones over that cell.
  - In light, `color.text.on-glass-fill` is ink. SegmentedControl's selected cell on the page over a map is `comp.segmented-control.active.bg`, an alias of `color.bg.fill.inverse`, which is ink too. In dark both are white.
  - No pair in `tokens/contrast-pairs.json` puts a glass tone on a component's cell, and ADR-0011 rule 1 allows no unchecked text pair.
- **The host publishes `raised` while it renders its own cell over media.** Every part of the host reads what the chip publishes (ADR-0036 §4), and hosts key those parts on the ground under their own cell. SegmentedControl's selected label is `color.text.on-inverse-media` on vivid, `color.text.on-inverse` on glass and `comp.segmented-control.active.text` elsewhere. Publishing `raised` would leave only the last.
- **The nested chip takes its component's own default cell instead of the fallback.** That would be the component re-keying a part by hand, which ADR-0036 rule 2 forbids. And without the page under it, a translucent default over the host's cell is again a pair nothing checks. Dark `raised` is white at α 0.09.
- **Forbid the nesting in the specs, with a `spec:validate` corpus rule.** The one slot that nests a chip is not typed yet (P4-8, defect 1), so there is nothing to check today. And a host's cell function can still return any cell at run time. The runtime rule makes every nesting draw one picture on both stacks. A corpus rule can come with a typed slot.

## Consequences

### Baselines

- **None moves, and none is added.** No implemented component draws a chip: Avatar and Chip are not built yet.
- **No example nests a chip over media.** Chip's `md-with-avatar` sits on the plain page, where both the Chip and its Avatar take their own cells.

### Tests that follow the implementation (P4-8)

- **The resolution tables gain a third enclosure.** ADR-0036 rule 3's counts become 10,368 rows on Apple (fill × nine grounds × four kinds × gate × publication × three enclosures × contrast × transparency × watch) and 5,184 on the web. Every row checks `encloses`.
- **The step-8 probes change their readings.**
  - The files are `DSSurfaceChipTests` and `test/surface-chip.test.tsx`.
  - Their content reads `opaque` after a chip that renders its own cell, after a fallback, and after glass with no media under `content`.
  - It reads `translucent` after a glass chip, a `chrome` chip or a chip that renders nothing, and `none` under `Backdrop` or `dsBackdrop`.

### What becomes easier

- A nested chip samples nothing on either stack. Its picture does not depend on backdrop roots, on WebKit or Firefox, or on a disabled host's opacity.

### What becomes harder

- **A nested glass chip never blurs**, even inside a host that paints nothing over media. No spec does that today.
- **A nested chip inside an own cell renders the opaque fallback** under standard settings. That is visible, and deliberate.

### What this ADR does not decide

- **Own cells on media paint no page under them.** ADR-0036 §3 step 6 paints the page only under the fallback. ADR-0030 rule 6 asks a tint that carries text or a glyph over media to paint the page under its tint.
  - TextField's read-only box is the first such cell: `color.bg.fill.neutral.subtle` is α 0.06 over a map.
  - TextField's ticket decides it. §1 already treats the cell as opaque paint for what nests inside it.

### Documents that follow

With this decision:
- `docs/decisions.md` row 37, and the inline note on row 36;
- the ADR index, and ADR-0036's status line;
- the roadmap row P4-8.

With P4-8:
- the doc comments that describe the flag, in `DSSurface.swift`, `DSSurfaceChip.swift`, `DSBackdrop.swift`, `resolve.ts`, `context.ts`, `SurfaceChip.tsx` and `Backdrop.tsx`.

## Rules that follow

1. **A chip that another chip encloses draws no backdrop filter.** ADR-0036 rule 6 now reads "inside any other chip".
   - Checked by the resolution tables on both stacks.
   - Checked in P4-8 by a render test on each stack of a chip inside a host that renders nothing. Chromium computes `backdrop-filter: none`. On both stacks the centre pixel is a sharp stripe under the fill (255, 64, 64 in light), where a blur reads purple (about 160, 64, 160). The 8 × 8 mean is the same either way, so it cannot tell the two apart.
2. **Inside a chip that renders its own cell or its fallback, a chip has no media under it.** Under `content`, glass asked for there falls back.
   - Checked by the resolution tables.
   - Checked in P4-8 by a render test on each stack: a nested chip inside an own-cell host reads the fallback, `color.bg.surface.raised` over `color.bg.page`, in both schemes. Before this rule, the web reads the host's colour and Apple reads the blurred map.
   - The host's cell in that test is `color.bg.surface.nested`, which is translucent in both schemes. Light `raised` is opaque, and flat glass over it reads within 2 code values of the fallback, so a host in that cell could not fail the check.
3. **The enclosure is the resolver's output, `encloses`.**
   - The chip shape hands it to its content, and `Backdrop` and `dsBackdrop(kind)` set `none`.
   - Surface neither reads nor writes it.
   - Checked by the environment probe on Apple and the server-rendered probe on the web.
4. **An input state never changes whether a host hands the chip shape `glass`, `own` or `none`.** Hover and pressed fills are layers over the chip's rendering.
   - Checked in P4-8: a nested Avatar's resolution is the same, at rest and pressed, on every ground, under every setting.
