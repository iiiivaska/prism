#if DEBUG
import SwiftUI
import DSCore
import DSTokens

/// `spec/components/Surface.yaml` `examples`, in spec order. A Surface example sets no content, so each renders the
/// empty content slot at a size the example's radius reads at: a card at `size.card.min`, a tile at `space.13`, the
/// pill at `size.control.md` tall.
enum DSSurfaceExamples {
    static let all: [DSExample] = [
        DSExample("Surface", "solid-card") {
            DSExampleStage { DSSurfaceView(material: .solid, radius: .card) { DSExampleSlot(.card) } }
        },
        DSExample("Surface", "vivid-default") {
            DSExampleStage { DSSurfaceView(material: .vivid, radius: .card) { DSExampleSlot(.card) } }
        },
        DSExample("Surface", "vivid-pair") {
            DSExampleStage { DSVividPairGrid() }
        },
        DSExample("Surface", "glass-over-map", hasGlass: true) {
            DSExampleStage(.map) {
                DSSurfaceView(material: .glass, radius: .card, elevation: .overlay, backdrop: .map) { DSExampleSlot(.card) }
            }
        },
        DSExample("Surface", "glass-light-over-image", hasGlass: true) {
            DSExampleStage(.image) {
                DSSurfaceView(material: .glassLight, radius: .card, backdrop: .image) { DSExampleSlot(.card) }
            }
        },
        DSExample("Surface", "glass-selected", hasGlass: true) {
            DSExampleStage(.image) {
                DSSurfaceView(material: .glass, radius: .card, backdrop: .image, selected: true) { DSExampleSlot(.card) }
            }
        },
        DSExample("Surface", "inverse-pill") {
            DSExampleStage { DSSurfaceView(material: .inverse, radius: .pill, padding: .none) { DSExampleSlot(.pill) } }
        },
        DSExample("Surface", "accent-tile") {
            DSExampleStage { DSSurfaceView(material: .accent, radius: .tile) { DSExampleSlot(.tile) } }
        },
    ]
}

/// An empty content slot at an example size.
struct DSExampleSlot: View {
    enum Size { case card, tile, pill }

    let size: Size
    private var ds = DSThemeValues()

    init(_ size: Size) { self.size = size }

    var body: some View {
        let tokens = ds.tokens
        switch size {
        case .card:
            Color.clear.frame(width: tokens.size.cardMin - 2 * tokens.space.cardPadding, height: tokens.size.cardMin - 2 * tokens.space.cardPadding)
        case .tile:
            Color.clear.frame(width: tokens.space.step13 - 2 * tokens.space.cardPadding, height: tokens.space.step13 - 2 * tokens.space.cardPadding)
        case .pill:
            Color.clear.frame(width: tokens.space.step13, height: tokens.size.controlMd)
        }
    }
}

/// `vivid-pair`: a 2×2 of vivid tiles, `grid: ["1", "2", "2", "1"]` row-major, one slot pair on the diagonals.
struct DSVividPairGrid: View {
    private var ds = DSThemeValues()

    init() {}

    var body: some View {
        let gap = ds.tokens.space.cardGap
        Grid(horizontalSpacing: gap, verticalSpacing: gap) {
            GridRow {
                DSSurfaceView(material: .vivid, vivid: .slot1, radius: .tile) { DSExampleSlot(.tile) }
                DSSurfaceView(material: .vivid, vivid: .slot2, radius: .tile) { DSExampleSlot(.tile) }
            }
            GridRow {
                DSSurfaceView(material: .vivid, vivid: .slot2, radius: .tile) { DSExampleSlot(.tile) }
                DSSurfaceView(material: .vivid, vivid: .slot1, radius: .tile) { DSExampleSlot(.tile) }
            }
        }
    }
}

#Preview("Surface · solid-card") { DSExamplePreview(example: DSExamples.named("Surface/solid-card")) }
#Preview("Surface · vivid-default") { DSExamplePreview(example: DSExamples.named("Surface/vivid-default")) }
#Preview("Surface · vivid-pair") { DSExamplePreview(example: DSExamples.named("Surface/vivid-pair")) }
#Preview("Surface · glass-over-map") { DSExamplePreview(example: DSExamples.named("Surface/glass-over-map")) }
#Preview("Surface · glass-light-over-image") { DSExamplePreview(example: DSExamples.named("Surface/glass-light-over-image")) }
#Preview("Surface · glass-selected") { DSExamplePreview(example: DSExamples.named("Surface/glass-selected")) }
#Preview("Surface · inverse-pill") { DSExamplePreview(example: DSExamples.named("Surface/inverse-pill")) }
#Preview("Surface · accent-tile") { DSExamplePreview(example: DSExamples.named("Surface/accent-tile")) }

#Preview("Surface · glass examples under Reduce Transparency") {
    VStack(spacing: 0) {
        ForEach(DSSurfaceExamples.all.filter(\.hasGlass)) { example in
            DSExamplePreview(example: example)
        }
    }
    .dsAccessibilityPolicy(reduceTransparency: true)
}

#Preview("Surface · glass examples under Increase Contrast") {
    VStack(spacing: 0) {
        ForEach(DSSurfaceExamples.all.filter(\.hasGlass)) { example in
            DSExamplePreview(example: example)
        }
    }
    .dsAccessibilityPolicy(increasedContrast: true)
}

#Preview("Surface · glass on a vivid card, nested radius") {
    DSTheme {
        DSExampleStage {
            DSSurfaceView(material: .vivid, radius: .cardLarge) {
                VStack(alignment: .leading, spacing: 0) {
                    DSText("Average yield", role: .headline)
                    Spacer(minLength: 0)
                    DSSurfaceView(material: .glass, radius: .card, backdrop: .vivid) {
                        DSText("Dollars per batch", role: .caption, tone: .secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .frame(width: DSExampleSize.card, height: DSExampleSize.card)
            }
        }
    }
}

#if canImport(Playgrounds)
import Playgrounds

#Playground("Surface · glass under each fallback trigger") {
    let triggers = [
        ("standard", DSTokenContext(colorScheme: .light)),
        ("Reduce Transparency", DSTokenContext(colorScheme: .light, transparency: .reduced)),
        ("Increase Contrast", DSTokenContext(colorScheme: .dark, contrast: .increased)),
    ]
    let rows = triggers.map { name, context in
        let tokens = DSTokenSet(context)
        let resolution = DSSurface.resolve(material: .glass, backdrop: .map, tokens: tokens)
        let selected = DSSurface.resolve(material: .glass, backdrop: .map, selected: true, tokens: tokens)
        return (
            name,
            resolution.material,
            DSSurfaceAppearance.background(resolution.material),
            DSSurfaceAppearance.edge(resolution, tokens),
            DSSurfaceAppearance.grain(resolution, gradient: tokens.gradient.vividDefault),
            selected.material
        )
    }
    _ = rows
}
#endif

/// Sizes for the free-form previews, from tokens.
enum DSExampleSize {
    @MainActor static var card: CGFloat { DSTokenSet(.platformDefault).size.cardMin }
    /// The gap between examples in a free-form preview: `space.4`.
    @MainActor static var gap: CGFloat { DSTokenSet(.platformDefault).space.step4 }
}
#endif
