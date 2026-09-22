import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSIcons
import DSTokens
@testable import DSComponents

/// `spec/components/Button.yaml` specVersion 3: the binding matrix keyed by variant and published material, the sizes
/// per density, the press and its Reduce Motion substitute, the hit region, the Dynamic Type rule and the watch
/// adaptations.
@Suite("Button bindings (Button.yaml v3)")
struct DSButtonBindingTests {
    static func tokens(
        scheme: DSColorScheme = .light,
        density: DSDensity = .regular,
        modality: DSModality = .touch,
        motion: DSMotionMode = .standard
    ) -> DSTokenSet {
        DSTokenSet(DSTokenContext(brand: .default, colorScheme: scheme, density: density, modality: modality, motion: motion))
    }

    /// Every material a Surface can publish, and the ones without a cell of their own.
    static let materials = DSSurfaceMaterial.allCases
    static let plain: [DSSurfaceMaterial] = [.page, .solid, .raised, .nested, .inverse, .accent, .glassLight]

    // MARK: - tokens.root

    /// `tokens.root.background`: primary is the inverse solid and the white solid on vivid; ghost has no fill at rest on
    /// any material (ADR-0029 §3.3, rule 9).
    @Test func backgroundCells() {
        for material in Self.materials {
            let primary: DSColorPath = material == .vivid ? \.color.bgFillInverseMedia : \.components.button.primaryBgRest
            #expect(DSButtonAppearance.background(.primary, on: material) == primary, "\(material)")
            #expect(DSButtonAppearance.background(.secondary, on: material) == \.components.button.secondaryBgRest, "\(material)")
            #expect(DSButtonAppearance.background(.ghost, on: material) == nil, "\(material)")
            #expect(DSButtonAppearance.background(.danger, on: material) == \.components.button.dangerBgRest, "\(material)")
        }
    }

    /// `tokens.root.foreground`: ghost takes the material's foreground on vivid and on the scheme's glass.
    @Test func foregroundCells() {
        for material in Self.materials {
            let primary: DSColorPath = material == .vivid ? \.color.textOnInverseMedia : \.components.button.primaryText
            let ghost: DSColorPath = switch material {
            case .vivid: \.color.textOnVivid
            case .glass: \.color.textOnGlassFill
            default: \.components.button.ghostText
            }
            #expect(DSButtonAppearance.foreground(.primary, on: material) == primary, "\(material)")
            #expect(DSButtonAppearance.foreground(.secondary, on: material) == \.components.button.secondaryText, "\(material)")
            #expect(DSButtonAppearance.foreground(.ghost, on: material) == ghost, "\(material)")
            #expect(DSButtonAppearance.foreground(.danger, on: material) == \.components.button.dangerText, "\(material)")
        }
    }

    /// `tokens.root.border`: the ghost outline is `color.border.on-media` on vivid and `color.border.on-glass-fill` on
    /// the scheme's glass; primary has none.
    @Test func borderCells() {
        for material in Self.materials {
            let ghost: DSColorPath = switch material {
            case .vivid: \.color.borderOnMedia
            case .glass: \.color.borderOnGlassFill
            default: \.components.button.ghostBorder
            }
            #expect(DSButtonAppearance.border(.primary, on: material) == nil, "\(material)")
            #expect(DSButtonAppearance.border(.secondary, on: material) == \.components.button.secondaryBorder, "\(material)")
            #expect(DSButtonAppearance.border(.ghost, on: material) == ghost, "\(material)")
            #expect(DSButtonAppearance.border(.danger, on: material) == \.components.button.dangerBorder, "\(material)")
        }
        let border = Self.tokens().border
        #expect(DSButtonAppearance.borderWidth(border) == border.hairline)
    }

