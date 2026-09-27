#if os(iOS)
import CoreGraphics
import SwiftUI

/// How a disabled control's dimming reads, off two renders of it on one ground, enabled and disabled, at three points:
/// the ground, the control's fill, and the layer over the fill — a label or a glyph — at its core.
///
/// A control dimmed as one layer, as the web's `opacity` dims it (`dsDisabledOpacity`), is its enabled picture over the
/// ground at `opacity.disabled`: where the label lies over the fill, the dimmed label is the label dimmed over the
/// ground. Each layer dimmed apart, which is what SwiftUI does to a view with no compositing group, lays the dimmed
/// label over the dimmed fill instead. The share of the picture left against the ground is read off the fill, so no
/// colour is written down: the reading `DSToggleRenderTests.aDisabledRowDimsAsOneLayer` makes of Toggle's knob over
/// its track, for the four other controls that dim (the Button, IconButton, Chip and Card render suites).
///
/// The label's core is the point of the box it is drawn in whose enabled luma lies farthest from the fill's. Where the
/// label covers that pixel only in part, the one-layer figure is still exact and the layer-by-layer one only near. Where
/// it covers the pixel whole, the two differ by `opacity.disabled` × (1 − `opacity.disabled`) × (fill − ground), so each
/// suite stages its control where the fill stands far from the ground, and the two lie tens of code values apart.
struct DSDimmingReading: CustomStringConvertible {
    /// A point of a render, in pixels from its top-leading corner.
    struct Point: CustomStringConvertible {
        let x: Int
        let y: Int

        var description: String { "(\(x), \(y))" }
    }

    /// A render at 1×, as sRGB bytes row by row, and its width.
    struct Bitmap {
        let bytes: [UInt8]
        let width: Int

        init(bytes: [UInt8], width: Int) {
            self.bytes = bytes
            self.width = width
        }

        /// `view` rendered at 1× as it stands and opaque, so the ground the view draws under itself is the picture's.
        init?(_ view: some View) {
            let renderer = ImageRenderer(content: view)
            renderer.scale = 1
            renderer.isOpaque = true
            guard let image = renderer.cgImage,
                  let space = CGColorSpace(name: CGColorSpace.sRGB),
                  let context = CGContext(
                      data: nil, width: image.width, height: image.height, bitsPerComponent: 8,
                      bytesPerRow: image.width * 4, space: space,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
                  )
            else { return nil }
            context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
            guard let data = context.data else { return nil }
            let count = image.width * image.height * 4
            let pixels = data.bindMemory(to: UInt8.self, capacity: count)
            self.init(bytes: Array(UnsafeBufferPointer(start: pixels, count: count)), width: image.width)
        }

        var height: Int { width > 0 ? bytes.count / (width * 4) : 0 }

        func contains(_ point: Point) -> Bool {
            (0..<width).contains(point.x) && (0..<height).contains(point.y)
        }

        /// The Rec. 601 luma of one pixel, 0 to 255.
        func luma(_ point: Point) -> Double {
            let index = (point.y * width + point.x) * 4
            let red = Double(bytes[index])
            let green = Double(bytes[index + 1])
            let blue = Double(bytes[index + 2])
            return (red * 299 + green * 587 + blue * 114) / 1000
        }
    }

    /// The ground, the fill and the label's core in the enabled render, as luma.
    let ground: Double
    let fill: Double
    let top: Double
    /// The fill and the label's core in the disabled render, as luma.
    let dimmedFill: Double
    let dimmedTop: Double
    /// Where the label's core was read.
    let topPoint: Point

    /// The share of the control left against the ground, read off the fill: `opacity.disabled` for a control that dims.
    var share: Double { (ground - dimmedFill) / (ground - fill) }
    /// The label dimmed with the fill under it, as one picture over the ground.
    var asOneLayer: Double { ground + share * (top - ground) }
    /// The label dimmed on its own, over the fill dimmed on its own.
    var layerByLayer: Double { dimmedFill + share * (top - dimmedFill) }

    var description: String {
        "ground \(ground) fill \(fill) label \(top) at \(topPoint) | dimmed fill \(dimmedFill) label \(dimmedTop) | "
            + "share \(share) | one layer gives \(asOneLayer), layer by layer \(layerByLayer)"
    }

    /// Reads `enabled` and `disabled` at `ground`, at `fill`, and at the label's core: the point of `columns` × `rows`
    /// whose luma in `enabled` lies farthest from the fill's. Nil when the two renders differ in size or a point lies
    /// outside them.
    init?(enabled: Bitmap, disabled: Bitmap, ground: Point, fill: Point, columns: Range<Int>, rows: Range<Int>) {
        guard enabled.width == disabled.width, enabled.bytes.count == disabled.bytes.count,
              enabled.contains(ground), enabled.contains(fill), !columns.isEmpty, !rows.isEmpty,
              enabled.contains(Point(x: columns.lowerBound, y: rows.lowerBound)),
              enabled.contains(Point(x: columns.upperBound - 1, y: rows.upperBound - 1))
        else { return nil }
        let fillLuma = enabled.luma(fill)
        var core = Point(x: columns.lowerBound, y: rows.lowerBound)
        var farthest = -1.0
        for y in rows {
            for x in columns {
                let point = Point(x: x, y: y)
                let distance = abs(enabled.luma(point) - fillLuma)
                if distance > farthest {
                    farthest = distance
                    core = point
                }
            }
        }
        self.ground = enabled.luma(ground)
        self.fill = fillLuma
        self.top = enabled.luma(core)
        self.dimmedFill = disabled.luma(fill)
        self.dimmedTop = disabled.luma(core)
        self.topPoint = core
    }
}
#endif
