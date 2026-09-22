/**
 * The document. One brand per document (ADR-0020 §6): `?brand=` picks it, the generated loader brings
 * that brand's `tokens.css`, its `fonts.css` and its table, and only then does the app mount — so the
 * first paint is the right brand and `setBrandTokens` is called once, with the table whose stylesheet
 * this document loaded.
 *
 * Everything else is brand-invariant and imported statically: the motion sheet, the component styles
 * and the app's own chrome. `<html>` is left without a single `data-ds-*` attribute, so every axis
 * follows the OS and the device until the axis bar is touched.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@iiiivaska/prism-tokens/motion.css";
import "@iiiivaska/prism-react/styles.css";
import "./harness/harness.css";
import "./app.css";
import { brandLoaders } from "virtual:prism/brands";
import { App } from "./app.tsx";
import { currentBrandId } from "./brand.ts";

const brandId = currentBrandId();
const load = brandLoaders[brandId];
const container = document.getElementById("root");

if (container === null) throw new Error("index.html has no #root");
if (load === undefined) throw new Error(`No loader for brand ${brandId}; the token manifest declares ${Object.keys(brandLoaders).join(", ")}`);

void load().then((tokens) => {
  createRoot(container).render(
    <StrictMode>
      <App brandId={brandId} tokens={tokens} />
    </StrictMode>,
  );
});
