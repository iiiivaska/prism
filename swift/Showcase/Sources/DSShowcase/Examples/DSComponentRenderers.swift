import SwiftUI
import DSCore
import DSComponents
import DSIcons
import DSTokens

// One renderer per component `DSComponentsManifest` implements on Apple. Each maps the spec's own `props` onto
// the component's public API, so an example the spec adds is staged without an edit here; only a prop no
// renderer knows is a reason to touch this file. Strings are invented (ADR-0015 rule 3) and match the ones the
// snapshot harness uses, so a showcase page and a gallery pair show the same words.

// MARK: - Surface

public struct DSSurfaceRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        if !example.grid.isEmpty { return AnyView(DSVividPairGrid(cells: example.grid)) }
        guard let material: DSSurfaceMaterial = example.raw("material") else { return nil }
        let radius: DSSurfaceRadius = example.raw("radius") ?? .card
        let elevation: DSSurfaceElevation? = example.raw("elevation")
        let padding: DSSurfacePadding = example.raw("padding") ?? .card
        let backdrop: DSBackdropKind = example.raw("backdrop") ?? .none
        let slot: DSExampleSlot.Size = switch radius {
        case .pill: .pill
        case .tile: .tile
        default: .card
        }
        return AnyView(
            DSSurfaceView(
                material: material,
                radius: radius,
                elevation: elevation,
                padding: padding,
                backdrop: backdrop,
                selected: example.bool("selected")
            ) {
                DSExampleSlot(slot)
            }
        )
    }
}

/// A grid example: the cells are vivid slots, row-major, two per row (`grid: ["1", "2", "2", "1"]`).
struct DSVividPairGrid: View {
    let cells: [String]
    private var ds = DSThemeValues()

    init(cells: [String]) { self.cells = cells }

    var body: some View {
        let gap = ds.tokens.space.cardGap
        let rows = stride(from: 0, to: cells.count, by: 2).map { Array(cells[$0..<min($0 + 2, cells.count)]) }
        Grid(horizontalSpacing: gap, verticalSpacing: gap) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                GridRow {
                    ForEach(Array(row.enumerated()), id: \.offset) { _, cell in
                        DSSurfaceView(material: .vivid, vivid: slot(cell), radius: .tile) { DSExampleSlot(.tile) }
                    }
                }
            }
        }
    }

    private func slot(_ cell: String) -> DSVividSlot { DSVividSlot(rawValue: "slot\(cell)") ?? .default }
}

// MARK: - Text

public struct DSTextRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        let role: DSTextRole = example.raw("role") ?? .bodyMd
        let tone: DSTextTone? = example.string("tone") == nil ? .primary : example.raw("tone")
        let numeric: DSTextNumeric = example.raw("numeric") ?? .auto
        let truncation: DSTextTruncation = example.raw("truncation") ?? .none
        let sample = DSSampleText.text(for: example, role: role)
        let text = DSText(
            verbatim: sample.first,
            role: role,
            tone: tone,
            trailing: example.string("trailing"),
            unit: example.string("unit"),
            numeric: numeric,
            truncation: truncation,
            maxLines: example["maxLines"]?.int
        )
        guard let second = sample.second else { return AnyView(text) }
        return AnyView(
            VStack(alignment: .leading, spacing: 0) {
                text
                DSText(verbatim: second, role: role, tone: .secondary)
            }
        )
    }
}

/// The invented strings the examples show (ADR-0015 rule 3). An example the spec adds falls back to the sample
/// its role carries, so a new example needs no entry here.
enum DSSampleText {
    static func text(for example: DSSpecExample, role: DSTextRole) -> (first: String, second: String?) {
        switch example.id {
        case "hero-metric": ("86", nil)
        case "title-two-tone": ("Weekly summary", "Twelve sessions logged")
        case "caption": ("Updated two minutes ago", nil)
        case "on-vivid": ("Average yield", nil)
        case "on-glass-over-map": ("Next stop in four minutes", nil)
        case "data-tabular": ("12:04:36", nil)
        default: (byRole(role), nil)
        }
    }

