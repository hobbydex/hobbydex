"""Ball end icon: a ball stud seen from the side - ball, neck, hex flange, threaded stem - one solid shape, 24x24."""
from shapely.geometry import Polygon, box, Point
from shapely.ops import unary_union

ball = Point(12, 6.2, ).buffer(5.0, 64)
neck = box(10.4, 10.0, 13.6, 12.6)
flange = Polygon([(6.5, 12.4), (17.5, 12.4), (17.5, 15.6), (6.5, 15.6)])
pts = [(9.6, 15.4)]
y = 16.2
for i in range(2):
    pts += [(9.6, y), (8.2, y + 1.6), (9.6, y + 3.2)]; y += 3.4
pts += [(9.6, 22.8), (14.4, 22.8)]
for i in range(2):
    y -= 3.4; pts += [(14.4, y + 3.2), (15.8, y + 1.6), (14.4, y)]
pts += [(14.4, 15.4)]
g = unary_union([ball, neck, flange, Polygon(pts)])
d = "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(g.exterior.coords)[:-1]) + "Z"
open("ballend.svgpart", "w").write(f'<symbol id="ball-end" viewBox="0 0 24 24"><path d="{d}"/></symbol>')
