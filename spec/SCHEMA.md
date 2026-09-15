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
density: [compact, regular, comfortable]   # which densities the component responds to
modality: [pointer, touch]                 # pointer adds hover; touch enforces 44pt targets
schemes: [light, dark]                     # always both unless justified
```

`none` is a decision: the parity report treats it as satisfied. `adapted` means the anatomy differs (e.g. watchOS Button has no trailing icon); the differences are listed under `notes.platform`.

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

The heart of the contract. Every visual property points to a token path; implementations may not use literals. Bindings can vary by variant/size/state using a matrix; unspecified cells inherit.

```yaml
tokens:
  root:
    background: { primary: comp.button.primary.bg.rest, secondary: comp.button.secondary.bg.rest, ghost: comp.button.ghost.bg.rest, danger: comp.button.danger.bg.rest }
    foreground: { primary: comp.button.primary.text, secondary: comp.button.secondary.text, ghost: color.text.primary, danger: color.text.critical }
    radius: radius.control
    height: { sm: size.control.sm, md: size.control.md, lg: size.control.lg }
    paddingX: { sm: space.3, md: space.4, lg: space.5 }
    gap: space.2
    elevation: { primary: elevation.1, default: elevation.0 }
    pressed: { background: comp.button.primary.bg.pressed }
    disabled: { opacity: opacity.disabled }
  label:
    typography: { sm: type.label.sm, md: type.label.md, lg: type.label.lg }
```

A binding is either a public `sys` path in a spec-bindable category, written without `sys.` and without `$root`, or a token of the spec's own component, `comp.<kebab-name>.*`, where the name is the spec's `name` in kebab-case (a StatTile spec binds comp.stat-tile tokens). A spec never binds `ref.*` or another component's `comp.*` (ADR-0024 §5).

- **Bindable categories:** `color`, `type`, `space`, `size`, `radius`, `border`, `elevation`, `opacity`, `motion`, `material`, `gradient`, `chart`, `stroke`, `icon`, `z`. Not bindable: `shadow` (the elevation levels are the role), `font` (families reach components through `type.*` roles) and `interaction` (modality flags that component code reads). The `motion` block is narrower still (below).
- **Component tokens** are declared in `tokens/comp/<component>.tokens.json`, each a whole-value alias of one `sys` token. One exists only for a choice the component makes, where the role's name does not already say what the cell is (`comp.button.primary.bg.rest` → `color.bg.fill.inverse`); when the role's name is the cell's meaning, the spec binds the role (Text `tone: secondary` → `color.text.secondary`). Every component token is bound by its spec.
- **Prose resolves.** Token paths in `behavior`, `accessibility`, `usage` and `notes` must exist, like the bindings. `spec:validate` (P2-1) checks all of this; `tokens/README.md` lists the names.

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
  reduceMotion: press scale is replaced by an opacity dip
```

`reduceTransparency` and `reduceMotion` are required in every spec (ADR-0011, ADR-0022 rule 9; the schema enforces them from P2-1). A spec cell keyed by a material name (`solid`, `raised`, `vivid`, `glass`, `glassLight`, `inverse`) applies when the enclosing Surface publishes that material, not because the component requested it (ADR-0022 §3.1).

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

Each stack has a manifest mapping component → implemented spec version. The parity report compares these to `specVersion`.

- `swift/Sources/DSComponents/Manifest.swift` → `static let implemented: [String: Int]`
- `web/packages/react/src/manifest.ts` → `export const implemented: Record<string, number>`

## Examples and snapshots

```yaml
examples:
  - id: primary-md
    props: { variant: primary, size: md, label: "Continue" }
  - id: loading
    props: { variant: primary, isLoading: true, label: "Saving" }
```

Every example is rendered by both stacks into `gallery/snapshots/<Name>/<id>.<platform>.<scheme>.png`. The gallery shows them side by side; that is how drift becomes visible to a human.

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
