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

def vehicle(body_parts, wheels, window=None, uncut=()):
    body = unary_union([Polygon(p) if isinstance(p, list) else p for p in body_parts])
    pass  # no window cut-outs: cab pillars turn into hairlines at small sizes
    shapes, cuts = zip(*wheels)
    body = body.difference(unary_union(cuts))
    if uncut: body = unary_union([body, *(Polygon(u) if isinstance(u, list) else u for u in uncut)])   # links and shocks reach the hubs: added after the wheel gaps
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
def _short_course():
    # traced by hand (Inkscape, mm): body outline and two wheels; arches cut round around each wheel, wheel nut holes
    def svgpath(d):   # m/l/h relative and M/L/H absolute, as Inkscape writes them
        toks = d.replace(",", " ").split(); pts, x, y, cmd, i = [], 0.0, 0.0, "m", 0
        while i < len(toks):
            t = toks[i]
            if t in "mMlLhHvVzZ": cmd = t; i += 1; continue
            if cmd in "mMlL":
                dx, dy = float(toks[i]), float(toks[i + 1]); i += 2
                x, y = (x + dx, y + dy) if cmd in "ml" else (dx, dy)
                cmd = {"m": "l", "M": "L"}.get(cmd, cmd)
            elif cmd in "hH": v = float(t); i += 1; x = x + v if cmd == "h" else v
            elif cmd in "vV": v = float(t); i += 1; y = y + v if cmd == "v" else v
            pts.append((x, y))
        return Polygon(pts)
    body = svgpath("m 66.691615,164.20958 64.616765,0.59281 4.1497,-16.30239 8.59581,-6.22455 13.63473,-0.59282 12.4491,4.44611 4.1497,9.48503 16.3024,-7.41018 -2.66767,-14.22754 -26.97305,-3.55689 -20.7485,0.88922 -16.3024,-14.82036 H 86.254491 L 71.730538,131.60479 H 42.089821 l -13.041918,3.85329 -6.520957,5.03893 -3.853294,13.93113 4.742515,-0.59281 5.631736,-10.67066 9.781439,-4.1497 13.63473,0.29641 9.781437,8.00299 3.556886,9.48503 z")
    wheels = [((43.275448, 162.72755), 18.377245), ((152.3533, 162.13472), 17.784431)]
    r = max(w[1] for w in wheels)
    body = body.buffer(0)
    # round arches: fill the hand-drawn notch first, then cut a circle around each wheel with a gap
    hull = body.convex_hull
    # fill each drawn notch completely (down to the body's bottom line), so the arch below is one clean circle
    body = unary_union([body, *(Point(c).buffer(rr + 9, 96).intersection(box(c[0] - rr - 9, 0, c[0] + rr + 9, c[1] + rr * 0.25)).intersection(hull) for c, rr in wheels)])
    body = body.difference(unary_union([Point(c).buffer(rr + 3.2, 96) for c, rr in wheels]))
    body = body.buffer(-1.8, 32).buffer(1.8, 32)   # drop slivers left between the drawn notch and the round arch
    tyres = unary_union([Point(c).buffer(rr, 96).difference(Point(c).buffer(rr * 0.3, 48)) for c, rr in wheels])
    g = unary_union([body, tyres])
    minx, miny, maxx, maxy = g.bounds
    k = min(46 / (maxx - minx), 22.4 / (maxy - miny))
    g = affinity.scale(g, k, k, origin=(minx, miny))
    return affinity.translate(g, (48 - (maxx - minx) * k) / 2 - minx, 23.2 - (maxy - miny) * k - miny)
