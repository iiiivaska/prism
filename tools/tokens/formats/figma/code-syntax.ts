// Figma code syntax (ADR-0026 decision 2, ARCHITECTURE §9.10): derived from the build's naming rules
// (ARCHITECTURE §8), never authored. This is the one derivation: `WEB` is the CSS custom property the
// web outputs declare, wrapped in `var()`; `iOS` is the member path on the Swift token set
// (`tokens.color.bgSurface`, `tokens.space.cardPadding`, `tokens.components.button.radius`).
//
// A typography role is split into five Figma variables; each one names the declaration that carries
// that primitive (`var(--ds-type-body-md-font-size)`) and the `DSTypeRole` field of the role
// (`tokens.typography.bodyMd.size`); the family comes from the brand face of the role's slot, which
// is also where `sys.font.*` points on Apple (`tokens.context.brand.faces[.ui]`). A spring is split
// into its Apple `duration` and `bounce`; the web consumes a spring as one transition value, so both
// halves name the transition shorthand (`var(--ds-motion-spring-snappy)`), and iOS names the
// `DSSpringToken` fields.
//
// Code syntax names the member that carries a primitive, which does not always hold the variable's
// quantity: a `letter-spacing` variable is px at the role's size (the flavor exports every dimension
// in px, ARCHITECTURE §9.10), while the web declaration and `trackingEm` are em; no web property holds
// a spring's Apple duration or bounce. `tokens/export/README.md` says so, and ARCHITECTURE V4 checks
// whether Figma's import takes em.
//
// The key Figma's native import reads is `$extensions["com.figma.codeSyntax"]` with the platform
// names of the Figma variables API (`WEB`, `ANDROID`, `iOS`); ARCHITECTURE V4 confirms it with one
// manual import.
import { cssName, swiftNameOf } from '../../ir/naming.ts';
import type { IRToken } from '../../ir/types.ts';
import { TYPOGRAPHY_SUFFIX_OF } from '../../transforms/typography.ts';

export const CODE_SYNTAX_KEY = 'com.figma.codeSyntax';
/** The variable a Swift view holds its `DSTokenSet` in, as ADR-0026 writes it. */
export const IOS_ROOT = 'tokens';

export type TypographyField = 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing';
export type SpringField = 'duration' | 'bounce';

/** Which primitive of a split composite a Figma variable holds; null for a whole token. */
export type FigmaPart =
  | { readonly kind: 'typography'; readonly field: TypographyField }
  | { readonly kind: 'spring'; readonly field: SpringField };

export interface CodeSyntax {
  readonly WEB: string;
  readonly iOS: string;
}

/** `DSTypeRole` fields (ARCHITECTURE §9.7.2) per typography primitive; the family comes from `DSBrand.faces`. */
export const SWIFT_TYPE_ROLE_FIELDS: Readonly<Record<Exclude<TypographyField, 'fontFamily'>, string>> = {
  fontSize: 'size',
  fontWeight: 'weight',
  lineHeight: 'lineHeight',
  letterSpacing: 'trackingEm',
};
/** `DSSpringToken` fields (ARCHITECTURE §9.7.2) per spring primitive. */
export const SWIFT_SPRING_FIELDS: Readonly<Record<SpringField, string>> = { duration: 'duration', bounce: 'bounce' };

/** The CSS declaration a variable reads: the token's custom property, or a typography sub-declaration. */
export function webCodeSyntax(id: string, part: FigmaPart | null): string {
  const suffix = part?.kind === 'typography' ? TYPOGRAPHY_SUFFIX_OF[part.field] : '';
  return `var(${cssName(id)}${suffix})`;
}

function brandFace(slot: string): string {
  return `${IOS_ROOT}.context.brand.faces[.${slot}]`;
}

/** The Swift expression of a variable on a `DSTokenSet` named `tokens`; null for an id with no Swift member. */
export function iosCodeSyntax(token: Pick<IRToken, 'id' | 'value'>, part: FigmaPart | null): string | null {
  const s = swiftNameOf(token.id);
  let base: string;
  switch (s.kind) {
    case 'color':
      base = `${IOS_ROOT}.color.${s.member}`;
      break;
    case 'tokenSet':
      base = `${IOS_ROOT}.${s.path.join('.')}`;
      break;
    case 'brandFace':
      return part === null ? brandFace(s.slot) : null;
    case 'none':
    case 'unknown':
      return null;
  }
  if (part === null) return base;
  if (part.kind === 'spring') return `${base}.${SWIFT_SPRING_FIELDS[part.field]}`;
  if (part.field === 'fontFamily') return token.value.kind === 'typography' ? brandFace(token.value.slot) : null;
  return `${base}.${SWIFT_TYPE_ROLE_FIELDS[part.field]}`;
}

/** Both code syntaxes of a variable, or null when the token has no Swift member (a build error elsewhere). */
export function codeSyntax(token: Pick<IRToken, 'id' | 'value'>, part: FigmaPart | null): CodeSyntax | null {
  const iOS = iosCodeSyntax(token, part);
  return iOS === null ? null : { WEB: webCodeSyntax(token.id, part), iOS };
}
