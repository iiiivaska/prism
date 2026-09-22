/*
  A consuming React app, exactly as agent/SKILL.md describes one (roadmap P3-6):

    * `<Theme>` at the root, given only what the user chose inside the app (here: the colour scheme);
      everything else follows the OS and the device.
    * one of every kind in the Phase 3 slice — Surface, Text, Button, Card — and no component
      hand-rolled.
    * no raw value: spacing, colour and type come from the tokens the packages ship.

  `window.prismFixture` is the fixture's own probe, so `smoke.mjs` can ask the built page what it
  actually computed without reaching into React. Everything it reports is read from the page, never
  from a value spelled here.
*/
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Card, Surface, Text, Theme, readContext } from "@iiiivaska/prism-react";
import { version as tokensVersion } from "@iiiivaska/prism-tokens";
// The brand table the app hands to Prism, once, at start-up (ADR-0020 §6): the same brand whose
// tokens.css app.css imports. Code that needs a value in JavaScript — a motion spring, a chart
// series — reads it from here, and Prism itself imports no brand.
import * as brand from "@iiiivaska/prism-tokens/brands/prism/tokens";
import "./app.css";

function App() {
  // The one axis this app offers its user; `<Theme>` writes it, and the runtime resolves the rest.
  const [colorScheme, setColorScheme] = useState("light");
  const [presses, setPresses] = useState(0);

  return (
    <Theme colorScheme={colorScheme} tokens={brand}>
      <div className="fixture-stack" data-probe="stack">
        <Text role="title-lg">Prism consumer fixture</Text>
        <Text role="caption" tone="secondary" data-probe="version">
          @iiiivaska/prism-tokens {tokensVersion}
        </Text>

        <Card
          data-probe="card"
          title="Line output"
          caption="Last 24 hours"
          variant="solid"
          hero={{ value: "86", trailing: ".4", unit: "%" }}
          onAction={() => setPresses((n) => n + 1)}
        />

        <Card
          title="Average yield"
          caption="Dollars per batch"
          variant="vivid"
          hero={{ value: "$2,450" }}
          onAction={() => setPresses((n) => n + 1)}
        />

        <Surface material="raised" radius="card" data-probe="surface">
          <div className="fixture-row">
            <Text role="body-md" numeric="tabular">
              Pressed {presses} times
            </Text>
            <Button
              data-probe="button"
              label={colorScheme === "light" ? "Switch to dark" : "Switch to light"}
              variant="primary"
              size="md"
              onPress={() => setColorScheme(colorScheme === "light" ? "dark" : "light")}
            />
            <Button label="Details" variant="secondary" size="md" onPress={() => setPresses((n) => n + 1)} />
          </div>
        </Surface>
      </div>
    </Theme>
  );
}

/*
  A CSS colour as the sRGB bytes it actually paints.

  Chromium serializes a computed colour in whatever space it was written or interpolated in, so one
  colour has several spellings: the token `oklch(96.12% .0041 271.4)` reads back off a painted
  element as `oklch(0.9612 0.0041 271.4)`, and while a transition is interpolating it, as
  `oklab(0.9612 0.000100172 -0.00409878)`. Comparing those strings answers "was this serialized
  differently", which is not a question this fixture asks — and answering it by accident is how a
  repaint check passes on a colour that never repainted. Painting the value on a 1x1 canvas and
  reading the pixel back answers "is this a different colour", which is the question.
*/
const swatch = document.createElement("canvas");
swatch.width = 1;
swatch.height = 1;
const swatchContext = swatch.getContext("2d", { willReadFrequently: true });

function paint(value) {
  if (swatchContext === null || typeof value !== "string" || value === "") return null;
  if (!CSS.supports("color", value)) return null;
  swatchContext.clearRect(0, 0, 1, 1);
  swatchContext.fillStyle = value;
  swatchContext.fillRect(0, 0, 1, 1);
  return Array.from(swatchContext.getImageData(0, 0, 1, 1).data);
}

/**
 * Resolves once the probed element has stopped changing colour.
 *
 * `<Surface>` crossfades its colours over `--ds-motion-*` when the scheme changes, so the frame on
 * which `data-ds-color-scheme` flips still holds the *old* colour — a probe taken there reports the
 * scheme that is leaving. Waiting for the painted style to hold still for a few frames needs no
 * knowledge of the duration or the easing, which are tokens and may change.
 */
function settled(name = "surface", stillFrames = 10, limit = 600) {
  const element = document.querySelector(`[data-probe="${name}"]`);
  if (element === null) return Promise.resolve({ frames: 0, settled: false });
  const read = () => {
    const style = getComputedStyle(element);
    return `${style.backgroundColor}|${style.backgroundImage}|${style.color}`;
  };
  return new Promise((resolve) => {
    let last = read();
    let still = 0;
    let frames = 0;
    const tick = () => {
      frames++;
      const now = read();
      if (now === last) still++;
      else {
        still = 0;
        last = now;
      }
      if (still >= stillFrames || frames >= limit) resolve({ frames, settled: still >= stillFrames });
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * What the page computed, read from the page. `smoke.mjs` evaluates `window.prismFixture.probe()` and
 * checks the answers against what the tokens, the fonts and the runtime promise.
 */
function probe() {
  const at = (name) => document.querySelector(`[data-probe="${name}"]`);
  const root = document.documentElement;
  const rootStyle = getComputedStyle(root);
  const surface = at("surface");
  const button = at("button");
  const token = (name) => rootStyle.getPropertyValue(name).trim();
  const surfaceBackground = surface === null ? null : getComputedStyle(surface).backgroundColor;
  const pageBackground = getComputedStyle(document.body).backgroundColor;
  return {
    // The published runtime's own reading of the document (ADR-0019 §4).
    context: readContext(),
    schemeAttribute: root.getAttribute("data-ds-color-scheme"),
    // A --ds-* variable, and the paint that actually came out of it.
    bgSurfaceToken: token("--ds-color-bg-surface"),
    bgPageToken: token("--ds-color-bg-page"),
    surfaceBackground,
    pageBackground,
    // The same four values as colours rather than as spellings, so a check can compare paint.
    // `<Surface material="raised">` sits its fill on `--ds-color-bg-page`, which is what its own
    // `background-color` resolves to; the fill itself is painted over that.
    colors: {
      bgSurfaceToken: paint(token("--ds-color-bg-surface")),
      bgPageToken: paint(token("--ds-color-bg-page")),
      surfaceBackground: paint(surfaceBackground),
      pageBackground: paint(pageBackground),
    },
    fontFamily: getComputedStyle(document.body).fontFamily,
    // The brand's own face, loaded from the package.
    fontLoaded: document.fonts.check(`1rem ${getComputedStyle(document.body).fontFamily.split(",")[0].trim()}`),
    fontFiles: performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(".woff2")),
    buttonLabel: button === null ? null : button.textContent,
    buttonHeight: button === null ? null : Math.round(button.getBoundingClientRect().height),
    cardText: at("card") === null ? null : at("card").textContent,
    tokensVersion,
  };
}

window.prismFixture = { probe, settled, tokensVersion };

createRoot(document.querySelector("#root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
