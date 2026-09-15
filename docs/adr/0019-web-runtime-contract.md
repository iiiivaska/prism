# ADR-0019: Web runtime contract: `data-ds-*` attributes, nesting and defaults

- Status: accepted (§4 item 6, the "Motion" bullet and rule 9 amended by [ADR-0025](0025-web-component-css-and-root-axes.md))
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #19
- Amends: ADR-0003 (web stack: the `tokens.css` scoping attributes, `data-slot`, and how `styles.css` is built), ADR-0004 (decision 5: the CSS mode selectors), ADR-0010 (color scheme and density nest; the per-platform default contexts; how the web picks the density default), ADR-0013 (decisions 2 and 5: the React wrapper is `Icon`, the TypeScript map is `iconRegistry`), ADR-0016 (rule 1 also covers data attributes, Tailwind names and other global CSS names; the example variable name)

## Context

`tools/tokens/ARCHITECTURE.md` §9.1 (lines 745–761) designed a web attribute contract, and §16.3 (line 1870) left it open as owner decision O1. The critic found that the sources disagree on the names (`docs/research/critic.md:303`, C-04) and on the defaults (`:317`, C-18). P1-5 writes the CSS format and P3-2 writes the provider, so the contract must be fixed before either. The brand axis is out of scope here; it is decided per ADR-0020.

The sibling ADRs of the same day leave these questions here:

- ADR-0021: whether a composite typography utility is emitted (Consequences, "Web utilities"), and how `fonts.css` is exported (§11).
- ADR-0022 §1.3: the root contrast and transparency state that Surface keys its glass fallback on. ADR-0022 §1.4: whether the reduced-transparency contexts stay once they carry no delta.
- ADR-0023 §8.5 and §12: the root motion switch and its variant.
- ADR-0024 §7.4: which permutation the web `:root` carries.

### What the sources say today

- **Attribute names.**
  - ADR-0003:24 scopes `tokens.css` by `[data-ds-brand|scheme|density|input]`.
  - ADR-0004:25 uses `[data-color-scheme]`, `[data-density]` and `[data-modality]`, and `docs/research/arch-tokens.md:391` adds `[data-reduced-transparency]`.
  - `docs/research/arch-web.md:126` and `:282`, and `agent/SKILL.md:68`, use `data-ds-brand`, `-scheme`, `-density` and `-input`.
  - `docs/roadmap.md:81` and `arch-web.md:132` use `[data-ds-transparency=reduce]` and `[data-ds-contrast=more]`.
  - ARCHITECTURE §9.1, `tokens/README.md:74` and `tools/tokens/README.md:44` use `data-ds-color-scheme`, `-contrast`, `-transparency`, `-density`, `-modality` and `-motion`. Their fallback selectors are `:not([attr])` (ARCHITECTURE line 761).
- **Emitted names.**
  - Swift: `tokens/README.md:13` writes `DSColor.bgAccent`. `agent/SKILL.md:12` writes `DS.color.text.primary`, `DS.space(4)` and `DS.type.body.md`, and Tailwind `text-ds-text-primary` and `ds-type-body-md`. ADR-0020 §7 then removes the context-free `DSColor` statics, because they cannot know the brand.
  - The surface variable: `--ds-color-surface` (`README.md:7`) or `--ds-color-surface-solid` (ADR-0016:14). ARCHITECTURE §8 (line 714) emits `--ds-color-bg-surface` for `sys.color.bg.surface.$root`.
  - React: `<DSIcon>` (`agent/SKILL.md:14`), a `DSIcon` wrapper (ADR-0013:21) and `DSProvider` (`docs/roadmap.md:43`). ADR-0003:45 and ADR-0016:28 say React components are unprefixed.
- **Defaults.**
  - DTCG allows one `default` per modifier. Prism's resolver has `platform: web`, `density: regular` and `modality: pointer` (`tokens/prism.resolver.json:47`, `:66`, `:73`).
  - ARCHITECTURE §9.2 (line 776) puts the default context in `:root`, so desktop web would ship regular density with pointer modality.
  - ADR-0010:27 wants compact on the desktop, regular on touch and comfortable on the watch.
  - `DSTokenContext` repeats regular and pointer as its defaults (ARCHITECTURE lines 1184–1185).
- **Detection.**
  - ADR-0010:28 detects web modality with `(hover: hover) and (pointer: fine)` plus an attribute override. ARCHITECTURE line 755 switches to touch on `(pointer: coarse)` instead.
  - `docs/roadmap.md:43` and `:81` have a `DSProvider` set the attributes, detect modality and set reduced transparency for Safari.
- **What density reaches.**
  - Density writes the gaps, `sys.size.row`, `sys.size.control.$root` and `sys.type.body-line-height`, and nothing else (`tokens/sys/density/regular.tokens.json:4-65`).
  - `comp.button.height.*` aliases `sys.size.control.sm`, `.md` and `.lg`. Those tokens live in `tokens/sys/base.tokens.json:103-113` and never vary.
  - The hit size belongs to modality (`tokens/sys/modality/pointer.tokens.json:6-8`, `tokens/README.md:51`), although ADR-0010:27 lists `size.hit.*` under density.
  - `ref.size.control.md` and `.lg` are described as "pointer default" and "touch default" (`tokens/ref/dimension.tokens.json:182`, `:189`; `docs/research/visual-dna.md:1338`, B24).
- **Where density resolves.** ADR-0010:25 resolves density "once at the root of the view tree"; ARCHITECTURE makes it nestable.

