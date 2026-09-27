#if os(iOS)
import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// What a pressed Chip draws over media, read back from renders (roadmap P4-8; ADR-0036 rule 13, ADR-0037 §5).
///
/// A press scales the pill to 0.97 around the chip, as the web puts `scale` on the element that carries the backdrop
/// filter, and lays `comp.chip.bg.pressed` over whatever the chip renders. Neither may take the glass away or move it:
/// Chromium's `backdrop-filter` samples the backdrop under the transformed box, so the web's pressed pill shows the
/// map where it lies, and the in-bounds mirror must do the same (`DSBackdropMirror`, which stretches its crop back over
/// the frame the chip is drawn at).
///
/// **The fixture** is ADR-0036 F2's idiom: black, with one white band, declared as a map. The band is 24 pt wide, so
/// the chip's blur of standard deviation 20 leaves a peak well above the floor, and its centre sits 24 pt right of the
/// pill's centre, where a mirror scaled with the pill would draw it 0.7 pt off, and one cropped at the scaled frame and
/// not stretched back, 3 pt off. The reading is the centroid of the red channel above its floor along the pill's middle
/// row, 8 pt in from each end, clear of the stroke and the edge: a uniform layer — the pressed fill — moves every value
/// of the row the same way, and the centroid not at all.
///
/// It also reads a disabled chip dimmed as one layer, the label with the pill under it, as the web's `opacity` on the
/// pill dims it (`dsDisabledOpacity`), over black, where the pill's own fill stands far from what lies under it.
///
/// A simulator suite, like `DSSurfaceChipRenderTests`: the chip's colours are catalog colours (`DSRenderCapability`).
@MainActor
@Suite("Chip renders (Chip.yaml v2, ADR-0036 rule 13, ADR-0037 §5)", .serialized)
struct DSChipRenderTests {
    /// The stage, with the pill at its centre.
    static let stage = CGSize(width: 240, height: 80)
    /// The pill: a 160 × 32 pt chip with nothing in it but its layers.
    static let pill = CGSize(width: 160, height: 32)
    /// The white band's width.
    static let band: CGFloat = 24
    /// How far in from each end of the pill the row is read.
    static let margin: CGFloat = 8

    /// Black, with a white band `band` wide whose centre sits `offset` right of the stage's centre, the stage's full
    /// height.
    struct Band: View {
        let offset: CGFloat

        init(offset: CGFloat) {
            self.offset = offset
        }

        var body: some View {
            ZStack {
                Color(.sRGB, white: 0)
                Color(.sRGB, white: 1)
                    .frame(width: DSChipRenderTests.band)
                    .offset(x: offset)
            }
        }
    }

    /// The red channel of the pill's middle row, `margin` in from each end, with the pill pressed or not, centred on the
    /// stage over `Band(offset:)` declared as a map, in light, with glass allowed to render.
    static func row(pressed: Bool, offset: CGFloat) -> [Double]? {
        let view = DSTheme {
            DSChipPill(
                content: Color.clear.frame(width: pill.width, height: pill.height),
                isPressed: pressed,
                isSelected: false,
                isInteractive: true
            )
            .frame(width: stage.width, height: stage.height)
            .dsBackdrop(.map) { Band(offset: offset) }
        }
        .environment(\.colorScheme, .light)
        .dsAccessibilityPolicy(increasedContrast: false, reduceTransparency: false)
        let width = Int(stage.width)
        guard let pixels = DSSurfaceChipRenderTests.rgba(view, width: width, height: Int(stage.height)) else { return nil }
        let y = Int(stage.height / 2)
        let first = Int((stage.width - pill.width) / 2 + margin)
        let last = Int((stage.width + pill.width) / 2 - margin)
        var row: [Double] = []
        for x in first..<last {
            row.append(Double(pixels[(y * width + x) * 4]))
        }
        return row
    }

    /// The centroid of a row above its floor, in points from the row's first column.
    static func centroid(_ row: [Double]) -> Double {
        let floor = row.min() ?? 0
        var total = 0.0
        var moment = 0.0
        for (index, value) in row.enumerated() {
            let weight = value - floor
            total += weight
            moment += Double(index) * weight
        }
        return total > 0 ? moment / total : 0
    }

    /// How far the row's peak stands above its floor, in code values.
    static func prominence(_ row: [Double]) -> Double {
        (row.max() ?? 0) - (row.min() ?? 0)
    }

    /// The largest step between two neighbouring columns, in code values: a few for the blurred band, and most of the
    /// band's height for a sharp one.
    static func steepest(_ row: [Double]) -> Double {
        var steepest = 0.0
        for index in row.indices.dropFirst() {
            steepest = max(steepest, abs(row[index] - row[index - 1]))
        }
        return steepest
    }

