import Foundation
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// One cell of the P3-3 snapshot matrix: a scheme, a density and at most one forced accessibility state.
nonisolated struct DSSnapshotVariant: Hashable, Sendable, CustomStringConvertible {
    /// The accessibility state a variant forces through `dsAccessibilityPolicy`; nil is the standard state.
    nonisolated enum Accessibility: String, CaseIterable, Hashable, Sendable {
        case increasedContrast = "increased-contrast"
        case reduceTransparency = "reduce-transparency"
        case boldText = "bold-text"
    }

    let scheme: ColorScheme
    let density: DSDensity
    let accessibility: Accessibility?

    var schemeName: String { scheme == .dark ? "dark" : "light" }

    var description: String {
        [schemeName, density.rawValue, accessibility?.rawValue].compactMap(\.self).joined(separator: " ")
    }

    /// `<exampleId>.<platform>.<scheme>.<density>[.<variant>].png` (README.md, "Naming"; spec/SCHEMA.md,
    /// "Examples and snapshots"). The gallery pairs by this name alone, so the segments and their order are the
    /// web side's too.
    func fileName(example id: String) -> String {
        ([id, DSSnapshotMatrix.platform, schemeName, density.rawValue] + [accessibility?.rawValue].compactMap(\.self))
            .joined(separator: ".") + ".png"
    }
}

/// The matrix of roadmap P3-3 and the file names it produces. Platform-independent, so the host run (`swift test`)
/// checks the names and the committed baselines without a simulator.
@MainActor
enum DSSnapshotMatrix {
    /// The platform segment of the gallery name (spec/SCHEMA.md "Examples and snapshots", P3-5): the **spec
    /// platform key** of the target that rasterized the image, never a stack name. These baselines are iPhone 17
    /// renders, so they are `ios` — a macOS or watchOS set would be `macos` or `watchos` beside them, and the
    /// gallery column then links to that platform's cell of the parity report (critic C-25: `apple` is not a
    /// platform key).
    nonisolated static let platform = "ios"
    /// The components the manifest implements on iOS, in roadmap order: P3-3's four, then Phase 4's.
    nonisolated static let components = ["Surface", "Text", "Button", "Card", "Divider", "Icon", "Badge", "IconButton"]
    /// Both densities of the acceptance line: iOS's default and the pointer default.
    nonisolated static let densities: [DSDensity] = [.regular, .compact]

    /// The components whose spec states a Bold Text rendering rule, and so whose every example is also snapshotted
    /// under Bold Text: Text's weight (ADR-0021 §3) and Icon's rung, which steps one up the registry's ladder
    /// (Icon.yaml behavior 4).
    nonisolated static let boldTextComponents: Set<String> = ["Text", "Icon"]

    /// Every variant of one example: light/dark (as the example declares) × regular/compact × standard/Increase
    /// Contrast, plus forced Reduce Transparency when the example renders glass and Bold Text when its spec states a
    /// Bold Text rule (`boldTextComponents`).
    static func variants(of example: DSExample) -> [DSSnapshotVariant] {
        var accessibility: [DSSnapshotVariant.Accessibility?] = [nil, .increasedContrast]
        if example.hasGlass { accessibility.append(.reduceTransparency) }
        if boldTextComponents.contains(example.component) { accessibility.append(.boldText) }
        return example.schemes.flatMap { scheme in
            densities.flatMap { density in
                accessibility.map { DSSnapshotVariant(scheme: scheme, density: density, accessibility: $0) }
            }
        }
    }

    static func examples(of component: String) -> [DSExample] {
        DSExamples.all.filter { $0.component == component }
    }

    /// Every baseline path, relative to `__Snapshots__`: `<Component>/<file name>`.
    static var allPaths: [String] {
        components.flatMap { component in
            examples(of: component).flatMap { example in
                variants(of: example).map { "\(component)/\($0.fileName(example: example.name))" }
            }
        }
    }

    /// The committed baselines: `__Snapshots__` beside this file.
    static let baselineDirectory = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()
        .appendingPathComponent("__Snapshots__")
}

