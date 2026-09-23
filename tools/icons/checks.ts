// The registry rules `icons:validate` enforces on every platform (roadmap P2-2). Each rule is a pure
// function over data the caller read, so the fixtures under tools/icons/fixtures exercise them
// without a repository tree. The rules that need macOS — SF Symbols availability at the floor and the
// NSImage smoke test — live in tools/icons-apple, which checks rule 4's mirroring by name again.
//
// Rule codes are stable: they are printed with every line and asserted by checks.test.ts.

import { PHOSPHOR_CUTS, WEIGHT_NAMES, error, mirrorOf, warning, type Issue, type PhosphorCut, type Registry } from "./registry.ts";
import type { Catalog } from "./phosphor.ts";

/**
 * SF Symbol name parts that make a symbol direction-relative, so the system resolves it per layout
 * direction and an extra flip would undo it (critic C-24). A left/right-named symbol is not mirrored
 * by the system, even one CoreGlyphs' `legacy_flippable.plist` lists (measured on the iOS 26.5
 * simulator and on macOS; tools/icons-apple `Checks.autoMirrors`).
 */
const DIRECTIONAL_PARTS = ["backward", "forward", "leading", "trailing"];

/**
 * Symbols whose names are not direction-relative but which SF Symbols draws mirrored in a
 * right-to-left layout anyway, because the catalog ships a right-to-left drawing for them: the day
 * grid of `calendar` runs from the right, and `chart.xyaxis.line` puts its axes on the right. Measured
 * on the iOS 26.5 simulator (swift/Tests/DSSnapshotTests/DSIconBoxTests.swift) and listed with a
 * right-to-left rendition in CoreGlyphs' `Assets.car`, which only Xcode's `assetutil` can read, so
 * the names are written out here and in tools/icons-apple `Checks.systemLocalized`. The registry
 * entries that bind them set `rtlMirror.web` so that the web draws what Apple draws.
 */
const SYSTEM_LOCALIZED_SYMBOLS: ReadonlySet<string> = new Set(["calendar", "chart.xyaxis.line"]);

/** `styles[*].phosphor` is either the weight cut placeholder or a real Phosphor cut. */
const WEIGHT_CUT_PLACEHOLDER = "$weight";

export function isDirectionalSymbol(name: string): boolean {
  return name.split(".").some((part) => DIRECTIONAL_PARTS.includes(part));
}

/**
 * Whether the system draws a symbol mirrored in a right-to-left layout by itself: a direction-relative
 * name, or one of `SYSTEM_LOCALIZED_SYMBOLS`. Rule 4 by name, on both halves: such a symbol keeps
 * `rtlMirror.apple` false, and a glyph the web flips binds one of them or sets `rtlMirror.apple`. What
 * each glyph actually draws is measured on the simulator by DSIconBoxTests.
 */
export function isSystemMirrored(name: string): boolean {
  return isDirectionalSymbol(name) || SYSTEM_LOCALIZED_SYMBOLS.has(name);
}

/** The Phosphor cuts an image set is generated for: every cut a weight or a style can ask for. */
export function requiredCuts(registry: Registry): readonly PhosphorCut[] {
  const cuts = new Set<PhosphorCut>();
  for (const name of WEIGHT_NAMES) cuts.add(registry.weights[name].phosphor);
  for (const style of Object.values(registry.styles)) {
    if (style.phosphor !== WEIGHT_CUT_PLACEHOLDER && (PHOSPHOR_CUTS as readonly string[]).includes(style.phosphor)) cuts.add(style.phosphor as PhosphorCut);
  }
  return PHOSPHOR_CUTS.filter((cut) => cuts.has(cut));
}

/** Names close enough to a misspelling to be worth printing (one edit apart, or one contains the other). */
function suggestions(name: string, catalog: Catalog): string[] {
  const hits: string[] = [];
  for (const candidate of catalog.byName.keys()) {
    if (candidate.startsWith(name) || name.startsWith(candidate) || editDistanceAtMostTwo(name, candidate)) hits.push(candidate);
    if (hits.length >= 3) break;
  }
  return hits;
}

