// The home and search pages run their own scripts from bundled, content-hashed /_astro/ files (cached for a year and
// renamed with every change); the only inline script is the pre-paint theme read in Base.astro (plus JSON-LD data).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const built = existsSync(`${dist}index.html`);
const scripts = (html) => [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1], body: m[2] }));

for (const page of ['', 'search/']) {
  test(`/${page}: no inline script but the theme read; bundled scripts have hashed names`, { skip: !built && 'site not built' }, () => {
    const all = scripts(readFileSync(`${dist}${page}index.html`, 'utf8'));
    const inline = all.filter((s) => !/\bsrc=/.test(s.attrs) && !/type="application\/ld\+json"/.test(s.attrs));
    const known = page === 'search/' ? 2 : 1;   // the search page's own search script is still inline (not moved yet)
    assert.equal(inline.length, known, inline.map((s) => s.body.slice(0, 80)).join('\n'));
    assert.match(inline[0].body, /localStorage\.getItem\('hobbydex-theme'\)/);
    const bundled = all.map((s) => s.attrs.match(/src="(\/_astro\/[^"]+)"/)?.[1]).filter(Boolean);
    assert.ok(bundled.length > 0, 'no bundled script');
    for (const src of bundled) {
      assert.match(src, /^\/_astro\/[\w.-]+\.[\w-]{8}\.js$/, `unhashed bundle name ${src}`);
      assert.ok(existsSync(`${dist}${src.slice(1)}`), `missing ${src}`);
    }
  });
}

test('/: the scan icon, reduced-motion and suggestion code ship in the bundles', { skip: !built && 'site not built' }, () => {
  const html = readFileSync(`${dist}index.html`, 'utf8');
  const code = scripts(html).map((s) => s.attrs.match(/src="(\/_astro\/[^"]+)"/)?.[1]).filter(Boolean)
    .map((src) => readFileSync(`${dist}${src.slice(1)}`, 'utf8')).join('\n');
  for (const needle of ['scan-icon', 'prefers-reduced-motion', 'home-ac-status', '/search-rank.js', '/pagefind/pagefind.js'])
    assert.ok(code.includes(needle), `${needle} not in the home page bundles`);
});
