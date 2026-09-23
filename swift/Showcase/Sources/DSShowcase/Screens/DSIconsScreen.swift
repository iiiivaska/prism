#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSIcons
import DSTokens

/// The icon registry as data, every entry drawn by the component that draws it everywhere else: `DSIcon`.
///
/// `Icon` (`spec/components/Icon.yaml`) is implemented (P4-2), and its spec examples are staged on the Components
/// screen with every other implemented component. This screen is the registry itself, and it is the same screen as
/// the web's `web/apps/showcase/src/sections/Icons.tsx` (P4-D4; `docs/showcase.md`, "The Icons screen"):
///
///  - **Four controls, each one of Icon's own axes, for the whole grid at once**: `size`; `weight`; `style` — the
///    three `DSIconStyle`s, or each entry's registry `defaultStyle` passed as the prop; and a direction, which sets
///    `\.layoutDirection` on the grid alone, where `DSIcon` flips an entry whose `mirrorsInRTL` is true and the system
///    mirrors its direction-relative symbols itself (Icon.yaml behavior 11).
///  - **The registry**: every entry drawn by `DSIcon` in the primary tone with no label, so hidden from VoiceOver, and
///    under each glyph the registry's row for it, kept left to right in either direction: id, label key, tags, default
///    style, binding, and the `fill: false` and mirroring marks. An entry marked `fill: false` asked for `filled` draws
///    its outline on both stacks (ADR-0035), and its tile says so, so the style control never looks broken.
///  - **The ladder**: every rung, box and style cut the registry defines, for the registry's first entry, drawn from
///    the registry's binding (`DSIconPreview`) and labelled as the registry's data, not as the component.
///
/// **Nothing here acts on one icon.** A tile is not a button, and there is no per-icon page. Until P4-D4 a tile opened
/// a detail sheet — exactly the per-icon page that finding SD-1 of `docs/direction-board/reference-distance-showcase.md`
/// names among the affordances that make an icon browser — so the sheet went, and what it showed moved onto the tile
/// and into the ladder. SD-1's do-not-drift note holds: no search, filter, copy, download or per-icon affordance.
///
/// **Landing `Icon` expired this screen's reference-distance clearance** (§10, condition 2): the ADR-0015 rule 3
/// review has to be re-run for it before a release ships it.
struct DSIconsScreen: View {
    @State private var size: DSGlyphSize
    @State private var weight: DSGlyphWeight
    /// nil is "entry default": the entry's registry `defaultStyle`, passed as `DSIcon`'s `style`.
    @State private var style: DSIconStyle?
    @State private var direction: LayoutDirection
    private var ds = DSThemeValues()

    init() {
        _size = State(initialValue: DSShowcaseLaunch.iconSize ?? .lg)
        _weight = State(initialValue: DSShowcaseLaunch.iconWeight ?? .control)
        _style = State(initialValue: DSShowcaseLaunch.iconStyle)
        _direction = State(initialValue: DSShowcaseLaunch.iconDirection ?? .leftToRight)
    }

    var body: some View {
        let tokens = ds.tokens
        let entries = DSIconName.allCases
        DSScreen("Icons") {
            // A reader inside the screen's scroll view, so a launch argument can open the screen at one of its blocks
            // (`DSShowcaseLaunch.iconsBlock`): a screenshot of the grid or the ladder needs no scrolling by hand.
            ScrollViewReader { proxy in
                VStack(alignment: .leading, spacing: tokens.space.sectionGap) {
                    content(tokens: tokens, entries: entries)
                }
                .onAppear {
                    if let block = DSShowcaseLaunch.iconsBlock { proxy.scrollTo(block, anchor: .top) }
                }
            }
        }
    }

