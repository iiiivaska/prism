import Foundation
import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0042: the ring each ground takes, the band over an image, the reach of the macOS system colour, and the
/// contrast guard of §3.3, computed from the generated literals of every brand and every catalog appearance — Any,
/// Dark, High Contrast, Dark + High Contrast and the watch.
///
/// The table below is written out from the ADR, not read from `DSInteraction`, so a change to either is a visible
/// disagreement. The web's twin is `web/packages/react/test/focus.test.tsx`, over `focusRingOn` and
/// `focusRingUnderlay`.
@Suite("The interaction layers follow the ground (ADR-0042)")
struct DSInteractionTests {
    /// Every context a Surface, a backdrop or a chip can publish: nine materials over four backdrop kinds.
    static let grounds: [DSSurfaceContext] = DSSurfaceMaterial.allCases.flatMap { material in
        DSBackdropKind.allCases.map { DSSurfaceContext(material: material, backdrop: $0) }
    }

    // MARK: - The table (§1.1, §1.2)

    /// ADR-0042 §1.1's table, and §1.2: on a chip's own paint the media rows give way to `color.border.focus`.
    private static func expectedRing(on ground: DSSurfaceContext, onChipPaint: Bool) -> DSColorToken {
        switch ground.material {
        case .inverse: return .borderFocusOnInverse
        case .accent: return .borderFocusOnAccent
        case .vivid where !onChipPaint: return .borderFocusOnMedia
        case .page where ground.backdrop == .vivid && !onChipPaint: return .borderFocusOnMedia
        default: return .borderFocus
        }
    }

