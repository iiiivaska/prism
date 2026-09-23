import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// IconButton: a circular action carrying one glyph and no word (`spec/components/IconButton.yaml`, specVersion 1).
///
///     DSIconButton("Open settings", glyph: .actionSettings) { openSettings() }
///     DSIconButton("Add a site", glyph: .actionAdd, variant: .primary) { add() }
///     DSIconButton("Open notifications", glyph: .objectNotification, badge: DSBadge(count: 3, label: "unread")) {}
///
/// It is Button's pill at its shortest: `primary` is the single solid circle of a group — the inverse solid, which turns
/// white with an ink glyph on vivid and on the scheme's glass — `secondary` a raised puck with a hairline, `ghost` a
/// hairline ring, `plain` the bare glyph, and `danger` a critical tint with a critical glyph and ring. Every colour is
/// read against the material the enclosing `DSSurfaceView` publishes.
///
/// Behaviour, from the spec:
///  - `action` fires once on release inside the hit region; a drag outside cancels (SwiftUI's `Button`). Space and
///    Enter activate it where a keyboard can focus it.
///  - The circle is a square of `comp.icon-button.size.*`, which follows density and never Dynamic Type or modality;
///    the hit region is the larger of the circle and `size.hit` on each axis and reaches past it invisibly. `plain`
///    draws nothing but its glyph, so for it the region is the whole affordance.
///  - The name is `label`, always, on every platform: the glyph is an Icon with no label, hidden, and its registry id is
///    never a name (ADR-0032 rules 6 and 8). Nothing shows the name on screen — no help tag, no hint — until Prism has
///    a Tooltip of its own: SwiftUI's `help` would also set the accessibility hint, and VoiceOver would read the name
///    twice (behavior, "Prism has no Tooltip yet").
///  - `isSelected` renders the circle as `primary` in every state — the `selected` cells, no ring, no underlay, and
///    primary's pressed overlay — and adds the selected trait. The role stays a button.
///  - A press scales the circle to 0.97 on `motion.spring.snappy` and plays `haptic.press.button`, the one haptic a
///    press plays (a group that selects replaces it, as TabBar does). Secondary, ghost and plain take their pressed
///    fill, primary and danger the pressed overlay, on every press; under Reduce Motion nothing scales and the fills
///    change over `motion.duration.base` with `motion.easing.out`. A pressed primary or selected circle shows nothing
///    there on a solid ground, or on vivid or glass in dark: Button's gap, stated on
///    `DSIconButtonAppearance.pressedOverlay`.
///  - Hover, under pointer modality only, lays `color.bg.fill.neutral.subtle` over the circle, never over the hit region.
///  - On vivid and on the scheme's glass a danger circle paints an opaque `color.bg.page` disc under its tint.
///  - `isDisabled` lowers the whole control, badge included, to `opacity.disabled` and takes it out of input and the
///    focus order.
///  - The focus ring is `color.border.focus` at `border.focus` outside the circle, following `radius.control`; it
///    surrounds the circle and never the badge, and is drawn as a circle, as the body is (`DSFocusRing.Outline`).
///  - A `badge` is anchored `space.1` outside the circle's top-trailing corner, overlapping it. It scales with the press
///    and dims with the control, never changes the layout or the hit region, is never focusable and is hidden — the
///    button reads it instead, as its accessibility **value**: `strings.Badge.count` filled with the true count and
///    the badge's label ("3 unread"), or the formatted count alone when the badge has no label (behavior, ADR-0032).
///    The slot is typed as a Badge, not a view, so the button can read those words in the render that draws it
///    (ADR-0034).
///
/// watchOS is `none` in the spec — the watch acts through Button and system chrome — and `DSComponentsManifest`
/// declares no watch entry; the type still builds there, as Badge and Divider do.
public struct DSIconButton: View {
    private let label: DSTextContent
    private let glyph: DSIconName
    private let variant: DSIconButtonVariant
    private let size: DSIconButtonSize
    private let badge: DSBadge?
    private let isSelected: Bool
    private let isDisabled: Bool
    private let action: () -> Void

    /// The locale the badge's count is formatted in and its label resolved in (ADR-0032 rule 4).
    @Environment(\.locale) private var locale
    /// The app's strings table, whose `Badge.count` template the badge's contribution fills (ADR-0032).
    @Environment(\.dsStrings) private var strings

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site. The three label forms are `DSButton`'s.