V["short-course"] = _short_course()
def svgcurve(d, steps=12):
    """An Inkscape path (m/l/h/v/c/s, relative or absolute, one closed ring) as a polygon; curves sampled."""
    import re
    toks = re.findall(r"[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?", d)
    pts, x, y, cmd, i, last_c2 = [], 0.0, 0.0, "m", 0, None
    num = lambda: float(toks[i])
    while i < len(toks):
        if toks[i].isalpha():
            cmd = toks[i]; i += 1
            if cmd in "zZ": break
            continue
        rel = cmd.islower(); c = cmd.lower()
        if c in "ml":
            dx, dy = float(toks[i]), float(toks[i + 1]); i += 2
            x, y = (x + dx, y + dy) if rel else (dx, dy); pts.append((x, y)); last_c2 = None
            if cmd in "mM": cmd = "l" if rel else "L"
        elif c in "hv":
            v = float(toks[i]); i += 1
            if c == "h": x = x + v if rel else v
            else: y = y + v if rel else v
            pts.append((x, y)); last_c2 = None
        elif c in "cs":
            n = 6 if c == "c" else 4
            v = [float(t) for t in toks[i:i + n]]; i += n
            ox, oy = (x, y) if rel else (0.0, 0.0)
            if c == "c": c1 = (ox + v[0], oy + v[1]); c2 = (ox + v[2], oy + v[3]); e = (ox + v[4], oy + v[5])
            else:
                c1 = (2 * x - last_c2[0], 2 * y - last_c2[1]) if last_c2 else (x, y)
                c2 = (ox + v[0], oy + v[1]); e = (ox + v[2], oy + v[3])
            p0 = (x, y)
            for k in range(1, steps + 1):
                t = k / steps; u = 1 - t
                pts.append((u**3 * p0[0] + 3*u*u*t * c1[0] + 3*u*t*t * c2[0] + t**3 * e[0],
                            u**3 * p0[1] + 3*u*u*t * c1[1] + 3*u*t*t * c2[1] + t**3 * e[1]))
            x, y = e; last_c2 = c2
    return Polygon(pts).buffer(0)
def _monster():
    # drawn by the user (Inkscape, mm) over a Losi LMT: body outline and two wheels; wheel nut holes as on the other icons
    body = svgcurve("m 126.68167,103.34873 c -12.46658,0.44987 -24.82372,1.96978 -37.16672,3.95066 -1.326879,0.21295 -3.853512,1.18546 -3.853512,1.18546 l -10.374044,16.59899 -15.116907,-0.29662 c 0,0 -21.530271,-0.0361 -31.122648,4.15013 -2.701504,1.17898 -6.817155,5.6317 -6.817155,5.6317 l 0.296106,5.33507 1.778703,5.03897 c 0,0 2.534545,-4.83531 4.742346,-6.22443 5.379461,-3.3847 12.322294,-4.08418 18.673796,-3.85351 6.157439,0.22362 12.730828,1.51406 17.784444,5.03897 4.408893,3.07522 9.484692,13.0421 9.484692,13.0421 l 10.374561,1.77819 4.67155,13.5165 -14.245762,-0.46565 -0.645541,3.47078 16.242641,0.2391 0.794267,2.20968 21.934063,-0.29662 0.46457,-1.94562 13.32516,-0.0989 -0.64033,-3.25238 -11.89682,0.0548 3.49074,-14.61719 9.48469,-1.18546 c 0,0 6.29142,-10.48699 10.96729,-14.22755 3.65886,-2.92699 9.91036,-4.22214 14.52418,-5.03897 4.58913,-0.81246 9.85174,0.47092 14.22756,2.07481 4.32438,1.58504 9.18858,6.22442 9.18858,6.22442 l 0.59273,-4.14962 -5.92832,-12.44936 -3.85299,-15.41302 c 0,0 -1.90662,-3.26015 -3.55689,-3.55689 -12.7817,-2.29831 -25.35799,-2.91845 -37.82457,-2.46858 z")
    wheels = [((45.943111, 166.28442), 26.676645), ((157.39221, 166.28442), 27.269461)]
    tyres = unary_union([Point(c).buffer(r, 96).difference(Point(c).buffer(r * 0.3, 48)) for c, r in wheels])
    g = unary_union([body, tyres])
    minx, miny, maxx, maxy = g.bounds
    k = min(46 / (maxx - minx), 22.4 / (maxy - miny))
    g = affinity.scale(g, k, k, origin=(minx, miny))
    return affinity.translate(g, (48 - (maxx - minx) * k) / 2 - minx, 23.2 - (maxy - miny) * k - miny)
V["monster"] = _monster()
V["desert-truck"] = vehicle([
    # trophy truck (Traxxas UDR): tall cab, deep body down over the front wheel, bed with a cage, long rear trailing arm
    [(2, 16.6), (2, 10.6), (4.5, 9.4), (14, 8.8), (18, 3.6), (27, 3.4), (29, 8.0), (31.5, 8.2), (31.5, 14.4), (14, 14.4), (12.5, 16.6)],
    [(31.5, 8.0), (44.5, 5.2), (45.8, 7.4), (32, 10.4)], link(29.5, 13.0, 38, 17.4, 2.8)],
    [tyre(9.5, 6.0), tyre(38.5, 6.0)])
