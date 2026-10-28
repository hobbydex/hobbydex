// The bag's quantity caption (src/components/HardwareBag.astro) on built pages: a bag whose items state no quantity says
// so, a bag with some quantities stated says that some are not, and a bag with every count stated has no such line.
// The tests pick a part page by that property rather than by id, so changes to the data do not break the build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const partsRoot = new URL('../dist/rc/parts/', import.meta.url);
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, dir);
  return e.isDirectory() ? walk(p) : e.name === 'index.html' ? [p] : [];
});
const bagOf = (html) => html.match(/<svg class="hardwarebag"[\s\S]*?<\/svg>/)?.[0];
const notes = (svg) => [...svg.matchAll(/<text class="hbnote"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

const bags = walk(partsRoot)
  .map((url) => readFileSync(url, 'utf8'))
  .filter((html) => html.includes('class="hardwarebag"'))
  .map((html) => bagOf(html))
  .filter(Boolean);
const find = (what, pick) => {
  const svg = bags.find(pick);
  assert.ok(svg, `some part page has ${what}`);
  return svg;
};

test('a bag with no stated quantity says so, next to the partial line', () => {
  const svg = find('a bag with no stated quantity and a partial line', (s) =>
    notes(s).includes('quantities not stated') && /^\d+ of \d+ items drawn$/.test(notes(s)[0] ?? ''));
  assert.match(notes(svg)[0], /^\d+ of \d+ items drawn$/, 'the partial line comes first');
  assert.match(svg, /aria-label="[^"]*quantities not stated: /);
});

test('a bag with only some quantities stated says some are not stated', () => {
  const svg = find('a bag with only some quantities stated', (s) => notes(s).includes('some quantities not stated'));
  assert.ok(!notes(svg).includes('quantities not stated'));
  assert.match(svg, / x \d+</, 'the stated count is still printed');
});

test('a bag with every count stated has no quantity line', () => {
  const svg = find('a bag with every count stated', (s) => notes(s).length === 0 && / x \d+</.test(s));
  assert.deepEqual(notes(svg), []);
  assert.match(svg, / x \d+</, 'the count is printed');
});
