/// <reference types="node" />
/**
 * Reading `spec/components/<Name>.yaml` for the tests, with the binding-matrix grammar of
 * spec/SCHEMA.md: under a property, one axis per level; `default` is the fallback cell; a value with no
 * cell and no `default` is not set.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { packageRoot } from "../scripts/build-styles.ts";

export const repositoryRoot = join(packageRoot, "..", "..", "..");

export type Binding = string | { readonly [key: string]: Binding };

export interface ComponentSpec {
  readonly name: string;
  readonly specVersion: number;
  readonly props: readonly { readonly name: string; readonly values?: readonly string[]; readonly default?: unknown }[];
  readonly tokens: { readonly [part: string]: { readonly [property: string]: Binding } };
  readonly motion?: Readonly<Record<string, string>>;
  readonly behavior?: readonly string[];
  readonly examples: readonly { readonly id: string; readonly props: Readonly<Record<string, unknown>> }[];
}

export function loadSpec(name: string): ComponentSpec {
  return parse(readFileSync(join(repositoryRoot, "spec", "components", `${name}.yaml`), "utf8")) as ComponentSpec;
}

/** The cell a key sequence reaches, falling back to `default` at each level; `undefined` when unset. */
export function cell(binding: Binding | undefined, ...keys: readonly string[]): string | undefined {
  let current: Binding | undefined = binding;
  for (const key of keys) {
    if (current === undefined || typeof current === "string") return current;
    current = current[key] ?? current["default"];
  }
  return typeof current === "string" ? current : undefined;
}

/** A public token path's custom property (ARCHITECTURE §8): `color.bg.page` → `--ds-color-bg-page`. */
export function cssVariable(path: string): string {
  const segments = path.split(".");
  const rest = segments[0] === "comp" ? segments.slice(1) : segments;
  return `--ds-${rest.join("-")}`;
}

/** The values of an enum prop. */
export function propValues(spec: ComponentSpec, prop: string): readonly string[] {
  return spec.props.find((candidate) => candidate.name === prop)?.values ?? [];
}
