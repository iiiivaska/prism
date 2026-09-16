public enum DSComponentsManifest {
    public static let implemented: [String: [String: Int]] = [
        // A pattern is a recipe, not a component: it has no manifest entry (ADR-0012 rule 3).
        "DashboardGrid": ["ios": 1],
    ]
}
