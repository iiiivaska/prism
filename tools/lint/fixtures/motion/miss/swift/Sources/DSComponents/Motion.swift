import DSTokens
import SwiftUI

// The token-driven counterpart of each motion pattern (ADR-0023 §12); `miss:` names the rule it must not trip.
struct MotionTokens: View {
    @State private var on = false
    let tokens: DSTokenSet

    var body: some View {
        Text(verbatim: "press")
            .animation(tokens.motion.springSnappy.animation, value: on) // miss: motion/swift-animation-literal, motion/swift-preset
            .onTapGesture {
                withAnimation(tokens.motion.springSnappy.animation) { on.toggle() } // miss: motion/swift-bare-with-animation
            }
    }

    var spring: Spring { Spring(duration: tokens.motion.springSnappy.duration, bounce: tokens.motion.springSnappy.bounce) } // miss: motion/swift-animation-literal
    var settle: TimeInterval { tokens.motion.springSnappy.settle } // miss: motion/settling-duration
}
