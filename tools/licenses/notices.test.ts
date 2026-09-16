// licenses:notices (roadmap P2-4 acceptance: THIRD_PARTY_NOTICES.md regenerates byte-identically):
// the committed file equals the render of the committed ledger, the render is a pure function of the
// ledger (same bytes twice, no reachable input but the inventory), and --check fails on a stale or
// missing file naming the first line that differs.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { Inventory } from "./inventory.ts";
import { compileSchema, loadInventory, toolSchemaPath } from "./inventory.ts";
import { firstDifference, linkLabel, NOTICES_PATH, renderNotices, sentence } from "./notices.ts";
import { fsRepoReader } from "./tree.ts";

const repo = join(import.meta.dirname, "..", "..");
const cli = join(import.meta.dirname, "notices.ts");
const runCli = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

const schema = JSON.parse(readFileSync(toolSchemaPath(), "utf8")) as object;
const committed = readFileSync(join(repo, NOTICES_PATH), "utf8");
const { inventory, issues } = loadInventory(fsRepoReader(repo), compileSchema(schema));

const temporary: string[] = [];
/** A tree with the repository's ledger and `files` written into it. */
function scratch(files: Readonly<Record<string, string>> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "prism-notices-"));
  temporary.push(root);
  mkdirSync(join(root, "licenses"));
  cpSync(join(repo, "licenses", "inventory.json"), join(root, "licenses", "inventory.json"));
  for (const [path, contents] of Object.entries(files)) writeFileSync(join(root, ...path.split("/")), contents);
  return root;
}

afterAll(() => {
  for (const root of temporary) rmSync(root, { recursive: true, force: true });
});

describe("the committed notices", () => {
  it("validates the ledger it is generated from", () => {
    expect(issues).toEqual([]);
    expect(inventory).not.toBeNull();
  });

  it("equals the render of licenses/inventory.json, byte for byte", () => {
    expect(renderNotices(inventory as Inventory)).toBe(committed);
  });

  it("is up to date according to the CLI, which exits 0", () => {
    const run = runCli("--check");
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("matches licenses/inventory.json");
  });

  it("names every item of the ledger except Prism itself, and links its license", () => {
    const items = (inventory as Inventory).items;
    for (const item of items) {
      if (item.permitted_use === "own") continue;
      expect(committed).toContain(`[${item.spdx}](${item.license_url})`);
    }
    expect(committed).not.toContain("| Prism (this repository)");
    expect(committed).toContain("Copyright (c) 2026 iiiivaska (ADR-0028)");
  });

  it("lists the files every packaged item ships as", () => {
    for (const item of (inventory as Inventory).items) {
      if (!item.packaged || item.permitted_use === "own") continue;
      expect(committed).toContain(`- **${item.name}** — ${item.attribution}.`);
      for (const pattern of item.packaged_as ?? []) expect(committed).toContain(`  - \`${pattern}\``);
    }
  });
});

