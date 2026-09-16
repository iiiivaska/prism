import CoreGraphics
import CoreText
import Foundation
import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0021 rule 7, the rendering half: DSCore renders through §9's route and applies Bold Text exactly once.
///
/// The four checks the rule names are here (the fifth, font registration, is `DSFontRegistrationTests`):
///  * the weight chosen under `boldText` for every role;
///  * identical pixels for DS text under `legibilityWeight` `.bold` and `.regular` when the policy is off;
///  * line pitch = factor × size (±0.5 pt), measured with `Text.Layout`;
///  * the first baseline and the `.firstTextBaseline` guide at §8's CSS position (±0.5 pt).
///
/// The last one is also the settlement of the §8 verify item (G-17): `.offset(y: −Δ)` plus the two alignment-guide
/// overrides move the glyphs and both baseline guides without changing the line box, on every platform this suite
/// runs on. See `theLineBoxDoesNotChange` and `bothBaselineGuidesMoveWithTheGlyphs`.
@MainActor
@Suite("Text rendering (ADR-0021 §8, §9, rule 7)", .serialized)
struct DSTypographyTests {
    /// Every measurement uses the hero: the largest role, the one §8's shift matters most on, and the only one
    /// that goes thin in dark.
    static let role: KeyPath<DSTokenSet.Typography, DSTypeRole> = \.metricXl

    /// The context these renders resolve in: the platform default with the environment's light scheme, which
    /// watchOS fixes to dark (ADR-0019 §2). Taking it from the resolver rather than from `DSTokenContext()`
    /// keeps the expected weights the ones DSCore actually renders on each platform.
    static var context: DSTokenContext {
        DSContextResolver.context(
            brand: .prism,
            colorScheme: .light,
            policy: DSAccessibilityPolicy(),
            density: DSTokenContext.platformDefault.density,
            modality: DSTokenContext.platformDefault.modality
        )
    }

    static func heroRole() -> DSTypeRole {
        DSTokenSet(context).typography[keyPath: role]
    }

    /// The size `@ScaledMetric(relativeTo:)` gives this role here. It is the role size only where the reader's
    /// Dynamic Type size scales by 1 — on watchOS the default already scales `largeTitle` — so every measurement
    /// below is taken against this, exactly as `DSScaledTextModifier` computes it.
    static func scaledSize(_ role: KeyPath<DSTokenSet.Typography, DSTypeRole>) -> CGFloat {
        let token = DSTokenSet(context).typography[keyPath: role]
        let box = ScaledSize()
        _ = RenderProbe.render(
            ScaledSizeProbe(size: token.size, style: token.textStyle.fontTextStyle, box: box),
            size: CGSize(width: 8, height: 8)
        )
        return box.value ?? token.size
    }

    // MARK: - The pure rules

    @Test func systemWeightsFollowTheLadder() {
        let ladder: [(Int, Font.Weight)] = [
            (100, .ultraLight), (200, .thin), (300, .light), (400, .regular),
            (500, .medium), (600, .semibold), (700, .bold), (800, .heavy), (900, .black),
        ]
        for (weight, expected) in ladder {
            #expect(DSTypography.systemWeight(weight) == expected, "weight \(weight)")
        }
    }

    /// ADR-0021 §8: Δ is 0.1675 × size at a line height of 1.0 and −0.0825 × size at 1.5, for Onest.
    @Test func theBaselineShiftMatchesTheADRsNumbers() {
        let onest = (ascent: 0.97, descent: 0.305)
        let tight = DSTypography.baselineShift(size: 48, lineHeight: 1.0, ascent: onest.ascent, descent: onest.descent)
        let loose = DSTypography.baselineShift(size: 48, lineHeight: 1.5, ascent: onest.ascent, descent: onest.descent)
        #expect(abs(tight - 48 * 0.1675) < 0.001, "got \(tight)")
        #expect(abs(loose - 48 * -0.0825) < 0.001, "got \(loose)")
    }

    /// The face's own metrics, not a constant: Onest's ascent and descent are ADR-0021 T1's 0.97 and 0.305.
    @Test func theResolvedFaceSuppliesAscentAndDescent() {
        DSFontRegistrar.register(.prism)
        DSFontMetrics.reset()
        let name = DSBrand.prism.faces[.display]?.postScriptName(for: 300)
        #expect(name != nil)
        let metrics = DSFontMetrics.metrics(postScriptName: name)
        #expect(abs(metrics.ascent - 0.97) < 0.01, "ascent \(metrics.ascent)")
        #expect(abs(metrics.descent - 0.305) < 0.01, "descent \(metrics.descent)")
        // The system face answers too, for the Native preset.
        let system = DSFontMetrics.metrics(postScriptName: nil)
        #expect(system.ascent > 0.5 && system.descent > 0)
    }

