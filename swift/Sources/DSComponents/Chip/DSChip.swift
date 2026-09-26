import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// Chip: a small pill that filters, names a selection or identifies an entity (`spec/components/Chip.yaml`,
/// specVersion 1).
///
///     DSChip("Last 24 hours", isSelected: isOn) { isOn.toggle() }           // a filter chip
///     DSChip(verbatim: "INV-209316", trailingIcon: .actionCopy) { copy() }  // an identifier chip whose press copies
///     DSChip("North yard", isRemovable: true, onRemove: { remove() })       // a removable selection
///     DSChip(verbatim: "Anna Petrova", size: .md, avatar: DSAvatar(name: "Anna Petrova"))
///
/// Behaviour, from the spec:
///  - The role follows from the props alone (behavior 1, `DSChipAppearance.kind`): a chip that sets `isSelected`, true
///    or false, is a filter, a toggle that carries the selected trait while it is on; one that leaves it unset and has
///    `onPress` or `isRemovable` is a button; one with none of the three is a static label, one element of text. A
///    filter's press fires `onPress`, and the app sets `isSelected`: the press asks, and the app decides.
///  - The pill is the Surface module's glass chip (ADR-0036): `dsSurfaceChip` resolves Chip's `root.background` cell on
///    the ground the pill sits on (`DSChipAppearance.background(on:)`) and draws the recipe over a map, an image, vivid
///    or the scheme's glass — its fill and edge alone on the scheme's glass — `comp.chip.bg.rest` on every other ground
///    but accent and inverse, where it draws nothing, and under the watch, Reduce Transparency and Increase Contrast
///    the fallback, `color.bg.surface.raised` over `color.bg.page`. Chip reads no setting and draws no fallback of its
///    own.
///  - The parts read what the chip publishes, never the ground: the label, the glyphs, the check and the stroke take
///    Chip's own cells from the ground while glass or the own fill renders, and their `default` cells under the
///    fallback, which publishes `(raised, none)`, so the check goes too (ADR-0036 §4). The label is `DSText` and the
///    glyphs are `DSIcon`, both with no tone, so they take the colour set around them.
///  - The hover overlay, the pressed fill and the stroke are layers over whatever the chip renders, never the cell the
///    chip shape is handed, so no press or hover switches the pill between the recipe and its own cell (ADR-0037 §5).
///    A press scales the pill to 0.97 on `motion.spring.snappy` and plays `haptic.impact.light`; under Reduce Motion
///    nothing scales and the pressed fill changes over `motion.duration.base` with `motion.easing.out`. Hover, under
///    pointer modality only, lays `color.bg.fill.neutral.subtle` over the pill. `isSelected` thickens the stroke and
///    lifts the label on `motion.spring.smooth`.
///  - The pill is one row at the control height of its size, `root.paddingX` either side and `root.gap` between its
///    parts; the label never wraps and never truncates, and the pill grows with it along its Dynamic Type style. The hit
///    region of a control is the larger of the pill and `size.hit` on each axis.
///  - The leading position holds, in one order, status.check while a selected chip sits over media or on inverse; the
///    Avatar, on the md chip, drawn at size sm and decorative — a chip inside a chip, which reads the enclosure the pill
///    hands it (ADR-0037); or `leadingIcon`. With the Avatar the leading padding is its own inset, so the circle is
///    concentric with the pill's leading end.
///  - `isRemovable` takes the trailing position: the pill draws nav.close there, and a second button laid over that
///    glyph is the remove control, its own element with a `size.hit` region and a round focus ring, named by the app's
///    `strings.Chip.remove` template filled with the label (ADR-0032) and read after the chip (`DSChipRemoveOrder`). It
///    fires `onRemove` without firing `onPress`, and Delete and Backspace on the chip fire it too. A `trailingIcon` given
///    with it is not drawn.
///  - `isDisabled` lowers the pill to `opacity.disabled` and takes it and its remove control out of input and the focus
///    order. The focus ring is `color.border.focus` at `border.focus` outside the pill.
///
/// watchOS is `none` in the spec — a watch filter is a list screen — and `DSComponentsManifest` declares no watch entry;
/// the type still builds there, as Avatar and IconButton do.
public struct DSChip: View {
    private let label: DSTextContent
    private let size: DSChipSize
    private let leadingIcon: DSIconName?
    private let avatar: DSAvatar?
    private let trailingIcon: DSIconName?
    private let isSelected: Bool?
    private let isRemovable: Bool
    private let isDisabled: Bool
    private let onPress: (() -> Void)?
    private let onRemove: (() -> Void)?

