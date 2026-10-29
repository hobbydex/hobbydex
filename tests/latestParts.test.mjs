// The Latest view's part rule (lib/latestParts.ts): which parts are listed, and which dates count for a part.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showPartInLatest, hasRealPartDate, isGenericPart, GENERIC_CATEGORIES } from '../src/lib/latestParts.ts';

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
