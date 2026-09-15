// OWNED_ROOTS equals CI's stale-check list and git ignores none of them (ADR-0024 §11.1, rule 12;
// ARCHITECTURE §9.0).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { OWNED_ROOTS } from '../config.ts';
import { REPO_ROOT } from '../ir/bundle.ts';

/** The roots `.github/workflows/ci.yml` checks with `git status --porcelain` after `tokens:build`. */
function ciRoots(workflow: string, fontRootGateOpen: boolean): string[] {
  const base = /^\s*generated="([^"]+)"\s*$/m.exec(workflow)?.[1];
  if (base === undefined) throw new Error('ci.yml has no generated="…" line');
  const roots = base.split(/\s+/);
  const font = /if \[ "\$FONT_ROOT" = true \]; then generated="\$generated ([^"]+)"; fi/.exec(workflow)?.[1];
  if (font !== undefined && fontRootGateOpen) roots.push(...font.split(/\s+/));
  return roots;
}

describe('owned roots', () => {
  test('equal the stale-check list of the CI workflow', () => {
    const workflow = readFileSync(`${REPO_ROOT}.github/workflows/ci.yml`, 'utf8');
    // The font root joins the list when its gate file exists (ci.yml, `gate font_root`).
    const gate = /gate font_root\s+\S+\s+(\S+)/.exec(workflow)?.[1];
    expect(gate).toBe('tools/tokens/formats/fonts.ts');
    const roots = ciRoots(workflow, existsSync(`${REPO_ROOT}${gate ?? ''}`));
    expect([...roots].sort()).toEqual([...OWNED_ROOTS].sort());
    expect(new Set(OWNED_ROOTS).size).toBe(OWNED_ROOTS.length);
  });

  test('git ignores no root', () => {
    for (const root of OWNED_ROOTS) {
      let ignored = true;
      try {
        execFileSync('git', ['check-ignore', '-q', '--no-index', root], { cwd: REPO_ROOT, stdio: 'ignore' });
      } catch (e) {
        // git check-ignore exits 1 when the path is not ignored.
        ignored = (e as { status?: number }).status !== 1;
      }
      expect(ignored, root).toBe(false);
    }
  });
});
