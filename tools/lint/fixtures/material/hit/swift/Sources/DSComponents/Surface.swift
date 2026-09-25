// One line per SwiftUI spelling of each material pattern (ADR-0022 rule 2), and Prism's own policy flag;
// `expect:` names the rule the line must trip. `Platform.swift` holds UIKit's and AppKit's names. The glass
// button styles are Apple's glass and the bar material is a `Material`, each by another spelling.
import SwiftUI
import DSCore

struct SurfaceFixture: View {
    @Environment(\.accessibilityReduceTransparency) private var transparency // expect: material/swift-reduce-transparency
    @Environment(\.colorSchemeContrast) private var contrast // expect: material/swift-contrast-setting
    private var ds = DSThemeValues()
    private let isChrome = false
    private let chrome: Material? = nil // expect: material/swift-material
    private let customGlass: GlassButtonStyle? = nil // expect: material/swift-glass-effect

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

    /// The type by its module's name.
    var regular: some ShapeStyle {
        SwiftUI.Material.regular // expect: material/swift-material
    }

    /// The glass button styles by their types and the prominent one's member, and `.glass` where a button style
    /// takes it: alone, with space around it, and after `??`. The bar lines below hold the argument's other places.
    var glassButtons: some View {
        VStack {
            Button("Glass") {}.buttonStyle(.glass) // expect: material/swift-glass-effect
            Button("Prominent") {}.buttonStyle(.glassProminent) // expect: material/swift-glass-effect
            Button("Typed") {}.buttonStyle(GlassButtonStyle()) // expect: material/swift-glass-effect
            Button("Typed prominent") {}.buttonStyle(GlassProminentButtonStyle()) // expect: material/swift-glass-effect
            Button("Spaced") {}.buttonStyle ( .glass ) // expect: material/swift-glass-effect
            Button("Custom") {}.buttonStyle(customGlass ?? .glass) // expect: material/swift-glass-effect
        }
    }

    /// The bar material in each call that takes a `ShapeStyle`, then in the other places an argument takes it:
    /// after a comma, as either branch of a ternary, after `??`, and with space around it.
    var bars: some View {
        VStack {
            Rectangle().fill(.bar) // expect: material/swift-material
            Rectangle().stroke(.bar) // expect: material/swift-material
            Rectangle().strokeBorder(.bar) // expect: material/swift-material
            Rectangle().background(.bar, in: Capsule()) // expect: material/swift-material
            Rectangle().backgroundStyle(.bar) // expect: material/swift-material
            Rectangle().foregroundStyle(.primary, .bar) // expect: material/swift-material
            Rectangle().overlay(.bar) // expect: material/swift-material
            Rectangle().border(.bar) // expect: material/swift-material
            Rectangle().tint(.bar) // expect: material/swift-material
            Rectangle().toolbarBackground(.bar, for: .navigationBar) // expect: material/swift-material
            Rectangle().presentationBackground(.bar) // expect: material/swift-material
            Rectangle().containerBackground(.bar, for: .navigation) // expect: material/swift-material
            Rectangle().fill(AnyShapeStyle(.bar)) // expect: material/swift-material
            Rectangle().fill(isChrome ? .bar : shading) // expect: material/swift-material
            Rectangle().fill(isChrome ? shading : .bar) // expect: material/swift-material
            Rectangle().fill(chrome ?? .bar) // expect: material/swift-material
            Rectangle().fill ( .bar ) // expect: material/swift-material
        }
    }
}

/// A component's own modifiers, which call SwiftUI's with no `.` before the call.
extension View {
    func glassButton() -> some View { buttonStyle(.glass) } // expect: material/swift-glass-effect
    func barBacked() -> some View { background(.bar) } // expect: material/swift-material
}
