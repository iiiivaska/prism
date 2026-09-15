# ADR-0020: Brand model: what a brand overrides and how brands reach each stack

- Status: accepted
- Date: 2026-09-15
- Decision record entry: docs/decisions.md #20
- Amends: ADR-0002 (rule 2, the semantic whitelist; where consumer brand folders live), ADR-0003 (the `[data-ds-brand]` scope of `tokens.css`), ADR-0004 (decision 3, the `brand` and `platform` rows; rule 3), ADR-0007 (decision 4: series slots follow the brand, status does not), ADR-0008 (decision 2: Native faces per platform, Inter self-hosted on web), ADR-0024 (§4.1: `app.prism.alpha` is the one functional key an alias declares)

## Context

ADR-0002 lets a brand override primitives "and, when needed, a small set of semantic bindings", and lets apps keep brand folders in their own repositories. ADR-0004 runs `brand` first in the resolver and gives the `platform` modifier the Native font slots. Nobody checked these mechanics against the files until two reviews:

- the Phase 1 build design: `tools/tokens/ARCHITECTURE.md` §1 rows S9 and S12, §16.3 decisions O2 and O5;
- the research critic: `docs/research/critic.md` findings C-03, C-05, R-02, C-27, G-16 and R-05.

Two sibling ADRs leave questions to this one:

- ADR-0019: the brand attribute and a `brand` prop on `<Theme>` (§1, §4.4);
- ADR-0024: which `ref` ids a brand owns (§9), and whether `sys` may hold literals (§7.1 and Consequences).

A third, ADR-0023 (Consequences), hands the literal question to ADR-0024. Without an answer here, nobody decides it.

The facts below were re-checked on 2026-09-15 in the working tree and against the installed tools.

**A `sys.*` whitelist cannot work.**

- `brands/README.md:17` lets a brand write four ids: `sys.color.bg.page`, `bg.fill.accent`, `text.accent` and `text.on-accent`. ADR-0002 rule 2 (`docs/adr/0002-meta-system-with-brand-layer.md:37`) and ADR-0004 rule 3 (`docs/adr/0004-dtcg-tokens-style-dictionary.md:47`) repeat the whitelist.
- `brand` resolves before `colorScheme` (`tokens/prism.resolver.json:85`, `:88`). Both base scheme files write all four ids:
  - light: `tokens/sys/color/light.tokens.json:7`, `:51`, `:126`, `:143`;
  - dark: `dark.tokens.json:7`, `:69`, `:207`, `:223`.
- In DTCG Resolver 2025.10 the last occurrence wins (§4.1.4). So a brand's value for these ids is always overwritten, and the double write breaks write-set disjointness (ADR-0004 rule 2, restated by ADR-0024 §9). ARCHITECTURE §5.6 already rejects such dead writes.
- A `brand` context holds one value per id, but all four ids differ between light and dark. Even in the last position, a brand could not express them.

**The brand contract names paths that do not exist** (C-03):

- `brands/README.md:9` lists an 11-step neutral ramp. The file has 15 steps (`tokens/ref/color.palette.tokens.json:6-188`).
- The accent ramp runs to 950 (`:311`), not 900.
- Status lives under `ref.color.status.<name>.<use>` and uses `danger` (`:324`, `:425`).
- `tokens/ref/gradient.tokens.json` has eight named gradients, not four numbered ones.
- `ref.font.preset` and `ref.radius.profile` exist nowhere.
- The reference brand writes `ref.brand.type-scale`, a path the `ref` set lacks (`brands/prism/brand.tokens.json:4-6`, S8).
- Nothing enforces "cannot change spacing, elevation, motion or materials" (`brands/README.md:19`): ARCHITECTURE §5.6 grants the brand modifier all of `ref.**`.
- The reference brand cannot write anything either. `prism-native` layers `brands/prism/brand.tokens.json` before its own file (`prism.resolver.json:37`), so an id the reference brand writes is written in every brand context, and the `ref` set's declaration of that id becomes a dead write (ARCHITECTURE §5.6).

**Semantic tints hard-code the reference hues** (R-02). `tokens/sys/**` holds 72 color literals:

