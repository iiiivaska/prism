/**
 * `Icon` (spec/components/Icon.yaml, specVersion 3): one glyph from the icon registry, named by its
 * semantic id, in a square box.
 *
 * - The root is the anatomy's one part, the box: a `span` of `size.icon.sm`, `.md` or `.lg`, the same in
 *   every density (behavior 10), with the glyph's svg filling it (./Glyph.tsx). The web draws the Phosphor
 *   component the registry binds to the id (behavior 2); nothing here names a vendor glyph.
 * - `weight` is a cut, chosen in JavaScript from the brand table (./weight.ts): `control` binds
 *   `icon.weight` and `display` binds `icon.weight-display`, which draws only at `lg`; at `sm` and `md` it
 *   renders the control cut and nothing fails (behavior 3). A `filled` or `duotone` glyph has one cut on the
 *   web, so `weight` changes nothing there (behavior 6), except for an entry the registry marks `fill: false`,
 *   whose `filled` is its outline in the weight's cut, as Apple draws it (ADR-0035). The web has no Bold Text,
 *   so the cut never steps.
 * - The material and the backdrop kind the enclosing Surface publishes are written as `data-ds-surface` and
 *   `data-ds-backdrop`, and `tone` as `data-ds-tone` (Button's pattern); Icon.css maps the three to
 *   `tokens.root.color`, so the glyph never reads the color scheme (behaviors 7 and 8). The glass fallback
 *   reaches it as `raised`, because Surface decides it before publishing. `tone: "inherit"` writes no
 *   `data-ds-tone`, so no rule matches and the glyph takes the `color` of what is around it (behavior 9).
 * - `rtlMirror` flips the svg under `dir="rtl"` (behavior 11, ./Glyph.css).
 * - Accessibility (behaviors 13 and 14, ADR-0032): Icon emits no string of its own and reads none from
 *   the registry, whose entry `label` is a documentation id that no stack speaks. The root is
 *   `role="img"` named by `aria-label` from `label` only when a non-blank `label` is given and
 *   `isDecorative` is false; every other glyph is `aria-hidden="true"`, and there is never an unnamed
 *   `role="img"`. The svg is always hidden and never focusable. Because the box owns the role and the name,
 *   the props leave out every attribute that could give it another role, name, description or hint, or put
 *   it in the tab order, and drop them again at runtime (`WITHHELD`, Divider's pattern): an Apple caller
 *   has no parameter for any of them. `label` is the only name.
 * - Icon is not a control: no React Aria, no focus, no gesture (behavior 12). Surface is the precedent for
 *   a component that uses no React Aria at all. So the props take no DOM event handler: every `on*` key of
 *   the span's attributes is left out of `IconProps` (`WithoutHandlers`), and one that arrives past the type
 *   is dropped before the box renders, so `<Icon onClick>` neither type-checks nor makes a clickable glyph
 *   that no keyboard can reach (`usage.dont`: a glyph that acts is an IconButton). Apple's `DSIcon` has no
 *   action parameter to withhold.
 * - `style` is the spec's prop, the registry's `IconStyle`, so React's inline `style` is not a prop of Icon;
 *   a caller that needs one wraps the Icon (Card's `title` shadows HTML `title` the same way). `style`
 *   defaults to `outline` whatever the entry's `defaultStyle` says, because the spec's default is the prop's.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop, to its root element
 *   (ADR-0019 rule 8).
 *
 * `motion.symbolChange`: when a rendered Icon's `name` changes, the new glyph's svg replaces the old one
 * and fades in over motion.duration.quick (./Glyph.css), the web's cross-fade for Apple's replace symbol
 * effect; the first drawing does not animate. `reduceMotion: instant`: under Reduce Motion the replacement
 * takes motion.duration.instant, through the crossfade flag, so the new glyph is simply there.
 *
 * `IconPart` is the same box under another part name. Button draws its leading and trailing icons with
 * it, and Card its action glyph and the glyph in its icon ring, so every glyph in Prism is drawn one way
 * and keeps its owner's part name in `data-ds-slot`, as Apple's Button and Card draw `DSIcon`.
 */
