# ADR-0001: Consumers are the owner's apps; the developer is an agent

- Status: accepted
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #1

## Context

Prism will be consumed by the owner's own products: SwiftUI apps (RideVerse/TraVerse on iOS 26 and macOS 26, SodaClone on macOS) and React + Vite + Tailwind v4 web apps (InvestEd, BountyControl, VideoContent with an Electron shell). Every one of those repositories is developed primarily through AI coding agents driven by `CLAUDE.md` / `AGENTS.md` files. There is no design team, no external developer audience yet, and no human reviewer other than the owner.

A design system for humans is a documentation site with prose, examples and a Storybook. A design system for agents is a set of strict, machine-readable contracts: what exists, what it is called, which props and states it has, which tokens it binds to, when to use it and when not to. The second can be rendered into the first mechanically; the reverse is expensive.

## Decision

Prism is built agent-first:

1. The primary artifacts are machine-readable: DTCG token JSON, YAML component specs validated by a JSON Schema, an icon registry, a haptics registry, per-stack implementation manifests.
2. Human documentation (the gallery, guides) is generated from those artifacts; it is never the source.
3. The repository ships a Claude Code skill (`agent/`) that a consuming app installs so that its agents know the vocabulary and the rules.
4. Public release is not a goal but must not be blocked: licenses stay permissive, package names are scoped, nothing private is baked in.

## Alternatives considered

- **Public library first** (docs site, Storybook, npm/SPM registries, semver guarantees): pays for an audience that does not exist yet and would slow the visual work the owner cares about.
- **Hybrid from day one**: same cost as public, deferred value.

## Consequences

- Specs must be complete enough that an agent can build a screen without asking; vagueness is a bug.
- The gallery is a derived view and may lag the spec by one build, never the other way round.
- Writing style across the repo is terse, English, and rule-shaped.

## Rules that follow

1. Any component, token or icon that is not declared in `spec/`, `tokens/` or the registries does not exist for an agent.
2. Every spec includes `usage.do` / `usage.dont`; an agent must be able to choose between two similar components from those lines alone.
3. The `agent/` skill is regenerated on every release from the specs; it is never hand-edited.
