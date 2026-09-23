#if DEBUG
import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// `spec/components/IconButton.yaml` `examples`, in spec order.
///
/// **Written as data, because this harness never reads the spec**, as Badge's, Icon's and Divider's are: each example
/// is one `DSIconButtonExample` row — its props with the spec's defaults filled in, the badge its `badge` slot holds,
/// and the surface and backdrop it declares — and `DSIconButtonBindingTests.everyExampleIsTheOneTheSpecWrites` holds
/// every row to the spec's own entry, nested `badge` included, so a row cannot draw another button, or publish another
/// name, than the web story generated from the same entry.
///
/// **The stage is Badge's, in all four harnesses** (the Apple and web galleries and showcases): there is no card-sized
/// frame, because a 40 pt circle in a card-sized frame is a picture of the frame. A page example puts the button
/// straight on the page; `on-vivid` puts it inside a vivid Surface with `radius: card` and the default `padding: card`,
/// which hugs it; `on-glass-over-map` inside a glass Surface over the map, which is also the ground.
///
/// Every example is one button named by its `label`; `with-badge` adds the badge's contribution as the button's value.
/// The names are `DSIconButtonNameCase.all` (`DSIconButtonBindingTests.swift`), the web's table in
/// `web/apps/gallery/test/accessibility.browser.test.tsx`, and what `DSIconButtonAccessibilityTreeTests` reads off the
/// simulator. The labels are the spec's own invented phrases (ADR-0015 rule 3). IconButton declares one action prop,
/// `onPress`, so every example is given a no-op `action` (spec/SCHEMA.md, "Examples and snapshots"); the parameter is
/// required, so an example cannot be written without one.
enum DSIconButtonExamples {
    static let rows: [DSIconButtonExample] = [
        DSIconButtonExample("secondary-md", variant: .secondary, glyph: .actionSettings, label: "Open settings"),
        DSIconButtonExample("primary-md", variant: .primary, glyph: .actionAdd, label: "Add a site"),
        DSIconButtonExample("ghost-md", variant: .ghost, glyph: .actionFilter, label: "Filter results"),
        DSIconButtonExample("plain-sm", variant: .plain, size: .sm, glyph: .navOpen, label: "Open details"),
        DSIconButtonExample("danger-md", variant: .danger, glyph: .actionDelete, label: "Delete route"),
        DSIconButtonExample("selected-in-group", variant: .ghost, glyph: .objectMap, label: "Map view", isSelected: true),
        DSIconButtonExample("lg-touch", variant: .primary, size: .lg, glyph: .actionPlay, label: "Start the run"),
        DSIconButtonExample("disabled", variant: .secondary, glyph: .actionRefresh, label: "Refresh readings", isDisabled: true),
        DSIconButtonExample("on-vivid", variant: .ghost, glyph: .navOpen, label: "Open the yield card", surface: .vivid),
        DSIconButtonExample(
            "on-glass-over-map", variant: .primary, glyph: .actionLocate, label: "Center on the vehicle",
            surface: .glass, backdrop: .map
        ),
        DSIconButtonExample("label-ru", variant: .secondary, glyph: .actionRefresh, label: "Обновить показания линии"),
        DSIconButtonExample(
            "with-badge", variant: .secondary, glyph: .objectNotification, label: "Open notifications",
            badge: DSIconButtonExampleBadge(variant: .count, tone: .neutral, count: 3, label: "unread")
        ),
    ]

    static var all: [DSExample] { rows.map(\.example) }
}

/// The Badge an example's `badge` slot holds: Badge.yaml's six props, with Badge's defaults where the entry writes none.
struct DSIconButtonExampleBadge: Hashable {
    let variant: DSBadgeVariant
    let tone: DSBadgeTone
    let emphasis: DSBadgeEmphasis
    let count: Int?
    let max: Int
    /// The spec's string, byte for byte; the badge takes it as a localized key, as every caller-written label is.
    let label: String?

