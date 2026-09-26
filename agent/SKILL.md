---
name: prism-design-system
description: How to build UI with the Prism design system (SwiftUI + React). Use whenever a task touches screens, components, colors, typography, spacing, icons, charts or motion in an app that depends on @iiiivaska/prism-* or the Prism SPM package.
---

# Prism for agents

Prism is a token-driven, brand-agnostic design system with two implementations: SwiftUI (`import DSComponents`, `DSCharts`) and React (`@iiiivaska/prism-react`, `@iiiivaska/prism-charts`). This skill tells you what exists and the rules you must not break. When in doubt, open the component's spec: `spec/components/<Name>.yaml` in the Prism repository, or `node_modules/@iiiivaska/prism-react/spec/`, which carries the data-viz contracts too (the SPM package ships no spec resources).

## The five rules

1. **Never write a raw value.** No hex colors, no `px`/`pt` numbers for spacing or radius, no font names, no durations. Use tokens. Swift: the `DSTokenSet` members DSCore provides (`tokens.color.textPrimary`, `tokens.space.step4`, `tokens.typography.bodyMd`); web: `var(--ds-color-text-primary)`, Tailwind `text-ds-primary`, `p-ds-4`, `type-ds-body-md`. Never re-brand in the app: do not override `--ds-*` variables, and add no custom colors or fonts. A new look is a new brand in Prism.
2. **Never invent a component.** Use only what the inventory below lists as implemented. If none of it does what you need, compose implemented components or stop and report the gap; do not hand-roll a card, a pill, a chart, or a component that is only specified.
3. **Never reference an icon by vendor name.** Use registry ids: `DSIcon(.actionAdd)` / `<Icon name="action.add" />`. The registry is `spec/icons/registry.json`.
4. **Respect surfaces.** Content sits on `solid`, `vivid` or `glass` surfaces. Glass only over an image, a map or a vivid surface: a glass Surface declares it with `backdrop`; content that sits straight on your own map, photo or gradient declares it with `<Backdrop kind="map">` or `.dsBackdrop(.map) { … }`; text over media belongs on a glass Surface; never glass on glass. Glass follows the color scheme by itself: one role, `material.glass.fill`, is light glass in light and smoked glass in dark, and chips, controls and status cells over media take `material.glass.chip` with the primary tone only. Never read the scheme to pick a material — for a dark photograph in a light app, scope the region to dark (`data-ds-color-scheme="dark"`, `.environment(\.colorScheme, .dark)`). Surface itself renders glass as an opaque raised surface under Reduce Transparency, Increase Contrast and on watchOS; never read or branch on those settings yourself (ADR-0022). System chrome (toolbars, tab bars, sheets) is native and not styled by you.
5. **Accessibility is not optional.** Every icon-only control has a label; every status has icon + text; text pairs come only from tokens (they are pre-checked for contrast); weights come only from `type.*` roles: never set a font weight, italic or font size in code (thin exists only in `type.metric.xl` in dark, ADR-0021).

## Inventory (v1)

Only the **Implemented** column exists in code. A name in the **Specified only** column is a contract in `spec/` that no stack has built yet: there is nothing to import, and you must not build it in the app — report it as a gap (below). Per platform, each stack's manifest is the authority: `DSComponentsManifest.implemented` and `DSChartsManifest.implemented` in Swift, `implemented` from `@iiiivaska/prism-react` and `@iiiivaska/prism-charts` on the web. A platform whose spec marks a component `none` never gets it (Divider, Badge and IconButton on watchOS, for example).

<!-- Maintainers: the ticket that lands a component on both stacks moves its name from "Specified only" to "Implemented" in its layer's row, keeping both cells alphabetical, in the same change as the manifests. One line changes. -->

