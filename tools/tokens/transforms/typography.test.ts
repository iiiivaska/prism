// Typography renderers (ARCHITECTURE §7.7; ADR-0021 §4–§6, §10 and rule 6).
import { describe, expect, it } from 'vitest';
import type { IRTypography } from '../ir/types.ts';
import { cssNumeric, cssTypography, figmaTypography, studioTypography, swiftTypeRole, trackingFraction, tsTypography, TYPOGRAPHY_SUFFIX_OF } from './typography.ts';

function role(over: Partial<IRTypography> = {}): IRTypography {
  return {
    kind: 'typography',
    fontFamily: { kind: 'fontFamily', families: ['Onest', 'system-ui', 'sans-serif'], opsz: null },
    fontSize: { kind: 'dimension', value: 15, unit: 'px', px: 15 },
    fontWeight: { kind: 'fontWeight', weight: 400 },
    boldWeight: 600,
    darkWeight: null,
    lineHeight: 1.5,
    letterSpacing: { kind: 'dimension', value: 0, unit: 'px', px: 0 },
    slot: 'ui',
    numeric: 'proportional',
    textStyle: 'subheadline',
    ...over,
  };
}

/** ref.type.display.xl after the rule of ADR-0021 §4 in the light scheme. */
const displayXl = role({
  fontSize: { kind: 'dimension', value: 64, unit: 'px', px: 64 },
  fontWeight: { kind: 'fontWeight', weight: 300 },
  boldWeight: 400,
  lineHeight: 1,
  letterSpacing: { kind: 'dimension', value: -1.28, unit: 'px', px: -1.28 },
  slot: 'display',
  textStyle: 'largeTitle',
});

describe('CSS', () => {
  it('writes the six sub-declarations in §12 order, rem size, unitless line height, em tracking, no font-style', () => {
    expect(cssTypography(role()).map((p) => [p.suffix, p.value])).toEqual([
      ['-font-family', '"Onest", system-ui, sans-serif'],
      ['-font-size', '0.9375rem'],
      ['-font-variant-numeric', 'normal'],
      ['-font-weight', '400'],
      ['-letter-spacing', '0em'],
      ['-line-height', '1.5'],
    ]);
    expect(cssTypography(displayXl).map((p) => [p.suffix, p.value])).toEqual([
      ['-font-family', '"Onest", system-ui, sans-serif'],
      ['-font-size', '4rem'],
      ['-font-variant-numeric', 'normal'],
      ['-font-weight', '300'],
      ['-letter-spacing', '-0.02em'],
      ['-line-height', '1'],
    ]);
    expect(cssTypography(role()).some((p) => p.suffix.includes('style') || p.value.includes('italic'))).toBe(false);
    expect(cssTypography(role()).every((p) => p.twins.length === 0)).toBe(true);
  });

  it('tabular figures print tabular-nums, proportional ones normal (ADR-0021 §5)', () => {
    expect(cssNumeric(role({ numeric: 'tabular' }))).toBe('tabular-nums');
    expect(cssNumeric(role())).toBe('normal');
  });

  it('the resolved weight is printed, never boldWeight or darkWeight (the web has no Bold Text)', () => {
    const dark = role({ fontWeight: { kind: 'fontWeight', weight: 200 }, darkWeight: 200, boldWeight: 400 });
    const weights = cssTypography(dark).filter((p) => p.suffix === '-font-weight').map((p) => p.value);
    expect(weights).toEqual(['200']);
    expect(cssTypography(dark).map((p) => p.value)).not.toContain('400');
  });

  it('maps each aliasable sub-value to its suffix', () => {
    expect(Object.values(TYPOGRAPHY_SUFFIX_OF).every((s) => cssTypography(role()).some((p) => p.suffix === s))).toBe(true);
  });

  it('decimals and a scaled size (ref.type.scale 1.1)', () => {
    const scaled = role({ fontSize: { kind: 'dimension', value: 16.5, unit: 'px', px: 16.5 }, letterSpacing: { kind: 'dimension', value: -0.165, unit: 'px', px: -0.165 }, lineHeight: 1.3333 });
    expect(cssTypography(scaled).map((p) => p.value).slice(1)).toEqual(['1.0313rem', 'normal', '400', '-0.01em', '1.3333']);
  });
});

describe('Swift, TS and flavors', () => {
  it('Swift DSTypeRole carries trackingEm and boldWeight, and no family', () => {
    expect(swiftTypeRole(role())).toBe(
      'DSTypeRole(slot: .ui, size: 15, weight: 400, boldWeight: 600, lineHeight: 1.5, trackingEm: 0, numeric: .proportional, textStyle: .subheadline)',
    );
    expect(swiftTypeRole(displayXl)).toBe(
      'DSTypeRole(slot: .display, size: 64, weight: 300, boldWeight: 400, lineHeight: 1, trackingEm: -0.02, numeric: .proportional, textStyle: .largeTitle)',
    );
    expect(swiftTypeRole(role())).not.toContain('Onest');
    expect(trackingFraction(displayXl)).toBe(-0.02);
  });

  it('TS TypeRoleValue: px sizes and the CSS stack', () => {
    expect(tsTypography(displayXl)).toEqual({
      fontFamily: '"Onest", system-ui, sans-serif',
      fontSize: 64,
      fontWeight: 300,
      lineHeight: 1,
      letterSpacing: -1.28,
      numeric: 'proportional',
      slot: 'display',
      textStyle: 'largeTitle',
    });
  });

  it('Tokens Studio: strings; Figma: five primitives', () => {
    expect(studioTypography(role())).toEqual({
      fontFamily: 'Onest, system-ui, sans-serif',
      fontSize: '15px',
      fontWeight: '400',
      lineHeight: '150%',
      letterSpacing: '0px',
    });
    expect(figmaTypography(displayXl)).toEqual({
      'font-family': 'Onest',
      'font-size': { value: 64, unit: 'px' },
      'font-weight': 300,
      'line-height': 1,
      'letter-spacing': { value: -1.28, unit: 'px' },
    });
  });
});