    @ViewBuilder
    private func content(tokens: DSTokenSet, entries: [DSIconName]) -> some View {
        DSBlock("\(entries.count) registry entries, each drawn by Icon", note: Self.lead) {
            EmptyView()
        }

        DSBlock("Icon's axes", note: nil) {
            VStack(alignment: .leading, spacing: tokens.space.step3) {
                DSIconAxis("size") {
                    Picker("Size", selection: $size) {
                        ForEach(DSGlyphSize.allCases, id: \.self) { Text("\($0.rawValue) · \(Int(Self.box($0, tokens))) pt").tag($0) }
                    }
                }
                DSIconAxis("weight") {
                    Picker("Weight", selection: $weight) {
                        ForEach(DSGlyphWeight.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                }
                DSIconAxis("style") {
                    Picker("Style", selection: $style) {
                        Text("entry default").tag(DSIconStyle?.none)
                        ForEach(DSIconStyle.allCases, id: \.self) { Text($0.rawValue).tag(DSIconStyle?.some($0)) }
                    }
                }
                DSIconAxis("direction") {
                    Picker("Direction", selection: $direction) {
                        ForEach(LayoutDirection.allCases, id: \.self) { Text(Self.directionName($0)).tag($0) }
                    }
                }
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    ForEach(Self.axisNotes, id: \.self) { DSText(verbatim: $0, role: .caption, tone: .secondary) }
                }
            }
        }

        DSBlock("The registry", note: nil) {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: Self.tileMinimum), spacing: tokens.space.step3, alignment: .top)],
                alignment: .leading,
                spacing: tokens.space.step3
            ) {
                ForEach(entries, id: \.self) { name in
                    DSIconTile(name: name, size: size, weight: weight, style: style ?? name.defaultStyle)
                }
            }
            // The grid alone: the pickers above and the rest of the screen keep the app's own direction, as the web
            // sets `dir` on the grid and nothing else.
            .environment(\.layoutDirection, direction)
        }
        .id(DSShowcaseLaunch.IconsBlock.registry)

        if let first = entries.first {
            DSIconLadder(name: first)
                .id(DSShowcaseLaunch.IconsBlock.ladder)
        }
    }
}

extension DSIconsScreen {
    /// What the screen is, above its controls: the web's lead and first panel, in the same words.
    static var lead: String {
        let spec = DSShowcaseCatalog.named("Icon").map { " (spec/components/Icon.yaml, specVersion \($0.specVersion))" } ?? ""
        return "Every glyph in the registry block is Icon\(spec) with tone primary, at the box, weight, style and direction chosen here, "
            + "from registry \(DSIconName.registryVersion). Its spec examples, on their materials and with the one name a glyph can carry, "
            + "are on Components. The ladder at the end is the registry's own data, which no Icon prop reaches. Nothing here acts on one "
            + "icon: a tile is the registry's row with a picture."
    }

    /// What each control does on this stack, from the registry rather than from a claim: the counts are counted.
    static var axisNotes: [String] {
        let entries = DSIconName.allCases
        let unfilled = entries.filter { !$0.hasFill }.count
        let mirrored = entries.filter(\.mirrorsInRTL).count
        let mirroredText = mirrored == 0
            ? "The registry marks no entry for DSIcon to flip on Apple"
            : "DSIcon flips the \(mirrored) entries the registry marks to mirror on Apple"
        return [
            "weight — display draws only at lg; at sm and md Icon renders the control cut (Icon.yaml behavior 3). On Apple a "
                + "filled or hierarchical glyph still takes the weight, and Bold Text steps it one rung (behaviors 4 and 6).",
            "style — the spec's default is outline; entry default passes each entry's registry defaultStyle as the prop. "
                + "\(unfilled) of \(entries.count) entries are marked fill: false: they have no filled drawing, so filled draws "
                + "their outline on both stacks (ADR-0035), and their tiles say so. duotone is each stack's own drawing — "
                + "hierarchical here, Phosphor's duotone cut on the web — and ADR-0035 left that pair unaudited.",
            "direction — rtl sets the layout direction of the grid alone. \(mirroredText): the system mirrors its "
                + "direction-relative symbols itself (Icon.yaml behavior 11). The ids and facts stay left to right.",
        ]
    }

    /// The box Icon lays a glyph out in at a size, for the picker's label: the token `DSIcon` reads.
    static func box(_ size: DSGlyphSize, _ tokens: DSTokenSet) -> CGFloat {
        switch size {
        case .sm: tokens.size.iconSm
        case .md: tokens.size.iconMd
        case .lg: tokens.size.iconLg
        }
    }

    /// The web's spelling of a direction, which is also the one the launch argument takes.
    static func directionName(_ direction: LayoutDirection) -> String {
        direction == .rightToLeft ? "rtl" : "ltr"
    }

    /// Two tiles side by side on a phone; the registry's rows wrap inside them.
    static let tileMinimum: CGFloat = 148

    /// ADR-0035, as `DSIconAppearance.drawnStyle(_:for:)` applies it inside `DSComponents`, where it is internal:
    /// `filled` on an entry with no filled drawing is its outline. The tile reads it to say so; the ladder reads it so
    /// that the registry's own drawing of a style is the one Icon would draw.
    static func drawnStyle(_ style: DSIconStyle, for name: DSIconName) -> DSIconStyle {
        style == .filled && !name.hasFill ? .outline : style
    }
}

