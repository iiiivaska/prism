// Emitted names (ARCHITECTURE §8; ADR-0019 §6): CSS, Tailwind, Swift, asset and flavor names from
// token ids, with the examples of the naming table.
import { describe, expect, test } from 'vitest';
import { assetName, cssName, flavorPath, lowerCamel, swiftMember, swiftName, tailwindThemeNames, tailwindTypeUtility, tailwindUtilities } from './naming.ts';

describe('naming', () => {
  test('CSS custom properties: sys drops its prefix, comp keeps the component, ref keeps ref-', () => {
    expect(cssName('sys.color.bg.surface.$root')).toBe('--ds-color-bg-surface');
    expect(cssName('comp.button.primary.bg.rest')).toBe('--ds-button-primary-bg-rest');
    expect(cssName('ref.color.neutral.100')).toBe('--ds-ref-color-neutral-100');
    expect(cssName('sys.material.glass.dark.fill.$root')).toBe('--ds-material-glass-dark-fill');
    expect(cssName('sys.motion.easing.inOut')).toBe('--ds-motion-easing-in-out');
  });

  test('Tailwind theme variables per utility namespace, and the composite type utility', () => {
    expect(tailwindThemeNames('sys.color.bg.page', 'color').map((t) => [t.variable, t.references])).toEqual([['--background-color-ds-page', '--ds-color-bg-page']]);
    expect(tailwindThemeNames('sys.color.accent.$root', 'color').map((t) => t.variable)).toEqual(['--background-color-ds-accent', '--fill-ds-accent', '--stroke-ds-accent']);
    expect(tailwindThemeNames('sys.color.icon.secondary', 'color').map((t) => t.variable)).toEqual(['--text-color-ds-icon-secondary', '--fill-ds-icon-secondary']);
    expect(tailwindThemeNames('sys.elevation.2', 'shadow').map((t) => t.variable)).toEqual(['--shadow-ds-elevation-2']);
    expect(tailwindThemeNames('sys.motion.spring.snappy', 'transition').map((t) => [t.variable, t.references])).toEqual([
      ['--ease-ds-spring-snappy', '--ds-motion-spring-snappy-easing'],
      ['--transition-duration-ds-spring-snappy', '--ds-motion-spring-snappy-duration'],
    ]);
    expect(tailwindThemeNames('sys.type.body.md', 'typography').map((t) => t.variable)).toEqual([
      '--text-ds-body-md', '--text-ds-body-md--font-weight', '--text-ds-body-md--letter-spacing', '--text-ds-body-md--line-height',
    ]);
    expect(tailwindThemeNames('sys.border.hairline', 'dimension')).toEqual([]);   // no namespace: ADR-0024 §6
    expect(tailwindThemeNames('ref.color.neutral.100', 'color')).toEqual([]);
    expect(tailwindTypeUtility('sys.type.metric.xl', 'typography')).toBe('type-ds-metric-xl');
    expect(tailwindUtilities('sys.color.text.secondary', 'color')).toEqual(['text-ds-secondary']);
    expect(tailwindUtilities('sys.space.4', 'dimension')).toContain('p-ds-4');
    expect(tailwindUtilities('sys.type.body.md', 'typography')).toEqual(['text-ds-body-md', 'type-ds-body-md']);
  });

  test('Swift names follow the §8 table; leading digits take the category prefix; keywords are backticked', () => {
    expect(swiftName('sys.space.4')).toBe('DSTokenSet.space.step4');
    expect(swiftName('sys.elevation.2')).toBe('DSTokenSet.elevation.level2');
    expect(swiftName('sys.color.text.on-accent')).toBe('DSColor.textOnAccent');
    expect(swiftName('sys.color.chart.series.1')).toBe('DSColor.chartSeries1');
    expect(swiftName('sys.color.bg.surface.$root')).toBe('DSColor.bgSurface');
    expect(swiftName('sys.material.glass.dark.fill.$root')).toBe('DSTokenSet.material.glassDarkFill');
    expect(swiftName('sys.type.body.md')).toBe('DSTokenSet.typography.bodyMd');
    expect(swiftName('sys.z.overlay')).toBe('DSTokenSet.zIndex.overlay');
    expect(swiftName('sys.font.ui')).toBe('DSBrand.faces[.ui]');
    expect(swiftName('comp.button.primary.bg.rest')).toBe('DSTokenSet.components.button.primaryBgRest');
    expect(swiftName('ref.color.neutral.100')).toBeNull();
    expect(swiftName('sys.nope.x')).toBeNull();
    expect(swiftMember('chart', ['1'])).toBe('n1');
    expect(swiftMember('z', ['default'])).toBe('`default`');
    expect(lowerCamel(['glass', 'dark', 'fill'])).toBe('glassDarkFill');
  });

  test('asset names: sys.color and glass colors only; flavor paths drop sys and rename $root', () => {
    expect(assetName('sys.color.text.secondary', 'color')).toBe('color-text-secondary');
    expect(assetName('sys.material.glass.dark.fill.$root', 'color')).toBe('material-glass-dark-fill');
    expect(assetName('sys.material.glass.dark.fill.blur', 'dimension')).toBeNull();
    expect(assetName('comp.button.primary.bg.rest', 'color')).toBeNull();
    expect(assetName('ref.color.neutral.100', 'color')).toBeNull();
    expect(flavorPath('sys.color.bg.surface.$root')).toEqual(['color', 'bg', 'surface', 'default']);
    expect(flavorPath('comp.card.padding')).toEqual(['comp', 'card', 'padding']);
  });
});
