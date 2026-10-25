// The bag's quantity caption (src/components/HardwareBag.astro) on built pages: a bag whose items state no quantity says
// so, a bag with some quantities stated says that some are not, and a bag with every count stated has no such line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = (path) => readFileSync(new URL(`../dist/rc/parts/${path}/index.html`, import.meta.url), 'utf8');
const bagOf = (html) => {
  const bag = html.match(/<svg class="hardwarebag"[\s\S]*?<\/svg>/);
  assert.ok(bag, 'the bag is on the page');
  return bag[0];
};
const notes = (svg) => [...svg.matchAll(/<text class="hbnote"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

test('a bag with no stated quantity says so, next to the partial line', () => {
  const svg = bagOf(page('lc-racing/L6041'));
  assert.ok(notes(svg).includes('quantities not stated'));
  assert.match(notes(svg)[0], /^\d+ of \d+ items drawn$/, 'the partial line comes first');
  assert.match(svg, /aria-label="[^"]*quantities not stated: /);
});

test('a bag with only some quantities stated says some are not stated', () => {
  const svg = bagOf(page('mugen/E0174B'));
  assert.ok(notes(svg).includes('some quantities not stated'));
  assert.ok(!notes(svg).includes('quantities not stated'));
  assert.match(svg, / x 15</, 'the stated count is still printed');
});

test('a bag with every count stated has no quantity line', () => {
  const svg = bagOf(page('tamiya/19804574'));
  assert.deepEqual(notes(svg), []);
  assert.match(svg, / x 5</, 'the count is printed');
});