    /// The locale the remove control's name is resolved in, the label's own (ADR-0032 rule 4).
    @Environment(\.locale) private var locale
    /// The app's strings table, whose `Chip.remove` template names the remove control (ADR-0032).
    @Environment(\.dsStrings) private var strings

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site. The three label forms are `DSButton`'s.

    /// A chip whose label is a localized string key, looked up like SwiftUI's `Text(_:tableName:bundle:comment:)`.
    ///
    /// - Parameters:
    ///   - key: the visible label and the chip's name; it never wraps and never truncates.
    ///   - size: `sm` by default. The height follows density: sm is 28 pt in compact, 32 in regular, 44 in comfortable.
    ///   - leadingIcon: a registry glyph before the label, at Icon's `sm` box.
    ///   - avatar: an Avatar in the leading position, in place of `leadingIcon`; drawn at size sm and decorative, and
    ///     only on the md chip.
    ///   - trailingIcon: a registry glyph after the label that shows what the press does; not drawn while removable.
    ///   - isSelected: set it, true or false, on a filter chip and on no other; true thickens the stroke and lifts the
    ///     label, and adds the selected trait. Unset, the chip is a button or a static label.
    ///   - isRemovable: draws the remove control in the trailing position.
    ///   - isDisabled: dims the chip and takes it out of input and the focus order.
    ///   - onPress: the spec's `onPress`, fired on release; a filter chip's press asks the app to toggle it. It comes
    ///     before `onRemove`, so a trailing closure is the press.
    ///   - onRemove: the spec's `onRemove`, fired by the remove control and by Delete or Backspace.
    public init(
        _ key: LocalizedStringKey,
        tableName: String? = nil,
        bundle: Bundle? = nil,
        size: DSChipSize = .sm,
        leadingIcon: DSIconName? = nil,
        avatar: DSAvatar? = nil,
        trailingIcon: DSIconName? = nil,
        isSelected: Bool? = nil,
        isRemovable: Bool = false,
        isDisabled: Bool = false,
        onPress: (() -> Void)? = nil,
        onRemove: (() -> Void)? = nil
    ) {
        self.init(
            content: .localized(key, tableName: tableName, bundle: bundle), size: size, leadingIcon: leadingIcon,
            avatar: avatar, trailingIcon: trailingIcon, isSelected: isSelected, isRemovable: isRemovable,
            isDisabled: isDisabled, onPress: onPress, onRemove: onRemove
        )
    }

    /// A chip whose label is shown as given, without localization: an identifier, a person's or a site's name.
    public init(
        verbatim label: String,
        size: DSChipSize = .sm,
        leadingIcon: DSIconName? = nil,
        avatar: DSAvatar? = nil,
        trailingIcon: DSIconName? = nil,
        isSelected: Bool? = nil,
        isRemovable: Bool = false,
        isDisabled: Bool = false,
        onPress: (() -> Void)? = nil,
        onRemove: (() -> Void)? = nil
    ) {
        self.init(
            content: .verbatim(label), size: size, leadingIcon: leadingIcon, avatar: avatar, trailingIcon: trailingIcon,
            isSelected: isSelected, isRemovable: isRemovable, isDisabled: isDisabled, onPress: onPress,
            onRemove: onRemove
        )
    }

    /// A chip whose label is a string the app already holds, shown without localization.
    @_disfavoredOverload
    public init<S: StringProtocol>(
        _ label: S,
        size: DSChipSize = .sm,
        leadingIcon: DSIconName? = nil,
        avatar: DSAvatar? = nil,
        trailingIcon: DSIconName? = nil,
        isSelected: Bool? = nil,
        isRemovable: Bool = false,
        isDisabled: Bool = false,
        onPress: (() -> Void)? = nil,
        onRemove: (() -> Void)? = nil
    ) {
        self.init(
            content: .verbatim(String(label)), size: size, leadingIcon: leadingIcon, avatar: avatar,
            trailingIcon: trailingIcon, isSelected: isSelected, isRemovable: isRemovable, isDisabled: isDisabled,
            onPress: onPress, onRemove: onRemove
        )
    }

