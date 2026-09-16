// What the parity report is made of (ADR-0006 rules 2 and 3, ADR-0010, ADR-0012 rules 2 and 3,
// critic G-21). Everything here is a decision an ADR records; the platform keys and the support
// levels are `spec/component.schema.json`'s, and the manifest table is ADR-0006 rule 2 extended to
// per-platform cells (G-21) and to the data-viz targets of ADR-0007.

/** The platform keys of every spec's `platforms` block (spec/SCHEMA.md, "Platforms and modes"). */
export const PLATFORMS = ['ios', 'ipados', 'macos', 'watchos', 'web-touch', 'web-desktop'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Column headings: the platform names as people write them. */
export const PLATFORM_LABELS: Readonly<Record<Platform, string>> = {
  ios: 'iOS',
  ipados: 'iPadOS',
  macos: 'macOS',
  watchos: 'watchOS',
  'web-touch': 'web-touch',
  'web-desktop': 'web-desktop',
};

/** `full | adapted | none` (ADR-0010). `none` cells are satisfied by definition (ADR-0006 rule 3). */
export const SUPPORT = ['full', 'adapted', 'none'] as const;
export type Support = (typeof SUPPORT)[number];

/** The five layers of ADR-0012, in implementation order; the report's rows are grouped by it. */
export const LAYERS = ['foundation', 'primitive', 'composite', 'dataviz', 'pattern'] as const;
export type Layer = (typeof LAYERS)[number];

/** The two implementations of ADR-0003. A platform belongs to exactly one of them. */
export type Stack = 'swiftui' | 'react';

/**
 * Which manifest of a stack owns a spec: `components` for layers 0–2, `charts` for the data-viz
 * layer (ADR-0007 ships it as its own target and package). Patterns have no manifest entry at all
 * (ADR-0012 rule 3), so they are not a kind.
 */
export type ManifestKind = 'components' | 'charts';

/** The manifest a layer's specs are declared in; null for patterns (ADR-0012 rule 3). */
export const LAYER_MANIFEST: Readonly<Record<Layer, ManifestKind | null>> = {
  foundation: 'components',
  primitive: 'components',
  composite: 'components',
  dataviz: 'charts',
  pattern: null,
};

/** Swift dictionary literal or TypeScript object literal; `tools/parity/manifest.ts` parses both. */
export type ManifestSyntax = 'swift' | 'ts';

export interface ManifestFile {
  readonly stack: Stack;
  readonly kind: ManifestKind;
  /** Repository-relative POSIX path. */
  readonly path: string;
  readonly syntax: ManifestSyntax;
  /** What the declaration is called, for messages: `DSComponentsManifest.implemented`. */
  readonly symbol: string;
  /** The platforms this manifest may declare; every other key is `manifest/platform`. */
  readonly platforms: readonly Platform[];
}

const APPLE: readonly Platform[] = ['ios', 'ipados', 'macos', 'watchos'];
const WEB: readonly Platform[] = ['web-touch', 'web-desktop'];

/**
 * The four implementation manifests (ADR-0006 rule 2, ADR-0007, critic G-20 and G-21). Each declares
 * only its own stack's platforms, so one cell of the report has exactly one manifest behind it: the
 * Apple keys live in Swift, the web keys in the packages that ship the components.
 */
export const MANIFESTS: readonly ManifestFile[] = [
  { stack: 'swiftui', kind: 'components', path: 'swift/Sources/DSComponents/Manifest.swift', syntax: 'swift', symbol: 'DSComponentsManifest.implemented', platforms: APPLE },
  { stack: 'swiftui', kind: 'charts', path: 'swift/Sources/DSCharts/Manifest.swift', syntax: 'swift', symbol: 'DSChartsManifest.implemented', platforms: APPLE },
  { stack: 'react', kind: 'components', path: 'web/packages/react/src/manifest.ts', syntax: 'ts', symbol: 'implemented', platforms: WEB },
  { stack: 'react', kind: 'charts', path: 'web/packages/charts/src/manifest.ts', syntax: 'ts', symbol: 'implemented', platforms: WEB },
];

/** The manifest that owns a platform for a kind; every platform of PLATFORMS has exactly one. */
export function manifestFor(kind: ManifestKind, platform: Platform): ManifestFile {
  const hit = MANIFESTS.find((m) => m.kind === kind && m.platforms.includes(platform));
  if (hit === undefined) throw new Error(`no ${kind} manifest declares ${platform}`);
  return hit;
}

/** The manifest one stack declares a kind in; every stack has one per kind. */
export function stackManifest(stack: Stack, kind: ManifestKind): ManifestFile {
  const hit = MANIFESTS.find((m) => m.stack === stack && m.kind === kind);
  if (hit === undefined) throw new Error(`the ${stack} stack has no ${kind} manifest`);
  return hit;
}

/** Where the report is written, relative to the repository root. */
export const REPORT_PATH = 'tools/parity/report.md';

/** Spec directories, read through the P2-1 loader so both tools see the same files. */
export { COMPONENTS_DIR, PATTERNS_DIR } from '../spec/config.ts';
