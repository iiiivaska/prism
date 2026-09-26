# ADR-0042: The focus ring and the washes follow the ground they are drawn on

- Status: accepted
- Date: 2026-09-26
- Decision record entry: docs/decisions.md #42
- Amends: ADR-0011 (the focus-ring row of the contrast tiers: "against adjacent surface" is the ground under the ring, and this decision names the ring for each ground), ADR-0040 (§4, which recorded the focus ring and the washes and did not settle them; §7's pressed cells on the lit tile, whose wash does not show in dark)

## Context

ADR-0040 §4 recorded two failures and settled neither, because "a ring and a wash are drawn by every focusable or pressable component on every ground, … so they are one decision for all of them":

- **The focus ring.** Every spec binds `focus-visible.ring: color.border.focus`, which is `neutral.950` in light and `neutral.0` in dark: the inverse fill's own colour in each scheme, so 1.00:1 on `inverse`, and white at 2.30:1 on the dark lit tile. ADR-0011 asks 3:1 of a focus ring against the surface next to it.
- **The washes.** `color.bg.fill.neutral.subtle` is ink at 6 % in light and white at 6 % in dark. On the inverse fill it is the fill's own colour and composites to nothing, so a part with no fill of its own shows no hover and no press there. On the dark lit tile it moves the tile by OKLab L +0.013, a step that does not show (ADR-0040's own alternatives), yet ADR-0040 §7 made it the pressed fill of secondary on the tile.

This ADR settles both, before Toggle (roadmap P4-12) builds the row that Checkbox and Radio share, and draws its ring and its wash on every ground.

### How the stacks draw them today (`a8f85c3`)

- **Apple.** `DSFocusRing` (`swift/Sources/DSComponents/Control/DSControl.swift`) strokes `tokens.color.borderFocus` at `border.focus` outside the shape it surrounds, and on macOS under Increase Contrast `Color.accentColor`. Six places draw it: the pill of `DSButton`, the circle of `DSIconButton`, `DSChipPill` and the chip's remove control, and `DSCardLayers` and Card's custom disc. `DSCardLayers` sits inside the card's own Surface, so the card's ring, which is drawn outside the card, would read the material the card publishes, not the ground the card sits on.
- **Web.** Six stylesheet rules draw an `outline` in `var(--ds-color-border-focus)`: `.ds-button`, `.ds-icon-button`, `.ds-chip-body`, `.ds-chip-remove` and `.ds-card-action-button` on React Aria's `data-focus-visible`, and `.ds-card[data-ds-action="open"]` on the native `:focus-visible`. Card's root is its own Surface, whose `data-ds-material` is the card's material.
- **Washes.** Button, IconButton and Chip lay `color.bg.fill.neutral.subtle` over the control while hovered, and ghost and plain press to it (`comp.button.ghost.bg.pressed`, `comp.icon-button.ghost.bg.pressed`); Chip presses to `comp.chip.bg.pressed`, `color.bg.surface.nested`, which is ink at 6 % in light and white at 12 % in dark. Card lays the neutral wash over its own fill.

### Facts verified for this ADR

`pnpm contrast:check` evaluates every figure below for both brands in all six colorScheme contexts; the pairs are in `tokens/contrast-pairs.json`. WCAG 2.x ratios, source-over in gamma-encoded sRGB.

