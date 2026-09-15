# ADR-0011: Accessibility in tiers, enforced in CI

- Status: accepted (the thin-weight bullet amended by [ADR-0021](0021-typography-rules.md); the glass bullet, rule 3's fallback token path and the Increase Contrast consequence amended by [ADR-0022](0022-materials-and-fallbacks.md): glass renders the opaque `raised` surface under Reduce Transparency and Increase Contrast, chosen inside Surface, and glass text is checked over each material's backdrop set; the Reduce Motion bullet amended by [ADR-0023](0023-motion-tokens.md))
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #11

## Context

The references are, in places, deliberately low-contrast: ultra-thin grey numerals on near-black, tertiary captions at 10–11 px, text over blurred photos. That reads well on a Dribbble shot and fails in sunlight, for older eyes, and under WCAG. At the same time the character of the references lives precisely in those large thin numerals and airy captions. Apple exposes user preferences that must be honored: Dynamic Type, Bold Text, Increase Contrast, Reduce Transparency, Reduce Motion, Differentiate Without Color. The owner is the only reviewer; agents will generate most screens; rules that are not machine-checked will be broken.

## Decision

### Contrast tiers

| Text class | Minimum contrast | Where it applies |
|------------|------------------|------------------|
| Functional text: body, labels, values, control text, chart axis labels | **4.5:1** (WCAG AA) | every size below 24 px / 18 pt |
| Large functional text | **3:1** | ≥ 24 px regular or ≥ 19 px bold |
| Decorative / tertiary text | **3:1** | only at ≥ 24 px, e.g. dimmed decimals of hero numerals, unit suffixes ≥ 24 px |
| UI boundaries: input borders, focus rings, chart lines that carry meaning | **3:1** | against adjacent surface |

Tertiary text below 24 px is functional by definition and must meet 4.5:1; "tertiary" changes the token, not the threshold.

### Weight and material rules

- Weights below 300 are allowed only for `type.metric.*` at ≥ 34 pt. Under Bold Text or Increase Contrast they resolve to weight 400 through the token layer.
- `surface.glass` resolves to `surface.solid` under Reduce Transparency; text over glass must pass 4.5:1 against the glass fill at its darkest and lightest permitted backdrop (tested against two synthetic backdrops in CI).
- Motion tokens resolve to a 150 ms crossfade under Reduce Motion; no parallax, no spring overshoot.
- Status is never conveyed by color alone: every status token pairs with an icon id from the registry and a text label.

### Dynamic Type and scaling

- All type roles scale with Dynamic Type on Apple (custom fonts via `relativeTo:` metrics) and with `rem` on web. Components grow with text up to the AX3 size and then clamp or reflow as the spec says; nothing truncates a label to keep a fixed height.

### Spec requirements

Every component spec has a mandatory `accessibility` block: role, label source, keyboard behavior, Dynamic Type behavior, contrast requirement, Reduce Transparency and Reduce Motion behavior. The schema rejects specs without it.

### CI

`tools/contrast` computes contrast for every pair in `tokens/contrast-pairs.json` for every brand × scheme × Increase Contrast variant and fails on any pair below its tier. `tools/parity` fails on specs whose `accessibility` block is incomplete.

## Alternatives considered

- Strict AA everywhere: loses the hero numerals and airy captions that define the look.
- Aesthetic first, accessibility best-effort: unreviewable at agent speed.

## Consequences

- Palettes are tuned to pass at the token level, so components inherit compliance; the a11y reconciliation of the reference palette lives in `docs/research/a11y-reconciliation.md`.
- Increase Contrast gets its own token layer (`tokens/scheme/*/contrast-high.json`), not per-component branches.

## Rules that follow

1. No color pair may be used for text unless it is listed in `contrast-pairs.json` and passes.
2. Thin weights only through `type.metric.*`; never ad hoc.
3. Glass only where the spec allows and only with the fallback token path present.
4. Every icon-only control has a registry label; every status has icon + text.
