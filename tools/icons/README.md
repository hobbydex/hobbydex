# Icon sources

`public/icons.svg` is one sprite of filled icons drawn in `currentColor`, so they
follow the light and dark themes.

- `vehicles.py` draws the kit-type side views (48x24, all facing left) with
  shapely (`pip install shapely`): `python3 vehicles.py vehicles.svgpart`, then
  paste the symbols into `public/icons.svg` (or replace the ones with the same
  ids). Edit the point lists to change a silhouette.
- `parts.py` generates the part-category and theme icons (24x24):
  `python3 parts.py parts.svg`.
- `src/lib/wideIcons.ts` lists the 2:1 icons so `Icon.astro` sizes them.