### Facts verified for this decision (2026-09-15)

1. **Preference media features** (MDN browser-compat-data 8.1.1, as in ADR-0022 F5).
   - `prefers-reduced-transparency`: Chrome and Edge 118+. Firefox has it only behind a flag. Safari and Safari on iOS do not support it.
   - `prefers-contrast`: Chrome 96, Firefox 101, Safari 14.1.
2. **Pointer media features.**
   - `pointer` and `hover` describe the primary input; `any-pointer` and `any-hover` describe all inputs (MDN, Baseline since 2018).
   - On iPadOS, WebKit matches `(hover: hover)`, `(pointer: fine)`, `(any-hover: hover)` and `(any-pointer: fine)` while a mouse or trackpad is **connected**. It asks whether a mouse device is attached; it does not follow the last input used (WebKit bug 209292, fixed 2020-10-06 in r268086).
3. **Chromium probe.** A probe page ran in Chromium 152.0.7977.76, at desktop size and under 375 × 812 mobile emulation with touch, and was re-run independently on the same build. It confirmed the selector and media forms of the Decision:
   - An absent, empty or unknown value on `<html>` falls back to the media query. An unknown value on a nested element inherits the parent's value, and so do the aliases of the rescope block.
   - Scopes nested light, dark, light under `data-ds-contrast="more"` resolve per element.
   - The `(any-pointer: coarse)` and `not all and (hover: hover) and (pointer: fine)` blocks switch exactly under touch emulation.
4. **Tailwind.** The probes used Tailwind 4.3.3 through `@tailwindcss/node` `compile` and `optimize`, with the Lightning CSS 1.32.0 that `@tailwindcss/node` pins.
   - It keeps `@media not all and (hover: hover) and (pointer: fine)` and `:not([a="x"], [a="y"])` intact, inside `@custom-variant` blocks and inside `@layer`. Its own `hover:` variant is already wrapped in `@media (hover: hover)`.
   - A plain rule that nests `@variant ds-contrast-more { … }` expands into the variant's attribute form and its media form. This needs no `@import "tailwindcss"`, and the candidate list stays empty. Importing a file that holds `@theme inline` then emits no theme variable, and `optimize` flattens the nesting.
   - A static `@utility type-ds-body-md { … }` compiles, is emitted only when used, and takes variants (`md:type-ds-body-md`).
5. **React Aria.**
   - `react-aria-components` 1.21.1 exports `Provider`, `Button`, `Text`, `I18nProvider` and `RouterProvider`. It exports no `Theme`, `Icon`, `Card` or `Surface`, and renders no `data-slot` attribute of its own.
   - Its `useHover` (react-aria 3.52.1) returns early for `pointerType === 'touch'` and ignores emulated mouse events after a touch, so `data-hovered` never appears for touch.
   - Its `filterDOMProps` passes every `data-*` prop through to the DOM element.
6. **Apple** (Xcode 26.6, iOS 26.5 SDK).
   - SwiftUI's `colorSchemeContrast`, `accessibilityReduceTransparency` and `accessibilityReduceMotion` are get-only environment values (`SwiftUICore.swiftinterface`; `docs/research/arch-apple.md:150-152`, `:162`).
   - GameController declares `GCMouseDidConnectNotification` and `GCMouseDidDisconnectNotification` for iOS 14+ and macOS 11+ (`GCMouse.h:39-40`); the watchOS SDK has no `GCMouse`. Whether they report the Magic Keyboard trackpad on iPadOS 26 is not verified.
7. **`data-slot`.** shadcn/ui v4 components render `data-slot` attributes (`docs/research/arch-web.md:339`, fact 45). A stylesheet that selects `[data-slot=button]` therefore also matches another library's buttons in the same app.

## Decision

### 1. The attributes

| Axis | Attribute | Values (first = default) | Resolver / Swift | Where it acts | Fallback when the attribute has no valid value |
|---|---|---|---|---|---|
| colorScheme | `data-ds-color-scheme` | `light`, `dark` | base scheme of `colorScheme` / `DSColorScheme` | `<html>` and any element | `(prefers-color-scheme: dark)` → `dark` |
| contrast | `data-ds-contrast` | `standard`, `more` | `-increased-contrast` variant / `DSContrast.increased` | `<html>` only | `(prefers-contrast: more)` → `more` |
| transparency | `data-ds-transparency` | `standard`, `reduce` | `-reduced-transparency` variant / `DSTransparency.reduced` | `<html>` only | `(prefers-reduced-transparency: reduce)` → `reduce` (never matches in Safari; §4 item 3) |
| density | `data-ds-density` | `compact`, `regular`, `comfortable` | `density` / `DSDensity` | `<html>` and any element | `(any-pointer: coarse)` → `regular` |
| modality | `data-ds-modality` | `pointer`, `touch` | `modality` / `DSModality` | `<html>` only | `not all and (hover: hover) and (pointer: fine)` → `touch` |
| motion | `data-ds-motion` | `standard`, `reduce` | `motion` contexts `default`, `reduced` / `DSMotionMode` | `<html>` only | `(prefers-reduced-motion: reduce)` → `reduce` |

Gamut and platform have no attribute. Gamut is media only (`@media (color-gamut: p3)` twins), and platform is always `web` on the web. Brand has none either: a document loads one brand's stylesheet (per ADR-0020 §6).

How an element resolves:

1. **Names.** An attribute name is `data-ds-` plus the kebab-case `TokenContext` field. Values are closed. Web values use the CSS media-feature words (`more`, `reduce`). The attributes, TypeScript's `TokenContext` (ARCHITECTURE §9.5) and `<Theme>`'s props share them. Swift keeps its enum case names, and `manifest.json` maps one to the other.
2. **Only a listed value counts.** An absent, empty or unknown value (`auto`, `system`, a typo) behaves exactly like no attribute:
   - on `<html>`, the media fallback applies;
   - on a nested element, the parent's value is inherited.

   Generated fallback selectors therefore list every valid value, as in `:root:not([data-ds-density="compact"], [data-ds-density="regular"], [data-ds-density="comfortable"])`, and never use `:not([data-ds-density])`. A `:not()` counts as its most specific argument, (0,1,0), so the specificity ladder of ARCHITECTURE §9.2 does not change.
3. **Any valid value turns the fallback off,** including the default. `data-ds-contrast="standard"` ignores the OS preference.
4. **Nesting.**
   - `colorScheme` and `density` resolve per element: the nearest ancestor-or-self with a valid value wins, else the value on `<html>`, else the fallback.
   - Contrast, transparency, modality and motion are read from `<html>` only and ignored on any other element. Nested schemes still get the root's contrast deltas (and any transparency delta) through the descendant forms of ARCHITECTURE §9.2.
5. **The resolver default is the web root when no attribute is set and no fallback query matches:** `colorScheme: light`, `density: compact`, `modality: pointer`, `motion: default`, and no contrast or transparency variant.
   - In `tokens/prism.resolver.json`, `density.default` changes from `regular` to `compact`; the other defaults already match.
   - The web `:root` blocks, TypeScript `defaultContext` and `DSTokenContext.default` all hold this context.
6. **The reduced-transparency contexts stay.** ADR-0022 empties their deltas and leaves their fate here (ADR-0022 §1.4). They stay in the resolver. That keeps the 432 permutations, the six colorScheme contexts of ADR-0020 rule 10, `DSTransparency`, and the `transparency` field of `TokenContext` and `DSTokenContext`. A future token that depends on transparency then needs no new plumbing.
   - While the deltas are empty, `tokens.css` and the colorsets carry no transparency output.
   - The attribute and its fallback then act only through the `ds-reduce-transparency` variant (§4 item 6) and `readContext()`.

### 2. Default contexts per platform (C-18)

| Platform | colorScheme, contrast, transparency, motion | density | modality |
|---|---|---|---|
| web | the fallbacks of §1 | `compact`; `regular` while any input is coarse (a touchscreen is present) | `pointer` while the primary input can hover and point finely; `touch` otherwise |
| iOS | SwiftUI environment | `regular` | `touch` |
| iPadOS | SwiftUI environment | `regular` | `touch`; `pointer` while a mouse or trackpad is connected |
| macOS | SwiftUI environment | `compact` | `pointer` |
| watchOS | SwiftUI environment, with colorScheme fixed to `dark` | `comfortable` | `touch` |

- **Web pairings.** These fallbacks give three pairings:
  - compact and pointer on desktops without a touchscreen (Tier 2);
  - regular and touch on phones and tablets (Tier 1);
  - regular and pointer on touch devices with a trackpad or mouse, such as an iPad with a trackpad or a touchscreen laptop. WebKit reports a connected pointing device this way (fact 2), and it is also what iPadOS gets natively in the ADR-0010 context.
- **Density never follows a runtime change of modality.** Attaching a trackpad turns on hover and pointer hit sizes; it does not shrink the layout.
- **Density owns spacing, control and row sizes, and no typography** (ADR-0021 §6). Modality owns the hit area and whether hover and tooltips exist. The token side of this split is ADR-0024 §7: `sys.size.control.sm|md|lg` move into the density files, so Button heights follow density, and `sys.size.hit` stays modality's.
- **watchOS** is fixed to dark because its `watch` colorset entry carries the dark value (ARCHITECTURE §9.8).
- **Brand** is not part of these defaults. It is `DSBrand.default` until `DSTheme(brand:)` sets it (ADR-0020 §7).
- **Tests use the resolver default; apps use the platform default.** `DSTokenContext.default` is the resolver default, for tests and the table evaluator. DSCore starts from a generated `DSTokenContext.platformDefault`.

### 3. One table drives every output

`tools/tokens/config.ts` holds the only hand-written definition of this contract, in two tables:

- `WEB_RUNTIME`: for each axis, the attribute, the values in order (the first is the default), whether it nests, its one media fallback (value and query), and its resolver and Swift names.
- `PLATFORM_DEFAULTS`: the rows of §2.

The build derives from these tables:

- **The stylesheets.** The blocks of `tokens.css` and `motion.css` (ARCHITECTURE §9.2 and §9.3) use the selectors of §1. After the density context blocks comes one density fallback block: `@media (any-pointer: coarse) { :root:not(<valid densities>) { <regular text> } }`.
- **The Tailwind variants** of `tailwind.css`: `ds-touch`, `ds-pointer`, `ds-contrast-more`, `ds-reduce-transparency` and `ds-reduce-motion`. Each has an attribute form and a media form with the same query and value list. There is still no scheme or density variant (§9.4).
- **One composite typography utility per type role** in `tailwind.css`, from the IR rather than the runtime tables (this settles the question ADR-0021 leaves here):
  - `@utility type-ds-<role>`, where `<role>` is the kebab-case of the role path after `type.` (`type.body.md` → `type-ds-body-md`; 21 roles today);
  - it sets, in this order, `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing` and `font-variant-numeric`, each as `var()` of the role's derived declaration (ARCHITECTURE §8);
  - `text-ds-<role>` stays (ARCHITECTURE §9.4). It sets size, line height, letter spacing and weight, but neither family nor figures, so the skill teaches `type-ds-<role>`.