    @Test func trackingIsTheEmFractionOfTheScaledSize() {
        #expect(DSTypography.tracking(trackingEm: -0.01, size: 48) == -0.48)
        #expect(DSTypography.tracking(trackingEm: 0.03, size: 13) == 0.39)
        #expect(DSTypography.tracking(trackingEm: 0, size: 17) == 0)
    }

    /// The weight chosen under Bold Text, for every role of every scheme × contrast context (rule 7, first item).
    @Test func boldTextChoosesTheRolesBoldWeight() {
        for scheme in [DSColorScheme.light, .dark] {
            for contrast in [DSContrast.standard, .increased] {
                let typography = DSTokenSet(DSTokenContext(colorScheme: scheme, contrast: contrast)).typography
                for child in Mirror(reflecting: typography).children {
                    guard let role = child.value as? DSTypeRole else { continue }
                    let plain = DSAccessibilityPolicy(boldText: false)
                    let bold = DSAccessibilityPolicy(boldText: true)
                    #expect(plain.weight(for: role) == role.weight, "\(child.label ?? "?")")
                    #expect(bold.weight(for: role) == role.boldWeight, "\(child.label ?? "?")")
                    #expect(bold.weight(for: role) >= 400, "Bold Text never renders below 400")
                }
            }
        }
    }

    // MARK: - Bold Text is applied exactly once (rule 7, second item)

    /// Item 7 of §9: DS text carries `legibilityWeight == .regular`, so the OS cannot step a face a second time.
    /// With the policy's Bold Text off, the same string renders to the same pixels under either setting.
    @Test func boldTextRendersIdenticalPixelsWhenThePolicyIsOff() throws {
        func bitmap(_ legibility: LegibilityWeight) throws -> RenderProbe.Bitmap {
            let view = DSTheme(brand: .prism) {
                Text(verbatim: "12,9 Hxg")
                    .dsText(Self.role)
                    .foregroundStyle(Color(.sRGB, white: 0))
            }
            .dsAccessibilityPolicy(boldText: false)
            .environment(\.legibilityWeight, legibility)
            return try #require(RenderProbe.render(view, size: CGSize(width: 320, height: 90), scale: 2))
        }
        let regular = try bitmap(.regular)
        let bold = try bitmap(.bold)
        #expect(regular.rgba == bold.rgba, "Bold Text reached the rendered text a second time (ADR-0021 §9 item 7)")
        #expect(regular.inkRows() != nil, "the probe rendered no text at all")
    }

    /// The counter-check that proves the comparison bites: asking the policy for Bold Text does change the pixels.
    @Test func thePolicysBoldTextDoesChangeThePixels() throws {
        func bitmap(_ boldText: Bool) throws -> RenderProbe.Bitmap {
            let view = DSTheme(brand: .prism) {
                Text(verbatim: "12,9 Hxg")
                    .dsText(Self.role)
                    .foregroundStyle(Color(.sRGB, white: 0))
            }
            .dsAccessibilityPolicy(boldText: boldText)
            return try #require(RenderProbe.render(view, size: CGSize(width: 320, height: 90), scale: 2))
        }
        #expect(try bitmap(false).rgba != bitmap(true).rgba)
    }

    /// The Native preset renders system fonts, which is what the `#Preview` in `DSTypography.swift` shows: the
    /// brand bundles no file and names no PostScript instance, the route falls to `Font.system(size:weight:design:)`,
    /// and the result is text that differs from the Signature preset's (P3-1 acceptance, ADR-0020 §5).
    @Test func theNativePresetRendersSystemFonts() throws {
        for (_, face) in DSBrand.prismNative.faces {
            #expect(face.file == nil && face.postScriptNames.isEmpty, "a system face names no instance")
            #expect(face.system != nil)
            #expect(face.postScriptName(for: 400) == nil, "so the route takes Font.system")
        }
        func bitmap(_ brand: DSBrand) throws -> RenderProbe.Bitmap {
            let view = DSTheme(brand: brand) {
                Text(verbatim: "Prism 12,9")
                    .dsText(\.displayLg)
                    .foregroundStyle(Color(.sRGB, white: 0))
            }
            return try #require(RenderProbe.render(view, size: CGSize(width: 400, height: 120), scale: 2))
        }
        let native = try bitmap(.prismNative)
        let signature = try bitmap(.prism)
        #expect(native.inkRows() != nil, "the Native preset rendered nothing")
        #expect(signature.inkRows() != nil, "the Signature preset rendered nothing")
        #expect(native.rgba != signature.rgba, "the two presets rendered identical pixels, so neither face applied")
    }