| # | Fact |
|---|------|
| F1 | `color.border.focus` on `color.bg.fill.inverse`: 1.00:1 in every context. `color.text.on-inverse` on it: 19.30:1. |
| F2 | On `color.bg.fill.accent`: `color.border.focus` is 12.01:1 in light and 2.30:1 in dark (#FFFFFF on #F39444); the tile's ink, `color.text.on-accent`, 12.01:1 and 8.39:1. |
| F3 | On the vivid gradients, at every stop and V1 sample: the ink ring is 2.39:1 on sky's first stop in light (#0D0E11 on #4A4C78); white, `color.text.on-vivid`, holds 3.05:1 (orchid in light, ember-night in dark). |
| F4 | On glass `color.border.focus` is the glass's own foreground (`color.text.on-glass-fill` and `color.text.on-glass-light` are ink in light and white in dark). Over each glass's backdrop set it holds 5.15:1 in light and 9.32:1 in dark on the scheme's glass, 5.15:1 in both on light glass, and 4.57:1 and 5.62:1 on the glass chip. |
| F5 | On Prism's seven map grounds `color.border.focus` holds at least 13.70:1; on the tinted card (`color.bg.tint.accent` over the page) 15.66:1. |
| F6 | Over imagery Prism paints nothing under a ring that sits outside a glass chip or a glass card, and no one colour holds 3:1 over the imagery ADR-0022 §3.3 allows under light glass in light (OKLCH L 0.45 and lighter): ink is 2.59:1 on #555555, white 1.00:1 on #FFFFFF. For any colour M and two colours A and B, `max(ratio(A, M), ratio(B, M)) ≥ √ratio(A, B)`; the ring on the page is 17.24:1 in light and 19.30:1 in dark, so a ring on a band of the page reaches at least 4.15:1 against any image with one of its two colours. |
| F7 | The neutral wash moves the page by OKLab L -0.042 in light and +0.064 in dark (luminance ratio 1.14). `color.text.on-inverse` at 6 % moves the inverse fill by +0.064 in light and -0.043 in dark, the same two steps mirrored; `color.text.on-inverse` on it is 16.95:1. |
| F8 | On the dark tile: white at 6 % moves it +0.013 (ratio 1.05); the tile's ink at 6 % moves it -0.031 but takes `color.text.on-accent-secondary` from 4.78:1 to 4.45:1; white at 20 % moves it +0.045 and raises that pair to 5.24:1 and `color.text.on-accent` to 9.93:1. On the light tile the tile's ink at 6 % moves it -0.037, with the pairs at 10.66:1 and 5.44:1. |
| F9 | The macOS system blue, which `Color.accentColor` gives by default, is 2.50:1 on the light tile and 1.59:1 on the dark one. The system colour is the user's choice, and no pair can check it. |
| F10 | No committed baseline photographs focus, hover or a press. The web VRT drives no interaction (`web/apps/vrt/tests/stories.spec.ts`), the Apple matrix renders every example at rest (`DSSnapshotMatrix`), and `Card/tinted-focus` is the tinted card at rest, the lit "focus sheet" of visual-dna §4.8. |

## Decision

### 1. The focus ring is picked by the ground under it, in one drawing per stack

1. **The ring sits on the ground the element it surrounds sits on**: the context that element reads from outside itself. That is what Button, IconButton and Chip's pill read. A component that draws its ring inside a Surface or chip of its own passes the ground outside it (Card's root), and a ring drawn on a component's own paint reads that paint (Card's custom disc inside the card; Chip's remove control, §1.2).

   | Ground | Ring | Light | Dark | Least ratio (F1-F5) |
   |--------|------|-------|------|---------------------|
   | `page` over nothing or a map, `solid`, `raised`, `nested`, `glass`, `glassLight` | `color.border.focus` | ink | white | 4.57:1 (the glass chip, §1.2) |
   | `inverse` | `color.border.focus-on-inverse` | white | ink | 19.30:1 |
   | `accent` | `color.border.focus-on-accent` | ink | ink | 8.39:1 |
   | `vivid`, and `page` over `vivid` | `color.border.focus-on-media` | white | white | 3.05:1 |
   | `page` over `image` | `color.border.focus` on a band of `color.bg.page` (§1.3) | ink on the page | white on the page | 4.15:1 against any image |

   The three new roles alias the material's primary foreground: `color.text.on-inverse`, `color.text.on-accent` and `color.text.on-vivid`. They are roles of their own so that the ring stays one family a brand and a check can read, and so no spec binds a text role as a stroke.
