/**
 * The shell (docs/showcase.md §2). One shape, two presentations: a persistent rail above 900 px and a
 * disclosure below it, driven by a container query on the app itself, not by a user agent.
 *
 * The chrome is deliberately **not** Prism. `Sidebar`, `TabBar` and `AdaptiveShell` are specified and
 * unimplemented, so the frame is plain CSS over the `--ds-*` variables, and the About screen says so.
 * Everything inside the main column is Prism, or a specimen of a Prism token.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Theme, type BrandTokens, type TokenContext } from "@iiiivaska/prism-react";
import { components, patterns } from "virtual:prism/catalog";
import { AxisBar } from "./axis-bar.tsx";
import { href, useRoute, type Route } from "./route.ts";
import { foundationPages } from "./tokens.ts";
import { About } from "./sections/About.tsx";
import { Components } from "./sections/Components.tsx";
import { Foundations } from "./sections/Foundations.tsx";
import { Icons } from "./sections/Icons.tsx";
import { Overview } from "./sections/Overview.tsx";
import { Patterns } from "./sections/Patterns.tsx";

interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly note?: string;
}

interface NavSection {
  readonly id: string;
  readonly label: string;
  readonly items: readonly NavItem[];
}

/** Every entry below is counted from the data; the app knows the five screens, never their contents. */
const navSections: readonly NavSection[] = [
  { id: "overview", label: "Overview", items: [] },
  {
    id: "foundations",
    label: "Foundations",
    items: foundationPages.map((page) => ({ id: page.id, label: page.title, note: `${page.count}` })),
  },
  { id: "icons", label: "Icons", items: [] },
  {
    id: "components",
    label: "Components",
    items: components.map((spec) => ({ id: spec.name, label: spec.name })),
  },
  { id: "patterns", label: "Patterns", items: patterns.map((spec) => ({ id: spec.name, label: spec.name })) },
  { id: "about", label: "About", items: [] },
];

function Screen(props: { readonly route: Route; readonly brandId: string }): ReactNode {
  const { route, brandId } = props;
  switch (route.section) {
    case "foundations":
      return <Foundations item={route.item} />;
    case "icons":
      return <Icons />;
    case "components":
      return <Components item={route.item} />;
    case "patterns":
      return <Patterns item={route.item} />;
    case "about":
      return <About />;
    default:
      return <Overview brandId={brandId} />;
  }
}

function Rail(props: { readonly route: Route }): ReactNode {
  const { route } = props;
  return (
    <nav className="ds-sc-rail" aria-label="Sections">
      {navSections.map((section) => {
        const active = section.id === route.section;
        return (
          <div key={section.id} className="ds-sc-rail-group">
            <a className="ds-sc-rail-section" href={href(section.id)} aria-current={active ? "page" : undefined}>
              {section.label}
            </a>
            {!active || section.items.length === 0 ? null : (
              <ul className="ds-sc-rail-items">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <a href={href(section.id, item.id)} aria-current={route.item === item.id ? "page" : undefined}>
                      <span>{item.label}</span>
                      {item.note === undefined ? null : <span className="ds-sc-rail-note ds-sc-mono">{item.note}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function Shell(props: {
  readonly brandId: string;
  readonly chosen: Partial<TokenContext>;
  readonly onChange: (next: Partial<TokenContext>) => void;
}): ReactNode {
  const route = useRoute();
  const [navOpen, setNavOpen] = useState(false);
  const app = useRef<HTMLDivElement | null>(null);
  const header = useRef<HTMLElement | null>(null);

  // The header is as tall as the axis bar makes it — six axes wrap differently at every width — and
  // the rail sticks underneath it. So the header measures itself and publishes its height, rather
  // than the stylesheet guessing a number that is right at one width only.
  useEffect(() => {
    const element = header.current;
    const host = app.current;
    if (element === null || host === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      host.style.setProperty("--ds-sc-header", `${String(element.getBoundingClientRect().height)}px`);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="ds-sc-app" ref={app}>
      <header className="ds-sc-header" ref={header}>
        <div className="ds-sc-header-top">
          <button
            type="button"
            className="ds-sc-nav-toggle"
            aria-expanded={navOpen}
            onClick={() => {
              setNavOpen((open) => !open);
            }}
          >
            Sections
          </button>
          <a className="ds-sc-wordmark" href={href("overview")}>
            Prism <span className="ds-sc-wordmark-tail">showcase</span>
          </a>
          <span className="ds-sc-brand-badge ds-sc-mono">{props.brandId}</span>
        </div>
        <AxisBar chosen={props.chosen} onChange={props.onChange} />
      </header>
      <div className="ds-sc-body">
        <div className="ds-sc-rail-region" data-open={navOpen ? "true" : "false"}>
          <Rail route={route} />
        </div>
        <main className="ds-sc-main" id="main">
          <Screen route={route} brandId={props.brandId} />
        </main>
      </div>
    </div>
  );
}

export function App(props: { readonly brandId: string; readonly tokens: BrandTokens }): ReactNode {
  // The axes the visitor has chosen. An axis that is not here is not passed, so it stays the OS's.
  const [chosen, setChosen] = useState<Partial<TokenContext>>({});
  return (
    <Theme {...chosen} tokens={props.tokens}>
      <Shell brandId={props.brandId} chosen={chosen} onChange={setChosen} />
    </Theme>
  );
}
