import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// `spec/components/Divider.yaml` behavior 2 as lengths: a Divider has no length of its own. Its length is its parent's
/// cross size — the width of the column a horizontal one sits in, the height of the row a vertical one sits in — and it
/// never decides that size. In a parent that sizes to its content it is as long as the longest of the parent's other
/// children, and adds nothing to the parent but its two insets.
///
/// On Apple a parent that sizes to its content is a stack under `fixedSize` on the Divider's cross axis
/// (`notes.platform.ios`): a SwiftUI stack left to size itself takes all the length its flexible child is offered, so
/// it is a parent with a definite cross size, the width or height it was offered, and the Divider runs the length of
/// that. Both readings are pinned here, because the second is what a caller meets first.
///
/// The web twin is the Divider block of `web/apps/gallery/test/components.browser.test.tsx`, which measures the same
/// cases in Chromium with a shrink-to-fit box and a flex row. Lengths come from a geometry probe in an `ImageRenderer`
/// layout pass that reads no pixel, so a blank raster cannot fool it and it runs under `swift test` on the host.
@MainActor
@Suite("Divider lengths (Divider.yaml v2 behavior 2)", .serialized)
struct DSDividerLengthTests {
    final class SizeProbe {
        var size: CGSize?
    }

    struct SizeReader: View {
        let probe: SizeProbe

        // Written out: a synthesized memberwise initializer of a type with a private member is private, which Swift 6.3
        // (Xcode 26.6, the CI pin) rejects at the call site.
        init(probe: SizeProbe) {
            self.probe = probe
        }

        var body: some View {
            GeometryReader { proxy in
                probe.size = proxy.size
                return Color.clear
            }
        }
    }

    /// What the layout is offered: iPhone 17's portrait screen, the size the snapshot matrix renders inside.
    nonisolated static let offer = CGSize(width: 402, height: 874)
    /// The density the probe lays out at; its card padding is the `content` inset.
    static let density = DSDensity.compact

    /// How a parent of the Divider gets its cross size.
    enum Parent: CustomStringConvertible {
        /// A stack under `fixedSize` on the Divider's cross axis: it sizes to its content.
        case contentSized
        /// A stack left to size itself, which takes all the length its flexible child is offered.
        case offered
        /// A stack in a frame of this cross size.
        case framed(CGFloat)

        var description: String {
            switch self {
            case .contentSized: "content-sized"
            case .offered: "offered \(DSDividerLengthTests.offer)"
            case let .framed(length): "framed at \(length)"
            }
        }
    }

    /// The Divider's own size, laid out beside a sibling box `sibling` long across the Divider's axis in the stack its
    /// orientation belongs in — a column for a horizontal Divider, a row for a vertical one — and the stack's size.
    static func measure(
        _ orientation: DSDividerOrientation,
        inset: DSDividerInset,
        sibling: CGFloat,
        parent: Parent
    ) -> (divider: CGSize, stack: CGSize)? {
        let divider = SizeProbe()
        let stack = SizeProbe()
        let rule = DSDivider(orientation: orientation, inset: inset).background(SizeReader(probe: divider))
        let content: AnyView = switch orientation {
        case .horizontal:
            AnyView(Self.cross(of: VStack(spacing: 0) {
                Color.clear.frame(width: sibling, height: 8)
                rule
            }, orientation, parent).background(SizeReader(probe: stack)))
        case .vertical:
            AnyView(Self.cross(of: HStack(spacing: 0) {
                Color.clear.frame(width: 8, height: sibling)
                rule
            }, orientation, parent).background(SizeReader(probe: stack)))
        }
        let renderer = ImageRenderer(content: DSTheme { content }.dsDensity(density))
        renderer.proposedSize = ProposedViewSize(offer)
        renderer.scale = 1
        _ = renderer.cgImage
        guard let dividerSize = divider.size, let stackSize = stack.size else { return nil }
        return (dividerSize, stackSize)
    }

