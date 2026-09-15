# ADR-0023: Motion tokens: springs, settle, reduced motion and CSS easing

- Status: accepted
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #23
- Amends: ADR-0003 (web stack "Motion" bullet: how CSS springs are generated and how Motion is configured), ADR-0011 (the Reduce Motion bullet under "Weight and material rules")

## Context

Motion is a token category like any other (ADR-0004), but it is the only one whose value is a small physical model. ADR-0003 says web and SwiftUI springs "derive from the same two numbers" (`docs/adr/0003-two-implementations-swiftui-react.md:29`); ADR-0011 says motion becomes a crossfade under Reduce Motion (`docs/adr/0011-accessibility-tiers-ci.md:28`). The Phase 1 build design (`tools/tokens/ARCHITECTURE.md` §7.6) already assumes answers to questions no decision records. This ADR records them.

Three decisions taken the same day are inputs here, not repeated:

- ADR-0019 fixes the web runtime: the root-only attribute `data-ds-motion` (`standard | reduce`) with the fallback `(prefers-reduced-motion: reduce)`, `<Theme motion>`, `useTokenContext()`, and the `runtime` kind of `lint:literals`. It leaves motion values and context names to this ADR (ADR-0019 §7).
- ADR-0024 renames `ref.motion.easing.inOut` to `in-out` (§2.2), makes every folded extension key alias-proof (§4.1, `extension/alias-override`), sets the flag convention (§4.2) and the spec binding rules (§5).
- ADR-0022 makes `accessibility.reduceMotion` a required spec field (its rule 9, critic C-26).

### What the repository says today (working tree, 2026-09-15)

- **Reduced context is not layered (critic C-01, ARCHITECTURE S3).** The `reduced` context of the `motion` modifier loads only `sys/motion/reduced.tokens.json` (`tokens/prism.resolver.json:78`), while the colorScheme variants layer their delta over the base file (`tokens/prism.resolver.json:53-56`). The delta lacks `duration.instant`, `duration.quick`, `spring.interactive` and `spring.smooth` (`tokens/sys/motion/reduced.tokens.json:5-31`, `:32-97`), so those four tokens do not exist in 216 of 432 permutations (ARCHITECTURE §1 S3, verified by the completeness check). `spec/components/Card.yaml:141` and `spec/components/Surface.yaml:108` bind `motion.spring.smooth`.
- **Three definitions of reduced motion.**
  - ADR-0011: "Motion tokens resolve to a 150 ms crossfade under Reduce Motion; no parallax, no spring overshoot" (`0011:28`).
  - The tokens: bounce 0, shortened durations, presentation transitions crossfade (`tokens/README.md:93`, `reduced.tokens.json`, the `presentation.crossfade` description "0 = transitions may translate/scale; 1 = crossfade only" at `default.tokens.json:48`), taken from `docs/research/motion-haptics.md:351-362` and `:537`.
  - `docs/research/arch-web.md:132` (§2.7): `--ds-motion-*` durations "collapse to 0".
- **Stale fallbacks (ARCHITECTURE S5).** The reduced springs author `$value.duration` 250 / 250 / 300 ms and no `settle` (`reduced.tokens.json:36-39`, `:57-60`, `:78-81`); their settle is 367 / 367 / 440 ms. `docs/research/verification.md:84` and critic C-01 quote 441 ms: that is the rounded crossing (440.86 ms); the floor rule below gives 440.
- **Spring parameters and aliases (critic G-05).** Only `ref.motion.spring.*` carries `$extensions["app.prism"].spring` (`tokens/ref/motion.tokens.json:107-116` and siblings). The sys springs are bare aliases (`tokens/sys/motion/default.tokens.json:26-43`) and `comp.button.motion.press` aliases sys (`tokens/comp/button.tokens.json:100-105`). DTCG 2025.10 defines no propagation of `$extensions` through references and Style Dictionary 5.5.3 does not copy them (ARCHITECTURE §15 F8, F27). ARCHITECTURE §5.4 folds `spring` into the normalized value so aliases inherit it; the prototype showed `comp.button.motion.press` resolving to (0.35, 0.15) by default and (0.25, 0) reduced (F11). No accepted decision stated this, and ARCHITECTURE §7.1 also let an alias override the spring with its own copy.
- **CSS generation (critic C-08).** ADR-0003:29, `docs/roadmap.md:20` (P1-4), `tools/tokens/README.md:29` and `docs/research/arch-web.md:18`, `:204`, `:209`, `:404` plan the CSS `linear()` string "via Motion's `spring()`", with arch-web treating Motion's `(visualDuration, bounce)` as SwiftUI's two numbers. The 2026-09-14 fact-check refuted both (`docs/research/verification.md:50-55`).
- **`interactive` bounce (critic S-03).** `tokens/ref/motion.tokens.json:117` and `tools/tokens/seed-ref-tokens.py:160` call `interactive (0.15, 0)` "Apple interactiveSpring defaults"; Apple's is (0.15, 0.15) (`verification.md:45-49`), and the owner decision was left open (`verification.md:83`). motion-haptics still names the extension `dev.prism.spring` (`motion-haptics.md:16`, `:195-215`, `:225`, `:533`) and the modes `full | reduced` (`:351`, `:537`); the resolver uses `app.prism.spring` and `default | reduced`.
- **Missing roles and types.** Specs may bind `sys.*` only, but easings exist only as `ref.motion.easing.*` (ARCHITECTURE S6); `tokens/README.md:36` lists `motion.easing.standard|emphasized`, which exist nowhere. `sys.motion.presentation.crossfade` is a number used as a boolean with no flag (S10; `default.tokens.json:44-50`, `reduced.tokens.json:98-103`).
- **Parity tolerances.** `tokens/README.md:91`, ARCHITECTURE §9.7.6 and roadmap P3-1 (`docs/roadmap.md:42`) accept stiffness and damping within 1 % and settle within 10 ms.
- **Spec semantics.** `spec/component.schema.json:83` offers `motion.reduceMotion: none | crossfade | instant` without defining them, next to a free-text `accessibility.reduceMotion` (`:98`). Button and Card declare `crossfade` and describe it as "press scale is replaced by an opacity dip" (`spec/components/Button.yaml:124`, `:137`; `Card.yaml:142`, `:155`): a press is not a presentation transition, so a crossfade limited to presentations would not cover it. `spec/SCHEMA.md:108` binds a token `motion.press` that does not exist.

