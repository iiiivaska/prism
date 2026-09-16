# `@iiiivaska/prism-tokens`

Prism's design tokens for the web, and the runtime that resolves them: the generated stylesheets and
typed tables, plus the `data-ds-*` contract of [ADR-0019](../../../docs/adr/0019-web-runtime-contract.md).

Everything under `src/generated/` is written by `pnpm tokens:build` from `tokens/` and `brands/`.
Never edit it by hand. The hand-written part of the package is `src/runtime/` and `src/react/`.

## What a consumer imports

| Subpath | What it is |
|---|---|
| `@iiiivaska/prism-tokens` | the brand-invariant root export: the runtime below, `webRuntime`, `defaultContext`, `platformDefaults` and the context types. It imports no React. |
| `@iiiivaska/prism-tokens/react` | `<Theme>`, `useTokenContext()` and `useBrandTokens()`, plus everything the root export has. React is an optional peer. |
| `@iiiivaska/prism-tokens/tokens.css` | the default brand's custom properties, scoped by the attributes of ADR-0019 §1. |
| `@iiiivaska/prism-tokens/tokens` | the default brand's typed table (`table`, `resolveTokens`, `cssVar`). |
| `@iiiivaska/prism-tokens/brands/<brand>/tokens.css` | the same stylesheet for any repo brand (`prism`, `prism-native`). |
| `@iiiivaska/prism-tokens/brands/<brand>/tokens` | that brand's typed table. |
| `@iiiivaska/prism-tokens/brands/<brand>/fonts.css` | that brand's `@font-face` rules; the woff2 files sit beside it and are served from the package, never from a font CDN. |
| `@iiiivaska/prism-tokens/motion.css` | the motion custom properties and the root Reduce Motion switch. |
| `@iiiivaska/prism-tokens/tailwind.css` | the Tailwind v4 bridge: theme variables, utilities and the `ds-*` variants. Leave it out when the app has no Tailwind. |
| `@iiiivaska/prism-tokens/manifest.json` | the parity manifest: every token, its names on each stack, and the runtime table. |

The `style` field points at the default brand's `tokens.css`, for tooling that reads one.

A document loads **one** brand's `tokens.css` (ADR-0020 §6). There is no `data-ds-brand` attribute
and no `brand` prop: to switch brand, load the other stylesheet.

```ts
import "@iiiivaska/prism-tokens/brands/prism-native/tokens.css";
import "@iiiivaska/prism-tokens/brands/prism-native/fonts.css";
import "@iiiivaska/prism-tokens/motion.css";
```

## The six axes

| Axis | Attribute | Values (first = default) | Where it acts | Fallback with no valid value |
|---|---|---|---|---|
| `colorScheme` | `data-ds-color-scheme` | `light`, `dark` | `<html>` and any element | `(prefers-color-scheme: dark)` |
| `contrast` | `data-ds-contrast` | `standard`, `more` | `<html>` only | `(prefers-contrast: more)` |
| `transparency` | `data-ds-transparency` | `standard`, `reduce` | `<html>` only | `(prefers-reduced-transparency: reduce)` |
| `density` | `data-ds-density` | `compact`, `regular`, `comfortable`, `watch` | `<html>` and any element | `(any-pointer: coarse)` → `regular` |
| `modality` | `data-ds-modality` | `pointer`, `touch` | `<html>` only | no fine hovering pointer → `touch` |
| `motion` | `data-ds-motion` | `standard`, `reduce` | `<html>` only | `(prefers-reduced-motion: reduce)` |

Only a listed value counts. An absent, empty or unknown value behaves exactly like no attribute: on
`<html>` the media fallback decides, on a nested element the parent's value is inherited. Any listed
value turns the fallback off, the default included — `data-ds-contrast="standard"` ignores the OS.

The table itself is generated: read it from `webRuntime` rather than spelling an attribute name.

## The runtime

