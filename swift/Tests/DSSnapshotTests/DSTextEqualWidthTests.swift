import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// ADR-0021 §5 and rule 5, as ADR-0030 §7 amends them: the equal-width test, as assertions. "1111" and "0000" lay out at
/// the same width, within 0.5 pt, in every tabular role (`data`, and `axis` through DSCore's text route, since no Text
/// role binds it yet) and in the metric roles set to `numeric: tabular`, at the Large size, at accessibility3 and under
/// Bold Text, for both brands (Onest through `Font.custom`, the system face through `Font.system`). The negative cases:
/// the default `metric-xl` and `metric-md`, and `data` set to `numeric: proportional`, lay "1111" out narrower.
///
/// A width is the width SwiftUI lays the text out at, read by a geometry probe inside an `ImageRenderer` pass; it is
/// the advance width the figures take in a line, not the ink of the glyphs. That is why the suite runs on the macOS
/// host (`swift test`) as well as on the pinned iPhone 17 simulator with the snapshots (`xcodebuild test
/// -only-testing:DSSnapshotTests`): a layout probe needs no rasterizer, and the widths are the same number on both.
///
/// The one assertion here that does read pixels — `boldTextReachesTheTextRoute` — asks `DSRenderCapability` first and
/// skips on a host that cannot rasterize, rather than measuring an ink of 0 on either side and calling them equal.
@MainActor
@Suite("Figures: the equal-width test (ADR-0021 §5)", .serialized)
struct DSTextEqualWidthTests {
    /// ADR-0021 rule 5.
    static let tolerance: CGFloat = 0.5
    /// The layout scale of the probe render: SwiftUI rounds frames to this pixel grid, a quarter of a point.
    static let scale: CGFloat = 4

    nonisolated struct Condition: CustomStringConvertible, Sendable {
        let name: String
        let typeSize: DynamicTypeSize
        let boldText: Bool

        var description: String { name }
    }

    nonisolated static let large = Condition(name: "Large", typeSize: .large, boldText: false)
    nonisolated static let accessibility3 = Condition(name: "accessibility3", typeSize: .accessibility3, boldText: false)
    nonisolated static let boldText = Condition(name: "Bold Text", typeSize: .large, boldText: true)
    nonisolated static let conditions = [large, accessibility3, boldText]

    /// What is measured: a `DSText` role with a figures choice, or a token role through DSCore's `dsText(_:)`.
    nonisolated enum Sample: CustomStringConvertible, Sendable {
        case text(DSTextRole, DSTextNumeric)
        case axis

        var description: String {
            switch self {
            case let .text(role, numeric): "\(role.rawValue) (\(numeric.rawValue))"
            case .axis: "axis (DSCore route)"
            }
        }
    }

    /// Every role whose token figures are tabular, plus each metric role set to `numeric: tabular`.
    nonisolated static let tabularSamples: [Sample] = [
        .text(.data, .auto), .axis, .text(.metricXl, .tabular), .text(.metricLg, .tabular), .text(.metricMd, .tabular),
    ]

    final class WidthProbe {
        var width: CGFloat?
    }

    struct WidthReader: View {
        let probe: WidthProbe

        // Written out: a synthesized memberwise initializer of a type with a private member is private, which Swift 6.3
        // (Xcode 26.6, the CI pin) rejects at the call site.
        init(probe: WidthProbe) {
            self.probe = probe
        }

        var body: some View {
            GeometryReader { proxy in
                probe.width = proxy.size.width
                return Color.clear
            }
        }
    }

    static func content(_ digits: String, _ sample: Sample) -> AnyView {
        switch sample {
        case let .text(role, numeric): AnyView(DSText(verbatim: digits, role: role, numeric: numeric))
        case .axis: AnyView(Text(verbatim: digits).dsText(\.axis))
        }
    }

    static func width(_ digits: String, _ sample: Sample, in condition: Condition, brand: DSBrand) -> CGFloat? {
        let probe = WidthProbe()
        let view = DSTheme(brand: brand) {
            content(digits, sample)
                .fixedSize()
                .background(WidthReader(probe: probe))
        }
        .dsAccessibilityPolicy(boldText: condition.boldText, increasedContrast: false, dynamicTypeSize: condition.typeSize)
        .environment(\.dynamicTypeSize, condition.typeSize)
        .environment(\.legibilityWeight, condition.boldText ? .bold : .regular)
        .environment(\.locale, Locale(identifier: "en_US"))
        let renderer = ImageRenderer(content: view)
        renderer.scale = scale
        _ = renderer.cgImage
        return probe.width
    }

    nonisolated static let brands: [DSBrand] = [.prism, .prismNative]

