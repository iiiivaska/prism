#if os(iOS)
import CoreGraphics
import Foundation
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// What the glass chip draws, read back from renders (ADR-0036 rules 4, 6 and 7):
///
/// - `DSBackdropMirror`'s `inBounds` mode reads only the backdrop under its own box and reflects it past the box's
///   edges, as Chromium's `backdrop-filter` does. Over ADR-0036 F2's stripe fixture it matches F2's reflection model,
///   within a tolerance this suite states and shows to tell that model apart from the clamp and transparency models.
///   Before the blur, the crop is mirrored about every edge and corner, again and again, until the band is covered; the
///   blur reads those reflections as far out as its kernel has weight, not whatever lies past the band (§6 step 2); and
///   the mirror paints nothing outside its shape (step 5).
/// - On the scheme's glass, on light glass and inside another glass chip, a glass chip draws the recipe's fill and edge,
///   the edge with the colour, alphas and width the tokens give it, and no mirror (§5).
/// - The chip's fallback paints `color.bg.surface.raised` over `color.bg.page`, in both schemes.
/// - A chip inside another chip samples nothing (ADR-0037 rules 1 and 2, checked with Chip, the first component that
///   nests one): inside a host that renders nothing it draws the recipe flat, the sharp stripe under its fill, and inside
///   a host that renders its own cell it has no media under it and reads the fallback.
///
/// **Why this is a simulator suite.** The chip's colours, and those of the glass it sits on, are `Colors.xcassets`
/// entries, which only a run that compiles the catalog resolves (`DSRenderCapability`; README.md, "Why the pixel suites
/// live here"). The stripe fixtures are drawn in literal black and white, but their measurement belongs to the renderer
/// the baselines are taken with, the pinned iPhone 17 simulator, so they run there too.
@MainActor
@Suite("Glass chip renders (ADR-0036 §5, §6; ADR-0037 rules 1 and 2)", .serialized)
struct DSSurfaceChipRenderTests {
    // MARK: - ADR-0036 F2: the stripe fixture

    /// The page around the box, wide enough that `bleed` samples only black past the box, as F2's page is.
    static let margin: CGFloat = 40

    /// F2's backdrop: black, with a white stripe at `stripe`, measured from the box's leading edge, running the page's
    /// full height. The box's own top-leading corner sits at `(margin, margin)`.
    static func stripes(box: CGSize, stripe: Range<CGFloat> = DSEdgeModel.stripe) -> some View {
        ZStack(alignment: .topLeading) {
            Color(.sRGB, white: 0)
            Color(.sRGB, white: 1)
                .frame(width: stripe.upperBound - stripe.lowerBound, height: box.height + 2 * margin)
                .offset(x: margin + stripe.lowerBound)
        }
        .frame(width: box.width + 2 * margin, height: box.height + 2 * margin, alignment: .topLeading)
    }

    /// A recipe that blurs by the CSS standard deviation `sigma` and leaves saturation alone. Its fill, edge, grain and
    /// bloom are nothing, so only the mirror draws.
    static func recipe(sigma: CGFloat) -> DSGlassRecipe {
        DSGlassRecipe(
            token: .materialGlassChip, fill: .clear, blur: sigma, saturate: 1, edgeStart: 0, edgeEnd: 0, grain: 0, bloom: 0
        )
    }

