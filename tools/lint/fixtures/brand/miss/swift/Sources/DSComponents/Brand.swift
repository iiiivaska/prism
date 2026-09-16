// The brand-invariant counterpart of each Swift brand pattern (ADR-0020 rule 13, §8); `miss:` names
// the rule it must not trip. Components read brand values through DSTokenSet and DSBrand.faces, which
// keeps them source-compatible with route 2's struct-with-static-members DSBrand.
import DSTokens

enum BrandFixture {
    static func label(_ tokens: DSTokenSet) -> String {
        tokens.context.brand.rawValue // miss: brand/swift-all-cases, brand/swift-case-pattern
    }

    static func face(_ brand: DSBrand, slot: DSFontSlot) -> DSFontFace? {
        brand.faces[slot] // miss: brand/swift-switch
    }

    // Switching over something that is not a brand stays allowed, and so does a case whose value is.
    static func tone(_ scheme: DSColorScheme, brand: DSBrand) -> String {
        switch scheme {
        case .light: face(brand, slot: .ui)?.families.first ?? ""
        case .dark: brand.colorNamespace
        }
    }
}
