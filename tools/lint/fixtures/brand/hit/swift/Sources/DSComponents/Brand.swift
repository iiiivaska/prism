// One line per Swift brand pattern (ADR-0020 rule 13); `expect:` names the rule the line must trip.
import DSTokens

enum BrandFixture {
    static let every = DSBrand.allCases // expect: brand/swift-all-cases

    static func label(_ brand: DSBrand) -> String {
        switch brand { // expect: brand/swift-switch
        case .prism: "reference"
        case .prismNative: "native"
        }
    }

    static func isReference(_ brand: DSBrand) -> Bool {
        brand == .prism // expect: brand/swift-case-pattern
    }
}
