// Spec and part pages (built output): the hardware bag sits in the column beside the facts; the dimension drawing
// sits full width below the facts row. Each test picks a page that has a bag and a drawing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPage } from './built-pages.mjs';

const row = (html) => html.match(/<div class="factsrow"[^>]*>[\s\S]*?<\/dl>\s*<div class="factsside"[\s\S]*?<\/div>\s*<\/div>/)?.[0];
const sideBagAndDrawing = (html) => /<svg class="hardwarebag"/.test(row(html) ?? '') && html.includes('<figure class="drawing"');

test('a spec page draws its bag beside the facts and its drawing below them', (t) => {
  const page = findPage('rc/specs/', sideBagAndDrawing);
  if (!page) return t.skip('no spec page has a bag beside its facts and a drawing');
  const s = row(page.html);
  assert.ok(s, 'the side column follows the facts');
  assert.match(s, /<svg class="hardwarebag"/);
  assert.doesNotMatch(s, /<figure class="drawing"/);
  assert.match(page.html, /<\/div>\s*<\/div>\s*<figure class="drawing"/);
});

test('a part page with a bag draws its dimension drawing below the facts, not in the column', (t) => {
  const page = findPage('rc/parts/', sideBagAndDrawing);
  if (!page) return t.skip('no part page has a bag beside its facts and a drawing');
  const s = row(page.html);
  assert.ok(s, 'the side column follows the facts');
  assert.match(s, /<svg class="hardwarebag"/);
  assert.doesNotMatch(s, /<figure class="drawing"/);
  assert.match(page.html, /<figure class="drawing"/);
});
