/**
 * `Avatar` (spec/components/Avatar.yaml, specVersion 1): a circular portrait of a person, a vehicle or a site.
 *
 * - The root is the circle, and the Surface module's glass chip (ADR-0036 §2 to §7): `useSurfaceChip` resolves
 *   Avatar's `root.background` cell on the ground the circle reads (`avatarBackground`, ./parts.ts) and the root
 *   carries its props — the rendering, whether glass renders without a backdrop filter, and the context the chip
 *   publishes as `data-ds-surface` and `data-ds-backdrop`. Surface.css paints the circle: the chip recipe over a map,
 *   an image, vivid or the scheme's glass; `comp.avatar.bg` elsewhere, which Avatar.css hands the chip as
 *   `--ds--surface-chip-own`; nothing on accent and inverse; and under Reduce Transparency and Increase Contrast the
 *   fallback, `color.bg.surface.raised` over `color.bg.page`, which React has decided before the stylesheet sees it.
 *   Avatar reads no setting and never sets the root's background (ADR-0036 rule 2).
 * - The other parts read what the chip publishes, never the ground: the initials, the fallback glyph and the ring
 *   take Avatar's own cells from the root's `data-ds-surface` and `data-ds-backdrop` (Avatar.css), and sit inside
 *   `SurfaceChipScope`, so a glyph reads the published context too. Under the fallback the chip publishes
 *   `(raised, none)`, so every part takes its `default` cell by construction (ADR-0036 §4). The initials are Text
 *   and the glyph is Icon's box with `tone: inherit`: the tone tables would give `on-vivid` on vivid, where Avatar
 *   binds `color.text.on-glass-fill`.
 * - The circle is a square of `size.control.*` at `radius.control`, which clips everything inside it (behaviors 4
 *   and 5). The content falls back in one order: the image, then the initials of `name`, then `object.user`
 *   (behavior 1). The initials are always drawn under an image, so while it loads the circle shows them, and the
 *   image fades in over them once it has decoded (behavior 13, `motion.imageLoad`); a source that fails to load is
 *   dropped, and the initials stay. `hasRing` draws an inset stroke of `border.strong` flush with the edge, inside
 *   the circle's own footprint (behavior 6).
 * - The initials (behavior 2, ./parts.ts) are upper-cased in React Aria's `useLocale()` locale, the app's own.
 * - Accessibility (behaviors 11 and 12, `accessibility`, `notes.platform.web-desktop`): Avatar speaks no word of its
 *   own. An avatar with a non-blank `name` and `isDecorative` false is `role="img"` named by `aria-label` from
 *   `name`; every other avatar is `aria-hidden`, and no word is invented for the glyph. The image element inside
 *   carries an empty `alt` whatever the avatar is: the root already carries the name, and Chromium exposes an `img`
 *   with an `alt` as an image of its own even inside `role="img"`, so a named picture would announce the name twice.
 *   Because the root owns the role and the name, the props leave out every attribute that could give it another
 *   role, name, description or hint, or put it in the tab order, and drop them again at runtime (`WITHHELD`, Icon's
 *   list).
 * - Avatar is not a control (behavior 10): no React Aria component, no focus and no gesture. A pressable avatar is
 *   a Button or a ListRow around it, so the props take no DOM event handler (`WithoutHandlers`), and one that
 *   arrives past the type is dropped.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop, to its root element (ADR-0019
 *   rule 8).
 */
