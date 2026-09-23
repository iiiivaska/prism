/**
 * The svg inside every Prism glyph box: one registry id (ADR-0013), in the Phosphor cut `useGlyphCut`
 * resolves from the weight, the size and the style (./weight.ts), mirrored under `dir="rtl"` when the
 * registry says so (ADR-0013 rule 4).
 *
 * It is internal, and it is only ever the child of `IconPart` (./Icon.tsx), the root box that `Icon`,
 * Button's icons and Card's action and icon ring all draw, so there is one glyph path in the system. The
 * svg fills that box, takes its color from it through `currentColor`, and is never read by assistive
 * technology or focused: whatever a glyph means is carried by its box (Icon.yaml behavior 14). A glyph
 * that replaces another in the same box is marked `data-ds-replaced` and fades in (Icon.yaml `motion`,
 * ./Glyph.css).
 */
import type { ReactNode } from "react";
import { iconRegistry, type IconName, type IconStyle } from "../generated/icons.ts";
import { glyphs } from "./glyphs.ts";
import type { GlyphSize, GlyphWeight } from "./options.ts";
import { useGlyphCut } from "./weight.ts";

export interface GlyphProps {
  readonly name: IconName;
  readonly size: GlyphSize;
  readonly weight: GlyphWeight;
  readonly style: IconStyle;
  /** True when this svg replaces the glyph of another `name` in the same box (`motion.symbolChange`). */
  readonly replaced?: boolean;
}

export function Glyph(props: GlyphProps): ReactNode {
  const { name, size, weight, style, replaced = false } = props;
  const cut = useGlyphCut(weight, size, style);
  const Component = glyphs[name];
  return (
    <Component
      weight={cut}
      aria-hidden="true"
      focusable="false"
      className="ds-glyph"
      data-ds-slot="icon-glyph"
      data-ds-mirror={iconRegistry[name].rtlMirror ? "" : undefined}
      data-ds-replaced={replaced ? "" : undefined}
    />
  );
}
