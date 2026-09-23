/// <reference types="node" />
/**
 * Ships the component contracts inside the package (critic C-14's second half, roadmap P3-4): the
 * repository's `spec/` is copied to `spec/` here, so an agent in a consuming app reads
 * `node_modules/@iiiivaska/prism-react/spec/components/<Name>.yaml`, the path `agent/SKILL.md` gives,
 * and the specs it reads are the ones this build implements. The copy is build output: `.gitignore`
 * keeps it out of the repository, and `files` and the `./spec/*` export publish it.
 *
 * It is the whole `spec/`, not this package's own layers, and it is the only copy: an app that installs
 * `@iiiivaska/prism-charts` as well finds the chart contracts here too, so the two packages can never
 * carry two versions of one contract. `@iiiivaska/prism-charts` therefore ships no `spec/` and lists
 * none in `files`, and the skill names this one path.
 *
 * `spec/icons/` stays out: the registry pairs every id with its SF Symbol name, and no SF Symbol name
 * ships in a web package (ADR-0013 rule 5, `icons:validate`). Web code reaches the registry through the
 * package's `iconRegistry` export, which carries Phosphor names only.
 *
 *   node scripts/copy-spec.ts
 */
import { cpSync, rmSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const source = resolve(packageRoot, "..", "..", "..", "spec");
const target = join(packageRoot, "spec");

/** Top-level folders of spec/ that the web package does not ship. */
export const EXCLUDED = ["icons"];

export function copySpec(): void {
  // The whole folder goes first, so a contract removed from spec/, or a sync conflict copy of one
  // ("SCHEMA 2.md"), never survives into the published copy.
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, {
    recursive: true,
    filter: (path) => !EXCLUDED.includes(relative(source, path).split(sep)[0] ?? ""),
  });
}

if (import.meta.main) {
  copySpec();
  console.log(`prism-react: copied spec/ into the package, without ${EXCLUDED.join(", ")}/`);
}
