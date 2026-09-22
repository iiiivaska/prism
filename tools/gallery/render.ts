// gallery/index.html and gallery/index.json: one page, both stacks, every example (ADR-0005, P3-5).
//
// Both files are pure functions of the specs and of the file names under the two baseline roots, so they
// regenerate byte-identically until a name, an example or an image's geometry changes, and
// `gallery:build --check` fails on a stale copy the way `parity:report --check` does. Nothing here
// records a pixel count or a byte size: re-recording the same matrix must not churn a committed file.
//
// **Framing.** The two stacks do not frame their renders alike, and the page never pretends otherwise:
// an Apple snapshot is tight to the component, a web screenshot carries the story's ground. Every image
// is therefore shown at its own size — one image pixel per CSS pixel — under a caption that states that
// size and the framing its column was captured with, so a difference in the picture's extent reads as
// what it is instead of as a difference in the component. "Fit to column" scales the images down for
// scanning; the caption keeps saying the real size.
import { posix } from 'node:path';
import type { SourceReader } from '../tokens/api.ts';
import { PLATFORM_LABELS, type Platform } from '../parity/config.ts';
import {
  APPLE_PROVENANCE, GALLERY_DIR, INDEX_HTML, NAME_TEMPLATE, PARITY_REPORT, SOURCES, WORKFLOW,
  type Density, type Scheme, type Variant,
} from './config.ts';
import type { Cell, CellState, Component, Gallery } from './collect.ts';

/** How a column's images were framed, and what recorded them: the page's honesty line. */
export interface SourceFacts {
  readonly platforms: readonly Platform[];
  readonly root: string;
  readonly harness: string;
  readonly framing: string;
  readonly frameTag: string;
  readonly note: string;
  /** What recorded this set, read from the repository: the Apple stamp, the pinned Playwright image. */
  readonly recordedBy: string;
}

/** Repository-relative path → a link that works from `gallery/index.html`. */
function up(path: string): string {
  return `../${path}`;
}

const ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escape(text: string): string {
  return text.replace(/[&<>"']/gu, (character) => ESCAPES[character] ?? character);
}

/** The Apple stamp beside the baselines, and the Playwright image the web set is recorded in. */
export function sourceFacts(reader: SourceReader): readonly SourceFacts[] {
  return SOURCES.map((source) => ({ ...source, recordedBy: recordedBy(reader, source.root) }));
}

function recordedBy(reader: SourceReader, root: string): string {
  if (root.startsWith('swift/')) {
    if (!reader.exists(APPLE_PROVENANCE)) return 'no provenance.json beside the baselines';
    try {
      const stamp = JSON.parse(reader.readText(APPLE_PROVENANCE)) as Record<string, string>;
      const device = [stamp['device'], stamp['os'] === undefined ? null : `iOS ${stamp['os']}`].filter((part) => part != null).join(', ');
      const tools = [stamp['xcode'] === undefined ? null : `Xcode build ${stamp['xcode']}`, stamp['sdk']].filter((part) => part != null).join(', ');
      return [device, tools].filter((part) => part !== '').join(' · ');
    } catch {
      return 'provenance.json does not parse';
    }
  }
  // The container the Linux baselines are renders of, read from the workflow so the page cannot claim a
  // version CI does not run.
  const image = reader.exists(WORKFLOW) ? /image:\s*(mcr\.microsoft\.com\/playwright:\S+)/u.exec(reader.readText(WORKFLOW))?.[1] : undefined;
  return image === undefined ? `the Playwright image pinned in ${WORKFLOW}` : image;
}

// ---------------------------------------------------------------------------- JSON

/**
 * One cell's image, as compactly as it can still be read back: the file name, which is the whole key
 * (the component is the enclosing object and each platform's root is in `sources`), and the pixel size,
 * which is the only thing about the bytes the index claims.
 */
function stateJson(state: CellState): unknown {
  if (state.kind !== 'present') return { state: state.kind };
  const { image } = state;
  return { state: 'present', file: posix.basename(image.href), width: image.width, height: image.height };
}

function cellJson(cell: Cell, platforms: readonly Platform[]): unknown {
  return {
    scheme: cell.scheme,
    density: cell.density,
    variant: cell.variant,
    platforms: Object.fromEntries(platforms.map((platform) => [platform, stateJson(cell.platforms.get(platform) ?? { kind: 'not-recorded' })])),
  };
}

export function renderJson(gallery: Gallery, sources: readonly SourceFacts[]): string {
  const value = {
    generator: 'pnpm gallery:build (tools/gallery)',
    name: { template: NAME_TEMPLATE, platforms: gallery.platforms, unrecorded: gallery.unrecorded },
    parityReport: PARITY_REPORT,
    sources: sources.map((source) => ({
      platforms: source.platforms, root: source.root, harness: source.harness,
      framing: source.framing, frameTag: source.frameTag, note: source.note, recordedBy: source.recordedBy,
    })),
    counts: gallery.counts,
    components: gallery.components.map((component) => ({
      name: component.name,
      spec: component.file,
      layer: component.layer,
      specVersion: component.specVersion,
      support: Object.fromEntries([...component.support]),
      recorded: component.recorded,
      counts: component.counts,
      examples: component.examples.map((example) => ({
        id: example.id,
        schemes: example.schemes,
        props: example.props,
        cells: example.cells.map((cell) => cellJson(cell, gallery.platforms)),
      })),
    })),
    patterns: gallery.patterns,
    diagnostics: gallery.diagnostics,
  };
  return `${JSON.stringify(value, null, 2)}\n`;
}

// ---------------------------------------------------------------------------- HTML

const STATE_TEXT: Readonly<Record<Exclude<CellState['kind'], 'present'>, string>> = {
  missing: 'missing',
  'not-recorded': 'not recorded here',
  'out-of-matrix': 'not in this matrix',
};

const STATE_TITLE: Readonly<Record<Exclude<CellState['kind'], 'present'>, string>> = {
  missing: 'This platform records this component and this state, but not this cell: a gap in the pair.',
  'not-recorded': 'This platform has no snapshot of this component at all. The parity report says how far its implementation is.',
  'out-of-matrix': 'This platform’s snapshot matrix has no image with this forced state anywhere, so there is nothing to compare here.',
};

function variantText(variant: Variant | null): string {
  return variant === null ? 'standard' : variant.replace(/-/gu, ' ');
}

function cellLabel(scheme: Scheme, density: Density, variant: Variant | null): string {
  return [scheme, density, variantText(variant)].join(' · ');
}

function figure(platform: Platform, state: CellState, framing: ReadonlyMap<Platform, SourceFacts>): string {
  const label = escape(PLATFORM_LABELS[platform]);
  if (state.kind !== 'present') {
    return `<div class="shot gap ${state.kind}"><p class="plat">${label}</p><p class="none" title="${escape(STATE_TITLE[state.kind])}">${STATE_TEXT[state.kind]}</p></div>`;
  }
  const { image } = state;
  const source = framing.get(platform);
  // The framing rides under every image, not only in the table: two images of different extents sit
  // side by side here, and the reason must be readable without scrolling back up.
  const tag = source === undefined ? '' : ` · <span title="${escape(source.framing)}">${escape(source.frameTag)}</span>`;
  return [
    '<figure class="shot">',
    `<p class="plat">${label}</p>`,
    `<img src="${escape(image.href)}" width="${image.width}" height="${image.height}" alt="${label} render" loading="lazy" decoding="async">`,
    `<figcaption>${image.width}×${image.height} px${tag} · <a href="${escape(up(image.source))}">source</a></figcaption>`,
    '</figure>',
  ].join('');
}

function cellRow(cell: Cell, platforms: readonly Platform[], framing: ReadonlyMap<Platform, SourceFacts>): string {
  const gaps = platforms.filter((platform) => cell.platforms.get(platform)?.kind === 'missing').length;
  return [
    `<div class="cell" data-scheme="${cell.scheme}" data-density="${cell.density}" data-variant="${cell.variant ?? 'standard'}" data-gap="${gaps > 0 ? 'yes' : 'no'}">`,
    `<p class="axis">${escape(cellLabel(cell.scheme, cell.density, cell.variant))}${gaps > 0 ? ' <span class="flag">missing pair</span>' : ''}</p>`,
    '<div class="shots">',
    ...platforms.map((platform) => figure(platform, cell.platforms.get(platform) ?? { kind: 'not-recorded' }, framing)),
    '</div></div>',
  ].join('');
}

function componentSection(component: Component, gallery: Gallery, framing: ReadonlyMap<Platform, SourceFacts>): string {
  const support = gallery.platforms.map((platform) => `${PLATFORM_LABELS[platform]} ${component.support.get(platform) ?? 'none'}`).join(' · ');
  const head = [
    `<section class="component" id="${escape(component.name)}">`,
    `<h2>${escape(component.name)}<a class="self" href="#${escape(component.name)}" aria-label="link to ${escape(component.name)}">#</a></h2>`,
    '<p class="meta">',
    `<a href="${escape(up(component.file))}">spec v${component.specVersion}</a> · ${escape(component.layer)} · `,
    `<a href="${escape(up(PARITY_REPORT))}">parity report</a> · ${escape(support)}`,
    '</p>',
  ];
  if (component.examples.length === 0) {
    return `${head.join('')}<p class="empty">This spec declares no examples.</p></section>`;
  }
  if (component.recorded.length === 0) {
    return [
      ...head,
      `<p class="empty">No stack has recorded this component yet: ${component.examples.length} example(s) waiting for a snapshot on both sides. `,
      `The <a href="${escape(up(PARITY_REPORT))}">parity report</a> says how far each platform's implementation is.</p></section>`,
    ].join('');
  }
  return [
    ...head,
    `<p class="meta">${component.counts.images} image(s), ${component.counts.paired} of ${component.counts.cells} cell(s) complete`,
    component.counts.missing > 0 ? `, <strong>${component.counts.missing} missing</strong>` : '',
    '</p>',
    ...component.examples.map((example) => [
      `<article class="example" id="${escape(`${component.name}--${example.id}`)}">`,
      `<h3>${escape(example.id)}<a class="self" href="#${escape(`${component.name}--${example.id}`)}" aria-label="link to ${escape(example.id)}">#</a></h3>`,
      example.props === '' ? '' : `<p class="props">${escape(example.props)}</p>`,
      example.schemes.length === 1 ? `<p class="props">${escape(example.schemes[0] ?? '')} only, as the spec declares</p>` : '',
      ...example.cells.map((cell) => cellRow(cell, gallery.platforms, framing)),
      '</article>',
    ].join('')),
    '</section>',
  ].join('');
}

function sourcesTable(sources: readonly SourceFacts[], gallery: Gallery): string {
  const rows = sources.map((source) => [
    '<tr>',
    `<td>${source.platforms.map((platform) => (gallery.platforms.includes(platform)
      ? `<code>${escape(platform)}</code>`
      : `<code class="dim">${escape(platform)}</code>`)).join(', ')}${source.platforms.every((platform) => gallery.platforms.includes(platform))
      ? ''
      : '<br><span class="dim">dimmed: this root may hold that key, nothing records it yet</span>'}</td>`,
    `<td><a href="${escape(up(source.root))}">${escape(source.root)}</a><br><span class="dim">${escape(source.harness)}</span></td>`,
    `<td>${escape(source.framing)}<br><span class="dim">${escape(source.note)}</span></td>`,
    `<td>${escape(source.recordedBy)}</td>`,
    '</tr>',
  ].join(''));
  return [
    '<table class="sources"><thead><tr><th>Platform key</th><th>Where the images live</th><th>How they are framed</th><th>What recorded them</th></tr></thead><tbody>',
    ...rows,
    '</tbody></table>',
  ].join('');
}

const STYLE = `
:root { color-scheme: light dark; --bg: #fbfbfd; --fg: #1d1d21; --dim: #6b6b76; --line: #e2e2e8; --card: #ffffff; --flag: #8c2f1e; --flagbg: #fdeeea; }
@media (prefers-color-scheme: dark) { :root { --bg: #131316; --fg: #ececf1; --dim: #9a9aa6; --line: #2b2b31; --card: #1b1b20; --flag: #ff9c85; --flagbg: #33201c; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
main, header { max-width: 1600px; margin: 0 auto; padding: 0 24px; }
header { padding-top: 32px; }
h1 { font-size: 28px; margin: 0 0 4px; }
h2 { font-size: 22px; margin: 0 0 4px; }
h3 { font-size: 16px; margin: 0 0 2px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; }
a { color: inherit; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.92em; }
.lede { max-width: 90ch; color: var(--dim); }
.lede strong { color: var(--fg); }
.self { opacity: 0; margin-left: 8px; text-decoration: none; color: var(--dim); font-weight: 400; }
h2:hover .self, h3:hover .self { opacity: 1; }
table.sources { border-collapse: collapse; width: 100%; margin: 12px 0 8px; font-size: 13px; }
table.sources th, table.sources td { border: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
table.sources th { background: var(--card); font-weight: 600; }
.dim { color: var(--dim); }
.toolbar { position: sticky; top: 0; z-index: 5; background: var(--bg); border-bottom: 1px solid var(--line); padding: 10px 24px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 13px; }
.toolbar label { color: var(--dim); }
.toolbar select, .toolbar input { font: inherit; }
nav.index { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 13px; padding: 0 0 20px; }
nav.index a { text-decoration: none; border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px; background: var(--card); }
nav.index a.none { color: var(--dim); }
section.component { border-top: 1px solid var(--line); padding: 24px 0 8px; }
.meta, .props { color: var(--dim); font-size: 13px; margin: 0 0 8px; }
.props { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.empty { color: var(--dim); font-size: 14px; }
article.example { padding: 12px 0 4px; }
.cell { padding: 8px 0 14px; }
.axis { margin: 0 0 6px; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--dim); }
.flag { color: var(--flag); background: var(--flagbg); border-radius: 4px; padding: 1px 6px; letter-spacing: 0; text-transform: none; }
.shots { display: flex; gap: 16px; align-items: flex-start; overflow-x: auto; padding-bottom: 4px; }
.shot { margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 8px; flex: 0 0 auto; }
.shot img { display: block; max-width: none; }
.shot.gap { min-width: 180px; }
.plat { margin: 0 0 6px; font-size: 12px; font-weight: 600; }
figcaption { margin-top: 6px; font-size: 11px; color: var(--dim); }
.none { color: var(--dim); font-size: 12px; margin: 0; }
.shot.missing .none { color: var(--flag); font-weight: 600; }
body[data-fit="on"] .shots { display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); overflow-x: visible; }
body[data-fit="on"] .shot img { max-width: 100%; height: auto; }
body[data-scheme="light"] .cell[data-scheme="dark"], body[data-scheme="dark"] .cell[data-scheme="light"] { display: none; }
body[data-density="regular"] .cell[data-density="compact"], body[data-density="compact"] .cell[data-density="regular"] { display: none; }
body[data-variants="off"] .cell:not([data-variant="standard"]) { display: none; }
body[data-gaps="on"] .cell[data-gap="no"] { display: none; }
footer { color: var(--dim); font-size: 13px; padding: 24px; text-align: center; }
`;

const SCRIPT = `
const body = document.body;
for (const control of document.querySelectorAll('[data-controls]')) {
  const key = control.getAttribute('data-controls');
  const apply = () => { body.dataset[key] = control.type === 'checkbox' ? (control.checked ? 'on' : 'off') : control.value; };
  control.addEventListener('change', apply);
  apply();
}
`;

export function renderHtml(gallery: Gallery, sources: readonly SourceFacts[]): string {
  const withImages = gallery.components.filter((component) => component.recorded.length > 0);
  const waiting = gallery.components.filter((component) => component.recorded.length === 0);
  const columns = gallery.platforms.map((platform) => PLATFORM_LABELS[platform]).join(', ');
  const framing = new Map(sources.flatMap((source) => source.platforms.map((platform) => [platform, source] as const)));

  const out: string[] = [
    '<!doctype html>',
    '<html lang="en"><head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Prism gallery</title>',
    `<style>${STYLE}</style>`,
    '</head>',
    `<body data-scheme="all" data-density="all" data-variants="on" data-gaps="off" data-fit="off" style="--columns: ${gallery.platforms.length}">`,
    '<header>',
    '<h1>Prism gallery</h1>',
    `<p class="lede">Every spec example, both stacks side by side, per scheme and density — the living visual canon of <strong>ADR-0005</strong>. Generated by <code>pnpm gallery:build</code> from the snapshots each harness already compares against; it renders nothing of its own. A pair is found by name alone: <code>${escape(NAME_TEMPLATE)}</code>.</p>`,
    `<p class="lede"><strong>The two stacks frame their renders differently, and this page does not hide it.</strong> Every image is shown at its own size, one image pixel per CSS pixel, with that size under it — so a picture that is wider is wider, not scaled. Read the framing column below before reading a difference as drift.</p>`,
    sourcesTable(sources, gallery),
    `<p class="lede">Columns: ${escape(columns)}.`,
    gallery.unrecorded.length === 0 ? '' : ` No image carries ${gallery.unrecorded.map((platform) => `<code>${escape(platform)}</code>`).join(', ')} yet, so those platform keys have no column; a set recorded for one lands beside its pair with no rename.`,
    ` <a href="${escape(up(PARITY_REPORT))}">The parity report</a> links each spec row to its section here.</p>`,
    `<p class="lede">${gallery.counts.images} image(s) over ${gallery.counts.cells} cell(s): ${gallery.counts.paired} complete, <strong>${gallery.counts.missing} missing</strong>. ${withImages.length} of ${gallery.components.length} component spec(s) have snapshots; ${gallery.patterns.length} pattern spec(s) have none by design (ADR-0012 rule 3).</p>`,
    '</header>',
    '<div class="toolbar">',
    '<label>scheme <select data-controls="scheme"><option value="all">both</option><option value="light">light</option><option value="dark">dark</option></select></label>',
    '<label>density <select data-controls="density"><option value="all">both</option><option value="regular">regular</option><option value="compact">compact</option></select></label>',
    '<label><input type="checkbox" data-controls="variants" checked> forced states</label>',
    '<label><input type="checkbox" data-controls="gaps"> only missing pairs</label>',
    '<label><input type="checkbox" data-controls="fit"> fit to column</label>',
    '</div>',
    '<main>',
    '<nav class="index">',
    ...gallery.components.map((component) =>
      `<a class="${component.recorded.length === 0 ? 'none' : ''}" href="#${escape(component.name)}">${escape(component.name)}${component.counts.missing > 0 ? ' ●' : ''}</a>`),
    '</nav>',
  ];

  if (gallery.diagnostics.length > 0) {
    out.push('<section class="component"><h2>Problems</h2><p class="meta">The pairs below are incomplete until these are fixed.</p><ul class="meta">');
    for (const diagnostic of gallery.diagnostics) out.push(`<li><code>${escape(diagnostic.code)}</code> ${escape(diagnostic.message)} — <code>${escape(diagnostic.file ?? '')}</code></li>`);
    out.push('</ul></section>');
  }

  out.push(...withImages.map((component) => componentSection(component, gallery, framing)));

  if (waiting.length > 0) {
    out.push(
      '<section class="component" id="waiting">',
      '<h2>Waiting for a first snapshot</h2>',
      `<p class="meta">${waiting.length} component spec(s) no stack has recorded yet. They are listed so a reader sees the whole contract and not only the implemented part, and each one carries its own anchor, so a link from the <a href="${escape(up(PARITY_REPORT))}">parity report</a> lands here rather than nowhere.</p>`,
      '<nav class="index">',
      // The link is the anchor: one element per component, so `#<Name>` resolves for every spec.
      ...waiting.map((component) => `<a class="none" id="${escape(component.name)}" href="${escape(up(component.file))}">${escape(component.name)}</a>`),
      '</nav>',
      '</section>',
    );
  }

  out.push(
    '</main>',
    `<footer>Regenerate with <code>pnpm gallery:build</code>; <code>${escape(INDEX_HTML)}</code> and <code>${escape(GALLERY_DIR)}/index.json</code> are committed and CI fails when they are stale. See <code>${escape(GALLERY_DIR)}/README.md</code>.</footer>`,
    `<script>${SCRIPT}</script>`,
    '</body></html>',
    '',
  );
  return out.join('\n');
}

/** The one line the CLI prints and the page repeats, so a run and its files never disagree. */
export function summaryLine(gallery: Gallery): string {
  const recorded = gallery.components.filter((component) => component.recorded.length > 0).length;
  return `${gallery.counts.images} image(s), ${recorded} of ${gallery.components.length} component(s) recorded, ${gallery.counts.paired}/${gallery.counts.cells} cell(s) complete, ${gallery.counts.missing} missing, ${gallery.diagnostics.length} diagnostic(s)`;
}
