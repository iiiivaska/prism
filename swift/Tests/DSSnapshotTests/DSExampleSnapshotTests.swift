#if os(iOS)
import Foundation
import SnapshotTesting
import SwiftUI
import Testing
import UIKit
import DSCore
import DSTokens
@testable import DSComponents

/// The SwiftUI snapshots of roadmap P3-3: every spec example of Surface, Text, Button, Card, Divider and Icon
/// (`DSExamples`, which the `#Preview` blocks show) in light/dark × regular/compact × standard/Increase Contrast, plus
/// forced Reduce Transparency for every glass example and Bold Text for every Text and Icon example
/// (`DSSnapshotMatrix`).
///
/// README.md beside this file documents the naming, the pinned rendering, the tolerance and how to record.
///
/// **Modes.** Compare by default: a baseline that differs fails, one that is missing is recorded and fails, and a set
/// recorded by another toolchain or device fails once with that, not once per image (`provenance.json`).
/// `DS_SNAPSHOT_RECORD=1` (`TEST_RUNNER_DS_SNAPSHOT_RECORD=1` through `xcodebuild`) rewrites every baseline and passes.
/// `DS_SNAPSHOT_DIR` reads and writes the baselines somewhere other than `__Snapshots__`, and `DS_SNAPSHOT_ARTIFACTS`
/// is where a failing comparison leaves its reference, failure and difference images.
///
/// These baselines *are* the Apple half of the P3-5 gallery: `tools/gallery` collects them by name out of
/// `__Snapshots__` and never asks this suite to write a second copy (gallery/README.md).
@MainActor
@Suite("SwiftUI snapshots of every spec example (P3-3)", .serialized)
struct DSExampleSnapshotTests {
    static var environment: [String: String] { ProcessInfo.processInfo.environment }
    static var isRecording: Bool { environment["DS_SNAPSHOT_RECORD"] == "1" }

    static var baselineDirectory: URL {
        environment["DS_SNAPSHOT_DIR"].map { URL(fileURLWithPath: $0) } ?? DSSnapshotMatrix.baselineDirectory
    }

    static var artifactDirectory: URL {
        environment["DS_SNAPSHOT_ARTIFACTS"].map { URL(fileURLWithPath: $0) }
            ?? FileManager.default.temporaryDirectory.appendingPathComponent("DSSnapshotFailures")
    }

    /// Every pixel is compared (`precision` 1), each within a CIE ΔE of 3 (`perceptualPrecision` 0.97). Measured on
    /// this matrix, that absorbs a difference of one 8-bit code value on every ground, including the near-black inks
    /// where one value already measures ΔE 2.03, and fails from about three. README.md, "Tolerance", has the table
    /// and why the ceiling is not tighter.
    static let strategy = Snapshotting<UIImage, UIImage>.image(
        precision: 1,
        perceptualPrecision: 0.97,
        scale: DSSnapshotRendering.scale
    )

    @Test(arguments: DSSnapshotMatrix.components)
    func examples(_ component: String) throws {
        if let mismatch = DSSnapshotRendering.deviceMismatch, Self.environment["DS_SNAPSHOT_DIR"] == nil {
            Issue.record("The baselines are \(DSSnapshotRendering.deviceName) on iOS \(DSSnapshotRendering.systemVersion) renders; this run is \(mismatch). Run on that simulator, or set DS_SNAPSHOT_DIR to keep a set of your own.")
            return
        }
        if !Self.isRecording, let mismatch = try Self.provenanceMismatch() {
            Issue.record(Comment(rawValue: mismatch))
            return
        }
        if Self.isRecording { try Self.writeProvenance() }
        let examples = DSSnapshotMatrix.examples(of: component)
        #expect(!examples.isEmpty, "\(component) has no examples")
        for example in examples {
            for variant in DSSnapshotMatrix.variants(of: example) {
                let image = try #require(DSSnapshotRendering.render(example, variant), "\(example.id) \(variant) did not render")
                try verify(image, component: component, file: variant.fileName(example: example.name))
            }
        }
    }

