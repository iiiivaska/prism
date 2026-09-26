#if DEBUG
import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// `spec/components/Chip.yaml` `examples`, in spec order.
///
/// **Written as data, because this harness never reads the spec**, as Avatar's and IconButton's are: each example is
/// one `DSChipExample` row — its props with the spec's defaults filled in, and where it is staged — and
/// `DSChipBindingTests.everyExampleIsTheOneTheSpecWrites` holds every row to the spec's own entry, so a row cannot
/// draw another chip, or publish another name, than the web story generated from the same entry.
///
/// **The stage is Avatar's, in all four harnesses** (the Apple and web galleries and showcases): there is no
/// card-sized frame. A page example puts the chip straight on the page. `on-map` and `selected-on-map` put it straight
/// on the synthetic map, which the stage declares with `dsBackdrop(_:_:)`, so the pill reads the page over a map and
/// renders the glass chip (ADR-0036 §8.7); `on-vivid` and `on-glass-over-image` put it inside a vivid Surface, and a
/// glass Surface over the synthetic image, with `radius: card` and the default `padding: card`, which hugs it.
///
/// **Every example gets its handlers** (spec/SCHEMA.md, "Examples and snapshots"): a no-op `onPress` and `onRemove`,
/// so every example is the interactive chip — a filter where it sets `isSelected`, a button otherwise — in both
/// stacks. `md-with-avatar` fills the `avatar` slot with Avatar's own props, `name` alone, which the chip draws at size
/// sm and decorative. The names are `DSChipNameCase.all` (`DSChipBindingTests.swift`), the web's table in
/// `web/apps/gallery/test/accessibility.browser.test.tsx`, and what `DSChipAccessibilityTreeTests` reads off the
/// simulator. The strings are the spec's own invented ones (ADR-0015 rule 3).
enum DSChipExamples {
    static let rows: [DSChipExample] = [
        DSChipExample("default-sm", label: "Last 24 hours", size: .sm),
        DSChipExample("selected", label: "Last 24 hours", isSelected: true),
        DSChipExample("with-leading-icon", label: "Routes", leadingIcon: .actionFilter),
        DSChipExample("removable", label: "North yard", isRemovable: true),
        DSChipExample("identifier-copy", label: "INV-209316", trailingIcon: .actionCopy),
        DSChipExample("md-size", label: "Depots", size: .md, leadingIcon: .objectMapPin),
        DSChipExample("disabled", label: "Last 24 hours", isDisabled: true),
        DSChipExample("md-with-avatar", label: "Anna Petrova", size: .md, avatarName: "Anna Petrova"),
        DSChipExample("on-map", label: "Depots", leadingIcon: .objectMapPin, staging: .ground(.map)),
        DSChipExample("selected-on-map", label: "Depots", isSelected: true, staging: .ground(.map)),
        DSChipExample("on-vivid", label: "Yield", staging: .surface(.vivid, backdrop: .none)),
        DSChipExample("on-glass-over-image", label: "In service", staging: .surface(.glass, backdrop: .image)),
        DSChipExample("russian-label", label: "Последние 24 часа", isSelected: true),
    ]

    static var all: [DSExample] { rows.map(\.example) }
}

/// Where a Chip example is staged: straight on a ground — the page, or the synthetic map or image, which the stage
/// declares, so the pill reads the page over that kind — or inside a Surface of a material, which declares the backdrop
/// it sits on, over the ground that paints that backdrop (Avatar's `DSAvatarExampleStaging`).
enum DSChipExampleStaging: Hashable {
    case ground(DSExampleGround)
    case surface(DSSurfaceMaterial, backdrop: DSBackdropKind)
}

/// One `examples[]` entry of Chip.yaml: the props, with the spec's defaults where the entry writes none, and where the
/// chip is staged.
struct DSChipExample: Hashable {
    let id: String
    /// The spec's string, byte for byte.
    let label: String
    let size: DSChipSize
    let leadingIcon: DSIconName?
    /// The `name` of the Avatar the `avatar` slot holds, which is all an example writes there; nil for no Avatar.
    let avatarName: String?
    let trailingIcon: DSIconName?
    /// nil where the example leaves `isSelected` unset: not a filter.
    let isSelected: Bool?
    let isRemovable: Bool
    let isDisabled: Bool
    let staging: DSChipExampleStaging

    init(
        _ id: String,
        label: String,
        size: DSChipSize = .sm,
        leadingIcon: DSIconName? = nil,
        avatarName: String? = nil,
        trailingIcon: DSIconName? = nil,
        isSelected: Bool? = nil,
        isRemovable: Bool = false,
        isDisabled: Bool = false,
        staging: DSChipExampleStaging = .ground(.page)
    ) {
        self.id = id
        self.label = label
        self.size = size
        self.leadingIcon = leadingIcon
        self.avatarName = avatarName
        self.trailingIcon = trailingIcon
        self.isSelected = isSelected
        self.isRemovable = isRemovable
        self.isDisabled = isDisabled
        self.staging = staging
    }

