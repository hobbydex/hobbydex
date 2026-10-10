"""Redrawn part icons as single merged shapes (no even-odd holes where parts overlap), 24x24."""
import math
from shapely.geometry import Polygon, box, Point, LineString
from shapely.ops import unary_union
from shapely import affinity

def path(g):
    polys = [g] if g.geom_type == "Polygon" else list(g.geoms)
    out = ""
    for p in polys:
        for r in [p.exterior, *p.interiors]:
            out += "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(r.coords)[:-1]) + "Z"
    return out
def cog(cx, cy, n, ro, ri, tw=0.5):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n; h = math.pi / n * tw
        for ang, r in ((a - h * 1.5, ri), (a - h, ro), (a + h, ro), (a + h * 1.5, ri)):
            pts.append((cx + r * math.sin(ang), cy - r * math.cos(ang)))
    return Polygon(pts)
def thread(x0, x1, y, h, teeth):   # a threaded bar along x with teeth on both edges
    pts, step = [(x0, y - h)], (x1 - x0) / teeth
    for i in range(teeth): pts += [(x0 + i * step, y - h), (x0 + (i + 0.5) * step, y - h - 0.9), (x0 + (i + 1) * step, y - h)]
    pts += [(x1, y + h)]
    for i in reversed(range(teeth)): pts += [(x0 + (i + 1) * step, y + h), (x0 + (i + 0.5) * step, y + h + 0.9), (x0 + i * step, y + h)]
    return Polygon(pts)

S = {}
# ball end (rod end): an eye with the ball sitting in it, and a threaded shank
eye = Point(12, 8.5).buffer(7.2, 64).difference(Point(12, 8.5).buffer(4.9, 64))
ball = Point(12, 8.5).buffer(3.6, 64).difference(Point(12, 8.5).buffer(1.2, 32))
shank = affinity.rotate(thread(14.5, 23, 12, 2.2, 3), 90, origin=(12, 12))
S["ball-end"] = unary_union([eye, ball, box(9.6, 14.5, 14.4, 16.5), shank])
# differential: case with the ring gear on one side and the two output shafts
case = box(8.5, 6.5, 18.5, 17.5).buffer(1.2).buffer(-1.2)
ring = box(4.5, 2.5, 8.0, 21.5)
teeth = unary_union([box(3.2, 3.5 + 2.4 * i, 4.6, 4.7 + 2.4 * i) for i in range(8)])
S["differential"] = unary_union([case, ring, teeth, box(0.5, 10.4, 4.6, 13.6), box(18.4, 10.4, 23.5, 13.6)])
# pinion: a small cog with its bore and a short boss
S["pinion"] = unary_union([cog(12, 11, 12, 9.5, 7.6, 0.55).difference(Point(12, 11).buffer(2.4, 32)), box(10.8, 19.4, 13.2, 21.0)])
# shock spring: a coil seen from the side
pts = [(6, 3)] + [(18 if i % 2 else 6, 3 + 2.5 * (i + 1)) for i in range(7)]
S["shock-spring"] = unary_union([LineString(pts).buffer(1.25, cap_style=2, join_style=2), box(6, 2, 18, 3.4), box(6, 20.6, 18, 22)])
# tyre: a solid ring with tread blocks on the outside, no holes in the rubber
# tyre: smooth round rubber with the tread cut in as slanted grooves, a rim and a hub
tyre = Point(12, 12).buffer(10.4, 64).difference(Point(12, 12).buffer(6.0, 64))
grooves = unary_union([affinity.rotate(affinity.rotate(box(11.35, 2.9, 12.65, 5.0), 30, origin=(12, 3.95)), i * 24, origin=(12, 12)) for i in range(15)])
S["tire"] = unary_union([tyre.difference(grooves), Point(12, 12).buffer(4.6, 64).difference(Point(12, 12).buffer(1.8, 32))])
# spur gear: fine teeth, and a hex in the middle like a slipper hub
hexhole = Polygon([(12 + 3.6 * math.cos(i * math.pi / 3), 12 + 3.6 * math.sin(i * math.pi / 3)) for i in range(6)])
S["spur-gear"] = cog(12, 12, 24, 11.2, 9.6, 0.5).difference(hexhole)
# steering wheel: rim, three spokes and hub as one shape
rim = Point(12, 12).buffer(10, 64).difference(Point(12, 12).buffer(7.6, 64))
spokes = [LineString([(12, 12), (12 + 8.5 * math.cos(math.radians(a)), 12 + 8.5 * math.sin(math.radians(a)))]).buffer(1.3, cap_style=2) for a in (90, 200, 340)]
S["steering"] = unary_union([rim, *spokes, Point(12, 12).buffer(3.0, 32)])

out = "\n".join(f'<symbol id="{k}" viewBox="0 0 24 24"><path d="{path(g)}"/></symbol>' for k, g in S.items())
open("parts2.svgpart", "w").write(out)
print(len(S))
