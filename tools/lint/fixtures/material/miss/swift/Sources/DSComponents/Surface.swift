// The counterpart of each material pattern (ADR-0022 rule 2); `miss:` names the rule it must not
// trip. A component reads the material from the context its Surface published and never the OS
// settings or Prism's transparency (ADR-0036 §10), and Prism's own material names are not SwiftUI's.
import SwiftUI
import DSCore
import DSTokens

struct SurfaceFixture: View {
    private var ds = DSThemeValues()

    var body: some View {
        let resolution = DSSurface.resolve(material: material, backdrop: .image, tokens: ds.tokens) // miss: material/swift-material
        Rectangle()
            .fill(resolution.glass?.fill ?? ds.tokens.color.bgSurfaceRaised) // miss: material/swift-glass-effect
            .opacity(ds.surface.material == .raised ? 1 : 1) // miss: material/swift-reduce-transparency, material/swift-transparency-read
            .overlay(alignment: .top) { edge(ds.tokens.context.contrast) } // miss: material/swift-contrast-setting
    }

    var material: DSSurfaceMaterial { .glass }

    func edge(_ contrast: DSContrast) -> some View { Rectangle().frame(height: 1) }
}
