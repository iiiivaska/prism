import CoreGraphics
import SwiftUI
import Testing
import DSTokens

/// Whether this process can read a Prism render back as pixels at all.
///
/// Every Prism colour is a catalog entry: `DSColorToken.color(_:)` is `Color(<brand>/<token>, bundle: .module)`,
/// resolved out of the generated `Colors.xcassets`. `xcodebuild` compiles that catalog with actool, so a simulator
/// run resolves every name. `swift test` under SwiftPM's legacy build system copies the catalog **uncompiled**,
/// without an `Assets.car` — which is why `ColorCatalogTests` skips DSTokensTests there, in those words — and every
/// one of those names then resolves to nothing and paints clear.
///
/// Layout, body evaluation and the image's size survive that intact, so a geometry probe, an environment probe and
/// `cgImage != nil` all keep passing while the raster is empty. That is the dangerous part: two blank renders compare
/// **equal**, so a pixel test that asserts two things look alike passes on nothing at all, and only one that asserts
/// two things differ fails. A test that reads pixels therefore asks this first.
///
/// The probe renders two known token colours and reads them back: a process that can rasterize returns both opaque
/// and returns them different from each other. A process whose catalog is missing returns transparent black for both.
@MainActor
enum DSRenderCapability {
    /// Why this process cannot read pixels, and where the coverage that needs them runs instead.
    nonisolated static let unavailable = """
        this process renders Prism views blank: swift test copies Colors.xcassets uncompiled, so every token colour \
        resolves to nothing and the raster comes back empty. The pixel checks run on the simulator, where xcodebuild \
        compiles the catalog: xcodebuild test -scheme Prism-Package -only-testing:DSSnapshotTests -destination \
        'platform=iOS Simulator,name=iPhone 17,OS=26.5'
        """

    nonisolated static var unavailableComment: Comment { Comment(rawValue: unavailable) }

    /// The probe's frame: small, and large enough to have a centre that is not an edge pixel.
    nonisolated static let side: CGFloat = 8

    /// The two token colours the probe paints. They are read in one appearance, so nothing here depends on the
    /// scheme reaching the catalog — only on the names resolving at all.
    static var ground: Color { DSTokenSet(DSTokenContext()).color.bgPage }
    static var ink: Color { DSTokenSet(DSTokenContext()).color.bgFillInverse }

    /// The centre pixel of a full-bleed render of one colour, as R, G, B, A; nil when no image came back.
    ///
    /// `isOpaque` is off on purpose: the renderer then has no ground of its own, and the alpha that comes back is the
    /// colour's own. An opaque token colour reads 255; a name the catalog could not resolve reads 0.
    static func pixel(_ colour: Color) -> [UInt8]? {
        let renderer = ImageRenderer(content: colour.frame(width: side, height: side))
        renderer.scale = 1
        renderer.isOpaque = false
        guard let image = renderer.cgImage,
              let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4, space: space,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        let x = CGFloat(image.width) / 2
        let y = CGFloat(image.height) / 2
        context.draw(image, in: CGRect(x: -x, y: -y, width: CGFloat(image.width), height: CGFloat(image.height)))
        guard let data = context.data else { return nil }
        let pixel = data.bindMemory(to: UInt8.self, capacity: 4)
        return [pixel[0], pixel[1], pixel[2], pixel[3]]
    }

    /// What the probe saw, for a failure message.
    static var report: String {
        let ground = pixel(Self.ground).map { "\($0)" } ?? "no image"
        let ink = pixel(Self.ink).map { "\($0)" } ?? "no image"
        return "color.bg.page rendered \(ground), color.bg.fill.inverse rendered \(ink); \(unavailable)"
    }

    /// True when a render of a known token colour comes back opaque, and two different token colours come back
    /// different. Measured once: the answer is a property of the process, not of the view under test.
    static var rasterizes: Bool {
        if let cached { return cached }
        let answer = measure()
        cached = answer
        return answer
    }

    private static var cached: Bool?

    private static func measure() -> Bool {
        guard let ground = pixel(Self.ground), let ink = pixel(Self.ink) else { return false }
        return ground[3] == 255 && ink[3] == 255 && ground != ink
    }
}

extension DSRenderCapability {
    /// The first thing a test that reads pixels asserts. A process that cannot rasterize fails here, naming what the
    /// probe saw, instead of comparing one empty image with another and calling them alike.
    static func requireRasterizing(sourceLocation: SourceLocation = #_sourceLocation) throws {
        try #require(
            rasterizes,
            Comment(rawValue: "the renderer returned a blank raster, so every pixel read here would read nothing: \(report)"),
            sourceLocation: sourceLocation
        )
    }
}
