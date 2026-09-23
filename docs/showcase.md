# The showcase apps

Two runnable apps, one per stack, that show **every token and every implemented component** of the
brand the app is running — live, on the device, with the axes switched through the public API. The web
one runs in a browser; the Apple one runs on iPhone, iPad and the Mac from one target.

They are design documentation you can press. Nothing here renders a second canon: the specs stay the
contract (ADR-0006), the gallery stays the pixel canon (ADR-0005), and the showcase reads both.

## What already exists, and what these add

| Artefact | What it already gives | What it does not |
|---|---|---|
| `gallery/index.html` + `gallery/index.json` (P3-5) | 488 committed PNGs, both stacks paired by name, per scheme × density × forced state; missing pairs named as gaps | static, web-served; nothing is pressable, no real fonts or motion, **no token appears at all** |
| `web/apps/gallery` (Storybook 10, P3-4) | every spec example live, all six axes in the toolbar, a11y run per story | web only, one example at a time, a developer tool behind a build; no token catalog, no "the system at a glance" |
| `#Preview` / `#Playground` in `DSComponents/Examples` (P3-3) | the same examples live on Apple | Xcode only, one example per canvas, `internal` and `#if DEBUG` |
| `fixtures/vite-app`, `fixtures/swiftui-app` (P3-6) | that a *consumer* can install and use the packages | one screen, four components, deliberately minimal — an acceptance check, not a catalogue |
| `docs/direction-board/` (P3-0) | the signed-off design intent as hand-made HTML screens | frozen at P1-9, hand-written, no components, no enumeration |
| `tools/parity/report.md` (P2-3) | spec version vs implemented version, every component × platform | a table of numbers; shows nothing |
| `manifest.json`, `tokens.css`, `DSTokenSet`, `iconRegistry` | every value | as files |

The showcase is the only place where a token is **shown with the value the running app resolves for
it**, and where "what does Prism have today" is one screen instead of seven files.

## Where they live

| Path | What |
|---|---|
| `web/apps/showcase/` | `@iiiivaska/prism-showcase` (private): Vite + React app; `pnpm showcase`, `pnpm showcase:build`, `pnpm showcase:preview` |
| `web/apps/showcase/plugins/catalog.ts` | the Vite plugin that reads the specs, the web manifest and the published token manifest, and serves them as `virtual:prism/catalog`, `virtual:prism/tokens` and `virtual:prism/brands`. The catalogue is **built, not committed**: there is no generated file on the web side and so nothing that can be stale |
| `web/apps/showcase/plugins/glyphs.ts` | `virtual:prism/glyphs`: the registry's Phosphor cuts, read from `@phosphor-icons/core` at build time, for the Icons screen's ladder of registry data that no `Icon` prop reaches |
| `web/apps/showcase/src/harness/` | the example harness — `renderers.tsx`, `content.ts`, `harness.css` — today a copy of `web/apps/gallery/src/harness/` with its prefix changed, so that the two stage an example identically. `web/packages/examples` is what turns the copy into one file |
| `swift/Showcase/Sources/DSShowcase/` | new SwiftPM target and product `DSShowcase`: the screens, the example renderers and the three generated files |
| `swift/Showcase/Sources/DSShowcase/Generated/DSShowcaseCatalog.swift` | generated: every spec, its support row, its implemented version, its examples |
| `swift/Showcase/Sources/DSShowcase/Generated/DSShowcaseBindings.swift` | generated: one renderer per component the Apple manifests implement — the compile-time break |
| `swift/Showcase/Sources/DSShowcase/Generated/DSTokenCatalog.swift` | generated: every token, with a `KeyPath<DSTokenSet, …>` per value kind |
| `swift/Showcase/App/PrismShowcase/` | the app shell (~20 lines); the `.xcodeproj` is generated and gitignored, as `fixtures/swiftui-app` already does |
| `swift/Showcase/README.md` | how to run it, how it discovers things, and how to open a page directly |
| `tools/showcase/apple/` | the Apple catalogues, and `pnpm showcase:apple` (regenerates, writes the Xcode project, builds, installs, launches). The web catalogue needs no tool: the app's own Vite plugins build it |

## 1. Discovery

Nothing in either app holds a list of tokens or components. Both read generated artefacts.

### Tokens

