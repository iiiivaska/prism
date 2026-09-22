import SwiftUI
import DSCore
import DSTokens

/// A type role of `spec/components/Text.yaml` (`props.role`), bound by `tokens.root.typography` to `type.<role>`.
/// The raw value is the spec's own spelling.
nonisolated public enum DSTextRole: String, CaseIterable, Hashable, Sendable {
    case displayXl = "display-xl"
    case displayLg = "display-lg"
    case displayMd = "display-md"
    case titleLg = "title-lg"
    case titleMd = "title-md"
    case titleSm = "title-sm"
    case headline
    case bodyLg = "body-lg"
    case bodyMd = "body-md"
    case bodySm = "body-sm"
    case labelLg = "label-lg"
    case labelMd = "label-md"
    case labelSm = "label-sm"
    case caption
    case micro
    case eyebrow
    case metricXl = "metric-xl"
    case metricLg = "metric-lg"
    case metricMd = "metric-md"
    case data

    /// The `DSTokenSet.Typography` member the role binds, which is what DSCore's `dsText(_:figures:)` renders.
    public var keyPath: KeyPath<DSTokenSet.Typography, DSTypeRole> {
        switch self {
        case .displayXl: \.displayXl
        case .displayLg: \.displayLg
        case .displayMd: \.displayMd
        case .titleLg: \.titleLg
        case .titleMd: \.titleMd
        case .titleSm: \.titleSm
        case .headline: \.headline
        case .bodyLg: \.bodyLg
        case .bodyMd: \.bodyMd
        case .bodySm: \.bodySm
        case .labelLg: \.labelLg
        case .labelMd: \.labelMd
        case .labelSm: \.labelSm
        case .caption: \.caption
        case .micro: \.micro
        case .eyebrow: \.eyebrow
        case .metricXl: \.metricXl
        case .metricLg: \.metricLg
        case .metricMd: \.metricMd
        case .data: \.data
        }
    }

    /// The metric roles: the only ones that carry a trailing group and a hung unit, and the only ones the dimmed
    /// tone is permitted on (Text.yaml props and behavior).
    public var isMetric: Bool { self == .metricXl || self == .metricLg || self == .metricMd }

    /// The display and title roles, which are headings for assistive technologies (Text.yaml accessibility).
    public var isHeading: Bool {
        switch self {
        case .displayXl, .displayLg, .displayMd, .titleLg, .titleMd, .titleSm: true
        default: false
        }
    }

    /// The role that renders on this platform. On watchOS display roles collapse to `title-sm` and title roles to
    /// `headline` (Text.yaml `notes.platform.watchos`); the watch hero keeps `metric-xl`, whose size the `watch`
    /// platform context sets (ADR-0030 §7.2).
    public func rendered(isWatch: Bool = DSPlatform.isWatch) -> DSTextRole {
        guard isWatch else { return self }
        switch self {
        case .displayXl, .displayLg, .displayMd: return .titleSm
        case .titleLg, .titleMd, .titleSm: return .headline
        default: return self
        }
    }

    /// The largest Dynamic Type size the role scales to: `metric-xl` clamps at accessibility3 so cards do not
    /// overflow (Text.yaml accessibility); every other role scales all the way.
    public var dynamicTypeSizes: ClosedRange<DynamicTypeSize> {
        self == .metricXl ? DynamicTypeSize.xSmall...DynamicTypeSize.accessibility3 : DynamicTypeSize.xSmall...DynamicTypeSize.accessibility5
    }
}

/// Figures (`props.numeric`, ADR-0021 §5): `auto` takes the role's own — tabular for `data`, proportional for every
/// other role, the metric roles included — and a live value that changes while visible sets `tabular`.
nonisolated public enum DSTextNumeric: String, CaseIterable, Hashable, Sendable {
    case auto, proportional, tabular

    /// The figures a role renders with under this choice.
    public func figures(for role: DSTypeRole) -> DSNumericSpacing {
        switch self {
        case .auto: role.numeric
        case .proportional: .proportional
        case .tabular: .tabular
        }
    }
}

/// How text that does not fit ends (`props.truncation`).
nonisolated public enum DSTextTruncation: String, CaseIterable, Hashable, Sendable {
    /// Never cut: the text wraps to as many lines as it needs.
    case none
    /// A trailing ellipsis after `maxLines` lines (1 by default): identifiers and ids.
    case ellipsis
    /// No ellipsis: after `maxLines` lines (3 by default) the last two visible lines fade to 60 % and 25 % of the tone
    /// (docs/research/visual-dna.md §4.15), which invites the reader to expand generated or long prose. A single faded
    /// line does not wrap, and its trailing third steps down instead.
    case fade
}