2. **On a chip's own paint the media keys give way.** A chip publishes the ground under its glass (ADR-0036 §4.3), so a part inside a chip that renders glass over vivid reads `vivid`, while the ring sits on the chip's glass, whose foreground is ink in light. So wherever a chip encloses the ring (`dsSurfaceChipEnclosure` or `SurfaceChipEnclosureContext` is not `none`, ADR-0037 §1) the `vivid` and `page.vivid` rows, and the band of `page.image`, give way to `color.border.focus`. Chip's remove control, which each stack lays over the pill from outside the chip's scope, asks for this reading itself. A chip host that rendered nothing over media would read the chip's rows too; none does, since every chip spec binds the recipe over media.
3. **Over an image the ring paints the page under itself, one ring width wider.** This is ADR-0030 rule 6, which paints the page under a tint that carries text over media, read for the ring: the ring's two neighbours are the page and the control, and the band's colour and the ring's are at least 17.24:1 apart, so one of the two holds 3:1 against any image (F6; WCAG technique C40, the two-colour focus indicator). Only `page.image` outside a chip takes the band: every other ground is paint Prism checks.
4. **Specs name the ring's role, and the drawing resolves it.** Every `focus-visible.ring` stays `color.border.focus` and every `ringWidth` stays `border.focus`: no spec keys its ring and none binds the three new roles. The shared drawing of each stack reads the table above. ADR-0040 §4.2 found the ring to be one decision for every focusable component on every ground; a system table, like Text's tone table (ADR-0022 §3.1), makes it one place to read and one place to change, and keeps it out of `material/uneven`, which reads a spec's parts. `spec:validate` holds it (§3).
5. **Under Increase Contrast on macOS** the ring takes the system's focus colour only on the page family, `page` over nothing, `solid`, `raised` and `nested`, where the system's own controls sit (Button.yaml `notes.platform.macos`). On every other ground Prism's ring holds, because the system colour cannot be checked and the default blue fails the lit tile (F9).
6. **One drawing per stack.**
   - **Apple.** DSCore's `package enum DSInteraction` holds the table (`focusRing(on:onChipPaint:)`, `focusRingUnderlay(on:onChipPaint:)`), and `DSFocusRing` draws it: the band, then the ring, each `border.focus` wide, outside the shape. `DSFocusRing(cornerRadius:)` and `DSFocusRing(_:)` read the ground and the enclosure from the environment, as they are placed now; `DSFocusRing(_:on:onChipPaint:)` takes them from a component that draws its ring inside its own Surface (Card) or on its own paint (Chip's remove control).
   - **Web.** `src/focus/` holds the twin table (`focusRingOn`, `focusRingUnderlay`) and `useFocusRing`, which reads the Surface context and the chip enclosure and returns the element's class, `ds-focus-ring`, and its `data-ds-focus-ring` and `data-ds-focus-ring-underlay` attributes. `focus/FocusRing.css` is the one stylesheet that draws a ring: the `outline` on `.ds-focus-ring[data-focus-visible]`, and over an image the band as the `outline` of the element's `::after`, offset by the ring's width. The six component rules go. Card's root is no React Aria element, so Card writes `data-focus-visible` itself while the browser matches `:focus-visible`.

### 2. A wash on inverse and on the lit tile is the material's own

1. **A part that lays the neutral wash where it draws no fill of its own takes the material's wash** on `inverse` and on `accent`:

   | Ground under the wash | Wash | Light | Dark |
   |-----------------------|------|-------|------|
   | `inverse` | `color.bg.fill.on-inverse-subtle` | white at 6 % (L +0.064) | ink at 6 % (L -0.043) |
   | `accent` | `color.bg.fill.on-accent-subtle` | the tile's ink at 6 % (L -0.037) | white at 20 % (L +0.045) |
   | every other material | `color.bg.fill.neutral.subtle` | ink at 6 % | white at 6 % |

   `on-inverse-subtle` is `color.text.on-inverse` at 6 %: the neutral wash mirrored, the page's own two steps (F7). `on-accent-subtle` is `color.text.on-accent` at 6 % in light, the value the neutral wash already has there, and white at 20 % in dark, because on the dark tile the ink wash takes the tile's second tone below 4.5:1 and white at 6 % does not show (F8). **The dark value is a design choice no ADR settled, proposed for the owner (§4).**
