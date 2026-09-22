import SwiftUI
import DSCore
import DSTokens

/// Surface: the container primitive every other component sits on (`spec/components/Surface.yaml`, specVersion 3).
///
/// It resolves one content material through DSCore's `DSSurface` — including the single glass fallback of ADR-0022
/// §1, decided from Prism's token context and never from the OS settings — draws that material from its tokens, and
/// publishes the material it renders and the backdrop kind it declared as `dsSurfaceContext`, so `DSText`, charts
/// and component parts inside pick their foreground family by themselves.
///
///     DSSurfaceView(material: .vivid, vivid: .slot1, radius: .tile) {
///         DSText("Average yield", role: .headline)
///     }
///
/// **Name.** A component's SwiftUI view is `DS` + its spec name (`DSText`, `DSButton`, `DSCard`; ADR-0016,
/// ADR-0019 §6). Where DSCore already declares that name for the rule the component is built on, the view adds
/// `View`: DSCore's `DSSurface` is the material resolver, so the Surface view is `DSSurfaceView`.
///
/// **What it draws**, back to front:
///  1. under `vivid`, the bloom behind the surface: the gradient's brightest stop at its bloom alpha and blur, 10 %
///     of the height down, scaled to 0.92; skipped under Reduce Transparency;
///  2. the elevation's shadow layers, outside the shape only, as CSS draws a box-shadow;
///  3. `color.bg.page` under `solid`, `raised` and `nested`;
///  4. on glass, the backdrop under the surface (`dsBackdrop(_:)`, or the enclosing opaque Surface), saturated and
///     blurred by the recipe;
///  5. the fill: the material's color, the glass recipe's fill, or the vivid gradient on its CSS gradient line;
///  6. grain (vivid and glass), blended with overlay, outside the card header block;
///  7. the glass bloom, a radial gradient from the top-leading corner, whole — and outside the card header block only
///     when a Card's header sits on this surface, which is the block Surface.yaml names;
///  8. the 1 px inner edge: `color.edge.raised` along the top of `raised`, `color.edge.highlight` on a 135° ramp on
///     glass and vivid.
/// Under the glass fallback the shape is `raised` over the page with its top edge; blur, saturation, the recipe's
/// edge, grain and bloom are gone, and the radius and elevation stay the ones declared here.
public struct DSSurfaceView<Content: View>: View {
    private let material: DSSurfaceMaterial
    private let vivid: DSVividSlot
    private let radius: DSSurfaceRadius
    private let elevation: DSSurfaceElevation?
    private let padding: DSSurfacePadding
    private let backdrop: DSBackdropKind
    private let selected: Bool
    private let content: Content

    /// Set by `DSCard`, the one component that pins a header to its Surface; see `cardHeaderBlock()`.
    private var hasCardHeaderBlock = false

    /// Set by `DSCard` for its `tinted` variant; see `surfaceFill(_:)`.
    private var fillOverride: DSColorToken?

    private var ds = DSThemeValues()
    @Environment(\.dsSurfaceGeometry) private var parentGeometry
    @Environment(\.dsBackdropSource) private var backdropSource
    @Namespace private var space
    @State private var size: CGSize = .zero

    /// - Parameters:
    ///   - material: the content material; `solid` by default.
    ///   - vivid: the gradient slot of a vivid surface; `default` takes `gradient.vivid.default`, and other
    ///     materials ignore it. A 2×2 alternates one slot pair on its diagonals (`slot1` and `slot2`, or `slot3` and
    ///     `slot4`).
    ///   - radius: the corner radius; `card` by default. Inside another Surface it is at most the parent's radius
    ///     minus the parent's padding (the concentric rule).
    ///   - elevation: the shadow level; nil draws the material's own (`raised` for the raised material, `flat`
    ///     otherwise).
    ///   - padding: `card` pads the content by `space.card-padding`; `none` does not.
    ///   - backdrop: what the surface sits on. Glass renders only over `image`, `map` or `vivid`, and the kind is
    ///     published with the material.
    ///   - selected: while the glass fallback is active, a selected glass surface renders and publishes `inverse`.
    public init(
        material: DSSurfaceMaterial = .solid,
        vivid: DSVividSlot = .default,
        radius: DSSurfaceRadius = .card,
        elevation: DSSurfaceElevation? = nil,
        padding: DSSurfacePadding = .card,
        backdrop: DSBackdropKind = .none,
        selected: Bool = false,
        @ViewBuilder content: () -> Content
    ) {
        self.material = material
        self.vivid = vivid
        self.radius = radius
        self.elevation = elevation
        self.padding = padding
        self.backdrop = backdrop
        self.selected = selected
        self.content = content()
    }

