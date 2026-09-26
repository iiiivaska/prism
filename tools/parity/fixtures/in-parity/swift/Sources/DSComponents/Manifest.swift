public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        // Button is specVersion 6 in the repository; watchOS is `adapted`, not behind.
        "Button": ["ios": 6, "ipados": 6, "macos": 6, "watchos": 6],
    ]
}
