import { defineConfig } from 'astro/config';
import { lastmodFor } from './src/lib/lastmod.ts';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SITE = 'https://hobbydex.com';

// Publishes the dataset export the site was built from at /data/rc.json.
function dataExport() {
  return {
    name: 'hobbydex-data-export',
    hooks: {
      'astro:build:done': ({ dir }) => {
        mkdirSync(new URL('data/', dir), { recursive: true });
        copyFileSync(process.env.HOBBYDEX_DATA ?? 'data/hobbydex-rc.json', new URL('data/rc.json', dir));
      },
    },
  };
}

// Writes sitemap-index.xml and sitemap-<n>.xml (at most 40 000 URLs each) listing every built page, each with the
// <lastmod> of the last change to its own data (src/lib/lastmod.ts); pages with no known date get none.
function sitemap() {
  return {
    name: 'hobbydex-sitemap',
    hooks: {
      'astro:build:done': ({ dir, pages }) => {
        // redirect pages at former ids are left out: search engines should only see the current page
        const isRedirect = (p) => { try { return readFileSync(new URL(`${p.pathname}index.html`, dir), 'utf8').startsWith('<!doctype html><title>Redirecting to'); } catch { return false; } };
        const urls = pages.filter((p) => !isRedirect(p)).map((p) => `${SITE}/${p.pathname}`).filter((u) => !u.includes('/404')).sort()
          .map((loc) => ({ loc, lastmod: lastmodFor(loc.slice(SITE.length)) }));
        const chunks = [];
        for (let i = 0; i < urls.length; i += 40000) chunks.push(urls.slice(i, i + 40000));
        const newest = (c) => c.reduce((m, u) => (u.lastmod && u.lastmod > m ? u.lastmod : m), '');
        chunks.forEach((c, i) => writeFileSync(new URL(`sitemap-${i}.xml`, dir),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${c.map((u) => `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`));
        writeFileSync(new URL('sitemap-index.xml', dir),
          `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${chunks.map((c, i) => `<sitemap><loc>${SITE}/sitemap-${i}.xml</loc>${newest(c) ? `<lastmod>${newest(c)}</lastmod>` : ''}</sitemap>`).join('\n')}\n</sitemapindex>\n`);
      },
    },
  };
}

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap(), dataExport()],
  // SIZE: component scripts are always separate cached files, never inlined into every page (see Base.astro)
  vite: { build: { assetsInlineLimit: 0 } },
});