    /// The red channel of the box's middle row, rendered at 1× through `DSBackdropMirror` with `edge` over the fixture
    /// with `stripe`, with `recipe(sigma:)`.
    static func middleRow(
        box: CGSize, sigma: CGFloat, edge: DSBackdropMirrorEdge, stripe: Range<CGFloat> = DSEdgeModel.stripe
    ) -> [UInt8]? {
        let page = CGSize(width: box.width + 2 * margin, height: box.height + 2 * margin)
        let space = "stripes"
        let pixels = DSBackdropSource(space: space, size: page, content: AnyView(stripes(box: box, stripe: stripe)))
        let view = ZStack(alignment: .topLeading) {
            stripes(box: box, stripe: stripe)
            DSBackdropMirror(backdrop: pixels, recipe: recipe(sigma: sigma), shape: Rectangle(), edge: edge)
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

    /// ADR-0036 §6 step 2, how far the band reaches: the blur reads the crop's reflections as far out as its kernel has
    /// weight, not whatever lies past the band. The two tests above cannot see this. F2's stripe lies 2 to 6 pt inside
    /// the edge, so a band of 1σ, 10 pt, already holds its reflection. Past that band the opaque blur repeats the band's
    /// black edge, and the reflection is black there too.
    ///
    /// So this fixture keeps its white out of a narrow band's reach. The box's first 12 pt (1.2σ) are black, and the
    /// rest of it, to the trailing edge, is white. What reaches the blur past the leading edge then depends on the band:
    ///  - the 3σ band reflects the white field from 12 pt out, where the kernel still has weight: the reflection model;
    ///  - a band that ends inside the black margin, 1σ among them, reflects only black, and past its end the opaque blur
    ///    can only repeat that black. That is the clamp model, which Surface's `bleed` reads too, since it samples the
    ///    black page there.
    ///
    /// Over this much white SwiftUI's kernel reads up to 6 code values above the Gaussian's tail, 3 of them on the white
    /// inside the box and 3 on its reflection (measured on the iOS 26.5 simulator), so the render is not held to the
    /// reflection model on its own. It is held to it through `bleed`, which blurs the same box with only black past the
    /// edge: the in-bounds mirror less the bleed, column by column, is what the reflections add, and the models say that
    /// they add the reflection model less the clamp model. The kernel's excess on the box's own white cancels in the
    /// difference; the rest measured 1.7 apart, inside the suite's tolerance of 3. A band that ends in the margin adds
    /// nothing, 11.9 from what the models say: more than twice the tolerance, so no render can be within it of both.
    ///
    /// So this pins the band past 12 pt, not at 3σ. A band that ends past the margin reflects the white field's edge and
    /// repeats that white beyond it, as the reflection has it, and reads the same here. A wider margin would pin a wider
    /// band, at the cost of the separation: past 2σ lies 2.3 % of the kernel, and the pipeline rendered with a 2σ band
    /// moved no column of this fixture by more than one code value (measured on the iOS 26.5 simulator).
    @Test func theBlurReadsTheReflectionsAsFarAsItsKernelReaches() throws {
        let box = CGSize(width: 200, height: 40)
        let sigma = 10.0
        let field: Range<CGFloat> = 12..<box.width
        let columns = Array(0..<16)
        let model = { (edge: DSEdgeModel) in
            columns.map { edge.value(column: $0, width: box.width, sigma: sigma, stripe: field) }
        }
        let clamp = model(.clamp)
        let added = zip(model(.reflection), clamp).map { $0 - $1 }
        let nothing = columns.map { _ in 0.0 }

        // The tolerance tells the two bands apart: what the 3σ band adds is more than twice the tolerance from nothing.
        #expect(Self.rms(added, nothing) > 2 * Self.tolerance, "the reflections add \(Self.rms(added, nothing)) in all")

        let mirrored = try #require(Self.middleRow(box: box, sigma: CGFloat(sigma), edge: .inBounds, stripe: field))
        let bleed = try #require(Self.middleRow(box: box, sigma: CGFloat(sigma), edge: .bleed, stripe: field))

        // The control: past the box the bleed samples only the black page, which is all a band that ends in the margin
        // hands the blur, and reads the clamp model. So the difference below is what the in-bounds mirror adds past the
        // edge.
        let bled = columns.map { Double(bleed[$0]) }
        #expect(
            Self.rms(bled, clamp) <= Self.tolerance,
            "bleed read \(bled.map { Int($0) }) against the clamp model's \(clamp.map { Int($0.rounded()) })"
        )

        let measured = columns.map { Double(mirrored[$0]) - Double(bleed[$0]) }
        let distance = Self.rms(measured, added)
        #expect(
            distance <= Self.tolerance,
            "the reflections added \(measured.map { Int($0) }) against the models' \(added.map { Int($0.rounded()) }): \(distance) apart"
        )
    }

