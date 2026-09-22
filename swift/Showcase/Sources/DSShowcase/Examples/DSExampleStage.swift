import SwiftUI
import DSCore
import DSComponents
import DSTokens

/// What the whole stage is painted on, under the example and under any surface around it.
public enum DSExampleGround: Hashable {
    /// `color.bg.page`.
    case page
    /// The synthetic map, drawn only from `color.map.*`.
    case map
    /// The synthetic image: washes of the map grounds, blurred.
    case image
}

/// How one `examples[]` entry asks to be staged: the surface the component is drawn *inside*, and the ground the
/// whole thing is drawn *on*.
///
/// **The vocabulary is the schema's, read rather than guessed.** `spec/component.schema.json` writes
/// `examples[].surface` as one of `page`, `solid`, `raised`, `vivid`, `glass`, `glassLight`, `image` and `map`:
/// `page`, `image` and `map` name a ground the component sits straight on, and the five materials name a Surface
/// it sits inside. A glass material then names what that Surface sits on in `examples[].backdrop` — `image`,
/// `map` or `vivid` — because the tones of the scheme's glass key off it (ADR-0029 §1.4). The specs use six of
/// the eight words today; `Divider` declares `solid` twice and `Icon` declares `glassLight` once.
///
/// **Why this is one reading and not two switches.** The ground and the enclosing surface used to be decided in
/// two places — here and in `DSExampleView`'s own `switch` — and both ended in a `default`, so they could
/// disagree and neither could fail. They did: an example declaring `solid`, `glassLight`, `map` or `image` as the
/// material around it was drawn on a bare page, and `glassLight` over an image got neither its material nor its
/// backdrop. No build failed; the picture was simply wrong, in the app this repository points people at. One
/// exhaustive reading is what stops that, and a word it cannot stage stops the example and names itself rather
/// than falling through to the page.
public enum DSExampleStaging: Hashable {
    /// The component is drawn straight on this ground.
    case ground(DSExampleGround)
    /// The component is drawn inside a Surface of `material`, which declares `backdrop`, on `ground`.
    case surface(material: DSSurfaceMaterial, backdrop: DSBackdropKind, ground: DSExampleGround)
    /// The example declares a word this build cannot stage. The sentence names the word and says why, and the
    /// page prints it in the example's own place.
    case unstageable(String)

    /// The staging an example declares. An entry with no `surface` is the page, which is what the schema's
    /// `page` names too.
    public static func of(_ example: DSSpecExample) -> DSExampleStaging {
        let surface = example.surface ?? "page"
        switch surface {
        case "page": return .ground(.page)
        case "map": return .ground(.map)
        case "image": return .ground(.image)
        case "solid": return .surface(material: .solid, backdrop: .none, ground: .page)
        case "raised": return .surface(material: .raised, backdrop: .none, ground: .page)
        case "vivid": return .surface(material: .vivid, backdrop: .none, ground: .page)
        case "glass": return glass(.glass, example)
        case "glassLight": return glass(.glassLight, example)
        default:
            return .unstageable(
                """
                declares `surface: \(surface)`, which is not one of page, solid, raised, vivid, glass, glassLight, \
                image or map (spec/component.schema.json, `examples[].surface`). Nothing is drawn, because drawing \
                it on the page would be a picture the spec does not mean.
                """
            )
        }
    }

    /// A glass material sits on what `backdrop` names, and the stage paints those pixels for it to blur. Glass
    /// renders only over an image, a map or a vivid surface (ADR-0022 §1.2 trigger 4), so a glass example with no
    /// backdrop is a defect in the spec rather than a surface to draw: without one the Surface takes the glass
    /// fallback, which is a different material from the one the example is about.
    private static func glass(_ material: DSSurfaceMaterial, _ example: DSSpecExample) -> DSExampleStaging {
        guard let backdrop = example.backdrop else {
            return .unstageable(
                """
                declares `surface: \(material.rawValue)` and no `backdrop`, and glass renders only over an image, a \
                map or a vivid surface (ADR-0022 §1.2 trigger 4). Staged as it is written, the example would show \
                the glass fallback rather than the material it is about.
                """
            )
        }
        switch backdrop {
        case "map": return .surface(material: material, backdrop: .map, ground: .map)
        case "image": return .surface(material: material, backdrop: .image, ground: .image)
        case "vivid":
            return .unstageable(
                """
                declares `surface: \(material.rawValue)` over `backdrop: vivid`, which is glass inside a vivid \
                Surface rather than glass on a ground this stage paints. The schema allows it and no spec writes it \
                yet; the first example that does is the one that builds it, on both stacks at once.
                """
            )
        default:
            return .unstageable(
                """
                declares `backdrop: \(backdrop)`, which is not one of image, map or vivid \
                (spec/component.schema.json, `examples[].backdrop`).
                """
            )
        }
    }
}

