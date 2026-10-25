// Spec and part pages (built output): the hardware bag sits in the column beside the facts; the dimension drawing
// sits full width below the facts row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = (path) => readFileSync(new URL(`../dist${path}index.html`, import.meta.url), 'utf8');
const row = (html) => html.match(/<div class="factsrow"[^>]*>[\s\S]*?<\/dl>\s*<div class="factsside"[\s\S]*?<\/div>\s*<\/div>/)?.[0];

test('a spec page draws its bag beside the facts and its drawing below them', () => {
  const html = page('/rc/specs/eclip/2mm/');
  const s = row(html);
  assert.ok(s, 'the side column follows the facts');
  assert.match(s, /<svg class="hardwarebag"/);
  assert.doesNotMatch(s, /<figure class="drawing"/);
  assert.match(html, /<\/div>\s*<\/div>\s*<figure class="drawing"/);
});

test('a part page with a bag draws its dimension drawing below the facts, not in the column', () => {
  const html = page('/rc/parts/tamiya/51625/');
  const s = row(html);
  assert.ok(s, 'the side column follows the facts');
  assert.match(s, /<svg class="hardwarebag"/);
  assert.doesNotMatch(s, /<figure class="drawing"/);
  assert.match(html, /<figure class="drawing"/);
});
