import DSTokens

/// The platform facts DSCore is allowed to branch on (ADR-0022 §1.3: theme-level material resolution, not the
/// component spacing branch that ADR-0010 rule 1 forbids). Every rule that reads one of these takes it as a
/// parameter with this default, so the table tests exercise every branch on the host.
nonisolated public enum DSPlatform: Sendable {
    /// watchOS: glass renders the opaque fallback and vivid renders solid (ADR-0022 §1.2 trigger 1, Surface.yaml).
    public static var isWatch: Bool {
        #if os(watchOS)
        true
        #else
        false
        #endif
    }

    /// watchOS fixes the color scheme to dark, because its colorset entry carries the dark value (ADR-0019 §2).
    public static var fixesColorSchemeToDark: Bool { isWatch }
}
