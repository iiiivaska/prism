// Composite and scalar renderers (ARCHITECTURE §7.8–§7.12, §14 P1-4): multi-layer shadows, gradients
// with P3 twins and their derived declarations, stroke styles and borders, font quoting, flags, and
// the dispatchers of index.ts.
import { describe, expect, it } from 'vitest';
import { irColor } from '../ir/color.ts';
import type { IRBorder, IRColor, IRDimension, IRGradient, IRNumber, IRShadow, IRStrokeStyle, IRValue } from '../ir/types.ts';
import { cssFontFamily, figmaFontFamily, studioFontFamily, swiftFontFamilies, swiftString, tsFontFamily, cssFontWeight, studioFontWeight } from './font.ts';
import { bloomStop, bloomStopIndex, cssGradient, studioGradient, swiftGradient, tsGradient } from './gradient.ts';
import { tsColor } from './color.ts';
import {
  appleOptions, colorsetOf, cssParts, emitsAlias, swiftLiteral, TRANSFORM_NAMES, tsLiteral,
} from './index.ts';
import * as transforms from './index.ts';
import { cssNumber, figmaNumber, studioNumber, swiftNumber, tsNumber } from './number.ts';
import { cssShadow, studioShadow, swiftShadow, tsShadow } from './shadow.ts';
import { cssBorder, cssStrokeStyle, swiftBorder, swiftStrokeStyle, tsBorder, tsStrokeStyle } from './stroke.ts';

const px = (value: number): IRDimension => ({ kind: 'dimension', value, unit: 'px', px: value });
const black = (alpha: number): IRColor => irColor('srgb', [0, 0, 0], alpha);
const accent300 = irColor('oklch', [0.8506, 0.1133, 68.2], 1);   // outside sRGB, inside P3
const accent500 = irColor('oklch', [0.7517, 0.1475, 57.6], 1);

const twoLayers: IRShadow = {
  kind: 'shadow',
  layers: [
    { kind: 'shadowLayer', color: black(0.07), offsetX: px(0), offsetY: px(6), blur: px(16), spread: px(0), inset: false },
    { kind: 'shadowLayer', color: black(0.04), offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(-1), inset: true },
  ],
};

const vivid: IRGradient = {
  kind: 'gradient',
  stops: [
    { kind: 'gradientStop', color: accent500, position: 0 },
    { kind: 'gradientStop', color: accent300, position: 0.55 },
    { kind: 'gradientStop', color: irColor('srgb', [1, 1, 1], 0.5), position: 1 },
  ],
  angle: 165,
  grain: 0.06,
  scheme: 'light',
  temperature: 'warm',
  bloom: { alpha: 0.3, blur: 150 },
};

describe('shadow', () => {
  it('CSS joins layers, keeps inset and translucent colors, and twins the declaration for P3 colors', () => {
    expect(cssShadow(twoLayers)).toEqual({ base: '0px 6px 16px 0px rgb(0 0 0 / 0.07), inset 0px 1px 2px -1px rgb(0 0 0 / 0.04)', p3: null });
    const wide = cssShadow({ kind: 'shadow', layers: [{ ...twoLayers.layers[0]!, color: accent300 }, twoLayers.layers[1]!] });
    expect(wide.base).toBe('0px 6px 16px 0px oklch(0.8506 0.1133 68.21), inset 0px 1px 2px -1px rgb(0 0 0 / 0.04)');
    expect(wide.p3).toBe('0px 6px 16px 0px oklch(0.8506 0.1133 68.2), inset 0px 1px 2px -1px rgb(0 0 0 / 0.04)');
  });

  it('Swift, TS and Tokens Studio', () => {
    expect(swiftShadow(twoLayers)).toBe(
      'DSShadowToken(layers: [DSShadowLayer(color: DSRGBA(.sRGB, 0, 0, 0, 0.07), x: 0, y: 6, blur: 16, spread: 0, inset: false), ' +
        'DSShadowLayer(color: DSRGBA(.sRGB, 0, 0, 0, 0.04), x: 0, y: 1, blur: 2, spread: -1, inset: true)])',
    );
    expect(tsShadow(twoLayers)).toEqual([
      { color: 'rgb(0 0 0 / 0.07)', x: 0, y: 6, blur: 16, spread: 0, inset: false },
      { color: 'rgb(0 0 0 / 0.04)', x: 0, y: 1, blur: 2, spread: -1, inset: true },
    ]);
    expect(studioShadow(twoLayers)).toEqual([
      { x: '0px', y: '6px', blur: '16px', spread: '0px', color: 'rgba(0, 0, 0, 0.07)', type: 'dropShadow' },
      { x: '0px', y: '1px', blur: '2px', spread: '-1px', color: 'rgba(0, 0, 0, 0.04)', type: 'innerShadow' },
    ]);
  });
});