2. **Over a fill of its own a part keeps the neutral wash**: a raised pill or puck, a chip's own cell or its glass, a tint over its underlay, and a solid. The neutral wash over the inverse solid, and over the solid knocked out on the lit tile in light, still shows nothing: ADR-0039's recorded follow-up, which this decision does not settle.
3. **The specs key their washes.** A wash is a part's cell, keyed as ADR-0040 keys every other part:
   - Button 8 and IconButton 4: `hover.overlay` is keyed by variant, and secondary, ghost and plain take the material's wash on `inverse` and `accent`; primary, a selected circle and danger keep the neutral wash over their fill. Pressed on the tile, secondary, ghost and plain take `color.bg.fill.on-accent-subtle`, in place of ADR-0040 §7's `color.bg.fill.neutral.subtle`; on `inverse` they keep `color.bg.fill.inverse-pressed`, the ground's one lightness step.
   - Chip 2: `hover.overlay` and `pressed.overlay` key both materials, where the chip renders nothing; pressed on `inverse` it takes `color.bg.fill.inverse-pressed`, as Button's and IconButton's ground-less variants do. Chip's materials are stated with it, so it leaves `MATERIALS_OWED` for `MATERIALS_SETTLED`.
   - Toggle, Checkbox and Radio, in place (none is implemented): the row's `hover.overlay` and `pressed.overlay` key both materials, and their `materials` statements for the row, which recorded this gap, go.
4. **What waits for its own change.** Card's overlay lies on the card's own material, which is `inverse` only for a selected glass card under the fallback; `Card.yaml` changes with P4-D5, which owes Card its materials. SegmentedControl, Select and Slider key their washes in their tickets (P4-17, P4-18, P4-19), and the composites in P4-27, by §2.1. A field's state edges and read-only fill stay their tickets' (ADR-0040 §4.1; P4-D13).

### 3. What checks it

1. `tokens/contrast-pairs.json`: each ring role on its ground (boundary), the ring on both glasses and on the glass chip over their backdrop sets, on Prism's map grounds and on the tinted card, and the text each wash carries (functional).
2. `spec:validate`, `interaction/focus-ring`: every `focus-visible.ring` is `color.border.focus` and every `focus-visible.ringWidth` `border.focus`, and no cell binds a `color.border.focus-on-*` role. `interaction/wash`: `color.bg.fill.on-inverse-subtle` is bound only under an `inverse` key and `color.bg.fill.on-accent-subtle` only under `accent`. Each has a fixture.
3. Both stacks test the table and the washes: the ring each ground resolves, the band only over imagery and never on a chip's paint, the ring each component draws against the table, each wash cell against the spec, and a contrast guard that computes, from the generated values of every brand, scheme and Increase Contrast context, the ring against its ground's fill (at least 3:1), the ring against its band (at least 9:1), and the wash against its ground (a luminance ratio of at least 1.1).

### 4. Proposed, for the owner

Three choices here are design decisions no ADR settled. Each is the smallest accessible one consistent with the patterns around it, and each can change without moving the rest:

1. **The dark lit tile's wash**, white at 20 % (§2.1). The alternatives are the tile's ink at 4 % (L -0.021, the second tone at 4.56:1) or no wash on the dark tile.
2. **The band over imagery** (§1.3), a look the direction board does not draw: a 2 px ring on a 2 px band of the page, over photographs only.
3. **The system focus colour on macOS under Increase Contrast** kept to the page family (§1.5).

## Alternatives considered

