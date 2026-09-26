#if os(iOS)
import SwiftUI
import Testing
import UIKit
import DSCore
import DSIcons
import DSTokens
@testable import DSComponents

/// Chip.yaml `accessibility` and behavior 1, read off the accessibility tree the simulator publishes rather than
/// asserted: every example is one button named by its `label` byte for byte, with no value and no hint — a filter
/// carrying the selected trait exactly while it is on, the disabled one not enabled — and a removable one is a second
/// button after it, named by the app's `strings.Chip.remove` template filled with the label. The glyphs, the check and
/// the Avatar are never elements of their own, and a chip with no handler and no `isSelected` is text with no role.
///
/// The names are the web's, byte for byte: `web/apps/gallery/test/accessibility.browser.test.tsx` reads Chromium's tree
/// for every Chip story and finds one `button` per example named by the same label — `aria-pressed` carrying a filter's
/// state — and for `removable` a second button named `Remove North yard`. `DSChipNameCase.all`
/// (`DSComponentsTests/DSChipBindingTests.swift`) holds the pure functions to the same table, which `names` repeats here
/// because this target cannot import that one.
///
/// The walk is Divider's (`DSDividerAccessibilityTreeTests.elements(around:)`): every content is hosted between two
/// labelled texts, with the accessibility runtime's automation mode on, and a runtime without that switch skips the
/// suite with the reason instead of failing it. Every content renders in `en_US`, the locale the snapshots render in.
@MainActor
@Suite(
    "Chip in the accessibility tree on the simulator (Chip.yaml v1)",
    .serialized,
    .enabled(if: DSAccessibilityAutomation.isAvailable, DSAccessibilityAutomation.unavailableComment)
)
struct DSChipAccessibilityTreeTests {
    static let around = DSDividerAccessibilityTreeTests.around

    /// What each example publishes, per example id: its name, the remove control's name (empty for a chip that is not
    /// removable), and whether it is selected and disabled — `DSChipNameCase.all` on the host, which this target cannot
    /// import, and the web's table in the browser.
    static let names: [(id: String, name: String, remove: String, isSelected: Bool, isDisabled: Bool)] = [
        ("default-sm", "Last 24 hours", "", false, false),
        ("selected", "Last 24 hours", "", true, false),
        ("with-leading-icon", "Routes", "", false, false),
        ("removable", "North yard", "Remove North yard", false, false),
        ("identifier-copy", "INV-209316", "", false, false),
        ("md-size", "Depots", "", false, false),
        ("disabled", "Last 24 hours", "", false, true),
        ("md-with-avatar", "Anna Petrova", "", false, false),
        ("on-map", "Depots", "", false, false),
        ("selected-on-map", "Depots", "", true, false),
        ("on-vivid", "Yield", "", false, false),
        ("on-glass-over-image", "In service", "", false, false),
        ("russian-label", "Последние 24 часа", "", true, false),
    ]

    /// Traits that would say the chip is something it is not: no glyph, check or Avatar is an image of its own, and
    /// nothing about a Chip is a header, a link or a live region.
    static let foreignTraits: [(String, UIAccessibilityTraits)] = [
        ("image", .image), ("header", .header), ("link", .link), ("updatesFrequently", .updatesFrequently),
    ]

    static func elements(around content: some View) throws -> [DSDividerAccessibilityTreeTests.Element] {
        try DSDividerAccessibilityTreeTests.elements(around: content.environment(\.locale, DSSnapshotRendering.locale))
    }

    /// Checks one control: a button with no value and no hint, whose name is `name` byte for byte.
    static func expectButton(_ element: DSDividerAccessibilityTreeTests.Element, named name: String, _ comment: String) {
        #expect(Array(element.label.utf8) == Array(name.utf8), "\(comment): \(element.label.debugDescription)")
        #expect(element.traits.contains(.button), "\(comment) is not a button: \(element)")
        #expect(element.value.isEmpty, "\(comment) carries a value: \(element.value.debugDescription)")
        #expect(element.hint.isEmpty, "\(comment) carries a hint, which reads the name twice: \(element.hint.debugDescription)")
        for (trait, value) in foreignTraits {
            #expect(!element.traits.contains(value), "\(comment) is announced as \(trait): \(element)")
        }
    }

    // MARK: - The examples

