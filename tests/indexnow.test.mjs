import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeManifest, encodeManifest, pageHash, plan } from '../tools/indexnow.mjs';

const D1 = Date.UTC(2026, 9, 28, 10);
const D2 = Date.UTC(2026, 9, 29, 10);
const current = { '/': 'a', '/rc/': 'b', '/rc/platforms/': 'c', '/rc/platforms/tamiya/58001/': 'd', '/rc/parts/x/1/': 'e' };
// a manifest in which every page is submitted at its current hash
const settled = (hashes, day = '2026-10-28', sent = 0) => ({
  day, sent, pages: Object.fromEntries(Object.entries(hashes).map(([p, h]) => [p, [h, day, 0]])),
});

test('first run submits only the home and section pages', () => {
  const r = plan(null, current, { now: D1 });
  assert.deepEqual(r.submit, ['/', '/rc/', '/rc/platforms/']);
  assert.equal(r.manifest.pages['/rc/parts/x/1/'][0], null); // not submitted yet: shows up as changed later
  assert.equal(r.manifest.sent, 3);
});

test('a version 1 manifest is adopted without submitting anything', () => {
  const r = plan({ legacy: true, pages: { '/': 'old' } }, current, { now: D1 });
  assert.deepEqual(r.submit, []);
  assert.equal(plan(r.manifest, current, { now: D1 }).submit.length, 0);
});

test('an unchanged page is never resent, a changed, new or removed one is', () => {
  const prev = settled({ ...current, '/rc/old/1/': 'z' });
  assert.deepEqual(plan(prev, current, { now: D2 }).submit, ['/rc/old/1/']);
  const r = plan(settled({ ...current, '/rc/': 'B' }), { ...current, '/rc/new/': 'n' }, { now: D2 });
  assert.deepEqual(r.submit.sort(), ['/rc/', '/rc/new/']);
  assert.equal(r.changed, 2);
});

test('the daily cap spans deploys and the rest stays pending, newest changes first', () => {
  const hashes = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`/rc/p${i}/`, 'h']));
  const changed = Object.fromEntries(Object.keys(hashes).map((p) => [p, 'H']));
  const r1 = plan(settled(hashes), changed, { now: D1, dailyCap: 4 });
  assert.equal(r1.submit.length, 4);
  assert.equal(r1.skipped, 6);
  assert.equal(r1.manifest.sent, 4);
  // an hour later one more page changes: it is newer, so it goes first; the cap leaves room for 0 now
  const more = { ...changed, '/rc/p0/': 'H2' };
  const r2 = plan(r1.manifest, more, { now: D1 + 3600e3, dailyCap: 4 });
  assert.deepEqual(r2.submit, []);
  assert.equal(r2.skipped, r2.changed);
  // next day: the freshest change leads, then the older backlog
  const r3 = plan(r2.manifest, { ...more, '/rc/fresh/': 'f' }, { now: D2, dailyCap: 4 });
  assert.equal(r3.submit[0], '/rc/fresh/');
  assert.equal(r3.submit.length, 4);
  assert.equal(r3.manifest.sent, 4);
});

test('pages over the cap keep their old hash so they come back, and nothing repeats', () => {
  const prev = settled({ '/a/': '1', '/b/': '1' });
  const cur = { '/a/': '2', '/b/': '2' };
  const r1 = plan(prev, cur, { now: D1, dailyCap: 1 });
  assert.equal(r1.submit.length, 1);
  const r2 = plan(r1.manifest, cur, { now: D2, dailyCap: 1 });
  assert.equal(r2.submit.length, 1);
  assert.notEqual(r2.submit[0], r1.submit[0]);
  assert.deepEqual(plan(r2.manifest, cur, { now: D2 + 1000, dailyCap: 5 }).submit, []);
});

test('the shared footer date, nav and asset names do not change a page hash', () => {
  const page = (date, css, nav, body) => `<html><head><title>T</title><link rel="stylesheet" href="/_astro/Base.${css}.css"></head><body>` +
    `<header class="site"><nav>${nav}</nav><script src="/theme.js" defer></script></header><main class="astro-abcd1234" data-astro-cid-abcd1234>${body}</main>` +
    `<footer class="site">Last updated on ${date}.</footer></body></html>`;
  const a = page('2026-10-28', 'BiW4y49O', 'x', '<p>x</p>');
  assert.equal(pageHash(a), pageHash(page('2026-10-29', 'Zz11yy22', 'y', '<p>x</p>')));
  assert.notEqual(pageHash(a), pageHash(page('2026-10-28', 'BiW4y49O', 'x', '<p>y</p>')));
});

test('the manifest round-trips through gzip', () => {
  const m = settled(current);
  assert.deepEqual(decodeManifest(encodeManifest(m)), m);
});
