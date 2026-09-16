# Patterns

Patterns are screen-level recipes, not components (layer 4, ADR-0012). They have no implementation manifest entry and no snapshot pair; they exist so an agent assembling a screen composes components the way the references do, with the same rhythm.

Each pattern is one YAML file validated by `pattern.schema.json` (to be added with the first pattern ticket). Until that schema exists, `spec:validate` reports every pattern file here as unchecked (`spec/no-schema`), so the first pattern lands together with its schema. Fields:

```yaml
name: DashboardGrid
specVersion: 1
summary: A grid of StatTile / Card / chart cards with one hero metric and one accent per screen.
platforms: { ios: adapted, ipados: full, macos: full, watchos: none, web-touch: adapted, web-desktop: full }
anatomy:
  - part: header        # TopBar or PillTabs
  - part: heroRow       # 1 StatTile size=hero or 1 vivid Card
  - part: grid          # 2×N tiles on touch, 3–4 columns on desktop
  - part: detailPanel   # optional trailing panel on desktop (Sidebar or split)
layout:
  columns: { compact: 1, regular: 2, desktop: 4 }
  gap: space.4
  gutter: space.5
  cardMinWidth: size.card.min
  heroSpan: { regular: 2, desktop: 2 }
rules:
  - One hero metric per screen; secondary numbers use type.metric.md.
  - One accent per screen; status colors only for status.
  - Vivid cards come in even counts (2 or 4) and never touch a glass card.
  - Charts never sit on raw glass; the plot area gets surface.solid or a scrim.
composition:
  - component: StatTile
    props: { size: hero }
  - component: Card
    props: { variant: vivid }
  - component: LineChart
    props: { referenceLines: [{ style: target }] }
examples:
  - id: ops-dark
    description: dark-ops dashboard with a map hero, four stat tiles, two charts
  - id: airy-light
    description: light CRM dashboard with a stepper, a solid detail card, a 2×2 vivid grid
notes:
  watchos: Not applicable; the watch uses a vertical stack of at most three glanceable tiles.
```

## v1 patterns

| Pattern | File | Source moves |
|---------|------|--------------|
| DashboardGrid | `DashboardGrid.yaml` | vivid 2×2, stat tiles with sparklines, hero metric |
| DetailScreen | `DetailScreen.yaml` | hero header, sectioned ListRows, glass card over media when the entity has imagery |
| AdaptiveShell | `AdaptiveShell.yaml` | stack on phone (TabBar), split on tablet (Sidebar collapsible), sidebar on desktop (Sidebar + TopBar + CommandPalette) |

Values (column counts, gaps, hero sizes) come from `docs/research/visual-dna.md`; each pattern file cites the section it derives from.
