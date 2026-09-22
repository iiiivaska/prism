import Foundation
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// ADR-0006 rules 2 and 3 on the Swift side: the manifest declares the implemented `specVersion` of each component on
/// each Apple platform the spec supports, and every `examples[]` entry of an implemented spec has a rendered example
/// (`DSExamples`, which the previews and the snapshot harness share).
///
/// The specs are read from the repository next to this file, so this suite runs where the checkout is readable: the
/// macOS host (`swift test`) and the simulators.
@Suite("Manifest and examples follow the specs (ADR-0006)")
struct DSComponentsContractTests {
    static let repository = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent() // DSComponentsTests
        .deletingLastPathComponent() // Tests
        .deletingLastPathComponent() // swift
        .deletingLastPathComponent()

    static func spec(_ name: String) throws -> String {
        try String(contentsOf: repository.appendingPathComponent("spec/components/\(name).yaml"), encoding: .utf8)
    }

    static func specVersion(_ yaml: String) -> Int? {
        yaml.firstMatch(of: /(?m)^specVersion:\s*(\d+)\s*$/).flatMap { Int($0.1) }
    }

    /// The `platforms` block: platform key → support level.
    static func platforms(_ yaml: String) -> [String: String] {
        guard let block = yaml.firstMatch(of: /(?ms)^platforms:\n((?:[ ]+[\w-]+:[ ]*\w+\n)+)/) else { return [:] }
        var out: [String: String] = [:]
        for line in block.1.split(separator: "\n") {
            let parts = line.split(separator: ":").map { $0.trimmingCharacters(in: .whitespaces) }
            if parts.count == 2 { out[parts[0]] = parts[1] }
        }
        return out
    }

    /// The `examples` block's ids, in order.
    static func exampleIDs(_ yaml: String) -> [String] {
        guard let start = yaml.range(of: "\nexamples:\n") else { return [] }
        let rest = yaml[start.upperBound...]
        let end = rest.firstMatch(of: /(?m)^\w/)?.range.lowerBound ?? rest.endIndex
        return rest[..<end].matches(of: /(?m)^  - id:\s*([\w-]+)\s*$/).map { String($0.1) }
    }

    /// The `schemes` an example declares, by id; an example that declares none renders in both.
    static func exampleSchemes(_ yaml: String) -> [String: [String]] {
        guard let start = yaml.range(of: "\nexamples:\n") else { return [:] }
        let rest = yaml[start.upperBound...]
        let end = rest.firstMatch(of: /(?m)^\w/)?.range.lowerBound ?? rest.endIndex
        var out: [String: [String]] = [:]
        var current: String?
        for line in rest[..<end].split(separator: "\n") {
            if let id = line.firstMatch(of: /^  - id:\s*([\w-]+)\s*$/) {
                current = String(id.1)
                out[String(id.1)] = ["light", "dark"]
            } else if let current, let schemes = line.firstMatch(of: /^    schemes:\s*\[([\w,\s]+)\]\s*$/) {
                out[current] = schemes.1.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
            }
        }
        return out
    }

    nonisolated static let implemented = ["Surface", "Text", "Button", "Card"]
    nonisolated static let applePlatforms = ["ios", "ipados", "macos", "watchos"]

    @Test(arguments: implemented)
    func manifestDeclaresTheSpecVersionOnEverySupportedPlatform(_ name: String) throws {
        let yaml = try Self.spec(name)
        let version = try #require(Self.specVersion(yaml))
        let platforms = Self.platforms(yaml)
        let declared = try #require(DSComponentsManifest.implemented[name], "\(name) is missing from the manifest")
        for platform in Self.applePlatforms {
            let level = try #require(platforms[platform], "\(name).yaml has no \(platform) level")
            if level == "none" {
                #expect(declared[platform] == nil, "\(name) declares \(platform), which the spec marks none")
            } else {
                #expect(declared[platform] == version, "\(name) on \(platform): manifest \(String(describing: declared[platform])), spec \(version)")
            }
        }
        #expect(Set(declared.keys).isSubset(of: Self.applePlatforms), "\(name) declares a platform that is not Apple's")
    }

    @Test func manifestListsOnlyImplementedComponents() {
        #expect(Set(DSComponentsManifest.implemented.keys) == Set(Self.implemented))
    }

    @Test(arguments: implemented)
    @MainActor
    func everySpecExampleHasAnExample(_ name: String) throws {
        let ids = Self.exampleIDs(try Self.spec(name))
        #expect(!ids.isEmpty)
        let examples = DSExamples.all.filter { $0.component == name }.map(\.name)
        #expect(examples == ids, "\(name): examples \(examples), spec \(ids)")
    }

    /// An example renders in the schemes its spec entry declares (a `tinted` Card is light only, ADR-0030 §3.3).
    @Test(arguments: implemented)
    @MainActor
    func everyExampleRendersInItsSchemes(_ name: String) throws {
        let declared = Self.exampleSchemes(try Self.spec(name))
        for example in DSExamples.all where example.component == name {
            let schemes = example.schemes.map { $0 == .dark ? "dark" : "light" }
            #expect(schemes == declared[example.name], "\(example.id): \(schemes), spec \(String(describing: declared[example.name]))")
        }
    }
}

/// Every example renders, in each scheme it declares, and every glass example also under forced Reduce Transparency
/// (roadmap P3-3).
@MainActor
@Suite("Every example renders", .serialized)
struct DSExampleRenderTests {
    static func render(_ view: some View) -> CGImage? {
        let renderer = ImageRenderer(content: view)
        renderer.scale = 1
        return renderer.cgImage
    }

    @Test func rendersInEachScheme() throws {
        #expect(!DSExamples.all.isEmpty)
        for example in DSExamples.all {
            for scheme in example.schemes {
                let image = try #require(Self.render(DSTheme { example.content() }.environment(\.colorScheme, scheme)))
                #expect(image.width > 0 && image.height > 0, "\(example.id) \(scheme)")
                if example.hasGlass {
                    let fallback = Self.render(
                        DSTheme { example.content() }
                            .environment(\.colorScheme, scheme)
                            .dsAccessibilityPolicy(reduceTransparency: true)
                    )
                    #expect(fallback != nil, "\(example.id) \(scheme) under Reduce Transparency")
                }
            }
        }
    }
}