- **A new brand-invariant file, `web/packages/tokens/src/generated/runtime.ts`**:

  ```ts
  export const webRuntime = {
    colorScheme:  { attribute: 'data-ds-color-scheme', values: ['light', 'dark'], nestable: true, media: { value: 'dark', query: '(prefers-color-scheme: dark)' } },
    contrast:     { attribute: 'data-ds-contrast', values: ['standard', 'more'], nestable: false, media: { value: 'more', query: '(prefers-contrast: more)' } },
    transparency: { attribute: 'data-ds-transparency', values: ['standard', 'reduce'], nestable: false, media: { value: 'reduce', query: '(prefers-reduced-transparency: reduce)' } },
    density:      { attribute: 'data-ds-density', values: ['compact', 'regular', 'comfortable'], nestable: true, media: { value: 'regular', query: '(any-pointer: coarse)' } },
    modality:     { attribute: 'data-ds-modality', values: ['pointer', 'touch'], nestable: false, media: { value: 'touch', query: 'not all and (hover: hover) and (pointer: fine)' } },
    motion:       { attribute: 'data-ds-motion', values: ['standard', 'reduce'], nestable: false, media: { value: 'reduce', query: '(prefers-reduced-motion: reduce)' } },
  } as const;
  ```

  The same file exports the axis types, `TokenContext`, `defaultContext`, `platformDefaults` and `ScopeAttributes`. `ScopeAttributes` is the prop type `{ 'data-ds-color-scheme'?: ColorScheme; 'data-ds-density'?: Density }` that components extend. `<brand>/tokens.ts` imports them instead of declaring its own.
- **A `runtime` section in `manifest.json`**: the same table with the Swift case names, the resolver contexts and the platform defaults.
- **`DSTokenContext.platformDefault`** in `DSTokenContext.swift`, chosen with `#if os(watchOS)`, `#elseif os(macOS)` and `#else`.

Hand-written web code imports `webRuntime` in TypeScript and uses the generated variants in CSS (§4 item 6). It never spells an attribute name or a preference or pointer media query itself.

### 4. Web runtime (P3-2)

The root export of `@iiiivaska/prism-tokens` imports no React:

```ts
rootAttributes(context: Partial<TokenContext>): Record<string, string>   // pure; attributes for <html>, server rendering included
scope(context: Partial<Pick<TokenContext, 'colorScheme' | 'density'>>): ScopeAttributes   // pure; for any element
readContext(element?: Element | null): TokenContext   // effective context at an element (default: <html>)
watchContext(listener: (context: TokenContext) => void): () => void
mountRoot(context: Partial<TokenContext>): () => void
```

`@iiiivaska/prism-tokens/react`, re-exported by `@iiiivaska/prism-react`, adds `<Theme colorScheme? contrast? transparency? density? modality? motion?>` and `useTokenContext(): TokenContext`.

1. **Only explicit choices become attributes.**
   - `mountRoot`, which `<Theme>` calls in a layout effect, writes the valid values it is given onto `document.documentElement`. It leaves every other axis alone. Its cleanup restores the previous values.
   - A prop left undefined means "follow the platform".
   - Nothing copies a detected value into an attribute. The stylesheet evaluates the same media queries itself, so the first paint is right without JavaScript and after server rendering.
2. **Detection exists for JavaScript consumers only.** It runs `matchMedia` over the `webRuntime` queries.
   - `readContext` returns, for a nestable axis, the nearest valid attribute, else the valid attribute on `<html>`, else the media query. For a root-only axis it returns the valid attribute on `<html>`, else the media query.
   - `watchContext` fires on every `change` of those media queries and on every `data-ds-*` mutation of `<html>`.
   - `useTokenContext()` reflects `<html>`. On the server and during hydration it returns `defaultContext` overlaid with the `<Theme>` props, then switches to what `readContext()` returns after mount. Code inside a nested scope calls `readContext(element)`.
   - Canvas code resolves colors with `resolveTokens(readContext(element))` from the brand table the app hands to Prism (ADR-0020 §6).
   - Modality changes only when its media query changes, for example when a trackpad is connected to an iPad. There is no last-input switching; React Aria already keeps touch from producing hover (fact 5).
3. **No stand-in for Reduce Transparency.** Safari and Safari on iOS cannot report it, and Firefox reports it only behind a flag (fact 1). The runtime does not guess it from another setting.
   - Under Increase Contrast, which every target browser reports, glass already falls back (ADR-0022 §1.2).
   - A user who turned on only Reduce Transparency keeps web glass in those browsers, as ADR-0022's Consequences accept, unless the app offers its own setting and passes `transparency="reduce"`.
4. **`<Theme>` renders no element and is root-only.**
   - A `<Theme>` inside another `<Theme>` throws in development: "Theme is root-only; spread scope() on an element for a nested color scheme or density".
   - A nested scope is a set of attributes on the app's own element: `<section {...scope({ colorScheme: 'dark' })}>`.
   - Every Prism React component that renders a DOM element accepts `ScopeAttributes` and forwards them to its root DOM element.
   - How the app hands its brand's table to Prism is per ADR-0020 §6; P3-2 names that API.
