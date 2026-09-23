import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// Button: a tappable action with one label and an optional leading or trailing icon
/// (`spec/components/Button.yaml`, specVersion 4).
///
///     DSButton("Continue") { save() }
///     DSButton("Details", variant: .secondary, trailingIcon: .navOpen) { openDetails() }
///     DSButton("Saving", isLoading: true) {}
///
/// Controls in Prism are pills: `primary` is the single solid pill of a group — the inverse solid, which turns white
/// with an ink label on a vivid surface — `secondary` a raised pill, `ghost` an outline with no fill at rest, and
/// `danger` a critical tint with critical text. Every colour is read against the material the enclosing
/// `DSSurfaceView` publishes, so a ghost pill inside a vivid or glass card outlines itself by itself.
///
/// Behaviour, from the spec:
///  - `action` fires once on release inside the hit region; a drag outside cancels (SwiftUI's `Button`). Space and
///    Enter activate it where a keyboard can focus it.
///  - The hit region is the larger of the pill and `size.hit` on each axis (28 pt under pointer, 44 pt under touch);
///    it reaches past the pill invisibly and the pill never grows with modality.
///  - A press scales the pill to 0.97 on `comp.button.motion.press` and plays `haptic.press.button`; the variant's
///    pressed fill applies while pressed. Under Reduce Motion nothing scales: the press shows as the pressed fill over
///    `motion.duration.base` with `motion.easing.out` (danger: `color.bg.fill.neutral.subtle`). A pressed `primary`
///    shows nothing there, because the fill Button.yaml names as its substitute is its own rest fill — a token gap,
///    stated in full on `DSButtonAppearance.reducedMotionPressOverlay` and held by `DSButtonReduceMotionTests`.
///  - Hover, under pointer modality only, lays `color.bg.fill.neutral.subtle` over the pill.
///  - `isLoading` replaces the label with a spinner of the label's height, keeps the width, ignores presses and reads
///    "<label>, loading"; the button keeps its place in the focus order.
///  - `isDisabled` lowers the button to `opacity.disabled` and removes it from the focus order. Prefer explaining why
///    an action is unavailable.
///  - The label never wraps and truncates with an ellipsis; the label and the height scale with Dynamic Type up to
///    accessibility3, and past it the label wraps to two lines. `isFullWidth` stretches the pill and centres the
///    content.
///  - Secondary, ghost and danger outline the pill at `border.hairline` on every material (ADR-0033).
///  - The focus ring is `color.border.focus` at `border.focus` outside the pill.
///  - On watchOS every size renders `lg`, ghost renders as secondary and there is no trailing icon.
///
/// Only one `primary` belongs in a group. A Button never navigates; use a ListRow or a link.
public struct DSButton: View {
    private let label: DSTextContent
    private let variant: DSButtonVariant
    private let size: DSButtonSize
    private let leadingIcon: DSIconName?
    private let trailingIcon: DSIconName?
    private let isLoading: Bool
    private let isDisabled: Bool
    private let isFullWidth: Bool
    private let action: () -> Void

    private var ds = DSThemeValues()

    /// A button whose label is a localized string key, looked up like SwiftUI's `Text(_:tableName:bundle:comment:)`.
    ///
    /// - Parameters:
    ///   - variant: `primary` by default; one primary per group.
    ///   - size: `md` by default. Heights follow density: md is 32 pt in compact, 40 in regular, 48 in comfortable.
    ///   - leadingIcon: a registry glyph before the label, at `size.icon.md`.
    ///   - trailingIcon: a registry glyph after the label, at `size.icon.md`; not drawn on watchOS.
    ///   - isLoading: replaces the label with a spinner and ignores presses.
    ///   - isDisabled: dims the button and takes it out of input and the focus order.
    ///   - isFullWidth: stretches the pill to the width it is offered.
    ///   - action: the spec's `onPress`, fired on release.
    public init(
        _ key: LocalizedStringKey,
        tableName: String? = nil,
        bundle: Bundle? = nil,
        variant: DSButtonVariant = .primary,
        size: DSButtonSize = .md,
        leadingIcon: DSIconName? = nil,
        trailingIcon: DSIconName? = nil,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        isFullWidth: Bool = false,
        action: @escaping () -> Void
    ) {
        self.init(
            content: .localized(key, tableName: tableName, bundle: bundle), variant: variant, size: size,
            leadingIcon: leadingIcon, trailingIcon: trailingIcon, isLoading: isLoading, isDisabled: isDisabled,
            isFullWidth: isFullWidth, action: action
        )
    }