    /// Every variant the matrix can produce, whichever example carries it.
    static let everyVariant: [DSSnapshotVariant] = [ColorScheme.light, .dark].flatMap { scheme in
        DSSnapshotMatrix.densities.flatMap { density in
            ([nil] + DSSnapshotVariant.Accessibility.allCases.map(Optional.init)).map {
                DSSnapshotVariant(scheme: scheme, density: density, accessibility: $0)
            }
        }
    }

    /// The forced state really reaches the render.
    ///
    /// The accessibility axes the baselines are pinned on are written through SwiftUI's underscored environment keys,
    /// which are SPI (`DSSnapshotConditions`). This renders a probe under the same conditions and reads the **public**
    /// values back out of it, so a toolchain that renames one of those keys, or changes what it means, fails here —
    /// loudly, and before any image is written — instead of recording the standard-state images under accessibility
    /// names. It also holds the two channels that are forced separately, SwiftUI's own values and Prism's context, to
    /// the same answer.
    @Test func theForcedConditionsReachTheRender() throws {
        for variant in Self.everyVariant {
            let seen = try #require(DSSnapshotRendering.renderedConditions(variant), "\(variant) did not render")
            let increasedContrast = variant.accessibility == .increasedContrast
            let reduceTransparency = variant.accessibility == .reduceTransparency
            let boldText = variant.accessibility == .boldText
            print("DSSnapshotConditions \(variant) | contrast \(seen.contrast) | reduceTransparency \(seen.reduceTransparency) | reduceMotion \(seen.reduceMotion) | legibilityWeight \(String(describing: seen.legibilityWeight)) | \(seen.context)")

            // SwiftUI's own values, the ones the colour catalog's High Contrast appearances and symbol weights read.
            #expect(seen.colorScheme == variant.scheme, "\(variant): colorScheme is \(seen.colorScheme)")
            #expect(seen.contrast == (increasedContrast ? .increased : .standard), "\(variant): colorSchemeContrast is \(seen.contrast); _colorSchemeContrast did not reach the render")
            #expect(seen.reduceTransparency == reduceTransparency, "\(variant): accessibilityReduceTransparency is \(seen.reduceTransparency); _accessibilityReduceTransparency did not reach the render")
            #expect(seen.reduceMotion == false, "\(variant): accessibilityReduceMotion is \(seen.reduceMotion); _accessibilityReduceMotion did not reach the render")
            #expect(seen.legibilityWeight == (boldText ? .bold : .regular), "\(variant): legibilityWeight is \(String(describing: seen.legibilityWeight))")
            #expect(seen.dynamicTypeSize == .large, "\(variant): dynamicTypeSize is \(seen.dynamicTypeSize)")

            // Prism's context, derived from `dsAccessibilityPolicy` at the point a component reads tokens.
            #expect(seen.context.colorScheme == (variant.scheme == .dark ? .dark : .light), "\(variant): \(seen.context)")
            #expect(seen.context.contrast == (increasedContrast ? .increased : .standard), "\(variant): \(seen.context)")
            #expect(seen.context.transparency == (reduceTransparency ? .reduced : .standard), "\(variant): \(seen.context)")
            #expect(seen.context.motion == .standard, "\(variant): \(seen.context)")
            #expect(seen.context.density == variant.density, "\(variant): \(seen.context)")
            #expect(seen.context.modality == .touch, "\(variant): \(seen.context)")
            #expect(seen.policyBoldText == boldText, "\(variant): policy boldText is \(seen.policyBoldText)")
            #expect(seen.policyIncreasedContrast == increasedContrast, "\(variant): policy increasedContrast is \(seen.policyIncreasedContrast)")
            #expect(seen.policyReduceTransparency == reduceTransparency, "\(variant): policy reduceTransparency is \(seen.policyReduceTransparency)")
            #expect(seen.policyReduceMotion == false, "\(variant): policy reduceMotion is \(seen.policyReduceMotion)")
        }
    }

