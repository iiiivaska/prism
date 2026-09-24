import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0036 rule 3, the table it names, with ADR-0037's third enclosure: the glass chip resolves by ADR-0036 §3 as
/// ADR-0037 §2 amends it, with the triggers Surface uses. Every combination of what the component asks for, the ground's
/// material and backdrop kind, the gate, the publication, the enclosure, contrast, transparency and the watch —
/// 3 × 9 × 4 × 2 × 2 × 3 × 2 × 2 × 2 = 10,368 rows — through a forced `DSTokenContext`, with `encloses` checked in every
/// row.
///
/// As `DSSurfaceResolutionTests` does for Surface, the expectations restate the rules in the test rather than calling
/// into the implementation, so a change of rule fails here before it reaches a render. The web twin is
/// `web/packages/react/test/surface-chip.test.tsx`: the same table without the watch, 5,184 rows.
@Suite("Glass chip resolution (ADR-0036 §3, ADR-0037 §2)")
struct DSSurfaceChipResolutionTests {
    /// ADR-0036 §3 step 1 as ADR-0037 §2 amends it, written out: inside a chip that renders its own cell or its fallback
    /// there is no media; otherwise the page and the two glasses sit on the backdrop they declare, vivid is media of its
    /// own, and every other material is opaque paint.
    private func expectedMedia(under ground: DSSurfaceContext, in enclosure: DSSurfaceChipEnclosure) -> DSBackdropKind {
        if enclosure == .opaque {
            return .none
        }
        switch ground.material {
        case .page, .glass, .glassLight: return ground.backdrop
        case .vivid: return .vivid
        case .solid, .raised, .nested, .inverse, .accent: return .none
        }
    }

