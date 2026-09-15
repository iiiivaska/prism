import DSTokens
import SwiftUI

// One line per motion pattern (ADR-0023 §12); `expect:` names the rule the line must trip.
struct MotionLiterals: View {
    @State private var on = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion // expect: motion/reduce-motion-setting

    var body: some View {
        Text(verbatim: "press")
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: on) // expect: motion/swift-animation-literal
            .animation(.easeInOut, value: on) // expect: motion/swift-preset
            .onTapGesture {
                withAnimation { on.toggle() } // expect: motion/swift-bare-with-animation
            }
    }

    let spring = Spring(duration: 0.35, bounce: 0.15) // expect: motion/swift-animation-literal
    let curve = Animation.timingCurve(0.23, 1, 0.32, 1, duration: 0.25) // expect: motion/swift-animation-literal
    func press() { withAnimation(.snappy) { on.toggle() } } // expect: motion/swift-preset
    var settle: TimeInterval { spring.settlingDuration } // expect: motion/settling-duration
}
