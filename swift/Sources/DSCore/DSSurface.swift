import OSLog
import SwiftUI
import DSTokens

/// The content materials of `spec/components/Surface.yaml`, plus the page ground (ADR-0009, ADR-0022, ADR-0030 §3).
nonisolated public enum DSSurfaceMaterial: String, CaseIterable, Hashable, Sendable {
    case page, solid, raised, nested, inverse, vivid, glass, glassLight, accent

    /// The two materials the fallback of ADR-0022 §1 can replace.
    public var isGlass: Bool { self == .glass || self == .glassLight }

    /// Materials that paint `color.bg.page` under themselves, so their white-alpha fills stay what the contrast
    /// pairs check when they sit over imagery or vivid (ADR-0030 §5.1).
    public var paintsPage: Bool { self == .solid || self == .raised || self == .nested }
}

/// What a surface sits on. Glass renders only over `image`, `map` or `vivid` (ADR-0022 §1.2 trigger 4), and the
/// kind is published with the material because the tones of the scheme's glass depend on it (ADR-0029 §1.4).
nonisolated public enum DSBackdropKind: String, CaseIterable, Hashable, Sendable {
    case none, image, map, vivid

    /// ADR-0022 §1.2 trigger 4.
    public var allowsGlass: Bool { self != .none }
}

/// The vivid gradient a surface draws: the default, or one of ADR-0024 §6's four slots. A 2×2 alternates one
/// slot pair on its diagonals, so every 2×2 is one temperature (ADR-0029 §2.5).
nonisolated public enum DSVividSlot: String, CaseIterable, Hashable, Sendable {
    case `default`, slot1, slot2, slot3, slot4

    public func gradient(_ gradients: DSTokenSet.Gradient) -> DSGradientToken {
        switch self {
        case .default: gradients.vividDefault
        case .slot1: gradients.vivid1
        case .slot2: gradients.vivid2
        case .slot3: gradients.vivid3
        case .slot4: gradients.vivid4
        }
    }
}