    static func byRole(_ role: DSTextRole) -> String {
        switch role {
        case .metricXl, .metricLg, .metricMd: "86"
        case .data: "12:04:36"
        case .caption, .micro: "Updated two minutes ago"
        case .eyebrow, .labelLg, .labelMd, .labelSm: "Line output"
        case .displayXl, .displayLg, .displayMd, .titleLg, .titleMd, .titleSm, .headline: "Weekly summary"
        case .bodyLg, .bodyMd, .bodySm: "The afternoon batch ran long because the second press was recalibrated twice."
        }
    }
}

// MARK: - Button

public struct DSButtonRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        let variant: DSButtonVariant = example.raw("variant") ?? .primary
        let size: DSButtonSize = example.raw("size") ?? .md
        return AnyView(
            DSButton(
                example.string("label") ?? "Continue",
                variant: variant,
                size: size,
                leadingIcon: example.icon("leadingIcon"),
                trailingIcon: example.icon("trailingIcon"),
                isLoading: example.bool("isLoading"),
                isDisabled: example.bool("isDisabled"),
                isFullWidth: example.bool("isFullWidth"),
                action: example.handler("onPress") ?? {}
            )
        )
    }
}

// MARK: - Card

public struct DSCardRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        // The action resolves before anything is staged, so a `custom` example the spec writes without the glyph
        // or the name it requires is not staged as some other card: it is not staged at all.
        guard let action = Self.action(of: example) else { return nil }
        if !example.grid.isEmpty {
            return AnyView(DSVividCardGrid(cells: example.grid, example: example, action: action))
        }
        // The `size.card-min` square both harnesses stage a card in (`DSExampleFrame`); a Card sizes itself from
        // its content otherwise, and takes the page.
        return AnyView(DSExampleFrame { card(example, vivid: .default, action: action) })
    }

    /// Card.yaml's `action`, `actionIcon` and `actionLabel` read as the one value the Apple API carries them in.
    ///
    /// The spec writes three props and licenses a stack to bundle them into one "as long as `custom` cannot be
    /// written without them", which is exactly `DSCardAction.custom(glyph:label:)`. An example that writes no
    /// `action` takes the spec's own default, `open`.
    ///
    /// nil is this renderer saying it cannot build these props (`DSExampleRenderer.content(for:)`): an `action`
    /// value this build does not know, or a `custom` one missing its registry glyph or the name of its operation.
    /// Neither is ever inferred — not from the glyph id, and not from the card's title, which names the card's
    /// content and not the operation (Card.yaml `actionIcon`, `actionLabel`; ADR-0011 rule 4) — so there is
    /// nothing to draw in its place.
    static func action(of example: DSSpecExample) -> DSCardAction? {
        guard let written = example.string("action") else { return .open }
        switch written {
        case "open":
            return .open
        case "none":
            return DSCardAction.none
        case "custom":
            guard let glyph = example.icon("actionIcon"),
                  let label = example.string("actionLabel"),
                  !label.allSatisfy(\.isWhitespace)
            else { return nil }
            return .custom(glyph: glyph, label: LocalizedStringKey(label))
        default:
            return nil
        }
    }

    @ViewBuilder
    func card(_ example: DSSpecExample, vivid: DSVividSlot, action: DSCardAction) -> some View {
        let variant: DSCardVariant = example.raw("variant") ?? .solid
        let size: DSCardSize = example.raw("size") ?? .regular
        let backdrop: DSBackdropKind = example.raw("backdrop") ?? .none
        DSCard(
            LocalizedStringKey(example.string("title") ?? "Line output"),
            caption: example.string("caption").map { LocalizedStringKey($0) },
            variant: variant,
            vivid: vivid,
            icon: example.icon("icon"),
            action: action,
            hero: hero(example),
            size: size,
            backdrop: backdrop,
            isSelected: example.bool("isSelected"),
            onAction: example.handler("onAction")
        )
    }

    private func hero(_ example: DSSpecExample) -> DSCardHero? {
        guard let hero = example["hero"], let value = hero["value"]?.string else { return nil }
        return DSCardHero(value, trailing: hero["trailing"]?.string, unit: hero["unit"]?.string)
    }
}

/// A 2×2 of vivid cards, one slot pair on the diagonals (`grid: ["1", "2", "2", "1"]`).
struct DSVividCardGrid: View {
    let cells: [String]
    let example: DSSpecExample
    /// Resolved once by `DSCardRenderer.content(for:)`, so every cell of the grid draws the same affordance.
    let action: DSCardAction
    private var ds = DSThemeValues()

