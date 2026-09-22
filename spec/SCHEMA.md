# Component Spec Contract

Every Prism component is defined by one YAML file in `spec/components/<Name>.yaml`. The file is the contract that both implementations (SwiftUI, React) fulfil, the source from which the parity report, the gallery index, the agent skill and (later) the Figma library are derived. **Change the spec first, then the code.**

The machine-checkable shape lives in `spec/component.schema.json` (JSON Schema, applied to the YAML). This document explains the intent of each field.

## Header

```yaml
name: Button                # PascalCase, unique. Swift: DSButton. React: <Button>. CSS: .ds-button
layer: primitive            # foundation | primitive | composite | dataviz | pattern
specVersion: 1              # integer; bump on ANY visible or behavioral change once a stack implements it (see Versioning rules)
status: draft               # draft | stable | deprecated
summary: >-                 # one paragraph an agent can read to decide whether to use it
  A tappable action with one label and an optional leading/trailing icon.
since: 0.1.0                # first system version that ships it
```

## Platforms and modes

```yaml
platforms:
  ios: full        # full | adapted | none
  ipados: full
  macos: adapted   # explain every "adapted" and "none" in `notes`
  watchos: adapted
  web-touch: full
  web-desktop: full
density: [compact, regular, comfortable, watch]   # which densities the component responds to
modality: [pointer, touch]                       # pointer adds hover; touch enforces 44pt targets
schemes: [light, dark]                           # always both unless justified
```

`none` is a decision: the parity report treats it as satisfied. `adapted` means the anatomy differs (e.g. watchOS Button has no trailing icon); the differences are listed under `notes.platform`.

`watch` is the watchOS default density (ADR-0029 §3.2), not an accessibility choice; a component that ships on the watch lists it.

## Anatomy

Named parts an implementation must expose (for styling hooks, tests, accessibility and Figma layer names).

```yaml
anatomy:
  - part: root
  - part: label
  - part: leadingIcon
    optional: true
  - part: trailingIcon
    optional: true
```

The list is the part tree, written flat, so both stacks build the same layout from it:

- **Order.** A part comes after the part that contains it, and a layer the component draws outside its root, such as a Dialog's scrim or a Toast's region, is listed before `root`. A spec that declares `parent` lists the children of one part in the reading order of its default layout — leading before trailing, top before bottom — so the list is the layout, and `behavior` states any order that changes with modality or material; a flat anatomy may list its parts in any order, and its `behavior` gives the layout.
- **`parent`** names the part that contains this one, and that part is listed earlier. A part listed after `root` with no `parent` sits directly in `root`. A part whose place changes with the published material (a unit that joins the label line on vivid) keeps the parent of its default layout, and `behavior` says where it moves.

```yaml
anatomy:
  - part: root
  - part: header
  - part: title
    parent: header
  - part: message
    parent: header
    optional: true
  - part: actions
```

**Spacing reads against the tree.** `padding`, `paddingX`, `paddingY`, `paddingTop` and `paddingBottom` are inside a part's own box, between its edge and what it contains. On a part that contains others, `gap` is the space between its children, split by axis as `rowGap` and `columnGap` when it lays them out both ways; a slot that holds the caller's children (a list, rows, a paragraph) reads the same way. On a part that contains nothing — a leaf, or a slot that holds exactly one component, such as a DeltaBadge — `gap` is the space between it and the part before it in its row or column, and it replaces the parent's gap on that side. Two gaps never add up; a padding inside a box does add to the gap outside that box. `margin` and `marginY` are outside a part, on both sides of its axis. A component sets no space outside its `root`: the layout that places it owns that space. A spec whose spacing does not follow this reading states the tree and what each spacing property separates in `behavior`.

## Props, variants, sizes, states

```yaml
props:
  - name: variant
    type: enum
    values: [primary, secondary, ghost, danger]
    default: primary
  - name: size
    type: enum
    values: [sm, md, lg]
    default: md
  - name: isLoading
    type: boolean
    default: false
states: [default, hover, pressed, focus-visible, disabled, loading]
```

`hover` exists only under `modality: pointer`; `focus-visible` is mandatory on every interactive component.

