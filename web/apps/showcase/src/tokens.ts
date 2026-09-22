/**
 * The token catalogue, and how a token's value is read twice (docs/showcase.md §1).
 *
 * Sections come from the data and never from a list in the app: a section is the `tier` plus the
 * first path segment, so a new token group gets a screen for free and only a new DTCG `type` would
 * need a new specimen. `comp` is one group per component prefix and `ref` one group per primitive
 * family, both read off the path.
 *
 * A value is read twice and shown together:
 *
 *  - what the brand's JavaScript table says — `resolveTokens(readContext(element))`, the same call a
 *    chart or a Motion spring makes;
 *  - what the document actually painted — the computed custom property on an element inside the scope
 *    being shown, which is what CSS resolved for it.
 *
 * Colours are compared as sRGB bytes on a 1×1 canvas, never as strings: Chromium serialises one
 * colour several ways (`oklch(…)` painted, `oklab(…)` mid-interpolation), and comparing the spellings
 * answers a question the showcase is not asking (fixtures/vite-app/src/main.jsx says the same).
 */
import { tokens as manifestTokens } from "virtual:prism/tokens";
import type { TokenManifestEntry } from "../plugins/catalog.ts";

/** A specimen group inside a screen: the second path segment, e.g. `color.bg.*` or `comp.button.*`. */
export interface TokenGroup {
  readonly id: string;
  readonly title: string;
  readonly tokens: readonly TokenManifestEntry[];
}

/** One Foundations screen. */
export interface FoundationPage {
  readonly id: string;
  readonly title: string;
  readonly tier: string;
  readonly count: number;
  readonly groups: readonly TokenGroup[];
}

const segment = (path: string, index: number): string => path.split(".")[index] ?? "";

/** The screen a token belongs to: its tier plus its first path segment (`comp` and `ref` are one each). */
function pageIdOf(entry: TokenManifestEntry): string {
  return entry.tier === "sys" ? segment(entry.path, 0) : entry.tier;
}

/** The group inside the screen: the next path segment — the family under `sys` and `ref`, the component prefix under `comp`. */
function groupIdOf(entry: TokenManifestEntry): string {
  return segment(entry.path, 1);
}

/** Screens, biggest first inside each tier, in tier order `sys`, `comp`, `ref`. A group of one is not worth a heading. */
export const foundationPages: readonly FoundationPage[] = (() => {
  const byPage = new Map<string, TokenManifestEntry[]>();
  for (const entry of manifestTokens) {
    const id = pageIdOf(entry);
    const bucket = byPage.get(id);
    if (bucket === undefined) byPage.set(id, [entry]);
    else bucket.push(entry);
  }

  const pages: FoundationPage[] = [];
  for (const [id, entries] of byPage) {
    const tier = entries[0]?.tier ?? "";
    const byGroup = new Map<string, TokenManifestEntry[]>();
    for (const entry of entries) {
      const groupId = groupIdOf(entry);
      const bucket = byGroup.get(groupId);
      if (bucket === undefined) byGroup.set(groupId, [entry]);
      else bucket.push(entry);
    }
    // Below this many tokens a screen reads better as one list than as a stack of one-row groups.
    const grouped = entries.length > 12 && byGroup.size > 1;
    const groups: TokenGroup[] = grouped
      ? [...byGroup].map(([groupId, bucket]) => ({ id: groupId, title: `${id}.${groupId}`, tokens: bucket }))
      : [{ id, title: id, tokens: entries }];
    groups.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    pages.push({ id, title: id, tier, count: entries.length, groups });
  }

  const tierOrder = ["sys", "comp", "ref"];
  pages.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier) || b.count - a.count || (a.id < b.id ? -1 : 1));
  return pages;
})();

/** Tier → how many tokens it has, for the Overview counts. */
export const tokensByTier: Readonly<Record<string, number>> = (() => {
  const counts: Record<string, number> = {};
  for (const entry of manifestTokens) counts[entry.tier] = (counts[entry.tier] ?? 0) + 1;
  return counts;
})();

/** DTCG type → how many tokens carry it; the About screen names the specimens this covers. */
export const tokensByType: Readonly<Record<string, number>> = (() => {
  const counts: Record<string, number> = {};
  for (const entry of manifestTokens) counts[entry.type] = (counts[entry.type] ?? 0) + 1;
  return counts;
})();

export const tokenCount = manifestTokens.length;

/* ------------------------------------------------------------------ values */

/** The shape of one row of a `<brand>/tokens` table (the generated `Entry`). */
export interface BrandTableEntry {
  readonly $type?: string;
  readonly $cssVar?: string;
  readonly $cssVars?: Readonly<Record<string, string>>;
  readonly $axis?: string;
}

let swatch: CanvasRenderingContext2D | null | undefined;

function swatchContext(): CanvasRenderingContext2D | null {
  if (swatch === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    swatch = canvas.getContext("2d", { willReadFrequently: true });
  }
  return swatch;
}

