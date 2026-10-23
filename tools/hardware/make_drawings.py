#!/usr/bin/env python3
"""Hardware bag drawings: one SVG per pilot spec, written to src/assets/hardware/.

FreeCAD models each spec and projects it (screws: the Fasteners add-on; bearings:
radial ball bearings with a shield, flanged ones with the flange_mm and flange_width_mm of the spec, and thrust
bearings, all built with Part). The projected lines are rounded
to 0.01 mm; a filled silhouette is traced from the raster of those lines
(dilate, flood fill from outside, erode, potrace). The index.json manifest lists
the specs that have a drawing. Run from the repo root:

    python3 tools/hardware/make_drawings.py
    python3 tools/hardware/make_drawings.py --flanged-thrust   # only the flanged and thrust bearings

FreeCAD runs through flatpak; its work files go to ~/.cache/hobbydex-hardware, or to
$HOBBYDEX_HARDWARE_WORK (under the home dir: the flatpak cannot read /tmp).

The Fasteners add-on is run from a copy with tools/hardware/fasteners-sizes.patch applied: rows for the sizes its
tables lack, interpolated between the table's neighbouring sizes (never extrapolated). The installed add-on is not
changed. The drawings of those sizes are listed in approx.json.

    python3 tools/hardware/make_drawings.py --sizes   # only the screws whose size the patch adds
"""
import csv
import json
import math
import os
import re
import shutil
import subprocess
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/assets/hardware"
# HOBBYDEX_HARDWARE_WORK gives a run its own work dir, so runs at the same time do not share jobs.json
WORK = Path(os.environ.get("HOBBYDEX_HARDWARE_WORK") or Path.home() / ".cache/hobbydex-hardware")
INSTALLED_FASTENERS = Path.home() / ".var/app/org.freecad.FreeCAD/data/FreeCAD/v1-1/Mod/fasteners"
FASTENERS_PATCH = Path(__file__).with_name("fasteners-sizes.patch")
PX = 30            # raster pixels per mm for the silhouette
PAD = 0.3          # mm around the drawing in the viewBox

# the FreeCAD projection of a screw head+drive, and the ISO Fasteners type each one maps to
SCREW_TYPES = {
    ("countersunk", "hex"): "ISO10642",
    ("button", "hex"): "ISO7380-1",
    ("socket-cap", "hex"): "ISO4762",
    ("set", "hex"): "ISO4029",
    ("pan", "phillips"): "ISO7045",
    ("pan", "jis"): "ISO7045",          # the JIS cross recess is drawn as Phillips
    ("countersunk", "phillips"): "ISO7046",
}
# self-tapping screws: the head+drive maps as above, with JIS drawn as Phillips; the shank is an ISO 7049-F
# tapping screw of the ISO 1478 size for the spec's diameter
TAP_HEAD_TYPES = {**SCREW_TYPES, ("countersunk", "jis"): "ISO7046"}
# the ISO 1478 sizes the add-on's ISO 7049 has: M2.5 and below take ST2.2, M2.6 and M3 ST2.9
TAP_ST = {"M1.6": "ST2.2", "M2": "ST2.2", "M2.3": "ST2.2", "M2.5": "ST2.2", "M2.6": "ST2.9", "M3": "ST2.9",
          "M3.5": "ST3.5", "M4": "ST4.2"}
HEAD_ISOS = ("ISO7380-1", "ISO4762", "ISO10642", "ISO7045", "ISO7046")   # the tapping screw's head types
SCREW_TOP = 40                       # most linked screw specs drawn
SCREW_CANDIDATES = 80                # the most linked screw specs tried (some fail in FreeCAD)
FRAG = "scale(1, -1)"   # TechDraw's SVG y runs down; every drawing uses it, then the axis is levelled up