**Every state says what enters it.** Input enters `hover`, `pressed`, `focus-visible` and `dragging`. Every other state in `states` is entered by a declared prop, or by a field of the items a `data` prop carries (a Menu item's `isSelected`). A boolean that enters a state takes the one name Prism gives that state, so a composite forwards it under the same name and an agent can ask for it without reading the spec: `isLoading` for `loading`, `isDisabled` for `disabled`, `isInvalid` for `error`, `isReadOnly` for `readonly`, `isSelected` for `selected`, and `isExpanded` or `isOpen` for `expanded`; such a name says what it enters by itself. Any other trigger — a value (a Checkbox's `value`, a Sidebar's `value`, a LineChart's `selection`), a message (a ChartContainer's `errorMessage`), or a flag that keeps a name of its own (a Toggle's `isOn`) — names the state it enters in its `description` or in `behavior`. A spec never declares a second name for the same state (`isBusy` beside `isLoading`).

**One meaning, one name, one polarity.** A boolean prop is named for the condition that is *true*, as a statement whose subject is the component, so every form is a verb in the third person: `is<Adjective>` for a condition of the component itself (`isSelected`, `isDisabled`, `isRemovable`, `isInvalid`), `has<Thing>` for something the component has or lacks (`Avatar.hasRing`; `Pagination.hasNext`, a next page that exists or does not), and `shows<Part>` for a part whose content is there either way while the flag decides whether it is drawn (`Sheet.showsClose`: the sheet can be closed whether or not it draws the button). "The sheet shows its grabber" is true or false; "show grabber" is an instruction, so the verb is `shows` and never the imperative `show`, and a behavior the component performs takes its verb the same way (`clampsOverflow`, not `clampOverflow`). A name never states a negation (`isNotReady`), and the system never carries both halves of one axis (`showX` beside `hideX`). Where two components carry the same meaning they carry the same name **and the same polarity** — `isDismissible` on Banner, Dialog, Sheet and Toast, `isRequired` on FormField, Select, TextField and TextArea — and the name this rule was written for is **`isDecorative`**: true hides the part from assistive technology, because what it carries is carried by something else. Icon, Avatar and Divider all declare it.

The **default** is the component's own truth and is not a convention — booleans in this contract default true wherever that is what the component is (`Sheet.isModal`, `Alert.isExpanded`, `Sheet.showsGrabber`), and one name may default differently in two specs: `isDismissible` is true on Dialog, Sheet and Toast and false on Banner. `Divider.isDecorative` defaults true because a hairline genuinely carries nothing; `Icon.isDecorative` and `Avatar.isDecorative` default false because a glyph and a portrait genuinely can. Flipping the polarity so that a default comes out false (`isSemantic` in place of `isDecorative`) renames the axis and is wrong: the reader can no longer tell whether two specs mean one thing or two.