/// The glass recipes of ADR-0022 §2.1 and the two role recipes of ADR-0029 §1.2. A Surface draws the scheme's
/// glass (`fill`); a chip, control or status cell over media draws `chip`; the appearance recipes stay reachable
/// for the components that name one.
nonisolated public enum DSGlassAppearance: String, CaseIterable, Hashable, Sendable {
    /// The scheme's glass: light glass in light, smoked glass in dark (ADR-0029 §1.2).
    case fill
    /// The scheme's chip glass.
    case chip
    case lightFill, lightChip, darkFill, darkChip, cell

    /// The colorset of the recipe's `$root`. A role recipe has its own colorset, whose value aliases the
    /// appearance recipe of that scheme (ADR-0029 §1.2), so the token is the recipe's identity.
    public var fillToken: DSColorToken {
        switch self {
        case .fill: .materialGlassFill
        case .chip: .materialGlassChip
        case .lightFill: .materialGlassLightFill
        case .lightChip: .materialGlassLightChip
        case .darkFill: .materialGlassDarkFill
        case .darkChip: .materialGlassDarkChip
        case .cell: .materialGlassCell
        }
    }

    public func recipe(_ material: DSTokenSet.Material) -> DSGlassRecipe {
        switch self {
        case .fill:
            DSGlassRecipe(
                token: fillToken,
                fill: material.glassFill, blur: material.glassFillBlur, saturate: material.glassFillSaturate,
                edgeStart: material.glassFillEdgeStart, edgeEnd: material.glassFillEdgeEnd,
                grain: material.glassFillGrain, bloom: material.glassFillBloom
            )
        case .chip:
            DSGlassRecipe(
                token: fillToken,
                fill: material.glassChip, blur: material.glassChipBlur, saturate: material.glassChipSaturate,
                edgeStart: material.glassChipEdgeStart, edgeEnd: material.glassChipEdgeEnd,
                grain: material.glassChipGrain, bloom: material.glassChipBloom
            )
        case .lightFill:
            DSGlassRecipe(
                token: fillToken,
                fill: material.glassLightFill, blur: material.glassLightFillBlur, saturate: material.glassLightFillSaturate,
                edgeStart: material.glassLightFillEdgeStart, edgeEnd: material.glassLightFillEdgeEnd,
                grain: material.glassLightFillGrain, bloom: material.glassLightFillBloom
            )
        case .lightChip:
            DSGlassRecipe(
                token: fillToken,
                fill: material.glassLightChip, blur: material.glassLightChipBlur, saturate: material.glassLightChipSaturate,
                edgeStart: material.glassLightChipEdgeStart, edgeEnd: material.glassLightChipEdgeEnd,
                grain: material.glassLightChipGrain, bloom: material.glassLightChipBloom
            )
        case .darkFill:
            DSGlassRecipe(
                token: fillToken,
                fill: material.glassDarkFill, blur: material.glassDarkFillBlur, saturate: material.glassDarkFillSaturate,
                edgeStart: material.glassDarkFillEdgeStart, edgeEnd: material.glassDarkFillEdgeEnd,
                grain: material.glassDarkFillGrain, bloom: material.glassDarkFillBloom
            )
        case .darkChip:
            DSGlassRecipe(
                token: fillToken,
                fill: material.glassDarkChip, blur: material.glassDarkChipBlur, saturate: material.glassDarkChipSaturate,
                edgeStart: material.glassDarkChipEdgeStart, edgeEnd: material.glassDarkChipEdgeEnd,
                grain: material.glassDarkChipGrain, bloom: material.glassDarkChipBloom
            )
        case .cell:
            DSGlassRecipe(
                token: fillToken,
                fill: material.glassCell, blur: material.glassCellBlur, saturate: material.glassCellSaturate,
                edgeStart: material.glassCellEdgeStart, edgeEnd: material.glassCellEdgeEnd,
                grain: material.glassCellGrain, bloom: material.glassCellBloom
            )
        }
    }
}