    public var body: some View {
        let tokens = ds.tokens
        let resolution = DSSurface.resolve(material: material, backdrop: backdrop, selected: selected, tokens: tokens)
        let cornerRadius = DSSurfaceAppearance.radius(requested: radius, tokens.radius, parent: parentGeometry)
        let inset = padding.value(tokens.space)
        let gradient = DSSurfaceAppearance.gradient(vivid, tokens)
        let layers = DSSurfaceLayers(
            resolution: resolution,
            tokens: tokens,
            brand: ds.brand,
            gradient: gradient,
            elevation: DSSurfaceAppearance.elevation(declared: elevation, requested: material),
            fillOverride: fillOverride,
            cornerRadius: cornerRadius,
            backdrop: resolution.glass == nil ? nil : backdropSource,
            hasCardHeaderBlock: hasCardHeaderBlock
        )

        return content
            .padding(inset)
            .environment(\.dsSurfaceGeometry, DSSurfaceGeometry(radius: cornerRadius, padding: inset))
            .dsSurfaceContext(resolution.published)
            .modifier(DSSurfaceBackdropPublisher(layers: layers, publishes: !resolution.material.isGlass, space: space, size: size))
            .background {
                layers
                    .animation(DSSurfaceAppearance.materialChange(ds.motion), value: resolution)
            }
            .onGeometryChange(for: CGSize.self, of: \.size) { size = $0 }
            .coordinateSpace(.named(space))
    }

    /// Declares that a Card's header — its title and caption, pinned to the top-leading padding corner — sits on this
    /// Surface, so the surface carries the card header block of ADR-0022 §4.1 and leaves the glass bloom out of it
    /// (Surface.yaml behavior; `DSSurfaceLayers.glassBloom(_:)` carries the evidence).
    ///
    /// Internal: the block is Card's anatomy, and `DSCard` is the only caller. A Surface an app builds by hand has no
    /// card header, so it draws its bloom whole, as the direction board draws its non-card glassLight surfaces.
    func cardHeaderBlock() -> Self {
        var copy = self
        copy.hasCardHeaderBlock = true
        return copy
    }

    /// Replaces the material's own fill with another token, leaving everything else — the underlay, the elevation,
    /// the edge and the material this Surface publishes — as the material it was asked for.
    ///
    /// The one caller is `DSCard`'s `tinted` variant, which is a solid surface filled with `color.bg.tint.accent`
    /// over the `color.bg.page` a solid surface paints under itself (Card.yaml behavior 7, ADR-0030 §5.1). This is
    /// the Apple half of the web's `--ds--surface-fill` override, so the two stacks paint the same two layers in the
    /// same order. Passing nil keeps the material's own fill.
    ///
    /// Internal: a component may retune the fill of the material it asked for, an app may not — it picks a material.
    func surfaceFill(_ token: DSColorToken?) -> Self {
        var copy = self
        copy.fillOverride = token
        return copy
    }
}

/// Every Surface that renders an opaque material is the backdrop of what sits on it: glass on a vivid card blurs the
/// card's gradient and grain, not the page behind the card. Glass hands down the backdrop it sits on.
private struct DSSurfaceBackdropPublisher: ViewModifier {
    let layers: DSSurfaceLayers
    let publishes: Bool
    let space: Namespace.ID
    let size: CGSize

    func body(content: Content) -> some View {
        if publishes {
            content.dsBackdropSource(AnyView(layers.backdropPixels), space: space, size: size)
        } else {
            content
        }
    }
}
