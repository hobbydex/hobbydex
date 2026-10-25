// The screw captions of the bag (src/components/HardwareBag.astro) on built pages: a screw caption carries its head
// word when the bag holds another head type of the same size; a bag with one head type per size keeps bare sizes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = (path) => readFileSync(new URL(`../dist/rc/parts/${path}/index.html`, import.meta.url), 'utf8');
const captions = (path) => {
  const bag = page(path).match(/<svg class="hardwarebag"[\s\S]*?<\/svg>/);
  assert.ok(bag, 'the bag is on the page');
  return [...bag[0].matchAll(/<text x="0"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
};

test('two head types of one size each get their head word', () => {
  const caps = captions('lc-racing/L6041');
  assert.ok(caps.includes('M3x6 button'), 'the button head screw is captioned by its head');
  assert.ok(caps.includes('M3x6 countersunk'), 'the countersunk screw is captioned by its head');
  assert.ok(!caps.includes('M3x6'), 'no bare size caption remains for the doubled size');
});

test('a size with one head type keeps its bare caption, and nuts keep theirs', () => {
  const caps = captions('lc-racing/L6041');
  assert.ok(caps.includes('M3x18'), 'a size with a single head type is not given a head word');
  assert.ok(caps.includes('M3 hex'), 'nut captions are unchanged');
});

test('a bag with one head type per size has bare captions', () => {
  assert.deepEqual(captions('lc-racing/L6006'), ['M3x10', 'M3x6']);
});