/// One glass recipe, assembled from the seven typed tokens of ADR-0022 §2.1.
///
/// **Which fields DSCore applies around `glassEffect`** (ADR-0022 §2.4, a P3-1 question): all seven, and not
/// through `glassEffect`. Prism's content glass is drawn from the recipe — the fill, the backdrop blur and
/// saturation, the 1 px inner edge from `edgeStart` to `edgeEnd`, the grain and the bloom — because
/// `.glassEffect()` renders Apple's own material and would ignore every one of these values, while the web
/// imitation applies all of them (ADR-0022 §2.4) and the parity report compares the two. Prism also never relies
/// on the system material adapting to the accessibility settings (ADR-0022, "Rely on Liquid Glass adapting by
/// itself"): the fallback of ADR-0022 §1 is decided here, before a recipe is ever produced. Native system chrome
/// keeps its own Liquid Glass (ADR-0009 decision 1), which is what the `DS_GLASS` build setting is for.
///
/// The geometry the fields are drawn with — the edge's 135° ramp, the bloom's placement, the grain tile — belongs
/// to `Surface.yaml` and P3-3.
nonisolated public struct DSGlassRecipe: Hashable, Sendable {
    /// The colorset behind `fill`. It is the recipe's identity: SwiftUI's `Color` does not compare two catalog
    /// references as equal, and the token is also how a component reaches the literal values (`appearances(_:)`).
    public let token: DSColorToken
    /// The fill, alpha included.
    public let fill: Color
    /// Backdrop blur, in points, as the CSS standard deviation `backdrop-filter: blur()` takes. SwiftUI's
    /// `.blur(radius:)` renders a different standard deviation per point (ADR-0030 §4.3, settled by P3-1), so a
    /// Surface passes `blurRadius`, not this, to SwiftUI.
    public let blur: CGFloat
    /// Backdrop saturation; 1 leaves it unchanged.
    public let saturate: Double
    /// Alpha of the white 1 px inner edge at the top-leading corner.
    public let edgeStart: Double
    /// Alpha of that edge at the bottom-trailing corner.
    public let edgeEnd: Double
    /// Monochrome noise opacity.
    public let grain: Double
    /// Alpha of the top-leading bloom; 0 draws none.
    public let bloom: Double

    public init(
        token: DSColorToken,
        fill: Color,
        blur: CGFloat,
        saturate: Double,
        edgeStart: Double,
        edgeEnd: Double,
        grain: Double,
        bloom: Double
    ) {
        self.token = token
        self.fill = fill
        self.blur = blur
        self.saturate = saturate
        self.edgeStart = edgeStart
        self.edgeEnd = edgeEnd
        self.grain = grain
        self.bloom = bloom
    }

    /// What a Surface passes to SwiftUI's `.blur(radius:)` so that the backdrop blurs by `blur`, the CSS
    /// standard deviation the web imitation applies (ADR-0030 §4.3).
    public var blurRadius: CGFloat { DSBlur.radius(cssStandardDeviation: blur) }

    /// Whether the two recipes carry the same six numbers. A role recipe aliases an appearance recipe field by
    /// field but keeps its own colorset, so this is how ADR-0029 §1.2's aliasing is checked.
    public func hasSameFields(as other: DSGlassRecipe) -> Bool {
        blur == other.blur && saturate == other.saturate && edgeStart == other.edgeStart
            && edgeEnd == other.edgeEnd && grain == other.grain && bloom == other.bloom
    }

    public static func == (lhs: DSGlassRecipe, rhs: DSGlassRecipe) -> Bool {
        lhs.token == rhs.token && lhs.hasSameFields(as: rhs)
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(token)
        hasher.combine(blur)
        hasher.combine(saturate)
        hasher.combine(edgeStart)
        hasher.combine(edgeEnd)
        hasher.combine(grain)
        hasher.combine(bloom)
    }
}

/// What a Surface publishes to its descendants (ADR-0022 §3.1, ADR-0029 §1.4): the material it actually renders
/// and the backdrop kind it declared. Text, charts and component parts read their foreground family from it, and
/// never the color scheme or an accessibility setting.
nonisolated public struct DSSurfaceContext: Hashable, Sendable {
    public let material: DSSurfaceMaterial
    public let backdrop: DSBackdropKind

    public init(material: DSSurfaceMaterial, backdrop: DSBackdropKind = .none) {
        self.material = material
        self.backdrop = backdrop
    }

    /// The scene root: the page, on nothing.
    public static let root = DSSurfaceContext(material: .page, backdrop: .none)
}

/// A tone of `spec/components/Text.yaml`. `inherit` is not here: it is the absence of a choice.
nonisolated public enum DSTextTone: String, CaseIterable, Hashable, Sendable {
    case primary, secondary, tertiary, dimmed, accent, success, warning, critical, info
}

