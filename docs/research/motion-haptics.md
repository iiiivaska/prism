# Prism — Motion & Haptics Tokens across SwiftUI and Web

Research report · 2026-09-08 · Author: research subagent (motion/haptics track)

Scope: how to express motion (durations, easings, springs) and haptics as machine-readable tokens in one W3C DTCG source, generate SwiftUI (iOS/iPadOS/macOS/watchOS 26+) and CSS/Tailwind v4/TypeScript/Motion outputs with provable parity, and handle Reduce Motion on both sides.

Method note: the `apple-design` and `animate` skills were loaded first and their guidance is summarized in §1. Every version-specific claim below was checked against official documentation on 2026-09-08. Apple's rendered doc pages are JS-only, so Apple facts were read from the same JSON data endpoints the docs site renders from (`developer.apple.com/tutorials/data/documentation/...`); the canonical human-readable URL is cited in each case. The session's web-search budget was exhausted mid-research; everything after that point was fetched directly from official URLs (Apple, MDN/BCD, W3C, Motion, Style Dictionary, DTCG, npm registry). Items I could not verify are explicitly marked low confidence.

---

## 0. TL;DR

1. **Apple's two-parameter spring (`duration`, `bounce`) is the right canonical representation for Prism's spring tokens.** It is the native SwiftUI API (`Animation.spring(duration:bounce:)`, `Spring(duration:bounce:)`, iOS 17+), the same parameters exist in UIKit (`UIView.animate(springDuration:bounce:...)`), and the conversion to physics is closed-form and documented: `mass = 1`, `stiffness = (2π/duration)²`, `damping = 4π(1−bounce)/duration` for `bounce ≥ 0`. Apple's own doc example (`duration 0.5, bounce 0.3 → stiffness 157.9, damping 17.6`) reproduces exactly with that formula (verified numerically in this report). Equivalently `dampingRatio = 1 − bounce`, `response = duration`.
2. **Web parity is achieved by emitting the physics triplet, not duration/bounce, to Motion.** Motion 13.2.0's duration-based spring uses `root = 2π/(visualDuration·1.2)`, i.e. its `visualDuration` ≈ Apple `duration / 1.2`, and its `bounce` semantics differ slightly (damping ratio clamped to 0.05–1). Emitting `stiffness/damping/mass` derived from the Apple formula makes the JS spring identical to the SwiftUI spring.
3. **For CSS, generate `linear()` easing strings from the same physics at build time** (Style Dictionary custom transform), with the transition duration set to the spring's settle time: the last moment the unit step response is 0.001 or more away from its target (displacement only). (Corrected 2026-09-14: this is *not* the value Apple's `Spring.settlingDuration` getter returns; that getter is a different, longer estimate. See §5.3.) `linear()` is Baseline (Chrome 113, Firefox 112, Safari 17.2). CSS springs cannot be interrupted with velocity, so components that are gesture-driven must use Motion on web; state-driven transitions can use CSS.
4. **DTCG 2025.10 (Final CG Report, 28 Oct 2025) has `duration`, `cubicBezier`, `transition` — no spring type.** Model a spring token as a DTCG `transition` (cubic-bezier fallback for tools/browsers that cannot do springs) plus `$extensions["dev.prism.spring"] = { duration, bounce }`; generators read the extension. Style Dictionary is at **v5.5.3** (not v4); built-in transforms still do not handle DTCG `duration` object values (`{value, unit}`), so custom transforms are needed either way.
5. **Reduce Motion is a token *mode*, not a component afterthought.** Provide a `reduced` token layer (bounce → 0, shorter durations, transform/blur/parallax disabled, crossfade instead) that generates `@media (prefers-reduced-motion: reduce)` overrides on web and an environment-selected token set in SwiftUI (`accessibilityReduceMotion`). Motion's `MotionConfig reducedMotion="user"` and Tailwind's `motion-reduce:` / `motion-safe:` variants cover the JS/utility layers.
6. **Haptics are a semantic registry, not DTCG tokens.** SwiftUI's `SensoryFeedback` is the single API across iOS/watchOS/macOS/visionOS 26 (sensoryFeedback gained visionOS in 26.0), but each feedback only *plays* on specific platforms (e.g. `success/warning/error/selection/impact` → iOS + watchOS; `alignment` → iOS + macOS; `levelChange` → macOS only; `start/stop` → watchOS only; `increase/decrease` → watchOS + visionOS; `pathComplete` → iOS only). iOS 26 adds control-specific `press(...)`, `release(...)`, `selection(.on/.off/.minimum/.maximum)`. Web has only `navigator.vibrate` (Android Chrome/Samsung; not Safari; Firefox desktop removed in 129; requires sticky user activation; ≤10 entries, ≤10 s each) plus an iOS Safari trick via `<input type="checkbox" switch>` that must be treated as best-effort.

---

## 1. Guidance extracted from the skills

### 1.1 `apple-design` (WWDC "Designing Fluid Interfaces" translated to web)

- Springs are the default tool because they are inherently interruptible and velocity-aware; think in **damping ratio** (1.0 = critically damped, no overshoot) and **response** (seconds; not a fixed duration).
- **Defaults**: damping 1.0 for most UI; add bounce (damping ≈ 0.8) only when the gesture itself carried momentum (flick/throw/drag release).
- **Concrete shipped values**: move/reposition damping 1.0 response 0.4; rotation 0.8 / 0.4; drawer/sheet 0.8 / 0.3.
- Always animate from the *presentation* value; carry velocity through re-targets (no "brick wall"); decompose 2D motion into independent X/Y springs; hand release velocity to the spring; project momentum with `(v/1000)·d/(1−d)`, `d ≈ 0.998`; rubber-band at edges.
- Multimodal feedback rules: **causality** (trigger on the causal event), **harmony** (visual + sound + haptic on the same frame), **utility** (reserve haptics for meaningful moments).
- Reduced motion = gentler, non-vestibular equivalent (cross-fade, no slide/spring/parallax); also honor `prefers-reduced-transparency` and `prefers-contrast`; avoid 0.2 Hz oscillations and abrupt brightness jumps.

### 1.2 `animate` (Emil Kowalski-style construction rules)