    @Test(arguments: conditions, brands)
    func tabularFiguresHaveEqualWidths(_ condition: Condition, _ brand: DSBrand) throws {
        for sample in Self.tabularSamples {
            let ones = try #require(Self.width("1111", sample, in: condition, brand: brand))
            let zeros = try #require(Self.width("0000", sample, in: condition, brand: brand))
            print("DSEqualWidth \(brand.rawValue) | \(condition) | \(sample) | 1111 \(ones) | 0000 \(zeros) | Δ \(abs(ones - zeros))")
            #expect(abs(ones - zeros) <= Self.tolerance, "\(brand) \(sample) at \(condition): 1111 is \(ones) pt, 0000 is \(zeros) pt")
        }
    }

    @Test(arguments: conditions, brands)
    func proportionalFiguresDoNot(_ condition: Condition, _ brand: DSBrand) throws {
        for sample in [Sample.text(.metricXl, .auto), .text(.metricMd, .auto), .text(.data, .proportional)] {
            let ones = try #require(Self.width("1111", sample, in: condition, brand: brand))
            let zeros = try #require(Self.width("0000", sample, in: condition, brand: brand))
            print("DSEqualWidth \(brand.rawValue) | \(condition) | \(sample) | 1111 \(ones) | 0000 \(zeros) | Δ \(zeros - ones)")
            #expect(zeros - ones > Self.tolerance, "\(brand) \(sample) at \(condition): 1111 is \(ones) pt, 0000 is \(zeros) pt")
        }
    }

    /// The ink of a render: the summed alpha of its pixels over a transparent ground, in pixels of full coverage.
    static func ink(_ digits: String, _ sample: Sample, in condition: Condition, brand: DSBrand) -> Double? {
        let view = DSTheme(brand: brand) { content(digits, sample).fixedSize() }
            .dsAccessibilityPolicy(boldText: condition.boldText, increasedContrast: false, dynamicTypeSize: condition.typeSize)
            .environment(\.dynamicTypeSize, condition.typeSize)
            .environment(\.legibilityWeight, condition.boldText ? .bold : .regular)
        let renderer = ImageRenderer(content: view)
        renderer.scale = scale
        renderer.isOpaque = false
        guard let image = renderer.cgImage,
              let context = CGContext(
                  data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: 4 * image.width,
                  space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
        guard let data = context.data else { return nil }
        let bytes = data.bindMemory(to: UInt8.self, capacity: 4 * image.width * image.height)
        var sum = 0
        for pixel in 0..<(image.width * image.height) { sum += Int(bytes[4 * pixel + 3]) }
        return Double(sum) / 255
    }

    /// The size condition is really a different render, so an override that stopped reaching the text route fails here
    /// instead of passing the tests above on three copies of the Large render. accessibility3 lays the figures out
    /// wider on iOS; macOS has no Dynamic Type (Text.yaml `notes.platform.macos`), so on the host accessibility3 lays
    /// out exactly as Large and only the simulator run exercises the widening.
    @Test(arguments: brands)
    func theConditionsReachTheTextRoute(_ brand: DSBrand) throws {
        for sample in [Sample.text(.data, .auto), .axis] {
            let regular = try #require(Self.width("0000", sample, in: Self.large, brand: brand))
            let scaled = try #require(Self.width("0000", sample, in: Self.accessibility3, brand: brand))
            print("DSEqualWidth \(brand.rawValue) | \(sample) | accessibility3 \(scaled) pt vs Large \(regular) pt")
            #if os(macOS)
            #expect(scaled == regular, "\(brand) \(sample): accessibility3 \(scaled) pt, Large \(regular) pt")
            #else
            #expect(scaled > regular + Self.tolerance, "\(brand) \(sample): accessibility3 \(scaled) pt, Large \(regular) pt")
            #endif
        }
    }

    /// The Bold Text condition, the other half of the same rule: it puts more ink on the same figures. Onest's tabular
    /// figures keep their advance across weights, so a width cannot show this one and only the ink can — which makes
    /// this the single assertion of the suite that reads pixels, and on macOS, which has no Dynamic Type, the only
    /// evidence that a forced condition reaches the text route at all.
    ///
    /// It therefore stays on the host rather than moving to the simulator with the other pixel suites, and asks
    /// `DSRenderCapability` first: a `swift test` run whose Colors.xcassets is uncompiled renders both runs
    /// transparent, and `0 > 0 * 1.1` is a failure that says nothing about the weight. Such a run skips here, naming
    /// where the check really runs, instead of failing for the environment or passing on two empty images.
    @Test(.enabled(DSRenderCapability.unavailableComment, { await DSRenderCapability.rasterizes }), arguments: brands)
    func boldTextReachesTheTextRoute(_ brand: DSBrand) throws {
        for sample in [Sample.text(.data, .auto), .axis] {
            let regularInk = try #require(Self.ink("0000", sample, in: Self.large, brand: brand))
            let boldInk = try #require(Self.ink("0000", sample, in: Self.boldText, brand: brand))
            print("DSEqualWidth \(brand.rawValue) | \(sample) | ink Bold Text \(boldInk) vs Large \(regularInk)")
            #expect(boldInk > regularInk * 1.1, "\(brand) \(sample): Bold Text ink \(boldInk), Large ink \(regularInk)")
        }
    }
}
