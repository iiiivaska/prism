import SwiftUI
import DSCore
import DSTokens

/// The corner radius of a Surface: `spec/components/Surface.yaml` `props.radius`, bound by `tokens.root.radius`.
///
/// `none` has no binding, so the corners are square. `pill` binds `radius.control`, the pill radius every control
/// uses; a shape clamps it to half its shorter side, so a pill Surface is a capsule at any size.
nonisolated public enum DSSurfaceRadius: String, CaseIterable, Hashable, Sendable {
    case none, inner, tile, cardCompact, card, sheet, cardLarge, hero, pill

    /// The token value of the radius, in points.
    public func value(_ radius: DSTokenSet.Radius) -> CGFloat {
        switch self {
        case .none: 0
        case .inner: radius.inner
        case .tile: radius.tile
        case .cardCompact: radius.cardCompact
        case .card: radius.card
        case .sheet: radius.sheet
        case .cardLarge: radius.cardLarge
        case .hero: radius.hero
        case .pill: radius.control
        }
    }
}

/// The elevation of a Surface: `props.elevation`, bound by `tokens.root.shadow` to `elevation.0` to `elevation.3`.
nonisolated public enum DSSurfaceElevation: String, CaseIterable, Hashable, Sendable {
    case flat, raised, floating, overlay

    /// The shadow token of the level.
    public func shadow(_ elevation: DSTokenSet.Elevation) -> DSShadowToken {
        switch self {
        case .flat: elevation.level0
        case .raised: elevation.level1
        case .floating: elevation.level2
        case .overlay: elevation.level3
        }
    }

    /// The level a Surface draws when the caller declares none: `raised` for the `raised` material, which draws
    /// `elevation.1` as its default (ADR-0030 §5.2), and `flat` for every other material, where "solid surfaces
    /// never draw a border or a shadow at `flat`" (Surface.yaml behavior). The default belongs to the material the
    /// caller asked for, not the one that renders: under the glass fallback the requesting Surface's elevation stays
    /// (ADR-0022 §1.1), so an undeclared glass elevation stays `flat`.
    public static func materialDefault(for requested: DSSurfaceMaterial) -> DSSurfaceElevation {
        requested == .raised ? .raised : .flat
    }
}

/// The padding inside a Surface: `props.padding`, bound by `tokens.root.padding` (`card` → `space.card-padding`).
/// Padding does not scale with Dynamic Type; the content reflows (Surface.yaml accessibility).
nonisolated public enum DSSurfacePadding: String, CaseIterable, Hashable, Sendable {
    case none, card

    /// The padding in points.
    public func value(_ space: DSTokenSet.Space) -> CGFloat {
        switch self {
        case .none: 0
        case .card: space.cardPadding
        }
    }
}
