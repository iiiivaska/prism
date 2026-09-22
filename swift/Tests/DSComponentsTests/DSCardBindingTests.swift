import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// `spec/components/Card.yaml` specVersion 5: the material, radius and shadow cells, the title, caption and action
/// cells keyed by the published context, the selection cue, V3 on vivid with the separator that joins the unit to
/// the caption, the header and the V2 block, the row gap of the anatomy, the action affordances per modality and per
/// handler, the accessible name, the motion — press magnitude included — and the watch adaptations.
@Suite("Card bindings (Card.yaml v5)")
struct DSCardBindingTests {
    static func tokens(
        scheme: DSColorScheme = .light,
        density: DSDensity = .regular,
        modality: DSModality = .touch,
        motion: DSMotionMode = .standard
    ) -> DSTokenSet {
        DSTokenSet(DSTokenContext(brand: .default, colorScheme: scheme, density: density, modality: modality, motion: motion))
    }

    // MARK: - tokens.root

    /// `tokens.root.background`: solid is the Surface's solid (`comp.card.solid.bg` → `color.bg.surface`), glass the
    /// scheme's glass (`comp.card.glass.fill` → `material.glass.fill`), vivid the gradient, and tinted the accent tint
    /// in place of the solid fill, over the page that solid surface paints under itself (behavior 7).
    @Test func materialCells() {
        #expect(DSCardVariant.solid.material == .solid)
        #expect(DSCardVariant.vivid.material == .vivid)
        #expect(DSCardVariant.glass.material == .glass)
        // Behavior 7: a tinted card asks for and publishes `solid`, never `page`.
        #expect(DSCardVariant.tinted.material == .solid)
        #expect(!DSCardVariant.allCases.contains { $0.material == .page })
        #expect(DSSurfaceAppearance.background(.solid) == .bgSurface)
        #expect(DSSurfaceAppearance.background(.glass) == .materialGlassFill)
        #expect(DSCardAppearance.tint(.tinted) == .bgTintAccent)
        #expect(DSCardVariant.tinted.fill == .bgTintAccent)
        // The underlay stays the material's, so the tint lies on color.bg.page (ADR-0030 §5.1).
        #expect(DSSurfaceAppearance.underlay(DSSurface.resolve(material: .solid, backdrop: .none, selected: false, tokens: Self.tokens())) == .bgPage)
        for variant in [DSCardVariant.solid, .vivid, .glass] {
            #expect(DSCardAppearance.tint(variant) == nil, "\(variant)")
            #expect(variant.fill == nil, "\(variant)")
        }
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            #expect(tokens.components.card.padding == DSSurfacePadding.card.value(tokens.space), "\(density)")
        }
    }

    /// `tokens.root.radius`: compact, regular, large, and the compact density's compact radius.
    @Test func radiusCells() {
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            let card = tokens.components.card
            #expect(DSCardAppearance.radius(.large, density: density) == .cardLarge)
            #expect(DSCardAppearance.radius(.compact, density: density) == .cardCompact)
            #expect(DSCardAppearance.radius(.regular, density: density) == (density == .compact ? .cardCompact : .card))
            // The Surface radius cases draw the values `comp.card.radius.*` alias.
            #expect(DSSurfaceRadius.cardCompact.value(tokens.radius) == card.radiusCompact)
            #expect(DSSurfaceRadius.card.value(tokens.radius) == card.radiusRegular)
            #expect(DSSurfaceRadius.cardLarge.value(tokens.radius) == card.radiusLarge)
        }
    }

    /// `tokens.root.shadow` and `tokens.root.selected.shadow`: solid is `comp.card.shadow.solid`, glass
    /// `comp.card.shadow.floating`, and any selected card lifts to `comp.card.shadow.floating`.
    @Test func shadowCells() {
        for scheme in DSColorScheme.allCases {
            let tokens = Self.tokens(scheme: scheme)
            let card = tokens.components.card
            #expect(DSCardAppearance.elevation(.solid, isSelected: false)?.shadow(tokens.elevation) == card.shadowSolid)
            #expect(DSCardAppearance.elevation(.glass, isSelected: false)?.shadow(tokens.elevation) == card.shadowFloating)
            #expect(DSCardAppearance.elevation(.vivid, isSelected: false) == nil)
            #expect(DSCardAppearance.elevation(.tinted, isSelected: false) == nil)
            for variant in DSCardVariant.allCases {
                #expect(DSCardAppearance.elevation(variant, isSelected: true)?.shadow(tokens.elevation) == card.shadowFloating, "\(variant)")
            }
        }
    }

    /// `tokens.root.hover.overlay` on solid and tinted only; `tokens.root.pressed.overlay` on every card.
    @Test func overlayCells() {
        #expect(DSCardAppearance.hoverOverlay(.solid) == \.color.bgFillNeutralSubtle)
        #expect(DSCardAppearance.hoverOverlay(.tinted) == \.color.bgFillNeutralSubtle)
        #expect(DSCardAppearance.hoverOverlay(.vivid) == nil)
        #expect(DSCardAppearance.hoverOverlay(.glass) == nil)
        #expect(DSCardAppearance.pressedOverlay == \.color.bgFillNeutralSubtle)
    }

    /// `tokens.root.selected.border`, keyed by the published material; a material with no cell draws no outline.
    @Test func selectionOutlineCells() {
        for material in DSSurfaceMaterial.allCases {
            let expected: DSColorPath? = switch material {
            case .glass: \.color.borderOnGlassFill
            case .vivid: \.color.borderOnMedia
            case .solid: \.color.borderStrong
            default: nil
            }
            #expect(DSCardAppearance.selectedBorder(on: material) == expected, "\(material)")
        }
        let border = Self.tokens().border
        #expect(DSCardAppearance.selectedBorderWidth(border) == border.strong)
        // Behavior 7: the outline is the cell of the material the card publishes, so a tinted card takes the solid
        // one. With `page` it resolved to no cell and a selected tinted card drew no outline at all.
        #expect(DSCardAppearance.selectedBorder(on: DSCardVariant.tinted.material) == \.color.borderStrong)
        #expect(DSCardAppearance.selectedBorder(on: .page) == nil)
    }

    // MARK: - title, caption

    /// `tokens.title.color` and `tokens.caption.color`, including the glass caption per backdrop kind; the glass
    /// fallback publishes raised, which has no cell and takes Text's tones, and a selected fallback publishes inverse.
    @Test func titleAndCaptionCells() {
        let title: [DSSurfaceMaterial: DSColorPath] = [
            .solid: \.components.card.solidText, .vivid: \.components.card.vividText, .glass: \.components.card.glassText,
            .glassLight: \.color.textOnGlassLight, .inverse: \.color.textOnInverse,
        ]
        let caption: [DSSurfaceMaterial: DSColorPath] = [
            .solid: \.components.card.solidCaption, .vivid: \.components.card.vividCaption,
            .glassLight: \.color.textOnGlassLight, .inverse: \.color.textOnInverse,
        ]
        for material in DSSurfaceMaterial.allCases where material != .glass {
            for backdrop in DSBackdropKind.allCases {
                let surface = DSSurfaceContext(material: material, backdrop: backdrop)
                #expect(DSCardAppearance.title(on: surface) == title[material], "\(material) \(backdrop)")
                #expect(DSCardAppearance.caption(on: surface) == caption[material], "\(material) \(backdrop)")
            }
        }
        let glass: [DSBackdropKind: DSColorPath] = [
            .map: \.color.textOnGlassFillSecondary, .image: \.color.textOnGlassFillMediaSecondary,
            .vivid: \.color.textOnGlassFillMediaSecondary,
        ]
        for backdrop in DSBackdropKind.allCases {
            let surface = DSSurfaceContext(material: .glass, backdrop: backdrop)
            #expect(DSCardAppearance.title(on: surface) == \.components.card.glassText)
            #expect(DSCardAppearance.caption(on: surface) == glass[backdrop], "\(backdrop)")
        }
        #expect(DSCardAppearance.titleLines == 2)
        #expect(DSCardAppearance.captionLines == 1)
    }

    // MARK: - V3 and the header block

    /// On vivid the unit joins the caption and the icon ring is not drawn; everywhere else the unit hangs off the hero
    /// and the ring is drawn.
    @Test func vividHeroBlock() {
        for material in DSSurfaceMaterial.allCases {
            #expect(DSCardAppearance.unitJoinsCaption(on: material) == (material == .vivid), "\(material)")
            #expect(DSCardAppearance.drawsIconRing(on: material) == (material != .vivid), "\(material)")
        }
        #expect(DSCardAppearance.heroLargestTypeSize == .accessibility3)
    }

    /// Behavior 9's separator: the one string both stacks join the vivid caption and unit with, read out of
    /// `Card.yaml` so neither side can pick its own. The web writes the same one (`cardUnitSeparator`,
    /// `web/packages/react/src/card/parts.ts`), as text inside the caption rather than as a margin, so the words
    /// stay apart in the caption's own string and in the single name a pressable card builds from it.
    @Test func theUnitJoinsTheCaptionWithOneSeparator() throws {
        let yaml = try DSComponentsContractTests.spec("Card")
        #expect(yaml.contains("a space, a middle dot and a space"), "Card.yaml behavior 9 states the separator")
        #expect(yaml.contains("`Dollars per batch · kg`"), "Card.yaml behavior 9 shows the joined line")
        #expect(DSCardAppearance.unitSeparator == " · ")
        // The spec's own example line, composed out of the separator: caption, separator, unit.
        #expect("Dollars per batch" + DSCardAppearance.unitSeparator + "kg" == "Dollars per batch · kg")
    }

    /// `tokens.root.gap` (behavior 17): the minimum between the header, the body slot and the footer, `space.4` on
    /// both stacks. The cell is read out of `Card.yaml` here and pinned against `.ds-card`'s `row-gap` on the web
    /// (`web/packages/react/test/card.test.tsx`), so a content-sized card lays out the same way on both.
    @Test func theAnatomyRowsAreOneGapApart() throws {
        let yaml = try DSComponentsContractTests.spec("Card")
        #expect(yaml.contains("    padding: comp.card.padding\n    gap: space.4\n"), "Card.yaml binds root.gap")
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            #expect(DSCardAppearance.rowGap(tokens) == tokens.space.step4, "\(density)")
        }
    }

    /// Behavior 14, the geometry both stacks draw the same way: the affordance takes one `action.size` box whichever
    /// it is, the header leaves that box and `header.gap` after it wherever one is drawn, and on vivid it leaves the
    /// V2 header block whatever the action — a card W wide leaves the header `W − 2p − (size.control.md + space.5)`,
    /// the width `DSSurfaceAppearance.headerBlock` keeps the grain and the bloom out of. Off vivid a card that draws
    /// no affordance leaves nothing.
    ///
    /// The two cells are read out of `Card.yaml` here, so this side cannot drift from the spec on its own; the web
    /// pins the same two cells against `Card.css` (`web/packages/react/test/card.test.tsx`, "the action box and the
    /// header gap"), which is what keeps the pair together.
    @Test func headerEndsAtTheV2Block() throws {
        let yaml = try DSComponentsContractTests.spec("Card")
        #expect(yaml.contains("  header:\n    gap: space.5\n"), "Card.yaml binds header.gap")
        #expect(yaml.contains("  action:\n    size: size.control.md\n"), "Card.yaml binds action.size")
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            let box = tokens.size.controlMd // tokens.action.size
            let gap = tokens.space.step5 // tokens.header.gap
            #expect(DSCardAppearance.headerGap(tokens) == gap, "\(density)")
            #expect(DSCardAppearance.actionWidth(.none, tokens) == 0, "\(density)")
            #expect(DSCardAppearance.actionWidth(.open, tokens) == box, "\(density)")
            #expect(DSCardAppearance.actionWidth(.custom, tokens) == box, "\(density)")
            let size = CGSize(width: 240, height: 240)
            let block = DSSurfaceAppearance.headerBlock(size: size, tokens)
            for action in [DSCardActionKind.none, .open, .custom] {
                let width = DSCardAppearance.actionWidth(action, tokens)
                let vivid = DSCardAppearance.headerTrailingSpace(on: .vivid, actionWidth: width, tokens)
                #expect(vivid == box + gap, "\(density) \(action)")
                #expect(size.width - 2 * tokens.space.cardPadding - vivid == block.width, "\(density) \(action)")
                #expect(vivid >= width, "\(density) \(action)")
                let solid = DSCardAppearance.headerTrailingSpace(on: .solid, actionWidth: width, tokens)
                #expect(solid == (action == .none ? 0 : box + gap), "\(density) \(action)")
            }
        }
    }

    /// Behavior 15: the title takes two lines at most and the caption one, both with an ellipsis, so a long string
    /// truncates instead of growing the header past the block. The web Card clamps to the same two numbers
    /// (`web/packages/react/src/card/parts.ts`, `cardTitleLines` and `cardCaptionLines`).
    @Test func titleAndCaptionLineBudget() throws {
        let yaml = try DSComponentsContractTests.spec("Card")
        #expect(yaml.contains("The title takes two lines at most and the caption one, both truncating with an ellipsis"))
        #expect(DSCardAppearance.titleLines == 2)
        #expect(DSCardAppearance.captionLines == 1)
    }

    // MARK: - action

    /// `tokens.action.color` and `tokens.action.border`; a material without a colour cell takes Icon's secondary tone.
    @Test func actionCells() {
        #expect(DSCardAppearance.action(on: DSSurfaceContext(material: .solid)) == \.color.iconSecondary)
        #expect(DSCardAppearance.action(on: DSSurfaceContext(material: .vivid)) == \.color.textOnVivid)
        for backdrop in DSBackdropKind.allCases {
            #expect(DSCardAppearance.action(on: DSSurfaceContext(material: .glass, backdrop: backdrop)) == \.color.textOnGlassFill)
        }
        #expect(DSCardAppearance.action(on: DSSurfaceContext(material: .raised, backdrop: .image)) == \.color.iconSecondary)
        #expect(DSCardAppearance.action(on: DSSurfaceContext(material: .page)) == \.color.iconSecondary)
        #expect(DSCardAppearance.action(on: DSSurfaceContext(material: .inverse, backdrop: .image)) == \.color.textOnInverse)
        #expect(DSCardAppearance.action(on: DSSurfaceContext(material: .accent)) == \.color.textOnAccentSecondary)
        for material in DSSurfaceMaterial.allCases {
            let border: DSColorPath? = switch material {
            case .vivid: \.color.borderOnMedia
            case .glass: \.color.borderOnGlassFill
            default: nil
            }
            #expect(DSCardAppearance.actionBorder(on: material) == border, "\(material)")
        }
        #expect(DSCardAppearance.actionBorderWidth(Self.tokens().border) == Self.tokens().border.hairline)
    }

    /// `tokens.action.fill` and `tokens.action.glyphColor`, cell for cell: only `vivid` takes the media pair, and
    /// every other published material — the scheme's glass included — takes the scheme's own inverse pair
    /// (Card.yaml behavior 6, ADR-0029 §1 and §1.6, ADR-0030 §3.1-3.2).
    @Test func actionDiscCells() {
        let media: (fill: DSColorPath, glyph: DSColorPath) = (\.color.bgFillInverseMedia, \.color.textOnInverseMedia)
        let scheme: (fill: DSColorPath, glyph: DSColorPath) = (\.color.bgFillInverse, \.color.textOnInverse)
        #expect(DSCardAppearance.actionSolid(on: .vivid) == media)
        #expect(DSCardAppearance.actionSolid(on: .glass) == scheme)
        for material in DSSurfaceMaterial.allCases where material != .vivid {
            let cells = DSCardAppearance.actionSolid(on: material)
            #expect(cells == scheme, "\(material)")
        }
        // The disc binds Card's own cells, never IconButton's (ADR-0024 §5.2). `comp.icon-button.primary.bg.rest`
        // aliases the same sys token today, so only the key path says which one was bound: these are the sys cells.
        #expect(DSCardAppearance.actionSolid(on: .solid).fill != \DSTokenSet.components.iconButton.primaryBgRest)
        #expect(DSCardAppearance.actionSolid(on: .solid).glyph != \DSTokenSet.components.iconButton.primaryIcon)
    }

    /// `open` with an action makes the whole card pressable; `custom` makes only its circle pressable; `none` is a
    /// group.
    @Test func whatIsPressable() {
        #expect(DSCardAppearance.isPressable(.open, hasAction: true))
        #expect(!DSCardAppearance.isPressable(.open, hasAction: false))
        #expect(!DSCardAppearance.isPressable(.custom, hasAction: true))
        #expect(!DSCardAppearance.isPressable(.none, hasAction: true))
        #expect(DSCardAction.open.kind == .open)
        #expect(DSCardAction.none.kind == .none)
        #expect(DSCardAction.custom(glyph: .actionPause, label: "Pause").kind == .custom)
    }

    /// Behavior 4: an `open` card with no handler draws the affordance `none` draws, and is laid out as `none` lays
    /// out. A `custom` disc keeps its place either way (behavior 5).
    @Test func aHandlerlessOpenCardRendersAsNone() {
        #expect(DSCardAppearance.renderedAction(.open, hasAction: false) == .none)
        #expect(DSCardAppearance.renderedAction(.open, hasAction: true) == .open)
        for kind in [DSCardActionKind.none, .custom] {
            for hasAction in [true, false] {
                #expect(DSCardAppearance.renderedAction(kind, hasAction: hasAction) == kind, "\(kind) \(hasAction)")
            }
        }
        let tokens = Self.tokens()
        #expect(DSCardAppearance.actionWidth(DSCardAppearance.renderedAction(.open, hasAction: false), tokens) == 0)
        #expect(
            DSCardAppearance.headerTrailingSpace(
                on: .solid, actionWidth: DSCardAppearance.actionWidth(DSCardAppearance.renderedAction(.open, hasAction: false), tokens), tokens
            ) == DSCardAppearance.headerTrailingSpace(on: .solid, actionWidth: DSCardAppearance.actionWidth(.none, tokens), tokens)
        )
    }

    /// The open glyph is the pressability cue: with no handler it is drawn in neither modality (behavior 4). On a
    /// pressable card, touch shows it always and pointer reveals it on hover and on keyboard focus.
    @Test func openGlyphPerModalityAndHandler() {
        let touch = Self.tokens(modality: .touch).interaction
        let pointer = Self.tokens(modality: .pointer).interaction
        #expect(DSCardAppearance.showsOpenGlyph(interaction: touch, isHovered: false, isFocused: false, isPressable: true))
        #expect(!DSCardAppearance.showsOpenGlyph(interaction: pointer, isHovered: false, isFocused: false, isPressable: true))
        #expect(DSCardAppearance.showsOpenGlyph(interaction: pointer, isHovered: true, isFocused: false, isPressable: true))
        #expect(DSCardAppearance.showsOpenGlyph(interaction: pointer, isHovered: false, isFocused: true, isPressable: true))
        for interaction in [touch, pointer] {
            for hovered in [true, false] {
                for focused in [true, false] {
                    #expect(
                        !DSCardAppearance.showsOpenGlyph(interaction: interaction, isHovered: hovered, isFocused: focused, isPressable: false),
                        "hover \(hovered), focus \(focused)"
                    )
                }
            }
        }
    }

    /// `accessibility.role` and `accessibility.label`: a pressable card is one element named by what it draws — the
    /// title, the caption line and the hero, in that reading order, joined by `DSCardName.separator` — and a card
    /// that is not pressable is a group named by its title alone, so its caption and hero are read once, as the
    /// elements they are.
    ///
    /// The strings below are the ones the React suite expects for the same cards
    /// (`web/packages/react/test/card.test.tsx`, "the accessible name"), so the two stacks announce a card with one
    /// voice: the vivid unit on the caption line where behavior 9 draws it and nowhere else, the trailing group
    /// against the value with no gap, the unit's own characters, and a part the card does not draw left out with its
    /// separator. Each case prints its name, so a run shows what this side composes.
    @Test(arguments: DSCardNameCase.all) @MainActor func accessibleName(_ example: DSCardNameCase) {
        let parts = example.parts(action: .open, hasAction: true)
        #expect(parts.isPressable)
        #expect(parts.accessibilityName.spoken(title: example.title, caption: example.caption) == example.name)
        print("DSCardName \(example.id) | \(parts.accessibilityName.spoken(title: example.title, caption: example.caption))")
    }

    /// The parts of the name, before they are joined: the caption line carries the vivid unit (behavior 9) and the
    /// hero then does not, which is the reading the two stacks had split over.
    @Test @MainActor func theNamesPartsAreTheOnesTheCardDraws() {
        let vivid = DSCardNameCase.vividUnit.parts(action: .open, hasAction: true)
        #expect(vivid.captionLine == DSCardCaptionLine(caption: "Per batch", unit: "kg"))
        #expect(vivid.captionLine?.spoken("Per batch") == "Per batch · kg")
        #expect(vivid.spokenHero == "2,450")
        // Off vivid the same hero hangs its own unit, so the hero speaks it and the caption line does not.
        let solid = DSCardNameCase(id: "solid-unit", variant: .solid, title: "Average yield", caption: "Per batch", hero: DSCardHero("2,450", unit: "kg"), name: "")
            .parts(action: .open, hasAction: true)
        #expect(solid.captionLine == DSCardCaptionLine(caption: "Per batch", unit: nil))
        #expect(solid.spokenHero == "2,450 kg")
        // A vivid card with no caption of its own contributes the unit alone, with no leading separator.
        let bare = DSCardNameCase(id: "vivid-unit-only", variant: .vivid, title: "Average yield", caption: nil, hero: DSCardHero("2,450", unit: "kg"), name: "")
            .parts(action: .open, hasAction: true)
        #expect(bare.captionLine?.spoken(nil) == "kg")
        #expect(bare.accessibilityName.spoken(title: "Average yield") == "Average yield, kg, 2,450")
        // An empty unit is no unit: it hangs nothing, joins nothing and names nothing (`unit !== ""` on the web).
        let empty = DSCardNameCase(id: "empty-unit", variant: .vivid, title: "Queued", caption: nil, hero: DSCardHero("37", unit: ""), name: "")
            .parts(action: .open, hasAction: true)
        #expect(empty.heroUnit == nil)
        #expect(empty.captionLine == nil)
        #expect(empty.accessibilityName.spoken(title: "Queued") == "Queued, 37")
    }

    /// The separator, and the sentence in `Card.yaml` that fixes it for both stacks.
    @Test @MainActor func theNameIsComposedTheWayTheSpecSaysItIs() throws {
        #expect(DSCardName.separator == ", ")
        let yaml = try DSComponentsContractTests.spec("Card")
        #expect(yaml.contains("joined by a comma and a space"), "Card.yaml accessibility.label states the separator")
        // The names the sentence writes out itself, so the rule and this table cannot drift apart. The rest are
        // titles alone, which the sentence states as a rule rather than by example.
        for id in DSCardNameCase.writtenOutInTheSpec {
            let example = try #require(DSCardNameCase.all.first { $0.id == id })
            #expect(yaml.contains(example.name), "Card.yaml accessibility.label writes out \(id)")
        }
    }

    /// A card that is not pressable is a group named by its title alone, whatever left it one.
    @Test @MainActor func aGroupIsNamedByItsTitleAlone() {
        let example = DSCardNameCase.all[0]
        for group in [
            example.parts(action: .open, hasAction: false),
            example.parts(action: .none, hasAction: true),
            example.parts(action: .custom(glyph: .actionPause, label: "Pause line 4"), hasAction: true),
        ] {
            #expect(!group.isPressable, "\(group.action)")
            #expect(group.accessibilityName == DSCardName(title: "Line output", caption: nil, hero: nil), "\(group.action)")
            #expect(group.accessibilityName.spoken(title: example.title, caption: example.caption) == example.title, "\(group.action)")
        }
    }

    /// The icon ring and the action use their bound sizes.
    @Test func partSizes() {
        let size = Self.tokens().size
        #expect(size.iconRing == 44)
        #expect(size.iconMd == 20)
        #expect(size.iconSm == 16)
    }

    // MARK: - Motion

    /// `motion.press` is snappy and `motion.select` smooth; under Reduce Motion both crossfade over
    /// `motion.duration.base` with `motion.easing.out`, and the press does not scale.
    @Test @MainActor func motion() {
        let standard = DSMotion(Self.tokens().motion)
        let reduced = DSMotion(Self.tokens(motion: .reduced).motion)
        let crossfade = reduced.tokens.easingOut.animation(duration: reduced.tokens.durationBase)
        #expect(DSCardAppearance.pressAnimation(standard) == standard.tokens.springSnappy.animation)
        #expect(DSCardAppearance.selectAnimation(standard) == standard.tokens.springSmooth.animation)
        #expect(DSCardAppearance.pressAnimation(reduced) == crossfade)
        #expect(DSCardAppearance.selectAnimation(reduced) == crossfade)
        #expect(DSControlAppearance.scale(isPressed: true, motion: reduced) == 1)
    }

    /// Behavior 16: the whole card presses at the magnitude every Prism control shares, so the card, the `custom`
    /// disc inside it and Button's pill shrink by the same amount. The web pins the same number in
    /// `--ds--card-press-scale` (`web/packages/react/test/card.test.tsx`), which is what keeps the pair together —
    /// before specVersion 5 the web shrank a card to 0.98 and this side to 0.97, and no test could see it.
    @Test @MainActor func thePressMagnitudeIsTheOneEveryControlShares() throws {
        let yaml = try DSComponentsContractTests.spec("Card")
        #expect(yaml.contains("A press scales the whole card to 0.97"), "Card.yaml behavior 16 states the magnitude")
        let standard = DSMotion(Self.tokens().motion)
        #expect(DSCardAppearance.pressedScale == 0.97)
        #expect(DSCardAppearance.pressedScale == DSControlAppearance.pressedScale)
        #expect(abs(DSControlAppearance.scale(isPressed: true, motion: standard) - DSCardAppearance.pressedScale) < 0.000_1)
    }

    // MARK: - watchOS

    /// `notes.platform.watchos`: solid only and compact.
    @Test func watchAdaptations() {
        for variant in DSCardVariant.allCases {
            #expect(variant.rendered(isWatch: false) == variant)
            #expect(variant.rendered(isWatch: true) == .solid)
        }
        for size in DSCardSize.allCases {
            #expect(size.rendered(isWatch: false) == size)
            #expect(size.rendered(isWatch: true) == .compact)
        }
    }
}

