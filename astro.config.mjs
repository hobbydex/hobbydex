import { defineConfig } from 'astro/config';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';

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

// Writes sitemap-index.xml and sitemap-<n>.xml (at most 40 000 URLs each) listing every built page.
function sitemap() {
  return {
    name: 'hobbydex-sitemap',
    hooks: {
      'astro:build:done': ({ dir, pages }) => {
        const urls = pages.map((p) => `${SITE}/${p.pathname}`).filter((u) => !u.includes('/404')).sort();
        const chunks = [];
        for (let i = 0; i < urls.length; i += 40000) chunks.push(urls.slice(i, i + 40000));
        chunks.forEach((c, i) => writeFileSync(new URL(`sitemap-${i}.xml`, dir),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${c.map((u) => `<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`));
        writeFileSync(new URL('sitemap-index.xml', dir),
          `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${chunks.map((_, i) => `<sitemap><loc>${SITE}/sitemap-${i}.xml</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`);
      },
    },
  };
}

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap(), dataExport()],
});
