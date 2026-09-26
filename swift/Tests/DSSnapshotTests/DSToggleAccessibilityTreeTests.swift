#if os(iOS)
import SwiftUI
import Testing
import UIKit
import DSCore
import DSTokens
@testable import DSComponents

/// Toggle.yaml `accessibility` and `notes.platform.ios`, read off the accessibility tree the simulator publishes rather
/// than asserted: every example is one switch — SwiftUI's own `Toggle`, set as the row's accessibility representation —
/// named by its `label` byte for byte, drawn or hidden (ADR-0041), carrying its value, not enabled exactly on
/// `on-disabled`; the drawn label, the track and the knob are never elements of their own, and no word of Prism's own
/// is spoken (ADR-0032).
///
/// **Against SwiftUI's own switch, not against strings.** The words a switch's value is spoken in and the traits that
/// make it a switch are the platform's, which is what the spec asks for, so they are not written here: each example's
/// element is compared with the element a plain `Toggle(isOn:)` of the same name, value and enabled state publishes in
/// the same walk — the same label, value, hint and traits. Two controls keep the comparison from passing blind: the
/// reference's value differs between off and on, so a switch that published no value, or one that did not follow
/// `isOn`, fails; and the reference is found where it must be, between the two labels.
///
/// The names are the web's, byte for byte: `web/apps/gallery/test/accessibility.browser.test.tsx` reads Chromium's tree
/// for every Toggle story and finds one `switch` per example named by the same label, checked exactly while it is on.
/// `DSToggleNameCase.all` (`DSComponentsTests/DSToggleBindingTests.swift`) holds the pure functions to the same table,
/// which `names` repeats here because this target cannot import that one.
///
/// The walk is Divider's (`DSDividerAccessibilityTreeTests.elements(around:)`): every content is hosted between two
/// labelled texts, with the accessibility runtime's automation mode on, and a runtime without that switch skips the
/// suite with the reason instead of failing it. Every content renders in `en_US`, the locale the snapshots render in.
@MainActor
@Suite(
    "Toggle in the accessibility tree on the simulator (Toggle.yaml v1)",
    .serialized,
    .enabled(if: DSAccessibilityAutomation.isAvailable, DSAccessibilityAutomation.unavailableComment)
)
struct DSToggleAccessibilityTreeTests {
    typealias Element = DSDividerAccessibilityTreeTests.Element

    /// What each example publishes, per example id: its name, its value and whether it is disabled —
    /// `DSToggleNameCase.all` on the host, which this target cannot import, and the web's table in the browser.
    static let names: [(id: String, name: String, isOn: Bool, isDisabled: Bool)] = [
        ("off", "Night shading", false, false),
        ("on", "Night shading", true, false),
        ("on-disabled", "Night shading", true, true),
        ("bare", "Night shading", false, false),
        ("on-vivid", "Live readings", true, false),
        ("off-on-vivid", "Live readings", false, false),
        ("on-glass-over-map", "Follow the vehicle", true, false),
        ("label-ru", "Показывать ночное затенение маршрута следования", false, false),
    ]

    /// Traits that would say the switch is something it is not: the track and the knob are no image, and nothing about
    /// a Toggle is a header, a link or a live region.
    static let foreignTraits: [(String, UIAccessibilityTraits)] = [
        ("image", .image), ("header", .header), ("link", .link), ("updatesFrequently", .updatesFrequently),
    ]

    static func elements(around content: some View) throws -> [Element] {
        try DSDividerAccessibilityTreeTests.elements(around: content.environment(\.locale, DSSnapshotRendering.locale))
    }

    /// The element SwiftUI's own switch publishes for a name, a value and an enabled state: what every Prism switch
    /// must publish in its place.
    static func reference(named name: String, isOn: Bool, isDisabled: Bool) throws -> Element {
        let found = try elements(around: Toggle(isOn: .constant(isOn)) { Text(verbatim: name) }.disabled(isDisabled))
        #expect(found.map(\.label) == ["Above", name, "Below"], "the reference switch exposes \(found)")
        return try #require(found.count == 3 ? found[1] : nil, "the reference switch was not found: \(found)")
    }

    /// Checks one switch against the reference: its name is `name` byte for byte, and its value, hint and traits are the
    /// ones SwiftUI's own switch publishes.
    static func expectSwitch(_ element: Element, like reference: Element, named name: String, _ comment: String) {
        #expect(Array(element.label.utf8) == Array(name.utf8), "\(comment): \(element.label.debugDescription)")
        #expect(element.value == reference.value, "\(comment): value \(element.value.debugDescription), SwiftUI's switch \(reference.value.debugDescription)")
        #expect(element.hint == reference.hint, "\(comment): hint \(element.hint.debugDescription), SwiftUI's switch \(reference.hint.debugDescription)")
        #expect(element.traits == reference.traits, "\(comment): traits \(element.traits.rawValue), SwiftUI's switch \(reference.traits.rawValue)")
        #expect(!element.value.isEmpty, "\(comment) carries no value")
        for (trait, value) in foreignTraits {
            #expect(!element.traits.contains(value), "\(comment) is announced as \(trait): \(element)")
        }
    }

