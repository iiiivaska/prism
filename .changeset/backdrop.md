---
"@iiiivaska/prism-react": minor
---

Backdrop (ADR-0036 §8): an app now declares the page over media it paints itself, such as a map, a photo or a vivid gradient, so that Prism's components know which ground they sit on. On the web, `<Backdrop kind="map">` (also `"image"` and `"vivid"`) publishes the page over that kind to its children. It paints nothing, renders no element and leaves the nesting depth that Surface's concentric radius reads unchanged. The web package exports `Backdrop` and `BackdropProps`. On Apple, `.dsBackdrop(.map) { MapView() }` draws the backdrop behind the view, hands its pixels to the glass inside, and publishes the page over that kind. `.none` publishes nothing and still hands the pixels down. Today no component draws differently on the page over media than on the plain page, so nothing changes on screen. The glass chips of Avatar and Chip will read it.

**Breaking on Apple:**

- The kind-less `dsBackdrop(_:)` is removed. Write the kind: `.dsBackdrop { MapView() }` becomes `.dsBackdrop(.map) { MapView() }`.
- `View.dsSurfaceContext(_:)` is now `package`, and `EnvironmentValues.dsSurfaceContext` is `public package(set)`. App code can no longer publish a surface context without painting it. Reading it is unchanged: `@Environment(\.dsSurfaceContext)` and `DSThemeValues.surface`.

`DSSurfaceView` and `.dsBackdrop(kind)` are now the only public publishers on Apple, as `Surface` and `Backdrop` are on the web.