    /// ADR-0036 §6 step 5: the mirror is clipped to the shape. Before the clip, the blurred band reaches 3σ past the
    /// frame on every side, and a capsule leaves the frame's four corners outside itself; none of that may show. The
    /// fixture hands the mirror a backdrop that is white everywhere and draws it over a black stage. So every pixel the
    /// mirror paints reads 255, and every pixel it leaves alone reads the stage's 0. Clipped or not, the two readings are
    /// 255 apart at every pixel past the outline, so a tolerance of 1 code value tells them apart. Pixels whose centre
    /// lies within 1 pt of the outline are anti-aliased, and are skipped.
    ///
    /// The shape is a capsule, not the rectangle of the tests above, so that clipping to the frame fails as well.
    @Test func theInBoundsMirrorPaintsNothingOutsideItsShape() throws {
        let box = CGSize(width: 120, height: 40)
        let page = CGSize(width: box.width + 2 * Self.margin, height: box.height + 2 * Self.margin)
        let space = "white"
        let white = DSBackdropSource(space: space, size: page, content: AnyView(Color(.sRGB, white: 1)))
        let view = ZStack(alignment: .topLeading) {
            Color(.sRGB, white: 0)
            DSBackdropMirror(
                backdrop: white, recipe: Self.recipe(sigma: 10), shape: Capsule(style: .circular), edge: .inBounds
            )
            .frame(width: box.width, height: box.height)
            .padding(.leading, Self.margin)
            .padding(.top, Self.margin)
        }
        .frame(width: page.width, height: page.height, alignment: .topLeading)
        .coordinateSpace(.named(space))
        let width = Int(page.width), height = Int(page.height)
        let red = try #require(Self.redChannel(view, width: width, height: height))
        let frame = CGRect(origin: CGPoint(x: Self.margin, y: Self.margin), size: box)

        var outside = 0, inside = 0
        var painted: [String] = [], unpainted: [String] = []
        for y in 0..<height {
            for x in 0..<width {
                let distance = Self.distance(x: x, y: y, toCapsuleIn: frame)
                let read = Int(red[y * width + x])
                if distance > 1 {
                    outside += 1
                    if read > 1 { painted.append("(\(x), \(y)) read \(read)") }
                } else if distance < -1 {
                    inside += 1
                    if read < 254 { unpainted.append("(\(x), \(y)) read \(read)") }
                }
            }
        }
        #expect(painted.isEmpty, "\(painted.count) of \(outside) pixels outside the capsule are painted: \(painted.prefix(12).joined(separator: ", "))")
        // The mirror does paint inside, so the pass above is the clip's and not an empty drawing's.
        #expect(unpainted.isEmpty, "\(unpainted.count) of \(inside) pixels inside the capsule are not painted: \(unpainted.prefix(12).joined(separator: ", "))")
    }

    /// The signed distance, in points, from the centre of pixel `(x, y)` to the outline of the circular capsule that
    /// fills `frame`: negative inside. The capsule is every point within half its short side of its spine, the segment
    /// between the centres of its two ends.
    static func distance(x: Int, y: Int, toCapsuleIn frame: CGRect) -> CGFloat {
        let radius = min(frame.width, frame.height) / 2
        let point = CGPoint(x: CGFloat(x) + 0.5, y: CGFloat(y) + 0.5)
        let nearest = CGPoint(
            x: min(max(point.x, frame.minX + radius), frame.maxX - radius),
            y: min(max(point.y, frame.minY + radius), frame.maxY - radius)
        )
        return hypot(point.x - nearest.x, point.y - nearest.y) - radius
    }

