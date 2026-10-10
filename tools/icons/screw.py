"""Bold screw icon: socket cap head with a hex hole and a threaded shank, 45 degrees, 24x24."""
from shapely.geometry import Polygon, box, Point
from shapely.ops import unary_union
from shapely import affinity
# drawn upright, centred on x=12, then rotated
head = box(7.0, 1.2, 17.0, 7.6)
hexhole = Polygon([(12 + 2.2 * __import__("math").cos(a), 4.4 + 2.2 * __import__("math").sin(a)) for a in [i * 3.14159 / 3 for i in range(6)]])
# a thick shank with three bold thread teeth per side
pts = [(9.6, 7.5)]
y = 8.6
for i in range(3):
    pts += [(9.6, y), (8.0, y + 2.0), (9.6, y + 4.0)]; y += 4.4
pts += [(9.6, 21.6), (12, 23.2), (14.4, 21.6)]
for i in range(3):
    y -= 4.4; pts += [(14.4, y + 4.0), (16.0, y + 2.0), (14.4, y)]
pts += [(14.4, 7.5)]
shank = Polygon(pts)
g = unary_union([head, shank]).difference(hexhole)
g = affinity.rotate(g, 45, origin=(12, 12))
g = affinity.scale(g, 0.92, 0.92, origin=(12, 12))
ring = g.exterior
d = "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(ring.coords)[:-1]) + "Z"
for h in g.interiors:
    d += "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(h.coords)[:-1]) + "Z"
open("screw.svgpart", "w").write(f'<symbol id="screw" viewBox="0 0 24 24"><path fill-rule="evenodd" d="{d}"/></symbol>')
