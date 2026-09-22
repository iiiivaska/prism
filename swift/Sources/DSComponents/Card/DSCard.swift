import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// Card: the corner-pinned card (`spec/components/Card.yaml`, specVersion 2).
///
/// A `DSSurfaceView` of the chosen material with a fixed anatomy: title and caption pinned top-left (an icon ring above
/// them off vivid), one action or the open affordance at the top-right padding corner, the caller's content under the
/// header, the hero metric pinned bottom-left and the aside — meta or a mini chart — bottom-right on the hero's
/// baseline. The middle may stay empty; the card keeps the frame the layout gives it.
///
///     DSCard("Line output", caption: "Last 24 hours", hero: DSCardHero("86", trailing: ".4", unit: "%"),
///            onAction: openDetail, aside: { sparkline })
///
///     DSCard("Average yield", caption: "Dollars per batch", variant: .vivid, vivid: .slot1,
///            hero: DSCardHero("$2,450"), size: .compact)
///
/// Behaviour, from the spec:
///  - `solid` is flat on `comp.card.solid.bg`; `vivid` draws a gradient slot (unset: the default gradient) with its
///    bloom; `glass` floats on the scheme's glass and needs a `backdrop` of image, map or vivid, or the Surface falls
///    back to the opaque raised card; `tinted` lays `color.bg.tint.accent` over the page and is a light-scheme look.
///  - Title and caption colours follow the material the card's Surface publishes, and on the scheme's glass the
///    caption also its backdrop kind; under the glass fallback the card renders the standard tones.
///  - On vivid the hero holds only its value and trailing group; the unit joins the caption line, where V2 guarantees
///    the functional tier (V3, ADR-0030 §8). The icon ring is not drawn on vivid, and on vivid the header ends where the
///    V2 header block does.
///  - `action: .open` draws the `nav.open` glyph; with `onAction` the whole card is the button. Under pointer modality
///    the glyph shows on hover and on keyboard focus, under touch always. `action: .custom` draws one solid action
///    circle, and only that circle is pressable.
///  - A press scales the card to 0.97 on `motion.spring.snappy` with the `color.bg.fill.neutral.subtle` overlay and
///    `haptic.press.button`; under Reduce Motion only the overlay shows, over `motion.duration.base` with
///    `motion.easing.out`. Hover (pointer, pressable cards) lays the same overlay on solid and tinted cards.
///  - `isSelected` passes `selected` to the Surface, lifts the card to `comp.card.shadow.floating` and draws the
///    selection outline for the published material, on `motion.spring.smooth` (a crossfade under Reduce Motion).
///  - The focus ring follows the card radius outside the card.
///  - The aside wraps below the hero when both do not fit; the hero clamps at accessibility3.
///  - On watchOS the card is solid, compact and has no aside.
///
/// A card has one action: never put a button row inside it.
public struct DSCard<Content: View, Aside: View>: View {
    private let title: LocalizedStringKey
    private let caption: LocalizedStringKey?
    private let variant: DSCardVariant
    private let vivid: DSVividSlot
    private let icon: DSIconName?
    private let action: DSCardAction
    private let hero: DSCardHero?
    private let size: DSCardSize
    private let backdrop: DSBackdropKind
    private let isSelected: Bool
    private let onAction: (() -> Void)?
    private let content: Content
    private let aside: Aside

