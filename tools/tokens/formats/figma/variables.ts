// The Figma-native flavor model (ARCHITECTURE §9.10; ADR-0024 §12, ADR-0026): one file per brand ×
// colorScheme context, each resolved from the IR at `platform=web` with every other modifier at its
// default (density `compact` since ADR-0019), so each file imports as one mode. Only `sys` and `comp`
// tokens, named by public path as nested groups (`$root` → `default`), and only what Figma variables
// import: sRGB colors with `alpha` and a 6-digit `hex`, px dimensions, second durations, one font
// family name, numbers, flags as numbers marked `com.figma.type: "boolean"`. Typography splits into
// five primitives and a spring into its duration and bounce. Values only, no aliases. Shadows,
// gradients, cubic Béziers, transitions without a spring, stroke styles and borders are omitted and
// listed in `tokens/export/README.md`.
import { BRAND_MODIFIER, COLOR_SCHEME_MODIFIER, PATHS, PLATFORM_MODIFIER, WEB_PLATFORM } from '../../config.ts';
import { error, type Diagnostic } from '../../ir/diagnostics.ts';
import { flavorPath } from '../../ir/naming.ts';
import { sortIds } from '../../ir/order.ts';
import type { IRBundle, IRToken, PermutationIR, TokenType } from '../../ir/types.ts';
import { figmaColor } from '../../transforms/color.ts';
import { figmaDimension } from '../../transforms/dimension.ts';
import { figmaDuration } from '../../transforms/duration.ts';
import { figmaFontFamily, tsFontWeight } from '../../transforms/font.ts';
import { figmaNumber } from '../../transforms/number.ts';
import { figmaSpring } from '../../transforms/spring.ts';
import { figmaTypography } from '../../transforms/typography.ts';
import { brandsOf } from '../css/web.ts';
import { placeNode, type JsonObject } from '../tokens-studio/tree.ts';
import { CODE_SYNTAX_KEY, codeSyntax, type FigmaPart, type TypographyField } from './code-syntax.ts';

/** Where the flavor goes (ARCHITECTURE §9.0). */
export const FIGMA_ROOT = `${PATHS.export}/figma`;
/** The mode name of a model without a colorScheme modifier (fixtures). */
export const SINGLE_SCHEME = 'default';

export const SCOPES_KEY = 'com.figma.scopes';
export const FIGMA_TYPE_KEY = 'com.figma.type';

export interface FigmaMode {
  readonly brand: string;
  readonly colorScheme: string;
  readonly permutation: PermutationIR;
  /** `tokens/export/figma/<brand>/<colorScheme>.json` */
  readonly path: string;
}

/** Every brand × colorScheme context at platform=web and the other modifiers' defaults. */
export function figmaModes(bundle: IRBundle): FigmaMode[] {
  const mods = bundle.model.modifiers;
  const schemes = mods.find((m) => m.name === COLOR_SCHEME_MODIFIER)?.contexts ?? [SINGLE_SCHEME];
  const out: FigmaMode[] = [];
  for (const brand of brandsOf(bundle)) {
    for (const colorScheme of schemes) {
      const key = mods
        .map((m) => {
          if (m.name === BRAND_MODIFIER) return `${m.name}=${brand}`;
          if (m.name === PLATFORM_MODIFIER) return `${m.name}=${m.contexts.includes(WEB_PLATFORM) ? WEB_PLATFORM : m.default}`;
          if (m.name === COLOR_SCHEME_MODIFIER) return `${m.name}=${colorScheme}`;
          return `${m.name}=${m.default}`;
        })
        .join('|');
      const permutation = bundle.permutations.get(key);
      if (permutation === undefined) throw new Error(`permutation ${key} is not in the bundle; the Figma flavor needs brand × colorScheme at platform=web`);
      out.push({ brand, colorScheme, permutation, path: `${FIGMA_ROOT}/${brand}/${colorScheme}.json` });
    }
  }
  return out;
}

export interface FigmaNode {
  readonly $type: 'color' | 'dimension' | 'duration' | 'fontFamily' | 'number';
  readonly $value: unknown;
  readonly $description?: string;
  readonly $extensions: Readonly<Record<string, unknown>>;
}

export interface FigmaVariable {
  readonly id: string;
  /** The group path in the file: the flavor path, plus the primitive's name for a split composite. */
  readonly path: readonly string[];
  readonly part: FigmaPart | null;
  readonly node: FigmaNode;
}

export interface FigmaOmission {
  readonly id: string;
  readonly type: TokenType;
  readonly reason: string;
}

/** The omitted types and why (Figma variables hold colors, numbers, strings and booleans only). */
export const FIGMA_OMITTED: Readonly<Partial<Record<TokenType, string>>> = {
  shadow: 'Figma variables hold no shadows',
  gradient: 'Figma variables hold no gradients',
  cubicBezier: 'Figma variables hold no cubic Béziers',
  strokeStyle: 'Figma variables hold no stroke styles',
  border: 'Figma variables hold no borders',
};
export const TRANSITION_OMITTED = 'Figma variables hold no transitions (a spring exports its duration and bounce)';

