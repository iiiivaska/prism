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

/// The focus ring, the one drawing of it on Apple (ADR-0042 §1): `border.focus` wide outside the shape, following its
/// outline, in the ring DSCore's table picks for the ground the ring sits on (`DSInteraction.focusRing(on:onChipPaint:)`)
/// — `color.border.focus` on the page, the solid ladder, both glasses and Prism's map, the material's foreground on
/// inverse and on the lit tile, white on vivid — and over an image on a band of `color.bg.page` one ring width wider
/// (`DSInteraction.focusRingUnderlay(on:onChipPaint:)`), so one of the two holds 3:1 against any picture. Every spec
/// binds its ring as `color.border.focus` at `border.focus`; no component picks a ring or paints one of its own.
///
/// The ring traces the shape it surrounds, grown by its own width, so it touches that shape evenly all the way round.
/// A caller says which shape that is (`Outline`): a continuous rounded rectangle for Button's pill, Chip's pill and
/// Card's corners, a circle for a body drawn as `Circle()` — IconButton, Card's action disc, Chip's remove control.
///
/// **Which ground.** A ring placed as an overlay of the element it surrounds reads the context that element reads, and
/// the chip enclosure there (`dsSurfaceChipEnclosure`, ADR-0037 §1): that is Button's, IconButton's and Chip's pill.
/// A component that draws its ring inside a Surface of its own hands the ring the ground outside it (`on:`), as Card
/// does, and a ring around a control laid on a chip's own paint says so (`onChipPaint: true`), as Chip's remove
/// control does.
///
/// On macOS under Increase Contrast the ring takes the system's focus colour instead, on the page family only
/// (`DSInteraction.takesSystemFocusColor(on:)`; Button.yaml `notes.platform.macos`), which SwiftUI exposes as the
/// accent colour the focus indicator is drawn from. The contrast state is Prism's token context, never the OS setting
/// (ADR-0022 §1.3).
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
    /// The ground the ring sits on; nil reads the context published where the ring is placed.
    let ground: DSSurfaceContext?
    /// Whether the ring sits on a chip's own paint; nil reads it from the enclosure where the ring is placed.
    let onChipPaint: Bool?
    private var ds = DSThemeValues()
    @Environment(\.dsSurfaceChipEnclosure) private var enclosure

    /// A ring around a continuous rounded rectangle: Button's pill, Chip's pill, a card.
    init(cornerRadius: CGFloat) {
        self.init(.roundedRectangle(cornerRadius: cornerRadius))
    }

    /// A ring around `outline`, on the ground and the paint published where it is placed unless the caller names them.
    init(_ outline: Outline, on ground: DSSurfaceContext? = nil, onChipPaint: Bool? = nil) {
        self.outline = outline
        self.ground = ground
        self.onChipPaint = onChipPaint
    }

    var body: some View {
        let tokens = ds.tokens
        let width = tokens.border.focus
        let ground = self.ground ?? ds.surface
        let onChipPaint = self.onChipPaint ?? (enclosure != DSSurfaceChipEnclosure.none)
        ZStack {
            if let underlay = DSInteraction.focusRingUnderlay(on: ground, onChipPaint: onChipPaint) {
                // The band under the ring: `color.bg.page` from the shape out to two ring widths, drawn first, so the
                // ring covers its inner half and its outer half is the page's edge between the ring and the picture.
                stroke(underlay.color(tokens.context.brand), grownBy: 2 * width, lineWidth: 2 * width)
                    .padding(-2 * width)
            }
            stroke(color(on: ground, onChipPaint: onChipPaint, tokens: tokens), grownBy: width, lineWidth: width)
                .padding(-width)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    /// The outline grown by `distance` on every side, stroked inside by `lineWidth`: a continuous rounded rectangle
    /// whose radius grows by the same distance, so it stays concentric with the shape, or the circle.
    @ViewBuilder private func stroke(_ color: Color, grownBy distance: CGFloat, lineWidth: CGFloat) -> some View {
        switch outline {
        case .roundedRectangle(let cornerRadius):
            RoundedRectangle(cornerRadius: cornerRadius + distance, style: .continuous)
                .strokeBorder(color, lineWidth: lineWidth)
        case .circle:
            Circle().strokeBorder(color, lineWidth: lineWidth)
        }
    }

    private func color(on ground: DSSurfaceContext, onChipPaint: Bool, tokens: DSTokenSet) -> Color {
        #if os(macOS)
        if tokens.context.contrast == .increased && DSInteraction.takesSystemFocusColor(on: ground) { return .accentColor }
        #endif
        return DSInteraction.focusRing(on: ground, onChipPaint: onChipPaint).color(tokens.context.brand)
    }
}

// MARK: - Disabled

extension View {
    /// `root.disabled.opacity` over a whole control, as one layer: everything the control draws is composited into one
    /// picture first, and the opacity dims that picture, as the web's `opacity` dims an element with everything inside
    /// it. Without the group SwiftUI hands the opacity to each layer on its own, and a layer dimmed over a layer dimmed
    /// shows the one under it through it: the white label of a disabled primary Button, over its dimmed ink fill, read
    /// 192 in light where the web's reads 246 over a page of 241, and Toggle's knob showed its track (CI round 25). At
    /// full opacity the group draws what the layers drew: Toggle's 60 enabled images came out byte for byte the same
    /// with it and without it (CI round 27). It clips nothing: what reaches past the control's frame, IconButton's badge,
    /// draws whole, as Surface's shadow draws whole around the surface from a group of its own (`DSSurfaceLayers`).
    ///
    /// Button's pill, IconButton's circle, Chip's pill, Card's action disc and Toggle's control row each apply it once,
    /// over all they dim. The focus ring shows only while a control is enabled and is drawn outside the group, except on
    /// IconButton, where the badge lies over the ring and dims with the circle, so the ring stays under it, inside.
    ///
    /// - Parameters:
    ///   - opacity: the control's `root.disabled.opacity`, `opacity.disabled` in every spec that binds one.
    ///   - isEnabled: the environment's `isEnabled` where the control draws; false dims the control.
    func dsDisabledOpacity(_ opacity: Double, isEnabled: Bool) -> some View {
        compositingGroup().opacity(isEnabled ? 1 : opacity)
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
