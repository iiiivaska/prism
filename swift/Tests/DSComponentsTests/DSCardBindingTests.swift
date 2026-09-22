import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// `spec/components/Card.yaml` specVersion 2: the material, radius and shadow cells, the title, caption and action
/// cells keyed by the published context, the selection cue, V3 on vivid, the header and the V2 block, the action
/// affordances per modality, the motion and the watch adaptations.
@Suite("Card bindings (Card.yaml v2)")
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
    /// over the page.
    @Test func materialCells() {
        #expect(DSCardVariant.solid.material == .solid)
        #expect(DSCardVariant.vivid.material == .vivid)
        #expect(DSCardVariant.glass.material == .glass)
        #expect(DSCardVariant.tinted.material == .page)
        #expect(DSSurfaceAppearance.background(.solid) == .bgSurface)
        #expect(DSSurfaceAppearance.background(.glass) == .materialGlassFill)
        #expect(DSCardAppearance.tint(.tinted) == \.color.bgTintAccent)
        for variant in [DSCardVariant.solid, .vivid, .glass] {
            #expect(DSCardAppearance.tint(variant) == nil, "\(variant)")
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
        #expect(DSCardAppearance.unitSeparator == " · ")
        #expect(DSCardAppearance.heroLargestTypeSize == .accessibility3)
    }

    /// On vivid the header ends where the V2 header block does, at every density and whatever the action: a card W wide
    /// leaves the header `W − 2p − (size.control.md + space.5)`, the width `DSSurfaceAppearance.headerBlock` keeps the
    /// grain out of. Off vivid the header stops `space.3` before the action.
    @Test func headerEndsAtTheV2Block() {
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            let size = CGSize(width: 240, height: 240)
            let block = DSSurfaceAppearance.headerBlock(size: size, tokens)
            for action in [DSCardActionKind.none, .open, .custom] {
                let width = DSCardAppearance.actionWidth(action, tokens)
                let trailing = DSCardAppearance.headerTrailingSpace(on: .vivid, actionWidth: width, tokens)
                #expect(size.width - 2 * tokens.space.cardPadding - trailing == block.width, "\(density) \(action)")
                #expect(trailing >= width, "\(density) \(action)")
            }
            #expect(DSCardAppearance.headerTrailingSpace(on: .solid, actionWidth: 0, tokens) == 0)
            let open = DSCardAppearance.actionWidth(.open, tokens)
            #expect(open == tokens.size.iconSm)
            #expect(DSCardAppearance.headerTrailingSpace(on: .solid, actionWidth: open, tokens) == open + tokens.space.step3)
            #expect(DSCardAppearance.actionWidth(.custom, tokens) == tokens.size.controlMd)
        }
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
            let solid = DSCardAppearance.actionSolid(on: material)
            #expect(solid.fill == (material == .vivid ? \DSTokenSet.color.bgFillInverseMedia : \DSTokenSet.color.bgFillInverse), "\(material)")
            #expect(solid.glyph == (material == .vivid ? \DSTokenSet.color.textOnInverseMedia : \DSTokenSet.color.textOnInverse), "\(material)")
        }
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

    /// The open glyph under touch is always visible; under pointer it shows on hover and on keyboard focus.
    @Test func openGlyphPerModality() {
        let touch = Self.tokens(modality: .touch).interaction
        let pointer = Self.tokens(modality: .pointer).interaction
        #expect(DSCardAppearance.showsOpenGlyph(interaction: touch, isHovered: false, isFocused: false))
        #expect(!DSCardAppearance.showsOpenGlyph(interaction: pointer, isHovered: false, isFocused: false))
        #expect(DSCardAppearance.showsOpenGlyph(interaction: pointer, isHovered: true, isFocused: false))
        #expect(DSCardAppearance.showsOpenGlyph(interaction: pointer, isHovered: false, isFocused: true))
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

/// What a Card publishes to its parts, read from a render: a glass card publishes the scheme's glass with its backdrop,
/// raised under the fallback and inverse when selected under the fallback, so its title and caption cells follow
/// (ADR-0022 rules 6 and 10).
@MainActor
@Suite("Card renders (ADR-0022 §1.6, §3.1)", .serialized)
struct DSCardRenderTests {
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

    @Test func tintedPublishesThePageAndVividItsGradient() throws {
        let tinted = try #require(Self.published { reader in DSCard("Sensor", variant: .tinted) { reader } })
        #expect(tinted.material == (DSPlatform.isWatch ? .solid : .page))
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