| Layer | Implemented on both stacks | Specified only (a contract, no code yet) |
|---|---|---|
| Primitives | Avatar, Badge, Button, Chip, Divider, Icon, IconButton, Surface, Text | Checkbox, ProgressBar, ProgressRing, Radio, SegmentedControl, Select, Skeleton, Slider, Spinner, TextArea, TextField, Toggle, Tooltip |
| Composites | Card (solid, vivid, glass, tinted) | Alert, Banner, CommandPalette, ContextMenu, Dialog, EmptyState, FormField, ListRow, Menu, Pagination, PillTabs, Popover, SearchField, Sheet, Sidebar, StatCard, StatusPill, Stepper, TabBar, Table, Timeline, Toast, Toolbar, TopBar |
| Data-viz (`DSCharts`, `@iiiivaska/prism-charts`) | — | AreaChart, ChartContainer, DeltaBadge, HeroNumber, LineChart, RangeBand, ReferenceLine, RingGauge, Sparkline, StatTile |
| Patterns (recipes, `spec/patterns/`) | — | AdaptiveShell (stack, split, sidebar), DashboardGrid, DetailScreen |

Sidebar, Table, CommandPalette and ContextMenu are the desktop tier: `none` on iPhone and Apple Watch. Planned for v1.1 and not specified yet: BarChart, Legend, ChartTooltip, TimelineScrubber, ArcGauge.

## Choosing between similar components

Most of the names below are specified only today. The choice still holds; when the right component is not implemented yet, report the gap instead of building it.

- Action → **Button**. Navigation to another screen → **ListRow** or a link; never a Button.
- One number with a label → **StatTile** (adds sparkline / delta). A number inside richer content → **StatCard**.
- Filtering a list by category → **PillTabs**. Switching two or three equivalent views → **SegmentedControl**.
- Transient confirmation → **Toast**. Persistent condition → **Banner**. Needs a decision → **Alert** / **Dialog**.
- Progress with a known end → **ProgressBar** / **ProgressRing**. Unknown → **Spinner**. Loading layout → **Skeleton**.
- A quiet action inside a card over vivid or glass → **Button** `variant=ghost`: an outline with no fill at rest, filled only while pressed.

## Signature moves (use them; they are what makes Prism look like Prism)

- **Hero metric**: `type.metric.xl` number, dimmed decimal or trailing digits in `color.text.dimmed` (≥ 24 px only), unit in `type.metric.unit` next to the baseline. On a vivid surface the hero block holds the value alone and the unit moves to the caption line in the header.
- **Numbers that update while visible** (timers, counters, live metrics, chart ticks and tooltips, delta badges, table numbers) use `numeric: tabular`; static heroes stay proportional. Every `type.metric.*` role is proportional by default; `type.data` and `type.axis` are the tabular roles.
- **Stepper with faded past and future**: done and next rows at `opacity.dimmed-row`, the active row at full contrast with a solid pill.
- **Vivid 2×2**: four `Card variant=vivid` tiles with a title top-left, `nav.open` icon top-right, hero metric bottom-left. Any vivid gradient carries this anatomy. On vivid, text below 24 px goes only in the header; the aside holds a sparkline, a glyph or text of 24 px or more; no icon ring. The four slots are two one-temperature pairs: put `vivid="1"` and `"2"` on the grid's diagonals, or `"3"` and `"4"` — never one tile from each pair, and two vivid cards side by side use one pair. Light resolves 1 sky, 2 orchid, 3 rose, 4 olive; dark 1 plum-dusk, 2 navy-cyan, 3 night-lagoon, 4 forest-moss. Leave `vivid` unset only for a single vivid card (`gradient.vivid.default`). `ref.gradient.vivid.ember-night` sits in no slot and is out of an app's reach.
- **Glass over media**: `Card variant=glass` only when the parent is an image, a map or a vivid card; put a timeline scrubber or a status row inside. Text is `color.text.on-glass-fill`. Over Prism's map it may step down to `color.text.on-glass-fill-secondary`, `color.text.on-glass-fill-tertiary` and `color.text.on-glass-fill-dimmed` (dimmed only at ≥ 24 px); over an image or a vivid card the quieter tones are `color.text.on-glass-fill-media-secondary` and `color.text.on-glass-fill-media-tertiary`, which in light are the same ink as the primary tone — so in light, glass over media stays on one tone. In light, glass goes over the map, over vivid, or over imagery no darker than OKLCH L 0.45; in dark, over the map or imagery no lighter than L 0.67. `glassLight` still takes a single tone.
- **One accent per screen**: `color.accent` for the one thing that matters; status colors only for status.

