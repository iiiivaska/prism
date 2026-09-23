import SwiftUI
import DSCore
import DSTokens

/// Every value `spec/components/Card.yaml` (specVersion 5) binds, and the rules its behavior states, as pure functions
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

    /// `tokens.root.background.tinted`: the accent tint, which replaces the fill of the solid surface a tinted card
    /// asks for, so it lies on the `color.bg.page` that surface paints under itself (Card.yaml behavior 7, ADR-0030
    /// §5.1). Solid and glass fills are the Surface's own (`comp.card.solid.bg` is `color.bg.surface`,
    /// `comp.card.glass.fill` is `material.glass.fill`).
    static func tint(_ variant: DSCardVariant) -> DSColorToken? {
        variant.fill
    }

    /// `tokens.root.gap`: the minimum space between the three rows of the anatomy — the header, the body slot and the
    /// footer that carries the hero and the aside (Card.yaml behavior 17). A card taller than its content spreads the
    /// slack above the footer, so the hero stays pinned to the bottom; a card that shrinks to its content keeps these
    /// gaps and nothing else, which is the layout the web reads from the same cell as the `row-gap` of `.ds-card`.
    static func rowGap(_ tokens: DSTokenSet) -> CGFloat {
        tokens.space.step4
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

    /// `tokens.iconRing.iconSize`: the ring's glyph is Icon's `md` box, `size.icon.md`, drawn by `DSIcon` in Icon's
    /// primary tone.
    static let ringIconSize: DSGlyphSize = .md

    /// `tokens.action.iconSize`: the open glyph and the custom disc's glyph are Icon's `sm` box, `size.icon.sm`, drawn
    /// by `DSIcon` with the `inherit` tone, so each takes the colour its affordance sets (`action(on:)`,
    /// `actionSolid(on:)`).
    static let actionIconSize: DSGlyphSize = .sm

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

    /// `tokens.action.borderWidth`: `border.hairline`, the width of that ring.
    static func actionBorderWidth(_ border: DSTokenSet.Border) -> CGFloat {
        border.hairline
    }

    /// `tokens.action.fill` and `tokens.action.glyphColor`: the one inverse solid on the card
    /// (docs/research/visual-dna.md §1 principle 9), keyed by the material the enclosing Surface publishes.
    ///
    /// | Published material | `fill` | `glyphColor` |
    /// |---|---|---|
    /// | `vivid` | `color.bg.fill.inverse-media` | `color.text.on-inverse-media` |
    /// | `glass` | `color.bg.fill.inverse` | `color.text.on-inverse` |
    /// | default (every other material) | `color.bg.fill.inverse` | `color.text.on-inverse` |
    ///
    /// Only vivid takes the white media pair (ADR-0030 §3.1). The scheme's glass keeps the scheme's own inverse
    /// because since ADR-0029 §1 that glass is light glass in light and smoke in dark, where `color.bg.fill.inverse`
    /// is already ink on the one and white on the other; a white disc would disappear on light glass over the bright
    /// imagery ADR-0029 §1.6 allows under it, which is why the ring there is `color.border.on-glass-fill` and not the
    /// white `color.border.on-media` (ADR-0030 §3.2). The `default` row is what a Card publishes for `solid` and for
    /// `tinted`, and for `raised` or `inverse` under the glass fallback; it never publishes `page`, `glassLight`,
    /// `nested` or `accent`.
    ///
    /// These are Card's own cells. The disc follows IconButton's grammar but never binds `comp.icon-button.*`
    /// (ADR-0024 §5.2), and the `glass: color.bg.fill.inverse-media` cell some later draft specs still carry is the
    /// pre-D1 smoked-glass grammar, not this.
    static func actionSolid(on material: DSSurfaceMaterial) -> (fill: DSColorPath, glyph: DSColorPath) {
        switch material {
        case .vivid: (\.color.bgFillInverseMedia, \.color.textOnInverseMedia)
        case .glass: (\.color.bgFillInverse, \.color.textOnInverse)
        default: (\.color.bgFillInverse, \.color.textOnInverse)
        }
    }

    /// Whether the whole card is the pressable element: `open` with an action to fire.
    static func isPressable(_ action: DSCardActionKind, hasAction: Bool) -> Bool {
        action == .open && hasAction
    }

    /// The affordance the card actually draws at the padding corner.
    ///
    /// `open` without an `onAction` renders as `none`: the glyph is the cue that the card opens
    /// (docs/research/visual-dna.md §4.9), so a card with nothing to open draws none of it and reserves none of its
    /// room — "its header is laid out as `action: none` lays it out" (Card.yaml behavior 4). A `custom` disc keeps its
    /// place without a handler: it is then a named disc that presses nothing (behavior 5).
    static func renderedAction(_ action: DSCardActionKind, hasAction: Bool) -> DSCardActionKind {
        action == .open && !hasAction ? .none : action
    }

    /// Whether the open glyph is drawn. It is the pressability cue, so a card with no `onAction` never shows it, in
    /// either modality (Card.yaml behavior 4). On a pressable card, pointer modality reveals it on hover and on
    /// keyboard focus, and touch shows it always (`notes.platform.macos`).
    static func showsOpenGlyph(
        interaction: DSTokenSet.Interaction, isHovered: Bool, isFocused: Bool, isPressable: Bool
    ) -> Bool {
        isPressable && (!interaction.hover || isHovered || isFocused)
    }

    /// The room the header leaves before the top-right corner (Card.yaml behavior 14): the action's own box and
    /// `header.gap` after it, wherever an affordance is drawn. On vivid it is that block whatever the action —
    /// `action: none` and a handler-less `open` included — because the header ends where the V2 header block ends,
    /// `size.control.md` and `space.5` in from the trailing padding (ADR-0022 §4.1), which is the region
    /// `DSSurfaceAppearance.headerBlock` keeps the grain and the bloom out of. Off vivid a card that draws no
    /// affordance leaves nothing and the header takes the whole content width.
    ///
    /// One number, shared with the web, where the same block is the header's `gap: space.5` beside a
    /// `size.control.md` action slot (`web/packages/react/src/card/Card.css`).
    static func headerTrailingSpace(on material: DSSurfaceMaterial, actionWidth: CGFloat, _ tokens: DSTokenSet) -> CGFloat {
        if material == .vivid {
            return tokens.size.controlMd + tokens.space.step5
        }
        return actionWidth > 0 ? actionWidth + headerGap(tokens) : 0
    }

    /// `tokens.header.gap`: the space between the heading and the affordance at the padding corner (behavior 14).
    static func headerGap(_ tokens: DSTokenSet) -> CGFloat {
        tokens.space.step5
    }

    /// `tokens.action.size`: the box the affordance takes at the padding corner, one box for both of them
    /// (behavior 14). The `custom` disc fills it; the open glyph is centred in it at `tokens.action.iconSize`
    /// (`size.icon.sm`), so the two affordances sit in the same place and the header reserves the same room for
    /// either. A card that draws no affordance takes no box at all.
    static func actionWidth(_ action: DSCardActionKind, _ tokens: DSTokenSet) -> CGFloat {
        switch action {
        case .none: 0
        case .open, .custom: tokens.size.controlMd
        }
    }

    // MARK: - motion

    /// The press magnitude of behavior 16: a pressed card scales to 0.97, the number
    /// docs/research/visual-dna.md §1 principle 9 gives every Prism control, so the card, the `custom` disc inside it
    /// and Button's pill shrink alike. Card binds no scale token of its own; it takes the control's
    /// (`DSControlAppearance.pressedScale`), and the web writes the same magnitude into `--ds--card-press-scale`.
    static var pressedScale: CGFloat { DSControlAppearance.pressedScale }

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
