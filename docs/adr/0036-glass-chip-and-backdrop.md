# ADR-0036: The glass chip is a shape of the Surface module, and Backdrop declares the page over media

- Status: accepted
- Date: 2026-09-23
- Decision record entry: docs/decisions.md #36
- Amends: ADR-0022 (rule 1; rule 2 and its "Checked by"; §1.3's last bullet; the sentence of §1.6 that keeps the fallback "inside Surface"; §3.1's chips bullet), ADR-0025 (the decision's first sentence and rule 1), ADR-0029 (§1.5's third bullet)

## Context

Wave 1b is Avatar and Chip (roadmap P4-7, P4-8). Both bind the role recipe `material.glass.chip` field by field: its fill, `blur`, `saturate`, `edge.start` and `edge.end`, in five cells of `root.background` and its sibling properties: `page.map`, `page.image`, `page.vivid`, `vivid` and `glass` (the `tokens` blocks of `spec/components/Avatar.yaml` and `Chip.yaml`). They need two things that do not exist. First, something other than a Surface has to draw that recipe (P4-5). Second, a component has to learn which ground it sits on without a Surface being painted under it (P4-6). The roadmap holds both as shared tickets so that neither is decided inside a component. Seven more unimplemented specs bind the same recipe: SegmentedControl, Select, TextField (and SearchField through it), Toolbar, TabBar and TopBar. Whatever wave 1b decides, they inherit.

### What the repository does at `aee9652`

- **Only Surface draws glass.**
  - DSCore's `DSSurface.resolve` (`swift/Sources/DSCore/DSSurface.swift:365-420`) picks the recipe `.fill` or `.lightFill`, never `.chip`. The drawing is the internal `DSSurfaceLayers` in DSComponents. Its `private func backdropMirror` (`swift/Sources/DSComponents/Surface/DSSurfaceLayers.swift:117-138`) redraws the backdrop view under the shape, then saturates and blurs it. `DSGlassAppearance.chip.recipe(_:)` already builds the chip's values in public, with no fallback logic.
  - On the web, `resolveSurface` (`web/packages/react/src/surface/resolve.ts:95-116`) knows only the recipes `fill` and `lightFill`. `Surface.css:120-137` holds the package's two `backdrop-filter` declarations.
- **The fallback lives only in Surface's resolver.** No token file writes a material fallback (ADR-0022 §1.4), so `material.glass.chip` has the same value under Reduce Transparency and Increase Contrast as without them. A chip drawn outside a glass Surface falls back only if some code decides that it does.
- **The guards are narrower than ADR-0022 says.**
  - **Web.** The one check is a regex in `web/packages/react/test/stylesheet.test.ts:45-48`. It runs over the text of every `.css` file under `src`, comments included, and exempts the path suffix `surface/Surface.css`. It has no failing fixture and never sees TSX. ADR-0022 rule 2 names a `lint:literals` web rule as a check, but that rule was never written. `tools/lint/literals.ts:23-26` says it "joins the table in P3-4", and its two fixtures (`tools/lint/fixtures/material/{hit,miss}/web/packages/react/src/surface.css`) are identical placeholders.
  - **Apple.** The `material` kind bans `glassEffect`, SwiftUI `Material` and the two OS accessibility keys outside DSCore. Nothing stops a DSComponents file from reading `dsBackdropSource`, applying `.saturation`, building `DSGlassAppearance.chip.recipe` or comparing `DSTokenContext.transparency`.
- **The surface context has one writer on each stack.**
  - **Apple.** `DSSurfaceView` at `DSSurfaceView.swift:111` is the only call in the repository. The setter behind it is public: `View.dsSurfaceContext(_:)` and `EnvironmentValues.dsSurfaceContext` (`swift/Sources/DSCore/DSEnvironment.swift:76-79`, `:111-114`). So an app can already publish any material without painting it.
  - **Web.** `Surface` is the only provider, and the `SurfaceContext` object is not exported. `index.ts:61-65` says why: "Only Surface resolves and publishes a material (ADR-0022 rule 1), so the context itself and the resolver stay inside the package." Surface increments `depth`, and the concentric rule reads its parity (`Surface.css:250-264`).
  - **Pixels on Apple.** `public func dsBackdrop(_:)` (`DSBackdrop.swift:55-57`) hands a backdrop's pixels to the glass inside it and publishes no kind. The kind comes from a Surface's `backdrop:` argument, and nothing ties the two together.
- **No implemented reader tells `page` over media from the plain page.** Each treats `page` as the solid family whatever its backdrop, and reads the backdrop only on `glass`: `DSSurfaceContext.colorToken(for:)`, `DSGlyphTone.color(on:)`, `foregroundOf`, `Icon.css`, Divider, Button and IconButton. Badge reads nothing, and Surface and Card republish their own context. Among the implemented specs, only Surface and Card have `surface: map` or `surface: image` examples.
- **None of the four harnesses publishes anything on a map or image ground.**
  - The web gallery and the web showcase wrap such an example in a local `Backdrop` `<div>` (`web/apps/gallery/src/harness/examples.tsx:66-84`, `web/apps/showcase/src/harness/renderers.tsx:60-78`). Both import the built package, so they can publish only through a public export.
  - `DSExampleStage` in DSComponents (`:76-79`, which the snapshot suite inherits) and the Apple showcase's public copy (`DSExampleStage.swift:151-152`) call `.dsBackdrop { … }`, which supplies pixels only.
  - So `Chip/on-map` reaches `(page, none)`, the solid cell, on all four harnesses. The same happens to every web app that puts a Chip over its own map.
- **The specs disagree about who applies the chip's fallback.**
  - TabBar (`:81`), Toolbar (`:127`) and TopBar (`:152`) say the choice is made "inside Prism's Surface module", which "is the only code that reads Prism's contrast and transparency context", and that the component "reads neither setting".
  - Avatar and Chip say the chip "resolves with its Surface to the opaque raised fallback" (`Avatar.yaml:179`, `Chip.yaml:231`). That is true only on the `glass` cell: on the `page.*` and `vivid` cells there is no glass Surface to fall back. Neither spec mentions Increase Contrast.
  - Their default cell, `color.bg.surface.raised`, is white at α 0.09 in dark. Without `color.bg.page` under it, the fallback is see-through over a map (ADR-0030 rule 6). Only TabBar binds that underlay (`fallbackUnderlay`, `TabBar.yaml:59-60`).
  - TopBar is the only spec whose bound fallback is not `raised`: it binds `color.bg.page` with a hairline rule.
