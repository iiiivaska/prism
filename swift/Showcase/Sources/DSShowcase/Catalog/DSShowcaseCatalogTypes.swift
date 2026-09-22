import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// The support level a spec declares for a platform (ADR-0010): `full`, `adapted` or `none`.
public enum DSSupport: String, CaseIterable, Hashable {
    case full, adapted, none

    public var label: String {
        switch self {
        case .full: "full"
        case .adapted: "adapted"
        case .none: "not on this platform"
        }
    }

    /// `none` cells are satisfied by definition (ADR-0006 rule 3): nothing is missing when nothing is promised.
    public var expectsAnImplementation: Bool { self != .none }
}

/// A value of an example's `props`, as the spec writes it.
public indirect enum DSPropValue: Hashable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case list([DSPropValue])
    case map([Pair])
    case unknown

    /// A key and its value; an ordered pair, because a spec's props are read in the order they are written.
    public struct Pair: Hashable {
        public let key: String
        public let value: DSPropValue

        public init(_ key: String, _ value: DSPropValue) {
            self.key = key
            self.value = value
        }
    }

    public var string: String? {
        if case .string(let s) = self { return s }
        return nil
    }

    public var double: Double? {
        if case .number(let n) = self { return n }
        return nil
    }

    public var int: Int? {
        if case .number(let n) = self { return Int(n) }
        return nil
    }

    public var bool: Bool? {
        if case .bool(let b) = self { return b }
        return nil
    }

    public subscript(key: String) -> DSPropValue? {
        if case .map(let pairs) = self { return pairs.first { $0.key == key }?.value }
        return nil
    }

    /// The value as the app prints it in a prop row.
    public var display: String {
        switch self {
        case .string(let s): s
        case .number(let n): n == n.rounded() ? String(Int(n)) : String(format: "%g", n)
        case .bool(let b): b ? "true" : "false"
        case .list(let items): items.map(\.display).joined(separator: ", ")
        case .map(let pairs): pairs.map { "\($0.key): \($0.value.display)" }.joined(separator: ", ")
        case .unknown: "—"
        }
    }
}

/// One `examples[]` entry of a spec, as data: the props exactly as the spec writes them.
public struct DSSpecExample: Identifiable, Hashable {
    public let id: String
    public let props: [DSPropValue.Pair]
    /// What the example sits on or in: `vivid`, `map`, `image`, `glass`.
    public let surface: String?
    /// The backdrop a glass example blurs.
    public let backdrop: String?
    /// A grid example's cells, row-major.
    public let grid: [String]
    /// The schemes the example renders in; both unless the spec narrows them.
    public let schemes: [String]
    /// The spec's props of `type: action`: the ones a harness stages with a handler, never with data.
    public let actions: [String]
    public let summary: String?

    public init(
        id: String,
        props: [(String, DSPropValue)],
        surface: String?,
        backdrop: String?,
        grid: [String],
        schemes: [String],
        actions: [String] = [],
        summary: String?
    ) {
        self.id = id
        self.props = props.map { DSPropValue.Pair($0.0, $0.1) }
        self.surface = surface
        self.backdrop = backdrop
        self.grid = grid
        self.schemes = schemes
        self.actions = actions
        self.summary = summary
    }

    public subscript(key: String) -> DSPropValue? { props.first { $0.key == key }?.value }

    public func string(_ key: String) -> String? { self[key]?.string }

    public func bool(_ key: String, default fallback: Bool = false) -> Bool { self[key]?.bool ?? fallback }

    /// A no-op handler for an action the spec declares, and `nil` for one it does not.
    ///
    /// A handler is not example data — no spec writes a closure — so a harness supplies one for every
    /// `type: action` prop, exactly as the web showcase injects a no-op for each. It matters to what is
    /// drawn: a Card with `action: open` and no `onAction` is not pressable and draws no open glyph
    /// (Card.yaml behavior 4), so an example staged without one diverges from the gallery baseline.
    public func handler(_ name: String) -> (() -> Void)? { actions.contains(name) ? {} : nil }
}

/// What the showcase knows about one spec, from the spec and the Apple implementation manifests.
public struct DSComponentEntry: Identifiable, Hashable {
    public let name: String
    public let layer: String
    public let summary: String
    public let since: String?
    public let specVersion: Int
    /// Repository-relative path of the spec, which is also the link the page opens.
    public let specPath: String
    /// A pattern is a contract with no manifest entry and no snapshots (ADR-0012 rule 3).
    public let isPattern: Bool
    public let platforms: [String: DSSupport]
    /// The spec version each Apple platform implements; empty when nothing does.
    public let implemented: [String: Int]
    public let platformNotes: [String: String]
    public let examples: [DSSpecExample]