    init(cells: [String], example: DSSpecExample, action: DSCardAction) {
        self.cells = cells
        self.example = example
        self.action = action
    }

    var body: some View {
        // `space.4` and a `size.card-min` cell, which is what `DSExampleVividCardGrid` measures in the snapshot
        // harness and what `.ds-sc-grid` measures on the web: the 460 pt square of the `Card/vivid-pair` baseline.
        let gap = ds.tokens.space.step4
        let rows = stride(from: 0, to: cells.count, by: 2).map { Array(cells[$0..<min($0 + 2, cells.count)]) }
        Grid(horizontalSpacing: gap, verticalSpacing: gap) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                GridRow {
                    ForEach(Array(row.enumerated()), id: \.offset) { _, cell in
                        DSExampleFrame {
                            DSCardRenderer().card(
                                example, vivid: DSVividSlot(rawValue: "slot\(cell)") ?? .default, action: action
                            )
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Divider

/// Divider.yaml's `orientation`, `inset` and `isDecorative`, staged in the rule frame every harness shares
/// (`DSExampleRuleFrame`). A Divider carries no text, so there is no sample string, and it declares no action.
public struct DSDividerRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        // A value the spec writes and this build does not know is nil: the page says so rather than drawing the
        // default in its place. An example that writes no value takes the spec's default.
        let orientation: DSDividerOrientation? = example.string("orientation") == nil ? .horizontal : example.raw("orientation")
        let inset: DSDividerInset? = example.string("inset") == nil ? DSDividerInset.none : example.raw("inset")
        guard let orientation, let inset else { return nil }
        // `isDecorative` defaults true in the spec, and `bool(_:)` alone would default it false. On Apple both values
        // hide the line (Divider.yaml `notes.platform.ios`), so this changes no announcement here; it keeps the props
        // the page passes the ones the spec writes.
        let isDecorative = example.bool("isDecorative", default: true)
        return AnyView(
            DSExampleRuleFrame(orientation) {
                DSDivider(orientation: orientation, inset: inset, isDecorative: isDecorative)
            }
        )
    }

    /// The Surface hugs the rule frame: `inset: content` is `space.card-padding` from the container's edge, and a
    /// `card`-padded Surface would put a second one around it.
    public func surfacePadding(for example: DSSpecExample) -> DSSurfacePadding { DSSurfacePadding.none }
}

// MARK: - Icon

/// Icon.yaml's `name`, `size`, `weight`, `style`, `tone`, `label` and `isDecorative`, staged as every harness stages
/// them: no frame of its own, so a page example is the glyph on the page, and an example that declares a material is
/// the glyph inside a `card`-padded Surface that hugs it (the default `surfacePadding`). Icon declares no action.
public struct DSIconRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        // A value the spec writes and this build does not know is nil, and the page says so rather than drawing the
        // default in its place; an example that writes no value takes the spec's default.
        guard let name = example.icon("name") else { return nil }
        let size: DSGlyphSize? = example.string("size") == nil ? .md : example.raw("size")
        let weight: DSGlyphWeight? = example.string("weight") == nil ? .control : example.raw("weight")
        let style: DSIconStyle? = example.string("style") == nil ? .outline : example.raw("style")
        guard let size, let weight, let style else { return nil }
        // `inherit` is the absence of a tone: nil sets no colour, and the glyph takes the row's foreground below.
        let tone: DSGlyphTone?
        switch example.string("tone") {
        case nil: tone = .primary
        case "inherit": tone = nil
        case let written?:
            guard let known = DSGlyphTone(rawValue: written) else { return nil }
            tone = known
        }
        // A blank label names nothing, so it is no label: the glyph stays hidden rather than becoming an unnamed image.
        let label = example.string("label").flatMap { $0.allSatisfy(\.isWhitespace) ? nil : LocalizedStringKey($0) }
        // `isDecorative` defaults false in the spec, which is also `bool(_:)`'s default.
        let icon = DSIcon(
            name, size: size, weight: weight, style: style, tone: tone, label: label,
            isDecorative: example.bool("isDecorative")
        )
        return tone == nil ? AnyView(DSRowForeground { icon }) : AnyView(icon)
    }
}

/// The foreground of a row and nothing else of one: `color.text.primary`, ListRow.yaml's `title.color.default`, which
/// an `inherit` glyph takes. The snapshot harness stages `inherit-in-row` in the same wrapper, and the web harnesses in
/// `data-ds-sc-foreground="row"` and `data-ds-gallery-foreground="row"`. It draws no text, so it adds nothing to the
/// accessibility tree.
private struct DSRowForeground<Content: View>: View {
    let content: Content
    private var ds = DSThemeValues()

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content.foregroundStyle(ds.tokens.color.textPrimary)
    }
}

