#if DEBUG
import SwiftUI
import DSCore
import DSTokens

/// `spec/components/Text.yaml` `examples`, in spec order. The strings are invented (ADR-0015 rule 3); the hero is
/// the spec's own "86.4 %".
enum DSTextExamples {
    static let all: [DSExample] = [
        DSExample("Text", "hero-metric") {
            DSExampleStage { DSText("86", role: .metricXl, tone: .primary, trailing: ".4", unit: "%") }
        },
        DSExample("Text", "title-two-tone") {
            DSExampleStage {
                VStack(alignment: .leading, spacing: 0) {
                    DSText("Weekly summary", role: .titleLg, tone: .primary)
                    DSText("Twelve sessions logged", role: .titleLg, tone: .secondary)
                }
            }
        },
        DSExample("Text", "caption") {
            DSExampleStage { DSText("Updated two minutes ago", role: .caption, tone: .secondary) }
        },
        DSExample("Text", "on-vivid") {
            DSExampleStage {
                DSSurfaceView(material: .vivid, radius: .card) {
                    DSText("Average yield", role: .headline, tone: .primary)
                }
            }
        },
        DSExample("Text", "on-glass-over-map", hasGlass: true) {
            DSExampleStage(.map) {
                DSSurfaceView(material: .glass, radius: .card, backdrop: .map) {
                    DSText("Next stop in four minutes", role: .caption, tone: .secondary)
                }
            }
        },
        DSExample("Text", "data-tabular") {
            DSExampleStage { DSText("12:04:36", role: .data, numeric: .tabular) }
        },
    ]
}

#Preview("Text · hero-metric") { DSExamplePreview(example: DSExamples.named("Text/hero-metric")) }
#Preview("Text · title-two-tone") { DSExamplePreview(example: DSExamples.named("Text/title-two-tone")) }
#Preview("Text · caption") { DSExamplePreview(example: DSExamples.named("Text/caption")) }
#Preview("Text · on-vivid") { DSExamplePreview(example: DSExamples.named("Text/on-vivid")) }
#Preview("Text · on-glass-over-map") { DSExamplePreview(example: DSExamples.named("Text/on-glass-over-map")) }
#Preview("Text · data-tabular") { DSExamplePreview(example: DSExamples.named("Text/data-tabular")) }

#Preview("Text · every example under Bold Text") {
    VStack(spacing: 0) {
        ForEach(DSTextExamples.all) { example in
            DSExamplePreview(example: example)
        }
    }
    .dsAccessibilityPolicy(boldText: true)
}

#Preview("Text · hero-metric at accessibility5 clamps to accessibility3") {
    DSExamplePreview(example: DSExamples.named("Text/hero-metric"))
        .environment(\.dynamicTypeSize, .accessibility5)
}

#Preview("Text · every role and tone on the page") {
    DSTheme {
        DSExampleStage {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(DSTextRole.allCases, id: \.self) { role in
                    DSText(verbatim: role.rawValue, role: role)
                }
                ForEach(DSTextTone.allCases, id: \.self) { tone in
                    DSText(verbatim: tone.rawValue, role: .metricLg, tone: tone)
                }
            }
        }
    }
}

#Preview("Text · truncation") {
    DSTheme {
        DSExampleStage {
            VStack(alignment: .leading, spacing: 0) {
                DSText(DSExampleProse.paragraph, role: .bodyMd, truncation: .fade, maxLines: 3)
                DSText(DSExampleProse.paragraph, role: .bodyMd, truncation: .ellipsis, maxLines: 2)
                DSText(DSExampleProse.identifier, role: .data, truncation: .ellipsis)
                DSText(DSExampleProse.paragraph, role: .bodyMd, truncation: .fade, maxLines: 1)
            }
            .frame(width: DSExampleSize.card)
        }
    }
}

#Preview("Text · count-up") {
    DSTheme {
        DSExampleStage { DSExampleCounter() }
    }
}

#if canImport(Playgrounds)
import Playgrounds

#Playground("Text · a hero's trailing group and unit on each surface") {
    let surfaces = [
        DSSurfaceContext.root,
        DSSurfaceContext(material: .vivid),
        DSSurfaceContext(material: .accent),
        DSSurfaceContext(material: .glass, backdrop: .map),
        DSSurfaceContext(material: .glass, backdrop: .image),
    ]
    let hero = surfaces.map { surface in
        (
            surface,
            DSTextAppearance.root(.primary, role: .metricXl, size: 48, surface: surface),
            DSTextAppearance.trailing(role: .metricXl, size: 48, surface: surface),
            DSTextAppearance.unit(surface: surface)
        )
    }
    let rolls = [("1,280", "1,287"), ("86.5", "86.4"), ("9.9", "10.0")].map { old, new in
        (old, new, DSTextAppearance.countsUp(from: old, to: new))
    }
    _ = (hero, rolls)
}
#endif

/// Invented prose for the truncation previews.
enum DSExampleProse {
    static let paragraph = "The afternoon batch ran long because the second press was recalibrated twice, and the operators logged every adjustment so the evening shift could pick up where they left off."
    static let identifier = "Q-77810-2291-4406-8812"
}

/// A counter that counts up every tap, and a second value that only replaces.
struct DSExampleCounter: View {
    @State private var value = 1_280

    init() {}

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSText(value.formatted(), role: .metricLg, numeric: .tabular)
            DSText(value.isMultiple(of: 2) ? "Even" : "Odd", role: .caption, tone: .secondary)
        }
        .contentShape(Rectangle())
        .onTapGesture { value += 7 }
    }
}
#endif
