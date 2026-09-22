/**
 * The tone table of spec/components/Text.yaml (specVersion 2): ADR-0022 §3.1 as ADR-0029 §1.4 and
 * ADR-0030 §3.4 amend it. Every foreground is read against the material the enclosing Surface
 * publishes and, on the scheme's glass, against the backdrop kind it publishes with it; nothing here
 * reads the color scheme (Text.yaml behavior 1).
 *
 * A foreground is named by its `color.text.*` token path without the `color.text.` prefix, which is
 * also the suffix of its custom property (`secondary` → `--ds-color-text-secondary`, ARCHITECTURE §8);
 * Text writes it as `data-ds-foreground` and its stylesheet maps it to the variable. The unit test
 * reads Text.yaml and checks this table cell by cell, so the two cannot drift.
 */
import type { SurfaceContextValue } from "../surface/context.ts";

/** Text.yaml `role`. */
export const textRoles = [
  "display-xl",
  "display-lg",
  "display-md",
  "title-lg",
  "title-md",
  "title-sm",
  "headline",
  "body-lg",
  "body-md",
  "body-sm",
  "label-lg",
  "label-md",
  "label-sm",
  "caption",
  "micro",
  "eyebrow",
  "metric-xl",
  "metric-lg",
  "metric-md",
  "data",
] as const;
export type TextRole = (typeof textRoles)[number];

/** Text.yaml `tone`; `inherit` takes the color of the parent element and resolves nothing. */
export const textTones = ["primary", "secondary", "tertiary", "dimmed", "accent", "success", "warning", "critical", "info", "inherit"] as const;
export type TextTone = (typeof textTones)[number];

/** Text.yaml `numeric`. */
export const textNumerics = ["auto", "proportional", "tabular"] as const;
export type TextNumeric = (typeof textNumerics)[number];

/** Text.yaml `truncation`. */
export const textTruncations = ["none", "ellipsis", "fade"] as const;
export type TextTruncation = (typeof textTruncations)[number];

/** Every `color.text.*` foreground Text can resolve, without the `color.text.` prefix. */
export const textForegrounds = [
  "primary",
  "secondary",
  "tertiary",
  "dimmed",
  "accent",
  "success",
  "warning",
  "critical",
  "info",
  "on-vivid",
  "on-inverse",
  "on-accent",
  "on-accent-secondary",
  "on-glass-light",
  "on-glass-fill",
  "on-glass-fill-secondary",
  "on-glass-fill-tertiary",
  "on-glass-fill-dimmed",
  "on-glass-fill-media-secondary",
  "on-glass-fill-media-tertiary",
] as const;
export type TextForeground = (typeof textForegrounds)[number];

type ResolvedTone = Exclude<TextTone, "inherit">;

/**
 * The metric roles whose token size is at least 24 px, where `dimmed` and the trailing group are
 * permitted (Text.yaml behavior 5). `metric-md` is 20 px: its dimmed tone and trailing group resolve
 * to `secondary`. The brand type scale is at most 1.25 (ADR-0021 §6), so no brand moves `metric-lg`
 * (32 px) below the threshold; a scale that lifted `metric-md` to 24 px would still render the
 * higher-contrast `secondary`, never a weaker tone.
 */
const DIMMABLE_ROLES: ReadonlySet<TextRole> = new Set<TextRole>(["metric-xl", "metric-lg"]);

/** Text.yaml: `trailing` and `unit` exist on metric roles only. */
export function isMetricRole(role: TextRole): boolean {
  return role === "metric-xl" || role === "metric-lg" || role === "metric-md";
}

/** Headings: Text.yaml accessibility, "heading level when role is title-* or display-*". */
export function isHeadingRole(role: TextRole): boolean {
  return role.startsWith("title-") || role.startsWith("display-");
}

/** Whether the scheme's glass over this backdrop takes the map tones (ADR-0029 §1.4). */
function overMap(surface: Pick<SurfaceContextValue, "backdrop">): boolean {
  return surface.backdrop === "map";
}

function effectiveTone(tone: ResolvedTone, role: TextRole): ResolvedTone {
  return tone === "dimmed" && !DIMMABLE_ROLES.has(role) ? "secondary" : tone;
}

/** The foreground of a tone on the published material; `null` for `inherit`. */
export function foregroundOf(
  surface: Pick<SurfaceContextValue, "material" | "backdrop">,
  tone: TextTone,
  role: TextRole,
): TextForeground | null {
  if (tone === "inherit") return null;
  const resolved = effectiveTone(tone, role);
  switch (surface.material) {
    case "page":
    case "solid":
    case "raised":
    case "nested":
      return resolved;
    case "vivid":
      return "on-vivid";
    case "inverse":
      return "on-inverse";
    case "glassLight":
      return "on-glass-light";
    case "accent":
      return resolved === "secondary" || resolved === "tertiary" || resolved === "dimmed" ? "on-accent-secondary" : "on-accent";
    case "glass":
      switch (resolved) {
        case "secondary":
          return overMap(surface) ? "on-glass-fill-secondary" : "on-glass-fill-media-secondary";
        case "tertiary":
          return overMap(surface) ? "on-glass-fill-tertiary" : "on-glass-fill-media-tertiary";
        case "dimmed":
          return overMap(surface) ? "on-glass-fill-dimmed" : "on-glass-fill-media-tertiary";
        default:
          return "on-glass-fill";
      }
  }
}

/**
 * The dimmed trailing group of a metric (Text.yaml `tokens.trailing.color`). Below 24 px it takes the
 * `secondary` tone of the material instead (behavior 5).
 */
export function trailingForegroundOf(surface: Pick<SurfaceContextValue, "material" | "backdrop">, role: TextRole): TextForeground {
  if (!DIMMABLE_ROLES.has(role)) return foregroundOf(surface, "secondary", role) ?? "secondary";
  switch (surface.material) {
    case "page":
    case "solid":
    case "raised":
    case "nested":
      return "dimmed";
    case "vivid":
      return "on-vivid";
    case "inverse":
      return "on-inverse";
    case "accent":
      return "on-accent-secondary";
    case "glassLight":
      return "on-glass-light";
    case "glass":
      return overMap(surface) ? "on-glass-fill-dimmed" : "on-glass-fill-media-tertiary";
  }
}

/** The hung unit of a metric (Text.yaml `tokens.unit.color`). */
export function unitForegroundOf(surface: Pick<SurfaceContextValue, "material" | "backdrop">): TextForeground {
  switch (surface.material) {
    case "page":
    case "solid":
    case "raised":
    case "nested":
      return "secondary";
    case "vivid":
      return "on-vivid";
    case "inverse":
      return "on-inverse";
    case "accent":
      return "on-accent-secondary";
    case "glassLight":
      return "on-glass-light";
    case "glass":
      return overMap(surface) ? "on-glass-fill-secondary" : "on-glass-fill-media-secondary";
  }
}