/** The primitive names of a split typography role (ARCHITECTURE §9.10). */
export const TYPOGRAPHY_PARTS: readonly (readonly [string, TypographyField])[] = [
  ['font-family', 'fontFamily'],
  ['font-size', 'fontSize'],
  ['font-weight', 'fontWeight'],
  ['line-height', 'lineHeight'],
  ['letter-spacing', 'letterSpacing'],
];

function isExported(token: IRToken): boolean {
  return token.tier === 'sys' || token.tier === 'comp';
}

function node(token: IRToken, part: FigmaPart | null, $type: FigmaNode['$type'], $value: unknown, extra: Readonly<Record<string, unknown>> = {}): FigmaNode {
  const ext: Record<string, unknown> = {};
  const syntax = codeSyntax(token, part);
  if (syntax !== null) ext[CODE_SYNTAX_KEY] = { WEB: syntax.WEB, iOS: syntax.iOS };
  const scopes = part === null ? token.metadata.figma?.scopes : undefined;
  if (scopes !== undefined) ext[SCOPES_KEY] = [...scopes];
  Object.assign(ext, extra);
  return {
    $type,
    $value,
    ...(token.description === null ? {} : { $description: token.description }),
    $extensions: ext,
  };
}

/** The Figma variables of one token (none when its type is omitted). */
export function variablesOf(token: IRToken): FigmaVariable[] | FigmaOmission {
  const path = flavorPath(token.id);
  const v = token.value;
  const whole = (n: FigmaNode): FigmaVariable[] => [{ id: token.id, path, part: null, node: n }];
  switch (v.kind) {
    case 'color':
      return whole(node(token, null, 'color', figmaColor(v)));
    case 'dimension':
      return whole(node(token, null, 'dimension', figmaDimension(v)));
    case 'duration':
      return whole(node(token, null, 'duration', figmaDuration(v)));
    case 'fontFamily':
      return whole(node(token, null, 'fontFamily', figmaFontFamily(v)));
    case 'fontWeight':
      return whole(node(token, null, 'number', tsFontWeight(v)));
    case 'number': {
      const n = figmaNumber(v);
      return whole(node(token, null, 'number', n.$value, n.$extensions ?? {}));
    }
    case 'typography': {
      const t = figmaTypography(v);
      const types: Readonly<Record<TypographyField, FigmaNode['$type']>> = {
        fontFamily: 'fontFamily', fontSize: 'dimension', fontWeight: 'number', lineHeight: 'number', letterSpacing: 'dimension',
      };
      return TYPOGRAPHY_PARTS.map(([name, field]) => {
        const part: FigmaPart = { kind: 'typography', field };
        return { id: token.id, path: [...path, name], part, node: node(token, part, types[field], t[name as keyof typeof t]) };
      });
    }
    case 'transition': {
      if (v.spring === null) return { id: token.id, type: token.type, reason: TRANSITION_OMITTED };
      const s = figmaSpring(v.spring);
      return [
        { id: token.id, path: [...path, 'duration'], part: { kind: 'spring', field: 'duration' }, node: node(token, { kind: 'spring', field: 'duration' }, 'duration', s.duration) },
        { id: token.id, path: [...path, 'bounce'], part: { kind: 'spring', field: 'bounce' }, node: node(token, { kind: 'spring', field: 'bounce' }, 'number', s.bounce) },
      ];
    }
    case 'shadow':
    case 'gradient':
    case 'cubicBezier':
    case 'strokeStyle':
    case 'border':
      return { id: token.id, type: token.type, reason: FIGMA_OMITTED[token.type] ?? token.type };
  }
}

export interface FigmaFile {
  readonly mode: FigmaMode;
  readonly tree: JsonObject;
  readonly variables: readonly FigmaVariable[];
  readonly omitted: readonly FigmaOmission[];
  readonly diagnostics: readonly Diagnostic[];
}

/** One mode's file: the exported tokens of its permutation in canonical order (§12). */
export function figmaFile(mode: FigmaMode): FigmaFile {
  const tree: JsonObject = {};
  const variables: FigmaVariable[] = [];
  const omitted: FigmaOmission[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const id of sortIds(mode.permutation.tokens.keys())) {
    const token = mode.permutation.tokens.get(id);
    if (token === undefined || !isExported(token)) continue;
    const vars = variablesOf(token);
    if (!Array.isArray(vars)) {
      omitted.push(vars);
      continue;
    }
    for (const v of vars) {
      const clash = placeNode(tree, v.path, { ...v.node });
      if (clash !== null) {
        diagnostics.push(error('naming/flavor-collision', `${v.id} and another token both become "${clash}" in ${mode.path}`, { tokenId: v.id, permutation: mode.permutation.key, hint: 'rename one of them ($root is written as "default")' }));
        continue;
      }
      variables.push(v);
    }
  }
  return { mode, tree, variables, omitted, diagnostics };
}

/** Every Figma file of the bundle, in mode order. */
export function figmaFiles(bundle: IRBundle): FigmaFile[] {
  return figmaModes(bundle).map(figmaFile);
}
