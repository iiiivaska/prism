/*
  The smoke check of the built Vite consumer (roadmap P3-6): does the build actually apply Prism, or
  did it only compile?

  It serves `dist/` over HTTP — a file:// page cannot load a font — opens it in Chromium and asks the
  page three questions that a broken package would answer differently:

    1. the tokens applied: a `--ds-*` variable has a value, and the paint that came out of it is the
       colour that variable holds, not a browser default;
    2. the bundled font loaded: the brand's own face is ready, and the file it came from was served
       from this origin, never from the network (ADR-0021 §11);
    3. the runtime switched the scheme: pressing the app's own Button flips `<Theme>`'s colour scheme,
       `<html>` gets the attribute the published runtime spells, and the page repaints to the other
       scheme's token (ADR-0019 §4).

  Everything the page reports comes from `window.prismFixture.probe()` in `src/main.jsx`, so this file
  holds no browser code and no token value of its own.

  Two things about question 3 are easy to get wrong, and both are handled in `src/main.jsx`:
  `<Surface>` crossfades its colours, so the probe waits for `window.prismFixture.settled()` before
  reading the new scheme — the frame the attribute flips on still holds the old colour; and a colour
  is compared as the bytes it paints, never as the string Chromium serializes it to, because one
  colour has several spellings and a string comparison reads a re-serialization as a repaint.

    node smoke.mjs [--dist <dir>] [--port <n>]
*/
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import process from "node:process";
import { URL } from "node:url";
import { chromium } from "playwright";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

function parseArgs(argv) {
  let dist = resolve("dist");
  let port = 0;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dist") dist = resolve(argv[++i]);
    else if (argv[i] === "--port") port = Number(argv[++i]);
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return { dist, port };
}

function serve(root, port) {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, "http://localhost").pathname));
    const file = join(root, path === "/" ? "index.html" : path);
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end("not found");
      return;
    }
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  });
  return new Promise((done) => {
    server.listen(port, "127.0.0.1", () => done({ server, port: server.address().port }));
  });
}

/** A `rgb(...)` / `oklch(...)` paint that is neither transparent nor unset. */
function isPainted(color) {
  return typeof color === "string" && color !== "" && color !== "rgba(0, 0, 0, 0)" && color !== "transparent";
}

/**
 * Two colours are the same colour, compared as the sRGB bytes they paint — `probe().colors` holds
 * those, painted on a 1x1 canvas in the page. Never compare the strings: Chromium serializes a
 * colour in whatever space it was written or interpolated in, so `oklch(0.9612 0.0041 271.4)` and
 * `oklab(0.9612 0.000100172 -0.00409878)` are one colour spelled two ways, and a string comparison
 * reads that pair as a change that never happened.
 */
function sameColor(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((channel, i) => channel === b[i]);
}

const failures = [];
function check(name, ok, detail) {
  if (ok) process.stdout.write(`  pass  ${name}${detail === undefined ? "" : ` — ${detail}`}\n`);
  else {
    failures.push(name);
    process.stdout.write(`  FAIL  ${name}${detail === undefined ? "" : ` — ${detail}`}\n`);
  }
}

const { dist, port: requested } = parseArgs(process.argv.slice(2));
if (!existsSync(join(dist, "index.html"))) throw new Error(`${dist} holds no index.html: run \`vite build\` first`);

const { server, port } = await serve(dist, requested);
const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

try {
  const origin = `http://127.0.0.1:${port}/`;
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.evaluate("document.fonts.ready");
  const light = await page.evaluate("window.prismFixture.probe()");

  process.stdout.write("the app rendered\n");
  check("the page has no console error", consoleErrors.length === 0, consoleErrors.join(" | ") || "none");
  check("the components rendered", (light.cardText ?? "").includes("Line output"), light.cardText);
  check("the tokens package's version reached the app", /^\d+\.\d+\.\d+$/.test(light.tokensVersion), light.tokensVersion);

  process.stdout.write("1. the tokens applied\n");
  check("--ds-color-bg-surface has a value", light.bgSurfaceToken !== "", light.bgSurfaceToken);
  check("the Surface painted a token colour, not a browser default", isPainted(light.surfaceBackground), light.surfaceBackground);
  check(
    "the Surface's own background is --ds-color-bg-page, the token its material sits on",
    sameColor(light.colors.surfaceBackground, light.colors.bgPageToken),
    `${light.surfaceBackground} vs ${light.bgPageToken}`,
  );
  check(
    "the page painted --ds-color-bg-page",
    isPainted(light.pageBackground) && sameColor(light.colors.pageBackground, light.colors.bgPageToken),
    `${light.pageBackground} vs ${light.bgPageToken}`,
  );
  check("--ds-font-ui reached the body", light.fontFamily !== "" && !light.fontFamily.startsWith("-apple-system"), light.fontFamily);
  check("the Button has a token height", (light.buttonHeight ?? 0) > 0, `${light.buttonHeight}px`);

  process.stdout.write("2. the bundled font loaded from the package\n");
  check("the brand face is ready", light.fontLoaded === true, light.fontFamily);
  check("at least one .woff2 was served", light.fontFiles.length > 0, `${light.fontFiles.length} file(s)`);
  check(
    "every font file came from this origin, not the network",
    light.fontFiles.every((name) => name.startsWith(origin)),
    light.fontFiles.map((name) => name.replace(origin, "")).join(", "),
  );

  process.stdout.write("3. the runtime switched the scheme\n");
  check("the light root carries the app's choice", light.schemeAttribute === "light", String(light.schemeAttribute));
  check("readContext() agrees", light.context.colorScheme === "light", JSON.stringify(light.context));
  await page.getByRole("button", { name: "Switch to dark" }).click();
  await page.waitForFunction("document.documentElement.getAttribute('data-ds-color-scheme') === 'dark'");
  // The attribute flips a frame before the colours arrive. Reading the probe here would read the
  // scheme that is leaving, halfway through `<Surface>`'s crossfade.
  const crossfade = await page.evaluate("window.prismFixture.settled()");
  const dark = await page.evaluate("window.prismFixture.probe()");
  check("the crossfade finished", crossfade.settled === true, `settled after ${crossfade.frames} frame(s)`);
  check("the root attribute flipped", dark.schemeAttribute === "dark", String(dark.schemeAttribute));
  check("readContext() followed", dark.context.colorScheme === "dark", JSON.stringify(dark.context));
  check(
    "--ds-color-bg-surface resolves to the other scheme's value",
    !sameColor(dark.colors.bgSurfaceToken, light.colors.bgSurfaceToken),
    `${light.bgSurfaceToken} → ${dark.bgSurfaceToken}`,
  );
  check(
    "the Surface repainted",
    !sameColor(dark.colors.surfaceBackground, light.colors.surfaceBackground),
    `${light.surfaceBackground} → ${dark.surfaceBackground}`,
  );
  check(
    "it repainted to the dark scheme's own --ds-color-bg-page",
    sameColor(dark.colors.surfaceBackground, dark.colors.bgPageToken),
    `${dark.surfaceBackground} vs ${dark.bgPageToken}`,
  );
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  process.stdout.write(`smoke: ${failures.length} failed check(s): ${failures.join(", ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("smoke: the packed packages applied\n");
}
