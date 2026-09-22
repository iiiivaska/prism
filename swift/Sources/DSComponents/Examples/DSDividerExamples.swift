#if DEBUG
import SwiftUI
import DSCore
import DSTokens

/// `spec/components/Divider.yaml` `examples`, in spec order.
///
/// **Written as data, because this harness never reads the spec.** The web stories are generated from the YAML, so a
/// web example cannot stage itself on another surface or render other props; these are written by hand, and the
/// snapshot harness does not read `surface` either. So each example is one `DSDividerExample` row — its props and the
/// surface it sits inside — and `DSDividerBindingTests.everyExampleIsTheOneTheSpecWrites` holds every row to the
/// spec's own entry: the props with the spec's defaults filled in, the `surface` and the `backdrop`. A row that
/// staged `horizontal-inset` on the page, or left `semantic` decorative, would fail there rather than render a
/// different picture from the web's under the same id.
///
/// **The stage is the same in all four harnesses** (the Apple and web galleries and showcases): the rule sits in a
/// frame `size.card-min` long with `size.row` of empty space on each side of it (`DSExampleRuleFrame`), and an example
/// that declares a material puts that frame inside a Surface of it with `radius: card` and **`padding: none`** — the
/// inset is measured from the container's edge, so a padded Surface would apply `inset: content` twice. The Surface
/// hugs the frame, and a glass example's ground is the backdrop it declares.
///
/// Divider declares no action prop, so no example carries a handler (spec/SCHEMA.md, "Examples and snapshots").
enum DSDividerExamples {
    static let rows: [DSDividerExample] = [
        DSDividerExample("horizontal", orientation: .horizontal, inset: .none),
        DSDividerExample("horizontal-inset", orientation: .horizontal, inset: .content, surface: .solid),
        DSDividerExample("vertical", orientation: .vertical, inset: .none, surface: .solid),
        DSDividerExample("semantic", orientation: .horizontal, isDecorative: false),
        DSDividerExample("on-vivid", orientation: .horizontal, inset: .content, surface: .vivid),
        DSDividerExample("on-glass-over-map", orientation: .horizontal, inset: .content, surface: .glass, backdrop: .map),
    ]

    static var all: [DSExample] { rows.map(\.example) }
}

/// One `examples[]` entry of Divider.yaml: the props, with the spec's defaults where the entry writes none, and the
/// Surface the rule sits inside.
struct DSDividerExample: Hashable {
    let id: String
    let orientation: DSDividerOrientation
    let inset: DSDividerInset
    let isDecorative: Bool
    /// The material of the Surface the rule sits inside (the example's `surface`); nil stages it on the page.
    let surface: DSSurfaceMaterial?
    /// What that Surface declares it sits on (the example's `backdrop`), which is also the ground of a glass example.
    let backdrop: DSBackdropKind

    init(
        _ id: String,
        orientation: DSDividerOrientation = .horizontal,
        inset: DSDividerInset = .none,
        isDecorative: Bool = true,
        surface: DSSurfaceMaterial? = nil,
        backdrop: DSBackdropKind = .none
    ) {
        self.id = id
        self.orientation = orientation
        self.inset = inset
        self.isDecorative = isDecorative
        self.surface = surface
        self.backdrop = backdrop
    }

    /// Only the glass example renders glass, so only it is also snapshotted under forced Reduce Transparency.
    var example: DSExample {
        DSExample("Divider", id, hasGlass: surface?.isGlass ?? false) { DSDividerExampleStage(row: self) }
    }

    /// What the whole stage is painted on: the backdrop a glass Surface blurs, or the page.
    var ground: DSExampleGround {
        switch backdrop {
        case .map: .map
        case .image: .image
        case .none, .vivid: .page
        }
    }
}

/// One Divider example on its stage.
struct DSDividerExampleStage: View {
    let row: DSDividerExample

    var body: some View {
        let rule = DSExampleRuleFrame(row.orientation) {
            DSDivider(orientation: row.orientation, inset: row.inset, isDecorative: row.isDecorative)
        }
        DSExampleStage(row.ground) {
            if let material = row.surface {
                DSSurfaceView(material: material, radius: .card, padding: .none, backdrop: row.backdrop) { rule }
            } else {
                rule
            }
        }
    }
}

