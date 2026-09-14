# ADR-0017: First deliverable is a blueprint, in English

- Status: accepted
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #17

## Context

The owner asked for guides that later agent sessions can implement. Two implementations of every component are expensive; beauty cannot be judged from JSON; and the previous system (RideVerse Glacier) showed that values decided in code get renegotiated later.

## Decision

The first release of this repository is a **blueprint**:

1. `docs/research/` — reference analysis (visual DNA), stack and tooling facts with sources, font comparison renders, licensing notes.
2. `docs/decisions.md` + `docs/adr/` — the seventeen founding decisions.
3. `tokens/` — DTCG schema, taxonomy and the reference brand values; `brands/` — brand contract.
4. `spec/` — component contract schema, the v1 component specs, icon and haptics registries.
5. Repository skeleton: `Package.swift`, `web/` workspace, `tools/` build and check configs, CI workflows, `gallery/` scaffold.
6. `agent/` — the Claude Code skill for consuming apps.
7. A **direction board**: an HTML page applying the reference brand to two or three screens in the spirit of the references, for the owner's visual sign-off before any component is implemented twice.
8. `docs/roadmap.md` — the implementation plan as tickets for `/execute-ticket`.

No component implementation ships in this release beyond what the direction board needs to render.

Repository language is **English** for everything committed (specs, code, comments, ADRs, skill). Conversation with the owner stays in Russian.

## Alternatives considered

- Documents only: leaves the pipeline unproven; the skeleton is cheap and forces real decisions (paths, package names).
- Code first: the fastest way to build the wrong thing twice.

## Consequences

- The direction board is the acceptance gate for the reference brand; if it is not beautiful, tokens change before code exists.
- Later sessions start from tickets, not from this conversation.

## Rules that follow

1. Nothing in `swift/` or `web/` is considered implemented until its manifest entry exists and the parity report lists it.
2. English everywhere in the repository, including commit messages.