describe('gradient', () => {
  it('CSS: linear-gradient with a P3 twin of the whole declaration, then -bloom-alpha, -bloom-blur, -bloom-color and -grain', () => {
    expect(cssGradient(vivid).map((p) => [p.suffix, p.value, p.twins])).toEqual([
      [
        '',
        'linear-gradient(165deg in oklab, oklch(0.7517 0.1475 57.6) 0%, oklch(0.8506 0.1133 68.21) 55%, rgb(255 255 255 / 0.5) 100%)',
        [{ kind: 'p3', value: 'linear-gradient(165deg in oklab, oklch(0.7517 0.1475 57.6) 0%, oklch(0.8506 0.1133 68.2) 55%, rgb(255 255 255 / 0.5) 100%)' }],
      ],
      ['-bloom-alpha', '0.3', []],
      ['-bloom-blur', '150px', []],
      ['-bloom-color', 'rgb(255 255 255 / 0.5)', []],
      ['-grain', '0.06', []],
    ]);
  });

  it('the bloom color is the stop of highest relative luminance, the later stop on a tie (ADR-0030 §4.3)', () => {
    const brightFirst: IRGradient = { ...vivid, stops: [vivid.stops[1]!, vivid.stops[0]!] };
    expect(bloomStopIndex(brightFirst)).toBe(0);
    expect(cssGradient(brightFirst).find((p) => p.suffix === '-bloom-color')).toEqual({
      suffix: '-bloom-color', value: 'oklch(0.8506 0.1133 68.21)', twins: [{ kind: 'p3', value: 'oklch(0.8506 0.1133 68.2)' }],
    });
    const tie: IRGradient = { ...vivid, stops: [vivid.stops[0]!, { ...vivid.stops[0]!, position: 0.5 }, { ...vivid.stops[1]!, position: 0.6 }, { ...vivid.stops[1]!, position: 1 }] };
    expect(bloomStopIndex(tie)).toBe(3);
    expect(bloomStop(vivid)).toBe(vivid.stops[2]);
  });

  it('CSS: defaults (angle 180, neutral 0 / 0 / 0px) and var() stops, which never twin', () => {
    const plain: IRGradient = { ...vivid, angle: null, grain: null, bloom: null, scheme: null };
    expect(cssGradient(plain, ['var(--ds-ref-color-accent-500)', 'var(--ds-ref-color-accent-300)']).map((p) => [p.suffix, p.value, p.twins.length])).toEqual([
      ['', 'linear-gradient(180deg in oklab, var(--ds-ref-color-accent-500) 0%, var(--ds-ref-color-accent-300) 55%, rgb(255 255 255 / 0.5) 100%)', 0],
      ['-bloom-alpha', '0', 0],
      ['-bloom-blur', '0px', 0],
      ['-bloom-color', 'rgb(255 255 255 / 0.5)', 0],
      ['-grain', '0', 0],
    ]);
    expect(cssGradient({ ...vivid, bloom: { alpha: 0.2, blur: null } }).find((p) => p.suffix === '-bloom-blur')?.value).toBe('0px');
  });

  it('Swift, TS and Tokens Studio', () => {
    expect(swiftGradient(vivid)).toBe(
      'DSGradientToken(stops: [DSGradientStop(color: DSRGBA(.displayP3, 0.9011, 0.5979, 0.3306, 1), location: 0), ' +
        'DSGradientStop(color: DSRGBA(.displayP3, 0.9622, 0.7628, 0.5194, 1), location: 0.55), ' +
        'DSGradientStop(color: DSRGBA(.sRGB, 1, 1, 1, 0.5), location: 1)], angle: 165, grain: 0.06, scheme: .light, bloomAlpha: 0.3, bloomBlur: 150, ' +
        'bloomColor: DSRGBA(.sRGB, 1, 1, 1, 0.5))',
    );
    expect(swiftGradient({ ...vivid, angle: null, grain: null, scheme: null, bloom: null })).toMatch(/angle: 180, grain: 0, scheme: nil, bloomAlpha: 0, bloomBlur: 0, bloomColor: DSRGBA\(\.sRGB, 1, 1, 1, 0\.5\)\)$/);
    const ts = tsGradient(vivid);
    expect(ts.cssP3).toContain('68.2)');
    expect(ts.stops.map((s) => [s.color.hex, s.position])).toEqual([['#f39444', 0], ['#ffc07a', 0.55], ['#ffffff', 1]]);
    expect([ts.angle, ts.grain, ts.scheme, ts.bloom]).toEqual([165, 0.06, 'light', { alpha: 0.3, blur: 150, color: tsColor(irColor('srgb', [1, 1, 1], 0.5)) }]);
    expect(tsGradient({ ...vivid, bloom: null }).bloom).toBeNull();
    expect(studioGradient(vivid)).toBe('linear-gradient(165deg, #f39444 0%, #ffc07a 55%, rgba(255, 255, 255, 0.5) 100%)');
  });
});

