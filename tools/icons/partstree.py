"""Parts tree (sprue) icon: an outer frame, a runner across it and small moulded parts on gates, one shape, 24x24."""
from shapely.geometry import box, Point
from shapely.ops import unary_union
frame = box(2, 3, 22, 21).difference(box(4.2, 5.2, 19.8, 18.8))
runner = box(4, 11, 20, 13)
parts = [box(6.0, 6.8, 9.6, 9.4), Point(16, 8.2).buffer(2.0, 32), box(6.4, 15.0, 10.6, 17.2), Point(15.6, 16.0).buffer(1.6, 32)]
gates = [box(7.4, 9.2, 8.2, 11.2), box(15.6, 10.0, 16.4, 11.2), box(8.2, 12.8, 9.0, 15.2), box(15.2, 12.8, 16.0, 14.6)]
g = unary_union([frame, runner, *parts, *gates])
d = ""
for p in ([g] if g.geom_type == "Polygon" else list(g.geoms)):
    for r in [p.exterior, *p.interiors]:
        d += "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(r.coords)[:-1]) + "Z"
open("partstree.svgpart", "w").write(f'<symbol id="parts-tree" viewBox="0 0 24 24"><path fill-rule="evenodd" d="{d}"/></symbol>')