5. **Server rendering.** With no attribute, the server's HTML follows the media queries. An app that persists a user's choice renders `rootAttributes(choice)` into `<html>`; a `<Theme>` with the same values then changes nothing on hydration.
6. **Component CSS reaches the root-only axes only through the generated variants.** Component stylesheets read tokens, which already switch with every axis. Sometimes a rule itself, not a value, must depend on a root-only axis. The stylesheet then nests that rule in `@variant ds-…`.
   - **Build.** Every Prism package that ships a hand-written stylesheet (`@iiiivaska/prism-react`, and `@iiiivaska/prism-charts` if it ships one) compiles it with `@tailwindcss/node` against the generated `tailwind.css`: `compile`, `build([])` with no candidates, then `optimize` (fact 4). The shipped CSS is plain CSS with no Tailwind utility, so consumers still need no Tailwind (ADR-0003).
   - **The uses are closed.**
     - Hover styles select React Aria's `[data-hovered]` (fact 5) inside `@variant ds-pointer`. A page forced to touch therefore shows no hover even under a mouse (ADR-0010 rule 2).
     - `ds-touch` and `ds-pointer` may switch other interaction-only rules. They never set a size: sizes come from `size.*` tokens, and density and modality switch those.
     - `ds-reduce-motion` carries the substitutions of ADR-0023 §8.4.
     - `ds-contrast-more` and `ds-reduce-transparency` appear only in the Surface stylesheet, for the glass fallback of ADR-0022 §1. Everything else that changes under Increase Contrast changes through tokens (ADR-0011).
   - JavaScript that depends on an axis reads `readContext()` or `useTokenContext()` instead.

**Files and packages.**

- **The provider files.** They are `web/packages/tokens/src/runtime/` (framework-free) and `web/packages/tokens/src/react/` (`Theme`, `useTokenContext`). They are the web runtime that ADR-0022 §1.3 and ADR-0023 §8.5 read through `useTokenContext()`. They take every query from `generated/runtime.ts`, so they spell none of the names that rule 1's lint bans, and the lint needs no exception for them.
- **Motion.** Where `@iiiivaska/prism-react` uses Motion, it wraps its subtree in `MotionConfig` driven by `useTokenContext().motion`, never by `reducedMotion="user"` (ADR-0023 §8.5).
- **Package layout (C-14, P3-2).** The root export must not import React, and `./react` needs React as an optional peer dependency. P3-2 fixes the rest of the export map:
  - the CSS subpaths: `tokens.css`, `motion.css`, `tailwind.css` and ADR-0021's `fonts.css`;
  - ADR-0020 §6's brand paths;
  - the `style` field.

  The component build imports `tailwind.css` through that map.

### 5. Apple mapping (P3-1)

| Context field | Source | Scope |
|---|---|---|
| `colorScheme` | `\.colorScheme`, fixed to `.dark` on watchOS | nests through SwiftUI's own `.environment(\.colorScheme, …)` |
| `contrast` | `\.colorSchemeContrast` | root (read-only preference) |
| `transparency` | `\.accessibilityReduceTransparency` | root |
| `motion` | `\.accessibilityReduceMotion` | root |
| `density` | DSCore `\.dsDensity`, default `DSTokenContext.platformDefault.density` | nests through a DSCore modifier |
| `modality` | DSCore `\.dsModality`, set by `DSTheme` from the OS and, on iPadOS, from whether a pointing device is connected | root |

- **Forcing preferences.** `DSAccessibilityPolicy` (P3-1) may force the read-only preferences in previews and snapshot tests.
- **Nested scopes.** DSCore derives the `DSTokenContext` from the environment wherever tokens are read, so nested scheme and density scopes resolve as on the web.
- **iPadOS pointer detection.** P3-1 verifies the mechanism; the candidate is the GameController framework's `GCMouse` connect and disconnect notifications (fact 6). If they prove unreliable, iPad stays `touch`. Native hover effects still work in that case, because the system drives them.

### 6. Names (C-04)

1. **Names in the page's global namespace carry the prefix.** Everything Prism puts into the DOM or CSS namespace starts with `ds`:
   - custom properties `--ds-…` (ARCHITECTURE §8), including any `@property` registration;
   - data attributes `data-ds-…`: the six axes, and component parts as `data-ds-slot` instead of ADR-0003's `data-slot`;
   - classes, keyframes and container names `ds-…`, and layers `ds.*`;
   - Tailwind theme variables `--<namespace>-ds-…`, utilities `<utility>-ds-…` (`bg-ds-page`, `text-ds-primary`, `p-ds-card-padding`, `type-ds-body-md`) and variants `ds-…`.

   React Aria's state attributes (`data-pressed`, `data-hovered`, …) are the only unprefixed attributes on Prism elements.
2. **Names inside a module do not.**
   - React components, hooks, and TypeScript functions, constants and types carry no prefix: `Button`, `Card`, `Icon`, `Theme`, `useTokenContext`, `resolveTokens`, `webRuntime`, `TokenContext`. The TypeScript icon map is `iconRegistry`, not `dsIcons`; the plain name `icons` would shadow `@phosphor-icons/core`'s `icons` export (`spec/icons/README.md:20`).
   - ADR-0003 rule 1 and ADR-0016 rule 1 stand.
   - A React component takes its spec's name, which is the Swift type name without `DS`: `DSButton` ↔ `Button`, `DSIcon` ↔ `Icon`, `DSTheme` ↔ `Theme`, `DSHeroNumber` ↔ `HeroNumber`.