describe('stroke style and border', () => {
  const dashed: IRStrokeStyle = { kind: 'strokeStyle', keyword: null, dashArray: [px(8), px(6)], lineCap: 'round' };
  const solid: IRStrokeStyle = { kind: 'strokeStyle', keyword: 'solid', dashArray: [], lineCap: null };

  it('CSS: a keyword is the base declaration; the object form writes -dasharray and -linecap', () => {
    expect(cssStrokeStyle(solid).map((p) => [p.suffix, p.value])).toEqual([['', 'solid']]);
    expect(cssStrokeStyle(dashed).map((p) => [p.suffix, p.value])).toEqual([['-dasharray', '8px 6px'], ['-linecap', 'round']]);
    expect(cssStrokeStyle({ ...dashed, dashArray: [px(1.5), px(4.5)], lineCap: 'butt' }).map((p) => p.value)).toEqual(['1.5px 4.5px', 'butt']);
  });

  it('Swift and TS', () => {
    expect(swiftStrokeStyle(dashed)).toBe('DSStrokeStyle(dash: [8, 6], lineCap: .round)');
    expect(swiftStrokeStyle(solid)).toBe('DSStrokeStyle(keyword: .solid)');
    expect(tsStrokeStyle(dashed)).toEqual({ keyword: null, dashArray: [8, 6], lineCap: 'round' });
  });

  it('border: CSS <width> <style> <color> with a P3 twin, Swift DSBorderToken, TS', () => {
    const border: IRBorder = { kind: 'border', color: accent300, width: px(2), style: solid };
    expect(cssBorder(border)).toEqual({ base: '2px solid oklch(0.8506 0.1133 68.21)', p3: '2px solid oklch(0.8506 0.1133 68.2)' });
    expect(cssBorder({ ...border, style: dashed, color: black(0.1) })).toEqual({ base: '2px dashed rgb(0 0 0 / 0.1)', p3: null });
    expect(swiftBorder({ ...border, color: black(1) })).toBe('DSBorderToken(color: DSRGBA(.sRGB, 0, 0, 0, 1), width: 2, style: DSStrokeStyle(keyword: .solid))');
    expect(tsBorder({ ...border, color: black(1) })).toEqual({
      color: { css: 'rgb(0 0 0)', cssP3: null, hex: '#000000', alpha: 1 },
      width: 2,
      style: { keyword: 'solid', dashArray: [], lineCap: null },
    });
  });
});

