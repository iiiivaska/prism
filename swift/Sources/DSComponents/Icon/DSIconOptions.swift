import SwiftUI
import DSCore
import DSTokens

/// The box of an Icon: `spec/components/Icon.yaml` `props.size`, bound by `tokens.root.size` to `size.icon.sm`,
/// `.md` and `.lg` (16, 20 and 24 pt). The raw value is the spec's spelling.
///
/// The box is square and the same in every density (behavior 10): a control grows around its glyph, the glyph does
/// not grow with it. Controls carry `md`, corner and inline glyphs `sm`.
///
/// **Name.** The spec's prop is `size`, and `DSIconSize` is already the registry's generated table — four boxes,
/// `xs` to `lg`, with the SF point size measured for each — so the spec's three take the `Glyph` stem, as the web's
/// `GlyphSize` does.
nonisolated public enum DSGlyphSize: String, CaseIterable, Hashable, Sendable {
    case sm, md, lg
}

/// The cut of an Icon: `props.weight`, bound by `tokens.root.weight` to `icon.weight` (`control`, the regular rung
/// every control, row and inline glyph uses) and `icon.weight-display` (`display`, the thin rung for a large
/// decorative glyph). `display` is allowed only at `lg`; asked for below it, it resolves to `control` (behavior 3,
/// `DSIconAppearance.effectiveWeight(_:size:)`). The raw value is the spec's spelling.
///
/// **Name.** `DSIconWeight` is the registry's six-rung ladder, which these two reach through their tokens; the
/// spec's two take the `Glyph` stem, as the web's `GlyphWeight` does.
nonisolated public enum DSGlyphWeight: String, CaseIterable, Hashable, Sendable {
    case control, display
}