- **`hasGlass` means "sits inside a glass Surface".** `DSExample.hasGlass` (`DSExampleStage.swift:17-19`) decides whether the snapshot matrix adds the forced Reduce Transparency variants. The binding tests of Icon, Divider, Badge and IconButton pin it to `row.surface?.isGlass`. Avatar and Chip draw glass in `on-map`, `selected-on-map`, `ringed-over-map` and `on-vivid`, where no glass Surface exists.

### Facts verified for this ADR

The probes ran outside the repository, in the session scratch directory, with Playwright 1.63 and Chromium 153.0.8010.12, the engine the web VRT photographs in.

| # | Fact | Evidence |
|---|------|----------|
| F1 | A `backdrop-filter` blur reads only the backdrop inside the element's own box. Take a 40 × 32 box with `blur(20px)` over black, its edge 10 px from a white field: every column reads 0/255. | probe `edge.cjs` |
| F2 | Past the box's edges, Chromium mirrors what lies inside the box. Setup: a 200 px box over black, with a 4 px white stripe 2 px inside its leading edge, and `blur(10px)`. Chromium reads 75, 75, 74, 72, 69, 67, 63, 60 in the first eight columns. A reflection model gives 75, 74, 73, 71, 69, 66, 63, 59. A clamp model gives 38 to 40. Renormalised transparency gives 73, 70, 67, 64, 60, 57, 53, 49. | probe `edgemode.cjs` |
| F3 | An element with `backdrop-filter` is a backdrop root. A descendant's `backdrop-filter: invert(1)` inside it inverts only the parent's own paint. Under a parent with `isolation: isolate`, or a plain positioned parent, the descendant inverts the page. | probe `backdrop-root.cjs` |
| F4 | An ancestor with `opacity` below 1 (0.999 or 0.5) cuts a descendant's backdrop filter entirely. None of these cuts it: the element's own `opacity: 0.5`, which fades the filtered result; the element's own `scale: 0.97`; an ancestor's `transform: scale(0.97)`. | probes `root2.cjs`, `ownopacity.cjs` |
| F5 | WebKit 26.6 and Firefox 155, headless in the same Playwright, drew no backdrop filter at all, even with no wrapper. F1 to F4 are unverified in both. | probe `backdrop-root.cjs` |
| F6 | Apple's mirror samples 3σ past the shape (`DSSurfaceAppearance.blurBleed`). Its comment says that is "as `backdrop-filter` does" (`DSSurfaceLayers.swift:117-122`), which F1 contradicts. The chip recipe has σ 20, so the band is 60 pt on every side of a 32 pt pill. An Apple chip would average a region several times its own size, and a web chip only its own box. | code, F1 |
| F7 | A glass Surface hands its children the backdrop it was given, not its own paint (`publishes: !resolution.material.isGlass`, `DSSurfaceView.swift:112`, `:149-164`). A chip mirroring inside it would blur the raw map a second time. In Chromium (F3), the same chip blurs only the Surface's own paint. | code, F3 |
| F8 | The blur strengths already agree between the stacks: `DSBlur.radius(cssStandardDeviation:)` divides the token by the measured 0.90 (`DSBlur.swift:17-23`). | code |
| F9 | The chip recipe, in both schemes: blur `ref.blur.chip` = 20, `saturate` 1, `grain` 0, `bloom` 0. The fill is white α 0.25 in light and `ref.color.smoke.dark` α 0.35 in dark. `radius.chip` and `radius.control` are both 999. | `tokens/sys/color/{light,dark}.tokens.json` |

### The designs weighed

Three designs were written against these facts. Three independent reviews scored each on parity, public API, ADR integrity, fit for the later hosts, and risk. The highest scorer in all three reviews: the chip as a shape of the Surface module, with Backdrop as the one paint-free publisher. A close second: a Backdrop-first design that hands the chip's resolution back to its host. Last: a new glass module, with Surface rebuilt on top of it. This decision is the first design plus the ideas the reviews picked from the other two where those improve it. "Alternatives considered" says which ideas and why.

## Decision

### 1. The Surface module

1. **The Surface module is the one place that resolves and draws Prism glass.** On each stack it is:
   - **Apple**: DSCore's `DSSurface` (the resolvers, in `swift/Sources/DSCore/DSSurface.swift`) and the directory `swift/Sources/DSComponents/Surface/` (the drawing, and the environment values it owns).
   - **Web**: the directory `web/packages/react/src/surface/`, which holds `Surface`, its chip shape, `Backdrop`, `resolve.ts`, `context.ts` and `Surface.css`.
2. **It has three entry points.** Nothing else publishes a surface context in public.
   - **Surface** resolves a material, paints it and publishes what it paints. It is unchanged.
   - **The chip shape** resolves and paints the part of a Prism component that binds `material.glass.chip`, and publishes the ground that part sits on (§2 to §7). It is internal on both stacks.
   - **Backdrop** paints nothing of Prism's, and publishes the page over media the app paints itself (§8). It is public on both stacks.

### 2. The chip shape

1. **Who uses it.** A component renders through the chip shape exactly one part: the one whose `background` binds `material.glass.chip` on some ground. Today that is Avatar's root and Chip's root. Later it is SegmentedControl's segments, Select's trigger, TextField's box, Toolbar's floating track, TabBar's capsule and TopBar's scroll edge.
   - A component that never binds glass paints its own fill, as Badge, Button and IconButton do.
   - StatusPill, Alert and Banner read the ground only for their page underlay, and never use the chip shape.
2. **What the component hands it.**
   - The part's background table, as a function of the ground: `glass`, `own` (the component's own cell) or `none`. These are the spec's cells for that part's `background`, and nothing more.
   - Its shape at its own radius: either the continuous rounded rectangle Button draws for a pill, or the circle IconButton draws.
   - Optionally, three more inputs:
     - an elevation, `flat` by default;
     - a gate: `content` by default, or `chrome` for bars that exist to show the page through them;
     - a publication: `ground` by default, or `raised` for bars whose items are checked on `raised`.

   The component never hands over a recipe, a glass colour, a setting or a fallback.
