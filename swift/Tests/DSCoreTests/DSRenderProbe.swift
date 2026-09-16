import CoreGraphics
import Foundation
import SwiftUI

/// Pixel readback for the rendering checks of ADR-0021 rule 7, ADR-0022 rule 7 and ADR-0030 rule 9.
///
/// Every view is rendered with `ImageRenderer` and read back through an sRGB bitmap context, so the numbers are
/// the same on the macOS host and on the iOS and watchOS simulators.
enum RenderProbe {
    struct Bitmap {
        let width: Int
        let height: Int
        let scale: CGFloat
        let rgba: [UInt8]

        func at(_ x: Int, _ y: Int) -> (r: Double, g: Double, b: Double, a: Double) {
            let i = (y * width + x) * 4
            return (Double(rgba[i]) / 255, Double(rgba[i + 1]) / 255, Double(rgba[i + 2]) / 255, Double(rgba[i + 3]) / 255)
        }

        /// The mean of one column, which averages out SwiftUI's gradient dither.
        func columnMean(_ x: Int) -> (Double, Double, Double) {
            var r = 0.0, g = 0.0, b = 0.0
            for y in 0..<height {
                let p = at(x, y)
                r += p.r; g += p.g; b += p.b
            }
            return (r / Double(height), g / Double(height), b / Double(height))
        }

        /// The contiguous runs of columns carrying ink, in pixels. Two views side by side with a gap between
        /// them come back as two runs, whatever their size on this platform — which is what lets one
        /// measurement serve macOS, iOS and the watch.
        func inkColumnRuns(threshold: Double = 0.5) -> [Range<Int>] {
            var runs: [Range<Int>] = []
            var start: Int?
            for x in 0..<width {
                let inked = (0..<height).contains { at(x, $0).r < threshold }
                if inked, start == nil { start = x }
                if !inked, let from = start {
                    runs.append(from..<x)
                    start = nil
                }
            }
            if let from = start { runs.append(from..<width) }
            return runs
        }

        /// The first and last rows carrying ink, in points, or nil when the window is blank.
        func inkRows(columns: Range<Int>? = nil, threshold: Double = 0.5) -> (first: Double, last: Double)? {
            let window = columns ?? 0..<width
            var first = -1, last = -1
            for y in 0..<height {
                for x in window where at(x, y).r < threshold {
                    if first < 0 { first = y }
                    last = y
                    break
                }
            }
            guard first >= 0 else { return nil }
            return (Double(first) / scale, Double(last + 1) / scale)
        }
    }

    /// Renders the view at its own ideal size; returns the bitmap and the size in points.
    @MainActor
    static func render(_ view: some View, scale: CGFloat = 1) -> Bitmap? {
        let renderer = ImageRenderer(content: view)
        renderer.scale = scale
        renderer.isOpaque = true
        guard let cg = renderer.cgImage else { return nil }
        return read(cg, scale: scale)
    }

    /// Renders the view inside a fixed frame on white, top-leading.
    @MainActor
    static func render(_ view: some View, size: CGSize, scale: CGFloat = 1) -> Bitmap? {
        render(
            ZStack(alignment: .topLeading) {
                Color(.sRGB, white: 1)
                view
            }
            .frame(width: size.width, height: size.height),
            scale: scale
        )
    }

    static func read(_ cg: CGImage, scale: CGFloat) -> Bitmap? {
        let width = cg.width
        let height = cg.height
        var data = [UInt8](repeating: 0, count: width * height * 4)
        guard let space = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
        let ok = data.withUnsafeMutableBytes { buffer -> Bool in
            guard let base = buffer.baseAddress,
                  let context = CGContext(
                      data: base,
                      width: width,
                      height: height,
                      bitsPerComponent: 8,
                      bytesPerRow: width * 4,
                      space: space,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
                  )
            else { return false }
            context.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
            return true
        }
        return ok ? Bitmap(width: width, height: height, scale: scale, rgba: data) : nil
    }
}

/// OKLab with Björn Ottosson's matrices — the space `tools/contrast/gradient.ts` interpolates in through
/// Color.js, and the space ARCHITECTURE §7.9 makes both stacks render vivid gradients in.
enum OKLab {
    static func toLinear(_ c: Double) -> Double {
        c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
    }

