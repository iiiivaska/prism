# Prism

Prism is a brand-agnostic, multi-platform design system: one W3C DTCG token source, one machine-readable component spec, two implementations (SwiftUI for iOS / iPadOS / macOS / watchOS 26+, React + TypeScript + Tailwind v4 for web), one version.

Status: Phase 0 bootstrap done: pnpm workspace, lint, typecheck, build and test, and a CI matrix whose steps switch on as tools land. The token pipeline (Phase 1) is next. See `docs/` for the decision record, research and the roadmap.

Code prefix: `ds` (`DSButton`, `--ds-color-bg-surface`). npm scope: `@iiiivaska/prism-*`.

## License

MIT for Prism's own code, tokens, specs and docs (`LICENSE`, ADR-0028). Bundled fonts and other third-party files keep their own licenses, listed in `THIRD_PARTY_NOTICES.md` and `licenses/inventory.json`.