    init(
        content: DSTextContent,
        size: DSChipSize,
        leadingIcon: DSIconName?,
        avatar: DSAvatar?,
        trailingIcon: DSIconName?,
        isSelected: Bool?,
        isRemovable: Bool,
        isDisabled: Bool,
        onPress: (() -> Void)?,
        onRemove: (() -> Void)?
    ) {
        label = content
        self.size = size
        self.leadingIcon = leadingIcon
        self.avatar = avatar
        self.trailingIcon = trailingIcon
        self.isSelected = isSelected
        self.isRemovable = isRemovable
        self.isDisabled = isDisabled
        self.onPress = onPress
        self.onRemove = onRemove
    }

    public var body: some View {
        let kind = DSChipAppearance.kind(isSelected: isSelected, hasPress: onPress != nil, isRemovable: isRemovable)
        let content = DSChipContent(
            label: label, size: size, leadingIcon: leadingIcon, avatar: avatar, trailingIcon: trailingIcon,
            isSelected: isSelected == true, isRemovable: isRemovable
        )
        chip(kind, content: content)
            .preference(key: DSChipKindKey.self, value: [kind])
    }

    /// The chip itself: one button, with the remove control beside it when removable, for a filter or a button chip;
    /// the pill alone, one element of text, for a static label.
    @ViewBuilder
    private func chip(_ kind: DSChipKind, content: DSChipContent) -> some View {
        let selected = isSelected == true
        if kind.isControl {
            Button {
                onPress?()
            } label: {
                content
            }
            .buttonStyle(DSChipStyle(isSelected: selected))
            .focusEffectDisabled()
            .accessibilityLabel(label.text)
            .accessibilityAddTraits(selected ? .isSelected : [])
            .modifier(DSChipRemoveKey(isRemovable: isRemovable, onRemove: onRemove))
            .overlay(alignment: .trailing) {
                if let name = removeName(locale: locale, strings: strings) {
                    DSChipRemoveControl(name: name, size: size, action: onRemove ?? {})
                        .accessibilitySortPriority(DSChipRemoveOrder.removeControlPriority)
                }
            }
            .modifier(DSChipRemoveOrder(isRemovable: isRemovable))
            .disabled(isDisabled)
        } else {
            // A static label: the pill and its parts, one element of text, with no role and no press.
            DSChipPill(content: content, isPressed: false, isSelected: selected, isInteractive: false)
                .disabled(isDisabled)
                .accessibilityElement(children: .combine)
        }
    }
}

/// What a rendered chip is, published to whatever renders it, so `DSExampleHandlerTests` can hold every example to the
/// spec's rule that it gets its handlers (spec/SCHEMA.md): an example that lost them would be a static label here and a
/// button on the web. `DSCardFormKey` is the precedent.
struct DSChipKindKey: PreferenceKey {
    static let defaultValue: [DSChipKind] = []

    static func reduce(value: inout [DSChipKind], nextValue: () -> [DSChipKind]) {
        value.append(contentsOf: nextValue())
    }
}

extension DSChip {
    /// What the remove control is named, or nil for a chip that is not removable and has none: the app's
    /// `strings.Chip.remove` template filled with the label as it resolves where the chip renders — a localized key in
    /// the environment's locale, from the table and bundle the caller named (`DSTextContent.resolved(locale:)`) — which
    /// is "Remove North yard" under the English defaults. Chip owns no word (ADR-0032 rules 1 and 2): the body passes
    /// its own `locale` and `strings` environment values, and the fill is `DSChipAppearance.removeName(_:strings:)`.
    /// `DSButton.loadingName(locale:strings:)` is the precedent.
    ///
    /// It lives in this file because the props are private to it; it reads them and draws nothing. The web's twin is
    /// the `aria-label` `Chip.tsx` fills from `useStrings()` (`chipRemoveName`).
    func removeName(locale: Locale, strings: DSStrings) -> String? {
        guard isRemovable else { return nil }
        return DSChipAppearance.removeName(label.resolved(locale: locale), strings: strings)
    }
}