/// A tone of `spec/components/Icon.yaml`. `inherit` is not here: it is the absence of a choice, as it is for
/// `DSTextTone`, so a caller that wants a glyph to follow the text around it passes nil.
///
/// It lives beside `DSTextTone` because more than Icon reads it: Card's icon ring and open glyph take Icon's tones
/// where Card binds no cell of its own, and its sparkline takes the primary one (`DSCardAppearance.action(on:)`), so
/// the table is read, never copied. **Name.** The spec's prop is `tone`; the `Glyph` stem matches `DSGlyphSize` and
/// `DSGlyphWeight`, whose `DSIcon*` names the registry's generated types already hold.
nonisolated public enum DSGlyphTone: String, CaseIterable, Hashable, Sendable {
    case primary, secondary, accent, success, warning, critical, info

    /// Icon.yaml `tokens.root.color`: the tone on the material the enclosing Surface publishes and, on the scheme's
    /// glass, the backdrop kind published with it (behaviors 7 and 8). On vivid, inverse, accent, light glass and the
    /// scheme's glass every tone takes that material's own foreground — `secondary` alone keeps a quieter one on
    /// accent and on the scheme's glass — because a status there is carried by the glyph's shape and the word beside
    /// it, never by colour (ADR-0011 rule 4). Glass over no backdrop never publishes: Surface falls back to `raised`
    /// (ADR-0022 §1.2 trigger 4), so that row takes the media cell, the way `DSTextTone` does.
    public func color(on surface: DSSurfaceContext) -> KeyPath<DSTokenSet, Color> {
        switch surface.material {
        case .page, .solid, .raised, .nested:
            switch self {
            case .primary: \.color.iconPrimary
            case .secondary: \.color.iconSecondary
            case .accent: \.color.iconAccent
            case .success: \.color.iconStatusSuccess
            case .warning: \.color.iconStatusWarning
            case .critical: \.color.iconStatusCritical
            case .info: \.color.iconStatusInfo
            }
        case .vivid:
            \.color.textOnVivid
        case .inverse:
            \.color.textOnInverse
        case .accent:
            switch self {
            case .secondary: \.color.textOnAccentSecondary
            case .primary, .accent, .success, .warning, .critical, .info: \.color.textOnAccent
            }
        case .glassLight:
            \.color.textOnGlassLight
        case .glass:
            switch (self, surface.backdrop) {
            case (.secondary, .map): \.color.textOnGlassFillSecondary
            case (.secondary, .image), (.secondary, .vivid), (.secondary, .none): \.color.textOnGlassFillMediaSecondary
            case (.primary, _), (.accent, _), (.success, _), (.warning, _), (.critical, _), (.info, _): \.color.textOnGlassFill
            }
        }
    }
}

nonisolated extension DSSurfaceContext {
    /// The foreground token of a tone on this material (ADR-0022 §3.1, as ADR-0029 §1.4 and ADR-0030 §3.4 amend
    /// it). On vivid, light glass and inverse nothing is dimmed with alpha: hierarchy comes from size, so every
    /// tone is that material's single foreground. On the scheme's glass the tone follows the backdrop kind,
    /// because the quieter light-glass tones hold only over Prism's own map (ADR-0029 §1.4).
    public func colorToken(for tone: DSTextTone) -> DSColorToken {
        switch material {
        case .page, .solid, .raised, .nested:
            switch tone {
            case .primary: .textPrimary
            case .secondary: .textSecondary
            case .tertiary: .textTertiary
            case .dimmed: .textDimmed
            case .accent: .textAccent
            case .success: .textSuccess
            case .warning: .textWarning
            case .critical: .textCritical
            case .info: .textInfo
            }
        case .vivid: .textOnVivid
        case .inverse: .textOnInverse
        case .glassLight: .textOnGlassLight
        case .accent:
            switch tone {
            case .secondary, .tertiary, .dimmed: .textOnAccentSecondary
            default: .textOnAccent
            }
        case .glass:
            switch tone {
            case .secondary: backdrop == .map ? .textOnGlassFillSecondary : .textOnGlassFillMediaSecondary
            case .tertiary: backdrop == .map ? .textOnGlassFillTertiary : .textOnGlassFillMediaTertiary
            case .dimmed: backdrop == .map ? .textOnGlassFillDimmed : .textOnGlassFillMediaTertiary
            default: .textOnGlassFill
            }
        }
    }

    /// The tone's color in a brand's catalog.
    public func color(for tone: DSTextTone, brand: DSBrand) -> Color {
        colorToken(for: tone).color(brand)
    }
}

