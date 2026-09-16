public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        // Button is specVersion 3 in the repository; watchOS is `adapted`, not behind.
        "Button": ["ios": 3, "ipados": 3, "macos": 3, "watchos": 3],
    ]
}
