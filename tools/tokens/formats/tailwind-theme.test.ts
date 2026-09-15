// tailwind.css (ARCHITECTURE §9.4, §14 P1-5; ADR-0019 §3, rules 10 and 14): compiled with
// @tailwindcss/node 4.3.3 against a fixture tokens.css, the per-utility namespaces, the composite
// type utilities, the variants in both forms, the family table against Tailwind's own class list
// (ARCHITECTURE V5), and the collision check on a crafted clash. Style Dictionary runs share a module
// singleton, so this file never uses test.concurrent.
import { fileURLToPath } from 'node:url';
import { __unstable__loadDesignSystem, compile } from '@tailwindcss/node';
import { describe, expect, test } from 'vitest';
import { TAILWIND_FAMILIES, TAILWIND_THEME } from '../config.ts';
import { collectBundle, REPO_ROOT } from '../ir/bundle.ts';
import type { IRBundle } from '../ir/types.ts';
import { cssModel } from './css/model.ts';
import { renderSheet } from './css/render.ts';
import { webScope, webScopes } from './css/web.ts';
import { checkTailwind, tailwindCollisions, tailwindModel } from './tailwind-theme.ts';

/** Resolves `@import "tailwindcss"` from the tools package, which installs it. */
const BASE = fileURLToPath(new URL('..', import.meta.url));

let repo: Promise<IRBundle> | null = null;
function repoBundle(): Promise<IRBundle> {
  repo ??= collectBundle({ root: REPO_ROOT }).then((r) => {
    if (r.bundle === null) throw new Error(r.diagnostics.map((d) => d.message).join('\n'));
    return r.bundle;
  });
  return repo;
}

async function tailwindText(): Promise<string> {
  const { text, diagnostics } = checkTailwind(await repoBundle());
  expect(diagnostics).toEqual([]);
  if (text === null) throw new Error('no tailwind.css');
  return text;
}

async function build(css: string, candidates: readonly string[]): Promise<string> {
  const compiler = await compile(css, { base: BASE, onDependency: () => undefined });
  return compiler.build([...candidates]);
}

/** The body of the first rule for `.selector` in compiled CSS. */
function ruleFor(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) return '';
  const end = css.indexOf('}', at);
  return css.slice(at, end + 1);
}

