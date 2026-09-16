// One line per material pattern (ADR-0022 rule 2); `expect:` names the rule the line must trip.
import SwiftUI

struct SurfaceFixture: View {
    @Environment(\.accessibilityReduceTransparency) private var transparency // expect: material/swift-reduce-transparency
    @Environment(\.colorSchemeContrast) private var contrast // expect: material/swift-contrast-setting

    var body: some View {
        Rectangle()
            .glassEffect() // expect: material/swift-glass-effect
            .background(shading)
    }

    var shading: Material { // expect: material/swift-material
        .ultraThinMaterial // expect: material/swift-material
    }
}
