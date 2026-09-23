---
category: Primitives
---
A static mark that carries a count or an unread state: a filled or outlined pill of digits, or a bare dot. It is never pressable; the thing it marks is. A Badge leads an alert row, trails a list row, counts the items behind a tab, or marks a control's corner. It positions nothing itself (an inline span with no offset): in a row or a tab, place it in the flow; to put it on a control's corner, wrap the control in a `position: relative` box and position the Badge absolutely at that corner in your own layout.

## Usage

```jsx
<Badge count={3} label="unread alerts" />                                  {/* neutral, filled */}
<Badge tone="critical" count={12} label="open incidents" />
<Badge tone="accent" count={7} label="items needing attention" />
<Badge tone="critical" count={128} max={99} label="open incidents" />     {/* renders 99+ */}
<Badge tone="neutral" emphasis="outline" count={4} label="queued runs" />
<Badge variant="dot" tone="critical" label="unread" />
```

## Rules

- A count is for a number the user can act on; a dot means "there is something new". Never show 0; cap with `max`.
- `label` says what the count means ("unread alerts"); give every Badge one — without it the badge is hidden from assistive technology.
- `outline` for resting siblings, `filled` for the active or urgent mark — and only `filled` over maps, images, vivid or glass.
- A neutral count stays achromatic; `critical` is never the only sign of a problem.
