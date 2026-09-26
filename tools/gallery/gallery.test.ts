// gallery:build (roadmap P3-5; ADR-0005 decision 1, ADR-0006 rule 4, critic C-25): the repository's
// pairs are complete and its committed index is up to date; the one name rule is what both harnesses
// write and the only thing that pairs an image; and every state a cell can be in — a real gap, a
// component nobody has recorded, a forced state the other matrix does not have — is told apart.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fsReader, memoryReader, REPO_ROOT, type SourceReader } from '../tokens/api.ts';
import { PLATFORMS } from '../parity/config.ts';
import { runParity } from '../parity/report.ts';
import { collect, type Gallery } from './collect.ts';
import { INDEX_HTML, INDEX_JSON, PLATFORM_ORDER, SOURCES } from './config.ts';
import { buildGallery, main, parseArgs } from './build.ts';
import { memoryImages, pngSize, type PixelSize } from './images.ts';
import { cellKey, formatName, isParsed, parseName } from './name.ts';

const APPLE = SOURCES[0]?.root ?? '';
const WEB = SOURCES[1]?.root ?? '';

/** A one-component tree: two examples, one of them light only. */
const SPEC = `name: Sample
layer: primitive
specVersion: 1
platforms:
  ios: full
  ipados: full
  macos: full
  watchos: none
  web-touch: full
  web-desktop: full
examples:
  - id: basic
    props: { variant: primary }
  - id: light-only
    props: { variant: tinted }
    schemes: [light]
`;

/** A second component, so a test can record one component on a platform and not the other. */
const OTHER = SPEC.replace('name: Sample', 'name: Other').split('  - id: light-only')[0] ?? '';

function tree(): SourceReader {
  return memoryReader({ 'spec/components/Sample.yaml': SPEC, 'spec/components/Other.yaml': OTHER });
}

const SIZE: PixelSize = { width: 100, height: 40 };

/** `<root>/Sample/<name>.png` for each name, all the same size. */
function images(...paths: readonly string[]): ReadonlyMap<string, PixelSize> {
  return new Map(paths.map((path) => [path, SIZE]));
}

function appleName(name: string): string {
  return `${APPLE}/Sample/${name}`;
}

function webName(name: string): string {
  return `${WEB}/Sample/${name}`;
}

/** Every cell of an example, keyed as the model keys them, with the state of one platform. */
function states(gallery: Gallery, exampleId: string, platform: string): Record<string, string> {
  const component = gallery.components.find((c) => c.name === 'Sample');
  const example = component?.examples.find((e) => e.id === exampleId);
  return Object.fromEntries((example?.cells ?? []).map((cell) => [
    cellKey({ exampleId, scheme: cell.scheme, density: cell.density, variant: cell.variant }),
    cell.platforms.get(platform as never)?.kind ?? 'absent',
  ]));
}

describe('the name', () => {
  test('round-trips every segment, and the variant is optional', () => {
    for (const name of ['primary-md.ios.light.regular.png', 'glass-over-map.web-touch.dark.compact.bold-text.png']) {
      const parsed = parseName(name);
      expect(isParsed(parsed), name).toBe(true);
      if (isParsed(parsed)) expect(formatName(parsed)).toBe(name);
    }
  });

  test('a segment that is not of the rule is a reason, not a silent skip', () => {
    const reasons = [
      'primary-md.apple.light.regular.png', // the stack name C-25 objected to
      'primary-md.desktop.light.regular.png', // the old web viewport name
      'primary-md.ios.light.png', // no density
      'primary-md.ios.light.regular.increased-contrast.extra.png',
      'primary-md.ios.bright.regular.png',
      'primary-md.ios.light.cosy.png',
      'primary-md.ios.light.regular.high-contrast.png',
      'primary-md.ios.light.regular.jpg',
    ].map((name) => {
      const parsed = parseName(name);
      return isParsed(parsed) ? null : parsed.problem;
    });
    expect(reasons.every((reason) => typeof reason === 'string')).toBe(true);
    expect(reasons[0]).toContain('apple');
    expect(reasons[2]).toContain('segment');
  });

  test('the platform column order is exactly the parity report’s platform keys', () => {
    expect([...PLATFORM_ORDER].sort()).toEqual([...PLATFORMS].sort());
  });

  test('a PNG header is where the pixel size comes from, and anything else is not a PNG', () => {
    const header = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
    header.write('IHDR', 12, 'latin1');
    header.writeUInt32BE(402, 16);
    header.writeUInt32BE(88, 20);
    expect(pngSize(header)).toEqual({ width: 402, height: 88 });
    expect(pngSize(Buffer.alloc(24))).toBeNull();
    expect(pngSize(Buffer.alloc(8))).toBeNull();
  });
});