**Web** reads `@iiiivaska/prism-tokens/manifest.json` — an existing published export, 564 entries, each
with `path`, `id`, `tier`, `type` (DTCG), `css`, `cssVars`, `ts`, `swift`, `asset`, `description`,
`deprecated`, `dependsOn`. Sections come from the data, never from a list in the app:

- the **section** is `tier` plus the first path segment. The `sys` tier gives, today: `color` 94,
  `material` 52, `type` 22, `space` 20, `motion` 17, `radius` 11, `size` 10, `chart` 9, `gradient` 5,
  `elevation` 4, `z` 4, `border` 3, `font` 3, `stroke` 3, `icon` 2, `interaction` 2, `opacity` 2,
  `shadow` 1. `comp` (125) is one section per component prefix; `ref` (175) is the primitive tier.
- the **specimen renderer** is picked by DTCG `type` (`color`, `dimension`, `typography`, `shadow`,
  `gradient`, `duration`, `cubicBezier`, `transition`, `number`, `fontFamily`, `strokeStyle`). A new
  group gets a section for free; only a new *type* would need a renderer.
- the **value** is read twice and shown together: `resolveTokens(readContext())` from
  `@iiiivaska/prism-tokens/tokens` (the JS table), and the painted value of `cssVar(path)` off
  `getComputedStyle`. Compare them as sRGB bytes on a 1×1 canvas, never as strings — Chromium spells
  one colour `oklch(…)` painted and `oklab(…)` mid-interpolation (`fixtures/vite-app/src/main.jsx`).
  A `typography` token has no base declaration: `css` is null and its six sub-properties are in
  `cssVars`, so the type specimen reads those and never calls `cssVar(path)`. The same treatment goes
  for a value that *contains* colours: a gradient's stops and a shadow's layers are lifted out and
  painted one by one, and what is left is compared as numbers, so `oklch(43.47% …)` painted and
  `oklch(0.4347 …)` in the table are one value and not two. Of the 389 `sys` and `comp` tokens, 364
  are comparable this way and all 364 agree; the other 25 — the 22 type roles and the 3 stroke styles
  — publish sub-properties and no single declaration, so both readings are shown and neither is
  judged. The manifest is read through the package's own `exports` map by the same Vite plugin, only
  so that its 564 entries reach TypeScript as one declared type rather than 564 inferred ones.

**Apple** has no reflection over `DSTokenSet`, whose members are typed struct fields. Two halves:

- colours and icons need nothing new: `DSColorToken` (102 cases, one per colorset), `DSIconName` (51),
  `DSIconWeight`, `DSIconStyle` and `DSIconSize` are already `public` + `CaseIterable`, with
  `rawValue`, `label`, `tags`, `symbol` and `asset` on them.
- everything else needs a generated catalogue: `DSTokenCatalog.swift`, an array of entries carrying
  `path`, `tier`, `group`, DTCG `type`, `description`, and a `KeyPath<DSTokenSet, …>` per value kind
  (`CGFloat`, `Color`, `DSTypeRole`, `DSSpringToken`, `DSGradientToken`, `DSShadowToken`, …). Every
  `sys` and `comp` token already carries its Swift member path in the manifest
  (`swift: "DSTokenSet.border.focus"`, `"DSColor.accent"`, 389 of them), so the catalogue is a string
  transform on data the build already computes. **What the manifest does not carry is the member's
  Swift *type***, and the case a key path lands in depends on it (`motion.presentation-crossfade` is a
  `Bool`, `chart.curve` a `Double`, `border.focus` a `CGFloat`). `tools/showcase/apple/swift-types.ts`
  reads it back out of `swift/Sources/DSTokens/Generated` — the same files the member path names — and
  a member it cannot find is reported, never guessed.

  This is therefore **its own generator, `tools/showcase/apple`, not a `tools/tokens` format**: it
  composes `tools/tokens`' readers and writer but owns `swift/Showcase/Sources/DSShowcase/Generated`
  itself, so `OWNED_ROOTS` and the `generated=` list in `ci.yml` are untouched and the Apple catalogue
  is checked by a Vitest test like the component one, in the same job, rather than by the token
  build's stale-output gate.

### Components and examples

Both apps enumerate from the same two things the parity report reads: the specs
(`spec/components/*.yaml`, 57 + 3 patterns) and the four implementation manifests.

