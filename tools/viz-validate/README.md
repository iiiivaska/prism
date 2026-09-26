# viz-validate

`pnpm viz:validate` checks the chart series palette of every brand in all six colorScheme contexts against the six checks of `docs/research/dataviz-design.md` §1, with `color.chart.now` held against every series slot (roadmap P4-49, critic G-10; ADR-0007 decision 4, ADR-0020 §4 and rule 10). This file is where the checks are written down; `config.ts` holds their numbers, and `checks.ts` implements them.

## The six checks

A palette is the colors of `color.chart.series.1` to `.N` in one brand × colorScheme context. Every color is the token's CSS-gamut-mapped sRGB, the color contrast:check measures. ΔE is the Euclidean distance in OKLab, times 100. Lightness, chroma and hue are OKLCH.

| # | Check | Passes when | Relief |
|--:|-------|-------------|--------|
| 1 | Fixed hue anchors (`hue-anchor`) | Each slot keeps one hue across the brand's six contexts: the hues of its colors span an arc of at most 40°, and in no context is its chroma below 0.02. | none |
| 2 | Lightness band (`band`) | Each slot's L lies in 0.43–0.77 in a light context and 0.48–0.67 in a dark one, bounds included. An increased-contrast or reduced-transparency context takes its base scheme's band. | none |
| 3 | Chroma floor (`chroma`) | Each slot's C is at least 0.10. Below that, a hue reads as gray. | none |
| 4 | CVD separation (`cvd`) | Slots n and n + 1, for every n, and the now marker against every slot, are at least 8 apart under protanopia and under deuteranopia. The simulation is Machado, Oliveira and Fernandes (2009) at severity 1.0, applied in linear sRGB. | 6 to 8 apart passes when every slot of the pair declares direct labels. The table twin is no secondary encoding. A now pair needs only its slot's labels, because the marker carries its own label or value (its token's description). Below 6 nothing passes. |
| 5 | Normal-vision floor (`normal`) | The same pairs are at least 15 apart without simulation. | none |
| 6 | Contrast against the plot (`contrast`) | Each slot reaches 3:1 against `color.chart.plot`, composited over the page, a card and a raised surface, the worst of the three. This is ADR-0011's boundary tier, the 3:1 of WCAG 1.4.11. The ratio comes from contrast:check's own pair evaluation, so both gates give one ratio. | Below 3:1 passes when the slot declares direct labels or the table twin. |

Notes on the checks:

- **Check 1.** The method calls this check structural: eight families in a fixed order, because the order is what keeps neighbours apart under CVD. A token tree cannot show that a hue family was chosen by rule. It can show that slot n is the same family in every context: the dark step is the light hue stepped for the dark surface, not another palette, so the color follows the entity. The bound of 40° is the method's own bound for one hue (its ordinal check, "hue spread > 40°, not a one-hue ramp"). The chroma of 0.02 is one just-noticeable difference in OKLab, the ΔEOK 0.02 of CSS Color 4's gamut mapping. How many families there are (eight in ADR-0007, six as seeded) is P4-50 (1)'s decision, so the check does not count them.
- **Checks 4 and 5.** They pair adjacent slots, because a line, a bar or a stack only puts neighbours side by side, and the slots are assigned in order. Tritanopia is measured and reported, not gated, as the method does. `chart.now` is paired with every slot, because the marker can sit beside any series (ADR-0020 §4).
- **Check 6.** Only series slots are checked. The target, comparison, grid and now lines are contrast:check's pairs.
- **A slot the checks cannot read fails the run.** Examples: slots not numbered 1…N, a translucent slot or now marker, a context without `color.chart.now`, different slot counts in two contexts, or a failed token build. An id under the series group that is no number, such as a future `series.other`, is listed in the report and left out.

## Relief

Checks 4 and 6 read a relief declaration from `viz-relief.json` next to the resolver; `--relief` names another path. A tree without the file declares no relief, which only makes the checks stricter. The repository has no such file today, because every seeded slot clears 3:1 against the plot.

```json
{
  "$comment": "optional",
  "declarations": [
    { "relief": "table-twin", "slots": [4], "schemes": ["light"], "note": "why the charts that draw slot 4 ship the twin" },
    { "relief": "direct-labels", "slots": [4, 5], "schemes": ["light"], "brands": ["prism"] }
  ]
}
```

