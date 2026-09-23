import Foundation
import SwiftUI
import Testing
import DSCore
import DSTokens
import DSComponents

/// ADR-0032 decision 5 on Apple: `DSStrings` carries every key of `spec/strings.yaml`, in its order and with its
/// English defaults; `fill(_:_:)` is the template pass the components make, `package` API as its web twin
/// `fillTemplate` is internal to `@iiiivaska/prism-react`; and `DSTheme(strings:)` publishes the table once, at the
/// root.
///
/// The web holds `defaultStrings` to the same file and `fillTemplate` to the same twenty vectors
/// (`web/packages/react/test/strings.test.ts`), so neither the tables nor the fills can drift apart without one of the
/// two suites saying so. The file is read with `DSSpecYAML`, the reader the spec bindings use; `keys`, `entry(_:)` and `fill(_:_:)`
/// are `package` API, which this target reads as a member of the same package. That a Badge reads the table its root
/// publishes is measured on the simulator (`DSBadgeAccessibilityTreeTests.aBadgeSpeaksTheAppsTemplate`).
@Suite("Component-owned strings (ADR-0032)")
struct DSStringsTests {
    /// `spec/strings.yaml`'s `strings` block: key → its `default` and `placeholders`, in document order.
    ///
    /// The file opens with a comment block, and `DSSpecYAML` reads the subset the component specs are written in, which
    /// has no whole-line comment; each such line is read as a blank line, so the numbers in a syntax error stay the
    /// file's. The file has no block scalar a `#` line could belong to.
    static func table() throws -> [(key: String, template: String, placeholders: [String])] {
        let url = DSSpec.repository.appendingPathComponent("spec/strings.yaml")
        let text = try String(contentsOf: url, encoding: .utf8)
            .split(separator: "\n", omittingEmptySubsequences: false)
            .map { $0.drop(while: { $0 == " " }).hasPrefix("#") ? "" : $0 }
            .joined(separator: "\n")
        let document = try DSSpecYAML.parse(text)
        #expect(document["version"]?.stringValue == "1")
        let strings = try #require(document["strings"]?.mapValue, "spec/strings.yaml has no `strings` block")
        return try strings.pairs.map { pair in
            let template = try #require(pair.value["default"]?.stringValue, "\(pair.key) has no default")
            let placeholders = try #require(pair.value["placeholders"]?.listValue, "\(pair.key) has no placeholders")
            return (pair.key, template, placeholders.compactMap(\.stringValue))
        }
    }

    // MARK: - The table

    /// The key list is the contract (ADR-0032 rule 4): the Apple table has exactly the file's keys, in its order, and
    /// each English default is the file's, byte for byte.
    @Test func theTableIsSpecStringsYAML() throws {
        let table = try Self.table()
        #expect(DSStrings.keys == table.map(\.key))
        for entry in table {
            let apple = DSStrings.english.entry(entry.key)
            #expect(apple.map { Array($0.utf8) } == Array(entry.template.utf8), "\(entry.key): Apple \(String(describing: apple)), spec \(entry.template)")
        }
        #expect(DSStrings.english.entry("Badge.missing") == nil)
        #expect(DSStrings() == DSStrings.english)
    }

    /// Each default names exactly the placeholders its entry declares, so filling every declared placeholder leaves no
    /// brace behind (ADR-0032 rule 10).
    @Test func everyDefaultNamesItsDeclaredPlaceholders() throws {
        for entry in try Self.table() {
            let named = entry.template.matches(of: /\{([A-Za-z][A-Za-z0-9]*)\}/).map { String($0.1) }
            #expect(Set(named) == Set(entry.placeholders), "\(entry.key): the default names \(named), the entry declares \(entry.placeholders)")
            let values = Dictionary(uniqueKeysWithValues: entry.placeholders.map { ($0, "v") })
            #expect(!DSStrings.fill(entry.template, values).contains("{"), "\(entry.key)")
        }
    }

    /// Every key reads back the template it was given, so an app's table is the table a component reads.
    @Test func anAppsTableReadsBack() {
        let strings = DSStrings(badgeCount: "a", badgeOverflow: "b", buttonLoading: "c", chipRemove: "d")
        #expect(DSStrings.keys.map { strings.entry($0) } == ["a", "b", "c", "d"])
    }

    // MARK: - fill

