import SwiftUI
import DSCore
import DSTokens

/// Toggle: a binary switch that takes effect the moment it is flipped (`spec/components/Toggle.yaml`, specVersion 1).
///
///     DSToggle("Night shading", isOn: $isNightShading)
///     DSToggle(verbatim: "Night shading", isOn: $isNightShading, labelVisibility: .hidden)
///     DSToggle(isOn: $isNightShading)   // named by the host that draws its words (ADR-0041)
///
/// `isOn` is a binding, SwiftUI's idiom for a switch (`Toggle(isOn:)`): its value is the spec's `isOn`, and writing it
/// is the spec's `onChange`, which one flip writes once.
///
/// Behaviour, from the spec:
///  - The row is a `Button` in Prism's control row (`DSControlRow`): a press anywhere in it — the label included — flips
///    the value on release, and Space flips it where a keyboard can focus it; a scroll that starts on it cancels the
///    press. The label leads and wraps, and the track trails, centred on the label's first line; the row takes the width
///    it is given (behaviors 1 and 9).
///  - A press on the track that moves 10 pt is a drag (behavior 2): the knob follows it, held between the ends, and the
///    release commits the half of the track the knob's centre is nearest, once — the row's own release then flips
///    nothing — so a drag that ends where it began, or that crosses the middle and comes back, changes nothing. Off rests
///    the knob at the track's leading end and on at its trailing end, the end away from the label, and under right to
///    left the switch mirrors with the row (behavior 3).
///  - The name (ADR-0041): `label`, drawn as the row's label unless `labelVisibility` is `hidden`, and the name either
///    way; with no `label`, the pair the host publishes through the name context (`dsControlName`). A switch with
///    neither is reported in development with `assert`, as `DSTheme` reports a nested brand.
///  - Its accessibility element is SwiftUI's own `Toggle`, set as the row's accessibility representation, so VoiceOver,
///    Voice Control and Full Keyboard Access meet the platform's switch, named by the label and carrying its on or off
///    value, and no word of Prism's own is spoken (`notes.platform.ios`, ADR-0032).
///  - One flip, one haptic: `haptic.selection.on` or `haptic.selection.off` for the value a tap, Space or a drag writes,
///    and nothing for a press or a drag that changes nothing, and nothing for a value the app sets (spec/haptics.yaml
///    rules 5 and 8).
///  - The knob moves on `motion.spring.snappy`, and the fill changes over `motion.duration.quick`; under Reduce Motion the
///    knob keeps its spring, which has no bounce there, and the fill crossfades over `motion.duration.base` with
///    `motion.easing.out`. Nothing scales or blurs.
///  - Hover, under pointer only, and a press lay the row's wash over it, once: `color.bg.fill.neutral.subtle`, or on an
///    inverse or an accent surface that material's own wash (ADR-0042 §2). The focus ring is `DSFocusRing`'s,
///    `color.border.focus` at `border.focus` or the ring ADR-0042 §1 picks for the ground, outside the row at
///    `radius.inner`, or around the track at `radius.control` when no label is drawn; `isDisabled` lowers the row to
///    `opacity.disabled` and takes it out of input and the focus order.
///
/// watchOS is `none` in the spec — a wrist setting belongs to the phone app or to system Settings — and
/// `DSComponentsManifest` declares no watch entry; the type still builds there, as Chip and IconButton do.
public struct DSToggle: View {
    private let label: DSTextContent?
    private let labelVisibility: DSLabelVisibility
    private let isOn: Binding<Bool>
    private let isDisabled: Bool

    /// The pair a host that draws this switch's name hands over (ADR-0041 decision 5).
    @Environment(\.dsControlName) private var hosted
    /// The locale a localized label resolves in, for the development check that the switch has a name.
    @Environment(\.locale) private var locale
    /// Which end of the track is the trailing one on screen (behavior 3).
    @Environment(\.layoutDirection) private var layoutDirection
    /// True while a drag holds the knob. SwiftUI resets it when the gesture ends or is cancelled — by a scroll that takes
    /// the touch, say — so a drag never leaves the knob between the ends.
    @GestureState private var isDragging = false
    /// The pointer's inline travel while a drag holds the knob, toward the trailing end positive.
    @State private var dragTranslation: CGFloat = 0
    /// Set once a press on the track has become a drag, so the row's release does not flip the switch a second time;
    /// cleared when the next press begins.
    @State private var dragTookThePress = false
    /// The flips the user made, counted, which the haptic plays on: never a value the app sets.
    @State private var flips = DSToggleFlips()
    private var ds = DSThemeValues()

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site. The three label forms are `DSButton`'s.

