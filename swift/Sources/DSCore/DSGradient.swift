import Foundation
import SwiftUI
import DSTokens

/// The CSS gradient line on Apple (ADR-0022 §4.1, ARCHITECTURE §7.9, §16.1).
///
/// A `DSGradientToken` carries `angle` in degrees with CSS semantics: 0° points up, 90° right. SwiftUI draws a
/// linear gradient between two `UnitPoint`s instead, so DSCore converts one into the other for the surface's own
/// size. Both stacks then paint the same color at the same place, which is what ADR-0022 §4.1's V2 header check
/// depends on.
///
/// The conversion is the inverse of `tools/contrast/gradient.ts`'s `gradientT`:
///
///     t(x, y) = ½ + ((x − W/2)·sin θ − (y − H/2)·cos θ) / (|W·sin θ| + |H·cos θ|)
///
/// so the gradient line runs through the box centre along `u = (sin θ, −cos θ)` (y down) and its length is
/// `L = |W·sin θ| + |H·cos θ|`, the CSS gradient-line length. `t = 0` sits at `centre − L/2 · u` and `t = 1` at
/// `centre + L/2 · u`.
nonisolated public enum DSGradientGeometry: Sendable {
    /// CSS `linear-gradient` without an angle points to the bottom (`tools/contrast/gradient.ts`).
    public static let defaultAngle: Double = 180

    /// The length of the CSS gradient line of a `width × height` box at `angle` degrees.
    public static func lineLength(angle: Double, width: CGFloat, height: CGFloat) -> CGFloat {
        let radians = angle * .pi / 180
        return abs(width * CGFloat(sin(radians))) + abs(height * CGFloat(cos(radians)))
    }

    /// Position t of the point (x, y), y running down, on the CSS gradient line: 0 at the first stop's end, 1 at
    /// the last stop's. The Swift twin of `gradientT`.
    public static func position(
        x: CGFloat,
        y: CGFloat,
        width: CGFloat,
        height: CGFloat,
        angle: Double
    ) -> Double {
        let radians = angle * .pi / 180
        let sine = CGFloat(sin(radians))
        let cosine = CGFloat(cos(radians))
        let length = abs(width * sine) + abs(height * cosine)
        guard length > 0 else { return 0.5 }
        return 0.5 + Double(((x - width / 2) * sine - (y - height / 2) * cosine) / length)
    }

    /// The `UnitPoint` pair SwiftUI draws the CSS gradient line with, for a box of this size.
    ///
    /// A box with no area has no gradient line; it takes the CSS default direction (top to bottom) so that a
    /// surface still paints its first and last stop the right way round while it is being measured.
    public static func unitPoints(angle: Double, size: CGSize) -> (start: UnitPoint, end: UnitPoint) {
        guard size.width > 0, size.height > 0 else { return (.top, .bottom) }
        let radians = angle * .pi / 180
        let sine = CGFloat(sin(radians))
        let cosine = CGFloat(cos(radians))
        let half = (abs(size.width * sine) + abs(size.height * cosine)) / 2
        let dx = Double(half * sine / size.width)
        let dy = Double(half * cosine / size.height)
        return (
            start: UnitPoint(x: 0.5 - dx, y: 0.5 + dy),
            end: UnitPoint(x: 0.5 + dx, y: 0.5 - dy)
        )
    }
}