3. **What it draws.** It draws in the part's own box, behind the part's content, one of four renderings:
   - **Glass**:
     - the backdrop under the shape, saturated and blurred by the recipe (§5, §6);
     - the recipe's fill;
     - a 1 px inner edge in `color.edge.highlight`, from `edge.start` to `edge.end` at 135°, with the end stop at 75 %. This is Surface's edge geometry.

     Grain and bloom are never drawn. Both are 0 in every brand and scheme, and a test checks that.
   - **Fallback**:
     - `color.bg.page`, with `color.bg.surface.raised` painted over it (ADR-0022 §1.1);
     - the component's radius and elevation stay;
     - blur, saturation and the recipe's edge are dropped;
     - no `color.edge.raised` top edge: that edge is Surface's (ADR-0030 §5.2), and no chip spec binds it;
     - never `inverse`: a chip shows selection with its own cells.
   - **Own**: the component's own cell.
   - **None**: nothing.

   In every rendering, the chip shape adds no padding. It never sets or reads the concentric geometry, never hands its pixels down, and adds no depth of its own.

### 3. How a chip resolves

There is one chip resolver per stack, beside Surface's resolver: `DSSurface.resolveChip` in DSCore, and `resolveSurfaceChip` in `resolve.ts`. Its inputs:

- the component's answer for the ground (`glass`, `own` or `none`);
- the ground: the context the component reads through `ds.surface` or `useSurfaceContext()`;
- whether a glass chip encloses this one;
- the gate and the publication;
- Prism's context, plus the watch on Apple.

It resolves in these steps:

1. **Media under the chip.** The ground's media kind is:
   - the ground's backdrop, when the ground is `page`, `glass` or `glassLight`;
   - `vivid`, when the ground is `vivid`;
   - `none` otherwise.
2. **Invalid backdrop.** The backdrop is invalid when glass is asked for under the `content` gate on a ground with no media. It is logged at debug level, as Surface logs its own (ADR-0022 §1.2 trigger 4).
3. **Fallback.** The chip falls back when glass is asked for and any of these holds:
   - the platform is the watch;
   - Reduce Transparency is on (`.reduced`, or `"reduce"` on the web);
   - Increase Contrast is on (`.increased`, or `"more"` on the web);
   - the backdrop is invalid.

   **One private function per stack evaluates these four triggers for both Surface and the chip**, so the two cannot drift apart. Under the `chrome` gate the backdrop is never invalid, so only the first three triggers apply.
4. **Recipe.** When glass is asked for and there is no fallback, the recipe is `DSGlassAppearance.chip`'s (`"chip"` on the web). Otherwise there is no recipe.
5. **Blur.** The recipe blurs its backdrop, except when the ground is `glass` or `glassLight`, or when a glass chip encloses this one (§5).
6. **Underlay.** `color.bg.page` is painted under the chip exactly when it falls back.
7. **Publication** (§4). The chip publishes `(raised, none)` when it falls back, or when the component asks for `raised`. Otherwise it publishes the ground. On the web, `depth` is the parent's, unchanged.
8. **The enclosing-chip flag.** A chip tells its content "a glass chip encloses you" when it renders the recipe, or when a glass chip encloses it. `Backdrop` clears the flag. Surface neither reads nor writes it.

### 4. A chip publishes its ground, and the other parts read it

1. **`background` is the only cell a component reads from the ground.** Every other part reads the context the chip publishes: the stroke, the label, the glyphs, the ring and Chip's `status.check`. How a part reads it depends on the stack:
   - **Apple**: through the environment, which the chip sets on the content it wraps.
   - **Web**: through the chip root's `data-ds-surface` and `data-ds-backdrop` attributes, and through the React context around the root's children. The attributes carry the context the element reads, which is how Icon, Divider and Button already write them.
2. **So the fallback reaches every part by construction.** Under the fallback the parts read `raised`, so each takes its default cell: Chip's stroke returns to its hairline in `comp.chip.border.rest`, and every tone to the solid family. Chip's `status.check` shows only on a media ground, so it disappears. No component reads a setting, and no component re-keys a part by hand.
3. **Why the ground and not `glass`.** Chip and Avatar key their strokes and rings on the ground under the glass:
   - `color.border.on-media` on `page.vivid` and `vivid`;
   - `color.border.on-glass-fill` on `page.map`, `page.image` and `glass`.

   Publishing `glass` would erase that difference. Toolbar and TabBar publish `raised` instead, as their specs say, so their items take the tones `tools/contrast` checks on `raised`.

### 5. Glass inside glass does not blur

A chip can render the recipe inside other glass: on the scheme's glass, on light glass, or inside another glass chip. Such a chip draws the recipe's fill and edge, and no backdrop filter:

- Apple draws no mirror.
- The web writes `data-ds-surface-chip-flat`, which sets `backdrop-filter: none`.

Without this rule, the two stacks draw two different pictures (F3, F7). With it, they draw the same picture, and depend on no engine's backdrop-root behaviour (F5). This is ADR-0009 decision 3's "never glass on glass", read for a chip that a spec deliberately puts on glass.

The specs follow: the `glass` cells of `blur` and `saturate` leave Avatar, Chip, SegmentedControl and Toolbar. Their fill and edge cells stay. Surface itself does not change here (P4-D8).

### 6. A chip samples only what lies under it

The chip's blur reads only the backdrop under its own shape. Before blurring, it extends that crop past the shape's edges by reflection. This is what Chromium does (F1, F2).

On Apple, the mirror gains this second edge mode, beside Surface's 3σ bleed. The steps:

1. Crop the backdrop to the shape's frame.
2. Reflect the crop about each edge and each corner, until the band around the shape is 3σ wide.
3. Saturate.
4. Blur with `blur(radius:opaque: true)`.
5. Clip to the shape.

How many times the backdrop view is evaluated to build the band is left to the implementation. The check is a render test against F2's reflection model.

Surface keeps its bleed until P4-D8. Changing it moves every Apple glass Surface and Card baseline, so it needs its own decision.

### 7. How each stack spells it

#### Web

