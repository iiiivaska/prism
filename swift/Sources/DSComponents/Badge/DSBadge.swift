import SwiftUI
import DSCore
import DSTokens

/// Badge: a static mark that carries a count or an unread state (`spec/components/Badge.yaml`, specVersion 1) — a
/// filled or outlined pill of digits, or a bare dot.
///
///     DSBadge(count: 3, label: "unread alerts")
///     DSBadge(count: 128, tone: .critical, max: 99, label: "open incidents")
///     DSBadge(variant: .dot, tone: .critical, label: "unread")
///
/// It is never pressable and never the target of a gesture: the control it marks carries the action and the
/// accessibility label, so a badge has no action, hover or focus, is not hit-testable, and never enlarges a host's hit
/// region (behavior 1).
///
/// Behaviour, from the spec:
///  - `count` is a pill at least `size.icon.md` tall and wide: one digit sits in a `size.icon.md` circle, and more
///    digits keep its height and capsule shape and widen it to hug them with `space.1` either side; `dot` is a
///    `space.3` circle with no digits (behavior 2). The pill never truncates or wraps its digits.
///  - Above `max` (99 by default) it draws the `strings.Badge.overflow` template, "99+" under the English defaults,
///    in `type.micro`, the only role allowed below 12 px (behavior 3). The digits are tabular (behavior 8, ADR-0021 §5)
///    and go through DSCore's one figures route, `dsText(_:figures:)`, by way of `DSText`.
///  - `count` and `max` are written by the platform's number formatter in SwiftUI's `locale` environment value, never
///    pasted together; Badge has no locale of its own (behavior 7, ADR-0032 rules 4 and 6).
///  - `count: 0`, a negative count and a count badge with no `count` render nothing at all — no element and no name. A
///    dot ignores `count` (behavior 9).
///  - Exposure (behavior 10, `notes.platform.ios`): a badge with a `label` that no host reads is one accessibility
///    element, with no trait (`traits: []`), named by what it contributes — the `strings.Badge.count` template filled
///    with the **true** count and the label ("3 unread alerts", and "128 open incidents" while it draws "99+"), or a
///    dot's label alone ("unread"). Every other badge is hidden: one with no label or with a label that resolves to
///    nothing but whitespace (Icon's rule), and one inside a host that reads it — IconButton's `badge` slot — even with
///    a label, because the host speaks the badge in its own accessibility value. The web exposes the same badge as
///    `role="img"`; the role is the stacks' one difference and the name is byte-identical.
///  - The fills are opaque, so a filled badge is the same on every ground and reads no Surface context; an outline
///    badge is never placed over a map, an image, a vivid surface or glass (behaviors 11 and 12).
///  - Badge applies no offset and never changes the layout of what it marks: a host that anchors it on a corner
///    offsets it by its own `tokens.badge.offset` (IconButton, StatCard), and a badge in a row sits in the row's flow
///    (behavior 13).
///  - A changed count is replaced, never rolled: the new digits fade in over `motion.duration.quick` while the old ones
///    leave at once, and under Reduce Motion they appear at once. The badge never pulses (behavior 15, `motion`).
///  - The digits scale with Dynamic Type through `type.micro`'s text style and the pill grows with them; the dot does
///    not scale (`accessibility.dynamicType`). The web has no Dynamic Type, so this is the one layout the stacks do not
///    share, and it is correct.
///
/// watchOS is `none` in the spec — a watch alert row shows its count with Text at the micro role instead — and
/// `DSComponentsManifest` declares no watch entry.
public struct DSBadge: View {
    private let count: Int?
    private let variant: DSBadgeVariant
    private let tone: DSBadgeTone
    private let emphasis: DSBadgeEmphasis
    private let max: Int
    private let label: LocalizedStringKey?

    private var ds = DSThemeValues()
    /// The locale the digits are formatted in and the `label` is resolved in (ADR-0032 rule 4).
    @Environment(\.locale) private var locale
    /// The app's strings table, whose `Badge.count` and `Badge.overflow` templates the badge fills (ADR-0032).
    @Environment(\.dsStrings) private var strings
    /// True inside a host that reads the badge as part of its own accessibility value (behavior 10).
    @Environment(\.dsBadgeIsHosted) private var isHosted

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site. There is one initializer, mirroring the spec's six props as
    // `DSIcon` mirrors Icon's: `label` is only ever spoken, so it takes a localized key and needs no verbatim overload,
    // and "a count badge with no count renders nothing" is the same runtime rule here as on the web.

    /// - Parameters:
    ///   - count: the value shown; required for a count badge, whose `count` of 0, a negative count or none renders
    ///     nothing. A dot ignores it.
    ///   - variant: `count` by default; `dot` is a bare `space.3` circle for "there is something new".
    ///   - tone: `neutral` by default, the inverse solid; `accent` is the one attention fill, `critical` the danger disc.
    ///   - emphasis: `filled` by default, the solid mark; `outline` is the resting sibling beside a filled badge and is
    ///     never placed over media.
    ///   - max: counts above it draw the `strings.Badge.overflow` mark, "99+" by default; the name still speaks the
    ///     true count.
    ///   - label: what the count means, for assistive technology ("unread alerts"), resolved in the app's bundle and
    ///     the environment's locale. Required when the badge stands alone; a badge inside a host whose own name says
    ///     what is counted may leave it out. With no label, or one that resolves to nothing but whitespace, the badge
    ///     is hidden and contributes its formatted count alone (a dot, nothing).
    public init(
        count: Int? = nil,
        variant: DSBadgeVariant = .count,
        tone: DSBadgeTone = .neutral,
        emphasis: DSBadgeEmphasis = .filled,
        max: Int = 99,
        label: LocalizedStringKey? = nil
    ) {
        self.count = count
        self.variant = variant
        self.tone = tone
        self.emphasis = emphasis
        self.max = max
        self.label = label
    }

