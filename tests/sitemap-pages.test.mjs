// The sitemap filter: only the error page is left out; part numbers that start with 404 stay in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inSitemap } from '../src/lib/sitemapPages.mjs';

test('a part whose number starts with 404 is in the sitemap', () => {
  assert.equal(inSitemap('/rc/parts/carson/404140-01/'), true);
});

test('the error page is left out of the sitemap', () => {
  assert.equal(inSitemap('/404/'), false);
  assert.equal(inSitemap('/404.html'), false);
});
