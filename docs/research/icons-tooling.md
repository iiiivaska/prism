# Prism research: icon strategy and chart tooling facts

Verified on 2026-09-08. Where a fact was checked against a live package registry, a raw source file, or the local macOS 26.5.1 / Xcode 26.6 machine, the method is stated. Confidence is High when read from an official source or a downloaded artifact, Medium when taken from a reputable secondary source or a page summary, Low when inferred.

Sections: 1 Phosphor · 2 SF Symbols · 3 Comparison of open/paid sets · 4 Semantic registry and CI validation · 5 Chart tooling · 6 Facts table · 7 Recommendations for Prism · 8 Recommended registry file format · 9 Open questions

---

## 1. Phosphor Icons

### 1.1 Weights, count, grid

- Six weights: **Thin, Light, Regular, Bold, Fill, Duotone**. The catalog package encodes them as `IconStyle { REGULAR, THIN, LIGHT, BOLD, FILL, DUOTONE }` (`@phosphor-icons/core` `dist/types.d.ts`). Source: https://github.com/phosphor-icons/homepage (README "6 weights") and the downloaded package `@phosphor-icons/core@2.1.1`. High.
- Icon count: **1,512 unique icons per weight** (counted `assets/<weight>/*.svg` in `@phosphor-icons/core@2.1.1`; every weight folder has exactly 1,512 files, 9,072 SVGs total). The React README's "9,000+ modules" figure matches 1,512 x 6. The homepage README's "1,248 icons and counting" is stale. Sources: https://www.npmjs.com/package/@phosphor-icons/core (npm pack), https://github.com/phosphor-icons/react. High.
- Design grid: "Designed at 16 x 16px to read well small and scale up big", "Raw stroke information retained to fine-tune the style" (homepage README). The shipped SVGs use `viewBox="0 0 256 256"` and `fill="currentColor"`: every weight, including Thin/Light/Regular/Bold, is **outlined path geometry, not SVG strokes**, so `stroke-width` cannot be changed at runtime; weight is chosen by loading a different asset. Duotone SVGs contain a second `<path ... opacity="0.2">` layer plus the regular outline. Source: raw SVGs in https://github.com/phosphor-icons/core/tree/main/assets. High.
- Stroke width per weight (derived by measuring outer minus inner arc radius of the `circle` icon in each weight file; not documented by Phosphor):

| Phosphor weight | Stroke in 256-unit viewBox | At 16 px | At 24 px | Notes |
|---|---|---|---|---|
| thin | 8 | 0.50 px | 0.75 px | `circle-thin.svg` radii 100/92 |
| light | 12 | 0.75 px | 1.125 px | `circle-light.svg` radii 102/90 |
| regular | 16 | 1.00 px | 1.50 px | `circle.svg` radii 104/88 |
| bold | 24 | 1.50 px | 2.25 px | `circle-bold.svg` radii 108/84 |
| duotone | 16 (+20% fill layer) | 1.00 px | 1.50 px | same outline as regular |
| fill | n/a (solid) | | | |

Confidence Medium-High (measured on one icon; other icons may deviate slightly, but the family is systematic).

### 1.2 Packages and versions (npm registry queried 2026-09-08 with `npm view`)

| Package | Version | Published | License | Notes |
|---|---|---|---|---|
| `@phosphor-icons/core` | 2.1.1 | 2024-03-29 | MIT | SVG assets + catalog (`icons` array of `IconEntry`) |
| `@phosphor-icons/react` | 2.1.10 | 2025-05-22 | MIT | peer `react >= 16.8`; `sideEffects: false` |
| `@phosphor-icons/web` | 2.1.2 | 2025-03-31 | MIT | icon font / CSS classes for vanilla JS |
| `@phosphor-icons/webcomponents` | 2.1.5 | 2024-06-29 | MIT | `<ph-*>` custom elements |
| `@phosphor-icons/vue`, `/flutter`, `/elm`, `/unplugin` (sprite bundler plugin), `/pack` (font stripper), `/figma`, `/sketch`, `/penpot` | — | — | MIT | listed as official in README |
| `phosphor-icons/swift` (SPM, not npm) | tag 2.1.0 | — | MIT | see 1.4 |

Sources: npm registry; https://github.com/phosphor-icons/swift (README "Our Projects" list). High.

### 1.3 React API facts

- Components are exported with an `Icon` suffix: `import { HorseIcon, HeartIcon, CubeIcon } from "@phosphor-icons/react"`.
- Props: `color?: string`, `size?: number | string`, `weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone"`, `mirrored?: boolean`, `alt?: string`; all SVG props pass through.
- `IconContext.Provider` sets defaults for all descendants; SSR/RSC variant `@phosphor-icons/react/ssr` does not use Context.
- Per-icon deep import for compile speed: `import { BellSimpleIcon } from "@phosphor-icons/react/dist/csr/BellSimple"`; Next.js `experimental.optimizePackageImports: ["@phosphor-icons/react"]`.
- Custom icons: `IconBase` plus `Icon` and `IconWeight` types; a `Map<IconWeight, ReactElement>` of SVG contents.
Source: https://github.com/phosphor-icons/react README. High.

### 1.4 Swift / SwiftUI package (official)

