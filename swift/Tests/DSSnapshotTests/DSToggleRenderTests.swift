#if os(iOS)
import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// Which end of the track the knob rests at, and which edge of the row the track sits at, read back from renders in
/// both writing directions (Toggle.yaml behaviors 3 and 9): off at the track's leading end and on at its trailing end —
/// the left end and the right one under left to right, the other way round under right to left — and the track at the
/// row's trailing edge. The binding tests hold the pure functions (`DSToggleBindingTests.theSwitchMirrorsUnderRightToLeft`);
/// only a render shows that the view applies them, since the knob is placed by leading padding and the row is an
/// `HStack`, both of which the layout direction flips. The web's twin measures the same in Chromium
/// (`web/apps/gallery/test/components.browser.test.tsx`).
///
/// The knob is found by what it is against the track: lighter than the on track, the inverse solid under the
/// opposite-coloured knob, and darker than the off track, the neutral wash under the quiet knob. So each check reads the
/// two points where the knob's centre can rest, and asks which of the two is the knob.
///
/// **Why this is a simulator suite.** The track and the knob are `Colors.xcassets` fills, which `swift test` leaves
/// transparent on the macOS host (`DSRenderCapability`).
@MainActor
@Suite("Toggle renders (Toggle.yaml v1)", .serialized)
struct DSToggleRenderTests {
    /// The width of a labelled row, the frame the examples are staged in (`DSExampleRowFrame`).
    static let rowWidth: CGFloat = 400

    static func tokens() -> DSTokenSet {
        DSTokenSet(DSTokenContext(brand: .default, colorScheme: .light, density: .regular, modality: .touch, motion: .standard))
    }

    /// One switch on the page with `space.page-margin` around it, in light at regular density, as sRGB bytes and a width:
    /// the track alone, or a row of `rowWidth` labelled "Night shading".
    static func render(
        isOn: Bool,
        isLabelled: Bool,
        isDisabled: Bool = false,
        direction: LayoutDirection
    ) -> (bytes: [UInt8], width: Int)? {
        let tokens = Self.tokens()
        let view = DSTheme {
            Group {
                if isLabelled {
                    DSToggle(verbatim: "Night shading", isOn: .constant(isOn), isDisabled: isDisabled).frame(width: rowWidth)
                } else {
                    DSToggle(verbatim: "Night shading", isOn: .constant(isOn), labelVisibility: .hidden, isDisabled: isDisabled)
                }
            }
            .padding(tokens.space.pageMargin)
            .background(tokens.color.bgPage)
        }
        .dsDensity(.regular)
        .environment(\.colorScheme, .light)
        .environment(\.layoutDirection, direction)
        let renderer = ImageRenderer(content: view)
        renderer.scale = 1
        renderer.isOpaque = true
        guard let image = renderer.cgImage,
              let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: image.width * 4,
                  space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
        guard let data = context.data else { return nil }
        let count = image.width * image.height * 4
        let bytes = data.bindMemory(to: UInt8.self, capacity: count)
        return ((0..<count).map { bytes[$0] }, image.width)
    }

    /// The Rec. 601 luma of one pixel, 0 to 255.
    static func luma(_ bytes: [UInt8], width: Int, x: Int, y: Int) -> Int {
        let index = (y * width + x) * 4
        return (Int(bytes[index]) * 299 + Int(bytes[index + 1]) * 587 + Int(bytes[index + 2]) * 114) / 1000
    }

    /// The first and last column of the pixels that differ from the page by more than a rounding step.
    static func inkColumns(_ bytes: [UInt8], width: Int) -> ClosedRange<Int>? {
        let page = Array(bytes[0..<3])
        var minX = Int.max, maxX = -1
        for index in stride(from: 0, to: bytes.count, by: 4) {
            let step = (0..<3).map { abs(Int(bytes[index + $0]) - Int(page[$0])) }.max() ?? 0
            guard step > 3 else { continue }
            let x = (index / 4) % width
            minX = min(minX, x)
            maxX = max(maxX, x)
        }
        return maxX < 0 ? nil : minX...maxX
    }

