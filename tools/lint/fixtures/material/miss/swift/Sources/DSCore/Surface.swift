// DSCore is the one place the four names are allowed (ADR-0022 §1.3, rule 2): it resolves the glass
// fallback from the OS settings and draws Prism's own glass, so the same lines that fail under
// DSComponents pass here. `miss:` names the rule that must not trip.
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