    /// A button whose label is shown as given, without localization.
    public init(
        verbatim label: String,
        variant: DSButtonVariant = .primary,
        size: DSButtonSize = .md,
        leadingIcon: DSIconName? = nil,
        trailingIcon: DSIconName? = nil,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        isFullWidth: Bool = false,
        action: @escaping () -> Void
    ) {
        self.init(
            content: .verbatim(label), variant: variant, size: size, leadingIcon: leadingIcon,
            trailingIcon: trailingIcon, isLoading: isLoading, isDisabled: isDisabled, isFullWidth: isFullWidth,
            action: action
        )
    }

    /// A button whose label is a string the app already holds, shown without localization.
    @_disfavoredOverload
    public init<S: StringProtocol>(
        _ label: S,
        variant: DSButtonVariant = .primary,
        size: DSButtonSize = .md,
        leadingIcon: DSIconName? = nil,
        trailingIcon: DSIconName? = nil,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        isFullWidth: Bool = false,
        action: @escaping () -> Void
    ) {
        self.init(
            content: .verbatim(String(label)), variant: variant, size: size, leadingIcon: leadingIcon,
            trailingIcon: trailingIcon, isLoading: isLoading, isDisabled: isDisabled, isFullWidth: isFullWidth,
            action: action
        )
    }

    init(
        content: DSTextContent,
        variant: DSButtonVariant,
        size: DSButtonSize,
        leadingIcon: DSIconName?,
        trailingIcon: DSIconName?,
        isLoading: Bool,
        isDisabled: Bool,
        isFullWidth: Bool,
        action: @escaping () -> Void
    ) {
        label = content
        self.variant = variant
        self.size = size
        self.leadingIcon = leadingIcon
        self.trailingIcon = trailingIcon
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.isFullWidth = isFullWidth
        self.action = action
    }

    public var body: some View {
        let variant = variant.rendered()
        let size = size.rendered()
        let lines = DSButtonAppearance.labelLines(at: ds.policy.dynamicTypeSize)
        return Button {
            guard !isLoading else { return }
            action()
        } label: {
            DSButtonContent(
                label: label,
                role: size.labelRole,
                lines: lines,
                leadingIcon: leadingIcon,
                trailingIcon: DSButtonAppearance.trailingIcon(trailingIcon),
                isLoading: isLoading,
                variant: variant
            )
        }
        .buttonStyle(DSButtonStyle(variant: variant, size: size, isLoading: isLoading, isFullWidth: isFullWidth))
        .disabled(isDisabled)
        .focusEffectDisabled()
        .dynamicTypeSize(...DSButtonAppearance.largestTypeSize)
        .accessibilityLabel(accessibilityLabel)
    }

    /// The visible label, and "<label>, loading" while loading (Button.yaml behavior).
    ///
    /// **Known gap.** "loading" is a component-owned string, and Prism has no contract for those yet (critic G-24,
    /// roadmap: before P3-3 and P3-4); until it does, the word is English on both stacks.
    private var accessibilityLabel: Text {
        guard isLoading else { return label.text }
        return Text("\(label.text), \(Text(verbatim: DSButtonAppearance.loadingWord))")
    }
}

extension DSButtonAppearance {
    /// The state word a loading button appends to its accessibility label (see `DSButton`'s known gap).
    static let loadingWord = "loading"
}

/// The pill's content: the icons and the label, and the spinner that replaces the label while loading.
///
/// Each icon is a `DSIcon` at `DSButtonAppearance.iconSize` with the `inherit` tone, so it takes the pill's foreground
/// the way the label does (Icon.yaml behavior 9), and with no `label`, so it is hidden: the button carries the name.
private struct DSButtonContent: View {
    let label: DSTextContent
    let role: DSTextRole
    let lines: Int
    let leadingIcon: DSIconName?
    let trailingIcon: DSIconName?
    let isLoading: Bool
    let variant: DSButtonVariant
    private var ds = DSThemeValues()

    init(
        label: DSTextContent,
        role: DSTextRole,
        lines: Int,
        leadingIcon: DSIconName?,
        trailingIcon: DSIconName?,
        isLoading: Bool,
        variant: DSButtonVariant
    ) {
        self.label = label
        self.role = role
        self.lines = lines
        self.leadingIcon = leadingIcon
        self.trailingIcon = trailingIcon
        self.isLoading = isLoading
        self.variant = variant
    }

    var body: some View {
        let tokens = ds.tokens
        let spinner = tokens[keyPath: DSButtonAppearance.spinner(variant, on: ds.surface.material)]
        HStack(spacing: tokens.components.button.gap) {
            if let leadingIcon {
                DSIcon(leadingIcon, size: DSButtonAppearance.iconSize, tone: nil)
            }
            DSText(content: label, role: role, tone: nil, trailing: nil, unit: nil, numeric: .auto, truncation: .ellipsis, maxLines: lines)
                .opacity(isLoading ? 0 : 1)
                .overlay {
                    if isLoading {
                        DSSpinnerArc(color: spinner)
                            .transition(.opacity)
                    }
                }
                .animation(ds.motion.presentation, value: isLoading)
            if let trailingIcon {
                DSIcon(trailingIcon, size: DSButtonAppearance.iconSize, tone: nil)
            }
        }
    }
}

