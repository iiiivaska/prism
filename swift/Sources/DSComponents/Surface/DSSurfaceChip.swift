import OSLog
import SwiftUI
import DSCore
import DSTokens

/// The cell a component hands the glass chip shape for the one part it draws through it (ADR-0036 §2.2, §7): the
/// spec's `background` cell of that part on the ground it reads, and nothing more.
///
/// The component never hands over a recipe, a glass colour, a setting or a fallback: `glass` names the cell that binds
/// `material.glass.chip`, and the Surface module decides whether the recipe renders.
nonisolated enum DSSurfaceChipCell: Hashable {
    /// The spec binds `material.glass.chip` on this ground.
    case glass
    /// The spec binds another cell on this ground: the component's own colour.
    case own(KeyPath<DSTokenSet, Color>)
    /// The spec binds no fill on this ground.
    case none

    /// What the chip's resolver is asked for (`DSSurface.resolveChip`).
    var fill: DSSurfaceChipFill {
        switch self {
        case .glass: .glass
        case .own: .own
        case .none: .none
        }
    }
}

extension View {
    /// Draws this view's box as the glass chip of a Prism component (ADR-0036 §2 to §7): the Surface module's internal
    /// shape for the one part whose `background` binds `material.glass.chip`, Avatar's circle and Chip's pill among
    /// them. Only Prism's components call it; an app gets a glass chip by using the component that draws one.
    ///
    /// It reads the ground (`DSThemeValues.surface`), its enclosure (`dsSurfaceChipEnclosure`, ADR-0037 §1) and the
    /// backdrop pixels, and resolves through `DSSurface.resolveChip`, with Surface's four triggers. Behind the view, in
    /// its own box and shape, it draws one of four renderings (`DSSurfaceChipLayers`):
    ///  - **glass**: the backdrop under the shape, saturated and blurred by `DSGlassAppearance.chip`'s recipe and
    ///    mirrored at the shape's edges as Chromium does (`DSBackdropMirrorEdge.inBounds`), then the recipe's fill and
    ///    its 1 px edge on Surface's 135° ramp; on the scheme's glass, on light glass (ADR-0036 §5) or inside any other
    ///    chip (ADR-0037 §2), the fill and the edge only;
    ///  - **fallback**, on the watch, under Reduce Transparency, under Increase Contrast or over no media — which is
    ///    also what lies under a chip inside a chip that renders its own cell or its fallback (ADR-0037 §2):
    ///    `color.bg.surface.raised` over `color.bg.page`, with no blur, no edge and no top edge, and never `inverse`;
    ///  - **own**: the component's own cell;
    ///  - **none**: nothing.
    ///
    /// It adds no padding, never reads or sets the concentric geometry (`dsSurfaceGeometry`), never hands its pixels
    /// down, and publishes to the view it modifies the ground the part sits on, or `(raised, none)` under the fallback
    /// or when `publishes` is `raised`, so every other part of the component takes its cell from that (ADR-0036 §4). It
    /// also hands the view the enclosure its resolution names, `encloses`, which a chip inside reads (ADR-0037 §1):
    /// `.opaque` when it renders its own cell or its fallback, or sits in an `.opaque` enclosure itself, and
    /// `.translucent` otherwise. Apply it to the child view that draws the component's other parts, so they read what
    /// it publishes. With the component's `background(on:)`, its spec's table as a
    /// `(DSSurfaceContext) -> DSSurfaceChipCell`:
    ///
    ///     parts
    ///         .frame(width: side, height: side)
    ///         .dsSurfaceChip(background(on:), in: Circle())
    ///
    /// - Parameters:
    ///   - background: the part's `background` cell as a function of the ground it sits on.
    ///   - shape: the part's shape at its own radius, in its own box.
    ///   - elevation: the part's shadow level. Only `flat` is drawn: the first component with an elevation extracts
    ///     Surface's shadow drawing beside `DSBackdropMirror`, as the mirror and the edge were extracted (roadmap P4-5).
    ///   - gate: `chrome` for a bar that exists to show the page through it, where no media under it is not an invalid
    ///     backdrop; `content` otherwise.
    ///   - publishes: `raised` for a bar whose items are checked on `raised`; `ground` otherwise.
    func dsSurfaceChip(
        _ background: @escaping (DSSurfaceContext) -> DSSurfaceChipCell,
        in shape: some InsettableShape,
        elevation: DSSurfaceElevation = .flat,
        gate: DSSurfaceChipGate = .content,
        publishes: DSSurfaceChipPublication = .ground
    ) -> some View {
        assert(
            elevation == .flat,
            "dsSurfaceChip draws only the flat elevation (roadmap P4-5): extract DSSurfaceLayers' shadow drawing verbatim beside DSBackdropMirror before a glass chip asks for \(elevation)."
        )
        return modifier(DSSurfaceChipModifier(background: background, shape: shape, gate: gate, publishes: publishes))
    }
}

