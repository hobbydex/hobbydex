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

## License

Code is under the [MIT License](LICENSE). The data shown on the site comes
from the dataset repositories and is CC0.