/// A card whose accessible name is known: the props, and the one string both stacks name it with
/// (Card.yaml `accessibility.label`).
///
/// Every `examples[]` entry of the spec is here — each one is pressable, because spec/SCHEMA.md gives every example
/// its handlers — plus `vivid-unit`, the vivid card with a hero unit that the P3-4 review round found the two stacks
/// announcing differently. The React suite carries the same table for the same ids.
///
/// The title and the caption are written as `String`s and passed to `DSCardName.spoken(title:caption:)` as well as
/// into the props: a `LocalizedStringKey` built from one of these strings, with no strings table to look it up in,
/// resolves to that same string, so supplying it is the localization step and nothing more. The order, the
/// separators, the unit's place and the parts that drop out are all the component's.
nonisolated struct DSCardNameCase: Sendable, CustomStringConvertible {
    let id: String
    let variant: DSCardVariant
    let title: String
    let caption: String?
    let hero: DSCardHero?
    /// What `accessibility.label` composes for this card when it is pressable.
    let name: String

    var description: String { "\(id) → \(name)" }

    @MainActor func parts(action: DSCardAction, hasAction: Bool) -> DSCardParts {
        DSCardParts(
            title: LocalizedStringKey(stringLiteral: title),
            caption: caption.map { LocalizedStringKey(stringLiteral: $0) },
            variant: variant, vivid: .default, icon: nil, action: action, hasAction: hasAction, hero: hero,
            size: .regular, backdrop: variant == .glass ? .image : .none, isSelected: false,
            hasContent: false, hasAside: false
        )
    }

    static let all: [DSCardNameCase] = [
        DSCardNameCase(
            id: "solid-metric", variant: .solid, title: "Line output", caption: "Last 24 hours",
            hero: DSCardHero("86", trailing: ".4", unit: "%"), name: "Line output, Last 24 hours, 86.4 %"
        ),
        DSCardNameCase(
            id: "vivid-default-kpi", variant: .vivid, title: "Average yield", caption: "Dollars per batch",
            hero: DSCardHero("$2,450"), name: "Average yield, Dollars per batch, $2,450"
        ),
        DSCardNameCase(id: "vivid-pair", variant: .vivid, title: "Average yield", caption: nil, hero: nil, name: "Average yield"),
        DSCardNameCase(
            id: "glass-vehicle", variant: .glass, title: "Unit 4417", caption: "21.11.2026, 14:05:22", hero: nil,
            name: "Unit 4417, 21.11.2026, 14:05:22"
        ),
        DSCardNameCase(id: "glass-selected", variant: .glass, title: "Unit 4417", caption: nil, hero: nil, name: "Unit 4417"),
        DSCardNameCase(id: "tinted-focus", variant: .tinted, title: "Sensor", caption: "Active", hero: nil, name: "Sensor, Active"),
        DSCardNameCase(id: "compact", variant: .solid, title: "Queued", caption: nil, hero: DSCardHero("37"), name: "Queued, 37"),
        DSCardNameCase(
            id: "vivid-unit", variant: .vivid, title: "Average yield", caption: "Per batch",
            hero: DSCardHero("2,450", unit: "kg"), name: "Average yield, Per batch · kg, 2,450"
        ),
    ]

    /// The ids whose names `accessibility.label` writes out; the others are named by their title alone, which the
    /// sentence states as a rule.
    static let writtenOutInTheSpec = ["solid-metric", "vivid-default-kpi", "glass-vehicle", "compact", "vivid-unit"]

    /// The vivid card with a hero unit: the one the review round found the two stacks announcing differently.
    static let vividUnit = all[7]
}

