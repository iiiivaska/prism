# Brands

A brand re-colors and re-types Prism without changing its structure. It is data only: one context of the `brand` modifier in `tokens/prism.resolver.json` that declares allowlisted `ref.*` ids (ADR-0020 §1). In v1, brands live in this folder. Brands outside the repository wait for the published CLI, which ships on the first of ADR-0020 §8's triggers: a brand that must stay private, a brand with its own release cadence, a third-party consumer, or more than 2 MiB of fonts in `DSTokens` (roadmap L-1).

## What a brand may override

`BRAND_OVERRIDABLE` in `tools/tokens/config.ts` (the `brand` row of `OWNERSHIP`) is the only allowlist; this table reproduces it (ADR-0020 §1).

| Group | Ids | Count | Value rule |
|-------|-----|-------|------------|
| Neutral ramp | `ref.color.neutral.0\|50\|100\|150\|200\|300\|400\|500\|600\|700\|800\|850\|900\|950\|1000` | 15 | opaque color literal |
| Accent ramp | `ref.color.accent.50\|100\|200\|300\|400\|500\|600\|700\|800\|900\|950` | 11 | opaque color literal |
| Semantic slots | `ref.color.slot.light\|dark.bg-page\|bg-fill-accent\|text-on-accent\|text-accent` | 8 | alias only (below) |
| Chart series | `ref.color.series.light\|dark.1…6` | 12 today | opaque color literal, or alias of a step of the brand's neutral or accent ramp |
| Vivid gradients | `ref.gradient.vivid.orchid\|olive\|rose\|sky\|ember-night\|plum-dusk\|forest-moss\|navy-cyan` | 8 | whole token, extensions included; keeps its `app.prism.scheme`; every stop reaches 3:1 against white and the Card header block 4.5:1, and light stops stay light enough for ink on light glass (ADR-0022 V1, V2) |
| Font slots, web | `ref.font.ui\|display\|mono` | 3 | see Fonts |
| Font slots, Apple | `ref.font.apple.ui\|display\|mono` | 3 | see Fonts |
| Type scale | `ref.type.scale` | 1 | positive number, within [1, 1.25] (ADR-0021 §6) |
| Radius steps | `ref.radius.1…10` | 10 | non-decreasing with the step number |

- **Everything else is system-owned:** status colors, the smoked-glass tints `ref.color.smoke.light|dark`, space, size, border, blur, opacity, shadow, motion, the typography role composites (`ref.type.<role>`), `ref.radius.0` and `ref.radius.pill`.
- **No other writes.** A brand never writes `sys.*` or `comp.*` and never adds a path.
- **Whole tokens.** The DTCG merge replaces tokens wholesale, so a brand overrides a whole token and restates its functional extensions (a gradient's `angle`, `grain`, `scheme` and `bloom`; a font's `opsz`).
- **Gradient names.** The eight gradient ids keep the reference brand's names whatever a brand puts in them. Specs and components bind the `gradient.vivid.default` and `gradient.vivid.1…4` slots, which the scheme files map to them (ADR-0024 §6, ADR-0022 §4.4), never the names.
- **Radius and type scale.** Radius changes step by step; there is no radius profile. The type scale is the one number ADR-0008 decision 1 allows; role sizes cannot be changed individually.

## Semantic slots

The brand-tunable semantics are eight `ref` tokens, four per base scheme, that the scheme files alias (ADR-0020 §2):

| Slot | Aliased by, in the base scheme file | Must alias a step of | Light default | Dark default |
|------|-------------------------------------|----------------------|---------------|--------------|
| `bg-page` | `sys.color.bg.page` | the neutral ramp | neutral 100 | neutral 950 |
| `bg-fill-accent` | `sys.color.bg.fill.accent` | the accent ramp | accent 300 | accent 500 |
| `text-on-accent` | `sys.color.text.on-accent` | the neutral ramp | neutral 950 | neutral 950 |
| `text-accent` | `sys.color.text.accent` | the accent ramp | accent 800 | accent 500 |

- A slot is a whole-value alias of a ramp step, without `app.prism.alpha`. Its id is `ref.color.slot.<scheme>.<name>`, where `<name>` is the `sys` id after `sys.color.` with dots replaced by dashes; exactly that `sys` id aliases it.
- The increased-contrast and reduced-transparency deltas stay system-owned: `light-increased-contrast` still sets `sys.color.text.accent` to accent 900.
- Adding a slot needs an ADR. The per-brand contrast test guards the slots: each sits in a text pair of `tokens/contrast-pairs.json`.

## Colors reach every semantic token

Semantic colors alias ref colors, and tints, glows and overlays are aliases with `app.prism.alpha` (ADR-0020 §3), so a change to a brand's ramps reaches every tint, glow, overlay, series slot and gradient. Status colors are fixed on every brand: a product that needs other status hues changes Prism, not a brand. Series follow the brand and are validated per brand; where a brand's accent collides with another series slot, the brand overrides that slot.

## Fonts

- **Web stacks** (`ref.font.ui|display|mono`) list only families that the brand's own `brand.json` serves on the web, plus CSS generic keywords; never SF Pro, SF Mono, New York, Menlo, `-apple-system` or `BlinkMacSystemFont` (ADR-0020 §5).
- **Apple faces** (`ref.font.apple.ui|display|mono`) are exactly one entry each: a family the brand bundles on Apple, or one of these keywords.

  | Keyword | SwiftUI design |
  |---------|----------------|
  | `system-ui` | `.default` (SF Pro) |
  | `ui-rounded` | `.rounded` (SF Rounded) |
  | `ui-monospace` | `.monospaced` (SF Mono) |
  | `ui-serif` | `.serif` (New York) |

