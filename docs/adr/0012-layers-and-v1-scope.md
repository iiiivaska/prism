# ADR-0012: Five layers and the v1 scope

- Status: accepted
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #12

## Context

The component inventory needs a grouping that decides where a file lives, what may depend on what, and in which order agents implement things. The references are dashboard-heavy products: stat cards, charts, pill tabs, steppers, glass cards over media, plus ordinary forms and lists.

## Decision

Five layers, each allowed to depend only on lower layers:

| Layer | Name | Contents |
|-------|------|----------|
| 0 | Foundations | Tokens: color (3 tiers), typography, spacing, sizing, radius, elevation, materials, motion, haptics, grid and breakpoints, density, z-index. |
| 1 | Primitives | Text, Icon, Surface, Button, IconButton, Toggle, Checkbox, Radio, Slider, TextField, TextArea, Select, SegmentedControl, Chip, Badge, Avatar, Divider, ProgressBar, ProgressRing, Spinner, Skeleton, Tooltip. |
| 2 | Composites | ListRow, Card (solid / vivid / glass), StatCard, StatusPill, FormField, SearchField, PillTabs, Stepper, Timeline, Toast, Banner, Alert, Dialog, Sheet, Popover, Menu, TabBar, TopBar, Toolbar, EmptyState, Pagination. Desktop-only: Sidebar, Table, CommandPalette, ContextMenu. |
| 3 | Data-viz | StatTile, Sparkline, LineChart, AreaChart, BarChart, RingGauge, ArcGauge, DeltaIndicator, Legend, ChartTooltip, TimelineScrubber. |
| 4 | Patterns | Recipes in the spec, not components: dashboard grid, detail screen, settings list, onboarding, map HUD, empty / error / loading states, adaptive shells (stack on phone, split on tablet, sidebar on desktop). |

**v1 scope**: layers 0–2 complete; layer 3 wave 1 (StatTile, Sparkline, RingGauge, LineChart/AreaChart with target line); layer 4 with three patterns (dashboard grid, detail screen, adaptive shells). Everything else is v1.1.

**Implementation order**: a vertical slice first (tokens pipeline → Surface, Text, Button, Card on both stacks with snapshots and the parity report), then breadth by layer.

**Explicitly out of scope**: map rendering (Prism ships map style tokens only), video player, rich-text editor, date pickers beyond a month grid. These live in apps.

## Alternatives considered

- Atomic design's five levels (atoms → pages): close, but "molecules/organisms" is ambiguous for agents; naming by role (primitive / composite / dataviz / pattern) is unambiguous.
- Flat list: no dependency rule, no implementation order.

## Consequences

- The inventory doubles as the parity report's row list and the gallery's navigation.
- Data-viz being its own layer lets it ship as a separate package on web and a separate SPM product on Apple, so apps without charts do not pay for them.

## Rules that follow

1. A component may import from its own layer or lower; never upward.
2. A new component must name its layer in the spec; the parity report refuses unknown layers.
3. Patterns are documented with anatomy and token bindings like components but have no implementation manifest entry.