/// What a Card publishes to its parts, read on the host out of an `ImageRenderer` pass that reads no pixels: a glass
/// card publishes the scheme's glass with its backdrop, raised under the fallback and inverse when selected under the
/// fallback, so its title and caption cells follow (ADR-0022 rules 6 and 10).
///
/// It is not the pixel suite of the same component: that one is `DSCardSimulatorPixelTests` in DSSnapshotTests, which
/// reads colours back and therefore needs the compiled colour catalog only `xcodebuild` produces
/// (swift/Tests/DSSnapshotTests/README.md, "Why the pixel suites live here"). This one reads an environment value, so
/// a blank raster cannot fool it and it runs under `swift test`.
@MainActor
@Suite("Card publishes its material, read on the host (ADR-0022 §1.6, §3.1)", .serialized)
struct DSCardPublishedContextHostTests {
    static func published(_ card: (ContextReader) -> DSCard<ContextReader, EmptyView>, reduceTransparency: Bool = false, increasedContrast: Bool = false) -> DSSurfaceContext? {
        let probe = ContextProbe()
        let view = DSTheme { card(ContextReader(probe: probe)) }
            .dsAccessibilityPolicy(increasedContrast: increasedContrast, reduceTransparency: reduceTransparency)
        _ = ImageRenderer(content: view).cgImage
        return probe.value
    }