    /// Every pixel of `view` rendered at 1× in a `width × height` frame, as RGBA, row by row.
    static func rgba(_ view: some View, width: Int, height: Int) -> [UInt8]? {
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
        return Array(UnsafeBufferPointer(start: bytes, count: width * height * 4))
    }

    /// The red channel of every pixel of `view` rendered at 1× in a `width × height` frame, row by row.
    static func redChannel(_ view: some View, width: Int, height: Int) -> [UInt8]? {
        rgba(view, width: width, height: height).map { bytes in (0..<(width * height)).map { bytes[$0 * 4] } }
    }

    // MARK: - ADR-0036 §5: glass inside glass draws no mirror

    /// Where the §5 test puts a glass chip, over the synthetic image: on the scheme's glass, on light glass, inside
    /// another glass chip, or on the page itself. On the page the chip does blur, which makes it the control.
    enum Enclosure {
        case glass, glassLight, glassChip, page
    }

    /// The §5 test's stage, 160 × 96 pt, with the chip at its centre.
    static let stage = CGSize(width: 160, height: 96)
    /// The chip, a 64 × 32 pt pill.
    static let pill = CGSize(width: 64, height: 32)
    /// The coordinate space of the pixels handed to the chip: the stage's.
    static let handedSpace = "handed"

    /// A glass chip, `pill` large, handed `pixels` as the backdrop under it in place of the one its ground hands down.
    static func glassChip(handed pixels: Color) -> some View {
        Color.clear
            .frame(width: pill.width, height: pill.height)
            .dsSurfaceChip({ _ in .glass }, in: Capsule(style: .circular))
            .environment(\.dsBackdropSource, DSBackdropSource(space: handedSpace, size: stage, content: AnyView(pixels)))
    }

    /// The recipe's fill alone, in the chip's frame and shape. A glass chip that draws no mirror draws exactly this,
    /// except on its outline, where its edge is.
    struct RecipeFill: View {
        private var ds = DSThemeValues()

        init() {}

        var body: some View {
            Capsule(style: .circular)
                .fill(DSGlassAppearance.chip.recipe(ds.tokens.material).fill)
                .frame(width: DSSurfaceChipRenderTests.pill.width, height: DSSurfaceChipRenderTests.pill.height)
        }
    }

    /// The recipe's fill with the recipe's edge over it, in the chip's frame and shape: all a glass chip that draws no
    /// mirror draws. The edge is the one ADR-0036 §7 names, with the values the tokens give it: `color.edge.highlight`,
    /// from the recipe's `edge.start` alpha to its `edge.end`, `border.hairline` wide, on a ramp across the chip's own
    /// frame. It is drawn by `DSGlassEdge`, Surface's edge, whose ramp and stroke every glass Surface baseline holds; what
    /// this side pins is what the chip hands it. The tokens decide both sides of the comparison, so no value is restated.
    struct RecipeFillAndEdge: View {
        private var ds = DSThemeValues()

        init() {}

        var body: some View {
            let recipe = DSGlassAppearance.chip.recipe(ds.tokens.material)
            let size = DSSurfaceChipRenderTests.pill
            ZStack(alignment: .topLeading) {
                Capsule(style: .circular).fill(recipe.fill)
                DSGlassEdge(
                    shape: Capsule(style: .circular), color: ds.tokens.color.edgeHighlight, start: recipe.edgeStart,
                    end: recipe.edgeEnd, lineWidth: ds.tokens.border.hairline, size: size
                )
            }
            .frame(width: size.width, height: size.height, alignment: .topLeading)
            .compositingGroup()
        }
    }

