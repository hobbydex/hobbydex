#!/usr/bin/env python3
"""Hardware drawings for nuts, washers, e-clips, pins and pinions: one SVG per spec.

The geometry comes from the spec TOML files (hobbydex-rc/data/specs), built in
FreeCAD: hex, nylon-insert and square nuts, rings, pins and e-clips from the spec's
own dimensions; M5 flange nuts from the Fasteners add-on (ISO 4161); spur gears from
the Gears add-on's involute profile (pygears). Each spec is projected with TechDraw;
the filled silhouette is the solid's own triangles, projected the same way, rasterised
and traced with potrace: every face the eye sees is filled, and a hole is left open
just where the line of sight passes through the solid. Specs that cannot be drawn
faithfully are left out, with the reason counted. Run from the repo root:

    python3 tools/hardware/make_more_drawings.py [--specs DIR] [--links hobbydex-rc.json]

--links is the generated site data (link counts, for the order of the work); it is
optional. FreeCAD runs through flatpak in up to 8 processes; its work files go to
~/.cache/hobbydex-hardware-more, or to
$HOBBYDEX_HARDWARE_WORK (the flatpak cannot read /tmp).
"""
import inspect
import json
import math
import os
import re
import subprocess
import sys
import time
import tomllib
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/assets/hardware"
# HOBBYDEX_HARDWARE_WORK gives a run its own work dir (under the home dir: the flatpak cannot read /tmp)
WORK = Path(os.environ.get("HOBBYDEX_HARDWARE_WORK") or Path.home() / ".cache/hobbydex-hardware-more")
SPECS = Path.home() / "workspace/somatik/hobbydex-rc/data/specs"
MOD = Path.home() / ".var/app/org.freecad.FreeCAD/data/FreeCAD/v1-1/Mod"
PX = 30                  # raster pixels per mm for the nesting pitch
TRACE_PX = 60            # raster pixels per mm for the traced silhouette: its steps stay under the half line width
MESH_MM = 0.01           # tessellation deflection for the silhouette: under one traced raster pixel
PAD = 0.3                # mm around the drawing in the viewBox
PROCS = 8                # FreeCAD processes at most
CAMERA = (1, -1, 1)      # one true isometric camera for every drawing; world Z is turned to point up
GEAR_FACE = 4.0          # mm; the data gives no face width for pinions
GEAR_PRESSURE = 20.0     # degrees
BORE_MM = 3.17           # bore of the 32 and 48 dp pinions, where the data states none
STROKE_PX = 1           # line weight in CSS px, the same on every drawing

# ISO hex nut heights (mm) by nominal diameter, used when the spec states no height
REG_H = {1.6: 1.3, 2: 1.6, 2.5: 2.0, 3: 2.4, 4: 3.2, 5: 4.7, 6: 5.2, 8: 6.8}     # ISO 4032
THIN_H = {1.6: 1.0, 2: 1.2, 2.5: 1.6, 3: 1.8, 4: 2.2, 5: 2.7, 6: 3.2, 8: 4.0}   # ISO 4035
LOW_NYLON_H = {3: 4.0, 4: 5.0, 5: 5.0, 6: 6.0}                                  # ISO 10511 low form
FLANGE_SIZES = {"M5", "M6", "M8", "M10"}   # the ISO 4161 range in the Fasteners add-on


def thread_d(thread):
    m = re.fullmatch(r"M(\d+(?:\.\d+)?)", thread or "")
    return float(m.group(1)) if m else None


def bore_of(d):
    return 0.84 * d      # minor diameter, a fixed share of the nominal one


def plan_nut(s):
    """A job for the nut, or the reason it is left out."""
    t, af, h = s.get("type"), s.get("across_flats_mm"), s.get("height_mm")
    d = thread_d(s.get("thread"))
    if t == "hex":
        if d not in REG_H or af is None:
            return None, "hex nut: thread not an ISO metric size or no across flats stated"
        thin = s.get("profile") == "thin"
        hh = h if h is not None else (THIN_H if thin else REG_H)[d]
        return {"op": "hex", "af": af, "h": hh, "bore": bore_of(d)}, None
    if t == "square":
        if af is None or h is None:
            return None, "square nut: size not stated"
        return {"op": "square", "af": af, "h": h, "bore": bore_of(d or 0)}, None
    if t == "nylon-lock":
        if af is None or d not in LOW_NYLON_H:
            return None, "nylon insert nut: no across flats, or a size outside the DIN 985 / ISO 10511 range"
        hh = h if h is not None else LOW_NYLON_H[d]
        return {"op": "nylon", "af": af, "h": hh, "bore": bore_of(d)}, None
    if t in ("flanged", "serrated-flange"):
        name = f"M{d:g}" if d is not None else ""
        if name not in FLANGE_SIZES:
            return None, "flange nut: ISO 4161 starts at M5 and the spec states no flange size"
        return {"op": "flange", "size": name, "bore": bore_of(d)}, None
    reasons = {
        "lock": "lock nut: locking kind not stated, no shape",
        "metal-lock": "all-metal lock nut: no size or shape stated",
        "flanged-lock": "flanged lock nut: locking kind and flange size not stated",
        "flanged-nylon-lock": "flanged nylon lock nut: flange size varies between brands",
        "flanged-dome": "flanged dome nut: no standard shape",
        "serrated-flange-nylon-lock": "serrated flange nylon lock nut: flange size varies between brands",
        "dome": "dome (acorn) nut: height not stated",
        "knurled": "knurled thumb nut: no size stated",
        "wing": "wing nut: no size stated",
        "wheel": "wheel nut: height and shape not stated",
    }
    return None, reasons.get(t, f"nut type {t} not handled")


