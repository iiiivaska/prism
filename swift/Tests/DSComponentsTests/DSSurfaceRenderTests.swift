import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// What `DSSurfaceView` draws, read back from renders: the glass fallback paints exactly the raised surface over the
/// page (or inverse when selected), glass itself does not, and the published context reaches descendants.
///
/// Each comparison renders two surfaces through the same pipeline and compares their centre pixels, so no colour
/// value is restated here: the tokens decide both sides.
@MainActor
@Suite("Surface renders (ADR-0022 §1)", .serialized)
struct DSSurfaceRenderTests {
    static let side: CGFloat = 96

    static func centre(_ view: some View, scheme: ColorScheme) -> [UInt8]? {
        let content = DSTheme {
            view.frame(width: side, height: side).dsBackdrop { DSExampleImage() }
        }
        .environment(\.colorScheme, scheme)
        let renderer = ImageRenderer(content: content)
        renderer.scale = 1
        renderer.isOpaque = true
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
        return [pixel[0], pixel[1], pixel[2]]
    }

    static func surface(_ material: DSSurfaceMaterial, backdrop: DSBackdropKind = .image, selected: Bool = false) -> some View {
        DSSurfaceView(material: material, radius: .none, padding: .none, backdrop: backdrop, selected: selected) {
            Color.clear.frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    /// Every pixel down one column of a `side × side` render, top to bottom in image order.
    static func column(_ view: some View, side: CGFloat, x: Int, scheme: ColorScheme) -> [[UInt8]]? {
        let content = DSTheme {
            view.frame(width: side, height: side).dsBackdrop { DSExampleImage() }
        }
        .environment(\.colorScheme, scheme)
        let renderer = ImageRenderer(content: content)
        renderer.scale = 1
        renderer.isOpaque = true
        guard let image = renderer.cgImage,
              let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: image.width, height: image.height, bitsPerComponent: 8,
                  bytesPerRow: image.width * 4, space: space,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              ),
              x >= 0, x < image.width
        else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: CGFloat(image.width), height: CGFloat(image.height)))
        guard let data = context.data else { return nil }
        let pixels = data.bindMemory(to: UInt8.self, capacity: image.width * image.height * 4)
        return (0..<image.height).map { y in
            let offset = (y * image.width + x) * 4
            return [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        }
    }

    /// The largest jump between two neighbouring pixels of a column, over any channel: what a hard-edged mask leaves
    /// behind and a gradient does not.
    static func largestStep(_ column: [[UInt8]]) -> Int {
        zip(column, column.dropFirst()).reduce(0) { largest, pair in
            max(largest, zip(pair.0, pair.1).map { abs(Int($0) - Int($1)) }.max() ?? 0)
        }
    }

    static func close(_ a: [UInt8]?, _ b: [UInt8]?, within tolerance: Int = 1) -> Bool {
        guard let a, let b, a.count == b.count else { return false }
        return zip(a, b).allSatisfy { abs(Int($0) - Int($1)) <= tolerance }
    }

    @Test(arguments: [ColorScheme.light, .dark])
    func reduceTransparencyPaintsRaisedOverThePage(_ scheme: ColorScheme) {
        let raised = Self.centre(Self.surface(.raised), scheme: scheme)
        for material in [DSSurfaceMaterial.glass, .glassLight] {
            let fallback = Self.centre(Self.surface(material).dsAccessibilityPolicy(reduceTransparency: true), scheme: scheme)
            #expect(Self.close(fallback, raised), "\(material) in \(scheme): \(String(describing: fallback)) vs raised \(String(describing: raised))")
        }
    }

    @Test(arguments: [ColorScheme.light, .dark])
    func anInvalidBackdropPaintsRaised(_ scheme: ColorScheme) {
        let raised = Self.centre(Self.surface(.raised), scheme: scheme)
        let fallback = Self.centre(Self.surface(.glass, backdrop: .none), scheme: scheme)
        #expect(Self.close(fallback, raised), "\(scheme)")
    }

