// One line per SwiftUI spelling of each material pattern (ADR-0022 rule 2), and Prism's own policy flag;
// `expect:` names the rule the line must trip. `Platform.swift` holds UIKit's and AppKit's names.
import SwiftUI
import DSCore

struct SurfaceFixture: View {
    @Environment(\.accessibilityReduceTransparency) private var transparency // expect: material/swift-reduce-transparency
    @Environment(\.colorSchemeContrast) private var contrast // expect: material/swift-contrast-setting
    private var ds = DSThemeValues()

    var body: some View {
        GlassEffectContainer { // expect: material/swift-glass-effect
            Rectangle()
                .glassEffect() // expect: material/swift-glass-effect
                .background(shading)
                .opacity(ds.policy.reduceTransparency ? 1 : 0.5) // expect: material/swift-reduce-transparency
        }
    }

    var shading: Material { // expect: material/swift-material
        .ultraThinMaterial // expect: material/swift-material
    }

    var thicknesses: [Material] { // expect: material/swift-material
        [
            .thinMaterial, // expect: material/swift-material
            .regularMaterial, // expect: material/swift-material
            .thickMaterial, // expect: material/swift-material
            .ultraThickMaterial, // expect: material/swift-material
        ]
    }
}