    /// `tokens.root.pressed.background`, and the danger pill's Reduce Motion substitute.
    @Test func pressedCells() {
        for material in Self.plain + [.glass] {
            #expect(DSButtonAppearance.pressedBackground(.primary, on: material) == \.components.button.primaryBgPressed, "\(material)")
        }
        // On vivid the pressed primary keeps the white solid its label is checked on.
        #expect(DSButtonAppearance.pressedBackground(.primary, on: .vivid) == \.color.bgFillInverseMedia)
        for material in Self.materials {
            #expect(DSButtonAppearance.pressedBackground(.secondary, on: material) == \.components.button.secondaryBgPressed)
            #expect(DSButtonAppearance.pressedBackground(.ghost, on: material) == \.components.button.ghostBgPressed)
            #expect(DSButtonAppearance.pressedBackground(.danger, on: material) == nil)
        }
        #expect(DSButtonAppearance.reducedMotionPressOverlay(.danger) == \.color.bgFillNeutralSubtle)
        for variant in [DSButtonVariant.primary, .secondary, .ghost] {
            #expect(DSButtonAppearance.reducedMotionPressOverlay(variant) == nil, "\(variant)")
        }
        #expect(DSButtonAppearance.hoverOverlay == \.color.bgFillNeutralSubtle)
    }

    /// A tinted danger pill paints `color.bg.page` under its tint over media (ADR-0030 §6.2), and nowhere else.
    @Test func dangerPaintsThePageOverMedia() {
        for material in Self.materials {
            let media = [DSSurfaceMaterial.vivid, .glass, .glassLight].contains(material)
            #expect((DSButtonAppearance.underlay(.danger, on: material) == \.color.bgPage) == media, "\(material)")
            for variant in [DSButtonVariant.primary, .secondary, .ghost] {
                #expect(DSButtonAppearance.underlay(variant, on: material) == nil, "\(variant) \(material)")
            }
        }
    }

    /// `tokens.spinner.color` for primary and secondary; ghost and danger take Spinner.yaml's arc for the material.
    @Test func spinnerCells() {
        for material in Self.materials where material != .vivid {
            #expect(DSButtonAppearance.spinner(.primary, on: material) == \.components.button.primaryText, "\(material)")
        }
        #expect(DSButtonAppearance.spinner(.primary, on: .vivid) == \.color.textOnInverseMedia)
        let arcs: [DSSurfaceMaterial: DSColorPath] = [
            .page: \.components.spinner.arc, .solid: \.components.spinner.arc, .raised: \.components.spinner.arc,
            .nested: \.components.spinner.arc, .vivid: \.color.textOnVivid, .inverse: \.color.textOnInverse,
            .accent: \.color.textOnAccent, .glass: \.color.textOnGlassFill, .glassLight: \.color.textOnGlassLight,
        ]
        for material in Self.materials {
            #expect(DSButtonAppearance.spinner(.secondary, on: material) == \.components.button.secondaryText)
            #expect(DSButtonAppearance.spinner(.ghost, on: material) == arcs[material], "\(material)")
            #expect(DSButtonAppearance.spinner(.danger, on: material) == arcs[material], "\(material)")
        }
    }