import { useCallback, useState, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { useLocale } from "react-aria-components";
import type { ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import { IconPart } from "../icon/Icon.tsx";
import { SurfaceChipEdge, SurfaceChipScope, useSurfaceChip } from "../surface/SurfaceChip.tsx";
import { Text } from "../text/Text.tsx";
import type { AvatarSize } from "./options.ts";
import { avatarBackground, avatarFallbackIconSize, avatarInitials, avatarInitialsRole, isAvatarExposed } from "./parts.ts";

/**
 * The DOM props an Avatar does not take, left out of `AvatarProps` and dropped again at runtime: Icon's list, for
 * the same reasons.
 *
 * - `role`, `aria-hidden` and `aria-roledescription`: the component owns the role and the hidden state, from
 *   `name` and `isDecorative`.
 * - `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-description`, `aria-details` and `title`: `name` is
 *   the only name an avatar has (`accessibility.label`), and an avatar has no hint.
 * - `tabIndex` and `contentEditable`: either one makes the circle focusable, and an avatar is never a stop
 *   (`keyboard: not focusable`).
 * - `children` and `dangerouslySetInnerHTML`: the circle draws its own parts and nothing else.
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

/** Every key of `T` but a DOM event handler: Avatar.yaml behavior 10, an avatar is not a control. */
type WithoutHandlers<T> = { [K in keyof T as K extends `on${string}` ? never : K]: T[K] };

export interface AvatarProps extends ScopeAttributes, WithoutHandlers<Omit<HTMLAttributes<HTMLSpanElement>, (typeof WITHHELD)[number] | "color">> {
  /** Avatar.yaml `name`: the full name. The initials and the accessible name both come from it. */
  readonly name?: string;
  /** Avatar.yaml `image`: the portrait's source. One that fails to load falls back to the initials. */
  readonly image?: string;
  /** Avatar.yaml `size`. Default `md`; the circle is the control height of its size. */
  readonly size?: AvatarSize;
  /** Avatar.yaml `hasRing`. Default false; true draws the one active avatar's ring. */
  readonly hasRing?: boolean;
  /** Avatar.yaml `isDecorative`. Default false; true hides the avatar, for a name already written beside it. */
  readonly isDecorative?: boolean;
  readonly ref?: Ref<HTMLSpanElement>;
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

const withheld: ReadonlySet<string> = new Set(WITHHELD);

/** The caller's props without `WITHHELD` and without an event handler, for a caller that casts past the type. */
function withoutWithheld<T extends object>(props: T): T {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !withheld.has(key) && !key.startsWith("on"))) as T;
}

/** Where an image source is on its way to the circle. */
type ImageStatus = "loading" | "loaded" | "failed";

/**
 * Behaviors 1 and 13: the status of the image a source names, reset whenever the source changes (React's pattern for
 * state derived from a prop, Icon's `useReplaced`). `settle` ignores an event from a source that is no longer the
 * current one. `measure` reads an image that is already complete when it mounts — from the cache, or loaded before
 * hydration — whose `load` event React never sees: a decoded picture is `loaded`, a broken one `failed`.
 */
function useImageStatus(source: string | undefined): {
  readonly status: ImageStatus;
  readonly settle: (status: ImageStatus) => void;
  readonly measure: (element: HTMLImageElement | null) => void;
} {
  const [state, setState] = useState<{ readonly source: string | undefined; readonly status: ImageStatus }>({ source, status: "loading" });
  const settle = useCallback(
    (status: ImageStatus) => {
      setState((current) => (current.source === source && current.status !== status ? { source, status } : current));
    },
    [source],
  );
  const measure = useCallback(
    (element: HTMLImageElement | null) => {
      if (element === null || !element.complete) return;
      settle(element.naturalWidth > 0 ? "loaded" : "failed");
    },
    [settle],
  );
  if (state.source !== source) {
    setState({ source, status: "loading" });
    return { status: "loading", settle, measure };
  }
  return { status: state.status, settle, measure };
}

export function Avatar(props: AvatarProps): ReactNode {
  const { name, image, size = "md", hasRing = false, isDecorative = false, className, ref, ...loose } = props;
  const rest = withoutWithheld(loose);
  const { locale } = useLocale();
  const chip = useSurfaceChip(avatarBackground);
  const initials = avatarInitials(name, locale);
  const accessibleName = isAvatarExposed(name, isDecorative) ? name : null;
  const source = typeof image === "string" && image !== "" ? image : undefined;
  const { status, settle, measure } = useImageStatus(source);

  // The caller's props first, the component's own after them, so the component's attributes win.
  const own = {
    ...chip.rootProps,
    className: joinClassNames(chip.rootProps.className, "ds-avatar", className),
    "data-ds-slot": "avatar",
    "data-ds-size": size,
    "data-ds-ring": hasRing ? "" : undefined,
  };

  return (
    <span {...rest} {...own} ref={ref} {...(accessibleName === null ? { "aria-hidden": "true" as const } : { role: "img", "aria-label": accessibleName })}>
      <SurfaceChipEdge chip={chip} />
      <SurfaceChipScope chip={chip}>
        {initials === null ? (
          <IconPart slot="avatar-fallback-icon" name="object.user" size={avatarFallbackIconSize(size)} tone="inherit" />
        ) : (
          <span className="ds-avatar-initials" data-ds-slot="avatar-initials">
            <Text role={avatarInitialsRole(size)} tone="inherit">
              {initials}
            </Text>
          </span>
        )}
        {source === undefined || status === "failed" ? null : (
          // Keyed by the source, so a new portrait mounts a new element and fades in from the start.
          <img
            key={source}
            ref={measure}
            className="ds-avatar-image"
            data-ds-slot="avatar-image"
            data-ds-loaded={status === "loaded" ? "" : undefined}
            src={source}
            alt=""
            decoding="async"
            draggable={false}
            onLoad={() => {
              settle("loaded");
            }}
            onError={() => {
              settle("failed");
            }}
          />
        )}
        {hasRing ? <span className="ds-avatar-ring" data-ds-slot="avatar-ring" aria-hidden="true" /> : null}
      </SurfaceChipScope>
    </span>
  );
}
