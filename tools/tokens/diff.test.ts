// `tokens:diff` end to end (ARCHITECTURE §11, §14 P1-7; ADR-0024 §14; roadmap P1-7 acceptance): each
// test builds a throwaway git repository in the system temporary directory from `fixtures/diff/`,
// tags a release, changes the working tree, writes a pending changeset and runs the CLI. Acceptance:
// a token removal with a patch changeset fails, and passes with a minor changeset while the last tag
// is 0.x. Style Dictionary runs share a module singleton, so this file never uses test.concurrent.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { main, parseArgs, type Io } from './diff.ts';
import {
  cleanupTemps, commitAll, commitTokens, git, initRepo, tempDir, writeChangeset, writeTokens,
} from './diff/fixture-repo.ts';

afterAll(cleanupTemps);

interface Run { readonly code: number; readonly out: string; readonly err: string; readonly summary: string }

async function run(dir: string, ...args: string[]): Promise<Run> {
  const out: string[] = [];
  const err: string[] = [];
  const summary: string[] = [];
  const io: Io = { out: (t) => out.push(t), err: (t) => err.push(t), summary: (t) => summary.push(t) };
  const code = await main(['--root', dir, ...args], io);
  return { code, out: out.join(''), err: err.join(''), summary: summary.join('') };
}

/**
 * A repository whose release `tag` holds `fixtures/diff/before/`, with the working tree changed to
 * the `after` case (uncommitted, as a pull request's tree is to the tag) and a pending changeset.
 */
function scenario(opts: { tag: string | null; after: string; bump: 'patch' | 'minor' | 'major' | null; base?: string }): string {
  const dir = initRepo();
  commitTokens(dir, opts.base ?? 'before', opts.tag === null ? {} : { tag: opts.tag });
  writeTokens(dir, opts.after);
  writeChangeset(dir, opts.bump);
  return dir;
}

