#if os(iOS)
import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// What a Card draws, read back from renders: the readings `spec/components/Card.yaml` settles that no value
/// comparison can reach.
///
///  - behavior 4: an `open` card with no `onAction` draws the card `action: none` draws, glyph and reserved room
///    alike;
///  - behavior 14: the open glyph is centred in the `action.size` box at the padding corner, where the web draws it;
///  - behavior 7: a `tinted` card is `color.bg.tint.accent` over the `color.bg.page` its solid surface paints under
///    itself, not over `color.bg.surface`;
///  - behavior 6: the custom disc takes `color.bg.fill.inverse` on every published material but vivid, which takes
///    the white `color.bg.fill.inverse-media`.
///
/// Each comparison renders both sides through the same pipeline, so no colour value is restated here: the tokens
/// decide both sides.
///
/// **Why this is a simulator suite.** Every colour a Card paints is a `Colors.xcassets` entry, and `swift test`
/// copies that catalog uncompiled, so on the macOS host both sides of every comparison come back transparent and
/// "the disc matches the inverse fill" passes on two empty images (`DSRenderCapability`). `xcodebuild` compiles the
/// catalog, so this runs with the snapshots on the pinned iPhone 17 and each test asks the probe first. Which cell
/// each part takes is `DSCardBindingTests` on the host, in value space — including the hover path of behavior 4,
/// which an `ImageRenderer` has no pointer to drive.
@MainActor
@Suite("Card renders (Card.yaml v5)", .serialized)
struct DSCardRenderTests {
    /// `size.card.min`, the frame the galleries give a card.
    static let side: CGFloat = 200

    static func tokens(_ scheme: ColorScheme) -> DSTokenSet {
        DSTokenSet(
            DSTokenContext(
                brand: .default, colorScheme: scheme == .dark ? .dark : .light, density: .regular,
                modality: .touch, motion: .standard
            )
        )
    }

    static func render(_ view: some View, scheme: ColorScheme, modality: DSModality = .touch) -> CGImage? {
        let content = DSTheme {
            view
                .frame(width: side, height: side)
                .dsBackdrop { DSExampleImage() }
        }
        .dsDensity(.regular)
        .dsModality(modality)
        .environment(\.colorScheme, scheme)
        let renderer = ImageRenderer(content: content)
        renderer.scale = 1
        renderer.isOpaque = true
        return renderer.cgImage
    }

