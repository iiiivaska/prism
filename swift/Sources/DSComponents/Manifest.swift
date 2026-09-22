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
///
/// Card and Surface carry the review rounds of P3-3 and P3-4. Card 3 settled the custom disc's fill and glyph cells,
/// the handler as the test of pressability (the open glyph and the hover cue go with it), the accessible name of a
/// card that is not pressable, and the material a tinted card publishes; Card 4 settled the header geometry both
/// stacks had written their own way — one `action.size` box for either affordance, `header.gap` between the heading
/// and it, the V2 header block reserved on vivid whatever the action — and the two-line title with its one-line
/// caption. Card 5 settles the third round — the separator that joins the vivid unit to the caption, the press
/// magnitude Card shares with every other Prism control, and the minimum gap between the rows of the anatomy — each
/// a number both stacks had chosen for itself. Surface 3 writes down the per-material default of `elevation`, which
/// this target already drew.
public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        "Button": ["ios": 3, "ipados": 3, "macos": 3, "watchos": 3],
        "Card": ["ios": 5, "ipados": 5, "macos": 5, "watchos": 5],
        "Surface": ["ios": 3, "ipados": 3, "macos": 3, "watchos": 3],
        "Text": ["ios": 2, "ipados": 2, "macos": 2, "watchos": 2],
    ]
}
