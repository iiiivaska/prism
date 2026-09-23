---
category: Primitives
---
A tappable action with one label and an optional leading or trailing registry icon. Controls in Prism are pills: `primary` is the single solid pill in a group, `secondary` a raised pill, `ghost` an outline with no fill at rest, `danger` a tinted pill with critical text. Built on React Aria: the handler is `onPress`, not `onClick`.

## Usage

```jsx
<Button variant="primary" size="md" label="Continue" onPress={() => {}} />
<Button variant="secondary" label="Details" trailingIcon="nav.open" onPress={() => {}} />
<Button variant="ghost" size="sm" label="Filter" leadingIcon="action.filter" onPress={() => {}} />
<Button variant="danger" label="Delete route" onPress={() => {}} />
<Button label="Saving" isLoading onPress={() => {}} />
<Button label="Continue" isDisabled onPress={() => {}} />
```

## Rules

- `label` is required and is also the accessible name; verb-first ("Save", "Send invoice"). It never wraps.
- One `primary` per view; `secondary` for the rest; `ghost` inside cards over vivid or glass.
- Icons are registry ids (`leadingIcon` / `trailingIcon`), never React elements.
- Don't use a Button for navigation, don't stack more than two side by side on touch, and don't color one with the accent.
- `fullWidth` stretches the pill to its container.
