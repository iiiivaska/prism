import Foundation
import Observation
import SwiftUI
import DSTokens

#if os(iOS)
import GameController
import UIKit
#endif

/// Whether a pointing device is connected, the one runtime input of `dsModality` (ADR-0019 §2 and §5).
///
/// iPadOS is the only platform that switches modality at runtime: it starts `touch` and becomes `pointer` while a
/// mouse or trackpad is attached. The mechanism is the GameController framework's `GCMouse` connect and
/// disconnect notifications, which ADR-0019 §5 names as the candidate.
///
/// **Unverified on a device (ARCHITECTURE V11).** Whether those notifications report the Magic Keyboard trackpad
/// and a Bluetooth mouse on iPadOS 26 needs an iPad to answer, and a simulator cannot; the roadmap's verify list
/// carries the item open. Until someone runs it there, the documented fallback is what ships: this monitor only
/// ever moves modality to `pointer` when it sees a mouse, so an iPad that reports nothing stays `touch`, which is
/// exactly ADR-0019 §5's fallback. Nothing else in Prism depends on this class, and everywhere but iPadOS the
/// monitor stays at its platform default and the modality never changes.
///
/// The type is the seam that keeps the rule testable. `DSPointingDevice.shared` listens to the OS; any other
/// instance is inert and is driven with `setConnected(_:)`, so `DSTheme(brand:pointingDevice:)` and
/// `DSContextResolver.modality(...)` can be exercised on a host with no mouse and on a simulator with one.
@MainActor
@Observable
public final class DSPointingDevice {
    /// True while at least one pointing device is attached. Always false where the platform does not detect one.
    public private(set) var isConnected: Bool

    /// Whether `isConnected` is allowed to change the modality. The shared monitor says so only where the
    /// platform reports pointing devices; a monitor an app or a test constructs is always authoritative.
    public let detectsPointingDevice: Bool

    /// The scene-wide monitor `DSTheme` uses. It observes the OS on the platforms that report a pointing device.
    public static let shared = DSPointingDevice(observesSystem: true)

    /// A monitor for previews and tests; `observesSystem` is false, so only `setConnected(_:)` changes it.
    public init(isConnected: Bool = false, observesSystem: Bool = false) {
        self.isConnected = isConnected
        detectsPointingDevice = observesSystem ? Self.platformDetectsPointingDevice : true
        guard observesSystem else { return }
        startObserving()
    }

    /// Drives the value by hand (previews, tests, an app that detects its own pointing device).
    public func setConnected(_ connected: Bool) {
        guard isConnected != connected else { return }
        isConnected = connected
    }

    /// True where the platform reports pointing devices at runtime: iPadOS only (ADR-0019 §2).
    public static var platformDetectsPointingDevice: Bool {
        #if os(iOS)
        UIDevice.current.userInterfaceIdiom == .pad
        #else
        false
        #endif
    }

    private func startObserving() {
        #if os(iOS)
        guard Self.platformDetectsPointingDevice else { return }
        refreshFromSystem()
        for name in [NSNotification.Name.GCMouseDidConnect, .GCMouseDidDisconnect] {
            NotificationCenter.default.addObserver(
                forName: name,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                MainActor.assumeIsolated { self?.refreshFromSystem() }
            }
        }
        #endif
    }

    private func refreshFromSystem() {
        #if os(iOS)
        setConnected(!GCMouse.mice().isEmpty)
        #endif
    }
}
