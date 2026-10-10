"""Bold shock icon: eyelets, body, rod, and a coil spring as three 45-degree bars crossing the body, 24x24."""
from shapely.geometry import Polygon, box, Point
from shapely.ops import unary_union
from shapely import affinity

def bar(y, w=12.0, t=2.0):   # one coil turn seen from the side: a slanted bar centred on x=12
    b = box(12 - w / 2, y - t / 2, 12 + w / 2, y + t / 2)
    return affinity.rotate(b, -28, origin=(12, y))

top = Point(12, 2.6).buffer(2.0, 32).difference(Point(12, 2.6).buffer(0.8, 32))
cap = box(10.4, 4.2, 13.6, 5.8)
body = box(9.0, 5.6, 15.0, 16.0)
rod = box(11.0, 15.8, 13.0, 19.6)
bottom = Point(12, 21.2).buffer(2.0, 32).difference(Point(12, 21.2).buffer(0.8, 32))
coils = [bar(y) for y in (8.0, 11.2, 14.4)]
gap = unary_union([c.buffer(0.7) for c in coils])
g = unary_union([top, cap, body.difference(gap), rod, bottom, *coils])

def path(g):
    polys = [g] if g.geom_type == "Polygon" else list(g.geoms)
    out = ""
    for p in polys:
        for r in [p.exterior, *p.interiors]:
            out += "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(r.coords)[:-1]) + "Z"
    return out
open("shock.svgpart", "w").write(f'<symbol id="shock" viewBox="0 0 24 24"><path fill-rule="evenodd" d="{path(g)}"/></symbol>')
