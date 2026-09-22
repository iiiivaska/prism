import SwiftUI
import DSCore
import DSTokens

/// The geometry a Surface hands to the Surfaces inside it, for the concentric rule (Surface.yaml behavior).
nonisolated struct DSSurfaceGeometry: Hashable, Sendable {
    /// The corner radius the parent renders with.
    let radius: CGFloat
    /// The padding between the parent's edge and its content.
    let padding: CGFloat
}

/// The 1 px inner edge of a Surface (Surface.yaml anatomy `edge`, `tokens.edge`).
nonisolated enum DSSurfaceEdge: Hashable, Sendable {
    /// `raised`: `color.edge.raised` along the top of the shape, as an inset line one `border.hairline` deep
    /// that follows the corner curves (ADR-0030 §5.2). Under the glass fallback this is the edge that stays.
    case top(color: DSColorToken)
    /// Glass and vivid: `color.edge.highlight` on a 135° gradient from `start` alpha at 0 % to `end` alpha at 75 %
    /// (Surface.yaml behavior, ADR-0030 §4.1, §4.2).
    case highlight(color: DSColorToken, start: Double, end: Double)
}

/// Every value `spec/components/Surface.yaml` binds, as pure functions of the resolution and the token set, so the
/// binding matrix and the geometry rules run on the host. `DSSurfaceView` only draws what these return.
nonisolated enum DSSurfaceAppearance {
    // MARK: - Geometry the spec states in words

    /// The edge gradient's direction: 135°, top-leading to bottom-trailing, with CSS angle semantics.
    static let edgeAngle: Double = 135
    /// The edge reaches its end alpha at 75 % of the gradient line and holds it to the end.
    static let edgeEndLocation: Double = 0.75
    /// The vivid bloom sits 10 % of the surface height below the surface…
    static let vividBloomOffset: CGFloat = 0.1
    /// …scaled to 0.92 about its centre.
    static let vividBloomScale: CGFloat = 0.92
    /// The glass bloom's radius, as a fraction of the surface's shorter side.
    static let glassBloomRadius: CGFloat = 0.75

    // MARK: - tokens.root

    /// `tokens.root.background` for the material that renders. Vivid has no cell: it takes `tokens.root.gradient`.
    static func background(_ material: DSSurfaceMaterial) -> DSColorToken? {
        switch material {
        case .page: .bgPage
        case .solid: .bgSurface
        case .raised: .bgSurfaceRaised
        case .nested: .bgSurfaceNested
        case .inverse: .bgFillInverse
        case .accent: .bgFillAccent
        case .glass: DSGlassAppearance.fill.fillToken
        case .glassLight: DSGlassAppearance.lightFill.fillToken
        case .vivid: nil
        }
    }

    /// `tokens.root.underlay`: `color.bg.page` under `solid`, `raised` and `nested` (ADR-0030 §5.1).
    static func underlay(_ resolution: DSSurfaceResolution) -> DSColorToken? {
        resolution.paintsPage ? .bgPage : nil
    }

    /// `tokens.root.gradient`: the default gradient, or the slot the caller named.
    static func gradient(_ slot: DSVividSlot, _ tokens: DSTokenSet) -> DSGradientToken {
        slot.gradient(tokens.gradient)
    }

    /// `tokens.root.shadow`, for the elevation the requesting Surface declared (or its material's default).
    static func elevation(declared: DSSurfaceElevation?, requested: DSSurfaceMaterial) -> DSSurfaceElevation {
        declared ?? DSSurfaceElevation.materialDefault(for: requested)
    }

    // MARK: - edge, grain, bloom

    /// The edge of the material that renders; nil for the materials that draw none (`page`, `solid`, `nested`,
    /// `inverse`, `accent`) and for glass under the fallback, which drops the recipe's edge.
    static func edge(_ resolution: DSSurfaceResolution, _ tokens: DSTokenSet) -> DSSurfaceEdge? {
        if resolution.drawsRaisedEdge { return .top(color: .edgeRaised) }
        if let recipe = resolution.glass {
            return .highlight(color: .edgeHighlight, start: recipe.edgeStart, end: recipe.edgeEnd)
        }
        if resolution.material == .vivid {
            return .highlight(color: .edgeHighlight, start: tokens.material.vividEdgeStart, end: tokens.material.vividEdgeEnd)
        }
        return nil
    }

    /// `tokens.grain.opacity`: the recipe's grain on glass, the gradient's grain on vivid, and none elsewhere.
    static func grain(_ resolution: DSSurfaceResolution, gradient: DSGradientToken) -> Double {
        if let recipe = resolution.glass { return recipe.grain }
        return resolution.material == .vivid ? gradient.grain : 0
    }

    /// `tokens.bloom.alpha` inside a glass surface; 0 draws nothing.
    static func glassBloom(_ resolution: DSSurfaceResolution) -> Double {
        resolution.glass?.bloom ?? 0
    }

    // MARK: - Rules

    /// The concentric rule: a Surface inside another is never rounder than the parent's radius minus the parent's
    /// padding (and so never rounder than the parent). The radius the caller asked for is kept when it is already
    /// smaller, so a nested `inner` stays `inner` inside a hero; a negative difference clamps to square corners.
    static func radius(requested: DSSurfaceRadius, _ tokens: DSTokenSet.Radius, parent: DSSurfaceGeometry?) -> CGFloat {
        let own = requested.value(tokens)
        guard let parent else { return own }
        return min(own, max(0, parent.radius - parent.padding))
    }

    /// The card header block of ADR-0022 §4.1 (V2) in a surface of this size: from `space.card-padding` in from the
    /// top-leading corner to the action's leading gap (`size.control.md` and `space.5` in from the trailing padding),
    /// `space.12` tall. Grain leaves it out on every Surface, because on vivid all text below 13 px sits there
    /// (ADR-0030 §4.4).
    static func headerBlock(size: CGSize, _ tokens: DSTokenSet) -> CGRect {
        let padding = tokens.space.cardPadding
        let width = size.width - 2 * padding - tokens.size.controlMd - tokens.space.step5
        let height = min(tokens.space.step12, size.height - padding)
        return CGRect(x: padding, y: padding, width: max(0, width), height: max(0, height))
    }

    /// What the glass bloom is left out of: the card header block when a Card's header sits on this surface, and
    /// nothing otherwise (Surface.yaml behavior, "left out of **the card** header block").
    ///
    /// The exclusion exists so the bloom never lightens the fill under a card's title and caption, whose pair
    /// `tools/contrast` checks on the flat material; a Surface that carries no card header has neither that block nor
    /// that text, and cutting a fixed rectangle out of it only notches the bloom. `DSSurfaceLayers.glassBloom(_:)`
    /// carries the evidence.
    static func bloomExclusion(size: CGSize, _ tokens: DSTokenSet, hasCardHeaderBlock: Bool) -> CGRect? {
        hasCardHeaderBlock ? headerBlock(size: size, tokens) : nil
    }

    /// The animation of a material change: `motion.spring.smooth`, or under Reduce Motion the crossfade over
    /// `motion.duration.base` with `motion.easing.out` (Surface.yaml motion, ADR-0023 §8.4).
    static func materialChange(_ motion: DSMotion) -> Animation {
        motion.isReduced ? motion.presentation : motion.animation(motion.tokens.springSmooth)
    }

    /// How far past a glass surface its backdrop copy reaches before it is blurred: three standard deviations, where a
    /// Gaussian's weight has fallen below 0.3 %.
    static func blurBleed(radius: CGFloat) -> CGFloat {
        3 * DSBlur.standardDeviation(radius: radius)
    }

    /// A CSS box-shadow blur is twice the Gaussian's standard deviation; SwiftUI's shadow radius is converted from
    /// that standard deviation the way DSCore converts every CSS blur (ADR-0030 §4.3).
    static func shadowRadius(cssBlur: CGFloat) -> CGFloat {
        DSBlur.radius(cssStandardDeviation: cssBlur / 2)
    }
}
