#if DEBUG
import SwiftUI
import DSCore
import DSTokens

/// `spec/components/Toggle.yaml` `examples`, in spec order.
///
/// **Written as data, because this harness never reads the spec**, as Chip's are: each example is one
/// `DSToggleExample` row — its props with the spec's defaults filled in, and where it is staged — and
/// `DSToggleBindingTests.everyExampleIsTheOneTheSpecWrites` holds every row to the spec's own entry, so a row cannot
/// draw another switch, or publish another name, than the web story generated from the same entry.
///
/// **The stage is the row frame, in all four harnesses** (the Apple and web galleries and showcases): the switch's row
/// takes the width it is given (behavior 9), so it is staged 2 × `size.card-min` wide (`DSExampleRowFrame`), which is
/// where `label-ru` wraps. A page example puts the frame straight on the page; `on-vivid` and `off-on-vivid` put it
/// inside a vivid Surface, and `on-glass-over-map` inside a glass Surface over the synthetic map, each with
/// `radius: card` and the default `padding: card`, which hugs it.
///
/// **Every example gets its handlers** (spec/SCHEMA.md, "Examples and snapshots"): `isOn` is a constant binding, whose
/// write is the no-op `onChange` every example is handed. The names are `DSToggleNameCase.all`
/// (`DSToggleBindingTests.swift`), the web's table in `web/apps/gallery/test/accessibility.browser.test.tsx`, and what
/// `DSToggleAccessibilityTreeTests` reads off the simulator. The strings are the spec's own invented ones (ADR-0015
/// rule 3).
enum DSToggleExamples {
    static let rows: [DSToggleExample] = [
        DSToggleExample("off", label: "Night shading", isOn: false),
        DSToggleExample("on", label: "Night shading", isOn: true),
        DSToggleExample("on-disabled", label: "Night shading", isOn: true, isDisabled: true),
        DSToggleExample("bare", label: "Night shading", isOn: false, labelVisibility: .hidden),
        DSToggleExample("on-vivid", label: "Live readings", isOn: true, surface: .vivid),
        DSToggleExample("off-on-vivid", label: "Live readings", isOn: false, surface: .vivid),
        DSToggleExample("on-glass-over-map", label: "Follow the vehicle", isOn: true, surface: .glass, backdrop: .map),
        DSToggleExample("label-ru", label: "Показывать ночное затенение маршрута следования", isOn: false),
    ]

    static var all: [DSExample] { rows.map(\.example) }
}

/// One `examples[]` entry of Toggle.yaml: the props, with the spec's defaults where the entry writes none, and the
/// Surface it is staged inside, if any.
struct DSToggleExample: Hashable {
    let id: String
    /// The spec's string, byte for byte.
    let label: String
    let isOn: Bool
    let labelVisibility: DSLabelVisibility
    let isDisabled: Bool
    /// The material of the Surface the example sits inside; nil for the page.
    let surface: DSSurfaceMaterial?
    /// The backdrop that Surface declares.
    let backdrop: DSBackdropKind

    init(
        _ id: String,
        label: String,
        isOn: Bool,
        labelVisibility: DSLabelVisibility = .visible,
        isDisabled: Bool = false,
        surface: DSSurfaceMaterial? = nil,
        backdrop: DSBackdropKind = .none
    ) {
        self.id = id
        self.label = label
        self.isOn = isOn
        self.labelVisibility = labelVisibility
        self.isDisabled = isDisabled
        self.surface = surface
        self.backdrop = backdrop
    }

    /// The context the switch reads where it is staged: the page, or the Surface's material over its backdrop.
    var context: DSSurfaceContext {
        surface.map { DSSurfaceContext(material: $0, backdrop: backdrop) } ?? .root
    }

    /// Only the glass example renders glass, so only it is also snapshotted under forced Reduce Transparency.
    var hasGlass: Bool { surface?.isGlass ?? false }

