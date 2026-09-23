#if os(iOS)
import SwiftUI
import Testing
import UIKit
import DSCore
import DSIcons
import DSTokens
@testable import DSComponents

/// IconButton.yaml `accessibility` and behavior, read off the accessibility tree the simulator publishes rather than
/// asserted: every example is exactly one element, a button named by its `label` byte for byte, with no hint — no
/// tooltip substitute puts the name into the tree twice — and with the badge's contribution as its value where the
/// example fills the `badge` slot. The glyph and the badge are never elements of their own.
///
/// The names are the web's, byte for byte: `web/apps/gallery/test/accessibility.browser.test.tsx` reads Chromium's tree
/// for every IconButton story and finds one `button` per example, named by the same label, and for `with-badge` by the
/// label, `", "` and the same value (a button has no value on the web). `DSIconButtonNameCase.all`
/// (`DSComponentsTests/DSIconButtonBindingTests.swift`) holds the pure functions to the same table, which `names`
/// repeats here because this target cannot import that one.
///
/// The walk is Divider's (`DSDividerAccessibilityTreeTests.elements(around:)`): every content is hosted between two
/// labelled texts, with the accessibility runtime's automation mode on, and a runtime without that switch skips the
/// suite with the reason instead of failing it. Every content renders in `en_US`, the locale the snapshots render in,
/// so the badge's count is formatted the way the name table writes it whatever the simulator's own language is.
@MainActor
@Suite(
    "IconButton in the accessibility tree on the simulator (IconButton.yaml v1)",
    .serialized,
    .enabled(if: DSAccessibilityAutomation.isAvailable, DSAccessibilityAutomation.unavailableComment)
)
struct DSIconButtonAccessibilityTreeTests {
    static let around = DSDividerAccessibilityTreeTests.around

    /// What each example publishes, per example id: its label, its value (empty with no badge), and whether it is
    /// selected and disabled — `DSIconButtonNameCase.all` on the host, which this target cannot import, and the web's
    /// table in the browser, where `with-badge` is named `Open notifications, 3 unread`.
    static let names: [(id: String, label: String, value: String, isSelected: Bool, isDisabled: Bool)] = [
        ("secondary-md", "Open settings", "", false, false),
        ("primary-md", "Add a site", "", false, false),
        ("ghost-md", "Filter results", "", false, false),
        ("plain-sm", "Open details", "", false, false),
        ("danger-md", "Delete route", "", false, false),
        ("selected-in-group", "Map view", "", true, false),
        ("lg-touch", "Start the run", "", false, false),
        ("disabled", "Refresh readings", "", false, true),
        ("on-vivid", "Open the yield card", "", false, false),
        ("on-glass-over-map", "Center on the vehicle", "", false, false),
        ("label-ru", "Обновить показания линии", "", false, false),
        ("with-badge", "Open notifications", "3 unread", false, false),
    ]

    /// Traits that would say the button is something it is not: the glyph is never an image of its own, and nothing
    /// about an IconButton is a header, a link or a live region.
    static let foreignTraits: [(String, UIAccessibilityTraits)] = [
        ("image", .image), ("header", .header), ("link", .link), ("updatesFrequently", .updatesFrequently),
    ]

    static func elements(around content: some View) throws -> [DSDividerAccessibilityTreeTests.Element] {
        try DSDividerAccessibilityTreeTests.elements(around: content.environment(\.locale, DSSnapshotRendering.locale))
    }

    // MARK: - The examples

