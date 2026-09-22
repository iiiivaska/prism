import SwiftUI
import DSCore
import DSTokens

/// Every value `spec/components/Card.yaml` (specVersion 2) binds, and the rules its behavior states, as pure functions
/// of the props and the context the card's own Surface publishes, so they run on the host. `DSCard` only draws what
/// these return.
///
/// Title, caption and action cells keyed by a material apply when the Surface publishes that material, not because the
/// card asked for it: under the glass fallback a glass card renders the `raised` cells, and a selected one the
/// `inverse` cells (ADR-0022 §3.1). A part with no cell for the published material takes its tone from Text.
nonisolated enum DSCardAppearance {
    // MARK: - tokens.root

    /// `tokens.root.radius`: `large` binds `comp.card.radius.large`, `compact` `comp.card.radius.compact`, and the
    /// compact density uses the compact radius too (Card.yaml behavior). The Surface radius cases carry the same values
    /// the component tokens alias (`radius.card-compact`, `radius.card`, `radius.card-large`).
    static func radius(_ size: DSCardSize, density: DSDensity) -> DSSurfaceRadius {
        switch size {
        case .large: .cardLarge
        case .compact: .cardCompact
        case .regular: density == .compact ? .cardCompact : .card
        }
    }

    /// `tokens.root.shadow` and `tokens.root.selected.shadow`: solid binds `comp.card.shadow.solid` (`elevation.0`,
    /// flat), glass `comp.card.shadow.floating` (`elevation.3`, the Surface's `overlay` level), and a selected card
    /// lifts to `comp.card.shadow.floating`. Vivid and tinted bind none and keep the material's own level.
    static func elevation(_ variant: DSCardVariant, isSelected: Bool) -> DSSurfaceElevation? {
        if isSelected { return .overlay }
        switch variant {
        case .solid: return .flat
        case .glass: return .overlay
        case .vivid, .tinted: return nil
        }
    }

    /// `tokens.root.background.tinted`: the accent tint over the page. Solid and glass fills are the Surface's own
    /// (`comp.card.solid.bg` is `color.bg.surface`, `comp.card.glass.fill` is `material.glass.fill`).
    static func tint(_ variant: DSCardVariant) -> DSColorPath? {
        variant == .tinted ? \.color.bgTintAccent : nil
    }

    /// `tokens.root.hover.overlay`: pointer only, on solid and tinted; vivid and glass do not change on hover.
    static func hoverOverlay(_ variant: DSCardVariant) -> DSColorPath? {
        switch variant {
        case .solid, .tinted: \.color.bgFillNeutralSubtle
        case .vivid, .glass: nil
        }
    }

    /// `tokens.root.pressed.overlay`, which is also what replaces the press scale under Reduce Motion.
    static var pressedOverlay: DSColorPath { \.color.bgFillNeutralSubtle }

    /// `tokens.root.selected.border`, keyed by the published material; no cell draws no outline.
    static func selectedBorder(on material: DSSurfaceMaterial) -> DSColorPath? {
        switch material {
        case .glass: \.color.borderOnGlassFill
        case .vivid: \.color.borderOnMedia
        case .solid: \.color.borderStrong
        default: nil
        }
    }

    /// The width of the selection outline. Card.yaml binds its colour only; the outline takes `border.strong`, the
    /// width of an outline that has to be seen (docs/research/visual-dna.md §7.5), drawn inside the shape.
    static func selectedBorderWidth(_ border: DSTokenSet.Border) -> CGFloat {
        border.strong
    }

    // MARK: - title, caption

    /// `tokens.title.color`; nil takes Text's `primary` tone on the published material.
    static func title(on surface: DSSurfaceContext) -> DSColorPath? {
        switch surface.material {
        case .solid: \.components.card.solidText
        case .vivid: \.components.card.vividText
        case .glass: \.components.card.glassText
        case .glassLight: \.color.textOnGlassLight
        case .inverse: \.color.textOnInverse
        default: nil
        }
    }

    /// `tokens.caption.color`; on the scheme's glass the cell follows the published backdrop kind. Nil takes Text's
    /// `secondary` tone.
    static func caption(on surface: DSSurfaceContext) -> DSColorPath? {
        switch surface.material {
        case .solid: return \.components.card.solidCaption
        case .vivid: return \.components.card.vividCaption
        case .glass:
            switch surface.backdrop {
            case .map: return \.color.textOnGlassFillSecondary
            case .image, .vivid: return \.color.textOnGlassFillMediaSecondary
            case .none: return nil
            }
        case .glassLight: return \.color.textOnGlassLight
        case .inverse: return \.color.textOnInverse
        default: return nil
        }
    }

    /// The title's line limit: a headline title runs to two lines at most (docs/research/visual-dna.md §4.9), which is
    /// the title the V2 header block is measured for (ADR-0022 §4.1).
    static let titleLines = 2
    /// The caption's line limit: one line under the title.
    static let captionLines = 1

    // MARK: - V3 (ADR-0030 §8)

    /// On vivid the hero holds only its value and trailing group; the unit joins the caption line in the header block.
    static func unitJoinsCaption(on material: DSSurfaceMaterial) -> Bool {
        material == .vivid
    }

    /// The icon ring is not drawn on vivid (Card.yaml anatomy, ADR-0022 §4.2).
    static func drawsIconRing(on material: DSSurfaceMaterial) -> Bool {
        material != .vivid
    }

    // MARK: - action

    /// `tokens.action.color`: the open glyph's colour; a material without a cell takes Icon's `secondary` tone.
    static func action(on surface: DSSurfaceContext) -> DSColorPath {
        switch surface.material {
        case .solid: \.color.iconSecondary
        case .vivid: \.color.textOnVivid
        case .glass: \.color.textOnGlassFill
        default: DSGlyphTone.secondary.color(on: surface)
        }
    }

    /// `tokens.action.border`: the hairline ring of the action circle on vivid and on the scheme's glass.
    static func actionBorder(on material: DSSurfaceMaterial) -> DSColorPath? {
        switch material {
        case .vivid: \.color.borderOnMedia
        case .glass: \.color.borderOnGlassFill
        default: nil
        }
    }

    /// The solid of the `custom` action circle: the one inverse solid on a card (docs/research/visual-dna.md §1
    /// principle 9), which on vivid is the white solid (ADR-0030 §3.1). On the scheme's glass `color.bg.fill.inverse`
    /// is already right: ink on light glass and white on smoke (ADR-0030 §3.1, the direction board's glass card).
    static func actionSolid(on material: DSSurfaceMaterial) -> (fill: DSColorPath, glyph: DSColorPath) {
        if material == .vivid {
            let fill: DSColorPath = \.color.bgFillInverseMedia
            let glyph: DSColorPath = \.color.textOnInverseMedia
            return (fill, glyph)
        }
        let fill: DSColorPath = \.color.bgFillInverse
        let glyph: DSColorPath = \.color.textOnInverse
        return (fill, glyph)
    }

    /// Whether the whole card is the pressable element: `open` with an action to fire.
    static func isPressable(_ action: DSCardActionKind, hasAction: Bool) -> Bool {
        action == .open && hasAction
    }

    /// The open glyph under pointer modality appears on hover (and on keyboard focus, where there is no hover); under
    /// touch it is always visible (Card.yaml `notes.platform.macos`).
    static func showsOpenGlyph(interaction: DSTokenSet.Interaction, isHovered: Bool, isFocused: Bool) -> Bool {
        !interaction.hover || isHovered || isFocused
    }

    /// The room the header leaves before the top-right corner. On vivid it ends where the V2 header block does,
    /// `size.control.md` and `space.5` in from the trailing padding, whatever the action (ADR-0022 §4.1); elsewhere
    /// it ends `space.3` before the action.
    static func headerTrailingSpace(on material: DSSurfaceMaterial, actionWidth: CGFloat, _ tokens: DSTokenSet) -> CGFloat {
        if material == .vivid {
            return tokens.size.controlMd + tokens.space.step5
        }
        return actionWidth > 0 ? actionWidth + tokens.space.step3 : 0
    }

    /// The width the action takes at the padding corner: the open glyph's `size.icon.sm` box, or the
    /// `size.control.md` circle.
    static func actionWidth(_ action: DSCardActionKind, _ tokens: DSTokenSet) -> CGFloat {
        switch action {
        case .none: 0
        case .open: tokens.size.iconSm
        case .custom: tokens.size.controlMd
        }
    }

    // MARK: - motion

    /// `motion.press`: `motion.spring.snappy`, or the overlay's fill change under Reduce Motion.
    static func pressAnimation(_ motion: DSMotion) -> Animation {
        DSControlAppearance.pressAnimation(motion.tokens.springSnappy, motion: motion)
    }

    /// `motion.select`: `motion.spring.smooth`; under Reduce Motion the selected shadow and outline crossfade over
    /// `motion.duration.base` with `motion.easing.out`.
    static func selectAnimation(_ motion: DSMotion) -> Animation {
        motion.isReduced ? motion.presentation : motion.smooth
    }
}
