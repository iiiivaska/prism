---
category: Composites
---
The corner-pinned card: a `Surface` with a fixed anatomy (title and caption top-left, one action or the open affordance top-right, the hero metric bottom-left, meta or a mini chart bottom-right) in `solid`, `vivid`, `glass` or `tinted`. Most Prism screens are grids of this card.

## Usage

```jsx
<Card variant="solid" title="Line output" caption="Last 24 hours"
      hero={{ value: "86", trailing: ".4", unit: "%" }} onAction={() => {}} />

<Card variant="vivid" title="Average yield" caption="Dollars per batch" hero={{ value: "$2,450" }} />

<Card variant="tinted" title="Sensor" caption="Active" icon="object.gps" />

<Card variant="solid" size="compact" title="Queued" hero={{ value: "37" }} />

{/* One custom action: a solid disc with its own glyph and name. */}
<Card title="Line 4" caption="Running" hero={{ value: "86", trailing: ".4", unit: "%" }}
      action={{ kind: "custom", icon: "action.pause", label: "Pause line 4" }} onAction={() => {}} />

{/* Glass needs something behind it: declare it with `backdrop`. */}
<Card variant="glass" backdrop="image" title="Unit 4417" caption="21.11.2026, 14:05:22" isSelected />
```

## Types

- `hero`: `{ value: string; trailing?: string; unit?: string; tone?: <a Text tone> }` — `trailing` is the trailing group (`.4` of `86.4`), dimmed except on vivid. On vivid put the unit in `caption` ("Dollars per batch") and leave `hero.unit` unset; a `hero.unit` given on vivid is moved onto the caption line for you, so never pass both.
- `action`: `"open"` (default), `"none"`, or `{ kind: "custom"; icon: <registry id, as Icon's `name`>; label: string }`. With `onAction`, an `open` card is pressable as a whole and shows the `nav.open` glyph top-right (under a pointer only on hover, press or focus; always under touch) — don't add your own affordance; without `onAction` an `open` card draws no glyph and is not a control. A `custom` action always draws its solid disc top-right: with `onAction` the disc alone is the button, without it the disc is a labelled image that presses nothing.

## Rules

- Keep the anatomy; a card has one action — never a row of buttons inside it.
- `vivid` is for the one thing the screen sells (a 2×2 KPI grid, one hero card); `vivid="1"`–`"4"` picks the gradient slot.
- A custom action's `label` says what the disc does ("Pause line 4"), not what the card holds.
- `aside` is the bottom-right slot; `children` is the body between header and hero.
- Don't use `tinted` in a dark scope.
