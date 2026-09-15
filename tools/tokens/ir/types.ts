// IR types (ARCHITECTURE §4.2). Every IR value is a plain object with a `kind` discriminator at
// every level: Style Dictionary structured-clones transform results, so class instances would lose
// their prototype (§15 F6).
import type { ModifierName, ContextName, SourceLayer, ModifierInfo, BrandMeta, SourceDoc, SourceToken } from '../source/types.ts';

/** Complete input: one context per modifier. */
export type Input = Readonly<Record<ModifierName, ContextName>>;
/**
 * Canonical key; modifiers in resolutionOrder order:
 * 'brand=prism|platform=web|colorScheme=light|density=compact|modality=pointer|motion=default'
 */
export type PermKey = string;
export type Tier = 'ref' | 'sys' | 'comp';
export type TokenType =
  | 'color' | 'dimension' | 'duration' | 'number' | 'fontFamily' | 'fontWeight'
  | 'cubicBezier' | 'strokeStyle' | 'border' | 'transition' | 'shadow' | 'gradient' | 'typography';
export const TOKEN_TYPES: readonly TokenType[] = [
  'color', 'dimension', 'duration', 'number', 'fontFamily', 'fontWeight',
  'cubicBezier', 'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography',
];
/**
 * DTCG 2025.10 color spaces. Declared here because `style-dictionary/types` does not re-export
 * SD's own `DTCGColorSpace` (5.5.3).
 */
export type DTCGColorSpace =
  | 'srgb' | 'srgb-linear' | 'display-p3' | 'a98-rgb' | 'prophoto-rgb' | 'rec2020'
  | 'xyz-d50' | 'xyz-d65' | 'lab' | 'lch' | 'oklab' | 'oklch' | 'hsl' | 'hwb';
export type Triple = readonly [number, number, number];

export interface SourceRef { readonly file: string; readonly layer: SourceLayer; readonly line: number }

/** Where the winning declaration of a token id came from, in one permutation. */
export interface Provenance {
  readonly ref: SourceRef;
  readonly doc: SourceDoc;
  readonly token: SourceToken;
}

export interface IRColor {
  readonly kind: 'color';
  readonly space: DTCGColorSpace;             // as authored
  readonly components: readonly [number | 'none', number | 'none', number | 'none'];   // as authored
  readonly alpha: number;                     // 0..1, default 1; app.prism.alpha replaces it on aliases
  readonly hex: string;                       // '#rrggbb' of the CSS-gamut-mapped sRGB color
  readonly srgb: Triple;                      // gamut-mapped to sRGB (method 'css'), gamma-encoded 0..1, unrounded
  readonly p3: Triple;                        // gamut-mapped to Display P3 (method 'css'), 0..1, unrounded
  readonly oklch: Triple;                     // authored color in OKLCH, unmapped; achromatic hue → 0
  readonly inSrgb: boolean;
  readonly inP3: boolean;
}
export interface IRDimension { readonly kind: 'dimension'; readonly value: number; readonly unit: 'px' | 'rem'; readonly px: number }
export interface IRDuration { readonly kind: 'duration'; readonly ms: number }
export interface IRNumber { readonly kind: 'number'; readonly value: number; readonly flag: boolean }
export interface IRFontFamily { readonly kind: 'fontFamily'; readonly families: readonly string[]; readonly opsz: number | null }
export interface IRFontWeight { readonly kind: 'fontWeight'; readonly weight: number }
export interface IRCubicBezier { readonly kind: 'cubicBezier'; readonly points: readonly [number, number, number, number] }
export type StrokeKeyword = 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'outset' | 'inset';
export interface IRStrokeStyle {
  readonly kind: 'strokeStyle';
  readonly keyword: StrokeKeyword | null;
  readonly dashArray: readonly IRDimension[];
  readonly lineCap: 'round' | 'butt' | 'square' | null;
}
export interface IRBorder { readonly kind: 'border'; readonly color: IRColor; readonly width: IRDimension; readonly style: IRStrokeStyle }
export interface IRShadowLayer {
  readonly kind: 'shadowLayer';
  readonly color: IRColor; readonly offsetX: IRDimension; readonly offsetY: IRDimension;
  readonly blur: IRDimension; readonly spread: IRDimension; readonly inset: boolean;
}
export interface IRShadow { readonly kind: 'shadow'; readonly layers: readonly IRShadowLayer[] }
export interface IRGradientStop { readonly kind: 'gradientStop'; readonly color: IRColor; readonly position: number }
export interface IRGradient {
  readonly kind: 'gradient';
  readonly stops: readonly IRGradientStop[];
  readonly angle: number | null;                                 // app.prism.angle (degrees)
  readonly grain: number | null;                                 // app.prism.grain
  readonly scheme: 'light' | 'dark' | null;                      // app.prism.scheme
  readonly bloom: { readonly alpha: number; readonly blur: number | null } | null;
}
export type TextStyleName = 'largeTitle' | 'title' | 'title2' | 'title3' | 'headline' | 'body'
  | 'callout' | 'subheadline' | 'footnote' | 'caption' | 'caption2';
