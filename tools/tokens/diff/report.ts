// Markdown and JSON renderings of a `tokens:diff` outcome (ARCHITECTURE §11): one table row per
// change, the policy used, the required and declared bumps, and the verdict. The same Markdown goes
// to stdout and to `$GITHUB_STEP_SUMMARY`; the summary caps its rows, stdout never does.
import { formatDiagnostics, type Diagnostic } from '../ir/diagnostics.ts';
import type { ModifierInfo } from '../source/types.ts';
import type { Bump, Policy, TokenChange } from './classify.ts';
import type { DeclaredBump } from './changesets.ts';

export type DiffStatus =
  | 'pass'                  // declared ≥ required
  | 'fail'                  // declared < required
  | 'no-baseline'           // no release tag merged into HEAD: nothing to compare against
  | 'no-release'            // --base names a revision with no release tag merged into it: no policy
  | 'baseline-allowed'      // the base fails validation; skipped by --allow-invalid-baseline <reason>
  | 'invalid-baseline'      // the base fails validation
  | 'invalid-working-tree'  // the working tree fails validation
  | 'error';                // a malformed changeset, a shallow clone

export interface DiffOutcome {
  readonly status: DiffStatus;
  readonly exitCode: 0 | 1;
  /** The revision compared against: the ref as given (or the tag) and its commit. */
  readonly base: { readonly ref: string; readonly commit: string } | null;
  /** The release tag the policy comes from (ADR-0024 §14). */
  readonly tag: string | null;
  readonly policy: Policy | null;
  readonly changes: readonly TokenChange[];
  /** The bump the changes require under `policy`, and under `strict` for reference. */
  readonly required: Bump | null;
  readonly requiredStrict: Bump | null;
  readonly declared: DeclaredBump | null;
  /** The token packages the declared bump is read for. */
  readonly packages: readonly string[];
  /** Validation diagnostics of the side that failed (the base or the working tree). */
  readonly diagnostics: readonly Diagnostic[];
  /** Modifiers of the working tree, to describe permutations. */
  readonly modifiers: readonly ModifierInfo[];
  readonly notice: string | null;
  /** The reason passed with --allow-invalid-baseline. */
  readonly reason: string | null;
  readonly error: string | null;
}

export const NO_BASELINE_NOTICE = 'no baseline; every token counts as added';

function cell(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function code(text: string): string {
  return `\`${text.replace(/`/g, "'")}\``;
}

function list(items: readonly string[]): string {
  return items.length === 0 ? '(none)' : items.join(', ');
}

/** "4 of 12 permutations (density: regular)" from the changed keys and the modifiers' contexts. */
export function describePermutations(keys: readonly string[], compared: number, modifiers: readonly ModifierInfo[]): string {
  if (keys.length === compared) return `all ${compared} permutations`;
  const seen = new Map<string, Set<string>>();
  for (const key of keys) {
    for (const pair of key.split('|')) {
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const set = seen.get(name) ?? new Set<string>();
      set.add(pair.slice(eq + 1));
      seen.set(name, set);
    }
  }
  const limits: string[] = [];
  for (const m of modifiers) {
    const s = seen.get(m.name);
    if (s === undefined || s.size === m.contexts.length) continue;
    limits.push(`${m.name}: ${m.contexts.filter((c) => s.has(c)).join(', ')}`);
  }
  return `${keys.length} of ${compared} permutations${limits.length > 0 ? ` (${limits.join('; ')})` : ''}`;
}

/** Kind, subject and detail of one change, as plain text. */
export function describeChange(c: TokenChange, modifiers: readonly ModifierInfo[]): { kind: string; subject: string; detail: string } {
  switch (c.kind) {
    case 'context-removed':
    case 'context-added':
      return { kind: c.kind, subject: `${c.modifier}=${c.context}`, detail: `${c.kind === 'context-added' ? 'new' : 'removed'} context of ${c.modifier}` };
    case 'removed':
      return { kind: c.kind, subject: c.path, detail: c.type };
    case 'added':
      return { kind: c.kind, subject: c.path, detail: c.type };
    case 'type-changed':
      return { kind: c.kind, subject: c.path, detail: `${c.from} → ${c.to}` };
    case 'axes-changed': {
      const parts = [`${list(c.from)} → ${list(c.to)}`];
      if (c.variants !== undefined) parts.push(`variants ${list(c.variants.from)} → ${list(c.variants.to)}`);
      if (c.platforms !== undefined) parts.push(`on ${c.platforms.join(', ')}`);
      return { kind: c.kind, subject: c.path, detail: parts.join('; ') };
    }
    case 'value-changed':
      return { kind: c.kind, subject: c.path, detail: describePermutations(c.permutations, c.compared, modifiers) };
    case 'deprecated':
      return { kind: c.kind, subject: c.path, detail: c.message ?? 'deprecated' };
    case 'meta-changed':
      return { kind: c.kind, subject: c.path, detail: c.fields.join(', ') };
  }
}

const POLICY_TEXT: Readonly<Record<Policy, string>> = {
  shifted: 'the base release tag is 0.x, so a major change requires a minor bump and a minor change a patch bump (ADR-0024 §14)',
  strict: 'the base release tag is 1.0 or later, so a change requires its own level (ADR-0024 §14)',
};

function bumpText(b: Bump | null): string {
  return b === null ? 'none' : b;
}

function declaredText(o: DiffOutcome): string {
  const d = o.declared;
  if (d === null) return '**none**';
  if (d.releases.length === 0) {
    return d.files.length === 0 ? '**none** (no pending changeset)' : `**none** (no changeset names ${o.packages.map(code).join(' or ')} or a package of its fixed group)`;
  }
  const by = d.releases.map((r) => `${code(r.file)}: ${code(r.name)} ${r.type}`).join('; ');
  return `**${bumpText(d.bump)}** (${by})`;
}

