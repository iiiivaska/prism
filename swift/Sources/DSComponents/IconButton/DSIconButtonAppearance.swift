import SwiftUI
import DSCore
import DSTokens

/// Every value `spec/components/IconButton.yaml` (specVersion 1) binds, as pure functions of the variant, the size and
/// the material the enclosing Surface publishes, so the binding matrix runs on the host. `DSIconButton` only draws what
/// these return.
///
/// A cell keyed by a material applies when the enclosing Surface publishes that material, not because the button asked
/// for it (spec/SCHEMA.md, ADR-0022 §3.1): under the glass fallback the Surface publishes `raised`, and the circle takes
/// its `default` cells with it (`accessibility.reduceTransparency`). A value with no cell takes `default`, and with no
/// `default` either the property is not set — which is how `ghost` and `plain` have no fill at rest and `primary` and
/// `plain` no ring (ADR-0029 §3.3).
///
/// **A selected circle is `primary`, cell for cell** (behavior, "`isSelected`"). The fill — pressed or not, as the
/// web's `[data-ds-selected]` fill is — and the glyph read the spec's own `selected` cells, and every other cell — the
/// underlay, the ring and its width, and the pressed overlay — is read for `rendered(_:isSelected:)`, which is
/// `primary` for a selected circle. So a selected `danger` has no red ring and no underlay, and a pressed selected
/// `ghost` takes primary's pressed overlay rather than the ghost's pressed wash.
/// `DSIconButtonBindingTests.aSelectedCircleIsPrimaryCellForCell` holds the `selected` cells to primary's on every
/// material, and primary's pressed fill to its rest fill in value, so the day the spec or the tokens separate them that
/// test fails and this rule is read again.
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

    /// Whether a material is one the spec keys its media cells by: vivid and the scheme's glass. Light glass is not
    /// one of them — IconButton.yaml writes no `glassLight` cell — so a circle on light glass takes its `default`
    /// cells, and a danger circle there paints no underlay (Button's own `underlay` adds light glass; this spec does
    /// not).
    static func isMedia(_ material: DSSurfaceMaterial) -> Bool {
        material == .vivid || material == .glass
    }

    // MARK: - tokens.root

    /// `tokens.root.background`: primary is the inverse solid, white on vivid and on the scheme's glass (ADR-0030
    /// §3.1); secondary the raised puck; danger the critical tint; ghost and plain have no cell and no fill.
    static func background(_ variant: DSIconButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary: isMedia(material) ? \.color.bgFillInverseMedia : \.components.iconButton.primaryBgRest
        case .secondary: \.components.iconButton.secondaryBgRest
        case .ghost, .plain: nil
        case .danger: \.components.iconButton.dangerBgRest
        }
    }

    /// `tokens.root.underlay`: the opaque `color.bg.page` disc a danger circle paints under its translucent tint on
    /// vivid and on the scheme's glass, so the pair the contrast gate checks — `color.text.critical` on
    /// `color.bg.tint.critical` over the page — is the pair that renders (behavior, ADR-0030 §1.8). Nothing anywhere
    /// else: on every other material the tint composites over the surface itself.
    static func underlay(_ variant: DSIconButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        variant == .danger && isMedia(material) ? \.color.bgPage : nil
    }

    /// `tokens.root.border`: the secondary hairline, the ghost ring — which outlines itself in the material's own
    /// border on vivid and on the scheme's glass — and the critical ring; primary and plain have none.
    static func border(_ variant: DSIconButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary, .plain:
            nil
        case .secondary:
            \.components.iconButton.secondaryBorder
        case .ghost:
            switch material {
            case .vivid: \.color.borderOnMedia
            case .glass: \.color.borderOnGlassFill
            default: \.components.iconButton.ghostBorder
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

    /// `tokens.root.pressed.background`: the fill a pressed circle takes in place of its rest fill. Primary carries a
    /// material level (white on vivid and on the scheme's glass, so its ink glyph stays on a white circle); secondary
    /// the nested step; ghost and plain the neutral wash, painted on the circle only; danger has no cell and keeps its
    /// tint.
    static func pressedBackground(_ variant: DSIconButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary: isMedia(material) ? \.color.bgFillInverseMedia : \.components.iconButton.primaryBgPressed
        case .secondary: \.components.iconButton.secondaryBgPressed
        case .ghost, .plain: \.components.iconButton.ghostBgPressed
        case .danger: nil
        }
    }

    /// `tokens.root.pressed.overlay`: `color.bg.fill.neutral.subtle` over primary and danger, whose pressed cell carries
    /// their rest value, so that no variant's press is carried by the scale alone. It is shown on **every** press, in
    /// every motion mode — unlike Button's danger substitute, which appears only under Reduce Motion.
    ///
    /// **Known gap (behavior, `accessibility.reduceMotion`).** Over `color.bg.fill.inverse` the overlay composites to
    /// nothing in both schemes — it is the inverse fill's own ink at 6 % in light, and white at 6 % over white in dark —
    /// and over `color.bg.fill.inverse-media` it does so in dark. So a pressed primary or selected circle on a solid
    /// ground, and on vivid or glass in dark, shows its press only by the scale, and under Reduce Motion not at all. It
    /// is Button's gap (`DSButtonAppearance.reducedMotionPressOverlay`), held as a known issue by
    /// `DSIconButtonReduceMotionTests`, and it lasts until the primary pressed cells get a step of their own.
    static func pressedOverlay(_ variant: DSIconButtonVariant) -> DSColorPath? {
        switch variant {
        case .primary, .danger: \.color.bgFillNeutralSubtle
        case .secondary, .ghost, .plain: nil
        }
    }

    /// `tokens.root.selected.background`: the inverse solid, white on vivid and on the scheme's glass — primary's rest
    /// fill.
    static func selectedBackground(on material: DSSurfaceMaterial) -> DSColorPath {
        isMedia(material) ? \.color.bgFillInverseMedia : \.components.iconButton.primaryBgRest
    }

    /// The fill a circle draws: the `selected` cell for a selected circle, pressed or not; otherwise the pressed cell
    /// while pressed, falling back to the rest cell where the variant has none (danger); otherwise the rest cell. nil
    /// is no fill (ghost and plain at rest).
    static func fill(
        _ variant: DSIconButtonVariant,
        isSelected: Bool,
        isPressed: Bool,
        on material: DSSurfaceMaterial
    ) -> DSColorPath? {
        if isSelected { return selectedBackground(on: material) }
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
    /// `inherit` tone takes it. On vivid and on the scheme's glass the primary glyph is ink on the white circle, and the
    /// ghost and plain glyphs take that material's own foreground.
    static func foreground(_ variant: DSIconButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath {
        switch variant {
        case .primary:
            isMedia(material) ? \.color.textOnInverseMedia : \.components.iconButton.primaryIcon
        case .secondary:
            \.components.iconButton.secondaryIcon
        case .ghost, .plain:
            switch material {
            case .vivid: \.color.textOnVivid
            case .glass: \.color.textOnGlassFill
            default: variant == .ghost ? \.components.iconButton.ghostIcon : \.components.iconButton.plainIcon
            }
        case .danger:
            \.components.iconButton.dangerIcon
        }
    }

    /// `tokens.icon.selected.color`: the glyph on the inverse solid — primary's glyph.
    static func selectedForeground(on material: DSSurfaceMaterial) -> DSColorPath {
        isMedia(material) ? \.color.textOnInverseMedia : \.components.iconButton.primaryIcon
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
