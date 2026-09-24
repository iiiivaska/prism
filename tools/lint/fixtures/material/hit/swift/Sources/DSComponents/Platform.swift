// Apple's glass, its blur materials and the two OS settings by UIKit's and AppKit's names (ADR-0022 rule 2,
// tuned beyond its list); `expect:` names the rule the line must trip. A component outside DSCore uses
// none of them: its glass part is the Surface module's chip shape, and it reads the settings from the
// context DSCore resolves.
#if canImport(UIKit)
import UIKit

final class PlatformGlassView: UIVisualEffectView { // expect: material/swift-material
    func applyBlur() {
        effect = UIBlurEffect(style: .systemUltraThinMaterial) // expect: material/swift-material
    }

    func applyVibrancy() {
        effect = UIVibrancyEffect(blurEffect: .init(style: .systemMaterial)) // expect: material/swift-material
    }

    func applyGlass() {
        effect = UIGlassEffect() // expect: material/swift-glass-effect
    }

    func applyGlassGroup() {
        effect = UIGlassContainerEffect() // expect: material/swift-glass-effect
    }

    var fallsBack: Bool {
        UIAccessibility.isReduceTransparencyEnabled // expect: material/swift-reduce-transparency
            || UIAccessibility.isDarkerSystemColorsEnabled // expect: material/swift-contrast-setting
            || traitCollection.accessibilityContrast == .high // expect: material/swift-contrast-setting
    }
}
#elseif canImport(AppKit)
import AppKit

final class PlatformGlassView: NSVisualEffectView { // expect: material/swift-material
    let glass = NSGlassEffectView() // expect: material/swift-glass-effect
    let glassGroup = NSGlassEffectContainerView() // expect: material/swift-glass-effect

    var fallsBack: Bool {
        NSWorkspace.shared.accessibilityDisplayShouldReduceTransparency // expect: material/swift-reduce-transparency
            || NSWorkspace.shared.accessibilityDisplayShouldIncreaseContrast // expect: material/swift-contrast-setting
    }
}
#endif
