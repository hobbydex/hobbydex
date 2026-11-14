import { defineConfig } from 'astro/config';
import { lastmodFor } from './src/lib/lastmod.ts';
import { inSitemap } from './src/lib/sitemapPages.mjs';
import { closeSync, copyFileSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from 'node:fs';

const SITE = 'https://hobbydex.com';
// The start of an Astro redirect page (tools/redirects.mjs reads the same); a stub is recognised by these bytes alone.
const STUB = '<!doctype html><title>Redirecting to';
// Whether the built page at `file` is a redirect stub: reads its first bytes, never the whole page (there are 300 000+).
const isStub = (file) => {
  let fd;
  try { fd = openSync(file, 'r'); } catch (e) { if (e.code === 'ENOENT') return false; throw e; }   // a page Astro did not write
  try {
    const head = Buffer.alloc(STUB.length);
    const n = readSync(fd, head, 0, head.length, 0);
    return head.toString('latin1', 0, n) === STUB;
  } finally { closeSync(fd); }
};

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

// Writes .astro/redirect-stubs.json: every redirect stub of the build, with the page it points at. The sitemap leaves
// the stubs out and tools/redirects.mjs (--stubs) reads the same list instead of walking the build again.
function writeRedirectStubs(dir, stubs) {
  const map = {};
  for (const p of stubs) {
    const html = readFileSync(new URL(`${p.pathname}index.html`, dir), 'utf8');
    const m = html.match(/<meta http-equiv="refresh" content="0;url=([^"]+)">/);
    if (!m) throw new Error(`redirect page without a meta refresh: /${p.pathname}`);
    map[`/${p.pathname}`] = m[1];
  }
  const file = new URL('../.astro/redirect-stubs.json', dir);
  mkdirSync(new URL('./', file), { recursive: true });
  writeFileSync(file, JSON.stringify(map));
}

// Writes sitemap-index.xml and sitemap-<n>.xml (at most 40 000 URLs each) listing every built page, each with the
// <lastmod> of the last change to its own data (src/lib/lastmod.ts); pages with no known date get none.
function sitemap() {
  return {
    name: 'hobbydex-sitemap',
    hooks: {
      'astro:build:done': ({ dir, pages }) => {
        // redirect pages at former ids are left out: search engines should only see the current page
        const stubs = pages.filter((p) => isStub(new URL(`${p.pathname}index.html`, dir)));
        writeRedirectStubs(dir, stubs);
        const stubSet = new Set(stubs.map((p) => p.pathname));
        const urls = pages.filter((p) => !stubSet.has(p.pathname)).map((p) => `${SITE}/${p.pathname}`).filter((u) => inSitemap(u.slice(SITE.length))).sort()
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