V["truck"] = vehicle([
    [(1.5, 18.4), (1.5, 13), (4, 11.7), (14, 11.1), (16, 6.9), (24.6, 6.5), (27.6, 11.1), (46.5, 11.3), (46.5, 18.4)]],
    [tyre(10, 4.9, False), tyre(37.5, 4.9, False)])
def _crawler():
    # traced by hand over a rock crawler climbing (Inkscape, mm): wheel centres and radii, cage, links
    def rel(d):   # Inkscape relative path "m x,y dx,dy ... z" -> absolute points
        nums = [tuple(map(float, q.split(","))) for q in d.replace("m", "").replace("z", "").split()]
        pts = [nums[0]]
        for dx, dy in nums[1:]: pts.append((pts[-1][0] + dx, pts[-1][1] + dy))
        return Polygon(pts)
    body = [rel(d) for d in (
        "m 80.029938,114.11676 -16.302394,-6.52095 15.116767,-6.22455 20.452096,6.52095 16.302393,-8.002989 21.34132,8.595809 13.93114,19.26646 8.5958,3.55689 -1.77844,9.18863 -19.56287,-6.22456 -24.89821,2.07485 -25.194607,-8.89221 z",
        "m 69.952094,126.26946 29.64072,1.48203 -1.18563,4.14971 -28.751498,-0.59282 z",
        "m 68.173652,121.23054 18.970059,-6.52096 3.260479,6.22455 -22.823353,4.44611 z",
        "m 131.60479,149.98203 -8.89222,-20.15568 4.44611,-1.18563 8.59581,19.85928 z",
        "m 128.93712,155.02096 -19.85928,-20.74851 3.8533,-2.37125 15.70958,17.48802 z")]
    wheels = [((58.095806, 126.86227), 16.598803), ((141.97903, 159.17065), 17.191616)]
    nuts = [Point(c).buffer(r * 0.3, 48) for c, r in wheels]               # the wheel nut hole, as on the other icons
    g = unary_union([*body, *(Point(c).buffer(r, 96) for c, r in wheels)])
    (fx, fy), fr = wheels[0]
    ground = wheels[1][0][1] + wheels[1][1]                                 # the rear wheel stands on the ground
    rock = Polygon([(fx - fr - 12, ground), (fx - fr - 4, fy + fr + 3.0), (fx - 6, fy + fr + 6.0), (fx + 5, fy + fr + 6.8), (fx + fr + 16, ground)])
    g = unary_union([g, rock.difference(Point(fx, fy).buffer(fr + 5.0, 96))]).difference(unary_union(nuts))
    minx, miny, maxx, maxy = g.bounds
    k = min(46 / (maxx - minx), 22.4 / (maxy - miny))
    g = affinity.scale(g, k, k, origin=(minx, miny))
    return affinity.translate(g, (48 - (maxx - minx) * k) / 2 - minx, 0.8 - miny)
V["crawler"] = _crawler()
V["kart"] = vehicle([
    # go-kart: very small wheels, the front ones set back under the steering column, a nose bumper ahead of them,
    # a low flat frame, a big seat with its back leaning toward the rear, the engine behind the seat
    [(5.0, 20.2), (5.0, 18.2), (7.0, 17.0), (42.0, 17.0), (42.0, 20.2)],
    [(22.5, 17.2), (22.5, 15.0), (28.8, 15.0), (31.4, 7.0), (35.0, 7.8), (32.8, 15.2), (33.6, 17.2)],   # seat pan, backrest leaning back
    [(5.0, 18.2), (7.0, 17.0), (17.0, 11.6), (19.6, 12.8), (19.0, 17.2)],   # front fairing (nose panel) rising from the bumper to the steering column
    link(17.5, 17.2, 20.5, 10.4, 2.2), link(18.0, 8.8, 23.0, 12.0, 2.4),
    box(32.4, 13.2, 41.0, 17.2)],
    [tyre(14.0, 3.0, gap=1.4), tyre(39.5, 3.2, gap=1.4)])
