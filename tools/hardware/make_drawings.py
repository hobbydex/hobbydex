#!/usr/bin/env python3
"""Hardware bag drawings: one SVG per pilot spec, written to src/assets/hardware/.

FreeCAD models each spec and projects it (screws: the Fasteners add-on; bearings:
a shielded radial ball bearing built with Part). The projected lines are rounded
to 0.01 mm; a filled silhouette is traced from the raster of those lines
(dilate, flood fill from outside, erode, potrace). The index.json manifest lists
the specs that have a drawing. Run from the repo root:

    python3 tools/hardware/make_drawings.py

FreeCAD runs through flatpak; its work files go to ~/.cache/hobbydex-hardware.
"""
import json
import math
import re
import subprocess
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/assets/hardware"
WORK = Path.home() / ".cache/hobbydex-hardware"
PX = 30            # raster pixels per mm for the silhouette
PAD = 0.3          # mm around the drawing in the viewBox

# the FreeCAD projection of a screw head+drive, and the ISO Fasteners type each one maps to
SCREW_TYPES = {
    ("countersunk", "hex"): "ISO10642",
    ("button", "hex"): "ISO7380-1",
    ("socket-cap", "hex"): "ISO4762",
    ("set", "hex"): "ISO4029",
    ("pan", "phillips"): "ISO7045",
    ("countersunk", "phillips"): "ISO7046",
}
SCREW_TOP = 40                       # most linked screw specs drawn
SCREW_CANDIDATES = 80                # the most linked screw specs tried (some fail in FreeCAD)
ISO_DIAMETERS = {"M2", "M2.5", "M3", "M4", "M5", "M6", "M8", "M10"}
SCREW_FRAG = "rotate(180) scale(1, -1)"   # head on top
BEARING_FRAG = "scale(1, -1)"


def select_specs(data):
    """The pilot: all radial ball bearings, and the screws of the six Fasteners types, most linked first.
    Returns the bearing jobs, the ranked screw candidates [(spec id, job)], the counts of what was left out
    by reason, and the link count of every spec."""
    links = {}
    for part in data["parts"]:
        for e in part.get("equivalent_to") or []:
            links[e.get("spec")] = links.get(e.get("spec"), 0) + 1
    skipped = {"bearing, flanged or thrust": 0, "screw, self-tapping": 0, "screw, head or drive not mapped": 0,
               "screw, not an ISO metric diameter": 0}
    jobs = {}
    screws = []
    for spec in data["specs"]:
        sid = spec["id"]
        if spec.get("category") == "bearing":
            if spec.get("type") == "radial-ball" and spec.get("bore_mm") and spec.get("outer_mm") and spec.get("width_mm"):
                jobs[sid] = {"kind": "bearing", "d": spec["bore_mm"], "D": spec["outer_mm"], "B": spec["width_mm"]}
            else:
                skipped["bearing, flanged or thrust"] += 1
        elif spec.get("category") == "screw":
            if "tapping" in sid:
                skipped["screw, self-tapping"] += 1; continue
            iso = SCREW_TYPES.get((spec.get("head"), spec.get("drive")))
            if not iso:
                skipped["screw, head or drive not mapped"] += 1; continue
            if spec.get("thread") not in ISO_DIAMETERS:
                skipped["screw, not an ISO metric diameter"] += 1; continue
            screws.append((links.get(sid, 0), sid, {"kind": "screw", "iso": iso, "thread": spec["thread"], "length": spec["length_mm"]}))
    screws.sort(key=lambda t: (-t[0], t[1]))
    ranked = [(sid, job) for _, sid, job in screws]   # the candidates, most linked first
    return jobs, ranked, skipped, links