describe('font family and weight', () => {
  const stack = { kind: 'fontFamily', families: ['Onest', 'system-ui', 'sans-serif'], opsz: null } as const;

  it('CSS quotes every family except the generic keywords', () => {
    expect(cssFontFamily(stack)).toBe('"Onest", system-ui, sans-serif');
    expect(cssFontFamily({ ...stack, families: ['JetBrains Mono', 'ui-monospace', 'monospace'] })).toBe('"JetBrains Mono", ui-monospace, monospace');
    expect(cssFontFamily({ ...stack, families: ['Say "Hi"', 'back\\slash', 'emoji', 'math', 'fangsong', 'ui-rounded', 'cursive'] })).toBe(
      '"Say \\"Hi\\"", "back\\\\slash", emoji, math, fangsong, ui-rounded, cursive',
    );
    expect(tsFontFamily(stack)).toBe(cssFontFamily(stack));
  });

  it('Swift [String], Figma the first family, Tokens Studio joined', () => {
    expect(swiftFontFamilies(stack)).toBe('["Onest", "system-ui", "sans-serif"]');
    expect(swiftString('a "b" \\ c\n')).toBe('"a \\"b\\" \\\\ c\\n"');
    expect(figmaFontFamily(stack)).toBe('Onest');
    expect(studioFontFamily(stack)).toBe('Onest, system-ui, sans-serif');
    expect(cssFontWeight({ kind: 'fontWeight', weight: 500 })).toBe('500');
    expect(studioFontWeight({ kind: 'fontWeight', weight: 300 })).toBe('300');
  });
});

describe('number and flag', () => {
  const flagOn: IRNumber = { kind: 'number', value: 1, flag: true };
  const flagOff: IRNumber = { kind: 'number', value: 0, flag: true };
  const n: IRNumber = { kind: 'number', value: 0.12345, flag: false };

  it('CSS 0 / 1, Swift Bool, TS boolean, Figma com.figma.type boolean, Tokens Studio boolean', () => {
    expect([cssNumber(flagOn), cssNumber(flagOff)]).toEqual(['1', '0']);
    expect([swiftNumber(flagOn), swiftNumber(flagOff)]).toEqual(['true', 'false']);
    expect([tsNumber(flagOn), tsNumber(flagOff)]).toEqual([true, false]);
    expect(figmaNumber(flagOn)).toEqual({ $type: 'number', $value: 1, $extensions: { 'com.figma.type': 'boolean' } });
    expect(studioNumber(flagOff)).toEqual({ type: 'boolean', value: 'false' });
  });

  it('plain numbers keep 4 decimals', () => {
    expect([cssNumber(n), swiftNumber(n), tsNumber(n)]).toEqual(['0.1235', '0.1235', 0.1235]);
    expect(figmaNumber(n)).toEqual({ $type: 'number', $value: 0.1235 });
    expect(studioNumber({ ...n, value: 1.2 })).toEqual({ type: 'number', value: '1.2' });
  });
});

