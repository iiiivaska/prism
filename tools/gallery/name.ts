// The snapshot name, parsed and formatted in one place (spec/SCHEMA.md, "Examples and snapshots").
//
//     <exampleId>.<platform>.<scheme>.<density>[.<variant>].png
//
// Both harnesses build this name themselves — the Apple one in `DSSnapshotVariant.fileName`, the web one
// from the Playwright project name — because each writes its images long before the gallery reads them.
// This module is the reader, and the only enforcement: a file under a baseline root that does not parse
// here is a `gallery/name` diagnostic, so a harness that drifts from the rule fails the build instead of
// quietly dropping out of the pairs.
import { isDensity, isPlatform, isScheme, isVariant, type Density, type Platform, type Scheme, type Variant } from './config.ts';

export interface SnapshotName {
  readonly exampleId: string;
  readonly platform: Platform;
  readonly scheme: Scheme;
  readonly density: Density;
  /** The forced accessibility state, or null in the standard state. */
  readonly variant: Variant | null;
}

/** The cell a name belongs to: everything but the platform, which is the axis being compared. */
export type CellKey = string;

export function cellKey(name: Pick<SnapshotName, 'exampleId' | 'scheme' | 'density' | 'variant'>): CellKey {
  return [name.exampleId, name.scheme, name.density, name.variant ?? 'standard'].join('|');
}

export function formatName(name: SnapshotName): string {
  return [name.exampleId, name.platform, name.scheme, name.density, ...(name.variant === null ? [] : [name.variant]), 'png'].join('.');
}

/**
 * A file name, or the reason it is not one. The example id is the first segment and may not contain a
 * dot (spec ids are kebab-case, and `spec:validate` holds them to it), so the segments are positional.
 */
export function parseName(file: string): SnapshotName | { readonly problem: string } {
  const parts = file.split('.');
  if (parts.pop() !== 'png') return { problem: 'is not a .png' };
  if (parts.length < 4 || parts.length > 5) {
    return { problem: `has ${parts.length} segment(s) before \`.png\`; the name is <exampleId>.<platform>.<scheme>.<density>[.<variant>]` };
  }
  const [exampleId, platform, scheme, density, variant] = parts as [string, string, string, string, string | undefined];
  if (exampleId === '') return { problem: 'has an empty example id' };
  if (!isPlatform(platform)) return { problem: `has \`${platform}\` where a platform key belongs` };
  if (!isScheme(scheme)) return { problem: `has \`${scheme}\` where \`light\` or \`dark\` belongs` };
  if (!isDensity(density)) return { problem: `has \`${density}\` where \`regular\` or \`compact\` belongs` };
  if (variant !== undefined && !isVariant(variant)) return { problem: `has \`${variant}\` where a forced accessibility state belongs` };
  return { exampleId, platform, scheme, density, variant: variant ?? null };
}

export function isParsed(value: SnapshotName | { readonly problem: string }): value is SnapshotName {
  return !('problem' in value);
}
