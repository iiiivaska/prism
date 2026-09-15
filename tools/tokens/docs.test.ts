// Living-document check (ADR-0024 §13; ARCHITECTURE §3.1): every token path and glob in the living
// documents resolves, the tokens README's sys.color segment list equals the ids, and its ownership
// table equals config.OWNERSHIP, whose brand row brands/README.md reproduces. P1-5 adds the emitted
// names (§13.3). The checks at the bottom read the real documents; the grammar tests run on inline
// samples and the fixtures.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { BRAND_OVERRIDABLE, OWNERSHIP, REF_SET } from './config.ts';
import { expand, parseGlob } from './ir/glob.ts';
import { findIds } from './ir/lookup.ts';
import { REPO_ROOT } from './ir/bundle.ts';
import { loadModel } from './source/model.ts';
import { fsReader, type SourceReader } from './source/reader.ts';
import { fixtureReader } from './test-support.ts';

export const LIVING_DOCUMENTS = [
  'README.md', 'tokens/README.md', 'tools/tokens/README.md', 'brands/README.md', 'spec/SCHEMA.md', 'spec/patterns/README.md', 'agent/SKILL.md',
];

interface Found { readonly text: string; readonly file: string; readonly line: number }

/** Inline code spans outside fences (`\|` in a span is an alternation bar) and scalar values of ```yaml blocks. */
export function extractCandidates(markdown: string, file: string): Found[] {
  const out: Found[] = [];
  const lines = markdown.split('\n');
  let fence: { marker: string; info: string; start: number; body: string[] } | null = null;
  lines.forEach((line, i) => {
    const m = /^\s*(```+|~~~+)\s*([\w-]*)/.exec(line);
    if (fence === null && m !== null) {
      fence = { marker: m[1] ?? '```', info: (m[2] ?? '').toLowerCase(), start: i + 1, body: [] };
      return;
    }
    if (fence !== null) {
      if (line.trim().startsWith(fence.marker)) {
        if (fence.info === 'yaml' || fence.info === 'yml') {
          const body = fence.body;
          const start = fence.start;
          const scalars: string[] = [];
          const walk = (v: unknown): void => {
            if (typeof v === 'string') scalars.push(v);
            else if (Array.isArray(v)) v.forEach(walk);
            else if (v !== null && typeof v === 'object') Object.values(v).forEach(walk);
          };
          try {
            walk(parseYaml(body.join('\n')) as unknown);
          } catch {
            // An example that is not strict YAML (a plain scalar may not start with a backtick): read
            // the value after each `key:` or `- `, and each value of a flow mapping or sequence.
            for (const b of body) scalars.push(...looseScalars(b));
          }
          for (const s of scalars) {
            const at = body.findIndex((b) => b.includes(s));
            out.push({ text: s, file, line: start + 1 + Math.max(0, at) });
          }
        }
        fence = null;
      } else fence.body.push(line);
      return;
    }
    for (const span of line.matchAll(/`([^`]+)`/g)) {
      out.push({ text: (span[1] ?? '').replace(/\\\|/g, '|').trim(), file, line: i + 1 });
    }
  });
  return out;
}

/** Values of one YAML line, without parsing: `key: value`, `- value`, `{ a: x, b: y }`, `[x, y]`. */
function looseScalars(line: string): string[] {
  const text = line.replace(/\s#.*$/, '').trim().replace(/^-\s+/, '');
  const value = /^[\w-]+:\s*(.*)$/.exec(text)?.[1] ?? text;
  const inner = /^[{[](.*)[}\]]$/.exec(value.trim())?.[1];
  const parts = inner === undefined ? [value] : inner.split(',').map((p) => /^\s*[\w-]+:\s*(.*)$/.exec(p)?.[1] ?? p);
  return parts.map((p) => p.trim()).filter((p) => p !== '');
}

const FILE_EXTENSIONS = new Set(['css', 'ts', 'tsx', 'js', 'mjs', 'cjs', 'json', 'swift', 'yaml', 'yml', 'html', 'txt', 'sh', 'png', 'svg', 'ttf', 'otf', 'woff2', 'xcassets', 'colorset', 'plist']);
const SEGMENT = /^([a-z0-9]+(-[a-z0-9]+)*|\$root|\*|\*\*|(0|[1-9][0-9]*)…(0|[1-9][0-9]*)|[a-z0-9-]+(\|[a-z0-9-]+)+|<[^<>.\s]+>)$/;

/** Whether a string is a token path or glob of the §13.2 grammar, given the sys categories. */
export function isTokenPath(text: string, categories: ReadonlySet<string>): boolean {
  if (/\s/.test(text) || text.includes('/') || /^\{.*\}$/.test(text)) return false;
  const segments = text.split('.');
  if (segments.length < 2) return false;
  const last = segments[segments.length - 1] ?? '';
  if (FILE_EXTENSIONS.has(last)) return false;
  const first = segments[0] ?? '';
  if (!(first === 'ref' || first === 'sys' || first === 'comp' || categories.has(first))) return false;
  if (first === 'comp' && segments.length < 3) return false;
  return segments.every((s) => SEGMENT.test(s));
}

/** Expands alternations, `<a|b>` placeholders and `N…M` ranges into plain strings or globs. */
export function expandDocPath(text: string): string[] {
  let out: string[][] = [[]];
  for (const seg of text.split('.')) {
    let options: string[];
    const range = /^(\d+)…(\d+)$/.exec(seg);
    if (range) {
      options = [];
      for (let n = Number(range[1]); n <= Number(range[2]); n++) options.push(String(n));
    } else if (/^<[^<>]+>$/.test(seg)) {
      const inner = seg.slice(1, -1);
      options = inner.includes('|') ? inner.split('|') : ['*'];
    } else if (seg.includes('|')) options = seg.split('|');
    else options = [seg];
    out = out.flatMap((prefix) => options.map((o) => [...prefix, o]));
  }
  return out.map((parts) => parts.join('.'));
}

/** Why a documented path does not resolve, or null when it does. */
export function checkDocPath(text: string, ids: ReadonlySet<string>): string | null {
  if (/^(ref|sys|comp)\.\*$/.test(text)) {
    const tier = text.slice(0, -2);
    return [...ids].some((id) => id.startsWith(`${tier}.`)) ? null : `no ${tier} token exists`;
  }
  const missing = expandDocPath(text).filter((p) => findIds(ids, p).length === 0);
  if (missing.length === 0) return null;
  return `${missing.join(', ')} ${missing.length === 1 ? 'resolves' : 'resolve'} to no token`;
}

function categoriesOf(ids: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const id of ids) if (id.startsWith('sys.')) out.add(id.split('.')[1] ?? '');
  return out;
}

/**
 * Every id any loaded document declares: a superset of each permutation's ids, which suits path
 * resolution. Built from the source model only, so the check survives the deletion of resolver.ts (§5.8).
 */
function idsOf(reader: SourceReader): Set<string> {
  const { model } = loadModel(reader);
  if (model === null) throw new Error('the source model does not load');
  return new Set([...model.docs.values()].flatMap((d) => [...d.tokens.keys()]));
}

/** Every documented path of `markdown` that does not resolve. */
export function unresolvedPaths(markdown: string, file: string, ids: ReadonlySet<string>): string[] {
  const categories = categoriesOf(ids);
  const out: string[] = [];
  for (const c of extractCandidates(markdown, file)) {
    if (!isTokenPath(c.text, categories)) continue;
    const problem = checkDocPath(c.text, ids);
    if (problem !== null) out.push(`${c.file}:${c.line} \`${c.text}\`: ${problem}`);
  }
  return out;
}

