"""Screw icon: plain side view of a socket cap screw, head left, threaded shank right, 24x24."""
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

head = box(1.5, 5.5, 8.5, 18.5)
pts = [(8.5, 9.6)]
x = 9.5
for i in range(4):                       # top thread: bold teeth
    pts += [(x, 9.6), (x + 1.6, 7.8), (x + 3.2, 9.6)]; x += 3.2
pts += [(22.5, 9.6), (22.5, 14.4)]
for i in range(4):                       # bottom thread, mirrored
    x -= 3.2; pts += [(x + 3.2, 14.4), (x + 1.6, 16.2), (x, 14.4)]
pts += [(8.5, 14.4)]
g = unary_union([head, Polygon(pts)])
d = "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(g.exterior.coords)[:-1]) + "Z"
open("screw.svgpart", "w").write(f'<symbol id="screw" viewBox="0 0 24 24"><path d="{d}"/></symbol>')
