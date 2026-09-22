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

    /// The padding of the Surface an example that declares a material is staged inside; `card` unless the renderer
    /// says otherwise (the default below). The staging itself — which material, on which ground — stays
    /// `DSExampleStaging.of(_:)`'s alone.
    func surfacePadding(for example: DSSpecExample) -> DSSurfacePadding
}

extension DSExampleRenderer {
    /// A component sits inside its example's Surface at `space.card-padding`, as it sits inside a card. A component
    /// that measures itself from the container's own edge overrides this: Divider's `inset: content` is
    /// `space.card-padding` from that edge, so a padded Surface would apply the inset twice.
    public func surfacePadding(for example: DSSpecExample) -> DSSurfacePadding { .card }
}

/// The renderers this build has. The dictionary itself is generated.
public enum DSShowcaseRenderers {
    public static func renderer(for component: String) -> (any DSExampleRenderer)? { generated[component] }

    /// The components that have a renderer, which is exactly what the manifests say this build implements.
    public static var names: [String] { generated.keys.sorted() }
}

/// One example, staged the way the gallery stages it: the ground the spec declares, the surface it sits inside,
/// and the component itself, inside a `DSTheme` per scheme when a page asks for both.
///
/// Both halves of the staging come from `DSExampleStaging.of(_:)`, which reads the schema's whole vocabulary or
/// says it cannot. This view used to decide the surface for itself, with a `default: content` that quietly drew
/// an example declaring `solid`, `glassLight`, `map` or `image` on a bare page. Nothing here reads `surface` or
/// `backdrop` any more, so there is no second reading to drift from the first.
public struct DSExampleView: View {
    private let component: String
    private let example: DSSpecExample
    private var ds = DSThemeValues()

    public init(component: String, example: DSSpecExample) {
        self.component = component
        self.example = example
    }

    public var body: some View {
        switch DSExampleStaging.of(example) {
        case .ground(let ground):
            staged(on: ground, inside: nil, backdrop: .none)
        case .surface(let material, let backdrop, let ground):
            staged(on: ground, inside: material, backdrop: backdrop)
        case .unstageable(let problem):
            // A ground this build cannot draw is a defect in the repository's own text, and the page is where it
            // is seen: the alternative — the fallback this switch used to have — is a picture that looks finished
            // and is wrong, which nobody has any reason to look twice at.
            note("`\(component)/\(example.id)` \(problem)", tone: .critical)
        }
    }

    /// The example on the ground it declares, inside the surface it declares, when a renderer can build its props;
    /// the page says so in the example's own place when none can.
    @ViewBuilder
    private func staged(on ground: DSExampleGround, inside material: DSSurfaceMaterial?, backdrop: DSBackdropKind) -> some View {
        if let renderer = DSShowcaseRenderers.renderer(for: component), let content = renderer.content(for: example) {
            DSExampleStage(ground) {
                if let material {
                    DSSurfaceView(
                        material: material, radius: .card, padding: renderer.surfacePadding(for: example), backdrop: backdrop
                    ) { content }
                } else {
                    content
                }
            }
        } else {
            note("`\(example.id)` is not staged here. The example is in the spec; this build cannot draw it.", tone: .secondary)
        }
    }

    /// What the page prints in an example's own place when there is no example to print.
    ///
    /// It is deliberately not a `DSExampleStage`. That stage is fit-content inside a horizontal `ScrollView`,
    /// which is right for an example staged at the width its spec means and wrong for a sentence: the sentence
    /// would take its one-line ideal width and run off the side of the phone, where a failure nobody can read is
    /// no better than the silent fallback it replaced. A note takes the width the page gives it, and wraps.
    private func note(_ sentence: String, tone: DSTextTone) -> some View {
        let tokens = ds.tokens
        return DSText(verbatim: sentence, role: .caption, tone: tone)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(tokens.space.pageMargin)
            .background(tokens.color.bgPage)
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
