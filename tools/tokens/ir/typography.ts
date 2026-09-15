// ADR-0021's weight rule and its checks (ARCHITECTURE §5.5, §5.7 item 8). One rule, applied after
// the brand type scale to every typography value in every permutation (ref, sys and comp alike):
//
//   s          = (base scheme is dark && darkWeight != null) ? darkWeight : fontWeight
//   fontWeight = colorScheme is an *-increased-contrast context ? max(400, s) : s
//   boldWeight = s <= 300 ? 400 : min(900, s + 200)
import {
  APPLE_PLATFORMS, BASE_SCHEMES, BRAND_MODIFIER, COLOR_SCHEME_MODIFIER, LIGHT_MIN_PX, PLATFORM_MODIFIER,
  SCHEME_VARIANT_SUFFIXES, SYSTEM_FONT_DESIGNS, THIN_MIN_PX, WEIGHT_FLOOR, type BaseScheme, type SchemeVariant,
} from '../config.ts';
import type { SourceModel } from '../source/types.ts';
import { error, type Diagnostic } from './diagnostics.ts';
import { matches } from './glob.ts';
import { boldWeightOf } from './normalize.ts';
import type { IRToken, IRTypography, PermutationIR } from './types.ts';

export { boldWeightOf } from './normalize.ts';

export interface SchemeInfo { readonly base: BaseScheme | null; readonly variant: SchemeVariant }

/** 'dark-increased-contrast' → { base: 'dark', variant: 'increasedContrast' }. */
export function schemeOf(context: string | undefined): SchemeInfo {
  if (context === undefined) return { base: null, variant: 'none' };
  for (const [suffix, variant] of Object.entries(SCHEME_VARIANT_SUFFIXES)) {
    if (context.endsWith(suffix)) {
      const base = context.slice(0, -suffix.length);
      return { base: (BASE_SCHEMES as readonly string[]).includes(base) ? (base as BaseScheme) : null, variant };
    }
  }
  return { base: (BASE_SCHEMES as readonly string[]).includes(context) ? (context as BaseScheme) : null, variant: 'none' };
}

/** The permutation's weights of a role whose `fontWeight` is still the standard weight. */
export function applyWeightRule(t: IRTypography, scheme: SchemeInfo): IRTypography {
  const standard = t.fontWeight.weight;
  const s = scheme.base === 'dark' && t.darkWeight !== null ? t.darkWeight : standard;
  const weight = scheme.variant === 'increasedContrast' ? Math.max(WEIGHT_FLOOR, s) : s;
  const bold = boldWeightOf(s);
  if (weight === standard && bold === t.boldWeight) return t;
  return { ...t, fontWeight: { kind: 'fontWeight', weight }, boldWeight: bold };
}

function chainRoot(perm: PermutationIR, token: IRToken): IRToken {
  let t = token;
  const seen = new Set<string>();
  while (t.aliasOf !== null && !seen.has(t.id)) {
    seen.add(t.id);
    const next = perm.tokens.get(t.aliasOf);
    if (next === undefined) break;
    t = next;
  }
  return t;
}

/** type/thin-weight, type/light-weight, type/contrast-floor and type/weight-instance over every permutation. */
export function checkTypography(perms: readonly PermutationIR[], model: SourceModel): Diagnostic[] {
  const out: Diagnostic[] = [];
  const at = (t: IRToken, permutation: string): { tokenId: string; file: string; line: number; permutation: string } => ({
    tokenId: t.id, file: t.source.file, line: t.source.line, permutation,
  });
  const defaultBrand = model.modifiers.find((m) => m.name === BRAND_MODIFIER)?.default ?? null;
  const brandMeta = defaultBrand === null ? undefined : model.brands.get(defaultBrand);
  const instanceSeen = new Set<string>();

  for (const perm of perms) {
    const scheme = schemeOf(perm.input[COLOR_SCHEME_MODIFIER]);
    const ic = scheme.variant === 'increasedContrast';
    const platform = perm.input[PLATFORM_MODIFIER];
    const checkInstances = brandMeta !== undefined && perm.input[BRAND_MODIFIER] === defaultBrand &&
      platform !== undefined && APPLE_PLATFORMS.includes(platform);
    for (const token of perm.tokens.values()) {
      // A literal fontWeight token below 400 outside ref.type is type/weight-outside-role (source check).
      if (token.value.kind === 'fontWeight' && ic && token.value.weight < WEIGHT_FLOOR && token.aliasOf === null && matches('ref.type.**', token.id)) {
        out.push(error('type/contrast-floor', `${token.id} has weight ${token.value.weight} in an increased-contrast context; every typography weight is at least ${WEIGHT_FLOOR} there (ADR-0021 §3)`, at(token, perm.key)));
      }
      if (token.value.kind !== 'typography') continue;
      const t = token.value;
      const w = t.fontWeight.weight;
      if (ic && w < WEIGHT_FLOOR) {
        out.push(error('type/contrast-floor', `${token.id} renders weight ${w} in an increased-contrast context; Increase Contrast floors every weight at ${WEIGHT_FLOOR} (ADR-0021 §3)`, at(token, perm.key)));
      }
      if (token.aliasOf === null) {
        if (w < 300) {
          const root = chainRoot(perm, token);
          const metric = matches('ref.type.metric.*', root.id);
          const darkBase = scheme.base === 'dark' && scheme.variant !== 'increasedContrast';
          if (!metric || t.fontSize.px < THIN_MIN_PX || !darkBase) {
            out.push(
              error('type/thin-weight', `${token.id} renders weight ${w} at ${t.fontSize.px} px${scheme.base === null ? '' : ` in the ${scheme.base} scheme`}; a weight below 300 exists only as the darkWeight of a type.metric.* role of at least ${THIN_MIN_PX} px, in the dark scheme (ADR-0021 §2)`, {
                ...at(token, perm.key),
                hint: metric ? `raise fontSize to ${THIN_MIN_PX} px or more, or remove darkWeight` : 'use 300, 400 or 500; thin weights exist only as a metric role\'s darkWeight',
              }),
            );
          }
        } else if (w === 300 && t.fontSize.px < LIGHT_MIN_PX) {
          out.push(error('type/light-weight', `${token.id} renders weight 300 at ${t.fontSize.px} px; weight 300 needs at least ${LIGHT_MIN_PX} px (ADR-0021 §2)`, { ...at(token, perm.key), hint: 'use weight 400 or a larger size' }));
        }
      }
      if (checkInstances && brandMeta !== undefined) {
        const face = perm.tokens.get(`sys.font.${t.slot}`)?.value;
        const family = face?.kind === 'fontFamily' ? face.families[0] : undefined;
        if (family === undefined || Object.hasOwn(SYSTEM_FONT_DESIGNS, family)) continue;
        const entry = Object.values(brandMeta.fonts).find((f) => f.family === family && f.platforms.includes('apple'));
        if (entry === undefined) continue;   // font/apple-face reports the face
        for (const weight of [w, t.boldWeight]) {
          const key = `${family}|${weight}`;
          if (instanceSeen.has(key) || Object.hasOwn(entry.postscript, String(weight))) continue;
          instanceSeen.add(key);
          out.push(
            error('type/weight-instance', `${token.id} needs weight ${weight} of ${family} on Apple (slot ${t.slot}), but brand.json of "${brandMeta.name}" lists no PostScript instance for it (ADR-0021 rule 4)`, {
              ...at(token, perm.key),
              hint: `add "${weight}" to the postscript map of ${family} if the font has that instance, or change the role's weight`,
            }),
          );
        }
      }
    }
  }
  return out;
}
