#if DEBUG
import SwiftUI
import DSCore
import DSTokens

/// `spec/components/Badge.yaml` `examples`, in spec order.
///
/// **Written as data, because this harness never reads the spec**, as Icon's and Divider's are: each example is one
/// `DSBadgeExample` row — its props with the spec's defaults filled in, and the surface and backdrop it declares — and
/// `DSBadgeBindingTests.everyExampleIsTheOneTheSpecWrites` holds every row to the spec's own entry, so a row cannot draw
/// another badge, or publish another name, than the web story generated from the same entry.
///
/// **The stage is Icon's, in all four harnesses** (the Apple and web galleries and showcases): there is no card-sized
/// frame, and a page example puts the badge straight on the page. `on-vivid` puts it inside a vivid Surface with
/// `radius: card` and the default `padding: card`, which hugs the badge; `on-glass-over-map` inside a glass Surface over
/// the map, which is also the ground. Only the filled emphasis is staged over media (behavior 12): `on-vivid` writes
/// `emphasis: filled`, and `on-glass-over-map` takes the default.
///
/// Every example carries a `label` and stands alone, so every one is exposed, named by what it contributes; the ten
/// names are `DSBadgeNameCase.all` (`DSBadgeBindingTests.swift`), the web's table in
/// `web/apps/gallery/test/accessibility.browser.test.tsx`, and what `DSBadgeAccessibilityTreeTests` reads off the
/// simulator. The labels are the spec's own invented phrases (ADR-0015 rule 3). Badge declares no action prop, so no
/// example carries a handler (spec/SCHEMA.md, "Examples and snapshots").
enum DSBadgeExamples {
    static let rows: [DSBadgeExample] = [
        DSBadgeExample("count-neutral", count: 3, label: "unread alerts"),
        DSBadgeExample("count-critical", tone: .critical, count: 12, label: "open incidents"),
        DSBadgeExample("count-accent", tone: .accent, count: 7, label: "items needing attention"),
        DSBadgeExample("count-overflow", tone: .critical, count: 128, max: 99, label: "open incidents"),
        DSBadgeExample("outline-neutral", emphasis: .outline, count: 4, label: "queued runs"),
        DSBadgeExample("outline-critical", tone: .critical, emphasis: .outline, count: 2, label: "open incidents"),
        DSBadgeExample("dot-critical", variant: .dot, tone: .critical, label: "unread"),
        DSBadgeExample("dot-accent", variant: .dot, tone: .accent, label: "new"),
        DSBadgeExample("on-vivid", emphasis: .filled, count: 3, label: "unread alerts", surface: .vivid),
        DSBadgeExample("on-glass-over-map", tone: .critical, count: 2, label: "open incidents", surface: .glass, backdrop: .map),
    ]

    static var all: [DSExample] { rows.map(\.example) }
}

/// One `examples[]` entry of Badge.yaml: the props, with the spec's defaults where the entry writes none, and the
/// Surface the badge sits inside.
struct DSBadgeExample: Hashable {
    let id: String
    let variant: DSBadgeVariant
    let tone: DSBadgeTone
    let emphasis: DSBadgeEmphasis
    let count: Int?
    let max: Int
    /// The spec's string, byte for byte; the view takes it as a localized key, as every caller-written label is.
    let label: String?
    /// The material of the Surface the badge sits inside (the example's `surface`); nil stages it on the page.
    let surface: DSSurfaceMaterial?
    /// What that Surface declares it sits on (the example's `backdrop`), which is also the ground of a glass example.
    let backdrop: DSBackdropKind

    init(
        _ id: String,
        variant: DSBadgeVariant = .count,
        tone: DSBadgeTone = .neutral,
        emphasis: DSBadgeEmphasis = .filled,
        count: Int? = nil,
        max: Int = 99,
        label: String? = nil,
        surface: DSSurfaceMaterial? = nil,
        backdrop: DSBackdropKind = .none
    ) {
        self.id = id
        self.variant = variant
        self.tone = tone
        self.emphasis = emphasis
        self.count = count
        self.max = max
        self.label = label
        self.surface = surface
        self.backdrop = backdrop
    }

    /// Only `on-glass-over-map` renders glass, so only it is also snapshotted under forced Reduce Transparency.
    var example: DSExample {
        DSExample("Badge", id, hasGlass: surface?.isGlass ?? false) { DSBadgeExampleStage(row: self) }
    }

    /// The badge itself, with the example's props.
    var badge: DSBadge {
        DSBadge(
            count: count, variant: variant, tone: tone, emphasis: emphasis, max: max,
            label: label.map { LocalizedStringKey($0) }
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

/// One Badge example on its stage.
struct DSBadgeExampleStage: View {
    let row: DSBadgeExample

    var body: some View {
        DSExampleStage(row.ground) {
            if let material = row.surface {
                DSSurfaceView(material: material, radius: .card, backdrop: row.backdrop) { row.badge }
            } else {
                row.badge
            }
        }
    }
}

#Preview("Badge · count-neutral") { DSExamplePreview(example: DSExamples.named("Badge/count-neutral")) }
#Preview("Badge · count-critical") { DSExamplePreview(example: DSExamples.named("Badge/count-critical")) }
#Preview("Badge · count-accent") { DSExamplePreview(example: DSExamples.named("Badge/count-accent")) }
#Preview("Badge · count-overflow") { DSExamplePreview(example: DSExamples.named("Badge/count-overflow")) }
#Preview("Badge · outline-neutral") { DSExamplePreview(example: DSExamples.named("Badge/outline-neutral")) }
#Preview("Badge · outline-critical") { DSExamplePreview(example: DSExamples.named("Badge/outline-critical")) }
#Preview("Badge · dot-critical") { DSExamplePreview(example: DSExamples.named("Badge/dot-critical")) }
#Preview("Badge · dot-accent") { DSExamplePreview(example: DSExamples.named("Badge/dot-accent")) }
#Preview("Badge · on-vivid") { DSExamplePreview(example: DSExamples.named("Badge/on-vivid")) }
#Preview("Badge · on-glass-over-map") { DSExamplePreview(example: DSExamples.named("Badge/on-glass-over-map")) }

#Preview("Badge · on-glass-over-map under Reduce Transparency: the raised fallback, the badge unchanged") {
    DSExamplePreview(example: DSExamples.named("Badge/on-glass-over-map"))
        .dsAccessibilityPolicy(reduceTransparency: true)
}

#Preview("Badge · a changed count is replaced, never rolled") {
    DSTheme {
        DSExampleStage {
            DSBadgeCountChangePreview()
        }
    }
}

/// Steps a count badge through one digit, two digits and an overflowing count, once a second, so the replace — and,
/// under Reduce Motion, the instant swap — can be watched in the canvas.
private struct DSBadgeCountChangePreview: View {
    private let counts = [8, 9, 10, 99, 100]

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let step = Int(context.date.timeIntervalSinceReferenceDate) % counts.count
            DSBadge(count: counts[step], tone: .critical, label: "open incidents")
        }
    }
}
#endif
