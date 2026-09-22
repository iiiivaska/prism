// The version ledger (roadmap P3-6, critic C-15; ADR-0006 rule 1, ADR-0014, ADR-0024 §14).
//
// One number describes the whole system, and it is written down in more than one file because npm,
// SwiftPM and the generated code each need it in their own syntax. C-15 asked which of those copies
// is the authority. The answer this file encodes:
//
//   the changesets are the input   .changeset/*.md name the packages and the bump
//   Changesets computes the number `changeset version` writes the three published manifests
//   VERSION records it             `stamp.ts` derives it from the fixed group and writes it
//   every other copy is derived    `stamp.ts` writes it from VERSION
//   the tag names it               `v<VERSION>`, the SPM tag and the release tag
//
// So: no file here is edited by hand, and `stamp.ts --check` is what keeps that true.
//
// `SOURCES` are the manifests Changesets owns: this tool only reads them, and fails when they
// disagree, because a fixed group that has stopped moving them together is exactly the drift C-15
// warns about. `DERIVED` are the copies this tool writes. `NOT_THE_SYSTEM_VERSION` is the other half
// of the answer — the `version` fields in this repository that are *not* the system version, listed
// so the question is not re-opened by the next reader who greps for `0.1.0`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { matchesPackage, readChangesetConfig } from '../tokens/diff/changesets.ts';

export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** The release-tag grammar of `tools/tokens/diff/git.ts`, without the optional `v`. */
export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/** The tag one version is released under: the SPM tag and the GitHub release tag are the same tag. */
export function tagFor(version: string): string {
  return `v${version}`;
}

/** The version a release tag names, or null when the tag is not a release tag. */
export function versionOfTag(tag: string): string | null {
  const m = /^v?(\d+\.\d+\.\d+)$/.exec(tag);
  return m === null ? null : (m[1] ?? null);
}

/** A file that carries the system version, and the one place inside it that does. */
export interface VersionCarrier {
  /** Repository-relative, with forward slashes. */
  readonly path: string;
  /** One line: what in this file carries the version. */
  readonly what: string;
  /** The version the file carries, or null when the file does not carry one where it should. */
  readonly read: (text: string) => string | null;
  /** The same text with the version replaced. Throws when the place to write it is not there. */
  readonly write: (text: string, version: string) => string;
}

class StampError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StampError';
  }
}

/**
 * A carrier driven by one regular expression with the version in group 2.
 *
 * The expression is built global, and both halves count their matches. A carrier holds the version
 * in exactly one place, and only a walk over *every* match can tell that it still does: without `g`,
 * `replace` rewrites the first match and `exec` reads the first match, so a file that grew a second
 * copy would be stamped half-way and then read back as agreeing — drift the ledger exists to catch,
 * arriving silently. Counting makes the disagreement an error in both directions.
 */
function pattern(path: string, what: string, source: RegExp): VersionCarrier {
  const re = new RegExp(source.source, source.flags.includes('g') ? source.flags : `${source.flags}g`);
  const tooMany = (hits: number): StampError =>
    new StampError(`${path}: ${what} matched ${String(hits)} times; the ledger expects exactly one`);
  return {
    path,
    what,
    read: (text) => {
      // `matchAll` walks a copy of the expression, so no `lastIndex` survives into the next reader.
      const matches = [...text.matchAll(re)];
      if (matches.length > 1) throw tooMany(matches.length);
      const m = matches[0];
      return m === undefined ? null : (m[2] ?? null);
    },
    write: (text, version) => {
      let hits = 0;
      const out = text.replace(re, (_whole, before: string, _old: string, after: string) => {
        hits++;
        return `${before}${version}${after}`;
      });
      if (hits === 0) throw new StampError(`${path}: ${what} is not there to stamp; re-read tools/release/README.md`);
      if (hits > 1) throw tooMany(hits);
      return out;
    },
  };
}

