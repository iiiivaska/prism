#if os(iOS)
import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// IconButton.yaml `accessibility.reduceMotion` and behavior ("Pressed…") as pixels: under Reduce Motion nothing about a
/// press scales, so each variant's press has to show as its pressed fill — secondary, ghost and plain — or as the
/// pressed overlay of `color.bg.fill.neutral.subtle` — primary, danger and a selected circle (ADR-0023 §8.4 item 2).
///
/// Each case renders the same circle twice through the same pipeline, at rest and pressed, and compares the two
/// images; no colour value is written here, so the tokens decide both sides. Modality is touch, where there is no hover
/// overlay to fall back on. `DSButtonReduceMotionTests` is the model, and this file says the same sentence about the
/// circle.
///
/// **Why this is a simulator suite.** The fills are token colours, and `swift test` copies Colors.xcassets uncompiled,
/// so on the macOS host both renders are the same empty image (`DSRenderCapability`). The geometry behind it — that
/// nothing scales under Reduce Motion — is `DSIconButtonBindingTests.motionCells` on the host, in value space.
@MainActor
@Suite("The IconButton press is visible under Reduce Motion (IconButton.yaml, ADR-0023 §8.4)", .serialized)
struct DSIconButtonReduceMotionTests {
    static let side: CGFloat = 96

    /// The smallest per-channel difference that counts as visible: what the snapshot suite's tolerance would not absorb
    /// (`DSButtonReduceMotionTests.visible`).
    static let visible = DSButtonReduceMotionTests.visible

    /// The page and the vivid gradient: the two grounds whose cells differ, since primary, a selected circle, the ghost
    /// and plain glyphs and the danger underlay all take their media cells on vivid.
    nonisolated static let materials: [DSSurfaceMaterial] = [.page, .vivid]

    /// Every case a press can be drawn for: the five variants, and a selected circle — a ghost ring rendered as primary.
    nonisolated struct Case: CustomStringConvertible, Sendable {
        let variant: DSIconButtonVariant
        let isSelected: Bool

        var description: String { isSelected ? "selected \(variant.rawValue)" : variant.rawValue }

        static let all: [Case] = DSIconButtonVariant.allCases.map { Case(variant: $0, isSelected: false) }
            + [Case(variant: .ghost, isSelected: true)]
    }

    /// The known gap of the spec's behavior and `accessibility.reduceMotion` (Button's): the primary and selected
    /// overlay, `color.bg.fill.neutral.subtle`, composites to nothing over `color.bg.fill.inverse` in both schemes, and
    /// over `color.bg.fill.inverse-media` in dark. In light it shows over the white media solid.
    nonisolated static func isKnownGap(_ testCase: Case, on material: DSSurfaceMaterial, scheme: ColorScheme) -> Bool {
        let rendered = DSIconButtonAppearance.rendered(testCase.variant, isSelected: testCase.isSelected)
        guard rendered == .primary else { return false }
        return !DSIconButtonAppearance.isMedia(material) || scheme == .dark
    }

    /// One circle on a surface that publishes `material`, at rest or pressed, with no glyph, so every pixel of the
    /// circle is its fill.
    static func circle(_ testCase: Case, isPressed: Bool, on material: DSSurfaceMaterial) -> some View {
        DSSurfaceView(material: material, radius: .none, padding: .none) {
            DSIconButtonCircle(
                label: Color.clear,
                isPressed: isPressed,
                variant: testCase.variant,
                size: .md,
                isSelected: testCase.isSelected,
                badge: nil
            )
            .frame(width: side, height: side)
        }
    }

