// The SF Symbols catalog of the running system: `name_availability.plist` inside CoreGlyphs.bundle
// (docs/research/icons-tooling.md §4.2, verified 2026-09-08 and re-read here).
//
//   symbols:          name -> year key ("2019", "2025.1")
//   year_to_release:  year key -> { iOS, macOS, watchOS, tvOS, visionOS }
//
// The bundle's `legacy_flippable.plist` is deliberately not read: an app built with the current SDK does not mirror
// the left/right-named symbols it lists in a right-to-left layout (measured; `Checks.autoMirrors`), so it cannot
// say what the system mirrors.
import Foundation

struct SymbolCatalog: Sendable {
    static let defaultBundlePath = "/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources"

    /// Symbol name -> the year key it was introduced in.
    let years: [String: String]
    /// Year key -> platform release numbers.
    let releases: [String: [String: Double]]
    /// Year key -> the release strings as the plist writes them, for the messages.
    let releaseNames: [String: [String: String]]
    /// The newest year key this catalog knows, which bounds what it can verify.
    let newestYear: String

    init(bundlePath: String = SymbolCatalog.defaultBundlePath) throws {
        let root = URL(filePath: bundlePath)
        let availability = try SymbolCatalog.plist(at: root.appending(path: "name_availability.plist"))
        guard let years = availability["symbols"] as? [String: String],
              let rawReleases = availability["year_to_release"] as? [String: [String: Any]]
        else {
            throw ValidationError("name_availability.plist has no `symbols` and `year_to_release` dictionaries")
        }
        self.years = years
        self.releases = rawReleases.mapValues { entry in
            // The shipped plist writes every release as a string ("26.1"); a number is parsed through
            // the same scale so the two never compare differently.
            entry.compactMapValues { value in
                if let text = value as? String { return SymbolCatalog.release(text) }
                if let number = value as? NSNumber { return SymbolCatalog.release(number.stringValue) }
                return nil
            }
        }
        self.releaseNames = rawReleases.mapValues { entry in
            entry.compactMapValues { value in
                if let text = value as? String { return text }
                if let number = value as? NSNumber { return number.stringValue }
                return nil
            }
        }
        self.newestYear = years.values.max { SymbolCatalog.year($0) < SymbolCatalog.year($1) } ?? "0"
    }

    private static func plist(at url: URL) throws -> [String: Any] {
        let data = try Data(contentsOf: url)
        guard let object = try PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] else {
            throw ValidationError("\(url.path()) is not a property-list dictionary")
        }
        return object
    }

    /// "2025.1" -> 2025.1; an unparsable key sorts last so it is never treated as old.
    static func year(_ key: String) -> Double { Double(key) ?? .greatestFiniteMagnitude }

    /// "26.1" -> 26.1, "10.15" -> 10.15.
    static func release(_ text: String) -> Double {
        let parts = text.split(separator: ".")
        guard let major = Double(parts.first ?? "") else { return .greatestFiniteMagnitude }
        guard parts.count > 1, let minor = Double(parts[1]) else { return major }
        return major + minor / 100
    }

    func isKnown(_ symbol: String) -> Bool { years[symbol] != nil }

    /// The releases a symbol's year maps to, or nil when the name or its year key is unknown here.
    func releases(of symbol: String) -> (year: String, releases: [String: Double])? {
        guard let year = years[symbol], let releases = releases[year] else { return nil }
        return (year, releases)
    }

    /// The platforms Prism declares in Package.swift; a symbol must be available on each at the floor.
    static let floorPlatforms = ["iOS", "macOS", "watchOS"]
}

struct ValidationError: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}