describe('both harnesses write the settled name', () => {
  // The rule is one sentence in spec/SCHEMA.md and two constants in two languages; nothing but a
  // reading of those constants can prove that the two sides still agree.
  const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');

  test('the Apple matrix names its platform segment with a spec platform key', () => {
    const swift = read('swift/Tests/DSSnapshotTests/DSSnapshotMatrix.swift');
    const platform = /static let platform = "([^"]+)"/u.exec(swift)?.[1];
    expect(platform).toBe('ios');
    expect(PLATFORMS).toContain(platform);
    expect(swift).toContain('<exampleId>.<platform>.<scheme>.<density>[.<variant>].png');
  });

  test('every Playwright viewport project is named for the platform key it records', () => {
    const matrix = read('web/apps/vrt/matrix.ts');
    const names = [...matrix.matchAll(/\{ name: "([^"]+)", width:/gu)].map((match) => match[1]);
    expect(names).toEqual(['web-desktop', 'web-touch']);
    for (const name of names) expect(PLATFORMS).toContain(name);
    // The screenshot's name is built from the project name, so the two cannot drift apart.
    expect(read('web/apps/vrt/tests/stories.spec.ts')).toContain('`${story.name}.${testInfo.project.name}.${scheme}.${density}.png`');
  });

  test('spec/SCHEMA.md states the rule the two of them implement', () => {
    const schema = read('spec/SCHEMA.md');
    expect(schema).toContain('<Component>/<exampleId>.<platform>.<scheme>.<density>[.<variant>].png');
    expect(schema).toContain('`pnpm gallery:build`');
  });
});

