"""Side-view vehicle icons with realistic proportions, 48x24, filled, wheel arches cut with shapely."""
import math, sys
from shapely.geometry import Polygon, Point, box
from shapely.ops import unary_union
from shapely import affinity

GROUND = 23.2
def tyre(cx, r, offroad=True, cy=None, gap=2.2, hub=False):
    cy = GROUND - r if cy is None else cy
    t = Point(cx, cy).buffer(r, 64).difference(Point(cx, cy).buffer(r * (0.6 if hub else 0.3), 64))
    if hub: t = unary_union([t, Point(cx, cy).buffer(r * 0.3, 32)])
    return t, Point(cx, cy).buffer(r + gap, 64)

def vehicle(body_parts, wheels, window=None):
    body = unary_union([Polygon(p) if isinstance(p, list) else p for p in body_parts])
    pass  # no window cut-outs: cab pillars turn into hairlines at small sizes
    shapes, cuts = zip(*wheels)
    body = body.difference(unary_union(cuts))
    return unary_union([body, *shapes])

def path(g):
    polys = [g] if g.geom_type == "Polygon" else list(g.geoms)
    out = []
    for p in polys:
        for ring in [p.exterior, *p.interiors]:
            c = list(ring.coords)
            out.append("M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in c[:-1]) + "Z")
    return "".join(out)

V = {}
def link(x1, y1, x2, y2, w=2.4):
    import math
    dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy); nx, ny = -dy / L * w / 2, dx / L * w / 2
    return [(x1 + nx, y1 + ny), (x2 + nx, y2 + ny), (x2 - nx, y2 - ny), (x1 - nx, y1 - ny)]
V["buggy"] = vehicle([
    [(8.6, 17.4), (9.2, 15.8), (12.5, 15.2), (15.5, 14.6), (19.5, 11.4), (25, 11.0), (31.5, 12.0), (35.5, 13.4), (38.5, 13.6), (38.5, 18.4), (8.6, 18.4)],
    [(35, 10.2), (37, 6.0), (46.6, 4.0), (47.2, 7.2), (40.6, 10.2)], box(38.2, 9.6, 40.4, 13.8)],
    [tyre(9.2, 4.4), tyre(39.2, 5.0)], window=[(20.2, 12.2), (24.8, 11.8), (28.2, 12.6), (22.6, 13.4)])
V["truggy"] = vehicle([
    [(9.4, 15.6), (10.0, 13.8), (13.5, 13.2), (16.5, 12.6), (20.5, 9.4), (26, 9.0), (32.5, 10.0), (36.5, 11.4), (39.0, 11.6), (39.0, 16.6), (9.4, 16.6)],
    [(35.5, 8.2), (37.5, 4.0), (47.0, 2.0), (47.6, 5.2), (41.0, 8.2)], box(38.7, 7.6, 40.9, 11.8)],
    [tyre(9.6, 5.9), tyre(39.4, 6.1)], window=[(21.2, 10.2), (25.8, 9.8), (29.2, 10.6), (23.6, 11.4)])
V["stadium-truck"] = vehicle([
    # full-width truck body after the user's reference: sloped hood, cab, flat bed, fenders down over the wheels; rear wing on a stand
    [(1.5, 15.6), (1.5, 11.0), (3.5, 9.8), (13, 9.0), (17, 4.6), (25.5, 4.4), (27.5, 7.6), (44, 7.8), (46.5, 9.4), (46.8, 15.6)],
    [(34.5, 4.6), (46.6, 2.8), (46.8, 5.0), (34.8, 6.8)], box(40.0, 4.6, 42.2, 8.4)],
    [tyre(10, 5.8), tyre(38, 5.8)])
V["short-course"] = vehicle([
    # full-width body with fenders over the wheels: sloped hood, cab, flat bed, tail (ARRMA Senton)
    [(1.5, 17.8), (1.5, 12.4), (3.5, 11.0), (13.5, 10.2), (17.5, 6.0), (26.5, 5.8), (28.5, 9.2), (46.5, 9.6), (46.8, 17.8)]],
    [tyre(10, 5.4), tyre(38, 5.4)], window=[(18.6, 7.1), (24.0, 6.9), (24.8, 9.4), (15.9, 9.6)])
V["monster"] = vehicle([
    # pickup body resting on top of two big wheels, one solid silhouette (no gap cut around the wheels)
    [(1.5, 11.0), (1.5, 8.6), (3.5, 7.4), (12.5, 6.8), (15.5, 2.4), (24.5, 2.2), (26.5, 6.4), (46.5, 6.6), (47, 11.0)],
    box(16, 10.8, 32, 16.0)],
    [tyre(11, 7.0), tyre(37.5, 7.0)], window=[(16.6, 3.4), (23.4, 3.4), (24.8, 6.4), (14.2, 6.4)])
