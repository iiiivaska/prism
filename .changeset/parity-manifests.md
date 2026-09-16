---
"@iiiivaska/prism-react": minor
"@iiiivaska/prism-charts": minor
---

Per-platform implementation manifests (P2-3, ADR-0006 rule 2, critic G-20 and G-21): `implemented` moves into `src/manifest.ts` in both packages and is now keyed by component **and** platform, `Readonly<Record<string, Readonly<Partial<Record<WebPlatform, number>>>>>`, so `web-touch` and `web-desktop` can carry different spec versions. `@iiiivaska/prism-charts` gains the manifest it never had, which is what let the parity report see data-viz on the web; both packages also export the `WebPlatform` and `ImplementedVersions` types.

`pnpm parity:report` reads these files, the two Swift manifests and every spec, and writes `tools/parity/report.md`: one row per spec, one cell per platform with its support level and implemented version, and a red mark where an implementation lags its spec on a `full` or `adapted` platform.