    /// Every pixel of an image, as R, G, B, A in row order.
    static func bytes(_ image: CGImage?) -> [UInt8]? {
        guard let image,
              let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: image.width, height: image.height, bitsPerComponent: 8,
                  bytesPerRow: image.width * 4, space: space,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: CGFloat(image.width), height: CGFloat(image.height)))
        guard let data = context.data else { return nil }
        let pixels = data.bindMemory(to: UInt8.self, capacity: image.width * image.height * 4)
        return (0..<(image.width * image.height * 4)).map { pixels[$0] }
    }

    /// One pixel of an image, in view coordinates (origin top-left), as R, G, B.
    static func pixel(_ image: CGImage?, at point: CGPoint) -> [UInt8]? {
        guard let image,
              let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4, space: space,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(
            image,
            in: CGRect(
                x: -point.x, y: point.y - CGFloat(image.height) + 1,
                width: CGFloat(image.width), height: CGFloat(image.height)
            )
        )
        guard let data = context.data else { return nil }
        let bytes = data.bindMemory(to: UInt8.self, capacity: 4)
        return [bytes[0], bytes[1], bytes[2]]
    }

    static func close(_ a: [UInt8]?, _ b: [UInt8]?, within tolerance: Int = 1) -> Bool {
        guard let a, let b, a.count == b.count else { return false }
        return zip(a, b).allSatisfy { abs(Int($0) - Int($1)) <= tolerance }
    }

    /// Colours stacked in the order they are painted, full bleed: the composite a card's own layers should make.
    static func swatch(_ colors: [Color]) -> some View {
        ZStack {
            ForEach(Array(colors.enumerated()), id: \.offset) { _, color in
                Rectangle().fill(color)
            }
        }
    }

    // MARK: - Behavior 4: the open glyph is the pressability cue

    /// A title long enough to truncate inside the card, so the room the action reserves moves pixels even where the
    /// glyph itself is invisible: under pointer a pressable card's glyph is transparent until the pointer arrives,
    /// but its header still stops one `action.size` box and `header.gap` short of the corner (behavior 14). Before
    /// specVersion 3 a handler-less `open` card kept that room (and, under touch, drew the glyph), so both halves of
    /// this test see the change.
    static func card(action: DSCardAction, hasAction: Bool) -> some View {
        let handler: (() -> Void)? = hasAction ? {} : nil
        return DSCard(
            "Line output across the northern assembly hall",
            caption: "Last 24 hours", action: action, hero: DSCardHero("86", trailing: ".4", unit: "%"),
            onAction: handler
        )
    }

    @Test(arguments: [ColorScheme.light, .dark], [DSModality.touch, .pointer])
    func aHandlerlessOpenCardRendersAsActionNone(_ scheme: ColorScheme, _ modality: DSModality) throws {
        try DSRenderCapability.requireRasterizing()
        let none = Self.bytes(Self.render(Self.card(action: .none, hasAction: false), scheme: scheme, modality: modality))
        let handlerless = Self.bytes(Self.render(Self.card(action: .open, hasAction: false), scheme: scheme, modality: modality))
        let pressable = Self.bytes(Self.render(Self.card(action: .open, hasAction: true), scheme: scheme, modality: modality))
        #expect(none != nil)
        #expect(handlerless == none, "\(scheme) \(modality): an open card with no handler is not the `none` card")
        // The control: the same card with a handler is a different picture, so the comparison above can fail.
        #expect(pressable != none, "\(scheme) \(modality): a pressable card renders no differently from `none`")
    }

    /// Behavior 14 on the pixels: the open glyph is centred in the `action.size` box at the padding corner, so its
    /// ink stops about `(size.control.md − size.icon.sm) / 2` short of the content edge — where the web draws it
    /// (`web/apps/gallery/test/components.browser.test.tsx`, behavior 14). Until specVersion 4 this side drew the
    /// glyph as a bare `size.icon.sm` box flush against the corner, which is the disagreement the spec settled.
    ///
    /// The card carries a short title and nothing else, so the glyph is the only thing the two renders differ by:
    /// the title does not reflow with the reserve and there is no hero to move.
    @Test func theOpenGlyphIsCentredInTheActionBox() throws {
        try DSRenderCapability.requireRasterizing()
        let tokens = Self.tokens(.light)
        let plain = try #require(Self.bytes(Self.render(DSCard("Open", action: .none), scheme: .light)))
        let pressable = try #require(Self.bytes(Self.render(DSCard("Open", action: .open, onAction: {}), scheme: .light)))
        #expect(plain.count == pressable.count)
        let width = Int(Self.side)
        var lastColumn = -1
        for index in stride(from: 0, to: min(plain.count, pressable.count), by: 4) {
            let differs = (0..<4).contains { plain[index + $0] != pressable[index + $0] }
            if differs { lastColumn = max(lastColumn, (index / 4) % width) }
        }
        #expect(lastColumn >= 0, "the open glyph changed no pixel: the two renders are identical")
        let inset = (tokens.size.controlMd - tokens.size.iconSm) / 2
        let contentEdge = Self.side - tokens.space.cardPadding
        #expect(
            CGFloat(lastColumn) <= contentEdge - inset + 1,
            "the glyph ends at \(lastColumn), not centred in the \(tokens.size.controlMd) pt box inside \(contentEdge)"
        )
        #expect(
            CGFloat(lastColumn) >= contentEdge - inset - tokens.size.iconSm,
            "the glyph ends at \(lastColumn), left of its own box"
        )
    }

    // MARK: - Behavior 7: the tint lies on the page

    /// Inside a tinted card, below its header and clear of its rounded corners: the card's own fill.
    static var tintSample: CGPoint { CGPoint(x: side / 2, y: side - 8) }

    @Test(arguments: [ColorScheme.light, .dark])
    func aTintedCardIsTheTintOverThePage(_ scheme: ColorScheme) throws {
        try DSRenderCapability.requireRasterizing()
        let tokens = Self.tokens(scheme)
        let card = DSCard("Sensor", caption: "Active", variant: .tinted, onAction: {})
        let drawn = Self.pixel(Self.render(card, scheme: scheme), at: Self.tintSample)
        let centre = CGPoint(x: Self.side / 2, y: Self.side / 2)
        let overPage = Self.pixel(
            Self.render(Self.swatch([tokens.color.bgPage, tokens.color.bgTintAccent]), scheme: scheme), at: centre
        )
        let overSurface = Self.pixel(
            Self.render(
                Self.swatch([tokens.color.bgPage, tokens.color.bgSurface, tokens.color.bgTintAccent]), scheme: scheme
            ),
            at: centre
        )
        #expect(drawn != nil)
        #expect(Self.close(drawn, overPage), "\(scheme): \(String(describing: drawn)) vs the tint on the page \(String(describing: overPage))")
        // The tint replaces the solid fill; it does not lie on top of it.
        #expect(!Self.close(drawn, overSurface, within: 2), "\(scheme): the tint is lying on color.bg.surface")
    }

    // MARK: - Behavior 6: the disc's fill per published material

    /// Inside the disc at the padding corner, halfway between the glyph's box and the disc's edge, so neither the
    /// glyph nor the hairline ring is read.
    static func discSample(_ tokens: DSTokenSet) -> CGPoint {
        let radius = tokens.size.controlMd / 2
        let offset = (tokens.size.iconSm / 2 + radius) / 2
        return CGPoint(x: side - tokens.space.cardPadding - radius, y: tokens.space.cardPadding + radius - offset)
    }

    static func discCard(_ variant: DSCardVariant) -> some View {
        DSCard(
            "Line 4", caption: "Running", variant: variant,
            action: .custom(glyph: .actionPause, label: "Pause line 4"),
            hero: DSCardHero("86", trailing: ".4", unit: "%"),
            backdrop: variant == .glass ? .image : .none, onAction: {}
        )
    }

    @Test(arguments: [ColorScheme.light, .dark])
    func theCustomDiscTakesTheSchemesInverseEverywhereButVivid(_ scheme: ColorScheme) throws {
        try DSRenderCapability.requireRasterizing()
        let tokens = Self.tokens(scheme)
        let sample = Self.discSample(tokens)
        let centre = CGPoint(x: Self.side / 2, y: Self.side / 2)
        let inverse = Self.pixel(Self.render(Self.swatch([tokens.color.bgFillInverse]), scheme: scheme), at: centre)
        let media = Self.pixel(Self.render(Self.swatch([tokens.color.bgFillInverseMedia]), scheme: scheme), at: centre)
        #expect(inverse != nil && media != nil)
        for variant in [DSCardVariant.solid, .tinted, .glass] {
            let drawn = Self.pixel(Self.render(Self.discCard(variant), scheme: scheme), at: sample)
            #expect(Self.close(drawn, inverse), "\(variant) in \(scheme): \(String(describing: drawn)) vs color.bg.fill.inverse \(String(describing: inverse))")
        }
        let vivid = Self.pixel(Self.render(Self.discCard(.vivid), scheme: scheme), at: sample)
        #expect(Self.close(vivid, media), "vivid in \(scheme): \(String(describing: vivid)) vs color.bg.fill.inverse-media \(String(describing: media))")
    }

    /// In light the two pairs differ, so the glass row above is not passing because every cell resolves alike; in
    /// dark `color.bg.fill.inverse` is itself white and the two coincide, which is the point of ADR-0029 §1.
    @Test func theTwoInverseFillsDifferInLight() throws {
        try DSRenderCapability.requireRasterizing()
        let tokens = Self.tokens(.light)
        let centre = CGPoint(x: Self.side / 2, y: Self.side / 2)
        let inverse = Self.pixel(Self.render(Self.swatch([tokens.color.bgFillInverse]), scheme: .light), at: centre)
        let media = Self.pixel(Self.render(Self.swatch([tokens.color.bgFillInverseMedia]), scheme: .light), at: centre)
        #expect(inverse != nil)
        #expect(!Self.close(inverse, media, within: 8))
    }
}
#endif
