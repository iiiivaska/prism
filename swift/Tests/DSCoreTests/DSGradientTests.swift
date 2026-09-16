import CoreGraphics
import Foundation
import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0022 rule 7, the Apple half: "the start and end points match the CSS gradient line at the twelve V2
/// geometries", and ARCHITECTURE §16.1 V14, the interpolation space.
///
/// The reference is `tools/contrast/gradient.ts`. `gradientT`, `headerBlock` and `headerInterval` below are
/// transcriptions of `gradient.ts:103-146`; the test drives DSCore's `UnitPoint` conversion through them, so a
/// change on either side shows up here.
@MainActor
@Suite("Vivid gradients (ADR-0022 §4.1, ARCHITECTURE §16.1)", .serialized)
struct DSGradientTests {
    // MARK: - The reference, transcribed from tools/contrast/gradient.ts

    /// `gradientT(x, y, width, height, angle)` (`gradient.ts:103-108`).
    static func gradientT(_ x: Double, _ y: Double, _ width: Double, _ height: Double, _ angle: Double) -> Double {
        let radians = angle * .pi / 180
        let sine = sin(radians)
        let cosine = cos(radians)
        return 0.5 + ((x - width / 2) * sine - (y - height / 2) * cosine) / (abs(width * sine) + abs(height * cosine))
    }

    /// `CARD_SIZES` (`gradient.ts:111`).
    static let cardSizes: [(width: Double, height: Double)] = [(166, 166), (240, 240), (320, 200), (180, 240)]
    /// `HEADER_GAP_PX` and `HEADER_HEIGHT_PX` (`gradient.ts:113-115`).
    static let headerGap: Double = 16
    static let headerHeight: Double = 64

    struct Geometry {
        let width: Double
        let height: Double
        let padding: Double
        let action: Double
        let density: DSDensity
    }

    /// `cardGeometries` (`gradient.ts:173-183`): every Card size with the padding and action size of every
    /// density. ADR-0022 §4.1 names three densities, which is its "twelve geometries"; ADR-0029 §3.2 added
    /// `watch`, and `gradient.ts` walks every density the resolver has, so this walks all four.
    static var geometries: [Geometry] {
        var out: [Geometry] = []
        for density in DSDensity.allCases {
            let tokens = DSTokenSet(DSTokenContext(density: density))
            for size in cardSizes {
                out.append(
                    Geometry(
                        width: size.width,
                        height: size.height,
                        padding: Double(tokens.space.cardPadding),
                        action: Double(tokens.size.controlMd),
                        density: density
                    )
                )
            }
        }
        return out
    }

    /// `headerBlock` (`gradient.ts:133-139`): x from p to W − p − a − 16, y from p to p + 64.
    static func headerBlock(_ g: Geometry) -> (x0: Double, x1: Double, y0: Double, y1: Double) {
        (g.padding, g.width - g.padding - g.action - headerGap, g.padding, g.padding + headerHeight)
    }

    /// `headerInterval` (`gradient.ts:142-146`).
    static func headerInterval(_ g: Geometry, angle: Double) -> (Double, Double) {
        let b = headerBlock(g)
        let ts = [(b.x0, b.y0), (b.x1, b.y0), (b.x0, b.y1), (b.x1, b.y1)].map {
            gradientT($0.0, $0.1, g.width, g.height, angle)
        }
        return (ts.min() ?? 0, ts.max() ?? 0)
    }

    /// Every angle the seeded gradients use, plus the axis-aligned and diagonal ones CSS names.
    static var angles: [Double] {
        var out: Set<Double> = [0, 45, 90, 135, 180, 225, 270, 315, 360, DSGradientGeometry.defaultAngle]
        for scheme in [DSColorScheme.light, .dark] {
            let gradients = DSTokenSet(DSTokenContext(colorScheme: scheme)).gradient
            for slot in DSVividSlot.allCases { out.insert(slot.gradient(gradients).angle) }
        }
        return out.sorted()
    }

