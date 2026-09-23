#if os(iOS)
import SwiftUI
import Testing
import UIKit
import DSCore
import DSTokens
@testable import DSComponents

/// Badge.yaml behavior 10, `accessibility` and `notes.platform.ios`, read off the accessibility tree the simulator
/// publishes rather than asserted: every example stands alone with a `label`, so every one is exactly one element,
/// named by what it contributes, with no trait Badge adds; and every badge that is not exposed is no element at all.
///
/// The names are the web's, byte for byte: `web/apps/gallery/test/accessibility.browser.test.tsx` reads Chromium's tree
/// for every Badge story and finds the same ten names on `image` nodes, and `DSBadgeNameCase.all`
/// (`DSComponentsTests/DSBadgeBindingTests.swift`) holds the pure functions to the same table. The role is the stacks'
/// one difference (Badge.yaml `notes.platform`): `role="img"` on the web, no trait here.
///
/// The walk is Divider's (`DSDividerAccessibilityTreeTests.elements(around:)`): every content is hosted between two
/// labelled texts, with the accessibility runtime's automation mode on, and a runtime without that switch skips the
/// suite with the reason instead of failing it. Every content renders in `en_US`, the locale the snapshots render in,
/// so the digits are formatted the way the name table writes them whatever the simulator's own language is.
@MainActor
@Suite(
    "Badge in the accessibility tree on the simulator (Badge.yaml v1)",
    .serialized,
    .enabled(if: DSAccessibilityAutomation.isAvailable, DSAccessibilityAutomation.unavailableComment)
)
struct DSBadgeAccessibilityTreeTests {
    static let around = DSDividerAccessibilityTreeTests.around

    /// The names both stacks assert, per example id (`DSBadgeNameCase.all` on the host, the web's table in the browser).
    static let names: [(id: String, name: String)] = [
        ("count-neutral", "3 unread alerts"),
        ("count-critical", "12 open incidents"),
        ("count-accent", "7 items needing attention"),
        ("count-overflow", "128 open incidents"),
        ("outline-neutral", "4 queued runs"),
        ("outline-critical", "2 open incidents"),
        ("dot-critical", "unread"),
        ("dot-accent", "new"),
        ("on-vivid", "3 unread alerts"),
        ("on-glass-over-map", "2 open incidents"),
    ]

    /// Traits that would say the badge is something it is not: Badge adds none (`traits: []`), and never calls
    /// `accessibilityAddTraits`.
    static let foreignTraits: [(String, UIAccessibilityTraits)] = [
        ("image", .image), ("button", .button), ("header", .header), ("link", .link),
        ("updatesFrequently", .updatesFrequently),
    ]

    static func elements(around content: some View) throws -> [DSDividerAccessibilityTreeTests.Element] {
        try DSDividerAccessibilityTreeTests.elements(around: content.environment(\.locale, DSSnapshotRendering.locale))
    }

    // MARK: - The examples

    /// Every spec example, staged as the snapshots stage it, is one element between the two labels, named as the table
    /// says and carrying none of the traits Badge does not add. `count-overflow` draws "99+" and is named by the true
    /// count; the digits are never a second element.
    @Test func everyExampleIsOneElementNamedAsTheTableSays() throws {
        let examples = DSExamples.all.filter { $0.component == "Badge" }
        #expect(examples.map(\.name) == Self.names.map(\.id))
        for (example, want) in zip(examples, Self.names) {
            let found = try Self.elements(around: example.content())
            #expect(found.map(\.label) == ["Above", want.name, "Below"], "Badge/\(example.name) exposes \(found)")
            guard found.count == 3 else { continue }
            #expect(Array(found[1].label.utf8) == Array(want.name.utf8), "Badge/\(example.name): \(found[1].label.debugDescription)")
            for (trait, value) in Self.foreignTraits {
                #expect(!found[1].traits.contains(value), "Badge/\(example.name) is announced as \(trait): \(found[1])")
            }
        }
    }

    // MARK: - Hidden

    /// Every badge that renders and is not exposed is no element: no label, a label that resolves to nothing but
    /// whitespace (Icon's six blanks), a dot with no label, and a labelled badge inside a host that reads it. A count
    /// badge that renders nothing — `count: 0`, a negative count, no count — is no element either.
    @Test func everyBadgeThatIsNotExposedIsNoElement() throws {
        let spaces = "   "
        let hidden: [(String, AnyView)] = [
            ("no label", AnyView(DSBadge(count: 3))),
            ("the empty label", AnyView(DSBadge(count: 3, label: ""))),
            ("a label of spaces", AnyView(DSBadge(count: 3, label: "  "))),
            ("a label of a tab and a line feed", AnyView(DSBadge(count: 3, label: "\t\n"))),
            ("a label of a no-break space", AnyView(DSBadge(count: 3, label: "\u{00A0}"))),
            ("a label of an ideographic space", AnyView(DSBadge(count: 3, label: "\u{3000}"))),
            ("a label of U+FEFF", AnyView(DSBadge(count: 3, label: "\u{FEFF}"))),
            ("an interpolation that resolves to spaces", AnyView(DSBadge(count: 3, label: "\(spaces)"))),
            ("a dot with no label", AnyView(DSBadge(variant: .dot))),
            ("count 0", AnyView(DSBadge(count: 0, label: "unread alerts"))),
            ("count -1", AnyView(DSBadge(count: -1, label: "unread alerts"))),
            ("no count", AnyView(DSBadge(label: "unread alerts"))),
            ("hosted, with a label", AnyView(DSBadge(count: 3, label: "unread alerts").environment(\.dsBadgeIsHosted, true))),
            ("a hosted dot, with a label", AnyView(DSBadge(variant: .dot, label: "unread").environment(\.dsBadgeIsHosted, true))),
        ]
        for (description, badge) in hidden {
            let found = try Self.elements(around: badge)
            #expect(found.map(\.label) == Self.around, "DSBadge, \(description), exposes \(found)")
        }
    }

    // MARK: - The strings table

    /// A badge speaks the app's `strings.Badge.count` template, read from the environment the root theme publishes, and
    /// draws the app's `strings.Badge.overflow`; the English sentence is a default, not a constant (ADR-0032).
    @Test func aBadgeSpeaksTheAppsTemplate() throws {
        let strings = DSStrings(badgeCount: "{label}: {count}", badgeOverflow: ">{max}")
        let found = try Self.elements(around: DSBadge(count: 128, tone: .critical, label: "open incidents").environment(\.dsStrings, strings))
        #expect(found.map(\.label) == ["Above", "open incidents: 128", "Below"], "\(found)")
    }

    /// The digits are formatted in the environment's locale, and the name carries the true count in the same form.
    @Test func theCountIsFormattedInTheEnvironmentsLocale() throws {
        let german = DSBadge(count: 1234, max: 9999, label: "queued runs").environment(\.locale, Locale(identifier: "de_DE"))
        let found = try DSDividerAccessibilityTreeTests.elements(around: german)
        #expect(found.map(\.label) == ["Above", "1.234 queued runs", "Below"], "\(found)")
    }
}
#endif