- Repo: https://github.com/phosphor-icons/swift. `Package.swift`: `swift-tools-version: 5.9`, product `PhosphorSwift`, **platforms `.macOS(.v10_15), .iOS(.v13), .tvOS(.v13)` — watchOS and visionOS are not declared** (they still compile if the consuming package does not require a declared platform, but the package does not test or claim them). Latest tag `2.1.0`. High.
- Implementation (read from `Sources/PhosphorSwift/PhosphorSwift.swift` and `Icons.swift`, generated file): `public enum Ph: String, CaseIterable, Identifiable` with **1,512 cases** (`case heart = "heart"`), nested `Ph.IconWeight { regular, thin, light, bold, fill, duotone }`, computed vars `Ph.heart.regular` etc., and `func weight(_:) -> Image`. Every icon is loaded as `Image(name, bundle: .module).interpolation(.medium).resizable()`. High.
- Assets: `Sources/PhosphorSwift/Resources/Assets.xcassets/SVG/<name>[-weight].imageset/Contents.json` = `{"images":[{"idiom":"universal","filename":"acorn.svg"}],"properties":{"template-rendering-intent":"template"}}`. So the official package already proves the "SVG in an Xcode asset catalog as a template image" approach; it does **not** set `preserves-vector-representation`. High.
- Tinting: the package's `.color(_:)` modifier is a `blendMode(.sourceAtop)` + `drawingGroup` hack, not `foregroundStyle`; because the assets are template images, plain `.foregroundStyle(...)` on the `Image` also works. Medium (inferred from template intent; not run).
- Community Xcode asset catalog generators: `cellularmitosis/phosphor-uikit`, `pepaslabs/phosphor-uikit` (listed in the official README). High.

### 1.5 Can Phosphor SVGs be bundled in an Xcode asset catalog as template images?

Yes, verified by three independent facts:
1. Xcode 12 release notes: "Added support for Scalable Vector Graphic (SVG) image assets. These preserve their vector representation with deployment targets of macOS 10.15 or later, iOS 13 or later, and iPadOS 13 or later." https://developer.apple.com/documentation/xcode-release-notes/xcode-12-release-notes. High.
2. Asset Catalog Format Reference, image set `Contents.json`: `template-rendering-intent` = `original` | `template` ("Use the image as a template for visual effects such as replacing colors"; if the key is absent and the name ends in "Template" it is treated as a template); `properties.preserves-vector-representation` Boolean ("Set to true to preserve the vector information"). https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/ImageSetType.html. High.
3. The official Phosphor Swift package ships exactly this structure (1.4). High.
Also relevant: SwiftUI `Image.renderingMode(_:)` (iOS 13+) and `Image(decorative:bundle:)` (iOS 13+) for a11y-neutral icons. https://developer.apple.com/documentation/swiftui/image. High.

Caveat: Phosphor's outlined paths make each icon a plain template bitmap/vector at runtime; they do not get SF Symbols features (weight matching to text, scales, rendering modes, symbol effects). Converting Phosphor into custom SF Symbol templates is possible in principle (Apple treats a symbol as "path-based" when all shapes have solid fills and no strokes), but Open Symbols (section 4) has not done it for Phosphor.

---

## 2. SF Symbols (state on 2026-09-08)

### 2.1 Versions and counts