/// Everything a Surface needs to draw itself, and everything it publishes (ADR-0022 §1, ADR-0029 §1, ADR-0030 §5).
nonisolated public struct DSSurfaceResolution: Hashable, Sendable {
    /// What the caller asked for.
    public let requested: DSSurfaceMaterial
    /// What renders, and what descendants read.
    public let material: DSSurfaceMaterial
    /// The backdrop the caller declared, published unchanged.
    public let backdrop: DSBackdropKind
    /// True when glass was replaced by the opaque fallback (ADR-0022 §1.2).
    public let isGlassFallback: Bool
    /// True when glass was asked for over a backdrop that is not image, map or vivid. It is reported whatever the
    /// other triggers, and the Surface logs it at debug level (ADR-0022 §1.2 trigger 4, Surface.yaml).
    public let hasInvalidBackdrop: Bool
    /// The recipe to draw; nil whenever glass does not render.
    public let glass: DSGlassRecipe?
    /// Fill the shape with `color.bg.page` before painting the material (ADR-0030 §5.1, ADR-0022 §1.1).
    public let paintsPage: Bool
    /// Draw `color.edge.raised` as the top edge (ADR-0030 §5.2); true under the fallback too, where the edge that
    /// ADR-0022 §1.1 drops is the glass recipe's, not `raised`'s own.
    public let drawsRaisedEdge: Bool
    /// Draw the vivid gradient's bloom. Vivid is opaque and unchanged by the fallback, but its bloom is dropped
    /// under Reduce Transparency (ADR-0022 §1.7).
    public let drawsVividBloom: Bool

    /// What descendants read.
    public var published: DSSurfaceContext { DSSurfaceContext(material: material, backdrop: backdrop) }

    /// The foreground token of a tone on the published material.
    public func colorToken(for tone: DSTextTone) -> DSColorToken { published.colorToken(for: tone) }
}

/// Material resolution. Only Surface resolves materials, and it uses the glass fallback exactly under
/// ADR-0022 §1.2 and §1.6 (ADR-0022 rule 1).
///
/// The four triggers, any one of which replaces glass with one opaque `raised` surface:
///  1. the platform is watchOS;
///  2. Reduce Transparency is on;
///  3. Increase Contrast is on;
///  4. the backdrop is not `image`, `map` or `vivid` — this one also logs at debug level, whatever the others.
///
/// A selected glass surface renders and publishes `inverse` instead, because `raised` alone cannot show which one
/// is selected (ADR-0022 §1.6).
///
/// The decision reads Prism's token context, never the OS settings (ADR-0022 §1.3): `DSTokenContext.contrast` and
/// `.transparency`, which `DSTheme` builds through `DSAccessibilityPolicy` and previews and snapshots can force.
nonisolated public enum DSSurface: Sendable {
    /// Glass over a backdrop that is not image, map or vivid falls back silently and logs at debug level
    /// (ADR-0022 §1.2 trigger 4, Surface.yaml). The log lives here, with the decision.
    private static let log = Logger(subsystem: "app.prism.dscore", category: "surface")

    /// The convenience a component uses: the context and the material values come from one token set.
    public static func resolve(
        material: DSSurfaceMaterial,
        backdrop: DSBackdropKind = .none,
        selected: Bool = false,
        tokens: DSTokenSet,
        isWatch: Bool = DSPlatform.isWatch
    ) -> DSSurfaceResolution {
        resolve(
            material: material, backdrop: backdrop, selected: selected,
            context: tokens.context, tokens: tokens.material, isWatch: isWatch
        )
    }

    public static func resolve(
        material requested: DSSurfaceMaterial,
        backdrop: DSBackdropKind = .none,
        selected: Bool = false,
        context: DSTokenContext,
        tokens: DSTokenSet.Material,
        isWatch: Bool = DSPlatform.isWatch
    ) -> DSSurfaceResolution {
        let invalidBackdrop = requested.isGlass && !backdrop.allowsGlass
        if invalidBackdrop {
            log.debug(
                "Surface asked for \(requested.rawValue, privacy: .public) over backdrop \(backdrop.rawValue, privacy: .public); glass renders only over image, map or vivid, so it falls back to the opaque raised surface (ADR-0022 §1.2)."
            )
        }
        let fallback =
            requested.isGlass && glassFallsBack(isWatch: isWatch, context: context, invalidBackdrop: invalidBackdrop)

        let material: DSSurfaceMaterial
        if fallback {
            material = selected ? .inverse : .raised
        } else if requested == .vivid, isWatch {
            // Tier 3 renders opaque materials only; Surface.yaml sends vivid to solid on the watch.
            material = .solid
        } else {
            material = requested
        }

        let appearance: DSGlassAppearance? =
            fallback ? nil : (requested == .glass ? .fill : (requested == .glassLight ? .lightFill : nil))

        return DSSurfaceResolution(
            requested: requested,
            material: material,
            backdrop: backdrop,
            isGlassFallback: fallback,
            hasInvalidBackdrop: invalidBackdrop,
            glass: appearance?.recipe(tokens),
            paintsPage: material.paintsPage,
            drawsRaisedEdge: material == .raised,
            drawsVividBloom: material == .vivid && context.transparency != .reduced
        )
    }

    /// Whether glass that was asked for falls back: any one of the four triggers of ADR-0022 §1.2 — the watch,
    /// Reduce Transparency, Increase Contrast, or a backdrop that cannot carry glass (`invalidBackdrop`, which the
    /// caller decides and logs).
    ///
    /// This is the one place the four are evaluated. Surface's resolution asks it, and so does the glass chip's
    /// (`resolveChip`, ADR-0036 §3), so the two fallbacks cannot drift apart.
    private static func glassFallsBack(isWatch: Bool, context: DSTokenContext, invalidBackdrop: Bool) -> Bool {
        isWatch || context.transparency == .reduced || context.contrast == .increased || invalidBackdrop
    }
}