    static func toGamma(_ c: Double) -> Double {
        c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1 / 2.4) - 0.055
    }

    static func fromSRGB(_ rgb: (Double, Double, Double)) -> (Double, Double, Double) {
        let r = toLinear(rgb.0), g = toLinear(rgb.1), b = toLinear(rgb.2)
        let l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
        let m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
        let s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
        return (
            0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
        )
    }

    static func toSRGB(_ lab: (Double, Double, Double)) -> (Double, Double, Double) {
        let l = pow(lab.0 + 0.3963377774 * lab.1 + 0.2158037573 * lab.2, 3)
        let m = pow(lab.0 - 0.1055613458 * lab.1 - 0.0638541728 * lab.2, 3)
        let s = pow(lab.0 - 0.0894841775 * lab.1 - 1.2914855480 * lab.2, 3)
        return (
            toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
        )
    }

    /// `mix(a, b, f, "oklab")` of `tools/contrast/gradient.ts`.
    static func mix(_ a: (Double, Double, Double), _ b: (Double, Double, Double), _ f: Double) -> (Double, Double, Double) {
        let la = fromSRGB(a), lb = fromSRGB(b)
        return toSRGB((la.0 + (lb.0 - la.0) * f, la.1 + (lb.1 - la.1) * f, la.2 + (lb.2 - la.2) * f))
    }

    /// OKLCH with the shorter hue arc — the polar form. CSS's `in oklab` is the rectangular one; this is the
    /// counter-candidate a "perceptual" space could be instead.
    static func mixOKLCH(_ a: (Double, Double, Double), _ b: (Double, Double, Double), _ f: Double) -> (Double, Double, Double) {
        let la = fromSRGB(a), lb = fromSRGB(b)
        let ca = (la.1 * la.1 + la.2 * la.2).squareRoot(), cb = (lb.1 * lb.1 + lb.2 * lb.2).squareRoot()
        var ha = atan2(la.2, la.1), hb = atan2(lb.2, lb.1)
        if hb - ha > .pi { hb -= 2 * .pi }
        if ha - hb > .pi { ha -= 2 * .pi }
        let l = la.0 + (lb.0 - la.0) * f
        let c = ca + (cb - ca) * f
        let h = ha + (hb - ha) * f
        return toSRGB((l, c * cos(h), c * sin(h)))
    }

    /// `mix(a, b, f, "srgb")`: the gamma-encoded lerp SwiftUI's `.device` draws.
    static func mixSRGB(_ a: (Double, Double, Double), _ b: (Double, Double, Double), _ f: Double) -> (Double, Double, Double) {
        (a.0 + (b.0 - a.0) * f, a.1 + (b.1 - a.1) * f, a.2 + (b.2 - a.2) * f)
    }

    /// Display P3 to sRGB, both D65 (ARCHITECTURE §7.2). Unclamped: a channel outside [0, 1] is a color sRGB
    /// cannot show, which the renderer clips and CSS gamut-maps.
    static func p3ToSRGB(_ rgb: (Double, Double, Double)) -> (Double, Double, Double) {
        let r = toLinear(rgb.0), g = toLinear(rgb.1), b = toLinear(rgb.2)
        return (
            toGammaUnclamped(1.2249401762 * r - 0.2249401762 * g),
            toGammaUnclamped(-0.0420569547 * r + 1.0420569547 * g),
            toGammaUnclamped(-0.0196376454 * r - 0.0786360454 * g + 1.0982736908 * b)
        )
    }

    /// The sRGB transfer function extended through zero, so an out-of-gamut channel stays visible as such.
    static func toGammaUnclamped(_ c: Double) -> Double {
        c < 0 ? -toGamma(-c) : toGamma(c)
    }

    /// The third candidate: linear light.
    static func mixLinear(_ a: (Double, Double, Double), _ b: (Double, Double, Double), _ f: Double) -> (Double, Double, Double) {
        let la = (toLinear(a.0), toLinear(a.1), toLinear(a.2))
        let lb = (toLinear(b.0), toLinear(b.1), toLinear(b.2))
        return (
            toGamma(la.0 + (lb.0 - la.0) * f),
            toGamma(la.1 + (lb.1 - la.1) * f),
            toGamma(la.2 + (lb.2 - la.2) * f)
        )
    }
}
