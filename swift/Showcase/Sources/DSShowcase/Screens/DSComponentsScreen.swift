#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSTokens

/// A spec writes `notes.platform.<key>` with the support level as its first word — "`none`. ADR-0010 makes Sidebar a
/// Tier 2 component…", "adapted. Only in regular width…" — because in the spec file the note is read beside the
/// `platforms` block. On a page the level has already been said in the sentence above, so the first word would land
/// as a stray fragment. This strips it and leaves the reason, which is the part the spec is being quoted for.
enum DSPlatformNote {
    private static let levels = ["`full`.", "`adapted`.", "`none`.", "full.", "adapted.", "none."]

    static func withoutLevel(_ note: String) -> String {
        for level in levels where note.hasPrefix(level) {
            return String(note.dropFirst(level.count).drop(while: \.isWhitespace))
        }
        return note
    }
}

extension DSComponentEntry {
    /// The spec's note about the platform this build is running on, without the level it opens with.
    var platformNoteText: String? {
        guard let note = platformNote else { return nil }
        return DSPlatformNote.withoutLevel(note)
    }
}

/// Every spec is a row — implemented or not — so the app can never silently omit one (docs/showcase.md §4).
struct DSComponentsScreen: View {
    let patterns: Bool
    private var ds = DSThemeValues()

    init(patterns: Bool) { self.patterns = patterns }

    var body: some View {
        let tokens = ds.tokens
        let entries = patterns ? DSShowcaseCatalog.patternEntries : DSShowcaseCatalog.componentEntries
        DSScreen(patterns ? "Patterns" : "Components") {
            if patterns {
                DSBlock("Contracts with no implementation", note: "A pattern has no manifest entry and no snapshots (ADR-0012 rule 3). These three say how screens are assembled; nothing implements them on either stack, which is also what the gallery says.") {
                    EmptyView()
                }
            } else {
                DSBlock("\(DSShowcaseCatalog.implementedHere.count) of \(entries.count) implemented on \(DSApplePlatform.current.label)", note: "The state of each row is read from the spec's `platforms` block and from DSComponentsManifest / DSChartsManifest — the same two things the parity report reads.") {
                    EmptyView()
                }
            }
            ForEach(DSShowcaseCatalog.layers, id: \.self) { layer in
                let rows = entries.filter { $0.layer == layer }
                if !rows.isEmpty {
                    DSBlock("\(layer) — \(rows.count)", note: nil) {
                        VStack(spacing: 0) {
                            ForEach(rows) { entry in
                                NavigationLink(value: entry) {
                                    DSComponentRow(entry: entry)
                                }
                                .buttonStyle(.plain)
                                Divider().overlay(tokens.color.borderHairline)
                            }
                        }
                    }
                }
            }
        }
    }
}

struct DSComponentRow: View {
    let entry: DSComponentEntry
    private var ds = DSThemeValues()

    init(entry: DSComponentEntry) { self.entry = entry }

    var body: some View {
        let tokens = ds.tokens
        HStack(alignment: .firstTextBaseline, spacing: tokens.space.step3) {
            DSText(verbatim: entry.name, role: .bodyMd, tone: .primary)
            Spacer(minLength: 0)
            DSStateBadge(state: entry.state, specVersion: entry.specVersion)
        }
        .padding(.vertical, tokens.space.step2)
        .contentShape(Rectangle())
    }
}

/// The four honest states, as one short phrase.
struct DSStateBadge: View {
    let state: DSComponentState
    let specVersion: Int

    var body: some View {
        switch state {
        case .implemented(let version):
            DSText(verbatim: "implemented · v\(version)", role: .micro, tone: .success)
        case .behind(let version):
            DSText(verbatim: "v\(version) of spec v\(specVersion)", role: .micro, tone: .warning)
        case .specified:
            DSText(verbatim: "specified, not implemented", role: .micro, tone: .secondary)
        case .notOnThisPlatform:
            DSText(verbatim: "not on this platform", role: .micro, tone: .tertiary)
        }
    }
}

/// One component: what it is, what this build implements of it, and its examples staged from the spec's props.
struct DSComponentScreen: View {
    let entry: DSComponentEntry
    private var ds = DSThemeValues()

    init(entry: DSComponentEntry) { self.entry = entry }

    var body: some View {
        let tokens = ds.tokens
        DSScreen(entry.name) {
            DSBlock(entry.name, note: entry.summary) {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    DSFactRow("layer", entry.layer)
                    DSFactRow("spec version", "v\(entry.specVersion)")
                    if let since = entry.since {
                        DSFactRow("since", since)
                    }
                    DSFactRow("state here", stateText)
                    if let note = entry.platformNoteText {
                        DSText(verbatim: note, role: .caption, tone: .secondary)
                    }
                }
            }

            DSBlock(
                "Support",
                note: "What the spec promises per platform (ADR-0010), and the version each platform implements. This app reads the Swift manifests only — DSComponentsManifest and DSChartsManifest — so a web row has no version here to read; the web showcase reads the two web manifests and prints it there."
            ) {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    ForEach(DSComponentScreen.platformOrder, id: \.self) { key in
                        if let support = entry.platforms[key] {
                            DSFactRow(key, supportText(key: key, support: support))
                        }
                    }
                }
            }