    public init(
        name: String,
        layer: String,
        summary: String,
        since: String?,
        specVersion: Int,
        specPath: String,
        isPattern: Bool,
        platforms: [(String, DSSupport)],
        implemented: [(String, Int)],
        platformNotes: [(String, String)],
        examples: [DSSpecExample]
    ) {
        self.name = name
        self.layer = layer
        self.summary = summary
        self.since = since
        self.specVersion = specVersion
        self.specPath = specPath
        self.isPattern = isPattern
        self.platforms = Dictionary(uniqueKeysWithValues: platforms)
        self.implemented = Dictionary(uniqueKeysWithValues: implemented)
        self.platformNotes = Dictionary(uniqueKeysWithValues: platformNotes)
        self.examples = examples
    }

    public var id: String { name }

    /// What this build can honestly say about the component on the platform it is running on.
    public var state: DSComponentState {
        let support = platforms[DSApplePlatform.current.key] ?? .none
        guard let version = implemented[DSApplePlatform.current.key] else {
            return support.expectsAnImplementation ? .specified(support) : .notOnThisPlatform
        }
        return version >= specVersion ? .implemented(version) : .behind(version)
    }

    /// The note the spec writes about this platform, when it writes one.
    public var platformNote: String? { platformNotes[DSApplePlatform.current.key] }
}

/// The four honest states of a component on the running platform (docs/showcase.md §4).
public enum DSComponentState: Hashable {
    /// Implemented at the spec's own version.
    case implemented(Int)
    /// Implemented behind the spec: the parity report's `LAG`.
    case behind(Int)
    /// The spec promises this platform and nothing implements it yet.
    case specified(DSSupport)
    /// The spec says `none`: not on this platform, by design.
    case notOnThisPlatform

    public var isImplemented: Bool {
        switch self {
        case .implemented, .behind: true
        case .specified, .notOnThisPlatform: false
        }
    }
}

/// The platform key this build is running as, derived from the build and the idiom, never configured.
public enum DSApplePlatform: String, CaseIterable, Hashable {
    case ios, ipados, macos, watchos

    public var key: String { rawValue }

    public var label: String {
        switch self {
        case .ios: "iOS"
        case .ipados: "iPadOS"
        case .macos: "macOS"
        case .watchos: "watchOS"
        }
    }

    public static var current: DSApplePlatform {
        #if os(macOS)
        return .macos
        #elseif os(watchOS)
        return .watchos
        #else
        #if canImport(UIKit)
        if UIDevice.current.userInterfaceIdiom == .pad { return .ipados }
        #endif
        return .ios
        #endif
    }
}

/// Every spec, generated from `spec/components` and `spec/patterns`. The data lives in
/// `Generated/DSShowcaseCatalog.swift`; nothing in the app holds a list of components.
public enum DSShowcaseCatalog {
    /// The five layers of ADR-0012, in implementation order.
    public static let layers = ["foundation", "primitive", "composite", "dataviz", "pattern"]

    /// Components (not patterns), in spec order.
    public static var componentEntries: [DSComponentEntry] { components.filter { !$0.isPattern } }

    /// Patterns: contracts with no implementation and no snapshots.
    public static var patternEntries: [DSComponentEntry] { components.filter(\.isPattern) }

    public static var implementedHere: [DSComponentEntry] { componentEntries.filter { $0.state.isImplemented } }

    public static func named(_ name: String) -> DSComponentEntry? { components.first { $0.name == name } }

    /// The GitHub URL of a repository-relative path.
    public static func link(_ path: String) -> URL? {
        URL(string: "\(repositoryURL)/blob/main/\(path)")
    }

    /// Where a reader is sent for the paired snapshots.
    ///
    /// **Not `gallery/index.html`.** GitHub serves an HTML file under `/blob/` as its own source, so that link
    /// opened a page of markup, and the `#<Name>` anchor the page really has could not fire in it. Publishing the
    /// gallery is gated on a reference-distance review that has not happened, so there is no rendered copy to
    /// link either. `gallery/README.md` is a page GitHub does render, and it is the page that says what the
    /// gallery is and how to open it — from a checkout, or from the `gallery` artifact of any green CI run.
    public static var galleryLink: URL? { link("gallery/README.md") }

    /// The anchor inside the gallery page, which still means something in the two places the page is real: a
    /// checkout and a CI artifact. The app prints it as the path it is, beside the link, rather than hiding a
    /// fragment inside a URL that cannot honour it.
    public static func galleryAnchor(_ name: String) -> String { "gallery/index.html#\(name)" }
}
