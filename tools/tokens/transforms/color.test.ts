// prism/color/css-gamut and prism/color/p3 (ARCHITECTURE §7.2, §14 P1-4; ADR-0020 §3, ADR-0024 §12).
// Real colors come from the repository source; the expected strings are ARCHITECTURE's verified samples.
import { describe, expect, it } from 'vitest';
import { irColor, withAlpha } from '../ir/color.ts';
import type { DTCGColorSpace, IRColor } from '../ir/types.ts';
import { normalizeSources, REPO_ROOT } from '../normalize.ts';
import { fsReader } from '../source/reader.ts';
import {
  appleColor, colorsetComponents, cssColor, figmaColor, studioAlphaModifier, studioColor, swiftRGBA, tsColor,
} from './color.ts';

const source = normalizeSources(fsReader(REPO_ROOT));

/** A color literal of the repository by token id, e.g. 'ref.color.accent.300'. */
function real(id: string): IRColor {
  const hit = source.colors.find((c) => c.tokenId === id && c.pointer.endsWith('/$value'));
  if (hit === undefined) throw new Error(`no color literal ${id}`);
  const v = hit.value as { colorSpace: DTCGColorSpace; components: [number | 'none', number | 'none', number | 'none']; alpha?: number };
  return irColor(v.colorSpace, v.components, v.alpha ?? 1);
}

describe('hex', () => {
  it('every real color object reproduces its authored hex', () => {
    expect(source.colors.length).toBeGreaterThan(100);
    const mismatches = source.colors.filter((c) => {
      const v = c.value as { colorSpace: DTCGColorSpace; components: [number, number, number]; hex?: string };
      return irColor(v.colorSpace, v.components, 1).hex !== v.hex;
    });
    expect(mismatches).toEqual([]);
  });
});

describe('cssColor (prism/color/css-gamut)', () => {
  it.each([
    ['ref.color.neutral.100', 'oklch(0.9612 0.0041 271.4)', null],
    ['ref.color.neutral.0', 'oklch(1 0 0)', null],
    ['ref.color.neutral.600', 'oklch(0.4883 0.0137 264.4)', null],
    ['ref.color.neutral.950', 'oklch(0.164 0.0065 271)', null],
    ['ref.color.accent.300', 'oklch(0.8506 0.1133 68.21)', 'oklch(0.8506 0.1133 68.2)'],
    ['ref.color.accent.50', 'oklch(0.9794 0.0169 76.17)', 'oklch(0.9794 0.0169 76.1)'],
  ])('%s → base %s, P3 twin %s', (id, base, p3) => {
    expect(cssColor(real(id))).toEqual({ base, p3 });
  });

  it('a color outside P3: the base is the sRGB-mapped OKLCH, the twin the P3-mapped OKLCH', () => {
    const c = irColor('oklch', [0.7, 0.4, 150], 1);
    expect(c.inP3).toBe(false);
    expect(cssColor(c)).toEqual({ base: 'oklch(0.7091 0.2104 147.06)', p3: 'oklch(0.7077 0.2878 147.88)' });
  });

  it('a pure white overlay stays as authored: rgb(255 255 255 / 0.64)', () => {
    expect(cssColor(irColor('srgb', [1, 1, 1], 0.64))).toEqual({ base: 'rgb(255 255 255 / 0.64)', p3: null });
    expect(cssColor(irColor('srgb', [0, 0, 0], 0.07))).toEqual({ base: 'rgb(0 0 0 / 0.07)', p3: null });
    expect(cssColor(irColor('srgb', [0, 0, 0], 1)).base).toBe('rgb(0 0 0)');
  });

  it('an alpha alias renders as a literal of its target with its own alpha, P3 twin included', () => {
    expect(cssColor(withAlpha(real('ref.color.accent.500'), 0.12))).toEqual({ base: 'oklch(0.7517 0.1475 57.6 / 0.12)', p3: null });
    expect(cssColor(withAlpha(real('ref.color.smoke.light'), 0.55)).base).toBe('oklch(0.1504 0.0092 128.7 / 0.55)');
    expect(cssColor(withAlpha(real('ref.color.accent.300'), 0.4))).toEqual({
      base: 'oklch(0.8506 0.1133 68.21 / 0.4)',
      p3: 'oklch(0.8506 0.1133 68.2 / 0.4)',
    });
  });

  it('none components render as 0; an achromatic color prints hue 0', () => {
    expect(cssColor(irColor('oklch', [0.5, 'none', 20], 1)).base).toBe('oklch(0.5 0 0)');
    expect(cssColor(irColor('oklch', [0.5, 0.1, 'none'], 1)).base).toBe('oklch(0.5 0.1 0)');
    expect(cssColor(irColor('srgb', ['none', 0.5, 0], 1)).base).toBe('rgb(0 127.5 0)');
    expect(cssColor(irColor('oklch', [0.62, 0.00004, 210], 1)).base).toBe('oklch(0.62 0 0)');
    expect(cssColor(irColor('hsl', [120, 0, 50], 1)).base).toBe('oklch(0.5982 0 0)');
  });

  it('prints another authored space as OKLCH; alpha 1 has no slash', () => {
    expect(cssColor(irColor('display-p3', [0.9, 0.6, 0.33], 1)).base).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/);
    expect(cssColor(irColor('oklch', [0.5, 0.1, 20], 0)).base).toBe('oklch(0.5 0.1 20 / 0)');
  });
});

