// licenses:check end to end (roadmap P2-4, critic G-26): the repository passes every check; the
// packaged-not-permitted fixture exits 1 naming the item (the ticket's acceptance); and each half of
// the packaged-versus-shipped comparison fails on a tree held in memory — a shipped file no item
// claims, an item that claims files the repository does not ship, a font without its license text,
// license copies that drifted apart, an ADR-0031 license copy that differs from the root one, a
// manifest that still claims MIT, and a dependency a published package declares without a ledger entry.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CheckName, CheckRow } from "./check.ts";
import { formatFailures, formatTable, runLicensesCheck } from "./check.ts";
import { PERMITTED_USE, toolSchemaPath } from "./inventory.ts";
import type { DirEntry, RepoReader } from "./tree.ts";
import { fsRepoReader, globToRegExp } from "./tree.ts";

const repo = join(import.meta.dirname, "..", "..");
const cli = join(import.meta.dirname, "check.ts");
const schema = JSON.parse(readFileSync(toolSchemaPath(), "utf8")) as object;
// An empty GITHUB_STEP_SUMMARY keeps the fixture tables out of a CI job's real step summary.
const runCli = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: "" } });

// The license a tree under test carries: proprietary, like Prism's own since ADR-0031.
const LICENSE_TEXT = "Demo — proprietary license\n\nCopyright (c) 2026 Demo. All rights reserved.\n";
// npm's form for a license that ships with the package, which ADR-0031 rule 2 requires; spelled out
// here rather than imported from check.ts, so the test states the rule instead of echoing the code.
const MANIFEST_LICENSE = "SEE LICENSE IN LICENSE";
const OFL_TEXT = "Copyright 2026 The Synth Project Authors\n\nSIL Open Font License, Version 1.1\n";

/** An in-memory repository: repository-relative path → contents. */
function memoryReader(files: Readonly<Record<string, string | Uint8Array>>): RepoReader {
  const paths = Object.keys(files);
  return {
    readFile(path) {
      const value = files[path];
      if (value === undefined) return null;
      return typeof value === "string" ? new TextEncoder().encode(value) : value;
    },
    entries(dir) {
      const prefix = dir === "" ? "" : `${dir}/`;
      const found = new Map<string, boolean>();
      for (const path of paths) {
        if (!path.startsWith(prefix)) continue;
        const rest = path.slice(prefix.length);
        const slash = rest.indexOf("/");
        if (rest === "") continue;
        if (slash === -1) found.set(rest, found.get(rest) ?? false);
        else found.set(rest.slice(0, slash), true);
      }
      const entries: DirEntry[] = [...found].map(([name, directory]) => ({ name, directory }));
      return entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    },
  };
}

const OWN_ITEM = {
  id: "demo",
  kind: "code",
  name: "Demo",
  spdx: "LicenseRef-Demo-Proprietary",
  source: "https://example.invalid/demo",
  license_url: "https://example.invalid/demo/LICENSE",
  attribution: "Copyright (c) 2026 Demo. All rights reserved.",
  permitted_use: "own",
  packaged: true,
  packaged_as: ["LICENSE", "web/packages/*/LICENSE"],
};

const FONT_ITEM = {
  id: "synth",
  kind: "font",
  name: "Synth",
  spdx: "OFL-1.1",
  source: "https://example.invalid/synth",
  license_url: "https://example.invalid/synth/OFL.txt",
  attribution: "Copyright 2026 The Synth Project Authors",
  permitted_use: "adapt-with-attribution",
  packaged: true,
  packaged_as: ["brands/*/fonts/synth/**", "web/packages/tokens/src/generated/*/fonts/synth/**"],
};

function inventoryJson(items: readonly Record<string, unknown>[], document: Record<string, unknown> = {}): string {
  return JSON.stringify({ updated: "2026-09-16", permitted_use_values: [...PERMITTED_USE], items, ...document });
}