    static func glassCard(selected: Bool) -> (ContextReader) -> DSCard<ContextReader, EmptyView> {
        { reader in DSCard("Unit 4417", variant: .glass, backdrop: .image, isSelected: selected) { reader } }
    }

    /// On watchOS the card is solid (`notes.platform.watchos`), so the glass rows apply elsewhere.
    @Test func glassPublishesTheSchemesGlass() throws {
        let context = try #require(Self.published(Self.glassCard(selected: false)))
        guard !DSPlatform.isWatch else {
            #expect(context.material == .solid)
            return
        }
        #expect(context == DSSurfaceContext(material: .glass, backdrop: .image))
        #expect(DSCardAppearance.title(on: context) == \.components.card.glassText)
        #expect(DSCardAppearance.caption(on: context) == \.color.textOnGlassFillMediaSecondary)
    }

    @Test(arguments: ["Reduce Transparency", "Increase Contrast"])
    func theFallbackPublishesRaisedAndSelectedInverse(_ trigger: String) throws {
        guard !DSPlatform.isWatch else { return }
        let reduceTransparency = trigger == "Reduce Transparency"
        let increasedContrast = trigger == "Increase Contrast"
        let plain = try #require(Self.published(Self.glassCard(selected: false), reduceTransparency: reduceTransparency, increasedContrast: increasedContrast))
        #expect(plain.material == .raised)
        #expect(DSCardAppearance.title(on: plain) == nil)
        #expect(DSCardAppearance.caption(on: plain) == nil)
        #expect(DSCardAppearance.selectedBorder(on: plain.material) == nil)
        let selected = try #require(Self.published(Self.glassCard(selected: true), reduceTransparency: reduceTransparency, increasedContrast: increasedContrast))
        #expect(selected.material == .inverse)
        #expect(DSCardAppearance.title(on: selected) == \.color.textOnInverse)
        #expect(DSCardAppearance.caption(on: selected) == \.color.textOnInverse)
    }