describe("the render", () => {
  const minimal: Inventory = {
    updated: "2026-01-02",
    permitted_use_values: [],
    items: [
      { id: "self", kind: "code", name: "Self", spdx: "MIT", source: "https://example.invalid/self", license_url: "https://example.invalid/self/LICENSE", attribution: "Copyright (c) 2026 Self", permitted_use: "own", packaged: true, packaged_as: ["LICENSE"] },
      {
        id: "synth",
        kind: "font",
        name: "Synth",
        version: "1.000",
        spdx: "OFL-1.1",
        source: "https://example.invalid/synth/",
        license_url: "https://example.invalid/synth/OFL.txt",
        attribution: "Copyright 2026 The Synth Project Authors",
        permitted_use: "adapt-with-attribution",
        packaged: true,
        packaged_as: ["brands/*/fonts/synth/**"],
        notes: "Bundled with its OFL.txt",
      },
      { id: "shots", kind: "reference", name: "Shots", spdx: "LicenseRef-Proprietary", source: "https://example.invalid/shots", license_url: "https://example.invalid/terms", attribution: "A studio", permitted_use: "principles-only", packaged: false },
    ],
  };
  const rendered = renderNotices(minimal);

  it("puts the version in the item name and the packaged flag in its own column", () => {
    expect(rendered).toContain("| Synth 1.000 | font | [OFL-1.1](https://example.invalid/synth/OFL.txt) | adapt-with-attribution | yes | [example.invalid/synth](https://example.invalid/synth/) |");
  });

  it("leaves Prism's own entry out of the third-party table", () => {
    expect(rendered).not.toContain("| Self |");
  });

  it("explains only the permitted uses the ledger actually uses, in vocabulary order", () => {
    const explained = rendered
      .split("\n")
      .filter((line) => line.startsWith("- **") && line.includes(" — ") && /^- \*\*[a-z-]+\*\*/.test(line))
      .map((line) => line.slice(4, line.indexOf("**", 4)));
    expect(explained).toEqual(["own", "adapt-with-attribution", "principles-only"]);
  });

  it("ends every generated sentence with a full stop and the file with a newline", () => {
    expect(rendered).toContain("- **Synth** — Copyright 2026 The Synth Project Authors. Bundled with its OFL.txt.");
    expect(rendered).toContain("- **Shots** — A studio.");
    expect(rendered.endsWith("\n")).toBe(true);
  });

  it("says so when nothing third-party is packaged", () => {
    expect(renderNotices({ ...minimal, items: minimal.items.filter((item) => item.kind !== "font") })).toContain("Prism ships no third-party bytes today.");
  });

  it("is a pure function of the ledger", () => {
    expect(renderNotices(minimal)).toBe(rendered);
  });
});

describe("--check", () => {
  it("fails on a stale file, naming the first line that differs", () => {
    const root = scratch({ [NOTICES_PATH]: committed.replace("# Third-party notices", "# Notices, edited by hand") });
    const run = runCli("--root", root, "--check");
    expect(run.status).toBe(1);
    expect(run.stderr).toContain(`${NOTICES_PATH} is stale at line 1`);
    expect(run.stderr).toContain("run pnpm licenses:notices and commit the result");
  });

  it("fails when the file is missing", () => {
    const run = runCli("--root", scratch(), "--check");
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("is missing");
  });

  it("writes the same bytes the repository committed, twice", () => {
    const root = scratch();
    expect(runCli("--root", root).status).toBe(0);
    const first = readFileSync(join(root, NOTICES_PATH), "utf8");
    expect(first).toBe(committed);
    const again = runCli("--root", root);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain("already up to date");
    expect(readFileSync(join(root, NOTICES_PATH), "utf8")).toBe(first);
  });

  it("rejects an unknown flag with exit code 2", () => {
    const run = runCli("--nope");
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("unknown argument");
  });
});

describe("helpers", () => {
  it("strips the scheme and a trailing slash from a link label", () => {
    expect(linkLabel("https://github.com/rsms/inter/releases/tag/v4.1")).toBe("github.com/rsms/inter/releases/tag/v4.1");
    expect(linkLabel("https://developer.apple.com/fonts/")).toBe("developer.apple.com/fonts");
  });

  it("adds a full stop only when the text has no terminator", () => {
    expect(sentence("Apple Inc")).toBe("Apple Inc.");
    expect(sentence("Apple Inc.")).toBe("Apple Inc.");
    expect(sentence("  spaced  ")).toBe("spaced.");
  });

  it("reports the first differing line, or null when the texts are equal", () => {
    expect(firstDifference("a\nb\n", "a\nb\n")).toBeNull();
    expect(firstDifference("a\nb\n", "a\nc\n")).toEqual({ line: 2, expected: "b", actual: "c" });
    expect(firstDifference("a\nb\n", "a\n")).toEqual({ line: 2, expected: "b", actual: "" });
  });
});
