#if os(iOS)
import Darwin
import SwiftUI
import Testing
import UIKit
import DSCore
import DSTokens
@testable import DSComponents

/// Divider.yaml `accessibility` and `notes.platform.ios`, read off the accessibility tree the simulator publishes rather
/// than asserted: on iOS a Divider is never an accessibility element, whatever `isDecorative` says.
///
/// The spec's `role` is none while `isDecorative` is true and a separator otherwise, where the platform has that role —
/// the web. SwiftUI's traits carry no separator and ADR-0032 bars the Divider a word of its own, so the `semantic`
/// example is the one sanctioned difference between the stacks: `role="separator"` with the empty name on the web
/// (`web/packages/react/test/divider.test.tsx`), and no element here. Either way nothing announces a name, so the name
/// is the empty string on both stacks for every example.
///
/// **Why this reads the tree.** Hiding is not the same as not exposing: a shape under `.accessibilityHidden(false)` is
/// an element of its own, with no label and no traits, and VoiceOver stops on it. The host suite
/// (`DSDividerBindingTests`) can only check the value the view applies; this one hosts every example between two
/// labelled texts and walks what UIKit's accessibility runtime publishes, which is what VoiceOver reads.
///
/// **How.** SwiftUI publishes its accessibility nodes only while an assistive client is attached, so the walk turns on
/// the accessibility runtime's automation mode for its own duration (`DSAccessibilityAutomation`) and restores what it
/// found. Two controls keep an empty or blind walk from passing: every walk must find both labels, and a shape made an
/// element with nothing else — exactly what an unhidden Divider was — must be found. A runtime whose accessibility
/// library has no automation switch skips the suite, with the reason, instead of failing the snapshot job over
/// something that is not a pixel; a runtime that has the switch but publishes nothing still fails, on the controls,
/// because a blind walk would otherwise pass every check. The hosting view is laid out without a window (the test
/// process has no window scene), so the walk compares labels and traits and not frames, and the content is never
/// inside a `ScrollView`, whose content this walk does not reach.
///
/// Measured against the implementation this suite was written for: with `.accessibilityHidden(isDecorative)`,
/// `semantic` and every `isDecorative: false` case failed here as `["Above", "", "Below"]`, an element with no label
/// and no traits.
@MainActor
@Suite(
    "Divider in the accessibility tree on the simulator (Divider.yaml v1)",
    .serialized,
    .enabled(if: DSAccessibilityAutomation.isAvailable, DSAccessibilityAutomation.unavailableComment)
)
struct DSDividerAccessibilityTreeTests {
    /// What VoiceOver would stop on around a Divider: the two labels the walk hosts it between.
    static let around = ["Above", "Below"]

    // MARK: - Controls

    /// The walk sees the elements it must see: the two labels with nothing between them, a labelled shape, and a
    /// shape that is an element with no label and no traits — the node an unhidden Divider was.
    @Test func theWalkFindsWhatVoiceOverWouldStopOn() throws {
        let nothing = try Self.elements(around: EmptyView())
        #expect(nothing.map(\.label) == Self.around, "\(nothing)")

        let labelled = try Self.elements(around: Rectangle().frame(height: 1).accessibilityLabel(Text(verbatim: "Rule")))
        #expect(labelled.map(\.label) == ["Above", "Rule", "Below"], "\(labelled)")

        let unnamed = try Self.elements(around: Rectangle().frame(height: 1).accessibilityElement())
        #expect(unnamed.count == 3, "a shape made an element was not found: \(unnamed)")
        #expect(unnamed.map(\.label) == ["Above", "", "Below"], "\(unnamed)")
    }

    // MARK: - Divider

    /// Every spec example, staged as the snapshots stage it: only the two labels around it are elements.
    @Test func noExampleIsAnElement() throws {
        let examples = DSExamples.all.filter { $0.component == "Divider" }
        #expect(examples.map(\.name) == DSDividerExamples.rows.map(\.id))
        for example in examples {
            let found = try Self.elements(around: example.content())
            #expect(found.map(\.label) == Self.around, "Divider/\(example.name) exposes \(found)")
        }
    }

