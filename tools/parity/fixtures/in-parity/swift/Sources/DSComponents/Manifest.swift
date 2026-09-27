public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        // Button is specVersion 8 in the repository; watchOS is `adapted`, not behind.
        "Button": ["ios": 8, "ipados": 8, "macos": 8, "watchos": 8],
    ]
}
