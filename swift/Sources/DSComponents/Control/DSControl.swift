import SwiftUI
import DSCore
import DSTokens

/// A colour binding: the `DSTokenSet` member a spec cell names, `comp.*` or `sys`. Appearance functions return the
/// path rather than the colour, so the host tests compare bindings, and a view reads the colour from its own token set.
typealias DSColorPath = KeyPath<DSTokenSet, Color>

/// The interaction rules Button and Card share, as pure functions: the press, the hit region, hover and the focus ring
/// (Button.yaml and Card.yaml behavior, IconButton.yaml's grammar for Card's action circle, ADR-0024 §7.3,
/// ADR-0023 §8.4).
nonisolated enum DSControlAppearance {
    /// A press scales the control to 0.97 of its size (Button.yaml behavior; docs/research/visual-dna.md §1
    /// principle 9, whose press every Prism control shares).
    static let pressedScale: CGFloat = 0.97

    /// The scale of a control: 0.97 while pressed. The magnitude of the press is `1 − 0.97`, and ADR-0023 §8.4's
    /// substitution multiplies it by `1 − motion.presentation.crossfade`, so under Reduce Motion nothing scales.
    static func scale(isPressed: Bool, motion: DSMotion) -> CGFloat {
        guard isPressed else { return 1 }
        return 1 - CGFloat(motion.geometry(Double(1 - pressedScale)))
    }

    /// The opacity of a substitute that replaces the press scale (ADR-0023 §8.4 item 2): shown only while pressed and
    /// only while the substitutions apply.
    static func substituteOpacity(isPressed: Bool, motion: DSMotion) -> Double {
        isPressed ? motion.substitute(1) : 0
    }

    /// The animation of a press and its release: the bound spring, or under Reduce Motion the substitute's fill change
    /// over `motion.duration.base` with `motion.easing.out`.
    static func pressAnimation(_ spring: DSSpringToken, motion: DSMotion) -> Animation {
        motion.isReduced ? motion.presentation : motion.animation(spring)
    }

    /// A hover changes colour only: `motion.duration.quick` with `motion.easing.hover`, the role ADR-0023 §9 gives
    /// hover color and opacity.
    static func hoverAnimation(_ motion: DSMotion) -> Animation {
        motion.animation(motion.tokens.easingHover, duration: motion.tokens.durationQuick)
    }

    /// How far the hit region reaches past each side of the visual box: "the larger of the visual size and size.hit
    /// on each axis", extending invisibly while the visual box never grows (ADR-0024 §7.3).
    static func hitOutset(visual: CGSize, hit: CGFloat) -> CGSize {
        CGSize(width: max(0, (hit - visual.width) / 2), height: max(0, (hit - visual.height) / 2))
    }

    /// Hover exists only under pointer modality (`interaction.hover`), and only on a control that takes input.
    static func showsHover(isHovered: Bool, interaction: DSTokenSet.Interaction, isInteractive: Bool) -> Bool {
        isHovered && interaction.hover && isInteractive
    }
}

// MARK: - Hit region

/// Extends a control's hit region to at least `size.hit` on each axis, centred on the visual box, without changing the
/// layout: the region is padded out, made hit-testable, and the padding is taken back.
struct DSHitRegion: ViewModifier {
    private var ds = DSThemeValues()
    @State private var visual: CGSize = .zero

    init() {}

    func body(content: Content) -> some View {
        let outset = DSControlAppearance.hitOutset(visual: visual, hit: ds.tokens.size.hit)
        content
            .onGeometryChange(for: CGSize.self, of: \.size) { visual = $0 }
            .padding(.horizontal, outset.width)
            .padding(.vertical, outset.height)
            .contentShape(Rectangle())
            .padding(.horizontal, -outset.width)
            .padding(.vertical, -outset.height)
    }
}

// MARK: - Hover

/// Tracks the pointer over a control. watchOS has no pointer, and so no hover API.
struct DSHoverTracking: ViewModifier {
    @Binding var isHovered: Bool

    init(isHovered: Binding<Bool>) {
        _isHovered = isHovered
    }

    func body(content: Content) -> some View {
        #if os(watchOS)
        content
        #else
        content.onHover { isHovered = $0 }
        #endif
    }
}

// MARK: - Focus ring

/// The focus ring: `color.border.focus` at `border.focus` width outside the shape, following its outline
/// (Button.yaml, Card.yaml and IconButton.yaml accessibility, docs/research/visual-dna.md §7.5).
///
/// The ring traces the shape it surrounds, grown by its own width, so it touches that shape evenly all the way round.
/// A caller says which shape that is (`Outline`): a continuous rounded rectangle for Button's pill and Card's corners,
/// a circle for a body drawn as `Circle()` — IconButton and Card's action disc.
///
/// On macOS under Increase Contrast the ring takes the system's focus colour instead (Button.yaml
/// `notes.platform.macos`), which SwiftUI exposes as the accent colour the focus indicator is drawn from. The
/// contrast state is Prism's token context, never the OS setting (ADR-0022 §1.3).
struct DSFocusRing: View {
    /// The outline of the shape the ring surrounds.
    enum Outline: Hashable, Sendable {
        /// A continuous rounded rectangle of this corner radius; the ring's own radius is larger by the ring's width.
        case roundedRectangle(cornerRadius: CGFloat)
        /// A circle: the body is `Circle()` on a square box. Written as a rounded rectangle instead — at a radius of
        /// half the side or more, as `radius.control` is — SwiftUI clamps the radius and the continuous style draws a
        /// squircle, whose ring wanders in and out around a round body by up to about 0.15 pt instead of keeping one
        /// distance from it.
        case circle
    }

    let outline: Outline
    private var ds = DSThemeValues()

    /// A ring around a continuous rounded rectangle: Button's pill, a card.
    init(cornerRadius: CGFloat) {
        self.init(.roundedRectangle(cornerRadius: cornerRadius))
    }

    init(_ outline: Outline) {
        self.outline = outline
    }

    var body: some View {
        let width = ds.tokens.border.focus
        ring(width: width)
            .padding(-width)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    @ViewBuilder private func ring(width: CGFloat) -> some View {
        switch outline {
        case .roundedRectangle(let cornerRadius):
            RoundedRectangle(cornerRadius: cornerRadius + width, style: .continuous)
                .strokeBorder(color, lineWidth: width)
        case .circle:
            Circle().strokeBorder(color, lineWidth: width)
        }
    }

    private var color: Color {
        #if os(macOS)
        if ds.tokens.context.contrast == .increased { return .accentColor }
        #endif
        return ds.tokens.color.borderFocus
    }
}

// MARK: - Foreground

/// Sets a part's bound foreground, or none, so the part takes its tone from Text.
struct DSForeground: ViewModifier {
    let color: Color?

    init(color: Color?) {
        self.color = color
    }

    func body(content: Content) -> some View {
        if let color {
            content.foregroundStyle(color)
        } else {
            content
        }
    }
}

// MARK: - Haptics

extension View {
    /// Plays a registry haptic when a press starts: the user's action, never a programmatic change
    /// (spec/haptics.yaml rules). A control that does not take input plays nothing.
    func dsPressHaptic(_ haptic: DSHaptic, isPressed: Bool, isInteractive: Bool) -> some View {
        sensoryFeedback(trigger: isPressed) { _, pressed in
            pressed && isInteractive ? DSHaptics.play(haptic) : nil
        }
    }
}