    /// The context the pill reads where it is staged: the page over the ground's kind, or the Surface's material over
    /// the backdrop it declares.
    var context: DSSurfaceContext {
        switch staging {
        case .ground(.page): .root
        case .ground(.map): DSSurfaceContext(material: .page, backdrop: .map)
        case .ground(.image): DSSurfaceContext(material: .page, backdrop: .image)
        case .surface(let material, let backdrop): DSSurfaceContext(material: material, backdrop: backdrop)
        }
    }

    /// Whether the example renders glass, and so is also snapshotted under forced Reduce Transparency: its Surface is
    /// glass, or the pill's own `root.background` on its ground binds `material.glass.chip`. That is `on-map`,
    /// `selected-on-map`, `on-vivid` and `on-glass-over-image`.
    var hasGlass: Bool {
        if case .surface(let material, _) = staging, material.isGlass { return true }
        return DSChipAppearance.background(on: context) == .glass
    }

    var example: DSExample {
        DSExample("Chip", id, hasGlass: hasGlass) { DSChipExampleStage(row: self) }
    }

    /// What the whole stage is painted on: the ground itself, or the backdrop a glass Surface blurs.
    var ground: DSExampleGround {
        switch staging {
        case .ground(let ground): ground
        case .surface(_, backdrop: .map): .map
        case .surface(_, backdrop: .image): .image
        case .surface: .page
        }
    }
}

/// One Chip example on its stage.
struct DSChipExampleStage: View {
    let row: DSChipExample

    var body: some View {
        DSExampleStage(row.ground) {
            if case .surface(let material, let backdrop) = row.staging {
                DSSurfaceView(material: material, radius: .card, backdrop: backdrop) { DSChipExampleChip(row: row) }
            } else {
                DSChipExampleChip(row: row)
            }
        }
    }
}

/// An example's chip: its props, and the handlers every example gets.
struct DSChipExampleChip: View {
    let row: DSChipExample

    var body: some View {
        DSChip(
            verbatim: row.label,
            size: row.size,
            leadingIcon: row.leadingIcon,
            avatar: row.avatarName.map { DSAvatar(name: $0) },
            trailingIcon: row.trailingIcon,
            isSelected: row.isSelected,
            isRemovable: row.isRemovable,
            isDisabled: row.isDisabled,
            onPress: {},
            onRemove: {}
        )
    }
}

#Preview("Chip · default-sm") { DSExamplePreview(example: DSExamples.named("Chip/default-sm")) }
#Preview("Chip · selected") { DSExamplePreview(example: DSExamples.named("Chip/selected")) }
#Preview("Chip · with-leading-icon") { DSExamplePreview(example: DSExamples.named("Chip/with-leading-icon")) }
#Preview("Chip · removable") { DSExamplePreview(example: DSExamples.named("Chip/removable")) }
#Preview("Chip · identifier-copy") { DSExamplePreview(example: DSExamples.named("Chip/identifier-copy")) }
#Preview("Chip · md-size") { DSExamplePreview(example: DSExamples.named("Chip/md-size")) }
#Preview("Chip · disabled") { DSExamplePreview(example: DSExamples.named("Chip/disabled")) }
#Preview("Chip · md-with-avatar") { DSExamplePreview(example: DSExamples.named("Chip/md-with-avatar")) }
#Preview("Chip · on-map") { DSExamplePreview(example: DSExamples.named("Chip/on-map")) }
#Preview("Chip · selected-on-map") { DSExamplePreview(example: DSExamples.named("Chip/selected-on-map")) }
#Preview("Chip · on-vivid") { DSExamplePreview(example: DSExamples.named("Chip/on-vivid")) }
#Preview("Chip · on-glass-over-image") { DSExamplePreview(example: DSExamples.named("Chip/on-glass-over-image")) }
#Preview("Chip · russian-label") { DSExamplePreview(example: DSExamples.named("Chip/russian-label")) }

#Preview("Chip · selected-on-map under Reduce Transparency: the raised fallback, the default cells, no check") {
    DSExamplePreview(example: DSExamples.named("Chip/selected-on-map"))
        .dsAccessibilityPolicy(reduceTransparency: true)
}

#Preview("Chip · on every material, at rest and selected") {
    DSTheme {
        DSExampleStage {
            VStack(alignment: .leading, spacing: DSExampleSize.gap) {
                DSExampleChipRow()
                DSSurfaceView(material: .raised, radius: .card) { DSExampleChipRow() }
                DSSurfaceView(material: .vivid, radius: .card) { DSExampleChipRow() }
                DSSurfaceView(material: .accent, radius: .card) { DSExampleChipRow() }
                DSSurfaceView(material: .inverse, radius: .card) { DSExampleChipRow() }
                DSSurfaceView(material: .glass, radius: .card, backdrop: .image) { DSExampleChipRow() }
                    .dsBackdrop(.image) { DSExampleImage() }
            }
        }
    }
}

/// A filter off and on, and an identifier with its Avatar: the three things a chip carries on every material.
struct DSExampleChipRow: View {
    init() {}

    var body: some View {
        HStack(spacing: DSExampleSize.gap) {
            DSChip(verbatim: "Last 24 hours", isSelected: false) {}
            DSChip(verbatim: "Last 24 hours", isSelected: true) {}
            DSChip(verbatim: "Anna Petrova", size: .md, avatar: DSAvatar(name: "Anna Petrova")) {}
        }
    }
}
#endif
