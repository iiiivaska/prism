import SwiftUI
import Testing
import DSTokens
#if canImport(UIKit)
import UIKit
#endif
#if canImport(AppKit)
import AppKit
#endif

/// Whether the resource bundle carries the compiled catalog: xcodebuild compiles Colors.xcassets, swift test copies it.
private var catalogIsCompiled: Bool {
    DSTokensBundle.bundle.url(forResource: "Assets", withExtension: "car") != nil
}

/// The compiled color catalog against `DSColorToken.appearances` (ARCHITECTURE §9.7.6, ADR-0020 rule 11): every
/// colorset of every brand, looked up as `<namespace>/<name>`, resolves to the value each appearance promises, within
/// 0.002 per component. iOS resolves Any, Dark, High Contrast and Dark + High Contrast through `UIColor.resolvedColor`
/// (without it a dynamic color reports its Any value); watchOS reads the `watch` idiom entry, which carries the dark
/// value; macOS checks Any and Dark (its high-contrast lookup is ARCHITECTURE V8). The bare name without a namespace
/// resolves to nothing: iOS and macOS find no color; watchOS, whose UIKit has no bundle lookup, resolves the bare
/// name exactly as it resolves a name the catalog lacks. `swift test` copies Colors.xcassets uncompiled, without an
/// Assets.car, so the suite runs under `xcodebuild test` only. CI runs it on the iOS and watchOS simulators (the
/// `apple` job); the macOS branch runs only in a local `xcodebuild test -scheme DSTokensTests -destination
/// 'platform=macOS'` until P3 adds a macOS step with the high-contrast lookup (ARCHITECTURE V8).
@Suite("Color catalog", .enabled(if: catalogIsCompiled, "swift test copies Colors.xcassets uncompiled; run xcodebuild test"))
struct ColorCatalogTests {
    static let tolerance = 0.002

    static func expectClose(_ actual: [Double], _ expected: [Double], _ name: String, sourceLocation: SourceLocation = #_sourceLocation) {
        let close = actual.count == expected.count && zip(actual, expected).allSatisfy { abs($0 - $1) <= tolerance }
        #expect(close, "\(name): catalog \(actual), expected \(expected)", sourceLocation: sourceLocation)
    }

    #if os(iOS)
    /// Extended sRGB components, the space `getRed` reports in.
    static func components(_ color: UIColor) -> [Double] {
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        color.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        return [red, green, blue, alpha].map { Double($0) }
    }

    static func components(_ literal: DSRGBA) -> [Double] {
        switch literal.space {
        case .sRGB: components(UIColor(red: literal.red, green: literal.green, blue: literal.blue, alpha: literal.alpha))
        case .displayP3: components(UIColor(displayP3Red: literal.red, green: literal.green, blue: literal.blue, alpha: literal.alpha))
        }
    }

    @MainActor
    @Test func iOSAppearances() throws {
        let bundle = DSTokensBundle.bundle
        for brand in DSBrand.allCases {
            for token in DSColorToken.allCases {
                let name = token.assetName(brand)
                let color = try #require(UIColor(named: name, in: bundle, compatibleWith: nil), "\(name) is not in the catalog")
                let appearances = token.appearances(brand)
                let cases: [(String, UIUserInterfaceStyle, UIAccessibilityContrast, DSRGBA)] = [
                    ("Any", .light, .normal, appearances.any),
                    ("Dark", .dark, .normal, appearances.dark),
                    ("High Contrast", .light, .high, appearances.highContrast),
                    ("Dark + High Contrast", .dark, .high, appearances.darkHighContrast),
                ]
                for (label, style, contrast, expected) in cases {
                    let traits = UITraitCollection { traits in
                        traits.userInterfaceStyle = style
                        traits.accessibilityContrast = contrast
                    }
                    Self.expectClose(Self.components(color.resolvedColor(with: traits)), Self.components(expected), "\(name) \(label)")
                }
                #expect(UIColor(named: token.rawValue, in: bundle, compatibleWith: nil) == nil, "\(token.rawValue) resolves without a namespace")
            }
        }
    }
    #endif

    #if os(watchOS)
    static func components(_ color: Color.Resolved) -> [Double] {
        [color.red, color.green, color.blue, color.opacity].map { Double($0) }
    }

    @MainActor
    @Test func watchOSAppearances() {
        let bundle = DSTokensBundle.bundle
        let environment = EnvironmentValues()
        // watchOS has no UIColor(named:in:compatibleWith:), so the bare-name check compares with what SwiftUI resolves
        // a name the catalog lacks to, whatever that fallback is.
        let missing = Self.components(Color("color-catalog-tests/not-in-the-catalog", bundle: bundle).resolve(in: environment))
        for brand in DSBrand.allCases {
            for token in DSColorToken.allCases {
                let resolved = token.color(brand).resolve(in: environment)
                let expected = token.appearances(brand).watch.color.resolve(in: environment)
                Self.expectClose(Self.components(resolved), Self.components(expected), "\(token.assetName(brand)) watch")
                let bare = Self.components(Color(token.rawValue, bundle: bundle).resolve(in: environment))
                #expect(bare == missing, "\(token.rawValue) resolves without a namespace")
            }
        }
    }
    #endif

    #if os(macOS)
    static func components(_ color: NSColor) -> [Double] {
        guard let c = color.usingColorSpace(.extendedSRGB) else { return [] }
        return [c.redComponent, c.greenComponent, c.blueComponent, c.alphaComponent].map { Double($0) }
    }

    static func components(_ literal: DSRGBA) -> [Double] {
        switch literal.space {
        case .sRGB: components(NSColor(srgbRed: literal.red, green: literal.green, blue: literal.blue, alpha: literal.alpha))
        case .displayP3: components(NSColor(displayP3Red: literal.red, green: literal.green, blue: literal.blue, alpha: literal.alpha))
        }
    }

    @MainActor
    @Test func macOSAppearances() throws {
        let bundle = DSTokensBundle.bundle
        for brand in DSBrand.allCases {
            for token in DSColorToken.allCases {
                let name = token.assetName(brand)
                let color = try #require(NSColor(named: name, bundle: bundle), "\(name) is not in the catalog")
                let appearances = token.appearances(brand)
                let cases: [(String, NSAppearance.Name, DSRGBA)] = [("Any", .aqua, appearances.any), ("Dark", .darkAqua, appearances.dark)]
                for (label, appearanceName, expected) in cases {
                    let appearance = try #require(NSAppearance(named: appearanceName))
                    var resolved: [Double] = []
                    appearance.performAsCurrentDrawingAppearance {
                        resolved = Self.components(color)
                    }
                    Self.expectClose(resolved, Self.components(expected), "\(name) \(label)")
                }
                #expect(NSColor(named: token.rawValue, bundle: bundle) == nil, "\(token.rawValue) resolves without a namespace")
            }
        }
    }
    #endif
}
