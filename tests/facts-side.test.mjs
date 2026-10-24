// Spec and part pages (built output): the hardware bag and the dimension drawing sit in the column beside the facts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = (path) => readFileSync(new URL(`../dist${path}index.html`, import.meta.url), 'utf8');
const side = (html) => html.match(/<div class="factsrow"[^>]*>\s*<dl class="facts"[\s\S]*?<\/dl>\s*<div class="factsside"[\s\S]*?<\/figure>/)?.[0];

test('a spec page draws its bag and its drawing beside the facts', () => {
  const s = side(page('/rc/specs/eclip/2mm/'));
  assert.ok(s, 'the side column follows the facts');
  assert.match(s, /<svg class="hardwarebag"/);
  assert.match(s, /<figure class="drawing"/);
});

test('a part page with a bag draws its dimension drawing in the same column', () => {
  const s = side(page('/rc/parts/tamiya/51625/'));
  assert.ok(s, 'the side column follows the facts');
  assert.match(s, /<svg class="hardwarebag"/);
  assert.match(s, /<figure class="drawing"/);
});
