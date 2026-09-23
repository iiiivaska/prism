import SwiftUI
import DSCore
import DSTokens

/// The form of a Badge: `spec/components/Badge.yaml` `props.variant`. The raw value is the spec's spelling.
///
/// `count` is a pill of digits at least `size.icon.md` tall and wide: one digit sits in a `size.icon.md` circle, and
/// more digits widen it into a capsule that hugs them; `dot` is a `space.3` circle with no digits (behavior 2). A count
/// badge with no `count`, or with one that is not a whole number of at least 1, renders nothing; a dot ignores `count`
/// (behavior 9).
nonisolated public enum DSBadgeVariant: String, CaseIterable, Hashable, Sendable {
    case count, dot
}

/// The hue of a Badge: `props.tone`. `neutral` is the inverse solid (ink on light, white on dark), `accent` the one
/// attention fill and `critical` the solid danger disc (behavior 11). A critical badge is never the only cue for a
/// problem: what it marks names the state in words (behavior 14). The raw value is the spec's spelling.
nonisolated public enum DSBadgeTone: String, CaseIterable, Hashable, Sendable {
    case neutral, accent, critical
}

/// The weight of a Badge: `props.emphasis`. `filled` is the solid mark and the only one used over a map, an image, a
/// vivid surface or glass, because its three fills are opaque; `outline` has no fill at all and is the resting form
/// beside a filled sibling (behaviors 11 and 12). The raw value is the spec's spelling.
nonisolated public enum DSBadgeEmphasis: String, CaseIterable, Hashable, Sendable {
    case filled, outline
}
