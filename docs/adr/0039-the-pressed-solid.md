# ADR-0039: A pressed solid is one lightness step from its rest: `bg.fill.inverse-pressed` and `bg.fill.inverse-media-pressed`

- Status: accepted
- Date: 2026-09-26
- Decision record entry: docs/decisions.md #39

## Context

ADR-0023 §8.4 item 2 says that under Reduce Motion "the geometry … takes its end value at once", and that the press "shows instead as an opacity or color change to a token the spec names". Button and IconButton follow it: nothing scales, and each variant's pressed fill is the substitute. For the inverse solid, the single primary pill or circle of a group, that fill was the fill already on screen:

- `comp.button.primary.bg.pressed` and `comp.icon-button.primary.bg.pressed` aliased `sys.color.bg.fill.inverse`, which is also what `.rest` aliases. Over media, both components forced the pressed cell to `color.bg.fill.inverse-media`, the rest fill there.
- The one overlay the components could add, `color.bg.fill.neutral.subtle`, is the inverse fill's own colour at 6 %: `neutral.950` over `neutral.950` in light, white over white in dark. It composites to nothing. IconButton laid it over primary and a selected circle on every press, and it showed only over the white media solid in light.

So a Reduce Motion press of the default Button variant, and of a primary or selected IconButton, showed nothing but the haptic, on every ground except IconButton's media solid in light. The Apple pixel suites held it as ten known issues: `DSButtonReduceMotionTests` for primary, two schemes on two grounds (4), and `DSIconButtonReduceMotionTests` for primary and a selected circle, on the page in both schemes and on vivid in dark (6). The roadmap's "Verify before implementing" list carried it as "Button `primary` has no Reduce Motion press". It had to be settled before Toolbar and TabBar put a selected circle among rings (P4-42), and before Pagination's current page (P4-36).

The owner chose the first of three options in the decision brief of 2026-09-26 (question 4).

### Facts verified for this ADR

WCAG 2.x luminance and OKLab lightness of the `ref.color.neutral` steps (`tokens/ref/color.palette.tokens.json`):

| Step | Hex | OKLab L |
|------|-----|---------|
| `neutral.950` | #0D0E11 | 0.1640 |
| `neutral.850` | #1F2126 | 0.2478 |
| `neutral.200` | #E1E3E8 | 0.9157 |
| `neutral.0` | #FFFFFF | 1.0000 |

- `neutral.950` → `neutral.850` is ΔL +0.0838, and `neutral.0` → `neutral.200` is ΔL −0.0843: the same step in each direction. The solid against its pressed step is 1.20:1 in light and 1.28:1 in dark (luminance ratio).
- `color.text.on-inverse` on the pressed inverse solid: white on #1F2126 is 16.10:1, and ink on #E1E3E8 is 15.02:1. `color.text.on-inverse-media`, ink, on #E1E3E8 is 15.02:1. `pnpm contrast:check` reports the same for both brands in all six colorScheme contexts.
- The increased-contrast delta files do not touch `bg.fill.inverse` or `bg.fill.inverse-media`, so the step is the same under Increase Contrast.

## Decision

