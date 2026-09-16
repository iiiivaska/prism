# Component Spec Contract

Every Prism component is defined by one YAML file in `spec/components/<Name>.yaml`. The file is the contract that both implementations (SwiftUI, React) fulfil, the source from which the parity report, the gallery index, the agent skill and (later) the Figma library are derived. **Change the spec first, then the code.**

The machine-checkable shape lives in `spec/component.schema.json` (JSON Schema, applied to the YAML). This document explains the intent of each field.

## Header

```yaml
name: Button                # PascalCase, unique. Swift: DSButton. React: <Button>. CSS: .ds-button
layer: primitive            # foundation | primitive | composite | dataviz | pattern
specVersion: 1              # integer; bump on ANY visible or behavioral change
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

Every example is rendered by both stacks into `gallery/snapshots/<Name>/<id>.<platform>.<scheme>.png`. The gallery shows them side by side; that is how drift becomes visible to a human.

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
- `status: deprecated` keeps the spec for one system minor version and names the replacement.
- The system version (`VERSION` at repo root, semver) is bumped by the release process, never inside a spec.