/// The pill's content, one row at the control height of its size: the leading position, the label and the trailing
/// position, with `root.paddingX` either side — or the Avatar's inset before it — and `root.gap` between. It is the
/// view the glass chip modifies, so it reads the context the chip publishes (ADR-0036 §4), and every colour here is
/// Chip's own cell on that context.
struct DSChipContent: View {
    let label: DSTextContent
    let size: DSChipSize
    let leadingIcon: DSIconName?
    let avatar: DSAvatar?
    let trailingIcon: DSIconName?
    let isSelected: Bool
    let isRemovable: Bool

    private var ds = DSThemeValues()

    // Written out for the reason `DSChip.init` is.
    init(
        label: DSTextContent,
        size: DSChipSize,
        leadingIcon: DSIconName?,
        avatar: DSAvatar?,
        trailingIcon: DSIconName?,
        isSelected: Bool,
        isRemovable: Bool
    ) {
        self.label = label
        self.size = size
        self.leadingIcon = leadingIcon
        self.avatar = avatar
        self.trailingIcon = trailingIcon
        self.isSelected = isSelected
        self.isRemovable = isRemovable
    }

    var body: some View {
        let tokens = ds.tokens
        let published = ds.surface
        let role = DSChipAppearance.labelRole(size)
        let leading = DSChipAppearance.leading(
            isSelected: isSelected, on: published, drawsAvatar: DSChipAppearance.drawsAvatar(size, hasAvatar: avatar != nil),
            leadingIcon: leadingIcon
        )
        let leadingColor = tokens[keyPath: DSChipAppearance.leadingIconColor(on: published, isSelected: isSelected)]
        let trailingColor = tokens[keyPath: DSChipAppearance.trailingIconColor(on: published)]
        return DSChipFrame(
            height: tokens[keyPath: DSChipAppearance.height(size)],
            textStyle: tokens.typography[keyPath: role.keyPath].textStyle.fontTextStyle
        ) {
            HStack(spacing: tokens[keyPath: DSChipAppearance.gap]) {
                switch leading {
                case .check:
                    // The check appears and leaves with the selection, with no fade of its own (behavior).
                    DSIcon(DSChipAppearance.checkIcon, size: DSChipAppearance.iconSize, tone: nil)
                        .foregroundStyle(leadingColor)
                        .transition(.identity)
                case .avatar:
                    if let avatar { avatar.inChip }
                case .icon(let name):
                    DSIcon(name, size: DSChipAppearance.iconSize, tone: nil)
                        .foregroundStyle(leadingColor)
                case .none:
                    EmptyView()
                }
                // One line at the role's size: the label never wraps and never truncates (behavior).
                DSText(content: label, role: role, tone: nil, trailing: nil, unit: nil, numeric: .auto, truncation: .none, maxLines: nil)
                    .fixedSize()
                    .foregroundStyle(tokens[keyPath: DSChipAppearance.labelColor(on: published, isSelected: isSelected)])
                if isRemovable {
                    // The remove control's glyph, drawn by the pill so that it scales and dims with it; the control
                    // itself is laid over it (`DSChipRemoveControl`).
                    DSIcon(DSChipAppearance.removeIcon, size: DSChipAppearance.iconSize, tone: nil)
                        .foregroundStyle(trailingColor)
                } else if let trailingIcon {
                    DSIcon(trailingIcon, size: DSChipAppearance.iconSize, tone: nil)
                        .foregroundStyle(trailingColor)
                }
            }
            .padding(.leading, DSChipAppearance.leadingPadding(size, leading: leading, tokens))
            .padding(.trailing, tokens[keyPath: DSChipAppearance.paddingX(size)])
        }
        .animation(DSChipAppearance.selectAnimation(ds.motion), value: isSelected)
    }
}

/// The pill's height: `root.height`, grown with the label along its role's Dynamic Type style, the way the label's own
/// size scales, so the pill keeps its proportions as the label grows. Button's frame scales its pill the same way.
private struct DSChipFrame<Content: View>: View {
    @ScaledMetric private var height: CGFloat
    private let content: Content

    init(height: CGFloat, textStyle: Font.TextStyle, @ViewBuilder content: () -> Content) {
        _height = ScaledMetric(wrappedValue: height, relativeTo: textStyle)
        self.content = content()
    }

    var body: some View {
        content.frame(minHeight: height)
    }
}

/// The pill around a filter's or a button's content, and every state of it.
private struct DSChipStyle: ButtonStyle {
    let isSelected: Bool

