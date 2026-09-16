// One line per brand pattern (ADR-0020 rule 13); `expect:` names the rule the line must trip.
import * as reference from "@iiiivaska/prism-tokens/tokens"; // expect: brand/token-module
import * as native from "@iiiivaska/prism-tokens/brands/prism-native/tokens"; // expect: brand/token-module
import "@iiiivaska/prism-tokens/brands/prism/tokens.css"; // expect: brand/stylesheet
import "@iiiivaska/prism-tokens/brands/prism-native/fonts.css"; // expect: brand/stylesheet

export async function load() {
  const workspace = await import("../../tokens/src/generated/prism/tokens.ts"); // expect: brand/token-module
  return [reference.table, native.table, workspace.table];
}
