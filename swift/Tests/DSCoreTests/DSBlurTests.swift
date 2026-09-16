import CoreGraphics
import Foundation
import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0030 §4.3, the P3-1 verify item: does SwiftUI `.blur(radius: r)` render the Gaussian standard deviation
/// that CSS `filter: blur(r px)` does, so the vivid bloom's 75 matches on both stacks?
///
/// The measurement, which runs on the macOS host and on the iOS and watchOS simulators:
///  * the blurred step is an overlay far larger than the rendered image in both axes, so the image shows only the
///    interior — a blur bleeds transparency in from the content's own edges, and an opaque render composites that
///    over black;
///  * the two sides differ by 0.08 only, so the result does not depend on whether SwiftUI blurs in gamma-encoded
///    or in linear light: over so short a span the two differ by a scale factor, which the normalisation removes;
///  * every column is the mean of the full height, which averages out SwiftUI's dither;
///  * the width is read three ways — the second moment of the step's derivative, and the 10 %/90 % and 25 %/75 %
///    crossings, which for a Gaussian are 2.563 σ and 1.349 σ apart.
@MainActor
@Suite("Blur radius (ADR-0030 §4.3)", .serialized)
struct DSBlurTests {
    static let height = 160
    static let low = 0.46
    static let high = 0.54

    /// The window is twelve radii wide, so both plateaus sit at least five standard deviations from the step and
    /// the crossings are read off an untruncated edge.
    static func windowWidth(radius: CGFloat) -> Int { max(600, Int(radius) * 12) }

    static func profile(radius: CGFloat) -> [Double]? {
        let width = windowWidth(radius: radius)
        let half = CGFloat(width) * 2
        let step = HStack(spacing: 0) {
            Rectangle().fill(Color(.sRGB, white: low)).frame(width: half)
            Rectangle().fill(Color(.sRGB, white: high)).frame(width: half)
        }
        .frame(width: half * 2, height: half)
        let view = Color(.sRGB, white: low)
            .frame(width: CGFloat(width), height: CGFloat(height))
            .overlay { step.blur(radius: radius) }
        guard let bitmap = RenderProbe.render(view) else { return nil }
        return (0..<width).map { x in
            (0..<bitmap.height).reduce(0.0) { $0 + bitmap.at(x, $1).r } / Double(bitmap.height)
        }
    }

    /// The three readings of the standard deviation, in points.
    static func standardDeviations(radius: CGFloat) throws -> (moment: Double, crossing1090: Double, crossing2575: Double) {
        let width = windowWidth(radius: radius)
        let raw = try #require(profile(radius: radius))
        let lo = raw[2], hi = raw[width - 3]
        #expect(abs(lo - low) < 0.004 && abs(hi - high) < 0.004, "the plateaus are contaminated: \(lo), \(hi)")
        let norm = raw.map { ($0 - lo) / (hi - lo) }

        var mass = 0.0, mean = 0.0
        var kernel: [(x: Double, d: Double)] = []
        for x in 1..<width {
            let d = norm[x] - norm[x - 1]
            kernel.append((Double(x) - 0.5, d))
            mass += d
            mean += d * (Double(x) - 0.5)
        }
        mean /= mass
        let variance = kernel.reduce(0.0) { $0 + $1.d * ($1.x - mean) * ($1.x - mean) } / mass

        func crossing(_ level: Double) -> Double {
            var last = Double.nan
            for x in 1..<width where norm[x - 1] < level && norm[x] >= level {
                last = Double(x - 1) + (level - norm[x - 1]) / (norm[x] - norm[x - 1])
            }
            return last
        }
        return (variance.squareRoot(), (crossing(0.9) - crossing(0.1)) / 2.563, (crossing(0.75) - crossing(0.25)) / 1.349)
    }

    /// The measurement itself is sound: an unblurred step lands where the geometry says, so the widths below are
    /// in points and not in some scaled unit.
    @Test func theMeasurementGeometryIsUnscaled() throws {
        let width = Self.windowWidth(radius: 0)
        let raw = try #require(Self.profile(radius: 0))
        let edge = (0..<width).first { raw[$0] > (Self.low + Self.high) / 2 }
        #expect(edge == width / 2, "the unblurred step is at \(String(describing: edge)), expected \(width / 2)")
    }

    /// The verify item's answer: SwiftUI's radius is *not* the CSS standard deviation; it renders about 0.90 of
    /// it, so DSCore scales the token value (ADR-0030 §4.3).
    @Test(arguments: [8.0, 16.0, 20.0, 32.0, 75.0] as [CGFloat])
    func swiftUIRadiusIsNotTheCSSStandardDeviation(radius: CGFloat) throws {
        let measured = try Self.standardDeviations(radius: radius)
        for reading in [measured.moment, measured.crossing1090, measured.crossing2575] {
            let ratio = reading / Double(radius)
            #expect(
                abs(ratio - Double(DSBlur.standardDeviationPerRadius)) <= 0.06,
                "radius \(radius): sigma/radius \(ratio), pinned \(DSBlur.standardDeviationPerRadius)"
            )
        }
        // The claim that makes the scaling necessary: 1.0 is outside what the three readings allow.
        #expect(measured.crossing2575 / Double(radius) < 0.97, "SwiftUI's radius may be the CSS standard deviation after all")
    }

    /// Scaling a CSS standard deviation through `DSBlur` renders that standard deviation.
    @Test func theScaledRadiusRendersTheCSSStandardDeviation() throws {
        for cssValue in [20.0, 32.0] as [CGFloat] {
            let measured = try Self.standardDeviations(radius: DSBlur.radius(cssStandardDeviation: cssValue))
            #expect(abs(measured.crossing2575 - Double(cssValue)) <= 0.08 * Double(cssValue),
                    "CSS \(cssValue) rendered as sigma \(measured.crossing2575)")
        }
    }

    @Test func theConversionRoundTrips() {
        #expect(abs(DSBlur.standardDeviation(radius: DSBlur.radius(cssStandardDeviation: 75)) - 75) < 1e-9)
        #expect(DSBlur.radius(cssStandardDeviation: 75) > 75, "a CSS standard deviation needs a larger SwiftUI radius")
    }

    /// The recipes carry CSS standard deviations, and a Surface passes `blurRadius` to SwiftUI (ADR-0022 §2.1).
    @Test func everyGlassRecipeExposesItsSwiftUIRadius() {
        for scheme in [DSColorScheme.light, .dark] {
            let material = DSTokenSet(DSTokenContext(colorScheme: scheme)).material
            for appearance in DSGlassAppearance.allCases {
                let recipe = appearance.recipe(material)
                #expect(recipe.blur > 0, "\(scheme) \(appearance) has no blur")
                #expect(abs(recipe.blurRadius - DSBlur.radius(cssStandardDeviation: recipe.blur)) < 1e-12)
                #expect(recipe.blurRadius > recipe.blur)
            }
        }
    }
}