- **`resolve.ts`** (module-internal) gains the types and the resolver:
  - `surfaceChipFills` and `SurfaceChipFill` (`"glass" | "own" | "none"`);
  - `SurfaceChipGate` (`"content" | "chrome"`);
  - `SurfaceChipPublication` (`"ground" | "raised"`);
  - `SurfaceChipRendering` (`"glass" | "fallback" | "own" | "none"`);
  - `SurfaceChipResolution`, with the fields `ground`, `requested`, `rendered`, `glass: "chip" | null`, `blursBackdrop`, `isGlassFallback`, `hasInvalidBackdrop`, `paintsPage` and `published`;
  - `resolveSurfaceChip(requested, ground, { insideGlassChip, gate, publishes }, { contrast, transparency })`.
- **`context.ts`** gains `InsideGlassChipContext`, `createContext(false)`. It is internal.
- **`SurfaceChip.tsx`** is new and internal. It holds three things.
  - `useSurfaceChip(fill, { gate, publishes, elevation })`:
    - reads the ground, the flag and `useTokenContext()`, and resolves;
    - logs an invalid backdrop in development, as Surface does;
    - returns the resolution, the published context and the root props.

    The root props are `className: "ds-surface-chip"`, `data-ds-surface-chip` (the rendering), `data-ds-surface-chip-flat` (when glass renders without a filter), `data-ds-surface`, `data-ds-backdrop` and `data-ds-elevation`.
  - `SurfaceChipEdge` renders the aria-hidden `surface-chip-edge` span whenever glass renders.
  - `SurfaceChipScope` provides the published context, with the parent's depth, and the flag to the host's children.
- **The chip is its host's root.**
  - The host spreads the root props on its own root: Chip's React Aria element, or Avatar's `span`.
  - It puts `SurfaceChipEdge` first among its children, and the rest inside `SurfaceChipScope`.
  - A hit region larger than the pill is widened with `::before`, as IconButton does.
  - The host's disabled `opacity` and press `scale` go on that root, which keeps the blur (F4).
  - Nothing the host renders between the chip and the page sets `opacity`, `filter`, `mask`, `clip-path`, `mix-blend-mode` or `backdrop-filter`.
- **`Surface.css` holds the chip's rules.** They sit in `@layer ds.components`, and hold the only new `backdrop-filter` in the package:
  - **`.ds-surface-chip`**: `position: relative`, `background-color: var(--ds--surface-chip-under)` and `background-image: linear-gradient(var(--ds--surface-chip-fill), var(--ds--surface-chip-fill))`. The two fills are registered as `<color>` with `@property` and crossfaded. `backdrop-filter` is transitioned. Both use Surface's timings.
  - **`[data-ds-surface-chip="glass"]`**: the fill is `--ds-material-glass-chip`, and `backdrop-filter: blur(var(--ds-material-glass-chip-blur)) saturate(var(--ds-material-glass-chip-saturate))`. `saturate()` stays although its value is 1 today (F9), because the recipe type allows any value.
  - **`[data-ds-surface-chip="glass"][data-ds-surface-chip-flat]`**: `backdrop-filter: none`.
  - **`[data-ds-surface-chip="fallback"]`**: `color.bg.page` under `color.bg.surface.raised`, and no top edge.
  - **`[data-ds-surface-chip="own"]`**: the fill is `var(--ds--surface-chip-own)`, which the component's stylesheet sets. A component never sets the root's `background-color` or `background-image`, and never names a `--ds-material-glass-*` variable.
  - **`> [data-ds-slot="surface-chip-edge"]`**: Surface's masked 135° edge, reading `--ds-material-glass-chip-edge-start` and `-end`, with `border-radius: inherit`. It is hidden under forced colours.
  - **`[data-ds-elevation]`**: the chip's shadow, from the `elevation.*` tokens, drawn as Surface draws its own.
- **`index.ts`** exports nothing of the chip.

#### Apple

- **DSCore**, at `package` access: the same access ADR-0032 decision 5 gave `DSStrings.fill` (see also `DSStrings.swift:120`).
  - `DSSurfaceChipFill`, `DSSurfaceChipGate`, `DSSurfaceChipPublication` and `DSSurfaceChipRendering`.
  - `DSSurfaceChipResolution`, with the web's fields and `glass: DSGlassRecipe?`.
  - `DSSurface.resolveChip(_:on:insideGlassChip:gate:publishes:context:tokens:isWatch:)`, plus the `tokens: DSTokenSet` overload that `DSSurface.resolve` also has.

  `DSSurface.resolve` stays public, and its table does not change.
- **DSComponents**, internal, all under `Surface/`:
  - `DSSurfaceChipCell`: `.glass`, `.own(KeyPath<DSTokenSet, Color>)` or `.none`.
  - `View.dsSurfaceChip(_ background: @escaping (DSSurfaceContext) -> DSSurfaceChipCell, in shape: some InsettableShape, elevation: DSSurfaceElevation = .flat, gate: DSSurfaceChipGate = .content, publishes: DSSurfaceChipPublication = .ground) -> some View`. It:
    - reads `ds.surface` as the ground, the flag and `dsBackdropSource`, and resolves;
    - sets `dsSurfaceContext(published)` and the flag on the content;
    - draws `DSSurfaceChipLayers` in `.background`, hidden from accessibility and from hit testing, animated by `DSSurfaceAppearance.materialChange` keyed on the resolution, as Surface is.
  - `DSSurfaceChipLayers` draws in one `.compositingGroup()`, back to front:
    1. the page, under the fallback;
    2. the in-bounds mirror, when the recipe blurs and pixels exist (it logs in DEBUG when they do not);
    3. the fill: the recipe's fill, `bgSurfaceRaised` under the fallback, or the own cell;
    4. `DSGlassEdge`, when glass renders.
  - `DSBackdropMirror` (with an edge mode of `.bleed` or `.inBounds`) and `DSGlassEdge`, extracted verbatim from `DSSurfaceLayers`. `DSSurfaceLayers` then calls them with Surface's bleed.
  - `EnvironmentValues.dsInsideGlassChip`, beside `dsBackdropSource` in `DSBackdrop.swift`.
- **The host applies `dsSurfaceChip` to a child view that draws its other parts**, so those parts read the published context from the environment.

### 8. Backdrop: the page over media, declared