- Gate by frequency: 100+/day or keyboard-initiated → **no animation**; tens/day → near-imperceptible; occasional (modals, drawers, toasts) → standard; rare → delight budget.
- Properties: `transform` and `opacity` only; never `scale(0)`; `transform-origin` at the trigger.
- Easing: `ease-out` for enter/exit, `ease-in-out` for on-screen movement, `linear` for constant motion; never `ease-in` on UI. Strong curves: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`.
- Durations: press 100–160 ms; tooltips 125–200; dropdowns 150–250; modals/drawers 200–500; **UI stays under 300 ms**.
- Springs: `{ type: "spring", duration: 0.5, bounce: 0.2 }`; keep bounce 0.1–0.3; reserve bounce for drag-to-dismiss/playful.
- Interruption: transitions, not keyframes, for rapidly re-triggered elements; springs for gestures; exit the way it entered.
- Reduced motion and `@media (hover: hover) and (pointer: fine)` gating ship with the animation, never as a follow-up.

These two sources agree on the key parameterization decision (damping ratio ≈ 1 − bounce, response ≈ duration) and on the reduced-motion posture (crossfade, not zero).

---

## 2. SwiftUI spring API — verified facts

| API | Signature / defaults | Availability | Notes |
|---|---|---|---|
| `Animation.spring(duration:bounce:blendDuration:)` | `duration: TimeInterval = 0.5, bounce: Double = 0.0, blendDuration: Double = 0` | iOS 13+ (symbol); semantics documented as "perceptual duration" | "When mixed with other spring()/interactiveSpring() animations on the same property, each animation will be replaced by their successor, preserving velocity from one animation to the next." |
| `Animation.smooth` / `.smooth(duration:extraBounce:)` | `duration = 0.5`, `extraBounce = 0.0`; **base bounce 0** | iOS 13+ symbol | "A smooth spring animation with a predefined duration and no bounce." |
| `Animation.snappy` / `.snappy(duration:extraBounce:)` | `duration = 0.5`, `extraBounce = 0.0`; **base bounce 0.15** | iOS 13+ symbol | "additional bounce should be added to the base bounce of 0.15" |
| `Animation.bouncy` / `.bouncy(duration:extraBounce:)` | `duration = 0.5`, `extraBounce = 0.0`; **base bounce 0.3** | iOS 13+ symbol | "additional bounce should be added to the base bounce of 0.3" |
| `Animation.interactiveSpring(duration:extraBounce:blendDuration:)` | `duration = 0.15`, `extraBounce = 0`, `blendDuration = 0.25`; **base bounce 0.15** (SDK body: `spring(duration: duration, bounce: 0.15 + extraBounce, blendDuration: blendDuration)`; corrected 2026-09-14) | iOS 13+ | "lower response value, intended for driving interactive animations" |
| `Animation.interactiveSpring(response:dampingFraction:blendDuration:)` | `0.15 / 0.86 / 0.25` | iOS 13+ | legacy parameterization |
| `Animation.spring(response:dampingFraction:blendDuration:)` | `0.5 / 0.825 / 0` | iOS 13+ | legacy parameterization; response 0 = "infinitely stiff" |
| `Animation.default` | spring, `response 0.55`, `dampingFraction 1.0`, `blendDuration 0` | iOS 13+; **spring since iOS 17/macOS 14/watchOS 10** (was `easeInOut` before) | `withAnimation {}` without argument uses it |
| `Animation.easeInOut` / `.easeIn` / `.easeOut` / `.linear` | default duration **0.35 s** (documented for `easeInOut`) | iOS 13+ | `Animation.timingCurve(_:_:_:_:duration:)` builds a cubic-bézier animation — this is how DTCG `cubicBezier` tokens map to SwiftUI |
| `Spring` struct | `init(duration:bounce:)` (defaults 0.5 / 0.0, bounce ∈ [−1, 1]); `init(response:dampingRatio:)`; `init(mass:stiffness:damping:allowOverDamping:)`; `init(settlingDuration:dampingRatio:epsilon:)`; properties `duration, bounce, mass, stiffness, damping, response, dampingRatio, settlingDuration`; `value/velocity/force/update` for custom drivers | iOS 17 / macOS 14 / watchOS 10 / visionOS 1 | "The Spring type converts between different representations of spring parameters." Doc example: `Spring(duration: 0.5, bounce: 0.3)` → `(mass, stiffness, damping) = (1.0, 157.9, 17.6)`. `settlingDuration` uses target 1.0, initial velocity 0, **epsilon 0.001**, but its values are not a sampled ε = 0.001 settle (corrected 2026-09-14, see §5.3). |
| `Animation.spring(_:blendDuration:)` | takes a `Spring` | iOS 17+ | lets generated `Spring` constants be used directly as animations |
| `UIView.animate(springDuration:bounce:initialSpringVelocity:delay:options:animations:completion:)` | `springDuration = 0.5`, `bounce = 0.0` | iOS 17+ | UIKit uses the same two parameters (parity across UIKit/SwiftUI) |

**Bounce semantics (Apple docs):** `0` = critically damped; positive up to `1.0` = undamped oscillation; negative down to `−1.0` = overdamped. WWDC23 "Animate with springs" adds: bounce ≈ 0 "most versatile general-purpose spring"; ≈ 0.15 "doesn't feel very bouncy yet, but the long tail feels a little more brisk"; ≈ 0.3 "noticeable bounciness"; > 0.4 "may feel too exaggerated for a UI element". Duration is a *perceptual* duration "chosen to be predictable and not move around, even as the other parameters of a spring change"; completion callbacks should use the perceptual duration, not the settling duration.

**Physics conversion (WWDC23 10158 + Apple `Spring` example):**

```
mass      = 1
stiffness = (2π / duration)²                          (every bounce)
damping   = 4π · (1 − bounce) / duration              (0 ≤ bounce ≤ 1)
damping   = 4π / (duration · (1 + bounce))            (−1 < bounce < 0)   corrected 2026-09-14
⇒ dampingRatio = 1 − bounce (bounce ≥ 0),  1 / (1 + bounce) (bounce < 0)
⇒ response     = duration
```

(Corrected 2026-09-14.) The negative branch used to read `4π / (duration + 4π · bounce)`, copied from the WWDC23 10158 slide. That formula gives negative damping, e.g. −6.24 for duration 0.5, bounce −0.2. The iOS 26.x SDK's inlinable `springDampingFraction(bounce:)` (in `SwiftUICore.swiftinterface`) returns `1 / (bounce + 1)` for negative bounce. `Spring(duration: 0.5, bounce: -0.2).value(target:time:)` matches the closed-form curve with stiffness 157.91 and damping 31.42 exactly, on macOS 26.6 and on the iOS 26.5 simulator. Two getters misbehave for bounce < 0. `stiffness` returns `(2π/duration)²·(2ζ² − 1)` (335.57 here) even for a spring built with `init(mass:stiffness:damping:allowOverDamping:)` from 157.91, and `velocity(target:time:)` returned 1.0156 at t = 1 s where the true velocity is 0.0156. Prism tokens use bounce ≥ 0 only, and parity tests should assert that range.

Numerically checked in this report: `(0.5, 0.3)` → `157.9 / 17.6 / ζ 0.70`, matching Apple's documented example exactly. Consequently the `apple-design` skill's "drawer: damping 0.8, response 0.3" is exactly `Spring(duration: 0.3, bounce: 0.2)`.

**Interruptibility (WWDC23 10156 "Explore SwiftUI animation"):** for springs `shouldMerge` returns `true`, "so it preserves velocity and retargets to a new value"; timing-curve animations are added instead. SwiftUI "will now automatically track velocities any time a gesture is changing properties" (WWDC23 10158). This is why spring tokens (not bézier tokens) must be the default for anything gesture-driven on Apple platforms.

**iOS 26 additions:** no new `Animation` symbols with 26.0 availability were found on the `Animation` page (only visionOS-26-only `systemOverlayAppearance` / `systemOverlayDisappearance` properties). Haptics did change in 26 — see §7.

---

## 3. iOS system animation durations — what is documented vs. folklore

| Value | Status | Source |
|---|---|---|
| SwiftUI `Animation.default` = spring response 0.55, damping 1.0 | **Documented** | Apple `Animation.default` |
| SwiftUI `easeInOut` default 0.35 s | **Documented** | Apple `Animation.easeInOut` |
| SwiftUI/UIKit spring default duration 0.5 s | **Documented** | `Animation.spring(duration:bounce:)`, `UIView.animate(springDuration:)` |
| `interactiveSpring` duration 0.15 s, blend 0.25 s | **Documented** | Apple |
| `UIView.animate(withDuration:animations:)` uses `curveEaseInOut`; duration 0 disables animation | **Documented** | Apple |
| Core Animation implicit transaction default 0.25 s | **Not verifiable in the fetched docs** (`CATransaction.animationDuration()` and `kCATransactionAnimationDuration` pages do not state the default) | low confidence; treat as folklore |
| Keyboard show/hide 0.25 s; keyboard curve is a `CASpringAnimation` (duration 0.5, damping 500, stiffness 1000, mass 3) | Developer-forum reports only | low confidence |
| `UINavigationController` push ≈ 0.35 s | Folklore, undocumented | low confidence |

Takeaway: do not derive Prism's scale from undocumented system numbers. Anchor on the documented ones (0.15 interactive / 0.35 ease / 0.5 spring / 0.55 default) plus the `animate` skill's UI-under-300 ms rule.

---

## 4. Web side — CSS `linear()`, generators, Motion, Tailwind v4

### 4.1 CSS `linear()` easing

- Syntax: `linear(0, 0.25 75%, 1)` — a piecewise-linear list of progress stops with optional percentage positions; values may exceed 0–1 (overshoot). Percentages must ascend; at least two stops (MDN).
- Support (MDN browser-compat-data, verified 2026-09-08): **Chrome 113, Edge 113, Firefox 112, Safari 17.2 / iOS 17.2, Samsung Internet mirror**. Baseline "widely available since December 2023".
- It is the only way to express a spring in native CSS; it requires a fixed `transition-duration` equal to the spring's settle time, and **cannot** be velocity-aware on interruption — "the CSS version turns around instantly, as though it hit a wall" (Josh Comeau). Therefore CSS springs are for state-driven transitions; gesture-driven springs need JS.
- Generators: Jake Archibald's Linear Easing Generator (Apache-2.0; JS-easing → `linear()`, with `simplify` tolerance and `round` digits; hosted at linear-easing-generator.netlify.app); Easing Wizard (spring/bounce/wiggle/overshoot → `linear()`, REST API at api.easingwizard.com, **custom non-commercial license** — avoid in build); `tailwindcss-spring` 1.0.1 (MIT; `spring-bounce-*` and `spring-duration-*` utilities using Apple-style bounce + perceptual duration; declares Tailwind `>=3.0.0` peer, v4 CSS-first support not documented) ; Motion's `spring()` (below).

### 4.2 Motion (motion.dev) — version 13.2.0, MIT (npm registry, 2026-09-08)

- Spring options: `duration` (ms in `spring()`, s in `animate`), `bounce` (docs say default 0.25; source `springDefaults.bounce = 0.3`), `visualDuration` (s; "time the animation will take to visually appear to reach its target", bounce happens after), `stiffness` (docs default 1 / source default 100), `damping` (10), `mass` (1), `velocity`, `restSpeed`, `restDelta`. "bounce and duration will be overridden if stiffness, damping or mass are set."
- Duration-based conversion (motion-dom 13.2.0 `generators/spring.mjs`):
  ```js
  const root = (2 * Math.PI) / (visualDuration * 1.2);
  const stiffness = root * root;
  const damping = 2 * clamp(0.05, 1, 1 - (options.bounce || 0)) * Math.sqrt(stiffness);
  ```
  i.e. Motion's `visualDuration = appleDuration / 1.2`, damping ratio = `1 − bounce` clamped to [0.05, 1]. Plain `duration + bounce` (no `visualDuration`) uses a Newton root-finding `findSpring` (12 iterations) to fit a settle duration — a *different* mapping from Apple's. **Conclusion: pass the physics triplet to Motion for exact parity.**
- `spring(visualDuration, bounce)` / `spring(options)` has `toString()` that returns a CSS value like `800ms linear(...)` (via `generateLinearEasing`), usable as `transition: transform ${spring(0.5, 0.2)}`; docs recommend a two-declaration fallback for browsers that ignore `linear()`.
- (Corrected 2026-09-14, probed on motion 13.2.0 and 13.3.0.)
  - **The object form needs `keyframes`:** call `spring({ keyframes: [0, 1], stiffness, damping, mass })`. Without `keyframes`, `spring()` throws `TypeError`.
  - **`toString()` stops at Motion's own end point, not Prism's settle.** `calcGeneratorDuration` steps a 50 ms grid until `|v| ≤ restSpeed` and `|Δ| ≤ restDelta` (0.01 and 0.005 for unit keyframes). It then emits one stop per 30 ms.
    - For Prism's springs that gives interactive 300, snappy 550, smooth 650, sheet 500 and bouncy 700 ms. The settle times are 220 / 488 / 588 / 405 / 819 ms.
    - The bouncy string ends before its tail settles, so Motion's `linear()` stops must never be paired with Prism's settle duration.
  - **To keep the token's settle, build the string yourself:**
    - Create a physics generator with tiny `restDelta`/`restSpeed`, so late samples are not snapped to 1.
    - Call `generateLinearEasing(p => gen.next(p * settleMs).value, settleMs, resolutionMs)`. It is exported from `motion` and emits uniform stops rounded to 4 decimals: `max(round(duration / resolution), 2)` of them, with no simplification.
- (Added 2026-09-14.) **Time-defined springs ignore `velocity`.**
  - In 13.x, `duration`/`visualDuration` + `bounce` springs have their velocity set to 0 by `getSpringOptions`; the source comment reads "Time-defined springs should ignore inherited velocity".
  - Only physics springs honour `velocity`, so passing the physics triplet is required for release-velocity handoff, not only for parity.
  - motion 13.3.0 (published 2026-09-14) leaves the spring math unchanged.
- Reduced motion: `MotionConfig reducedMotion="user" | "always" | "never"`; with `"user"` all `motion` components "automatically disable transform and layout animations, while preserving the animation of other values like opacity and backgroundColor"; `useReducedMotion()` hook for manual branching.

### 4.3 Tailwind v4 theme variables

- Default motion theme variables: `--ease-in: cubic-bezier(0.4, 0, 1, 1); --ease-out: cubic-bezier(0, 0, 0.2, 1); --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)`; `--animate-spin/ping/pulse/bounce` with keyframes. Custom `@theme { --ease-custom: ...; --animate-fade-in-scale: fade-in-scale 0.3s ease-out; @keyframes ... }` creates `ease-custom` / `animate-fade-in-scale` utilities; `--ease-*` and `--animate-*` are the documented namespaces.
- A `linear(...)` string is a valid value for `--ease-*` (it is just a `<easing-function>`), so generated spring easings can be exposed as `ease-spring-snappy` utilities.
- Variants: `motion-reduce:` → `@media (prefers-reduced-motion: reduce)`; `motion-safe:` → `@media (prefers-reduced-motion: no-preference)`; `contrast-more:` / `contrast-less:`. No `prefers-reduced-transparency` variant exists (add a custom variant).

### 4.4 Media features (BCD, verified)

- `prefers-reduced-motion`: Chrome 74, Firefox 63, Safari 10.1 — Baseline.
- `prefers-reduced-transparency`: Chrome 118, Firefox 113 behind a flag, **Safari: not supported** — not Baseline. Prism's glass materials must not depend on it for Safari; rely on solid fallbacks and the app-level setting instead.

---

## 5. One motion token → DTCG → SwiftUI + CSS + TS

### 5.1 What DTCG 2025.10 gives you (Final Community Group Report, 28 Oct 2025)

- `duration`: `{"$type":"duration","$value":{"value":100,"unit":"ms"}}` — `unit` ∈ `ms | s`.
- `cubicBezier`: `{"$type":"cubicBezier","$value":[0.5, 0, 1, 1]}` — x in [0,1], y any real.
- `transition` composite: `{"duration": <duration>, "delay": <duration>, "timingFunction": <cubicBezier>}` (each may be a reference).
- `number`: plain JSON number.
- `$extensions`: object keyed by reverse-domain vendor keys, any JSON value; `$type` is inherited from the closest parent group.
- **No spring, no `linear()`, no easing keywords.** Note the `/TR/drafts/format/` page is already a *later* draft ("Do not attempt to implement this version"); target the `2025.10` URL.

### 5.2 Toolchain reality (verified 2026-09-08)

- Style Dictionary latest is **5.5.3** (Apache-2.0, `node >= 22`). v5 is "a drop-in replacement for the majority of users"; breaking changes: references only to tokens with `$value`, fixed `{a.b}` reference syntax, Node 22. Changelog: 5.3.0 added DTCG 2025.10 structured color; **5.4.0 added DTCG 2025.10 `dimension` object values**; nothing equivalent for `duration` objects yet. Built-in `timeSeconds` transform matches `$type: 'time'` (legacy, ms → `0.5s`); `cubicBezierCss` matches `cubicBezier`/`transition` and emits `cubic-bezier(...)`; `transitionCssShorthand` emits `${duration} ${timingFunction} ${delay}` with a TODO for object conversion. **Prism needs custom transforms for `duration` objects and for springs regardless of v4 vs v5** — recommend starting on v5.
- Figma variables support only color / number / string / boolean; Tokens Studio has 24 token types with **no motion types**. "Figma-ready" for motion therefore means: exportable as numbers/strings (duration ms, bounce), not as native Figma motion variables.

### 5.3 Proposed representation

Use standard DTCG types wherever a standard type exists; put the spring definition in a vendor extension on a standards-compliant `transition` token that doubles as the bézier fallback:

```jsonc
{
  "motion": {
    "duration": {
      "$type": "duration",
      "instant": { "$value": { "value": 0,   "unit": "ms" }, "$description": "No animation. Keyboard-initiated and 100+/day actions." },
      "quick":   { "$value": { "value": 100, "unit": "ms" }, "$description": "Press feedback, hover color." },
      "fast":    { "$value": { "value": 150, "unit": "ms" }, "$description": "Tooltips, small popovers, hover transforms." },
      "base":    { "$value": { "value": 250, "unit": "ms" }, "$description": "Dropdowns, selects, toasts, crossfades." },
      "slow":    { "$value": { "value": 350, "unit": "ms" }, "$description": "Modals, drawers, sheets (non-spring path). Matches SwiftUI easeInOut default." },
      "slower":  { "$value": { "value": 500, "unit": "ms" }, "$description": "Explanatory / marketing / first-run only. Matches Apple spring default duration." }
    },
    "easing": {
      "$type": "cubicBezier",
      "out":     { "$value": [0.23, 1, 0.32, 1],     "$description": "Enter/exit. Strong ease-out." },
      "inOut":   { "$value": [0.77, 0, 0.175, 1],    "$description": "Move/morph on screen." },
      "drawer":  { "$value": [0.32, 0.72, 0, 1],     "$description": "iOS-like sheet curve for non-spring fallback." },
      "hover":   { "$value": [0.25, 0.1, 0.25, 1],   "$description": "CSS `ease`. Hover/color only." },
      "linear":  { "$value": [0, 0, 1, 1],           "$description": "Constant motion: progress, marquee." }
    },
    "spring": {
      "$type": "transition",
      "interactive": {
        "$value": { "duration": { "value": 220, "unit": "ms" }, "delay": { "value": 0, "unit": "ms" }, "timingFunction": "{motion.easing.out}" },
        "$extensions": { "dev.prism.spring": { "duration": 0.15, "bounce": 0.0, "blendDuration": 0.25, "settle": 0.220 } },
        "$description": "Tracks a live gesture (drag/scroll-linked). Apple interactiveSpring duration and blend; bounce 0 is Prism's choice (Apple's base bounce is 0.15)."
      },
      "snappy": {
        "$value": { "duration": { "value": 487, "unit": "ms" }, "delay": { "value": 0, "unit": "ms" }, "timingFunction": "{motion.easing.out}" },
        "$extensions": { "dev.prism.spring": { "duration": 0.35, "bounce": 0.15, "settle": 0.487 } },
        "$description": "Default for state changes: toggles, segmented controls, selection, popovers."
      },
      "smooth": {
        "$value": { "duration": { "value": 587, "unit": "ms" }, "delay": { "value": 0, "unit": "ms" }, "timingFunction": "{motion.easing.inOut}" },
        "$extensions": { "dev.prism.spring": { "duration": 0.40, "bounce": 0.0, "settle": 0.587 } },
        "$description": "Reposition / layout / morph with no overshoot. Apple 'move' (damping 1.0, response 0.4)."
      },
      "sheet": {
        "$value": { "duration": { "value": 404, "unit": "ms" }, "delay": { "value": 0, "unit": "ms" }, "timingFunction": "{motion.easing.drawer}" },
        "$extensions": { "dev.prism.spring": { "duration": 0.30, "bounce": 0.20, "settle": 0.404 } },
        "$description": "Sheets/drawers after a flick or drag release. Apple drawer (damping 0.8, response 0.3)."
      },
      "bouncy": {
        "$value": { "duration": { "value": 818, "unit": "ms" }, "delay": { "value": 0, "unit": "ms" }, "timingFunction": "{motion.easing.out}" },
        "$extensions": { "dev.prism.spring": { "duration": 0.50, "bounce": 0.30, "settle": 0.818 } },
        "$description": "Delight tier only (rare/first-time). Apple .bouncy defaults."
      }
    }
  }
}
```

Design notes:

- `dev.prism.spring.duration` / `bounce` are the **source of truth**; `settle` and the `$value.duration` are derived and are **validated in CI** (regenerate and diff) so the fallback cannot drift.
- **Settle (corrected 2026-09-14)** is the last time the unit step response from rest is 0.001 or more away from 1. Only displacement counts; velocity is ignored.
  - Values in the table above: interactive 0.220 s, sheet 0.404 s, snappy 0.487 s, smooth 0.587 s, bouncy 0.818 s.
  - Sampling Apple's own `Spring.value(target:time:)` every 0.1 ms confirms them: 220.4 / 404.5 / 487.6 / 587.8 / 818.7 ms, on both macOS 26.6 and the iOS 26.5 simulator.
- **Apple's `Spring.settlingDuration` getter returns something else**, even though its docs cite the same ε: 0.300 / 0.584 / 0.635 / 0.600 / 1.045 s.
  - The getter is a coarser estimate: critically damped springs land on 0.1 s steps.
  - `init(settlingDuration:dampingRatio:epsilon:)` does not invert the getter.
  - Both stacks must therefore compute settle by sampling the curve. The Swift side must never read `settlingDuration`.
- **`interactive` bounce (corrected 2026-09-14).** Apple's `interactiveSpring` is `Spring(duration: 0.15, bounce: 0.15)` with blend 0.25. Prism's `interactive` keeps bounce 0 (critically damped tracking, settle 0.220 s) as its own choice. Exact Apple parity would be (0.15, 0.15), settle 0.209 s.
- Every spring is DTCG-legal for third-party tools (they see a `transition`), and the bézier fallback is what Figma/Tokens Studio/no-`linear()` browsers get.
- `blendDuration` is Apple-only; it's an optional extension field (default 0).
- The scale is intentionally small (6 durations, 5 easings, 5 springs). Component specs reference these by name; components never introduce literal numbers.

### 5.4 Generated outputs (Style Dictionary v5 custom transforms/formats)

**SwiftUI (`ios-swift` format):**

```swift
import SwiftUI

