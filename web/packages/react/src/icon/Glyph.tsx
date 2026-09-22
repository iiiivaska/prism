/**
 * The glyph that Button's icons and Card's action and icon ring draw: one registry id (ADR-0013), in the
 * Phosphor cut of the brand table's `icon.weight` (./weight.ts), mirrored under `dir="rtl"` when the
 * registry says so.
 *
 * It is internal. The public `Icon` (spec/components/Icon.yaml) owns size, style and tone props and is
 * not part of this change; a glyph here is always decorative (`aria-hidden`), sized and colored by the
 * stylesheet of the component that owns the part, and filled with `currentColor`.
 */
import type { ReactNode } from "react";
import { iconRegistry, type IconName } from "../generated/icons.ts";
import { glyphs } from "./glyphs.ts";
import { useGlyphCut, type GlyphWeight } from "./weight.ts";

export interface GlyphProps {
  readonly name: IconName;
  /** The owner's part name, written as `data-ds-slot`. */
  readonly slot: string;
  readonly weight?: GlyphWeight;
}

export function Glyph(props: GlyphProps): ReactNode {
  const { name, slot, weight = "control" } = props;
  const cut = useGlyphCut(weight);
  const Component = glyphs[name];
  return (
    <Component
      weight={cut}
      aria-hidden="true"
      focusable="false"
      className="ds-glyph"
      data-ds-slot={slot}
      data-ds-icon={name}
      data-ds-mirror={iconRegistry[name].rtlMirror ? "" : undefined}
    />
  );
}