def plan_washer(s):
    if s.get("shape"):
        return None, f"{s['shape']} washer: profile not in the data"
    b, o, t = s["bore_mm"], s["outer_mm"], s["thickness_mm"]
    if not (0 < b < o and t > 0):
        return None, "washer: bore, outer or thickness not usable"
    return {"op": "washer", "bore": b, "outer": o, "t": t}, None


def plan_pin(s):
    d, L = s["diameter_mm"], s["length_mm"]
    if not (d > 0 and L > 0):
        return None, "pin: diameter or length not usable"
    return {"op": "pin", "d": d, "L": L, "c": max(0.1, 0.1 * d)}, None


# DIN 6799 sizes in the Fasteners add-on (its Diameter is the shaft range):
# (name, shaft from, shaft to, outer diameter, thickness), as the add-on builds them
DIN6799 = [
    ("2-2.5 mm", 2, 2.5, 4.25, 0.4), ("2.5-3 mm", 2.5, 3, 4.8, 0.5), ("3-4 mm", 3, 4, 6.3, 0.6),
    ("4-5 mm", 4, 5, 7.3, 0.6), ("5-7 mm", 5, 7, 9.3, 0.7), ("6-8 mm", 6, 8, 11.3, 0.7),
    ("7-9 mm", 7, 9, 12.3, 0.7), ("8-11 mm", 8, 11, 14.3, 0.9), ("9-12 mm", 9, 12, 16.3, 1.0),
    ("10-14 mm", 10, 14, 18.8, 1.1), ("11-15 mm", 11, 15, 20.4, 1.2), ("13-18 mm", 13, 18, 23.4, 1.3),
    ("16-24 mm", 16, 24, 29.4, 1.5), ("20-31 mm", 20, 31, 37.6, 1.75), ("25-38 mm", 25, 38, 44.6, 2.0),
    ("32-42 mm", 32, 42, 52.6, 2.5),
]


def plan_eclip(s):
    if s.get("variant") == "bowed":
        return None, "bowed E-ring: shape not in the data"
    if "din_outer_mm" not in s or "din_thickness_mm" not in s:
        return None, "e-clip: no DIN 6799 size stated"
    shaft, outer, t = s["shaft_mm"], s["din_outer_mm"], s["din_thickness_mm"]
    hits = [r for r in DIN6799 if r[1] <= shaft <= r[2] and abs(r[3] - outer) < 0.05 and abs(r[4] - t) < 0.05]
    if not hits:
        if shaft < DIN6799[0][1]:
            return None, "e-clip: shaft below the DIN 6799 sizes in the add-on (2 mm)"
        return None, "e-clip: the add-on has no DIN 6799 size with this outer diameter and thickness"
    return {"op": "eclip", "size": hits[0][0]}, None


def plan_pinion(s):
    z = s["teeth"]
    m = s["module"] if "module" in s else 25.4 / s["pitch_dp"]
    if z < 6:
        return None, "pinion: too few teeth for the profile"
    root = m * (z - 2.5)                  # root diameter, mm
    job = {"op": "gear", "pts": gear_points(z, m), "t": GEAR_FACE, "bore": 0.0, "hub": 0.0}
    if s.get("pitch_dp") in (32, 48) and BORE_MM <= 0.8 * root:
        job["bore"] = BORE_MM
    else:
        job["hub"] = 0.3 * root               # plain hub circle: no bore is stated
    return job, None


def gear_points(z, m):
    """The involute tooth profile (mm), from the Gears add-on's pygears core."""
    from pygears.profile import InvoluteProfile
    prof = InvoluteProfile(m=m, num_teeth=z, pressure_angle=math.radians(GEAR_PRESSURE), clearance=0.25, shift=0.0)
    pts = [(round(float(x), 4), round(float(y), 4)) for x, y in prof.profile(num=2)]
    out = []
    for q in pts:                         # the sampler repeats points where flank and root meet
        if not out or out[-1] != q:
            out.append(q)
    if out[-1] == out[0]:
        out.pop()
    return out


def plan(kind, s):
    if kind == "nut":
        return plan_nut(s)
    if kind == "washer":
        return plan_washer(s)
    if kind == "eclip":
        return plan_eclip(s)
    if kind == "pin":
        return plan_pin(s)
    if kind == "o-ring":
        return plan_oring(s)
    if kind == "circlip":
        return plan_circlip(s)
    return plan_pinion(s)


