// viz:validate (roadmap P4-49, critic G-10; ADR-0007 decision 4, ADR-0020 §4 and rule 10): the six series
// palette checks of docs/research/dataviz-design.md §1, written down in README.md, for every brand in all six
// colorScheme contexts, `color.chart.now` against every series slot included. It builds the token bundle and
// reads each brand × colorScheme context as contrast:check does (`api.contrastContexts`: platform web, the
// other axes at their defaults), and measures check 6 with contrast:check's own pair evaluation, so the two
// gates give one ratio for one slot. It prints a Markdown report on stdout, appends it to $GITHUB_STEP_SUMMARY,
// and lists every finding; a finding of the seeded slots that P4-50 owes (config.ts OWED) is reported and does
// not fail the run.
//
//   node viz-validate/validate.ts [--root <dir>] [--resolver <path>] [--relief <path>] [--json]
//
// --root is the tree to read (default: the repository); --resolver and --relief are relative to it (defaults:
// tokens/prism.resolver.json, and viz-relief.json next to the resolver, which may be absent); --json prints the
// run as JSON instead of the report. A fixture runs as its own root, as contrast:check's do.
// Exit codes: 0 every finding is owed, or there is none; 1 a finding that is not owed, an invalid relief file, a
// palette the checks cannot read, or a failed token build; 2 usage error.
import { appendFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { evaluatePair, PairError, parsePair, type Env, type Problem } from '../contrast/pairs.ts';
import { ADR_0011_THRESHOLDS } from '../contrast/thresholds.ts';
import {
  collectBundle, contrastContexts, fsReader, REPO_ROOT,
  type ContrastContext, type Diagnostic, type IRBundle, type ResolvedColor, type SourceReader,
} from '../tokens/api.ts';
import {
  anchorFindings, findingKey, measureAnchors, measurePalette, paletteFindings,
  type AnchorMeasure, type Finding, type Ground, type Palette, type PaletteMeasure,
} from './checks.ts';
import { NOW, OWED, OWED_TO, PLOT, PLOT_UNDERLAYS, RELIEF_FILE, SERIES } from './config.ts';
import { parseReliefFile, reliefsFor, type ReliefFile } from './relief.ts';
import { renderReport } from './report.ts';

export const DEFAULT_RESOLVER = 'tokens/prism.resolver.json';

export interface ValidateOptions {
  /** Tree to read; default: the repository. Ignored when `reader` is given. */
  readonly root?: string;
  readonly reader?: SourceReader;
  /** Resolver path relative to the root; default tokens/prism.resolver.json. */
  readonly resolver?: string;
  /** Relief declaration relative to the root; default viz-relief.json next to the resolver. */
  readonly relief?: string;
  /** Finding keys reported as owed instead of failing; default config.ts OWED. */
  readonly owed?: readonly string[];
}

export interface OwnedFinding extends Finding {
  readonly key: string;
  readonly owed: boolean;
}

export interface ValidateResult {
  readonly resolver: string;
  readonly reliefPath: string;
  /** null when the file is absent or invalid. */
  readonly relief: ReliefFile | null;
  readonly reliefPresent: boolean;
  readonly bundle: IRBundle | null;
  readonly palettes: readonly Palette[];
  readonly measures: readonly PaletteMeasure[];
  readonly anchors: readonly AnchorMeasure[];
  readonly findings: readonly OwnedFinding[];
  /** Ids under the series group that are no slot number (a `series.other`), left out of the checks. */
  readonly ignored: readonly string[];
  readonly problems: readonly Problem[];
  readonly diagnostics: readonly Diagnostic[];
}

export function passed(r: ValidateResult): boolean {
  return r.bundle !== null && r.diagnostics.length === 0 && r.problems.length === 0 && r.findings.every((f) => f.owed);
}

/** The owed keys the run did not find: each is stale, and config.ts OWED drops it (validate.test.ts). */
export function staleOwed(r: ValidateResult, owed: readonly string[] = OWED): string[] {
  const found = new Set(r.findings.map((f) => f.key));
  return owed.filter((k) => !found.has(k));
}

const ENV: Env = { thresholds: ADR_0011_THRESHOLDS, geometries: () => [] };

function label(ctx: ContrastContext): string {
  return ctx.brand === '' ? ctx.colorScheme : `${ctx.brand}/${ctx.colorScheme}`;
}

/** A slot's contrast against the plot over each underlay, as contrast:check evaluates its series pairs. */
function ground(ctx: ContrastContext, slotId: string): Ground {
  const { pair, problems } = parsePair({ fg: slotId, bg: PLOT, tier: 'boundary', underlays: PLOT_UNDERLAYS }, 0);
  if (pair === null) throw new PairError(problems.join('; '));
  const e = evaluatePair(pair, ctx, ENV);
  return { ratio: e.ratio, where: e.worst };
}

interface Read {
  readonly palette: Palette | null;
  readonly ignored: readonly string[];
  readonly problems: readonly Problem[];
}

/** One context's palette, or the reasons the checks cannot read it. */
function readPalette(ctx: ContrastContext, relief: ReliefFile): Read {
  const where = label(ctx);
  let series: readonly ResolvedColor[];
  try {
    series = ctx.colors(SERIES);
  } catch (e) {
    return { palette: null, ignored: [], problems: [{ where, message: `${SERIES}: ${e instanceof Error ? e.message : String(e)}` }] };
  }
  const numbered: { n: number; color: ResolvedColor }[] = [];
  const ignored: string[] = [];
  for (const color of series) {
    const last = color.id.slice(color.id.lastIndexOf('.') + 1);
    if (/^[1-9][0-9]*$/.test(last)) numbered.push({ n: Number(last), color });
    else ignored.push(color.id);
  }
  numbered.sort((a, b) => a.n - b.n);
  const problems: Problem[] = [];
  if (numbered.length === 0) problems.push({ where, message: `${SERIES} holds no numbered slot` });
  const gap = numbered.findIndex((s, i) => s.n !== i + 1);
  const first = numbered[gap];
  if (first !== undefined) problems.push({ where, message: `the series slots must be numbered 1…N without a gap; ${first.color.id} is slot ${first.n}, where ${gap + 1} is expected` });
  for (const s of numbered) {
    if (s.color.alpha !== 1) problems.push({ where, message: `${s.color.id} is translucent (alpha ${s.color.alpha}); a series slot is an opaque color (ADR-0020 §1)` });
  }
  let now: ResolvedColor | null = null;
  try {
    now = ctx.color(NOW);
    if (now.alpha !== 1) problems.push({ where, message: `${now.id} is translucent (alpha ${now.alpha}); the checks compare opaque marks` });
  } catch (e) {
    problems.push({ where, message: `${NOW}: ${e instanceof Error ? e.message : String(e)}` });
  }
  if (problems.length > 0) return { palette: null, ignored, problems };

  const grounds: Ground[] = [];
  for (const s of numbered) {
    try {
      grounds.push(ground(ctx, s.color.id));
    } catch (e) {
      if (!(e instanceof PairError)) throw e;
      return { palette: null, ignored, problems: [{ where, message: `slot ${s.n} against ${PLOT}: ${e.message}` }] };
    }
  }
  const swatch = (c: ResolvedColor): { hex: string; srgb: ResolvedColor['srgb'] } => ({ hex: c.hex, srgb: c.srgb });
  return {
    palette: {
      brand: ctx.brand,
      colorScheme: ctx.colorScheme,
      scheme: ctx.scheme,
      slots: numbered.map((s) => swatch(s.color)),
      now: now === null ? null : swatch(now),
      grounds,
      reliefs: numbered.map((s) => reliefsFor(relief, ctx.brand, ctx.scheme, s.n)),
    },
    ignored,
    problems: [],
  };
}

/** A declaration that names a slot or a brand no palette has. */
function declarationProblems(path: string, relief: ReliefFile, palettes: readonly Palette[]): Problem[] {
  const count = Math.max(0, ...palettes.map((p) => p.slots.length));
  const brands = new Set(palettes.map((p) => p.brand));
  const known = [...brands].filter((b) => b !== '');
  const knownText = known.length === 0 ? 'the resolver has no brand modifier' : `known: ${known.join(', ')}`;
  const out: Problem[] = [];
  for (const d of relief.declarations) {
    const where = `${path} declarations[${d.index}]`;
    for (const s of d.slots) if (s > count) out.push({ where, message: `slot ${s} is no series slot; there are ${count}` });
    for (const b of d.brands ?? []) if (!brands.has(b)) out.push({ where, message: `brand "${b}" is not a brand of the resolver; ${knownText}` });
  }
  return out;
}

export async function runValidate(opts: ValidateOptions = {}): Promise<ValidateResult> {
  const reader = opts.reader ?? fsReader(opts.root ?? REPO_ROOT);
  const resolver = opts.resolver ?? DEFAULT_RESOLVER;
  const reliefPath = opts.relief ?? posix.join(posix.dirname(resolver), RELIEF_FILE);
  const owed = new Set(opts.owed ?? OWED);
  const problems: Problem[] = [];

  let relief: ReliefFile | null = { declarations: [] };
  let reliefPresent = false;
  try {
    reliefPresent = reader.exists(reliefPath);
    if (reliefPresent) {
      const parsed = parseReliefFile(reader.readText(reliefPath));
      relief = parsed.file;
      problems.push(...parsed.problems.map((message) => ({ where: reliefPath, message })));
    }
  } catch (e) {
    relief = null;
    problems.push({ where: reliefPath, message: e instanceof Error ? e.message : String(e) });
  }

  const collected = await collectBundle({ reader, resolver });
  const bundle = collected.bundle;
  const result = (palettes: readonly Palette[] = [], ignored: readonly string[] = []): ValidateResult => {
    const measures = palettes.map(measurePalette);
    const brands = [...new Set(palettes.map((p) => p.brand))];
    const anchors = brands.flatMap((b) => measureAnchors(b, palettes.filter((p) => p.brand === b)));
    const findings = [...measures.flatMap(paletteFindings), ...anchorFindings(anchors)].map((f) => {
      const key = findingKey(f);
      return { ...f, key, owed: owed.has(key) };
    });
    return { resolver, reliefPath, relief, reliefPresent, bundle, palettes, measures, anchors, findings, ignored, problems, diagnostics: collected.diagnostics };
  };
  if (bundle === null) return result();

  let contexts: readonly ContrastContext[];
  try {
    contexts = contrastContexts(bundle);
  } catch (e) {
    problems.push({ where: resolver, message: e instanceof Error ? e.message : String(e) });
    return result();
  }
  // An invalid declaration is a problem and relieves nothing, so the palettes are still measured and reported.
  const declared = relief ?? { declarations: [] };
  const palettes: Palette[] = [];
  const ignored = new Set<string>();
  for (const ctx of contexts) {
    const read = readPalette(ctx, declared);
    problems.push(...read.problems);
    for (const id of read.ignored) ignored.add(id);
    if (read.palette !== null) palettes.push(read.palette);
  }
  const counts = new Set(palettes.map((p) => p.slots.length));
  if (counts.size > 1) problems.push({ where: resolver, message: `the contexts hold different numbers of series slots (${[...counts].sort((a, b) => a - b).join(', ')}); every context holds the same slots` });
  problems.push(...declarationProblems(reliefPath, declared, palettes));
  return result(palettes, [...ignored].sort());
}

/** The run as JSON: the measures, the findings and the problems (`--json`). */
export function toJson(r: ValidateResult): string {
  const measures = r.measures.map((m) => ({
    brand: m.palette.brand,
    colorScheme: m.palette.colorScheme,
    scheme: m.palette.scheme,
    slots: m.slots.map((s) => ({
      slot: s.slot, hex: s.hex, l: s.lch.l, c: s.lch.c, h: s.lch.h,
      band: s.band, chroma: s.chroma, contrast: s.contrast, ratio: s.ground.ratio, ground: s.ground.where, reliefs: s.reliefs,
    })),
    pairs: [...m.adjacent, ...m.now].map((p) => ({
      subject: p.subject, colors: p.colors, normal: p.normal, normalVerdict: p.normalVerdict, cvd: p.cvd, cvdKind: p.cvdKind, cvdVerdict: p.cvdVerdict, tritan: p.tritan,
    })),
  }));
  return `${JSON.stringify({
    resolver: r.resolver,
    relief: { path: r.reliefPath, present: r.reliefPresent, declarations: r.relief?.declarations ?? [] },
    passed: passed(r),
    measures,
    anchors: r.anchors,
    findings: r.findings,
    ignored: r.ignored,
    problems: r.problems,
    diagnostics: r.diagnostics.length,
  }, null, 2)}\n`;
}

export function report(r: ValidateResult): string {
  return renderReport(r);
}

interface Args {
  root: string;
  resolver: string | undefined;
  relief: string | undefined;
  json: boolean;
}

function parseArgs(argv: readonly string[]): Args | string {
  const args: Args = { root: REPO_ROOT, resolver: undefined, relief: undefined, json: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? '';
    if (flag === '--json') {
      args.json = true;
      continue;
    }
    const value = argv[i + 1];
    if (!['--root', '--resolver', '--relief'].includes(flag)) return `unknown argument ${JSON.stringify(flag)}`;
    if (value === undefined || value.startsWith('--')) return `${flag} needs a value`;
    if (flag === '--root') args.root = resolve(value);
    else if (flag === '--resolver') args.resolver = value;
    else args.relief = value;
    i++;
  }
  return args;
}

/** CLI entry; returns the process exit code. */
export async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    console.error(`viz:validate: ${args}\nusage: node viz-validate/validate.ts [--root <dir>] [--resolver <path>] [--relief <path>] [--json]`);
    return 2;
  }
  const result = await runValidate({
    root: args.root,
    ...(args.resolver === undefined ? {} : { resolver: args.resolver }),
    ...(args.relief === undefined ? {} : { relief: args.relief }),
  });
  if (args.json) {
    process.stdout.write(toJson(result));
  } else {
    const markdown = report(result);
    process.stdout.write(markdown);
    const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
    if (summaryFile) {
      try {
        appendFileSync(summaryFile, `## viz:validate\n\n${markdown}\n`);
      } catch (e) {
        console.error(`viz:validate: cannot append to GITHUB_STEP_SUMMARY: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  const fresh = result.findings.filter((f) => !f.owed);
  const owed = new Set(result.findings.filter((f) => f.owed).map((f) => f.key)).size;
  if (passed(result)) {
    console.error(`viz:validate: ${result.palettes.length} palettes pass; ${owed} finding(s) of the seeded slots owed to ${OWED_TO}, none new`);
    return 0;
  }
  for (const f of fresh) console.error(`FAIL ${f.key} in ${f.brand === '' ? '' : `${f.brand}/`}${f.contexts.join(', ')}: ${f.measured} (${f.limit})`);
  for (const p of result.problems) console.error(`${p.where}: ${p.message}`);
  if (result.diagnostics.length > 0) console.error(`viz:validate: the token build reports ${result.diagnostics.length} diagnostic(s)`);
  console.error(`viz:validate: ${new Set(fresh.map((f) => f.key)).size} finding(s) not owed, ${result.problems.length} other problem(s) (tools/viz-validate/README.md)`);
  return 1;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
