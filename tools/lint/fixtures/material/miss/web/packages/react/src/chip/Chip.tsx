// A component beside its chip shape (ADR-0036 §7): it hands `useSurfaceChip` its background table and
// reads what the shape publishes, so it names no backdrop filter or glass recipe and compares no
// transparency. `miss:` names the rule the line must not trip.
import { useTokenContext } from "@iiiivaska/prism-tokens/react";
import { SurfaceChipEdge, SurfaceChipScope, useSurfaceChip } from "../surface/SurfaceChip.tsx";

export function Chip(props: { readonly children?: unknown }) {
  const chip = useSurfaceChip((ground) => (ground.backdrop === "none" ? "own" : "glass")); // miss: material/web-backdrop-filter
  const { contrast, transparency } = useTokenContext(); // miss: material/web-transparency-read
  const cacheKey = [contrast, transparency].join(" "); // miss: material/web-transparency-read
  const scrim = { backgroundImage: "linear-gradient(transparent, var(--ds-material-glass-scrim))" }; // miss: material/web-glass-recipe
  return [chip.rootProps, SurfaceChipEdge, SurfaceChipScope, cacheKey, scrim, props.children];
}