# the FreeCAD side: one projection per job, written as TechDraw SVG fragments
FREECAD = r'''
import sys, json, FreeCAD, Part, TechDraw
sys.path.append(FreeCAD.getUserAppDataDir() + "Mod/fasteners")
import FastenersCmd
V = FreeCAD.Vector
def ring(ro, ri, h, z=0):
    return Part.makeCylinder(ro, h, V(0, 0, z)).cut(Part.makeCylinder(ri, h, V(0, 0, z)))
def bearing(d, D, B):
    # outer and inner race with rounded edges, and the shield that hides the balls
    t = (D - d) / 2
    outer = ring(D/2, D/2 - t*0.28, B)
    inner = ring(d/2 + t*0.28, d/2, B)
    # the rounded edges; a thin ring whose fillet is not valid keeps its sharp edges
    def rounded(r):
        f = r.makeFillet(min(0.3, B/10), [e for e in r.Edges if e.Curve.TypeId == 'Part::GeomCircle'])
        return f if f.isValid() else r
    return Part.makeCompound([rounded(outer), rounded(inner), ring(D/2 - t*0.28, d/2 + t*0.28, B*0.05, B*0.88)])
for job in json.loads(open(JOBS_JSON).read()):
    try:
        doc = FreeCAD.newDocument("job")
        if job["kind"] == "screw":
            obj = doc.addObject("Part::FeaturePython", "Screw")
            FastenersCmd.FSScrewObject(obj, job["iso"], None)
            obj.Diameter = job["thread"]; obj.Thread = True
            # a length the add-on's table has; any other length is a custom one
            if str(job["length"]) in obj.getEnumerationsOfProperty("Length"):
                obj.Length = str(job["length"])
            else:
                obj.Length = "Custom"; obj.LengthCustom = job["length"]
            doc.recompute()
            shape, view = obj.Shape, V(1, -1, 0.5)
        else:
            shape, view = bearing(job["d"], job["D"], job["B"]), V(1, -1, 1.4)
        if shape.isNull() or not shape.isValid() or not shape.Edges:
            raise ValueError("empty shape")
        open(job["out"], "w").write(TechDraw.projectToSVG(shape, view, ""))
        # the axes, to map the 3D model into the drawing's 2D frame; the solid's triangles, for the silhouette
        for i, end in enumerate([V(10, 0, 0), V(0, 10, 0), V(0, 0, 10)]):
            open(f"{job['out']}.axis{i}", "w").write(TechDraw.projectToSVG(Part.makeLine(V(0, 0, 0), end), view, ""))
        pts, tris = shape.tessellate(0.03)   # coarse: the silhouette is drawn at 30 px per mm
        json.dump({"pts": [[p.x, p.y, p.z] for p in pts], "tris": [list(t) for t in tris]}, open(f"{job['out']}.mesh.json", "w"))
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


def read_fragment(svg, transform):
    """The projected lines of a TechDraw fragment, transformed to mm (y down, as the SVG shows them)."""
    m = transform_matrix(transform)
    lin = m[:2, :2]
    if not np.allclose(lin @ lin.T, np.eye(2), atol=1e-6):
        raise ValueError("transform is not an isometry; arcs would need resampling")
    flip = np.linalg.det(lin) < 0
    segs = []
    for d in re.findall(r'\sd="([^"]*)"', svg):
        for seg in path_segments(d):
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


def run_freecad(jobs):
    WORK.mkdir(parents=True, exist_ok=True)
    jobs_path = WORK / "jobs.json"; script = WORK / "freecad_jobs.py"
    jobs_path.write_text(json.dumps(jobs))
    script.write_text(f"JOBS_JSON = {str(jobs_path)!r}\n" + FREECAD)
    subprocess.run(["flatpak", "run", "--filesystem=home", "--command=FreeCADCmd",
                    "org.freecad.FreeCAD", str(script)], check=True)


def slug_of(spec):
    return spec.removeprefix("spec/").replace("/", "-")


def main():
    data = json.loads((ROOT / "data/hobbydex-rc.json").read_text())
    bearings, ranked, skipped, links = select_specs(data)
    candidates = {**bearings, **dict(ranked[:SCREW_CANDIDATES])}
    jobs = [{**p, "out": str(WORK / f"{slug_of(spec)}.svgfrag")} for spec, p in candidates.items()]
    WORK.mkdir(parents=True, exist_ok=True)
    for f in WORK.glob("*.svgfrag"):
        f.unlink()
    run_freecad(jobs)

    OUT.mkdir(parents=True, exist_ok=True)
    index, failed = {}, []
    screws_ok = [sid for sid, _ in ranked if (WORK / f"{slug_of(sid)}.svgfrag").exists()][:SCREW_TOP]
    skipped["screw, FreeCAD failed"] = sum(1 for sid, _ in ranked[:SCREW_CANDIDATES] if sid not in screws_ok)
    skipped["screw, outside the top %d drawn" % SCREW_TOP] = len(ranked) - SCREW_CANDIDATES
    specs = {**bearings, **{sid: dict(ranked)[sid] for sid in screws_ok}}
    for spec, p in specs.items():
        slug = slug_of(spec)
        frag_path = WORK / f"{slug}.svgfrag"
        if not frag_path.exists():
            failed.append(spec); continue
        frag = frag_path.read_text()
        is_screw = p["kind"] == "screw"
        frag_transform = SCREW_FRAG if is_screw else BEARING_FRAG
        segs = read_fragment(frag, frag_transform)
        lines = sample_segments(segs)
        frame = axis_frame([read_fragment((WORK / f"{slug}.svgfrag.axis{i}").read_text(), frag_transform) for i in range(3)])
        seal = ""
        if not is_screw:
            seal = f'<path class="seal" d="{seal_path(p["d"], p["D"], p["B"], lambda x, y, z: project(frame, [(x, y, z)])[0])}" fill-rule="evenodd"/>'
        xs = [x for l in lines for x, _ in l]; ys = [y for l in lines for _, y in l]
        # the mesh's 2D box decides the raster's frame (it can reach past the lines)
        mesh_pts = project(frame, json.loads((WORK / f"{slug}.svgfrag.mesh.json").read_text())["pts"])
        x0 = min(min(xs), mesh_pts[:, 0].min()) - 1; y0 = min(min(ys), mesh_pts[:, 1].min()) - 1
        x1 = max(max(xs), mesh_pts[:, 0].max()) + 1; y1 = max(max(ys), mesh_pts[:, 1].max()) + 1
        nx, ny = math.ceil((x1 - x0) * PX), math.ceil((y1 - y0) * PX)
        mask, _ = mesh_mask(WORK / f"{slug}.svgfrag.mesh.json", frame, x0, y0, nx, ny)
        sil = trace(mask, x0, y0, slug)
        sil_pts = [pt for _, pts in sil for pt in pts]
        bx0 = min(min(xs), min(x for x, _ in sil_pts)); bx1 = max(max(xs), max(x for x, _ in sil_pts))
        by0 = min(min(ys), min(y for _, y in sil_pts)); by1 = max(max(ys), max(y for _, y in sil_pts))
        vx, vy = bx0 - PAD, by0 - PAD
        vw, vh = bx1 - bx0 + 2 * PAD, by1 - by0 + 2 * PAD
        dx, dy = nesting(mask)
        pitch_x, pitch_y = math.ceil(dx / PX * 100) / 100, math.ceil(dy / PX * 100) / 100
        body = f'<path vector-effect="non-scaling-stroke" d="{d_string(segs)}"/>'
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(vx)} {fmt(vy)} {fmt(vw)} {fmt(vh)}" '
               f'data-pitch-x="{pitch_x:g}" data-pitch-y="{pitch_y:g}">'
               f'<path class="sil" d="{d_string(sil)}"/>{seal}'
               f'<g class="lines" fill="none" stroke="currentColor" stroke-width="1.2" '
               f'stroke-linecap="butt" stroke-linejoin="miter">{body}</g></svg>\n')
        (OUT / f"{slug}.svg").write_text(svg)
        index[spec.removeprefix("spec/")] = f"{slug}.svg"
        print(f"{slug}.svg {len(svg.encode())} bytes, viewBox {vw:.2f} x {vh:.2f} mm, pitch {pitch_x:g} x {pitch_y:g} mm")
    # remove only the drawings this generator made before (its old index) that are no longer in it
    index_path = OUT / "index.json"
    previous = json.loads(index_path.read_text()).values() if index_path.exists() else []
    for name in previous:
        if name not in index.values() and (OUT / name).exists():
            (OUT / name).unlink()
    index_path.write_text(json.dumps(index, indent=2) + "\n")
    print(f"drawn {len(index)}, screws {len(screws_ok)}, FreeCAD failed {len(failed)}: {failed}")
    print("left out:", skipped)
    print("links of drawn specs:", sum(links.get(s, 0) for s in specs if s not in failed))


if __name__ == "__main__":
    sys.exit(main())
