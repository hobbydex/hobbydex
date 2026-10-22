#!/usr/bin/env python3
"""Checks the hardware drawings in src/assets/hardware/ (the files of make_more_drawings.py).

Each drawing's silhouette (path class "sil") is compared with its line work (class "lines"):
- the outer outline of the silhouette lies within 0.2 mm of a line (no stray outline);
- the silhouette's area is at most 5 % more than the area the lines enclose, plus 0.05 mm of its
  outline length (the raster puts the silhouette up to that far outside the line centres).
Files that fail are listed, one per line. Run from the repo root:

    python3 tools/hardware/check_more_drawings.py

Rasters are at 30 px/mm; the outline is sampled every 0.02 mm.
"""
import re
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_more_drawings import OUT, PX, path_segments, sample_segments  # noqa: E402

TOL_MM = 0.2
AREA_SLACK = 1.05


def polylines(d):
    return sample_segments(path_segments(d))


def dense(polys, step=0.02):
    """Points along the polylines, at most `step` mm apart."""
    out = []
    for line in polys:
        pts = np.array(line, dtype=float)
        for a, b in zip(pts[:-1], pts[1:]):
            n = max(1, int(np.hypot(*(b - a)) / step))
            out.append(a + (b - a) * np.linspace(0, 1, n, endpoint=False)[:, None])
        out.append(pts[-1:])
    return np.vstack(out) if out else np.zeros((0, 2))


def check(svg):
    sil_d = re.search(r'class="sil"[^>]*d="([^"]*)"', svg).group(1)
    lines_d = re.search(r'<g class="lines"[^>]*>(.*?)</g>', svg, re.S).group(1)
    lines = [l for d in re.findall(r' d="([^"]*)"', lines_d) for l in polylines(d)]
    sil = polylines(sil_d)
    if not lines or not sil:
        return ["empty drawing"]
    xs = np.concatenate([np.array(l)[:, 0] for l in lines + sil])
    ys = np.concatenate([np.array(l)[:, 1] for l in lines + sil])
    x0, y0 = xs.min() - 1, ys.min() - 1
    nx, ny = int((xs.max() + 1 - x0) * PX) + 2, int((ys.max() + 1 - y0) * PX) + 2

    def px(l):
        return [((x - x0) * PX, (y - y0) * PX) for x, y in l]

    def mask_of(polys):
        """Even-odd fill of polygons on the raster."""
        out = np.zeros((ny, nx), dtype=bool)
        for poly in polys:
            m = Image.new("1", (nx, ny), 0)
            ImageDraw.Draw(m).polygon(px(poly), fill=1)
            out ^= np.array(m).astype(bool)
        return out

    problems = []
    # the lines, drawn 1 px wide and dilated to the tolerance
    near = Image.new("L", (nx, ny), 0)
    for l in lines:
        ImageDraw.Draw(near).line(px(l), fill=255, width=1)
    r = int(round(TOL_MM * PX))
    near = np.array(near.filter(ImageFilter.MaxFilter(2 * r + 1))) > 0
    # the outer outline only: a hole's edge lies inside the part and need not be a line
    sil_mask = mask_of(sil)
    def is_hole(q):
        """True when the polygon's first vertex lies inside another boundary."""
        ix, iy = int(round((q[0][0] - x0) * PX)), int(round((q[0][1] - y0) * PX))
        return any(0 <= iy < ny and 0 <= ix < nx and mask_of([o])[iy, ix] for o in sil if o is not q)

    outer = [q for q in sil if not is_hole(q)]
    bpts = dense(outer)
    ix = np.round((bpts[:, 0] - x0) * PX).astype(int)
    iy = np.round((bpts[:, 1] - y0) * PX).astype(int)
    miss = ~near[np.clip(iy, 0, ny - 1), np.clip(ix, 0, nx - 1)]
    if miss.any():
        far = bpts[miss]
        problems.append(f"outline {int(miss.sum())} points off the lines, e.g. at ({far[0][0]:.2f}, {far[0][1]:.2f}) mm")
    # the area the lines enclose: the outside is flood-filled in C
    canvas = Image.new("L", (nx, ny), 255)
    for l in lines:
        ImageDraw.Draw(canvas).line(px(l), fill=0, width=3)
    ImageDraw.floodfill(canvas, (0, 0), 128)
    enclosed = np.array(canvas) != 128
    a_sil, a_lines = sil_mask.sum() / PX ** 2, enclosed.sum() / PX ** 2
    perimeter = sum(np.hypot(*np.diff(np.array(q), axis=0).T).sum() for q in outer)
    if a_sil > AREA_SLACK * a_lines + 0.05 * perimeter:
        problems.append(f"silhouette area {a_sil:.2f} mm2 vs {a_lines:.2f} mm2 enclosed by the lines")
    return problems


def check_file(path):
    return path.name, check(path.read_text())


def main():
    files = sorted(OUT.glob("*-*.svg"))
    failed = {}
    with ProcessPoolExecutor(max_workers=8) as ex:
        for name, problems in ex.map(check_file, files, chunksize=8):
            if problems:
                failed[name] = problems
    for name, problems in failed.items():
        print(name, "; ".join(problems))
    print(f"checked {len(files)} drawings, failed {len(failed)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
