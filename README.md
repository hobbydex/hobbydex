# hobbydex

The Hobbydex website: a static site generated from the open hobby parts
datasets (currently [hobbydex-rc](https://github.com/hobbydex/hobbydex-rc)).
Built with Astro, searched with Pagefind, deployed to GitHub Pages at
https://hobbydex.com.

## Develop

The site reads one JSON export, never the TOML data directly. Produce it from
a checkout of the data repo, then point the build at it:

```
(cd ../hobbydex-rc && python3 -I tools/export.py ../hobbydex/data/hobbydex-rc.json)
npm install
npm run dev        # http://localhost:4321
npm run build      # dist/, including the Pagefind index
```

`HOBBYDEX_DATA` overrides the export path (default `data/hobbydex-rc.json`).

## Deploy

`.github/workflows/deploy.yml` checks out the data repo, validates and exports
it, builds the site and publishes it to GitHub Pages on every push to `main`,
on demand, and once a day to pick up new data.

After each deploy, the pages whose own content (head data and `<main>`, not
the shared header, footer or asset names) changed since they were last
submitted go to IndexNow (`tools/indexnow.mjs`, key in
`public/57e36ab789104bcf088bfd87194fc1b2.txt`), at most 2,000 URLs per UTC day
across all deploys, newest changes first. The deployed
`/indexnow-manifest.json.gz` records the hash and day of each page's last
submission and the day's count; each deploy logs changed, submitted and
skipped by the cap.

## Thanks

Hobbydex is built on open source. Thank you to the people behind:

- [Astro](https://astro.build) - the static site generator every page is built with
- [Pagefind](https://pagefind.app) - the search, which runs in the browser with no server
- [TypeScript](https://www.typescriptlang.org) - the site's code
- [Primer Primitives](https://github.com/primer/primitives) - the colour and spacing tokens behind the light and dark themes
- [Shapely](https://shapely.readthedocs.io) and [svgpathtools](https://github.com/mathandy/svgpathtools) - drawing the vehicle and part icons
- [Inkscape](https://inkscape.org) - the hand-traced icons and checking renders
- [FreeCAD](https://www.freecad.org) - the 3D models behind the hardware drawings (screws, nuts, washers, bearings, e-clips, pins and pinions), projected as line drawings
- [Fasteners Workbench](https://github.com/shaise/FreeCAD_FastenersWB) for FreeCAD - screws, nuts, washers and e-clips built to their ISO, DIN and other standards
- [FreeCAD Gears](https://github.com/looooo/freecad.gears) - the involute pinions
- [Potrace](https://potrace.sourceforge.net) - tracing the filled outlines of the hardware drawings and icons

The data itself is read from manufacturers' manuals and parts lists with the tools thanked in [hobbydex-rc](https://github.com/hobbydex/hobbydex-rc#thanks).

## License

Code is under the [MIT License](LICENSE). The data shown on the site comes
from the dataset repositories and is CC0.
