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
  /**
   * The `accessibility` block. Its rules are prose, one entry per rule, except `traits`, which is a list;
   * the named ones are typed as the strings they are and the rest stay `unknown`.
   */
  readonly accessibility?: { readonly role?: string; readonly label?: string; readonly [rule: string]: unknown };
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

/**
 * The binding at a spec path: `<part>.<property>` under `tokens`, a state block's property included
 * (`root.pressed.background`), or a `motion.*` entry; `undefined` when the spec does not carry it.
 */
export function bindingAt(spec: ComponentSpec, path: string): Binding | undefined {
  const [head = "", ...rest] = path.split(".");
  let current: Binding | undefined = head === "motion" ? spec.motion : spec.tokens[head];
  for (const segment of rest) {
    if (current === undefined || typeof current === "string") return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * How a failure names a cell: `IconButton.yaml tokens.root.border [ghost, vivid]`, the spec path and the keys
 * asked of it. It is the Apple helper's name for the same cell (swift/Tests/DSComponentsTests/DSSpecBindings.swift,
 * `cellName`), so a failure on either stack points at the same line of the spec.
 */
export function cellName(spec: ComponentSpec, path: string, ...keys: readonly string[]): string {
  const block = path === "motion" || path.startsWith("motion.") ? path : `tokens.${path}`;
  return `${spec.name}.yaml ${block}${keys.length === 0 ? "" : ` [${keys.join(", ")}]`}`;
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
