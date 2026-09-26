import SwiftUI
import DSCore
import DSTokens

/// Every value `spec/components/Toggle.yaml` (specVersion 1) binds, as pure functions of the value and the material
/// the enclosing Surface publishes, and the drag of behaviors 2 and 3 as pure functions of the pointer's travel, so the
/// binding matrix and the drag run on the host. `DSToggle` only draws what these return.
///
/// A cell keyed by a material applies when the enclosing Surface publishes that material, not because the switch asked
/// for it (spec/SCHEMA.md, ADR-0022 §3.1): under the glass fallback the Surface publishes `raised`, and the switch takes
/// its `default` cells with it, and a selected glass Surface falls back to `inverse`, where the switch knocks out
/// (`accessibility.reduceTransparency`).
///
/// **Off** is an outlined track: the neutral wash on the solid ladder and no fill anywhere else — `track.background`
/// names the four solid materials and has no `default` — the outline in `color.border.strong` at the hairline, or in
/// the material's own ring or foreground, and the quiet knob. **On** is the one solid, with no outline and the
/// opposite-coloured knob: the inverse solid by default, which on the scheme's glass and on light glass is ink on light
/// glass and white on smoke (ADR-0030 §3.1, ADR-0040 §1); the white solid on vivid; and knocked out on inverse and
/// accent, the material's foreground under a knob in its fill (ADR-0040 §3).
///
/// The web's twins are `Toggle.css` and `web/packages/react/src/toggle/parts.ts`; both stacks read the same cells out
/// of the same spec (`DSToggleBindingTests`, `web/packages/react/test/toggle.test.tsx`).
nonisolated enum DSToggleAppearance {
    // MARK: - tokens.track

    /// `tokens.track.background` at rest and `tokens.track.selected.background` while on: the fill the track draws, or
    /// nil for none, which is the off track on every material off the solid ladder.
    static func trackBackground(on material: DSSurfaceMaterial, isOn: Bool) -> DSColorPath? {
        if isOn {
            switch material {
            case .vivid: return \.color.bgFillInverseMedia
            case .inverse: return \.color.textOnInverse
            case .accent: return \.color.textOnAccent
            case .page, .solid, .raised, .nested, .glass, .glassLight: return \.components.toggle.trackOn
            }
        }
        switch material {
        case .page, .solid, .raised, .nested: return \.components.toggle.trackOff
        case .vivid, .glass, .glassLight, .inverse, .accent: return nil
        }
    }

    /// `tokens.track.border`: the off track's outline — `color.border.strong` by default, the decorative ring on vivid and
    /// on both glasses (ADR-0030 §3.2), and the material's own foreground on inverse and accent (ADR-0040 §2).
    static func trackBorder(on material: DSSurfaceMaterial) -> DSColorPath {
        switch material {
        case .vivid: \.color.borderOnMedia
        case .glass, .glassLight: \.color.borderOnGlassFill
        case .inverse: \.color.textOnInverse
        case .accent: \.color.textOnAccentSecondary
        case .page, .solid, .raised, .nested: \.color.borderStrong
        }
    }

    /// The outline the track draws: `trackBorder(on:)` while off, and none while on (behavior, "On is the inverse solid:
    /// … with no outline").
    static func drawnBorder(on material: DSSurfaceMaterial, isOn: Bool) -> DSColorPath? {
        isOn ? nil : trackBorder(on: material)
    }

    /// `tokens.track.borderWidth`: the hairline, as every outline of a control that acts (ADR-0033). It has no material
    /// level, so the ring on vivid and glass is as wide as on the page.
    static var trackBorderWidth: KeyPath<DSTokenSet, CGFloat> { \.border.hairline }

    /// `tokens.track.radius`: `radius.control`, at least half the track's height in every density
    /// (`DSToggleBindingTests.radiusCells`), so the track's ends are round; the track is drawn as the continuous rounded
    /// rectangle Button draws its pill as.
    static var trackRadius: KeyPath<DSTokenSet, CGFloat> { \.radius.control }

    /// `tokens.track.height`: `comp.toggle.height`, `size.control.sm`, which follows density — 28 pt in compact, 32 in
    /// regular, 44 in comfortable — and never Dynamic Type or modality.
    static var height: KeyPath<DSTokenSet, CGFloat> { \.components.toggle.height }

    /// `tokens.track.padding`: `comp.toggle.inset`, the knob's inset on every side, `space.1`.
    static var inset: KeyPath<DSTokenSet, CGFloat> { \.components.toggle.inset }

    // MARK: - tokens.knob

    /// `tokens.knob.background` at rest and `tokens.knob.selected.background` while on: the quiet knob and the
    /// opposite-coloured one by default, the material's own foreground off the solid ladder while off, the ink knob on the
    /// white solid, and the material's own fill on the knocked-out solid.
    static func knob(on material: DSSurfaceMaterial, isOn: Bool) -> DSColorPath {
        if isOn {
            switch material {
            case .vivid: return \.color.textOnInverseMedia
            case .inverse: return \.color.bgFillInverse
            case .accent: return \.color.bgFillAccent
            case .page, .solid, .raised, .nested, .glass, .glassLight: return \.components.toggle.knobOn
            }
        }
        switch material {
        case .vivid: return \.color.textOnVivid
        case .glass: return \.color.textOnGlassFill
        case .glassLight: return \.color.textOnGlassLight
        case .inverse: return \.color.textOnInverse
        case .accent: return \.color.textOnAccentSecondary
        case .page, .solid, .raised, .nested: return \.components.toggle.knobOff
        }
    }

    /// `tokens.knob.radius`: `radius.control`, which on the knob's square box is a circle, drawn as `Circle()`.
    static var knobRadius: KeyPath<DSTokenSet, CGFloat> { \.radius.control }

    // MARK: - Geometry (behavior 4)

    /// Behavior 4: the track is twice as wide as it is tall, the knob a circle inset on every side, and it travels the
    /// track's width less twice the inset and less its own diameter — which is the track's height: at regular density a
    /// 32 pt track is 64 wide, the knob is 24 and it travels 32.
    struct Geometry: Hashable, Sendable {
        let height: CGFloat
        let inset: CGFloat

        var width: CGFloat { height * 2 }
        var knob: CGFloat { height - inset * 2 }
        var travel: CGFloat { width - inset * 2 - knob }

        /// How far the knob's leading edge is from the track's leading edge at a progress along the track, 0 off and 1
        /// on: the inset, plus the share of the travel. Applied as leading padding, it mirrors under right to left.
        func knobOffset(progress: CGFloat) -> CGFloat {
            inset + travel * progress
        }
    }

    static func geometry(_ tokens: DSTokenSet) -> Geometry {
        Geometry(height: tokens[keyPath: height], inset: tokens[keyPath: inset])
    }

    // MARK: - The row (tokens.root, tokens.label)

    /// `tokens.root` and `tokens.label`: the control row's cells. The row draws no fill of its own, so its hover and
    /// pressed washes are keyed: the neutral wash by default and the material's own on inverse and accent (ADR-0042 §2).
    /// Its disabled opacity and its focus ring are keyed by no material: every spec binds `color.border.focus`, and the
    /// one drawing picks the ring for the ground (`materials` names `root` for light glass, which keys nothing).
    static var row: DSControlRowCells {
        DSControlRowCells(
            gap: \.space.step3,
            radius: \.radius.inner,
            hover: wash,
            pressed: wash,
            disabledOpacity: \.opacity.disabled,
            labelRole: .bodyMd
        )
    }

    /// The row's wash, which hover and a press lay alike, so the row never tints twice.
    private static var wash: DSControlRowWash {
        DSControlRowWash(base: \.color.bgFillNeutralSubtle, inverse: \.color.bgFillOnInverseSubtle, accent: \.color.bgFillOnAccentSubtle)
    }

    /// `tokens.root.hover.overlay` on `material`.
    static func hoverOverlay(on material: DSSurfaceMaterial) -> DSColorPath {
        row.hover.on(material)
    }

    /// `tokens.root.pressed.overlay` on `material`.
    static func pressedOverlay(on material: DSSurfaceMaterial) -> DSColorPath {
        row.pressed.on(material)
    }

    /// The row's outline: `root.radius` for a labelled row, and the track's own radius for a row of the track alone,
    /// which the overlay and the focus ring then follow (behavior, "A Toggle with no visible label is a row of the track
    /// alone").
    static func outline(isLabelDrawn: Bool) -> KeyPath<DSTokenSet, CGFloat> {
        isLabelDrawn ? row.radius : trackRadius
    }

    /// `tokens.root.focus-visible.ring` and `.ringWidth`: `color.border.focus` at `border.focus` outside the row,
    /// following its outline. `DSFocusRing` draws it, the one ring every Prism control draws, and the one place ADR-0042
    /// §1 has the ring picked for the ground under it, so the spec binds `color.border.focus` and nothing else.
    static var focusRing: DSColorPath { \.color.borderFocus }
    static var focusRingWidth: KeyPath<DSTokenSet, CGFloat> { \.border.focus }

    // MARK: - motion

    /// `motion.flip`: `motion.spring.snappy`, on which the knob moves between the ends and settles after a drag. It is
    /// in-place movement, so under Reduce Motion it keeps its spring, which has no bounce there (ADR-0023 §8.4 item 3).
    static var flipSpring: KeyPath<DSTokenSet, DSSpringToken> { \.motion.springSnappy }

    /// `motion.trackFill`: `motion.duration.quick`, over which the track's fill, its outline and the knob's colour change,
    /// on `motion.easing.out`, the easing of a state change on the non-spring path (ADR-0023 §9).
    static var trackFill: KeyPath<DSTokenSet, Double> { \.motion.durationQuick }

    /// `motion.reduceMotion`: `crossfade`. Nothing scales or blurs, the knob keeps its spring, and the fill crossfades over
    /// `motion.duration.base` with `motion.easing.out`.
    static let reduceMotion: DSReduceMotionBehavior = .crossfade

    /// The animation of the knob's move: the flip spring, in both motion modes.
    static func flipAnimation(_ motion: DSMotion) -> Animation {
        motion.movement(motion.tokens.springSnappy)
    }

    /// The animation of the fill's change: `motion.duration.quick` on `motion.easing.out`, or under Reduce Motion the
    /// crossfade over `motion.duration.base` with `motion.easing.out` (`accessibility.reduceMotion`).
    static func fillAnimation(_ motion: DSMotion) -> Animation {
        motion.isReduced ? motion.presentation : motion.animation(motion.tokens.easingOut, duration: motion.tokens.durationQuick)
    }

    // MARK: - haptics

    /// `haptics`: one flip, one haptic — `haptic.selection.on` or `haptic.selection.off` for the value the flip asks
    /// for — and no press haptic before it (spec/haptics.yaml rules 2 and 5). Nothing plays for a value the caller sets
    /// (rule 8).
    static func flipHaptic(isOn: Bool) -> DSHaptic {
        isOn ? .selectionOn : .selectionOff
    }

    // MARK: - The drag (behaviors 2 and 3)

    /// Behavior 2: the distance a press on the track moves before it is a drag, 10 pt — SwiftUI's own drag minimum,
    /// which the spec writes as a value because Prism has no token for a gesture's distance. A press that moves less is
    /// a tap, which the row's press flips. The web's twin is `toggleDragThreshold`.
    static let dragThreshold: CGFloat = 10

    /// Where the knob rests: 0 at the track's leading end, off, and 1 at its trailing end, on (behavior 3).
    static func restProgress(isOn: Bool) -> CGFloat {
        isOn ? 1 : 0
    }

    /// A horizontal travel measured on the screen, as an inline one: toward the trailing end is positive, which is to
    /// the left under right to left.
    static func inlineTranslation(_ horizontal: CGFloat, layoutDirection: LayoutDirection) -> CGFloat {
        layoutDirection == .rightToLeft ? -horizontal : horizontal
    }

    /// Where a drag holds the knob: the end it started at plus the pointer's inline travel as a share of the knob's
    /// travel, held between the two ends. The web's twin is `toggleDragProgress`.
    static func dragProgress(isOn: Bool, translation: CGFloat, travel: CGFloat) -> CGFloat {
        let start = restProgress(isOn: isOn)
        guard travel > 0 else { return start }
        return min(1, max(0, start + translation / travel))
    }

    /// Behavior 2: what a drag commits on release, from the knob's progress — the half of the track the knob's centre is
    /// nearest, on past the middle and off before it, and the value kept with the knob exactly on the middle. nil when
    /// the value does not change, so a drag that ends where it began, or that crosses the middle and comes back, fires
    /// nothing; otherwise the value the flip writes, once. The web's twin is `toggleDragCommit`.
    static func dragCommit(isOn: Bool, progress: CGFloat) -> Bool? {
        let next = progress > 0.5 ? true : progress < 0.5 ? false : isOn
        return next == isOn ? nil : next
    }
}
