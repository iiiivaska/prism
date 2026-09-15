import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv } from "ajv";
import ajvFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
  RESOLVER,
  SCHEMA_DIR,
  checksumIssues,
  compileSchema,
  loadValidators,
  parseChecksums,
  validateTree,
  verifyChecksums,
} from "./validate.ts";

const repo = join(import.meta.dirname, "..", "..");
const broken = join(import.meta.dirname, "fixtures", "schema-broken");
const cli = join(import.meta.dirname, "validate.ts");
const schema = (name: string): object => JSON.parse(readFileSync(join(SCHEMA_DIR, name), "utf8")) as object;

function runCli(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

describe("vendored DTCG 2025.10 schemas", () => {
  it("match SHA256SUMS, which pins the published bytes (ADR-0024 T7)", () => {
    expect(verifyChecksums()).toEqual([]);
    const sums = parseChecksums(readFileSync(join(SCHEMA_DIR, "SHA256SUMS"), "utf8"));
    expect(Object.fromEntries(sums)).toEqual({
      "format.json": "32e93b780e4e4bca778d0780cb797a560deedc470c608af16576223f7e42915f",
      "resolver.json": "a5acd14318f3c347ea2d12b4ab0f873d1340e74e957c454d112672e58b1da977",
    });
  });

  it("reports tampered, missing and unlisted schema files", () => {
    const sums = parseChecksums(readFileSync(join(SCHEMA_DIR, "SHA256SUMS"), "utf8"));
    const bytes = (name: string) => readFileSync(join(SCHEMA_DIR, name));
    expect(checksumIssues(sums, bytes)).toEqual([]);
    const tampered = checksumIssues(sums, (name) => (name === "format.json" ? Buffer.concat([bytes(name), Buffer.from(" ")]) : bytes(name)));
    expect(tampered).toHaveLength(1);
    expect(tampered[0]?.file).toBe("format.json");
    expect(tampered[0]?.message).toMatch(/does not match SHA256SUMS/);
    expect(checksumIssues(sums, (name) => (name === "resolver.json" ? undefined : bytes(name)))).toEqual([
      { file: "resolver.json", pointer: "", message: "missing" },
    ]);
    const unlisted = new Map(sums);
    unlisted.delete("resolver.json");
    expect(checksumIssues(unlisted, bytes)).toEqual([{ file: "SHA256SUMS", pointer: "", message: "no checksum for resolver.json" }]);
    expect(() => parseChecksums("not a checksum line\n")).toThrow(/SHA256SUMS line 1/);
  });

  it("need one Ajv instance per schema: resolver.json embeds format.json under the same $id (ADR-0024 T7)", () => {
    const shared = new Ajv({ allErrors: true, strict: true });
    ajvFormats.default(shared);
    shared.compile(schema("format.json"));
    expect(() => shared.compile(schema("resolver.json"))).toThrow(/resolves to more than one schema/);
    expect(() => loadValidators()).not.toThrow();
  });

  it("check structure, not Prism's own rules (ADR-0024 T7)", () => {
    const format = compileSchema(schema("format.json"));
    expect(format({ ref: { flag: { $type: "boolean", $value: true } } })).toBe(false);
    expect(format({ ref: { color: { $type: "color", c: { $value: { colorSpace: "srgb", components: [0, 0], alpha: 1 } } } } })).toBe(false);
    // Untyped tokens, group references and camelCase names are caught by tokens:lint and tokens:build.
    expect(format({ sys: { untyped: { $value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.5 } } } })).toBe(true);
    expect(format({ ref: { easing: { $type: "cubicBezier", inOut: { $value: [0.4, 0, 0.2, 1] } } } })).toBe(true);
  });
});

describe("validateTree", () => {
  it("passes on the repository: every token file, both brand files and the resolver", () => {
    const result = validateTree(repo);
    expect(result.issues).toEqual([]);
    expect(result.files).toContain(RESOLVER);
    expect(result.files).toContain("tokens/ref/color.palette.tokens.json");
    expect(result.files).toContain("tokens/sys/color/light.tokens.json");
    expect(result.files).toContain("brands/prism/brand.tokens.json");
    expect(result.files).toContain("brands/prism-native/brand.tokens.json");
    expect(result.files.every((file) => file === RESOLVER || file.endsWith(".tokens.json"))).toBe(true);
    expect(result.files.some((file) => file.startsWith("tokens/export/"))).toBe(false);
  });

  it("fails on the broken fixture, naming the file and the JSON pointer of the two-component color", () => {
    const result = validateTree(broken);
    expect(result.files).toEqual(["tokens/ref/color.tokens.json", RESOLVER]);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      file: "tokens/ref/color.tokens.json",
      pointer: "/ref/color/two-components/$value/components",
    });
    expect(result.issues[0]?.message).toMatch(/fewer than 3 items/);
  });
});

describe("CLI", () => {
  it("exits 0 on the repository", () => {
    const run = runCli();
    expect(run.status).toBe(0);
    expect(run.stdout).toMatch(/files valid against the DTCG 2025\.10 schemas/);
  });

  it("exits 1 on the broken fixture and prints file#pointer", () => {
    const run = runCli("--root", broken);
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("tokens/ref/color.tokens.json#/ref/color/two-components/$value/components:");
    expect(run.stderr).toMatch(/1 schema errors in 1 of 2 files/);
  });

  it("exits 2 on a usage or layout error", () => {
    expect(runCli("--unknown").status).toBe(2);
    expect(runCli("--root").status).toBe(2);
    expect(runCli("--root", join(broken, "tokens")).status).toBe(2);
  });
});