### Facts re-verified for this ADR (2026-09-15)

Probes ran in a scratch directory outside the repository against Node 24.21.0 with the repository's `motion` 13.2.0 (`tools/node_modules`, `motion-dom` 13.2.0, `framer-motion` 13.2.0) and Xcode 26.6 (Swift 6.3.3, macOS 26 SDK). The review of this ADR re-ran M1–M4 and M6–M11 independently and got the same numbers.

| # | Fact | Evidence |
|---|------|----------|
| M1 | SwiftUI `Spring(duration:bounce:)` returns `mass 1`, `stiffness (2π/duration)²` and `damping 4π(1 − bounce)/duration` to within 3.6e-16 relative for all eight probed springs: interactive 1754.5963 / 83.7758, Apple's interactive (0.15, 0.15) 1754.5963 / 71.2094, snappy 322.2728 / 30.5183, smooth 246.7401 / 31.4159, sheet 438.6491 / 33.5103, bouncy 157.9137 / 17.5929, (0.25, 0) 631.6547 / 50.2655, (0.30, 0) 438.6491 / 41.8879. | compiled `swiftc` probe, macOS host |
| M2 | Sampling `Spring.value(target: 1, initialVelocity: 0, time:)` every 0.1 ms, the last time `\|1 − x\| ≥ 0.001` is 220.4 / 487.6 / 587.8 / 404.5 / 818.7 ms (interactive, snappy, smooth, sheet, bouncy) and 367.3 / 440.8 ms for (0.25, 0) / (0.30, 0). The Node closed form gives 220.431 / 487.688 / 587.817 / 404.581 / 818.746 / 367.385 / 440.863 ms. | same probe; Node closed-form probe at 1 µs |
| M3 | `Spring.settlingDuration` returns 0.300 / 0.6354 / 0.600 / 0.584 / 1.0447 / 0.400 / 0.500 s for the same springs: not the ε = 0.001 settle its documentation describes. | same probe |
| M4 | `Animation.interactiveSpring()` is `FluidSpringAnimation(response: 0.15, dampingFraction: 0.85, blendDuration: 0.25)`, i.e. `(0.15, 0.15)`; its settle is 209.0 ms. | same probe |
| M5 | For bounce −0.2 (duration 0.5) the closed form with `damping = 4π/(duration·(1 + bounce))` = 31.4159 settles at 1145.19 ms; SwiftUI's sampled curve settles at 1145.1 ms. SwiftUI's `stiffness` getter returns 335.5666 instead of 157.9137 for that spring; the WWDC23 slide formula gives −6.2418. | same probes; `verification.md:32-37` |
| M6 | Motion's `spring({ keyframes: [0, 1], stiffness, damping, mass: 1, restDelta: 1e-9, restSpeed: 1e-9 })` equals the closed form to within 6e-16 at every millisecond, across the admitted range of §1. For bounce 0 it takes its critically damped branch (the damping ratio computes to exactly 1). With default rest thresholds it snaps to 1 near extrema (bouncy: 0.00211 error at 700 ms). `toString()` uses its own 50 ms-grid rest time (interactive 300, snappy 550, smooth 650, sheet 500, bouncy 700 ms) and 30 ms stops. Time-defined springs (`duration`/`visualDuration` + `bounce`) set `velocity` to 0 (`getSpringOptions`). | `motion-dom/dist/es/animation/generators/spring.mjs`, `utils/calc-duration.mjs`; probe |
| M7 | Motion's `generateLinearEasing(easing, durationMs, resolution = 10)` emits `max(round(duration / resolution), 2)` uniform stops rounded to 4 decimals, without positions or simplification. To stay within 0.0025 of the curve it needs 1 ms resolution (220 to 818 stops, 1.7 to 6.4 KB per spring); at its 10 ms default it errs by up to 0.0154 (interactive) and at 16.7 ms by 0.0334. | `motion-dom/dist/es/animation/waapi/utils/linear.mjs`; probe |
| M8 | Ramer–Douglas–Peucker with a 0.002 vertical tolerance over 1 ms samples, serialized with 4-decimal values and 2-decimal percent positions, gives 20 to 24 stops for today's springs (272 to 330 bytes each) with a maximum error of 0.00205 (snappy) against the closed form, measured every 0.1 ms. Over the admitted range of §1 (durations every 5 ms from 0.1 to 1 s × bounce 0 to 0.4 in steps of 0.01, 7,421 springs) it gives at most 30 stops and at most 0.00224 error (at (0.12, 0.14)). The snappy and reduced snappy strings equal ARCHITECTURE §7.6 and §9.3 byte for byte. | probe |
| M9 | Across the admitted range the settle lies between 104.5 ms (0.1, 0.08) and 1651 ms (1, 0.33). | probe, bounce steps of 0.01 |
| M10 | SwiftUI exposes `accessibilityReduceMotion` on every platform (`SwiftUICore.swiftinterface`, iOS and watchOS SDKs); it has no environment value for "Prefer Cross-Fade Transitions". UIKit's `UIAccessibilityPrefersCrossFadeTransitions()` is iOS/tvOS 14+ and unavailable on watchOS (`UIKit.framework/Headers/UIAccessibility.h:570`); the macOS SDK has no equivalent, and CSS has no media feature for it. | SDK headers and interfaces |
| M11 | Motion's `MotionConfigContext` defaults to `reducedMotion: "never"`. With `"user"`, and in `useReducedMotion()`, Motion reads `window.matchMedia("(prefers-reduced-motion)")` and nothing else, so it ignores `data-ds-motion`. | `framer-motion/dist/es/context/MotionConfigContext.mjs:10`, `utils/reduced-motion/use-reduced-motion-config.mjs`; `motion-dom/dist/es/render/utils/reduced-motion/index.mjs:9` |