- **Fonts are per brand.** `brand.json` `fonts` lists every file the brand serves; `extends` layers token files, not `brand.json` entries. The `platform` modifier selects the web or Apple slots.
- **Font entries.** Each bundled file records `family`, `file`, `platforms` (`apple`, `web`), `version` (name ID 5 without "Version "), `sha256` and, when bundled on Apple, `postscript`: weight → the PostScript name Core Text exposes, for example JetBrains Mono's `JetBrainsMonoRoman-*` instance names and `JetBrainsMono-Regular` for the default instance (ADR-0021 §11).
- **Requirements.** Every served file needs Russian Cyrillic including Ё/ё and tabular digits: equal advances for 0–9, with or without `tnum` (ADR-0008, ADR-0021 §11). No font loads from a remote URL; Inter is self-hosted from the package.

| Preset | Web stacks (ui, display; mono) | Apple faces (ui, display, mono) | Files |
|--------|--------------------------------|---------------------------------|-------|
| Signature (`prism`) | `["Onest", "system-ui", "sans-serif"]`; `["JetBrains Mono", "ui-monospace", "monospace"]` | Onest, Onest, JetBrains Mono | bundled on both platforms |
| Native (`prism-native`) | `["Inter", "system-ui", "sans-serif"]` (display keeps `app.prism.opsz` 32); `["ui-monospace", "monospace"]` | `system-ui`, `system-ui`, `ui-monospace` | Inter on web only |

`brand.json` `preset` is a label that the build checks: `signature` means the ui and display Apple faces are bundled families, each equal to the first family of that slot's web stack and served on both platforms from one file (ADR-0008 decision 3: identical bytes); `native` means every Apple face is a keyword, no file lists `apple`, and the ui and display web stacks start with a served family. Nothing switches on the preset.

Alternates verified for Cyrillic and tabular figures: Manrope, Geist, Rubik, Golos Text (no thin weights), Geologica. A family without an instance for a weight the roles need renders the nearest heavier instance on both stacks (Golos Text: 400 for thin and light roles; Rubik: 300 for thin). The brand type scale `ref.type.scale` must lie in [1, 1.25] (ADR-0021).

## Shipped brands

| Folder | Preset | What it is |
|--------|--------|------------|
| `prism/` | signature | The reference brand. Its values are `tokens/ref/*`, and its `brand.tokens.json` declares no tokens: `prism-native` layers that file first, so any write would be a dead write. Onest and JetBrains Mono on both platforms. |
| `prism-native/` | native | Extends `prism`: the same palette and scales, with Inter plus `system-ui` and `ui-monospace` stacks on the web and the system faces `system-ui`, `system-ui` and `ui-monospace` on Apple. Inter 4.1 is self-hosted on the web only; no font files on Apple. |

## Folder layout

```
brands/<name>/
  brand.json            name, displayName, version, preset, extends?, notes, fonts: { ui|display|mono: { family, file, version, sha256, postscript?, platforms } }
  brand.tokens.json     DTCG overrides of allowlisted ref.* ids only
  fonts/<family>/       font files served by this brand, with their OFL.txt beside them
```

`tools/tokens/schema/brand.schema.json` validates `brand.json`.

## Adding a brand

1. Add the brand folder: `brand.json`, a `brand.tokens.json` with allowlisted ids only, and `fonts/<family>/` files with their `OFL.txt`.
2. Add one resolver line: a `brand` context in `tokens/prism.resolver.json`; a brand with `extends` lists its parent's sources first.
3. Add a `licenses/inventory.json` entry for each new font.
4. Add a minor changeset (`context-added`).

`pnpm tokens:build` then emits the brand's web files (`tokens.css`, `tokens.ts`, fonts and `fonts.css`), its `DSBrand` case, its colorset namespace and its font resources. An app selects the brand once: on the web it imports `@iiiivaska/prism-tokens/brands/<name>/tokens.css` plus that brand's `fonts.css` (one brand per document, no brand attribute); on Apple it calls `DSTheme(brand: .<name>)` once at the scene root and reads colors as `tokens.color.<name>`. One tag carries every brand, and every brand passes Prism's CI.

## Acceptance

- `tokens:build` diagnostics: `brand/not-overridable`, `brand/unknown-path`, `brand/registration`, `brand/value`, `brand/radius-order`, `slot/target`, `slot/mapping`, `sys/literal`, `color/alpha-target`, `font/web-stack`, `font/apple-face`, `font/preset`, `type/scale-range`.
- `contrast:check` runs every pair in `tokens/contrast-pairs.json` in all six colorScheme contexts per brand, including ADR-0022's vivid checks (V1, V2) and the glass-over-vivid pairs with the light-scheme ink pairs on the brand's gradients; a brand that fails a functional pair does not build.
- `fonts:check` checks every font file a brand serves: file and `OFL.txt`, SHA-256 and version against `brand.json`, Russian Cyrillic incl. Ё/ё, tabular digits (equal 0–9 advances with or without `tnum`), the PostScript instance map and the 2 MiB `DSTokens` budget.
- `tools/viz-validate` runs per brand once it exists.
- The gallery renders every brand in its own document; only the reference brand is snapshot-tested (ADR-0002 rule 3).