/// One of Icon's axes: its name over a segmented control, as the web's axis row puts the name before its buttons.
struct DSIconAxis<Control: View>: View {
    let name: String
    let control: Control
    private var ds = DSThemeValues()

    init(_ name: String, @ViewBuilder control: () -> Control) {
        self.name = name
        self.control = control()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: ds.tokens.space.step1) {
            DSText(verbatim: name, role: .labelSm, tone: .secondary)
            control
                .pickerStyle(.segmented)
                .labelsHidden()
        }
    }
}

/// One registry entry: the glyph `DSIcon` draws at the screen's axes, and under it the registry's row, left to right
/// whatever direction the grid is in. It is not a control.
struct DSIconTile: View {
    let name: DSIconName
    let size: DSGlyphSize
    let weight: DSGlyphWeight
    let style: DSIconStyle
    private var ds = DSThemeValues()

    init(name: DSIconName, size: DSGlyphSize, weight: DSGlyphWeight, style: DSIconStyle) {
        self.name = name
        self.size = size
        self.weight = weight
        self.style = style
    }

    var body: some View {
        let tokens = ds.tokens
        VStack(alignment: .leading, spacing: tokens.space.step1) {
            DSIcon(name, size: size, weight: weight, style: style, tone: .primary)
                .frame(maxWidth: .infinity, minHeight: DSIconTile.glyphRow)
            Group {
                if DSIconsScreen.drawnStyle(style, for: name) != style {
                    DSText(verbatim: "fill: false → outline", role: .micro, tone: .info)
                }
                DSText(verbatim: name.rawValue, role: .data, tone: .primary)
                DSText(verbatim: name.label, role: .micro, tone: .secondary)
                DSText(verbatim: name.tags.joined(separator: ", "), role: .micro, tone: .tertiary)
                DSText(verbatim: DSIconTile.facts(name), role: .micro, tone: .tertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .environment(\.layoutDirection, .leftToRight)
        }
        .padding(tokens.space.step3)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(
            RoundedRectangle(cornerRadius: tokens.radius.tile, style: .continuous)
                .fill(tokens.color.bgSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: tokens.radius.tile, style: .continuous)
                .strokeBorder(tokens.color.borderHairline, lineWidth: tokens.border.hairline)
        )
    }

    /// The row the glyph sits in: the web's 3rem box, so the largest glyph has air around it and the text below it
    /// starts at the same height in every tile.
    static let glyphRow: CGFloat = 48

    /// The entry's registry facts on one line: default style, binding, and the two marks the controls above act on.
    static func facts(_ name: DSIconName) -> String {
        let binding = name.symbol ?? name.asset.map { "\($0) image set" } ?? "no binding"
        var facts = ["default \(name.defaultStyle.rawValue)", binding]
        if !name.hasFill { facts.append("fill: false") }
        if name.mirrorsInRTL { facts.append("mirrors in rtl") }
        return facts.joined(separator: " · ")
    }
}

/// The registry's ladder for one entry: every rung, box and style cut the registry defines, drawn from the registry's
/// binding. Icon's props reach two of the six rungs, three of the four boxes and all three styles; the rest is here as
/// the registry's data, and the block says so.
struct DSIconLadder: View {
    let name: DSIconName
    private var ds = DSThemeValues()

    init(name: DSIconName) { self.name = name }

    var body: some View {
        let tokens = ds.tokens
        DSBlock(
            "Registry data: the ladder",
            note: "Every rung, box and style cut the registry defines for \(name.rawValue), drawn from its binding. Icon reaches two rungs, three boxes and the three styles through its props; the rest is here as the registry's data (DSIconWeight, DSIconSize, DSIconStyle), not as the component. Under Bold Text each rung steps to the next (ADR-0021 §3)."
        ) {
            VStack(alignment: .leading, spacing: tokens.space.step4) {
                row("weights", DSIconWeight.allCases, minimum: DSIconLadder.cellMinimum) { weight in
                    DSIconPreview(name: name, weight: weight, style: .outline, size: .lg)
                    DSText(verbatim: "\(weight.rawValue) · \(weight.number)", role: .micro, tone: .secondary)
                }
                row("boxes", DSIconSize.allCases, minimum: DSIconLadder.cellMinimum) { size in
                    DSIconPreview(name: name, style: .outline, size: size)
                    DSText(verbatim: "\(size.rawValue) · \(Int(size.box)) pt", role: .micro, tone: .secondary)
                }
                row("styles", DSIconStyle.allCases, minimum: DSIconLadder.wideCellMinimum) { style in
                    DSIconPreview(name: name, style: style, size: .lg)
                    DSText(verbatim: "\(style.rawValue) · \(DSIconLadder.binding(name, style))", role: .micro, tone: .secondary)
                }
            }
        }
    }

    /// One of the registry's tables, named, with one rung per cell, wrapping where the width runs out, as the web's
    /// ladder rows wrap.
    private func row<Item: Hashable, Cell: View>(
        _ title: String,
        _ items: [Item],
        minimum: CGFloat,
        @ViewBuilder cell: @escaping (Item) -> Cell
    ) -> some View {
        let tokens = ds.tokens
        return VStack(alignment: .leading, spacing: tokens.space.step2) {
            DSText(verbatim: title, role: .labelSm, tone: .secondary)
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: minimum), spacing: tokens.space.step3, alignment: .bottom)],
                alignment: .leading,
                spacing: tokens.space.step3
            ) {
                ForEach(items, id: \.self) { item in
                    VStack(spacing: tokens.space.step1) { cell(item) }
                }
            }
        }
    }

    static let cellMinimum: CGFloat = 88
    /// A style's cell carries the binding it draws, a phrase rather than a number, so it keeps that phrase on one line.
    static let wideCellMinimum: CGFloat = 240

    /// What the registry's binding draws for a style: the SF variant or rendering mode, or the image set's cut — and,
    /// when ADR-0035 turns `filled` into the outline, the reason.
    static func binding(_ name: DSIconName, _ style: DSIconStyle) -> String {
        let drawn = DSIconsScreen.drawnStyle(style, for: name)
        let what: String
        if name.symbol != nil {
            what = drawn.symbolVariant != nil ? "fill variant" : (drawn.renderingMode != nil ? "hierarchical" : "plain symbol")
        } else {
            what = drawn.phosphorCut ?? "the weight's cut"
        }
        return drawn == style ? what : "\(what): no filled drawing"
    }
}

