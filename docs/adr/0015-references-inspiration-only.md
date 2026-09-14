# ADR-0015: References are inspiration only

- Status: accepted
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #15

## Context

The owner's taste references are eleven Dribbble shots (Soma, Hydroflask ×2, Credit Karma mobile and desktop, CreditPros, Arvion, Vexto incident desktop and mobile, Vexto traffic desktop and mobile). The owner asked whether their Figma sources could be obtained and used.

Verified facts (2026-09-08, `docs/research/licensing-kits.md`):

- The studio is **RonDesignLab** (rondesignlab.com, Kraków, Poland, since 2015; lead designers credited as Jack R. and Stan D.), not Ronas IT (a different studio in Tallinn). It sells services only (Clutch: projects from $25,000, $150–199/h); no UI kits, templates or Figma files exist on its site, Figma Community, Gumroad or UI8. The only legitimate route to sources is a commissioned engagement with a written reuse license.
- Dribbble's Terms (17 March 2025) grant other users a license only to *access* content through the site; scraping, bulk download and bypassing bot protection are prohibited; copyright stays with the member; DMCA takedowns apply.
- Copyright protects specific expression, not ideas: layout ideas, color logic, typographic hierarchy, "glass over a map" and "one card per metric" are unprotectable methods (17 U.S.C. §102(b), Copyright Office Circular 33, *Apple v. Microsoft* "thin protection"; EU: *BSA* C-393/09, *Cofemel* C-683/17). The exact composition, illustrations, icons, photos, copy and brand marks are protectable, and since 1 May 2025 EU design law explicitly covers GUIs and animations with an automatic three-year unregistered right against copying. RonDesignLab is EU-based.
- Free Figma Community files are CC BY 4.0 (attribution required), with exceptions: Apple's kits are under Apple's own license (Apple-platform mock-ups only, no extraction, no derivatives, no web use); Atlassian's libraries are licensed only to Atlassian-integrated add-ons; Untitled UI's own license forbids use inside a distributed design system despite the CC BY badge.

## Decision

1. **Inspiration firewall.** References exist in the repository only as URLs plus written analysis in Prism's own words (`docs/research/refs-*.md`, `visual-dna.md`). No screenshots, no traced layouts, no reference imagery in the repo, gallery, docs, snapshots or any future Figma library. Downloaded images used during research stay outside the repository and are deleted after the blueprint phase.
2. **What we take**: principles with numbers (hierarchy, surface logic, spacing rhythm, chart styling, color logic, motion cues). **What we never take**: a recognizable composition of any single screen, illustrations, icons, photos, copy, client brand names (Hydro Flask, Credit Karma, The Credit Pros) or the studio's name in samples.
3. **Reference-distance review** before every release: no Prism gallery screen or direction-board screen may be recognizably the same composition as a reference shot.
4. **Structural checklists** may come from permissively licensed sources with attribution: Figma's Simple Design System, Material 3 Design Kit, Primer Web, Polaris UI Kit, community shadcn and Radix kits, the three CC BY glass dashboard kits, and Adobe's `spectrum-design-data` (Apache-2.0) for component schemas. Untitled UI is inventory-only; Apple kits are read for Apple mock-ups only; Atlassian is read-only.
5. **Provenance ledger**: `licenses/inventory.json` lists every external asset, kit or library with its SPDX id, source, license URL, attribution string and `permitted_use`; `THIRD_PARTY_NOTICES.md` is generated from it; CI fails if a packaged asset's `permitted_use` is not `adapt-with-attribution` or `own`. `docs/research/references.json` lists the reference shots with `allowed_use: "principles-only"` so agents cannot misread them as assets.
6. **No Dribbble tooling.** Nothing in `tools/` or the agent skill fetches from dribbble.com.

## Alternatives considered

- **Buying a kit**: none exists from this studio; other studios' kits carry licenses that forbid repackaging into a distributed design system.
- **Commissioning RonDesignLab**: legitimate but expensive and unnecessary for a meta-system; kept as an option with a note that the contract must assign reuse rights.

## Consequences

- The visual DNA must be good enough to reproduce the *feel* without the *pictures*; that is why the research phase analyzed every shot forensically.
- A legal review checkpoint is scheduled before any public release (Apple EULA reading for a cross-platform system, Untitled UI dual-license question, EU unregistered-design exposure).

## Rules that follow

1. No file from a reference shot is ever committed.
2. Every third-party asset enters through `licenses/inventory.json` first.
3. Sample data and fixtures use invented product and company names.