describe('acceptance (roadmap P1-7): a token removal while the last tag is 0.x', () => {
  test('a patch changeset fails', async () => {
    const r = await run(scenario({ tag: 'v0.3.0', after: 'after-removed', bump: 'patch' }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('| removed | `ref.space.8` | dimension | major |');
    expect(r.out).toContain('Policy: **shifted** from `v0.3.0`');
    expect(r.out).toContain('Required bump: **minor** (major before the 0.x shift). Declared bump: **patch** (`pr.md`: `@iiiivaska/prism-tokens` patch).');
    expect(r.out).toContain('**Fail:** the declared bump (patch) is lower than the required bump (minor).');
  });

  test('a minor changeset passes', async () => {
    const r = await run(scenario({ tag: 'v0.3.0', after: 'after-removed', bump: 'minor' }));
    expect(r.code).toBe(0);
    expect(r.out).toContain('**Pass:**');
  });
});

describe('the strict policy from 1.0 on', () => {
  test.each([
    ['after-removed', 'minor', 1],
    ['after-removed', 'major', 0],
    ['after-value', 'minor', 0],
    ['after-value', 'patch', 1],
    ['after-type', 'minor', 1],
    ['after-type', 'major', 0],
    ['after-added', 'patch', 1],
    ['after-added', 'minor', 0],
    ['after-meta', 'patch', 0],
    ['after-alias', 'patch', 0],
    ['after-context-removed', 'minor', 1],
  ] as const)('v1.2.0, %s with a %s changeset exits %i', async (after, bump, code) => {
    const r = await run(scenario({ tag: 'v1.2.0', after, bump }));
    expect(r.code, r.out).toBe(code);
    expect(r.out).toContain('Policy: **strict** from `v1.2.0`');
  });

  test('a value change without any changeset fails', async () => {
    const r = await run(scenario({ tag: 'v1.2.0', after: 'after-value', bump: null }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('Declared bump: **none** (no pending changeset)');
  });
});

describe('the shifted policy while the last tag is 0.x', () => {
  test.each([
    ['after-type', 'minor', 0],
    ['after-type', 'patch', 1],
    ['after-value', 'patch', 0],
    ['after-added', 'patch', 0],
    ['after-contrast', 'patch', 1],
    ['after-contrast', 'minor', 0],
  ] as const)('v0.3.0, %s with a %s changeset exits %i', async (after, bump, code) => {
    const r = await run(scenario({ tag: 'v0.3.0', after, bump }));
    expect(r.code, r.out).toBe(code);
  });

  test('a value change without any changeset still needs a patch', async () => {
    expect((await run(scenario({ tag: 'v0.3.0', after: 'after-value', bump: null }))).code).toBe(1);
  });

  test('no token change passes without a changeset', async () => {
    const r = await run(scenario({ tag: 'v0.3.0', after: 'before', bump: null }));
    expect(r.code).toBe(0);
    expect(r.out).toContain('No token changes.');
    expect(r.out).toContain('Required bump: **none**');
  });

  test('a release of another package in the fixed group counts for the tokens', async () => {
    const dir = scenario({ tag: 'v0.3.0', after: 'after-removed', bump: null });
    writeChangeset(dir, 'minor', '@iiiivaska/prism-react');
    expect((await run(dir)).code).toBe(0);
    writeChangeset(dir, 'major', '@iiiivaska/prism-tools');   // ignored by .changeset/config.json
    expect((await run(dir)).code).toBe(1);
  });
});

describe('the base revision', () => {
  /**
   * v0.3.0 → a docs commit → v1.0.0 (tokens unchanged throughout), plus tags that are no release; the
   * working tree removes a token and declares minor.
   */
  function history(): string {
    const dir = initRepo();
    commitTokens(dir, 'before', { tag: 'v0.3.0', annotated: true });
    writeFileSync(join(dir, 'NOTES.md'), 'notes\n');
    commitAll(dir, 'docs');
    writeFileSync(join(dir, 'NOTES.md'), 'more notes\n');
    commitAll(dir, 'release', { tag: 'v1.0.0' });
    git(dir, 'tag', 'v2.0.0-rc.1');
    git(dir, 'tag', 'nightly');
    writeTokens(dir, 'after-removed');
    writeChangeset(dir, 'minor');
    return dir;
  }

  test('by default the newest release tag merged into HEAD, here v1.0.0: strict, so the removal needs major', async () => {
    const r = await run(history());
    expect(r.code).toBe(1);
    expect(r.out).toContain('Base: `v1.0.0`');
    expect(r.out).toContain('Policy: **strict** from `v1.0.0`');
  });

  test('--base on a non-tag ref compares against it and takes the policy from the newest tag merged into it (ADR-0024 §14)', async () => {
    const r = await run(history(), '--base', 'HEAD~1');
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Base: `HEAD~1`');
    expect(r.out).toContain('Policy: **shifted** from `v0.3.0`');
    expect(r.out).toContain('| removed | `ref.space.8` |');
  });

  test('--base on a revision with no release tag merged into it reports the changes and passes', async () => {
    const dir = scenario({ tag: null, after: 'after-removed', bump: null });
    const r = await run(dir, '--base', 'HEAD');
    expect(r.code).toBe(0);
    expect(r.out).toContain('Policy: none: no release tag is merged into `HEAD`');
    expect(r.out).toContain('| removed | `ref.space.8` |');
  });

  test('no release tag yet: exit 0 with the notice', async () => {
    const r = await run(scenario({ tag: null, after: 'after-removed', bump: null }));
    expect(r.code).toBe(0);
    expect(r.out).toContain('no baseline; every token counts as added');
    expect(r.summary).toContain('no baseline; every token counts as added');
  });

  test('a base whose sources fail the current validation fails, with its diagnostics', async () => {
    const r = await run(scenario({ tag: 'v0.3.0', base: 'invalid', after: 'before', bump: null }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('fails the current validation with 1 diagnostic(s)');
    expect(r.out).toContain('ref/broken');
  });

  test('--allow-invalid-baseline <reason> skips that comparison and records the reason', async () => {
    const dir = scenario({ tag: 'v0.3.0', base: 'invalid', after: 'before', bump: null });
    const r = await run(dir, '--allow-invalid-baseline', 'v0.3.0 predates the reference check');
    expect(r.code).toBe(0);
    expect(r.summary).toContain('was passed with the reason "v0.3.0 predates the reference check"');
    expect(r.summary).toContain('ref/broken');
  });

  test('the flag changes nothing when the base is valid', async () => {
    const r = await run(scenario({ tag: 'v0.3.0', after: 'after-removed', bump: 'patch' }), '--allow-invalid-baseline', 'unused');
    expect(r.code).toBe(1);
  });

  test('a working tree that fails validation fails', async () => {
    const r = await run(scenario({ tag: 'v0.3.0', after: 'invalid', bump: 'major' }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('the working tree fails validation');
  });

  test('a shallow clone fails instead of missing its tags', async () => {
    const source = scenario({ tag: 'v0.3.0', after: 'before', bump: null });
    const parent = tempDir('prism-diff-clone-');
    git(parent, 'clone', '--quiet', '--depth', '1', `file://${source}`, 'shallow');
    const r = await run(join(parent, 'shallow'));
    expect(r.code).toBe(1);
    expect(r.out).toContain('shallow clone');
  });
});

describe('output', () => {
  test('--json: the outcome as data', async () => {
    const r = await run(scenario({ tag: 'v0.3.0', after: 'after-removed', bump: 'patch' }), '--json');
    expect(r.code).toBe(1);
    const json = JSON.parse(r.out) as Record<string, unknown>;
    expect(json).toMatchObject({
      status: 'fail', exitCode: 1, tag: 'v0.3.0', policy: 'shifted', required: 'minor', requiredStrict: 'major',
      declared: { bump: 'patch' }, changes: [{ kind: 'removed', path: 'ref.space.8', type: 'dimension', level: 'major' }],
    });
    expect(r.summary).toContain('### Token changes (`tokens:diff`)');
  });

  test('the step summary gets the same Markdown as stdout', async () => {
    const r = await run(scenario({ tag: 'v0.3.0', after: 'after-value', bump: 'patch' }));
    expect(r.summary).toBe(r.out);
    expect(r.out).toContain('| value-changed | `size.control.md` | 4 of 12 permutations (density: regular) | minor |');
    expect(r.out).toContain('| value-changed | `ref.space.8` | all 12 permutations | minor |');
  });

  test('a malformed changeset fails and names the file', async () => {
    const dir = scenario({ tag: 'v0.3.0', after: 'before', bump: null });
    mkdirSync(join(dir, '.changeset'), { recursive: true });
    writeFileSync(join(dir, '.changeset', 'broken.md'), 'no front matter\n');
    const r = await run(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain('broken.md: no front matter');
  });

  test('--changesets reads another folder', async () => {
    const dir = scenario({ tag: 'v0.3.0', after: 'after-removed', bump: 'patch' });
    const other = tempDir('prism-diff-changesets-');
    writeChangeset(other, 'minor');
    expect((await run(dir, '--changesets', join(other, '.changeset'))).code).toBe(0);
  });
});

describe('usage', () => {
  test('arguments', () => {
    expect(parseArgs(['--nope'])).toBe('unknown argument --nope');
    expect(parseArgs(['--base'])).toBe('--base needs a value');
    expect(parseArgs(['--allow-invalid-baseline', ' '])).toBe('--allow-invalid-baseline needs a reason');
    expect(parseArgs(['--allow-invalid-baseline', '--json'])).toBe('--allow-invalid-baseline needs a value');
    const args = parseArgs(['--root', '/r', '--json']);
    expect(args).toMatchObject({ base: null, changesets: '/r/.changeset', json: true, allowInvalidBaseline: null, root: '/r', resolver: 'tokens/prism.resolver.json' });
  });

  test('usage errors exit 2', async () => {
    const dir = scenario({ tag: 'v0.3.0', after: 'before', bump: null });
    expect((await run(dir, '--nope')).code).toBe(2);
    const unknown = await run(dir, '--base', 'v7.7.7');
    expect(unknown.code).toBe(2);
    expect(unknown.err).toContain('--base v7.7.7');
    const plain = await run(tempDir('prism-diff-plain-'));
    expect(plain.code).toBe(2);
    expect(plain.err).toContain('not inside a git work tree');
    const unborn = await run(initRepo());
    expect(unborn.code).toBe(2);
    expect(unborn.err).toContain('HEAD names no commit');
  });
});
