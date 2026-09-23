/// <reference types="node" />
/**
 * Builds the runtime-contract fixture (roadmap P3-4, ADR-0019 §4, critic C-14): a consumer app that
 * holds `@iiiivaska/prism-tokens` and `@iiiivaska/prism-react` the way npm installs them — the tarball
 * `npm pack` produces, unpacked into `node_modules/` — and not the way the workspace links them.
 *
 * The difference is the point. A workspace symlink resolves subpaths against the source tree, so a
 * stylesheet, a font file or an export the published tarball leaves out still resolves. The fixture
 * resolves every subpath through the packed package's own `exports` field, and the static server hands
 * the browser exactly those files, so the runtime-contract spec evaluates the cascade over what a
 * consumer downloads. `index.html` therefore names package subpaths (`%%@iiiivaska/prism-tokens/…%%`)
 * and never a file path; this script rewrites each marker into the served URL, and a subpath the
 * tarball does not carry fails the build here rather than 404ing in the browser.
 *
 * It builds two pages:
 *
 * - `index.html`, served as it is written: the tokens and the ADR-0019 runtime, loaded by the browser
 *   straight from the packed files.
 * - `direction/` (`fixture/direction/`), a React app over both packages that Vite builds at Prism's
 *   browser floor. A consumer ships Prism's stylesheet through such a build, and a floor-targeted build
 *   rewrites every selector the floor lacks — `:dir()` became `:lang()`, which a `dir` attribute never
 *   matches (P5-3 finding SD-7) — so the right-to-left cases are read from what that build ships, not
 *   from `dist/styles.css` as the package wrote it. The packed packages' third-party dependencies are
 *   linked beside them from the workspace's own install (`linkDependencies`), since the build needs
 *   React, React Aria and Phosphor to bundle the app.
 *
 *   node fixture/build.ts        build into .fixture/ (or $PRISM_VRT_FIXTURE_DIR)
 *
 * `serve.ts` runs it at startup, so `pnpm --filter @iiiivaska/prism-vrt test` needs no separate step.
 * The packed packages must be built first (`pnpm --filter @iiiivaska/prism-tokens --filter
 * @iiiivaska/prism-react build`): their `exports` point at `dist/`, which their builds write.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

export const vrtRoot = resolve(import.meta.dirname, "..");
export const fixtureSource = join(vrtRoot, "fixture");

/**
 * Where the built fixture lands. `.gitignore` keeps the default out of the repository; an agent or a
 * developer who wants it in a scratch directory sets `PRISM_VRT_FIXTURE_DIR`.
 */
export const fixtureRoot = process.env["PRISM_VRT_FIXTURE_DIR"] ?? join(vrtRoot, ".fixture");

/** The path the static server mounts the fixture at, and the path the spec navigates to. */
export const fixturePath = "/runtime-contract/";

/** The path of the Vite-built direction page, under the fixture. */
export const directionPath = `${fixturePath}direction/`;

/**
 * Prism's browser floor, which is Tailwind v4's (docs/research/arch-web.md §2.1), with Edge beside the
 * Chrome it follows. Named here rather than left to Vite's default target, so the page keeps being built
 * for the floor when that default moves: a build for newer browsers rewrites nothing, and the direction
 * cases would then pass whatever selector the package wrote.
 */
export const browserFloor = ["chrome111", "edge111", "firefox128", "safari16.4"] as const;

/** Workspace packages the fixture installs from a tarball, as `<scope>/<name>` and their directory. */
const PACKED: readonly { readonly name: string; readonly directory: string }[] = [
  { name: "@iiiivaska/prism-tokens", directory: resolve(vrtRoot, "..", "..", "packages", "tokens") },
  { name: "@iiiivaska/prism-react", directory: resolve(vrtRoot, "..", "..", "packages", "react") },
];

/** `%%<package subpath>%%` in index.html, rewritten to the URL the server serves that file at. */
const SUBPATH = /%%([^%\s]+)%%/gu;

interface PackResult {
  readonly filename: string;
}

interface Manifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
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

/**
 * Puts a packed package's third-party dependencies beside it in `node_modules/`, where `npm install` would:
 * every name its `dependencies` and `peerDependencies` declare, linked to the copy the workspace package
 * itself resolves, so the versions are the ones pnpm-lock.yaml pins. A Prism package is never linked; it
 * is always its tarball. Two packages that resolve one name to two installs fail here, because the page
 * would bundle two Reacts.
 */
function linkDependencies(name: string, directory: string): void {
  const installed = join(fixtureRoot, "node_modules");
  const manifest = JSON.parse(readFileSync(join(installed, ...name.split("/"), "package.json"), "utf8")) as Manifest;
  for (const dependency of Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies })) {
    if (PACKED.some((candidate) => candidate.name === dependency)) continue;
    const source = join(directory, "node_modules", ...dependency.split("/"));
    if (!existsSync(source)) throw new Error(`${name} depends on ${dependency}, which ${directory} has not installed: run \`pnpm install\``);
    const target = realpathSync(source);
    const link = join(installed, ...dependency.split("/"));
    if (existsSync(link)) {
      if (realpathSync(link) !== target) throw new Error(`${dependency} resolves to two installs: ${realpathSync(link)} and ${target}`);
      continue;
    }
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(target, link, "dir");
  }
}

/**
 * The direction page: `fixture/direction/` built by Vite at `browserFloor` into `direction/`. The sources
 * are copied into the fixture first, so every bare specifier resolves from the fixture's own
 * `node_modules/` — the packed tarballs — and never from the workspace. The bundle goes under `dist/`,
 * which every tool in this repository already treats as build output.
 */
async function buildDirectionPage(): Promise<void> {
  const { build } = await import("vite");
  const source = join(fixtureRoot, "direction-src");
  cpSync(join(fixtureSource, "direction"), source, { recursive: true });
  try {
    await build({
      configFile: false,
      root: source,
      base: "./",
      logLevel: "warn",
      publicDir: false,
      cacheDir: join(fixtureRoot, "node_modules", ".vite"),
      // No PostCSS config is looked up above the fixture: the build is a consumer's, not this repository's.
      css: { postcss: {} },
      oxc: { jsx: { runtime: "automatic" } },
      build: {
        outDir: join(fixtureRoot, "direction"),
        emptyOutDir: true,
        assetsDir: "dist",
        target: [...browserFloor],
        cssTarget: [...browserFloor],
      },
    });
  } finally {
    rmSync(source, { recursive: true, force: true });
  }
}

export async function buildFixture(): Promise<string> {
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
  for (const { name, directory } of PACKED) linkDependencies(name, directory);

  // Resolution starts at the fixture root, so every specifier goes through the packed package's
  // `exports` field — the same resolution a consumer's bundler performs.
  const resolveSubpath = createRequire(join(fixtureRoot, "index.html")).resolve;
  const page = readFileSync(join(fixtureSource, "index.html"), "utf8").replaceAll(SUBPATH, (_marker, specifier: string) => {
    const file = resolveSubpath(specifier);
    if (!file.startsWith(fixtureRoot + sep)) throw new Error(`${specifier} resolved outside the fixture, to ${file}`);
    return `./${relative(fixtureRoot, file).split(sep).join("/")}`;
  });
  writeFileSync(join(fixtureRoot, "index.html"), page);

  await buildDirectionPage();
  return fixtureRoot;
}

if (import.meta.main) {
  console.log(`vrt: built the runtime-contract fixture in ${await buildFixture()}`);
}
