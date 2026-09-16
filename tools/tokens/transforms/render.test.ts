// The renderers over the repository's own IR (ARCHITECTURE §7, §14 P1-4): every token of a few real
// permutations renders on every target, alpha aliases render as literals, every spring's CSS
// duration equals its authored fallback, and the real values ARCHITECTURE §7.2, §9.2 and §9.3 quote
// come out of the pipeline. Builds with Style Dictionary, so no test here runs concurrently.
import { beforeAll, describe, expect, it } from 'vitest';
import { buildBundle } from '../ir/bundle.ts';
import type { IRBundle, IRToken, PermutationIR } from '../ir/types.ts';
import { appleOptions, cssColor, cssParts, emitsAlias, fmt, springCurve, swiftLiteral, tsLiteral, tsSpring } from './index.ts';

let bundle: IRBundle;

beforeAll(async () => {
  bundle = await buildBundle({
    filter: { brand: ['prism'], platform: ['web', 'apple'], colorScheme: ['light', 'dark'], density: ['compact'], modality: ['pointer'], motion: ['default', 'reduced'] },
  });
}, 120_000);

function perm(overrides: Record<string, string>): PermutationIR {
  const key = bundle.model.modifiers.map((m) => `${m.name}=${overrides[m.name] ?? m.default}`).join('|');
  const p = bundle.permutations.get(key);
  if (p === undefined) throw new Error(`no permutation ${key}`);
  return p;
}

function token(p: PermutationIR, id: string): IRToken {
  const t = p.tokens.get(id);
  if (t === undefined) throw new Error(`no token ${id} in ${p.key}`);
  return t;
}

