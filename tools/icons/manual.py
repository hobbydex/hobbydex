"""Manual icon: an open booklet with lines of text on both pages, one shape, 24x24."""
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
left = Polygon([(1.5, 5.0), (6.5, 4.0), (11.2, 5.4), (11.2, 20.0), (6.5, 18.6), (1.5, 19.6)])
right = Polygon([(12.8, 5.4), (17.5, 4.0), (22.5, 5.0), (22.5, 19.6), (17.5, 18.6), (12.8, 20.0)])
lines = unary_union([box(3.6, 8.0 + 2.8 * i, 9.4, 9.1 + 2.8 * i) for i in range(4)] + [box(14.6, 8.0 + 2.8 * i, 20.4, 9.1 + 2.8 * i) for i in range(4)])
g = unary_union([left, right]).difference(lines)
d = ""
for p in ([g] if g.geom_type == "Polygon" else list(g.geoms)):
    for r in [p.exterior, *p.interiors]:
        d += "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(r.coords)[:-1]) + "Z"
open("manual.svgpart", "w").write(f'<symbol id="manual" viewBox="0 0 24 24"><path fill-rule="evenodd" d="{d}"/></symbol>')
