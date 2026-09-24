// A component beside its chip shape (ADR-0036 §7): it hands `useSurfaceChip` its background table and
// reads what the shape publishes, so it names no backdrop filter or glass recipe and compares no
// transparency. The scrim is the one recipe it may name, by its variable or its token path. `miss:` names
// the rule the line must not trip. `nearMisses` holds names that only start or end like a checked one.
import { brandTokens } from "@iiiivaska/prism-tokens";
import { useTokenContext } from "@iiiivaska/prism-tokens/react";
import { SurfaceChipEdge, SurfaceChipScope, useSurfaceChip } from "../surface/SurfaceChip.tsx";

export function Chip(props: { readonly children?: unknown }) {
  const chip = useSurfaceChip((ground) => (ground.backdrop === "none" ? "own" : "glass")); // miss: material/web-backdrop-filter
  const { contrast, transparency } = useTokenContext(); // miss: material/web-transparency-read
  const cacheKey = [contrast, transparency].join(" "); // miss: material/web-transparency-read
  const scrim = { backgroundImage: "linear-gradient(transparent, var(--ds-material-glass-scrim))" }; // miss: material/web-glass-recipe
  const scrimToken = brandTokens()["material.glass.scrim"]; // miss: material/web-glass-recipe
  return [chip.rootProps, SurfaceChipEdge, SurfaceChipScope, cacheKey, scrim, scrimToken, props.children];
}

/** Longer names at the boundaries of the backdrop-filter and recipe patterns: none of them is a utility or a token path. */
export function nearMisses($material: { readonly glass: string }, theme: { readonly material: { readonly glassy: string } }): string[] {
  return [
    "ds-chip backdrop-blurred", // miss: material/web-backdrop-filter
    theme.material.glassy, // miss: material/web-glass-recipe
    $material.glass, // miss: material/web-glass-recipe
  ];
}
