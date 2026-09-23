import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// Card: the corner-pinned card (`spec/components/Card.yaml`, specVersion 5).
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
///    back to the opaque raised card; `tinted` is a solid surface whose fill is `color.bg.tint.accent` over the page
///    the solid surface paints, and is a light-scheme look. A tinted card publishes `solid`, never `page`.
///  - Title and caption colours follow the material the card's Surface publishes, and on the scheme's glass the
///    caption also its backdrop kind; under the glass fallback the card renders the standard tones.
///  - On vivid the hero holds only its value and trailing group; the unit joins the caption line, where V2 guarantees
///    the functional tier (V3, ADR-0030 §8), separated from the caption by `DSCardAppearance.unitSeparator` — the one
///    separator behavior 9 gives both stacks, written into the caption's own string so the words stay apart in the
///    name a pressable card builds from it. The icon ring is not drawn on vivid, and on vivid the header ends where
///    the V2 header block does.
///  - `action: .open` with an `onAction` makes the whole card the button and draws the `nav.open` glyph: under pointer
///    modality on hover and on keyboard focus, under touch always. Without an `onAction` there is nothing to open, so
///    no glyph and no control are drawn in either modality and the header is laid out as `action: .none` lays it out.
///    `action: .custom` draws one solid action circle, and only that circle is pressable.
///  - The affordance at the padding corner takes one `action.size` box whichever it is — the custom disc fills it,
///    the open glyph is centred in it — and the header stops that box plus `header.gap` short of the corner, on
///    vivid whatever the action (behavior 14). The React Card leaves the same room, as its header's `gap` beside a
///    `size.control.md` action slot.
///  - The title takes two lines at most and the caption one, both with an ellipsis (behavior 15): the header block's
///    budget, so a long title truncates instead of pushing the hero out of the card.
///  - A press scales the card to 0.97 on `motion.spring.snappy` with the `color.bg.fill.neutral.subtle` overlay and
///    `haptic.press.button`; under Reduce Motion only the overlay shows, over `motion.duration.base` with
///    `motion.easing.out`. That 0.97 is `DSControlAppearance.pressedScale`, the magnitude behavior 16 gives every
///    Prism control — the card, the disc inside it and Button's pill shrink alike, on Apple and on the web. Hover
///    (pointer, pressable cards) lays the same overlay on solid and tinted cards.
///  - The three rows of the anatomy — header, body slot, footer — are `root.gap` apart at the minimum
///    (`DSCardAppearance.rowGap`, behavior 17); a card taller than its content spreads the slack above the footer,
///    so the hero stays pinned to the bottom.
///  - `isSelected` passes `selected` to the Surface, lifts the card to `comp.card.shadow.floating` and draws the
///    selection outline for the published material, on `motion.spring.smooth` (a crossfade under Reduce Motion).
///  - A pressable card is one accessibility element, named by what it draws, in reading order and joined by
///    `DSCardName.separator`: the title, the caption line — the hero's unit included on vivid, where behavior 9 puts
///    it — and then the hero, its value and trailing group with the unit after a space off vivid
///    ("Line output, Last 24 hours, 86.4 %"). A part the card does not draw is left out with its separator. A card
///    that is not pressable is a group named by its title alone, and its caption, hero and aside are read as the
///    elements they are. The React Card writes the same string (`cardAccessibleName`).
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
            hasAction: onAction != nil, hero: hero, size: size.rendered(), backdrop: backdrop, isSelected: isSelected,
            hasContent: Content.self != EmptyView.self,
            hasAside: Aside.self != EmptyView.self && !DSPlatform.isWatch
        )
        // The form the card renders travels up with it, so a gallery or a test can ask what an example
        // actually built rather than look at a picture (`DSCardForm`).
        card(parts).preference(key: DSCardFormKey.self, value: [parts.form])
    }

    /// The card itself: one button when the whole card is the control, a group otherwise.
    @ViewBuilder
    private func card(_ parts: DSCardParts) -> some View {
        if let onAction, parts.isPressable {
            Button(action: onAction) {
                DSCardLabel(parts: parts, isPressable: true, onAction: nil, content: content, aside: aside)
            }
            .buttonStyle(DSCardButtonStyle())
            .focusEffectDisabled()
            .accessibilityLabel(parts.accessibilityLabel)
            .accessibilityAddTraits(isSelected ? .isSelected : [])
        } else {
            // A group: named by its title alone, with the caption, the hero, the body, the aside and the action circle
            // reachable inside it as the elements they are (Card.yaml `accessibility.label`).
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
    /// Whether the card was given an `onAction`: what makes an `open` card pressable and draws its glyph.
    let hasAction: Bool
    let hero: DSCardHero?
    let size: DSCardSize
    let backdrop: DSBackdropKind
    let isSelected: Bool
    let hasContent: Bool
    let hasAside: Bool

    /// `accessibility.role`: the whole card is the control when it is `open` and has a handler.
    var isPressable: Bool { DSCardAppearance.isPressable(action.kind, hasAction: hasAction) }

    /// What the padding corner actually draws: an `open` card with no handler draws and reserves nothing
    /// (Card.yaml behavior 4).
    var renderedAction: DSCardActionKind { DSCardAppearance.renderedAction(action.kind, hasAction: hasAction) }

    /// The form this card renders, published to whatever renders it (`DSCardFormKey`).
    var form: DSCardForm { DSCardForm(action: action.kind, hasAction: hasAction) }

    /// The hero's unit, with an empty string counted as none, so `DSCardHero("37", unit: "")` hangs nothing and
    /// names nothing — the `unit !== ""` the React Card applies to the same prop.
    var heroUnit: String? {
        guard let unit = hero?.unit, !unit.isEmpty else { return nil }
        return unit
    }

    /// The caption line the header draws: the caption, and on vivid the hero's unit joined to it by
    /// `DSCardAppearance.unitSeparator` (V3, behavior 9), or that unit alone when the card has no caption.
    ///
    /// One value for the line that is drawn and the line that is read, so the two cannot drift. It is keyed by the
    /// material the variant asks for, which for this rule is the material the card publishes: only `vivid` moves the
    /// unit, a vivid card never falls back to another material, and on the watch the variant is already `solid`
    /// (`DSCardVariant.rendered()`), so the unit stays in the hero there — on the screen and in the name alike.
    var captionLine: DSCardCaptionLine? {
        let unit = DSCardAppearance.unitJoinsCaption(on: variant.material) ? heroUnit : nil
        guard caption != nil || unit != nil else { return nil }
        return DSCardCaptionLine(caption: caption, unit: unit)
    }

    /// The hero as Text speaks a metric: the value with its trailing group straight after it, and off vivid a space
    /// and the unit ("86.4 %"), which is the string `DSText` gives the same metric element. On vivid the unit is on
    /// the caption line instead, so it is not said here a second time.
    var spokenHero: String? {
        guard let hero else { return nil }
        let value = hero.value + (hero.trailing ?? "")
        guard !DSCardAppearance.unitJoinsCaption(on: variant.material), let unit = heroUnit else { return value }
        return "\(value) \(unit)"
    }

    /// `accessibility.label`. A pressable card is one element, so its name has to carry what it draws: the title, the
    /// caption line and the hero, in that reading order ("Line output, Last 24 hours, 86.4 %"). A card that is not
    /// pressable is a group whose caption and hero are elements of their own, so the group is named by its title
    /// alone and nothing is read twice.
    var accessibilityName: DSCardName {
        guard isPressable else { return DSCardName(title: title, caption: nil, hero: nil) }
        return DSCardName(title: title, caption: captionLine, hero: spokenHero)
    }

    /// `accessibilityName` as the label SwiftUI takes.
    var accessibilityLabel: Text { accessibilityName.text }
}

/// The caption line of a Card: the caption it was given and, on vivid, the hero's unit that joins it (Card.yaml
/// behavior 9). The header draws this line and a pressable card's name reads it, so the separator lands in both.
struct DSCardCaptionLine: Equatable {
    let caption: LocalizedStringKey?
    /// The hero's unit when it joins the caption, which is vivid only; nil everywhere else.
    let unit: String?

    /// The line as the header draws it. A line with neither a caption nor a unit is never drawn —
    /// `DSCardParts.captionLine` is nil there and no `DSText` is made — and reads as the empty string.
    var content: DSTextContent {
        switch (caption, unit) {
        case let (caption?, unit?):
            .joined(Text("\(Text(caption))\(Text(verbatim: DSCardAppearance.unitSeparator))\(Text(verbatim: unit))"))
        case let (caption?, nil):
            .localized(caption, tableName: nil, bundle: nil)
        case let (nil, unit?):
            .verbatim(unit)
        case (nil, nil):
            .verbatim("")
        }
    }

    /// The line as a name reads it.
    var text: Text { content.text }

    /// The same line over strings, given what the caption localizes to: the one step a `LocalizedStringKey` cannot
    /// take on its own (`DSCardName.spoken(title:caption:)`).
    func spoken(_ caption: String?) -> String? {
        switch (caption, unit) {
        case let (caption?, unit?): "\(caption)\(DSCardAppearance.unitSeparator)\(unit)"
        case let (caption?, nil): caption
        case let (nil, unit?): unit
        case (nil, nil): nil
        }
    }
}

/// What names a Card, part by part, so the rule is a value a test can compare and not a `Text` nobody can read back
/// (Card.yaml `accessibility.label`).
///
/// The parts are the ones the card draws, in reading order — header before footer — and a part the card does not draw
/// is left out with its separator. `text` joins them for SwiftUI and `spoken(title:caption:)` joins the same parts,
/// in the same order, with the same separator, for a test and for anything that has to read the name back; both go
/// through `joined(title:caption:hero:by:)`, so the two cannot compose differently.
struct DSCardName: Equatable {
    /// What joins the parts: a comma and a space, the pause an assistive technology reads between them. The React
    /// Card writes the same string into its `aria-label` (`cardNameSeparator`, `web/packages/react/src/card/parts.ts`).
    static let separator = ", "

    let title: LocalizedStringKey
    /// The caption line, on the name of a pressable card only.
    let caption: DSCardCaptionLine?
    /// The hero's value, trailing group and (off vivid) unit as one spoken string, on the name of a pressable card
    /// only.
    let hero: String?

    /// The parts in reading order, with the ones the card does not draw left out, joined by `separator`.
    private static func joined<Part>(title: Part, caption: Part?, hero: Part?, by join: (Part, Part) -> Part) -> Part {
        [caption, hero].compactMap { $0 }.reduce(title, join)
    }

    /// The name SwiftUI takes.
    var text: Text {
        Self.joined(title: Text(title), caption: caption?.text, hero: hero.map { Text(verbatim: $0) }) {
            Text("\($0)\(Text(verbatim: Self.separator))\($1)")
        }
    }

    /// The name as a string, given the strings its localized parts resolve to — the title and, when there is one, the
    /// caption. Localization is the one step a `LocalizedStringKey` cannot take here; the order, the separators, the
    /// unit's place and the dropped parts are all this type's, the same ones `text` composes, so a test can read the
    /// name back and compare it with what `cardAccessibleName` returns on the web.
    func spoken(title: String, caption: String? = nil) -> String {
        Self.joined(title: title, caption: self.caption?.spoken(caption), hero: hero) { $0 + Self.separator + $1 }
    }
}

/// Which of Card's forms a rendered card is: the affordance it draws at the padding corner, and whether the whole
/// card is the control (Card.yaml behaviors 3, 4 and 5).
///
/// A value, so the form an example asks for is something a test can read back rather than a picture someone has to
/// look at. The web generates its stories from the spec and gives every `action` prop a spy, so a story cannot lose
/// its handler; this example set is written by hand, and `DSComponentsContractTests` reads this preference out of
/// every rendered example to hold the same rule ("Every example gets its handlers", spec/SCHEMA.md).
struct DSCardForm: Equatable {
    /// The affordance the card was asked for.
    let action: DSCardActionKind
    /// Whether the card was given its `onAction`: the handler every example carries (spec/SCHEMA.md).
    let hasAction: Bool

    /// Whether the whole card is the control, which is `open` with a handler and nothing else (behavior 3).
    var isPressable: Bool { DSCardAppearance.isPressable(action, hasAction: hasAction) }
}

/// The forms of every Card in a view tree, in render order.
struct DSCardFormKey: PreferenceKey {
    static let defaultValue: [DSCardForm] = []

    static func reduce(value: inout [DSCardForm], nextValue: () -> [DSCardForm]) {
        value.append(contentsOf: nextValue())
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
        .surfaceFill(DSCardAppearance.tint(parts.variant))
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
        let actionWidth = DSCardAppearance.actionWidth(parts.renderedAction, tokens)
        let trailing = DSCardAppearance.headerTrailingSpace(on: surface.material, actionWidth: actionWidth, tokens)
        // `tokens.root.gap` (behavior 17): the minimum between the header, the body slot and the footer. The spacer
        // takes whatever is left over, so a card taller than its content keeps the hero at the bottom and a card
        // that shrinks to its content keeps the gaps and nothing else. The web reads the same cell as the
        // `row-gap` of `.ds-card`.
        let rowGap = DSCardAppearance.rowGap(tokens)
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
                    .padding(.top, rowGap)
            }
            Spacer(minLength: 0)
            if parts.hero != nil || parts.hasAside {
                footer(tokens, surface: surface)
                    .padding(.top, rowGap)
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
                if let line = parts.captionLine {
                    DSText(
                        content: line.content,
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

    // MARK: Action

    @ViewBuilder
    private func actionView(_ tokens: DSTokenSet, surface: DSSurfaceContext) -> some View {
        switch parts.action {
        case .none:
            EmptyView()
        case .open:
            // Behavior 4: with no handler the glyph is not hidden, it is not there — no view, and no room kept for
            // one, which is what `renderedAction` already took out of `actionWidth`.
            if parts.isPressable {
                // Behavior 14: the glyph is centred in the same `action.size` box the custom disc fills, so both
                // affordances sit in one place and the header reserves one width for either. It inherits, and takes
                // `tokens.action.color` from here.
                DSIcon(.navOpen, size: DSCardAppearance.actionIconSize, tone: nil)
                    .foregroundStyle(tokens[keyPath: DSCardAppearance.action(on: surface)])
                    .frame(
                        width: DSCardAppearance.actionWidth(.open, tokens),
                        height: DSCardAppearance.actionWidth(.open, tokens)
                    )
                    .opacity(
                        DSCardAppearance.showsOpenGlyph(
                            interaction: tokens.interaction, isHovered: state.isRawHovered,
                            isFocused: state.isFocused, isPressable: parts.isPressable
                        ) ? 1 : 0
                    )
                    .animation(DSControlAppearance.hoverAnimation(ds.motion), value: state.isRawHovered)
            }
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
                unit: DSCardAppearance.unitJoinsCaption(on: surface.material) ? nil : parts.heroUnit
            )
            .dynamicTypeSize(...DSCardAppearance.heroLargestTypeSize)
        }
    }
}

extension DSCardAppearance {
    /// What joins the caption and the unit on vivid: a space, a middle dot and a space, the one separator Card.yaml
    /// behavior 9 gives both stacks ("Dollars per batch · kg"), as the direction board's vivid captions read
    /// ("New best · min:s").
    ///
    /// It is text inside the caption, not a gap between two boxes, so the words stay apart in the caption's own
    /// string — and therefore in the single accessible name a pressable card builds from title, caption and hero.
    /// The web writes the same string (`cardUnitSeparator`, `web/packages/react/src/card/parts.ts`). A card with no
    /// caption shows the unit alone, with no leading separator.
    static let unitSeparator = " · "

    /// The hero clamps at accessibility3 (Card.yaml `accessibility.dynamicType`).
    static let heroLargestTypeSize: DynamicTypeSize = .accessibility3
}

/// The layers the card draws inside its Surface's shape and around it: the hover and pressed overlays, the selection
/// outline and the focus ring. They sit behind the anatomy, above the Surface's own layers, and reach out to the
/// shape by the card padding the Surface publishes with its radius.
///
/// The tint of a `tinted` card is not one of them: it replaces the fill of the solid Surface the card asks for
/// (`surfaceFill(_:)`), so it lies on the page that surface paints and not on `color.bg.surface` (Card.yaml
/// behavior 7).
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
/// Icon's primary tone, which `DSIcon` resolves against the published material itself.
private struct DSCardIconRing: View {
    let icon: DSIconName
    private var ds = DSThemeValues()

    init(icon: DSIconName) {
        self.icon = icon
    }

    var body: some View {
        let tokens = ds.tokens
        DSIcon(icon, size: DSCardAppearance.ringIconSize, tone: .primary)
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
        let glyphView = DSIcon(glyph, size: DSCardAppearance.actionIconSize, tone: nil)
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
                        Circle()
                            .strokeBorder(
                                tokens[keyPath: border],
                                lineWidth: DSCardAppearance.actionBorderWidth(tokens.border)
                            )
                    }
                }
            }
            .overlay {
                if isFocused && interactive {
                    // A circle around the circle, as IconButton's: a rounded rectangle at half the side is a squircle.
                    DSFocusRing(.circle)
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