    /// A switch whose name is a localized string key, looked up like SwiftUI's `Text(_:tableName:bundle:comment:)`.
    ///
    /// - Parameters:
    ///   - key: what the switch controls, drawn as the row's label unless `labelVisibility` is hidden, and its accessible
    ///     name either way; it never contains the word on or off, which the value carries.
    ///   - isOn: the value, which a flip writes once.
    ///   - labelVisibility: `visible` by default; `hidden` draws the track alone and keeps the label as the name.
    ///   - isDisabled: dims the row and takes it out of input and the focus order.
    public init(
        _ key: LocalizedStringKey,
        tableName: String? = nil,
        bundle: Bundle? = nil,
        isOn: Binding<Bool>,
        labelVisibility: DSLabelVisibility = .visible,
        isDisabled: Bool = false
    ) {
        self.init(
            content: .localized(key, tableName: tableName, bundle: bundle), isOn: isOn, labelVisibility: labelVisibility,
            isDisabled: isDisabled
        )
    }

    /// A switch whose name is shown as given, without localization.
    public init(verbatim label: String, isOn: Binding<Bool>, labelVisibility: DSLabelVisibility = .visible, isDisabled: Bool = false) {
        self.init(content: .verbatim(label), isOn: isOn, labelVisibility: labelVisibility, isDisabled: isDisabled)
    }

    /// A switch whose name is a string the app already holds, shown without localization.
    @_disfavoredOverload
    public init<S: StringProtocol>(_ label: S, isOn: Binding<Bool>, labelVisibility: DSLabelVisibility = .visible, isDisabled: Bool = false) {
        self.init(content: .verbatim(String(label)), isOn: isOn, labelVisibility: labelVisibility, isDisabled: isDisabled)
    }

    /// A switch with no label of its own, named by the host that draws its words — a ListRow's title, a FormField's
    /// label — and drawn or hidden as that host says (ADR-0041 decision 5). Outside such a host it has no name, which is
    /// a defect.
    public init(isOn: Binding<Bool>, isDisabled: Bool = false) {
        self.init(content: nil, isOn: isOn, labelVisibility: .visible, isDisabled: isDisabled)
    }

    init(content: DSTextContent?, isOn: Binding<Bool>, labelVisibility: DSLabelVisibility, isDisabled: Bool) {
        label = content
        self.isOn = isOn
        self.labelVisibility = labelVisibility
        self.isDisabled = isDisabled
    }

    public var body: some View {
        let name = DSControlNaming.name(label: label, labelVisibility: labelVisibility, hosted: hosted)
        assert(DSControlNaming.isNamed(name, locale: locale), DSControlNaming.unnamed("Toggle"))
        let drawn = name?.isDrawn == true ? name?.label : nil
        let geometry = DSToggleAppearance.geometry(ds.tokens)
        let value = isOn.wrappedValue
        let progress = isDragging
            ? DSToggleAppearance.dragProgress(isOn: value, translation: dragTranslation, travel: geometry.travel)
            : DSToggleAppearance.restProgress(isOn: value)
        return Button {
            // The release of a press that a drag took over flips nothing: the drag has committed, or not, already.
            guard !dragTookThePress else {
                dragTookThePress = false
                return
            }
            flip(to: !isOn.wrappedValue)
        } label: {
            DSControlRowContent(label: drawn, cells: DSToggleAppearance.row, placement: .trailing, controlHeight: geometry.height) {
                DSToggleTrack(isOn: value, progress: progress, isDragging: isDragging, geometry: geometry)
                    .simultaneousGesture(drag(travel: geometry.travel), including: isDisabled ? GestureMask.none : GestureMask.all)
            }
        }
        .buttonStyle(
            DSControlRowStyle(
                cells: DSToggleAppearance.row,
                radius: DSToggleAppearance.outline(isLabelDrawn: drawn != nil),
                isPressSuspended: isDragging,
                onPressBegan: { dragTookThePress = false }
            )
        )
        .disabled(isDisabled)
        .focusEffectDisabled()
        .accessibilityRepresentation {
            Toggle(isOn: isOn) {
                name?.label.text ?? Text(verbatim: "")
            }
            .disabled(isDisabled)
        }
        .sensoryFeedback(trigger: flips) { _, flips in
            flips.count == 0 ? nil : DSHaptics.play(DSToggleAppearance.flipHaptic(isOn: flips.isOn))
        }
    }

