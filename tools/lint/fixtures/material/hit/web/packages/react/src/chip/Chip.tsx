// One line per web pattern of ADR-0036 §10 in a component's script, outside the Surface module; `expect:`
// names the rule the line must trip. This chip blurs, names the recipe and decides its own fallback,
// where `useSurfaceChip` resolves and paints it. Each spelling a pattern names has a line of its own:
// every operator on either side, a string key in either quote on either side, a non-null assertion,
// every kind of operand, every Tailwind backdrop utility and the recipes' token paths.
import { brandTokens } from "@iiiivaska/prism-tokens";
import { useTokenContext } from "@iiiivaska/prism-tokens/react";

type Context = ReturnType<typeof useTokenContext>;

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

/** The other operators, on either side of it. */
export function operators(context: Context): boolean[] {
  const { transparency } = context;
  return [
    transparency !== "standard", // expect: material/web-transparency-read
    transparency == "reduce", // expect: material/web-transparency-read
    transparency != "standard", // expect: material/web-transparency-read
    "reduce" === context.transparency, // expect: material/web-transparency-read
    "reduce" == context.transparency, // expect: material/web-transparency-read
    "standard" != context.transparency, // expect: material/web-transparency-read
  ];
}

/** A string key in either quote on either side, a non-null assertion, and a subscript and a call as operands. */
export function spellings(context: Context, optional: Partial<Context> | undefined, contexts: readonly Context[], lookup: (name: string) => Context): boolean[] {
  return [
    context["transparency"] === "reduce", // expect: material/web-transparency-read
    context['transparency'] !== 'standard', // expect: material/web-transparency-read
    "reduce" === context["transparency"], // expect: material/web-transparency-read
    'reduce' === context['transparency'], // expect: material/web-transparency-read
    optional?.transparency! === "reduce", // expect: material/web-transparency-read
    "reduce" === contexts[0]?.transparency, // expect: material/web-transparency-read
    "reduce" === lookup("chip").transparency, // expect: material/web-transparency-read
  ];
}

/** Tailwind's backdrop utilities, in a class string: each declares backdrop-filter. */
export const tailwindBackdrops = [
  "ds-chip backdrop-blur-md", // expect: material/web-backdrop-filter
  "backdrop-brightness-110", // expect: material/web-backdrop-filter
  "backdrop-contrast-125", // expect: material/web-backdrop-filter
  "backdrop-grayscale", // expect: material/web-backdrop-filter
  "backdrop-hue-rotate-15", // expect: material/web-backdrop-filter
  "backdrop-invert", // expect: material/web-backdrop-filter
  "backdrop-opacity-50", // expect: material/web-backdrop-filter
  "ds-pointer:backdrop-saturate-150", // expect: material/web-backdrop-filter
  "backdrop-sepia", // expect: material/web-backdrop-filter
  "backdrop-filter-none", // expect: material/web-backdrop-filter
];

/** The recipes by their token paths in the brand table, a completed prefix and a name longer than the scrim's included. */
export function recipeValues(recipe: string): unknown[] {
  const table = brandTokens();
  return [
    table["material.glass.chip"], // expect: material/web-glass-recipe
    table[`material.glass.${recipe}`], // expect: material/web-glass-recipe
    table["material.glass.scrim.strong"], // expect: material/web-glass-recipe
  ];
}
