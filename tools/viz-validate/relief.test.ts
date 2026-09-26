// The relief declaration (README.md, "Relief"): its grammar, and which slot, scheme and brand a declaration
// reaches. What a relief excuses is checks.test.ts's; reading the file from a tree is validate.test.ts's.
import { describe, expect, test } from 'vitest';
import { parseReliefFile, reliefsFor, type ReliefFile } from './relief.ts';

const parse = (value: unknown) => parseReliefFile(typeof value === 'string' ? value : JSON.stringify(value));

describe('parseReliefFile', () => {
  test('a valid file: the two reliefs, with their slots, schemes, brands and note', () => {
    const r = parse({
      $comment: 'x',
      declarations: [
        { relief: 'table-twin', slots: [2, 4], schemes: ['light'], note: 'why' },
        { relief: 'direct-labels', slots: [1], brands: ['prism'] },
      ],
    });
    expect(r.problems).toEqual([]);
    expect(r.file?.declarations).toEqual([
      { index: 0, relief: 'table-twin', slots: [2, 4], schemes: ['light'], brands: null, note: 'why' },
      { index: 1, relief: 'direct-labels', slots: [1], schemes: null, brands: ['prism'], note: null },
    ]);
    expect(parse({ declarations: [] }).file).toEqual({ declarations: [] });
  });

  test('every malformed part is named, and a file with any problem declares nothing', () => {
    const problems = (value: unknown): readonly string[] => {
      const r = parse(value);
      expect(r.file).toBeNull();
      return r.problems;
    };
    expect(problems('{ nope')[0]).toMatch(/^not JSON: /);
    expect(problems([])).toEqual(['must be an object with "declarations"']);
    expect(problems({})).toEqual(['"declarations" must be a list']);
    expect(problems({ declarations: [], extra: 1 })).toEqual(['"extra" is not a key of a relief file; known: $comment, declarations']);
    expect(problems({ $comment: 3, declarations: [] })).toEqual(['"$comment" must be a string']);
    expect(problems({ declarations: ['x'] })).toEqual(['declarations[0] must be an object']);
    expect(problems({ declarations: [{ relief: 'legend', slots: [1] }] })).toEqual(['declarations[0]: "relief" must be "direct-labels" or "table-twin", not "legend"']);
    const slots = 'declarations[0]: "slots" must be a non-empty list of distinct slot numbers (1, 2, …)';
    for (const bad of [[], [0], [1.5], [2, 2], ['1'], 3]) expect(problems({ declarations: [{ relief: 'table-twin', slots: bad }] })).toEqual([slots]);
    expect(problems({ declarations: [{ relief: 'table-twin' }] })).toEqual([slots]);
    const schemes = 'declarations[0]: "schemes" must be a non-empty list of distinct base schemes (light, dark)';
    for (const bad of [[], ['dark-increased-contrast'], ['light', 'light'], 'light']) expect(problems({ declarations: [{ relief: 'table-twin', slots: [1], schemes: bad }] })).toEqual([schemes]);
    const brands = 'declarations[0]: "brands" must be a non-empty list of distinct brand names';
    for (const bad of [[], [''], ['a', 'a'], 'prism']) expect(problems({ declarations: [{ relief: 'table-twin', slots: [1], brands: bad }] })).toEqual([brands]);
    expect(problems({ declarations: [{ relief: 'table-twin', slots: [1], note: 2 }] })).toEqual(['declarations[0]: "note" must be a string']);
    expect(problems({ declarations: [{ relief: 'table-twin', slots: [1], scheme: ['light'] }] })).toEqual(['declarations[0]: "scheme" is not a key of a declaration; known: relief, slots, schemes, brands, note']);
    // One bad declaration among good ones still refuses the file.
    expect(problems({ declarations: [{ relief: 'table-twin', slots: [1] }, { relief: 'x', slots: [1] }] })).toHaveLength(1);
  });
});

describe('reliefsFor', () => {
  const file: ReliefFile = {
    declarations: [
      { index: 0, relief: 'table-twin', slots: [2, 3], schemes: ['light'], brands: null, note: null },
      { index: 1, relief: 'direct-labels', slots: [3], schemes: null, brands: ['native'], note: null },
      { index: 2, relief: 'table-twin', slots: [3], schemes: ['light', 'dark'], brands: null, note: null },
    ],
  };

  test('a declaration reaches its slots, in its schemes and brands; a slot takes each relief once, in file order', () => {
    expect(reliefsFor(file, 'prism', 'light', 2)).toEqual(['table-twin']);
    expect(reliefsFor(file, 'prism', 'dark', 2)).toEqual([]);
    expect(reliefsFor(file, 'prism', 'light', 1)).toEqual([]);
    expect(reliefsFor(file, 'prism', 'light', 3)).toEqual(['table-twin']);
    expect(reliefsFor(file, 'native', 'light', 3)).toEqual(['table-twin', 'direct-labels']);
    expect(reliefsFor(file, 'native', 'dark', 3)).toEqual(['direct-labels', 'table-twin']);
    expect(reliefsFor({ declarations: [] }, 'prism', 'light', 1)).toEqual([]);
  });
});
