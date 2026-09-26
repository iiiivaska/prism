import SwiftUI
import DSCore
import DSTokens

/// Every value `spec/components/IconButton.yaml` (specVersion 3) binds, as pure functions of the variant, the size and
/// the material the enclosing Surface publishes, so the binding matrix runs on the host. `DSIconButton` only draws what
/// these return.
///
/// A cell keyed by a material applies when the enclosing Surface publishes that material, not because the button asked
/// for it (spec/SCHEMA.md, ADR-0022 §3.1): under the glass fallback the Surface publishes `raised`, and the circle takes
/// its `default` cells with it (`accessibility.reduceTransparency`). A value with no cell takes `default`, and with no
/// `default` either the property is not set — which is how `ghost` and `plain` have no fill at rest and `primary` and
/// `plain` no ring (ADR-0029 §3.3), and `secondary` no puck on `inverse` or `accent`.
///
/// **The one solid follows the material** (ADR-0030 §3.1, ADR-0040 §1 and §3): white on vivid; the default inverse
/// solid on the scheme's glass and on light glass, ink on light glass and white on smoke; and knocked out on `inverse`
/// and `accent`, filled with the material's own foreground under a glyph in the material's fill, pressed one lightness
/// step of its own. No other circle draws a ground on those two, and every ring and glyph there takes the material's
/// foreground (ADR-0040 §2).
///
/// **A selected circle is `primary`, cell for cell** (behavior, "`isSelected`"). At rest the fill and the glyph read
/// the spec's own `selected` cells; pressed, the fill is primary's pressed cell, as the web's
/// `[data-ds-selected][data-pressed]` fill is. Every other cell — the underlay, the ring and its width, and the pressed
/// overlay — is read for `rendered(_:isSelected:)`, which is `primary` for a selected circle. So a selected `danger` has
/// no red ring, no underlay and no overlay, and a pressed selected `ghost` takes primary's pressed step (ADR-0039)
/// rather than the ghost's pressed wash. `DSIconButtonBindingTests.aSelectedCircleIsPrimaryCellForCell` holds the
/// `selected` cells to primary's on every material, and the pressed selected fill to primary's pressed fill, so the day
/// the spec separates them that test fails and this rule is read again.
///
/// The web's twins are the `--ds--icon-button-*` properties of `IconButton.css`
/// (`web/packages/react/src/icon-button/`); both stacks assert the same cells out of the same spec.
nonisolated enum DSIconButtonAppearance {
    // MARK: - Selection

    /// The variant every non-selection cell is read for: `primary` for a selected circle, the caller's variant
    /// otherwise (behavior, "`isSelected`": "A selected circle renders as `primary` renders it in every state").
    static func rendered(_ variant: DSIconButtonVariant, isSelected: Bool) -> DSIconButtonVariant {
        isSelected ? .primary : variant
    }

    // MARK: - tokens.root

    /// `tokens.root.background`: primary is the one solid (`solid(on:)`); secondary the raised puck wherever it draws a
    /// ground, which is not on inverse or accent; danger the critical tint; ghost and plain have no cell and no fill.
    static func background(_ variant: DSIconButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary:
            solid(on: material)
        case .secondary:
            switch material {
            case .inverse, .accent: nil
            case .page, .solid, .raised, .nested, .vivid, .glass, .glassLight: \.components.iconButton.secondaryBgRest
            }
        case .ghost, .plain:
            nil
        case .danger:
            \.components.iconButton.dangerBgRest
        }
    }

    /// The one solid, `tokens.root.background.primary`, which the `selected` cells repeat: white on vivid (ADR-0030
    /// §3.1), knocked out to the material's own foreground on inverse and accent (ADR-0040 §3), and the default inverse
    /// solid everywhere else, the scheme's glass and light glass included (ADR-0040 §1).
    static func solid(on material: DSSurfaceMaterial) -> DSColorPath {
        switch material {
        case .vivid: \.color.bgFillInverseMedia
        case .inverse: \.color.textOnInverse
        case .accent: \.color.textOnAccent
        case .page, .solid, .raised, .nested, .glass, .glassLight: \.components.iconButton.primaryBgRest
        }
    }

    /// `tokens.root.underlay`: the opaque `color.bg.page` disc a danger circle paints under its translucent tint on
    /// vivid, on the scheme's glass, on light glass, on inverse and on accent, so the pair the contrast gate checks —
    /// `color.text.critical` on `color.bg.tint.critical` over the page — is the pair that renders (behavior, ADR-0030
    /// §1.8 and rule 6, ADR-0040 §3.4). Nothing on the solid ladder: there the tint composites over the surface itself.
    static func underlay(_ variant: DSIconButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        guard variant == .danger else { return nil }
        switch material {
        case .vivid, .glass, .glassLight, .inverse, .accent: return \.color.bgPage
        case .page, .solid, .raised, .nested: return nil
        }
    }

    /// `tokens.root.border`: the secondary hairline, the ghost ring — which outlines itself in the material's own border
    /// on vivid and on both glasses, and in the material's own foreground on inverse and accent, as the secondary ring
    /// does there (ADR-0040 §2) — and the critical ring; primary and plain have none.
    static func border(_ variant: DSIconButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary, .plain:
            nil
        case .secondary:
            switch material {
            case .inverse: \.color.textOnInverse
            case .accent: \.color.textOnAccentSecondary
            case .page, .solid, .raised, .nested, .vivid, .glass, .glassLight: \.components.iconButton.secondaryBorder
            }
        case .ghost:
            switch material {
            case .vivid: \.color.borderOnMedia
            case .glass, .glassLight: \.color.borderOnGlassFill
            case .inverse: \.color.textOnInverse
            case .accent: \.color.textOnAccentSecondary
            case .page, .solid, .raised, .nested: \.components.iconButton.ghostBorder
            }
        case .danger:
            \.components.iconButton.dangerBorder
        }
    }

    /// `tokens.root.borderWidth`: `border.hairline` for every variant that draws a ring (ADR-0033 rule 4) and nothing
    /// for primary and plain, which draw none. The cell has no material level, so the ghost ring on vivid and glass is
    /// as wide as on a solid ground. The stroke is drawn inside the circle (`strokeBorder`), as the web's inset shadow
    /// is, and never adds to the layout.
    static func borderWidth(_ variant: DSIconButtonVariant) -> KeyPath<DSTokenSet, CGFloat>? {
        switch variant {
        case .primary, .plain: nil
        case .secondary, .ghost, .danger: \.border.hairline
        }
    }

    /// `tokens.root.radius`: `radius.control`, the pill's radius. It is at least half the side of the largest circle in
    /// every density the spec lists (`DSIconButtonBindingTests.radiusCell`), so on a square box it *is* a circle, which
    /// the view draws as `Circle()`, the focus ring as well (`DSFocusRing(.circle)`) — a `RoundedRectangle` with the
    /// continuous style would draw a squircle instead.
    static var radius: KeyPath<DSTokenSet, CGFloat> { \.radius.control }

    /// `tokens.root.size`: the side of the square box, `comp.icon-button.size.*`, which follow density (md is 32 pt in
    /// compact, 40 in regular, 48 in comfortable) and never Dynamic Type or modality.
    static func side(_ size: DSIconButtonSize, _ iconButton: DSTokenSet.Components.IconButton) -> CGFloat {
        switch size {
        case .sm: iconButton.sizeSm
        case .md: iconButton.sizeMd
        case .lg: iconButton.sizeLg
        }
    }

    /// `tokens.root.hover.overlay`, pointer only, over the circle and never over the larger hit region.
    static var hoverOverlay: DSColorPath { \.color.bgFillNeutralSubtle }

    /// `tokens.root.pressed.background`: the fill a pressed circle takes in place of its rest fill. Primary's, which a
    /// selected circle takes too, is one lightness step from its rest fill in every scheme (ADR-0039): the inverse
    /// solid's `comp.icon-button.primary.bg.pressed`, on vivid `color.bg.fill.inverse-media-pressed`, the white circle a
    /// step darker under the same ink glyph, and knocked out `color.bg.fill.on-inverse-pressed` or
    /// `color.bg.fill.on-accent-pressed` (ADR-0040 §3.5). Secondary takes the nested step; ghost and plain the neutral
    /// wash, painted on the circle only. On inverse all three take `color.bg.fill.inverse-pressed`, one lightness step of
    /// the ground, where the wash would composite to nothing, and on accent secondary takes the wash ghost and plain take
    /// (ADR-0040 §7). Danger has no cell and keeps its tint.
    static func pressedBackground(_ variant: DSIconButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary:
            switch material {
            case .vivid: \.color.bgFillInverseMediaPressed
            case .inverse: \.color.bgFillOnInversePressed
            case .accent: \.color.bgFillOnAccentPressed
            case .page, .solid, .raised, .nested, .glass, .glassLight: \.components.iconButton.primaryBgPressed
            }
        case .secondary:
            switch material {
            case .inverse: \.color.bgFillInversePressed
            case .accent: \.color.bgFillNeutralSubtle
            case .page, .solid, .raised, .nested, .vivid, .glass, .glassLight: \.components.iconButton.secondaryBgPressed
            }
        case .ghost, .plain:
            material == .inverse ? \.color.bgFillInversePressed : \.components.iconButton.ghostBgPressed
        case .danger:
            nil
        }
    }

    /// `tokens.root.pressed.overlay`: `color.bg.fill.neutral.subtle` over danger, whose tint has no pressed cell, so that
    /// no variant's press is carried by the scale alone. It is shown on **every** press, in every motion mode — unlike
    /// Button's danger substitute, which appears only under Reduce Motion.
    ///
    /// Primary and a selected circle take no overlay: their press is primary's pressed fill, one lightness step from the
    /// rest fill (ADR-0039). The overlay is the inverse solid's own colour at 6 %, so over it it would show nothing,
    /// which is what IconButton 1 drew; `DSIconButtonReduceMotionTests` measures every press with no known issue.
    static func pressedOverlay(_ variant: DSIconButtonVariant) -> DSColorPath? {
        switch variant {
        case .danger: \.color.bgFillNeutralSubtle
        case .primary, .secondary, .ghost, .plain: nil
        }
    }

    /// `tokens.root.selected.background`: the one solid — primary's rest fill.
    static func selectedBackground(on material: DSSurfaceMaterial) -> DSColorPath {
        solid(on: material)
    }

    /// The fill a circle draws: for a selected circle the `selected` cell at rest and primary's pressed cell while
    /// pressed; otherwise the pressed cell while pressed, falling back to the rest cell where the variant has none
    /// (danger); otherwise the rest cell. nil is no fill (ghost and plain at rest).
    static func fill(
        _ variant: DSIconButtonVariant,
        isSelected: Bool,
        isPressed: Bool,
        on material: DSSurfaceMaterial
    ) -> DSColorPath? {
        if isSelected {
            return isPressed ? pressedBackground(.primary, on: material) : selectedBackground(on: material)
        }
        let rest = background(variant, on: material)
        guard isPressed else { return rest }
        return pressedBackground(variant, on: material) ?? rest
    }

    // MARK: - tokens.icon

    /// `tokens.icon.size`: Icon's box of the same name — `size.icon.sm`, `.md` or `.lg` — which `DSIcon` resolves
    /// (`DSIconAppearance.box`). It is the same in every density and does not scale with Dynamic Type (Icon.yaml
    /// behavior 10): a control grows around its glyph, the glyph does not grow with it.
    static func iconSize(_ size: DSIconButtonSize) -> DSGlyphSize {
        switch size {
        case .sm: .sm
        case .md: .md
        case .lg: .lg
        }
    }

    /// `tokens.icon.color`: the glyph's colour, which the view sets as the circle's foreground so that `DSIcon`'s
    /// `inherit` tone takes it. The primary glyph is the one on the solid (`solidGlyph(on:)`). Ghost and plain take the
    /// material's own foreground off the solid ladder, plain's in the tile's second tone on accent, and secondary takes
    /// it on inverse and accent, where it draws no puck (ADR-0040 §2).
    static func foreground(_ variant: DSIconButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath {
        switch variant {
        case .primary:
            solidGlyph(on: material)
        case .secondary:
            switch material {
            case .inverse: \.color.textOnInverse
            case .accent: \.color.textOnAccent
            case .page, .solid, .raised, .nested, .vivid, .glass, .glassLight: \.components.iconButton.secondaryIcon
            }
        case .ghost, .plain:
            switch material {
            case .vivid: \.color.textOnVivid
            case .glass: \.color.textOnGlassFill
            case .glassLight: \.color.textOnGlassLight
            case .inverse: \.color.textOnInverse
            case .accent: variant == .ghost ? \.color.textOnAccent : \.color.textOnAccentSecondary
            case .page, .solid, .raised, .nested: variant == .ghost ? \.components.iconButton.ghostIcon : \.components.iconButton.plainIcon
            }
        case .danger:
            \.components.iconButton.dangerIcon
        }
    }

    /// The glyph on the one solid, `tokens.icon.color.primary`, which the `selected` cells repeat: ink on the white
    /// circle on vivid, the material's own fill on the knocked-out circle on inverse and accent, and primary's glyph
    /// everywhere else.
    static func solidGlyph(on material: DSSurfaceMaterial) -> DSColorPath {
        switch material {
        case .vivid: \.color.textOnInverseMedia
        case .inverse: \.color.bgFillInverse
        case .accent: \.color.bgFillAccent
        case .page, .solid, .raised, .nested, .glass, .glassLight: \.components.iconButton.primaryIcon
        }
    }

    /// `tokens.icon.selected.color`: the glyph on the one solid — primary's glyph.
    static func selectedForeground(on material: DSSurfaceMaterial) -> DSColorPath {
        solidGlyph(on: material)
    }

    /// The glyph's colour for a circle, selected or not.
    static func glyph(_ variant: DSIconButtonVariant, isSelected: Bool, on material: DSSurfaceMaterial) -> DSColorPath {
        isSelected ? selectedForeground(on: material) : foreground(variant, on: material)
    }

    // MARK: - tokens.badge

    /// `tokens.badge.offset`: `space.1`, how far past the circle's top edge and its trailing edge the badge in the
    /// `badge` slot is anchored. The offset is the host's: Badge applies none of its own (Badge.yaml behavior 13).
    static var badgeOffset: KeyPath<DSTokenSet, CGFloat> { \.space.step1 }

    // MARK: - motion

    /// `motion.press`: `motion.spring.snappy`. The key path is what the binding test holds against the spec's cell.
    static var pressSpring: KeyPath<DSTokenSet, DSSpringToken> { \.motion.springSnappy }

    /// `motion.select`: `motion.spring.smooth`.
    static var selectSpring: KeyPath<DSTokenSet, DSSpringToken> { \.motion.springSmooth }

    /// `motion.reduceMotion`: `crossfade`. Under Reduce Motion nothing scales, and the pressed fill, the pressed
    /// overlay and the selected solid change over `motion.duration.base` with `motion.easing.out`.
    static let reduceMotion: DSReduceMotionBehavior = .crossfade

    /// `haptics.press`: `haptic.press.button`, played when a press starts, and the only haptic an IconButton plays. A
    /// group that selects plays `haptic.selection` in its place (behavior; spec/haptics.yaml: at most one haptic per
    /// user action, and none on a programmatic change such as `isSelected`).
    static let pressHaptic: DSHaptic = .pressButton

    /// The animation of a press and its release: the snappy spring, or under Reduce Motion the fill and overlay change
    /// over `motion.duration.base` with `motion.easing.out` (Button's `DSControlAppearance.pressAnimation`).
    static func pressAnimation(_ motion: DSMotion) -> Animation {
        DSControlAppearance.pressAnimation(motion.tokens.springSnappy, motion: motion)
    }

    /// The animation of a change of `isSelected`: the smooth spring, or under Reduce Motion a crossfade to the inverse
    /// solid over `motion.duration.base` with `motion.easing.out` (Card's `selectAnimation`).
    static func selectAnimation(_ motion: DSMotion) -> Animation {
        motion.isReduced ? motion.presentation : motion.smooth
    }
}
