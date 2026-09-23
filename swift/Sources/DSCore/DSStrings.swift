import SwiftUI

/// The strings a Prism component speaks or draws that no caller passed: one flat table per app, English by default
/// (ADR-0032 decisions 3 and 5, `spec/strings.yaml`).
///
/// Every other word a component renders is a prop the caller passed (`label`, `name`); what is left is these four
/// templates. A key is `<Component>.<name>` and its value is a template whose `{placeholder}` names the component fills
/// from its own props, through `fill(_:_:)`. An app replaces the table once, at the root, in its own translation
/// process, and sets the same language in SwiftUI's `locale`, so the numbers the templates carry agree with the words
/// (ADR-0032 rules 4 and 8):
///
///     DSTheme(brand: .default, strings: DSStrings(badgeCount: "{label}: {count}", badgeOverflow: "{max}+")) {
///         ContentView()
///     }
///
/// **Root-only**, like the brand: the root `DSTheme` writes `\.dsStrings`, and a nested `DSTheme` leaves the value it
/// inherits alone, whatever it is handed. Prism ships the English defaults and no other language (rule 8).
///
/// The web's twin is `defaultStrings` and `<Theme strings>` in `web/packages/tokens` (`src/runtime/strings.ts`), read
/// with `useStrings()`. Each stack's table carries every key of `spec/strings.yaml`, in its order and with its
/// defaults, and a test on each stack reads that file to prove it (`DSStringsTests`,
/// `web/packages/react/test/strings.test.ts`).
nonisolated public struct DSStrings: Sendable, Hashable {
    /// `strings.Badge.count`, `"{count} {label}"`: what a count badge with a `label` contributes to the name of what it
    /// marks, and the name of a badge that stands alone. `{count}` is the true count, above `max` too, through the
    /// locale's number formatter; `{label}` is the caller's, as written (Badge.yaml behaviors 4 to 6).
    public var badgeCount: String
    /// `strings.Badge.overflow`, `"{max}+"`: the mark a count badge draws above `max`, `{max}` through the locale's
    /// number formatter (Badge.yaml behavior 3).
    public var badgeOverflow: String
    /// `strings.Button.loading`, `"{label}, loading"`. Carried and not yet read: `DSButton` keeps its own "loading"
    /// constant (`DSButtonAppearance.loadingWord`) until its migration, ADR-0032's separate follow-up.
    public var buttonLoading: String
    /// `strings.Chip.remove`, `"Remove {label}"`: the name of a removable chip's remove button, carried for Chip (P4-8).
    public var chipRemove: String

    /// - Parameters: each template, English by default. A template names its placeholders in braces; a component fills
    ///   the ones it has values for and leaves any other brace as written (`fill(_:_:)`).
    public init(
        badgeCount: String = "{count} {label}",
        badgeOverflow: String = "{max}+",
        buttonLoading: String = "{label}, loading",
        chipRemove: String = "Remove {label}"
    ) {
        self.badgeCount = badgeCount
        self.badgeOverflow = badgeOverflow
        self.buttonLoading = buttonLoading
        self.chipRemove = chipRemove
    }

    /// Prism's English defaults: `spec/strings.yaml` as written.
    public static let english = DSStrings()

    /// The table's keys, in `spec/strings.yaml`'s order.
    package static let keys: [String] = ["Badge.count", "Badge.overflow", "Button.loading", "Chip.remove"]

    /// The template stored under a key of `spec/strings.yaml`; nil for a key the table does not carry.
    package func entry(_ key: String) -> String? {
        switch key {
        case "Badge.count": badgeCount
        case "Badge.overflow": badgeOverflow
        case "Button.loading": buttonLoading
        case "Chip.remove": chipRemove
        default: nil
        }
    }

    /// A template with its placeholders filled: one left-to-right pass over the template's Unicode scalars. At a `{`,
    /// the text up to the next `}` is a placeholder when it is an ASCII letter followed by ASCII letters and digits and
    /// `values` has it; the value goes in verbatim and the pass continues after the `}`. Any other `{` is written as it
    /// is, and the pass continues with the character after it. A value is never scanned again, so a `label` that reads
    /// `{count}` stays those seven characters; there is no escape syntax.
    ///
    /// A component calls this only when every placeholder the template declares has a value (ADR-0032 rule 10); a
    /// placeholder with no value is left as written rather than emptied, so a template is never spoken with a hole in
    /// it. The web's twin is `fillTemplate` (`web/packages/react/src/strings.ts`), which makes the same pass over
    /// UTF-16 code units; the two agree on every template, because the characters the pass looks for are ASCII, and
    /// `DSStringsTests.fillVectors` and the web's `strings.test.ts` hold both to one table of vectors.
    ///
    /// `package`, not public, on purpose (ADR-0032 decision 5): the table, the root that sets it and the reader are
    /// Prism's API, and the fill is not, so no app comes to depend on it or on its lack of an escape syntax. The web's
    /// `fillTemplate` is internal to `@iiiivaska/prism-react` for the same reason.
    package static func fill(_ template: String, _ values: [String: String]) -> String {
        let scalars = Array(template.unicodeScalars)
        var out = String.UnicodeScalarView()
        var index = 0
        while index < scalars.count {
            if scalars[index] == "{", let close = scalars[(index + 1)...].firstIndex(of: "}") {
                let name = String(String.UnicodeScalarView(scalars[(index + 1)..<close]))
                if isPlaceholderName(name), let value = values[name] {
                    out.append(contentsOf: value.unicodeScalars)
                    index = close + 1
                    continue
                }
            }
            out.append(scalars[index])
            index += 1
        }
        return String(out)
    }

    /// `^[A-Za-z][A-Za-z0-9]*$`.
    private static func isPlaceholderName(_ name: String) -> Bool {
        guard let first = name.unicodeScalars.first, isASCIILetter(first) else { return false }
        return name.unicodeScalars.dropFirst().allSatisfy { isASCIILetter($0) || ("0"..."9").contains($0) }
    }

    private static func isASCIILetter(_ scalar: Unicode.Scalar) -> Bool {
        ("a"..."z").contains(scalar) || ("A"..."Z").contains(scalar)
    }
}

private struct DSStringsKey: EnvironmentKey {
    static let defaultValue = DSStrings.english
}

extension EnvironmentValues {
    /// The app's strings table (ADR-0032 decision 5), set once by the root `DSTheme(strings:)`; English until one
    /// sets it. Components read it; nothing below the root writes it.
    public package(set) var dsStrings: DSStrings {
        get { self[DSStringsKey.self] }
        set { self[DSStringsKey.self] = newValue }
    }
}
