import SwiftUI

// DSCore is the one place that reads the OS setting (ADR-0023 §8.5).
struct DSMotionPolicyReader: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion // miss: motion/reduce-motion-setting

    var body: some View { EmptyView() }
}
