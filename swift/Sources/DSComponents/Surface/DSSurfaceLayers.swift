import CoreGraphics
import Foundation
import SwiftUI
import DSCore
import DSTokens

/// The drawing half of `DSSurfaceView`: every layer of Surface.yaml's anatomy, from the values
/// `DSSurfaceAppearance` binds. It sits in the Surface's background, so it takes the content's size, draws nothing
/// hit-testable and nothing an assistive technology reads.
struct DSSurfaceLayers: View {
    let resolution: DSSurfaceResolution
    let tokens: DSTokenSet
    let brand: DSBrand
    let gradient: DSGradientToken
    let elevation: DSSurfaceElevation
    /// A fill that replaces the material's own (`DSSurfaceView.surfaceFill(_:)`); nil keeps it. The underlay, the
    /// edge and the grain are the material's either way.
    var fillOverride: DSColorToken?
    let cornerRadius: CGFloat
    /// The pixels under a glass surface; nil when glass does not render or nothing supplied a backdrop.
    let backdrop: DSBackdropSource?
    /// Whether a Card's header sits on this surface, which is what puts a card header block on it.
    let hasCardHeaderBlock: Bool

    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: cornerRadius, style: .continuous) }

    var body: some View {
        GeometryReader { proxy in
            let size = proxy.size
            ZStack(alignment: .topLeading) {
                if resolution.drawsVividBloom {
                    vividBloom(size)
                        .transition(.opacity)
                }
                shadow(size)
                surface(size)
            }
            .frame(width: size.width, height: size.height, alignment: .topLeading)
        }
        .accessibilityHidden(true)
        .allowsHitTesting(false)
    }

    /// What a glass surface on this surface blurs: its underlay, fill and grain, inside its shape.
    var backdropPixels: some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                if let underlay = DSSurfaceAppearance.underlay(resolution) {
                    shape.fill(underlay.color(brand))
                }
                fill(proxy.size)
                grain(proxy.size)
            }
            .frame(width: proxy.size.width, height: proxy.size.height, alignment: .topLeading)
            .compositingGroup()
        }
    }

    // MARK: - Layers outside the shape

    /// The vivid bloom behind the surface on the page: the gradient's brightest stop at the gradient's bloom alpha and
    /// blur, placed 10 % of the height down and scaled to 0.92. The blur is applied before the transform, as CSS
    /// applies a filter in the element's own coordinate space.
    private func vividBloom(_ size: CGSize) -> some View {
        shape
            .fill(gradient.bloomColor.color)
            .frame(width: size.width, height: size.height)
            .blur(radius: DSBlur.radius(cssStandardDeviation: gradient.bloomBlur))
            .scaleEffect(DSSurfaceAppearance.vividBloomScale)
            .offset(y: size.height * DSSurfaceAppearance.vividBloomOffset)
            .opacity(gradient.bloomAlpha)
    }

    /// The elevation's shadow layers, drawn the way CSS draws a box-shadow: the shape grown by the spread, offset,
    /// blurred to the layer's standard deviation, and cut away inside the surface's own shape, so a translucent
    /// glass fill does not darken over its own shadow.
    private func shadow(_ size: CGSize) -> some View {
        let layers = elevation.shadow(tokens.elevation).layers.filter { $0.color.alpha > 0 && !$0.inset }
        return ZStack(alignment: .topLeading) {
            ForEach(Array(layers.enumerated()), id: \.offset) { _, layer in
                RoundedRectangle(cornerRadius: cornerRadius + layer.spread, style: .continuous)
                    .fill(layer.color.color)
                    .frame(width: size.width + 2 * layer.spread, height: size.height + 2 * layer.spread)
                    .offset(x: layer.x - layer.spread, y: layer.y - layer.spread)
                    .blur(radius: DSSurfaceAppearance.shadowRadius(cssBlur: layer.blur))
            }
            if !layers.isEmpty {
                shape
                    .fill(tokens.color.bgPage)
                    .frame(width: size.width, height: size.height)
                    .blendMode(.destinationOut)
            }
        }
        .compositingGroup()
    }

    // MARK: - Layers inside the shape

    private func surface(_ size: CGSize) -> some View {
        ZStack(alignment: .topLeading) {
            if let underlay = DSSurfaceAppearance.underlay(resolution) {
                shape.fill(underlay.color(brand))
            }
            if let backdrop, let recipe = resolution.glass {
                backdropMirror(backdrop, recipe: recipe)
                    .transition(.opacity)
            }
            fill(size)
            grain(size)
            glassBloom(size)
            edge(size)
        }
        .frame(width: size.width, height: size.height, alignment: .topLeading)
        .compositingGroup()
    }

    /// The part of the backdrop under this surface, saturated and blurred by the recipe (CSS
    /// `backdrop-filter: blur() saturate()`); `blurRadius` is the recipe's CSS standard deviation in SwiftUI's
    /// units (ADR-0030 §4.3).
    ///
    /// The copy reaches `bleed` past the surface on every side before it is blurred, so pixels near the edge are
    /// averaged with the backdrop around the surface, as `backdrop-filter` does, and not with transparency.
    private func backdropMirror(_ backdrop: DSBackdropSource, recipe: DSGlassRecipe) -> some View {
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

    /// `tokens.root.background`, or the vivid gradient drawn on its CSS gradient line in OKLab (DSCore). A caller
    /// that supplied a fill of its own paints that instead of the material's, over the same underlay (a tinted Card).
    @ViewBuilder
    private func fill(_ size: CGSize) -> some View {
        if let fillOverride {
            shape.fill(fillOverride.color(brand))
        } else if resolution.material == .vivid {
            shape.fill(DSGradient.fill(gradient, size: size))
        } else if let background = DSSurfaceAppearance.background(resolution.material) {
            shape.fill(background.color(brand))
        }
    }

    /// Monochrome value noise, one value per point, blended with overlay at the bound opacity and left out of the
    /// card header block, where text below 13 px sits (ADR-0030 §4.4).
    @ViewBuilder
    private func grain(_ size: CGSize) -> some View {
        let opacity = DSSurfaceAppearance.grain(resolution, gradient: gradient)
        if opacity > 0, let tile = DSSurfaceGrainTile.image {
            tile
                .resizable(resizingMode: .tile)
                .interpolation(.none)
                .frame(width: size.width, height: size.height)
                .mask(outsideHeaderBlock(size))
                .clipShape(shape)
                .opacity(opacity)
                .blendMode(.overlay)
        }
    }

    /// The glass bloom: `color.edge.highlight` from the recipe's bloom alpha at the top-leading corner to alpha 0 at
    /// 75 % of the shorter side, clipped to the shape. Its falloff is the gradient; it carries no blur.
    ///
    /// **The shape is the spec's.** Surface.yaml behavior states a radial of 75 % of the shorter side — a circle — and
    /// that is what renders here. `docs/direction-board/index.html` (`.glass-l::after`) draws the same bloom as a
    /// `60 % × 120 %` ellipse clear at 70 %, which is visibly different on a surface that is not square. The board is
    /// the signed-off look and Surface.yaml is the contract both stacks implement, so the two have to be reconciled in
    /// Surface.yaml, for Apple and the web together (roadmap: "Light-glass bloom geometry → P2-1, `Surface.yaml`").
    /// Until that lands this side follows the spec rather than diverging from the web on its own.
    ///
    /// **Why the header block is only cut out under a Card.** Surface.yaml leaves the bloom out of *the card* header
    /// block, so it never lightens the fill under a card's title and caption: the direction board measured the dark
    /// glassLight bloom over the header text of its materials card at 4.36:1, under the 4.5:1 its pair needs, and left
    /// Surface.yaml to either keep the bloom clear of that block or record the margin (`docs/direction-board/README.md`,
    /// "Open, and not blocking P3-0"). A Surface that carries no card header has no such block and no such text: the
    /// board's own non-card glassLight surface, the turn cue, measured 4.75:1 with the bloom drawn whole, and draws it
    /// whole. Cutting the fixed block out of every Surface put a hard-edged 96 × 64 pt notch in the bloom of a plain
    /// `glassLight` surface — visible in dark, where `material.glass.light.fill.bloom` is 0.35 — which is neither what
    /// the spec asks for nor what the board draws. The grain keeps the unconditional mask: ADR-0030 §4.4 states that
    /// one for a Surface, not for a Card.
    @ViewBuilder
    private func glassBloom(_ size: CGSize) -> some View {
        let alpha = DSSurfaceAppearance.glassBloom(resolution)
        if alpha > 0 {
            let highlight = DSColorToken.edgeHighlight.color(brand)
            let bloom = RadialGradient(
                colors: [highlight.opacity(alpha), highlight.opacity(0)],
                center: .topLeading,
                startRadius: 0,
                endRadius: min(size.width, size.height) * DSSurfaceAppearance.glassBloomRadius
            )
            .frame(width: size.width, height: size.height)
            if let block = DSSurfaceAppearance.bloomExclusion(size: size, tokens, hasCardHeaderBlock: hasCardHeaderBlock) {
                bloom.mask(outside(block, in: size)).clipShape(shape)
            } else {
                bloom.clipShape(shape)
            }
        }
    }

    /// The 1 px inner edge, `border.hairline` wide.
    @ViewBuilder
    private func edge(_ size: CGSize) -> some View {
        switch DSSurfaceAppearance.edge(resolution, tokens) {
        case .top(let color):
            // CSS `inset 0 <hairline> 0 0 <color>`: the shape less itself moved down by the hairline.
            ZStack(alignment: .topLeading) {
                shape.fill(color.color(brand))
                shape
                    .fill(tokens.color.bgPage)
                    .offset(y: tokens.border.hairline)
                    .blendMode(.destinationOut)
            }
            .compositingGroup()
            .clipShape(shape)
        case .highlight(let color, let start, let end):
            let highlight = color.color(brand)
            let line = DSGradientGeometry.unitPoints(angle: DSSurfaceAppearance.edgeAngle, size: size)
            shape.strokeBorder(
                LinearGradient(
                    stops: [
                        .init(color: highlight.opacity(start), location: 0),
                        .init(color: highlight.opacity(end), location: DSSurfaceAppearance.edgeEndLocation),
                    ],
                    startPoint: line.start,
                    endPoint: line.end
                ),
                lineWidth: tokens.border.hairline
            )
        case nil:
            EmptyView()
        }
    }

    /// The surface less the card header block, as a mask. Grain takes this block on every Surface: ADR-0030 §4.4
    /// states the rule for a Surface ("on vivid all such text sits in the Card header block, so Surface leaves the
    /// grain out of V2's header block"), and the recipes that carry grain are quiet enough that the cut does not
    /// read. The bloom takes it only under a Card — see `glassBloom(_:)`.
    private func outsideHeaderBlock(_ size: CGSize) -> some View {
        outside(DSSurfaceAppearance.headerBlock(size: size, tokens), in: size)
    }

    /// The surface less `block`, as a mask.
    private func outside(_ block: CGRect, in size: CGSize) -> some View {
        Path { path in
            path.addRect(CGRect(origin: .zero, size: size))
            path.addRect(block)
        }
        .fill(style: FillStyle(eoFill: true))
    }
}

/// The grain tile of ADR-0030 §4.4 as an image: `DSGrain.tile()`'s values as sRGB grey, one pixel per point, so a
/// tiled, uninterpolated image draws one value per 1 × 1 pt cell on every display scale.
enum DSSurfaceGrainTile {
    static let image: Image? = {
        let side = DSGrain.tileSize
        let channels = 4
        var rgba = [UInt8](repeating: UInt8.max, count: side * side * channels)
        for (index, value) in DSGrain.tile(size: side).enumerated() {
            rgba[index * channels] = value
            rgba[index * channels + 1] = value
            rgba[index * channels + 2] = value
        }
        guard
            let space = CGColorSpace(name: CGColorSpace.sRGB),
            let provider = CGDataProvider(data: Data(rgba) as CFData),
            let cgImage = CGImage(
                width: side,
                height: side,
                bitsPerComponent: UInt8.bitWidth,
                bitsPerPixel: UInt8.bitWidth * channels,
                bytesPerRow: side * channels,
                space: space,
                bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue),
                provider: provider,
                decode: nil,
                shouldInterpolate: false,
                intent: .defaultIntent
            )
        else { return nil }
        return Image(decorative: cgImage, scale: 1)
    }()
}