    @Test func everyGroundTakesTheRingOfTheTable() {
        for ground in Self.grounds {
            for onChipPaint in [false, true] {
                #expect(
                    DSInteraction.focusRing(on: ground, onChipPaint: onChipPaint) == Self.expectedRing(on: ground, onChipPaint: onChipPaint),
                    "\(ground.material) over \(ground.backdrop), on a chip's paint: \(onChipPaint)"
                )
            }
        }
    }

    /// §1.3: the band is `color.bg.page`, only on the page over an image and never on a chip's own paint, and the ring
    /// on it is the page family's.
    @Test func theBandIsDrawnOnlyOverAnImageOutsideAChip() {
        for ground in Self.grounds {
            for onChipPaint in [false, true] {
                let expected: DSColorToken? = ground.material == .page && ground.backdrop == .image && !onChipPaint ? .bgPage : nil
                #expect(
                    DSInteraction.focusRingUnderlay(on: ground, onChipPaint: onChipPaint) == expected,
                    "\(ground.material) over \(ground.backdrop), on a chip's paint: \(onChipPaint)"
                )
            }
        }
        #expect(DSInteraction.focusRing(on: DSSurfaceContext(material: .page, backdrop: .image), onChipPaint: false) == .borderFocus)
    }

    /// §1.5: under Increase Contrast on macOS the system colour reaches the page over nothing and the solid ladder, and
    /// no other ground.
    @Test func theSystemFocusColourReachesThePageFamilyOnly() {
        for ground in Self.grounds {
            let pageFamily = (ground.material == .page && ground.backdrop == .none)
                || [DSSurfaceMaterial.solid, .raised, .nested].contains(ground.material)
            #expect(DSInteraction.takesSystemFocusColor(on: ground) == pageFamily, "\(ground.material) over \(ground.backdrop)")
        }
    }

    /// §1.1: the three new rings alias the material's primary foreground, in every appearance of every brand.
    @Test func theMaterialRingsAreTheMaterialsForegrounds() {
        for brand in DSBrand.allCases {
            #expect(DSColorToken.borderFocusOnInverse.appearances(brand) == DSColorToken.textOnInverse.appearances(brand), "\(brand)")
            #expect(DSColorToken.borderFocusOnAccent.appearances(brand) == DSColorToken.textOnAccent.appearances(brand), "\(brand)")
            #expect(DSColorToken.borderFocusOnMedia.appearances(brand) == DSColorToken.textOnVivid.appearances(brand), "\(brand)")
        }
    }

    // MARK: - The contrast guard (§3.3)

    /// §3.3 and ADR-0011's 3:1: the ring each ground takes against the ground's own colour — the page, the solid
    /// ladder over the page it paints, the inverse fill, the lit tile, and every stop of every vivid gradient, on vivid
    /// and on the page over vivid. The glasses and the map grounds are translucent over media and checked with their
    /// backdrop sets by `tools/contrast` (`tokens/contrast-pairs.json`).
    @Test func everyRingHoldsThreeToOneOnItsGround() {
        for brand in DSBrand.allCases {
            for appearance in DSCatalogAppearance.allCases {
                let grounds: [(DSSurfaceContext, [DSOpaqueColor])] = [
                    (DSSurfaceContext(material: .page, backdrop: .none), Self.fill(.page, brand, appearance)),
                    (DSSurfaceContext(material: .solid, backdrop: .none), Self.fill(.solid, brand, appearance)),
                    (DSSurfaceContext(material: .raised, backdrop: .none), Self.fill(.raised, brand, appearance)),
                    (DSSurfaceContext(material: .nested, backdrop: .none), Self.fill(.nested, brand, appearance)),
                    (DSSurfaceContext(material: .inverse, backdrop: .none), Self.fill(.inverse, brand, appearance)),
                    (DSSurfaceContext(material: .accent, backdrop: .none), Self.fill(.accent, brand, appearance)),
                    (DSSurfaceContext(material: .vivid, backdrop: .none), Self.fill(.vivid, brand, appearance)),
                    (DSSurfaceContext(material: .page, backdrop: .vivid), Self.fill(.vivid, brand, appearance)),
                ]
                for (ground, fills) in grounds {
                    let ring = DSOpaqueColor(appearance.value(DSInteraction.focusRing(on: ground, onChipPaint: false), brand))
                    #expect(!fills.isEmpty)
                    for fill in fills {
                        let ratio = ring.contrast(with: fill)
                        #expect(ratio >= 3, "\(brand), \(appearance): the ring on \(ground.material) over \(ground.backdrop) is \(ratio):1")
                    }
                }
            }
        }
    }

    /// §1.3: over an image the ring and its band are at least 9:1 apart, so for any colour one of the two holds at least
    /// √9 = 3:1 against it: `max(ratio(A, M), ratio(B, M)) ≥ √ratio(A, B)`.
    @Test func theRingAndItsBandAreNineToOneApart() throws {
        let ground = DSSurfaceContext(material: .page, backdrop: .image)
        let band = try #require(DSInteraction.focusRingUnderlay(on: ground, onChipPaint: false))
        for brand in DSBrand.allCases {
            for appearance in DSCatalogAppearance.allCases {
                let ring = DSOpaqueColor(appearance.value(DSInteraction.focusRing(on: ground, onChipPaint: false), brand))
                let ratio = ring.contrast(with: DSOpaqueColor(appearance.value(band, brand)))
                #expect(ratio >= 9, "\(brand), \(appearance): the ring and its band are \(ratio):1 apart")
            }
        }
    }

    /// §2 and §3.3: every wash moves its ground by a luminance ratio of at least 1.1 — the neutral wash on the page and
    /// the solid ladder, and each material's own on inverse and on the lit tile — where the neutral wash on inverse is
    /// the fill's own colour and moves it by nothing.
    @Test func everyWashShowsOnItsGround() {
        let washes: [(DSColorToken, DSSurfaceMaterial)] = [
            (.bgFillNeutralSubtle, .page), (.bgFillNeutralSubtle, .solid), (.bgFillNeutralSubtle, .raised),
            (.bgFillNeutralSubtle, .nested), (.bgFillOnInverseSubtle, .inverse), (.bgFillOnAccentSubtle, .accent),
        ]
        for brand in DSBrand.allCases {
            for appearance in DSCatalogAppearance.allCases {
                for (wash, material) in washes {
                    for ground in Self.fill(material, brand, appearance) {
                        let washed = ground.under(appearance.value(wash, brand))
                        let ratio = washed.contrast(with: ground)
                        #expect(ratio >= 1.1, "\(brand), \(appearance): \(wash) on \(material) moves it by \(ratio)")
                    }
                }
                // What ADR-0040 §4 recorded, and why the inverse wash exists: the neutral wash is the fill's own colour.
                let inverse = Self.fill(.inverse, brand, appearance)[0]
                #expect(inverse.under(appearance.value(.bgFillNeutralSubtle, brand)).contrast(with: inverse) < 1.01, "\(brand), \(appearance)")
            }
        }
    }

    /// The opaque colours of a ground: the page; the solid ladder's fill over the page it paints under itself (ADR-0030
    /// §5.1); the inverse fill; the lit tile; and on vivid every stop of the scheme's five gradients.
    private static func fill(_ material: DSSurfaceMaterial, _ brand: DSBrand, _ appearance: DSCatalogAppearance) -> [DSOpaqueColor] {
        let page = DSOpaqueColor(appearance.value(.bgPage, brand))
        switch material {
        case .page: return [page]
        case .solid: return [page.under(appearance.value(.bgSurface, brand))]
        case .raised: return [page.under(appearance.value(.bgSurfaceRaised, brand))]
        case .nested: return [page.under(appearance.value(.bgSurfaceNested, brand))]
        case .inverse: return [page.under(appearance.value(.bgFillInverse, brand))]
        case .accent: return [page.under(appearance.value(.bgFillAccent, brand))]
        case .vivid:
            let gradient = DSTokenSet(DSTokenContext(brand: brand, colorScheme: appearance.colorScheme)).gradient
            return [gradient.vividDefault, gradient.vivid1, gradient.vivid2, gradient.vivid3, gradient.vivid4]
                .flatMap(\.stops)
                .map { DSOpaqueColor($0.color) }
        case .glass, .glassLight:
            return []
        }
    }
}