/// The pill around the content, and every state of it.
private struct DSButtonStyle: ButtonStyle {
    let variant: DSButtonVariant
    let size: DSButtonSize
    let isLoading: Bool
    let isFullWidth: Bool

    func makeBody(configuration: Configuration) -> some View {
        DSButtonPill(
            label: configuration.label,
            isPressed: configuration.isPressed,
            variant: variant,
            size: size,
            isLoading: isLoading,
            isFullWidth: isFullWidth
        )
    }
}

/// Internal, not private, so `DSButtonReduceMotionTests` can render a press: `isPressed` comes from a
/// `ButtonStyle.Configuration`, which nothing outside SwiftUI can make.
struct DSButtonPill<Label: View>: View {
    let label: Label
    let isPressed: Bool
    let variant: DSButtonVariant
    let size: DSButtonSize
    let isLoading: Bool
    let isFullWidth: Bool

    private var ds = DSThemeValues()
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false

    init(label: Label, isPressed: Bool, variant: DSButtonVariant, size: DSButtonSize, isLoading: Bool, isFullWidth: Bool) {
        self.label = label
        self.isPressed = isPressed
        self.variant = variant
        self.size = size
        self.isLoading = isLoading
        self.isFullWidth = isFullWidth
    }

    var body: some View {
        let tokens = ds.tokens
        let button = tokens.components.button
        let motion = ds.motion
        let material = ds.surface.material
        let interactive = isEnabled && !isLoading
        let pressed = isPressed && interactive
        let hovered = DSControlAppearance.showsHover(isHovered: isHovered, interaction: tokens.interaction, isInteractive: interactive)
        let shape = RoundedRectangle(cornerRadius: button.radius, style: .continuous)

        let rest = DSButtonAppearance.background(variant, on: material)
        let pressedFill = DSButtonAppearance.pressedBackground(variant, on: material)
        let fill = (pressed ? pressedFill ?? rest : rest).map { tokens[keyPath: $0] }

        return DSButtonFrame(
            height: DSButtonAppearance.height(size, button),
            textStyle: tokens.typography[keyPath: size.labelRole.keyPath].textStyle.fontTextStyle
        ) {
            label
        }
        .padding(.horizontal, DSButtonAppearance.paddingX(size, button))
        .frame(maxWidth: isFullWidth ? .infinity : nil)
        .foregroundStyle(tokens[keyPath: DSButtonAppearance.foreground(variant, on: material)])
        .background {
            ZStack {
                if let underlay = DSButtonAppearance.underlay(variant, on: material) {
                    shape.fill(tokens[keyPath: underlay])
                }
                shape.fill(fill ?? .clear)
                if let overlay = DSButtonAppearance.reducedMotionPressOverlay(variant) {
                    shape
                        .fill(tokens[keyPath: overlay])
                        .opacity(DSControlAppearance.substituteOpacity(isPressed: pressed, motion: motion))
                }
                shape
                    .fill(tokens[keyPath: DSButtonAppearance.hoverOverlay])
                    .opacity(hovered ? 1 : 0)
                    .animation(DSControlAppearance.hoverAnimation(motion), value: hovered)
                if let border = DSButtonAppearance.border(variant, on: material),
                   let width = DSButtonAppearance.borderWidth(variant) {
                    shape.strokeBorder(tokens[keyPath: border], lineWidth: tokens[keyPath: width])
                }
            }
        }
        .overlay {
            if isFocused && isEnabled {
                DSFocusRing(cornerRadius: button.radius)
            }
        }
        .modifier(DSHitRegion())
        .opacity(isEnabled ? 1 : tokens.opacity.disabled)
        .scaleEffect(DSControlAppearance.scale(isPressed: pressed, motion: motion))
        .animation(DSControlAppearance.pressAnimation(button.motionPress, motion: motion), value: pressed)
        .modifier(DSHoverTracking(isHovered: $isHovered))
        .dsPressHaptic(.pressButton, isPressed: pressed, isInteractive: interactive)
    }
}

/// The pill's height: `comp.button.height.*`, grown with the label along the label role's Dynamic Type style, the way
/// the label's own size scales, so the pill keeps its proportions up to accessibility3 (where `DSButton` clamps both).
private struct DSButtonFrame<Content: View>: View {
    @ScaledMetric private var height: CGFloat
    let content: Content

    init(height: CGFloat, textStyle: Font.TextStyle, @ViewBuilder content: () -> Content) {
        _height = ScaledMetric(wrappedValue: height, relativeTo: textStyle)
        self.content = content()
    }

    var body: some View {
        content.frame(minHeight: height)
    }
}