    /// - Parameters:
    ///   - title: the title, `type.headline`, at most two lines. Localized; interpolate a value the app holds
    ///     (`"\(name)"`).
    ///   - caption: the caption under the title, `type.caption`, one line.
    ///   - variant: `solid` by default.
    ///   - vivid: the gradient slot of a vivid card; `default` takes `gradient.vivid.default`. A 2×2 alternates one
    ///     slot pair on its diagonals (`slot1` and `slot2`, or `slot3` and `slot4`).
    ///   - icon: a registry glyph in a hairline ring above the title; not drawn on vivid.
    ///   - action: `open` by default.
    ///   - hero: the bottom-left metric.
    ///   - size: `large` for cards with a side of 200 pt or more; `compact` for small tiles.
    ///   - backdrop: what a glass card sits on: image, map or vivid.
    ///   - isSelected: the selected state.
    ///   - onAction: fired by the whole card for `open`, by the circle for `custom`.
    ///   - content: the body slot under the header.
    ///   - aside: the bottom-right slot: a sparkline, a glyph or meta text, baseline-locked to the hero. On vivid it
    ///     holds a sparkline, a glyph or text of 24 pt or more.
    public init(
        _ title: LocalizedStringKey,
        caption: LocalizedStringKey? = nil,
        variant: DSCardVariant = .solid,
        vivid: DSVividSlot = .default,
        icon: DSIconName? = nil,
        action: DSCardAction = .open,
        hero: DSCardHero? = nil,
        size: DSCardSize = .regular,
        backdrop: DSBackdropKind = .none,
        isSelected: Bool = false,
        onAction: (() -> Void)? = nil,
        @ViewBuilder content: () -> Content,
        @ViewBuilder aside: () -> Aside
    ) {
        self.title = title
        self.caption = caption
        self.variant = variant
        self.vivid = vivid
        self.icon = icon
        self.action = action
        self.hero = hero
        self.size = size
        self.backdrop = backdrop
        self.isSelected = isSelected
        self.onAction = onAction
        self.content = content()
        self.aside = aside()
    }

    public var body: some View {
        let parts = DSCardParts(
            title: title, caption: caption, variant: variant.rendered(), vivid: vivid, icon: icon, action: action,
            hero: hero, size: size.rendered(), backdrop: backdrop, isSelected: isSelected,
            hasContent: Content.self != EmptyView.self,
            hasAside: Aside.self != EmptyView.self && !DSPlatform.isWatch
        )
        if let onAction, DSCardAppearance.isPressable(action.kind, hasAction: true) {
            Button(action: onAction) {
                DSCardLabel(parts: parts, isPressable: true, onAction: nil, content: content, aside: aside)
            }
            .buttonStyle(DSCardButtonStyle())
            .focusEffectDisabled()
            .accessibilityLabel(parts.accessibilityLabel)
            .accessibilityAddTraits(isSelected ? .isSelected : [])
        } else {
            // A group: its label is the card's, and whatever the body, the aside or the action circle holds stays
            // reachable inside it.
            DSCardLabel(parts: parts, isPressable: false, onAction: onAction, content: content, aside: aside)
                .accessibilityElement(children: .contain)
                .accessibilityLabel(parts.accessibilityLabel)
                .accessibilityAddTraits(isSelected ? .isSelected : [])
        }
    }
}

extension DSCard where Content == EmptyView, Aside == EmptyView {
    /// A card with no body and no aside.
    public init(
        _ title: LocalizedStringKey,
        caption: LocalizedStringKey? = nil,
        variant: DSCardVariant = .solid,
        vivid: DSVividSlot = .default,
        icon: DSIconName? = nil,
        action: DSCardAction = .open,
        hero: DSCardHero? = nil,
        size: DSCardSize = .regular,
        backdrop: DSBackdropKind = .none,
        isSelected: Bool = false,
        onAction: (() -> Void)? = nil
    ) {
        self.init(
            title, caption: caption, variant: variant, vivid: vivid, icon: icon, action: action, hero: hero, size: size,
            backdrop: backdrop, isSelected: isSelected, onAction: onAction, content: { EmptyView() }, aside: { EmptyView() }
        )
    }
}

extension DSCard where Aside == EmptyView {
    /// A card with a body and no aside.
    public init(
        _ title: LocalizedStringKey,
        caption: LocalizedStringKey? = nil,
        variant: DSCardVariant = .solid,
        vivid: DSVividSlot = .default,
        icon: DSIconName? = nil,
        action: DSCardAction = .open,
        hero: DSCardHero? = nil,
        size: DSCardSize = .regular,
        backdrop: DSBackdropKind = .none,
        isSelected: Bool = false,
        onAction: (() -> Void)? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.init(
            title, caption: caption, variant: variant, vivid: vivid, icon: icon, action: action, hero: hero, size: size,
            backdrop: backdrop, isSelected: isSelected, onAction: onAction, content: content, aside: { EmptyView() }
        )
    }
}

