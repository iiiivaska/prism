#if DEBUG
import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// `spec/components/Icon.yaml` `examples`, in spec order.
///
/// **Written as data, because this harness never reads the spec**, as Divider's are: each example is one
/// `DSIconExample` row — its props with the spec's defaults filled in, and the surface and backdrop it declares — and
/// `DSIconBindingTests.everyExampleIsTheOneTheSpecWrites` holds every row to the spec's own entry. A row that staged
/// `on-vivid` on the page, or dropped `named-standalone`'s label, would fail there rather than render a different
/// picture, or a different accessibility tree, from the web's under the same id.
///
/// **The stage is the same in all four harnesses** (the Apple and web galleries and showcases): there is no card-sized
/// frame, and a page example puts the glyph straight on the page. An example that declares a material puts it inside a
/// Surface of that material with `radius: card`, the default `padding: card` and the example's `backdrop`; the Surface
/// hugs the glyph, and a glass example's ground is the backdrop it declares. `inherit-in-row` puts the glyph in a
/// wrapper whose foreground is `color.text.primary` — the row's own foreground, ListRow.yaml's `title.color.default` —
/// with no text of its own, so it adds nothing to the accessibility tree (`DSExampleRowForeground`).
///
/// The one string is `named-standalone`'s label, the spec's own invented phrase (ADR-0015 rule 3). Icon declares no
/// action prop, so no example carries a handler (spec/SCHEMA.md, "Examples and snapshots").
enum DSIconExamples {
    static let rows: [DSIconExample] = [
        DSIconExample("control-md", name: .actionSettings, size: .md, tone: .primary),
        DSIconExample("corner-sm", name: .navOpen, size: .sm, tone: .secondary),
        DSIconExample("display-lg", name: .objectMap, size: .lg, weight: .display, tone: .secondary),
        DSIconExample("status-filled", name: .statusWarning, size: .sm, style: .filled, tone: .warning),
        DSIconExample("accent-mark", name: .objectGps, size: .sm, tone: .accent),
        DSIconExample("inherit-in-row", name: .statusOnline, size: .sm, tone: nil),
        DSIconExample("decorative", name: .objectChart, size: .md, isDecorative: true),
        DSIconExample(
            "named-standalone", name: .objectLock, size: .sm, tone: .secondary, label: "Locked for editing",
            isDecorative: false
        ),
        DSIconExample("on-vivid", name: .navOpen, size: .sm, tone: .primary, surface: .vivid),
        DSIconExample("on-glass-over-map", name: .objectMapPin, size: .md, tone: .secondary, surface: .glass, backdrop: .map),
        DSIconExample(
            "on-glass-light-over-image", name: .actionPlay, size: .md, tone: .primary, surface: .glassLight,
            backdrop: .image
        ),
    ]

    static var all: [DSExample] { rows.map(\.example) }
}

/// One `examples[]` entry of Icon.yaml: the props, with the spec's defaults where the entry writes none, and the
/// Surface the glyph sits inside.
struct DSIconExample: Hashable {
    let id: String
    let name: DSIconName
    let size: DSGlyphSize
    let weight: DSGlyphWeight
    let style: DSIconStyle
    /// nil is `inherit`.
    let tone: DSGlyphTone?
    /// The spec's string, byte for byte; the view takes it as a localized key, as every caller-written label is.
    let label: String?
    let isDecorative: Bool
    /// The material of the Surface the glyph sits inside (the example's `surface`); nil stages it on the page.
    let surface: DSSurfaceMaterial?
    /// What that Surface declares it sits on (the example's `backdrop`), which is also the ground of a glass example.
    let backdrop: DSBackdropKind

    init(
        _ id: String,
        name: DSIconName,
        size: DSGlyphSize = .md,
        weight: DSGlyphWeight = .control,
        style: DSIconStyle = .outline,
        tone: DSGlyphTone? = .primary,
        label: String? = nil,
        isDecorative: Bool = false,
        surface: DSSurfaceMaterial? = nil,
        backdrop: DSBackdropKind = .none
    ) {
        self.id = id
        self.name = name
        self.size = size
        self.weight = weight
        self.style = style
        self.tone = tone
        self.label = label
        self.isDecorative = isDecorative
        self.surface = surface
        self.backdrop = backdrop
    }

    /// Only the two glass examples render glass, so only they are also snapshotted under forced Reduce Transparency.
    var example: DSExample {
        DSExample("Icon", id, hasGlass: surface?.isGlass ?? false) { DSIconExampleStage(row: self) }
    }

