---
category: Primitives
---
One hairline that separates rows inside a single container: list and table rows, the rule under a tab rail, the edge between two columns of one panel. It draws `--ds-border-hairline` in the color the enclosing `Surface` calls for (`--ds-color-border-hairline` on page/solid/raised/nested, `--ds-color-border-on-media` on vivid, `--ds-color-border-on-glass-fill` on glass and glassLight); on `inverse` and `accent` it paints nothing, so never put one there. Everywhere else, spacing and the surface ladder do the separating — a Divider is the exception, not the default.

## Usage

```jsx
<Surface material="solid" radius="card" padding="none">
  {/* row */}
  <Divider inset="content" />   {/* starts at the content edge, respecting --ds-space-card-padding */}
  {/* row */}
</Surface>

<Divider orientation="vertical" />            {/* between two columns of one panel */}
<Divider isDecorative={false} />               {/* the rare rule that is the grouping cue: role="separator" */}
```

## Rules

- Don't separate cards, groups or sections with a Divider; use `--ds-space-group-gap` / `--ds-space-section-gap`.
- Give every Divider in one list the same `inset`. `content` trims both ends by `--ds-space-card-padding` from the Divider's own edge: use it in an unpadded container (`<Surface padding="none">` whose rows pad themselves, as above); inside an already padded Surface or a `Card`, use `inset="none"`, or the rule is inset twice.
- Never stack two Dividers or use one as a spacer; don't draw one across a vivid bloom.
