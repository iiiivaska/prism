import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// `spec/components/Surface.yaml` specVersion 3: the binding matrix, the per-material default of `elevation`, the
/// fallback's drawing, and the geometry rules the behavior block states in words. Resolution itself (which material
/// renders) is DSCore's and is covered by `DSSurfaceResolutionTests`; these tests check what `DSSurfaceView` draws for
/// each resolution.
@Suite("Surface bindings and geometry (Surface.yaml v3)")
struct DSSurfaceBindingTests {
    static func tokens(
        scheme: DSColorScheme = .light,
        density: DSDensity = .regular,
        contrast: DSContrast = .standard,
        transparency: DSTransparency = .standard,
        motion: DSMotionMode = .standard
    ) -> DSTokenSet {
        DSTokenSet(DSTokenContext(
            brand: .default, colorScheme: scheme, contrast: contrast, transparency: transparency,
            density: density, modality: .touch, motion: motion
        ))
    }

    static func resolve(
        _ material: DSSurfaceMaterial,
        backdrop: DSBackdropKind = .none,
        selected: Bool = false,
        _ tokens: DSTokenSet,
        isWatch: Bool = false
    ) -> DSSurfaceResolution {
        DSSurface.resolve(
            material: material, backdrop: backdrop, selected: selected,
            context: tokens.context, tokens: tokens.material, isWatch: isWatch
        )
    }

    // MARK: - tokens.root

    /// `tokens.root.background`, cell by cell; vivid has no cell and draws `tokens.root.gradient`.
    @Test func backgroundFollowsTheRenderedMaterial() {
        let expected: [DSSurfaceMaterial: DSColorToken?] = [
            .page: .bgPage, .solid: .bgSurface, .raised: .bgSurfaceRaised, .nested: .bgSurfaceNested,
            .inverse: .bgFillInverse, .accent: .bgFillAccent, .glass: .materialGlassFill,
            .glassLight: .materialGlassLightFill, .vivid: nil,
        ]
        for material in DSSurfaceMaterial.allCases {
            #expect(DSSurfaceAppearance.background(material) == expected[material] ?? nil, "\(material)")
        }
    }

    /// `tokens.root.underlay` and ADR-0030 §5.1: page under solid, raised and nested, and under the glass fallback,
    /// which renders raised.
    @Test func thePageIsPaintedUnderTheWhiteAlphaSurfaces() {
        let tokens = Self.tokens()
        for material in DSSurfaceMaterial.allCases {
            let resolution = Self.resolve(material, backdrop: .image, tokens)
            let paints = [.solid, .raised, .nested].contains(material)
            #expect((DSSurfaceAppearance.underlay(resolution) == .bgPage) == paints, "\(material)")
        }
        let fallback = Self.resolve(.glass, backdrop: .image, Self.tokens(transparency: .reduced))
        #expect(DSSurfaceAppearance.underlay(fallback) == .bgPage)
        #expect(DSSurfaceAppearance.background(fallback.material) == .bgSurfaceRaised)
    }

    /// `tokens.root.gradient`: the default, or the named slot.
    @Test func vividTakesTheDefaultGradientOrItsSlot() {
        for scheme in DSColorScheme.allCases {
            let tokens = Self.tokens(scheme: scheme)
            #expect(DSSurfaceAppearance.gradient(.default, tokens) == tokens.gradient.vividDefault)
            #expect(DSSurfaceAppearance.gradient(.slot1, tokens) == tokens.gradient.vivid1)
            #expect(DSSurfaceAppearance.gradient(.slot2, tokens) == tokens.gradient.vivid2)
            #expect(DSSurfaceAppearance.gradient(.slot3, tokens) == tokens.gradient.vivid3)
            #expect(DSSurfaceAppearance.gradient(.slot4, tokens) == tokens.gradient.vivid4)
        }
    }

    /// `tokens.root.radius`.
    @Test func radiusCells() {
        let radius = Self.tokens().radius
        let expected: [DSSurfaceRadius: CGFloat] = [
            .none: 0, .inner: radius.inner, .tile: radius.tile, .cardCompact: radius.cardCompact, .card: radius.card,
            .sheet: radius.sheet, .cardLarge: radius.cardLarge, .hero: radius.hero, .pill: radius.control,
        ]
        for option in DSSurfaceRadius.allCases {
            #expect(option.value(radius) == expected[option], "\(option)")
        }
    }