Other constraints: DTCG 2025.10 has `duration`, `cubicBezier` and `transition` but no spring type (`tokens/README.md:84`). A later declaration of a token replaces the whole token, `$extensions` included (Resolver 2025.10 §4.1.4; ARCHITECTURE §5.3). A CSS `linear()` spring cannot carry velocity when interrupted (`motion-haptics.md:110`). `linear()` is Baseline widely available since 2026-06-11, but Tailwind v4's browser floor (Safari 16.4) predates it (ARCHITECTURE §7.6). Apple's guidance under Reduce Motion is to tighten springs, replace x/y/z transitions with fades, reduce zooming and scaling, avoid animating depth and blur, and keep tracking gestures directly (`motion-haptics.md:339`).

## Decision

### 1. Spring tokens

A spring is a DTCG `transition` token whose `$value` is a literal transition object and whose `$extensions["app.prism"].spring` holds Apple's two-parameter spring. That extension is the source of truth.

| Key | Meaning | Admitted values |
|-----|---------|-----------------|
| `duration` | Apple's perceptual duration, seconds | 0.1 ≤ duration ≤ 1 |
| `bounce` | Apple's bounce | 0 ≤ bounce ≤ 0.4 |
| `blendDuration` | SwiftUI `.spring(_:blendDuration:)`, seconds; Apple-only | 0 ≤ blendDuration ≤ 1, default 0 |
| `settle` | derived settle in seconds (§3), kept in the source for readers and other tools; generators never read it | settleMs / 1000 |

No other key is allowed. The keys and bounds are schema rules (`tools/tokens/schema/app-prism.schema.json`).

- The duration bounds reject a duration typed in milliseconds and keep every settle between 104 ms and 1.66 s (M9). A shorter spring would be indistinguishable from `duration.quick` or `duration.instant`; today's shortest is 0.15 s.
- Above 0.4 WWDC23 says bounce "may feel too exaggerated for a UI element" (`motion-haptics.md:64`); today's maximum is 0.30.
- The lower bounce bound rejects negative bounce (§2).

The `$value` is the fallback for tools and browsers without springs: `duration` = settleMs ms, `delay` = 0 ms, `timingFunction` = an alias of a `ref.motion.easing.*` token. A spring on any other token is a build error: on an alias it fails ADR-0024 §4.1's `extension/alias-override` (§4); on a token that is not a `transition`, or whose `timingFunction` is not such an alias, it fails `spring/fallback` (`source/analyze.ts`).

### 2. Physics

`mass = 1`, `stiffness = (2π / duration)²`, `damping = 4π(1 − bounce) / duration`, damping ratio `1 − bounce`. SwiftUI computes exactly this (M1).

Negative bounce would need `damping = 4π / (duration·(1 + bounce))` (M5, `verification.md:32-36`). No token needs an overdamped spring, and SwiftUI's `stiffness` getter is wrong for one (M5). Admitting negative bounce therefore takes a new ADR, whose parity test must compute stiffness from the formula rather than the getter.

### 3. Settle

`settleMs = floor(1000 · t_last)`, where `t_last` is the last time in [0, 5 s] at which the unit step response from rest, `x(t)` (x(0) = 0, x′(0) = 0), satisfies `|1 − x(t)| ≥ 0.001`. Only displacement counts, not velocity.

- The Node build uses the closed form: the critical branch for bounce 0, the underdamped branch otherwise. It locates `t_last` to 1 µs; ARCHITECTURE §7.6 gives one method.
- The Swift side samples `Spring.value` (§11, P3).
- No code uses `Spring.settlingDuration`, `Spring(settlingDuration:dampingRatio:epsilon:)` or the duration from Motion's `toString()`. All three are different, longer estimates (M3, M6).
- Floor reproduces every committed value; rounding would change four of them (ARCHITECTURE §7.6).

| Spring | (duration, bounce) | settle, default | Reduce Motion (§8) | Use |
|--------|--------------------|-----------------|--------------------|-----|
| `interactive` | (0.15, 0), blend 0.25 | 220 ms | unchanged | only while a finger or pointer is dragging |
| `snappy` | (0.35, 0.15) | 487 ms | (0.25, 0), 367 ms | default for state changes: toggles, segmented controls, selection, popovers |
| `smooth` | (0.40, 0) | 587 ms | (0.30, 0), 440 ms | reposition, layout and morph with no overshoot |
| `sheet` | (0.30, 0.20) | 404 ms | (0.25, 0), 367 ms | sheets and drawers after a flick or drag release |
| `bouncy` | (0.50, 0.30) | 818 ms | (0.30, 0), 440 ms | delight tier only |

