#if os(iOS)
import CoreGraphics
import Foundation
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// What the glass chip draws, read back from renders (ADR-0036 rules 4 and 7):
///
/// - `DSBackdropMirror`'s `inBounds` mode reads only the backdrop under its own box and reflects it past the box's
///   edges, as Chromium's `backdrop-filter` does. Over ADR-0036 F2's stripe fixture it matches F2's reflection model,
///   within a tolerance this suite states and shows to tell that model apart from the clamp and transparency models.
///   Before the blur, the crop is mirrored about every edge and corner, again and again, until the band is covered.
/// - The chip's fallback paints `color.bg.surface.raised` over `color.bg.page`, in both schemes.
///
/// **Why this is a simulator suite.** The fallback's two colours are `Colors.xcassets` entries, which only a run that
/// compiles the catalog resolves (`DSRenderCapability`; README.md, "Why the pixel suites live here"). The stripe fixture
/// is drawn in literal black and white, but its measurement belongs to the renderer the baselines are taken with, the
/// pinned iPhone 17 simulator, so it runs there too.
@MainActor
@Suite("Glass chip renders (ADR-0036 §6)", .serialized)
struct DSSurfaceChipRenderTests {
    // MARK: - ADR-0036 F2: the stripe fixture

    /// The page around the box, wide enough that `bleed` samples only black past the box, as F2's page is.
    static let margin: CGFloat = 40

    /// F2's backdrop: black, with a white stripe from `DSEdgeModel.stripeStart` to `stripeEnd` inside the box's leading
    /// edge, running the page's full height. The box's own top-leading corner sits at `(margin, margin)`.
    static func stripes(box: CGSize) -> some View {
        ZStack(alignment: .topLeading) {
            Color(.sRGB, white: 0)
            Color(.sRGB, white: 1)
                .frame(width: DSEdgeModel.stripeEnd - DSEdgeModel.stripeStart, height: box.height + 2 * margin)
                .offset(x: margin + DSEdgeModel.stripeStart)
        }
        .frame(width: box.width + 2 * margin, height: box.height + 2 * margin, alignment: .topLeading)
    }

    /// The red channel of the box's middle row, rendered at 1× through `DSBackdropMirror` with `edge` over the fixture,
    /// with a recipe that blurs by the CSS standard deviation `sigma` and leaves saturation alone.
    static func middleRow(box: CGSize, sigma: CGFloat, edge: DSBackdropMirrorEdge) -> [UInt8]? {
        let page = CGSize(width: box.width + 2 * margin, height: box.height + 2 * margin)
        let space = "stripes"
        let pixels = DSBackdropSource(space: space, size: page, content: AnyView(stripes(box: box)))
        let recipe = DSGlassRecipe(
            token: .materialGlassChip, fill: .clear, blur: sigma, saturate: 1, edgeStart: 0, edgeEnd: 0, grain: 0, bloom: 0
        )
        let view = ZStack(alignment: .topLeading) {
            stripes(box: box)
            DSBackdropMirror(backdrop: pixels, recipe: recipe, shape: Rectangle(), edge: edge)
                .frame(width: box.width, height: box.height)
                .padding(.leading, margin)
                .padding(.top, margin)
        }
        .frame(width: page.width, height: page.height, alignment: .topLeading)
        .coordinateSpace(.named(space))
        let renderer = ImageRenderer(content: view)
        renderer.scale = 1
        renderer.isOpaque = true
        guard let image = renderer.cgImage,
              let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: image.width, height: image.height, bitsPerComponent: 8,
                  bytesPerRow: image.width * 4, space: colorSpace,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
        guard let data = context.data else { return nil }
        let bytes = data.bindMemory(to: UInt8.self, capacity: image.width * image.height * 4)
        let y = Int(margin + box.height / 2)
        return (0..<Int(box.width)).map { bytes[(y * image.width + Int(margin) + $0) * 4] }
    }