// MARK: - Badge

/// Badge.yaml's `variant`, `tone`, `emphasis`, `count`, `max` and `label`, staged as Icon is in every harness: no frame
/// of its own, so a page example is the badge on the page, and an example that declares a material is the badge inside
/// a `card`-padded Surface that hugs it (the default `surfacePadding`). Badge declares no action, and its labels are the
/// spec's own phrases, so there is no sample string here.
public struct DSBadgeRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        Self.badge { example[$0] }.map { AnyView($0) }
    }

    /// A Badge written as the mapping SCHEMA's slot form gives it — IconButton's `badge: { variant: count, … }` — with
    /// the same reading an example's own props get; nil for anything else, and for props this build cannot draw.
    static func badge(_ value: DSPropValue) -> DSBadge? {
        guard case .map = value else { return nil }
        return badge { value[$0] }
    }

    /// Badge.yaml's six props, read through `prop`, as the one `DSBadge` they describe.
    static func badge(_ prop: (String) -> DSPropValue?) -> DSBadge? {
        // A value the spec writes and this build does not know is nil, and the page says so rather than drawing the
        // default in its place; an example that writes no value takes the spec's default.
        let variant: DSBadgeVariant? = raw(prop("variant"), default: .count)
        let tone: DSBadgeTone? = raw(prop("tone"), default: .neutral)
        let emphasis: DSBadgeEmphasis? = raw(prop("emphasis"), default: .filled)
        guard let variant, let tone, let emphasis else { return nil }
        // `count` and `max` are whole numbers: one written as anything else — a fraction, a string — is not drawn as
        // some other number (`DSPropValue.int` would truncate a fraction).
        var count: Int?
        if let written = prop("count") {
            guard let whole = Self.whole(written) else { return nil }
            count = whole
        }
        var max = 99
        if let written = prop("max") {
            guard let whole = Self.whole(written) else { return nil }
            max = whole
        }
        // The label goes through as the caller's key; a blank one is no label, which `DSBadge` itself decides.
        let label = prop("label")?.string.map { LocalizedStringKey($0) }
        return DSBadge(count: count, variant: variant, tone: tone, emphasis: emphasis, max: max, label: label)
    }

    /// An enum prop: its default where no string is written, the case it spells, or nil for a value this build does not
    /// know — `DSSpecExample.raw(_:as:)` behind the `string == nil` default every renderer in this file uses.
    private static func raw<T: RawRepresentable>(_ value: DSPropValue?, default fallback: T) -> T? where T.RawValue == String {
        guard let written = value?.string else { return fallback }
        return T(rawValue: written)
    }

    /// A number prop that is a whole number, or nil.
    static func whole(_ value: DSPropValue) -> Int? {
        value.double.flatMap { Int(exactly: $0) }
    }
}

// MARK: - IconButton

/// IconButton.yaml's `variant`, `size`, `glyph`, `label`, `badge`, `isSelected`, `isDisabled` and `onPress`, staged as
/// Badge is in every harness: no frame of its own, so a page example is the button on the page, and an example that
/// declares a material is the button inside a `card`-padded Surface that hugs it (the default `surfacePadding`).
///
/// `glyph` and `label` are required, and neither is ever invented: an example that writes no glyph, or no name, or a
/// name of nothing but whitespace, is not staged, because a circle with no name is exactly what IconButton exists not
/// to be (ADR-0011 rule 4, ADR-0032 rule 6). The `badge` slot is read as a Badge through the same reading
/// `DSBadgeRenderer` gives a Badge example's own props.
public struct DSIconButtonRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        guard let glyph = example.icon("glyph"),
              let label = example.string("label"),
              !label.allSatisfy(\.isWhitespace)
        else { return nil }
        // A value the spec writes and this build does not know is nil, and the page says so rather than drawing the
        // default in its place; an example that writes no value takes the spec's default.
        let variant: DSIconButtonVariant? = example.string("variant") == nil ? .secondary : example.raw("variant")
        let size: DSIconButtonSize? = example.string("size") == nil ? .md : example.raw("size")
        guard let variant, let size else { return nil }
        var badge: DSBadge?
        if let written = example["badge"] {
            guard let made = DSBadgeRenderer.badge(written) else { return nil }
            badge = made
        }
        return AnyView(
            DSIconButton(
                LocalizedStringKey(label),
                glyph: glyph,
                variant: variant,
                size: size,
                badge: badge,
                isSelected: example.bool("isSelected"),
                isDisabled: example.bool("isDisabled"),
                action: example.handler("onPress") ?? {}
            )
        )
    }
}

