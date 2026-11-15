// The bag's quantity caption (src/components/HardwareBag.astro) on built pages: a bag whose items state no quantity says
// so, a bag with some quantities stated says that some are not, and a bag with every count stated has no such line.
// The tests pick a part page by that property rather than by id, so changes to the data do not break the build; a case
// the data no longer has is skipped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const partsRoot = new URL('../dist/rc/parts/', import.meta.url);
const bagOf = (html) => html.match(/<svg class="hardwarebag"[\s\S]*?<\/svg>/)?.[0];
const notes = (svg) => [...svg.matchAll(/<text class="hbnote"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

// The three cases the tests look for; one pass over the part pages, one page in memory at a time, keeping only the
// first bag of each case and stopping once every case has one.
const cases = {
  none: (s) => notes(s).includes('quantities not stated') && /^\d+ of \d+ items drawn$/.test(notes(s)[0] ?? ''),
  some: (s) => notes(s).includes('some quantities not stated'),
  all: (s) => notes(s).length === 0 && / x \d+</.test(s),
};
const found = {};
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (Object.keys(found).length === Object.keys(cases).length) return;
    const p = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, dir);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'index.html') {
      const html = readFileSync(p, 'utf8');
      const svg = html.includes('class="hardwarebag"') && bagOf(html);
      if (svg) for (const [k, pick] of Object.entries(cases)) if (!found[k] && pick(svg)) found[k] = svg;
    }
  }
};
walk(partsRoot);

test('a bag with no stated quantity says so, next to the partial line', (t) => {
  const svg = found.none;
  if (!svg) return t.skip('no part page has a bag with no stated quantity and a partial line');
  assert.match(notes(svg)[0], /^\d+ of \d+ items drawn$/, 'the partial line comes first');
  assert.match(svg, /aria-label="[^"]*quantities not stated: /);
});

test('a bag with only some quantities stated says some are not stated', (t) => {
  const svg = found.some;
  if (!svg) return t.skip('no part page has a bag with only some quantities stated');
  assert.ok(!notes(svg).includes('quantities not stated'));
  assert.match(svg, / x \d+</, 'the stated count is still printed');
});

test('a bag with every count stated has no quantity line', (t) => {
  const svg = found.all;
  if (!svg) return t.skip('no part page has a bag with every count stated');
  assert.deepEqual(notes(svg), []);
  assert.match(svg, / x \d+</, 'the count is printed');
});