def plan_oring(s):
    d, c = s["inner_mm"], s["cross_mm"]
    if not (d > 0 and c > 0):
        return None, "o-ring: inner diameter or cross-section not usable"
    return {"op": "oring", "inner": d, "cross": c}, None


# DIN 471 external retaining rings: shaft -> (thickness s, free inner diameter d3, lug reach a, back width b, hole d5),
# the table the Fasteners add-on carries (FsData/din471def.csv); the add-on's own solid is not used (see circlip_profile)
DIN471 = {3: (0.4, 2.7, 2, 0.8, 1), 4: (0.4, 3.7, 2.2, 0.9, 1), 5: (0.6, 4.7, 2.5, 1.1, 1), 6: (0.7, 5.6, 2.7, 1.3, 1.2),
          7: (0.8, 6.5, 3.1, 1.4, 1.2), 8: (0.8, 7.4, 3.2, 1.5, 1.2), 9: (1, 8.4, 3.3, 1.7, 1.2), 10: (1, 9.3, 3.3, 1.8, 1.5),
          11: (1, 10.2, 3.3, 1.8, 1.5), 12: (1, 11, 3.3, 1.8, 1.7), 13: (1, 11.9, 3.4, 2, 1.7), 14: (1, 12.9, 3.5, 2.1, 1.7),
          15: (1, 13.8, 3.6, 2.2, 1.7), 16: (1, 14.7, 3.7, 2.2, 1.7)}


def plan_circlip(s):
    shaft = s["shaft_mm"]
    if shaft == int(shaft) and int(shaft) in DIN471:
        t, d3, a, b, d5 = DIN471[int(shaft)]
        return {"op": "circlip", "t": t, "d3": d3, "a": a, "b": b, "d5": d5}, None
    if shaft < 3:
        # below DIN 471: the 3 mm ring scaled to the shaft
        t, d3, a, b, d5 = (v * shaft / 3 for v in DIN471[3])
        return {"op": "circlip", "t": t, "d3": d3, "a": a, "b": b, "d5": d5}, None
    return None, "circlip: shaft size not in the DIN 471 table"


KINDS = ("nut", "washer", "eclip", "pin", "pinion", "o-ring", "circlip")


def load_specs(root):
    out = []
    for kind in KINDS:
        for f in sorted((root / kind).glob("*.toml")):
            s = tomllib.loads(f.read_text())
            out.append((kind, s))
    return out


def slug_of(spec_id):
    return spec_id.removeprefix("spec/").replace("/", "-")


def circlip_profile(d3, a, b, d5):
    """DIN 471 outline (mm), gap towards -y: inner circle d3, ring width b at the back narrowing to the lugs, lugs a below
    the inner circle with holes d5. The add-on's DIN 471 solid cuts the lug holes in half for the small sizes, so the
    outline is built here from the same table values. Returns the pieces of the half x >= 0 as drawing commands."""
    ri = d3 / 2
    s = 0.3 * b                      # the outer circle sits s above the ring centre: thick at the back, thin at the lugs
    Ro = ri + b - s
    hg = 0.75 * d5                   # half the gap between the lugs
    rt = 0.85 * d5                   # lug tip radius: the hole has d5 / 2
    y0 = -math.sqrt(ri * ri - hg * hg)
    c2 = (hg + rt, y0 - a + rt)      # lug tip centre; the lug ends a below the inner circle
    dx, dy = c2[0], c2[1] - s
    L = math.hypot(dx, dy)
    beta = math.acos((Ro - rt) / L)
    ang = math.atan2(dy, dx) + beta  # outward normal of the common tangent of the outer circle and the tip circle
    n = (math.cos(ang), math.sin(ang))
    P1 = (Ro * n[0], s + Ro * n[1])
    P2 = (c2[0] + rt * n[0], c2[1] + rt * n[1])
    return {"ri": ri, "s": s, "Ro": Ro, "hg": hg, "rt": rt, "y0": y0, "c2": c2, "P1": P1, "P2": P2, "n": n}


