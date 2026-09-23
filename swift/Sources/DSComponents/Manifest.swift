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
///
/// P4-1 adds Divider (`DSDivider`) on iOS, iPadOS and macOS. Divider.yaml marks watchOS `none`, so its row has no
/// `watchos` key: one there would claim a platform the spec rules out, which the parity report fails as
/// `manifest/unsupported` (ADR-0006 rule 4). Divider 2 settles behavior 2 for a parent that sizes to its content: the
/// line's ideal length is zero, so a stack under `fixedSize` on its cross axis is as long as its other children.
///
/// P4-2 adds Icon (`DSIcon`) on all four Apple platforms. Icon.yaml marks watchOS `full` — it is one of the nine
/// components ADR-0010 puts on the wrist — so its row carries a `watchos` key, and every prop works there.
///
/// P4-3 adds Badge (`DSBadge`) on iOS, iPadOS and macOS, with the strings table of ADR-0032 it is the first to read
/// (`DSStrings`, `DSTheme(strings:)`). Badge.yaml marks watchOS `none` — a watch alert row shows its count with Text at
/// the micro role — so its row, like Divider's, has no `watchos` key.
///
/// Button 4 binds the outline width, which the spec had left open and the two stacks had each chosen: `border.hairline`
/// for secondary, ghost and danger, as the signed-off direction board draws every pill (ADR-0033). This target already
/// drew that width and now reads it from the spec's cell. Button 4 also renames `fullWidth` to `isFullWidth`, the
/// rename spec/SCHEMA.md owed the next change to Button.yaml ("One meaning, one name, one polarity").
///
/// P4-4 adds IconButton (`DSIconButton`) on iOS, iPadOS and macOS, built on Icon for its glyph and on Badge for its
/// `badge` slot, which it reads into its own accessibility value through `strings.Badge.count`. IconButton.yaml marks
/// watchOS `none` — the watch acts through Button and system chrome — so its row, like Divider's and Badge's, has no
/// `watchos` key.
public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        "Badge": ["ios": 1, "ipados": 1, "macos": 1],
        "Button": ["ios": 4, "ipados": 4, "macos": 4, "watchos": 4],
        "Card": ["ios": 5, "ipados": 5, "macos": 5, "watchos": 5],
        "Divider": ["ios": 2, "ipados": 2, "macos": 2],
        "Icon": ["ios": 1, "ipados": 1, "macos": 1, "watchos": 1],
        "IconButton": ["ios": 1, "ipados": 1, "macos": 1],
        "Surface": ["ios": 3, "ipados": 3, "macos": 3, "watchos": 3],
        "Text": ["ios": 2, "ipados": 2, "macos": 2, "watchos": 2],
    ]
}