describe('swiftRGBA and colorsetComponents (prism/color/p3)', () => {
  it.each([
    ['ref.color.neutral.600', 'DSRGBA(.displayP3, 0.3636, 0.3759, 0.4049, 1)', { red: '0.3636', green: '0.3759', blue: '0.4049', alpha: '1.0000' }],
    ['ref.color.neutral.700', 'DSRGBA(.displayP3, 0.2539, 0.2662, 0.2953, 1)', { red: '0.2539', green: '0.2662', blue: '0.2953', alpha: '1.0000' }],
    ['ref.color.neutral.900', 'DSRGBA(.displayP3, 0.0916, 0.0978, 0.1123, 1)', { red: '0.0916', green: '0.0978', blue: '0.1123', alpha: '1.0000' }],
    ['ref.color.neutral.950', 'DSRGBA(.displayP3, 0.0517, 0.0548, 0.0656, 1)', { red: '0.0517', green: '0.0548', blue: '0.0656', alpha: '1.0000' }],
    ['ref.color.accent.500', 'DSRGBA(.displayP3, 0.9011, 0.5979, 0.3306, 1)', { red: '0.9011', green: '0.5979', blue: '0.3306', alpha: '1.0000' }],
  ])('%s → %s', (id, swift, components) => {
    const c = real(id);
    expect(swiftRGBA(c)).toBe(swift);
    expect(colorsetComponents(c)).toEqual({ 'color-space': 'display-p3', components });
    expect(Object.keys(colorsetComponents(c).components)).toEqual(['alpha', 'blue', 'green', 'red']);
  });

  it('authored sRGB stays sRGB with its authored components (white and black overlays stay exact)', () => {
    const white = irColor('srgb', [1, 1, 1], 0.64);
    expect(swiftRGBA(white)).toBe('DSRGBA(.sRGB, 1, 1, 1, 0.64)');
    expect(colorsetComponents(white)).toEqual({
      'color-space': 'srgb',
      components: { alpha: '0.6400', blue: '1.0000', green: '1.0000', red: '1.0000' },
    });
  });

  it('authored Display P3 stays as authored', () => {
    expect(swiftRGBA(irColor('display-p3', [0.9, 0.6, 0.33], 1))).toBe('DSRGBA(.displayP3, 0.9, 0.6, 0.33, 1)');
  });

  it("an alpha alias renders its target's Display P3 components with its alpha, whatever the target's space", () => {
    expect(swiftRGBA(withAlpha(real('ref.color.neutral.950'), 0.1), { alphaAlias: true })).toBe('DSRGBA(.displayP3, 0.0517, 0.0548, 0.0656, 0.1)');
    const white = withAlpha(irColor('srgb', [1, 1, 1], 1), 0.5);
    expect(appleColor(white, { alphaAlias: true }).space).toBe('displayP3');
    expect(swiftRGBA(white, { alphaAlias: true })).toBe('DSRGBA(.displayP3, 1, 1, 1, 0.5)');
    expect(colorsetComponents(white, { alphaAlias: true })['color-space']).toBe('display-p3');
  });

  it('a color outside P3 is CSS-mapped into P3; none is 0', () => {
    const mapped = appleColor(irColor('oklch', [0.7, 0.4, 150], 1));
    expect(mapped.space).toBe('displayP3');
    for (const v of [mapped.red, mapped.green, mapped.blue]) expect(v >= -1e-9 && v <= 1 + 1e-9).toBe(true);
    expect(swiftRGBA(irColor('srgb', ['none', 1, 0], 1))).toBe('DSRGBA(.sRGB, 0, 1, 0, 1)');
  });
});