1. **Only the page can be published without paint.** Every other material names paint. Publishing `glass`, `vivid` or `accent` where nothing paints it would hand the foreground tables the wrong family. Publishing `glass` would also slip past the fallback, which Surface applies only to what it paints. The page over a kind claims nothing about paint: `page` already means "no Surface paints here".
2. **Web: `<Backdrop kind>`.**
   - It lives in `src/surface/Backdrop.tsx`: `export interface BackdropProps { readonly kind: "image" | "map" | "vivid"; readonly children?: ReactNode }` and `export function Backdrop(props: BackdropProps): ReactNode`.
   - It publishes `{ material: "page", backdrop: kind, depth: parent.depth }`, clears the enclosing-chip flag and renders no element.
   - `none` is not in the type. A reset inside a vivid or glass Surface would give its children the wrong family.
   - It joins `RENDERS_NO_ELEMENT` as a context provider, which is ADR-0019 rule 8's existing exception. It is not a spec component, and not in `implemented`.
3. **Apple: `dsBackdrop(_ kind:_:)`.**
   - The signature is `public func dsBackdrop<Backdrop: View>(_ kind: DSBackdropKind, @ViewBuilder _ backdrop: () -> Backdrop) -> some View`.
   - It draws the backdrop behind the view and hands its pixels down, as today. It also publishes `DSSurfaceContext(material: .page, backdrop: kind)` and clears the flag.
   - SwiftUI cannot read behind a view, so on Apple the declaration also supplies the pixels. For the first time, the kind and the pixels cannot be declared apart.
   - `.none` logs at debug level, publishes nothing and still hands the pixels down.
   - **The kind-less `dsBackdrop(_:)` is removed.** That leaves one verb, and no way to supply pixels without saying what they are.
4. **The raw writers become internal.**
   - `EnvironmentValues.dsSurfaceContext` becomes `public package(set)`, and `View.dsSurfaceContext(_:)` becomes `package`, as `dsStrings` already is.
   - Reading stays public on both stacks: `@Environment(\.dsSurfaceContext)`, `DSThemeValues.surface` and `useSurfaceContext`.
   - The web `SurfaceContext` object stays unexported.

   So in app code each stack has exactly two publishers: Surface and Backdrop. Some Prism composites publish a material they do not paint: Toolbar `inline` and CommandPalette publish `raised`, and TopBar at rest and the Sidebar rail publish nothing. Such a composite uses the internal writer, and on the web passes `depth` through.
5. **Nearest wins.** A Backdrop inside a Surface overrides the context for its subtree. So chips over a map the app draws inside a card read `(page, map)` and blur that map.
6. **Surface still declares its own `backdrop`.** It does not read it from the ground, so a glass Surface over a Backdrop still names its backdrop. Deriving it from the ground would mean three changes: Surface reads the context, trigger 4 becomes an ambient value, and `Surface.yaml` takes a bump. That waits until the double declaration causes a real mistake.
7. **The harnesses declare their grounds.**
   - **Web**: the gallery's and the showcase's local `Backdrop` are renamed `GalleryGround` and `ShowcaseGround`. Each wraps its children in the package's `<Backdrop kind>`.
   - **Apple**: the two stages call `.dsBackdrop(.map) { DSExampleMap() }` and `.dsBackdrop(.image) { DSExampleImage() }`. The snapshot suite inherits the DSComponents stage.

### 9. The specs say it once

1. **Every spec part whose `background` binds `material.glass.chip` states its fallback.**
   - It binds `fallbackBackground: color.bg.surface.raised` and `fallbackUnderlay: color.bg.page`, TabBar's vocabulary. Where the background is keyed, these are keyed the same way (Toolbar's `floating`).
   - Its `accessibility.reduceTransparency` names both Reduce Transparency and Increase Contrast. It says three things: Prism's Surface module draws the part as `color.bg.surface.raised` over `color.bg.page` at the same radius; blur, saturation and the edge are dropped; the part publishes `raised`, so every part takes its default cell. Chip's also says the chip drops `status.check`.
2. **The `glass` cells of `blur` and `saturate` are removed** from Avatar, Chip, SegmentedControl and Toolbar (§5).
3. **The specs' prose follows.**
   - In TabBar, Toolbar and TopBar, "DSCore's DSSurface on Apple, the React Surface and its stylesheet on the web" becomes "Prism's Surface module (ADR-0036 §1)".
   - In Avatar, Chip, Select, TextField and SearchField, "resolves with its Surface" is rewritten by item 1.
4. **These are in-place edits.** No stack implements any of these specs, so `spec/SCHEMA.md`'s versioning rules leave `specVersion` where it is.
5. **TopBar is the one exception.** Its scroll edge binds `color.bg.page` with a hairline rule as its fallback, not `raised`. It is recorded here and not decided (P4-D10).

### 10. The guards

Checks hold the rules above, not prose:

- **`lint:literals` kind `material` gains five rules.** Each has a real hit fixture and a real miss fixture, and the two placeholder fixtures go.
  - `material/swift-backdrop-pixels`: `DSBackdropSource`, `dsBackdropSource`, `DSGlassAppearance`, `DSGlassRecipe`, `.saturation(` and `blurRadius`, outside `swift/Sources/DSCore/` and `swift/Sources/DSComponents/Surface/`.
  - `material/swift-transparency-read`: a comparison with `.transparency`, outside DSCore.
  - `material/web-backdrop-filter`: `backdrop-filter`, `backdropFilter` and `WebkitBackdropFilter`, in CSS and script under `web/packages/*/src`, outside `web/packages/react/src/surface/`.
  - `material/web-glass-recipe`: any `--ds-material-glass-*` name other than the scrim, in the same scope.
  - `material/web-transparency-read`: a comparison with `transparency`, in the same scope.

  None of the five has a hit today outside its exemption. The header of `literals.ts` and its `material` guidance are rewritten to say what the kind checks.
- **The stylesheet test's regex becomes two declaration-level checks** over parsed CSS with comments stripped. Each has a failing fixture.
  - Only `surface/Surface.css` declares `backdrop-filter` (or `-webkit-backdrop-filter`), and only on four selectors:
    - `.ds-surface[data-ds-material="glass"]`;
    - `.ds-surface[data-ds-material="glassLight"]`;
    - `.ds-surface-chip[data-ds-surface-chip="glass"]`;
    - `.ds-surface-chip[data-ds-surface-chip="glass"][data-ds-surface-chip-flat]`.
  - No stylesheet outside `surface/` names a glass recipe variable.