3. **Swift keeps `DS` on every public type.** Members that Prism adds to Apple's own types share Apple's namespace and start with `ds`, as the roadmap already names them: `\.dsDensity`, `\.dsModality`, `\.dsSurfaceContext`. Members of Prism's own types follow ARCHITECTURE §8. After ADR-0020 §7 colors are brand-scoped: the case `DSColorToken.bgSurface`, and `DSTokenSet` members such as `color.bgSurface`, `space.cardPadding` and `typography.bodyMd`.
4. **Token paths never carry the prefix:** `color.bg.surface`, `comp.button.primary.bg.rest`.
5. **ARCHITECTURE §8 is the one naming table.** For example, `sys.color.bg.surface.$root` becomes:
   - `--ds-color-bg-surface` (CSS) and `bg-ds-surface` (Tailwind);
   - `color.bg.surface` (TypeScript key);
   - `color.bgSurface` on `DSTokenSet` and the case `DSColorToken.bgSurface` (Swift), and `color-bg-surface` (colorset, inside the brand's namespace folder, ADR-0020 §7).

   Docs and the skill quote these names, never invented ones.

### 7. Not decided here

- **Other ADRs:**
  - the brand axis (ADR-0020);
  - control-height values and the ownership of `size.hit` (ADR-0024 §7);
  - what glass renders under reduced transparency and increased contrast (ADR-0022);
  - type roles and their weights (ADR-0021; density does not change them);
  - motion token values and context names (ADR-0023). This ADR only maps the resolver's `default` to `standard`.
- **The export map** (P3-2, C-14; §4 "Package layout").
- **`forced-colors: active`** is not a token axis. P3-4's component CSS handles it.
- **Shadow DOM (`:host`)** is not supported until a consumer needs it.

### 8. What changes in the amended ADRs

- **ADR-0003:**
  - `tokens.css` is scoped by the attributes of §1, not by `[data-ds-brand|scheme|density|input]` (brand per ADR-0020);
  - components render `data-ds-slot`, not `data-slot`;
  - the package build compiles each stylesheet with Tailwind's compiler, only to expand `@variant ds-…` (§4 item 6). The shipped `styles.css` still holds no Tailwind utility.
- **ADR-0004, decision 5:** the mode selectors are the attributes and fallbacks of §1, not `[data-color-scheme]`, `[data-density]`, `[data-modality]` and `@media (pointer: coarse)`.
- **ADR-0010:**
  - color scheme and density may be set for a subtree on both stacks; modality stays resolved at the root;
  - on the web, the density default follows `(any-pointer: coarse)`;
  - the per-platform defaults are the table of §2.

  ADR-0024 separately moves `size.hit` from ADR-0010's density bullet to modality, and ADR-0021 removes type from it.
- **ADR-0013, decisions 2 and 5:** the React wrapper is `Icon`, and the generated TypeScript map is `iconRegistry`.
- **ADR-0016:**
  - rule 1 also covers data attributes (`data-ds-`), Tailwind names, layers, keyframes and container names, while TypeScript exports stay unprefixed like React components;
  - the example variable is `--ds-color-bg-surface`.

## Alternatives considered

- **ADR-0004's unprefixed names** (`data-color-scheme`, `data-density`, `data-modality`, `data-reduced-transparency`): these are global attributes without the prefix, a namespace other systems already use (GitHub Primer owns `data-color-mode`, `docs/research/arch-tokens.md:59`). They can collide, and they break ADR-0016 rule 1.
- **ADR-0003's and arch-web's names** (`data-ds-scheme`, `data-ds-input`): they are two aliases to memorize next to the field names `colorScheme` and `modality` that the resolver, TypeScript and Swift use. With the rule "attribute = kebab-case of the field", an agent can derive every name.
- **Every axis nestable:**
  - contrast, transparency and motion are user preferences, and modality is a device property; none of them has a meaningful subtree;
  - SwiftUI cannot set three of them for a subtree (fact 6);
  - nesting them would multiply the variant selector groups of ARCHITECTURE §9.2.
- **No nesting:** loses dark bands inside light pages ("light dashboard over a dark band", `docs/research/visual-dna.md:26`) and compact tables inside regular pages.
- **`:not([attr])` fallbacks** (ARCHITECTURE as written): `data-ds-color-scheme="system"` or a typo would silently force light, compact or pointer. The list of valid values costs no specificity and was verified (fact 3).
- **Keep `regular` as the resolver default and add a separate web base table:** the same modifier would have two meanings of "default", and one of them is the orphan pairing C-18 reports.
- **Key the density fallback on the modality query,** one media condition per tier: every pairing would match an ADR-0010 tier. But connecting a trackpad to an iPad makes WebKit report a fine, hovering primary pointer (fact 2), so the page would shrink from regular to compact mid-session. Native iPadOS keeps its density.
- **Detect modality with `(pointer: coarse)`** (ARCHITECTURE line 755): a fine pointer that cannot hover, or no pointer at all, would get pointer modality and hover-only affordances. ADR-0010 rule 2 needs hover as a precondition, and ADR-0010's own query tests it.
- **Last-input-wins modality:** hit sizes and tooltips would flicker on hybrid devices. React Aria already handles hover per interaction.
- **A provider that copies detected values into attributes** (the roadmap's `DSProvider` wording):
  - it duplicates what CSS already evaluates;
  - it needs JavaScript before the first paint, so pages flash after server rendering;
  - an attribute goes stale when a `change` event is missed.
- **Stand-ins for Reduce Transparency in Safari:**
  - **Set `reduce` while contrast is `more`**, where the browser cannot report the preference. ADR-0022 §1.2 already makes glass opaque under Increase Contrast, so the only visible change would be the vivid bloom. It would also copy a derived value into an attribute (against §4 item 1), act only after JavaScript loads, and rest on a third-party claim that macOS couples the two settings (How-To Geek, 2019), which Apple's support page does not make.
  - **Treat every unsupported browser as `reduce`:** removes web glass on every Apple browser, against ADR-0009.
  - **None** (chosen): Increase Contrast users are covered by ADR-0022, and an app can pass `transparency`.
- **Component stylesheets that spell the axis selectors by hand,** under ADR-0022 rule 2's allowlist. This lost narrowly. It needs no build step, but every such stylesheet would repeat the valid-value fallback forms of §1 by hand, and a slip such as `:not([data-ds-contrast])` passes review. The `@variant` expansion reuses the generated forms that the token build already tests, for one Tailwind compile in the package build.
- **A Surface that branches in React** (`useTokenContext()` choosing glass or `raised`): the first paint after server rendering, and every page without JavaScript, would show the wrong material.
- **Component CSS that never depends on an axis:** ADR-0022 §1.3 needs Surface to follow the root contrast and transparency state, ADR-0023 §8.4 needs components to substitute motion, and `interaction.hover` as a 0/1 number cannot switch a selector.
- **No composite typography utility** (ADR-0021's status quo): an agent writing Tailwind must combine `text-ds-<role>`, `font-ds-<slot>` and `tabular-nums` and know each role's slot and figures. **Replacing `text-ds-<role>`** instead: `--text-*` is Tailwind's font-size namespace, which ARCHITECTURE's compile test already covers; keeping both costs nothing.
- **`DS`-prefixed React components** (`DSButton`, `DSIcon`, `DSProvider`, as the skill, the roadmap and `docs/research/dataviz-design.md` §5 write them):
  - in favor: one name per component across the two stacks, and no clash with React Aria's `Button` and `Text` in one file;
  - against: it overturns ADR-0003 rule 1 and ADR-0016 rule 1.

  Swift needs the prefix because `import SwiftUI` and `import DSComponents` share one namespace, where `Button` would be ambiguous. An ES module import names its source. Both parity manifests already key components by spec name (ADR-0006), which is the React name.
- **`Provider`, `DSProvider` or `ThemeProvider`:** `Provider` is a React Aria export (fact 5); `DSProvider` breaks rule 1; `ThemeProvider` breaks the "Swift name minus `DS`" rule (`DSTheme` → `Theme`).
- **`data-slot` as in ADR-0003:** shadcn/ui renders the same attribute (fact 7), so Prism's `styles.css` would style foreign elements in a mixed app.

## Consequences

- **What gets easier.**
  - One table produces the CSS, the Tailwind variants, the TypeScript, the manifest and the Swift defaults.
  - An agent can derive every attribute from a field name.
  - The first paint is right without JavaScript in every browser.
  - Component stylesheets depend on root axes only through forms the token build generates and tests.
- **What gets larger.**
  - Generated fallback selectors get longer, and the stylesheet gains one density block.
  - The cascade simulator gains three scenarios: invalid values, the density fallback, and the two pointer features.
  - `tailwind.css` gains one `type-ds-<role>` utility per role, emitted only when used.
  - The component packages gain one Tailwind compile step and a devDependency on `@tailwindcss/node`.
- **Pairings.** Touch devices with a trackpad or mouse render regular and pointer. A desktop that misreports a coarse input gets regular density: harmless, and what the resolver default was before this ADR.
- **Reduce Transparency on Apple browsers.** A Safari user who turned on only Reduce Transparency keeps translucent web glass, unless the app offers its own setting. ADR-0022 accepts this, and Increase Contrast still makes glass opaque.
- **Defaults move to compact.**
  - ADR-0024 §7.1's regular values equal today's `sys/base` sizes; the default permutation itself now carries compact.
  - `DSTokenContext.default` and TypeScript's `defaultContext` become compact and pointer.
  - The Figma-native flavor's "other axes at defaults" now means compact.
  - Code that treats `DSTokenContext.default` as a device default is wrong; DSCore uses `platformDefault`.
- **Tailwind's built-in variants ignore Prism's attributes.** `dark:`, `contrast-more:`, `motion-safe:`, `motion-reduce:`, `pointer-fine:`, `pointer-coarse:` and their `any-` forms read media only. Consumer code uses tokens or the `ds-*` variants, which the skill states. Prism's own packages hold no Tailwind utilities (ADR-0003), and nothing checks consumer repositories.
- **Aliased imports.** Inside `@iiiivaska/prism-react`, React Aria's `Button` and `Text` are imported under aliases.
- **Follow-up work.** The edits that go with this ADR:
  - ARCHITECTURE §9, the token READMEs, the skill, and the status lines of the amended ADRs;
  - roadmap tickets P1-2, P1-5, P2-2, P3-1, P3-2 and P3-4.

## Rules that follow

1. **One source.** `tools/tokens/config.ts` (`WEB_RUNTIME`, `PLATFORM_DEFAULTS`) is the only hand-written source of attribute names, values, nestability, fallback queries and defaults.
   - Check: `pnpm lint:literals` gains a `runtime` kind, next to ADR-0023 §12's `motion` kind. It runs over the lint's scan directories (`web/packages/*/src`), with generated output and `*.test.*` files excluded. It fails on any of these in TypeScript and CSS:
     - the six attribute names;
     - the preference media features `prefers-color-scheme`, `prefers-contrast`, `prefers-reduced-transparency` and `prefers-reduced-motion`;
     - the pointer media features `(pointer: …)`, `(any-pointer: …)`, `(hover: …)` and `(any-hover: …)` (the `:hover` pseudo-class is allowed).

     It has one hit and one miss fixture per pattern. Tests and the VRT spec (`web/apps/vrt`) spell the names on purpose, to check the contract independently.
2. **Fallback selectors list every valid value.** Generated CSS never contains `:not([data-ds-…])` without a value.
   - Check: a render test in `formats/css`.
   - Check: the `verify/css-cascade.ts` scenario "absent, empty and unknown values on `<html>` and on nested elements", which runs inside `pnpm tokens:build`.
3. **Each modifier's resolver `default` is the resolver context of the first value of its `WEB_RUNTIME` axis:** `light`, `compact`, `pointer`, `default`.
   - Check: source check `resolver/web-default-mismatch` in `source/analyze.ts`, which runs in `tokens:build`, with a broken fixture under `tools/tokens/fixtures/broken/`.
4. **Only `colorScheme` and `density` appear in descendant or non-root selectors.** Contrast, transparency, modality and motion match on `:root` only, in CSS and in `readContext`.
   - Check: a render test over the `CssRule` model.
   - Check: ARCHITECTURE §9.12 scenarios 3 and 4 (nested scheme and density scopes), plus the density fallback scenario, over all 96 contexts per brand.
5. **Two independent root fallbacks.** Density falls back through `(any-pointer: coarse)` to `regular`; modality falls back through `not all and (hover: hover) and (pointer: fine)` to `touch`. Each is evaluated independently, at `<html>` only.
   - Check: the cascade simulator with the two features as independent booleans.
   - Check: a P3-4 VRT runtime-contract spec, with the attribute forms in Chromium, WebKit and Firefox and the touch path in a Chromium `hasTouch`/`isMobile` context.
6. **`mountRoot` and `<Theme>` write only explicit choices.** They write only the axes they are given, never a detected or derived value, and never remove a value they did not write. Their cleanup restores the previous values.
   - Check: a Vitest suite in `@iiiivaska/prism-tokens`, in a DOM environment with a fake `matchMedia`, run by `pnpm -r test` in the `web` job. It includes a browser without `prefers-reduced-transparency`, in which contrast `more` leaves `data-ds-transparency` untouched.
7. **`<Theme>` renders no element and is root-only.** `useTokenContext()` returns what `readContext()` returns and updates on every `watchContext` event. Its server and hydration snapshot is `defaultContext` overlaid with the `<Theme>` props.
   - Check: the same suite, with React Testing Library, including a server render.
8. **Every public React component that renders a DOM element accepts `ScopeAttributes`** (`data-ds-color-scheme`, `data-ds-density`) and forwards them to its root DOM element.
   - Check: a generic test over the exports of `@iiiivaska/prism-react`, from P3-4 on and in every component ticket.
9. **Component stylesheets follow §4 item 6.**
   - In the source, the only root-axis conditions are `@variant ds-…`. Every rule that selects `[data-hovered]` sits inside `@variant ds-pointer`. `ds-contrast-more` and `ds-reduce-transparency` appear only in the Surface stylesheet. No `width`, `height`, `min-*`, `max-*`, `padding*`, `margin*`, `gap`, `inset*` or `font-size` declaration sits inside `ds-touch` or `ds-pointer`.
   - In the compiled CSS, every selector has a `[data-ds-slot…]` attribute or a `.ds-…` class in its rightmost compound, and no `@variant`, `@apply` or `@utility` remains.
   - Check: a P3-4 test that parses each package's source stylesheets and its compiled CSS.
   - Check: rule 1's lint, for raw names in the source.
10. **Every name Prism puts into the global DOM or CSS namespace carries `ds`** (§6.1).
    - Check: a `tools/tokens` naming test over every generated custom property, Tailwind theme variable, utility and variant.
    - Check: rule 9's stylesheet test, for component attributes, classes, keyframes and layers.
11. **React components, hooks and TypeScript exports carry no `DS` or `ds` prefix,** and a component's export name is its spec name.
    - Check: a test in each web package that no export matches `^(DS|ds)[A-Z]`.
    - Check: a test in `@iiiivaska/prism-react` and `@iiiivaska/prism-charts` that every key of the package's `implemented` manifest (a spec name, ADR-0006) is a named export of the package.
12. **DSCore builds the context from `DSTokenContext.platformDefault`,** the SwiftUI environment of §5, and its own `dsDensity` and `dsModality`. No component branches on the OS for density or modality (ADR-0010 rule 1).
    - Check: `GeneratedTokenTests.swift` asserts `platformDefault` per OS:
      - compact and pointer under `swift test` on the macOS host;
      - regular and touch under `xcodebuild test` on the iOS simulator;
      - comfortable, touch and dark on the watchOS simulator.
    - Check: P3-1's `DSCoreTests` cover the mapping with `DSAccessibilityPolicy` overrides.
13. **Docs and the skill quote only names that exist.** Every quoted `--ds-…` custom property, Swift name and Tailwind `…-ds-…` utility exists in `manifest.json`.
    - Check: ADR-0024 §13's `tools/tokens/docs.test.ts` (item 3, from P1-5).
14. **`tailwind.css` holds exactly one `type-ds-<role>` utility per `sys.type.<role>`,** and nothing else under that name, each with the six declarations of §3 in their order.
    - Check: the P1-5 Tailwind compile test, which asserts `type-ds-body-md` and that `type-ds-metric-xl` takes its figures from its own token. The utility-collision check covers the `type` family.
