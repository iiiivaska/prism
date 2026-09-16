import CoreText
import Foundation
import DSTokens

/// What one registration attempt found (ADR-0021 §9, "Registration").
nonisolated public struct DSFontRegistrationReport: Hashable, Sendable {
    /// Files registered by this call, relative to `Resources/Fonts`.
    public let newlyRegistered: [String]
    /// Files the brand names that the DSTokens bundle does not carry, or that Core Text refused.
    public let unregistered: [String]
    /// PostScript names of `DSBrand.faces` that Core Text did not return unchanged. An unknown name silently
    /// resolves to the system fallback face instead of failing (ADR-0021 T3), so this is the only way to see it.
    public let substituted: [String]

    public var isComplete: Bool { unregistered.isEmpty && substituted.isEmpty }
}

/// Registers the active brand's bundled faces and proves that Core Text answers to their PostScript names
/// (ADR-0021 §9, critic R-04).
///
///  * **Synchronous.** `CTFontManagerRegisterFontsForURL(url, .process, &error)` returns `true` synchronously on
///    iOS, watchOS and macOS for a file in a resource bundle (ADR-0021 T4), so no font is missing on first paint.
///  * **Idempotent.** It runs from `DSTheme.init`, which SwiftUI calls on every update: a file is registered once
///    per process, and "already registered" counts as success.
///  * **Asserted.** `Font.custom` takes a PostScript name, and an unknown one silently becomes the system
///    fallback face with no error (ADR-0021 T3). Every name in `DSBrand.faces` is therefore resolved through
///    `CTFontCreateWithName` and compared with what comes back.
///
/// A system face (the Native preset) bundles nothing and registers nothing.
@MainActor
public enum DSFontRegistrar {
    /// Files registered in this process, relative to `Resources/Fonts`.
    public private(set) static var registeredFiles: Set<String> = []

    private static var reports: [DSBrand: DSFontRegistrationReport] = [:]

    /// Registers every file the brand bundles and asserts its PostScript names. Returns the same report on every
    /// later call for that brand.
    @discardableResult
    public static func register(_ brand: DSBrand) -> DSFontRegistrationReport {
        if let cached = reports[brand] { return cached }
        var newlyRegistered: [String] = []
        var unregistered: [String] = []
        for file in files(of: brand) {
            if registeredFiles.contains(file.name) { continue }
            if register(url: file.url) {
                registeredFiles.insert(file.name)
                newlyRegistered.append(file.name)
            } else {
                unregistered.append(file.name)
            }
        }
        let report = DSFontRegistrationReport(
            newlyRegistered: newlyRegistered.sorted(),
            unregistered: unregistered.sorted(),
            substituted: substitutedNames(of: brand)
        )
        assert(
            report.isComplete,
            """
            DSFontRegistrar could not make \(brand.rawValue)'s faces available (ADR-0021 §9). \
            Unregistered files: \(report.unregistered). Substituted PostScript names: \(report.substituted).
            """
        )
        reports[brand] = report
        return report
    }

    /// The PostScript names of a brand's bundled faces that Core Text does not resolve to themselves. Empty means
    /// every face renders; a non-empty result means the system substituted its fallback face.
    public static func substitutedNames(of brand: DSBrand) -> [String] {
        var substituted: [String] = []
        for (_, face) in brand.faces where face.file != nil {
            for name in face.postScriptNames.values.sorted() where !resolves(postScriptName: name) {
                substituted.append(name)
            }
        }
        return substituted.sorted()
    }

    /// Whether Core Text resolves this PostScript name to a face of that exact name.
    public static func resolves(postScriptName name: String) -> Bool {
        let font = CTFontCreateWithName(name as CFString, 0, nil)
        return CTFontCopyPostScriptName(font) as String == name
    }

    /// Every distinct file the brand bundles, with the URL inside the DSTokens bundle. Slots share files (`ui`
    /// and `display` are one family in the reference brand), so the list is deduplicated.
    private static func files(of brand: DSBrand) -> [(name: String, url: URL?)] {
        var seen: Set<String> = []
        var out: [(name: String, url: URL?)] = []
        for (_, face) in brand.faces {
            guard let file = face.file, seen.insert(file).inserted else { continue }
            out.append((file, face.fileURL))
        }
        return out.sorted { $0.name < $1.name }
    }

    private static func register(url: URL?) -> Bool {
        guard let url, FileManager.default.fileExists(atPath: url.path) else { return false }
        var error: Unmanaged<CFError>?
        if CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error) { return true }
        guard let failure = error?.takeRetainedValue() else { return false }
        // A second registration of the same file in the same process is success, not a failure.
        return CFErrorGetCode(failure) == CTFontManagerError.alreadyRegistered.rawValue
    }
}