    /// The position of a point on the line SwiftUI actually draws, from the two `UnitPoint`s: the projection of
    /// the point onto the start → end vector, in points.
    static func positionFromUnitPoints(
        _ points: (start: UnitPoint, end: UnitPoint),
        x: Double,
        y: Double,
        width: Double,
        height: Double
    ) -> Double {
        let sx = points.start.x * width, sy = points.start.y * height
        let ex = points.end.x * width, ey = points.end.y * height
        let dx = ex - sx, dy = ey - sy
        return ((x - sx) * dx + (y - sy) * dy) / (dx * dx + dy * dy)
    }

    // MARK: - ADR-0022 rule 7: the start and end points are the CSS gradient line

    @Test func theUnitPointsAreTheCSSGradientLineAtEveryV2Geometry() {
        var checked = 0
        for geometry in Self.geometries {
            let block = Self.headerBlock(geometry)
            #expect(block.x1 > block.x0 && block.y1 <= geometry.height, "the header block does not fit \(geometry)")
            for angle in Self.angles {
                let points = DSGradientGeometry.unitPoints(
                    angle: angle,
                    size: CGSize(width: geometry.width, height: geometry.height)
                )
                let probes: [(Double, Double)] = [
                    (block.x0, block.y0), (block.x1, block.y0), (block.x0, block.y1), (block.x1, block.y1),
                    (0, 0), (geometry.width, 0), (0, geometry.height), (geometry.width, geometry.height),
                    (geometry.width / 2, geometry.height / 2),
                ]
                for (x, y) in probes {
                    let want = Self.gradientT(x, y, geometry.width, geometry.height, angle)
                    let got = Self.positionFromUnitPoints(points, x: x, y: y, width: geometry.width, height: geometry.height)
                    #expect(abs(got - want) < 1e-9, "t at (\(x), \(y)) of \(geometry.width)×\(geometry.height) at \(angle)°: \(got) vs \(want)")
                    checked += 1
                }
            }
        }
        #expect(checked == Self.geometries.count * Self.angles.count * 9)
        #expect(Self.geometries.count == 16, "four Card sizes by four densities; ADR-0022 §4.1's twelve plus watch")
    }

    /// DSCore's own `position(x:y:...)` is the same function, so `headerInterval` can be computed on Apple.
    @Test func positionMatchesGradientT() {
        for geometry in Self.geometries.prefix(4) {
            for angle in Self.angles {
                let interval = Self.headerInterval(geometry, angle: angle)
                let block = Self.headerBlock(geometry)
                let corners = [(block.x0, block.y0), (block.x1, block.y0), (block.x0, block.y1), (block.x1, block.y1)]
                let ts = corners.map {
                    DSGradientGeometry.position(
                        x: $0.0, y: $0.1,
                        width: geometry.width, height: geometry.height, angle: angle
                    )
                }
                #expect(abs((ts.min() ?? 0) - interval.0) < 1e-12)
                #expect(abs((ts.max() ?? 0) - interval.1) < 1e-12)
            }
        }
    }

    /// The CSS keyword directions, spelled out: 0° up, 90° right, 180° down (the default), 270° left.
    @Test func theCSSKeywordDirections() {
        let size = CGSize(width: 200, height: 100)
        let cases: [(Double, UnitPoint, UnitPoint)] = [
            (0, .bottom, .top),
            (90, .leading, .trailing),
            (180, .top, .bottom),
            (270, .trailing, .leading),
        ]
        for (angle, start, end) in cases {
            let points = DSGradientGeometry.unitPoints(angle: angle, size: size)
            #expect(abs(points.start.x - start.x) < 1e-12 && abs(points.start.y - start.y) < 1e-12, "\(angle)° start \(points.start)")
            #expect(abs(points.end.x - end.x) < 1e-12 && abs(points.end.y - end.y) < 1e-12, "\(angle)° end \(points.end)")
        }
        #expect(DSGradientGeometry.defaultAngle == 180, "CSS linear-gradient without an angle points to the bottom")
        // A box with no area still paints top to bottom rather than dividing by zero.
        let degenerate = DSGradientGeometry.unitPoints(angle: 45, size: .zero)
        #expect(degenerate.start == .top && degenerate.end == .bottom)
    }

