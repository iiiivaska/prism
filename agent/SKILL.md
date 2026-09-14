---
name: prism-design-system
description: How to build UI with the Prism design system (SwiftUI + React). Use whenever a task touches screens, components, colors, typography, spacing, icons, charts or motion in an app that depends on @iiiivaska/prism-* or the Prism SPM package.
---

# Prism for agents

Prism is a token-driven, brand-agnostic design system with two implementations: SwiftUI (`import DSComponents`, `DSCharts`) and React (`@iiiivaska/prism-react`, `@iiiivaska/prism-charts`). This skill tells you what exists and the rules you must not break. When in doubt, open the component's spec: `spec/components/<Name>.yaml` in the Prism repository (or `node_modules/@iiiivaska/prism-react/spec/` and the SPM package's `Spec/` resources).

## The five rules

1. **Never write a raw value.** No hex colors, no `px`/`pt` numbers for spacing or radius, no font names, no durations. Use tokens: Swift `DS.color.text.primary`, `DS.space(4)`, `DS.type.body.md`; web `var(--ds-color-text-primary)`, Tailwind `text-ds-text-primary`, `p-ds-4`, `ds-type-body-md`.
2. **Never invent a component.** If the inventory below lacks what you need, compose existing components or stop and report the gap; do not hand-roll a card, a pill, a chart.
3. **Never reference an icon by vendor name.** Use registry ids: `DSIcon(.actionAdd)` / `<DSIcon name="action.add" />`. The registry is `spec/icons/registry.json`.
4. **Respect surfaces.** Content sits on `solid`, `vivid` or `glass` surfaces. Glass only over an image, a map or a vivid surface; never glass on glass; never on watchOS. System chrome (toolbars, tab bars, sheets) is native and not styled by you.
5. **Accessibility is not optional.** Every icon-only control has a label; every status has icon + text; text pairs come only from tokens (they are pre-checked for contrast); thin weights only via `type.metric.*`.

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
- **Stepper with faded past and future**: done and next rows at `opacity.dimmed`, the active row at full contrast with a solid pill.
- **Vivid 2×2**: four `Card variant=vivid` tiles with a title top-left, `nav.open` icon top-right, hero metric bottom-left.
- **Glass over media**: `Card variant=glass` only when the parent is an image, a map or a vivid card; put a timeline scrubber or a status row inside.
- **One accent per screen**: `color.accent` for the one thing that matters; status colors only for status.

## Density and modality

Do not branch on platform for sizes. Prism resolves density (compact / regular / comfortable) and modality (pointer / touch) at the root; you inherit them. On desktop web and macOS the same code renders compact with hover states; on touch it renders regular without hover.

## When something is missing

Report the gap with the name of the closest existing component and what it lacks. Do not fork a component into the app. Gaps are filed against the Prism spec, where the change starts.

## Setting up a consuming app

**Swift**: add `https://github.com/iiiivaska/prism` as a package dependency by tag and link `DSComponents` (and `DSCharts` if needed). Wrap the root view in `DSTheme(brand:)`; density and modality are detected automatically.

**Web**: add to `.npmrc`:

```
@iiiivaska:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Install `@iiiivaska/prism-tokens` and `@iiiivaska/prism-react`. With Tailwind v4:

```css
@import "tailwindcss";
@import "@iiiivaska/prism-tokens/tailwind.css";
@import "@iiiivaska/prism-react/styles.css" layer(components);
```

Without Tailwind, import `tokens.css` and `styles.css` instead. Set `data-ds-brand`, `data-ds-scheme`, `data-ds-density` and `data-ds-input` on `<html>` (or let `<DSProvider>` set them). Components are built on React Aria Components; use its `onPress`, not `onClick`.

## Files to consult

- `docs/decisions.md` — why things are the way they are.
- `spec/SCHEMA.md` — how to read a component spec.
- `spec/components/*.yaml` — the contracts.
- `tokens/README.md` — token names.
- `gallery/` — rendered examples on both platforms.
