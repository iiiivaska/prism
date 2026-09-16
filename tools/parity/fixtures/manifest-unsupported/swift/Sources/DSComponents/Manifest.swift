public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        // watchOS is `none` in the spec, so this implementation contradicts the contract.
        "Sample": ["ios": 1, "ipados": 1, "macos": 1, "watchos": 1],
    ]
}