# the FreeCAD side: one projection per job, as TechDraw SVG fragments
FREECAD = r'''
import sys, json, math, FreeCAD, Part, TechDraw
sys.path.append(FreeCAD.getUserAppDataDir() + "Mod/fasteners")
import FastenersCmd
V = FreeCAD.Vector

def rev(profile):
    """A solid of revolution about Z from a closed (r, z) profile."""
    pts = [V(r, 0, z) for r, z in profile]
    pts.append(pts[0])
    return Part.Face(Part.makePolygon(pts)).revolve(V(0, 0, 0), V(0, 0, 1), 360)

def cut_bore(shape, bore, h):
    if bore > 0:
        shape = shape.cut(Part.makeCylinder(bore / 2, h + 2, V(0, 0, -1)))
    return shape

def hex_body(af, h, bore):
    # hex prism with 30 degree chamfers on both faces, as the ISO nuts have
    R = af / math.sqrt(3)
    pts = [V(R * math.cos(math.radians(60 * k)), R * math.sin(math.radians(60 * k)), 0) for k in range(7)]
    prism = Part.Face(Part.makePolygon(pts)).extrude(V(0, 0, h))
    r0, rc = af / 2 * 0.95, R + 0.5
    dz = (rc - r0) * math.tan(math.radians(30))
    body = prism.common(rev([(0, 0), (r0, 0), (rc, dz), (rc, h - dz), (r0, h), (0, h)]))
    return cut_bore(body, bore, h)

def nylon_body(af, h, bore):
    h0 = h * 0.6
    low = hex_body(af, h0, 0)
    rc, c = af / 2 * 0.98, 0.25 * (h - h0)
    collar = rev([(0, h0 - 0.01), (rc, h0 - 0.01), (rc, h - c), (rc - c, h), (0, h)])
    return cut_bore(low.fuse(collar), bore, h)

def square_body(af, h, bore):
    box = Part.makeBox(af, af, h, V(-af / 2, -af / 2, 0))
    return cut_bore(box, bore, h)

def poly_face(pts, t, z0=0):
    p = [V(x, y, z0) for x, y in pts]
    p.append(p[0])
    return Part.Face(Part.makePolygon(p)).extrude(V(0, 0, t))


def circlip_body(job):
    g = circlip_profile(job["d3"], job["a"], job["b"], job["d5"])
    ri, s, Ro, hg, rt, y0, c2, P1, P2 = (g[k] for k in ("ri", "s", "Ro", "hg", "rt", "y0", "c2", "P1", "P2"))
    mid_o = (Ro * math.cos(math.radians(45)), s + Ro * math.sin(math.radians(45)))
    edges = [
        Part.Arc(V(0, ri + job["b"], 0), V(mid_o[0], mid_o[1], 0), V(P1[0], P1[1], 0)).toShape(),
        Part.makeLine(V(P1[0], P1[1], 0), V(P2[0], P2[1], 0)),
        Part.Arc(V(P2[0], P2[1], 0), V(c2[0] + rt * math.cos(math.radians(-90)), c2[1] + rt * math.sin(math.radians(-90)), 0), V(hg, c2[1], 0)).toShape(),
        Part.makeLine(V(hg, c2[1], 0), V(hg, y0, 0)),
        Part.Arc(V(hg, y0, 0), V(ri * math.cos(math.radians(-25)), ri * math.sin(math.radians(-25)), 0), V(ri, 0, 0)).toShape(),
        Part.Arc(V(ri, 0, 0), V(ri * math.cos(math.radians(45)), ri * math.sin(math.radians(45)), 0), V(0, ri, 0)).toShape(),
        Part.makeLine(V(0, ri, 0), V(0, ri + job["b"], 0)),
    ]
    half = Part.Face(Part.Wire(Part.__sortEdges__(edges))).extrude(V(0, 0, job["t"]))
    half = half.cut(Part.makeCylinder(job["d5"] / 2, job["t"] + 2, V(c2[0], c2[1], -1)))
    return half.fuse(half.mirror(V(0, 0, 0), V(1, 0, 0))).removeSplitter()

def build(job):
    op = job["op"]
    if op == "hex":
        return hex_body(job["af"], job["h"], job["bore"])
    if op == "nylon":
        return nylon_body(job["af"], job["h"], job["bore"])
    if op == "square":
        return square_body(job["af"], job["h"], job["bore"])
    if op == "washer":
        ring = Part.makeCylinder(job["outer"] / 2, job["t"])
        return ring.cut(Part.makeCylinder(job["bore"] / 2, job["t"] + 2, V(0, 0, -1)))
    if op == "pin":
        r, c, L = job["d"] / 2, job["c"], job["L"]
        return rev([(0, 0), (r - c, 0), (r, c), (r, L - c), (r - c, L), (0, L)])
    if op == "gear":
        g = poly_face(job["pts"], job["t"])
        if job["bore"] > 0:
            return g.cut(Part.makeCylinder(job["bore"] / 2, job["t"] + 2, V(0, 0, -1)))
        if job["hub"] > 0:
            # a hub boss 0.2 mm proud of the face: its top circle is an edge the projection shows
            return g.fuse(Part.makeCylinder(job["hub"] / 2, job["t"] + 0.2, V(0, 0, 0)))
        return g
    if op == "eclip":
        doc = FreeCAD.ActiveDocument
        obj = doc.addObject("Part::FeaturePython", "Eclip")
        FastenersCmd.FSScrewObject(obj, "DIN6799", None)
        obj.Diameter = job["size"]
        doc.recompute()
        return obj.Shape
    if op == "oring":
        return Part.makeTorus((job["inner"] + job["cross"]) / 2, job["cross"] / 2)
    if op == "circlip":
        return circlip_body(job)
    if op == "flange":
        doc = FreeCAD.ActiveDocument
        obj = doc.addObject("Part::FeaturePython", "Flange")
        FastenersCmd.FSScrewObject(obj, "ISO4161", None)
        obj.Diameter = job["size"]
        doc.recompute()
        return obj.Shape
    raise ValueError("unknown op " + op)

for job in json.loads(open(JOBS_JSON).read()):
    doc = FreeCAD.newDocument("job")
    try:
        view = V(*job["view"])
        for i, e in enumerate([V(10, 0, 0), V(0, 10, 0), V(0, 0, 10)]):
            open(job["axes"][i], "w").write(TechDraw.projectToSVG(Part.makeLine(V(0, 0, 0), e), view, ""))
        shape = build(job)
        if shape.isNull() or not shape.isValid() or not shape.Edges:
            raise ValueError("empty shape")
        open(job["lines"], "w").write(TechDraw.projectToSVG(shape, view, ""))
        # the solid's triangles, for the silhouette
        pts, tris = shape.tessellate(job["mesh_mm"])
        json.dump({"pts": [[p.x, p.y, p.z] for p in pts], "tris": [list(t) for t in tris]}, open(job["mesh"], "w"))
        print("OK", job["slug"])
    except Exception as err:
        print("FAILED", job["slug"], err)
    finally:
        for name in list(FreeCAD.listDocuments()):
            FreeCAD.closeDocument(name)
'''

