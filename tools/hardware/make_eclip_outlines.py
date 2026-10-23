#!/usr/bin/env python3
"""E-clip (DIN 6799) outlines to scale: the top face of the Fasteners add-on's solid for every DIN size.

FreeCAD builds each size with the add-on's own DIN6799 generator (FSScrewObject, Diameter = the size's
shaft range). The top face's wires, discretised to 0.01 mm, are the plan outline of the clip around the
centre of the groove (the origin). Written to src/lib/eclipOutlines.json, keyed by the add-on's range
string; specs are matched to a size by groove_mm. Run from the repo root:

    python3 -I tools/hardware/make_eclip_outlines.py

FreeCAD runs through flatpak; its work files go to ~/.cache/hobbydex-eclip.
"""
import csv
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/lib/eclipOutlines.json"
WORK = Path.home() / ".cache/hobbydex-eclip"
TABLE = "/home/francisdb/.var/app/org.freecad.FreeCAD/data/FreeCAD/v1-1/Mod/fasteners/FsData/din6799def.csv"

# the FreeCAD side: one solid per size of the add-on's table; the top face's loops in mm, rounded to 0.001
FREECAD = r'''
import csv, json, sys, FreeCAD, Part
sys.path.append(FreeCAD.getUserAppDataDir() + "Mod/fasteners")
import FastenersCmd
lines = open(TABLE_CSV).read().splitlines()[1:]   # the first line is the table name
rows = list(csv.DictReader(lines))
out = []
for row in rows:
    rng = row["range"]
    doc = FreeCAD.newDocument("eclip")
    try:
        obj = doc.addObject("Part::FeaturePython", "Clip")
        FastenersCmd.FSScrewObject(obj, "DIN6799", None)
        obj.Diameter = rng
        doc.recompute()
        shape = obj.Shape
        if shape.isNull() or not shape.isValid():
            raise ValueError("invalid solid")
        top = max(f.BoundBox.ZMax for f in shape.Faces)
        # the plan outline: the section a hair below the top face (the solid is an extrusion of its outline, so
        # this is the top face's outline with its seams merged); each closed wire, discretised to 0.01 mm
        loops = []
        for wire in shape.slice(FreeCAD.Vector(0, 0, 1), top - 0.0005):
            if not wire.isClosed():
                raise ValueError("open section wire")
            pts = [(p.x, p.y) for p in wire.discretize(Distance=0.01)[:-1]]
            loops.append([[round(x, 4), round(y, 4)] for x, y in pts])
        out.append({"range": rng, "top_z": round(top, 4), "loops": loops, "area": round(sum(Part.Face(w).Area for w in shape.slice(FreeCAD.Vector(0, 0, 1), top - 0.0005)), 4)})
    except Exception as err:
        out.append({"range": rng, "error": str(err)})
    finally:
        FreeCAD.closeDocument(doc.Name)
json.dump(out, open(RESULT_JSON, "w"))
'''


def simplify(pts, tol=0.003):
    """Douglas-Peucker on a closed loop (split at its two farthest points): drops points within tol mm of a chord."""
    if len(pts) < 4:
        return pts
    def dp(seg):
        (x0, y0), (x1, y1) = seg[0], seg[-1]
        dx, dy = x1 - x0, y1 - y0
        L = (dx * dx + dy * dy) ** 0.5 or 1e-12
        best, bi = -1.0, 0
        for i in range(1, len(seg) - 1):
            x, y = seg[i]
            dist = abs(dy * (x - x0) - dx * (y - y0)) / L
            if dist > best:
                best, bi = dist, i
        if best <= tol:
            return [seg[0], seg[-1]]
        return dp(seg[:bi + 1])[:-1] + dp(seg[bi:])
    far = max(range(1, len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
    a = dp(pts[:far + 1]) + dp(pts[far:] + [pts[0]])
    return [list(p) for p in a[:-1]]


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    script = WORK / "eclip_outlines_job.py"
    result = WORK / "eclip_outlines.json"
    script.write_text(f'TABLE_CSV = "{TABLE}"\nRESULT_JSON = "{result}"\n' + FREECAD)
    subprocess.run(["flatpak", "run", "--filesystem=home", "--command=FreeCADCmd",
                    "org.freecad.FreeCAD", str(script)], check=True)
    rows = json.loads(result.read_text())
    table = {row["range"]: row for row in csv.DictReader(Path(TABLE).read_text().splitlines()[1:])}
    sizes = {}
    for r in rows:
        if "error" in r:
            raise SystemExit(f"FreeCAD failed for {r['range']}: {r['error']}")
        t = table[r["range"]]
        loops = [simplify([tuple(p) for p in loop]) for loop in r["loops"]]
        sizes[r["range"]] = {
            "groove_mm": float(t["groove_dia"]), "shaft_min_mm": float(t["shaft_dia_min"]),
            "shaft_max_mm": float(t["shaft_dia_max"]), "outer_mm": float(t["d3_max"]),
            "thickness_mm": float(t["S"]), "a_mm": float(t["a"]),
            "loops": [[[round(x, 3), round(y, 3)] for x, y in loop] for loop in loops],
            "area_mm2": r["area"]}
    OUT.write_text(json.dumps({"source": "Fasteners add-on, DIN6799 (FsData/din6799def.csv)", "sizes": sizes},
                              separators=(",", ":")) + "\n")
    print(f"wrote {len(sizes)} sizes to {OUT}")


if __name__ == "__main__":
    main()
