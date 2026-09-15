// One line per typography pattern (ADR-0021 §12); `expect:` names the rule the line must trip.
export function Title(props: { text: string }) {
  return (
    <>
      <h1 className="font-semibold">{props.text}</h1> {/* expect: typography/tailwind-weight */}
      <h2 className="md:font-[450]">{props.text}</h2> {/* expect: typography/tailwind-weight */}
      <em className="italic">{props.text}</em> {/* expect: typography/italic */}
      <span style={{ fontStyle: "oblique" }}>{props.text}</span> {/* expect: typography/italic */}
      <span style={{ fontWeight: 600 }}>{props.text}</span> {/* expect: typography/ts-font-weight */}
      <span style={{ fontWeight: "bold" }}>{props.text}</span> {/* expect: typography/ts-font-weight */}
      <span className="[font-weight:600]">{props.text}</span> {/* expect: typography/css-weight-style */}
    </>
  );
}
