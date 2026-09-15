---
name: prism-design-system
description: How to build UI with the Prism design system (SwiftUI + React). Use whenever a task touches screens, components, colors, typography, spacing, icons, charts or motion in an app that depends on @iiiivaska/prism-* or the Prism SPM package.
---

# Prism for agents

Prism is a token-driven, brand-agnostic design system with two implementations: SwiftUI (`import DSComponents`, `DSCharts`) and React (`@iiiivaska/prism-react`, `@iiiivaska/prism-charts`). This skill tells you what exists and the rules you must not break. When in doubt, open the component's spec: `spec/components/<Name>.yaml` in the Prism repository (or `node_modules/@iiiivaska/prism-react/spec/` and the SPM package's `Spec/` resources).

## The five rules

1. **Never write a raw value.** No hex colors, no `px`/`pt` numbers for spacing or radius, no font names, no durations. Use tokens. Swift: the `DSTokenSet` members DSCore provides (`tokens.color.textPrimary`, `tokens.space.step4`, `tokens.typography.bodyMd`); web: `var(--ds-color-text-primary)`, Tailwind `text-ds-primary`, `p-ds-4`, `type-ds-body-md`. Never re-brand in the app: do not override `--ds-*` variables, and add no custom colors or fonts. A new look is a new brand in Prism.
2. **Never invent a component.** If the inventory below lacks what you need, compose existing components or stop and report the gap; do not hand-roll a card, a pill, a chart.
3. **Never reference an icon by vendor name.** Use registry ids: `DSIcon(.actionAdd)` / `<Icon name="action.add" />`. The registry is `spec/icons/registry.json`.
4. **Respect surfaces.** Content sits on `solid`, `vivid` or `glass` surfaces. Glass only over an image, a map or a vivid surface; never glass on glass. Surface itself renders glass as an opaque raised surface under Reduce Transparency, Increase Contrast and on watchOS; never read or branch on those settings yourself (ADR-0022). System chrome (toolbars, tab bars, sheets) is native and not styled by you.
5. **Accessibility is not optional.** Every icon-only control has a label; every status has icon + text; text pairs come only from tokens (they are pre-checked for contrast); weights come only from `type.*` roles: never set a font weight, italic or font size in code (thin exists only in `type.metric.xl` in dark, ADR-0021).

## Inventory (v1)

- **Primitives**: Text, Icon, Surface, Button, IconButton, Toggle, Checkbox, Radio, Slider, TextField, TextArea, Select, SegmentedControl, Chip, Badge, Avatar, Divider, ProgressBar, ProgressRing, Spinner, Skeleton, Tooltip.
- **Composites**: ListRow, Card (solid | vivid | glass), StatCard, StatusPill, FormField, SearchField, PillTabs, Stepper, Timeline, Toast, Banner, Alert, Dialog, Sheet, Popover, Menu, TabBar, TopBar, Toolbar, EmptyState, Pagination. Desktop only: Sidebar, Table, CommandPalette, ContextMenu.
- **Data-viz**: StatTile, Sparkline, RingGauge, LineChart, AreaChart (v1); BarChart, Legend, ChartTooltip, TimelineScrubber, ArcGauge, DeltaIndicator (v1.1).
- **Patterns** (recipes, see `spec/patterns/`): dashboard grid, detail screen, adaptive shells (stack / split / sidebar).

## Choosing between similar components

- Action → **Button**. Navigation to another screen → **ListRow** or a link; never a Button.
- One number with a label → **StatTile** (adds sparkline / delta). A number inside richer content → **StatCard**.
- Filtering a list by category → **PillTabs**. Switching two or three equivalent views → **SegmentedControl**.
- Transient confirmation → **Toast**. Persistent condition → **Banner**. Needs a decision → **Alert** / **Dialog**.
- Progress with a known end → **ProgressBar** / **ProgressRing**. Unknown → **Spinner**. Loading layout → **Skeleton**.

## Signature moves (use them; they are what makes Prism look like Prism)

- **Hero metric**: `type.metric.xl` number, dimmed decimal or trailing digits in `color.text.tertiary` (≥ 24 px only), unit in `type.caption` next to the baseline.
- **Numbers that update while visible** (timers, counters, live metrics, chart ticks and tooltips, delta badges, table numbers) use `numeric: tabular`; static heroes stay proportional.
- **Stepper with faded past and future**: done and next rows at `opacity.dimmed-row`, the active row at full contrast with a solid pill.
- **Vivid 2×2**: four `Card variant=vivid` tiles with a title top-left, `nav.open` icon top-right, hero metric bottom-left. Any vivid gradient carries this anatomy. On vivid, text below 24 px goes only in the header; the aside holds a sparkline, a glyph or text of 24 px or more; no icon ring. Give the four tiles `vivid="1"` to `"4"`; leave `vivid` unset only for a single vivid card (`gradient.vivid.default`).
- **Glass over media**: `Card variant=glass` only when the parent is an image, a map or a vivid card; put a timeline scrubber or a status row inside. Dark glass only where the backdrop is no lighter than mid grey (white must hold 3:1). Light glass takes one text tone, with no dimmed captions: in dark mode only over dark imagery, in light mode over vivid or bright imagery.
- **One accent per screen**: `color.accent` for the one thing that matters; status colors only for status.