    /// The component tokens alias what Button.yaml's bindings say they are: heights follow density (`size.control.*`,
    /// ADR-0024 §7.1), padding and gap the space scale, the radius the pill, the press spring snappy.
    @Test func componentTokens() {
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            let button = tokens.components.button
            #expect(DSButtonAppearance.height(.sm, button) == tokens.size.controlSm, "\(density)")
            #expect(DSButtonAppearance.height(.md, button) == tokens.size.controlMd, "\(density)")
            #expect(DSButtonAppearance.height(.lg, button) == tokens.size.controlLg, "\(density)")
            #expect(DSButtonAppearance.paddingX(.sm, button) == tokens.space.step4)
            #expect(DSButtonAppearance.paddingX(.md, button) == tokens.space.step5)
            #expect(DSButtonAppearance.paddingX(.lg, button) == tokens.space.step6)
            #expect(button.gap == tokens.space.step3)
            #expect(button.radius == tokens.radius.control)
        }
        #expect(DSButtonAppearance.height(.md, Self.tokens(density: .compact).components.button) == 32)
        #expect(DSButtonAppearance.height(.lg, Self.tokens(density: .watch).components.button) == 44)
        for motion in DSMotionMode.allCases {
            let tokens = Self.tokens(motion: motion)
            #expect(tokens.components.button.motionPress == tokens.motion.springSnappy, "\(motion)")
        }
    }

    /// `tokens.label.typography` and `tokens.leadingIcon.size` (`size.icon.md`, the control glyph box).
    @Test func labelAndIconCells() {
        #expect(DSButtonSize.sm.labelRole == .labelSm)
        #expect(DSButtonSize.md.labelRole == .labelMd)
        #expect(DSButtonSize.lg.labelRole == .labelLg)
        let size = Self.tokens().size
        #expect(size.iconMd == DSIconSize.md.box)
        #expect(DSGlyphGeometry.drawnSide(box: size.iconMd) == DSIconSize.md.pointSize)
        #expect(DSGlyphGeometry.drawnSide(box: size.iconSm) == DSIconSize.sm.pointSize)
    }

    // MARK: - Behavior

    /// The hit region is the larger of the visual size and `size.hit` on each axis, and never shrinks the pill.
    @Test func hitRegionReachesSizeHit() {
        let touch = Self.tokens(modality: .touch).size.hit
        let pointer = Self.tokens(modality: .pointer).size.hit
        #expect(touch == 44 && pointer == 28)
        #expect(DSControlAppearance.hitOutset(visual: CGSize(width: 96, height: 32), hit: touch) == CGSize(width: 0, height: 6))
        #expect(DSControlAppearance.hitOutset(visual: CGSize(width: 96, height: 32), hit: pointer) == .zero)
        #expect(DSControlAppearance.hitOutset(visual: CGSize(width: 20, height: 16), hit: touch) == CGSize(width: 12, height: 14))
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density, modality: .touch)
            for size in DSButtonSize.allCases {
                let height = DSButtonAppearance.height(size, tokens.components.button)
                let outset = DSControlAppearance.hitOutset(visual: CGSize(width: height, height: height), hit: tokens.size.hit)
                #expect(height + 2 * outset.height == max(height, tokens.size.hit), "\(density) \(size)")
            }
        }
    }

    /// The press scales to 0.97 on the press spring; under Reduce Motion nothing scales and the substitute fill shows
    /// over `motion.duration.base` with `motion.easing.out`.
    @Test @MainActor func pressMotion() {
        let standard = DSMotion(Self.tokens().motion)
        let reduced = DSMotion(Self.tokens(motion: .reduced).motion)
        #expect(DSControlAppearance.pressedScale == 0.97)
        #expect(abs(DSControlAppearance.scale(isPressed: true, motion: standard) - 0.97) < 0.000_1)
        #expect(DSControlAppearance.scale(isPressed: false, motion: standard) == 1)
        #expect(DSControlAppearance.scale(isPressed: true, motion: reduced) == 1)
        #expect(DSControlAppearance.substituteOpacity(isPressed: true, motion: standard) == 0)
        #expect(DSControlAppearance.substituteOpacity(isPressed: true, motion: reduced) == 1)
        #expect(DSControlAppearance.substituteOpacity(isPressed: false, motion: reduced) == 0)
        let spring = Self.tokens().components.button.motionPress
        #expect(DSControlAppearance.pressAnimation(spring, motion: standard) == spring.animation)
        #expect(
            DSControlAppearance.pressAnimation(spring, motion: reduced)
                == reduced.tokens.easingOut.animation(duration: reduced.tokens.durationBase)
        )
        #expect(DSControlAppearance.hoverAnimation(standard) == standard.tokens.easingHover.animation(duration: standard.tokens.durationQuick))
    }

    /// Hover exists only under pointer modality, and only on a control that takes input.
    @Test func hoverIsPointerOnly() {
        let pointer = Self.tokens(modality: .pointer).interaction
        let touch = Self.tokens(modality: .touch).interaction
        #expect(DSControlAppearance.showsHover(isHovered: true, interaction: pointer, isInteractive: true))
        #expect(!DSControlAppearance.showsHover(isHovered: true, interaction: touch, isInteractive: true))
        #expect(!DSControlAppearance.showsHover(isHovered: true, interaction: pointer, isInteractive: false))
        #expect(!DSControlAppearance.showsHover(isHovered: false, interaction: pointer, isInteractive: true))
    }

    /// Labels never wrap up to accessibility3, where the height clamps; past it they wrap to two lines.
    @Test func labelsWrapOnlyPastTheClamp() {
        #expect(DSButtonAppearance.largestTypeSize == .accessibility3)
        for size in DynamicTypeSize.allCases {
            #expect(DSButtonAppearance.labelLines(at: size) == (size > .accessibility3 ? 2 : 1), "\(size)")
        }
    }

    /// `notes.platform.watchos`: sizes collapse to lg, ghost renders as secondary, no trailing icon.
    @Test func watchAdaptations() {
        for size in DSButtonSize.allCases {
            #expect(size.rendered(isWatch: false) == size)
            #expect(size.rendered(isWatch: true) == .lg)
        }
        for variant in DSButtonVariant.allCases {
            #expect(variant.rendered(isWatch: false) == variant)
            #expect(variant.rendered(isWatch: true) == (variant == .ghost ? .secondary : variant))
        }
        #expect(DSButtonAppearance.trailingIcon(DSIconName.navOpen, isWatch: false) == .navOpen)
        #expect(DSButtonAppearance.trailingIcon(DSIconName.navOpen, isWatch: true) == nil)
    }

    /// The spinner's geometry: the 270° open sweep and one turn.
    @Test func spinnerGeometry() {
        #expect(DSSpinnerGeometry.sweep == 0.75)
        #expect(DSSpinnerGeometry.turn.degrees == 360)
    }
}

