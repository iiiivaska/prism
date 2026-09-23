# design-sync notes: Prism (`@iiiivaska/prism-react`) → claude.ai/design

First synced 2026-09-23 from commit cace2ff into claude.ai/design project "Prism Design System" (`projectId` in config.json) (Phase 4 wave 1: Surface, Text, Button, Card, Divider, Icon, Badge).
Shape: storybook (`web/apps/gallery/.storybook`), global `window.PrismReact`.

## Setup (fresh clone)

- pnpm is not global here: `corepack pnpm` (a two-line shim on PATH lets `pnpm -r` work). Node 24.
- Build the package and its workspace deps first: `pnpm -F "@iiiivaska/prism-react..." build` (cfg.buildCmd). The gallery imports `dist/`, so the reference storybook needs the build too.
- Reference: from `web/apps/gallery`, `pnpm exec storybook build -c .storybook -o <repo>/.design-sync/sb-reference`.
- Converter: `--node-modules web/packages/react/node_modules` (pnpm keeps react, react-dom and the `@iiiivaska/prism-tokens` link there); the entry comes from cfg.entry.
- The two forks import `ts-morph` → `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules` once per clone.
- Chromium: `.ds-sync` pins `playwright@1.63.0` (the repo's version, chromium build 1243). On the owner's Mac the build lives in a shared scratchpad; set `PLAYWRIGHT_BROWSERS_PATH` to it (see the repo-level tooling notes), or let `npx playwright install chromium` fetch it.
- Build from a clean clone, not the shared checkout: the checkout usually holds another session's uncommitted work, and repo guards walk paths. `pnpm licenses:check` (and `tools/licenses/check.test.ts`) walks gitignored paths too: the woff2 copies in `.design-sync/sb-reference/` and `ds-bundle/fonts/` fail its `license-text` check wherever they exist, so a checkout that has run a sync fails it locally (CI's clean clone never has them).
- `eslint.config.js` ignores `.design-sync/`, `.ds-sync/` and `ds-bundle/`: the forks are the converter's own code (they fail `no-undef` on `console` under the workspace config), and `entries/brand-tokens.ts` belongs to no tsconfig.

## Fixes (symptom → root cause → fix)

