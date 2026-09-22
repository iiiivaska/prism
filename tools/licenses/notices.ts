// licenses:notices (roadmap P2-4, critic G-26; ADR-0015 rule 5): THIRD_PARTY_NOTICES.md, generated
// from licenses/inventory.json.
//
// The render is a pure function of the inventory — order, wording and links all come from the ledger —
// so the file regenerates byte-identically until the ledger changes, and `--check` fails when the
// committed file is stale. CI runs the check; a change to the inventory carries the regenerated
// notices in the same commit.
//
//   node licenses/notices.ts            write THIRD_PARTY_NOTICES.md
//   node licenses/notices.ts --check    fail when the committed file differs from the render
//   node licenses/notices.ts --root <dir>   read and write another tree with the same layout
//   node licenses/notices.ts --out <path>   write somewhere else (relative to the root)
//
// Exit codes: 0 written or up to date, 1 stale (--check), 2 a usage or layout error.

import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Inventory, PermittedUse } from "./inventory.ts";
import { compileSchema, displayName, INVENTORY_PATH, loadInventory, loadSchema, PERMITTED_USE } from "./inventory.ts";
import { fsRepoReader, readText } from "./tree.ts";

export const NOTICES_PATH = "THIRD_PARTY_NOTICES.md";

/** One line per value, printed for the values the inventory actually uses. */
export const PERMITTED_USE_MEANING: Readonly<Record<PermittedUse, string>> = {
  own: "Prism's own work, under the proprietary license in `LICENSE`: all rights reserved (ADR-0031).",
  "adapt-with-attribution": "may be adapted and shipped inside Prism, with the attribution below.",
  dependency: "declared as a dependency and installed from its own registry; Prism vendors none of its bytes.",
  "sdk-runtime": "used at run time through the Apple SDK, inside apps running on Apple platforms; never bundled and never on the web.",
  "inventory-only": "read for inventory breadth only; nothing is copied into Prism.",
  "apple-mockups-only": "used only to design mock-ups of Apple-platform interfaces (Apple Design Resources license); never a source for web assets.",
  "read-only": "read for naming and structure ideas; no asset, component or token is taken.",
  "principles-only": "analyzed in writing only; no file, image or composition is reused (ADR-0015).",
};

/** THIRD_PARTY_NOTICES.md for `inventory`, ending in a newline. */
export function renderNotices(inventory: Inventory): string {
  const items = inventory.items;
  const thirdParty = items.filter((item) => item.permitted_use !== "own");
  const lines: string[] = [
    "# Third-party notices",
    "",
    `Generated from \`licenses/inventory.json\` (updated ${inventory.updated}) with \`pnpm licenses:notices\`; do not edit by hand. \`pnpm licenses:check\` gates the inventory against what the repository packages, and \`pnpm licenses:notices --check\` fails when this file is stale.`,
    "",
    "Prism's own code, tokens, specs, generated outputs and documentation are under the proprietary license in `LICENSE`, Copyright (c) 2026 iiiivaska, all rights reserved (ADR-0031). Everything below keeps its own license: `LICENSE` neither relicenses it nor narrows what it grants you.",
    "",
    "| Item | Kind | License | Permitted use in Prism | Packaged | Source |",
    "|---|---|---|---|---|---|",
  ];
  for (const item of thirdParty) {
    lines.push(
      `| ${cell(displayName(item))} | ${item.kind} | [${cell(item.spdx)}](${item.license_url}) | ${item.permitted_use} | ${item.packaged ? "yes" : "no"} | [${cell(linkLabel(item.source))}](${item.source}) |`,
    );
  }

  const used = PERMITTED_USE.filter((value) => items.some((item) => item.permitted_use === value));
  if (used.length > 0) {
    lines.push("", "## What the permitted uses mean", "");
    for (const value of used) lines.push(`- **${value}** — ${PERMITTED_USE_MEANING[value]}`);
  }

  const packaged = thirdParty.filter((item) => item.packaged);
  lines.push("", "## Attributions for packaged assets", "");
  if (packaged.length === 0) {
    lines.push("Prism ships no third-party bytes today.");
  } else {
    lines.push("Prism ships these files, each with the license text of the work it comes from.");
    lines.push("");
    for (const item of packaged) {
      lines.push(`- **${cell(item.name)}** — ${sentence(item.attribution)}${item.notes === undefined ? "" : ` ${sentence(item.notes)}`}`);
      for (const pattern of item.packaged_as ?? []) lines.push(`  - \`${pattern}\``);
    }
  }

  const references = thirdParty.filter((item) => item.permitted_use === "principles-only");
  if (references.length > 0) {
    lines.push("", "## Reference material", "");
    lines.push("Analyzed in writing only. No file, image or composition from these sources is in the repository (ADR-0015 rules 1–3).");
    lines.push("");
    for (const item of references) lines.push(`- **${cell(displayName(item))}** — ${sentence(item.attribution)}${item.notes === undefined ? "" : ` ${sentence(item.notes)}`}`);
  }

  return `${lines.join("\n")}\n`;
}

