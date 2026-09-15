# ADR-0026: Figma metadata where Figma reads it; code syntax derived by the build

- Status: accepted
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #26
- Amends: ADR-0004 (decision 8: which tokens carry `$extensions["app.prism"].figma` and which of its keys are authored), ADR-0005 (decision 2: "every token carries … code syntax")

## Context

ADR-0004 decision 8 and ADR-0005 decision 2 say every token carries `$extensions["app.prism"].figma` with a collection, scopes and code syntax. The P1-1 review (2026-09-15) authored `figma` with `collection` and `scopes` only on `sys` and `comp` declarations of the types Figma imports as scoped variables, and no code syntax; `tools/tokens/ARCHITECTURE.md` §16.3 recorded the disagreement for the owner, who delegated the decision.

Facts that bear on it:

- Figma variables hold colors, numbers, strings and booleans only; composites (typography, shadow, gradient, transition) cannot become variables, so metadata on them has no reader (ADR-0005 Context; ARCHITECTURE §9.10).
- The Figma-native flavor exports `sys` and `comp` values, never `ref` ids (ARCHITECTURE §9.10); `ref` metadata would have no reader either.
- Scopes (fill, stroke, text fill, corner radius, gap, …) are a judgement per token and cannot be derived.
- Code syntax is a pure function of the token id: the emitted CSS custom property and the Swift member path follow the naming rules of ADR-0019, ADR-0020 §7 and ADR-0024 (ARCHITECTURE §8). Authoring it on ~420 tokens duplicates those rules and drifts the first time a naming rule changes.
- `collection` names the layer that owns the id (`base`, `colorScheme`, `density`, `modality`, `platform`, `component`); the build already knows the owner from the resolver (ADR-0024 ownership), so an authored value can be checked.

## Decision

1. **Authored metadata**: every `sys` and `comp` declaration whose type Figma imports as a scoped variable (color, dimension, font family, and number except flag numbers) carries `$extensions["app.prism"].figma` with `collection` and `scopes`. Nothing else carries `figma`: no `ref` token, no composite, no flag.
2. **Code syntax is derived, never authored.** The Figma-native flavor (P1-5) writes `codeSyntax` for every exported variable from the build's naming rules: `WEB` is the CSS custom property wrapped in `var()` (`var(--ds-color-bg-surface)`), `iOS` is the Swift member path on the token set (`tokens.color.bgSurface`). The Tokens Studio flavor carries no code syntax.
3. **Checks**: the build fails when a scoped-type `sys` or `comp` declaration lacks `figma.scopes`, when `figma.collection` differs from the layer that owns the id, when any token authors `figma.codeSyntax`, or when `figma` appears on a `ref` token, a composite or a flag.

## Alternatives considered

- **Metadata on every token, code syntax authored (the ADR-0004/0005 wording)**: roughly 420 hand-kept code-syntax strings that duplicate the naming rules; `ref` and composite metadata that no consumer reads.
- **Derive everything, author nothing**: scopes are design intent (a color for text fill only, a dimension for gaps only) and cannot be derived without losing that intent.

## Consequences

- Renaming an emitted name changes the Figma code syntax in the same build; Figma never shows stale names.
- The agent guide (ADR-0004 decision 8) still reads `a11y` and usage metadata; it is unaffected.
- Tokens that later become Figma-scoped (a new type Figma adds support for) gain `figma` in the change that exports them.

## Rules that follow

1. No token file contains `figma.codeSyntax`; the build rejects it.
2. Every scoped-type `sys`/`comp` declaration has `figma.scopes` and a `figma.collection` equal to its owning layer; the build checks both.
3. Every variable in `tokens/export/figma/**` has `codeSyntax.WEB` and `codeSyntax.iOS`, and the flavor test compares them with the names in `web/packages/tokens/src/generated` and `swift/Sources/DSTokens/Generated`.
