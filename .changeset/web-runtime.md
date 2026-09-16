---
"@iiiivaska/prism-tokens": minor
---

The ADR-0019 web runtime (P3-2). `@iiiivaska/prism-tokens` gains `rootAttributes`, `scope`, `readContext`, `watchContext` and `mountRoot` in its brand-invariant root export, and `<Theme>`, `useTokenContext()` and `useBrandTokens()` under a new `./react` subpath, with React as an **optional** peer dependency. Every name, value, media query and nesting rule comes from the generated `runtime.ts`, so the runtime spells none of the attributes itself.

`mountRoot` and `<Theme>` write only the axes they are given, never a detected value, and their cleanup restores what was there (rule 6); a page therefore paints right before any script runs, and a `<Theme>` whose values the server already rendered with `rootAttributes(choice)` changes nothing on hydration (rule 7). `<Theme>` renders no element, has no `brand` prop, and throws in development when nested — a nested colour scheme or density is `scope()` on the app's own element. Nothing stands in for Reduce Transparency where the browser cannot report it.

Apps hand their brand's table to Prism through `setBrandTokens(tokens)`, or `<Theme tokens={tokens}>`, and read it back with `brandTokens()` or `useBrandTokens()` (ADR-0020 §6): code that needs the table and has none fails instead of falling back to another brand. The export map is now the one ADR-0019 §4 and ADR-0020 §6 describe — `.`, `./react`, `./tokens`, `./tokens.css`, `./brands/<brand>/{tokens,tokens.css,fonts.css}`, `./motion.css`, `./tailwind.css`, `./manifest.json` — plus a `style` field (critic C-14). The package README documents all of it.