    /// The root-mean-square difference of two profiles, in 8-bit code values.
    static func rms(_ a: [Double], _ b: [Double]) -> Double {
        (zip(a, b).map { ($0 - $1) * ($0 - $1) }.reduce(0, +) / Double(a.count)).squareRoot()
    }

    /// How close a render must come to the reflection model: a root-mean-square difference of 3 code values over the
    /// columns read. SwiftUI's blur kernel is not exactly the Gaussian the model convolves with: it reads 3 values low
    /// right at the edge and 1 to 2 high in the tail, 1.6 in all (measured on the iOS 26.5 simulator), and Surface's
    /// `bleed` reads the clamp model 1.3 off the same way. So the tolerance is not tighter.
    static let tolerance = 3.0

    /// ADR-0036 F2 and rule 7. The fixture is F2's: a 200 pt box over black, a 4 pt white stripe 2 pt inside its leading
    /// edge, a blur of standard deviation 10. The first sixteen columns of the box's middle row are read, where the
    /// three models F2 names come apart.
    @Test func theInBoundsMirrorReadsTheReflectionModel() throws {
        let box = CGSize(width: 200, height: 40)
        let sigma = 10.0
        let columns = Array(0..<16)
        let model = { (edge: DSEdgeModel) in columns.map { edge.value(column: $0, width: box.width, sigma: sigma) } }
        let reflection = model(.reflection)
        let clamp = model(.clamp)
        let transparency = model(.transparency)

        // The model is F2's: its first eight columns are the ones ADR-0036 prints for the reflection model.
        #expect(reflection.prefix(8).map { Int($0.rounded()) } == [75, 74, 73, 71, 69, 66, 63, 59])

        // The tolerance tells the three models apart: each of the other two is more than twice the tolerance from the
        // reflection model, so a render within the tolerance of either could not be within it of the reflection model.
        #expect(Self.rms(clamp, reflection) > 2 * Self.tolerance, "clamp is \(Self.rms(clamp, reflection)) from reflection")
        #expect(
            Self.rms(transparency, reflection) > 2 * Self.tolerance,
            "transparency is \(Self.rms(transparency, reflection)) from reflection"
        )