    /// The glyph itself, with the example's props.
    var icon: DSIcon {
        DSIcon(
            name, size: size, weight: weight, style: style, tone: tone, label: label.map { LocalizedStringKey($0) },
            isDecorative: isDecorative
        )
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

/// One Icon example on its stage.
struct DSIconExampleStage: View {
    let row: DSIconExample

    var body: some View {
        DSExampleStage(row.ground) {
            if let material = row.surface {
                DSSurfaceView(material: material, radius: .card, backdrop: row.backdrop) { row.icon }
            } else if row.tone == nil {
                DSExampleRowForeground { row.icon }
            } else {
                row.icon
            }
        }
    }
}

/// The foreground of a row, with nothing else of a row: `color.text.primary`, ListRow.yaml's `title.color.default`,
/// which a glyph with the `inherit` tone takes (Icon.yaml behavior 9). It draws no text, so it adds no element to the
/// accessibility tree; the web harnesses stage the same wrapper (`data-ds-gallery-foreground="row"`).
struct DSExampleRowForeground<Content: View>: View {
    let content: Content
    private var ds = DSThemeValues()

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content.foregroundStyle(ds.tokens.color.textPrimary)
    }
}

#Preview("Icon · control-md") { DSExamplePreview(example: DSExamples.named("Icon/control-md")) }
#Preview("Icon · corner-sm") { DSExamplePreview(example: DSExamples.named("Icon/corner-sm")) }
#Preview("Icon · display-lg") { DSExamplePreview(example: DSExamples.named("Icon/display-lg")) }
#Preview("Icon · status-filled") { DSExamplePreview(example: DSExamples.named("Icon/status-filled")) }
#Preview("Icon · accent-mark") { DSExamplePreview(example: DSExamples.named("Icon/accent-mark")) }
#Preview("Icon · inherit-in-row") { DSExamplePreview(example: DSExamples.named("Icon/inherit-in-row")) }
#Preview("Icon · decorative") { DSExamplePreview(example: DSExamples.named("Icon/decorative")) }
#Preview("Icon · named-standalone") { DSExamplePreview(example: DSExamples.named("Icon/named-standalone")) }
#Preview("Icon · on-vivid") { DSExamplePreview(example: DSExamples.named("Icon/on-vivid")) }
#Preview("Icon · on-glass-over-map") { DSExamplePreview(example: DSExamples.named("Icon/on-glass-over-map")) }
#Preview("Icon · on-glass-light-over-image") {
    DSExamplePreview(example: DSExamples.named("Icon/on-glass-light-over-image"))
}

#Preview("Icon · every example under Bold Text: the rung steps once") {
    VStack(spacing: 0) {
        ForEach(DSIconExamples.all) { example in
            DSExamplePreview(example: example)
        }
    }
    .dsAccessibilityPolicy(boldText: true)
}

#Preview("Icon · on-glass-over-map under Reduce Transparency takes the raised cell") {
    DSExamplePreview(example: DSExamples.named("Icon/on-glass-over-map"))
        .dsAccessibilityPolicy(reduceTransparency: true)
}

#Preview("Icon · the registry in every box, at control and at display") {
    DSTheme {
        DSExampleStage {
            DSExampleRegistryGrid()
        }
    }
}

#if canImport(Playgrounds)
import Playgrounds

#Playground("Icon · the tone on each published material, and the box per density") {
    let tones = DSSurfaceMaterial.allCases.flatMap { material in
        DSGlyphTone.allCases.map { tone in (material, tone, DSIconAppearance.color(tone, on: DSSurfaceContext(material: material))) }
    }
    let boxes = [DSDensity.compact, .regular, .comfortable].map { density in
        let tokens = DSTokenSet(DSTokenContext(density: density))
        return (density, DSGlyphSize.allCases.map { DSIconAppearance.box($0, tokens.size) })
    }
    _ = (tones, boxes)
}
#endif

/// Every registry glyph in the three boxes, at `control` and, in the `lg` box, at `display`: what `DSIconBoxTests`
/// measures, shown.
struct DSExampleRegistryGrid: View {
    private var ds = DSThemeValues()

    init() {}

    var body: some View {
        let space = ds.tokens.space
        Grid(horizontalSpacing: space.step3, verticalSpacing: space.step3) {
            ForEach(DSIconName.allCases, id: \.self) { name in
                GridRow {
                    ForEach(DSGlyphSize.allCases, id: \.self) { size in
                        DSIcon(name, size: size)
                    }
                    DSIcon(name, size: .lg, weight: .display)
                }
            }
        }
    }
}
#endif