/// One registry entry, drawn the way the registry binds it, at any of the registry's six rungs, four boxes and three
/// styles: the registry's data, which reaches further than Icon's props do (Icon draws two rungs and three boxes). The
/// ladder uses it for exactly that and says so; the grid draws `DSIcon`. A style goes through
/// `DSIconsScreen.drawnStyle(_:for:)` first, so `filled` reaches a fill variant only where the registry has one
/// (ADR-0035 rule 2).
struct DSIconPreview: View {
    let name: DSIconName
    var weight: DSIconWeight = .regular
    var style: DSIconStyle = .outline
    var size: DSIconSize = .md
    private var ds = DSThemeValues()

    init(name: DSIconName, weight: DSIconWeight = .regular, style: DSIconStyle = .outline, size: DSIconSize = .md) {
        self.name = name
        self.weight = weight
        self.style = style
        self.size = size
    }

    var body: some View {
        let style = DSIconsScreen.drawnStyle(style, for: name)
        Group {
            if let symbol = name.symbol {
                Image(systemName: symbol)
                    .symbolVariant(style.symbolVariant ?? .none)
                    .symbolRenderingMode(style.renderingMode)
                    .font(.system(size: size.pointSize, weight: weight.fontWeight))
            } else if let asset = name.asset, let bundle = DSIconAssets.bundle {
                Image("\(asset).\(style.phosphorCut ?? weight.phosphorCut)", bundle: bundle)
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    .frame(width: size.box, height: size.box)
            } else {
                DSText(verbatim: "?", role: .labelSm, tone: .tertiary)
            }
        }
        .foregroundStyle(ds.tokens.color.iconPrimary)
        .frame(width: size.box, height: size.box)
        .accessibilityHidden(true)
    }
}

/// The resource bundle DSIcons ships its Phosphor image sets in. SwiftPM gives a target's bundle only to that
/// target, so an app reaches another target's resources by name; the app says "no preview" rather than drawing
/// nothing when it cannot find it.
enum DSIconAssets {
    static let bundle: Bundle? = {
        let name = "Prism_DSIcons.bundle"
        var roots: [URL] = [Bundle.main.bundleURL]
        if let resources = Bundle.main.resourceURL { roots.append(resources) }
        roots.append(Bundle.main.bundleURL.appendingPathComponent("Contents/Resources", isDirectory: true))
        for root in roots {
            let candidate = root.appendingPathComponent(name, isDirectory: true)
            if FileManager.default.fileExists(atPath: candidate.path), let bundle = Bundle(url: candidate) {
                return bundle
            }
        }
        return nil
    }()
}
#endif