- **Key the ring in every spec's cells.** Twenty-six specs would carry the same matrix, with `material/uneven` reading each ring as a part that keys `inverse` and `accent` and failing every spec whose other parts do not yet. The ring is one role on every ground; a table read in one drawing is the one decision ADR-0040 §4.2 asked for, and a check keeps every spec on it.
- **A two-colour ring everywhere.** It needs no table, but it changes every ring on every ground, and on `inverse` the ink ring merges with the ground and the band carries it, offset from the control. The band is kept for the one ground no pair can check.
- **One ring colour over imagery with a usage limit**, as ADR-0022 §3.3 limits glass. Ink holds 3:1 only at OKLCH L 0.49 and lighter, a tighter bound than light glass's 0.45; white would bar the bright imagery light glass exists for. A second luminance limit for the app to meet, for the one element Prism can make safe by construction, lost.
- **The system focus colour on every ground under Increase Contrast on macOS.** It fails the lit tile (F9), on a check no gate can run.
- **The tile's ink as the dark tile's wash.** It darkens the tile toward its own text: 4.45:1 for the second tone.
- **The ground's opaque lightness step, `color.bg.fill.inverse-pressed`, as the hover on inverse.** It would cover the knocked-out primary pill, which the wash lies on, and turn its label to ink on ink.
- **A wash derived from a part's background cells, with no wash cells.** It is the same rule, written where no binding test can compare a stack with the spec.

## Consequences

- **No committed baseline moves** (F10). The ring and the band draw only while focused, and every wash only while hovered or pressed; at rest the stacks draw what they drew. The local web VRT confirms it on every web baseline.
- **Specs.** Button 7 to 8, IconButton 3 to 4 and Chip 1 to 2, on both stacks, with their manifests. Card stays at 5: its ring cell does not change, and its code passes the ground outside it, which is what §1.1 says a ring reads. Toggle, Checkbox and Radio are edited in place.
- **Tokens.** Five `sys` roles, owned by `colorScheme` and declared in both base scheme files: `color.border.focus-on-inverse`, `-on-accent` and `-on-media`, and `color.bg.fill.on-inverse-subtle` and `color.bg.fill.on-accent-subtle`. `tokens/README.md` lists their segments. The two ADR-0040 §7 pairs of the neutral wash over the tile become the pairs of the tile's wash.
- **Web.** Every focusable element carries `ds-focus-ring` and its ground's attributes; a new focusable component draws no outline of its own. Card's root gains `data-focus-visible`, and the open glyph's rule reads it.
- **Toggle** (P4-12) draws its row's ring through `DSFocusRing` and `useFocusRing`, and its row's wash from the keyed cells.
- **Still open**, each recorded where it is owned: the wash over a solid (ADR-0039's follow-up); the wash on vivid, where white at 6 % over the lightest stops of the dark gradients takes `color.text.on-vivid` from 3.05:1 to 2.83:1 while hovered or pressed, and ink at 6 % does not show on their darkest stops; Card's overlay on `inverse` (P4-D5).

## Rules that follow

1. The focus ring on a ground is the ring of §1.1's table, drawn by `DSFocusRing` on Apple and `focus/FocusRing.css` on the web, and never by a component's own rule. Checked by the table tests on both stacks, and by the stylesheet test, which finds no `outline` in the focus state outside `focus/`.
2. Every spec binds `color.border.focus` as its ring at `border.focus`, and no spec binds a `color.border.focus-on-*` role. Checked by `spec:validate` `interaction/focus-ring` and its fixture.
3. Every ring role holds 3:1 on its ground, and on both glasses and the glass chip over their backdrop sets, for every brand in all six colorScheme contexts. Checked by `pnpm contrast:check`.
4. Over imagery the ring is drawn on a band of the page, and the ring and the band are at least 9:1 apart. Checked by the contrast guards of both stacks.
5. A part that lays a wash where it draws no fill of its own keys `inverse` and `accent` with `color.bg.fill.on-inverse-subtle` and `color.bg.fill.on-accent-subtle`, and each wash carries its text at the functional tier. Checked by the binding tests of the components that draw one, by `interaction/wash`, and by the pairs.
