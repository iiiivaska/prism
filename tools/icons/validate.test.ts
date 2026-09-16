// The end-to-end pass `icons:validate` runs in CI: the committed registry, the committed generated
// files and the SF-name scan over the working tree. Running it here too means `pnpm -r test` fails on
// stale icon output as well, the same way `tokens:check` guards the token output.
import { describe, expect, test } from "vitest";
import { OWNED_ROOTS } from "./config.ts";
import { REPO_ROOT, run, scanTextFiles } from "./validate.ts";

describe("icons:validate", () => {
  const result = run({ root: REPO_ROOT, write: false });

  test("the repository is clean", () => {
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("every generated file is committed and current", () => {
    expect(result.written.added).toEqual([]);
    expect(result.written.changed).toEqual([]);
    expect(result.written.removed).toEqual([]);
    expect(result.generated).toBeGreaterThan(0);
  });

  test("writes only inside the roots it owns", () => {
    for (const path of [...result.written.added, ...result.written.changed]) {
      expect(OWNED_ROOTS.some((root) => path.startsWith(`${root}/`)), path).toBe(true);
    }
  });
});

describe("the SF-name scan", () => {
  test("reads the generated web output and the design-tool export", () => {
    const paths = scanTextFiles(REPO_ROOT).map((file) => file.path);
    expect(paths).toContain("web/packages/react/src/generated/icons.ts");
    expect(paths).toContain("spec/icons/generated/tokens-studio/icons.json");
  });

  test("skips dependencies and build output", () => {
    for (const path of scanTextFiles(REPO_ROOT).map((file) => file.path)) {
      expect(path).not.toContain("node_modules/");
      expect(path).not.toContain("/dist/");
    }
  });
});
