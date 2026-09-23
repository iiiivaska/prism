#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSIcons
import DSTokens

/// The icon registry as data, every entry drawn by the component that draws it everywhere else: `DSIcon`.
///
/// `Icon` (`spec/components/Icon.yaml`) is implemented (P4-2), and its spec examples are staged on the Components
/// screen with every other implemented component. This screen is the registry itself: each of its entries drawn by
/// `DSIcon` at the box and weight picked above — Icon's own `size` and `weight` props — in the entry's registry style,
/// in the primary tone. The detail sheet adds what no Icon prop reaches: the registry's six-rung ladder and its four
/// boxes, drawn from the registry's binding (`DSIconPreview`) and labelled as registry data.
///
/// **Landing `Icon` expired this screen's reference-distance clearance.** P5-3 cleared it as a registry preview that
/// no component drew (`docs/direction-board/reference-distance-showcase.md` §10, condition 2, finding SD-1); it is now
/// a screen made of a Prism component, on the closest call either app has to the icon-browser genre, and the ADR-0015
/// rule 3 review has to be re-run for it before a release ships it. SD-1's do-not-drift note still holds: no search,
/// filter, copy, download or new per-icon affordance.
struct DSIconsScreen: View {
    @State private var selected: DSIconName?
    @State private var weight: DSGlyphWeight = .control
    @State private var size: DSGlyphSize = .lg
    private var ds = DSThemeValues()

    init() { _selected = State(initialValue: DSShowcaseLaunch.icon) }

    var body: some View {
        let tokens = ds.tokens
        DSScreen("Icons") {
            DSBlock("\(DSIconName.allCases.count) icons, registry \(DSIconName.registryVersion)", note: "Each entry drawn by Icon, at the size and weight picked here, in the entry's registry style. Icon's examples are on Components.") {
                VStack(alignment: .leading, spacing: tokens.space.step3) {
                    Picker("Weight", selection: $weight) {
                        ForEach(DSGlyphWeight.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Picker("Size", selection: $size) {
                        ForEach(DSGlyphSize.allCases, id: \.self) { Text("\($0.rawValue) · \(Int(Self.box($0, tokens))) pt").tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
            }

            DSBlock("The registry", note: nil) {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 104), spacing: tokens.space.step3)], spacing: tokens.space.step3) {
                    ForEach(DSIconName.allCases, id: \.self) { name in
                        Button {
                            selected = name
                        } label: {
                            VStack(spacing: tokens.space.step2) {
                                DSIcon(name, size: size, weight: weight, style: name.defaultStyle, tone: .primary)
                                DSText(verbatim: name.rawValue, role: .micro, tone: .secondary, truncation: .ellipsis, maxLines: 2)
                                    .frame(maxWidth: .infinity)
                            }
                            .padding(tokens.space.step3)
                            .frame(maxWidth: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: tokens.radius.tile, style: .continuous)
                                    .fill(tokens.color.bgSurface)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: tokens.radius.tile, style: .continuous)
                                    .strokeBorder(tokens.color.borderHairline, lineWidth: tokens.border.hairline)
                            )
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .sheet(item: $selected) { name in
            DSIconDetail(name: name)
        }
    }
}

extension DSIconsScreen {
    /// The box Icon lays a glyph out in at a size, for the picker's label: the token `DSIcon` reads.
    static func box(_ size: DSGlyphSize, _ tokens: DSTokenSet) -> CGFloat {
        switch size {
        case .sm: tokens.size.iconSm
        case .md: tokens.size.iconMd
        case .lg: tokens.size.iconLg
        }
    }
}

extension DSIconName: Identifiable {
    public var id: String { rawValue }
}

/// One registry entry, drawn the way the registry binds it, at any of the registry's six rungs and four boxes: the
/// registry's data, which reaches further than Icon's props do (Icon draws two rungs and three boxes). The detail sheet
/// uses it for exactly that and says so; the grid draws `DSIcon`.
struct DSIconPreview: View {
    let name: DSIconName
    var weight: DSIconWeight = .regular
    var style: DSIconStyle?
    var size: DSIconSize = .md
    private var ds = DSThemeValues()

    init(name: DSIconName, weight: DSIconWeight = .regular, style: DSIconStyle? = nil, size: DSIconSize = .md) {
        self.name = name
        self.weight = weight
        self.style = style
        self.size = size
    }

    var body: some View {
        let style = style ?? name.defaultStyle
        Group {
            if let symbol = name.symbol {
                Image(systemName: symbol)
                    .symbolVariant(style.symbolVariant ?? .none)
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
    }
}

/// Everything the registry says about one icon.
struct DSIconDetail: View {
    let name: DSIconName
    @Environment(\.dismiss) private var dismiss
    private var ds = DSThemeValues()

    init(name: DSIconName) { self.name = name }

    var body: some View {
        let tokens = ds.tokens
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: tokens.space.sectionGap) {
                    DSBlock("The weight ladder", note: "Registry data: the six rungs the registry binds, of which Icon's two weights reach regular and thin. Under Bold Text each rung steps to the next (ADR-0021 §3).") {
                        HStack(spacing: tokens.space.step4) {
                            ForEach(DSIconWeight.allCases, id: \.self) { weight in
                                VStack(spacing: tokens.space.step1) {
                                    DSIconPreview(name: name, weight: weight, size: .lg)
                                    DSText(verbatim: weight.rawValue, role: .micro, tone: .tertiary)
                                }
                            }
                        }
                    }
                    DSBlock("The boxes", note: "Registry data: ref.size.icon's four boxes, of which Icon's three sizes take sm, md and lg.") {
                        HStack(alignment: .bottom, spacing: tokens.space.step4) {
                            ForEach(DSIconSize.allCases, id: \.self) { size in
                                VStack(spacing: tokens.space.step1) {
                                    DSIconPreview(name: name, size: size)
                                    DSText(verbatim: "\(size.rawValue) \(Int(size.box))", role: .micro, tone: .tertiary)
                                }
                            }
                        }
                    }
                    DSBlock("Registry", note: nil) {
                        VStack(alignment: .leading, spacing: tokens.space.step2) {
                            DSFactRow("id", name.rawValue)
                            DSFactRow("label key", name.label)
                            DSFactRow("default style", name.defaultStyle.rawValue)
                            // `mirrorsInRTL` is rtlMirror.apple: whether Prism flips the glyph. A direction-relative symbol
                            // (`chevron.backward`, `arrow.up.forward`) is mirrored by the system instead, so it reads "no" here.
                            DSFactRow("flipped by Prism in RTL", name.mirrorsInRTL ? "yes" : "no")
                            DSFactRow("binding", name.symbol.map { "SF Symbol \($0)" } ?? name.asset.map { "Phosphor image set \($0).<cut>" } ?? "none")
                            DSFactRow("tags", name.tags.joined(separator: ", "))
                        }
                    }
                }
                .padding(tokens.space.pageMargin)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(tokens.color.bgPage)
            .navigationTitle(name.rawValue)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        #if os(macOS)
        .frame(minWidth: 520, minHeight: 560)
        #endif
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