    @Test func theGradientLineLengthIsTheCSSOne() {
        #expect(abs(DSGradientGeometry.lineLength(angle: 90, width: 320, height: 200) - 320) < 1e-9)
        #expect(abs(DSGradientGeometry.lineLength(angle: 180, width: 320, height: 200) - 200) < 1e-9)
        // 45° on a square: |W sin| + |H cos| = √2 × side.
        #expect(abs(DSGradientGeometry.lineLength(angle: 45, width: 100, height: 100) - 100 * 2.0.squareRoot()) < 1e-9)
    }

    // MARK: - ARCHITECTURE §16.1 V14: the interpolation space

    /// SwiftUI dithers a gradient, so every sample is the mean of a column, which leaves the interpolation.
    static func worstDelta(
        _ bitmap: RenderProbe.Bitmap,
        from: (Double, Double, Double),
        to: (Double, Double, Double),
        mix: ((Double, Double, Double), (Double, Double, Double), Double) -> (Double, Double, Double)
    ) -> Double {
        var worst = 0.0
        for x in stride(from: 4, to: bitmap.width - 4, by: 4) {
            let f = (Double(x) + 0.5) / Double(bitmap.width)
            let got = bitmap.columnMean(x)
            let want = mix(from, to, f)
            worst = max(worst, max(abs(got.0 - want.0), max(abs(got.1 - want.1), abs(got.2 - want.2))))
        }
        return worst
    }

    static func renderTwoStop(_ a: (Double, Double, Double), _ b: (Double, Double, Double), space: SwiftUI.Gradient.ColorSpace) -> RenderProbe.Bitmap? {
        let gradient = SwiftUI.Gradient(colors: [
            Color(.sRGB, red: a.0, green: a.1, blue: a.2),
            Color(.sRGB, red: b.0, green: b.1, blue: b.2),
        ]).colorSpace(space)
        let view = Rectangle()
            .fill(.linearGradient(gradient, startPoint: .leading, endPoint: .trailing))
            .frame(width: 257, height: 32)
        return RenderProbe.render(view)
    }

    /// V14: `Gradient.ColorSpace.perceptual` is OKLab — the space `tokens.css` writes (`in oklab`) and
    /// `tools/contrast/gradient.ts` samples in. The counter-candidates, gamma-encoded sRGB and linear light,
    /// are off by an order of magnitude more, which is what makes this a decision and not a coincidence.
    @Test func perceptualIsOKLab() throws {
        let a = (0.1106, 0.0726, 0.1442)
        let b = (0.4472, 0.4961, 0.7635)
        let bitmap = try #require(Self.renderTwoStop(a, b, space: .perceptual))
        let okLab = Self.worstDelta(bitmap, from: a, to: b, mix: OKLab.mix)
        let srgb = Self.worstDelta(bitmap, from: a, to: b, mix: OKLab.mixSRGB)
        let linear = Self.worstDelta(bitmap, from: a, to: b, mix: OKLab.mixLinear)
        #expect(okLab <= 1.0 / 255, "perceptual is \(okLab * 255)/255 from OKLab")
        #expect(srgb > 3.0 / 255 && linear > 3.0 / 255, "the counter-candidates are not distinguishable here")
    }

    /// The other half of V14: `.device` is gamma-encoded sRGB, so DSCore must not leave it at SwiftUI's default.
    @Test func deviceIsGammaEncodedSRGB() throws {
        let a = (0.1106, 0.0726, 0.1442)
        let b = (0.4472, 0.4961, 0.7635)
        let bitmap = try #require(Self.renderTwoStop(a, b, space: .device))
        #expect(Self.worstDelta(bitmap, from: a, to: b, mix: OKLab.mixSRGB) <= 1.0 / 255)
        #expect(Self.worstDelta(bitmap, from: a, to: b, mix: OKLab.mix) > 3.0 / 255)
    }