def select_specs(data, head_sizes):
    """The pilot: all radial ball bearings, and the screws of the six Fasteners types, most linked first.
    Returns the bearing jobs, the ranked screw candidates [(spec id, job)], the counts of what was left out
    by reason, and the link count of every spec."""
    links = {}
    for part in data["parts"]:
        for e in part.get("equivalent_to") or []:
            links[e.get("spec")] = links.get(e.get("spec"), 0) + 1
    skipped = {"flanged, no flange size in the data": 0, "flanged, flange size not outside the bearing": 0,
               "bearing, type not drawn": 0, "screw, head or drive not mapped": 0,
               "tapping, head or drive has no head builder": 0, "tapping, head size not in the add-on": 0,
               "tapping, thread size has no ISO 1478 size": 0,
               "screw, thread is not a metric size": 0}
    jobs = {}
    screws = []
    for spec in data["specs"]:
        sid = spec["id"]
        if spec.get("category") == "bearing":
            size = {"d": spec.get("bore_mm"), "D": spec.get("outer_mm"), "B": spec.get("width_mm")}
            if spec.get("type") == "radial-ball" and all(size.values()):
                jobs[sid] = {"kind": "bearing", **size}
            elif spec.get("type") == "thrust" and all(size.values()):
                jobs[sid] = {"kind": "bearing", "type": "thrust", **size}
            elif spec.get("type") == "flanged" and all(size.values()):
                # the flange's diameter and thickness are the spec's flange_mm and flange_width_mm; a flanged
                # spec without them, or whose flange is not bigger than the bearing, is left out and counted
                F, T = spec.get("flange_mm"), spec.get("flange_width_mm")
                if not (F and T):
                    skipped["flanged, no flange size in the data"] += 1
                elif not (F > size["D"] and 0 < T < size["B"]):
                    skipped["flanged, flange size not outside the bearing"] += 1
                else:
                    jobs[sid] = {"kind": "bearing", "type": "flanged", **size, "F": F, "T": T}
            else:
                skipped["bearing, type not drawn"] += 1
        elif spec.get("category") == "screw":
            if spec.get("thread_type") == "self-tapping":
                head = TAP_HEAD_TYPES.get((spec.get("head"), spec.get("drive")))
                st = TAP_ST.get(spec.get("thread"))
                if not head:
                    skipped["tapping, head or drive has no head builder"] += 1
                elif spec["thread"] not in head_sizes.get(head, set()):
                    skipped["tapping, head size not in the add-on"] += 1
                elif not st:
                    skipped["tapping, thread size has no ISO 1478 size"] += 1
                else:
                    # two drawings: the cone point (ISO 7049-C) by default, the flat point (ISO 7049-F) as "#flat"
                    job = {"kind": "tapping", "iso": head, "head_dia": spec["thread"], "thread": spec["thread"],
                           "st": st, "length": spec["length_mm"], "head": spec.get("head")}
                    jobs[sid] = {**job, "point": "cone"}
                    jobs[sid + "#flat"] = {**job, "point": "flat"}
                continue
            iso = SCREW_TYPES.get((spec.get("head"), spec.get("drive")))
            if not iso:
                skipped["screw, head or drive not mapped"] += 1; continue
            # the add-on's sizes are the test: a size it has no table for fails in FreeCAD and is counted there
            if not re.fullmatch(r"M\d+(\.\d+)?", spec.get("thread") or ""):
                skipped["screw, thread is not a metric size"] += 1; continue
            if spec.get("head") == "pan" and spec.get("drive") == "jis":
                # the Tamiya round-head screws: all drawn, not only the most linked screws
                jobs[sid] = {"kind": "screw", "iso": iso, "thread": spec["thread"], "length": spec["length_mm"],
                             "group": "pan-jis"}
                continue
            screws.append((links.get(sid, 0), sid, {"kind": "screw", "iso": iso, "thread": spec["thread"], "length": spec["length_mm"]}))
    screws.sort(key=lambda t: (-t[0], t[1]))
    ranked = [(sid, job) for _, sid, job in screws]   # the candidates, most linked first
    return jobs, ranked, skipped, links