V["desert-truck"] = vehicle([
    # trophy truck (Traxxas UDR): tall cab, deep body down over the front wheel, bed with a cage, long rear trailing arm
    [(2, 16.6), (2, 10.6), (4.5, 9.4), (14, 8.8), (18, 3.6), (27, 3.4), (29, 8.0), (31.5, 8.2), (31.5, 14.4), (14, 14.4), (12.5, 16.6)],
    [(31.5, 8.0), (44.5, 5.2), (45.8, 7.4), (32, 10.4)], link(29.5, 13.0, 38, 17.4, 2.8)],
    [tyre(9.5, 6.0), tyre(38.5, 6.0)])
V["truck"] = vehicle([
    [(1.5, 18.4), (1.5, 13), (4, 11.7), (14, 11.1), (16, 6.9), (24.6, 6.5), (27.6, 11.1), (46.5, 11.3), (46.5, 18.4)]],
    [tyre(10, 4.9, False), tyre(37.5, 4.9, False)])
V["crawler"] = vehicle([
    [(3, 10.6), (3, 7.2), (5, 6.4), (13.5, 6.0), (16, 2.4), (24, 2.4), (26, 6.0), (44.5, 6.2), (45, 10.6)],
    link(17.5, 10.0, 10.5, 16.8, 3.2), link(30, 10.0, 37, 16.8, 3.2)],
    [tyre(10, 6.4), tyre(37.5, 6.4)])
V["touring"] = vehicle([
    [(1, 20.2), (1, 17.2), (3, 15.8), (12, 14.6), (17, 10.6), (28, 10.2), (33.5, 14), (44, 14.6), (46.8, 16), (46.8, 20.2)],
    [(40, 12.2), (46.6, 11.6), (46.6, 13.4), (40, 13.8)]],
    [tyre(9.5, 3.7, False), tyre(37.5, 3.7, False)])
V["car"] = vehicle([
    [(1, 20.2), (1, 17), (4, 15.6), (13, 14.6), (18, 10.8), (27, 10.6), (34, 14.3), (45, 15), (46.8, 16.6), (46.8, 20.2)]],
    [tyre(9.5, 3.7, False), tyre(37.5, 3.7, False)])
V["rally"] = vehicle([
    [(2, 19.8), (2, 16.2), (3.2, 15.0), (12.5, 14.0), (17.5, 9.0), (34.5, 8.6), (37.2, 9.2), (39.6, 13.6), (40.6, 19.8)],
    [(4.4, 15.4), (15.5, 14.6), (16, 16.6), (4, 17.2)], [(31.5, 14.2), (40, 14.0), (40.4, 16.6), (31.4, 16.8)],
    [(29.5, 7.4), (38.6, 7.4), (38.6, 9.2), (30, 9.4)]],
    [tyre(10, 4.2), tyre(34.2, 4.2)], window=[(18.6, 10.1), (25.4, 9.9), (25.4, 13.6), (15.4, 13.8)])
V["drift"] = vehicle([
    [(1.2, 20.6), (1.2, 17.6), (2.6, 16.2), (9.5, 15.4), (16, 14.6), (20.5, 10.6), (28, 10.2), (35, 13.0), (41, 14.6), (43.2, 16.2), (43.2, 20.6)],
    box(44.8, 14.2, 47.8, 15.8), box(45.0, 17.4, 47.8, 19.0)],
    [tyre(9.6, 3.6, False), tyre(36.2, 3.6, False)], window=[(21.6, 11.4), (27.6, 11.2), (32.2, 13.4), (17.6, 13.6)])
V["formula"] = vehicle([
    [(2.2, 19.8), (3.2, 18.6), (12, 17.0), (20, 16.2), (23.5, 14.0), (28, 13.6), (30, 12.8), (34, 13.4), (42, 15.6), (43.2, 18.8), (42.5, 20.0)],
    box(0.4, 19.2, 8.4, 21.0), Point(25.6, 12.9).buffer(1.7, 32),
    [(42.2, 10.4), (47.4, 10.4), (47.4, 15.4), (45.8, 15.4), (45.8, 12), (42.2, 12)]],
    [tyre(8, 3.4, False), tyre(38.6, 4.3, False)])
V["pan-car"] = vehicle([
    [(0.8, 20.8), (1.0, 19.4), (5, 17.4), (10, 16.2), (13.5, 16.6), (17.5, 16.9), (24, 16.5), (31, 15.9), (37, 15.0), (41.5, 13.6), (45, 11.6), (46.9, 10.4), (46.9, 20.8)],
    Point(20.4, 16.4).buffer(0.9, 32)],
    [tyre(9.2, 3.1, False), tyre(37.8, 3.3, False)])
V["mini"] = affinity.scale(V["car"], 0.72, 0.72, origin=(24, GROUND))
V["boat"] = unary_union([Polygon([(1.0, 12.4), (46.5, 14.0), (46.5, 19.6), (9.5, 19.6)]), Polygon([(16, 13.2), (19.5, 9.4), (31, 9.6), (33.5, 13.6)]), box(25, 5.8, 27.2, 9.8)])

out = []
for k, g in V.items():
    out.append(f'<symbol id="{k}" viewBox="0 0 48 24"><path fill-rule="evenodd" d="{path(g)}"/></symbol>')
open(sys.argv[1], "w").write("\n".join(out) + "\n")
print(len(V), "vehicles")
