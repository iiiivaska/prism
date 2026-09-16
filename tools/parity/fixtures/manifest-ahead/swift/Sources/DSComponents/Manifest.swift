public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        // Ahead of the spec: ADR-0006 rule 6 bumps `specVersion` first.
        "Button": ["ios": 9, "ipados": 9, "macos": 9, "watchos": 9],
    ]
}
