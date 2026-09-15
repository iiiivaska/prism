import { describe, expect, test } from 'vitest';
import { dedupeDiagnostics, error, formatDiagnostics, formatDiagnosticsJson, sortDiagnostics, TokenBuildError } from './diagnostics.ts';

describe('diagnostics', () => {
  const a = error('slot/mapping', 'second', { file: 'tokens/sys/color/light.tokens.json', line: 20, tokenId: 'sys.color.bg.page', hint: 'write {ref.color.slot.light.bg-page}' });
  const b = error('ref/broken', 'first', { file: 'tokens/comp/card.tokens.json', line: 5, tokenId: 'comp.card.bg', permutation: 'brand=prism|platform=web' });
  const c = error('resolver/order', 'no file');

  test('sort by file, line, code, token and message; diagnostics without a file come last', () => {
    expect(sortDiagnostics([c, a, b]).map((d) => d.code)).toEqual(['ref/broken', 'slot/mapping', 'resolver/order']);
  });

  test('dedupe keeps the first of identical findings, whatever the permutation', () => {
    const again = { ...b, permutation: 'brand=alt|platform=web' };
    expect(dedupeDiagnostics([b, again, a])).toEqual([b, a]);
  });

  test('the human printer shows file:line, code, token, message, fix and permutation', () => {
    expect(formatDiagnostics([a, b])).toBe([
      'tokens/sys/color/light.tokens.json:20  slot/mapping  sys.color.bg.page  second',
      '    fix: write {ref.color.slot.light.bg-page}',
      'tokens/comp/card.tokens.json:5  ref/broken  comp.card.bg  first',
      '    in: brand=prism|platform=web',
    ].join('\n'));
  });

  test('the JSON printer is sorted, stable and ends with a newline; undefined fields are omitted', () => {
    const json = formatDiagnosticsJson([a, c, b]);
    expect(json.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(json) as { diagnostics: Record<string, unknown>[] };
    expect(parsed.diagnostics.map((d) => d['code'])).toEqual(['ref/broken', 'slot/mapping', 'resolver/order']);
    expect(Object.keys(parsed.diagnostics[2] ?? {})).toEqual(['code', 'severity', 'message']);
  });

  test('TokenBuildError carries the sorted diagnostics', () => {
    const e = new TokenBuildError([a, b]);
    expect(e.diagnostics.map((d) => d.code)).toEqual(['ref/broken', 'slot/mapping']);
    expect(e.message).toContain('2 diagnostic(s)');
  });
});