    public var body: some View {
        if DSBadgeAppearance.isVisible(variant, count: count) {
            let resolved = label.map { DSIconAppearance.resolved($0, locale: locale) }
            let hasLabel = resolved.map { !DSIconAppearance.isBlank($0) } ?? false
            let name = DSBadgeAppearance.contribution(variant, count: count, label: resolved, locale: locale, strings: strings)
            let exposed = DSBadgeAppearance.isExposed(hasLabel: hasLabel, isHosted: isHosted)
            mark
                .allowsHitTesting(false)
                .modifier(DSBadgeAccessibility(name: exposed ? name : nil))
        }
    }

    /// The pill or the dot, filled and stroked as `DSBadgeAppearance` binds them.
    private var mark: some View {
        let tokens = ds.tokens
        let shape = RoundedRectangle(cornerRadius: tokens[keyPath: DSBadgeAppearance.radius], style: .continuous)
        let fill: Color? = DSBadgeAppearance.background(emphasis, tone).map { tokens[keyPath: $0] }
        let stroke: Color? = DSBadgeAppearance.border(emphasis, tone).map { tokens[keyPath: $0] }
        let strokeWidth: CGFloat = DSBadgeAppearance.borderWidth(emphasis).map { tokens[keyPath: $0] } ?? 0
        let height = tokens[keyPath: DSBadgeAppearance.height(variant)]
        let minWidth = tokens[keyPath: DSBadgeAppearance.minWidth(variant)]
        return face(height: height, minWidth: minWidth, tokens: tokens)
            .background {
                if let fill { shape.fill(fill) }
            }
            .overlay {
                // Inside the shape, so the stroke never adds to the badge's size (the web's inset shadow).
                if let stroke { shape.strokeBorder(stroke, lineWidth: strokeWidth) }
            }
    }

    /// A count badge's digits, padded and held to the floors, or the dot's fixed square.
    @ViewBuilder
    private func face(height: CGFloat, minWidth: CGFloat, tokens: DSTokenSet) -> some View {
        switch variant {
        case .count:
            let paddingX: CGFloat = DSBadgeAppearance.paddingX(variant).map { tokens[keyPath: $0] } ?? 0
            DSBadgeDigits(
                drawn: DSBadgeAppearance.drawn(count: count ?? 0, max: max, locale: locale, strings: strings),
                color: tokens[keyPath: DSBadgeAppearance.labelColor(emphasis, tone)],
                animation: DSBadgeAppearance.countChangeAnimation(ds.motion)
            )
            .padding(.horizontal, paddingX)
            .frame(minWidth: minWidth, minHeight: height)
            // The pill hugs its digits between the floors and never truncates them, whatever its parent proposes.
            .fixedSize()
        case .dot:
            Color.clear.frame(width: minWidth, height: height)
        }
    }
}

/// The digits of a count badge: `type.micro`, tabular, in the label colour, replaced when they change.
///
/// **The replacement, never a roll.** `DSText` rolls a string that counts up over `motion.duration.slow`
/// (`DSTextAppearance.countsUp`), which Badge's motion contract forbids (`accessibility.reduceMotion`: "does not roll or
/// count up"). `.id(drawn)` makes changed digits a new view, so `DSText` never sees its own string change and never
/// rolls; the new view fades in over `DSBadgeAppearance.countChangeAnimation`, the old one leaves at once, and the pill
/// takes its new width at once, because only the digits sit under the animation. The first render never animates, and
/// under Reduce Motion the animation is nil, so the new digits simply appear.
///
/// Internal rather than private so that `DSBadgeBindingTests.aChangedCountIsReplacedNeverRolled` can read the identity
/// the digits are drawn under; that test fails if the `.id(drawn)` goes.
struct DSBadgeDigits: View {
    let drawn: String
    let color: Color
    let animation: Animation?

    // Written out for the reason `DSBadge.init` is.
    init(drawn: String, color: Color, animation: Animation?) {
        self.drawn = drawn
        self.color = color
        self.animation = animation
    }

    var body: some View {
        ZStack {
            DSText(verbatim: drawn, role: DSBadgeAppearance.labelRole, tone: nil, numeric: DSBadgeAppearance.figures)
                .id(drawn)
                .transition(.asymmetric(insertion: .opacity, removal: .identity))
        }
        .animation(animation, value: drawn)
        .foregroundStyle(color)
    }
}

/// Badge's accessibility (behavior 10, `notes.platform.ios`): one element named by what the badge contributes, or
/// nothing at all.
///
/// `.ignore` drops the digits' own text element, so VoiceOver reads the name once and never "99+" beside it. No trait
/// is added (`traits: []`) and no value, hint or focus is set: the badge is not a control.
private struct DSBadgeAccessibility: ViewModifier {
    let name: String?

    init(name: String?) {
        self.name = name
    }

    func body(content: Content) -> some View {
        if let name {
            content
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(Text(verbatim: name))
        } else {
            content.accessibilityHidden(true)
        }
    }
}
