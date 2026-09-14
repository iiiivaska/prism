import Testing
@testable import DSComponents

@Suite struct DSSnapshotPlaceholder {
    @Test func manifestStartsEmpty() { #expect(DSComponentsManifest.implemented.isEmpty) }
}
