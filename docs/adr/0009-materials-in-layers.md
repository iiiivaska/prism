# ADR-0009: Materials in layers — native chrome, solid / vivid / glass content

- Status: accepted (decisions 2, 3 and 5 and rule 1's web glass owner amended by [ADR-0022](0022-materials-and-fallbacks.md): glass recipes are typed tokens and an unset vivid uses `gradient.vivid.default`; on watchOS glass renders the opaque raised fallback, not solid; the fallback is `raised` painted over `bg.page`, opaque, chosen by Surface from Prism's context, and a selected glass surface renders `inverse`; on the web the "theme package" of rule 1 is the Surface module, the React `Surface` and its stylesheet)
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #9

## Context

The references rely on three surface types: plain cards, vivid gradient "hero" cards, and frosted glass over maps or photos (most of the dark ops dashboards). On OS 26 Apple ships Liquid Glass, and the Human Interface Guidelines are explicit about where it belongs.

Verified facts (2026-09-08, `docs/research/arch-apple.md`):

- SwiftUI API: `glassEffect(_ glass: Glass = .regular, in shape:)` with `Glass.regular`, `.clear`, `.identity`, `.tint(_:)`, `.interactive()`; `GlassEffectContainer(spacing:)`; `glassEffectID`, `glassEffectUnion`, `glassEffectTransition` (`.identity`, `.matchedGeometry`, `.materialize`); `.buttonStyle(.glass)` / `.glassProminent`; `backgroundExtensionEffect()`; `scrollEdgeEffectStyle(.hard | .soft)`; concentric corners via `containerShape` and `ConcentricRectangle`. All available on iOS, iPadOS, macOS and watchOS 26; `ToolbarSpacer`, `sharedBackgroundVisibility` and `tabViewBottomAccessory` are not on watchOS.
- HIG: "Don't use Liquid Glass in the content layer"; "Use Liquid Glass effects sparingly"; "Only use clear Liquid Glass for components that appear over visually rich backgrounds", with a ~35 % dimming layer under clear glass over bright content; "avoid stacking glass on glass"; "do not mix the variants"; tint only to emphasize primary elements. Too many effects outside containers degrade performance.
- watchOS: "Liquid Glass changes are minimal in watchOS"; adopt standard button and toolbar styles.
- `accessibilityReduceTransparency` and `colorSchemeContrast` are read-only environment values; Apple guarantees adaptation only for standard components, so custom glass needs its own fallback. iOS 26.1 added a user-facing Clear/Tinted glass preference.
- `ImageRenderer` cannot rasterize materials; glass snapshots need a simulator run.

## Decision

1. **System chrome is native.** Navigation bars, tab bars, toolbars, sheets and floating controls use Liquid Glass through standard SwiftUI styles on Apple; on the web the equivalent chrome uses a CSS glass imitation (`backdrop-filter`) that is accepted as visually different.
2. **Content uses three Prism surfaces**, resolved by `DSCore`/the web theme from tokens:
   - `surface.solid` — `sys.color.bg.surface` with `elevation.0…3` shadows;
   - `surface.vivid` — a tokenized brand gradient (`sys.gradient.vivid.n`) with a subtle inner top highlight; text uses `color.text.on-vivid`;
   - `surface.glass` — `.glassEffect(.regular.tint(...), in: shape)` on Apple, `material.glass.regular|clear` on web (fill alpha, blur radius, specular edge, optional noise).
3. **The glass rule**: `surface.glass` is permitted only when the surface context is `vivid`, `image` or `map`; over `solid` it silently resolves to `surface.raised` and logs in debug. Never glass on glass. Never `.clear` without the dimming layer (exposed as one style, `glass.clearOverMedia`). **No blur on watchOS**: every glass surface resolves to solid there.
4. **Elevation has four levels** (0 flat, 1 card, 2 floating, 3 overlay) as shadow composites per scheme; level 3 may be glass only in the allowed contexts.
5. **Accessibility**: under Reduce Transparency or Increase Contrast every glass surface resolves to `surface.raised`; motion on glass transitions passes explicit springs to avoid the extra scale/offset of `matchedGeometry` when the spec says no bounce.
6. **Containers**: glass elements in one screen region share a `GlassEffectContainer(spacing:)`; specs name the container when a component is meant to morph.

## Alternatives considered

- **Strictly HIG (glass only in chrome)**: cheap and native, but the glass-card-over-map pattern that defines the references becomes impossible.
- **A fully custom material system ignoring Liquid Glass**: reproduces the references, but two kinds of glass on one Apple screen look wrong, and blur everywhere kills watch and low-end web performance.

## Consequences

- The surface context must be known to a component; `Card` passes it down (`dsSurfaceContext` environment on Apple, a data attribute / context on web).
- Web glass is a token recipe, not a Liquid Glass clone; snapshots are compared within a platform, not across.
- The direction board must show all three surfaces in both schemes, since this is where "beautiful" is decided.

## Rules that follow

1. No `glassEffect`, `backdrop-filter` or `Material` outside `DSCore`/the theme package; components ask for `surface.glass` and let the theme decide.
2. One scroll-edge effect per view; never a custom background behind system bars.
3. A component that draws on glass must declare the fallback appearance in its spec `accessibility.reduceTransparency`.
