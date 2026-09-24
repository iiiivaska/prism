import SwiftUI
import DSCore
import DSTokens

/// The size of an Avatar: `spec/components/Avatar.yaml` `props.size`. The circle is the control height of its size,
/// `size.control.sm`, `.md` or `.lg`, so an avatar in a row lines up with the buttons and chips beside it (behavior 4);
/// those heights follow density, so md is 32 pt in compact, 40 in regular and 48 in comfortable. The raw value is the
/// spec's spelling.
nonisolated public enum DSAvatarSize: String, CaseIterable, Hashable, Sendable {
    case sm, md, lg
}