describe('index', () => {
  it('names every roadmap transform after exported renderers', () => {
    for (const [name, fns] of Object.entries(TRANSFORM_NAMES)) {
      expect(name).toMatch(/^prism\//);
      for (const fn of fns) expect(typeof (transforms as Record<string, unknown>)[fn]).toBe('function');
    }
  });

  it('an alpha alias renders as a literal; any other whole-value alias as a reference', () => {
    expect(emitsAlias({ aliasOf: 'ref.color.accent.500', alpha: 0.12 })).toBeNull();
    expect(emitsAlias({ aliasOf: 'ref.color.neutral.100', alpha: null })).toBe('ref.color.neutral.100');
    expect(emitsAlias({ aliasOf: null, alpha: null })).toBeNull();
    expect(appleOptions({ alpha: 0.4 })).toEqual({ alphaAlias: true });
    const white = irColor('srgb', [1, 1, 1], 0.5);
    expect(colorsetOf({ alpha: 0.5, value: white })['color-space']).toBe('display-p3');
    expect(colorsetOf({ alpha: null, value: white })['color-space']).toBe('srgb');
  });

  it('dispatches every value kind to its renderer', () => {
    const values: IRValue[] = [
      accent300,
      px(4),
      { kind: 'duration', ms: 150 },
      { kind: 'number', value: 1, flag: true },
      { kind: 'fontFamily', families: ['Onest', 'sans-serif'], opsz: null },
      { kind: 'fontWeight', weight: 500 },
      { kind: 'cubicBezier', points: [0.23, 1, 0.32, 1] },
      { kind: 'strokeStyle', keyword: 'dashed', dashArray: [], lineCap: null },
      { kind: 'border', color: black(1), width: px(1), style: { kind: 'strokeStyle', keyword: 'solid', dashArray: [], lineCap: null } },
      twoLayers,
      vivid,
      {
        kind: 'typography', fontFamily: { kind: 'fontFamily', families: ['Onest'], opsz: null }, fontSize: px(13), fontWeight: { kind: 'fontWeight', weight: 500 },
        boldWeight: 700, darkWeight: null, lineHeight: 1.2, letterSpacing: px(0.26), slot: 'ui', numeric: 'tabular', textStyle: 'footnote',
      },
      {
        kind: 'transition', duration: { kind: 'duration', ms: 487 }, delay: { kind: 'duration', ms: 0 },
        timingFunction: { kind: 'cubicBezier', points: [0.23, 1, 0.32, 1] }, spring: { duration: 0.35, bounce: 0.15, blendDuration: 0 },
      },
    ];
    const table = values.map((v) => ({
      kind: v.kind,
      css: cssParts(v).map((p) => `${p.suffix || '(base)'}=${p.value.length > 60 ? `${p.value.slice(0, 57)}...` : p.value}${p.twins.map((t) => ` [${t.kind}]`).join('')}`),
      swift: swiftLiteral(v).slice(0, 40),
      ts: typeof tsLiteral(v),
    }));
    expect(table).toMatchInlineSnapshot(`
      [
        {
          "css": [
            "(base)=oklch(0.8506 0.1133 68.21) [p3]",
          ],
          "kind": "color",
          "swift": "DSRGBA(.displayP3, 0.9622, 0.7628, 0.519",
          "ts": "object",
        },
        {
          "css": [
            "(base)=4px",
          ],
          "kind": "dimension",
          "swift": "4",
          "ts": "number",
        },
        {
          "css": [
            "(base)=150ms",
          ],
          "kind": "duration",
          "swift": "0.15",
          "ts": "number",
        },
        {
          "css": [
            "(base)=1",
          ],
          "kind": "number",
          "swift": "true",
          "ts": "boolean",
        },
        {
          "css": [
            "(base)="Onest", sans-serif",
          ],
          "kind": "fontFamily",
          "swift": "["Onest", "sans-serif"]",
          "ts": "string",
        },
        {
          "css": [
            "(base)=500",
          ],
          "kind": "fontWeight",
          "swift": "500",
          "ts": "number",
        },
        {
          "css": [
            "(base)=cubic-bezier(0.23, 1, 0.32, 1)",
          ],
          "kind": "cubicBezier",
          "swift": "DSCubicBezier(x1: 0.23, y1: 1, x2: 0.32,",
          "ts": "object",
        },
        {
          "css": [
            "(base)=dashed",
          ],
          "kind": "strokeStyle",
          "swift": "DSStrokeStyle(keyword: .dashed)",
          "ts": "object",
        },
        {
          "css": [
            "(base)=1px solid rgb(0 0 0)",
          ],
          "kind": "border",
          "swift": "DSBorderToken(color: DSRGBA(.sRGB, 0, 0,",
          "ts": "object",
        },
        {
          "css": [
            "(base)=0px 6px 16px 0px rgb(0 0 0 / 0.07), inset 0px 1px 2px -1p...",
          ],
          "kind": "shadow",
          "swift": "DSShadowToken(layers: [DSShadowLayer(col",
          "ts": "object",
        },
        {
          "css": [
            "(base)=linear-gradient(165deg in oklab, oklch(0.7517 0.1475 57.6... [p3]",
            "-bloom-alpha=0.3",
            "-bloom-blur=150px",
            "-bloom-color=rgb(255 255 255 / 0.5)",
            "-grain=0.06",
          ],
          "kind": "gradient",
          "swift": "DSGradientToken(stops: [DSGradientStop(c",
          "ts": "object",
        },
        {
          "css": [
            "-font-family="Onest"",
            "-font-size=0.8125rem",
            "-font-variant-numeric=tabular-nums",
            "-font-weight=500",
            "-letter-spacing=0.02em",
            "-line-height=1.2",
          ],
          "kind": "typography",
          "swift": "DSTypeRole(slot: .ui, size: 13, weight: ",
          "ts": "object",
        },
        {
          "css": [
            "(base)=487ms linear(0, 0.0055 1.23%, 0.0239 2.67%, 0.0526 4.11%,... [noLinear]",
            "-delay=0ms",
            "-duration=487ms",
            "-easing=linear(0, 0.0055 1.23%, 0.0239 2.67%, 0.0526 4.11%, 0.095... [noLinear]",
          ],
          "kind": "transition",
          "swift": "DSSpringToken(duration: 0.35, bounce: 0.",
          "ts": "object",
        },
      ]
    `);
  });
});
