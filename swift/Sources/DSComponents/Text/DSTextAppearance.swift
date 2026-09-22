import SwiftUI
import DSCore
import DSTokens

/// Every value `spec/components/Text.yaml` binds, as pure functions of the published surface context, the role and
/// the size the role renders at, so the colour tables and the count-up rule run on the host.
nonisolated enum DSTextAppearance {
    // MARK: - Tones

    /// Whether the dimmed tone and the trailing group may render: metric roles at 24 px or more (Text.yaml behavior,
    /// ADR-0011). `size` is the role's token size, the size the contrast pairs are checked at, so a tone never changes
    /// with the reader's Dynamic Type size; `metric-xl` and `metric-lg` qualify and `metric-md` (20 px) does not.
    static func allowsDimmed(role: DSTextRole, size: CGFloat) -> Bool {
        role.isMetric && DSAccessibilityPolicy.allowsDimmedTone(atSize: size)
    }

    /// The tone that renders: `dimmed` resolves to `secondary` wherever it is not permitted.
    static func tone(_ tone: DSTextTone, role: DSTextRole, size: CGFloat) -> DSTextTone {
        tone == .dimmed && !allowsDimmed(role: role, size: size) ? .secondary : tone
    }

    /// `tokens.root.color`: the tone's token on the published material and backdrop kind; nil for `inherit`, which
    /// sets no foreground.
    static func root(_ tone: DSTextTone?, role: DSTextRole, size: CGFloat, surface: DSSurfaceContext) -> DSColorToken? {
        tone.map { surface.colorToken(for: self.tone($0, role: role, size: size)) }
    }

    /// `tokens.trailing.color`: the dimmed tone of the published material (`color.text.dimmed` on the solid family,
    /// the material's single foreground on vivid, light glass and inverse), or `secondary` below 24 px.
    static func trailing(role: DSTextRole, size: CGFloat, surface: DSSurfaceContext) -> DSColorToken {
        surface.colorToken(for: tone(.dimmed, role: role, size: size))
    }

    /// `tokens.unit.color`: the secondary tone of the published material.
    static func unit(surface: DSSurfaceContext) -> DSColorToken {
        surface.colorToken(for: .secondary)
    }

    // MARK: - Count-up (Text.yaml behavior and motion)

    /// Whether a change from `old` to `new` counts up, and so animates over `motion.duration.slow`.
    ///
    /// Text never parses its strings as numbers, so it never draws a value it was not given. A change counts up when
    /// both strings have the same length and the same non-digit characters in the same positions — the digits of one
    /// number format moving — and the first digit that differs is greater in `new`, or smaller when the number is
    /// negative (a minus sign before the first digit). Any other change — a different length, a separator or sign
    /// that moves, a value that goes down, any non-numeric change — only replaces the value, which does not animate.
    static func countsUp(from old: String, to new: String) -> Bool {
        let before = Array(old)
        let after = Array(new)
        guard before.count == after.count, before != after else { return false }
        var firstChange: (from: Int, to: Int)?
        var sawDigit = false
        var negative = false
        for (a, b) in zip(before, after) {
            let digitA = decimalDigit(a)
            let digitB = decimalDigit(b)
            switch (digitA, digitB) {
            case (nil, nil):
                guard a == b else { return false }
                if !sawDigit, minusSigns.contains(a) { negative = true }
            case let (x?, y?):
                sawDigit = true
                if firstChange == nil, x != y { firstChange = (x, y) }
            default:
                return false
            }
        }
        guard let change = firstChange else { return false }
        return negative ? change.to < change.from : change.to > change.from
    }

    /// Hyphen-minus and U+2212 MINUS SIGN.
    private static let minusSigns: Set<Character> = ["-", "\u{2212}"]

    /// The value of a decimal digit (Unicode category Nd) in any script, or nil.
    private static func decimalDigit(_ character: Character) -> Int? {
        guard character.unicodeScalars.count == 1, let scalar = character.unicodeScalars.first,
              scalar.properties.generalCategory == .decimalNumber,
              let value = scalar.properties.numericValue
        else { return nil }
        return Int(value)
    }

    // MARK: - Truncation (Text.yaml behavior, docs/research/visual-dna.md §4.15)

    /// The lines a text shows before it is cut: nil for `none`, which never cuts; otherwise `maxLines`, or 1 for an
    /// identifier's `ellipsis` and 3 for prose's `fade`.
    static func lineLimit(_ truncation: DSTextTruncation, maxLines: Int?) -> Int? {
        switch truncation {
        case .none: nil
        case .ellipsis: max(1, maxLines ?? 1)
        case .fade: max(1, maxLines ?? 3)
        }
    }

    /// Whether the text keeps the copy affordance: Text.yaml behavior, "ids truncate with an ellipsis and keep the
    /// copy affordance".
    ///
    /// An id is the `data` role cut with an ellipsis — the role Text.yaml's own truncation example gives an
    /// identifier, and the role whose figures are tabular because it carries a value and not prose. The truncation
    /// alone cannot decide it: Prism's own components cut with `ellipsis` too (`DSCard`'s title and caption,
    /// `DSButton`'s label), and those are the label of a control, not a value to copy — making a button's label
    /// selectable would also put a selection gesture on top of the button's own.
    static func isCopyable(role: DSTextRole, truncation: DSTextTruncation) -> Bool {
        role == .data && truncation == .ellipsis
    }

    /// The opacities of cut prose: every visible line at 1, the last two at 0.6 and 0.25 of the tone. Text that is
    /// not cut keeps every line at 1.
    static func fadeOpacities(lines: Int, overflowing: Bool) -> [Double] {
        guard lines > 0 else { return [] }
        guard overflowing else { return Array(repeating: 1, count: lines) }
        let tail = Array(fadeSteps.suffix(lines))
        return Array(repeating: 1, count: lines - tail.count) + tail
    }

    static let fadeSteps: [Double] = [0.6, 0.25]

    /// One faded line has no line above it to keep: once it is cut, its leading two thirds stay at 1 and its trailing
    /// third steps down to 0.6 and then 0.25 of the tone. The fractions of the line's width add up to 1.
    static func singleLineFade(overflowing: Bool) -> [(fraction: CGFloat, opacity: Double)] {
        guard overflowing else { return [(1, 1)] }
        return [(0.67, 1), (0.17, fadeSteps[0]), (0.16, fadeSteps[1])]
    }

    // MARK: - Accessibility

    /// "Heading level when role is title-* or display-*": display roles and `title-lg` are level 1, `title-md` 2 and
    /// `title-sm` 3; every other role is no heading.
    static func headingLevel(_ role: DSTextRole) -> AccessibilityHeadingLevel? {
        switch role {
        case .displayXl, .displayLg, .displayMd, .titleLg: .h1
        case .titleMd: .h2
        case .titleSm: .h3
        default: nil
        }
    }
}