public enum DSMotion {
    public enum Duration {
        public static let instant: TimeInterval = 0
        public static let fast: TimeInterval = 0.15
        public static let base: TimeInterval = 0.25
        public static let slow: TimeInterval = 0.35
        // ...
    }
    public enum Easing {
        /// cubicBezier tokens map to Animation.timingCurve(x1,y1,x2,y2,duration:)
        public static func out(_ duration: TimeInterval = Duration.base) -> Animation {
            .timingCurve(0.23, 1, 0.32, 1, duration: duration)
        }
    }
    public enum Spring {
        public static let interactive = SwiftUI.Spring(duration: 0.15, bounce: 0.0)
        public static let snappy      = SwiftUI.Spring(duration: 0.35, bounce: 0.15)
        public static let smooth      = SwiftUI.Spring(duration: 0.40, bounce: 0.0)
        public static let sheet       = SwiftUI.Spring(duration: 0.30, bounce: 0.20)
        public static let bouncy      = SwiftUI.Spring(duration: 0.50, bounce: 0.30)
    }
}

public extension Animation {
    static var dsSnappy: Animation { .spring(DSMotion.Spring.snappy) }          // Animation.spring(_:blendDuration:)
    static var dsInteractive: Animation { .spring(DSMotion.Spring.interactive, blendDuration: 0.25) }
}
```

`SwiftUI.Spring` (iOS 17+) already exposes `mass/stiffness/damping/response/dampingRatio/settlingDuration`, so the parity test on Apple can assert `DSMotion.Spring.snappy.stiffness ≈ 322.3` etc. against the JSON.

**CSS variables (`css/variables`), plus Tailwind v4 `@theme`:**

```css
:root {
  --ds-motion-duration-fast: 150ms;
  --ds-motion-duration-base: 250ms;
  --ds-motion-easing-out: cubic-bezier(0.23, 1, 0.32, 1);

  /* springs: perceptual duration, settle duration, linear() easing, and a transition shorthand */
  --ds-motion-spring-snappy-perceptual: 350ms;
  --ds-motion-spring-snappy-duration: 487ms;
  --ds-motion-spring-snappy-easing: linear(0, 0.054, 0.176, 0.322, 0.467, 0.597, 0.707, 0.794, 0.862, 0.911, 0.947, 0.971, 0.987, 0.997, 1.002, 1.005, 1.006, 1.006, 1.005, 1.005, 1.004, 1.003, 1.002, 1.001, 1);
  --ds-motion-spring-snappy: var(--ds-motion-spring-snappy-duration) var(--ds-motion-spring-snappy-easing);
}
@supports not (transition-timing-function: linear(0, 1)) {
  :root { --ds-motion-spring-snappy: 487ms cubic-bezier(0.23, 1, 0.32, 1); }
}
@theme {
  --ease-out: var(--ds-motion-easing-out);
  --ease-spring-snappy: var(--ds-motion-spring-snappy-easing);
}
```

(The `linear()` string above is a 25-stop uniform sample produced by this report's sampler from the Apple formula; production output should use a tolerance-based simplification like Jake Archibald's generator — ~20–30 stops for ζ ≥ 0.7. The `bouncy` sample needs the overshoot stops, e.g. `... 1.046, 1.044 ...`.)

**TypeScript (`javascript/es6` or custom):**

```ts
export const motion = {
  duration: { instant: 0, quick: 100, fast: 150, base: 250, slow: 350, slower: 500 },
  easing: { out: [0.23, 1, 0.32, 1] as const, /* ... */ },
  spring: {
    snappy: {
      duration: 0.35, bounce: 0.15,                       // Apple parameters
      stiffness: 322.3, damping: 30.5, mass: 1,           // exact physics for Motion
      settle: 0.487,                                      // for CSS / timers
      css: "487ms linear(...)",
    },
  },
} as const;

