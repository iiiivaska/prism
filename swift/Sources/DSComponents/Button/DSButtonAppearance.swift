import SwiftUI
import DSCore
import DSTokens

/// Every value `spec/components/Button.yaml` (specVersion 3) binds, as pure functions of the variant, the size and the
/// material the enclosing Surface publishes, so the binding matrix runs on the host. `DSButton` only draws what these
/// return.
///
/// A cell keyed by a material applies when the enclosing Surface publishes that material, not because the button asked
/// for it (spec/SCHEMA.md, ADR-0022 §3.1); a value with no cell takes `default`, and with no `default` either the
/// property is not set, which is how the ghost pill has no fill at rest (ADR-0029 §3.3).
nonisolated enum DSButtonAppearance {
    // MARK: - tokens.root

    /// `tokens.root.background`: primary is the inverse solid, white on vivid (ADR-0030 §3.1); ghost has no cell.
    static func background(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary: material == .vivid ? \.color.bgFillInverseMedia : \.components.button.primaryBgRest
        case .secondary: \.components.button.secondaryBgRest
        case .ghost: nil
        case .danger: \.components.button.dangerBgRest
        }
    }

    /// `tokens.root.foreground`, which is also the colour of the label, the icons and the spinner's default.
    static func foreground(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath {
        switch variant {
        case .primary:
            material == .vivid ? \.color.textOnInverseMedia : \.components.button.primaryText
        case .secondary:
            \.components.button.secondaryText
        case .ghost:
            switch material {
            case .vivid: \.color.textOnVivid
            case .glass: \.color.textOnGlassFill
            default: \.components.button.ghostText
            }
        case .danger:
            \.components.button.dangerText
        }
    }

    /// `tokens.root.border`: primary has none.
    static func border(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary:
            nil
        case .secondary:
            \.components.button.secondaryBorder
        case .ghost:
            switch material {
            case .vivid: \.color.borderOnMedia
            case .glass: \.color.borderOnGlassFill
            default: \.components.button.ghostBorder
            }
        case .danger:
            \.components.button.dangerBorder
        }
    }

    /// The width of the outline. Button.yaml binds no width; the signed-off direction board draws every pill outline
    /// at `border.hairline` (docs/direction-board, `.btn-secondary`, `.btn-ghost`, `.btn-danger`).
    static func borderWidth(_ border: DSTokenSet.Border) -> CGFloat {
        border.hairline
    }

    /// `tokens.root.pressed.background`; danger has no cell and keeps its tint.
    ///
    /// Primary's pressed cell carries no material level, and in light `comp.button.primary.bg.pressed` is the ink
    /// solid while the vivid label is `color.text.on-inverse-media`, also ink, so read literally a pressed primary on
    /// vivid would lose its label. The pressed cell is the rest cell's own token (`comp.button.primary.bg.pressed` and
    /// `.rest` both alias `color.bg.fill.inverse`), so on vivid the pressed pill keeps its vivid rest fill,
    /// `color.bg.fill.inverse-media`.
    static func pressedBackground(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary: material == .vivid ? \.color.bgFillInverseMedia : \.components.button.primaryBgPressed
        case .secondary: \.components.button.secondaryBgPressed
        case .ghost: \.components.button.ghostBgPressed
        case .danger: nil
        }
    }

    /// What replaces the press scale under Reduce Motion (Button.yaml `accessibility.reduceMotion`): the variant's
    /// pressed background, which every variant but danger already shows while pressed, and for danger
    /// `color.bg.fill.neutral.subtle`, laid over its tint so the critical ground stays.
    ///
    /// **Known gap: a pressed `primary` shows nothing under Reduce Motion.** ADR-0023 §8.4 item 2 asks the press
    /// scale to be replaced by a visible opacity or colour change to a token the spec names, and Button.yaml names
    /// `comp.button.primary.bg.pressed`. That token and `comp.button.primary.bg.rest` both alias
    /// `color.bg.fill.inverse` in every context, and on vivid both cells are forced to `color.bg.fill.inverse-media`,
    /// so the fill the spec names as the substitute is the fill already on screen. Nothing scales
    /// (`DSControlAppearance.scale`), and under touch modality there is no hover overlay either, so a Reduce Motion
    /// phone user pressing the default variant gets only the haptic.
    ///
    /// **Why this is not fixed here.** Adding `color.bg.fill.neutral.subtle` for primary, the substitute danger and
    /// Card use, composites to nothing on this ground: it is `color.neutral.950` at 6 % over `color.bg.fill.inverse`,
    /// which *is* `color.neutral.950`, in light, and `#ffffff` at 6 % over white in dark. The fix is
    /// `comp.button.primary.bg.pressed` in `tokens/comp/button.tokens.json` taking a value that differs from `.rest`
    /// — one step of the luminance ladder, as `comp.list-row.bg.pressed` does — with Button.yaml
    /// `accessibility.reduceMotion` amended to match and a specVersion bump. `DSButtonReduceMotionTests` holds the
    /// gap as a known issue, so the day that token changes the suite fails until this is reread.
    static func reducedMotionPressOverlay(_ variant: DSButtonVariant) -> DSColorPath? {
        variant == .danger ? \.color.bgFillNeutralSubtle : nil
    }

    /// `tokens.root.hover.overlay`, pointer only.
    static var hoverOverlay: DSColorPath { \.color.bgFillNeutralSubtle }

    /// The page under the danger tint over media: "a tinted element that carries text or a glyph over media paints
    /// `color.bg.page` under its tint", the danger button among them (ADR-0030 §6.2 and rule 6). Button.yaml v3 has no
    /// underlay cell, so the published materials that mean media are the ones IconButton.yaml keys its `underlay` by,
    /// vivid and the scheme's glass, and light glass, which only sits over imagery.
    static func underlay(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        guard variant == .danger else { return nil }
        switch material {
        case .vivid, .glass, .glassLight: return \.color.bgPage
        default: return nil
        }
    }

    /// `tokens.spinner.color`: primary and secondary bind their text tokens.
    ///
    /// Ghost and danger bind no cell, so their spinner takes Spinner.yaml's own arc for the published material. The
    /// primary cell carries no material level either, and on vivid `comp.button.primary.text` is the colour of the
    /// white pill it would sit on; there the spinner takes the pill's foreground, which is what Spinner.yaml says a
    /// Button binds ("Button binds its own foreground per variant").
    static func spinner(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath {
        switch variant {
        case .primary:
            material == .vivid ? foreground(.primary, on: material) : \.components.button.primaryText
        case .secondary:
            \.components.button.secondaryText
        case .ghost, .danger:
            spinnerArc(on: material)
        }
    }

    /// Spinner.yaml `tokens.arc.color`.
    static func spinnerArc(on material: DSSurfaceMaterial) -> DSColorPath {
        switch material {
        case .vivid: \.color.textOnVivid
        case .inverse: \.color.textOnInverse
        case .accent: \.color.textOnAccent
        case .glass: \.color.textOnGlassFill
        case .glassLight: \.color.textOnGlassLight
        case .page, .solid, .raised, .nested: \.components.spinner.arc
        }
    }

    /// `tokens.root.height`.
    static func height(_ size: DSButtonSize, _ button: DSTokenSet.Components.Button) -> CGFloat {
        switch size {
        case .sm: button.heightSm
        case .md: button.heightMd
        case .lg: button.heightLg
        }
    }

    /// `tokens.root.paddingX`.
    static func paddingX(_ size: DSButtonSize, _ button: DSTokenSet.Components.Button) -> CGFloat {
        switch size {
        case .sm: button.paddingXSm
        case .md: button.paddingXMd
        case .lg: button.paddingXLg
        }
    }

    // MARK: - Rules

    /// The largest Dynamic Type size the label and the height scale to (Button.yaml `accessibility.dynamicType`).
    static let largestTypeSize: DynamicTypeSize = .accessibility3

    /// "Labels never wrap": one line, truncated with an ellipsis. Past accessibility3, where the height clamps, the
    /// label wraps to two lines instead (Button.yaml `accessibility.dynamicType`).
    static func labelLines(at typeSize: DynamicTypeSize) -> Int {
        typeSize > largestTypeSize ? 2 : 1
    }

    /// The icon slots that render: on watchOS there is no trailing icon (`notes.platform.watchos`).
    static func trailingIcon<Icon>(_ icon: Icon?, isWatch: Bool = DSPlatform.isWatch) -> Icon? {
        isWatch ? nil : icon
    }
}
