public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        // Button is specVersion 4 in the repository; watchOS is `adapted`, not behind.
        "Button": ["ios": 4, "ipados": 4, "macos": 4, "watchos": 4],
    ]
}
