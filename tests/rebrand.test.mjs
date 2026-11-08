import test from 'node:test';
import assert from 'node:assert/strict';
import { rebrandLabel, rebrandSource } from '../src/lib/rebrand.ts';

test('confirmed and likely rebrands are worded apart', () => {
  assert.equal(rebrandLabel(false, false), 'Rebrand of');
  assert.equal(rebrandLabel(true, false), 'Also sold as');
  assert.equal(rebrandLabel(false, true), 'Likely rebrand of');
  assert.equal(rebrandLabel(true, true), 'Likely rebranded as');
});

test('the source links the document address when it has one', () => {
  const docs = { a: { title: 'A', url: 'https://x.example/a' }, b: { title: 'B' } };
  assert.deepEqual(rebrandSource('a', (id) => docs[id]), { title: 'A', href: 'https://x.example/a' });
  assert.deepEqual(rebrandSource('b', (id) => docs[id]), { title: 'B', href: undefined });
  assert.equal(rebrandSource('c', (id) => docs[id]), undefined);
});