const BAD_TEXT = /NaN|undefined|Infinity|null|\[object|\de[+-]\d/;

describe('every real token renders on every target', () => {
  it('CSS parts, the Swift literal and the TS value, with no NaN, exponent or empty text', () => {
    let count = 0;
    for (const p of bundle.permutations.values()) {
      for (const t of p.tokens.values()) {
        const parts = cssParts(t.value);
        expect(parts.length, t.id).toBeGreaterThan(0);
        for (const part of parts) {
          expect(part.value, `${t.id}${part.suffix}`).not.toBe('');
          expect(part.value, `${t.id}${part.suffix}`).not.toMatch(BAD_TEXT);
          for (const twin of part.twins) expect(twin.value, `${t.id}${part.suffix} ${twin.kind}`).not.toMatch(BAD_TEXT);
        }
        const swift = swiftLiteral(t.value, appleOptions(t));
        expect(swift, t.id).not.toMatch(BAD_TEXT);
        expect(JSON.stringify(tsLiteral(t.value)), t.id).not.toMatch(/NaN|Infinity/);
        count++;
      }
    }
    expect(count).toBeGreaterThan(1000);
  });

  it('an alpha alias renders as a literal of its target with its own alpha (ADR-0020 §3)', () => {
    const light = perm({});
    const aliases = [...light.tokens.values()].filter((t) => t.alpha !== null);
    expect(aliases.length).toBeGreaterThan(10);
    for (const t of aliases) {
      expect(emitsAlias(t), t.id).toBeNull();
      if (t.value.kind !== 'color') throw new Error(`${t.id} is not a color`);
      expect(cssColor(t.value).base, t.id).toMatch(new RegExp(` / ${fmt(t.alpha ?? 1, 3).replace('.', '\\.')}\\)$`));
      expect(swiftLiteral(t.value, appleOptions(t)), t.id).toMatch(/^DSRGBA\(\.displayP3, /);
    }
  });

  it("every spring's CSS duration is its settle and equals the authored fallback duration (P7, ADR-0023 rule 3)", () => {
    let springs = 0;
    for (const p of bundle.permutations.values()) {
      for (const t of p.tokens.values()) {
        if (t.value.kind !== 'transition' || t.value.spring === null) continue;
        const s = tsSpring(t.value);
        expect(s.settleMs, `${t.id} in ${p.key}`).toBe(t.value.duration.ms);
        expect(s.css.startsWith(`${s.settleMs}ms linear(0, `), t.id).toBe(true);
        expect(springCurve(t.value.spring).stops.length, t.id).toBeLessThanOrEqual(40);
        springs++;
      }
    }
    expect(springs).toBeGreaterThan(0);
  });
});

describe('the real values ARCHITECTURE quotes', () => {
  it('colors (§7.2, §9.2)', () => {
    const light = perm({});
    const dark = perm({ colorScheme: 'dark' });
    const color = (p: PermutationIR, id: string): ReturnType<typeof cssColor> => {
      const v = token(p, id).value;
      if (v.kind !== 'color') throw new Error(`${id} is not a color`);
      return cssColor(v);
    };
    const css = (p: PermutationIR, id: string): string => color(p, id).base;
    expect(css(light, 'ref.color.neutral.100')).toBe('oklch(0.9612 0.0041 271.4)');
    expect(color(light, 'ref.color.accent.300')).toEqual({ base: 'oklch(0.8506 0.1133 68.21)', p3: 'oklch(0.8506 0.1133 68.2)' });
    expect(css(light, 'sys.color.bg.tint.accent')).toBe('oklch(0.7517 0.1475 57.6 / 0.12)');
    expect(css(dark, 'sys.color.bg.tint.accent')).toBe('oklch(0.7517 0.1475 57.6 / 0.14)');
    expect(css(light, 'sys.material.glass.dark.fill.$root')).toBe('oklch(0.1504 0.007 265 / 0.55)');
    expect(css(dark, 'sys.color.text.secondary')).toBe('rgb(255 255 255 / 0.64)');
    expect(swiftLiteral(token(light, 'sys.color.text.secondary').value)).toBe('DSRGBA(.displayP3, 0.3636, 0.3759, 0.4049, 1)');
    expect(swiftLiteral(token(dark, 'sys.color.text.secondary').value)).toBe('DSRGBA(.sRGB, 1, 1, 1, 0.64)');
  });

  it('typography and shadows (§9.2)', () => {
    const light = perm({});
    const parts = cssParts(token(light, 'ref.type.body.md').value).map((p) => `${p.suffix}: ${p.value}`);
    expect(parts).toEqual([
      '-font-family: "Onest", system-ui, sans-serif',
      '-font-size: 0.9375rem',
      '-font-variant-numeric: normal',
      '-font-weight: 400',
      '-letter-spacing: 0em',
      '-line-height: 1.5',
    ]);
    expect(cssParts(token(light, 'ref.shadow.light.floating').value)[0]?.value).toBe('0px 6px 16px 0px rgb(0 0 0 / 0.07)');
    expect(cssParts(token(perm({ colorScheme: 'dark' }), 'ref.shadow.dark.floating').value)[0]?.value).toBe('0px 8px 24px 0px rgb(0 0 0 / 0.3)');
    const metricDark = token(perm({ colorScheme: 'dark' }), 'sys.type.metric.xl').value;
    expect(cssParts(metricDark).find((p) => p.suffix === '-font-weight')?.value).toBe('200');
  });

  it('springs (§9.3, §9.5, §9.7.4)', () => {
    const std = perm({});
    const reduced = perm({ motion: 'reduced' });
    const duration = (p: PermutationIR, id: string): string | undefined => cssParts(token(p, id).value).find((x) => x.suffix === '-duration')?.value;
    expect(duration(std, 'ref.motion.spring.snappy')).toBe('487ms');
    expect(duration(std, 'sys.motion.spring.snappy')).toBe('487ms');
    expect(duration(reduced, 'sys.motion.spring.snappy')).toBe('367ms');
    expect(duration(reduced, 'comp.button.motion.press')).toBe('367ms');
    expect(swiftLiteral(token(std, 'sys.motion.spring.snappy').value)).toBe(
      'DSSpringToken(duration: 0.35, bounce: 0.15, blendDuration: 0, settle: 0.487, mass: 1, stiffness: 322.2728, damping: 30.5183)',
    );
    expect(swiftLiteral(token(reduced, 'sys.motion.spring.snappy').value)).toBe(
      'DSSpringToken(duration: 0.25, bounce: 0, blendDuration: 0, settle: 0.367, mass: 1, stiffness: 631.6547, damping: 50.2655)',
    );
    expect(cssParts(token(reduced, 'sys.motion.presentation.crossfade').value)[0]?.value).toBe('1');
    expect(swiftLiteral(token(std, 'sys.motion.presentation.crossfade').value)).toBe('false');
  });
});
