import SwiftUI
import DSTokens

/// The three tiers of the token dictionary (ARCHITECTURE §5): primitives, the system tier and the component tier.
public enum DSTokenTier: String, CaseIterable, Hashable, Sendable {
    case sys, comp, ref

    /// What the tier is, in the app's own words.
    public var summary: String {
        switch self {
        case .sys: "The system tier: the semantic tokens a component may name."
        case .comp: "The component tier: one whole-value alias of a system token per component part."
        case .ref: "The primitive tier: raw values the system tier aliases. No public Swift API — on Apple these are not reachable from an app, only through the system token that aliases them."
        }
    }

    public var label: String {
        switch self {
        case .sys: "System"
        case .comp: "Component"
        case .ref: "Primitive"
        }
    }
}

/// How the app reads a token's value at run time.
///
/// Every case but `fontFace` and `unavailable` carries a `KeyPath` into `DSTokenSet`, so a specimen shows what
/// the running scene resolves for the axes the axis bar is set to, never a value written into the app. `DSTokenSet`
/// has no reflection — its members are typed struct fields — so the key paths are generated from the Swift member
/// the token manifest already carries (`swift: "DSTokenSet.border.focus"`).
public enum DSTokenValue {
    case dimension(KeyPath<DSTokenSet, CGFloat>)
    case number(KeyPath<DSTokenSet, Double>)
    case duration(KeyPath<DSTokenSet, TimeInterval>)
    case flag(KeyPath<DSTokenSet, Bool>)
    /// The painted color; the colorset behind it (its literal appearances); and, for a `comp` token, the system
    /// token it is a whole-value alias of. A `comp` colour has no colorset of its own — `comp.button.ghost.border`
    /// *is* `color.border.strong` — so the alias is what its row prints the value of and names.
    case color(KeyPath<DSTokenSet, Color>, DSColorToken?, String?)
    case typography(KeyPath<DSTokenSet.Typography, DSTypeRole>)
    case shadow(KeyPath<DSTokenSet, DSShadowToken>)
    case gradient(KeyPath<DSTokenSet, DSGradientToken>)
    case spring(KeyPath<DSTokenSet, DSSpringToken>)
    case easing(KeyPath<DSTokenSet, DSCubicBezier>)
    case stroke(KeyPath<DSTokenSet, DSStrokeStyle>)
    /// A font slot; the face is `DSBrand.faces[slot]`, which belongs to the brand rather than the token set.
    case fontFace(DSFontSlot)
    /// A `ref` primitive: a CSS variable on the web, no public API on Apple.
    case unavailable
}

/// One token of the dictionary, as the app shows it.
public struct DSTokenCatalogEntry: Identifiable, Hashable {
    /// The public path: `color.accent`, `comp.button.primary-bg`, `ref.blur.glass`.
    public let path: String
    /// The dictionary id: `sys.color.accent.$root`.
    public let id: String
    public let tier: DSTokenTier
    /// The first path segment; the component name in the `comp` tier.
    public let group: String
    /// The DTCG type, which is what picks the specimen.
    public let type: String
    /// The Swift member the value comes from, for the row that says where to get it.
    public let swiftMember: String?
    public let cssVariable: String?
    public let summary: String?
    public let deprecated: String?
    public let value: DSTokenValue

    public init(
        path: String,
        id: String,
        tier: DSTokenTier,
        group: String,
        type: String,
        swiftMember: String?,
        cssVariable: String?,
        summary: String?,
        deprecated: String?,
        value: DSTokenValue
    ) {
        self.path = path
        self.id = id
        self.tier = tier
        self.group = group
        self.type = type
        self.swiftMember = swiftMember
        self.cssVariable = cssVariable
        self.summary = summary
        self.deprecated = deprecated
        self.value = value
    }

    public static func == (lhs: DSTokenCatalogEntry, rhs: DSTokenCatalogEntry) -> Bool { lhs.id == rhs.id }

    public func hash(into hasher: inout Hasher) { hasher.combine(id) }

    /// True when the Apple side has no way to read this token — the app says so rather than showing nothing.
    public var hasSwiftAPI: Bool {
        if case .unavailable = value { return false }
        return true
    }
}

/// One section of the Foundations screen: a tier and a first path segment.
public struct DSTokenGroup: Identifiable, Hashable {
    public let tier: DSTokenTier
    public let name: String
    public let count: Int
    public let entries: [DSTokenCatalogEntry]

    public init(tier: DSTokenTier, name: String, count: Int, entries: [DSTokenCatalogEntry]) {
        self.tier = tier
        self.name = name
        self.count = count
        self.entries = entries
    }

    public var id: String { "\(tier.rawValue).\(name)" }

    public static func == (lhs: DSTokenGroup, rhs: DSTokenGroup) -> Bool { lhs.id == rhs.id }

    public func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

/// Every token, generated from the published token manifest. The data lives in `Generated/DSTokenCatalog.swift`.
public enum DSTokenCatalog {
    /// Every entry of every group, in group order.
    public static let entries: [DSTokenCatalogEntry] = groups.flatMap(\.entries)

    /// The groups of one tier, in the order the Foundations screen lists them.
    public static func groups(of tier: DSTokenTier) -> [DSTokenGroup] { groups.filter { $0.tier == tier } }

    public static func count(of tier: DSTokenTier) -> Int {
        groups(of: tier).reduce(0) { $0 + $1.count }
    }
}