extension DSCard where Content == EmptyView {
    /// A card with an aside and no body. Pass the aside with its label, `aside: { … }`: a single trailing closure is the
    /// body.
    @_disfavoredOverload
    public init(
        _ title: LocalizedStringKey,
        caption: LocalizedStringKey? = nil,
        variant: DSCardVariant = .solid,
        vivid: DSVividSlot = .default,
        icon: DSIconName? = nil,
        action: DSCardAction = .open,
        hero: DSCardHero? = nil,
        size: DSCardSize = .regular,
        backdrop: DSBackdropKind = .none,
        isSelected: Bool = false,
        onAction: (() -> Void)? = nil,
        @ViewBuilder aside: () -> Aside
    ) {
        self.init(
            title, caption: caption, variant: variant, vivid: vivid, icon: icon, action: action, hero: hero, size: size,
            backdrop: backdrop, isSelected: isSelected, onAction: onAction, content: { EmptyView() }, aside: aside
        )
    }
}

/// The props that render, after the watch adaptation.
struct DSCardParts {
    let title: LocalizedStringKey
    let caption: LocalizedStringKey?
    let variant: DSCardVariant
    let vivid: DSVividSlot
    let icon: DSIconName?
    let action: DSCardAction
    let hero: DSCardHero?
    let size: DSCardSize
    let backdrop: DSBackdropKind
    let isSelected: Bool
    let hasContent: Bool
    let hasAside: Bool

    /// Title, caption and hero value, joined: "Line output, Last 24 hours, 86.4 %" (Card.yaml `accessibility.label`).
    var accessibilityLabel: Text {
        var parts = [Text(title)]
        if let caption { parts.append(Text(caption)) }
        if let hero {
            let value = hero.value + (hero.trailing ?? "")
            parts.append(Text(verbatim: hero.unit.map { "\(value) \($0)" } ?? value))
        }
        return parts.dropFirst().reduce(parts[0]) { Text("\($0), \($1)") }
    }
}

/// Whether the pressable card is pressed, handed from the button style to the layers inside the Surface.
struct DSCardPress: Equatable {
    var isPressed: Bool
}

private struct DSCardPressKey: EnvironmentKey {
    static let defaultValue = DSCardPress(isPressed: false)
}

extension EnvironmentValues {
    var dsCardPress: DSCardPress {
        get { self[DSCardPressKey.self] }
        set { self[DSCardPressKey.self] = newValue }
    }
}

private struct DSCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .environment(\.dsCardPress, DSCardPress(isPressed: configuration.isPressed))
    }
}

/// The card: its Surface, the press, hover and selection, and the anatomy inside.
private struct DSCardLabel<Content: View, Aside: View>: View {
    let parts: DSCardParts
    let isPressable: Bool
    let onAction: (() -> Void)?
    let content: Content
    let aside: Aside

    private var ds = DSThemeValues()
    @Environment(\.dsCardPress) private var press
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false

    init(parts: DSCardParts, isPressable: Bool, onAction: (() -> Void)?, content: Content, aside: Aside) {
        self.parts = parts
        self.isPressable = isPressable
        self.onAction = onAction
        self.content = content
        self.aside = aside
    }

    var body: some View {
        let tokens = ds.tokens
        let motion = ds.motion
        let pressed = press.isPressed && isPressable
        let focused = isFocused && isPressable
        let hovered = DSControlAppearance.showsHover(isHovered: isHovered, interaction: tokens.interaction, isInteractive: isPressable)
        DSSurfaceView(
            material: parts.variant.material,
            vivid: parts.vivid,
            radius: DSCardAppearance.radius(parts.size, density: tokens.context.density),
            elevation: DSCardAppearance.elevation(parts.variant, isSelected: parts.isSelected),
            padding: .card,
            backdrop: parts.backdrop,
            selected: parts.isSelected
        ) {
            DSCardAnatomy(
                parts: parts,
                state: DSCardState(isPressed: pressed, isHovered: hovered, isFocused: focused, isRawHovered: isHovered),
                onAction: onAction,
                content: content,
                aside: aside
            )
        }
        .cardHeaderBlock()
        .scaleEffect(DSControlAppearance.scale(isPressed: pressed, motion: motion))
        .animation(DSCardAppearance.pressAnimation(motion), value: pressed)
        .animation(DSCardAppearance.selectAnimation(motion), value: parts.isSelected)
        .modifier(DSHoverTracking(isHovered: $isHovered))
        .dsPressHaptic(.pressButton, isPressed: pressed, isInteractive: isPressable)
    }
}