- 35 are pure white and 4 pure black.
- 15 are the ink `[0.0549, 0.0588, 0.0706]` (#0E0F12). It lies ΔE2000 0.22 from `ref.color.neutral.950`, computed with the repository's Color.js 0.5.2; `docs/research/visual-dna.md:244` calls it "one hair off step 950".
- 6 copy accent steps:
  - light `bg.tint.accent` and `accent.subtle` are `accent.500` at 12 %, and `accent.glow` is `accent.400` at 40 % (`light.tokens.json:79-90`, `:237-260`);
  - dark uses `accent.500` at 14 % and 40 % (`dark.tokens.json:96-107`, `:324-346`).
- 4 dark status tints copy their status colors at 10 % (`:109-157`).
- The 10 accent and status copies match their `ref` steps to ΔE2000 ≤ 0.02 (4-decimal sRGB rounding) and give the same hex.
- 3 are smoked-glass fills with a hue of their own: #0A0C08 at OKLCH hue 128.7 and #101410 at hue 145.1.
- 5 are dark reduced-transparency fills (#1C1C1F, #232426, #2A2B2E at 92 %). They are composites that no ramp step names.

A brand that changes its accent therefore keeps orange tints and glows.

**Other literals in `sys`** (the second half of R-02, `critic.md:436`):

- Besides colors, `sys` holds literal dimensions, numbers, durations, springs and stroke styles: the density gaps, sizes and line height, the reduced motion values, `z`, `icon` and `chart` numbers, `stroke`, and the interaction and blur flags.
- No brand owns any of those values.
- Every `sys` token whose value a brand does own already aliases `ref`: `sys.radius.*` (`tokens/sys/base.tokens.json`), `sys.font.*` (the platform files), and ADR-0024's `sys.gradient.vivid.*` and `sys.type.*` roles. The brand type scale reaches typography sizes through the build, not through aliases (ARCHITECTURE §5.5).

The tools constrain how the alpha can be expressed:

- Style Dictionary 5.5.3 has no handling of DTCG JSON-Pointer `$ref` inside values: `lib/` contains no `$ref`.
- Terrazzo 2.7.1 resolves `$ref` by looking it up in the document being parsed (`@terrazzo/parser/dist/parse/process.js:10-66`).
- ARCHITECTURE §5.4 folds functional `$extensions` keys into the value.
- ADR-0024 §4.1 adds that "an alias never declares a folded key of its own" (`extension/alias-override`), and expects an ADR that needs such a key on an alias to amend it.
- Tokens Studio has a native form: `$extensions["studio.tokens"].modify = { type: "alpha", value, space, format }` (`@tokens-studio/types` 0.5.2, `Modifier.d.ts`, `SingleGenericToken.d.ts`). Its documentation titles color modifiers "Modified Colors (pro)" (docs.tokens.studio, Manage tokens › Color › Modified): they need the paid plan. The flavor's multi-mode themes need that plan already (ADR-0004, ARCHITECTURE §9.9).

**Fonts** (C-05, S12, R-05):

- `brands/prism-native/brand.tokens.json:6-9` writes one stack per slot for every platform, with SF names first. Both platform files alias `ref.font.*` identically (`tokens/sys/platform/apple.tokens.json:4-16`, `web.tokens.json:4-15`). Native web CSS would therefore list SF Pro before Inter.
  - That goes against ADR-0008 decision 2 (Inter and `ui-monospace` on the web).
  - An SF name in a web stack can only match a copy of SF installed from Apple's download, whose licence allows mock-ups only (`docs/research/arch-apple.md:330`). On every other client it matches nothing.
- The Signature mono stack also names `"SF Mono"` and `"Menlo"` (`tokens/ref/typography.tokens.json:23-30`).
- ARCHITECTURE §9.7.5 builds `DSBrand` faces from each brand's default permutation, whose platform is `web` (`prism.resolver.json:47`).
- Type roles alias the slot tokens (`typography.tokens.json:39`) and carry `app.prism.slot`. Swift already takes families from `DSBrand` by slot (ARCHITECTURE §7.7).
- Native loads Inter from Google Fonts (`licenses/inventory.json:8`, `brands/prism-native/brand.json:7`, `docs/research/fonts-facts.md:163`, `:268`). That is a problem three ways:
  - Google serves Inter 4.001, while upstream 4.1 overhauled the Cyrillic (`fonts-facts.md:211`).
  - Electron apps launch offline (ADR-0003).
  - On 20 January 2022 the Munich Regional Court held (3 O 17493/20) that loading Google Fonts from Google's servers without consent violates the GDPR, and awarded damages under Art. 82 (summary: activemind.legal, "Ruling Google Fonts").

**Apple** (O5, G-16):

- `DSComponents` and `DSCharts` depend on `DSCore`, which depends on Prism's own `DSTokens` target (`Package.swift:43-56`). A consumer cannot swap in its own `DSTokens`. Package traits are additive compile-time flags, not a brand switch (`docs/research/arch-apple.md:270`). So on Apple a brand is a runtime value.
- Two parts of the design limit brands today:
  - ARCHITECTURE §5.7 item 6 fails any brand that changes more than fonts, because the committed Swift output holds only the default brand's values;
  - §9.7.3 makes colors context-free statics from one catalog.
- ADR-0019 §6 names Swift colors `DSColor.bgSurface` and colorsets `color-bg-surface`, and rule 13 there checks quoted names against `manifest.json`.
- Namespaced colorsets work (scratch probes, Xcode 26.6). The test catalog had one folder per brand (`prism/`, `acme/`), each marked `"provides-namespace": true`, with universal, dark, high-contrast and `watch` entries:
  - actool 26.6 compiles it for `iphoneos`, `macosx` and `watchos` with `--warnings --errors` and prints no warning;
  - `assetutil --info` lists `prism/color-bg-page` and `acme/color-bg-page` on all three;
  - on macOS 26, `NSColor(named: "prism/color-bg-page", bundle:)` resolves the Any and Dark values, and SwiftUI `Color("acme/color-bg-page", bundle:).resolve(in:)` follows the environment's color scheme;
  - on the iOS 26.5 simulator, `UIColor(named:in:compatibleWith:)` plus `resolvedColor(with:)` returns each namespace's light, dark and dark + high-contrast values;
  - on the watchOS 26.5 simulator, `Color(name, bundle:).resolve(in:)` returns each namespace's `watch` entry;
  - the name without a namespace returns nil on every platform.

**Web** (the brand part of C-04):

- ADR-0003 (`docs/adr/0003-two-implementations-swiftui-react.md:24`) and arch-web (`docs/research/arch-web.md:122`, `:126`) scope `tokens.css` by `[data-ds-brand]`.
- ARCHITECTURE §9.1 already emits one `tokens.css` per brand, with no brand attribute. Every `--ds-*` name is brand-invariant: `tailwind.css`, `motion.css` and `manifest.json` are asserted identical across brands (§5.7, §9.0).
- A nested brand scope would have to redeclare every `var()` chain, because a custom property inherits its computed value. This is the rescope problem of §9.2.
- ADR-0019 §4.2 has canvas code call `resolveTokens(readContext(element))`, a function each `<brand>/tokens.ts` exports.

**Consumer brands and the watch** (G-16):

- `@iiiivaska/prism-tools` is private (`tools/package.json:4`).
- Brand contexts are listed by hand (`prism.resolver.json:34-40`).
- Every consumer is one of the owner's apps (ADR-0001).
- Style Dictionary's multi-brand example has global tokens alias brand-owned and platform-owned tokens (`docs/research/arch-tokens.md:181`). This ADR adopts that pattern.
- The watch half of G-16 is already designed. ARCHITECTURE §2 and §9.8 merge `apple` and `watch` into one `DSTokens` with `#if os(watchOS)` and a `watch` colorset entry that carries the dark value. ADR-0019 §2 fixes watchOS to dark. The resolver still enumerates watch × light permutations; no output reads their colors, so they cost build time only.

**Series and status** (C-27):

- `ref.color.series.light.2` and `series.dark.2` are literals with exactly the components of `accent.700` and `accent.500` (`color.palette.tokens.json:588-598`, `:662-672`; `visual-dna.md:257`, `:259`). `chart.now` aliases `accent.500`.
- `series.dark.1` has exactly the components of `neutral.0`; `series.light.1` lies ΔE2000 0.23 from `neutral.950`.
- Slot 3 has exactly the components of `status.info.dot-light` (light) and `status.info.mark-dark` (dark).
- Status is "a fixed reserved scale, never ... themed" (`docs/research/dataviz-design.md:172`; `visual-dna.md:268` agrees).
- Series slots are to snap to the brand ramp and be re-validated (`dataviz-design.md:211`). Whether slot 1 follows the accent is left open (`:346`).

## Decision

### 1. A brand writes allowlisted `ref.*` ids and nothing else

A brand is one context of the `brand` modifier. Its documents may declare only ids that the `ref` set already declares **and** that match `BRAND_OVERRIDABLE` in `tools/tokens/config.ts`. `BRAND_OVERRIDABLE` is the `brand` row of `OWNERSHIP` (ADR-0024 §9): it narrows that row from `ref.**`, and the ownership check enforces it.

| Group | Ids | Count | Value rule |
|-------|-----|-------|------------|
| Neutral ramp | `ref.color.neutral.{0,50,100,150,200,300,400,500,600,700,800,850,900,950,1000}` | 15 | opaque color literal |
| Accent ramp | `ref.color.accent.{50,100,200,300,400,500,600,700,800,900,950}` | 11 | opaque color literal |
| Semantic slots | `ref.color.slot.{light,dark}.{bg-page,bg-fill-accent,text-on-accent,text-accent}` (new) | 8 | alias only (§2) |
| Chart series | `ref.color.series.{light,dark}.{1…n}` | 12 today | opaque color literal, or alias of a step of the brand's neutral or accent ramp (§4) |
| Vivid gradients | `ref.gradient.vivid.{orchid,olive,rose,sky,ember-night,plum-dusk,forest-moss,navy-cyan}` | 8 | whole token, extensions included; keeps its `app.prism.scheme` |
| Font slots, web | `ref.font.{ui,display,mono}` | 3 | §5 |
| Font slots, Apple | `ref.font.apple.{ui,display,mono}` (new) | 3 | §5 |
| Type scale | `ref.type.scale` (ADR-0024 §8) | 1 | positive number; ADR-0021 may bound it |
| Radius steps | `ref.radius.{1,2,…,10}` | 10 | non-decreasing with the step number |

- **System-owned `ref`.** Every other `ref.*` id is system-owned. That covers status colors, the smoked-glass tints of §3, space, size, border, blur, opacity, shadow, motion, the typography role composites, `ref.radius.0` and `ref.radius.pill`.
- **No other writes.** A brand never writes `sys.*` or `comp.*` and never adds a path.
- **Whole-token overrides.** The DTCG merge replaces tokens wholesale (ARCHITECTURE §5.3), so a brand overrides a whole token and must restate the token's functional extensions (a gradient's `angle`, `grain`, `scheme` and `bloom`; a font's `opsz`).
- **Gradient names.** The eight gradient ids keep the reference brand's names whatever a brand puts in them. Specs and components bind the `sys.gradient.vivid.1…4` slots (ADR-0024 §6), never these names.
- **Radius and type scale.** Radius changes step by step; there is no "profile" token. The type scale is the one number ADR-0008 decision 1 allows.
- **The reference brand declares nothing.** Its values are `tokens/ref/*`, and any write would be a dead write (Context). `brands/prism/brand.tokens.json` holds no tokens.
- **One list.** `BRAND_OVERRIDABLE` is the only allowlist, and `brands/README.md` reproduces it.

### 2. Brand-tunable semantics are `ref.color.slot.*` tokens

The whitelist of ADR-0002 rule 2 becomes eight `ref` tokens, four per base scheme. The scheme files alias them:

| Slot | Aliased by, in the base scheme file | Must alias a step of | Light default | Dark default |
|------|-------------------------------------|----------------------|---------------|--------------|
| `bg-page` | `sys.color.bg.page` | `ref.color.neutral.*` | `neutral.100` | `neutral.950` |
| `bg-fill-accent` | `sys.color.bg.fill.accent` | `ref.color.accent.*` | `accent.300` | `accent.500` |
| `text-on-accent` | `sys.color.text.on-accent` | `ref.color.neutral.*` | `neutral.950` | `neutral.950` |
| `text-accent` | `sys.color.text.accent` | `ref.color.accent.*` | `accent.800` | `accent.500` |

- **Naming.** The id is `ref.color.slot.<scheme>.<name>`, where `<name>` is the id after `sys.color.` with dots replaced by dashes.
- **Mapping.** `tokens/sys/color/<scheme>.tokens.json` makes that `sys` id a whole-value alias of its scheme's slot. No other token aliases a slot.
- **Values.** A slot is a whole-value alias of a step in the group the table names, and carries no `app.prism.alpha`.
- **Defaults.** The defaults live in `tokens/ref/color.palette.tokens.json`. They are the reference brand's current bindings, so nothing renders differently.
- **Variant deltas.** Increased-contrast and reduced-transparency deltas stay system-owned: `light-increased-contrast` still sets `sys.color.text.accent` to `accent.900`.
- **Guard.** The per-brand contrast test (ADR-0011) guards the slots: every slot sits in a text pair of `tokens/contrast-pairs.json`.

### 3. Every semantic color is an alias; tints use `app.prism.alpha`

**What a semantic color may be.** Every color value in `tokens/sys/**`, whole tokens and composite sub-values alike, is one of:

- a whole-value alias of a `ref.color.*` or `sys.color.*` token;
- such an alias with `$extensions["app.prism"].alpha`;
- a literal of pure white or pure black: `"colorSpace": "srgb"`, components `[1, 1, 1]` or `[0, 0, 0]`, any alpha.

A hue can therefore come only from `ref`: from an id a brand owns, or from a system-owned one such as status or smoke. `comp` colors are whole-value aliases of `sys` already (ADR-0024 §5.1).

**How `app.prism.alpha` works.**

- It is a number in [0, 1].
- It is allowed only on a `color` token in `tokens/sys/**` whose `$value` is a whole-value alias, and the target must resolve to an opaque color (alpha 1). It is not allowed on `ref` or `comp` tokens. Components get translucent colors only through `sys` (ADR-0024 §5.1), as they get springs only through `sys` (ADR-0023 §4).
- It replaces the alpha and nothing else.
- The normalizer applies it over the resolved target (ARCHITECTURE §5.4). Aliases of the token inherit the translucent result. They cannot add an alpha of their own, because their target is not opaque.
- **Amends ADR-0024 §4.1.** `alpha` is the one functional key declared on an alias, so it is exempt from `extension/alias-override` and invalid on a literal. It overrides nothing: its target never carries the key.

**Rendering.** Formats render an alpha token as a literal, never as `var()` or a Swift alias of its target:

- CSS: `oklch(L C H / A)`, or `rgb(R G B / A)` for an sRGB target, with a P3 twin when the target has one;
- Swift and colorsets: the target's Display P3 components with alpha `A`;
- TypeScript: `{ css, cssP3, hex, alpha }`;
- Figma: the resolved value, with its alpha (ADR-0024 §12);
- Tokens Studio: the alias, plus `"studio.tokens": { "modify": { "type": "alpha", "value": "<A>", "space": "srgb", "format": "hex" } }`. The flavor keeps aliases (ARCHITECTURE §9.9), so brand themes still re-color the tint. Color modifiers need Tokens Studio's paid plan, which its themes already need; V3 checks the import.

The contrast tool composites it like any overlay (ARCHITECTURE §10).

**Migration.** 33 of the 72 literals become aliases; the token work lists every id:

- accent tints, subtles and glows alias the accent step they copy;
- dark status tints alias their status step;
- ink overlays alias `neutral.950`;
- the smoked-glass fills alias new system-owned `ref.color.smoke.light|dark`;
- the dark reduced-transparency fills alias neutral steps at 0.92. ADR-0022 may choose other steps or another fallback (visual-dna B21).

The 39 white and black literals stay. The `ref.opacity.*` steps are not linked to these alphas (Alternatives). All but `disabled` and `dimmed-row` are unreferenced before and after this change. P1-1's `ref` review deletes them unless ADR-0022 wires the glass steps.

**Other literals in `sys`** (R-02, second half). The rule follows reach, not tier. In `tokens/sys/**`:

- every color value follows the list above;
- every `fontFamily` value, whole token or typography sub-value, aliases a `ref.font.*` or `sys.font.*` token;
- every `gradient` token and every `sys.radius.*` token is a whole-value alias;
- every other value may be a literal: density gaps, sizes and line height, motion durations and springs, `z`, `icon` and `chart` numbers, stroke styles, flags, and typography sizes.

No brand owns the literal values (§1), so a `ref` step for them would add a name and no reach. Typography sizes still follow the brand, because the build multiplies every typography value by the permutation's `ref.type.scale` (ARCHITECTURE §5.5). ADR-0024 §7's control heights and ADR-0023 §8's reduced springs follow this rule as written. A category that becomes brand-overridable later (rule 15) joins the alias list in the same change.

### 4. Chart series follow the brand; status does not

- **Series belong to the brand.** `ref.color.series.*` is brand-overridable.
- **Ramp-derived slots are aliases.** Where a default series slot is a step of a brand ramp, it is written as an alias of that step, so a new accent or neutral reaches the chart palette:
  - `series.light.1` = `{ref.color.neutral.950}` (ΔE2000 0.23 from the current literal);
  - `series.light.2` = `{ref.color.accent.700}`;
  - `series.dark.1` = `{ref.color.neutral.0}`;
  - `series.dark.2` = `{ref.color.accent.500}`.

  All except `light.1` keep exactly the same value. Slots 3 to 6 stay literals. Slot 3 copies a status hue, and status is system-owned (below).
- **Per-brand validation.** For every scheme, every brand's resolved series must pass the series pairs of `tokens/contrast-pairs.json`. Once `tools/viz-validate` exists (critic G-10), its checks also run per brand, including `chart.now` against every slot. If a brand's accent collides with another slot, the brand overrides that slot; the build never picks hues.
- **Status is fixed.** `ref.color.status.*` is system-owned: status is a fixed, reserved scale on every brand. A product that needs other status hues changes Prism, not a brand.
- **Out of scope.** The slot count and reseeding stay with critic C-10.

### 5. Font slots per platform; the Native preset

**Web stack.** `ref.font.<slot>` is the slot's web stack. It may contain only two kinds of name:

- families the brand serves as files on the web, listed in its own `brand.json` with `web` in `platforms`;
- CSS generic keywords (the ARCHITECTURE §7.11 list).

No `SF …`, `New York`, `Menlo`, `-apple-system`, `BlinkMacSystemFont` or other locally installed family reaches web output.

**Apple face.** `ref.font.apple.<slot>` (new) is the slot's Apple face: exactly one entry. It is either a family the brand bundles on Apple (listed in its own `brand.json` with `apple` in `platforms`) or one of these keywords:

| Keyword | SwiftUI design |
|---------|----------------|
| `system-ui` | `.default` (SF Pro) |
| `ui-rounded` | `.rounded` (SF Rounded) |
| `ui-monospace` | `.monospaced` (SF Mono) |
| `ui-serif` | `.serif` (New York) |

**Fonts are per brand.** `brand.json` `fonts` lists every file the brand serves. `extends` layers token files, not `brand.json` entries.

**The `platform` modifier selects between them** (ADR-0004 decision 3):

- `sys/platform/web.tokens.json` keeps `sys.font.<slot>` = `{ref.font.<slot>}`;
- `sys/platform/apple.tokens.json` sets `sys.font.<slot>` = `{ref.font.apple.<slot>}`;
- `watch` layers on `apple`.

The web outputs (`tokens.css`, `tokens.ts`) do not emit `ref.font.apple.*`; `manifest.json` lists those ids with no CSS, Tailwind or TypeScript name.

**Roles carry a slot, not a family.**

- On the web, a role's family renders through its slot's web stack.
- On Apple, `DSBrand.faces` is built from each brand's `sys.font.*` at `platform=apple`, not from the default permutation, together with `brand.json`.
- `DSFontFace` gains `system: DSSystemFontDesign?`. DSCore renders a system face with `Font.system(size:weight:design:)` at the role's token size, not with `Font.system(style, …)` (`docs/research/arch-apple.md:468`). How that size scales with Dynamic Type is ADR-0021's decision.

**The presets become values:**

| Preset | Web stacks (ui, display; mono) | Apple faces (ui, display, mono) | Files |
|--------|--------------------------------|---------------------------------|-------|
| Signature (`prism`) | `["Onest", "system-ui", "sans-serif"]`; `["JetBrains Mono", "ui-monospace", "monospace"]` | `Onest`, `Onest`, `JetBrains Mono` | bundled on both platforms |
| Native (`prism-native`) | `["Inter", "system-ui", "sans-serif"]` (display keeps `app.prism.opsz` 32); `["ui-monospace", "monospace"]` | `system-ui`, `system-ui`, `ui-monospace` | Inter on web only |

ADR-0008 decision 2 lists SF Rounded among Native's faces. `brands/README.md` and `prism-native` use SF Pro Display for display, and the system font picks its display optical size by point size. So Native's display face is `system-ui`, and `ui-rounded` stays a brand's choice.

**The preset label.** `brand.json` `preset` stays a label, and the build checks it:

- `native` means every Apple face is a keyword, no file lists `apple`, and the ui and display web stacks start with a served family (ADR-0008 rejected "system fonts everywhere");
- `signature` means the ui and display Apple faces are bundled families, each equal to the first family of that slot's web stack and served on both platforms from one file (ADR-0008 decision 3: identical bytes).

`ref.font.preset` does not exist, and nothing switches on the preset.

**Inter is self-hosted** (R-05):

- The Native preset serves Inter 4.1 as woff2 from `@iiiivaska/prism-tokens`. The source is `InterVariable.ttf` from the upstream v4.1 release (OFL; opsz 14–32, wght 100–900), processed by the same pipeline as the Signature fonts (critic G-08, P1-8).
- No generated file, doc or skill loads fonts from a remote URL.
- ADR-0008's "no bundled files" for Native now holds on Apple only.

### 6. Web: one stylesheet per brand, no brand attribute

- **Build time.** On the web, brand stays a build-time axis (ARCHITECTURE §9.1).
- **Per-brand files.** Each repo brand gets its own `<brand>/tokens.css`, `<brand>/tokens.ts`, font files and their `@font-face` stylesheet. `tailwind.css`, `motion.css` and `manifest.json` are shared and brand-invariant.
- **Package paths.** In `@iiiivaska/prism-tokens`, `./tokens.css` and `./tokens` are the default brand's files. `./brands/<brand>/tokens.css`, `./brands/<brand>/tokens` and `./brands/<brand>/fonts.css` exist for every repo brand, the default included. The root export `.` stays brand-invariant (ADR-0019 §4). P3-2 writes the export map.
- **One brand per document.** A document loads exactly one brand's `tokens.css`. To switch brand at runtime, replace that stylesheet.
  - There is no `data-ds-brand` attribute and no nested brand scope. ADR-0019 names the other attributes.
  - `<Theme>` has no `brand` prop, and the TypeScript `TokenContext` has no brand field. A brand name cannot change which stylesheet the document loaded.
- **JavaScript values.** Canvas and visx code that needs brand values reads the table of the brand the app imported. The app hands that table to Prism; P3-2 names the API.
  - `@iiiivaska/prism-react` and `@iiiivaska/prism-charts` import no `<brand>/tokens` module and no brand's CSS.
  - Code that needs the table and has none fails in development. It never falls back to another brand, whose colors would disagree with the loaded stylesheet.
- **One API for every brand.** Some generated shapes depend on what a token depends on: a TypeScript entry's `$value` or `$values`, `manifest.json` `dependsOn`. The build computes them from the union over all repo brands (§7 does the same for Swift).
- **Gallery.** The gallery renders each brand in its own document.

### 7. Apple: every repo brand in `DSTokens`, brand as a root context field

- **Brand in the context.** `DSTokenContext` gains `public var brand: DSBrand`, the first field, defaulting to `DSBrand.default` (`.prism`). `DSBrand` has one case per `brand` context.
- **Brand is root-only.** DSCore's `DSTheme(brand:)` sets the field once, at the root of a scene (P3-1). A nested `DSTheme` with another brand is a programming error, caught by a debug assertion. This matches the web's one brand per document (§6) and ADR-0019's root-only `<Theme>`.
- **Colorset namespaces.** Colorsets live in `Colors.xcassets/<namespace>/<name>.colorset`, one folder per color namespace, each marked `"provides-namespace": true`. A colorset keeps its ARCHITECTURE §8 name (`color-bg-surface`); the catalog looks it up as `<namespace>/<name>`.
  - A brand's namespace is its own name.
  - The exception is a brand whose colorset files are all byte-identical to those of an earlier brand in resolver order. It shares that brand's folder: `prism-native` uses `prism/`.
  - A colorset's entries (which appearances it lists) follow its own brand's values.
- **Colors.** `DSColor` becomes a struct, `DSColor(brand: DSBrand, transparency: DSTransparency)`, with one `Color` member per `sys.color.*` token.
  - A member returns `Color("<namespace>/<name>", bundle: .module)`. It picks the `-reduced-transparency` colorset when `transparency` is `.reduced` and the token has one.
  - `DSTokenSet.color` is the `DSColor` of `context.brand` and `context.transparency`. The OS resolves scheme and contrast from the catalog, as before.
  - The member names stay those of ARCHITECTURE §8 and ADR-0019 §6 (`DSColor.bgSurface`, `DSColor.textPrimary`). Only the access changes, from a static to `tokens.color.bgSurface`, because a static cannot know the brand.
  - ARCHITECTURE §9.7.3's split between a static and a `func name(_ transparency:)` disappears.
  - `DSColorToken` keeps one case per colorset name, the same for every brand. `color(_ brand:)` and `appearances(_ brand:)` take the brand.
- **Other brand-dependent values.** Gradients, radius, typography sizes after the type scale, and material fills are `DSTokenSet` members. Where repo brands differ, the member's initializer switches on `c.brand`.
  - The public shape of a member comes from the union over all repo brands: which axes it switches on, and whether a colorset has a reduced-transparency twin. Every brand has the same API.
  - A new brand can only widen a shape, and `tokens:diff` reports that as `axes-changed`.
  - Brand remains a scope in the IR, not a `RuntimeAxis`, so the one-runtime-axis rule is unchanged.
- **Fonts.** `DSTokens` resources carry the files of every brand that bundles fonts on Apple, deduplicated by SHA-256. DSCore registers the active brand's faces.
- **Invariance check.** ARCHITECTURE §5.7 item 6 no longer fails a brand that changes colors. It asserts that `motion.css` and `tailwind.css` are identical when rendered for each brand. `manifest.json` is built once from the union. Rules 1 to 3 already stop brands from reaching anything else.
- **Not decided here.** Whether components keep reading catalog colors or move to literal tables is critic R-03's question. `DSColor(brand:transparency:)` keeps its shape either way.

### 8. Where brands live and how they are built

**Route 1 (the only route in v1): brands live in Prism's repository.** Each brand lives in `brands/<name>/` and is registered as a `brand` context in `tokens/prism.resolver.json`. A brand with `extends` in `brand.json` lists its parent's sources first.

`brand.json` is validated by `tools/tokens/schema/brand.schema.json`. It holds `name`, `displayName`, `version`, `preset`, `extends`, `notes` and `fonts`. Each font entry has `family`, `file`, `version`, `sha256`, `platforms` (`apple`, `web`) and PostScript names. ADR-0008 decision 3 puts versions and hashes in the source.

To add a brand:

1. Add the brand folder: `brand.json`, a `brand.tokens.json` with allowlisted ids only, and `fonts/<family>/` files with their `OFL.txt`.
2. Add one resolver line.
3. Add a `licenses/inventory.json` entry for each new font.
4. Add a minor changeset (`context-added`).

Then `pnpm tokens:build` emits:

- the brand's web files;
- the `DSBrand` case;
- the colorset namespace;
- the font resources.

The app imports `@iiiivaska/prism-tokens/brands/<name>/tokens.css` on the web and calls `DSTheme(brand: .<name>)` on Apple. One tag carries every brand (ADR-0006), and every brand passes Prism's CI.

**Route 2 (deferred): a published CLI** that bundles the token source and tools of its version and emits the same files into another repository. It ships when the first of these happens:

- a brand must stay out of the public repository (ADR-0018);
- a brand needs its own release cadence;
- a third party consumes Prism;
- the fonts bundled into `DSTokens` exceed 2 MiB.

On Apple, route 2 needs `DSBrand` to become a struct with static members. That change is source-compatible for code that never switches over brands, which is why rule 13 exists.

### 9. Checks

Each rule below is enforced by at least one of these:

- a `source/analyze.ts` diagnostic, with a `fixtures/broken/<code>/` case;
- the IR analysis;
- a format or generator test;
- `tools/fonts`;
- `contrast:check`;
- `lint:literals`, which ADR-0019 and ADR-0023 also extend.

They run in the gated CI steps the roadmap already plans (`tokens:build`, `contrast:check`, `fonts:check`, the `apple` job and the `web` job's tests). No new job is needed.

## Alternatives considered

**Brand contract**

- **Keep the whitelist and move `brand` after `colorScheme`.** A brand context still holds one value per id, so it cannot give the four ids separate light and dark values. Both modifiers would also write the same ids, which is non-orthogonal (ADR-0004 rule 2, ADR-0024 §9).
- **Brand × scheme contexts (`acme-light`, `acme-dark`).** This doubles the brand contexts and again writes ids that `colorScheme` owns.
- **Ramps only, with a fixed step for each role (tonal-palette style).** This is the smallest contract. It drops ADR-0002's "few semantic bindings", and it forbids a common brand move: a vivid mid-tone accent tile with white text. Slots keep that option for eight tokens.
- **A slot for every semantic color.** The contract would become the whole semantic layer, about 70 ids per scheme, and brand authors would be redesigning Prism rather than re-coloring it.
- **A radius profile enum (sharp, soft, round).** It needs build-time math and a new token. Step overrides need nothing new and one monotonicity check.
- **Brand-overridable status.** It breaks the fixed status scale, multiplies per-brand validation, and lets two apps disagree on what red means.
- **Brand-neutral gradient ids (`ref.gradient.vivid.light.1…4`).** They would rename eight tokens that ADR-0024 §6 has just wired by name. The `sys` slots already keep the names out of specs.

**Alpha tints and literals**

- **Alpha through DTCG JSON Pointers** (`$ref` on `components` and `alpha`). This is standard syntax, but Style Dictionary 5.5.3 does not resolve it. Terrazzo looks the pointer up in the document being parsed, so it cannot see a brand override from another file. The color space would need its own pointer too. That is more code than folding one key.
- **CSS relative colors or `color-mix()` at runtime.** Web-only: Swift, TypeScript, Figma and the contrast tool need resolved values anyway, and the web brand is fixed at build time.
- **`app.prism.alpha` as a reference to `ref.opacity.*`.** This would keep one alpha scale, but it needs reference resolution inside `$extensions`, a new mechanism for 33 numbers.
- **Resolved `rgba()` for alpha tokens in the Tokens Studio flavor** (ADR-0024 §12's literal form). It works without the paid plan. But the flavor's sets mirror the source files, and one literal in `sys/color/light` cannot follow each brand theme's accent.
- **Require every `sys` token to alias `ref`** (the critic's first option for density). Values that no `ref` step holds, such as the reduced springs and durations, `z`, the flags and the chart numbers, would each need a new `ref` name that no brand may override. They would buy no reach. Aliasing an existing step stays allowed.

**Delivery**

- **A runtime `[data-ds-brand]` on the web** (ADR-0003, arch-web). Brand islands need every alias chain redeclared per scope. Every consumer would ship every brand's variables, and no product needs two brands on one page. Swapping the stylesheet covers runtime switching.
- **A default-brand fallback for Prism's JavaScript.** Charts would silently draw the reference palette under another brand's stylesheet.
- **A per-brand Swift build, or SPM traits.** SPM cannot replace a dependency's target, and traits are additive compile-time flags.
- **Only the default brand in `DSTokens`** (the O5 status quo). Every other app on Apple would render the reference palette, so brands would be font-only.
- **Keep `DSColor` statics and read the brand from a process-wide setting.** A global mutable brand in the nonisolated `DSTokens` needs a lock or `nonisolated(unsafe)`. Previews and tests could not show two brands.
- **`DSColor` statics as a `ShapeStyle` that reads the brand from the environment.** They would keep static access, but APIs that take a `Color` (`shadow(color:)`, `Gradient.Stop`, `Canvas` shading) could not use them, and nobody has probed the approach.
- **Swift colors from literal tables instead of a namespaced catalog.** This loses the colors the OS resolves from the catalog (dark, high contrast) and the watch entries. It is critic R-03's question, and brands do not need it.
- **The published CLI now (route 2 at once).** It adds a second public API, a Node CLI plus a bundled snapshot of the source, for consumers who are all the owner's apps.

**Fonts**

- **Apple faces only in `brand.json`.** Families would live in two places, and the `platform` modifier would lose the job ADR-0004 gives it.
- **One stack for every platform** (the status quo). It puts SF names into web CSS (C-05).
- **Native web on `system-ui` alone.** ADR-0008 rejected "system fonts everywhere" as inconsistent on non-Apple clients.
- **Inter from Google Fonts** (the research recommendation, `fonts-facts.md:268`). Offline Electron launches fall back to another font, remote loading was ruled a GDPR violation, and Google's build lags upstream Cyrillic by one release.

## Consequences

**Easier.**

- A brand is data only.
- Re-coloring now reaches every tint, glow, overlay, series slot and gradient, and the per-brand contrast test proves it.
- A web app changes one import.
- An Apple app passes one enum case.
- Every rule is a build diagnostic or a named test, so a broken brand fails with file and line.
- R-02 is closed for every token type, not only colors.

**Harder.**

- Each brand with distinct colors adds one colorset namespace to `DSTokens`, plus a few switch arms.
- The Swift color API changes from statics to `tokens.color.<name>`. This lands in P1-5, before any component exists, so nothing migrates. The skill's examples change with it.
- A brand that makes a token depend on a new axis widens that token's shape for every brand (`axes-changed`).
- Each brand adds 216 permutations, about 1.4 s of build (ARCHITECTURE §13).
- Every Apple app ships the fonts of every Signature brand, about 380 KB per brand today, capped at 2 MiB.
- Brand folders are public.
- Native web consumers download Inter from the package (a woff2 of a few hundred KB) instead of a CDN.
- The Tokens Studio flavor's 33 alpha tokens need Tokens Studio's paid plan.

**Values that move.**

- Ink overlays shift by ΔE2000 0.22 and `series.light.1` by 0.23 (#0E0F12 → #0D0E11).
- The dark reduced-transparency fills shift by up to ΔE2000 2.2, unless ADR-0022 picks other steps.
- Everything else keeps its hex; the accent and status tints move by at most ΔE2000 0.02 of rounding.

**Must do.** Carry out the token work below and update:

- ARCHITECTURE, `tokens/README.md`, `tools/tokens/README.md` and `brands/README.md`;
- the roadmap and the agent skill;
- the licence inventory and notices;
- the status lines of the amended ADRs, ADR-0024 included;
- the superseded research notes.

## Rules that follow

1. A brand document declares only ids that match `BRAND_OVERRIDABLE` (the `brand` row of `OWNERSHIP`) and that the `ref` set declares (`brand/not-overridable`, `brand/unknown-path`). `brands/prism/brand.tokens.json` declares no tokens (the dead-write check).
2. Every `brands/<name>/` folder is a `brand` context and every context has a folder. A brand's `extends` equals its context's parent layering (`brand/registration`).
3. A brand's values follow the §1 table (`brand/value`):
   - its literal colors are opaque;
   - its series aliases target a step of its own neutral or accent ramp;
   - `ref.type.scale` is positive;
   - an overridden gradient keeps its `app.prism.scheme`; ADR-0024's `gradient/scheme-mismatch` also runs per brand.

   `ref.radius.1` to `ref.radius.10` never decrease (`brand/radius-order`).
4. Each `ref.color.slot.<scheme>.<name>` is a whole-value alias, without `alpha`, of a step in its group. Exactly the `sys` id its name encodes aliases it, in that scheme's base file (`slot/target`, `slot/mapping`).
5. In `tokens/sys/**` (`sys/literal`):
   - every color value, whole token or composite sub-value, is an alias, an alias with `app.prism.alpha`, or a pure white or black sRGB literal;
   - every `fontFamily` value, whole token or typography sub-value, aliases a `ref.font.*` or `sys.font.*` token;
   - every `gradient` token and every `sys.radius.*` token is a whole-value alias;
   - other values may be literals.
6. `app.prism.alpha` lies in [0, 1] (Ajv schema). It sits only on a color token in `tokens/sys/**` that is a whole-value alias of an opaque color (`color/alpha-target`). It is exempt from `extension/alias-override`. Formats render such a token as a literal (format tests).
7. Font stacks follow §5:
   - web stacks hold only families that the brand's own `brand.json` serves on the web, plus CSS generic keywords (`font/web-stack`);
   - each Apple face is one family bundled on Apple or one system keyword (`font/apple-face`);
   - `preset` matches the faces and stacks as §5 defines (`font/preset`).

   No generated web file contains `SF Pro`, `SF Mono`, `SF Compact`, `New York`, `Menlo`, `-apple-system`, `BlinkMacSystemFont`, `fonts.googleapis.com`, `fonts.gstatic.com` or `data-ds-brand`, and `tokens.css` and `tokens.ts` hold no `ref.font.apple.*` entry (P1-5 format test).
8. Contexts of the `brand` modifier are sparse and are exempt from the per-context completeness check. IR invariant 1 still requires the same ids in every permutation.
9. Every brand has the same generated API. Swift member shapes, TypeScript entry shapes, reduced-transparency twins and `manifest.json` `dependsOn` come from the union over repo brands. `tailwind.css` and `motion.css` are byte-identical when rendered for each brand (IR analysis, format tests).
10. Every repo brand passes `contrast:check` in all six colorScheme contexts, and `fonts:check` for every file it serves. Once `tools/viz-validate` exists, it runs for every brand.
11. Generated Swift has no brand-dependent accessor that takes neither a brand nor a context. `DSBrand` has one case per brand context. Colorsets sit in one namespace folder per brand with distinct colors. Checks: generator tests; `verify-xcassets.sh` asserts `prism/color-text-secondary` on `iphoneos`, `macosx` and `watchos`; `ColorCatalogTests` iterates brands × colorsets on the iOS and watchOS simulators.
12. Brand is chosen once per document on the web (no attribute, no `<Theme>` prop) and once per scene on Apple. A nested `DSTheme` with another brand fails a debug assertion (P3-1 `DSCoreTests`).
13. `DSCore`, `DSComponents` and `DSCharts` never switch over `DSBrand` or use `DSBrand.allCases`; they read brand values through `DSTokenSet`. No file under `web/packages/react/src` or `web/packages/charts/src` imports a `<brand>/tokens` module or a brand's CSS. Check: `lint:literals` kind `brand` over those directories.
14. The font files bundled into `DSTokens` total at most 2 MiB, deduplicated by SHA-256 (`fonts:check`). Exceeding the budget triggers route 2; raising it needs an ADR.
15. Adding an id to `BRAND_OVERRIDABLE` or a row to the slot table requires an ADR. A snapshot test of both lists (P1-3) makes such a change visible in review.
