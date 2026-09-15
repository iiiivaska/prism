# Prism — Web implementation stack research (React + TypeScript + Tailwind v4)

Research date: **2026-09-08**. All version numbers and dates below were verified on that day against the npm registry (`npm view`), the GitHub API (`gh api`), or the official docs/blog pages cited. Where a page could not be fetched, the claim is marked medium/low confidence.

Scope: the six questions from the brief (headless primitives, Tailwind v4, charts, gallery + visual regression, publishing, motion) and a concrete `web/` package layout for Prism.

---

> **Superseded in part (2026-09-15).** Motion (the §0 Motion row, §2.7, §6 with its recommendation and reduced-motion bullet, the §7 `motion.css` comment, §9 item 9) by ADR-0023: tokens are Apple `(duration, bounce)` springs, not Motion `(visualDuration, bounce)`; CSS `linear()` is sampled from Motion's physics generator over Prism's settle time, not produced by `spring().toString()`; Motion is configured only with the physics triplet, and `MotionConfig reducedMotion="user"` is not used; Reduce Motion never collapses durations to 0: it applies zero-bounce springs, durations of at most 150 ms and ADR-0023 §8.4's substitutions. Runtime attribute names and the provider follow ADR-0019, brand delivery ADR-0020, and the generated-output layout ADR-0024 §11; the notes below mark each place.

## 0. Executive summary (decisions proposed)

| Area | Recommendation | One-line reason |
|---|---|---|
| Headless primitives | **React Aria Components (RAC) 1.21.x** as the single primitive layer; Base UI documented as the fallback if RAC ergonomics prove too heavy | Only library with a published assistive-technology test matrix, built-in localized strings (30+ languages), Table/Tree/DatePicker/ColorPicker/Virtualizer, an official MCP server + Agent Skills, and a Tailwind v4 plugin that maps `data-*` states to variants |
| Tailwind v4 | Tokens delivered as CSS variables (`--ds-*`) under `:root`/data-attribute scopes; Tailwind bridged with `@theme inline`; **component internals styled with plain CSS files that consume tokens** (shipped as `styles.css`, works with and without Tailwind); utilities used freely in consumer apps, the gallery and `className` overrides | Removes the "consumer must run Tailwind v4 and `@source` our dist" coupling; one CSS artifact serves both consumer types; no prefix/collision issues |
| Charts | **visx 4.0** + `d3-shape`/`d3-scale` directly, behind a Prism chart-spec abstraction; Recharts 3.x is the documented fallback | visx is the only React-first, fully unopinionated SVG layer (gradients, dashed rules, HTML/glass overlays are all yours); maintenance risk is real, so isolate it |
| Gallery / canon | **Storybook 10.6** (React-Vite) + `addon-vitest` (browser mode) + `addon-a11y` (`test: 'error'`) + **Storybook MCP** for the agent; visual regression with **Playwright `toHaveScreenshot`** in the pinned Playwright Docker image on GitHub Actions, baselines in git | Free, deterministic, agent-addressable; Chromatic (5k free snapshots) is an optional later add-on; Lost Pixel is sunset |
| Publishing | pnpm 12 workspaces + catalogs, Changesets 3 with a `fixed` group (one version for the whole system), GitHub Packages via `GITHUB_TOKEN`, **ESM-only** packages built with **tsdown** (tsup is unmaintained), React peer `^19` | Matches the 2026 ecosystem: Storybook 10, Vite 8, Vitest 5 are all ESM-only; every supported Node can `require(esm)` |
| Motion | **Motion 13.2** (MIT core) for JS-driven/gesture motion; **CSS `linear()` springs generated at token-build time** from the same `(duration, bounce)` parameters SwiftUI uses; View Transitions as progressive enhancement | `spring()` emits `duration + linear(...)` strings — springs become tokens, giving true cross-platform motion parity |

---

## 1. Headless / accessible primitive libraries

### 1.1 Base UI (`@base-ui/react`)

