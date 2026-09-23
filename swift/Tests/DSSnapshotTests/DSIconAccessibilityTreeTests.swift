#if os(iOS)
import SwiftUI
import Testing
import UIKit
import DSCore
import DSIcons
import DSTokens
@testable import DSComponents

/// Icon.yaml behaviors 13 and 14 and `accessibility`, read off the accessibility tree the simulator publishes rather
/// than asserted: exactly one example, `named-standalone`, is an element — an image named "Locked for editing" — and
/// every other example is no element at all.
///
/// The names are the web's, byte for byte: `web/apps/gallery/test/accessibility.browser.test.tsx` reads Chromium's
/// tree for every Icon story and finds one `image` named "Locked for editing" and nothing else. Icon owns no string
/// (ADR-0032): the one name is the caller's `label`, and the registry entry's `icon.<id>` label field is read by no
/// stack. What this suite adds to `DSIconBindingTests` is the part the host cannot see — that `Image(systemName:)`'s
/// automatic name, the SF Symbol's own, never leaks: a glyph with no `label` is hidden, and a named one ignores its
/// children.
///
/// The walk is Divider's (`DSDividerAccessibilityTreeTests.elements(around:)`): every content is hosted between two
/// labelled texts, with the accessibility runtime's automation mode on, and a runtime without that switch skips the
/// suite with the reason instead of failing it. Its controls — that the walk finds the labels, a labelled shape and an
/// unnamed element — run in Divider's suite, on the same runtime.
///
/// Button and Card now draw their glyphs through `DSIcon` too, so the last two tests hold their trees to what they were:
/// one element per control, named by the control, with no glyph beside it.
@MainActor
@Suite(
    "Icon in the accessibility tree on the simulator (Icon.yaml v2)",
    .serialized,
    .enabled(if: DSAccessibilityAutomation.isAvailable, DSAccessibilityAutomation.unavailableComment)
)
struct DSIconAccessibilityTreeTests {
    static let around = DSDividerAccessibilityTreeTests.around

    static func elements(around content: some View) throws -> [DSDividerAccessibilityTreeTests.Element] {
        try DSDividerAccessibilityTreeTests.elements(around: content)
    }

    // MARK: - Icon

    /// Every spec example, staged as the snapshots stage it: `named-standalone` is one image named by its label, and
    /// every other example is no element.
    @Test func onlyTheNamedExampleIsAnElement() throws {
        let examples = DSExamples.all.filter { $0.component == "Icon" }
        #expect(examples.map(\.name) == DSIconExamples.rows.map(\.id))
        for example in examples {
            let found = try Self.elements(around: example.content())
            if example.name == "named-standalone" {
                #expect(found.map(\.label) == ["Above", "Locked for editing", "Below"], "Icon/\(example.name) exposes \(found)")
                if found.count == 3 {
                    #expect(found[1].traits.contains(.image), "Icon/\(example.name) is not an image: \(found[1])")
                    #expect(Array(found[1].label.utf8).count == 18, "Icon/\(example.name): \(found[1].label.debugDescription)")
                }
            } else {
                #expect(found.map(\.label) == Self.around, "Icon/\(example.name) exposes \(found)")
            }
        }
    }

    /// No label: hidden whatever `isDecorative` says, so the SF Symbol's own name ("Lock") never reaches VoiceOver.
    /// A label that resolves to nothing but whitespace names nothing either — the empty key, spaces, a tab and a line
    /// feed, a no-break space, an interpolation whose value is blank — so it hides the glyph rather than making an image
    /// with an empty name, as the web hides a blank label (`accessibility.browser.test.tsx` reads Chromium's tree for
    /// the same labels). A label with `isDecorative: true`: hidden too, because the text beside it carries the meaning.
    @Test func aGlyphWithoutALabelOrMarkedDecorativeIsNoElement() throws {
        let spaces = "   "
        for (description, icon) in [
            ("no label", DSIcon(.objectLock)),
            ("the empty label", DSIcon(.objectLock, label: "")),
            ("a label of spaces", DSIcon(.objectLock, label: "  ")),
            ("a label of a tab and a line feed", DSIcon(.objectLock, label: "\t\n")),
            ("a label of a no-break space", DSIcon(.objectLock, label: "\u{00A0}")),
            ("an interpolation that resolves to spaces", DSIcon(.objectLock, label: "\(spaces)")),
            ("no label, isDecorative: true", DSIcon(.objectLock, isDecorative: true)),
            ("label, isDecorative: true", DSIcon(.objectLock, label: "Locked for editing", isDecorative: true)),
            ("an image set, no label", DSIcon(.statusTrendUp)),
        ] {
            let found = try Self.elements(around: icon)
            #expect(found.map(\.label) == Self.around, "DSIcon, \(description), exposes \(found)")
        }
    }

    /// A named image set is named by its label and not by its asset name, as a named symbol is.
    @Test func aNamedImageSetIsNamedByItsLabel() throws {
        let found = try Self.elements(around: DSIcon(.statusTrendUp, label: "Rising since Monday"))
        #expect(found.map(\.label) == ["Above", "Rising since Monday", "Below"], "\(found)")
    }

    // MARK: - Button and Card draw their glyphs through Icon

    /// The two Button examples with an icon are one element each, named by the button's label; the glyph adds nothing.
    @Test func aButtonsGlyphAddsNoElement() throws {
        for (id, label) in [("Button/secondary-md", "Details"), ("Button/ghost-sm", "Filter")] {
            let example = try #require(DSExamples.named(id))
            let found = try Self.elements(around: example.content())
            #expect(found.map(\.label) == ["Above", label, "Below"], "\(id) exposes \(found)")
        }
    }

    /// The pressable tinted card with an icon ring is one element, named by its title and caption; neither the ring's
    /// glyph nor the open glyph adds one.
    @Test func aCardsGlyphsAddNoElement() throws {
        let example = try #require(DSExamples.named("Card/tinted-focus"))
        let found = try Self.elements(around: example.content())
        #expect(found.map(\.label) == ["Above", "Sensor, Active", "Below"], "Card/tinted-focus exposes \(found)")
    }
}
#endif
