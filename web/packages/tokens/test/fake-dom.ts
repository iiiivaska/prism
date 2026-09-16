/**
 * A document, a `matchMedia` and a `MutationObserver` small enough to hold the whole web runtime
 * contract and nothing else. The runtime touches four element methods, `parentElement`,
 * `ownerDocument`, `document.documentElement`, `view.matchMedia` and `view.MutationObserver`; this
 * file implements exactly those, so the tests drive every media query by hand.
 *
 * It lives outside `src/` on purpose: `lint:literals` scans each package's `src`, and the tests spell
 * the attribute names and media queries themselves to check the generated contract independently
 * (ADR-0019 rule 1).
 */

type ChangeListener = (event: { readonly matches: boolean; readonly media: string }) => void;

export class FakeMediaQueryList {
  matches: boolean;
  readonly media: string;
  private readonly listeners = new Set<ChangeListener>();

  constructor(media: string, matches: boolean) {
    this.media = media;
    this.matches = matches;
  }

  addEventListener(type: string, listener: ChangeListener): void {
    if (type === "change") this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: ChangeListener): void {
    if (type === "change") this.listeners.delete(listener);
  }

  /** Flips the query and fires `change`, as a browser does when the OS setting changes. */
  set(matches: boolean): void {
    if (this.matches === matches) return;
    this.matches = matches;
    for (const listener of [...this.listeners]) listener({ matches, media: this.media });
  }
}

interface Registration {
  readonly target: FakeElement;
  readonly filter: readonly string[] | undefined;
  readonly callback: () => void;
}

export class FakeElement {
  readonly ownerDocument: FakeDocument;
  parentElement: FakeElement | null = null;
  private readonly attributes = new Map<string, string>();

  constructor(ownerDocument: FakeDocument) {
    this.ownerDocument = ownerDocument;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    const before = this.getAttribute(name);
    this.attributes.set(name, value);
    if (before !== value) this.ownerDocument.record(this, name);
  }

  removeAttribute(name: string): void {
    if (this.attributes.delete(name)) this.ownerDocument.record(this, name);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  /** A child element, attached to this one. */
  child(): FakeElement {
    const element = new FakeElement(this.ownerDocument);
    element.parentElement = this;
    return element;
  }
}

export class FakeDocument {
  readonly documentElement: FakeElement;
  defaultView: FakeWindow | null = null;
  private readonly registrations: Registration[] = [];

  constructor() {
    this.documentElement = new FakeElement(this);
  }

  observe(registration: Registration): void {
    this.registrations.push(registration);
  }

  disconnect(callback: () => void): void {
    for (let i = this.registrations.length - 1; i >= 0; i -= 1) {
      if (this.registrations[i]?.callback === callback) this.registrations.splice(i, 1);
    }
  }

  /** Delivers on a microtask, as a real MutationObserver does; `flush()` waits for it. */
  record(target: FakeElement, attribute: string): void {
    for (const registration of [...this.registrations]) {
      if (registration.target !== target) continue;
      if (registration.filter !== undefined && !registration.filter.includes(attribute)) continue;
      queueMicrotask(registration.callback);
    }
  }
}

export class FakeWindow {
  readonly document: FakeDocument;
  /** Every query the runtime asks about, so a test can flip one. */
  readonly media = new Map<string, FakeMediaQueryList>();
  /** Queries that match; anything else is false, like a browser that lacks the feature. */
  matching: Set<string>;
  readonly MutationObserver: new (callback: () => void) => FakeMutationObserver;

  constructor(document: FakeDocument, matching: readonly string[]) {
    this.document = document;
    this.matching = new Set(matching);
    const owner = document;
    this.MutationObserver = class extends FakeMutationObserver {
      constructor(callback: () => void) {
        super(owner, callback);
      }
    };
  }

  matchMedia(query: string): FakeMediaQueryList {
    let list = this.media.get(query);
    if (list === undefined) {
      list = new FakeMediaQueryList(query, this.matching.has(query));
      this.media.set(query, list);
    }
    return list;
  }
}

export class FakeMutationObserver {
  private readonly owner: FakeDocument;
  private readonly callback: () => void;

  constructor(owner: FakeDocument, callback: () => void) {
    this.owner = owner;
    this.callback = callback;
  }

  observe(target: FakeElement, options: { attributes?: boolean; attributeFilter?: readonly string[] }): void {
    this.owner.observe({ target, filter: options.attributeFilter, callback: this.callback });
  }

  disconnect(): void {
    this.owner.disconnect(this.callback);
  }
}

export interface FakeDom {
  readonly document: FakeDocument;
  readonly window: FakeWindow;
  readonly root: FakeElement;
  /** Turns a media query on or off and fires `change` on its list. */
  setMedia(query: string, matches: boolean): void;
  /** Waits for the MutationObserver microtask. */
  flush(): Promise<void>;
  /** Removes the globals again. */
  restore(): void;
}

/** Installs a fake `document`, `window` and `MutationObserver` as globals and returns the handles. */
export function installFakeDom(matching: readonly string[] = []): FakeDom {
  const document = new FakeDocument();
  const window = new FakeWindow(document, matching);
  document.defaultView = window;

  const globals = globalThis as Record<string, unknown>;
  const before = {
    document: globals["document"],
    window: globals["window"],
    MutationObserver: globals["MutationObserver"],
    hadDocument: "document" in globals,
    hadWindow: "window" in globals,
    hadObserver: "MutationObserver" in globals,
  };
  globals["document"] = document;
  globals["window"] = window;
  globals["MutationObserver"] = window.MutationObserver;

  return {
    document,
    window,
    root: document.documentElement,
    setMedia(query: string, matches: boolean): void {
      window.matchMedia(query).set(matches);
      if (matches) window.matching.add(query);
      else window.matching.delete(query);
    },
    flush(): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, 0));
    },
    restore(): void {
      if (before.hadDocument) globals["document"] = before.document;
      else delete globals["document"];
      if (before.hadWindow) globals["window"] = before.window;
      else delete globals["window"];
      if (before.hadObserver) globals["MutationObserver"] = before.MutationObserver;
      else delete globals["MutationObserver"];
    },
  };
}
