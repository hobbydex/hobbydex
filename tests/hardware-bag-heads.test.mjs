// The screw captions of the bag (src/components/HardwareBag.astro) on built pages: a screw caption carries its head
// word when the bag holds another head type of the same size; a bag with one head type per size keeps bare sizes.
// Each test picks a part page whose bag has the case it checks, so data changes do not break the build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPage, bagOf, captions } from './built-pages.mjs';

const findBag = (pred) => findPage('rc/parts/', (h) => { const s = bagOf(h); return !!s && pred(captions(s)); });
const bare = /^M[\d.]+x[\d.]+$/;
// the size of a screw caption that carries a head word, e.g. 'M3x6' for 'M3x6 button'
const headedSize = (c) => c.match(/^(M[\d.]+x[\d.]+) [a-z]+$/)?.[1];
// a size that two or more head types share, with no bare caption for it
const doubledSize = (caps) => {
  const sizes = caps.map(headedSize).filter(Boolean);
  return [...new Set(sizes)].find((s) => sizes.filter((x) => x === s).length >= 2 && !caps.includes(s));
};

test('two head types of one size each get their head word', (t) => {
  const page = findBag((caps) => doubledSize(caps) !== undefined);
  if (!page) return t.skip('no part page has two head types of one size');
  const caps = captions(bagOf(page.html));
  const size = doubledSize(caps);
  assert.ok(caps.filter((c) => c.startsWith(`${size} `)).length >= 2, `${size} is captioned by each head`);
  assert.ok(!caps.includes(size), 'no bare size caption remains for the doubled size');
});

test('a size with one head type keeps its bare caption, and nuts keep theirs', (t) => {
  const single = (caps) => caps.find((c) => bare.test(c) && !caps.some((d) => d.startsWith(`${c} `)));
  const page = findBag((caps) => single(caps) !== undefined && caps.some((c) => /^M[\d.]+ hex$/.test(c)));
  if (!page) return t.skip('no part page has a single-head size and a hex nut');
  const caps = captions(bagOf(page.html));
  assert.ok(caps.includes(single(caps)), 'a size with a single head type is not given a head word');
  assert.ok(caps.some((c) => /^M[\d.]+ hex$/.test(c)), 'nut captions are unchanged');
});

test('a bag with one head type per size has bare captions', (t) => {
  const page = findBag((caps) => caps.length > 0 && caps.every((c) => bare.test(c)));
  if (!page) return t.skip('no part page whose bag has only bare screw sizes');
  const caps = captions(bagOf(page.html));
  assert.ok(caps.every((c) => bare.test(c)), `every caption is a bare size: ${caps}`);
});
