import SwiftUI
import DSCore
import DSTokens

/// Every value `spec/components/Divider.yaml` (specVersion 1) binds, as pure functions of the material the enclosing
/// Surface publishes and the token set, so the binding matrix runs on the host. `DSDivider` only draws what these
/// return.
///
/// A cell keyed by a material applies when the enclosing Surface publishes that material, not because the Divider asked
/// for it (spec/SCHEMA.md, ADR-0022 §3.1). Under the glass fallback the Surface publishes `raised`, so the line takes
/// the `raised` cell with it and needs no fallback of its own (behavior 9).
nonisolated enum DSDividerAppearance {
    // MARK: - tokens.root

    /// `tokens.root.color` for the published material.
    ///
    /// The matrix names the seven materials a hairline is drawn on and has no `default`, so on `inverse` and `accent`
    /// the colour is not set (spec/SCHEMA.md, "The binding-matrix grammar"): those materials carry the one solid
    /// control or the one lit tile, never a table or a list of rows, and Prism has no hairline role that survives them
    /// (behavior 7). A Divider placed there anyway keeps its box, paints nothing, and its accessibility does not
    /// change.
    ///
    /// On vivid the line is `color.border.on-media` and on the scheme's glass `color.border.on-glass-fill`, because
    /// `color.border.hairline` disappears on both (behavior 5); the glass cell does not split by backdrop kind.
    static func color(on material: DSSurfaceMaterial) -> DSColorPath? {
        switch material {
        case .page, .solid, .raised, .nested: \.color.borderHairline
        case .vivid: \.color.borderOnMedia
        case .glass, .glassLight: \.color.borderOnGlassFill
        case .inverse, .accent: nil
        }
    }

    /// `tokens.root.thickness`: `border.hairline`, the one line the component draws (behavior 1). It does not scale
    /// with Dynamic Type (`accessibility.dynamicType`).
    static func thickness(_ border: DSTokenSet.Border) -> CGFloat {
        border.hairline
    }

    /// `tokens.root.inset`: how far each end of the line stops short of the container's edge — `space.card-padding`
    /// for `content`, and nothing for `none`, which has no cell.
    ///
    /// `space.card-padding` is a density token named for Card, and this is its second consumer: a change to card
    /// padding now moves every inset Divider too (roadmap P4-D2). Like the hairline it does not scale with Dynamic
    /// Type, so an inset rule keeps its alignment with the card's content at every text size.
    static func inset(_ inset: DSDividerInset, _ space: DSTokenSet.Space) -> CGFloat {
        switch inset {
        case .none: 0
        case .content: space.cardPadding
        }
    }

    // MARK: - Accessibility

    /// Whether the line is hidden from assistive technology on Apple: always, whatever `isDecorative` says
    /// (Divider.yaml `notes.platform.ios`).
    ///
    /// `isDecorative` keeps the one name and the one polarity Icon, Avatar and Divider share (spec/SCHEMA.md, "One
    /// meaning, one name, one polarity"), and true hides the line on every stack. **`false` has no Apple
    /// counterpart.** SwiftUI's accessibility traits carry no separator, and a Divider speaks no word of its own
    /// (ADR-0032 rules 1 and 5), so there is no role to give the line and no label to give it instead. The web
    /// exposes the same line as `role="separator"`; here it stays hidden. Where a rule is the only grouping cue, a
    /// container or a heading carries the grouping for VoiceOver.
    ///
    /// Hiding is the only safe answer, because not hiding is not the same as exposing nothing: the painted shape
    /// under an `.accessibilityHidden(false)` becomes an element of its own, with no label and no traits, and
    /// VoiceOver stops on it. `DSDividerAccessibilityTreeTests` (DSSnapshotTests) reads the tree the simulator
    /// publishes for every example and for both values, so this answer is measured, not only stated.
    static func hidesFromAssistiveTechnology(isDecorative: Bool) -> Bool {
        true
    }
}
