/**
 * `@iiiivaska/prism-tokens/react` (ADR-0019 §4): `<Theme>` and `useTokenContext()`, re-exported by
 * `@iiiivaska/prism-react`, and the strings table `<Theme strings>` hands to components through
 * `useStrings()` (ADR-0032 decision 5). React is an optional peer dependency — the package's root export
 * imports none of this.
 *
 * The whole framework-free runtime is re-exported here, so an app needs one import for `<Theme>`,
 * `scope()` and `rootAttributes()`.
 */
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { defaultContext, type TokenContext } from "../generated/runtime.ts";
import { axes, isAxisValue, sameContext } from "../runtime/axes.ts";
import { brandTokens, setBrandTokens, type BrandTokens } from "../runtime/brand.ts";
import { readContext, watchContext } from "../runtime/context.ts";
import { isDevelopment } from "../runtime/env.ts";
import { mountRoot } from "../runtime/mount.ts";
import { defaultStrings, type StringKey, type StringsTable } from "../runtime/strings.ts";

export * from "../index.ts";

/** The server and hydration snapshot of the enclosing `<Theme>`: `defaultContext` overlaid with its props. */
const RootContext = createContext<TokenContext | null>(null);
/** The brand table the enclosing `<Theme>` was given, so a server renders per request (ADR-0020 §6). */
const BrandContext = createContext<BrandTokens | null>(null);
/** The strings table of the enclosing `<Theme>` (ADR-0032 decision 5); Prism's English defaults without one. */
const StringsContext = createContext<StringsTable>(defaultStrings);

const stringKeys = Object.keys(defaultStrings) as StringKey[];

/**
 * An app's `strings` over Prism's English defaults, key by key: a key the app gives a string replaces the
 * default, every other key keeps it. A key the table does not have is not carried, and neither is a value
 * that is not a string, so an untyped caller cannot leave a component with no template to fill. The result
 * is frozen, like `defaultStrings`, so no component can change the table another one reads.
 */
function mergeStrings(given: Partial<StringsTable> | undefined): StringsTable {
  if (given === undefined) return defaultStrings;
  const merged: Record<string, string> = {};
  for (const key of stringKeys) {
    const value: unknown = given[key];
    merged[key] = typeof value === "string" ? value : defaultStrings[key];
  }
  return Object.freeze(merged) as StringsTable;
}

/** `useSyncExternalStore` needs a cached snapshot; the context is recomputed but its identity is kept. */
let cached: TokenContext | undefined;

function getSnapshot(): TokenContext {
  const next = readContext();
  if (cached === undefined || !sameContext(cached, next)) cached = next;
  return cached;
}

function subscribe(onStoreChange: () => void): () => void {
  return watchContext(() => {
    onStoreChange();
  });
}

/** `useLayoutEffect` warns during server rendering, where there is nothing to lay out anyway. */
const useIsomorphicLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

/** The axes `<Theme>` accepts, plus the brand table of ADR-0020 §6. There is no `brand` prop: a document loads one brand. */
export interface ThemeProps extends Partial<TokenContext> {
  /**
   * The `<brand>/tokens` module whose `tokens.css` this document loads (ADR-0020 §6). It reaches
   * `useBrandTokens()` through React and, in the browser, `brandTokens()` for canvas and vanilla code.
   */
  readonly tokens?: BrandTokens;
  /**
   * The app's component-owned strings (ADR-0032 decision 5): a template per key of `spec/strings.yaml`,
   * shallow-merged over Prism's English `defaultStrings`, so an app replaces the keys it translates and
   * keeps the rest. Components read the result with `useStrings()`. Root-only, like the brand: set once,
   * beside `tokens`, in the app's own translation process. A nested `<Theme>`, which throws in
   * development, passes the enclosing table through in production whatever it is handed, as a nested
   * `DSTheme` leaves Apple's `\.dsStrings` alone.
   */
  readonly strings?: Partial<StringsTable>;
  readonly children?: ReactNode;
}

/**
 * The root of a Prism app. It renders no element of its own and is root-only: color scheme and
 * density nest through `scope()` on the app's own elements, and contrast, transparency, modality and
 * motion are read from `<html>` only (ADR-0019 §1 item 4, §4 item 4).
 *
 * Only the props it is given become attributes on `<html>`; an axis left out follows the OS and the
 * device through the stylesheet's own media queries, so the first paint is right without JavaScript
 * (ADR-0019 §4 item 1, rule 6).
 */
export function Theme(props: ThemeProps): ReactNode {
  const { colorScheme, contrast, transparency, density, modality, motion, tokens, strings, children } = props;
  const parent = useContext(RootContext);
  const inherited = useContext(StringsContext);
  if (parent !== null && isDevelopment()) {
    throw new Error("Theme is root-only; spread scope() on an element for a nested color scheme or density");
  }

  const choices = useMemo<Partial<TokenContext>>(() => {
    const given: Record<string, unknown> = { colorScheme, contrast, transparency, density, modality, motion };
    const picked: Record<string, string> = {};
    for (const axis of axes) {
      const value = given[axis];
      if (isAxisValue(axis, value)) picked[axis] = value;
    }
    return picked;
  }, [colorScheme, contrast, transparency, density, modality, motion]);

  const snapshot = useMemo<TokenContext>(() => ({ ...defaultContext, ...choices }), [choices]);
  // Root-only: under an enclosing <Theme> the strings are the root's, never this one's `strings` and never
  // the English defaults a missing prop would give, so a production nesting cannot reset its subtree.
  const table = useMemo(() => (parent === null ? mergeStrings(strings) : inherited), [parent, inherited, strings]);

  // In the browser the table also reaches code outside React (canvas, visx, Motion), from a committed
  // render: registering it while rendering would publish a table a discarded concurrent render never
  // showed, and would run wherever a server renders under a DOM shim (jsdom, happy-dom). On the
  // server the table is passed through React only, so one process may render several brands.
  useIsomorphicLayoutEffect(() => {
    if (tokens !== undefined) setBrandTokens(tokens);
  }, [tokens]);

  useIsomorphicLayoutEffect(() => mountRoot(choices), [choices]);

  return createElement(
    RootContext.Provider,
    { value: snapshot },
    createElement(BrandContext.Provider, { value: tokens ?? null }, createElement(StringsContext.Provider, { value: table }, children)),
  );
}

/**
 * The effective context of `<html>`, updated on every `watchContext` event (ADR-0019 rule 7).
 *
 * On the server and during hydration it is `defaultContext` overlaid with the `<Theme>` props, so the
 * markup matches and nothing flashes; after mount it is what `readContext()` returns. Code inside a
 * nested scope calls `readContext(element)` on the element it owns.
 */
export function useTokenContext(): TokenContext {
  const fromTheme = useContext(RootContext);
  const server = fromTheme ?? defaultContext;
  return useSyncExternalStore(subscribe, getSnapshot, () => server);
}

/**
 * The brand table the app handed to Prism: the `<Theme tokens>` of this tree, else the one given to
 * `setBrandTokens()`. Throws when there is none (ADR-0020 §6).
 */
export function useBrandTokens<T extends BrandTokens = BrandTokens>(): T {
  const fromTheme = useContext(BrandContext);
  if (fromTheme !== null) return fromTheme as T;
  return brandTokens<T>();
}

/**
 * The strings table components fill their templates from (ADR-0032 decision 5): the enclosing `<Theme
 * strings>` merged over `defaultStrings`, or `defaultStrings` itself outside a `<Theme>` or when it was given
 * none. The web twin of Apple's `@Environment(\.dsStrings)`.
 */
export function useStrings(): StringsTable {
  return useContext(StringsContext);
}
