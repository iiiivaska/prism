/**
 * Implemented spec versions per data-viz component and platform (ADR-0006 rule 2, ADR-0007, critic
 * G-20 and G-21): the web twin of `DSChartsManifest` in `swift/Sources/DSCharts/Manifest.swift`.
 *
 * `implemented.Sparkline["web-desktop"]` is the `specVersion` of the Sparkline spec this package
 * implements on a pointer-driven viewport. The keys are the web platform keys of `spec/SCHEMA.md`;
 * the Apple keys belong to the Swift manifests. A spec whose `layer` is `dataviz` is declared here
 * and nowhere else on the web; every other layer belongs to `@iiiivaska/prism-react` (ADR-0012).
 *
 * Edited by hand in the same change as the component (ADR-0006 rule 6). `pnpm parity:report` reads
 * this literal as text, so keep it a plain object literal — string keys, integer values, no
 * expressions (the grammar is in `tools/parity/manifest.ts`).
 *
 * The first charts arrive with data-viz wave 1; until then the table is empty.
 */

/** The web platform keys of `spec/SCHEMA.md`; the Apple keys live in the Swift manifests. */
export type WebPlatform = "web-touch" | "web-desktop";

/** Component name → platform → the spec version this package implements there. */
export type ImplementedVersions = Readonly<Record<string, Readonly<Partial<Record<WebPlatform, number>>>>>;

export const implemented: ImplementedVersions = {};
