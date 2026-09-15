// Lint-only Terrazzo config for `tz lint` in tokens:lint (ADR-0024 §2, §9.2; ARCHITECTURE §3.1, §14 P1-2):
// DTCG strictness on the repository resolver, with kebab-case names as errors. No plugins, so nothing
// is built from it. `tz lint` accepts non-orthogonal resolvers, so tokens:lint runs
// lint-orthogonality.ts after it. Creating this file opens the `tokens_lint` gate in CI.
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@terrazzo/cli';

export default defineConfig({
  tokens: [fileURLToPath(new URL('../../tokens/prism.resolver.json', import.meta.url))],
  plugins: [],
  lint: { rules: { 'core/consistent-naming': ['error', { format: 'kebab-case' }] } },
});