/** The segments of `- **sys.color segments**: ...` in tokens/README.md. */
export function documentedColorSegments(readme: string): string[] {
  const line = readme.split('\n').find((l) => l.includes('**sys.color segments**'));
  if (line === undefined) return [];
  const list = line.split('Numeric segments')[0] ?? '';
  return [...list.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '').filter((s) => s !== 'sys.color');
}

export function colorSegments(ids: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    if (!id.startsWith('sys.color.')) continue;
    for (const s of id.split('.').slice(2)) if (s !== '$root' && !/^\d+$/.test(s)) out.add(s);
  }
  return [...out].sort();
}

function tableRows(markdown: string, header: RegExp): string[][] {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => header.test(l));
  if (start < 0) return [];
  const rows: string[][] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.trim().startsWith('|')) break;
    rows.push(line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim()));
  }
  return rows;
}

const spans = (cell: string): string[] => [...cell.matchAll(/`([^`]+)`/g)].map((m) => (m[1] ?? '').replace(/\\\|/g, '|'));

/** The ownership table of tokens/README.md: modifier → { include, exclude } (brand: the BRAND_OVERRIDABLE marker). */
export function documentedOwnership(readme: string): Map<string, { include: string[]; exclude: string[] }> {
  const out = new Map<string, { include: string[]; exclude: string[] }>();
  for (const cells of tableRows(readme, /^\|\s*Modifier\s*\|\s*Contexts\s*\|\s*Owns\s*\|/)) {
    const modifier = spans(cells[0] ?? '')[0];
    const owns = cells[2] ?? '';
    if (modifier === undefined) continue;
    // Parenthesized text explains a row (`sys.font.**` (… `ref.font.<slot>` …)); it lists no ownership.
    const [inc, exc] = owns.replace(/\([^)]*\)/g, '').split(/\bexcept\b/);
    const keep = (s: string): boolean => s === 'BRAND_OVERRIDABLE' || /^(ref|sys|comp)\./.test(s);
    out.set(modifier, { include: spans(inc ?? '').filter(keep), exclude: spans(exc ?? '').filter(keep) });
  }
  return out;
}

/** The id patterns of the allowlist table in brands/README.md. */
export function documentedAllowlist(readme: string): string[] {
  return tableRows(readme, /^\|\s*Group\s*\|\s*Ids\s*\|/).flatMap((cells) => spans(cells[1] ?? ''));
}

// ---- grammar ----

describe('the documentation grammar (ADR-0024 §13.2)', () => {
  const ids = idsOf(fixtureReader('mini'));
  const categories = categoriesOf(ids);

  test('extracts code spans, table alternations and yaml scalars; skips other fences', () => {
    const md = [
      'Use `color.bg.page` and `motion.css`.',
      '| a | `color.text.primary\\|secondary` |',
      '```yaml',
      'gap: space.card-padding  # a comment',
      'title: comp.card.title',
      '```',
      '```css',
      '`color.nope` inside css',
      '```',
    ].join('\n');
    expect(extractCandidates(md, 'x.md').map((c) => [c.text, c.line])).toEqual([
      ['color.bg.page', 1], ['motion.css', 1], ['color.text.primary|secondary', 2], ['space.card-padding', 4], ['comp.card.title', 5],
    ]);
  });

  test('what counts as a token path', () => {
    const yes = ['color.bg.page', 'sys.color.bg.surface.$root', 'ref.*', 'comp.card.bg', 'type.body.md', 'color.text.primary|secondary', 'space.0…13', 'ref.color.slot.<light|dark>.<bg-page|text-accent>', 'sys.type.<role>', 'color.**'];
    const no = ['motion.css', 'tokens/README.md', '{sys.color.bg.page}', 'surface.vivid', 'text.primary', 'tokens.color.textPrimary', 'data-ds-motion', 'color', 'comp.card', 'color.bg.page = x', 'var(--ds-color-bg-page)'];
    for (const s of yes) expect(isTokenPath(s, categories), s).toBe(true);
    for (const s of no) expect(isTokenPath(s, categories), s).toBe(false);
  });

  test('plain paths resolve through lookup; alternations and ranges expand; globs match at least one id', () => {
    expect(checkDocPath('color.bg.page', ids)).toBeNull();
    expect(checkDocPath('color.bg.surface', ids)).toBeNull();
    expect(checkDocPath('color.text.primary|secondary|accent', ids)).toBeNull();
    expect(checkDocPath('color.text.primary|tertiary', ids)).toBe('color.text.tertiary resolves to no token');
    expect(checkDocPath('ref.space.2…4', ids)).toBe('ref.space.3 resolves to no token');
    expect(checkDocPath('ref.color.slot.<light|dark>.bg-page', ids)).toBeNull();
    expect(checkDocPath('sys.type.<role>.md', ids)).toBeNull();
    expect(checkDocPath('motion.spring.*', ids)).toBeNull();
    expect(checkDocPath('ref.*', ids)).toBeNull();
    expect(checkDocPath('gradient.vivid.9', ids)).not.toBeNull();
    expect(expandDocPath('a.1…3.x|y')).toEqual(['a.1.x', 'a.1.y', 'a.2.x', 'a.2.y', 'a.3.x', 'a.3.y']);
    expect(parseGlob(expandDocPath('sys.type.<role>')[0] ?? '').isPattern).toBe(true);
  });

  test('the vocabulary and ownership parsers read the README shapes', () => {
    const readme = [
      '- **sys.color segments**: `accent`, `bg`, `page`. Numeric segments are free.',
      '| Modifier | Contexts | Owns |',
      '|---|---|---|',
      '| `brand` | `prism` | `BRAND_OVERRIDABLE`: the allowlisted `ref.*` ids of `brands/README.md` |',
      '| `density` | `compact` | `sys.space.**`, `sys.size.**` except `sys.size.hit` |',
    ].join('\n');
    expect(documentedColorSegments(readme)).toEqual(['accent', 'bg', 'page']);
    expect(Object.fromEntries(documentedOwnership(readme))).toEqual({
      brand: { include: ['BRAND_OVERRIDABLE', 'ref.*'], exclude: [] },
      density: { include: ['sys.space.**', 'sys.size.**'], exclude: ['sys.size.hit'] },
    });
    expect(colorSegments(['sys.color.bg.surface.$root', 'sys.color.chart.series.1', 'sys.space.4'])).toEqual(['bg', 'chart', 'series', 'surface']);
  });
});

