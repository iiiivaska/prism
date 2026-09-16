# ADR-0007: Data-viz is a first-class module

- Status: accepted (decision 4 amended by [ADR-0020](0020-brand-model.md): series slots are brand-overridable `ref` tokens validated per brand, and status colors are fixed on every brand; the figures clause of rule 3 amended by [ADR-0021](0021-typography-rules.md); rule 2 amended by [ADR-0030](0030-semantic-roles-from-the-direction-board.md): on vivid and on the scheme's glass a target line takes its chart family's `reference` token)
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #7

## Context

Charts carry half of the references' identity: sparklines with dashed target lines, area charts with highlighted range bands, ring and arc gauges, hero numbers with units and dimmed decimals, delta badges, timeline scrubbers, deviation tables. Without them the system cannot produce the products the owner wants, and charts are where agents produce the ugliest output without a spec. Maps, by contrast, are app-level (MapLibre styles in RideVerse); Prism only supplies map style tokens.

Facts (see `docs/research/icons-tooling.md` §5 and `dataviz-design.md`): visx 4.0.0 (2026-06-11, React 18/19, d3-shape 3) exposes low-level SVG primitives and 18 d3 curves; Swift Charts provides `InterpolationMethod` values `.linear`, `.monotone`, `.cardinal(tension:)`, `.catmullRom(alpha:)`, `.stepStart/.stepCenter/.stepEnd`, so curve parity between platforms is a lookup table.

## Decision

1. **Layer 3 `dataviz`** ships as its own package on both stacks: SPM product `DSCharts`, npm `@iiiivaska/prism-charts`. Apps without charts do not depend on it.
2. **Apple: Swift Charts** under Prism styling (marks, gradients, rules for target lines, annotations, selection). A custom `Canvas` is used only where Swift Charts cannot express the design (documented per component).
3. **Web: visx primitives + d3-shape/d3-scale** wrapped in Prism components; no high-level chart library, so gradients, dashed targets, band fills and glass backdrops are under full control and SSR-safe.
4. **Chart tokens**: `color.chart.series.1…8` per scheme, `chart.target` (stroke, dash), `chart.band` (fill alpha), `chart.grid` (color, alpha), `chart.axis` (type role, color), `chart.curve` (monotone default; catmullRom soft; step variants) with the parity table web ↔ Swift.
5. **Waves**: v1 ships StatTile, Sparkline, RingGauge, LineChart/AreaChart with target line and range band; v1.1 adds BarChart, Legend, ChartTooltip, TimelineScrubber, ArcGauge, DeltaIndicator as a primitive shared with StatTile.
6. **Accessibility**: every chart component carries a text summary (`accessibilityLabel` / `aria-label`) generated from data, and on Apple the audio graph support Swift Charts provides; series never differ by color alone (dash or marker differentiation available).

## Alternatives considered

- Charts out of scope: dashboards drift first.
- Recharts / Nivo on web: faster to start, but their defaults fight the reference styling and their DOM is hard to make match Swift Charts.
- One custom renderer on both platforms (Canvas / SVG from a shared model): parity by construction, but loses Swift Charts' free accessibility and native selection.

## Consequences

- Roughly a third of the total component effort is charts; tickets are sized accordingly.
- The chart spec adds a `data` prop type (series, points, domain) shared across components so an agent feeds the same model to a StatTile sparkline and a full LineChart.

## Rules that follow

1. Smoothing is `monotone` unless the spec says otherwise; `bump` curves are not available on Apple and therefore not in Prism.
2. A target line is always `chart.target` (dashed), never a second series.
3. Hero numbers in StatTile use `type.metric.*` with tabular figures; decimals may be dimmed via `color.text.tertiary` only at ≥ 24 px.