    /// A button whose name is a localized string key, looked up like SwiftUI's `Text(_:tableName:bundle:comment:)`.
    ///
    /// - Parameters:
    ///   - key: the accessible name: a verb-first sentence ("Refresh readings"), spoken and never drawn.
    ///   - glyph: the registry glyph the circle carries, at Icon's box of the same size.
    ///   - variant: `secondary` by default; one `primary` or selected circle per group.
    ///   - size: `md` by default. The side follows density: md is 32 pt in compact, 40 in regular, 48 in comfortable.
    ///   - badge: a Badge anchored outside the top-trailing corner, read into the button's accessibility value.
    ///   - isSelected: renders the inverse solid whatever the variant, and is announced as selected.
    ///   - isDisabled: dims the button and takes it out of input and the focus order.
    ///   - action: the spec's `onPress`, fired on release.
    public init(
        _ key: LocalizedStringKey,
        tableName: String? = nil,
        bundle: Bundle? = nil,
        glyph: DSIconName,
        variant: DSIconButtonVariant = .secondary,
        size: DSIconButtonSize = .md,
        badge: DSBadge? = nil,
        isSelected: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.init(
            content: .localized(key, tableName: tableName, bundle: bundle), glyph: glyph, variant: variant, size: size,
            badge: badge, isSelected: isSelected, isDisabled: isDisabled, action: action
        )
    }

    /// A button whose name is used as given, without localization.
    public init(
        verbatim label: String,
        glyph: DSIconName,
        variant: DSIconButtonVariant = .secondary,
        size: DSIconButtonSize = .md,
        badge: DSBadge? = nil,
        isSelected: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.init(
            content: .verbatim(label), glyph: glyph, variant: variant, size: size, badge: badge,
            isSelected: isSelected, isDisabled: isDisabled, action: action
        )
    }

    /// A button whose name is a string the app already holds, used without localization.
    @_disfavoredOverload
    public init<S: StringProtocol>(
        _ label: S,
        glyph: DSIconName,
        variant: DSIconButtonVariant = .secondary,
        size: DSIconButtonSize = .md,
        badge: DSBadge? = nil,
        isSelected: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.init(
            content: .verbatim(String(label)), glyph: glyph, variant: variant, size: size, badge: badge,
            isSelected: isSelected, isDisabled: isDisabled, action: action
        )
    }

    init(
        content: DSTextContent,
        glyph: DSIconName,
        variant: DSIconButtonVariant,
        size: DSIconButtonSize,
        badge: DSBadge?,
        isSelected: Bool,
        isDisabled: Bool,
        action: @escaping () -> Void
    ) {
        label = content
        self.glyph = glyph
        self.variant = variant
        self.size = size
        self.badge = badge
        self.isSelected = isSelected
        self.isDisabled = isDisabled
        self.action = action
    }

