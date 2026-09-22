#if os(iOS)
import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// What a Button draws, read back from renders: the ghost pill has no fill at rest, the secondary pill does, and a
/// disabled pill is dimmed. Each comparison renders through the same pipeline, so no colour value is restated.
///
/// **Why this is a simulator suite.** A pill's fill is a `Colors.xcassets` entry, and `swift test` copies that
/// catalog uncompiled, so on the macOS host both the pill and the page behind it come back transparent — and
/// "the ghost pill matches the page" then passes on two empty images (`DSRenderCapability`). `xcodebuild` compiles
/// the catalog, so this runs with the snapshots on the pinned iPhone 17. Which cell each variant takes is
/// `DSButtonBindingTests` on the host, in value space.
@MainActor
@Suite("Button renders (ADR-0029 §3.3)", .serialized)
struct DSButtonRenderTests {
    /// The same token set the bindings are read from (`DSButtonBindingTests.tokens`, which lives in the other target).
    static func tokens(scheme: DSColorScheme = .light, density: DSDensity = .regular) -> DSTokenSet {
        DSTokenSet(DSTokenContext(brand: .default, colorScheme: scheme, density: density, modality: .touch, motion: .standard))
    }

    /// The pixel just inside the pill's leading padding, halfway down, and one outside the pill on the page.
    static func pixels(_ button: DSButton, scheme: ColorScheme) -> (inside: [UInt8], page: [UInt8])? {
        let tokens = Self.tokens(scheme: scheme == .dark ? .dark : .light, density: .regular)
        let inset = tokens.space.step8
        let view = DSTheme {
            button
                .padding(inset)
                .background(tokens.color.bgPage)
        }
        .dsDensity(.regular)
        .environment(\.colorScheme, scheme)
        let renderer = ImageRenderer(content: view)
        renderer.scale = 1
        renderer.isOpaque = true
        guard let image = renderer.cgImage else { return nil }
        let height = tokens.components.button.heightMd
        let inside = CGPoint(x: inset + tokens.components.button.paddingXMd / 2, y: inset + height / 2)
        let page = CGPoint(x: inset / 2, y: inset / 2)
        guard let a = pixel(image, at: inside), let b = pixel(image, at: page) else { return nil }
        return (a, b)
    }

    static func pixel(_ image: CGImage, at point: CGPoint) -> [UInt8]? {
        guard let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4, space: space,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(image, in: CGRect(x: -point.x, y: point.y - CGFloat(image.height) + 1, width: CGFloat(image.width), height: CGFloat(image.height)))
        guard let data = context.data else { return nil }
        let bytes = data.bindMemory(to: UInt8.self, capacity: 4)
        return [bytes[0], bytes[1], bytes[2]]
    }

    static func close(_ a: [UInt8], _ b: [UInt8], within tolerance: Int = 1) -> Bool {
        zip(a, b).allSatisfy { abs(Int($0) - Int($1)) <= tolerance }
    }

    @Test(arguments: [ColorScheme.light, .dark])
    func ghostHasNoRestFill(_ scheme: ColorScheme) throws {
        try DSRenderCapability.requireRasterizing()
        let ghost = try #require(Self.pixels(DSButton("Filter", variant: .ghost) {}, scheme: scheme))
        #expect(Self.close(ghost.inside, ghost.page), "\(scheme): \(ghost.inside) vs page \(ghost.page)")
        let secondary = try #require(Self.pixels(DSButton("Filter", variant: .secondary) {}, scheme: scheme))
        #expect(!Self.close(secondary.inside, secondary.page, within: 0), "\(scheme): \(secondary.inside) vs page \(secondary.page)")
    }

    @Test(arguments: [ColorScheme.light, .dark])
    func disabledIsDimmed(_ scheme: ColorScheme) throws {
        try DSRenderCapability.requireRasterizing()
        let enabled = try #require(Self.pixels(DSButton("Continue") {}, scheme: scheme))
        let disabled = try #require(Self.pixels(DSButton("Continue", isDisabled: true) {}, scheme: scheme))
        #expect(!Self.close(enabled.inside, disabled.inside, within: 8), "\(scheme): \(enabled.inside) vs \(disabled.inside)")
        #expect(Self.close(enabled.page, disabled.page))
    }
}
#endif