def _motorcycle():
    # motocross bike facing left: big spoked wheels, a fork raked back to the bars, tank and long flat seat,
    # the engine low between the wheels, a swingarm to the rear axle, a high front fender
    fy, ry = GROUND - 6.2, GROUND - 6.4
    wheels = [tyre(8.6, 6.2, gap=1.6), tyre(38.8, 6.4, gap=1.6)]
    body = [
        [(13.6, 6.2), (21.0, 5.6), (25.5, 7.8), (41.0, 6.8), (45.4, 7.4), (45.4, 8.8), (37.0, 10.2), (30.0, 13.0), (28.6, 18.2), (19.8, 18.2), (15.4, 11.4)],   # tank, seat, side panel, engine
        [(3.0, 8.6), (11.6, 7.0), (12.0, 8.6), (4.0, 10.0)],   # front fender
        link(12.4, 3.4, 16.6, 2.8, 1.6),   # handlebar
    ]
    uncut = [link(8.6, fy, 13.6, 3.2, 2.0), link(27.0, 14.6, 38.8, ry, 2.2)]   # fork to the front axle, swingarm to the rear axle
    return vehicle(body, wheels, uncut=uncut)
V["motorcycle"] = _motorcycle()
def _drag():
    # rail dragster facing left: small front wheel under the tip of a long thin chassis, the driver's cage and the engine
    # with its blower ahead of a big rear slick, a tall rear wing on struts, a wheelie bar out behind on a tiny wheel
    rx, rr = 37.0, 7.2
    ry = GROUND - rr
    rim = lambda deg: (rx + (rr - 0.4) * math.cos(math.radians(deg)), ry - (rr - 0.4) * math.sin(math.radians(deg)))
    wheels = [tyre(4.6, 2.1, False, gap=0.8), tyre(rx, rr, gap=1.2)]
    body = [
        [(18.0, 18.6), (19.2, 12.8), (21.8, 11.2), (24.4, 11.6), (24.8, 18.4)],   # driver's cage
        [(24.4, 18.4), (24.8, 12.4), (29.0, 12.2), (29.4, 18.0)],   # engine
        box(25.2, 8.6, 28.4, 12.4),   # blower
        [(36.4, 0.8), (47.2, 0.2), (47.2, 2.8), (36.8, 3.6)],   # rear wing
    ]
    uncut = [[(0.8, 19.6), (1.6, 18.4), (20.0, 17.6), (rx, 17.4), (rx, 19.4), (1.6, 20.4)],   # nose and chassis rails to the rear axle
             link(37.6, 3.2, *rim(110), 1.3), link(45.0, 2.4, *rim(60), 1.3),   # wing struts to the tyre's top
             link(*rim(-20), 46.0, 21.4, 1.3), Point(46.0, 21.9).buffer(1.3, 32)]   # wheelie bar and its wheel
    g = vehicle(body, wheels, uncut=uncut)
    return g.difference(Point(rx, ry).buffer(rr * 0.3, 32))   # the rails cross the hub: keep its nut hole
V["drag"] = _drag()
def _lowrider():
    # 60s hardtop (Impala) facing left: long hood and trunk, a long low roof, small wheels tucked up under the body;
    # hopping: the car pivots on its rear wheel, the front lifted and its wheel hanging down out of the arch
    fx, rx, r = 9.0, 38.5, 3.0
    body = Polygon([(0.6, 21.0), (0.6, 17.8), (1.6, 16.6), (14.0, 16.0), (18.4, 12.2), (31.0, 12.0), (35.0, 15.6), (46.6, 16.0), (47.4, 17.4), (47.4, 21.0)])
    front, fcut = tyre(fx, r, False, gap=0.7)
    rear, rcut = tyre(rx, r, False, gap=0.7)
    g = unary_union([body.difference(unary_union([fcut, rcut])), rear, affinity.translate(front, 0, 1.6)])
    g = affinity.rotate(g, 7, origin=(rx, GROUND))
    minx, miny, maxx, maxy = g.bounds
    k = min(47 / (maxx - minx), 23 / (maxy - miny), 1)
    g = affinity.scale(g, k, k, origin=(maxx, maxy))
    return affinity.translate(g, 47.6 - maxx, GROUND - maxy)