    private func verify(_ image: UIImage, component: String, file: String) throws {
        let directory = Self.baselineDirectory.appendingPathComponent(component)
        let url = directory.appendingPathComponent(file)
        let diffing = Self.strategy.diffing
        let exists = FileManager.default.fileExists(atPath: url.path)
        if Self.isRecording || !exists {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try diffing.toData(image).write(to: url)
            if !Self.isRecording {
                // The set now holds an image from this run; say where it came from, unless it already says.
                try Self.writeProvenance(ifMissing: true)
                Issue.record("\(component)/\(file) had no baseline; recorded it at \(url.path). Review it and run again.")
            }
            return
        }
        let reference = diffing.fromData(try Data(contentsOf: url))
        guard let (message, attachments) = diffing.diffV2(reference, image) else { return }
        let artifacts = Self.artifactDirectory.appendingPathComponent(component)
            .appendingPathComponent((file as NSString).deletingPathExtension)
        try FileManager.default.createDirectory(at: artifacts, withIntermediateDirectories: true)
        for case let .data(data, name) in attachments {
            try data.write(to: artifacts.appendingPathComponent(name))
        }
        Issue.record("\(component)/\(file): \(message) Reference, failure and difference: \(artifacts.path)")
    }

    // MARK: - Provenance

    /// `provenance.json` beside the baselines: what recorded them (README.md, "Provenance").
    static var provenanceURL: URL { baselineDirectory.appendingPathComponent("provenance.json") }

    static func writeProvenance(ifMissing: Bool = false) throws {
        if ifMissing, FileManager.default.fileExists(atPath: provenanceURL.path) { return }
        try FileManager.default.createDirectory(at: baselineDirectory, withIntermediateDirectories: true)
        let data = try JSONSerialization.data(
            withJSONObject: DSSnapshotRendering.provenance,
            options: [.prettyPrinted, .sortedKeys]
        )
        try (String(decoding: data, as: UTF8.self) + "\n").write(to: provenanceURL, atomically: true, encoding: .utf8)
    }

    /// Why the committed set and this run cannot be compared, or nil when they can.
    ///
    /// A SwiftUI render is reproducible inside one toolchain and one simulator runtime, not across them: the roadmap's
    /// Xcode 27 lane is exactly this divergence, and today the owner's Mac has only Xcode 27.0 while CI pins 26.6. Both
    /// the recorded set and the run carry their own stamp, so a set recorded elsewhere fails with one readable line
    /// instead of a pixel diff per image.
    static func provenanceMismatch() throws -> String? {
        let baselines = try? FileManager.default.contentsOfDirectory(atPath: baselineDirectory.path)
        guard let baselines, baselines.contains(where: { $0 != "provenance.json" && !$0.hasPrefix(".") }) else {
            return nil // No baselines yet: this run records them and writes the stamp with them.
        }
        guard let data = try? Data(contentsOf: provenanceURL),
              let recorded = try JSONSerialization.jsonObject(with: data) as? [String: String]
        else {
            return "\(provenanceURL.path) is missing: these baselines do not say what recorded them. Record them again (DS_SNAPSHOT_RECORD=1) so they carry a stamp."
        }
        let run = DSSnapshotRendering.provenance
        let differences = run.keys.sorted()
            .filter { recorded[$0] != run[$0] }
            .map { "\($0): recorded \(recorded[$0] ?? "—"), this run \(run[$0] ?? "—")" }
        guard !differences.isEmpty else { return nil }
        return """
            The baselines under \(baselineDirectory.path) were recorded by another toolchain or device, so a \
            comparison would only report that difference: \(differences.joined(separator: "; ")). \
            Run on what recorded them, or record a set of your own with DS_SNAPSHOT_RECORD=1 and DS_SNAPSHOT_DIR.
            """
    }
}

/// Finds the test bundle, whose Info.plist carries the Xcode and SDK that built it.
private final class DSSnapshotBundleToken {}

