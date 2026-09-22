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

    /// The names of the `props` entries of type `action`, in order: the handlers spec/SCHEMA.md gives every example.
    static func actionProps(_ yaml: String) -> [String] {
        guard let start = yaml.range(of: "\nprops:\n") else { return [] }
        let rest = yaml[start.upperBound...]
        let end = rest.firstMatch(of: /(?m)^\w/)?.range.lowerBound ?? rest.endIndex
        var out: [String] = []
        var current: String?
        for line in rest[..<end].split(separator: "\n") {
            if let name = line.firstMatch(of: /^  - name:\s*(\w+)\s*$/) {
                current = String(name.1)
            } else if let current, line.firstMatch(of: /^    type:\s*action\s*$/) != nil {
                out.append(current)
            }
        }
        return out
    }

    /// The `action` an example's `props` declare, by id; an example that declares none takes the prop's default.
    ///
    /// The examples write their props as one flow mapping, so the value is read out of the entry's own lines rather
    /// than parsed as YAML: in that style `action` follows the mapping's `{` or a `,`, and in block style the line's
    /// indent. `actionIcon` and `actionLabel` do not match it, and neither would an `onAction`.
    static func exampleActions(_ yaml: String) -> [String: String] {
        guard let start = yaml.range(of: "\nexamples:\n") else { return [:] }
        let rest = yaml[start.upperBound...]
        let end = rest.firstMatch(of: /(?m)^\w/)?.range.lowerBound ?? rest.endIndex
        var out: [String: String] = [:]
        var current: String?
        for line in rest[..<end].split(separator: "\n") {
            if let id = line.firstMatch(of: /^  - id:\s*([\w-]+)\s*$/) {
                current = String(id.1)
            } else if let current, let action = line.firstMatch(of: /(?:[{,]|^\s{4,})\s*action:\s*(none|open|custom)\b/) {
                out[current] = String(action.1)
            }
        }
        return out
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

/// What a hand-written example carries that the spec declares: its handlers ("Every example gets its handlers",
/// spec/SCHEMA.md, "Examples and snapshots") and, for Card, the affordance its `props` ask for.
///
/// Both galleries pass a no-op handler for each prop of type `action` a spec declares, so one example id is the same
/// thing on both stacks. The web enforces it mechanically — `scripts/stories.ts` spies every `action` prop and
/// `test/stories.test.ts` fails on any drift from the generated file — while this example set is written by hand, so
/// a new Card example without `onAction: {}` would silently be a group on Apple and a button on the web, which is
/// exactly the defect the second review round found.
///
/// `props.action` is the same shape of drift one prop over. The web builds Card's `DSCardAction` twin out of
/// `action`, `actionIcon` and `actionLabel` in the gallery harness (`cardArgs`,
/// `web/apps/gallery/src/harness/examples.tsx`), so a generated story cannot disagree with the spec about it; here the
/// case is typed out by hand, and `everySpecExampleHasAnExample` pairs the ids only, so a `custom` example left at the
/// default `.open` would pass every other check while drawing a different card from the web's.
///
/// The rules are read off the rendered examples, not off the source: every Card publishes the form it renders
/// (`DSCardFormKey`), so this asks each example what it actually built. Nothing here reads a pixel, so it runs on the
/// host as well as on the simulators.
@MainActor
@Suite("Every example gets its handlers and, for Card, the spec's action (spec/SCHEMA.md)", .serialized)
struct DSExampleHandlerTests {
    final class FormProbe {
        var value: [DSCardForm] = []
    }

    /// The forms of every Card an example renders, read out of the preference the cards publish.
    static func cardForms(_ example: DSExample) -> [DSCardForm] {
        let probe = FormProbe()
        let view = DSTheme { example.content() }
            .backgroundPreferenceValue(DSCardFormKey.self) { forms in
                probe.value = forms
                return Color.clear
            }
        let renderer = ImageRenderer(content: view)
        renderer.scale = 1
        _ = renderer.cgImage
        return probe.value
    }

    /// Card is the one implemented spec whose `action` prop is optional in the Swift API, so it is the one whose
    /// examples could lose their handler: `DSButton`'s `action` is a required parameter, which makes a Button example
    /// without one a compile error rather than a different picture.
    @Test func cardIsTheSpecWhoseHandlerCanBeForgotten() throws {
        var withActions: [String: [String]] = [:]
        for name in DSComponentsContractTests.implemented {
            let props = DSComponentsContractTests.actionProps(try DSComponentsContractTests.spec(name))
            if !props.isEmpty { withActions[name] = props }
        }
        #expect(withActions == ["Button": ["onPress"], "Card": ["onAction"]])
    }

    /// Every Card example renders a card that was given its `onAction`, so an `open` example is the pressable card
    /// with its glyph — the same form the web story renders — and a `custom` one is the disc that presses.
    @Test func everyCardExampleCarriesItsHandler() throws {
        let examples = DSExamples.all.filter { $0.component == "Card" }
        #expect(!examples.isEmpty)
        for example in examples {
            let forms = Self.cardForms(example)
            #expect(!forms.isEmpty, "\(example.id): no Card published a form; did the example stop rendering one?")
            for form in forms {
                #expect(form.hasAction, "\(example.id): a Card with no `onAction: {}` — the web story has one (spec/SCHEMA.md)")
                #expect(form.isPressable == (form.action == .open), "\(example.id): \(form)")
            }
        }
    }

    /// Every Card example renders the affordance its spec entry declares (`props.action`, default `open`): the three
    /// are three different pictures and three different accessibility trees, so an example that draws another one is
    /// the same card in name only.
    @Test func everyCardExampleRendersTheActionItsSpecDeclares() throws {
        let declared = DSComponentsContractTests.exampleActions(try DSComponentsContractTests.spec("Card"))
        let examples = DSExamples.all.filter { $0.component == "Card" }
        #expect(!examples.isEmpty)
        for example in examples {
            let want = declared[example.name] ?? "open"
            let forms = Self.cardForms(example)
            #expect(!forms.isEmpty, "\(example.id): no Card published a form; did the example stop rendering one?")
            for form in forms {
                #expect(Self.name(of: form.action) == want, "\(example.id): renders \(Self.name(of: form.action)), spec \(want)")
            }
        }
    }

    /// The spec's spelling of an action kind, which is the enum's own case name.
    static func name(of action: DSCardActionKind) -> String {
        switch action {
        case .none: "none"
        case .open: "open"
        case .custom: "custom"
        }
    }

    /// The reader itself: `exampleActions` finds the prop where an example declares it, in either YAML style, and
    /// never reads `actionIcon` or `actionLabel` in its place. No Card example declares an `action` today, so
    /// without this the reader could return nothing at all and the test above would still pass.
    @Test func theDeclaredActionsAreReadBackFromTheSpec() {
        let sample = """

        examples:
          - id: a
            props: { variant: solid, title: "T", action: custom, actionIcon: action.pause, actionLabel: "Pause" }
          - id: b
            props: { variant: solid, title: "T" }
          - id: c
            props:
              title: "T"
              action: none
        notes:
        """
        #expect(DSComponentsContractTests.exampleActions(sample) == ["a": "custom", "c": "none"])
    }

    /// The probe itself: a card without a handler is read back as one, so the test above can fail.
    @Test func theFormOfAHandlerlessCardIsReadBack() {
        let handlerless = DSExample("Card", "probe") {
            DSExampleStage { DSExampleCardFrame { DSCard("Batch 91", caption: "Queued") } }
        }
        let forms = Self.cardForms(handlerless)
        #expect(forms == [DSCardForm(action: .open, hasAction: false)])
        #expect(!(forms.first?.isPressable ?? true))
    }
}

/// Every example renders, in each scheme it declares, and every glass example also under forced Reduce Transparency
/// (roadmap P3-3).
///
/// This asks for an image of the right size, not for what is in it: an example whose body traps, or that lays out to
/// nothing, fails here on any host. What it paints is the snapshot matrix's job, on the simulator — `swift test`
/// copies Colors.xcassets uncompiled, so on the host every token colour resolves to nothing and the raster that comes
/// back is correctly sized and empty (`DSSnapshotTests/DSRenderCapability`). Nothing here reads a pixel, so nothing
/// here can be fooled by that.
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