/// The frame a rule is staged in, the same in all four harnesses: `size.card-min` along the rule and `size.row` of
/// empty space on either side of it, so a horizontal rule's frame is `size.card-min` × (2 × `size.row` + the
/// hairline) — 200 × 89 in regular, 200 × 65 in compact — and a vertical one's is that turned on its side.
///
/// The rule stretches along the frame, which is the definite cross size a vertical Divider needs (Divider.yaml
/// behavior 2). Every edge lands on a whole point, so at scale 1 the hairline is one row of pixels at full
/// strength rather than two at half.
struct DSExampleRuleFrame<Content: View>: View {
    let orientation: DSDividerOrientation
    let content: Content
    private var ds = DSThemeValues()

    init(_ orientation: DSDividerOrientation, @ViewBuilder content: () -> Content) {
        self.orientation = orientation
        self.content = content()
    }

    var body: some View {
        let size = ds.tokens.size
        switch orientation {
        case .horizontal:
            content
                .frame(width: size.cardMin)
                .padding(.vertical, size.row)
        case .vertical:
            content
                .frame(height: size.cardMin)
                .padding(.horizontal, size.row)
        }
    }
}

#Preview("Divider · horizontal") { DSExamplePreview(example: DSExamples.named("Divider/horizontal")) }
#Preview("Divider · horizontal-inset") { DSExamplePreview(example: DSExamples.named("Divider/horizontal-inset")) }
#Preview("Divider · vertical") { DSExamplePreview(example: DSExamples.named("Divider/vertical")) }
#Preview("Divider · semantic") { DSExamplePreview(example: DSExamples.named("Divider/semantic")) }
#Preview("Divider · on-vivid") { DSExamplePreview(example: DSExamples.named("Divider/on-vivid")) }
#Preview("Divider · on-glass-over-map") { DSExamplePreview(example: DSExamples.named("Divider/on-glass-over-map")) }

#Preview("Divider · on-glass-over-map under Reduce Transparency takes the raised cell") {
    DSExamplePreview(example: DSExamples.named("Divider/on-glass-over-map"))
        .dsAccessibilityPolicy(reduceTransparency: true)
}

#Preview("Divider · every example under Increase Contrast") {
    VStack(spacing: 0) {
        ForEach(DSDividerExamples.all) { example in
            DSExamplePreview(example: example)
        }
    }
    .dsAccessibilityPolicy(increasedContrast: true)
}

#Preview("Divider · rows of a list, inset to the content edge") {
    DSTheme {
        DSExampleStage {
            DSSurfaceView(material: .solid, radius: .card, padding: .none) {
                DSExampleDividedRows()
            }
            .frame(width: DSExampleSize.card)
        }
    }
}

#if canImport(Playgrounds)
import Playgrounds

#Playground("Divider · the line on each published material, and the inset per density") {
    let colors = DSSurfaceMaterial.allCases.map { material in
        (material, DSDividerAppearance.color(on: material))
    }
    let insets = [DSDensity.compact, .regular, .comfortable].map { density in
        let tokens = DSTokenSet(DSTokenContext(density: density))
        return (
            density,
            DSDividerAppearance.thickness(tokens.border),
            DSDividerAppearance.inset(.none, tokens.space),
            DSDividerAppearance.inset(.content, tokens.space)
        )
    }
    _ = (colors, insets)
}
#endif

/// Three invented rows with an inset rule between each pair, the use the spec's `usage.do` names: the rules start at
/// the content edge and every one in the list has the same inset.
struct DSExampleDividedRows: View {
    private var ds = DSThemeValues()

    init() {}

    var body: some View {
        let space = ds.tokens.space
        let rows = ["Morning shift", "Afternoon shift", "Night shift"]
        VStack(alignment: .leading, spacing: space.step3) {
            ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                if index > 0 { DSDivider(inset: .content) }
                DSText(verbatim: row, role: .bodyMd)
                    .padding(.horizontal, space.cardPadding)
            }
        }
        .padding(.vertical, space.cardPadding)
    }
}
#endif
