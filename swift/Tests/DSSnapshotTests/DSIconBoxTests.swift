#if os(iOS)
import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSIcons
import DSTokens
@testable import DSComponents

/// What an Icon draws, read back as pixels on the simulator: Icon.yaml's anatomy — the glyph "is centered in [its
/// box] and never drawn outside it" — for every registry glyph, behavior 3, `display` below `lg` drawing the
/// `control` cut, and behavior 11, a right-to-left layout mirroring exactly the glyphs the web mirrors.
///
/// Every glyph is drawn in an explicit sRGB black with the `inherit` tone, centred on a white square `margin` larger
/// than its box on every side, at 3× so that a sliver of ink is a whole pixel. The symbols are drawn through DSCore's
/// route (`DSSymbolImage`), which fits a symbol wider than the calibration circle into the circle's frame; this is the
/// suite that shows the fit is enough — `DSIconBindingTests` holds the frames, this holds the ink. The two image sets
/// fill their box by construction and are measured with the rest.
@MainActor
@Suite("Icon draws inside its box (Icon.yaml anatomy, behaviors 3 and 11)", .serialized)
struct DSIconBoxTests {
    static let margin: CGFloat = 8
    static let scale: CGFloat = 3
    /// A pixel darker than this, out of 255, is ink: a 2 % sliver of coverage.
    static let inkThreshold: UInt8 = 250

    struct Render {
        let bytes: [UInt8]
        let side: Int

        /// The pixels that carry ink, as (x, y).
        var ink: [(x: Int, y: Int)] {
            var out: [(x: Int, y: Int)] = []
            for y in 0..<side {
                for x in 0..<side where bytes[(y * side + x) * 4] < DSIconBoxTests.inkThreshold {
                    out.append((x, y))
                }
            }
            return out
        }
    }

