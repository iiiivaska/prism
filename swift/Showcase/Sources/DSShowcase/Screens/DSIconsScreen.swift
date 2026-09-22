#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSIcons
import DSTokens

/// The icon registry as data, with a preview drawn from the registry's own binding.
///
/// `Icon` (`spec/components/Icon.yaml`) is implemented on neither stack: `DSGlyph` on Apple and `Glyph` on the
/// web are internal and decorative, and `Icon` is in no manifest. So this screen previews each registry entry
/// from what the registry itself names — the SF Symbol, or the Phosphor image set Prism redistributes — and says
/// that this is a preview, not the component. The moment `Icon` enters a manifest the catalogue moves it into
/// Components and this note stops being true.
struct DSIconsScreen: View {
    @State private var selected: DSIconName?
    @State private var weight: DSIconWeight = .regular
    @State private var size: DSIconSize = .lg
    private var ds = DSThemeValues()

    init() { _selected = State(initialValue: DSShowcaseLaunch.icon) }

    var body: some View {
        let tokens = ds.tokens
        DSScreen("Icons") {
            DSBlock("\(DSIconName.allCases.count) icons, registry \(DSIconName.registryVersion)", note: "Drawn from the registry binding — Icon is implemented on neither stack, so this is a preview of the glyph the registry names, not of the component.") {
                VStack(alignment: .leading, spacing: tokens.space.step3) {
                    Picker("Weight", selection: $weight) {
                        ForEach(DSIconWeight.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Picker("Size", selection: $size) {
                        ForEach(DSIconSize.allCases, id: \.self) { Text("\($0.rawValue) · \(Int($0.box)) pt").tag($0) }
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
                                DSIconPreview(name: name, weight: weight, size: size)
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

extension DSIconName: Identifiable {
    public var id: String { rawValue }
}

/// One registry entry, drawn the way the registry binds it.
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
                    DSBlock("The weight ladder", note: "Under Bold Text each weight steps to the next (ADR-0021 §3).") {
                        HStack(spacing: tokens.space.step4) {
                            ForEach(DSIconWeight.allCases, id: \.self) { weight in
                                VStack(spacing: tokens.space.step1) {
                                    DSIconPreview(name: name, weight: weight, size: .lg)
                                    DSText(verbatim: weight.rawValue, role: .micro, tone: .tertiary)
                                }
                            }
                        }
                    }
                    DSBlock("The boxes", note: "ref.size.icon: the box each size lays the glyph out in.") {
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
                            DSFactRow("mirrors in RTL", name.mirrorsInRTL ? "yes" : "no")
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
