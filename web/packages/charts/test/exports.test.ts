/// <reference types="node" />
/**
 * The package layout of critic C-14's second half (roadmap P3-4): `files` packs the bundle and
 * nothing else.
 *
 * One copy of `spec/` reaches a consumer, and it is `@iiiivaska/prism-react`'s
 * (`web/packages/react/scripts/copy-spec.ts`): an app that installs both packages can then never
 * carry two versions of one contract, and `agent/SKILL.md` names that single path. This package
 * therefore ships no `spec/` and lists none in `files`.
 *
 * The phantom entry that was here needed a test of its own because nothing else catches one:
 * `npm pack` drops a `files` entry whose directory does not exist without a word, so the manifest
 * claimed a directory it never shipped and every gate stayed green.
 *
 * It runs against `dist/`, so `pnpm --filter @iiiivaska/prism-charts build` comes first; CI builds
 * every package before it runs the tests.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface PackageJson {
  readonly exports: Readonly<Record<string, string | Readonly<Record<string, string>>>>;
  readonly files: readonly string[];
}

const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as PackageJson;

describe("the package manifest (critic C-14)", () => {
  it("packs the bundle, and lists nothing the package does not have", () => {
    expect(existsSync(join(packageRoot, "dist")), "build the package first: pnpm --filter @iiiivaska/prism-charts build").toBe(true);
    expect(pkg.files).toEqual(["dist"]);
    for (const entry of pkg.files) {
      expect(existsSync(join(packageRoot, entry)), `files lists ${entry}, which the package does not have`).toBe(true);
    }
  });

  it("ships no spec/ of its own, and names none in files or exports", () => {
    expect(existsSync(join(packageRoot, "spec"))).toBe(false);
    expect(pkg.files).not.toContain("spec");
    expect(Object.keys(pkg.exports).filter((key) => key.startsWith("./spec"))).toEqual([]);
  });

  it("names nothing in the export map that the packed files leave out", () => {
    const roots = pkg.files.map((entry) => `./${entry}/`);
    const targets = Object.values(pkg.exports).flatMap((entry) => (typeof entry === "string" ? [entry] : Object.values(entry)));
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(
        // npm always packs the manifest itself, whatever `files` says.
        target === "./package.json" || roots.some((root) => target.startsWith(root)),
        `exports names ${target}, which files does not pack`,
      ).toBe(true);
    }
  });
});
