#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSTokens

/// Does an axis actually change anything in this build? (docs/showcase.md §3: *a control that does nothing is
/// visible rather than assumed*.)
///
/// The axis sheet switches every axis through the published API and prints what the runtime resolved, and that is
/// not enough on Apple, because **resolving is not painting**. A Prism colour is an asset-catalogue entry
/// (`Color(assetName, bundle: .module)`, ARCHITECTURE §9.8) and the OS — not the app — picks which entry of it to
/// paint from the scheme and from the system's own Increase Contrast setting. So an app-level
/// `.dsAccessibilityPolicy(increasedContrast:)` moves Prism's `DSTokenContext.contrast`, and with it everything
/// Prism decides itself, while every swatch on the screen stays exactly where it was.
///
/// The web showcase answers the same question by measurement rather than by claim (`src/axis-probe.ts`: *"no
/// token moves; 12 of 28 examples still change"*), so this one measures too, in the terms the platform has:
///
///  - **Tokens.** Build the token set for the resolved context and for the same context with one axis moved, and
///    compare every entry of `DSTokenCatalog` through the key path it carries. Two catalogue colours compare
///    equal whenever they name the same asset, which is exactly the point: that is a colour the app did not
///    repaint.
///  - **Colorsets.** How many of the 102 colorsets carry a *distinct* high-contrast entry, from
///    `DSColorToken.appearances(_:)` — the literals behind the asset. That is what the OS switch would show, and
///    what no app-level switch can.
///  - **Materials.** Whether the axis forces the glass fallback (ADR-0022 §1.2), asked of `DSSurface.resolve`
///    itself rather than assumed from the rule, because that decision reads Prism's context and so does answer to
///    the app's own switch.
///
/// It is not a claim about pixels — whether a moved token is *visible* is what the gallery and the VRT suite
/// answer. It is three counts, measured on the build the reader is holding.
@MainActor
enum DSAxisProbe {
    /// What one axis was measured to move.
    struct Result: Equatable {
        /// Tokens whose value differs between the two contexts, and how many were compared.
        let moved: Int
        let compared: Int
        /// The same, over the colour tokens alone.
        let colorsMoved: Int
        let colors: Int
        /// True when the axis turns a glass Surface into its opaque fallback.
        let forcesGlassFallback: Bool

        var isInert: Bool { moved == 0 && !forcesGlassFallback }
    }

    /// The axis moved by hand: the context as the app resolved it, and the same context with one field changed.
    static func measure(from context: DSTokenContext, _ change: (inout DSTokenContext) -> Void) -> Result {
        var other = context
        change(&other)
        let before = DSTokenStore.tokens(for: context)
        let after = DSTokenStore.tokens(for: other)

        var moved = 0
        var compared = 0
        var colorsMoved = 0
        var colors = 0
        for entry in DSTokenCatalog.entries {
            guard let differs = difference(entry.value, before, after) else { continue }
            compared += 1
            if case .color = entry.value {
                colors += 1
                if differs { colorsMoved += 1 }
            }
            if differs { moved += 1 }
        }

        let glass = DSSurface.resolve(material: .glass, backdrop: .map, tokens: after).isGlassFallback
            && !DSSurface.resolve(material: .glass, backdrop: .map, tokens: before).isGlassFallback
        return Result(moved: moved, compared: compared, colorsMoved: colorsMoved, colors: colors, forcesGlassFallback: glass)
    }

    /// Whether one token's value differs between two sets; nil for a token this platform cannot read at all,
    /// which is counted as neither moved nor compared.
    private static func difference(_ value: DSTokenValue, _ a: DSTokenSet, _ b: DSTokenSet) -> Bool? {
        switch value {
        case .dimension(let path): a[keyPath: path] != b[keyPath: path]
        case .number(let path): a[keyPath: path] != b[keyPath: path]
        case .duration(let path): a[keyPath: path] != b[keyPath: path]
        case .flag(let path): a[keyPath: path] != b[keyPath: path]
        case .color(let path, _, _): a[keyPath: path] != b[keyPath: path]
        case .typography(let path): a.typography[keyPath: path] != b.typography[keyPath: path]
        case .shadow(let path): a[keyPath: path] != b[keyPath: path]
        case .gradient(let path): a[keyPath: path] != b[keyPath: path]
        case .spring(let path): a[keyPath: path] != b[keyPath: path]
        case .easing(let path): a[keyPath: path] != b[keyPath: path]
        case .stroke(let path): a[keyPath: path] != b[keyPath: path]
        case .fontFace, .unavailable: nil
        }
    }

    /// The colorsets whose high-contrast entry is a different colour from the standard one, and how many there
    /// are in all. These are the ones the OS setting would move, and the app cannot.
    static func contrastingColorsets(_ brand: DSBrand) -> (distinct: Int, total: Int) {
        var distinct = 0
        for token in DSColorToken.allCases {
            let appearances = token.appearances(brand)
            if appearances.any != appearances.highContrast || appearances.dark != appearances.darkHighContrast {
                distinct += 1
            }
        }
        return (distinct, DSColorToken.allCases.count)
    }
}
#endif
