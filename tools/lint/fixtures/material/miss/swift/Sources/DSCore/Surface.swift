// DSCore is the one place the four names are allowed (ADR-0022 §1.3, rule 2): it resolves the glass
// fallback from the OS settings and draws Prism's own glass, so the same lines that fail under
// DSComponents pass here. It also builds the glass recipes and is the one place that compares Prism's
// transparency context, for Surface and the chip alike (ADR-0036 §3, §10). `miss:` names the rule
// that must not trip.
import SwiftUI

struct Surface: View {
    @Environment(\.accessibilityReduceTransparency) private var transparency // miss: material/swift-reduce-transparency
    @Environment(\.colorSchemeContrast) private var contrast // miss: material/swift-contrast-setting

    var body: some View {
        Rectangle()
            .glassEffect() // miss: material/swift-glass-effect
            .background(shading)
    }

    var shading: Material { .ultraThinMaterial } // miss: material/swift-material
}

enum SurfaceResolution {
    static func glassFallsBack(isWatch: Bool, context: DSTokenContext) -> Bool {
        isWatch || context.transparency == .reduced || context.contrast == .increased // miss: material/swift-transparency-read
    }

    static func chip(_ material: DSTokenSet.Material) -> DSGlassRecipe { // miss: material/swift-backdrop-pixels
        DSGlassAppearance.chip.recipe(material) // miss: material/swift-backdrop-pixels
    }
}
