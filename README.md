# hobbydex

The Hobbydex website: a static site generated from the open hobby parts
datasets (currently [hobbydex-rc](https://github.com/hobbydex/hobbydex-rc)).
Built with Astro, searched with Pagefind, served from its own server at
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
it, builds the site and publishes it to the server on every push to `main`,
on demand, and once a day to pick up new data.

The server's Caddyfile (and its access log) is applied by root running `ops/server/setup.sh <deploy-public-key>` on the server; Caddy rolls `/var/log/caddy/access.log` itself (50 MiB, 14 files, 14 days), so there is no logrotate job. `ops/server/bot-report.py` summarises it per day for Googlebot, Bingbot and other bots.

Root steps for a server that runs the previous Caddyfile (once, in this order; the access log is caddy-owned, so it must exist before anything validates):
```
install -d -m 755 -o caddy -g caddy /var/log/caddy
install -m 644 /path/to/ops/server/Caddyfile /etc/caddy/Caddyfile
usermod -aG caddy deploy
chown caddy:caddy /var/log/caddy/access.log && chmod 640 /var/log/caddy/access.log   # a file created before this change keeps its mode; Caddy applies 0640 to new and rolled files
printf '%s\n' 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl reload caddy' > /etc/sudoers.d/hobbydex-caddy-reload
chmod 440 /etc/sudoers.d/hobbydex-caddy-reload && visudo -cf /etc/sudoers.d/hobbydex-caddy-reload
systemctl reload caddy
runuser -u caddy -- caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```
The sudoers line lets `deploy.sh` reload Caddy when a release changes its redirect map (`redirects.caddy`); nothing else is granted. `setup.sh` does the same steps for a fresh server.

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
