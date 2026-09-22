import SwiftUI
import DSCore
import DSComponents
import DSIcons
import DSTokens

/// Stages one component's `examples[]` entries from the props the spec writes.
///
/// There is one renderer per component this build implements on Apple, and the list of them is generated
/// (`Generated/DSShowcaseBindings.swift`) from `DSComponentsManifest.implemented`. A component that lands in that
/// manifest appears in the bindings on the next generate, and `DSShowcase` then stops compiling until its
/// `DS<Name>Renderer` exists. That is the whole anti-staleness mechanism: the app never holds a list of
/// components, and it can never quietly fail to show one.
public protocol DSExampleRenderer {
    /// The example's own content, before staging; nil when the renderer cannot build these props, which the page
    /// says out loud rather than drawing something else.
    @MainActor func content(for example: DSSpecExample) -> AnyView?
}

/// The renderers this build has. The dictionary itself is generated.
public enum DSShowcaseRenderers {
    public static func renderer(for component: String) -> (any DSExampleRenderer)? { generated[component] }

    /// The components that have a renderer, which is exactly what the manifests say this build implements.
    public static var names: [String] { generated.keys.sorted() }
}

/// One example, staged the way the gallery stages it: the ground the spec declares, the surface it sits inside,
/// and the component itself, inside a `DSTheme` per scheme when a page asks for both.
public struct DSExampleView: View {
    private let component: String
    private let example: DSSpecExample
    private var ds = DSThemeValues()

    public init(component: String, example: DSSpecExample) {
        self.component = component
        self.example = example
    }

    public var body: some View {
        if let renderer = DSShowcaseRenderers.renderer(for: component), let content = renderer.content(for: example) {
            DSExampleStage(DSExampleGround.of(example)) {
                wrapped(content)
            }
        } else {
            DSExampleStage(.page) {
                DSText(
                    verbatim: "No renderer stages `\(example.id)`. The example is in the spec; this build cannot draw it.",
                    role: .caption,
                    tone: .secondary
                )
            }
        }
    }

    /// The surface the example declares around its content. `map` and `image` are grounds, not surfaces, and
    /// `vivid` and `glass` are the two the spec puts the component *inside*.
    @ViewBuilder
    private func wrapped(_ content: AnyView) -> some View {
        switch example.surface {
        case "vivid":
            DSSurfaceView(material: .vivid, radius: .card) { content }
        case "glass":
            DSSurfaceView(material: .glass, radius: .card, backdrop: example.backdrop == "map" ? .map : .image) { content }
        default:
            content
        }
    }
}

// MARK: - Prop helpers

extension DSSpecExample {
    /// A prop read as one of an enum's raw values; nil when the spec writes something this build does not know,
    /// which is the renderer's cue to say so rather than guess.
    func raw<T: RawRepresentable>(_ key: String, as type: T.Type = T.self) -> T? where T.RawValue == String {
        guard let value = string(key) else { return nil }
        return T(rawValue: value)
    }

    /// A registry icon named by its semantic id (`nav.open`).
    func icon(_ key: String) -> DSIconName? { raw(key, as: DSIconName.self) }
}