# the FreeCAD side: one projection per job, written as TechDraw SVG fragments
FREECAD = r'''
import sys, json, math, FreeCAD, Part, TechDraw
sys.path.insert(0, FASTENERS)
import FastenersCmd
assert FastenersCmd.__file__.startswith(FASTENERS), FastenersCmd.__file__
V = FreeCAD.Vector
def ring(ro, ri, h, z=0):
    return Part.makeCylinder(ro, h, V(0, 0, z)).cut(Part.makeCylinder(ri, h, V(0, 0, z)))
def bearing(d, D, B, F=0, T=0):
    # outer and inner race with rounded edges, and the shield that hides the balls; a flange F wide and T thick
    # on the top face of the outer ring
    t = (D - d) / 2
    outer = ring(D/2, D/2 - t*0.28, B)
    inner = ring(d/2 + t*0.28, d/2, B)
    # the rounded edges; a thin ring whose fillet is not valid keeps its sharp edges
    def rounded(r):
        try:
            f = r.makeFillet(min(0.3, B/10), [e for e in r.Edges if e.Curve.TypeId == 'Part::GeomCircle'])
        except Exception:
            return r
        return f if f.isValid() else r
    if F:
        # the flange is fused on after the outer ring's edges are rounded (its own edges stay sharp)
        outer = rounded(outer).fuse(ring(F/2, D/2 - t*0.28, T, B - T)).removeSplitter()
    else:
        outer = rounded(outer)
    return Part.makeCompound([outer, rounded(inner), ring(D/2 - t*0.28, d/2 + t*0.28, B*0.05, B*0.88)])
def thrust(d, D, B):
    # two flat washers, 0.3 B high each, with a ball cage between them and the balls in it
    h = 0.3 * B; gap = B - 2 * h; Dw = 0.8 * gap; rm = (D + d) / 4
    parts = [ring(D/2, d/2, h, B - h), ring(D/2, d/2, h, 0),
             ring(rm + 0.35 * Dw, rm - 0.35 * Dw, gap * 0.5, B / 2 - gap * 0.25)]
    n = max(5, min(14, int(2 * math.pi * rm / (Dw * 1.45))))
    for i in range(n):
        a = 2 * math.pi * i / n
        parts.append(Part.makeSphere(Dw / 2, V(rm * math.cos(a), rm * math.sin(a), B / 2)))
    return parts[0].fuse(parts[1:]).removeSplitter()
def bearing_job(job):
    if job.get("type") == "thrust":
        return thrust(job["d"], job["D"], job["B"])
    return bearing(job["d"], job["D"], job["B"], job.get("F", 0), job.get("T", 0))
def set_length(obj, length):
    # a length the add-on's table has; any other length is a custom one
    if str(length) in obj.getEnumerationsOfProperty("Length"):
        obj.Length = str(length)
    else:
        obj.Length = "Custom"; obj.LengthCustom = length
def head_underside(shape, shank_r):
    """The z of the head's underside: the lowest z where the solid's cross-section is wider than the shank.
    Pan and button heads sit above z = 0 (underside at 0); countersunk heads sit below it (underside at -k)."""
    bb = shape.BoundBox
    z = bb.ZMin + 0.01
    while z <= bb.ZMax:
        wires = shape.slice(V(0, 0, 1), z)
        if wires and max(w.BoundBox.XMax for w in wires) > shank_r + 0.2:
            return z
        z += 0.02
    raise ValueError("no head found on the machine screw")
def tapping(doc, job):
    # the machine head of the spec's head+drive, on the add-on's ISO 7049 tapping shank (cone point C, or flat
    # point F). The shank is kept below the head's underside, the head above it; the total height must be the
    # length plus the head height, or the head was lost
    L = float(job["length"])
    head = doc.addObject("Part::FeaturePython", "Head")
    FastenersCmd.FSScrewObject(head, job["iso"], None)
    head.Diameter = job["head_dia"]; head.Thread = False; set_length(head, job["length"])
    tap = doc.addObject("Part::FeaturePython", "Tap")
    FastenersCmd.FSScrewObject(tap, "ISO7049-F" if job["point"] == "flat" else "ISO7049-C", None)
    tap.Diameter = job["st"]; tap.Thread = True; set_length(tap, job["length"])
    doc.recompute()
    zu = head_underside(head.Shape, float(job["thread"][1:]) / 2)
    big = 60
    above = Part.makeBox(big, big, big, V(-big / 2, -big / 2, zu))
    below = Part.makeBox(big, big, big, V(-big / 2, -big / 2, zu - big))
    head_shape = head.Shape.common(above)
    if job.get("head") == "countersunk":
        # the add-on's countersunk head has a rounded top rim, which reads as a dome: a 45 degree rim fill
        # makes the top a flat face at z = 0 out to the head's widest radius, and the cross recess stays
        rt = head.Shape.BoundBox.XMax
        tri = [V(rt - 0.7, 0, -0.7), V(rt, 0, 0), V(rt - 0.7, 0, 0)]
        rim = Part.Face(Part.makePolygon(tri + [tri[0]])).revolve(V(0, 0, 0), V(0, 0, 1), 360)
        head_shape = head_shape.fuse(rim).removeSplitter()
    # no removeSplitter on the fused screw: it merges the core cylinder's strips between the thread turns into
    # one face, and the hidden-line projection then loses the core (no outline, the back of every turn shows)
    tap_below = tap.Shape.common(below)
    if job.get("trim_collar"):
        # the ISO 7049 shank's top collar (dk 5.6 for ST2.9) is wider than an interpolated head's underside (M2.6 pan:
        # dk 5.1): it stands out as a ring under the head. Trimmed to the underside's radius, the collar is flush with
        # the head, as the M3 head's collar is
        r_under = max(w.BoundBox.XMax for w in head.Shape.slice(V(0, 0, 1), zu + 0.05))
        tap_below = tap_below.common(Part.makeCylinder(r_under, big, V(0, 0, zu - big)))
    res = head_shape.fuse(tap_below)
    if job.get("head") == "countersunk":
        # a countersunk head widens towards its top: the top's diameter is more than the underside's
        top_r = max(w.BoundBox.XMax for w in res.slice(V(0, 0, 1), -0.02))
        under_r = max(w.BoundBox.XMax for w in res.slice(V(0, 0, 1), zu + 0.05))
        print("CSHEAD", job["iso"], job["thread"], L, "top r %.3f underside r %.3f" % (top_r, under_r), flush=True)
        if top_r <= under_r:
            raise ValueError("countersunk head does not widen towards its top (%.3f <= %.3f)" % (top_r, under_r))
    # the length runs from the underside of a pan or button head (it adds to the head), but a countersunk
    # head's length is overall, from its top: the head is within the length
    head_top = head.Shape.BoundBox.ZMax
    expect = L + max(0.0, head_top)
    total = res.BoundBox.ZMax - res.BoundBox.ZMin
    print("HEIGHT", job["iso"], job["thread"], L, "head top %.3f total %.3f expect %.3f" % (head_top, total, expect), flush=True)
    if not res.isValid() or abs(total - expect) > 0.05 * expect:
        raise ValueError("height %.3f, expected %.3f (length %.3f, head above it %.3f)" % (total, expect, L, max(0.0, head_top)))
    return res
for job in json.loads(open(JOBS_JSON).read()):
    try:
        doc = FreeCAD.newDocument("job")
        if job["kind"] == "screw":
            obj = doc.addObject("Part::FeaturePython", "Screw")
            FastenersCmd.FSScrewObject(obj, job["iso"], None)
            obj.Diameter = job["thread"]; obj.Thread = True
            set_length(obj, job["length"])
            doc.recompute()
            shape, view = obj.Shape, V(1, -1, 1)
        elif job["kind"] == "tapping":
            shape, view = tapping(doc, job), V(1, -1, 1)
        else:
            shape, view = bearing_job(job), V(1, -1, 1)
        if shape.isNull() or not shape.isValid() or not shape.Edges:
            raise ValueError("empty shape")
        open(job["out"], "w").write(TechDraw.projectToSVG(shape, view, ""))
        # the axes, to map the 3D model into the drawing's 2D frame; the solid's triangles, for the silhouette
        for i, end in enumerate([V(10, 0, 0), V(0, 10, 0), V(0, 0, 10)]):
            open(f"{job['out']}.axis{i}", "w").write(TechDraw.projectToSVG(Part.makeLine(V(0, 0, 0), end), view, ""))
        pts, tris = shape.tessellate(0.03)   # coarse: the silhouette is drawn at 30 px per mm
        json.dump({"pts": [[p.x, p.y, p.z] for p in pts], "tris": [list(t) for t in tris]}, open(f"{job['out']}.mesh.json", "w"))
        if job["kind"] == "tapping":
            # for the thread check: every edge of the solid, sampled in 3D, and the core radius (the smallest
            # constant radius of the helix edges below the head)
            edges, core = [], []
            for e in shape.Edges:
                if e.Length < 1e-6:
                    continue
                pts = e.discretize(Distance=0.04) if e.Length > 0.08 else [e.Vertexes[0].Point, e.Vertexes[-1].Point]
                edges.append([[round(q.x, 4), round(q.y, 4), round(q.z, 4)] for q in pts])
                rs = [(q.x ** 2 + q.y ** 2) ** 0.5 for q in pts]
                if e.Length > 2 and e.BoundBox.ZMax < -0.3 and max(rs) - min(rs) < 0.02:
                    core.append((sum(rs) / len(rs), e.BoundBox.ZMin, e.BoundBox.ZMax))
            r_core = min(c[0] for c in core)
            json.dump({"edges": edges, "core_r": r_core, "z": [min(c[1] for c in core), max(c[2] for c in core)]},
                      open(f"{job['out']}.thread.json", "w"))
        print("OK", job["out"])
    except Exception as err:
        print("FAILED", job["out"], err)
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
            segs.append(("A", [end], tuple(vals[:5])))
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
    """Polylines (lists of points) for the segments, curves and arcs sampled."""
    lines, cur = [], []
    for seg in segs:
        cmd, pts = seg[0], seg[1]
        if cmd == "M":
            if len(cur) > 1: lines.append(cur)
            cur = [pts[0]]
        elif cmd == "L":
            cur.append(pts[0])
        elif cmd == "A" and cur:
            rx, ry, phi, large, sweep = seg[2]
            cur.extend(arc_points(cur[-1], rx, ry, phi, large, sweep, pts[0]))
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
    for seg in segs:
        cmd, pts = seg[0], seg[1]
        if cmd == "Z":
            out.append("Z"); continue
        if cmd == "A":
            rx, ry, phi, large, sweep = seg[2]
            out.append(f"A {fmt(rx)} {fmt(ry)} {fmt(phi)} {int(large)} {int(sweep)} {fmt(pts[0][0])} {fmt(pts[0][1])}")
            continue
        out.append(cmd + " " + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in pts))
    return " ".join(out)


def read_fragment(svg, transform, skip=None):
    """The projected lines of a TechDraw fragment, transformed to mm (y down, as the SVG shows them).
    A path that skip(segments) accepts is left out."""
    m = transform_matrix(transform)
    lin = m[:2, :2]
    if not np.allclose(lin @ lin.T, np.eye(2), atol=1e-6):
        raise ValueError("transform is not an isometry; arcs would need resampling")
    flip = np.linalg.det(lin) < 0
    segs = []
    for d in re.findall(r'\sd="([^"]*)"', svg):
        parsed = path_segments(d)
        if skip is not None and skip(parsed):
            continue
        for seg in parsed:
            cmd, pts = seg[0], seg[1]
            if cmd == "A":
                rx, ry, phi, large, sweep = seg[2]
                u = lin @ np.array([math.cos(math.radians(phi)), math.sin(math.radians(phi))])
                phi2 = math.degrees(math.atan2(u[1], u[0]))
                segs.append(("A", apply(m, pts), (rx, ry, phi2, large, (1 - sweep) if flip else sweep)))
            else:
                segs.append((cmd, apply(m, pts)))
    return segs


def trace(mask, x0, y0, name):
    """potrace of the mask, back to mm: the outline as one path d string."""
    pbm = WORK / f"{name}-sil.pbm"; svg = WORK / f"{name}-sil.svg"
    Image.fromarray(np.where(mask, 0, 255).astype("uint8")).convert("1", dither=Image.Dither.NONE).save(pbm)
    subprocess.run(["potrace", "-s", "--flat", "-o", str(svg), str(pbm)], check=True)
    text = svg.read_text()
    d = re.search(r'\sd="([^"]*)"', text).group(1)
    t = re.search(r'transform="([^"]*)"', text)
    m = transform_matrix(t.group(1) if t else "")
    segs = [(c, [(x / PX + x0, y / PX + y0) for x, y in apply(m, p)]) for c, p in path_segments(d)]
    return segs


def nesting(mask):
    """Smallest horizontal and vertical pitch (px) at which copies of the outline do not touch."""
    h, w = mask.shape
    def clash(sx, sy):
        if abs(sx) >= w or abs(sy) >= h: return False
        ya, yb = max(0, sy), min(h, h + sy)
        xa, xb = max(0, sx), min(w, w + sx)
        a = mask[ya:yb, xa:xb]; b = mask[ya - sy:yb - sy, xa - sx:xb - sx]
        return bool(np.any(a & b))
    dil = np.array(Image.fromarray(mask.astype("uint8") * 255).filter(ImageFilter.MaxFilter(13))) > 0
    mask = dil
    dx = next(x for x in range(10, w) if not clash(x, 0))
    dy = next(y for y in range(10, h) if not any(clash(o, y) for o in (-dx, 0, dx)))
    return dx, dy


def seal_path(d, D, B, frame_of):
    """The top face of a bearing's shield (the annulus the rubber seal fills), in the drawing's mm frame.
    frame_of maps a 3D point (x, y, z) to 2D; the shield's top is at 0.93 B, as the FreeCAD model builds it."""
    t = (D - d) / 2
    z = B * 0.93
    rings = []
    for r in (D / 2 - t * 0.28, d / 2 + t * 0.28):
        pts = [frame_of(r * math.cos(a), r * math.sin(a), z) for a in np.linspace(0, 2 * math.pi, 97)[:-1]]
        rings.append(pts)
    return " ".join(
        "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in ring) + " Z" for ring in rings)


def axis_frame(paths):
    """The 3D -> 2D map from the projected unit axes (each a line of length 10 from the origin): (origin, 2x3 matrix)."""
    origin = None; cols = []
    for segs in paths:
        pts = [pt for _, ps in segs for pt in ps]
        if origin is None: origin = np.array(pts[0])
        cols.append(((pts[-1][0] - origin[0]) / 10, (pts[-1][1] - origin[1]) / 10))
    (ax, ay), (bx, by), (cx, cy) = cols
    return origin, np.array([[ax, bx, cx], [ay, by, cy]])


def level_axis(frame):
    """A 2D rotation of the drawing that makes the part's axis project vertically. Then a circle that lies
    across the axis spans its true diameter horizontally, so horizontal distances are true size."""
    origin, m = frame
    vx, vy = m[0, 2], m[1, 2]
    a = math.atan2(vx, vy) + math.pi   # the axis points up the page
    r = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
    return (r @ origin, r @ m), a, r


def rotate_segs(segs, r, a):
    out = []
    for seg in segs:
        cmd, pts = seg[0], seg[1]
        new = [tuple(r @ np.array(p)) for p in pts]
        if cmd == "A":
            rx, ry, phi, large, sweep = seg[2]
            out.append(("A", new, (rx, ry, phi + math.degrees(a), large, sweep)))
        else:
            out.append((cmd, new))
    return out


def project(frame, pts3):
    origin, m = frame
    return origin + np.asarray(pts3, dtype=float) @ m.T


def mesh_mask(mesh_path, frame, x0, y0, nx, ny):
    """The silhouette of the solid: its triangles, projected and filled."""
    mesh = json.loads(Path(mesh_path).read_text())
    p2 = project(frame, mesh["pts"])
    img = Image.new("L", (nx, ny), 0)
    draw = ImageDraw.Draw(img)
    for a, b, c in mesh["tris"]:
        draw.polygon([((p2[i][0] - x0) * PX, (p2[i][1] - y0) * PX) for i in (a, b, c)], fill=255)
    return np.array(img) > 0, p2


def convex_hull(pts):
    """Convex hull (counter-clockwise) of 2D points, monotone chain."""
    pts = sorted({(round(float(x), 6), round(float(y), 6)) for x, y in pts})
    def cross(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0: lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0: upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def bearing_mask(frame, d, D, B, x0, y0, nx, ny, F=0, T=0):
    """A bearing's silhouette: the outer cylinder's projected hull (and the flange's, F wide and T thick on
    top), less the see-through bore (the part of the bore seen through both open ends, the two inner end
    circles' overlap)."""
    def circle(R, z):
        return project(frame, [(R * math.cos(a), R * math.sin(a), z) for a in np.linspace(0, 2 * math.pi, 129)[:-1]])
    def fill(pts):
        img = Image.new("L", (nx, ny), 0)
        ImageDraw.Draw(img).polygon([((x - x0) * PX, (y - y0) * PX) for x, y in pts], fill=255)
        return np.array(img) > 0
    hull = convex_hull(np.vstack([circle(D / 2, 0), circle(D / 2, B)]))
    outer = fill(hull)
    if F:
        outer |= fill(convex_hull(np.vstack([circle(F / 2, B - T), circle(F / 2, B)])))
    bore = fill(circle(d / 2, B)) & fill(circle(d / 2, 0))
    return outer & ~bore


def bearing_rims(frame, d, D, B, thrust=False):
    """The bore's top rim (the whole ellipse: its far half shows through the hole) and the front half of the
    inner ring face's outer edge, at the top of the bearing, in the drawing's mm frame."""
    t = (D - d) / 2
    angles = np.linspace(0, 2 * math.pi, 129)
    segs = []
    def ring_path(r, a0, a1):
        pts = [project(frame, [(r * math.cos(a), r * math.sin(a), B)])[0] for a in angles[(angles >= a0) & (angles <= a1)]]
        if len(pts) > 1:
            segs.append(("M", [tuple(pts[0])]))
            segs.extend(("L", [tuple(q)]) for q in pts[1:])
    ring_path(d / 2, 0, 2 * math.pi)
    # the viewer is on the +x, -y side: the front half of a horizontal circle has cos(a) - sin(a) > 0
    front = [a for a in angles if math.cos(a) - math.sin(a) >= 0]
    if front and not thrust:
        ring_path(d / 2 + t * 0.28, front[0], front[-1])
    return segs


HIDDEN_MAX = 0.06     # share of the drawn shank lines that may lie where no edge of the solid is seen (a spring: 0.15+)
CORE_MIN = 0.08       # share of the threaded length where the core's outline must show, on each side (drawn: 0.13+)
ZBUF_PX = 40          # the depth buffer's pixels per mm
DEPTH_TOL = 0.08      # mm: an edge this far behind the front surface still counts as seen


def depth_buffer(mesh_path, frame, view):
    """The solid's front surface: per pixel of the drawing's frame, the largest depth along the view."""
    mesh = json.loads(Path(mesh_path).read_text())
    P3 = np.array(mesh["pts"], float); T = np.array(mesh["tris"], int)
    Q = project(frame, P3); lo = Q.min(axis=0) - 0.5
    W = math.ceil((Q[:, 0].max() - lo[0] + 0.5) * ZBUF_PX); H = math.ceil((Q[:, 1].max() - lo[1] + 0.5) * ZBUF_PX)
    Q = (Q - lo) * ZBUF_PX; D = P3 @ view
    zb = np.full((H, W), -np.inf)
    for a, b, c in T:
        qa, qb, qc = Q[a], Q[b], Q[c]
        det = (qb[1] - qc[1]) * (qa[0] - qc[0]) + (qc[0] - qb[0]) * (qa[1] - qc[1])
        if abs(det) < 1e-12:
            continue
        x0 = max(int(min(qa[0], qb[0], qc[0])), 0); x1 = min(int(max(qa[0], qb[0], qc[0])) + 1, W - 1)
        y0 = max(int(min(qa[1], qb[1], qc[1])), 0); y1 = min(int(max(qa[1], qb[1], qc[1])) + 1, H - 1)
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        w1 = ((qb[1] - qc[1]) * (xs - qc[0]) + (qc[0] - qb[0]) * (ys - qc[1])) / det
        w2 = ((qc[1] - qa[1]) * (xs - qc[0]) + (qa[0] - qc[0]) * (ys - qc[1])) / det
        w3 = 1 - w1 - w2
        inside = (w1 >= -1e-6) & (w2 >= -1e-6) & (w3 >= -1e-6)
        sub = zb[y0:y1 + 1, x0:x1 + 1]
        np.maximum(sub, np.where(inside, w1 * D[a] + w2 * D[b] + w3 * D[c], -np.inf), out=sub)
    return zb, lo


def thread_check(base, frame, segs):
    """How a tapping screw's thread reads: (share of the drawn lines on the threaded shank that lie where no edge
    of the solid is seen, share of the threaded length where the core's outline is drawn on the left, and on
    the right). A thread drawn as a spring shows the back half of every turn, which the core hides, and loses
    the core's outline. The seen edges: the solid's edges whose points are not behind its front surface (a
    depth buffer of its triangles)."""
    t = json.loads(Path(f"{base}.thread.json").read_text())
    view = np.array([1.0, -1.0, 1.0]) / math.sqrt(3)
    zb, lo = depth_buffer(f"{base}.mesh.json", frame, view)
    E = np.array([q for e in t["edges"] for q in e], float)
    q = ((project(frame, E) - lo) * ZBUF_PX).astype(int)
    q[:, 0] = q[:, 0].clip(0, zb.shape[1] - 1); q[:, 1] = q[:, 1].clip(0, zb.shape[0] - 1)
    front = np.zeros(zb.shape, bool)
    seen = E @ view >= zb[q[:, 1], q[:, 0]] - DEPTH_TOL
    front[q[seen, 1], q[seen, 0]] = True
    # grow the seen pixels by 0.05 mm: a drawn line within that of a seen edge is explained
    grow = front.copy()
    for _ in range(2):
        grow = grow | np.roll(grow, 1, 0) | np.roll(grow, -1, 0) | np.roll(grow, 1, 1) | np.roll(grow, -1, 1)
    pts = []
    for line in sample_segments(segs):
        for a, b in zip(line, line[1:]):
            n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 0.01))
            pts.extend((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n + 1))
    pts = np.array(pts)
    (ax, ya), (_, yb) = project(frame, [(0, 0, t["z"][0]), (0, 0, t["z"][1])])
    shank = pts[(pts[:, 1] > min(ya, yb)) & (pts[:, 1] < max(ya, yb))]
    g = ((shank - lo) * ZBUF_PX).astype(int)
    g[:, 0] = g[:, 0].clip(0, zb.shape[1] - 1); g[:, 1] = g[:, 1].clip(0, zb.shape[0] - 1)
    hidden = float((~grow[g[:, 1], g[:, 0]]).mean()) if len(g) else 1.0
    # the axis is vertical in the levelled frame: the core's outline runs at its x +- the core radius
    bins = np.arange(min(ya, yb), max(ya, yb), 0.05)
    shares = []
    for side in (-1, 1):
        on = pts[np.abs(pts[:, 0] - (ax + side * t["core_r"])) < 0.03]
        hit = {int((y - bins[0]) / 0.05) for y in on[:, 1] if bins[0] <= y < bins[-1] + 0.05}
        shares.append(len(hit) / max(1, len(bins)))
    return hidden, shares[0], shares[1]

def fasteners_copy():
    """A copy of the installed Fasteners add-on with the patch applied; FreeCAD imports the copy."""
    dst = WORK / "fasteners"
    shutil.rmtree(dst, ignore_errors=True)
    shutil.copytree(INSTALLED_FASTENERS, dst, ignore=shutil.ignore_patterns(".git", "__pycache__"))
    subprocess.run(["patch", "-p1", "-s", "-d", str(dst), "-i", str(FASTENERS_PATCH)], check=True)
    return dst


def fs_dias(folder, table):
    """The Dia column of a table in the add-on's FsData csv files (parentheses stripped), or None. A table name is
    a line of its own; names on consecutive lines share the table that follows them."""
    for path in sorted((folder / "FsData").glob("*.csv")):
        names, rows, last_name = [], [], False
        for cells in csv.reader(path.read_text().splitlines()):
            if len(cells) == 1 and cells[0]:
                if not last_name:
                    if table in names:
                        return dias_of(rows)
                    names, rows = [], []
                names.append(cells[0]); last_name = True
            elif any(cells):
                last_name = False; rows.append(cells)
        if table in names:
            return dias_of(rows)
    return None


def dias_of(rows):
    if not rows or rows[0][0] != "Dia":
        return None
    out = set()
    for cells in rows[1:]:
        if len(cells) < 2:
            break
        out.add(cells[0].strip("()"))
    return out


def added_sizes(installed, patched):
    """The (type, size) pairs the patch adds to a dimension table: the sizes drawn by interpolation."""
    added = set()
    for iso in HEAD_ISOS:
        before = fs_dias(installed, iso + "def") or set()
        added |= {(iso, d) for d in (fs_dias(patched, iso + "def") or set()) - before}
    return added


def run_freecad(jobs, fasteners):
    WORK.mkdir(parents=True, exist_ok=True)
    jobs_path = WORK / "jobs.json"; script = WORK / "freecad_jobs.py"
    jobs_path.write_text(json.dumps(jobs))
    script.write_text(f"JOBS_JSON = {str(jobs_path)!r}\nFASTENERS = {str(fasteners)!r}\n" + FREECAD)
    subprocess.run(["flatpak", "run", "--filesystem=home", "--command=FreeCADCmd",
                    "org.freecad.FreeCAD", str(script)], check=True)


def key_of(spec):
    """The index key of a drawing: its spec id without spec/; the flat-point variant is '-flat'."""
    return spec.removeprefix("spec/").replace("#", "-")


def slug_of(spec):
    return key_of(spec).replace("/", "-")


def main():
    data = json.loads((ROOT / "data/hobbydex-rc.json").read_text())
    fasteners = fasteners_copy()
    head_sizes = {iso: fs_dias(fasteners, iso + "def") or set() for iso in HEAD_ISOS}
    added = added_sizes(INSTALLED_FASTENERS, fasteners)   # the (type, size) rows the patch interpolates
    direct, ranked, skipped, links = select_specs(data, head_sizes)   # bearings and tapping screws, then the other screws
    screw_jobs = [(sid, p) for sid, p in direct.items() if p.get("kind") == "tapping" or p.get("group") == "pan-jis"] + ranked
    for sid, p in screw_jobs:
        if p["kind"] == "tapping" and (p["iso"], p["thread"]) in added:
            p["trim_collar"] = True   # the interpolated heads: see tapping()
    # --bearings and --tapping redraw one group; the other drawings already in index.json stay as they are
    only = next((flag for flag in ("--bearings", "--tapping", "--flanged-thrust", "--missing", "--sizes") if flag in sys.argv), None)
    old_index = json.loads((OUT / "index.json").read_text()) if only else {}
    if only == "--bearings":
        jobs = {sid: p for sid, p in direct.items() if p["kind"] == "bearing" and "type" not in p}
        keep = {k: v for k, v in old_index.items() if k.startswith(("screw/", "bearing/flanged-", "bearing/thrust-"))}
    elif only == "--missing":
        # every screw the generator maps and index.json lacks (no ranking cap); the other drawings stay as they are
        jobs = {sid: job for sid, job in ranked if key_of(sid) not in old_index}
        keep = old_index
    elif only == "--sizes":
        # the screws whose size the patch adds (interpolated rows), and no drawing yet; the other drawings stay
        jobs = {sid: p for sid, p in screw_jobs if (p["iso"], p["thread"]) in added and key_of(sid) not in old_index}
        keep = old_index
    elif only == "--flanged-thrust":
        # the flanged and thrust bearings: only these are drawn, every other drawing in index.json stays
        jobs = {sid: p for sid, p in direct.items() if p.get("type") in ("flanged", "thrust")}
        redrawn = {key_of(sid) for sid in jobs}
        keep = {k: v for k, v in old_index.items() if k not in redrawn}
    elif only == "--tapping":
        # the tapping screws and the pan JIS screws: every drawing they make is redrawn, the rest kept
        jobs = {sid: p for sid, p in direct.items() if p["kind"] == "tapping" or p.get("group") == "pan-jis"}
        redrawn = {key_of(sid) for sid in jobs}
        keep = {k: v for k, v in old_index.items() if k not in redrawn}
    else:
        jobs = dict(direct)
        jobs.update(dict(ranked[:SCREW_CANDIDATES]))
        keep = {}
    if not only or only == "--missing":
        for f in WORK.glob("*.svgfrag"):
            f.unlink()
    WORK.mkdir(parents=True, exist_ok=True)
    run_freecad([{**p, "out": str(WORK / f"{slug_of(spec)}.svgfrag")} for spec, p in jobs.items()], fasteners)

    OUT.mkdir(parents=True, exist_ok=True)
    index, failed, thread_failed = {}, [], []
    screws_ok = []
    if only in ("--missing", "--sizes"):
        screws_ok = []   # every job is a screw, written below from its own fragment
    elif not only:
        screws_ok = [sid for sid, _ in ranked if (WORK / f"{slug_of(sid)}.svgfrag").exists()][:SCREW_TOP]
        skipped["screw, FreeCAD failed"] = sum(1 for sid, _ in ranked[:SCREW_CANDIDATES] if sid not in screws_ok)
        skipped["screw, outside the top %d drawn" % SCREW_TOP] = len(ranked) - SCREW_CANDIDATES
    specs = {**jobs, **{sid: dict(ranked)[sid] for sid in screws_ok}}
    for spec, p in specs.items():
        slug = slug_of(spec)
        frag_path = WORK / f"{slug}.svgfrag"
        if not frag_path.exists():
            failed.append(spec); continue
        frag = frag_path.read_text()
        is_screw = p["kind"] in ("screw", "tapping")
        frag_transform = FRAG
        frame = axis_frame([read_fragment((WORK / f"{slug}.svgfrag.axis{i}").read_text(), frag_transform) for i in range(3)])
        frame, a, r = level_axis(frame)
        segs = rotate_segs(read_fragment(frag, frag_transform), r, a)
        if p["kind"] == "tapping":
            hidden, left, right = thread_check(WORK / f"{slug}.svgfrag", frame, segs)
            print(f"THREAD {slug}: lines over hidden edges {hidden:.0%}, core outline left {left:.0%} right {right:.0%}")
            if hidden > HIDDEN_MAX or min(left, right) < CORE_MIN:
                thread_failed.append(spec); continue
        if not is_screw:
            segs += bearing_rims(frame, p["d"], p["D"], p["B"], p.get("type") == "thrust")
        lines = sample_segments(segs)
        seal = ""
        if not is_screw and p.get("type") != "thrust":
            seal = f'<path class="seal" d="{seal_path(p["d"], p["D"], p["B"], lambda x, y, z: project(frame, [(x, y, z)])[0])}" fill-rule="evenodd"/>'
        xs = [x for l in lines for x, _ in l]; ys = [y for l in lines for _, y in l]
        # the mesh's 2D box decides the raster's frame (it can reach past the lines)
        mesh_pts = project(frame, json.loads((WORK / f"{slug}.svgfrag.mesh.json").read_text())["pts"])
        x0 = min(min(xs), mesh_pts[:, 0].min()) - 1; y0 = min(min(ys), mesh_pts[:, 1].min()) - 1
        x1 = max(max(xs), mesh_pts[:, 0].max()) + 1; y1 = max(max(ys), mesh_pts[:, 1].max()) + 1
        nx, ny = math.ceil((x1 - x0) * PX), math.ceil((y1 - y0) * PX)
        if is_screw:
            mask, _ = mesh_mask(WORK / f"{slug}.svgfrag.mesh.json", frame, x0, y0, nx, ny)
        else:
            mask = bearing_mask(frame, p["d"], p["D"], p["B"], x0, y0, nx, ny, p.get("F", 0), p.get("T", 0))
        sil = trace(mask, x0, y0, slug)
        sil_pts = [pt for _, pts in sil for pt in pts]
        bx0 = min(min(xs), min(x for x, _ in sil_pts)); bx1 = max(max(xs), max(x for x, _ in sil_pts))
        if not is_screw:
            # the outer ring's horizontal extent is its true diameter: the box takes it exactly, not the raster's edge
            # (the flange, on top, is the widest part of a flanged bearing)
            rings = [(p["D"] / 2, 0), (p["D"] / 2, p["B"])] + ([(p["F"] / 2, p["B"])] if p.get("F") else [])
            outer_x = project(frame, [(R * math.cos(a), R * math.sin(a), z)
                                      for R, z in rings for a in np.linspace(0, 2 * math.pi, 361)])[:, 0]
            bx0, bx1 = outer_x.min(), outer_x.max()
        by0 = min(min(ys), min(y for _, y in sil_pts)); by1 = max(max(ys), max(y for _, y in sil_pts))
        vx, vy = bx0 - PAD, by0 - PAD
        vw, vh = bx1 - bx0 + 2 * PAD, by1 - by0 + 2 * PAD
        dx, dy = nesting(mask)
        pitch_x, pitch_y = math.ceil(dx / PX * 100) / 100, math.ceil(dy / PX * 100) / 100
        body = f'<path vector-effect="non-scaling-stroke" d="{d_string(segs)}"/>'
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(vx)} {fmt(vy)} {fmt(vw)} {fmt(vh)}" '
               f'data-pitch-x="{pitch_x:g}" data-pitch-y="{pitch_y:g}">'
               f'<path class="sil" d="{d_string(sil)}" fill-rule="evenodd"/>{seal}'
               f'<g class="lines" fill="none" stroke="currentColor" stroke-width="1.2" '
               f'stroke-linecap="butt" stroke-linejoin="miter">{body}</g></svg>\n')
        (OUT / f"{slug}.svg").write_text(svg)
        index[key_of(spec)] = f"{slug}.svg"
        print(f"{slug}.svg {len(svg.encode())} bytes, viewBox {vw:.2f} x {vh:.2f} mm, pitch {pitch_x:g} x {pitch_y:g} mm")
    if thread_failed:
        sys.exit(f"tapping drawings whose thread reads as a spring (hidden back halves drawn or no core outline) "
                 f"failed; index.json is unchanged: {thread_failed}")
    index = {**keep, **index}
    # the keys of the interpolated sizes' drawings, for the site's note (index.json stays a plain map of drawings)
    approx = sorted(k for k in index if k in {key_of(sid) for sid, p in screw_jobs if (p["iso"], p["thread"]) in added})
    (OUT / "approx.json").write_text(json.dumps(approx, indent=2) + "\n")
    print(f"approximate (interpolated sizes): {len(approx)}")
    # remove only the drawings this generator made before (its old index) that are no longer in it
    index_path = OUT / "index.json"
    previous = json.loads(index_path.read_text()).values() if index_path.exists() else []
    for name in previous:
        if name not in index.values() and (OUT / name).exists():
            (OUT / name).unlink()
    index_path.write_text(json.dumps(index, indent=2) + "\n")
    tapping_failed = [spec for spec in failed if specs[spec]["kind"] == "tapping"]
    if tapping_failed:
        sys.exit(f"tapping drawings failed the height check: {tapping_failed}")
    print(f"drawn {len(index)}, screws {len(screws_ok)}, FreeCAD failed {len(failed)}: {failed}")
    print("left out:", skipped)
    print("links of drawn specs:", sum(links.get(s.split("#")[0], 0) for s in specs if s not in failed))


if __name__ == "__main__":
    sys.exit(main())
