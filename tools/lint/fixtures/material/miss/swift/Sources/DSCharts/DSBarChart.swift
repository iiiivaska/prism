// A chart's bar is not SwiftUI's bar material (ADR-0022 rule 2): the chart names its own mark `.bar`, hands it
// to calls that take a mark and reads `bar` off its palette. `miss:` names the rule the line must not trip.
// Each line is a near miss at a boundary of the bar pattern: an array, a label, a member read off a value,
// optional chaining, a call or a subscript between the `(` and the mark, a longer call and a longer member.
import SwiftUI
import DSCore
import DSTokens

enum DSChartMarkFixture { case line, bar }

struct DSBarChartFixture: View {
    private var ds = DSThemeValues()
    let palette: DSChartPaletteFixture
    let highlighted: DSChartPaletteFixture?

    static let marks: [DSChartMarkFixture] = [.line, .bar] // miss: material/swift-material

    var body: some View {
        VStack {
            Rectangle().fill(palette.tint(for: .bar)) // miss: material/swift-material
            Rectangle().fill(palette.bar) // miss: material/swift-material
            Rectangle().fill(highlighted?.bar ?? ds.tokens.color.bgSurfaceRaised) // miss: material/swift-material
            Rectangle().fill(DSChartFillFixture(.line, .bar)) // miss: material/swift-material
            Rectangle().fill(palette.tints[.selected, .bar]) // miss: material/swift-material
            Rectangle().refill(.bar) // miss: material/swift-material
            Rectangle().fill(.barFill) // miss: material/swift-material
        }
    }
}
