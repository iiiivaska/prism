/**
 * `Text` (spec/components/Text.yaml, specVersion 2): the typography primitive.
 *
 * - `role` selects the type role; the stylesheet reads its six derived declarations (`--ds-type-<role>-*`,
 *   ARCHITECTURE §8), which already switch with the scheme and the contrast floor (ADR-0021 §4), and sets
 *   `font-synthesis: none` (ADR-0021 §10).
 * - `tone` resolves against the material and backdrop kind the enclosing `Surface` publishes
 *   (`foregroundOf`, ADR-0022 §3.1 as ADR-0029 §1.4 and ADR-0030 §3.4 amend it); Text never reads the
 *   color scheme.
 * - `numeric` follows ADR-0021 §5: `auto` keeps the role's figures, `tabular` and `proportional` override.
 * - A metric role takes the dimmed `trailing` group and the hung `unit` (`type.metric.unit`, `space.2`),
 *   and exposes value and unit as one accessible string.
 * - Title and display roles render a heading (React Aria's `Heading`, level from `headingLevel`), the
 *   rest React Aria's `Text`; a Text inside another Text renders a `span`.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop, to its root element
 *   (ADR-0019 rule 8).
 *
 * Text.yaml's count-up ("a value that counts up animates over motion.duration.slow") has no prop that
 * says a value counts up, so nothing animates here; its `reduceMotion: instant` is therefore met.
 */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { Heading as AriaHeading, Text as AriaText } from "react-aria-components";
import type { ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import { useSurfaceContext } from "../surface/context.ts";
import {
  foregroundOf,
  isHeadingRole,
  isMetricRole,
  trailingForegroundOf,
  unitForegroundOf,
  type TextNumeric,
  type TextRole,
  type TextTone,
  type TextTruncation,
} from "./tones.ts";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TextProps extends ScopeAttributes, Omit<HTMLAttributes<HTMLElement>, "color" | "role"> {
  /** The type role. Default `body-md`. */
  readonly role?: TextRole;
  /** The tone, resolved against the published material. Default `primary`. */
  readonly tone?: TextTone;
  /** Metric roles only: rendered in the dimmed tone at the same size (`.4` of `86.4`). */
  readonly trailing?: string;
  /** Metric roles only: hung beside the numeral in `type.metric.unit`. */
  readonly unit?: string;
  /** Figures (ADR-0021 §5). Live values set `tabular`. Default `auto`. */
  readonly numeric?: TextNumeric;
  /** `ellipsis` for identifiers, `fade` for prose. Default `none`. */
  readonly truncation?: TextTruncation;
  /** Lines before truncation; `ellipsis` defaults to 1, `fade` to 3. */
  readonly maxLines?: number;
  /**
   * The heading level of a title or display role (web only; the spec asks for a heading and leaves the
   * level to the page). Defaults: display and `title-lg` 1, `title-md` 2, `title-sm` 3.
   */
  readonly headingLevel?: HeadingLevel;
  /** React Aria slot, for Text inside React Aria components. */
  readonly slot?: string;
  readonly children?: ReactNode;
  readonly ref?: Ref<HTMLElement>;
}

/** True inside a Text, where a nested Text renders a span whatever its role. */
const InsideText = createContext(false);

const DEFAULT_HEADING_LEVEL: Readonly<Record<string, HeadingLevel>> = {
  "title-lg": 1,
  "title-md": 2,
  "title-sm": 3,
};

function headingLevelOf(role: TextRole): HeadingLevel {
  return DEFAULT_HEADING_LEVEL[role] ?? 1;
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

/** The text a screen reader reads for a metric with a trailing group or a unit: "86.4 %". */
function accessibleValue(children: ReactNode, trailing: string | undefined, unit: string | undefined): string | null {
  if (typeof children !== "string" && typeof children !== "number") return null;
  const value = `${children}${trailing ?? ""}`;
  return unit === undefined ? value : `${value} ${unit}`;
}

/** Whether a fade-truncated Text actually overflows, so the fade dims only text that is cut. */
function useOverflowing(element: HTMLElement | null, enabled: boolean): boolean {
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    if (!enabled || element === null) return;
    const measure = (): void => {
      setOverflowing(element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element, enabled]);
  return enabled && overflowing;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T): void {
  if (typeof ref === "function") ref(value);
  else if (ref !== null && ref !== undefined) (ref as { current: T }).current = value;
}

export function Text(props: TextProps): ReactNode {
  const {
    role = "body-md",
    tone = "primary",
    trailing,
    unit,
    numeric = "auto",
    truncation = "none",
    maxLines,
    headingLevel,
    className,
    style,
    children,
    ref,
    ...rest
  } = props;

  const surface = useSurfaceContext();
  const insideText = useContext(InsideText);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const overflowing = useOverflowing(element, truncation === "fade");
  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      setElement(node);
      assignRef(ref, node);
    },
    [ref],
  );

  const metric = isMetricRole(role);
  const showTrailing = metric && trailing !== undefined && trailing !== "";
  const showUnit = metric && unit !== undefined && unit !== "";
  const label = showTrailing || showUnit ? accessibleValue(children, showTrailing ? trailing : undefined, showUnit ? unit : undefined) : null;
  const foreground = foregroundOf(surface, tone, role);
  const lines = truncation === "none" ? undefined : (maxLines ?? (truncation === "fade" ? 3 : 1));

  const content = (
    <>
      {children}
      {showTrailing ? (
        <span data-ds-slot="text-trailing" data-ds-foreground={trailingForegroundOf(surface, role)}>
          {trailing}
        </span>
      ) : null}
      {showUnit ? (
        <span data-ds-slot="text-unit" data-ds-foreground={unitForegroundOf(surface)}>
          {unit}
        </span>
      ) : null}
    </>
  );

  const domProps = {
    ...rest,
    ref: setRefs,
    className: joinClassNames("ds-text", className),
    style: lines === undefined ? style : ({ ...style, "--ds--text-max-lines": lines } as CSSProperties),
    "data-ds-slot": "text",
    "data-ds-role": role,
    "data-ds-foreground": foreground ?? undefined,
    "data-ds-numeric": numeric === "auto" ? undefined : numeric,
    "data-ds-truncation": truncation === "none" ? undefined : truncation,
    "data-ds-single-line": lines === 1 ? "" : undefined,
    "data-ds-overflowing": overflowing ? "" : undefined,
    children: (
      <InsideText.Provider value={true}>
        {label === null ? (
          content
        ) : (
          <>
            <span data-ds-slot="text-label">{label}</span>
            <span aria-hidden="true">{content}</span>
          </>
        )}
      </InsideText.Provider>
    ),
  };

  if (isHeadingRole(role) && !insideText) {
    return <AriaHeading {...domProps} level={headingLevel ?? headingLevelOf(role)} />;
  }
  return <AriaText {...domProps} elementType="span" />;
}
