// `manifest.json` (ARCHITECTURE §9.6; ADR-0019 §3, ADR-0024 §13.3): the brand-invariant name map for
// agents, `tools/spec`, `tools/parity` and `docs.test.ts`. No values and no tool versions. It is built
// once: `dependsOn` is the union over every brand and platform (ADR-0020 §6). `ref.font.apple.*` is
// listed without a CSS, Tailwind or TypeScript name (ADR-0020 §5). `cssVars` lists exactly the custom
// properties a token declares; `css` is its base property, or null when it declares only derived ones
// (typography, a dashed stroke style), so no manifest name points at a property that does not exist.
import { COLOR_SCHEME_MODIFIER, PLATFORM_DEFAULTS, RUNTIME_AXES, TAILWIND_VARIANTS, WEB_OUTPUT_ROOT, WEB_RUNTIME } from '../config.ts';
import { unionShapes } from '../ir/analyze.ts';
import { error, type Diagnostic } from '../ir/diagnostics.ts';
import { assetName, cssName, swiftName, swiftNameOf, tailwindThemeNames, tailwindUtilities } from '../ir/naming.ts';
import type { IRBundle } from '../ir/types.ts';
import { cssParts } from '../transforms/index.ts';
import { defaultBrand, isWebToken, tokenAt, webScope } from './css/web.ts';
import { jsonMarker } from './header.ts';
import type { FormatInput, FormatOutput } from './index.ts';

export const MANIFEST_PATH = `${WEB_OUTPUT_ROOT}/manifest.json`;

export interface ManifestToken {
  readonly path: string;
  readonly id: string;
  readonly tier: string;
  readonly type: string;
  readonly dependsOn: readonly string[];
  /** The base custom property, or null when the token declares none (typography, a dashed stroke style, an Apple face). */
  readonly css: string | null;
  /** Every custom property the token declares in `tokens.css` or `motion.css`: the base first, then the derived ones (§8, §12). */
  readonly cssVars: readonly string[];
  readonly tailwind: readonly string[];
  readonly tailwindTheme: readonly string[];
  readonly ts: string | null;
  readonly swift: string | null;
  readonly asset: string | null;
  readonly description: string | null;
  readonly deprecated: string | true | null;
}

export interface ManifestRuntimeValue {
  readonly context?: string;
  readonly variant?: string | null;
  readonly swift: string;
}

export interface Manifest {
  readonly $generated: string;
  readonly modifiers: readonly { readonly name: string; readonly contexts: readonly string[]; readonly default: string }[];
  readonly runtime: Readonly<Record<string, {
    readonly attribute: string;
    readonly nestable: boolean;
    readonly values: Readonly<Record<string, ManifestRuntimeValue>>;
    readonly media: { readonly value: string; readonly query: string };
  }>>;
  readonly platformDefaults: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly tailwindVariants: readonly string[];
  readonly tokens: readonly ManifestToken[];
}

function runtimeSection(): Manifest['runtime'] {
  const out: Record<string, Manifest['runtime'][string]> = {};
  for (const [axis, r] of Object.entries(WEB_RUNTIME)) {
    const values: Record<string, ManifestRuntimeValue> = {};
    for (const v of r.values) {
      const swift = `${r.swiftType}.${r.swiftCases[v] ?? v}`;
      if ('modifier' in r.resolver) values[v] = { context: r.resolver.contexts[v] ?? v, swift };
      else values[v] = { variant: v === r.resolver.value ? r.resolver.suffix.replace(/^-/, '') : null, swift };
    }
    out[axis] = { attribute: r.attribute, nestable: r.nestable, values, media: { value: r.media.value, query: r.media.query } };
  }
  return out;
}

function platformDefaultsSection(): Manifest['platformDefaults'] {
  const out: Record<string, Record<string, string>> = {};
  for (const [platform, d] of Object.entries(PLATFORM_DEFAULTS)) {
    const fields: Record<string, string> = {};
    for (const axis of Object.keys(WEB_RUNTIME)) {
      const v = (d as unknown as Record<string, string | undefined>)[axis];
      if (v !== undefined) fields[axis] = v;
    }
    out[platform] = fields;
  }
  return out;
}

export function buildManifest(bundle: IRBundle, resolver: string): Manifest {
  const scope = webScope(bundle, defaultBrand(bundle));
  const perm = scope.perms[scope.defaultIndex];
  const shapes = unionShapes(bundle.analysis);
  const tokens: ManifestToken[] = [];
  for (const id of scope.ids) {
    if (perm === undefined) break;
    const t = tokenAt(perm, id);
    const deps = shapes.get(id);
    const axes = new Set<string>(deps?.axes ?? []);
    if ((deps?.increasedContrast.length ?? 0) > 0 || (deps?.reducedTransparency.length ?? 0) > 0) axes.add(COLOR_SCHEME_MODIFIER);
    const web = isWebToken(id);
    // A token renders the same declarations in every context and brand (css/part-mismatch, ADR-0020 rule 9).
    const cssVars = web ? cssParts(t.value).map((p) => `${cssName(id)}${p.suffix}`) : [];
    tokens.push({
      path: t.path,
      id,
      tier: t.tier,
      type: t.type,
      dependsOn: RUNTIME_AXES.filter((a) => axes.has(a)),
      css: cssVars.includes(cssName(id)) ? cssName(id) : null,
      cssVars,
      tailwind: web ? tailwindUtilities(id, t.type) : [],
      tailwindTheme: web ? tailwindThemeNames(id, t.type).map((n) => n.variable) : [],
      ts: web && t.tier !== 'ref' ? t.path : null,
      swift: swiftName(id),
      asset: assetName(id, t.type),
      description: t.description,
      deprecated: t.deprecated,
    });
  }
  return {
    $generated: jsonMarker(resolver),
    modifiers: bundle.model.modifiers.map((m) => ({ name: m.name, contexts: m.contexts, default: m.default })),
    runtime: runtimeSection(),
    platformDefaults: platformDefaultsSection(),
    tailwindVariants: TAILWIND_VARIANTS.map((v) => v.name),
    tokens,
  };
}

/** An unknown `sys` category has no Swift home (ARCHITECTURE §8): a build error. */
export function swiftCategoryDiagnostics(manifest: Manifest): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const t of manifest.tokens) {
    const s = swiftNameOf(t.id);
    if (s.kind === 'unknown') out.push(error('naming/swift-category', `${t.id}: the sys category "${s.category}" has no Swift member struct`, { tokenId: t.id, hint: 'add the category to config.SWIFT_CATEGORIES (ARCHITECTURE §8)' }));
  }
  return out;
}

export function renderManifest(input: FormatInput): FormatOutput {
  const manifest = buildManifest(input.bundle, input.model.resolverFile);
  return { files: [{ path: MANIFEST_PATH, contents: `${JSON.stringify(manifest, null, 2)}\n` }], diagnostics: swiftCategoryDiagnostics(manifest) };
}