/// The interaction state the layers inside the Surface draw.
struct DSCardState: Equatable {
    let isPressed: Bool
    /// Hovered and pressable: what the overlay shows.
    let isHovered: Bool
    let isFocused: Bool
    /// The pointer is over the card at all: what reveals the open glyph.
    let isRawHovered: Bool
}

/// The corner-pinned anatomy, laid out inside the card's padding, reading the context the card's Surface publishes.
private struct DSCardAnatomy<Content: View, Aside: View>: View {
    let parts: DSCardParts
    let state: DSCardState
    let onAction: (() -> Void)?
    let content: Content
    let aside: Aside

    private var ds = DSThemeValues()
    @Environment(\.dsSurfaceGeometry) private var geometry

    init(parts: DSCardParts, state: DSCardState, onAction: (() -> Void)?, content: Content, aside: Aside) {
        self.parts = parts
        self.state = state
        self.onAction = onAction
        self.content = content
        self.aside = aside
    }

    var body: some View {
        let tokens = ds.tokens
        let surface = ds.surface
        let space = tokens.space
        let actionWidth = DSCardAppearance.actionWidth(parts.action.kind, tokens)
        let trailing = DSCardAppearance.headerTrailingSpace(on: surface.material, actionWidth: actionWidth, tokens)
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 0) {
                header(tokens, surface: surface)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.trailing, trailing - actionWidth)
                actionView(tokens, surface: surface)
            }
            if parts.hasContent {
                content
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, space.step4)
            }
            Spacer(minLength: 0)
            if parts.hero != nil || parts.hasAside {
                footer(tokens, surface: surface)
                    .padding(.top, space.step4)
            }
        }
        .background {
            if let geometry {
                DSCardLayers(parts: parts, state: state, material: surface.material, geometry: geometry)
            }
        }
    }

    // MARK: Header

    private func header(_ tokens: DSTokenSet, surface: DSSurfaceContext) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if let icon = parts.icon, DSCardAppearance.drawsIconRing(on: surface.material) {
                DSCardIconRing(icon: icon)
                    .padding(.bottom, tokens.space.step4)
            }
            VStack(alignment: .leading, spacing: tokens.space.step1) {
                DSText(
                    content: .localized(parts.title, tableName: nil, bundle: nil),
                    role: .headline,
                    tone: DSCardAppearance.title(on: surface) == nil ? .primary : nil,
                    trailing: nil, unit: nil, numeric: .auto,
                    truncation: .ellipsis, maxLines: DSCardAppearance.titleLines
                )
                .modifier(DSForeground(color: DSCardAppearance.title(on: surface).map { tokens[keyPath: $0] }))
                if let line = captionLine(on: surface.material) {
                    DSText(
                        content: line,
                        role: .caption,
                        tone: DSCardAppearance.caption(on: surface) == nil ? .secondary : nil,
                        trailing: nil, unit: nil, numeric: .auto,
                        truncation: .ellipsis, maxLines: DSCardAppearance.captionLines
                    )
                    .modifier(DSForeground(color: DSCardAppearance.caption(on: surface).map { tokens[keyPath: $0] }))
                }
            }
        }
    }

    /// The caption, and on vivid the hero's unit joined to it (V3).
    private func captionLine(on material: DSSurfaceMaterial) -> DSTextContent? {
        let unit = DSCardAppearance.unitJoinsCaption(on: material) ? parts.hero?.unit : nil
        switch (parts.caption, unit) {
        case let (caption?, unit?):
            return .joined(Text("\(Text(caption))\(Text(verbatim: DSCardAppearance.unitSeparator))\(Text(verbatim: unit))"))
        case let (caption?, nil):
            return .localized(caption, tableName: nil, bundle: nil)
        case let (nil, unit?):
            return .verbatim(unit)
        case (nil, nil):
            return nil
        }
    }

    // MARK: Action

    @ViewBuilder
    private func actionView(_ tokens: DSTokenSet, surface: DSSurfaceContext) -> some View {
        switch parts.action {
        case .none:
            EmptyView()
        case .open:
            DSGlyph(.navOpen, box: tokens.size.iconSm)
                .foregroundStyle(tokens[keyPath: DSCardAppearance.action(on: surface)])
                .opacity(
                    DSCardAppearance.showsOpenGlyph(
                        interaction: tokens.interaction, isHovered: state.isRawHovered, isFocused: state.isFocused
                    ) ? 1 : 0
                )
                .animation(DSControlAppearance.hoverAnimation(ds.motion), value: state.isRawHovered)
        case let .custom(glyph, label):
            DSCardActionCircle(glyph: glyph, label: label, action: onAction)
        }
    }

    // MARK: Footer

    private func footer(_ tokens: DSTokenSet, surface: DSSurfaceContext) -> some View {
        let gap = tokens.space.step3
        return ViewThatFits(in: .horizontal) {
            HStack(alignment: .lastTextBaseline, spacing: gap) {
                heroView(surface: surface)
                Spacer(minLength: 0)
                if parts.hasAside { aside }
            }
            VStack(alignment: .leading, spacing: gap) {
                heroView(surface: surface)
                if parts.hasAside {
                    aside.frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
        }
    }

    @ViewBuilder
    private func heroView(surface: DSSurfaceContext) -> some View {
        if let hero = parts.hero {
            DSText(
                verbatim: hero.value,
                role: .metricLg,
                tone: hero.tone ?? .primary,
                trailing: hero.trailing,
                unit: DSCardAppearance.unitJoinsCaption(on: surface.material) ? nil : hero.unit
            )
            .dynamicTypeSize(...DSCardAppearance.heroLargestTypeSize)
        }
    }
}

extension DSCardAppearance {
    /// What joins the caption and the unit on vivid, as the direction board's vivid captions read ("New best · min:s").
    static let unitSeparator = " · "

    /// The hero clamps at accessibility3 (Card.yaml `accessibility.dynamicType`).
    static let heroLargestTypeSize: DynamicTypeSize = .accessibility3
}

/// The layers the card draws inside its Surface's shape and around it: the tint, the hover and pressed overlays, the
/// selection outline and the focus ring. They sit behind the anatomy, above the Surface's own layers, and reach out to
/// the shape by the card padding the Surface publishes with its radius.
private struct DSCardLayers: View {
    let parts: DSCardParts
    let state: DSCardState
    let material: DSSurfaceMaterial
    let geometry: DSSurfaceGeometry
    private var ds = DSThemeValues()

    init(parts: DSCardParts, state: DSCardState, material: DSSurfaceMaterial, geometry: DSSurfaceGeometry) {
        self.parts = parts
        self.state = state
        self.material = material
        self.geometry = geometry
    }

    var body: some View {
        let tokens = ds.tokens
        let shape = RoundedRectangle(cornerRadius: geometry.radius, style: .continuous)
        ZStack {
            if let tint = DSCardAppearance.tint(parts.variant) {
                shape.fill(tokens[keyPath: tint])
            }
            if let hover = DSCardAppearance.hoverOverlay(parts.variant) {
                shape
                    .fill(tokens[keyPath: hover])
                    .opacity(state.isHovered ? 1 : 0)
                    .animation(DSControlAppearance.hoverAnimation(ds.motion), value: state.isHovered)
            }
            shape
                .fill(tokens[keyPath: DSCardAppearance.pressedOverlay])
                .opacity(state.isPressed ? 1 : 0)
            if let border = DSCardAppearance.selectedBorder(on: material) {
                shape
                    .strokeBorder(tokens[keyPath: border], lineWidth: DSCardAppearance.selectedBorderWidth(tokens.border))
                    .opacity(parts.isSelected ? 1 : 0)
            }
            if state.isFocused {
                DSFocusRing(cornerRadius: geometry.radius)
            }
        }
        .padding(-geometry.padding)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// The icon ring: a `size.icon.ring` circle in a `color.border.hairline` hairline around a `size.icon.md` glyph in
/// Icon's primary tone.
private struct DSCardIconRing: View {
    let icon: DSIconName
    private var ds = DSThemeValues()

    init(icon: DSIconName) {
        self.icon = icon
    }

    var body: some View {
        let tokens = ds.tokens
        DSGlyph(icon, box: tokens.size.iconMd)
            .foregroundStyle(tokens[keyPath: DSGlyphTone.primary.color(on: ds.surface)])
            .frame(width: tokens.size.iconRing, height: tokens.size.iconRing)
            .overlay {
                Circle().strokeBorder(tokens.color.borderHairline, lineWidth: tokens.border.hairline)
            }
    }
}

/// The `custom` action: one solid circle at `size.control.md` with a `size.icon.sm` glyph, pressable on its own, with
/// the hit region, the press, hover, the focus ring and the haptic of every Prism control. On vivid and on the
/// scheme's glass the circle carries the `tokens.action.border` hairline.
private struct DSCardActionCircle: View {
    let glyph: DSIconName
    let label: LocalizedStringKey
    let action: (() -> Void)?
    private var ds = DSThemeValues()

    init(glyph: DSIconName, label: LocalizedStringKey, action: (() -> Void)?) {
        self.glyph = glyph
        self.label = label
        self.action = action
    }

    var body: some View {
        let glyphView = DSGlyph(glyph, box: ds.tokens.size.iconSm)
        if let action {
            Button(action: action) { glyphView }
                .buttonStyle(DSCardActionStyle())
                .focusEffectDisabled()
                .accessibilityLabel(Text(label))
        } else {
            DSCardActionDisc(label: glyphView, isPressed: false, isInteractive: false)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(Text(label))
        }
    }
}

private struct DSCardActionStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        DSCardActionDisc(label: configuration.label, isPressed: configuration.isPressed, isInteractive: true)
    }
}

private struct DSCardActionDisc<Label: View>: View {
    let label: Label
    let isPressed: Bool
    let isInteractive: Bool

    private var ds = DSThemeValues()
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false

    init(label: Label, isPressed: Bool, isInteractive: Bool) {
        self.label = label
        self.isPressed = isPressed
        self.isInteractive = isInteractive
    }

    var body: some View {
        let tokens = ds.tokens
        let motion = ds.motion
        let material = ds.surface.material
        let interactive = isInteractive && isEnabled
        let pressed = isPressed && interactive
        let hovered = DSControlAppearance.showsHover(isHovered: isHovered, interaction: tokens.interaction, isInteractive: interactive)
        let solid = DSCardAppearance.actionSolid(on: material)
        let side = tokens.size.controlMd
        label
            .frame(width: side, height: side)
            .foregroundStyle(tokens[keyPath: solid.glyph])
            .background {
                ZStack {
                    Circle().fill(tokens[keyPath: solid.fill])
                    Circle()
                        .fill(tokens.color.bgFillNeutralSubtle)
                        .opacity(pressed || hovered ? 1 : 0)
                        .animation(DSControlAppearance.hoverAnimation(motion), value: hovered)
                    if let border = DSCardAppearance.actionBorder(on: material) {
                        Circle().strokeBorder(tokens[keyPath: border], lineWidth: tokens.border.hairline)
                    }
                }
            }
            .overlay {
                if isFocused && interactive {
                    DSFocusRing(cornerRadius: side / 2)
                }
            }
            .modifier(DSHitRegion())
            .opacity(isEnabled ? 1 : tokens.opacity.disabled)
            .scaleEffect(DSControlAppearance.scale(isPressed: pressed, motion: motion))
            .animation(DSControlAppearance.pressAnimation(motion.tokens.springSnappy, motion: motion), value: pressed)
            .modifier(DSHoverTracking(isHovered: $isHovered))
            .dsPressHaptic(.pressButton, isPressed: pressed, isInteractive: interactive)
    }
}