/// OKLab over the two literal color spaces a token can carry (ARCHITECTURE §7.2, §7.9).
///
/// A gradient is interpolated in OKLab on both stacks. A mix keeps the space of the stops it came from, so a
/// Display P3 gradient stays in Display P3 and nothing is clipped on the way through.
nonisolated enum DSColorMath: Sendable {
    typealias Triple = (Double, Double, Double)

    /// The sRGB transfer function, which Display P3 shares. Extended through zero, so an out-of-gamut channel
    /// survives the round trip instead of being clipped early.
    static func linear(_ c: Double) -> Double {
        let a = abs(c)
        let v = a <= 0.04045 ? a / 12.92 : pow((a + 0.055) / 1.055, 2.4)
        return c < 0 ? -v : v
    }

    static func gamma(_ c: Double) -> Double {
        let a = abs(c)
        let v = a <= 0.0031308 ? a * 12.92 : 1.055 * pow(a, 1 / 2.4) - 0.055
        return c < 0 ? -v : v
    }

    private static func apply(_ m: (Triple, Triple, Triple), _ v: Triple) -> Triple {
        (
            m.0.0 * v.0 + m.0.1 * v.1 + m.0.2 * v.2,
            m.1.0 * v.0 + m.1.1 * v.1 + m.1.2 * v.2,
            m.2.0 * v.0 + m.2.1 * v.1 + m.2.2 * v.2
        )
    }

    // Linear RGB ↔ XYZ, D65.
    private static let sRGBToXYZ: (Triple, Triple, Triple) = (
        (0.4123907993, 0.3575843394, 0.1804807884),
        (0.2126390059, 0.7151686788, 0.0721923154),
        (0.0193308187, 0.1191947798, 0.9505321522)
    )
    private static let xyzToSRGB: (Triple, Triple, Triple) = (
        (3.2409699419, -1.5373831776, -0.4986107603),
        (-0.9692436363, 1.8759675015, 0.0415550574),
        (0.0556300797, -0.2039769589, 1.0569715142)
    )
    private static let p3ToXYZ: (Triple, Triple, Triple) = (
        (0.4865709486, 0.2656676932, 0.1982172852),
        (0.2289745641, 0.6917385218, 0.0792869141),
        (0.0000000000, 0.0451133819, 1.0439443689)
    )
    private static let xyzToP3: (Triple, Triple, Triple) = (
        (2.4934969119, -0.9313836179, -0.4027107845),
        (-0.8294889696, 1.7626640603, 0.0236246858),
        (0.0358458302, -0.0761723893, 0.9568845240)
    )

    // XYZ ↔ OKLab (Björn Ottosson's M1 and M2).
    private static let xyzToLMS: (Triple, Triple, Triple) = (
        (0.8189330101, 0.3618667424, -0.1288597137),
        (0.0329845436, 0.9293118715, 0.0361456387),
        (0.0482003018, 0.2643662691, 0.6338517070)
    )
    private static let lmsToXYZ: (Triple, Triple, Triple) = (
        (1.2268798758, -0.5578149944, 0.2813910456),
        (-0.0405757452, 1.1122868032, -0.0717110580),
        (-0.0763729367, -0.4214933324, 1.5869240198)
    )
    private static let lmsToLab: (Triple, Triple, Triple) = (
        (0.2104542553, 0.7936177850, -0.0040720468),
        (1.9779984951, -2.4285922050, 0.4505937099),
        (0.0259040371, 0.7827717662, -0.8086757660)
    )
    private static let labToLMS: (Triple, Triple, Triple) = (
        (1, 0.3963377774, 0.2158037573),
        (1, -0.1055613458, -0.0638541728),
        (1, -0.0894841775, -1.2914855480)
    )

    static func oklab(_ color: DSRGBA) -> Triple {
        let rgb = (linear(color.red), linear(color.green), linear(color.blue))
        let xyz = apply(color.space == .displayP3 ? p3ToXYZ : sRGBToXYZ, rgb)
        let lms = apply(xyzToLMS, xyz)
        return apply(lmsToLab, (cbrt(lms.0), cbrt(lms.1), cbrt(lms.2)))
    }

    static func color(_ lab: Triple, space: DSColorSpace, alpha: Double) -> DSRGBA {
        let lms = apply(labToLMS, lab)
        let xyz = apply(lmsToXYZ, (lms.0 * lms.0 * lms.0, lms.1 * lms.1 * lms.1, lms.2 * lms.2 * lms.2))
        let rgb = apply(space == .displayP3 ? xyzToP3 : xyzToSRGB, xyz)
        return DSRGBA(space, gamma(rgb.0), gamma(rgb.1), gamma(rgb.2), alpha)
    }

    /// The color at fraction `f` between two stops, interpolated in OKLab: the Swift twin of
    /// `mix(a, b, f, "oklab")` in `tools/contrast/gradient.ts`. Two stops of different spaces mix in sRGB, the
    /// space that can carry either.
    static func mix(_ a: DSRGBA, _ b: DSRGBA, _ f: Double) -> DSRGBA {
        if f <= 0 { return a }
        if f >= 1 { return b }
        let la = oklab(a)
        let lb = oklab(b)
        let lab = (la.0 + (lb.0 - la.0) * f, la.1 + (lb.1 - la.1) * f, la.2 + (lb.2 - la.2) * f)
        return color(lab, space: a.space == b.space ? a.space : .sRGB, alpha: a.alpha + (b.alpha - a.alpha) * f)
    }
}

