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
# ball end: one solid ball with a small reflection, a neck and a thin threaded shank
ball = Point(12, 8.0).buffer(6.8, 64).difference(box(14.4, 3.4, 16.2, 5.2))
thin = Polygon([(10.6, 14.0), (13.4, 14.0)] + [p for i in range(4) for p in ((13.4, 15.2 + 2.0 * i), (14.6, 16.2 + 2.0 * i), (13.4, 17.2 + 2.0 * i))]
               + [(13.4, 23.2), (10.6, 23.2)] + [p for i in reversed(range(4)) for p in ((10.6, 17.2 + 2.0 * i), (9.4, 16.2 + 2.0 * i), (10.6, 15.2 + 2.0 * i))])
S["ball-end"] = unary_union([ball, thin])
# differential: case with the ring gear on one side and the two output shafts
case = box(8.5, 6.5, 18.5, 17.5).buffer(1.2).buffer(-1.2)
ring = box(4.5, 2.5, 8.0, 21.5)
teeth = unary_union([box(3.2, 3.5 + 2.4 * i, 4.6, 4.7 + 2.4 * i) for i in range(8)])
S["differential"] = unary_union([case, ring, teeth, box(0.5, 10.4, 4.6, 13.6), box(18.4, 10.4, 23.5, 13.6)])
# pinion: involute stub teeth and a motor-shaft bore with its flat (D shape)
def involute_gear(cx, cy, z, ra):
    m = ra / (z / 2 + 0.8); rp = z * m / 2; rf = rp - 1.0 * m;   # stub teeth: bolder at icon size
    rb = rp * math.cos(math.radians(20))
    inv = lambda r: (lambda al: math.tan(al) - al)(math.acos(min(1, rb / r)))
    half = math.pi / (2 * z) + inv(rp)
    r0 = max(rf, rb); fl = [(r0 + (ra - r0) * j / 8) for j in range(9)]
    flank = [(r, half - inv(r)) for r in fl]
    at = lambda r, a: (cx + r * math.sin(a), cy - r * math.cos(a))
    pts = []
    for i in range(z):
        c = 2 * math.pi * i / z; hr = half * rb / rf if rf < rb else flank[0][1]
        pts.append(at(rf, c - hr))
        pts += [at(r, c - a) for r, a in flank]
        pts += [at(ra, c - flank[-1][1] + 2 * flank[-1][1] * j / 4) for j in range(1, 4)]
        pts += [at(r, c + a) for r, a in reversed(flank)]
        pts.append(at(rf, c + hr))
        nx = c + 2 * math.pi / z
        pts += [at(rf, c + hr + (nx - 2 * hr - c) * j / 4) for j in range(1, 4)]
    return Polygon(pts)
S["pinion"] = involute_gear(12, 12, 11, 10.8).difference(Point(12, 12).buffer(3.4, 48).difference(box(8, 14.2, 16, 16)))
# tyre: a solid ring with tread blocks on the outside, no holes in the rubber
# tyre: hollow rubber with the slanted sidewall pattern cut in, and shallow tread blocks on the outside
tyre = Point(12, 12).buffer(9.6, 64).difference(Point(12, 12).buffer(5.2, 64))
grooves = unary_union([affinity.rotate(affinity.rotate(box(11.4, 3.4, 12.6, 5.6), 30, origin=(12, 4.5)), i * 24, origin=(12, 12)) for i in range(15)])
blocks = [affinity.rotate(box(10.2, 1.4, 13.8, 2.6), i * 36, origin=(12, 12)) for i in range(10)]
S["tire"] = unary_union([tyre.difference(grooves), *blocks])
# spur gear: fine teeth, and a hex in the middle like a slipper hub
hexhole = Polygon([(12 + 3.6 * math.cos(i * math.pi / 3), 12 + 3.6 * math.sin(i * math.pi / 3)) for i in range(6)])
S["spur-gear"] = cog(12, 12, 24, 11.2, 9.6, 0.5).difference(hexhole)
# steering wheel: rim, three spokes and hub as one shape
rim = Point(12, 12).buffer(10, 64).difference(Point(12, 12).buffer(7.6, 64))
spokes = [LineString([(12, 12), (12 + 8.5 * math.cos(math.radians(a)), 12 + 8.5 * math.sin(math.radians(a)))]).buffer(1.3, cap_style=2) for a in (90, 200, 340)]
S["steering"] = unary_union([rim, *spokes, Point(12, 12).buffer(3.0, 32)])

# servo: case with its mounting tabs, the output spline and the horn, merged into one shape (no gaps at overlaps)
case = box(3.5, 9.0, 20.5, 19.0).buffer(1.2).buffer(-1.2)
tabs = box(1.0, 11.0, 23.0, 13.0)
spline = Point(8.5, 8.5).buffer(2.8, 32)
horn = LineString([(8.5, 8.5), (18.5, 5.0)]).buffer(1.15, cap_style=1)
S["servo"] = unary_union([case, tabs, spline, horn]).difference(Point(8.5, 8.5).buffer(0.9, 16))

# tool: an open-end wrench at 45 degrees, its hole centred on the handle's axis
head = Point(16.8, 7.2).buffer(5.2, 64)
jaw = affinity.rotate(Polygon([(15.4, -1.0), (18.2, -1.0), (18.2, 6.0), (16.8, 7.6), (15.4, 6.0)]), 45, origin=(16.8, 7.2))   # the jaw ends in half a hex: 3 corners
handle = LineString([(4.6, 19.4), (14.0, 10.0)]).buffer(2.3, cap_style=1)
S["tool"] = unary_union([head.difference(jaw), handle]).difference(Point(5.4, 18.6).buffer(1.0, 32))

# wheel: rim, five star spokes and the hub as one shape, with the axle hole
rim = Point(12, 12).buffer(10.2, 64).difference(Point(12, 12).buffer(7.9, 64))
star = [LineString([(12, 12), (12 + 8.6 * math.sin(math.radians(a)), 12 - 8.6 * math.cos(math.radians(a)))]).buffer(1.25, cap_style=2) for a in range(0, 360, 72)]
S["wheel"] = unary_union([rim, *star, Point(12, 12).buffer(3.0, 32)]).difference(Point(12, 12).buffer(1.2, 32))

out = "\n".join(f'<symbol id="{k}" viewBox="0 0 24 24"><path d="{path(g)}"/></symbol>' for k, g in S.items())
open("parts2.svgpart", "w").write(out)
print(len(S))