/**
 * The top-level `"version"` of a JSON manifest, at exactly two spaces of indent. The indent is what
 * keeps this off a nested version — `sources.phosphor.version` and every icon's `since` in
 * spec/icons/registry.json sit deeper — and `tokens:normalize` and Prettier both write the manifests
 * at two spaces, so the anchor holds.
 */
export function jsonManifest(path: string, what: string): VersionCarrier {
  return pattern(path, what, /^( {2}"version": ")(\d+\.\d+\.\d+)(")/mu);
}

/** `VERSION` itself: the whole file is the number, with a trailing newline. */
export const VERSION_FILE: VersionCarrier = {
  path: 'VERSION',
  what: 'the file body',
  read: (text) => {
    const v = text.trim();
    return VERSION_PATTERN.test(v) ? v : null;
  },
  write: (_text, version) => `${version}\n`,
};

/**
 * The manifests Changesets owns (`.changeset/config.json` `fixed`), discovered rather than listed, so
 * a package added to `web/packages/` shows up here without an edit. Only this tool's own copies are
 * listed by hand.
 */
export interface PublishedPackage {
  readonly name: string;
  /** Repository-relative directory. */
  readonly dir: string;
  readonly manifest: VersionCarrier;
  readonly version: string | null;
}

interface PackageManifest {
  readonly name?: unknown;
  readonly version?: unknown;
  readonly private?: unknown;
}

/** The pnpm workspace's package globs (`pnpm-workspace.yaml`), which are one segment deep each. */
export function workspaceGlobs(root: string = REPO_ROOT): readonly string[] {
  const text = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const parsed = parse(text) as { packages?: unknown } | null;
  const packages = parsed?.packages;
  if (!Array.isArray(packages) || !packages.every((p) => typeof p === 'string')) {
    throw new StampError('pnpm-workspace.yaml: "packages" must be a list of globs');
  }
  return packages;
}

