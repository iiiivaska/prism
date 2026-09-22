#if DEBUG
import SwiftUI
import DSCore
import DSTokens

/// `spec/components/Card.yaml` `examples`, in spec order, with the spec's own strings (invented, ADR-0015 rule 3). Every
/// card renders in a `size.card.min` square, the frame the web gallery gives it, and `vivid-pair` is the 2×2 of
/// `grid: ["1", "2", "2", "1"]`, row-major, at `space.4` gaps.
///
/// **Every example gets its handlers** (spec/SCHEMA.md, "Examples and snapshots"). An example's `props` carry values
/// only, never a callback, so both galleries pass a no-op handler for each prop of type `action` the spec declares —
/// here Card's `onAction` — whether or not the example names it. An example that keeps `action: open` is therefore a
/// pressable card with its glyph on Apple and on the web alike, and the same example id is the same thing on both
/// stacks. The handler-less forms, which Card.yaml makes a group with no glyph, are the probe below, not examples.
///
/// **And the action its entry declares.** `props.action` is typed out here by hand — `.custom(glyph:label:)` carries
/// `actionIcon` and `actionLabel` with it — while the web story hands the spec's three props to a harness that
/// assembles the same value (`cardArgs`, `web/apps/gallery/src/harness/examples.tsx`). Nothing pairs the two but
/// `DSExampleHandlerTests.everyCardExampleRendersTheActionItsSpecDeclares`: the id check below it compares ids only,
/// so an example left at the default `.open` would otherwise draw a different card from the web's under one id. No
/// example declares an `action` today; one that does needs its case written here.
enum DSCardExamples {
    static let all: [DSExample] = [
        DSExample("Card", "solid-metric") {
            DSExampleStage {
                DSExampleCardFrame {
                    DSCard(
                        "Line output", caption: "Last 24 hours", variant: .solid,
                        hero: DSCardHero("86", trailing: ".4", unit: "%"), onAction: {}
                    )
                }
            }
        },
        DSExample("Card", "vivid-default-kpi") {
            DSExampleStage {
                DSExampleCardFrame {
                    DSCard(
                        "Average yield", caption: "Dollars per batch", variant: .vivid,
                        hero: DSCardHero("$2,450"), onAction: {}
                    )
                }
            }
        },
        DSExample("Card", "vivid-pair") {
            DSExampleStage { DSExampleVividCardGrid() }
        },
        DSExample("Card", "glass-vehicle", hasGlass: true) {
            DSExampleStage(.image) {
                DSExampleCardFrame {
                    DSCard(
                        "Unit 4417", caption: "21.11.2026, 14:05:22", variant: .glass, backdrop: .image,
                        onAction: {}
                    )
                }
            }
        },
        DSExample("Card", "glass-selected", hasGlass: true) {
            DSExampleStage(.image) {
                DSExampleCardFrame {
                    DSCard("Unit 4417", variant: .glass, backdrop: .image, isSelected: true, onAction: {})
                }
            }
        },
        DSExample("Card", "tinted-focus", schemes: [.light]) {
            DSExampleStage {
                DSExampleCardFrame {
                    DSCard("Sensor", caption: "Active", variant: .tinted, icon: .objectGps, onAction: {})
                }
            }
        },
        DSExample("Card", "compact") {
            DSExampleStage {
                DSExampleCardFrame {
                    DSCard("Queued", variant: .solid, hero: DSCardHero("37"), size: .compact, onAction: {})
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
            DSCard("Average yield", variant: .vivid, vivid: slot, size: .compact, onAction: {})
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

/// Card's action affordances, staged by hand because no spec example stages them: the Apple mirror of
/// `web/apps/gallery/src/probes/CardAction.stories.tsx`, story for story.
///
///  - Card.yaml has no `custom` example, so the solid disc of behavior 5 — its own registry glyph, its own name, and
///    only the disc pressable — and the `tokens.action.fill` / `glyphColor` cells it draws render in no example on
///    either stack.
///  - Every example carries a no-op handler for every `action` prop (spec/SCHEMA.md), so the forms a *missing*
///    handler produces render in no example either: an `open` card that is a group with no glyph and no reserved room
///    (behavior 4), and a `custom` disc that is a named disc pressing nothing (behavior 5).
///
/// These are probes, not examples. They are not in `DSExamples`, so the snapshot matrix never renders them and the
/// gallery never screenshots them — the same reason the web probe lives outside `src/stories` and carries no `vrt`
/// tag. `DSCardBindingTests` pins the rules they show; whether a disc's name is the right one — the operation, not
/// the card's title — is a picture for a human.
enum DSCardActionProbe {
    static let hero = DSCardHero("86", trailing: ".4", unit: "%")

    /// `custom-action`: each disc with its own glyph and its own name, and only that disc pressable.
    @MainActor static var customAction: some View {
        DSCardActionProbePair(
            left: DSCard(
                "Line 4", caption: "Running", action: .custom(glyph: .actionPause, label: "Pause line 4"),
                hero: hero, onAction: {}
            ),
            right: DSCard(
                "Batch 91", caption: "Queued", action: .custom(glyph: .actionDelete, label: "Discard batch 91"),
                hero: hero, onAction: {}
            )
        )
    }

    /// `without-handler`: the same two cards with nothing to press — a labelled disc, and an `open` card that is a
    /// group drawing no glyph at all.
    @MainActor static var withoutHandler: some View {
        DSCardActionProbePair(
            left: DSCard(
                "Line 4", caption: "Running", action: .custom(glyph: .actionPause, label: "Pause line 4"), hero: hero
            ),
            right: DSCard("Batch 91", caption: "Queued", hero: hero)
        )
    }

    /// `open-card`: `action: open` with a handler — the whole card is the button, named by title, caption and hero —
    /// beside `action: none`.
    @MainActor static var openCard: some View {
        DSCardActionProbePair(
            left: DSCard("Line output", caption: "Last 24 hours", hero: hero, onAction: {}),
            right: DSCard("Unit 4417", caption: "21.11.2026, 14:05:22", action: .none)
        )
    }
}

/// Two probe cards side by side, each in the example frame.
struct DSCardActionProbePair<Left: View, Right: View>: View {
    let left: Left
    let right: Right

    var body: some View {
        DSExampleStage {
            HStack(alignment: .top, spacing: DSExampleSize.gap) {
                DSExampleCardFrame { left }
                DSExampleCardFrame { right }
            }
        }
    }
}

#Preview("Card · probe: custom-action") { DSTheme { DSCardActionProbe.customAction } }
#Preview("Card · probe: without-handler") { DSTheme { DSCardActionProbe.withoutHandler } }
#Preview("Card · probe: without-handler under pointer") {
    DSTheme { DSCardActionProbe.withoutHandler }.dsModality(.pointer)
}
#Preview("Card · probe: open-card") { DSTheme { DSCardActionProbe.openCard } }

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
