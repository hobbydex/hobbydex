// Helpers for tests on built pages (dist/). A test picks its page by the property it checks, not by a live data id,
// so a data change cannot break the build. Not a test file: `npm test` runs only *.test.mjs.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

// The first page under dist/<root> (e.g. 'rc/parts/') whose html satisfies pred; { path: '/rc/parts/x/y/', html }.
export function findPage(root, pred) {
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        const found = walk(p);
        if (found) return found;
      } else if (e.name === 'index.html') {
        const html = readFileSync(p, 'utf8');
        if (pred(html)) return { path: `/${relative(dist, dir).split(sep).join('/')}/`, html };
      }
    }
    return undefined;
  };
  return walk(join(dist, root));
}

// The hardware bag svg (src/components/HardwareBag.astro) of a page, or undefined.
export const bagOf = (html) => html.match(/<svg class="hardwarebag"[\s\S]*?<\/svg>/)?.[0];

// The screw and nut captions of a bag svg.
export const captions = (svg) => [...svg.matchAll(/<text x="0"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
