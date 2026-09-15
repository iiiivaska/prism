# ADR-0003: Two implementations, SwiftUI and React; minimum OS 26

- Status: accepted (the `tokens.css` scoping attributes, `data-slot` and the `styles.css` build amended by [ADR-0019](0019-web-runtime-contract.md); the brand scope of `tokens.css` amended by [ADR-0020](0020-brand-model.md): one `tokens.css` per brand, no `data-ds-brand` attribute; the Motion bullet amended by [ADR-0023](0023-motion-tokens.md))
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #3

## Context

Five target platforms but two rendering worlds. Every owner project is either SwiftUI (RideVerse/TraVerse at iOS 26 and macOS 26, SodaClone at macOS 15) or React + Vite + Tailwind v4 (InvestEd, BountyControl, VideoContent with Electron). Nothing is Kotlin, Flutter or React Native. "Very beautiful" on Apple platforms means native scroll physics, Liquid Glass, Dynamic Type and Swift Charts; a web view cannot deliver those.

Verified toolchain facts (2026-09-08, `docs/research/arch-apple.md`): Xcode 26.4 ships Swift 6.3 and the OS 26.4 SDKs and is the current release; Xcode 27 beta 6 ships Swift 6.4 with iOS 27 SDKs (requires macOS 26.4 or later) and, per its release notes, adds grouped preview variants and a Preview Snapshot MCP tool for agents; PackageDescription 6.2 provides `defaultIsolation(MainActor.self)` and `.iOS(.v26)`, `.macOS(.v26)`, `.watchOS(.v26)`. SwiftPM has no per-platform `sources:`; platform variation happens with `#if os(...)` inside targets. `swift test` runs on the macOS host; iOS and watchOS snapshots require `xcodebuild test` against simulators.

## Decision

1. **Apple**: one SPM package `Prism` with products `DSTokens` (generated), `DSCore` (theme, environment, accessibility policy, surface resolution, font registration, haptics, motion), `DSComponents`, `DSCharts`. Platforms `.iOS(.v26)`, `.macOS(.v26)`, `.watchOS(.v26)`; Swift language mode 6; UI targets use `defaultIsolation(MainActor.self)`; `DSTokens` stays nonisolated. tvOS and visionOS are not declared until a consumer needs them.
2. **Web**: pnpm workspace under `web/` with packages `@iiiivaska/prism-tokens` (CSS variables, Tailwind `@theme`, TypeScript), `@iiiivaska/prism-react` (components), `@iiiivaska/prism-charts`, `@iiiivaska/prism-gallery` (private). React 19, TypeScript, Tailwind v4 as the styling layer with plain CSS variables so non-Tailwind consumers can still theme.
3. **Minimum OS is 26 everywhere.** CI pins Xcode 26.4 / Swift 6.3 today and adds an Xcode 27 lane when the GM ships; the deployment floor does not move to 27 until every owner app has.
4. **Density and modality are runtime environment values on both stacks**, never compile-time platform branches (see ADR-0010).
5. SodaClone (macOS 15) adopts Prism only after upgrading its deployment target; Prism ships no pre-26 fallback.

## Web stack specifics (verified 2026-09-08, `docs/research/arch-web.md`)

- **Headless primitives: React Aria Components 1.21** (Adobe, Apache-2.0). It is the only candidate with a published assistive-technology test matrix (VoiceOver, JAWS, NVDA, TalkBack), built-in localized strings for 30+ languages across 36 locales including `ru-RU` and `uk-UA` (Cyrillic is mandatory), Table / Tree / Virtualizer / DatePicker / ColorPicker for data-dense products, an official MCP server and agent skill, and a Tailwind v4 plugin that maps its `data-*` states to variants. Base UI 1.8 (MUI) is the documented fallback; the two are never mixed.
- **Styling: CSS-first, Tailwind-optional.** Components render `data-slot` attributes plus React Aria state attributes and ship one `styles.css` written against `--ds-*` variables inside `@layer ds.*`; no Tailwind utilities inside the package. `@iiiivaska/prism-tokens` ships `tokens.css` (variables scoped by `[data-ds-brand|scheme|density|input]`) and `tailwind.css` (`@theme inline` bridge), so Tailwind consumers get `bg-ds-…` utilities and non-Tailwind consumers still theme by attributes. Consumers import Prism styles as `layer(components)` so their utilities win without `!important`.
- **Charts** (ADR-0007): visx 4.0 + d3-shape / d3-scale behind Prism's chart spec; explicit sizes for SSR; Recharts 3 named as the exit path.
- **Gallery: Storybook 10.6** (react-vite, addon-docs, addon-a11y with `test: 'error'`, addon-vitest in browser mode, Storybook MCP for agents). Stories are the spec examples.
- **Visual regression: Playwright `toHaveScreenshot`** over the static Storybook build inside the pinned Playwright Docker image, matrix scheme × density × viewport, baselines in git. Lost Pixel is sunset; Chromatic is an optional later add-on.
- **Build and publish**: pnpm 12 workspaces with catalogs; Changesets 3 with a `fixed` group so every `@iiiivaska/prism-*` package shares the system version; ESM-only packages built with tsdown (tsup is unmaintained); React 19 peer (`ref` as prop, `useFormStatus` for pending buttons); GitHub Packages via `GITHUB_TOKEN`.
- **Motion**: tokens are `(duration, bounce)` pairs; the token build emits CSS `linear()` springs with Motion's `spring()` generator, so web and SwiftUI springs derive from the same two numbers; Motion 13 (MIT core) is used only for gestures, layout animation and exit transitions.

## Alternatives considered

- **Compose Multiplatform / React Native / Flutter**: one implementation, but second-class on watchOS and macOS, no Liquid Glass, and every owner project would be rewritten.
- **Web everywhere with Electron / WKWebView**: no watch, no native materials or physics.
- **Minimum OS 25 or lower**: would require a glass fallback layer (RideVerse's `GlassFallback.swift`) for one legacy app.

## Consequences

- Every component is written twice, which is why ADR-0006 makes the spec a versioned contract with a parity report.
- Two snapshot pipelines: `swift test` on macOS for tokens, math and non-glass `NSHostingView` renders; `xcodebuild test` on iOS and watchOS simulators for real component renders; Playwright for web.
- Xcode's MCP preview tools (26.3+) are the fastest visual loop for an agent iterating on SwiftUI components and are listed in the agent skill.

## Rules that follow

1. Public Swift API is `DS`-prefixed; React components are unprefixed inside the scoped package.
2. Platform-specific behavior lives in `DSCore`, not in components; components read the environment.
3. No dependency on UIKit/AppKit from `DSComponents` except through `DSCore` adapters.