    private static func cross(of stack: some View, _ orientation: DSDividerOrientation, _ parent: Parent) -> AnyView {
        switch (parent, orientation) {
        case (.contentSized, .horizontal): AnyView(stack.fixedSize(horizontal: true, vertical: false))
        case (.contentSized, .vertical): AnyView(stack.fixedSize(horizontal: false, vertical: true))
        case (.offered, _): AnyView(stack)
        case let (.framed(length), .horizontal): AnyView(stack.frame(width: length))
        case let (.framed(length), .vertical): AnyView(stack.frame(height: length))
        }
    }

    /// The length along the Divider's own axis, and its thickness across it.
    static func length(_ size: CGSize, _ orientation: DSDividerOrientation) -> CGFloat {
        orientation == .horizontal ? size.width : size.height
    }

    static func thickness(_ size: CGSize, _ orientation: DSDividerOrientation) -> CGFloat {
        orientation == .horizontal ? size.height : size.width
    }

    // MARK: - A parent that sizes to its content

    /// Beside a longer child, the Divider is exactly as long as that child, and the parent is no longer than it.
    @Test(arguments: DSDividerOrientation.allCases, DSDividerInset.allCases)
    func inAContentSizedParentItIsAsLongAsTheLongestOtherChild(_ orientation: DSDividerOrientation, _ inset: DSDividerInset) throws {
        let measured = try #require(Self.measure(orientation, inset: inset, sibling: 120, parent: .contentSized))
        #expect(Self.length(measured.divider, orientation) == 120, "\(orientation) \(inset): \(measured)")
        #expect(Self.length(measured.stack, orientation) == 120, "\(orientation) \(inset): \(measured)")
        #expect(Self.thickness(measured.divider, orientation) == 1, "\(orientation) \(inset): \(measured)")
    }

    /// Beside a child shorter than anything the Divider could claim, the parent is as long as that child or the two
    /// insets, whichever is longer: the Divider adds nothing of its own. With no inset that is the child's length; with
    /// `content` it is twice the card padding, and the painted line between the insets is empty.
    @Test(arguments: DSDividerOrientation.allCases, DSDividerInset.allCases)
    func itAddsNothingToAContentSizedParentButItsInsets(_ orientation: DSDividerOrientation, _ inset: DSDividerInset) throws {
        let sibling: CGFloat = 1
        let insets = 2 * DSDividerAppearance.inset(inset, DSDividerBindingTests.tokens(density: Self.density).space)
        let measured = try #require(Self.measure(orientation, inset: inset, sibling: sibling, parent: .contentSized))
        #expect(Self.length(measured.stack, orientation) == max(sibling, insets), "\(orientation) \(inset): \(measured)")
        #expect(Self.length(measured.divider, orientation) == max(sibling, insets), "\(orientation) \(inset): \(measured)")
    }

    // MARK: - A parent with a definite cross size

    /// A frame gives the parent its cross size, and the Divider runs the length of it.
    @Test(arguments: DSDividerOrientation.allCases, DSDividerInset.allCases)
    func inAFramedParentItRunsTheFrame(_ orientation: DSDividerOrientation, _ inset: DSDividerInset) throws {
        let measured = try #require(Self.measure(orientation, inset: inset, sibling: 120, parent: .framed(300)))
        #expect(Self.length(measured.divider, orientation) == 300, "\(orientation) \(inset): \(measured)")
    }

    /// A SwiftUI stack left to size itself is not a content-sized parent: the Divider is flexible along its length, so
    /// the stack takes all the length it is offered and the Divider runs that (`notes.platform.ios`). This is the case
    /// the spec's parent-that-sizes-to-its-content is written with `fixedSize` for.
    @Test(arguments: DSDividerOrientation.allCases)
    func aStackLeftToSizeItselfTakesTheOffer(_ orientation: DSDividerOrientation) throws {
        let measured = try #require(Self.measure(orientation, inset: .none, sibling: 120, parent: .offered))
        let offered = orientation == .horizontal ? Self.offer.width : Self.offer.height
        #expect(Self.length(measured.divider, orientation) == offered, "\(orientation): \(measured)")
        #expect(Self.length(measured.stack, orientation) == offered, "\(orientation): \(measured)")
    }
}