### 4. Springs through aliases (G-05)

The spring is part of the token's resolved value (ARCHITECTURE §5.4: folded into `IRTransition.spring`). Every whole-value alias inherits it through `sys` and `comp`, in every context. `comp.button.motion.press` is snappy's (0.35, 0.15) by default and (0.25, 0) under Reduce Motion.

**An alias never declares its own `spring`.** The build rejects it with ADR-0024 §4.1's `extension/alias-override`, which applies this rule to every folded key; this ADR adds no separate code. An alias's `$value` fallback comes from its target, so a spring of its own would disagree with its own fallback duration. A `comp` token is always a whole-value alias of one `sys` token (ADR-0024 §5.1), so a component cannot carry a spring of its own either. A new motion character is a new `ref`/`sys` spring token.

### 5. CSS easing (C-08)

For every token that carries a spring, the build emits `-duration: <settleMs>ms` and `-easing: linear(…)` (as a `var()` of its target for an alias, ARCHITECTURE §9.3). The `linear()` string is built as follows:

1. Build Motion's physics generator: `spring({ keyframes: [0, 1], stiffness, damping, mass: 1, restDelta: 1e-9, restSpeed: 1e-9 })` with §2's unrounded numbers.
2. Sample it at t = 0, 1, …, settleMs − 1 ms with `next(t).value`, and set the value at t = settleMs to exactly 1.
3. Simplify with Ramer–Douglas–Peucker on vertical distance: between two kept samples, keep the sample farthest from their chord (the earliest on a tie) while that distance exceeds 0.002, and recurse on both halves.
4. Serialize with Prism's number formatter: 4-decimal values, positions `100 · t / settleMs` to 2 decimals as percentages, and no position on the first and last stop.

An `@supports not (transition-timing-function: linear(0, 1))` twin sets `-easing` to the token's `timingFunction`.

Motion's `toString()`, `generateLinearEasing` and `visualDuration` are not used (M6, M7). In the build, Motion is only the physics generator, so the CSS curve comes from the same code the web runtime uses for gesture springs (§6). The closed form is the test oracle. ARCHITECTURE §7.6 and §9.3 hold the rendering details and samples.

### 6. Springs at runtime

- **Web, state-driven** transitions (toggle, popover, toast, press) use the CSS variables of §5.
- **Web, Motion.** Where a component needs Motion, for gestures, drags, reordering, layout animation or exit transitions (ADR-0003), it configures Motion with the physics triplet from `tokens.ts` (`stiffness`, `damping`, `mass`), resolved for the current context (`resolveTokens(useTokenContext())`, ADR-0019 §4), plus the release velocity for a gesture. It never passes `duration`, `visualDuration` or `bounce` to Motion: Motion zeroes the velocity of time-defined springs and maps durations differently (M6).
- **SwiftUI** uses `DSSpringToken.spring` (`Spring(duration:bounce:)`) and `DSSpringToken.animation` (`.spring(_:blendDuration:)`).

### 7. The `interactive` spring

`interactive` stays (0.15, 0) with blend 0.25. Apple's duration and blend are kept; **bounce 0 is Prism's choice**, where Apple's `interactiveSpring` uses 0.15 (M4).

- Tracking a finger is not a momentum release, and Prism adds bounce only after momentum or in the delight tier (`motion-haptics.md:27`, `:327`).
- With bounce 0 the spring already meets the reduced-motion rule, so gesture tracking is identical under Reduce Motion, as Apple's guidance asks.
- The cost is an 11 ms longer settle (220 against 209 ms) and no 0.6 % retarget overshoot.
- The `$description` says so instead of "Apple interactiveSpring defaults".

### 8. Reduce Motion: the one definition (C-01)

