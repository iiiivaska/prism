#if DEBUG
import SwiftUI
import DSCore
import DSTokens

/// `spec/components/Card.yaml` `examples`, in spec order, with the spec's own strings (invented, ADR-0015 rule 3). Every
/// card renders in a `size.card.min` square, the frame the web gallery gives it, and `vivid-pair` is the 2×2 of
/// `grid: ["1", "2", "2", "1"]`, row-major, at `space.4` gaps.
enum DSCardExamples {
    static let all: [DSExample] = [
        DSExample("Card", "solid-metric") {
            DSExampleStage {
                DSExampleCardFrame {
                    DSCard("Line output", caption: "Last 24 hours", variant: .solid, hero: DSCardHero("86", trailing: ".4", unit: "%"))
                }
            }
        },
        DSExample("Card", "vivid-default-kpi") {
            DSExampleStage {
                DSExampleCardFrame {
                    DSCard("Average yield", caption: "Dollars per batch", variant: .vivid, hero: DSCardHero("$2,450"))
                }
            }
        },
        DSExample("Card", "vivid-pair") {
            DSExampleStage { DSExampleVividCardGrid() }
        },
        DSExample("Card", "glass-vehicle", hasGlass: true) {
            DSExampleStage(.image) {
                DSExampleCardFrame {
                    DSCard("Unit 4417", caption: "21.11.2026, 14:05:22", variant: .glass, backdrop: .image)
                }
            }
        },
        DSExample("Card", "glass-selected", hasGlass: true) {
            DSExampleStage(.image) {
                DSExampleCardFrame {
                    DSCard("Unit 4417", variant: .glass, backdrop: .image, isSelected: true)
                }
            }
        },
        DSExample("Card", "tinted-focus", schemes: [.light]) {
            DSExampleStage {
                DSExampleCardFrame {
                    DSCard("Sensor", caption: "Active", variant: .tinted, icon: .objectGps)
                }
            }
        },
        DSExample("Card", "compact") {
            DSExampleStage {
                DSExampleCardFrame {
                    DSCard("Queued", variant: .solid, hero: DSCardHero("37"), size: .compact)
                }
            }
        },
    ]
}

/// A card at the example size: a `size.card.min` square.
struct DSExampleCardFrame<Content: View>: View {
    let content: Content
    private var ds = DSThemeValues()

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        let side = ds.tokens.size.cardMin
        content.frame(width: side, height: side)
    }
}

/// `vivid-pair`: four compact vivid cards titled "Average yield", slots 1 and 2 on the diagonals.
struct DSExampleVividCardGrid: View {
    private var ds = DSThemeValues()

    init() {}

    var body: some View {
        let gap = ds.tokens.space.step4
        Grid(horizontalSpacing: gap, verticalSpacing: gap) {
            GridRow {
                cell(.slot1)
                cell(.slot2)
            }
            GridRow {
                cell(.slot2)
                cell(.slot1)
            }
        }
    }

    private func cell(_ slot: DSVividSlot) -> some View {
        DSExampleCardFrame {
            DSCard("Average yield", variant: .vivid, vivid: slot, size: .compact)
        }
    }
}

#Preview("Card · solid-metric") { DSExamplePreview(example: DSExamples.named("Card/solid-metric")) }
#Preview("Card · vivid-default-kpi") { DSExamplePreview(example: DSExamples.named("Card/vivid-default-kpi")) }
#Preview("Card · vivid-pair") { DSExamplePreview(example: DSExamples.named("Card/vivid-pair")) }
#Preview("Card · glass-vehicle") { DSExamplePreview(example: DSExamples.named("Card/glass-vehicle")) }
#Preview("Card · glass-selected") { DSExamplePreview(example: DSExamples.named("Card/glass-selected")) }
#Preview("Card · tinted-focus") { DSExamplePreview(example: DSExamples.named("Card/tinted-focus")) }
#Preview("Card · compact") { DSExamplePreview(example: DSExamples.named("Card/compact")) }

#Preview("Card · glass examples under Reduce Transparency") {
    VStack(spacing: 0) {
        ForEach(DSCardExamples.all.filter(\.hasGlass)) { example in
            DSExamplePreview(example: example)
        }
    }
    .dsAccessibilityPolicy(reduceTransparency: true)
}

#Preview("Card · glass-selected under Increase Contrast renders inverse") {
    DSExamplePreview(example: DSExamples.named("Card/glass-selected"))
        .dsAccessibilityPolicy(increasedContrast: true)
}

