import SwiftUI
import DSCore
import DSTokens

/// Every value `spec/components/Button.yaml` (specVersion 7) binds, as pure functions of the variant, the size and the
/// material the enclosing Surface publishes, so the binding matrix runs on the host, and the name a loading button
/// speaks, as a pure function of its label and the strings table. `DSButton` only draws and names what these return.
///
/// A cell keyed by a material applies when the enclosing Surface publishes that material, not because the button asked
/// for it (spec/SCHEMA.md, ADR-0022 §3.1); a value with no cell takes `default`, and with no `default` either the
/// property is not set, which is how the ghost pill has no fill at rest (ADR-0029 §3.3), and secondary none on
/// `inverse` and `accent`.
///
/// **On `inverse` and `accent` the one solid knocks out** (ADR-0040 §3): the primary pill fills with the material's own
/// foreground and its label takes the material's fill, pressed one lightness step of its own. No other pill draws a
/// ground there, and every outline and label takes the material's foreground (§2). On the scheme's glass and on light
/// glass the primary pill is its default inverse solid, ink on light glass and white on smoke (ADR-0030 §3.1, ADR-0040 §1).
nonisolated enum DSButtonAppearance {
    // MARK: - tokens.root

    /// `tokens.root.background`: primary is the inverse solid, white on vivid (ADR-0030 §3.1) and knocked out on inverse
    /// and accent; secondary is the raised pill wherever it draws a ground, which is not on inverse or accent; ghost has
    /// no cell.
    static func background(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary:
            switch material {
            case .vivid: \.color.bgFillInverseMedia
            case .inverse: \.color.textOnInverse
            case .accent: \.color.textOnAccent
            case .page, .solid, .raised, .nested, .glass, .glassLight: \.components.button.primaryBgRest
            }
        case .secondary:
            switch material {
            case .inverse, .accent: nil
            case .page, .solid, .raised, .nested, .vivid, .glass, .glassLight: \.components.button.secondaryBgRest
            }
        case .ghost: nil
        case .danger: \.components.button.dangerBgRest
        }
    }

    /// `tokens.root.foreground`, which is also the colour of the label and the icons.
    static func foreground(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath {
        switch variant {
        case .primary:
            switch material {
            case .vivid: \.color.textOnInverseMedia
            case .inverse: \.color.bgFillInverse
            case .accent: \.color.bgFillAccent
            case .page, .solid, .raised, .nested, .glass, .glassLight: \.components.button.primaryText
            }
        case .secondary:
            switch material {
            case .inverse: \.color.textOnInverse
            case .accent: \.color.textOnAccent
            case .page, .solid, .raised, .nested, .vivid, .glass, .glassLight: \.components.button.secondaryText
            }
        case .ghost:
            switch material {
            case .vivid: \.color.textOnVivid
            case .glass: \.color.textOnGlassFill
            case .glassLight: \.color.textOnGlassLight
            case .inverse: \.color.textOnInverse
            case .accent: \.color.textOnAccent
            case .page, .solid, .raised, .nested: \.components.button.ghostText
            }
        case .danger:
            \.components.button.dangerText
        }
    }

    /// `tokens.root.border`: primary has none; on inverse and accent secondary and ghost outline in the material's own
    /// foreground, full on inverse and the tile's second tone on accent (ADR-0040 §2).
    static func border(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary:
            nil
        case .secondary:
            switch material {
            case .inverse: \.color.textOnInverse
            case .accent: \.color.textOnAccentSecondary
            case .page, .solid, .raised, .nested, .vivid, .glass, .glassLight: \.components.button.secondaryBorder
            }
        case .ghost:
            switch material {
            case .vivid: \.color.borderOnMedia
            case .glass, .glassLight: \.color.borderOnGlassFill
            case .inverse: \.color.textOnInverse
            case .accent: \.color.textOnAccentSecondary
            case .page, .solid, .raised, .nested: \.components.button.ghostBorder
            }
        case .danger:
            \.components.button.dangerBorder
        }
    }

    /// `tokens.root.borderWidth`: `border.hairline` for every outlined variant and nothing for primary, which has no
    /// outline. The cell has no material level, so the ghost outline on vivid and glass is as wide as on a solid
    /// ground; the width is the signed-off direction board's (docs/direction-board, `.btn-secondary`, `.btn-ghost`,
    /// `.btn-danger`; ADR-0033). The stroke is drawn inside the pill (`strokeBorder`), as the web's inset shadow is,
    /// and never adds to the layout.
    static func borderWidth(_ variant: DSButtonVariant) -> KeyPath<DSTokenSet, CGFloat>? {
        switch variant {
        case .primary: nil
        case .secondary, .ghost, .danger: \.border.hairline
        }
    }

    /// `tokens.root.pressed.background`; danger has no cell and keeps its tint.
    ///
    /// Primary's pressed cell is one lightness step from its rest cell in every scheme (ADR-0039):
    /// `comp.button.primary.bg.pressed`, which aliases `color.bg.fill.inverse-pressed`, on vivid
    /// `color.bg.fill.inverse-media-pressed`, the white pill one step darker under the same ink label, and knocked out
    /// `color.bg.fill.on-inverse-pressed` or `color.bg.fill.on-accent-pressed` (ADR-0040 §3.5). On inverse secondary and
    /// ghost take `color.bg.fill.inverse-pressed`, one lightness step of the ground, where the neutral wash would show
    /// nothing, and on accent secondary takes ghost's wash, `color.bg.fill.neutral.subtle` (ADR-0040 §7).
    static func pressedBackground(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        switch variant {
        case .primary:
            switch material {
            case .vivid: \.color.bgFillInverseMediaPressed
            case .inverse: \.color.bgFillOnInversePressed
            case .accent: \.color.bgFillOnAccentPressed
            case .page, .solid, .raised, .nested, .glass, .glassLight: \.components.button.primaryBgPressed
            }
        case .secondary:
            switch material {
            case .inverse: \.color.bgFillInversePressed
            case .accent: \.color.bgFillNeutralSubtle
            case .page, .solid, .raised, .nested, .vivid, .glass, .glassLight: \.components.button.secondaryBgPressed
            }
        case .ghost:
            material == .inverse ? \.color.bgFillInversePressed : \.components.button.ghostBgPressed
        case .danger:
            nil
        }
    }

    /// What replaces the press scale under Reduce Motion (Button.yaml `accessibility.reduceMotion`, ADR-0023 §8.4 item
    /// 2): the variant's pressed background, which every variant but danger already shows while pressed, and for danger
    /// `color.bg.fill.neutral.subtle`, laid over its tint so the critical ground stays.
    ///
    /// Primary needs no overlay: its pressed background is one lightness step from its rest fill (ADR-0039). An overlay
    /// of `color.bg.fill.neutral.subtle` would show nothing there, since it is the inverse solid's own colour at 6 %,
    /// which is why primary's press is a fill of its own. `DSButtonReduceMotionTests` measures every variant's press on
    /// the page and on vivid in both schemes, with no known issue.
    static func reducedMotionPressOverlay(_ variant: DSButtonVariant) -> DSColorPath? {
        variant == .danger ? \.color.bgFillNeutralSubtle : nil
    }

    /// `tokens.root.hover.overlay`, pointer only.
    static var hoverOverlay: DSColorPath { \.color.bgFillNeutralSubtle }

    /// `tokens.root.underlay`: the page a danger tint paints under itself on vivid, on the scheme's glass, on light glass,
    /// on inverse and on accent, so the pair it carries is the pair the contrast gate checks (ADR-0030 §6.2 and rule 6,
    /// ADR-0040 §3.4). Nothing anywhere else: on the solid ladder the tint composites over the surface itself.
    static func underlay(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath? {
        guard variant == .danger else { return nil }
        switch material {
        case .vivid, .glass, .glassLight, .inverse, .accent: return \.color.bgPage
        case .page, .solid, .raised, .nested: return nil
        }
    }

    /// `tokens.spinner.color`: primary and secondary bind their pill's foreground on every material, the knocked-out
    /// label on inverse and accent included, so the spinner turns in the colour of the label it replaces.
    ///
    /// Ghost and danger bind no cell, so their spinner takes Spinner.yaml's own arc for the published material.
    static func spinner(_ variant: DSButtonVariant, on material: DSSurfaceMaterial) -> DSColorPath {
        switch variant {
        case .primary, .secondary:
            foreground(variant, on: material)
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

    /// `tokens.leadingIcon.size` and `tokens.trailingIcon.size`: both icons are Icon's `md` box, `size.icon.md`, the
    /// box every control carries (Icon.yaml behavior 10). `DSIcon` resolves the box from it.
    static let iconSize: DSGlyphSize = .md

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

    // MARK: - What a loading button says (behavior 3)

    /// The name a loading button speaks: the app's `strings.Button.loading` template with `{label}` filled by the
    /// button's label, placed as written and never scanned again — "Saving, loading" under the English defaults. The
    /// words are the table's, not Button's (ADR-0032 rules 1 and 2), so an app that sets its own template once, at the
    /// root (`DSTheme(strings:)`), hears it on every loading button. `label` is the string the caller's label resolves
    /// to where the button renders (`DSButton.loadingName(locale:strings:)`). The web's twin fills the same template
    /// with `fillTemplate` in `Button.tsx`.
    static func loadingName(_ label: String, strings: DSStrings) -> String {
        DSStrings.fill(strings.buttonLoading, ["label": label])
    }
}
