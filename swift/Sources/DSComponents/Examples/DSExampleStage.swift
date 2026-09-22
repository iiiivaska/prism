#if DEBUG
import SwiftUI
import DSCore
import DSTokens

/// One `examples[]` entry of a component spec, rendered: what the `#Preview` blocks show and what the snapshot
/// harness renders into `gallery/snapshots/<Name>/<id>.<platform>.<scheme>.png` (spec/SCHEMA.md, P3-5).
///
/// Debug builds only: the examples, their stages and their synthetic backdrops are gallery content, not API.
struct DSExample: Identifiable {
    /// The spec's `name`.
    let component: String
    /// The example's `id`.
    let name: String
    /// The schemes the example renders in; both unless the spec declares `schemes`.
    let schemes: [ColorScheme]
    /// True for an example that renders a glass material, which the snapshots also take under forced Reduce
    /// Transparency (roadmap P3-3).
    let hasGlass: Bool
    let content: @MainActor () -> AnyView

    var id: String { "\(component)/\(name)" }

    init(
        _ component: String,
        _ name: String,
        schemes: [ColorScheme] = [.light, .dark],
        hasGlass: Bool = false,
        @ViewBuilder content: @escaping @MainActor () -> some View
    ) {
        self.component = component
        self.name = name
        self.schemes = schemes
        self.hasGlass = hasGlass
        self.content = { AnyView(content()) }
    }
}

/// Every example of the components this target implements, in spec order.
enum DSExamples {
    static var all: [DSExample] { DSSurfaceExamples.all + DSTextExamples.all + DSButtonExamples.all + DSCardExamples.all }

    static func named(_ id: String) -> DSExample? { all.first { $0.id == id } }
}

/// What an example sits on: the example's `surface` when the component does not render it itself.
enum DSExampleGround {
    /// `color.bg.page`.
    case page
    /// The synthetic map, drawn from `color.map.*`.
    case map
    /// The synthetic image.
    case image
}

/// The page an example renders on: the ground, `space.page-margin` around the example, and the backdrop pixels a
/// glass surface blurs.
struct DSExampleStage<Content: View>: View {
    let ground: DSExampleGround
    let content: Content
    private var ds = DSThemeValues()

    init(_ ground: DSExampleGround = .page, @ViewBuilder content: () -> Content) {
        self.ground = ground
        self.content = content()
    }

    var body: some View {
        let padded = content.padding(ds.tokens.space.pageMargin)
        switch ground {
        case .page:
            padded.background(ds.tokens.color.bgPage)
        case .map:
            padded.dsBackdrop { DSExampleMap() }
        case .image:
            padded.dsBackdrop { DSExampleImage() }
        }
    }
}

/// Renders an example the way a preview shows it: one `DSTheme` per scheme, side by side.
struct DSExamplePreview: View {
    let example: DSExample?
    var brand: DSBrand = .default

    var body: some View {
        if let example {
            HStack(alignment: .top, spacing: 0) {
                ForEach(example.schemes, id: \.self) { scheme in
                    DSTheme(brand: brand) { example.content() }
                        .environment(\.colorScheme, scheme)
                }
            }
        }
    }
}

// MARK: - Synthetic backdrops

/// A map drawn only from `color.map.*`, the grounds glass limits are measured on (ADR-0030 §1): land, blocks and
/// buildings, a park, water, roads over their casing and a route. Every ground stays inside ADR-0022 §3.3's limits in
/// both schemes, because the tokens do (`map/backdrop-limit`).
struct DSExampleMap: View {
    private var ds = DSThemeValues()

    init() {}

