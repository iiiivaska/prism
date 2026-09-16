/**
 * The generated web-runtime table, widened so the runtime can iterate over every axis (ADR-0019 §3).
 *
 * Nothing here spells an attribute name, a value or a media query: they all come from
 * `generated/runtime.ts`, which `tools/tokens` derives from `WEB_RUNTIME` in `tools/tokens/config.ts`
 * (ADR-0019 rule 1). That is why `lint:literals` kind `runtime` needs no exception for this package.
 */
import { webRuntime, type RuntimeAxis, type TokenContext } from "../generated/runtime.ts";

/** One row of the table: the attribute, the closed values (the first is the default), whether the axis nests, and its one media fallback. */
export interface AxisSpec {
  readonly attribute: string;
  readonly values: readonly string[];
  readonly nestable: boolean;
  readonly media: { readonly value: string; readonly query: string };
}

/** The generated table, widened from its literal types. */
export const specs: Readonly<Record<RuntimeAxis, AxisSpec>> = webRuntime;

/** Every axis, in the table's order; `rootAttributes` emits its attributes in this order. */
export const axes: readonly RuntimeAxis[] = Object.keys(webRuntime) as RuntimeAxis[];

/** The axes that resolve per element rather than on `<html>` only (ADR-0019 §1 item 4): `colorScheme` and `density`. */
export type NestableAxis = {
  [A in RuntimeAxis]: (typeof webRuntime)[A]["nestable"] extends true ? A : never;
}[RuntimeAxis];

/** What `scope()` takes: the nestable axes only. */
export type ScopeContext = Partial<Pick<TokenContext, NestableAxis>>;

/**
 * Whether `value` is one of the axis's listed values (ADR-0019 §1 item 2). An absent, empty or
 * unknown value behaves exactly like no attribute, so the runtime never writes or reads it.
 */
export function isAxisValue<A extends RuntimeAxis>(axis: A, value: unknown): value is TokenContext[A] {
  return typeof value === "string" && specs[axis].values.includes(value);
}

/** The axis default: the first listed value, which is also what the resolver default holds (ADR-0019 §1 item 5). */
export function axisDefault(axis: RuntimeAxis): string {
  const [first] = specs[axis].values;
  // The generated table never has an empty value list; the fallback keeps the function total.
  return first ?? "";
}

/** Whether two contexts hold the same value on every axis. */
export function sameContext(a: TokenContext, b: TokenContext): boolean {
  for (const axis of axes) if (a[axis] !== b[axis]) return false;
  return true;
}