## Roles to reach for (never invent these values)

- **On vivid**: a solid cell (a primary Button, the active segment) is `color.bg.fill.inverse-media` with `color.text.on-inverse-media`; rings and outlines are `color.border.on-media`. On the scheme's glass, rings are `color.border.on-glass-fill`. The 1 px inner highlight of a vivid or glass surface is Surface's own (`color.edge.highlight`, `color.edge.raised`) — do not draw it yourself.
- **Charts follow the surface's published material**: solid → `color.chart.series.1…6` and the rest of `color.chart.*`; vivid → `color.chart.on-media.line|reference|grid`; glass → `color.chart.on-glass-fill.plot|line|reference|grid`. There is no chart family for `glassLight` or `inverse`. A target line is its family's target role — `color.chart.target`, `color.chart.on-media.reference` or `color.chart.on-glass-fill.reference` — dashed with `stroke.target`, never a second series. Axis labels are `type.axis`; a gauge's stroke is `chart.gauge-stroke-ratio` of its diameter.
- **Maps**: Prism renders no map, but it styles one. Feed your map SDK the grounds `color.map.land|block|building|road|road-casing|water|park` (each drawn over the land) and the marks `color.map.label|route|route-ahead|route-casing`; a highlighted leg is `color.accent`. Never hand-mix a map palette — the glass limits above are measured on these grounds. Hue never carries status on a map: a status area keeps its status stroke and a labelled pill.
- **Accent fill**: on `color.bg.fill.accent` the primary tone is `color.text.on-accent` and secondary, tertiary and dimmed are all `color.text.on-accent-secondary`. In dark, `color.bg.tint.accent` fills chart windows and bands, never a card, and a `Card variant=tinted` is light only.
- **Tinted things over media**: a pill, badge or danger button that carries text or a glyph on a status or accent tint over a map, an image, vivid or glass paints `color.bg.page` under its tint. A text-free area wash does not.

## Density and modality

Do not branch on platform for sizes or type roles. Prism resolves density (`compact`, `regular`, `comfortable`, `watch`) and modality (pointer / touch) from the platform and the device; you inherit them. Defaults: web and macOS compact + pointer, iOS and iPadOS regular + touch, watchOS `watch` + touch + dark. `watch` is `regular` with a 16 px `space.card-padding` and a 44 px `size.control.lg`; `comfortable` is an accessibility choice and no platform's default. Every density has a 24 px `space.page-margin`. The watch hero is the same `type.metric.xl` role, resolved to 40 px there.

On the web you inherit them from `<html>`. Color scheme and density can be scoped to one element with `scope({ colorScheme: 'dark' })` or `scope({ density: 'compact' })`; use `watch` only for a watch-sized layout. Contrast, transparency, modality and motion apply to the whole page. Never use Tailwind's `dark:`, `contrast-more:`, `motion-safe:`, `motion-reduce:`, `pointer-fine:` or `pointer-coarse:`: they ignore Prism's settings. Use tokens, or the `ds-touch`, `ds-pointer`, `ds-contrast-more`, `ds-reduce-transparency` and `ds-reduce-motion` variants. For text, use `<Text>` or `type-ds-<role>`. Never set `font-size` on `html` or `:root`; Prism type is rem-based.

## Motion

Choose a spring by role. `motion.spring.snappy` is for state changes (toggles, selection, popovers), `smooth` for layout and morphs, `sheet` for sheets and drawers after a release, `interactive` only while a finger or pointer is dragging, and `bouncy` only for rare delight moments. Plain fades and hovers use `motion.duration.*` with `motion.easing.*`: `out` for enter and exit, `in-out` for movement, `hover` for hover. Never write a duration, a `cubic-bezier` or spring numbers.