    var body: some View {
        let color = ds.tokens.color
        let space = ds.tokens.space
        let chart = ds.tokens.chart
        Canvas { context, size in
            let w = size.width
            let h = size.height
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(color.mapLand))

            // Blocks, with a building inside each.
            let columns = 4
            let rows = 4
            let cell = CGSize(width: w / CGFloat(columns), height: h / CGFloat(rows))
            for row in 0..<rows {
                for column in 0..<columns where (row + column) % 3 != 2 {
                    let block = CGRect(
                        x: CGFloat(column) * cell.width, y: CGFloat(row) * cell.height,
                        width: cell.width, height: cell.height
                    ).insetBy(dx: space.step4, dy: space.step4)
                    context.fill(Path(roundedRect: block, cornerRadius: space.step1), with: .color(color.mapBlock))
                    context.fill(
                        Path(block.insetBy(dx: block.width / 4, dy: block.height / 4)),
                        with: .color(color.mapBuilding)
                    )
                }
            }

            // A park and a river.
            context.fill(
                Path(ellipseIn: CGRect(x: w * 0.52, y: h * 0.06, width: w * 0.42, height: h * 0.34)),
                with: .color(color.mapPark)
            )
            var river = Path()
            river.move(to: CGPoint(x: 0, y: h * 0.78))
            river.addCurve(
                to: CGPoint(x: w, y: h * 0.62),
                control1: CGPoint(x: w * 0.35, y: h * 0.66),
                control2: CGPoint(x: w * 0.6, y: h * 0.9)
            )
            context.stroke(river, with: .color(color.mapWater), lineWidth: space.step8)

            // Two roads over their casing.
            var roads = Path()
            roads.move(to: CGPoint(x: 0, y: h * 0.5))
            roads.addLine(to: CGPoint(x: w, y: h * 0.5))
            roads.move(to: CGPoint(x: w * 0.5, y: 0))
            roads.addLine(to: CGPoint(x: w * 0.5, y: h))
            context.stroke(roads, with: .color(color.mapRoadCasing), lineWidth: space.step4 + 2 * ds.tokens.border.strong)
            context.stroke(roads, with: .color(color.mapRoad), lineWidth: space.step4)

            // A route along the roads, on its casing.
            var route = Path()
            route.move(to: CGPoint(x: w * 0.1, y: h * 0.5))
            route.addLine(to: CGPoint(x: w * 0.5, y: h * 0.5))
            route.addLine(to: CGPoint(x: w * 0.5, y: h * 0.12))
            let lineStyle = StrokeStyle(lineWidth: 2 * chart.lineWidth, lineCap: .round, lineJoin: .round)
            let casingStyle = StrokeStyle(lineWidth: 3.5 * chart.lineWidth, lineCap: .round, lineJoin: .round)
            context.stroke(route, with: .color(color.mapRouteCasing), style: casingStyle)
            context.stroke(route, with: .color(color.mapRoute), style: lineStyle)
        }
    }
}

/// A soft, photograph-like backdrop from the map grounds: washes of park, water and building over the land, blurred.
/// It stays at OKLCH L 0.45 or lighter in light and 0.35 or darker in dark, inside every glass limit of
/// ADR-0022 §3.3 and ADR-0029 §1.6, so each glass example renders over an allowed image in both schemes.
struct DSExampleImage: View {
    private var ds = DSThemeValues()

    init() {}

    var body: some View {
        let color = ds.tokens.color
        let blur = ds.tokens.material.glassFillBlur
        Canvas { context, size in
            let w = size.width
            let h = size.height
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(color.mapLand))
            var washes = context
            washes.addFilter(.blur(radius: DSBlur.radius(cssStandardDeviation: blur)))
            washes.fill(Path(ellipseIn: CGRect(x: -w * 0.1, y: -h * 0.1, width: w * 0.7, height: h * 0.6)), with: .color(color.mapPark))
            washes.fill(Path(ellipseIn: CGRect(x: w * 0.45, y: h * 0.3, width: w * 0.7, height: h * 0.6)), with: .color(color.mapWater))
            washes.fill(Path(ellipseIn: CGRect(x: w * 0.1, y: h * 0.55, width: w * 0.5, height: h * 0.5)), with: .color(color.mapBuilding))
            washes.fill(Path(ellipseIn: CGRect(x: w * 0.6, y: -h * 0.05, width: w * 0.35, height: h * 0.35)), with: .color(color.mapBuilding))
        }
    }
}
#endif