/// The page an example renders on: the ground, `space.page-margin` around it, the harness's own width, and the
/// backdrop pixels a glass surface blurs.
///
/// This is the showcase's own copy of the stage the snapshot harness uses (`DSComponents/Examples`), which is
/// `internal` and `#if DEBUG` and so unreachable from an app. Both draw only from `color.map.*` and
/// `space.page-margin`, which is what makes them the same stage.
///
/// **The stage constrains the width, because an example is staged at the width its spec means.** A bare stage
/// hands the whole page to the example, and a greedy layout — `Surface`'s `vivid-pair`, `grid: ["1", "2", "2", "1"]`
/// — takes every point of it, so the 2×2 rendered as wide as the window on the Mac and as wide as the screen on
/// the phone. Neither of the two harnesses this one copies works that way:
///
/// - the web's `.ds-sc-stage` is `inline-size: fit-content` and caps a text example at `calc(card-min * 2)`
///   (`src/harness/harness.css`);
/// - the Apple snapshot harness renders each example at its own size — `Surface/vivid-pair` is a 268 pt square
///   baseline and `Button/primary-md` is 136 × 88 — inside a proposal it never has to fill.
///
/// So the stage is fit-content too, capped at **two card columns and the card gap** (`size.card-min` × 2 +
/// `space.card-gap`), which is the widest thing either harness stages and is what a text example wraps at. The
/// horizontal `ScrollView` is what makes fit-content safe on a phone: `Card/vivid-pair` is 460 pt wide and no
/// iPhone is, so the stage scrolls sideways rather than squeezing the example into a width no spec means.
public struct DSExampleStage<Content: View>: View {
    private let ground: DSExampleGround
    private let content: Content
    private var ds = DSThemeValues()

    public init(_ ground: DSExampleGround = .page, @ViewBuilder content: () -> Content) {
        self.ground = ground
        self.content = content()
    }

    /// The widest an example is ever staged: a two-column card grid. The two grids the harnesses stage use
    /// different gaps — `space.card-gap` for Surface's tiles, `space.4` for Card's cells — so the cap takes the
    /// larger, and no density can make the cap narrower than the grid it is capping.
    public static func contentWidth(_ tokens: DSTokenSet) -> CGFloat {
        2 * tokens.size.cardMin + max(tokens.space.cardGap, tokens.space.step4)
    }

    public var body: some View {
        let tokens = ds.tokens
        // Inside the horizontal scroll view the proposed width is unspecified, so an example takes its own ideal
        // width — the snapshot harness's fit-content — and the cap is what a greedy layout and a paragraph of
        // body text stop at.
        let staged = content
            .frame(maxWidth: DSExampleStage.contentWidth(tokens), alignment: .leading)
            .padding(tokens.space.pageMargin)
        let grounded = Group {
            switch ground {
            case .page: staged.background(tokens.color.bgPage)
            case .map: staged.dsBackdrop { DSExampleMap() }
            case .image: staged.dsBackdrop { DSExampleImage() }
            }
        }
        ScrollView(.horizontal) {
            grounded
        }
        // Nothing bounces and no bar appears while the stage fits, so a Mac window wide enough for the harness
        // looks exactly as it did.
        .scrollBounceBehavior(.basedOnSize)
    }
}

