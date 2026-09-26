#if os(iOS)
import SwiftUI
import Testing
import UIKit
import DSCore
import DSTokens
@testable import DSComponents

/// Button.yaml behavior 3 and `accessibility.label`, read off the accessibility tree the simulator publishes rather
/// than asserted: a loading button is one element named by the app's `strings.Button.loading` template filled with its
/// label, and a template the app sets reaches that name, so the English "Saving, loading" is a default of the table and
/// not a word of Button's own (ADR-0032).
///
/// The name of the `loading` example is the web's, byte for byte: `web/apps/gallery/test/accessibility.browser.test.tsx`
/// reads "Saving, loading" off Chromium's tree for the same story. `DSButtonBindingTests` holds
/// `DSButton.loadingName(locale:strings:)` to the same words on the host; what this suite adds is the part the host
/// cannot see, that the body hands VoiceOver that name, with the table read from the environment. Two other examples,
/// `secondary-md` and `ghost-sm`, are read by their labels in `DSIconAccessibilityTreeTests.aButtonsGlyphAddsNoElement`.
///
/// The walk is Divider's (`DSDividerAccessibilityTreeTests.elements(around:)`): every content is hosted between two
/// labelled texts, with the accessibility runtime's automation mode on, and a runtime without that switch skips the
/// suite with the reason instead of failing it. Every content renders in `en_US`, the locale the snapshots render in.
@MainActor
@Suite(
    "Button in the accessibility tree on the simulator (Button.yaml v5)",
    .serialized,
    .enabled(if: DSAccessibilityAutomation.isAvailable, DSAccessibilityAutomation.unavailableComment)
)
struct DSButtonAccessibilityTreeTests {
    static func elements(around content: some View) throws -> [DSDividerAccessibilityTreeTests.Element] {
        try DSDividerAccessibilityTreeTests.elements(around: content.environment(\.locale, DSSnapshotRendering.locale))
    }

    /// The `loading` example, staged as the snapshots stage it, is one button named by the English template filled with
    /// its label; the spinner adds no element.
    @Test func theLoadingExampleIsNamedByTheTemplate() throws {
        let example = try #require(DSExamples.named("Button/loading"))
        let found = try Self.elements(around: example.content())
        #expect(found.map(\.label) == ["Above", "Saving, loading", "Below"], "Button/loading exposes \(found)")
        #expect(found.count == 3 && found[1].traits.contains(.button), "Button/loading is not a button: \(found)")
    }

    /// A loading button speaks the template the app sets, read from the environment the root publishes; a button that
    /// is not loading is named by its label alone, whatever the table says.
    @Test func aLoadingButtonSpeaksTheAppsTemplate() throws {
        let strings = DSStrings(buttonLoading: "{label}: загрузка")
        let loadingButton = DSButton(verbatim: "Сохранение", isLoading: true) {}
            .environment(\.dsStrings, strings)
        let loading = try Self.elements(around: loadingButton)
        #expect(loading.map(\.label) == ["Above", "Сохранение: загрузка", "Below"], "\(loading)")
        let idleButton = DSButton(verbatim: "Сохранение") {}
            .environment(\.dsStrings, strings)
        let idle = try Self.elements(around: idleButton)
        #expect(idle.map(\.label) == ["Above", "Сохранение", "Below"], "\(idle)")
    }
}
#endif