// ---- the real documents ----

describe('living documents', () => {
  const read = (p: string): string => readFileSync(`${REPO_ROOT}${p}`, 'utf8');

  test('every token path and glob resolves', () => {
    const ids = idsOf(fsReader(REPO_ROOT));
    const problems = LIVING_DOCUMENTS.flatMap((doc) => unresolvedPaths(read(doc), doc, ids));
    expect(problems).toEqual([]);
  });

  test('the sys.color segment list of tokens/README.md equals the ids', () => {
    const ids = idsOf(fsReader(REPO_ROOT));
    expect([...documentedColorSegments(read('tokens/README.md'))].sort()).toEqual(colorSegments(ids));
  });

  test('the ownership table of tokens/README.md equals config.OWNERSHIP', () => {
    const doc = documentedOwnership(read('tokens/README.md'));
    expect([...doc.keys()]).toEqual(Object.keys(OWNERSHIP));
    for (const [modifier, row] of Object.entries(OWNERSHIP)) {
      const d = doc.get(modifier);
      if (modifier === 'brand') {
        expect(d?.include).toContain('BRAND_OVERRIDABLE');
        continue;
      }
      expect([...(d?.include ?? [])].sort(), modifier).toEqual([...row.include].sort());
      expect([...(d?.exclude ?? [])].sort(), modifier).toEqual([...row.exclude].sort());
    }
  });

  test('brands/README.md reproduces BRAND_OVERRIDABLE', () => {
    const { model } = loadModel(fsReader(REPO_ROOT));
    const refIds = (model?.sets.get(REF_SET) ?? []).flatMap((d) => [...d.tokens.keys()]);
    const documented = documentedAllowlist(read('brands/README.md'));
    expect(documented.length).toBeGreaterThan(0);
    for (const p of documented) expect(checkDocPath(p, new Set(refIds)), p).toBeNull();
    const fromDocs = new Set(documented.flatMap((p) => expandDocPath(p)).flatMap((p) => expand(p, refIds)));
    const fromConfig = new Set(BRAND_OVERRIDABLE.flatMap((p) => expand(p, refIds)));
    expect([...fromDocs].sort()).toEqual([...fromConfig].sort());
  });
});
