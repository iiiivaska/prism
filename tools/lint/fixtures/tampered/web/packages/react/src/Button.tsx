export function Button(props: { label: string }) {
  const style = {
    padding: "8px 12px",
    color: "#fff",
    fontFamily: "Inter, system-ui",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
  };
  return <button style={style}>{props.label}</button>;
}
