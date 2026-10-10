"""Rebuild 24x24 icons so overlapping subpaths merge (union) instead of cancelling (even-odd).
A subpath that lies fully inside another one stays a hole; everything else is unioned."""
import re, sys
from svgpathtools import parse_path
from shapely.geometry import Polygon
from shapely.ops import unary_union

def subpolys(d):
    out = []
    for sub in re.findall(r"[Mm][^Mm]*", d):
        p = parse_path(sub)
        pts = [p.point(t / 200) for t in range(201)] if p.length() > 0 else []
        poly = Polygon([(z.real, z.imag) for z in pts]).buffer(0)
        if not poly.is_empty: out.append(poly)
    return out

def rebuild(d):
    ps = subpolys(d)
    # nesting depth: how many other subpaths fully contain this one; even = solid, odd = hole
    depth = [sum(1 for j, q in enumerate(ps) if j != i and q.contains(p)) for i, p in enumerate(ps)]
    parts = []
    for i, p in enumerate(ps):
        if depth[i] % 2: continue
        holes = [q for j, q in enumerate(ps) if depth[j] == depth[i] + 1 and p.contains(q)]
        parts.append(p.difference(unary_union(holes)) if holes else p)
    g = unary_union(parts)
    g = g.simplify(0.02)
    polys = [g] if g.geom_type == "Polygon" else list(g.geoms)
    s = ""
    for p in polys:
        for r in [p.exterior, *p.interiors]:
            s += "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(r.coords)[:-1]) + "Z"
    return s

site = sys.argv[1]; ids = sys.argv[2:]
svg = open(site).read()
for i in ids:
    m = re.search(r'(<symbol id="' + re.escape(i) + r'" viewBox="0 0 24 24">)(.*?)(</symbol>)', svg, re.S)
    if not m: print("skip", i); continue
    ds = re.findall(r'<path[^>]*\sd="([^"]+)"', m.group(2))
    trs = re.findall(r'transform="([^"]+)"', m.group(2))
    if trs: print("skip (transform)", i); continue
    new = rebuild("".join(ds))
    svg = svg.replace(m.group(0), f'{m.group(1)}<path d="{new}"/>{m.group(3)}')
    print("ok", i)
open(site, "w").write(svg)
