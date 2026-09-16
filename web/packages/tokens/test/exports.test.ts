/// <reference types="node" />
/**
 * The export map of ADR-0019 §4 "Package layout" and ADR-0020 §6, checked the way a consumer sees it:
 * a scratch app with `@iiiivaska/prism-tokens` in its `node_modules`, resolving every documented
 * subpath through the package's `exports` field.
 *
 * It runs against `dist/`, so `pnpm --filter @iiiivaska/prism-tokens build` comes first; CI builds
 * every package before it runs the tests.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generated = join(packageRoot, "src", "generated");

interface PackageJson {
  readonly name: string;
  readonly style?: string;
  readonly exports: Readonly<Record<string, string | Readonly<Record<string, string>>>>;
  readonly files: readonly string[];
  readonly peerDependenciesMeta?: Readonly<Record<string, { readonly optional?: boolean }>>;
}

const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as PackageJson;

interface Manifest {
  readonly modifiers: readonly { readonly name: string; readonly contexts: readonly string[]; readonly default: string }[];
}

const manifest = JSON.parse(readFileSync(join(generated, "manifest.json"), "utf8")) as Manifest;

/**
 * The resolver's default brand (`tokens/prism.resolver.json`, carried into the manifest by the token
 * build), which is what the unqualified subpaths and the `style` field point at. Read rather than
 * spelled, so changing the default brand moves the export map or fails this suite.
 */
const defaultBrand = manifest.modifiers.find((modifier) => modifier.name === "brand")?.default ?? "";

/** Every brand the token build emitted, the default one included (ADR-0020 §6). */
const brands = readdirSync(generated, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(generated, entry.name, "tokens.css")))
  .map((entry) => entry.name)
  .sort();

const cssSubpaths = ["./tokens.css", "./motion.css", "./tailwind.css"];
const brandSubpaths = brands.flatMap((brand) => [
  `./brands/${brand}/tokens`,
  `./brands/${brand}/tokens.css`,
  `./brands/${brand}/fonts.css`,
]);
const subpaths = [".", "./react", "./tokens", ...cssSubpaths, ...brandSubpaths, "./manifest.json", "./package.json"];

let fixture: string;
let consumerRequire: ReturnType<typeof createRequire>;

function specifierOf(subpath: string): string {
  return subpath === "." ? pkg.name : `${pkg.name}${subpath.slice(1)}`;
}

