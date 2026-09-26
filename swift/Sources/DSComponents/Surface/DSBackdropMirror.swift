import SwiftUI
import DSCore

/// What `DSBackdropMirror` samples past the edges of its shape before it blurs (ADR-0036 §6).
nonisolated enum DSBackdropMirrorEdge: Hashable, Sendable {
    /// Surface's: the copy of the backdrop reaches three standard deviations past the shape on every side
    /// (`DSSurfaceAppearance.blurBleed(radius:)`), so a pixel near the edge is averaged with the backdrop around the
    /// shape, and not with transparency.
    ///
    /// **This is not what the web draws.** Chromium's `backdrop-filter` reads only the backdrop inside the element's
    /// own box, and past the box's edges it reflects what lies inside the box (ADR-0036 F1, F2). So near its edges an
    /// Apple glass Surface averages backdrop that its web twin never reads (F6). Surface keeps this bleed until P4-D8:
    /// changing it moves every Apple glass Surface and Card baseline.
    case bleed

    /// The glass chip's (ADR-0036 §6): what Chromium draws. The mirror reads only the backdrop under the shape's own
    /// frame, and past the frame's edges it reflects that crop about each edge and each corner, again and again, until
    /// the band around the shape is three standard deviations wide. So a chip samples nothing that lies beside it, as
    /// its web twin samples nothing outside its own box (F1), and near its edges it averages its own backdrop mirrored,
    /// as Chromium does (F2).
    case inBounds
}

/// The part of a backdrop under a glass shape, saturated and blurred by the recipe: the Apple twin of CSS
/// `backdrop-filter: blur() saturate()` (ADR-0022 §2.1). `blurRadius` is the recipe's CSS standard deviation in
/// SwiftUI's units (ADR-0030 §4.3).
///
/// SwiftUI cannot read what lies behind a view, so this draws the backdrop view that `dsBackdrop(_:_:)` or an opaque
/// Surface handed down (`DSBackdropSource`) again, lined up with this view through the backdrop's coordinate space,
/// and clips it to the shape. `edge` says what it samples past the shape's edges.
///
/// Only the Surface module reads backdrop pixels (ADR-0036 §1). `DSSurfaceLayers` draws this with Surface's `bleed`;
/// it was extracted from there verbatim, moving no Surface pixel (ADR-0036 rule 14), so that the glass chip
/// (`DSSurfaceChipLayers`) can draw it too, with an edge mode of its own, `inBounds` (ADR-0036 §6, §7).
struct DSBackdropMirror<S: Shape>: View {
    /// The pixels under the glass, and the coordinate space and size they were drawn in.
    let backdrop: DSBackdropSource
    /// The recipe whose `saturate` and `blurRadius` are applied.
    let recipe: DSGlassRecipe
    /// The glass's shape, in the frame this view is given.
    let shape: S
    let edge: DSBackdropMirrorEdge

    var body: some View {
        switch edge {
        case .bleed:
            bleeding
        case .inBounds:
            inBounds
        }
    }

    /// Surface's bleed, which is not what the web draws (`DSBackdropMirrorEdge.bleed` says how): the copy reaches
    /// `bleed` past the shape on every side before it is blurred, and is then cut back to the shape.
    private var bleeding: some View {
        let bleed = DSSurfaceAppearance.blurBleed(radius: recipe.blurRadius)
        return GeometryReader { proxy in
            let frame = proxy.frame(in: .named(backdrop.space))
            backdrop.content
                .frame(width: backdrop.size.width, height: backdrop.size.height)
                .offset(x: bleed - frame.minX, y: bleed - frame.minY)
                .frame(width: proxy.size.width + 2 * bleed, height: proxy.size.height + 2 * bleed, alignment: .topLeading)
                .clipped()
                .saturation(recipe.saturate)
                .blur(radius: recipe.blurRadius)
                .offset(x: -bleed, y: -bleed)
                .frame(width: proxy.size.width, height: proxy.size.height, alignment: .topLeading)
        }
        .clipShape(shape)
    }

    /// The glass chip's edge mode (`DSBackdropMirrorEdge.inBounds`), in ADR-0036 §6's five steps:
    ///  1. crop the backdrop to the shape's frame;
    ///  2. reflect the crop about each edge and each corner until the band around the shape is three standard
    ///     deviations wide (`DSMirroredBand`);
    ///  3. saturate;
    ///  4. blur with `blur(radius:opaque: true)`, so nothing past the band bleeds in as transparency;
    ///  5. clip to the shape.
    ///
    /// The frame is the one the shape is drawn at in the backdrop's space. A scale applied around the chip — a pressed
    /// control's 0.97, which its host puts on the chip's root (ADR-0036 rule 13) — reaches that frame and not the
    /// proxy's own size, so the crop is the backdrop under the frame as drawn, stretched to the proxy's size: once the
    /// scale is applied it lies over the backdrop it was cut from, as Chromium's `backdrop-filter` samples the
    /// backdrop under the transformed box. With no scale around the chip the two sizes are equal and the stretch is 1.
    private var inBounds: some View {
        let band = DSSurfaceAppearance.blurBleed(radius: recipe.blurRadius)
        return GeometryReader { proxy in
            let frame = proxy.frame(in: .named(backdrop.space))
            let stretch = Self.stretch(from: frame.size, to: proxy.size)
            DSMirroredBand(crop: crop(at: frame.origin, size: frame.size), size: frame.size, band: band)
                .saturation(recipe.saturate)
                .blur(radius: recipe.blurRadius, opaque: true)
                .offset(x: -band, y: -band)
                .frame(width: frame.width, height: frame.height, alignment: .topLeading)
                .scaleEffect(stretch, anchor: .topLeading)
                .frame(width: proxy.size.width, height: proxy.size.height, alignment: .topLeading)
        }
        .clipShape(shape)
    }

