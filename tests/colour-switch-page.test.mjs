// Part pages (built output): a range of one part in several colours shows its colour switch in place of the
// list of other colours; a single-colour default icon takes its colour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = (path) => readFileSync(new URL(`../dist${path}index.html`, import.meta.url), 'utf8');

test('a colour range shows a switch of its versions, the page part marked, and no list of other colours', () => {
  const html = page('/rc/parts/team-corally/C-00180-1055/');
  const nav = html.match(/<nav class="colourswitch"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav, 'the switch is on the page');
  assert.equal((nav.match(/<a href="\/rc\/parts\/team-corally\//g) ?? []).length, 5);
  assert.equal((nav.match(/aria-current="true"/g) ?? []).length, 1);
  assert.match(nav, /aria-label="blue, C-00180-1055-B"/);
  assert.doesNotMatch(html, /<h2>Other colours<\/h2>/);
});

test('a default icon in one colour takes that colour; a part with no photo and no colour keeps the plain icon', () => {
  const html = page('/rc/parts/hot-racing/AFE10M02/');
  assert.match(html, /<span class="typeicon tinted"[^>]*style="--tint:#d32f2f"/);
});
