import SwiftUI
import DSCore

/// The pixels a glass Surface blurs (ADR-0022 §2.1): a backdrop view, the coordinate space it is drawn in and its
/// size. SwiftUI cannot read what lies behind a view, so the view that draws the backdrop hands it down, and a glass
/// Surface draws the part of it under itself again, blurred and saturated by its recipe — the Apple twin of the
/// web's `backdrop-filter`.
///
/// It is only ever created and read on the main actor, inside view bodies; `AnyView` is not `Sendable`, which an
/// environment key's default value has to be, hence the unchecked conformance.
nonisolated struct DSBackdropSource: @unchecked Sendable {
    let space: AnyHashable
    let size: CGSize
    let content: AnyView
}

private struct DSBackdropSourceKey: EnvironmentKey {
    static let defaultValue: DSBackdropSource? = nil
}

private struct DSSurfaceGeometryKey: EnvironmentKey {
    static let defaultValue: DSSurfaceGeometry? = nil
}

extension EnvironmentValues {
    /// The nearest backdrop a glass Surface can blur: from `dsBackdrop(_:)`, or from the enclosing opaque Surface.
    var dsBackdropSource: DSBackdropSource? {
        get { self[DSBackdropSourceKey.self] }
        set { self[DSBackdropSourceKey.self] = newValue }
    }

    /// The geometry of the enclosing Surface, for the concentric rule.
    var dsSurfaceGeometry: DSSurfaceGeometry? {
        get { self[DSSurfaceGeometryKey.self] }
        set { self[DSSurfaceGeometryKey.self] = newValue }
    }
}

extension View {
    /// Draws `backdrop` behind this view and hands its pixels to the glass Surfaces inside.
    ///
    /// Glass renders only over an image, a map or a vivid surface, and the parent declares which with the Surface's
    /// `backdrop` (Surface.yaml). This modifier supplies what that backdrop looks like: a glass `DSSurfaceView`
    /// inside it blurs and saturates the part of `backdrop` under itself with its recipe, as `backdrop-filter`
    /// does on the web. A `DSSurfaceView` of an opaque material hands down its own fill the same way, so glass on a
    /// vivid card needs no modifier.
    ///
    ///     ZStack(alignment: .bottomLeading) {
    ///         Color.clear
    ///         DSSurfaceView(material: .glass, backdrop: .map, elevation: .overlay) { … }
    ///     }
    ///     .dsBackdrop { MapView() }
    ///
    /// The modifier changes no material and reads no setting; under the glass fallback the Surface ignores it.
    public func dsBackdrop<Backdrop: View>(@ViewBuilder _ backdrop: () -> Backdrop) -> some View {
        modifier(DSBackdropModifier(backdrop: AnyView(backdrop())))
    }

    /// Publishes a backdrop drawn in the coordinate space `space`, `size` large.
    func dsBackdropSource(_ content: AnyView, space: AnyHashable, size: CGSize) -> some View {
        environment(\.dsBackdropSource, DSBackdropSource(space: space, size: size, content: content))
    }
}

private struct DSBackdropModifier: ViewModifier {
    let backdrop: AnyView
    @Namespace private var space
    @State private var size: CGSize = .zero

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site.
    init(backdrop: AnyView) {
        self.backdrop = backdrop
    }

    func body(content: Content) -> some View {
        content
            .dsBackdropSource(backdrop, space: space, size: size)
            .background { backdrop }
            .onGeometryChange(for: CGSize.self, of: \.size) { size = $0 }
            .coordinateSpace(.named(space))
    }
}