    /// Every spec example, staged as the snapshots stage it, is one button between the two labels: named as the table
    /// says, with the table's value, no hint, the selected trait exactly on `selected-in-group` and not-enabled exactly
    /// on `disabled`.
    @Test func everyExampleIsOneButtonNamedAsTheTableSays() throws {
        let examples = DSExamples.all.filter { $0.component == "IconButton" }
        #expect(examples.map(\.name) == Self.names.map(\.id))
        for (example, want) in zip(examples, Self.names) {
            let id = "IconButton/\(example.name)"
            let found = try Self.elements(around: example.content())
            #expect(found.map(\.label) == ["Above", want.label, "Below"], "\(id) exposes \(found)")
            guard found.count == 3 else { continue }
            let button = found[1]
            #expect(Array(button.label.utf8) == Array(want.label.utf8), "\(id): \(button.label.debugDescription)")
            #expect(Array(button.value.utf8) == Array(want.value.utf8), "\(id): value \(button.value.debugDescription)")
            #expect(button.hint.isEmpty, "\(id) carries a hint, which reads the name twice: \(button.hint.debugDescription)")
            #expect(button.traits.contains(.button), "\(id) is not a button: \(button)")
            #expect(button.traits.contains(.selected) == want.isSelected, "\(id): selected trait \(button.traits.contains(.selected))")
            #expect(button.traits.contains(.notEnabled) == want.isDisabled, "\(id): not-enabled trait \(button.traits.contains(.notEnabled))")
            for (trait, value) in Self.foreignTraits {
                #expect(!button.traits.contains(value), "\(id) is announced as \(trait): \(button)")
            }
        }
        #expect(examples.count == 12)
        #expect(Self.names.map { Array($0.label.utf8).count } == [13, 10, 14, 12, 12, 8, 13, 16, 19, 21, 46, 18])
    }

    // MARK: - The badge's value

    /// The value is the badge's own contribution, read in the environment's locale and the app's `strings` table: the
    /// true count, formatted in that locale, in the app's `Badge.count` template (ADR-0032 rules 4 and 5).
    @Test func theValueSpeaksTheAppsTemplateInTheEnvironmentsLocale() throws {
        let german = DSIconButton(
            verbatim: "Open queue", glyph: .objectNotification, badge: DSBadge(count: 1234, max: 9999, label: "queued runs")
        ) {}
        .environment(\.locale, Locale(identifier: "de_DE"))
        let inGerman = try DSDividerAccessibilityTreeTests.elements(around: german)
        #expect(inGerman.map(\.label) == ["Above", "Open queue", "Below"], "\(inGerman)")
        #expect(inGerman.count == 3 && inGerman[1].value == "1.234 queued runs", "\(inGerman)")

        let template = DSIconButton(
            verbatim: "Open alerts", glyph: .objectNotification, badge: DSBadge(count: 128, label: "open incidents")
        ) {}
        .environment(\.dsStrings, DSStrings(badgeCount: "{label}: {count}", badgeOverflow: ">{max}"))
        let found = try Self.elements(around: template)
        #expect(found.map(\.label) == ["Above", "Open alerts", "Below"], "\(found)")
        #expect(found.count == 3 && found[1].value == "open incidents: 128", "\(found)")
    }

    /// A badge with no label contributes its formatted count alone, a dot its label, and a badge that renders nothing —
    /// or none at all — no value: the button is then its name alone (ADR-0032 rule 10, Badge.yaml behavior 9).
    @Test func theValueIsWhatTheBadgeContributes() throws {
        let cases: [(String, DSBadge?, String)] = [
            ("a count with no label", DSBadge(count: 3), "3"),
            ("a dot with a label", DSBadge(variant: .dot, label: "new"), "new"),
            ("a dot with no label", DSBadge(variant: .dot), ""),
            ("count 0", DSBadge(count: 0, label: "unread"), ""),
            ("no badge", nil, ""),
        ]
        for (description, badge, value) in cases {
            let button = DSIconButton(verbatim: "Open notifications", glyph: .objectNotification, badge: badge) {}
            let found = try Self.elements(around: button)
            #expect(found.map(\.label) == ["Above", "Open notifications", "Below"], "\(description): \(found)")
            #expect(found.count == 3 && found[1].value == value, "\(description): \(found)")
        }
    }

    // MARK: - Selection

    /// The selected trait follows `isSelected` on every variant, and the role stays a button: an unselected circle
    /// carries neither the selected trait nor anything else in its place.
    @Test func selectionIsATraitAndTheRoleStaysAButton() throws {
        for variant in DSIconButtonVariant.allCases {
            for isSelected in [false, true] {
                let button = DSIconButton(verbatim: "Map view", glyph: .objectMap, variant: variant, isSelected: isSelected) {}
                let found = try Self.elements(around: button)
                #expect(found.map(\.label) == ["Above", "Map view", "Below"], "\(variant) selected \(isSelected): \(found)")
                guard found.count == 3 else { continue }
                #expect(found[1].traits.contains(.button), "\(variant) selected \(isSelected): \(found[1])")
                #expect(found[1].traits.contains(.selected) == isSelected, "\(variant) selected \(isSelected): \(found[1])")
            }
        }
    }
}
#endif
