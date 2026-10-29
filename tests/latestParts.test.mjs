// The Latest view's part rule (lib/latestParts.ts): which parts are listed, and which dates count for a part.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showPartInLatest, hasRealPartDate, hasRealReleaseDate, isGenericPart, GENERIC_CATEGORIES } from '../src/lib/latestParts.ts';

const brands = { 'kit/a/x': 'brand/a', 'kit/a/y': 'brand/a', 'kit/b/z': 'brand/b', 'kit/c/w': 'brand/c' };
const brandOf = (kit) => brands[kit];
const dated = { released: '2026-03-01' };
const newsSeen = { seen_by: '2026-04-02', seen_by_source: 'https://maker.example/news/new-esc-released' };
const shopSeen = { seen_by: '2026-10-23', seen_by_source: 'https://shop.example/products/esc-for-x' };
const fits = (...kits) => kits.map((kit) => ({ kit, type: 'direct' }));

test('a part with no date of its own is never listed, whatever its fits', () => {
  for (const category of [...GENERIC_CATEGORIES, 'body']) {
    assert.equal(showPartInLatest({ category, fits: [] }, brandOf), false, category);
    assert.equal(showPartInLatest({ category, ...shopSeen, fits: fits('kit/b/z', 'kit/c/w') }, brandOf), false, category);
  }
});

test('a shop or catalogue seen_by bound is not a date; a maker news page full day is', () => {
  assert.equal(hasRealPartDate(shopSeen), false);
  assert.equal(hasRealPartDate({ seen_by: '2026-10', seen_by_source: 'https://maker.example/news/x' }), false);
  assert.equal(hasRealPartDate(newsSeen), true);
  assert.equal(hasRealPartDate(dated), true);
  assert.equal(hasRealPartDate({ announced: '2026-02' }), true);
});

test('a part fitting cars of one brand only is left off, even on several kits', () => {
  const p = { category: 'esc', ...dated, fits: fits('kit/a/x', 'kit/a/y') };
  assert.equal(isGenericPart(p, brandOf), false);
  assert.equal(showPartInLatest(p, brandOf), false);
});

test('a part whose fits span two brands, or that fits no kit, is generic', () => {
  assert.equal(showPartInLatest({ category: 'motor', ...dated, fits: fits('kit/a/x', 'kit/b/z') }, brandOf), true);
  assert.equal(showPartInLatest({ category: 'servo', ...dated, fits: [] }, brandOf), true);
});

test('a part whose fits name no known kit is not generic', () => {
  assert.equal(isGenericPart({ fits: fits('kit/unknown/q') }, brandOf), false);
  assert.equal(isGenericPart({ fits: fits('kit/unknown/q', 'kit/a/x') }, brandOf), false);
});

test('a body is listed once dated, whatever its fits', () => {
  assert.equal(showPartInLatest({ category: 'body', ...dated, fits: fits('kit/a/x') }, brandOf), true);
});

test('other categories are never listed', () => {
  for (const category of ['bearing', 'screw', 'drivetrain', 'chassis', undefined]) {
    assert.equal(showPartInLatest({ category, ...dated, fits: [] }, brandOf), false, String(category));
  }
});

import { realPartDate, newestDatedParts } from '../src/lib/latestParts.ts';

const pool = [
  { name: 'Old', released: '2019-01-05' },
  { name: 'Newest', announced: '2026-09-01' },
  { name: 'Undated', fits: [] },
  { name: 'Shop', seen_by: '2026-10-23', seen_by_source: 'https://shop.example/products/x' },
  { name: 'News', seen_by: '2026-06-02', seen_by_source: 'https://maker.example/news/y' },
  { name: 'Mid', released: '2024' },
  { name: 'Tie B', released: '2025-02-02' },
  { name: 'Tie A', released: '2025-02-02' },
];

test('a part dates by its release, then its announcement, then a news bound', () => {
  assert.equal(realPartDate({ released: '2020', announced: '2021' }), '2020');
  assert.equal(realPartDate({ announced: '2021-03' }), '2021-03');
  assert.equal(realPartDate({ seen_by: '2026-10-23', seen_by_source: 'https://shop.example/x' }), undefined);
  assert.equal(realPartDate({ seen_by: '2026-06-02', seen_by_source: 'https://maker.example/news/y' }), '2026-06-02');
  assert.equal(realPartDate({ fits: [] }), undefined);
});

test('the newest n dated parts, newest first, never an undated one', () => {
  const out = newestDatedParts(pool, 100).map((p) => p.name);
  assert.deepEqual(out, ['Newest', 'News', 'Tie A', 'Tie B', 'Mid', 'Old']);
  for (const n of [0, 1, 3]) {
    assert.deepEqual(newestDatedParts(pool, n).map((p) => p.name), out.slice(0, n));
  }
});

test('an empty or undated pool gives no parts, so the block is hidden', () => {
  assert.deepEqual(newestDatedParts([], 15), []);
  assert.deepEqual(newestDatedParts([{ name: 'x', fits: [] }, { name: 'y', seen_by: '2026-10-23', seen_by_source: 'https://shop.example/x' }], 15), []);
});

test('the list is sorted non-increasing by date for any input order', () => {
  const shuffled = [...pool].reverse();
  const out = newestDatedParts(shuffled, 100);
  for (let i = 1; i < out.length; i++) assert.ok((realPartDate(out[i - 1]) ?? '') >= (realPartDate(out[i]) ?? ''));
});

test('a release seen only on a live shop page is not dated; archive, video, document, sitemap and news bounds are', () => {
  assert.equal(hasRealReleaseDate({ seen_by: '2026-10', seen_by_source: 'https://abchobby.com/JP/page/rc/gene/gene_24200.html' }), false);
  assert.equal(hasRealReleaseDate({ seen_by: '2026-10' }), false);
  assert.equal(hasRealReleaseDate({ seen_by: '2015-08', seen_by_source: 'https://web.archive.org/web/20150808005930/http://abchobby.com/JP/page/rc/gene/gene_24200.html' }), true);
  assert.equal(hasRealReleaseDate({ seen_by: '2026-05', seen_by_source: 'https://www.youtube.com/watch?v=abc' }), true);
  assert.equal(hasRealReleaseDate({ seen_by: '2026-05', seen_by_source: 'doc/atomic-rc/mfx-kit-manual' }), true);
  assert.equal(hasRealReleaseDate({ seen_by: '2026-10', seen_by_source: 'https://3dsets.com/product-sitemap.xml' }), true);
  assert.equal(hasRealReleaseDate({ seen_by: '2026-04-02', seen_by_source: 'https://maker.example/news/new-car' }), true);
  assert.equal(hasRealReleaseDate({ year: 2019 }), true);
  assert.equal(hasRealReleaseDate({ released: '2026-03' }), true);
  assert.equal(hasRealReleaseDate({ announced: '2026-02' }), true);
});
