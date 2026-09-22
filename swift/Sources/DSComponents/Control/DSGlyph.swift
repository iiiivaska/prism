import Foundation
import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// A registry glyph inside a control: the icon part of Button and the glyphs Card draws (its icon ring, the open
/// affordance and its solid action circle).
///
/// It is not `Icon.yaml`, which no stack implements yet (the public view will be `DSIcon`, ADR-0019 §6); it is the
/// least a control needs from it, drawn the way Icon.yaml says a control glyph is drawn:
///  - the glyph is named by registry id, and the registry decides between the SF Symbol and the generated Phosphor
///    image set (ADR-0013 decision 3);
///  - it is laid out in a square `size.icon.*` box and fitted, centred, into the SF point size measured to fill that
///    box (`DSIconSize.pointSize`); the box never changes with density;
///  - it sets no colour (Icon's `tone: inherit`): the control's foreground is the glyph's, the way a glyph in a Button
///    follows its label;
///  - it is decorative: the control carries the name, so the glyph is hidden from assistive technologies;
///  - a mirrored glyph flips in a right-to-left layout where the system does not already (`mirrorsInRTL`).
///
/// **Known gap.** Icon.yaml's weight ladder (`icon.weight` and the Bold Text step) needs a symbol font of a chosen
/// weight, and only DSCore may build a font (ADR-0021 §12, `lint:literals` kind `typography`). The glyph therefore
/// renders the symbol's regular cut, which is what `icon.weight` (400) names, and does not step under Bold Text. The
/// weight belongs to DSIcon, through a DSCore route.
struct DSGlyph: View {
    let name: DSIconName
    let box: CGFloat

    init(_ name: DSIconName, box: CGFloat) {
        self.name = name
        self.box = box
    }

    var body: some View {
        let side = DSGlyphGeometry.drawnSide(box: box)
        image
            .flipsForRightToLeftLayoutDirection(name.mirrorsInRTL)
            .frame(width: side, height: side)
            .frame(width: box, height: box)
            .accessibilityHidden(true)
    }

    @ViewBuilder
    private var image: some View {
        if let symbol = name.symbol {
            Image(systemName: symbol)
                .resizable()
                .scaledToFit()
        } else if let asset = name.asset, let bundle = DSIconBundle.bundle {
            Image("\(asset).\(DSGlyphGeometry.weight.phosphorCut)", bundle: bundle)
                .renderingMode(.template)
                .resizable()
                .scaledToFit()
        }
    }
}

/// The glyph's box arithmetic, on the host.
nonisolated enum DSGlyphGeometry {
    /// The cut a control glyph renders: `icon.weight` is 400, the registry's `regular` (see `DSGlyph`'s known gap).
    static let weight: DSIconWeight = .regular

    /// The side the glyph is fitted into: the SF point size measured to fill a `size.icon.*` box, or the box itself for
    /// a box the registry does not measure.
    static func drawnSide(box: CGFloat) -> CGFloat {
        DSIconSize.allCases.first { $0.box == box }?.pointSize ?? box
    }
}

/// The resource bundle of `DSIcons`, which holds the generated Phosphor image sets.
///
/// SwiftPM gives each target a `Bundle.module` of its own, internal to that target, and `DSIcons` does not publish
/// its bundle, so a glyph in another target looks the bundle up where SwiftPM places it: `Prism_DSIcons.bundle` beside
/// the main executable's resources or inside the bundle that loaded this code. The registry generator (tools/icons)
/// can make this unnecessary by publishing the image from `DSIcons`.
nonisolated enum DSIconBundle {
    static let name = "Prism_DSIcons.bundle"

    static let bundle: Bundle? = {
        let hosts = [Bundle.main, Bundle(for: DSIconBundleMarker.self)]
        let roots: [URL?] = hosts.flatMap { host -> [URL?] in
            [host.resourceURL, host.bundleURL, host.bundleURL.deletingLastPathComponent()]
        }
        for root in roots.compactMap({ $0 }) {
            if let bundle = Bundle(url: root.appendingPathComponent(name)) { return bundle }
        }
        return nil
    }()
}

private final class DSIconBundleMarker {}

/// Icon.yaml's `tokens.root.color` for the two tones Card's parts need where Card binds no cell of its own: the icon
/// ring's glyph (`primary`) and the open affordance on a material Card leaves to Icon (`secondary`). Keyed by the
/// published material and, on the scheme's glass, by the backdrop kind.
nonisolated enum DSGlyphTone {
    case primary, secondary

    func color(on surface: DSSurfaceContext) -> KeyPath<DSTokenSet, Color> {
        switch surface.material {
        case .page, .solid, .raised, .nested:
            self == .primary ? \.color.iconPrimary : \.color.iconSecondary
        case .vivid:
            \.color.textOnVivid
        case .inverse:
            \.color.textOnInverse
        case .accent:
            self == .primary ? \.color.textOnAccent : \.color.textOnAccentSecondary
        case .glassLight:
            \.color.textOnGlassLight
        case .glass:
            switch (self, surface.backdrop) {
            case (.primary, _): \.color.textOnGlassFill
            case (.secondary, .map): \.color.textOnGlassFillSecondary
            case (.secondary, _): \.color.textOnGlassFillMediaSecondary
            }
        }
    }
}