    /// Pressed, the pill still blurs the band — the press never takes the glass away (ADR-0037 §5) — and shows it within
    /// 1 pt of where the unpressed pill shows it, which is where it lies on the map.
    ///
    /// The control: the band 8 pt further right moves the unpressed reading by more than 6 pt, so the reading follows
    /// the backdrop, and a mirror that drew the band anywhere else would move it too.
    @Test func aPressedChipShowsTheMirrorWithinOnePointOfTheUnpressedChips() throws {
        try DSRenderCapability.requireRasterizing()
        let rest = try #require(Self.row(pressed: false, offset: Self.band))
        let pressed = try #require(Self.row(pressed: true, offset: Self.band))
        for (name, row) in [("at rest", rest), ("pressed", pressed)] {
            #expect(Self.prominence(row) > 40, "\(name): the band stands \(Self.prominence(row)) above the floor, so it does not show through the pill")
            #expect(Self.steepest(row) < 20, "\(name): a step of \(Self.steepest(row)) between columns, so the pill shows the band sharp and does not blur it")
        }
        let moved = abs(Self.centroid(pressed) - Self.centroid(rest))
        #expect(moved <= 1, "the pressed chip shows the band \(moved) pt from where the unpressed chip shows it")

        let shifted = try #require(Self.row(pressed: false, offset: Self.band + 8))
        let followed = Self.centroid(shifted) - Self.centroid(rest)
        #expect(followed > 6, "the band moved 8 pt and the reading \(followed) pt")
    }

    // MARK: - Disabled

    /// Around the chip in the disabled test: black, clear of the pill on every side.
    static let inset: CGFloat = 16

    static func tokens() -> DSTokenSet {
        DSTokenSet(DSTokenContext(brand: .default, colorScheme: .light, density: .regular, modality: .touch, motion: .standard))
    }

    /// The `disabled` example's chip — "Last 24 hours", `sm`, a button — or its enabled twin, on black with `inset`
    /// around it, in light at regular density. Nothing declares the black: the pill reads the page and draws its own
    /// cell, `comp.chip.bg.rest`, as it does on the page.
    static func bitmap(isDisabled: Bool) -> DSDimmingReading.Bitmap? {
        DSDimmingReading.Bitmap(
            DSTheme {
                DSChip(verbatim: "Last 24 hours", isDisabled: isDisabled, onPress: {})
                    .padding(inset)
                    .background(Color(.sRGB, white: 0))
            }
            .dsDensity(.regular)
            .environment(\.colorScheme, .light)
        )
    }

    /// `isDisabled` dims the whole pill as one layer, `root.disabled.opacity` over it, as the web's `opacity` does
    /// (`dsDisabledOpacity`): where the label lies over the pill's fill, the disabled render is the label dimmed over
    /// what lies under the chip, never the label dimmed over the fill dimmed apart. On the page the fill is one step
    /// from the ground, and the two differ by one or two code values in light and four in dark, which is what the
    /// `disabled` baselines before `dsDisabledOpacity` show; on black they lie tens apart. The share is read off the
    /// fill, in the pill's leading padding, and the label at its core (`DSDimmingReading`).
    @Test func aDisabledChipDimsAsOneLayer() throws {
        try DSRenderCapability.requireRasterizing()
        let tokens = Self.tokens()
        let inset = Int(Self.inset)
        let height = Int(tokens[keyPath: DSChipAppearance.height(.sm)])
        let padding = Int(tokens[keyPath: DSChipAppearance.paddingX(.sm)])
        let enabled = try #require(Self.bitmap(isDisabled: false))
        let disabled = try #require(Self.bitmap(isDisabled: true))
        let reading = try #require(
            DSDimmingReading(
                enabled: enabled, disabled: disabled,
                ground: .init(x: inset / 2, y: inset / 2),
                fill: .init(x: inset + padding / 2, y: inset + height / 2),
                columns: (inset + padding)..<(enabled.width - inset - padding),
                rows: (inset + 2)..<(inset + height - 2)
            ),
            "the renders are \(enabled.width) and \(disabled.width) wide, or a point lies outside them"
        )
        print("DSChipDisabled | \(reading)")
        #expect(abs(reading.share - tokens.opacity.disabled) < 0.05, "the fill is dimmed to \(reading.share), not opacity.disabled")
        #expect(abs(reading.dimmedTop - reading.asOneLayer) <= 6, "the dimmed label is \(reading.dimmedTop), the pill dimmed as one layer gives \(reading.asOneLayer)")
        #expect(abs(reading.dimmedTop - reading.layerByLayer) > 20, "the dimmed label is \(reading.dimmedTop), each layer dimmed apart gives \(reading.layerByLayer)")
    }
}
#endif
