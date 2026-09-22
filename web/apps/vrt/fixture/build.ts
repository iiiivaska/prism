/// <reference types="node" />
/**
 * Builds the runtime-contract fixture (roadmap P3-4, ADR-0019 §4, critic C-14): a consumer app that
 * holds `@iiiivaska/prism-tokens` the way npm installs it — the tarball `npm pack` produces, unpacked
 * into `node_modules/` — and not the way the workspace links it.
 *
 * The difference is the point. A workspace symlink resolves subpaths against the source tree, so a
 * stylesheet, a font file or an export the published tarball leaves out still resolves. The fixture
 * resolves every subpath through the packed package's own `exports` field, and the static server hands
 * the browser exactly those files, so the runtime-contract spec evaluates the cascade over what a
 * consumer downloads. `index.html` therefore names package subpaths (`%%@iiiivaska/prism-tokens/…%%`)
 * and never a file path; this script rewrites each marker into the served URL, and a subpath the
 * tarball does not carry fails the build here rather than 404ing in the browser.
 *
 *   node fixture/build.ts        build into .fixture/ (or $PRISM_VRT_FIXTURE_DIR)
 *
 * `serve.ts` runs it at startup, so `pnpm --filter @iiiivaska/prism-vrt test` needs no separate step.
 * The packed package must be built first (`pnpm --filter @iiiivaska/prism-tokens build`): `exports`
 * points `.` and `./react` at `dist/`, which the token build writes.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";

export const vrtRoot = resolve(import.meta.dirname, "..");
export const fixtureSource = join(vrtRoot, "fixture");

/**
 * Where the built fixture lands. `.gitignore` keeps the default out of the repository; an agent or a
 * developer who wants it in a scratch directory sets `PRISM_VRT_FIXTURE_DIR`.
 */
export const fixtureRoot = process.env["PRISM_VRT_FIXTURE_DIR"] ?? join(vrtRoot, ".fixture");

/** The path the static server mounts the fixture at, and the path the spec navigates to. */
export const fixturePath = "/runtime-contract/";

/** Workspace packages the fixture installs from a tarball, as `<scope>/<name>` and their directory. */
const PACKED: readonly { readonly name: string; readonly directory: string }[] = [
  { name: "@iiiivaska/prism-tokens", directory: resolve(vrtRoot, "..", "..", "packages", "tokens") },
];

/** `%%<package subpath>%%` in index.html, rewritten to the URL the server serves that file at. */
const SUBPATH = /%%([^%\s]+)%%/gu;

interface PackResult {
  readonly filename: string;
}

/** `npm pack` into `destination`, and the tarball it wrote. */
function pack(directory: string, destination: string): string {
  const stdout = execFileSync("npm", ["pack", "--json", "--pack-destination", destination], {
    cwd: directory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const results = JSON.parse(stdout) as readonly PackResult[];
  const filename = results[0]?.filename;
  if (filename === undefined) throw new Error(`npm pack printed no tarball name for ${directory}`);
  return join(destination, filename);
}

/** Unpacks a tarball into `target`, dropping the tarball's own `package/` wrapper. */
function unpack(tarball: string, target: string): void {
  mkdirSync(target, { recursive: true });
  execFileSync("tar", ["-xzf", tarball, "-C", target, "--strip-components=1"], { stdio: ["ignore", "inherit", "inherit"] });
}

export function buildFixture(): string {
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(fixtureRoot, { recursive: true });

  const staging = mkdtempSync(join(tmpdir(), "prism-vrt-pack-"));
  try {
    for (const { name, directory } of PACKED) {
      if (!existsSync(join(directory, "dist"))) {
        throw new Error(`${name} is not built: run \`pnpm --filter ${name} build\` before the visual regression suite`);
      }
      unpack(pack(directory, staging), join(fixtureRoot, "node_modules", ...name.split("/")));
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }

  // Resolution starts at the fixture root, so every specifier goes through the packed package's
  // `exports` field — the same resolution a consumer's bundler performs.
  const resolveSubpath = createRequire(join(fixtureRoot, "index.html")).resolve;
  const page = readFileSync(join(fixtureSource, "index.html"), "utf8").replaceAll(SUBPATH, (_marker, specifier: string) => {
    const file = resolveSubpath(specifier);
    if (!file.startsWith(fixtureRoot + sep)) throw new Error(`${specifier} resolved outside the fixture, to ${file}`);
    return `./${relative(fixtureRoot, file).split(sep).join("/")}`;
  });
  writeFileSync(join(fixtureRoot, "index.html"), page);
  return fixtureRoot;
}

if (import.meta.main) {
  console.log(`vrt: built the runtime-contract fixture in ${buildFixture()}`);
}