NUM = re.compile(r"[MLCQZAmlcqza]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")
TRANSFORM = re.compile(r"(\w+)\(([^)]*)\)")


def transform_matrix(text):
    """The 3x3 matrix of an SVG transform list (applied right to left, as SVG does)."""
    m = np.eye(3)
    for name, args in TRANSFORM.findall(text or ""):
        a = [float(v) for v in re.split(r"[ ,]+", args.strip()) if v]
        if name == "rotate":
            r = math.radians(a[0])
            f = np.array([[math.cos(r), -math.sin(r), 0], [math.sin(r), math.cos(r), 0], [0, 0, 1]])
        elif name == "scale":
            f = np.diag([a[0], a[1] if len(a) > 1 else a[0], 1.0])
        elif name == "translate":
            f = np.array([[1, 0, a[0]], [0, 1, a[1] if len(a) > 1 else 0], [0, 0, 1]])
        else:
            raise ValueError(f"transform {name} not supported")
        m = m @ f
    return m


def path_segments(d):
    """Absolute segments [(cmd, [(x, y), ...])] of an SVG path; M L C Z, relative too."""
    toks = NUM.findall(d)
    segs, i, cur, start, cmd = [], 0, (0.0, 0.0), (0.0, 0.0), None
    while i < len(toks):
        if re.match(r"[A-Za-z]", toks[i]):
            cmd = toks[i]; i += 1
            if cmd in "Zz":
                segs.append(("Z", []))
                cur = start
                continue
        rel = cmd.islower()
        c = cmd.upper()
        if c == "M":
            p = (float(toks[i]), float(toks[i + 1])); i += 2
            if rel: p = (p[0] + cur[0], p[1] + cur[1])
            segs.append(("M", [p])); cur = start = p
            cmd = "l" if rel else "L"   # further pairs are line segments
        elif c == "L":
            p = (float(toks[i]), float(toks[i + 1])); i += 2
            if rel: p = (p[0] + cur[0], p[1] + cur[1])
            segs.append(("L", [p])); cur = p
        elif c == "C":
            vals = [float(v) for v in toks[i:i + 6]]; i += 6
            pts = [(vals[k], vals[k + 1]) for k in (0, 2, 4)]
            if rel: pts = [(x + cur[0], y + cur[1]) for x, y in pts]
            segs.append(("C", pts)); cur = pts[-1]
        elif c == "Q":
            vals = [float(v) for v in toks[i:i + 4]]; i += 4
            q = (vals[0], vals[1]); p = (vals[2], vals[3])
            if rel:
                q = (q[0] + cur[0], q[1] + cur[1]); p = (p[0] + cur[0], p[1] + cur[1])
            c1 = (cur[0] + 2 / 3 * (q[0] - cur[0]), cur[1] + 2 / 3 * (q[1] - cur[1]))
            c2 = (p[0] + 2 / 3 * (q[0] - p[0]), p[1] + 2 / 3 * (q[1] - p[1]))
            segs.append(("C", [c1, c2, p])); cur = p
        elif c == "A":
            vals = [float(v) for v in toks[i:i + 7]]; i += 7
            end = (vals[5], vals[6])
            if rel: end = (end[0] + cur[0], end[1] + cur[1])
            segs.append(("A", [cur, end], (vals[0], vals[1], vals[2], int(vals[3]), int(vals[4]))))
            cur = end
        else:
            raise ValueError(f"path command {cmd} not supported")
    return segs