    /// `content` in `enclosure`: a glass or light glass Surface over the image, a glass chip 12 pt larger than the pill
    /// on every side, or nothing.
    @ViewBuilder
    static func enclosed(_ content: some View, in enclosure: Enclosure) -> some View {
        switch enclosure {
        case .glass: DSSurfaceView(material: .glass, backdrop: .image) { content }
        case .glassLight: DSSurfaceView(material: .glassLight, backdrop: .image) { content }
        case .glassChip: content.padding(12).dsSurfaceChip({ _ in .glass }, in: Capsule(style: .circular))
        case .page: content
        }
    }

    /// Every pixel of `content` in `enclosure`, centred on the stage over the synthetic image, rendered at 1× in
    /// `scheme` with glass allowed to render, as RGBA, row by row.
    static func render(_ content: some View, in enclosure: Enclosure, scheme: ColorScheme) -> [UInt8]? {
        let view = DSTheme {
            enclosed(content, in: enclosure)
                .frame(width: stage.width, height: stage.height)
                .dsBackdrop(.image) { DSExampleImage() }
                .coordinateSpace(.named(handedSpace))
        }
        .environment(\.colorScheme, scheme)
        .dsAccessibilityPolicy(increasedContrast: false, reduceTransparency: false)
        return rgba(view, width: Int(stage.width), height: Int(stage.height))
    }