1. **Two `sys` colour roles, owned by `colorScheme` and declared in both base scheme files** (ADR-0024 §9.1, ADR-0030's preamble), with ADR-0026's `figma` metadata:

   | Token | Light | Dark |
   |-------|-------|------|
   | `sys.color.bg.fill.inverse-pressed` | `{ref.color.neutral.850}` | `{ref.color.neutral.200}` |
   | `sys.color.bg.fill.inverse-media-pressed` | `{ref.color.neutral.200}` | `{ref.color.neutral.200}` |

   Each is one step of the neutral ladder from its rest role, toward the middle of the ladder: the ink solid lightens and the white solid darkens. The step is a lightness step and not an overlay, so it shows on the solid in both schemes and keeps the solid opaque, and its text keeps its own role.
2. **The components' pressed cells take them.** `comp.button.primary.bg.pressed` and `comp.icon-button.primary.bg.pressed` alias `bg.fill.inverse-pressed`. Button's pressed cell gains `vivid: color.bg.fill.inverse-media-pressed`, which replaces the implementations' forced rest fill (Button v6). IconButton's pressed cells over media take `color.bg.fill.inverse-media-pressed`, its pressed overlay leaves primary and stays on danger, and a pressed selected circle takes primary's pressed fill (IconButton v2).
3. **The step shows on every press, in both motion modes.** It is the variant's pressed fill, as secondary's nested step already is. Under standard motion it comes with the 0.97 scale. Under Reduce Motion it is the whole substitute, over `motion.duration.base` with `motion.easing.out`.
4. **Pairs.** `color.text.on-inverse` on `color.bg.fill.inverse-pressed`, and `color.text.on-inverse-media` on `color.bg.fill.inverse-media-pressed`, both functional. Each text token lists the new ground in `a11y.pairsWith`.
5. **The rule for the next solids.** A component that draws the inverse solid and gives it a press binds these roles for its pressed fill: the pressed cell of a solid never aliases the rest cell's role, and never relies on `color.bg.fill.neutral.subtle` over the solid. Pagination's current page (P4-36), and TabBar's and Toolbar's selected circles (P4-42), take it when they are built. Card's custom disc (P4-D5) takes it on `Card.yaml`'s next change.

## Alternatives considered

- **An opacity dip.** `opacity.pressed`, about 0.8 on the whole pill or circle, under Reduce Motion only. ADR-0023 §8.4 quotes it for Button and Card, and it needs no media twin. It lost because it dims the label with the fill, because the dimmed pill over a vivid gradient is a pair no check can evaluate, and because it would leave the standard press unchanged.
- **An inverse-tone overlay.** `color.bg.fill.on-inverse-subtle`, white at 12 % in light and ink at 12 % in dark, plus a media twin, as the pressed and the hover overlay of a solid. It would also fix the solid's invisible hover. It lost because it adds a translucent family and overlay cells keyed by variant to two specs, where two opaque roles and the existing cells are enough, and the hover can take the same step later.
- **Keep the known gap.** It lost because a Reduce Motion user pressing the default Button variant on a phone gets only the haptic, and two wave-2 hosts were about to copy it.

## Consequences

- **No committed baseline moves.** No example on either stack is photographed pressed. The token change reaches the pressed state only.
- The ten `withKnownIssue` cases leave `DSButtonReduceMotionTests` and `DSIconButtonReduceMotionTests`, which now pass on every case or fail. The web has no known-issue counterpart; its tests read the new cells out of the specs, and its component tests check the step in the browser.
- The hover overlay on a solid still composites to nothing, with the same arithmetic. It stays a follow-up, as the brief recorded: hover is pointer-only and never the only feedback of an action, while the press under Reduce Motion had no substitute at all.
- Card's custom disc draws IconButton's grammar by hand (P4-D5). It keeps the neutral overlay, and so the invisible Reduce Motion press, until `Card.yaml` changes. This decision is P4-D5's trigger ("a change to IconButton's press").
- `tokens/README.md` lists the two new segments, `inverse-pressed` and `inverse-media-pressed`, and names both roles in its examples.

## Rules that follow

1. `sys.color.bg.fill.inverse-pressed` differs from `sys.color.bg.fill.inverse`, and `sys.color.bg.fill.inverse-media-pressed` from `sys.color.bg.fill.inverse-media`, in every colorScheme context and for every brand. Checked on Apple by `DSButtonReduceMotionTests` and `DSIconButtonReduceMotionTests` (at least three 8-bit code values inside the fill, on the page and on vivid, in both schemes, with no known issue), and on the web by `test/button.test.tsx` and `test/icon-button.test.tsx`, which compare the resolved rest and pressed values per scheme.
2. Every foreground drawn on a pressed solid has its pair in `tokens/contrast-pairs.json`: checked by `pnpm contrast:check` and by the `a11y.pairsWith` rule of `tokens/README.md`.
3. A spec whose pressed cell for a solid names a role equal in value to its rest cell, or an overlay of `color.bg.fill.neutral.subtle` on it, is a defect to fix in the spec, not a known issue to hold.