def arc_points(p1, rx, ry, phi_deg, large, sweep, p2, n=16):
    """Points along an SVG elliptical arc from p1 to p2 (end points, not the centre), p1 excluded."""
    if p1 == p2: return [p2]
    rx, ry = abs(rx), abs(ry)
    phi = math.radians(phi_deg); cp, sp = math.cos(phi), math.sin(phi)
    dx2, dy2 = (p1[0] - p2[0]) / 2, (p1[1] - p2[1]) / 2
    x1p, y1p = cp * dx2 + sp * dy2, -sp * dx2 + cp * dy2
    lam = x1p**2 / rx**2 + y1p**2 / ry**2
    if lam > 1: rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
    num = rx**2 * ry**2 - rx**2 * y1p**2 - ry**2 * x1p**2
    co = math.sqrt(max(0.0, num / (rx**2 * y1p**2 + ry**2 * x1p**2)))
    if bool(large) == bool(sweep): co = -co
    cxp, cyp = co * rx * y1p / ry, -co * ry * x1p / rx
    cx = cp * cxp - sp * cyp + (p1[0] + p2[0]) / 2
    cy = sp * cxp + cp * cyp + (p1[1] + p2[1]) / 2
    def ang(u, v):
        return math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1])
    a1 = ang((1, 0), ((x1p - cxp) / rx, (y1p - cyp) / ry))
    da = ang(((x1p - cxp) / rx, (y1p - cyp) / ry), ((-x1p - cxp) / rx, (-y1p - cyp) / ry))
    if not sweep and da > 0: da -= 2 * math.pi
    if sweep and da < 0: da += 2 * math.pi
    pts = []
    for k in range(1, n + 1):
        t = a1 + da * k / n
        x = rx * math.cos(t); y = ry * math.sin(t)
        pts.append((cp * x - sp * y + cx, sp * x + cp * y + cy))
    pts[-1] = p2
    return pts


def apply(m, pts):
    return [tuple((m @ np.array([x, y, 1.0]))[:2]) for x, y in pts]


def sample_segments(segs):
    """Polylines (lists of points) for the segments, curves sampled."""
    lines, cur = [], []
    for seg in segs:
        cmd, pts = seg[0], seg[1]
        if cmd == "A":
            rx, ry, phi, large, sweep = seg[2]
            cur.extend(arc_points(pts[0], rx, ry, phi, large, sweep, pts[1]))
        elif cmd == "M":
            if len(cur) > 1: lines.append(cur)
            cur = [pts[0]]
        elif cmd == "L":
            cur.append(pts[0])
        elif cmd == "C" and cur:
            p0 = cur[-1]
            for k in range(1, 9):
                t = k / 8
                x = (1-t)**3*p0[0] + 3*(1-t)**2*t*pts[0][0] + 3*(1-t)*t*t*pts[1][0] + t**3*pts[2][0]
                y = (1-t)**3*p0[1] + 3*(1-t)**2*t*pts[0][1] + 3*(1-t)*t*t*pts[1][1] + t**3*pts[2][1]
                cur.append((x, y))
    if len(cur) > 1: lines.append(cur)
    return lines


def fmt(v):
    s = f"{round(v, 2):.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def d_string(segs):
    out = []
    for cmd, pts in segs:
        if cmd == "Z":
            out.append("Z"); continue
        out.append(cmd + " " + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in pts))
    return " ".join(out)


def read_fragment(svg, transform):
    """The projected lines of a TechDraw fragment, transformed to mm (y down, as the SVG shows them).
    Arcs stay arcs: the transform must be orthogonal (a turn and maybe a mirror). A turn adds to an
    ellipse's rotation; a mirror negates it and flips the sweep."""
    m = transform_matrix(transform)
    R = m[:2, :2]
    if not np.allclose(R @ R.T, np.eye(2), atol=1e-9):
        raise ValueError("fragment transform must be orthogonal")
    mirror = np.linalg.det(R) < 0
    turn = math.degrees(math.atan2(R[1, 0], R[0, 0]))
    segs = []
    for d in re.findall(r'\sd="([^"]*)"', svg):
        for seg in path_segments(d):
            cmd, pts = seg[0], seg[1]
            if cmd == "A":
                rx, ry, phi, large, sweep = seg[2]
                phi2 = (turn - phi) if mirror else (phi + turn)
                params = (rx, ry, phi2, large, 1 - sweep if mirror else sweep)
                segs.append(("A", apply(m, pts), params))
            else:
                segs.append((cmd, apply(m, pts)))
    return segs


def fmt4(v):
    """Four decimals: an arc's centre is so sensitive to its radii and ends that 0.01 mm moves it 0.2 mm."""
    s = f"{round(v, 4):.4f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def body_d(segs):
    """SVG path data for the line work: one path, edges chained where they meet, arcs as A commands."""
    parts, last = [], None
    def xy(p):
        return f"{fmt(p[0])} {fmt(p[1])}"
    for seg in segs:
        cmd, pts = seg[0], seg[1]
        if cmd == "Z":
            continue
        if cmd == "M":
            if last is None or abs(last[0] - pts[0][0]) > 0.005 or abs(last[1] - pts[0][1]) > 0.005:
                parts.append("M " + xy(pts[0]))
            last = pts[0]
        elif cmd == "L":
            parts.append("L " + xy(pts[0])); last = pts[0]
        elif cmd == "A":
            rx, ry, phi, large, sweep = seg[2]
            parts.append(f"A {fmt4(rx)} {fmt4(ry)} {fmt4(phi)} {large} {sweep} {fmt4(pts[1][0])} {fmt4(pts[1][1])}"); last = pts[1]
        elif cmd == "C":
            parts.append("C " + " ".join(xy(q) for q in pts)); last = pts[-1]
    return " ".join(parts)