    // MARK: - Line pitch (rule 7, third item)

    /// `.lineHeight(.multiple(factor:))` produces the CSS line pitch: factor × size, ±0.5 pt.
    @Test func linePitchIsTheFactorTimesTheSize() throws {
        for role in [Self.role, \DSTokenSet.Typography.bodyMd, \DSTokenSet.Typography.bodySm] {
            let token = DSTokenSet(Self.context).typography[keyPath: role]
            let size = Self.scaledSize(role)
            let box = LineMetrics()
            let view = DSTheme(brand: .prism) {
                Text(verbatim: "Hxg\nHxg\nHxg")
                    .dsText(role)
                    .foregroundStyle(Color(.sRGB, white: 0))
                    .textRenderer(LineMetricsRenderer(metrics: box))
            }
            _ = RenderProbe.render(view, size: CGSize(width: 400, height: 400))
            #expect(box.origins.count == 3, "expected three lines, got \(box.origins.count)")
            guard box.origins.count == 3 else { continue }
            let pitch = [box.origins[1].y - box.origins[0].y, box.origins[2].y - box.origins[1].y]
            let want = size * CGFloat(token.lineHeight)
            for measured in pitch {
                #expect(abs(measured - want) <= 0.5, "pitch \(measured) pt, expected \(want) pt")
            }
        }
    }

    // MARK: - The first baseline and the two guides (rule 7, fourth item; G-17)

    /// §8's CSS position of the first baseline, measured from the top of the line box:
    /// `size × ((lineHeight − (A + D)) / 2 + A)`.
    static func cssFirstBaseline(_ token: DSTypeRole, size: CGFloat, ascent: Double, descent: Double) -> CGFloat {
        size * CGFloat((token.lineHeight - (ascent + descent)) / 2 + ascent)
    }

    /// A marker whose own first baseline is its top edge, so where it lands is where the text's guide is.
    struct BaselineMarker: View {
        var alignment: VerticalAlignment = .firstTextBaseline

        var body: some View {
            Rectangle()
                .fill(Color(.sRGB, white: 0))
                .frame(width: 12, height: 3)
                .alignmentGuide(alignment) { _ in 0 }
        }
    }

    @Test func theFirstBaselineSitsAtTheCSSPosition() throws {
        DSFontRegistrar.register(.prism)
        let token = Self.heroRole()
        let size = Self.scaledSize(Self.role)
        let metrics = DSFontMetrics.metrics(postScriptName: DSBrand.prism.faces[token.slot]?.postScriptName(for: token.weight))
        let want = Self.cssFirstBaseline(token, size: size, ascent: metrics.ascent, descent: metrics.descent)

        let row = HStack(alignment: .firstTextBaseline, spacing: 24) {
            Text(verbatim: "H")
                .dsText(Self.role)
                .foregroundStyle(Color(.sRGB, white: 0))
            BaselineMarker()
        }
        let view = DSTheme(brand: .prism) { row }
        let bitmap = try #require(RenderProbe.render(view, size: CGSize(width: 260, height: 160), scale: 4))
        // Two runs of inked columns, the glyph and the marker, whatever their size on this platform.
        let runs = bitmap.inkColumnRuns()
        #expect(runs.count == 2, "expected the glyph and the marker, got \(runs.count) runs")
        let glyph = try #require(bitmap.inkRows(columns: runs.first))
        let marker = try #require(bitmap.inkRows(columns: runs.last))
        #expect(abs(marker.first - Double(want)) <= 0.5, "guide at \(marker.first) pt, CSS position \(want) pt")
        #expect(abs(glyph.last - Double(want)) <= 0.5, "H sits on \(glyph.last) pt, CSS position \(want) pt")
    }