function diagnosticsBlock(diagnostics: readonly Diagnostic[], max: number): string[] {
  if (diagnostics.length === 0) return [];
  const shown = diagnostics.slice(0, max);
  const lines = ['', '```', formatDiagnostics(shown).replace(/```/g, "'''"), '```'];
  if (diagnostics.length > shown.length) lines.push('', `… ${diagnostics.length - shown.length} more diagnostic(s); run \`pnpm tokens:diff --json\` for all.`);
  return lines;
}

export interface RenderOptions {
  /** Table rows before the rest is elided (the step summary is size-limited). Default: all. */
  readonly maxRows?: number;
  readonly maxDiagnostics?: number;
}

/** The Markdown report of an outcome. */
export function renderMarkdown(o: DiffOutcome, opts: RenderOptions = {}): string {
  const maxRows = opts.maxRows ?? Number.POSITIVE_INFINITY;
  const maxDiagnostics = opts.maxDiagnostics ?? Number.POSITIVE_INFINITY;
  const lines: string[] = ['### Token changes (`tokens:diff`)', ''];
  const baseText = o.base === null ? null : `${code(o.base.ref)} (${code(o.base.commit.slice(0, 12))})`;

  switch (o.status) {
    case 'no-baseline':
      lines.push(`Notice: ${o.notice ?? NO_BASELINE_NOTICE}. No release tag matching ${code('^v?\\d+\\.\\d+\\.\\d+$')} is merged into HEAD yet, so no bump is required.`);
      return `${lines.join('\n')}\n`;
    case 'error':
      lines.push(`**Fail:** ${o.error ?? 'unknown error'}`);
      return `${lines.join('\n')}\n`;
    case 'invalid-baseline':
      lines.push(`**Fail:** the base ${baseText ?? ''} fails the current validation with ${o.diagnostics.length} diagnostic(s), so its tokens cannot be compared. Fix the validation, or, as a person, rerun with ${code('--allow-invalid-baseline "<reason>"')}; CI never passes it.`);
      lines.push(...diagnosticsBlock(o.diagnostics, maxDiagnostics));
      return `${lines.join('\n')}\n`;
    case 'baseline-allowed':
      lines.push(`The base ${baseText ?? ''} fails the current validation with ${o.diagnostics.length} diagnostic(s). The comparison was skipped: ${code('--allow-invalid-baseline')} was passed with the reason "${cell(o.reason ?? '')}".`);
      lines.push(...diagnosticsBlock(o.diagnostics, maxDiagnostics));
      return `${lines.join('\n')}\n`;
    case 'invalid-working-tree':
      lines.push(`**Fail:** the working tree fails validation with ${o.diagnostics.length} diagnostic(s); ${code('pnpm tokens:build')} reports the same.`);
      lines.push(...diagnosticsBlock(o.diagnostics, maxDiagnostics));
      return `${lines.join('\n')}\n`;
    default:
      break;
  }

  lines.push(`Base: ${baseText ?? '(none)'}, compared with the working tree.`, '');
  if (o.policy !== null) lines.push(`Policy: **${o.policy}** from ${code(o.tag ?? '')}: ${POLICY_TEXT[o.policy]}.`);
  else lines.push(`Policy: none: no release tag is merged into ${code(o.base?.ref ?? '')}, so no bump is required.`);
  lines.push('');

  if (o.changes.length === 0) {
    lines.push('No token changes.');
  } else {
    lines.push('| Kind | Token or context | Detail | Level |', '|------|------------------|--------|-------|');
    const shown = o.changes.slice(0, maxRows);
    for (const c of shown) {
      const d = describeChange(c, o.modifiers);
      lines.push(`| ${d.kind} | ${code(cell(d.subject))} | ${cell(d.detail)} | ${c.level} |`);
    }
    if (o.changes.length > shown.length) lines.push('', `… ${o.changes.length - shown.length} more change(s); run \`pnpm tokens:diff --json\` for all.`);
  }
  lines.push('');

  if (o.policy !== null) {
    const strictNote = o.policy === 'shifted' && o.requiredStrict !== null && o.requiredStrict !== o.required ? ` (${o.requiredStrict} before the 0.x shift)` : '';
    lines.push(`Required bump: **${bumpText(o.required)}**${strictNote}. Declared bump: ${declaredText(o)}.`);
    lines.push('');
    if (o.status === 'pass') {
      lines.push(o.required === null ? '**Pass:** nothing requires a bump.' : `**Pass:** the declared bump covers the required bump.`);
    } else {
      lines.push(`**Fail:** the declared bump (${bumpText(o.declared?.bump ?? null)}) is lower than the required bump (${bumpText(o.required)}). Declare at least ${bumpText(o.required)} for ${o.packages.map(code).join(' or ')} (or a package of its fixed group) in a ${code('.changeset/*.md')} file.`);
    }
  } else {
    lines.push(`Declared bump: ${declaredText(o)}.`);
  }
  return `${lines.join('\n')}\n`;
}

/** The JSON form of an outcome (`--json`). */
export function toJson(o: DiffOutcome): unknown {
  return {
    status: o.status,
    exitCode: o.exitCode,
    base: o.base,
    tag: o.tag,
    policy: o.policy,
    required: o.required,
    requiredStrict: o.requiredStrict,
    declared: o.declared,
    packages: o.packages,
    changes: o.changes,
    diagnostics: o.diagnostics,
    notice: o.notice,
    reason: o.reason,
    error: o.error,
  };
}