    /// Off rests the knob at the track's leading end and on at its trailing end, so the knob is at the right end
    /// exactly when the value and the writing direction agree — on under left to right, off under right to left — in the
    /// track alone and in a labelled row, whose track sits at the row's trailing edge: the right edge under left to
    /// right and the left edge under right to left.
    @Test(arguments: [LayoutDirection.leftToRight, .rightToLeft])
    func theKnobRestsAtTheEndItsValueNames(_ direction: LayoutDirection) throws {
        try DSRenderCapability.requireRasterizing()
        let tokens = Self.tokens()
        let geometry = DSToggleAppearance.geometry(tokens)
        let margin = Int(tokens.space.pageMargin)
        let trackWidth = Int(geometry.width)
        let middle = margin + Int(geometry.height / 2)
        for isLabelled in [false, true] {
            let width = isLabelled ? Int(Self.rowWidth) : trackWidth
            // Where the track starts: the row's trailing edge less the track, which is the right edge under left to right.
            let trackStart = margin + (isLabelled && direction == .leftToRight ? width - trackWidth : 0)
            let leftEnd = trackStart + Int(geometry.knobOffset(progress: 0) + geometry.knob / 2)
            let rightEnd = trackStart + Int(geometry.knobOffset(progress: 1) + geometry.knob / 2)
            for isOn in [false, true] {
                let comment = "\(direction), \(isLabelled ? "labelled" : "the track alone"), \(isOn ? "on" : "off")"
                let render = try #require(Self.render(isOn: isOn, isLabelled: isLabelled, direction: direction), "\(comment)")
                #expect(render.width == margin * 2 + width, "\(comment): the render is \(render.width) wide")
                let columns = try #require(Self.inkColumns(render.bytes, width: render.width), "\(comment): nothing drawn")
                if direction == .leftToRight {
                    #expect(columns.upperBound == margin + width - 1, "\(comment): the drawing ends at \(columns.upperBound)")
                } else {
                    #expect(columns.lowerBound == margin, "\(comment): the drawing starts at \(columns.lowerBound)")
                }
                let left = Self.luma(render.bytes, width: render.width, x: leftEnd, y: middle)
                let right = Self.luma(render.bytes, width: render.width, x: rightEnd, y: middle)
                let knobIsRight = isOn == (direction == .leftToRight)
                let knob = knobIsRight ? right : left
                let track = knobIsRight ? left : right
                print("DSToggleKnob \(comment) | left \(left) right \(right)")
                if isOn {
                    #expect(knob > track + 64, "\(comment): knob \(knob), track \(track) — the knob is not at the \(knobIsRight ? "right" : "left") end")
                } else {
                    #expect(knob < track - 64, "\(comment): knob \(knob), track \(track) — the knob is not at the \(knobIsRight ? "right" : "left") end")
                }
            }
        }
    }

    /// `isDisabled` dims the whole row as one layer, `root.disabled.opacity` over it (behavior 17), as the web's
    /// `opacity` does: where the knob sits over the track, the disabled render is the enabled knob dimmed over the page,
    /// never the track showing through the knob. The dimming is read off the track itself, as the share of its colour
    /// left against the page, so no colour is written here. Dimming each layer apart, which SwiftUI does to a view with
    /// no compositing group, put the on knob in light over the dimmed track instead: 192 where one layer gives 247
    /// (CI round 25, `on-disabled`).
    @Test func aDisabledRowDimsAsOneLayer() throws {
        try DSRenderCapability.requireRasterizing()
        let tokens = Self.tokens()
        let geometry = DSToggleAppearance.geometry(tokens)
        let margin = Int(tokens.space.pageMargin)
        let middle = margin + Int(geometry.height / 2)
        // On, the knob rests at the right end, and the left resting point is the track.
        let trackPoint = margin + Int(geometry.knobOffset(progress: 0) + geometry.knob / 2)
        let knobPoint = margin + Int(geometry.knobOffset(progress: 1) + geometry.knob / 2)
        let enabled = try #require(Self.render(isOn: true, isLabelled: false, direction: .leftToRight))
        let disabled = try #require(Self.render(isOn: true, isLabelled: false, isDisabled: true, direction: .leftToRight))
        let page = Double(Self.luma(enabled.bytes, width: enabled.width, x: 0, y: 0))
        let track = Double(Self.luma(enabled.bytes, width: enabled.width, x: trackPoint, y: middle))
        let knob = Double(Self.luma(enabled.bytes, width: enabled.width, x: knobPoint, y: middle))
        let dimTrack = Double(Self.luma(disabled.bytes, width: disabled.width, x: trackPoint, y: middle))
        let dimKnob = Double(Self.luma(disabled.bytes, width: disabled.width, x: knobPoint, y: middle))
        let share = (page - dimTrack) / (page - track)
        let asOneLayer = page + share * (knob - page)
        let layerByLayer = dimTrack + share * (knob - dimTrack)
        print("DSToggleDisabled | page \(page) track \(track) knob \(knob) | dimmed track \(dimTrack) knob \(dimKnob) | share \(share)")
        #expect(abs(share - tokens.opacity.disabled) < 0.05, "the track is dimmed to \(share), not opacity.disabled")
        #expect(abs(dimKnob - asOneLayer) <= 6, "the dimmed knob is \(dimKnob), the row dimmed as one layer gives \(asOneLayer)")
        #expect(abs(dimKnob - layerByLayer) > 20, "the dimmed knob is \(dimKnob), each layer dimmed apart gives \(layerByLayer)")
    }
}
#endif