// MARK: - Avatar

/// Avatar.yaml's `name`, `image`, `size`, `hasRing` and `isDecorative`, staged as Badge and IconButton are in every
/// harness: no frame of its own, so a page example is the avatar on the page, one on `map` or `image` is the avatar
/// straight on that ground, which the stage declares, so its circle renders the glass chip, and one that declares a
/// material is the avatar inside a `card`-padded Surface that hugs it (the default `surfacePadding`). Avatar declares no
/// action, and its names are the spec's own, so there is no sample string here.
///
/// `image` is spec/SCHEMA.md's `portrait` fixture or nothing: an example never writes a file name or a URL, and the Apple
/// avatar takes an already loaded `Image` rather than a source (Avatar.yaml `notes.platform.ios`), so an `image` written
/// any other way is not staged rather than drawn as the initials in its place.
public struct DSAvatarRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        // A value the spec writes and this build does not know is nil, and the page says so rather than drawing the
        // default in its place; an example that writes no value takes the spec's default.
        let size: DSAvatarSize? = example.string("size") == nil ? .md : example.raw("size")
        guard let size else { return nil }
        var hasPortrait = false
        if let written = example["image"] {
            guard case .map(let pairs) = written, pairs.count == 1, written["fixture"]?.string == "portrait" else { return nil }
            hasPortrait = true
        }
        // `hasRing` and `isDecorative` default false in the spec, which is also `bool(_:)`'s default.
        return AnyView(
            DSExampleAvatar(
                name: example.string("name"),
                hasPortrait: hasPortrait,
                size: size,
                hasRing: example.bool("hasRing"),
                isDecorative: example.bool("isDecorative")
            )
        )
    }
}

/// An avatar with an example's props, and the `portrait` fixture drawn in the colours of the context it renders in, as
/// the snapshot harness draws it (`DSAvatarExampleAvatar`).
struct DSExampleAvatar: View {
    let name: String?
    let hasPortrait: Bool
    let size: DSAvatarSize
    let hasRing: Bool
    let isDecorative: Bool
    private var ds = DSThemeValues()
    /// The context the portrait's colours are resolved in: the scheme and contrast the page renders in.
    @Environment(\.self) private var environment

    // Written out: a private stored property makes the synthesized memberwise initializer private.
    init(name: String?, hasPortrait: Bool, size: DSAvatarSize, hasRing: Bool, isDecorative: Bool) {
        self.name = name
        self.hasPortrait = hasPortrait
        self.size = size
        self.hasRing = hasRing
        self.isDecorative = isDecorative
    }

    var body: some View {
        DSAvatar(
            name: name,
            image: hasPortrait ? DSExamplePortrait.image(ds.tokens, in: environment) : nil,
            size: size,
            hasRing: hasRing,
            isDecorative: isDecorative
        )
    }
}

// MARK: - Chip

