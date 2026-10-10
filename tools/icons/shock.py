"""Shock icon in the style of the shock-spring icon: the same slanted coil bars between two spring cups,
with the shock body showing between the coils and an eyelet at each end, one merged shape, 24x24."""
from shapely.geometry import Polygon, box, Point
from shapely.ops import unary_union

top = Point(12, 2.2).buffer(1.9, 32).difference(Point(12, 2.2).buffer(0.75, 32))
bottom = Point(12, 21.8).buffer(1.9, 32).difference(Point(12, 21.8).buffer(0.75, 32))
cups = [box(6.5, 4.0, 17.5, 5.6), box(6.5, 18.4, 17.5, 20.0)]
coils = [Polygon([(7.5, 5.6 + 2.6 * i), (16.5, 6.9 + 2.6 * i), (16.5, 8.3 + 2.6 * i), (7.5, 7.0 + 2.6 * i)]) for i in range(5)]
body = box(10.6, 3.6, 13.4, 20.4)
g = unary_union([top, bottom, *cups, *coils, body])
d = ""
for p in ([g] if g.geom_type == "Polygon" else list(g.geoms)):
    for r in [p.exterior, *p.interiors]:
        d += "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(r.coords)[:-1]) + "Z"
open("shock.svgpart", "w").write(f'<symbol id="shock" viewBox="0 0 24 24"><path fill-rule="evenodd" d="{d}"/></symbol>')