// MARK: - The glass chip (ADR-0036 §2 to §7, ADR-0037)

/// What a component asks of the one part it draws through the glass chip shape, on the ground that part reads
/// (ADR-0036 §2.2): the spec's cell for that part's `background` on this ground, and nothing more. `glass` is the
/// cell that binds `material.glass.chip`; `own` is any other cell, which the component names itself; `none` is no
/// fill.
nonisolated package enum DSSurfaceChipFill: String, CaseIterable, Hashable, Sendable {
    case glass, own, none
}

/// Whether the backdrop trigger applies to a glass chip (ADR-0036 §2.2, §3 step 2). `content`, the default, applies
/// it: glass asked for on a ground with no media falls back, as a Surface's does. `chrome` is for bars that exist to
/// show the page through them; there the backdrop is never invalid, and only the other three triggers apply.
nonisolated package enum DSSurfaceChipGate: String, CaseIterable, Hashable, Sendable {
    case content, chrome
}

/// What a glass chip publishes to the component's other parts (ADR-0036 §4). `ground`, the default, publishes the
/// ground the chip sits on, so a part keys on the media under the glass. `raised` is for bars whose items are checked
/// on `raised`. Under the fallback a chip publishes `raised` either way.
nonisolated package enum DSSurfaceChipPublication: String, CaseIterable, Hashable, Sendable {
    case ground, raised
}

/// What a glass chip draws (ADR-0036 §2.3): the recipe; the fallback, `color.bg.surface.raised` over
/// `color.bg.page`; the component's own cell; or nothing.
nonisolated package enum DSSurfaceChipRendering: String, CaseIterable, Hashable, Sendable {
    case glass, fallback, own, none
}

/// What encloses a point, up to the nearest `dsBackdrop(_:_:)` (ADR-0037 §1): what a glass chip reads, and what it
/// hands its content as `encloses`. It replaces ADR-0036 §3 step 8's flag.
///  - `none`: no chip encloses it. The default, and what `dsBackdrop(_:_:)` sets for its content, whatever its kind.
///  - `translucent`: chips enclose it, and none of them renders its own cell or its fallback.
///  - `opaque`: at least one chip that encloses it renders its own cell or its fallback. A component's own cell is
///    paint, not media, whatever its alpha.
nonisolated package enum DSSurfaceChipEnclosure: String, CaseIterable, Hashable, Sendable {
    case none, translucent, opaque
}

