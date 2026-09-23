# ADR-0025: Web component CSS and root axes: glass fallback in React, Reduce Motion through tokens

- Status: accepted (the decision's first sentence and rule 1 amended by [ADR-0036](0036-glass-chip-and-backdrop.md): the React Surface module, Surface and its chip shape, substitutes the glass fallback)
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #25
- Amends: ADR-0019 (§4 item 6's closed uses, the Files-and-packages "Motion" bullet, rule 9 and the Alternatives bullets "A Surface that branches in React" and "Component CSS that never depends on an axis"), ADR-0022 (the Consequences "Safari" bullet)

## Context

Three decisions of 2026-09-15 describe how web components react to the root-only axes contrast, transparency and motion: ADR-0019 fixes the web runtime, ADR-0022 the glass fallback and ADR-0023 Reduce Motion. They disagree, and no ADR amends another on these points. The build design, the roadmap, the decision record and the agent skill follow ADR-0022 and ADR-0023, while `tools/tokens/ARCHITECTURE.md:8` tells an implementer who finds ARCHITECTURE and an ADR in disagreement to report it instead of implementing either reading. P3-4 therefore cannot be built as specified until one reading is recorded. The owner delegated the choice to the agents.

### What the ADRs say today (working tree, 2026-09-15)

- **The glass fallback.**
  - ADR-0019 §4 item 6 lets `ds-contrast-more` and `ds-reduce-transparency` appear "only in the Surface stylesheet, for the glass fallback of ADR-0022 §1" (`docs/adr/0019-web-runtime-contract.md:198`), and rule 9 repeats it (`:365`). Its Alternatives reject "A Surface that branches in React (`useTokenContext()` choosing glass or `raised`)", because the first paint after server rendering would show the wrong material (`:302`). They also reject component CSS that never depends on an axis, partly because "ADR-0022 §1.3 needs Surface to follow the root contrast and transparency state" (`:303`).
  - ADR-0022 §1.3 decides exactly that React branch. The React `Surface` reads `useTokenContext()`, and its stylesheet never reads "the `ds-contrast-more` or `ds-reduce-transparency` variants" (`docs/adr/0022-materials-and-fallbacks.md:84`). Its Consequences accept that server-rendered pages paint glass until hydration (`:236`).
  - `tools/tokens/ARCHITECTURE.md:1112`, roadmap P3-4 (`docs/roadmap.md:48`) and decision #22 (`docs/decisions.md:28`) follow ADR-0022.
- **Reduce Motion.**
  - ADR-0019 says "`ds-reduce-motion` carries the substitutions of ADR-0023 §8.4" (`0019:197`), and that `@iiiivaska/prism-react` "wraps its subtree in `MotionConfig` driven by `useTokenContext().motion`" (`0019:204`).
  - ADR-0023 switches those substitutions through the token `--ds-motion-presentation-crossfade`, and component CSS never reads the `ds-reduce-motion` variant (`docs/adr/0023-motion-tokens.md:173`, `:181`). Prism never sets `MotionConfig`'s `reducedMotion` prop (`:183`); ADR-0023 rejects that alternative (`:248`) and its `motion` lint kind bans the prop (`:233`, rule 10). Code written to ADR-0019's bullet fails that lint.
  - `ARCHITECTURE.md:1080` and `:1112` and `agent/SKILL.md:54` follow ADR-0023.
- **Reduce Transparency in Safari.**
  - ADR-0019 §4 item 3 adds no stand-in for Reduce Transparency and rejects deriving it from Increase Contrast (`0019:183`, `:298`). Its rule 6 test asserts that contrast `more` leaves `data-ds-transparency` untouched (`:359`). The roadmap's verify list and decision #19 agree (`docs/roadmap.md:151`, `docs/decisions.md:25`).
  - ADR-0022's Consequences say that "ADR-0019 §4.3's provider sets the reduced state only while Increase Contrast is on" (`0022:235`). No ADR decided such a heuristic.

### Facts verified for this decision (2026-09-15)

1. **White on the light fallback.** ADR-0022 F6 gives the light `raised` fallback, composited over the page, as #FBFBFC. White text on it reaches 1.03:1, and white at 78 % or 64 % composited over it reaches 1.03:1 and 1.02:1 (probe in the session scratch directory: WCAG 2.x luminance, source-over in gamma-encoded sRGB, the rule of ARCHITECTURE §10). `text.on-glass`, `text.on-glass-secondary` and `text.on-glass-tertiary` are white at 100 %, 78 % and 64 % in both schemes (ADR-0022 §3.2).
2. **Foregrounds follow the published material.** Text takes its tone from the material the enclosing Surface publishes, and Card's material-keyed cells apply only when Surface publishes that material (ADR-0022 §3.1). On the web that published material is a React value, which no stylesheet can change.
3. **Motion's own switch.** `MotionConfig` defaults to `reducedMotion: "never"`. `"user"` reads only the media query and ignores `data-ds-motion`; `"always"` drops transform and layout animations without adding a substitute opacity change (ADR-0023 M11 and Alternatives).
4. **Safari.** Safari and Safari on iOS do not support `prefers-reduced-transparency` (ADR-0019 fact 1, ADR-0022 F5).

## Decision

This ADR records ADR-0022 §1.3's route for the glass fallback and ADR-0023's route for Reduce Motion. With the glass fallback in React, the published material and the Text tones switch together; a stylesheet-only `raised` fill under the white on-glass text would be illegible until hydration (fact 1).

**Surface chooses the glass fallback in React from `useTokenContext()` (ADR-0022 §1.3). No Prism stylesheet uses `@variant ds-contrast-more`, `ds-reduce-transparency` or `ds-reduce-motion`; those three variants serve consumer code. Only `ds-pointer` and `ds-touch` appear in Prism stylesheets, for interaction-only rules.**

### 1. The closed uses of ADR-0019 §4 item 6

The list of closed uses becomes:

- Hover styles select React Aria's `[data-hovered]` inside `@variant ds-pointer` (unchanged).
- `ds-touch` and `ds-pointer` may switch other interaction-only rules. They never set a size (unchanged).
- Component CSS applies ADR-0023 §8.4 through `--ds-motion-presentation-crossfade`; no Prism stylesheet uses `ds-reduce-motion`.
- The React `Surface` chooses the glass fallback from `useTokenContext()` (`contrast === 'more'`, `transparency === 'reduce'`) and publishes the material it renders, so no Prism stylesheet uses `ds-contrast-more` or `ds-reduce-transparency`. Everything else that changes under Increase Contrast changes through tokens (ADR-0011).

The three variants stay in `tailwind.css` (ADR-0019 §3) for consumer code, as the skill teaches. The rest of item 6 stands: the package build compiles each stylesheet with `@tailwindcss/node`, now to expand `ds-pointer` and `ds-touch`, and JavaScript that depends on an axis reads `readContext()` or `useTokenContext()`.

### 2. Motion in `@iiiivaska/prism-react`

ADR-0019's Files-and-packages "Motion" bullet becomes:

- **Motion.** Where `@iiiivaska/prism-react` uses Motion, it passes the physics triplet resolved for `useTokenContext()` and leaves `MotionConfig`'s `reducedMotion` at its default `"never"` (ADR-0023 §8.5).

The triplet comes from the brand table the app hands to Prism; `@iiiivaska/prism-react` imports no `<brand>/tokens` module (ADR-0020 §6, rule 13).

### 3. ADR-0019 rule 9

Rule 9's clause "`ds-contrast-more` and `ds-reduce-transparency` appear only in the Surface stylesheet" becomes "No Prism stylesheet uses `ds-contrast-more`, `ds-reduce-transparency` or `ds-reduce-motion`". The rest of rule 9 stands, and P3-4's stylesheet test checks the new clause.

### 4. ADR-0019's Alternatives

- **"A Surface that branches in React"** is the chosen route, no longer a rejected one. Its cost is the trade-off in the Consequences.
- **"Component CSS that never depends on an axis"** still loses, on its third reason only: hover and other interaction-only rules need `ds-pointer` and `ds-touch`, because `interaction.hover` as a 0/1 number cannot switch a selector. Its first two reasons no longer hold. Surface follows contrast and transparency in React (§1), and components substitute motion through a token (§1).

### 5. ADR-0022's "Safari" consequence

The bullet reads:

- **Safari cannot report Reduce Transparency** (F5), and ADR-0019 §4 item 3 adds no stand-in. Increase Contrast alone already triggers the fallback. A Safari user who turned on only Reduce Transparency keeps web glass unless the app passes `transparency` itself.

### 6. What stays

- ADR-0019 §4 item 1: attributes carry only explicit choices, and the stylesheets evaluate the media queries themselves, so token values are right on the first paint without JavaScript. Surface's glass substitution is the one component-level exception, as ADR-0022's Consequences already say.
- ADR-0019 §1 item 6: the reduced-transparency contexts stay. The attribute and its fallback act through the `ds-reduce-transparency` variant, now in consumer code only, and through `readContext()` and `useTokenContext()`, which Surface reads.
- ADR-0023 is unchanged; this ADR aligns ADR-0019 with its §8.4, §8.5 and §12.

## Alternatives considered

- **ADR-0019's route: Surface's stylesheet switches under `@variant ds-contrast-more` and `ds-reduce-transparency`.** The fill would be right on the first paint after server rendering. But the material Surface publishes, and with it every Text tone and every material-keyed Card cell, is a React value that no stylesheet can change (fact 2), and ADR-0019 rejects the React branch. White `text.on-glass` would then sit on the light `raised` fill at 1.03:1 (fact 1). Letting Text, Card and every other glass foreground switch in CSS as well is ADR-0022's rejected "web fallback in generated CSS" in component form. It is a second implementation of ADR-0022's §3.1 table next to DSCore's, and it spreads the contrast and transparency variants beyond the single Surface exception that ADR-0022 grants to ADR-0011's "not per-component branches".
- **Both: stylesheet variants for the first paint, the React branch after hydration.** Until hydration the fill would already be `raised` while the Text tones still follow `glass`, so the page would paint illegible text (fact 1) where the chosen route paints legible glass. It also keeps two implementations of one table that must agree.
- **`ds-reduce-motion` carrying ADR-0023 §8.4's substitutions** (ADR-0019 as written). `--ds-motion-presentation-crossfade` already switches under the root selectors of `motion.css`, so the token route is right on the first paint without a variant, and the Swift code has the same shape (ADR-0023 §8.4). A variant would be a second switch for the same rule.
- **`MotionConfig` driven by `useTokenContext().motion`** (ADR-0019 as written). `"always"` adds no substitute opacity change, so components would still need §8.4's logic, and `"user"` ignores `data-ds-motion` (fact 3). ADR-0023 rejected it, and its `motion` lint kind fails on the prop.
- **A Safari stand-in for Reduce Transparency** (ADR-0022's Consequences as written). ADR-0019 §4 item 3 rejected it on evidence, and its rule 6 test asserts the opposite.

## Consequences

- **P3-4 can be built as specified.** ARCHITECTURE §9.3 and §9.4, roadmap P3-4, decision #22 and the skill already describe this route; ADR-0019 and ADR-0022 now agree with them and with ADR-0023.
- **Trade-off: server-rendered pages paint glass until hydration** for users with Increase Contrast or Reduce Transparency.
  - On the server and during hydration `useTokenContext()` returns `defaultContext` overlaid with the `<Theme>` props (ADR-0019 §4 item 2, rule 7). An app that persists the user's choice and passes `contrast` or `transparency` to `<Theme>` therefore paints the fallback from the first byte.
  - Client-rendered apps, Electron included, resolve on their first render.
  - Glass text is checked over its backdrops (ADR-0022 §3.3), so the glass shown until hydration stays legible.
- **Reduce Motion has no such gap.** The crossfade flag is a token and switches with `motion.css` before any script runs.
- **A Safari user with only Reduce Transparency keeps web glass** unless the app passes `transparency`. This was already ADR-0019's decision; ADR-0022's Consequences now say the same.
- **Three variants serve consumers only.** The P1-5 Tailwind compile test keeps its `ds-contrast-more` fixture, because consumers use the variant (ARCHITECTURE §14).
- **Documents that follow this decision:** the status lines of ADR-0019 and ADR-0022 and the `docs/adr/README.md` index; `docs/decisions.md` #25; the ADR-0019 citations in ADR-0022's Context and §1.3 and in ADR-0023 §8.4 and §8.5; the source citations in ARCHITECTURE §9.4 and roadmap P3-4. None changes in substance.

## Rules that follow

1. **On the web, only the React `Surface` substitutes the glass fallback, and it decides from `useTokenContext()`.**
   - Checked by the React Surface test of ADR-0022 rule 1 (P3-4). It also renders on the server: glass without `<Theme>` props, the fallback with `<Theme contrast="more">` or `<Theme transparency="reduce">`.
2. **No Prism stylesheet uses `ds-contrast-more`, `ds-reduce-transparency` or `ds-reduce-motion`; the only root-axis conditions in Prism stylesheets are `@variant ds-pointer` and `@variant ds-touch`.**
   - Checked by ADR-0019 rule 9's P3-4 stylesheet test, with the clause of §3.
3. **Components apply ADR-0023 §8.4 through `--ds-motion-presentation-crossfade`, and Prism never sets `MotionConfig`'s `reducedMotion`.**
   - Checked by ADR-0023 rule 9's story tests under a forced reduced context (P3-4).
   - Checked by `lint:literals` kind `motion` (ADR-0023 §12, rule 10).
4. **The runtime adds no stand-in for Reduce Transparency.**
   - Checked by ADR-0019 rule 6's Vitest suite: in a browser without `prefers-reduced-transparency`, contrast `more` leaves `data-ds-transparency` untouched.
