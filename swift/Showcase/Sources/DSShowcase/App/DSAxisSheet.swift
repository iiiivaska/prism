#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSTokens

/// Every axis, switched through the published API and never through a literal (docs/showcase.md §3).
///
/// Each control has an **auto** position that passes nothing, so the axis follows the OS and the device. What the
/// runtime then resolves is printed at the top of every screen and at the top of this sheet, which is how a
/// control that changes nothing stays visible rather than assumed.
struct DSAxisSheet: View {
    @Bindable var axes: DSShowcaseAxes
    @Environment(\.dismiss) private var dismiss
    private var ds = DSThemeValues()

    init(axes: DSShowcaseAxes) { self.axes = axes }

    var body: some View {
        NavigationStack {
            Form {
                Section("Resolved now") {
                    DSResolvedContextStrip()
                        .modifier(DSAxisScope(axes: axes))
                }

                Section("Brand — DSTheme(brand:), root-only (ADR-0020 §7)") {
                    Picker("Brand", selection: $axes.brand) {
                        ForEach(DSBrand.allCases, id: \.self) { brand in
                            Text(brand.rawValue).tag(brand)
                        }
                    }
                }

                Section("Scoped axes — they nest, exactly as they do on the web") {
                    Picker("Color scheme", selection: $axes.colorScheme) {
                        Text("auto").tag(ColorScheme?.none)
                        Text("light").tag(ColorScheme?.some(.light))
                        Text("dark").tag(ColorScheme?.some(.dark))
                    }
                    Picker("Density", selection: $axes.density) {
                        Text("auto").tag(DSDensity?.none)
                        ForEach(DSDensity.allCases, id: \.self) { density in
                            Text(density.rawValue).tag(DSDensity?.some(density))
                        }
                    }
                }

                Section("Root axis — applied above DSTheme (ADR-0019 §1 item 4)") {
                    Picker("Modality", selection: $axes.modality) {
                        Text("auto").tag(DSModality?.none)
                        ForEach(DSModality.allCases, id: \.self) { modality in
                            Text(modality.rawValue).tag(DSModality?.some(modality))
                        }
                    }
                }

                Section {
                    DSTriStatePicker(title: "Increase Contrast", value: $axes.increasedContrast)
                    DSAxisEffect(measured: contrastEffect, note: DSAxisSheet.contrastNote(colorsets))
                    DSTriStatePicker(title: "Reduce Transparency", value: $axes.reduceTransparency)
                    DSAxisEffect(measured: transparencyEffect, note: nil)
                    DSTriStatePicker(title: "Reduce Motion", value: $axes.reduceMotion)
                    DSAxisEffect(measured: motionEffect, note: nil)
                    DSTriStatePicker(title: "Bold Text", value: $axes.boldText)
                    Picker("Dynamic Type", selection: $axes.dynamicTypeSize) {
                        Text("auto").tag(DynamicTypeSize?.none)
                        ForEach(DSAxisSheet.typeSizes, id: \.self) { size in
                            Text(DSAxisSheet.label(size)).tag(DynamicTypeSize?.some(size))
                        }
                    }
                } header: {
                    Text(verbatim: "Accessibility — .dsAccessibilityPolicy(…)")
                } footer: {
                    Text(verbatim: "Each line under a switch is measured on this build, not claimed: the token set is built twice — once for the context as it resolved and once with that one axis moved — and every entry of DSTokenCatalog is compared through the key path it carries. Bold Text and Dynamic Type are in no token: they reach the screen through SwiftUI's own text rendering, so there is nothing here to count.")
                }

                Section {
                    Button("Everything back to auto") { axes.reset() }
                        .disabled(axes.isAllAuto)
                } footer: {
                    Text(verbatim: "Auto passes nothing: the axis follows the OS and the device through DSTokenContext.platformDefault and the SwiftUI environment.")
                }
            }
            .navigationTitle("Axes")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        #if os(macOS)
        .frame(minWidth: 480, minHeight: 560)
        #endif
    }

    /// Measured from *off* to *on*, whichever way the app is set, so the sentence says what turning the switch on
    /// does rather than what leaving this screen would do.
    private var contrastEffect: DSAxisProbe.Result {
        var standard = ds.context
        standard.contrast = .standard
        return DSAxisProbe.measure(from: standard) { $0.contrast = .increased }
    }

    private var transparencyEffect: DSAxisProbe.Result {
        var standard = ds.context
        standard.transparency = .standard
        return DSAxisProbe.measure(from: standard) { $0.transparency = .reduced }
    }

    private var motionEffect: DSAxisProbe.Result {
        var standard = ds.context
        standard.motion = .standard
        return DSAxisProbe.measure(from: standard) { $0.motion = .reduced }
    }

    private var colorsets: (distinct: Int, total: Int) { DSAxisProbe.contrastingColorsets(ds.brand) }

    /// The one axis whose control would otherwise be read as doing something it cannot. Every Prism colour on
    /// Apple is an asset-catalogue entry, and the OS — not the app — picks which entry of it to paint from the
    /// system's own Increase Contrast setting (ARCHITECTURE §9.8). So this switch moves everything Prism decides
    /// for itself and repaints no swatch, and the app says which is which instead of leaving a reader to find out.
    static func contrastNote(_ colorsets: (distinct: Int, total: Int)) -> String {
        "A Prism colour on Apple is an asset-catalogue colorset the OS resolves, so no app can repaint one: this switch moves Prism's own DSTokenContext.contrast and never a swatch. \(colorsets.distinct) of \(colorsets.total) colorsets do carry a distinct high-contrast entry, and the system setting — Settings ▸ Accessibility ▸ Display ▸ Increase Contrast — is what shows them. Every colour row prints the entry the OS resolved, so a swatch and its value never disagree, and a row whose colorset holds a different high-contrast colour says so and prints it."
    }

    /// The Dynamic Type sizes worth a control: the default, the two largest standard sizes and the accessibility
    /// sizes a spec may clamp or reflow at.
    static let typeSizes: [DynamicTypeSize] = [.xSmall, .large, .xxLarge, .xxxLarge, .accessibility1, .accessibility3, .accessibility5]

    static func label(_ size: DynamicTypeSize) -> String {
        switch size {
        case .xSmall: "xSmall"
        case .small: "small"
        case .medium: "medium"
        case .large: "large (default)"
        case .xLarge: "xLarge"
        case .xxLarge: "xxLarge"
        case .xxxLarge: "xxxLarge"
        case .accessibility1: "accessibility1"
        case .accessibility2: "accessibility2"
        case .accessibility3: "accessibility3"
        case .accessibility4: "accessibility4"
        case .accessibility5: "accessibility5"
        @unknown default: "unknown"
        }
    }
}

/// What an axis was measured to move in this build: never a claim written into the app (`DSAxisProbe`).
struct DSAxisEffect: View {
    let measured: DSAxisProbe.Result
    let note: String?
    private var ds = DSThemeValues()

    init(measured: DSAxisProbe.Result, note: String?) {
        self.measured = measured
        self.note = note
    }

    var body: some View {
        VStack(alignment: .leading, spacing: ds.tokens.space.step1) {
            Text(verbatim: sentence)
                .font(.footnote)
                .foregroundStyle(measured.isInert ? .secondary : .primary)
            if let note {
                Text(verbatim: note)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var sentence: String {
        let tokens = "moves \(measured.moved) of \(measured.compared) tokens"
        let colors = measured.colors == 0 ? "" : " (\(measured.colorsMoved) of \(measured.colors) colours)"
        let glass = measured.forcesGlassFallback ? ", and turns every glass Surface into its opaque fallback" : ""
        return measured.isInert
            ? "Measured here: this axis moves no token and no material in this build."
            : "Measured here: \(tokens)\(colors)\(glass)."
    }
}

/// auto / on / off: nil is the app declining to set the preference at all.
struct DSTriStatePicker: View {
    let title: String
    @Binding var value: Bool?

    var body: some View {
        Picker(title, selection: $value) {
            Text("auto").tag(Bool?.none)
            Text("on").tag(Bool?.some(true))
            Text("off").tag(Bool?.some(false))
        }
    }
}
#endif