    /// The stop's color as sRGB numbers, which is what an sRGB render can paint: the authored Display P3 value
    /// through the D65 matrix (ARCHITECTURE §7.2).
    static func srgbStop(_ stop: DSGradientStop) -> (Double, Double, Double) {
        let raw = (stop.color.red, stop.color.green, stop.color.blue)
        return stop.color.space == .displayP3 ? OKLab.p3ToSRGB(raw) : raw
    }

    /// `colorAt(stops, t, "oklab")` of `tools/contrast/gradient.ts:83-96`, over the sRGB stop colors.
    static func colorAt(_ stops: [DSGradientStop], _ t: Double) -> (Double, Double, Double) {
        guard let first = stops.first, let last = stops.last else { return (0, 0, 0) }
        if t <= first.location { return srgbStop(first) }
        for i in 0..<(stops.count - 1) where t <= stops[i + 1].location {
            let low = stops[i].location
            let high = stops[i + 1].location
            guard high > low else { return srgbStop(stops[i + 1]) }
            return OKLab.mix(srgbStop(stops[i]), srgbStop(stops[i + 1]), (t - low) / (high - low))
        }
        return srgbStop(last)
    }

    /// DSCore's OKLab, which goes through XYZ so that it can keep a Display P3 stop in Display P3, agrees with
    /// the reference implementation `tools/contrast/gradient.ts` uses (Color.js, the direct sRGB matrices).
    @Test func theOKLabMixAgreesWithTheReference() {
        let pairs: [((Double, Double, Double), (Double, Double, Double))] = [
            ((0.1106, 0.0726, 0.1442), (0.4472, 0.4961, 0.7635)),
            ((0.0499, 0.0915, 0.1277), (0.3097, 0.5894, 0.5657)),
            ((1, 1, 1), (0, 0, 0)),
            ((0.7483, 0.4872, 0.6973), (0.2918, 0.2978, 0.4582)),
        ]
        for (a, b) in pairs {
            for step in 0...10 {
                let f = Double(step) / 10
                let got = DSColorMath.mix(
                    DSRGBA(.sRGB, a.0, a.1, a.2, 1),
                    DSRGBA(.sRGB, b.0, b.1, b.2, 1),
                    f
                )
                let want = OKLab.mix(a, b, f)
                let d = max(abs(got.red - want.0), max(abs(got.green - want.1), abs(got.blue - want.2)))
                // 5e-4 is 0.13/255, a tenth of what an 8-bit render can show: the two published matrix sets
                // (Ottosson's direct sRGB → LMS, and the XYZ route DSCore takes so that it can keep a
                // Display P3 stop in Display P3) are rounded to different digits, and that is the whole gap.
                #expect(d < 5e-4, "f \(f): (\(got.red), \(got.green), \(got.blue)) vs \(want), delta \(d)")
            }
        }
    }

