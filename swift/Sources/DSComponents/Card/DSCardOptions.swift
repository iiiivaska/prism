import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// The material of a Card: `spec/components/Card.yaml` `props.variant`.
nonisolated public enum DSCardVariant: String, CaseIterable, Hashable, Sendable {
    /// `comp.card.solid.bg`, flat.
    case solid
    /// A vivid gradient, the default one or a slot (`vivid:`).
    case vivid
    /// The scheme's glass, floating; needs a `backdrop` of image, map or vivid.
    case glass
    /// `color.bg.tint.accent` over the page: a light-scheme look (ADR-0030 §3.3). A dark screen leads with a Surface of
    /// material `accent` instead.
    case tinted

    /// The Surface material the card asks for.
    ///
    /// `tinted` asks for `solid` and publishes it (Card.yaml behavior 7, specVersion 3): the tint is
    /// `color.bg.tint.accent` over the `color.bg.page` every opaque surface paints under itself (ADR-0030 §5.1), so it
    /// replaces the solid fill rather than covering it — `DSCard` passes `surfaceFill(.bgTintAccent)`, which is the
    /// `--ds--surface-fill` override the web writes, and the pixels are the page under the tint either way. It never
    /// asks for `page`: that names the screen's ground, the key a Chip or a control over media turns its glass cells
    /// on, and a card is never that. Publishing `solid` is also what gives a selected tinted card the solid outline
    /// `color.border.strong`.
    public var material: DSSurfaceMaterial {
        switch self {
        case .solid: .solid
        case .vivid: .vivid
        case .glass: .glass
        case .tinted: .solid
        }
    }

    /// The fill that replaces the material's own, or nil to keep it: only `tinted` has one.
    public var fill: DSColorToken? {
        self == .tinted ? .bgTintAccent : nil
    }

    /// The variant that renders on this platform: the watch card is solid only (Card.yaml `notes.platform.watchos`).
    public func rendered(isWatch: Bool = DSPlatform.isWatch) -> DSCardVariant {
        isWatch ? .solid : self
    }
}

/// The size of a Card: `props.size`, which picks the radius. The card's frame is the layout's; the card keeps the
/// aspect it is given.
nonisolated public enum DSCardSize: String, CaseIterable, Hashable, Sendable {
    case compact, regular
    /// For cards with a side of 200 pt or more (`size.card.min`).
    case large

    /// The size that renders on this platform: the watch card is compact (Card.yaml `notes.platform.watchos`).
    public func rendered(isWatch: Bool = DSPlatform.isWatch) -> DSCardSize {
        isWatch ? .compact : self
    }
}

/// The top-right affordance of a Card: `props.action`, with `actionIcon` and `actionLabel` bundled into the `custom`
/// case.
///
/// Card.yaml (specVersion 5) declares `action`, `actionIcon` and `actionLabel` as three props and licenses a stack to
/// carry them as one value, as long as `custom` cannot be written without the other two — which is exactly what an
/// enum payload gives: `.custom(glyph:label:)` does not compile without both.
public enum DSCardAction: Equatable {
    /// No affordance; the card is a group.
    case none
    /// The `nav.open` glyph at the padding corner, drawn only when the card has an `onAction` to fire: the glyph is
    /// the cue that the card opens, so a card with nothing to open draws none of it (Card.yaml behavior 4).
    case open
    /// One solid circular action at the padding corner, and only that circle is pressable. `glyph` is `actionIcon`
    /// and `label` is `actionLabel`: a registry glyph and the name of the operation, never inferred from the glyph id
    /// and never the card's title (ADR-0011 rule 4).
    case custom(glyph: DSIconName, label: LocalizedStringKey)

    /// The kind, for the rules that do not need the glyph or the name.
    var kind: DSCardActionKind {
        switch self {
        case .none: .none
        case .open: .open
        case .custom: .custom
        }
    }
}

/// `DSCardAction` without its payload.
nonisolated enum DSCardActionKind: Hashable, Sendable {
    case none, open, custom
}

/// The hero of a Card: `props.hero`, rendered with Text `metric-lg` at the bottom-left corner.
///
///     DSCardHero("86", trailing: ".4", unit: "%")
///
/// The strings are values the app already formatted, shown without localization. On a vivid card the unit leaves the
/// hero and joins the caption line (V3, ADR-0030 §8), so set it the same way whatever the variant.
nonisolated public struct DSCardHero: Hashable, Sendable {
    /// The value.
    public let value: String
    /// A trailing group at the same size, such as a decimal, dimmed off vivid.
    public let trailing: String?
    /// The unit, hung beside the value off vivid and joined to the caption on vivid.
    public let unit: String?
    /// The tone of the value; nil takes `primary`.
    public let tone: DSTextTone?

    public init(_ value: String, trailing: String? = nil, unit: String? = nil, tone: DSTextTone? = nil) {
        self.value = value
        self.trailing = trailing
        self.unit = unit
        self.tone = tone
    }
}
