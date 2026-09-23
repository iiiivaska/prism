import SwiftUI
import DSCore
import DSTokens

/// The axis of a Divider: `spec/components/Divider.yaml` `props.orientation`. The raw value is the spec's spelling.
///
/// `horizontal` stretches to the width of a parent that stacks its children in a column, `vertical` to the height of
/// one that stacks them in a row. A Divider has no length of its own: its length is the parent's cross size, and in a
/// parent that sizes to its content (a stack under `fixedSize` on that axis) it adds nothing but its insets. It is never
/// placed along its own axis — a horizontal one as a sibling in an `HStack`, a vertical one in a `VStack` — where the
/// web gives it no length and SwiftUI shares out the free space (Divider.yaml behavior 2).
nonisolated public enum DSDividerOrientation: String, CaseIterable, Hashable, Sendable {
    case horizontal, vertical
}

/// How far a Divider's line stops short of its container's edges: `props.inset`, bound by `tokens.root.inset`.
///
/// `content` trims both ends by `space.card-padding`, so a rule inside a card starts where the card's content starts;
/// `none` runs the full bleed of the container (behavior 3). The inset is inside the Divider, never a margin around it:
/// the Divider owns no margin (behavior 4).
nonisolated public enum DSDividerInset: String, CaseIterable, Hashable, Sendable {
    case none, content
}