/** "github.com/google/fonts/tree/main/ofl/onest" — the URL without its scheme, for the link text. */
export function linkLabel(url: string): string {
  return url.replace(/^[a-z]+:\/\//, "").replace(/\/$/, "");
}

/** Text ending in a full stop, so generated sentences read the same whether or not the ledger has one. */
export function sentence(text: string): string {
  const trimmed = text.trim();
  return trimmed === "" || /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** The first line where `actual` differs from `expected`, 1-based, or null when they are equal. */
export function firstDifference(expected: string, actual: string): { line: number; expected: string; actual: string } | null {
  if (expected === actual) return null;
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  for (let i = 0; i < Math.max(expectedLines.length, actualLines.length); i++) {
    if (expectedLines[i] === actualLines[i]) continue;
    return { line: i + 1, expected: expectedLines[i] ?? "(end of file)", actual: actualLines[i] ?? "(end of file)" };
  }
  return null;
}

/** CLI entry; returns the process exit code (0 written or up to date, 1 stale, 2 usage or layout error). */
export function main(argv: readonly string[]): number {
  let root = join(import.meta.dirname, "..", "..");
  let out = NOTICES_PATH;
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? "";
    if (flag === "--check") {
      check = true;
      continue;
    }
    if (flag !== "--root" && flag !== "--out") {
      console.error(`licenses:notices: unknown argument ${JSON.stringify(flag)}`);
      return 2;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      console.error(`licenses:notices: ${flag} needs a path`);
      return 2;
    }
    if (flag === "--root") root = value;
    else out = value;
    i++;
  }

  const base = resolve(root);
  const reader = fsRepoReader(base);
  let schema: object;
  try {
    ({ schema } = loadSchema(reader));
  } catch (error) {
    console.error(`licenses:notices: cannot read the inventory schema: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }

  const { inventory, issues } = loadInventory(reader, compileSchema(schema));
  if (inventory === null || issues.length > 0) {
    for (const issue of issues) console.error(`${issue.file}${issue.pointer}: ${issue.message}`);
    console.error(`licenses:notices: ${INVENTORY_PATH} does not validate; run pnpm licenses:check`);
    return 2;
  }

  const rendered = renderNotices(inventory);
  const current = readText(reader, out);
  if (check) {
    const difference = firstDifference(rendered, current ?? "");
    if (current === null) {
      console.error(`licenses:notices: ${out} is missing; run pnpm licenses:notices`);
      return 1;
    }
    if (difference === null) {
      console.log(`licenses:notices: ${out} matches ${INVENTORY_PATH} (${inventory.items.length} items, updated ${inventory.updated})`);
      return 0;
    }
    console.error(`licenses:notices: ${out} is stale at line ${difference.line}`);
    console.error(`  generated: ${difference.expected}`);
    console.error(`  committed: ${difference.actual}`);
    console.error("licenses:notices: run pnpm licenses:notices and commit the result");
    return 1;
  }

  if (current === rendered) {
    console.log(`licenses:notices: ${out} is already up to date`);
    return 0;
  }
  try {
    writeFileSync(join(base, ...out.split("/")), rendered);
  } catch (error) {
    console.error(`licenses:notices: cannot write ${out}: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  console.log(`licenses:notices: wrote ${out} from ${INVENTORY_PATH} (${inventory.items.length} items, updated ${inventory.updated})`);
  return 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
