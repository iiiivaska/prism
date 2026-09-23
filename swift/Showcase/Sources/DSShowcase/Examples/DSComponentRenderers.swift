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
        // The action resolves before anything is staged, so a `custom` example the spec writes without the glyph
        // or the name it requires is not staged as some other card: it is not staged at all.
        guard let action = Self.action(of: example) else { return nil }
        if !example.grid.isEmpty {
            return AnyView(DSVividCardGrid(cells: example.grid, example: example, action: action))
        }
        // The `size.card-min` square both harnesses stage a card in (`DSExampleFrame`); a Card sizes itself from
        // its content otherwise, and takes the page.
        return AnyView(DSExampleFrame { card(example, vivid: .default, action: action) })
    }

    /// Card.yaml's `action`, `actionIcon` and `actionLabel` read as the one value the Apple API carries them in.
    ///
    /// The spec writes three props and licenses a stack to bundle them into one "as long as `custom` cannot be
    /// written without them", which is exactly `DSCardAction.custom(glyph:label:)`. An example that writes no
    /// `action` takes the spec's own default, `open`.
    ///
    /// nil is this renderer saying it cannot build these props (`DSExampleRenderer.content(for:)`): an `action`
    /// value this build does not know, or a `custom` one missing its registry glyph or the name of its operation.
    /// Neither is ever inferred — not from the glyph id, and not from the card's title, which names the card's
    /// content and not the operation (Card.yaml `actionIcon`, `actionLabel`; ADR-0011 rule 4) — so there is
    /// nothing to draw in its place.
    static func action(of example: DSSpecExample) -> DSCardAction? {
        guard let written = example.string("action") else { return .open }
        switch written {
        case "open":
            return .open
        case "none":
            return DSCardAction.none
        case "custom":
            guard let glyph = example.icon("actionIcon"),
                  let label = example.string("actionLabel"),
                  !label.allSatisfy(\.isWhitespace)
            else { return nil }
            return .custom(glyph: glyph, label: LocalizedStringKey(label))
        default:
            return nil
        }
    }

    @ViewBuilder
    func card(_ example: DSSpecExample, vivid: DSVividSlot, action: DSCardAction) -> some View {
        let variant: DSCardVariant = example.raw("variant") ?? .solid
        let size: DSCardSize = example.raw("size") ?? .regular
        let backdrop: DSBackdropKind = example.raw("backdrop") ?? .none
        DSCard(
            LocalizedStringKey(example.string("title") ?? "Line output"),
            caption: example.string("caption").map { LocalizedStringKey($0) },
            variant: variant,
            vivid: vivid,
            icon: example.icon("icon"),
            action: action,
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
    /// Resolved once by `DSCardRenderer.content(for:)`, so every cell of the grid draws the same affordance.
    let action: DSCardAction
    private var ds = DSThemeValues()

    init(cells: [String], example: DSSpecExample, action: DSCardAction) {
        self.cells = cells
        self.example = example
        self.action = action
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
                            DSCardRenderer().card(
                                example, vivid: DSVividSlot(rawValue: "slot\(cell)") ?? .default, action: action
                            )
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Divider

/// Divider.yaml's `orientation`, `inset` and `isDecorative`, staged in the rule frame every harness shares
/// (`DSExampleRuleFrame`). A Divider carries no text, so there is no sample string, and it declares no action.
public struct DSDividerRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        // A value the spec writes and this build does not know is nil: the page says so rather than drawing the
        // default in its place. An example that writes no value takes the spec's default.
        let orientation: DSDividerOrientation? = example.string("orientation") == nil ? .horizontal : example.raw("orientation")
        let inset: DSDividerInset? = example.string("inset") == nil ? DSDividerInset.none : example.raw("inset")
        guard let orientation, let inset else { return nil }
        // `isDecorative` defaults true in the spec, and `bool(_:)` alone would default it false. On Apple both values
        // hide the line (Divider.yaml `notes.platform.ios`), so this changes no announcement here; it keeps the props
        // the page passes the ones the spec writes.
        let isDecorative = example.bool("isDecorative", default: true)
        return AnyView(
            DSExampleRuleFrame(orientation) {
                DSDivider(orientation: orientation, inset: inset, isDecorative: isDecorative)
            }
        )
    }

    /// The Surface hugs the rule frame: `inset: content` is `space.card-padding` from the container's edge, and a
    /// `card`-padded Surface would put a second one around it.
    public func surfacePadding(for example: DSSpecExample) -> DSSurfacePadding { DSSurfacePadding.none }
}

// MARK: - Icon

/// Icon.yaml's `name`, `size`, `weight`, `style`, `tone`, `label` and `isDecorative`, staged as every harness stages
/// them: no frame of its own, so a page example is the glyph on the page, and an example that declares a material is
/// the glyph inside a `card`-padded Surface that hugs it (the default `surfacePadding`). Icon declares no action.
public struct DSIconRenderer: DSExampleRenderer {
    public init() {}

    public func content(for example: DSSpecExample) -> AnyView? {
        // A value the spec writes and this build does not know is nil, and the page says so rather than drawing the
        // default in its place; an example that writes no value takes the spec's default.
        guard let name = example.icon("name") else { return nil }
        let size: DSGlyphSize? = example.string("size") == nil ? .md : example.raw("size")
        let weight: DSGlyphWeight? = example.string("weight") == nil ? .control : example.raw("weight")
        let style: DSIconStyle? = example.string("style") == nil ? .outline : example.raw("style")
        guard let size, let weight, let style else { return nil }
        // `inherit` is the absence of a tone: nil sets no colour, and the glyph takes the row's foreground below.
        let tone: DSGlyphTone?
        switch example.string("tone") {
        case nil: tone = .primary
        case "inherit": tone = nil
        case let written?:
            guard let known = DSGlyphTone(rawValue: written) else { return nil }
            tone = known
        }
        // A blank label names nothing, so it is no label: the glyph stays hidden rather than becoming an unnamed image.
        let label = example.string("label").flatMap { $0.allSatisfy(\.isWhitespace) ? nil : LocalizedStringKey($0) }
        // `isDecorative` defaults false in the spec, which is also `bool(_:)`'s default.
        let icon = DSIcon(
            name, size: size, weight: weight, style: style, tone: tone, label: label,
            isDecorative: example.bool("isDecorative")
        )
        return tone == nil ? AnyView(DSRowForeground { icon }) : AnyView(icon)
    }
}

/// The foreground of a row and nothing else of one: `color.text.primary`, ListRow.yaml's `title.color.default`, which
/// an `inherit` glyph takes. The snapshot harness stages `inherit-in-row` in the same wrapper, and the web harnesses in
/// `data-ds-sc-foreground="row"` and `data-ds-gallery-foreground="row"`. It draws no text, so it adds nothing to the
/// accessibility tree.
private struct DSRowForeground<Content: View>: View {
    let content: Content
    private var ds = DSThemeValues()

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content.foregroundStyle(ds.tokens.color.textPrimary)
    }
}
