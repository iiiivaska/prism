import SwiftUI
import DSCore
import DSTokens

/// The variant of a Button: `spec/components/Button.yaml` `props.variant`.
nonisolated public enum DSButtonVariant: String, CaseIterable, Hashable, Sendable {
    /// The single solid pill of a group: the inverse solid, which turns white on vivid.
    case primary
    /// A raised pill with a hairline.
    case secondary
    /// An outline with no fill at rest (ADR-0029 §3.3).
    case ghost
    /// A critical tint with critical text and outline.
    case danger

    /// The variant that renders on this platform: on watchOS ghost renders as secondary (Button.yaml
    /// `notes.platform.watchos`).
    public func rendered(isWatch: Bool = DSPlatform.isWatch) -> DSButtonVariant {
        isWatch && self == .ghost ? .secondary : self
    }
}

/// The size of a Button: `props.size`, bound to `comp.button.height.*`, `comp.button.padding-x.*` and `type.label.*`.
/// Heights follow density (`size.control.*`, ADR-0024 §7.1); the hit region follows modality.
nonisolated public enum DSButtonSize: String, CaseIterable, Hashable, Sendable {
    case sm, md, lg

    /// The size that renders on this platform: on watchOS every size collapses to `lg`, which the watch density makes
    /// 44 pt (Button.yaml `notes.platform.watchos`).
    public func rendered(isWatch: Bool = DSPlatform.isWatch) -> DSButtonSize {
        isWatch ? .lg : self
    }

    /// `tokens.label.typography`.
    public var labelRole: DSTextRole {
        switch self {
        case .sm: .labelSm
        case .md: .labelMd
        case .lg: .labelLg
        }
    }
}