    /// The `fill` vectors: the same twenty rows, in the same order, as `fillVectors` in
    /// `web/packages/react/test/strings.test.ts`, which the web's `fillTemplate` passes, so both suites say what the
    /// other one asserts. A placeholder with a value is replaced, and one with none stays as written; a `{` that does
    /// not open a placeholder name (a letter, then letters and digits) is written as it is and the pass continues
    /// after it; a value goes in verbatim, outside ASCII too — a Russian label and a locale's narrow no-break space
    /// reach the name unchanged — and is never scanned again; only a value the caller passed fills a placeholder,
    /// never a name every JavaScript object inherits; and a template outside ASCII, a character beyond the BMP
    /// included, fills the same on a stack that walks Unicode scalars and on one that walks UTF-16 code units.
    nonisolated static let fillVectors: [(String, [String: String], String)] = [
        ("{count} {label}", ["count": "3", "label": "a"], "3 a"),
        ("{max}+", ["max": "99"], "99+"),
        ("{max}+", [:], "{max}+"),
        ("{{count}}", ["count": "3"], "{3}"),
        ("{ count}", ["count": "3"], "{ count}"),
        ("a}{b", ["b": "x"], "a}{b"),
        ("{count", ["count": "3"], "{count"),
        ("{m1}", ["m1": "ok"], "ok"),
        ("{1m}", ["1m": "no"], "{1m}"),
        ("{1a} {a1}", ["1a": "no", "a1": "yes"], "{1a} yes"),
        ("{}", ["": "no"], "{}"),
        ("{count} {label}", ["count": "3", "label": "{count}"], "3 {count}"),
        ("{label}: {count}", ["count": "1,234", "label": "queued runs"], "queued runs: 1,234"),
        ("{count} {label}", ["count": "1\u{202F}234", "label": "непрочитанных уведомления"], "1\u{202F}234 непрочитанных уведомления"),
        ("Удалить {label}", ["label": "фильтр"], "Удалить фильтр"),
        ("\u{10437} {count}", ["count": "3"], "\u{10437} 3"),
        ("{toString}", [:], "{toString}"),
        ("{constructor}", ["count": "3"], "{constructor}"),
        ("", ["count": "3"], ""),
        ("loading", ["label": "x"], "loading"),
    ]

    @Test func theFillVectorsAreTheWebsTwenty() {
        #expect(Self.fillVectors.count == 20)
    }

    @Test(arguments: fillVectors)
    func fill(_ template: String, _ values: [String: String], _ expected: String) {
        #expect(Array(DSStrings.fill(template, values).utf8) == Array(expected.utf8))
    }

    // MARK: - DSTheme(strings:)

    /// What `\.dsStrings` reads at one point of a rendered tree.
    final class Probe {
        var seen: [String: DSStrings] = [:]
    }

    struct Reader: View {
        let id: String
        let probe: Probe
        @Environment(\.dsStrings) private var strings

        init(id: String, probe: Probe) {
            self.id = id
            self.probe = probe
        }

        var body: some View {
            probe.seen[id] = strings
            return Color.clear.frame(width: 1, height: 1)
        }
    }

    static func read(_ content: some View) {
        let renderer = ImageRenderer(content: content)
        renderer.scale = 1
        _ = renderer.cgImage
    }

    /// English with no theme and under a theme given none; the app's table under the root theme; and root-only, like
    /// the brand: a nested `DSTheme` leaves the table it inherits alone, whatever it is handed.
    @Test @MainActor func theRootThemePublishesTheTable() {
        let russian = DSStrings(badgeCount: "{count} {label}", badgeOverflow: "{max}+", buttonLoading: "{label}, загрузка", chipRemove: "Удалить {label}")
        let probe = Probe()
        Self.read(Reader(id: "no theme", probe: probe))
        Self.read(DSTheme { Reader(id: "default theme", probe: probe) })
        Self.read(DSTheme(strings: russian) {
            VStack {
                Reader(id: "root", probe: probe)
                DSTheme { Reader(id: "nested default", probe: probe) }
                DSTheme(strings: DSStrings(chipRemove: "x {label}")) { Reader(id: "nested other", probe: probe) }
            }
        })
        #expect(probe.seen["no theme"] == .english)
        #expect(probe.seen["default theme"] == .english)
        #expect(probe.seen["root"] == russian)
        #expect(probe.seen["nested default"] == russian, "a nested DSTheme leaves the root's table alone")
        #expect(probe.seen["nested other"] == russian, "a nested DSTheme leaves the root's table alone")
    }
}
