// Markdown report of contrast:check (ARCHITECTURE §3.2, §10 step 8): one row per pair and context with
// the ratio to two decimals, the threshold and the verdict, plus the worst case the ratio comes from.
// Ratios are rounded down, so a displayed ratio never overstates the computed one.
import { formatDiagnostics, type Diagnostic } from '../tokens/api.ts';
import { limitText, MAP_LAND, type MapGround } from './map.ts';
import { contextLabel, type Evaluation, type Pair, type Problem } from './pairs.ts';
import { LARGE_TEXT_PX, type Thresholds } from './thresholds.ts';

export interface ReportInput {
  readonly pairsPath: string;
  readonly thresholds: Thresholds | null;
  readonly pairs: number;
  readonly contexts: readonly string[];
  readonly evaluations: readonly Evaluation[];
  /** Map grounds over the land (ADR-0030 §1.5); omitted or empty: no map section. */
  readonly maps?: readonly MapGround[];
  readonly problems: readonly Problem[];
  readonly diagnostics: readonly Diagnostic[];
}

const EPSILON = 1e-9;

/** Two decimals, rounded down (4.4999 → "4.49"). */
export function formatRatio(ratio: number): string {
  return (Math.floor((ratio + EPSILON) * 100) / 100).toFixed(2);
}

function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

const code = (s: string): string => `\`${cell(s)}\``;

export function bgCell(p: Pair): string {
  const parts = [code(p.bg)];
  if (p.stops !== null) parts.push(`stops: ${p.stops}`);
  if (p.region !== null) parts.push(`region: ${p.region}`);
  if (p.underlays.length > 0) parts.push(`on ${p.underlays.map(code).join(', ')}`);
  if (p.backdrops.length > 0) parts.push(`over ${p.backdrops.map((b) => (b.startsWith('#') ? b : code(b))).join(', ')}`);
  return parts.join(' ');
}

export function thresholdCell(e: Evaluation): string {
  const tier = e.pair.tier;
  const size = e.pair.minSizePx !== null && (tier !== 'functional' || e.thresholdKey === 'functionalLarge') ? ` ≥ ${e.pair.minSizePx} px` : '';
  return `${e.threshold.toFixed(2)} ${tier}${size}`;
}

function row(e: Evaluation): string {
  return `| ${code(e.pair.fg)} | ${bgCell(e.pair)} | ${cell(contextLabel(e.context))} | ${formatRatio(e.ratio)} | ${thresholdCell(e)} | ${e.pass ? 'pass' : '**FAIL**'} | ${cell(e.worst)} |`;
}

const HEAD = ['| fg | bg | context | ratio | threshold | pass | worst case |', '|---|---|---|--:|---|---|---|'];

export function table(evaluations: readonly Evaluation[]): string {
  return [...HEAD, ...evaluations.map(row)].join('\n');
}

/** One row per map ground and context: OKLCH L over the land against the scheme's limit (`map/backdrop-limit`). */
export function mapTable(grounds: readonly MapGround[]): string {
  const head = [`| ground | context | over \`${MAP_LAND}\` | OKLCH L | limit | pass |`, '|---|---|---|--:|---|---|'];
  return [...head, ...grounds.map((g) => `| ${code(g.path)} | ${cell(contextLabel(g.context))} | ${g.hex} | ${g.lightness.toFixed(3)} | ${limitText(g.limit)} | ${g.pass ? 'pass' : '**FAIL**'} |`)].join('\n');
}

export function renderReport(r: ReportInput): string {
  const failures = r.evaluations.filter((e) => !e.pass);
  const out: string[] = [];
  const brands = [...new Set(r.contexts.filter((c) => c.includes('/')).map((c) => c.slice(0, c.indexOf('/'))))];
  const scope = brands.length > 0 ? `brands ${brands.join(', ')} × every colorScheme context` : 'every colorScheme context';
  out.push(`Pairs: \`${r.pairsPath}\`. ${r.pairs} pairs in ${r.contexts.length} contexts (${scope}): ${r.evaluations.length} evaluations, ${failures.length} failing, ${r.problems.length} other problems.`);
  if (r.thresholds !== null) {
    const t = r.thresholds;
    out.push('', `Thresholds (ADR-0011): functional ${t.functional.toFixed(2)}, functional text ≥ ${LARGE_TEXT_PX} px ${t.functionalLarge.toFixed(2)}, decorative (≥ ${LARGE_TEXT_PX} px only) ${t.decorative.toFixed(2)}, boundary ${t.boundary.toFixed(2)}. Translucent colors are composited source-over in gamma-encoded sRGB over \`color.bg.page\` or each backdrop; ratios are WCAG 2.x, rounded down.`);
  }
  if (r.diagnostics.length > 0) {
    out.push('', '### Token build failed', '', '```', formatDiagnostics(r.diagnostics), '```');
  }
  if (r.problems.length > 0) {
    out.push('', '### Problems', '');
    for (const p of r.problems) out.push(`- \`${p.where}\`: ${p.message}`);
  }
  if (failures.length > 0) out.push('', '### Failures', '', table(failures));
  if (r.maps !== undefined && r.maps.length > 0) out.push('', '### Map backdrops (ADR-0030 §1.5)', '', mapTable(r.maps));
  if (r.evaluations.length > 0) out.push('', '### All pairs', '', table(r.evaluations));
  return `${out.join('\n')}\n`;
}