- developer.apple.com/sf-symbols offers **"Download SF Symbols 8 beta"** and **"SF Symbols 7"**; page copy: "a library of over 7,000 symbols ... nine weights and three scales"; app "Requires macOS Sonoma or later". High (fetched raw HTML).
- SF Symbols 8 beta shipped with WWDC26 (June 2026) alongside Icon Composer 2; adds symbols for iOS 27 / iPadOS 27 / macOS 27 "Golden Gate" / watchOS 27 / tvOS 27 / visionOS 27. https://9to5mac.com/2026/06/12/icon-composer-2-and-sf-symbols-8-now-available-as-betas/. Medium.
- AAPL Ch. reports SF Symbols 8 beta = **7,151 symbols (147 new)**, improved search, and that the actual minimum is macOS 15 Sequoia despite the page saying Sonoma. https://applech2.com/archives/20260618-sf-symbols-8-beta.html. Medium.
- SF Symbols 7 (WWDC25): "over 6,900 symbols", beta required macOS Ventura or later. https://9to5mac.com/2025/06/11/apple-releases-sf-symbols-7-beta/. Medium.
- WWDC26 had no dedicated SF Symbols session; the design guide lists only "Communicate your brand identity on iOS" (session 251) for Icon Composer. https://developer.apple.com/wwdc26/guides/design/. Medium.
- The `name_availability.plist` on this Mac (macOS 26.5.1) lists **9,184 names** (includes legacy/alias names, hence larger than the app's catalog) and `year_to_release` up to `2025.1 -> iOS 26.1 / macOS 26.1 / watchOS 26.1 / visionOS 26.1`. Path: `/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources/name_availability.plist`. High (local).

### 2.2 Weights, scales, rendering modes (verified against Apple doc JSON)

- Weights (9): `Font.Weight` `ultraLight, thin, light, regular, medium, semibold, bold, heavy, black`. HIG: "Each of the nine symbol weights — from ultralight to black — corresponds to a weight of the San Francisco system font". https://developer.apple.com/documentation/swiftui/font/weight, https://developer.apple.com/design/human-interface-guidelines/sf-symbols. High.
- Scales (3): `Image.Scale` `small, medium, large`; HIG: "three scales: small, medium (the default), and large ... defined relative to the cap height of the San Francisco system font". https://developer.apple.com/documentation/swiftui/image/scale. High.
- Rendering modes (4): `SymbolRenderingMode` `monochrome, hierarchical, palette, multicolor` (iOS 15+). https://developer.apple.com/documentation/swiftui/symbolrenderingmode. High.
- Color rendering (new in OS 26): `SymbolColorRenderingMode` `flat | gradient`, applied with `.symbolColorRenderingMode(.gradient)`; "available across all rendering modes" and for custom symbols. https://developer.apple.com/documentation/swiftui/symbolcolorrenderingmode. High.
- Variable value: `SymbolVariableValueMode` `color | draw`, via `.symbolVariableValueMode(.draw)` (OS 26+). Only one of the two can be active at runtime. https://developer.apple.com/documentation/swiftui/symbolvariablevaluemode, https://wwdcnotes.com/documentation/wwdc25-337-whats-new-in-sf-symbols-7/. High.
- Variants: `.symbolVariant(_:)` with `SymbolVariants` `none, circle, square, rectangle, fill, slash` (iOS 15+) — lets code request `heart` + `.fill` without hard-coding `heart.fill`. https://developer.apple.com/documentation/swiftui/symbolvariants. High.

### 2.3 Animations (Symbols framework)

`SymbolEffect` (iOS 17+/macOS 14+/watchOS 10+): `appear, disappear, bounce, pulse, scale, variableColor, replace, wiggle, rotate, breathe, drawOn, drawOff, automatic`. `DrawOnSymbolEffect` and `DrawOffSymbolEffect` are **OS 26.0+** on every platform (iOS, iPadOS, macOS, tvOS, visionOS, watchOS); playback options `wholeSymbol`, `byLayer`, `individually`; DrawOff also `reversed` / `nonReversed`. Applied with `.symbolEffect(_:options:isActive:)` (iOS 17+). Magic Replace (`.replace`) in SF Symbols 7 "now recognizes matching enclosures" and can be combined with draw. Sources: https://developer.apple.com/documentation/symbols/symboleffect, https://developer.apple.com/documentation/symbols/drawonsymboleffect, https://developer.apple.com/documentation/symbols/drawoffsymboleffect, WWDC25 session 337 notes. High.

### 2.4 Custom symbol authoring (Apple: "Creating custom symbol images for your app")

- Flow: export a template SVG from the SF Symbols app (File > Duplicate as Custom Symbol, File > Export Template) → edit in a vector app → export SVG with >= 7 decimal precision → validate (File > Validate Templates, or drop into an Xcode asset catalog) → import back and annotate → File > Export Symbol → add to Xcode as **Editor > Add New Asset > Symbol Image Set**.
- Template kinds: static (27 variants = 9 weights x 3 scales) or variable (3 sources `Ultralight-S`, `Regular-S`, `Black-S`; the system interpolates the other 24, provided all three are path-based and have the same number of paths and control points). Scale factors S 0.783, M 1.0, L 1.29.
- Path-based rule: "SF Symbols treats a symbol as path-based ... if all the shapes within it have solid color fills, and don't have strokes". Convert strokes to paths; use flat fills; keep the same path count across variants for annotations.
- Template versions: v2 monochrome only (iOS 14), v3 adds multicolor/hierarchical + margins (iOS 15+), v4 adds variable color (iOS 16+). Draw annotations (SF Symbols 7 app) need "at least 2 guide points" (start hollow dot, end filled dot) per layer.
Source: https://developer.apple.com/documentation/uikit/creating-custom-symbol-images-for-your-app; WWDC25 337 notes. High.

### 2.5 License terms — where SF Symbols may and may not be used

- Xcode and Apple SDKs Agreement §2.10 "System-Provided Images" (read directly from https://www.apple.com/legal/sla/docs/xcode.pdf): system-provided assets "(e.g., images, symbols) owned by Apple and documented as such in Apple's Human Interface Guidelines for iOS, watchOS, iPadOS, tvOS, macOS, or visionOS ... are licensed to You **solely for the purpose of developing Applications for Apple-branded products that run on the system for which the image was provided**. You agree that you shall not use or incorporate the System-Provided Images or any substantially or confusingly similar images into app icons, logos or make any other trademark use". High.
- SF Symbols app license (quoted in an Apple Developer Forums thread, with an Apple engineer replying): "THE APPLE SOFTWARE IS TO BE USED SOLELY FOR CREATING USER INTERFACES TO BE USED IN SOFTWARE PRODUCTS RUNNING ON APPLE'S iOS, iPadOS, macOS, tvOS OR watchOS OPERATING SYSTEMS" (visionOS was missing from that sentence at the time; Apple said it would clarify). https://developer.apple.com/forums/thread/739523. Medium-High.
- HIG: "the prohibition against using symbols — or images that are confusingly similar — in app icons, logos, or any other trademarked use". https://developer.apple.com/design/human-interface-guidelines/sf-symbols. High.
- developer.apple.com/sf-symbols footer (JS-rendered; text confirmed via search snippet): "All SF Symbols shall be considered to be system-provided images as defined in the Xcode and Apple SDKs license agreements and are subject to the terms and conditions set forth therein." Medium.
- Practical conclusion: SF Symbols are confined to apps running on Apple OSes. **They may not ship in the React/Tailwind web build, in Android, or in Figma assets that are exported into non-Apple products.** Using them in Figma mockups of Apple apps is the intended design-tool use (the SF Symbols app exports SVG for that); exporting the glyphs into a cross-platform icon package would violate §2.10. High (direct reading of the agreement).

---

## 3. Comparison: Lucide, Tabler, Heroicons, Hugeicons, Iconly vs Phosphor

Versions from `npm view` on 2026-09-08; counts from downloaded packages.

| Set | Version (date) | License | Icons | Grid / stroke | Weights / styles | Runtime stroke control | Official Swift pkg | Figma |
|---|---|---|---|---|---|---|---|---|
| **Phosphor** | core 2.1.1 (2024-03), react 2.1.10 (2025-05) | MIT | 1,512 x 6 | 16 px design grid, 256 viewBox; thin 0.5 / light 0.75 / regular 1 / bold 1.5 px @16 | 6: thin, light, regular, bold, fill, duotone | No (outlined paths); pick weight asset | **Yes** (`phosphor-icons/swift`, SwiftUI, asset-catalog SVG templates) | Official plugin |
| Lucide | 1.43.0 (2026-09-08) | ISC | 1,818 canonical (`icon-nodes.json`), 2,077 SVG files incl. aliases | 24 px, stroke 2, round caps/joins | Single weight | Yes: `strokeWidth` (default 2), `nonScalingStroke` (replaces deprecated `absoluteStrokeWidth`) | No (community only; Open Symbols converts to SF templates) | Plugin |
| Tabler | 3.46.0 (2026-07/08) | MIT | 6,184 (5,130 outline + 1,054 filled) | 24 px, stroke 2 | Outline + Filled | Yes (`stroke-width` attribute) | No | Yes |
| Heroicons | 2.2.0 (2024-11-18) | MIT | 316 | Outline 24 px @ 1.5 stroke; Solid 24; Mini 20 solid; Micro 16 solid | 4 size/style variants | Outline only | No (Open Symbols converts) | Yes |
| Hugeicons | core-free-icons 4.3.2 (2026-09-07), react 1.1.10 | Free: MIT; Pro: proprietary | Free 6,025 (Stroke Rounded only); Pro "60,000+" in 10 styles | 24 px | Free: 1 style; Pro: Stroke/Solid/Bulk/Duotone/Twotone x rounded/sharp/standard | Yes (`strokeWidth` prop) | No | Plugin |
| Iconly Pro | no npm package | Proprietary (subscriptions non-commercial; Lifetime $189 commercial; Extended for resale) | Free 2,500+; Pro 40,000+ | 24 px | 6 styles (Light, Outline, Bold, Two-tone, Duotone, Bulk) | SVG/JSX export only | No | Plugin |

Sources: https://github.com/lucide-icons/lucide, https://lucide.dev/guide/react/basics/stroke-width, lucide-react `src/types.ts` (`absoluteStrokeWidth` marked `@deprecated Use nonScalingStroke`), https://github.com/tabler/tabler-icons, https://tabler.io/icons, https://heroicons.com, https://github.com/tailwindlabs/heroicons, https://github.com/hugeicons/hugeicons, https://hugeicons.com/license-agreement, https://iconly.pro/pricing, https://iconly.pro/pages/licensing-guide, https://iconly.pro/pages/terms.

Licensing details that matter for a published design system:
- Hugeicons Pro: "You cannot share, sell or redistribute Hugeicons Pro source files ... SVG icons or files, Icon fonts, Figma source files"; internal design systems allowed "as long as only licensed users maintain or modify the icon files". Publishing Pro SVGs inside an npm/SPM package on GitHub Packages is therefore not allowed. High.
- Iconly: "Direct reselling or redistribution of Iconly assets is not allowed. This includes ... Embedding the icons in templates or themes"; personal/team subscriptions are "Non-commercial use only"; max 300 icons may be handed to a client; "Extended Commercial License is required" if assets are included in a purchasable product. High (their licensing guide).
- Lucide ISC and Tabler/Heroicons/Phosphor MIT all permit redistribution in a public package with the notice retained. High.

Why Phosphor is the right web/default set for Prism: it is the only MIT set with a **weight axis** (four true stroke weights plus fill and duotone) that maps onto SF Symbols' weight axis and hierarchical/fill variants; it ships an official SwiftUI package and Figma plugin; its 16 px design grid suits dense dashboards; and its catalog exports machine-readable metadata (`name`, `pascal_name`, `alias`, `categories`, `tags`, `codepoint`, `published_in`, `updated_in`). Its weaknesses: the core package has not been updated since 2024-03 (React 2025-05), the Swift package declares no watchOS/visionOS platforms, and weights are baked into geometry (no runtime `strokeWidth`).

---

## 4. Semantic registry: mapping name -> SF Symbol / Phosphor and validating in CI

### 4.1 Existing tools (none cover Phosphor <-> SF Symbols)

| Tool | What it does | Relevance |
|---|---|---|
| `roninoss/icons` (React Native) | 573 icons mapped 1:1 Material <-> SF Symbols; `namingScheme="sfSymbol"` prop switches which name space you address. MIT. https://github.com/roninoss/icons | Pattern: a lookup table keyed by one canonical name, per-platform name resolved at render. |
| `expo-symbols` `SymbolView` | `name` accepts `{ ios: 'info.circle', android: 'info', web: 'info' }`; `fallback` component; weight enum = the 9 SF weights; scale `small/medium/large`. https://docs.expo.dev/versions/latest/sdk/symbols/ | Pattern: per-platform names + explicit fallback. |
| Open Symbols (OrchardKit/buzap) | Lucide, Tabler, Heroicons, Feather, Font Awesome, MDI, Remix converted into SF custom symbol templates via "SymbolKit"; Phosphor not included; symbol sets keep the original licenses. https://github.com/buzap/open-symbols, https://opensymbols.dev | Shows Lucide-style strokes can become real SF custom symbols; a possible path for a "Signature" custom-symbol variant of Phosphor. |
| SFSafeSymbols 7.0.0 | Type-safe Swift enum of all SF Symbols with `@available` per OS; supports SF Symbols 7 / OS 26; MIT; CI-tested on real OS versions. https://github.com/SFSafeSymbols/SFSafeSymbols | Reference for generating an availability-aware Swift enum. |
| SymbolIconManager (robloo) | Microsoft Segoe/Fluent font remapping only | Not applicable. |

### 4.2 Validation primitives verified

1. Phosphor names: `import { icons } from "@phosphor-icons/core"` gives `IconEntry[]` with `name` (kebab), `pascal_name`, optional `alias`, `published_in`. Validate registry names against this array; fail on unknown names or on aliases (prefer canonical). High.
2. SF Symbol names and OS availability: parse `/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources/name_availability.plist` on a macOS runner (`symbols: {name: yearKey}`, `year_to_release: {yearKey: {iOS, macOS, tvOS, visionOS, watchOS}}`). Verified locally: `heart.fill -> 2019`, `apple.intelligence -> 2024`, `2025 -> iOS 26.0 ... watchOS 26.0`. Reject names absent from the plist; reject names whose year maps above the Prism minimum (OS 26 => year <= 2025.x). High.
3. Runtime smoke test: `NSImage(systemSymbolName:accessibilityDescription:)` returns nil for unknown names (verified with Xcode 26.6: `heart.fill true`, `not.a.real.symbol.name false`); `UIImage(systemName:)` behaves the same on iOS simulators. Use as the final gate in an XCTest/Swift Testing target. High.
4. Xcode asset catalog validation: adding a custom symbol SVG to an asset catalog makes Xcode validate it ("Xcode verifies the SVG file and displays error messages if it doesn't conform"). High.
5. Web parity: generated TS map must type-check against `keyof typeof icons` from `@phosphor-icons/react` (or the core catalog), so an invalid Phosphor name fails `tsc`. High.

---

## 5. Chart tooling facts

### 5.1 visx

- Current stable **v4.0.0**, released 2026-06-11 (all `@visx/*` packages are version-locked at 4.0.0). "Require React 18 or 19"; "Upgrade d3-shape, d3-path to 3"; removed `prop-types` and lodash; Jest -> Vitest; "Fix: Node ESM compatibility for published esm/ output"; Node 18 / TypeScript 5 toolchain. https://github.com/airbnb/visx/releases/tag/v4.0.0, `packages/visx-shape/package.json` (`react: ^18.0.0 || ^19.0.0`). High.
- Published packages (npm, 4.0.0): `@visx/annotation, axis, bounds, brush, chord, clip-path, curve, delaunay, drag, event, geo, glyph, gradient, grid, group, heatmap, hierarchy, legend, marker, mock-data, network, pattern, point, react-spring, responsive, sankey, scale, shape, stats, text, threshold, tooltip, vendor, visx, voronoi, wordcloud, xychart, zoom`. High (repo `packages/` listing + npm).
- Present in the master branch but **not on npm as of 2026-09-08** (npm 404): `@visx/chart` ("chart-level hooks"), `@visx/theme`, `@visx/a11y`, `@visx/kernel` ("shared hook primitives"), `@visx/registry` (private; a shadcn-style component registry, `registry.json` with `$schema: https://ui.shadcn.com/schema/registry.json`). Treat as upcoming. High.
- `@visx/vendor` pins `d3-shape 3.2.0` and `d3-path 3.1.0`; `@visx/curve` re-exports exactly: `curveBasis, curveBasisClosed, curveBasisOpen, curveStep, curveStepAfter, curveStepBefore, curveBundle, curveLinear, curveLinearClosed, curveCardinal, curveCardinalClosed, curveCardinalOpen, curveCatmullRom, curveCatmullRomClosed, curveCatmullRomOpen, curveMonotoneX, curveMonotoneY, curveNatural` (18; no `curveBumpX/Y`). High.

### 5.2 d3-shape curves (d3-shape 3.2.0, ISC; docs https://d3js.org/d3-shape/curve)

| Curve | Behavior | Parameter |
|---|---|---|
| `curveLinear` / `curveLinearClosed` | polyline | — |
| `curveMonotoneX` | "cubic spline that preserves monotonicity in y, assuming monotonicity in x" (Steffen); no overshoot, extrema only at data points | — |
| `curveMonotoneY` | same, axes swapped | — |
| `curveCatmullRom` (+Closed/Open) | "cubic Catmull–Rom spline ... parameter alpha, which defaults to 0.5" (centripetal; Yuksel et al.) | `.alpha(a)` in [0,1] |
| `curveCardinal` (+Closed/Open) | cardinal spline, one-sided differences at ends | `.tension(t)` in [0,1], default 0 |
| `curveNatural` | natural cubic spline, second derivative 0 at ends | — |
| `curveBasis` (+Closed/Open) | cubic B-spline (does not pass through points) | — |
| `curveBundle` | straightened B-spline | `.beta(b)`, default 0.85 |
| `curveBumpX` / `curveBumpY` | Bézier with horizontal/vertical tangents | — |
| `curveStep` / `curveStepBefore` / `curveStepAfter` | piecewise constant; change at midpoint / before / after | — |

High.

### 5.3 Swift Charts `InterpolationMethod` (iOS 16+, macOS 13+, watchOS 9+, visionOS 1+)

`linear`, `monotone` ("cubic spline that preserves monotonicity"), `catmullRom`, `catmullRom(alpha:)`, `cardinal`, `cardinal(tension:)`, `stepStart`, `stepCenter`, `stepEnd`. https://developer.apple.com/documentation/charts/interpolationmethod. High.

Cross-platform equivalence for the Prism chart spec:

| Prism token | Swift Charts | d3-shape / visx |
|---|---|---|
| `curve.linear` | `.linear` | `curveLinear` |
| `curve.monotone` (default for sparklines: no overshoot) | `.monotone` | `curveMonotoneX` |
| `curve.smooth` (rounder, allows slight overshoot) | `.catmullRom(alpha: 0.5)` | `curveCatmullRom.alpha(0.5)` |
| `curve.cardinal(t)` | `.cardinal(tension: t)` | `curveCardinal.tension(t)` |
| `curve.stepStart/Center/End` | `.stepStart/.stepCenter/.stepEnd` | `curveStepBefore` / `curveStep` / `curveStepAfter` |

Note: `curveNatural`, `curveBasis`, `curveBump*` have no Swift Charts counterpart; exclude them from the shared spec. Both libraries implement Catmull-Rom with an alpha parameter (d3 default 0.5; Apple does not document its default for the parameterless `.catmullRom`), so pass alpha explicitly on both sides.

---

## 6. Facts table

| # | Fact | Source | Confidence |
|---|---|---|---|
| 1 | Phosphor has 6 weights: thin, light, regular, bold, fill, duotone | https://github.com/phosphor-icons/homepage ; core `types.d.ts` | High |
| 2 | Phosphor core 2.1.1 ships 1,512 icons per weight (9,072 SVGs) | npm pack of `@phosphor-icons/core@2.1.1` | High |
| 3 | Phosphor SVGs: viewBox 0 0 256 256, `fill="currentColor"`, outlined paths (no stroke attrs); duotone adds `opacity="0.2"` layer | raw assets in https://github.com/phosphor-icons/core | High |
| 4 | Phosphor stroke: thin 8, light 12, regular 16, bold 24 units of 256 (0.5/0.75/1/1.5 px @16) | measured on `circle` icons | Medium-High |
| 5 | `@phosphor-icons/react` 2.1.10 (2025-05-22), MIT, peer react >=16.8; `Icon`-suffixed exports; props color/size/weight/mirrored/alt; `IconContext`; `/ssr` entry | npm registry; https://github.com/phosphor-icons/react | High |
| 6 | `@phosphor-icons/core` 2.1.1 (2024-03-29), `/web` 2.1.2, `/webcomponents` 2.1.5, all MIT | npm registry | High |
| 7 | Official Swift package: SwiftUI `Ph` enum (1,512 cases), `Ph.IconWeight`, SVG template imagesets in `Assets.xcassets/SVG`, platforms iOS 13 / macOS 10.15 / tvOS 13 only, tag 2.1.0, MIT | https://github.com/phosphor-icons/swift (Package.swift, Sources) | High |
| 8 | Xcode asset catalogs accept SVG image assets (Xcode 12+), vector preserved for iOS 13+/macOS 10.15+ | https://developer.apple.com/documentation/xcode-release-notes/xcode-12-release-notes | High |
| 9 | `Contents.json` keys `template-rendering-intent: original|template`, `preserves-vector-representation: Bool` | Asset Catalog Format Reference (ImageSetType) | High |
| 10 | SF Symbols 8 beta available; page says "over 7,000 symbols", "nine weights and three scales", macOS Sonoma+ | https://developer.apple.com/sf-symbols/ | High |
| 11 | SF Symbols 8 beta = 7,151 symbols, 147 new, improved search; real min macOS 15 | https://applech2.com/archives/20260618-sf-symbols-8-beta.html | Medium |
| 12 | SF Symbols 7 = "over 6,900 symbols" | https://9to5mac.com/2025/06/11/apple-releases-sf-symbols-7-beta/ | Medium |
| 13 | 9 weights = `Font.Weight` ultraLight…black; 3 scales = `Image.Scale` small/medium/large | Apple SwiftUI docs | High |
| 14 | 4 rendering modes monochrome/hierarchical/palette/multicolor; + `SymbolColorRenderingMode.flat/gradient` (OS 26) | Apple SwiftUI docs | High |
| 15 | `SymbolVariableValueMode.color/draw`, `.symbolVariableValueMode(.draw)` (OS 26) | Apple SwiftUI docs | High |
| 16 | `SymbolEffect.drawOn/.drawOff` (OS 26; wholeSymbol/byLayer/individually; drawOff reversed/nonReversed) | https://developer.apple.com/documentation/symbols/drawonsymboleffect | High |
| 17 | Custom symbols: SF Symbols app template export/validate/annotate; variable template = Ultralight-S/Regular-S/Black-S; scale factors 0.783/1.0/1.29; template v3 iOS 15+, v4 iOS 16+; Xcode "Symbol Image Set" | https://developer.apple.com/documentation/uikit/creating-custom-symbol-images-for-your-app | High |
| 18 | Xcode SDK Agreement §2.10: System-Provided Images "solely for the purpose of developing Applications for Apple-branded products that run on the system for which the image was provided"; no app icons/logos/trademark use | https://www.apple.com/legal/sla/docs/xcode.pdf | High |
| 19 | SF Symbols app license: "SOLELY FOR CREATING USER INTERFACES ... RUNNING ON APPLE'S iOS, iPadOS, macOS, tvOS OR watchOS" | https://developer.apple.com/forums/thread/739523 | Medium-High |
| 20 | HIG: SF Symbols prohibited in app icons, logos, trademarked use | https://developer.apple.com/design/human-interface-guidelines/sf-symbols | High |
| 21 | `name_availability.plist` at `/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources/`; keys `symbols`, `year_to_release`; 2025 -> OS 26.0 | local macOS 26.5.1 inspection; https://swiftuisnippets.wordpress.com/2025/06/06/extracting-all-available-sf-symbols-in-swiftui/ | High |
| 22 | `NSImage(systemSymbolName:)` returns nil for invalid names (usable as CI gate) | local run, Xcode 26.6 | High |
| 23 | SFSafeSymbols 7.0.0 supports SF Symbols 7 / OS 26 with `@available` | https://github.com/SFSafeSymbols/SFSafeSymbols | High |
| 24 | Lucide 1.43.0 (2026-09-08), ISC, 24 px grid, stroke 2, round caps; `strokeWidth`, `nonScalingStroke` (deprecates `absoluteStrokeWidth`); 1,818 canonical icons | npm; lucide-react `src/types.ts`; https://lucide.dev/guide/react/basics/stroke-width | High |
| 25 | Tabler 3.46.0, MIT, 6,184 icons (5,130 outline / 1,054 filled), 24 px / 2 px | https://github.com/tabler/tabler-icons ; npm pack | High |
| 26 | Heroicons 2.2.0, MIT, 316 icons; outline 24 @ 1.5, solid 24, mini 20, micro 16 | https://heroicons.com ; https://github.com/tailwindlabs/heroicons | High |
| 27 | Hugeicons free = 6,025 Stroke Rounded icons, MIT; Pro 60k+/10 styles, $99/yr, no redistribution of source files | https://github.com/hugeicons/hugeicons ; https://hugeicons.com/license-agreement ; npm pack | High |
| 28 | Iconly Pro: free 2,500+, Pro 40k+, 6 styles; subscriptions non-commercial, Lifetime $189 commercial, no redistribution/embedding in templates, 300-icon client limit | https://iconly.pro/pricing ; https://iconly.pro/pages/licensing-guide ; https://iconly.pro/pages/terms | Medium |
| 29 | roninoss/icons maps 573 Material <-> SF Symbols; expo-symbols uses per-platform `name` object + `fallback` | https://github.com/roninoss/icons ; https://docs.expo.dev/versions/latest/sdk/symbols/ | High |
| 30 | Open Symbols converts Lucide/Tabler/Heroicons/Feather/FA/MDI/Remix to SF custom symbols; Phosphor not included | https://github.com/buzap/open-symbols | High |
| 31 | visx 4.0.0 (2026-06-11), React 18/19, d3-shape 3 vendored; 38 published packages; chart/theme/a11y/kernel/registry unpublished | https://github.com/airbnb/visx/releases/tag/v4.0.0 ; npm | High |
| 32 | `@visx/curve` re-exports 18 d3-shape curves incl. `curveMonotoneX`, `curveCatmullRom` | `packages/visx-curve/src/index.ts` | High |
| 33 | d3-shape 3.2.0: `curveCatmullRom` alpha default 0.5; `curveMonotoneX` monotone-preserving (Steffen) | https://d3js.org/d3-shape/curve | High |
| 34 | Swift Charts `InterpolationMethod`: linear, monotone, catmullRom(alpha:), cardinal(tension:), stepStart/Center/End (iOS 16+) | https://developer.apple.com/documentation/charts/interpolationmethod | High |

---

## 7. Recommendations for Prism

1. **Platform split, stated as a hard rule in the spec.** Apple chrome (toolbars, tab bars, lists, menus, alerts, widgets) uses SF Symbols via the registry's `sf` name; the web build uses Phosphor exclusively; SF Symbols never enter the npm package, the web bundle, or exported Figma libraries for web. Cite Xcode SDK Agreement §2.10 in the registry README. Bundle Phosphor in the Swift package only for content/brand illustrations where a non-SF look is intentional (data-viz glyphs, empty states), and for parity previews.
2. **Own the Swift Phosphor integration instead of depending on `phosphor-icons/swift`.** Generate `DSPhosphor.xcassets` from `@phosphor-icons/core` SVGs in CI (imageset per icon x weight, `template-rendering-intent: template`, `preserves-vector-representation: true`) inside the Prism package so that watchOS 26 and visionOS are declared platforms and the icon version is pinned to the same catalog the web uses. Keep only the subset the registry references (the full set is 9,072 files).
3. **Weight token mapping** (`ds.icon.weight`), to be tuned visually then frozen:

| Prism weight | SF `Font.Weight` | Phosphor | Rationale |
|---|---|---|---|
| `thin` | `.ultraLight` / `.thin` | `thin` (0.5 px @16) | decorative large glyphs only |
| `light` | `.light` | `light` | large numerals contexts |
| `regular` (default >= 20 pt) | `.regular` | `regular` (1 px @16 = 1.5 px @24) | |
| `medium` (default <= 16 pt, and Bold Text on) | `.medium` / `.semibold` | `bold` (1.5 px @16) | Phosphor has no medium; bold reads like SF medium at small sizes |
| `bold` | `.bold` | `bold` | |
| `fill` | `.symbolVariant(.fill)` | `weight="fill"` | selected/active state |
| `duotone` | `.symbolRenderingMode(.hierarchical)` | `weight="duotone"` | secondary layer at 20 % alpha maps to hierarchical secondary opacity |

   Encode the "Bold Text" accessibility toggle as `weight += 1 step` on both platforms (SF via `@Environment(\.legibilityWeight)`, web via a `data-bold-text` attribute from the tokens layer).
4. **Stroke-weight token**: because Phosphor weights are baked geometry, define `ds.icon.strokeWidth` as a *derived, read-only* token (16-px basis: 0.5/0.75/1/1.5) used by the chart module and custom SVG glyphs so hand-drawn viz glyphs match Phosphor; never expose it as a runtime `strokeWidth` prop on web icons.
5. **Registry-driven codegen**: from one `icons.registry.json` generate (a) Swift `enum DSIcon` with `sfName`, `sfMinimumYear`, `phosphor` case and `Image` accessors; (b) TS `dsIcons` map typed against `@phosphor-icons/react` exports; (c) a Figma-ready CSV/JSON (semantic name -> Phosphor component name) for the Tokens Studio / Figma plugin flow.
6. **CI gates** (all verified feasible): Phosphor name check against `@phosphor-icons/core` `icons[]`; SF name and availability check against `name_availability.plist` with `year <= 2025.x` for the OS 26 floor; `NSImage(systemSymbolName:)`/`UIImage(systemName:)` runtime assertion in the Swift test target; `tsc` type check of the generated map; parity report listing entries lacking either platform name without a declared `fallback`; RTL audit (`mirror` flag must be set for directional icons, and web must render `mirrored` while SF mirrors automatically).
7. **Motion parity**: registry entries may declare `animation: drawOn | replace | bounce | variableDraw`; SwiftUI applies `.symbolEffect(.drawOn.byLayer)` (OS 26+, matches the OS 26 floor); web falls back to a CSS `stroke-dashoffset` reveal only for hand-authored stroke SVGs, otherwise to opacity/scale (Phosphor's outlined paths cannot be "drawn"). Document this asymmetry in the component contract.
8. **Charts**: adopt the curve mapping in 5.3; default sparkline curve = `monotone` (`curveMonotoneX` / `.monotone`), "smooth" = Catmull-Rom alpha 0.5 on both; forbid `natural`, `basis`, `bump` in the shared spec. Pin `@visx/*@4.0.0`; do not depend on `@visx/chart`/`@visx/theme` until they publish.
9. **Stay Figma-ready**: use Phosphor's official Figma plugin for the web library; for Apple screens use the SF Symbols app export (allowed for Apple UI mockups). Keep semantic names identical in both Figma libraries via the generated CSV.

---

## 8. Recommended registry file format

Single source `packages/icons/icons.registry.json` (JSON Schema `icons.registry.schema.json` beside it), versioned with the system.

```json
{
  "$schema": "./icons.registry.schema.json",
  "version": "1.0.0",
  "sources": {
    "phosphor": { "package": "@phosphor-icons/core", "version": "2.1.1" },
    "sfSymbols": { "catalogYear": "2025.1", "minimumYear": "2025", "osFloor": { "iOS": "26.0", "macOS": "26.0", "watchOS": "26.0", "visionOS": "26.0" } }
  },
  "weights": {
    "thin":    { "sf": "ultraLight", "phosphor": "thin",    "strokePx16": 0.5 },
    "light":   { "sf": "light",      "phosphor": "light",   "strokePx16": 0.75 },
    "regular": { "sf": "regular",    "phosphor": "regular", "strokePx16": 1.0 },
    "medium":  { "sf": "medium",     "phosphor": "bold",    "strokePx16": 1.5 },
    "bold":    { "sf": "bold",       "phosphor": "bold",    "strokePx16": 1.5 }
  },
  "icons": {
    "action.favorite": {
      "description": "Mark an item as favorite; toggles with action.favorite.on",
      "category": "action",
      "sf":       { "name": "heart", "variants": { "fill": "heart.fill" }, "renderingMode": "monochrome" },
      "phosphor": { "name": "heart" },
      "states":   { "on": { "sf": { "variant": "fill" }, "phosphor": { "weight": "fill" } } },
      "rtl": "none",
      "animation": { "sf": "bounce", "web": "scale" },
      "a11y": { "label": { "en": "Favorite", "ru": "Избранное" }, "decorative": false },
      "tags": ["like", "heart", "save"]
    },
    "navigation.back": {
      "sf": { "name": "chevron.backward" },
      "phosphor": { "name": "caret-left" },
      "rtl": "mirror",
      "a11y": { "label": { "en": "Back", "ru": "Назад" } }
    },
    "status.signal": {
      "sf": { "name": "cellularbars", "variableValue": true },
      "phosphor": { "name": "cell-signal-full", "fallbackLevels": ["cell-signal-none", "cell-signal-low", "cell-signal-medium", "cell-signal-high", "cell-signal-full"] },
      "a11y": { "label": { "en": "Signal strength", "ru": "Уровень сигнала" } }
    },
    "brand.spark": {
      "sf": { "custom": "prism.spark", "template": "assets/sf/prism.spark.svg", "templateVersion": 4 },
      "phosphor": { "name": "sparkle" },
      "a11y": { "decorative": true }
    }
  }
}
```

Rules encoded by the schema:
- Semantic key = `<domain>.<concept>[.<qualifier>]`, lowercase, dot-separated; domains: `action`, `navigation`, `status`, `object`, `media`, `chart`, `brand`.
- Every entry needs `sf` (system name or `custom` template) **and** `phosphor`, or an explicit `fallback: { platform, reason }`.
- `sf.name` must exist in `name_availability.plist` with year <= `sources.sfSymbols.minimumYear` (plus `.x` point releases); `phosphor.name` must be a canonical (non-alias) `IconEntry.name`.
- `rtl` is `none | mirror`; when `mirror`, the web generator emits `mirrored` under `dir="rtl"` (SF mirrors automatically per HIG).
- Optional `animation`, `states`, `variableValue` (SF variable color/draw) and `fallbackLevels` (web substitute for variable value).
- Codegen outputs: `Sources/DSIcons/DSIcon.generated.swift`, `packages/icons/src/icons.generated.ts`, `figma/icons.csv`, and `reports/icon-parity.json` consumed by the CI parity report.

---

## 9. Open questions

1. Optical match: SF Symbols regular at medium scale vs Phosphor regular (1 px @16) vs bold (1.5 px @16) has not been measured; the weight table in section 7 needs a visual calibration pass on real screens (and under Increase Contrast) before freezing.
2. `phosphor-icons/swift` omits watchOS/visionOS from `platforms`; confirm SPM's behavior when Prism (which declares watchOS 26) depends on it, or (recommended) generate the asset catalog in-repo and drop the dependency.
3. Phosphor core 2.1.1 has had no release since March 2024; check the Phosphor GitHub for a 2.2 roadmap before pinning long-term, and decide how alias renames (`IconEntry.alias`) are handled in registry migrations.
4. Whether to produce a custom-SF-symbol variant of the Prism brand glyphs from Phosphor geometry (Apple's path-based/interpolation rules would require matching path counts across Ultralight/Regular/Black sources, which Phosphor's per-weight files do not guarantee).
5. SF Symbols 8 beta: exact macOS requirement (Sonoma per Apple page vs Sequoia per AAPL Ch.) and whether any new API beyond new glyph names ships with OS 27; Prism's OS 26 floor means SF 8 glyphs (year 2026) must be excluded by the availability gate until the floor moves.
6. Apple's default alpha for `InterpolationMethod.catmullRom` (parameterless) is undocumented; always pass `alpha:` explicitly in the shared spec.
7. visx `@visx/chart`, `@visx/theme`, `@visx/a11y` exist in the repo at 4.0.0 but are unpublished; revisit when they ship, as `@visx/theme` may overlap with Prism chart tokens.
8. Figma license angle: confirm that using SF Symbols in Figma files shared with contractors is covered by the SF Symbols app license (UI creation for Apple platforms) — it appears to be, but the files must not be repurposed for web comps.