#Preview("Card · the vivid anatomy: unit in the caption, no ring, an aside") {
    DSTheme {
        DSExampleStage {
            HStack(spacing: DSExampleSize.gap) {
                DSExampleCardFrame {
                    DSCard(
                        "Average yield", caption: "Dollars per batch", variant: .vivid, vivid: .slot1, icon: .objectGps,
                        hero: DSCardHero("2,450", trailing: ".5", unit: "kg"), onAction: {},
                        aside: { DSExampleSpark() }
                    )
                }
                DSExampleCardFrame {
                    DSCard(
                        "Average yield", caption: "Dollars per batch", variant: .solid, icon: .objectGps,
                        hero: DSCardHero("2,450", trailing: ".5", unit: "kg"), onAction: {},
                        aside: { DSExampleSpark() }
                    )
                }
            }
        }
    }
}

#Preview("Card · a custom action on glass over the map, and a pressable card") {
    DSTheme {
        DSExampleStage(.map) {
            VStack(spacing: DSExampleSize.gap) {
                DSCard(
                    "Morning route", caption: "Depot to the north gate", variant: .glass,
                    action: .custom(glyph: .actionPause, label: "Pause the route"), hero: DSCardHero("27", trailing: ".4", unit: "km/h"),
                    backdrop: .map, onAction: {}
                )
                DSCard("Throughput", caption: "Average per shift", hero: DSCardHero("84", unit: "units"), onAction: {}) {
                    DSText("Updated two minutes ago", role: .caption, tone: .tertiary)
                }
            }
            .frame(width: DSExampleSize.card * 2)
        }
    }
}

#Preview("Card · selection, Reduce Motion") {
    DSTheme {
        DSExampleStage { DSExampleSelectableCards() }
    }
    .dsAccessibilityPolicy(reduceMotion: true)
}

#Preview("Card · pointer modality: the open glyph on hover") {
    DSTheme {
        DSExampleStage { DSExampleSelectableCards() }
    }
    .dsModality(.pointer)
}

#if canImport(Playgrounds)
import Playgrounds

#Playground("Card · title, caption and action cells per published context") {
    let contexts = [
        DSSurfaceContext(material: .solid),
        DSSurfaceContext(material: .vivid),
        DSSurfaceContext(material: .glass, backdrop: .map),
        DSSurfaceContext(material: .glass, backdrop: .image),
        DSSurfaceContext(material: .raised, backdrop: .image),
        DSSurfaceContext(material: .inverse, backdrop: .image),
    ]
    let cells = contexts.map { context in
        (
            context,
            DSCardAppearance.title(on: context),
            DSCardAppearance.caption(on: context),
            DSCardAppearance.action(on: context),
            DSCardAppearance.selectedBorder(on: context.material)
        )
    }
    _ = cells
}
#endif

/// A decorative sparkline stand-in for the aside previews: a hairline polyline in the surface's primary tone.
struct DSExampleSpark: View {
    private var ds = DSThemeValues()

    init() {}

    var body: some View {
        let tokens = ds.tokens
        Canvas { context, size in
            var path = Path()
            let steps = DSExampleSpark.values
            for (index, value) in steps.enumerated() {
                let point = CGPoint(
                    x: size.width * CGFloat(index) / CGFloat(steps.count - 1),
                    y: size.height * (1 - value)
                )
                if index == 0 { path.move(to: point) } else { path.addLine(to: point) }
            }
            context.stroke(path, with: .color(tokens[keyPath: DSGlyphTone.primary.color(on: ds.surface)]), lineWidth: tokens.chart.sparklineWidth)
        }
        .frame(width: tokens.space.step12, height: tokens.space.step8)
        .accessibilityHidden(true)
    }

    static let values: [CGFloat] = [0.3, 0.55, 0.4, 0.7, 0.5, 0.9, 0.75]
}

/// Two cards whose selection toggles on press.
struct DSExampleSelectableCards: View {
    @State private var selected = 0

    init() {}

    var body: some View {
        HStack(spacing: DSExampleSize.gap) {
            ForEach(0..<2, id: \.self) { index in
                DSExampleCardFrame {
                    DSCard("Line \(index + 1)", caption: "Last 24 hours", hero: DSCardHero("86", trailing: ".4", unit: "%"), isSelected: selected == index, onAction: {
                        selected = index
                    })
                }
            }
        }
    }
}
#endif