    init(isSelected: Bool) {
        self.isSelected = isSelected
    }

    func makeBody(configuration: Configuration) -> some View {
        DSChipPill(content: configuration.label, isPressed: configuration.isPressed, isSelected: isSelected, isInteractive: true)
    }
}

/// The pill: the content, the layers over the chip's rendering, the chip shape itself, and the press, hover, focus and
/// disabled states, which sit on the pill as a whole.
///
/// Internal, not private, so `DSChipRenderTests` can render a press and `DSChipBindingTests` can read what a pressed
/// pill publishes: `isPressed` comes from a `ButtonStyle.Configuration`, which nothing outside SwiftUI can make (the
/// `DSButtonPill` precedent).
///
/// Back to front: the chip's rendering (`dsSurfaceChip`), then `DSChipLayers` — the pressed fill, the hover overlay and
/// the stroke — then the content; the focus ring outside the pill.
struct DSChipPill<Content: View>: View {
    let content: Content
    let isPressed: Bool
    let isSelected: Bool
    /// Whether the pill is a control's: a static label takes no press, no hover, no focus ring and no hit region.
    let isInteractive: Bool

    private var ds = DSThemeValues()
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false

    init(content: Content, isPressed: Bool, isSelected: Bool, isInteractive: Bool) {
        self.content = content
        self.isPressed = isPressed
        self.isSelected = isSelected
        self.isInteractive = isInteractive
    }

    var body: some View {
        let tokens = ds.tokens
        let motion = ds.motion
        let interactive = isInteractive && isEnabled
        let pressed = isPressed && interactive
        let hovered = DSControlAppearance.showsHover(isHovered: isHovered, interaction: tokens.interaction, isInteractive: interactive)
        let shape = RoundedRectangle(cornerRadius: tokens[keyPath: DSChipAppearance.radius], style: .continuous)
        return content
            .background {
                DSChipLayers(shape: shape, isSelected: isSelected, isPressed: pressed, isHovered: hovered)
            }
            // The cell is the ground's alone: no input state reaches the chip shape (ADR-0037 §5).
            .dsSurfaceChip(DSChipAppearance.background(on:), in: shape)
            .overlay {
                if isInteractive && isFocused && isEnabled {
                    DSFocusRing(cornerRadius: tokens[keyPath: DSChipAppearance.radius])
                }
            }
            .modifier(DSChipHitRegion(isActive: isInteractive))
            .opacity(isEnabled ? 1 : tokens[keyPath: DSChipAppearance.disabledOpacity])
            .scaleEffect(DSControlAppearance.scale(isPressed: pressed, motion: motion))
            .animation(DSChipAppearance.pressAnimation(motion), value: pressed)
            .modifier(DSHoverTracking(isHovered: $isHovered))
            .dsPressHaptic(DSChipAppearance.pressHaptic, isPressed: pressed, isInteractive: interactive)
    }
}

/// What the pill paints over the chip's rendering and under its content, all in the pill's shape: the pressed fill,
/// the hover overlay and the stroke. It sits inside the chip shape, so it reads the context the chip publishes: the
/// stroke keys on the media under the glass, and under the fallback takes its default cell.
private struct DSChipLayers<ChipShape: InsettableShape>: View {
    let shape: ChipShape
    let isSelected: Bool
    let isPressed: Bool
    let isHovered: Bool

    private var ds = DSThemeValues()

    init(shape: ChipShape, isSelected: Bool, isPressed: Bool, isHovered: Bool) {
        self.shape = shape
        self.isSelected = isSelected
        self.isPressed = isPressed
        self.isHovered = isHovered
    }