**The corpus is behind this rule, and its misfits are not precedents.** Thirty boolean props in `spec/` predate it: the imperative `show` (`ProgressBar.showValue`, `Slider.showValue`, `DeltaBadge.showIcon`, …), bare adjectives and nouns (`HeroNumber.live`, `LineChart.grid`, `Table.stickyHeader`, the patterns' region switches such as `DetailScreen.hero`), verbs for a behavior (`RingGauge.clampOverflow`, `TextArea.autoGrow`), and two second names for a meaning another spec already names (`Button.fullWidth` beside `SegmentedControl.isFullWidth`, `AdaptiveShell.sidebarCollapsed` beside the `Sidebar.isCollapsed` it forwards), and `Surface.selected`. `docs/roadmap.md` P4-D3 lists every one with the form it takes. Each is renamed by the next change to its own spec — in place in a spec nothing implements, and with a `specVersion` bump and both stacks where one is implemented (`Surface`, `Button`). A new prop follows the rule from its first commit, whatever a neighbour is called. `spec:validate` does not check any of this yet; the rule is the check.

Where `loading` is a hold at `opacity.dimmed-row`, the hold is applied once. A component inside a container that is loading — a chart in a loading ChartContainer, a Sparkline in a loading StatCard's aside — keeps its own `isLoading` false, so the opacity is never multiplied.

## Token bindings

The heart of the contract. Every visual property points to a token path; implementations may not use literals.

```yaml
tokens:
  root:                                   # a part of `anatomy`
    radius: comp.button.radius            # property: one token path
    gap: comp.button.gap
    background:                           # property: a matrix keyed by the `variant` prop
      primary:
        default: comp.button.primary.bg.rest
        vivid: color.bg.fill.inverse-media   # second level: the material the Surface publishes
      secondary: comp.button.secondary.bg.rest
      danger: comp.button.danger.bg.rest     # `ghost` has no cell, so it has no fill
    height: { sm: comp.button.height.sm, md: comp.button.height.md, lg: comp.button.height.lg }
    pressed:                              # a state block: one of `states`
      background: { primary: comp.button.primary.bg.pressed }
    disabled:
      opacity: opacity.disabled
    focus-visible:
      ring: color.border.focus
  label:
    typography: { sm: type.label.sm, md: type.label.md, lg: type.label.lg }
```

A binding is either a public `sys` path in a spec-bindable category, written without `sys.` and without `$root`, or a token of the spec's own component, `comp.<kebab-name>.*`, where the name is the spec's `name` in kebab-case (a StatTile spec binds comp.stat-tile tokens). A spec never binds `ref.*` or another component's `comp.*` (ADR-0024 §5).

- **Bindable categories:** `color`, `type`, `space`, `size`, `radius`, `border`, `elevation`, `opacity`, `motion`, `material`, `gradient`, `chart`, `stroke`, `icon`, `z`. Not bindable: `shadow` (the elevation levels are the role), `font` (families reach components through `type.*` roles) and `interaction` (modality flags that component code reads). The `motion` block is narrower still (below).
- **Component tokens** are declared in `tokens/comp/<component>.tokens.json`, each a whole-value alias of one `sys` token. One exists only for a choice the component makes, where the role's name does not already say what the cell is (`comp.button.primary.bg.rest` → `color.bg.fill.inverse`); when the role's name is the cell's meaning, the spec binds the role (Text `tone: secondary` → `color.text.secondary`). Every component token is bound by its spec.
- **Prose resolves.** Token paths in `behavior`, `accessibility`, `usage` and `notes` must exist, like the bindings. `spec:validate` (P2-1) checks all of this; `tokens/README.md` lists the names.

### The binding-matrix grammar

Under a part, a key is either a **property** (camelCase: `background`, `paddingX`, `ringWidth`) or a **state block** named by one of the spec's `states` (`hover`, `pressed`, `selected`, `focus-visible`, `disabled`, `loading`, …), which holds the same properties for that state. `focus-visible` is the focus state; there is no state called `focus`. A state block holds no state of its own.

A property's value is a token path or a **matrix**. Every key of one matrix comes from **one axis**, beside the reserved key `default`:

| Axis | Keys | Meaning |
|------|------|---------|
| an enum prop of this spec | its `values` (`primary`, `sm`, `compact`, `metric-lg`, …) | the value the caller asked for |
| the published material | `page`, `solid`, `raised`, `nested`, `inverse`, `vivid`, `glass`, `glassLight`, `accent` | what the enclosing Surface publishes, not what this component requested (ADR-0022 §3.1, ADR-0030 §3.4) |
| the published backdrop kind | `none`, `image`, `map`, `vivid` | what that Surface sits on; the scheme's glass keys its quieter tones by it (ADR-0029 §1.4) |

- **Nesting is one axis per level**, outermost first: `background.primary.vivid` reads "variant primary, on a vivid surface".
- **`default` is the fallback cell**, and the only reserved key. A value with no cell of its own takes `default`; with no `default` either, the property is simply not set — that is how the ghost button has no fill at rest (ADR-0029 §3.3). Nothing is inherited from a sibling cell.
- **Densities are never matrix keys.** Density is a resolver context: `comp.card.padding` already differs per density, so the spec binds one path.
- **A material cell applies to the published material.** A glass Card under the fallback therefore renders the `raised` (or `solid`) cells, and a part with no cell for the published material takes its tone from Text.

`spec:validate` (P2-1) checks the axes, every path and every component token; `spec/component.schema.json` checks the shapes.

## Behavior

Interaction rules that both stacks must honor. Written as numbered sentences; each is testable.

```yaml
behavior:
  - Tapping fires `onPress` once on release inside the hit area.
  - Minimum hit target: `size.hit` (44 pt under touch, 28 pt under pointer); the hit region extends invisibly around the visual box.
  - `isLoading` replaces the label with a Spinner of the same height and disables input; width does not change.
  - Long labels truncate with an ellipsis; they never wrap.
```

## Motion and haptics

```yaml
motion:
  press: comp.button.motion.press   # motion.spring|duration|easing.* or comp.<component>.motion.*
  reduceMotion: crossfade           # required: none | crossfade | instant (ADR-0023 §8.4)
haptics:
  press: haptic.selection      # from spec/haptics.yaml registry; web = none
```

`reduceMotion` says what the component does in Prism's reduced motion context; the values nest. `none`: nothing to substitute; the bound tokens reduce by themselves. `crossfade`: outside an active gesture nothing scales, rotates, blurs or changes depth; presentations fade by opacity over `motion.duration.base` with `motion.easing.out`; an in-place scale, blur or depth change becomes an opacity or color change to a token the spec names; in-place movement keeps its bound spring, which has no bounce under Reduce Motion. `instant`: as `crossfade`, and decorative animations (count-up, numeric roll, pulses, ambient loops, shimmer) do not run. `accessibility.reduceMotion` states the result in words and must agree (ADR-0023 §8.4). The block binds only `motion.spring.*`, `motion.duration.*`, `motion.easing.*` or the component's own `comp.<component>.motion.*` tokens (ADR-0023 rule 9).

## Accessibility (mandatory)

```yaml
accessibility:
  role: button
  label: from label text; required when only an icon is shown
  traits: [button]
  keyboard: Space/Enter activates; focus ring uses `color.border.focus` at `border.focus` width outside
  dynamicType: label scales with type.label.*; height grows with it up to AX3, then clamps
  contrast: fg/bg pairs must pass AA at every variant and state (checked by tools/contrast)
  reduceTransparency: not applicable (no glass)
  reduceMotion: the press scale is replaced by a fill change to `comp.button.primary.bg.pressed`
```

`reduceTransparency` and `reduceMotion` are required in every spec (ADR-0011, ADR-0022 rule 9; the schema enforces them from P2-1). `reduceMotion` names the token the substitute reaches, and must agree with `motion.reduceMotion`. A spec cell keyed by a material name (`solid`, `raised`, `nested`, `vivid`, `glass`, `glassLight`, `inverse`, `accent`) applies when the enclosing Surface publishes that material, not because the component requested it (ADR-0022 §3.1, ADR-0030 §3.4); on the scheme's glass a second level keys the quieter tones by the published backdrop kind (ADR-0029 §1.4).

**A component owns no words.** Every string a component renders or speaks is one the caller passed (`label`, `name`) or an entry of the app's `strings` table; a spec never writes an English word into an implementation, and no component resolves an i18n key of its own — the icon registry's `label` field is a documentation and search id, not an accessible name (ADR-0032). Before a spec adds a string at all it takes the cheaper routes in order: let the platform carry the meaning without a word (`aria-hidden`, a role, a trait), let the characters be spoken as characters (`Card.yaml` reads `%` and never the word for it), or use a name the caller already passes. What is left the spec declares by key: `strings.<Component>.<name>`, with the `{placeholders}` it fills from its own props and the English default written out, so an implementer reads one answer (`strings.Badge.count`, `strings.Chip.remove`). The component segment is spelled as the spec's `name`, in PascalCase, so a key can never be read as a token path. A template is used only when every placeholder has a value: where the caller left out the optional prop that fills one, the component contributes its own value alone and no template (a Badge with no `label` contributes its count, ADR-0032 rule 10). A number, date or measure is produced by the platform's locale formatter, never by pasting digits together.

## Content and usage rules for agents

```yaml
usage:
  do:
    - One primary Button per view.
    - Verb-first labels ("Save", "Send invoice").
  dont:
    - Don't use Button for navigation; use Link or ListRow.
    - Don't stack more than two Buttons horizontally on touch.
```

## Implementation declarations

Each stack declares what it implements in a manifest keyed by component **and platform**, so that iOS and watchOS, or web-touch and web-desktop, can differ the way `platforms` does (ADR-0006 rule 2, critic G-21). `pnpm parity:report` (P2-3) compares every cell with this file's `specVersion`.

| Manifest | Declaration | Platforms |
|---|---|---|
| `swift/Sources/DSComponents/Manifest.swift` | `DSComponentsManifest.implemented: [String: [String: Int]]` | `ios`, `ipados`, `macos`, `watchos` |
| `swift/Sources/DSCharts/Manifest.swift` | `DSChartsManifest.implemented: [String: [String: Int]]` | `ios`, `ipados`, `macos`, `watchos` |
| `web/packages/react/src/manifest.ts` | `export const implemented: ImplementedVersions` | `web-touch`, `web-desktop` |
| `web/packages/charts/src/manifest.ts` | `export const implemented: ImplementedVersions` | `web-touch`, `web-desktop` |

```swift
public static let implemented: [String: [String: Int]] = [
    "Button": ["ios": 3, "ipados": 3, "macos": 3, "watchos": 2],
]
```

A spec's `layer` picks the manifest: `dataviz` is declared in the charts manifest of each stack, every other layer in the components manifest, and a pattern in neither (ADR-0012 rule 3). A platform with no entry is not implemented; a platform the spec marks `none` must have none. The manifests are edited by hand in the same change as the implementation (ADR-0006 rule 6), and the parity report reads them as text on Linux, so each stays a plain literal: string keys, integer versions, no expressions (the grammar is in `tools/parity/manifest.ts`).

A cell where the implemented version is behind `specVersion` on a `full` or `adapted` platform is lag: the report marks it and `parity:report --fail-on-lag` exits non-zero. A component no stack has implemented anywhere is `pending` instead — backlog, not drift — and from its first implemented cell on, every `full` and `adapted` cell of that row is expected to keep up.

## Examples and snapshots

```yaml
examples:
  - id: primary-md
    props: { variant: primary, size: md, label: "Continue" }
  - id: glass-over-map
    props: { material: glass, backdrop: map }
    surface: map              # page | solid | raised | vivid | glass | glassLight | image | map
  - id: caption-on-glass
    props: { role: caption, tone: secondary }
    surface: glass            # the enclosing material, for a component that does not render it itself
    backdrop: map             # what that material sits on: image | map | vivid
  - id: tinted-focus
    props: { variant: tinted }
    schemes: [light]          # both schemes unless the look belongs to one
  - id: vivid-pair
    props: { variant: vivid }
    grid: ["1", "2", "2", "1"]   # a 2x2 of vivid tiles, row-major
```

### The snapshot name

Every example is rendered by both stacks under one name, so a pair is found by name alone (ADR-0006 rule 4, P3-5, critic C-25):

```
<Component>/<exampleId>.<platform>.<scheme>.<density>[.<variant>].png
```

| Segment | Values | Who writes it |
|---------|--------|---------------|
| `<Component>` | the spec `name` | the directory, on both sides |
| `<exampleId>` | the `examples[].id` | both |
| `<platform>` | a **platform key of this file's `platforms` block** — the target that rasterized the image: `ios`, `ipados`, `macos`, `watchos`, `web-desktop`, `web-touch` | Apple: `DSSnapshotMatrix.platform`; web: the Playwright project name (`web/apps/vrt/matrix.ts`) |
| `<scheme>` | `light`, `dark`; only the schemes the example declares | both |
| `<density>` | `regular`, `compact` (ADR-0010) | both |
| `<variant>` | one forced accessibility state, absent in the standard state: `increased-contrast`, `reduce-transparency`, `bold-text` | Apple only today; the web matrix records no variant |

The platform segment is a platform key and never a stack name, so a column of the gallery is a column of the parity report and a second Apple target (a macOS render beside the iOS one) needs no rename. Today Apple records `ios` (iPhone 17, `swift/Tests/DSSnapshotTests/README.md`) and the web records `web-desktop` and `web-touch` (`web/apps/vrt/playwright.config.ts`); a cell missing on one side is a *missing pair*, and a variant the other stack's matrix does not record is not.

Each stack keeps its images where its harness compares them — `swift/Tests/DSSnapshotTests/__Snapshots__/` and `web/apps/vrt/baselines/<os>/` — and `pnpm gallery:build` (`tools/gallery`) collects them by name into `gallery/snapshots/` and writes `gallery/index.html` and `gallery/index.json`, the living canon of ADR-0005: both stacks side by side per example, scheme and density. The gallery shows them side by side; that is how drift becomes visible to a human.

**Every example gets its handlers.** Both galleries pass a no-op handler for each prop of type `action` the spec declares, whether or not the example's `props` name it, so an example renders the component's interactive form in both stacks: a Card example that keeps `action: open` is a pressable card with its glyph on Apple and on the web alike. Where a component behaves differently without a handler — a Card with nothing to open is a group and draws no glyph (`Card.yaml`) — that form is a gallery probe, not a spec example, so the two stacks never disagree about an example by accident.

### Slot content in examples

An example fills a `slot` prop, or a `data` prop that holds components, in one of four forms. Both galleries implement all four the same way, so the two stacks render the same content:

| Form | Renders |
|------|---------|
| `true` | the one component the anatomy names for the slot, with the props of that component's first example (TopBar's `search: true` is SearchField's `default-md`). A slot whose anatomy names no single component — a brand mark, a Sidebar's `content` — renders a placeholder box: `color.bg.fill.neutral.subtle` at `radius.inner`, the full width the slot gives it and `size.control.md` tall, or the whole box of a slot that stretches. |
| a mapping with no `fixture` key | the one component the anatomy names for the slot, with these props (an Alert's `action: { label: "Open all", variant: secondary, size: sm }` is that Button). A `kind` key here is that component's own prop (a Sparkline's `kind: line`), never a fixture. |
| a list | the items in order, each in one of the other forms, for a slot that holds several (a TopBar's `actions`); a spec that declares its own item grammar for the slot (Toolbar's `items`) uses that grammar |
| `{ fixture: <name>, … }` | one of the fixtures below |

| `fixture` | Parameters | Renders |
|-----------|------------|---------|
| `text` | `lines`, default 3 | `lines` single lines of `type.body.md` in the slot's primary text tone, the nth reading "Placeholder line n"; no line wraps, so both stacks break them identically |
| `list` | `count`, default 3 | `count` ListRows at their defaults, the nth with `title: "Item n"` |
| `form` | `fields`, default 1 | `fields` TextFields at `size: md`, the nth with `label: "Field n"` |
| `readout` | none | three StatTiles at `size: sm` and `layout: inline`, the nth with `label: "Reading n"` and `value: "n0"` |
| `buttonRow` | `count`, 1 or 2 | `count` Buttons at `size: md`: the last is `variant: primary` with `label: "Primary action"`, and with a count of 2 the first is `variant: secondary` with `label: "Secondary action"` |
| `pager` | `label` | one Pagination with `kind: range`, `size: sm` and that `label` |

Children a fixture renders stack with the slot's own `gap`. A fixture is gallery content only: it names no prop value an app passes, and a pattern's examples follow spec/patterns/README.md.

Examples render in both schemes, so `spec:validate` holds them to five rules:

- **Light glass** (a `glassLight` material, or an example enclosed in one) sits only over `backdrop: image` or `map` (ADR-0022 rule 8). Selection is not part of the test: since ADR-0029 §1.2 the scheme's glass is light glass in the light scheme anyway, and a selected card is told by the floating shadow and the outline of `Card.yaml`, not by a material of its own.
- **A vivid example sets no `icon`** (ADR-0022 rule 8): an icon ring on a gradient is one more shape competing with the value, and no pair checks it.
- **On vivid the hero holds only its value**; a `unit` belongs in the caption, where V2 guarantees the functional tier (V3, ADR-0030 §8).
- **A `tinted` example declares `schemes: [light]`**; the accent tint is a light-scheme look, and a dark screen leads with a Surface of material `accent` (ADR-0030 §3.3).
- **A `grid` is a 2×2 of gradient slots**, row-major, with one slot pair alternating on the diagonals (`1` and `2`, or `3` and `4`), so the grid is one temperature (ADR-0029 §2.5).

## Notes

```yaml
notes:
  platform:
    watchos: No trailing icon; sizes collapse to md; ghost variant becomes secondary.
    macos: Height follows compact density (`size.control.md`, 32 pt); hover state required.
  design: Primary uses elevation.1 so it lifts from solid surfaces; on vivid surfaces use variant=secondary.
```

## Versioning rules

- Bump `specVersion` for any change an implementation must react to (anatomy, props, states, bindings, behavior, accessibility). Editorial fixes don't bump.
- A spec **no stack has implemented on any platform** — a `pending` row in the parity report — has nothing to react to: edit it in place and leave `specVersion` where it is. The report prints `pending` at every version, so a bump records a revision of a contract that was never fulfilled and moves nothing; the gallery index and the showcase catalog carry the number, so it is not even free. The first bump is the first change after the first implemented cell.
- `status: deprecated` keeps the spec for one system minor version and names the replacement.
- The system version (`VERSION` at repo root, semver) is bumped by the release process, never inside a spec.