export type FontSlotName = 'ui' | 'display' | 'mono';
export interface IRTypography {
  readonly kind: 'typography';
  readonly fontFamily: IRFontFamily; readonly fontSize: IRDimension;
  readonly fontWeight: IRFontWeight;                             // per permutation, after ADR-0021 §4's rule
  readonly boldWeight: number;                                   // s ≤ 300 ? 400 : min(900, s + 200) (ADR-0021 §3); Apple only
  readonly darkWeight: number | null;                            // app.prism.darkWeight, folded, never emitted
  readonly lineHeight: number; readonly letterSpacing: IRDimension;
  readonly slot: FontSlotName;                                   // app.prism.slot (type/role-metadata)
  readonly numeric: 'proportional' | 'tabular';                  // app.prism.numeric
  readonly textStyle: TextStyleName;                             // app.prism.textStyle
}
export interface IRSpring { readonly duration: number; readonly bounce: number; readonly blendDuration: number }   // Apple parameters, seconds
export interface IRTransition {
  readonly kind: 'transition';
  readonly duration: IRDuration; readonly delay: IRDuration; readonly timingFunction: IRCubicBezier;
  readonly spring: IRSpring | null;                              // app.prism.spring (settle is derived, §7.6)
}
export type IRValue = IRColor | IRDimension | IRDuration | IRNumber | IRFontFamily | IRFontWeight | IRCubicBezier
  | IRStrokeStyle | IRBorder | IRShadow | IRGradient | IRTypography | IRTransition;

/** Metadata keys of $extensions["app.prism"] that are never inherited through aliases. */
export interface PrismMetadata {
  readonly a11y?: { readonly pairsWith?: readonly string[]; readonly minContrast?: number };
  readonly figma?: { readonly collection?: string; readonly scopes?: readonly string[]; readonly codeSyntax?: Readonly<Record<string, string>> };
  readonly llm?: { readonly usage?: readonly string[]; readonly rules?: string };
  readonly brand?: string;
}

export interface IRToken {
  readonly id: string;                        // 'sys.color.bg.surface.$root'
  readonly path: string;                      // public path (§8): 'color.bg.surface'
  readonly tier: Tier;
  readonly type: TokenType;
  readonly value: IRValue;                    // fully resolved and normalized
  readonly raw: unknown;                      // authored $value of the winning declaration (aliases kept)
  readonly aliasOf: string | null;            // immediate target id when raw is exactly '{…}'
  readonly subAliases: Readonly<Record<string, string>>;   // e.g. { fontFamily: 'ref.font.ui', 'layers.0.color': '…' }
  readonly alpha: number | null;              // own app.prism.alpha (ADR-0020 §3); formats render such a token as a literal
  readonly description: string | null;
  readonly deprecated: string | true | null;
  readonly metadata: PrismMetadata;
  readonly source: SourceRef;                 // layer and file of the winning declaration
}

export interface PermutationIR {
  readonly key: PermKey;
  readonly input: Input;
  readonly tokens: ReadonlyMap<string, IRToken>;   // insertion order = §12 order
}

export type RuntimeAxis = 'colorScheme' | 'density' | 'modality' | 'motion';
export type ScopeKey = string;                // 'brand=prism|platform=web'
export interface TokenDeps {
  readonly axes: readonly RuntimeAxis[];      // runtime modifiers that change the resolved value (≤ 1, §5.7)
  readonly increasedContrast: readonly ('light' | 'dark')[];     // base schemes whose IC variant changes the value
  readonly reducedTransparency: readonly ('light' | 'dark')[];   // base schemes whose RT variant changes the value
}
export interface ScopeAnalysis {
  readonly input: Input;                      // the scope's default permutation input
  readonly deps: ReadonlyMap<string, TokenDeps>;
  readonly proof: { readonly permutations: number; readonly comparisons: number };
}
export interface Analysis {
  readonly scopes: ReadonlyMap<ScopeKey, ScopeAnalysis>;
  /** False when the bundle was built with a filter: the analysis then covers no scope. */
  readonly complete: boolean;
}

export interface IRBundle {
  readonly model: { readonly name: string | null; readonly modifiers: readonly ModifierInfo[] };
  readonly brands: ReadonlyMap<string, BrandMeta>;
  readonly permutations: ReadonlyMap<PermKey, PermutationIR>;
  readonly analysis: Analysis;
}

export interface Diagnostic {
  readonly code: string;                      // 'ref/group-reference', 'completeness/missing', …
  readonly severity: 'error' | 'warning';     // only errors fail; P1 checks emit no warnings
  readonly message: string;
  readonly hint?: string;                     // the fix, e.g. 'write {sys.color.bg.surface.$root}'
  readonly tokenId?: string;
  readonly file?: string;
  readonly line?: number;
  readonly permutation?: PermKey;
}
