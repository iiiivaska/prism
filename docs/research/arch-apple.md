# Prism — Apple platform implementation stack (SwiftUI, iOS/iPadOS/macOS/watchOS 26)

Research date: 2026-09-08. Unless stated otherwise, API facts were verified against the live Apple Developer Documentation data feed (`developer.apple.com/tutorials/data/documentation/...json`) on 2026-09-08; the "PLATFORMS" strings below are copied from that feed. Where a fact comes from a blog or a WWDC transcript summary, it is marked as such and given lower confidence.

Confidence key: **H** = official docs / release notes / repo source read directly; **M** = official-adjacent (WWDC session notes, HIG prose paraphrase, library README) or a single reputable secondary source; **L** = community claim not yet verified on device.

---

## 0. Toolchain reality check (versions as of 2026-09-08)

The brief says "Xcode 26.x, Swift 6.2". That is slightly stale:

| Toolchain | Ships | Notes | Source |
|---|---|---|---|
| Xcode 26.0 | Swift 6.2, SDKs iOS/iPadOS/tvOS/watchOS/macOS 26, visionOS 26 | `#Playground` macro; Swift Testing exit tests + attachments; `swift test --attachments-path` | https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes |
| Xcode 26.1.1 | Swift 6.2.1 | | https://developer.apple.com/documentation/xcode-release-notes/xcode-26_1-release-notes |
| Xcode 26.2 / 26.3 | Swift 6.2.3 | 26.3 adds agentic coding + MCP server (Claude Agent / Codex / any MCP client) | https://developer.apple.com/documentation/xcode-release-notes/xcode-26_3-release-notes |
| Xcode 26.4 | **Swift 6.3**, SDKs 26.4; requires macOS Tahoe 26.2+ | Swift Testing can attach `CGImage`/`NSImage`/`UIImage`/`CIImage` directly; Issue `Severity`; XCTest interop off by default | https://developer.apple.com/documentation/xcode-release-notes/xcode-26_4-release-notes |
| Xcode 27 beta 6 | **Swift 6.4**, SDKs iOS 27 etc.; Apple-silicon only; requires macOS 26.4+ | `#Preview(arguments:)` grids; `#Preview` bodies run on main actor; "Preview Snapshot MCP tool" renders light/dark, orientation, type-size variants for agents | https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes |

Implication: pin Prism's CI to **Xcode 26.4 / Swift 6.3** today (min deployment stays iOS 26 as decided), and treat Xcode 27 GM (expected mid-September 2026 alongside iOS 27) as a follow-up migration. Xcode 27's first-party "Preview Snapshot" MCP tool is directly relevant to an AI-agent-as-primary-developer workflow.

---

## 1. Liquid Glass — exact SwiftUI API surface

All items below are available on **iOS 26, iPadOS 26, Mac Catalyst 26, macOS 26, tvOS 26, watchOS 26** unless a narrower list is given. (H — Apple docs feed, 2026-09-08.)

### 1.1 Core modifier and configuration

```swift
// Applies the Liquid Glass effect to a view. Default: .regular variant in a Capsule.
nonisolated func glassEffect(_ glass: Glass = .regular,
                             in shape: some Shape = DefaultGlassEffectShape()) -> some View

struct Glass {
  static var regular: Glass { get }   // "The regular variant of the Liquid Glass material."
  static var clear: Glass { get }     // "When using clear glass, ensure content remains legible by adding a dimming layer..."
  static var identity: Glass { get }  // "your content remains unaffected as if no glass effect was applied."
  func tint(_ color: Color?) -> Glass
  func interactive(_ isEnabled: Bool = true) -> Glass
}
struct DefaultGlassEffectShape // "The default shape applied by glass effects, a capsule."
```

