// Every value is a token accessor or a --ds-* variable. The old value was #0A84FF at 12px.
import { tokens } from "@iiiivaska/prism-tokens";

export function Button(props: { label: string }) {
  const style = {
    padding: `var(--ds-space-3)`,
    color: "var(--ds-color-text-on-accent)",
    fontFamily: tokens.font.ui,
    borderRadius: tokens.radius.control,
  };
  /* A block comment: rgb(0 0 0) and Inter */
  const href = "https://example.com/docs#section"; // trailing comment with 1px
  const opt = 1, h1px = 2, Interaction = { hex: 0x1f };
  return (
    <a href={href} style={style} data-slot="button" data-count={opt + h1px + Interaction.hex}>
      {props.label}
    </a>
  );
}
