import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0022 rule 1, the table-driven check it names: every combination of watchOS, contrast, transparency,
/// backdrop kind, material and `selected`, through a forced `DSTokenContext`.
///
/// The expectations restate ADR-0022 §1.2 and §1.6 in the test rather than calling into the implementation, so a
/// change of rule fails here before it reaches a snapshot.
@Suite("Surface resolution (ADR-0022 §1)")
struct DSSurfaceResolutionTests {
    /// The four triggers of ADR-0022 §1.2, written out.
    private func expectedFallback(
        material: DSSurfaceMaterial,
        backdrop: DSBackdropKind,
        contrast: DSContrast,
        transparency: DSTransparency,
        isWatch: Bool
    ) -> Bool {
        guard material == .glass || material == .glassLight else { return false }
        let backdropIsMedia = backdrop == .image || backdrop == .map || backdrop == .vivid
        return isWatch || transparency == .reduced || contrast == .increased || !backdropIsMedia
    }

    @Test func theWholeTable() {
        for isWatch in [false, true] {
            for contrast in DSContrast.allCases {
                for transparency in DSTransparency.allCases {
                    let context = DSTokenContext(contrast: contrast, transparency: transparency)
                    let tokens = DSTokenSet(context)
                    for backdrop in DSBackdropKind.allCases {
                        for requested in DSSurfaceMaterial.allCases {
                            for selected in [false, true] {
                                let resolution = DSSurface.resolve(
                                    material: requested,
                                    backdrop: backdrop,
                                    selected: selected,
                                    context: context,
                                    tokens: tokens.material,
                                    isWatch: isWatch
                                )
                                let label =
                                    "\(requested) over \(backdrop), contrast \(contrast), transparency \(transparency), watch \(isWatch), selected \(selected)"

                                let fallback = expectedFallback(
                                    material: requested, backdrop: backdrop,
                                    contrast: contrast, transparency: transparency, isWatch: isWatch
                                )
                                #expect(resolution.isGlassFallback == fallback, "\(label): fallback")

                                let expected: DSSurfaceMaterial
                                if fallback {
                                    // §1.6: selection survives the fallback as `inverse`; otherwise one opaque `raised`.
                                    expected = selected ? .inverse : .raised
                                } else if requested == .vivid && isWatch {
                                    expected = .solid
                                } else {
                                    expected = requested
                                }
                                #expect(resolution.material == expected, "\(label): material")
                                #expect(resolution.published.material == expected, "\(label): published material")
                                #expect(resolution.published.backdrop == backdrop, "\(label): published backdrop")
                                #expect(resolution.requested == requested, "\(label): requested")

                                // Trigger 4 is reported whatever the other triggers, so the Surface can log it.
                                let invalid = (requested == .glass || requested == .glassLight) && backdrop == .none
                                #expect(resolution.hasInvalidBackdrop == invalid, "\(label): invalid backdrop")

                                // A recipe exists exactly when glass renders.
                                let rendersGlass = (requested == .glass || requested == .glassLight) && !fallback
                                #expect((resolution.glass != nil) == rendersGlass, "\(label): recipe")
                                if rendersGlass {
                                    let appearance: DSGlassAppearance = requested == .glass ? .fill : .lightFill
                                    #expect(resolution.glass == appearance.recipe(tokens.material), "\(label): recipe values")
                                }

                                // ADR-0030 §5.1 and §5.2.
                                #expect(
                                    resolution.paintsPage == (expected == .solid || expected == .raised || expected == .nested),
                                    "\(label): paints the page"
                                )
                                #expect(resolution.drawsRaisedEdge == (expected == .raised), "\(label): raised edge")
                                // ADR-0022 §1.7: vivid is unchanged, but its bloom is dropped under Reduce Transparency.
                                #expect(
                                    resolution.drawsVividBloom == (expected == .vivid && transparency != .reduced),
                                    "\(label): vivid bloom"
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    @Test func selectionOnlyMattersUnderTheFallback() {
        let standard = DSTokenContext()
        let tokens = DSTokenSet(standard)
        for material in [DSSurfaceMaterial.glass, .glassLight] {
            let selected = DSSurface.resolve(
                material: material, backdrop: .image, selected: true,
                context: standard, tokens: tokens.material, isWatch: false
            )
            #expect(selected.material == material, "selection does not change a glass that renders")

            let forced = DSTokenContext(transparency: .reduced)
            let underFallback = DSSurface.resolve(
                material: material, backdrop: .image, selected: true,
                context: forced, tokens: DSTokenSet(forced).material, isWatch: false
            )
            #expect(underFallback.material == .inverse)
        }
    }

    @Test func aNonGlassMaterialIsNeverSubstitutedOffTheWatch() {
        for material in DSSurfaceMaterial.allCases where !material.isGlass {
            for contrast in DSContrast.allCases {
                for transparency in DSTransparency.allCases {
                    let context = DSTokenContext(contrast: contrast, transparency: transparency)
                    let resolution = DSSurface.resolve(
                        material: material, backdrop: .none, selected: false,
                        context: context, tokens: DSTokenSet(context).material, isWatch: false
                    )
                    #expect(resolution.material == material)
                    #expect(!resolution.isGlassFallback)
                    #expect(!resolution.hasInvalidBackdrop)
                }
            }
        }
    }

    /// ADR-0029 §1.2: the scheme's glass is a role recipe whose seven fields alias the light appearance recipe in
    /// light and the dark one in dark. It keeps its own colorset, so only the fields are compared.
    @Test func theSchemeGlassFollowsTheScheme() {
        for scheme in DSColorScheme.allCases {
            let material = DSTokenSet(DSTokenContext(colorScheme: scheme)).material
            let aliased: (DSGlassAppearance, DSGlassAppearance) = scheme == .light
                ? (.lightFill, .lightChip)
                : (.darkFill, .darkChip)
            #expect(DSGlassAppearance.fill.recipe(material).hasSameFields(as: aliased.0.recipe(material)), "\(scheme) fill")
            #expect(DSGlassAppearance.chip.recipe(material).hasSameFields(as: aliased.1.recipe(material)), "\(scheme) chip")

            // Each role recipe keeps its own colorset, so it is not the appearance recipe itself.
            #expect(DSGlassAppearance.fill.recipe(material).token == .materialGlassFill)
            #expect(DSGlassAppearance.chip.recipe(material).token == .materialGlassChip)
            #expect(DSGlassAppearance.fill.recipe(material) != aliased.0.recipe(material))
        }
    }

    /// The convenience a component calls takes the context from the token set it already holds.
    @Test func theTokenSetOverloadResolvesTheSame() {
        for context in [DSTokenContext(), DSTokenContext(contrast: .increased), DSTokenContext(transparency: .reduced)] {
            let tokens = DSTokenSet(context)
            #expect(
                DSSurface.resolve(material: .glass, backdrop: .map, tokens: tokens, isWatch: false)
                    == DSSurface.resolve(
                        material: .glass, backdrop: .map, selected: false,
                        context: context, tokens: tokens.material, isWatch: false
                    )
            )
        }
    }

    /// The seven recipes of ADR-0022 §2.1 and ADR-0029 §1.2 each name their own colorset.
    @Test func everyRecipeNamesItsOwnColorset() {
        let tokens = Set(DSGlassAppearance.allCases.map(\.fillToken))
        #expect(tokens.count == DSGlassAppearance.allCases.count)
    }
}