Per component the catalogue carries its `name`, `layer`, `specVersion`, `status`, `since`, `summary`,
spec path, per-platform `support`, the implemented version, the platform notes the spec gives, its
props, states and behaviour, and per example its `id`, the props as the spec writes them,
`surface`/`backdrop`/`grid`, `schemes` and `description`.

On Apple, `tools/showcase/apple` writes it, composing the existing readers — `tools/parity/specs.ts`
for the specs, `tools/parity/manifest.ts` for the manifests, `tools/tokens/source/reader.ts` for the
reader, `tools/tokens/output/write.ts` for the writer and `tools/tokens/formats/swift/syntax.ts` for
Swift literals. **On the web nothing is written**: a Vite
plugin in the app (`plugins/catalog.ts`) reads the same specs and the same manifest and serves them as
`virtual:prism/catalog` while the app builds. It is a build-time read of the repository either way;
the web side just has no file in between, and so nothing to keep in step.

The mechanism that stops either app going stale is the same on both stacks: **the generated catalogue
names a symbol that does not exist yet, and the build fails until someone writes it.**

- Web: the catalogue module emits `import { renderListRowExample } from "…/src/harness/renderers.tsx"`
  for every component in the manifest, and the plugin checks the harness for each name before the
  bundler does, so `pnpm showcase:build` — which `pnpm -r build` runs — fails with *"The showcase has
  no way to stage ListRow. …must export renderListRowExample(props, example)"*. The app shell never
  changes: adding the harness entry is the whole edit, and the component's page, its spec version, its
  support row and all its examples appear with it.
- Apple: `DSShowcaseBindings.swift` maps each implemented component to `DS<Name>Renderer()`; the target
  does not compile until that renderer exists. A renderer maps the spec's own `props` onto the
  component's public API, so an example the *spec* adds is staged with no edit at all, and only a prop
  no renderer knows needs a hand. That is the compile-time registry the platform needs, and it leaves
  `DSComponents`' own `#if DEBUG` example sets, the snapshot harness and the committed baselines alone.

Writing one harness entry per component is not a new chore: the gallery's `RENDERERS` map and the
Apple `DS<Name>Examples` file are already required by P3-4 and P3-3. The showcase reads the same
entries instead of adding a second set.

**Handlers are staged, never invented.** No spec writes a closure, so a prop the spec declares as
`type: action` has no value to render — and leaving it out is not neutral: a Card with `action: open`
and no `onAction` is not pressable and draws no open glyph at all (Card.yaml behavior 4), so an
example staged without one silently diverges from the gallery baseline. Both stacks therefore supply a
no-op for every action prop the spec declares, from the spec itself: the web injects one per
`prop.type === "action"` (`sections/Components.tsx`), and the Apple catalogue emits the same names on
each example, which a renderer reads back through `DSSpecExample.handler(_:)`. A component that lands
with a new action prop gets this for free; `tools/showcase/apple/catalog.test.ts` holds the rule.

## 2. Structure

One shape, three presentations. The chrome is **not** Prism — `Sidebar`, `TabBar` and `AdaptiveShell`
are specified and unimplemented — so the frame is plain SwiftUI / plain CSS over `--ds-*` tokens, and
the app says so on its About screen. Phase 5 rebuilds the chrome from real components.

