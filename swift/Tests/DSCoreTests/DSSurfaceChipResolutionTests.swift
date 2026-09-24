import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0036 rule 3, the table it names: the glass chip resolves by §3, with the triggers Surface uses. Every
/// combination of what the component asks for, the ground's material and backdrop kind, the gate, the publication,
/// whether a glass chip encloses it, contrast, transparency and the watch — 3 × 9 × 4 × 2 × 2 × 2 × 2 × 2 × 2 = 6,912
/// rows — through a forced `DSTokenContext`.
///
/// As `DSSurfaceResolutionTests` does for Surface, the expectations restate ADR-0036 §3 in the test rather than calling
/// into the implementation, so a change of rule fails here before it reaches a render. The web twin is
/// `web/packages/react/test/surface-chip.test.tsx`: the same table without the watch, 3,456 rows.
@Suite("Glass chip resolution (ADR-0036 §3)")
struct DSSurfaceChipResolutionTests {
    /// ADR-0036 §3 step 1, written out: the page and the two glasses sit on the backdrop they declare, vivid is media
    /// of its own, and every other material is opaque paint.
    private func expectedMedia(under ground: DSSurfaceContext) -> DSBackdropKind {
        switch ground.material {
        case .page, .glass, .glassLight: ground.backdrop
        case .vivid: .vivid
        case .solid, .raised, .nested, .inverse, .accent: .none
        }
    }

