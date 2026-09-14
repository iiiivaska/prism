# Brands

A brand re-colors and re-types Prism without changing its structure. Prism ships one reference brand, `prism/`, tuned to `docs/research/visual-dna.md`; apps add their own brand folders (here or in their own repository) and build tokens with the same pipeline. In resolver terms (ADR-0004) a brand is one context of the `brand` modifier and may write `ref.*` tokens plus a short whitelist of `sys.*` aliases.

## What a brand may override

| Group | Paths | Notes |
|-------|-------|-------|
| Neutral ramp | `ref.color.neutral.0…1000` | 11 steps in OKLCH; light and dark schemes read from opposite ends |
| Accent ramp | `ref.color.accent.50…900` | one accent per brand; a second accent is not supported by design |
| Status ramps | `ref.color.info|success|warning|critical.*` | may be inherited |
| Vivid gradients | `ref.gradient.vivid.1…4` | stops + angle; used only by `surface.vivid` |
| Font slots | `ref.font.ui`, `ref.font.display`, `ref.font.mono` | family, fallback stack, bundled file names, PostScript instance names; Cyrillic and tabular figures required |
| Font preset | `ref.font.preset` | `native` or `signature` |
| Type scale multiplier | `ref.type.scale` | 1.0 by default; role sizes cannot be changed individually |
| Radius profile | `ref.radius.profile` | one of `sharp`, `soft`, `round`; the whole scale follows |
| Whitelisted semantics | `sys.color.bg.fill.accent`, `sys.color.text.accent`, `sys.color.text.on-accent`, `sys.color.bg.page` | everything else is derived from the ramps |

Everything not listed is inherited from `tokens/ref/` and `tokens/sys/`. A brand cannot add token paths, cannot touch `comp.*`, cannot change spacing, elevation, motion or materials.

## Shipped brands

| Folder | Preset | What it is |
|--------|--------|------------|
| `prism/` | signature | The reference brand. Its values are `tokens/ref/*` themselves, so its override file is nearly empty; it exists as the resolver's default `brand` context. |
| `prism-native/` | native | Same palette and scales, font slots mapped to SF Pro / SF Mono on Apple and Inter on web. Layered on top of `prism` in the resolver. |

## Folder layout

```
brands/<name>/
  brand.json            name, version, preset, notes
  brand.tokens.json     DTCG overrides for the groups above ($extensions app.prism.brand = <name>)
  fonts/                bundled font files for the Signature preset, with their OFL.txt next to them
```

The resolver registers the folder as a `brand` context; the build emits one artifact set per brand.

## Acceptance

`tools/contrast` evaluates every pair in `tokens/contrast-pairs.json` for the brand across all `colorScheme` contexts; a brand that fails AA on a functional pair does not build. `tools/fonts` checks bundled fonts for Russian Cyrillic (incl. Ё/ё) and `tnum`. The gallery renders every brand across the same examples so drift is visible; only the reference brand is snapshot-tested.

## Presets

- `native`: `font.ui` = SF Pro (Apple) / Inter (web), `font.display` = SF Pro Display or Inter at `opsz 32`, `font.mono` = SF Mono / `ui-monospace`. No bundled files.
- `signature`: Onest for `ui` and `display`, JetBrains Mono for `mono`, bundled on every platform (ADR-0008). Alternates verified for Cyrillic and tabular figures: Manrope, Geist, Rubik, Golos Text (no thin weights), Geologica.
