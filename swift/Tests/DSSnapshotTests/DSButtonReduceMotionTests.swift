#if os(iOS)
import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// ADR-0023 §8.4 item 2 as pixels: under Reduce Motion nothing about a press scales, so the press has to show as an
/// opacity or colour change to a token the spec names — "Button and Card: 'press scale is replaced by an opacity
/// dip'". A press a reader cannot see is a press that did not happen, and the binding tests cannot catch it: every
/// cell can be bound correctly and still composite to the fill already on screen.
///
/// Each case renders the same pill twice through the same pipeline, at rest and pressed, and compares the two images;
/// no colour value is written here, so the tokens decide both sides. Modality is touch, which is where this matters:
/// there is no hover overlay to fall back on.
///
/// **Why this is a simulator suite.** The substitute is a token colour composited over a token fill, and `swift test`
/// copies Colors.xcassets uncompiled, so on the macOS host the pill at rest and the pill pressed are the same empty
/// image and every variant measures a step of 0 (`DSRenderCapability`). `xcodebuild` compiles the catalog, so this
/// runs with the snapshots on the pinned iPhone 17. The geometry behind it — that nothing scales under Reduce Motion
/// — is also `DSButtonBindingTests.pressMotion` on the host, in value space.
@MainActor
@Suite("The Reduce Motion press substitute is visible (ADR-0023 §8.4)", .serialized)
struct DSButtonReduceMotionTests {
    static let side: CGFloat = 96

    /// The smallest per-channel difference that counts as visible. The snapshot suite absorbs a uniform shift of one
    /// to two 8-bit code values on every ground it measured (`DSSnapshotTests/README.md`, "Tolerance"), so a press
    /// that moved fewer than three is a press the images would not record either.
    static let visible = 3

    /// The page and the vivid gradient: the two grounds whose cells differ for `primary`, which takes
    /// `color.bg.fill.inverse-media` on vivid and `comp.button.primary.bg.*` everywhere else.
    nonisolated static let materials: [DSSurfaceMaterial] = [.page, .vivid]

    /// One pill on a surface that publishes `material`, at rest or pressed.
    static func pill(_ variant: DSButtonVariant, isPressed: Bool, on material: DSSurfaceMaterial) -> some View {
        DSSurfaceView(material: material, radius: .none, padding: .none) {
            DSButtonPill(
                label: Color.clear.frame(width: side / 2, height: side / 4),
                isPressed: isPressed,
                variant: variant,
                size: .md,
                isLoading: false,
                isFullWidth: false
            )
            .frame(width: side, height: side)
        }
    }

    /// The render as sRGB bytes, always `side × side`, so two renders are comparable pixel for pixel.
    static func pixels(
        _ variant: DSButtonVariant,
        isPressed: Bool,
        on material: DSSurfaceMaterial,
        scheme: ColorScheme
    ) -> [UInt8]? {
        let content = DSTheme { pill(variant, isPressed: isPressed, on: material) }
            .dsModality(.touch)
            .dsAccessibilityPolicy(reduceMotion: true)
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

    /// The largest difference over any channel of any pixel, and how many pixels differ at all.
    static func difference(_ a: [UInt8], _ b: [UInt8]) -> (largest: Int, pixels: Int) {
        var largest = 0
        var pixels = 0
        for pixel in stride(from: 0, to: min(a.count, b.count), by: 4) {
            let step = (0..<3).map { abs(Int(a[pixel + $0]) - Int(b[pixel + $0])) }.max() ?? 0
            largest = max(largest, step)
            if step > 0 { pixels += 1 }
        }
        return (largest, pixels)
    }

    /// Pressing changes what is on screen, for every variant, on both grounds and in both schemes.
    ///
    /// **Known gap for `primary`, the default variant.** `comp.button.primary.bg.pressed` and
    /// `comp.button.primary.bg.rest` both alias `color.bg.fill.inverse`, and on vivid both cells are forced to
    /// `color.bg.fill.inverse-media`, so the substitute Button.yaml `accessibility.reduceMotion` names is the fill
    /// already on screen. `DSButtonAppearance.reducedMotionPressOverlay` documents why this cannot be repaired from
    /// the component: `color.bg.fill.neutral.subtle`, the substitute danger and Card use, is the inverse fill's own
    /// colour at 6 % and composites to nothing over it. The fix is the token, through P1-1 and P1-2, and this fails
    /// the day it lands. Tracked in `docs/roadmap.md`, "Verify before implementing": **Button `primary` has no Reduce
    /// Motion press**, so the record is not this comment alone.
    @Test(arguments: DSButtonVariant.allCases)
    func theReduceMotionPressIsVisible(_ variant: DSButtonVariant) throws {
        try DSRenderCapability.requireRasterizing()
        for scheme in [ColorScheme.light, .dark] {
            for material in Self.materials {
                let rest = try #require(Self.pixels(variant, isPressed: false, on: material, scheme: scheme), "\(variant) \(material) \(scheme) did not render")
                let pressed = try #require(Self.pixels(variant, isPressed: true, on: material, scheme: scheme), "\(variant) \(material) \(scheme) did not render")
                let moved = Self.difference(rest, pressed)
                print("DSReduceMotionPress \(variant) on \(material) in \(scheme) | largest channel step \(moved.largest) | pixels changed \(moved.pixels)")
                withKnownIssue(
                    "comp.button.primary.bg.pressed aliases color.bg.fill.inverse, its own rest fill, so Button.yaml's named substitute changes nothing"
                ) {
                    #expect(
                        moved.largest >= Self.visible,
                        "\(variant) on \(material) in \(scheme): the press moved at most \(moved.largest) code value(s) over \(moved.pixels) pixel(s)"
                    )
                } when: {
                    variant == .primary
                }
            }
        }
    }

    /// The companion rule, so the test above cannot pass on a press that is visible for the wrong reason: under
    /// Reduce Motion the pill does not scale (`DSControlAppearance.scale`, ADR-0023 §8.4 item 2), and outside it the
    /// press scale is the bound 0.97.
    @Test func nothingScalesUnderReduceMotion() {
        let reduced = DSMotion(DSTokenSet(DSTokenContext(motion: .reduced)).motion)
        let standard = DSMotion(DSTokenSet(DSTokenContext(motion: .standard)).motion)
        #expect(DSControlAppearance.scale(isPressed: true, motion: reduced) == 1)
        #expect(DSControlAppearance.scale(isPressed: true, motion: standard) == DSControlAppearance.pressedScale)
        #expect(DSControlAppearance.substituteOpacity(isPressed: true, motion: reduced) == 1)
        #expect(DSControlAppearance.substituteOpacity(isPressed: true, motion: standard) == 0)
        #expect(DSControlAppearance.substituteOpacity(isPressed: false, motion: reduced) == 0)
    }
}
#endif
