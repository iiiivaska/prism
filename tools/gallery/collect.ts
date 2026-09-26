// The pairing: every spec example × scheme × density × variant, with one cell per platform (P3-5).
//
// Nothing here renders or predicts. Each harness's baselines are read as they are, parsed by the one
// name rule, and reconciled against the specs, so the model says exactly three kinds of thing about a
// cell a platform has no image for:
//
//   missing        this platform records this component and this variant, but not this cell — a real gap
//   not-recorded   this platform has no image of this component at all (nobody has implemented or
//                  recorded it there yet; the parity row says which)
//   out-of-matrix  this platform's matrix records no image with this variant anywhere, so there is
//                  nothing to compare — the web matrix has no Increase Contrast or Bold Text axis, and
//                  pretending it did would report two false gaps for every such Apple image
//
// That distinction is the honest half of "missing pairs are called out, not hidden": a gap is named as a
// gap, and a difference between the two matrices is named as that.
import { posix } from 'node:path';
import type { Diagnostic, SourceReader } from '../tokens/api.ts';
import { error } from '../tokens/ir/diagnostics.ts';
import { readSpecs, type SpecRow } from '../parity/specs.ts';
import type { Support } from '../parity/config.ts';
import {
  DENSITIES, GALLERY_DIR, PLATFORM_ORDER, SCHEMES, SOURCES, VARIANTS,
  type Density, type Platform, type Scheme, type Variant,
} from './config.ts';
import type { ImageStore, PixelSize } from './images.ts';
import { cellKey, formatName, isParsed, parseName, type SnapshotName } from './name.ts';

export interface Image extends PixelSize {
  readonly platform: Platform;
  /** Repository-relative path of the image its harness compares against: the canon. */
  readonly source: string;
  /** The collected copy, relative to `gallery/index.html`. */
  readonly href: string;
}

export type CellState =
  | { readonly kind: 'present'; readonly image: Image }
  | { readonly kind: 'missing' }
  | { readonly kind: 'not-recorded' }
  | { readonly kind: 'out-of-matrix' };

export interface Cell {
  readonly scheme: Scheme;
  readonly density: Density;
  readonly variant: Variant | null;
  readonly platforms: ReadonlyMap<Platform, CellState>;
}

export interface Example {
  readonly id: string;
  /** The schemes the example declares; both unless it narrows them. */
  readonly schemes: readonly Scheme[];
  /** `variant: primary, size: md` — what the spec sets, for the page. */
  readonly props: string;
  readonly cells: readonly Cell[];
}

export interface Counts {
  readonly images: number;
  /** Cells where every image the two matrices record is there. */
  readonly paired: number;
  readonly missing: number;
  /** Cells at least one platform is expected to have an image for; the rest are nobody's gap. */
  readonly cells: number;
}

export interface Component {
  readonly name: string;
  /** Repository-relative spec file. */
  readonly file: string;
  readonly layer: string;
  readonly specVersion: number;
  readonly support: ReadonlyMap<Platform, Support>;
  /** Platforms with at least one image of this component. */
  readonly recorded: readonly Platform[];
  readonly examples: readonly Example[];
  readonly counts: Counts;
}

