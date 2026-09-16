import { defineConfig } from "vitest/config";

// The runtime suite of ADR-0019 rules 6 and 7. It runs in Node: the DOM-facing tests install the
// small fake document and `matchMedia` of `test/fake-dom.ts`, and the React tests
// render on the server with `react-dom/server`. Rule 7's client half — a mounted `<Theme>` whose
// `useTokenContext()` tracks `readContext()` across `watchContext` events — needs a client render,
// so it is an acceptance line of P3-4's browser lane (roadmap P3-4).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "dist/**", "src/generated/**"],
  },
});
