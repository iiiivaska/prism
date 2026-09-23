#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSTokens

/// The five screens of the showcase (docs/showcase.md §2).
public enum DSShowcaseSection: String, CaseIterable, Identifiable, Hashable {
    case overview, foundations, icons, components, patterns, about

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .overview: "Overview"
        case .foundations: "Foundations"
        case .icons: "Icons"
        case .components: "Components"
        case .patterns: "Patterns"
        case .about: "About"
        }
    }

    public var symbol: String {
        switch self {
        case .overview: "square.grid.2x2"
        case .foundations: "paintpalette"
        case .icons: "square.on.circle"
        case .components: "cube"
        case .patterns: "rectangle.3.group"
        case .about: "info.circle"
        }
    }
}

/// The frame: a split view that collapses itself on a compact width, so iPhone, iPad and the Mac are one view.
///
/// The chrome is **not** Prism. `Sidebar`, `TabBar` and `AdaptiveShell` are specified and unimplemented
/// (`spec/components/Sidebar.yaml`, `TabBar.yaml`, `spec/patterns/AdaptiveShell.yaml`), so the frame is plain
/// SwiftUI over `--ds-*` values, and the About screen says so.
struct DSShowcaseShell: View {
    let axes: DSShowcaseAxes
    @Bindable var presentation: DSAxisPresentation
    @State private var section: DSShowcaseSection?
    @State private var path = NavigationPath()

    init(axes: DSShowcaseAxes, presentation: DSAxisPresentation) {
        self.axes = axes
        self.presentation = presentation
        // A launch argument that names a page implies its section, so `-DSShowcaseExample Card/solid-metric`
        // alone opens the right stack, and `-DSShowcaseIconStyle filled` the Icons screen.
        let implied: DSShowcaseSection? = DSShowcaseLaunch.tokenGroup != nil ? .foundations
            : DSShowcaseLaunch.namesIconState ? .icons
            : (DSShowcaseLaunch.component ?? DSShowcaseLaunch.example.flatMap { DSShowcaseCatalog.named($0.component) })
                .map { $0.isPattern ? .patterns : .components }
        _section = State(initialValue: DSShowcaseLaunch.section ?? implied ?? .overview)
        var path = NavigationPath()
        if let group = DSShowcaseLaunch.tokenGroup { path.append(group) }
        if let component = DSShowcaseLaunch.component { path.append(component) }
        if let example = DSShowcaseLaunch.example {
            if DSShowcaseLaunch.component == nil, let entry = DSShowcaseCatalog.named(example.component) { path.append(entry) }
            path.append(example)
        }
        _path = State(initialValue: path)
    }

    var body: some View {
        NavigationSplitView {
            List(DSShowcaseSection.allCases, selection: $section) { item in
                Label(item.title, systemImage: item.symbol)
            }
            .navigationTitle("Prism")
        } detail: {
            NavigationStack(path: $path) {
                detail
                    // Registered here, on the stack's root, so every section can push a group, a component or an
                    // example — and so a launch argument can seed the path whatever section it opens on.
                    .navigationDestination(for: DSTokenGroup.self) { DSTokenGroupScreen(group: $0) }
                    .navigationDestination(for: DSComponentEntry.self) { DSComponentScreen(entry: $0) }
                    .navigationDestination(for: DSExampleRef.self) { DSExampleScreen(ref: $0) }
            }
        }
        // The button itself is on `DSScreen`, so every pushed screen carries it; only the sheet is here, where
        // there is one of it. Registering the toolbar on the stack's *content* is what left every pushed screen —
        // every token group, every component page, every example — with a back chevron and nothing else.
        .sheet(isPresented: $presentation.isPresented) {
            DSAxisSheet(axes: axes)
        }
    }

    @ViewBuilder
    private var detail: some View {
        switch section ?? .overview {
        case .overview: DSOverviewScreen(axes: axes)
        case .foundations: DSFoundationsScreen()
        case .icons: DSIconsScreen()
        case .components: DSComponentsScreen(patterns: false)
        case .patterns: DSComponentsScreen(patterns: true)
        case .about: DSAboutScreen()
        }
    }
}