- `relief` is `direct-labels` or `table-twin` and is required, as is `slots`, the slot numbers.
- `schemes` lists base schemes, and each includes its increased-contrast and reduced-transparency contexts. `brands` lists brands. Both default to all.
- An invalid file is a problem and relieves nothing. So is a declaration that names a slot or a brand the palettes lack.

A declaration is a promise about the charts that draw the slot. Two questions stay with P4-50 (5), critic G-14's relief tier: where Prism declares relief for good, and whether contrast:check reads the same declaration.

## Findings the seeded slots owe, and the gate

The first run's findings on the seeded slots are P4-50's evidence (roadmap P4-49, critic C-10). `config.ts` lists them in `OWED`, keyed by check, base scheme, subject and colors. The run reports them as owed and does not fail on them, in every brand and context whose slots still hold those colors. Any other finding fails the run, and so does a problem.

The list only shrinks. `validate.test.ts` fails on an entry the run no longer finds, and on an entry the first run did not record. P4-50's change removes the entries it fixes. When the list is empty, `viz:validate` is a gate on every finding, as P4-50's acceptance asks. A new brand that keeps the seeded slots owes the same findings. A brand, context or change that brings any other failing color fails at once.

## First run on the seeded slots (2026-09-26)

Six slots and `color.chart.now`, 12 palettes: brands prism and prism-native × the six colorScheme contexts. The findings are the same for both brands, because prism-native overrides no series slot. They are also the same in all three contexts of each base scheme, because no scheme delta touches the series or the now marker. Values are rounded down, lightness to the nearest.

| # | Scheme | Subject | Colors | Measured | Limit |
|--:|--------|---------|--------|----------|-------|
| 1 | all | slot 1 | `#0d0e11`, `#ffffff` | no hue in any context | C ≥ 0.02, one hue |
| 2 | light | slot 1 | `#0d0e11` | L 0.164 | 0.43–0.77 |
| 2 | dark | slot 1 | `#ffffff` | L 1.000 | 0.48–0.67 |
| 2 | dark | slot 2 | `#f39444` | L 0.752 | 0.48–0.67 |
| 2 | dark | slot 4 | `#5bc8b5` | L 0.764 | 0.48–0.67 |
| 2 | dark | slot 5 | `#d48bd0` | L 0.733 | 0.48–0.67 |
| 2 | dark | slot 6 | `#d9c27a` | L 0.818 | 0.48–0.67 |
| 3 | light | slot 1 | `#0d0e11` | C 0.006 | ≥ 0.10 |
| 3 | light | slot 4 | `#1f8f80` | C 0.097 | ≥ 0.10 |
| 3 | dark | slot 1 | `#ffffff` | C 0.000 | ≥ 0.10 |
| 3 | dark | slot 6 | `#d9c27a` | C 0.095 | ≥ 0.10 |
| 4 | light | slots 4–5 | `#1f8f80`, `#a64fa3` | 6.5 (deuteranopia) | ≥ 8; 6 with direct labels |
| 4 | dark | slots 4–5 | `#5bc8b5`, `#d48bd0` | 5.7 (deuteranopia) | ≥ 8 |
| 4 | dark | now–slot 2 | `#f39444`, `#f39444` | 0.0 | ≥ 8 |
| 4 | dark | now–slot 6 | `#f39444`, `#d9c27a` | 6.9 (deuteranopia) | ≥ 8; 6 with direct labels |
| 5 | dark | now–slot 2 | `#f39444`, `#f39444` | 0.0 | ≥ 15 |
| 5 | dark | now–slot 6 | `#f39444`, `#d9c27a` | 10.9 | ≥ 15 |

- **What C-10 already recorded.** Eight rows: dark slots 2, 4, 5 and 6 outside the band; light slot 4 and dark slot 6 below the chroma floor; `chart.now` equal to dark slot 2, which fails checks 4 and 5 at 0.0.
- **Slot 1.** Its five rows follow from slot 1 being ink in light and white in dark. Whether slot 1 may be neutral is P4-50 (1). If P4-50 allows it, its ADR exempts slot 1 from checks 1 to 3 here.
- **Beyond C-10.** Teal beside magenta (slots 4 and 5) is 6.5 apart under deuteranopia in light, which direct labels would carry, and 5.7 in dark, which nothing carries. The now marker is 10.9 from dark slot 6 under normal vision.
- **What passes.** Every slot clears 3:1 against the plot; the lowest is dark slot 3 at 3.72:1 on a raised surface, as contrast:check measures it. Slots 2 to 6 each keep one hue, the widest being slot 6 at 24.6°. Every other adjacent and now pair clears both floors.

