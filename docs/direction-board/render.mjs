// Renders the direction board (index.html beside this file) with Playwright Chromium at 1600 CSS px
// wide, full page, once under prefers-color-scheme: light and once under dark, into renders/:
//   board-light.png, board-dark.png                 the whole board
//   screen-<name>-<scheme>.png                      each device frame, taken from the light pass
// The run fails (exit 1, and no PNG for that scheme) when any @font-face on the page is not
// "loaded" after document.fonts.ready, when any glyph renders in a font other than the two bundled
// faces, when the page requests anything but file: or data: URLs, or when the page throws or logs
// an error.
//
// The glyph check asks Chromium which fonts drew each element that owns text
// (CSS.getPlatformFontsForNode). document.fonts.check() cannot answer that: it is true for any
// loaded face that has no unicode-range, whether or not the face holds the glyphs.
//
// Playwright 1.63.0 is not a repository dependency. Resolve it from PW_MODULE (an absolute path to
// playwright's index.mjs) or from normal module resolution; README.md shows both.
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PW_MODULE ?? "playwright");
const dir = dirname(fileURLToPath(import.meta.url));
const out = join(dir, "renders");
mkdirSync(out, { recursive: true });

const SCREENS = [
  ["live-ride-light", "#ph-light", ".phone"],
  ["live-ride-dark", "#ph-dark", ".phone"],
  ["live-ride-fallback-light", "#ph-fallback", ".phone"],
  ["ride-report-dark", "#dk-dark", ".desk-frame"],
  ["ride-report-light", "#dk-light", ".desk-frame"],
  ["glance-dark", "#w-dark", ".watch"],
  ["glance-light", "#w-light", ".watch"],
];
const BUNDLED = new Set(["Onest", "JetBrains Mono"]);

// Which fonts drew the page's text: every element that owns a non-blank text node, one CDP call each.
async function glyphFonts(context, page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  await page.evaluate(() => {
    let i = 0;
    for (const el of document.querySelectorAll("body *"))
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) el.setAttribute("data-glyph-probe", String(i++));
  });
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "[data-glyph-probe]" });
  const stray = [];
  let cyrillic = 0;
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    const { node } = await cdp.send("DOM.describeNode", { nodeId, depth: 1 });
    const text = (node.children || []).filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join("").trim();
    const other = fonts.filter((f) => !(f.isCustomFont && BUNDLED.has(f.familyName)));
    if (other.length) stray.push(`<${node.localName}> "${text.slice(0, 60)}": ${other.map((f) => `${f.familyName} × ${f.glyphCount}`).join(", ")}`);
    else if (/[Ѐ-ӿ]/.test(text)) cyrillic++;
  }
  await page.evaluate(() => document.querySelectorAll("[data-glyph-probe]").forEach((e) => e.removeAttribute("data-glyph-probe")));
  await cdp.detach();
  return { elements: nodeIds.length, cyrillic, stray };
}

const browser = await chromium.launch();
let failed = false;
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1, colorScheme: scheme });
  const page = await context.newPage();
  const foreign = [];
  const errors = [];
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith("file:") && !u.startsWith("data:")) foreign.push(u);
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));
  await page.goto(pathToFileURL(join(dir, "index.html")).href, { waitUntil: "load" });
  const report = await page.evaluate(async () => {
    await document.fonts.ready;
    await window.__boardReady;
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 400));
    return {
      faces: [...document.fonts].map((f) => ({ family: f.family.replace(/["']/g, ""), weight: f.weight, status: f.status })),
      height: document.documentElement.scrollHeight,
      root: getComputedStyle(document.documentElement).colorScheme,
    };
  });
  // Take the page's own requests and errors now. Enabling the CDP CSS agent for the glyph check makes
  // the inspector fetch index.html again for the inline stylesheet's source, which a file: page
  // refuses; that refusal is the probe's, not the page's.
  const pageForeign = [...foreign];
  const pageErrors = [...errors];
  const glyphs = await glyphFonts(context, page);
  console.log(`[${scheme}] page ${report.height}px, root color-scheme ${report.root}`);
  console.log(`[${scheme}] faces: ${report.faces.map((f) => `${f.family} ${f.weight} ${f.status}`).join("; ")}`);
  console.log(`[${scheme}] glyphs: ${glyphs.elements} text elements, ${glyphs.stray.length} with a font outside Onest and JetBrains Mono; ${glyphs.cyrillic} Cyrillic elements in the bundled faces`);
  const unloaded = report.faces.length < 2 || report.faces.some((f) => f.status !== "loaded");
  if (unloaded) console.error(`[${scheme}] FAIL: a @font-face did not load`);
  if (glyphs.stray.length) console.error(`[${scheme}] FAIL: glyphs from a fallback font:\n  ${glyphs.stray.join("\n  ")}`);
  if (pageForeign.length) console.error(`[${scheme}] FAIL: requests outside the folder: ${pageForeign.join(" ")}`);
  if (pageErrors.length) console.error(`[${scheme}] FAIL: page errors:\n  ${pageErrors.join("\n  ")}`);
  if (unloaded || glyphs.stray.length || pageForeign.length || pageErrors.length) {
    failed = true;
    await context.close();
    continue;
  }
  await page.screenshot({ path: join(out, `board-${scheme}.png`), fullPage: true });
  if (scheme === "light") {
    for (const [name, screen, frame] of SCREENS) {
      await page.locator(screen).locator(`xpath=ancestor-or-self::*[contains(concat(" ", normalize-space(@class), " "), " ${frame.slice(1)} ")][1]`).screenshot({ path: join(out, `screen-${name}.png`) });
    }
  }
  await context.close();
}
await browser.close();
process.exitCode = failed ? 1 : 0;