def axis_frame(axes):
    """A 3D -> 2D map from the projected unit axes (each a line of length 10 from the origin)."""
    ends = [[seg[1][0] for seg in segs] for segs in axes]
    def dist(a, b):
        return math.hypot(a[0] - b[0], a[1] - b[1])
    origin = min(ends[0], key=lambda p: sum(min(dist(p, q) for q in ends[i]) for i in (1, 2)))
    cols = []
    for pts in ends:
        far = max(pts, key=lambda q: dist(q, origin))
        cols.append(((far[0] - origin[0]) / 10, (far[1] - origin[1]) / 10))
    (ax, ay), (bx, by), (cx, cy) = cols
    def frame(x, y, z):
        return (origin[0] + ax * x + bx * y + cx * z, origin[1] + ay * x + by * y + cy * z)
    return frame


def mesh_mask(mesh, frame, x0, y0, nx, ny, px=PX):
    """The silhouette of the solid: its triangles, projected and filled. A through-hole stays open
    exactly where no triangle covers it, that is where a ray passes through the solid."""
    img = Image.new("L", (nx, ny), 0)
    draw = ImageDraw.Draw(img)
    p2 = [((x - x0) * px, (y - y0) * px) for x, y in (frame(*q) for q in mesh["pts"])]
    for a, b, c in mesh["tris"]:
        draw.polygon([p2[a], p2[b], p2[c]], fill=255)
    return np.array(img) > 0


def trace(mask, x0, y0, name, px=PX):
    """potrace of the mask, back to mm: the outline as one path."""
    pbm = WORK / f"{name}-sil.pbm"; svg = WORK / f"{name}-sil.svg"
    Image.fromarray(np.where(mask, 0, 255).astype("uint8")).convert("1", dither=Image.Dither.NONE).save(pbm)
    subprocess.run(["potrace", "-s", "--flat", "-a", "0", "-o", str(svg), str(pbm)], check=True)
    text = svg.read_text()
    d = re.search(r'\sd="([^"]*)"', text).group(1)
    t = re.search(r'transform="([^"]*)"', text)
    m = transform_matrix(t.group(1) if t else "")
    return [(c, [(x / px + x0, y / px + y0) for x, y in apply(m, p)]) for c, p in path_segments(d)]


def nesting(mask):
    """Smallest horizontal and vertical pitch (px) at which copies of the outline do not touch."""
    h, w = mask.shape
    def clash(sx, sy):
        if abs(sx) >= w or abs(sy) >= h: return False
        ya, yb = max(0, sy), min(h, h + sy)
        xa, xb = max(0, sx), min(w, w + sx)
        a = mask[ya:yb, xa:xb]; b = mask[ya - sy:yb - sy, xa - sx:xb - sx]
        return bool(np.any(a & b))
    mask = np.array(Image.fromarray(mask.astype("uint8") * 255).filter(ImageFilter.MaxFilter(13))) > 0
    dx = next(x for x in range(10, w) if not clash(x, 0))
    dy = next(y for y in range(10, h) if not any(clash(o, y) for o in (-dx, 0, dx)))
    return dx, dy


def run_freecad(jobs):
    """One FreeCAD process per chunk, up to PROCS at a time; returns the slugs that failed."""
    WORK.mkdir(parents=True, exist_ok=True)
    chunks = [jobs[i::PROCS] for i in range(PROCS) if jobs[i::PROCS]]

    def one(n, chunk):
        jobs_path = WORK / f"jobs-{n}.json"; script = WORK / f"freecad_more_{n}.py"
        jobs_path.write_text(json.dumps(chunk))
        script.write_text(f"import math\nJOBS_JSON = {str(jobs_path)!r}\n" + inspect.getsource(circlip_profile) + FREECAD)
        r = subprocess.run(["flatpak", "run", "--filesystem=home", "--command=FreeCADCmd",
                            "org.freecad.FreeCAD", str(script)], capture_output=True, text=True)
        return r.stdout + r.stderr

    failed = []
    with ThreadPoolExecutor(max_workers=PROCS) as ex:
        for text in ex.map(lambda a: one(*a), enumerate(chunks)):
            failed += re.findall(r"FAILED (\S+)", text)
    return failed


