import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeManifest, encodeManifest, pageHash, plan } from '../tools/indexnow.mjs';

const current = { '/': 'a', '/rc/': 'b', '/rc/kits/': 'c', '/rc/kits/tamiya/58001/': 'd', '/rc/parts/x/1/': 'e' };

test('first run submits only the home and section pages and stores every hash', () => {
  const r = plan(null, current);
  assert.deepEqual(r.submit, ['/', '/rc/', '/rc/kits/']);
  assert.deepEqual(r.manifest, current);
});

test('changed, new and removed pages are submitted, shallow first', () => {
  const previous = { '/': 'a', '/rc/': 'B', '/rc/kits/': 'c', '/rc/kits/tamiya/58001/': 'd', '/rc/old/1/': 'z' };
  const r = plan(previous, current);
  assert.deepEqual(r.submit, ['/rc/', '/rc/old/1/', '/rc/parts/x/1/']);
  assert.equal(r.pending, 0);
  assert.deepEqual(r.manifest, current);
});

test('pages over the cap keep their old state in the manifest and come back next run', () => {
  const previous = { '/': 'A', '/rc/': 'B', '/rc/kits/': 'c', '/rc/kits/tamiya/58001/': 'd', '/rc/old/1/': 'z' };
  const r = plan(previous, current, 2);
  assert.deepEqual(r.submit, ['/', '/rc/']);
  assert.equal(r.pending, 2);
  assert.equal(r.manifest['/rc/old/1/'], 'z');       // removed, not yet submitted
  assert.ok(!('/rc/parts/x/1/' in r.manifest));      // new, not yet submitted
  const next = plan(r.manifest, current, 2);
  assert.deepEqual(next.submit, ['/rc/old/1/', '/rc/parts/x/1/']);
  assert.deepEqual(plan(next.manifest, current).submit, []);
});

test('hashed asset names do not change a page hash', () => {
  const a = '<link rel="stylesheet" href="/_astro/Base.BiW4y49O.css"><p>x</p>';
  const b = '<link rel="stylesheet" href="/_astro/Base.Zz11yy22.css"><p>x</p>';
  assert.equal(pageHash(a), pageHash(b));
  assert.notEqual(pageHash(a), pageHash(b.replace('x', 'y')));
});

test('the manifest round-trips through gzip', () => {
  assert.deepEqual(decodeManifest(encodeManifest(current)), current);
});