    /// Behavior 2 on the track: past 10 pt the press is a drag, which the knob follows and the release commits.
    private func drag(travel: CGFloat) -> some Gesture {
        // Measured on the screen, whose axis the layout direction does not flip, and read as an inline travel.
        DragGesture(minimumDistance: DSToggleAppearance.dragThreshold, coordinateSpace: .global)
            .updating($isDragging) { _, state, _ in
                state = true
            }
            .onChanged { value in
                dragTranslation = DSToggleAppearance.inlineTranslation(value.translation.width, layoutDirection: layoutDirection)
                if !dragTookThePress { dragTookThePress = true }
            }
            .onEnded { value in
                let translation = DSToggleAppearance.inlineTranslation(value.translation.width, layoutDirection: layoutDirection)
                let current = isOn.wrappedValue
                let progress = DSToggleAppearance.dragProgress(isOn: current, translation: translation, travel: travel)
                if let next = DSToggleAppearance.dragCommit(isOn: current, progress: progress) {
                    flip(to: next)
                }
            }
    }

    /// One flip the user made: the value written once, and its haptic.
    private func flip(to next: Bool) {
        isOn.wrappedValue = next
        flips = DSToggleFlips(count: flips.count + 1, isOn: next)
    }
}

/// The user's flips, counted, and the value the last one wrote: the trigger the flip's haptic plays on, so a value the
/// app sets plays nothing (spec/haptics.yaml rule 8).
nonisolated struct DSToggleFlips: Equatable {
    var count = 0
    var isOn = false
}

/// The track and the knob (behaviors 3 to 6): a pill of `comp.toggle.height`, twice as wide as it is tall, and the knob,
/// a circle inset on every side, placed along the track at `progress`, 0 at the leading end and 1 at the trailing end.
/// Every colour is read against the material the enclosing Surface publishes.
///
/// Back to front: the fill, the outline drawn inside the track, the knob.
struct DSToggleTrack: View {
    let isOn: Bool
    let progress: CGFloat
    let isDragging: Bool
    let geometry: DSToggleAppearance.Geometry

    private var ds = DSThemeValues()

    // Written out for the reason `DSToggle.init` is.
    init(isOn: Bool, progress: CGFloat, isDragging: Bool, geometry: DSToggleAppearance.Geometry) {
        self.isOn = isOn
        self.progress = progress
        self.isDragging = isDragging
        self.geometry = geometry
    }

    var body: some View {
        let tokens = ds.tokens
        let motion = ds.motion
        let material = ds.surface.material
        let fillAnimation = DSToggleAppearance.fillAnimation(motion)
        let flipAnimation = DSToggleAppearance.flipAnimation(motion)
        let shape = RoundedRectangle(cornerRadius: tokens[keyPath: DSToggleAppearance.trackRadius], style: .continuous)
        return ZStack(alignment: .leading) {
            shape
                .fill(DSToggleAppearance.trackBackground(on: material, isOn: isOn).map { tokens[keyPath: $0] } ?? .clear)
                .animation(fillAnimation, value: isOn)
            shape
                .strokeBorder(
                    DSToggleAppearance.drawnBorder(on: material, isOn: isOn).map { tokens[keyPath: $0] } ?? .clear,
                    lineWidth: tokens[keyPath: DSToggleAppearance.trackBorderWidth]
                )
                .animation(fillAnimation, value: isOn)
            // Placed by leading padding, so the knob mirrors with the row under right to left. It moves on the flip
            // spring when the value changes and when a drag lets it go, and follows a drag with no animation of its own.
            Circle()
                .fill(tokens[keyPath: DSToggleAppearance.knob(on: material, isOn: isOn)])
                .animation(fillAnimation, value: isOn)
                .frame(width: geometry.knob, height: geometry.knob)
                .padding(.leading, geometry.knobOffset(progress: progress))
                .animation(flipAnimation, value: isOn)
                .animation(flipAnimation, value: isDragging)
        }
        .frame(width: geometry.width, height: geometry.height, alignment: .leading)
        .contentShape(Rectangle())
    }
}