/// The frame a component that sizes itself from its content is staged in: a `size.card-min` square.
///
/// Both harnesses give one. The web writes it as `.ds-sc-frame { inline-size: var(--ds-size-card-min);
/// block-size: var(--ds-size-card-min) }` and the Apple snapshot harness as `DSExampleCardFrame`, which is why
/// `Card/solid-metric` is a 248 pt baseline — a 200 pt square and the page margin — on both stacks. Without it a
/// Card takes whatever the page proposes, and on a phone that is a squat rectangle with its title truncated,
/// which is not the example the spec wrote.
public struct DSExampleFrame<Content: View>: View {
    private let content: Content
    private var ds = DSThemeValues()

    public init(@ViewBuilder content: () -> Content) { self.content = content() }

    public var body: some View {
        let side = ds.tokens.size.cardMin
        content.frame(width: side, height: side)
    }
}

/// The frame a rule is staged in: `size.card-min` along the rule and `size.row` of empty space on either side of it.
///
/// It is the snapshot harness's `DSExampleRuleFrame` and the web's `.ds-sc-rule` / `.ds-gallery-rule`, so a
/// horizontal Divider example is `size.card-min` × (2 × `size.row` + the hairline) — 200 × 89 in regular, 200 × 65 in
/// compact — in every harness, and a vertical one is that turned on its side. The rule stretches along the frame,
/// which is the definite cross size a vertical Divider needs (Divider.yaml behavior 2). Inside a Surface the frame is
/// what the Surface hugs, with no padding of its own (`DSDividerRenderer.surfacePadding(for:)`).
public struct DSExampleRuleFrame<Content: View>: View {
    private let orientation: DSDividerOrientation
    private let content: Content
    private var ds = DSThemeValues()

    public init(_ orientation: DSDividerOrientation, @ViewBuilder content: () -> Content) {
        self.orientation = orientation
        self.content = content()
    }

    public var body: some View {
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

/// An empty content slot at an example size, for a Surface example, which sets no content.
public struct DSExampleSlot: View {
    public enum Size: Hashable { case card, tile, pill }

    private let size: Size
    private var ds = DSThemeValues()

    public init(_ size: Size) { self.size = size }

    public var body: some View {
        let tokens = ds.tokens
        switch size {
        case .card:
            Color.clear.frame(
                width: tokens.size.cardMin - 2 * tokens.space.cardPadding,
                height: tokens.size.cardMin - 2 * tokens.space.cardPadding
            )
        case .tile:
            Color.clear.frame(
                width: tokens.space.step13 - 2 * tokens.space.cardPadding,
                height: tokens.space.step13 - 2 * tokens.space.cardPadding
            )
        case .pill:
            Color.clear.frame(width: tokens.space.step13, height: tokens.size.controlMd)
        }
    }
}

/// A map drawn only from `color.map.*` (ADR-0030 §1): land, blocks and buildings, a park, water, roads over their
/// casing and a route. Every ground stays inside ADR-0022 §3.3's glass limits in both schemes.
public struct DSExampleMap: View {
    private var ds = DSThemeValues()

    public init() {}

    public var body: some View {
        let color = ds.tokens.color
        let space = ds.tokens.space
        let chart = ds.tokens.chart
        let border = ds.tokens.border
        Canvas { context, size in
            let w = size.width
            let h = size.height
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(color.mapLand))

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

            var roads = Path()
            roads.move(to: CGPoint(x: 0, y: h * 0.5))
            roads.addLine(to: CGPoint(x: w, y: h * 0.5))
            roads.move(to: CGPoint(x: w * 0.5, y: 0))
            roads.addLine(to: CGPoint(x: w * 0.5, y: h))
            context.stroke(roads, with: .color(color.mapRoadCasing), lineWidth: space.step4 + 2 * border.strong)
            context.stroke(roads, with: .color(color.mapRoad), lineWidth: space.step4)

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

/// A soft, photograph-like backdrop from the map grounds: washes of park, water and building over the land,
/// blurred, inside every glass limit of ADR-0022 §3.3 in both schemes.
public struct DSExampleImage: View {
    private var ds = DSThemeValues()

    public init() {}

    public var body: some View {
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