    /// G-17: the shift moves the glyphs and does not change the line box.
    @Test func theLineBoxDoesNotChange() throws {
        let token = Self.heroRole()
        let size = Self.scaledSize(Self.role)
        let shifted = try #require(
            RenderProbe.render(
                DSTheme(brand: .prism) { Text(verbatim: "Hxg").dsText(Self.role).fixedSize() }
            )
        )
        let plain = try #require(
            RenderProbe.render(
                DSTheme(brand: .prism) {
                    Text(verbatim: "Hxg")
                        .font(.custom(DSBrand.prism.faces[token.slot]?.postScriptName(for: token.weight) ?? "", fixedSize: size))
                        .lineHeight(.multiple(factor: token.lineHeight))
                        .fixedSize()
                }
            )
        )
        #expect(shifted.height == plain.height, "the line box changed: \(shifted.height) vs \(plain.height)")
        let want = Double(size) * token.lineHeight
        #expect(abs(Double(shifted.height) - want) <= 1, "line box \(shifted.height), expected \(want)")
    }

    /// G-17: both baseline guides move with the glyphs, so a hung unit stays on its hero's visible baseline.
    @Test func bothBaselineGuidesMoveWithTheGlyphs() throws {
        DSFontRegistrar.register(.prism)
        for alignment in [VerticalAlignment.firstTextBaseline, .lastTextBaseline] {
            let row = HStack(alignment: alignment, spacing: 24) {
                Text(verbatim: alignment == .lastTextBaseline ? "H\nH" : "H")
                    .dsText(Self.role)
                    .foregroundStyle(Color(.sRGB, white: 0))
                BaselineMarker(alignment: alignment)
            }
            let bitmap = try #require(
                RenderProbe.render(DSTheme(brand: .prism) { row }, size: CGSize(width: 260, height: 260), scale: 4)
            )
            let runs = bitmap.inkColumnRuns()
            #expect(runs.count == 2, "expected the glyph and the marker, got \(runs.count) runs")
            let glyph = try #require(bitmap.inkRows(columns: runs.first))
            let marker = try #require(bitmap.inkRows(columns: runs.last))
            // The marker's top edge is the guide; the flat foot of "H" is the visible baseline.
            #expect(abs(marker.first - glyph.last) <= 0.5, "\(alignment) guide at \(marker.first), glyphs at \(glyph.last)")
        }
    }

    /// The hung unit of ADR-0021 §8: a `metric.unit` baseline-aligned beside a `metric.xl` sits on the hero's
    /// visible baseline, which is what moving both guides is for.
    @Test func aHungUnitSitsOnTheHerosBaseline() throws {
        DSFontRegistrar.register(.prism)
        let row = HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(verbatim: "1").dsText(\.metricXl).foregroundStyle(Color(.sRGB, white: 0))
            Text(verbatim: "H").dsText(\.metricUnit).foregroundStyle(Color(.sRGB, white: 0))
        }
        let bitmap = try #require(
            RenderProbe.render(DSTheme(brand: .prism) { row }, size: CGSize(width: 220, height: 160), scale: 4)
        )
        let runs = bitmap.inkColumnRuns()
        #expect(runs.count == 2, "expected the hero and the unit, got \(runs.count) runs")
        let hero = try #require(bitmap.inkRows(columns: runs.first))
        let unit = try #require(bitmap.inkRows(columns: runs.last))
        #expect(abs(hero.last - unit.last) <= 0.75, "hero foot \(hero.last), unit foot \(unit.last)")
    }
}

/// The size `@ScaledMetric` gives a role here, read back through a render so that it is the very number
/// `DSScaledTextModifier` computes — on watchOS the default Dynamic Type size already scales `largeTitle`.
@MainActor
final class ScaledSize {
    var value: CGFloat?
}

struct ScaledSizeProbe: View {
    @ScaledMetric private var size: CGFloat
    private let box: ScaledSize

    init(size: CGFloat, style: Font.TextStyle, box: ScaledSize) {
        _size = ScaledMetric(wrappedValue: size, relativeTo: style)
        self.box = box
    }

    var body: some View {
        box.value = size
        return Color.clear
    }
}

/// What the line-pitch check reads out of `Text.Layout`: `Text.Layout` is not `Sendable` and cannot be stored, so
/// the renderer copies the numbers it needs into this box.
@MainActor
final class LineMetrics {
    var origins: [CGPoint] = []
    var bounds: [(ascent: CGFloat, descent: CGFloat)] = []
}

/// Draws the text unchanged and records one origin and one typographic bound per line.
struct LineMetricsRenderer: TextRenderer {
    let metrics: LineMetrics

    func draw(layout: Text.Layout, in context: inout GraphicsContext) {
        MainActor.assumeIsolated {
            metrics.origins = layout.map(\.origin)
            metrics.bounds = layout.map { ($0.typographicBounds.ascent, $0.typographicBounds.descent) }
        }
        for line in layout { context.draw(line) }
    }
}