/// The matrix itself: its size, its names and the committed baselines it owns. These run on the host and on the
/// simulator.
@MainActor
@Suite("The P3-3 snapshot matrix and its file names")
struct DSSnapshotMatrixTests {
    /// 8 Surface, 6 Text, 7 Button, 7 Card, 6 Divider, 11 Icon, 10 Badge and 12 IconButton examples; one Card example
    /// is light only; 3 Surface, 1 Text, 2 Card, 1 Divider, 2 Icon, 1 Badge and 1 IconButton examples render glass.
    ///
    /// Surface 8×8 + 3×4 = 76, Text 6×8 + 1×4 + 6×4 = 76, Button 7×8 = 56, Card 6×8 + 1×4 + 2×4 = 60,
    /// Divider 6×8 + 1×4 = 52, Icon 11×8 + 11×4 + 2×4 = 140, Badge 10×8 + 1×4 = 84, IconButton 12×8 + 1×4 = 100.
    static let expectedCount = 644

    @Test func theMatrixHasTheExpectedSizeAndUniqueNames() {
        let paths = DSSnapshotMatrix.allPaths
        #expect(paths.count == Self.expectedCount)
        #expect(Set(paths).count == paths.count, "two variants share a file name")
        for component in DSSnapshotMatrix.components {
            #expect(!DSSnapshotMatrix.examples(of: component).isEmpty, "\(component) has no examples")
        }
    }

    /// `components` is written by hand, so it is held to the manifest: the matrix snapshots exactly the components
    /// `DSComponentsManifest` says iOS implements. If a component entered the manifest and not this list, it would
    /// never be rendered, and nothing else would notice. `expectedCount` would still be right, the gallery would list
    /// its iOS images as missing, which is not an error, and the CI hand-back would have nothing to hand back.
    @Test func theMatrixCoversEveryComponentTheManifestImplementsOnIOS() {
        let implemented = Set(DSComponentsManifest.implemented.filter { $0.value[DSSnapshotMatrix.platform] != nil }.keys)
        let listed = Set(DSSnapshotMatrix.components)
        #expect(listed.count == DSSnapshotMatrix.components.count, "DSSnapshotMatrix.components names a component twice")
        #expect(
            listed == implemented,
            "implemented on iOS and not snapshotted: \(implemented.subtracting(listed).sorted()); snapshotted and not implemented on iOS: \(listed.subtracting(implemented).sorted())"
        )
    }

    @Test func namesFollowTheGalleryTemplate() throws {
        let example = try #require(DSExamples.named("Surface/glass-over-map"))
        let names = DSSnapshotMatrix.variants(of: example).map { $0.fileName(example: example.name) }
        #expect(names.contains("glass-over-map.ios.light.regular.png"))
        #expect(names.contains("glass-over-map.ios.dark.compact.increased-contrast.png"))
        #expect(names.contains("glass-over-map.ios.dark.regular.reduce-transparency.png"))
        #expect(!names.contains { $0.contains("bold-text") })
        let text = try #require(DSExamples.named("Text/data-tabular"))
        #expect(DSSnapshotMatrix.variants(of: text).map { $0.fileName(example: text.name) }.contains("data-tabular.ios.light.compact.bold-text.png"))
        let tinted = try #require(DSExamples.named("Card/tinted-focus"))
        #expect(DSSnapshotMatrix.variants(of: tinted).allSatisfy { $0.scheme == .light })
        let icon = try #require(DSExamples.named("Icon/display-lg"))
        let iconNames = DSSnapshotMatrix.variants(of: icon).map { $0.fileName(example: icon.name) }
        #expect(iconNames.contains("display-lg.ios.dark.regular.bold-text.png"))
        #expect(!iconNames.contains { $0.contains("reduce-transparency") })
    }

    /// Every committed PNG is one the matrix renders, so a renamed or removed example leaves no stale baseline.
    @Test func everyCommittedBaselineBelongsToTheMatrix() throws {
        let root = DSSnapshotMatrix.baselineDirectory
        let expected = Set(DSSnapshotMatrix.allPaths)
        guard let walker = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil) else { return }
        var orphans: [String] = []
        for case let url as URL in walker where url.pathExtension == "png" {
            let relative = String(url.standardizedFileURL.path.dropFirst(root.standardizedFileURL.path.count + 1))
            if !expected.contains(relative) { orphans.append(relative) }
        }
        #expect(orphans.isEmpty, "baselines no example renders: \(orphans.sorted())")
    }
}