    /// ADR-0036 §5 and rule 6: a glass chip that renders the recipe on the scheme's glass, on light glass or inside
    /// another glass chip draws the recipe's fill and edge, and no mirror. The pixels it would blur are the ones the glass
    /// under it already blurred (F7), and Chromium draws `backdrop-filter: none` there.
    ///
    /// Three readings of each render, over the synthetic image:
    ///  1. **No mirror.** The chip is handed white pixels in one render and black ones in the other, in place of the
    ///     backdrop its ground hands down. A mirror would paint the one or the other under the fill, more than 150 code
    ///     values apart; without one, the two renders are identical byte for byte, and that is what is asked.
    ///  2. **Its fill.** More than 1.5 pt from its outline, the render equals the same enclosure with the recipe's fill
    ///     alone in the chip's place, within 1 code value.
    ///  3. **Its edge, as the tokens give it.** Within 1.5 pt of the outline, it differs from the fill alone by more
    ///     than that, 9 to 10 code values in light and 34 to 44 in dark: the edge is there, and the reading below can see
    ///     it. And at every pixel, the outline's included, the render equals the same enclosure with `RecipeFillAndEdge`
    ///     in the chip's place, within 1 code value (measured 0): the edge is `color.edge.highlight`, from `edge.start` to
    ///     `edge.end` on a ramp across the chip's own frame, `border.hairline` wide. An edge handed its alphas swapped,
    ///     one alpha for both, another colour, half the width or its frame turned on its side misses that by 2 to 45
    ///     code values (measured on the iOS 26.5 simulator); a wider one also reaches past 1.5 pt and fails reading 2.
    ///
    /// The control: on the page over the same image the chip does blur, and the pixels it is handed show. So reading 1
    /// can see a mirror, and the passes above are the rule's.
    @Test(arguments: [ColorScheme.light, .dark])
    func aGlassChipInsideGlassDrawsItsFillAndEdgeAndNoMirror(_ scheme: ColorScheme) throws {
        try DSRenderCapability.requireRasterizing()
        let white = Color(.sRGB, white: 1)
        let black = Color(.sRGB, white: 0)
        let width = Int(Self.stage.width)
        let frame = CGRect(
            x: (Self.stage.width - Self.pill.width) / 2, y: (Self.stage.height - Self.pill.height) / 2,
            width: Self.pill.width, height: Self.pill.height
        )
        for enclosure in [Enclosure.glass, .glassLight, .glassChip] {
            let handedWhite = try #require(Self.render(Self.glassChip(handed: white), in: enclosure, scheme: scheme))
            let handedBlack = try #require(Self.render(Self.glassChip(handed: black), in: enclosure, scheme: scheme))
            let fillAlone = try #require(Self.render(RecipeFill(), in: enclosure, scheme: scheme))
            let fillAndEdge = try #require(Self.render(RecipeFillAndEdge(), in: enclosure, scheme: scheme))

            let moved = zip(handedWhite, handedBlack).filter { $0 != $1 }.count
            #expect(moved == 0, "\(enclosure) in \(scheme): \(moved) bytes move with the pixels handed to the chip, so it mirrors them")

            var offOutline = 0, onOutline = 0, fromTheRecipe = 0
            for pixel in 0..<(handedWhite.count / 4) {
                // The largest difference over red, green and blue, written out as a loop: Swift 6.3 (Xcode 26.6, the
                // CI pin) cannot type-check it as one expression, `(0..<3).map { … }.max() ?? 0`, in reasonable time.
                var difference = 0
                var edgeDifference = 0
                for channel in 0..<3 {
                    let offset = pixel * 4 + channel
                    let drawn = Int(handedWhite[offset])
                    difference = max(difference, abs(drawn - Int(fillAlone[offset])))
                    edgeDifference = max(edgeDifference, abs(drawn - Int(fillAndEdge[offset])))
                }
                fromTheRecipe = max(fromTheRecipe, edgeDifference)
                if abs(Self.distance(x: pixel % width, y: pixel / width, toCapsuleIn: frame)) > 1.5 {
                    offOutline = max(offOutline, difference)
                } else {
                    onOutline = max(onOutline, difference)
                }
            }
            #expect(offOutline <= 1, "\(enclosure) in \(scheme): off its outline the chip differs from the recipe's fill alone by up to \(offOutline)")
            #expect(onOutline > 1, "\(enclosure) in \(scheme): on its outline the chip draws only what the fill alone draws, so no edge")
            #expect(fromTheRecipe <= 1, "\(enclosure) in \(scheme): the chip differs from the recipe's fill and edge by up to \(fromTheRecipe), so its edge is not the recipe's")
        }

        let onThePageWhite = try #require(Self.render(Self.glassChip(handed: white), in: .page, scheme: scheme))
        let onThePageBlack = try #require(Self.render(Self.glassChip(handed: black), in: .page, scheme: scheme))
        #expect(onThePageWhite != onThePageBlack, "on the page over the image in \(scheme) the chip ignores the pixels handed to it")
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

    // MARK: - ADR-0037: a chip inside another chip

    /// ADR-0037's fixture, the one both stacks drew for its table: a 140 × 40 pill host with 4 pt of padding; inside it,
    /// at its leading edge, a 32 × 32 circle whose background follows Avatar's `root.background` table; under both, 2 pt
    /// red and blue stripes, red from the host's leading edge, declared as a map. The web draws the same fixture
    /// (`web/apps/gallery/test/runtime.browser.test.tsx`).
    static let nestHost = CGSize(width: 140, height: 40)
    static let nestPadding: CGFloat = 4
    static let nestSide: CGFloat = 32
    static let nestStripe: CGFloat = 2
    static let red = Color(.sRGB, red: 1, green: 0, blue: 0)
    static let blue = Color(.sRGB, red: 0, green: 0, blue: 1)

    /// The fixture's stripes: `nestStripe` wide, red first, across the host's whole width and height.
    struct RedAndBlueStripes: View {
        init() {}

        var body: some View {
            let count = Int(DSSurfaceChipRenderTests.nestHost.width / DSSurfaceChipRenderTests.nestStripe)
            HStack(spacing: 0) {
                ForEach(0..<count, id: \.self) { index in
                    (index.isMultiple(of: 2) ? DSSurfaceChipRenderTests.red : DSSurfaceChipRenderTests.blue)
                        .frame(width: DSSurfaceChipRenderTests.nestStripe)
                }
            }
        }
    }

    /// The recipe's fill over the red stripe: what a circle that draws the recipe flat shows at its centre.
    struct FillOverRed: View {
        private var ds = DSThemeValues()

        init() {}

        var body: some View {
            ZStack {
                DSSurfaceChipRenderTests.red
                DSGlassAppearance.chip.recipe(ds.tokens.material).fill
            }
        }
    }

    /// The fixture in `scheme`, with glass allowed to render: the circle inside a host that hands the chip shape `host`,
    /// or with no host at all, in the same place, for nil.
    static func nest(host: DSSurfaceChipCell?, scheme: ColorScheme) -> some View {
        let circle = Color.clear
            .frame(width: nestSide, height: nestSide)
            .dsSurfaceChip(DSAvatarAppearance.background(on:), in: Circle())
            .padding(nestPadding)
            .frame(width: nestHost.width, height: nestHost.height, alignment: .leading)
        return DSTheme {
            Group {
                if let host {
                    circle.dsSurfaceChip({ _ in host }, in: Capsule(style: .circular))
                } else {
                    circle
                }
            }
            .dsBackdrop(.map) { RedAndBlueStripes() }
        }
        .environment(\.colorScheme, scheme)
        .dsAccessibilityPolicy(increasedContrast: false, reduceTransparency: false)
    }

    /// The pixel at the circle's centre, `(20, 20)`, as RGB: the first column of the red stripe from 20 to 22 pt.
    static func nestCentre(host: DSSurfaceChipCell?, scheme: ColorScheme) -> [UInt8]? {
        let width = Int(nestHost.width)
        guard let pixels = rgba(nest(host: host, scheme: scheme), width: width, height: Int(nestHost.height)) else { return nil }
        let at = Int(nestPadding + nestSide / 2)
        let offset = (at * width + at) * 4
        return [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
    }

    /// The mean of the 8 × 8 block at the circle's centre, from 16 to 24 pt on each axis, as RGB rounded to code values:
    /// what ADR-0037's table reads.
    static func nestMean(host: DSSurfaceChipCell?, scheme: ColorScheme) -> [UInt8]? {
        let width = Int(nestHost.width)
        guard let pixels = rgba(nest(host: host, scheme: scheme), width: width, height: Int(nestHost.height)) else { return nil }
        let first = Int(nestPadding + nestSide / 2) - 4
        var sums = [0, 0, 0]
        for y in first..<(first + 8) {
            for x in first..<(first + 8) {
                for channel in 0..<3 {
                    sums[channel] += Int(pixels[(y * width + x) * 4 + channel])
                }
            }
        }
        return sums.map { UInt8((Double($0) / 64).rounded()) }
    }

    /// `FillOverRed` in `scheme`, as RGB.
    static func fillOverRed(scheme: ColorScheme) -> [UInt8]? {
        guard let pixels = rgba(DSTheme { FillOverRed() }.environment(\.colorScheme, scheme), width: 8, height: 8) else {
            return nil
        }
        let offset = (4 * 8 + 4) * 4
        return [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
    }

    /// ADR-0037 rule 1: a chip that another chip encloses draws no backdrop filter, even inside a host that renders
    /// nothing, where the stripes show through the host. The circle asks for glass on the page over the map, renders the
    /// recipe flat, and its centre pixel is the red stripe under the recipe's fill — 255, 64, 64 in light and 172, 7, 8
    /// in dark by the ADR's measurements — within 2 code values of `FillOverRed`. A blur there reads the stripes' purple,
    /// about 160, 64, 160 and 89, 7, 91. The centre pixel is what is read, because the 8 × 8 mean is the same either way.
    ///
    /// The control: the same circle with no host blurs the stripes, and reads more than 40 code values from the sharp
    /// stripe. So the reading can see a blur, and the pass above is the rule's.
    @Test(arguments: [ColorScheme.light, .dark])
    func aChipInsideAHostThatRendersNothingDrawsNoFilter(_ scheme: ColorScheme) throws {
        try DSRenderCapability.requireRasterizing()
        let sharp = try #require(Self.fillOverRed(scheme: scheme))
        let nested = try #require(Self.nestCentre(host: DSSurfaceChipCell.none, scheme: scheme))
        #expect(Self.close(nested, sharp, within: 2), "\(scheme): inside a host that renders nothing the circle reads \(nested), the sharp stripe under the fill \(sharp)")
        let alone = try #require(Self.nestCentre(host: nil, scheme: scheme))
        #expect(!Self.close(alone, sharp, within: 40), "\(scheme): alone on the map the circle reads \(alone), the sharp stripe \(sharp): no blur to tell apart")
    }

    /// ADR-0037 rule 2: inside a chip that renders its own cell a chip has no media under it, so glass asked for there
    /// falls back under the `content` gate, and the 8 × 8 mean at the circle's centre reads `color.bg.surface.raised`
    /// over `color.bg.page` within 2 code values, in both schemes — 247, 248, 250 in light and 35, 36, 38 in dark by the
    /// ADR's measurements. Before the rule it read the blurred map.
    ///
    /// The host's cell is `color.bg.surface.nested`, which is translucent in both schemes: light `raised` is opaque, and
    /// flat glass over it reads within 2 code values of the fallback, so a host in that cell could not fail the check.
    /// The control: inside a host that renders nothing the same circle draws the recipe flat over the stripes, which is
    /// not the fallback's colour.
    @Test(arguments: [ColorScheme.light, .dark])
    func aChipInsideAnOwnCellReadsTheFallback(_ scheme: ColorScheme) throws {
        try DSRenderCapability.requireRasterizing()
        let fallback = try #require(Self.centre(RaisedOverThePage(), scheme: scheme))
        let nested = try #require(Self.nestMean(host: .own(\.color.bgSurfaceNested), scheme: scheme))
        #expect(Self.close(nested, fallback, within: 2), "\(scheme): inside an own cell the circle reads \(nested), raised over the page \(fallback)")
        let flat = try #require(Self.nestMean(host: DSSurfaceChipCell.none, scheme: scheme))
        #expect(!Self.close(flat, fallback, within: 2), "\(scheme): the flat circle reads \(flat), the fallback's colour \(fallback)")
    }
}

/// ADR-0036 F2's three models of what a blur reads past a box's edges, for a white stripe over black inside a box
/// `width` wide (F2's own stripe, `DSEdgeModel.stripe`, unless a test names another), blurred with the Gaussian of
/// standard deviation `sigma`. Each value is in 8-bit code values at the centre of a pixel column, the gamma-encoded
/// values averaged as they are, which is what Chromium's blur does and what SwiftUI's does too: Surface's `bleed` over
/// the black page reads the clamp model in those terms.
enum DSEdgeModel {
    /// Past each edge, the box's content mirrored about that edge, again and again: Chromium's (F2) and `inBounds`.
    case reflection
    /// Past the edge, the edge column repeated; here black, since the stripe starts inside the box.
    case clamp
    /// Past the edge, nothing: the kernel's weight inside the box renormalised.
    case transparency

    /// F2's stripe, from 2 to 6 pt inside the box's leading edge.
    static let stripe: Range<CGFloat> = 2..<6

    /// The standard normal distribution function.
    static func phi(_ z: Double) -> Double { 0.5 * erfc(-z / 2.squareRoot()) }

    /// The share of the kernel centred at `centre` that falls on `[start, end)`.
    static func mass(_ start: Double, _ end: Double, centre: Double, sigma: Double) -> Double {
        phi((end - centre) / sigma) - phi((start - centre) / sigma)
    }

    func value(column: Int, width: CGFloat, sigma: Double, stripe: Range<CGFloat> = DSEdgeModel.stripe) -> Double {
        let centre = Double(column) + 0.5
        let w = Double(width)
        let start = Double(stripe.lowerBound), end = Double(stripe.upperBound)
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
