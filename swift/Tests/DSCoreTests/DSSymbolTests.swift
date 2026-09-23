import CoreGraphics
import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// DSCore's symbol route (`DSSymbol`, `DSSymbolImage`), which `DSIcon` draws every SF Symbol through: the Bold Text
/// rung applied once, the frame fit that keeps a glyph inside its box, and the box itself (Icon.yaml behaviors 3, 4
/// and 10, and its anatomy).
///
/// It runs on the macOS host, the iOS simulator and the watchOS simulator (the `DSCoreTests` scheme in CI), because
/// the frame a symbol is fitted by is measured by each platform's own image API — AppKit on the Mac, UIKit on the
/// phone and the wrist — and Icon is `full` on the watch. Nothing here needs the colour catalog: every render draws
/// in an explicit sRGB black.
///
/// The registry's point sizes (14, 18 and 21 pt for the 16, 20 and 24 pt boxes) are written out here because DSCore
/// does not depend on DSIcons; `DSIconBindingTests` holds them to `DSIconSize.pointSize`, and fits every registry
/// symbol, on the DSComponents side.
@MainActor
@Suite("The symbol route (Icon.yaml, ADR-0021 §3 and §12)", .serialized)
struct DSSymbolTests {
    static let pointSizes: [CGFloat] = [14, 18, 21]

    // MARK: - The weight

    /// Behavior 4: under Bold Text the rung steps to the one the registry's ladder names — regular (400) to medium
    /// (500), thin (200) to light (300) — and otherwise stays.
    @Test func boldTextStepsTheRungOnce() {
        #expect(DSSymbol.renderedWeight(400, boldWeight: 500, boldText: false) == 400)
        #expect(DSSymbol.renderedWeight(400, boldWeight: 500, boldText: true) == 500)
        #expect(DSSymbol.renderedWeight(200, boldWeight: 300, boldText: false) == 200)
        #expect(DSSymbol.renderedWeight(200, boldWeight: 300, boldText: true) == 300)
        // The top of the ladder saturates in the registry, which passes the same number twice.
        #expect(DSSymbol.renderedWeight(800, boldWeight: 800, boldText: true) == 800)
        // The route draws each rung at the San Francisco weight of the text route's ladder.
        #expect(DSTypography.systemWeight(200) == .thin)
        #expect(DSTypography.systemWeight(300) == .light)
        #expect(DSTypography.systemWeight(400) == .regular)
        #expect(DSTypography.systemWeight(500) == .medium)
    }

    // MARK: - The fit

    /// The fit shrinks a symbol whose longer side is larger than the reference's, by the ratio of the two, and
    /// leaves every other symbol at the registry's point size: it never enlarges.
    @Test func theFitNeverEnlarges() {
        let reference = CGSize(width: 16.5, height: 16.5)
        // Equal to the reference: unchanged.
        #expect(DSSymbol.fittedPointSize(14, frame: reference, reference: reference) == 14)
        // Smaller on both sides, or narrower and as tall: unchanged.
        #expect(DSSymbol.fittedPointSize(14, frame: CGSize(width: 13.75, height: 12.75), reference: reference) == 14)
        #expect(DSSymbol.fittedPointSize(14, frame: CGSize(width: 5, height: 16.5), reference: reference) == 14)
        // Wider: scaled by reference / frame on the longer side, whichever side that is.
        let wide = DSSymbol.fittedPointSize(14, frame: CGSize(width: 20, height: 15), reference: reference)
        #expect(abs(wide - 14 * 16.5 / 20) < 1e-9, "\(wide)")
        let tall = DSSymbol.fittedPointSize(18, frame: CGSize(width: 18, height: 22), reference: CGSize(width: 21, height: 21))
        #expect(abs(tall - 18 * 21 / 22) < 1e-9, "\(tall)")
        // A degenerate measurement leaves the point size alone rather than drawing nothing.
        #expect(DSSymbol.fittedPointSize(14, frame: .zero, reference: reference) == 14)
        #expect(DSSymbol.fittedPointSize(14, frame: reference, reference: .zero) == 14)
    }