    var body: some View {
        let tokens = ds.tokens
        let motion = ds.motion
        let border = tokens[keyPath: DSChipAppearance.border(on: ds.surface, isSelected: isSelected)]
        let width = tokens[keyPath: DSChipAppearance.borderWidth(isSelected: isSelected)]
        return ZStack {
            shape
                .fill(tokens[keyPath: DSChipAppearance.pressedOverlay])
                .opacity(isPressed ? 1 : 0)
            shape
                .fill(tokens[keyPath: DSChipAppearance.hoverOverlay])
                .opacity(isHovered ? 1 : 0)
                .animation(DSControlAppearance.hoverAnimation(motion), value: isHovered)
            shape.strokeBorder(border, lineWidth: width)
        }
        .animation(DSChipAppearance.selectAnimation(motion), value: isSelected)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// A control's hit region, the larger of the pill and `size.hit` on each axis (`DSHitRegion`); a static label keeps
/// none, since it takes no press.
private struct DSChipHitRegion: ViewModifier {
    let isActive: Bool

    init(isActive: Bool) {
        self.isActive = isActive
    }

    func body(content: Content) -> some View {
        if isActive {
            content.modifier(DSHitRegion())
        } else {
            content
        }
    }
}

/// `accessibility.keyboard`: Delete and Backspace remove a removable chip. watchOS has no hardware keyboard, and no
/// key press API.
private struct DSChipRemoveKey: ViewModifier {
    let isRemovable: Bool
    let onRemove: (() -> Void)?

    init(isRemovable: Bool, onRemove: (() -> Void)?) {
        self.isRemovable = isRemovable
        self.onRemove = onRemove
    }

    func body(content: Content) -> some View {
        #if os(watchOS)
        content
        #else
        if isRemovable {
            content.onKeyPress(keys: [.delete, .deleteForward]) { _ in
                onRemove?()
                return .handled
            }
        } else {
            content
        }
        #endif
    }
}

/// `accessibility.keyboard` and `voiceOver`: a removable chip is read as the chip and then its remove control, as the web
/// reads its two buttons. The remove control is laid over the pill, and SwiftUI vends an overlay's element before the
/// view it overlays (iOS 26.5, CI run 36207346174), so the order is set rather than left to the layout: the removable
/// chip is a container of its two elements (`accessibilityElement(children: .contain)`), and inside it the remove
/// control sorts after the chip's button, which keeps the default priority. The container scopes the priority to those
/// two: without it the remove control would sort after every element at its level, the rest of the screen included.
/// Accessibility only: no pixel, name or trait changes, and neither does the keyboard focus order, which the focus
/// system takes from the layout.
private struct DSChipRemoveOrder: ViewModifier {
    /// Below the chip's button, which keeps SwiftUI's default of 0.
    static let removeControlPriority: Double = -1

    let isRemovable: Bool

    init(isRemovable: Bool) {
        self.isRemovable = isRemovable
    }

    func body(content: Content) -> some View {
        if isRemovable {
            content.accessibilityElement(children: .contain)
        } else {
            content
        }
    }
}

/// The remove control: its own button, laid over the nav.close the pill draws in the trailing position, `root.paddingX`
/// from the pill's trailing edge. It draws nothing of its own but its focus ring, so the glyph scales and dims with the
/// pill; its hit region is the larger of the glyph's box and `size.hit` on each axis, and it sits above the pill's, so a
/// press on it never reaches the chip's own button. It is its own element, named by `strings.Chip.remove`.
private struct DSChipRemoveControl: View {
    let name: String
    let size: DSChipSize
    let action: () -> Void

    private var ds = DSThemeValues()

    init(name: String, size: DSChipSize, action: @escaping () -> Void) {
        self.name = name
        self.size = size
        self.action = action
    }

    var body: some View {
        let tokens = ds.tokens
        return Button(action: action) {
            Color.clear
        }
        .buttonStyle(DSChipRemoveStyle())
        .focusEffectDisabled()
        .accessibilityLabel(Text(verbatim: name))
        .padding(.trailing, tokens[keyPath: DSChipAppearance.paddingX(size)])
    }
}

/// The remove control's target: the glyph's box, hit-testable, widened to `size.hit`, with a round focus ring outside
/// it while it has focus.
private struct DSChipRemoveStyle: ButtonStyle {
    init() {}

    func makeBody(configuration: Configuration) -> some View {
        DSChipRemoveTarget(label: configuration.label)
    }
}

private struct DSChipRemoveTarget<Label: View>: View {
    let label: Label

    private var ds = DSThemeValues()
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused

    init(label: Label) {
        self.label = label
    }

    var body: some View {
        let side = DSIconAppearance.box(DSChipAppearance.iconSize, ds.tokens.size)
        return label
            .frame(width: side, height: side)
            .contentShape(Rectangle())
            .overlay {
                if isFocused && isEnabled {
                    DSFocusRing(.circle)
                }
            }
            .modifier(DSHitRegion())
    }
}