    @Test func theWholeTable() {
        var rows = 0
        for isWatch in [false, true] {
            for contrast in DSContrast.allCases {
                for transparency in DSTransparency.allCases {
                    let context = DSTokenContext(contrast: contrast, transparency: transparency)
                    let tokens = DSTokenSet(context)
                    for material in DSSurfaceMaterial.allCases {
                        for kind in DSBackdropKind.allCases {
                            let ground = DSSurfaceContext(material: material, backdrop: kind)
                            for requested in DSSurfaceChipFill.allCases {
                                for gate in DSSurfaceChipGate.allCases {
                                    for publishes in DSSurfaceChipPublication.allCases {
                                        for enclosed in [false, true] {
                                            rows += 1
                                            let resolution = DSSurface.resolveChip(
                                                requested, on: ground, insideGlassChip: enclosed, gate: gate,
                                                publishes: publishes, context: context, tokens: tokens.material,
                                                isWatch: isWatch
                                            )
                                            let label =
                                                "\(requested) on \(material) over \(kind), gate \(gate), publishes \(publishes), enclosed \(enclosed), contrast \(contrast), transparency \(transparency), watch \(isWatch)"

                                            // Step 2: glass under the content gate on a ground with no media. Reported
                                            // whatever the other triggers, so the chip can log it.
                                            let asksForGlass = requested == .glass
                                            let invalid = asksForGlass && gate == .content && expectedMedia(under: ground) == .none
                                            #expect(resolution.hasInvalidBackdrop == invalid, "\(label): invalid backdrop")

                                            // Step 3: ADR-0022 §1.2's four triggers, the watch first.
                                            let fallback =
                                                asksForGlass
                                                && (isWatch || transparency == .reduced || contrast == .increased || invalid)
                                            #expect(resolution.isGlassFallback == fallback, "\(label): fallback")

                                            let rendered: DSSurfaceChipRendering
                                            switch requested {
                                            case .glass: rendered = fallback ? .fallback : .glass
                                            case .own: rendered = .own
                                            case .none: rendered = .none
                                            }
                                            #expect(resolution.rendered == rendered, "\(label): rendered")
                                            #expect(resolution.requested == requested, "\(label): requested")
                                            #expect(resolution.ground == ground, "\(label): ground")

                                            // Step 4: the scheme's chip recipe exactly when glass renders.
                                            let recipe = rendered == .glass ? DSGlassAppearance.chip.recipe(tokens.material) : nil
                                            #expect(resolution.glass == recipe, "\(label): recipe")

                                            // Step 5 (§5): never a backdrop filter on glass, on light glass or inside a
                                            // glass chip.
                                            let blurs = rendered == .glass && material != .glass && material != .glassLight && !enclosed
                                            #expect(resolution.blursBackdrop == blurs, "\(label): blurs the backdrop")

                                            // Step 6: the page under the chip exactly under the fallback.
                                            #expect(resolution.paintsPage == fallback, "\(label): paints the page")

                                            // Step 7 (§4): the ground, or `(raised, none)` — under the fallback never
                                            // `inverse`, which a chip has no `selected` to ask for.
                                            let published =
                                                fallback || publishes == .raised
                                                ? DSSurfaceContext(material: .raised, backdrop: .none)
                                                : ground
                                            #expect(resolution.published == published, "\(label): published")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        #expect(rows == 6_912)
    }

    /// ADR-0036 §3 step 3 and rule 3's second check: one function evaluates the triggers for Surface and the chip, so
    /// the two fall back together — for every contrast, transparency, watch and kind, on every ground. A chip under the
    /// `content` gate falls back exactly where a glass Surface over the chip's media would, and under the `chrome` gate
    /// exactly where one over media would, since there the backdrop is never invalid.
    @Test func theChipAndSurfaceFallBackTogether() {
        for isWatch in [false, true] {
            for contrast in DSContrast.allCases {
                for transparency in DSTransparency.allCases {
                    let context = DSTokenContext(contrast: contrast, transparency: transparency)
                    let tokens = DSTokenSet(context).material
                    for kind in DSBackdropKind.allCases {
                        let label = "\(kind), contrast \(contrast), transparency \(transparency), watch \(isWatch)"
                        for glass in [DSSurfaceMaterial.glass, .glassLight] {
                            let surface = DSSurface.resolve(
                                material: glass, backdrop: kind, context: context, tokens: tokens, isWatch: isWatch
                            )
                            let chip = DSSurface.resolveChip(
                                .glass, on: DSSurfaceContext(material: .page, backdrop: kind),
                                context: context, tokens: tokens, isWatch: isWatch
                            )
                            #expect(chip.isGlassFallback == surface.isGlassFallback, "\(glass) \(label): fallback")
                            #expect(chip.hasInvalidBackdrop == surface.hasInvalidBackdrop, "\(glass) \(label): invalid")
                        }
                        for material in DSSurfaceMaterial.allCases {
                            let ground = DSSurfaceContext(material: material, backdrop: kind)
                            let media = expectedMedia(under: ground)
                            let overMedia = DSSurface.resolve(
                                material: .glass, backdrop: media, context: context, tokens: tokens, isWatch: isWatch
                            )
                            let content = DSSurface.resolveChip(
                                .glass, on: ground, gate: .content, context: context, tokens: tokens, isWatch: isWatch
                            )
                            #expect(content.isGlassFallback == overMedia.isGlassFallback, "\(material) \(label): content gate")

                            let overAnyMedia = DSSurface.resolve(
                                material: .glass, backdrop: .map, context: context, tokens: tokens, isWatch: isWatch
                            )
                            let chrome = DSSurface.resolveChip(
                                .glass, on: ground, gate: .chrome, context: context, tokens: tokens, isWatch: isWatch
                            )
                            #expect(chrome.isGlassFallback == overAnyMedia.isGlassFallback, "\(material) \(label): chrome gate")
                            #expect(!chrome.hasInvalidBackdrop, "\(material) \(label): chrome gate never has an invalid backdrop")
                        }
                    }
                }
            }
        }
    }

    /// ADR-0036 §2.3: the recipe is `DSGlassAppearance.chip`'s, the scheme's chip glass, and its grain and bloom are 0
    /// in every brand and scheme, which is why the chip draws neither.
    @Test func theRecipeIsTheSchemesChipGlassWithNoGrainOrBloom() {
        for brand in DSBrand.allCases {
            for scheme in DSColorScheme.allCases {
                let context = DSTokenContext(brand: brand, colorScheme: scheme)
                let tokens = DSTokenSet(context)
                let label = "\(brand) \(scheme)"
                let chip = DSGlassAppearance.chip.recipe(tokens.material)
                #expect(chip.token == .materialGlassChip, "\(label)")
                #expect(chip.grain == 0, "\(label): grain \(chip.grain)")
                #expect(chip.bloom == 0, "\(label): bloom \(chip.bloom)")
                for kind in DSBackdropKind.allCases where kind.allowsGlass {
                    let resolution = DSSurface.resolveChip(
                        .glass, on: DSSurfaceContext(material: .page, backdrop: kind),
                        context: context, tokens: tokens.material, isWatch: false
                    )
                    #expect(resolution.glass == chip, "\(label) over \(kind)")
                    #expect(resolution.glass?.grain == 0 && resolution.glass?.bloom == 0, "\(label) over \(kind)")
                }
            }
        }
    }

    /// The convenience a component calls takes the context from the token set it already holds, as Surface's does, and
    /// hands every other argument through as given: its defaults are the other overload's, and so is its answer for each
    /// value of the enclosing-chip flag, the gate, the publication and the watch. `dsSurfaceChip` calls this overload, so
    /// a flag dropped here would blur a glass chip inside another (§5).
    @Test func theTokenSetOverloadResolvesTheSame() {
        for context in [DSTokenContext(), DSTokenContext(contrast: .increased), DSTokenContext(transparency: .reduced)] {
            let tokens = DSTokenSet(context)
            let grounds = [
                DSSurfaceContext(material: .page, backdrop: .map), DSSurfaceContext(material: .glass, backdrop: .image), .root,
            ]
            for ground in grounds {
                #expect(
                    DSSurface.resolveChip(.glass, on: ground, tokens: tokens, isWatch: false)
                        == DSSurface.resolveChip(
                            .glass, on: ground, insideGlassChip: false, gate: .content, publishes: .ground,
                            context: context, tokens: tokens.material, isWatch: false
                        ),
                    "\(ground): the defaults"
                )
                for enclosed in [false, true] {
                    for gate in DSSurfaceChipGate.allCases {
                        for publishes in DSSurfaceChipPublication.allCases {
                            for isWatch in [false, true] {
                                #expect(
                                    DSSurface.resolveChip(
                                        .glass, on: ground, insideGlassChip: enclosed, gate: gate, publishes: publishes,
                                        tokens: tokens, isWatch: isWatch
                                    )
                                        == DSSurface.resolveChip(
                                            .glass, on: ground, insideGlassChip: enclosed, gate: gate, publishes: publishes,
                                            context: context, tokens: tokens.material, isWatch: isWatch
                                        ),
                                    "\(ground), enclosed \(enclosed), gate \(gate), publishes \(publishes), watch \(isWatch)"
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