This section replaces the three definitions listed in the Context: ADR-0011's "Motion tokens resolve to a 150 ms crossfade under Reduce Motion; no parallax, no spring overshoot"; the tokens' "presentation transitions crossfade" (with motion-haptics §6.3's `full | reduced` string-token design behind it); and arch-web §2.7's "durations collapse to 0". It has three parts: token values (§8.1 to §8.3), component behavior (§8.4) and where the setting is read (§8.5).

**8.1 Layering.** `tokens/prism.resolver.json`: `"reduced": [ { "$ref": "sys/motion/default.tokens.json" }, { "$ref": "sys/motion/reduced.tokens.json" } ]`. The reduced file is a delta over the default file, the pattern the colorScheme variants already use. Because a later declaration replaces the whole token, every token the delta overrides restates its full `$value` and `$extensions`.

**8.2 Values** (public paths; the reduced column lists overrides, and empty cells inherit):

| Token | Default | Reduced |
|-------|---------|---------|
| `motion.duration.instant` / `quick` | 0 / 100 ms | — |
| `motion.duration.fast` | 150 ms | 100 ms |
| `motion.duration.base` / `slow` / `slower` | 250 / 350 / 500 ms | 150 ms each |
| `motion.spring.interactive` | (0.15, 0), blend 0.25 | — |
| `motion.spring.snappy`, `sheet` | (0.35, 0.15), (0.30, 0.20) | (0.25, 0), 367 ms |
| `motion.spring.smooth` | (0.40, 0) | (0.30, 0), 440 ms, **new override** |
| `motion.spring.bouncy` | (0.50, 0.30) | (0.30, 0), 440 ms |
| `motion.easing.*` | §9 | — |
| `motion.presentation.crossfade` | 0 | 1 |

The seed left `smooth` at (0.40, 0): it had no bounce to remove, but its 587 ms settle would be the longest transition under Reduce Motion. (0.30, 0) keeps `smooth` no faster than `snappy` and shortens its settle by 147 ms. The reduced springs and durations stay literal `sys` values: ADR-0024 §5.1, which replaces ADR-0002 rule 1, constrains alias direction rather than literals; ADR-0020 §3 lets motion durations and springs stay literal; and `ref.motion.*` is system-owned (ADR-0020), so a `ref` copy would serve no brand. This settles critic R-02 for motion.

**8.3 Invariants.** Per scope, the build compares the two motion contexts at the other axes' defaults (`motion/reduced-policy`, Rule 7). `ref` tokens do not vary by context and are not compared.

- Both contexts declare the same ids.
- In `reduced`, every `sys` and `comp` token that carries a spring has bounce 0, a duration ≤ min(its default duration, 0.30 s) and a settle ≤ its default settle. The settle clause catches a real trap: (0.30, 0.20) → (0.30, 0) would lengthen `sheet` from 404 to 440 ms.
- In `reduced`, every `sys` and `comp` token of type `duration` is ≤ min(its default, 150 ms). The fallback durations of springs are transitions, not durations, and are bounded by the settle clause.
- `motion.presentation.crossfade` is 0 in `default` and 1 in `reduced`.
- `motion.spring.interactive` and every `motion.easing.*` are identical in both contexts.

**8.4 Behavior.** Under Reduce Motion every component follows its spec's `motion.reduceMotion`. The three values nest: `none` ⊂ `crossfade` ⊂ `instant`.

- **`crossfade`**: nothing the component animates outside an active gesture scales, rotates, blurs or changes depth (3D transforms, z-position, parallax), and no presentation moves.
  1. **Presentations**: an element appears, disappears or replaces another (sheet, popover, toast, a card opening into its detail). Only opacity animates, over `motion.duration.base` with `motion.easing.out` (150 ms under Reduce Motion: ADR-0011's "150 ms crossfade"). Position, scale, rotation, blur and depth take their end values at once.
  2. **In-place changes that scale, rotate, blur or change depth**: a press scale, a zoom, a blur ramp, a material change that animates blur. The geometry or blur takes its end value at once. The change shows instead as an opacity or color change to a token the spec names, over the same duration and easing. Button and Card: "press scale is replaced by an opacity dip".
  3. **In-place movement**: a selection indicator sliding between segments, reordering, expanding and collapsing, repositioning. It keeps its bound spring, which has no bounce and is shorter under Reduce Motion (Apple: "tightening animation springs").
  4. **Color, opacity and fill** animations keep their bound tokens, which are already reduced.
- **`instant`**: everything `crossfade` says, and the component's decorative animations do not run (count-up, numeric roll, pulses, ambient loops, shimmer, specular sweep). Their values change at `motion.duration.instant`.
- **`none`**: the component has nothing that §8.4 substitutes; its bound tokens reduce on their own.

In every case, gesture tracking follows the finger or pointer directly, smoothed at most by `motion.spring.interactive`. A release continues with the bound spring, which has no bounce under Reduce Motion. Under Reduce Motion nothing animates parallax. Durations never collapse to 0, except through `motion.duration.instant` or `instant`'s decorative animations.

**Timing without a context branch.** The opacity animations of items 1 and 2 use `motion.duration.base` and `motion.easing.out` in both contexts. Transform, blur and depth magnitudes are multiplied by `1 − motion.presentation.crossfade`; a substitute opacity change (item 2) is multiplied by `motion.presentation.crossfade`. The switch is therefore a token value, as component CSS requires under ADR-0019 §4 item 6 as amended by ADR-0025, and the Swift code has the same shape.

A spec's `motion.reduceMotion` is the machine-readable choice. Its `accessibility.reduceMotion` (required by ADR-0022 rule 9) states the result in words: which substitute, and to which token. The two must agree.

**8.5 One switch per platform.** Components read Prism's motion context, never the OS setting.

- **Apple:** DSCore sets `DSTokenContext.motion` to `.reduced` while `DSAccessibilityPolicy.reduceMotion` is true. The policy defaults to `accessibilityReduceMotion` (ADR-0019 §5). Previews, tests and an app's own setting can force it. Components read `DSTokenSet.motion`: `presentationCrossfade`, springs and durations.
- **Web:** `motion.css` switches under ADR-0019 §1's root switch: `data-ds-motion` = `standard | reduce` on `<html>`, else `(prefers-reduced-motion: reduce)`; `<Theme motion>` sets the attribute.
  - Component CSS reads the motion tokens and `--ds-motion-presentation-crossfade` (0 or 1, used in `calc()`). It never reads the attribute, the `ds-reduce-motion` variant or the media query (ADR-0019 §4 item 6 as amended by ADR-0025).
  - Component scripts read `useTokenContext().motion` (ADR-0019 §4).
  - Motion's own reduced-motion switch stays at its default `"never"` (M11): Prism never sets `MotionConfig`'s `reducedMotion` prop and never calls `useReducedMotion()`. `"user"` and the hook read the media query and ignore `data-ds-motion`; `"always"` would duplicate §8.4 without its substitutes (see Alternatives).
- **"Prefer Cross-Fade Transitions"** is not a separate context: the flag is on whenever Reduce Motion is (M10).

### 9. Easing roles

`sys/motion/default.tokens.json` gains the group `sys.motion.easing` (`$type: cubicBezier`). Its five whole-value aliases mirror the `ref` names, as `sys.motion.duration.*` and `sys.motion.spring.*` already do:

| Token | Aliases | Curve | Use |
|-------|---------|-------|-----|
| `motion.easing.out` | `ref.motion.easing.out` | (0.23, 1, 0.32, 1) | enter and exit (exit mirrors enter), press and release feedback, the Reduce Motion substitutes of §8.4, state changes on the non-spring path |
| `motion.easing.in-out` | `ref.motion.easing.in-out` (renamed from `inOut` by ADR-0024 §2.2) | (0.77, 0, 0.175, 1) | on-screen movement and morphs on the non-spring path |
| `motion.easing.drawer` | `ref.motion.easing.drawer` | (0.32, 0.72, 0, 1) | sheets and drawers on the non-spring path |
| `motion.easing.hover` | `ref.motion.easing.hover` | (0.25, 0.1, 0.25, 1) | hover color and opacity only |
| `motion.easing.linear` | `ref.motion.easing.linear` | (0, 0, 1, 1) | constant motion: progress, marquee, ambient rotation |

There is no ease-in role; UI never eases in (`motion-haptics.md:37`). The roles above go into each token's `$description`. The README's `standard | emphasized` names are dropped.

### 10. The presentation crossfade flag

`sys.motion.presentation.crossfade` is a flag under ADR-0024 §4.2: a `number` token (DTCG has no boolean) whose value is 0 or 1, with `$extensions["app.prism"].flag = true` on **both** declarations. The reduced declaration replaces the whole token, so a flag declared only in the default file would vanish in `reduced`. It is emitted as CSS `0 | 1`, Swift `Bool` and TS `boolean` (ARCHITECTURE §7.11). Its meaning: 1 while §8.4's substitutions apply. The name stays; renaming would change every emitted name for no gain.

### 11. Cross-stack parity test

The contract covers every spring each target emits, in both motion contexts, on `apple`, `watch` and `web`. On Swift and in `tokens.ts` those are the `sys` and `comp` members, and every `ref` spring reaches them through its `sys` alias. In `motion.css` they include `ref`.

| # | Quantity | Compared | Tolerance | Test |
|---|----------|----------|-----------|------|
| P1 | stiffness, damping | generated `DSSpringToken.stiffness` / `.damping` (4 decimals) against `Spring(duration:bounce:).stiffness` / `.damping` | ≤ 1e-4 absolute | `swift/Tests/DSTokensTests/SpringParityTests.swift` |
| P2 | mass | `DSSpringToken.mass` against `Spring.mass` | exactly 1 | same |
| P3 | settle | `DSSpringToken.settle` against the last sample t = k × 0.1 ms (k integer, t ≤ 5 s) of `Spring.value(target: 1, initialVelocity: 0, time:)` with `\|1 − value\| ≥ 0.001` | < 1 ms | same |
| P4 | curve shape | the closed form at 0.1, 0.25, 0.5, 0.75 and 1.0 × settle (4 decimals, emitted from the IR) against `Spring.value` at the same times | ≤ 1e-4 | `swift/Tests/DSTokensTests/Generated/GeneratedTokenTests.swift` |
| P5 | generator | Motion's physics generator (§5) against the closed form, every millisecond to settle | ≤ 1e-9 | `tools/tokens/transforms/spring.test.ts` |
| P6 | CSS curve | the emitted `linear()`, parsed back, against the closed form every 0.1 ms over [0, settleMs]; first stop 0, last stop 1, at most 40 stops | ≤ 0.0025 | same |
| P7 | CSS duration | `-duration` against settleMs, and the `@supports not` twin against `timingFunction` | exact | same, plus `verify/css-cascade.ts` ("`linear()` unsupported" scenario) |
| P8 | tables | `tokens.ts` `SpringValue` and the Swift `DSTokenSet.Motion` table against the IR | exact after formatting | `tools/tokens/verify/tables.ts` inside `tokens:build` |

Why these tolerances:

- P1 is twice the rounding of the 4-decimal literals; SwiftUI matches the formula to 3.6e-16 (M1).
- P3 follows from the two definitions: the Swift sample lies within 0.1 ms below `t_last` and settleMs within 1 ms below it, so the difference lies in (−0.1, 1) ms when the curves agree (M2).
- P6 is the RDP tolerance plus serialization, with 0.00026 headroom over the worst admitted case (M8). The stop cap is a regression guard for the simplifier: the sweep's maximum is 30.

`blendDuration` (Apple-only), the cubic-bezier fallback and Motion's runtime rest snap (M6) are not compared. A failing parity test is fixed in the transform, or recorded as a change in SwiftUI or Motion by a new ADR. It is never fixed by widening a tolerance.

### 12. Motion values in implementation code

ADR-0004 rule 1 already forbids literal durations in `swift/` and `web/`, but `tools/lint/literals.ts` checks only colors, dimensions and fonts. It gains a `motion` kind over its existing scan directories (generated output excluded):

- **Swift:** `Spring(`, `.spring(`, `.interactiveSpring(`, `.snappy(`, `.smooth(`, `.bouncy(`, `.easeIn(`, `.easeOut(`, `.easeInOut(`, `.linear(` and `.timingCurve(` with a numeric literal argument; `withAnimation {` without an animation argument; `withAnimation(` or `.animation(` whose first argument is a bare Apple preset (`.default`, `.spring`, `.snappy`, `.smooth`, `.bouncy`, `.interactiveSpring`, `.easeIn`, `.easeOut`, `.easeInOut`, `.linear`).
- **CSS:** time literals in `transition*` and `animation*` declarations; `cubic-bezier(` or `linear(` with a numeric first argument.
- **TS/TSX:** a numeric literal for `stiffness`, `damping` or `mass`; any `bounce` key (§6); `useReducedMotion` and the `reducedMotion` prop (§8.5).
- **Identifier bans:** `settlingDuration` (also in `swift/Tests`), `generateLinearEasing` and `visualDuration` anywhere scanned; `accessibilityReduceMotion` outside `swift/Sources/DSCore/`.

`prefers-reduced-motion`, the `data-ds-motion` attribute and Tailwind's `motion-*:` variants are already banned by ADR-0019's `runtime` kind; this kind does not repeat them. The implementer tunes the patterns against fixtures (one hit and one miss per pattern). This section fixes the intent, not the regular expressions.

## Alternatives considered

- **ADR-0011 read literally: every motion token becomes a 150 ms crossfade.** A token is a value, not a kind of transition, so a spring token cannot "be" a crossfade on either stack. Gesture tracking would stop following the finger, against Apple's guidance. The 150 ms crossfade survives as §8.4's presentation rule.
- **A crossfade for presentation transitions only.** A press scale or a blur ramp would keep running under Reduce Motion, although the HIG lists zooming, scaling and blur among the effects to reduce, and Button and Card already specify an opacity dip.
- **Every movement becomes a fade**, including a sliding selection indicator or a reorder. For in-place movement the HIG asks to tighten springs, not to remove them, and state changes would lose their spatial cue.
- **Durations collapse to 0 (arch-web §2.7).** State changes would jump. Apple's guidance asks for gentler, non-vestibular equivalents such as fades rather than no feedback (`motion-haptics.md:31`, `:43`, `:339`), and a spring has no meaningful zero duration.
- **A standalone, complete reduced file.** It would copy every unchanged default value into a second file that must be kept in sync. The layered delta is the pattern the resolver already uses for colorScheme.
- **Keep reduced `smooth` at (0.40, 0).** It meets "no overshoot" but leaves a 587 ms settle, the longest transition under Reduce Motion. Lost to the 0.30 s cap.
- **Move the reduced values into `ref` primitives.** Two new `ref` springs, plus reduced durations that alias `ref` steps named for other roles (`base` → `ref.motion.duration.fast`). No brand may override `ref.motion.*` (ADR-0020), so the extra alias hop serves nothing.
- **A separate context for "Prefer Cross-Fade Transitions".** It is a UIKit-only API on iOS and tvOS, and SwiftUI, watchOS, macOS and CSS have no equivalent (M10). A third motion context would add 216 permutations for one platform.
- **Motion's `MotionConfig reducedMotion`, fed from Prism's context.** `"user"` reads the media query and ignores `data-ds-motion` (M11). `"always"` drops transform and layout animations but adds no substitute opacity change, so components would still need §8.4's logic. One mechanism is simpler.
- **CSS from Motion's `spring().toString()`.** It uses its own 50 ms-grid duration (snappy 550 against 487 ms) and cuts bouncy before it settles (M6).
- **`generateLinearEasing` over the physics generator** (critic C-08's second option). It emits uniform, unsimplified stops in Motion's own format: 220 to 818 stops per spring for 0.0025 accuracy, or up to 0.0154 error at its default resolution (M7). RDP gives 20 to 24 stops within 0.00205 (M8).
- **A Prism-only closed-form sampler with no Motion in the build.** Equally accurate. It lost narrowly: ARCHITECTURE §7.6 already samples Motion's generator, and doing so keeps the CSS and runtime JS springs one implementation. The closed form remains the oracle (P5).
- **Motion duration-based springs at runtime.** Motion zeroes their velocity, so a release cannot hand off momentum (M6).
- **`interactive` at Apple's (0.15, 0.15).** It gives exact parity with `.interactiveSpring()` and settles 11 ms sooner. It would need a reduced override (no overshoot), making gesture tracking differ under Reduce Motion, and it adds bounce where no momentum exists.
- **Admit negative bounce now.** No token needs it, and SwiftUI's `stiffness` and `velocity` getters are wrong for overdamped springs (M5), so the parity test would need special cases.
- **Keep bounce in [0, 1) and no duration bound (ARCHITECTURE §7.6).** Near 1 the settle leaves the search horizon (bounce 0.95 at 0.5 s settles after about 11 s), and a duration typed in milliseconds would pass the schema.
- **Semantic easing names (`enter`, `move`, `emphasized`).** They add vocabulary that the rest of `sys.motion` does not use and that no spec binds. The mirrored names plus role descriptions tell agents the same.
- **Let aliases override `spring`** (ARCHITECTURE §7.1 as written). The alias's fallback duration and its spring would disagree, and components could invent springs.
- **Keep the 1 % / 10 ms tolerances.** Both stacks now compute the same quantities exactly (M1, M2), so loose bounds would only hide defects; 10 ms barely separates Prism's `interactive` from Apple's (220 against 209 ms).

## Consequences

- One definition of Reduce Motion now exists, in token values (§8.2), invariants (§8.3) and component behavior (§8.4). Specs have defined meanings for `crossfade`, `instant` and `none`, and Button's and Card's existing "opacity dip" is covered.
- Presentation opacity uses `motion.duration.base` with `motion.easing.out` in both contexts; movement keeps the bound spring. A CSS-first component switches under Reduce Motion through `--ds-motion-presentation-crossfade` alone.
- The four missing reduced tokens exist in every permutation. The motion axis changes 10 token ids instead of today's 9 (ARCHITECTURE §15 F12 counts today's data), because `smooth` joins the reduced set.
- Every number is reproducible on both stacks and checked with tight tolerances. An SDK or Motion upgrade that changes spring math fails loudly, and the lockfile plus reviewed generated diffs make such a change visible.
- CSS springs cost about 0.3 KB each. Browsers without `linear()` get the token's cubic-bezier over the settle duration, which does not overshoot; this is accepted.
- A spring with bounce above 0.4, a duration outside 0.1 to 1 s or negative bounce needs a new ADR.
- DSCore's `DSMotion` (P3-1) and the React components (P3-4) implement §8.4 from Prism's context. The web runtime (P3-2) only exposes the context (ADR-0019). Snapshots cannot show motion, so unit and interaction tests carry that check (Rule 9).
- Button and Card must name the token their opacity dip reaches; no `opacity.*` token for it exists yet (P2-1 spec migration).
- Motion stays brand-invariant (ARCHITECTURE §5.7 rule 6; ADR-0020 asserts `motion.css` identical across brands).
- Documents that follow this decision: ARCHITECTURE §0, §1, §4.2, §5.4, §5.6, §5.7, §7.1, §7.6, §9.3, §9.7.6, §14 and §16.3; `tokens/README.md`; `tools/tokens/README.md`; roadmap P1-2, P1-4, P3-1, P3-2 and the verify list; `agent/SKILL.md`; `spec/SCHEMA.md`, `spec/component.schema.json` and `spec/components/Text.yaml`; `tools/lint/literals.ts`; the seed scripts; superseded notes in motion-haptics, arch-web, arch-apple, visual-dna and verification; the critic's actions table; the status lines of ADR-0003 and ADR-0011.

## Rules that follow

1. A spring is declared only on a `transition` token with a literal `$value` whose `timingFunction` aliases a `ref.motion.easing.*` token, as `$extensions["app.prism"].spring` with duration 0.1 to 1 s, bounce 0 to 0.4, optional blendDuration 0 to 1 s and a derived `settle`. Checked by Ajv against `tools/tokens/schema/app-prism.schema.json` and by the source check `spring/fallback`, both inside `tokens:build` (P1-3), with one fixture per bound and per case.
2. Aliases inherit springs and never declare their own. Checked by ADR-0024's `extension/alias-override` (`source/analyze.ts`, P1-3) and by `engine/sd.test.ts`, which resolves a comp → sys → ref chain in both motion contexts.
3. `$value.duration` equals settleMs, `$value.delay` is 0 ms and `settle` equals settleMs / 1000. They are derived values: an author may write them (P1-2 writes this ADR's values before the normalizer exists), but they must equal the normalizer's output. Checked by `pnpm tokens:normalize --check` (rule `spring-fallback`), which `tokens:build` runs first, and by `normalize.test.ts` on `fixtures/tampered-spring/`.
4. Settle is §3's ε = 0.001 floor. Checked by `transforms/spring.test.ts`: settles 220 / 487 / 587 / 404 / 818 ms, and 367 / 367 / 440 / 440 ms under Reduce Motion. `settlingDuration`, `generateLinearEasing` and `visualDuration` never appear in scanned code (`lint:literals`, kind `motion`).
5. Every emitted CSS spring meets P6 and P7. Checked by `transforms/spring.test.ts` (exact string snapshots plus the tolerance check) and `verify/css-cascade.ts`.
6. The cross-stack parity contract P1 to P8 holds at its tolerances. It runs in the `apple` job through `swift test` and `xcodebuild test -only-testing:DSTokensTests` on the iOS and watchOS simulators, and in the `web` job and `tokens:build`. Tolerances change only by ADR.
7. The `motion` modifier's contexts are exactly `default: [sys/motion/default]` and `reduced: [sys/motion/default, sys/motion/reduced]`, and the resolved contexts satisfy §8.3. Checked by `repo.test.ts` (the context lists, P1-3) and by the `tokens:build` diagnostics `completeness/missing` and `motion/reduced-policy` (`ir/analyze.ts`), with `fixtures/broken/motion-reduced-policy/`.
8. Reduce Motion is read once per platform: by DSCore on Apple, and by ADR-0019's runtime on the web (the `motion.css` selectors and `webRuntime`). Components read Prism's context. Checked by `lint:literals`: the `motion` kind (`accessibilityReduceMotion` outside DSCore, `useReducedMotion`, `reducedMotion`) and ADR-0019's `runtime` kind (the media query, the attribute, Tailwind's `motion-*:` variants).
9. Every spec whose component animates has a `motion` block. The block binds only `motion.spring.*`, `motion.duration.*`, `motion.easing.*` or `comp.<component>.motion.*`, and declares `reduceMotion` with §8.4's meaning; `accessibility.reduceMotion` names the substitute and its token. Checked by `spec/component.schema.json` (`reduceMotion` required inside `motion`, the binding pattern) and `spec:validate` (P2-1). DSMotion unit tests (P3-1) and story tests under a forced reduced context (P3-4) assert that `crossfade` and `instant` components schedule no transform, blur or depth animation outside a gesture and animate presentations by opacity only, and that `instant` components run no decorative animation.
10. Implementation code contains no duration, easing or spring literal, and web code configures Motion only with the physics triplet from `tokens.ts`. Checked by `lint:literals` kind `motion`, with fixtures added in P1-4.
11. `motion.spring.interactive` stays bounce 0 and identical in both contexts, and components use it only while a gesture is active. The first half is checked by `motion/reduced-policy` and the spring snapshots; the second by spec review of `behavior`.
12. `sys.motion.presentation.crossfade` carries `app.prism.flag: true` in both motion files. Checked by `type/flag-mismatch` and `type/flag-value` (ADR-0024 rule 5) and the flag emission tests.
