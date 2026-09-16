# Patterns

Patterns are screen-level recipes, not components (layer 4, ADR-0012). They have no implementation manifest entry and no snapshot pair; they exist so an agent assembling a screen composes components the way the references do, with the same rhythm.

Each pattern is one YAML file validated by `spec/pattern.schema.json`. A pattern is documented with anatomy and token bindings like a component (ADR-0012 rule 3), so every field it shares with one is `spec/component.schema.json`'s own definition, referenced rather than copied, and `spec/SCHEMA.md` explains those fields. A pattern adds three: `layout`, `rules` and `composition`. `pnpm spec:validate` reports a pattern file as unchecked (`spec/no-schema`) only when the pattern schema is missing.

```yaml
name: DashboardGrid
layer: pattern          # always pattern
specVersion: 1
status: draft
summary: A grid of cards with one hero at its leading top corner, one accent and one vivid form per screen.
since: 0.1.0
platforms: { ios: adapted, ipados: full, macos: full, watchos: none, web-touch: full, web-desktop: full }
density: [compact, regular, comfortable]
modality: [pointer, touch]
schemes: [light, dark]
anatomy:
  - part: root
  - part: heroRow       # 1 StatTile size=lg, 1 vivid Card or a 2x2 of vivid Cards
    optional: true
    slot: true
  - part: grid          # 1, 2 or 4 columns by container width
    slot: true
props:
  - name: hero
    type: enum
    values: [none, metric, vivid, vividGrid]
    default: none
states: [default, loading]
tokens:                 # what the pattern paints or places itself; sys roles only
  root:
    background: color.bg.page
    padding: space.page-margin
  grid:
    gap: space.4
layout:                 # token paths, numbers, or sentences that cite their research section
  breakpoints: { compact: "< 600 px", regular: "600-1023 px", desktop: ">= 1024 px" }
  columns: { compact: 1, regular: 2, desktop: 4 }
  gap: space.4
  cardMinWidth: size.card.min
rules:
  - One hero numeral per screen, at type.metric.xl.
  - Vivid appears in one form per screen and only in the hero.
composition:
  - component: StatTile
    props: { size: lg }
    forwards: label, value, unit, delta
    where: "heroRow, when `hero: metric`"
  - component: Card
    props: { variant: solid }
    forwards: title, caption, hero, body (slot)
    where: every grid cell that has content
behavior:
  - The grid has `layout.columns` equal columns at space.4 gaps and never shrinks a card below size.card.min.
motion:
  reflow: motion.spring.smooth
  reduceMotion: crossfade
accessibility: { role: …, label: …, keyboard: …, dynamicType: …, contrast: …, reduceTransparency: …, reduceMotion: … }
usage: { do: […], dont: […] }
examples:
  - id: vivid-pair-hero
    props: { hero: vividGrid }
    grid: ["1", "2", "2", "1"]
notes:
  platform:
    ios: "adapted — a phone never reaches the desktop width, so …"   # every adapted and none is explained
    watchos: "none — ADR-0010 Tier 3 has no grid, …"
  design: The column counts and gaps are docs/research/visual-dna.md §6.3.
  references: [docs/adr/0012-layers-and-v1-scope.md]
```

What `spec:validate` checks on a pattern, beyond the schema:

- **Everything it checks on a component**: the binding-matrix grammar, every bound path, prose paths, haptic ids and the example rules of `spec/SCHEMA.md` ("Examples and snapshots").
- **Sys roles only.** A pattern owns no `comp` group: component tokens belong to components (ADR-0024 §5.2), and a value a composed component owns stays that component's cell. A `comp.*` binding in a pattern is `binding/foreign-comp`.
- **The recipe resolves.** Token paths in `layout`, `rules` and `composition` must exist, like prose (`prose/unknown`).
- **The composition is real.** `component` names a spec under `spec/components/` or `spec/patterns/` (`composition/unknown`), and every prop the pattern fixes in `props` is a prop that spec declares, with a value its type allows (`composition/prop`). What it `forwards` is prose.
- **Every `adapted` and `none` platform has its reason** under `notes.platform` (the schema).

## v1 patterns

| Pattern | File | Source moves |
|---------|------|--------------|
| DashboardGrid | `DashboardGrid.yaml` | vivid 2×2, stat tiles with sparklines, hero metric |
| DetailScreen | `DetailScreen.yaml` | hero header, sectioned ListRows, glass card over media when the entity has imagery |
| AdaptiveShell | `AdaptiveShell.yaml` | stack on phone (TabBar), split on tablet (Sidebar collapsible), sidebar on desktop (Sidebar + TopBar + CommandPalette) |

Values (column counts, gaps, hero sizes) come from `docs/research/visual-dna.md`; each pattern file cites the section it derives from.
