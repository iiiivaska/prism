#!/usr/bin/env python3
"""Seed tokens/ref/*.tokens.json (DTCG 2025.10) from the reference-brand values in
docs/research/visual-dna.md. sRGB hex -> OKLCH computed here (CSS Color 4 math); the hex
fallback is kept alongside. Re-run after the visual DNA changes; the resolver build treats
these files as inputs, never as outputs."""
import json, math, pathlib, sys

def srgb_to_linear(c):
    return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4

def hex_to_oklch(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    r,g,b=map(srgb_to_linear,(r,g,b))
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b
    m=0.2119034982*r+0.6806995451*g+0.1073969566*b
    s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l_,m_,s_=l**(1/3),m**(1/3),s**(1/3)
    L=0.2104542553*l_+0.7936177850*m_-0.0040720468*s_
    a=1.9779984951*l_-2.4285922050*m_+0.4505937099*s_
    bb=0.0259040371*l_+0.7827717662*m_-0.8086757660*s_
    C=math.hypot(a,bb); H=math.degrees(math.atan2(bb,a))%360
    if C<1e-4: H=0.0
    return round(L,4),round(C,4),round(H,1)

def color(hexv, desc=None, alpha=1):
    L,C,H=hex_to_oklch(hexv)
    v={"$value":{"colorSpace":"oklch","components":[L,C,H],"alpha":alpha,"hex":hexv.lower()}}
    if desc: v["$description"]=desc
    return v

root=pathlib.Path(sys.argv[1])
ref=root/'tokens'/'ref'; ref.mkdir(parents=True,exist_ok=True)

neutral={"0":"#FFFFFF","50":"#F7F8FA","100":"#F1F2F5","150":"#E9EBEF","200":"#E1E3E8","300":"#C9CCD3","400":"#A6AAB4","500":"#7E838F","600":"#5C6068","700":"#40444C","800":"#282A30","850":"#1F2126","900":"#17191D","950":"#0D0E11","1000":"#050608"}
solar={"50":"#FFF7EC","100":"#FFEBD1","200":"#FFD8A8","300":"#FFC07A","400":"#F9A55A","500":"#F39444","600":"#DD7A24","700":"#B8561A","800":"#9C4512","900":"#6B2F0C","950":"#3D1A06"}
status={
 "success":{"dot-light":"#2DB24A","text-light":"#187530","tint-light":"#E6F6E9","dark":"#5CCB6A"},
 "warning":{"dot-light":"#F5B83D","text-light":"#8F5B00","tint-light":"#FEF6E8","dark":"#F5B83D"},
 "danger":{"dot-light":"#F04B45","text-light":"#BF2222","tint-light":"#FDE9E9","dark":"#FF5A55","mark-dark":"#FF4642","badge":"#E5252A"},
 "info":{"dot-light":"#4E6CCD","text-light":"#3D5BC4","tint-light":"#EAEDF9","dark":"#7A93F0","mark-dark":"#6B84E0","badge-dark":"#527AF1"},
}
series={"light":["#0E0F12","#B8561A","#4E6CCD","#1F8F80","#A64FA3","#6E7A22"],
        "dark":["#FFFFFF","#F39444","#6B84E0","#5BC8B5","#D48BD0","#D9C27A"]}
vivid={
 "orchid":{"angle":165,"stops":[("#E88BD0",0),("#B96CB4",45),("#6C5A66",100)],"grain":0.06,"scheme":"light"},
 "olive":{"angle":135,"stops":[("#4F5A38",0),("#8A9C42",55),("#C4DD6A",100)],"grain":0.05,"scheme":"light"},
 "rose":{"angle":135,"stops":[("#8E5A55",0),("#B3706A",50),("#C9927A",100)],"grain":0.05,"scheme":"light"},
 "sky":{"angle":165,"stops":[("#4A4C78",0),("#556BA6",50),("#8BA9C0",100)],"grain":0.06,"scheme":"light"},
 "ember-night":{"angle":160,"stops":[("#3D1A06",0),("#7A3A1E",45),("#C9642F",85),("#E38B3A",100)],"grain":0.08,"scheme":"dark"},
 "plum-dusk":{"angle":150,"stops":[("#1E1226",0),("#3A1F3F",40),("#5B4A7A",75),("#6F7FC8",100)],"grain":0.08,"scheme":"dark"},
 "forest-moss":{"angle":170,"stops":[("#0F1A14",0),("#1B2922",35),("#4E6040",80),("#6E7B3A",100)],"grain":0.08,"scheme":"dark"},
 "navy-cyan":{"angle":180,"stops":[("#252E3F",0),("#223545",45),("#5DA8B9",75),("#80B8C4",100)],"grain":0.10,"scheme":"dark"},
}

palette={"$schema":"https://www.designtokens.org/schemas/2025.10/format.json",
 "ref":{"color":{"$type":"color",
   "neutral":{"$description":"Near-neutral scale with a faint cool cast (OKLCH hue ~225, chroma ~0.004). Light reads from the top, dark from the bottom; dark surfaces are white-alpha steps over 950.",
              **{k:color(v) for k,v in neutral.items()}},
   "accent":{"$description":"Default brand accent 'solar' (hue ~30). Step 500 is the dark-scheme accent (7.4:1 on surface-1); step 800 is the light-scheme accent text (5.7:1 on page).",
             **{k:color(v) for k,v in solar.items()}},
   "status":{s:{k:color(v) for k,v in d.items()} for s,d in status.items()},
   "series":{sch:{str(i+1):color(h) for i,h in enumerate(lst)} for sch,lst in series.items()},
 }}}
(ref/'color.palette.tokens.json').write_text(json.dumps(palette,indent=2,ensure_ascii=False)+"\n")

grad={"$schema":"https://www.designtokens.org/schemas/2025.10/format.json",
 "ref":{"gradient":{"vivid":{"$type":"gradient",
   **{name:{"$value":[{"color":color(h)["$value"],"position":round(p/100,2)} for h,p in g["stops"]],
            "$description":f"{g['scheme']} vivid surface; linear {g['angle']} deg; grain {g['grain']:.2f}; see visual-dna.md for the text-safe zone",
            "$extensions":{"app.prism":{"angle":g["angle"],"grain":g["grain"],"scheme":g["scheme"],"bloom":{"alpha":0.30,"blur":150}}}}
     for name,g in vivid.items()}}}}}
(ref/'gradient.tokens.json').write_text(json.dumps(grad,indent=2,ensure_ascii=False)+"\n")

def dim(v,unit="px",desc=None):
    d={"$value":{"value":v,"unit":unit}}
    if desc: d["$description"]=desc
    return d
dims={"$schema":"https://www.designtokens.org/schemas/2025.10/format.json",
 "ref":{
  "space":{"$type":"dimension","$description":"4 px base. Tile gap 4-6 inside a slab, 12 between cards, 16-24 between groups, 32-40 between sections.",
    **{str(i):dim(v) for i,v in enumerate([0,4,6,8,12,16,20,24,32,36,40,48,64,104])}},
  "radius":{"$type":"dimension","$description":"Two shapes: pill (999) for controls and one big radius for cards. Inner radius = outer - padding.",
    **{k:dim(v) for k,v in {"0":0,"1":4,"2":8,"3":12,"4":14,"5":16,"6":20,"7":24,"8":28,"9":32,"10":40,"pill":999}.items()}},
  "size":{"$type":"dimension",
    "control":{"sm":dim(32),"md":dim(40,desc="pointer default"),"lg":dim(44,desc="touch default"),"xl":dim(52)},
    "hit":{"pointer":dim(28),"touch":dim(44)},
    "icon":{"xs":dim(12),"sm":dim(16),"md":dim(20),"lg":dim(24),"ring":dim(44,desc="icon ring in corner-pinned cards")},
    "card":{"min":dim(200)}},
  "border":{"$type":"dimension","hairline":dim(1),"strong":dim(1.5),"focus":dim(2)},
  "blur":{"$type":"dimension","chip":dim(20),"glass":dim(32),"glass-light":dim(40),"bloom":dim(150)},
 }}
(ref/'dimension.tokens.json').write_text(json.dumps(dims,indent=2,ensure_ascii=False)+"\n")

def num(v,desc=None):
    d={"$value":v}
    if desc: d["$description"]=desc
    return d
opac={"$schema":"https://www.designtokens.org/schemas/2025.10/format.json",
 "ref":{"opacity":{"$type":"number",
   "text":{"secondary":num(0.64),"tertiary":num(0.55),"dimmed":num(0.42,"trailing digits and units >= 24 pt only (4.0:1 on surface-1)")},
   "surface":{"step-1":num(0.06,"white over neutral.950 = surface.1"),"step-2":num(0.09),"step-3":num(0.12),"raised":num(0.03,"+3% white over the parent")},
   "hairline":num(0.08),"boundary":num(0.30),
   "tint":{"status":num(0.10),"accent":num(0.12),"accent-dark":num(0.14)},
   "glass":{"dark":num(0.60),"light":num(0.30),"chip":num(0.16),"toolbar":num(0.25),"selected":num(0.26)},
   "chart":{"band":num(0.06),"grid":num(0.12),"comparison":num(0.40),"reference":num(0.60)},
   "disabled":num(0.38),"dimmed-row":num(0.30,"done/next rows in a stepper")}}}
(ref/'opacity.tokens.json').write_text(json.dumps(opac,indent=2,ensure_ascii=False)+"\n")
# Typography roles (brand-agnostic scale; families come from the brand's font slots).
def typo(size, weight, lh, tracking=0.0, desc=None, slot="ui", numeric=None):
    d={"$value":{"fontFamily":"{ref.font.%s}"%slot,"fontSize":{"value":size,"unit":"px"},"fontWeight":weight,
                 "lineHeight":lh,"letterSpacing":{"value":tracking,"unit":"px"}}}
    ext={"slot":slot}
    if numeric: ext["numeric"]=numeric
    d["$extensions"]={"app.prism":ext}
    if desc: d["$description"]=desc
    return d
typ={"$schema":"https://www.designtokens.org/schemas/2025.10/format.json",
 "ref":{
  "font":{"$type":"fontFamily",
    "ui":{"$value":["Onest","Inter","system-ui","sans-serif"],"$description":"Signature preset. Native preset overrides to SF Pro / Inter via the platform modifier."},
    "display":{"$value":["Onest","Inter","system-ui","sans-serif"]},
    "mono":{"$value":["JetBrains Mono","ui-monospace","SF Mono","Menlo","monospace"]}},
  "type":{"$type":"typography","$description":"Roles; sizes are regular density. Weights: 200-300 heroes, 400 everything, 500 chips/active tab, 600 page H1 only.",
    "display":{"xl":typo(64,300,1.0,-1.28,"page hero titles; dark scheme may drop to 200",slot="display"),
               "lg":typo(48,300,1.0,-0.48,slot="display"),
               "md":typo(40,400,1.05,slot="display")},
    "title":{"lg":typo(32,500,1.1,desc="H1; two-tone variant: second line in text.secondary"),
             "md":typo(24,500,1.15),
             "sm":typo(20,500,1.2)},
    "headline":typo(18,400,1.3,desc="card titles, never bold"),
    "body":{"lg":typo(17,400,1.5),"md":typo(15,400,1.5),"sm":typo(14,400,1.45,desc="dense web tables")},
    "label":{"lg":typo(15,500,1.2),"md":typo(13,500,1.2),"sm":typo(12,500,1.2)},
    "caption":typo(12,400,1.35,desc="'7m ago', 'Rolling average'; secondary color"),
    "micro":typo(11,500,1.2,desc="badges only; never functional body text"),
    "eyebrow":typo(13,500,1.2,0.39,"uppercase, at most one per card"),
    "metric":{"xl":typo(48,300,1.0,-0.48,"hero numeral; 200 on dark >= 32 px; trailing group in text.dimmed at the same size",slot="display",numeric="proportional"),
              "lg":typo(32,300,1.0,desc="card metric",slot="display",numeric="proportional"),
              "md":typo(20,400,1.1,desc="inline metric '41 %'",slot="display",numeric="tabular"),
              "unit":typo(12,400,1.0,desc="baseline-aligned unit, 6 px gap, secondary color")},
    "data":typo(13,400,1.3,desc="tables, axes, timers, live counters",numeric="tabular"),
  }}}
(ref/'typography.tokens.json').write_text(json.dumps(typ,indent=2,ensure_ascii=False)+"\n")

# Motion: durations, easings, springs (transition + app.prism.spring extension = source of truth).
def dur(ms,desc=None):
    d={"$value":{"value":ms,"unit":"ms"}}
    if desc: d["$description"]=desc
    return d
def spring(duration,bounce,settle_ms,easing,desc,blend=None):
    ext={"duration":duration,"bounce":bounce,"settle":round(settle_ms/1000,3)}
    if blend is not None: ext["blendDuration"]=blend
    return {"$value":{"duration":{"value":settle_ms,"unit":"ms"},"delay":{"value":0,"unit":"ms"},"timingFunction":"{ref.motion.easing.%s}"%easing},
            "$extensions":{"app.prism":{"spring":ext}},"$description":desc}
mot={"$schema":"https://www.designtokens.org/schemas/2025.10/format.json",
 "ref":{"motion":{
   "duration":{"$type":"duration","instant":dur(0,"no animation: keyboard-initiated and 100+/day actions"),"quick":dur(100,"press feedback, hover color"),
               "fast":dur(150,"tooltips, small popovers"),"base":dur(250,"dropdowns, toasts, crossfades"),"slow":dur(350,"modals, sheets on the non-spring path"),"slower":dur(500,"first-run and explanatory only")},
   # Easing roles per ADR-0023 §9; kebab-case names (ADR-0024 §2, S7).
   "easing":{"$type":"cubicBezier",
     "out":{"$value":[0.23,1,0.32,1],"$description":"enter and exit (exit mirrors enter), press and release feedback, the Reduce Motion substitutes, state changes on the non-spring path (ADR-0023 §9)"},
     "in-out":{"$value":[0.77,0,0.175,1],"$description":"on-screen movement and morphs on the non-spring path (ADR-0023 §9)"},
     "drawer":{"$value":[0.32,0.72,0,1],"$description":"sheets and drawers on the non-spring path (ADR-0023 §9)"},
     "hover":{"$value":[0.25,0.1,0.25,1],"$description":"hover color and opacity only (ADR-0023 §9)"},
     "linear":{"$value":[0,0,1,1],"$description":"constant motion: progress, marquee, ambient rotation (ADR-0023 §9)"}},
   "spring":{"$type":"transition",
     "interactive":spring(0.15,0.0,220,"out","tracks a live gesture; Apple interactiveSpring duration and blend (0.15 s, 0.25 s); bounce 0 is Prism's choice, Apple's interactiveSpring bounce is 0.15 (ADR-0023)",blend=0.25),
     "snappy":spring(0.35,0.15,487,"out","default for state changes: toggles, segmented controls, selection, popovers"),
     "smooth":spring(0.40,0.0,587,"in-out","reposition / layout / morph with no overshoot"),
     "sheet":spring(0.30,0.20,404,"drawer","sheets and drawers after a flick or drag release"),
     "bouncy":spring(0.50,0.30,818,"out","delight tier only")},
 }}}
(ref/'motion.tokens.json').write_text(json.dumps(mot,indent=2,ensure_ascii=False)+"\n")

# Elevation primitives (shadow composites). Scheme files alias these; dark E1 is a luminance step, not a shadow.
def shadow(x,y,blur,spread,hexv,alpha):
    return {"color":{"colorSpace":"srgb","components":[int(hexv[1:3],16)/255,int(hexv[3:5],16)/255,int(hexv[5:7],16)/255],"alpha":alpha,"hex":hexv.lower()},
            "offsetX":{"value":x,"unit":"px"},"offsetY":{"value":y,"unit":"px"},"blur":{"value":blur,"unit":"px"},"spread":{"value":spread,"unit":"px"}}
elev={"$schema":"https://www.designtokens.org/schemas/2025.10/format.json",
 "ref":{"shadow":{"$type":"shadow","$description":"Depth is a luminance ladder; shadows only under things that float over imagery.",
   "none":{"$value":[shadow(0,0,0,0,"#000000",0)]},
   "light":{"raised":{"$value":[shadow(0,2,6,0,"#000000",0.05)]},"floating":{"$value":[shadow(0,6,16,0,"#000000",0.07)]},
            "overlay":{"$value":[shadow(0,24,60,0,"#141414",0.10)]},"drawer":{"$value":[shadow(0,30,80,0,"#000000",0.25)]}},
   "dark":{"floating":{"$value":[shadow(0,8,24,0,"#000000",0.30)]},"overlay":{"$value":[shadow(0,24,48,0,"#000000",0.35)]},"modal":{"$value":[shadow(0,30,80,0,"#000000",0.50)]}},
 }}}
(ref/'elevation.tokens.json').write_text(json.dumps(elev,indent=2,ensure_ascii=False)+"\n")

print("wrote", [p.name for p in sorted(ref.glob('*.json'))])
print("sample oklch neutral.950", hex_to_oklch("#0D0E11"), "accent.500", hex_to_oklch("#F39444"))