/// Chip.yaml's `label`, `size`, `leadingIcon`, `avatar`, `trailingIcon`, `isSelected`, `isRemovable`, `isDisabled`,
/// `onPress` and `onRemove`, staged as Avatar is in every harness: no frame of its own, so a page example is the chip on
/// the page, one on `map` is the chip straight on that ground, which the stage declares, so its pill renders the glass
/// chip, and one that declares a material is the chip inside a `card`-padded Surface that hugs it (the default
/// `surfacePadding`).
///
/// `label` is required and never invented: an example that writes none, or one of nothing but whitespace, is not
/// staged. `isSelected` stays unset where the example writes none, because setting it, true or false, is what makes a
/// chip a filter (behavior 1). The `avatar` slot is read as Avatar's own props — `name`, `image` and `hasRing` — with
/// the `portrait` fixture as the only image, as `DSAvatarRenderer` reads an Avatar example; anything else there is not
/// staged rather than drawn as some other chip. Every action the spec declares gets its no-op handler, so every example
/// is the control the gallery photographs.
public struct DSChipRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        guard let label = example.string("label"), !label.allSatisfy(\.isWhitespace) else { return nil }
        // A value the spec writes and this build does not know is nil, and the page says so rather than drawing the
        // default in its place; an example that writes no value takes the spec's default.
        let size: DSChipSize? = example.string("size") == nil ? .sm : example.raw("size")
        guard let size else { return nil }
        var leadingIcon: DSIconName?
        if example["leadingIcon"] != nil {
            guard let glyph = example.icon("leadingIcon") else { return nil }
            leadingIcon = glyph
        }
        var trailingIcon: DSIconName?
        if example["trailingIcon"] != nil {
            guard let glyph = example.icon("trailingIcon") else { return nil }
            trailingIcon = glyph
        }
        var isSelected: Bool?
        if let written = example["isSelected"] {
            guard let value = written.bool else { return nil }
            isSelected = value
        }
        var avatar: DSExampleChipAvatar?
        if let written = example["avatar"] {
            guard case .map(let pairs) = written else { return nil }
            let known: Set<String> = ["name", "image", "hasRing"]
            guard pairs.allSatisfy({ known.contains($0.key) }) else { return nil }
            var hasPortrait = false
            if let image = written["image"] {
                guard case .map(let fixture) = image, fixture.count == 1, image["fixture"]?.string == "portrait" else { return nil }
                hasPortrait = true
            }
            avatar = DSExampleChipAvatar(name: written["name"]?.string, hasPortrait: hasPortrait, hasRing: written["hasRing"]?.bool ?? false)
        }
        // `isRemovable` and `isDisabled` default false in the spec, which is also `bool(_:)`'s default.
        return AnyView(
            DSExampleChip(
                label: label,
                size: size,
                leadingIcon: leadingIcon,
                avatar: avatar,
                trailingIcon: trailingIcon,
                isSelected: isSelected,
                isRemovable: example.bool("isRemovable"),
                isDisabled: example.bool("isDisabled"),
                onPress: example.handler("onPress"),
                onRemove: example.handler("onRemove")
            )
        )
    }
}

/// The Avatar an example's `avatar` slot writes: Avatar's own `name`, whether its `image` is the `portrait` fixture, and
/// `hasRing`. The chip draws it at size sm and decorative, whatever it is given.
struct DSExampleChipAvatar {
    let name: String?
    let hasPortrait: Bool
    let hasRing: Bool
}

/// A chip with an example's props, its Avatar's portrait drawn in the colours of the context it renders in, as
/// `DSExampleAvatar` draws Avatar's own.
struct DSExampleChip: View {
    let label: String
    let size: DSChipSize
    let leadingIcon: DSIconName?
    let avatar: DSExampleChipAvatar?
    let trailingIcon: DSIconName?
    let isSelected: Bool?
    let isRemovable: Bool
    let isDisabled: Bool
    let onPress: (() -> Void)?
    let onRemove: (() -> Void)?
    private var ds = DSThemeValues()
    /// The context the portrait's colours are resolved in: the scheme and contrast the page renders in.
    @Environment(\.self) private var environment

    // Written out: a private stored property makes the synthesized memberwise initializer private.
    init(
        label: String,
        size: DSChipSize,
        leadingIcon: DSIconName?,
        avatar: DSExampleChipAvatar?,
        trailingIcon: DSIconName?,
        isSelected: Bool?,
        isRemovable: Bool,
        isDisabled: Bool,
        onPress: (() -> Void)?,
        onRemove: (() -> Void)?
    ) {
        self.label = label
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

    var body: some View {
        DSChip(
            verbatim: label,
            size: size,
            leadingIcon: leadingIcon,
            avatar: avatar.map { avatar in
                DSAvatar(
                    name: avatar.name,
                    image: avatar.hasPortrait ? DSExamplePortrait.image(ds.tokens, in: environment) : nil,
                    hasRing: avatar.hasRing
                )
            },
            trailingIcon: trailingIcon,
            isSelected: isSelected,
            isRemovable: isRemovable,
            isDisabled: isDisabled,
            onPress: onPress,
            onRemove: onRemove
        )
    }
}