    /// - Parameters:
    ///   - layoutDirection: the layout the glyph is drawn in; behavior 11's mirror happens in `.rightToLeft`.
    ///   - flipped: the left-to-right drawing turned over horizontally about the box's centre, which is what a
    ///     mirrored glyph must look like.
    static func render(
        _ name: DSIconName,
        size: DSGlyphSize,
        weight: DSGlyphWeight = .control,
        style: DSIconStyle = .outline,
        boldText: Bool,
        layoutDirection: LayoutDirection = .leftToRight,
        flipped: Bool = false
    ) -> Render? {
        let box = DSIconAppearance.box(size, DSTokenSet(DSTokenContext()).size)
        let side = box + 2 * margin
        let content = DSTheme {
            ZStack {
                Color(.sRGB, white: 1)
                DSIcon(name, size: size, weight: weight, style: style, tone: nil)
                    .foregroundStyle(Color(.sRGB, white: 0))
                    .scaleEffect(x: flipped ? -1 : 1, y: 1)
            }
            .frame(width: side, height: side)
        }
        .dsDensity(.regular)
        .dsAccessibilityPolicy(boldText: boldText)
        .environment(\.legibilityWeight, boldText ? .bold : .regular)
        .environment(\.colorScheme, .light)
        .environment(\.layoutDirection, layoutDirection)
        let renderer = ImageRenderer(content: content)
        renderer.scale = scale
        renderer.isOpaque = true
        guard let image = renderer.cgImage,
              let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: image.width, height: image.height, bitsPerComponent: 8,
                  bytesPerRow: image.width * 4, space: space,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              ),
              image.width == image.height
        else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: CGFloat(image.width), height: CGFloat(image.height)))
        guard let data = context.data else { return nil }
        let count = image.width * image.height * 4
        let pixels = data.bindMemory(to: UInt8.self, capacity: count)
        return Render(bytes: (0..<count).map { pixels[$0] }, side: image.width)
    }

    /// The anatomy, for the whole registry: every glyph at every box, at `control`, at `display` in the `lg` box, and
    /// under Bold Text for each, draws ink, and draws none outside its box.
    @Test func everyRegistryGlyphStaysInsideItsBox() throws {
        try DSRenderCapability.requireRasterizing()
        let boxes = DSTokenSet(DSTokenContext()).size
        var cases: [(size: DSGlyphSize, weight: DSGlyphWeight)] = DSGlyphSize.allCases.map { ($0, .control) }
        cases.append((.lg, .display))
        var widest: (name: String, share: Double) = ("", 0)
        for name in DSIconName.allCases {
            for (size, weight) in cases {
                for boldText in [false, true] {
                    let label = "\(name.rawValue) \(size) \(weight)\(boldText ? " bold-text" : "")"
                    let render = try #require(Self.render(name, size: size, weight: weight, boldText: boldText), "\(label) did not render")
                    let box = DSIconAppearance.box(size, boxes)
                    let low = Int(Self.margin * Self.scale)
                    let high = Int((Self.margin + box) * Self.scale)
                    let ink = render.ink
                    #expect(!ink.isEmpty, "\(label) drew nothing")
                    let outside = ink.filter { $0.x < low || $0.x >= high || $0.y < low || $0.y >= high }
                    #expect(
                        outside.isEmpty,
                        "\(label): \(outside.count) pixel(s) of ink outside the \(box) pt box, first at \(String(describing: outside.first))"
                    )
                    if let minX = ink.map(\.x).min(), let maxX = ink.map(\.x).max(), let minY = ink.map(\.y).min(), let maxY = ink.map(\.y).max() {
                        let share = Double(max(maxX - minX + 1, maxY - minY + 1)) / Double(high - low)
                        if share > widest.share { widest = (label, share) }
                    }
                }
            }
        }
        print("DSIconBoxTests widest ink: \(widest.name) at \(Int(widest.share * 100)) % of its box")
    }

    /// Behavior 3: `display` asked for below `lg` renders the `control` cut — the same pixels, standard and under Bold
    /// Text — and at `lg` it renders a different, thinner one.
    @Test func displayBelowLargeDrawsTheControlCut() throws {
        try DSRenderCapability.requireRasterizing()
        for name in [DSIconName.objectSparkle, .actionSettings, .statusTrendUp] {
            for boldText in [false, true] {
                for size in [DSGlyphSize.sm, .md] {
                    let control = try #require(Self.render(name, size: size, weight: .control, boldText: boldText))
                    let display = try #require(Self.render(name, size: size, weight: .display, boldText: boldText))
                    #expect(control.bytes == display.bytes, "\(name.rawValue) \(size)\(boldText ? " bold-text" : ""): display drew another cut")
                }
                let control = try #require(Self.render(name, size: .lg, weight: .control, boldText: boldText))
                let display = try #require(Self.render(name, size: .lg, weight: .display, boldText: boldText))
                #expect(control.bytes != display.bytes, "\(name.rawValue) lg\(boldText ? " bold-text" : ""): display drew the control cut")
                #expect(display.ink.count < control.ink.count, "\(name.rawValue) lg: the display cut is not the thinner one")
            }
        }
    }

    /// The registry's `rtlMirror.web` per id, read from spec/icons/registry.json: the glyphs the web flips under
    /// `dir="rtl"`. The Apple binding carries only its own flag (`DSIconName.mirrorsInRTL`), which is false wherever
    /// the system mirrors the symbol itself, so the web's intent comes from the registry.
    static func webMirrors() throws -> [String: Bool] {
        let registry = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()  // DSSnapshotTests
            .deletingLastPathComponent()  // Tests
            .deletingLastPathComponent()  // swift
            .deletingLastPathComponent()  // the repository
            .appendingPathComponent("spec/icons/registry.json")
        let document = try JSONSerialization.jsonObject(with: Data(contentsOf: registry))
        let icons = try #require((document as? [String: Any])?["icons"] as? [String: [String: Any]], "\(registry.path) has no icons")
        return icons.mapValues { (($0["rtlMirror"] as? [String: Bool])?["web"]) ?? false }
    }

    /// The pixels whose channels differ by more than a rounding step between two renders of the same size.
    static func differingPixels(_ a: Render, _ b: Render) -> Int {
        guard a.side == b.side else { return max(a.bytes.count, b.bytes.count) / 4 }
        var count = 0
        for pixel in 0..<(a.bytes.count / 4) {
            let offset = pixel * 4
            if (0..<3).contains(where: { abs(Int(a.bytes[offset + $0]) - Int(b.bytes[offset + $0])) > 8 }) { count += 1 }
        }
        return count
    }

    /// `render` moved `dx` pixels to the right, with white let in at the edge.
    static func shifted(_ render: Render, by dx: Int) -> Render {
        var bytes = [UInt8](repeating: 255, count: render.bytes.count)
        for y in 0..<render.side {
            for x in 0..<render.side where x - dx >= 0 && x - dx < render.side {
                let to = (y * render.side + x) * 4
                let from = (y * render.side + x - dx) * 4
                bytes[to..<(to + 4)] = render.bytes[from..<(from + 4)]
            }
        }
        return Render(bytes: bytes, side: render.side)
    }

    /// `differingPixels` at the best of a few whole-pixel horizontal offsets: a right-to-left layout may place the same
    /// drawing a pixel or two to one side of where the left-to-right one sits (the box's centring rounds the other
    /// way), which says nothing about which way the glyph faces.
    static func differingPixelsAligned(_ a: Render, _ b: Render) -> Int {
        (-3...3).map { differingPixels(shifted(a, by: $0), b) }.min() ?? differingPixels(a, b)
    }

    /// Behavior 11 on the pixels, for the whole registry: in a right-to-left layout Apple draws mirrored exactly the
    /// glyphs the web flips — whether the mirror is the system's or Prism's (`rtlMirror.apple`) — and every other glyph
    /// as it draws it left to right, so an RTL reader sees every glyph face the same way on both stacks. The system
    /// mirrors a direction-relative symbol such as `chevron.backward` or `arrow.up.forward`, and a few symbols whose
    /// names say nothing, because SF Symbols ships a right-to-left drawing for them: `calendar` (`object.calendar`, its
    /// day grid running from the right) and `chart.xyaxis.line` (`object.chart`, axes on the right), which the registry
    /// therefore flips on the web too. A left/right-named symbol is not mirrored by the system, whatever CoreGlyphs'
    /// legacy list says, which is how `nav.open` once pointed up-right on Apple under RTL while the web pointed it
    /// up-left. `pnpm icons:validate` and tools/icons-apple check all of this by name, and this measures the drawing, so
    /// a symbol their name rules miss fails here.
    @Test func rightToLeftMirrorsWhatTheWebMirrors() throws {
        try DSRenderCapability.requireRasterizing()
        let web = try Self.webMirrors()
        #expect(Set(web.keys) == Set(DSIconName.allCases.map(\.rawValue)), "the registry and DSIconName disagree; run `pnpm icons:build`")
        for name in DSIconName.allCases {
            for size in DSGlyphSize.allCases {
                let label = "\(name.rawValue) \(size)"
                let ltr = try #require(Self.render(name, size: size, boldText: false), "\(label) did not render")
                let rtl = try #require(Self.render(name, size: size, boldText: false, layoutDirection: .rightToLeft))
                let mirrored = try #require(Self.render(name, size: size, boldText: false, flipped: true))
                if web[name.rawValue] == true {
                    #expect(
                        Self.differingPixelsAligned(rtl, mirrored) == 0,
                        "\(label): under RTL Apple does not draw this glyph mirrored (\(Self.differingPixelsAligned(rtl, ltr)) pixels from its left-to-right drawing)"
                    )
                } else {
                    #expect(
                        Self.differingPixelsAligned(rtl, ltr) == 0,
                        "\(label): the web does not flip this glyph under RTL, but Apple draws it differently (\(Self.differingPixelsAligned(rtl, mirrored)) pixels from its mirror)"
                    )
                }
            }
        }
    }

    /// Behavior 4 on the pixels: under Bold Text the rung steps up once, to more ink, for a symbol and for an image
    /// set; behaviors 5 and 6: a filled glyph is a different drawing from its outline.
    @Test func boldTextAndStyleChangeTheDrawing() throws {
        try DSRenderCapability.requireRasterizing()
        for name in [DSIconName.actionSettings, .statusTrendUp] {
            let standard = try #require(Self.render(name, size: .md, boldText: false))
            let bold = try #require(Self.render(name, size: .md, boldText: true))
            #expect(bold.ink.count > standard.ink.count, "\(name.rawValue): Bold Text did not step the rung")
        }
        let outline = try #require(Self.render(.statusWarning, size: .sm, style: .outline, boldText: false))
        let filled = try #require(Self.render(.statusWarning, size: .sm, style: .filled, boldText: false))
        #expect(filled.ink.count > outline.ink.count, "status.warning: filled is not the filled drawing")
    }
}
#endif