- [GENERAL] `components: 0`, every storybook title "doesn't match a package export" → prism-react declares its types only under `exports["."].types`; the bundled `lib/dts.mjs` reads only top-level `types`/`typings`/`publishConfig.types` → fork `.design-sync/overrides/dts.mjs` (`exportsTypes()` fallback in `findTypesRoot` and `projectFor`).
- [GENERAL] `name: unknown` on Icon, `leadingIcon`/`trailingIcon: unknown` on Button, `icon: unknown` on Card → `IconName` is a 51-member string-literal union; stock `typeText` caps unions at 24 and turns anything over 240 chars into `unknown` → same dts fork keeps pure string-literal unions whole.
- [GENERAL] `tokens: 0 files` → token CSS is `src/generated/prism/tokens.css` + `src/generated/motion.css` in the tokens package, beside `prism-native/tokens.css` (a second brand that must NOT ship — it redefines every `--ds-*`); `cfg.tokensGlob` takes one pattern → fork `.design-sync/overrides/css.mjs` so `tokensGlob` may be a string[]. Fonts (Onest, JetBrains Mono) come in via `cfg.extraFonts` → `../tokens/src/generated/prism/fonts/fonts.css`.
- [GENERAL] Icon (and every Button or Card that draws a glyph) throws without a brand table → `useBrandTokens()` needs `<Theme tokens>`; the table (`@iiiivaska/prism-tokens/tokens`) isn't a prism-react export → `.design-sync/entries/brand-tokens.ts` re-exports it as `prismTokens` via `cfg.extraEntries`; `cfg.provider` = `<Theme tokens={$ref prismTokens} colorScheme="light" density="compact">` (the storybook's initialGlobals, so previews match the reference).
- [GENERAL] every preview missing the gallery stage (no page ground/padding; `on-vivid` frames stretched full width; no map/image backdrop under glass) → `harness.css` (the `ds-gallery-*` stage, frames and synthetic backdrops) was loaded only by `.storybook/preview.tsx`, which the converter replaces with cfg.provider → `web/apps/gallery/src/harness/examples.tsx` now imports `./harness.css` itself (repo change, committed with this sync), and `cfg.storyImports.loaders {".css": "css"}` compiles it into `_preview/<Name>.css` (preview-only; it never enters `styles.css`, so designs don't get the `ds-gallery-*` classes).
- `Card/Action` probe stories (custom-action, without-handler, open-card) fold into Card: `titleParts` resolves `Card/Action` to the `Card` export before any titleMap null applies. Kept on purpose — they are the only renders of Card's `action` API. `Runtime/Contract` (a runtime probe) is excluded via `titleMap {"Contract": null}`.
- `[GRID_OVERFLOW] wide` on Button, Card, Divider, Surface, Text (the gallery stage is wider than a grid cell) → `overrides.<Name>.cardMode: "column"`.
- `.prompt.md` examples were storybook harness code (`...example({...})`, `compose(S, …)`) → hand-written docs in `.design-sync/docs/<Name>.md` (cfg.docsDir): the spec's `summary`, clean JSX taken from the verified story args, condensed `usage` do/don't. Frontmatter `category` = the spec's `layer` (Primitives / Composites).

- The docs and `conventions.md` were audited claim by claim against source (4 auditors, each finding put to an independent refuter: 164 claims, 17 confirmed and fixed, 10 refuted), then the fixes re-verified until a round came back nearly dry (round 2: 6 more, round 3: 1). What the audit taught, worth keeping when editing them: only `Text` and `Icon` resolve `tone` against the Surface (`Divider` adapts except on inverse/accent, where it draws nothing; `Button` adapts only on vivid and glass, and on inverse a ghost vanishes; `Badge` never adapts); status tones collapse to the material's foreground on vivid/glass/inverse/accent; only `title-*`/`display-*` render block headings, every other Text role is an inline span; `dimmed` exists only on `metric-xl`/`metric-lg`; `scope()` paints nothing; the brand table is read only by glyphs; `Divider` paints nothing on inverse/accent and `inset="content"` pads from its own edge; glass without `backdrop` silently becomes `raised`; `glassLight` never over vivid; `scope()` on a plain element needs both `background` and `color`; a `custom` Card action draws its disc even without `onAction`; JSX examples must use inline handlers (`() => {}`), never undefined names.

## Grading

- Compare with `--max-stories 12` (Icon has 11 stories; the default cap is 6).
- The preview page frames the stage ~24 px lower/right than storybook and paints the page ground below it; that is framing, not a delta.
- All 58 stories of the 7 components graded `match`, every one image-judged (no sibling trust), with 3× crops for glyphs and badge digits.
- `[REFERENCE_STALE?]` after a dts-fork or docs edit is expected: the bundle header embeds `.d.ts`/`.prompt.md` hashes, the DS source didn't move.

## Known render warns

None.

## Re-sync risks

- `.design-sync/docs/*.md` mirror spec text at Surface v3, Text v2, Button v3, Card v5, Divider v2, Icon v1, Badge v1. When a spec's `specVersion` moves (`spec/components/<Name>.yaml`, also `implemented` in `web/packages/react/src/manifest.ts`), re-read its `summary`/`usage`/props and update the doc. Button was mid-change at sync time (outline width to `border.hairline`, ADR-0033) — re-grade Button when it lands.
- New components (IconButton, Avatar, Chip, …) appear automatically from stories; each needs a doc in `.design-sync/docs/` (else it gets the synthesized prompt with harness-code examples and lands in `misc`).
- The two forks (`dts.mjs`, `css.mjs`) shadow the bundled adapters: after a skill update, diff them against `.ds-sync/lib/` and re-apply the three small Prism edits (grep `Prism fork`).
- `cfg.provider` hard-codes `colorScheme: light`, `density: compact` to match the storybook's `initialGlobals`; if those change, change both.
- The brand table ships in the bundle (`prismTokens`); a brand switch (ADR-0020) means another entry module.
- Probe stories (`src/probes/`) are VRT pages, not canon: if one changes for test reasons, Card's card changes with it.
