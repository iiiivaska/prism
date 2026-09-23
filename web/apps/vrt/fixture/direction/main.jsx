/*
  The direction page (P5-3 finding SD-7): every registry entry drawn by `Icon`, and one line of `Text`
  truncated with a fade that overflows its box, inside three nested sections, so the spec can set `dir`
  on `<html>`, on any of the sections, or on the Text itself, and read from computed styles which glyphs
  are mirrored and which way the fade runs (Icon.yaml behavior 11, Text.yaml's fade).

  The registry comes from the packed package's own `iconRegistry`, and `window.prismDirection` hands the
  spec the names it drew, so the spec can check them against spec/icons/registry.json.
*/
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Icon, Text, Theme, iconRegistry } from "@iiiivaska/prism-react";
import * as brand from "@iiiivaska/prism-tokens/brands/prism-native/tokens";
import "./direction.css";

const names = Object.keys(iconRegistry);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Theme tokens={brand}>
      <section id="outer">
        <section id="middle">
          <section id="inner">
            <div className="probe-glyphs">
              {names.map((name) => (
                <Icon key={name} name={name} />
              ))}
            </div>
            <div className="probe-line">
              <Text id="fade" truncation="fade" maxLines={1}>
                One line of prose, longer than its box
              </Text>
            </div>
          </section>
        </section>
      </section>
    </Theme>
  </StrictMode>,
);

globalThis.prismDirection = { names };
