import SwiftUI
import DSCore
import DSComponents
import DSIcons
import DSTokens

// One renderer per component `DSComponentsManifest` implements on Apple. Each maps the spec's own `props` onto
// the component's public API, so an example the spec adds is staged without an edit here; only a prop no
// renderer knows is a reason to touch this file. Strings are invented (ADR-0015 rule 3) and match the ones the
// snapshot harness uses, so a showcase page and a gallery pair show the same words.

// MARK: - Surface

public struct DSSurfaceRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        if !example.grid.isEmpty { return AnyView(DSVividPairGrid(cells: example.grid)) }
        guard let material: DSSurfaceMaterial = example.raw("material") else { return nil }
        let radius: DSSurfaceRadius = example.raw("radius") ?? .card
        let elevation: DSSurfaceElevation? = example.raw("elevation")
        let padding: DSSurfacePadding = example.raw("padding") ?? .card
        let backdrop: DSBackdropKind = example.raw("backdrop") ?? .none
        let slot: DSExampleSlot.Size = switch radius {
        case .pill: .pill
        case .tile: .tile
        default: .card
        }
        return AnyView(
            DSSurfaceView(
                material: material,
                radius: radius,
                elevation: elevation,
                padding: padding,
                backdrop: backdrop,
                selected: example.bool("selected")
            ) {
                DSExampleSlot(slot)
            }
        )
    }
}

/// A grid example: the cells are vivid slots, row-major, two per row (`grid: ["1", "2", "2", "1"]`).
struct DSVividPairGrid: View {
    let cells: [String]
    private var ds = DSThemeValues()

    init(cells: [String]) { self.cells = cells }

    var body: some View {
        let gap = ds.tokens.space.cardGap
        let rows = stride(from: 0, to: cells.count, by: 2).map { Array(cells[$0..<min($0 + 2, cells.count)]) }
        Grid(horizontalSpacing: gap, verticalSpacing: gap) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                GridRow {
                    ForEach(Array(row.enumerated()), id: \.offset) { _, cell in
                        DSSurfaceView(material: .vivid, vivid: slot(cell), radius: .tile) { DSExampleSlot(.tile) }
                    }
                }
            }
        }
    }

    private func slot(_ cell: String) -> DSVividSlot { DSVividSlot(rawValue: "slot\(cell)") ?? .default }
}

// MARK: - Text

public struct DSTextRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        let role: DSTextRole = example.raw("role") ?? .bodyMd
        let tone: DSTextTone? = example.string("tone") == nil ? .primary : example.raw("tone")
        let numeric: DSTextNumeric = example.raw("numeric") ?? .auto
        let truncation: DSTextTruncation = example.raw("truncation") ?? .none
        let sample = DSSampleText.text(for: example, role: role)
        let text = DSText(
            verbatim: sample.first,
            role: role,
            tone: tone,
            trailing: example.string("trailing"),
            unit: example.string("unit"),
            numeric: numeric,
            truncation: truncation,
            maxLines: example["maxLines"]?.int
        )
        guard let second = sample.second else { return AnyView(text) }
        return AnyView(
            VStack(alignment: .leading, spacing: 0) {
                text
                DSText(verbatim: second, role: role, tone: .secondary)
            }
        )
    }
}

/// The invented strings the examples show (ADR-0015 rule 3). An example the spec adds falls back to the sample
/// its role carries, so a new example needs no entry here.
enum DSSampleText {
    static func text(for example: DSSpecExample, role: DSTextRole) -> (first: String, second: String?) {
        switch example.id {
        case "hero-metric": ("86", nil)
        case "title-two-tone": ("Weekly summary", "Twelve sessions logged")
        case "caption": ("Updated two minutes ago", nil)
        case "on-vivid": ("Average yield", nil)
        case "on-glass-over-map": ("Next stop in four minutes", nil)
        case "data-tabular": ("12:04:36", nil)
        default: (byRole(role), nil)
        }
    }

    static func byRole(_ role: DSTextRole) -> String {
        switch role {
        case .metricXl, .metricLg, .metricMd: "86"
        case .data: "12:04:36"
        case .caption, .micro: "Updated two minutes ago"
        case .eyebrow, .labelLg, .labelMd, .labelSm: "Line output"
        case .displayXl, .displayLg, .displayMd, .titleLg, .titleMd, .titleSm, .headline: "Weekly summary"
        case .bodyLg, .bodyMd, .bodySm: "The afternoon batch ran long because the second press was recalibrated twice."
        }
    }
}

// MARK: - Button

public struct DSButtonRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        let variant: DSButtonVariant = example.raw("variant") ?? .primary
        let size: DSButtonSize = example.raw("size") ?? .md
        return AnyView(
            DSButton(
                example.string("label") ?? "Continue",
                variant: variant,
                size: size,
                leadingIcon: example.icon("leadingIcon"),
                trailingIcon: example.icon("trailingIcon"),
                isLoading: example.bool("isLoading"),
                isDisabled: example.bool("isDisabled"),
                fullWidth: example.bool("fullWidth"),
                action: example.handler("onPress") ?? {}
            )
        )
    }
}

// MARK: - Card

public struct DSCardRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        if !example.grid.isEmpty { return AnyView(DSVividCardGrid(cells: example.grid, example: example)) }
        // The `size.card-min` square both harnesses stage a card in (`DSExampleFrame`); a Card sizes itself from
        // its content otherwise, and takes the page.
        return AnyView(DSExampleFrame { card(example, vivid: .default) })
    }

    @ViewBuilder
    func card(_ example: DSSpecExample, vivid: DSVividSlot) -> some View {
        let variant: DSCardVariant = example.raw("variant") ?? .solid
        let size: DSCardSize = example.raw("size") ?? .regular
        let backdrop: DSBackdropKind = example.raw("backdrop") ?? .none
        DSCard(
            LocalizedStringKey(example.string("title") ?? "Line output"),
            caption: example.string("caption").map { LocalizedStringKey($0) },
            variant: variant,
            vivid: vivid,
            icon: example.icon("icon"),
            hero: hero(example),
            size: size,
            backdrop: backdrop,
            isSelected: example.bool("isSelected"),
            onAction: example.handler("onAction")
        )
    }

    private func hero(_ example: DSSpecExample) -> DSCardHero? {
        guard let hero = example["hero"], let value = hero["value"]?.string else { return nil }
        return DSCardHero(value, trailing: hero["trailing"]?.string, unit: hero["unit"]?.string)
    }
}

/// A 2×2 of vivid cards, one slot pair on the diagonals (`grid: ["1", "2", "2", "1"]`).
struct DSVividCardGrid: View {
    let cells: [String]
    let example: DSSpecExample
    private var ds = DSThemeValues()

    init(cells: [String], example: DSSpecExample) {
        self.cells = cells
        self.example = example
    }

    var body: some View {
        // `space.4` and a `size.card-min` cell, which is what `DSExampleVividCardGrid` measures in the snapshot
        // harness and what `.ds-sc-grid` measures on the web: the 460 pt square of the `Card/vivid-pair` baseline.
        let gap = ds.tokens.space.step4
        let rows = stride(from: 0, to: cells.count, by: 2).map { Array(cells[$0..<min($0 + 2, cells.count)]) }
        Grid(horizontalSpacing: gap, verticalSpacing: gap) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                GridRow {
                    ForEach(Array(row.enumerated()), id: \.offset) { _, cell in
                        DSExampleFrame {
                            DSCardRenderer().card(example, vivid: DSVividSlot(rawValue: "slot\(cell)") ?? .default)
                        }
                    }
                }
            }
        }
    }
}