function editDistanceAtMostTwo(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 2) return false;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min((next[j - 1] ?? 0) + 1, (row[j] ?? 0) + 1, (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return (row[b.length] ?? 99) <= 2;
}

/** The weight, style and size tables: the ladder, the Bold Text step and the cuts the styles ask for. */
export function checkTables(registry: Registry): readonly Issue[] {
  const issues: Issue[] = [];
  let previous = 0;
  for (const name of WEIGHT_NAMES) {
    const weight = registry.weights[name];
    if (weight.number <= previous) {
      issues.push(error("weight/ladder", `weights.${name}`, `number ${weight.number} does not increase over the previous weight (${previous}); the ladder thin…heavy is the number-to-name table`));
    }
    previous = weight.number;
  }
  for (const name of WEIGHT_NAMES) {
    const weight = registry.weights[name];
    const step = registry.weights[weight.boldText];
    const last = WEIGHT_NAMES[WEIGHT_NAMES.length - 1];
    if (name === last) {
      if (weight.boldText !== name) issues.push(error("weight/bold-text", `weights.${name}`, `the heaviest weight steps to itself under Bold Text, not to ${weight.boldText}`));
    } else if (step.number <= weight.number) {
      issues.push(error("weight/bold-text", `weights.${name}`, `boldText ${weight.boldText} (${step.number}) is not heavier than ${name} (${weight.number}); Bold Text must change the glyph`));
    }
  }
  for (const [name, style] of Object.entries(registry.styles)) {
    if (style.phosphor !== WEIGHT_CUT_PLACEHOLDER && !(PHOSPHOR_CUTS as readonly string[]).includes(style.phosphor)) {
      issues.push(error("style/cut", `styles.${name}`, `phosphor ${JSON.stringify(style.phosphor)} is neither "${WEIGHT_CUT_PLACEHOLDER}" nor a Phosphor cut (${PHOSPHOR_CUTS.join(", ")})`));
    }
  }
  return issues;
}

/** Every rule that needs the installed Phosphor catalog (ADR-0013 decision 2 and rule 1). */
export function checkAgainstCatalog(registry: Registry, catalog: Catalog): readonly Issue[] {
  const issues: Issue[] = [];
  if (registry.sources.phosphor.version !== catalog.version) {
    issues.push(
      error(
        "phosphor/version",
        "sources.phosphor.version",
        `the registry pins ${registry.sources.phosphor.version} but ${registry.sources.phosphor.package} ${catalog.version} is installed; a set bump is a reviewed change (ADR-0013)`,
      ),
    );
  }
  const cuts = requiredCuts(registry);
  for (const [id, icon] of Object.entries(registry.icons)) {
    const name = icon.web.phosphor;
    if (!catalog.byName.has(name)) {
      const canonical = catalog.canonicalOf.get(name);
      if (canonical !== undefined) {
        issues.push(warning("phosphor/alias", id, `${JSON.stringify(name)} is the old name of ${JSON.stringify(canonical)}; bind the canonical name`));
      } else {
        const near = suggestions(name, catalog);
        issues.push(error("phosphor/unknown", id, `${JSON.stringify(name)} is not in the ${registry.sources.phosphor.package} catalog${near.length > 0 ? ` (did you mean ${near.map((n) => JSON.stringify(n)).join(", ")}?)` : ""}`));
      }
      continue;
    }
    if (icon.apple.custom !== undefined) {
      for (const cut of cuts) {
        if (catalog.assetPath(name, cut) === null) {
          issues.push(error("phosphor/asset-missing", id, `${JSON.stringify(name)} has no ${cut} SVG, which the generated ${icon.apple.custom} image set needs`));
        }
      }
    }
  }
  return issues;
}

/** The registry's own rules: ids, labels, tags, mirroring, deprecations and the Apple binding shape. */
export function checkRegistryRules(registry: Registry): readonly Issue[] {
  const issues: Issue[] = [];
  const customIds = new Map<string, string>();
  const floor = Number(registry.sources.sfSymbols.osFloor);
  for (const [id, icon] of Object.entries(registry.icons)) {
    if (icon.label !== `icon.${id}`) {
      issues.push(error("label/mismatch", id, `label ${JSON.stringify(icon.label)} is not the id's key ${JSON.stringify(`icon.${id}`)}`));
    }
    if (icon.tags.includes(icon.web.phosphor) && icon.tags.length === 1) {
      issues.push(warning("tags/thin", id, "the only tag repeats the Phosphor name; tags are the synonyms an agent searches by (critic C-22)"));
    }
    const mirror = mirrorOf(icon);
    const { symbol, custom, minOS, fallback } = icon.apple;
    if (custom !== undefined) {
      const previous = customIds.get(custom);
      if (previous !== undefined) issues.push(error("custom/duplicate", id, `${JSON.stringify(custom)} is already the Apple binding of ${previous}`));
      customIds.set(custom, id);
      if (minOS !== undefined) issues.push(error("apple/min-os-on-custom", id, "a Phosphor-derived image set has no OS floor; drop minOS and fallback"));
      if (mirror.web !== mirror.apple) {
        issues.push(error("rtl/custom-mismatch", id, `the same Phosphor glyph renders on both stacks, so rtlMirror.web (${mirror.web}) and rtlMirror.apple (${mirror.apple}) must agree`));
      }
    }
    if (symbol !== undefined) {
      if (mirror.apple && isSystemMirrored(symbol)) {
        issues.push(error("rtl/double-mirror", id, `the system already draws ${JSON.stringify(symbol)} mirrored in a right-to-left layout; rtlMirror.apple must be false`));
      }
      if (mirror.web && !mirror.apple && !isSystemMirrored(symbol)) {
        issues.push(
          error(
            "rtl/missing-mirror",
            id,
            `the web flips this glyph but the system does not mirror ${JSON.stringify(symbol)} and rtlMirror.apple is false, so Apple draws it unmirrored; bind the backward/forward/leading/trailing symbol, or set rtlMirror.apple`,
          ),
        );
      }
      if (fallback === symbol) issues.push(error("apple/fallback-equals-symbol", id, `the fallback repeats ${JSON.stringify(symbol)}`));
      if (minOS !== undefined && Number(minOS) <= floor) {
        issues.push(error("apple/min-os-below-floor", id, `minOS ${minOS} is at or below the floor ${registry.sources.sfSymbols.osFloor}; a symbol available at the floor declares neither minOS nor fallback`));
      }
    }
    const deprecated = icon.deprecated;
    if (deprecated !== undefined) {
      const target = registry.icons[deprecated.replacedBy];
      if (target === undefined) issues.push(error("deprecated/replaced-by", id, `replacedBy ${JSON.stringify(deprecated.replacedBy)} is not an icon id`));
      else if (target.deprecated !== undefined) issues.push(error("deprecated/replaced-by", id, `replacedBy ${JSON.stringify(deprecated.replacedBy)} is itself deprecated`));
    }
  }
  return issues;
}

/** A token document as `JSON.parse` returns it. */
export type TokenDocument = Record<string, unknown>;

function tokenValue(document: TokenDocument, path: string): unknown {
  let node: unknown = document;
  for (const segment of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  if (typeof node !== "object" || node === null) return undefined;
  return (node as { $value?: unknown }).$value;
}

/**
 * The numeric icon-weight tokens and the px icon boxes against the registry (critic C-23): every
 * `sys.icon.weight*` value is a weight number, and every `sizes[*].token` resolves to `sizes[*].px`.
 */
export function checkTokens(registry: Registry, sysBase: TokenDocument, refDimensions: TokenDocument): readonly Issue[] {
  const issues: Issue[] = [];
  const numbers = new Map<number, string>();
  for (const name of WEIGHT_NAMES) numbers.set(registry.weights[name].number, name);
  const iconGroup = ((sysBase["sys"] as Record<string, unknown> | undefined)?.["icon"] ?? {}) as Record<string, unknown>;
  const weightTokens = Object.entries(iconGroup).filter(([key]) => key.startsWith("weight"));
  if (weightTokens.length === 0) issues.push(error("tokens/icon-weight", "sys.icon", "no sys.icon.weight* token found; the number-to-name table has nothing to answer for"));
  for (const [key, node] of weightTokens) {
    const value = (node as { $value?: unknown }).$value;
    if (typeof value !== "number") {
      issues.push(error("tokens/icon-weight", `sys.icon.${key}`, `$value ${JSON.stringify(value)} is not a number`));
    } else if (!numbers.has(value)) {
      issues.push(error("tokens/icon-weight", `sys.icon.${key}`, `${value} is not a registry weight number (${[...numbers.keys()].join(", ")}); the registry is the number-to-name table (critic C-23)`));
    }
  }
  for (const [name, size] of Object.entries(registry.sizes)) {
    const value = tokenValue(refDimensions, size.token);
    const px = (value as { value?: unknown; unit?: unknown } | undefined)?.value;
    const unit = (value as { unit?: unknown } | undefined)?.unit;
    if (typeof px !== "number" || unit !== "px") {
      issues.push(error("tokens/icon-size", `sizes.${name}`, `${size.token} is not a px dimension token`));
    } else if (px !== size.px) {
      issues.push(error("tokens/icon-size", `sizes.${name}`, `${size.token} is ${px} px but the registry maps ${size.px} px to SF ${size.sf.pointSize} pt`));
    }
  }
  return issues;
}

/** One scanned file for the SF-name rule. */
export interface ScannedFile {
  readonly path: string;
  readonly text: string;
}

/**
 * ADR-0013 rule 5: an SF Symbol name never appears in the web package, the gallery or the design-tool
 * exports. Only dotted names are searched: single-word symbols such as `circle` or `house` are
 * ordinary words, and the generated web output carries no Apple binding at all (codegen.test.ts).
 */
export function checkSfNamesAbsent(registry: Registry, files: readonly ScannedFile[]): readonly Issue[] {
  const issues: Issue[] = [];
  const names = new Set<string>();
  for (const icon of Object.values(registry.icons)) {
    for (const name of [icon.apple.symbol, icon.apple.fallback]) if (name !== undefined && name.includes(".")) names.add(name);
  }
  for (const file of files) {
    for (const name of names) {
      if (file.text.includes(name)) {
        issues.push(error("sf/name-in-web", file.path, `contains the SF Symbol name ${JSON.stringify(name)}; SF Symbols are licensed for Apple user interfaces only (ADR-0013 rule 5)`));
      }
    }
  }
  return issues;
}