export interface Gallery {
  /** Every component spec, in the parity report's order. */
  readonly components: readonly Component[];
  /** The columns: platforms with at least one image anywhere. */
  readonly platforms: readonly Platform[];
  /** Platform keys no image carries today, so the page says so instead of drawing empty columns. */
  readonly unrecorded: readonly Platform[];
  /** Pattern specs, which have no implementation manifest and no snapshots yet (ADR-0012 rule 3). */
  readonly patterns: readonly string[];
  readonly counts: Counts;
  readonly diagnostics: readonly Diagnostic[];
  /** Every collected image: the copy's path relative to `gallery/` → the repository-relative source. */
  readonly files: ReadonlyMap<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `variant: primary, size: md` from an example's `props`; empty when it sets none. */
function propsText(props: unknown): string {
  if (!isRecord(props)) return '';
  return Object.entries(props)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(', ');
}

interface SpecExample {
  readonly id: string;
  readonly schemes: readonly Scheme[];
  readonly props: string;
}

/** The `examples[]` of a spec, with the schemes each one declares (spec/SCHEMA.md). */
function examplesOf(spec: SpecRow, diagnostics: Diagnostic[]): readonly SpecExample[] {
  const raw = spec.doc.value?.['examples'];
  if (!Array.isArray(raw)) return [];
  const out: SpecExample[] = [];
  for (const [index, entry] of raw.entries()) {
    if (!isRecord(entry) || typeof entry['id'] !== 'string') continue;
    const declared = entry['schemes'];
    let schemes: readonly Scheme[] = SCHEMES;
    if (Array.isArray(declared)) {
      const narrowed = declared.filter((value): value is Scheme => (SCHEMES as readonly string[]).includes(value as string));
      if (narrowed.length === 0) {
        diagnostics.push(error('gallery/schemes', `${spec.name}/${entry['id']} declares \`schemes\` with no scheme the gallery knows`, {
          file: spec.file, line: spec.doc.lineOf(['examples', index, 'schemes']), hint: 'run `pnpm spec:validate`: the schemes are light and dark',
        }));
      } else {
        schemes = SCHEMES.filter((scheme) => narrowed.includes(scheme));
      }
    }
    out.push({ id: entry['id'], schemes, props: propsText(entry['props']) });
  }
  return out;
}

/** One image found under a source root. */
interface Found extends SnapshotName {
  readonly component: string;
  readonly source: string;
  readonly size: PixelSize;
}

function readSources(images: ImageStore, diagnostics: Diagnostic[]): readonly Found[] {
  const found: Found[] = [];
  for (const source of SOURCES) {
    for (const relative of images.list(source.root)) {
      const path = posix.join(source.root, relative);
      const file = posix.basename(relative);
      const hint = `the name rule is <exampleId>.<platform>.<scheme>.<density>[.<variant>].png (spec/SCHEMA.md, "Examples and snapshots"); this set is written by ${source.harness}`;
      const parsed = parseName(file);
      if (!isParsed(parsed)) {
        diagnostics.push(error('gallery/name', `${relative} ${parsed.problem}`, { file: path, hint }));
        continue;
      }
      if (!source.platforms.includes(parsed.platform)) {
        diagnostics.push(error('gallery/platform', `${relative} carries \`${parsed.platform}\`, which is not a platform ${source.root} records`, {
          file: path, hint: `that root holds ${source.platforms.join(', ')}; a render of another platform belongs with the harness that makes it`,
        }));
        continue;
      }
      const size = images.size(path);
      if (size === null) {
        diagnostics.push(error('gallery/unreadable', `${relative} is not a PNG the gallery can measure`, {
          file: path, hint: 'the gallery reads each image’s IHDR, so it can show it at its own size and not a fitted one',
        }));
        continue;
      }
      found.push({ ...parsed, component: posix.dirname(relative), source: path, size });
    }
  }
  return found;
}

export interface CollectOptions {
  readonly reader: SourceReader;
  readonly images: ImageStore;
}

export function collect({ reader, images }: CollectOptions): Gallery {
  const { specs, diagnostics: specDiagnostics } = readSpecs(reader);
  const diagnostics: Diagnostic[] = [...specDiagnostics];
  const found = readSources(images, diagnostics);

  const componentSpecs = specs.filter((spec) => spec.layer !== 'pattern');
  const byName = new Map(componentSpecs.map((spec) => [spec.name, spec]));

  /** `<Component>|<cell key>|<platform>` → the image, and the two coarser facts the states need. */
  const byCell = new Map<string, Found>();
  /** `<Component>|<exampleId>` → every image of that example, for the reconciliation below. */
  const byExample = new Map<string, Found[]>();
  const recordedBy = new Map<string, Set<Platform>>();
  const variantPlatforms = new Map<string, Set<Platform>>();

  for (const image of found) {
    if (!byName.has(image.component)) {
      diagnostics.push(error('gallery/component', `${image.component}/ holds snapshots, but no component spec is named \`${image.component}\``, {
        file: image.source, hint: 'the directory is the spec `name`; rename it, or add spec/components/<Name>.yaml',
      }));
      continue;
    }
    byCell.set(`${image.component}|${cellKey(image)}|${image.platform}`, image);
    const example = `${image.component}|${image.exampleId}`;
    byExample.set(example, [...(byExample.get(example) ?? []), image]);
    recordedBy.set(image.component, (recordedBy.get(image.component) ?? new Set()).add(image.platform));
    const variant = image.variant ?? 'standard';
    variantPlatforms.set(variant, (variantPlatforms.get(variant) ?? new Set()).add(image.platform));
  }

  const columns = PLATFORM_ORDER.filter((platform) => [...recordedBy.values()].some((set) => set.has(platform)));
  const at = (component: string, exampleId: string, scheme: Scheme, density: Density, variant: Variant | null, platform: Platform): Found | undefined =>
    byCell.get(`${component}|${cellKey({ exampleId, scheme, density, variant })}|${platform}`);

  const components: Component[] = [];
  const files = new Map<string, string>();
  let totalImages = 0;
  let totalPaired = 0;
  let totalMissing = 0;
  let totalCells = 0;

  for (const spec of componentSpecs) {
    const recorded = columns.filter((platform) => recordedBy.get(spec.name)?.has(platform) === true);
    const declared = examplesOf(spec, diagnostics);
    const known = new Set(declared.map((example) => example.id));

    // A snapshot of an example the spec does not declare: one diagnostic per example, not per image.
    for (const [key, group] of byExample) {
      const [component, exampleId] = key.split('|') as [string, string];
      if (component !== spec.name || known.has(exampleId)) continue;
      known.add(exampleId);
      diagnostics.push(error('gallery/example', `${spec.name}/${exampleId} is recorded, but ${spec.file} declares no such example`, {
        file: group[0]?.source ?? spec.file, hint: 'add the example to the spec, or delete its snapshots (ADR-0006 rule 3)',
      }));
    }

    const examples: Example[] = [];
    const counts = { images: 0, paired: 0, missing: 0, cells: 0 };

    for (const example of declared) {
      // A scheme the example does not declare is not a cell. An image recorded for one is a
      // disagreement between the spec and a harness, so it is reported rather than shown.
      for (const image of byExample.get(`${spec.name}|${example.id}`) ?? []) {
        if (example.schemes.includes(image.scheme)) continue;
        diagnostics.push(error('gallery/scheme', `${spec.name}/${example.id} is recorded in \`${image.scheme}\`, which ${spec.file} does not declare for it`, {
          file: image.source, hint: `the example declares ${example.schemes.join(', ')}; record what the spec declares, or widen \`schemes\``,
        }));
      }

      // The standard state, plus every variant at least one platform recorded for this example.
      const variants: readonly (Variant | null)[] = [
        null,
        ...VARIANTS.filter((variant) => (byExample.get(`${spec.name}|${example.id}`) ?? []).some((image) => image.variant === variant)),
      ];

      // A component no stack has recorded has no cells: it is a whole row of the contract waiting for a
      // first snapshot, which the page and the parity report say in one line, rather than 20 empty cells.
      const cells: Cell[] = [];
      for (const scheme of recorded.length === 0 ? [] : example.schemes) {
        for (const density of DENSITIES) {
          for (const variant of variants) {
            const platforms = new Map<Platform, CellState>();
            let present = 0;
            let expected = 0;
            for (const platform of columns) {
              const image = at(spec.name, example.id, scheme, density, variant, platform);
              if (image !== undefined) {
                const href = posix.join('snapshots', spec.name, formatName(image));
                files.set(href, image.source);
                platforms.set(platform, {
                  kind: 'present',
                  image: { platform, source: image.source, href, width: image.size.width, height: image.size.height },
                });
                present++;
                expected++;
              } else if (!recorded.includes(platform)) {
                platforms.set(platform, { kind: 'not-recorded' });
              } else if (variant !== null && variantPlatforms.get(variant)?.has(platform) !== true) {
                platforms.set(platform, { kind: 'out-of-matrix' });
              } else {
                platforms.set(platform, { kind: 'missing' });
                expected++;
              }
            }
            cells.push({ scheme, density, variant, platforms });
            counts.images += present;
            counts.missing += expected - present;
            // A cell no platform is expected to have an image for is not counted at all: 53 components
            // have not been recorded anywhere, and counting their cells would drown the real ratio.
            if (expected > 0) {
              counts.cells++;
              if (present === expected) counts.paired++;
            }
          }
        }
      }
      examples.push({ id: example.id, schemes: example.schemes, props: example.props, cells });
    }

    totalImages += counts.images;
    totalPaired += counts.paired;
    totalMissing += counts.missing;
    totalCells += counts.cells;
    components.push({
      name: spec.name,
      file: spec.file,
      layer: spec.layer,
      specVersion: spec.specVersion,
      support: spec.platforms,
      recorded,
      examples,
      counts,
    });
  }

  return {
    components,
    platforms: columns,
    unrecorded: PLATFORM_ORDER.filter((platform) => !columns.includes(platform)),
    patterns: specs.filter((spec) => spec.layer === 'pattern').map((spec) => spec.name),
    counts: { images: totalImages, paired: totalPaired, missing: totalMissing, cells: totalCells },
    diagnostics,
    files,
  };
}

/** Copy every collected image into `gallery/snapshots/`; returns how many were written. */
export function copyImages(gallery: Gallery, images: ImageStore): number {
  for (const [href, source] of gallery.files) images.copy(source, posix.join(GALLERY_DIR, href));
  return gallery.files.size;
}