    /// Behavior 7: a tinted card publishes `solid`, so its parts take the solid cells and a selected one takes the
    /// solid outline. It never publishes `page`, the key a Chip turns its glass cells on.
    @Test func tintedPublishesSolidAndVividItsGradient() throws {
        let tinted = try #require(Self.published { reader in DSCard("Sensor", variant: .tinted) { reader } })
        #expect(tinted.material == .solid)
        #expect(DSCardAppearance.title(on: tinted) == \.components.card.solidText)
        #expect(DSCardAppearance.caption(on: tinted) == \.components.card.solidCaption)
        #expect(DSCardAppearance.selectedBorder(on: tinted.material) == \.color.borderStrong)
        let vivid = try #require(Self.published { reader in DSCard("Average yield", variant: .vivid) { reader } })
        #expect(vivid.material == (DSPlatform.isWatch ? .solid : .vivid))
    }

    /// Every example renders, pressable or not, in both modalities.
    @Test func examplesRenderInBothModalities() {
        for example in DSExamples.all where example.component == "Card" || example.component == "Button" {
            for modality in DSModality.allCases {
                let image = ImageRenderer(content: DSTheme { example.content() }.dsModality(modality)).cgImage
                #expect(image != nil, "\(example.id) \(modality)")
            }
        }
    }
}
