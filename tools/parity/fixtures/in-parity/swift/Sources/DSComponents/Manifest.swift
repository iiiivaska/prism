public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        // Button is specVersion 7 in the repository; watchOS is `adapted`, not behind.
        "Button": ["ios": 7, "ipados": 7, "macos": 7, "watchos": 7],
    ]
}
