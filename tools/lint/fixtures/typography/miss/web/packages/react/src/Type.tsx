// The token-driven counterpart of each typography pattern (ADR-0021 §12); `miss:` names the rule it must not trip.
export function Title(props: { text: string; italic?: boolean }) {
  return (
    <>
      <h1 className="type-ds-title-md font-ds-ui">{props.text}</h1> {/* miss: typography/tailwind-weight */}
      <em className="not-italic">{props.text}</em> {/* miss: typography/italic */}
      <em data-italic={props.italic}>{props.text}</em> {/* miss: typography/italic */}
      <span style={{ fontWeight: "var(--ds-type-body-md-font-weight)" }}>{props.text}</span> {/* miss: typography/ts-font-weight */}
    </>
  );
}
