// Swift is outside the runtime kind, which checks web code (ADR-0019 rule 1); DSCore reads the SwiftUI environment.
enum RuntimeNames {
    static let attribute = "data-ds-color-scheme" // miss: runtime/attribute
    static let query = "(prefers-reduced-motion: reduce) and (pointer: coarse)" // miss: runtime/media-preference, runtime/media-pointer
}