import { useState, type HTMLAttributes, type ReactNode, type Ref } from "react";
import type { ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import { isDevelopment } from "../env.ts";
import { iconRegistry, type IconName, type IconStyle } from "../generated/icons.ts";
import { useSurfaceContext } from "../surface/context.ts";
import { Glyph } from "./Glyph.tsx";
import type { GlyphSize, GlyphTone, GlyphWeight } from "./options.ts";

/**
 * The DOM props an Icon does not take, left out of `IconProps` and dropped again at runtime.
 *
 * - `role`, `aria-hidden` and `aria-roledescription`: the component owns the role and the hidden state,
 *   from `label` and `isDecorative`.
 * - `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-description`, `aria-details` and `title`:
 *   `label` is the only name a glyph has (Icon.yaml `accessibility.label`), and a glyph has no hint.
 * - `tabIndex` and `contentEditable`: either one makes the box focusable, and a glyph is never a stop
 *   (`keyboard: not focusable`).
 * - `children` and `dangerouslySetInnerHTML`: the box draws its glyph and nothing else. The second is not a
 *   style choice: React throws when both it and the glyph child are present, so a caller who passes it gets a
 *   crash instead of an icon.
 */
const WITHHELD = [
  "role",
  "aria-hidden",
  "aria-roledescription",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-description",
  "aria-details",
  "title",
  "tabIndex",
  "contentEditable",
  "children",
  "dangerouslySetInnerHTML",
] as const;

/**
 * Every key of `T` but a DOM event handler (`onClick`, `onPointerDown`, `onKeyDown`, … and their `Capture`
 * forms): Icon.yaml behavior 12, a glyph never carries a gesture.
 */
type WithoutHandlers<T> = { [K in keyof T as K extends `on${string}` ? never : K]: T[K] };

export interface IconProps extends ScopeAttributes, WithoutHandlers<Omit<HTMLAttributes<HTMLSpanElement>, (typeof WITHHELD)[number] | "style" | "color">> {
  /** Icon.yaml `name`, required: a registry id such as `nav.back`, `action.filter` or `status.warning`. */
  readonly name: IconName;
  /** Icon.yaml `size`. Default `md`, the box inside controls; `sm` is the inline and corner box. */
  readonly size?: GlyphSize;
  /** Icon.yaml `weight`. Default `control`; `display` draws only at `lg` (behavior 3). */
  readonly weight?: GlyphWeight;
  /** Icon.yaml `style`, not React's inline style. Default `outline`; `filled` is for status and a selected tab. */
  readonly style?: IconStyle;
  /** Icon.yaml `tone`. Default `primary`; `inherit` takes the color of the text around the glyph. */
  readonly tone?: GlyphTone;
  /** The accessible name of a glyph that carries meaning on its own, a phrase the caller writes. */
  readonly label?: string;
  /** Default false. True hides the glyph; false exposes it only when it also has a `label`. */
  readonly isDecorative?: boolean;
  readonly ref?: Ref<HTMLSpanElement>;
}

/** An `IconProps` under the owner's part name: the one element every Prism glyph is drawn with. */
export interface IconPartProps extends IconProps {
  /** The part name, written as `data-ds-slot`: `icon` for Icon, the owner's own part name otherwise. */
  readonly slot: string;
}

/**
 * Behavior 14: a glyph is an image named by `label` only when it has one and `isDecorative` is false. A
 * blank label — empty, or nothing but the whitespace `trim()` removes — names nothing, so it hides the glyph
 * rather than writing an unnamed `role="img"`. The twin of `DSIconAppearance.isExposed(hasLabel:isDecorative:)`
 * over `hasLabel(_:locale:bundle:)`, which applies the same rule, with the same characters
 * (`blankCharacters`), to the string a localized key resolves to.
 */
export function isIconExposed(label: string | undefined, isDecorative: boolean): label is string {
  return !isDecorative && typeof label === "string" && label.trim() !== "";
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

const withheld: ReadonlySet<string> = new Set(WITHHELD);

/** Whether a prop is a DOM event handler, by the rule `WithoutHandlers` applies to the type: its key starts with `on`. */
function isHandler(key: string): boolean {
  return key.startsWith("on");
}

/** The caller's props without `WITHHELD` and without an event handler, for a caller that casts past the type. */
function withoutWithheld<T extends object>(props: T): T {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !withheld.has(key) && !isHandler(key))) as T;
}

/**
 * Behavior 1: a name outside the registry fails the TypeScript build. An untyped caller still reaches the
 * component, so the box renders empty, never a guess, and says so in development, where the types cannot
 * reach; it is checked during the render, so a server render says it too.
 */
function isRegistryId(name: unknown): name is IconName {
  if (typeof name === "string" && Object.hasOwn(iconRegistry, name)) return true;
  if (isDevelopment()) console.error(`Icon: "${String(name)}" is not an id of the icon registry (spec/icons/registry.json, ADR-0013); nothing is drawn.`);
  return false;
}

/**
 * `motion.symbolChange`: whether the glyph replaces another, because this Icon has drawn a different `name`
 * before. React's pattern for information from an earlier render: the render that sees a new `name` updates
 * the state, and React renders again before it commits, so the first drawing is never a replacement.
 */
function useReplaced(name: string): boolean {
  const [drawn, setDrawn] = useState({ name, replaced: false });
  if (drawn.name !== name) {
    setDrawn({ name, replaced: true });
    return true;
  }
  return drawn.replaced;
}

export function IconPart(props: IconPartProps): ReactNode {
  const { name, size = "md", weight = "control", style = "outline", tone = "primary", label, isDecorative = false, slot, className, ref, ...loose } = props;
  const rest = withoutWithheld(loose);
  const surface = useSurfaceContext();
  const exposed = isIconExposed(label, isDecorative);
  const replaced = useReplaced(name);

  // The caller's props first, the component's own after them, so the component's attributes win.
  const own = {
    className: joinClassNames("ds-icon", className),
    "data-ds-slot": slot,
    "data-ds-icon": name,
    "data-ds-size": size,
    "data-ds-surface": surface.material,
    "data-ds-backdrop": surface.backdrop,
    "data-ds-tone": tone === "inherit" ? undefined : tone,
  };

  return (
    <span {...rest} {...own} ref={ref} {...(exposed ? { role: "img", "aria-label": label } : { "aria-hidden": "true" as const })}>
      {/* Keyed by the id, so a new name mounts a new svg and its fade runs from the start. */}
      {isRegistryId(name) ? <Glyph key={name} name={name} size={size} weight={weight} style={style} replaced={replaced} /> : null}
    </span>
  );
}

export function Icon(props: IconProps): ReactNode {
  return <IconPart {...props} slot="icon" />;
}