/// Everything a glass chip draws and publishes (ADR-0036 §3, ADR-0037 §2). The web's `SurfaceChipResolution`
/// (`web/packages/react/src/surface/resolve.ts`) has the same fields, so the two tables read side by side.
nonisolated package struct DSSurfaceChipResolution: Hashable, Sendable {
    /// The context the component read, which the chip sits on.
    package let ground: DSSurfaceContext
    /// What the component asked for on that ground.
    package let requested: DSSurfaceChipFill
    /// What the chip draws.
    package let rendered: DSSurfaceChipRendering
    /// `DSGlassAppearance.chip`'s recipe when glass renders; nil otherwise.
    package let glass: DSGlassRecipe?
    /// Whether the recipe blurs and saturates the backdrop under the chip. False when glass does not render, when it
    /// renders on the scheme's glass or on light glass (ADR-0036 §5), and when any other chip encloses it (ADR-0037
    /// §2): there a chip draws the recipe's fill and edge only.
    package let blursBackdrop: Bool
    /// True when glass was asked for and replaced by the fallback.
    package let isGlassFallback: Bool
    /// True when glass was asked for under the `content` gate with no media under the chip: on a ground with no media,
    /// or in an `opaque` enclosure. Reported whatever the other triggers, as `DSSurfaceResolution.hasInvalidBackdrop`
    /// is, and logged at debug level.
    package let hasInvalidBackdrop: Bool
    /// Paint `color.bg.page` under the chip: exactly under the fallback (ADR-0030 rule 6).
    package let paintsPage: Bool
    /// What the component's other parts read: `(raised, none)` under the fallback or when the component asks for
    /// `raised`, and the ground otherwise.
    package let published: DSSurfaceContext
    /// The enclosure the chip hands its content (ADR-0037 §1, §2 step 3), which `dsSurfaceChip` sets for it: `opaque`
    /// when it renders its own cell or its fallback, or reads `opaque` itself; `translucent` when it renders the recipe
    /// or nothing.
    package let encloses: DSSurfaceChipEnclosure
}

