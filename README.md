# Prism

Prism is a brand-agnostic, multi-platform design system: one W3C DTCG token source, one machine-readable component spec, two implementations (SwiftUI for iOS / iPadOS / macOS / watchOS 26+, React + TypeScript + Tailwind v4 for web), one version.

Status: Phase 0 bootstrap done: pnpm workspace, lint, typecheck, build and test, and a CI matrix whose steps switch on as tools land. The token pipeline (Phase 1) is next. See `docs/` for the decision record, research and the roadmap.

Code prefix: `ds` (`DSButton`, `--ds-color-bg-surface`). npm scope: `@iiiivaska/prism-*`.

## What is in the repository

| Path | What |
|---|---|
| `tokens/`, `brands/` | the W3C DTCG token source and the exported bundle, plus each brand's overrides and fonts |
| `spec/` | the machine-readable contracts: 57 component specs, 3 patterns, the icon registry and the haptics table |
| `swift/` | the SwiftUI implementation — `DSTokens`, `DSCore`, `DSComponents`, `DSCharts` — its tests, and `swift/Showcase` |
| `web/packages/` | `@iiiivaska/prism-tokens`, `@iiiivaska/prism-react`, `@iiiivaska/prism-charts` |
| `web/apps/` | the Storybook `gallery`, the Playwright `vrt` suite and the web `showcase` |
| `tools/` | the pipeline and every contract check: token build, contrast, spec and icon validation, parity, licenses, gallery, release, showcase |
| `gallery/` | the paired snapshot canon (ADR-0005), built from both stacks' committed baselines |
| `docs/`, `fixtures/` | the decision record, the roadmap and the research; two consumer apps that install the published packages |

### The showcase apps

Two runnable apps show **every token and every implemented component** of the brand they are running, live, with every axis switched through the published API. `docs/showcase.md` is the design and says what each one is honest about; `swift/Showcase/README.md` covers the Apple one in detail.

- Web — `pnpm showcase:web` serves it at <http://localhost:5273> (`pnpm showcase:build` writes a static copy to `web/apps/showcase/dist`); build the packages with `pnpm -r build` first.
- Apple — `pnpm showcase:apple` regenerates the catalogues, writes the Xcode project, builds `swift/Showcase` with `xcodebuild` and launches it on the iPhone 17 simulator; `pnpm showcase:apple --platform macos` builds and opens the Mac app instead.

Both apps are manifest-driven, so a component that lands appears in them on the next build, and the build fails until it has a renderer rather than going quietly stale.

## License

Prism's own code, tokens, specs and docs are proprietary: Copyright (c) 2026 iiiivaska, all rights reserved, with no right to use, copy, modify or distribute them without written permission (`LICENSE`, ADR-0031; the repository was public under MIT from 2026-09-14 to 2026-09-22, and whatever was taken in that window — a clone, a fork, any version published under it — stays MIT for what that copy contains). Bundled fonts and other third-party files keep their own licenses, listed in `THIRD_PARTY_NOTICES.md` and `licenses/inventory.json`, and `LICENSE` takes nothing away from those.