describe('a cell a platform has no image for', () => {
  /** Both examples, every scheme the example declares × both densities: six images per platform. */
  const apple = [
    'basic.ios.light.regular.png', 'basic.ios.light.compact.png', 'basic.ios.dark.regular.png', 'basic.ios.dark.compact.png',
    'light-only.ios.light.regular.png', 'light-only.ios.light.compact.png',
  ];
  const web = apple.map((name) => name.replace('.ios.', '.web-desktop.'));

  test('is nothing at all when both stacks are complete', () => {
    const gallery = collect({ reader: tree(), images: memoryImages(images(...apple.map(appleName), ...web.map(webName))) });
    expect(gallery.counts).toEqual({ images: 12, paired: 6, missing: 0, cells: 6 });
    expect(gallery.diagnostics).toEqual([]);
  });

  test('is a gap when the platform records the component and this state', () => {
    const gallery = collect({
      reader: tree(),
      images: memoryImages(images(...apple.map(appleName), ...web.slice(1).map(webName))),
    });
    expect(states(gallery, 'basic', 'web-desktop')['basic|light|regular|standard']).toBe('missing');
    expect(states(gallery, 'basic', 'ios')['basic|light|regular|standard']).toBe('present');
    expect(gallery.counts.missing).toBe(1);
    expect(gallery.diagnostics).toEqual([]);
  });

  test('is a gap on every recorded platform for an example nobody recorded', () => {
    // A declared example with no image anywhere, inside a component both stacks record, is four gaps
    // and not a silence: the spec says it exists, so the pair is owed.
    const only = (names: readonly string[]): readonly string[] => names.filter((name) => name.startsWith('basic.'));
    const gallery = collect({
      reader: tree(),
      images: memoryImages(images(...only(apple).map(appleName), ...only(web).map(webName))),
    });
    expect(Object.values(states(gallery, 'light-only', 'ios'))).toEqual(['missing', 'missing']);
    expect(Object.values(states(gallery, 'light-only', 'web-desktop'))).toEqual(['missing', 'missing']);
    expect(gallery.counts.missing).toBe(4);
  });

  test('is “not recorded” when the platform has no image of the component at all', () => {
    const gallery = collect({ reader: tree(), images: memoryImages(images(...apple.map(appleName))) });
    // With no web image anywhere, the web has no column at all, and the Apple cells stand alone.
    expect(gallery.platforms).toEqual(['ios']);
    expect(gallery.counts.missing).toBe(0);

    // Another component, recorded on the web and not on Apple, opens the web column without giving
    // Sample a single web image: Sample's web cells are then "not recorded", which is not a gap.
    const other = ['light.regular', 'light.compact', 'dark.regular', 'dark.compact']
      .map((axes) => `${WEB}/Other/basic.web-desktop.${axes}.png`);
    const withWeb = collect({ reader: tree(), images: memoryImages(images(...apple.map(appleName), ...other)) });
    expect(withWeb.platforms).toEqual(['ios', 'web-desktop']);
    expect(states(withWeb, 'basic', 'web-desktop')['basic|light|regular|standard']).toBe('not-recorded');
    expect(withWeb.counts.missing).toBe(0);
  });

  test('is “not in this matrix” for a forced state the other stack never records', () => {
    const gallery = collect({
      reader: tree(),
      images: memoryImages(images(...apple.map(appleName), ...web.map(webName), appleName('basic.ios.light.regular.increased-contrast.png'))),
    });
    expect(states(gallery, 'basic', 'web-desktop')['basic|light|regular|increased-contrast']).toBe('out-of-matrix');
    expect(states(gallery, 'basic', 'ios')['basic|light|regular|increased-contrast']).toBe('present');
    // The state is one the Apple matrix records, so its other three cells of this example are gaps —
    // and the web's are not, which is the whole point of telling the two apart.
    expect(states(gallery, 'basic', 'ios')['basic|dark|regular|increased-contrast']).toBe('missing');
    expect(gallery.counts.missing).toBe(3);
  });

  test('is no cell at all in a scheme the example does not declare', () => {
    const gallery = collect({
      reader: tree(),
      images: memoryImages(images(appleName('light-only.ios.light.regular.png'), appleName('light-only.ios.light.compact.png'))),
    });
    const cells = states(gallery, 'light-only', 'ios');
    expect(Object.keys(cells)).toEqual(['light-only|light|regular|standard', 'light-only|light|compact|standard']);
    expect(gallery.diagnostics).toEqual([]);
  });
});

describe('what fails the run', () => {
  const codes = (gallery: Gallery): string[] => gallery.diagnostics.map((d) => d.code);

  test('a name that is not of the rule', () => {
    const gallery = collect({ reader: tree(), images: memoryImages(images(appleName('basic.apple.light.png'))) });
    expect(codes(gallery)).toEqual(['gallery/name']);
    expect(gallery.diagnostics[0]?.hint).toContain('spec/SCHEMA.md');
  });

  test('a platform key recorded under the other stack’s root', () => {
    const gallery = collect({ reader: tree(), images: memoryImages(images(appleName('basic.web-touch.light.regular.png'))) });
    expect(codes(gallery)).toEqual(['gallery/platform']);
  });

  test('a directory no component spec is named for', () => {
    const gallery = collect({ reader: tree(), images: memoryImages(new Map([[`${APPLE}/Ghost/basic.ios.light.regular.png`, SIZE]])) });
    expect(codes(gallery)).toEqual(['gallery/component']);
  });

  test('a snapshot of an example the spec does not declare, once per example', () => {
    const gallery = collect({
      reader: tree(),
      images: memoryImages(images(appleName('gone.ios.light.regular.png'), appleName('gone.ios.dark.regular.png'))),
    });
    expect(codes(gallery)).toEqual(['gallery/example']);
  });

  test('a snapshot in a scheme the example does not declare', () => {
    const gallery = collect({ reader: tree(), images: memoryImages(images(appleName('light-only.ios.dark.regular.png'))) });
    expect(codes(gallery)).toEqual(['gallery/scheme']);
  });
});