nonisolated extension DSSurface {
    /// The convenience a component uses: the context and the material values come from one token set, as
    /// `resolve(material:backdrop:selected:tokens:isWatch:)` does for a Surface.
    package static func resolveChip(
        _ requested: DSSurfaceChipFill,
        on ground: DSSurfaceContext,
        enclosure: DSSurfaceChipEnclosure = .none,
        gate: DSSurfaceChipGate = .content,
        publishes: DSSurfaceChipPublication = .ground,
        tokens: DSTokenSet,
        isWatch: Bool = DSPlatform.isWatch
    ) -> DSSurfaceChipResolution {
        resolveChip(
            requested, on: ground, enclosure: enclosure, gate: gate, publishes: publishes,
            context: tokens.context, tokens: tokens.material, isWatch: isWatch
        )
    }

    /// Resolves the one part of a Prism component that binds `material.glass.chip` (ADR-0036 §3, as ADR-0037 §2 amends
    /// it), from the component's answer for its ground and nothing else: the component hands over no recipe, colour,
    /// setting or fallback.
    ///
    /// 1. The media under the chip is none in an `opaque` enclosure. Otherwise it is the ground's backdrop on `page`,
    ///    `glass` and `glassLight`, `vivid` on `vivid`, and none on every other material.
    /// 2. Glass asked for under the `content` gate with no media under it is an invalid backdrop, logged at debug level
    ///    as Surface logs its own.
    /// 3. Glass asked for falls back through the one function Surface's resolution uses (`glassFallsBack`): on the
    ///    watch, under Reduce Transparency, under Increase Contrast, or over an invalid backdrop.
    /// 4. The recipe is `DSGlassAppearance.chip`'s when glass renders.
    /// 5. It blurs the backdrop only in the enclosure `none`, and not on the scheme's glass or light glass: inside any
    ///    other chip, and on glass, it draws the recipe's fill and edge alone.
    /// 6. `color.bg.page` is painted under the chip exactly under the fallback.
    /// 7. The chip publishes `(raised, none)` under the fallback or when asked to, and the ground otherwise.
    /// 8. The chip hands its content `encloses`: `opaque` when it renders its own cell or its fallback, or reads
    ///    `opaque`; `translucent` otherwise. The drawing (`dsSurfaceChip`) sets it for the content, since the
    ///    enclosure is an environment value of DSComponents.
    package static func resolveChip(
        _ requested: DSSurfaceChipFill,
        on ground: DSSurfaceContext,
        enclosure: DSSurfaceChipEnclosure = .none,
        gate: DSSurfaceChipGate = .content,
        publishes: DSSurfaceChipPublication = .ground,
        context: DSTokenContext,
        tokens: DSTokenSet.Material,
        isWatch: Bool = DSPlatform.isWatch
    ) -> DSSurfaceChipResolution {
        let asksForGlass = requested == .glass
        let media = chipMedia(on: ground, in: enclosure)
        let invalidBackdrop = asksForGlass && gate == .content && !media.allowsGlass
        if invalidBackdrop {
            if enclosure == .opaque {
                log.debug(
                    "A glass chip inside a chip that renders its own cell or its fallback has no media under it; glass renders only over image, map or vivid, so it falls back to color.bg.surface.raised over color.bg.page (ADR-0037 §2)."
                )
            } else {
                log.debug(
                    "A glass chip on \(ground.material.rawValue, privacy: .public) over \(ground.backdrop.rawValue, privacy: .public) has no media under it; glass renders only over image, map or vivid, so it falls back to color.bg.surface.raised over color.bg.page (ADR-0036 §3)."
                )
            }
        }
        let fallback =
            asksForGlass && glassFallsBack(isWatch: isWatch, context: context, invalidBackdrop: invalidBackdrop)

        let rendered: DSSurfaceChipRendering
        switch requested {
        case .glass: rendered = fallback ? .fallback : .glass
        case .own: rendered = .own
        case .none: rendered = .none
        }
        let rendersGlass = rendered == .glass
        let blurs = rendersGlass && enclosure == .none && !ground.material.isGlass

        // Step 8: an own cell or a fallback is paint, and an opaque enclosure stays opaque; the recipe and nothing let
        // the media through.
        let encloses: DSSurfaceChipEnclosure
        switch rendered {
        case .own, .fallback: encloses = .opaque
        case .glass, .none: encloses = enclosure == .opaque ? .opaque : .translucent
        }

        return DSSurfaceChipResolution(
            ground: ground,
            requested: requested,
            rendered: rendered,
            glass: rendersGlass ? DSGlassAppearance.chip.recipe(tokens) : nil,
            blursBackdrop: blurs,
            isGlassFallback: fallback,
            hasInvalidBackdrop: invalidBackdrop,
            paintsPage: fallback,
            published: fallback || publishes == .raised ? DSSurfaceContext(material: .raised) : ground,
            encloses: encloses
        )
    }

    /// ADR-0036 §3 step 1, as ADR-0037 §2 amends it: the media kind under a chip on `ground` in `enclosure`. Inside a
    /// chip that renders its own cell or its fallback there is none, whatever the ground: that cell is paint. Otherwise
    /// the page, the scheme's glass and light glass sit on the backdrop they declare; vivid is media of its own; every
    /// other material is opaque paint.
    private static func chipMedia(on ground: DSSurfaceContext, in enclosure: DSSurfaceChipEnclosure) -> DSBackdropKind {
        guard enclosure != .opaque else { return .none }
        switch ground.material {
        case .page, .glass, .glassLight: return ground.backdrop
        case .vivid: return .vivid
        case .solid, .raised, .nested, .inverse, .accent: return .none
        }
    }
}
