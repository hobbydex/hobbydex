"""Ball end and rod end icons, 24x24, one solid shape each (holes are cut-outs, fill-rule evenodd).

All share one ball (BALL_R, with the same highlight) so a ball end and the ball in a rod end read as the
same part. Threads use the screw icon's style: triangular teeth on both edges and slanted thread lines
cut across the shank.

- ball-end: threaded ball stud, the default (Tamiya MA20 "5x9mm ball connector": ball, flared neck, hex
  collar, threaded shank; Tamiya 53599 photo).
- ball-end-through-hole: a ball with a bore and flat ends, seen a little from above (Kyosho W0201 photo,
  Arrma ARA320501 exploded view).
- ball-end-nut: a ball on a hex base with a threaded bore, no shank (Tamiya MA22 "ball connector nut",
  Tamiya 54195 photo).
- rod-end: a ball cup: an eye around the ball, a neck into the body and the threaded rod screwed into the
  body (Tamiya MB9/MB10 adjusters and the 1:1 steering rod drawing, Tamiya 54209 photo).

python3 ballend.py ballend.svgpart, then replace the symbols with the same ids in public/icons.svg."""
import math, sys
from shapely.geometry import Polygon, box, Point
from shapely.ops import unary_union
from shapely import affinity

BALL_R = 4.4

def path(g):
    polys = [g] if g.geom_type == "Polygon" else list(g.geoms)
    out = ""
    for p in polys:
        for r in [p.exterior, *p.interiors]:
            out += "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(r.coords)[:-1]) + "Z"
    return out

def ball(cx, cy, r=BALL_R):
    """The ball with its highlight: a small round window up and to the left."""
    return Point(cx, cy).buffer(r, 64).difference(Point(cx - 0.42 * r, cy - 0.42 * r).buffer(0.2 * r, 32))