```ts
rootAttributes(context: Partial<TokenContext>): Record<string, string>
scope(context: Partial<Pick<TokenContext, "colorScheme" | "density">>): ScopeAttributes
readContext(element?: Element | null): TokenContext
watchContext(listener: (context: TokenContext) => void): () => void
mountRoot(context: Partial<TokenContext>): () => void
```

- **Only explicit choices become attributes.** `mountRoot` and `<Theme>` write the listed values they
  are given and leave every other axis alone; their cleanup restores what was there. Nothing copies a
  detected value into an attribute, because the stylesheets evaluate the same media queries
  themselves — so the first paint is right without JavaScript and after server rendering.
- **Detection is for JavaScript only.** `readContext` resolves an element the way the cascade does;
  `watchContext` fires when a media query changes or `<html>` gains or loses a `data-ds-*` value.
- **Server rendering.** An app that persists a choice renders `rootAttributes(choice)` into `<html>`;
  a `<Theme>` with the same values then changes nothing on hydration.

```tsx
import { Theme, scope } from "@iiiivaska/prism-tokens/react";

<Theme colorScheme={saved.scheme}>
  <main>
    <section {...scope({ colorScheme: "dark" })}>a dark band in a light page</section>
    <table {...scope({ density: "compact" })} />
  </main>
</Theme>
```

`<Theme>` renders no element and is root-only: a `<Theme>` inside another throws in development.
Nest a colour scheme or a density with `scope()` on your own element. Safari cannot report Reduce
Transparency, so an app that offers its own setting passes `transparency="reduce"` itself; Prism adds
no stand-in.

## Handing Prism your brand table

CSS carries every token value, so components need nothing extra. JavaScript that draws — canvas,
visx, Motion's spring physics — cannot read a `var()`, and Prism's own packages must not import a
brand (ADR-0020 rule 13). The app therefore hands its table over once:

```ts
import * as tokens from "@iiiivaska/prism-tokens/brands/prism-native/tokens";
import { setBrandTokens } from "@iiiivaska/prism-tokens";

setBrandTokens(tokens); // the table for the tokens.css this document loaded
```

or, in React, on the root `<Theme>`:

```tsx
<Theme tokens={tokens}>…</Theme>
```

Read it back with `brandTokens()` outside React and `useBrandTokens()` inside it:

```ts
import { brandTokens, readContext } from "@iiiivaska/prism-tokens";

const values = brandTokens<typeof tokens>().resolveTokens(readContext(canvas));
ctx.fillStyle = values["color.chart.series.1"].css;
```

| Export | What it does |
|---|---|
| `setBrandTokens(tokens)` | hands a `<brand>/tokens` module to Prism. Idempotent for the same module; a second, different table throws in development (one brand per document). |
| `brandTokens<T>()` | the table, or a throw naming `setBrandTokens`. It never falls back to another brand, whose colours would disagree with the loaded stylesheet. |
| `peekBrandTokens()` | the table or `undefined`, for code that must not throw. |
| `clearBrandTokens()` | forgets it; for tests and hot reloading. |
| `useBrandTokens<T>()` | the `<Theme tokens>` of this tree, else `brandTokens()`. |
| `BrandTokens` | the structural type every brand module satisfies. |

On the server `<Theme tokens>` passes the table through React only, so one process can render several
brands; in the browser it also reaches `setBrandTokens`, for code outside React. That handover happens
in an effect, from a committed render, so a server rendering under a DOM shim and a discarded
concurrent render both leave the module registry untouched. Code outside React that needs the table
before React mounts calls `setBrandTokens(tokens)` itself at start-up, as above.

## Tests

`pnpm --filter @iiiivaska/prism-tokens test` runs the suite of ADR-0019 rules 6 and 7 in Node: the
attribute contract on every axis, `readContext` and `watchContext` against the fake `matchMedia` of
`test/fake-dom.ts`, server rendering through `react-dom/server`, and the export map resolved from a
scratch consumer whose `node_modules` holds the built package. Run `pnpm --filter
@iiiivaska/prism-tokens build` first: the export test resolves `dist/`. Browser coverage of the same
contract is the visual-regression spec of roadmap P3-4.