    /// The factor that takes the frame as drawn in the backdrop's space back to the proxy's own size, on each axis; 1
    /// on an axis the frame has no extent on.
    static func stretch(from drawn: CGSize, to own: CGSize) -> CGSize {
        CGSize(
            width: drawn.width > 0 ? own.width / drawn.width : 1,
            height: drawn.height > 0 ? own.height / drawn.height : 1
        )
    }

    /// The backdrop under a frame of `size` whose top-leading corner sits at `origin` in the backdrop's space.
    private func crop(at origin: CGPoint, size: CGSize) -> some View {
        backdrop.content
            .frame(width: backdrop.size.width, height: backdrop.size.height)
            .offset(x: -origin.x, y: -origin.y)
            .frame(width: size.width, height: size.height, alignment: .topLeading)
            .clipped()
    }
}

/// A crop of the backdrop, `size` large, with `band` of its own reflections around it on every side: the crop itself at
/// `(band, band)`, and in every direction the next copy mirrored about the edge it shares with the one before. Where a
/// side of the crop is narrower than the band, the reflections repeat until they cover it. That is Skia's mirror tile
/// mode, the edge mode of Chromium's `backdrop-filter` (ADR-0036 F2).
///
/// A `Canvas` resolves the crop once and draws it once per copy, so the backdrop view is evaluated once per chip, not
/// once per copy. Stacking the copies as views instead, each offset into place, also renders the backdrop once per
/// copy, and SwiftUI's blur did not read that stack as one image (measured on the iOS 26.5 simulator).
struct DSMirroredBand<Crop: View>: View {
    let crop: Crop
    /// The shape's frame size, which is the crop's.
    let size: CGSize
    /// How far the reflections reach past the crop on every side.
    let band: CGFloat

    /// The most copies drawn on each side of the crop along one axis. A side at least `band / 16` long (3.75 pt at
    /// the chip recipe's 60 pt band) is covered in full; a smaller one is a sliver in the middle of a layout change,
    /// and the cap only stops it from asking for thousands of copies.
    static var maximumReflections: Int { 16 }

    var body: some View {
        let columns = Self.reflections(across: size.width, band: band)
        let rows = Self.reflections(across: size.height, band: band)
        Canvas { context, _ in
            guard let tile = context.resolveSymbol(id: DSMirroredBandSymbol.crop) else { return }
            for row in -rows...rows {
                for column in -columns...columns {
                    let mirrorsX = !column.isMultiple(of: 2)
                    let mirrorsY = !row.isMultiple(of: 2)
                    var copy = context
                    copy.translateBy(
                        x: band + CGFloat(column) * size.width + (mirrorsX ? size.width : 0),
                        y: band + CGFloat(row) * size.height + (mirrorsY ? size.height : 0)
                    )
                    copy.scaleBy(x: mirrorsX ? -1 : 1, y: mirrorsY ? -1 : 1)
                    copy.draw(tile, in: CGRect(origin: .zero, size: size))
                }
            }
        } symbols: {
            crop.tag(DSMirroredBandSymbol.crop)
        }
        .frame(width: size.width + 2 * band, height: size.height + 2 * band, alignment: .topLeading)
    }

    /// How many copies it takes on each side of a crop `length` long to reach `band` past it.
    static func reflections(across length: CGFloat, band: CGFloat) -> Int {
        guard length > 0, band > 0 else { return 0 }
        return min(Int((band / length).rounded(.up)), maximumReflections)
    }
}

/// The one symbol `DSMirroredBand`'s canvas draws.
nonisolated private enum DSMirroredBandSymbol: Hashable, Sendable {
    case crop
}

/// The 1 px inner edge of glass: `color` on a 135° gradient line across `size`, from `start` alpha at 0 % to `end`
/// alpha at 75 % and held to the end (Surface.yaml behavior, ADR-0030 §4.1, §4.2), stroked inside the shape
/// (`strokeBorder`), `lineWidth` wide.
///
/// `DSSurfaceLayers` draws the edge of glass and of vivid with it (`DSSurfaceEdge.highlight`). It was extracted from
/// there verbatim, beside `DSBackdropMirror`, so that the glass chip can draw the recipe's edge with Surface's
/// geometry (ADR-0036 §2.3, §7).
struct DSGlassEdge<S: InsettableShape>: View {
    let shape: S
    /// `color.edge.highlight`, in the brand's catalog.
    let color: Color
    /// Alpha at the top-leading end of the gradient line.
    let start: Double
    /// Alpha from 75 % of the gradient line to its bottom-trailing end.
    let end: Double
    /// `border.hairline`.
    let lineWidth: CGFloat
    /// The size the gradient line spans: the whole shape's, as a CSS gradient spans the element's box.
    let size: CGSize

    var body: some View {
        let line = DSGradientGeometry.unitPoints(angle: DSSurfaceAppearance.edgeAngle, size: size)
        shape.strokeBorder(
            LinearGradient(
                stops: [
                    .init(color: color.opacity(start), location: 0),
                    .init(color: color.opacity(end), location: DSSurfaceAppearance.edgeEndLocation),
                ],
                startPoint: line.start,
                endPoint: line.end
            ),
            lineWidth: lineWidth
        )
    }
}