    /// `tokens.root.padding`, per density.
    @Test func paddingCells() {
        for density in DSDensity.allCases {
            let space = Self.tokens(density: density).space
            #expect(DSSurfacePadding.card.value(space) == space.cardPadding)
            #expect(DSSurfacePadding.none.value(space) == 0)
        }
    }

    /// `tokens.root.shadow`, and the level a Surface draws when none is declared: specVersion 3 states it in the
    /// `elevation` prop and in behavior — the default of the material the caller **requested**, `raised` for material
    /// raised (`elevation.1`, ADR-0030 §5.2) and `flat` for every other material, with a declared elevation always
    /// winning. The requested material is what counts, so a glass surface that asked for nothing stays flat under the
    /// fallback.
    @Test func elevationCells() {
        for scheme in DSColorScheme.allCases {
            let elevation = Self.tokens(scheme: scheme).elevation
            #expect(DSSurfaceElevation.flat.shadow(elevation) == elevation.level0)
            #expect(DSSurfaceElevation.raised.shadow(elevation) == elevation.level1)
            #expect(DSSurfaceElevation.floating.shadow(elevation) == elevation.level2)
            #expect(DSSurfaceElevation.overlay.shadow(elevation) == elevation.level3)
        }
        for material in DSSurfaceMaterial.allCases {
            let expected: DSSurfaceElevation = material == .raised ? .raised : .flat
            #expect(DSSurfaceAppearance.elevation(declared: nil, requested: material) == expected, "\(material)")
            #expect(DSSurfaceAppearance.elevation(declared: .overlay, requested: material) == .overlay, "\(material)")
            #expect(DSSurfaceElevation.materialDefault(for: material) == expected, "\(material)")
        }
        // The fallback changes what is drawn, not what was asked for: glass that declared nothing stays flat.
        #expect(DSSurfaceAppearance.elevation(declared: nil, requested: .glass) == .flat)
        #expect(DSSurfaceAppearance.elevation(declared: .floating, requested: .glass) == .floating)
    }

    /// "Solid surfaces never draw a border or a shadow at `flat`": `elevation.0` carries nothing to draw.
    @Test func flatDrawsNoShadow() {
        for scheme in DSColorScheme.allCases {
            let layers = DSSurfaceElevation.flat.shadow(Self.tokens(scheme: scheme).elevation).layers
            #expect(layers.allSatisfy { $0.color.alpha == 0 })
        }
        #expect(DSSurfaceAppearance.edge(Self.resolve(.solid, Self.tokens()), Self.tokens()) == nil)
    }

    // MARK: - edge, grain, bloom