describe('flavors keep alpha (ADR-0024 §12)', () => {
  it('Tokens Studio: #rrggbb when opaque, rgba() below alpha 1, never 8-digit hex', () => {
    expect(studioColor(real('ref.color.neutral.600'))).toBe('#5c6068');
    expect(studioColor(irColor('srgb', [1, 1, 1], 0.64))).toBe('rgba(255, 255, 255, 0.64)');
    expect(studioColor(withAlpha(real('ref.color.accent.500'), 0.12))).toBe('rgba(243, 148, 68, 0.12)');
    expect(studioColor(irColor('srgb', [0, 0, 0], 0))).toBe('rgba(0, 0, 0, 0)');
    for (const c of source.colors) {
      const v = c.value as { colorSpace: DTCGColorSpace; components: [number, number, number]; alpha?: number };
      expect(studioColor(irColor(v.colorSpace, v.components, v.alpha ?? 1))).not.toMatch(/^#[\da-f]{8}$/i);
    }
    expect(studioAlphaModifier(0.12)).toEqual({ type: 'alpha', value: '0.12', space: 'srgb', format: 'hex' });
  });

  it('Figma: sRGB components (4 decimals), the alpha (3 decimals) and a 6-digit hex without alpha', () => {
    expect(figmaColor(irColor('srgb', [1, 1, 1], 0.64))).toEqual({ colorSpace: 'srgb', components: [1, 1, 1], alpha: 0.64, hex: '#ffffff' });
    expect(figmaColor(real('ref.color.neutral.950'))).toEqual({ colorSpace: 'srgb', components: [0.051, 0.0549, 0.0667], alpha: 1, hex: '#0d0e11' });
    const tint = figmaColor(withAlpha(real('ref.color.accent.500'), 0.12));
    expect(tint.alpha).toBe(0.12);
    expect(tint.hex).toMatch(/^#[\da-f]{6}$/);
    // out of sRGB: the gamut-mapped components, never above 1
    expect(figmaColor(real('ref.color.accent.300')).components.every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  it('TS: { css, cssP3, hex, alpha }', () => {
    expect(tsColor(irColor('srgb', [1, 1, 1], 0.64))).toEqual({ css: 'rgb(255 255 255 / 0.64)', cssP3: null, hex: '#ffffff', alpha: 0.64 });
    expect(tsColor(real('ref.color.accent.50'))).toEqual({
      css: 'oklch(0.9794 0.0169 76.17)',
      cssP3: 'oklch(0.9794 0.0169 76.1)',
      hex: '#fff7ec',
      alpha: 1,
    });
  });
});

describe('purity', () => {
  it('memoized results are frozen and shared, keyed by the value', () => {
    const a = cssColor(real('ref.color.accent.300'));
    const b = cssColor(real('ref.color.accent.300'));
    expect(a).toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(cssColor(withAlpha(real('ref.color.accent.300'), 0.5))).not.toBe(a);
  });
});
