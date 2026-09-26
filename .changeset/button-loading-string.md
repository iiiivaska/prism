---
"@iiiivaska/prism-react": patch
---

Button 5 (`spec/components/Button.yaml`, ADR-0032): a loading Button is named by the app's `Button.loading` template filled with its label, where it used to add an English ", loading" of its own. Under Prism's English defaults the name is unchanged ("Saving, loading"), and so is every pixel. An app that sets `Button.loading` once at the root, through `<Theme strings>` on the web or `DSTheme(strings:)` in SwiftUI, now hears its own words on every loading button. In SwiftUI a localized label is looked up in the `locale` environment value before it fills the template.
