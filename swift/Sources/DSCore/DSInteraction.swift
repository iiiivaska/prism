import SwiftUI
import DSTokens

/// The focus ring's table (ADR-0042 §1): which ring a ground takes, and where the ring paints the page under itself.
///
/// Every spec binds its ring as `color.border.focus` at `border.focus` (`interaction/focus-ring`), and this table picks
/// the role for the ground the ring is drawn on, so every focusable component inherits it through `DSFocusRing`, the one
/// drawing on Apple. It is the web's `focusRingOn` and `focusRingUnderlay` (`web/packages/react/src/focus/ring.ts`),
/// case for case, and it sits beside the tone tables of `DSSurfaceContext` for the same reason they sit here: a table
/// read by the published material is DSCore's.
///
/// | Ground | Ring |
/// |--------|------|
/// | `page` over nothing or a map, `solid`, `raised`, `nested`, `glass`, `glassLight` | `color.border.focus` |
/// | `inverse` | `color.border.focus-on-inverse`, the material's foreground |
/// | `accent` | `color.border.focus-on-accent`, the tile's ink |
/// | `vivid`, and `page` over `vivid` | `color.border.focus-on-media`, white, which V1 holds on every gradient |
/// | `page` over `image` | `color.border.focus` on a band of `color.bg.page` one ring width wider |
///
/// **On a chip's own paint** the media rows and the band give way to `color.border.focus` (§1.2): a chip publishes the
/// ground under its glass, so a ring inside a glass chip over vivid reads `vivid`, while it sits on the chip's glass,
/// whose foreground is `color.border.focus`. On `inverse` and `accent` a chip draws nothing, so the ground's ring holds.
nonisolated package enum DSInteraction {
    /// The ring on a ground (ADR-0042 §1.1). `onChipPaint` is true where the ring sits on a chip's own paint: inside a
    /// chip (`dsSurfaceChipEnclosure` is not `.none`), or around a control laid on a chip, as Chip's remove control is.
    package static func focusRing(on ground: DSSurfaceContext, onChipPaint: Bool) -> DSColorToken {
        switch ground.material {
        case .inverse:
            .borderFocusOnInverse
        case .accent:
            .borderFocusOnAccent
        case .vivid:
            onChipPaint ? DSColorToken.borderFocus : DSColorToken.borderFocusOnMedia
        case .page:
            ground.backdrop == .vivid && !onChipPaint ? DSColorToken.borderFocusOnMedia : DSColorToken.borderFocus
        case .solid, .raised, .nested, .glass, .glassLight:
            .borderFocus
        }
    }

    /// The band the ring paints under itself (ADR-0042 §1.3): `color.bg.page` on the page over an image, outside any
    /// chip, and nothing anywhere else. The ring and the band are at least 17:1 apart in every scheme, so one of the two
    /// holds 3:1 against any image; every other ground is paint a contrast pair checks.
    package static func focusRingUnderlay(on ground: DSSurfaceContext, onChipPaint: Bool) -> DSColorToken? {
        guard !onChipPaint, ground.material == .page, ground.backdrop == .image else { return nil }
        return DSColorToken.bgPage
    }

    /// Whether the ring takes the system's focus colour under Increase Contrast on macOS (ADR-0042 §1.5,
    /// Button.yaml `notes.platform.macos`): only on the page family, the page over nothing and the solid ladder, where
    /// the system's own controls sit. On every other ground Prism's ring holds, since no pair can check the system
    /// colour, which is the user's, and the default blue fails the lit tile.
    package static func takesSystemFocusColor(on ground: DSSurfaceContext) -> Bool {
        switch ground.material {
        case .page: ground.backdrop == .none
        case .solid, .raised, .nested: true
        case .inverse, .accent, .vivid, .glass, .glassLight: false
        }
    }
}
