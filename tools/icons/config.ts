// Pure data for the icon pipeline (roadmap P2-2, ADR-0013, ADR-0019 §6). Paths, the directories the
// icon codegen owns, and the roots ADR-0013 rule 5 keeps free of SF Symbol names.

/** Repository-relative paths (POSIX). */
export const PATHS = {
  registry: "spec/icons/registry.json",
  schema: "spec/icons/registry.schema.json",
  /** The px icon boxes `sizes[*].token` points into. */
  refDimensions: "tokens/ref/dimension.tokens.json",
  /** The numeric icon-weight tokens the weight table must cover (critic C-23). */
  sysBase: "tokens/sys/base.tokens.json",
} as const;

/** The npm package that is Prism's one open icon set (ADR-0013 decision 2). */
export const PHOSPHOR_PACKAGE = "@phosphor-icons/core";

/**
 * The directories `icons:build` owns: it writes the files it produces, deletes files inside them it
 * no longer produces and never writes anywhere else. `icons:validate` runs the same build in check
 * mode, so a stale or hand-edited generated file fails CI exactly as `tokens:check` does for tokens
 * (ADR-0024 §11). These roots are disjoint from `OWNED_ROOTS` in tools/tokens/config.ts.
 */
export const OWNED_ROOTS: readonly string[] = [
  // The Tokens Studio icon list (the token export under tokens/export belongs to the token writer).
  "spec/icons/generated",
  // `iconRegistry` and its types, next to the React `Icon` that reads them (G-20, ADR-0019 §6).
  "web/packages/react/src/generated",
  // `DSIconName` and the weight, style and size tables (ADR-0019 §6; the `DSIcon` view is Phase 3).
  "swift/Sources/DSIcons/Generated",
  // The Phosphor-derived image sets and the Phosphor licence copy that ships with them (critic G-09).
  "swift/Sources/DSIcons/Resources",
];

/**
 * ADR-0013 rule 5: SF Symbol names never appear in the web package, the gallery, the Tokens Studio
 * export or Figma web frames. Checked over these roots for every dotted `apple.symbol` of the
 * registry; single-word names such as `circle` or `house` are ordinary English words and are checked
 * only by the shape of the generated web output, which carries no Apple binding at all.
 */
export const SF_FREE_ROOTS: readonly string[] = ["web", "gallery", "tokens/export", "spec/icons/generated", "docs/direction-board"];

/** Files the scan never reads (build output and dependencies). */
export const SF_FREE_SKIP = new Set(["node_modules", "dist", "storybook-static", "test-results", "playwright-report", ".DS_Store"]);