- **Version:** 1.8.0, published 2026-09-04 (npm). 1.0 was announced 2026-02-06; the package was renamed from `@base-ui-components/react` to `@base-ui/react` at 1.0 (InfoQ). Release cadence in 2026: 1.5 (May 19), 1.6 (Jun 18), 1.7 (Aug 4), 1.8 (Sep 4).
- **Maintainers / license:** MUI, with contributors from Radix and Floating UI; MIT; 10.8k stars; repo pushed 2026-09-07.
- **Peer deps (npm):** `react ^17 || ^18 || ^19`, `react-dom`, `@types/react`, **and `date-fns ^4` + `@date-fns/tz ^1.2`** — the date-fns peer strongly suggests date components are in progress even though none is documented yet (see Open questions).
- **Component list (llms.txt, 2026-09-08):** Accordion, Alert Dialog, Autocomplete, Avatar, Button, Checkbox, Checkbox Group, Collapsible, Combobox, Context Menu, Dialog, Drawer, Field, Fieldset, Form, Input, Menu, Menubar, Meter, Navigation Menu, Number Field, OTP Field, Popover, Preview Card, Progress, Radio, Scroll Area, Select, Separator, Slider, Switch, Tabs, Toast, Toggle, Toggle Group, Toolbar, Tooltip (36 documented; the llms.txt header says 47 — count discrepancy noted). **Missing vs. RAC/Ark:** Table, Tree, Calendar/DatePicker, ColorPicker, Virtualizer/GridList, TagGroup.
- **Styling approach:** fully unstyled. `className` and `style` accept a string/object **or a function of component state** (`className={(state) => state.checked ? 'on' : 'off'}`); state exposed as data attributes (`[data-checked]`, `[data-open]`, `[data-starting-style]`, `[data-ending-style]`); CSS variables on popups (`--anchor-width`, `--available-height`); composition via the **`render` prop** (`render={<MyButton/>}` or `render={(props, state) => ...}`) — there is no `asChild`. Subpath exports per component (`@base-ui/react/menu`). Requires `isolation: isolate` on the app root for portals.
- **Accessibility statement:** follows WAI-ARIA APG; keyboard support out of the box; "tested on a broad spectrum of browsers, devices, platforms, screen readers" — but **no published matrix**. Focus styling, color contrast and accessible names are left to the consumer.
- **Momentum:** shadcn/ui made Base UI the default for new projects in July 2026 ("1.6.0 with 6M+ weekly downloads"; new projects picked Base UI over Radix 2:1). Radix is explicitly not deprecated there.
- **Agent readiness:** `llms.txt` exists; **no official MCP server** (issue #3322 open since 2025-11-25); community MCPs exist.

### 1.2 React Aria Components (`react-aria-components`)

- **Version:** 1.21.1, published 2026-09-04 (npm); v1.21.0 release notes dated 2026-09-01 (`react-aria` 3.52.x, `react-stately` 3.50.x). v1.20 (2026-07-31) added `PreviewTrigger`; v1.21 added `NavigationTree`, async Menu loading, TokenField range selection, and moved the codebase to **TypeScript 7**.
- **Maintainers / license:** Adobe; **Apache-2.0**; 15.9k stars; repo pushed 2026-09-05. Peer deps `react ^16.8 || ^17 || ^18 || ^19`.
- **Component list (llms.txt):** Button, Checkbox(+Group), RadioGroup, Switch, ToggleButton(+Group), Link, Breadcrumbs, Menu, ComboBox, Select, ListBox, GridList, **Table**, **Tree**, Tabs, Disclosure(+Group), **Calendar, RangeCalendar, DateField, DatePicker, DateRangePicker, TimeField**, NumberField, TextField, SearchField, **ColorArea/Field/Picker/Slider/Swatch/SwatchPicker/Wheel**, Slider, Meter, ProgressBar, TagGroup, Tooltip, Popover, Modal, Toast, Form, Group, Separator, Toolbar, NavigationTree, DropZone, FileTrigger, PreviewTrigger, FocusRing/FocusScope, VisuallyHidden, **Virtualizer**, plus Autocomplete and TokenField (release notes).
- **Styling approach:** unstyled; `className`/`style` accept **render-prop functions** receiving state (`className={({isSelected}) => ...}`) with `defaultClassName` to extend rather than replace; states exposed as `data-hovered`, `data-pressed`, `data-focused`, `data-focus-visible`, `data-selected`, `data-disabled`, `data-entering`/`data-exiting` for animations; CSS vars such as `--trigger-width`. Official Tailwind plugin **`tailwindcss-react-aria-components` 2.2.0** (2026-06-18) — with Tailwind v4 it is loaded via `@plugin` in CSS and lets you write `selected:bg-…` `pressed:…` without the `data-` prefix.
- **Accessibility (published matrix, react-aria.adobe.com/quality):** VoiceOver (macOS Safari/Chrome, iOS), JAWS (Windows Firefox/Chrome), NVDA (Windows Firefox/Chrome), TalkBack (Android Chrome); follows WAI-ARIA and APG; unified mouse/touch/keyboard/AT interactions (`onPress`, `onHoverStart`, `data-pressed`).
- **Internationalization:** "Localized strings for 30+ languages", 40+ locales, RTL keyboard navigation, dates/numbers in many calendar and numbering systems (`@internationalized/date`, `@internationalized/number`). This matters for Prism's mandatory Cyrillic/Russian coverage: DatePicker month names, "Select an option", "Loading…" etc. come localized for free (Russian presence in the built-in list not individually verified — medium confidence).
- **Agent readiness (strongest of the four):** official MCP server `@react-aria/mcp` 1.2.1 (2026-09-01, `npx @react-aria/mcp@latest`), Agent Skills served via `/.well-known` (`npx skills add https://react-aria.adobe.com`), `llms.txt` with per-page `.md` twins.
- **Momentum:** shadcn/ui added React Aria as a "first-class component base" in July 2026 (`--base aria`), alongside Base UI (default) and Radix.

### 1.3 Radix Primitives (`radix-ui`)

- **Version:** 1.6.7 (2026-07-24); `1.7.0-rc` on the `next` tag; last commit 2026-07-31 (`ScrollArea.Content` part). MIT, maintained by **WorkOS**; 19.2k stars; 201 open issues.
- **2026 activity:** releases on Jun 6 (controlled Context Menu, unstable composition parts for form controls, Select exit animations), Jun 30 (React 19 infinite re-render fix), Jul 6 (React 19.2 compat), Jul 20 (`@__PURE__` tree-shaking, per-primitive subpath entry points `radix-ui/accordion`, form-reset sync). Unified `radix-ui` package since 2025-01-22.
- **Status:** alive and maintained, but the ecosystem's center of gravity moved: Base UI is built by ex-Radix authors, shadcn switched its default. Styling via `className` + `asChild` + `data-state`. No i18n layer, no Table/Tree/Date/Color.

### 1.4 Ark UI (`@ark-ui/react`)

- **Version:** 5.39.1 (2026-08-28); weekly cadence (5.38.2 Aug 17, 5.39.0 Aug 21 added `Toc`, `Hotkeys`, `Presence.onEnterComplete`). MIT; Chakra UI team (Segun Adebayo); built on **Zag.js** state machines (`@zag-js/core` 1.43.3); React/Vue/Solid/Svelte; 5.4k stars; peer `react >=18`.
- **Components (docs sidebar):** 50+ incl. Angle Slider, Carousel, Clipboard, Color Picker, Date Picker, Drawer, Editable, File Upload, Floating Panel, Image Cropper, Listbox, Marquee, Navigation Menu, Password Input, Pin Input, QR Code, Rating Group, Scroll Area, Segment Group, Signature Pad, Splitter, Steps, Tags Input, Timer, Tour, Tree View, plus collections (List/Tree/Async) and utilities (Format Number/Byte/Time, Hotkeys, Presence, Focus Trap).
- **Styling approach:** `data-scope` / `data-part` / `data-state` attributes on every element; `asChild`; CSS vars `--layer-index`, `--z-index`; Tailwind via `data-[state=open]:` variants; first-class Panda CSS recipes.
- **Fit:** broadest widget catalog and multi-framework, but the state-machine model is the least "React-native", docs are Panda-centric, and there is no published AT matrix or official MCP.

### 1.5 Recommendation: React Aria Components

Reasons, in priority order for Prism:

1. **A11y "for free" is only as good as the testing behind it.** RAC is the only candidate that publishes which screen readers/browsers/devices each release is tested against; Base UI says "broad spectrum" without a matrix. Prism's a11y story is a contract, so the primitive layer should be the one with the strongest published evidence.
2. **Coverage for the target apps.** The visual references are data-dense dashboards and ops consoles: Table, Tree, GridList with Virtualizer, DatePicker/RangeCalendar, ColorPicker, TagGroup, NavigationTree exist in RAC today and not in Base UI.
3. **Cyrillic is mandatory.** RAC ships localized strings for 30+ languages and Intl-based date/number formatting; Base UI and Radix ship no localization layer.
4. **Agent-first development.** Official MCP + Agent Skills + llms.txt; Storybook MCP on our side plus RAC MCP on the dependency side gives the agent two authoritative sources.
5. **100% visual control with Tailwind ergonomics.** `className` render props + `data-*` attributes + the official Tailwind v4 plugin; the `data-entering`/`data-exiting` model composes with `@starting-style`, Tailwind's `starting:` variant and Motion.

Costs to accept: Apache-2.0 (fine for own apps), larger API surface (`onPress` instead of `onClick`, collection APIs), `react-aria-*` default classNames when you pass none (override with your own `className` — never rely on them), somewhat larger bundle than Base UI. Do not mix two primitive libraries in `@iiiivaska/prism-react`; if a widget is missing (e.g., Splitter, Signature Pad), build it on `react-aria` hooks rather than pulling Ark/Base UI in.

**Fallback:** Base UI if the team prefers Radix-like ergonomics and shadcn compatibility; its API (`render`, function `className`, `data-*`) maps to the same Prism styling conventions, so the component specs would not change — only the implementation package would.

---

## 2. Tailwind CSS v4

### 2.1 Version state and browser floor

- Latest **4.3.3** (2026-07-16). 4.3.0 shipped 2026-05-08 (scrollbar utilities, `@container-size`, `zoom-*`, `tab-*`, stacked/compound `@variant hover:focus {}`, `--default(...)` for functional `@utility`); 4.2 (April 2026) added logical-property utilities (`pbs-*`, `mbs-*`, `inset-s-*`…), `font-features-*`, four palettes, `@tailwindcss/webpack`; 4.1 (2025-04-03) text shadows/masks; 4.0 (2025-01-22). No v5 signal on npm (`next` tag still points at 4.0.0).
- Browser floor for v4: **Chrome 111, Safari 16.4, Firefox 128**; relies on `@property`, `color-mix()`, cascade layers, native nesting, `@starting-style`, `field-sizing`. Sass/Less are explicitly discouraged; CSS Modules "compatible but discouraged".

### 2.2 `@theme`, CSS-first config, tokens as CSS variables

- `@theme { --color-mint-500: oklch(…); }` both creates utilities (`bg-mint-500`) **and** emits a CSS variable under `:root` (v4 blog shows `:root { … }`; the `:root, :host` request in discussion #15556 was not adopted — CHANGELOG has no such entry).
- Namespaces drive utilities: `--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--tracking-*`, `--leading-*`, `--spacing-*` (single `--spacing` multiplier), `--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--blur-*`, `--ease-*`, `--animate-*` (keyframes may live inside `@theme`), `--breakpoint-*`, `--container-*`, `--perspective-*`, `--zoom-*`, `--aspect-*`, `--tab-size-*`.
- Modifiers: `@theme inline` (utility uses the referenced variable's value — required when a theme var references another var), `@theme static` (always emit all variables), `--color-*: initial` to reset a namespace, `--*: initial` to disable the whole default theme.
- Tokens can be shipped as a plain CSS file and imported from npm ("publish them to NPM and import them just like any other third-party CSS files" — docs, Sharing across projects).
- **Recommended theming pattern (shadcn Tailwind-v4 doc and Tailwind discussion #18471):** semantic variables in `:root` / `.dark` / `[data-theme=…]`, then `@theme inline { --color-background: var(--background); }`. Community and maintainers advise against one `@custom-variant` per theme; switch by data attribute and let variables cascade.

### 2.3 Directives and functions that matter for a library

`@import "tailwindcss"` (also `prefix(tw)`, `source(none)`), `@theme`, `@source "../node_modules/@acme/ui-lib"` / `@source not` / `@source inline("{hover:,}bg-red-{50,{100..900..100},950}")`, `@utility`, `@variant` (stacked/compound since 4.3), `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))`, `@apply`, `@reference "../app.css"` (theme/utilities in scoped stylesheets without duplicating output), `--alpha(var(--color-x) / 50%)` → `color-mix(in oklab, …)`, `--spacing(4)`; legacy `@config`/`@plugin`; `theme()` deprecated; `@tailwind` removed. Output uses `@layer theme, base, components, utilities`. Prefix syntax is variant-like: `tw:flex`, and prefixed CSS variables become `--tw-color-*`.

### 2.4 State/variant features useful for Prism components

- Data attributes: boolean shorthand `data-active:` / `data-open:` (matches Base UI's `data-open` and RAC's `data-pressed`), `data-[state=open]:` (Ark/Radix), `aria-checked:`, `group-*`/`peer-*`, `in-*` (implicit parent state), `not-*`, `open:`, `starting:` (`@starting-style`), `motion-reduce:`/`motion-safe:`, `contrast-more:`, `forced-colors:`. `pointer-fine:`/`pointer-coarse:` variants exist for input-modality styling (medium confidence: introduced in 4.1).
- Dark mode: `dark:` defaults to `prefers-color-scheme`; override with `@custom-variant dark (…)` for class or data-attribute strategies. Tailwind does **not** integrate `light-dark()` — use it inside your own `:root` variables if desired.
- Container queries built in: `@container`, `@sm:`…`@7xl:`, `@max-md:`, ranges `@sm:@max-md:`, named `@container/main` + `@sm/main:`, `@container-size` for `cqb/cqh` (4.3), `@min-[475px]:`, `--container-*` theme namespace.

### 2.5 Modern CSS support you can rely on (MDN/caniuse, 2026-09-08)

| Feature | Baseline | First versions | Notes |
|---|---|---|---|
| `color-mix()` | Widely available since May 2023 | — | Tailwind uses it for every `/opacity` modifier |
| `light-dark()` | Newly available May 2024 | Chrome 123 / Firefox 120 / Safari 17.5; 89.9% global | Requires `color-scheme: light dark` on `:root` |
| `@starting-style` | Newly available Aug 2024 | Chrome 117 / Firefox 129 / Safari 17.5 | Place after the main rule (equal specificity) |
| `linear()` easing | Widely available since Dec 2023 | — | Basis for CSS springs |
| Same-document View Transitions | Not Baseline | Chrome 111 / Safari 18 / **Firefox 144**; 91.8% | `document.startViewTransition()` |
| Cross-document View Transitions | Not Baseline | Chrome 126 / Safari 18.2 / Firefox 144 (partial); 87.8% | `@view-transition` |

All are inside Tailwind's own browser floor except View Transitions, which stay progressive enhancement.

### 2.6 Shipping a Tailwind-based component library that consumers can theme

Two viable architectures; the second is recommended for Prism.

**Option A — utility-authored components + consumer-side Tailwind (shadcn-style, but as a package).**
- Consumers on Tailwind v4 must scan your dist. Adam Wathan's stated intended pattern (discussion #18587): the **library ships a CSS file that contains `@source "./dist"` relative to itself**, exposed via a `style`/`exports` entry; consumers simply `@import "@iiiivaska/prism-react/tailwind.css"`. `@source` does not accept bare package names, only paths relative to the stylesheet that contains it; the 18545 thread confirms `@source "../node_modules/<pkg>/dist/**/*.{js,jsx}"` as the manual fallback and warns to target only your own package.
- Non-Tailwind consumers need a **prebuilt CSS** produced with `@tailwindcss/cli` from the library sources (theme variables + only the utilities the components use). Caveats: v4-only consumers; a prebuilt unprefixed utility set can collide with a consumer's Tailwind of a different theme (e.g., a different `--spacing`); `prefix(ds)` avoids collisions but then Tailwind consumers must also enable the same prefix; utility class strings are brittle for visual-regression selectors.

**Option B (recommended) — token-CSS-authored components, Tailwind-optional.**
- `@iiiivaska/prism-tokens-css` ships `tokens.css` (all `--ds-*` variables, scoped by `[data-ds-brand]`, `[data-ds-scheme]`, `[data-ds-density]`, `[data-ds-input]`, with `color-scheme` set) and `tailwind.css` (`@theme inline { --color-surface: var(--ds-color-surface); --radius-card: var(--ds-radius-card); --ease-spring-snappy: var(--ds-ease-spring-snappy); … }`) so Tailwind users get `bg-surface`, `rounded-card`, `ease-spring-snappy`. *(Superseded 2026-09-15: the package is `@iiiivaska/prism-tokens`; the attributes and selectors follow ADR-0019; on the web, brand is build-time, with one `tokens.css` per brand, no `data-ds-brand` and one brand per document (ADR-0020); names follow `tools/tokens/ARCHITECTURE.md` §8 and §9.4.)*
- `@iiiivaska/prism-react` components render `data-slot="button"` + state data attributes (from RAC) and ship **one `styles.css`** written against `--ds-*` variables (`[data-slot=button][data-pressed] { … }`). It contains no Tailwind utilities, so it works identically with and without Tailwind, on any Tailwind major, and it is stable for screenshot tests. Base UI's and RAC's own docs use exactly this vanilla-CSS pattern.
- Consumers with Tailwind: `@import "tailwindcss"; @import "@iiiivaska/prism-tokens-css/tailwind.css"; @import "@iiiivaska/prism-react/styles.css" layer(components);` — placing Prism in the `components` layer means consumer utilities (layer `utilities`, declared later) win, so `className` overrides work with no `!important`.
- Consumers without Tailwind: `@import "@iiiivaska/prism-tokens-css/tokens.css"; @import "@iiiivaska/prism-react/styles.css";` — the file declares its own `@layer ds.tokens, ds.base, ds.components;` so any unlayered consumer CSS overrides it.
- Theming = set data attributes on `<html>` (`data-ds-brand="acme" data-ds-scheme="dark" data-ds-density="compact"`) or override `--ds-*` in a consumer stylesheet. Runtime brand switching needs no rebuild. *(Superseded 2026-09-15 by ADR-0019 and ADR-0020: the attributes are `data-ds-color-scheme`, `-contrast`, `-transparency`, `-density`, `-modality` and `-motion`; brand is build-time on the web, with one `tokens.css` per brand, no `data-ds-brand` and one brand per document; apps do not override `--ds-*` to re-brand.)*
- Agent legibility: each component has `Button.tsx` + `button.css` with selectors that mirror the component contract's state names; parity with SwiftUI style modifiers is direct.
- Tailwind still earns its place: consumers, gallery/docs, layout, and one-off overrides; `@reference` allows `@apply` inside `button.css` during development if wanted (not required).

### 2.7 Accessibility toggles via tokens (web side)

`prefers-color-scheme` → scheme scope; `prefers-reduced-motion` → `motion-reduce:` and `--ds-motion-*` durations collapse to 0 under `@media (prefers-reduced-motion: reduce)`; `prefers-contrast: more` → `contrast-more:` / a `[data-ds-contrast=more]` scope; `forced-colors` → `forced-colors:`; Dynamic Type/Bold Text have no web equivalents beyond `rem`-based type scale and `font-weight` tokens; `prefers-reduced-transparency` exists in Chromium but Safari/Firefox support is unverified (open question) — gate glass on `[data-ds-transparency=reduce]` set from JS `matchMedia` plus the media query.

> **Superseded 2026-09-15** by ADR-0019, ADR-0022 and ADR-0023: the attributes are `data-ds-color-scheme`, `-contrast`, `-transparency`, `-density`, `-modality` and `-motion`; brand per ADR-0020; Safari cannot report Reduce Transparency and Prism does not guess it (glass falls back under Increase Contrast per ADR-0022); Reduce Motion never collapses durations to 0 (ADR-0023 §8).

---

## 3. Charts on the web

| Library | Latest / date | License | Activity | Custom styling | SSR |
|---|---|---|---|---|---|
| **visx** (`@visx/*`) | 4.0.0 / 2026-06-11 | MIT | 21k stars; last commit 2026-06-22; 149 open issues; v4 sat in alpha from Nov 2025 to Jun 2026 with "radio silence" complaints (discussion #1908) | Total — every mark is an SVG element you own; `@visx/gradient`, `@visx/pattern`, `strokeDasharray` on `LinePath`/`Line`; tooltips are HTML (`@visx/tooltip`, `useTooltipInPortal`) so glass/backdrop-filter overlays are trivial | Pure SVG renders on the server given explicit `width`/`height`; `ParentSize`/`useParentSize` are DOM-measured (client only); v4 fixed ESM `.js` extensions and adds `esm/package.json` `type: module` for Vite SSR/Deno/edge |
| `d3-shape` / `d3-scale` | 3.2.0 (2022-12-20) / 4.0.2 (2021-09-24) | ISC | Stable; ESM-only since D3 7 (2021-06-11) | Generators only (`line()`, `area()`, `arc()`, curves) — you render | Trivial (no DOM) |
| Recharts | 3.10.1 / 2026-07-25 | MIT | 27.5k stars; pushed 2026-09-08; 3.0 rewrote state management, "thousands of tests", 3.9 custom animations; docs at recharts.github.io | High but declarative: `<defs><linearGradient>` for fills, `strokeDasharray` on `ReferenceLine`, custom shape render props; glass via HTML `Tooltip` content | SVG renders on server; `ResponsiveContainer` uses ResizeObserver with `initialDimension` `{-1,-1}` — pass fixed sizes or `initialDimension` for SSR (no official SSR page; medium) |
| Nivo | 0.99.0 / 2025-05-23 | MIT | Commits through 2026-07-21 but no release in 15+ months | Theme-object driven; less free-form | SVG flavours render on server |
| Observable Plot | 0.6.17 / 2025-02-14 | ISC | Commits through 2026-09-01; no release in 19 months; pre-1.0 | Mark options only; imperative `Plot.plot()` returns an SVG element — not React components | `document` option + `toHyperScript()` with React's virtual DOM, "only practical for simple plots of small data" (docs) |

**Recommendation:** keep the decision (visx + d3), with mitigations:
- Put all chart code in `@iiiivaska/prism-charts` behind a **chart spec** (marks: line/area/bar/point/rule/annotation; scales; axes; legends) that mirrors the Swift Charts implementation; visx is an implementation detail, so a swap to Recharts 3 (the most active alternative) would not change the contract.
- Prefer `d3-shape`/`d3-scale` directly wherever visx only wraps them (`@visx/shape` wraps d3-shape 3; `@visx/scale` wraps d3-scale 4); use visx for `Axis`, `Grid`, `Group`, `Gradient`/`Pattern`, `Tooltip`, `Responsive`, `Text`, `XYChart` only where it saves real code.
- SSR rule: every Prism chart takes explicit `width`/`height` props or a `ChartFrame` that renders a server-side fallback size from the density token and upgrades with `ResizeObserver` (or container queries for layout around the chart).
- Style hooks: gradients (`LinearGradient` in `<defs>` fed from `--ds-*` via `var()` in `stop-color`), dashed target/reference rules (`strokeDasharray` token, e.g. `--ds-chart-dash-target: 4 4`), thin large numerals via HTML overlays not SVG text, glass panels as HTML siblings over the SVG (SVG `backdrop-filter` is inconsistent across engines — medium confidence).
- Pin `@visx/* ^4.0.0` across the board (mixed majors break); React 18/19 only.

---

## 4. Component gallery / living canon and visual regression

### 4.1 Gallery options

- **Storybook 10.6.0** (2026-09-02; 10.0 shipped 2025-10-28). ESM-only, requires Node **20.16+ / 22.19+ / 24+**; Vitest 4 support; CSF Factories (type-safe, React) in Preview and slated to become the default in **Storybook 11** ("next Spring" per the 10.0 post; `v11.0.0-alpha.0` published 2026-09-02). **10.3 (2026-04-06) added the Storybook MCP server for React** so agents can "query your design system components, use them to build a high-quality UI, and correct its own mistakes using fast component tests" (dev/docs/test toolsets), plus a large a11y pass on Storybook's own UI and Vite 8 support. `@storybook/addon-vitest` runs stories as Vitest browser-mode tests in Playwright Chromium (peer `vitest ^3 || ^4` at 10.6.0 — **Vitest 5.0.0 shipped 2026-09-03 and is not yet in range**); `@storybook/addon-a11y` runs axe-core and fails CI when `parameters.a11y.test = 'error'` (color-contrast rule configurable via `parameters.a11y.config`). The old Jest/Playwright `@storybook/test-runner` README now points users to the Vitest addon.
- **Ladle 5.1.1** (2025-11-04): Vite 6/React 19/Node 22, CSF-compatible, fast; but only CI commits since (last 2026-06-28), React-only, thin addon ecosystem, no MCP, no Vitest integration. Fine as a lightweight viewer, not as the canon.
- **Custom Vite gallery:** cheapest to start, but you re-implement controls, docs, a11y panel, story indexing and test integration; recommended only as a public "showcase" site built from the same stories (Storybook static build already covers this).

### 4.2 Visual regression

- **Playwright `toHaveScreenshot`** (1.63.0, 2026-09-04): defaults `animations: "disabled"`, `caret: "hide"`, `scale: "css"`, `threshold: 0.2`; `maxDiffPixels`/`maxDiffPixelRatio`, `mask`, `stylePath`, `fullPage`, `clip`. Baselines are named per browser+platform (`…-chromium-linux.png`), so generate and compare inside the **pinned Docker image `mcr.microsoft.com/playwright:v1.63.0-noble`** (docs: rendering varies by OS/hardware; pin the image to the project's Playwright version).
- **Chromatic**: Free $0 — 5,000 snapshots/month, Chrome only, unlimited users/projects; Starter $179/mo (35k, all browsers); Pro $399/mo; open-source program on request. Official Storybook "Visual Tests" addon is Chromatic.
- **Argos**: Hobby free 5,000 screenshots/month; Pro $100/mo (35k; $0.0015 per extra Storybook screenshot).
- **Lost Pixel**: team joined Figma, product sunset announced 2026-04-22; last npm release 3.22.0 (2024-11-14); OSS mode unmaintained — **do not adopt**.

### 4.3 Recommendation for a solo dev + agent on GitHub Actions

1. Storybook 10.x with `@storybook/react-vite`, `addon-docs`, `addon-a11y` (`test: 'error'`), `addon-vitest` (browser mode) and the **Storybook MCP** enabled in dev; stories are the executable spec examples. Keep on Vitest 4 until the addon lists 5.
2. Visual regression in-repo: `storybook build` → serve `storybook-static` → a Playwright suite that reads `index.json`, opens `iframe.html?id=<story>&viewMode=story` for every story tagged `vrt`, and runs `toHaveScreenshot` in a matrix of `data-ds-scheme` × `data-ds-density` × viewport, inside the pinned Playwright container. Baselines committed (Git LFS if they grow). Zero vendor cost, fully reproducible locally with the same image, and the agent can update baselines with `--update-snapshots` in a PR that reviewers diff.
3. Add Chromatic's free tier later only if cross-browser (Safari/Firefox) review UI becomes worth $179/mo; the Storybook build is the same.
4. Contrast in CI: axe `color-contrast` via `addon-a11y` for functional text, plus a token-level contrast test (APCA/WCAG computed from the DTCG JSON) so the 3:1 large-numeral exception is encoded as data, not as axe overrides.

---

## 5. Publishing and build

### 5.1 Workspace and release tooling

- **pnpm 12.3.4** (2026-09-04). `pnpm-workspace.yaml` `packages:` globs; `workspace:*|~|^` rewritten to real ranges on `pnpm publish`/`pack`; **catalogs** (`catalog:` protocol, default + named) also replaced on publish. Since **pnpm 11.13.0 (2026-07-13)** pnpm has native `pnpm change` / `pnpm change status` / `pnpm version -r` that read/write changesets-compatible `.changeset/*.md`.
- **Changesets CLI 3.0.2** (2026-09-04). 3.0.0 (2026-08-11) breaking: `changeset tag` renamed to `changeset git-tag`; Node `^22.11 || ^24 || >=26`; `engines` requires pnpm ≥10; **`changeset version` now exits 1 when there are no pending changesets** (CI scripts must handle it). pnpm's guide: `pnpm changeset` → `pnpm changeset version` → `pnpm install` → `pnpm publish -r`, automated with `changesets/action`. For Prism's "one version for the whole system" use `"fixed": [["@iiiivaska/prism-*"]]` in `.changeset/config.json` (or pnpm's native fixed groups).
- **GitHub Packages (npm):** scoped packages only (`@iiiivaska/...`, lowercase), scope must equal the owner; `.npmrc` for consumers: `@iiiivaska:registry=https://npm.pkg.github.com` + `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`; `publishConfig.registry` in package.json; `repository.url` must match; packages private by default and inherit repo permissions; in Actions use `permissions: packages: write`, `actions/setup-node` with `registry-url: https://npm.pkg.github.com` and `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`; npm CLI 9+ needs `--auth-type=legacy` for interactive `npm login`; 256 MB tarball limit. Provenance/trusted publishing (OIDC, npm CLI ≥11.5.1, multiple configs since 2026-09-03) is documented for **npmjs.com only**; the GitHub Packages docs do not mention provenance — assume unsupported there (medium). Consumer friction: every consuming app and its CI needs a `read:packages` token.

### 5.2 Module format and bundler

- **ESM-only is the 2026 default**: Node 22.12 LTS enabled `require(esm)` (2024-12-05) and it was backported to 20.19; every supported Node can now `require()` an ES module; 65–80% of new packages are ESM-first. Storybook 10, Vite 7/8 (Node 20.19+/22.12+) and Vitest are ESM-only. Ship `"type": "module"`, an `exports` map with `types` first, `sideEffects: ["**/*.css"]`, no CJS.
- **tsup is unmaintained** (README: "not actively maintained anymore… consider using tsdown"; last release 8.5.1, 2025-11-12). **tsdown 0.23.0** (2026-09-03; VoidZero; Rolldown-based; pre-1.0 but the officially recommended successor): `defineConfig({ entry: ['./src/index.ts'], platform: 'neutral', dts: true })` is the documented React-library recipe; JSX handled natively; CSS bundling, `exports` generation and publint/attw validation built in. **Vite 8.2.2** (Vite 8 GA 2026-03-12: Rolldown replaces esbuild+Rollup, `build.rolldownOptions`) — its own docs recommend tsdown/Rolldown for libraries; use Vite for apps/gallery only.
- **TypeScript 7.0.2** (Go-native compiler; GA 2026-07-08, GitHub tag 2026-08-20). React Aria already builds on it; verify tsdown's dts pipeline against TS 7 before adopting (open question).

### 5.3 React 19 features relevant to a design system

- **React 19.2.8** is the latest stable (2026-07-21); 19.2 (2025-10-01) added `<Activity>`, `useEffectEvent`, `cacheSignal`, Performance Tracks, partial pre-rendering; no 19.3/20 stable (19.3 canaries exist).
- For Prism: `ref` **as a normal prop** (drop `forwardRef` everywhere; codemod available; `forwardRef` to be removed); **ref cleanup functions**; `use(promise | Context)` incl. conditional reads; **Actions** — `<form action={fn}>`, `useActionState`, `useOptimistic`, and **`useFormStatus` (react-dom), which the React team calls out specifically for design-system buttons/inputs** that need pending state without prop drilling; `<Context value>` as provider; document metadata hoisting; **stylesheet `precedence`** (`<link rel="stylesheet" precedence="…">`) which lets a component (or the Prism provider) declare its CSS and have React dedupe/order it; full custom-elements support (relevant if a web-component wrapper is ever wanted).
- Peer range: `react ^19` (RAC/Base UI/Motion/visx all support 18 and 19, but consumers are the owner's apps — no reason to test 18).

---

## 6. Motion on the web

- **Motion 13.2.0** (2026-09-02; `framer-motion` is the alias package at the same version). Core is **MIT**; Motion+ (Carousel, Ticker, cursor effects) is paid. 13.0 (2026-08-05) removed the `@emotion/is-prop-valid` dependency (`<MotionConfig isValidProp>` instead); 13.1 multidimensional `Reorder`; 13.1.1 React 19 strict-mode fixes; 13.2 `animate.addEffect()` and a smaller/faster `spring`; 12.41 moved `animateView` (View Transitions helper) into the main library; 12.43 hardware-accelerated `backgroundColor` and SVG. Peer `react ^18 || ^19`.
- **Springs:** physics (`stiffness`, `damping`, `mass`, `velocity`) or duration-based (`duration`, `bounce`, `visualDuration`). The standalone **`spring()` generator has `toString()` returning `"<duration>ms linear(...)"`**, with the shorthand `spring(visualDuration, bounce)`; e.g. `transition: transform ${spring(0.5, 0.2)}` → `transform 800ms linear(…)`. It works inline, in CSS-in-JS and in RSC — i.e. **springs can be pre-generated at build time with no runtime**. The Motion AI Kit / `/motion` skill do the same from natural language.
- **CSS `linear()`** is Baseline widely available (Dec 2023); **`@starting-style`** (Aug 2024) covers enter transitions for popovers/dialogs (`starting:` variant in Tailwind; RAC `data-entering`, Base UI `data-starting-style`).
- **View Transitions:** same-document in Chrome 111 / Safari 18 / Firefox 144 (91.8%); cross-document Chrome 126 / Safari 18.2 / Firefox 144 partial (87.8%); MDN marks `@view-transition` as not Baseline. Use `document.startViewTransition` (or Motion's `animateView`) behind feature detection; React's own `<ViewTransition>` is not in a stable release (low confidence — verify before relying on it).
- Reduced motion: `MotionConfig reducedMotion="user"` / `useReducedMotion` on the JS side and `motion-reduce:` / `@media (prefers-reduced-motion)` on the CSS side (medium — docs not re-fetched).

**Recommendation:** define motion tokens as `(visualDuration, bounce)` pairs in the DTCG source (the same two numbers SwiftUI's `.spring(duration:bounce:)` takes), have the token build emit `--ds-ease-<name>: linear(…)` + `--ds-duration-<name>` via `spring().toString()`, and expose them through `@theme inline` as `ease-spring-*`. Use Motion only where CSS cannot: gestures, drag/reorder, layout animations, interruptible springs, `AnimatePresence` for RAC/Base UI popups that unmount.

---

## 7. Proposed `web/` layout for Prism

```
/                                   # monorepo root (Package.swift already lives here)
├─ Package.swift
├─ package.json                     # private; pnpm workspace root; scripts: build, test, vrt, release
├─ pnpm-workspace.yaml              # packages: ["tokens", "web/packages/*", "web/apps/*", "web/tooling/*"]; catalog: react, typescript, vitest, storybook…
├─ .changeset/config.json           # fixed: [["@iiiivaska/prism-*"]]  → one version for the whole system
├─ .npmrc                           # @iiiivaska:registry=https://npm.pkg.github.com
├─ tokens/                          # DTCG JSON source + Style Dictionary build (owned by the tokens track)
│   └─ build/ → emits into web/packages/tokens-css/dist and swift/ sources
└─ web/
   ├─ packages/
   │  ├─ tokens-css/      @iiiivaska/prism-tokens-css
   │  │   dist/tokens.css      # all --ds-* vars; scopes [data-ds-brand|scheme|density|input]; color-scheme; @layer ds.tokens
   │  │   dist/tailwind.css    # @theme inline bridge (+ @custom-variant dark/density/…); import after "tailwindcss"
   │  │   dist/tokens.js/.d.ts # typed token object for JS consumers/charts (ESM)
   │  │   dist/motion.css      # --ds-ease-* linear() springs generated with motion's spring()
   │  ├─ react/           @iiiivaska/prism-react   (RAC-based components; Button.tsx + button.css; data-slot attrs)
   │  │   exports: ".", "./<component>", "./styles.css" (+ "style" field); sideEffects: ["**/*.css"]
   │  ├─ charts/          @iiiivaska/prism-charts  (visx + d3-shape/scale behind the chart spec; ChartFrame; theme from tokens.js)
   │  ├─ icons/           @iiiivaska/prism-icons   (semantic registry → @phosphor-icons/react; weight from --ds-icon-weight; IconContext provider)
   │  ├─ motion/          @iiiivaska/prism-motion  (spring presets typed from tokens, reduced-motion hooks, view-transition helper) — may fold into react
   │  └─ spec/            @iiiivaska/prism-spec    (versioned component contracts as JSON + zod; consumed by the CI parity report and by stories)
   ├─ apps/
   │  ├─ gallery/         Storybook 10.6 (react-vite, addon-docs, addon-a11y test:'error', addon-vitest, MCP); stories import from packages via workspace:
   │  └─ vrt/             Playwright suite: enumerates storybook-static/index.json, screenshots per scheme×density×viewport in the pinned Docker image
   └─ tooling/
      ├─ tsconfig/        @iiiivaska/prism-tsconfig (private)
      ├─ tsdown-config/   shared defineConfig({ platform:'neutral', dts:true, external: [/^react/] })
      └─ eslint-config/   (private)
```

> **Superseded 2026-09-15.** Generated web output is committed under `web/packages/tokens/src/generated` in `@iiiivaska/prism-tokens` (ADR-0024 §11, `tools/tokens/ARCHITECTURE.md` §9.0), with one `tokens.css` per brand and no brand scope (ADR-0020), the ADR-0019 attributes, and `motion.css` springs sampled from Motion's physics generator rather than `spring()` (ADR-0023). The React wrapper is `Icon` and the map `iconRegistry` (ADR-0019 §6); components render `data-ds-slot`.

Package.json essentials for a published package:

```json
{
  "name": "@iiiivaska/prism-react",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./button": { "types": "./dist/button/index.d.ts", "default": "./dist/button/index.js" },
    "./styles.css": "./dist/styles.css",
    "./package.json": "./package.json"
  },
  "style": "./dist/styles.css",
  "peerDependencies": { "react": "^19", "react-dom": "^19" },
  "dependencies": { "react-aria-components": "catalog:" },
  "repository": { "type": "git", "url": "https://github.com/iiiivaska/<repo>.git" },
  "publishConfig": { "registry": "https://npm.pkg.github.com", "access": "restricted" },
  "engines": { "node": ">=22.12" }
}
```

Consumer setup:

```css
/* app.css — Tailwind consumer */
@import "tailwindcss";
@import "@iiiivaska/prism-tokens-css/tailwind.css";
@import "@iiiivaska/prism-react/styles.css" layer(components);

/* app.css — non-Tailwind consumer */
@import "@iiiivaska/prism-tokens-css/tokens.css";
@import "@iiiivaska/prism-react/styles.css";
```

```html
<html data-ds-brand="default" data-ds-scheme="dark" data-ds-density="regular" data-ds-input="pointer">
```

> **Superseded 2026-09-15** by ADR-0019 and ADR-0020: `<html>` carries only the user's explicit choices, as `data-ds-color-scheme`, `data-ds-contrast`, `data-ds-transparency`, `data-ds-density`, `data-ds-modality` and `data-ds-motion` (`<Theme>` or `rootAttributes()` writes them); there is no brand attribute, and a document imports one brand's `tokens.css` from `@iiiivaska/prism-tokens`.

CI (GitHub Actions) outline: `pnpm install --frozen-lockfile` → `tokens build` → `tsdown` all packages → `tsc -b` (TS 7) → `vitest --project storybook` (component + a11y tests in Chromium) → `storybook build` → VRT job in `mcr.microsoft.com/playwright:v1.63.0-noble` → parity report (`prism-spec` vs Swift + React stories) → `changesets/action` opens the version PR; on merge `pnpm publish -r` with `NODE_AUTH_TOKEN=${{ secrets.GITHUB_TOKEN }}` and `permissions: packages: write`.

---

## 8. Facts table

Confidence: **high** = read on the official page/registry/API today; **medium** = official but partially rendered, or reputable secondary; **low** = inferred.

| # | Claim | Source | Confidence |
|---|---|---|---|
| 1 | `@base-ui/react` latest 1.8.0, published 2026-09-04, MIT; peer deps react ^17‖^18‖^19, date-fns ^4, @date-fns/tz ^1.2 | npm registry (`npm view`), https://www.npmjs.com/package/@base-ui/react | high |
| 2 | Base UI 2026 releases: 1.5 (May 19), 1.6 (Jun 18, OTPField stable, Drawer.VirtualKeyboardProvider), 1.7 (Aug 4), 1.8 (Sep 4, Combobox `createItems`) | https://base-ui.com/react/overview/releases | high |
| 3 | Base UI 1.0 announced 2026-02-06; package renamed from `@base-ui-components/react`; maintained by MUI with Radix/Floating UI contributors; "detached triggers" feature | https://infoq.com/news/2026/02/baseui-v1-accessible/ | medium |
| 4 | Base UI documented component list (36 names incl. Autocomplete, Combobox, Drawer, Menubar, Navigation Menu, OTP Field, Toast); no Table/Tree/DatePicker/ColorPicker | https://base-ui.com/llms.txt | high |
| 5 | Base UI styling: `className`/`style` accept functions of state; data attributes like `[data-checked]`; CSS vars `--anchor-width`, `--available-height` | https://base-ui.com/react/handbook/styling | high |
| 6 | Base UI composition uses `render` prop (element or `(props, state) => …`), no `asChild`; `mergeProps`, `useRender` utilities | https://base-ui.com/react/handbook/composition | high |
| 7 | Base UI animation attributes `[data-starting-style]`, `[data-ending-style]`, `[data-open]`, `[data-closed]`; Motion integration via `AnimatePresence` + `keepMounted` | https://base-ui.com/react/handbook/animation | high |
| 8 | Base UI requires `isolation: isolate` on app root for portals | https://base-ui.com/react/overview/quick-start | high |
| 9 | Base UI a11y: follows WAI-ARIA APG; "tested on a broad spectrum of… screen readers"; focus styling/contrast/names left to developer; no matrix published | https://base-ui.com/react/overview/accessibility | high |
| 10 | Base UI official MCP server requested, issue open since 2025-11-25, no maintainer response visible | https://github.com/mui/base-ui/issues/3322 | medium |
| 11 | shadcn/ui: Base UI default for new projects (July 2026); "1.6.0 with 6M+ weekly downloads"; Radix not deprecated; `asChild` vs `render` difference | https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default | high |
| 12 | shadcn/ui: React Aria is a first-class base (`--base aria`) since July 2026, Base UI remains default | https://ui.shadcn.com/docs/changelog/2026-07-react-aria | high |
| 13 | `react-aria-components` 1.21.1 published 2026-09-04, Apache-2.0; peer react ^16.8‖^17‖^18‖^19 | npm registry | high |
| 14 | RAC v1.21.0: NavigationTree, Menu async loading (`MenuLoadMoreItem`, `renderEmptyState`), TokenField `selectedRange`, TypeScript 7; react-aria 3.52.0, react-stately 3.50.0 | https://react-aria.adobe.com/releases/v1-21-0 | high |
| 15 | RAC v1.20.0 (2026-07-31) added PreviewTrigger | https://react-aria.adobe.com/releases/v1-20-0 (via search summary) | medium |
| 16 | RAC full component list incl. Table, Tree, GridList, Calendar/DatePicker family, Color* family, Virtualizer, Toast, Drop Zone | https://react-aria.adobe.com/llms.txt | high |
| 17 | RAC styling: `className`/`style` render-prop functions, `defaultClassName`; data attributes `data-hovered/pressed/focused/selected/disabled`, `data-entering/exiting`; `--trigger-width`; Tailwind plugin removes `data-` prefix, loaded via CSS on v4 | https://react-aria.adobe.com/styling | high |
| 18 | `tailwindcss-react-aria-components` 2.2.0 (2026-06-18) | npm registry | high |
| 19 | RAC AT matrix: VoiceOver (macOS Safari/Chrome, iOS), JAWS (Win Firefox/Chrome), NVDA (Win Firefox/Chrome), TalkBack (Android Chrome); WAI-ARIA + APG; localized strings for 30+ languages, 40+ locales; RTL; many calendars/numbering systems | https://react-aria.adobe.com/quality | high |
| 20 | RAC agent tooling: `@react-aria/mcp` 1.2.1 (2026-09-01), `npx @react-aria/mcp@latest`; Agent Skills via `npx skills add https://react-aria.adobe.com`; llms.txt with `.md` twins | https://react-aria.adobe.com/mcp, npm registry | high |
| 21 | `radix-ui` 1.6.7 published 2026-07-24, MIT; `1.7.0-rc` on `next`; last commit 2026-07-31 | npm registry; GitHub API | high |
| 22 | Radix 2026 releases (Jun 6, Jun 30, Jul 6, Jul 20): controlled ContextMenu, unstable form-control parts, Select exit animations, React 19/19.2 fixes, `@__PURE__`, per-primitive subpaths `radix-ui/accordion`; unified package since 2025-01-22 | https://www.radix-ui.com/primitives/docs/overview/releases | high |
| 23 | Radix maintained by WorkOS, MIT, 19.2k stars, 201 open issues | https://github.com/radix-ui/primitives | high |
| 24 | `@ark-ui/react` 5.39.1 (2026-08-28), MIT, peer react >=18; 5.39.0 added Toc, Hotkeys, Presence.onEnterComplete; 5.38.2 patched XSS in Tags Input | npm registry; https://github.com/chakra-ui/ark/releases | high |
| 25 | Ark UI built on Zag.js state machines; React/Solid/Vue/Svelte; 40+ components; Chakra team; MIT | https://ark-ui.com/docs/overview/about | high |
| 26 | Ark styling via `data-scope`/`data-part`/`data-state`, Tailwind `data-[state=open]:`, Panda recipes, `--layer-index`/`--z-index` | https://ark-ui.com/docs/guides/styling | high |
| 27 | Ark component list (Angle Slider … Tree View, collections, utilities) | https://ark-ui.com/docs/components/accordion (sidebar) | high |
| 28 | LogRocket (Mar 2026) comparison recommendations: Radix mature; React Aria when a11y critical; Ark multi-framework; Base UI for custom DS long-term | https://blog.logrocket.com/headless-ui-alternatives/ | medium |
| 29 | Tailwind CSS latest 4.3.3 (2026-07-16); 4.3.0 2026-05-08; `next` tag still 4.0.0 | npm registry; https://tailwindcss.com/blog/tailwindcss-v4-3 | high |
| 30 | Tailwind v4.3 features: scrollbar utilities, `@container-size`, `zoom-*`, `tab-*`, stacked/compound `@variant`, `--default(...)`; v4.2: logical properties, `font-features-*`, webpack loader, four palettes | https://tailwindcss.com/blog/tailwindcss-v4-3 | high |
| 31 | Tailwind v4 browser floor Chrome 111 / Safari 16.4 / Firefox 128; uses `@starting-style`, `color-mix()`, nesting, `field-sizing`; Sass discouraged; CSS Modules discouraged | https://tailwindcss.com/docs/compatibility | high |
| 32 | `@theme` semantics, namespaces, `inline`/`static`, `--color-*: initial`, `--*: initial`, keyframes in theme, sharing theme CSS via npm | https://tailwindcss.com/docs/theme | high |
| 33 | Directives/functions: `@source` (+`inline()`, `not`), `@utility`, `@variant`, `@custom-variant`, `@reference`, `@config`, `@plugin`, `--alpha()`, `--spacing()`, `theme()` deprecated, `@tailwind` removed | https://tailwindcss.com/docs/functions-and-directives | high |
| 34 | v4 output uses `@layer theme, base, components, utilities`; `@property` registered custom properties; `color-mix(in oklab…)` for opacity; oklch palette; theme vars emitted under `:root`; `starting:` and `not-*` variants; container queries in core | https://tailwindcss.com/blog/tailwindcss-v4 | high |
| 35 | No `:root, :host` emission change in CHANGELOG (only Preflight `html` includes `:host`); request remains a discussion | https://github.com/tailwindlabs/tailwindcss/blob/main/CHANGELOG.md; https://github.com/tailwindlabs/tailwindcss/discussions/15556 | medium |
| 36 | Dark mode: media-query default; `@custom-variant dark (&:where(.dark, .dark *))` or data-attribute form; no `light-dark()` integration mentioned | https://tailwindcss.com/docs/dark-mode | high |
| 37 | Container queries syntax: `@container`, `@md:`, `@max-md:`, `@sm:@max-md:`, `@container/name`, `@sm/name:`, `@container-size`, `@min-[475px]:`, `--container-*` | https://tailwindcss.com/docs/responsive-design | high |
| 38 | `@source` paths relative to stylesheet; node_modules ignored by default; `@source not`; `source(none)`; brace-expansion safelists | https://tailwindcss.com/docs/detecting-classes-in-source-files | high |
| 39 | Data-attribute variants: `data-active:` boolean shorthand, `data-[size=large]:`, `@custom-variant data-checked (&[data-ui~="checked"])`, `aria-*`, `group-aria-[…]`, `starting:`, `open:`, `not-*`, `in-*` | https://tailwindcss.com/docs/hover-focus-and-other-states | high |
| 40 | Prefix: `@import "tailwindcss" prefix(tw)`, classes `tw:flex`, variables `--tw-color-*`; important is trailing `!`; `@reference` for scoped stylesheets | https://tailwindcss.com/docs/upgrade-guide | high |
| 41 | Adam Wathan: intended pattern is the library's own CSS file containing `@source` relative to itself, exported as `style`, consumers `@import` it; `@source` does not accept bare package names | https://github.com/tailwindlabs/tailwindcss/discussions/18587 | high |
| 42 | Distributing Tailwind component libs: `@source "../node_modules/<pkg>/dist/**/*.{js,jsx,ts,tsx}"`; consumers must be on v4; target only your package | https://github.com/tailwindlabs/tailwindcss/discussions/18545 | medium |
| 43 | Theme extension libraries export `theme.css`/`main.css` via package.json `exports`; bundle fonts/assets | https://github.com/tailwindlabs/tailwindcss/discussions/18372 | medium |
| 44 | Theming best practice: semantic vars in `:root`/`[data-theme]`, `@theme inline` mapping, avoid per-theme custom variants | https://github.com/tailwindlabs/tailwindcss/discussions/18471 | medium |
| 45 | shadcn v4 pattern: `:root`/`.dark` semantic vars, `@theme inline { --color-background: var(--background) }`, oklch, `@layer base`, `data-slot` attributes | https://ui.shadcn.com/docs/tailwind-v4 | high |
| 46 | `light-dark()` Baseline newly available May 2024; needs `color-scheme: light dark`; Chrome 123 / Firefox 120 / Safari 17.5; 89.9% | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark; https://caniuse.com/mdn-css_types_color_light-dark | high |
| 47 | `@starting-style` Baseline Aug 2024; Chrome 117 / Firefox 129 / Safari 17.5 | https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style (versions from search summary) | medium |
| 48 | `linear()` easing Baseline widely available since Dec 2023 | https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear | high |
| 49 | `color-mix()` Baseline widely available since May 2023 | https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix | high |
| 50 | Same-document View Transitions: Chrome 111, Edge 111, Safari 18, Firefox 144; 91.75% global | https://caniuse.com/view-transitions | high |
| 51 | Cross-document View Transitions: Chrome 126, Safari 18.2, Firefox 144 partial; 87.78%; MDN: not Baseline | https://caniuse.com/cross-document-view-transitions; https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API | high |
| 52 | visx 4.0.0 released 2026-06-11 (all `@visx/*` at 4.0.0, MIT); React 18‖19 peer; d3-shape/d3-path 3; prop-types/lodash removed; ESM `.js` extensions + `esm/package.json`; deep imports blocked by `exports`; IE11 dropped | https://github.com/airbnb/visx/releases; https://github.com/airbnb/visx/blob/master/MIGRATION.md; npm registry | high |
| 53 | visx maintenance: alpha from Nov 2025 to Jun 2026, "radio silence" complaints, users migrating; last commit 2026-06-22; 149 open issues; 21k stars | https://github.com/airbnb/visx/discussions/1908; GitHub API | high |
| 54 | visx philosophy: "largely unopinionated and is meant to be built upon"; no bundled animation lib | https://github.com/airbnb/visx | high |
| 55 | `d3-shape` 3.2.0 (2022-12-20), `d3-scale` 4.0.2 (2021-09-24), ISC; D3 7 adopted `type: module` (ESM-only) 2021-06-11 | npm registry; https://github.com/d3/d3/releases/tag/v7.0.0 | high |
| 56 | Recharts 3.10.1 (2026-07-25), MIT, 27.5k stars, pushed 2026-09-08; 3.0 rewrote state management; 3.9 custom animations; docs at recharts.github.io | npm registry; https://github.com/recharts/recharts/issues/7355 | high |
| 57 | Recharts `ResponsiveContainer` uses ResizeObserver; `initialDimension` default `{width:-1,height:-1}`; no explicit SSR guidance | https://recharts.github.io/en-US/api/ResponsiveContainer | medium |
| 58 | `@nivo/core` 0.99.0 (2025-05-23), MIT; commits through 2026-07-21; no newer release | npm registry; GitHub API | high |
| 59 | `@observablehq/plot` 0.6.17 (2025-02-14), ISC; commits through 2026-09-01; SSR via `document` option + `toHyperScript()`, "only practical for simple plots of small data" | npm registry; GitHub API; https://observablehq.github.io/plot/getting-started | high |
| 60 | Storybook latest 10.6.0 (2026-09-02); `v11.0.0-alpha.0` prerelease 2026-09-02 (empty release body) | npm registry; GitHub API | high |
| 61 | Storybook 10.0 (2025-10-28): ESM-only, Node 20.16+/22.19+/24+, 29% smaller install, CSF Factories Preview → default in Storybook 11 "next Spring", Vitest 4 + Next 16 support, `sb.mock` | https://storybook.js.org/blog/storybook-10/ | high |
| 62 | Storybook 10.3 (2026-04-06): Storybook MCP for React (dev/docs/test toolsets), a11y violations 2,728→1,249, Vite 8, Next 16.2, CSF Factories for Vue/Angular/WC | https://storybook.js.org/blog/storybook-10-3/ | high |
| 63 | `@storybook/addon-vitest` 10.6.0 peer: `vitest ^3 ‖ ^4`, `@vitest/browser-playwright ^4`; Vitest 5.0.0 published 2026-09-03 | npm registry | high |
| 64 | Vitest addon runs stories in Playwright Chromium browser mode; requires Vitest ≥3 and a Vite-based framework; integrates a11y + coverage | https://storybook.js.org/docs/writing-tests/integrations/vitest-addon | high |
| 65 | a11y addon = axe-core; `parameters.a11y.test: 'error' | 'todo' | 'off'`; rules via `parameters.a11y.config` | https://storybook.js.org/docs/writing-tests/accessibility-testing | high |
| 66 | Storybook visual testing doc covers only the Chromatic Visual Tests addon (+ Vitest widget integration) | https://storybook.js.org/docs/writing-tests/visual-testing | high |
| 67 | `@storybook/test-runner` README recommends the Vitest addon for Vite projects | https://github.com/storybookjs/test-runner | high |
| 68 | Ladle 5.1.1 published 2025-11-04; 5.0 = Vite 6/React 19/Node 22; last commit 2026-06-28 (CI/OIDC) | npm registry; GitHub API; https://github.com/tajo/ladle/releases | high |
| 69 | Playwright 1.63.0 (2026-09-04); `toHaveScreenshot` defaults `animations:"disabled"`, `caret:"hide"`, `scale:"css"`, `threshold:0.2`; options `maxDiffPixels`, `maxDiffPixelRatio`, `mask`, `stylePath`, `fullPage`, `clip` | npm registry; https://playwright.dev/docs/api/class-pageassertions | high |
| 70 | Snapshot names include browser+platform; rendering varies by OS/hardware — run in the same environment; `--update-snapshots` | https://playwright.dev/docs/test-snapshots | high |
| 71 | Official Docker images `mcr.microsoft.com/playwright:v1.63.0-noble` (also jammy/resolute); pin to project version | https://playwright.dev/docs/docker | high |
| 72 | Chromatic Free: 5,000 snapshots/mo, Chrome only, unlimited users/projects; Starter $179 (35k, all browsers, $0.008 extra); Pro $399 (85k); OSS program by request | https://www.chromatic.com/pricing | high |
| 73 | Argos Hobby free 5,000 screenshots/mo; Pro $100/mo 35k | https://argos-ci.com/pricing | high |
| 74 | Lost Pixel sunset announced 2026-04-22 (team joined Figma); README banner; last npm release 3.22.0 (2024-11-14) | https://lost-pixel.com/blog/lost-pixel-team-is-joining-figma; https://github.com/lost-pixel/lost-pixel; npm registry | high |
| 75 | pnpm 12.3.4 (2026-09-04); `workspace:` ranges rewritten on publish; catalogs `catalog:` replaced on publish | npm registry; https://pnpm.io/workspaces; https://pnpm.io/catalogs | high |
| 76 | pnpm 11.13.0 (2026-07-13) added native `pnpm change`/`pnpm version -r` compatible with `.changeset/*.md`; 11.16/12 alpha: first release publishes manifest version verbatim | https://github.com/pnpm/pnpm/releases/tag/v11.13.0 | high |
| 77 | pnpm changesets guide: `changeset version` → `pnpm install` → commit → `pnpm publish -r`; `changesets/action`; `NPM_TOKEN` | https://pnpm.io/using-changesets | high |
| 78 | `@changesets/cli` 3.0.2 (2026-09-04); 3.0.0 (2026-08-11): `changeset tag`→`git-tag`, Node ^22.11‖^24‖>=26, engines pnpm ≥10, `changeset version` exits 1 with no changesets | npm registry; https://github.com/changesets/changesets/releases/tag/%40changesets%2Fcli%403.0.0 | high |
| 79 | GitHub Packages npm: scoped-only, lowercase scope = owner, `.npmrc` auth token, `publishConfig`, `repository` must match, 256 MB limit, private by default, `--auth-type=legacy` for npm 9+ login, `GITHUB_TOKEN` in Actions | https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry | high |
| 80 | Actions tutorial: `setup-node registry-url: https://npm.pkg.github.com`, `permissions: packages: write`, `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`; provenance discussed only for npmjs | https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages | high |
| 81 | npm trusted publishing (OIDC) GA July 2025; multiple configs per package since 2026-09-03; npm CLI ≥11.5.1; provenance by default — npmjs.com registry | https://docs.npmjs.com/trusted-publishers/; https://github.blog/changelog/2026-09-03-multiple-trusted-publishing-configurations-for-npm/ | medium |
| 82 | `require(esm)` default in Node 22.12 (2024-12-05), backported to Node 20; every supported Node can require ESM as of 2026; ~65–80% of new packages ESM-first; top-level await breaks `require(esm)` | https://socket.dev/blog/require-esm-backported-to-node-js-20; https://www.pkgpulse.com/guides/great-migration-cjs-to-esm-npm-ecosystem-2026 | medium |
| 83 | tsup README: "not actively maintained anymore… consider using tsdown"; last release 8.5.1 (2025-11-12) | https://github.com/egoist/tsup; npm registry | high |
| 84 | tsdown 0.23.0 (2026-09-03), MIT, VoidZero, Rolldown-based, "spiritual successor to tsup"; React recipe `{ entry, platform:'neutral', dts:true }`; no explicit stability statement | npm registry; https://tsdown.dev/guide/; https://tsdown.dev/recipes/react-support; https://tsdown.dev/guide/faq | high |
| 85 | Vite 8 GA 2026-03-12 (Rolldown replaces esbuild+Rollup; Oxc; Node 20.19+/22.12+); Vite 8.1 2026-06-23; latest 8.2.2; lib mode uses `build.rolldownOptions`; docs point libraries to tsdown/Rolldown | https://vite.dev/blog/announcing-vite8; https://vite.dev/guide/build#library-mode; npm registry | high |
| 86 | TypeScript 7.0.2 latest (GA 2026-07-08; GitHub tag 2026-08-20), Go-native compiler ~10x faster | npm registry; GitHub API; https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ (via search) | medium |
| 87 | React 19.2.8 latest (2026-07-21); 19.2.0 2025-10-01; no 19.3/20 stable (19.3 canaries exist) | npm registry; https://react.dev/versions | high |
| 88 | React 19: `ref` as prop (forwardRef deprecated), ref cleanup, `use()`, Actions/`useActionState`/`useOptimistic`, `useFormStatus` "for design system components", `<Context>` as provider, metadata hoisting, stylesheet `precedence`, custom elements | https://react.dev/blog/2024/12/05/react-19 | high |
| 89 | Motion 13.2.0 published 2026-09-02 (`framer-motion` same); MIT; peer react ^18‖^19 | npm registry; https://github.com/motiondivision/motion/blob/main/LICENSE.md | high |
| 90 | Motion changelog: 13.0 (Aug 5) removed `@emotion/is-prop-valid`; 13.1 multidimensional Reorder; 13.1.1 React 19 strict-mode compat; 13.2 `animate.addEffect()`, smaller `spring`; 12.41 `animateView` in core; 12.43 accelerated `backgroundColor`/SVG; Motion+ paid components | https://motion.dev/changelog | high |
| 91 | `spring()` generator: options `duration`, `visualDuration`, `bounce`, `stiffness`, `damping`, `mass`, `velocity`; `toString()` returns `"<ms> linear(...)"`; shorthand `spring(visualDuration, bounce)`; usable inline/CSS-in-JS/RSC | https://motion.dev/docs/spring; https://motion.dev/docs/css | high |
| 92 | Motion React transitions: physics vs duration-based springs; `visualDuration`; duration-based springs "can also be generated as pure CSS" | https://motion.dev/docs/react-transitions | high |
| 93 | Motion AI Kit / `/motion` skill generate CSS `linear()` springs from natural language | https://motion.dev/docs/ai-kit | medium |
| 94 | `@phosphor-icons/react` 2.1.10 (2025-05-22), MIT; weights thin/light/regular/bold/fill/duotone; `IconContext`; `/dist/ssr` for RSC; per-icon import paths | npm registry; https://github.com/phosphor-icons/react | high |
| 95 | Style Dictionary latest 5.5.3 (2026-09-06); v5.0.0 released 2025-05-16 with Node ≥22, DTCG-aligned reference syntax, no references to non-token nodes | npm registry; https://github.com/style-dictionary/style-dictionary/releases/tag/v5.0.0 | high |
| 96 | Tailwind `pointer-fine:`/`pointer-coarse:` variants exist (introduced in v4.1) | https://tailwindcss.com/blog/tailwindcss-v4-1 (not re-fetched) | medium |

---

## 9. Recommendations for Prism (consolidated)

1. **Primitives:** adopt `react-aria-components` as the only primitive dependency of `@iiiivaska/prism-react`; pin `catalog:` to `^1.21`; enable `@react-aria/mcp` and the React Aria skill in the agent's environment; record the AT matrix from `/quality` in the a11y section of every component contract. Keep Base UI as the documented fallback, not a co-dependency.
2. **Tokens → CSS:** Style Dictionary emits `tokens.css` (`--ds-*` under `:root` and `[data-ds-brand|scheme|density|input]` scopes, `color-scheme` per scheme scope) and `tailwind.css` (`@theme inline` bridge + `@custom-variant dark`/density/input). Do **not** put raw tokens in `@theme` directly — semantic variables first, `@theme inline` second (shadcn/Tailwind-discussion pattern), so brand/scheme switching is attribute-driven and rebuild-free. *(Superseded 2026-09-15 by ADR-0019 and ADR-0020: the attributes are `data-ds-color-scheme`, `-contrast`, `-transparency`, `-density`, `-modality` and `-motion`; there is no `dark` or density variant, only `ds-touch`, `ds-pointer`, `ds-contrast-more`, `ds-reduce-transparency` and `ds-reduce-motion`; brand is one `tokens.css` per brand, no `data-ds-brand`, one brand per document.)*
3. **Component styling:** vanilla CSS per component (`[data-slot=…]` + RAC state attributes + `--ds-*`), bundled to a single `styles.css` with internal `@layer ds.*`; consumers with Tailwind import it as `layer(components)`. Utilities are for consumers, the gallery and `className` overrides; if the team later prefers utility-authored internals, follow Adam Wathan's `@source`-in-package-CSS pattern and ship an additional prebuilt CSS via `@tailwindcss/cli`.
4. **Density and input modality:** encode density in the variables (`--ds-space-*`, `--ds-control-height`, `--ds-text-*` change under `[data-ds-density]`), not in utility variants; use `pointer-coarse:`/`[data-ds-input=touch]` only for hit-target and hover-affordance rules; use container queries (`@container`, `@container-size`) inside cards/widgets instead of viewport breakpoints. *(Superseded 2026-09-15 by ADR-0019: density is `data-ds-density`, modality `data-ds-modality` with the `ds-touch` and `ds-pointer` variants, and Tailwind's `pointer-*:` variants ignore Prism's settings; density changes no type (ADR-0021 §6).)*
5. **Charts:** `@iiiivaska/prism-charts` on visx 4 + d3-shape/scale behind a Prism chart spec mirroring Swift Charts marks; explicit sizes for SSR; gradients/dashes/glass as token-driven props; Recharts 3 named as the exit path.
6. **Gallery:** Storybook 10.6 + addon-vitest + addon-a11y (`error`) + Storybook MCP; stories generated/validated from `@iiiivaska/prism-spec`; stay on Vitest 4 until the addon supports 5.
7. **Visual regression:** Playwright `toHaveScreenshot` over `storybook-static` in the pinned Playwright Docker image; matrix scheme × density × viewport; baselines in git; Chromatic optional later.
8. **Publishing:** pnpm 12 + catalogs; Changesets 3 with a `fixed` group (handle exit code 1 on no-op `version`); GitHub Packages with `GITHUB_TOKEN`; ESM-only; tsdown with `platform: 'neutral'`, `dts: true`, React external; `exports` with per-component subpaths; `peerDependencies: react ^19`; `engines.node >=22.12`.
9. **Motion:** motion tokens as `(visualDuration, bounce)`; build step emits CSS `linear()` springs with Motion's `spring()`; Motion 13 runtime only for gestures/layout/AnimatePresence; View Transitions gated by feature detection; reduced motion collapses durations via tokens and `MotionConfig reducedMotion="user"`.
10. **Bump the tokens decision:** Style Dictionary is at **v5** (since 2025-05); the brief says v4 — plan the pipeline on v5 (Node ≥22, DTCG-aligned references).

---

## 10. Open questions

1. **Base UI date components:** `@base-ui/react` 1.8 peer-depends on `date-fns` and `@date-fns/tz` although no Calendar/DatePicker is documented. If they ship soon, the coverage gap vs. RAC narrows; re-evaluate at the next Base UI minor.
2. **Russian strings in RAC:** RAC lists 40+ locales; confirm `ru-RU` is among the built-in translations for every component Prism uses (DatePicker, ComboBox, Table sort announcements) before relying on them for Cyrillic coverage.
3. **Vitest 5 support** in `@storybook/addon-vitest` (peer `^3 || ^4` at 10.6.0) — track Storybook 10.7/11.
4. **TypeScript 7 + tsdown `dts`:** verify declaration generation and project references work with the Go-based compiler before making TS 7 the workspace default.
5. **Storybook 11 timing and CSF Factories default:** the 10.0 post promised "next Spring"; only `11.0.0-alpha.0` exists on 2026-09-02. Decide whether to author stories as CSF Factories now (React-only Preview) or classic CSF3.
6. **React `<ViewTransition>` / `<Activity>` usage:** `<Activity>` is stable in 19.2; `<ViewTransition>` status was not verified — decide whether Prism wraps Motion's `animateView` or React's API.
7. **GitHub Packages provenance:** not documented; if supply-chain attestations matter, mirror public packages to npmjs.com with trusted publishing instead.
8. **`prefers-reduced-transparency`** browser support (Safari/Firefox) is unverified; the glass material may need a JS-detected `[data-ds-transparency=reduce]` scope. *(Superseded 2026-09-15 by ADR-0019: Safari cannot report Reduce Transparency and Prism does not guess it; glass falls back under Increase Contrast per ADR-0022, and an app with its own setting passes `transparency` to `<Theme>`.)*
9. **Screenshot determinism for glass:** `backdrop-filter` and gradients can render differently under headless software rasterization; validate that the pinned Playwright image yields stable diffs before committing many baselines, and set `maxDiffPixelRatio` per story family.
10. **Consumer tokens in Shadow DOM:** Tailwind emits theme variables to `:root` only; if any consumer app uses web components, `tokens.css` should declare `:root, :host` itself (our file, our choice).
11. **Option A vs B enforcement:** if the agent authors with utilities anyway, decide whether a lint rule blocks Tailwind classes inside `packages/react` to keep the CSS-first contract.
12. **Recharts as fallback boundary:** define which chart-spec features must be implementable in Recharts 3 (custom shapes, HTML overlays) so the exit path stays real.
