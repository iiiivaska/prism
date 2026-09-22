import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// ADR-0021 §5 as pixels: a metric role set to `numeric: tabular` renders at the weight the role renders at, so the
/// SwiftUI hero and the web hero are the same hero. The web maps `[data-ds-numeric="tabular"]` to
/// `font-variant-numeric` alone and never touches `font-weight`, which stays `--ds-type-metric-xl-font-weight`; this
/// suite holds the Apple side to the same promise, in the dark scheme, where `metric-xl` is the one role ADR-0021 §2
/// gives a weight below the light floor (200 at 48 px).
///
/// The binding tests can say what the weight resolves to; only a render can say what reached the screen. Ink is
/// measured as the distance of every pixel from the ground it sits on, summed: it does not care where a glyph sits,
/// which is what lets a tabular run — the same digits at different advances — be compared with a proportional one.
@MainActor
@Suite("The figures override renders at the role's weight (ADR-0021 §5)", .serialized)
struct DSTextFiguresRenderTests {
    static let width: CGFloat = 260
    static let height: CGFloat = 90

    /// The digits: one glyph, four times, so a proportional and a tabular run carry the same ink at the same weight
    /// whatever the advances do. "8" is the densest digit, which makes a weight change the loudest.
    static let digits = "8888"

    /// Measured on the bundled Onest at 48 px, the two ends of this bug: at the same weight a tabular run carries
    /// 0.999 × the ink of the proportional one, and one tier heavier — the light floor the override used to fall to
    /// — carries 1.187 ×. 4 % sits between them with room for the antialiasing an advance change moves around.
    static let tolerance = 0.04

    static func ink(_ numeric: DSTextNumeric) -> Double? {
        let content = DSTheme {
            DSSurfaceView(material: .page, radius: .none, padding: .none) {
                DSText(verbatim: digits, role: .metricXl, numeric: numeric)
                    .frame(width: width, height: height)
            }
        }
        .environment(\.colorScheme, .dark)
        let renderer = ImageRenderer(content: content)
        renderer.proposedSize = ProposedViewSize(width: width, height: height)
        renderer.scale = 1
        renderer.isOpaque = true
        let pixelWidth = Int(width)
        let pixelHeight = Int(height)
        guard let image = renderer.cgImage,
              let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: pixelWidth, height: pixelHeight, bitsPerComponent: 8,
                  bytesPerRow: pixelWidth * 4, space: space,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        guard let data = context.data else { return nil }
        let bytes = data.bindMemory(to: UInt8.self, capacity: pixelWidth * pixelHeight * 4)
        // The ground: the top-left pixel, which no glyph reaches at this frame.
        let ground = (0..<3).map { Int(bytes[$0]) }
        var ink = 0.0
        for pixel in stride(from: 0, to: pixelWidth * pixelHeight * 4, by: 4) {
            ink += Double((0..<3).map { abs(Int(bytes[pixel + $0]) - ground[$0]) }.max() ?? 0)
        }
        return ink
    }

    /// The hero counter of `Text.yaml`'s motion block — `agent/SKILL.md` tells apps to set `numeric: tabular` on a
    /// number that updates while it is visible — carries the weight of the role it is.
    @Test func theTabularHeroRendersAtTheRolesWeight() throws {
        let own = try #require(Self.ink(.auto), "the role's own figures did not render")
        let tabular = try #require(Self.ink(.tabular), "the tabular override did not render")
        #expect(own > 0 && tabular > 0, "the probe rendered no text")
        let ratio = tabular / own
        print("DSTextFigures metric-xl in dark | ink own \(own) | ink tabular \(tabular) | ratio \(ratio)")
        #expect(
            abs(ratio - 1) <= Self.tolerance,
            "metric-xl set to tabular carries \(ratio) × the ink of the role itself, which is a weight change, not a figures change"
        )
    }
}
