# ADR-0040: A part keys `inverse`, `accent` and light glass, or its spec says what it draws there; the solid on the scheme's glass is the inverse solid

- Status: accepted
- Date: 2026-09-26
- Decision record entry: docs/decisions.md #40

## Context

A Surface publishes the material it paints, and a spec cell keyed by a material applies when the enclosing Surface publishes it (ADR-0022 §3.1). A part with no cell for the published material takes its `default` cell (spec/SCHEMA.md, "The binding-matrix grammar"). For three materials that default is often wrong, and nothing noticed:

- **`inverse`** is the one solid control or the one selected card: a Surface publishes it for `material: inverse`, and a selected glass Surface publishes it under the glass fallback (Surface.yaml). Toggle, Checkbox, Radio, Slider, TextField, TextArea, Select and SegmentedControl declared no `inverse` cell. So inside a selected glass Card under Increase Contrast a control's inverse solid landed on the inverse ground, and TextField's value was `color.text.primary` on ink. Tooltip reads no material at all, so its chip was the ground's colour there.
- **`accent`** is the lit tile. TextField, TextArea and Select had cells, SegmentedControl had them on some parts, ProgressBar and ProgressRing on their text only, and the rest none.
- **`glassLight`**, light glass: only Spinner had cells, and the text of ProgressBar and ProgressRing.
- **The solid on the scheme's glass was bound two ways.** ADR-0030 §3.1 says that on the scheme's glass "`bg.fill.inverse` is already right: ink on light glass and white on smoke", and the signed-off direction board draws it so (`docs/direction-board/index.html`, `.cardglass`: "the one solid is bg.fill.inverse"). Button, SegmentedControl, ProgressBar and ProgressRing followed. Toggle, Checkbox, Radio, Slider, Pagination and the implemented IconButton bound `color.bg.fill.inverse-media` under `glass`, the white solid, which in the light scheme is a white disc on light glass.
- **Charts.** ADR-0030 rule 3 says `glassLight`, `inverse` and `accent` hold no chart, and ProgressBar and ProgressRing bound chart roles with no cell for any of them.

P4-7 and P4-8 answered the same question for Avatar and Chip, one at a time: neither draws a fill of its own on `inverse` or `accent`, and every part takes the material's foreground, Avatar's ring `color.text.on-inverse` included. Roadmap P4-10 asked for one rule across the wave, and for a check.

The owner decided on 2026-09-26 (decision brief, question 1): the solid on the scheme's glass is the ink solid, `color.bg.fill.inverse`, as ADR-0030 §3.1 already says. That is conformance, and ADR-0030 is not amended. IconButton moves to it on both stacks, the wave-2 specs drop their `glass` cells in place, and everything else P4-10 assigns is done, including the cells Button and IconButton lack.

### Facts verified for this ADR

