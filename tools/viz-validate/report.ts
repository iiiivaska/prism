// The Markdown report of viz:validate: the findings, one row per check, subject and colors with every brand and
// context it was found in, then every palette's measures, with contexts that measure alike merged into one
// table. "At least" values are rounded down (a ΔE, a chroma, a ratio), so a displayed value never overstates a
// pass; lightness is rounded to the nearest, and a hue spread up.
import { formatDiagnostics } from '../tokens/api.ts';
import {
  ceilTo, CHECKS, floorTo, type AnchorMeasure, type CheckId, type PaletteMeasure, type PairMeasure, type SlotMeasure, type Verdict,
} from './checks.ts';
import {
  BAND, CHROMA_FLOOR, CONTRAST_MIN, CVD_FLOOR, CVD_TARGET, HUE_SPREAD_MAX, NORMAL_FLOOR, NOW, OWED_TO, PLOT, PLOT_UNDERLAYS, SERIES,
} from './config.ts';
import type { OwnedFinding, ValidateResult } from './validate.ts';

/** A check's number in README.md, "The six checks". */
const number = (check: CheckId): number => CHECKS.indexOf(check) + 1;

function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

const code = (s: string): string => `\`${cell(s)}\``;

/** `prism, prism-native × dark, dark-increased-contrast`, or per brand when the brands differ. */
export function whereText(occurrences: readonly { readonly brand: string; readonly contexts: readonly string[] }[]): string {
  const byBrand = new Map<string, string[]>();
  for (const o of occurrences) {
    const list = byBrand.get(o.brand) ?? [];
    for (const c of o.contexts) if (!list.includes(c)) list.push(c);
    byBrand.set(o.brand, list);
  }
  const lists = [...byBrand.values()].map((l) => l.join(', '));
  const brands = [...byBrand.keys()];
  if (brands.every((b) => b === '')) return lists.join(', ');
  if (new Set(lists).size === 1) return `${brands.join(', ')} × ${lists[0] ?? ''}`;
  return [...byBrand].map(([b, l]) => `${b}: ${l.join(', ')}`).join('; ');
}

interface Grouped {
  readonly first: OwnedFinding;
  readonly measured: string[];
  readonly occurrences: { brand: string; contexts: readonly string[] }[];
}

function groupFindings(findings: readonly OwnedFinding[]): Grouped[] {
  const groups = new Map<string, Grouped>();
  for (const f of findings) {
    const g = groups.get(f.key) ?? { first: f, measured: [], occurrences: [] };
    if (!g.measured.includes(f.measured)) g.measured.push(f.measured);
    g.occurrences.push({ brand: f.brand, contexts: f.contexts });
    groups.set(f.key, g);
  }
  return [...groups.values()].sort((a, b) =>
    number(a.first.check) - number(b.first.check)
    || (a.first.scheme ?? '').localeCompare(b.first.scheme ?? '')
    || a.first.subject.localeCompare(b.first.subject, 'en', { numeric: true }));
}

function findingsTable(findings: readonly OwnedFinding[]): string {
  const head = ['| Check | Scheme | Subject | Colors | Measured | Limit | Brands and contexts | Status |', '|---|---|---|---|---|---|---|---|'];
  const rows = groupFindings(findings).map((g) => {
    const f = g.first;
    const status = f.owed ? `owed (${OWED_TO})` : '**FAIL**';
    return `| ${number(f.check)} ${f.check} | ${f.scheme ?? 'all'} | ${f.subject} | ${f.colors.map(code).join(' ')} | ${cell(g.measured.join('; '))} | ${cell(f.limit)} | ${cell(whereText(g.occurrences))} | ${status} |`;
  });
  return [...head, ...rows].join('\n');
}

function mark(value: string, verdict: Verdict, relieved = ''): string {
  if (verdict === 'fail') return `${value} **FAIL**`;
  if (verdict === 'relieved') return `${value} relieved${relieved === '' ? '' : ` (${relieved})`}`;
  return value;
}

function slotRow(s: SlotMeasure): string {
  const h = s.lch.h === null ? '—' : `${s.lch.h.toFixed(1)}°`;
  const contrast = mark(`${floorTo(s.ground.ratio, 2)}:1`, s.contrast, s.reliefs.join(', '));
  return `| ${s.slot} | ${code(s.hex)} | ${mark(s.lch.l.toFixed(3), s.band)} | ${mark(floorTo(s.lch.c, 3), s.chroma)} | ${h} | ${contrast} | ${cell(s.ground.where)} | ${s.reliefs.length === 0 ? '—' : s.reliefs.join(', ')} |`;
}

function pairRow(p: PairMeasure): string {
  const cvd = mark(`${floorTo(p.cvd, 1)} (${p.cvdKind})`, p.cvdVerdict, 'direct labels');
  return `| ${p.subject} | ${p.colors.map(code).join(' ')} | ${mark(floorTo(p.normal, 1), p.normalVerdict)} | ${cvd} | ${floorTo(p.tritan, 1)} |`;
}

/** The cells a palette's tables show, so that contexts that measure alike share one table. */
function signature(m: PaletteMeasure): string {
  return JSON.stringify([m.palette.scheme, m.slots.map(slotRow), [...m.adjacent, ...m.now].map(pairRow)]);
}

