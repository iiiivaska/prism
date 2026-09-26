import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// The size of a Chip: `spec/components/Chip.yaml` `props.size`. The pill is the control height of its size,
/// `size.control.sm` or `.md`, so a chip in a row lines up with the buttons and avatars beside it; those heights
/// follow density, so sm is 28 pt in compact, 32 in regular and 44 in comfortable. The raw value is the spec's
/// spelling.
nonisolated public enum DSChipSize: String, CaseIterable, Hashable, Sendable {
    case sm, md
}

/// What a chip is, decided by its props alone (Chip.yaml behavior 1), the same on every platform: a `filter`, which
/// sets `isSelected`, true or false, and is a toggle; a `button`, which leaves it unset and has `onPress` or
/// `isRemovable`; or a static `label`, which is no control and has no role. The web's twin is `chipKinds`.
nonisolated enum DSChipKind: String, CaseIterable, Hashable, Sendable {
    case filter, button, label

    /// Whether the chip is a control: focusable, pressable and held to the hit rule.
    var isControl: Bool { self != .label }
}

/// What the leading position holds, in its one order (Chip.yaml anatomy, behavior): status.check while a selected
/// chip sits where every tone is one foreground, the Avatar on the md chip, the caller's glyph, or nothing.
nonisolated enum DSChipLeading: Hashable, Sendable {
    case check
    case avatar
    case icon(DSIconName)
    case none
}
