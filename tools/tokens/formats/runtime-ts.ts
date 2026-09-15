// `prism/runtime-ts`: the brand-invariant `runtime.ts` (ADR-0019 §3; ARCHITECTURE §9.5): the web
// runtime table, the axis types, `TokenContext`, `defaultContext`, `platformDefaults` and
// `ScopeAttributes`, all generated from `WEB_RUNTIME` and `PLATFORM_DEFAULTS` in config.ts, the one
// hand-written source of the contract (ADR-0019 rule 1). `<brand>/tokens.ts` imports it.
import { PLATFORM_DEFAULTS, WEB_OUTPUT_ROOT, WEB_RUNTIME, type PlatformDefault, type WebRuntimeAxis } from '../config.ts';
import { error, type Diagnostic } from '../ir/diagnostics.ts';
import { tsHeader } from './header.ts';
import type { FormatOutput } from './index.ts';
import { jsDoc, tsInline, tsKey, tsString } from './ts-literal.ts';

export const RUNTIME_TS_PATH = `${WEB_OUTPUT_ROOT}/runtime.ts`;

/** `colorScheme` → `ColorScheme`: the axis type names. */
export function axisTypeName(axis: string): string {
  return axis.charAt(0).toUpperCase() + axis.slice(1);
}

export function renderRuntimeText(): string {
  const axes = Object.entries(WEB_RUNTIME);
  const lines: string[] = [tsHeader('tools/tokens/config.ts', 'WEB_RUNTIME, PLATFORM_DEFAULTS'), ''];
  lines.push(...jsDoc([
    'The web runtime contract (ADR-0019 §1): per axis the attribute, the closed values (the first is the',
    'default), whether it acts on any element or on <html> only, and its one media fallback. Only a listed',
    'value counts; an absent, empty or unknown value behaves like no attribute.',
  ], ''));
  lines.push('export const webRuntime = {');
  for (const [axis, r] of axes) {
    lines.push(`  ${tsKey(axis)}: { attribute: ${tsString(r.attribute)}, values: ${tsInline(r.values)}, nestable: ${r.nestable ? 'true' : 'false'}, media: ${tsInline({ value: r.media.value, query: r.media.query })} },`);
  }
  lines.push('} as const;', '');
  lines.push('export type RuntimeAxis = keyof typeof webRuntime;');
  for (const [axis, r] of axes) lines.push(`export type ${axisTypeName(axis)} = ${r.values.map(tsString).join(' | ')};`);
  lines.push('');
  lines.push(...jsDoc(['The effective context of an element. No brand field: a document loads one brand (ADR-0020 §6).'], ''));
  lines.push('export interface TokenContext {');
  for (const [axis] of axes) lines.push(`  readonly ${tsKey(axis)}: ${axisTypeName(axis)};`);
  lines.push('}', '');
  lines.push(...jsDoc(['The resolver default: the web root with no attribute set and no fallback query matching (ADR-0019 §1 item 5).'], ''));
  lines.push(`export const defaultContext: TokenContext = ${tsInline(Object.fromEntries(axes.map(([axis, r]) => [axis, r.values[0] ?? ''])))};`, '');
  lines.push(...jsDoc(['Where each platform starts (ADR-0019 §2); the web values are what the media fallbacks select on a desktop.'], ''));
  lines.push('export const platformDefaults = {');
  for (const [platform, d] of Object.entries(PLATFORM_DEFAULTS)) {
    const fields: Record<string, string> = {};
    for (const [axis] of axes) {
      const v = (d as unknown as Record<string, string | undefined>)[axis];
      if (v !== undefined) fields[axis] = v;
    }
    lines.push(`  ${tsKey(platform)}: ${tsInline(fields)},`);
  }
  lines.push('} as const;', '');
  lines.push(...jsDoc(['The attributes any element may carry to scope the nestable axes (ADR-0019 §1 item 4); components forward them.'], ''));
  lines.push('export interface ScopeAttributes {');
  for (const [axis, r] of axes) if (r.nestable) lines.push(`  readonly ${tsString(r.attribute)}?: ${axisTypeName(axis)};`);
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

/** Every PLATFORM_DEFAULTS value is a value of its WEB_RUNTIME axis (the parameters let a test pass a broken table). */
export function checkPlatformDefaults(
  defaults: Readonly<Record<string, PlatformDefault>> = PLATFORM_DEFAULTS,
  runtime: Readonly<Record<string, WebRuntimeAxis>> = WEB_RUNTIME,
): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const [platform, d] of Object.entries(defaults)) {
    for (const [axis, value] of Object.entries(d as unknown as Record<string, string | undefined>)) {
      const r = runtime[axis];
      if (value === undefined) continue;
      if (r === undefined || !r.values.includes(value)) {
        out.push(error('runtime/platform-default', `PLATFORM_DEFAULTS.${platform}.${axis} is ${JSON.stringify(value)}, which is not a value of WEB_RUNTIME.${axis} (ADR-0019 §2)`, { file: 'tools/tokens/config.ts' }));
      }
    }
  }
  return out;
}

export function renderRuntimeTs(): FormatOutput {
  return { files: [{ path: RUNTIME_TS_PATH, contents: renderRuntimeText() }], diagnostics: checkPlatformDefaults() };
}
