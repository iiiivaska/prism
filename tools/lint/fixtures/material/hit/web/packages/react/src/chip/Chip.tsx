// One line per web pattern of ADR-0036 §10 in a component's script, outside the Surface module; `expect:`
// names the rule the line must trip. This chip blurs, names the recipe and decides its own fallback,
// where `useSurfaceChip` resolves and paints it.
import { useTokenContext } from "@iiiivaska/prism-tokens/react";

export function Chip(props: { readonly children?: unknown }) {
  const context = useTokenContext();
  const { transparency } = context;
  const reduced = transparency === "reduce"; // expect: material/web-transparency-read
  const opaque = "reduce" !== context.transparency; // expect: material/web-transparency-read
  const style = {
    backdropFilter: "blur(var(--ds-material-glass-chip-blur))", // expect: material/web-backdrop-filter, material/web-glass-recipe
    WebkitBackdropFilter: "none", // expect: material/web-backdrop-filter
    backgroundColor: "var(--ds-material-glass-chip)", // expect: material/web-glass-recipe
  };
  const className = "ds-chip ds-reduce-transparency:ds-chip-opaque"; // expect: material/web-transparency-read
  switch (context.transparency) { // expect: material/web-transparency-read
    case "reduce":
      return [reduced, opaque, className, props.children];
    default:
      return [style, props.children];
  }
}

export function flatten(element: HTMLElement): void {
  element.style.webkitBackdropFilter = "none"; // expect: material/web-backdrop-filter
  element.style.setProperty("backdrop-filter", "none"); // expect: material/web-backdrop-filter
  element.style.setProperty("--ds--chip-fill", `var(--ds-material-glass-${element.dataset["recipe"] ?? "chip"})`); // expect: material/web-glass-recipe
}