    init(
        variant: DSBadgeVariant = .count,
        tone: DSBadgeTone = .neutral,
        emphasis: DSBadgeEmphasis = .filled,
        count: Int? = nil,
        max: Int = 99,
        label: String? = nil
    ) {
        self.variant = variant
        self.tone = tone
        self.emphasis = emphasis
        self.count = count
        self.max = max
        self.label = label
    }

    var badge: DSBadge {
        DSBadge(
            count: count, variant: variant, tone: tone, emphasis: emphasis, max: max,
            label: label.map { LocalizedStringKey($0) }
        )
    }
}

/// One `examples[]` entry of IconButton.yaml: the props, with the spec's defaults where the entry writes none, and the
/// Surface the button sits inside.
struct DSIconButtonExample: Hashable {
    let id: String
    let variant: DSIconButtonVariant
    let size: DSIconButtonSize
    let glyph: DSIconName
    /// The spec's string, byte for byte; the view takes it as a localized key, as every caller-written label is.
    let label: String
    let badge: DSIconButtonExampleBadge?
    let isSelected: Bool
    let isDisabled: Bool
    /// The material of the Surface the button sits inside (the example's `surface`); nil stages it on the page.
    let surface: DSSurfaceMaterial?
    /// What that Surface declares it sits on (the example's `backdrop`), which is also the ground of a glass example.
    let backdrop: DSBackdropKind

    init(
        _ id: String,
        variant: DSIconButtonVariant = .secondary,
        size: DSIconButtonSize = .md,
        glyph: DSIconName,
        label: String,
        badge: DSIconButtonExampleBadge? = nil,
        isSelected: Bool = false,
        isDisabled: Bool = false,
        surface: DSSurfaceMaterial? = nil,
        backdrop: DSBackdropKind = .none
    ) {
        self.id = id
        self.variant = variant
        self.size = size
        self.glyph = glyph
        self.label = label
        self.badge = badge
        self.isSelected = isSelected
        self.isDisabled = isDisabled
        self.surface = surface
        self.backdrop = backdrop
    }

    /// Only `on-glass-over-map` renders glass, so only it is also snapshotted under forced Reduce Transparency.
    var example: DSExample {
        DSExample("IconButton", id, hasGlass: surface?.isGlass ?? false) { DSIconButtonExampleStage(row: self) }
    }

    /// The button itself, with the example's props and a no-op handler for `onPress`.
    var button: DSIconButton {
        DSIconButton(
            LocalizedStringKey(label), glyph: glyph, variant: variant, size: size, badge: badge?.badge,
            isSelected: isSelected, isDisabled: isDisabled
        ) {}
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

/// One IconButton example on its stage.
struct DSIconButtonExampleStage: View {
    let row: DSIconButtonExample

    var body: some View {
        DSExampleStage(row.ground) {
            if let material = row.surface {
                DSSurfaceView(material: material, radius: .card, backdrop: row.backdrop) { row.button }
            } else {
                row.button
            }
        }
    }
}

#Preview("IconButton · secondary-md") { DSExamplePreview(example: DSExamples.named("IconButton/secondary-md")) }
#Preview("IconButton · primary-md") { DSExamplePreview(example: DSExamples.named("IconButton/primary-md")) }
#Preview("IconButton · ghost-md") { DSExamplePreview(example: DSExamples.named("IconButton/ghost-md")) }
#Preview("IconButton · plain-sm") { DSExamplePreview(example: DSExamples.named("IconButton/plain-sm")) }
#Preview("IconButton · danger-md") { DSExamplePreview(example: DSExamples.named("IconButton/danger-md")) }
#Preview("IconButton · selected-in-group") { DSExamplePreview(example: DSExamples.named("IconButton/selected-in-group")) }
#Preview("IconButton · lg-touch") { DSExamplePreview(example: DSExamples.named("IconButton/lg-touch")) }
#Preview("IconButton · disabled") { DSExamplePreview(example: DSExamples.named("IconButton/disabled")) }
#Preview("IconButton · on-vivid") { DSExamplePreview(example: DSExamples.named("IconButton/on-vivid")) }
#Preview("IconButton · on-glass-over-map") { DSExamplePreview(example: DSExamples.named("IconButton/on-glass-over-map")) }
#Preview("IconButton · label-ru") { DSExamplePreview(example: DSExamples.named("IconButton/label-ru")) }
#Preview("IconButton · with-badge") { DSExamplePreview(example: DSExamples.named("IconButton/with-badge")) }

#Preview("IconButton · on-glass-over-map under Reduce Transparency: the raised fallback, the default cells") {
    DSExamplePreview(example: DSExamples.named("IconButton/on-glass-over-map"))
        .dsAccessibilityPolicy(reduceTransparency: true)
}

#Preview("IconButton · every variant on every material") {
    DSTheme {
        DSExampleStage {
            VStack(alignment: .leading, spacing: DSExampleSize.gap) {
                DSExampleIconButtonRow()
                DSSurfaceView(material: .vivid, radius: .card) { DSExampleIconButtonRow() }
                DSSurfaceView(material: .glass, radius: .card, backdrop: .image) { DSExampleIconButtonRow() }
                    .dsBackdrop { DSExampleImage() }
                DSSurfaceView(material: .raised, radius: .card) { DSExampleIconButtonRow() }
            }
        }
    }
}

