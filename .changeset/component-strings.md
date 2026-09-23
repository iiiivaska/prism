---
"@iiiivaska/prism-tokens": patch
"@iiiivaska/prism-react": patch
---

Component-owned strings (ADR-0032): the words a component adds to what its caller passed are templates the app replaces once at the root, never constants inside a component. The table has four keys, listed in `spec/strings.yaml` with Prism's English defaults: `Badge.count` (`"{count} {label}"`), `Badge.overflow` (`"{max}+"`), `Button.loading` and `Chip.remove`. On the web, `@iiiivaska/prism-tokens` exports `defaultStrings` and the `StringKey` and `StringsTable` types, and `./react` adds a `strings` prop on `<Theme>`, merged key by key over the defaults, and `useStrings()` to read the result; `@iiiivaska/prism-react` re-exports all three. In SwiftUI, DSCore adds `DSStrings`, `DSTheme(strings:)` and `\.dsStrings`. The table is root-only on both stacks: a nested theme passes the enclosing table through, whatever it is handed. An app that localises sets its table there and sets the same language as its locale, because the numbers the templates carry are formatted in that locale. Badge is the first component that reads the table. Button still speaks its own "loading" word and does not read `Button.loading` yet.