V["lowrider"] = _lowrider()
def _sprint():
    # winged sprint car (oval track), facing left: small front tyres, big rear tyres, low narrow body and tail tank,
    # the roll cage, and the big top wing with its side board over the cage; a small nose wing up front
    front, fcut = tyre(9.0, 3.4)
    rear, rcut = tyre(38.0, 5.2)
    body = Polygon([(12.4, 18.6), (12.4, 15.8), (22.0, 14.6), (31.0, 14.0), (44.6, 14.4), (45.4, 16.4), (44.6, 18.6)])
    axle = box(3.0, 14.0, 13.0, 15.2)   # front axle and nose above the front tyre
    cage = Polygon([(23.0, 14.8), (25.0, 9.0), (32.5, 8.6), (33.5, 14.2)]).difference(Polygon([(25.6, 13.8), (26.6, 10.2), (31.4, 10.0), (32.0, 13.6)]))
    wing = Polygon([(14.0, 4.6), (16.0, 1.2), (42.6, 0.6), (42.6, 7.2), (16.6, 7.6)])
    struts = unary_union([Polygon(link(27.0, 7.4, 26.2, 9.4, 1.4)), Polygon(link(32.0, 7.2, 32.4, 9.0, 1.4))])
    nose = unary_union([box(1.0, 12.8, 9.0, 14.0), box(1.0, 11.6, 2.4, 15.6)])
    tank = Polygon([(41.0, 14.4), (41.6, 11.6), (46.6, 11.6), (46.6, 14.4)])
    g = unary_union([body, axle, cage, wing, struts, nose, tank]).difference(unary_union([fcut, rcut]))
    return unary_union([g, front, rear])
V["oval"] = _sprint()
V["race-truck"] = vehicle([
    # cab-over race truck (Tamiya Actros MP4 on TT-01E): tall cab with a roof spoiler, short chassis, no trailer
    [(1.5, 20.0), (1.5, 9.0), (2.6, 4.6), (4.0, 3.8), (17.5, 3.8), (18.8, 5.0), (19.2, 13.0), (46.5, 13.0), (46.5, 18.2), (44.0, 20.0)],
    [(4.0, 3.8), (5.0, 1.6), (17.0, 1.6), (17.5, 3.8)]],   # roof spoiler
    [tyre(10.5, 4.0, False), tyre(36.0, 4.0, False)])
def _trailer():
    # box semi-trailer, front to the left: the box, the chassis rail under it, landing legs down near the front, three axles at the rear
    wheels = [tyre(x, 3.5, False, gap=0.9) for x in (28.6, 36.0, 43.4)]
    return vehicle([box(1.2, 4.0, 46.8, 13.8), box(6.0, 13.8, 46.6, 15.0), box(10.6, 15.0, 12.2, 21.8), box(8.8, 21.8, 14.0, 23.2)], wheels)
V["trailer"] = _trailer()
def _tracks(x0, x1, y0, y1, wheels):
    # a track run: a stadium shape, with the road wheels as nut-like holes
    r = (y1 - y0) / 2
    run = unary_union([box(x0 + r, y0, x1 - r, y1), Point(x0 + r, y0 + r).buffer(r, 48), Point(x1 - r, y0 + r).buffer(r, 48)])
    holes = unary_union([Point(x, y0 + r).buffer(r * 0.42, 32) for x in wheels])
    return run.difference(holes)
def _tank():
    tracks = _tracks(2.5, 41.5, 15.0, 23.2, [7.0, 14.5, 22.0, 29.5, 37.0])
    hull = Polygon([(1.5, 15.6), (4.0, 11.6), (40.0, 11.6), (43.5, 14.0), (43.5, 15.6)]).difference(box(0, 15.0, 48, 23.2)).union(box(4.0, 13.8, 41.0, 15.0))
    turret = Polygon([(12.0, 11.8), (14.5, 6.6), (30.0, 6.6), (32.5, 11.8)])
    barrel = box(0.5, 8.2, 14.0, 9.8)
    return unary_union([tracks, hull, turret, barrel])
V["tank"] = _tank()
def _construction():
    # tracked excavator: tracks, a cab on the upper body, the boom and dipper arm with a bucket out front (facing left)
    tracks = _tracks(14.0, 44.0, 16.0, 23.2, [18.5, 25.0, 32.0, 39.5])
    body = Polygon([(18.0, 16.6), (18.0, 10.0), (21.0, 4.8), (29.5, 4.8), (30.5, 10.0), (46.0, 10.0), (46.0, 16.6)])
    boom = Polygon([(19.5, 12.5), (12.0, 3.2), (9.0, 3.6), (8.6, 5.6), (17.5, 13.6)])   # boom rising forward from the body
    stick = Polygon([(8.4, 3.6), (10.6, 4.2), (6.6, 16.4), (4.4, 15.8)])                    # dipper arm down to the bucket
    bucket = Polygon([(1.2, 16.6), (6.8, 14.6), (8.2, 18.0), (5.8, 21.6), (1.8, 21.0)])
    return unary_union([tracks, body, boom, stick, bucket])
V["construction"] = _construction()
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