def main(argv):
    sys.path.insert(0, str(MOD / "gears"))   # pygears, the Gears add-on's numpy core
    specs_dir = SPECS
    links_path = None
    only = set(KINDS)         # --only o-ring,circlip draws just those kinds and leaves the other files alone
    args = list(argv)
    while args:
        a = args.pop(0)
        if a == "--specs": specs_dir = Path(args.pop(0))
        elif a == "--links": links_path = Path(args.pop(0))
        elif a == "--only": only = set(args.pop(0).split(","))
        else: raise SystemExit(f"unknown argument {a}")
    t0 = time.time()
    links = Counter()
    if links_path and links_path.exists():
        for part in json.loads(links_path.read_text())["parts"]:
            for e in part.get("equivalent_to") or []:
                links[e.get("spec")] += 1

    skipped = Counter()
    kinds_count = Counter()
    jobs = []
    for kind, s in load_specs(specs_dir):
        if kind not in only:
            continue
        kinds_count[kind] += 1
        job, why = plan(kind, s)
        if job is None:
            skipped[f"{kind}: {why}"] += 1
            continue
        slug = slug_of(s["id"])
        job.update({"slug": slug, "kind": kind, "id": s["id"], "view": CAMERA,
                    "lines": str(WORK / f"{slug}.lines.svgfrag"), "mesh": str(WORK / f"{slug}.mesh.json"),
                    "mesh_mm": MESH_MM,
                    "axes": [str(WORK / f"{slug}.axis{i}.svgfrag") for i in range(3)]})
        jobs.append(job)
    jobs.sort(key=lambda j: (-links[j["id"]], j["slug"]))
    print("planned", len(jobs), "of", sum(kinds_count.values()))

    for f in [*WORK.glob("*.svgfrag"), *WORK.glob("*.mesh.json")]:
        f.unlink()
    failed = run_freecad(jobs)
    print("freecad done", round(time.time() - t0, 1), "s, failed", len(failed), failed[:10])

    OUT.mkdir(parents=True, exist_ok=True)
    index, drawn_kind = {}, Counter()
    for job in jobs:
        slug = job["slug"]
        if slug in failed or not Path(job["mesh"]).exists():
            skipped[f"{job['kind']}: FreeCAD could not build it"] += 1
            continue
        # the page: scale to y-down mm, then turn so that world Z points up
        flat = [read_fragment(Path(a).read_text(), "scale(1, -1)") for a in job["axes"]]
        f0 = axis_frame(flat)
        zx, zy = f0(0, 0, 1)[0] - f0(0, 0, 0)[0], f0(0, 0, 1)[1] - f0(0, 0, 0)[1]
        turn = math.degrees(-math.pi / 2 - math.atan2(zy, zx))
        page = f"rotate({turn:.9f}) scale(1, -1)"
        line_segs = read_fragment(Path(job["lines"]).read_text(), page)
        lines = sample_segments(line_segs)
        frame = axis_frame([read_fragment(Path(a).read_text(), page) for a in job["axes"]])
        mesh = json.loads(Path(job["mesh"]).read_text())
        mesh_pts = [frame(*q) for q in mesh["pts"]]
        xs = [x for l in lines for x, _ in l] + [x for x, _ in mesh_pts]
        ys = [y for l in lines for _, y in l] + [y for _, y in mesh_pts]
        x0, y0 = min(xs) - 1, min(ys) - 1
        nx, ny = math.ceil((max(xs) + 1 - x0) * PX), math.ceil((max(ys) + 1 - y0) * PX)
        mask = mesh_mask(mesh, frame, x0, y0, nx, ny)
        k = TRACE_PX / PX
        sil = trace(mesh_mask(mesh, frame, x0, y0, round(nx * k), round(ny * k), TRACE_PX), x0, y0, slug, TRACE_PX)
        sil_pts = [pt for _, pts in sil for pt in pts]
        bx0 = min(min(xs), min(x for x, _ in sil_pts)); bx1 = max(max(xs), max(x for x, _ in sil_pts))
        by0 = min(min(ys), min(y for _, y in sil_pts)); by1 = max(max(ys), max(y for _, y in sil_pts))
        vx, vy = bx0 - PAD, by0 - PAD
        vw, vh = bx1 - bx0 + 2 * PAD, by1 - by0 + 2 * PAD
        dx, dy = nesting(mask)
        pitch_x, pitch_y = math.ceil(dx / PX * 100) / 100, math.ceil(dy / PX * 100) / 100
        body = f'<path d="{body_d(line_segs)}" vector-effect="non-scaling-stroke"/>'
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(vx)} {fmt(vy)} {fmt(vw)} {fmt(vh)}" '
               f'data-pitch-x="{pitch_x:g}" data-pitch-y="{pitch_y:g}">'
               f'<path class="sil" d="{d_string(sil)}" fill-rule="evenodd"/>'
               f'<g class="lines" fill="none" stroke="currentColor" stroke-width="{STROKE_PX}" '
               f'stroke-linecap="butt" stroke-linejoin="miter">{body}</g></svg>\n')
        name = f"{slug}.svg"
        (OUT / name).write_text(svg)
        index[job["id"].removeprefix("spec/")] = name
        drawn_kind[job["kind"]] += 1
    for kind in only:
        for old in OUT.glob(f"{kind}-*.svg"):
            if old.name not in index.values():
                old.unlink()
    # one index for the bags: keep the entries of the other drawings, replace this generator's kinds
    index_path = OUT / "index.json"
    merged = json.loads(index_path.read_text()) if index_path.exists() else {}
    merged = {k: v for k, v in merged.items() if k.split("/", 1)[0] not in only}
    merged.update(index)
    index_path.write_text(json.dumps(dict(sorted(merged.items())), indent=2) + "\n")
    total = sum((OUT / n).stat().st_size for n in index.values())
    print("drawn", dict(drawn_kind), "total", sum(drawn_kind.values()))
    print("skipped", sum(skipped.values()))
    for reason, n in sorted(skipped.items()):
        print(f"  {n:4d}  {reason}")
    print("svg bytes total", total)
    print("run time", round(time.time() - t0, 1), "s")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
