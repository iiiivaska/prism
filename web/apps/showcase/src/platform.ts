/**
 * Which platform key this document is (docs/showcase.md §4). It is derived, never configured.
 *
 * `web/apps/vrt/matrix.ts` defines the two web keys of spec/SCHEMA.md by the modality a viewport pins:
 * the phone project is `web-touch` under `modality: touch`, the desktop project `web-desktop` under
 * `modality: pointer`. The showcase reads the same axis off the running document, so the support row
 * it prints is the row for the device you are holding — and it moves when the modality control does.
 */
import type { TokenContext } from "@iiiivaska/prism-react";

export type WebPlatformKey = "web-touch" | "web-desktop";

export function platformKey(context: TokenContext): WebPlatformKey {
  return context.modality === "touch" ? "web-touch" : "web-desktop";
}
