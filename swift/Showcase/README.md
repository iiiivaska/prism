# The Apple showcase app

One runnable app — iPhone, iPad and the Mac from one target — that shows **every token and every implemented
component** of the brand it is running, live, with every axis switched through the public API. The design is
[`docs/showcase.md`](../../docs/showcase.md).

```sh
pnpm showcase:apple                        # regenerate, build for the iPhone 17 simulator, install, launch
pnpm showcase:apple --platform macos       # the same on the Mac, and open the built app
pnpm showcase:apple --generate             # only regenerate the catalogues (what CI checks)
pnpm showcase:apple --print-project        # write the Xcode project and stop
```

`--device <name|UDID>` picks the simulator (two simulators can share the name *iPhone 17*, one per OS version, so
a UDID is the unambiguous form), `--work <dir>` says where the derived data goes, `--no-launch` builds only.

## What is here

| Path | What |
|---|---|
| `Sources/DSShowcase/` | the SwiftPM target `DSShowcase`: the screens, the example renderers and the two catalogues. `swift build` and both `xcodebuild build -scheme Prism-Package` steps compile it, so a component that lands without its renderer fails in CI rather than on one machine |
| `Sources/DSShowcase/Generated/` | written by `tools/showcase/apple`, committed, checked by `tools/showcase/apple/catalog.test.ts` under `pnpm -r test` |
| `App/PrismShowcase/` | the app shell: a window and the showcase root, about twenty lines |
| `PrismShowcase.xcodeproj` | generated per run and gitignored — SwiftPM cannot build an app bundle, and the one thing that could drift in the project is the package reference (the same rule as `fixtures/swiftui-app`, ADR-0014) |

## How it discovers things

Nothing in the app holds a list of tokens or of components.

- **Tokens** come from `Generated/DSTokenCatalog.swift`: one entry per token of the published token manifest,
  carrying a `KeyPath` into `DSTokenSet`, so every specimen shows what the running scene resolves rather than a
  value written into the app. `DSTokenSet` has no reflection, so the key paths are generated from the Swift
  member each token already declares in the manifest (`swift: "DSTokenSet.border.focus"`). The 175 `ref`
  primitives have no public Swift API and say so.
- **Components** come from `Generated/DSShowcaseCatalog.swift`: every spec of `spec/components` and
  `spec/patterns`, its support block, the version each Apple platform implements, and each example's props
  exactly as the spec writes them. Every spec is a row, so the app cannot silently omit one.
- **Examples** are staged by one renderer per implemented component, and the list of renderers is generated from
  `DSComponentsManifest`. A component that lands appears in `Generated/DSShowcaseBindings.swift` on the next
  generate, and `DSShowcase` then does not compile until `DS<Name>Renderer` exists. That is the whole
  anti-staleness mechanism: no screen has a list in it, and the build refuses to go quietly stale.

## Reaching the axes

The toolbar button that opens the axis sheet belongs to `DSScreen`, so **every** screen carries it: the six
section roots and every screen a `NavigationLink` pushes — a token group, a component page, an example page — which
are the screens where watching a value move is the point. On the Mac it is also **View ▸ Axes** (⌘⇧A), which is
where a Mac reader looks for a panel and how the shortcut becomes discoverable; the menu item, the button and
`-DSShowcaseAxes 1` all write to the one `DSAxisPresentation` the app shell owns.

## Opening a page directly

Every page has a name, so a screenshot run, a demo or a bug report can open the app exactly where it means to
instead of describing a sequence of taps. SwiftUI puts `-key value` launch arguments in `UserDefaults`:

```sh
xcrun simctl launch "iPhone 17" com.example.prism.showcase \
  -DSShowcaseSection foundations -DSShowcaseTokenGroup sys.color -DSShowcaseColorScheme dark
xcrun simctl launch "iPhone 17" com.example.prism.showcase -DSShowcaseExample Card/glass-vehicle
open PrismShowcase.app --args -DSShowcaseComponent Surface -DSShowcaseDensity comfortable
```

`DSShowcaseSection`, `DSShowcaseTokenGroup` (`sys.color`, `comp.button`), `DSShowcaseComponent`,
`DSShowcaseExample` (`Card/solid-metric`), `DSShowcaseIcon`, `DSShowcaseAxes` (open the axis sheet), and one per
axis: `DSShowcaseBrand`, `DSShowcaseColorScheme`, `DSShowcaseDensity`, `DSShowcaseModality`,
`DSShowcaseIncreasedContrast`, `DSShowcaseReduceTransparency`, `DSShowcaseReduceMotion`, `DSShowcaseBoldText`,
`DSShowcaseDynamicType`. Every key absent is every axis on **auto**, which passes nothing and lets the OS and the
device decide — which is what a plain launch gives.

## What it measures rather than claims

`DSAxisProbe` answers *does this axis actually change anything in this build?* the way the web showcase's
`src/axis-probe.ts` does, in the terms the platform has: it builds the token set for the resolved context and for
the same context with one axis moved, compares every entry of `DSTokenCatalog` through the key path it carries,
and asks `DSSurface.resolve` whether the axis forces the glass fallback. The axis sheet prints what it measured
under each accessibility control.

It exists because of Increase Contrast. A Prism colour on Apple is an asset-catalogue colorset the OS resolves
(ARCHITECTURE §9.8), and `\.colorSchemeContrast` is read-only, so `dsAccessibilityPolicy(increasedContrast:)`
moves Prism's own `DSTokenContext.contrast` — the type weights, the glass fallback — and repaints no swatch. A
colour row therefore reads its printed value from `\.colorScheme` and `\.colorSchemeContrast`, the same two
things its swatch is painted from, so the two cannot disagree; a colorset whose high-contrast entry is a
different colour says so on its own row and prints it; and each token-group screen with colours on it says who
resolves them.

## What it is honest about

The frame — the sidebar, the toolbar, the sheets — is plain SwiftUI, not Prism: `Sidebar` and `TabBar` are
specified and unimplemented and `AdaptiveShell` is a pattern with no implementation, so an app cannot yet be
framed in Prism. Everything inside a screen is the real thing. The Icons screen draws each registry entry with
`DSIcon`, and only its detail sheet's weight ladder and four boxes, which reach further than Icon's props, are drawn
from the binding the registry itself names, labelled as registry data. watchOS is out
of scope for the app (the owner asked for macOS and iOS); the `watch` density is still switchable inside it, and
the screens are `#if os(iOS) || os(macOS)` so the target still compiles for the watch in CI.
