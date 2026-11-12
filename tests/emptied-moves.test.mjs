// Emptied and renamed page addresses (src/lib/emptied-moves.ts, src/lib/vehicle-moves.ts): each target is a page of the
// build. Runs after `npm run build` (dist/); skipped without a build, like tests/redirects.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { categoryBrandMoves, platformCategoryMoves } from '../src/lib/emptied-moves.ts';
import { vehicleMoves } from '../src/lib/vehicle-moves.ts';

const built = (path) => existsSync(`dist${path}index.html`) && !readFileSync(`dist${path}index.html`, 'utf8').startsWith('<!doctype html><title>Redirecting to');
const skip = !existsSync('dist/index.html');

test('every emptied category x brand address names a built page', { skip }, () => {
  for (const [from, to] of Object.entries(categoryBrandMoves)) assert.ok(built(to), `${from} -> ${to} is not a built page`);
});

test('every emptied platform x category address names a built page', { skip }, () => {
  for (const [from, to] of Object.entries(platformCategoryMoves)) assert.ok(built(to), `${from} -> ${to} is not a built page`);
});

test('every folded or renamed make address names a built vehicle page', { skip }, () => {
  for (const [make, slugs] of Object.entries(vehicleMoves)) for (const [from, to] of Object.entries(slugs)) {
    assert.ok(built(`/rc/makes/${make}/${to}/`), `${make}/${from} -> ${to} is not a built vehicle page`);
  }
});
