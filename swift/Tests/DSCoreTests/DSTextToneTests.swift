import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0022 rule 6: text maps tones by §3.1's table, as ADR-0029 §1.4 and ADR-0030 §3.4 amend it, and a cell
/// keyed by a material applies when the enclosing Surface publishes that material. The table below is
/// `spec/components/Text.yaml`'s `color` block, written out.
@Suite("Text tones on a published material (ADR-0022 §3.1)")
struct DSTextToneTests {
    private func expected(material: DSSurfaceMaterial, backdrop: DSBackdropKind, tone: DSTextTone) -> DSColorToken {
        switch material {
        case .page, .solid, .raised, .nested:
            switch tone {
            case .primary: return .textPrimary
            case .secondary: return .textSecondary
            case .tertiary: return .textTertiary
            case .dimmed: return .textDimmed
            case .accent: return .textAccent
            case .success: return .textSuccess
            case .warning: return .textWarning
            case .critical: return .textCritical
            case .info: return .textInfo
            }
        case .vivid:
            return .textOnVivid
        case .inverse:
            return .textOnInverse
        case .glassLight:
            return .textOnGlassLight
        case .accent:
            switch tone {
            case .secondary, .tertiary, .dimmed: return .textOnAccentSecondary
            default: return .textOnAccent
            }
        case .glass where backdrop == .map:
            switch tone {
            case .secondary: return .textOnGlassFillSecondary
            case .tertiary: return .textOnGlassFillTertiary
            case .dimmed: return .textOnGlassFillDimmed
            default: return .textOnGlassFill
            }
        case .glass:
            switch tone {
            case .secondary: return .textOnGlassFillMediaSecondary
            case .tertiary, .dimmed: return .textOnGlassFillMediaTertiary
            default: return .textOnGlassFill
            }
        }
    }

    @Test func everyMaterialBackdropAndTone() {
        for material in DSSurfaceMaterial.allCases {
            for backdrop in DSBackdropKind.allCases {
                let published = DSSurfaceContext(material: material, backdrop: backdrop)
                for tone in DSTextTone.allCases {
                    #expect(
                        published.colorToken(for: tone) == expected(material: material, backdrop: backdrop, tone: tone),
                        "\(material) over \(backdrop), tone \(tone)"
                    )
                }
            }
        }
    }

    /// ADR-0022 §3.1: on vivid, light glass and inverse no tone is dimmed with alpha — every tone is that
    /// material's single foreground, and a status is carried by its icon, never by the color of the text.
    @Test func vividLightGlassAndInverseHaveOneForeground() {
        for material in [DSSurfaceMaterial.vivid, .glassLight, .inverse] {
            let published = DSSurfaceContext(material: material, backdrop: .image)
            let tokens = Set(DSTextTone.allCases.map { published.colorToken(for: $0) })
            #expect(tokens.count == 1, "\(material) publishes one foreground")
        }
    }

    /// ADR-0029 §1.4: on the scheme's glass the tones follow the backdrop kind, never the color scheme.
    @Test func theSchemeGlassFollowsTheBackdropKind() {
        let map = DSSurfaceContext(material: .glass, backdrop: .map)
        let image = DSSurfaceContext(material: .glass, backdrop: .image)
        let vivid = DSSurfaceContext(material: .glass, backdrop: .vivid)
        #expect(map.colorToken(for: .primary) == image.colorToken(for: .primary))
        #expect(map.colorToken(for: .secondary) != image.colorToken(for: .secondary))
        for tone in DSTextTone.allCases {
            #expect(image.colorToken(for: tone) == vivid.colorToken(for: tone), "image and vivid share the media tones")
        }
    }

    /// Under the fallback a glass Card renders the standard foregrounds, and a selected one `text.on-inverse`
    /// (ADR-0022 §3.1, "Components follow the published material").
    @Test func theFallbackTakesTheRaisedAndInverseRows() {
        let context = DSTokenContext(contrast: .increased)
        let tokens = DSTokenSet(context).material
        let plain = DSSurface.resolve(material: .glass, backdrop: .image, selected: false, context: context, tokens: tokens, isWatch: false)
        #expect(plain.colorToken(for: .secondary) == .textSecondary)
        let selected = DSSurface.resolve(material: .glass, backdrop: .image, selected: true, context: context, tokens: tokens, isWatch: false)
        #expect(selected.colorToken(for: .secondary) == .textOnInverse)
    }

    @Test func everyToneResolvesToACatalogColorOfTheBrand() {
        let published = DSSurfaceContext(material: .glass, backdrop: .map)
        #expect(published.color(for: .primary, brand: .prism) == DSColorToken.textOnGlassFill.color(.prism))
    }
}
