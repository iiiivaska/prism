import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// Every value `spec/components/Chip.yaml` (specVersion 1) binds, as pure functions of the size, the selection and the
/// context the pill reads, and the rules of behavior 1 and the leading and trailing positions as pure functions of the
/// props, so the binding matrix and the role run on the host. `DSChip` only draws and exposes what these return.
///
/// **Two contexts.** `background(on:)` is asked on the ground the pill sits on, and the Surface module's glass chip
/// shape resolves it (`dsSurfaceChip`, ADR-0036 §2 to §7): the recipe over a map, an image, vivid or the scheme's
/// glass, `comp.chip.bg.rest` on every other ground but accent and inverse, and nothing on those two. Every other part —
/// the label, the glyphs, the check and the stroke — is asked on the context the chip **publishes**, never on the
/// ground: while glass or the own cell renders that is the ground itself, so the parts key on the media under the
/// glass, and under the fallback it is `(raised, none)`, so every part takes its `default` cell and the check goes, by
/// construction (ADR-0036 §4, `accessibility.reduceTransparency`). Chip reads no setting and draws no fallback of its
/// own.
///
/// **No input state reaches the chip shape.** `background(on:)` takes the ground and nothing else: the hover overlay
/// and the pressed fill are layers painted over whatever the chip renders (`hoverOverlay`, `pressedOverlay`), so no
/// press or hover switches the pill between the recipe and its own cell (ADR-0037 §5, rule 4).
///
/// The web's twins are `web/packages/react/src/chip/parts.ts` for the rules and the `--ds--chip-*` properties of
/// `Chip.css` for the bindings. Both stacks read the same cells out of the same spec (`DSChipBindingTests`,
/// `web/packages/react/test/chip.test.tsx`).
nonisolated enum DSChipAppearance {
    // MARK: - The ground

    /// Whether a context puts the chip over media: the page over a map, an image or vivid, a vivid Surface, or the
    /// scheme's glass — the grounds where Chip.yaml keys its media cells, and where `root.background` binds
    /// `material.glass.chip`. Light glass is not one of them: Chip.yaml writes it the pill's own fill, so every part
    /// takes its `default` cell there.
    static func isOverMedia(_ context: DSSurfaceContext) -> Bool {
        switch context.material {
        case .page: context.backdrop != .none
        case .vivid, .glass: true
        case .solid, .raised, .nested, .glassLight, .inverse, .accent: false
        }
    }

    /// Behavior, "Over media that ladder collapses": a selected chip draws status.check over media, where every tone is
    /// one glass foreground, and on inverse, where every tone is `color.text.on-inverse`. Asked on the published
    /// context, so under the fallback, which publishes `raised`, there is no check. The web's twin is `showsChipCheck`.
    static func showsCheck(on context: DSSurfaceContext) -> Bool {
        isOverMedia(context) || context.material == .inverse
    }

    // MARK: - What a chip is (behavior 1)

    /// The role, from the props alone: a filter when `isSelected` is set, true or false; a button when it is unset and
    /// the chip has `onPress` or `isRemovable`; a static label otherwise. The web's twin is `chipKind`.
    static func kind(isSelected: Bool?, hasPress: Bool, isRemovable: Bool) -> DSChipKind {
        if isSelected != nil { return .filter }
        return hasPress || isRemovable ? .button : .label
    }

    // MARK: - tokens.root

    /// `tokens.root.background`, as the glass chip shape asks for it (ADR-0036 §2.2): `glass` where the cell binds
    /// `material.glass.chip`, the pill's own `comp.chip.bg.rest` on the page over nothing, the solid ladder and light
    /// glass, and `none` on accent and inverse, where the matrix has no cell and no `default` (behavior, "On an accent
    /// or an inverse surface"). The chip decides whether the recipe renders or falls back; Chip only names the cell.
    static func background(on ground: DSSurfaceContext) -> DSSurfaceChipCell {
        if ground.material == .inverse || ground.material == .accent { return DSSurfaceChipCell.none }
        if isOverMedia(ground) { return .glass }
        return .own(\.components.chip.bgRest)
    }

    /// `tokens.root.border`, and `tokens.root.selected.border` when selected, on the published context: the chip's own
    /// hairline and selected strokes by default; `color.border.on-glass-fill` over a map, an image and the scheme's
    /// glass; `color.border.on-media` over vivid (ADR-0030 §3.2); and `color.text.on-inverse` on inverse, at rest and
    /// selected, where the chip's own strokes would vanish.
    static func border(on context: DSSurfaceContext, isSelected: Bool) -> DSColorPath {
        switch context.material {
        case .page:
            switch context.backdrop {
            case .none: isSelected ? \.components.chip.borderSelected : \.components.chip.borderRest
            case .map, .image: \.color.borderOnGlassFill
            case .vivid: \.color.borderOnMedia
            }
        case .vivid: \.color.borderOnMedia
        case .glass: \.color.borderOnGlassFill
        case .inverse: \.color.textOnInverse
        case .solid, .raised, .nested, .glassLight, .accent:
            isSelected ? \.components.chip.borderSelected : \.components.chip.borderRest
        }
    }

    /// `tokens.root.borderWidth`, `border.hairline`, and `tokens.root.selected.borderWidth`, `border.strong`: the stroke
    /// thickens with selection on every material (behavior, "`isSelected` thickens the stroke").
    static func borderWidth(isSelected: Bool) -> KeyPath<DSTokenSet, CGFloat> {
        isSelected ? \.border.strong : \.border.hairline
    }

    /// `tokens.root.radius`: `radius.chip`, the pill's radius. It is at least half the height of the tallest chip in
    /// every density the spec lists (`DSChipBindingTests.radiusCell`), so the pill's ends are round. `DSChipPill` draws
    /// the pill as the continuous rounded rectangle at this radius that Button draws for its own.
    static var radius: KeyPath<DSTokenSet, CGFloat> { \.radius.chip }

    /// `tokens.root.height`: the pill's height, the control height of the size — `size.control.sm` or `.md` — which
    /// follows density. The pill grows with its label along the label's Dynamic Type style.
    static func height(_ size: DSChipSize) -> KeyPath<DSTokenSet, CGFloat> {
        switch size {
        case .sm: \.size.controlSm
        case .md: \.size.controlMd
        }
    }

    /// `tokens.root.paddingX`: `space.4` on sm and `space.5` on md, the same in every density.
    static func paddingX(_ size: DSChipSize) -> KeyPath<DSTokenSet, CGFloat> {
        switch size {
        case .sm: \.space.step4
        case .md: \.space.step5
        }
    }

    /// `tokens.root.gap`: `space.2` between the leading position, the label and the trailing position.
    static var gap: KeyPath<DSTokenSet, CGFloat> { \.space.step2 }

    /// Behavior, "An identifier chip may put an Avatar": the inset the Avatar keeps above, below and before it on the
    /// md chip — half of `size.control.md` less `size.control.sm`, 2 to 4 pt by density — so the circle is concentric
    /// with the pill's leading end.
    static func avatarInset(_ tokens: DSTokenSet) -> CGFloat {
        (tokens.size.controlMd - tokens.size.controlSm) / 2
    }

    /// The leading padding: the Avatar's inset while the Avatar leads, `root.paddingX` otherwise.
    static func leadingPadding(_ size: DSChipSize, leading: DSChipLeading, _ tokens: DSTokenSet) -> CGFloat {
        leading == .avatar ? avatarInset(tokens) : tokens[keyPath: paddingX(size)]
    }

    /// `tokens.root.hover.overlay`: `color.bg.fill.neutral.subtle` over the pill under pointer modality, a layer over
    /// whatever the chip renders.
    static var hoverOverlay: DSColorPath { \.color.bgFillNeutralSubtle }

    /// `tokens.root.pressed.overlay`: `comp.chip.bg.pressed`, a layer over whatever the chip renders on every press and
    /// in every motion mode, with no material axis: a pressed glass chip keeps its glass under it (behavior).
    static var pressedOverlay: DSColorPath { \.components.chip.bgPressed }

    /// `tokens.root.focus-visible.ring` and `.ringWidth`: `color.border.focus` at `border.focus` outside the pill, and
    /// outside the remove control's glyph when that control has focus. `DSFocusRing` draws both.
    static var focusRing: DSColorPath { \.color.borderFocus }
    static var focusRingWidth: KeyPath<DSTokenSet, CGFloat> { \.border.focus }

    /// `tokens.root.disabled.opacity`: `opacity.disabled`, on the whole pill.
    static var disabledOpacity: KeyPath<DSTokenSet, Double> { \.opacity.disabled }

    // MARK: - tokens.label

    /// `tokens.label.typography`: `type.label.sm` or `.md`, by size.
    static func labelRole(_ size: DSChipSize) -> DSTextRole {
        switch size {
        case .sm: .labelSm
        case .md: .labelMd
        }
    }

    /// `tokens.label.color`, and `tokens.label.selected.color` when selected, on the published context: the secondary
    /// and primary text tones by default, the glass fill's one foreground over media, the lit tile's two tones on
    /// accent, and `color.text.on-inverse` on inverse.
    static func labelColor(on context: DSSurfaceContext, isSelected: Bool) -> DSColorPath {
        if isOverMedia(context) { return \.color.textOnGlassFill }
        switch context.material {
        case .accent: return isSelected ? \.color.textOnAccent : \.color.textOnAccentSecondary
        case .inverse: return \.color.textOnInverse
        default: return isSelected ? \.color.textPrimary : \.color.textSecondary
        }
    }

    // MARK: - tokens.leadingIcon and tokens.trailingIcon

    /// `tokens.leadingIcon.size` and `tokens.trailingIcon.size`: Icon's `sm` box, which `DSIcon` resolves
    /// (`DSIconAppearance.box`), the same in every density.
    static let iconSize: DSGlyphSize = .sm

    /// The glyph the leading position draws while a selected chip sits where the ladder collapses (behavior).
    static let checkIcon: DSIconName = .statusCheck

    /// The glyph the remove control draws in the trailing position (behavior, "`isRemovable` renders nav.close").
    static let removeIcon: DSIconName = .navClose

    /// `tokens.leadingIcon.color`, and `.selected.color` when selected, on the published context: the icon tones by
    /// default, the glass fill's one foreground over media, the lit tile's two tones on accent, and
    /// `color.text.on-inverse` on inverse. The check takes the same cell.
    static func leadingIconColor(on context: DSSurfaceContext, isSelected: Bool) -> DSColorPath {
        if isOverMedia(context) { return \.color.textOnGlassFill }
        switch context.material {
        case .accent: return isSelected ? \.color.textOnAccent : \.color.textOnAccentSecondary
        case .inverse: return \.color.textOnInverse
        default: return isSelected ? \.color.iconPrimary : \.color.iconSecondary
        }
    }

    /// `tokens.trailingIcon.color` on the published context, which selection does not change: `color.icon.secondary` by
    /// default, and the leading glyph's rest cell everywhere else. The remove control's glyph takes it too.
    static func trailingIconColor(on context: DSSurfaceContext) -> DSColorPath {
        leadingIconColor(on: context, isSelected: false)
    }

    // MARK: - The leading and trailing positions

    /// Behavior, "An identifier chip may put an Avatar": only the md chip draws one.
    static func drawsAvatar(_ size: DSChipSize, hasAvatar: Bool) -> Bool {
        hasAvatar && size == .md
    }

    /// The leading position, in its one order: status.check while a selected chip sits where it shows, replacing
    /// whatever the position held; otherwise the Avatar, on the md chip; otherwise `leadingIcon`.
    static func leading(
        isSelected: Bool, on published: DSSurfaceContext, drawsAvatar: Bool, leadingIcon: DSIconName?
    ) -> DSChipLeading {
        if isSelected && showsCheck(on: published) { return .check }
        if drawsAvatar { return .avatar }
        if let leadingIcon { return .icon(leadingIcon) }
        return .none
    }

    /// Behavior, "`trailingIcon` is a glyph inside the chip's one control": `isRemovable` takes the trailing position,
    /// so a `trailingIcon` given with it is not drawn.
    static func showsTrailingIcon(isRemovable: Bool, hasTrailingIcon: Bool) -> Bool {
        hasTrailingIcon && !isRemovable
    }

    // MARK: - What the remove control says

    /// The name the remove control speaks: the app's `strings.Chip.remove` template with `{label}` filled by the chip's
    /// label, placed as written and never scanned again — "Remove North yard" under the English defaults. The words are
    /// the table's, not Chip's (ADR-0032 rules 1 and 2), so an app that sets its own template once, at the root
    /// (`DSTheme(strings:)`), hears it on every removable chip. `label` is the string the chip's label resolves to where
    /// it renders (`DSChip.removeName(locale:strings:)`). The web's twin is `chipRemoveName`, which fills the same
    /// template with `fillTemplate`.
    static func removeName(_ label: String, strings: DSStrings) -> String {
        DSStrings.fill(strings.chipRemove, ["label": label])
    }

    // MARK: - motion

    /// `motion.press`: `motion.spring.snappy`. The key path is what the binding test holds against the spec's cell.
    static var pressSpring: KeyPath<DSTokenSet, DSSpringToken> { \.motion.springSnappy }

    /// `motion.select`: `motion.spring.smooth`, which moves the stroke and the label and glyph tones on a change of
    /// `isSelected`.
    static var selectSpring: KeyPath<DSTokenSet, DSSpringToken> { \.motion.springSmooth }

    /// `motion.reduceMotion`: `crossfade`. Under Reduce Motion nothing scales: the press shows as the pressed fill, and
    /// selection crossfades, both over `motion.duration.base` with `motion.easing.out`.
    static let reduceMotion: DSReduceMotionBehavior = .crossfade

    /// `haptics.press`: `haptic.impact.light`, played when a press of the chip starts (spec/haptics.yaml: "A light touch
    /// landed (chip toggled, card lifted)").
    static let pressHaptic: DSHaptic = .impactLight

    /// The animation of a press and its release: the snappy spring, or under Reduce Motion the pressed fill's change
    /// over `motion.duration.base` with `motion.easing.out` (Button's `DSControlAppearance.pressAnimation`).
    static func pressAnimation(_ motion: DSMotion) -> Animation {
        DSControlAppearance.pressAnimation(motion.tokens.springSnappy, motion: motion)
    }

    /// The animation of a change of `isSelected`: the smooth spring, or under Reduce Motion a crossfade over
    /// `motion.duration.base` with `motion.easing.out` (IconButton's and Card's `selectAnimation`).
    static func selectAnimation(_ motion: DSMotion) -> Animation {
        motion.isReduced ? motion.presentation : motion.smooth
    }
}