    /// The calibration symbol is on this platform at every registry point size, grows with the point size, and is
    /// never smaller at a heavier weight; a name the platform does not have measures nil, so the route falls back to
    /// the registry's point size instead of fitting against nothing.
    ///
    /// The fit compares longer sides only, and that is all this asks of the frame: each platform reports it on its own
    /// grid — whole points from AppKit, half points on the watch, thirds on the phone — and the phone's frame for
    /// `circle` at the regular weight is not even square (25 × 23⅔ pt at 21 pt on iOS 26.5).
    @Test func theCalibrationFrameIsMeasuredOnThisPlatform() throws {
        var previous: CGFloat = 0
        for pointSize in Self.pointSizes {
            let regular = try #require(DSSymbol.frame(systemName: DSSymbol.calibration, pointSize: pointSize, weight: 400, scale: .medium))
            let thin = try #require(DSSymbol.frame(systemName: DSSymbol.calibration, pointSize: pointSize, weight: 200, scale: .medium))
            let bold = try #require(DSSymbol.frame(systemName: DSSymbol.calibration, pointSize: pointSize, weight: 700, scale: .medium))
            print("DSSymbolTests calibration \(pointSize) pt: thin \(thin), regular \(regular), bold \(bold)")
            let side = max(regular.width, regular.height)
            #expect(side > previous, "\(pointSize) pt: \(regular)")
            // The frame is the symbol plus its padding: never smaller than the point size, never twice it.
            #expect(side >= pointSize && side < 2 * pointSize, "\(pointSize) pt: \(regular)")
            #expect(max(bold.width, bold.height) >= max(thin.width, thin.height), "\(pointSize) pt: thin \(thin), bold \(bold)")
            previous = side
        }
        #expect(DSSymbol.frame(systemName: "prism.no-such-symbol", pointSize: 14, weight: 400, scale: .medium) == nil)
    }

    /// The calibration symbol fits itself: the registry's point size is kept.
    @Test func theCalibrationSymbolKeepsTheRegistrysPointSize() {
        for pointSize in Self.pointSizes {
            for weight in [200, 300, 400, 500] {
                let fitted = DSSymbolFit.pointSize(systemName: DSSymbol.calibration, pointSize: pointSize, weight: weight, scale: .medium)
                #expect(fitted == pointSize, "\(pointSize) pt at \(weight): \(fitted)")
            }
        }
        // A name the platform does not have keeps the registry's point size too.
        #expect(DSSymbolFit.pointSize(systemName: "prism.no-such-symbol", pointSize: 18, weight: 400, scale: .medium) == 18)
    }

    // MARK: - The box

    /// The anatomy's root: whatever the symbol's own frame, the view lays out in exactly `box` × `box`.
    @Test func theSymbolLaysOutInItsBox() throws {
        for (box, pointSize) in [(CGFloat(16), CGFloat(14)), (20, 18), (24, 21)] {
            let view = DSTheme {
                DSSymbolImage(systemName: DSSymbol.calibration, box: box, pointSize: pointSize, scale: .medium, weight: 400, boldWeight: 500)
            }
            let renderer = ImageRenderer(content: view)
            renderer.scale = 1
            let image = try #require(renderer.cgImage, "\(box) pt did not render")
            #expect(image.width == Int(box) && image.height == Int(box), "\(box) pt box laid out \(image.width) × \(image.height)")
        }
    }

    // MARK: - Bold Text is applied exactly once

    private func bitmap(boldText: Bool, legibility: LegibilityWeight) throws -> RenderProbe.Bitmap {
        let view = DSTheme(brand: .prism) {
            DSSymbolImage(systemName: DSSymbol.calibration, box: 24, pointSize: 21, scale: .medium, weight: 400, boldWeight: 500)
                .foregroundStyle(Color(.sRGB, white: 0))
        }
        .dsAccessibilityPolicy(boldText: boldText)
        .environment(\.legibilityWeight, legibility)
        return try #require(RenderProbe.render(view, size: CGSize(width: 24, height: 24), scale: 4))
    }

    /// With the policy's Bold Text off, SwiftUI's own `legibilityWeight` does not reach the symbol: Prism applies Bold
    /// Text, once, and the route tells SwiftUI the symbol is already at its weight (ADR-0021 T8).
    @Test func swiftUIDoesNotStepTheSymbolASecondTime() throws {
        let regular = try bitmap(boldText: false, legibility: .regular)
        let bold = try bitmap(boldText: false, legibility: .bold)
        #expect(regular.rgba == bold.rgba, "Bold Text reached the symbol a second time")
        #expect(regular.inkRows() != nil, "the probe drew no symbol at all")
    }

    /// The counter-check that proves the comparison bites: the policy's Bold Text does change the symbol, to the
    /// heavier rung, which is more ink.
    @Test func thePolicysBoldTextStepsTheSymbol() throws {
        let regular = try bitmap(boldText: false, legibility: .regular)
        let stepped = try bitmap(boldText: true, legibility: .regular)
        #expect(regular.rgba != stepped.rgba)
        func ink(_ bitmap: RenderProbe.Bitmap) -> Double {
            stride(from: 0, to: bitmap.rgba.count, by: 4).reduce(0) { $0 + (1 - Double(bitmap.rgba[$1]) / 255) }
        }
        #expect(ink(stepped) > ink(regular), "the stepped rung carries no more ink than the regular one")
    }
}