    @Test(arguments: [ColorScheme.light, .dark])
    func aSelectedGlassSurfacePaintsInverseUnderTheFallback(_ scheme: ColorScheme) {
        let inverse = Self.centre(Self.surface(.inverse), scheme: scheme)
        let selected = Self.centre(Self.surface(.glass, selected: true).dsAccessibilityPolicy(reduceTransparency: true), scheme: scheme)
        #expect(Self.close(selected, inverse), "\(scheme)")
        // Without the fallback, selection changes nothing a Surface draws.
        let glass = Self.centre(Self.surface(.glass), scheme: scheme)
        let selectedGlass = Self.centre(Self.surface(.glass, selected: true), scheme: scheme)
        #expect(Self.close(glass, selectedGlass), "\(scheme)")
    }

    @Test(arguments: [ColorScheme.light, .dark])
    func glassDoesNotPaintRaised(_ scheme: ColorScheme) {
        let raised = Self.centre(Self.surface(.raised), scheme: scheme)
        let glass = Self.centre(Self.surface(.glass), scheme: scheme)
        #expect(glass != nil && !Self.close(glass, raised, within: 0), "\(scheme)")
    }

    /// A `glassLight` Surface in the dark scheme, where `material.glass.light.fill.bloom` is the system's one non-zero
    /// bloom (0.35), at a card-sized frame: the block `DSSurfaceAppearance.headerBlock` computes falls inside this
    /// column at every density.
    static func bloomingSurface(cardHeader: Bool) -> some View {
        let surface = DSSurfaceView(material: .glassLight, radius: .none, padding: .none, backdrop: .image) {
            Color.clear.frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        return cardHeader ? surface.cardHeaderBlock() : surface
    }

    /// Surface.yaml leaves the glass bloom out of **the card** header block. A Surface that carries no card header has
    /// no such block, so its bloom is drawn whole and falls off as its gradient does: no two neighbouring pixels down
    /// the bloom jump. Cutting the fixed block out of every Surface instead put a hard-edged notch in the bloom of a
    /// plain `glassLight` surface, which is the artifact this pins (see `DSSurfaceLayers.glassBloom(_:)`).
    ///
    /// The same surface with a card header keeps the cut, and its jump is what makes this test sensitive: were the
    /// bloom missing altogether, both columns would be smooth and the first assertion would pass for the wrong reason.
    @Test func theGlassBloomIsWholeWithoutACardHeader() throws {
        let side: CGFloat = 200
        let x = 60
        let whole = try #require(Self.column(Self.bloomingSurface(cardHeader: false), side: side, x: x, scheme: .dark))
        let cut = try #require(Self.column(Self.bloomingSurface(cardHeader: true), side: side, x: x, scheme: .dark))
        // Inside the shape, clear of the 1 px edge at either end of the column.
        let inside = { (column: [[UInt8]]) in Array(column[2..<(column.count - 2)]) }
        let wholeStep = Self.largestStep(inside(whole))
        let cutStep = Self.largestStep(inside(cut))
        #expect(wholeStep <= 4, "the bloom of a Surface without a card header jumps by \(wholeStep)")
        #expect(cutStep >= 12, "the card header block no longer cuts the bloom (largest jump \(cutStep))")
    }

    /// The context a Surface publishes reaches the views inside it: the material it renders.
    @Test func descendantsReadThePublishedMaterial() {
        var published: [DSSurfaceMaterial: DSSurfaceContext] = [:]
        for material in [DSSurfaceMaterial.solid, .vivid, .inverse] {
            let probe = ContextProbe()
            let view = DSTheme {
                DSSurfaceView(material: material) { ContextReader(probe: probe) }
            }
            _ = ImageRenderer(content: view).cgImage
            published[material] = probe.value
        }
        #expect(published[.solid] == DSSurfaceContext(material: .solid))
        #expect(published[.vivid]?.material == (DSPlatform.isWatch ? .solid : .vivid))
        #expect(published[.inverse] == DSSurfaceContext(material: .inverse))
    }
}

final class ContextProbe {
    var value: DSSurfaceContext?
}

struct ContextReader: View {
    let probe: ContextProbe
    @Environment(\.dsSurfaceContext) private var context

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site.
    init(probe: ContextProbe) {
        self.probe = probe
    }

    var body: some View {
        probe.value = context
        return Color.clear.frame(width: 1, height: 1)
    }
}