    // MARK: - The control

    /// The reference itself: SwiftUI's switch publishes a value, and a different one off and on, so a Prism switch that
    /// matches it carries its value.
    @Test func theReferenceSwitchCarriesItsValue() throws {
        let off = try Self.reference(named: "Night shading", isOn: false, isDisabled: false)
        let on = try Self.reference(named: "Night shading", isOn: true, isDisabled: false)
        #expect(!off.value.isEmpty && !on.value.isEmpty, "off \(off), on \(on)")
        #expect(off.value != on.value, "off and on read the same: \(off), \(on)")
        let disabled = try Self.reference(named: "Night shading", isOn: true, isDisabled: true)
        #expect(disabled.traits.contains(.notEnabled), "\(disabled)")
    }

    // MARK: - The examples

    /// Every spec example, staged as the snapshots stage it, is one switch between the two labels, named as the table
    /// says, carrying its value, not enabled exactly on `on-disabled` — the element SwiftUI's own switch of that name,
    /// value and state publishes. `bare`, whose label is not drawn, is named the same as `off`.
    @Test func everyExampleIsOneSwitchNamedAsTheTableSays() throws {
        let examples = DSExamples.all.filter { $0.component == "Toggle" }
        #expect(examples.map(\.name) == Self.names.map(\.id))
        for (example, want) in zip(examples, Self.names) {
            let id = "Toggle/\(example.name)"
            let found = try Self.elements(around: example.content())
            #expect(found.map(\.label) == ["Above", want.name, "Below"], "\(id) exposes \(found)")
            guard found.count == 3 else { continue }
            let reference = try Self.reference(named: want.name, isOn: want.isOn, isDisabled: want.isDisabled)
            Self.expectSwitch(found[1], like: reference, named: want.name, id)
            #expect(found[1].traits.contains(.notEnabled) == want.isDisabled, "\(id): not-enabled trait \(found[1].traits.contains(.notEnabled))")
        }
        #expect(examples.count == 8)
        #expect(Self.names.map { Array($0.name.utf8).count } == [13, 13, 13, 13, 13, 13, 18, 90])
    }

    // MARK: - The name (ADR-0041)

    /// A switch with no label of its own is named by the pair its host hands over, drawn or hidden, and is still one
    /// switch carrying its value; a switch given its own label keeps it inside a host.
    @Test func aHostHandsItsNameOver() throws {
        let reference = try Self.reference(named: "Night shading", isOn: true, isDisabled: false)
        for visibility in DSLabelVisibility.allCases {
            let hosted = DSControlName(label: .verbatim("Night shading"), labelVisibility: visibility)
            let found = try Self.elements(around: DSToggle(isOn: .constant(true)).dsControlName(hosted))
            #expect(found.map(\.label) == ["Above", "Night shading", "Below"], "hosted, \(visibility.rawValue): \(found)")
            if found.count == 3 {
                Self.expectSwitch(found[1], like: reference, named: "Night shading", "hosted, \(visibility.rawValue)")
            }
        }

        let own = DSToggle(verbatim: "Night shading", isOn: .constant(true))
            .dsControlName(DSControlName(label: .verbatim("Route layer"), labelVisibility: .hidden))
        let found = try Self.elements(around: own)
        #expect(found.map(\.label) == ["Above", "Night shading", "Below"], "a label of its own inside a host: \(found)")
        if found.count == 3 {
            Self.expectSwitch(found[1], like: reference, named: "Night shading", "a label of its own inside a host")
        }
    }

    /// A localized label is looked up where the switch renders, as SwiftUI's own `Text` looks it up, and the key is
    /// never spoken in its place: here the key is its own English value, which is what an app with no table gets.
    @Test func aLocalizedLabelIsTheNameAsItResolves() throws {
        let reference = try Self.reference(named: "Night shading", isOn: false, isDisabled: false)
        for visibility in DSLabelVisibility.allCases {
            let found = try Self.elements(around: DSToggle("Night shading", isOn: .constant(false), labelVisibility: visibility))
            #expect(found.map(\.label) == ["Above", "Night shading", "Below"], "\(visibility.rawValue): \(found)")
            if found.count == 3 {
                Self.expectSwitch(found[1], like: reference, named: "Night shading", "localized, \(visibility.rawValue)")
            }
        }
    }
}
#endif