    /// A mix keeps the space of its stops, so a Display P3 gradient is never clipped into sRGB on the way
    /// through, and the round trip through OKLab is lossless.
    @Test func theMixKeepsTheStopsColorSpace() {
        let a = DSRGBA(.displayP3, 0.0499, 0.0915, 0.1277, 1)
        let b = DSRGBA(.displayP3, 0.3097, 0.5894, 0.5657, 1)
        #expect(DSColorMath.mix(a, b, 0.5).space == .displayP3)
        #expect(DSColorMath.mix(a, b, 0) == a)
        #expect(DSColorMath.mix(a, b, 1) == b)
        // 1e-4 is 0.026/255: the published forward and inverse matrices are rounded to ten digits, so a round
        // trip cannot be exact, and a dark channel sits on the steep part of the transfer function.
        let roundTrip = DSColorMath.color(DSColorMath.oklab(a), space: .displayP3, alpha: 1)
        #expect(abs(roundTrip.red - a.red) < 1e-4 && abs(roundTrip.green - a.green) < 1e-4 && abs(roundTrip.blue - a.blue) < 1e-4,
                "round trip (\(roundTrip.red), \(roundTrip.green), \(roundTrip.blue))")
        // Alpha rides along linearly, as CSS interpolates it.
        let translucent = DSColorMath.mix(DSRGBA(.sRGB, 0, 0, 0, 0), DSRGBA(.sRGB, 0, 0, 0, 1), 0.25)
        #expect(abs(translucent.alpha - 0.25) < 1e-12)
    }

    /// The resampled stop list: every authored stop is still there, in order, with interior points between them.
    @Test func theResampledStopsKeepTheAuthoredOnes() {
        let token = DSTokenSet(DSTokenContext(colorScheme: .dark)).gradient.vividDefault
        let stops = DSGradient.stops(token)
        let locations = stops.map(\.location)
        #expect(locations == locations.sorted())
        for authored in token.stops {
            #expect(locations.contains { abs($0 - authored.location) < 1e-12 }, "authored stop \(authored.location) is missing")
        }
        #expect(stops.count == token.stops.count + (token.stops.count - 1) * DSGradient.samplesPerSegment)
    }

    /// Every seeded vivid gradient, drawn by DSCore and rendered with `ImageRenderer`, interpolates in OKLab
    /// within 1/255 per channel in an sRGB render (P3-1 acceptance, ADR-0022 §4.1, ARCHITECTURE §16.1 V14).
    ///
    /// The expected color at t is `colorAt(stops, t, "oklab")` of `tools/contrast/gradient.ts`. Interpolating in
    /// OKLab does not depend on the encoding, so converting the authored Display P3 stops to sRGB first and
    /// mixing is the same operation the renderer performs on the P3 values; the one place the two can differ is
    /// the sRGB gamut boundary, which an sRGB render clips and CSS gamut-maps (ARCHITECTURE §7.2), so the
    /// expectation is clipped the way the render is and the samples that touches are counted.
    ///
    /// Each sample is the mean of a 128 pt column at a pixel centre, which averages out SwiftUI's gradient
    /// dither (visible as ±2/255 of row-to-row spread on a dark channel).
    @Test func everySeededGradientInterpolatesInOKLab() throws {
        let width = 401
        var checked = 0
        var clipped = 0
        for scheme in [DSColorScheme.light, .dark] {
            let gradients = DSTokenSet(DSTokenContext(colorScheme: scheme)).gradient
            for slot in DSVividSlot.allCases {
                let token = slot.gradient(gradients)
                // Drawn left to right, so t is the pixel centre over the width: the angle conversion is checked
                // above, on its own.
                let view = Rectangle()
                    .fill(.linearGradient(DSGradient.gradient(token), startPoint: .leading, endPoint: .trailing))
                    .frame(width: CGFloat(width), height: 128)
                let bitmap = try #require(RenderProbe.render(view))
                var worst = 0.0
                var worstAt = 0.0
                for x in stride(from: 2, to: width - 2, by: 3) {
                    let t = (Double(x) + 0.5) / Double(width)
                    let raw = Self.colorAt(token.stops, t)
                    if raw.0 < 0 || raw.0 > 1 || raw.1 < 0 || raw.1 > 1 || raw.2 < 0 || raw.2 > 1 { clipped += 1 }
                    let want = (min(1, max(0, raw.0)), min(1, max(0, raw.1)), min(1, max(0, raw.2)))
                    let got = bitmap.columnMean(x)
                    let delta = max(abs(got.0 - want.0), max(abs(got.1 - want.1), abs(got.2 - want.2)))
                    if delta > worst { worst = delta; worstAt = t }
                    checked += 1
                }
                #expect(worst <= 1.0 / 255, "\(scheme) \(slot): worst \(worst * 255)/255 at t \(worstAt)")
            }
        }
        #expect(checked > 1000, "the sample walked \(checked) points")
        // Recorded, not asserted away: these are the samples where an sRGB render clips and CSS gamut-maps.
        #expect(clipped * 20 < checked, "\(clipped) of \(checked) samples leave the sRGB gamut")
    }
}