    public var body: some View {
        let value = badge?.contribution(locale: locale, strings: strings)
        return Button(action: action) {
            // No label and the `inherit` tone: the glyph is hidden and takes the circle's foreground (Icon.yaml
            // behaviors 9 and 14), so the button carries the name and the glyph adds no element.
            DSIcon(glyph, size: DSIconButtonAppearance.iconSize(size), tone: nil)
        }
        .buttonStyle(DSIconButtonStyle(variant: variant, size: size, isSelected: isSelected, badge: badge))
        .disabled(isDisabled)
        .focusEffectDisabled()
        .accessibilityLabel(label.text)
        // The badge's contribution, and no value at all without one. `isEnabled` keeps the modifier, and so the
        // button's identity, when a badge appears or goes, so a focused button does not lose its focus to a count.
        .accessibilityValue(Text(verbatim: value ?? ""), isEnabled: value != nil)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

/// The circle around the glyph, and every state of it.
struct DSIconButtonStyle: ButtonStyle {
    let variant: DSIconButtonVariant
    let size: DSIconButtonSize
    let isSelected: Bool
    let badge: DSBadge?

    init(variant: DSIconButtonVariant, size: DSIconButtonSize, isSelected: Bool, badge: DSBadge?) {
        self.variant = variant
        self.size = size
        self.isSelected = isSelected
        self.badge = badge
    }

    func makeBody(configuration: Configuration) -> some View {
        DSIconButtonCircle(
            label: configuration.label,
            isPressed: configuration.isPressed,
            variant: variant,
            size: size,
            isSelected: isSelected,
            badge: badge
        )
    }
}

/// Internal, not private, so `DSIconButtonReduceMotionTests` can render a press: `isPressed` comes from a
/// `ButtonStyle.Configuration`, which nothing outside SwiftUI can make (the `DSButtonPill` precedent).
///
/// Layers, bottom to top: the underlay, the fill, the pressed overlay, the hover overlay, the ring (inside the circle),
/// the glyph; then the focus ring outside the circle, and the badge on top of everything.
struct DSIconButtonCircle<Label: View>: View {
    let label: Label
    let isPressed: Bool
    let variant: DSIconButtonVariant
    let size: DSIconButtonSize
    let isSelected: Bool
    let badge: DSBadge?

    private var ds = DSThemeValues()
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false

    init(
        label: Label,
        isPressed: Bool,
        variant: DSIconButtonVariant,
        size: DSIconButtonSize,
        isSelected: Bool,
        badge: DSBadge?
    ) {
        self.label = label
        self.isPressed = isPressed
        self.variant = variant
        self.size = size
        self.isSelected = isSelected
        self.badge = badge
    }

    var body: some View {
        let tokens = ds.tokens
        let motion = ds.motion
        let material = ds.surface.material
        let interactive = isEnabled
        let pressed = isPressed && interactive
        let hovered = DSControlAppearance.showsHover(isHovered: isHovered, interaction: tokens.interaction, isInteractive: interactive)
        let rendered = DSIconButtonAppearance.rendered(variant, isSelected: isSelected)
        let side = DSIconButtonAppearance.side(size, tokens.components.iconButton)
        let fill = DSIconButtonAppearance.fill(variant, isSelected: isSelected, isPressed: pressed, on: material)
        let offset = tokens[keyPath: DSIconButtonAppearance.badgeOffset]

        return label
            .frame(width: side, height: side)
            .foregroundStyle(tokens[keyPath: DSIconButtonAppearance.glyph(variant, isSelected: isSelected, on: material)])
            .background {
                ZStack {
                    if let underlay = DSIconButtonAppearance.underlay(rendered, on: material) {
                        Circle().fill(tokens[keyPath: underlay])
                    }
                    Circle().fill(fill.map { tokens[keyPath: $0] } ?? .clear)
                    if let overlay = DSIconButtonAppearance.pressedOverlay(rendered) {
                        Circle()
                            .fill(tokens[keyPath: overlay])
                            .opacity(pressed ? 1 : 0)
                    }
                    Circle()
                        .fill(tokens[keyPath: DSIconButtonAppearance.hoverOverlay])
                        .opacity(hovered ? 1 : 0)
                        .animation(DSControlAppearance.hoverAnimation(motion), value: hovered)
                    if let border = DSIconButtonAppearance.border(rendered, on: material),
                       let width = DSIconButtonAppearance.borderWidth(rendered) {
                        Circle().strokeBorder(tokens[keyPath: border], lineWidth: tokens[keyPath: width])
                    }
                }
            }
            .overlay {
                if isFocused && isEnabled {
                    // `radius.control` on a square box is a circle, so the ring is one too: written as a rounded
                    // rectangle at that radius it would be a squircle, off the round body at the diagonals.
                    DSFocusRing(.circle)
                }
            }
            .overlay(alignment: .topTrailing) {
                // `space.1` above the circle's top edge and past its trailing edge: the badge's own point that far in
                // from its top-trailing corner sits on the circle's corner. The guides go on the slot, outside its
                // `if let`: written on the badge inside the conditional, the overlay never reads them and the badge
                // sits flush in the corner (measured, and held by `DSIconButtonRenderTests`).
                DSIconButtonBadgeSlot(badge: badge)
                    .alignmentGuide(.top) { $0[.top] + offset }
                    .alignmentGuide(.trailing) { $0[.trailing] - offset }
            }
            .animation(DSIconButtonAppearance.selectAnimation(motion), value: isSelected)
            .modifier(DSHitRegion())
            .opacity(isEnabled ? 1 : tokens.opacity.disabled)
            .scaleEffect(DSControlAppearance.scale(isPressed: pressed, motion: motion))
            .animation(DSIconButtonAppearance.pressAnimation(motion), value: pressed)
            .modifier(DSHoverTracking(isHovered: $isHovered))
            .dsPressHaptic(DSIconButtonAppearance.pressHaptic, isPressed: pressed, isInteractive: interactive)
    }
}

/// The `badge` slot: the badge, hosted — so it hides itself and the button speaks its contribution as its value
/// (Badge.yaml behavior 10) — or nothing.
private struct DSIconButtonBadgeSlot: View {
    let badge: DSBadge?

    init(badge: DSBadge?) {
        self.badge = badge
    }

    var body: some View {
        if let badge {
            badge.environment(\.dsBadgeIsHosted, true)
        }
    }
}
