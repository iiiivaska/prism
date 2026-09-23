---
category: Primitives
---
One glyph from Prism's icon registry, named by its semantic id (`nav.back`, `action.filter`, `status.warning`, …) — never a vendor icon name. The component owns the box, stroke weight, style and tone. A glyph is not a control: never attach a handler to an Icon; an action is a Button with `leadingIcon` / `trailingIcon`.

## Usage

```jsx
<Icon name="action.settings" size="md" />                           {/* inside controls */}
<Icon name="nav.open" size="sm" tone="secondary" />                  {/* corner and inline */}
<Icon name="object.map" size="lg" weight="display" tone="secondary" />
<Icon name="status.warning" size="sm" style="filled" tone="warning" />
<Icon name="object.lock" size="sm" tone="secondary" label="Locked for editing" isDecorative={false} />
```

## Rules

- `name` must be one of the 51 registry ids in the `name` union of `Icon.d.ts` (`action.*`, `nav.*`, `object.*`, `status.*`; the same list as Button's `leadingIcon` / `trailingIcon`). Pick by meaning, not by picture.
- `sm` is the corner/inline box, `md` the box inside controls, `lg` illustrative; `weight="display"` only at `lg`.
- `style="filled"` is for status and a selected tab only; pair every status glyph with a text label.
- A glyph that carries meaning on its own needs `label` and `isDecorative={false}`; otherwise it is hidden from assistive technology.
- On vivid, inverse, accent or glass the tone is set by the material — don't color a glyph to mean something there.
- Icon needs `<Theme tokens={prismTokens}>` above it (it reads the brand table); without it, it throws.
