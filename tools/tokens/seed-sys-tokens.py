#!/usr/bin/env python3
"""Seed the semantic layer (tokens/sys/**) for the reference brand from docs/research/visual-dna.md.
Everything here is an alias into ref.* or a white/ink alpha overlay; no new hex values except where the
DNA lifts a failing reference value (documented in $description). Re-run after the visual DNA changes."""
import json, pathlib, sys

root = pathlib.Path(sys.argv[1]); sysd = root / 'tokens' / 'sys'
for d in ['color', 'density', 'modality', 'motion', 'platform']:
    (sysd / d).mkdir(parents=True, exist_ok=True)

SCHEMA = "https://www.designtokens.org/schemas/2025.10/format.json"

def alias(path, desc=None, **ext):
    d = {"$value": "{%s}" % path}
    if desc: d["$description"] = desc
    if ext: d["$extensions"] = {"app.prism": ext}
    return d

def overlay(hexv, alpha, desc=None, **ext):
    """A color defined as an alpha overlay (white or ink) meant to be composited over its parent."""
    r, g, b = [int(hexv[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    d = {"$value": {"colorSpace": "srgb", "components": [round(r, 4), round(g, 4), round(b, 4)], "alpha": alpha, "hex": hexv.lower()}}
    if desc: d["$description"] = desc
    if ext: d["$extensions"] = {"app.prism": ext}
    return d

def write(path, obj):
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")

W, K = "#FFFFFF", "#0E0F12"

# ---------------------------------------------------------------- light
light = {"$schema": SCHEMA, "sys": {
  "color": {"$type": "color",
    "bg": {
      "page": alias("ref.color.neutral.100", "never flat pure grey; optional warm mesh toward #F3F0EB and blooms at 25-35%"),
      "surface": {"$root": alias("ref.color.neutral.0", "card: no border, no shadow (optional ambient 5%)"),
                  "raised": overlay(W, 0.70, "puffy chip / round button on the page, plus inset top highlight and shadow.raised"),
                  "nested": overlay(K, 0.06, "filled control, dock tray (= #ECEDF1 on white)"),
                  "overlay": alias("ref.color.neutral.0")},
      "fill": {"inverse": alias("ref.color.neutral.950", "primary pill, active tab, solid action circle"),
               "accent": alias("ref.color.accent.300", "the one attention tile; content is ink"),
               "accent-strong": alias("ref.color.accent.700", "accent surface with white text (4.8:1)"),
               "critical": alias("ref.color.status.danger.badge", "badge under white 11 px Medium (4.5:1)"),
               "neutral": {"subtle": overlay(K, 0.06)}},
      "tint": {"accent": overlay("#F39444", 0.12, "tinted focus card (= #FEF2E9 on white)"),
               "success": alias("ref.color.status.success.tint-light"), "warning": alias("ref.color.status.warning.tint-light"),
               "critical": alias("ref.color.status.danger.tint-light"), "info": alias("ref.color.status.info.tint-light")}},
    "text": {
      "primary": alias("ref.color.neutral.950", "17.1:1 on page"),
      "secondary": alias("ref.color.neutral.600", "5.6:1 page / 6.3:1 card (reference #8E8E8E failed at 2.4:1)"),
      "tertiary": alias("ref.color.neutral.600", "resolves to the secondary step so 12 px captions pass AA; the DNA's #7E838F is kept as text.dimmed for >= 24 px"),
      "dimmed": alias("ref.color.neutral.500", "3.4:1 on page: trailing digits and units at >= 24 px only"),
      "on-inverse": alias("ref.color.neutral.0"),
      "on-accent": alias("ref.color.neutral.950", "ink on accent-300 = 11.9:1"),
      "on-accent-strong": alias("ref.color.neutral.0"),
      "on-vivid": alias("ref.color.neutral.0", "only inside the vivid token's text-safe zone"),
      "on-glass": alias("ref.color.neutral.0"),
      "on-badge": alias("ref.color.neutral.0"),
      "accent": alias("ref.color.accent.800", "5.7:1 on page; the light accent is text-safe only at step 800"),
      "success": alias("ref.color.status.success.text-light"), "warning": alias("ref.color.status.warning.text-light"),
      "critical": alias("ref.color.status.danger.text-light"), "info": alias("ref.color.status.info.text-light")},
    "icon": {"primary": overlay(K, 0.80), "secondary": alias("ref.color.neutral.600"), "accent": alias("ref.color.accent.500", "marks only, never text"),
             "status": {"success": alias("ref.color.status.success.dot-light"), "warning": alias("ref.color.status.warning.dot-light"),
                        "critical": alias("ref.color.status.danger.dot-light"), "info": alias("ref.color.status.info.dot-light")}},
    "border": {"hairline": overlay(K, 0.10, "inputs, table rows, chip strokes"), "strong": overlay(K, 0.30), "focus": alias("ref.color.neutral.950"),
               "boundary": alias("ref.color.neutral.500", "control edges that must pass 3:1")},
    "accent": {"$root": alias("ref.color.accent.500", "marks: dots, chart 'now', peak ticks, delta glyph fill"), "pressed": alias("ref.color.accent.600"),
               "subtle": overlay("#F39444", 0.12), "glow": overlay("#F9A55A", 0.40)},
    "chart": {"series": {str(i): alias("ref.color.series.light.%d" % i) for i in range(1, 7)},
              "comparison": overlay(K, 0.30), "comparison-2": overlay(K, 0.15), "target": overlay(K, 0.30), "grid": overlay(K, 0.10),
              "band": overlay(K, 0.05), "axis": alias("ref.color.neutral.600", "reference #B7B7B9 failed at 1.7:1"), "now": alias("ref.color.accent.500"),
              "ghost": alias("ref.color.neutral.200", "sparkline ghost bars"), "plot": alias("ref.color.neutral.0", "charts never sit on raw glass")}},
  "material": {"glass": {
      "dark": {"fill": overlay("#0A0C08", 0.55, "card over a bright photo or vivid; drawer 0.35", blur=40, saturate=0.8, edge={"alpha": 0.22, "to": 0.08}, grain=0.04),
               "chip": overlay("#0A0C08", 0.35, blur=24)},
      "light": {"fill": overlay(W, 0.30, "chips, pills, rows over vivid; tab bar 0.45", blur=24, saturate=1.1, edge={"alpha": 0.55, "to": 0.0}),
                "chip": overlay(W, 0.25, blur=20)},
      "scrim": overlay("#000000", 0.35, "bottom-up under text on unpredictable backdrops")}},
  "shadow": {"$type": "shadow", "raised": alias("ref.shadow.light.raised"), "floating": alias("ref.shadow.light.floating"),
             "overlay": alias("ref.shadow.light.overlay"), "drawer": alias("ref.shadow.light.drawer"), "flat": alias("ref.shadow.none")},
}}
write(sysd / 'color' / 'light.tokens.json', light)

# ---------------------------------------------------------------- dark
dark = {"$schema": SCHEMA, "sys": {
  "color": {"$type": "color",
    "bg": {
      "page": alias("ref.color.neutral.950", "never pure #000; optional radial vignette +3-10% toward the hero"),
      "surface": {"$root": overlay(W, 0.06, "surface-1 = #1C1C1F over page; no border, no shadow"),
                  "raised": overlay(W, 0.09, "surface-2 = #232426: tiles, pills, nested; optional 1 px white 8% top edge on tiles and nav pills only"),
                  "nested": overlay(W, 0.12, "surface-3 = #2A2B2E: translucent card over map, control on card"),
                  "overlay": overlay(W, 0.12)},
      "fill": {"inverse": alias("ref.color.neutral.0", "active segmented button, send button; black glyph"),
               "accent": alias("ref.color.accent.500", "the one attention KPI tile; content is ink (8.3:1)"),
               "accent-strong": alias("ref.color.accent.600", "white text >= 18 px only (3.05:1)"),
               "critical": alias("ref.color.status.danger.badge"),
               "neutral": {"subtle": overlay(W, 0.06)}},
      "tint": {"accent": overlay("#F39444", 0.14, "orange band under a flagged chart window (= #2D2118 on page)"),
               "success": overlay("#5CCB6A", 0.10), "warning": overlay("#F5B83D", 0.10), "critical": overlay("#FF4642", 0.10, "alert sub-card = #332022 on surface-1"), "info": overlay("#6B84E0", 0.10)}},
    "text": {
      "primary": alias("ref.color.neutral.0", "numerals pure white; body may use #F5F6F8"),
      "secondary": overlay(W, 0.64, "7.6:1 on surface-1 / 6.3:1 on surface-3"),
      "tertiary": overlay(W, 0.55, "6.0:1 / 5.0:1: axis labels, timestamps (reference 45-50% failed on surface-3)"),
      "dimmed": overlay(W, 0.42, "4.0:1 / 3.35:1: trailing digits and units >= 24 pt only (reference 35-40% was 2.3-2.9:1)"),
      "on-inverse": alias("ref.color.neutral.950"),
      "on-accent": alias("ref.color.neutral.950"),
      "on-accent-strong": alias("ref.color.neutral.0"),
      "on-vivid": alias("ref.color.neutral.0"),
      "on-glass": alias("ref.color.neutral.0", "captions never below 78% white on light glass"),
      "on-badge": alias("ref.color.neutral.0"),
      "accent": alias("ref.color.accent.500", "7.4:1 on surface-1; text allowed at >= 12 px"),
      "success": alias("ref.color.status.success.dark"), "warning": alias("ref.color.status.warning.dark"),
      "critical": alias("ref.color.status.danger.dark"), "info": alias("ref.color.status.info.dark")},
    "icon": {"primary": alias("ref.color.neutral.0"), "secondary": overlay(W, 0.64), "accent": alias("ref.color.accent.500"),
             "status": {"success": alias("ref.color.status.success.dark"), "warning": alias("ref.color.status.warning.dark"),
                        "critical": alias("ref.color.status.danger.mark-dark"), "info": alias("ref.color.status.info.mark-dark")}},
    "border": {"hairline": overlay(W, 0.08, "table rows, tile top edge"), "strong": overlay(W, 0.35, "outline pills"), "focus": alias("ref.color.neutral.0"),
               "boundary": overlay(W, 0.30)},
    "accent": {"$root": alias("ref.color.accent.500"), "pressed": alias("ref.color.accent.400"), "subtle": overlay("#F39444", 0.14), "glow": overlay("#F39444", 0.40)},
    "chart": {"series": {str(i): alias("ref.color.series.dark.%d" % i) for i in range(1, 7)},
              "comparison": overlay(W, 0.40), "comparison-2": overlay(W, 0.25), "target": overlay(W, 0.60), "grid": overlay(W, 0.12),
              "band": overlay(W, 0.06), "axis": overlay(W, 0.55), "now": alias("ref.color.accent.500"),
              "ghost": overlay(W, 0.12), "plot": overlay(W, 0.06, "charts never sit on raw glass")}},
  "material": {"glass": {
      "dark": {"fill": overlay("#101410", 0.60, "panel / sheet / card over map; takes the backdrop hue", blur=32, saturate=1.2, edge={"alpha": 0.15, "to": 0.0}, grain=0.0),
               "chip": overlay(W, 0.16, "controls over map or render; toolbar 0.25", blur=20, edge={"alpha": 0.20, "to": 0.12})},
      "light": {"fill": overlay(W, 0.26, "the selected / foreground object; only over dark imagery (backdrop L <= 35%); bloom clipped away from text", blur=40, bloom={"alpha": 0.35}),
                "chip": overlay(W, 0.16, blur=20)},
      "cell": overlay(W, 0.20, "status cells over a render: fill tinted <= 20% toward the status hue, 1.5 px status border carries the status", blur=12),
      "scrim": overlay("#000000", 0.40, "modal backdrop dim; text scrim over bright photos")}},
  "shadow": {"$type": "shadow", "raised": alias("ref.shadow.none", "dark E1 is a +3% luminance step, not a shadow"), "floating": alias("ref.shadow.dark.floating"),
             "overlay": alias("ref.shadow.dark.overlay"), "drawer": alias("ref.shadow.dark.modal"), "flat": alias("ref.shadow.none")},
}}
write(sysd / 'color' / 'dark.tokens.json', dark)

# Increased contrast: lift every tier one step; kill dimmed and thin-weight exceptions.
write(sysd / 'color' / 'light-increased-contrast.tokens.json', {"$schema": SCHEMA, "sys": {"color": {"$type": "color",
  "text": {"secondary": alias("ref.color.neutral.700"), "tertiary": alias("ref.color.neutral.700"), "dimmed": alias("ref.color.neutral.600", "dimmed digits become secondary under Increase Contrast"),
           "accent": alias("ref.color.accent.900")},
  "border": {"hairline": overlay(K, 0.30), "strong": overlay(K, 0.60)},
  "chart": {"grid": overlay(K, 0.20), "target": overlay(K, 0.60), "comparison": overlay(K, 0.60)}}}})
write(sysd / 'color' / 'dark-increased-contrast.tokens.json', {"$schema": SCHEMA, "sys": {"color": {"$type": "color",
  "text": {"secondary": overlay(W, 0.80), "tertiary": overlay(W, 0.70), "dimmed": overlay(W, 0.64)},
  "border": {"hairline": overlay(W, 0.25), "strong": overlay(W, 0.60)},
  "chart": {"grid": overlay(W, 0.25), "target": overlay(W, 0.85), "comparison": overlay(W, 0.60)}}}})
# Reduced transparency: glass becomes an opaque raised surface.
write(sysd / 'color' / 'light-reduced-transparency.tokens.json', {"$schema": SCHEMA, "sys": {"material": {"glass": {
  "dark": {"fill": alias("ref.color.neutral.900"), "chip": alias("ref.color.neutral.900")},
  "light": {"fill": alias("ref.color.neutral.0"), "chip": alias("ref.color.neutral.0")},
  "scrim": overlay("#000000", 0.0)}}}})
write(sysd / 'color' / 'dark-reduced-transparency.tokens.json', {"$schema": SCHEMA, "sys": {"material": {"glass": {
  "dark": {"fill": overlay("#1C1C1F", 0.92, "surface-1 at 92%"), "chip": overlay("#232426", 0.92)},
  "light": {"fill": overlay("#2A2B2E", 0.92), "chip": overlay("#2A2B2E", 0.92)},
  "cell": overlay("#2A2B2E", 0.92), "scrim": overlay("#000000", 0.40)}}}})

# ---------------------------------------------------------------- density
def dens(card_pad, gap_card, gap_group, margin, row, control, tile_gap, section, body_lh):
    return {"$schema": SCHEMA, "sys": {
      "space": {"$type": "dimension", "tile-gap": {"$value": {"value": tile_gap, "unit": "px"}}, "card-gap": {"$value": {"value": gap_card, "unit": "px"}},
                "group-gap": {"$value": {"value": gap_group, "unit": "px"}}, "section-gap": {"$value": {"value": section, "unit": "px"}},
                "card-padding": {"$value": {"value": card_pad, "unit": "px"}}, "page-margin": {"$value": {"value": margin, "unit": "px"}}},
      "size": {"$type": "dimension", "row": {"$value": {"value": row, "unit": "px"}}, "control": {"$root": {"$value": {"value": control, "unit": "px"}}}},
      "type": {"$type": "number", "body-line-height": {"$value": body_lh}}}}
write(sysd / 'density' / 'compact.tokens.json', dens(16, 8, 12, 16, 32, 32, 4, 24, 1.4))
write(sysd / 'density' / 'regular.tokens.json', dens(24, 12, 16, 24, 44, 40, 6, 32, 1.5))
write(sysd / 'density' / 'comfortable.tokens.json', dens(24, 12, 24, 24, 52, 48, 8, 40, 1.55))

# ---------------------------------------------------------------- modality
write(sysd / 'modality' / 'pointer.tokens.json', {"$schema": SCHEMA, "sys": {"size": {"$type": "dimension", "hit": {"$value": "{ref.size.hit.pointer}"}},
  "interaction": {"$type": "number", "hover": {"$value": 1, "$description": "hover states exist"}, "tooltip": {"$value": 1}}}})
write(sysd / 'modality' / 'touch.tokens.json', {"$schema": SCHEMA, "sys": {"size": {"$type": "dimension", "hit": {"$value": "{ref.size.hit.touch}"}},
  "interaction": {"$type": "number", "hover": {"$value": 0}, "tooltip": {"$value": 0}}}})

# Superseded by ADR-0023 and the reviewed JSON (layered reduced context, sys.motion.easing, reduced smooth, crossfade flags, derived fallbacks). Do not re-run this block.
# ---------------------------------------------------------------- motion
write(sysd / 'motion' / 'default.tokens.json', {"$schema": SCHEMA, "sys": {"motion": {
  "duration": {"$type": "duration", "instant": alias("ref.motion.duration.instant"), "quick": alias("ref.motion.duration.quick"), "fast": alias("ref.motion.duration.fast"),
               "base": alias("ref.motion.duration.base"), "slow": alias("ref.motion.duration.slow"), "slower": alias("ref.motion.duration.slower")},
  "spring": {"$type": "transition", "interactive": alias("ref.motion.spring.interactive"), "snappy": alias("ref.motion.spring.snappy"), "smooth": alias("ref.motion.spring.smooth"),
             "sheet": alias("ref.motion.spring.sheet"), "bouncy": alias("ref.motion.spring.bouncy")},
  "presentation": {"$type": "number", "crossfade": {"$value": 0, "$description": "0 = transitions may translate/scale; 1 = crossfade only"}}}}})
write(sysd / 'motion' / 'reduced.tokens.json', {"$schema": SCHEMA, "sys": {"motion": {
  "duration": {"$type": "duration", "fast": {"$value": {"value": 100, "unit": "ms"}}, "base": {"$value": {"value": 150, "unit": "ms"}}, "slow": {"$value": {"value": 150, "unit": "ms"}}, "slower": {"$value": {"value": 150, "unit": "ms"}}},
  "spring": {"$type": "transition",
             "snappy": {"$value": {"duration": {"value": 250, "unit": "ms"}, "delay": {"value": 0, "unit": "ms"}, "timingFunction": "{ref.motion.easing.out}"}, "$extensions": {"app.prism": {"spring": {"duration": 0.25, "bounce": 0.0}}}},
             "sheet": {"$value": {"duration": {"value": 250, "unit": "ms"}, "delay": {"value": 0, "unit": "ms"}, "timingFunction": "{ref.motion.easing.out}"}, "$extensions": {"app.prism": {"spring": {"duration": 0.25, "bounce": 0.0}}}},
             "bouncy": {"$value": {"duration": {"value": 300, "unit": "ms"}, "delay": {"value": 0, "unit": "ms"}, "timingFunction": "{ref.motion.easing.out}"}, "$extensions": {"app.prism": {"spring": {"duration": 0.30, "bounce": 0.0}}}}},
  "presentation": {"$type": "number", "crossfade": {"$value": 1}}}}})

# ---------------------------------------------------------------- platform
write(sysd / 'platform' / 'web.tokens.json', {"$schema": SCHEMA, "sys": {"font": {"$type": "fontFamily",
  "ui": alias("ref.font.ui"), "display": alias("ref.font.display"), "mono": alias("ref.font.mono")},
  "material": {"blur": {"$type": "number", "enabled": {"$value": 1}}}}})
write(sysd / 'platform' / 'apple.tokens.json', {"$schema": SCHEMA, "sys": {"font": {"$type": "fontFamily",
  "ui": alias("ref.font.ui", "Signature preset; the Native preset's brand file overrides ref.font.* with SF Pro names"), "display": alias("ref.font.display"), "mono": alias("ref.font.mono")},
  "material": {"blur": {"$type": "number", "enabled": {"$value": 1}}}}})
write(sysd / 'platform' / 'watch.tokens.json', {"$schema": SCHEMA, "sys": {"material": {"blur": {"$type": "number", "enabled": {"$value": 0, "$description": "no blur on watchOS: glass resolves to surface.raised"}}}}})

# ---------------------------------------------------------------- base (context-independent semantics)
write(sysd / 'base.tokens.json', {"$schema": SCHEMA, "sys": {
  "space": {"$type": "dimension", **{str(i): alias("ref.space.%d" % i) for i in range(0, 14)}},
  "radius": {"$type": "dimension", "control": alias("ref.radius.pill", "controls are pills or circles"), "chip": alias("ref.radius.pill"), "badge": alias("ref.radius.1"),
             "inner": alias("ref.radius.2"), "media": alias("ref.radius.3"), "tile": alias("ref.radius.5"), "card": alias("ref.radius.7", "regular card 24; compact 20"),
             "card-compact": alias("ref.radius.6"), "sheet": alias("ref.radius.8"), "card-large": alias("ref.radius.9"), "hero": alias("ref.radius.10")},
  "size": {"$type": "dimension", "icon": {"sm": alias("ref.size.icon.sm"), "md": alias("ref.size.icon.md"), "lg": alias("ref.size.icon.lg"), "ring": alias("ref.size.icon.ring")},
           "control": {"sm": alias("ref.size.control.sm"), "md": alias("ref.size.control.md"), "lg": alias("ref.size.control.lg")}},
  "opacity": {"$type": "number", "disabled": alias("ref.opacity.disabled"), "dimmed-row": alias("ref.opacity.dimmed-row")},
  "z": {"$type": "number", "base": {"$value": 0}, "raised": {"$value": 10}, "overlay": {"$value": 100}, "toast": {"$value": 1000}},
  "icon": {"$type": "number", "weight": {"$value": 400, "$description": "regular; maps to Phosphor regular / SF regular (spec/icons/registry.json)"}, "weight-display": {"$value": 200}},
  "chart": {"$type": "number", "curve": {"$value": 1, "$description": "1 = monotone (default), 2 = catmullRom(0.5), 3 = step"},
            "line-width": {"$value": 2}, "sparkline-width": {"$value": 1.5}, "comparison-width": {"$value": 1}, "marker-size": {"$value": 8}, "endpoint-size": {"$value": 10},
            "bar-max-thickness": {"$value": 24}, "bar-radius": {"$value": 4}, "gauge-stroke-ratio": {"$value": 0.10}},
  "stroke": {"$type": "strokeStyle",
             "target": {"$value": {"dashArray": [{"value": 8, "unit": "px"}, {"value": 6, "unit": "px"}], "lineCap": "round"}, "$description": "dashed reference / target line"},
             "grid": {"$value": {"dashArray": [{"value": 4, "unit": "px"}, {"value": 6, "unit": "px"}], "lineCap": "butt"}, "$description": "horizontal gridlines only; never solid, never vertical"},
             "leader": {"$value": {"dashArray": [{"value": 1.5, "unit": "px"}, {"value": 4.5, "unit": "px"}], "lineCap": "round"}, "$description": "dotted leaders in spec rows"}},
}})
print("wrote", sorted(str(p.relative_to(root)) for p in sysd.rglob('*.json')))