`pnpm viz:validate` prints every palette's measures, not only its findings; `--json` prints them as data.

## Running it

```
pnpm viz:validate                        # this repository
pnpm viz:validate --root <dir>           # another tree with the same layout (a fixture runs as its own root)
pnpm viz:validate --resolver <path>      # relative to --root; default tokens/prism.resolver.json
pnpm viz:validate --relief <path>        # relative to --root; default viz-relief.json next to the resolver
pnpm viz:validate --json                 # the run as JSON instead of the report
```

It builds the token bundle through `tools/tokens/api.ts` and reads each brand × colorScheme context as contrast:check does: `api.contrastContexts`, platform web, the other axes at their defaults. That function refuses a color that varies along another axis or between web and Apple.

The report goes to stdout and to `$GITHUB_STEP_SUMMARY`. It has the findings, merged across the brands and contexts they occur in, then each palette's measures and each brand's hue anchors. Contexts that measure alike share one table. Exit codes: 0 when every finding is owed or there is none; 1 on any other finding or a problem; 2 on a usage error. CI runs it in the `contracts` job, gated on this folder's `validate.ts` existing.

## Fixtures and tests

`fixtures/base` is a minimal token tree whose palette passes all six checks: four slots, a neutral now marker and an opaque plot in each scheme. Every other folder holds only the files its case replaces, overlaid on the base (`test-support.ts`).

- One case per check, named for it, fails that check and no other.
- `now` aliases the now marker to a slot.
- `relief` passes on its declaration.

`validate.test.ts` also runs the relief variants, the problems and the repository. `checks.test.ts` pins every boundary and what a relief excuses. `color.test.ts` pins the color science to the validator numbers dataviz-design F61 and F62 recorded. Every rule was mutation-checked when the tool landed: loosening, removing or misreading each one fails at least one test.

## Provenance

- **The method and its numbers.** These come from the `dataviz` skill bundled with Claude Code, its `references/color-formula.md` and `scripts/validate_palette.js`. The skill was read at version 2.1.260 for the research (2026-09-08) and at 2.1.283 for this tool (2026-09-26). It is Anthropic's, under Claude Code's terms, and Prism takes principles only: the six checks, their thresholds, the pair lists and the relief rule. No line of its code or text is copied. The checks are re-implemented here from the sources below. Inventory item `dataviz-skill`.
- **The CVD simulation.** Machado, Oliveira and Fernandes (2009), the protanomaly, deuteranomaly and tritanomaly matrices at severity 1.0 as the authors publish them. Inventory item `machado-2009-cvd`.
- **OKLab.** Björn Ottosson (2020), computed by Color.js, the token build's color library.
- **WCAG 2.x contrast.** Relative luminance and the contrast ratio, from `tools/tokens/ir/color-math.ts`, through contrast:check's pair evaluation.
- **The reference palette values.** The skill's reference hex steps, which dataviz-design §4 orders orange first, appear in that report and as test vectors in `color.test.ts` and `checks.test.ts`. They reproduce F61 and F62 to the recorded digit, which shows this is the method. Whether a brand ships them is P4-50 (1).
- **What is not here.** `research/enum_palette.mjs`, the enumeration script of dataviz-design §7.2, was never committed and is not reconstructed here. It searches orderings for a reseed; see "Left out".

## Left out, and why

- **The slot count and a neutral slot 1.** These are P4-50 (1). The checks apply to every numbered slot, slot 1 included.
- **All pairs.** Scatter, bubble, maps and small multiples put any two series side by side, and the method's validator pairs every slot for them. No wave-1 chart does that, and dataviz-design §3 rule 33 caps those forms at three series. The ticket that adds such a chart adds the pair list.
- **Where relief lives, and a relief tier for contrast:check.** These are P4-50 (5), critic G-14.
- **Ordinal, sequential, diverging and status colors.** The method checks ordinal ramps differently: monotone lightness, steps at least 0.06 apart, a light end at 2:1, one hue. Prism has no such tokens yet (dataviz-design §6, P4-50 (3)).
- **Reseeding.** The checks measure a palette; they do not search for one. The enumeration of orderings that dataviz-design §4 ran belongs to P4-50's decision to reseed or keep the seeds.
