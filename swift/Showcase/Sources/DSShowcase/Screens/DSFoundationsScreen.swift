#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSTokens

/// One screen per token group, in the order the catalogue carries them: the sections are the data's own shape
/// (tier plus first path segment), so a new group appears without an edit here.
struct DSFoundationsScreen: View {
    private var ds = DSThemeValues()

    var body: some View {
        let tokens = ds.tokens
        DSScreen("Foundations") {
            ForEach(DSTokenTier.allCases, id: \.self) { tier in
                DSBlock("\(tier.label) — \(DSTokenCatalog.count(of: tier)) tokens", note: tier.summary) {
                    VStack(spacing: 0) {
                        ForEach(DSTokenCatalog.groups(of: tier)) { group in
                            NavigationLink(value: group) {
                                HStack(alignment: .firstTextBaseline, spacing: tokens.space.step3) {
                                    DSText(verbatim: group.name, role: .bodyMd, tone: .primary)
                                    Spacer(minLength: 0)
                                    DSText(verbatim: "\(group.count)", role: .data, tone: .secondary)
                                }
                                .padding(.vertical, tokens.space.step2)
                                .contentShape(Rectangle())
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

/// Every token of one group, each shown as itself.
struct DSTokenGroupScreen: View {
    let group: DSTokenGroup
    private var ds = DSThemeValues()

    init(group: DSTokenGroup) { self.group = group }

    var body: some View {
        let tokens = ds.tokens
        DSScreen("\(group.tier.rawValue) · \(group.name)") {
            DSGroupIntro(group: group)
            DSColorResolutionNote(group: group)
            DSBlock("\(group.count) tokens", note: group.tier == .ref ? "Primitives have no public Swift API: on Apple they are reachable only through the system token that aliases them. The web reads them as CSS variables." : nil) {
                LazyVStack(alignment: .leading, spacing: tokens.space.step4) {
                    ForEach(group.entries) { entry in
                        DSTokenRow(entry)
                        Divider().overlay(tokens.color.borderHairline)
                    }
                }
            }
        }
    }
}

/// Who resolves a colour here, said once per group that has colours in it.
///
/// A swatch on this screen is painted from `tokens.color.…`, which is `Color(assetName, bundle: .module)`: the
/// scheme and the contrast entry of that colorset are chosen by the OS (ARCHITECTURE §9.8). The scheme is an
/// axis the app *can* set, because SwiftUI's `\.colorScheme` reaches the asset catalogue; the contrast is not,
/// because `\.colorSchemeContrast` is read-only and `dsAccessibilityPolicy(increasedContrast:)` moves Prism's
/// own context instead. Saying so here is the same promise the axis sheet keeps: a control that does nothing is
/// visible rather than assumed.
struct DSColorResolutionNote: View {
    let group: DSTokenGroup
    private var ds = DSThemeValues()

    init(group: DSTokenGroup) { self.group = group }

    var body: some View {
        if colorsets > 0 {
            DSBlock(
                "Who resolves these colours",
                note: "Every swatch below is an asset-catalogue colorset the OS resolves, and every value beside one is the entry it resolved — one reading, never two. The colour scheme follows the axis sheet, because SwiftUI hands it to the catalogue. Increase Contrast does not: the axis sheet moves Prism's own context with it, and only the system setting repaints a colorset. \(contrasting) of the \(colorsets) colorsets on this screen hold a different colour under it, and each of those rows says so and prints it."
            ) {
                EmptyView()
            }
        }
    }

    /// The colour rows of this group, and how many of them would move under the system's Increase Contrast.
    private var colorsets: Int {
        group.entries.reduce(0) { count, entry in
            if case .color(_, let token, _) = entry.value, token != nil { return count + 1 }
            return count
        }
    }

    private var contrasting: Int {
        group.entries.reduce(0) { count, entry in
            guard case .color(_, let token?, _) = entry.value else { return count }
            let appearances = token.appearances(ds.brand)
            let moves = appearances.any != appearances.highContrast || appearances.dark != appearances.darkHighContrast
            return moves ? count + 1 : count
        }
    }
}

/// What some groups are better shown as than as a list of values: real surfaces for materials and elevation,
/// the gradients at size, and the type scale at its real sizes.
struct DSGroupIntro: View {
    let group: DSTokenGroup
    private var ds = DSThemeValues()

    init(group: DSTokenGroup) { self.group = group }

    var body: some View {
        switch (group.tier, group.name) {
        case (.sys, "material"):
            DSBlock("Materials, as Surface publishes them", note: "A material is not a color: Surface resolves it, including the single glass fallback, and publishes it to its descendants. Glass renders only over image, map or vivid (ADR-0022 §1.2).") {
                DSMaterialBoard()
            }
        case (.sys, "elevation"):
            DSBlock("Elevation, on a real surface", note: "The shadow layers below are what Surface draws at each level.") {
                DSElevationBoard()
            }
        case (.sys, "gradient"):
            DSBlock("The vivid gradients, at size", note: "Drawn on the CSS gradient line and interpolated in OKLab, which is what makes them match the web.") {
                DSGradientBoard()
            }
        case (.sys, "motion"):
            DSBlock("Motion, played", note: "Tap a track to run that token: a duration runs the standard ease, an easing draws its own curve and runs it, a spring runs its physics. Switch Reduce Motion in the axis bar and play them again — the token set changes, not the app.") {
                EmptyView()
            }
        case (.sys, "type"):
            DSBlock("The type scale, at its real sizes", note: "Every role in the brand's own face, scaled by the Dynamic Type size the axis bar is set to.") {
                DSTypeScaleBoard()
            }
        default:
            EmptyView()
        }
    }
}

struct DSMaterialBoard: View {
    private var ds = DSThemeValues()

    var body: some View {
        let tokens = ds.tokens
        VStack(alignment: .leading, spacing: tokens.space.step3) {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: tokens.space.step3)], spacing: tokens.space.step3) {
                ForEach([DSSurfaceMaterial.solid, .raised, .nested, .inverse, .vivid, .accent], id: \.self) { material in
                    DSSurfaceView(material: material, radius: .tile) {
                        DSTileLabel(material.rawValue)
                    }
                }
            }
            // The height goes on the example, not on the stage: the stage is fit-content now, and a height on it
            // would leave a band of its own frame the ground does not paint.
            DSExampleStage(.map) {
                HStack(spacing: tokens.space.step3) {
                    DSSurfaceView(material: .glass, radius: .tile, backdrop: .map) {
                        DSTileLabel("glass")
                    }
                    DSSurfaceView(material: .glassLight, radius: .tile, backdrop: .map) {
                        DSTileLabel("glassLight")
                    }
                }
                .frame(height: DSBoardSize.stage - 2 * tokens.space.pageMargin)
            }
            .clipShape(RoundedRectangle(cornerRadius: tokens.radius.card, style: .continuous))
            DSExampleStage(.image) {
                DSSurfaceView(material: .glass, radius: .tile, backdrop: .image) {
                    DSTileLabel("glass over image")
                }
                .frame(height: DSBoardSize.stage - 2 * tokens.space.pageMargin)
            }
            .clipShape(RoundedRectangle(cornerRadius: tokens.radius.card, style: .continuous))
        }
    }
}

enum DSBoardSize {
    /// A stage tall enough for the synthetic map and image to read as grounds.
    static let stage: CGFloat = 180
}

/// A tile's label: one line, never hyphenated across the tile's own padding.
struct DSTileLabel: View {
    let text: String

    init(_ text: String) { self.text = text }

    var body: some View {
        DSText(verbatim: text, role: .labelSm, truncation: .ellipsis, maxLines: 1)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct DSElevationBoard: View {
    private var ds = DSThemeValues()

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: ds.tokens.space.step5)], spacing: ds.tokens.space.step5) {
            ForEach(DSSurfaceElevation.allCases, id: \.self) { level in
                DSSurfaceView(material: .solid, radius: .tile, elevation: level) {
                    DSTileLabel(level.rawValue)
                }
            }
        }
        .padding(.vertical, ds.tokens.space.step4)
    }
}

struct DSGradientBoard: View {
    private var ds = DSThemeValues()

    var body: some View {
        let tokens = ds.tokens
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: tokens.space.step3)], spacing: tokens.space.step3) {
            ForEach(DSVividSlot.allCases, id: \.self) { slot in
                DSSurfaceView(material: .vivid, vivid: slot, radius: .tile) {
                    DSTileLabel(slot.rawValue)
                }
            }
        }
    }
}

struct DSTypeScaleBoard: View {
    private var ds = DSThemeValues()

    var body: some View {
        let tokens = ds.tokens
        VStack(alignment: .leading, spacing: tokens.space.step4) {
            ForEach(DSTextRole.allCases, id: \.self) { role in
                VStack(alignment: .leading, spacing: 0) {
                    DSText(verbatim: role.rawValue, role: .micro, tone: .tertiary)
                    DSText(verbatim: "Ag 86.4", role: role, tone: .primary, truncation: .none, maxLines: 1)
                        .fixedSize(horizontal: true, vertical: false)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}
#endif