    /// The render as sRGB bytes, always `side × side`, so two renders are comparable pixel for pixel.
    static func pixels(
        _ testCase: Case,
        isPressed: Bool,
        on material: DSSurfaceMaterial,
        scheme: ColorScheme,
        reduceMotion: Bool = true
    ) -> [UInt8]? {
        let content = DSTheme { circle(testCase, isPressed: isPressed, on: material) }
            .dsModality(.touch)
            .dsAccessibilityPolicy(reduceMotion: reduceMotion)
            .environment(\.colorScheme, scheme)
        let renderer = ImageRenderer(content: content)
        renderer.proposedSize = ProposedViewSize(width: side, height: side)
        renderer.scale = 1
        renderer.isOpaque = true
        let width = Int(side)
        guard let image = renderer.cgImage,
              let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: width, height: width, bitsPerComponent: 8, bytesPerRow: width * 4,
                  space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: side, height: side))
        guard let data = context.data else { return nil }
        let bytes = data.bindMemory(to: UInt8.self, capacity: width * width * 4)
        return (0..<(width * width * 4)).map { bytes[$0] }
    }

    /// How far the interior of the circle reaches from its centre, in pixels: a square this far either side of the
    /// centre lies inside the smallest circle a test draws (`md` in compact, 32 pt), and inside it after the 0.97 scale.
    static let interior = 8

    /// The largest channel difference inside the circle, away from its rim: a difference there is a difference of fill,
    /// never of geometry. The rim is left out because its antialiased pixels mix the circle with the ground, so an
    /// overlay that composites to nothing on the fill still moves them by a few code values over a one-pixel ring —
    /// 108 pixels of a 40 pt circle, measured — which no reader sees as a press.
    static func interiorStep(_ a: [UInt8], _ b: [UInt8]) -> Int {
        let width = Int(side)
        let centre = width / 2
        var largest = 0
        for y in (centre - interior)...(centre + interior) {
            for x in (centre - interior)...(centre + interior) {
                let pixel = (y * width + x) * 4
                largest = max(largest, (0..<3).map { abs(Int(a[pixel + $0]) - Int(b[pixel + $0])) }.max() ?? 0)
            }
        }
        return largest
    }

    /// Pressing changes what is on screen under Reduce Motion, for every variant and a selected circle, on both grounds
    /// and in both schemes — except the known gap, which is held as a known issue so the day the primary pressed cells
    /// get a step of their own this fails and the gap is struck from the spec.
    @Test(arguments: Case.all)
    func theReduceMotionPressIsVisible(_ testCase: Case) throws {
        try DSRenderCapability.requireRasterizing()
        for scheme in [ColorScheme.light, .dark] {
            for material in Self.materials {
                let rest = try #require(Self.pixels(testCase, isPressed: false, on: material, scheme: scheme), "\(testCase) \(material) \(scheme) did not render")
                let pressed = try #require(Self.pixels(testCase, isPressed: true, on: material, scheme: scheme), "\(testCase) \(material) \(scheme) did not render")
                let moved = DSButtonReduceMotionTests.difference(rest, pressed)
                let fill = Self.interiorStep(rest, pressed)
                print("DSIconButtonReduceMotionPress \(testCase) on \(material) in \(scheme) | interior step \(fill) | largest channel step \(moved.largest) | pixels changed \(moved.pixels)")
                withKnownIssue(
                    "the primary and selected overlay composites to nothing over color.bg.fill.inverse, and over color.bg.fill.inverse-media in dark (IconButton.yaml behavior, Button's known gap)"
                ) {
                    #expect(
                        fill >= Self.visible,
                        "\(testCase) on \(material) in \(scheme): the press moved the circle's fill by at most \(fill) code value(s); only \(moved.pixels) pixel(s) changed anywhere, by at most \(moved.largest)"
                    )
                } when: {
                    Self.isKnownGap(testCase, on: material, scheme: scheme)
                }
            }
        }
    }

    /// The pressed overlay of primary and danger shows on every press, not only under Reduce Motion — the one place
    /// where copying Button would be wrong, since Button's danger substitute appears only under Reduce Motion. Read at
    /// the circle's interior under standard motion, where the 0.97 scale moves no fill.
    @Test func thePressedOverlayShowsInEveryMotionMode() throws {
        try DSRenderCapability.requireRasterizing()
        let danger = Case(variant: .danger, isSelected: false)
        for scheme in [ColorScheme.light, .dark] {
            for material in Self.materials {
                let rest = try #require(Self.pixels(danger, isPressed: false, on: material, scheme: scheme, reduceMotion: false))
                let pressed = try #require(Self.pixels(danger, isPressed: true, on: material, scheme: scheme, reduceMotion: false))
                let step = Self.interiorStep(rest, pressed)
                print("DSIconButtonStandardPress danger on \(material) in \(scheme) | interior step \(step)")
                #expect(step >= Self.visible, "danger on \(material) in \(scheme): the overlay moved the circle's fill by \(step)")
            }
        }
        // Where the primary overlay can show — over the white media solid in light — it shows under standard motion too.
        let primary = Case(variant: .primary, isSelected: false)
        let rest = try #require(Self.pixels(primary, isPressed: false, on: .vivid, scheme: .light, reduceMotion: false))
        let pressed = try #require(Self.pixels(primary, isPressed: true, on: .vivid, scheme: .light, reduceMotion: false))
        #expect(Self.interiorStep(rest, pressed) >= Self.visible, "primary on vivid in light: the overlay does not show")
    }
}
#endif
