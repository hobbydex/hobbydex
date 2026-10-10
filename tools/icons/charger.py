"""Charger icon: a solid case with a gauge (dial arc and needle) and - / + signs cut out, 24x24."""
import math
from shapely.geometry import Polygon, box, Point, LineString
from shapely.ops import unary_union

case = box(2, 3.5, 22, 20.5).buffer(1.5, join_style=1).buffer(-1.5, join_style=1)
cx, cy = 12, 13.2
arc = Point(cx, cy).buffer(6.6, 64).difference(Point(cx, cy).buffer(4.8, 64)).difference(box(0, cy, 24, 24))
needle = LineString([(cx, cy), (cx + 5.0 * math.cos(math.radians(55)), cy - 5.0 * math.sin(math.radians(55)))]).buffer(0.9, cap_style=1)
pivot = Point(cx, cy).buffer(1.5, 32)
minus = box(4.2, 16.2, 8.2, 17.8)
plus = unary_union([box(15.8, 16.2, 19.8, 17.8), box(17.0, 15.0, 18.6, 19.0)])
g = case.difference(unary_union([arc, needle, pivot, minus, plus]))

def path(g):
    polys = [g] if g.geom_type == "Polygon" else list(g.geoms)
    out = ""
    for p in polys:
        for r in [p.exterior, *p.interiors]:
            out += "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(r.coords)[:-1]) + "Z"
    return out
open("charger.svgpart", "w").write(f'<symbol id="charger" viewBox="0 0 24 24"><path fill-rule="evenodd" d="{path(g)}"/></symbol>')
