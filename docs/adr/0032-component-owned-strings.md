# ADR-0032: Component-owned strings: Prism speaks the caller's words

- Status: accepted
- Date: 2026-09-22
- Decision record entry: docs/decisions.md #32
- Amends: ADR-0011 (rule 4: what names an icon-only control — the `label` the caller passes, never the icon registry's `label` field)

## Context

Prism components emit a handful of English words that no caller wrote and no catalog resolves. The critic recorded this as G-24 (`docs/research/critic.md`), and Phase 4 wave 1 would have multiplied it by four in one wave. The instances, as they stand today:

| Where | The string | State |
|---|---|---|
| `Button.yaml` behavior 3 | `"<label>, loading"` | implemented on both stacks, each carrying a "known gap" comment naming G-24 (`swift/Sources/DSComponents/Button/DSButton.swift`, `web/packages/react/src/button/Button.tsx`) |
| `Icon.yaml` accessibility | the registry entry's label key (`icon.<id>`) | 51 keys in `spec/icons/registry.json`; nothing in this tree resolves one |
| `Chip.yaml` accessibility | `"Remove <label>"` | spec only |
| `Badge.yaml` accessibility | the count plus what it counts, and the `"<max>+"` overflow mark | spec only |
| `Avatar.yaml` | the `object.user` fallback, which has no word behind it at all | spec only |
| `Text.yaml` accessibility | `"86.4 percent"` — a word for `%` | implemented; contradicts `Card.yaml` (below) |

What the repository already has, and does not have:

- **No mechanism on either stack.** `Package.swift` declares `defaultLocalization: "en"` and ships no strings; the web packages have no i18n of any kind.
- **Russian is required** by the owner's own apps (decision #8), and the owner's own apps are the consumers (decision #1). English words inside them are a visible defect, not a theoretical one.
- **The web's own primitives are already localized.** React Aria ships translated strings for elements Prism draws itself — a `Tag`'s remove button among them — so a web-only route would make the two stacks say different words for the same control, which is the one thing the spec contract exists to prevent.
- **One spec already refused to invent a word.** `Card.yaml`'s accessibility rule reads a metric's unit as its own characters, "not a word for them, because nothing here maps `%` to 'percent' and the assistive technology says it in the voice's own language". That is this decision, found once and never generalised.
- **The registry's key namespace collides with the token grammar.** A label key is `icon.<id>`, and `icon` is a spec-bindable token category (`icon.weight`), so `spec:validate`'s prose check cannot tell a label key from a token path — which is part of why nothing noticed that the keys resolve to nothing.

The critic's proposed remedy was catalogs per stack, English and Russian, plus a Russian snapshot axis. Counting the instances above after the cheap routes are taken (below) leaves **four templates**. A two-stack localisation runtime for four templates is not proportionate; being unable to say them in Russian is not acceptable either.

## Decision

1. **A Prism component never invents a user-visible word.** Every string it renders or speaks is either one the caller passed through a declared prop (`label`, `name`) or an entry of a table the app owns.
2. **Three cheaper routes come first**, in order, and a string that one of them removes is never added to the table at all:
   1. the platform carries the meaning without a word — `aria-hidden` / `accessibilityHidden`, a role, a trait;
   2. the characters are spoken as characters — `Card.yaml`'s `%`, read by the voice in the voice's own language;
   3. the name is a prop the caller already passes.
3. **What is left is one flat table per app, named `strings`.** A key is `<Component>.<name>`, the component segment spelled as the spec's `name` in PascalCase. A value is a template with `{placeholder}` names that the component fills from its own props. The whole table today:

   | Key | English default | Placeholders |
   |---|---|---|
   | `strings.Button.loading` | `"{label}, loading"` | `label` |
   | `strings.Chip.remove` | `"Remove {label}"` | `label` |
   | `strings.Badge.count` | `"{count} {label}"` | `count`, `label` |
   | `strings.Badge.overflow` | `"{max}+"` | `max` |

   A template is used only when every placeholder it declares has a value. Where one is filled from a prop the caller may leave out — `{label}` in `Badge.count`, whose `label` is required only for a badge that stands alone — and the caller left it out, the component uses no template at all and contributes its own value alone, through the locale formatter of decision 6: a count badge with no `label` inside an IconButton, whose own name already says what is counted, adds the locale-formatted count and nothing else, never `"{count} "` with the hole left in. A placeholder is filled with the component's own value and never with another template. `{count}` in `Badge.count` is the `count` prop itself, above `max` too: there the badge draws the `Badge.overflow` mark, because four digits do not fit its silhouette, but it speaks the true number. A template also does no plural selection. `{label}` goes in as the caller wrote it, so in a language whose noun changes with the number, Russian among them, where 3 and 5 take different forms of the same noun, agreement comes from the caller passing a `label` chosen for that count by the app's own plural rules, never from Prism.

4. **The key list is the contract.** `spec/strings.yaml` holds every key, its placeholders and its English default, the way `spec/haptics.yaml` holds the haptic registry; a spec names its key in `accessibility` or `behavior` and writes the English default out beside it; `spec:validate` checks that the key exists and that every placeholder a spec names is one the entry declares.
5. **Each stack ships the table as data and lets the app replace it at the root.** Apple: a `Sendable` `DSStrings` value in the SwiftUI environment beside the token context, set once per scene, English by default. Web: a `strings` prop on the ADR-0019 runtime root (`<Theme>`), shallow-merged over the exported English defaults and read through context. No bundle lookup, no catalog, no locale negotiation inside Prism, and nothing a consumer has to wait for a Prism release to get.

   What is public, settled when the two runtimes landed with Badge (roadmap P4-3): the table, the root that sets it and the reader — `DSStrings`, `DSTheme(strings:)` and `\.dsStrings` on Apple; `defaultStrings`, `<Theme strings>` and `useStrings()` on the web, from `@iiiivaska/prism-tokens` and its `./react`, all three re-exported by `@iiiivaska/prism-react`. **The template fill the components make is internal on both stacks**: `DSStrings.fill` is `package` API in DSCore, and the web's `fillTemplate` is a module of `@iiiivaska/prism-react` that no entry point exports, so no app comes to depend on it or on its lack of an escape syntax; an app that fills templates of its own does it with its own formatter. The table is a value on both stacks — a struct on Apple, and on the web `defaultStrings` and every merged table are frozen — and root-only means the same on both: a nested `DSTheme` leaves the root's table alone, and a nested `<Theme>`, which throws in development, passes the root's table through in production, whatever it is handed.
6. **Numbers, dates and measures are produced by the platform's locale formatter** — `NumberFormatter` / `Intl.NumberFormat` — never by pasting digits together. The formatter takes the locale that the platform's own locale context gives the component where it renders: SwiftUI's `locale` environment value on Apple, and React Aria's `useLocale()` on the web, which is the `I18nProvider` the app wraps its tree in, or the browser's language when there is none. Prism adds no locale setting of its own, so rule 5's "no locale negotiation" holds. An app that replaces `strings` with Russian sets the same language in that one platform place, and the digits then agree with the words.
7. **Where a stack's underlying primitive ships its own localized string for the same element**, Prism sets the string explicitly from its table, so React Aria's `Tag` remove label never reaches a Prism control and the two stacks say one word.
8. **The icon registry's `label` stays what it is** — a stable id for an entry's meaning, for the registry, the agent skill and a consumer's own catalog — and **no Prism component ever derives an accessible name from it.** An icon-only control is named by the `label` its caller passes. This is what ADR-0011 rule 4 ("every icon-only control has a registry label") is read to mean from here on; `IconButton.yaml` already read it that way, `Icon.yaml` read it the other way, and this settles which.
9. **Prism ships English defaults only.** A locale is added by the app, at the root, in one place, in the app's own translation process.

## Alternatives considered

- **Catalogs inside the packages** (the critic's remedy): `.xcstrings` in the SPM bundle, a locale map in the npm package, English and Russian, with a Russian snapshot axis. Rejected: a library bundle's catalog cannot be extended by a consumer, so every new language is a Prism release; it is two lookup mechanisms to keep in step, plus a CI check that they hold the same keys, plus a snapshot axis — all of it for four templates, and none of it needed by an app that already has a translation process.
- **React Aria's `useLocalizedStringFormatter` on the web.** It is free, real and already in the dependency tree, and it localises exactly one stack. Two stacks saying different words is the failure the spec contract exists to prevent, and no Apple equivalent exists.
- **A string prop per string on every component.** Keeps the runtime at zero, but the wording is per app, not per call site: an app with two hundred chips would pass the same sentence two hundred times or wrap every Prism component. Rejected. Strings that genuinely are per instance stay props, and already are — `label`, `name`.
- **Resolving the registry's label keys.** Fifty-one keys, a catalog per stack, for names that no component ever speaks — every icon-only control in this system carries an explicit `label` — and in a key namespace that collides with the `icon` token category. Rejected.
- **Leaving it: an English constant per stack with a G-24 comment.** This is what `DSButton.swift` and `Button.tsx` do today. It is honest about the gap and it puts English into the owner's Russian apps with no way out but a fork. Rejected as the end state; it stays as the transitional state until Button is migrated.

## Consequences

- Four templates replace an i18n runtime. A consumer localises Prism where they already localise everything else, in one place, without waiting for a release.
- An app that localises and forgets the table speaks English in those four places, and **no gate can see that** — it is a consumer-side omission, in a consumer's own tree. `agent/SKILL.md` must say so, in the same breath as the brand and the theme.
- The gallery and the snapshot matrices stay English, because Prism owns no other language. The Russian *examples* in the specs — `Chip.russian-label`, `Avatar.russian-initials`, `IconButton.label-ru` — keep doing their real job, which is layout under long Cyrillic strings, and never were a test of translation.
- Two of the four wave-1 instances disappear instead of moving: Icon emits nothing, because the registry label is not a name; Avatar emits nothing, because an avatar with no `name` is hidden and its fallback glyph is a picture, not a word.
- G-24 is answered, but not by the remedy the critic proposed; the finding's row should record this ADR rather than a catalog.
- Work this decision creates, outside the files it was made in: `spec/strings.yaml` and the `spec:validate` check of rule 4; `DSStrings` and the `<Theme strings>` prop of rule 5; `Button.yaml` and both Button implementations moving `"loading"` into the table and dropping their G-24 comments; `Text.yaml`'s `"86.4 percent"`, which contradicts `Card.yaml` and must be reconciled to rule 2.2; and the "an i18n key" wording in `spec/icons/README.md` rule 1 and `spec/icons/registry.schema.json`, which should now say what the field is for.

## Rules that follow

1. No Prism component contains a user-visible string literal. Every word it renders or speaks is a prop the caller passed or a `strings` entry the app can replace.
2. A spec that needs a word names its key, lists the placeholders it fills and writes the English default out, in `accessibility` or `behavior`; `spec:validate` checks the key and the placeholders against `spec/strings.yaml`.
3. A key is `<Component>.<name>`, the component segment spelled as the spec's `name` in PascalCase, so no key can be read as a token path.
4. A number, date or measure a component renders or speaks is produced by the platform's locale formatter, never by concatenation, in the locale of the platform's own locale context (SwiftUI's `locale` environment value, React Aria's `useLocale()`).
5. Where the platform can carry the meaning without a word, it does, and no key is added.
6. The icon registry's `label` field is never an accessible name (amends ADR-0011 rule 4).
7. Where a stack's underlying primitive ships its own localized string for an element Prism names, Prism sets that string from its table, so both stacks say one word.
8. Prism ships English defaults only; a locale is added by the app, at the root, in one place.
9. A placeholder is filled with the component's own value, never with another template, and a template never selects a plural form: a count is spoken as the true count, and a `label` that must agree with it is the caller's to choose.
10. A template is filled only when every placeholder it declares has a value. When a placeholder's optional prop is absent, the component uses no template and contributes its own value alone, through the locale formatter where it is a number (a Badge with no `label` contributes its count); it never speaks a template with an empty placeholder.
