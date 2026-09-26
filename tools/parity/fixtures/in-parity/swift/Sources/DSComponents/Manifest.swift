public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        // Button is specVersion 5 in the repository; watchOS is `adapted`, not behind.
        "Button": ["ios": 5, "ipados": 5, "macos": 5, "watchos": 5],
    ]
}