function paletteTables(measures: readonly PaletteMeasure[]): string[] {
  const groups = new Map<string, PaletteMeasure[]>();
  for (const m of measures) groups.set(signature(m), [...(groups.get(signature(m)) ?? []), m]);
  const out: string[] = [];
  for (const group of groups.values()) {
    const m = group[0];
    if (m === undefined) continue;
    const [lo, hi] = BAND[m.palette.scheme];
    out.push('', `#### ${m.palette.scheme}: ${whereText(group.map((g) => ({ brand: g.palette.brand, contexts: [g.palette.colorScheme] })))}`, '');
    out.push(
      `| Slot | Color | L (${lo}–${hi}) | C (≥ ${CHROMA_FLOOR.toFixed(2)}) | h | Against the plot (≥ ${CONTRAST_MIN}:1) | Worst ground | Relief |`,
      '|--:|---|--:|--:|--:|--:|---|---|',
      ...m.slots.map(slotRow),
      '',
      `| Pair | Colors | ΔE normal (≥ ${NORMAL_FLOOR}) | ΔE CVD (≥ ${CVD_TARGET}; ≥ ${CVD_FLOOR} with direct labels) | ΔE tritanopia (reported) |`,
      '|---|---|--:|--:|--:|',
      ...[...m.adjacent, ...m.now].map(pairRow),
    );
  }
  return out;
}

function anchorTable(anchors: readonly AnchorMeasure[]): string {
  const rowText = (a: AnchorMeasure): string => {
    const seen = new Map<string, { h: number | null; contexts: string[] }>();
    for (const x of a.hues) {
      const e = seen.get(x.hex) ?? { h: x.h, contexts: [] };
      e.contexts.push(x.colorScheme);
      seen.set(x.hex, e);
    }
    const colors = [...seen].map(([hex, e]) => `${code(hex)} ${e.h === null ? 'no hue' : `${e.h.toFixed(1)}°`} (${e.contexts.join(', ')})`).join('; ');
    const spread = a.spread === null ? 'no hue' : `${ceilTo(a.spread, 1)}°`;
    return `| ${a.slot} | ${cell(colors)} | ${mark(spread, a.verdict)} |`;
  };
  const groups = new Map<string, { brands: string[]; rows: string[] }>();
  const brands = [...new Set(anchors.map((a) => a.brand))];
  for (const b of brands) {
    const rows = anchors.filter((a) => a.brand === b).map(rowText);
    const key = JSON.stringify(rows);
    const g = groups.get(key) ?? { brands: [], rows };
    g.brands.push(b);
    groups.set(key, g);
  }
  const out: string[] = [];
  for (const g of groups.values()) {
    const who = g.brands.every((b) => b === '') ? '' : ` — ${g.brands.join(', ')}`;
    out.push('', `#### Hue anchors${who}`, '', `| Slot | Colors, hue and contexts | Spread (≤ ${HUE_SPREAD_MAX}°) |`, '|--:|---|--:|', ...g.rows);
  }
  return out.join('\n');
}

export function renderReport(r: ValidateResult): string {
  const out: string[] = [];
  const brands = [...new Set(r.palettes.map((p) => p.brand))].filter((b) => b !== '');
  const slots = Math.max(0, ...r.palettes.map((p) => p.slots.length));
  const scope = brands.length > 0 ? `brands ${brands.join(', ')} × every colorScheme context` : 'every colorScheme context';
  const fresh = r.findings.filter((f) => !f.owed);
  const owedCount = new Set(r.findings.filter((f) => f.owed).map((f) => f.key)).size;
  const freshCount = new Set(fresh.map((f) => f.key)).size;
  const reliefText = !r.reliefPresent
    ? `\`${r.reliefPath}\` is absent, so no slot declares a relief`
    : `\`${r.reliefPath}\`, ${r.relief?.declarations.length ?? 0} declaration(s)`;
  out.push(`Palettes: \`${r.resolver}\`, ${slots} series slots (\`${SERIES}\`) and \`${NOW}\` in ${r.palettes.length} contexts (${scope}). Relief: ${reliefText}. ${owedCount + freshCount} findings: ${owedCount} owed to ${OWED_TO} (critic C-10), ${freshCount} new; ${r.problems.length} other problems.`);
  out.push('', `The checks (\`tools/viz-validate/README.md\`): 1 one hue per slot across a brand's contexts; 2 OKLCH lightness in the scheme's band; 3 OKLCH chroma ≥ ${CHROMA_FLOOR.toFixed(2)}; 4 ΔE ≥ ${CVD_TARGET} (≥ ${CVD_FLOOR} with direct labels) under protanopia and deuteranopia (Machado 2009, severity 1.0), for adjacent slots and for the now marker against every slot; 5 ΔE ≥ ${NORMAL_FLOOR} under normal vision on the same pairs; 6 ≥ ${CONTRAST_MIN}:1 against \`${PLOT}\` laid over each of ${PLOT_UNDERLAYS.map(code).join(', ')} on the page, or a declared relief. ΔE is the OKLab distance ×100. Values are rounded down, lightness to the nearest.`);
  if (r.ignored.length > 0) out.push('', `Not a numbered slot, so not checked: ${r.ignored.map(code).join(', ')}.`);
  if (r.diagnostics.length > 0) out.push('', '### Token build failed', '', '```', formatDiagnostics(r.diagnostics), '```');
  if (r.problems.length > 0) {
    out.push('', '### Problems', '');
    for (const p of r.problems) out.push(`- \`${p.where}\`: ${p.message}`);
  }
  if (r.findings.length > 0) out.push('', '### Findings', '', findingsTable(r.findings));
  if (r.measures.length > 0) out.push('', '### Palettes', ...paletteTables(r.measures));
  if (r.anchors.length > 0) out.push(anchorTable(r.anchors));
  return `${out.join('\n')}\n`;
}
