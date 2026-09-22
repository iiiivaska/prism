#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSIcons
import DSTokens

/// What Prism has today, in one screen: the brand and version the scene is running, the counts the catalogues
/// carry, and a few live components so the screen is the system rather than a picture of it.
///
/// Nothing on this screen is written down — not the numbers, not the sentence over the live strip, and not the
/// components in it. The strip stages each implemented component's first spec example through the same renderer
/// the Components pages use, so a component that lands in the manifest joins the sentence and the strip together
/// and one that leaves takes both with it. A hand-written demo would be the one thing here that needs an edit
/// when a component lands, which is exactly what the block underneath promises the app never needs.
struct DSOverviewScreen: View {
    let axes: DSShowcaseAxes
    private var ds = DSThemeValues()

    init(axes: DSShowcaseAxes) { self.axes = axes }

    var body: some View {
        let tokens = ds.tokens
        let live = DSShowcaseCatalog.implementedHere
        let specified = DSShowcaseCatalog.componentEntries.count
        DSScreen("Overview") {
            DSBlock("The system", note: "Every number on this screen is counted from the generated catalogues, never written here.") {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    DSFactRow("brand", "\(ds.brand.rawValue) · \(ds.brand.preset.rawValue) font preset")
                    DSFactRow("version", DSTokenCatalog.version)
                    DSFactRow("running as", DSApplePlatform.current.label)
                    DSFactRow("tokens", "\(DSTokenCatalog.entries.count) — \(DSTokenCatalog.count(of: .sys)) system, \(DSTokenCatalog.count(of: .comp)) component, \(DSTokenCatalog.count(of: .ref)) primitive")
                    DSFactRow("components", "\(live.count) implemented here of \(specified) specified")
                    DSFactRow("patterns", "\(DSShowcaseCatalog.patternEntries.count) specified, none implemented")
                    DSFactRow("icons", "\(DSIconName.allCases.count) in the registry, at registry version \(DSIconName.registryVersion)")
                }
            }

            DSBlock("Live, not a picture", note: DSOverviewScreen.liveNote(live)) {
                liveStrip(live)
            }

            DSBlock("What this app is", note: nil) {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    DSText(
                        verbatim: "The showcase reads three generated catalogues and nothing else: every token of the published token manifest, every spec of spec/components and spec/patterns, and the version each Apple platform implements. It holds no list of its own, so a token or a component that lands appears here without an edit to any screen.",
                        role: .bodySm,
                        tone: .secondary
                    )
                    DSText(
                        verbatim: "The frame around it — the sidebar, the toolbar, this list — is plain SwiftUI. Sidebar, TabBar and AdaptiveShell are specified and unimplemented, so the app cannot yet be built out of Prism. The About screen says what that means.",
                        role: .bodySm,
                        tone: .secondary
                    )
                }
            }
        }
    }

    /// One example per implemented component, staged the way its own page stages it, and laid out as a strip: as
    /// many across as the window gives room for, one under the next on a phone. An entry with no example in the
    /// spec contributes nothing rather than a placeholder; `DSExampleView` says so itself when a renderer is
    /// missing, so neither blank is invented here.
    @ViewBuilder
    private func liveStrip(_ entries: [DSComponentEntry]) -> some View {
        let tokens = ds.tokens
        if entries.isEmpty {
            EmptyView()
        } else {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: DSOverviewScreen.stripColumn), spacing: tokens.space.cardGap, alignment: .topLeading)],
                alignment: .leading,
                spacing: tokens.space.cardGap
            ) {
                ForEach(entries) { entry in
                    if let example = entry.examples.first {
                        VStack(alignment: .leading, spacing: tokens.space.step2) {
                            DSText(verbatim: "\(entry.name) · \(example.id)", role: .labelSm, tone: .secondary)
                            DSExampleView(component: entry.name, example: example)
                                .clipShape(RoundedRectangle(cornerRadius: tokens.radius.card, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: tokens.radius.card, style: .continuous)
                                        .strokeBorder(tokens.color.borderHairline, lineWidth: tokens.border.hairline)
                                )
                        }
                    }
                }
            }
        }
    }

    /// Wide enough for a staged example with its page margins on both sides, narrow enough that a Mac window shows
    /// the whole strip at once and a phone shows one column.
    static let stripColumn: CGFloat = 240

    /// The sentence over the strip, counted from the catalogue like every other line on this screen.
    static func liveNote(_ entries: [DSComponentEntry]) -> String {
        let platform = DSApplePlatform.current.label
        guard !entries.isEmpty else {
            return "Nothing implements a component spec on \(platform) in this build, so there is nothing live to draw. Every spec is still a row in Components."
        }
        let names = DSOverviewScreen.sentenceList(entries.map(\.name))
        if entries.count == 1 {
            return "\(names) is the one component this build implements on \(platform). It is staged from its first spec example by the renderer its own page uses, and both the name and the example come from the generated catalogues."
        }
        return "\(names) are the \(entries.count) components this build implements on \(platform). Each is staged from its first spec example by the renderer its own page uses, and both the list and the examples come from the generated catalogues."
    }

    /// "Surface, Text and Button" — a list as a sentence reads it.
    static func sentenceList(_ names: [String]) -> String {
        guard let last = names.last else { return "" }
        if names.count == 1 { return last }
        return names.dropLast().joined(separator: ", ") + " and " + last
    }
}
#endif
