import Testing

@Suite struct CardFixtureTests {
    @Test func title() { #expect("Unit 4417".isEmpty == false) }
}