describe('tailwind.css', () => {
  test('is brand-invariant, collision-free, and references only declared custom properties', async () => {
    const b = await repoBundle();
    const { text, diagnostics } = checkTailwind(b);
    expect(diagnostics).toEqual([]);
    expect(text).not.toBeNull();
    const [a, c] = webScopes(b).map((s) => tailwindModel(s));
    expect(a).toEqual(c);
  }, 60_000);

  test('every theme variable, utility and variant carries ds (ADR-0019 rule 10); one type-ds utility per sys.type role (rule 14)', async () => {
    const b = await repoBundle();
    const scope = webScope(b, 'prism');
    const model = tailwindModel(scope);
    for (const t of model.theme) expect(t.variable).toMatch(/^--[a-z-]+-ds-[a-z0-9-]+(--[a-z-]+)?$/);
    for (const v of model.variants) expect(v.name).toMatch(/^ds-/);
    const roles = scope.ids.filter((id) => id.startsWith('sys.type.'));
    expect(model.utilities.map((u) => u.name)).toEqual(roles.map((id) => `type-ds-${id.slice('sys.type.'.length).replace(/\./g, '-')}`));
    expect(roles).toHaveLength(21);
    for (const u of model.utilities) expect(u.properties.map(([p]) => p)).toEqual(['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-variant-numeric']);
  }, 60_000);

  test('compiles with @tailwindcss/node into the utilities of ARCHITECTURE §9.4', async () => {
    const tw = await tailwindText();
    const tokensCss = renderSheet({ header: '/* fixture */', layer: 'ds.tokens', rules: cssModel(webScope(await repoBundle(), 'prism')).tokens });
    const candidates = [
      'bg-ds-page', 'text-ds-primary', 'border-ds-hairline', 'outline-ds-focus', 'bg-ds-accent', 'fill-ds-accent', 'text-ds-icon-secondary',
      'fill-ds-icon-secondary', 'stroke-ds-chart-series-1', 'bg-ds-chart-band', 'text-ds-body-md', 'h-ds-control-md', 'size-ds-icon-md',
      'p-ds-card-padding', 'gap-ds-4', 'rounded-ds-card', 'shadow-ds-elevation-2', 'shadow-ds-drawer', 'font-ds-ui', 'ease-ds-out',
      'ease-ds-spring-snappy', 'duration-ds-base', 'duration-ds-spring-snappy', 'opacity-ds-disabled', 'z-ds-overlay',
      'type-ds-body-md', 'type-ds-metric-xl', 'ds-touch:bg-ds-page', 'md:type-ds-body-md', 'bg-ds-primary', 'text-ds-page',
    ];
    const out = await build(`@import "tailwindcss";\n${tw}\n${tokensCss}`, candidates);
    expect(ruleFor(out, '.bg-ds-page')).toContain('background-color: var(--ds-color-bg-page)');
    expect(ruleFor(out, '.text-ds-primary')).toContain('color: var(--ds-color-text-primary)');
    expect(ruleFor(out, '.border-ds-hairline')).toContain('border-color: var(--ds-color-border-hairline)');
    expect(ruleFor(out, '.outline-ds-focus')).toContain('outline-color: var(--ds-color-border-focus)');
    expect(ruleFor(out, '.bg-ds-accent')).toContain('background-color: var(--ds-color-accent)');
    expect(ruleFor(out, '.fill-ds-accent')).toContain('fill: var(--ds-color-accent)');
    expect(ruleFor(out, '.text-ds-icon-secondary')).toContain('color: var(--ds-color-icon-secondary)');
    expect(ruleFor(out, '.fill-ds-icon-secondary')).toContain('fill: var(--ds-color-icon-secondary)');
    expect(ruleFor(out, '.stroke-ds-chart-series-1')).toContain('stroke: var(--ds-color-chart-series-1)');
    expect(ruleFor(out, '.bg-ds-chart-band')).toContain('background-color: var(--ds-color-chart-band)');
    const body = ruleFor(out, '.text-ds-body-md');
    expect(body).toContain('font-size: var(--ds-type-body-md-font-size)');
    expect(body).toContain('var(--ds-type-body-md-line-height)');
    expect(body).toContain('var(--ds-type-body-md-letter-spacing)');
    expect(body).toContain('var(--ds-type-body-md-font-weight)');
    expect(ruleFor(out, '.h-ds-control-md')).toContain('height: var(--ds-size-control-md)');
    expect(ruleFor(out, '.size-ds-icon-md')).toContain('var(--ds-size-icon-md)');
    expect(ruleFor(out, '.p-ds-card-padding')).toContain('padding: var(--ds-space-card-padding)');
    expect(ruleFor(out, '.gap-ds-4')).toContain('gap: var(--ds-space-4)');
    expect(ruleFor(out, '.rounded-ds-card')).toContain('border-radius: var(--ds-radius-card)');
    expect(ruleFor(out, '.shadow-ds-elevation-2')).toContain('var(--ds-elevation-2)');
    expect(ruleFor(out, '.shadow-ds-drawer')).toContain('var(--ds-shadow-drawer)');
    expect(ruleFor(out, '.font-ds-ui')).toContain('font-family: var(--ds-font-ui)');
    expect(ruleFor(out, '.ease-ds-out')).toContain('var(--ds-motion-easing-out)');
    expect(ruleFor(out, '.ease-ds-spring-snappy')).toContain('var(--ds-motion-spring-snappy-easing)');
    expect(ruleFor(out, '.duration-ds-base')).toContain('var(--ds-motion-duration-base)');
    expect(ruleFor(out, '.duration-ds-spring-snappy')).toContain('var(--ds-motion-spring-snappy-duration)');
    expect(ruleFor(out, '.opacity-ds-disabled')).toContain('opacity: var(--ds-opacity-disabled)');
    expect(ruleFor(out, '.z-ds-overlay')).toContain('z-index: var(--ds-z-overlay)');
    expect(ruleFor(out, '.type-ds-body-md')).toBe([
      '.type-ds-body-md {',
      '    font-family: var(--ds-type-body-md-font-family);',
      '    font-size: var(--ds-type-body-md-font-size);',
      '    font-weight: var(--ds-type-body-md-font-weight);',
      '    line-height: var(--ds-type-body-md-line-height);',
      '    letter-spacing: var(--ds-type-body-md-letter-spacing);',
      '    font-variant-numeric: var(--ds-type-body-md-font-variant-numeric);',
      '  }',
    ].join('\n'));
    // metric.xl takes its figures from its own token (ADR-0019 rule 14).
    expect(ruleFor(out, '.type-ds-metric-xl')).toContain('font-variant-numeric: var(--ds-type-metric-xl-font-variant-numeric)');
    // The utility takes variants.
    expect(out).toMatch(/@media \(width >= 48rem\) \{\s*\.md\\:type-ds-body-md \{/);
    // The attribute form and the media form of ds-touch.
    expect(out).toContain(':where(:root[data-ds-modality="touch"], :root[data-ds-modality="touch"] *)');
    expect(out).toContain('@media not all and (hover: hover) and (pointer: fine)');
    expect(out).toContain(':where(:root:not([data-ds-modality="pointer"], [data-ds-modality="touch"]), :root:not([data-ds-modality="pointer"], [data-ds-modality="touch"]) *)');
    // No leak across namespaces: text colors are not backgrounds and backgrounds are not text colors.
    expect(out).not.toContain('.bg-ds-primary');
    expect(out).not.toContain('.text-ds-page');
  }, 60_000);

  test('a plain rule that nests @variant ds-contrast-more expands into both forms', async () => {
    const tw = await tailwindText();
    const out = await build(`${tw}\n.x { @variant ds-contrast-more { color: red; } }`, []);
    expect(out).toContain(':root[data-ds-contrast="more"]');
    expect(out).toContain('@media (prefers-contrast: more)');
    expect(out).toContain(':root:not([data-ds-contrast="standard"], [data-ds-contrast="more"])');
  }, 60_000);

  test('config.TAILWIND_FAMILIES equals the families Tailwind derives from each namespace (ARCHITECTURE V5)', async () => {
    const namespaces = [...new Set(TAILWIND_THEME.flatMap((r) => r.vars.map((v) => v.namespace)))].sort();
    expect(Object.keys(TAILWIND_FAMILIES).sort()).toEqual(namespaces);
    for (const ns of namespaces) {
      const ds = await __unstable__loadDesignSystem(`@import "tailwindcss";\n@theme inline { ${ns}-ds-probe: var(--x); }`, { base: BASE });
      // The class-list entry type lives in a module the package does not export: read the names only.
      const classes = (ds.getClassList() as unknown as readonly (readonly [string, ...unknown[]])[]).map(([c]) => c);
      const families = [...new Set(classes.filter((c) => c.endsWith('-ds-probe')).map((c) => c.slice(0, -'-ds-probe'.length)))].sort();
      expect(families, ns).toEqual([...(TAILWIND_FAMILIES[ns] ?? [])].sort());
    }
  }, 120_000);

  test('the collision check fails a crafted clash that Tailwind resolves silently', async () => {
    const clash = [
      { variable: '--text-color-ds-x', namespace: '--text-color', name: 'x', subKey: null, tokenId: 'sys.color.text.x' },
      { variable: '--text-ds-x', namespace: '--text', name: 'x', subKey: null, tokenId: 'sys.type.x' },
    ];
    expect(tailwindCollisions(clash, []).map((d) => d.code)).toEqual(['tailwind/collision']);
    expect(tailwindCollisions(clash, [])[0]?.message).toContain('text-ds-x');
    // Tailwind indeed emits only the color for text-ds-x.
    const out = await build('@import "tailwindcss";\n@theme inline { --text-color-ds-x: var(--c); --text-ds-x: var(--s); }', ['text-ds-x']);
    expect(ruleFor(out, '.text-ds-x')).toContain('color: var(--c)');
    expect(ruleFor(out, '.text-ds-x')).not.toContain('font-size');
    // A static utility collides too, and so does an unknown namespace.
    expect(tailwindCollisions([{ variable: '--color-ds-y', namespace: '--color', name: 'y', subKey: null, tokenId: 'a' }], [{ name: 'bg-ds-y', tokenId: 'b' }]).map((d) => d.code)).toEqual(['tailwind/collision']);
    expect(tailwindCollisions([{ variable: '--nope-ds-z', namespace: '--nope', name: 'z', subKey: null, tokenId: 'a' }], []).map((d) => d.code)).toEqual(['tailwind/namespace']);
  }, 60_000);
});
