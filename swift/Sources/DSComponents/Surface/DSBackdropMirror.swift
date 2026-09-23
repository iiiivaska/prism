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
/// it was extracted from there verbatim, moving no Surface pixel (ADR-0036 rule 14), so that the glass chip can draw
/// it too, with an edge mode of its own (ADR-0036 §6, §7).
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