/// A screen: the page ground, the page margin, and the resolved-context strip every screen carries, so a
/// screenshot always says which axes produced it.
struct DSScreen<Content: View>: View {
    let title: String
    let content: Content
    private var ds = DSThemeValues()

    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        let tokens = ds.tokens
        ScrollView {
            VStack(alignment: .leading, spacing: tokens.space.sectionGap) {
                DSResolvedContextStrip()
                content
            }
            .padding(tokens.space.pageMargin)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(tokens.color.bgPage)
        .navigationTitle(title)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        // Every screen, not only the six section roots: a token group, a component page and an example page are
        // exactly where a reader wants to move an axis and watch the value move, and a pushed screen registers its
        // own toolbar.
        .toolbar { DSAxesToolbarItem() }
    }
}

/// The control that opens the axis sheet. One `ToolbarContent`, placed by every `DSScreen`.
struct DSAxesToolbarItem: ToolbarContent {
    @Environment(\.dsAxisPresentation) private var presentation

    var body: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Button {
                presentation.isPresented = true
            } label: {
                Label("Axes", systemImage: "slider.horizontal.3")
            }
            // On the Mac the shortcut belongs to the menu item (`DSShowcaseCommands`), which is where a reader
            // discovers it; binding it twice would be two commands for one key.
            .accessibilityLabel("Axes")
            .accessibilityHint("Switch the brand, the colour scheme, the density and the accessibility axes")
        }
    }
}

/// What the runtime resolved, read back from `DSThemeValues().context` — the same values the tokens were
/// resolved with. An axis left on auto shows what the OS and the device chose for it.
struct DSResolvedContextStrip: View {
    private var ds = DSThemeValues()

    var body: some View {
        let tokens = ds.tokens
        let context = ds.context
        DSSurfaceView(material: .nested, radius: .card) {
            VStack(alignment: .leading, spacing: tokens.space.step1) {
                DSText(verbatim: "resolved context", role: .eyebrow, tone: .secondary)
                DSText(
                    verbatim: "\(context.brand.rawValue) · \(context.colorScheme.rawValue) · \(context.density.rawValue) · \(context.modality.rawValue) · contrast \(context.contrast.rawValue) · transparency \(context.transparency.rawValue) · motion \(context.motion.rawValue)",
                    role: .data,
                    tone: .primary
                )
                DSText(
                    verbatim: "\(DSApplePlatform.current.label) · Dynamic Type \(String(describing: ds.policy.dynamicTypeSize)) · Bold Text \(ds.policy.boldText ? "on" : "off")",
                    role: .micro,
                    tone: .secondary
                )
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// A titled block inside a screen.
struct DSBlock<Content: View>: View {
    let title: String
    let note: String?
    let content: Content
    private var ds = DSThemeValues()

    init(_ title: String, note: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.note = note
        self.content = content()
    }

    var body: some View {
        let tokens = ds.tokens
        VStack(alignment: .leading, spacing: tokens.space.step3) {
            DSText(verbatim: title, role: .titleSm, tone: .primary)
            if let note {
                DSText(verbatim: note, role: .caption, tone: .secondary)
            }
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// A key and a value on one line, the way the app prints every piece of metadata.
struct DSFactRow: View {
    let key: String
    let value: String
    private var ds = DSThemeValues()

    init(_ key: String, _ value: String) {
        self.key = key
        self.value = value
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: ds.tokens.space.step3) {
            DSText(verbatim: key, role: .labelSm, tone: .secondary)
                .frame(width: DSFactRow.keyWidth, alignment: .leading)
            DSText(verbatim: value, role: .bodySm, tone: .primary)
            Spacer(minLength: 0)
        }
    }

    static let keyWidth: CGFloat = 132
}
#endif
