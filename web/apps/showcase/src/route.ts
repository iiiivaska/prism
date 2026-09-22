/**
 * Where the app is, in the URL. The hash carries the screen (`#/foundations/color`) and the query
 * carries the brand (`?brand=prism-native`), because a brand is a document reload on the web
 * (ADR-0020 §6) and a screen is not. A link that only changes the hash never reloads the document,
 * so the axis choices survive navigation; a brand link reloads on purpose.
 */
import { useSyncExternalStore } from "react";

export interface Route {
  /** `overview`, `foundations`, `icons`, `components`, `patterns`, `about`. */
  readonly section: string;
  /** The token group, the component name — whatever the section pages by. */
  readonly item: string | null;
}

export const DEFAULT_SECTION = "overview";

function read(): string {
  return typeof location === "undefined" ? "" : location.hash;
}

export function parseRoute(hash: string): Route {
  const [section = "", item = ""] = hash.replace(/^#\/?/, "").split("/");
  return { section: section === "" ? DEFAULT_SECTION : decodeURIComponent(section), item: item === "" ? null : decodeURIComponent(item) };
}

export function href(section: string, item?: string | null): string {
  const path = item === undefined || item === null ? section : `${section}/${encodeURIComponent(item)}`;
  return `#/${path}`;
}

function subscribe(onChange: () => void): () => void {
  addEventListener("hashchange", onChange);
  return () => {
    removeEventListener("hashchange", onChange);
  };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, read, () => "");
  return parseRoute(hash);
}
