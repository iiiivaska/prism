import CoreText
import Foundation
import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0021 rule 7, the registration half: DSCore registers the brand's files synchronously and idempotently and
/// asserts every PostScript name, because an unknown name silently resolves to the system fallback face instead
/// of failing (ADR-0021 T3). Runs on the macOS host and, through the gated CI step, on the iOS simulator.
@Suite("Font registration (ADR-0021 §9)", .serialized)
struct DSFontRegistrationTests {
    @Test func registersEveryBundledFaceOfTheBrand() {
        let report = DSFontRegistrar.register(.prism)
        #expect(report.unregistered.isEmpty, "unregistered: \(report.unregistered)")
        #expect(report.substituted.isEmpty, "Core Text substituted its fallback face for: \(report.substituted)")
        #expect(report.isComplete)
        #expect(DSFontRegistrar.registeredFiles.count == 2, "the reference brand bundles Onest and JetBrains Mono")
    }

    /// The check that fails if the system font is substituted: every PostScript name of `DSBrand.faces` resolves
    /// to a face of that exact name, and an unknown name does not.
    @Test func everyPostScriptNameResolvesToItself() {
        DSFontRegistrar.register(.prism)
        var checked = 0
        for (slot, face) in DSBrand.prism.faces where face.file != nil {
            for (weight, name) in face.postScriptNames {
                #expect(
                    DSFontRegistrar.resolves(postScriptName: name),
                    "\(slot) \(weight) (\(name)) fell back to the system face"
                )
                checked += 1
            }
        }
        #expect(checked == 25, "nine Onest instances for each of the ui and display slots, seven JetBrains Mono for mono")

        // The negative case that proves the check bites: an unknown name resolves to the system fallback.
        #expect(!DSFontRegistrar.resolves(postScriptName: "Prism-NoSuchFace-Regular"))
        let fallback = CTFontCreateWithName("Prism-NoSuchFace-Regular" as CFString, 0, nil)
        #expect(CTFontCopyPostScriptName(fallback) as String != "Prism-NoSuchFace-Regular")
    }

    /// The weight a role renders maps to an exact named instance for every weight the ADR-0021 §3 rule can
    /// produce (rule 4, `type/weight-instance`, checked here against the registered faces).
    @Test func everyWeightTheRuleProducesHasAnInstance() {
        DSFontRegistrar.register(.prism)
        let faces = DSBrand.prism.faces
        for context in [DSTokenContext(), DSTokenContext(colorScheme: .dark), DSTokenContext(contrast: .increased)] {
            for child in Mirror(reflecting: DSTokenSet(context).typography).children {
                guard let role = child.value as? DSTypeRole, let face = faces[role.slot], face.file != nil else { continue }
                for weight in [role.weight, role.boldWeight] {
                    let name = face.postScriptName(for: weight)
                    #expect(name != nil, "\(child.label ?? "?") weight \(weight)")
                    #expect(face.postScriptNames[weight] == name, "\(child.label ?? "?") weight \(weight) has no exact instance")
                    if let name { #expect(DSFontRegistrar.resolves(postScriptName: name)) }
                }
            }
        }
    }

    /// Registration runs from `DSTheme.init`, which SwiftUI calls on every update, so it must be idempotent.
    @Test func registrationIsIdempotent() {
        let first = DSFontRegistrar.register(.prism)
        let files = DSFontRegistrar.registeredFiles
        let second = DSFontRegistrar.register(.prism)
        let third = DSFontRegistrar.register(.prism)
        #expect(second == first)
        #expect(third == first)
        #expect(DSFontRegistrar.registeredFiles == files)
        #expect(second.newlyRegistered == first.newlyRegistered, "a repeat call registers nothing again")
    }

    /// The Native preset bundles no file, so it registers nothing and has nothing to assert (ADR-0020 §5).
    @Test func aSystemFaceRegistersNothing() {
        let report = DSFontRegistrar.register(.prismNative)
        #expect(report.newlyRegistered.isEmpty)
        #expect(report.unregistered.isEmpty)
        #expect(report.substituted.isEmpty)
        for (_, face) in DSBrand.prismNative.faces {
            #expect(face.file == nil)
            #expect(face.system != nil)
        }
    }

    /// A `DSTheme` registers the brand's fonts before anything renders.
    @Test func theThemeRegistersOnInit() {
        _ = DSTheme(brand: .prism) { EmptyView() }
        #expect(DSFontRegistrar.registeredFiles.contains { $0.hasSuffix(".ttf") })
        #expect(DSFontRegistrar.substitutedNames(of: .prism).isEmpty)
    }
}