            DSBlock("Links", note: nil) {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    if let url = DSShowcaseCatalog.link(entry.specPath) {
                        Link(entry.specPath, destination: url)
                    }
                    if let url = DSShowcaseCatalog.link("tools/parity/report.md") {
                        Link("tools/parity/report.md", destination: url)
                    }
                    if let url = DSShowcaseCatalog.galleryLink {
                        Link("gallery/README.md — the paired snapshots, and how to open them", destination: url)
                    }
                    DSText(
                        verbatim: "\(DSShowcaseCatalog.galleryAnchor(entry.name)) in a checkout, or in the gallery artifact of a green CI run",
                        role: .micro,
                        tone: .tertiary
                    )
                }
                .font(.footnote)
            }

            examples
        }
    }

    @ViewBuilder
    private var examples: some View {
        let tokens = ds.tokens
        if entry.state.isImplemented {
            DSBlock("Examples — \(entry.examples.count)", note: "Staged from the spec's own `examples[]` props, on the ground the example declares.") {
                VStack(alignment: .leading, spacing: tokens.space.sectionGap) {
                    ForEach(entry.examples) { example in
                        DSExampleBlock(component: entry.name, example: example)
                    }
                }
            }
        } else if case .notOnThisPlatform = entry.state {
            DSBlock("Not on this platform, by design", note: entry.platformNoteText ?? "The spec declares `none` for \(DSApplePlatform.current.key); nothing is missing.") {
                EmptyView()
            }
        } else {
            DSBlock("Specified, not implemented here yet", note: "The spec is the contract; nothing on this platform implements it. These are the example ids it will have.") {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    ForEach(entry.examples) { example in
                        VStack(alignment: .leading, spacing: tokens.space.step1) {
                            DSText(verbatim: example.id, role: .labelSm, tone: .primary)
                            DSText(verbatim: example.props.map { "\($0.key): \($0.value.display)" }.joined(separator: " · "), role: .micro, tone: .secondary)
                        }
                    }
                }
            }
        }
    }

    private var stateText: String {
        switch entry.state {
        case .implemented(let version): "implemented at v\(version), the spec's own version"
        case .behind(let version): "implements v\(version) of spec v\(entry.specVersion) — the parity report's LAG"
        case .specified(let support): "specified as \(support.label), not implemented here yet"
        case .notOnThisPlatform: "not on this platform, by design"
        }
    }

    /// Two kinds of blank are not the same blank, so neither is written as a mark. A `none` row has no version
    /// question at all — nothing is promised, so nothing is missing (ADR-0006 rule 3); an Apple row with no entry is
    /// not implemented; a web row is a version this app never read, because it reads the Swift manifests only.
    private func supportText(key: String, support: DSSupport) -> String {
        if support == DSSupport.none { return support.label }
        if let version = entry.implemented[key] { return "\(support.label) · implements v\(version)" }
        return DSComponentScreen.applePlatforms.contains(key)
            ? "\(support.label) · not implemented"
            : "\(support.label) · version not read on this stack"
    }

    static let platformOrder = ["ios", "ipados", "macos", "watchos", "web-touch", "web-desktop"]
    /// The keys the Swift manifests declare (`tools/parity/config.ts`); every other key belongs to the web stack.
    static let applePlatforms = Set(DSApplePlatform.allCases.map(\.key))
}

/// One example of one component: what a page links to, and what `-DSShowcaseExample Card/solid-metric` opens.
struct DSExampleRef: Hashable {
    let component: String
    let example: DSSpecExample
}

/// One example on a page of its own — the same staging, with room for it, and everything the spec says about it.
struct DSExampleScreen: View {
    let ref: DSExampleRef
    private var ds = DSThemeValues()

    init(ref: DSExampleRef) { self.ref = ref }

    var body: some View {
        let tokens = ds.tokens
        DSScreen("\(ref.component) · \(ref.example.id)") {
            DSBlock(ref.example.id, note: ref.example.summary) {
                DSExampleView(component: ref.component, example: ref.example)
                    .clipShape(RoundedRectangle(cornerRadius: tokens.radius.card, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: tokens.radius.card, style: .continuous)
                            .strokeBorder(tokens.color.borderHairline, lineWidth: tokens.border.hairline)
                    )
            }
            DSBlock("Props, as the spec writes them", note: nil) {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    ForEach(ref.example.props, id: \.key) { pair in
                        DSFactRow(pair.key, pair.value.display)
                    }
                    if let surface = ref.example.surface {
                        DSFactRow("surface", surface)
                    }
                    if let backdrop = ref.example.backdrop {
                        DSFactRow("backdrop", backdrop)
                    }
                    DSFactRow("schemes", ref.example.schemes.joined(separator: ", "))
                }
            }
        }
    }
}

/// One example: the staged view, its id, its props and whatever the spec says about it.
struct DSExampleBlock: View {
    let component: String
    let example: DSSpecExample
    private var ds = DSThemeValues()

    init(component: String, example: DSSpecExample) {
        self.component = component
        self.example = example
    }

    var body: some View {
        let tokens = ds.tokens
        VStack(alignment: .leading, spacing: tokens.space.step2) {
            NavigationLink(value: DSExampleRef(component: component, example: example)) {
                HStack(alignment: .firstTextBaseline, spacing: tokens.space.step3) {
                    DSText(verbatim: example.id, role: .labelMd, tone: .accent)
                    if example.schemes.count == 1, let only = example.schemes.first {
                        DSText(verbatim: "\(only) only", role: .micro, tone: .tertiary)
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            DSExampleView(component: component, example: example)
                .clipShape(RoundedRectangle(cornerRadius: tokens.radius.card, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: tokens.radius.card, style: .continuous)
                        .strokeBorder(tokens.color.borderHairline, lineWidth: tokens.border.hairline)
                )
            DSText(
                verbatim: example.props.map { "\($0.key): \($0.value.display)" }.joined(separator: " · "),
                role: .micro,
                tone: .secondary
            )
            if let summary = example.summary {
                DSText(verbatim: summary, role: .caption, tone: .secondary)
            }
        }
    }
}
#endif