- Apple's own example for `.clear`: `.glassEffect(.clear).background(.black.opacity(0.3))` — a dimming layer beneath clear glass. HIG quantifies it: "If the underlying content is bright, consider adding a dark dimming layer of 35% opacity." (H: https://developer.apple.com/documentation/swiftui/glass/clear ; https://developer.apple.com/design/human-interface-guidelines/materials)
- The docs say to apply `glassEffect` **after** other appearance modifiers: "The `glassEffect(_:in:)` modifier captures the content to send to the container to render. Apply the `glassEffect(_:in:)` modifier after other modifiers that affect the appearance of the view." (H: https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- Shapes: `.glassEffect(in: .rect(cornerRadius: 16))`, `.glassEffect(.regular.tint(.orange).interactive())` are the documented forms. (H, same article)
- No `glassEffect(_:in:isEnabled:)` page exists in the docs feed (fetch returned 404 on 2026-09-08). Disable glass with `Glass.identity`, not a Bool. (M — absence of a doc page.)

### 1.2 Containers, morphing, unions, transitions

```swift
@MainActor struct GlassEffectContainer<Content: View> {
  init(spacing: CGFloat? = nil, @ViewBuilder content: () -> Content)
}
nonisolated func glassEffectID(_ id: (some Hashable & Sendable)?, in namespace: Namespace.ID) -> some View
@MainActor func glassEffectUnion(id: (some Hashable & Sendable)?, namespace: Namespace.ID) -> some View
@MainActor func glassEffectTransition(_ transition: GlassEffectTransition) -> some View
struct GlassEffectTransition { static var identity, matchedGeometry, materialize }
```

- Container: "Each view with a Liquid Glass effect contributes a shape ... SwiftUI renders the effects together, improving rendering performance and allowing the effects to interact with and morph into one another." Spacing: "The higher the spacing, the sooner blending begins as the shapes approach each other." A container spacing larger than the inner `HStack` spacing makes shapes blend **at rest**. (H: https://developer.apple.com/documentation/swiftui/glasseffectcontainer)
- `glassEffectUnion`: "All Liquid Glass effects with the same shape and Liquid Glass variant will be combined into a single shape." (H: https://developer.apple.com/documentation/swiftui/view/glasseffectunion(id:namespace:))
- `matchedGeometry` is the default transition when a newly appearing shape is within the container spacing; "When using the default, this transition applies additional scale and offset effects ... Opt out of these additional animations by providing a specific animation like spring." `materialize` fades content and animates the material without matching geometry. (H: https://developer.apple.com/documentation/swiftui/glasseffecttransition/matchedgeometry)
- Performance: "Creating too many Liquid Glass effect containers and applying too many effects to views outside of containers can degrade performance. Limit the use of Liquid Glass effects onscreen at the same time." (H, custom-views article)

### 1.3 Buttons, edges, background extension, bars

```swift
.buttonStyle(.glass)           // GlassButtonStyle — all 26 platforms incl. watchOS
.buttonStyle(.glassProminent)  // GlassProminentButtonStyle — "similar to borderedProminent"
@MainActor func backgroundExtensionEffect() -> some View   // iOS, iPadOS, Catalyst, macOS, tvOS, visionOS, watchOS 26
nonisolated func scrollEdgeEffectStyle(_ style: ScrollEdgeEffectStyle?, for edges: Edge.Set) -> some View
struct ScrollEdgeEffectStyle { static let automatic, hard, soft }   // hard = "more opaque, clearly defined linear boundary"; soft = "subtle blurred transition"
nonisolated func scrollEdgeEffectHidden(_ hidden: Bool = true, for edges: Edge.Set = .all) -> some View
nonisolated func tabBarMinimizeBehavior(_ behavior: TabBarMinimizeBehavior) -> some View // .automatic/.never/.onScrollDown/.onScrollUp
nonisolated func tabViewBottomAccessory(@ViewBuilder content:) -> some View  // iOS, iPadOS, Catalyst 26 only
var tabViewBottomAccessoryPlacement: TabViewBottomAccessoryPlacement? { get } // EnvironmentValues
nonisolated func searchToolbarBehavior(_ behavior: SearchToolbarBehavior) -> some View // .minimized
struct ToolbarSpacer { init(_:placement:) }           // iOS, iPadOS, Catalyst, macOS 26 only (NOT watchOS/tvOS)
func sharedBackgroundVisibility(_ visibility: Visibility) -> some ToolbarContent // iOS, iPadOS, Catalyst, macOS 26
nonisolated func safeAreaBar(edge: HorizontalEdge, alignment: VerticalAlignment = .center, spacing: CGFloat? = nil, content:) -> some View
nonisolated func buttonSizing(_ sizing: ButtonSizing) -> some View  // .flexible — all 26 platforms
```

- `backgroundExtensionEffect`: "The view will be duplicated into mirrored copies which will be placed around the view on any edge with available safe area. Additionally, a blur effect will be applied on top... Apply this modifier with discretion. This should often be used with only a single instance of background content." It clips the view. (H: https://developer.apple.com/documentation/SwiftUI/View/backgroundExtensionEffect())
- `sharedBackgroundVisibility(.hidden)` moves a toolbar item out of the shared glass grouping. (H: https://developer.apple.com/documentation/swiftui/toolbarcontent/sharedbackgroundvisibility(_:))
- Concentric corners (all 26 platforms): `containerShape(_ shape: some RoundedRectangularShape)`, `ConcentricRectangle`, `Edge.Corner.Style` with `.concentric`, `.concentric(minimum:)`, `.fixed(_:)`, and `Shape.rect(corners: Edge.Corner.Style, isUniform: Bool = false)`. WWDC25-356 states the rule: concentric radius is "calculated ... by subtracting padding from parent"; macOS "mini, small and medium controls still use rounded rectangles. Large and extra large use capsule shapes". (H for API: https://developer.apple.com/documentation/swiftui/concentricrectangle ; M for the rule: https://wwdcnotes.com/documentation/wwdc25-356-get-to-know-the-new-design-system/)
- Opt-out for the whole app: Info.plist `UIDesignRequiresCompatibility`. (H: https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)

### 1.4 What Apple says about where glass belongs (HIG + adoption guide)

Direct quotes (H unless noted):

- "Liquid Glass forms a distinct functional layer for controls and navigation elements — like tab bars and sidebars — that floats above the content layer".
- "**Don't use Liquid Glass in the content layer.** ... Instead, use Standard materials for elements in the content layer, such as app backgrounds. An exception to this is for controls in the content layer with a transient interactive element like sliders and toggles".
- "**Use Liquid Glass effects sparingly.** ... Limit these effects to the most important functional elements in your app."
- "**Only use clear Liquid Glass for components that appear over visually rich backgrounds.**" Regular "blurs and adjusts the luminosity of background content to maintain legibility ... Most system components use this variant." Clear "is highly translucent ... Use this variant for components that float above media backgrounds — such as photos and videos".
- Color on glass: "By default, Liquid Glass has no inherent color ... Apply color sparingly to the Liquid Glass material ... To emphasize primary actions, apply color to the background rather than to symbols or text ... Refrain from adding color to the background of multiple controls." (H: https://developer.apple.com/design/human-interface-guidelines/color)
- Adoption guide: "Reduce your use of custom backgrounds in controls and navigation elements"; "avoid overcrowding or layering Liquid Glass elements on top of each other"; "Combine custom Liquid Glass effects ... using a GlassEffectContainer". (H: https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- WWDC25-219 "Meet Liquid Glass" (M, via wwdcnotes): "Avoid stacking glass on glass"; "Do not mix the variants"; "Tints should only be used to bring emphasis to primary elements". WWDC25-356: "Apply one edge effect per view. Don't mix or stack soft and hard style." (M: https://wwdcnotes.com/documentation/wwdc25-219-meet-liquid-glass/ , https://wwdcnotes.com/documentation/wwdc25-356-get-to-know-the-new-design-system/)

These match Prism's already-decided policy (glass only over imagery/maps/vivid; system chrome native) — the HIG "content layer" prohibition is the one to encode as a lint rule: a `ds` content surface may be `.glass` only when its parent surface is `.vivid` or an image/map, never over `.solid`.

### 1.5 watchOS specifics

- API availability: `glassEffect`, `Glass`, `GlassEffectContainer`, `.glass`/`.glassProminent`, `backgroundExtensionEffect`, `scrollEdgeEffectStyle`, `tabBarMinimizeBehavior` are all declared for watchOS 26 in the docs feed. `ToolbarSpacer`, `sharedBackgroundVisibility`, `tabViewBottomAccessory` are **not** on watchOS. (H)
- Apple's guidance: "In watchOS, adopt standard button styles and toolbar APIs. Liquid Glass changes are minimal in watchOS, so they appear automatically when you open your app on the latest release even if you don't build against the latest SDK. However, to make sure your app picks up this appearance, adopt standard toolbar APIs and button styles from watchOS 10." (H: adopting-liquid-glass)
- HIG typography for watchOS: system font is SF Compact (complications use SF Compact Rounded); default 16 pt / minimum 12 pt. (H: https://developer.apple.com/design/human-interface-guidelines/typography)
- Prism decision "no blur on watchOS" is consistent with Apple's "minimal" stance: on watchOS resolve every `ds` glass surface to `.identity` + solid/vivid fill and rely on `.buttonStyle(.glass)` only for system-looking chrome.

### 1.6 Reduce Transparency / Increase Contrast and glass

- Environment: `var accessibilityReduceTransparency: Bool { get }` (iOS 13+, macOS 10.15+, watchOS 6+): "If this property's value is true, UI (mainly window) backgrounds should not be semi-transparent; they should be opaque." Read-only (cannot be injected for tests). (H: https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducetransparency)
- UIKit equivalent `UIAccessibility.isReduceTransparencyEnabled` (iOS 8+). (H)
- Apple on glass + settings: "people can choose a preferred look for Liquid Glass in their device's settings, or turn on accessibility settings that reduce transparency or motion ... These settings can remove or modify certain effects. If you use standard components from system frameworks, this experience adapts automatically. Ensure you test your app's custom elements, colors, and animations with different configurations of these settings." (H: adopting-liquid-glass). HIG Materials: variant appearance "can differ in response to certain system settings ... reduce transparency or increase contrast". (H)
- iOS 26.1 added a user preference Settings > Display & Brightness > Liquid Glass with "Clear" vs "Tinted" (more opaque) options. (M: https://www.engadget.com/mobile/smartphones/how-to-adjust-the-liquid-glass-effect-in-ios-261-203634681.html , https://www.tomsguide.com/phones/iphones/ios-26-1-lets-you-adjust-liquid-glass-transparency-on-your-iphone-heres-how-to-do-it)
- Community reports say `.glassEffect()` itself becomes more frosted under Reduce Transparency without code changes. (L: https://getskyscraper.com/blog/apple-liquid-glass-ios-26-swiftui-guide , https://swiftcrafted.dev/article/mastering-liquid-glass-swiftui-complete-guide-ios-26-design-language) — treat as unverified; Prism should not depend on it.

Recommended fallback pattern (uses only H-verified API):

```swift
struct DSGlassSurface<S: Shape>: ViewModifier {
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @Environment(\.colorSchemeContrast) private var contrast
  let shape: S; let tint: Color?
  func body(content: Content) -> some View {
    #if os(watchOS)
    content.background(DS.surface.solid, in: shape)            // policy: no blur on watch
    #else
    if reduceTransparency || contrast == .increased {
      content.background(DS.surface.solidElevated, in: shape)  // opaque token surface
    } else {
      content.glassEffect(.regular.tint(tint), in: shape)      // .identity would also be valid
    }
    #endif
  }
}
```

---

## 2. Accessibility environment and Dynamic Type with custom fonts

### 2.1 Environment values (all H, Apple docs feed)

| Key | Declaration | Since | Doc guidance |
|---|---|---|---|
| `accessibilityReduceTransparency` | `Bool { get }` | iOS 13 / watchOS 6 | backgrounds should be opaque |
| `accessibilityReduceMotion` | `Bool { get }` | iOS 13 / watchOS 6 | "UI should avoid large animations, especially those that simulate the third dimension" |
| `colorSchemeContrast` | `ColorSchemeContrast { get }` (`.standard`, `.increased`) | iOS 13 / watchOS 6 | "you can't change it"; note recommends asset-catalog variants |
| `legibilityWeight` | `LegibilityWeight? { get set }` (`.regular`, `.bold`) | iOS 13 / watchOS 6 | "reflects the value of the Bold Text display setting"; settable → injectable in tests/previews |
| `dynamicTypeSize` | `DynamicTypeSize { get set }`; `xSmall…xxxLarge`, `accessibility1…5`, `isAccessibilitySize` | iOS 15 / watchOS 8 | "**On macOS, this value cannot be changed by users and does not affect the text size.**" |
| `accessibilityDifferentiateWithoutColor` | `Bool { get }` | iOS 13 / watchOS 6 | "should not convey information using color alone" |
| `accessibilityShowButtonShapes` | `Bool { get }` | iOS 14 / watchOS 7 | draw edges/borders clearly |
| `accessibilityInvertColors` | `Bool { get }` | iOS 13 | |
| `colorScheme` | `ColorScheme { get set }` | iOS 13 | set via `preferredColorScheme(_:)` for presentations |

Sources: https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducemotion , .../colorschemecontrast , .../legibilityweight , .../dynamictypesize , .../accessibilitydifferentiatewithoutcolor , .../accessibilityshowbuttonshapes

Design consequences for Prism tokens: `colorSchemeContrast`, `accessibilityReduceTransparency`, `accessibilityReduceMotion`, `accessibilityDifferentiateWithoutColor` are **get-only**, so the DS theme must carry its own overridable policy struct (e.g. `DSAccessibilityPolicy`) that defaults from the environment but can be forced in previews and snapshot tests. `dynamicTypeSize` and `legibilityWeight` are settable and can be injected with `.environment(\.legibilityWeight, .bold)` / `.dynamicTypeSize(.accessibility3)`.

HIG contrast targets (H: https://developer.apple.com/design/human-interface-guidelines/accessibility): Accessibility Inspector uses WCAG AA values; table row "All | Bold | 3:1"; "If your app doesn't provide this minimum contrast by default, ensure it at least provides a higher contrast color scheme when the system setting Increase Contrast is turned on." Prism's "large decorative numerics may go to 3:1 at ≥ 24pt" fits the WCAG large-text rule; keep an Increase-Contrast variant that reaches 4.5:1 anyway.

### 2.2 Custom fonts and Dynamic Type (H)

```swift
static func custom(_ name: String, size: CGFloat) -> Font                     // scales relative to .body (iOS 13/watchOS 6)
static func custom(_ name: String, size: CGFloat, relativeTo textStyle: Font.TextStyle) -> Font // iOS 14/macOS 11/watchOS 7
static func custom(_ name: String, fixedSize: CGFloat) -> Font               // no Dynamic Type
@propertyWrapper struct ScaledMetric<Value: BinaryFloatingPoint> { init(wrappedValue:relativeTo:) } // iOS 14/watchOS 7
enum Font.TextStyle { extraLargeTitle2, extraLargeTitle, largeTitle, title, title2, title3, headline, subheadline, body, callout, caption, caption2, footnote }
```

- "match the name of the font with the font's PostScript name"; "If SwiftUI can't retrieve and apply your font, it renders the text view with the default system font instead." (silent fallback → add a startup assertion in DSCore).
- "**SwiftUI doesn't synthesize bold or italic styling for fonts.** If the font supports weighted or italic variants, you can customize ... using the weight(_:) or italic() modifiers." → Bold Text (`legibilityWeight == .bold`) must be mapped by Prism to a heavier face of the Signature font explicitly.
- `@ScaledMetric(relativeTo: .body)` is Apple's recommended way to scale padding with the font. (H: https://developer.apple.com/documentation/swiftui/applying-custom-fonts-to-text)

### 2.3 Bundling fonts in an SPM package and registering them

- App targets: Info.plist `UIAppFonts` (iOS 3.2, tvOS 9, visionOS 1, **watchOS 2**) / `ATSApplicationFontsPath` (macOS). These keys only apply to the app bundle, not to a package's resource bundle. (H: https://developer.apple.com/documentation/bundleresources/information-property-list/uiappfonts and the custom-fonts article)
- Package resources: put files under `Sources/<Target>/Resources`, declare with `.process("Resources/Fonts")` (or `.copy`), access with `Bundle.module` ("Always use `Bundle.module` when you access resources"). (H: https://developer.apple.com/documentation/xcode/bundling-resources-with-a-swift-package)
- Runtime registration (all H, Core Text):
  - `CTFontManagerRegisterFontsForURL(_ fontURL: CFURL, _ scope: CTFontManagerScope, _ error:) -> Bool` — iOS 4.1, macOS 10.6, tvOS 9, **watchOS 2**.
  - `CTFontManagerRegisterFontURLs(_ fontURLs: CFArray, _ scope:, _ enabled: Bool, _ registrationHandler: ((CFArray, Bool) -> Bool)?)` — iOS 13, macOS 10.15, watchOS 6; "After registering fonts from a file, don't move or rename the file."
  - `CTFontManagerScope`: `.none, .process, .persistent, .session, .user`. Use `.process`.
  - Registration "may fail if there's another registered and enabled font with the same PostScript name" → make registration idempotent.
  - Sources: https://developer.apple.com/documentation/coretext/ctfontmanagerregisterfontsforurl(_:_:_:) , https://developer.apple.com/documentation/coretext/ctfontmanagerregisterfonturls(_:_:_:_:)
- Community-verified pattern (M: https://christiantietze.de/posts/2024/03/ship-custom-fonts-within-a-swift-package/ ): `#if SWIFT_PACKAGE Bundle.module #else Bundle.main` + `CTFontManagerRegisterFontURLs`; call early (App `init`); previews sometimes don't show package fonts.
- watchOS: `Font.custom(_:size:relativeTo:)` is watchOS 7+, and Core Text registration is watchOS 2+, so the Signature preset works on watch; keep the file count small (watch app size).

---

## 3. Swift Charts in 2026

Framework: iOS 16 / macOS 13 / tvOS 16 / visionOS 1 / **watchOS 9**. (H: https://developer.apple.com/documentation/charts)

### 3.1 Marks and vectorized plots (H)

| Type | Since | Notes |
|---|---|---|
| `LineMark`, `AreaMark`, `BarMark`, `PointMark`, `RuleMark`, `RectangleMark` | iOS 16 / watchOS 9 | `AreaMark` stacking `.standard/.normalized/.center` (streamgraph); range areas `init(x:yStart:yEnd:)`; `BarMark` interval/Gantt inits; `RectangleMark` heat maps |
| `SectorMark(angle:innerRadius:outerRadius:angularInset:)` + `.cornerRadius` | iOS 17 / watchOS 10 | pie/donut; docs: "no more than 5-7 sectors", positive values only |
| `LinePlot`, `AreaPlot`, `BarPlot`, `PointPlot`, `RectanglePlot`, `RulePlot`, `SectorPlot` (`VectorizedChartContent`) | iOS 18 / watchOS 11 | whole-collection plots via key paths, and **function plotting** `LinePlot(x:y:) { x in x*x }`, parametric `init(x:y:t:domain:function:)` |
| `InterpolationMethod` | iOS 16 | `.linear, .monotone, .cardinal, .catmullRom, .stepStart, .stepCenter, .stepEnd`, `.cardinal(tension:)`, `.catmullRom(alpha:)` |

Sources: https://developer.apple.com/documentation/charts/areamark , .../barmark , .../sectormark , .../lineplot , .../interpolationmethod

### 3.2 Styling, gradients, annotations (H)

- `ChartContent` modifiers: `foregroundStyle(_:)` (any `ShapeStyle`, so `LinearGradient` fills work on `AreaMark`/`BarMark`), `opacity`, `blur(radius:)` (iOS 16.4), `cornerRadius(_:style: .continuous)`, `lineStyle(StrokeStyle)`, `shadow(color:radius:x:y:)` (iOS 16.4), `interpolationMethod`, `zIndex` (iOS 17), `compositingLayer`, `mask(content:)`, `clipShape`, `alignsMarkStylesWithPlotArea`, `symbol`, `symbolSize`, `foregroundStyle(by:)`, `lineStyle(by:)`, `symbol(by:)`, `position(by:axis:span:)`. (H: https://developer.apple.com/documentation/charts/chartcontent)
- Annotation: `annotation(position: AnnotationPosition = .automatic, alignment: Alignment = .center, spacing: CGFloat? = nil, content:)` (iOS 16) and with `overflowResolution: AnnotationOverflowResolution` (iOS 17). Positions: `.automatic, .top, .bottom, .leading, .trailing, .overlay, .topLeading, ...`. (H)
- Colors repeat when series exceed the palette: "Colors are repeated if the number of series is greater than the total number of colors." → Prism must always set `chartForegroundStyleScale` from tokens.

### 3.3 Interaction and scrolling (H — all iOS 17 / macOS 14 / watchOS 10)

```swift
func chartXSelection<P: Plottable>(value: Binding<P?>) -> some View
func chartXSelection<P: Plottable & Comparable>(range: Binding<ClosedRange<P>?>) -> some View
func chartYSelection(value:), chartAngleSelection(value:)      // angle = SectorMark
func chartScrollableAxes(_ axes: Axis.Set) -> some View
func chartXVisibleDomain<P: Plottable & Numeric>(length: P) -> some View
func chartScrollPosition(x: Binding<some Plottable>) -> some View
func chartScrollTargetBehavior(_ behavior: some ChartScrollTargetBehavior) -> some View // .valueAligned(unit:)
func chartGesture(_ gesture: @escaping (ChartProxy) -> some Gesture) -> some View
func chartOverlay(alignment:content: (ChartProxy) -> V)  // iOS 16; ChartProxy.value(at:as:), position(for:), plotFrame ...
```
Sources: https://developer.apple.com/documentation/swiftui/view/chartxselection(value:) , .../chartscrollableaxes(_:) , .../chartscrolltargetbehavior(_:) , https://developer.apple.com/documentation/charts/chartproxy

### 3.4 3D charts (H)

- `Chart3D<Content: Chart3DContent>` and `SurfacePlot(x:y:z:) { x, z in ... }`: **iOS 26, iPadOS 26, Mac Catalyst 26, macOS 26, visionOS 26 — not watchOS, not tvOS.** (H: https://developer.apple.com/documentation/charts/chart3d)
- Only `SurfacePlot` plus the 3D initializers `PointMark(x:y:z:)`, `RuleMark(x:y:z:)` (one range + two scalars), `RectangleMark(x:y:z:)`. No 3D line/area/bar. 3D point symbols `.sphere, .cylinder, .cone, .cube` with `symbolSize`, `symbolRotation`. Surface styles `.heightBased`, `.normalBased`, gradients.
- Camera: `@State var pose: Chart3DPose = .default` + `.chart3DPose($pose)`; presets `.default, .front, .back, .top, .bottom, .left, .right`; `Chart3DPose(azimuth:inclination:)`. `chart3DCameraProjection(.perspective)` is listed for iOS/iPadOS/Catalyst/macOS 26 only (docs feed omits visionOS). `Chart3DRenderingStyle` (`.automatic/.flat/.volumetric`) is visionOS-only.
- Apple's design advice (M, WWDC25-313 notes): "only consider 3D charts if requiring interaction enhances the experience." https://wwdcnotes.com/documentation/wwdc25-313-bring-swift-charts-to-the-third-dimension/

### 3.5 Accessibility / audio graphs

- WWDC22 "Hello Swift Charts": "Swift Charts exposes the data in a visualization to VoiceOver" and supports "the Audio Graphs feature Apple presented in 2021, including the sonifications." (M: https://wwdcnotes.com/documentation/wwdc22-10136-hello-swift-charts/ ; corroborated by https://swiftwithmajid.com/2023/02/28/mastering-charts-in-swiftui-accessibility/)
- Per-mark `accessibilityLabel(_:)`, `accessibilityValue(_:)`, `accessibilityHidden(_:)`, `accessibilityIdentifier(_:)` exist on `ChartContent` and `VectorizedChartContent`. (H)
- For **custom Canvas charts**: `View.accessibilityChartDescriptor(_ representable: some AXChartDescriptorRepresentable)` (iOS 15 / watchOS 8) — "may be applied to any View that represents a chart, including Image and custom-rendered chart views" — with `AXChartDescriptor(title:summary:xAxis:yAxis:additionalAxes:series:)`. This is how a Prism Canvas fallback keeps audio-graph parity. (H: https://developer.apple.com/documentation/swiftui/view/accessibilitychartdescriptor(_:))
- HIG Charting data: "Make every chart in your app accessible ... provide both accessibility labels that describe chart values and components, and accessibility elements". (H: https://developer.apple.com/design/human-interface-guidelines/charting-data)

### 3.6 Limits that force a custom Canvas (or another native view)

Verified by absence in the docs feed plus community practice (M: https://alexanderlogan.co.uk/blog/weekly/01-canvas , https://khorbushko.github.io/article/2025/09/15/charts-in-swiftui.html):

- No polar coordinate system beyond `SectorMark` (no radar/spider, no radial bars, no arc gauges). Native alternative for rings: SwiftUI `Gauge` (iOS 16 / **watchOS 7**) with `.gaugeStyle(.accessoryCircular)` (watchOS 9). (H: https://developer.apple.com/documentation/swiftui/gauge)
- No custom `ChartContent` mark types with custom drawing; you compose existing marks or drop to `Canvas`.
- No sankey / treemap / network / sunburst / candlestick primitives (candlestick = `RectangleMark` + `RuleMark` composition).
- Selection APIs are iOS 17+/watchOS 10+ (fine for a 26 floor); 3D absent on watchOS.
- `ImageRenderer` cannot rasterize glass/materials (see §4.4), which matters if charts sit on glass in snapshots.

---

## 4. SPM for a multi-platform design system

### 4.1 Manifest at repo root (H)

swift.org SwiftPM docs: "A Swift package is a directory that contains sources, dependencies, and has a `Package.swift` manifest file at its root." Git dependencies are addressed by repository URL, and SwiftPM/Xcode resolve the package from the repository root; there is no sub-path syntax in `Package.Dependency`. (H: https://github.com/swiftlang/swift-package-manager/blob/main/Sources/PackageManagerDocs/Documentation.docc/CreatingSwiftPackage.md ; Xcode "Adding package dependencies to your app" only takes a repository URL: https://developer.apple.com/documentation/xcode/adding-package-dependencies-to-your-app). Confirms the monorepo decision: `Package.swift` must sit at the repo root, with target `path:`s pointing into `swift/`.

### 4.2 Manifest features relevant to Prism (H, PackageDescription docs feed)

- `platforms: [.iOS(.v26), .macOS(.v26), .watchOS(.v26)]` — `IOSVersion.v26/.v27`, `MacOSVersion.v26/.v27`, `WatchOSVersion.v26/.v27` exist.
- `SwiftSetting.defaultIsolation(MainActor.self)` — PackageDescription 6.2 ("The compiler defaults to inferring unannotated code as nonisolated if unspecified"). Good default for UI targets (DSCore/DSComponents/DSCharts); keep DSTokens `nil` (pure values).
- `SwiftSetting.strictMemorySafety()` — 6.2 (optional).
- `SwiftSetting.swiftLanguageMode(.v6)` — 6.0; `enableUpcomingFeature`.
- `BuildSettingCondition.when(platforms:configuration:traits:)` — 6.1; use `.define("DS_GLASS", .when(platforms: [.iOS, .macOS]))`.
- Package traits (`Trait`, SwiftPM 6.1): "Traits must be strictly additive. Enabling a trait must not remove API." Conditional deps via `.product(..., condition: .when(traits: ["X"]))`. Useful for opt-in `Charts3D` or `SnapshotSupport` traits; brands must **not** be traits (traits are compile-time, brands are runtime tokens).
- Resources: `.process(_:localization:)` (preferred), `.copy(_:)`; `exclude`; `Bundle.module`.
- Platform-conditional sources: SwiftPM has no per-platform `sources:`; use `#if os(watchOS)` / `#if canImport(Charts)` inside files, or split into platform-specific targets with conditional dependencies (`.target(name:condition: .when(platforms:))`).

### 4.3 swift-snapshot-testing status (verified 2026-09-08)

- Latest release **1.19.4 (2026-07-28)**; 1.19.3 fixed safe-area influence on `UIHostingController` snapshots; **1.19.0 (2026-03-18)** added Swift Testing attachment support and the explicit `record: Record?` parameter (deprecating `isRecording`); 1.19.1 uses native Swift Testing image attachments on Swift ≥ 6.3. (H: https://github.com/pointfreeco/swift-snapshot-testing/releases)
- Manifest: swift-tools 6.0; platforms iOS 13 / macOS 10.15 / tvOS 13 / watchOS 6; products `SnapshotTesting`, `InlineSnapshotTesting`, `SnapshotTestingCustomDump`; language mode v5. (H: Package.swift)
- Swift Testing: `assertSnapshot` detects XCTest vs Swift Testing; configure with `@Suite(.snapshots(record: .all, diffTool: .ksdiff))` or `withSnapshotTesting(record:diffTool:)`; `record` = `.all / .missing / .never / .failed`; caveat: Swift Testing "runs parallel tests in the same process". (H: MigratingTo1.17.md; https://www.pointfree.co/blog/posts/146-swift-testing-support-for-snapshottesting)
- **SwiftUI view strategy is iOS/tvOS only**: `Sources/SnapshotTesting/Snapshotting/SwiftUIView.swift` is wrapped in `#if os(iOS) || os(tvOS)`; `Snapshotting<some View, UIImage>.image(drawHierarchyInKeyWindow:precision:perceptualPrecision:layout:traits:)`, `SwiftUISnapshotLayout` = `.device(config:)` (iOS/tvOS) / `.fixed(width:height:)` / `.sizeThatFits`. macOS has `Snapshotting<NSView, NSImage>.image` (so wrap views in `NSHostingView`). **No watchOS strategy.** (H: repo source)
- `ViewImageConfig` presets stop at iPhone 13 family / iPadPro12_9 / tv4K — no iPhone 15/16/17. Use `.fixed` layouts + `traits:` or define Prism's own `ViewImageConfig`. (H: Common/View.swift)
- **`swift test` runs on the host (macOS)**; the library's own Makefile runs iOS/tvOS via `xcodebuild test -scheme SnapshotTesting -destination "platform=iOS Simulator,..."`, and `swift test` only for the macOS/Linux matrix. There is no way to run `swift test` on an iOS simulator. (H: Makefile, .github/workflows/ci.yml)
- Xcode 26 adds `swift test --attachments-path` and Swift Testing attachments in `.xcresult`; Xcode 26.4 attaches images natively. (H: release notes)

### 4.4 `ImageRenderer` as an alternative rasterizer (H)

`ImageRenderer` (iOS 16 / macOS 13 / **watchOS 9**) — "output only includes views that SwiftUI rasterizes directly using its own drawing primitives, such as text, images, shapes, and composite views of these types. It does not include views whose contents are composited by Core Animation layers, such as more complex controls and containers, web views, media players, and most types of UIKit and AppKit views. In those cases, ImageRenderer displays a placeholder image". So: fine for **watchOS snapshots (no glass by policy)** and token/typography galleries; **not** for glass, materials, scroll-edge effects, or system controls. (https://developer.apple.com/documentation/swiftui/imagerenderer)

### 4.5 Xcode 26 previews and `#Playground`

- `#Playground { ... }` from `import Playgrounds`, runs inline in the canvas; multiple named blocks per file; tabs alongside `#Preview`; coding tools can generate playgrounds. Known issue in 26.0: "Playground macros currently cause a build failure ... when built for Mac Catalyst" (fixed). (H: https://developer.apple.com/documentation/xcode/running-code-snippets-using-the-playground-macro ; Xcode 26 release notes)
- Open-source side: `apple/swift-play-experimental` provides the `Playgrounds` library and a prototype `swift play` SwiftPM command (macOS/Linux/Windows) — not shipped in release toolchains. (H: https://github.com/apple/swift-play-experimental)
- Xcode 27 beta: `#Preview(arguments:)` renders a grid per argument; `#Preview` bodies are explicitly main-actor; Preview Snapshot MCP tool renders variants (light/dark, orientation, type sizes). (H: Xcode 27 release notes)
- Xcode 26.3 MCP server: community enumerations list `RenderPreview`, `BuildProject`, `RunSomeTests`, `ExecuteSnippet`, etc. (M: https://rudrank.com/exploring-xcode-using-mcp-tools-cursor-external-clients , https://dev.to/arshtechpro/xcode-263-use-ai-agents-from-cursor-claude-code-beyond-4dmi). Apple's own doc is the 26.3 release note. This is the fastest visual-verification loop for an AI agent iterating on Prism components.

---

## 5. Color

### 5.1 SwiftUI color APIs (H)

```swift
init(_ colorSpace: Color.RGBColorSpace = .sRGB, red: Double, green: Double, blue: Double, opacity: Double = 1)
enum Color.RGBColorSpace { sRGB, sRGBLinear, displayP3 }
init(_ name: String, bundle: Bundle? = nil)                 // asset catalog color set — adapts to appearance/contrast at render time
func resolve(in environment: EnvironmentValues) -> Color.Resolved   // iOS 17; Resolved stores linear sRGB, extended range
func mix(with rhs: Color, by fraction: Double, in colorSpace: Gradient.ColorSpace = .perceptual) -> Color // iOS 18
```

- Literal colors: "This initializer creates a constant color that doesn't change based on context ... it doesn't have distinct light and dark appearances". "SwiftUI colors use an extended sRGB color space, so you can use component values outside that range ... make full use of the wider gamut of a display that supports displayP3." (https://developer.apple.com/documentation/swiftui/color/init(_:red:green:blue:opacity:))
- `colorSchemeContrast` doc note: "If you only need to provide different colors ... for different color scheme and contrast settings, do that in your app's Asset Catalog." Asset catalog color sets have an Appearances "High Contrast" option yielding Any/Dark × standard/high-contrast slots, picked up automatically by `Color(named:)`. (H for the note; M for the catalog UI: https://www.createwithswift.com/supporting-increase-contrast-in-your-app-to-enhance-accessibility/)
- HIG Color: "If you define a custom color, make sure to supply light and dark variants, and an increased contrast option for each variant"; wide color: "use the Display P3 color profile ... Gradients that use P3 colors can also sometimes appear clipped on sRGB displays ... you can use the asset catalog ... to provide different versions of images and colors for each color space." (H)

### 5.2 Encoding a token color for Swift from sRGB/OKLCH

- DTCG Color Module 2025.10: `$value = { colorSpace, components[3], alpha?, hex? }`; 14 color spaces (`srgb, srgb-linear, hsl, hwb, lab, lch, oklab, oklch, display-p3, a98-rgb, prophoto-rgb, rec2020, xyz-d65, xyz-d50`); `hex` is "a fallback value of the color" in 6-digit notation. (H: https://www.designtokens.org/TR/drafts/color/ — note the page served on 2026-09-08 is a "preview draft" of the 2025.10 module.)
- Style Dictionary **v5.3.0**: "All color transformers now support both legacy string format and DTCG object format with colorSpace, components, alpha, and optional hex fallback"; all 14 spaces; new `color/oklch`, `color/oklab`, `color/p3`, `color/lch` (CSS output); "When a DTCG color object includes a hex property, it will be used as a fallback when the color is out-of-gamut for sRGB". v5.4.0 adds DTCG dimension objects; latest is **v5.5.3 (2026-09-06)**. Style Dictionary states 2025.10 support is still "a work in progress in v5". (H: https://github.com/style-dictionary/style-dictionary/blob/main/CHANGELOG.md , https://github.com/style-dictionary/style-dictionary/releases , https://styledictionary.com/info/dtcg/)
- Built-in Swift output: transform group `ios-swift` = `attribute/cti, name/camel, color/UIColorSwift, content/swift/literal, asset/swift/literal, size/swift/remToCGFloat`; `color/ColorSwiftUI` emits `Color(red:green:blue:opacity:)` (**sRGB only, no P3**); formats `ios-swift/class.swift`, `ios-swift/enum.swift`, `ios-swift/any.swift` (`objectType`, `className`, `accessControl`, `import`). (H: https://styledictionary.com/reference/hooks/transform-groups/predefined/ , https://styledictionary.com/reference/hooks/formats/predefined/)

Recommended encoding (see §8.3): keep OKLCH as the source of truth, and have a **custom SD transform** (colorjs.io, which SD v5 already depends on) emit, per token and per scheme/contrast, `Color(.displayP3, red:, green:, blue:, opacity:)` when the color is inside the P3 gamut, else the gamut-mapped P3 value; also emit the sRGB `hex` fallback into a generated `.xcassets` color set with `display-p3` values and Any/Dark × High-Contrast slots so asset-catalog previews and UIKit interop stay consistent. Never ship raw OKLCH to Swift — there is no OKLCH `Color` initializer.

---

## 6. Fonts and SF Symbols

### 6.1 System fonts (H)

- `Font.system(_ style: Font.TextStyle, design: Font.Design? = nil, weight: Font.Weight? = nil)` (iOS 16 / watchOS 9); `Font.Design` = `.default, .monospaced, .rounded, .serif` (iOS 13; `.serif`/`.monospaced` watchOS 7); `Font.Width` = `.compressed, .condensed, .expanded, .standard` (iOS 16). (https://developer.apple.com/documentation/swiftui/font/system(_:design:weight:))
- HIG Typography: "You can use the constants defined in Design to access all system fonts — don't embed system fonts in your app or game. For example, use default to get the system font on all platforms; use serif to get the New York font." SF family: "SF Pro, SF Compact, SF Arabic, SF Armenian, SF Georgian, SF Hebrew, and SF Mono variants"; rounded variants exist for SF Pro/Compact; "SF Compact is the system font in watchOS ... In complications, watchOS uses SF Compact Rounded"; "macOS doesn't support Dynamic Type"; "NY is available for Mac apps built with Mac Catalyst". (H: https://developer.apple.com/design/human-interface-guidelines/typography)
- Apple fonts page: SF Pro, SF Compact, SF Mono, New York all list Latin, Greek and **Cyrillic** support; variable optical sizes. (H: https://developer.apple.com/fonts/)
- Download license (H, same page): "you may use the Apple Font solely for creating mock-ups of user interfaces to be used in software products running on Apple's iOS, OS X or tvOS operating systems"; "Cannot embed the fonts in any software programs"; not for mock-ups of non-Apple OS UIs. → The web side of Prism cannot use SF; use Inter (as decided) and never ship SF files in the npm package.
- `Font.Design.monospaced` → SF Mono and `.rounded` → SF Pro Rounded is the common understanding but not stated in the API docs (M).

### 6.2 SF Symbols 7 / 8 (H for APIs)

- SwiftUI/Symbols APIs new in 26: `DrawOnSymbolEffect`, `DrawOffSymbolEffect` (`.byLayer`, `.individually`, `.wholeSymbol`, `.reversed`), `symbolVariableValueMode(_:)` with `SymbolVariableValueMode.color / .draw` (Variable Draw), `symbolColorRenderingMode(_:)` with `.flat / .gradient`. Existing: `symbolRenderingMode(.monochrome/.hierarchical/.palette/.multicolor)` (iOS 15), `symbolEffect(_:options:value:)` (iOS 17), `SymbolEffectOptions` (`.repeat`, `.speed`). (https://developer.apple.com/documentation/symbols/drawonsymboleffect , https://developer.apple.com/documentation/swiftui/view/symbolvariablevaluemode(_:) , https://developer.apple.com/documentation/swiftui/view/symbolcolorrenderingmode(_:))
- HIG SF Symbols (updated 2025-07-28): nine weights matching SF font weights, three scales; "Draw On / Draw Off — In SF Symbols 7 and later"; gradient rendering "from a single source color"; Magic Replace is the default replace animation; "prohibition against using symbols — or images that are confusingly similar — in app icons, logos, or any other trademarked use". (H: https://developer.apple.com/design/human-interface-guidelines/sf-symbols)
- License clause as quoted by Apple engineers on the forums: "THE APPLE SOFTWARE IS TO BE USED SOLELY FOR CREATING USER INTERFACES TO BE USED IN SOFTWARE PRODUCTS RUNNING ON APPLE'S iOS, iPadOS, macOS, tvOS OR watchOS OPERATING SYSTEMS". (M: https://developer.apple.com/forums/thread/739523) → SF Symbols cannot be exported to the web bundle; Phosphor on web (as decided). The semantic-icon registry must map `name → (sfSymbol, phosphorName, weightToken)`.
- SF Symbols 8 beta was released at WWDC26 (2026-06) with new symbols for the 27 OS family; no new rendering APIs surfaced in the 26.x docs. (M: https://9to5mac.com/2026/06/12/icon-composer-2-and-sf-symbols-8-now-available-as-betas/)
- Stroke weight as a token maps 1:1 onto `Font.Weight` for symbols because "each of the nine symbol weights ... corresponds to a weight of the San Francisco system font" (H, HIG).

---

## 7. Haptics and motion

### 7.1 `sensoryFeedback` (H — SwiftUI, iOS 17 / macOS 14 / tvOS 17 / watchOS 10 / visionOS 26)

```swift
func sensoryFeedback<T: Equatable>(_ feedback: SensoryFeedback, trigger: T) -> some View
func sensoryFeedback<T: Equatable>(_ feedback: SensoryFeedback, trigger: T, condition: @escaping (T, T) -> Bool) -> some View
func sensoryFeedback<T: Equatable>(trigger: T, _ feedback: @escaping () -> SensoryFeedback?) -> some View
```

| Feedback | Plays on (per Apple docs) |
|---|---|
| `.success`, `.warning`, `.error` | iOS, watchOS |
| `.selection` (also `.selection(_:)`) | iOS, watchOS |
| `.impact(weight: .light/.medium/.heavy, intensity:)`, `.impact(flexibility: .rigid/.solid/.soft, intensity:)` | iOS, watchOS ("Not all platforms will play different feedback for different weights") |
| `.alignment` | iOS, macOS |
| `.levelChange` | macOS only |
| `.pathComplete` (17.5) | iOS only |
| `.start`, `.stop` | watchOS only |
| `.increase`, `.decrease` | watchOS, visionOS |

Source: https://developer.apple.com/documentation/swiftui/sensoryfeedback and children. Implication: a `ds.haptic.*` token vocabulary must be platform-mapped; macOS effectively has two.

### 7.2 watchOS `WKInterfaceDevice` (H)

`WKInterfaceDevice.current().play(_ type: WKHapticType)` (watchOS 2); `WKHapticType`: `notification, directionUp, directionDown, success, failure, retry, start, stop, click, navigationGenericManeuver, navigationLeftTurn, navigationRightTurn, underwaterDepthPrompt, underwaterDepthCriticalPrompt`. Constraints: no effect when app is background/inactive (except active workout); repeated calls impose a 100 ms minimum delay; "Do not call this method while gathering heart rate data using HealthKit". (https://developer.apple.com/documentation/watchkit/wkinterfacedevice/play(_:))

### 7.3 Springs, presets, transactions (H)

```swift
static func spring(duration: TimeInterval = 0.5, bounce: Double = 0.0, blendDuration: Double = 0) -> Animation
static func spring(response: Double = 0.5, dampingFraction: Double = 0.825, blendDuration: TimeInterval = 0) -> Animation
static var smooth: Animation   // bounce 0        static func smooth(duration: TimeInterval = 0.5, extraBounce: Double = 0)
static var snappy: Animation   // base bounce 0.15 static func snappy(duration:extraBounce:)
static var bouncy: Animation   // base bounce 0.3  static func bouncy(duration:extraBounce:)
static func interactiveSpring(duration: TimeInterval = 0.15, extraBounce: Double = 0, blendDuration: TimeInterval = 0.25) -> Animation
struct Spring { init(duration: TimeInterval = 0.5, bounce: Double = 0.0); init(response:dampingRatio:); init(mass: Double = 1, stiffness:damping:allowOverDamping:); init(settlingDuration:dampingRatio:epsilon:) }
// Spring(duration: 0.5, bounce: 0.3) => (mass 1.0, stiffness 157.9, damping 17.6)   — Apple's own example
```

- `bounce` semantics: 0 = critically damped, up to 1.0 undamped, negative = overdamped (min -1). This is the ideal machine-readable motion token: `{duration, bounce}` converts losslessly to `Spring` on Apple and to `mass/stiffness/damping` for web via `Spring` (Apple gives the conversion). (https://developer.apple.com/documentation/swiftui/spring , https://developer.apple.com/documentation/swiftui/animation/spring(duration:bounce:blenddurations:))
- `Transaction { var animation: Animation?; var disablesAnimations: Bool; addAnimationCompletion }`; `View.transaction(_:)` — "Use this modifier on leaf views such as Image or Button rather than container views"; `animation(_:value:)`; `animation(_:body:)` (iOS 17) scopes an animation to modifiers in the closure. (https://developer.apple.com/documentation/swiftui/view/transaction(_:))
- Reduce Motion: `accessibilityReduceMotion` doc — avoid large/3D animations; HIG — "reducing automatic and repetitive animations, including zooming, scaling, and peripheral motion"; HIG Motion: Liquid Glass "responds to direct touch interaction with greater emphasis ... more subdued effect when a person interacts using a trackpad" (pointer vs touch modality already in Prism's token dimensions). Glass transitions: pass an explicit animation to opt out of `matchedGeometry`'s extra scale/offset. (H)

---

## 8. Recommendations for Prism

### 8.1 Toolchain and floors
1. CI: Xcode 26.4 (Swift 6.3) now; add an Xcode 27 lane the week the GM ships; `swift-tools-version: 6.2` in `Package.swift` (needed for `defaultIsolation`), language mode 6.
2. Deployment floors stay iOS/iPadOS/macOS/watchOS 26; do **not** add tvOS/visionOS until a consumer needs them (Chart3D and several bar APIs differ there anyway).

### 8.2 `swift/` layout (Package.swift at repo root, targets under `swift/`)

```
Package.swift
swift/
  Sources/
    DSTokens/              # GENERATED by Style Dictionary — never hand-edited; nonisolated, no SwiftUI import except Color/Font wrappers
      Colors.swift         # enum DSColor { static func primary(_ ctx: DSTokenContext) -> Color }  — brand×scheme×contrast resolved at runtime
      Dimensions.swift     # spacing/radii/sizes per density (compact/regular/comfortable) and modality (pointer/touch)
      Typography.swift     # text styles: size, relativeTo: Font.TextStyle, weight, tracking, leading; per slot ui/display/mono
      Motion.swift         # springs as {duration, bounce}; durations; reduce-motion alternates
      Elevation.swift      # 4 levels: shadow + surface tokens
      Symbols.swift        # semantic icon registry → SF Symbol names + weight token
      Resources/Colors.xcassets   # generated P3 color sets with Any/Dark × High-Contrast slots (Figma-ready, UIKit-ready)
      Resources/Fonts/*.ttf       # Signature preset only (Native preset uses Font.system)
    DSCore/                # theme + environment + adapters; defaultIsolation(MainActor)
      DSTheme.swift, DSBrand.swift, DSDensity.swift, DSInputModality.swift
      DSAccessibilityPolicy.swift  # reduceTransparency / increaseContrast / reduceMotion / differentiateWithoutColor / boldText — defaults from env, overridable
      DSSurface.swift      # .solid / .vivid / .glass resolution incl. HIG rule "glass only over vivid/imagery" and watchOS => no blur
      DSFontRegistrar.swift  # CTFontManagerRegisterFontURLs(Bundle.module...) idempotent; PostScript-name assertions
      DSHaptics.swift      # ds.haptic.* → SensoryFeedback per platform, WKInterfaceDevice fallback
      DSMotion.swift       # Spring(duration:bounce:) builders honoring DSAccessibilityPolicy
      Environment+DS.swift # \.dsTheme, \.dsDensity, \.dsSurfaceContext
    DSComponents/          # SwiftUI components + Styles (ButtonStyle, ToggleStyle, LabelStyle…)
      Button/, Card/, Badge/, Toolbar/, Sheet/, ...  # each folder: <Name>.swift, <Name>Style.swift, <Name>+Preview.swift (#Preview + #Playground)
    DSCharts/              # depends on DSCore; #if canImport(Charts)
      Theme/               # chartForegroundStyleScale from tokens, axis styles, legend
      Marks/               # DSLineChart, DSAreaChart, DSBarChart, DSDonutChart (SectorMark), DSSparkline
      Canvas/              # DSRadialGauge (Gauge or Canvas), DSRadar (Canvas + AXChartDescriptor)
      ThreeD/              # #if !os(watchOS) && !os(tvOS): Chart3D wrappers behind trait "Charts3D"
    DSGallery/             # optional: catalog app views for manual QA + agent RenderPreview; no product export needed
  Tests/
    DSTokensTests/         # swift test (macOS): parity with tokens JSON, contrast checks (WCAG AA via Color.Resolved)
    DSCoreTests/           # swift test: surface resolution rules, a11y policy, spring conversions
    DSSnapshotTests/       # xcodebuild only: iOS simulator SwiftUI snapshots; macOS NSHostingView snapshots
    DSWatchSnapshotTests/  # xcodebuild watchOS simulator: ImageRenderer-based snapshots (no glass on watch)
    __Snapshots__/         # committed PNGs, named <Component>/<variant>@<scale>.png
```

Package.swift sketch (all APIs verified in §4.2):

```swift
// swift-tools-version: 6.2
import PackageDescription
let ui: [SwiftSetting] = [.swiftLanguageMode(.v6), .defaultIsolation(MainActor.self),
                          .define("DS_GLASS", .when(platforms: [.iOS, .macOS, .macCatalyst]))]
let package = Package(
  name: "Prism",
  platforms: [.iOS(.v26), .macOS(.v26), .watchOS(.v26)],
  products: [.library(name: "DSTokens", targets: ["DSTokens"]),
             .library(name: "DSCore", targets: ["DSCore"]),
             .library(name: "DSComponents", targets: ["DSComponents"]),
             .library(name: "DSCharts", targets: ["DSCharts"])],
  traits: [.trait(name: "Charts3D", description: "Enable Chart3D wrappers")],
  dependencies: [.package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.19.4")],
  targets: [
    .target(name: "DSTokens", path: "swift/Sources/DSTokens",
            resources: [.process("Resources")], swiftSettings: [.swiftLanguageMode(.v6)]),
    .target(name: "DSCore", dependencies: ["DSTokens"], path: "swift/Sources/DSCore", swiftSettings: ui),
    .target(name: "DSComponents", dependencies: ["DSCore"], path: "swift/Sources/DSComponents", swiftSettings: ui),
    .target(name: "DSCharts", dependencies: ["DSCore"], path: "swift/Sources/DSCharts", swiftSettings: ui),
    .testTarget(name: "DSTokensTests", dependencies: ["DSTokens"], path: "swift/Tests/DSTokensTests"),
    .testTarget(name: "DSCoreTests", dependencies: ["DSCore"], path: "swift/Tests/DSCoreTests"),
    .testTarget(name: "DSSnapshotTests",
                dependencies: ["DSComponents", "DSCharts",
                               .product(name: "SnapshotTesting", package: "swift-snapshot-testing")],
                path: "swift/Tests/DSSnapshotTests", exclude: ["__Snapshots__"]),
  ])
```

Platform conditionals: prefer `#if os(watchOS)` inside DSCore/DSComponents for behavior (surface resolution, haptics, toolbar spacers) and `#if canImport(Charts)`/`#if !os(watchOS)` for `Chart3D`. SwiftPM cannot vary `sources:` per platform; keep watch-only files in `Sources/DSComponents/watchOS/` wrapped in `#if os(watchOS)` so the target still compiles on all platforms.

### 8.3 Token → Swift code generation
- Custom Style Dictionary v5.5 transforms: `color/prismSwift` (colorjs.io OKLCH→Display P3 with gamut mapping, emitting `Color(.displayP3, …)`; fall back to `hex` when the object has it and the color is out of sRGB), `size/prismCGFloat`, `motion/prismSpring` (emit `Spring(duration:bounce:)`), `typography/prismFont` (emit `Font.custom(ps, size:, relativeTo:)` for Signature and `Font.system(style, design:, weight:)` for Native). Also a custom format that writes `.xcassets/*.colorset/Contents.json` with `display-p3` values and both contrast slots (verify the JSON key for high contrast in the Asset Catalog format reference — open question §9).
- Generate a `DSTokenContext` (brand, scheme, contrast, density, modality, platform) resolver rather than baking one brand in: Swift enums keyed by the same ids as the web bundle for the CI parity report.
- Contrast test in CI on the Swift side: resolve every functional text/background pair with `Color.Resolved` (linear sRGB) → compute WCAG ratio in `DSTokensTests` under `swift test` (no simulator needed).

### 8.4 Materials policy encoded in DSCore
- `DSSurface.glass` resolves to `.glassEffect(.regular.tint(...), in: shape)` only when `dsSurfaceContext ∈ {vivid, imagery, map}`; over `.solid` it silently degrades to `.solidElevated` and logs a debug warning (HIG: "Don't use Liquid Glass in the content layer").
- Never use `.clear` without the 30–35 % dimming layer; expose it as `DSGlassStyle.clearOverMedia` that includes the dim.
- Group glass elements inside one `GlassEffectContainer(spacing:)` per screen region; reuse `glassEffectID` for morphs; pass explicit `.spring` animations to avoid the extra `matchedGeometry` scale/offset when the spec says "no bounce".
- Do not paint custom backgrounds behind system bars; rely on `scrollEdgeEffectStyle(.hard/.soft)` and `.sharedBackgroundVisibility(.hidden)` for toolbar exceptions; expose `ds.edgeEffect` as a token with a "one per view" lint.
- Elevation levels 0–3 map to solid surfaces + shadow tokens; level 3 may be glass only in the allowed contexts.

### 8.5 Accessibility handling via tokens
- `DSAccessibilityPolicy` reads the five env values and exposes derived flags: `prefersOpaqueSurfaces` (Reduce Transparency ∨ Increase Contrast), `prefersReducedMotion`, `needsNonColorCue`, `boldText`. Tokens ship alternates: `motion.*.reduced` (crossfade/opacity), `color.*.increasedContrast`, `typography.*.bold` faces.
- Bold Text: with the Signature font map `legibilityWeight == .bold` to the next heavier static face (SwiftUI does not synthesize bold).
- Dynamic Type: every Signature text style uses `Font.custom(_:size:relativeTo:)`; spacing tokens that must scale use `@ScaledMetric(relativeTo:)`. On macOS Dynamic Type does not apply — the density dimension is the macOS lever.

### 8.6 Charts
- Default to Swift Charts marks; theme via `chartForegroundStyleScale`, `chartXAxis/YAxis` styles, gradient `AreaMark` fills from `ds.dataviz` tokens; interpolation `.monotone` for time series (no overshoot).
- Sparklines: `LineMark` + hidden axes; donuts: `SectorMark(innerRadius: .ratio(0.618), angularInset: 1).cornerRadius(4)`.
- Radial gauges: `Gauge(.accessoryCircular)` first; Canvas only when the spec cannot be met, and then always attach `accessibilityChartDescriptor`.
- 3D: opt-in trait `Charts3D`, iOS/macOS only, and only where interaction is the point (Apple's guidance).
- watchOS: same DSCharts API surface, `Chart3D` unavailable, selection via `chartXSelection` (watchOS 10+).

### 8.7 Snapshot strategy (concrete)
1. **Tier 0 — `swift test` on macOS (fast, every PR):** token parity, contrast math, spring conversions, surface-resolution rules, and macOS `NSHostingView` snapshots of non-glass components (`Snapshotting<NSView, NSImage>.image`). Record with `@Suite(.snapshots(record: .missing))` locally, `.never` in CI.
2. **Tier 1 — `xcodebuild test -scheme DSSnapshotTests -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.4'`:** SwiftUI `.image(drawHierarchyInKeyWindow: true, perceptualPrecision: 0.98, layout: .fixed(width:height:), traits: UITraitCollection(...))`. Matrix per component spec: `{light, dark} × {standard, increased contrast (UITraitCollection(accessibilityContrast: .high))} × {large, accessibility3 Dynamic Type} × {compact, regular, comfortable density} × {glass allowed, reduceTransparency forced via DSAccessibilityPolicy}`. Define Prism's own `ViewImageConfig` for iPhone 17/iPad sizes (library presets stop at iPhone 13). Attach failures as Swift Testing image attachments (Xcode 26.4) so the agent can read the diff from `.xcresult`.
3. **Tier 2 — watchOS simulator via `xcodebuild`:** `ImageRenderer`-based custom `Snapshotting` (no glass on watch, so the CA-compositing limitation does not bite). Fixed sizes for 41/45/49 mm.
4. **Tier 3 — agent loop:** Xcode 26.3+/27 MCP `RenderPreview` / Preview Snapshot for iterative visual checks before committing snapshots; `#Preview` + `#Playground` blocks next to every component are the agent's entry points.
5. Naming: `__Snapshots__/<Component>/<variant-id>.png` where `<variant-id>` is the same id used in the web (Storybook/Playwright) snapshot matrix so the CI parity report can pair them.

---

## 9. Open questions

1. Does `.glassEffect()` on a custom view automatically frost under Reduce Transparency and Increase Contrast (community says yes; Apple only guarantees it for standard components)? Needs an on-device check on iOS 26.4; Prism's `DSSurface` fallback makes this non-blocking.
2. Will Xcode 27 / iOS 27 change any Liquid Glass modifiers or drop `UIDesignRequiresCompatibility`? The beta 6 release notes list no SwiftUI API removals; re-verify at GM.
3. Do offscreen `NSHostingView` snapshots on macOS render Liquid Glass/materials at all (Core Animation compositing outside a key window)? If not, macOS glass surfaces get iOS-only visual coverage.
4. Does `Font.Design.serif` resolve to New York on native (non-Catalyst) macOS? HIG says "NY is available for Mac apps built with Mac Catalyst".
5. Exact `Contents.json` schema for High-Contrast color-set slots (`"appearances": [{"appearance": "contrast", "value": "high"}]`) — verify against Xcode's Asset Catalog format reference before generating `.xcassets`.
6. `chart3DCameraProjection` availability on visionOS (docs feed lists only iOS/iPadOS/Catalyst/macOS) — irrelevant unless visionOS is added.
7. Xcode support for SwiftPM package traits (SwiftPM 6.1) in Xcode 26.x app targets — confirm before relying on a `Charts3D` trait; fallback is a separate `DSCharts3D` product.
8. Whether SF Symbols 8 (iOS 27) adds rendering-mode APIs that Prism's icon token schema should reserve fields for.
9. Style Dictionary's DTCG 2025.10 coverage is still "work in progress" — decide whether to pin 5.5.x and own the Swift color transform, or wait for a first-party `color/ColorSwiftUI` with P3.
10. Should the macOS density default be "comfortable" given no Dynamic Type on macOS — a product decision, not a technical one.

---

## Facts table (condensed)

| # | Claim | Source | Confidence | Verified |
|---|---|---|---|---|
| 1 | Xcode 26.4 ships Swift 6.3; Xcode 27 beta 6 ships Swift 6.4, Apple-silicon only | https://developer.apple.com/documentation/xcode-release-notes/xcode-26_4-release-notes ; .../xcode-27-release-notes | H | 2026-09-08 |
| 2 | `glassEffect(_ glass: Glass = .regular, in shape: some Shape = DefaultGlassEffectShape())`; default capsule; all 26 platforms incl. watchOS | https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:) | H | 2026-09-08 |
| 3 | `Glass.regular/.clear/.identity`, `tint(Color?)`, `interactive(Bool = true)` | https://developer.apple.com/documentation/swiftui/glass | H | 2026-09-08 |
| 4 | `GlassEffectContainer(spacing:)`, `glassEffectID`, `glassEffectUnion`, `glassEffectTransition` (.identity/.matchedGeometry/.materialize) | https://developer.apple.com/documentation/swiftui/glasseffectcontainer ; .../glasseffecttransition | H | 2026-09-08 |
| 5 | `backgroundExtensionEffect()` mirrors + blurs into safe areas; clips; use sparingly | https://developer.apple.com/documentation/SwiftUI/View/backgroundExtensionEffect() | H | 2026-09-08 |
| 6 | `scrollEdgeEffectStyle(_:for:)` with `.automatic/.hard/.soft`; `scrollEdgeEffectHidden` | https://developer.apple.com/documentation/swiftui/scrolledgeeffectstyle | H | 2026-09-08 |
| 7 | `.buttonStyle(.glass)` / `.glassProminent` on all 26 platforms | https://developer.apple.com/documentation/swiftui/primitivebuttonstyle/glass | H | 2026-09-08 |
| 8 | `ToolbarSpacer`, `sharedBackgroundVisibility`, `tabViewBottomAccessory` are not on watchOS | https://developer.apple.com/documentation/swiftui/toolbarspacer ; .../view/tabviewbottomaccessory(content:) | H | 2026-09-08 |
| 9 | HIG: don't use Liquid Glass in the content layer; use sparingly; clear only over rich media with ~35 % dim | https://developer.apple.com/design/human-interface-guidelines/materials | H | 2026-09-08 |
| 10 | watchOS: "Liquid Glass changes are minimal"; adopt standard toolbar/button styles | https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass | H | 2026-09-08 |
| 11 | Reduce Transparency env is get-only; backgrounds should be opaque | https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducetransparency | H | 2026-09-08 |
| 12 | `legibilityWeight` and `dynamicTypeSize` are get/set; Dynamic Type has no effect on macOS | https://developer.apple.com/documentation/swiftui/environmentvalues/dynamictypesize | H | 2026-09-08 |
| 13 | SwiftUI doesn't synthesize bold/italic for custom fonts; PostScript name required; silent system-font fallback | https://developer.apple.com/documentation/swiftui/applying-custom-fonts-to-text | H | 2026-09-08 |
| 14 | `CTFontManagerRegisterFontsForURL` (watchOS 2+) / `CTFontManagerRegisterFontURLs` (watchOS 6+) register package fonts; `UIAppFonts` is app-bundle only | https://developer.apple.com/documentation/coretext/ctfontmanagerregisterfonturls(_:_:_:_:) | H | 2026-09-08 |
| 15 | `Bundle.module` + `.process/.copy` resources | https://developer.apple.com/documentation/xcode/bundling-resources-with-a-swift-package | H | 2026-09-08 |
| 16 | Swift Charts marks (iOS 16/watchOS 9), SectorMark (17/10), vectorized plots + function plotting (18/11) | https://developer.apple.com/documentation/charts | H | 2026-09-08 |
| 17 | `Chart3D`/`SurfacePlot` iOS/iPadOS/Catalyst/macOS/visionOS 26 only — no watchOS/tvOS | https://developer.apple.com/documentation/charts/chart3d | H | 2026-09-08 |
| 18 | Selection/scroll modifiers iOS 17 / watchOS 10 | https://developer.apple.com/documentation/swiftui/view/chartxselection(value:) | H | 2026-09-08 |
| 19 | Swift Charts are VoiceOver + Audio Graph accessible by default; `accessibilityChartDescriptor` for custom views | https://wwdcnotes.com/documentation/wwdc22-10136-hello-swift-charts/ ; https://developer.apple.com/documentation/swiftui/view/accessibilitychartdescriptor(_:) | M / H | 2026-09-08 |
| 20 | Package.swift must be at the package (repository) root | https://github.com/swiftlang/swift-package-manager/blob/main/Sources/PackageManagerDocs/Documentation.docc/CreatingSwiftPackage.md | H | 2026-09-08 |
| 21 | `.iOS(.v26)`, `.macOS(.v26)`, `.watchOS(.v26)` exist; `defaultIsolation(MainActor.self)` is PackageDescription 6.2; traits 6.1 and must be additive | https://developer.apple.com/documentation/packagedescription/swiftsetting/defaultisolation(_:_:) ; .../trait | H | 2026-09-08 |
| 22 | swift-snapshot-testing 1.19.4 (2026-07-28); Swift Testing attachments since 1.19.0; SwiftUI strategy iOS/tvOS only; presets stop at iPhone 13 | https://github.com/pointfreeco/swift-snapshot-testing/releases ; repo sources | H | 2026-09-08 |
| 23 | `swift test` runs on host; iOS/tvOS snapshot runs need `xcodebuild test -destination` | swift-snapshot-testing Makefile / ci.yml | H | 2026-09-08 |
| 24 | `ImageRenderer` renders placeholders for CA-composited views (materials, most controls) | https://developer.apple.com/documentation/swiftui/imagerenderer | H | 2026-09-08 |
| 25 | `#Playground` macro (Xcode 26); `#Preview(arguments:)` grids and Preview Snapshot MCP tool (Xcode 27 beta) | https://developer.apple.com/documentation/xcode/running-code-snippets-using-the-playground-macro ; Xcode 27 notes | H | 2026-09-08 |
| 26 | `Color(.displayP3, red:green:blue:opacity:)`; literal colors don't adapt; asset-catalog colors adapt to scheme/contrast | https://developer.apple.com/documentation/swiftui/color/init(_:red:green:blue:opacity:) | H | 2026-09-08 |
| 27 | DTCG Color Module 2025.10: colorSpace/components/alpha/hex; 14 spaces | https://www.designtokens.org/TR/drafts/color/ | H (draft page) | 2026-09-08 |
| 28 | Style Dictionary 5.3.0 handles DTCG color objects, oklch/p3 CSS transforms, hex fallback; latest 5.5.3; `color/ColorSwiftUI` is sRGB-only | https://github.com/style-dictionary/style-dictionary/blob/main/CHANGELOG.md ; https://styledictionary.com/reference/hooks/transforms/predefined/ | H | 2026-09-08 |
| 29 | `Font.Design` default/monospaced/rounded/serif; HIG: `.serif` = New York; don't embed system fonts; SF/NY cover Cyrillic | https://developer.apple.com/design/human-interface-guidelines/typography ; https://developer.apple.com/fonts/ | H | 2026-09-08 |
| 30 | Apple font download license: mock-ups only, no embedding, Apple OS only | https://developer.apple.com/fonts/ | H | 2026-09-08 |
| 31 | SF Symbols: Apple-OS UIs only; no icons/logos; 9 weights = SF weights; SF Symbols 7 Draw/Variable Draw/gradient; APIs `DrawOnSymbolEffect`, `symbolVariableValueMode`, `symbolColorRenderingMode` (26) | https://developer.apple.com/design/human-interface-guidelines/sf-symbols ; https://developer.apple.com/documentation/symbols/drawonsymboleffect ; https://developer.apple.com/forums/thread/739523 | H / M | 2026-09-08 |
| 32 | `SensoryFeedback` per-platform playback matrix (start/stop watch-only, levelChange macOS-only, etc.) | https://developer.apple.com/documentation/swiftui/sensoryfeedback | H | 2026-09-08 |
| 33 | `WKInterfaceDevice.play(_:)` constraints (100 ms, background, HealthKit HR) | https://developer.apple.com/documentation/watchkit/wkinterfacedevice/play(_:) | H | 2026-09-08 |
| 34 | `spring(duration:bounce:blendDuration:)`, `.smooth/.snappy/.bouncy` (bounce 0/0.15/0.3), `Spring` conversions | https://developer.apple.com/documentation/swiftui/spring | H | 2026-09-08 |
| 35 | `Transaction.animation/disablesAnimations`; apply `.transaction` on leaf views | https://developer.apple.com/documentation/swiftui/view/transaction(_:) | H | 2026-09-08 |
| 36 | iOS 26.1 user setting Clear vs Tinted glass | https://www.engadget.com/mobile/smartphones/how-to-adjust-the-liquid-glass-effect-in-ios-261-203634681.html | M | 2026-09-08 |
| 37 | `.glassEffect()` frosts automatically under Reduce Transparency | https://getskyscraper.com/blog/apple-liquid-glass-ios-26-swiftui-guide | L | unverified |
| 38 | Xcode 26.3 exposes MCP tools incl. `RenderPreview` | https://developer.apple.com/documentation/xcode-release-notes/xcode-26_3-release-notes ; https://rudrank.com/exploring-xcode-using-mcp-tools-cursor-external-clients | H (MCP) / M (tool names) | 2026-09-08 |