/** The sRGB bytes a CSS colour paints, or `null` when the browser cannot paint it. */
export function srgb(value: string): string | null {
  const context = swatchContext();
  if (context === null || value === "") return null;
  if (typeof CSS === "undefined" || !CSS.supports("color", value)) return null;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = "#0000";
  context.fillRect(0, 0, 1, 1);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  return Array.from(context.getImageData(0, 0, 1, 1).data).join(",");
}

/** The `css` string a colour, an easing, a transition or a gradient value carries. */
function cssOf(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("css" in value)) return null;
  const css: unknown = value.css;
  return typeof css === "string" ? css : null;
}

/** What the brand table says this token's CSS should read, when the two are comparable at all. */
export function expectedCss(type: string, value: unknown): string | null {
  switch (type) {
    case "color":
      return cssOf(value);
    case "dimension":
      return typeof value === "number" ? `${value}px` : null;
    case "duration":
      return typeof value === "number" ? `${value}ms` : null;
    case "number":
      return typeof value === "number" ? String(value) : typeof value === "boolean" ? (value ? "1" : "0") : null;
    case "fontFamily":
      return typeof value === "string" ? value : null;
    case "cubicBezier":
    case "transition":
    case "gradient":
      return cssOf(value);
    case "shadow":
      return shadowCss(value);
    default:
      // `typography` has no base declaration and `strokeStyle` publishes sub-properties only: those
      // specimens show both sides and are compared on neither.
      return null;
  }
}

interface ShadowLayer {
  readonly color: string;
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly inset: boolean;
}

/** The `box-shadow` a table's layers spell, in the order the token declares them. */
function shadowCss(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const layers = value as readonly ShadowLayer[];
  if (layers.length === 0) return null;
  return layers
    .map((layer) => `${layer.inset ? "inset " : ""}${String(layer.x)}px ${String(layer.y)}px ${String(layer.blur)}px ${String(layer.spread)}px ${layer.color}`)
    .join(", ");
}

export type Agreement = "match" | "differs" | "unchecked";

/**
 * Every number in a CSS value, written one way.
 *
 * The two sides are the same value in two spellings, and neither spelling is the question: the
 * browser serialises `250ms` as `.25s` and `cubic-bezier(0.32, …)` as `cubic-bezier(.32, …)`, and a
 * string comparison would report both as differences. So each numeric token is re-read as a number
 * and written back, with seconds carried to milliseconds. A `#rrggbbaa` is left alone — a hex is not
 * a number, and a colour is compared by painting it anyway.
 */
const NUMBER = /(?<![#0-9a-z.])(-?\d*\.?\d+(?:e[-+]?\d+)?)(%|[a-z]+)?/gi;

export function normaliseCss(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replaceAll('"', "'")
    .trim()
    .toLowerCase()
    .replace(NUMBER, (token, digits: string, unit: string | undefined) => {
      const n = Number(digits);
      if (!Number.isFinite(n)) return token;
      if (unit === "s") return `${String(Number((n * 1000).toFixed(6)))}ms`;
      return `${String(n)}${unit ?? ""}`;
    });
}

/**
 * Every colour inside a larger value — the stops of a gradient, the colour of a shadow layer.
 * A hex, or a colour function with no nested parentheses, which is every form these tokens use.
 */
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:oklch|oklab|lab|lch|hwb|rgba?|hsla?|color)\([^()]*\)/gi;

/** The value with every colour lifted out, so the shape and the colours can be compared separately. */
function splitColours(value: string): { readonly shape: string; readonly colours: readonly string[] } {
  const colours: string[] = [];
  const shape = value.replace(COLOUR, (match) => {
    colours.push(match);
    return "\u0000";
  });
  return { shape, colours };
}

/**
 * Whether the painted value and the table agree.
 *
 * A colour is compared as the sRGB bytes it paints, never as a string: one colour has several
 * spellings, and comparing the spellings answers a question the showcase is not asking. A value that
 * *contains* colours — a gradient's stops, a shadow's layers — is split the same way: each colour is
 * painted and compared, and what is left is compared as numbers (`normaliseCss`). That is why
 * `oklch(43.47% …)` painted and `oklch(0.4347 …)` in the table are one value here, not two.
 */
export function agrees(type: string, painted: string, expected: string): Agreement {
  if (type === "color") {
    const a = srgb(painted);
    const b = srgb(expected);
    if (a === null || b === null) return "unchecked";
    return a === b ? "match" : "differs";
  }

  const left = splitColours(painted);
  const right = splitColours(expected);
  if (left.colours.length !== right.colours.length) return "differs";
  for (let i = 0; i < left.colours.length; i += 1) {
    const a = srgb(left.colours[i] ?? "");
    const b = srgb(right.colours[i] ?? "");
    if (a === null || b === null) return "unchecked";
    if (a !== b) return "differs";
  }
  return normaliseCss(left.shape) === normaliseCss(right.shape) ? "match" : "differs";
}

/** The computed custom property at `element` — what this document actually resolved for the token. */
export function paintedVar(element: Element, cssVar: string): string {
  return getComputedStyle(element).getPropertyValue(cssVar).trim();
}