    /// Both values of `isDecorative`, in both orientations and at both insets, on the page: never an element.
    @Test func neitherValueOfIsDecorativeMakesAnElement() throws {
        for orientation in DSDividerOrientation.allCases {
            for inset in DSDividerInset.allCases {
                for isDecorative in [true, false] {
                    let divider = DSDivider(orientation: orientation, inset: inset, isDecorative: isDecorative)
                    // A vertical Divider needs a parent with a definite cross size (behavior 2).
                    let found = try Self.elements(around: HStack { divider }.frame(width: 200, height: 40))
                    #expect(
                        found.map(\.label) == Self.around,
                        "DSDivider(orientation: \(orientation.rawValue), inset: \(inset.rawValue), isDecorative: \(isDecorative)) exposes \(found)"
                    )
                }
            }
        }
    }

    // MARK: - The walk

    /// One node VoiceOver would stop on: its label, empty when it has none, and its traits.
    struct Element: CustomStringConvertible {
        let label: String
        let traits: UIAccessibilityTraits

        var description: String { "\(label.debugDescription) traits=\(traits.rawValue)" }
    }

    /// The accessibility elements of `content` hosted between the two labels of `around`, in tree order.
    static func elements(around content: some View) throws -> [Element] {
        let automation = try DSAccessibilityAutomation.enable()
        defer { automation.restore() }

        let host = UIHostingController(rootView: DSTheme {
            VStack(spacing: 8) {
                Text(verbatim: around[0])
                content
                Text(verbatim: around[1])
            }
        })
        host.view.frame = CGRect(x: 0, y: 0, width: DSSnapshotRendering.width, height: 874)
        host.view.layoutIfNeeded()

        // SwiftUI builds its nodes on the next turns of the run loop. Wait until the labels are there, then one more
        // turn, so a node published after them is not missed.
        let deadline = Date().addingTimeInterval(3)
        while Date() < deadline, walk(host.view).count < around.count {
            RunLoop.main.run(until: Date().addingTimeInterval(0.05))
        }
        RunLoop.main.run(until: Date().addingTimeInterval(0.2))
        return walk(host.view)
    }

    /// Every element under `root`, depth first: what an element lists, what a container vends by index, and the
    /// subviews, skipping what is hidden from assistive technology.
    static func walk(_ root: NSObject) -> [Element] {
        var out: [Element] = []
        var seen = Set<ObjectIdentifier>()
        func visit(_ object: NSObject, depth: Int) {
            guard depth < 64, seen.insert(ObjectIdentifier(object)).inserted else { return }
            if object.isAccessibilityElement {
                out.append(Element(label: object.accessibilityLabel ?? "", traits: object.accessibilityTraits))
            }
            if object.accessibilityElementsHidden { return }
            var children: [NSObject] = []
            if let listed = object.accessibilityElements as? [NSObject] { children += listed }
            let count = object.accessibilityElementCount()
            if count != NSNotFound, count > 0 {
                for index in 0..<count {
                    if let child = object.accessibilityElement(at: index) as? NSObject { children.append(child) }
                }
            }
            if let view = object as? UIView { children += view.subviews.filter { !$0.isHidden } }
            for child in children { visit(child, depth: depth + 1) }
        }
        visit(root, depth: 0)
        return out
    }
}

/// The accessibility runtime's automation mode, which makes SwiftUI publish its nodes to UIKit as it does for
/// VoiceOver. `libAccessibility` is a private system library; its switch is the one XCUITest and the open-source
/// accessibility snapshot tools flip in a test process. Only a test reads through it.
///
/// A private switch can go with any runtime update, so the suite asks `isAvailable` before it runs: where the library
/// or either symbol is missing it is skipped with `unavailable` as the reason. The pinned runtime (iOS 26.5, the
/// snapshot job's) has both.
@MainActor
enum DSAccessibilityAutomation {
    typealias Getter = @convention(c) () -> Int32
    typealias Setter = @convention(c) (Int32) -> Void

    struct Session {
        let wasEnabled: Int32
        let set: Setter

        func restore() { set(wasEnabled) }
    }

    nonisolated struct Unavailable: Error, CustomStringConvertible {
        let description: String
    }

    /// Why the suite is skipped where the switch is missing, and what that leaves unchecked.
    nonisolated static let unavailable = """
        this runtime's /usr/lib/libAccessibility.dylib has no automation switch (_AXSAutomationEnabled and \
        _AXSSetAutomationEnabled), so SwiftUI publishes no accessibility nodes to the walk. Skipped, not passed: here \
        nothing reads what a Divider publishes to VoiceOver, and DSDividerBindingTests checks only the value the view \
        applies. Find the switch this runtime uses before moving the snapshot job's simulator pin.
        """

    nonisolated static var unavailableComment: Comment { Comment(rawValue: unavailable) }

    /// Whether this runtime has the switch; the suite's `.enabled(if:)` condition.
    nonisolated static var isAvailable: Bool { (try? switches()) != nil }

    static func enable() throws -> Session {
        let (getter, setter) = try switches()
        let session = Session(wasEnabled: getter(), set: setter)
        setter(1)
        return session
    }

    /// The switch's two functions, or why this runtime has none.
    nonisolated private static func switches() throws -> (get: Getter, set: Setter) {
        guard let handle = dlopen("/usr/lib/libAccessibility.dylib", RTLD_NOW) else {
            throw Unavailable(description: "libAccessibility.dylib did not load: \(dlerror().map { String(cString: $0) } ?? "no reason given")")
        }
        guard let get = dlsym(handle, "_AXSAutomationEnabled"), let set = dlsym(handle, "_AXSSetAutomationEnabled") else {
            throw Unavailable(description: "libAccessibility.dylib has no automation switch on this runtime")
        }
        return (unsafeBitCast(get, to: Getter.self), unsafeBitCast(set, to: Setter.self))
    }
}

#endif
