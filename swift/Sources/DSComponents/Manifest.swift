/// Implemented spec versions per component and platform (ADR-0006 rule 2, critic G-21).
///
/// `implemented["Button"]["ios"]` is the `specVersion` of `spec/components/Button.yaml` that this
/// target implements on iOS, so iOS and watchOS can differ where the anatomy differs (ADR-0010).
/// The keys are the Apple platform keys of `spec/SCHEMA.md`: `ios`, `ipados`, `macos`, `watchos`.
/// The web keys belong to `web/packages/react/src/manifest.ts`, and the data-viz components to
/// `DSChartsManifest` (ADR-0007).
///
/// A platform with no entry is not implemented yet; the parity report prints it as `–` and, once any
/// platform implements the component, marks every `full` or `adapted` platform behind the spec.
///
/// Edited by hand in the same change as the component, in the order of ADR-0006 rule 6: spec
/// (`specVersion`), tokens, both implementations, manifests, snapshots. `pnpm parity:report` reads
/// this literal as text on Linux, so keep it a plain dictionary literal — string keys, integer
/// values, no expressions (the grammar is in `tools/parity/manifest.ts`, the report in
/// `tools/parity/report.md`).
///
///     public static let implemented: [String: [String: Int]] = [
///         "Button": ["ios": 1, "ipados": 1, "macos": 1, "watchos": 1],
///     ]
///
/// P3-3 implements Surface (`DSSurfaceView`), Text (`DSText`), Button (`DSButton`) and Card (`DSCard`) on all four
/// Apple platforms; the four specs mark watchOS `adapted`, and the watch adaptations are part of the implementation:
/// vivid → solid and glass → the raised fallback (Surface), display and title roles collapsed (Text), every size `lg`,
/// ghost → secondary and no trailing icon (Button), solid, compact and no aside (Card). `DSComponentsTests` checks every
/// cell against the spec's `specVersion` and `platforms`.
public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        "Button": ["ios": 3, "ipados": 3, "macos": 3, "watchos": 3],
        "Card": ["ios": 2, "ipados": 2, "macos": 2, "watchos": 2],
        "Surface": ["ios": 2, "ipados": 2, "macos": 2, "watchos": 2],
        "Text": ["ios": 2, "ipados": 2, "macos": 2, "watchos": 2],
    ]
}