## Density and modality

Do not branch on platform for sizes. Prism resolves density (compact / regular / comfortable) and modality (pointer / touch) from the platform and the device; you inherit them. On desktop web and macOS the same code renders compact with hover states; on touch it renders regular without hover.

On the web you inherit them from `<html>`. Color scheme and density can be scoped to one element with `scope({ colorScheme: 'dark' })` or `scope({ density: 'compact' })`; contrast, transparency, modality and motion apply to the whole page. Never use Tailwind's `dark:`, `contrast-more:`, `motion-safe:`, `motion-reduce:`, `pointer-fine:` or `pointer-coarse:`: they ignore Prism's settings. Use tokens, or the `ds-touch`, `ds-pointer`, `ds-contrast-more`, `ds-reduce-transparency` and `ds-reduce-motion` variants. For text, use `<Text>` or `type-ds-<role>`. Never set `font-size` on `html` or `:root`; Prism type is rem-based.

## Motion

Choose a spring by role. `motion.spring.snappy` is for state changes (toggles, selection, popovers), `smooth` for layout and morphs, `sheet` for sheets and drawers after a release, `interactive` only while a finger or pointer is dragging, and `bouncy` only for rare delight moments. Plain fades and hovers use `motion.duration.*` with `motion.easing.*`: `out` for enter and exit, `in-out` for movement, `hover` for hover. Never write a duration, a `cubic-bezier` or spring numbers.

On the web, state changes use `var(--ds-motion-spring-<name>)`. Drag, swipe and anything interruptible use Motion with the spring's `stiffness`, `damping` and `mass` from your brand's `@iiiivaska/prism-tokens/brands/<brand>/tokens` (the reference brand is also `@iiiivaska/prism-tokens/tokens`), resolved for the current context (`resolveTokens(useTokenContext())`); never `duration`, `visualDuration` or `bounce`.

Never read Reduce Motion yourself (`accessibilityReduceMotion`, `prefers-reduced-motion`, `useReducedMotion`, Motion's `reducedMotion`). Prism swaps the motion tokens. For your own animations, read Prism's flag (`tokens.motion.presentationCrossfade` in Swift, `--ds-motion-presentation-crossfade` in CSS, `useTokenContext().motion` in React): when it is on, presentations only fade (`motion.duration.base`, `motion.easing.out`), scale, zoom and blur changes become opacity changes, in-place movement keeps its spring, and gestures still track the finger.

## When something is missing

Report the gap with the name of the closest existing component and what it lacks. Do not fork a component into the app. Gaps are filed against the Prism spec, where the change starts.

## Setting up a consuming app

**Swift**: add `https://github.com/iiiivaska/prism` as a package dependency by tag and link `DSComponents` (and `DSCharts` if needed). While Prism is 0.x, depend with `.upToNextMinor(from: "0.y.z")`, because a 0.y bump may break (ADR-0024 §14). Wrap each scene's root view in `DSTheme(brand: .<yourBrand>)`, where `<yourBrand>` is the app's `DSBrand` case, and read colors as `tokens.color.<name>` from the environment's `DSTokenSet`; density and modality are detected automatically. Every brand lives in Prism's `brands/`: ask for one there instead of restyling in the app.

**Web**: add to `.npmrc`:

```
@iiiivaska:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Install `@iiiivaska/prism-tokens` and `@iiiivaska/prism-react`. Import your brand's `tokens.css` and `fonts.css` (`@iiiivaska/prism-tokens/brands/<brand>/`; the reference brand is also `@iiiivaska/prism-tokens/tokens.css`) and `motion.css`. With Tailwind v4:

```css
@import "tailwindcss";
@import "@iiiivaska/prism-tokens/tailwind.css";
@import "@iiiivaska/prism-tokens/brands/<brand>/tokens.css";
@import "@iiiivaska/prism-tokens/brands/<brand>/fonts.css";
@import "@iiiivaska/prism-tokens/motion.css";
@import "@iiiivaska/prism-react/styles.css" layer(components);
```

Without Tailwind, leave out `tailwind.css`. There is no brand attribute and no brand prop: one brand per document. Wrap the app root in `<Theme>` from `@iiiivaska/prism-react`, and pass only what the user chose inside the app (`colorScheme`, `contrast`, `transparency`, `density`, `modality`, `motion`). Anything left out follows the OS and the device. Safari cannot report Reduce Transparency, so an app that offers its own setting passes `transparency`. Without React, put the same choices on `<html>` as `data-ds-color-scheme`, `data-ds-contrast`, `data-ds-transparency`, `data-ds-density`, `data-ds-modality` and `data-ds-motion`; `rootAttributes()` builds them, also for server rendering. Components are built on React Aria Components; use its `onPress`, not `onClick`.

## Files to consult

- `docs/decisions.md` — why things are the way they are.
- `spec/SCHEMA.md` — how to read a component spec.
- `spec/components/*.yaml` — the contracts.
- `tokens/README.md` — token names.
- `web/packages/tokens/src/generated/manifest.json` — every token path and its CSS, Tailwind, TypeScript and Swift names (generated).
- `gallery/` — rendered examples on both platforms.