beforeAll(() => {
  expect(
    existsSync(join(packageRoot, "dist", "index.js")),
    "build the package first: pnpm --filter @iiiivaska/prism-tokens build",
  ).toBe(true);

  fixture = mkdtempSync(join(tmpdir(), "prism-consumer-"));
  mkdirSync(join(fixture, "node_modules", "@iiiivaska"), { recursive: true });
  symlinkSync(packageRoot, join(fixture, "node_modules", "@iiiivaska", "prism-tokens"), "dir");
  writeFileSync(join(fixture, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
  writeFileSync(join(fixture, "app.js"), "");
  consumerRequire = createRequire(join(fixture, "app.js"));
});

afterAll(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

describe("the export map", () => {
  it("emitted at least the reference brand and the native flavour", () => {
    expect(brands).toContain("prism");
    expect(brands).toContain("prism-native");
  });

  it("resolves every documented subpath from a consumer", () => {
    for (const subpath of subpaths) {
      const resolved = consumerRequire.resolve(specifierOf(subpath));
      expect(existsSync(resolved), `${subpath} resolved to a missing file`).toBe(true);
    }
  });

  it("points ./tokens, ./tokens.css and the style field at the resolver's default brand", () => {
    expect(brands, "the manifest names a brand the build did not emit").toContain(defaultBrand);
    expect(consumerRequire.resolve(specifierOf("./tokens"))).toBe(
      consumerRequire.resolve(specifierOf(`./brands/${defaultBrand}/tokens`)),
    );
    expect(consumerRequire.resolve(specifierOf("./tokens.css"))).toBe(
      consumerRequire.resolve(specifierOf(`./brands/${defaultBrand}/tokens.css`)),
    );
    expect(resolve(packageRoot, pkg.style ?? "")).toBe(
      consumerRequire.resolve(specifierOf(`./brands/${defaultBrand}/tokens.css`)),
    );
  });

  it("gives every brand its own stylesheet, table and @font-face file", () => {
    for (const brand of brands) {
      const css = consumerRequire.resolve(specifierOf(`./brands/${brand}/tokens.css`));
      expect(css.endsWith(join("src", "generated", brand, "tokens.css"))).toBe(true);
      const fonts = readFileSync(consumerRequire.resolve(specifierOf(`./brands/${brand}/fonts.css`)), "utf8");
      expect(fonts).toContain("@font-face");
      // The woff2 files sit beside the stylesheet, so a bundler resolves them relatively.
      for (const url of fonts.matchAll(/url\("\.\/([^"]+)"\)/gu)) {
        expect(existsSync(join(generated, brand, "fonts", url[1] ?? ""))).toBe(true);
      }
    }
  });

  it("carries a style field, for consumers that read one (critic C-14)", () => {
    expect(pkg.style).toBeDefined();
    expect(existsSync(join(packageRoot, pkg.style ?? ""))).toBe(true);
  });

  it("ships the generated sources and the bundle, and lists nothing it does not have (critic C-14)", () => {
    expect(pkg.files).toContain("dist");
    expect(pkg.files).toContain("src/generated");
    for (const entry of pkg.files) {
      expect(existsSync(join(packageRoot, entry)), `files lists ${entry}, which the package does not have`).toBe(true);
    }
  });

  it("names nothing in the export map that the packed files leave out (critic C-14)", () => {
    // The converse of the check above, and what makes "over the packed files" true by construction:
    // the fixture symlinks the source root into `node_modules`, so a subpath pointing outside `dist/`
    // or `src/generated/` would resolve here and 404 for a consumer installing the published tarball.
    const roots = pkg.files.map((entry) => `./${entry}/`);
    const targets = Object.values(pkg.exports).flatMap((entry) =>
      typeof entry === "string" ? [entry] : Object.values(entry),
    );
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      // `*` patterns stand for one subpath per emitted brand.
      for (const path of target.includes("*") ? brands.map((brand) => target.replace("*", brand)) : [target]) {
        expect(
          // npm always packs the manifest itself, whatever `files` says.
          path === "./package.json" || roots.some((root) => path.startsWith(root)),
          `exports names ${path}, which files does not pack`,
        ).toBe(true);
        expect(existsSync(join(packageRoot, path)), `exports names ${path}, which the package does not have`).toBe(true);
      }
    }
    // The `style` field is resolved by consumers the same way, so it obeys the same rule.
    expect(roots.some((root) => (pkg.style ?? "").startsWith(root))).toBe(true);
  });

  it("makes React optional", () => {
    expect(pkg.peerDependenciesMeta?.["react"]?.optional).toBe(true);
  });

  it("refuses a path the map does not list", () => {
    for (const subpath of ["/src/index.ts", "/dist/index.js", "/brands/prism/fonts/onest/onest-wght.woff2", "/runtime"]) {
      expect(() => consumerRequire.resolve(`${pkg.name}${subpath}`), subpath).toThrow();
    }
  });

  it("declares types beside every JavaScript subpath", () => {
    for (const subpath of [".", "./react", "./tokens", ...brands.map((brand) => `./brands/${brand}/tokens`)]) {
      const entry = pkg.exports[subpath] ?? pkg.exports["./brands/*/tokens"];
      const types = typeof entry === "object" ? entry["types"] : undefined;
      expect(types, `${subpath} has no types condition`).toBeDefined();
      const brand = /^\.\/brands\/([^/]+)\//u.exec(subpath)?.[1];
      const path = brand === undefined ? (types ?? "") : (types ?? "").replace("*", brand);
      expect(existsSync(join(packageRoot, path)), `${path} is missing`).toBe(true);
    }
  });
});

/**
 * What the files a consumer resolves actually contain. These assertions read the packed CSS: the
 * selector forms the cascade needs, the reduced pair of the root motion switch and the per-brand
 * `@font-face` block with no network URL. Evaluating the cascade itself — a nested dark scope inside
 * a light root, the density and motion switches flipped without a rebuild, Inter loaded from the
 * package offline — needs a browser, and is the runtime-contract spec of P3-4, which runs in
 * Chromium, WebKit and Firefox (roadmap P3-2, P3-4; ADR-0019 rules 5, 8, 9, 11).
 */
describe("what a consumer gets when it imports the subpaths", () => {
  it("gives the root export the ADR-0019 §4 runtime and no React", async () => {
    const url = pathToFileURL(consumerRequire.resolve(pkg.name)).href;
    const root = (await import(url)) as Record<string, unknown>;
    for (const name of [
      "rootAttributes",
      "scope",
      "readContext",
      "watchContext",
      "mountRoot",
      "setBrandTokens",
      "brandTokens",
      "webRuntime",
      "defaultContext",
      "platformDefaults",
    ]) {
      expect(root[name], `the root export is missing ${name}`).toBeDefined();
    }
    const bundle = readFileSync(consumerRequire.resolve(pkg.name), "utf8");
    expect(bundle).not.toMatch(/from\s*["']react/u);
  });

  it("gives ./react the provider, and imports React rather than bundling it", async () => {
    const file = consumerRequire.resolve(specifierOf("./react"));
    expect(readFileSync(file, "utf8")).toMatch(/from\s*["']react["']/u);
    const react = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
    expect(typeof react["Theme"]).toBe("function");
    expect(typeof react["useTokenContext"]).toBe("function");
    expect(typeof react["useBrandTokens"]).toBe("function");
    // ./react re-exports the framework-free runtime, so an app needs one import.
    expect(typeof react["scope"]).toBe("function");
  });

  it("gives every brand table the same API", async () => {
    for (const brand of brands) {
      const url = pathToFileURL(consumerRequire.resolve(specifierOf(`./brands/${brand}/tokens`))).href;
      const table = (await import(url)) as { table: Record<string, unknown>; resolveTokens: (c?: object) => object };
      expect(typeof table.resolveTokens).toBe("function");
      expect(Object.keys(table.table).length).toBeGreaterThan(0);
      expect(table.resolveTokens({ colorScheme: "dark" })).toHaveProperty("color.bg.page");
    }
  });

  it("serves one motion stylesheet and one Tailwind bridge for every brand", () => {
    const motion = readFileSync(consumerRequire.resolve(specifierOf("./motion.css")), "utf8");
    // The root motion switch of ADR-0023 §8.5: a consumer flips `data-ds-motion` and the spring
    // duration changes without a rebuild, and the media fallback does the same with no attribute.
    expect(motion).toContain('--ds-ref-motion-spring-snappy-duration: 487ms');
    expect(motion).toContain(':root[data-ds-motion="reduce"]');
    expect(motion).toContain("--ds-motion-spring-snappy-duration: 367ms");
    expect(motion).toContain("(prefers-reduced-motion: reduce)");
    expect(readFileSync(consumerRequire.resolve(specifierOf("./tailwind.css")), "utf8")).toContain("@custom-variant");
  });

  it("scopes the nestable axes with plain attribute selectors, so a dark band nests in a light root", () => {
    const css = readFileSync(consumerRequire.resolve(specifierOf("./tokens.css")), "utf8");
    expect(css).toContain('\n  [data-ds-color-scheme="dark"] {');
    expect(css).toContain('\n  [data-ds-density="regular"] {');
    // The root-only axes never appear in a descendant position on their own.
    expect(css).toContain(':root[data-ds-modality="touch"]');
    // Fallback selectors list every valid value, never a bare :not([attr]) (ADR-0019 rule 2).
    expect(css).not.toMatch(/:not\(\[data-ds-[a-z-]+\]\)/u);
  });

  it("serves every brand's fonts from the package, with no network URL", () => {
    for (const brand of brands) {
      const fonts = readFileSync(consumerRequire.resolve(specifierOf(`./brands/${brand}/fonts.css`)), "utf8");
      expect(fonts).not.toMatch(/url\(\s*["']?https?:/u);
      expect(fonts).toMatch(/url\("\.\//u);
    }
    const native = readFileSync(consumerRequire.resolve(specifierOf("./brands/prism-native/fonts.css")), "utf8");
    expect(native).toContain('font-family: "Inter"');
  });
});