/// The pinned rendering every baseline is made with (README.md, "Rendering").
@MainActor
enum DSSnapshotRendering {
    /// The simulator the baselines are recorded and compared on, locally and in CI.
    static let deviceName = "iPhone 17"
    static let systemVersion = "26.5"
    /// iPhone 17's portrait width in points (1206 px at 3×): the width an example is proposed, so it lays out inside
    /// the phone's width and no wider. The height, and any width an example does not ask for, is its own, which keeps
    /// a snapshot tight around what changed.
    static let width: CGFloat = 402
    /// One pixel per point, the scale the web baselines are captured at (`deviceScaleFactor: 1`), so the gallery pairs
    /// compare like for like and the committed set stays small.
    static let scale: CGFloat = 1
    /// No example of the snapshotted specs declares a locale, so every one renders in en_US, UTC and the Gregorian
    /// calendar.
    static let locale = Locale(identifier: "en_US")
    static let timeZone = TimeZone(identifier: "UTC") ?? TimeZone(secondsFromGMT: 0) ?? .current
    static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = locale
        calendar.timeZone = timeZone
        return calendar
    }
    /// A render is repeated until two in a row are identical: surfaces and text size their backdrop copy and their
    /// truncation from geometry they measure during the first pass.
    static let maximumPasses = 4

    /// Nil on the pinned simulator; otherwise what this run is.
    static var deviceMismatch: String? {
        let name = ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] ?? "not a simulator"
        let version = UIDevice.current.systemVersion
        return name == deviceName && version == systemVersion ? nil : "\(name) on iOS \(version)"
    }

    /// Everything outside the views that decides a pixel, stamped into the baselines: the simulator, the toolchain
    /// and SDK the test bundle was built with (`DTXcodeBuild`, `DTSDKName`, set by xcodebuild) and the pinned
    /// rendering. Two runs that agree here compare images; two that do not cannot (README.md, "Provenance").
    static var provenance: [String: String] {
        let bundle = Bundle(for: DSSnapshotBundleToken.self).infoDictionary ?? [:]
        return [
            "device": ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] ?? "not a simulator",
            "os": UIDevice.current.systemVersion,
            "xcode": bundle["DTXcodeBuild"] as? String ?? "unknown",
            "sdk": bundle["DTSDKName"] as? String ?? "unknown",
            "scale": "\(scale)",
            "width": "\(width)",
            "locale": locale.identifier,
            "timeZone": timeZone.identifier,
        ]
    }

    /// The example in one variant, under `DSSnapshotConditions`.
    static func view(_ example: DSExample, _ variant: DSSnapshotVariant) -> some View {
        DSTheme { example.content() }.modifier(DSSnapshotConditions(variant: variant))
    }

    /// What a render made under `DSSnapshotConditions` actually saw, read back from inside it: the same conditions,
    /// applied to a probe instead of an example (`DSExampleSnapshotTests.theForcedConditionsReachTheRender`).
    static func renderedConditions(_ variant: DSSnapshotVariant) -> DSRenderedConditions? {
        let probe = DSConditionProbe()
        let content = DSTheme { DSConditionReader(probe: probe) }.modifier(DSSnapshotConditions(variant: variant))
        let renderer = ImageRenderer(content: content)
        renderer.proposedSize = ProposedViewSize(width: width, height: nil)
        renderer.scale = scale
        _ = renderer.uiImage
        return probe.seen
    }

    /// The settled render, or nil when the example renders nothing or has not settled after `maximumPasses`.
    static func render(_ example: DSExample, _ variant: DSSnapshotVariant) -> UIImage? {
        let renderer = ImageRenderer(content: view(example, variant))
        renderer.proposedSize = ProposedViewSize(width: width, height: nil)
        renderer.scale = scale
        renderer.isOpaque = true
        var data = renderer.uiImage?.pngData()
        for pass in 2...maximumPasses {
            RunLoop.main.run(until: Date())
            let image = renderer.uiImage
            let next = image?.pngData()
            if next == data {
                print("DSSnapshot \(example.id) \(variant): settled after \(pass - 1) pass(es)")
                return image
            }
            data = next
        }
        return nil
    }
}

// MARK: - The forced conditions

