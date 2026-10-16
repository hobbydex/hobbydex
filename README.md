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

After each deploy, the pages whose HTML changed since the previous deploy
are submitted to IndexNow (`tools/indexnow.mjs`, key in
`public/57e36ab789104bcf088bfd87194fc1b2.txt`). The deployed
`/indexnow-manifest.json.gz` holds the page hashes the next deploy compares
against.

## Thanks

Hobbydex is built on open source. Thank you to the people behind:

- [Astro](https://astro.build) - the static site generator every page is built with
- [Pagefind](https://pagefind.app) - the search, which runs in the browser with no server
- [TypeScript](https://www.typescriptlang.org) - the site's code
- [Primer Primitives](https://github.com/primer/primitives) - the colour and spacing tokens behind the light and dark themes
- [Shapely](https://shapely.readthedocs.io) and [svgpathtools](https://github.com/mathandy/svgpathtools) - drawing the vehicle and part icons
- [Inkscape](https://inkscape.org) - the hand-traced icons and checking renders

The data itself is read from manufacturers' manuals and parts lists with the tools thanked in [hobbydex-rc](https://github.com/hobbydex/hobbydex-rc#thanks).

## License

Code is under the [MIT License](LICENSE). The data shown on the site comes
from the dataset repositories and is CC0.