    /// Every spec example, staged as the snapshots stage it, is one button between the two labels, named as the table
    /// says, the selected trait exactly on the three filters that are on and not-enabled exactly on `disabled`; the
    /// removable one is followed by its remove control. `md-with-avatar` is one element: its Avatar is decorative.
    @Test func everyExampleIsOneButtonNamedAsTheTableSays() throws {
        let examples = DSExamples.all.filter { $0.component == "Chip" }
        #expect(examples.map(\.name) == Self.names.map(\.id))
        for (example, want) in zip(examples, Self.names) {
            let id = "Chip/\(example.name)"
            let found = try Self.elements(around: example.content())
            let expected = want.remove.isEmpty ? ["Above", want.name, "Below"] : ["Above", want.name, want.remove, "Below"]
            #expect(found.map(\.label) == expected, "\(id) exposes \(found)")
            guard found.count == expected.count else { continue }
            let chip = found[1]
            Self.expectButton(chip, named: want.name, id)
            #expect(chip.traits.contains(.selected) == want.isSelected, "\(id): selected trait \(chip.traits.contains(.selected))")
            #expect(chip.traits.contains(.notEnabled) == want.isDisabled, "\(id): not-enabled trait \(chip.traits.contains(.notEnabled))")
            if !want.remove.isEmpty {
                let remove = found[2]
                Self.expectButton(remove, named: want.remove, "\(id)'s remove control")
                #expect(!remove.traits.contains(.selected), "\(id)'s remove control is selected: \(remove)")
            }
        }
        #expect(examples.count == 13)
        #expect(Self.names.map { Array($0.name.utf8).count } == [13, 13, 6, 10, 10, 6, 13, 12, 6, 6, 5, 10, 30])
    }

    // MARK: - Behavior 1: the role

    /// A filter carries the selected trait exactly while it is on, and stays a button when it is off; a chip with a
    /// handler and no `isSelected` is a button that is never selected; a chip with no handler, no `isRemovable` and no
    /// `isSelected` is its label as text, with no button trait.
    @Test func theRoleFollowsFromThePropsAlone() throws {
        for isSelected in [false, true] {
            let filter = try Self.elements(around: DSChip(verbatim: "Last 24 hours", isSelected: isSelected) {})
            #expect(filter.map(\.label) == ["Above", "Last 24 hours", "Below"], "filter \(isSelected): \(filter)")
            guard filter.count == 3 else { continue }
            Self.expectButton(filter[1], named: "Last 24 hours", "filter \(isSelected)")
            #expect(filter[1].traits.contains(.selected) == isSelected, "filter \(isSelected): \(filter[1])")
        }

        let button = try Self.elements(around: DSChip(verbatim: "INV-209316", trailingIcon: .actionCopy) {})
        #expect(button.map(\.label) == ["Above", "INV-209316", "Below"], "\(button)")
        if button.count == 3 {
            Self.expectButton(button[1], named: "INV-209316", "button")
            #expect(!button[1].traits.contains(.selected), "button: \(button[1])")
        }

        let label = try Self.elements(around: DSChip(verbatim: "North yard", leadingIcon: .objectMapPin))
        #expect(label.map(\.label) == ["Above", "North yard", "Below"], "\(label)")
        if label.count == 3 {
            #expect(!label[1].traits.contains(.button), "a static label is a button: \(label[1])")
            #expect(label[1].traits.contains(.staticText), "a static label is not text: \(label[1])")
        }
    }

    // MARK: - The remove control (ADR-0032)

    /// The remove control speaks the app's `strings.Chip.remove` template, filled with the chip's label, and the chip
    /// keeps its own name; the glyph it sits over is never an element of its own. A disabled chip's remove control is not
    /// enabled either.
    @Test func theRemoveControlSpeaksTheAppsTemplate() throws {
        let translated = DSChip(verbatim: "North yard", isRemovable: true, onRemove: {})
            .environment(\.dsStrings, DSStrings(chipRemove: "Удалить: {label}"))
        let found = try Self.elements(around: translated)
        #expect(found.map(\.label) == ["Above", "North yard", "Удалить: North yard", "Below"], "\(found)")

        let disabled = try Self.elements(around: DSChip(verbatim: "North yard", isRemovable: true, isDisabled: true, onRemove: {}))
        #expect(disabled.map(\.label) == ["Above", "North yard", "Remove North yard", "Below"], "\(disabled)")
        if disabled.count == 4 {
            #expect(disabled[1].traits.contains(.notEnabled), "the disabled chip is enabled: \(disabled[1])")
            #expect(disabled[2].traits.contains(.notEnabled), "the disabled chip's remove control is enabled: \(disabled[2])")
        }
    }
}
#endif
