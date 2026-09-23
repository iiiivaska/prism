#if DEBUG
import SwiftUI
import DSCore
import DSTokens

/// `spec/components/Button.yaml` `examples`, in spec order, with the spec's own labels. `on-vivid` declares
/// `surface: vivid`, so the button sits inside a vivid Surface.
enum DSButtonExamples {
    static let all: [DSExample] = [
        DSExample("Button", "primary-md") {
            DSExampleStage { DSButton("Continue", variant: .primary, size: .md) {} }
        },
        DSExample("Button", "secondary-md") {
            DSExampleStage { DSButton("Details", variant: .secondary, size: .md, trailingIcon: .navOpen) {} }
        },
        DSExample("Button", "ghost-sm") {
            DSExampleStage { DSButton("Filter", variant: .ghost, size: .sm, leadingIcon: .actionFilter) {} }
        },
        DSExample("Button", "danger-md") {
            DSExampleStage { DSButton("Delete route", variant: .danger, size: .md) {} }
        },
        DSExample("Button", "loading") {
            DSExampleStage { DSButton("Saving", variant: .primary, size: .md, isLoading: true) {} }
        },
        DSExample("Button", "disabled") {
            DSExampleStage { DSButton("Continue", variant: .primary, size: .md, isDisabled: true) {} }
        },
        DSExample("Button", "on-vivid") {
            DSExampleStage {
                DSSurfaceView(material: .vivid, radius: .card) {
                    DSButton("Open", variant: .ghost, size: .md) {}
                }
            }
        },
    ]
}

#Preview("Button · primary-md") { DSExamplePreview(example: DSExamples.named("Button/primary-md")) }
#Preview("Button · secondary-md") { DSExamplePreview(example: DSExamples.named("Button/secondary-md")) }
#Preview("Button · ghost-sm") { DSExamplePreview(example: DSExamples.named("Button/ghost-sm")) }
#Preview("Button · danger-md") { DSExamplePreview(example: DSExamples.named("Button/danger-md")) }
#Preview("Button · loading") { DSExamplePreview(example: DSExamples.named("Button/loading")) }
#Preview("Button · disabled") { DSExamplePreview(example: DSExamples.named("Button/disabled")) }
#Preview("Button · on-vivid") { DSExamplePreview(example: DSExamples.named("Button/on-vivid")) }

#Preview("Button · every variant on every material") {
    DSTheme {
        DSExampleStage {
            VStack(alignment: .leading, spacing: DSExampleSize.gap) {
                DSExampleButtonRow()
                DSSurfaceView(material: .vivid, radius: .card) { DSExampleButtonRow() }
                DSSurfaceView(material: .glass, radius: .card, backdrop: .image) { DSExampleButtonRow() }
                    .dsBackdrop(.image) { DSExampleImage() }
                DSSurfaceView(material: .raised, radius: .card) { DSExampleButtonRow() }
            }
        }
    }
}

#Preview("Button · sizes, icons, full width, a long label") {
    DSTheme {
        DSExampleStage {
            VStack(alignment: .leading, spacing: DSExampleSize.gap) {
                ForEach(DSButtonSize.allCases, id: \.self) { size in
                    DSButton(verbatim: size.rawValue, size: size, leadingIcon: .actionAdd, trailingIcon: .navForward) {}
                }
                DSButton("Send invoice", isFullWidth: true) {}
                DSButton(DSExampleProse.paragraph, variant: .secondary) {}
                    .frame(width: DSExampleSize.card)
            }
            .frame(width: DSExampleSize.card * 2)
        }
    }
}

#Preview("Button · Reduce Motion, press to see the fill substitute") {
    DSTheme {
        DSExampleStage { DSExampleButtonRow() }
    }
    .dsAccessibilityPolicy(reduceMotion: true)
}

#Preview("Button · accessibility5 wraps to two lines at the accessibility3 height") {
    DSTheme {
        DSExampleStage {
            DSButton("Send the monthly invoice", variant: .secondary) {}
                .frame(width: DSExampleSize.card)
        }
    }
    .environment(\.dynamicTypeSize, .accessibility5)
}

#Preview("Button · pointer modality, hover") {
    DSTheme {
        DSExampleStage { DSExampleButtonRow() }
    }
    .dsModality(.pointer)
}

#if canImport(Playgrounds)
import Playgrounds

#Playground("Button · the binding matrix on each material") {
    let materials: [DSSurfaceMaterial] = [.page, .solid, .vivid, .glass, .raised]
    let cells = DSButtonVariant.allCases.flatMap { variant in
        materials.map { material in
            (
                variant, material,
                DSButtonAppearance.background(variant, on: material),
                DSButtonAppearance.foreground(variant, on: material),
                DSButtonAppearance.border(variant, on: material),
                DSButtonAppearance.pressedBackground(variant, on: material)
            )
        }
    }
    let hit = DSControlAppearance.hitOutset(visual: CGSize(width: 64, height: 32), hit: 44)
    _ = (cells, hit)
}
#endif

/// One button of each variant, the group a preview presses through.
struct DSExampleButtonRow: View {
    init() {}

    var body: some View {
        HStack(spacing: DSExampleSize.gap) {
            DSButton("Save") {}
            DSButton("Details", variant: .secondary) {}
            DSButton("Filter", variant: .ghost, leadingIcon: .actionFilter) {}
            DSButton("Delete", variant: .danger) {}
        }
    }
}
#endif