def shank(cx, y0, y1, root=1.7, tooth=0.9, pitch=2.2, chamfer=0.6):
    """A vertical threaded shank from y0 down to y1 in the screw icon's style: triangular teeth on both
    edges, a chamfered tip and slanted thread lines (cut out) running from a crest on one edge to the
    next half turn on the other."""
    n = int((y1 - y0 - chamfer) // pitch)
    L, R = [], []
    y = y0
    L.append((cx - root, y)); R.append((cx + root, y))
    for i in range(n):
        L += [(cx - root - tooth, y + pitch / 2), (cx - root, y + pitch)]
        R += [(cx + root + tooth, y + pitch / 2), (cx + root, y + pitch)]
        y += pitch
    L += [(cx - root, y1 - chamfer), (cx - root + chamfer, y1)]
    R += [(cx + root, y1 - chamfer), (cx + root - chamfer, y1)]
    body = Polygon(L + R[::-1])
    w = 0.36 * pitch                    # line width along the axis, as on the screw icon (1 / 2.7)
    inset = 0.55
    lines = [Polygon([(cx - root + inset, yy + pitch / 2 - w / 2), (cx - root + inset, yy + pitch / 2 + w / 2),
                      (cx + root - inset, yy + pitch + w / 2 - 0.36 * pitch), (cx + root - inset, yy + pitch - w / 2 - 0.36 * pitch)])
             for yy in [y0 + k * pitch for k in range(n)]]
    return body, unary_union(lines)

def hex_collar(cx, y0, y1, half, ch=0.5, face=0.45):
    """A hex collar seen across its corners: chamfered corners and two cut lines for the face edges."""
    c = Polygon([(cx - half, y0 + ch), (cx - half + ch, y0), (cx + half - ch, y0), (cx + half, y0 + ch),
                 (cx + half, y1 - ch), (cx + half - ch, y1), (cx - half + ch, y1), (cx - half, y1 - ch)])
    lines = unary_union([box(x - face / 2, y0 + 0.45, x + face / 2, y1 - 0.45) for x in (cx - half / 2, cx + half / 2)])
    return c, lines

def flare(cx, y0, y1, r0, r1, steps=12):
    """A neck that flares from half-width r0 at y0 to r1 at y1 along a concave (quarter-ellipse) fillet."""
    L = []
    for i in range(steps + 1):
        t = i / steps
        L.append((cx - (r0 + (r1 - r0) * (1 - math.cos(t * math.pi / 2)) ** 1.0), y0 + (y1 - y0) * math.sin(t * math.pi / 2)))
    R = [(2 * cx - x, y) for x, y in L]
    return Polygon(L + R[::-1])

S = {}
cx = 12.0

# threaded ball stud: ball, flared neck, hex collar, threaded shank
by = 1.0 + BALL_R
neck = flare(cx, by + BALL_R - 1.6, 11.0, 1.9, 3.6)
collar, faces = hex_collar(cx, 10.8, 13.6, 4.7)
thread, tlines = shank(cx, 13.6, 23.0)
S["ball-end"] = unary_union([ball(cx, by), neck, collar, thread]).difference(unary_union([faces, tlines]))

# ball nut: ball, a short round neck that flares into a wide hex base (no shank)
by = 3.8 + BALL_R
neck = unary_union([box(cx - 2.9, by, cx + 2.9, 15.0), flare(cx, by + BALL_R + 0.6, 15.6, 2.9, 5.2, 10)])
collar, faces = hex_collar(cx, 15.2, 19.4, 5.8)
S["ball-end-nut"] = unary_union([ball(cx, by), neck, collar]).difference(faces)

# through-hole ball: flat ends and a bore, the axis tipped toward the viewer
R, cy, h, k = 7.0, 12.4, 4.6, 0.38
a = math.sqrt(R * R - h * h)
top = affinity.scale(Point(cx, cy - h).buffer(a, 64), 1, k)
bottom = affinity.scale(Point(cx, cy + h).buffer(a, 64), 1, k)
band = Point(cx, cy).buffer(R, 96).intersection(box(0, cy - h, 24, cy + h))
solid = unary_union([band, top, bottom])
bore = affinity.scale(Point(cx, cy - h).buffer(2.3, 48), 1, k)
rim = affinity.scale(Point(cx, cy - h).buffer(a, 64), 1, k).difference(affinity.scale(Point(cx, cy - h).buffer(a - 0.55, 64), 1, k)).intersection(box(0, cy - h + 0.05, 24, 24))
hl = Point(cx - 0.42 * R, cy - 0.05 * R).buffer(0.2 * BALL_R, 32)
S["ball-end-through-hole"] = solid.difference(unary_union([bore, rim, hl]))

# rod end (ball cup): eye around the ball, a neck into the body, the threaded rod screwed into the body
ey, gap, wall = 6.6, 0.5, 1.4
ri, ro = BALL_R + gap, BALL_R + gap + wall
eye = Point(cx, ey).buffer(ro, 96).difference(Point(cx, ey).buffer(ri, 96))
body_top, body_bot, bw = 12.2, 18.6, 5.4
neck = flare(cx, ey + ri + 0.3, body_top + 0.6, 3.2, bw, 8)
body = Polygon([(cx - bw, body_top + 0.6), (cx + bw, body_top + 0.6), (cx + bw, body_bot - 0.5), (cx + bw - 0.5, body_bot),
                (cx - bw + 0.5, body_bot), (cx - bw, body_bot - 0.5)])
thread, tlines = shank(cx, body_bot - 0.01, 23.8)
S["rod-end"] = unary_union([eye, ball(cx, ey), neck, body, thread]).difference(tlines)

out = sys.argv[1] if len(sys.argv) > 1 else "ballend.svgpart"
with open(out, "w") as f:
    for k_, g in S.items():
        f.write(f'<symbol id="{k_}" viewBox="0 0 24 24"><path fill-rule="evenodd" d="{path(g.simplify(0.02))}"/></symbol>\n')