On the web, state changes use `var(--ds-motion-spring-<name>)`. Drag, swipe and anything interruptible use Motion with the spring's `stiffness`, `damping` and `mass` from your brand's `@iiiivaska/prism-tokens/brands/<brand>/tokens` (the reference brand is also `@iiiivaska/prism-tokens/tokens`), resolved for the current context (`resolveTokens(useTokenContext())`); never `duration`, `visualDuration` or `bounce`.

Never read Reduce Motion yourself (`accessibilityReduceMotion`, `prefers-reduced-motion`, `useReducedMotion`, Motion's `reducedMotion`). Prism swaps the motion tokens. For your own animations, read Prism's flag (`tokens.motion.presentationCrossfade` in Swift, `--ds-motion-presentation-crossfade` in CSS, `useTokenContext().motion` in React): when it is on, presentations only fade (`motion.duration.base`, `motion.easing.out`), scale, zoom and blur changes become opacity changes, in-place movement keeps its spring, and gestures still track the finger.

## When something is missing

Report the gap with the name of the closest existing component and what it lacks. A component that is specified but not implemented is a gap too: name its spec, `spec/components/<Name>.yaml`. Do not fork a component into the app. Gaps are filed against the Prism spec, where the change starts.

## Setting up a consuming app

Prism is proprietary — Copyright (c) 2026 iiiivaska, all rights reserved (`LICENSE`, ADR-0031) — so this section is for an app the copyright holder has permitted to use it; installing the packages is not itself a license, and if you are not working on such an app, stop here and ask.

**Swift**: add `https://github.com/iiiivaska/prism` as a package dependency by tag and link `DSComponents` (and `DSCharts` if needed). While Prism is 0.x, depend with `.upToNextMinor(from: "0.y.z")`, because a 0.y bump may break (ADR-0024 §14). Wrap each scene's root view in `DSTheme(brand: .<yourBrand>)`, where `<yourBrand>` is the app's `DSBrand` case, and read colors as `tokens.color.<name>` from the environment's `DSTokenSet`; density and modality are detected automatically. Set the app's strings table at the same root, beside the brand: `DSTheme(brand: .<yourBrand>, strings: DSStrings(badgeCount: …))`, with the app's own translation of each template it replaces, and the same language in SwiftUI's `locale`, which formats the numbers the templates carry. Prism ships English only, and an app that localizes but leaves the table out speaks English in those places, where no check can see it (ADR-0032). Every brand lives in Prism's `brands/`: ask for one there instead of restyling in the app.

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

Without Tailwind, leave out `tailwind.css`. There is no brand attribute and no brand prop: one brand per document. Wrap the app root in `<Theme>` from `@iiiivaska/prism-react`, and pass only what the user chose inside the app (`colorScheme`, `contrast`, `transparency`, `density`, `modality`, `motion`). Anything left out follows the OS and the device. Safari cannot report Reduce Transparency, so an app that offers its own setting passes `transparency`. Without React, put the same choices on `<html>` as `data-ds-color-scheme`, `data-ds-contrast`, `data-ds-transparency`, `data-ds-density`, `data-ds-modality` and `data-ds-motion`; `rootAttributes()` builds them, also for server rendering. Set the app's strings table on the root `<Theme>`, beside the axes: `<Theme strings={{ "Badge.count": … }}>`, with the app's own translation of each key it replaces (the rest stay English; the keys are `spec/strings.yaml`), and the same language in React Aria's `I18nProvider`, which formats the numbers. As on Apple, an app that localizes but leaves the table out speaks English there, and no check can see it (ADR-0032). Components are built on React Aria Components; use its `onPress`, not `onClick`.

## Files to consult

- `docs/decisions.md` — why things are the way they are.
- `spec/SCHEMA.md` — how to read a component spec.
- `spec/components/*.yaml` — the contracts.
- `tokens/README.md` — token names.
- `web/packages/tokens/src/generated/manifest.json` — every token path and its CSS, Tailwind, TypeScript and Swift names (generated).
- `gallery/` — rendered examples on both platforms.
