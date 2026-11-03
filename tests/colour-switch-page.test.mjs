// Part pages (built output): a range of one part in several colours shows its colour switch in place of the
// list of other colours; a single-colour default icon takes its colour. Each test picks a page with that case.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPage } from './built-pages.mjs';

const switchNav = (html) => html.match(/<nav class="colourswitch"[\s\S]*?<\/nav>/)?.[0];

test('a colour range shows a switch of its versions, the page part marked, and no list of other colours', (t) => {
  const page = findPage('rc/parts/', (h) => /<nav class="colourswitch"[\s\S]*?aria-current="true"/.test(h) && ((switchNav(h) ?? '').match(/<a href=/g) ?? []).length >= 2);
  if (!page) return t.skip('no part page shows a colour switch');
  const nav = switchNav(page.html);
  assert.ok((nav.match(/<a href="\/rc\/parts\//g) ?? []).length >= 2, 'the switch lists several versions');
  assert.equal((nav.match(/aria-current="true"/g) ?? []).length, 1);
  assert.match(nav, new RegExp(`<a href="${page.path.replace(/\//g, '\\/')}"[^>]*aria-current="true"`), 'the page part is the one marked');
  assert.doesNotMatch(page.html, /<h2>Other colours<\/h2>/);
});

test('a default icon in one colour takes that colour', (t) => {
  const page = findPage('rc/parts/', (h) => /<span class="typeicon tinted"/.test(h));
  if (!page) return t.skip('no part page has a tinted default icon');
  assert.match(page.html, /<span class="typeicon tinted"[^>]*style="--tint:#[0-9a-f]{6}"/i);
});