#Preview("IconButton · a view switcher: one selected circle among rings") {
    DSTheme {
        DSExampleStage { DSExampleIconButtonSwitcher() }
    }
}

#Preview("IconButton · sizes in every density") {
    DSTheme {
        DSExampleStage {
            VStack(alignment: .leading, spacing: DSExampleSize.gap) {
                ForEach([DSDensity.compact, .regular, .comfortable], id: \.self) { density in
                    HStack(spacing: DSExampleSize.gap) {
                        ForEach(DSIconButtonSize.allCases, id: \.self) { size in
                            DSIconButton(verbatim: size.rawValue, glyph: .actionAdd, size: size) {}
                        }
                    }
                    .dsDensity(density)
                }
            }
        }
    }
}

#Preview("IconButton · Reduce Motion, press to see the fill and overlay") {
    DSTheme {
        DSExampleStage { DSExampleIconButtonRow() }
    }
    .dsAccessibilityPolicy(reduceMotion: true)
}

#Preview("IconButton · pointer modality, hover") {
    DSTheme {
        DSExampleStage { DSExampleIconButtonRow() }
    }
    .dsModality(.pointer)
}

/// One button of each variant, the group a preview presses through.
struct DSExampleIconButtonRow: View {
    init() {}

    var body: some View {
        HStack(spacing: DSExampleSize.gap) {
            DSIconButton("Add a site", glyph: .actionAdd, variant: .primary) {}
            DSIconButton("Open settings", glyph: .actionSettings) {}
            DSIconButton("Filter results", glyph: .actionFilter, variant: .ghost) {}
            DSIconButton("Open details", glyph: .navOpen, variant: .plain) {}
            DSIconButton("Delete route", glyph: .actionDelete, variant: .danger) {}
            DSIconButton(
                "Open notifications", glyph: .objectNotification, badge: DSBadge(count: 3, label: "unread")
            ) {}
        }
    }
}

/// A view switcher: three ghost rings, one of them selected, which a tap moves.
private struct DSExampleIconButtonSwitcher: View {
    @State private var selected: DSIconName = .objectMap

    // Written out for the reason `DSIconButton.init` is: the private state makes the synthesized initializer private.
    init() {}

    var body: some View {
        HStack(spacing: DSExampleSize.gap) {
            DSIconButton("Map view", glyph: .objectMap, variant: .ghost, isSelected: selected == .objectMap) {
                selected = .objectMap
            }
            DSIconButton("Chart view", glyph: .objectChart, variant: .ghost, isSelected: selected == .objectChart) {
                selected = .objectChart
            }
            DSIconButton("Settings view", glyph: .actionSettings, variant: .ghost, isSelected: selected == .actionSettings) {
                selected = .actionSettings
            }
        }
    }
}
#endif