- **`spec:validate` gains two corpus rules**, each with a fixture:
  - `glass-chip/fallback` checks §9.1. TopBar's scroll edge is its one named exception, citing P4-D10.
  - `glass-chip/nested-blur` checks that no spec binds `blur` or `saturate` of the recipe under a `glass` or `glassLight` key.
- **Access control holds the rest on Apple.** Every chip type is `package` or internal, and so is the context setter.

## Alternatives considered

- **Chip renders a public `<Surface material="glass" radius="pill">`.** This is the literal reading of P4-5's second option. It fails five ways:
  - a Surface publishes `glass`, so the `page.vivid` and `vivid` stroke cells are lost;
  - the concentric rule squares a pill inside a padded card (`Surface.css:250-264`, `DSSurfaceAppearance.radius`);
  - the `raised` fallback draws its top edge;
  - a selected chip turns `inverse`;
  - the web Surface is a padded, depth-counting `div`, which cannot be the pill inside a `<button>`.

  What survives of it is what the chip shape shares with Surface: the resolver file, the drawer and the stylesheet.
- **One glass module under Surface: `DSCore/Glass` and `src/glass/`, with Surface rebuilt on it.** This is the most general design. It is also the only one whose Apple guard is access control, because `DSBackdropSource` would be internal to DSCore. It lost on four counts:
  - **Blast radius.** It rebuilds Surface on both stacks and renames Surface's web parts. Every glass baseline would depend on re-plumbing byte for byte: the largest risk of the three designs.
  - **Public API with no use.** It makes three DSCore types public (`DSGlass`, `DSGlassGate`, `DSGlassResolution`) that no app can draw with, because the drawer is `package`.
  - **A contract that breaks silently.** Its web module is a class plus a written rule: the host paints its own fill and must leave `background-color` alone. A host can break that without any check failing.
  - **Hand-keyed parts.** Its hosts key their parts on the module's answer by hand. A host that forgets draws glass tones on an opaque fill.

  It also leaves F6's 3σ bleed as it is. Taken from it: the typed gate; the ban on recipe variables outside the module; the fallback cells stated in every spec, with a corpus check; and landing Backdrop first. Its access-control guard is the upgrade if §10's lint fence proves leaky.
- **Backdrop first, with the chip's resolution handed back to its host.** Here `DSSurface.resolveGlassChip`, a `dsGlassChip` modifier and a `useGlassChip` hook publish nothing. It lost narrowly, for four reasons:
  - Each host keys its own parts on the published ground in the resolution. So the fallback reaches a part only if its host remembers, and Chip has to wrap its Avatar slot in `raised` by hand.
  - The resolver's media gate and each host's matrix are two sources of truth, held together only by an inclusion test.
  - Chips keep Surface's 3σ bleed, so at 32 pt a chip over a map differs between the stacks (F6).
  - Its web `Backdrop` accepts `none`.

  Taken from it:
  - on the web, the chip on its host's own root, rather than an inner `span.ds-surface`;
  - a dedicated class, rather than `.ds-surface` with five opt-outs;
  - the verbatim extraction, with "duplicate, never re-record" as the fallback;
  - the kind-required `dsBackdrop`, with the kind-less form removed;
  - the declaration-level stylesheet test, with pinned selectors;
  - the Apple pixel fence;
  - glass-on-glass read from the ground's material, rather than from a flag Surface writes;
  - Avatar's `initials-over-map` example.
- **The chip as an inner `span.ds-surface[data-ds-shape="chip"]` inside the web host**, as the first design had it. Two problems:
  - It inherits `.ds-surface`'s padding, depth, concentric radius, top edge and grain variable, and has to switch each one off. Every later edit to Surface's rules would reach chips.
  - The host's disabled opacity sits on the `<button>` around the pill, so it would cut the pill's blur (F4). Chip would have to dim a child instead of itself, unlike IconButton.