/// Resolves the glass chip, publishes what it resolved to the content, and draws it behind the content.
private struct DSSurfaceChipModifier<ChipShape: InsettableShape>: ViewModifier {
    let background: (DSSurfaceContext) -> DSSurfaceChipCell
    let shape: ChipShape
    let gate: DSSurfaceChipGate
    let publishes: DSSurfaceChipPublication

    private var ds = DSThemeValues()
    @Environment(\.dsSurfaceChipEnclosure) private var enclosure
    @Environment(\.dsBackdropSource) private var backdropSource

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site.
    init(
        background: @escaping (DSSurfaceContext) -> DSSurfaceChipCell,
        shape: ChipShape,
        gate: DSSurfaceChipGate,
        publishes: DSSurfaceChipPublication
    ) {
        self.background = background
        self.shape = shape
        self.gate = gate
        self.publishes = publishes
    }

    func body(content: Content) -> some View {
        let tokens = ds.tokens
        let ground = ds.surface
        let cell = background(ground)
        let resolution = DSSurface.resolveChip(
            cell.fill, on: ground, enclosure: enclosure, gate: gate, publishes: publishes, tokens: tokens
        )
        #if DEBUG
        if resolution.blursBackdrop, backdropSource == nil {
            DSSurfaceChipLog.log.debug(
                "A glass chip on \(ground.material.rawValue, privacy: .public) over \(ground.backdrop.rawValue, privacy: .public) has no backdrop pixels to blur: draw the media with dsBackdrop(_:_:), or put the chip on an opaque Surface. It draws the recipe's fill and edge alone (ADR-0036 §7)."
            )
        }
        #endif
        return content
            .dsSurfaceContext(resolution.published)
            .environment(\.dsSurfaceChipEnclosure, resolution.encloses)
            .background {
                DSSurfaceChipLayers(
                    resolution: resolution,
                    cell: cell,
                    shape: shape,
                    tokens: tokens,
                    backdrop: resolution.blursBackdrop ? backdropSource : nil
                )
                .animation(DSSurfaceAppearance.materialChange(ds.motion), value: resolution)
            }
    }
}

private enum DSSurfaceChipLog {
    static let log = Logger(subsystem: "app.prism.dscomponents", category: "surface-chip")
}

/// The drawing half of `dsSurfaceChip(_:in:elevation:gate:publishes:)`, in one compositing group, back to front
/// (ADR-0036 §7):
///  1. `color.bg.page`, under the fallback;
///  2. the in-bounds mirror, when the recipe blurs and a backdrop supplied pixels;
///  3. the fill: the recipe's fill, `color.bg.surface.raised` under the fallback, or the component's own cell;
///  4. the recipe's 1 px edge in `color.edge.highlight`, `border.hairline` wide, from `edge.start` to `edge.end` on
///     Surface's 135° ramp (`DSGlassEdge`), when glass renders.
///
/// Grain and bloom are never drawn: both are 0 in `material.glass.chip` in every brand and scheme, which
/// `DSSurfaceChipResolutionTests` holds. It sits in the part's background, so it takes the part's size, draws nothing
/// hit-testable and nothing an assistive technology reads.
struct DSSurfaceChipLayers<ChipShape: InsettableShape>: View {
    let resolution: DSSurfaceChipResolution
    let cell: DSSurfaceChipCell
    let shape: ChipShape
    let tokens: DSTokenSet
    /// The pixels under the chip; nil when the recipe does not blur or nothing supplied a backdrop.
    let backdrop: DSBackdropSource?

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                if resolution.paintsPage {
                    shape.fill(tokens.color.bgPage)
                }
                if let backdrop, let recipe = resolution.glass {
                    DSBackdropMirror(backdrop: backdrop, recipe: recipe, shape: shape, edge: .inBounds)
                        .transition(.opacity)
                }
                fill
                if let recipe = resolution.glass {
                    DSGlassEdge(
                        shape: shape, color: tokens.color.edgeHighlight, start: recipe.edgeStart, end: recipe.edgeEnd,
                        lineWidth: tokens.border.hairline, size: proxy.size
                    )
                }
            }
            .frame(width: proxy.size.width, height: proxy.size.height, alignment: .topLeading)
            .compositingGroup()
        }
        .accessibilityHidden(true)
        .allowsHitTesting(false)
    }

    /// The fill of the rendering: the recipe's, `color.bg.surface.raised` under the fallback, or the own cell.
    @ViewBuilder
    private var fill: some View {
        switch resolution.rendered {
        case .glass:
            if let recipe = resolution.glass {
                shape.fill(recipe.fill)
            }
        case .fallback:
            shape.fill(tokens.color.bgSurfaceRaised)
        case .own:
            if case .own(let color) = cell {
                shape.fill(tokens[keyPath: color])
            }
        case .none:
            EmptyView()
        }
    }
}
