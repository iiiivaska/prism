import OSLog
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

private struct DSSurfaceChipEnclosureKey: EnvironmentKey {
    static let defaultValue = DSSurfaceChipEnclosure.none
}

extension EnvironmentValues {
    /// The nearest backdrop a glass Surface can blur: from `dsBackdrop(_:_:)`, or from the enclosing opaque Surface.
    var dsBackdropSource: DSBackdropSource? {
        get { self[DSBackdropSourceKey.self] }
        set { self[DSBackdropSourceKey.self] = newValue }
    }

    /// The geometry of the enclosing Surface, for the concentric rule.
    var dsSurfaceGeometry: DSSurfaceGeometry? {
        get { self[DSSurfaceGeometryKey.self] }
        set { self[DSSurfaceGeometryKey.self] = newValue }
    }

    /// What encloses this view, up to the nearest `dsBackdrop(_:_:)` (ADR-0037 §1, in place of ADR-0036 §3 step 8's
    /// flag): `.none` where no chip encloses it, `.translucent` where chips enclose it and none of them renders its own
    /// cell or its fallback, and `.opaque` where one of them does.
    ///
    /// `dsSurfaceChip` sets it for its content to the enclosure its resolution hands on,
    /// `DSSurfaceChipResolution.encloses`, and a glass chip inside reads it. Inside any other chip, a glass chip draws
    /// the recipe's fill and edge without blurring anything, and in an `.opaque` enclosure it has no media under it, so
    /// glass asked for under the `content` gate falls back (ADR-0037 §2). Chromium's backdrop filter would read the
    /// enclosing chip's paint, which the mirror cannot see, so a nested chip samples nothing on either stack.
    /// `dsBackdrop(_:_:)` sets `.none` for every kind, `.none` included, because the pixels it hands down are new
    /// media. Surface neither reads nor writes it.
    var dsSurfaceChipEnclosure: DSSurfaceChipEnclosure {
        get { self[DSSurfaceChipEnclosureKey.self] }
        set { self[DSSurfaceChipEnclosureKey.self] = newValue }
    }
}

extension View {
    /// Declares that this view sits on media the app paints itself — an image, a map or a vivid gradient — draws that
    /// media behind the view, and hands its pixels to the glass inside (ADR-0036 §8).
    ///
    /// It publishes `DSSurfaceContext(material: .page, backdrop: kind)` to the view, so Prism's components on it know
    /// they sit on the page over that kind, as the glass chips of Avatar and Chip will (ADR-0036 §3). With
    /// `DSSurfaceView`, it is one of the two public publishers of a surface context, and the only one that paints
    /// nothing of Prism's. Only the page can be published without paint: any other material names paint that is not
    /// there.
    ///
    /// SwiftUI cannot read what lies behind a view, so the declaration also supplies the pixels, and the two cannot be
    /// declared apart. A glass `DSSurfaceView` inside blurs and saturates the part of `backdrop` under itself with its
    /// recipe, as `backdrop-filter` does on the web; a `DSSurfaceView` of an opaque material hands down its own fill
    /// the same way, so glass on a vivid card needs no modifier.
    ///
    ///     ZStack(alignment: .bottomLeading) {
    ///         Color.clear
    ///         DSSurfaceView(material: .glass, backdrop: .map, elevation: .overlay) { … }
    ///     }
    ///     .dsBackdrop(.map) { MapView() }
    ///
    /// A glass Surface still declares its own `backdrop` (Surface.yaml): it does not read it from this modifier. The
    /// nearest publisher wins, so a `dsBackdrop` inside a Surface overrides the Surface's context for its subtree, and
    /// a Surface inside a `dsBackdrop` publishes its own. The modifier reads no setting; under the glass fallback a
    /// Surface ignores the pixels. `.none` is not media: it logs at debug level, publishes nothing and still hands the
    /// pixels down. Either way the glass chips of Prism's components inside blur these pixels, even where the modifier
    /// sits inside another component's chip: it hands its content the enclosure `.none` (ADR-0037 §1).
    ///
    /// - Parameters:
    ///   - kind: what the app draws under this view: `.image`, `.map` or `.vivid`. Name the media actually drawn;
    ///     Prism's components inside read `(page, kind)` as their ground.
    ///   - backdrop: the media itself, drawn behind this view and handed to any glass Surface inside it.
    public func dsBackdrop<Backdrop: View>(_ kind: DSBackdropKind, @ViewBuilder _ backdrop: () -> Backdrop) -> some View {
        if kind == .none {
            DSBackdropLog.log.debug(
                "dsBackdrop(.none) publishes no surface context: declare what the backdrop is, image, map or vivid (ADR-0036 §8.3)."
            )
        }
        return modifier(DSBackdropModifier(kind: kind, backdrop: AnyView(backdrop())))
    }

    /// Publishes a backdrop drawn in the coordinate space `space`, `size` large.
    func dsBackdropSource(_ content: AnyView, space: AnyHashable, size: CGSize) -> some View {
        environment(\.dsBackdropSource, DSBackdropSource(space: space, size: size, content: content))
    }
}

private enum DSBackdropLog {
    static let log = Logger(subsystem: "app.prism.dscomponents", category: "backdrop")
}

private struct DSBackdropModifier: ViewModifier {
    let kind: DSBackdropKind
    let backdrop: AnyView
    @Namespace private var space
    @State private var size: CGSize = .zero

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site.
    init(kind: DSBackdropKind, backdrop: AnyView) {
        self.kind = kind
        self.backdrop = backdrop
    }

    func body(content: Content) -> some View {
        declared(content)
            .environment(\.dsSurfaceChipEnclosure, DSSurfaceChipEnclosure.none)
            .dsBackdropSource(backdrop, space: space, size: size)
            .background { backdrop }
            .onGeometryChange(for: CGSize.self, of: \.size) { size = $0 }
            .coordinateSpace(.named(space))
    }

    /// The page over `kind`, published to the content; nothing under `.none`.
    @ViewBuilder
    private func declared(_ content: Content) -> some View {
        if kind == .none {
            content
        } else {
            content.dsSurfaceContext(DSSurfaceContext(material: .page, backdrop: kind))
        }
    }
}
