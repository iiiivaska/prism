# ADR-0033: A control's outline is a hairline, and the contrast it owes belongs to its colour

- Status: accepted
- Date: 2026-09-23
- Decision record entry: docs/decisions.md #33

## Context

`Button.yaml` v3 bound the colour of every outline, `root.border` for secondary, ghost (keyed by material) and danger, but it bound no width. Each stack filled the gap on its own:

| | secondary | ghost, on every material | danger |
|---|---|---|---|
| Apple, `DSButtonAppearance.borderWidth` | `border.hairline` | `border.hairline` | `border.hairline` |
| web, `Button.css` | `border.hairline` | `border.strong` | `border.strong` |

That is 1 px against 1.5 px (`ref.border.hairline`, `ref.border.strong`). No check could see it. The parity report compares version integers, the gallery pairs images by file name, and each snapshot suite compares a stack only with itself. So 48 committed baselines recorded two answers for one component: 24 per stack, from `ghost-sm`, `danger-md` and `on-vivid`.

**What the signed-off board draws.** The owner signed off the direction board on 2026-09-16, which closed gate P3-0 (`docs/direction-board/README.md`, "Sign-off checklist"; decision #29). `docs/direction-board/index.html` draws every pill outline at `var(--ds-border-hairline)`. That covers `.btn-secondary`, `.btn-ghost`, the ghost on the scheme's glass and on vivid (`.cardglass .btn-ghost, .vivid .btn-ghost`), `.btn-danger` and `.outline-pill`. It also covers the one outlined circle the board draws, the icon-only "Back to rides" control (`.round.sm.btn-ghost`). The board does use `--ds-border-strong`, for the checkbox box, chart rings, the map-label halo and its status marks (the critical stroke and the incident pill, `.st-stroke` and `.st-pill`). It never uses it for the outline of a control that acts.

**Where the strong width came from.** `IconButton.yaml` has bound `borderWidth: { secondary: border.hairline, ghost: border.strong, danger: border.strong }` since P2-5 (7ad7775). Its `accessibility.contrast` said "the ghost ring on a solid ground is color.border.strong at the boundary tier (3:1)", and that sentence is about a colour. `comp.icon-button.ghost.border` and `comp.button.ghost.border` both alias `sys.color.border.strong`, and `tokens/contrast-pairs.json` holds that colour's boundary-tier pairs on page, surface and raised; the pair on `color.bg.surface` is annotated "outline controls such as the ghost button". ADR-0029 §3.3 keeps the ghost outline in that colour for exactly this reason: its pairs still pass at 3.03:1 or more in light. The width binding then reused the colour's last two words as a width token, `sys.border.strong`. Nothing about the tier depends on the width. `tools/contrast` compares colour pairs and has no notion of stroke width, and the 3:1 of WCAG 1.4.11 is a ratio between two colours. `Button.css` came later (P3-4, ca93ed9), when Button.yaml had no width to read, and it took IconButton's cells for ghost and danger. `DSButtonAppearance` took the board's answer. IconButton's own tokens agree with the board: `comp.icon-button.ghost.bg.pressed` calls the ghost ring "the hairline ring", and the spec's summary and its `selected-in-group` example both speak of "hairline rings".

## Decision

1. **`Button.yaml` binds `root.borderWidth` by variant: `border.hairline` for secondary, ghost and danger.** Primary has no cell, because it has no outline. The cell has no material level, so a ghost outline on vivid or glass is as wide as on a solid ground. This is a binding change, so Button goes to specVersion 4 and both manifests move with it.
2. **The web moves, and Apple already drew the answer.** `Button.css` draws ghost and danger at `--ds-border-hairline`. `DSButtonAppearance.borderWidth(_:)` now returns the cell for each variant (a key path, `nil` for primary) instead of one constant. Both binding tests read the cell out of the spec (`DSSpec.binds` on Apple, `cell(root["borderWidth"], …)` on the web), and each also checks that an outline has a width exactly where it has a colour.
3. **The contrast an outline owes belongs to its colour, never to its width.** When a spec states that an outline meets the boundary tier, it names the colour token and its pair, and no width follows from that sentence. The width is a cell of its own. It is read off the board, or chosen as a width for a stated reason: Chip's selected ring thickens to `border.strong` as a selection cue, and that is a width chosen for being a width. `color.border.strong` and `border.strong` are two tokens that share a name and nothing else, and the contrast clauses of `Button.yaml` and `IconButton.yaml` now say so.
4. **IconButton's rings follow the same rule.** In P4-4's Spec step, `IconButton.yaml`'s `borderWidth` for ghost and danger becomes `border.hairline`. That edit is made in place, because no stack implements IconButton yet (spec/SCHEMA.md, "Versioning rules"). An IconButton is Button's pill at its shortest, so the two cannot keep different rules.

## Alternatives considered

- **`border.strong` for ghost and danger on both stacks.** This was the web's answer and IconButton.yaml's as written. It lost because it is the opposite of what the board draws, and the board is the signed-off authority for how Prism looks (#29). Its only support was the contrast clause, which it misread.
- **Fix only the web and leave Button.yaml unbound.** It lost because the missing cell is what let the stacks diverge without anyone seeing it. An unbound width is a cell each stack has to guess.
- **A heavier ghost outline, because the ghost has no fill.** It lost because the board does not draw one. The ghost at rest is identified by its colour's 3:1, not by extra weight.

## Consequences

- **24 committed web baselines move, and no Apple baseline does.** The web images are `Button/ghost-sm`, `Button/danger-md` and `Button/on-vivid`, each × `web-desktop`/`web-touch` × light/dark × compact/regular. This was measured before and after on this Mac. On the web, Chromium at 1× rendered the VRT harness's own stage with its own settings: 436 renders, 412 byte-identical and 24 changed, with every changed pixel inside the pill. On Apple, `DSExampleSnapshotTests` rendered on the iPhone 17 simulator, iOS 26.5: 544 renders, all byte-identical. Those baselines are tracked, so they are re-recorded through the sanctioned `workflow_dispatch` route (P4-1) and not through the hand-back.
- Button 4 also takes the rename that `spec/SCHEMA.md` owed Button's next change (roadmap P4-D3): `fullWidth` becomes `isFullWidth` on both stacks. No example sets it, so it moves no image.
- Card's selection outline has the same shape: `Card.yaml` binds colours for `selected.border` but no width. The two stacks agree on `border.strong` there (`DSCardAppearance.selectedBorderWidth` cites visual-dna §7.5, and `Card.css` matches), so nothing diverges today. Card's next change should still bind the cell, so that the agreement is in the spec and not only in the two stacks.
