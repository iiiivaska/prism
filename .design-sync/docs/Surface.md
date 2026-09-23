---
category: Primitives
---
The container primitive every other component sits on. It resolves one material (`solid`, `raised`, `nested`, `inverse`, `vivid`, `glass`, `glassLight`, `accent`, or the `page` ground) and publishes that material and its backdrop to its descendants, so `Text` and `Icon` inside it pick the right foreground on their own. `Divider` picks its line on every material except `inverse` and `accent`, where it draws nothing. `Button` adapts only on `vivid` and `glass`; on `inverse` a ghost Button vanishes and a primary merges into the fill, so keep Buttons off `inverse` and `accent`. `Badge` does not adapt: its fills are opaque, so over vivid, glass or media use only `emphasis="filled"`. Never recolor text inside a Surface by hand.

## Usage

```jsx
<Surface material="solid" radius="card">
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-1)" }}>
    <Text role="headline">Solid</Text>
    <Text role="caption" tone="secondary">The content surface</Text>
  </div>
</Surface>

<Surface material="vivid" vivid="2" radius="tile">…</Surface>

{/* Glass only over something: the element behind it is yours (a map, a photo); declare it with `backdrop`. */}
<div style={{ position: "relative", backgroundImage: "url(map.png)" }}>
  <Surface material="glass" backdrop="map" radius="card" elevation="overlay">…</Surface>
</div>

<Surface material="inverse" radius="pill" padding="none">…</Surface>
```

## Rules

- `solid` is for content. Reserve `vivid` for at most one 2×2 grid, or one card in six, per screen.
- Put `glass` only over media, a map or a vivid surface, and `glassLight` only over an image or a map (over vivid it fails contrast in the dark scheme). Set `backdrop` to what is behind it (`image`, `map`, `vivid`); without it, glass silently renders as the opaque `raised` surface. Never glass on glass or on a flat page.
- Don't add borders or shadows to solid cards, and don't set `elevation` on one; use `material="raised"` for the next step up (it draws `elevation.1` and a 1 px top edge by default).
- `inverse` is the single solid control in a group; `accent` is the one lit tile a dark screen leads with.
- `padding` defaults to `card` (`--ds-space-card-padding`); nested surfaces use a smaller `radius` than their parent.