describe('the repository', () => {
  const built = buildGallery(REPO_ROOT);
  const { gallery } = built;

  test('every image is of the rule, every pair is complete, and nothing is wrong', () => {
    expect(gallery.diagnostics).toEqual([]);
    expect(gallery.counts.missing).toBe(0);
    // P3-3's 268 SwiftUI snapshots and P3-4's 220 web screenshots, plus wave 1: P4-1's Divider (52 SwiftUI, 48 web),
    // P4-2's Icon (140, 88), P4-3's Badge (84, 80) and P4-4's IconButton (100, 96); then P4-7's Avatar (108, 96)
    // and P4-8's Chip (120, 104): 872 and 732, paired. Each component moves this number in the commit that lands its
    // baselines.
    expect(gallery.counts.images).toBe(1604);
    expect(gallery.counts.paired).toBe(gallery.counts.cells);
    expect(gallery.platforms).toEqual(['ios', 'web-desktop', 'web-touch']);
    expect(gallery.components.filter((c) => c.recorded.length > 0).map((c) => c.name)).toEqual(['Avatar', 'Badge', 'Button', 'Chip', 'Divider', 'Icon', 'IconButton', 'Surface', 'Text', 'Card']);
    expect(gallery.components).toHaveLength(57);
    expect(gallery.patterns).toEqual(['AdaptiveShell', 'DashboardGrid', 'DetailScreen']);
  });

  test('the committed index is what this run renders (the stale check CI runs)', () => {
    const reader = fsReader(REPO_ROOT);
    expect(reader.readText(INDEX_HTML)).toBe(built.html);
    expect(reader.readText(INDEX_JSON)).toBe(built.json);
    expect(main(['--check'])).toBe(0);
  });

  test('every component row of the parity report links to a section this page has', () => {
    const html = fsReader(REPO_ROOT).readText(INDEX_HTML);
    const rows = runParity({ reader: fsReader(REPO_ROOT) }).rows.filter((row) => row.kind !== null);
    expect(rows.length).toBe(57);
    for (const row of rows) {
      expect(fsReader(REPO_ROOT).readText('tools/parity/report.md'), row.spec.name)
        .toContain(`[pairs](../../${INDEX_HTML}#${row.spec.name})`);
      expect(html, row.spec.name).toContain(`id="${row.spec.name}"`);
    }
  });

  test('the page carries the framing of both stacks, and links back to the spec and the report', () => {
    const html = fsReader(REPO_ROOT).readText(INDEX_HTML);
    for (const source of SOURCES) {
      expect(html).toContain(source.frameTag);
      expect(html).toContain(source.root);
    }
    expect(html).toContain('../spec/components/Button.yaml');
    expect(html).toContain('../tools/parity/report.md');
    // Every image is shown at its own size: the width and height attributes are the file's own.
    expect(html).toMatch(/<img src="snapshots\/Button\/primary-md\.ios\.light\.regular\.png" width="\d+" height="\d+"/u);
  });

  test('the CLI reports usage errors rather than throwing', () => {
    expect(parseArgs(['--check'])).toEqual({ root: REPO_ROOT, check: true });
    expect(parseArgs(['--root'])).toContain('needs a path');
    expect(parseArgs(['--what'])).toContain('unknown argument');
  });
});