/** Every workspace package directory, repository-relative, sorted. */
export function workspaceDirs(root: string = REPO_ROOT, globs: readonly string[] = workspaceGlobs(root)): string[] {
  const dirs: string[] = [];
  for (const glob of globs) {
    const star = glob.indexOf('*');
    if (star === -1) {
      dirs.push(glob);
      continue;
    }
    const parent = glob.slice(0, star).replace(/\/$/, '');
    let entries: string[];
    try {
      entries = readdirSync(join(root, parent), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } catch {
      continue;
    }
    for (const entry of entries) dirs.push(`${parent}/${entry}`);
  }
  return dirs.filter((dir) => existsSync(join(root, dir, 'package.json'))).sort();
}

/** The workspace packages that npm publishes: not `private`, and not ignored by Changesets. */
export function publishedPackages(root: string = REPO_ROOT): PublishedPackage[] {
  const config = readChangesetConfig(join(root, '.changeset'));
  const out: PublishedPackage[] = [];
  for (const dir of workspaceDirs(root)) {
    const path = `${dir}/package.json`;
    const text = readFileSync(join(root, path), 'utf8');
    const manifest = JSON.parse(text) as PackageManifest;
    const name = typeof manifest.name === 'string' ? manifest.name : null;
    if (name === null) throw new StampError(`${path}: no "name"`);
    if (manifest.private === true) continue;
    if (config.ignore.some((p) => matchesPackage(p, name))) continue;
    const carrier = jsonManifest(path, 'the published manifest version (written by `changeset version`)');
    out.push({ name, dir, manifest: carrier, version: carrier.read(text) });
  }
  return out;
}

/**
 * ADR-0014's "one tag = one version": every published package must be in one fixed group together, or
 * `changeset version` will hand two of them different numbers and nothing downstream can be right.
 */
export function fixedGroupIssues(root: string = REPO_ROOT, names: readonly string[]): string[] {
  const config = readChangesetConfig(join(root, '.changeset'));
  const groups = config.fixed.map((g) => names.filter((name) => g.some((p) => matchesPackage(p, name))));
  const issues: string[] = [];
  for (const name of names) {
    const covering = groups.filter((g) => g.includes(name));
    if (covering.length === 0) issues.push(`${name} is published but is in no fixed group of .changeset/config.json`);
    else if (covering.length > 1) issues.push(`${name} is in ${String(covering.length)} fixed groups; it must be in one`);
  }
  const whole = groups.find((g) => g.length === names.length);
  if (whole === undefined && names.length > 1 && issues.length === 0) {
    issues.push(`no fixed group holds all of ${names.join(', ')}: they would not share a version`);
  }
  return issues;
}

/**
 * The copies `stamp.ts` writes from `VERSION`. Every one of them is a place a reader or a consumer
 * meets the number: the private manifests keep `pnpm` honest, `DSTokensInfo.version` is what a Swift
 * consumer reads, the tokens package exports the same number to JavaScript, and the icon registry's
 * `version` is documented as the system version in `spec/icons/registry.schema.json`. The licence
 * inventory's own `prism` item is the system too: it records which Prism the third-party list belongs
 * to (ADR-0028 §4), so it is stamped rather than left to drift.
 *
 * Stamping the registry changes generated code (`DSIconName.registryVersion`,
 * `iconRegistryVersion`), so the release runs `pnpm icons:build` after the stamp; CI's own
 * stale-output gate then proves the regeneration happened.
 */
export const DERIVED: readonly VersionCarrier[] = [
  VERSION_FILE,
  jsonManifest('package.json', 'the private workspace root manifest'),
  jsonManifest('tools/package.json', 'the private tools package'),
  jsonManifest('web/apps/gallery/package.json', 'the private gallery app'),
  jsonManifest('web/apps/vrt/package.json', 'the private visual-regression app'),
  pattern(
    'swift/Sources/DSTokens/DSTokens.swift',
    'DSTokensInfo.version, what a SwiftPM consumer reads',
    /^(\s*public static let version = ")(\d+\.\d+\.\d+)(")/mu,
  ),
  pattern(
    'web/packages/tokens/src/index.ts',
    'the `version` the tokens package exports',
    /^(export const version = ")(\d+\.\d+\.\d+)(")/mu,
  ),
  jsonManifest('spec/icons/registry.json', 'the icon registry version, documented as the system version'),
  pattern(
    'licenses/inventory.json',
    "the `prism` item's version: the system this inventory ships with (ADR-0028 §4)",
    /^(\s*\{ "id": "prism",.*?"version": ")(\d+\.\d+\.\d+)(")/mu,
  ),
];

/**
 * Every other `version` in this tree, and why it is not this number. Printed by `stamp.ts --ledger`
 * and repeated in README.md, because "which 0.1.0 is the system version" is the question C-15 was
 * filed about.
 */
export const NOT_THE_SYSTEM_VERSION: readonly { readonly path: string; readonly what: string }[] = [
  { path: 'brands/*/brand.json', what: "the brand's own version: a brand iterates on its own (ADR-0020)" },
  { path: 'brands/*/brand.json', what: 'fonts[].version: the font file\'s name ID 5, checked by `fonts:check`' },
  { path: 'spec/icons/registry.json', what: 'sources.phosphor.version: the installed @phosphor-icons/core' },
  { path: 'spec/icons/registry.json', what: 'icons[].since: the system version an icon first shipped in; never restamped' },
  { path: 'spec/components/*.yaml', what: 'specVersion: the contract version of one component (ADR-0006 rule 2)' },
  { path: 'spec/components/*.yaml', what: 'since: the system version a component first shipped in; never restamped' },
  { path: 'spec/haptics.yaml', what: 'version: the haptics registry version' },
  { path: 'web/packages/*/src/manifest.ts', what: '`implemented`: the spec version each stack implements (ADR-0006 rule 2)' },
  { path: 'pnpm-workspace.yaml', what: 'catalog: third-party dependency ranges' },
];

export { StampError };
