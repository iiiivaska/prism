import SwiftUI
import DSCore
import DSTokens

/// Divider: one hairline that separates rows inside a single container (`spec/components/Divider.yaml`,
/// specVersion 2) — table and list rows, the rule under a tab rail, the edge between two columns of one panel.
///
///     VStack(spacing: tokens.space.step3) {
///         rowOne
///         DSDivider(inset: .content)
///         rowTwo
///     }
///
///     HStack { columnOne; DSDivider(orientation: .vertical); columnTwo }
///         .fixedSize(horizontal: false, vertical: true)
///
/// Everywhere else in Prism the luminance ladder and the spacing scale do the separating, so a Divider is the
/// exception, not the default: never between cards, groups or sections (`space.group-gap`, `space.section-gap`), and
/// never paired with a border or a shadow to show nesting.
///
/// Behaviour, from the spec:
///  - One line of `border.hairline`, and nothing else: no fill, no shadow, no second line, no gap of its own.
///  - `horizontal` stretches to the width of a parent that stacks its children in a column, `vertical` to the height
///    of one that stacks them in a row, and neither has a length of its own (behavior 2): its length is the parent's
///    cross size, and it never decides that size. A parent that sizes to its content is, in SwiftUI, a stack under
///    `fixedSize` on the Divider's cross axis — `.fixedSize(horizontal: true, vertical: false)` around a horizontal
///    Divider's `VStack`, `.fixedSize(horizontal: false, vertical: true)` around a vertical one's `HStack` — and there
///    the Divider is as long as the longest other child and adds nothing but its two insets, because its ideal length
///    is zero. That is how the web's shrink-to-fit box and flex row lay it out (`DSDividerLengthTests`).
///  - A stack left to size itself is not such a parent. The Divider is flexible along its length, so the stack takes
///    all the length it is offered instead of hugging its other children: an `HStack` of two content-sized columns and
///    a vertical Divider is as tall as its parent lets it be, where the web's flex row is as tall as its tallest
///    column. Give such a row `fixedSize` (as tall as its tallest column) or a `.frame(height:)`, and the two stacks
///    lay it out alike; turned on its side, the same holds for a horizontal Divider in a `VStack` whose rows are
///    narrower than the width it is offered (Divider.yaml `notes.platform.ios`).
///  - Neither orientation is placed along its own axis — a horizontal Divider as a sibling in an `HStack`, a vertical
///    one in a `VStack` — because the web gives it no length there while SwiftUI shares out the free space.
///  - `inset: .content` trims both ends by `space.card-padding`, so a rule inside a card starts at the content edge;
///    `.none` runs the full bleed. The inset is inside the Divider: its box runs the full length of the container and
///    the painted line is shorter at each end. The Divider owns no margin — the distance to the rows around it is the
///    layout's own spacing.
///  - The colour follows the material the enclosing `DSSurfaceView` publishes: `color.border.hairline` on the solid
///    family, `color.border.on-media` on vivid, `color.border.on-glass-fill` on glass. On `inverse` and `accent` it is
///    not set and the line paints nothing. Increase Contrast strengthens the line through the token alone, and under
///    the glass fallback the Surface publishes `raised`, so there is no contrast or transparency branch here.
///  - `isDecorative` (true by default) hides the line from assistive technology. On Apple `false` hides it too: there
///    is no separator trait, and the Divider speaks no word of its own (ADR-0032), so the line is never an
///    accessibility element here, whatever `isDecorative` says (Divider.yaml `notes.platform.ios`,
///    `DSDividerAppearance.hidesFromAssistiveTechnology`). The web exposes the non-decorative line as
///    `role="separator"`. It is not focusable and is no stop for the rotor.
///  - It never animates, so Reduce Motion has nothing to substitute.
///
/// watchOS is `none` in the spec: a watch screen separates with spacing and the luminance ladder, and
/// `DSComponentsManifest` declares no watch entry.
public struct DSDivider: View {
    private let orientation: DSDividerOrientation
    private let inset: DSDividerInset
    private let isDecorative: Bool

    private var ds = DSThemeValues()

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site. The one initializer carries no localized-key or verbatim
    // overload, because a Divider carries no text.

    /// - Parameters:
    ///   - orientation: `horizontal` by default. Either orientation takes its length from its parent's cross size and
    ///     never decides it; a parent that should size to its content says so with `fixedSize` on that axis, such as
    ///     an `HStack` under `.fixedSize(horizontal: false, vertical: true)` around a vertical Divider.
    ///   - inset: `none` by default; `content` pulls both ends in by `space.card-padding`.
    ///   - isDecorative: true by default, which hides the line from assistive technology. On Apple false hides it
    ///     as well, because no platform role says "separator" here; the web exposes it as `role="separator"`.
    public init(
        orientation: DSDividerOrientation = .horizontal,
        inset: DSDividerInset = .none,
        isDecorative: Bool = true
    ) {
        self.orientation = orientation
        self.inset = inset
        self.isDecorative = isDecorative
    }

    public var body: some View {
        let tokens = ds.tokens
        let color = DSDividerAppearance.color(on: ds.surface.material).map { tokens[keyPath: $0] }
        let thickness = DSDividerAppearance.thickness(tokens.border)
        let inset = DSDividerAppearance.inset(inset, tokens.space)
        return line(Rectangle().fill(color ?? .clear), thickness: thickness, inset: inset)
            .accessibilityHidden(DSDividerAppearance.hidesFromAssistiveTechnology(isDecorative: isDecorative))
    }

    /// The painted line, `inset` short of each end, inside a box that runs the container's full length.
    ///
    /// The line is flexible along its axis from zero to anything, and its ideal length there is **zero**: a Divider has
    /// no length of its own (behavior 2). Offered a length, it takes all of it; asked for its ideal size — by a stack
    /// under `fixedSize`, a parent that sizes to its content — it claims nothing but its two insets, so the parent is as
    /// long as its other children and the line runs that. Without the explicit ideal, a shape's is SwiftUI's default of
    /// 10 pt, which makes a content-sized parent 10 pt longer than the web's shrink-to-fit box, where the Divider's
    /// intrinsic length is zero plus its padding (`DSDividerLengthTests`).
    @ViewBuilder
    private func line(_ rule: some View, thickness: CGFloat, inset: CGFloat) -> some View {
        switch orientation {
        case .horizontal:
            rule
                .frame(minWidth: 0, idealWidth: 0, maxWidth: .infinity)
                .frame(height: thickness)
                .padding(.horizontal, inset)
        case .vertical:
            rule
                .frame(minHeight: 0, idealHeight: 0, maxHeight: .infinity)
                .frame(width: thickness)
                .padding(.vertical, inset)
        }
    }
}