        let row = try #require(Self.middleRow(box: box, sigma: CGFloat(sigma), edge: .inBounds))
        let measured = columns.map { Double(row[$0]) }
        let distance = Self.rms(measured, reflection)
        #expect(
            distance <= Self.tolerance,
            "inBounds read \(measured.map { Int($0) }) against the reflection model's \(reflection.map { Int($0.rounded()) }): \(distance) apart"
        )

        // The control: the same fixture and readout under Surface's bleed, which samples the black page past the box,
        // read the clamp model. So the readout can see the edge mode, and the pass above is the mode's.
        let bleed = try #require(Self.middleRow(box: box, sigma: CGFloat(sigma), edge: .bleed))
        let bled = columns.map { Double(bleed[$0]) }
        #expect(Self.rms(bled, clamp) <= Self.tolerance, "bleed read \(bled.map { Int($0) }) against the clamp model's \(clamp.map { Int($0.rounded()) })")
        #expect(Self.rms(bled, reflection) > Self.tolerance, "bleed read the reflection model")
    }

    /// ADR-0036 §6 step 2, read before the blur, where it can be read exactly: `DSMirroredBand` lays the crop out
    /// mirrored about each edge and each corner, again and again, until the band around it is covered. The crop is
    /// 10 × 8 pt with a white 3 × 2 block near its top-leading corner, so no copy is its own mirror image; the band is
    /// 30 pt, three times the crop's width, so on every side the copies have to repeat. Every pixel of the band, corners
    /// included, must be the crop's pixel at the mirrored position — Skia's mirror tile mode, which is Chromium's.
    ///
    /// The blurred readout above cannot check this on a narrow box. Over a pattern that repeats every few points
    /// SwiftUI's blur drifts from the Gaussian, by 10 code values on a 6 pt box, while leaving out every copy past the
    /// first moves a 12 pt box's readout by less than 2 (both measured on the iOS 26.5 simulator).
    @Test func theBandMirrorsTheCropAboutEveryEdgeAndCornerUntilItIsCovered() throws {
        let crop = CGSize(width: 10, height: 8)
        let band: CGFloat = 30
        let block = CGRect(x: 1, y: 1, width: 3, height: 2)
        let tile = ZStack(alignment: .topLeading) {
            Color(.sRGB, white: 0)
            Color(.sRGB, white: 1)
                .frame(width: block.width, height: block.height)
                .offset(x: block.minX, y: block.minY)
        }
        .frame(width: crop.width, height: crop.height, alignment: .topLeading)
        .clipped()
        let view = DSMirroredBand(crop: tile, size: crop, band: band)
        let width = Int(crop.width + 2 * band), height = Int(crop.height + 2 * band)
        let pixels = try #require(Self.redChannel(view, width: width, height: height))

        /// Where the mirror tile mode samples the crop for a position `t` along a side `length` long.
        func mirrored(_ t: Int, _ length: Int) -> Int {
            let period = 2 * length
            let phase = ((t % period) + period) % period
            return phase < length ? phase : period - 1 - phase
        }
        var mismatches: [String] = []
        for y in 0..<height {
            for x in 0..<width {
                let source = CGPoint(
                    x: CGFloat(mirrored(x - Int(band), Int(crop.width))) + 0.5,
                    y: CGFloat(mirrored(y - Int(band), Int(crop.height))) + 0.5
                )
                let expected = block.contains(source) ? 255 : 0
                let read = Int(pixels[y * width + x])
                if abs(read - expected) > 1 { mismatches.append("(\(x - Int(band)), \(y - Int(band))) read \(read)") }
            }
        }
        #expect(mismatches.isEmpty, "\(mismatches.count) of \(width * height) band pixels are not the crop mirrored: \(mismatches.prefix(12).joined(separator: ", "))")
    }

    /// The red channel of every pixel of `view` rendered at 1× in a `width × height` frame, row by row.
    static func redChannel(_ view: some View, width: Int, height: Int) -> [UInt8]? {
        let renderer = ImageRenderer(content: view.frame(width: CGFloat(width), height: CGFloat(height)))
        renderer.scale = 1
        renderer.isOpaque = true
        guard let image = renderer.cgImage, image.width == width, image.height == height,
              let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
                  space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        guard let data = context.data else { return nil }
        let bytes = data.bindMemory(to: UInt8.self, capacity: width * height * 4)
        return (0..<(width * height)).map { bytes[$0 * 4] }
    }

    // MARK: - ADR-0036 rule 4: the fallback

    static let side: CGFloat = 96

    /// The centre pixel of `view` filling a `side × side` frame over the synthetic image, in `scheme`.
    static func centre(_ view: some View, scheme: ColorScheme) -> [UInt8]? {
        let content = DSTheme {
            view.frame(width: side, height: side).dsBackdrop(.image) { DSExampleImage() }
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

    static func close(_ a: [UInt8]?, _ b: [UInt8]?, within tolerance: Int = 1) -> Bool {
        guard let a, let b, a.count == b.count else { return false }
        return zip(a, b).allSatisfy { abs(Int($0) - Int($1)) <= tolerance }
    }

    /// A chip that asks for glass on every ground, filling its frame.
    static var chip: some View {
        Color.clear
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .dsSurfaceChip({ _ in .glass }, in: Capsule())
    }

    /// `color.bg.surface.raised` painted over `color.bg.page`, the two cells every chip spec binds as
    /// `fallbackBackground` and `fallbackUnderlay`. The tokens decide both sides of the comparison, so no colour value
    /// is restated here.
    struct RaisedOverThePage: View {
        private var ds = DSThemeValues()

        init() {}

        var body: some View {
            ZStack {
                ds.tokens.color.bgPage
                ds.tokens.color.bgSurfaceRaised
            }
        }
    }

    @Test(arguments: [ColorScheme.light, .dark])
    func theFallbackPaintsRaisedOverThePage(_ scheme: ColorScheme) throws {
        try DSRenderCapability.requireRasterizing()
        let raisedOverThePage = Self.centre(RaisedOverThePage(), scheme: scheme)
        let reduceTransparency = Self.centre(Self.chip.dsAccessibilityPolicy(reduceTransparency: true), scheme: scheme)
        let increaseContrast = Self.centre(Self.chip.dsAccessibilityPolicy(increasedContrast: true), scheme: scheme)
        #expect(
            Self.close(reduceTransparency, raisedOverThePage),
            "Reduce Transparency in \(scheme): \(String(describing: reduceTransparency)) vs \(String(describing: raisedOverThePage))"
        )
        #expect(
            Self.close(increaseContrast, raisedOverThePage),
            "Increase Contrast in \(scheme): \(String(describing: increaseContrast)) vs \(String(describing: raisedOverThePage))"
        )
        // The control: without a trigger the same chip renders the recipe over the image, which is not that colour.
        let glass = Self.centre(
            Self.chip.dsAccessibilityPolicy(increasedContrast: false, reduceTransparency: false), scheme: scheme
        )
        #expect(glass != nil && !Self.close(glass, raisedOverThePage, within: 0), "glass in \(scheme)")
    }
}