    var example: DSExample {
        DSExample("Toggle", id, hasGlass: hasGlass) { DSToggleExampleStage(row: self) }
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

/// One Toggle example on its stage.
struct DSToggleExampleStage: View {
    let row: DSToggleExample

    var body: some View {
        DSExampleStage(row.ground) {
            if let material = row.surface {
                DSSurfaceView(material: material, radius: .card, backdrop: row.backdrop) { DSToggleExampleSwitch(row: row) }
            } else {
                DSToggleExampleSwitch(row: row)
            }
        }
    }
}

/// An example's switch in the row frame, with the handler every example gets.
struct DSToggleExampleSwitch: View {
    let row: DSToggleExample

    var body: some View {
        DSExampleRowFrame {
            DSToggle(verbatim: row.label, isOn: .constant(row.isOn), labelVisibility: row.labelVisibility, isDisabled: row.isDisabled)
        }
    }
}

/// The frame a row is staged in, the same in all four harnesses: 2 × `size.card-min` wide, the widest the text frame of
/// the web harness gets, because a control's row takes the width it is given. The web's twins are
/// `.ds-gallery-row-frame` and `.ds-sc-row-frame`.
struct DSExampleRowFrame<Content: View>: View {
    let content: Content
    private var ds = DSThemeValues()

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content.frame(width: ds.tokens.size.cardMin * 2, alignment: .leading)
    }
}

#Preview("Toggle · off") { DSExamplePreview(example: DSExamples.named("Toggle/off")) }
#Preview("Toggle · on") { DSExamplePreview(example: DSExamples.named("Toggle/on")) }
#Preview("Toggle · on-disabled") { DSExamplePreview(example: DSExamples.named("Toggle/on-disabled")) }
#Preview("Toggle · bare") { DSExamplePreview(example: DSExamples.named("Toggle/bare")) }
#Preview("Toggle · on-vivid") { DSExamplePreview(example: DSExamples.named("Toggle/on-vivid")) }
#Preview("Toggle · off-on-vivid") { DSExamplePreview(example: DSExamples.named("Toggle/off-on-vivid")) }
#Preview("Toggle · on-glass-over-map") { DSExamplePreview(example: DSExamples.named("Toggle/on-glass-over-map")) }
#Preview("Toggle · label-ru") { DSExamplePreview(example: DSExamples.named("Toggle/label-ru")) }

#Preview("Toggle · on-glass-over-map under Reduce Transparency: the raised fallback and the default cells") {
    DSExamplePreview(example: DSExamples.named("Toggle/on-glass-over-map"))
        .dsAccessibilityPolicy(reduceTransparency: true)
}

#Preview("Toggle · on every material, off and on, flipping") {
    DSTheme {
        DSExampleStage {
            VStack(alignment: .leading, spacing: DSExampleSize.gap) {
                DSExampleToggleRow()
                DSSurfaceView(material: .raised, radius: .card) { DSExampleToggleRow() }
                DSSurfaceView(material: .vivid, radius: .card) { DSExampleToggleRow() }
                DSSurfaceView(material: .accent, radius: .card) { DSExampleToggleRow() }
                DSSurfaceView(material: .inverse, radius: .card) { DSExampleToggleRow() }
                DSSurfaceView(material: .glass, radius: .card, backdrop: .image) { DSExampleToggleRow() }
                    .dsBackdrop(.image) { DSExampleImage() }
            }
        }
    }
}

#Preview("Toggle · right to left") {
    DSTheme {
        DSExampleStage { DSExampleToggleRow() }
    }
    .environment(\.layoutDirection, .rightToLeft)
}

#Preview("Toggle · pointer modality, hover") {
    DSTheme {
        DSExampleStage { DSExampleToggleRow() }
    }
    .dsModality(.pointer)
}

/// Two switches that flip, one off and one on, and a bare one: what a switch shows on every material.
struct DSExampleToggleRow: View {
    @State private var isNightShading = false
    @State private var isFollowing = true
    @State private var isLive = false

    init() {}

    var body: some View {
        DSExampleRowFrame {
            VStack(alignment: .leading, spacing: DSExampleSize.gap) {
                DSToggle(verbatim: "Night shading", isOn: $isNightShading)
                DSToggle(verbatim: "Follow the vehicle", isOn: $isFollowing)
                DSToggle(verbatim: "Live readings", isOn: $isLive, labelVisibility: .hidden)
            }
        }
    }
}
#endif
