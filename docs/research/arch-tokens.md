# Prism — Token architecture and tooling research

Research date: 2026-09-08. All version numbers were verified against the npm registry (`registry.npmjs.org`) or GitHub on that date unless stated otherwise. Confidence: **H** = read in a primary/official source; **M** = official source but summarised through a fetch tool or partially inferred; **L** = secondary source or inference.

Scope: (1) token structure in Material 3, Spectrum 2, Polaris, Atlassian, Primer; (2) DTCG 2025.10 status and format; (3) Style Dictionary v5; (4) Terrazzo; (5) Tokens Studio / Figma import paths; (6) colour science; (7) a concrete layout + build matrix for Prism.

---

## 0. Executive summary (what actually matters for Prism)

1. **DTCG is stable.** The Design Tokens Community Group shipped its first stable spec, **2025.10**, on 28 Oct 2025 as a *Final Community Group Report* in three modules: **Format**, **Color**, **Resolver**. Colours are objects (`colorSpace` + `components` + `alpha` + optional 6-digit `hex` fallback) with 14 colour spaces including `oklch` and `display-p3`; dimensions/durations are `{value, unit}` objects; theming is expressed by a separate **resolver** document (`sets`, `modifiers` with `contexts`, `resolutionOrder`). A newer resolver *draft* exists (dated 30 Jul 2026) and explicitly says "do not implement".
2. **Style Dictionary is v5 (5.5.3, 6 Sep 2026), Node ≥ 22, Apache-2.0.** It reads DTCG 2025.10 **color objects (all 14 spaces, since 5.3.0)** and **dimension objects (since 5.4.0)**, has new `color/oklch|oklab|lch|p3` transforms, but **does not implement the resolver module** (open issue #1590; maintainers are designing a `resolver` config property; Autodesk runs a thin resolver layer on top of SD 5.x in production). `duration` objects and gradients with colour objects are still WIP. Built-in Swift output (`ios-swift/*` formats, `color/UIColorSwift`, `color/ColorSwiftUI`) is sRGB-only, flat static lets, no asset catalogs, no light/dark, no P3 — Prism needs custom Swift formats.
3. **Terrazzo (CLI 2.7.1, MIT) is DTCG-2025.10-native including resolvers**, and its CSS plugin does real gamut mapping (`@media (color-gamut: p3)` fallbacks via Color.js), its Tailwind plugin emits a Tailwind v4 `@theme` from a template with `@tz` at-rules. Its **Swift plugin is 0.3.3 and "experimental": colour-only `.xcassets` with Display P3 components + a dark appearance from legacy modes.** Small project (456 stars, essentially one maintainer). Best use for Prism: **validator / linter / reference implementation**, not the primary build.
4. **Tokens Studio** writes/reads a "W3C DTCG" *flavour* (`$value`/`$type`/`$description`, string values such as `"#ff0000"`, `"16px"`). Its docs contain no mention of 2025.10 object values (repo code search for "2025.10" = 0 hits), the colour-object proposal is still at "Discussion". Themes (multi-mode Figma collections) require the paid plan (Starter Plus, formerly Pro, €49/month monthly billing). **Figma's native JSON import** (help centre) accepts DTCG-shaped JSON but only sRGB/HSL colours, `px` dimensions and a single font family. **Figma Variables REST API (read and write) is Enterprise-only per developer docs** (the pricing page lists it under Organization + Enterprise — conflict, see open questions). The Plugin API can create variables on any plan with edit access.
5. **Colour pipeline recommendation:** author in **OKLCH** DTCG colour objects with a script-computed sRGB `hex` fallback; emit `oklch()`/`color(display-p3)` with `@media (color-gamut: p3)` for web, Display P3 components (gamut-mapped with Color.js, the library both SD and Terrazzo already depend on) for Swift (`Color(.displayP3, …)` / asset catalog `display-p3`), and 6-digit hex for the Figma/Tokens-Studio flavour.
6. **Recommended architecture for Prism:** single DTCG 2025.10 source + `prism.resolver.json`; a ~200-line TypeScript "resolver driver" that enumerates permutations and instantiates Style Dictionary v5 per permutation (the pattern the SD maintainer endorsed in Aug 2026); custom SD formats for Swift (`.xcassets` + Swift enums with P3 colours and per-density values), CSS variables with mode selectors, Tailwind v4 `@theme inline`, TypeScript, and a Tokens Studio / Figma-native "flavour" export. Terrazzo runs in CI as `tz lint` for resolver orthogonality.

---

## 1. How the big systems structure tokens

### 1.1 Material 3 (Google)

| Aspect | Finding | Source | Conf. |
|---|---|---|---|
| Tiers | Three: **reference** `md.ref.*` (raw palettes), **system** `md.sys.*` (roles), **component** `md.comp.*` (per component). In material-web CSS the component tokens are *not* prefixed `comp`: `--md-filled-button-container-color`. | [material-foundation/material-tokens tokens.md](https://github.com/material-foundation/material-tokens/blob/main/tokens.md), [material-web theming](https://material-web.dev/theming/material-theming/) | H |
| Naming | Dot path in data (`md.sys.color.primary`, `md.ref.palette.primary40`, `md.sys.typescale.body-large.size`, `md.sys.shape.corner.small`), kebab in CSS (`--md-sys-color-primary`). Tonal palettes 0…100 (`primary0 … primary100`). | same | H |
| Light/dark | Same *system* token, different *reference* alias per scheme: `md.sys.color.primary` → `md.ref.palette.primary40` (light) / `primary80` (dark); `onPrimary` → `primary100` / `primary20`. | tokens.md graph | H |
| Density / motion | Not expressed in the public token files reviewed (the m3.material.io pages are JS-rendered and could not be fetched); the material-tokens repo was archived 2023-08-15. | GitHub API `archived: true` | M |
| Worth copying | `ref → sys → comp` tier vocabulary; "on-X" pairing convention (`primary` / `onPrimary`, `primaryContainer` / `onPrimaryContainer`); tonal palette indices as lightness steps. | | |

### 1.2 Adobe Spectrum 2

| Aspect | Finding | Source | Conf. |
|---|---|---|---|
| Package | `@adobe/spectrum-tokens` v12.x in the `adobe/spectrum-design-data` monorepo; 90+ JSON files per component plus `color-aliases.json` (191 tokens), `layout.json` (340 tokens), `semantic-color-palette.json`, `typography.json`. Every token has a `$schema` (token-type) and a `uuid`. | [packages/tokens/README.md](https://github.com/adobe/spectrum-design-data/blob/main/packages/tokens/README.md), repo tree | H |
| Naming | **Flat kebab-case**, no tier prefix: `accent-background-color-default`, `background-layer-1-color`, `blue-subtle-background-color-default`, `base-padding-horizontal-large`. Segment order: `[component or role]-[property]-[state or size]`. | color-aliases.json, layout.json | H |
| Light/dark | A **`color-set`** token holds `sets: { light: {value: "{accent-color-900}"}, dark: {value: "{accent-color-800}"}, wireframe: {…} }`; each set member is itself a typed token (`alias.json`). | color-aliases.json | H |
| Platform scale | A **`scale-set`** token holds `sets: { desktop: {value: "18px"}, mobile: {value: "22px"} }` — the "desktop scale (cursor) vs mobile scale (touch)" mechanism of Spectrum's *platform scale* concept. | layout.json, [Spectrum platform scale page](https://spectrum.adobe.com/page/platform-scale/) (JS-rendered; page body not fetched) | H (data) / M (page) |
| Token type schemas | `alias, alignment, angle, color-set, color, dimension, drop-shadow, font-family, font-size, font-style, font-weight, gradient-stop, multiplier, opacity, scale-set, set, system-set, text-transform, token, typography`. | `packages/tokens/schemas/token-types/` | H |
| Versioning policy | semver: intentional value change = **minor**, token deletion or type change = **major**; deprecations via `deprecated`, `deprecated_comment`, `renamed` and the old token aliased to the new. | README | H |
| Worth copying | The *set-per-dimension* idea (Prism will do this with the DTCG resolver instead of Spectrum's proprietary `sets`), uuid per token, explicit semver rules, deprecation metadata (`$deprecated` in DTCG). | | |

### 1.3 Shopify Polaris

| Aspect | Finding | Source | Conf. |
|---|---|---|---|
| Status | The `Shopify/polaris` React repo is **archived (2026-08-11) and labelled "Deprecated"**; `polaris.shopify.com/tokens/*` now 301-redirects to `shopify.dev/docs/api/polaris` (web components). Custom MIT-based licence restricted to Shopify-integrating apps. | GitHub API, redirect observed | H |
| Naming | `--p-` prefix in CSS; pattern **`color-{property}-{role}-{variant}-{state}`**: `color-bg-surface-secondary-hover`, `color-bg-fill-brand-active`, `color-bg-surface-critical`, `color-text-*`, `color-icon-*`, `color-border-*`. Properties: `bg`, `bg-surface`, `bg-fill`, `text`, `icon`, `border`; roles: `brand, info, success, caution, warning, critical, emphasis, magic, inverse, transparent`; variants: `secondary, tertiary`; states: `hover, active, selected, disabled`. Component-specific tokens are prefixed by component: `nav-bg-surface-selected`, `input-bg-surface-hover`, `avatar-one-bg-fill`. 227 colour tokens in the base theme. | [polaris-tokens/src/themes/base/color.ts](https://github.com/Shopify/polaris/blob/main/polaris-tokens/src/themes/base/color.ts), [README](https://github.com/Shopify/polaris/blob/main/polaris-tokens/README.md) | H |
| Light/dark | Themes are TypeScript objects (`themes/base`, plus variants); no DTCG. | repo | M |
| Worth copying | The `bg-surface` vs `bg-fill` split (surface = containers, fill = solid interactive fills) and the strict `property-role-variant-state` order. | | |

### 1.4 Atlassian Design System

| Aspect | Finding | Source | Conf. |
|---|---|---|---|
| Naming | **`foundation.property.modifier`**: `color.text`, `color.icon.success`, `color.background.selected.bold`, `color.background.accent.blue.subtle`, `elevation.surface.raised`, `space.100`, `font.body`, `font.heading.large`. | [atlassian.design design-tokens](https://atlassian.design/foundations/tokens/design-tokens), [Forge design tokens](https://developer.atlassian.com/platform/forge/design-tokens-and-theming/) | H |
| CSS delivery | `--ds-` prefix, with the foundation word dropped for colour/elevation: `var(--ds-text)`, `var(--ds-surface-raised)`, `var(--ds-space-100)`, `var(--ds-font-heading-large)`; JS via `token('color.text')` from `@atlaskit/tokens`. | Forge page | H |
| Theme switching | `html[data-color-mode="light|dark|auto"]` is the public attribute; `data-theme` is internal ("should not be read or modified"). | Forge page | H |
| Theme dimensions | light, dark, high-contrast, reduced motion, typography, and **compact / comfortable / cozy** density views. | atlassian.design | M |
| Worth copying | "Choose tokens based on meaning, not value"; `bold`/`subtle` prominence modifiers; a documented public attribute for colour mode and a private one for implementation detail. | | |

### 1.5 GitHub Primer (Primitives v10+)

| Aspect | Finding | Source | Conf. |
|---|---|---|---|
| Name blocks | `[prefix]-[namespace]-[pattern]-[variant]-[property]-[scale]`: prefix `brand` (marketing only); namespace `base` (raw values only); pattern = component/pattern in camelCase; variant = `default | muted | emphasis` (colour) or size; **property is required**: `fgColor, bgColor, borderColor, borderWidth, boxShadow, fontSize, fontWeight, size, minTarget`; scale = state (`rest/hover/active/disabled`), density (`condensed/normal/spacious`) or thickness (`thin/thick/thicker`). camelCase inside a block, `-` between blocks in CSS, `.` in JS. | [primer.style token names](https://primer.style/product/primitives/token-names/) | H |
| Tiers | base (`base-size-4`, `base-color-green-5`) → functional (`bgColor-inset`, `borderColor-default`) → component (`button-primary-bgColor-hover`, `control-danger-borderColor-rest`). | same | H |
| Themes | 9 colour themes shipped as CSS: `light, light-high-contrast, light-colorblind, light-tritanopia, dark, dark-dimmed, dark-high-contrast, dark-colorblind, dark-tritanopia`. In the JSON5 source a token carries **`$extensions['org.primer.overrides']`** with per-theme alias overrides, plus **`$extensions['org.primer.figma']`** (`collection`, `scopes`, `group`, `codeSyntax`) and **`$extensions['org.primer.llm']`** (`usage`, `rules`). Built with Style Dictionary. | [primer/primitives README](https://github.com/primer/primitives/blob/main/README.md), [bgColor.json5](https://github.com/primer/primitives/blob/main/src/tokens/functional/color/bgColor.json5) | H |
| Machine-readable rules | `DESIGN_TOKENS_GUIDE.md` is written *for AI agents*: RFC 2119 MUST/SHOULD/NEVER tables, colour-pairing matrix, a "Hallucination Guard" (`/* check-token */` suffix for unknown tokens). | [DESIGN_TOKENS_GUIDE.md](https://github.com/primer/primitives/blob/main/DESIGN_TOKENS_GUIDE.md) | H |
| Worth copying | Everything in the last two rows: the `$extensions` namespacing for Figma metadata and LLM guidance is exactly what an AI-agent-first design system needs; `fgColor/bgColor/borderColor` property vocabulary; density as a *scale* block. | | |

### 1.6 Naming conventions worth copying (synthesis)

* **Property-first semantic names** (`bg`, `fg`/`text`, `icon`, `border`, `shadow`) followed by role (`accent`, `neutral`, `success`, `critical`, …), prominence (`bold`/`subtle` or `emphasis`/`muted`), then state (`rest`/`hover`/`pressed`/`disabled`/`selected`). Polaris, Atlassian and Primer all converge on this; Material is role-first (`primary`, `onPrimary`).
* **Three tiers with explicit prefixes** in the *path* (`ref`, `sys`, `comp` per Material) but *no* tier prefix in emitted names where it adds noise (Primer/Spectrum). Prism can keep tier as the first path segment and drop `sys.` in output.
* **Density and input modality as scale words** (`condensed/normal/spacious`; Spectrum `desktop/mobile`) never as separate token names — they are contexts (resolver modifiers), not name segments.
* **Deprecation as data** (`$deprecated: "use color.bg.surface"`, Spectrum `renamed`).
* **Vendor `$extensions`** (reverse-DNS keys: `org.primer.figma`) for Figma scopes/collections, code syntax and LLM usage rules.

---

## 2. DTCG specification status and format (verified 2026-09-08)

| # | Fact | Source | Conf. |
|---|---|---|---|
| 2.1 | First stable version **2025.10** announced 28 Oct 2025; "Final Community Group Report", published "as a Candidate Recommendation following the definitions provided by the W3C process"; "considered stable, further updates will be provided in superseding specifications". Not a W3C Recommendation (it is a Community Group report). | [W3C CG announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/), [TR index](https://www.designtokens.org/tr/2025.10/) | H |
| 2.2 | Three modules, all stable at 2025.10: **Format**, **Color**, **Resolver**. | [TR index](https://www.designtokens.org/tr/2025.10/) | H |
| 2.3 | A newer **Resolver preview draft** exists at `/tr/drafts/resolver/` (dated 30 Jul 2026 per fetch) with the warning "Do not attempt to implement this version". | [Resolver draft](https://www.designtokens.org/tr/drafts/resolver/) | M (date) |
| 2.4 | Reserved token properties: `$value` (required), `$type`, `$description`, `$extensions` (vendor object), `$deprecated` (boolean or string reason). Group properties: `$description`, `$type` (default for children), `$extends` (group inheritance, deep-merge, no cycles; "syntactic sugar for JSON Schema's $ref"), `$deprecated`, `$extensions`. Reserved token name `$root` for a group's base token (`{color.accent.$root}`). | [Format 2025.10](https://www.designtokens.org/tr/2025.10/format/) | H |
| 2.5 | Names MUST NOT start with `$` and MUST NOT contain `{`, `}` or `.`. | Format | H |
| 2.6 | Type resolution: token `$type` > nearest ancestor group `$type`; with no type the token is invalid — tools MUST NOT infer type from the value. | Format | H |
| 2.7 | Alias syntax `"{group.token}"` (references the whole `$value`); JSON Pointer `$ref` (RFC 6901) MUST also be supported by tools ("advanced use cases"); referencing a group (`{color.accent}`) is invalid. | Format | H |
| 2.8 | Primitive types: `color` (object), `dimension` `{value:number, unit:"px"|"rem"}`, `duration` `{value:number, unit:"ms"|"s"}`, `fontFamily` (string or array), `fontWeight` (1–1000 or keywords `thin…black`), `number`, `cubicBezier` `[x1,y1,x2,y2]`. | Format | H |
| 2.9 | Composite types: `strokeStyle` (keyword or `{dashArray, lineCap}`), `border` `{color,width,style}`, `transition` `{duration,delay,timingFunction}`, `shadow` (object or array of `{color,offsetX,offsetY,blur,spread}`; **no `inset` property**), `gradient` (array of `{color, position}`), `typography` `{fontFamily,fontSize,fontWeight,letterSpacing,lineHeight}`. Sub-values may be aliases to tokens of the sub-value's type. | Format | H |
| 2.10 | Color module: `$value = { colorSpace, components:[…], alpha?, hex? }`; 14 spaces: `srgb, srgb-linear, hsl, hwb, lab, lch, oklab, oklch, display-p3, a98-rgb, prophoto-rgb, rec2020, xyz-d65, xyz-d50`; `oklch` components `[L 0–1, C ≥0, H 0–360)`; `display-p3`/`srgb` `[r,g,b] 0–1`; `"none"` keyword allowed for missing components; `alpha` 0–1 default 1; `hex` is an optional **6-digit** sRGB fallback; gamut-mapping algorithm choice is left to tools, CSS Color 4 referenced for conversions. | [Color 2025.10](https://www.designtokens.org/tr/2025.10/color/) | H |
| 2.11 | Resolver module: root `version` (must be `"2025.10"`), `resolutionOrder` (required array of `{$ref}` to `#/sets/*` and `#/modifiers/*`), `sets: {name: {sources:[{$ref:"file.json"} or inline tokens]}}`, `modifiers: {name: {contexts: {ctx:[sources]}, default?}}`, optional `name`, `description`, `$schema`. Modifiers MUST NOT reference modifiers; only `resolutionOrder` may. Resolution: validate inputs → flatten sets in order → pick one context per modifier → merge (later wins) → resolve aliases. `$ref` may be same-document (`#/sets/x`, MUST support), relative file, `file.json#/…`, or URL (optional). | [Resolver 2025.10](https://www.designtokens.org/tr/2025.10/resolver/) | H |
| 2.12 | JSON Schemas are published and live: `https://www.designtokens.org/schemas/2025.10/format.json` and `…/resolver.json` (both HTTP 200 on 2026-09-08). | curl | H |
| 2.13 | Listed implementers at release: Style Dictionary, Tokens Studio, Terrazzo, Figma, Sketch, Penpot, Framer, Knapsack, Supernova, zeroheight. | W3C announcement | M |

Minimal 2025.10 token examples (shape verified against the spec):

```jsonc
{
  "$schema": "https://www.designtokens.org/schemas/2025.10/format.json",
  "ref": {
    "color": {
      "$type": "color",
      "orange": {
        "500": {
          "$value": { "colorSpace": "oklch", "components": [0.72, 0.19, 55], "alpha": 1, "hex": "#f28c28" },
          "$description": "Prism accent ramp, step 500"
        }
      }
    },
    "space": {
      "$type": "dimension",
      "4": { "$value": { "value": 16, "unit": "px" } }
    },
    "motion": {
      "fast": { "$type": "duration", "$value": { "value": 150, "unit": "ms" } },
      "standard": { "$type": "cubicBezier", "$value": [0.2, 0, 0, 1] }
    }
  },
  "sys": {
    "color": {
      "$type": "color",
      "bg": { "accent": { "$root": { "$value": "{ref.color.orange.500}" }, "hover": { "$value": "{ref.color.orange.600}" } } }
    },
    "shadow": {
      "$type": "shadow",
      "elevation": { "2": { "$value": [{ "color": "{sys.color.shadow.ambient}", "offsetX": { "value": 0, "unit": "px" }, "offsetY": { "value": 2, "unit": "px" }, "blur": { "value": 8, "unit": "px" }, "spread": { "value": 0, "unit": "px" } }] } }
    }
  }
}
```

---

## 3. Style Dictionary v5

### 3.1 Package and versions

| Fact | Source | Conf. |
|---|---|---|
| npm package **`style-dictionary`**, latest **5.5.3** published 2026-09-06; Apache-2.0; `engines.node >= 22.0.0`. dist-tags: `latest 5.5.3`, `rc 5.0.0-rc.2`, `prerelease 4.0.0-prerelease.39`. Recent cadence: 5.4.1 (May 18), 5.4.2, 5.4.3 (Jun 2), 5.4.4 (Jun 8), 5.5.0 (Jun 21), 5.5.1 (Aug 7), 5.5.2 (Aug 19), 5.5.3 (Sep 6, 2026). There is **no v6**. | npm registry JSON | H |
| Runtime deps: `colorjs.io ^0.5.2`, `tinycolor2`, `change-case`, `json5`, `prettier`, `@bundled-es-modules/{deepmerge,glob,memfs}`, `@zip.js/zip.js`, `commander`. | package.json (main) | H |
| v5.0.0 (2025-05-16) breaking: references may only point at tokens (no `.value` suffix, no non-token leaves); reference syntax fixed to DTCG `{a.b}` (no custom separators); Node ≥ 22 (uses `Set.prototype.union`); `StyleDictionary.extend()` async; `new StyleDictionary(cfg)` + `await sd.hasInitialized`; all hooks async-capable; hook registrations live under `hooks`; preprocessors must be applied explicitly; transform errors are collected and logged as warnings instead of aborting; `setFs()` for custom filesystem; `formatPlatform()` / `formatAllPlatforms()` return formatted output without writing; CSS shorthand transforms opt-in; asset tokens unquoted + `asset/url`. | [v5.0.0 release](https://github.com/style-dictionary/style-dictionary/releases/tag/v5.0.0), CHANGELOG | H |
| 5.3.0 (2026-02-09): all colour transforms accept DTCG colour objects; 14 spaces; new `color/oklch`, `color/oklab`, `color/p3` (emits `color(display-p3 …)`), `color/lch`; `hex` fallback used "when the color is out-of-gamut for sRGB"; types `DTCGColorSpace`, `DTCGColorValue`. | [v5.3.0 release](https://github.com/style-dictionary/style-dictionary/releases/tag/v5.3.0); names confirmed in `lib/enums/transforms.js` | H |
| 5.4.0: DTCG 2025.10 **dimension object** values `{value, unit}` supported with backward compatibility; `size/remToPt` fix; `size/remToFloat` restores legacy iOS behaviour; strict tuple types. 5.5.0: `emitEmptyFiles`. 5.4.4 / 5.5.1: prototype-pollution fixes in `convertTokenData` (GHSA-vj5c-m527-mpff, GHSA-xmr7-549p-98w3). 5.5.3: nested composite expansion limited to configured type filters; alpha precision in `color/css`. | CHANGELOG | H |
| Official statement: "the latest format 2025.10 does not have full support yet in Style Dictionary — this is a work in progress in v5". | [DTCG info page](https://styledictionary.com/info/dtcg/) | H |
| Issue #1590 "Support for DTCG v2025.10" (open, created 2025-11-04, last activity 2026-08-31): Color ✅, Border ✅, Shadow ✅, Dimension ✅; **Gradient 🚧, Duration 🚧 (#1471; PR #1500 open since 2025-04-28); Resolvers ✗**. Maintainer (jorenbroekema, 2026-03-20): resolver "will be some work to create a parser and handle the multi-output … nothing is blocking folks from … an abstraction layer on top of SD". 2026-08-27: Autodesk (Weave DS) reports running DTCG resolver modifiers in production on SD 5.x via a ~180-line parser + permutation loop, "byte-identical to a hand-written parametric source array plus a build loop", and offered to contribute it. Maintainer (2026-08-28) agrees a `resolver` property "as an alternative to `source`, producing every permutation" is the design, notes token-collision warnings are too noisy for multi-theme builds and that a new Logger with per-category thresholds is on a branch targeted for Q4 2026. | [issue #1590](https://github.com/style-dictionary/style-dictionary/issues/1590) | H |

### 3.2 Configuration model

| Fact | Source | Conf. |
|---|---|---|
| Token files: JSON, JSONC, JSON5, JS ESM (default export), TS (Bun/Deno or Node ≥ 22.6 with `--experimental-strip-types`). | [config reference](https://styledictionary.com/reference/config/) | H |
| `include` = base/default tokens; `source` = tokens that **override** `include`; both are glob arrays; everything is deep-merged into one dictionary. Overrides in `source` produce "token collision" warnings; `log.warnings: 'warn' | 'error' | 'disabled'`, `log.verbosity: 'default' | 'silent' | 'verbose'`, `log.errors.brokenReferences: 'throw' | 'console'`. | config, [logging](https://styledictionary.com/reference/logging/), architecture | H |
| `usesDtcg` boolean, auto-detected. | config | H |
| `expand`: `false` (default) / `true` / filter fn / `{ typesMap, include | exclude }`; global or per platform; runs **after** preprocessors and **before** transforms; global expansion cannot be undone per platform; platform-level expansion has access to `name/path/filePath` metadata. Built-in `DTCGTypesMap` (exported from `style-dictionary/utils`) maps composite sub-props (e.g. border `width` → `dimension`, `style` → `strokeStyle`) and can be extended. | config §Expand | H |
| Hooks: `parsers`, `preprocessors`, `transforms`, `transformGroups`, `formats`, `filters`, `fileHeaders`, `actions` — registered via `register<Hook>()` or inline under `hooks`. Two default preprocessors always run last: `typeDtcgDelegate` (copies group `$type` onto tokens) and `expandObjectTokens`. | [preprocessors](https://styledictionary.com/reference/hooks/preprocessors/), config | H |
| Lifecycle: parse config → find files (`include`/`source`) → parsers → deep merge → global preprocessors → *(per platform)* platform preprocessors → expand → transforms (value transforms skipped on aliases) → resolve references → transitive transforms → filters → formats + file headers → actions. | [architecture](https://styledictionary.com/info/architecture/) | H |
| `outputReferences`: boolean or function per token; helpers `outputReferencesFilter` (avoid references to filtered-out tokens) and `outputReferencesTransformed` (fall back to resolved value when a transform changed the referenced value, e.g. `rgba({base},12%)` after `color/css`); both chainable. Supported by `css/variables`, `scss/*`, `less/variables`, `android/resources`, `compose/object`, `ios-swift/*`, `flutter/class.dart`. | [references utils](https://styledictionary.com/reference/utils/references/), formats | H |
| `css/variables` options: `selector` (string or **array → nested selectors**, outermost first), `outputReferences`, `outputReferenceFallbacks`, `sort` (reference-safe ordering applied automatically when outputReferences is on), `formatting` (`indentation`, `commentStyle`, `commentPosition`, header/footer), `showFileHeader`. | [predefined formats](https://styledictionary.com/reference/hooks/formats/predefined/) | H |
| JS/TS: `javascript/esm` (`minify`, `stripMeta`, `flat`), `typescript/es6-declarations` (`outputStringLiterals`), `typescript/module-declarations`, `json`, `json/nested`, `json/flat`. | formats | H |

### 3.3 Built-in Swift/iOS support and its limits

| Fact | Source | Conf. |
|---|---|---|
| Transform group **`ios-swift`** = `attribute/cti, name/camel, color/UIColorSwift, content/swift/literal, asset/swift/literal, size/swift/remToCGFloat`; `ios-swift-separate` is identical but intended for one file per category (no category prefix). `ios` (Obj-C) = `attribute/cti, name/pascal, color/UIColor, content/objC/literal, asset/objC/literal, size/remToFloat`. | [transform groups](https://styledictionary.com/reference/hooks/transform-groups/predefined/) | H |
| Colour transforms: `color/UIColorSwift` → `UIColor(red: 0.667, green: 0.667, blue: 0.667, alpha: 0.6)`; `color/ColorSwiftUI` → `Color(red: 0.667, green: 0.667, blue: 0.667, opacity: 0.6)` (documented as "UIColor swift class" but emits SwiftUI `Color`). **Both emit sRGB component floats; neither emits a colour-space argument, Display P3, hex, or light/dark dynamic colours.** Sizes: `size/swift/remToCGFloat` → `CGFloat(16.00)`, `size/remToPt` → `16pt`, `size/remToFloat` → `16f`. | [predefined transforms](https://styledictionary.com/reference/hooks/transforms/predefined/) | H |
| Formats `ios-swift/class.swift`, `ios-swift/enum.swift`, `ios-swift/any.swift` (`objectType` e.g. `struct`): options `accessControl` (default `public`), `import` (default `UIKit`, string or array), `className`, `outputReferences`, `showFileHeader`. Output is a flat list of `public static let colorBackgroundDanger = UIColor(red: …)`. | formats | H |
| **Limits for Prism** (derived): no `.xcassets` generation; no light/dark/high-contrast variants (would need a `Color(light:dark:)` or asset-catalog approach); no P3; dimensions become bare `CGFloat` (units dropped, `rem` scaled by 16); no `Font`, `Shadow`, `Gradient` or typography struct output unless composites are expanded and mapped by a custom format; no per-density values; no `@available`/`Sendable`/`enum` namespace nesting. Conclusion: Prism must write custom Swift formats (Terrazzo's swift plugin source is a usable reference for the `.colorset` JSON). | derived from the above | H |

### 3.4 Multi-brand × multi-theme × multi-platform in SD

| Fact | Source | Conf. |
|---|---|---|
| The official pattern is a **parametric config loop**: `getStyleDictionaryConfig(brand, platform)` returns `source: [ tokens/brands/${brand}/*.json, tokens/globals/**/*.json, tokens/platforms/${platform}/*.json ]` and `buildPath: build/${platform}/${brand}/`; then `for brand → for platform → new StyleDictionary(cfg).buildPlatform(platform)`. Global tokens alias brand/platform tokens (`color.primary = {color.brand.primary}`, `font.family.base = {font.platform.system}`). | [examples/advanced/multi-brand-multi-platform](https://github.com/style-dictionary/style-dictionary/tree/main/examples/advanced/multi-brand-multi-platform) | H |
| `include` vs `source` gives a two-layer override (defaults vs overrides) without a loop; anything beyond two layers uses the loop above or a resolver-driver. Collision warnings are expected in this pattern (see #1590 discussion). | config, #1590 | H |
| No built-in "themes → CSS selectors in one file" feature: to emit `:root {…} [data-theme=dark] {…}` from one SD run you either (a) run the format per permutation with `selector` set differently and concatenate, or (b) run `formatPlatform()` per permutation in memory and diff against the default permutation to write only overrides (Autodesk's post-build bundling step). | formats (`selector`), #1590 | H |

### 3.5 Tailwind v4 `@theme` generation

| Fact | Source | Conf. |
|---|---|---|
| Tailwind v4 theme namespaces: `--color-*, --font-*, --text-*, --font-weight-*, --tracking-*, --leading-*, --breakpoint-*, --container-*, --spacing-*, --radius-*, --shadow-*, --inset-shadow-*, --drop-shadow-*, --blur-*, --perspective-*, --aspect-*, --ease-*, --animate-*`; `@theme` (utilities + variables), `@theme inline` (needed when a theme variable references another CSS variable so utilities inline the `var()`), `@theme static` (emit all variables even if unused); `--spacing` base + `calc()` scale; `--color-*: initial` / `--*: initial` to drop defaults; keyframes inside `@theme`; paired properties like `--text-xs--line-height`. Dark mode: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))` (or `.dark`). Default palette is **OKLCH**. | [Tailwind theme docs](https://tailwindcss.com/docs/theme), [dark mode](https://tailwindcss.com/docs/dark-mode), [colors](https://tailwindcss.com/docs/colors) | H |
| Style Dictionary has **no built-in Tailwind format**. Community reference: `tokens-studio/sd-tailwindv4` (last push 2025-07-03, "exploration and experiment") registers a custom `tailwind-v4` format producing `@theme { … }` plus `@layer base { [data-theme="dark"] { … } }` for a proprietary `_`/`dark` key pattern, `@utility` and `@layer components` from custom `$type: utility|component`. Not DTCG-conformant, not maintained as a package. | [sd-tailwindv4 readme](https://github.com/tokens-studio/sd-tailwindv4/blob/main/readme.md) | H |
| Terrazzo's `@terrazzo/plugin-tailwind` is the only maintained generator: emits a Tailwind v4 CSS file with `@theme` from a `tailwind.template.css` where you write `@variant dark { @tz (theme: "dark"); }`; `theme` mapping via picomatch globs (`color: ["color.**"]`, `font: { sans: "typography.family.base" }`); typography composites expand to `--text-x` + `--text-x--line-height` etc.; needs `@terrazzo/plugin-css` with matching permutations (`skipBuild: true` if only Tailwind is needed). | [Terrazzo Tailwind docs](https://terrazzo.app/docs/integrations/tailwind/) | H |
| Practical pattern for Prism (recommended below): emit plain CSS variables (with mode selectors) + a small `@theme inline { --color-bg-accent: var(--ds-color-bg-accent); … }` file; `inline` is what makes mode switching work because utilities then reference the runtime variable. | Tailwind docs (`@theme inline` semantics) | H |

### 3.6 Related package

| Fact | Source | Conf. |
|---|---|---|
| `@tokens-studio/sd-transforms` latest **2.0.3** (2025-12-10), MIT, `node >= 18`; README still says examples "assume … v4 style-dictionary latest prerelease" and mentions Themes "in the PRO version of Tokens Studio". Compatibility with SD 5.5.x is not stated in the README (open question). It is only needed if Prism *consumes* Tokens-Studio-flavoured JSON; Prism's plan (DTCG source, Tokens Studio as a derived export) does not need it. | npm registry, README | M |

---

## 4. Terrazzo (formerly Cobalt UI)

| Fact | Source | Conf. |
|---|---|---|
| Packages (all MIT): `@terrazzo/cli` **2.7.1** (2026-08-11), `@terrazzo/parser` 2.7.1, `@terrazzo/plugin-css` 2.7.1, `@terrazzo/plugin-tailwind` 2.7.1, `@terrazzo/plugin-js` 2.7.1, `@terrazzo/plugin-swift` **0.3.3** (2026-07-26), plus `plugin-sass`, `plugin-css-in-js`, `token-tools`. Monthly-ish releases in 2026 (2.1.0 Apr 25 → 2.7.1 Aug 11). | npm registry | H |
| 2.0.0 headline: "Full support for the DTCG v2025.10 spec, including resolvers"; new native Figma import (REST, `FIGMA_ACCESS_TOKEN` or `FIGMA_OAUTH_TOKEN` since 2.1.0); `plugin-js` re-imagined as a server-side resolver API; `plugin-css-in-js`. Breaking: colour `components` required (`channels` removed), `dimension`/`duration` must be objects, `0` no longer auto-expanded, typography requires all five sub-values; old drafts can be re-enabled via lint settings. 2.4.0 adds resolver **orthogonality detection**; 2.2.0 disables `listPermutations` for complex resolvers (`permutationLimit` guards combinatorial explosion); 2.7.1 fixes merging raw values into aliases across permutations. | [cli CHANGELOG](https://github.com/terrazzoapp/terrazzo/blob/main/packages/cli/CHANGELOG.md) | H |
| Config `terrazzo.config.ts`: `tokens` (JSON/JSONC/YAML, merged in order), `outDir` (default `./dist/`), `plugins`, `lint.rules`, `ignore.tokens`, `ignore.deprecated`, `alphabetize`. | [config docs](https://terrazzo.app/docs/reference/config/) | H |
| Resolver guide: `.resolver.json` with `sets` / `modifiers` / `resolutionOrder`; inputs passed per plugin (`permutations: [{ input: { theme: "dark" }, prepare: css => … }]`); "permutation" = one unique output; **orthogonality** ("no two modifiers operate on the same tokens") is enforced advice, with the FAQ recommending **one modifier per token `$type` family** (colour+gradient+shadow; dimension+typography; duration+cubicBezier+transition) and flattening combos into context names (`light-themeA-highContrast`). Legacy `$extensions.mode` still works via a synthetic `tzMode` modifier. | [Resolvers & Theming](https://terrazzo.app/docs/guides/resolvers/) | H |
| CSS plugin: variables named from token IDs (`variableName(token)` hook); `permutations[{input, prepare, include, exclude}]`; `only.modifiers/sets` escape hatch; `transform()` override hook (per permutation); `utility` groups (Tailwind-like classes without scanning); `legacyHex`; `colorDepth` 24/30/36/48/unlimited (default 30-bit); `skipBuild`; `subValueVariableName`. Colour output defaults to modern functions (`oklch()`, `rgb()`); **automatic wide-gamut fallbacks**: an out-of-sRGB colour is emitted as the sRGB-mapped value at `:root`, then re-declared inside `@media (color-gamut: p3)` and `@media (color-gamut: rec2020)` using Color.js gamut mapping (CSS Color 4 algorithm), replacing Cobalt 1.x's "expand into P3" oversaturation. | [CSS docs](https://terrazzo.app/docs/integrations/css/) | H |
| Swift plugin (`@terrazzo/plugin-swift` 0.3.3): **"still experimental"**; option `catalogName` (default `Tokens`); generates `Tokens.xcassets/<token.id>.colorset/Contents.json`; source handles **only `$type: color`** (`// TODO: other types`); converts every colour to **Display P3** (`convert(parsed, spaceId, { inGamut: { space: 'p3' } })`) and writes `color-space: "display-p3"`, `idiom: "universal"`; adds `appearances: [{appearance: "luminosity", value: "dark"}]` when the token has a legacy `dark` mode (`token.mode`), i.e. driven by `$extensions.mode`, not by resolver contexts; 0.3.3 emits exact 0/1 as `"0.0"`/`"1.0"` so Xcode treats them as normalized floats. | [plugin-swift src/index.ts](https://github.com/terrazzoapp/terrazzo/blob/main/packages/plugin-swift/src/index.ts), [swift docs](https://terrazzo.app/docs/integrations/swift/), swift CHANGELOG | H |
| Maturity: GitHub 456 stars, 788 commits, 30 open issues, 10 PRs; overwhelmingly one maintainer (drwpow); Discord community. | [GitHub README](https://github.com/terrazzoapp/terrazzo) | M |

### Honest comparison for Prism

| Criterion | Style Dictionary 5.5.3 | Terrazzo 2.7.1 |
|---|---|---|
| DTCG 2025.10 format | Colour ✅, dimension ✅, duration/gradient 🚧 | Full ✅ (strict; lints old drafts) |
| Resolver module | ✗ (design agreed, not shipped) | ✅ native, with orthogonality lint and permutation enumeration |
| CSS + modes | Manual (selector per run, concatenate/diff) | Built-in `permutations` |
| Wide-gamut CSS fallbacks | Only via custom transform (colorjs.io available) | Built-in `@media (color-gamut)` |
| Tailwind v4 | Custom format needed | Official plugin (template + `@tz`) |
| Swift | Built-in but sRGB/UIKit/flat; needs custom formats anyway | Experimental, colour-only `.xcassets` |
| TypeScript output | Built-in `javascript/esm` + `typescript/*` | `plugin-js` (server-side resolver API) / `plugin-css-in-js` |
| Extensibility | Mature hooks API (parsers, preprocessors, transforms, formats, filters, actions), huge ecosystem, docs, enums | Plugin API (`transform`/`build`), smaller ecosystem |
| Project risk | Long-lived (Amazon origin, active maintainers, 392 dependents) | Single-maintainer, fast-moving, plugin-swift 0.x |
| Verdict | **Primary build engine** (custom formats + thin resolver driver) | **CI validator/linter and second opinion** (`tz lint`, orthogonality, resolver conformance); optionally reuse its CSS gamut logic as reference |

---

## 5. Tokens Studio, Figma native import, Figma REST API

### 5.1 Tokens Studio for Figma

| Fact | Source | Conf. |
|---|---|---|
| The plugin has a **Token Format** setting: "legacy" vs "W3C DTCG" — DTCG mode prefixes `$value`, `$type`, `$description`; names may not contain `{`, `}`, `$`; conversion is one click and can be per branch; docs state "The default is `legacy format`" and "The DTCG specifies additional token types … which we will support in future releases". | [Token Format docs](https://docs.tokens.studio/manage-settings/token-format) (raw source read) | H |
| **2025.10 object values are not supported/documented**: dimension docs require string values like `"16px"`/`"1rem"`; a GitHub code search of the plugin docs repo for "2025.10" returns 0 results; the colour-object proposal on the feedback board (uses the older `channels` draft) is still in "Discussion". → Tokens Studio reads the *editors-draft* DTCG flavour (`$value: "#hex"`, `"16px"`), not 2025.10 colour/dimension objects. | [Dimension docs](https://docs.tokens.studio/manage-tokens/token-types/dimension/), [feedback post](https://feedback.tokens.studio/p/dtcg-format-update-on-color-tokens-and-support-for-color), GitHub code search | M-H |
| Import of external JSON: the plugin syncs whole token files from Git/URL providers (GitHub/GitLab/ADO/Bitbucket/URL/local); any DTCG-flavoured JSON that follows the above constraints loads. Multi-file sync is a **paid** feature; free = single file. | pricing pages | M |
| Plans (Figma plugin): **Starter (free)**: unlimited consumers, community support, "basic token types", sync providers. **Starter Plus** (formerly "Pro"): **€49/month** per editor billed monthly (20 % off annually): advanced token types, **multi-file sync**, **Git branching**, token automation/flow, living documentation, bulk edit, advanced logic, Studio sync, **Themes (Figma Collection support)**. Platform plans are separate (Variables €17/mo, Essential €169/mo, Organization €499/mo). | [pro-pricing](https://tokens.studio/pro-pricing), [starter-plus](https://tokens.studio/starter-plus), [pricing](https://tokens.studio/pricing) | M (the pro-pricing fetch listed "Themes" under both columns; the starter-plus page and the docs put it under paid only) |
| Docs are explicit: "**Themes (pro)** … Exports your selected Themes to Variables with multiple modes within a collection. Requires a pro licence." Free plan exports **Token Sets → separate collections, multiple modes not supported**. Themes produce `$themes.json` and `$metadata.json` in the repo. | [Export to Figma variables docs](https://github.com/tokens-studio/tokens-studio-for-figma-plugin-docs/blob/main/figma/export/variables.md), [themes overview](https://docs.tokens.studio/manage-themes/themes-overview) | H |
| Export mapping to Figma: color → Color variable (+ Color style); dimension/spacing/sizing/radius/border-width → **Number variable, unit dropped, rem converted to px**; fontFamily → String; fontWeight → String/Number; boolean → Boolean; text → String; typography → Text style (particles as variables); boxShadow → Effect style; border composite → none; gradient → Color style only. | same export doc | H |

### 5.2 Figma native variables import/export (no plugin)

| Fact | Source | Conf. |
|---|---|---|
| Announced at Figma Schema (Nov 2025): native JSON import/export of variables aligned with the DTCG spec and "extended collections"; rolled out gradually. | [Obra summary](https://figma.obra.studio/design-tokens-community-group-w3c-release/), [Figma forum](https://forum.figma.com/ask-the-community-7/native-variable-export-feature-47831) | M |
| Help centre "Modes for variables": design tokens "must be in a JSON file and follow the DTCG format"; **Export mode** (one mode) / **Export modes** (all, zip with one JSON per mode); **Import mode** (right-click a mode) updates variables matching name and type; importing files into a new collection creates one mode per file; importing into existing modes updates values but "no new variables will be created". Supported types: **color (HSL and sRGB only)**, **dimension (px only)**, fontFamily (single name), duration (seconds), number, boolean via `$extensions` `com.figma.type`, and a non-standard `string`. Names are normalised with `/` (`color.accent.light` → `color/accent/light`); duplicates after normalisation: first wins. `$extensions` keys are namespaced; Figma's use `com.figma.*`. | [Modes for variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables) | H |
| Extended collections (multi-brand overrides of a parent collection): **Enterprise only**; inherit variables/modes from the parent; cannot add variables or modes. | [Extend a variable collection](https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection) | H |
| Modes per collection (pricing page): Professional **10**, Organization **20**, Enterprise "unlimited (via extended collections)"; Starter has no modes (secondary source). | [figma.com/pricing](https://www.figma.com/pricing/), search summary | M |

### 5.3 Figma Variables REST API

| Fact | Source | Conf. |
|---|---|---|
| `GET /v1/files/:key/variables/local`, `GET …/variables/published`, `POST /v1/files/:key/variables` — each page states verbatim: "This API is available to full members of Enterprise orgs." POST additionally needs edit access; scopes `file_variables:read` / `file_variables:write`; GET = rate-limit Tier 2, POST = Tier 3; body ≤ 4 MB; ordered arrays `variableCollections`, `variableModes` (≤ 40 per collection, 40-char names), `variables` (≤ 5000 per collection), `variableModeValues`; `codeSyntax` per platform (WEB/ANDROID/iOS) for Dev Mode. | [Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/) | H |
| Conflict: the Figma pricing page lists "REST API for variables" under **Organization and Enterprise**. Treat developer docs as authoritative until re-verified (open question 8). | pricing page | M |
| Workaround without Enterprise: the **Plugin API** (`figma.variables.createVariableCollection`, `createVariable`, `addMode`, `setValueForMode`; types COLOR/FLOAT/STRING/BOOLEAN) has no documented plan gating beyond extended collections being Enterprise; a private "Prism sync" plugin can push DTCG JSON into variables. | [Working with variables](https://developers.figma.com/docs/plugins/working-with-variables/) | M |

---

## 6. Colour science for tokens

| Fact | Source | Conf. |
|---|---|---|
| DTCG `oklch` components are `[L 0–1, C ≥ 0, H 0–360)`; `display-p3` `[r,g,b 0–1]`; `hex` is a 6-digit sRGB fallback; the spec says the choice of gamut-mapping algorithm "can significantly affect the appearance" and recommends validating converted colours. | Color 2025.10 | H |
| SwiftUI: `init(_ colorSpace: Color.RGBColorSpace = .sRGB, red: Double, green: Double, blue: Double, opacity: Double = 1)`; `Color.RGBColorSpace` cases `.sRGB` ("extended sRGB"), `.sRGBLinear`, `.displayP3`; available iOS 13 / macOS 10.15 / watchOS 6 / tvOS 13 / visionOS 1. Creates a *constant* colour (no light/dark adaptation); extended sRGB allows components outside 0–1. | [Color.init](https://developer.apple.com/documentation/swiftui/color/init(_:red:green:blue:opacity:)), [RGBColorSpace](https://developer.apple.com/documentation/swiftui/color/rgbcolorspace) | H |
| UIKit: `UIColor(displayP3Red:green:blue:alpha:)` iOS 10 / tvOS 10 / watchOS 3 / Mac Catalyst 13.1 / visionOS 1; components clamped to 0–1; stored internally as extended-range sRGB. | [UIColor init](https://developer.apple.com/documentation/uikit/uicolor/init(displayp3red:green:blue:alpha:)) | H |
| Asset catalog named colour (`*.colorset/Contents.json`): `colors: [{ idiom, "display-gamut": "sRGB" | "display-P3", color: { "color-space": "srgb" | "display-p3", components: { red, green, blue, alpha } (0–1 floats) } }]`; Xcode adds `appearances: [{ appearance: "luminosity", value: "dark" }]` and high-contrast variants (Attributes inspector "Appearances" + "High Contrast" checkbox). The archived format reference documents `display-gamut` but not `appearances`; Terrazzo writes `appearances` and Xcode reads it. | [Asset Catalog Format: Named Color](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Named_Color.html), [Specifying your app's color scheme](https://developer.apple.com/documentation/xcode/specifying-your-apps-color-scheme), Terrazzo source | H (schema) / M (`appearances` key not in archive doc) |
| Color.js (dependency of both SD and Terrazzo): `color.toGamut({ space: "srgb" })` default method `"css"` = CSS Color 4 algorithm (binary-search chroma reduction in OKLCH, accept clipped result when ΔE2000 < 2); `"clip"` also available; `color.inGamut("srgb")`. | [colorjs.io gamut mapping](https://colorjs.io/docs/gamut-mapping) | H |
| Tailwind v4 ships its palette in OKLCH and accepts `oklch()` in `@theme`; Terrazzo CSS emits `oklch()` by default with `@media (color-gamut: p3)` / `rec2020` blocks for out-of-gamut colours; SD's `color/p3` emits `color(display-p3 r g b)` and `color/oklch` emits `oklch(l c h)`. | Tailwind docs, Terrazzo CSS docs, SD 5.3.0 notes | H |

**Recommended single-source pipeline (one OKLCH value in → three outputs):**

1. Author: `{ colorSpace: "oklch", components: [L, C, H], alpha }`. A `tokens:normalize` script (Color.js) computes and writes back `hex` = sRGB gamut-mapped 6-digit hex (so every consumer that only understands hex — Tokens Studio, Figma native import — is served without manual upkeep) and fails CI if `hex` is stale.
2. Web: custom SD transform `prism/color/css-gamut` → `oklch()` when in sRGB gamut; otherwise emit sRGB-mapped `oklch()` as the base value and a P3-mapped value under `@media (color-gamut: p3)` (same strategy Terrazzo uses; Color.js `toGamut({space:'p3'})`). Tailwind consumes the CSS variables via `@theme inline`.
3. Swift: custom transform `prism/color/p3` → `toGamut({space:'p3'})` then `Color(.displayP3, red:green:blue:opacity:)` (SwiftUI) and, for asset catalogs, `color-space: display-p3` components with light/dark/high-contrast `appearances`. Wide-gamut colours survive on all Apple displays; on sRGB-only hardware the OS maps them.
4. Figma flavour: `hex` only (Figma import accepts sRGB/HSL only).

---

## 7. Recommendations for Prism

### 7.1 Decisions

1. **Source format = DTCG 2025.10 with object values, one file family, validated in CI against the published JSON Schemas** (`format.json`, `resolver.json`). Author colours in OKLCH, dimensions as `{value, unit}`, durations as `{value, unit}`, typography/shadow/border as composites with aliased sub-values.
2. **Theming dimensions = DTCG resolver modifiers**, kept **orthogonal** by token type, following Terrazzo's guidance and Prism's own matrix (brand × colour-scheme × density × modality × platform):

   | Modifier | Contexts | Owns token types / paths | Default |
   |---|---|---|---|
   | `brand` | `default`, `<brand-id>…` | `ref.palette.*`, `ref.font.*` (ui/display/mono slots), `ref.radius.profile.*`, `ref.gradient.*` — **primitives only** | `default` |
   | `colorScheme` | `light`, `dark`, `light-increased-contrast`, `dark-increased-contrast`, `light-reduced-transparency`, `dark-reduced-transparency` (flatten combos rather than adding modifiers) | `sys.color.*`, `sys.material.*`, `sys.shadow.*` — **semantic colour only**, values are aliases into `ref.palette` | `light` |
   | `density` | `compact`, `regular`, `comfortable` | `sys.space.*`, `sys.size.control.*`, `sys.typography.*` sizes | `regular` |
   | `modality` | `pointer`, `touch` | `sys.size.target.*`, `sys.size.hit.*`, hover-only states | `pointer` |
   | `motion` | `default`, `reduced` | `sys.motion.*` durations/easings | `default` |
   | `platform` | `apple`, `web`, `watch` | `sys.font.family.*` (SF vs Inter for the *Native* preset), `sys.material.blur.*` (no blur on watch) | — (always provided by the build) |

   Because `brand` only writes *ref* tokens and `colorScheme` only writes *sys.color* aliases, no two modifiers touch the same token ID, which is exactly the orthogonality test ("does modifier order affect output?"). Run `tz lint` in CI to prove it (Terrazzo 2.4.0 has orthogonality detection).

   > **Superseded 2026-09-15.** Modifier ownership is by token id, not type (ADR-0024 §9): `brand` writes only the allowlisted `ref.*` ids of ADR-0020 (no `ref.radius.profile`, no `ref.palette`), `platform` only `sys.font.**`, and density owns `sys.size.control.*` but no typography (ADR-0021 §6, ADR-0024 §7). `tz lint` does not detect overlaps; the gate is `pnpm tokens:lint` plus `tokens:build`. Brand contexts are `prism` and `prism-native`, and the resolver default density is `compact` (ADR-0019).
3. *(Superseded 2026-09-15 by ADR-0024: names follow `tokens/README.md`; the positional grammar and the closed vocabularies below are dropped, names are kebab-case, and emitted names follow `tools/tokens/ARCHITECTURE.md` §8.)* **Naming:** path = `tier.category.property.role.prominence.state`; tiers `ref | sys | comp`; kebab-case output with prefix `ds`. Examples: `sys.color.bg.accent.$root` → `--ds-color-bg-accent` / `DSColor.bgAccent`; `sys.color.bg.accent.hover` → `--ds-color-bg-accent-hover`; `sys.color.fg.on-accent` → `--ds-color-fg-on-accent`; `comp.button.primary.bg.rest`. Reserved vocabularies: properties `bg | fg | icon | border | shadow | outline`, roles `neutral | accent | info | success | warning | critical | inverse`, prominence `bold | subtle | muted`, states `rest | hover | pressed | focus | selected | disabled`.
4. **`$extensions["app.prism"]`** on every token (Primer pattern): `{ figma: { collection, scopes, codeSyntax:{web, ios} }, llm: { usage:[…], rules:"…" }, a11y: { pairsWith:[…], minContrast: 4.5 }, platforms: ["apple","web"] }`. This is the machine-readable contract the AI-agent developer reads; keep the LLM rules file (`DESIGN_TOKENS_GUIDE.md`) generated from these extensions.
5. **Build engine: Style Dictionary 5.5.x + a TypeScript resolver driver** (`build/resolver.ts`): parse `prism.resolver.json`, enumerate permutations (with a `permutationLimit`), for each permutation instantiate `new StyleDictionary({ source: orderedSources, include: [], usesDtcg: true, log: { warnings: 'disabled' for override collisions }, platforms })`, and use `formatPlatform()` to keep outputs in memory for diff-based bundling. When SD ships a native `resolver` config option (issue #1590), swap the driver for it — the maintainer states the semantics will be identical to the parametric loop.
6. *(Superseded 2026-09-15 by ADR-0024 §9: `tz lint` proves nothing about orthogonality; the gate is `pnpm tokens:lint`, which adds `@terrazzo/parser`'s check, plus `tokens:build`.)* **Terrazzo in CI only**: `tz lint` (2025.10 strictness, orthogonality) on the same source and resolver; optionally diff Terrazzo's CSS output against Prism's as a conformance oracle. Do not depend on `@terrazzo/plugin-swift` (0.x, colour-only).
7. **Custom SD formats to write** (all small, all TypeScript, all unit-tested with snapshot tests):
   * *(Superseded 2026-09-15: attribute names and selectors per ADR-0019 (`data-ds-*`, valid-value fallbacks).)* `prism/css-variables-modes` — `:root` block for the default permutation, then override blocks per non-default context computed by diffing permutations: `[data-color-scheme=dark]`, `@media (prefers-color-scheme: dark) :root:not([data-color-scheme=light])`, `[data-density=compact]`, `@media (pointer: coarse)`/`[data-modality=touch]`, `@media (prefers-reduced-motion: reduce)`, `@media (prefers-contrast: more)`; wide-gamut `@media (color-gamut: p3)` re-declarations. Use `outputReferences` + `outputReferencesTransformed` so `var(--ds-…)` chains survive.
   * *(Superseded 2026-09-15: no Tailwind `dark` variant; only the ADR-0019 `ds-*` variants (`tools/tokens/ARCHITECTURE.md` §9.4).)* `prism/tailwind-theme` — `@theme inline { --color-…: var(--ds-color-…); --spacing-…; --radius-…; --shadow-…; --font-…; --text-…; --text-…--line-height; --ease-…; --animate-… }` + `@custom-variant dark (&:where([data-color-scheme=dark], [data-color-scheme=dark] *))`.
   * `prism/ts-tokens` — typed const objects + `as const` literal types (SD's `javascript/esm` + `typescript/es6-declarations` may suffice; wrap for naming).
   * `prism/swift-xcassets` — one `.colorset` per `sys.color.*` token with Display P3 components and `appearances` for dark / high-contrast (from the `colorScheme` contexts), `idiom: universal`; a separate `watch` catalog without transparency materials.
   * `prism/swift-enums` — `public enum DSColor { static let bgAccent = Color("sys-color-bg-accent", bundle: .module) }`, `DSSpace`/`DSSize` as `CGFloat` with a `Density`-keyed table (`static func space(_ token: …, density: DSDensity)` or a generated `DSTheme` struct resolved once from the environment), `DSFont` with slot names + Dynamic Type text styles, `DSMotion` with `Duration` + `Animation` curves, `DSShadow` structs. Emit `@available(iOS 26, macOS 26, watchOS 26, *)` and `Sendable`.
   * `prism/tokens-studio-flavour` — `$value` strings (`hex`, `16px`), legacy type names where Tokens Studio expects them (`sizing`, `spacing`, `boxShadow`), `$themes.json` + `$metadata.json` generated from the resolver (one Tokens-Studio theme per permutation of `brand × colorScheme × density`).
   * `prism/figma-native-flavour` — per-mode DTCG files (px, hex, single font family, `/`-safe names, `com.figma.type` extension for booleans) suitable for the help-centre "Import mode" flow, so Figma stays reachable without Enterprise or Tokens Studio Pro.
8. **Versioning:** one semver for the whole system; adopt Spectrum's rule set (value change = minor, removal/type change = major); `$deprecated` strings with the replacement path; a `tokens:diff` CI job that classifies changes and fails the PR if the declared bump is too small.
9. **Contrast test in CI** runs on *resolved permutations*, not source files: for each `colorScheme` × `brand`, evaluate every `a11y.pairsWith` pair; WCAG AA (4.5:1) for functional text, 3:1 for decorative numerics ≥ 24 pt as declared in `$extensions`.

### 7.2 Proposed file layout

```
repo/
├─ Package.swift                       # SPM root (products: PrismTokens, PrismUI, PrismCharts)
├─ package.json                        # npm workspaces (scope @iiiivaska)
├─ tokens/                             # SOURCE OF TRUTH — DTCG 2025.10 only
│  ├─ prism.resolver.json              # sets + modifiers + resolutionOrder (version "2025.10")
│  ├─ ref/                             # primitives, brand-agnostic defaults
│  │  ├─ color.palette.tokens.json     # OKLCH ramps (neutral, accent, semantic hues) + hex fallback
│  │  ├─ dimension.tokens.json         # 4-pt scale, radii, border widths, breakpoints
│  │  ├─ typography.tokens.json        # size/lineHeight/weight/tracking scales (no families here)
│  │  ├─ motion.tokens.json            # durations, cubicBezier
│  │  ├─ elevation.tokens.json         # shadow composites (4 levels)
│  │  └─ opacity.tokens.json
│  ├─ sys/                             # semantic; every file belongs to exactly one modifier
│  │  ├─ color/  light.tokens.json  dark.tokens.json  light-increased-contrast.tokens.json  dark-increased-contrast.tokens.json  light-reduced-transparency.tokens.json  dark-reduced-transparency.tokens.json
│  │  ├─ density/  compact.tokens.json  regular.tokens.json  comfortable.tokens.json
│  │  ├─ modality/  pointer.tokens.json  touch.tokens.json
│  │  ├─ motion/  default.tokens.json  reduced.tokens.json
│  │  ├─ platform/  apple.tokens.json  web.tokens.json  watch.tokens.json
│  │  └─ base.tokens.json              # context-independent semantics (z-index, icon stroke, chart palettes ordering)
│  ├─ comp/                            # component tokens, alias only into sys.*
│  │  ├─ button.tokens.json  card.tokens.json  field.tokens.json  …  chart.tokens.json
│  └─ brands/
│     ├─ default/brand.tokens.json     # overrides ref.color.palette hues, ref.font slots (ui/display/mono), radius profile, gradient
│     └─ <brand>/brand.tokens.json
├─ build/                              # tooling (TypeScript, Node 22)
│  ├─ sd.config.ts                     # platforms + files, parametrised by permutation
│  ├─ resolver.ts                      # DTCG resolver parser + permutation enumerator (swap for SD-native later)
│  ├─ transforms/  color-css-gamut.ts  color-p3.ts  dimension-css.ts  dimension-cgfloat.ts  name-ds.ts
│  ├─ formats/     css-variables-modes.ts  tailwind-theme.ts  swift-xcassets.ts  swift-enums.ts  ts-tokens.ts  tokens-studio.ts  figma-native.ts
│  ├─ preprocessors/  validate-extensions.ts
│  ├─ scripts/     normalize-hex.ts  diff-versions.ts  contrast-check.ts  parity-report.ts
│  └─ terrazzo.config.ts               # lint-only config pointing at tokens/ (CI)
├─ dist/  (gitignored)
│  ├─ swift/PrismTokens/{Sources/PrismTokens/Generated/*.swift, Resources/Colors.xcassets, Resources/Colors-watch.xcassets}
│  ├─ web/{tokens.css, tailwind.theme.css, tokens.ts, tokens.d.ts}
│  ├─ tokens-studio/{ref.json, sys/*.json, comp/*.json, brands/*.json, $themes.json, $metadata.json}
│  └─ figma-native/<brand>/<colorScheme>.json …
└─ docs/DESIGN_TOKENS_GUIDE.md          # generated from $extensions.app.prism.llm
```

> **Superseded 2026-09-15.** Generated output is committed in the owned roots of `tools/tokens/ARCHITECTURE.md` §9.0 (flavors in `tokens/export/`), not in `dist/` (ADR-0024 §11). Brands live in `brands/<name>/` and write the allowlisted `ref.*` ids, with no radius profile (ADR-0020 §1); Swift carries every brand in one `DSTokens`, with namespaced colorsets and `DSTokenContext.brand`, not per-brand artifacts (ADR-0020 §7).

`prism.resolver.json` sketch:

```jsonc
{
  "$schema": "https://www.designtokens.org/schemas/2025.10/resolver.json",
  "name": "Prism", "version": "2025.10", "description": "Prism 1.x",
  "sets": {
    "ref":  { "sources": [{ "$ref": "ref/color.palette.tokens.json" }, { "$ref": "ref/dimension.tokens.json" }, { "$ref": "ref/typography.tokens.json" }, { "$ref": "ref/motion.tokens.json" }, { "$ref": "ref/elevation.tokens.json" }, { "$ref": "ref/opacity.tokens.json" }] },
    "sys":  { "sources": [{ "$ref": "sys/base.tokens.json" }] },
    "comp": { "sources": [{ "$ref": "comp/button.tokens.json" }, { "$ref": "comp/card.tokens.json" }, { "$ref": "comp/chart.tokens.json" }] }
  },
  "modifiers": {
    "brand":       { "contexts": { "default": [{ "$ref": "brands/default/brand.tokens.json" }] }, "default": "default" },
    "platform":    { "contexts": { "apple": [{ "$ref": "sys/platform/apple.tokens.json" }], "web": [{ "$ref": "sys/platform/web.tokens.json" }], "watch": [{ "$ref": "sys/platform/apple.tokens.json" }, { "$ref": "sys/platform/watch.tokens.json" }] } },
    "colorScheme": { "contexts": { "light": [{ "$ref": "sys/color/light.tokens.json" }], "dark": [{ "$ref": "sys/color/dark.tokens.json" }], "light-increased-contrast": [{ "$ref": "sys/color/light.tokens.json" }, { "$ref": "sys/color/light-increased-contrast.tokens.json" }], "dark-increased-contrast": [{ "$ref": "sys/color/dark.tokens.json" }, { "$ref": "sys/color/dark-increased-contrast.tokens.json" }], "light-reduced-transparency": [{ "$ref": "sys/color/light.tokens.json" }, { "$ref": "sys/color/light-reduced-transparency.tokens.json" }], "dark-reduced-transparency": [{ "$ref": "sys/color/dark.tokens.json" }, { "$ref": "sys/color/dark-reduced-transparency.tokens.json" }] }, "default": "light" },
    "density":     { "contexts": { "compact": [{ "$ref": "sys/density/compact.tokens.json" }], "regular": [{ "$ref": "sys/density/regular.tokens.json" }], "comfortable": [{ "$ref": "sys/density/comfortable.tokens.json" }] }, "default": "regular" },
    "modality":    { "contexts": { "pointer": [{ "$ref": "sys/modality/pointer.tokens.json" }], "touch": [{ "$ref": "sys/modality/touch.tokens.json" }] }, "default": "pointer" },
    "motion":      { "contexts": { "default": [{ "$ref": "sys/motion/default.tokens.json" }], "reduced": [{ "$ref": "sys/motion/reduced.tokens.json" }] }, "default": "default" }
  },
  "resolutionOrder": [
    { "$ref": "#/sets/ref" }, { "$ref": "#/modifiers/brand" },
    { "$ref": "#/sets/sys" }, { "$ref": "#/modifiers/platform" }, { "$ref": "#/modifiers/colorScheme" }, { "$ref": "#/modifiers/density" }, { "$ref": "#/modifiers/modality" }, { "$ref": "#/modifiers/motion" },
    { "$ref": "#/sets/comp" }
  ]
}
```

### 7.3 Build matrix

Not every modifier becomes a separate artifact; per target, decide which contexts are **runtime** (emitted as selectors / adaptive values inside one artifact) and which are **build-time** (separate artifacts). Raw permutation count = brands × 6 colourSchemes × 3 densities × 2 modalities × 2 motion × 3 platforms = 216 × brands, but the artifacts are:

| Target (SD platform) | Build-time axes (artifact per…) | Runtime axes (inside artifact) | Files | Transforms | Format |
|---|---|---|---|---|---|
| `web-css` | brand, platform=web | colorScheme (`[data-color-scheme]` + `prefers-color-scheme`, `prefers-contrast`, reduced transparency via `[data-reduced-transparency]`), density (`[data-density]`), modality (`@media (pointer: coarse)` + `[data-modality]`), motion (`prefers-reduced-motion`), gamut (`@media (color-gamut: p3)`) | `dist/web/<brand>/tokens.css` | `name/kebab` (+ `ds-` prefix), `prism/color/css-gamut`, `dimension/css` (`px`/`rem` object → string), `shadow/css/shorthand`, `typography/css/shorthand`, `cubicBezier/css`, `transition/css/shorthand` | `prism/css-variables-modes` (uses `css/variables` per permutation + diff) |
| `web-tailwind` | brand | same as css (references `--ds-*`) | `dist/web/<brand>/tailwind.theme.css` | none (references) | `prism/tailwind-theme` |
| `web-ts` | brand | all axes as typed maps: `tokens.color.bgAccent[colorScheme]`, `tokens.space[density]` | `dist/web/<brand>/tokens.ts`, `.d.ts` | `name/camel`, `prism/color/css-gamut` | `javascript/esm` (flat) + `typescript/es6-declarations`, or `prism/ts-tokens` |
| `apple-xcassets` | brand, platform ∈ {apple, watch} | colorScheme via `appearances` (luminosity dark, contrast high); reduced transparency handled in code (`accessibilityReduceTransparency`) | `dist/swift/<brand>/Colors.xcassets` | `prism/color/p3` | `prism/swift-xcassets` |
| `apple-swift` | brand, platform ∈ {apple, watch} | density (`DSDensity` table), modality (`DSModality`), motion (`accessibilityReduceMotion`), colour via `Color("…", bundle:)` | `dist/swift/<brand>/Generated/{Color,Space,Size,Radius,Font,Motion,Shadow,Gradient}.swift` | `name/camel`, `prism/color/p3`, `prism/dimension/cgfloat`, `content/swift/literal` | `prism/swift-enums` |
| `tokens-studio` | — (all brands/schemes as sets) | Tokens Studio themes = brand × colorScheme × density | `dist/tokens-studio/**`, `$themes.json`, `$metadata.json` | `prism/color/hex`, `dimension/px-string` | `prism/tokens-studio-flavour` |
| `figma-native` | brand × colorScheme (one JSON per Figma mode) | — | `dist/figma-native/<brand>/<scheme>.json` | `prism/color/hex`, `dimension/px-string`, `name/slash` | `prism/figma-native-flavour` |
| `parity` | — | — | `dist/parity/report.json` | — | custom format that lists every token per platform for the CI parity report |

> **Superseded 2026-09-15.** Attribute names and selectors per ADR-0019 (`data-ds-*`, valid-value fallbacks; no Tailwind `dark` variant, `tools/tokens/ARCHITECTURE.md` §9.4); one `tokens.css` per brand with no brand scope (ADR-0020 §6). Swift carries every brand in one `DSTokens`, with namespaced colorsets and `DSTokenContext.brand`, instead of per-brand artifacts (ADR-0020 §7); reduced transparency carries no token delta (ADR-0022).

Driver pseudo-code:

```ts
const resolver = loadResolver('tokens/prism.resolver.json');
for (const brand of resolver.contexts('brand')) {
  const perms = resolver.permutations({ brand });              // all colorScheme×density×modality×motion×platform
  const defaultPerm = resolver.resolve({ brand });              // defaults filled in
  const outputs = new Map<string, Map<string, string>>();       // platform → (permKey → formatted text)
  for (const p of perms) {
    const sd = new StyleDictionary({ usesDtcg: true, source: resolver.sourcesFor(p), log: { warnings: 'disabled' }, platforms: platformsFor(p) });
    await sd.hasInitialized;
    for (const [name, files] of Object.entries(await sd.formatAllPlatforms())) outputs.get(name)!.set(key(p), files[0].output);
  }
  writeBundles(brand, outputs, defaultPerm);                    // css: base block + diffed override blocks; swift: tables keyed by density/modality
}
```

### 7.4 What to avoid

* Do not encode modes in token *names* (`color-bg-dark`), in `$extensions.mode` (Terrazzo legacy) or in Spectrum-style `sets` — the resolver is the standard, and both Terrazzo and (soon) SD will read it.
* Do not make Tokens Studio or Figma the source of truth; both lose information (units, OKLCH, P3, descriptions on composites). They receive derived flavours.
* Do not rely on SD's `ios-swift` formats or Terrazzo's swift plugin for production Swift output.
* Do not put `brand` and `colorScheme` overrides in the same token IDs (breaks orthogonality; order-dependent output).
* Do not use `expand: true` globally; expand only `typography`, `shadow`, `border`, `transition` per platform where the format needs flat sub-values (5.5.3 fixed nested-composite over-expansion, but global expand cannot be undone per platform).

---

## 8. Facts table (compact index)

| # | Claim | Source | Conf. |
|---|---|---|---|
| F1 | DTCG 2025.10 stable (28 Oct 2025), Final CG Report, modules Format/Color/Resolver | https://www.designtokens.org/tr/2025.10/ | H |
| F2 | Resolver *draft* successor exists, "do not implement" | https://www.designtokens.org/tr/drafts/resolver/ | M |
| F3 | 14 colour spaces incl. `oklch`, `display-p3`; `hex` 6-digit fallback; `none` keyword | https://www.designtokens.org/tr/2025.10/color/ | H |
| F4 | `$deprecated`, `$extends`, `$root`, `$ref` (JSON Pointer) in Format 2025.10; names cannot contain `{ } .` or start with `$` | https://www.designtokens.org/tr/2025.10/format/ | H |
| F5 | Resolver: `version: "2025.10"`, `sets`, `modifiers.contexts/default`, `resolutionOrder`; modifiers cannot reference modifiers | https://www.designtokens.org/tr/2025.10/resolver/ | H |
| F6 | JSON schemas live at designtokens.org/schemas/2025.10/{format,resolver}.json | curl 200 (2026-09-08) | H |
| F7 | `style-dictionary` 5.5.3 (2026-09-06), Apache-2.0, Node ≥ 22 | https://registry.npmjs.org/style-dictionary | H |
| F8 | SD 5.3.0 adds DTCG colour objects + `color/oklch|oklab|p3|lch`; 5.4.0 adds dimension objects | https://github.com/style-dictionary/style-dictionary/releases/tag/v5.3.0 ; CHANGELOG | H |
| F9 | SD resolver support not implemented; duration/gradient WIP; issue #1590 active Aug 2026 | https://github.com/style-dictionary/style-dictionary/issues/1590 | H |
| F10 | SD hooks list + lifecycle; default preprocessors `typeDtcgDelegate`, `expandObjectTokens` | https://styledictionary.com/info/architecture/ ; …/reference/hooks/preprocessors/ | H |
| F11 | SD `expand` semantics and `DTCGTypesMap` | https://styledictionary.com/reference/config/ | H |
| F12 | SD `outputReferences` + `outputReferencesFilter/Transformed` | https://styledictionary.com/reference/utils/references/ | H |
| F13 | SD `ios-swift` group and `ios-swift/*.swift` formats emit sRGB `UIColor`/`Color` floats, `CGFloat`, flat static lets | https://styledictionary.com/reference/hooks/transform-groups/predefined/ ; …/formats/predefined/ ; …/transforms/predefined/ | H |
| F14 | SD multi-brand example = parametric config loop | https://github.com/style-dictionary/style-dictionary/tree/main/examples/advanced/multi-brand-multi-platform | H |
| F15 | No built-in Tailwind format; `tokens-studio/sd-tailwindv4` is an experimental custom format (last push 2025-07-03) | https://github.com/tokens-studio/sd-tailwindv4 | H |
| F16 | Tailwind v4 namespaces, `@theme inline/static`, `@custom-variant dark`, OKLCH palette | https://tailwindcss.com/docs/theme ; …/dark-mode ; …/colors | H |
| F17 | `@terrazzo/cli` 2.7.1 (2026-08-11) MIT; plugin-css/tailwind/js 2.7.1; plugin-swift 0.3.3 experimental | npm registry; https://terrazzo.app/docs/integrations/swift/ | H |
| F18 | Terrazzo 2.0 = full DTCG 2025.10 incl. resolvers; strict object values | https://github.com/terrazzoapp/terrazzo/blob/main/packages/cli/CHANGELOG.md | H |
| F19 | Terrazzo resolver guide: permutations, orthogonality, one modifier per `$type` | https://terrazzo.app/docs/guides/resolvers/ | H |
| F20 | Terrazzo CSS: `permutations`, `@media (color-gamut: p3)` fallbacks via Color.js, `colorDepth`, `legacyHex` | https://terrazzo.app/docs/integrations/css/ | H |
| F21 | Terrazzo Tailwind plugin: `@theme` from template, `@tz` at-rule, typography paired vars | https://terrazzo.app/docs/integrations/tailwind/ | H |
| F22 | Terrazzo swift plugin: colour-only `.xcassets`, display-p3, dark appearance from legacy modes | https://github.com/terrazzoapp/terrazzo/blob/main/packages/plugin-swift/src/index.ts | H |
| F23 | Terrazzo GitHub: 456 stars, 788 commits, 30 issues, single main maintainer | https://github.com/terrazzoapp/terrazzo | M |
| F24 | Tokens Studio DTCG format = `$value/$type/$description` strings; default legacy; more types "in future releases" | https://docs.tokens.studio/manage-settings/token-format | H |
| F25 | Tokens Studio: no 2025.10 object support documented (0 hits for "2025.10" in docs repo); colour-object proposal in "Discussion" | GitHub code search; https://feedback.tokens.studio/p/dtcg-format-update-on-color-tokens-and-support-for-color | M-H |
| F26 | Tokens Studio Themes → multi-mode variables require paid ("pro") licence; free = sets → single-mode collections | https://github.com/tokens-studio/tokens-studio-for-figma-plugin-docs/blob/main/figma/export/variables.md | H |
| F27 | Tokens Studio Starter Plus €49/mo (monthly), features list | https://tokens.studio/pro-pricing ; https://tokens.studio/starter-plus | M |
| F28 | Figma native import/export of DTCG JSON per mode; sRGB/HSL + px only; `/` name normalisation; `com.figma.*` extensions | https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables | H |
| F29 | Extended collections Enterprise-only | https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection | H |
| F30 | Figma modes/collection: Pro 10, Org 20, Enterprise unlimited via extended collections | https://www.figma.com/pricing/ | M |
| F31 | Figma Variables REST API (GET+POST) "available to full members of Enterprise orgs"; scopes; limits | https://developers.figma.com/docs/rest-api/variables-endpoints/ | H |
| F32 | Figma Plugin API can create collections/variables/modes; no plan gating documented | https://developers.figma.com/docs/plugins/working-with-variables/ | M |
| F33 | Material tiers `md.ref/md.sys/md.comp`; sys colour → different palette tone per scheme | https://github.com/material-foundation/material-tokens/blob/main/tokens.md ; https://material-web.dev/theming/material-theming/ | H |
| F34 | Spectrum flat kebab names, `sets` light/dark/wireframe and desktop/mobile, `$schema` per type, uuid, semver rules | https://github.com/adobe/spectrum-design-data/tree/main/packages/tokens | H |
| F35 | Polaris `--p-color-{property}-{role}-{variant}-{state}`; React repo archived/deprecated 2026-08-11 | https://github.com/Shopify/polaris/blob/main/polaris-tokens/src/themes/base/color.ts ; GitHub API | H |
| F36 | Atlassian `foundation.property.modifier`, `--ds-` CSS, `data-color-mode` | https://developer.atlassian.com/platform/forge/design-tokens-and-theming/ ; https://atlassian.design/foundations/tokens/design-tokens | H |
| F37 | Primer name blocks, property vocabulary, 9 themes, `$extensions org.primer.{overrides,figma,llm}`, AI-oriented token guide | https://primer.style/product/primitives/token-names/ ; https://github.com/primer/primitives | H |
| F38 | SwiftUI `Color(.displayP3, red:green:blue:opacity:)` iOS 13+/watchOS 6+; `UIColor(displayP3Red:…)` iOS 10+/watchOS 3+ | Apple docs (see §6) | H |
| F39 | Asset catalog colour set schema (`display-gamut`, `color-space: display-p3`, 0–1 components) | https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Named_Color.html | H |
| F40 | Color.js `toGamut` default `"css"` = CSS Color 4 algorithm; SD depends on colorjs.io ^0.5.2 | https://colorjs.io/docs/gamut-mapping ; SD package.json | H |

---

## 9. Open questions

1. **When will Style Dictionary ship native resolver support?** Design agreed in #1590 (Aug 2026): `resolver` config as alternative to `source`, per-permutation `destination` templating, actions run once with access to all outputs. No milestone. Prism's driver must be designed to be deleted.
2. **SD `duration` object and gradient-with-colour-object support** are still 🚧 (PR #1500 open since Apr 2025). Until merged, Prism needs a small custom `duration/css` and `duration/swift` transform and must verify `gradient` tokens with OKLCH stops render.
3. **`@tokens-studio/sd-transforms` 2.0.3 vs SD 5.5.x** compatibility is undocumented; only relevant if Prism ever imports Tokens-Studio-flavoured JSON.
4. **Tokens Studio 2025.10 timeline** (colour objects, `{value, unit}` dimensions). If it lands, the "tokens-studio flavour" export can be retired.
5. **Does the Tokens Studio free plan include Themes?** The docs and starter-plus page say paid; the pro-pricing page fetch listed Themes under both columns. Needs a look at the live plugin.
6. **Figma native JSON import availability by plan** (Starter?) and whether import preserves aliases across files — the help article describes value updates, not alias links.
7. **Figma REST Variables API on Organization plan**: pricing page vs developer docs disagree. Re-verify before planning any REST sync; the Plugin-API route is the safe fallback.
8. **Asset catalog `appearances`/`contrast` keys** are not in the archived format reference; verify by creating a colour set with High Contrast in Xcode 26 and reading its `Contents.json` (expect `{"appearance":"contrast","value":"high"}`).
9. **watchOS colour sets**: watchOS has no light appearance and no blur; decide whether to ship a separate `Colors-watch.xcassets` or reuse the dark appearance values (the `watch` platform context in the resolver covers it either way).
10. **Terrazzo swift plugin + resolvers**: it keys dark variants off legacy `token.mode`; unclear whether resolver `colorScheme` contexts feed it. Irrelevant if Prism writes its own Swift format, but worth an issue upstream.
11. **Platform as resolver modifier vs SD platform**: the sketch treats `platform` as a modifier owning only font-family/blur tokens; if more tokens diverge per platform it may be cleaner to move them into SD platform-level `include` overrides. Decide after the first component spec.
12. **Increase Contrast / Reduce Transparency** are modelled as flattened `colorScheme` contexts (6 contexts). If Bold Text or Dynamic Type also need token-level overrides, they belong to a separate `typography`-typed modifier to keep orthogonality.