    /// ADR-0037 §1's three enclosures, in its order.
    @Test func theEnclosuresAreADR0037s() {
        #expect(DSSurfaceChipEnclosure.allCases.map(\.rawValue) == ["none", "translucent", "opaque"])
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
                                        for enclosure in DSSurfaceChipEnclosure.allCases {
                                            rows += 1
                                            let resolution = DSSurface.resolveChip(
                                                requested, on: ground, enclosure: enclosure, gate: gate,
                                                publishes: publishes, context: context, tokens: tokens.material,
                                                isWatch: isWatch
                                            )
                                            let label =
                                                "\(requested) on \(material) over \(kind), gate \(gate), publishes \(publishes), enclosure \(enclosure), contrast \(contrast), transparency \(transparency), watch \(isWatch)"

                                            // Step 2: glass under the content gate with no media under it, on the ground
                                            // or in an opaque enclosure. Reported whatever the other triggers, so the
                                            // chip can log it.
                                            let asksForGlass = requested == .glass
                                            let media = expectedMedia(under: ground, in: enclosure)
                                            let invalid = asksForGlass && gate == .content && media == .none
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

                                            // Step 5 (§5, ADR-0037 §2): a backdrop filter only where no chip encloses
                                            // this one, and never on glass or light glass.
                                            let onGlass = material == .glass || material == .glassLight
                                            let blurs = rendered == .glass && !onGlass && enclosure == .none
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

                                            // Step 8 (ADR-0037 §1): an own cell, a fallback or an opaque enclosure hands
                                            // the content `opaque`; the recipe or nothing, `translucent`.
                                            let paintsItsCell = rendered == .own || rendered == .fallback
                                            let encloses: DSSurfaceChipEnclosure =
                                                paintsItsCell || enclosure == .opaque ? .opaque : .translucent
                                            #expect(resolution.encloses == encloses, "\(label): encloses")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        #expect(rows == 10_368)
    }

    /// ADR-0036 §3 step 3 and rule 3's second check: one function evaluates the triggers for Surface and the chip, so
    /// the two fall back together — for every contrast, transparency, watch, kind and enclosure, on every ground. A chip
    /// under the `content` gate falls back exactly where a glass Surface over the chip's media would, and under the
    /// `chrome` gate exactly where one over media would, since there the backdrop is never invalid.
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
                            for enclosure in DSSurfaceChipEnclosure.allCases {
                                let rowLabel = "\(material) \(label), enclosure \(enclosure)"
                                let media = expectedMedia(under: ground, in: enclosure)
                                let overMedia = DSSurface.resolve(
                                    material: .glass, backdrop: media, context: context, tokens: tokens, isWatch: isWatch
                                )
                                let content = DSSurface.resolveChip(
                                    .glass, on: ground, enclosure: enclosure, gate: .content,
                                    context: context, tokens: tokens, isWatch: isWatch
                                )
                                #expect(content.isGlassFallback == overMedia.isGlassFallback, "\(rowLabel): content gate")
                                #expect(content.hasInvalidBackdrop == overMedia.hasInvalidBackdrop, "\(rowLabel): content gate")

                                let overAnyMedia = DSSurface.resolve(
                                    material: .glass, backdrop: .map, context: context, tokens: tokens, isWatch: isWatch
                                )
                                let chrome = DSSurface.resolveChip(
                                    .glass, on: ground, enclosure: enclosure, gate: .chrome,
                                    context: context, tokens: tokens, isWatch: isWatch
                                )
                                #expect(chrome.isGlassFallback == overAnyMedia.isGlassFallback, "\(rowLabel): chrome gate")
                                #expect(!chrome.hasInvalidBackdrop, "\(rowLabel): chrome gate never has an invalid backdrop")
                            }
                        }
                    }
                }
            }
        }
    }

    /// ADR-0037 §2's table of outcomes, composed from two resolutions: a host chip hands its content `encloses`, and a
    /// nested chip that asks for glass resolves in that enclosure on the context the host publishes. Inside a host that
    /// renders the recipe or nothing, the nested chip renders the recipe under either gate; inside one that renders its
    /// own cell or its fallback, it falls back under `content` and renders the recipe under `chrome`. It never blurs,
    /// and it hands on what its host handed it. The hosts sit on the page over a map, except the fallback's, which asks
    /// for glass on the plain page under the `content` gate, where no media is under it.
    @Test func aNestedGlassChipResolvesByADR0037sTable() {
        let context = DSTokenContext()
        let tokens = DSTokenSet(context).material
        let onTheMap = DSSurfaceContext(material: .page, backdrop: .map)
        let hosts = [
            DSSurface.resolveChip(.glass, on: onTheMap, context: context, tokens: tokens, isWatch: false),
            DSSurface.resolveChip(.none, on: onTheMap, context: context, tokens: tokens, isWatch: false),
            DSSurface.resolveChip(.own, on: onTheMap, context: context, tokens: tokens, isWatch: false),
            DSSurface.resolveChip(.glass, on: .root, context: context, tokens: tokens, isWatch: false),
        ]
        #expect(hosts.map(\.rendered.rawValue) == ["glass", "none", "own", "fallback"])
        for host in hosts {
            let label = "inside a host that renders \(host.rendered)"
            let paintsItsCell = host.rendered == .own || host.rendered == .fallback
            let handedOn: DSSurfaceChipEnclosure = paintsItsCell ? .opaque : .translucent
            #expect(host.encloses == handedOn, "\(label): what the host hands on")

            let content = DSSurface.resolveChip(
                .glass, on: host.published, enclosure: host.encloses, gate: .content,
                context: context, tokens: tokens, isWatch: false
            )
            let underContent: DSSurfaceChipRendering = paintsItsCell ? .fallback : .glass
            #expect(content.rendered == underContent, "\(label): content gate")
            #expect(!content.blursBackdrop, "\(label): content gate")
            #expect(content.encloses == handedOn, "\(label): content gate")

            let chrome = DSSurface.resolveChip(
                .glass, on: host.published, enclosure: host.encloses, gate: .chrome,
                context: context, tokens: tokens, isWatch: false
            )
            #expect(chrome.rendered == .glass, "\(label): chrome gate")
            #expect(!chrome.blursBackdrop, "\(label): chrome gate")
            #expect(chrome.encloses == handedOn, "\(label): chrome gate")
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
    /// enclosure, gate, publication and watch. `dsSurfaceChip` calls this overload, so an enclosure dropped here would blur
    /// a glass chip inside another chip, and give one inside an own cell the media under that cell (ADR-0037 §2).
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
                            .glass, on: ground, enclosure: DSSurfaceChipEnclosure.none, gate: .content,
                            publishes: .ground, context: context, tokens: tokens.material, isWatch: false
                        ),
                    "\(ground): the defaults"
                )
                for enclosure in DSSurfaceChipEnclosure.allCases {
                    for gate in DSSurfaceChipGate.allCases {
                        for publishes in DSSurfaceChipPublication.allCases {
                            for isWatch in [false, true] {
                                #expect(
                                    DSSurface.resolveChip(
                                        .glass, on: ground, enclosure: enclosure, gate: gate, publishes: publishes,
                                        tokens: tokens, isWatch: isWatch
                                    )
                                        == DSSurface.resolveChip(
                                            .glass, on: ground, enclosure: enclosure, gate: gate, publishes: publishes,
                                            context: context, tokens: tokens.material, isWatch: isWatch
                                        ),
                                    "\(ground), enclosure \(enclosure), gate \(gate), publishes \(publishes), watch \(isWatch)"
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