    @Test func edgeCells() {
        for scheme in DSColorScheme.allCases {
            let tokens = Self.tokens(scheme: scheme)
            let glass = Self.resolve(.glass, backdrop: .map, tokens)
            let light = Self.resolve(.glassLight, backdrop: .image, tokens)
            #expect(DSSurfaceAppearance.edge(glass, tokens) == .highlight(
                color: .edgeHighlight, start: tokens.material.glassFillEdgeStart, end: tokens.material.glassFillEdgeEnd
            ))
            #expect(DSSurfaceAppearance.edge(light, tokens) == .highlight(
                color: .edgeHighlight, start: tokens.material.glassLightFillEdgeStart, end: tokens.material.glassLightFillEdgeEnd
            ))
            #expect(DSSurfaceAppearance.edge(Self.resolve(.vivid, tokens), tokens) == .highlight(
                color: .edgeHighlight, start: tokens.material.vividEdgeStart, end: tokens.material.vividEdgeEnd
            ))
            #expect(DSSurfaceAppearance.edge(Self.resolve(.raised, tokens), tokens) == .top(color: .edgeRaised))
            for material in [DSSurfaceMaterial.page, .solid, .nested, .inverse, .accent] {
                #expect(DSSurfaceAppearance.edge(Self.resolve(material, tokens), tokens) == nil, "\(material)")
            }
        }
    }

    /// Under the fallback the recipe's edge, grain and bloom are dropped; the raised top edge stays, and a selected
    /// glass surface renders inverse, which draws none.
    @Test func theFallbackDropsTheRecipe() {
        let triggers: [(String, DSTokenSet, DSBackdropKind, Bool)] = [
            ("Reduce Transparency", Self.tokens(transparency: .reduced), .map, false),
            ("Increase Contrast", Self.tokens(contrast: .increased), .map, false),
            ("invalid backdrop", Self.tokens(), .none, false),
            ("watchOS", Self.tokens(scheme: .dark), .map, true),
        ]
        for (name, tokens, backdrop, isWatch) in triggers {
            for material in [DSSurfaceMaterial.glass, .glassLight] {
                let resolution = Self.resolve(material, backdrop: backdrop, tokens, isWatch: isWatch)
                #expect(DSSurfaceAppearance.edge(resolution, tokens) == .top(color: .edgeRaised), "\(name) \(material)")
                #expect(DSSurfaceAppearance.grain(resolution, gradient: tokens.gradient.vividDefault) == 0, "\(name) \(material)")
                #expect(DSSurfaceAppearance.glassBloom(resolution) == 0, "\(name) \(material)")
                let selected = Self.resolve(material, backdrop: backdrop, selected: true, tokens, isWatch: isWatch)
                #expect(selected.material == .inverse, "\(name) \(material)")
                #expect(DSSurfaceAppearance.edge(selected, tokens) == nil, "\(name) \(material)")
                #expect(DSSurfaceAppearance.background(selected.material) == .bgFillInverse, "\(name) \(material)")
            }
        }
    }

    @Test func grainAndBloomCells() {
        for scheme in DSColorScheme.allCases {
            let tokens = Self.tokens(scheme: scheme)
            let gradient = tokens.gradient.vivid3
            #expect(DSSurfaceAppearance.grain(Self.resolve(.vivid, tokens), gradient: gradient) == gradient.grain)
            #expect(DSSurfaceAppearance.grain(Self.resolve(.glass, backdrop: .vivid, tokens), gradient: gradient) == tokens.material.glassFillGrain)
            #expect(DSSurfaceAppearance.grain(Self.resolve(.glassLight, backdrop: .map, tokens), gradient: gradient) == tokens.material.glassLightFillGrain)
            #expect(DSSurfaceAppearance.glassBloom(Self.resolve(.glass, backdrop: .image, tokens)) == tokens.material.glassFillBloom)
            #expect(DSSurfaceAppearance.glassBloom(Self.resolve(.glassLight, backdrop: .image, tokens)) == tokens.material.glassLightFillBloom)
            for material in [DSSurfaceMaterial.page, .solid, .raised, .nested, .inverse, .accent] {
                #expect(DSSurfaceAppearance.grain(Self.resolve(material, tokens), gradient: gradient) == 0, "\(material)")
                #expect(DSSurfaceAppearance.glassBloom(Self.resolve(material, tokens)) == 0, "\(material)")
            }
        }
    }

    // MARK: - Geometry

    /// The concentric rule: parent radius minus parent padding, never rounder than the parent, and the requested
    /// radius kept when smaller.
    @Test func nestedSurfacesAreConcentric() {
        let radius = Self.tokens().radius
        let hero = DSSurfaceGeometry(radius: radius.hero, padding: 24)
        #expect(DSSurfaceAppearance.radius(requested: .card, radius, parent: nil) == radius.card)
        #expect(DSSurfaceAppearance.radius(requested: .card, radius, parent: hero) == radius.hero - 24)
        #expect(DSSurfaceAppearance.radius(requested: .inner, radius, parent: hero) == radius.inner)
        #expect(DSSurfaceAppearance.radius(requested: .card, radius, parent: DSSurfaceGeometry(radius: radius.tile, padding: 0)) == radius.tile)
        #expect(DSSurfaceAppearance.radius(requested: .card, radius, parent: DSSurfaceGeometry(radius: radius.inner, padding: 24)) == 0)
        #expect(DSSurfaceAppearance.radius(requested: .pill, radius, parent: hero) == radius.hero - 24)
    }

    /// The card header block of ADR-0022 §4.1 at the V2 reference sizes and densities, which grain and the glass bloom
    /// leave out: x from p to W − p − a − 16, y from p to p + 64.
    @Test func headerBlockMatchesV2() {
        let sizes = [CGSize(width: 166, height: 166), CGSize(width: 240, height: 240), CGSize(width: 320, height: 200), CGSize(width: 180, height: 240)]
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            let p = tokens.space.cardPadding
            let a = tokens.size.controlMd
            for size in sizes {
                let block = DSSurfaceAppearance.headerBlock(size: size, tokens)
                #expect(block.minX == p && block.minY == p, "\(density) \(size)")
                #expect(block.maxX == size.width - p - a - 16, "\(density) \(size)")
                #expect(block.height == 64, "\(density) \(size)")
            }
        }
        let tiny = DSSurfaceAppearance.headerBlock(size: CGSize(width: 40, height: 30), Self.tokens(density: .compact))
        #expect(tiny.width == 0 && tiny.height == 14)
    }

    /// The glass bloom is left out of **the card** header block: a Surface that carries a Card's header excludes that
    /// block, and a Surface that carries no card header excludes nothing and draws its bloom whole (Surface.yaml
    /// behavior; `DSSurfaceLayers.glassBloom(_:)` carries the evidence). Grain keeps the block on every Surface,
    /// which ADR-0030 §4.4 states for a Surface and not for a Card.
    @Test func theBloomExclusionIsTheCardHeaderBlockOnly() {
        let size = CGSize(width: 240, height: 240)
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            #expect(DSSurfaceAppearance.bloomExclusion(size: size, tokens, hasCardHeaderBlock: false) == nil, "\(density)")
            #expect(
                DSSurfaceAppearance.bloomExclusion(size: size, tokens, hasCardHeaderBlock: true)
                    == DSSurfaceAppearance.headerBlock(size: size, tokens),
                "\(density)"
            )
        }
    }

    /// The geometry numbers the behavior block states: 135°, 75 %, 10 % down, 0.92, 75 % of the shorter side.
    @Test func geometryConstantsAreTheSpecs() {
        #expect(DSSurfaceAppearance.edgeAngle == 135)
        #expect(DSSurfaceAppearance.edgeEndLocation == 0.75)
        #expect(DSSurfaceAppearance.vividBloomOffset == 0.1)
        #expect(DSSurfaceAppearance.vividBloomScale == 0.92)
        #expect(DSSurfaceAppearance.glassBloomRadius == 0.75)
    }

    /// A CSS box-shadow blur is twice the standard deviation; SwiftUI takes DSCore's conversion of that deviation.
    @Test func shadowBlurUsesTheCSSStandardDeviation() {
        #expect(abs(DSSurfaceAppearance.shadowRadius(cssBlur: 60) - DSBlur.radius(cssStandardDeviation: 30)) < 0.0001)
        #expect(abs(DSSurfaceAppearance.blurBleed(radius: DSBlur.radius(cssStandardDeviation: 10)) - 30) < 0.0001)
    }

    // MARK: - Motion

    /// `motion.materialChange` is `motion.spring.smooth`; under Reduce Motion the change crossfades over
    /// `motion.duration.base` with `motion.easing.out` (`reduceMotion: crossfade`).
    @Test @MainActor func materialChangeMotion() {
        let standard = DSMotion(Self.tokens().motion)
        let reduced = DSMotion(Self.tokens(motion: .reduced).motion)
        #expect(DSSurfaceAppearance.materialChange(standard) == standard.tokens.springSmooth.animation)
        #expect(DSSurfaceAppearance.materialChange(reduced) == reduced.tokens.easingOut.animation(duration: reduced.tokens.durationBase))
    }

    // MARK: - The published context

    /// The context a Surface publishes reaches the views inside it: the material it renders. The render is only the
    /// vehicle — nothing here reads a pixel, so it stays on the host, where `DSSurfaceRenderTests` (DSSnapshotTests,
    /// the simulator) cannot.
    @Test @MainActor func descendantsReadThePublishedMaterial() {
        var published: [DSSurfaceMaterial: DSSurfaceContext] = [:]
        for material in [DSSurfaceMaterial.solid, .vivid, .inverse] {
            let probe = ContextProbe()
            let view = DSTheme {
                DSSurfaceView(material: material) { ContextReader(probe: probe) }
            }
            _ = ImageRenderer(content: view).cgImage
            published[material] = probe.value
        }
        #expect(published[.solid] == DSSurfaceContext(material: .solid))
        #expect(published[.vivid]?.material == (DSPlatform.isWatch ? .solid : .vivid))
        #expect(published[.inverse] == DSSurfaceContext(material: .inverse))
    }
}

final class ContextProbe {
    var value: DSSurfaceContext?
}

struct ContextReader: View {
    let probe: ContextProbe
    @Environment(\.dsSurfaceContext) private var context

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site.
    init(probe: ContextProbe) {
        self.probe = probe
    }

    var body: some View {
        probe.value = context
        return Color.clear.frame(width: 1, height: 1)
    }
}
