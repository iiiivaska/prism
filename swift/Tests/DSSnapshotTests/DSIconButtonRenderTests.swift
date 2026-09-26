#if os(iOS)
import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// Where an IconButton's badge is drawn, read back from renders: `tokens.badge.offset` — `space.1` — above the circle's
/// top edge and past its trailing edge, overlapping the circle, on the leading side under a right-to-left layout; and
/// the circle itself unmoved by it (behavior, "An optional Badge…").
///
/// The binding test holds the offset cell to `space.1` in value space; only a render shows that the view applies it.
/// The first version of the view wrote the alignment guides on the badge inside its `if let`, where the overlay never
/// reads them: every binding passed and the badge sat flush in the corner — x 44…63, y 24…43 over a circle at 24…63 in
/// regular, measured off that render, where this suite asks for 48…67 and 20…39. The web's
/// twin measures the same rectangle in Chromium (`web/apps/gallery/test/components.browser.test.tsx`).
///
/// **Why this is a simulator suite.** The circle and the badge are `Colors.xcassets` fills, which `swift test` leaves
/// transparent on the macOS host (`DSRenderCapability`).
@MainActor
@Suite("IconButton renders (IconButton.yaml v2)", .serialized)
struct DSIconButtonRenderTests {
    static func tokens(density: DSDensity) -> DSTokenSet {
        DSTokenSet(DSTokenContext(brand: .default, colorScheme: .light, density: density, modality: .touch, motion: .standard))
    }

    /// A pixel rectangle, inclusive.
    struct Box: CustomStringConvertible {
        let minX: Int, maxX: Int, minY: Int, maxY: Int

        var description: String { "x \(minX)…\(maxX), y \(minY)…\(maxY)" }
    }

    /// One secondary circle on the page with `space.page-margin` around it, in light, as sRGB bytes and a width.
    static func render(badge: DSBadge?, density: DSDensity, direction: LayoutDirection) -> (bytes: [UInt8], width: Int)? {
        let margin = tokens(density: density).space.pageMargin
        let view = DSTheme {
            DSIconButton("Open notifications", glyph: .objectNotification, badge: badge) {}
                .padding(margin)
                .background(tokens(density: density).color.bgPage)
        }
        .dsDensity(density)
        .environment(\.colorScheme, .light)
        .environment(\.layoutDirection, direction)
        let renderer = ImageRenderer(content: view)
        renderer.scale = 1
        renderer.isOpaque = true
        guard let image = renderer.cgImage,
              let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: image.width * 4,
                  space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
        guard let data = context.data else { return nil }
        let count = image.width * image.height * 4
        let bytes = data.bindMemory(to: UInt8.self, capacity: count)
        return ((0..<count).map { bytes[$0] }, image.width)
    }

    /// The box of the pixels that differ from `reference` by more than `threshold` on some channel.
    static func box(_ bytes: [UInt8], width: Int, differingFrom reference: (Int) -> [UInt8], threshold: Int) -> Box? {
        var minX = Int.max, maxX = -1, minY = Int.max, maxY = -1
        for index in stride(from: 0, to: bytes.count, by: 4) {
            let other = reference(index)
            let step = (0..<3).map { abs(Int(bytes[index + $0]) - Int(other[$0])) }.max() ?? 0
            guard step > threshold else { continue }
            let pixel = index / 4
            minX = min(minX, pixel % width); maxX = max(maxX, pixel % width)
            minY = min(minY, pixel / width); maxY = max(maxY, pixel / width)
        }
        return maxX < 0 ? nil : Box(minX: minX, maxX: maxX, minY: minY, maxY: maxY)
    }

    /// The badge's box is `space.1` outside the circle's top edge and outside its trailing edge — the leading one under
    /// right to left — and the badge's own `size.icon.md` square; the circle's box is the same with the badge and
    /// without it. Measured in compact and regular, where the circle is 32 and 40 pt and the badge the same 20 pt.
    @Test(arguments: [LayoutDirection.leftToRight, .rightToLeft])
    func theBadgeSitsOneSpaceOutsideTheCorner(_ direction: LayoutDirection) throws {
        try DSRenderCapability.requireRasterizing()
        for density in [DSDensity.compact, .regular] {
            let tokens = Self.tokens(density: density)
            let offset = Int(tokens[keyPath: DSIconButtonAppearance.badgeOffset])
            let badgeSide = Int(tokens.size.iconMd)
            let bare = try #require(Self.render(badge: nil, density: density, direction: direction))
            let badged = try #require(Self.render(badge: DSBadge(count: 3, label: "unread"), density: density, direction: direction))
            #expect(bare.width == badged.width && bare.bytes.count == badged.bytes.count, "\(density) \(direction): the badge changed the layout")
            let page = Array(bare.bytes[0..<3])
            let circle = try #require(Self.box(bare.bytes, width: bare.width, differingFrom: { _ in page }, threshold: 3), "\(density): no circle")
            let badge = try #require(
                Self.box(badged.bytes, width: badged.width, differingFrom: { Array(bare.bytes[$0..<($0 + 3)]) }, threshold: 3),
                "\(density) \(direction): no badge"
            )
            print("DSIconButtonBadge \(density) \(direction) | circle \(circle) | badge \(badge)")
            let side = Int(DSIconButtonAppearance.side(.md, tokens.components.iconButton))
            #expect(circle.maxX - circle.minX + 1 == side && circle.maxY - circle.minY + 1 == side, "\(density): circle \(circle)")
            #expect(badge.minY == circle.minY - offset, "\(density) \(direction): badge \(badge), circle \(circle)")
            #expect(badge.maxY - badge.minY + 1 == badgeSide, "\(density) \(direction): badge \(badge)")
            #expect(badge.maxX - badge.minX + 1 == badgeSide, "\(density) \(direction): badge \(badge)")
            if direction == .leftToRight {
                #expect(badge.maxX == circle.maxX + offset, "\(density): badge \(badge), circle \(circle)")
            } else {
                #expect(badge.minX == circle.minX - offset, "\(density): badge \(badge), circle \(circle)")
            }
        }
    }
}
#endif
