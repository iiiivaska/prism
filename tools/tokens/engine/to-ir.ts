// Style Dictionary dictionary → PermutationIR (ARCHITECTURE §5.5): ids, raw values, alias targets,
// sub-aliases, provenance, metadata; then the brand type scale (once per token, never inside the
// transitive normalizer, where it would compound along alias chains) and ADR-0021's weight rule.
import type { TransformedToken } from 'style-dictionary/types';
import { COLOR_SCHEME_MODIFIER, EXTENSION_NAMESPACE, TYPE_SCALE_ID } from '../config.ts';
import { error } from '../ir/diagnostics.ts';
import { aliasTarget, publicPath, tierOf } from '../ir/naming.ts';
import { isNormalized } from '../ir/normalize.ts';
import { compareIds } from '../ir/order.ts';
import type { IRDimension, IRToken, IRTypography, IRValue, PermutationIR, PrismMetadata, TokenType } from '../ir/types.ts';
import { applyWeightRule, schemeOf } from '../ir/typography.ts';
import type { PermutationMeta } from './hooks.ts';

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function scaleDimension(d: IRDimension, scale: number): IRDimension {
  const value = round4(d.value * scale);
  return { kind: 'dimension', value, unit: d.unit, px: d.unit === 'rem' ? value * 16 : value };
}

/**
 * Paths of the aliases inside a composite literal, in IR terms: a single-layer shadow's `color`
 * becomes `layers.0.color`, a gradient's `0.color` becomes `stops.0.color`.
 */
export function subAliasesOf(raw: unknown, type: TokenType): Record<string, string> {
  const out: Record<string, string> = {};
  if (aliasTarget(raw) !== null) return out;
  const walk = (v: unknown, path: string): void => {
    const target = aliasTarget(v);
    if (target !== null) {
      out[path] = target;
      return;
    }
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, path === '' ? String(i) : `${path}.${i}`));
    else if (v !== null && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, path === '' ? k : `${path}.${k}`);
    }
  };
  if (type === 'shadow') {
    const layers = Array.isArray(raw) ? raw : [raw];
    layers.forEach((l, i) => walk(l, `layers.${i}`));
  } else if (type === 'gradient' && Array.isArray(raw)) {
    raw.forEach((s, i) => walk(s, `stops.${i}`));
  } else walk(raw, '');
  return out;
}

export function metadataOf(extensions: unknown): PrismMetadata {
  const ns = (extensions as Record<string, unknown> | undefined)?.[EXTENSION_NAMESPACE];
  if (ns === null || typeof ns !== 'object') return {};
  const src = ns as Record<string, unknown>;
  const out: Record<string, unknown> & PrismMetadata = {};
  for (const key of ['a11y', 'figma', 'llm', 'brand']) if (src[key] !== undefined) out[key] = src[key];
  return out;
}

export function toPermutationIR(allTokens: readonly TransformedToken[], meta: PermutationMeta): PermutationIR {
  const built: IRToken[] = [];
  for (const t of allTokens) {
    const id = t.path.join('.');
    const p = meta.provenance.get(id);
    if (p === undefined) {
      meta.diagnostics.push(error('ir/provenance', `${id} has no source declaration in ${meta.key}`, { tokenId: id, permutation: meta.key }));
      continue;
    }
    const tier = tierOf(id);
    if (tier === null) {
      // source/tier (source/analyze.ts) reports it; the build fails there.
      meta.diagnostics.push(error('source/tier', `${id} is outside the ref, sys and comp tiers`, { tokenId: id, file: p.ref.file, line: p.ref.line, hint: 'every token id starts with ref., sys. or comp.' }));
      continue;
    }
    const node = p.token.node;
    const type = t.$type as TokenType;
    if (!isNormalized(t.$value)) {
      meta.diagnostics.push(error('ir/not-normalized', `${id} did not normalize to an IR value`, { tokenId: id, file: p.ref.file, line: p.ref.line, permutation: meta.key }));
      continue;
    }
    const ns = (node['$extensions'] as Record<string, unknown> | undefined)?.[EXTENSION_NAMESPACE] as Record<string, unknown> | undefined;
    const alpha = typeof ns?.['alpha'] === 'number' ? ns['alpha'] : null;
    built.push({
      id,
      path: publicPath(id),
      tier,
      type,
      value: t.$value as IRValue,
      raw: node['$value'],
      aliasOf: aliasTarget(node['$value']),
      subAliases: subAliasesOf(node['$value'], type),
      alpha,
      description: typeof node['$description'] === 'string' ? node['$description'] : null,
      deprecated: p.token.deprecated,
      metadata: metadataOf(node['$extensions']),
      source: p.ref,
    });
  }
  built.sort((a, b) => compareIds(a.id, b.id));

  // Brand type scale (§5.5): fontSize and letterSpacing of every typography value, once per token.
  const scaleToken = built.find((t) => t.id === TYPE_SCALE_ID);
  const scale = scaleToken?.value.kind === 'number' ? scaleToken.value.value : 1;
  const scheme = schemeOf(meta.input[COLOR_SCHEME_MODIFIER]);
  const tokens = new Map<string, IRToken>();
  for (const token of built) {
    if (token.value.kind !== 'typography') {
      tokens.set(token.id, token);
      continue;
    }
    let v: IRTypography = token.value;
    if (scale !== 1) v = { ...v, fontSize: scaleDimension(v.fontSize, scale), letterSpacing: scaleDimension(v.letterSpacing, scale) };
    v = applyWeightRule(v, scheme);
    tokens.set(token.id, v === token.value ? token : { ...token, value: v });
  }
  return { key: meta.key, input: meta.input, tokens };
}
