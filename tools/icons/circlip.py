#!/usr/bin/env python3
"""The circlip icon (24x24): a DIN 471 external retaining ring, top view, gap down, lug holes as holes.

The outline is the same one tools/hardware/make_more_drawings.py builds for the bag drawings
(circlip_profile, the 5 mm ring of the DIN 471 table), written as SVG arcs and lines:

    python3 tools/icons/circlip.py            # prints the <symbol> for public/icons.svg
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "hardware"))
from make_more_drawings import DIN471, circlip_profile  # noqa: E402

SIZE = 24
FILL = 21.0   # the longest side of the ring, in icon units


def circlip_icon(shaft=5):
    _t, d3, a, b, d5 = DIN471[shaft]
    g = circlip_profile(d3, a, b, d5)
    ri, Ro, s, hg, rt, y0, c2, P1, P2, n = (g[k] for k in ("ri", "Ro", "s", "hg", "rt", "y0", "c2", "P1", "P2", "n"))
    top, bottom = ri + b, c2[1] - rt
    xmax = max(P1[0], P2[0] + 0.0, Ro if P1[0] >= Ro * 0.999 else P1[0])
    xmax = max(P1[0], c2[0] + rt)
    k = FILL / max(2 * xmax, top - bottom)
    yc = (top + bottom) / 2

    def X(x): return SIZE / 2 + x * k
    def Y(y): return SIZE / 2 - (y - yc) * k
    def p(x, y): return f"{X(x):.2f} {Y(y):.2f}"
    large_tip = 1 if math.atan2(n[1], n[0]) > 0 else 0
    d = (f"M{p(-P1[0], P1[1])}A{Ro * k:.2f} {Ro * k:.2f} 0 1 1 {p(P1[0], P1[1])}L{p(*P2)}"
         f"A{rt * k:.2f} {rt * k:.2f} 0 {large_tip} 1 {p(hg, c2[1])}L{p(hg, y0)}"
         f"A{ri * k:.2f} {ri * k:.2f} 0 1 0 {p(-hg, y0)}L{p(-hg, c2[1])}"
         f"A{rt * k:.2f} {rt * k:.2f} 0 {large_tip} 1 {p(-P2[0], P2[1])}Z")
    for sx in (1, -1):   # the lug holes
        cx, cy, r = X(sx * c2[0]), Y(c2[1]), d5 / 2 * k
        d += f"M{cx - r:.2f} {cy:.2f}a{r:.2f} {r:.2f} 0 1 0 {2 * r:.2f} 0a{r:.2f} {r:.2f} 0 1 0 {-2 * r:.2f} 0Z"
    return d


if __name__ == "__main__":
    print(f'<symbol id="circlip" viewBox="0 0 24 24"><path fill-rule="evenodd" d="{circlip_icon()}"/></symbol>')