/** A minimal tree that passes every check, with `files` replaced and `items` as the ledger. */
function tree(files: Readonly<Record<string, string>> = {}, items: readonly Record<string, unknown>[] = [OWN_ITEM, FONT_ITEM]): RepoReader {
  return memoryReader({
    LICENSE: LICENSE_TEXT,
    "licenses/inventory.json": inventoryJson(items),
    "brands/acme/fonts/synth/Synth.ttf": "font bytes",
    "brands/acme/fonts/synth/OFL.txt": OFL_TEXT,
    "web/packages/tokens/package.json": JSON.stringify({ name: "@demo/tokens", private: false, license: MANIFEST_LICENSE }),
    "web/packages/tokens/LICENSE": LICENSE_TEXT,
    ...files,
  });
}

const rowsOf = (reader: RepoReader): readonly CheckRow[] => runLicensesCheck(reader, schema).rows;
const failures = (reader: RepoReader): string[] => formatFailures(rowsOf(reader));
const failedChecks = (reader: RepoReader): CheckName[] => [...new Set(rowsOf(reader).filter((row) => row.status === "fail").map((row) => row.check))];

describe("the repository (acceptance: the committed ledger matches what Prism ships)", () => {
  const result = runLicensesCheck(fsRepoReader(repo), schema);

  it("passes every check", () => {
    expect(formatFailures(result.rows)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("carries the proprietary license of ADR-0031: all rights reserved at the root, repeated in every published package, and no manifest left on MIT", () => {
    const root = readFileSync(join(repo, "LICENSE"), "utf8");
    expect(root).toContain("Copyright (c) 2026 iiiivaska. All rights reserved.");
    expect(root).not.toContain("Permission is hereby granted, free of charge");
    for (const name of ["tokens", "react", "charts"]) {
      expect(readFileSync(join(repo, "web", "packages", name, "LICENSE"), "utf8")).toBe(root);
      const manifest = JSON.parse(readFileSync(join(repo, "web", "packages", name, "package.json"), "utf8")) as { license?: string };
      expect(manifest.license).toBe("SEE LICENSE IN LICENSE");
    }
  });

  it("claims every packaged file: the bundled fonts, the generated icon assets, their license text and the ADR-0031 license copies", () => {
    const claimed = result.rows.filter((row) => row.check === "packaged-files").map((row) => row.subject);
    expect(claimed).toContain("brands/prism/fonts/onest/Onest[wght].ttf");
    expect(claimed).toContain("swift/Sources/DSTokens/Resources/Fonts/jetbrains-mono/OFL.txt");
    expect(claimed).toContain("web/packages/tokens/src/generated/prism-native/fonts/inter/inter-wght.woff2");
    expect(claimed).toContain("swift/Sources/DSIcons/Resources/Phosphor-LICENSE.txt");
    expect(claimed).toContain("LICENSE");
    expect(claimed).toContain("web/packages/charts/LICENSE");
  });

  it("checks the declared dependencies of every published package and of Package.swift", () => {
    const dependencies = result.rows.filter((row) => row.check === "dependencies").map((row) => row.subject);
    expect(dependencies).toContain("@iiiivaska/prism-tokens → react");
    expect(dependencies).toContain("Package.swift → https://github.com/pointfreeco/swift-snapshot-testing");
  });

  it("exits 0 from the CLI and prints one table row per check", () => {
    const run = runCli();
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("| Subject | Check | Result | Detail |");
    expect(run.stdout).toContain("licenses:check:");
  });
});

describe("fixtures (acceptance: a packaged item whose license does not permit it fails)", () => {
  const fixture = join(import.meta.dirname, "fixtures", "packaged-not-permitted");

  it("exits 1 and names the item, the rule and the ADR", () => {
    const run = runCli("--root", fixture);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("acme-sans: permitted-use: packaged, but permitted_use is \"inventory-only\"");
    expect(run.stderr).toContain("ADR-0015 rule 5");
  });

  it("fails the schema too, because the schema carries the same rule", () => {
    const run = runCli("--root", fixture, "--json");
    const rows = JSON.parse(run.stdout) as CheckRow[];
    const failed = rows.filter((row) => row.status === "fail").map((row) => row.check);
    expect(failed).toContain("schema");
    expect(failed).toContain("permitted-use");
    // Nothing else about the fixture is wrong: it ships its font with a license beside it.
    expect(new Set(failed)).toEqual(new Set(["schema", "permitted-use"]));
  });
});

describe("a well-formed tree", () => {
  it("passes every check", () => {
    expect(failures(tree())).toEqual([]);
  });

  it("prints a Markdown table with one row per subject and check", () => {
    const table = formatTable(rowsOf(tree()));
    expect(table.split("\n")[0]).toBe("| Subject | Check | Result | Detail |");
    expect(table).toContain("| `synth` | packaged-claims | pass |");
  });
});

describe("packaged but not in the inventory", () => {
  it("fails on a shipped file no item claims", () => {
    const reader = tree({ "brands/acme/fonts/mystery/Mystery.ttf": "font bytes", "brands/acme/fonts/mystery/OFL.txt": OFL_TEXT });
    expect(failedChecks(reader)).toEqual(["packaged-files"]);
    expect(failures(reader)[0]).toContain("brands/acme/fonts/mystery/Mystery.ttf");
    expect(failures(reader)[0]).toContain("no inventory item claims it in packaged_as");
  });

  it("fails when the item that claims a shipped file is marked packaged: false", () => {
    const reader = tree({}, [OWN_ITEM, { ...FONT_ITEM, packaged: false }]);
    expect(failedChecks(reader)).toEqual(["packaged-files"]);
    expect(failures(reader).join("\n")).toContain('claimed by "synth", which is marked packaged: false');
  });

  it("fails when two items claim the same file", () => {
    const reader = tree({}, [OWN_ITEM, FONT_ITEM, { ...FONT_ITEM, id: "synth-copy" }]);
    expect(failures(reader).join("\n")).toContain("claimed by synth, synth-copy");
  });
});

describe("marked packaged but not shipped", () => {
  it("fails when nothing under the scanned roots matches the item's globs", () => {
    const reader = tree({}, [OWN_ITEM, { ...FONT_ITEM, packaged_as: ["brands/*/fonts/ghost/**"] }]);
    expect(failedChecks(reader)).toEqual(["packaged-files", "packaged-claims"]);
    expect(failures(reader).join("\n")).toContain("marked packaged, but no file under");
  });

  it("fails when a packaged item names no file at all", () => {
    const item = { ...FONT_ITEM };
    delete (item as Record<string, unknown>)["packaged_as"];
    const reader = tree({}, [OWN_ITEM, item]);
    expect(failedChecks(reader)).toContain("packaged-claims");
    expect(failures(reader).join("\n")).toContain("marked packaged with no packaged_as");
  });
});

describe("license text with the bytes", () => {
  it("fails when a bundled font has no license file in its folder", () => {
    const reader = memoryReader({
      LICENSE: LICENSE_TEXT,
      "licenses/inventory.json": inventoryJson([OWN_ITEM, FONT_ITEM]),
      "brands/acme/fonts/synth/Synth.ttf": "font bytes",
      "web/packages/tokens/package.json": JSON.stringify({ name: "@demo/tokens", private: false, license: MANIFEST_LICENSE }),
      "web/packages/tokens/LICENSE": LICENSE_TEXT,
    });
    expect(failedChecks(reader)).toEqual(["license-text"]);
    expect(failures(reader)[0]).toContain("no license text beside the font");
  });

  it("fails when an item's license copies drift apart", () => {
    const reader = tree({
      "web/packages/tokens/src/generated/prism/fonts/synth/synth.woff2": "web font bytes",
      "web/packages/tokens/src/generated/prism/fonts/synth/OFL.txt": `${OFL_TEXT}edited by hand\n`,
    });
    expect(failedChecks(reader)).toEqual(["license-text"]);
    expect(failures(reader)[0]).toContain("its license copies differ");
  });

  it("passes when the copies are byte-identical", () => {
    const reader = tree({
      "web/packages/tokens/src/generated/prism/fonts/synth/synth.woff2": "web font bytes",
      "web/packages/tokens/src/generated/prism/fonts/synth/OFL.txt": OFL_TEXT,
    });
    expect(failures(reader)).toEqual([]);
  });

  it("fails when a packaged item ships bytes but none of them is its license text", () => {
    const glyphs = { ...FONT_ITEM, id: "glyphs", kind: "icons", spdx: "MIT", packaged_as: ["swift/Sources/DSIcons/Resources/**"] };
    const reader = tree({ "swift/Sources/DSIcons/Resources/Icons.xcassets/ds.add.imageset/plus.svg": "<svg/>" }, [OWN_ITEM, FONT_ITEM, glyphs]);
    expect(failedChecks(reader)).toEqual(["license-text"]);
    expect(failures(reader)[0]).toContain("ships 1 files, none of them its license text (MIT, ADR-0015 rule 2)");
  });

  it("fails when a font copy outside the packaged roots has lost its notice (F-3)", () => {
    // docs/ ships in no package, but a copy is still a copy: OFL condition 2 asks every one of them to
    // carry the notice. The packaged roots are a maintained list, so this sweep does not consult it.
    const reader = tree({
      "web/packages/tokens/src/generated/prism/fonts/synth/synth.woff2": "web font bytes",
      "web/packages/tokens/src/generated/prism/fonts/synth/OFL.txt": OFL_TEXT,
      "docs/direction-board/assets/fonts/synth/synth.woff2": "web font bytes",
    });
    expect(failedChecks(reader)).toEqual(["license-text"]);
    expect(failures(reader)[0]).toContain("no license text beside this unpackaged font copy");
  });

  it("passes when that copy keeps its notice", () => {
    const reader = tree({
      "web/packages/tokens/src/generated/prism/fonts/synth/synth.woff2": "web font bytes",
      "web/packages/tokens/src/generated/prism/fonts/synth/OFL.txt": OFL_TEXT,
      "docs/direction-board/assets/fonts/synth/synth.woff2": "web font bytes",
      "docs/direction-board/assets/fonts/synth/OFL.txt": OFL_TEXT,
    });
    expect(failures(reader)).toEqual([]);
  });

  it("accepts a vendor-prefixed license name beside icon assets", () => {
    const glyphs = { ...FONT_ITEM, id: "glyphs", kind: "icons", spdx: "MIT", packaged_as: ["swift/Sources/DSIcons/Resources/**"] };
    const reader = tree(
      {
        "swift/Sources/DSIcons/Resources/Icons.xcassets/ds.add.imageset/plus.svg": "<svg/>",
        "swift/Sources/DSIcons/Resources/Glyphs-LICENSE.txt": "MIT License\n\nCopyright (c) 2026 Glyphs\n",
      },
      [OWN_ITEM, FONT_ITEM, glyphs],
    );
    expect(failures(reader)).toEqual([]);
  });
});

describe("the ADR-0031 license copies", () => {
  it("fails when a published package's LICENSE is not byte-identical to the root one", () => {
    const reader = tree({ "web/packages/tokens/LICENSE": `${LICENSE_TEXT}\nand one more clause\n` });
    expect(failedChecks(reader)).toEqual(["license-copies"]);
    expect(failures(reader)[0]).toContain("is not byte-identical to LICENSE");
  });

  it("fails when a published package has no LICENSE, or declares a license that is not the one ADR-0031 rule 2 names", () => {
    const reader = memoryReader({
      LICENSE: LICENSE_TEXT,
      "licenses/inventory.json": inventoryJson([OWN_ITEM, FONT_ITEM]),
      "brands/acme/fonts/synth/Synth.ttf": "font bytes",
      "brands/acme/fonts/synth/OFL.txt": OFL_TEXT,
      "web/packages/tokens/package.json": JSON.stringify({ name: "@demo/tokens", private: false, license: "Apache-2.0" }),
    });
    const detail = failures(reader).join("\n");
    expect(detail).toContain("no web/packages/tokens/LICENSE");
    expect(detail).toContain('its manifest declares license "Apache-2.0", not "SEE LICENSE IN LICENSE"');
  });

  it("fails on the license Prism used to publish: MIT is no longer what a manifest may declare", () => {
    const reader = tree({ "web/packages/tokens/package.json": JSON.stringify({ name: "@demo/tokens", private: false, license: "MIT" }) });
    expect(failedChecks(reader)).toEqual(["license-copies"]);
    expect(failures(reader)[0]).toContain('its manifest declares license "MIT", not "SEE LICENSE IN LICENSE" (ADR-0031 rule 2)');
  });

  it("ignores a private package, which npm never publishes", () => {
    const reader = tree({ "web/packages/internal/package.json": JSON.stringify({ name: "@demo/internal", private: true }) });
    expect(failures(reader)).toEqual([]);
  });

  it("fails when the repository has no LICENSE at all", () => {
    const files: Record<string, string> = {
      "licenses/inventory.json": inventoryJson([{ ...OWN_ITEM, packaged_as: ["web/packages/*/LICENSE"] }, FONT_ITEM]),
      "brands/acme/fonts/synth/Synth.ttf": "font bytes",
      "brands/acme/fonts/synth/OFL.txt": OFL_TEXT,
      "web/packages/tokens/package.json": JSON.stringify({ name: "@demo/tokens", private: false, license: MANIFEST_LICENSE }),
      "web/packages/tokens/LICENSE": LICENSE_TEXT,
    };
    expect(failures(memoryReader(files))[0]).toContain("ADR-0031 rule 1 puts the license text at the repository root");
  });
});

describe("declared dependencies", () => {
  const withDependency = (manifest: Record<string, unknown>, items: readonly Record<string, unknown>[]): RepoReader =>
    tree({ "web/packages/tokens/package.json": JSON.stringify({ name: "@demo/tokens", private: false, license: MANIFEST_LICENSE, ...manifest }) }, items);

  it("fails when a published package declares a package the ledger does not list", () => {
    const reader = withDependency({ peerDependencies: { react: "^19" } }, [OWN_ITEM, FONT_ITEM]);
    expect(failedChecks(reader)).toEqual(["dependencies"]);
    expect(failures(reader)[0]).toContain("@demo/tokens → react");
    expect(failures(reader)[0]).toContain("no inventory item lists this npm name");
  });

  it("passes when an item lists the npm name", () => {
    const react = { ...OWN_ITEM, id: "react", name: "React", permitted_use: "dependency", packaged: false, npm: ["react"] };
    delete (react as Record<string, unknown>)["packaged_as"];
    expect(failures(withDependency({ peerDependencies: { react: "^19" } }, [OWN_ITEM, FONT_ITEM, react]))).toEqual([]);
  });

  it("passes on a dependency that is another Prism package", () => {
    const reader = tree({
      "web/packages/tokens/package.json": JSON.stringify({ name: "@demo/tokens", private: false, license: MANIFEST_LICENSE }),
      "web/packages/react/package.json": JSON.stringify({ name: "@demo/react", private: false, license: MANIFEST_LICENSE, dependencies: { "@demo/tokens": "workspace:*" } }),
      "web/packages/react/LICENSE": LICENSE_TEXT,
    });
    expect(failures(reader)).toEqual([]);
  });

  it("fails when Package.swift declares a package the ledger does not list, and passes once it does", () => {
    const manifest = 'let package = Package(\n  dependencies: [\n    .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.19.4"),\n  ]\n)\n';
    const missing = tree({ "Package.swift": manifest });
    expect(failedChecks(missing)).toEqual(["dependencies"]);
    expect(failures(missing)[0]).toContain("no inventory item lists this SwiftPM package");

    const item = { ...OWN_ITEM, id: "snapshot-testing", name: "swift-snapshot-testing", permitted_use: "dependency", packaged: false, swiftpm: ["https://github.com/pointfreeco/swift-snapshot-testing.git"] };
    delete (item as Record<string, unknown>)["packaged_as"];
    expect(failures(tree({ "Package.swift": manifest }, [OWN_ITEM, FONT_ITEM, item]))).toEqual([]);
  });
});

describe("the ledger itself", () => {
  it("fails when permitted_use_values does not mirror the schema enum", () => {
    const reader = memoryReader({
      LICENSE: LICENSE_TEXT,
      "licenses/inventory.json": inventoryJson([OWN_ITEM, FONT_ITEM], { permitted_use_values: ["own"] }),
      "brands/acme/fonts/synth/Synth.ttf": "font bytes",
      "brands/acme/fonts/synth/OFL.txt": OFL_TEXT,
      "web/packages/tokens/package.json": JSON.stringify({ name: "@demo/tokens", private: false, license: MANIFEST_LICENSE }),
      "web/packages/tokens/LICENSE": LICENSE_TEXT,
    });
    expect(failures(reader).join("\n")).toContain("does not mirror the schema enum");
  });

  it("fails on a duplicate id and on an npm name two items claim", () => {
    const first = { ...OWN_ITEM, id: "dup", permitted_use: "dependency", packaged: false, npm: ["shared"] };
    delete (first as Record<string, unknown>)["packaged_as"];
    const reader = tree({}, [OWN_ITEM, FONT_ITEM, first, { ...first, name: "Another" }]);
    const detail = failures(reader).join("\n");
    expect(detail).toContain('id "dup" is claimed by more than one item');
    expect(detail).toContain('npm name "shared" is claimed by more than one item');
  });

  it("reports a missing inventory as one schema failure", () => {
    const reader = memoryReader({ LICENSE: LICENSE_TEXT });
    const result = runLicensesCheck(reader, schema);
    expect(result.ok).toBe(false);
    expect(formatFailures(result.rows)).toEqual(["licenses/inventory.json: schema: missing (ADR-0015 rule 5)"]);
  });

  it("reports invalid JSON without throwing", () => {
    const reader = memoryReader({ LICENSE: LICENSE_TEXT, "licenses/inventory.json": "{ not json" });
    expect(failures(reader)[0]).toContain("invalid JSON");
  });

  it("rejects an unknown flag with exit code 2", () => {
    const run = runCli("--nope");
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("unknown argument");
  });
});

describe("globs", () => {
  it("matches inside one segment with * and across segments with **", () => {
    expect(globToRegExp("brands/*/fonts").test("brands/prism/fonts")).toBe(true);
    expect(globToRegExp("brands/*/fonts").test("brands/prism/extra/fonts")).toBe(false);
    expect(globToRegExp("web/packages/tokens/src/generated/**/fonts").test("web/packages/tokens/src/generated/prism/fonts")).toBe(true);
    expect(globToRegExp("web/packages/tokens/src/generated/**/fonts").test("web/packages/tokens/src/generated/fonts")).toBe(true);
    expect(globToRegExp("brands/*/fonts/onest/**").test("brands/prism/fonts/onest/OFL.txt")).toBe(true);
    expect(globToRegExp("brands/*/fonts/onest/**").test("brands/prism/fonts/jetbrains-mono/OFL.txt")).toBe(false);
  });

  it("treats every other character as a literal, so a bracketed axis name matches itself", () => {
    expect(globToRegExp("brands/*/fonts/onest/**").test("brands/prism/fonts/onest/Onest[wght].ttf")).toBe(true);
    expect(globToRegExp("a/Onest[wght].ttf").test("a/Onest[wght].ttf")).toBe(true);
    expect(globToRegExp("a/Onest[wght].ttf").test("a/Onestw.ttf")).toBe(false);
  });
});
