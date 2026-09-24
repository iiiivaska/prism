#if os(iOS)
import SwiftUI
import Testing
import UIKit
import DSCore
import DSTokens
@testable import DSComponents

/// Avatar.yaml behaviors 11 and 12, `accessibility` and `notes.platform.ios`, read off the accessibility tree the
/// simulator publishes rather than asserted: every example with a name that is not decorative is exactly one element
/// with the image trait, named by that name byte for byte; `fallback-icon` and `decorative` are no element at all.
/// Neither the initials nor the glyph nor the portrait is ever an element of its own, and no word is invented for the
/// glyph (ADR-0032).
///
/// The names are the web's, byte for byte: `web/apps/gallery/test/accessibility.browser.test.tsx` reads Chromium's tree
/// for every Avatar story and finds one `image` per exposed example, named by the same name, and nothing for the other
/// two. `DSAvatarNameCase.all` (`DSComponentsTests/DSAvatarBindingTests.swift`) holds the pure functions to the same
/// table, which `names` repeats here because this target cannot import that one.
///
/// The walk is Divider's (`DSDividerAccessibilityTreeTests.elements(around:)`): every content is hosted between two
/// labelled texts, with the accessibility runtime's automation mode on, and a runtime without that switch skips the
/// suite with the reason instead of failing it. Every content renders in `en_US`, the locale the snapshots render in.
@MainActor
@Suite(
    "Avatar in the accessibility tree on the simulator (Avatar.yaml v1)",
    .serialized,
    .enabled(if: DSAccessibilityAutomation.isAvailable, DSAccessibilityAutomation.unavailableComment)
)
struct DSAvatarAccessibilityTreeTests {
    static let around = DSDividerAccessibilityTreeTests.around

    /// The name each example publishes, or nil for one that is hidden: `DSAvatarNameCase.all` on the host, which this
    /// target cannot import, and the web's table in the browser.
    static let names: [(id: String, name: String?)] = [
        ("image-md", "Anna Petrova"),
        ("initials-md", "Anna Petrova"),
        ("initials-one-word", "Northgate"),
        ("fallback-icon", nil),
        ("ringed", "Anna Petrova"),
        ("size-sm", "Anna Petrova"),
        ("size-lg", "Anna Petrova"),
        ("decorative", nil),
        ("ringed-over-map", "Anna Petrova"),
        ("initials-over-map", "Anna Petrova"),
        ("on-glass-over-image", "Anna Petrova"),
        ("russian-initials", "Анна Петрова"),
    ]

    /// Traits that would say the avatar is something it is not: it is not a control, a header, a link or a live region.
    static let foreignTraits: [(String, UIAccessibilityTraits)] = [
        ("button", .button), ("header", .header), ("link", .link), ("updatesFrequently", .updatesFrequently),
    ]

    static func elements(around content: some View) throws -> [DSDividerAccessibilityTreeTests.Element] {
        try DSDividerAccessibilityTreeTests.elements(around: content.environment(\.locale, DSSnapshotRendering.locale))
    }

    /// A picture with a name of its own, which must never reach VoiceOver: an SF Symbol names itself ("Person").
    static let namedPicture = Image(systemName: "person.crop.circle.fill")

    // MARK: - The examples

    /// Every spec example, staged as the snapshots stage it: an exposed one is one image between the two labels, named
    /// as the table says, with no value and no hint; a hidden one is nothing between them.
    @Test func everyExampleIsNamedAsTheTableSays() throws {
        let examples = DSExamples.all.filter { $0.component == "Avatar" }
        #expect(examples.map(\.name) == Self.names.map(\.id))
        for (example, want) in zip(examples, Self.names) {
            let found = try Self.elements(around: example.content())
            guard let name = want.name else {
                #expect(found.map(\.label) == Self.around, "Avatar/\(example.name) exposes \(found)")
                continue
            }
            #expect(found.map(\.label) == ["Above", name, "Below"], "Avatar/\(example.name) exposes \(found)")
            guard found.count == 3 else { continue }
            #expect(Array(found[1].label.utf8) == Array(name.utf8), "Avatar/\(example.name): \(found[1].label.debugDescription)")
            #expect(found[1].traits.contains(.image), "Avatar/\(example.name) is not an image: \(found[1])")
            #expect(found[1].value.isEmpty && found[1].hint.isEmpty, "Avatar/\(example.name): \(found[1])")
            for (trait, value) in Self.foreignTraits {
                #expect(!found[1].traits.contains(value), "Avatar/\(example.name) is announced as \(trait): \(found[1])")
            }
        }
    }

    // MARK: - Hidden and named

    /// An avatar with nothing to announce is no element: no name, a name of nothing but whitespace (Icon's six blanks),
    /// and a decorative one whatever it holds. The glyph is never named, and a picture's own name never leaks.
    @Test func anAvatarWithNothingToAnnounceIsNoElement() throws {
        let picture = Self.namedPicture
        let hidden: [(String, DSAvatar)] = [
            ("no name", DSAvatar()),
            ("no name, with a picture", DSAvatar(image: picture)),
            ("the empty name", DSAvatar(name: "")),
            ("a name of spaces", DSAvatar(name: "  ")),
            ("a name of a tab and a line feed", DSAvatar(name: "\t\n")),
            ("a name of a no-break space", DSAvatar(name: "\u{00A0}")),
            ("a name of an ideographic space", DSAvatar(name: "\u{3000}")),
            ("a name of U+FEFF", DSAvatar(name: "\u{FEFF}")),
            ("a name, decorative", DSAvatar(name: "Anna Petrova", isDecorative: true)),
            ("a name and a picture, decorative", DSAvatar(name: "Anna Petrova", image: picture, hasRing: true, isDecorative: true)),
        ]
        for (description, avatar) in hidden {
            let found = try Self.elements(around: avatar)
            #expect(found.map(\.label) == Self.around, "DSAvatar, \(description), exposes \(found)")
        }
    }

    /// A named avatar is one image named by its name and nothing else: with a picture that names itself, the picture's
    /// name is not read; with a name that has no letter in it, the avatar draws the glyph and is still named by it; and
    /// the name is the caller's, never the upper-cased initials.
    @Test func aNamedAvatarIsOneImageNamedByItsName() throws {
        let named: [(String, DSAvatar, String)] = [
            ("a picture that names itself", DSAvatar(name: "Anna Petrova", image: Self.namedPicture), "Anna Petrova"),
            ("a name with no letter", DSAvatar(name: "4417"), "4417"),
            ("a lower-case name", DSAvatar(name: "ilker işık"), "ilker işık"),
        ]
        for (description, avatar, name) in named {
            let found = try Self.elements(around: avatar)
            #expect(found.map(\.label) == ["Above", name, "Below"], "DSAvatar, \(description), exposes \(found)")
            if found.count == 3 {
                #expect(found[1].traits.contains(.image), "DSAvatar, \(description): \(found[1])")
            }
        }
    }
}
#endif