| Section | Content |
|---|---|
| Overview | brand, system version (`DSTokensInfo.version` / the tokens package's `version`), the effective context, counts: tokens by tier, components implemented / specified, icons |
| Foundations | one screen per token group, in the order above; each specimen shows the path, the value, the CSS variable or the Swift member, and the description the manifest carries. Materials are shown through `Surface` over the synthetic map and image of the example harness, because Surface is what publishes them; motion specimens replay on tap |
| Icons | the registry as data — id, label key, tags, default style — with every entry drawn by `Icon` at the size and weight picked above it; beside it the registry's weight ladder and four boxes, which reach further than `Icon`'s props, drawn from the registry's own binding and labelled as registry data (see §4). `Icon`'s spec examples are on Components |
| Components | one page per component, its examples staged exactly as the gallery stages them, plus the spec summary, its version and support row |
| About | what the chrome is, what the app reads, links to the spec, the parity report and the gallery |

**Phone** (`web-touch`, iOS): a single stack. Sections list → section → component page, back by the
platform gesture. The axis bar is a sheet from the toolbar, so it never eats the specimen's width. The
button that opens it belongs to the screen, not to the stack's root: a token group, a component page and
an example page are exactly where a reader wants to move an axis and watch a value move, so `DSScreen`
carries the toolbar item and every pushed screen has it. On the Mac it is also **View ▸ Axes** (⌘⇧A),
because a toolbar button is not the only way a reader reaches a panel there.
**Mac and iPad**: `NavigationSplitView`, which collapses itself on a compact width — one view for all
three. **Browser**: a persistent left rail above 900 px, a top bar with a disclosure below it, driven
by a container query, not by user agent.

Each component page links to `spec/components/<Name>.yaml` on GitHub (built from the repository URL in
the package manifest plus the spec path the catalogue carries) and to `tools/parity/report.md`, which
P3-5 already guarantees has a row for every spec — including the ones nothing implements.

The gallery link is `gallery/README.md`, **not** `gallery/index.html`. GitHub serves an HTML file under
`/blob/` as its own source, so a link to the page opened a screenful of markup and the `#<Name>` anchor
the page really carries could not fire inside it; publishing those screens is gated on a
reference-distance review that has not happened, so there is no rendered copy to link either. The
README is a page GitHub does render, and it is the page that says what the gallery is and how to open
it — from a checkout, or from the `gallery` artifact of a green CI run. The anchor still means something
in both of those places, so both apps print it beside the link as the path it is
(`gallery/index.html#Button in a checkout`) rather than hiding it inside a URL that cannot honour it.

## 3. Axes

Every axis is switched through the published API, and the app also shows what the runtime *resolves*,
so a control that does nothing is visible rather than assumed.

| Axis | Web | Apple |
|---|---|---|
| colorScheme | `<Theme colorScheme>` | `.environment(\.colorScheme, _)` |
| density | `<Theme density>` | `.dsDensity(_:)` |
| contrast | `<Theme contrast>` | `.dsAccessibilityPolicy(increasedContrast:)` |
| transparency | `<Theme transparency>` | `.dsAccessibilityPolicy(reduceTransparency:)` |
| motion | `<Theme motion>` | `.dsAccessibilityPolicy(reduceMotion:)` |
| modality | `<Theme modality>` | `.dsModality(_:)`, applied above `DSTheme` |
| bold text, Dynamic Type | — (no web setting) | `.dsAccessibilityPolicy(boldText:dynamicTypeSize:)` |
| brand | a document reload (see below) | `DSTheme(brand:)` at the scene root |

Each control has an **auto** position that passes nothing, exactly as `web/apps/gallery/.storybook/preview.tsx`
does: the axis then follows the OS and the device through the stylesheet's own media queries or through
`DSTokenContext.platformDefault`. The resolved values are read back with `useTokenContext()` on the web
and `DSThemeValues().context` on Apple and printed in the axis bar, so "auto → dark" is visible.

Resolving is not painting, so neither app takes the runtime's word for it. The web measures each axis
against the document it is running in (`src/axis-probe.ts`) and labels it from the measurement — *"no
token moves; 12 of 28 examples still change"*. The Apple app measures the same question in the terms the
platform has (`DSAxisProbe`): it builds the token set twice, once for the resolved context and once with
one axis moved, compares every entry of `DSTokenCatalog` through the key path it carries, and asks
`DSSurface.resolve` whether the axis forces the glass fallback.

**Increase Contrast on Apple is the axis that needed saying out loud.** A Prism colour there is an
asset-catalogue colorset — `Color(assetName, bundle: .module)`, ARCHITECTURE §9.8 — and the OS picks
which entry of it to paint from the scheme and from the *system's* Increase Contrast setting.
`\.colorSchemeContrast` is read-only, so `dsAccessibilityPolicy(increasedContrast:)` moves Prism's own
`DSTokenContext.contrast` and cannot repaint a swatch: measured on the iPhone 17, the app's switch
changes 4,003 of 3,162,132 pixels on `comp.progress-bar` — the context strip and nothing else — while
the OS switch changes 404,991, every swatch among them. The app therefore resolves a colour row's
printed value from `\.colorScheme` and `\.colorSchemeContrast`, the same two things the swatch beside it
is painted from, so the two can never disagree; a colorset whose high-contrast entry is a different
colour (17 of 102 in this brand) says so on its own row and prints it; and the axis sheet labels the
control from the measurement rather than from a claim. The switch is not inert — it forces the glass
fallback of ADR-0022 §1.2, which is 144,231 pixels on the materials screen — and the app says which of
the two it is doing.

The alternative was to paint the specimen from `DSColorToken.appearances(brand)` against the app's own
context, which would make the switch move the swatch. It was not taken: `DSShowcase` cannot change how
`DSTokens` resolves a colour, so every component on the Components screen would keep painting the asset
while the Foundations swatch moved — trading one contradiction inside a row for a worse one across two
screens, and breaking the rule that a specimen shows *the value the running app resolves*.

Two consequences the design has to live with:

- **Only `colorScheme` and `density` nest.** `tokens.css` writes contrast, modality and transparency
  under `:root[…]` and scheme and density as plain attribute selectors; `scope()` accepts the nestable
  axes only (ADR-0019 §1 item 4). So a side-by-side *light next to dark*, or *compact next to regular*,
  is real on one screen, and a side-by-side of two contrast tiers is not. Where the difference matters
  the app switches the root and says which axis it switched.
- **Brand is build-time on the web** (ADR-0020 §6): one brand per document, no `data-ds-brand`, and
  `setBrandTokens` throws on a second, different table. So the brand control is a link that reloads
  with `?brand=prism-native`; `src/main.tsx` picks that brand's `tokens.css`, `fonts.css` and table
  before mounting. On Apple it is a plain root-level switch, because `DSTheme(brand:)` is per scene.

## 4. Honesty

The apps state what is true of the stack they are running on, from the same manifests the parity
report reads. The platform key is derived, not configured: web is `web-touch` or `web-desktop` from
`readContext().modality` (which is how `web/apps/vrt/matrix.ts` defines those keys), Apple is
`macos`, `ipados` or `ios` from the build and the idiom.

Per component, four states, all from the catalogue:

| State | Shown as |
|---|---|
| implemented at `specVersion` | the examples |
| implemented behind the spec | the examples, plus "implements v3 of spec v5" and the parity link — the report's own `LAG` |
| `platforms.<key>` is `full`/`adapted`, no manifest entry | "Specified, not implemented here yet", the spec summary, the example ids it will have, the spec link. Every one of the 51 unimplemented specs is a row, so the app never silently omits |
| `platforms.<key>` is `none` | "Not on this platform, by design", with the reason from `notes.platform.<key>` when the spec gives one |

The same rule applies to the foundations: a `ref` token shows a value on the web (it is a CSS variable)
and on Apple says "primitive tier — no public API"; a token with `deprecated` set shows the
replacement; and on the Icons screen the registry's ladder — all six rungs and all four boxes, of which
`Icon`'s props reach two rungs and three boxes — is labelled as registry data, not as the component. Until
`Icon` entered both manifests (P4-2) the whole screen was such a preview, labelled "drawn from the
registry binding — `Icon` is implemented on neither stack"; the catalogue then moved `Icon` into
Components, and the grid is drawn by `Icon` itself.

Patterns (`DashboardGrid`, `DetailScreen`, `AdaptiveShell`) get a section of their own that says they
are contracts with no implementation and no snapshots, which is also what the gallery says.

## 5. Cost

CI gains **no new job and no new gated step**, and never boots a simulator or a browser for these apps.

| Check | Where it runs | Cost |
|---|---|---|
| the Apple catalogues are what this run renders | `tools/showcase/apple/catalog.test.ts` under `pnpm -r test` in the `web` job, exactly as `tools/parity/report.test.ts` does for the report | seconds, ubuntu |
| the web catalogue is what this run renders | nothing: the web app builds its catalogue from the specs and the manifests during `pnpm -r build`, so there is no committed file to drift from them | none |
| a landed component names a renderer that does not exist yet | the same Vitest file: it renders against a scratch copy of `DSComponentsManifest` with one more component in it and asserts the binding appears, so the compile-time break is proved without a compiler | none |
| the web app builds and typechecks | `pnpm -r build`, `pnpm lint`, `pnpm typecheck` already walk every workspace package | a few seconds |
| `DSShowcase` compiles on four platforms | already inside `swift build`, `swift test` and the two `xcodebuild build -scheme Prism-Package` steps; the screens are `#if os(iOS) \|\| os(macOS)`, so the watch builds an empty module | ~none; the app *bundle* is not built in CI |

Everything expensive stays local, behind three scripts:

```sh
pnpm showcase           # vite dev server against the built packages
pnpm showcase:build     # the static build: web/apps/showcase/dist, servable from any path
pnpm showcase:preview   # serve that build
pnpm showcase:apple     # regenerate, write the Xcode project, build, install and launch
                        #   --platform ios (default) --device 'iPhone 17' | <UDID>
                        #   --platform macos, which opens the built app
                        #   --generate alone regenerates the catalogues and stops
```

The web app consumes `@iiiivaska/prism-tokens` and `@iiiivaska/prism-react` from the workspace through
their published `exports` maps — no alias and no path into a package's source tree — so build the
packages before either script, exactly as the gallery asks.

The app shell is kept deliberately thin — the App struct, the root view, the axis state — so that what
CI does not build is a few dozen lines, and everything with logic in it lives in `DSShowcase`, which
CI does build. No screenshot of these apps is ever recorded: the gallery and the VRT suite own pixels,
and a second baseline set would be a second canon to keep green.

## What this needs that does not exist yet

1. ~~**The Apple examples have to move.**~~ **Built without moving them.** `DSExamples` and the
   `DS<Name>Examples` sets are `internal` and inside `#if DEBUG` in `DSComponents`, so no app can reach
   them — but moving them would touch `DSComponents`, `DSSnapshotTests` and the 488 baselines for a
   showcase, which is a lot of blast radius for a reading app. `DSShowcase` instead stages an example
   **from the spec's own `props`**: one small `DS<Name>Renderer` per implemented component maps
   `{ variant: ghost, size: sm, label: "Filter", leadingIcon: action.filter }` onto `DSButton`'s public
   API. It is the same shape as the web gallery's `RENDERERS` map, it needs nothing that is `internal`,
   and an example the spec *adds* appears with no edit at all — where a moved example set would still
   need one. The stage itself (the page ground, the synthetic map and image) is the showcase's own copy
   of `DSExampleStage`, written from public tokens; the two are the same stage because both draw only
   `color.map.*` and `space.page-margin`, and because the copy stages an example at the width the two
   harnesses stage it at — fit-content, capped at two card columns (`size.card-min` × 2 + the larger of
   `space.card-gap` and `space.4`), with a card-shaped example in a `size.card-min` square, which is
   `.ds-sc-stage`/`.ds-sc-frame`/`.ds-sc-grid` on the web and `DSExampleCardFrame` in the snapshot
   harness. A page proposes its own width to whatever is on it, and a stage that passed that through
   rendered `Card/vivid-pair` as four squashed rectangles with their titles truncated where the
   committed baseline is four 200 pt squares. The stage scrolls sideways when the page is narrower than
   the example, which on a phone that baseline is. Moving the example sets later remains possible and would
   replace the renderers; nothing here depends on their staying put.
2. **A harness that two apps can share.** `web/apps/gallery/src/harness/` becomes
   `web/packages/examples`; the gallery's `scripts/stories.ts` and its content test move with it.
   Until then `web/apps/showcase/src/harness/` is a copy of it — same renderers, same sample copy,
   same stage CSS under a `ds-sc-` prefix — and each file says so in its header. The copy is the one
   piece of the web showcase that can drift, and moving the package is what removes it.
3. ~~**`Icon` is implemented on neither stack.**~~ **Implemented in P4-2.** `Icon` is public on both
   stacks and in both manifests, and Button and Card draw their glyphs through it, so the Icons screen
   draws the 51 registry entries with the component and its spec examples are on Components. Only the
   registry's ladder (every rung and box, where `Icon`'s props reach only some) is still drawn from the binding, and
   labelled as registry data. The screen's reference-distance clearance
   (`docs/direction-board/reference-distance-showcase.md` §10, condition 2) expired with it, and that
   review is re-run as a task of its own.
4. **watchOS is out of scope for the app.** The package supports it, the `watch` density is switchable
   inside the iOS and macOS app, and a watch *run* is not part of this.
