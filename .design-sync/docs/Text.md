---
category: Primitives
---
The typography primitive. A `role` selects size, weight, line height, tracking and numeric features from the type tokens; a `tone` is resolved against the material the enclosing `Surface` publishes, so the same `tone="secondary"` is correct on solid, vivid and glass. Metric roles draw the dimmed trailing group and the hung unit.

## Usage

```jsx
<Text role="metric-xl" trailing=".4" unit="%">86</Text>          {/* 86.4 % */}

<Text role="title-lg">                                             {/* one heading, two tones */}
  Weekly summary<br />
  <Text role="title-lg" tone="secondary">Three rides ahead of plan</Text>
</Text>

<Text role="caption" tone="secondary">Updated two minutes ago</Text>
<Text role="data" numeric="tabular">04:12:58</Text>              {/* live values: tabular figures */}

<Surface material="vivid" radius="card">
  <Text role="headline">Evening loop</Text>                         {/* foreground follows the material */}
</Surface>
```

## Rules

- One hero (`metric-xl`) per screen; secondary numbers use `metric-lg` or `metric-md`.
- Hierarchy comes from `tone` (primary → secondary → tertiary), not from weight or color. `dimmed` is only for `metric-xl` / `metric-lg`; on any other role it renders as `secondary`.
- `accent`, `success`, `warning`, `critical`, `info` are for that meaning only, and they color text only on page/solid/raised/nested. On vivid, glass, glassLight, inverse and accent they render in the material's foreground — carry status there with words or an icon. On vivid, glassLight and inverse every tone is the same color, so hierarchy there comes from the role.
- Sentence case everywhere; `eyebrow` at most once per card.
- Only `title-*` and `display-*` render a block heading (set `headingLevel` to fit the page outline); a Text nested in another Text renders a span. Every other role is an inline `<span>` unless `truncation` is set (then it is block-level). To stack Texts, wrap them in a column, e.g. `<div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-1)" }}>`.
- `truncation="ellipsis"` for identifiers, `"fade"` for prose (`maxLines` sets the line count).
