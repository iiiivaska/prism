import SwiftUI
import Testing

// swift/Tests is scanned for settlingDuration only: the literal spring below is allowed in tests.
@Test func settle() {
    #expect(Spring(duration: 0.35, bounce: 0.15).settlingDuration > 0) // expect: motion/settling-duration
}