/// A vivid gradient, drawn the way `tokens.css` writes it (ARCHITECTURE §7.9, ADR-0022 §4.1).
///
/// **Interpolation (ARCHITECTURE §16.1 V14, settled 2026-09-16).** The web writes `in oklab`. SwiftUI's
/// `Gradient.ColorSpace.perceptual` *is* OKLab — `DSGradientTests.perceptualIsOKLab` renders one with
/// `ImageRenderer` and finds it 0.7/255 from OKLab while gamma-encoded sRGB is 5/255 and linear light 37/255
/// away — but an 8-bit render of it drifts up to 2.4/255 from the OKLab samples on the seeded gradients, above
/// the 1/255 the P3-1 acceptance asks for. DSCore therefore takes the documented fallback: it resamples each
/// authored segment in OKLab and hands SwiftUI stops close enough together that `.device`'s gamma-encoded lerp
/// between them is invisible. `DSGradientTests.everySeededGradientInterpolatesInOKLab` holds it to 1/255.
nonisolated public enum DSGradient: Sendable {
    /// Interior samples per authored segment. A segment is at most 1.0 wide, so the widest `.device` step is
    /// 1/16 of it, which `everySeededGradientInterpolatesInOKLab` measures at well under 1/255.
    public static let samplesPerSegment = 16

    /// The token's stops, resampled in OKLab (ARCHITECTURE §7.9), ready for `ShapeStyle.linearGradient`.
    public static func gradient(_ token: DSGradientToken) -> AnyGradient {
        SwiftUI.Gradient(stops: stops(token)).colorSpace(.device)
    }

    /// The resampled stops: every authored stop, plus `samplesPerSegment` interior points per segment of
    /// non-zero length, each the OKLab mix of the segment's ends.
    public static func stops(_ token: DSGradientToken) -> [SwiftUI.Gradient.Stop] {
        guard let first = token.stops.first else { return [] }
        var out: [SwiftUI.Gradient.Stop] = [.init(color: first.color.color, location: first.location)]
        for index in 0..<max(0, token.stops.count - 1) {
            let low = token.stops[index]
            let high = token.stops[index + 1]
            let span = high.location - low.location
            if span > 0 {
                for step in 1...samplesPerSegment {
                    let f = Double(step) / Double(samplesPerSegment + 1)
                    out.append(
                        .init(
                            color: DSColorMath.mix(low.color, high.color, f).color,
                            location: low.location + span * f
                        )
                    )
                }
            }
            out.append(.init(color: high.color.color, location: high.location))
        }
        return out
    }

    /// The fill for a surface of this size: the token's stops along its CSS gradient line.
    public static func fill(_ token: DSGradientToken, size: CGSize) -> some ShapeStyle {
        let points = DSGradientGeometry.unitPoints(angle: token.angle, size: size)
        return AnyShapeStyle(.linearGradient(gradient(token), startPoint: points.start, endPoint: points.end))
    }
}
