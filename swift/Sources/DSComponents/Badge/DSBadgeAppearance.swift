import SwiftUI
import DSCore
import DSTokens

/// Every value `spec/components/Badge.yaml` (specVersion 1) binds, as pure functions of the props and the token set,
/// and the text rules of behaviors 3 to 10 as pure functions of the props, the locale and the strings table, so the
/// binding matrix and every name run on the host. `DSBadge` only draws and exposes what these return.
///
/// Badge has no material axis: its three fills are opaque, so nothing here reads the Surface a badge sits on, and an
/// outline badge is simply never placed over media (behavior 12). Nothing here is keyed by density either, so a badge
/// is the same in every density (`DSBadgeBindingTests.everyDimensionIsTheSameInEveryDensity`).
///
/// The web's twins are the `--ds--badge-*` properties of `Badge.css` for the bindings and `badge/text.ts` for the text
/// rules (`web/packages/react/src/badge/`). Both stacks assert the same vectors byte for byte:
/// `DSBadgeBindingTests.vectors` on Apple, and `web/packages/react/test/badge.test.tsx` on the web.
nonisolated enum DSBadgeAppearance {
    // MARK: - tokens.root

    /// `tokens.root.background`: the tone's solid fill for `filled` — `comp.badge.{tone}.bg`, the inverse solid, the
    /// accent fill and the badge red — and nothing for `outline`, which has no fill at all (behavior 11).
    static func background(_ emphasis: DSBadgeEmphasis, _ tone: DSBadgeTone) -> DSColorPath? {
        switch (emphasis, tone) {
        case (.filled, .neutral): \.components.badge.neutralBg
        case (.filled, .accent): \.components.badge.accentBg
        case (.filled, .critical): \.components.badge.criticalBg
        case (.outline, _): nil
        }
    }

    /// `tokens.root.border`: the outline badge's stroke, `color.border.strong`, `color.accent` or
    /// `color.text.critical`; a filled badge has no border (`accessibility.contrast`: decorative beside the digits, and
    /// `color.border.strong` carries the boundary tier).
    static func border(_ emphasis: DSBadgeEmphasis, _ tone: DSBadgeTone) -> DSColorPath? {
        switch (emphasis, tone) {
        case (.outline, .neutral): \.color.borderStrong
        case (.outline, .accent): \.color.accent
        case (.outline, .critical): \.color.textCritical
        case (.filled, _): nil
        }
    }

    /// `tokens.root.borderWidth`: `border.hairline` for `outline` and nothing for `filled`, so a filled badge carries
    /// no border width with no border colour. The stroke is drawn inside the shape (`strokeBorder`) and never adds to
    /// the layout, as the web's inset shadow does not.
    static func borderWidth(_ emphasis: DSBadgeEmphasis) -> KeyPath<DSTokenSet, CGFloat>? {
        switch emphasis {
        case .outline: \.border.hairline
        case .filled: nil
        }
    }

    /// `tokens.root.radius`: `radius.control`, the pill. It is larger than half of any badge's height, and
    /// `RoundedRectangle` clamps a corner to half the shorter side, so a one-digit pill and the dot are circles and a
    /// wider pill is a capsule, as `border-radius` clamps on the web.
    static var radius: KeyPath<DSTokenSet, CGFloat> { \.radius.control }

    /// `tokens.root.height`: at least `size.icon.md` for `count` — the pill grows past it only when Dynamic Type grows
    /// the digits — and exactly `space.3` for `dot` (behavior 2).
    static func height(_ variant: DSBadgeVariant) -> KeyPath<DSTokenSet, CGFloat> {
        switch variant {
        case .count: \.size.iconMd
        case .dot: \.space.step3
        }
    }

    /// `tokens.root.minWidth`: `size.icon.md` for `count`, the height's own floor, so one digit sits in a circle and
    /// more digits widen the pill past it; and `space.3` for `dot`, which is a square (behavior 2).
    static func minWidth(_ variant: DSBadgeVariant) -> KeyPath<DSTokenSet, CGFloat> {
        switch variant {
        case .count: \.size.iconMd
        case .dot: \.space.step3
        }
    }

    /// `tokens.root.paddingX`: `space.1` either side of the digits of a count badge; the dot has no digits and no
    /// padding.
    static func paddingX(_ variant: DSBadgeVariant) -> KeyPath<DSTokenSet, CGFloat>? {
        switch variant {
        case .count: \.space.step1
        case .dot: nil
        }
    }

    // MARK: - tokens.label

    /// `tokens.label.typography`: `type.micro`, the only role allowed below 12 px, and only for badge digits
    /// (behavior 3).
    static let labelRole: DSTextRole = .micro

    /// The digits are tabular (behavior 8, ADR-0021 §5): a count changes while it is on screen, so its digit column must
    /// not move. `type.micro`'s own figures are proportional, so this is the override `DSText(numeric:)` applies through
    /// DSCore's one figures route.
    static let figures: DSTextNumeric = .tabular

    /// `tokens.label.color`: the tone's own ink on its solid for `filled` (`comp.badge.{tone}.text`), and for `outline`
    /// the text ramp — `color.text.secondary`, `color.text.accent`, `color.text.critical` — which is checked on the
    /// page and the solid surfaces an outline badge sits on (`accessibility.contrast`).
    static func labelColor(_ emphasis: DSBadgeEmphasis, _ tone: DSBadgeTone) -> DSColorPath {
        switch (emphasis, tone) {
        case (.filled, .neutral): \.components.badge.neutralText
        case (.filled, .accent): \.components.badge.accentText
        case (.filled, .critical): \.components.badge.criticalText
        case (.outline, .neutral): \.color.textSecondary
        case (.outline, .accent): \.color.textAccent
        case (.outline, .critical): \.color.textCritical
        }
    }

    // MARK: - motion

    /// `motion.count`: `motion.duration.quick`, the time the new digits of a changed count take to replace the old ones.
    /// `countChangeDuration(_:)` reads it through `DSMotion`; the key path is what the binding test holds against the
    /// spec's cell.
    static var countChange: KeyPath<DSTokenSet, Double> { \.motion.durationQuick }

    /// `motion.reduceMotion`: `instant`. Under Reduce Motion a changed count is replaced at once; it never rolls or
    /// counts up, and the badge never pulses (`accessibility.reduceMotion`, behavior 15).
    static let reduceMotion: DSReduceMotionBehavior = .instant

    /// Whether a changed count fades its new digits in: always, except under Reduce Motion.
    static func runsCountChange(_ motion: DSMotion) -> Bool {
        motion.runsDecorativeAnimations(reduceMotion)
    }

    /// How long the new digits of a changed count take to appear: `motion.duration.quick`, or `motion.duration.instant`
    /// under Reduce Motion.
    static func countChangeDuration(_ motion: DSMotion) -> TimeInterval {
        motion.decorativeDuration(motion.tokens.durationQuick, behavior: reduceMotion)
    }

    /// The animation the new digits of a changed count fade in on: `countChangeDuration` on `motion.easing.out`, the
    /// easing of a state change on the non-spring path (ADR-0023 §9). The old digits leave at once and the pill takes
    /// its new width at once: this is a replacement, never a roll. nil under Reduce Motion, so the new digits appear at
    /// once even inside a caller's own animation. Icon's `symbolChangeAnimation` is the same quartet.
    static func countChangeAnimation(_ motion: DSMotion) -> Animation? {
        guard runsCountChange(motion) else { return nil }
        return motion.animation(motion.tokens.easingOut, duration: countChangeDuration(motion))
    }

    // MARK: - What a badge shows and says (behaviors 3 to 10)

    /// Whether a badge renders at all (behavior 9): a dot always, whatever `count` says; a count badge only for a
    /// `count` of at least 1. `count: 0`, a negative count and no count at all render nothing — no element, no name,
    /// no contribution to a host. The web's twin, `isBadgeVisible` (`badge/text.ts`), also rejects the non-integers a
    /// JavaScript number can be — a fraction, `NaN`, an infinity, an integer beyond the safe range — which a Swift `Int`
    /// cannot.
    static func isVisible(_ variant: DSBadgeVariant, count: Int?) -> Bool {
        switch variant {
        case .dot: true
        case .count: (count ?? 0) >= 1
        }
    }

    /// A number as the reader's locale writes it (behavior 7, ADR-0032 rule 4): the platform's own formatter, in the
    /// locale of SwiftUI's `locale` environment value, never digits pasted together. The web's twin is
    /// `formatBadgeNumber`, `Intl.NumberFormat` in React Aria's `useLocale()` locale.
    static func formatted(_ number: Int, locale: Locale) -> String {
        number.formatted(.number.locale(locale))
    }

    /// What a count badge draws (behavior 3): its count, formatted; above `max`, the `strings.Badge.overflow` template
    /// filled with `max`, formatted — "99+" under the English defaults — because four digits do not fit its silhouette.
    /// `count` and `max` are compared as numbers, before either is formatted (behavior 9). The web's twin is
    /// `badgeDrawn`, which first reads a `max` that is not a safe integer as 99.
    static func drawn(count: Int, max: Int, locale: Locale, strings: DSStrings) -> String {
        guard count > max else { return formatted(count, locale: locale) }
        return DSStrings.fill(strings.badgeOverflow, ["max": formatted(max, locale: locale)])
    }

    /// What a badge contributes to the name of what it marks, and the name of a badge that stands alone (behaviors 4, 5
    /// and 10, `accessibility.label`), or nil when it contributes nothing.
    ///
    /// - A dot contributes its `label`, and nothing without one.
    /// - A count badge that is not visible contributes nothing.
    /// - A count badge with a `label` contributes the `strings.Badge.count` template filled with the **true** count —
    ///   above `max` too — and the label as written: "3 unread alerts", "128 open incidents" while it draws "99+".
    /// - A count badge with no `label` contributes its formatted count alone and fills no template (ADR-0032 rule 10),
    ///   so a host named "Alerts" reads "Alerts, 3".
    ///
    /// `label` is the string the caller's key resolves to where the badge renders; one that is empty or nothing but
    /// whitespace (`DSIconAppearance.isBlank`, the web's `trim()`) is no label. The web's twin is `badgeContribution`.
    static func contribution(
        _ variant: DSBadgeVariant,
        count: Int?,
        label: String?,
        locale: Locale,
        strings: DSStrings
    ) -> String? {
        let label = label.flatMap { DSIconAppearance.isBlank($0) ? nil : $0 }
        switch variant {
        case .dot:
            return label
        case .count:
            guard isVisible(variant, count: count), let count else { return nil }
            let number = formatted(count, locale: locale)
            guard let label else { return number }
            return DSStrings.fill(strings.badgeCount, ["count": number, "label": label])
        }
    }

    /// Behavior 10: a badge is exposed to assistive technology only when it has a `label` and no host reads it, and it
    /// is then one element named by its `contribution`. Every other badge that renders is hidden: one with no label, and
    /// one inside a host — IconButton's `badge` slot among them — even with a label, because the host speaks the
    /// badge's contribution in its own accessibility value and a second element would say the count twice. The web's
    /// twin is `isBadgeExposed`.
    static func isExposed(hasLabel: Bool, isHosted: Bool) -> Bool {
        hasLabel && !isHosted
    }
}

private struct DSBadgeIsHostedKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    /// True inside a host that reads the badge as part of its own accessibility value — IconButton's `badge` slot (P4-4)
    /// — where the badge is never an element of its own, even when it carries a `label` (Badge.yaml behavior 10). False
    /// by default: a badge standing alone, leading or trailing a row, is exposed when it has a label. The host sets it
    /// on its slot and carries `DSBadgeAppearance.contribution` into its value; the web's twin is `BadgeHostContext`.
    var dsBadgeIsHosted: Bool {
        get { self[DSBadgeIsHostedKey.self] }
        set { self[DSBadgeIsHostedKey.self] = newValue }
    }
}