/// The entries of a colorset (`DSColorAppearances`), each the context it is drawn in.
nonisolated private enum DSCatalogAppearance: CaseIterable, CustomStringConvertible {
    case light, dark, lightIncreasedContrast, darkIncreasedContrast, watch

    var colorScheme: DSColorScheme {
        switch self {
        case .light, .lightIncreasedContrast: .light
        case .dark, .darkIncreasedContrast, .watch: .dark
        }
    }

    func value(_ token: DSColorToken, _ brand: DSBrand) -> DSRGBA {
        let appearances = token.appearances(brand)
        switch self {
        case .light: return appearances.any
        case .dark: return appearances.dark
        case .lightIncreasedContrast: return appearances.highContrast
        case .darkIncreasedContrast: return appearances.darkHighContrast
        case .watch: return appearances.watch
        }
    }

    var description: String {
        switch self {
        case .light: "light"
        case .dark: "dark"
        case .lightIncreasedContrast: "light under Increase Contrast"
        case .darkIncreasedContrast: "dark under Increase Contrast"
        case .watch: "the watch"
        }
    }
}

/// An opaque colour in gamma-encoded extended sRGB, as `tools/contrast` measures: a Display P3 literal is converted to
/// sRGB, a translucent one is composited over what lies under it in gamma-encoded sRGB, as the web composites, and
/// the ratio is WCAG 2's, from the relative luminance.
nonisolated private struct DSOpaqueColor {
    let red: Double
    let green: Double
    let blue: Double

    /// An opaque literal; a translucent one goes through `under(_:)`.
    init(_ literal: DSRGBA) {
        let rgb = Self.sRGB(literal)
        red = rgb.0
        green = rgb.1
        blue = rgb.2
    }

    private init(red: Double, green: Double, blue: Double) {
        self.red = red
        self.green = green
        self.blue = blue
    }

    /// `top` composited over this colour.
    func under(_ top: DSRGBA) -> DSOpaqueColor {
        let rgb = Self.sRGB(top)
        let alpha = top.alpha
        return DSOpaqueColor(
            red: alpha * rgb.0 + (1 - alpha) * red,
            green: alpha * rgb.1 + (1 - alpha) * green,
            blue: alpha * rgb.2 + (1 - alpha) * blue
        )
    }

    var luminance: Double {
        0.2126 * Self.linear(red) + 0.7152 * Self.linear(green) + 0.0722 * Self.linear(blue)
    }

    func contrast(with other: DSOpaqueColor) -> Double {
        let (a, b) = (luminance, other.luminance)
        return (max(a, b) + 0.05) / (min(a, b) + 0.05)
    }

    /// The literal's channels in gamma-encoded sRGB: Display P3 goes through linear light and the D65 matrix.
    private static func sRGB(_ literal: DSRGBA) -> (Double, Double, Double) {
        switch literal.space {
        case .sRGB:
            return (literal.red, literal.green, literal.blue)
        case .displayP3:
            let (r, g, b) = (linear(literal.red), linear(literal.green), linear(literal.blue))
            return (
                encoded(1.2249401 * r - 0.2249404 * g),
                encoded(-0.0420569 * r + 1.0420571 * g),
                encoded(-0.0196376 * r - 0.0786361 * g + 1.0982735 * b)
            )
        }
    }

    /// The sRGB transfer function, which Display P3 shares, extended to negative values by symmetry.
    private static func linear(_ value: Double) -> Double {
        let magnitude = abs(value)
        let light = magnitude <= 0.04045 ? magnitude / 12.92 : pow((magnitude + 0.055) / 1.055, 2.4)
        return value < 0 ? -light : light
    }

    private static func encoded(_ value: Double) -> Double {
        let magnitude = abs(value)
        let code = magnitude <= 0.0031308 ? magnitude * 12.92 : 1.055 * pow(magnitude, 1 / 2.4) - 0.055
        return value < 0 ? -code : code
    }
}
