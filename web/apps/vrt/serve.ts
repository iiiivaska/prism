/// <reference types="node" />
/**
 * The static file server behind Playwright's `webServer`. No dependency: Node 24 runs it from source.
 * It serves files only, never directory listings, and answers 404 outside the roots it mounts.
 *
 *   /                    web/apps/gallery/storybook-static (the stories the screenshots come from)
 *   /runtime-contract/   the packed-consumer fixture of fixture/build.ts, which this server builds
 *                        at startup so the runtime-contract spec needs no separate step
 *
 *   node serve.ts [port]   default 6007
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { buildFixture, fixturePath, fixtureRoot } from "./fixture/build.ts";

export const storybookStatic = resolve(import.meta.dirname, "..", "gallery", "storybook-static");

const TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/** Longest prefix first, so `/runtime-contract/` wins over `/`. */
function mounts(): readonly { readonly prefix: string; readonly root: string }[] {
  return [
    { prefix: fixturePath, root: fixtureRoot },
    { prefix: "/", root: storybookStatic },
  ];
}

/** The file a request path maps to, or null when it leaves every mounted root. */
function fileFor(pathname: string): string | null {
  for (const { prefix, root } of mounts()) {
    if (!pathname.startsWith(prefix)) continue;
    const rest = pathname.slice(prefix.length);
    const file = normalize(join(root, rest === "" ? "index.html" : rest));
    if (!file.startsWith(root + sep)) return null;
    return existsSync(file) && statSync(file).isFile() ? file : null;
  }
  return null;
}

function serve(port: number): void {
  if (!existsSync(join(storybookStatic, "index.json"))) {
    console.error(`vrt: ${storybookStatic} has no index.json; run \`pnpm --filter @iiiivaska/prism-gallery build\` first`);
    process.exit(2);
  }
  console.log(`vrt: built the runtime-contract fixture in ${buildFixture()}`);
  createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    // `/runtime-contract` without the slash would resolve its relative URLs against `/`.
    if (`${pathname}/` === fixturePath) {
      response.writeHead(308, { location: fixturePath }).end();
      return;
    }
    const file = fileFor(pathname);
    if (file === null) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    createReadStream(file).pipe(response);
  }).listen(port, "127.0.0.1", () => {
    console.log(`vrt: serving storybook-static on http://127.0.0.1:${port}`);
  });
}

if (import.meta.main) serve(Number(process.argv[2] ?? "6007"));
