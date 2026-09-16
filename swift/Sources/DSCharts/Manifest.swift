/// Implemented spec versions per data-viz component and platform (ADR-0006 rule 2, ADR-0007,
/// critic G-21): the DSCharts twin of `DSComponentsManifest`.
///
/// `implemented["Sparkline"]["ios"]` is the `specVersion` of the Sparkline spec this target
/// implements on iOS. The keys are the Apple platform keys of `spec/SCHEMA.md`: `ios`, `ipados`,
/// `macos`, `watchos`; the web keys belong to `web/packages/charts/src/manifest.ts`. A spec whose
/// `layer` is `dataviz` is declared here and nowhere else; every other layer belongs to
/// `DSComponentsManifest` (ADR-0012).
///
/// Edited by hand in the same change as the component (ADR-0006 rule 6). `pnpm parity:report` reads
/// this literal as text on Linux, so keep it a plain dictionary literal — string keys, integer
/// values, no expressions (the grammar is in `tools/parity/manifest.ts`).
///
/// The first charts arrive with data-viz wave 1; until then the table is empty.
public enum DSChartsManifest {
    public static let implemented: [String: [String: Int]] = [:]
}
