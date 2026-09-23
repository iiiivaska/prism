## Prism conventions (read before building)

Prism is a token-driven React system: components are styled by their props, your own layout glue is styled with `var(--ds-*)` tokens. There are no utility classes; the `ds-*` class names in `_ds_bundle.css` are component internals — never write them yourself.

### Setup: one `<Theme>` at the root, with the brand table

```jsx
const { Theme, prismTokens, Surface, Card, Text, Button } = window.PrismReact;

<Theme tokens={prismTokens} colorScheme="light" density="compact">
  <App />
</Theme>
```

- `tokens={prismTokens}` is required: every glyph reads the brand table from it and **throws** without it — `Icon`, a `Button` with `leadingIcon`/`trailingIcon`, a `Card` with an `icon`, an open glyph (`onAction`) or a custom action. Always pass it.
- `Theme` is root-only (it throws when nested) and renders no element: it writes the axes onto `<html>`. Axes: `colorScheme` light | dark, `density` compact | regular | comfortable | watch, `contrast` standard | more, `transparency` / `motion` standard | reduce, `modality` pointer | touch. Leave an axis out to follow the OS.
- A dark panel inside a light page: put the scope on the Surface that is the panel — `<Surface material="solid" {...scope({ colorScheme: "dark" })}>` — so it paints its own dark ground. `scope()` only re-resolves tokens and paints nothing: a plain element carrying it also needs `background: var(--ds-color-bg-page); color: var(--ds-color-text-primary)`, or inherited text keeps the outer scheme's color. Only `colorScheme` and `density` nest.
- Give the page its ground yourself: `background: var(--ds-color-bg-page); color: var(--ds-color-text-primary); font-family: var(--ds-font-ui)`.

### Color comes from the Surface, not from you

Every container is a `<Surface material>` (`solid`, `raised`, `nested`, `inverse`, `vivid`, `glass`, `glassLight`, `accent`). It publishes its material: `Text` and `Icon` resolve their `tone` against it on every material. `Divider` follows it except on `inverse` and `accent`, where it draws nothing. `Button` adapts only on `vivid` and `glass` and keeps its page colors elsewhere — on `inverse` a ghost Button vanishes and a primary merges into the fill, so keep Buttons off `inverse` and `accent`. `Badge` is the exception — its fills are opaque, so over a map, an image, vivid or glass use only `emphasis="filled"`. Never set `color` on components or recolor text for contrast. On vivid, glass, inverse and accent the status tones (`critical`, `success`, …) render in the material's foreground, so carry status there with words or an icon. Glass goes only over a map, an image or a vivid surface you render behind it, with `backdrop="map" | "image" | "vivid"`. Solid for content; vivid for at most one 2×2 grid per screen. Type is `<Text role tone>` — `display-*`, `title-*`, `headline`, `body-*`, `label-*`, `caption`, `eyebrow`, `metric-xl|lg|md`, `data` — never raw font sizes. Only `title-*`/`display-*` render a block heading; every other role is an inline `<span>`, so stack Texts in a flex column.

### Tokens for your own layout (names verbatim)

| Family | Use |
|---|---|
| `--ds-space-0` … `--ds-space-13`; `--ds-space-page-margin`, `-section-gap`, `-group-gap`, `-card-gap`, `-tile-gap`, `-card-padding` | gaps and padding; prefer the named ones |
| `--ds-radius-card`, `-card-compact`, `-card-large`, `-tile`, `-sheet`, `-hero`, `-control`, `-chip`, `-badge`, `-inner`, `-media` | corners of your own boxes |
| `--ds-color-bg-page`, `--ds-color-bg-surface`, `--ds-color-bg-surface-raised`, `--ds-color-text-primary`, `--ds-color-text-secondary`, `--ds-color-text-tertiary`, `--ds-color-border-hairline` | only for glue outside a Surface |
| `--ds-size-card-min`, `--ds-size-row`, `--ds-size-control-sm|md|lg`, `--ds-size-hit` | card and row sizing |
| `--ds-motion-duration-*`, `--ds-motion-easing-*`, `--ds-motion-spring-*` | transitions |

Don't use the `--ds-ref-*` layer (raw palette/scale); it bypasses scheme, density and contrast. Icons are registry ids (`nav.open`, `action.filter`, `status.warning`, …); the full list is the union of Icon's `name` prop in `Icon.d.ts` (the same union types Button's `leadingIcon`/`trailingIcon` and Card's `icon`); at runtime, `Object.keys(PrismReact.iconRegistry)`.

### Where the truth lives

`styles.css` imports `tokens/tokens.css` (every semantic token except motion, per scheme, density and contrast), `tokens/motion.css` (the `--ds-motion-*` tokens), `fonts/fonts.css` (Onest, JetBrains Mono) and `_ds_bundle.css`. Per component: `components/<group>/<Name>/<Name>.prompt.md` (usage rules and JSX) and `<Name>.d.ts` (the exact props).

### Example

```jsx
<main style={{ padding: "var(--ds-space-page-margin)", display: "grid", gap: "var(--ds-space-section-gap)" }}>
  <Text role="title-lg">Weekly summary</Text>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, var(--ds-size-card-min))", gap: "var(--ds-space-card-gap)" }}>
    <Card variant="vivid" title="Average yield" caption="Dollars per batch" hero={{ value: "$2,450" }} />
    <Card title="Line output" caption="Last 24 hours" hero={{ value: "86", trailing: ".4", unit: "%" }} onAction={() => {}} />
  </div>
  <Button variant="primary" label="Continue" onPress={() => {}} />
</main>
```