/// Every setting that reaches a pixel, forced for one variant: the scheme, density and touch modality; the
/// accessibility state through `dsAccessibilityPolicy` (Prism's context: the glass fallback, the weight rules) **and**
/// through SwiftUI's own values (the colour catalog's High Contrast appearances, symbol weight); the Large text size,
/// the locale, the time zone and the layout direction. Nothing is read from the simulator's settings.
///
/// **The three underscored keys are SPI.** `_colorSchemeContrast`, `_accessibilityReduceTransparency` and
/// `_accessibilityReduceMotion` are the only way to write SwiftUI's own accessibility values from a test — the public
/// keys are get-only — and they are exactly the axis the baselines are pinned on. They work on Xcode 27 and on the
/// iOS 26.5 runtime, but a toolchain may rename or drop them, and then this whole matrix would quietly record its
/// standard-state images under accessibility names. One modifier holds them, and
/// `DSExampleSnapshotTests.theForcedConditionsReachTheRender` reads the public values back out of a render made
/// through it, so a toolchain that drops one fails on that test before any image is written.
struct DSSnapshotConditions: ViewModifier {
    let variant: DSSnapshotVariant

    // Written out: a synthesized memberwise initializer of a type with a private member is private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site; the initializer is spelled out here for the same reason.
    init(variant: DSSnapshotVariant) {
        self.variant = variant
    }

    func body(content: Content) -> some View {
        let increasedContrast = variant.accessibility == .increasedContrast
        let reduceTransparency = variant.accessibility == .reduceTransparency
        let boldText = variant.accessibility == .boldText
        return content
            .dsDensity(variant.density)
            .dsModality(.touch)
            .dsAccessibilityPolicy(
                boldText: boldText,
                increasedContrast: increasedContrast,
                reduceTransparency: reduceTransparency,
                reduceMotion: false,
                dynamicTypeSize: .large
            )
            .environment(\.colorScheme, variant.scheme)
            .environment(\._colorSchemeContrast, increasedContrast ? .increased : .standard)
            .environment(\._accessibilityReduceTransparency, reduceTransparency)
            .environment(\._accessibilityReduceMotion, false)
            .environment(\.legibilityWeight, boldText ? .bold : .regular)
            .environment(\.dynamicTypeSize, .large)
            .environment(\.locale, DSSnapshotRendering.locale)
            .environment(\.timeZone, DSSnapshotRendering.timeZone)
            .environment(\.calendar, DSSnapshotRendering.calendar)
            .environment(\.layoutDirection, .leftToRight)
    }
}

/// The state a render saw: SwiftUI's own accessibility values, read through their **public** keys, and the Prism
/// context and policy DSCore derived at the same point. The two channels are forced separately, so a run in which
/// they disagree is a run whose images are not what their names say.
struct DSRenderedConditions: Equatable {
    let colorScheme: ColorScheme
    let contrast: ColorSchemeContrast
    let reduceTransparency: Bool
    let reduceMotion: Bool
    let legibilityWeight: LegibilityWeight?
    let dynamicTypeSize: DynamicTypeSize
    let context: DSTokenContext
    let policyBoldText: Bool
    let policyIncreasedContrast: Bool
    let policyReduceTransparency: Bool
    let policyReduceMotion: Bool
}

/// Carries what `DSConditionReader` saw out of the render, the way `DSTextEqualWidthTests.WidthProbe` carries a width.
final class DSConditionProbe {
    var seen: DSRenderedConditions?

    init() {}
}

/// Reads the conditions at the point a component would read them and hands them to the probe.
struct DSConditionReader: View {
    let probe: DSConditionProbe

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.colorSchemeContrast) private var contrast
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.legibilityWeight) private var legibilityWeight
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    private var ds = DSThemeValues()

    // Written out for the reason above: the private members make the synthesized initializer private.
    init(probe: DSConditionProbe) {
        self.probe = probe
    }

    var body: some View {
        let policy = ds.policy
        probe.seen = DSRenderedConditions(
            colorScheme: colorScheme,
            contrast: contrast,
            reduceTransparency: reduceTransparency,
            reduceMotion: reduceMotion,
            legibilityWeight: legibilityWeight,
            dynamicTypeSize: dynamicTypeSize,
            context: ds.context,
            policyBoldText: policy.boldText,
            policyIncreasedContrast: policy.increasedContrast,
            policyReduceTransparency: policy.reduceTransparency,
            policyReduceMotion: policy.reduceMotion
        )
        return Color.clear.frame(width: 1, height: 1)
    }
}
#endif