- In the dark scheme `color.bg.fill.inverse` and `color.bg.fill.inverse-media` are both `neutral.0`, and `color.text.on-inverse` and `color.text.on-inverse-media` both `neutral.950`. Moving the solid on glass changes the light scheme only.
- `pnpm contrast:check`, both brands, all six colorScheme contexts: `color.bg.fill.inverse` on `color.text.on-inverse` is 19.30:1; `color.bg.fill.accent` on `color.text.on-accent` is 12.01:1 in light and 8.39:1 in dark.
- The white solid against the lit tile is 1.61:1 in light (#FFFFFF on #FFC07A) and 2.30:1 in dark (on #F39444). The tile's own ink is 12.01:1 and 8.39:1.
- `color.border.focus` is `neutral.950` in light and `neutral.0` in dark: the inverse fill's own colour in each scheme. `color.bg.fill.neutral.subtle` is ink at 6 % in light and white at 6 % in dark, and composites to nothing on the inverse fill (ADR-0039).
- Light glass keeps the scheme's glass grammar in each scheme: `material.glass.light.fill` is white at 30 % in light and 26 % in dark, `color.text.on-glass-light` is ink in light and white in dark, and `color.border.on-glass-fill` is `color.border.strong` (ink at 45 %) in light and `color.border.on-media` (white at 40 %) in dark.
- The knocked-out solid's pressed step (§3.5), computed with Color.js: `neutral.0` to `neutral.200` is ΔL −0.0843 in OKLab and `neutral.950` to `neutral.850` is +0.0838, the step of ADR-0039; ink at 88 % over the lit tile is #2A231E in light (ΔL +0.098) and #291E17 in dark (ΔL +0.082), and the tile's colour on it is 9.63:1 and 7.07:1.

## Decision

### 1. The solid on the scheme's glass is the inverse solid

1. On a surface that publishes `glass`, the solid is `color.bg.fill.inverse` under `color.text.on-inverse`: ink on light glass, white on smoke (ADR-0030 §3.1). No `glass` cell binds `color.bg.fill.inverse-media`, its pressed step or `color.text.on-inverse-media`: the white solid is vivid's alone.
2. Light glass takes the same solid, the default inverse solid: ink in light, white in dark.
3. Edited in place, at their current specVersion: Toggle, Checkbox, Radio and Slider drop their `glass` cells for the solid and what it carries, and Pagination's current page drops its `glass` cells, so each takes its default inverse solid on glass. IconButton's primary and selected circles move on both stacks (§7).

### 2. On the three materials a part takes the material's foreground

1. | Material | Text and glyphs | Quieter tones | Rings, outlines, ticks, tracks |
   |----------|-----------------|---------------|--------------------------------|
   | `inverse` | `color.text.on-inverse` | `color.text.on-inverse` | `color.text.on-inverse` |
   | `accent` | `color.text.on-accent` | `color.text.on-accent-secondary` | `color.text.on-accent-secondary` |
   | `glassLight` | `color.text.on-glass-light` | `color.text.on-glass-light` | `color.border.on-glass-fill` |

   This is ADR-0022 §3.1's tone table, with ADR-0030 §3.4's accent row, extended from text to every part that carries colour. `inverse` has one foreground and no alpha tone (ADR-0022 §3.1), so a status tone there keeps its glyph and loses its hue, as on glass. On `inverse` and `accent` a ring or an outline is a functional pair on the material's fill, which a field's edge needs, since the edge identifies the control; `color.border.boundary` does not hold on the tile. On light glass the rings are decorative, as on the scheme's glass (ADR-0030 §3.2).
2. On light glass a part draws what it draws on the scheme's glass, in light glass's one tone: no ground of its own where it has none on glass, and the scheme's glass's solid (§1.2).

### 3. On `inverse` and `accent` there is one solid and no second ground

1. **The solid knocks out.** A selected or primary solid (the on track, the checked box, the selected radio, the filled length and the thumb of a Slider, the selected segment) fills with the material's primary foreground, `color.text.on-inverse` or `color.text.on-accent`, and what it carries takes the material's own fill, `color.bg.fill.inverse` or `color.bg.fill.accent`. The inverse solid would be the ground's colour on `inverse`, and on the dark lit tile a white solid is 2.30:1 against the tile where the tile's ink is 8.39:1.
2. **A part's own opaque ground is not drawn**: a raised pill, a field's box, a track's neutral step. Its cell names every other material and has no `default`, so on these two it is not set. This is P4-7's and P4-8's answer, now the system's.
3. **A track that would be the fill's colour is not drawn on `inverse`**, where the material has one foreground: Slider's, ProgressBar's and ProgressRing's. The fill, the thumb and the readout carry the value. On `accent` the track is `color.text.on-accent-secondary` under a `color.text.on-accent` fill.
4. **A tinted part paints `color.bg.page` under its tint** on both materials, as over media (ADR-0030 rule 6), so the pair it carries is the pair the contrast gate checks.
5. **A knocked-out solid that is pressed takes one lightness step of its own** (ADR-0039 rule 5). Two `sys` roles, owned by `colorScheme`, land with the only pressable ones, Button's primary pill and IconButton's primary and selected circles (§7):

   | Token | Light | Dark |
   |-------|-------|------|
   | `sys.color.bg.fill.on-inverse-pressed` | `{ref.color.neutral.200}` | `{ref.color.neutral.850}` |
   | `sys.color.bg.fill.on-accent-pressed` | `{sys.color.text.on-accent}` at alpha 0.88 | the same |

   The first is the inverse solid's step from the other side: the knocked-out solid on `inverse` is `neutral.0` in light and `neutral.950` in dark, and it steps toward the middle of the ladder as ADR-0039's roles do. The second is relative, because `color.text.on-accent` follows a brand's `text-on-accent` slot: 12 % of the tile shows through the tile's ink. Each carries the material's fill as its label, a functional pair (the second over `color.bg.fill.accent`).
6. **Pairs.** `color.bg.fill.inverse` on `color.text.on-inverse` and `color.bg.fill.accent` on `color.text.on-accent`, both functional, cover every knocked-out solid and what it carries.

### 4. What no material keys: the interaction layers

1. The hover and pressed washes of `color.bg.fill.neutral.subtle`, the focus ring `color.border.focus`, and a field's hovered, focused, erroneous and read-only edge and fill are keyed by no material in any spec, on glass and vivid as on these three. This decision does not key them either. A part that draws only these, such as the row root of Toggle, Checkbox and Radio, is named in `materials` with that reason (§6).
2. Two of them fail on these materials, and this ADR records them rather than settling them. The focus ring is the inverse fill's own colour in both schemes, 1:1 on `inverse`, and white is 2.30:1 on the dark lit tile, both below ADR-0011's 3:1 for focus rings. The neutral wash composites to nothing on the inverse fill (ADR-0039). A ring and a wash are drawn by every focusable or pressable component on every ground, the implemented Button, IconButton, Chip and Card included, so they are one decision for all of them, recorded as P4-10's follow-up and not made spec by spec here.
3. The exception is a pressed fill that would hide what it carries. Button's and IconButton's pressed cells for the knocked-out solid (§3.5), and for secondary, ghost and plain on `inverse` (§7), are keyed, because their `default` would put the label on its own colour.

### 5. A meter is not a chart

ProgressBar and ProgressRing are meters. On `glassLight`, `inverse` and `accent`, which hold no chart (ADR-0030 rule 3), they bind no chart role: the track and the fill or arc are marks in the material's own tones (§2, §3), the split bar's `segment` and the `marker` tick are not drawn, and `label` or `showsValue` carries the value, the target in words. On `inverse` an indeterminate ring turns as a Spinner does.

### 6. The rule, its statement and its check

1. For each of `inverse`, `accent` and `glassLight`, every part that carries colour keys the material, or the spec's new optional `materials.<material>` field names the part in backticks and says what it draws there: nothing, no ground of its own, the default it keeps, or the interaction layers only (§4). A part is held as a whole: a colour cell in one of its state blocks makes it colour-bearing, and a keyed cell in any of its properties or states keys it. `materials` is prose, and its token paths resolve like `behavior`'s.
2. Two absences are rules of their own. A Skeleton is never placed on these materials: its 6 % step composites to nothing on `inverse`, it would stain the lit tile, and it would be a grey on light glass. A Tooltip reads no material: its chip is the inverse solid on every ground, so over an `inverse` ground `elevation.3` alone sets it apart.
3. `spec:validate` reports `material/uneven`, with a fixture:
   - for every component spec, where one colour-bearing part keys a material and another neither keys it nor is named;
   - for the specs whose materials are settled (`MATERIALS_SETTLED` in `tools/spec/config.ts`), for every colour-bearing part that neither keys a material nor is named. They are the wave-2 specs this decision edits (Checkbox, ProgressBar, ProgressRing, Radio, SegmentedControl, Select, Skeleton, Slider, TextArea, TextField, Toggle, Tooltip), and Spinner, which already met it; Button and IconButton join with §7. The list only grows.
   - `MATERIALS_OWED` lets through the specs recorded rather than settled, each with its owner: Avatar, Card and Chip (§7), and the thirteen composite and data-viz specs that key unevenly today, the allow-list roadmap P4-27 empties. `validate.test.ts` fails an owed entry that keys evenly, so that list only shrinks. Surface, which publishes a material and keys its own `material` prop, is not read.
4. `material/glass-solid` fails a `glass` cell that binds `color.bg.fill.inverse-media`, `color.bg.fill.inverse-media-pressed` or `color.text.on-inverse-media` (§1.1). It lands with §7, when IconButton's last such cells go.

### 7. The implemented specs

1. **Button (specVersion 7) and IconButton (specVersion 3) take their cells now, on both stacks**, the owner having asked for them with the solid on glass:
   - `primary`, and IconButton's selected circle: knocked out on `inverse` and `accent` (§3.1), pressed `color.bg.fill.on-inverse-pressed` and `color.bg.fill.on-accent-pressed` (§3.5). On the scheme's glass and on light glass, the default inverse solid (§1). IconButton's `glass` cells for the solid go, and its `on-glass-over-map` example turns from a white circle to an ink one in light.
   - `secondary`: on `inverse` and `accent` its raised fill is not drawn (§3.2), so it draws what `ghost` draws there, an outline in `color.text.on-inverse` or `color.text.on-accent-secondary` around the material's foreground. Its pressed fill on `inverse` is `color.bg.fill.inverse-pressed`, one lightness step of the ground (§4.3), and on `accent` `color.bg.fill.neutral.subtle`, the control wash of visual-dna §4.5. On light glass it keeps its raised pill, as on the scheme's glass.
   - `ghost`, and IconButton's `plain`: the material's foreground, and for `ghost` its outline (§2); pressed on `inverse` `color.bg.fill.inverse-pressed`, since the wash composites to nothing there.
   - `danger`: an `underlay` of `color.bg.page` under its tint on `vivid`, `glass`, `glassLight`, `inverse` and `accent` (§3.4). Button gains the cell IconButton already has; both stacks already paint it over media.
   - Button's `spinner` follows the pill's foreground; `materials.glassLight` names it, since the pill keeps its default cells there.

   DashboardGrid's control swap (P4-61 (1)) is answered by these cells rather than by visual-dna §4.5's wash at rest.
2. **Recorded, not edited here**, each with the change that next moves its spec: Avatar and Chip keep their P4-7 and P4-8 answers in `behavior` and key unevenly (`materials` statements wait for their next change); Card's custom disc is the inverse solid on an inverse ground (P4-D5); Badge keys none of the three, and its neutral filled disc is the inverse solid, the ground's colour on `inverse`; Divider states its absence on `inverse` and `accent` in `behavior` rather than in `materials`.

## Alternatives considered

- **The white solid on the scheme's glass everywhere**, amending ADR-0030 §3.1 to what IconButton drew. It lost with the owner: in light it is a white disc on light glass, which the signed-off board does not draw and whose edge only a hover or pressed overlay showed.
- **Cells on every part for every material, with no stated absence.** It lost because some parts have nothing to draw there: a Skeleton is never placed on these materials, a Tooltip reads none, and a meter's chart roles are forbidden there. A cell would have to invent a colour for a part that is not drawn.
- **Parts follow the material with no cell**, as Text's tones do (ADR-0022 §3.1). It lost because a part's role is not a tone: a solid, a track and an outline each resolve differently, and only an explicit cell renders a pair the contrast gate checks.
- **visual-dna §4.5's control wash at rest on the lit tile**, `color.bg.fill.neutral.subtle` in place of the raised fill. It lost to P4-7's and P4-8's answer, no fill of its own: the wash is white at 6 % on the dark tile, a step that does not show, and it would leave secondary a fill on `accent` and none on `inverse`. It is secondary's pressed fill on the tile instead.
- **Keying the focus ring and the washes here.** Deferred (§4): they are one decision for every focusable component on every ground, glass and vivid included.
- **Leaving Button and IconButton for their next change**, as the P4-10 row first said. The owner asked for their cells now, with IconButton's move to the ink solid.

## Consequences

- The wave-2 tickets (P4-12 to P4-24) implement these cells, and their binding tests read them from the specs. No wave-2 spec is implemented, so none takes a specVersion bump and no image moves with the specs.
- Button 7 and IconButton 3 change on both stacks. IconButton's `on-glass-over-map` images move in the light scheme: an ink circle on light glass. No other example renders a changed cell.
- New pairs in `tokens/contrast-pairs.json`: the two knockouts (§3.6) now, and the two pressed steps with their roles (§3.5). `tokens/README.md` lists the roles' segments when they land.
- A new spec states its materials or is held by `material/uneven` wherever it keys one unevenly. P4-27 settles the composite layer and empties its entries of `MATERIALS_OWED`.
- Still open: the focus ring and the washes on `inverse` and `accent` (§4.2).

## Rules that follow

1. A `glass` cell never binds the white media solid or what it carries. Checked by `material/glass-solid` (§6.4).
2. On `inverse`, `accent` and `glassLight`, every colour-bearing part of a settled spec keys the material or is named by `materials`, and every spec keys each of them evenly unless its entry in `MATERIALS_OWED` names who settles it. Checked by `material/uneven` and its fixture.
3. A solid on `inverse` or `accent` is knocked out, and a pressable one has a pressed step that is not its rest (§3.5, ADR-0039 rule 3). Checked by the pairs in `tokens/contrast-pairs.json` and by the binding tests of the components that draw one.
4. A part's own opaque ground has no cell on `inverse` or `accent`, and a tinted part paints `color.bg.page` under its tint there. No tool reads this from a spec: a spec review holds it against this ADR, and each component's binding tests then hold its stacks to the spec.