/// What a Button draws, read back from renders: the ghost pill has no fill at rest, the secondary pill does, and a
/// disabled pill is dimmed. Each comparison renders through the same pipeline, so no colour value is restated.
@MainActor
@Suite("Button renders (ADR-0029 §3.3)", .serialized)
struct DSButtonRenderTests {
    /// The pixel just inside the pill's leading padding, halfway down, and one outside the pill on the page.
    static func pixels(_ button: DSButton, scheme: ColorScheme) -> (inside: [UInt8], page: [UInt8])? {
        let tokens = DSButtonBindingTests.tokens(scheme: scheme == .dark ? .dark : .light, density: .regular)
        let inset = tokens.space.step8
        let view = DSTheme {
            button
                .padding(inset)
                .background(tokens.color.bgPage)
        }
        .dsDensity(.regular)
        .environment(\.colorScheme, scheme)
        let renderer = ImageRenderer(content: view)
        renderer.scale = 1
        renderer.isOpaque = true
        guard let image = renderer.cgImage else { return nil }
        let height = tokens.components.button.heightMd
        let inside = CGPoint(x: inset + tokens.components.button.paddingXMd / 2, y: inset + height / 2)
        let page = CGPoint(x: inset / 2, y: inset / 2)
        guard let a = pixel(image, at: inside), let b = pixel(image, at: page) else { return nil }
        return (a, b)
    }

    static func pixel(_ image: CGImage, at point: CGPoint) -> [UInt8]? {
        guard let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4, space: space,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(image, in: CGRect(x: -point.x, y: point.y - CGFloat(image.height) + 1, width: CGFloat(image.width), height: CGFloat(image.height)))
        guard let data = context.data else { return nil }
        let bytes = data.bindMemory(to: UInt8.self, capacity: 4)
        return [bytes[0], bytes[1], bytes[2]]
    }

    static func close(_ a: [UInt8], _ b: [UInt8], within tolerance: Int = 1) -> Bool {
        zip(a, b).allSatisfy { abs(Int($0) - Int($1)) <= tolerance }
    }

    @Test(arguments: [ColorScheme.light, .dark])
    func ghostHasNoRestFill(_ scheme: ColorScheme) throws {
        let ghost = try #require(Self.pixels(DSButton("Filter", variant: .ghost) {}, scheme: scheme))
        #expect(Self.close(ghost.inside, ghost.page), "\(scheme): \(ghost.inside) vs page \(ghost.page)")
        let secondary = try #require(Self.pixels(DSButton("Filter", variant: .secondary) {}, scheme: scheme))
        #expect(!Self.close(secondary.inside, secondary.page, within: 0), "\(scheme): \(secondary.inside) vs page \(secondary.page)")
    }

    @Test(arguments: [ColorScheme.light, .dark])
    func disabledIsDimmed(_ scheme: ColorScheme) throws {
        let enabled = try #require(Self.pixels(DSButton("Continue") {}, scheme: scheme))
        let disabled = try #require(Self.pixels(DSButton("Continue", isDisabled: true) {}, scheme: scheme))
        #expect(!Self.close(enabled.inside, disabled.inside, within: 8), "\(scheme): \(enabled.inside) vs \(disabled.inside)")
        #expect(Self.close(enabled.page, disabled.page))
    }
}