- **The component applies the fallback itself**, reading `transparency`, as the wave-1 plans had it (Avatar defect B, Chip B-4). This contradicts ADR-0022 §1.3 and §1.6, ADR-0025 rule 1, and the three specs that already say the component "reads neither setting". And each of nine hosts would own a copy of the triggers.
- **Widen the guards to a named list of components** (P4-5's first option). Every new host would be a guard edit and one more place to decide the fallback: nine hosts, nine decisions.
- **A chip keeps Surface's 3σ bleed.** It saves one edge mode, and is wrong against the engine the web baselines are taken in (F1, F2).
- **A chip on glass blurs whatever its engine gives it.** Apple would blur the raw map a second time (F7), and Chromium only the Surface's paint (F3). That is two pictures of one example, with WebKit and Firefox unknown (F5).
- **The glass-in-glass rule for Surface too, now.** No example nests glass, so no baseline would move. But Surface would start reading its parent's material, which is a `Surface.yaml` behaviour change. That means a `specVersion` bump on both implemented stacks, and that bump must also take the owed `selected` → `isSelected` rename (P4-D3). It goes with Surface's edge sampling, in P4-D8.
- **A fallback cell of the component's own choosing**, to fit TopBar's page-plus-hairline. ADR-0022 §1.1 gives glass one fallback, and every other chip spec already describes `raised`. A second answer would bring back C-26's problem. TopBar decides in its own ticket.
- **Publishing without painting through a Surface mode** (`paint={false}`, or a transparent `page`). This would be a Surface prop, so a `Surface.yaml` bump on both stacks. A Surface also increments `depth`. And one component would both resolve-and-paint and merely declare.
- **Exporting the web `SurfaceContext`, or keeping Apple's public setter.** Either lets any material be published without paint, including `glass` under Reduce Transparency over an opaque region, which the fallback never sees. ADR-0034 decision 5 is the precedent: a context that only Prism's components need stays internal, and the public API is the components. The raw object would also slip past the export test, which checks function exports only.
- **A glass-ancestor flag that Surface writes**, as the first design had it. Surface would change for a case the ground's material already answers. The flag is needed only for a chip inside a chip, so only the chip writes it.
- **Keep the kind-less `dsBackdrop(_:)`, or deprecate it for a release.** No caller outside the repository is known, and all nine callers are migrated in one change. Keeping it keeps a way to supply pixels without a kind. Prism is 0.x, and the changeset declares the break.

## Consequences

### Public API

| | Web (`@iiiivaska/prism-react`) | Apple |
|---|---|---|
| Added | `Backdrop`, `BackdropProps` | `dsBackdrop(_ kind:_:)` |
| Removed | — | the kind-less `dsBackdrop(_:)` |
| Narrowed | — (the provider was never public) | `View.dsSurfaceContext(_:)` → `package`; `EnvironmentValues.dsSurfaceContext` → `public package(set)` |
| Unchanged | `useSurfaceContext`, `SurfaceContextValue`, `Surface` | `DSSurface.resolve`, `DSSurfaceContext`, `DSGlassAppearance`, `DSGlassRecipe`, `DSSurfaceView` |
| New, internal | `resolveSurfaceChip` and its types, `useSurfaceChip`, `SurfaceChipScope`, `SurfaceChipEdge`, `InsideGlassChipContext` | `package`: `DSSurface.resolveChip` and its types. Internal: `dsSurfaceChip`, `DSSurfaceChipCell`, `DSSurfaceChipLayers`, `DSBackdropMirror`, `DSGlassEdge`, `dsInsideGlassChip` |

Nothing of the chip becomes public: an app gets a glass chip by using the Prism component that draws one. P4-6's changeset is `minor`, the 0.x bump for a removed API (`.changeset/README.md`), and it names the Apple break.

### Amendments

- **ADR-0022 rule 1** now reads: "Only the Surface module resolves materials (ADR-0036 §1): a Surface through `DSSurface.resolve` / `resolveSurface`, and a component's glass chip through `DSSurface.resolveChip` / `resolveSurfaceChip`. Both apply the triggers of §1.2 through one function per stack. Surface uses the fallback exactly under §1.2 and §1.6, and a chip under ADR-0036 §3. Backdrop resolves nothing." Its checks gain:
  - `DSSurfaceChipResolutionTests` and `test/surface-chip.test.tsx`;
  - the agreement tests between the two resolvers;
  - Apple snapshots of every example that renders a glass chip, under Increase Contrast and under forced Reduce Transparency.
- **ADR-0022 rule 2** now reads: "Only DSCore names `glassEffect`, SwiftUI `Material`, `accessibilityReduceTransparency` and `colorSchemeContrast`. Only the Surface module (ADR-0036 §1) reads backdrop pixels, names a glass recipe or compares Prism's transparency context. On the web only the Surface module, `web/packages/react/src/surface/`, names `backdrop-filter` or a glass recipe variable (the scrim excepted), and no hand-written code names the preference media features or the axis attributes." Its "Checked by" becomes the four existing `material` rules plus the five new ones, all with real fixtures, and the declaration-level stylesheet test with its fixtures. "Fixtures land with P3-1 and P3-4" is struck: it was never true of the web half.
- **ADR-0022 §1.3, last bullet**: "goes through this resolution" becomes "goes through the Surface module's resolution, a chip through the chip resolver (ADR-0036 §3)".
- **ADR-0022 §1.6**: "Keeping this inside Surface" becomes "Keeping this inside the Surface module".
- **ADR-0022 §3.1, chips bullet**, gains: "A chip is drawn by the Surface module's chip shape. The shape publishes the ground the chip sits on, or `raised` under its fallback, and the chip's parts take their cells from that (ADR-0036 §4)."
- **ADR-0025**: in the decision's first sentence and in rule 1, "the React `Surface`" becomes "the React Surface module (Surface and its chip shape)". Rule 2 is unchanged: the chip's fallback is a React decision written onto `data-ds-surface-chip`, and no stylesheet uses an axis variant.
- **ADR-0029 §1.5, third bullet**, gains: "It draws it through the Surface module's chip shape (ADR-0036). On the scheme's glass it binds the recipe's fill and edge, and not its blur or saturation."
- **Read this way, and not amended**:
  - ADR-0009 decision 3 ("never glass on glass") is §5, for chips.
  - ADR-0019 rule 8's provider exception covers `Backdrop`.
  - ADR-0030 rule 6 is why the fallback paints the page.

### Baselines

- **P4-6 moves no baseline.**
  - The Apple stages now publish `(page, map)` or `(page, image)` where they published `(page, none)`, and no implemented reader draws those differently (Context). The only implemented examples on those grounds are Surface's and Card's, and both republish their own context.
  - The web `Backdrop` adds no DOM node and passes `depth` through, so `data-ds-depth`, `data-ds-nested` and the concentric radius are unchanged.
  - The Apple `dsBackdrop(kind)` draws the same background and hands down the same pixels.
  - `hasGlass` is unchanged for every existing example.
- **P4-5 moves no baseline and adds none.**
  - The extraction from `DSSurfaceLayers` must reproduce every Apple glass baseline byte for byte. That covers Surface, Card, and the `on-glass*` examples of Text, Icon, Divider, Badge and IconButton, with their Reduce Transparency and Increase Contrast variants. If the extraction cannot, the code is duplicated instead. Nothing is re-recorded.
  - The web rules are scoped to `.ds-surface-chip`, which no existing element carries.
- **P4-7 and P4-8 add baselines** for Avatar and Chip.
  - **Apple**: an example that renders a glass chip also records the four forced Reduce Transparency variants. These are the first baselines in which an accessibility setting changes content, not only colour: Chip's `status.check`.
  - **Web**: they record the usual eight variants, at standard contrast and transparency.

### What becomes harder

- **Apple redraws the backdrop once per glass chip.** `DSBackdropSource.content` is an `AnyView`, so a row of eight chips over a map means eight more renders of it, and a live MapKit map cannot be copied at all (P4-D11). Surface already pays this, once per panel.
- **Web backdrop roots cannot be linted.** An ancestor between a chip and its media that sets `opacity` below 1, `filter`, `mask`, `clip-path`, `mix-blend-mode` or `backdrop-filter` removes the blur (F4). A Popover, Sheet or Toast that fades in by opacity un-blurs the chips inside it while the fade lasts. Apple has no such cut, so the stacks differ there.
- **WebKit and Firefox are unverified** (F5). The explicit `backdrop-filter: none` of §5 at least removes Prism's dependence on backdrop-root semantics.
- **The web fallback is never photographed** (P4-D9). The VRT pins standard contrast and transparency (`web/apps/vrt/matrix.ts:80-81`). And server-rendered pages paint glass until hydration for users with Increase Contrast or Reduce Transparency, unless the app passes their choice to `<Theme>` (ADR-0025).
- **Items on a glass chip are checked on `raised`, not on the chip** (P4-D12). Toolbar's and TabBar's items take the `raised` tones because their specs choose it, and no pair composites them over `material.glass.chip`.
- **The stacks spell `own` differently.** Apple uses a `KeyPath`; the web uses a CSS variable the component owns, as Card's `surfaceFill` already does. The parity report cannot compare them mechanically, but the spec-driven binding tests on each side can.
- **`hasGlass` widens** from "sits inside a glass Surface" to "renders a glass recipe". The four existing invariants keep their form. Avatar's and Chip's become `hasGlass == surface.isGlass || the staged cell binds material.glass.chip`. `DSSnapshotMatrixTests.expectedCount` is kept by hand and grows with them.
- **Apps can put Text straight on media.** `<Backdrop kind="image">` publishes `(page, image)`, where Text takes solid-family tones that no pair checks over media. That was already true on `(page, none)` over an app's own map. `agent/SKILL.md` says text over media belongs on a glass Surface.
- **Surface's own gap stays open** (P4-D8). A web glass Surface blurs only its own box, and an Apple one 3σ past it (F6). Nested glass Surfaces still differ between the stacks (F3, F7).

### Documents that follow

With this decision:

- `docs/decisions.md` row 36, and the inline notes on rows 22 and 25;
- this index, and the status lines of ADR-0022, ADR-0025 and ADR-0029;
- the roadmap rows P4-5 to P4-8, and P4-D8 to P4-D12.

With the tickets:

- the comment in `web/packages/react/src/index.ts`;
- `agent/SKILL.md` §4;
- the doc comments of `DSEnvironment.swift` and `DSBackdrop.swift`;
- the header of `tools/lint/literals.ts`;
- the specs of §9.

## Rules that follow

1. **Only the Surface module resolves and draws Prism glass** (§1). The resolvers are DSCore's `DSSurface` and `resolve.ts`; the drawing is in `swift/Sources/DSComponents/Surface/` and `web/packages/react/src/surface/`.
   - Checked by the `material` lint rules and the stylesheet test (§10).
2. **A component draws the part that binds `material.glass.chip` through the chip shape.** It hands the shape only the part's background table and its shape, plus at most an elevation, a gate and a publication. It never builds a recipe, compares a setting or picks a fallback.
   - Checked by the lint rules and by each host's spec-driven binding tests.
   - On the web, also checked by each host's stylesheet assertion that its root sets neither `background-color` nor `background-image`.
3. **The chip resolves by §3, with the triggers Surface uses.**
   - Checked by `DSSurfaceChipResolutionTests`: 6,912 rows (fill × nine grounds × four kinds × gate × publication × enclosed × contrast × transparency × watch).
   - Checked by `test/surface-chip.test.tsx`: the same table without the watch, 3,456 rows.
   - Checked on both stacks by a test that the chip and Surface fall back together, for every setting and every kind.
4. **The chip's fallback is `color.bg.surface.raised` over `color.bg.page`**, at the component's radius and elevation. It has no blur, saturation, recipe edge or top edge, and is never `inverse`.
   - Checked by the resolution tables, the stylesheet test, and an Apple render test of the fallback's colour.
5. **Every part other than the chip's background reads the context the chip publishes.** That context is the ground, or `(raised, none)` under the fallback or on request. On the web it carries the parent's `depth`.
   - Checked on Apple by an environment probe, and on the web by a server-rendered probe.
   - Checked by each host's binding tests under forced Reduce Transparency and Increase Contrast, where every part must equal its default cell.
6. **A glass chip draws no backdrop filter on the scheme's glass, on light glass, or inside another glass chip.** No spec binds the recipe's `blur` or `saturate` under a `glass` or `glassLight` key.
   - Checked by the resolution tables, the stylesheet test and `spec:validate`'s `glass-chip/nested-blur`.
   - Checked in P4-8 by a Chromium check that a Chip inside a glass Surface computes `backdrop-filter: none`.
7. **A glass chip samples only the backdrop under its own shape, reflected at its edges.**
   - Checked on Apple by a render test against F2's reflection model. The test's tolerance must tell reflection apart from the clamp and transparency models.
8. **An app declares the page over media with `<Backdrop kind>` or `.dsBackdrop(kind) { … }`. Nothing else publishes a surface context in public.**
   - `Backdrop` publishes only `page`, passes `depth` through and renders no element.
   - `none` is not a web kind. On Apple, `.none` publishes nothing.
   - The kind-less `dsBackdrop(_:)` does not exist.
   - `SurfaceContext`, the resolvers and the chip are not exported, and the Apple setter is `package`.
   - Checked by `test/backdrop.test.tsx`, `DSBackdropTests` and the compiler.
   - Checked by `test/exports.test.tsx`: `RENDERS_NO_ELEMENT`, and an assertion that none of the internal names is exported.
9. **A Prism composite that publishes a material it does not paint uses the internal writer and passes `depth` through**, and only as its spec says.
10. **Every spec part whose background binds `material.glass.chip` states its fallback.** It binds `fallbackBackground: color.bg.surface.raised` and `fallbackUnderlay: color.bg.page`, and its `reduceTransparency` names both Reduce Transparency and Increase Contrast. TopBar's scroll edge is the one exception until P4-D10.
    - Checked by `spec:validate`'s `glass-chip/fallback`.
11. **The four harnesses stage map and image grounds through `Backdrop` and `dsBackdrop(kind)`.**
    - Checked by the Chip and Avatar binding tests, which reach the `page.map` cell only that way.
12. **An example that renders a glass recipe has `hasGlass`, and its Apple snapshots include forced Reduce Transparency.** A glass recipe means a glass Surface or a glass chip.
    - Checked by each binding test's `hasGlass` invariant and by `expectedCount`.
13. **On the web, a chip's host puts its own opacity, scale and filters on the chip's root.** Nothing Prism renders between a chip and the media under it sets `opacity` below 1, `filter`, `mask`, `clip-path`, `mix-blend-mode` or `backdrop-filter`.
    - Checked by P4-8's Chromium check that reads the pixels of a disabled Chip over a map. Computed style cannot show a cut.
14. **The extraction from `DSSurfaceLayers` moves no baseline.** If it would, the code is duplicated instead.
    - Checked by the Apple snapshot suite on the commit that lands the extraction.
