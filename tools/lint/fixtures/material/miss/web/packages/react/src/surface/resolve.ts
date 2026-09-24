// The Surface module decides the glass fallback, in the one function Surface and the chip share, so it is
// the one web directory that compares Prism's transparency context (ADR-0036 §3, §10). `miss:` names the
// rule that must not trip.
type Context = { readonly contrast: "standard" | "more"; readonly transparency: "standard" | "reduce" };

export function glassFallsBack(context: Context, hasInvalidBackdrop: boolean): boolean {
  return context.transparency === "reduce" || context.contrast === "more" || hasInvalidBackdrop; // miss: material/web-transparency-read
}

export function drawsVividBloom(material: string, context: Context): boolean {
  return material === "vivid" && context.transparency !== "reduce"; // miss: material/web-transparency-read
}