// Motion usage — pass physics for parity with SwiftUI:
animate(el, { transform: "translateY(0)" }, { type: "spring", ...motion.spring.snappy, velocity });
```

**Parity report (CI):** for each spring token, compute `(stiffness, damping, settle)` in the Node build and compare to the Swift side (`stiffness`/`damping` read from `Spring(...)` in a small `swift test`; settle found by sampling `Spring.value(target: 1.0, time:)`, never `Spring.settlingDuration`; corrected 2026-09-14), tolerance 1 % / 10 ms; compare the CSS `linear()` sample against the closed-form curve at 5 % / 25 % / 50 % / 75 % / 100 % of settle time (tolerance 0.01). This is the machine-readable "contract" for the motion module.

### 5.5 Rules of use encoded in the component spec (from the skills, machine-checkable)

- `interactive` only while a gesture is active; on release hand off to `sheet`/`snappy` with the release velocity (SwiftUI: automatic; Motion: `velocity` option).
- Gesture-driven components on web MUST use Motion (JS) springs; CSS `linear()` springs only for state-driven transitions (toggle, popover, toast).
- Springs with `bounce > 0` only after momentum (flick/release) or in the delight tier; never for hover/press.
- No motion for keyboard shortcuts / command palette; `duration.instant`.
- Enter/exit symmetric; `transform`/`opacity` only; `transform-origin` at trigger.

---

## 6. Reduce Motion and related system toggles

### 6.1 Apple platforms

- SwiftUI: `@Environment(\.accessibilityReduceMotion)` — "If this property's value is true, UI should avoid large animations, especially those that simulate the third dimension." (iOS 13+/watchOS 6+).
- UIKit: `UIAccessibility.isReduceMotionEnabled`; `UIAccessibility.prefersCrossFadeTransitions` (iOS 14+) = Reduce Motion **and** "Prefer Cross-Fade Transitions" both on.
- HIG Accessibility: when Reduce Motion is active, reduce "automatic and repetitive animations, including zooming, scaling, and peripheral motion"; specific techniques: "Tightening animation springs to reduce bounce effects", "Replacing transitions in x-, y-, and z-axes with fades", "Avoiding animating depth changes in z-axis layers", "Avoiding animating into and out of blurs", "Tracking animations directly with people's gestures".
- HIG Motion: "Make motion optional… supplement visual feedback by also using alternatives like haptics and audio"; "Let people cancel motion"; "Aim for brevity and precision"; "avoid adding motion to UI interactions that occur frequently"; visionOS: avoid ~0.2 Hz oscillation and peripheral motion.
- watchOS: WatchKit layout animations cannot customize easing; use SwiftUI.

### 6.2 Web

- `@media (prefers-reduced-motion: reduce)` (Baseline); WCAG 2.2 SC 2.3.3 *Animation from Interactions* (AAA): "Motion animation triggered by interaction can be disabled, unless the animation is essential…"; sufficient techniques C39 (CSS) and SCR40 (JS).
- Tailwind `motion-reduce:` / `motion-safe:`; Motion `MotionConfig reducedMotion="user"` (drops transform/layout, keeps opacity/color) and `useReducedMotion()`.
- `prefers-reduced-transparency` is not available in Safari — do not gate glass on it alone.

### 6.3 Token-level design (recommended)

Add a **motion mode** dimension to the token pipeline: `full` | `reduced`. The `reduced` layer overrides only what changes:

```jsonc
{ "motion": { "spring": {
    "snappy": { "$extensions": { "dev.prism.spring": { "duration": 0.25, "bounce": 0.0 } } },
    "sheet":  { "$extensions": { "dev.prism.spring": { "duration": 0.25, "bounce": 0.0 } } },
    "bouncy": { "$extensions": { "dev.prism.spring": { "duration": 0.30, "bounce": 0.0 } } } },
  "transition": { "presentation": { "$value": "crossfade" } }   // component-level policy token (string)
}}
```

Generation: web → the same variables inside `@media (prefers-reduced-motion: reduce) { :root { … } }`, so components that consume tokens get the reduced spring automatically; Swift → `DSMotion.resolved(reduceMotion: Bool)` returning the reduced table, injected as an environment value by the Prism root view. Component contract: with `reduced`, replace translate/scale/blur/parallax with opacity crossfade at `duration.base` + `easing.out`; keep color/opacity/state feedback; keep gesture 1:1 tracking (HIG explicitly allows "tracking animations directly with people's gestures").

---

## 7. Haptics

### 7.1 SwiftUI `SensoryFeedback` (verified per-symbol; symbol available iOS 17 / macOS 14 / watchOS 10 / tvOS 17 / **visionOS 26**)

| Feedback | Meaning (Apple) | **Actually plays on** |
|---|---|---|
| `.success` / `.warning` / `.error` | task outcome | iOS, watchOS |
| `.selection` (= `.selection(.default)` in 26) | "a UI element's values are changing" | iOS, watchOS |
| `.impact(weight: .light/.medium/.heavy, intensity:)` (defaults `.medium`, `1.0`) | collision by mass | iOS, watchOS ("Not all platforms will play different feedback for different weights") |
| `.impact(flexibility: .rigid/.solid/.soft, intensity:)` | collision by flexibility | iOS, watchOS |
| `.increase` / `.decrease` | important value crossed a threshold | watchOS, visionOS |
| `.start` / `.stop` | activity started/stopped (timers) | watchOS |
| `.alignment` | dragged item aligned | iOS, macOS |
| `.levelChange` | discrete pressure levels | macOS |
| `.pathComplete` (iOS 17.5+) | drawn path completed/recognized | iOS |
| **iOS 26+** `.press(.button / .buttonIconOnly / .slider / .tab / .toggle)` | touch-down on a specific control | all platforms 26.0+ (per-platform playback not stated in the docs — medium) |
| **iOS 26+** `.release(.slider)` | touch-up | all platforms 26.0+ |
| **iOS 26+** `.selection(.on / .off / .minimum / .maximum)` | value changed to on/off; hit min/max | all platforms 26.0+ |

Modifiers: `.sensoryFeedback(_:trigger:)`, `.sensoryFeedback(_:trigger:condition:)` (closure `(old, new) -> Bool`), `.sensoryFeedback(trigger:_:)` (closure returns the feedback). The modifier is state-driven — feedback fires when the trigger changes, which is exactly the "causality" rule; it also guarantees the haptic and the SwiftUI state animation are scheduled from the same state transition ("harmony").

UIKit equivalents (for parity docs): `UINotificationFeedbackGenerator.FeedbackType` `.success/.warning/.error`; `UIImpactFeedbackGenerator.FeedbackStyle` `.light/.medium/.heavy/.soft/.rigid`; `UISelectionFeedbackGenerator`; `UICanvasFeedbackGenerator` (drawing); `UIFeedbackGenerator.prepare()` reduces latency; iOS 17.5 `init(view:)` for Apple Pencil Pro / location-aware feedback. "Feedback is played only when appropriate and on supported devices" — the OS honors the System Haptics setting; apps should still expose their own toggle (HIG: "Make haptics optional").

### 7.2 watchOS (`WKInterfaceDevice.play(_:)` + `WKHapticType`, watchOS 2+)

Cases: `notification, directionUp, directionDown, success, failure, retry, start, stop, click, navigationLeftTurn, navigationRightTurn, navigationGenericManeuver, underwaterDepthPrompt, underwaterDepthCriticalPrompt`. Constraints: no effect when the extension is `background`/`inactive` (except active workout sessions); if called while the engine is engaged the system stops the current feedback and imposes a **100 ms minimum delay**; excessive use drains battery; haptics interrupt HealthKit heart-rate sampling. HIG watchOS meanings: Notification (something significant), Up/Down (threshold crossed), Success/Failure/Retry, Start/Stop (timers), Click ("dial clicking… overusing the click haptic tends to diminish its utility").

### 7.3 macOS

`NSHapticFeedbackManager.FeedbackPattern` `.generic / .alignment / .levelChange` (macOS 10.11+), Force Touch / Magic Trackpad only. Through SwiftUI, only `.alignment` and `.levelChange` produce feedback on macOS. Practical consequence: **on macOS, Prism's success/error/selection haptics are silent by design**; the visual/audio channel must carry the feedback.

### 7.4 Web

- **Vibration API** (W3C CR Draft, 21 May 2026 — "not expected to advance… due to limited browser support and opposing positions from WebKit and Firefox"): `navigator.vibrate(ms | pattern[])`; pattern **max 10 entries**, each **capped at 10 000 ms**; returns `false` when the document is not `visible` or the window lacks **sticky activation**; `vibrate(0)` / `[]` cancels.
- Support (caniuse, 2026-09-08): Chrome 30+ (desktop: no motor → no-op), Edge 79+, Samsung Internet 4+, Chrome for Android; **Safari macOS/iOS: never**; **Firefox desktop removed in 129**; Firefox for Android no. Global ~79 %. Chrome gates it on the *sticky* activation bit (Chrome "user activation" post; WICG intervention #47) — first call must follow a real tap.
- **iOS Safari haptics trick**: `<input type="checkbox" switch>` (Safari 17.4+) plays the system toggle haptic when the switch is toggled by a user tap; libraries (`ios-haptics`, MIT; `@haptics/*`, MIT) overlay an invisible switch on the element. Third-party report (unverified against Apple/WebKit sources): iOS 26.5 disabled programmatic re-ticking, leaving only a **single tick per direct user tap**. Treat as best-effort progressive enhancement, never as a contract.
- No web equivalent of Reduce Motion for haptics exists; the only user control is the OS/browser setting, so provide an in-app haptics toggle (also HIG guidance).

### 7.5 Recommended semantic registry and mapping

Registry file (not DTCG — a JSON-schema'd `haptics.registry.json` versioned with the system; Figma has no concept of it):

```jsonc
{
  "$schema": "https://prism.dev/schemas/haptics-registry.v1.json",
  "version": "1.0.0",
  "haptics": {
    "selection":       { "ios": "selection",                 "watch": "selection",   "mac": null,         "web": [8] },
    "selection.on":    { "ios": "selection(.on)",            "watch": "selection(.on)",  "mac": null,     "web": [8] },
    "selection.off":   { "ios": "selection(.off)",           "watch": "selection(.off)", "mac": null,     "web": [8] },
    "selection.limit": { "ios": "selection(.maximum|.minimum)", "watch": "selection(.maximum|.minimum)", "mac": "alignment", "web": [12] },
    "press.button":    { "ios": "press(.button)",            "watch": "press(.button)",  "mac": null,     "web": null },
    "press.toggle":    { "ios": "press(.toggle)",            "watch": "press(.toggle)",  "mac": null,     "web": null },
    "press.tab":       { "ios": "press(.tab)",               "watch": "press(.tab)",     "mac": null,     "web": null },
    "press.slider":    { "ios": "press(.slider)",            "watch": "press(.slider)",  "mac": null,     "web": null },
    "release.slider":  { "ios": "release(.slider)",          "watch": "release(.slider)","mac": null,     "web": null },
    "impact.light":    { "ios": "impact(weight: .light)",    "watch": "impact(weight: .light)",  "mac": null, "web": [10] },
    "impact.medium":   { "ios": "impact(weight: .medium)",   "watch": "impact(weight: .medium)", "mac": null, "web": [20] },
    "impact.heavy":    { "ios": "impact(weight: .heavy)",    "watch": "impact(weight: .heavy)",  "mac": null, "web": [35] },
    "impact.soft":     { "ios": "impact(flexibility: .soft)","watch": "impact(flexibility: .soft)", "mac": null, "web": [15] },
    "impact.rigid":    { "ios": "impact(flexibility: .rigid)","watch": "impact(flexibility: .rigid)","mac": null, "web": [8] },
    "snap":            { "ios": "alignment",                 "watch": "impact(weight: .light)", "mac": "alignment", "web": [10] },
    "success":         { "ios": "success",                   "watch": "success",     "mac": null,         "web": [12, 60, 12] },
    "warning":         { "ios": "warning",                   "watch": "warning",     "mac": null,         "web": [25, 60, 25] },
    "error":           { "ios": "error",                     "watch": "error",       "mac": null,         "web": [30, 40, 30, 40, 30] },
    "value.increase":  { "ios": "impact(weight: .light)",    "watch": "increase",    "mac": null,         "web": [8] },
    "value.decrease":  { "ios": "impact(weight: .light)",    "watch": "decrease",    "mac": null,         "web": [8] },
    "activity.start":  { "ios": "impact(weight: .medium)",   "watch": "start",       "mac": null,         "web": [20] },
    "activity.stop":   { "ios": "impact(weight: .medium)",   "watch": "stop",        "mac": null,         "web": [20] },
    "level.change":    { "ios": "selection",                 "watch": "selection",   "mac": "levelChange","web": [8] },
    "path.complete":   { "ios": "pathComplete",              "watch": "success",     "mac": null,         "web": [12, 60, 12] }
  },
  "policies": {
    "web": { "requiresUserActivation": true, "maxEntries": 10, "maxEntryMs": 10000, "iosSafariSwitchTrick": "optional" },
    "watch": { "minIntervalMs": 100, "foregroundOnly": true },
    "harmony": "fire on the same state transition as the visual",
    "respectSystemSetting": true, "appToggle": "required"
  }
}
```

Mapping table (semantic → platform), with the source of each cell:

| Semantic name | iOS 26 (SwiftUI `SensoryFeedback`) | watchOS 26 (SwiftUI; WatchKit fallback) | macOS 26 | Web (Chrome Android / Samsung) | Web iOS Safari |
|---|---|---|---|---|---|
| `selection` | `.selection` (plays) | `.selection` (plays); `WKHapticType.click` | silent | `vibrate([8])` | switch-tick (best effort) |
| `selection.on/off` | `.selection(.on/.off)` (26+) | same | silent | `[8]` | switch-tick |
| `selection.limit` | `.selection(.maximum/.minimum)` | same | `.alignment` (plays on macOS) | `[12]` | switch-tick |
| `press.button/toggle/tab/slider`, `release.slider` | `.press(...)`, `.release(.slider)` (26+) | same (26+) | same symbol (playback undocumented) | none (keep silent; press feedback on web is visual) | none |
| `impact.light/medium/heavy/soft/rigid` | `.impact(weight:)`/`.impact(flexibility:)` | same (plays; may not differentiate) ; WK `click` | silent | `[10] / [20] / [35] / [15] / [8]` | switch-tick |
| `snap` (drag alignment) | `.alignment` (plays on iOS) | `.impact(weight: .light)` | `.alignment` | `[10]` | switch-tick |
| `success` / `warning` / `error` | `.success/.warning/.error` | same; WK `success/retry/failure` | silent | `[12,60,12] / [25,60,25] / [30,40,30,40,30]` | switch-tick ×1 |
| `value.increase/decrease` | `.impact(.light)` (increase/decrease silent on iOS) | `.increase/.decrease`; WK `directionUp/Down` | silent | `[8]` | switch-tick |
| `activity.start/stop` | `.impact(.medium)` (start/stop silent on iOS) | `.start/.stop`; WK `start/stop` | silent | `[20]` | switch-tick |
| `level.change` | `.selection` | `.selection` | `.levelChange` (plays) | `[8]` | switch-tick |
| `path.complete` | `.pathComplete` (17.5+) | `.success` | silent | `[12,60,12]` | switch-tick |
| `notification` (out-of-app alert) | system notification haptic (not app-triggered) | WK `notification` | n/a | n/a | n/a |

The web patterns are **Prism proposals** (no standard exists; durations chosen to keep single ticks ≤ 35 ms and notifications ≤ 3 pulses, all far under the spec caps). The "silent on macOS/visionOS" cells come straight from Apple's per-symbol "Only plays feedback on …" notes; do not paper over them with `.generic`-style hacks.

---

## 8. Facts table

Confidence: **high** = official doc read on 2026-09-08; **medium** = official but partial/indirect, or reputable secondary; **low** = unverified/folklore.

| # | Claim | Source | Confidence |
|---|---|---|---|
| 1 | `Animation.spring(duration:bounce:blendDuration:)` defaults `0.5 / 0.0 / 0`; bounce ∈ [−1, 1]; velocity preserved across successive springs | https://developer.apple.com/documentation/swiftui/animation/spring(duration:bounce:blendduration:) | high |
| 2 | `.smooth` base bounce 0; `.snappy` base bounce 0.15; `.bouncy` base bounce 0.3; all default duration 0.5 | https://developer.apple.com/documentation/swiftui/animation/snappy(duration:extrabounce:) (+ smooth/bouncy pages) | high |
| 3 | `interactiveSpring` defaults duration 0.15, blendDuration 0.25, base bounce 0.15 (corrected 2026-09-14, from the SDK's inlinable body) (legacy: response 0.15, dampingFraction 0.86) | https://developer.apple.com/documentation/swiftui/animation/interactivespring(duration:extrabounce:blendduration:) | high |
| 4 | `Animation.default` is a spring (response 0.55, dampingFraction 1.0) since iOS 17/macOS 14/watchOS 10; previously easeInOut | https://developer.apple.com/documentation/swiftui/animation/default | high |
| 5 | `Animation.easeInOut` default duration 0.35 s | https://developer.apple.com/documentation/swiftui/animation/easeinout | high |
| 6 | `Spring` struct (iOS 17+) converts representations; doc example `(0.5, 0.3) → (1.0, 157.9, 17.6)`; `settlingDuration` is documented with ε = 0.001 but returns longer values than a sampled ε = 0.001 settle (corrected 2026-09-14, §5.3) | https://developer.apple.com/documentation/swiftui/spring ; https://developer.apple.com/documentation/swiftui/spring/settlingduration | high |
| 7 | Conversion formulas `stiffness = (2π/duration)²`, `damping = 4π(1−bounce)/duration` (bounce ≥ 0), `4π/(duration·(1+bounce))` (bounce < 0; corrected 2026-09-14, the WWDC23 slide's `4π/(duration + 4π·bounce)` is wrong), mass 1 | Xcode 26.6 iOS SDK `SwiftUICore.swiftinterface` (`springStiffness`, `springDamping`, `springDampingFraction`); runtime probe on macOS 26.6 and the iOS 26.5 simulator; WWDC23 10158 https://developer.apple.com/videos/play/wwdc2023/10158/ | high |
| 8 | Bounce feel: ~0.15 "not very bouncy", ~0.3 "noticeable", > 0.4 "too exaggerated for a UI element"; duration is perceptual, use it (not settle) for completion | https://developer.apple.com/videos/play/wwdc2023/10158/ ; https://wwdcnotes.com/documentation/wwdc23-10158-animate-with-springs/ | high |
| 9 | Spring `shouldMerge` returns true → preserves velocity and retargets; SwiftUI tracks gesture velocity automatically | https://wwdcnotes.com/documentation/wwdc23-10156-explore-swiftui-animation/ ; WWDC23 10158 transcript | medium |
| 10 | `UIView.animate(springDuration:bounce:initialSpringVelocity:...)` iOS 17+, defaults 0.5 / 0.0 | https://developer.apple.com/documentation/uikit/uiview/animate(springduration:bounce:initialspringvelocity:delay:options:animations:completion:) | high |
| 11 | No `Animation` symbols introduced in iOS 26; visionOS 26 adds `systemOverlayAppearance` etc. | https://developer.apple.com/documentation/swiftui/animation | medium |
| 12 | Core Animation default transaction duration 0.25 s | not stated on https://developer.apple.com/documentation/quartzcore/catransaction/animationduration() or kCATransactionAnimationDuration | low |
| 13 | iOS keyboard animation 0.25 s / spring (0.5 s, damping 500, stiffness 1000, mass 3) | Apple Developer Forums threads (user reports) | low |
| 14 | CSS `linear()` syntax and stop semantics | https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear | high |
| 15 | `linear()` support: Chrome 113, Edge 113, Firefox 112, Safari 17.2 (Baseline Dec 2023) | https://github.com/mdn/browser-compat-data (css/types/easing-function.json) | high |
| 16 | CSS springs via `linear()` cannot carry velocity on interruption; duration must equal settle time | https://www.joshwcomeau.com/animation/linear-timing-function/ | medium |
| 17 | Linear Easing Generator: Apache-2.0, `simplify`/`round` params, JS easing → `linear()` | https://github.com/jakearchibald/linear-easing-generator | high |
| 18 | Easing Wizard outputs `linear()` springs, REST API, **custom non-commercial license** | https://github.com/roydigerhund/easingwizard | medium |
| 19 | `tailwindcss-spring` 1.0.1 MIT, Apple-style bounce/perceptual duration → `linear()`, peer Tailwind ≥ 3 (v4 unstated) | https://registry.npmjs.org/tailwindcss-spring/latest ; https://github.com/KevinGrajeda/tailwindcss-spring | medium |
| 20 | Motion latest 13.2.0, MIT | https://registry.npmjs.org/motion/latest | high |
| 21 | Motion spring options and "bounce and duration overridden if stiffness/damping/mass set"; `visualDuration` definition | https://motion.dev/docs/react-transitions ; https://motion.dev/docs/animate | high |
| 22 | Motion source: `root = 2π/(visualDuration·1.2)`, `damping = 2·clamp(0.05,1,1−bounce)·√stiffness`; defaults stiffness 100 / damping 10 / mass 1 / bounce 0.3 / visualDuration 0.3; `toString()` → `linear()` | https://unpkg.com/motion-dom@13.2.0/dist/es/animation/generators/spring.mjs | high |
| 23 | `spring(visualDuration, bounce)` returns e.g. `800ms linear(...)` for CSS `transition`; the object form needs `keyframes`, and the string's duration is Motion's own 50 ms-grid rest time, not Prism's settle (corrected 2026-09-14, §4.2) | https://motion.dev/docs/css ; https://motion.dev/docs/spring | high |
| 24 | Motion `MotionConfig reducedMotion="user"` disables transform/layout, keeps opacity/backgroundColor; `useReducedMotion()` | https://motion.dev/docs/react-accessibility | high |
| 25 | Tailwind v4 default `--ease-in/out/in-out` values, `--animate-*`, `@theme` custom ease/animation | https://tailwindcss.com/docs/theme | high |
| 26 | Tailwind `motion-reduce:` / `motion-safe:` / `contrast-more:` variants; no reduced-transparency variant | https://tailwindcss.com/docs/hover-focus-and-other-states | high |
| 27 | `prefers-reduced-motion` Chrome 74 / Firefox 63 / Safari 10.1; `prefers-reduced-transparency` Chrome 118, Firefox 113 (flag), Safari none | https://github.com/mdn/browser-compat-data (css/at-rules/media.json) ; https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency | high |
| 28 | WCAG 2.2 SC 2.3.3 (AAA) text; techniques C39/SCR40 | https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html | high |
| 29 | DTCG 2025.10 is a Final CG Report (28 Oct 2025); `duration` `{value, unit}`, `cubicBezier` [4], `transition` composite, `$extensions`; no spring/easing keywords | https://www.designtokens.org/TR/2025.10/format/ | high |
| 30 | `/TR/drafts/format/` is a newer draft marked "Do not attempt to implement" | https://www.designtokens.org/TR/drafts/format/ | high |
| 31 | Style Dictionary latest 5.5.3, Apache-2.0, Node ≥ 22; v5 breaking: refs only to `$value` tokens, fixed ref syntax | https://registry.npmjs.org/style-dictionary/latest ; https://styledictionary.com/versions/v5/migration/ | high |
| 32 | SD 5.4.0 added DTCG 2025.10 dimension objects; 5.3.0 structured color; no duration-object support listed; `timeSeconds` matches `time`, `transitionCssShorthand` has object-conversion TODO | https://github.com/style-dictionary/style-dictionary/blob/main/CHANGELOG.md ; https://github.com/style-dictionary/style-dictionary/blob/main/lib/common/transforms.js | high |
| 33 | Figma variables: color/number/string/boolean only | https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables | high |
| 34 | Tokens Studio: 24 token types, none motion-related | https://docs.tokens.studio/manage-tokens/token-types | medium |
| 35 | `accessibilityReduceMotion` env value semantics | https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducemotion | high |
| 36 | `UIAccessibility.prefersCrossFadeTransitions` iOS 14+ | https://developer.apple.com/documentation/uikit/uiaccessibility/preferscrossfadetransitions | high |
| 37 | HIG Accessibility Reduce Motion techniques (tighten springs, fades for x/y/z, no blur animation, track gestures) | https://developer.apple.com/design/human-interface-guidelines/accessibility | high |
| 38 | HIG Motion best practices; visionOS 0.2 Hz warning; watchOS easing not customizable in WatchKit | https://developer.apple.com/design/human-interface-guidelines/motion | high |
| 39 | `SensoryFeedback` availability incl. visionOS 26.0; full symbol list incl. `press/release/selection(_:)` | https://developer.apple.com/documentation/swiftui/sensoryfeedback | high |
| 40 | Per-feedback playback platforms (success/warning/error/selection/impact → iOS+watchOS; alignment → iOS+macOS; levelChange → macOS; increase/decrease → watchOS+visionOS; start/stop → watchOS; pathComplete → iOS, 17.5+) | per-symbol pages under https://developer.apple.com/documentation/swiftui/sensoryfeedback/ | high |
| 41 | `impact(weight:intensity:)` defaults `.medium`, `1.0`; `Weight` light/medium/heavy; `Flexibility` rigid/solid/soft | https://developer.apple.com/documentation/swiftui/sensoryfeedback/impact(weight:intensity:) | high |
| 42 | iOS 26: `PressFeedback` `.button/.buttonIconOnly/.slider/.tab/.toggle`; `ReleaseFeedback` `.slider`; `SelectionFeedback` `.on/.off/.maximum/.minimum` | https://developer.apple.com/documentation/swiftui/sensoryfeedback/pressfeedback (+ releasefeedback, selectionfeedback) | high |
| 43 | `sensoryFeedback(_:trigger:condition:)` closure semantics | https://developer.apple.com/documentation/swiftui/view/sensoryfeedback(_:trigger:condition:) | high |
| 44 | UIKit feedback generators & styles; `prepare()`; iOS 17.5 `init(view:)` for Apple Pencil Pro; `UICanvasFeedbackGenerator` | https://developer.apple.com/documentation/uikit/uifeedbackgenerator | high |
| 45 | `WKHapticType` full case list; `WKInterfaceDevice.play(_:)` foreground-only, 100 ms minimum, HealthKit interference | https://developer.apple.com/documentation/watchkit/wkhaptictype ; https://developer.apple.com/documentation/watchkit/wkinterfacedevice/play(_:) | high |
| 46 | `NSHapticFeedbackManager.FeedbackPattern` generic/alignment/levelChange, Force Touch required | https://developer.apple.com/documentation/appkit/nshapticfeedbackmanager/feedbackpattern | high |
| 47 | HIG Playing haptics best practices and per-platform tables | https://developer.apple.com/design/human-interface-guidelines/playing-haptics | high |
| 48 | Vibration API spec: max length 10, max 10 000 ms per entry, hidden documents → false, sticky activation required; CR Draft 21 May 2026 "not expected to advance" | https://www.w3.org/TR/vibration/ | high |
| 49 | Vibration support: Chrome 30+, Edge 79+, Samsung 4+; Safari none; Firefox desktop removed 129; Firefox Android no | https://caniuse.com/vibration | high |
| 50 | Chrome gates `vibrate()` on the sticky user-activation bit | https://developer.chrome.com/blog/user-activation ; https://github.com/WICG/interventions/issues/47 | high |
| 51 | `<input type="checkbox" switch>` shipped in Safari 17.4 | https://webkit.org/blog/15054/an-html-switch-control/ | high |
| 52 | Switch toggle produces haptic on iOS Safari; used by `ios-haptics` (MIT) | https://github.com/tijnjh/ios-haptics | medium |
| 53 | iOS 26.5 limited programmatic switch re-ticking to a single tick per user tap | https://haptics.kushagragolash.dev/ (third-party) | low |
| 54 | MDN Vibration API page: patterns, cancel with 0/[], "does nothing if unsupported" | https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API | high |

---

## 9. Recommendations for Prism

1. **Canonical spring = Apple `(duration, bounce)`**; store in `$extensions["dev.prism.spring"]` on a DTCG `transition` token whose `$value` is the bézier fallback. Validate derived fields in CI.
2. **Default preset table** (all bounce ≤ 0.3, all under Emil's 300 ms perceptual bar except delight): `interactive 0.15/0`, `snappy 0.35/0.15` (system default for state changes), `smooth 0.40/0` (layout/reposition), `sheet 0.30/0.20` (post-release), `bouncy 0.50/0.30` (delight tier only). Durations: `instant 0, quick 100, fast 150, base 250, slow 350, slower 500` ms. Easings: `out [0.23,1,0.32,1]`, `inOut [0.77,0,0.175,1]`, `drawer [0.32,0.72,0,1]`, `hover [0.25,0.1,0.25,1]`, `linear`.
3. **Generation**: Swift → `SwiftUI.Spring(duration:bounce:)` constants + `Animation.spring(_:)` helpers + `Animation.timingCurve` for béziers; TS → Apple params **and** physics triplet + settle + CSS string; CSS → `--ds-motion-spring-*-{perceptual,duration,easing}` and shorthand with `@supports not (transition-timing-function: linear(0,1))` bézier fallback; Tailwind `@theme` `--ease-spring-*`. Write our own sampler in the SD build (closed-form damped oscillator, ε = 0.001, tolerance simplification) rather than depending on Motion or a non-commercial tool.
4. **Web usage policy in component specs**: Motion (with the physics triplet + `velocity`) for anything draggable/interruptible; CSS `linear()` for state-driven transitions; never mix the two on one property.
5. **Reduce Motion as a token mode** (`full` | `reduced`) generated into `@media (prefers-reduced-motion: reduce)` and a Swift environment table; plus `MotionConfig reducedMotion="user"`; reduced springs: bounce 0, durations ≈ 0.25–0.30 s; transforms/blur/parallax → crossfade. Keep haptics available under Reduce Motion (they are the recommended alternative channel).
6. **Adopt Style Dictionary v5.5.x** (not v4) — v4 lacks the 2025.10 object-value work, and custom `duration` transforms are needed on both. Pin Node 22.
7. **Haptics registry** (JSON-schema'd, versioned with the system) with the mapping in §7.5; Swift adapter maps names → `SensoryFeedback` (use iOS 26 `press/release/selection(...)` for standard controls); web adapter feature-detects `vibrate`, requires sticky activation, respects visibility, enforces spec caps, and offers the iOS Safari switch trick only as an opt-in. Ship an in-app haptics toggle (HIG) and document which semantics are silent on macOS/visionOS.
8. **Harmony rule enforced by construction**: in SwiftUI, key `.sensoryFeedback(trigger:)` to the same state that drives the animation; on web, fire `vibrate` in the same event handler that commits the state change; never schedule haptics from animation-complete callbacks.
9. **Parity CI**: numeric spring parity (stiffness/damping/settle) Swift vs TS; CSS `linear()` curve check; registry coverage check (every semantic haptic has a value or explicit `null` for each platform); reduced-mode snapshot check (no `bounce > 0` in reduced layer).
10. **Figma readiness**: export `duration` (ms number), `bounce` (number), `easing` (string) into a Tokens Studio "number/other" set now; expect no native Figma motion variables — document the mapping so a future Figma Motion workflow can consume the numbers.

---

## 10. Open questions

1. **Which `press/release/selection(...)` feedbacks actually play on each platform in iOS 26 / watchOS 26 / macOS 26?** The 26.0 symbol pages don't carry the "Only plays feedback on…" note; needs device testing (especially macOS Magic Trackpad and visionOS).
2. **Apple `settlingDuration` vs our sampler** (answered 2026-09-14, corrected): they do not agree. Apple's getter is 12–226 ms longer; see §5.3. Settle is defined by sampling the curve on both stacks, and the closed-form curve is the parity reference.
3. **Is a `transition`-with-extension token acceptable to the Tokens Studio importer**, or does the extension get stripped on round-trip? Test before committing to the encoding; the alternative is sibling primitive tokens (`spring.snappy.duration`, `spring.snappy.bounce`).
4. **Reduced-motion spring values**: 0.25–0.30 s / bounce 0 is an informed guess (HIG says "tighten springs"); no numeric Apple guidance exists — validate with Reduce Motion users.
5. **Web haptics on iOS**: the `switch` trick's behavior on iOS 26.5+ is a third-party claim; verify against WebKit changelogs or on device before enabling it even as opt-in. Also confirm whether iPadOS (no Taptic Engine) is a no-op.
6. **Core Animation / UIKit system durations** (0.25 s transaction default, 0.35 s push) remain undocumented; if parity with UIKit navigation transitions matters, measure them on iOS 26 rather than cite.
7. **Tailwind v4 `--duration-*` namespace**: not verified whether Tailwind v4 exposes a theme namespace for `duration-*` utilities; if not, expose durations only as `--ds-*` variables and use arbitrary values/`@utility`.
8. **Style Dictionary DTCG 2025.10 `duration` objects**: track upstream — if SD adds a built-in `duration` transform, drop the custom one.
9. **Sound**: Apple's "audio-haptic" harmony rule implies a matching sound registry (`SensoryFeedback` is "haptic and/or audio"); out of scope here but the registry schema should leave room for an `audio` column.
