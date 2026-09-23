import SwiftUI
import DSCore
import DSTokens

/// The variant of an IconButton: `spec/components/IconButton.yaml` `props.variant`. The raw value is the spec's
/// spelling, which the showcase's example renderer reads (`DSExampleRenderer.raw(_:as:)`).
///
/// The circle is Button's pill at its shortest, and a group holds one solid among the rings (visual-dna §4.7).
nonisolated public enum DSIconButtonVariant: String, CaseIterable, Hashable, Sendable {
    /// The single solid circle of a group: the inverse solid, which turns white on vivid and on the scheme's glass.
    case primary
    /// A raised puck with a hairline.
    case secondary
    /// A hairline ring with no fill at rest (ADR-0029 §3.3).
    case ghost
    /// The bare glyph: no fill and no ring, the circle only the hit region — the affordance Card pins to its corner.
    case plain
    /// A critical tint with a critical glyph and a critical ring, over an opaque page disc on media.
    case danger
}

/// The size of an IconButton: `props.size`, bound to `comp.icon-button.size.*`, which follow density
/// (`size.control.*`, ADR-0024 §7.1) and never Dynamic Type or modality; the glyph is Icon's box of the same name. The
/// raw value is the spec's spelling.
nonisolated public enum DSIconButtonSize: String, CaseIterable, Hashable, Sendable {
    case sm, md, lg
}