/// ADR-0036 F2's three models of what a blur reads past a box's edges, for its fixture: a white stripe from
/// `stripeStart` to `stripeEnd` over black, inside a box `width` wide, blurred with the Gaussian of standard deviation
/// `sigma`. Each value is in 8-bit code values at the centre of a pixel column, the gamma-encoded values averaged as
/// they are, which is what Chromium's blur does and what SwiftUI's does too: Surface's `bleed` over the black page reads
/// the clamp model in those terms.
enum DSEdgeModel {
    /// Past each edge, the box's content mirrored about that edge, again and again: Chromium's (F2) and `inBounds`.
    case reflection
    /// Past the edge, the edge column repeated; here black, since the stripe starts inside the box.
    case clamp
    /// Past the edge, nothing: the kernel's weight inside the box renormalised.
    case transparency

    static let stripeStart: CGFloat = 2
    static let stripeEnd: CGFloat = 6

    /// The standard normal distribution function.
    static func phi(_ z: Double) -> Double { 0.5 * erfc(-z / 2.squareRoot()) }

    /// The share of the kernel centred at `centre` that falls on `[start, end)`.
    static func mass(_ start: Double, _ end: Double, centre: Double, sigma: Double) -> Double {
        phi((end - centre) / sigma) - phi((start - centre) / sigma)
    }

    func value(column: Int, width: CGFloat, sigma: Double) -> Double {
        let centre = Double(column) + 0.5
        let w = Double(width)
        let start = Double(Self.stripeStart), end = Double(Self.stripeEnd)
        let share: Double
        switch self {
        case .reflection:
            // Mirroring about both edges repeats the box with period 2w: the stripe and its mirror image in every period.
            let periods = Int((6 * sigma / w).rounded(.up)) + 1
            share = (-periods...periods).reduce(0) { sum, period in
                let shift = 2 * Double(period) * w
                return sum
                    + Self.mass(start + shift, end + shift, centre: centre, sigma: sigma)
                    + Self.mass(-end + shift, -start + shift, centre: centre, sigma: sigma)
            }
        case .clamp:
            share = Self.mass(start, end, centre: centre, sigma: sigma)
        case .transparency:
            share = Self.mass(start, end, centre: centre, sigma: sigma) / Self.mass(0, w, centre: centre, sigma: sigma)
        }
        return 255 * share
    }
}
#endif
